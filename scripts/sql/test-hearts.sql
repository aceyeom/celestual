-- ─────────────────────────────────────────────────────────────────────────────
-- test-hearts.sql: exercises 0042_the_hearts_and_the_faces.sql.
--
-- A heart is a count and never a name, it is behind the campus gate like
-- reading, and it survives a merge. The faces ride on the reads that already
-- run. Run through scripts/verify-migrations.sh --test. Self contained: its
-- cast is its own, so it does not depend on the order the tests run in.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function h_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function h_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- A verified DM proof, the way the relay would have written it.
create or replace function h_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest(p_proof, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- author, reader one and reader two are at berkeley. other is at stanford.
-- A stranger has no session at all.
do $$
declare a uuid; r1 uuid; r2 uuid; o uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('h-author@berkeley.edu', now()) returning id into a;
  insert into celestual_users (edu_email, edu_verified_at) values ('h-reader1@berkeley.edu', now()) returning id into r1;
  insert into celestual_users (edu_email, edu_verified_at) values ('h-reader2@berkeley.edu', now()) returning id into r2;
  insert into celestual_users (edu_email, edu_verified_at) values ('h-other@stanford.edu', now()) returning id into o;
  perform h_session(a,  'token-h-author-000000000');
  perform h_session(r1, 'token-h-reader1-00000000');
  perform h_session(r2, 'token-h-reader2-00000000');
  perform h_session(o,  'token-h-other-0000000000');
end $$;

create temp table h_ids as
  select (wall_write('token-h-author-000000000', 'hearted.one',
            'you were the one singing on the 51b that night.', null, null,
            'berkeley', 'live', '{}')->>'id')::uuid as id;
select h_ok('the letter is up', (select id is not null from h_ids));

-- ── 1. who may heart ────────────────────────────────────────────────────────
select h_ok('a stranger cannot heart',
  (wall_heart('token-nobody-0000000000', (select id from h_ids), true)->>'error') = 'no_session');
select h_ok('an outsider cannot',
  (wall_heart('token-h-other-0000000000', (select id from h_ids), true)->>'error') = 'gate');
select h_ok('a letter that is not there answers gone',
  (wall_heart('token-h-reader1-00000000', gen_random_uuid(), true)->>'error') = 'gone');

-- ── 2. the count ────────────────────────────────────────────────────────────
select h_ok('a reader hearts it',
  (wall_heart('token-h-reader1-00000000', (select id from h_ids), true)->>'hearts')::int = 1);
select h_ok('and pressing again is still one',
  (wall_heart('token-h-reader1-00000000', (select id from h_ids), true)->>'hearts')::int = 1);
select h_ok('a second reader makes two',
  (wall_heart('token-h-reader2-00000000', (select id from h_ids), true)->>'hearts')::int = 2);
select h_ok('the letters carry the count',
  (wall_letters_for('token-h-reader1-00000000', 'hearted.one')->'letters'->0->>'hearts')::int = 2);
select h_ok('and whether this session is one of them',
  (wall_letters_for('token-h-reader1-00000000', 'hearted.one')->'letters'->0->>'hearted')::boolean);
select h_ok('a stranger sees the count and no heart of their own',
  (wall_letters_for('token-nobody-0000000000', 'hearted.one')->'letters'->0->>'hearts')::int = 2
  and not (wall_letters_for('token-nobody-0000000000', 'hearted.one')->'letters'->0->>'hearted')::boolean);
select h_ok('one letter carries it too',
  (wall_letter('token-h-reader2-00000000', (select id from h_ids))->'letter'->>'hearted')::boolean
  and (wall_letter('token-h-reader2-00000000', (select id from h_ids))->'letter'->>'hearts')::int = 2);
select h_ok('taking it off',
  (wall_heart('token-h-reader1-00000000', (select id from h_ids), false)->>'hearts')::int = 1
  and not (wall_heart('token-h-reader1-00000000', (select id from h_ids), false)->>'hearted')::boolean);
select h_ok('and the letter agrees',
  not (wall_letter('token-h-reader1-00000000', (select id from h_ids))->'letter'->>'hearted')::boolean);

-- ── 3. nobody is listed ─────────────────────────────────────────────────────
select h_ok('the browser cannot read the hearts table',
  not has_table_privilege('anon', 'wall_hearts', 'SELECT')
  and not has_table_privilege('authenticated', 'wall_hearts', 'SELECT'));
select h_ok('but it can press the heart',
  has_function_privilege('anon', 'wall_heart(text, uuid, boolean)', 'EXECUTE'));
select h_ok('rls is on', (select relrowsecurity from pg_class where relname = 'wall_hearts'));

-- ── 4. the merge ────────────────────────────────────────────────────────────
-- Both readers heart it, then reader two's rows are moved onto reader one the
-- way celestual_user_merge moves every row that references a user. One heart
-- per person, and no unique violation for the desk to sort out.
select wall_heart('token-h-reader1-00000000', (select id from h_ids), true);
do $$
declare r1 uuid; r2 uuid; n int;
begin
  select id into r1 from celestual_users where edu_email = 'h-reader1@berkeley.edu';
  select id into r2 from celestual_users where edu_email = 'h-reader2@berkeley.edu';
  update wall_hearts set user_id = r1 where user_id = r2;
  select count(*) into n from wall_hearts where letter_id = (select id from h_ids);
  if n <> 1 then raise exception 'FAIL  the fold left % hearts', n; end if;
  if exists (select 1 from wall_hearts where user_id = r2) then
    raise exception 'FAIL  the absorbed heart is still there';
  end if;
  raise notice 'PASS  a heart folds into the survivor''s under a merge';
end $$;
select h_ok('and the count is one',
  (wall_letter('token-h-reader1-00000000', (select id from h_ids))->'letter'->>'hearts')::int = 1);

-- ── 5. a letter that came down ──────────────────────────────────────────────
select wall_report('token-h-reader2-00000000', (select id from h_ids), 'unspecified');
select h_ok('a letter that came down cannot be hearted',
  (wall_heart('token-h-reader1-00000000', (select id from h_ids), true)->>'error') = 'gone');

-- ── 6. the faces ride on the reads ──────────────────────────────────────────
insert into ig_profiles (handle, display_name, is_verified, avatar_path, avatar_fetched_at)
values ('hearted.one', 'Hearted One', true, 'ig/hearted.one.jpg', now());
select h_ok('the letters carry the face',
  (wall_letters_for('token-nobody-0000000000', 'hearted.one')->>'known')::boolean
  and (wall_letters_for('token-nobody-0000000000', 'hearted.one')->>'display_name') = 'Hearted One'
  and (wall_letters_for('token-nobody-0000000000', 'hearted.one')->>'avatar_path') = 'ig/hearted.one.jpg'
  and (wall_letters_for('token-nobody-0000000000', 'hearted.one')->>'is_verified')::boolean);
select h_ok('a name the resolver never saw is not known',
  not (wall_letters_for('token-nobody-0000000000', 'nobody.here')->>'known')::boolean);
-- a second letter, live, so wall_letter has one to answer about
create temp table h_ids2 as
  select (wall_write('token-h-author-000000000', 'hearted.one',
            'you held the door at moffitt at two in the morning.', null, null,
            'berkeley', 'live', '{}')->>'id')::uuid as id;
select h_ok('and so does one letter',
  (wall_letter('token-nobody-0000000000', (select id from h_ids2))->>'display_name') = 'Hearted One'
  and (wall_letter('token-nobody-0000000000', (select id from h_ids2))->'letter'->>'hearts')::int = 0);

-- the sky
select h_proof('hearty', 'proof-hearty');
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at)
values ('hearty', celestual_hash_handle('hearted.one'), 'hearted.one', now() + interval '60 days'),
       ('hearty', celestual_hash_handle('nobody.here'), 'nobody.here', now() + interval '60 days');
