-- ─────────────────────────────────────────────────────────────────────────────
-- 0039_the_desk_second_sitting.sql
--
-- The desk, rebuilt for a team, and one door closed. Everything the desk at
-- /admin can do that it could not do before lands here, and each block says
-- what it is for. Re-runnable: every statement is create or replace, drop if
-- exists, alter if not exists, or guarded.
--
--   1  the opt out takes a proof
--   2  the settings, and the caps read from them
--   3  the resolver has a switch
--   4  growth, as a series
--   5  the pings, as a ledger the desk can read without reading the map
--   6  the sign in link: a browser signed in as a handle, a campus, or both
--   7  the campus, opened and closed from the desk
--   8  a name shut from the desk, and wall_write honouring it
--   9  the reports carry what a decision needs
--  10  the desk's log
--  11  the overview counts the pings
--
-- ── the one rule every function here follows ─────────────────────────────────
-- service_role and nothing else, for every desk function, and every one of
-- them reads the settings rather than a constant so that a change is a row and
-- not a deploy. The desk still does not write handle_verified_at: the sign in
-- link in block 6 mints a proof the way the mailed link does, and the browser
-- redeems it through celestual_user_bind_handle, which is the one writer.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the opt out takes a proof ──────────────────────────────────────────────
-- celestual_suppress took a handle and nothing else. That was chosen so a
-- person who never used the product could refuse it, and what it also meant
-- was that anybody could type any handle into /optout and make that handle
-- un-pingable for good, erasing every ping the owner had placed on the way.
-- The DM code proves a handle to anybody who holds the account, user or not,
-- so the opt out asks for the same proof placing a ping does. The rate limit
-- stays, and it counts refusals, so probing burns it at the same rate.
--
-- The proof the person just made created an identity row for them; it goes
-- with everything else, so opting out leaves nothing behind. The letters
-- written to the name on the wall are deliberately not touched: the wall has
-- its own takedown, and it is the subject's own control.
drop function if exists celestual_suppress(text);

create or replace function celestual_suppress(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
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

  -- The proof, before a single row is read. A refusal must look the same
  -- whether or not the handle was ever on the books.
  if not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('suppressed', null, 'error', 'unverified');
  end if;

  insert into celestual_suppressions (handle_hash, reason, kind)
  values (hh, 'asked never to be entered', 'optout')
  on conflict (handle_hash) do update set kind = 'optout', reason = 'asked never to be entered';

  perform celestual_dm_forget(nh);
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  delete from celestual_members where handle = nh;
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;
  perform celestual_billing_forget(nh);
  if to_regclass('public.celestual_email_identities') is not null then
    execute 'delete from celestual_email_identities where handle = $1' using nh;
  end if;
  if to_regclass('public.celestual_login_links') is not null then
    execute 'delete from celestual_login_links where handle = $1' using nh;
  end if;
  perform celestual_user_forget(nh);

  return jsonb_build_object('suppressed', nh);
end;
$$;

revoke all on function celestual_suppress(text, text) from public;
grant execute on function celestual_suppress(text, text) to anon, authenticated;

comment on function celestual_suppress(text, text) is
  '0039: the opt out, proof gated. One DM proves the handle to anybody who holds the account; without it nothing is read and nothing is said.';

-- ── 2. the settings, and the caps read from them ──────────────────────────────
-- celestual_settings has held two rows since 0004: the salt, which nothing
-- below may ever return, and the release gate. The desk reads and writes a
-- short whitelist of keys here, and the two functions that used to carry
-- their numbers as constants read them instead, so changing a cap is a row
-- the desk writes rather than a migration somebody deploys.
create or replace function celestual_setting(p_key text, p_default text)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select value from celestual_settings where key = p_key), p_default)
$$;

create or replace function celestual_setting_int(p_key text, p_default integer)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif(regexp_replace(celestual_setting(p_key, ''), '[^0-9]', '', 'g'), '')::integer,
    p_default)
$$;

revoke all on function celestual_setting(text, text)        from public, anon, authenticated;
revoke all on function celestual_setting_int(text, integer) from public, anon, authenticated;
grant execute on function celestual_setting(text, text)         to service_role;
grant execute on function celestual_setting_int(text, integer)  to service_role;

