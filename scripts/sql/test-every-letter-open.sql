-- ─────────────────────────────────────────────────────────────────────────────
-- test-every-letter-open.sql: exercises 0066_every_letter_open.sql.
--
-- The two rulings of 26 September as properties of the schema. Reading is
-- never sealed: every live letter's words travel to anybody, as many as they
-- read, and the record that counted the eight is gone. And anybody writes to
-- an @: with no proof the note is written where the screen put it (held for
-- the desk, up on a pass, never on a reject), carries no school and no
-- sticker; from a Berkeley address it is the verified one, up at once. The
-- search still finds either by its @, typed with the @ or without.
-- Run through scripts/verify-migrations.sh --test. Everything is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function eo_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function eo_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- The write with its proof, by name, the way the edge function calls it.
create or replace function eo_w(
  p_token text, p_kind text, p_target text, p_name text, p_body text, p_nonce text,
  p_proof text, p_status text default 'live', p_pick text default null, p_sal text default null)
returns jsonb language sql as $$
  select wall_write(p_token => p_token, p_kind => p_kind, p_target => p_target, p_name => p_name,
                    p_salutation => p_sal, p_body => p_body, p_look => '{"tint":"rose"}'::jsonb,
                    p_campus_pick => p_pick, p_source => null, p_status => p_status,
                    p_moderation => '{"verdict":"pass","reasons":[],"before":true}'::jsonb,
                    p_nonce => p_nonce, p_proof => p_proof)
$$;

-- and as the edge function already deployed calls it: twelve arguments
create or replace function eo_w12(p_token text, p_target text, p_body text, p_nonce text)
returns jsonb language sql as $$
  select wall_write(p_token => p_token, p_kind => 'handle', p_target => p_target, p_name => null,
                    p_salutation => null, p_body => p_body, p_look => null,
                    p_campus_pick => null, p_source => null, p_status => 'live',
                    p_moderation => '{"verdict":"unread","reasons":[]}'::jsonb, p_nonce => p_nonce)
$$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;
insert into celestual_settings (key, value) values ('wall_letter_cap', 'false')
  on conflict (key) do update set value = 'false';

-- ── the cast ────────────────────────────────────────────────────────────────
-- bw     a berkeley address. Writes the verified @-note.
-- ig     a proved handle and nothing else.
-- and a device never seen, token-eo-new-..., which is who the open note is for.
do $$
declare bw uuid; ig uuid; w uuid; i int;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('eo-bw@berkeley.edu', now()) returning id into bw;
  insert into celestual_users (instagram_handle, handle_verified_at) values ('eo_reader', now()) returning id into ig;
  perform eo_session(bw, 'token-eo-bw-00000000000');
  perform eo_session(ig, 'token-eo-ig-00000000000');

  -- twenty letters under one name, more than any allowance ever was
  insert into celestual_users (edu_email, edu_verified_at) values ('eo-many@berkeley.edu', now()) returning id into w;
  for i in 1..20 loop
    insert into wall_letters (target_handle, body, author_id, campus, status, created_at)
    values ('eo_many', 'the letter numbered ' || i, w, 'berkeley', 'live', now() - (i || ' minutes')::interval);
  end loop;
end $$;

-- ── 1. reading is never sealed ──────────────────────────────────────────────
select eo_ok('twenty letters are up under one name',
  jsonb_array_length(wall_letters_for(null, 'eo_many')->'letters') = 20);
select eo_ok('nobody at all is handed every one of them whole',
  (select bool_and(x->>'body' like 'the letter numbered %')
     from jsonb_array_elements(wall_letters_for(null, 'eo_many')->'letters') x));
select eo_ok('so is a device never seen, again and again',
  (select bool_and(x->>'body' is not null)
     from generate_series(1, 3) g,
          jsonb_array_elements(wall_letters_for('token-eo-stranger-000000', 'eo_many')->'letters') x));
select eo_ok('and one letter alone, the twentieth, to a stranger',
  (wall_letter('token-eo-stranger-000000',
     (select id from wall_letters where target_handle = 'eo_many' order by created_at limit 1)
   )->'letter'->>'body') = 'the letter numbered 20');
select eo_ok('the read says open, and carries no gate and no count',
  (wall_letters_for(null, 'eo_many')->>'open')::boolean
  and not (wall_letters_for(null, 'eo_many') ? 'free')
  and not (wall_letters_for(null, 'eo_many') ? 'gated')
  and not (wall_letter(null, (select id from wall_letters where target_handle = 'eo_many' limit 1)) ? 'free'));
