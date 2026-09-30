-- ─────────────────────────────────────────────────────────────────────────────
-- test-writer-takes-it-back.sql: exercises 0074_the_writer_takes_it_back.sql.
--
-- The owner's ruling of 29 September as properties of the schema: the person
-- who wrote a letter takes it back down, at any time while it stands or
-- waits, and nobody else can; it comes down marking whose hand it was and
-- shutting nothing; it goes back where it was within a day, never up past a
-- reading that refused it, a name that came off the wall or a day that is
-- over; the writer's list says they took it back; the two reads tell a
-- letter's writer it is theirs and tell nobody else anything; and neither a
-- report dismissed nor the desk's switch puts it back up behind their back.
-- Run through scripts/verify-migrations.sh --test. Everything is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function wb_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function wb_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- a letter, written straight into the table the way the edge function's
-- write leaves one, with the reading's verdict on it
create or replace function wb_letter(p_author uuid, p_to text, p_status text, p_verdict text default 'pass')
returns uuid language sql as $$
  insert into wall_letters (target_handle, body, author_id, campus, status, moderation)
  values (p_to, 'the letter to ' || p_to, p_author, 'berkeley', p_status,
          jsonb_build_object('verdict', p_verdict, 'reasons', '[]'::jsonb))
  returning id
$$;

create or replace function wb_row(p_token text, p_letter uuid) returns jsonb
language sql as $$
  select x from jsonb_array_elements(wall_mine(p_token)->'letters') x where x->>'id' = p_letter::text
$$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;
insert into celestual_settings (key, value) values ('wall_letter_cap', 'false')
  on conflict (key) do update set value = 'false';

-- ── the cast ────────────────────────────────────────────────────────────────
-- writer  wrote every letter below.
-- other   a reader, who wrote nothing.
-- owner   holds the verified @ wb_owner, which some of the letters are to.
create temp table wb_cast (who text primary key, id uuid);
do $$
declare w uuid; o uuid; ow uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('wb-writer@berkeley.edu', now()) returning id into w;
  insert into celestual_users (edu_email, edu_verified_at) values ('wb-other@berkeley.edu', now()) returning id into o;
  insert into celestual_users (instagram_handle, handle_verified_at) values ('wb_owner', now()) returning id into ow;
  perform wb_session(w, 'token-wb-writer-000000');
  perform wb_session(o, 'token-wb-other-0000000');
  perform wb_session(ow, 'token-wb-owner-0000000');
  insert into wb_cast values ('writer', w), ('other', o), ('owner', ow);
end $$;

create temp table wb_l (k text primary key, id uuid);
insert into wb_l values
  ('up',      wb_letter((select id from wb_cast where who = 'writer'), 'wb_owner', 'live')),
  ('held',    wb_letter((select id from wb_cast where who = 'writer'), 'wb_held', 'pending', 'review')),
  ('fast',    wb_letter((select id from wb_cast where who = 'writer'), 'wb_fast', 'live', 'unread')),
  ('refused', wb_letter((select id from wb_cast where who = 'writer'), 'wb_refused', 'rejected', 'reject')),
  ('shut',    wb_letter((select id from wb_cast where who = 'writer'), 'wb_shut', 'live')),
  ('late',    wb_letter((select id from wb_cast where who = 'writer'), 'wb_late', 'live')),
  ('desk',    wb_letter((select id from wb_cast where who = 'writer'), 'wb_desk', 'live')),
  ('switch',  wb_letter((select id from wb_cast where who = 'writer'), 'wb_switch', 'live')),
  ('theirs',  wb_letter((select id from wb_cast where who = 'other'), 'wb_owner', 'live'));
create or replace function wb(p_k text) returns uuid language sql stable as $$ select id from wb_l where k = p_k $$;

-- ── 1. whose it is, told to them alone ──────────────────────────────────────
select wb_ok('the writer is told the letter is theirs',
  (wall_letter('token-wb-writer-000000', wb('up'))->'letter'->>'yours')::boolean);
select wb_ok('anybody else is told it is not theirs',
  not (wall_letter('token-wb-other-0000000', wb('up'))->'letter'->>'yours')::boolean
  and not (wall_letter('token-wb-owner-0000000', wb('up'))->'letter'->>'yours')::boolean);
