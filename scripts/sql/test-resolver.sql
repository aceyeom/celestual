-- ─────────────────────────────────────────────────────────────────────────────
-- test-resolver.sql: exercises 0031_apify_resolver.sql against a local database.
--
-- The caps decide the Apify bill and the profiles cache is now permanent, so
-- both are tested rather than reasoned about. Run through
-- scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function r_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- ── 1. the limits are what spec section 5 says ──────────────────────────────
select r_ok('signed in is 20',   handle_search_limit('user_id')   = 20);
select r_ok('anonymous is 20',   handle_search_limit('device_id') = 20);
select r_ok('the address is 200', handle_search_limit('ip')       = 200);

-- ── 2. the cache ────────────────────────────────────────────────────────────
select r_ok('an unknown handle reads as nothing', ig_profile_get('nobody') is null);

select ig_profile_put('@Ada', 'Ada Lovelace', true, false, false);
select r_ok('put normalises the handle', (ig_profile_get('ada')->>'handle') = 'ada');
select r_ok('the name is kept',      (ig_profile_get('ada')->>'display_name') = 'Ada Lovelace');
select r_ok('the badge is kept',     (ig_profile_get('ada')->>'is_verified')::boolean);
select r_ok('a failed download stores no path', (ig_profile_get('ada')->>'avatar_path') is null);
-- 0037, the leak: a fresh profile with no face is a cache hit, not a stale row.
-- Under 0031 it was stale forever, and every lookup of it paid Apify again.
select r_ok('a face we never got does not make a fresh row stale',
  (ig_profile_get('ada')->>'avatar_stale')::boolean = false);
update ig_profiles set resolved_at = now() - interval '8 days' where handle = 'ada';
select r_ok('a face-less row is retried after a week',
  (ig_profile_get('ada')->>'avatar_stale')::boolean);
update ig_profiles set resolved_at = now() - interval '6 days' where handle = 'ada';
select r_ok('and not before',
  (ig_profile_get('ada')->>'avatar_stale')::boolean = false);

select ig_profile_put('ada', 'Ada Lovelace', true, false, true);
select r_ok('a good download stores the path',
  (ig_profile_get('ada')->>'avatar_path') = 'ig/ada.jpg');
select r_ok('a fresh picture is not stale',
  (ig_profile_get('ada')->>'avatar_stale')::boolean = false);

-- Spec section 5: a failed download stores nothing and leaves what was there.
select ig_profile_put('ada', 'Ada L', true, false, false);
select r_ok('a later failed download keeps yesterday''s face',
  (ig_profile_get('ada')->>'avatar_path') = 'ig/ada.jpg');
select r_ok('but the metadata still updates',
  (ig_profile_get('ada')->>'display_name') = 'Ada L');

update ig_profiles set avatar_fetched_at = now() - interval '31 days' where handle = 'ada';
select r_ok('a picture is stale at thirty days',
  (ig_profile_get('ada')->>'avatar_stale')::boolean);
update ig_profiles set avatar_fetched_at = now() - interval '29 days' where handle = 'ada';
select r_ok('and not at twenty nine',
  (ig_profile_get('ada')->>'avatar_stale')::boolean = false);
-- A row with a picture is judged on the picture alone, however old the profile.
update ig_profiles set resolved_at = now() - interval '90 days' where handle = 'ada';
select r_ok('an old profile with a fresh picture is not stale',
  (ig_profile_get('ada')->>'avatar_stale')::boolean = false);

-- The path is constrained to the handle it belongs to, so one profile can never
-- point at another profile's picture.
do $$ begin
  begin
    update ig_profiles set avatar_path = 'ig/someone-else.jpg' where handle = 'ada';
    raise exception 'FAIL  a profile pointed at another handle''s picture';
  exception when check_violation then raise notice 'PASS  a profile cannot point at another handle''s picture';
  end;
  begin
    insert into ig_profiles (handle) values ('Shouty');
    raise exception 'FAIL  a non-normalised handle was accepted';
  exception when check_violation then raise notice 'PASS  a non-normalised handle is refused';
  end;
end $$;

-- ── 3. the caps ─────────────────────────────────────────────────────────────
select r_ok('the day has a ceiling', handle_search_limit('global') = 1000);
select r_ok('a fresh device may ask',
  (handle_search_allow(null, 'dev-1', '10.0.0.1')->>'ok')::boolean);

-- Every call writes the global row too, whoever made it.
select handle_search_record(null, 'dev-0', '10.0.0.0', 'first');
select r_ok('a call is counted on the day',
  (select count(*) = 1 from handle_search_events where key_type = 'global' and key_value = 'all'));
delete from handle_search_events where key_value = 'dev-0' or key_value = '10.0.0.0' or handle = 'first';

-- Nineteen calls. Still under.
do $$ begin
  for i in 1..19 loop
    perform handle_search_record(null, 'dev-1', '10.0.0.1', 'h' || i);
  end loop;
end $$;
select r_ok('nineteen calls is still under', (handle_search_allow(null, 'dev-1', '10.0.0.1')->>'ok')::boolean);

select handle_search_record(null, 'dev-1', '10.0.0.1', 'h20');
select r_ok('twenty is the limit', (handle_search_allow(null, 'dev-1', '10.0.0.1')->>'ok')::boolean = false);
select r_ok('the refusal names the key',
  (handle_search_allow(null, 'dev-1', '10.0.0.1')->>'key') = 'device_id');
