-- ─────────────────────────────────────────────────────────────────────────────
-- test-login-link.sql: exercises 0065_the_link_for_everybody.sql.
--
-- The login link takes any address and signs the device in as the person who
-- holds it, by whichever proof they showed that inbox before; the device that
-- opened the link follows, but only with the number the asking screen shows
-- (a wrong one burns the link); a .edu address opens its campus; two people
-- on one device are a switch and never a merge; and a person signed in by ANY
-- proof gets the proof their own verified @ is read with, from the server,
-- with no second DM, and nobody gets one for an @ they do not hold. Run
-- through scripts/verify-migrations.sh --test. Everything is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function ll_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function ll_hash(p text) returns text
language sql as $$ select encode(extensions.digest(p, 'sha256'), 'hex') $$;

-- the person a session token resolves to, followed through any merge
create or replace function ll_user(p_token text) returns uuid
language sql as $$
  select celestual_user_live(user_id) from celestual_sessions where token_hash = ll_hash(p_token)
$$;

-- open a login link for an address from a device, and answer its request id
create or replace function ll_open(p_email text, p_session text, p_link text, p_match int default 42)
returns text language sql as $$
  select celestual_edu_link_open(p_email, p_session, 'login', null, null, ll_hash(p_link), p_match)->>'request'
$$;

-- a verified DM proof, the way the real flow leaves one behind
create or replace function ll_dm(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_via, verified_at, expires_at)
  values (p_handle, substr(md5(random()::text), 1, 6), ll_hash(p_proof), 'verified', 'test:' || p_handle,
          'dm', now() - interval '40 days', now() - interval '1 day');
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── 1. who may call what ─────────────────────────────────────────────────────
select ll_ok('the bind by address is the service role''s',
  not has_function_privilege('anon', 'celestual_user_bind_email_hash(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_user_bind_email_hash(text, text)', 'EXECUTE'));
select ll_ok('the link stays the service role''s',
  not has_function_privilege('anon', 'celestual_edu_link_open(text, text, text, text, text, text, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_edu_link_confirm(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_edu_link_confirm(text, text, integer)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_edu_link_confirm(text, text, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_edu_link_status(text, text)', 'EXECUTE'));
select ll_ok('the @''s proof is asked for by the browser',
  has_function_privilege('anon', 'celestual_session_handle_proof(text, text)', 'EXECUTE'));

-- ── 2. the login link takes any address ──────────────────────────────────────
select ll_ok('a login link opens for any address',
  ll_open('First@Gmail.com', 'token-ll-first-000000', 'link-ll-first-aaaaaaaaaaaa') is not null);
select ll_ok('and is a login request, with no campus',
  (select purpose = 'login' and kind = 'link' and campus is null and email = 'first@gmail.com'
     from celestual_edu_verifications where email = 'first@gmail.com'));
select ll_ok('a campus link still wants a .edu',
  (celestual_edu_link_open('first@gmail.com', 'token-ll-first-000000', 'edu', null, null,
                           ll_hash('link-ll-first-edu-aaaaaaaa'), 30)->>'error') = 'domain');
select ll_ok('a purpose nobody knows is refused',
  (celestual_edu_link_open('first@gmail.com', 'token-ll-first-000000', 'sneak', null, null,
                           ll_hash('link-ll-first-sneak-aaaaaa'), 30)->>'error') = 'purpose');
select ll_ok('before it is opened the device is nobody',
  ll_user('token-ll-first-000000') is null
  and (celestual_whoami('token-ll-first-000000')->>'signed_in')::boolean = false);

-- ── 3. opened on the device that asked ───────────────────────────────────────
select ll_ok('the link confirms a login on the device that asked',
  (select (r->>'ok')::boolean and r->>'purpose' = 'login' and (r->>'same_device')::boolean
     from (select celestual_edu_link_confirm('link-ll-first-aaaaaaaaaaaa', 'token-ll-first-000000') as r) s));
select ll_ok('and that device is a proved person, signed in by the address',
  (select (u->>'email_verified')::boolean and u->>'login_email' = 'first@gmail.com'
     from (select celestual_whoami('token-ll-first-000000')->'user' as u) s)
  and celestual_user_proved(ll_user('token-ll-first-000000')));