select eo_ok('a letter still carries the keys it carried',
  (select bool_and(x ?& array['id', 'handle', 'kind', 'name', 'look', 'body', 'words', 'chars', 'has_seal',
                              'campus', 'at', 'expires', 'hearts', 'hearted', 'verified', 'salutation', 'school'])
     from jsonb_array_elements(wall_letters_for(null, 'eo_many')->'letters') x));
select eo_ok('the record that counted the eight is gone',
  to_regclass('public.wall_free_reads') is null);
select eo_ok('and what kept it answers that every letter is free',
  wall_free_take(wall_free_key('token-eo-stranger-000000'), gen_random_uuid())
  and wall_free_used(wall_free_key('token-eo-stranger-000000')) = 0
  and wall_free_allowance() is null
  and wall_free_state(wall_free_key('token-eo-stranger-000000'), false) is null);
select eo_ok('and none of it is the browser''s to call',
  not has_function_privilege('anon', 'wall_free_take(text, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_free_state(text, boolean)', 'EXECUTE'));
select eo_ok('the browser still reads both',
  has_function_privilege('anon', 'wall_letters_for(text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_letter(text, uuid)', 'EXECUTE'));
select eo_ok('and the heart still asks for a proof, which reading no longer does',
  wall_read_gate(null, 'berkeley') = false
  and wall_read_gate((select id from celestual_users where instagram_handle = 'eo_reader'), 'global'));

-- ── 2. an @-note from anybody ───────────────────────────────────────────────
create temp table eo_held as
  select eo_w('token-eo-new-00000000000', 'handle', '@EO_Target', null,
              'you were the only one who laughed at the right part', 'nonce-eo-held',
              'none', 'pending', 'berkeley', 'dear sofia') as r;
select eo_ok('a device never seen writes to an @ with no proof',
  ((select r from eo_held)->>'ok')::boolean and ((select r from eo_held)->>'handle') = 'eo_target');
select eo_ok('held for the desk where the screen put it',
  ((select r from eo_held)->>'status') = 'pending');
select eo_ok('never verified, no school whatever it picked, and the dear line kept',
  not ((select r from eo_held)->>'verified')::boolean
  and ((select r from eo_held)->>'campus') = 'global'
  and (select r from eo_held)->'school' = 'null'::jsonb
  and ((select r from eo_held)->>'salutation') = 'dear sofia');
select eo_ok('an author was made for the device, and it proves nothing',
  (select not celestual_user_proved(author_id) from wall_letters
    where id = ((select r from eo_held)->>'id')::uuid));
select eo_ok('held, it is on no read, no index and no search',
  jsonb_array_length(wall_letters_for(null, 'eo_target')->'letters') = 0
  and not exists (select 1 from wall_index_all where target_handle = 'eo_target')
  and not exists (select 1 from jsonb_array_elements(wall_search('eo_target')) x where x->>'handle' = 'eo_target'));
select eo_ok('the writer''s own list says it is being read',
  exists (select 1 from jsonb_array_elements(wall_mine('token-eo-new-00000000000')->'letters') x
           where x->>'id' = (select r from eo_held)->>'id' and x->>'status' = 'pending'
             and x->>'down_by' = 'held'));
select eo_ok('the same draft sent again is the same letter',
  (eo_w('token-eo-new-00000000000', 'handle', 'eo_target', null, 'another body', 'nonce-eo-held', 'none', 'live')->>'id')
    = (select r from eo_held)->>'id'
  and (select count(*) from wall_letters where target_handle = 'eo_target') = 1);

select celestual_desk_letter_set(((select r from eo_held)->>'id')::uuid, 'live', 'read, and fine');
select eo_ok('the desk passes it, and it publishes',
  (wall_letters_for(null, 'eo_target')->'letters'->0->>'body')
    = 'you were the only one who laughed at the right part');
select eo_ok('as an open note: no sticker on it',
  not (wall_letters_for(null, 'eo_target')->'letters'->0->>'verified')::boolean
  and (wall_letters_for(null, 'eo_target')->'letters'->0->>'campus') = 'global');

create temp table eo_pass as
  select eo_w('token-eo-new-00000000000', 'handle', 'eo_passed', null,
              'the screen read this one first', 'nonce-eo-pass', 'none', 'live') as r;
select eo_ok('a note the screen passed goes up at once',
  ((select r from eo_pass)->>'status') = 'live'
  and (wall_letters_for(null, 'eo_passed')->'letters'->0->>'body') = 'the screen read this one first');

