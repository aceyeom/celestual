-- ─────────────────────────────────────────────────────────────────────────────
-- test-flagged.sql: exercises 0050_the_letter_goes_up_first.sql.
--
-- The claims worth asserting: a letter the classifier was unsure of is on the
-- wall the moment it is written, and in the desk's flagged queue until a
-- person decides about it; a decision of any kind takes it out of the queue
-- without touching the wall unless it says to; wall_mine answers a writer
-- about their own letters and nobody else's, and names whose hand took one
-- down; and the overview counts the queue. Run through
-- scripts/verify-migrations.sh --test. Self contained: its cast is its own.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function fg_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function fg_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- writer   at berkeley. Puts three letters up: one passed, one flagged, one
--          refused on the way in.
-- other    at berkeley too, and wrote nothing. Must see nothing in wall_mine.
do $$
declare w uuid; o uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('fg.writer@berkeley.edu', now())
    returning id into w;
  insert into celestual_users (edu_email, edu_verified_at) values ('fg.other@berkeley.edu', now())
    returning id into o;
  perform fg_session(w, 'token-fg-writer-0000000');
  perform fg_session(o, 'token-fg-other-00000000');
end $$;

-- ── 1. the three ways a letter is written now ───────────────────────────────
-- What celestual-wall-moderate writes for each verdict since 0050: a pass
-- and a review both at live, the review flagged; a reject at rejected.
create temporary table fg_ids (which text primary key, id uuid);
insert into fg_ids
select 'passed', (wall_write('token-fg-writer-0000000', 'fg_target_a', 'you held the door at moffitt', null, null,
  'berkeley', 'live', '{"verdict":"pass","reasons":[],"flagged":false}')->>'id')::uuid;
insert into fg_ids
select 'flagged', (wall_write('token-fg-writer-0000000', 'fg_target_b', 'you were the one singing on the 51b', null, null,
  'berkeley', 'live', '{"verdict":"review","reasons":["locate"],"flagged":true}')->>'id')::uuid;
insert into fg_ids
select 'refused', (wall_write('token-fg-writer-0000000', 'fg_target_c', 'a letter the screen refused', null, null,
  'berkeley', 'rejected', '{"verdict":"reject","reasons":["threat"],"flagged":false}')->>'id')::uuid;

select fg_ok('a flagged letter is on the wall at once',
  (select count(*) from wall_index where target_handle = 'fg_target_b' and letters = 1) = 1);
select fg_ok('a passed letter is on the wall',
  (select count(*) from wall_index where target_handle = 'fg_target_a' and letters = 1) = 1);
select fg_ok('a refused letter is not',
  (select count(*) from wall_index where target_handle = 'fg_target_c') = 0);

-- ── 2. the desk's queue ─────────────────────────────────────────────────────
select fg_ok('the flagged queue holds the flagged letter and only it',
  (celestual_desk_letters('flagged', null, 50, 0)->>'total')::int = 1
  and (celestual_desk_letters('flagged', null, 50, 0)->'rows'->0->>'id')::uuid = (select id from fg_ids where which = 'flagged'));
select fg_ok('the queue row says it is flagged',
  (celestual_desk_letters('flagged', null, 50, 0)->'rows'->0->>'flagged')::boolean);
select fg_ok('the live list still carries both live letters',
  (celestual_desk_letters('live', null, 50, 0)->>'total')::int = 2);
select fg_ok('an unknown status is refused',
  (celestual_desk_letters('nonsense', null, 50, 0)->>'error') = 'bad_status');
select fg_ok('the overview counts the queue',
  (celestual_desk_overview()->'counts'->>'letters_flagged')::int = 1);
select fg_ok('and still carries what it carried',
  (celestual_desk_overview()->'counts'->>'letters_live')::int = 2);

-- "looks fine": a decision that changes no status takes it out of the queue
select celestual_desk_letter_set((select id from fg_ids where which = 'flagged'), 'live', 'read it, fine');
select fg_ok('a decision of live leaves it on the wall',
  (select status from wall_letters where id = (select id from fg_ids where which = 'flagged')) = 'live');
select fg_ok('and takes it out of the queue',
  (celestual_desk_letters('flagged', null, 50, 0)->>'total')::int = 0);
select fg_ok('and the overview agrees',
  (celestual_desk_overview()->'counts'->>'letters_flagged')::int = 0);

-- ── 3. wall_mine ────────────────────────────────────────────────────────────
select fg_ok('nobody is nobody',
  (wall_mine('token-fg-nobody-000000000')->>'error') = 'no_session');
select fg_ok('a person who wrote nothing sees nothing',
  jsonb_array_length(wall_mine('token-fg-other-00000000')->'letters') = 0);
select fg_ok('the writer sees their three, newest first',
  jsonb_array_length(wall_mine('token-fg-writer-0000000')->'letters') = 3
  and (wall_mine('token-fg-writer-0000000')->'letters'->0->>'handle') = 'fg_target_c');

create or replace function fg_mine(p_which text, p_field text) returns text
language sql as $$
  select l->>p_field
    from jsonb_array_elements(wall_mine('token-fg-writer-0000000')->'letters') l
   where (l->>'id')::uuid = (select id from fg_ids where which = p_which)
$$;

