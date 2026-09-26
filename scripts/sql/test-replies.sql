-- ─────────────────────────────────────────────────────────────────────────────
-- test-replies.sql: exercises 0068_the_replies.sql.
--
-- The claims are properties of the schema, not of a screen: a thread never
-- says who wrote a reply; only a school address or the letter's recipient
-- may reply, once they have accepted the terms, and never with anybody
-- else's name in it; the recipient shuts and puts away the thread under a
-- letter to them and nobody else can; three reports from three devices put a
-- reply out of sight until the desk decides; and a like, like a heart, is
-- anybody's. Run through scripts/verify-migrations.sh --test. Self contained,
-- and it leaves the tables as it found them.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function rp_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function rp_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- the user a token is, whoever made it
create or replace function rp_user(p_token text) returns uuid
language sql as $$
  select user_id from celestual_sessions
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
$$;

-- a write the way celestual-wall-reply makes it
create or replace function rp_write(p_token text, p_letter uuid, p_body text,
                                    p_status text default 'live', p_accept boolean default true,
                                    p_nonce text default null)
returns jsonb language sql as $$
  select wall_reply_write(p_token, p_letter, p_body, p_status,
                          jsonb_build_object('verdict', 'pass', 'reasons', '[]'::jsonb),
                          coalesce(p_nonce, replace(gen_random_uuid()::text, '-', '')), p_accept)
$$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- writer     at berkeley, and writes the letters
-- school     at a school: may reply
-- recipient  holds the letter's @ by the Instagram claim, and no school
-- plain      a session with nothing proved on it
-- and strangers, who are only tokens until they touch something
do $$
declare w uuid; s uuid; r uuid; p uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at)
    values ('rp-writer@berkeley.edu', now()) returning id into w;
  insert into celestual_users (edu_email, edu_verified_at)
    values ('rp-school@stanford.edu', now()) returning id into s;
  insert into celestual_users (instagram_handle, handle_verified_at)
    values ('rp.recipient', now()) returning id into r;
  insert into celestual_users default values returning id into p;
  perform rp_session(w, 'rp-token-writer-0000000');
  perform rp_session(s, 'rp-token-school-0000000');
  perform rp_session(r, 'rp-token-recip-00000000');
  perform rp_session(p, 'rp-token-plain-00000000');
end $$;

create temp table rp_ids as
  select (wall_write('rp-token-writer-0000000', 'rp.recipient',
            'you held the door at moffitt at two in the morning.', null, null,
            'berkeley', 'live', '{}')->>'id')::uuid as id, 1 as n
  union all
  select (wall_write('rp-token-writer-0000000', 'rp.other',
            'you laughed at the wrong part of the film.', null, null,
            'berkeley', 'live', '{}')->>'id')::uuid, 2;
create or replace function rp_letter(p_n int) returns uuid language sql as $$ select id from rp_ids where n = p_n $$;

select rp_ok('both letters are up', (select count(*) = 2 and bool_and(id is not null) from rp_ids));

-- ── 1. the heart is anybody's ───────────────────────────────────────────────
select rp_ok('a stranger hearts a letter',
  (wall_heart('rp-token-stranger-heart0', rp_letter(1), true)->>'hearted')::boolean);
select rp_ok('and the count is one',
  (wall_letter('rp-token-writer-0000000', rp_letter(1))->'letter'->>'hearts')::int = 1);
select rp_ok('a session with nothing proved hearts it too',
  (wall_heart('rp-token-plain-00000000', rp_letter(1), true)->>'hearts')::int = 2);
select rp_ok('and the stranger is somebody now, who proved nothing',
  exists (select 1 from celestual_users u where u.id = rp_user('rp-token-stranger-heart0')
           and u.edu_verified_at is null and u.handle_verified_at is null));

-- ── 2. a thread, to nobody in particular ────────────────────────────────────
select rp_ok('anybody reads a thread',
  (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'ok')::boolean
  and (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'count')::int = 0);
