-- ─────────────────────────────────────────────────────────────────────────────
-- test-one-wall.sql: exercises 0063_one_wall.sql.
--
-- The rules of 25 September (docs/ONE-WALL.md) as properties of the schema:
-- an @-note needs a verified address at a school that takes them and carries
-- the sticker; a name note needs nothing and never carries it; the dear line
-- is cleaned or refused; a draft is one letter however often it is sent; a
-- name that came off anywhere stays off everywhere; the owner takes a letter
-- down without shutting the name; the reads carry verified, the dear line
-- and the school; sessions slide to a year; the cards land on the one wall;
-- and a private note is a letter's length and read by the letter's list.
-- Run through scripts/verify-migrations.sh --test. Everything is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function ow_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function ow_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- The v2 write, by name, the way PostgREST calls it.
create or replace function ow_w(
  p_token text, p_kind text, p_target text, p_name text, p_body text,
  p_nonce text, p_status text default 'live', p_pick text default null, p_sal text default null)
returns jsonb language sql as $$
  select wall_write(p_token => p_token, p_kind => p_kind, p_target => p_target, p_name => p_name,
                    p_salutation => p_sal, p_body => p_body, p_look => '{"tint":"amber"}'::jsonb,
                    p_campus_pick => p_pick, p_source => null, p_status => p_status,
                    p_moderation => '{"verdict":"pass","reasons":[]}'::jsonb, p_nonce => p_nonce)
$$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;
-- the allowance is the desk's switch; off, as the live project runs it, so
-- only the cap test below spends one
insert into celestual_settings (key, value) values ('wall_letter_cap', 'false')
  on conflict (key) do update set value = 'false';

