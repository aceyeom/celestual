-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0016 — the recruitment program                               ║
-- ║ comment → DM → agreement → a personal tracking link                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- THE LOOP THIS BACKS (docs/RECRUITMENT.md has the ManyChat wiring):
--
--   1. A recruitment reel goes up with ad spend behind it.
--   2. Someone comments "celestual" under it.
--   3. ManyChat's comment automation fires an External Request at the
--      celestual-recruit edge function, carrying the commenter's real
--      Meta-authenticated username. celestual_recruit_invite mints a one-time
--      signing token; the function answers with the rules plus a link, and
--      ManyChat sends that back as the DM.
--   4. They open the link, read the rules, and sign (celestual_recruit_sign).
--   5. Signing mints their PERSONAL CODE. From then on celestual.us/r/<code> is
--      theirs, and every visit and every signup that comes through it is counted
--      against that code — which is the whole point: we can see who is actually
--      bringing people in.
--
-- WHAT IS AND ISN'T STORED. A recruit row is an agreement record, so it keeps
-- what an agreement needs: the @ that signed, the version signed, the name typed
-- as the signature, and when. Their traffic is counted, never profiled: a visit
-- is a per-day integer against a code with no visitor identity of any kind, and
-- a signup is the handle that verified plus the code that sent them. Nothing
-- here can say who pinged whom — the double blind is untouched, because this
-- table never meets celestual_entries.
--
-- THE TWO SECRETS, both stored only as SHA-256, both minted outside Postgres:
--   · the INVITE token — one-time, 14 days, rides the DM link's fragment.
--   · the DASH key     — the recruit's own key to their numbers, minted in their
--                        browser at signing time (exactly like the DM `proof` in
--                        0004/0013). Losing it costs them the dashboard, not the
--                        code; a fresh DM re-issues one.
--
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE). Safe on top of 0001→0015.

create extension if not exists pgcrypto;

-- The agreement text the code is bound to. Bump this constant AND the copy in
-- app/src/i18n/strings.js together; a signature records the version it signed,
-- so an old signature is never silently re-pointed at new terms.
-- Current: 'v1'

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruits — one row per person who commented and was invited.
-- `code` is null until they sign; it is the public half of the whole program.
-- RLS-locked: every read and write goes through the RPCs below.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_recruits (
  handle            text primary key,
  code              text unique,
  igsid             text,
  status            text not null default 'invited',   -- invited | signed
  agreement         text,                              -- the version signed
  signed_name       text,
  signed_at         timestamptz,
  invite_hash       text,
  invite_expires_at timestamptz,
  dash_hash         text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists celestual_recruit_invite_idx on celestual_recruits (invite_hash);
alter table celestual_recruits enable row level security;
revoke all on celestual_recruits from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_visits — a per-day count of link opens. One integer per
-- code per day: no ip, no user agent, no visitor id, nothing to profile with.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_recruit_visits (
  code text not null,
  day  date not null,
  n    int  not null default 0,
  primary key (code, day)
);
alter table celestual_recruit_visits enable row level security;
revoke all on celestual_recruit_visits from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_signups — who actually joined through a code. One row per
-- (code, handle), so a person can only ever be counted once for one recruiter.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_recruit_signups (
  code       text not null,
  handle     text not null,
  created_at timestamptz not null default now(),
  primary key (code, handle)
);
create index if not exists celestual_recruit_signup_handle_idx on celestual_recruit_signups (handle);
alter table celestual_recruit_signups enable row level security;
revoke all on celestual_recruit_signups from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_code() — a short, unambiguous, unguessable code for a link
-- people will read out loud and type. Crockford-ish alphabet: no 0/O, no 1/I/L.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_recruit_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  candidate text;
  i int;
  tries int := 0;
begin
  loop
    candidate := '';
    for i in 1..7 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from celestual_recruits where code = candidate);
    tries := tries + 1;
    if tries > 40 then
      raise exception 'could not mint a recruit code';
    end if;
  end loop;
  return candidate;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_invite(username, igsid, invite_hash) — SERVICE ROLE ONLY.
-- Called by celestual-recruit when the comment automation fires. Creates or
-- refreshes the invite for a Meta-authenticated username and reports what the DM
-- should say:
--   { ok:true, status:'invited' }                  → send them the signing link
--   { ok:true, status:'signed', code }             → they're already in; re-send
--                                                    their tracking link
-- A person who comments a second time gets a FRESH token (the old one dies), so
-- a lost DM is self-healing.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_recruit_invite(p_username text, p_igsid text, p_invite_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_username);
  v_status text;
  v_code text;
  c_ttl constant interval := interval '14 days';