select rp_ok('and reading one opens no session',
  rp_user('rp-token-nobody-00000000') is null);
select rp_ok('a stranger may not reply, for want of a school',
  not (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'me'->>'can')::boolean
  and wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'me'->>'why' = 'edu');
select rp_ok('a school may',
  (wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'me'->>'can')::boolean
  and (wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'me'->>'edu')::boolean
  and not (wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'me'->>'terms')::boolean);
select rp_ok('and the recipient may, and is told so',
  (wall_reply_thread('rp-token-recip-00000000', rp_letter(1))->'me'->>'can')::boolean
  and (wall_reply_thread('rp-token-recip-00000000', rp_letter(1))->'me'->>'recipient')::boolean);
select rp_ok('but not under a letter to somebody else',
  wall_reply_thread('rp-token-recip-00000000', rp_letter(2))->'me'->>'why' = 'edu');
select rp_ok('a letter that is not up has no thread',
  wall_reply_thread('rp-token-school-0000000', gen_random_uuid())->>'error' = 'gone');

-- ── 3. the write: a school or the recipient, and the terms first ────────────
select rp_ok('nothing proved is refused',
  rp_write('rp-token-plain-00000000', rp_letter(1), 'i hope they read this')->>'error' = 'edu');
select rp_ok('no session is refused the same way',
  rp_write('rp-token-nobody-00000000', rp_letter(1), 'i hope they read this')->>'error' = 'edu');
select rp_ok('a school that has not accepted the terms is asked to',
  rp_write('rp-token-school-0000000', rp_letter(1), 'i hope they read this', 'live', false)->>'error' = 'terms');
select rp_ok('and nothing was stored', not exists (select 1 from wall_replies));

create temp table rp_first as
  select rp_write('rp-token-school-0000000', rp_letter(1), 'i hope they read this', 'live', true, 'rp-nonce-first-01') as a;
select rp_ok('accepting them goes up', (select a->>'status' = 'live' from rp_first));
select rp_ok('and the terms are kept',
  exists (select 1 from wall_reply_terms where user_id = rp_user('rp-token-school-0000000')));
select rp_ok('the same send again is the first answer, and one reply',
  (rp_write('rp-token-school-0000000', rp_letter(1), 'i hope they read this', 'live', true, 'rp-nonce-first-01')->>'replay')::boolean
  and (select count(*) from wall_replies) = 1);
select rp_ok('a second reply needs no second yes',
  rp_write('rp-token-school-0000000', rp_letter(1), 'same, honestly', 'live', false)->>'status' = 'live');
-- the edge function keeps a yes before the list reads the reply, since a
-- reply the list catches is never written and its yes went with it
select rp_ok('a yes is kept on its own',
  (wall_reply_agree('rp-token-plain-00000000')->>'ok')::boolean);
select rp_ok('and twice is once',
  (wall_reply_agree('rp-token-plain-00000000')->>'ok')::boolean);
select rp_ok('one row for the person',
  (select count(*) from wall_reply_terms where user_id = rp_user('rp-token-plain-00000000')) = 1);
select rp_ok('and a device with no session agrees to nothing',
  wall_reply_agree('rp-token-nobody-00000000')->>'error' = 'no_session'
  and rp_user('rp-token-nobody-00000000') is null);
select rp_ok('an empty reply is refused',
  rp_write('rp-token-school-0000000', rp_letter(1), '   ')->>'error' = 'empty');
select rp_ok('and a long one',
  rp_write('rp-token-school-0000000', rp_letter(1), repeat('a', 281))->>'error' = 'long');
select rp_ok('a status the reading does not give is refused',
  rp_write('rp-token-school-0000000', rp_letter(1), 'fine', 'hidden')->>'error' = 'bad_input');

-- ── 4. nobody else, and the list ────────────────────────────────────────────
select rp_ok('an @ is caught',
  'tag' = any(wall_reply_caught('tell @jane.doe to read it')));
