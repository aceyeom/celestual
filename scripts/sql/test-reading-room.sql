-- ─────────────────────────────────────────────────────────────────────────────
-- test-reading-room.sql: exercises 0044_the_reading_room_and_the_three.sql,
-- and the window 0051_five_days_between.sql shortens.
--
-- Two claims, and both are properties of the schema rather than of a screen:
-- a person this product has PROVED may read a letter, whichever proof they
-- hold; and only a campus address may write one, three times in five days.
-- Run through scripts/verify-migrations.sh --test. Self contained: its cast is
-- its own, so it does not depend on the order the tests run in.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function rr_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function rr_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- rr-writer   at berkeley, no handle. The ordinary wall writer.
-- rr-handle   a proved Instagram handle and no campus address at all. This is
--             the person the migration exists for: twenty-five of the
--             twenty-seven people on the product were this person.
-- rr-neither  a session, and nothing proved on it.
-- rr-other    at stanford. Proved, just not here, and no handle either.
--             Since 0057 any proof reads any open wall, so this person reads
--             here too, and only writing still turns on the campus.
do $$
declare w uuid; h uuid; n uuid; o uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at)
    values ('rr-writer@berkeley.edu', now()) returning id into w;
  insert into celestual_users (instagram_handle, handle_verified_at)
    values ('rrhandle', now()) returning id into h;
  insert into celestual_users default values returning id into n;
  insert into celestual_users (edu_email, edu_verified_at)
    values ('rr-other@stanford.edu', now()) returning id into o;
  perform rr_session(w, 'rr-token-writer-000000');
  perform rr_session(h, 'rr-token-handle-000000');
  perform rr_session(n, 'rr-token-neither-00000');
  perform rr_session(o, 'rr-token-other-0000000');
end $$;

-- ── 1. the two gates are two gates ──────────────────────────────────────────
select rr_ok('a campus address reads',
  wall_read_gate((select id from celestual_users where edu_email='rr-writer@berkeley.edu'), 'berkeley'));
select rr_ok('a proved handle reads',
  wall_read_gate((select id from celestual_users where instagram_handle='rrhandle'), 'berkeley'));
select rr_ok('a proved handle does NOT write',
  wall_gate((select id from celestual_users where instagram_handle='rrhandle'), 'berkeley') = false);
select rr_ok('nothing proved reads nothing',
  wall_read_gate((select id from celestual_users where edu_email is null and instagram_handle is null
                   and handle_verified_at is null limit 1), 'berkeley') = false);
select rr_ok('a stanford address reads here too, since 0057',
  wall_read_gate((select id from celestual_users where edu_email='rr-other@stanford.edu'), 'berkeley'));
select rr_ok('and still does not write here',
  wall_gate((select id from celestual_users where edu_email='rr-other@stanford.edu'), 'berkeley') = false);
select rr_ok('nobody at all reads nothing', wall_read_gate(null, 'berkeley') = false);
select rr_ok('a campus that is not open is shut to a proved handle', wall_read_gate(
  (select id from celestual_users where instagram_handle='rrhandle'), 'nowhere') = false);
select rr_ok('the read gate is not reachable from the browser',
  not has_function_privilege('anon', 'wall_read_gate(uuid, text)', 'EXECUTE'));

-- ── 2. the words arrive, or they do not ─────────────────────────────────────
select wall_write('rr-token-writer-000000', 'rrsubject', 'the letter itself, in words',
                  null, null, 'berkeley', 'live', '{}');

-- 0045 handed every browser eight whole letters before it asked for anything,
-- and the ninth arrived with its words withheld. Since 0066 there is no
-- ninth: every reader is handed the words, proved or not, and the gate above
-- is what the heart and the report ask (section 3). The readers who used to
-- be refused are the ones asserted here.
select rr_ok('a proved handle is handed the words',
  (wall_letters_for('rr-token-handle-000000', 'rrsubject')->'letters'->0->>'body')
    = 'the letter itself, in words');
select rr_ok('and the read says it is open',
  (wall_letters_for('rr-token-handle-000000', 'rrsubject')->>'open')::boolean);
select rr_ok('a session with nothing proved on it is handed them too, since 0066',
  (wall_letters_for('rr-token-neither-00000', 'rrsubject')->'letters'->0->>'body')
    = 'the letter itself, in words');
select rr_ok('another campus is handed the words, since 0057',
  (wall_letters_for('rr-token-other-0000000', 'rrsubject')->'letters'->0->>'body')
    = 'the letter itself, in words');
select rr_ok('and so is nobody at all, since 0066',
  (wall_letters_for('rr-token-nobody-000000', 'rrsubject')->'letters'->0->>'body')
    = 'the letter itself, in words');
select rr_ok('the read still carries the word count',
  ((wall_letters_for('rr-token-neither-00000', 'rrsubject')->'letters'->0->>'words')::int) = 5);

