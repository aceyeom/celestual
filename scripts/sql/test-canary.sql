-- ─────────────────────────────────────────────────────────────────────────────
-- test-canary.sql: exercises 0060_the_resolver_canary.sql.
--
-- The daily check opens a row, closes it with what Apify said, and is owed
-- again a day after one that passed and three hours after one that did not.
-- Only the service key's caller runs it whenever it likes. The desk reads a
-- state, the last check and the streak off the overview it already asks for.
-- Time is moved by moving `ran_at` back, which is all the functions read.
-- Run through scripts/verify-migrations.sh --test. Self contained, and it
-- leaves the table and the switch as it found them.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function cn_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- what was there before, put back at the end
create temp table cn_switch as
  select value from celestual_settings where key = 'resolver_enabled';
delete from celestual_settings where key = 'resolver_enabled';
delete from resolver_canary_runs;

-- every row the test opens is moved back in time by this much
create or replace function cn_age(p_by interval) returns void
language sql as $$
  update resolver_canary_runs set ran_at = ran_at - p_by,
         finished_at = case when finished_at is not null then finished_at - p_by end
$$;

-- ── 1. closed to the browser ────────────────────────────────────────────────
select cn_ok('the record is the service role''s alone',
  (select relrowsecurity from pg_class where relname = 'resolver_canary_runs')
  and not has_table_privilege('anon', 'resolver_canary_runs', 'SELECT')
  and not has_table_privilege('authenticated', 'resolver_canary_runs', 'SELECT')
  and not has_table_privilege('anon', 'resolver_canary_runs', 'INSERT'));
