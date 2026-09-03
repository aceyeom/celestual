-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0034 · THE CAMPAIGN COMES DOWN                                      ║
-- ║  The First Light trial and the recruitment program, removed.         ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Phase 7. Spec section 10: "Delete the old marketing launch data and its UI."
-- Open question Q12, answered: the whole group. Group B in docs/deletions.md.
--
-- ── READ THIS BEFORE APPLYING ────────────────────────────────────────────────
-- Four rows in celestual_trial_emails and celestual_recruits belong to real
-- people who entered a competition. Supabase is on the free tier and has no
-- point in time recovery, so this drop is final.
--
-- docs/launchsteps.md section 2g carries the export step. Run it first. It is
-- two selects into a file and it is the only copy that will exist afterwards.
--
-- ── WHAT ALSO CHANGES, AND WHY IT HAS TO ─────────────────────────────────────
-- Two live functions read these tables and would break the moment they went:
--
--   celestual_admin_overview     returns `competitors`, and counts visits and
--                                signups. Redefined below without them.
--   celestual_admin_delete_user  deletes a person's recruit rows as part of
--                                erasing them. Redefined below without that.
--
-- celestual_erase_account and celestual_suppress used to do the same and no
-- longer do: 0023 rewrote both and dropped the recruit deletes on the way past.
-- They are untouched here.
--
-- ── AND THE ROUTE ────────────────────────────────────────────────────────────
-- celestual_trial_code_ok held the reserved four letter words, mirrored in the
-- browser by RESERVED_CODES. Both go. The bare four letter route matcher goes
-- with them, which breaks every competitor tracking link already printed or
-- sent in a DM. That was stated in Q12 and accepted with the answer.

-- ── the functions, first ─────────────────────────────────────────────────────
-- Before the tables, so nothing is left pointing at a relation that has gone.
drop function if exists celestual_trial_claim(text, text, text, text, text);
drop function if exists celestual_trial_login(text, text);
drop function if exists celestual_trial_check(text);
drop function if exists celestual_trial_code_ok(text);

drop function if exists celestual_recruit_attribute(text, text);
drop function if exists celestual_recruit_code();
drop function if exists celestual_recruit_invite(text, text, text);
drop function if exists celestual_recruit_open(text);
drop function if exists celestual_recruit_sign(text, text, text);
drop function if exists celestual_recruit_stats(text, text);
drop function if exists celestual_recruit_visit(text);

drop function if exists celestual_admin_delete_competitor(text);

-- ── celestual_admin_overview, without the competition ────────────────────────
-- The 0020 definition, with the competitors block, the two competitor fields on
-- each user row, the trial entries in the activity log, and the three campaign
-- counts removed. Everything else is byte for byte what it was: this is a
-- subtraction, not a rewrite, so a diff against 0020 shows only what the
-- campaign was.
--
-- `competitors` still comes back, as an empty array. A desk build older than
-- this migration renders a section with nothing in it rather than failing on a
-- missing key, and the new desk does not read it at all.
create or replace function celestual_admin_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_users jsonb;
  v_unverified jsonb;
  v_growth jsonb;
  v_logs jsonb;
begin
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
    'last_ping_at', (select max(e.created_at) from celestual_entries e where e.from_handle = m.handle)
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
    'competitors', '[]'::jsonb,
    'users', v_users,
    'unverified', v_unverified,
    'attempts', v_unverified,
    'growth', v_growth,
    'logs', v_logs,
    'counts', jsonb_build_object(
      'members',     (select count(*) from celestual_members),
      'assumed',     (select count(*) from celestual_ig_verifications
                       where verified_via = 'timeout' and status = 'verified'),
      'manual',      (select count(*) from celestual_ig_verifications
                       where verified_via = 'manual' and status = 'verified'),
      'banned',      (select count(*) from celestual_suppressions where kind = 'ban'),
      'opted_out',   (select count(*) from celestual_suppressions where kind = 'optout'),
      'suppressed',  (select count(*) from celestual_suppressions where kind = 'ban'),
      'unverified',  (select count(distinct v.handle) from celestual_ig_verifications v
                       where v.status = 'pending'
                         and not exists (select 1 from celestual_members m where m.handle = v.handle)),
      'pings',       (select count(*) from celestual_entries),
      'matches',     (select count(*) from celestual_matches),
      'new_7d',      (select count(*) from celestual_members
                       where first_verified_at > now() - interval '7 days'),
      'pings_7d',    (select count(*) from celestual_entries
                       where created_at > now() - interval '7 days')
    )
  );
end;
$$;

-- ── celestual_admin_delete_user, without the campaign rows ───────────────────
-- The 0023 definition with the four recruit deletes removed. Nothing else moves.
create or replace function celestual_admin_delete_user(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  hh := celestual_hash_handle(nh);

  perform celestual_dm_forget(nh);
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

  return jsonb_build_object('ok', true, 'handle', nh, 'erased', v_erased);
end;
$$;

-- ── the tables, last ─────────────────────────────────────────────────────────
-- Dependents before the thing they depend on, so no cascade is needed anywhere.
-- A cascade would drop whatever else happened to reference these, silently, and
-- silence is the one thing a destructive migration cannot afford.
drop table if exists celestual_recruit_signups;
drop table if exists celestual_recruit_visits;
drop table if exists celestual_recruits;
drop table if exists celestual_trial_emails;