-- The keys the desk may touch, each with its shape and its default. The salt
-- is not on this list and cannot be added to it from the desk.
create or replace function celestual_desk_settings()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'ok', true,
    'settings', jsonb_build_object(
      'require_ig_verification', celestual_setting('require_ig_verification', 'false'),
      'resolver_enabled',        celestual_setting('resolver_enabled', 'true'),
      'cap_user',                celestual_setting_int('cap_user', 20),
      'cap_device',              celestual_setting_int('cap_device', 20),
      'cap_ip',                  celestual_setting_int('cap_ip', 200),
      'cap_global',              celestual_setting_int('cap_global', 1000)
    ),
    'defaults', jsonb_build_object(
      'require_ig_verification', 'false',
      'resolver_enabled', 'true',
      'cap_user', 20, 'cap_device', 20, 'cap_ip', 200, 'cap_global', 1000
    ),
    'updated', (
      select coalesce(jsonb_object_agg(key, updated_at), '{}'::jsonb)
        from celestual_settings
       where key in ('require_ig_verification', 'resolver_enabled',
                     'cap_user', 'cap_device', 'cap_ip', 'cap_global')
    )
  );
end;
$$;

create or replace function celestual_desk_setting_set(p_key text, p_value text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v text := btrim(coalesce(p_value, ''));
begin
  if p_key in ('require_ig_verification', 'resolver_enabled') then
    if v not in ('true', 'false') then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  elsif p_key in ('cap_user', 'cap_device', 'cap_ip', 'cap_global') then
    if v !~ '^[0-9]{1,6}$' then
      return jsonb_build_object('ok', false, 'error', 'bad_value');
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'bad_key');
  end if;

  insert into celestual_settings (key, value, updated_at) values (p_key, v, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();

  return jsonb_build_object('ok', true, 'key', p_key, 'value', v);
end;
$$;

revoke all on function celestual_desk_settings()               from public, anon, authenticated;
revoke all on function celestual_desk_setting_set(text, text)  from public, anon, authenticated;
grant execute on function celestual_desk_settings()                to service_role;
grant execute on function celestual_desk_setting_set(text, text)   to service_role;

-- The caps. 0037's numbers are the defaults; a row in the settings overrides
-- one. `stable` rather than `immutable` now, because it reads a table.
create or replace function handle_search_limit(p_key_type text)
returns integer
language sql stable security definer set search_path = public as $$
  select case p_key_type
           when 'user_id'   then celestual_setting_int('cap_user', 20)
           when 'device_id' then celestual_setting_int('cap_device', 20)
           when 'ip'        then celestual_setting_int('cap_ip', 200)
           when 'global'    then celestual_setting_int('cap_global', 1000)
         end
$$;

-- ── 3. the resolver has a switch ──────────────────────────────────────────────
-- The only way to stop Apify spending used to be to unset a secret and
-- redeploy a function. `resolver_enabled` is read on every call that would
-- reach the actor, in the same function that checks the caps, so the desk can
-- pause the meter from a phone. Cache hits still answer while it is off: they
-- cost nothing and the switch is about the bill.
create or replace function handle_search_allow(p_user uuid, p_device text, p_ip text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_since constant timestamptz := now() - interval '24 hours';
  r       record;
  v_worst integer := 0;
  v_kind  text;
begin
  if celestual_setting('resolver_enabled', 'true') <> 'true' then
    return jsonb_build_object('ok', false, 'off', true);
  end if;

  for r in
    select k.key_type, k.key_value from (
      values
        ('user_id',   case when p_user is not null then p_user::text end),
        ('device_id', case when p_user is null then nullif(p_device, '') end),
        ('ip',        nullif(p_ip, '')),
        ('global',    'all')
    ) as k(key_type, key_value)
     where k.key_value is not null
  loop
    declare
      v_n      bigint;
      v_oldest timestamptz;
      v_wait   integer;
    begin
      select count(*), min(created_at) into v_n, v_oldest
        from handle_search_events e
       where e.key_type = r.key_type and e.key_value = r.key_value and e.created_at >= v_since;

      if v_n >= handle_search_limit(r.key_type) then
        v_wait := greatest(1, ceil(extract(epoch from (v_oldest + interval '24 hours' - now())))::integer);
        if v_wait > v_worst then
          v_worst := v_wait;
          v_kind  := r.key_type;
        end if;
      end if;
    end;
  end loop;

  if v_worst > 0 then
    return jsonb_build_object('ok', false, 'retry_after', v_worst, 'key', v_kind);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 4. growth, as a series ────────────────────────────────────────────────────
-- One call, one series per thing that grows, bucketed by day, week or month
-- over the last N days (0 is everything). Each row carries the count in the
-- bucket and, for people, the running total at the bucket's end, so the desk
-- can draw either without a second call.
--
-- What it counts is what the schema keeps. Pings and mutuals are counted off
-- the live tables, and the sixty day purge takes lapsed pings with it, so
-- those two series only reach back as far as the purge lets them. Letters,
-- scans and people are kept for good and the series says the truth for the
-- whole range.
create or replace function celestual_desk_growth(p_days integer default 30, p_grain text default 'day')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_grain text := case when p_grain in ('day', 'week', 'month') then p_grain else 'day' end;
  v_step  interval := case v_grain when 'week' then interval '7 days'
                                   when 'month' then interval '1 month'
                                   else interval '1 day' end;
  v_days  integer := least(greatest(coalesce(p_days, 30), 0), 3650);
  v_first timestamptz;
  v_start timestamptz;
  v_end   timestamptz := date_trunc(v_grain, now());
  v_max   constant integer := 400;
  v_rows  jsonb;
  v_users_before   bigint;
  v_handles_before bigint;
begin
  if v_days = 0 then
    select least(
      coalesce((select min(created_at) from celestual_users), now()),
      coalesce((select min(created_at) from wall_letters), now()),
      coalesce((select min(created_at) from celestual_entries), now()),
      coalesce((select min(first_verified_at) from celestual_members), now())
    ) into v_first;
    v_start := date_trunc(v_grain, v_first);
  else
    v_start := date_trunc(v_grain, now() - (v_days || ' days')::interval);
  end if;

  -- Never more than v_max buckets, whatever was asked: a year of days is 365,
  -- three years of days is coarsened by the desk into weeks, and a request
  -- that ignores that is clamped rather than answered with ten thousand rows.
  if v_grain = 'day' and v_end - v_start > (v_max || ' days')::interval then
    v_start := v_end - (v_max || ' days')::interval;
  elsif v_grain = 'week' and v_end - v_start > (v_max * 7 || ' days')::interval then
    v_start := v_end - (v_max * 7 || ' days')::interval;
  end if;

  select count(*) into v_users_before from celestual_users
   where merged_into is null and created_at < v_start;
  select count(*) into v_handles_before from celestual_users
   where merged_into is null and handle_verified_at is not null and handle_verified_at < v_start;

  -- The running totals are window sums over the buckets, computed one layer
  -- down: a window function cannot sit inside the aggregate that builds the
  -- rows.
  select coalesce(jsonb_agg(jsonb_build_object(
    't', to_char(r.t0, 'YYYY-MM-DD'),
    'users',    r.users,
    'handles',  r.handles,
    'campuses', r.campuses,
    'pings',    r.pings,
    'mutuals',  r.mutuals,
    'letters',  r.letters,
    'scans',    r.scans,
    'users_total',   v_users_before + r.users_run,
    'handles_total', v_handles_before + r.handles_run
  ) order by r.t0), '[]'::jsonb)
  into v_rows
  from (
    select b.*,
           sum(b.users)   over (order by b.t0) as users_run,
           sum(b.handles) over (order by b.t0) as handles_run
      from (
        select g.t0,
               (select count(*) from celestual_users u
                 where u.merged_into is null and u.created_at >= g.t0 and u.created_at < g.t0 + v_step)::int as users,
               (select count(*) from celestual_users u
                 where u.merged_into is null and u.handle_verified_at >= g.t0
                   and u.handle_verified_at < g.t0 + v_step)::int as handles,
               (select count(*) from celestual_users u
                 where u.merged_into is null and u.edu_verified_at >= g.t0
                   and u.edu_verified_at < g.t0 + v_step)::int as campuses,
               (select count(*) from celestual_entries e
                 where e.created_at >= g.t0 and e.created_at < g.t0 + v_step)::int as pings,
               (select count(*) from celestual_matches m
                 where m.matched_at >= g.t0 and m.matched_at < g.t0 + v_step)::int as mutuals,
               (select count(*) from wall_letters l
                 where l.created_at >= g.t0 and l.created_at < g.t0 + v_step)::int as letters,
               (select count(*) from wall_scans s
                 where s.created_at >= g.t0 and s.created_at < g.t0 + v_step)::int as scans
          from generate_series(v_start, v_end, v_step) as g(t0)
      ) b
  ) r;

  return jsonb_build_object(
    'ok', true, 'grain', v_grain, 'days', v_days,
    'from', v_start, 'to', v_end + v_step,
    'rows', v_rows
  );
end;
$$;

revoke all on function celestual_desk_growth(integer, text) from public, anon, authenticated;
grant execute on function celestual_desk_growth(integer, text) to service_role;

-- ── 5. the pings, as a ledger ─────────────────────────────────────────────────
-- The desk had no view of the product's own object. This is it, and it is
-- shaped by docs/SECURITY.md rather than by what the table holds: a standing
-- ping is listed with who placed it, when, and how long it has left, and NOT
-- who it is on. The map of who wants whom is the thing this product exists to
-- keep, and a console that showed it would be the leak with a login on it.
-- A mutual names both sides, because both sides already know.
create or replace function celestual_desk_pings(
  p_state  text default null,
  p_query  text default null,
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_s   text := nullif(btrim(coalesce(p_state, '')), '');
  v_q   text := nullif(btrim(coalesce(p_query, '')), '');
  v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n bigint;
begin
  if v_s is not null and v_s not in ('standing', 'mutual', 'lapsed') then
    return jsonb_build_object('ok', false, 'error', 'bad_state');
  end if;
  if v_q is not null then v_q := lower(regexp_replace(v_q, '^@', '')); end if;

  select count(*) into v_n from celestual_entries e
   where (v_s is null
          or (v_s = 'standing' and e.matched_at is null and e.expires_at > now())
          or (v_s = 'mutual'   and e.matched_at is not null)
          or (v_s = 'lapsed'   and e.matched_at is null and e.expires_at <= now()))
     and (v_q is null or e.from_handle like '%' || v_q || '%'
          or (e.matched_at is not null and e.matched_handle like '%' || v_q || '%'));

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'from_handle', e.from_handle,
    'state', case when e.matched_at is not null then 'mutual'
                  when e.expires_at > now() then 'standing' else 'lapsed' end,
    'matched_handle', case when e.matched_at is not null then e.matched_handle end,
    'matched_at', e.matched_at,
    'created_at', e.created_at,
    'expires_at', e.expires_at,
    'days_left', greatest(0, ceil(extract(epoch from (e.expires_at - now())) / 86400))::int,
    'has_line', e.card is not null,
    'has_email', e.from_email is not null,
    'reminded', e.renew_notified_at is not null
  ) order by e.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from celestual_entries e2
     where (v_s is null
            or (v_s = 'standing' and e2.matched_at is null and e2.expires_at > now())
            or (v_s = 'mutual'   and e2.matched_at is not null)
            or (v_s = 'lapsed'   and e2.matched_at is null and e2.expires_at <= now()))
       and (v_q is null or e2.from_handle like '%' || v_q || '%'
            or (e2.matched_at is not null and e2.matched_handle like '%' || v_q || '%'))
     order by e2.created_at desc
     limit v_lim offset v_off
  ) e;

  return jsonb_build_object(
    'ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows,
    'counts', jsonb_build_object(
      'standing',   (select count(*) from celestual_entries where matched_at is null and expires_at > now()),
      'mutual',     (select count(*) from celestual_entries where matched_at is not null),
      'pairs',      (select count(*) from celestual_matches),
      'lapsed',     (select count(*) from celestual_entries where matched_at is null and expires_at <= now()),
      'placed_7d',  (select count(*) from celestual_entries where created_at > now() - interval '7 days'),
      'mutual_7d',  (select count(*) from celestual_matches where matched_at > now() - interval '7 days'),
      'lapsing_7d', (select count(*) from celestual_entries
                      where matched_at is null and expires_at > now()
                        and expires_at <= now() + interval '7 days'),
      'with_line',  (select count(*) from celestual_entries where card is not null),
      'senders',    (select count(distinct from_handle) from celestual_entries)
    )
  );
end;
$$;

revoke all on function celestual_desk_pings(text, text, integer, integer) from public, anon, authenticated;
grant execute on function celestual_desk_pings(text, text, integer, integer) to service_role;

-- ── 6. the sign in link ───────────────────────────────────────────────────────
-- A browser signed in as a handle, a campus address, or both, with no DM and
-- no mailed code. For the team: to see the product as a person sees it, to
-- test a flow on a phone, and to let a person in whose code never arrived.
--
-- It is built out of the two things the schema already trusts:
--
--   the handle    a row in celestual_login_links, which is the mailed sign in
--                 link's own table (0029). The desk mints the token, the
--                 browser redeems it through celestual_redeem_login for a
--                 thirty day proof, and then binds the identity row through
--                 celestual_user_bind_handle, the one writer. Single use, one
--                 hour, and marked so the records say the desk minted it.
--   the campus    a session token this function mints and binds through
--                 celestual_user_bind_edu, exactly as celestual-edu-verify
--                 does after its own code checks out. The browser adopts the
--                 token from the link and is that row.
--
-- Nothing here writes handle_verified_at, and nothing here is reachable
-- without the service key and the desk's password in front of it.
create or replace function celestual_desk_signin(
  p_handle    text default null,
  p_edu_email text default null,
  p_email     text default null,
  p_note      text default null
)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh  text := celestual_norm(p_handle);
  ne  text := nullif(lower(btrim(coalesce(p_edu_email, ''))), '');
  npe text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_login   text;
  v_session text;
  v_res     jsonb;
  c_ttl constant interval := interval '1 hour';
begin
  if nh is null and ne is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if nh is not null and celestual_is_banned(nh) then
    return jsonb_build_object('ok', false, 'error', 'banned');
  end if;
  if ne is not null and ne !~ '^[^@[:space:]]+@[^@[:space:]]+\.edu$' then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;

  if nh is not null then
    v_login := encode(gen_random_bytes(24), 'hex');
    insert into celestual_login_links (email, handle, token_hash, expires_at)
    values ('desk:' || coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'sign in link'),
            nh, encode(digest(v_login, 'sha256'), 'hex'), now() + c_ttl);
  end if;

  if ne is not null then
    v_session := encode(gen_random_bytes(32), 'hex');
    v_res := celestual_user_bind_edu(v_session, ne);
    if not coalesce((v_res->>'ok')::boolean, false) then
      return v_res;
    end if;
    if npe is not null then
      perform celestual_user_set_email(v_session, npe);
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'handle', nh,
    'edu_email', ne,
    'login_token', v_login,
    'session_token', v_session,
    'expires_at', now() + c_ttl
  );
