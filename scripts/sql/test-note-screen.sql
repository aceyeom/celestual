-- ─────────────────────────────────────────────────────────────────────────────
-- test-note-screen.sql: exercises what 0069_the_weekly_reveal.sql holds for a
-- note's own screen on the account.
--
-- Changing the words to nothing takes them off, and sending a note again
-- with no card keeps them. And a screen left up across the reveal cannot let
-- go of a pair the reveal has just made mutual: withdrawing says 'mutual' and
-- changes nothing, and the other side, its match and its mail all stand.
-- Run through scripts/verify-migrations.sh --test; everything is rolled back
-- at the end.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function ns_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function ns_proof(p_handle text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest('proof-' || p_handle, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

create or replace function ns_row(p_from text, p_to text) returns celestual_entries
language sql as $$
  select * from celestual_entries where from_handle = p_from and to_hash = celestual_hash_handle(p_to)
$$;

select ns_proof(h) from unnest(array['ns_a', 'ns_b', 'ns_c', 'ns_d']) h;

-- ── 1. the words ────────────────────────────────────────────────────────────
select celestual_submit('ns_a', 'ns_b', null, 'proof-ns_a', '{"words":"the bus stop, tuesday"}'::jsonb);
select ns_ok('a note placed with words keeps them',
  (ns_row('ns_a', 'ns_b')).card->>'words' = 'the bus stop, tuesday');
select celestual_submit('ns_a', 'ns_b', null, 'proof-ns_a', null);
select ns_ok('placed again with no card, the words stay',
  (ns_row('ns_a', 'ns_b')).card->>'words' = 'the bus stop, tuesday');
select celestual_submit('ns_a', 'ns_b', null, 'proof-ns_a', '{"words":""}'::jsonb);
select ns_ok('changed to nothing, the words are taken off',
  (ns_row('ns_a', 'ns_b')).card is null);
update celestual_entries set expires_at = now() - interval '1 day' where from_handle = 'ns_a';
select celestual_submit('ns_a', 'ns_b', null, 'proof-ns_a', '{"words":"once more"}'::jsonb);
update celestual_entries set expires_at = now() - interval '1 day' where from_handle = 'ns_a';
select ns_ok('a note that lapsed is sent again with no card and keeps what it had',
  (celestual_submit('ns_a', 'ns_b', null, 'proof-ns_a', null)->>'recorded')::boolean
  and (ns_row('ns_a', 'ns_b')).card->>'words' = 'once more');

-- ── 2. a mutual, from a screen up across its night ──────────────────────────
select celestual_submit('ns_c', 'ns_d', 'ns_c@example.com', 'proof-ns_c', '{"words":"the library steps"}'::jsonb);
select celestual_submit('ns_d', 'ns_c', null, 'proof-ns_d', '{"words":"the day it hailed"}'::jsonb);
select ns_ok('the pair is sealed', (ns_row('ns_c', 'ns_d')).sealed_with is not null);
-- the night has come, and nobody has read since
update celestual_entries set reveal_at = now() - interval '1 second' where from_handle in ('ns_c', 'ns_d');
create temp table ns_go as
  select celestual_withdraw('ns_c', 'ns_d', 'proof-ns_c') as r;
select ns_ok('letting it go after the reveal is refused, and says it went mutual',
  not ((select r from ns_go)->>'withdrawn')::boolean
  and (select r from ns_go)->>'error' = 'mutual');
select ns_ok('both halves are mutual, and both rows stand',
  (ns_row('ns_c', 'ns_d')).matched_at is not null
  and (ns_row('ns_d', 'ns_c')).matched_at is not null);
select ns_ok('the match stands, and so does its mail',
  exists (select 1 from celestual_matches where handle_a = 'ns_c' and handle_b = 'ns_d')
  and exists (select 1 from celestual_notifications n join celestual_matches m on m.id = n.match_id
               where m.handle_a = 'ns_c' and m.handle_b = 'ns_d'));
select ns_ok('keeping it after the reveal says so rather than failing',
  celestual_renew('ns_c', 'ns_d', 'proof-ns_c')->>'error' = 'none');
select ns_ok('and a note let go that is not there any more answers no, with no reason',
  not (celestual_withdraw('ns_c', 'nobody', 'proof-ns_c')->>'withdrawn')::boolean
  and celestual_withdraw('ns_c', 'nobody', 'proof-ns_c')->'error' = 'null'::jsonb);

rollback;