-- ── the cast ────────────────────────────────────────────────────────────────
-- bw     a berkeley address. Writes @-notes.
-- sw     a stanford address (a department's). Proved, at a school that does
--        not take @-notes yet.
-- pw     a gmail address on the pass list. Writes @-notes from berkeley.
-- owner  holds the verified @ ow_owner, and no campus address.
-- a new device, never seen: token-ow-new-...
do $$
declare bw uuid; sw uuid; pw uuid; ow uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('bw@berkeley.edu', now()) returning id into bw;
  insert into celestual_users (edu_email, edu_verified_at) values ('sw@cs.stanford.edu', now()) returning id into sw;
  insert into celestual_passes (kind, value) values ('email', 'pw@gmail.com') on conflict do nothing;
  insert into celestual_users (edu_email, edu_verified_at) values ('pw@gmail.com', now()) returning id into pw;
  insert into celestual_users (instagram_handle, handle_verified_at) values ('ow_owner', now()) returning id into ow;
  perform ow_session(bw, 'token-ow-bw-00000000000');
  perform ow_session(sw, 'token-ow-sw-00000000000');
  perform ow_session(pw, 'token-ow-pw-00000000000');
  perform ow_session(ow, 'token-ow-owner-00000000');
end $$;

-- ── 1. the campuses ─────────────────────────────────────────────────────────
select ow_ok('berkeley takes @-notes and its sticker says Cal',
  (select handle_notes and short = 'Cal' from wall_campuses where slug = 'berkeley'));
select ow_ok('the wall at the root takes none',
  (select not handle_notes from wall_campuses where slug = 'global'));
select ow_ok('a department''s address is its campus''s',
  celestual_campus_for_domain('eecs.berkeley.edu') = 'berkeley');
-- (a statement does not see what a function it calls inserted, so the call
-- and the look at the row are two statements, here and below)
select ow_ok('a school not yet on the wall is opened, slugged by its label',
  celestual_campus_for_domain('cs.stanford.edu') = 'stanford');
select ow_ok('open, without @-notes, named and keyed on its registered domain',
  (select is_open and not handle_notes and name = 'Stanford' and edu_domain = 'stanford.edu'
     from wall_campuses where slug = 'stanford'));
select ow_ok('and found, not opened again, the second time',
  celestual_campus_for_domain('stanford.edu') = 'stanford'
  and (select count(*) from wall_campuses where edu_domain = 'stanford.edu') = 1);
select ow_ok('a short label is a slug as it is',
  celestual_campus_for_domain('ucla.edu') = 'ucla');
select ow_ok('and a name set in capitals',
  (select name from wall_campuses where slug = 'ucla') = 'UCLA');
insert into wall_campuses (slug, name, edu_domain, is_open) values ('ucsd', 'Somebody Else', 'ucsd-other.edu', false);
select ow_ok('a slug already taken is not taken twice',
  celestual_campus_for_domain('ucsd.edu') = 'ucsd-2');
select ow_ok('an address that is not a .edu opens nothing',
  celestual_campus_for_domain('gmail.com') is null and celestual_campus_peek('gmail.com') is null);
select ow_ok('the peek names a campus without opening it',
  (celestual_campus_peek('mit.edu')->>'slug') = 'mit'
  and not exists (select 1 from wall_campuses where edu_domain = 'mit.edu'));
select ow_ok('the picker lists the open schools, the root excepted, @-note schools first',
  (wall_campuses_open()->0->>'slug') = 'berkeley'
  and (wall_campuses_open()->0->>'short') = 'Cal'
  and not exists (select 1 from jsonb_array_elements(wall_campuses_open()) x where x->>'slug' in ('global', 'ucsd'))
  and exists (select 1 from jsonb_array_elements(wall_campuses_open()) x
               where x->>'slug' = 'stanford' and x->>'short' = 'Stanford' and x->>'domain' = 'stanford.edu'));
select ow_ok('the browser reads the picker and the pulse',
  has_function_privilege('anon', 'wall_campuses_open()', 'EXECUTE')
  and has_function_privilege('anon', 'wall_pulse_all()', 'EXECUTE'));
select ow_ok('and opens no campus itself',
  not has_function_privilege('anon', 'celestual_campus_for_domain(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_campus_for_domain(text)', 'EXECUTE'));

-- ── 2. an @-note ────────────────────────────────────────────────────────────
select ow_ok('an @-note from a device with no session is asked for a campus address',
  (ow_w('token-ow-nobody-0000000', 'handle', 'ow_target', null, 'a letter', 'nonce-ow-0001')->>'error') = 'edu');
select ow_ok('a claimed @ alone does not write one',
  (ow_w('token-ow-owner-00000000', 'handle', 'ow_target', null, 'a letter', 'nonce-ow-0002')->>'error') = 'edu');
select ow_ok('an address at a school without @-notes is told so',
  (ow_w('token-ow-sw-00000000000', 'handle', 'ow_target', null, 'a letter', 'nonce-ow-0003')->>'error') = 'campus');
select ow_ok('and nothing was written for any of them',
  not exists (select 1 from wall_letters where target_handle = 'ow_target'));

create temp table ow_first as
  select ow_w('token-ow-bw-00000000000', 'handle', '@OW_Target', null,
              'you lent me a pen in march and i still have it', 'nonce-ow-first',
              'live', null, '  dear   sofia  ') as r;
select ow_ok('a berkeley address writes an @-note',
  ((select r from ow_first)->>'ok')::boolean and ((select r from ow_first)->>'status') = 'live');
select ow_ok('it carries the school, the sticker and the dear line, cleaned',
  ((select r from ow_first)->>'campus') = 'berkeley'
  and ((select r from ow_first)->>'school') = 'UC Berkeley'
  and ((select r from ow_first)->>'verified')::boolean
  and ((select r from ow_first)->>'salutation') = 'dear sofia'
  and ((select r from ow_first)->>'handle') = 'ow_target'
  and ((select r from ow_first)->'look') = '{"tint":"amber"}'::jsonb);
select ow_ok('and the row says the same',
  (select verified and salutation = 'dear sofia' and nonce = 'nonce-ow-first' and campus = 'berkeley'
     from wall_letters where id = ((select r from ow_first)->>'id')::uuid));

select ow_ok('the same draft sent again is the same letter',
  (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target', null, 'a different body', 'nonce-ow-first')->>'id')
    = ((select r from ow_first)->>'id')
  and (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target', null, 'a different body', 'nonce-ow-first')->>'replay')::boolean
  and (select count(*) from wall_letters where target_handle = 'ow_target') = 1
  and (select body from wall_letters where id = ((select r from ow_first)->>'id')::uuid) like 'you lent me%');
select ow_ok('and wall_write_replay answers it before any reading',
  (wall_write_replay('token-ow-bw-00000000000', 'nonce-ow-first')->>'id') = ((select r from ow_first)->>'id')
  and wall_write_replay('token-ow-bw-00000000000', 'nonce-ow-never') is null
  and wall_write_replay('token-ow-nobody-0000000', 'nonce-ow-first') is null);
select ow_ok('the same nonce from somebody else is their own letter',
  (ow_w('token-ow-pw-00000000000', 'handle', 'ow_target', null, 'the pass writes too', 'nonce-ow-first')->>'id')
    <> ((select r from ow_first)->>'id'));
select ow_ok('a pass writes from berkeley, verified',
  (select campus = 'berkeley' and verified from wall_letters
    where target_handle = 'ow_target' and author_id = (select id from celestual_users where edu_email = 'pw@gmail.com')));
select ow_ok('a draft with no nonce is refused',
  (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target', null, 'x', null)->>'error') = 'nonce'
  and (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target', null, 'x', 'short')->>'error') = 'nonce'
  and (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target', null, 'x', 'has a space in it')->>'error') = 'nonce');
select ow_ok('a dear line over forty characters is refused, not cut',
  (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target', null, 'x', 'nonce-ow-long',
        'live', null, repeat('a', 41))->>'error') = 'salutation');
select ow_ok('a blank dear line is none',
  (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target2', null, 'x', 'nonce-ow-blank',
        'live', null, '   ')->'salutation') = 'null'::jsonb);
select ow_ok('an empty body is refused',
  (ow_w('token-ow-bw-00000000000', 'handle', 'ow_target', null, '   ', 'nonce-ow-empty')->>'error') = 'empty');
select ow_ok('the schema holds the dear line to its cleaning',
  (select count(*) from wall_letters where salutation is not null and salutation <> wall_salutation_clean(salutation)) = 0);
do $$
begin
  begin
    update wall_letters set salutation = ' two  spaces ' where target_handle = 'ow_target';
    raise exception 'FAIL  an uncleaned dear line was stored';
  exception when check_violation then
    raise notice 'PASS  an uncleaned dear line cannot be stored';
  end;
end $$;

-- ── 3. a name note ──────────────────────────────────────────────────────────
create temp table ow_name as
  select ow_w('token-ow-new-0000000000', 'name', null, 'Sofía R', 'saw you at the 51b stop every week',
              'nonce-ow-name1', 'pending') as r;
select ow_ok('a device never seen writes a name note',
  ((select r from ow_name)->>'ok')::boolean and ((select r from ow_name)->>'status') = 'pending');
select ow_ok('with no campus picked it stands at the root, with no school and no sticker',
  ((select r from ow_name)->>'campus') = 'global'
  and (select r from ow_name)->'school' = 'null'::jsonb
  and not ((select r from ow_name)->>'verified')::boolean);
select ow_ok('its author is a bare row with a session, and proves nothing',
  (select u.instagram_handle is null and u.edu_email is null and not celestual_user_proved(u.id)
     from wall_letters l join celestual_users u on u.id = l.author_id
    where l.id = ((select r from ow_name)->>'id')::uuid));
select ow_ok('the writer sees it being read',
  (select x->>'status' = 'pending' and x->>'down_by' = 'held' and x->>'campus' = 'global'
          and not (x->>'verified')::boolean
     from jsonb_array_elements(wall_mine('token-ow-new-0000000000')->'letters') x
    where x->>'id' = (select r from ow_name)->>'id'));
select ow_w('token-ow-new-0000000000', 'name', null, 'Juno', 'hello', 'nonce-ow-name2', 'live', 'stanford');
select ow_ok('and a second name note from the device is the same author',
  (select author_id from wall_letters where nonce = 'nonce-ow-name2')
  = (select author_id from wall_letters where id = ((select r from ow_name)->>'id')::uuid));
select ow_ok('a picked campus that is open is the letter''s',
  (select campus = 'stanford' and not verified from wall_letters where nonce = 'nonce-ow-name2'));
select ow_ok('a picked campus that is closed, or none at all, is the root',
  (ow_w('token-ow-new-0000000000', 'name', null, 'Ari', 'hi', 'nonce-ow-name3', 'live', 'ucsd')->>'campus') = 'global'
  and (ow_w('token-ow-new-0000000000', 'name', null, 'Ari', 'hi', 'nonce-ow-name4', 'live', 'nowhere')->>'campus') = 'global');
select ow_ok('a name note is never verified, whoever writes it',
  not (ow_w('token-ow-bw-00000000000', 'name', null, 'Juno', 'from berkeley', 'nonce-ow-name5', 'live', 'berkeley')->>'verified')::boolean);
select ow_ok('a name that is not one is refused',
  (ow_w('token-ow-new-0000000000', 'name', null, '@juno', 'hi', 'nonce-ow-name6')->>'error') = 'name');
select ow_ok('a token too short to be a device is no session',
  (ow_w('short', 'name', null, 'Juno', 'hi', 'nonce-ow-name7')->>'error') = 'no_session');

-- a name the desk shut on the campus wall is shut on the root
select wall_write('token-ow-bw-00000000000', null, 'to the one who shut it', null, null,
                  'berkeley', 'live', '{}'::jsonb, 'name', 'Shutname', null::jsonb);
-- the desk's mark, as celestual_desk_name_shut (0039) writes it; that function
-- keys through celestual_norm, which does not take a name key, so it is set here
update wall_letters
   set status = 'removed',
       moderation = coalesce(moderation, '{}'::jsonb)
         || '{"desk":{"status":"removed","via":"desk_shut","note":"test"}}'::jsonb
 where target_handle = '~shutname' and campus = 'berkeley';
select ow_ok('a name the desk shut on one campus is shut on every one',
  (ow_w('token-ow-new-0000000000', 'name', null, 'Shutname', 'again', 'nonce-ow-shut', 'live', null)->>'error') = 'removed'
  and wall_name_shut_any('~shutname') and not wall_name_shut('~shutname', 'global'));

-- the allowance, when the desk turns it on
update celestual_settings set value = 'true' where key = 'wall_letter_cap';
insert into celestual_settings (key, value) values ('wall_letter_allowance', '2')
  on conflict (key) do update set value = '2';
select ow_ok('the allowance counts v2 writes',
  (ow_w('token-ow-capped-00000000', 'name', null, 'Kai', 'one', 'nonce-ow-cap1')->>'ok')::boolean
  and (ow_w('token-ow-capped-00000000', 'name', null, 'Kai', 'two', 'nonce-ow-cap2')->>'ok')::boolean
  and (ow_w('token-ow-capped-00000000', 'name', null, 'Kai', 'three', 'nonce-ow-cap3')->>'error') = 'cap');
select ow_ok('and a draft already sent is still answered once the allowance is spent',
  (ow_w('token-ow-capped-00000000', 'name', null, 'Kai', 'one', 'nonce-ow-cap1')->>'replay')::boolean);
update celestual_settings set value = 'false' where key = 'wall_letter_cap';

select ow_ok('the old writes stand',
  (wall_write('token-ow-bw-00000000000', 'ow_old', 'the eight argument write', null, null,
              'berkeley', 'live', '{}')->>'ok')::boolean);
select ow_ok('and write none of the new columns',
  (select not verified and salutation is null and nonce is null from wall_letters where target_handle = 'ow_old'));
select ow_ok('the v2 write is the service role''s alone',
  not has_function_privilege('anon',
    'wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)', 'EXECUTE')
  and not has_function_privilege('authenticated',
    'wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_write_replay(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_session_user_or_new(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_name_throttle_take(text, text)', 'EXECUTE'));

-- ── 4. the throttle ─────────────────────────────────────────────────────────
select ow_ok('five name notes a device a day',
  (select bool_and(wall_name_throttle_take('token-ow-throttle-0000', '10.0.0.1')) from generate_series(1, 5))
  and not wall_name_throttle_take('token-ow-throttle-0000', '10.0.0.1'));
select ow_ok('twenty an address, whatever the device',
  (select bool_and(wall_name_throttle_take('token-ow-throttle-' || lpad(i::text, 5, '0'), '10.0.0.2'))
     from generate_series(1, 20) i)
  and not wall_name_throttle_take('token-ow-throttle-99999', '10.0.0.2'));
select ow_ok('and another address is not held by the first',
  wall_name_throttle_take('token-ow-throttle-88888', '10.0.0.3'));
select ow_ok('the throttle''s rows are the service role''s',
  (select relrowsecurity from pg_class where relname = 'wall_name_throttle')
  and not has_table_privilege('anon', 'wall_name_throttle', 'SELECT'));

-- ── 5. the reads ────────────────────────────────────────────────────────────
select ow_ok('the letters for a key carry verified, the dear line and the school',
  (select bool_and((x ? 'verified') and (x ? 'salutation') and (x ? 'school'))
     from jsonb_array_elements(wall_letters_for('token-ow-bw-00000000000', 'ow_target')->'letters') x)
  and exists (select 1 from jsonb_array_elements(wall_letters_for('token-ow-bw-00000000000', 'ow_target')->'letters') x
               where x->>'salutation' = 'dear sofia' and (x->>'verified')::boolean and x->>'school' = 'UC Berkeley'));
select ow_ok('one letter carries them',
  (wall_letter('token-ow-bw-00000000000', ((select r from ow_first)->>'id')::uuid)->'letter'->>'school') = 'UC Berkeley'
  and (wall_letter('token-ow-bw-00000000000', ((select r from ow_first)->>'id')::uuid)->'letter'->>'salutation') = 'dear sofia'
  and (wall_letter('token-ow-bw-00000000000', ((select r from ow_first)->>'id')::uuid)->'letter'->>'verified')::boolean);
select ow_ok('the writer''s list carries them, with the campus and the status',
  exists (select 1 from jsonb_array_elements(wall_mine('token-ow-bw-00000000000')->'letters') x
           where x->>'id' = (select r from ow_first)->>'id' and x->>'status' = 'live'
             and x->>'campus' = 'berkeley' and x->>'school' = 'UC Berkeley' and (x->>'verified')::boolean));
select ow_ok('the root''s letters have no school',
  exists (select 1 from jsonb_array_elements(wall_letters_for(null, '~ari')->'letters') x
           where x->>'campus' = 'global' and x->'school' = 'null'::jsonb));
select ow_ok('a letter still carries every key it carried',
  (select bool_and(x ?& array['id', 'handle', 'kind', 'name', 'look', 'body', 'words', 'chars', 'has_seal',
                              'campus', 'at', 'expires', 'hearts', 'hearted'])
     from jsonb_array_elements(wall_letters_for('token-ow-bw-00000000000', 'ow_target')->'letters') x));

-- a name written to from two schools
select wall_write('token-ow-bw-00000000000', null, 'from berkeley', null, null,
                  'berkeley', 'live', '{}'::jsonb, 'name', 'Twocampus', null::jsonb);
update wall_letters set created_at = now() - interval '1 hour' where target_handle = '~twocampus';
select ow_w('token-ow-new-0000000000', 'name', null, 'Twocampus', 'from stanford', 'nonce-ow-two', 'live', 'stanford');
select ow_ok('the old index keeps a disc a campus',
  (select count(*) from wall_index where target_handle = '~twocampus') = 2);
select ow_ok('the one wall''s index keeps one, as the newest letter stands',
  (select count(*) from wall_index_all where target_handle = '~twocampus') = 1
  and (select campus = 'stanford' and letters = 2 and not verified and school = 'Stanford'
         from wall_index_all where target_handle = '~twocampus'));
select ow_ok('a verified letter''s disc says so',
  (select verified and school = 'UC Berkeley' and campus = 'berkeley'
     from wall_index_all where target_handle = 'ow_target'));
select ow_ok('the one wall''s index has no body, author, seal or dear line',
  not exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'wall_index_all'
                 and column_name in ('body', 'author_id', 'sealed_line', 'moderation', 'salutation', 'nonce')));
select ow_ok('and the browser reads it',
  has_table_privilege('anon', 'wall_index_all', 'SELECT'));
select ow_ok('the pulse counts the one wall',
  (wall_pulse_all()->>'names')::int = (select count(*) from wall_index_all)
  and (wall_pulse_all()->>'letters')::int = (select sum(letters) from wall_index_all));
select ow_ok('the search reads the one wall, once a key',
  jsonb_array_length((select jsonb_agg(x) from jsonb_array_elements(wall_search('twocampus')) x
                       where x->>'handle' = '~twocampus')) = 1);
select ow_ok('and its answers carry verified, the school and the dear line',
  exists (select 1 from jsonb_array_elements(wall_search('ow_target')) x
           where x->>'handle' = 'ow_target' and (x->>'verified')::boolean
             and x->>'school' = 'UC Berkeley' and (x ? 'salutation')));

-- ── 6. sessions ─────────────────────────────────────────────────────────────
do $$
declare u uuid;
begin
  insert into celestual_users default values returning id into u;
  perform ow_session(u, 'token-ow-slide-00000000');
  perform ow_ok('a bind opens a session for a year',
    (select expires_at > now() + interval '364 days' from celestual_sessions
      where token_hash = encode(extensions.digest('token-ow-slide-00000000', 'sha256'), 'hex')));
  update celestual_sessions set expires_at = now() + interval '20 days'
   where token_hash = encode(extensions.digest('token-ow-slide-00000000', 'sha256'), 'hex');
  perform ow_ok('a session in use is found', celestual_session_user('token-ow-slide-00000000') = u);
  perform ow_ok('and slides to a year',
    (select expires_at > now() + interval '364 days' from celestual_sessions
      where token_hash = encode(extensions.digest('token-ow-slide-00000000', 'sha256'), 'hex')));
  update celestual_sessions set expires_at = now() + interval '340 days'
   where token_hash = encode(extensions.digest('token-ow-slide-00000000', 'sha256'), 'hex');
  perform celestual_session_user('token-ow-slide-00000000');
  perform ow_ok('a session with most of its year left is not rewritten',
    (select expires_at < now() + interval '341 days' from celestual_sessions
      where token_hash = encode(extensions.digest('token-ow-slide-00000000', 'sha256'), 'hex')));
  update celestual_sessions set expires_at = now() - interval '1 minute'
   where token_hash = encode(extensions.digest('token-ow-slide-00000000', 'sha256'), 'hex');
  perform ow_ok('an expired session is nobody', celestual_session_user('token-ow-slide-00000000') is null);
end $$;
select ow_ok('a device never seen is given a row, once',
  celestual_session_user_or_new('token-ow-fresh-00000000') = celestual_session_user_or_new('token-ow-fresh-00000000')
  and celestual_session_user('token-ow-fresh-00000000') is not null);
select ow_ok('and a device that is somebody stays them',
  celestual_session_user_or_new('token-ow-bw-00000000000') = (select id from celestual_users where edu_email = 'bw@berkeley.edu'));
select ow_ok('a token that is not one is nobody', celestual_session_user_or_new('short') is null);

-- ── 7. the owner takes it down ──────────────────────────────────────────────
create temp table ow_mine as
  select (ow_w('token-ow-bw-00000000000', 'handle', 'ow_owner', null, 'about you, and not unkind', 'nonce-ow-own')->>'id')::uuid as id;
select ow_ok('a person without a session cannot take a letter down',
  (wall_owner_remove('token-ow-nobody-0000000', (select id from ow_mine))->>'error') = 'no_session');
select ow_ok('nor can anybody but the owner of the @',
  (wall_owner_remove('token-ow-bw-00000000000', (select id from ow_mine))->>'error') = 'unverified');
create temp table ow_down as
  select wall_owner_remove('token-ow-owner-00000000', (select id from ow_mine)) as r;
select ow_ok('the owner takes it down, with a day to undo',
  ((select r from ow_down)->>'ok')::boolean
  and ((select r from ow_down)->>'undo_until')::timestamptz between now() + interval '23 hours' and now() + interval '25 hours');
select ow_ok('it is down, marked as the owner''s, and no claim was filed',
  (select status = 'removed' and moderation #>> '{desk,via}' = 'owner' from wall_letters where id = (select id from ow_mine))
  and not exists (select 1 from wall_claims where letter_id = (select id from ow_mine)));
select ow_ok('so the name is not shut, and the next letter to it goes up',
  not wall_name_shut_any('ow_owner')
  and (ow_w('token-ow-pw-00000000000', 'handle', 'ow_owner', null, 'another', 'nonce-ow-own2')->>'status') = 'live');
select ow_ok('the writer''s list says a reader took it down, and nothing about who',
  (select x->>'down_by' from jsonb_array_elements(wall_mine('token-ow-bw-00000000000')->'letters') x
    where x->>'id' = (select id from ow_mine)::text) = 'report');
select ow_ok('the screen landing late leaves it down',
  (wall_screened((select id from ow_mine), 'pass', '[]'::jsonb, 'test')->>'status') = 'removed');
select ow_ok('taking it down twice is the same answer',
  (wall_owner_remove('token-ow-owner-00000000', (select id from ow_mine))->>'ok')::boolean);
select ow_ok('the owner puts it back',
  (wall_owner_restore('token-ow-owner-00000000', (select id from ow_mine))->>'ok')::boolean);
select ow_ok('up again, with no mark left on it',
  (select status = 'live' and not (moderation ? 'desk') from wall_letters where id = (select id from ow_mine)));
select ow_ok('nobody else can',
  (wall_owner_restore('token-ow-bw-00000000000', (select id from ow_mine))->>'error') = 'unverified');
select wall_owner_remove('token-ow-owner-00000000', (select id from ow_mine));
update wall_letters set moderation = jsonb_set(moderation, '{desk,undo_until}', to_jsonb(now() - interval '1 minute'))
 where id = (select id from ow_mine);
select ow_ok('after a day it stays down',
  (wall_owner_restore('token-ow-owner-00000000', (select id from ow_mine))->>'error') = 'expired');
select celestual_desk_letter_set((select id from wall_letters where nonce = 'nonce-ow-own2'), 'live', 'looked at');
select wall_owner_down((select id from wall_letters where nonce = 'nonce-ow-own2'), 'owner');
select ow_ok('a desk decision is kept under the owner''s mark',
  (select moderation #>> '{desk,via}' = 'owner' and moderation #>> '{desk,prev,note}' = 'looked at'
     from wall_letters where nonce = 'nonce-ow-own2'));
select wall_owner_up((select id from wall_letters where nonce = 'nonce-ow-own2'));
select ow_ok('and is the desk''s again once the letter is back',
  (select status = 'live' and moderation #>> '{desk,status}' = 'live' and moderation #>> '{desk,note}' = 'looked at'
     from wall_letters where nonce = 'nonce-ow-own2'));
select ow_ok('a name note has no owner to take it down',
  (wall_owner_remove('token-ow-owner-00000000', ((select r from ow_name)->>'id')::uuid)->>'error') = 'unverified');
select ow_ok('the browser may call both',
  has_function_privilege('anon', 'wall_owner_remove(text, uuid)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_owner_restore(text, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_owner_down(uuid, text)', 'EXECUTE'));

-- ── 8. ember is amber ───────────────────────────────────────────────────────
select ow_ok('no letter is lit in ember', not exists (select 1 from wall_letters where look->>'tint' = 'ember'));
select ow_ok('and the record of the move is the service role''s',
  (select relrowsecurity from pg_class where relname = 'wall_look_backup_0063')
  and not has_table_privilege('anon', 'wall_look_backup_0063', 'SELECT'));
select ow_ok('every @-note from a campus carries the sticker',
  not exists (select 1 from wall_letters
               where target_kind = 'handle' and campus <> 'global' and not verified and nonce is not null));

-- ── 9. the private note ─────────────────────────────────────────────────────
select ow_ok('a card holds a letter''s 280 characters',
  char_length(celestual_card_clean(jsonb_build_object('words', repeat('abcdefghi ', 40)))->>'words') <= 280
  and char_length(celestual_card_clean(jsonb_build_object('words', repeat('abcdefghi ', 27)))->>'words') = 269);
select ow_ok('and eighty words',
  array_length(regexp_split_to_array(celestual_card_clean(jsonb_build_object('words', repeat('a ', 100)))->>'words', ' '), 1) = 80);
select ow_ok('and still takes the old cards as they were',
  celestual_card_clean('{"words":"you are the reason","bg":"hide","face":"mono"}'::jsonb)
    = '{"words":"you are the reason","bg":"hide","face":"mono","x":0.5,"y":0.5,"tone":1}'::jsonb);
select ow_ok('the list catches what the wall''s list catches',
  celestual_text_caught('call me 510 555 0199') = array['phone']
  and celestual_text_caught('see insta.com/me') = array['url']
  and 'email' = any(celestual_text_caught('write to me@there.org'))
  and celestual_text_caught('you f4gg0t') = array['slur']
  and celestual_text_caught('2400 durant ave') = array['address']
  and celestual_text_caught('i am in room 204') = array['room']);
select ow_ok('and leaves a sentence alone',
  cardinality(celestual_text_caught('since 2019. 2020 was the year i met you, on the 51b')) = 0
  and cardinality(celestual_text_caught('소피아, 보고 싶어')) = 0);

create or replace function ow_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest(p_proof, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;
select ow_proof('ow_ping_a', 'proof-ow-a');
select ow_proof('ow_ping_b', 'proof-ow-b');

select ow_ok('a private note the list catches is refused, with the list''s word',
  (celestual_submit('ow_ping_a', 'ow_ping_b', null, 'proof-ow-a',
     '{"words":"text me 510 555 0199 tonight"}'::jsonb)->>'error') = 'card'
  and (celestual_submit('ow_ping_a', 'ow_ping_b', null, 'proof-ow-a',
     '{"words":"text me 510 555 0199 tonight"}'::jsonb)->'reasons') = '["phone"]'::jsonb);
select ow_ok('and nothing was placed',
  not exists (select 1 from celestual_entries where from_handle = 'ow_ping_a'));

create temp table ow_note as select rtrim(repeat('you were the only one who laughed at the right part. ', 5)) as words;
select ow_ok('a note of a letter''s length is placed',
  char_length((select words from ow_note)) between 250 and 280
  and (celestual_submit('ow_ping_a', 'ow_ping_b', null, 'proof-ow-a',
         jsonb_build_object('words', (select words from ow_note)))->>'recorded')::boolean);
create temp table ow_match as
  select celestual_submit('ow_ping_b', 'ow_ping_a', null, 'proof-ow-b', null) as r;
select ow_ok('the other side hears it whole on the mutual',
  ((select r from ow_match)->>'mutual')::boolean
  and ((select r from ow_match)->'match_card'->>'words') = (select words from ow_note));
select ow_ok('and reads it whole on their sky',
  exists (select 1 from jsonb_array_elements(celestual_my_pings('ow_ping_b', 'proof-ow-b')->'pings') x
           where x->>'handle' = 'ow_ping_a' and x->'their_card'->>'words' = (select words from ow_note)));

rollback;