select wb_ok('and nobody at all is told nothing either way but no',
  not (wall_letter(null, wb('up'))->'letter'->>'yours')::boolean
  and not (wall_letter('token-wb-nobody-000000', wb('up'))->'letter'->>'yours')::boolean);
select wb_ok('a name''s letters say the same, letter by letter',
  (select bool_and(case when x->>'id' = wb('up')::text then (x->>'yours')::boolean else not (x->>'yours')::boolean end)
     from jsonb_array_elements(wall_letters_for('token-wb-writer-000000', 'wb_owner')->'letters') x)
  and (select count(*) = 2 from jsonb_array_elements(wall_letters_for('token-wb-writer-000000', 'wb_owner')->'letters') x)
  and (select bool_and(not (x->>'yours')::boolean)
         from jsonb_array_elements(wall_letters_for('token-wb-other-0000000', 'wb_owner')->'letters') x
        where x->>'id' = wb('up')::text));
select wb_ok('no read carries anything else about who wrote it',
  not exists (select 1 from jsonb_object_keys(wall_letter('token-wb-other-0000000', wb('up'))->'letter') k
               where k ~ 'author|writer|wrote')
  and not exists (select 1 from jsonb_array_elements(wall_letters_for(null, 'wb_owner')->'letters') x,
                                jsonb_object_keys(x) k where k ~ 'author|writer|wrote'));
select wb_ok('a name''s letters say whether the caller holds its @, as the one letter does',
  (select bool_and((x->>'mine')::boolean)
     from jsonb_array_elements(wall_letters_for('token-wb-owner-0000000', 'wb_owner')->'letters') x)
  and (select bool_and(not (x->>'mine')::boolean)
         from jsonb_array_elements(wall_letters_for('token-wb-writer-000000', 'wb_owner')->'letters') x));

-- ── 2. taking it back ───────────────────────────────────────────────────────
select wb_ok('a person without a session cannot take a letter back',
  (wall_writer_remove('token-wb-nobody-000000', wb('up'))->>'error') = 'no_session'
  and (wall_writer_remove(null, wb('up'))->>'error') = 'no_session');
select wb_ok('nor can anybody but its writer, the owner of its @ included',
  (wall_writer_remove('token-wb-other-0000000', wb('up'))->>'error') = 'not_yours'
  and (wall_writer_remove('token-wb-owner-0000000', wb('up'))->>'error') = 'not_yours'
  and (select status = 'live' from wall_letters where id = wb('up')));
select wb_ok('a letter that is not there is gone',
  (wall_writer_remove('token-wb-writer-000000', gen_random_uuid())->>'error') = 'gone');
create temp table wb_down as select wall_writer_remove('token-wb-writer-000000', wb('up')) as r;
select wb_ok('its writer takes it back, with a day to put it back',
  ((select r from wb_down)->>'ok')::boolean
  and ((select r from wb_down)->>'undo_until')::timestamptz between now() + interval '23 hours' and now() + interval '25 hours');
select wb_ok('it is down, marked as the writer''s, from where it stood, and nothing was filed',
  (select status = 'removed' and moderation #>> '{desk,via}' = 'writer' and moderation #>> '{desk,was}' = 'live'
     from wall_letters where id = wb('up'))
  and not exists (select 1 from wall_claims where letter_id = wb('up'))
  and not exists (select 1 from wall_reports where letter_id = wb('up')));
select wb_ok('taking it back twice is the same answer',
  (wall_writer_remove('token-wb-writer-000000', wb('up'))->>'undo_until') = ((select r from wb_down)->>'undo_until'));
select wb_ok('it is off the wall for everybody',
  (wall_letter('token-wb-owner-0000000', wb('up'))->>'error') = 'gone'
  and not exists (select 1 from jsonb_array_elements(wall_letters_for(null, 'wb_owner')->'letters') x
                   where x->>'id' = wb('up')::text));
select wb_ok('and the name it was written to is not shut',
  not wall_name_shut_any('wb_owner')
  and (select count(*) = 1 from jsonb_array_elements(wall_letters_for(null, 'wb_owner')->'letters') x));
select wb_ok('the writer''s list says they took it back, and until when it can go back',
  (wb_row('token-wb-writer-000000', wb('up'))->>'down_by') = 'writer'
  and (wb_row('token-wb-writer-000000', wb('up'))->>'undo_until')::timestamptz > now() + interval '23 hours');