select ll_ok('the address is where the alerts go',
  (select alert_email = 'first@gmail.com' and alert_email_verified_at is not null
     from celestual_users where id = ll_user('token-ll-first-000000')));
select ll_ok('the status says so to the device that asked',
  (celestual_edu_link_status(
     (select token from celestual_edu_verifications where link_hash = ll_hash('link-ll-first-aaaaaaaaaaaa')),
     'token-ll-first-000000')->>'verified')::boolean);
select ll_ok('the link works once',
  (celestual_edu_link_confirm('link-ll-first-aaaaaaaaaaaa', 'token-ll-other-000000')->>'error') = 'used');

-- ── 4. the person who holds the address, from a new device ───────────────────
-- @owner DMd once, on a phone, and signed in there by email. Then a laptop.
insert into celestual_users (instagram_handle, handle_verified_at, email, email_verified_at, created_at)
values ('owner', now() - interval '40 days', 'owner@gmail.com', now() - interval '30 days', now() - interval '40 days');
insert into celestual_members (handle, handle_hash) values ('owner', celestual_hash_handle('owner'))
  on conflict (handle) do nothing;
select ll_dm('owner', 'the-phone-proof-that-lapsed');

select ll_open('owner@gmail.com', 'token-ll-laptop-00000', 'link-ll-owner-aaaaaaaaaaaa');
select celestual_edu_link_confirm('link-ll-owner-aaaaaaaaaaaa', 'token-ll-laptop-00000');
select ll_ok('the laptop is signed in as the person who holds the address',
  ll_user('token-ll-laptop-00000') = (select id from celestual_users where instagram_handle = 'owner'));
select ll_ok('and whoami carries their verified @ back',
  (select (u->>'handle_verified')::boolean and u->>'handle' = 'owner'
     from (select celestual_whoami('token-ll-laptop-00000')->'user' as u) s));
select ll_ok('the phone''s old proof is dead, as proofs die',
  not celestual_consume_ig_proof('owner', 'the-phone-proof-that-lapsed'));

-- ── 5. the @ comes back with the person ──────────────────────────────────────
select ll_ok('the laptop asks for the @''s proof and gets it, with no DM',
  (select (r->>'ok')::boolean and r->>'handle' = 'owner'
     from (select celestual_session_handle_proof('token-ll-laptop-00000', ll_hash('laptop-proof-one')) as r) s));
select ll_ok('the proof it minted is a live proof for that @',
  celestual_consume_ig_proof('owner', 'laptop-proof-one'));
select ll_ok('and it is stamped as the session''s, thirty days',
  (select verified_via = 'session' and expires_at > now() + interval '29 days'
     from celestual_ig_verifications where proof_hash = ll_hash('laptop-proof-one')));
select ll_ok('and the private notes read with it',
  (celestual_my_pings('owner', 'laptop-proof-one')->>'ok')::boolean);
select ll_ok('the same proof asked for twice is one row',
  (celestual_session_handle_proof('token-ll-laptop-00000', ll_hash('laptop-proof-one'))->>'ok')::boolean
  and (select count(*) from celestual_ig_verifications where proof_hash = ll_hash('laptop-proof-one')) = 1);
select ll_ok('it is never a proof for another @',
  not celestual_consume_ig_proof('somebody', 'laptop-proof-one'));
select ll_ok('a person with no @ gets nothing',
  (celestual_session_handle_proof('token-ll-first-000000', ll_hash('first-proof'))->>'error') = 'unclaimed'
  and not exists (select 1 from celestual_ig_verifications where proof_hash = ll_hash('first-proof')));
select ll_ok('a device nobody signed in gets nothing',
  (celestual_session_handle_proof('token-ll-nobody-00000', ll_hash('nobody-proof'))->>'error') = 'no_session'
  and (celestual_session_handle_proof(null, ll_hash('nobody-proof'))->>'error') = 'no_session');
select ll_ok('a hash that is not one is refused',
  (celestual_session_handle_proof('token-ll-laptop-00000', 'not-a-hash')->>'error') = 'invalid');