begin
  if nh is null or p_invite_hash is null or p_invite_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select status, code into v_status, v_code from celestual_recruits where handle = nh;

  if v_status = 'signed' then
    return jsonb_build_object('ok', true, 'status', 'signed', 'code', v_code);
  end if;

  insert into celestual_recruits (handle, igsid, invite_hash, invite_expires_at)
  values (nh, nullif(p_igsid, ''), lower(p_invite_hash), now() + c_ttl)
  on conflict (handle) do update
    set igsid = coalesce(nullif(excluded.igsid, ''), celestual_recruits.igsid),
        invite_hash = excluded.invite_hash,
        invite_expires_at = excluded.invite_expires_at,
        updated_at = now();

  return jsonb_build_object('ok', true, 'status', 'invited');
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_open(invite_hash) — CLIENT-callable (anon). What the
-- agreement page needs to render: whose invite this is, and whether it's spent.
-- The token itself never reaches the server; the browser hashes it first, the
-- same way the DM proof works.
--   { ok:true, handle, status:'invited' }
--   { ok:true, handle, status:'signed', code }   → already signed; show the link
--   { ok:false, error:'invalid' }                → dead, spent or expired
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_recruit_open(p_invite_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  if p_invite_hash is null or p_invite_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into r from celestual_recruits
   where invite_hash = lower(p_invite_hash) and invite_expires_at > now()
   limit 1;
  if r.handle is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  return jsonb_build_object('ok', true, 'handle', r.handle, 'status', r.status, 'code', r.code);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_sign(invite_hash, name, dash_hash) — CLIENT-callable (anon).
-- The signature. Burns the invite, records the agreement version and the typed
-- name, mints the personal code, and binds the browser's freshly minted
-- dashboard key. Idempotent for an already-signed recruit holding a live invite:
-- it re-binds the key and hands the same code back, so re-signing from a second
-- device never mints a second code.
--   { ok:true, code } | { ok:false, error }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_recruit_sign(p_invite_hash text, p_name text, p_dash_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_code text;
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  c_agreement constant text := 'v1';
begin
  if p_invite_hash is null or p_invite_hash !~ '^[0-9a-fA-F]{64}$'
     or p_dash_hash is null or p_dash_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'name');
  end if;

  select * into r from celestual_recruits
   where invite_hash = lower(p_invite_hash) and invite_expires_at > now()
   for update;
  if r.handle is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_code := coalesce(r.code, celestual_recruit_code());

  update celestual_recruits
     set code = v_code,
         status = 'signed',
         agreement = c_agreement,
         signed_name = coalesce(signed_name, v_name),
         signed_at = coalesce(signed_at, now()),
         dash_hash = lower(p_dash_hash),
         updated_at = now()
   where handle = r.handle;

  return jsonb_build_object('ok', true, 'code', v_code, 'handle', r.handle);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_visit(code) — CLIENT-callable (anon). Someone opened
-- celestual.us/r/<code>. Bumps one integer for today and nothing else. Rate
-- limited per IP through the existing attempts table so a loop can't inflate a
-- recruiter's numbers; an unknown code is a silent no-op.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_recruit_visit(p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nc text := lower(nullif(trim(coalesce(p_code, '')), ''));
  v_ip text;
  v_n int;
  c_per_hour constant int := 30;
begin
  if nc is null or nc !~ '^[a-z0-9]{4,16}$' then
    return jsonb_build_object('ok', false);
  end if;
  if not exists (select 1 from celestual_recruits where code = nc) then
    return jsonb_build_object('ok', false);
  end if;

  v_ip := celestual_client_ip();
  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:recruit' and created_at > now() - interval '1 hour';
    if v_n >= c_per_hour then
      return jsonb_build_object('ok', true, 'counted', false);
    end if;
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:recruit', nc);
  end if;

  insert into celestual_recruit_visits (code, day, n)
  values (nc, current_date, 1)
  on conflict (code, day) do update set n = celestual_recruit_visits.n + 1;

  return jsonb_build_object('ok', true, 'counted', true);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_attribute(code, handle) — CLIENT-callable (anon). Called
-- once, by the browser, at the moment a person who arrived through a tracking
-- link finishes verifying. Only a handle celestual has actually verified counts
-- (a member row exists), so a link can't be credited with people who never
-- arrived, and the primary key makes double-counting impossible.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_recruit_attribute(p_code text, p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nc text := lower(nullif(trim(coalesce(p_code, '')), ''));
  nh text := celestual_norm(p_handle);
  v_owner text;
begin
  if nc is null or nh is null then
    return jsonb_build_object('ok', false);
  end if;
  select handle into v_owner from celestual_recruits where code = nc and status = 'signed';
  if v_owner is null or v_owner = nh then
    -- unknown code, or someone crediting themselves
    return jsonb_build_object('ok', false);
  end if;
  if not exists (select 1 from celestual_members where handle = nh) then
    return jsonb_build_object('ok', false);
  end if;

  insert into celestual_recruit_signups (code, handle)
  values (nc, nh)
  on conflict (code, handle) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recruit_stats(code, dash_hash) — CLIENT-callable (anon), gated on
-- the recruit's own key. Their numbers, and only theirs: link opens, signups,
-- and the last seven days of opens for the little chart.
--   { ok:true, handle, code, visits, signups, days:[{day,n}] }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_recruit_stats(p_code text, p_dash_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nc text := lower(nullif(trim(coalesce(p_code, '')), ''));
  r record;
  v_visits int;
  v_signups int;
  v_days jsonb;
begin
  if nc is null or p_dash_hash is null or p_dash_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  select * into r from celestual_recruits
   where code = nc and dash_hash = lower(p_dash_hash) and status = 'signed';
  if r.handle is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select coalesce(sum(n), 0) into v_visits from celestual_recruit_visits where code = nc;
  select count(*) into v_signups from celestual_recruit_signups where code = nc;
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', n) order by day), '[]'::jsonb)
    into v_days
    from celestual_recruit_visits
   where code = nc and day > current_date - 7;

  return jsonb_build_object(
    'ok', true, 'handle', r.handle, 'code', nc,
    'visits', v_visits, 'signups', v_signups, 'days', v_days,
    'since', r.signed_at
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_suppress — the opt-out must reach here too. Deleting everything
-- erases the person's own recruit record and the signups credited to them, and
-- un-credits them from anyone else's code. (Everything 0013's version did, plus
-- the three recruit surfaces.)
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_suppress(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
  v_ip text;
  v_n  int;
  v_code text;
  c_suppress_per_hour constant int := 10;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  hh := celestual_hash_handle(nh);

  v_ip := celestual_client_ip();
  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:suppress' and created_at > now() - interval '1 hour';
    if v_n >= c_suppress_per_hour then
      return jsonb_build_object('suppressed', null, 'error', 'rate_limited');
    end if;
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:suppress', hh);
  end if;

  insert into celestual_suppressions (handle_hash, reason)
  values (hh, 'self-service opt-out')
  on conflict (handle_hash) do nothing;

  -- Wipe everything referencing this handle, on either side.
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_community_members where handle = nh;
  delete from celestual_campus_prereg where handle = nh;
  -- the durable-recovery surfaces (0013)
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  -- the recruitment surfaces (0016): their own program record, the traffic
  -- counted against it, and any credit they gave someone else
  select code into v_code from celestual_recruits where handle = nh;
  if v_code is not null then
    delete from celestual_recruit_visits where code = v_code;
    delete from celestual_recruit_signups where code = v_code;
  end if;
  delete from celestual_recruit_signups where handle = nh;
  delete from celestual_recruits where handle = nh;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS. invite is the edge function's alone (it is what turns a comment into
-- an invite, so it must never be callable from a browser). Everything else is
-- client-facing and gated on a hash the browser already holds.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_recruit_code() from anon, authenticated, public;

revoke all on function celestual_recruit_invite(text, text, text) from anon, authenticated, public;
grant execute on function celestual_recruit_invite(text, text, text) to service_role;

revoke all on function celestual_recruit_open(text) from public;
grant execute on function celestual_recruit_open(text) to anon, authenticated;

revoke all on function celestual_recruit_sign(text, text, text) from public;
grant execute on function celestual_recruit_sign(text, text, text) to anon, authenticated;

revoke all on function celestual_recruit_visit(text) from public;
grant execute on function celestual_recruit_visit(text) to anon, authenticated;

revoke all on function celestual_recruit_attribute(text, text) from public;
grant execute on function celestual_recruit_attribute(text, text) to anon, authenticated;

revoke all on function celestual_recruit_stats(text, text) from public;
grant execute on function celestual_recruit_stats(text, text) to anon, authenticated;

revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;
