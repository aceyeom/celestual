-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0020 — two different doors                                   ║
-- ║ "delete everything" is not "never let anyone enter me"                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- THE CONFLATION THIS ENDS.
--
-- celestual_suppressions was doing three unrelated jobs under one flag:
--
--   1. THE OPT-OUT (the real one, promised in the privacy policy): any handle
--      owner, on Celestual or not, can make their @ permanently un-pingable.
--      This is about being a RECIPIENT. It says "nobody may enter me."
--   2. THE ADMIN BAN: this person is not welcome. This is about IDENTITY.
--      It says "you may not be a user here."
--   3. "DELETE EVERYTHING" in the account screen — which called
--      celestual_suppress on your OWN handle, and so quietly did (1) to you.
--
-- (3) is the bug, and it is a copy bug as much as a code one. Somebody tapping
-- "delete everything" means "take my data off your servers." They do not mean
-- "and bar this handle from ever signing up again." One reads as housekeeping;
-- the other is a permanent, irreversible door. Because 0004→0019 checked the
-- one flag at verification time, a person who cleaned up their account could
-- never come back — and, until 0018, was told "that code lapsed" when they
-- tried, forever.
--
-- WHAT LANDS HERE:
--
--   A. THE WIPE. celestual_suppressions is emptied once — every handle
--      unbanned, every accidental self-lock lifted. Guarded by a marker in
--      celestual_settings so re-applying this file NEVER touches opt-outs
--      recorded after today. See the guard for why that matters.
--
--   B. A `kind` COLUMN, so the two doors stop sharing a lock:
--        'optout' — nobody may enter this @ (pings blocked; signing up is fine)
--        'ban'    — not welcome (pings blocked AND identity refused)
--      Ping-blocking (celestual_is_member, celestual_submit) keeps checking the
--      whole table: both kinds mean "do not enter this @". Every IDENTITY check
--      — start, complete, the grace, the trial claim — now checks 'ban' ONLY.
--      An opt-out protects you from being entered; it was never meant to stop
--      you joining, and treating it that way is what made this unrecoverable.
--
--   C. celestual_erase_account — erasure that erases and nothing else.
--      "Delete everything" now calls THIS. No flag, no lock, no door. Come back
--      whenever you like.
--
-- Re-runnable (the wipe self-disarms). Safe on top of 0001→0019.

-- ──────────────────────────────────────────────────────────────────────
-- B. the column. Existing rows are back-filled by their reason: the admin
-- ban wrote 'banned by admin', everything else was an opt-out (or the
-- self-delete this migration is here to stop counting as one).
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_suppressions add column if not exists kind text not null default 'optout';

update celestual_suppressions
   set kind = 'ban'
 where kind <> 'ban' and coalesce(reason, '') = 'banned by admin';

