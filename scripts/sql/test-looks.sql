-- ─────────────────────────────────────────────────────────────────────────────
-- test-looks.sql: exercises 0055_the_letter_has_a_look.sql.
--
-- A look is three slugs or nothing, the write cleans it before it stores it,
-- the constraint refuses anything else, every read carries it, the index and
-- the search carry the newest letter's under a key, and a name can be one
-- letter, a number or five words while a handle, a link and a command still
-- cannot be one. Run through scripts/verify-migrations.sh --test. Self
-- contained cast, named apart from test-names.sql's.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function lk_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function lk_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the one opinion on a look ────────────────────────────────────────────────
select lk_ok('nothing is nothing', wall_look_clean(null) is null);
select lk_ok('an empty object is nothing', wall_look_clean('{}'::jsonb) is null);
select lk_ok('a string is nothing', wall_look_clean('"nokia"'::jsonb) is null);
select lk_ok('the plain paper is nothing', wall_look_clean('{"theme":"paper"}'::jsonb) is null);
select lk_ok('three slugs come through and a fourth key does not',
  wall_look_clean('{"theme":"nokia","tint":"moss","face":"pixel","url":"https://x"}'::jsonb)
    = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb);
select lk_ok('a slug that is not a slug is dropped and the rest stay',
  wall_look_clean('{"theme":"nokia","tint":"bad tint","face":"Pixel!"}'::jsonb) = '{"theme":"nokia"}'::jsonb);
select lk_ok('a colour is not a slug', wall_look_clean('{"tint":"#ff00aa"}'::jsonb) is null);
select lk_ok('a slug is at most twenty four characters',
  wall_look_clean(jsonb_build_object('theme', repeat('a', 25))) is null
  and wall_look_clean(jsonb_build_object('theme', repeat('a', 24))) is not null);
select lk_ok('cleaning is idempotent',
  wall_look_clean(wall_look_clean('{"theme":"y2k","face":"round"}'::jsonb)) = '{"theme":"y2k","face":"round"}'::jsonb);

-- ── a name of any kind ───────────────────────────────────────────────────────
select lk_ok('one letter is a name', wall_name_clean('J') = 'J' and wall_name_key('J') = '~j');
select lk_ok('a number is a name', wall_name_clean('51B') = '51B' and wall_name_key('51B') = '~51b');
select lk_ok('five words are a name', wall_name_clean('the girl on the 51B') = 'the girl on the 51B'
  and wall_name_key('the girl on the 51B') = '~thegirlonthe51b');
select lk_ok('six words are not', wall_name_clean('the girl on the 51B bus') is null);
select lk_ok('a nickname keeps its punctuation', wall_name_clean('O''Brien-Smith Jr.') = 'O''Brien-Smith Jr.'
  and wall_name_key('O''Brien-Smith Jr.') = '~obriensmithjr');
select lk_ok('an @ is still not a name', wall_name_clean('@sofia') is null);
select lk_ok('an underscore is still not a name', wall_name_clean('sofia_r') is null);
select lk_ok('a slash is not a name', wall_name_clean('a/b') is null);
select lk_ok('punctuation alone is not a name', wall_name_clean('...') is null and wall_name_clean('!?') is null);
select lk_ok('thirty one characters are not a name', wall_name_clean(repeat('a', 31)) is null);
select lk_ok('thirty are', wall_name_clean(repeat('a', 30)) = repeat('a', 30));

-- ── the cast ────────────────────────────────────────────────────────────────
do $$
declare a uuid; r uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('lk-author@berkeley.edu', now()) returning id into a;
  insert into celestual_users (edu_email, edu_verified_at) values ('lk-reader@berkeley.edu', now()) returning id into r;
  perform lk_session(a, 'token-lk-author-00000000');
  perform lk_session(r, 'token-lk-reader-00000000');
end $$;

-- ── writing with a look ──────────────────────────────────────────────────────
create temp table lk_w1 as
  select wall_write('token-lk-author-00000000', '', 'you held the door at moffitt at two in the morning.',
                    null, null, 'berkeley', 'live', '{}', 'name', 'J',
                    '{"theme":"nokia","tint":"moss","face":"pixel","extra":1}'::jsonb) as out;
select lk_ok('a letter with a look goes up', (select (out->>'ok')::boolean from lk_w1));
select lk_ok('it is keyed by one letter', (select out->>'handle' from lk_w1) = '~j');
select lk_ok('the answer carries the cleaned look',
  (select out->'look' from lk_w1) = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb);
select lk_ok('the row holds the cleaned look',
  (select look from wall_letters where id = (select (out->>'id')::uuid from lk_w1))
    = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb);

create temp table lk_w2 as
  select wall_write('token-lk-author-00000000', '', 'you laughed at the thing nobody else laughed at.',
                    null, null, 'berkeley', 'live', '{}', 'name', 'j', '{"theme":"paper"}'::jsonb) as out;
select lk_ok('another letter to the same letter shares the key', (select out->>'handle' from lk_w2) = '~j');
select lk_ok('the plain paper is stored as nothing', (select out->'look' from lk_w2) = 'null'::jsonb);