select wb_ok('the screen landing late leaves it down',
  (wall_screened(wb('up'), 'pass', '[]'::jsonb, 'test')->>'status') = 'removed');
select wb_ok('a letter the reading refused cannot be taken back, it is not up',
  (wall_writer_remove('token-wb-writer-000000', wb('refused'))->>'error') = 'gone');
select wall_report('token-wb-other-0000000', wb('desk'), 'unspecified');
select wb_ok('nor one a reader already took down',
  (wall_writer_remove('token-wb-writer-000000', wb('desk'))->>'error') = 'gone');

-- ── 3. and putting it back ──────────────────────────────────────────────────
select wb_ok('nobody but its writer can put it back',
  (wall_writer_restore('token-wb-other-0000000', wb('up'))->>'error') = 'not_yours'
  and (wall_writer_restore('token-wb-nobody-000000', wb('up'))->>'error') = 'no_session');
select wb_ok('its writer puts it back',
  (wall_writer_restore('token-wb-writer-000000', wb('up'))->>'status') = 'live');
select wb_ok('up again, with no mark left on it',
  (select status = 'live' and not (moderation ? 'desk') from wall_letters where id = wb('up'))
  and (wall_letter(null, wb('up'))->>'ok')::boolean
  and (wb_row('token-wb-writer-000000', wb('up'))->>'down_by') is null
  and (wb_row('token-wb-writer-000000', wb('up'))->>'undo_until') is null);
select wb_ok('putting it back twice is the same answer',
  (wall_writer_restore('token-wb-writer-000000', wb('up'))->>'status') = 'live');
select wb_ok('a letter somebody else took down is not the writer''s to put back',
  (wall_writer_restore('token-wb-writer-000000', wb('desk'))->>'error') = 'gone'
  and (select status = 'removed' from wall_letters where id = wb('desk')));

