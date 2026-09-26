-- ─────────────────────────────────────────────────────────────────────────────
-- test-wall-sorted.sql: exercises 0067_the_wall_sorted.sql.
--
-- The index carries what the wall's filter sorts and cuts by, per name: the
-- newest letter's time, every heart on the standing letters (seeded and
-- pressed, added up the way each letter shows them), and how many of those
-- letters went up from a verified Berkeley address and when the newest of
-- them did. Only standing letters count; nothing about who hearted or who
-- wrote is in it; the columns every earlier build asks for answer as they
-- did; and the browser can read the new ones.
-- Run through scripts/verify-migrations.sh --test. Everything is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function ws_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- ── the cast ────────────────────────────────────────────────────────────────
-- ws.liked     three letters: a Berkeley @-note with 5 seeded hearts and two
--              pressed, an unverified one with 1 seeded, and a removed one
--              with 30 seeded that must count for nothing
-- ws.cal       two Berkeley @-notes and one from the root, the newest of all
--              three from the root
-- ws.plain     one letter from the root, nobody's heart, the newest on the wall
-- ws.gone      an expired letter only: not on the wall at all
-- ~ws          a name note, never verified
create temp table ws_ids (k text primary key, id uuid);
do $$
declare w uuid; a uuid; b uuid; x uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('ws-writer@berkeley.edu', now()) returning id into w;
  insert into celestual_users (edu_email, edu_verified_at) values ('ws-a@berkeley.edu', now()) returning id into a;
  insert into celestual_users (edu_email, edu_verified_at) values ('ws-b@berkeley.edu', now()) returning id into b;

  insert into wall_letters (target_handle, body, author_id, campus, status, verified, hearts_seed, created_at)
    values ('ws.liked', 'the one everybody liked', w, 'berkeley', 'live', true, 5, now() - interval '3 days')
    returning id into x;
  insert into ws_ids values ('liked.1', x);
  insert into wall_hearts (letter_id, user_id) values (x, a), (x, b);
  insert into wall_letters (target_handle, body, author_id, campus, status, verified, hearts_seed, created_at)
    values ('ws.liked', 'the second one, from the root', w, 'global', 'live', false, 1, now() - interval '2 days');
  insert into wall_letters (target_handle, body, author_id, campus, status, verified, hearts_seed, created_at)
    values ('ws.liked', 'the one that came down', w, 'berkeley', 'removed', true, 30, now() - interval '1 hour');

  insert into wall_letters (target_handle, body, author_id, campus, status, verified, created_at)
    values ('ws.cal', 'the first from Berkeley', w, 'berkeley', 'live', true, now() - interval '5 days');
  insert into wall_letters (target_handle, body, author_id, campus, status, verified, created_at)
    values ('ws.cal', 'the second from Berkeley', w, 'berkeley', 'live', true, now() - interval '4 days')
    returning id into x;
  insert into ws_ids values ('cal.2', x);
  insert into wall_letters (target_handle, body, author_id, campus, status, verified, created_at)
    values ('ws.cal', 'and the newest, from the root', w, 'global', 'live', false, now() - interval '1 day');

  insert into wall_letters (target_handle, body, author_id, campus, status, verified, created_at)
    values ('ws.plain', 'the newest on the wall', w, 'global', 'live', false, now() - interval '5 minutes');

  insert into wall_letters (target_handle, body, author_id, campus, status, created_at, expires_at)
    values ('ws.gone', 'a letter that has lapsed', w, 'berkeley', 'live', now() - interval '40 days', now() - interval '10 days');

  insert into wall_letters (target_handle, target_kind, target_name, body, author_id, campus, status, moderation, created_at)
    values ('~ws', 'name', 'Ws', 'a letter to a name', w, 'global', 'live', '{}', now() - interval '6 hours');
end $$;

create temp view ws_row as
  select * from wall_index_all where target_handle in ('ws.liked', 'ws.cal', 'ws.plain', 'ws.gone', '~ws');

-- ── 1. the hearts ───────────────────────────────────────────────────────────
select ws_ok('a name''s hearts are every standing letter''s, seeded and pressed',
  (select hearts from ws_row where target_handle = 'ws.liked') = 5 + 2 + 1);
select ws_ok('a letter that came down counts for nothing, its seed included',
  (select letters from ws_row where target_handle = 'ws.liked') = 2);
