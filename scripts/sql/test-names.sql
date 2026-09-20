-- ─────────────────────────────────────────────────────────────────────────────
-- test-names.sql: exercises 0053_a_letter_to_a_first_name.sql and
-- 0054_the_search_hears_a_name.sql.
--
-- A letter to a first name is keyed by a string that can never be a handle,
-- no handle proof can claim or empty it, a report still takes it down on the
-- tap, an opted out handle of the same spelling does not shut it, and the
-- search hears a name, a misspelling and an accent while never listing a
-- profile that is not on the wall. Run through
-- scripts/verify-migrations.sh --test. Self contained cast.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function n_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function n_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the fold and the keys ────────────────────────────────────────────────────
select n_ok('fold lowers, strips accents and punctuation', wall_fold('Sofía Ñoño-Pérez') = 'sofia nono perez');
select n_ok('fold handles uppercase accents', wall_fold('SOFÍA') = 'sofia');
select n_ok('a name key is a tilde and the folded name', wall_name_key('Sofía Reyes') = '~sofiareyes');
select n_ok('a one letter name has no key', wall_name_key('S') is null);
select n_ok('a tilde string is a name key', wall_target_key('~Sofia Reyes') = '~sofiareyes');
select n_ok('anything else is a handle', wall_target_key('@Sofia.Reyes') = 'sofia.reyes');
select n_ok('a clean name keeps its case', wall_name_clean('  Sofía   Reyes ') = 'Sofía Reyes');
select n_ok('a digit is not a name', wall_name_clean('the girl in row 3') is null);
select n_ok('four words are not a name', wall_name_clean('a b c d') is null);
select n_ok('an @ is not a name', wall_name_clean('@sofia') is null);
select n_ok('thirty one characters are not a name', wall_name_clean(repeat('a', 31)) is null);

-- ── the cast ────────────────────────────────────────────────────────────────
-- author and reader are at berkeley. subject is at berkeley AND holds the
-- verified handle spelled exactly like the folded name, which is the
-- collision the tilde exists to prevent.
do $$
declare a uuid; r uuid; s uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('n-author@berkeley.edu', now()) returning id into a;
  insert into celestual_users (edu_email, edu_verified_at) values ('n-reader@berkeley.edu', now()) returning id into r;
  insert into celestual_users (instagram_handle, handle_verified_at, edu_email, edu_verified_at)
    values ('sofiareyes', now(), 'n-subject@berkeley.edu', now()) returning id into s;
  perform n_session(a, 'token-n-author-000000000');
  perform n_session(r, 'token-n-reader-000000000');
  perform n_session(s, 'token-n-subject-00000000');
end $$;

-- ── writing to a name ────────────────────────────────────────────────────────
create temp table n_w as
  select wall_write('token-n-author-000000000', '', 'you sat two rows ahead in dwinelle all semester.',
                    null, null, 'berkeley', 'live', '{}', 'name', 'Sofía Reyes') as out;
select n_ok('a name letter goes up', (select (out->>'ok')::boolean from n_w));
select n_ok('it is keyed by the tilde', (select out->>'handle' from n_w) = '~sofiareyes');
select n_ok('it knows its kind', (select out->>'kind' from n_w) = 'name');
select n_ok('the name is kept as written', (select out->>'name' from n_w) = 'Sofía Reyes');

create temp table n_w2 as
  select wall_write('token-n-author-000000000', '', 'you held the door at moffitt at two in the morning.',
                    null, null, 'berkeley', 'live', '{}', 'name', 'sofia reyes') as out;
select n_ok('another spelling shares the key', (select out->>'handle' from n_w2) = '~sofiareyes');

-- and a handle letter spelled the same, which is a different disc
create temp table n_w3 as
  select wall_write('token-n-author-000000000', 'sofiareyes', 'you were the one singing on the 51b that night.',
                    null, null, 'berkeley', 'live', '{}') as out;