-- a letter waiting on the desk goes back to waiting, never up
select wall_writer_remove('token-wb-writer-000000', wb('held'));
select wb_ok('a letter waiting on the desk can be taken back',
  (select status = 'removed' and moderation #>> '{desk,was}' = 'pending' from wall_letters where id = wb('held'))
  and (wb_row('token-wb-writer-000000', wb('held'))->>'down_by') = 'writer');
-- (a statement does not see what a function it calls wrote, so the call and
-- the look at the row are two statements, here and below)
select wb_ok('and put back, it answers that it waits for the desk again',
  (wall_writer_restore('token-wb-writer-000000', wb('held'))->>'status') = 'pending');
select wb_ok('and it does',
  (select status = 'pending' from wall_letters where id = wb('held'))
  and (wb_row('token-wb-writer-000000', wb('held'))->>'down_by') = 'held');

-- taken back before the reading landed, and the reading refused it
select wall_writer_remove('token-wb-writer-000000', wb('fast'));
select wall_screened(wb('fast'), 'reject', '["threat"]'::jsonb, 'test');
select wb_ok('the reading landing late records its verdict and leaves it down',
  (select status = 'removed' and moderation->>'verdict' = 'reject' from wall_letters where id = wb('fast')));
select wb_ok('and a letter the reading refused never goes back up',
  (wall_writer_restore('token-wb-writer-000000', wb('fast'))->>'error') = 'gone'
  and (select status = 'removed' from wall_letters where id = wb('fast')));

-- the day is over
select wall_writer_remove('token-wb-writer-000000', wb('late'));
update wall_letters set moderation = jsonb_set(moderation, '{desk,undo_until}', to_jsonb(now() - interval '1 minute'))
 where id = wb('late');
select wb_ok('after a day it stays down',
  (wall_writer_restore('token-wb-writer-000000', wb('late'))->>'error') = 'expired');
select wb_ok('and the list stops offering to put it back',
  (wb_row('token-wb-writer-000000', wb('late'))->>'down_by') = 'writer'
  and (wb_row('token-wb-writer-000000', wb('late'))->>'undo_until') is null);

-- the name came off the wall while it was down
select wall_writer_remove('token-wb-writer-000000', wb('shut'));
select celestual_desk_letter_set(wb_letter((select id from wb_cast where who = 'other'), 'wb_shut', 'live'), 'removed', 'shut');
update wall_letters set moderation = jsonb_set(moderation, '{desk,via}', '"desk_shut"')
 where target_handle = 'wb_shut' and author_id = (select id from wb_cast where who = 'other');
select wb_ok('a letter to a name that came off the wall stays down',
  wall_name_shut_any('wb_shut')
  and (wall_writer_restore('token-wb-writer-000000', wb('shut'))->>'error') = 'gone');

-- ── 4. what the desk can no longer undo ─────────────────────────────────────
-- a report on the letter, filed while it stood, and the writer takes it back
-- before the desk gets to it; the letter was reported down first, so it is a
-- fresh one here
create temp table wb_rep as select wb_letter((select id from wb_cast where who = 'writer'), 'wb_rep', 'live') as id;
select wall_writer_remove('token-wb-writer-000000', (select id from wb_rep));
select wall_report('token-wb-other-0000000', (select id from wb_rep), 'unspecified');
select wb_ok('a report dismissed does not put a letter its writer took back up again',
  (celestual_desk_report_resolve((select id from wall_reports where letter_id = (select id from wb_rep)), false, 'fine')->>'restored') = 'false'
  and (select status = 'removed' and moderation #>> '{desk,via}' = 'writer' from wall_letters where id = (select id from wb_rep)));
-- and the owner's act the same way
create temp table wb_own as select wb_letter((select id from wb_cast where who = 'other'), 'wb_owner', 'live') as id;
select wall_owner_remove('token-wb-owner-0000000', (select id from wb_own));
select wall_report('token-wb-writer-000000', (select id from wb_own), 'unspecified');
select wb_ok('nor one the owner of its @ took down',
  (celestual_desk_report_resolve((select id from wall_reports where letter_id = (select id from wb_own)), false, 'fine')->>'restored') = 'false'
  and (select status = 'removed' and moderation #>> '{desk,via}' = 'owner' from wall_letters where id = (select id from wb_own)));
select wb_ok('a report dismissed still puts back a letter a reader took down',
  (celestual_desk_report_resolve((select id from wall_reports where letter_id = wb('desk')), false, 'fine')->>'restored') = 'true');
select wb_ok('and it is up',
  (select status = 'live' from wall_letters where id = wb('desk')));

select wall_writer_remove('token-wb-writer-000000', wb('switch'));
select wb_ok('the desk''s switch will not put up a letter its writer took back',
  (celestual_desk_letter_set(wb('switch'), 'live', 'looked at')->>'error') = 'writer'
  and (celestual_desk_letter_set(wb('switch'), 'pending', null)->>'error') = 'writer'
  and (select status = 'removed' and moderation #>> '{desk,via}' = 'writer' from wall_letters where id = wb('switch')));
select wb_ok('it can still take one further down',
  (celestual_desk_letter_set(wb('switch'), 'rejected', 'no')->>'ok')::boolean);
select wb_ok('and then it is the desk''s, and not the writer''s to put back',
  (wall_writer_restore('token-wb-writer-000000', wb('switch'))->>'error') = 'gone'
  and (wb_row('token-wb-writer-000000', wb('switch'))->>'down_by') = 'desk');

-- ── 5. the grants ───────────────────────────────────────────────────────────
select wb_ok('the browser may call both, and nobody by default',
  has_function_privilege('anon', 'wall_writer_remove(text, uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'wall_writer_remove(text, uuid)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_writer_restore(text, uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'wall_writer_restore(text, uuid)', 'EXECUTE')
  and not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                   where p.proname in ('wall_writer_remove', 'wall_writer_restore')
                     and a.grantee = 0 and a.privilege_type = 'EXECUTE'));
select wb_ok('both run as the definer, on a pinned path',
  (select bool_and(p.prosecdef and array_to_string(p.proconfig, ',') like 'search_path=%')
     from pg_proc p where p.proname in ('wall_writer_remove', 'wall_writer_restore', 'wall_mine',
                                        'wall_letter', 'wall_letters_for')));
select wb_ok('the reads are still the browser''s',
  has_function_privilege('anon', 'wall_letters_for(text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_letter(text, uuid)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_mine(text)', 'EXECUTE'));
select wb_ok('and the desk''s two are still the service role''s alone',
  not has_function_privilege('anon', 'celestual_desk_letter_set(uuid, text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_desk_report_resolve(uuid, boolean, text)', 'EXECUTE')
  and has_function_privilege('service_role', 'celestual_desk_letter_set(uuid, text, text)', 'EXECUTE'));

rollback;
