-- ─────────────────────────────────────────────────────────────────────────────
-- test-hearts-seed.sql: exercises 0059_the_hearts_the_wall_began_with.sql.
--
-- The letters that were up are given hearts to start from, once; a letter
-- written after starts from none; every read that carries a count carries the
-- sum and never the seed on its own; and one statement takes it all out. Run
-- through scripts/verify-migrations.sh --test, which copies the migrations
-- beside this file: the last part runs 0059 again from there (`\ir`), inside
-- a transaction it rolls back, so nothing it draws outlives the test.
-- Self contained, and it leaves nothing behind.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function hs_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function hs_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- ── 1. the shape ────────────────────────────────────────────────────────────
select hs_ok('the column is there, never null, and nought by default',
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'wall_letters' and column_name = 'hearts_seed'
             and is_nullable = 'NO' and column_default = '0'));
select hs_ok('the seed ran once, and says so',
  exists (select 1 from celestual_settings where key = 'wall_hearts_seeded_0059'));
select hs_ok('the record is the service role''s alone',
  (select relrowsecurity from pg_class where relname = 'wall_hearts_seed_0059')
  and not has_table_privilege('anon', 'wall_hearts_seed_0059', 'SELECT')
  and not has_table_privilege('authenticated', 'wall_hearts_seed_0059', 'SELECT'));