select rr_ok('one letter reads whole to a proved handle too',
  (wall_letter('rr-token-handle-000000',
    (wall_letters_for('rr-token-handle-000000', 'rrsubject')->'letters'->0->>'id')::uuid
   )->'letter'->>'body') = 'the letter itself, in words');

-- ── 3. the heart and the report follow reading ──────────────────────────────
select rr_ok('a proved handle may heart',
  (wall_heart('rr-token-handle-000000',
    (wall_letters_for('rr-token-handle-000000', 'rrsubject')->'letters'->0->>'id')::uuid, true)
   ->>'ok')::boolean);
select rr_ok('a session with nothing proved on it may not',
  (wall_heart('rr-token-neither-00000',
    (wall_letters_for('rr-token-handle-000000', 'rrsubject')->'letters'->0->>'id')::uuid, true)
   ->>'error') = 'gate');

-- The report takes the letter down, so it goes last of the three and against
-- its own letter.
select wall_write('rr-token-writer-000000', 'rrreported', 'a letter that will be reported',
                  null, null, 'berkeley', 'live', '{}');
select rr_ok('a proved handle may report what it can read',
  (wall_report('rr-token-handle-000000',
    (wall_letters_for('rr-token-handle-000000', 'rrreported')->'letters'->0->>'id')::uuid, 'no reason')
   ->>'ok')::boolean);

-- ── 4. three in five days ───────────────────────────────────────────────────
-- The writer has spent two already (the two letters above), so one is left.
--
-- 0052 seeds the cap OFF, so the allowance is asserted with the switch turned
-- on and the off state gets a section of its own at the end. Turned on
-- through the desk's own function rather than by writing the row, so the
-- whitelist is exercised where the switch is.
select rr_ok('the cap is the desk''s to turn on',
  (celestual_desk_setting_set('wall_letter_cap', 'true')->>'ok')::boolean);
select rr_ok('the allowance is three', wall_letter_allowance() = 3);
select rr_ok('and the window is five days (0051)', wall_letter_window() = interval '5 days');
select rr_ok('two spent, one left',
  (wall_quota('rr-token-writer-000000')->>'left')::int = 1);
select rr_ok('and it says when one comes back',
  (wall_quota('rr-token-writer-000000')->>'resets_at') is not null);

select rr_ok('the third goes up',
  (wall_write('rr-token-writer-000000', 'rrthird', 'the third letter',
              null, null, 'berkeley', 'live', '{}')->>'ok')::boolean);
select rr_ok('and the fourth is refused',
  (wall_write('rr-token-writer-000000', 'rrfourth', 'the fourth letter',
              null, null, 'berkeley', 'live', '{}')->>'error') = 'cap');
select rr_ok('the refusal says what the allowance was',
  (wall_write('rr-token-writer-000000', 'rrfourth', 'the fourth letter',
              null, null, 'berkeley', 'live', '{}')->>'limit')::int = 3);
select rr_ok('nothing is left',
  (wall_quota('rr-token-writer-000000')->>'left')::int = 0);

-- A letter the screen rejected is written and does not spend one, so the
-- writer who has spent all three can still be told no by the screen rather
-- than by the meter.
select rr_ok('a rejected letter is still written',
  (wall_write('rr-token-writer-000000', 'rrrejected', 'a letter with a phone number in it',
              null, null, 'berkeley', 'rejected', '{}')->>'ok')::boolean);
select rr_ok('and it does not spend one',
  (wall_quota('rr-token-writer-000000')->>'used')::int = 3);

-- A letter taken down still counts: a report must not hand its author a fresh
-- slot. The reported letter above is one of the three already counted.
select rr_ok('a letter taken down still counts against the window',
  (select count(*) from wall_letters
    where author_id = (select id from celestual_users where edu_email='rr-writer@berkeley.edu')
      and status = 'removed') = 1);

-- The window is a rolling one. Backdate the three to four days ago and they
-- still count; to six and the allowance is whole again, without anybody
-- having deleted anything.
update wall_letters set created_at = now() - interval '4 days'
 where author_id = (select id from celestual_users where edu_email='rr-writer@berkeley.edu');
select rr_ok('four days on, the three still stand',
  (wall_quota('rr-token-writer-000000')->>'left')::int = 0);
update wall_letters set created_at = now() - interval '6 days'
 where author_id = (select id from celestual_users where edu_email='rr-writer@berkeley.edu');
select rr_ok('six days on, the three come back',
  (wall_quota('rr-token-writer-000000')->>'left')::int = 3);
select rr_ok('and with nothing spent there is nothing to reset',
  (wall_quota('rr-token-writer-000000')->>'resets_at') is null);