end;
$$;

revoke all on function celestual_desk_signin(text, text, text, text) from public, anon, authenticated;
grant execute on function celestual_desk_signin(text, text, text, text) to service_role;

-- The redeem, re-emitted for two reasons. It was granted to service_role only,
-- and nothing in the product held that key on the path a browser takes to
-- /signin, so every mailed or minted link was refused at the door. The token
-- is a secret the way the DM proof's hash is a secret, single use and short,
-- and the function mints nothing without it, so the browser may call it. And
-- a link the desk minted stamps the verification 'desk', so the records say
-- how each person got in.
create or replace function celestual_redeem_login(p_token_hash text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_handle text;
  v_email  text;
  v_token  text;
  v_via    text;
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token_hash is null or p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  update celestual_login_links
     set used_at = now()
   where token_hash = lower(p_token_hash) and used_at is null and expires_at > now()
   returning handle, email into v_handle, v_email;
  if v_handle is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_via := case when v_email like 'desk:%' then 'desk' else 'email' end;
  v_token := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_via, verified_at, expires_at)
  values (v_handle, v_token, lower(p_proof_hash), 'verified', v_via || ':' || v_handle, v_via,
          now(), now() + c_session_ttl);

  insert into celestual_members (handle, handle_hash)
  values (v_handle, celestual_hash_handle(v_handle))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', v_handle, 'via', v_via);
