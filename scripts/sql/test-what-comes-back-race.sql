-- ─────────────────────────────────────────────────────────────────────────────
-- test-what-comes-back-race.sql: 0075's settlement, met by a note sent again.
--
-- At nine on Saturday the clock job, every open phone and the person who
-- wants to send their note again ask in the same second. Two orders, through
-- dblink. A reveal holding the night open while the note is sent again: the
-- send waits for it, then goes out on the free ping the night has just given
-- back, and the night is settled once. And a note sent again that holds the
-- reveal itself (every placement runs it first) while the clock's reveal
-- asks: the clock waits, finds the night settled, and gives nothing twice.
-- Nobody deadlocks. Another session cannot see a transaction's rows, so
-- these are committed, and taken again at the end. Where dblink is not
-- installed nothing is run. Run through scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
select exists (select 1 from pg_available_extensions where name = 'dblink') as wc_dblink \gset
\if :wc_dblink
begin;
create extension if not exists dblink with schema extensions;

create or replace function wc_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- how many sessions wait on an advisory lock, given a few seconds to get there
create or replace function wc_waiting(p_n int) returns int
language plpgsql as $$
declare
  v int;
begin
  for i in 1..100 loop
    select count(*) into v from pg_locks where locktype = 'advisory' and not granted;
    exit when v >= p_n;
    perform pg_sleep(0.05);
  end loop;
  return v;
end; $$;

select format('host=%s port=%s dbname=%s user=%s',
              split_part(current_setting('unix_socket_directories'), ',', 1),
              current_setting('port'), current_database(), current_user) as wc_conn \gset
select dblink_connect(c, :'wc_conn') from unnest(array['wc_set', 'wc_one', 'wc_two']) c;
select dblink_exec(c, 'set lock_timeout = ''30s''') from unnest(array['wc_one', 'wc_two']) c;

-- Two people, each with a note that lapsed at a night an hour ago, its free
-- ping spent on that night and not settled yet.
select (now() - interval '1 hour')::text as wc_night \gset
select dblink_exec('wc_set', $sql$
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  select h, '0000', encode(extensions.digest('proof-' || h, 'sha256'), 'hex'),
         'verified', 'igsid-' || h, now(), now() + interval '30 days'
    from unnest(array['wc_a', 'wc_b']) h
$sql$);
select dblink_exec('wc_set', format($sql$
  insert into celestual_entries (from_handle, to_hash, to_handle, expires_at, created_at)
  select h, celestual_hash_handle(h || 't'), h || 't', %1$L::timestamptz, %1$L::timestamptz - interval '3 days'
    from unnest(array['wc_a', 'wc_b']) h
$sql$, :'wc_night'));
select dblink_exec('wc_set', format($sql$
  insert into celestual_ping_spends (handle, to_hash, reveal_at, kind, created_at)
  select h, celestual_hash_handle(h || 't'), %1$L::timestamptz, 'free', %1$L::timestamptz - interval '3 days'
    from unnest(array['wc_a', 'wc_b']) h
$sql$, :'wc_night'));

-- ── the clock's reveal first, the note sent again behind it ──
select dblink_exec('wc_one', 'begin');
select wc_ok('one session runs the reveal, which settles the night, and holds it open',
  (select n from dblink('wc_one', 'select celestual_reveal_due()') as t(n int)) = 0
  and (select n from dblink('wc_one', $q$select count(*)::int from celestual_ping_extras where handle = 'wc_a'$q$) as t(n int)) = 1);
select dblink_send_query('wc_two', $sql$select celestual_submit('wc_a', 'wc_at', null, 'proof-wc_a', null)::text$sql$);
select wc_ok('the note sent again meanwhile waits for it',
  wc_waiting(1) >= 1 and dblink_is_busy('wc_two') = 1);
select dblink_exec('wc_one', 'commit');
create temp table wc_again as select r::jsonb as r from dblink_get_result('wc_two') as t(r text);
select * from dblink_get_result('wc_two') as t(r text);
select wc_ok('and then goes out on a free ping, the extra the night gave back beside it',
  ((select r from wc_again)->>'recorded')::boolean
  and ((select r from wc_again)->'allowance'->>'extra')::int = 1
  and ((select r from wc_again)->'allowance'->>'free_left')::int = 1
  and ((select r from wc_again)->'allowance'->>'sent')::int = 1
  and (select kind from celestual_ping_spends where handle = 'wc_a' and settled_at is null) = 'free');
select wc_ok('the night was settled once, as one extra, and nothing more was given',
  (select count(*) from celestual_ping_extras where handle = 'wc_a') = 1
  and (select count(*) from celestual_ping_spends where handle = 'wc_a' and returned = 'extra') = 1
  and (select count(*) from celestual_ping_spends where handle = 'wc_a') = 2);

-- ── the note sent again first, holding the reveal, and the clock behind it ──
-- (the first reveal settled wc_b's night too; it is put back unsettled, as
-- if the clock had not come yet, so this order is its own)
select dblink_exec('wc_set', $sql$
  update celestual_ping_spends set settled_at = null, returned = null where handle = 'wc_b'
$sql$);
select dblink_exec('wc_set', $sql$delete from celestual_ping_extras where handle = 'wc_b'$sql$);
select dblink_exec('wc_one', 'begin');
create temp table wc_first as
  select r::jsonb as r from dblink('wc_one', $sql$select celestual_submit('wc_b', 'wc_bt', null, 'proof-wc_b', null)::text$sql$) as t(r text);
select wc_ok('a note sent again runs the reveal itself, settles the night, and spends the free ping it gave back',
  ((select r from wc_first)->>'recorded')::boolean
  and ((select r from wc_first)->'allowance'->>'extra')::int = 1
  and ((select r from wc_first)->'allowance'->>'free_left')::int = 1);
select dblink_send_query('wc_two', 'select celestual_reveal_due()');
select wc_ok('the clock''s reveal that comes meanwhile waits for it',
  wc_waiting(1) >= 1 and dblink_is_busy('wc_two') = 1);
select dblink_exec('wc_one', 'commit');
create temp table wc_clock as select n from dblink_get_result('wc_two') as t(n int);
select * from dblink_get_result('wc_two') as t(n int);
select wc_ok('and finds the night settled, gives nothing twice, and nobody deadlocked',
  (select n from wc_clock) = 0
  and (select count(*) from celestual_ping_extras where handle = 'wc_b') = 1
  and (select count(*) from celestual_ping_spends where handle = 'wc_b' and returned = 'extra') = 1
  and (select count(*) from celestual_ping_spends where handle = 'wc_b' and settled_at is null and kind = 'free') = 1);

select dblink_exec('wc_set', $sql$delete from celestual_entries where from_handle like 'wc\_%'$sql$);
select dblink_exec('wc_set', $sql$delete from celestual_ping_spends where handle like 'wc\_%'$sql$);
select dblink_exec('wc_set', $sql$delete from celestual_ping_extras where handle like 'wc\_%'$sql$);
select dblink_exec('wc_set', $sql$delete from celestual_entitlements where handle like 'wc\_%'$sql$);
select dblink_exec('wc_set', $sql$delete from celestual_attempts where from_handle like 'wc\_%'$sql$);
select dblink_exec('wc_set', $sql$delete from celestual_placements where handle like 'wc\_%'$sql$);
select dblink_exec('wc_set', $sql$delete from celestual_ig_verifications where handle like 'wc\_%'$sql$);
select dblink_disconnect(c) from unnest(array['wc_set', 'wc_one', 'wc_two']) c;
rollback;
\else
\echo 'dblink is not installed here, so the race is not run'
\endif