select ws_ok('the sum is what each letter shows, added up (the letters'' own read)',
  (select hearts from ws_row where target_handle = 'ws.liked')
  = (select sum((x->>'hearts')::int) from jsonb_array_elements(
       (select wall_letters_for(null, 'ws.liked'))->'letters') x));
select ws_ok('a name nobody hearted reads nought, not null',
  (select hearts from ws_row where target_handle = 'ws.plain') = 0);
select ws_ok('a heart pressed now is counted on the next read',
  (select hearts from ws_row where target_handle = 'ws.cal') = 0);
insert into wall_hearts (letter_id, user_id)
  select (select id from ws_ids where k = 'cal.2'), id from celestual_users where edu_email = 'ws-a@berkeley.edu';
select ws_ok('and it is',
  (select hearts from ws_row where target_handle = 'ws.cal') = 1);

-- ── 2. Berkeley ─────────────────────────────────────────────────────────────
select ws_ok('berkeley counts the standing letters from a verified Berkeley address',
  (select berkeley from ws_row where target_handle = 'ws.cal') = 2
  and (select berkeley from ws_row where target_handle = 'ws.liked') = 1);
select ws_ok('and none from the root, or to a name',
  (select berkeley from ws_row where target_handle = 'ws.plain') = 0
  and (select berkeley from ws_row where target_handle = '~ws') = 0);
select ws_ok('berkeley_at is the newest Berkeley letter, not the newest letter',
  (select berkeley_at from ws_row where target_handle = 'ws.cal')
    = (select created_at from wall_letters where id = (select id from ws_ids where k = 'cal.2'))
  and (select berkeley_at < last_at from ws_row where target_handle = 'ws.cal'));
select ws_ok('and null where there is none',
  (select berkeley_at is null from ws_row where target_handle = 'ws.plain'));
select ws_ok('the removed Berkeley letter is not the newest one',
  (select berkeley_at from ws_row where target_handle = 'ws.liked')
    = (select created_at from wall_letters where id = (select id from ws_ids where k = 'liked.1')));

-- ── 3. the orders ───────────────────────────────────────────────────────────
select ws_ok('newest: last_at puts the newest letter first',
  (select array_agg(target_handle order by last_at desc) from ws_row)
    = array['ws.plain', '~ws', 'ws.cal', 'ws.liked']);
select ws_ok('most liked: hearts puts the most hearted first',
  (select array_agg(target_handle order by hearts desc, last_at desc) from ws_row)
    = array['ws.liked', 'ws.cal', 'ws.plain', '~ws']);
select ws_ok('Berkeley: the names with one, newest Berkeley letter first',
  (select array_agg(target_handle order by berkeley_at desc) from ws_row where berkeley > 0)
    = array['ws.liked', 'ws.cal']);
select ws_ok('a lapsed letter puts nobody on the wall',
  not exists (select 1 from ws_row where target_handle = 'ws.gone'));

-- ── 4. nothing else moved ───────────────────────────────────────────────────
select ws_ok('the columns 0063 declared come first, in their order',
  (select array_agg(attname order by attnum) from pg_attribute
    where attrelid = 'wall_index_all'::regclass and attnum > 0 and not attisdropped)
  = array['target_handle', 'campus', 'letters', 'last_at', 'known', 'display_name', 'is_verified',
          'avatar_path', 'kind', 'name', 'look', 'verified', 'school',
          'hearts', 'berkeley', 'berkeley_at']::name[]);
select ws_ok('the newest letter''s campus and sticker still ride on the row',
  (select campus = 'global' and not verified from ws_row where target_handle = 'ws.cal'));
select ws_ok('the pulse still counts the one wall',
  (wall_pulse_all()->>'names')::int >= 4 and (wall_pulse_all()->>'letters')::int >= 7);
select ws_ok('the browser reads the new columns',
  has_column_privilege('anon', 'wall_index_all', 'hearts', 'SELECT')
  and has_column_privilege('anon', 'wall_index_all', 'berkeley', 'SELECT')
  and has_column_privilege('anon', 'wall_index_all', 'berkeley_at', 'SELECT'));
select ws_ok('and still not who hearted anything',
  not has_table_privilege('anon', 'wall_hearts', 'SELECT'));

rollback;