end;
$$;

revoke all on function celestual_redeem_login(text, text) from public;
grant execute on function celestual_redeem_login(text, text) to anon, authenticated, service_role;

comment on function celestual_redeem_login(text, text) is
  '0039: browser callable. Trades a single use link token for a thirty day proof on the handle behind it; a desk minted link stamps the record desk.';

-- ── 7. the campus, from the desk ──────────────────────────────────────────────
-- wall_campuses.is_open was a column somebody edited in a SQL console. Opening
-- and closing a wall is an operator's decision and it lives with the other
-- operator's decisions now. Adding a campus is the same insert 0032 describes;
-- the client's own gate still names one domain, so a second campus is a row
-- here and a line in app/src/wall/auth.js, and the desk says so.
create or replace function celestual_desk_campus_set(p_slug text, p_open boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_c wall_campuses;
begin
  update wall_campuses set is_open = coalesce(p_open, false) where slug = p_slug
  returning * into v_c;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'slug', v_c.slug, 'is_open', v_c.is_open);
end;
$$;

create or replace function celestual_desk_campus_add(p_slug text, p_name text, p_domain text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_slug   text := lower(btrim(coalesce(p_slug, '')));
  v_name   text := btrim(coalesce(p_name, ''));
  v_domain text := lower(btrim(coalesce(p_domain, '')));
begin
  if v_slug !~ '^[a-z0-9-]{2,40}$' or v_name = '' or v_domain !~ '^[a-z0-9.-]+\.edu$' then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;
  insert into wall_campuses (slug, name, edu_domain, is_open)
  values (v_slug, left(v_name, 80), v_domain, false)
  on conflict (slug) do nothing;
  if not found then return jsonb_build_object('ok', false, 'error', 'exists'); end if;
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

revoke all on function celestual_desk_campus_set(text, boolean)     from public, anon, authenticated;
revoke all on function celestual_desk_campus_add(text, text, text)  from public, anon, authenticated;
grant execute on function celestual_desk_campus_set(text, boolean)      to service_role;
grant execute on function celestual_desk_campus_add(text, text, text)   to service_role;

-- ── 8. a name shut from the desk ──────────────────────────────────────────────
-- 0038 made "a name that has come off the wall stays off it" mean two things:
-- the subject took a letter down, or the desk upheld a report on one. There
-- was no way for the desk to shut a name on its own: a person writes in about
-- letters to their handle, and the desk could take each letter down and could
-- not stop the next one. This takes every letter to the name down and marks
-- them so wall_write refuses new ones; opening it again lifts the mark and
-- leaves the letters where they are, to be put back one at a time from the
-- wall tab if that is the decision.
create or replace function celestual_desk_name_shut(p_handle text, p_campus text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_n integer;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if not exists (select 1 from wall_campuses where slug = p_campus) then
    return jsonb_build_object('ok', false, 'error', 'campus');
  end if;
  update wall_letters
     set status = 'removed',
         moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
           'desk', jsonb_build_object(
             'status', 'removed',
             'note', nullif(btrim(coalesce(p_note, '')), ''),
             'via', 'desk_shut',
             'at', now()
           ))
   where target_handle = nh and campus = p_campus and status <> 'rejected';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'handle', nh, 'campus', p_campus, 'letters', v_n);