select rp_ok('and a word shaped like a handle',
  'tag' = any(wall_reply_caught('ask jane_doe about it')));
select rp_ok('and two capitalised names side by side',
  'name' = any(wall_reply_caught('I think Maria Delgado wrote this')));
select rp_ok('and a first name and a surname in lower case',
  'name' = any(wall_reply_caught('sounds like sarah kim honestly')));
select rp_ok('and a possessive',
  'name' = any(wall_reply_caught('that was Sarah Kim''s line')));
select rp_ok('but a greeting is not a name',
  coalesce(array_length(wall_reply_caught('Happy Birthday to the Golden Bears'), 1), 0) = 0);
select rp_ok('nor a place',
  coalesce(array_length(wall_reply_caught('I saw it at Doe Library and Sather Gate'), 1), 0) = 0);
select rp_ok('nor a first name alone, or a sentence break between two words',
  coalesce(array_length(wall_reply_caught('sarah, you should say it. Kim knows'), 1), 0) = 0);
select rp_ok('the letter list is here too',
  'url' = any(wall_reply_caught('read it at x.com'))
  and 'phone' = any(wall_reply_caught('call 510 555 0199 now')));
select rp_ok('and the write refuses what it catches, storing nothing',
  rp_write('rp-token-school-0000000', rp_letter(1), 'Maria Delgado wrote this')->>'error' = 'caught'
  and not exists (select 1 from wall_replies where body like 'Maria%'));

