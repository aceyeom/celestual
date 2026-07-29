-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0017 — the First Light trial                                 ║
-- ║ self-serve competitor signup · the 20-second DM grace · the admin desk   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- THREE THINGS LAND HERE, together because they are one launch:
--
--   1. THE TRIAL PROGRAM (replaces the ManyChat comment→DM→invite loop of 0016).
--      Candidates now sign up on the site itself (celestual.us/trial): they
--      verify an email (code sent by the celestual-trial edge function), sign
--      the agreement in-app, and CHOOSE their own four-letter code. Their
--      tracking link becomes celestual.us/<code> at the ROOT. The counting
--      surfaces are unchanged — rows still live in celestual_recruits, visits
--      still land in celestual_recruit_visits, credited signups in
--      celestual_recruit_signups — so 0016's visit/attribute/stats RPCs keep
--      working verbatim for the new links.
--
--   2. THE 20-SECOND GRACE (temporary). The DM relay has been dropping
--      verifications in production. The DM path stays exactly as it is, but a
--      browser that has been waiting 20+ seconds may now call
--      celestual_ig_verify_timeout with its proof hash and be let in AS THE
--      TYPED @, marked verified_via = 'timeout' so the admin desk can list
--      exactly which accounts were assumed (and the code they held, for manual
--      DM checking). A DM that lands first still wins and marks 'dm'.
--
--   3. THE ADMIN DASHBOARD (celestual.us/admin, served by the celestual-admin
--      edge function). Read-only overview of competitors and users, plus
--      delete / ban. Every RPC here is SERVICE ROLE ONLY — the browser never
--      touches them; the edge function holds the password gate.
--
--   4. HONEST EXPIRY (the "didn’t match an active request" fix): expired
--      verification rows are now retained 7 days instead of ~1 minute, so a
--      late DM gets the truthful "that code expired" reply and the dashboard's
--      unfinished-verifications list stays complete. See the
--      celestual_start_ig_verification revision at the bottom.
--
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE). Safe on top of 0001→0016.

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_ig_verifications · how each verification actually finished.
--   'dm'      — the Meta-authenticated DM arrived (the real thing)
--   'timeout' — the 20-second grace admitted the typed @ (assumed identity)
-- Legacy verified rows predate the column and read as 'dm' in the overview.
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_ig_verifications add column if not exists verified_via text;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruits · the trial columns. The table stays the single home of
-- the program (0016's counting RPCs read it); trial signups simply arrive
-- through the site instead of a DM. One email can hold one competitor row.
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_recruits add column if not exists email text;
alter table celestual_recruits add column if not exists email_verified_at timestamptz;
alter table celestual_recruits add column if not exists source text not null default 'manychat';
create unique index if not exists celestual_recruits_email_uidx
  on celestual_recruits (lower(email)) where email is not null;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_trial_emails — the email-ownership codes for /trial, written and
-- read only by the celestual-trial edge function (service role). Stores the
-- SHA-256 of the 6-digit code, never the code. RLS-locked to nothing.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_trial_emails (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,              -- browser↔row correlation id
  email       text not null,
  code_hash   text not null,
  status      text not null default 'pending',   -- pending | verified
  attempts    int  not null default 0,
  ip          text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  verified_at timestamptz
);
create index if not exists celestual_trial_emails_email_idx on celestual_trial_emails (email, created_at);
alter table celestual_trial_emails enable row level security;
revoke all on celestual_trial_emails from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_trial_code_ok(code) — one shared judgment of a chosen code.
-- Exactly four ascii letters, and not a word the router owns (or will).
-- Returns 'ok' | 'format' | 'reserved'.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_trial_code_ok(p_code text)
returns text
language plpgsql immutable as $$
declare
  nc text := lower(trim(coalesce(p_code, '')));
  c_reserved constant text[] := array[
    'demo','copy','priv','term','data','sign','page','home','root','help',
    'info','mail','news','blog','docs','shop','apps','star','ping','test'
  ];
begin
  if nc !~ '^[a-z]{4}$' then return 'format'; end if;
  if nc = any (c_reserved) then return 'reserved'; end if;
  return 'ok';
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_trial_claim — SERVICE ROLE ONLY (the edge function calls this only
-- after the email code has been verified). The in-app signature: records the
-- agreement version, the typed name, the competitor's @ and verified email,
-- mints the CHOSEN four-letter code, and binds this browser's dashboard key.
--
-- Idempotent by email: the same email claiming again is a returning
-- competitor — their key is re-bound and their EXISTING code comes back
-- (printed links must never silently change).
--   { ok:true, code, handle, existing? }
--   { ok:false, error:'invalid'|'name'|'code_format'|'code_reserved'|
--               'code_taken'|'handle_taken'|'banned' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_trial_claim(
  p_email text, p_name text, p_handle text, p_code text, p_dash_hash text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ne text := lower(nullif(trim(coalesce(p_email, '')), ''));
  nh text := celestual_norm(p_handle);
  nc text := lower(trim(coalesce(p_code, '')));
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_check text;
  r record;
  c_agreement constant text := 'first-light-v1';
begin
  if ne is null or ne !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or nh is null
     or p_dash_hash is null or p_dash_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'name');
  end if;
  if exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle(nh)) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  -- A returning competitor: same email → same account, same code, fresh key.
  select * into r from celestual_recruits where lower(email) = ne and status = 'signed' limit 1;
  if r.handle is not null then
    update celestual_recruits set dash_hash = lower(p_dash_hash), updated_at = now()
     where handle = r.handle;
    return jsonb_build_object('ok', true, 'code', r.code, 'handle', r.handle, 'existing', true);
  end if;

  v_check := celestual_trial_code_ok(nc);
  if v_check <> 'ok' then
    return jsonb_build_object('ok', false, 'error', 'code_' || v_check);
  end if;
  if exists (select 1 from celestual_recruits where code = nc and handle <> nh) then
    return jsonb_build_object('ok', false, 'error', 'code_taken');
  end if;

  select * into r from celestual_recruits where handle = nh for update;
  if r.handle is not null and r.status = 'signed'
     and (r.email is null or lower(r.email) <> ne) then
    -- the @ already belongs to a signed competitor under another email
    return jsonb_build_object('ok', false, 'error', 'handle_taken');
  end if;

  insert into celestual_recruits
    (handle, code, status, agreement, signed_name, signed_at,
     dash_hash, email, email_verified_at, source)
  values
    (nh, nc, 'signed', c_agreement, v_name, now(),
     lower(p_dash_hash), ne, now(), 'trial')
  on conflict (handle) do update
    set code = coalesce(celestual_recruits.code, excluded.code),
        status = 'signed',
        agreement = c_agreement,
        signed_name = coalesce(celestual_recruits.signed_name, excluded.signed_name),
        signed_at = coalesce(celestual_recruits.signed_at, now()),
        dash_hash = excluded.dash_hash,
        email = excluded.email,
        email_verified_at = now(),
        source = 'trial',
        updated_at = now();

  select code into v_check from celestual_recruits where handle = nh;
  return jsonb_build_object('ok', true, 'code', v_check, 'handle', nh);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_trial_login — SERVICE ROLE ONLY (after an email code checks out).
-- The way back into an account page from any device: the verified email names
-- the competitor, a fresh dashboard key is bound, their code comes back.
--   { ok:true, code, handle, name } | { ok:false, error:'unknown' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_trial_login(p_email text, p_dash_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ne text := lower(nullif(trim(coalesce(p_email, '')), ''));
  r record;
begin
  if ne is null or p_dash_hash is null or p_dash_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'unknown');
  end if;
  select * into r from celestual_recruits where lower(email) = ne and status = 'signed' limit 1;
  if r.handle is null then
    return jsonb_build_object('ok', false, 'error', 'unknown');
  end if;
  update celestual_recruits set dash_hash = lower(p_dash_hash), updated_at = now()
   where handle = r.handle;
  return jsonb_build_object('ok', true, 'code', r.code, 'handle', r.handle, 'name', r.signed_name);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_trial_check — SERVICE ROLE ONLY. Is this code choosable?
--   { ok:true, available:bool, reason:'ok'|'format'|'reserved'|'taken' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_trial_check(p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nc text := lower(trim(coalesce(p_code, '')));
  v_check text := celestual_trial_code_ok(p_code);
begin
  if v_check <> 'ok' then
    return jsonb_build_object('ok', true, 'available', false, 'reason', v_check);
  end if;
  if exists (select 1 from celestual_recruits where code = nc) then
    return jsonb_build_object('ok', true, 'available', false, 'reason', 'taken');
  end if;
  return jsonb_build_object('ok', true, 'available', true, 'reason', 'ok');
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_ig_verify_timeout — CLIENT-callable, proof-gated (the same
-- token+proof_hash pair poll requires, so only the browser that started this
-- verification can invoke its grace). TEMPORARY, by design:
--
--   the DM relay has been failing in production, so a browser that has shown
--   its code and waited at least 20 seconds is let in as the TYPED @. The row
--   flips verified with verified_via = 'timeout' — the admin desk lists these
--   with their code so each can be checked by hand in the Instagram DMs.
--
-- The DM path is untouched and still preferred: a DM landing inside the 20
-- seconds marks the row 'dm' first and this call simply reports it verified.
-- Identity here is ASSUMED, not proven — remove this function (and the
-- client's timer) once the relay is fixed.
--   { ok:true, handle } | { ok:false, error:'early'|'none'|'expired'|'banned' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_ig_verify_timeout(p_token text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  c_grace constant interval := interval '20 seconds';
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token is null or p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'none');
  end if;

  select * into r from celestual_ig_verifications
   where token = p_token and proof_hash = lower(p_proof_hash)
   order by created_at desc limit 1
   for update;

  if r.id is null then
    return jsonb_build_object('ok', false, 'error', 'none');
  end if;
  if r.status = 'verified' and r.expires_at > now() then
    -- the DM (or an earlier grace call) already finished the job
    return jsonb_build_object('ok', true, 'handle', r.handle);
  end if;
  if r.status <> 'pending' or r.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if now() - r.created_at < c_grace then
    return jsonb_build_object('ok', false, 'error', 'early');
  end if;
  if exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle(r.handle)) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  update celestual_ig_verifications
     set status = 'verified', verified_via = 'timeout', verified_at = now(),
         expires_at = now() + c_session_ttl
   where id = r.id;

  insert into celestual_members (handle, handle_hash)
  values (r.handle, celestual_hash_handle(r.handle))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', r.handle);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_complete_ig_verification v6 — SERVICE ROLE ONLY. Identical to
-- 0012's v5 plus two lines of truth-keeping: a completed DM stamps
-- verified_via = 'dm' (so the desk can tell real verifications from assumed
-- ones), and a banned (suppressed) account can no longer verify back in.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_complete_ig_verification(p_token text, p_igsid text, p_username text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  nu text := celestual_norm(p_username);
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token is null or nu is null then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  if exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle(nu)) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  select id into v_id
    from celestual_ig_verifications
   where token = p_token and status = 'pending' and expires_at > now()
   limit 1;
  if v_id is null then
    if exists (select 1 from celestual_ig_verifications
                where handle = nu and status = 'verified' and expires_at > now()) then
      return jsonb_build_object('ok', false, 'error', 'no_pending',
                                'already_verified', true, 'handle', nu);
    end if;
    if exists (select 1 from celestual_ig_verifications
                where token = p_token and expires_at <= now()) then
      return jsonb_build_object('ok', false, 'error', 'no_pending', 'code_expired', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'no_pending');
  end if;

  update celestual_ig_verifications
     set handle = nu, status = 'verified', verified_via = 'dm', igsid = p_igsid,
         verified_at = now(), expires_at = now() + c_session_ttl
   where id = v_id;

  insert into celestual_members (handle, handle_hash)
  values (nu, celestual_hash_handle(nu))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', nu);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_overview — SERVICE ROLE ONLY (the celestual-admin edge
-- function holds the password gate). One call, the whole desk:
--
--   competitors — every signed trial/program row with its link traffic, the
--                 signup count through its code, and the credited handles.
--   users       — every member with how they verified: via 'dm' (the webhook
--                 confirmed the DM), 'timeout' (assumed under the 20-second
--                 grace; the code they held is included for manual DM
--                 checking), or null (legacy/campus rows).
--   attempts    — verifications started but never finished (pending or lapsed),
--                 each with the typed @ and its code.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_competitors jsonb;
  v_users jsonb;
  v_attempts jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', x.handle, 'name', x.signed_name, 'email', x.email,
    'code', x.code, 'source', x.source, 'agreement', x.agreement,
    'signed_at', x.signed_at,
    'visits', coalesce(x.visits, 0),
    'signups', coalesce(x.signups, 0),
    'signup_handles', coalesce(x.signup_handles, '[]'::jsonb)
  ) order by x.signed_at desc nulls last), '[]'::jsonb)
  into v_competitors
  from (
    select r.*, v.visits, s.signups, s.signup_handles
      from celestual_recruits r
      left join (select code, sum(n)::int as visits from celestual_recruit_visits group by code) v
        on v.code = r.code
      left join (select code, count(*)::int as signups,
                        jsonb_agg(handle order by created_at desc) as signup_handles
                   from celestual_recruit_signups group by code) s
        on s.code = r.code
     where r.status = 'signed'
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', m.handle,
    'first_verified_at', m.first_verified_at,
    'via', coalesce(iv.verified_via, case when iv.token is not null then 'dm' end),
    'code', iv.token,
    'verified_at', iv.verified_at,
    'session_live', coalesce(iv.expires_at > now(), false),
    'pings', (select count(*)::int from celestual_entries e where e.from_handle = m.handle)
  ) order by m.first_verified_at desc nulls last), '[]'::jsonb)
  into v_users
  from celestual_members m
  left join lateral (
    select token, verified_via, verified_at, expires_at
      from celestual_ig_verifications
     where handle = m.handle and status = 'verified'
     order by verified_at desc nulls last limit 1
  ) iv on true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', a.handle, 'code', a.token, 'created_at', a.created_at,
    'expired', a.expires_at <= now()
  ) order by a.created_at desc), '[]'::jsonb)
  into v_attempts
  from (
    select handle, token, created_at, expires_at
      from celestual_ig_verifications
     where status = 'pending'
     order by created_at desc
     limit 300
  ) a;

  return jsonb_build_object(
    'ok', true,
    'competitors', v_competitors,
    'users', v_users,
    'attempts', v_attempts,
    'counts', jsonb_build_object(
      'competitors', (select count(*) from celestual_recruits where status = 'signed'),
      'members', (select count(*) from celestual_members),
      'assumed', (select count(*) from celestual_ig_verifications where verified_via = 'timeout' and status = 'verified')
    )
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_delete_user — SERVICE ROLE ONLY. Erase one person entirely
-- (everything celestual_suppress erases, without the public rate limit and
-- WITHOUT the suppression: they may come back). Also clears the live
-- email-identity surfaces when those tables exist.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_delete_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
  v_code text;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  hh := celestual_hash_handle(nh);

  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_community_members where handle = nh;
  delete from celestual_campus_prereg where handle = nh;
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  select code into v_code from celestual_recruits where handle = nh;
  if v_code is not null then
    delete from celestual_recruit_visits where code = v_code;
    delete from celestual_recruit_signups where code = v_code;
  end if;
  delete from celestual_recruit_signups where handle = nh;
  delete from celestual_recruits where handle = nh;
  if to_regclass('public.celestual_email_identities') is not null then
    execute 'delete from celestual_email_identities where handle = $1' using nh;
  end if;
  if to_regclass('public.celestual_login_links') is not null then
    execute 'delete from celestual_login_links where handle = $1' using nh;
  end if;

  return jsonb_build_object('ok', true, 'handle', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_ban_user — SERVICE ROLE ONLY. The delete, plus the door
-- closes: the handle is suppressed (un-pingable), and the ban checks in
-- celestual_complete_ig_verification / celestual_ig_verify_timeout /
-- celestual_trial_claim keep it from verifying back in.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_ban_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v jsonb;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  v := celestual_admin_delete_user(nh);
  insert into celestual_suppressions (handle_hash, reason)
  values (celestual_hash_handle(nh), 'banned by admin')
  on conflict (handle_hash) do nothing;
  return v || jsonb_build_object('banned', true);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_delete_competitor — SERVICE ROLE ONLY. Remove one trial
-- competitor (their program row, their link's counters, their credited
-- signups) while leaving any ordinary-user data they hold untouched.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_delete_competitor(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_code text;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select code into v_code from celestual_recruits where handle = nh;
  if v_code is not null then
    delete from celestual_recruit_visits where code = v_code;
    delete from celestual_recruit_signups where code = v_code;
  end if;
  delete from celestual_recruits where handle = nh;
  return jsonb_build_object('ok', true, 'handle', nh, 'code', v_code);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_verification (0017 revision) — identical to 0014 except
-- the prune keeps EXPIRED rows for 7 days instead of 1 minute.
--
-- WHY. The relay's "That code didn’t match an active request" reply traced to
-- this prune: a code that lapsed (30-min TTL — and a first DM from a stranger
-- can sit in Instagram's Message Requests far longer) answered the honest
-- 'code_expired' only while its row survived; the moment any later start()
-- pruned it, the same DM degraded to 'no_pending' → "didn’t match an active
-- request", which reads as broken. Keeping lapsed rows a week (a) preserves
-- the honest "that code expired" DM for the whole realistic retry window, and
-- (b) keeps the admin dashboard's "unfinished verifications" list complete —
-- pruned rows used to vanish from it. The partial unique index only covers
-- PENDING rows, so retention does not shrink the live code space.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_start_ig_verification(p_handle text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_ip text;
  v_n  int;
  v_token text;
  v_try int := 0;
  c_pending_ttl      constant interval := interval '30 minutes';
  c_start_per_ip     constant int := 15;   -- per IP / hour
  c_start_per_handle constant int := 8;    -- per handle / hour
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid proof';
  end if;

  v_ip := celestual_client_ip();

  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
    if v_n >= c_start_per_ip then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_n from celestual_attempts
    where to_handle = nh and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
  if v_n >= c_start_per_handle then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  -- Prune rows only once they've been lapsed a full week — see the header.
  -- (Was 1 minute past expiry; same rule, longer grace, pending and stale
  -- verified sessions alike. The pending-only partial unique index means the
  -- retained rows never shrink the live code space.)
  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '7 days';
  end if;

  -- Issue a 6-digit code unique among CURRENTLY pending rows (retry on collision).
  loop
    v_try := v_try + 1;
    v_token := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into celestual_ig_verifications (handle, token, proof_hash, expires_at)
      values (nh, v_token, lower(p_proof_hash), now() + c_pending_ttl);
      exit;
    exception when unique_violation then
      if v_try >= 30 then
        return jsonb_build_object('ok', false, 'error', 'busy');
      end if;
    end;
  end loop;

  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', to_char((now() + c_pending_ttl) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS. The grace RPC is the only client-facing addition (proof-gated, like
-- poll). Everything else is the edge functions' alone.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_start_ig_verification(text, text) from public;
grant execute on function celestual_start_ig_verification(text, text) to anon, authenticated;

revoke all on function celestual_ig_verify_timeout(text, text) from public;
grant execute on function celestual_ig_verify_timeout(text, text) to anon, authenticated;

revoke all on function celestual_trial_code_ok(text) from anon, authenticated, public;
revoke all on function celestual_trial_claim(text, text, text, text, text) from anon, authenticated, public;
grant execute on function celestual_trial_claim(text, text, text, text, text) to service_role;
revoke all on function celestual_trial_login(text, text) from anon, authenticated, public;
grant execute on function celestual_trial_login(text, text) to service_role;
revoke all on function celestual_trial_check(text) from anon, authenticated, public;
grant execute on function celestual_trial_check(text) to service_role;

revoke execute on function celestual_complete_ig_verification(text, text, text) from anon, authenticated, public;
grant  execute on function celestual_complete_ig_verification(text, text, text) to service_role;

revoke all on function celestual_admin_overview() from anon, authenticated, public;
grant execute on function celestual_admin_overview() to service_role;
revoke all on function celestual_admin_delete_user(text) from anon, authenticated, public;
grant execute on function celestual_admin_delete_user(text) to service_role;
revoke all on function celestual_admin_ban_user(text) from anon, authenticated, public;
grant execute on function celestual_admin_ban_user(text) to service_role;
revoke all on function celestual_admin_delete_competitor(text) from anon, authenticated, public;
grant execute on function celestual_admin_delete_competitor(text) to service_role;