select r_ok('and says how long to wait',
  (handle_search_allow(null, 'dev-1', '10.0.0.1')->>'retry_after')::int between 1 and 86400);

-- A different device is unaffected, but shares the address, which is still
-- far under 200.
select r_ok('another device on the same address may still ask',
  (handle_search_allow(null, 'dev-2', '10.0.0.1')->>'ok')::boolean);

-- The window rolls. Age the rows past 24 hours and the device is free again.
update handle_search_events set created_at = now() - interval '25 hours'
 where key_type = 'device_id' and key_value = 'dev-1';
select r_ok('the window rolls', (handle_search_allow(null, 'dev-1', '10.0.0.1')->>'ok')::boolean);

-- ── 4. signed in is counted on the person, not the device ───────────────────
do $$
declare u uuid;
begin
  insert into celestual_users (email) values ('capped@example.com') returning id into u;
  for i in 1..20 loop
    perform handle_search_record(u, 'dev-3', '10.0.0.2', 'x' || i);
  end loop;
  if (handle_search_allow(u, 'dev-3', '10.0.0.2')->>'ok')::boolean then
    raise exception 'FAIL  a signed in person was not capped';
  end if;
  raise notice 'PASS  a signed in person is capped on their own id';

  -- The same browser, signed out, is untouched: nothing was ever written
  -- against the device while the person was signed in.
  if not (handle_search_allow(null, 'dev-3', '10.0.0.2')->>'ok')::boolean then
    raise exception 'FAIL  signing in also spent the device allowance';
  end if;
  raise notice 'PASS  signing in does not spend the device allowance';

  if exists (select 1 from handle_search_events
              where key_type = 'device_id' and key_value = 'dev-3') then
    raise exception 'FAIL  a signed in call was recorded against the device too';
  end if;
  raise notice 'PASS  a signed in call writes no device row';
end $$;

-- ── 5. the address is the backstop ──────────────────────────────────────────
do $$ begin
  for i in 1..200 loop
    perform handle_search_record(null, 'dev-' || i, '10.0.0.9', 'y' || i);
  end loop;
end $$;
select r_ok('the address caps at 200',
  (handle_search_allow(null, 'dev-fresh', '10.0.0.9')->>'ok')::boolean = false);
select r_ok('and the refusal names the address',
  (handle_search_allow(null, 'dev-fresh', '10.0.0.9')->>'key') = 'ip');

-- ── 5b. the ceiling ─────────────────────────────────────────────────────────
-- Fill the day from many devices on many addresses, none of them near their
-- own cap, and the next one is refused on the day and not on the person.
do $$ begin
  delete from handle_search_events;
  for i in 1..1000 loop
    perform handle_search_record(null, 'g-' || i, '10.1.' || (i / 250) || '.' || (i % 250), 'z' || i);
  end loop;
end $$;
select r_ok('the day caps at a thousand calls',
  (handle_search_allow(null, 'g-fresh', '10.2.0.1')->>'ok')::boolean = false);
select r_ok('and the refusal names the day',
  (handle_search_allow(null, 'g-fresh', '10.2.0.1')->>'key') = 'global');
select r_ok('a signed in person is refused on the day too',
  (handle_search_allow(gen_random_uuid(), null, null)->>'ok')::boolean = false);
update handle_search_events set created_at = now() - interval '25 hours' where key_type = 'global';
select r_ok('the day rolls',
  (handle_search_allow(null, 'g-fresh', '10.2.0.1')->>'ok')::boolean);
do $$ begin
  delete from handle_search_events;
  for i in 1..200 loop
    perform handle_search_record(null, 'dev-' || i, '10.0.0.9', 'y' || i);
  end loop;
end $$;

-- ── 6. the prune ────────────────────────────────────────────────────────────
select r_ok('rows inside 48 hours survive the prune',
  (select handle_search_prune()) >= 0);
update handle_search_events set created_at = now() - interval '49 hours' where key_value = '10.0.0.9';
select r_ok('rows past 48 hours are pruned', handle_search_prune() > 0);
select r_ok('nothing older than 48 hours is left',
  (select count(*) = 0 from handle_search_events where created_at < now() - interval '48 hours'));

-- ── 7. nothing the browser can reach ────────────────────────────────────────
select r_ok('anon cannot read the profiles',
  not has_table_privilege('anon', 'ig_profiles', 'SELECT'));
select r_ok('anon cannot read the ledger',
  not has_table_privilege('anon', 'handle_search_events', 'SELECT'));
select r_ok('anon cannot call the cap check',
  not has_function_privilege('anon', 'handle_search_allow(uuid, text, text)', 'EXECUTE'));
select r_ok('anon cannot write a profile',
  not has_function_privilege('anon', 'ig_profile_put(text, text, boolean, boolean, boolean)', 'EXECUTE'));
select r_ok('the service role can',
  has_function_privilege('service_role', 'handle_search_allow(uuid, text, text)', 'EXECUTE'));

-- ── 8. the old counter table is gone ────────────────────────────────────────
select r_ok('celestual_handle_lookups is dropped',
  to_regclass('public.celestual_handle_lookups') is null);
select r_ok('celestual_handle_cache is left standing for now',
  to_regclass('public.celestual_handle_cache') is not null);