-- ── 5. a thread never says who ──────────────────────────────────────────────
select rp_ok('a reply carries who and not the author',
  (select bool_and(not (x ? 'author_id') and not (x ? 'author') and char_length(x->>'who') = 16)
     from jsonb_array_elements(wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies') x));
select rp_ok('and no author''s id is anywhere in it',
  position(rp_user('rp-token-school-0000000')::text in
           wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))::text) = 0);
select rp_ok('one person is one who all down a thread',
  (select count(distinct x->>'who') = 1
     from jsonb_array_elements(wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies') x));
select rp_ok('and a different one under the next letter',
  (rp_write('rp-token-school-0000000', rp_letter(2), 'this one is sweet')->>'ok')::boolean
  and (wall_reply_thread('rp-token-nobody-00000000', rp_letter(2))->'replies'->0->>'who')
      <> (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies'->0->>'who'));
select rp_ok('the writer is told which are theirs, and who they are',
  (wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'replies'->0->>'mine')::boolean
  and wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'me'->>'who'
      = wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'replies'->0->>'who');
select rp_ok('and nobody else is',
  not (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies'->0->>'mine')::boolean);

-- ── 6. held is the writer's alone ───────────────────────────────────────────
select rp_ok('a held reply is written',
  rp_write('rp-token-school-0000000', rp_letter(1), 'this one waits for a person', 'held')->>'status' = 'held');
select rp_ok('and the writer sees it, held',
  exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'replies') x
           where x->>'body' = 'this one waits for a person' and x->>'status' = 'held'));
select rp_ok('and nobody else does',
  not exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies') x
               where x->>'body' = 'this one waits for a person'));
select rp_ok('nor is it counted',
  (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'count')::int = 2);
select rp_ok('a rejected reply is kept for the desk and shown to nobody',
  rp_write('rp-token-school-0000000', rp_letter(1), 'a reading refused this', 'rejected')->>'status' = 'rejected'
  and not exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'replies') x
                   where x->>'status' = 'rejected'));

-- ── 7. the recipient ────────────────────────────────────────────────────────
select rp_ok('the recipient replies with no school, once they accept',
  rp_write('rp-token-recip-00000000', rp_letter(1), 'it was me. thank you.', 'live', false)->>'error' = 'terms'
  and (rp_write('rp-token-recip-00000000', rp_letter(1), 'it was me. thank you.', 'live', true)->>'recipient')::boolean);
select rp_ok('and the thread says the recipient replied',
  (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'recipient_replied')::boolean
  and exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies') x
               where (x->>'recipient')::boolean and x->>'body' = 'it was me. thank you.'));
select rp_ok('nobody else can shut it',
  wall_reply_thread_set('rp-token-school-0000000', rp_letter(1), 'locked')->>'error' = 'unverified');
select rp_ok('the recipient shuts it',
  wall_reply_thread_set('rp-token-recip-00000000', rp_letter(1), 'locked')->>'state' = 'locked');
select rp_ok('and a school may not reply now',
  rp_write('rp-token-school-0000000', rp_letter(1), 'one more thing')->>'error' = 'locked'
  and wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'me'->>'why' = 'locked');
select rp_ok('but the ones there stay',
  (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'count')::int = 3);
select rp_ok('and the recipient still may',
  rp_write('rp-token-recip-00000000', rp_letter(1), 'and that is all.')->>'status' = 'live');
select rp_ok('the recipient puts it away',
  wall_reply_thread_set('rp-token-recip-00000000', rp_letter(1), 'closed')->>'state' = 'closed');
select rp_ok('and nobody else sees any of it',
  jsonb_array_length(wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies') = 0
  and (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'count')::int = 0
  and not (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'recipient_replied')::boolean
  and wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'state' = 'closed');
select rp_ok('but the recipient does',
  jsonb_array_length(wall_reply_thread('rp-token-recip-00000000', rp_letter(1))->'replies') = 4);
select rp_ok('and nobody replies, the recipient included',
  rp_write('rp-token-recip-00000000', rp_letter(1), 'wait')->>'error' = 'closed');
select rp_ok('nor likes',
  wall_reply_like('rp-token-plain-00000000',
    (select id from wall_replies where body = 'i hope they read this'), true)->>'error' = 'closed');
select rp_ok('open again',
  wall_reply_thread_set('rp-token-recip-00000000', rp_letter(1), 'open')->>'state' = 'open');
select rp_ok('and everything is back',
  (wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->>'count')::int = 4
  and not exists (select 1 from wall_reply_threads where letter_id = rp_letter(1)));

-- ── 8. a like is anybody's ──────────────────────────────────────────────────
select rp_ok('a stranger likes a reply',
  (wall_reply_like('rp-token-stranger-like0', (select id from wall_replies where body = 'i hope they read this'), true)->>'likes')::int = 1);
select rp_ok('and the thread knows it is theirs',
  exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-stranger-like0', rp_letter(1))->'replies') x
           where x->>'body' = 'i hope they read this' and (x->>'liked')::boolean and (x->>'likes')::int = 1));
select rp_ok('twice is once',
  (wall_reply_like('rp-token-stranger-like0', (select id from wall_replies where body = 'i hope they read this'), true)->>'likes')::int = 1);
select rp_ok('and off is off',
  (wall_reply_like('rp-token-stranger-like0', (select id from wall_replies where body = 'i hope they read this'), false)->>'likes')::int = 0);
select rp_ok('a held reply cannot be liked',
  wall_reply_like('rp-token-plain-00000000', (select id from wall_replies where status = 'held'), true)->>'error' = 'gone');

-- ── 9. three reports ────────────────────────────────────────────────────────
create temp table rp_target as select id from wall_replies where body = 'same, honestly';
select rp_ok('a writer cannot report their own',
  wall_reply_report('rp-token-school-0000000', (select id from rp_target), true)->>'error' = 'mine');
select rp_ok('one report leaves it up',
  not (wall_reply_report('rp-token-report-one-000', (select id from rp_target), true)->>'hidden')::boolean);
select rp_ok('the same device twice is one report',
  not (wall_reply_report('rp-token-report-one-000', (select id from rp_target), true)->>'hidden')::boolean
  and (select count(*) from wall_reply_reports where reply_id = (select id from rp_target)) = 1);
select rp_ok('two leave it up',
  not (wall_reply_report('rp-token-report-two-000', (select id from rp_target), true)->>'hidden')::boolean);
select rp_ok('the third puts it out of sight',
  (wall_reply_report('rp-token-report-three-0', (select id from rp_target), true)->>'hidden')::boolean);
select rp_ok('and the row says so',
  (select status = 'hidden' from wall_replies where id = (select id from rp_target)));
select rp_ok('nobody sees it',
  not exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-nobody-00000000', rp_letter(1))->'replies') x
               where x->>'id' = (select id::text from rp_target)));
select rp_ok('but its writer, who is told',
  exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'replies') x
           where x->>'id' = (select id::text from rp_target) and x->>'status' = 'hidden'));