select ll_ok('a dozen an hour, and then no more',
  (select bool_and((celestual_session_handle_proof('token-ll-laptop-00000', ll_hash('burst-' || i))->>'ok')::boolean)
     from generate_series(2, 12) i)
  and (celestual_session_handle_proof('token-ll-laptop-00000', ll_hash('burst-13'))->>'error') = 'rate');

-- a banned @ is proved by nothing
insert into celestual_users (instagram_handle, handle_verified_at) values ('shut', now());
select celestual_session_bind((select id from celestual_users where instagram_handle = 'shut'), ll_hash('token-ll-shut-000000'));
insert into celestual_suppressions (handle_hash, kind)
select celestual_hash_handle('shut'), 'ban'
 where exists (select 1 from information_schema.columns where table_name = 'celestual_suppressions' and column_name = 'kind');
select ll_ok('an @ the desk banned is proved by nothing',
  (celestual_session_handle_proof('token-ll-shut-000000', ll_hash('shut-proof'))->>'error') = 'banned');

-- ── 6. asked on one device, opened on another ────────────────────────────────
-- The number is on the asking screen and nowhere else (0065 section 3). The
-- device that opens the link is asked for it, and nothing happens until it is
-- typed: a link somebody was sent and never asked for signs nobody in.
select ll_open('cross@proton.me', 'token-ll-cross-ask-00', 'link-ll-cross-aaaaaaaaaaaa', 61);
select ll_ok('opened on another device with no number, it asks for the number',
  (select r->>'error' = 'match' and r->>'purpose' = 'login' and not (r->>'ok')::boolean
     from (select celestual_edu_link_confirm('link-ll-cross-aaaaaaaaaaaa', 'token-ll-cross-open-0', null) as r) s));
select ll_ok('and nothing is spent: the link still waits, and nobody is signed in',
  (select status = 'pending' and verified_at is null and confirmed_session_hash is null and expires_at > now()
     from celestual_edu_verifications where link_hash = ll_hash('link-ll-cross-aaaaaaaaaaaa'))
  and ll_user('token-ll-cross-ask-00') is null
  and ll_user('token-ll-cross-open-0') is null
  and not (celestual_edu_link_status(
     (select token from celestual_edu_verifications where link_hash = ll_hash('link-ll-cross-aaaaaaaaaaaa')),
     'token-ll-cross-ask-00')->>'verified')::boolean);
select ll_ok('the call the deployed function makes asks the same way',
  (celestual_edu_link_confirm('link-ll-cross-aaaaaaaaaaaa', 'token-ll-cross-open-0')->>'error') = 'match'
  and (celestual_edu_link_confirm('link-ll-cross-aaaaaaaaaaaa', null)->>'error') = 'match'
  and (select status = 'pending' from celestual_edu_verifications where link_hash = ll_hash('link-ll-cross-aaaaaaaaaaaa')));
select ll_ok('with the number on the asking screen, it confirms, and says it was another device',
  (select (r->>'ok')::boolean and not (r->>'same_device')::boolean
     from (select celestual_edu_link_confirm('link-ll-cross-aaaaaaaaaaaa', 'token-ll-cross-open-0', 61) as r) s));
select ll_ok('and both devices are the one person',
  ll_user('token-ll-cross-ask-00') is not null
  and ll_user('token-ll-cross-ask-00') = ll_user('token-ll-cross-open-0'));
select ll_ok('the device that opened it may ask again, and is answered',
  (celestual_edu_link_confirm('link-ll-cross-aaaaaaaaaaaa', 'token-ll-cross-open-0')->>'ok')::boolean);
select ll_ok('and a third device is told it was used, number or not',
  (celestual_edu_link_confirm('link-ll-cross-aaaaaaaaaaaa', 'token-ll-cross-third', 61)->>'error') = 'used');