select fg_ok('a live letter is not down', fg_mine('passed', 'down_by') is null);
select fg_ok('a refused letter was refused by the screen', fg_mine('refused', 'down_by') = 'screen');
select fg_ok('and carries the screen''s word', (fg_mine('refused', 'reasons'))::jsonb ? 'threat');
select fg_ok('the writer gets their own words back', fg_mine('refused', 'body') = 'a letter the screen refused');
select fg_ok('a letter a person passed is not flagged', (fg_mine('flagged', 'flagged'))::boolean = false);

-- the desk takes the passed one down: the writer is told it was a person
select celestual_desk_letter_set((select id from fg_ids where which = 'passed'), 'removed', 'no');
select fg_ok('a desk takedown is by the desk', fg_mine('passed', 'down_by') = 'desk');

-- a reader reports the flagged one (it is live): the writer is not told whose
-- hand it was, which is what ''report'' means to the wall
do $$
declare r uuid;
begin
  insert into celestual_users (instagram_handle, handle_verified_at) values ('fg_reader', now()) returning id into r;
  perform fg_session(r, 'token-fg-reader-0000000');
end $$;
select wall_report('token-fg-reader-0000000', (select id from fg_ids where which = 'flagged'), 'no thanks');
select fg_ok('a reported letter is down by a report', fg_mine('flagged', 'down_by') = 'report');

-- ── 4. the reading, after the letter is up ──────────────────────────────────
-- What celestual-wall-moderate does since the order turned round: the letter
-- is written live and unread, and the model's verdict lands on it afterwards.
insert into fg_ids
select 'unread_a', (wall_write('token-fg-writer-0000000', 'fg_target_d', 'written first, read after', null, null,
  'berkeley', 'live', '{"verdict":"unread","reasons":[],"flagged":false}')->>'id')::uuid;
select fg_ok('an unread letter is up',
  (select count(*) from wall_index where target_handle = 'fg_target_d' and letters = 1) = 1);
select fg_ok('and not in the queue',
  (celestual_desk_letters('flagged', null, 50, 0)->>'total')::int = 0);

-- a review: still up, and now in the queue
select wall_screened((select id from fg_ids where which = 'unread_a'), 'review', '["locate"]', 'test-model');
select fg_ok('a review leaves it on the wall',
  (select count(*) from wall_index where target_handle = 'fg_target_d' and letters = 1) = 1);
select fg_ok('and puts it in the queue',
  (celestual_desk_letters('flagged', null, 50, 0)->>'total')::int = 1);
select fg_ok('with the model''s words and which model',
  (select moderation->>'model' from wall_letters where id = (select id from fg_ids where which = 'unread_a')) = 'test-model'
  and (select moderation->'reasons' from wall_letters where id = (select id from fg_ids where which = 'unread_a')) ? 'locate');

-- a pass: up, out of the queue, nothing else moves
select wall_screened((select id from fg_ids where which = 'unread_a'), 'pass', '[]', 'test-model');
select fg_ok('a pass leaves it up and out of the queue',
  (select status from wall_letters where id = (select id from fg_ids where which = 'unread_a')) = 'live'
  and (celestual_desk_letters('flagged', null, 50, 0)->>'total')::int = 0);

-- a reject: down, and the writer is told it was the screen
select wall_screened((select id from fg_ids where which = 'unread_a'), 'reject', '["threat"]', 'test-model');
select fg_ok('a reject takes it off the wall',
  (select count(*) from wall_index where target_handle = 'fg_target_d') = 0
  and (select status from wall_letters where id = (select id from fg_ids where which = 'unread_a')) = 'rejected');
select fg_ok('and the writer is told it was the screen', fg_mine('unread_a', 'down_by') = 'screen');
select fg_ok('a verdict the function does not know is a review',
  (wall_screened((select id from fg_ids where which = 'unread_a'), 'nonsense', '[]', null)->>'verdict') = 'review');
select fg_ok('a letter that is not there is said so',
  (wall_screened('00000000-0000-4000-8000-000000000000', 'pass', '[]', null)->>'error') = 'not_found');

-- a person decided first: the verdict is recorded, the decision stands
insert into fg_ids
select 'unread_b', (wall_write('token-fg-other-00000000', 'fg_target_e', 'a person got there first', null, null,
  'berkeley', 'live', '{"verdict":"unread","reasons":[],"flagged":false}')->>'id')::uuid;
select celestual_desk_letter_set((select id from fg_ids where which = 'unread_b'), 'live', 'read it, fine');
select wall_screened((select id from fg_ids where which = 'unread_b'), 'reject', '["hate"]', null);
select fg_ok('a reject after a person''s decision does not take it down',
  (select status from wall_letters where id = (select id from fg_ids where which = 'unread_b')) = 'live');
select fg_ok('but the verdict is on the record',
  (select moderation->>'verdict' from wall_letters where id = (select id from fg_ids where which = 'unread_b')) = 'reject');

-- ── 5. the grants ───────────────────────────────────────────────────────────
select fg_ok('anon may not write a verdict',
  not has_function_privilege('anon', 'wall_screened(uuid, text, jsonb, text)', 'EXECUTE'));
select fg_ok('anon may ask about its own letters',
  has_function_privilege('anon', 'wall_mine(text)', 'EXECUTE'));
select fg_ok('anon may not read the desk''s queue',
  not has_function_privilege('anon', 'celestual_desk_letters(text, text, integer, integer)', 'EXECUTE'));
select fg_ok('anon may not read the overview',
  not has_function_privilege('anon', 'celestual_desk_overview()', 'EXECUTE'));

drop function fg_mine(text, text);
drop function fg_ok(text, boolean);
drop function fg_session(uuid, text);