select rp_ok('a report taken back brings it back',
  not (wall_reply_report('rp-token-report-three-0', (select id from rp_target), false)->>'hidden')::boolean);
select rp_ok('up again', (select status = 'live' from wall_replies where id = (select id from rp_target)));
select rp_ok('and filed again hides it again',
  (wall_reply_report('rp-token-report-three-0', (select id from rp_target), true)->>'hidden')::boolean);
select rp_ok('the desk sees it waiting, with who wrote it',
  exists (select 1 from jsonb_array_elements(celestual_desk_replies('waiting')->'rows') x
           where x->>'id' = (select id::text from rp_target) and (x->>'reports')::int = 3
             and x->>'author_edu' = 'rp-school@stanford.edu')
  and (celestual_desk_replies()->'counts'->>'waiting')::int = 2);
select rp_ok('the desk puts it back',
  (celestual_desk_reply_set((select id from rp_target), 'live', 'fair comment')->>'ok')::boolean);
select rp_ok('and the reports stop counting',
  (select status = 'live' from wall_replies where id = (select id from rp_target))
  and (select count(*) = 0 from wall_reply_reports where reply_id = (select id from rp_target) and cleared_at is null)
  and (select moderation->'desk'->>'note' = 'fair comment' from wall_replies where id = (select id from rp_target)));
select rp_ok('and a device that reported it cannot count again',
  not (wall_reply_report('rp-token-report-one-000', (select id from rp_target), true)->>'hidden')::boolean
  and (select count(*) = 0 from wall_reply_reports where reply_id = (select id from rp_target) and cleared_at is null));
select rp_ok('a reply the desk put back stays up when a report is taken back',
  (wall_reply_report('rp-token-report-four-00', (select id from rp_target), true)->>'ok')::boolean
  and not (wall_reply_report('rp-token-report-four-00', (select id from rp_target), false)->>'hidden')::boolean
  and (select status = 'live' from wall_replies where id = (select id from rp_target)));
select rp_ok('the desk takes the held one down',
  (celestual_desk_reply_set((select id from wall_replies where status = 'held'), 'removed', null)->>'ok')::boolean
  and exists (select 1 from jsonb_array_elements(wall_reply_thread('rp-token-school-0000000', rp_letter(1))->'replies') x
               where x->>'body' = 'this one waits for a person' and x->>'status' = 'removed'));
select rp_ok('and nothing is waiting now', (celestual_desk_replies()->'counts'->>'waiting')::int = 0);
select rp_ok('the desk refuses a status it does not have',
  celestual_desk_replies('nonsense')->>'error' = 'bad_status'
  and celestual_desk_reply_set((select id from rp_target), 'held', null)->>'error' = 'bad_status');

-- ── 10. the throttle ────────────────────────────────────────────────────────
select rp_ok('six under one letter in ten minutes, and the seventh waits',
  (select count(*) from generate_series(1, 5) g
    where (rp_write('rp-token-school-0000000', rp_letter(2), 'again ' || g)->>'ok')::boolean) = 5
  and rp_write('rp-token-school-0000000', rp_letter(2), 'and again')->>'error' = 'throttle');