-- A wrong number burns the link: one guess in ninety, once.
insert into celestual_users (instagram_handle, handle_verified_at, email, email_verified_at)
values ('target', now(), 'target@gmail.com', now());
select ll_open('target@gmail.com', 'token-ll-asker-00000', 'link-ll-wrong-aaaaaaaaaaaa', 72);
select ll_ok('a wrong number is refused',
  (select r->>'error' = 'mismatch' and r->>'purpose' = 'login'
     from (select celestual_edu_link_confirm('link-ll-wrong-aaaaaaaaaaaa', 'token-ll-victim-0000', 27) as r) s));
select ll_ok('and the link is burned: nobody is signed in on either device',
  (select status = 'refused' and verified_at is null and expires_at <= now()
     from celestual_edu_verifications where link_hash = ll_hash('link-ll-wrong-aaaaaaaaaaaa'))
  and ll_user('token-ll-asker-00000') is null
  and ll_user('token-ll-victim-0000') is null);
select ll_ok('the right number after a wrong one is refused too',
  (celestual_edu_link_confirm('link-ll-wrong-aaaaaaaaaaaa', 'token-ll-victim-0000', 72)->>'error') = 'mismatch');
select ll_ok('so is the device that asked, once it is burned',
  (celestual_edu_link_confirm('link-ll-wrong-aaaaaaaaaaaa', 'token-ll-asker-00000')->>'error') = 'mismatch');
select ll_ok('and still nobody is signed in',
  ll_user('token-ll-asker-00000') is null and ll_user('token-ll-victim-0000') is null);
select ll_ok('and the asking screen reads it as run out, so it asks again',
  (select (st->>'expired')::boolean and not (st->>'verified')::boolean
     from (select celestual_edu_link_status(
             (select token from celestual_edu_verifications where link_hash = ll_hash('link-ll-wrong-aaaaaaaaaaaa')),
             'token-ll-asker-00000') as st) s));

-- The same rule for a campus link and an alerts link: another device types
-- the number, and the device that asked needs none.
select celestual_edu_link_open('camp@berkeley.edu', 'token-ll-camp-ask-00', 'edu', 'berkeley', null,
                               ll_hash('link-ll-camp-aaaaaaaaaaaaa'), 45);
select ll_ok('a campus link opened elsewhere asks for the number too',
  (celestual_edu_link_confirm('link-ll-camp-aaaaaaaaaaaaa', 'token-ll-camp-open-0')->>'error') = 'match'
  and not exists (select 1 from celestual_users where edu_email = 'camp@berkeley.edu'));
select ll_ok('and with it, it confirms the campus',
  (celestual_edu_link_confirm('link-ll-camp-aaaaaaaaaaaaa', 'token-ll-camp-open-0', 45)->>'campus') = 'berkeley');
select ll_ok('on the device that asked',
  (select edu_email = 'camp@berkeley.edu' from celestual_users where id = ll_user('token-ll-camp-ask-00')));
select celestual_edu_link_open('alerted@gmail.com', 'token-ll-camp-ask-00', 'alerts', null, null,
                               ll_hash('link-ll-alerted-aaaaaaaaaa'), 83);
select ll_ok('an alerts link opened elsewhere with a wrong number is refused',
  (celestual_edu_link_confirm('link-ll-alerted-aaaaaaaaaa', 'token-ll-camp-open-0', 38)->>'error') = 'mismatch');
select ll_ok('and sets nothing',
  (select coalesce(alert_email, '') <> 'alerted@gmail.com' from celestual_users where id = ll_user('token-ll-camp-ask-00')));

-- ── 7. a device with a row of its own is merged into the person ──────────────
-- A laptop that wrote a letter before it signed in has a row, made for it,
-- with no proof on it. Signing in makes the two one person, older surviving.
insert into celestual_users (created_at) values (now() - interval '90 days');
select celestual_session_bind((select id from celestual_users where created_at < now() - interval '89 days'
                                  and instagram_handle is null and email is null and edu_email is null
                                  and merged_into is null order by created_at limit 1),
                              ll_hash('token-ll-old-device-0'));
