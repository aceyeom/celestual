-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0018 — the silent lockout                                    ║
-- ║ why a suppressed @ could ask for codes forever and never be let in       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- THE BUG THIS CLOSES (production, @ace03d, 2026-07-29 ~11:00 UTC).
--
-- Four codes were minted 30–37 seconds apart. Every row stayed `pending` with a
-- live 30-minute TTL. The DMs carrying them reached the relay and came back
-- "That code didn't match an active request — it may have lapsed", and the
-- browser gave up at ~20 seconds with "that code lapsed. codes last about half
-- an hour." Both messages were false: the codes were correct and live.
--
-- The real answer was one row in celestual_suppressions. A suppressed handle —
-- put there by the account screen's "delete everything" (App.jsx), by the
-- public opt-out on /privacy, or by the admin desk's ban — hits the ban check
-- in BOTH completion paths:
--
--   celestual_complete_ig_verification → { ok:false, error:'banned' }
--        → celestual-manychat had no branch for it and fell through to its
--          catch-all "didn't match an active request" reply.
--   celestual_ig_verify_timeout        → { ok:false, error:'banned' }
--        → the sheet mapped 'banned' onto its `expired` phase, which is
--          literally the "that code lapsed" screen, at exactly GRACE_MS.
--
-- …while celestual_start_ig_verification had NO ban check at all, so it kept
-- handing out codes that could never complete. A permanent lockout, described
-- to the person in two different ways that were both wrong, with nothing in the
-- product able to name it or lift it.
--
-- WHAT LANDS HERE:
--   1. start() refuses up front for a suppressed handle ('banned') instead of
--      minting a dead code. The refusal still burns the rate-limit quota, so
--      the list can't be probed cheaply for who opted out.
--   2. celestual_admin_unban_user — the way back. The ban was a one-way door:
--      a person who erased themselves could never return, and no surface in the
--      product could undo it.
--   3. celestual_admin_handle_status — the diagnostic that would have answered
--      this in five seconds: is this @ suppressed, is it a member, what do its
--      last verification rows look like.
--   4. celestual_admin_overview gains a `suppressed` count so a growing lockout
--      list is visible on the desk instead of invisible in a table.
--
-- The matching honesty fixes live in celestual-manychat/index.ts (distinct
-- replies per outcome + result logging) and the verify sheet (a ban no longer
-- renders as a lapse). Re-runnable. Safe on top of 0001→0017.

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_verification (0018 revision) — identical to 0017 except
-- it refuses a suppressed handle before minting anything.
--
-- WHY HERE AND NOT ONLY AT COMPLETION. Both completion paths already refuse a
-- suppressed @; checking only there means the person is handed a code, told to
-- DM it, and then told the code was wrong — three screens away from the truth.
-- Refusing at the door costs one lookup and makes the state nameable.
--
-- ON THE DISCLOSURE. Answering 'banned' tells the asker that this @ opted out.
-- The asker is claiming to BE that @, the per-handle limit is 8 starts/hour,
-- and the refusal below records its attempt so probing burns that quota at the
-- same rate a real start does. The alternative — a code that can never work —
-- is what produced this bug.
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

  -- The door, checked before anything is minted. Record the attempt first so a
  -- refusal costs the same quota as a real start.
  if exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle(nh)) then
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  -- Prune rows only once they've been lapsed a full week (0017 — the retention
  -- that keeps a late DM's "that code expired" honest and the desk's unfinished
  -- list complete). The pending-only partial unique index means retained rows
  -- never shrink the live code space.
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
-- celestual_admin_unban_user — SERVICE ROLE ONLY. Lift a suppression.
--
-- The ban (and the self-erase, and the public opt-out) writes a hash into
-- celestual_suppressions and nothing in the product could ever take it out
-- again. That is correct for someone who asked never to be entered — and wrong
-- for the far more common case of a test account, a mistaken tap on "delete
-- everything", or a ban the desk wants to reverse.
--
-- Lifting only reopens the door: erased pings, matches and memberships stay
-- erased. The @ can verify again and start over.
--   { ok:true, handle, lifted:bool }   lifted=false → it wasn't suppressed
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_unban_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_n int;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  delete from celestual_suppressions where handle_hash = celestual_hash_handle(nh);
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'handle', nh, 'lifted', v_n > 0);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_handle_status — SERVICE ROLE ONLY. One @, the whole truth:
-- is the door shut, is it a member, and what did its last few verification
-- attempts actually do. This is the call that names a lockout instead of
-- leaving it to be inferred from a DM reply.
--   { ok:true, handle, suppressed, member, member_since, verifications:[…] }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_handle_status(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_rows jsonb;
  v_since timestamptz;
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

  select first_verified_at into v_since from celestual_members where handle = nh;

  return jsonb_build_object(
    'ok', true,
    'handle', nh,
    'suppressed', exists (
      select 1 from celestual_suppressions where handle_hash = celestual_hash_handle(nh)
    ),
    'member', exists (select 1 from celestual_members where handle = nh),
    'member_since', v_since,
    'verifications', v_rows
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_overview (0018 revision) — 0017's call verbatim, plus a
-- `suppressed` count. A lockout list that only grows and is never looked at is
-- how a bug like this one stays invisible for a week.
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
      'assumed', (select count(*) from celestual_ig_verifications where verified_via = 'timeout' and status = 'verified'),
      'suppressed', (select count(*) from celestual_suppressions)
    )
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS. start() stays client-callable; the two new calls are the desk's alone.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_start_ig_verification(text, text) from public;
grant execute on function celestual_start_ig_verification(text, text) to anon, authenticated;

revoke all on function celestual_admin_unban_user(text) from anon, authenticated, public;
grant execute on function celestual_admin_unban_user(text) to service_role;
revoke all on function celestual_admin_handle_status(text) from anon, authenticated, public;
grant execute on function celestual_admin_handle_status(text) to service_role;
revoke all on function celestual_admin_overview() from anon, authenticated, public;
grant execute on function celestual_admin_overview() to service_role;