select hs_ok('and so is the draw',
  not has_function_privilege('anon', 'wall_hearts_seed_draw(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'wall_hearts_seed_draw(text)', 'EXECUTE'));
select hs_ok('only the four reads that carry a count touch the seed',
  (select array_agg(p.proname::text order by p.proname)
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc like '%hearts_seed%')
  = array['wall_heart', 'wall_letter', 'wall_letters_for', 'wall_mine']);
select hs_ok('and the browser still reaches all four',
  has_function_privilege('anon', 'wall_letters_for(text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_letter(text, uuid)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_heart(text, uuid, boolean)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_mine(text)', 'EXECUTE'));

-- ── 2. the curve ────────────────────────────────────────────────────────────
-- Four thousand draws a wall, from a fixed seed. The bounds are wide enough
-- that a different seed passes too: a share is checked to within six points,
-- which is several times what four thousand draws wander by.
select setseed(0.59);
create temp table hs_draws as
  select 'berkeley'::text as campus, wall_hearts_seed_draw('berkeley') as n from generate_series(1, 4000)
  union all
  select 'global', wall_hearts_seed_draw('global') from generate_series(1, 4000);

select hs_ok('berkeley never passes twelve',
  (select max(n) from hs_draws where campus = 'berkeley') <= 12
  and (select min(n) from hs_draws where campus = 'berkeley') >= 0);
select hs_ok('the root never passes thirty',
  (select max(n) from hs_draws where campus = 'global') <= 30
  and (select min(n) from hs_draws where campus = 'global') >= 0);
select hs_ok('the root reaches past berkeley''s ceiling',
  (select count(*) from hs_draws where campus = 'global' and n > 12) > 100);
select hs_ok('most are at nought at berkeley: about half',
  (select avg((n = 0)::int) from hs_draws where campus = 'berkeley') between 0.42 and 0.54);
select hs_ok('and on the root wall, about four in ten',
  (select avg((n = 0)::int) from hs_draws where campus = 'global') between 0.34 and 0.46);
select hs_ok('nought is the commonest count on both walls',
  not exists (
    select 1 from (select campus, n, count(*) as k from hs_draws group by campus, n) x
     where x.n <> 0
       and x.k >= (select count(*) from hs_draws z where z.campus = x.campus and z.n = 0)));
select hs_ok('and the counts thin out going up',
  (select count(*) from hs_draws where campus = 'berkeley' and n between 1 and 3)
    > (select count(*) from hs_draws where campus = 'berkeley' and n between 4 and 6)
  and (select count(*) from hs_draws where campus = 'berkeley' and n between 4 and 6)
    > (select count(*) from hs_draws where campus = 'berkeley' and n between 7 and 12)
  and (select count(*) from hs_draws where campus = 'global' and n between 1 and 8)
    > (select count(*) from hs_draws where campus = 'global' and n between 9 and 16)
  and (select count(*) from hs_draws where campus = 'global' and n between 9 and 16)
    > (select count(*) from hs_draws where campus = 'global' and n between 17 and 30));

-- ── 3. the cast ─────────────────────────────────────────────────────────────
do $$
declare a uuid; r1 uuid; r2 uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('hs-author@berkeley.edu', now()) returning id into a;
  insert into celestual_users (edu_email, edu_verified_at) values ('hs-reader1@berkeley.edu', now()) returning id into r1;
  insert into celestual_users (edu_email, edu_verified_at) values ('hs-reader2@berkeley.edu', now()) returning id into r2;
  perform hs_session(a,  'token-hs-author-00000000');
  perform hs_session(r1, 'token-hs-reader1-0000000');
  perform hs_session(r2, 'token-hs-reader2-0000000');
end $$;

create temp table hs_ids as
  select (wall_write('token-hs-author-00000000', 'seeded.one',
            'you left the good pen on the table at the library and i kept it.', null, null,
            'berkeley', 'live', '{}')->>'id')::uuid as id;

-- ── 4. a letter written after starts from none ──────────────────────────────
select hs_ok('a letter written now is given nothing',
  (select hearts_seed from wall_letters where id = (select id from hs_ids)) = 0
  and not exists (select 1 from wall_hearts_seed_0059 where id = (select id from hs_ids)));
select hs_ok('and reads nought',
  (wall_letter('token-hs-reader1-0000000', (select id from hs_ids))->'letter'->>'hearts')::int = 0);

-- ── 5. every read carries the sum ───────────────────────────────────────────
update wall_letters set hearts_seed = 5 where id = (select id from hs_ids);
select hs_ok('one letter carries it',
  (wall_letter('token-hs-reader1-0000000', (select id from hs_ids))->'letter'->>'hearts')::int = 5);
select hs_ok('the letters under a name carry it',
  (wall_letters_for('token-hs-reader1-0000000', 'seeded.one')->'letters'->0->>'hearts')::int = 5);
select hs_ok('a stranger sees the same number',
  (wall_letters_for('token-nobody-0000000000', 'seeded.one')->'letters'->0->>'hearts')::int = 5);
select hs_ok('and the writer''s own list agrees with the letter',
  (select (x->>'hearts')::int from jsonb_array_elements(wall_mine('token-hs-author-00000000')->'letters') x
    where x->>'id' = (select id::text from hs_ids)) = 5);
select hs_ok('a press answers the sum',
  (wall_heart('token-hs-reader1-0000000', (select id from hs_ids), true)->>'hearts')::int = 6);
select hs_ok('pressing again is still the sum',
  (wall_heart('token-hs-reader1-0000000', (select id from hs_ids), true)->>'hearts')::int = 6);
select hs_ok('and every read moves with it',
  (wall_letter('token-hs-reader2-0000000', (select id from hs_ids))->'letter'->>'hearts')::int = 6
  and (wall_letters_for('token-hs-reader2-0000000', 'seeded.one')->'letters'->0->>'hearts')::int = 6
  and (select (x->>'hearts')::int from jsonb_array_elements(wall_mine('token-hs-author-00000000')->'letters') x
        where x->>'id' = (select id::text from hs_ids)) = 6);
select hs_ok('whether a reader hearted it is still their own press alone',
  (wall_letter('token-hs-reader1-0000000', (select id from hs_ids))->'letter'->>'hearted')::boolean
  and not (wall_letter('token-hs-reader2-0000000', (select id from hs_ids))->'letter'->>'hearted')::boolean);
select hs_ok('taking it off comes back to the seed and no lower',
  (wall_heart('token-hs-reader1-0000000', (select id from hs_ids), false)->>'hearts')::int = 5
  and (wall_heart('token-hs-reader1-0000000', (select id from hs_ids), false)->>'hearts')::int = 5);

-- ── 6. and never the seed on its own ────────────────────────────────────────
select hs_ok('no read names the seed',
  not (wall_letter('token-hs-reader1-0000000', (select id from hs_ids))->'letter' ? 'hearts_seed')
  and not (wall_letters_for('token-hs-reader1-0000000', 'seeded.one')->'letters'->0 ? 'hearts_seed')
  and not exists (select 1 from jsonb_array_elements(wall_mine('token-hs-author-00000000')->'letters') x
                   where x ? 'hearts_seed')
  and not (wall_heart('token-hs-reader1-0000000', (select id from hs_ids), false) ? 'hearts_seed'));
select hs_ok('and the browser cannot read the column',
  not has_column_privilege('anon', 'wall_letters', 'hearts_seed', 'SELECT')
  and not has_column_privilege('authenticated', 'wall_letters', 'hearts_seed', 'SELECT'));

-- ── 7. the ceiling is the schema's too ──────────────────────────────────────
do $$
begin
  begin
    update wall_letters set hearts_seed = 31 where id = (select id from hs_ids);
    raise exception 'FAIL  thirty one was let in';
  exception when check_violation then
    raise notice 'PASS  nothing past thirty is let in';
  end;
  begin
    update wall_letters set hearts_seed = -1 where id = (select id from hs_ids);
    raise exception 'FAIL  a count below nought was let in';
  exception when check_violation then
    raise notice 'PASS  and nothing below nought';
  end;
end $$;

-- ── 8. once, and never again ────────────────────────────────────────────────
-- Run 0059 a second time, as a redeploy would. Then take its mark away and
-- run it again over letters standing as they would have the day it first
-- ran, which is the one run that draws. All of it is rolled back.
update wall_letters set hearts_seed = 0 where id = (select id from hs_ids);
begin;

\ir 0059_the_hearts_the_wall_began_with.sql

select hs_ok('a second run gives nothing to a letter written since the first',
  (select hearts_seed from wall_letters where id = (select id from hs_ids)) = 0
  and not exists (select 1 from wall_hearts_seed_0059 where id = (select id from hs_ids)));

delete from celestual_settings where key = 'wall_hearts_seeded_0059';
do $$
declare a uuid;
begin
  select id into a from celestual_users where edu_email = 'hs-author@berkeley.edu';
  insert into wall_letters (target_handle, body, author_id, campus, status)
  select 'hs.up.' || g, 'a letter that was up the day the hearts were given, number ' || g,
         a, case when g % 2 = 0 then 'berkeley' else 'global' end, 'live'
    from generate_series(1, 400) g;
end $$;

\ir 0059_the_hearts_the_wall_began_with.sql

select hs_ok('the first run gives every letter there a draw of its own',
  (select count(*) from wall_hearts_seed_0059 s join wall_letters l on l.id = s.id
    where l.target_handle like 'hs.up.%') = 400);
select hs_ok('and the letter carries what the record says it was given',
  not exists (select 1 from wall_hearts_seed_0059 s join wall_letters l on l.id = s.id
               where l.hearts_seed <> s.seed or l.campus <> s.campus));
select hs_ok('berkeley''s letters are given twelve at most',
  (select max(l.hearts_seed) from wall_letters l
    where l.target_handle like 'hs.up.%' and l.campus = 'berkeley') <= 12);
select hs_ok('the root''s thirty at most',
  (select max(l.hearts_seed) from wall_letters l
    where l.target_handle like 'hs.up.%' and l.campus = 'global') <= 30);
select hs_ok('and nought is the count more of them have than any other',
  not exists (
    select 1 from (select hearts_seed, count(*) as k from wall_letters
                    where target_handle like 'hs.up.%' group by hearts_seed) x
     where x.hearts_seed <> 0
       and x.k >= (select count(*) from wall_letters where target_handle like 'hs.up.%' and hearts_seed = 0)));
select hs_ok('the reads carry what was given',
  (select bool_and((wall_letters_for('token-nobody-0000000000', l.target_handle)->'letters'->0->>'hearts')::int = l.hearts_seed)
     from wall_letters l where l.target_handle in ('hs.up.1', 'hs.up.2', 'hs.up.3', 'hs.up.4', 'hs.up.5', 'hs.up.6')));
select hs_ok('the mark is back',
  exists (select 1 from celestual_settings where key = 'wall_hearts_seeded_0059'));

insert into wall_letters (target_handle, body, author_id, campus, status)
select 'hs.after', 'a letter written the day after', author_id, 'global', 'live'
  from wall_letters where id = (select id from hs_ids);

\ir 0059_the_hearts_the_wall_began_with.sql

select hs_ok('and a letter written after it is never given any',
  (select hearts_seed from wall_letters where target_handle = 'hs.after') = 0
  and not exists (select 1 from wall_hearts_seed_0059 s join wall_letters l on l.id = s.id
                   where l.target_handle = 'hs.after'));

update wall_letters set hearts_seed = 0;
select hs_ok('one statement takes every seeded heart out',
  not exists (select 1 from wall_letters where hearts_seed <> 0)
  and (select bool_and((wall_letters_for('token-nobody-0000000000', l.target_handle)->'letters'->0->>'hearts')::int = 0)
         from wall_letters l where l.target_handle in ('hs.up.1', 'hs.up.2', 'hs.up.3', 'hs.up.4')));
update wall_letters l set hearts_seed = s.seed from wall_hearts_seed_0059 s where s.id = l.id;
select hs_ok('and the record puts them back as they were drawn',
  not exists (select 1 from wall_hearts_seed_0059 s join wall_letters l on l.id = s.id
               where l.hearts_seed <> s.seed));

rollback;

-- ── the cleanup ─────────────────────────────────────────────────────────────
-- test-identity.sql counts the users table, so this leaves it as it found it:
-- the three people go, and their sessions, letters and hearts with them.
delete from celestual_users where edu_email in
  ('hs-author@berkeley.edu', 'hs-reader1@berkeley.edu', 'hs-reader2@berkeley.edu');
select hs_ok('and it leaves nothing behind but the mark',
  not exists (select 1 from celestual_users where edu_email like 'hs-%')
  and not exists (select 1 from wall_letters where target_handle = 'seeded.one' or target_handle like 'hs.%')
  and not exists (select 1 from wall_letters where hearts_seed <> 0)
  and exists (select 1 from celestual_settings where key = 'wall_hearts_seeded_0059'));
drop function hs_ok(text, boolean);
drop function hs_session(uuid, text);