-- ──────────────────────────────────────────────────────────────────────
-- A. THE WIPE — once, and only once.
--
-- Every row goes: the accidental self-locks, the admin bans, and yes, any
-- genuine opt-outs, because the three are indistinguishable in a table that
-- only ever stored a salted hash and a reason string. Anyone who opted out and
-- still wants to can opt out again in one tap at /privacy; nobody who deleted
-- their account should be locked out for it.
--
-- THE GUARD IS THE IMPORTANT PART. A bare `delete from celestual_suppressions`
-- in a re-runnable migration is a loaded gun: every future apply — a fresh
-- environment rebuild, someone re-pasting the file to fix a function — would
-- silently erase every opt-out collected since. Those are people who asked
-- never to be entered, and honouring that is a published promise. So the wipe
-- writes a marker and checks it first. It cannot fire twice.
-- ──────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from celestual_settings where key = 'suppressions_reset_0020') then
    delete from celestual_suppressions;
    insert into celestual_settings (key, value)
    values ('suppressions_reset_0020', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSOF'))
    on conflict (key) do nothing;
    raise notice 'CELESTUAL 0020: suppression list wiped — everyone unbanned.';
  else
    raise notice 'CELESTUAL 0020: wipe already ran, leaving the list alone.';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_erase_account — CLIENT-CALLABLE. Erase everything about a handle
-- and close no doors.
--
-- This is what "delete everything" calls now. Byte-for-byte the erasure
-- celestual_suppress performs, minus the one insert that made it permanent.
--
-- ON EXPOSURE: it takes a bare handle, like celestual_suppress always has —
-- the opt-out is deliberately never behind a login (privacy policy: "free,
-- immediate, never behind a login"), and this erases strictly LESS than that
-- call already did for the same input. Same 10-per-IP-per-hour limit.
--   { erased:int, handle } | { error:'rate_limited' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_erase_account(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
  v_ip text;
  v_n  int;
  c_erase_per_hour constant int := 10;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  hh := celestual_hash_handle(nh);

  v_ip := celestual_client_ip();
  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:erase' and created_at > now() - interval '1 hour';
    if v_n >= c_erase_per_hour then
      return jsonb_build_object('erased', 0, 'error', 'rate_limited');
    end if;
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:erase', hh);
  end if;

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
  if to_regclass('public.celestual_email_identities') is not null then
    execute 'delete from celestual_email_identities where handle = $1' using nh;
  end if;
  if to_regclass('public.celestual_login_links') is not null then
    execute 'delete from celestual_login_links where handle = $1' using nh;
  end if;

  return jsonb_build_object('erased', v_erased, 'handle', nh);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_suppress (0020 revision) — the REAL opt-out, unchanged in what it
-- does, now labelled 'optout' so it can never again be read as a ban. Its
-- reason string is human, because the desk shows it.
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

  insert into celestual_suppressions (handle_hash, reason, kind)
  values (hh, 'asked never to be entered', 'optout')
  on conflict (handle_hash) do update set kind = 'optout', reason = 'asked never to be entered';

  -- Wipe everything referencing this handle, on either side.
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

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_ban_user (0020 revision) — the erase, plus the door closes,
-- now stamped kind='ban'. This is the ONLY thing that refuses an identity.
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
  insert into celestual_suppressions (handle_hash, reason, kind)
  values (celestual_hash_handle(nh), 'banned by admin', 'ban')
  on conflict (handle_hash) do update set kind = 'ban', reason = 'banned by admin';
  return v || jsonb_build_object('banned', true);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_is_banned(handle) — the ONE identity gate, in one place so the
-- four callers below can never drift apart again.
--
-- Note what it does NOT include: an opt-out. Being un-pingable and being
-- unwelcome are different facts, and only the second one should stop somebody
-- signing up. Ping-blocking still reads the whole table (celestual_is_member,
-- celestual_submit) — those care about "may this @ be entered", where both
-- kinds mean no.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_is_banned(p_handle text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from celestual_suppressions
     where handle_hash = celestual_hash_handle(celestual_norm(p_handle))
       and kind = 'ban'
  )
$$;

-- ──────────────────────────────────────────────────────────────────────
-- The four identity gates, re-emitted to ask celestual_is_banned instead of
-- "is this handle in the table at all". Nothing else about them changes.
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

  -- Bans only (0020). An opt-out no longer stops anyone signing up.
  if celestual_is_banned(nh) then
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '7 days';
  end if;

  -- Four digits (0019). Unique among currently-pending rows.
  loop
    v_try := v_try + 1;
    v_token := lpad((floor(random() * 10000))::int::text, 4, '0');
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

  if celestual_is_banned(nu) then
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
    return jsonb_build_object('ok', true, 'handle', r.handle);
  end if;
  if r.status <> 'pending' or r.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if now() - r.created_at < c_grace then
    return jsonb_build_object('ok', false, 'error', 'early');
  end if;
  if celestual_is_banned(r.handle) then
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
  -- The version names the document they actually signed. /trial now serves the
  -- Celestual Challenge doc, not First Light, so new signatures must say so —
  -- an agreement record pointing at the wrong document is worse than none.
  -- Rows signed before this migration keep 'first-light-v1' (the returning
  -- competitor path returns before the update, so nobody's history is relabelled).
  c_agreement constant text := 'challenge-v1';
begin
  if ne is null or ne !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or nh is null
     or p_dash_hash is null or p_dash_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 80 then
    return jsonb_build_object('ok', false, 'error', 'name');
  end if;
  if celestual_is_banned(nh) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

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
-- celestual_admin_verify_user (0020 revision) — bans only, same reasoning.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_verify_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  c_session_ttl constant interval := interval '30 days';
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if celestual_is_banned(nh) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  update celestual_ig_verifications
     set status = 'verified', verified_via = 'manual', verified_at = now(),
         expires_at = now() + c_session_ttl
   where id = (
     select id from celestual_ig_verifications
      where handle = nh and status = 'pending'
      order by created_at desc limit 1
   );

  insert into celestual_members (handle, handle_hash)
  values (nh, celestual_hash_handle(nh))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', nh);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_handle_status (0020 revision) — reports WHICH door, so the
-- desk never again shows "locked out" for somebody who merely asked not to be
-- entered. `blocked` is the truthful union for the ping question.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_handle_status(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_rows jsonb;
  v_since timestamptz;
  v_kind text;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code', x.token, 'status', x.status, 'via', x.verified_via,
    'created_at', x.created_at, 'expires_at', x.expires_at,
    'verified_at', x.verified_at, 'live', x.expires_at > now()
  ) order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select token, status, verified_via, created_at, expires_at, verified_at
      from celestual_ig_verifications
     where handle = nh
     order by created_at desc
     limit 20
  ) x;

  select kind into v_kind from celestual_suppressions
   where handle_hash = celestual_hash_handle(nh);
  select first_verified_at into v_since from celestual_members where handle = nh;

  return jsonb_build_object(
    'ok', true,
    'handle', nh,
    'kind', v_kind,                          -- null | 'optout' | 'ban'
    'banned', coalesce(v_kind = 'ban', false),
    'opted_out', coalesce(v_kind = 'optout', false),
    'blocked', v_kind is not null,            -- un-pingable, either way
    -- kept for compatibility with a desk build older than 0020
    'suppressed', coalesce(v_kind = 'ban', false),
    'member', exists (select 1 from celestual_members where handle = nh),
    'member_since', v_since,
    'verifications', v_rows
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_overview (0020 revision) — 0019's call with the counts split.
-- One number for "banned" and one for "asked not to be entered", because
-- showing them as one number is the habit this whole migration is undoing.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_competitors jsonb;
  v_users jsonb;
  v_unverified jsonb;
  v_growth jsonb;
  v_logs jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', x.handle, 'name', x.signed_name, 'email', x.email,
    'code', x.code, 'source', x.source, 'agreement', x.agreement,
    'signed_at', x.signed_at,
    'visits', coalesce(x.visits, 0),
    'signups', coalesce(x.signups, 0),
    'signup_handles', coalesce(x.signup_handles, '[]'::jsonb)
  ) order by coalesce(x.signups, 0) desc, x.signed_at desc nulls last), '[]'::jsonb)
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
    'suppressed', coalesce(sp.kind = 'ban', false),
    'opted_out', coalesce(sp.kind = 'optout', false),
    'pings', (select count(*)::int from celestual_entries e where e.from_handle = m.handle),
    'received', (select count(*)::int from celestual_entries e where e.to_handle = m.handle),
    'matches', (select count(*)::int from celestual_matches x
                 where x.handle_a = m.handle or x.handle_b = m.handle),
    'last_ping_at', (select max(e.created_at) from celestual_entries e where e.from_handle = m.handle),
    'competitor', exists (select 1 from celestual_recruits r
                           where r.handle = m.handle and r.status = 'signed'),
    'via_code', (select rs.code from celestual_recruit_signups rs where rs.handle = m.handle limit 1)
  ) order by m.first_verified_at desc nulls last), '[]'::jsonb)
  into v_users
  from celestual_members m
  left join celestual_suppressions sp on sp.handle_hash = m.handle_hash
  left join lateral (
    select token, verified_via, verified_at, expires_at
      from celestual_ig_verifications
     where handle = m.handle and status = 'verified'
     order by verified_at desc nulls last limit 1
  ) iv on true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', a.handle,
    'attempts', a.attempts,
    'code', a.last_code,
    'first_at', a.first_at,
    'last_at', a.last_at,
    'live', a.live_n > 0,
    'suppressed', celestual_is_banned(a.handle)
  ) order by a.last_at desc), '[]'::jsonb)
  into v_unverified
  from (
    select v.handle,
           count(*)::int as attempts,
           min(v.created_at) as first_at,
           max(v.created_at) as last_at,
           count(*) filter (where v.expires_at > now())::int as live_n,
           (array_agg(v.token order by v.created_at desc))[1] as last_code
      from celestual_ig_verifications v
     where v.status = 'pending'
       and not exists (select 1 from celestual_members m where m.handle = v.handle)
     group by v.handle
     order by max(v.created_at) desc
     limit 300
  ) a;

  select coalesce(jsonb_agg(jsonb_build_object(
    'day', to_char(d.day, 'YYYY-MM-DD'),
    'members', d.n,
    'total', d.running,
    'pings', d.pings,
    'verifications', d.verifs
  ) order by d.day), '[]'::jsonb)
  into v_growth
  from (
    select g.day,
           coalesce(mm.n, 0)::int as n,
           coalesce(pp.n, 0)::int as pings,
           coalesce(vv.n, 0)::int as verifs,
           (select count(*) from celestual_members m2
             where m2.first_verified_at < g.day + interval '1 day')::int as running
      from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') as g(day)
      left join (select first_verified_at::date as day, count(*) as n
                   from celestual_members group by 1) mm on mm.day = g.day
      left join (select created_at::date as day, count(*) as n
                   from celestual_entries group by 1) pp on pp.day = g.day
      left join (select created_at::date as day, count(*) as n
                   from celestual_ig_verifications group by 1) vv on vv.day = g.day
  ) d;

  select coalesce(jsonb_agg(jsonb_build_object(
    'at', l.at, 'kind', l.kind, 'handle', l.handle, 'detail', l.detail
  ) order by l.at desc), '[]'::jsonb)
  into v_logs
  from (
    (select verified_at as at, 'verified' as kind, handle,
            coalesce(verified_via, 'dm') || ' · ' || token as detail
       from celestual_ig_verifications
      where status = 'verified' and verified_at is not null
      order by verified_at desc limit 80)
    union all
    (select created_at as at, 'code' as kind, handle, token as detail
       from celestual_ig_verifications
      order by created_at desc limit 80)
    union all
    (select created_at as at, 'ping' as kind, from_handle as handle,
            case when matched_at is null then 'placed' else 'placed · matched' end as detail
       from celestual_entries order by created_at desc limit 80)
    union all
    (select matched_at as at, 'match' as kind, handle_a as handle, '@' || handle_b as detail
       from celestual_matches order by matched_at desc limit 40)
    union all
    (select signed_at as at, 'trial' as kind, handle, 'code ' || code as detail
       from celestual_recruits where status = 'signed' and signed_at is not null
      order by signed_at desc limit 40)
    union all
    (select created_at as at,
            case when kind = 'ban' then 'blocked' else 'optout' end as kind,
            null::text as handle,
            coalesce(reason, kind) as detail
       from celestual_suppressions order by created_at desc limit 40)
    union all
    (select created_at as at, 'admin_fail' as kind, null::text as handle,
            coalesce(ip, 'unknown ip') as detail
       from celestual_attempts
      where from_handle = 'celestual:admin' order by created_at desc limit 40)
  ) l
  where l.at is not null;

  return jsonb_build_object(
    'ok', true,
    'now', now(),
    'competitors', v_competitors,
    'users', v_users,
    'unverified', v_unverified,
    'attempts', v_unverified,
    'growth', v_growth,
    'logs', v_logs,
    'counts', jsonb_build_object(
      'competitors', (select count(*) from celestual_recruits where status = 'signed'),
      'members',     (select count(*) from celestual_members),
      'assumed',     (select count(*) from celestual_ig_verifications
                       where verified_via = 'timeout' and status = 'verified'),
      'manual',      (select count(*) from celestual_ig_verifications
                       where verified_via = 'manual' and status = 'verified'),
      'banned',      (select count(*) from celestual_suppressions where kind = 'ban'),
      'opted_out',   (select count(*) from celestual_suppressions where kind = 'optout'),
      -- kept so a desk build older than 0020 keeps rendering a number
      'suppressed',  (select count(*) from celestual_suppressions where kind = 'ban'),
      'unverified',  (select count(distinct v.handle) from celestual_ig_verifications v
                       where v.status = 'pending'
                         and not exists (select 1 from celestual_members m where m.handle = v.handle)),
      'pings',       (select count(*) from celestual_entries),
      'matches',     (select count(*) from celestual_matches),
      'visits',      (select coalesce(sum(n), 0) from celestual_recruit_visits),
      'signups',     (select count(*) from celestual_recruit_signups),
      'new_7d',      (select count(*) from celestual_members
                       where first_verified_at > now() - interval '7 days'),
      'pings_7d',    (select count(*) from celestual_entries
                       where created_at > now() - interval '7 days')
    )
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_erase_account(text) from public;
grant execute on function celestual_erase_account(text) to anon, authenticated;

revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;

revoke all on function celestual_is_banned(text) from anon, authenticated, public;

revoke all on function celestual_start_ig_verification(text, text) from public;
grant execute on function celestual_start_ig_verification(text, text) to anon, authenticated;

revoke all on function celestual_ig_verify_timeout(text, text) from public;
grant execute on function celestual_ig_verify_timeout(text, text) to anon, authenticated;

revoke execute on function celestual_complete_ig_verification(text, text, text) from anon, authenticated, public;
grant  execute on function celestual_complete_ig_verification(text, text, text) to service_role;

revoke all on function celestual_trial_claim(text, text, text, text, text) from anon, authenticated, public;
grant execute on function celestual_trial_claim(text, text, text, text, text) to service_role;

revoke all on function celestual_admin_overview() from anon, authenticated, public;
grant execute on function celestual_admin_overview() to service_role;
revoke all on function celestual_admin_ban_user(text) from anon, authenticated, public;
grant execute on function celestual_admin_ban_user(text) to service_role;
revoke all on function celestual_admin_verify_user(text) from anon, authenticated, public;
grant execute on function celestual_admin_verify_user(text) to service_role;
revoke all on function celestual_admin_handle_status(text) from anon, authenticated, public;
grant execute on function celestual_admin_handle_status(text) to service_role;