-- ── 5. what the quota will and will not say ─────────────────────────────────
select rr_ok('an unknown browser is told the whole allowance',
  (wall_quota('rr-token-nobody-000000')->>'left')::int = 3
  and (wall_quota('rr-token-nobody-000000')->>'signed_in')::boolean = false);
select rr_ok('the quota is open to the browser',
  has_function_privilege('anon', 'wall_quota(text)', 'EXECUTE'));
select rr_ok('and it takes no argument for anybody else',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'wall_quota'
      and pg_get_function_identity_arguments(p.oid) = 'p_token text') = 1);
select rr_ok('a browser cannot count somebody else letter by letter',
  not has_function_privilege('anon', 'wall_letters_spent(uuid)', 'EXECUTE'));

-- ── 6. and the write gate is where it was ───────────────────────────────────
select rr_ok('a proved handle with no campus address cannot write',
  (wall_write('rr-token-handle-000000', 'rrsubject', 'a letter from outside the campus',
              null, null, 'berkeley', 'live', '{}')->>'error') = 'gate');
select rr_ok('and neither can a session with nothing proved on it',
  (wall_write('rr-token-neither-00000', 'rrsubject', 'a letter from nobody',
              null, null, 'berkeley', 'live', '{}')->>'error') = 'gate');

-- ── 7. the cap comes off, and goes back on (0052) ───────────────────────────
-- The writer's three were backdated out of the window in section 4, so this
-- section starts them whole and spends them again, which is the only state
-- the switch is visible from.
select wall_write('rr-token-writer-000000', 'rrcapa', 'one', null, null, 'berkeley', 'live', '{}');
select wall_write('rr-token-writer-000000', 'rrcapb', 'two', null, null, 'berkeley', 'live', '{}');
select wall_write('rr-token-writer-000000', 'rrcapc', 'three', null, null, 'berkeley', 'live', '{}');
select rr_ok('with the cap on, the fourth is still refused',
  (wall_write('rr-token-writer-000000', 'rrcapd', 'four',
              null, null, 'berkeley', 'live', '{}')->>'error') = 'cap');

select rr_ok('the desk turns it off',
  (celestual_desk_setting_set('wall_letter_cap', 'false')->>'ok')::boolean);
select rr_ok('and the quota says it is not counting',
  (wall_quota('rr-token-writer-000000')->>'capped')::boolean = false);
select rr_ok('the allowance never runs down while it is off',
  (wall_quota('rr-token-writer-000000')->>'left')::int = wall_letter_allowance());
select rr_ok('nothing is waiting to come back',
  (wall_quota('rr-token-writer-000000')->>'resets_at') is null);
select rr_ok('but what was written is still counted honestly',
  (wall_quota('rr-token-writer-000000')->>'used')::int = 3);
select rr_ok('and the fourth goes up',
  (wall_write('rr-token-writer-000000', 'rrcapd', 'four',
              null, null, 'berkeley', 'live', '{}')->>'ok')::boolean);
select rr_ok('and so does the fifth',
  (wall_write('rr-token-writer-000000', 'rrcape', 'five',
              null, null, 'berkeley', 'live', '{}')->>'ok')::boolean);

-- Nothing else about writing moved: the campus gate is still the campus gate
-- with the cap off, which is the one thing this switch must not touch.
select rr_ok('the gate is not on the switch',
  (wall_write('rr-token-handle-000000', 'rrcapf', 'from outside the campus',
              null, null, 'berkeley', 'live', '{}')->>'error') = 'gate');

select rr_ok('the desk turns it back on',
  (celestual_desk_setting_set('wall_letter_cap', 'true')->>'ok')::boolean);
select rr_ok('and the five already written are counted again',
  (wall_write('rr-token-writer-000000', 'rrcapg', 'six',
              null, null, 'berkeley', 'live', '{}')->>'error') = 'cap');

-- The number is the desk's too, and one is the smallest it can take: a nought
-- would shut the composer for the whole campus while the switch still said
-- the cap was on.
select rr_ok('the number is the desk''s',
  (celestual_desk_setting_set('wall_letter_allowance', '9')->>'ok')::boolean);
select rr_ok('and it is read on the next letter',
  wall_letter_allowance() = 9 and (wall_quota('rr-token-writer-000000')->>'left')::int = 4);
select rr_ok('a nought allowance is refused',
  (celestual_desk_setting_set('wall_letter_allowance', '0')->>'error') = 'bad_value');
select rr_ok('and so is a word',
  (celestual_desk_setting_set('wall_letter_allowance', 'lots')->>'error') = 'bad_value');
select rr_ok('the switch takes true or false and nothing else',
  (celestual_desk_setting_set('wall_letter_cap', 'off')->>'error') = 'bad_value');

-- Left as 0052 seeds it, so nothing later in the run meets a cap this file
-- turned on.
select celestual_desk_setting_set('wall_letter_allowance', '3');
select celestual_desk_setting_set('wall_letter_cap', 'false');
