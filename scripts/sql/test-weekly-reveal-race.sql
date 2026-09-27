-- ─────────────────────────────────────────────────────────────────────────────
-- test-weekly-reveal-race.sql: 0069's reveal, asked for from three sessions
-- at once.
--
-- At nine on Saturday the clock job and every open phone ask in the same
-- second. One session here holds a reveal open while two more ask, through
-- dblink: the read waits for the reveal and then finds the pair mutual,
-- rather than passing its rows by and reading "not this time", and the second
-- reveal waits too, finds nothing left, and deadlocks with nobody. Another
-- session cannot see a transaction's rows, so unlike the other tests these
-- are committed, and taken again at the end. Where dblink is not installed
-- nothing is run. Run through scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
select exists (select 1 from pg_available_extensions where name = 'dblink') as wx_dblink \gset
\if :wx_dblink
begin;
create extension if not exists dblink with schema extensions;

create or replace function wx_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- how many sessions wait on an advisory lock, given a few seconds to get there
create or replace function wx_waiting(p_n int) returns int
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
              current_setting('port'), current_database(), current_user) as wx_conn \gset
select dblink_connect(c, :'wx_conn') from unnest(array['wx_set', 'wx_one', 'wx_two', 'wx_three']) c;
select dblink_exec(c, 'set lock_timeout = ''30s''') from unnest(array['wx_one', 'wx_two', 'wx_three']) c;

-- twelve pairs sealed a second apart, more than a cursor fetches at once,
-- their night come
select dblink_exec('wx_set', $sql$
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values ('wx_1b', '0000', encode(extensions.digest('proof-wx_1b', 'sha256'), 'hex'),
          'verified', 'igsid-wx_1b', now(), now() + interval '30 days')
$sql$);
select dblink_exec('wx_set', $sql$
  with p as (
    select i, gen_random_uuid() as x, gen_random_uuid() as y,
           now() - interval '3 days' + i * interval '1 second' as sealed
      from generate_series(1, 12) i)
  insert into celestual_entries (id, from_handle, to_hash, to_handle, card, expires_at, sealed_with, sealed_at, reveal_at)
  select x, 'wx_' || i || 'a', celestual_hash_handle('wx_' || i || 'b'), 'wx_' || i || 'b',
         '{"words":"the library, third floor"}'::jsonb, now() - interval '1 second', y, sealed, now() - interval '1 second'
    from p
  union all
  select y, 'wx_' || i || 'b', celestual_hash_handle('wx_' || i || 'a'), 'wx_' || i || 'a',
         null, now() - interval '1 second', x, sealed, now() - interval '1 second'
    from p
$sql$);

select dblink_exec('wx_one', 'begin');
select wx_ok('one session runs the reveal and holds it open',
  (select n from dblink('wx_one', 'select celestual_reveal_due()') as t(n int)) = 12);
select dblink_send_query('wx_two', $sql$select celestual_my_pings('wx_1b', 'proof-wx_1b')::text$sql$);
select dblink_send_query('wx_three', 'select celestual_reveal_due()');
select wx_ok('a read and a second reveal that come meanwhile wait for it, rather than pass its rows by',
  wx_waiting(2) = 2 and dblink_is_busy('wx_two') = 1 and dblink_is_busy('wx_three') = 1);
select dblink_exec('wx_one', 'commit');

create temp table wx_read as select r::jsonb as r from dblink_get_result('wx_two') as t(r text);
create temp table wx_second as select n from dblink_get_result('wx_three') as t(n int);
select wx_ok('the read then finds the pair mutual, not lapsed, with the other side''s words',
  (select count(*) = 1 and bool_and((x->>'mutual')::boolean and not (x->>'lapsed')::boolean
                                    and x->'their_card'->>'words' = 'the library, third floor')
     from wx_read, jsonb_array_elements(r->'pings') x where x->>'handle' = 'wx_1a'));
select wx_ok('the second reveal finds nothing left, and nobody deadlocked',
  (select n from wx_second) = 0);
select wx_ok('every pair is told, once',
  (select count(*) from celestual_entries
    where from_handle like 'wx\_%' and matched_at is not null and sealed_with is null) = 24
  and (select count(*) from celestual_matches where handle_a like 'wx\_%') = 12);

-- a connection that sent a query asynchronously is free again only once its
-- result has been read to the empty one after it
select * from dblink_get_result('wx_two') as t(r text);
select * from dblink_get_result('wx_three') as t(n int);

-- ── the same person placing and reading behind a running reveal ──
-- with the proof asked for, as it is in production: every door takes the
-- proof's row and then the reveal's lock, in that order, so a placement and
-- a read by one person queued behind a reveal never hold what the other
-- waits for
select dblink_exec('wx_set', $sql$
  insert into celestual_settings (key, value) values ('require_ig_verification', 'true')
  on conflict (key) do update set value = 'true'
$sql$);
select dblink_exec('wx_set', $sql$
  insert into celestual_entries (id, from_handle, to_hash, to_handle, expires_at, sealed_with, sealed_at, reveal_at)
  values ('00000000-0000-4000-8000-00000000a001', 'wx_1b', celestual_hash_handle('wx_z'), 'wx_z',
          now() - interval '1 second', '00000000-0000-4000-8000-00000000a002', now() - interval '1 day', now() - interval '1 second'),
         ('00000000-0000-4000-8000-00000000a002', 'wx_z', celestual_hash_handle('wx_1b'), 'wx_1b',
          now() - interval '1 second', '00000000-0000-4000-8000-00000000a001', now() - interval '1 day', now() - interval '1 second')
$sql$);
select dblink_exec('wx_one', 'begin');
select wx_ok('a reveal is held open again',
  (select n from dblink('wx_one', 'select celestual_reveal_due()') as t(n int)) = 1);
select dblink_send_query('wx_two', $sql$select celestual_submit('wx_1b', 'wx_y', null, 'proof-wx_1b', null)::text$sql$);
select pg_sleep(0.2);
select dblink_send_query('wx_three', $sql$select celestual_my_pings('wx_1b', 'proof-wx_1b')::text$sql$);
-- the placement waits on the reveal's lock, and the read on the placement's
-- proof: one order, so nobody holds what the other is waiting for
select wx_ok('the placement and the read by the same person both wait',
  wx_waiting(1) >= 1 and dblink_is_busy('wx_two') = 1 and dblink_is_busy('wx_three') = 1);
select dblink_exec('wx_one', 'commit');
create temp table wx_place as select r::jsonb as r from dblink_get_result('wx_two') as t(r text);
create temp table wx_list as select r::jsonb as r from dblink_get_result('wx_three') as t(r text);
select wx_ok('and both are answered, with nobody deadlocked',
  ((select r from wx_place)->>'recorded')::boolean and ((select r from wx_list)->>'ok')::boolean);
select dblink_exec('wx_set', $sql$update celestual_settings set value = 'false' where key = 'require_ig_verification'$sql$);

select dblink_exec('wx_set', $sql$delete from celestual_matches where handle_a like 'wx\_%' or handle_b like 'wx\_%'$sql$);
select dblink_exec('wx_set', $sql$delete from celestual_entries where from_handle like 'wx\_%'$sql$);
select dblink_exec('wx_set', $sql$delete from celestual_ping_spends where handle like 'wx\_%'$sql$);
select dblink_exec('wx_set', $sql$delete from celestual_ig_verifications where handle like 'wx\_%'$sql$);
select dblink_disconnect(c) from unnest(array['wx_set', 'wx_one', 'wx_two', 'wx_three']) c;
rollback;
\else
\echo 'dblink is not installed here, so the race is not run'
\endif