create temp table lk_w3 as
  select wall_write('token-lk-author-00000000', 'somebody.else', 'you sat two rows ahead all semester.',
                    null, null, 'berkeley', 'live', '{}', 'handle', null, '{"theme":"y2k"}'::jsonb) as out;
select lk_ok('a handle letter takes a look too', (select out->'look' from lk_w3) = '{"theme":"y2k"}'::jsonb);

create temp table lk_w4 as
  select wall_write('token-lk-author-00000000', 'somebody.else', 'i kept nearly saying something after class.',
                    null, null, 'berkeley', 'live', '{}', 'handle', null) as out;
select lk_ok('the ten argument write still works, with no look',
  (select (out->>'ok')::boolean and out->'look' = 'null'::jsonb from lk_w4));

create temp table lk_w5 as
  select wall_write('token-lk-author-00000000', 'somebody.else', 'you were the one singing on the 51b.',
                    null, null, 'berkeley', 'live', '{}') as out;
select lk_ok('the eight argument write still works', (select (out->>'ok')::boolean from lk_w5));

-- ── the constraint ───────────────────────────────────────────────────────────
do $$
declare v_ok boolean := false; v_me uuid;
begin
  select id into v_me from celestual_users where edu_email = 'lk-author@berkeley.edu';
  begin
    insert into wall_letters (target_handle, target_kind, target_name, body, author_id, campus, status, moderation, look)
    values ('~raw', 'name', 'raw', 'a letter.', v_me, 'berkeley', 'live', '{}', '{"theme":"nokia","evil":"https://x"}'::jsonb);
  exception when check_violation then v_ok := true;
  end;
  perform lk_ok('a look the write did not clean is refused by the row', v_ok);
  v_ok := false;
  begin
    insert into wall_letters (target_handle, target_kind, target_name, body, author_id, campus, status, moderation, look)
    values ('~raw', 'name', 'raw', 'a letter.', v_me, 'berkeley', 'live', '{}', '"nokia"'::jsonb);
  exception when check_violation then v_ok := true;
  end;
  perform lk_ok('a look that is not an object is refused by the row', v_ok);
end $$;

-- ── reading ──────────────────────────────────────────────────────────────────
create temp table lk_read as
  select wall_letters_for('token-lk-reader-00000000', '~j') as out;
select lk_ok('the letters under a key carry their own looks',
  (select bool_and(case when l->>'id' = (select out->>'id' from lk_w1)
                          then l->'look' = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb
                          else l->'look' = 'null'::jsonb end)
     from lk_read, jsonb_array_elements(out->'letters') l));
select lk_ok('one letter carries its look',
  (select wall_letter('token-lk-reader-00000000', (out->>'id')::uuid)->'letter'->'look' from lk_w1)
    = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb);
select lk_ok('wall_mine carries the look',
  exists (select 1 from jsonb_array_elements(wall_mine('token-lk-author-00000000')->'letters') l
           where l->>'handle' = '~j' and l->'look' = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb));

-- ── the index and the search carry the newest look under a key ───────────────
select lk_ok('the index carries the newest letter''s look under the key',
  (select look = 'null'::jsonb or look is null from wall_index where target_handle = '~j'));
select lk_ok('the index carries the handle''s look',
  (select look from wall_index where target_handle = 'somebody.else') is null);
update wall_letters set created_at = created_at - interval '2 hours'
 where id in (select (out->>'id')::uuid from lk_w2);
select lk_ok('and it is the newest one, by the clock',
  (select look from wall_index where target_handle = '~j') = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb);
select lk_ok('the search carries the look',
  (select r->'look' from jsonb_array_elements(wall_search('j')) r where r->>'handle' = '~j')
    = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb);
-- three statements, not one: the operands of an `and` are not evaluated in
-- order, and a search run before the write it follows hears nothing
select lk_ok('a number nobody has written to is not on the wall',
  not exists (select 1 from jsonb_array_elements(wall_search('51')) r where r->>'handle' = '~51b'));
create temp table lk_w6 as
  select wall_write('token-lk-author-00000000', '', 'the bus letter.', null, null, 'berkeley', 'live', '{}', 'name', '51B') as out;
select lk_ok('a letter to a number goes up under its key', (select out->>'handle' from lk_w6) = '~51b');
select lk_ok('the search hears a number',
  exists (select 1 from jsonb_array_elements(wall_search('51')) r where r->>'handle' = '~51b'));

-- ── the desk sees the look ───────────────────────────────────────────────────
select lk_ok('the desk lists the look beside the row',
  exists (select 1 from jsonb_array_elements(celestual_desk_letters(null, 'moffitt', 50, 0)->'rows') r
           where r->>'target_handle' = '~j' and r->'look' = '{"theme":"nokia","tint":"moss","face":"pixel"}'::jsonb));

-- ── a takedown takes the look with it ────────────────────────────────────────
create temp table lk_rep as
  select wall_report('token-lk-reader-00000000', (select (out->>'id')::uuid from lk_w1), 'subject') as out;
select lk_ok('a report takes the letter down on the tap', (select (out->>'ok')::boolean from lk_rep));
select lk_ok('and its look goes with it', (select look from wall_index where target_handle = '~j') is null);