select ll_open('owner@gmail.com', 'token-ll-old-device-0', 'link-ll-merge-aaaaaaaaaaaa', 19);
select celestual_edu_link_confirm('link-ll-merge-aaaaaaaaaaaa', 'token-ll-old-device-0');
select ll_ok('the device''s row and the person are merged, the older surviving',
  ll_user('token-ll-old-device-0') = ll_user('token-ll-laptop-00000')
  and (select instagram_handle = 'owner' and email = 'owner@gmail.com' and email_verified_at is not null
         from celestual_users where id = ll_user('token-ll-old-device-0'))
  and (select created_at < now() - interval '89 days' from celestual_users where id = ll_user('token-ll-old-device-0')));
select ll_ok('the merge is on the trail',
  exists (select 1 from celestual_user_merges where reason = 'bind_email'));

-- ── 8. two people on one device switch, and are never merged ─────────────────
-- @friend is signed in on this laptop, and @owner signs in on it with their
-- address. The laptop becomes @owner; @friend's row is left as it was.
insert into celestual_users (instagram_handle, handle_verified_at, email, email_verified_at)
values ('friend', now(), 'friend@gmail.com', now());
select celestual_session_bind((select id from celestual_users where instagram_handle = 'friend'), ll_hash('token-ll-shared-0000'));
select ll_open('owner@gmail.com', 'token-ll-shared-0000', 'link-ll-shared-aaaaaaaaaaa', 77);
select celestual_edu_link_confirm('link-ll-shared-aaaaaaaaaaa', 'token-ll-shared-0000');
select ll_ok('the shared device is signed in as the address''s person',
  ll_user('token-ll-shared-0000') = ll_user('token-ll-laptop-00000'));
select ll_ok('and the friend''s row is untouched, and nothing is a conflict',
  (select merged_into is null and instagram_handle = 'friend' and email = 'friend@gmail.com'
     from celestual_users where instagram_handle = 'friend')
  and not exists (select 1 from celestual_merge_conflicts where detail->>'reason' = 'bind_email'));

-- A new address, on a device whose person signs in with another one, is
-- somebody else: a new person, never a second address on the first.
select ll_open('stranger@gmail.com', 'token-ll-shared-0000', 'link-ll-stranger-aaaaaaaaa', 55);
select celestual_edu_link_confirm('link-ll-stranger-aaaaaaaaa', 'token-ll-shared-0000');
select ll_ok('a second address on a signed in device is a new person',
  ll_user('token-ll-shared-0000') <> ll_user('token-ll-laptop-00000')
  and (select email = 'stranger@gmail.com' and instagram_handle is null
         from celestual_users where id = ll_user('token-ll-shared-0000'))
  and (select email = 'owner@gmail.com' from celestual_users where id = ll_user('token-ll-laptop-00000')));