create temp table eo_rej as
  select eo_w('token-eo-new-00000000000', 'handle', 'eo_refused', null,
              'the screen refused this one', 'nonce-eo-rej', 'none', 'rejected') as r;
select eo_ok('a note the screen refused is written and never goes up',
  ((select r from eo_rej)->>'status') = 'rejected'
  and jsonb_array_length(wall_letters_for(null, 'eo_refused')->'letters') = 0
  and not exists (select 1 from wall_index_all where target_handle = 'eo_refused'));

select eo_ok('a proof the write does not know is refused',
  (eo_w('token-eo-new-00000000000', 'handle', 'eo_target', null, 'x', 'nonce-eo-what', 'maybe')->>'error') = 'proof');
-- (a statement does not see what a function it calls inserted, so the write
-- and the look at the row are two statements)
create temp table eo_name as
  select eo_w('token-eo-new-00000000000', 'name', null, 'Ximena', 'to a name', 'nonce-eo-name',
              'edu', 'live', 'berkeley') as r;
select eo_ok('a name note is an open note whatever proof it says, and keeps its picked school',
  ((select r from eo_name)->>'campus') = 'berkeley'
  and not ((select r from eo_name)->>'verified')::boolean
  and not (select verified from wall_letters where nonce = 'nonce-eo-name'));

-- ── 3. the one from Berkeley ────────────────────────────────────────────────
create temp table eo_cal as
  select eo_w('token-eo-bw-00000000000', 'handle', 'eo_target', null,
              'from a berkeley address', 'nonce-eo-cal', 'edu', 'live') as r;
select eo_ok('a Berkeley address writes the verified one, up at once',
  ((select r from eo_cal)->>'status') = 'live'
  and ((select r from eo_cal)->>'verified')::boolean
  and ((select r from eo_cal)->>'campus') = 'berkeley'
  and ((select r from eo_cal)->>'school') = 'UC Berkeley');
select eo_ok('and it stands beside the open one under the same @',
  jsonb_array_length(wall_letters_for(null, 'eo_target')->'letters') = 2
  and (select count(*) filter (where (x->>'verified')::boolean) = 1
          and count(*) filter (where not (x->>'verified')::boolean) = 1
         from jsonb_array_elements(wall_letters_for(null, 'eo_target')->'letters') x));
select eo_ok('the verified path still asks a device with no address for one',
  (eo_w('token-eo-nobody-000000000', 'handle', 'eo_target', null, 'x', 'nonce-eo-edu1', 'edu')->>'error') = 'edu'
  and (eo_w('token-eo-ig-00000000000', 'handle', 'eo_target', null, 'x', 'nonce-eo-edu2', 'edu')->>'error') = 'edu');
select eo_ok('the twelve argument write is still that path, for the deployed function',
  (eo_w12('token-eo-nobody-000000000', 'eo_target', 'x', 'nonce-eo-edu3')->>'error') = 'edu'
  and (eo_w12('token-eo-bw-00000000000', 'eo_twelve', 'the old way', 'nonce-eo-edu4')->>'verified')::boolean);
select eo_ok('and the refusals wrote nothing',
  not exists (select 1 from wall_letters where nonce in ('nonce-eo-edu1', 'nonce-eo-edu2', 'nonce-eo-edu3', 'nonce-eo-what')));

-- ── 4. the search still hears the @ ─────────────────────────────────────────
select eo_ok('typed with its @, the search finds the name first',
  (wall_search('@eo_target')->0->>'handle') = 'eo_target');
select eo_ok('typed without it, and in capitals, too',
  (wall_search('eo_target')->0->>'handle') = 'eo_target'
  and (wall_search('EO_Target')->0->>'handle') = 'eo_target');
select eo_ok('and the start of it lands on it',
  exists (select 1 from jsonb_array_elements(wall_search('eo_tar')) x where x->>'handle' = 'eo_target'));
select eo_ok('the open note''s @ is found as well as the verified one''s',
  (wall_search('eo_passed')->0->>'handle') = 'eo_passed');

-- ── 5. who may call what ────────────────────────────────────────────────────
select eo_ok('the browser cannot write, by either signature',
  not has_function_privilege('anon', 'wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)', 'EXECUTE'));
select eo_ok('the edge function can',
  has_function_privilege('service_role', 'wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text, text)', 'EXECUTE')
  and has_function_privilege('service_role', 'wall_write(text, text, text, text, text, text, jsonb, text, text, text, jsonb, text)', 'EXECUTE'));

rollback;
