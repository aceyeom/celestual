-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0019 — back to four digits, and a desk worth opening         ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- TWO THINGS:
--
--   1. THE CODE GOES BACK TO FOUR DIGITS. 0014 widened it to six. Six digits
--      buys nothing here: the code is a pure correlation id (0012), never a
--      secret — the Meta-authenticated sender is the identity, so guessing a
--      code gets you a session you cannot finish. What six digits DOES buy is
--      friction: "star-753520" is a harder thing to read off a screen and put
--      in a DM than "star-1283". Every extra character is a place to drop one.
--
--      Space: 10,000 codes, unique among CURRENTLY PENDING rows only (the
--      partial index), with a 30-minute TTL. That is ~10,000 simultaneous live
--      verifications before the 30-try mint loop starts to feel it — orders of
--      magnitude past where we are. Both relays already parse \d{4,6}, so
--      six-digit codes still in flight during the cutover resolve normally.
--
--   2. THE DESK GETS ITS DATA. celestual_admin_overview grew for the old
--      dashboard; the new one at /admin needs more, and needs it deduplicated:
--
--      • users — ONE ROW PER MEMBER, with how they verified, what they've done,
--        whether they're suppressed, and which competitor's link brought them.
--        (Unchanged in shape, enriched.)
--      • unverified — ONE ROW PER HANDLE, not one per attempt. The old list
--        printed every pending row, so a person who retried four times filled
--        four lines and the list read as four people. It now carries the
--        attempt COUNT, the latest code, and whether anything is still live.
--      • growth — daily new members and a running total, for the curve.
--      • logs — one activity feed across verifications, pings, matches, trial
--        signups and failed admin logins, newest first.
--
--      Plus two new controls the ManyChat week made obvious: clear a handle's
--      stuck pending rows, and admit someone by hand when the relay is down.
--
-- Re-runnable. Safe on top of 0001→0018.

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_verification (0019 revision) — 0018's function with a
-- four-digit mint. Everything else (the suppression check, the 7-day
-- retention, the rate limits, the 30-minute TTL) is unchanged.
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

  -- The door (0018), checked before anything is minted.
  if exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle(nh)) then
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;

  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '7 days';
  end if;

  -- FOUR digits again (see the header). Unique among currently-pending rows.
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

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_clear_pending — SERVICE ROLE ONLY. Drop a handle's unfinished
-- verification rows. The cure for a person stuck behind their own stale codes,
-- and the way to clear a test account's clutter out of the unverified list
-- without touching anything they actually own.
--   { ok:true, handle, cleared:int }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_admin_clear_pending(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_n int;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  delete from celestual_ig_verifications where handle = nh and status = 'pending';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'handle', nh, 'cleared', v_n);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_admin_verify_user — SERVICE ROLE ONLY. Admit a handle by hand.
--
-- The relay week is the argument for this: when the DM path is down and the
-- 20-second grace is off, there was no way to let a real person in without
-- writing SQL. The row is stamped verified_via = 'manual' so the desk never
-- confuses an admin's word for Meta's. A suppressed handle is still refused —
-- lift the lockout first, deliberately.
--   { ok:true, handle } | { ok:false, error:'invalid'|'banned' }
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
  if exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle(nh)) then
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
-- celestual_admin_overview (0019 revision) — the whole desk in one call.
--
-- THE DEDUPLICATION THAT MATTERS. `attempts` used to be one row per pending
-- verification, so @ace03d retrying four times filled four lines and the list
-- read as four people who couldn't get in. `unverified` is now one row per
-- HANDLE, carrying the attempt count and the latest code — which is both the
-- honest count and the more useful one, because the code you want when you go
-- searching an Instagram inbox is the last one they were given.
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
  -- ── competitors: the trial rows with their link traffic ──
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

  -- ── users: ONE row per member, everything we know about them ──
  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', m.handle,
    'first_verified_at', m.first_verified_at,
    'via', coalesce(iv.verified_via, case when iv.token is not null then 'dm' end),
    'code', iv.token,
    'verified_at', iv.verified_at,
    'session_live', coalesce(iv.expires_at > now(), false),
    'suppressed', exists (
      select 1 from celestual_suppressions s where s.handle_hash = m.handle_hash
    ),
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
  left join lateral (
    select token, verified_via, verified_at, expires_at
      from celestual_ig_verifications
     where handle = m.handle and status = 'verified'
     order by verified_at desc nulls last limit 1
  ) iv on true;

  -- ── unverified: ONE row per handle that started and never finished ──
  select coalesce(jsonb_agg(jsonb_build_object(
    'handle', a.handle,
    'attempts', a.attempts,
    'code', a.last_code,
    'first_at', a.first_at,
    'last_at', a.last_at,
    'live', a.live_n > 0,
    'suppressed', exists (
      select 1 from celestual_suppressions s where s.handle_hash = celestual_hash_handle(a.handle)
    )
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

  -- ── growth: 30 days of new members, with the running total ──
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

  -- ── logs: one feed, newest first ──
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
    (select created_at as at, 'blocked' as kind, null::text as handle,
            coalesce(reason, 'suppressed') as detail
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
    -- the old key, kept so an un-redeployed desk keeps rendering something
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
      'suppressed',  (select count(*) from celestual_suppressions),
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
revoke all on function celestual_start_ig_verification(text, text) from public;
grant execute on function celestual_start_ig_verification(text, text) to anon, authenticated;

revoke all on function celestual_admin_overview() from anon, authenticated, public;
grant execute on function celestual_admin_overview() to service_role;
revoke all on function celestual_admin_clear_pending(text) from anon, authenticated, public;
grant execute on function celestual_admin_clear_pending(text) to service_role;
revoke all on function celestual_admin_verify_user(text) from anon, authenticated, public;
grant execute on function celestual_admin_verify_user(text) to service_role;