-- An address held as a note (0030's `email`, never proved) is replaced by the
-- one the link proves, on the same person.
insert into celestual_users (instagram_handle, handle_verified_at, email) values ('noted', now(), 'old-note@gmail.com');
select celestual_session_bind((select id from celestual_users where instagram_handle = 'noted'), ll_hash('token-ll-noted-00000'));
select ll_open('noted@gmail.com', 'token-ll-noted-00000', 'link-ll-noted-aaaaaaaaaaaa', 23);
select celestual_edu_link_confirm('link-ll-noted-aaaaaaaaaaaa', 'token-ll-noted-00000');
select ll_ok('a proved address replaces a note, on the same person',
  (select instagram_handle = 'noted' and email = 'noted@gmail.com' and email_verified_at is not null
     from celestual_users where id = ll_user('token-ll-noted-00000')));

-- ── 9. a .edu address signs in and opens its campus ──────────────────────────
select ll_open('Student@Berkeley.edu', 'token-ll-student-000', 'link-ll-student-aaaaaaaaaa', 88);
select ll_ok('the status names the campus before the link is opened',
  (celestual_edu_link_status(
     (select token from celestual_edu_verifications where link_hash = ll_hash('link-ll-student-aaaaaaaaaa')),
     'token-ll-student-000')->>'campus') = 'berkeley');
select ll_ok('the login confirms, and answers the campus',
  (celestual_edu_link_confirm('link-ll-student-aaaaaaaaaa', 'token-ll-student-000')->>'campus') = 'berkeley');
select ll_ok('and the person is proved at the campus too',
  (select (u->>'edu_verified')::boolean and u->>'campus' = 'berkeley.edu' and (u->>'email_verified')::boolean
     from (select celestual_whoami('token-ll-student-000')->'user' as u) s));

-- somebody who proved their campus address to post signs in with it on a new
-- laptop: the same person, not a new one
insert into celestual_users (instagram_handle, handle_verified_at, edu_email, edu_verified_at)
values ('poster', now(), 'poster@berkeley.edu', now());
select ll_open('poster@berkeley.edu', 'token-ll-poster-lap0', 'link-ll-poster-aaaaaaaaaaa', 14);
select celestual_edu_link_confirm('link-ll-poster-aaaaaaaaaaa', 'token-ll-poster-lap0');
select ll_ok('a campus address signs in as the person who proved it',
  ll_user('token-ll-poster-lap0') = (select id from celestual_users where instagram_handle = 'poster')
  and (celestual_session_handle_proof('token-ll-poster-lap0', ll_hash('poster-proof'))->>'handle') = 'poster');

-- and a google account at the address is the same person
insert into celestual_users (google_sub, google_email, google_verified_at, instagram_handle, handle_verified_at)
values ('00000000-0000-4000-8000-00000000abcd', 'gee@gmail.com', now(), 'gee', now());
select ll_open('gee@gmail.com', 'token-ll-gee-laptop0', 'link-ll-gee-aaaaaaaaaaaaaa', 37);
select celestual_edu_link_confirm('link-ll-gee-aaaaaaaaaaaaaa', 'token-ll-gee-laptop0');
select ll_ok('an address a google login holds signs in as that person',
  ll_user('token-ll-gee-laptop0') = (select id from celestual_users where instagram_handle = 'gee'));

-- ── 10. the two purposes 0064 had answer as they did ─────────────────────────
select ll_open('late@gmail.com', 'token-ll-late-000000', 'link-ll-late-aaaaaaaaaaaaa', 12);
update celestual_edu_verifications set expires_at = now() - interval '1 minute' where email = 'late@gmail.com';
select ll_ok('a login link that lapsed says so',
  (celestual_edu_link_confirm('link-ll-late-aaaaaaaaaaaaa', 'token-ll-late-000000')->>'error') = 'expired'
  and ll_user('token-ll-late-000000') is null);
select celestual_edu_link_open('campus@berkeley.edu', 'token-ll-campus-0000', 'edu', 'berkeley', null,
                               ll_hash('link-ll-campus-aaaaaaaaaaa'), 44);
select ll_ok('a campus link still proves a campus',
  (select r->>'purpose' = 'edu' and r->>'campus' = 'berkeley'
     from (select celestual_edu_link_confirm('link-ll-campus-aaaaaaaaaaa', 'token-ll-campus-0000') as r) s)
  and (select (u->>'edu_verified')::boolean and not (u->>'email_verified')::boolean
         from (select celestual_whoami('token-ll-campus-0000')->'user' as u) s));

-- ── 11. a resend from the same screen keeps the number ───────────────────────
select ll_ok('the first link answers the number it was given',
  (celestual_edu_link_open('again@gmail.com', 'token-ll-again-00000', 'login', null, null,
                           ll_hash('link-ll-again-aaaaaaaaaaaa'), 31)->>'match')::int = 31);
select ll_ok('a second link for the same address from the same screen carries the first one''s number',
  (celestual_edu_link_open('again@gmail.com', 'token-ll-again-00000', 'login', null, null,
                           ll_hash('link-ll-again-bbbbbbbbbbbb'), 77)->>'match')::int = 31);
select ll_ok('so the late first mail opened elsewhere takes the number on the screen',
  (celestual_edu_link_confirm('link-ll-again-aaaaaaaaaaaa', 'token-ll-again-other0', 31)->>'ok')::boolean);
select ll_ok('another screen asking for the same address gets its own number',
  (celestual_edu_link_open('again@gmail.com', 'token-ll-again-third0', 'login', null, null,
                           ll_hash('link-ll-again-cccccccccccc'), 58)->>'match')::int = 58);

rollback;