select n_ok('the eight argument write still works', (select (out->>'ok')::boolean from n_w3));
select n_ok('a handle of the same spelling is its own key', (select out->>'handle' from n_w3) = 'sofiareyes');

select n_ok('the index carries the name row with its kind',
  (select kind = 'name' and letters = 2 and name = 'sofia reyes' and known = false
     from wall_index where target_handle = '~sofiareyes'));
select n_ok('the index carries the handle row apart from it',
  (select kind = 'handle' and letters = 1 from wall_index where target_handle = 'sofiareyes'));

select n_ok('a name with a digit is refused',
  (wall_write('token-n-author-000000000', '', 'a letter.', null, null, 'berkeley', 'live', '{}', 'name', 'the girl in row 3'))->>'error' = 'name');
select n_ok('a name with an @ is refused',
  (wall_write('token-n-author-000000000', '', 'a letter.', null, null, 'berkeley', 'live', '{}', 'name', '@sofia'))->>'error' = 'name');

-- ── reading a name ───────────────────────────────────────────────────────────
create temp table n_read as
  select wall_letters_for('token-n-reader-000000000', '~sofiareyes') as out;
select n_ok('the letters under a name are read by the key', (select (out->>'ok')::boolean and jsonb_array_length(out->'letters') = 2 from n_read));
select n_ok('the read says it is a name', (select out->>'kind' = 'name' and out->>'name' = 'sofia reyes' from n_read));
select n_ok('a name is never known to the resolver', (select (out->>'known')::boolean = false and out->>'display_name' = '' from n_read));
select n_ok('every letter under it carries the kind', (select bool_and((l->>'kind') = 'name') from n_read, jsonb_array_elements(out->'letters') l));

-- ── nobody owns a first name ─────────────────────────────────────────────────
select n_ok('the letter is not the handle holder''s',
  (select (wall_letter('token-n-subject-00000000', (out->>'id')::uuid)->'letter'->>'mine')::boolean = false from n_w));
select n_ok('the handle holder cannot claim the name letter',
  (select wall_claim('token-n-subject-00000000', (out->>'id')::uuid)->>'error' from n_w) = 'unverified');
select n_ok('the handle holder cannot empty the name',
  (select wall_remove_letter('token-n-subject-00000000', (out->>'id')::uuid)->>'error' from n_w) = 'unverified');
select n_ok('but the same holder can take down the handle letter',
  (select (wall_remove_letter('token-n-subject-00000000', (out->>'id')::uuid)->>'ok')::boolean from n_w3));

-- ── the tap still works ──────────────────────────────────────────────────────
select n_ok('a reader reports a name letter on the tap',
  (select (wall_report('token-n-reader-000000000', (out->>'id')::uuid, 'subject')->>'ok')::boolean from n_w));
select n_ok('it is down', (select status = 'removed' from wall_letters where id = (select (out->>'id')::uuid from n_w)));
select n_ok('a report does not shut the name', wall_name_shut('~sofiareyes', 'berkeley') = false);
select n_ok('the other letter to the name still stands', (select letters = 1 from wall_index where target_handle = '~sofiareyes'));

-- the handle holder's takedown shut the handle (a claim exists on a removed letter)
select n_ok('the handle is shut by its holder''s takedown', wall_name_shut('sofiareyes', 'berkeley') = true);
select n_ok('which does not shut the first name', wall_name_shut('~sofiareyes', 'berkeley') = false);

-- an opt out on the handle
insert into celestual_suppressions (handle, handle_hash, reason) values ('sofiareyes', celestual_hash_handle('sofiareyes'), 'test')
  on conflict do nothing;
select n_ok('an opted out handle does not shut the first name', wall_name_shut('~sofiareyes', 'berkeley') = false);

-- only the desk shuts a name
update wall_letters set moderation = jsonb_build_object('desk', jsonb_build_object('via', 'desk_shut'))
 where id = (select (out->>'id')::uuid from n_w);