select h_ok('the sky rows carry the face',
  exists (select 1 from jsonb_array_elements(celestual_my_pings('hearty', 'proof-hearty')->'pings') x
           where x->>'handle' = 'hearted.one' and (x->>'known')::boolean
             and x->>'display_name' = 'Hearted One' and x->>'avatar_path' = 'ig/hearted.one.jpg'));
select h_ok('and a name the resolver never saw draws nothing',
  exists (select 1 from jsonb_array_elements(celestual_my_pings('hearty', 'proof-hearty')->'pings') x
           where x->>'handle' = 'nobody.here' and not (x->>'known')::boolean and x->>'avatar_path' is null));
select h_ok('a dead proof still answers nothing',
  not (celestual_my_pings('hearty', 'wrong-proof')->>'ok')::boolean);

-- ── 7. the peek, for a list ─────────────────────────────────────────────────
select h_ok('the peek answers a list, and normalises what it is asked',
  (ig_profile_peek(array['@Hearted.One', 'nobody.here'])->'hearted.one'->>'display_name') = 'Hearted One');
select h_ok('and only what it knows',
  not (ig_profile_peek(array['nobody.here']) ? 'nobody.here'));
select h_ok('and nothing about the row but the card',
  not (ig_profile_peek(array['hearted.one'])->'hearted.one' ? 'is_private')
  and not (ig_profile_peek(array['hearted.one'])->'hearted.one' ? 'resolved_at'));
select h_ok('an empty list is an empty answer', ig_profile_peek('{}'::text[]) = '{}'::jsonb);
select h_ok('and not to the browser',
  not has_function_privilege('anon', 'ig_profile_peek(text[])', 'EXECUTE')
  and not has_function_privilege('authenticated', 'ig_profile_peek(text[])', 'EXECUTE'));

-- ── the cleanup ─────────────────────────────────────────────────────────────
-- test-identity.sql counts the users table, so this leaves it as it found
-- it: the four people go, and their sessions, letters, hearts and report go
-- with them by cascade. The rest is deleted by name.
delete from celestual_users where edu_email in
  ('h-author@berkeley.edu', 'h-reader1@berkeley.edu', 'h-reader2@berkeley.edu', 'h-other@stanford.edu');
delete from celestual_entries where from_handle = 'hearty';
delete from celestual_ig_verifications where handle = 'hearty';
delete from ig_profiles where handle = 'hearted.one';
select h_ok('and it leaves nothing behind',
  not exists (select 1 from celestual_users where edu_email like 'h-%')
  and not exists (select 1 from wall_letters where target_handle = 'hearted.one')
  and not exists (select 1 from wall_hearts));