-- ── 11. the browser's reach ─────────────────────────────────────────────────
select rp_ok('no table is the browser''s',
  not has_table_privilege('anon', 'wall_replies', 'SELECT')
  and not has_table_privilege('anon', 'wall_reply_likes', 'SELECT')
  and not has_table_privilege('anon', 'wall_reply_reports', 'SELECT')
  and not has_table_privilege('anon', 'wall_reply_threads', 'SELECT')
  and not has_table_privilege('anon', 'wall_reply_terms', 'SELECT')
  and not has_table_privilege('authenticated', 'wall_replies', 'SELECT')
  and (select bool_and(relrowsecurity) from pg_class
        where relname in ('wall_replies', 'wall_reply_likes', 'wall_reply_reports', 'wall_reply_threads', 'wall_reply_terms')));
select rp_ok('it reads, likes, reports and shuts',
  has_function_privilege('anon', 'wall_reply_thread(text, uuid)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_reply_like(text, uuid, boolean)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_reply_report(text, uuid, boolean)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_reply_thread_set(text, uuid, text)', 'EXECUTE'));
select rp_ok('and it cannot write, or ask what the edge function asks',
  not has_function_privilege('anon', 'wall_reply_write(text, uuid, text, text, jsonb, text, boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'wall_reply_write(text, uuid, text, text, jsonb, text, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_reply_can(text, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_reply_agree(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'wall_reply_agree(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_reply_who(uuid, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_replies(text, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_reply_set(uuid, text, text)', 'EXECUTE'));
select rp_ok('the edge function''s question says what the classifier needs',
  (wall_reply_can('rp-token-school-0000000', rp_letter(1))->>'addressee') = '@rp.recipient'
  and (wall_reply_can('rp-token-school-0000000', rp_letter(1))->>'terms')::boolean
  and wall_reply_can('rp-token-plain-00000000', rp_letter(1))->>'error' = 'edu');

-- ── 12. the merge ───────────────────────────────────────────────────────────
-- Two devices of one person both liked the same reply; the absorbed row's
-- like folds into the survivor's rather than colliding with it.
select wall_reply_like('rp-token-merge-a-000000', (select id from wall_replies where body = 'i hope they read this'), true);
select wall_reply_like('rp-token-merge-b-000000', (select id from wall_replies where body = 'i hope they read this'), true);
update wall_reply_likes set user_id = rp_user('rp-token-merge-a-000000')
 where user_id = rp_user('rp-token-merge-b-000000');
select rp_ok('a like folds into the survivor''s under a merge',
  (select count(*) from wall_reply_likes where reply_id = (select id from wall_replies where body = 'i hope they read this')) = 1);

-- ── the cleanup ─────────────────────────────────────────────────────────────
-- Every row this made, and every person a token opened, so a test that
-- counts people after this one counts the same.
delete from celestual_users where id in (
  select rp_user(t) from unnest(array[
    'rp-token-writer-0000000', 'rp-token-school-0000000', 'rp-token-recip-00000000', 'rp-token-plain-00000000',
    'rp-token-stranger-heart0', 'rp-token-stranger-like0', 'rp-token-report-one-000', 'rp-token-report-two-000',
    'rp-token-report-three-0', 'rp-token-report-four-00', 'rp-token-merge-a-000000', 'rp-token-merge-b-000000',
    'rp-token-nobody-00000000']) t
  where rp_user(t) is not null);
delete from wall_letters where target_handle in ('rp.recipient', 'rp.other');
select rp_ok('and it leaves nothing behind',
  not exists (select 1 from wall_replies)
  and not exists (select 1 from wall_reply_likes)
  and not exists (select 1 from wall_reply_reports)
  and not exists (select 1 from wall_reply_terms)
  and not exists (select 1 from wall_reply_threads)
  and not exists (select 1 from celestual_users where edu_email like 'rp-%' or instagram_handle = 'rp.recipient'));

drop function rp_ok(text, boolean);
drop function rp_session(uuid, text);
drop function rp_write(text, uuid, text, text, boolean, text);
drop function rp_letter(int);
drop function rp_user(text);