end;
$$;

create or replace function celestual_desk_name_open(p_handle text, p_campus text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_n integer;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  update wall_letters
     set moderation = coalesce(moderation, '{}'::jsonb) || jsonb_build_object(
           'desk', coalesce(moderation->'desk', '{}'::jsonb) || jsonb_build_object(
             'via', 'desk_reopened', 'reopened_at', now()))
   where target_handle = nh and campus = p_campus
     and moderation #>> '{desk,via}' = 'desk_shut';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'handle', nh, 'campus', p_campus, 'letters', v_n);
end;
$$;

revoke all on function celestual_desk_name_shut(text, text, text) from public, anon, authenticated;
revoke all on function celestual_desk_name_open(text, text)       from public, anon, authenticated;
grant execute on function celestual_desk_name_shut(text, text, text)  to service_role;
grant execute on function celestual_desk_name_open(text, text)        to service_role;

-- Whether a name is shut, said in one place, so wall_write and the desk's
-- report rows cannot disagree about it.
create or replace function wall_name_shut(p_handle text, p_campus text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from wall_letters l
     where l.target_handle = celestual_norm(p_handle) and l.campus = p_campus
       and l.status = 'removed'
       and (exists (select 1 from wall_claims c where c.letter_id = l.id)
            or exists (select 1 from wall_reports r where r.letter_id = l.id and r.status = 'upheld')
            or l.moderation #>> '{desk,via}' = 'desk_shut'))
$$;
revoke all on function wall_name_shut(text, text) from public, anon, authenticated;
grant execute on function wall_name_shut(text, text) to service_role;

-- wall_write, as 0038 wrote it, asking wall_name_shut.
create or replace function wall_write(
  p_token   text,
  p_target  text,
  p_body    text,
  p_seal    text,
  p_source  text,
  p_campus  text,
  p_status  text,
  p_moderation jsonb
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh   text := celestual_norm(p_target);
  v_me uuid := celestual_session_user(p_token);
  v_id uuid;
  v_source text := case when p_source ~ '^[a-z0-9_-]{1,32}$' then p_source end;
begin
  if nh is null or char_length(nh) < 3 then
    return jsonb_build_object('ok', false, 'error', 'handle');
  end if;
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;
  if p_status not in ('pending', 'live', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'status');
  end if;

  if not wall_gate(v_me, p_campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  if wall_name_shut(nh, p_campus) then
    return jsonb_build_object('ok', false, 'error', 'removed');
  end if;

  insert into wall_letters (target_handle, body, sealed_line, author_id, campus,
                            source_code, status, moderation)
  values (nh, left(btrim(p_body), 280), nullif(left(btrim(coalesce(p_seal, '')), 90), ''),
          v_me, p_campus, v_source, p_status, p_moderation)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', p_status);
end;
$$;

-- ── 9. the reports carry what a decision needs ────────────────────────────────
-- As 0033, plus three numbers a person deciding a report reaches for: how many
-- reports the reporter has filed, how many letters the author has written and
-- how many of those have been reported, and whether the name is shut.
create or replace function celestual_desk_reports(
  p_status text default 'open',
  p_limit  integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_s   text := nullif(btrim(coalesce(p_status, '')), '');
  v_lim integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n bigint;
begin
  if v_s is not null and v_s not in ('open', 'upheld', 'dismissed') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;

  select count(*) into v_n from wall_reports r where v_s is null or r.status = v_s;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'reason', r.reason,
    'resolution', r.resolution,
    'created_at', r.created_at,
    'resolved_at', r.resolved_at,
    'reporter_id', r.reporter_id,
    'reporter_handle', ru.instagram_handle,
    'reporter_campus', ru.edu_domain,
    'reporter_reports', (select count(*)::int from wall_reports r3 where r3.reporter_id = r.reporter_id),
    'letter_id', l.id,
    'letter_status', l.status,
    'letter_body', l.body,
    'letter_target', l.target_handle,
    'letter_campus', l.campus,
    'letter_created_at', l.created_at,
    'letter_moderation', l.moderation,
    'author_id', l.author_id,
    'author_handle', au.instagram_handle,
    'author_campus', au.edu_domain,
    'author_letters', (select count(*)::int from wall_letters l2 where l2.author_id = l.author_id),
    'author_reported', (select count(*)::int from wall_reports r4
                         join wall_letters l3 on l3.id = r4.letter_id
                        where l3.author_id = l.author_id),
    'letter_reports', (select count(*)::int from wall_reports r2 where r2.letter_id = l.id),
    'name_shut', wall_name_shut(l.target_handle, l.campus)
  ) order by r.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from wall_reports r2 where v_s is null or r2.status = v_s
     order by r2.created_at desc limit v_lim offset v_off
  ) r
  join wall_letters l on l.id = r.letter_id
  left join celestual_users ru on ru.id = r.reporter_id
  left join celestual_users au on au.id = l.author_id;

  return jsonb_build_object(
    'ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows,
    'counts', jsonb_build_object(
      'open',      (select count(*) from wall_reports where status = 'open'),
      'upheld',    (select count(*) from wall_reports where status = 'upheld'),
      'dismissed', (select count(*) from wall_reports where status = 'dismissed'),
      'reports_7d', (select count(*) from wall_reports where created_at > now() - interval '7 days')
    )
  );
end;
$$;

-- ── 10. the desk's log ────────────────────────────────────────────────────────
-- One shared password means the desk cannot say who did a thing. It can say
-- what was done and when, and that is the difference between a change
-- somebody can explain a week later and one nobody can. The edge function
-- writes a row after every write that went through; nothing on the client
-- can write one.
create table if not exists celestual_desk_log (
  id         bigserial   primary key,
  at         timestamptz not null default now(),
  action     text        not null,
  target     text,
  detail     jsonb,
  constraint celestual_desk_log_action_ck check (action ~ '^[a-z_]{1,48}$'),
  constraint celestual_desk_log_target_ck check (target is null or char_length(target) <= 200)
);
create index if not exists celestual_desk_log_at_idx on celestual_desk_log (at desc);
alter table celestual_desk_log enable row level security;
revoke all on celestual_desk_log from anon, authenticated;

create or replace function celestual_desk_log_add(p_action text, p_target text default null, p_detail jsonb default null)
returns void
language sql security definer set search_path = public as $$
  insert into celestual_desk_log (action, target, detail)
  values (left(regexp_replace(lower(coalesce(p_action, 'unknown')), '[^a-z_]', '_', 'g'), 48),
          nullif(left(coalesce(p_target, ''), 200), ''),
          p_detail);
$$;

create or replace function celestual_desk_log_list(p_limit integer default 100, p_offset integer default 0)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_lim integer := least(greatest(coalesce(p_limit, 100), 1), 500);
  v_off integer := greatest(coalesce(p_offset, 0), 0);
  v_rows jsonb;
  v_n bigint;
begin
  select count(*) into v_n from celestual_desk_log;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'at', l.at, 'action', l.action, 'target', l.target, 'detail', l.detail
  ) order by l.at desc, l.id desc), '[]'::jsonb)
  into v_rows
  from (select * from celestual_desk_log order by at desc, id desc limit v_lim offset v_off) l;
  return jsonb_build_object('ok', true, 'total', v_n, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
end;
$$;

revoke all on function celestual_desk_log_add(text, text, jsonb)    from public, anon, authenticated;
revoke all on function celestual_desk_log_list(integer, integer)    from public, anon, authenticated;
grant execute on function celestual_desk_log_add(text, text, jsonb)     to service_role;
grant execute on function celestual_desk_log_list(integer, integer)     to service_role;

-- ── 11. the overview counts the pings ─────────────────────────────────────────
-- As 0038, plus the product's own numbers, the settings the desk can change
-- and the switch, so the first screen can say whether the resolver is paused
-- without a second call.
create or replace function celestual_desk_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_limits    jsonb;
  v_conflicts jsonb;
  v_scans     jsonb;
  v_campuses  jsonb;
begin
  select coalesce(jsonb_agg(x order by x.spent desc), '[]'::jsonb) into v_limits
  from (
    select e.key_type,
           e.key_value,
           count(*)::int                                   as spent,
           handle_search_limit(e.key_type)                 as cap,
           greatest(0, handle_search_limit(e.key_type) - count(*))::int as remaining,
           min(e.created_at)                               as oldest,
           max(e.created_at)                               as newest,
           count(*) >= handle_search_limit(e.key_type)     as blocked
      from handle_search_events e
     where e.created_at >= now() - interval '24 hours'
     group by e.key_type, e.key_value
     order by count(*) desc
     limit 200
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'kind', c.kind, 'a_id', c.a_id, 'b_id', c.b_id,
    'detail', c.detail, 'created_at', c.created_at, 'resolved_at', c.resolved_at
  ) order by c.created_at desc), '[]'::jsonb)
  into v_conflicts
  from (select * from celestual_merge_conflicts order by created_at desc limit 100) c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'source_code', s.source_code, 'campus', s.campus,
    'scans', s.n, 'letters', coalesce(l.n, 0), 'last_at', s.last_at
  ) order by s.n desc), '[]'::jsonb)
  into v_scans
  from (select source_code, campus, count(*)::int as n, max(created_at) as last_at
          from wall_scans group by source_code, campus) s
  left join (select source_code, campus, count(*)::int as n
               from wall_letters where source_code is not null group by source_code, campus) l
    on l.source_code = s.source_code and l.campus = s.campus;

  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', c.slug, 'name', c.name, 'edu_domain', c.edu_domain, 'is_open', c.is_open,
    'letters', (select count(*)::int from wall_letters w where w.campus = c.slug and w.status = 'live'),
    'waitlist', (select count(*)::int from wall_waitlist w where w.campus = c.slug)
  ) order by c.slug), '[]'::jsonb)
  into v_campuses
  from wall_campuses c;

  return jsonb_build_object(
    'ok', true,
    'now', now(),
    'limits', v_limits,
    'conflicts', v_conflicts,
    'scans', v_scans,
    'campuses', v_campuses,
    'settings', jsonb_build_object(
      'require_ig_verification', celestual_setting('require_ig_verification', 'false') = 'true',
      'resolver_enabled',        celestual_setting('resolver_enabled', 'true') = 'true',
      'cap_global',              celestual_setting_int('cap_global', 1000)
    ),
    'counts', jsonb_build_object(
      'users',            (select count(*) from celestual_users where merged_into is null),
      'handle_verified',  (select count(*) from celestual_users
                            where merged_into is null and handle_verified_at is not null),
      'edu_verified',     (select count(*) from celestual_users
                            where merged_into is null and edu_verified_at is not null),
      'with_email',       (select count(*) from celestual_users
                            where merged_into is null and email is not null),
      'merged',           (select count(*) from celestual_users where merged_into is not null),
      'sessions_live',    (select count(*) from celestual_sessions where expires_at > now()),
      'users_7d',         (select count(*) from celestual_users
                            where merged_into is null and created_at > now() - interval '7 days'),
      'users_30d',        (select count(*) from celestual_users
                            where merged_into is null and created_at > now() - interval '30 days'),
      'members',          (select count(*) from celestual_members),

      'pings_standing',   (select count(*) from celestual_entries
                            where matched_at is null and expires_at > now()),
      'pings_mutual',     (select count(*) from celestual_entries where matched_at is not null),
      'pairs',            (select count(*) from celestual_matches),
      'pings_7d',         (select count(*) from celestual_entries
                            where created_at > now() - interval '7 days'),
      'mutuals_7d',       (select count(*) from celestual_matches
                            where matched_at > now() - interval '7 days'),
      'pings_lapsing_7d', (select count(*) from celestual_entries
                            where matched_at is null and expires_at > now()
                              and expires_at <= now() + interval '7 days'),
      'senders',          (select count(distinct from_handle) from celestual_entries),

      'letters',          (select count(*) from wall_letters),
      'letters_live',     (select count(*) from wall_letters where status = 'live'),
      'letters_pending',  (select count(*) from wall_letters where status = 'pending'),
      'letters_rejected', (select count(*) from wall_letters where status = 'rejected'),
      'letters_removed',  (select count(*) from wall_letters where status = 'removed'),
      'letters_7d',       (select count(*) from wall_letters
                            where created_at > now() - interval '7 days'),
      'claims',           (select count(*) from wall_claims),
      'asks_open',        (select count(*) from wall_reveal_requests where status = 'pending'),
      'revealed',         (select count(*) from wall_reveal_requests where status = 'revealed'),
      'waitlist',         (select count(*) from wall_waitlist),
      'scans',            (select count(*) from wall_scans),

      'reports_open',     (select count(*) from wall_reports where status = 'open'),
      'reports',          (select count(*) from wall_reports),
      'reports_7d',       (select count(*) from wall_reports
                            where created_at > now() - interval '7 days'),

      'profiles',         (select count(*) from ig_profiles),
      'profiles_faced',   (select count(*) from ig_profiles where avatar_path is not null),
      'profiles_stale',   (select count(*) from ig_profiles
                            where avatar_fetched_at is null
                               or avatar_fetched_at < now() - interval '30 days'),
      'searches_24h',     (select count(*) from handle_search_events
                            where key_type = 'global'
                              and created_at >= now() - interval '24 hours'),
      'searches_48h',     (select count(*) from handle_search_events
                            where key_type = 'global'
                              and created_at >= now() - interval '48 hours'),
      'conflicts_open',   (select count(*) from celestual_merge_conflicts where resolved_at is null),
      'desk_actions_7d',  (select count(*) from celestual_desk_log
                            where at > now() - interval '7 days')
    )
  );
end;
$$;

comment on function celestual_desk_overview() is
  '0039: the desk''s first screen. Counts, the caps, the conflicts, the flyers, the campuses, the settings.';