select cn_ok('and so is every function over it',
  not has_function_privilege('anon', 'resolver_canary_due()', 'EXECUTE')
  and not has_function_privilege('anon', 'resolver_canary_begin(boolean, text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'resolver_canary_begin(boolean, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'resolver_canary_finish(bigint, boolean, text, integer, integer, integer, boolean, jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'resolver_canary_status(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_overview()', 'EXECUTE')
  and has_function_privilege('service_role', 'resolver_canary_begin(boolean, text, text)', 'EXECUTE')
  and has_function_privilege('service_role', 'resolver_canary_status(integer)', 'EXECUTE'));

-- ── 2. never ────────────────────────────────────────────────────────────────
select cn_ok('with no check yet the state is never',
  resolver_canary_status()->>'state' = 'never'
  and resolver_canary_status()->'last' = 'null'::jsonb
  and resolver_canary_status()->'runs' = '[]'::jsonb
  and (resolver_canary_status()->>'fails')::int = 0);
select cn_ok('and one is owed', resolver_canary_due());

-- ── 3. the tick ─────────────────────────────────────────────────────────────
create temp table cn_ids (n int, id bigint);
insert into cn_ids select 1, (resolver_canary_begin(false, 'desk', '@Instagram')->>'id')::bigint;
select cn_ok('the tick opens a check when one is owed',
  (select id from cn_ids where n = 1) is not null);
select cn_ok('as the schedule, whatever it says it is, and on the handle as the resolver keys it',
  (select source = 'cron' and handle = 'instagram' and ok is null and status = 'running'
     from resolver_canary_runs where id = (select id from cn_ids where n = 1)));
select cn_ok('while it runs, nothing else is owed',
  not resolver_canary_due()
  and resolver_canary_begin(false, null, 'instagram')->>'error' = 'not_due');
select cn_ok('and the desk sees it running, with no answer yet',
  (resolver_canary_status()->>'running')::boolean
  and resolver_canary_status()->>'state' = 'never');

select cn_ok('it closes with what came back',
  (resolver_canary_finish((select id from cn_ids where n = 1), true, 'ok', 201, 8400, 1, true,
     '{"display_name": "Instagram", "verified": true, "actor": "shu8hvrXbJbY3Eb9W"}'::jsonb)
   ->'run'->>'status') = 'ok');
select cn_ok('and the desk reads it passed',
  resolver_canary_status()->>'state' = 'ok'
  and (resolver_canary_status()->'last'->>'ok')::boolean
  and (resolver_canary_status()->'last'->>'latency_ms')::int = 8400
  and resolver_canary_status()->'last'->'detail'->>'display_name' = 'Instagram'
  and not (resolver_canary_status()->>'running')::boolean);
select cn_ok('a closed check cannot be closed again',
  resolver_canary_finish((select id from cn_ids where n = 1), false, 'refused', 401, 1, 1, null, '{}')->>'error' = 'not_found');

-- ── 4. a day after one that passed ──────────────────────────────────────────
select cn_age('1 hour');
select cn_ok('an hour on, nothing is owed', not resolver_canary_due());
select cn_age('22 hours');
select cn_ok('nor at twenty three hours', not resolver_canary_due());
select cn_age('55 minutes');
select cn_ok('but on the same minute the next day, one is', resolver_canary_due());

-- ── 5. the desk, whenever it likes ──────────────────────────────────────────
insert into cn_ids select 2, (resolver_canary_begin(true, 'desk', 'instagram')->>'id')::bigint;
select cn_ok('the desk opens one, and it is the desk''s',
  (select source = 'desk' from resolver_canary_runs where id = (select id from cn_ids where n = 2)));
select cn_ok('one at a time', resolver_canary_begin(true, 'desk', 'instagram')->>'error' = 'running');

select cn_ok('a refusal closes it failed, with apify''s own status and words',
  (resolver_canary_finish((select id from cn_ids where n = 2), false, 'refused', 401, 612, 1, null,
     '{"said": "User was not found or authentication token is not valid", "type": "user-or-token-not-found", "actor": "shu8hvrXbJbY3Eb9W", "junk": "dropped"}'::jsonb)
   ->'run'->>'ok')::boolean = false);
select cn_ok('and only the keys the desk draws are kept',
  (select detail = '{"said": "User was not found or authentication token is not valid", "type": "user-or-token-not-found", "actor": "shu8hvrXbJbY3Eb9W"}'::jsonb
     from resolver_canary_runs where id = (select id from cn_ids where n = 2)));
select cn_ok('the desk reads it failing',
  resolver_canary_status()->>'state' = 'failing'
  and resolver_canary_status()->'last'->>'status' = 'refused'
  and (resolver_canary_status()->'last'->>'http_status')::int = 401
  and (resolver_canary_status()->>'fails')::int = 1
  and resolver_canary_status()->>'failing_since' is not null);
select cn_ok('and a minute apart at most', resolver_canary_begin(true, 'desk', 'instagram')->>'error' = 'too_soon');

-- ── 6. three hours after one that did not ───────────────────────────────────
select cn_age('2 hours');
select cn_ok('two hours on, nothing is owed', not resolver_canary_due());
select cn_age('1 hour');
select cn_ok('three hours on, one is', resolver_canary_due());
insert into cn_ids select 3, (resolver_canary_begin(false, null, 'instagram')->>'id')::bigint;
select resolver_canary_finish((select id from cn_ids where n = 3), false, 'timeout', null, 33000, 2, null,
  '{"said": "apify call timed out"}'::jsonb);
select cn_ok('two failures in a row are a streak of two, from the first',
  (resolver_canary_status()->>'fails')::int = 2
  and (resolver_canary_status()->>'failing_since')::timestamptz
      = (select ran_at from resolver_canary_runs where id = (select id from cn_ids where n = 2))
  and resolver_canary_status()->'last'->>'status' = 'timeout'
  and (resolver_canary_status()->'last'->>'attempts')::int = 2);
select cn_age('3 hours');
insert into cn_ids select 7, (resolver_canary_begin(false, null, 'instagram')->>'id')::bigint;
select cn_ok('an unknown answer is kept as an error, and never as a pass',
  (resolver_canary_finish((select id from cn_ids where n = 7), true, 'fine', 200, 10, 1, true, '[1, 2]'::jsonb)
   ->'run'->>'status') = 'error');
select cn_ok('and a detail that is not an object is kept as nothing',
  not (resolver_canary_status()->'last'->>'ok')::boolean
  and resolver_canary_status()->'last'->'detail' = '{}'::jsonb);

-- ── 7. a check that never finished ──────────────────────────────────────────
select cn_age('3 hours');
insert into cn_ids select 4, (resolver_canary_begin(false, null, 'instagram')->>'id')::bigint;
select cn_ok('a check open for under three minutes is running',
  (resolver_canary_status()->>'running')::boolean);
select cn_age('4 minutes');
select cn_ok('past three minutes it reads as one that did not finish',
  not (resolver_canary_status()->>'running')::boolean
  and resolver_canary_status()->'last'->>'status' = 'error'
  and resolver_canary_status()->'last'->'detail'->>'said' = 'the check did not finish'
  and (resolver_canary_status()->>'fails')::int = 4);
select cn_age('3 hours');
insert into cn_ids select 5, (resolver_canary_begin(false, null, 'instagram')->>'id')::bigint;
select cn_ok('and the next check to open closes it so',
  (select ok = false and status = 'error' and finished_at is not null
     from resolver_canary_runs where id = (select id from cn_ids where n = 4)));

-- ── 8. passing again ends the streak ────────────────────────────────────────
select resolver_canary_finish((select id from cn_ids where n = 5), true, 'ok', 201, 7100, 1, true, '{}');
select cn_ok('one pass and the state is ok again, with no streak',
  resolver_canary_status()->>'state' = 'ok'
  and (resolver_canary_status()->>'fails')::int = 0
  and resolver_canary_status()->'failing_since' = 'null'::jsonb);
select cn_ok('the latest runs come newest first, as many as asked',
  jsonb_array_length(resolver_canary_status(3)->'runs') = 3
  and (resolver_canary_status(3)->'runs'->0->>'id')::bigint = (select id from cn_ids where n = 5)
  and jsonb_array_length(resolver_canary_status(500)->'runs') = (select count(*)::int from resolver_canary_runs));

-- ── 9. stale ────────────────────────────────────────────────────────────────
select cn_age('37 hours');
select cn_ok('a pass thirty six hours old is stale', resolver_canary_status()->>'state' = 'stale');

-- ── 10. the switch ──────────────────────────────────────────────────────────
insert into celestual_settings (key, value) values ('resolver_enabled', 'false')
  on conflict (key) do update set value = excluded.value;
select cn_ok('with the resolver off nothing is owed', not resolver_canary_due());
select cn_ok('and the tick opens nothing',
  resolver_canary_begin(false, null, 'instagram')->>'error' = 'not_due');
select cn_ok('a stale check reads as paused',
  resolver_canary_status()->>'state' = 'paused'
  and not (resolver_canary_status()->>'enabled')::boolean);
insert into cn_ids select 6, (resolver_canary_begin(true, 'desk', 'instagram')->>'id')::bigint;
select resolver_canary_finish((select id from cn_ids where n = 6), false, 'off', null, null, 0, null, '{}');
select cn_ok('the desk can still check, and a failure stays a failure',
  resolver_canary_status()->>'state' = 'failing');
update celestual_settings set value = 'true' where key = 'resolver_enabled';

-- ── 11. ninety days ─────────────────────────────────────────────────────────
select cn_age('91 days');
select resolver_canary_begin(false, null, 'instagram');
select cn_ok('a check opened clears the rows past ninety days',
  (select count(*) from resolver_canary_runs) = 1);

-- ── 12. the overview ────────────────────────────────────────────────────────
select cn_ok('the desk''s overview carries the check',
  celestual_desk_overview() ? 'canary'
  and celestual_desk_overview()->'canary' ? 'state'
  and celestual_desk_overview()->'canary' ? 'runs');
select cn_ok('and still counts the flagged letters, as 0050 did',
  (celestual_desk_overview()->'counts' ? 'letters_flagged')
  and (celestual_desk_overview()->>'ok')::boolean);

-- ── the cleanup ─────────────────────────────────────────────────────────────
delete from resolver_canary_runs;
delete from celestual_settings where key = 'resolver_enabled';
insert into celestual_settings (key, value) select 'resolver_enabled', value from cn_switch;
select cn_ok('and it leaves the table and the switch as it found them',
  not exists (select 1 from resolver_canary_runs)
  and (select count(*) from celestual_settings where key = 'resolver_enabled') = (select count(*) from cn_switch));
drop function cn_age(interval);
drop function cn_ok(text, boolean);
