-- ─────────────────────────────────────────────────────────────────────────────
-- test-mutual-kept-race.sql: 0072's keeping, while the other side places.
--
-- One session writes again to somebody it is mutual with and holds the
-- transaction open, with the pair kept and the new note placed; the other
-- side, in the same moment, places on the pair the ordinary way. Their
-- placement waits for the keeping, and then answers as the told pair it was,
-- from the keepsake it became: it's mutual, the words they were told, nothing
-- spent and nothing written. Without the wait it would have found its told
-- row gone under it and written a new note nobody paid for, sealed to the new
-- one, and answered "not mutual", which is the one thing the other side must
-- never be told. Another session cannot see a transaction's rows, so these
-- are committed and taken again at the end. Where dblink is not installed
-- nothing is run. Run through scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
select exists (select 1 from pg_available_extensions where name = 'dblink') as kx_dblink \gset
\if :kx_dblink
begin;
create extension if not exists dblink with schema extensions;

create or replace function kx_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- how many sessions wait on a row, given a few seconds to get there
create or replace function kx_waiting(p_n int) returns int
language plpgsql as $$
declare
  v int;
begin
  for i in 1..100 loop
    select count(*) into v from pg_locks where locktype in ('transactionid', 'tuple') and not granted;
    exit when v >= p_n;
    perform pg_sleep(0.05);
  end loop;
  return v;
end; $$;

select format('host=%s port=%s dbname=%s user=%s',
              split_part(current_setting('unix_socket_directories'), ',', 1),
              current_setting('port'), current_database(), current_user) as kx_conn \gset
select dblink_connect(c, :'kx_conn') from unnest(array['kx_set', 'kx_one', 'kx_two']) c;
select dblink_exec(c, 'set lock_timeout = ''30s''') from unnest(array['kx_one', 'kx_two']) c;

-- a pair told three nights ago, with its match row
select dblink_exec('kx_set', $sql$
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  select h, '0000', encode(extensions.digest('proof-' || h, 'sha256'), 'hex'),
         'verified', 'igsid-' || h, now(), now() + interval '30 days'
    from unnest(array['kx_a', 'kx_b']) h
$sql$);
select dblink_exec('kx_set', $sql$
  insert into celestual_entries (from_handle, to_hash, to_handle, card, expires_at, matched_at, matched_handle)
  values ('kx_a', celestual_hash_handle('kx_b'), 'kx_b', '{"words":"the window seat, always"}'::jsonb,
          now() - interval '3 days', now() - interval '3 days', 'kx_b'),
         ('kx_b', celestual_hash_handle('kx_a'), 'kx_a', '{"words":"i saved it for you"}'::jsonb,
          now() - interval '3 days', now() - interval '3 days', 'kx_a')
$sql$);
select dblink_exec('kx_set', $sql$insert into celestual_matches (handle_a, handle_b) values ('kx_a', 'kx_b')$sql$);

select dblink_exec('kx_one', 'begin');
select kx_ok('one session writes again, and holds it open',
  ((select r from dblink('kx_one', $sql$
      select celestual_mutual_again('kx_a', 'kx_b', 'proof-kx_a', '{"words":"the window seat, again"}'::jsonb)::text
    $sql$) as t(r text))::jsonb->>'recorded')::boolean);
select dblink_send_query('kx_two', $sql$select celestual_submit('kx_b', 'kx_a', null, 'proof-kx_b', null)::text$sql$);
select kx_ok('the other side''s placement on the pair, meanwhile, waits for it',
  kx_waiting(1) >= 1 and dblink_is_busy('kx_two') = 1);
select dblink_exec('kx_one', 'commit');

create temp table kx_placed as select r::jsonb as r from dblink_get_result('kx_two') as t(r text);
select kx_ok('and then answers as the told pair it was: mutual, with the words it was told',
  ((select r from kx_placed)->>'recorded')::boolean
  and ((select r from kx_placed)->>'mutual')::boolean
  and (select r from kx_placed)->>'match' = 'kx_a'
  and (select r from kx_placed)->'match_card'->>'words' = 'the window seat, always');
select kx_ok('writing nothing and spending nothing, the new note alone and unsealed',
  not exists (select 1 from celestual_entries where from_handle = 'kx_b')
  and not exists (select 1 from celestual_ping_spends where handle = 'kx_b')
  and (select count(*) from celestual_keepsakes where handle = 'kx_b') = 1
  and (select sealed_with is null and matched_at is null and card->>'words' = 'the window seat, again'
         from celestual_entries where from_handle = 'kx_a'));

select * from dblink_get_result('kx_two') as t(r text);

select dblink_exec('kx_set', $sql$delete from celestual_matches where handle_a like 'kx\_%' or handle_b like 'kx\_%'$sql$);
select dblink_exec('kx_set', $sql$delete from celestual_entries where from_handle like 'kx\_%'$sql$);
select dblink_exec('kx_set', $sql$delete from celestual_keepsakes where handle like 'kx\_%'$sql$);
select dblink_exec('kx_set', $sql$delete from celestual_ping_spends where handle like 'kx\_%'$sql$);
select dblink_exec('kx_set', $sql$delete from celestual_placements where handle like 'kx\_%'$sql$);
select dblink_exec('kx_set', $sql$delete from celestual_attempts where from_handle like 'kx\_%'$sql$);
select dblink_exec('kx_set', $sql$delete from celestual_ig_verifications where handle like 'kx\_%'$sql$);
select dblink_disconnect(c) from unnest(array['kx_set', 'kx_one', 'kx_two']) c;
rollback;
\else
\echo 'dblink is not installed here, so the race is not run'
\endif