select n_ok('the desk shuts a name', wall_name_shut('~sofiareyes', 'berkeley') = true);
select n_ok('and nothing more is written to it',
  (wall_write('token-n-author-000000000', '', 'one more.', null, null, 'berkeley', 'live', '{}', 'name', 'Sofia Reyes'))->>'error' = 'removed');

-- ── the search hears a name ──────────────────────────────────────────────────
-- a handle on the wall with a resolver name, a first name on the wall, and a
-- resolver row for a handle nobody has written to
insert into ig_profiles (handle, display_name) values ('sofiaaa.reyes', 'Sofia Reyes') on conflict (handle) do update set display_name = excluded.display_name;
insert into ig_profiles (handle, display_name) values ('ghost.person', 'Ghost Person') on conflict (handle) do update set display_name = excluded.display_name;
insert into ig_profiles (handle, display_name) values ('sofia', 'Somebody Else') on conflict (handle) do update set display_name = excluded.display_name;
select wall_write('token-n-author-000000000', 'sofiaaa.reyes', 'you gave me your umbrella outside wheeler.', null, null, 'berkeley', 'live', '{}');
select wall_write('token-n-author-000000000', '', 'you laughed at my joke in the line at cafe strada.', null, null, 'berkeley', 'live', '{}', 'name', 'Sofia');

create or replace function n_hits(p text) returns text[]
language sql as $$
  select coalesce(array_agg(r->>'handle' order by ord), '{}'::text[])
    from jsonb_array_elements(wall_search(p)) with ordinality as t(r, ord)
$$;

select n_ok('a first name finds the name and the handle', n_hits('sofia') @> array['~sofia', 'sofiaaa.reyes']);
select n_ok('the exact name ranks first', (n_hits('sofia'))[1] = '~sofia');
select n_ok('a full name finds the handle by the resolver''s name', n_hits('Sofia Reyes') @> array['sofiaaa.reyes']);
select n_ok('an accent is heard', n_hits('sofía') @> array['~sofia']);
select n_ok('a dotless spelling is heard', n_hits('sofiareyes') @> array['sofiaaa.reyes']);
select n_ok('a misspelling is heard', n_hits('soffia') @> array['~sofia']);
select n_ok('a sound alike is heard', n_hits('sophia') @> array['~sofia']);
select n_ok('a sound alike surname is heard', n_hits('reyez') @> array['sofiaaa.reyes']);
select n_ok('a profile not on the wall is never listed', n_hits('ghost') = '{}'::text[] and n_hits('Ghost Person') = '{}'::text[]);
select n_ok('two characters match a prefix only', n_hits('so') @> array['~sofia', 'sofiaaa.reyes'] and not (n_hits('so') @> array['ghost.person']));
select n_ok('one character does not go fuzzy', not (n_hits('z') @> array['~sofia']));
select n_ok('nothing typed lists nothing', n_hits('') = '{}'::text[] and n_hits('   ') = '{}'::text[]);
select n_ok('a name row is never known, whatever the resolver holds under that spelling',
  (select (r->>'known')::boolean = false and coalesce(r->>'display_name', '') = '' and r->>'kind' = 'name' and r->>'name' = 'Sofia'
     from jsonb_array_elements(wall_search('sofia')) r where r->>'handle' = '~sofia'));
select n_ok('a handle row carries the resolver''s name',
  (select r->>'display_name' = 'Sofia Reyes' and r->>'kind' = 'handle'
     from jsonb_array_elements(wall_search('sofiaaa')) r where r->>'handle' = 'sofiaaa.reyes'));

-- ── the desk sees the name ───────────────────────────────────────────────────
select n_ok('the desk lists the name as written',
  exists (select 1 from jsonb_array_elements(celestual_desk_letters(null, 'sofia', 50, 0)->'rows') r
           where r->>'target_kind' = 'name' and r->>'target_name' = 'Sofia'));

select n_ok('wall_mine carries the kind',
  exists (select 1 from jsonb_array_elements(wall_mine('token-n-author-000000000')->'letters') l
           where l->>'kind' = 'name' and l->>'name' = 'Sofia'));
