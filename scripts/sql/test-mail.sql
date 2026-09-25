-- ─────────────────────────────────────────────────────────────────────────────
-- test-mail.sql: exercises 0064_mail_links_and_alerts.sql.
--
-- The magic link proves an address once, for the device that asked and the
-- device that opened it, and answers its status to the asker alone; a proved
-- campus address becomes the alert address; a letter to a claimed @ queues
-- one mail when the screen has read it, three a day, never to its own writer;
-- a match queues the mutual mail once, whichever way it is made; the drain
-- takes what is owed and skips what is not; and the links in a mail take a
-- letter down, put it back and stop the mail, once each. Run through
-- scripts/verify-migrations.sh --test. Everything is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function ml_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function ml_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

create or replace function ml_hash(p text) returns text
language sql as $$ select encode(extensions.digest(p, 'sha256'), 'hex') $$;

create or replace function ml_user(p_token text) returns uuid
language sql as $$
  select celestual_user_live(user_id) from celestual_sessions where token_hash = ml_hash(p_token)
$$;

-- A letter, the v2 way, with the verdict the screen would have written.
create or replace function ml_write(p_token text, p_target text, p_nonce text, p_verdict text default 'pass')
returns uuid language sql as $$
  select (wall_write(p_token => p_token, p_kind => 'handle', p_target => p_target, p_name => null,
                     p_salutation => null, p_body => 'a letter for the mail test', p_look => null,
                     p_campus_pick => null, p_source => null, p_status => 'live',
                     p_moderation => jsonb_build_object('verdict', p_verdict, 'reasons', '[]'::jsonb),
                     p_nonce => p_nonce)->>'id')::uuid
$$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;
insert into celestual_settings (key, value) values ('wall_letter_cap', 'false')
  on conflict (key) do update set value = 'false';

-- ── the cast ────────────────────────────────────────────────────────────────
-- owner   holds the verified @ ml_owner. No address yet.
-- writer  a berkeley address. Writes to ml_owner.
do $$
declare o uuid; w uuid;
begin
  insert into celestual_users (instagram_handle, handle_verified_at) values ('ml_owner', now()) returning id into o;
  insert into celestual_users (edu_email, edu_verified_at) values ('mlw@berkeley.edu', now()) returning id into w;
  perform ml_session(o, 'token-ml-owner-00000000');
  perform ml_session(w, 'token-ml-writer-0000000');
end $$;

-- ── 1. what the browser can reach ───────────────────────────────────────────
select ml_ok('the queue, the links and the stops are the service role''s',
  (select bool_and(relrowsecurity) from pg_class
    where relname in ('celestual_mail_outbox', 'celestual_mail_tokens', 'celestual_mail_suppressions'))
  and not has_table_privilege('anon', 'celestual_mail_outbox', 'SELECT')
  and not has_table_privilege('anon', 'celestual_mail_tokens', 'SELECT')
  and not has_table_privilege('authenticated', 'celestual_mail_suppressions', 'SELECT'));
select ml_ok('the browser reaches its five',
  has_function_privilege('anon', 'celestual_alerts_get(text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_alerts_set(text, boolean, boolean)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_alerts_off_by_token(text)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_remove_by_token(text)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_restore_by_token(text)', 'EXECUTE'));
select ml_ok('and nothing that sends, mints or binds',
  not has_function_privilege('anon', 'celestual_mail_take(integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_mail_done(uuid, boolean, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_edu_link_open(text, text, text, text, text, text, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_edu_link_confirm(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_edu_link_status(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_user_bind_edu_hash(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_mail_token_mint(text, text, uuid, text, uuid, uuid, interval)', 'EXECUTE'));

-- ── 2. the link ─────────────────────────────────────────────────────────────
create temp table ml_req as
  select celestual_edu_link_open('MLNew@Berkeley.edu', 'token-ml-dev-a-00000000', 'edu', null, '10.1.0.1',
                                 ml_hash('link-token-aaaaaaaaaaaaaaaaaaaa'), 47) as r;
select ml_ok('a campus address is asked for',
  ((select r from ml_req)->>'ok')::boolean and ((select r from ml_req)->>'request') is not null);
select ml_ok('the row keeps the hashes and the number, never the token',
  (select kind = 'link' and purpose = 'edu' and match = 47 and code_hash is null
          and email = 'mlnew@berkeley.edu'
          and session_hash = ml_hash('token-ml-dev-a-00000000')
          and link_hash = ml_hash('link-token-aaaaaaaaaaaaaaaaaaaa')
          and expires_at between now() + interval '29 minutes' and now() + interval '31 minutes'
     from celestual_edu_verifications where token = (select r from ml_req)->>'request'));
select ml_ok('its status answers the device that asked',
  (celestual_edu_link_status((select r from ml_req)->>'request', 'token-ml-dev-a-00000000')->>'verified') = 'false'
  and (celestual_edu_link_status((select r from ml_req)->>'request', 'token-ml-dev-a-00000000')->>'campus') = 'berkeley'
  and (celestual_edu_link_status((select r from ml_req)->>'request', 'token-ml-dev-a-00000000')->>'school') = 'UC Berkeley');
select ml_ok('and nobody else',
  (celestual_edu_link_status((select r from ml_req)->>'request', 'token-ml-dev-x-00000000')->>'error') = 'invalid');
select ml_ok('a campus link needs a .edu or a pass',
  (celestual_edu_link_open('someone@gmail.com', 'token-ml-dev-a-00000000', 'edu', null, null,
                           ml_hash('link-token-gmail-aaaaaaaaaaa'), 50)->>'error') = 'domain');
select ml_ok('a number that is not two digits is refused',
  (celestual_edu_link_open('mlnew2@berkeley.edu', 'token-ml-dev-a-00000000', 'edu', null, null,
                           ml_hash('link-token-bad-number-aaaaa'), 9)->>'error') = 'invalid'
  and (celestual_edu_link_open('mlnew2@berkeley.edu', 'token-ml-dev-a-00000000', 'edu', null, null,
                           ml_hash('link-token-bad-number-aaaaa'), null)->>'error') = 'invalid');
select ml_ok('a token nobody minted confirms nothing',
  (celestual_edu_link_confirm('link-token-nobody-minted-this', 'token-ml-dev-b-00000000')->>'error') = 'invalid');

create temp table ml_conf as
  select celestual_edu_link_confirm('link-token-aaaaaaaaaaaaaaaaaaaa', 'token-ml-dev-b-00000000') as r;
select ml_ok('the link confirms on the device that opened it',
  ((select r from ml_conf)->>'ok')::boolean
  and ((select r from ml_conf)->>'purpose') = 'edu'
  and ((select r from ml_conf)->>'campus') = 'berkeley'
  and ((select r from ml_conf)->>'school') = 'UC Berkeley'
  and not ((select r from ml_conf)->>'same_device')::boolean
  and ((select r from ml_conf)->>'request') = ((select r from ml_req)->>'request'));
select ml_ok('the device that asked is proved at the address',
  (select edu_email = 'mlnew@berkeley.edu' and edu_verified_at is not null
     from celestual_users where id = ml_user('token-ml-dev-a-00000000')));
select ml_ok('and the device that opened it is the same person',
  ml_user('token-ml-dev-b-00000000') = ml_user('token-ml-dev-a-00000000'));
select ml_ok('whose alert address is now the one they proved',
  (select alert_email = 'mlnew@berkeley.edu' and alert_email_verified_at is not null
          and not alerts_wrote and alerts_mutual
     from celestual_users where id = ml_user('token-ml-dev-a-00000000')));
select ml_ok('the status says so',
  (celestual_edu_link_status((select r from ml_req)->>'request', 'token-ml-dev-a-00000000')->>'verified')::boolean);
select ml_ok('the link works once',
  (celestual_edu_link_confirm('link-token-aaaaaaaaaaaaaaaaaaaa', 'token-ml-dev-c-00000000')->>'error') = 'used'
  and (celestual_edu_link_confirm('link-token-aaaaaaaaaaaaaaaaaaaa', null)->>'error') = 'used');
select ml_ok('but a page opened twice on the device that confirmed it is answered again',
  (celestual_edu_link_confirm('link-token-aaaaaaaaaaaaaaaaaaaa', 'token-ml-dev-b-00000000')->>'ok')::boolean);

select celestual_edu_link_open('late@berkeley.edu', 'token-ml-dev-d-00000000', 'edu', null, null,
                               ml_hash('link-token-late-aaaaaaaaaaaa'), 12);
update celestual_edu_verifications set expires_at = now() - interval '1 minute' where email = 'late@berkeley.edu';
select ml_ok('after thirty minutes it is expired',
  (celestual_edu_link_confirm('link-token-late-aaaaaaaaaaaa', 'token-ml-dev-d-00000000')->>'error') = 'expired');

select ml_ok('a device proved at one address is told another is taken',
  (celestual_edu_link_open('someoneelse@berkeley.edu', 'token-ml-dev-a-00000000', 'edu', null, null,
                           ml_hash('link-token-taken-aaaaaaaaaaa'), 33)->>'error') = 'taken');

select ml_ok('five an address an hour, as the code has',
  (select bool_and((celestual_edu_link_open('rate@berkeley.edu', 'token-ml-dev-r-00000000', 'edu', null, null,
                     ml_hash('link-token-rate-' || i), 20)->>'ok')::boolean) from generate_series(1, 5) i)
  and (celestual_edu_link_open('rate@berkeley.edu', 'token-ml-dev-r-00000000', 'edu', null, null,
                     ml_hash('link-token-rate-6'), 20)->>'error') = 'rate');
select ml_ok('fifteen a network address an hour',
  (select bool_and((celestual_edu_link_open('ip' || i || '@berkeley.edu', 'token-ml-dev-s-00000000', 'edu', null,
                     '10.9.9.9', ml_hash('link-token-ip-' || i), 20)->>'ok')::boolean) from generate_series(1, 15) i)
  and (celestual_edu_link_open('ip16@berkeley.edu', 'token-ml-dev-s-00000000', 'edu', null, '10.9.9.9',
                     ml_hash('link-token-ip-16'), 20)->>'error') = 'rate');

select celestual_edu_link_open('tim@cs.mit.edu', 'token-ml-dev-m-00000000', 'edu', null, null,
                               ml_hash('link-token-mit-aaaaaaaaaaaaa'), 64);
select ml_ok('a school the wall has not seen is named before it is opened',
  (celestual_edu_link_status((select token from celestual_edu_verifications where email = 'tim@cs.mit.edu'),
                             'token-ml-dev-m-00000000')->>'school') = 'MIT'
  and not exists (select 1 from wall_campuses where edu_domain = 'mit.edu'));
select ml_ok('and opened when the address is proved',
  (celestual_edu_link_confirm('link-token-mit-aaaaaaaaaaaaa', 'token-ml-dev-m-00000000')->>'campus') = 'mit');
select ml_ok('where the device that asked and opened it is one',
  (select is_open and not handle_notes from wall_campuses where slug = 'mit')
  and (celestual_edu_link_confirm('link-token-mit-aaaaaaaaaaaaa', 'token-ml-dev-m-00000000')->>'same_device')::boolean);

-- the alerts link: the owner confirms an address for alerts, on the same phone
select celestual_edu_link_open('Owner@Gmail.com', 'token-ml-owner-00000000', 'alerts', null, null,
                               ml_hash('link-token-alerts-aaaaaaaaaa'), 71);
select ml_ok('an alert address can be any address',
  (celestual_edu_link_confirm('link-token-alerts-aaaaaaaaaa', 'token-ml-owner-00000000')->>'purpose') = 'alerts');
select ml_ok('and is confirmed on the person who asked, and proves no campus',
  (select alert_email = 'owner@gmail.com' and alert_email_verified_at is not null and edu_email is null
     from celestual_users where instagram_handle = 'ml_owner'));

-- the code path fills it too, and never over a confirmed one
select celestual_user_bind_edu('token-ml-code-000000000', 'code@berkeley.edu');
select ml_ok('a campus address proved by the code becomes the alert address',
  (select alert_email = 'code@berkeley.edu' and alert_email_verified_at is not null
     from celestual_users where edu_email = 'code@berkeley.edu'));
select celestual_user_bind_edu('token-ml-owner-00000000', 'owneredu@berkeley.edu');
select ml_ok('but never over one already confirmed',
  (select alert_email = 'owner@gmail.com' and edu_email = 'owneredu@berkeley.edu'
     from celestual_users where instagram_handle = 'ml_owner'));
select ml_ok('the old bind still refuses what it refused',
  (celestual_user_bind_edu('token-ml-code-000000000', 'not-an-address')->>'error') = 'email'
  and (celestual_user_bind_edu('short', 'code@berkeley.edu')->>'error') = 'invalid'
  and (celestual_user_bind_edu('token-ml-code-000000000', 'code@gmail.com')->>'error') = 'email');

-- ── 3. the switches ─────────────────────────────────────────────────────────
select ml_ok('no session has no alerts', (celestual_alerts_get('token-ml-nobody-0000000')->>'error') = 'no_session');
select ml_ok('the owner''s alerts, with the address masked',
  celestual_alerts_get('token-ml-owner-00000000')
    = '{"ok":true,"handle":"ml_owner","claimed":true,"email":"o***@gmail.com","email_verified":true,"wrote":false,"mutual":true}'::jsonb);
select ml_ok('"someone wrote you" needs a claimed @',
  (celestual_alerts_set('token-ml-code-000000000', true, null)->>'error') = 'claim');
do $$
declare u uuid;
begin
  insert into celestual_users default values returning id into u;
  perform ml_session(u, 'token-ml-bare-000000000');
end $$;
select ml_ok('and either needs a confirmed address to turn on',
  (celestual_alerts_set('token-ml-bare-000000000', null, true)->>'error') = 'email');
select ml_ok('turning one off needs neither',
  (celestual_alerts_set('token-ml-bare-000000000', null, false)->>'ok')::boolean);
select ml_ok('the owner turns "someone wrote you" on',
  celestual_alerts_set('token-ml-owner-00000000', true, null) = '{"ok":true,"wrote":true,"mutual":true}'::jsonb);

-- ── 4. someone wrote you a letter ───────────────────────────────────────────
create temp table ml_l1 as select ml_write('token-ml-writer-0000000', 'ml_owner', 'nonce-ml-0001', 'unread') as id;
select ml_ok('a letter up and not yet read queues nothing',
  not exists (select 1 from celestual_mail_outbox where letter_id = (select id from ml_l1)));
select wall_screened((select id from ml_l1), 'pass', '[]'::jsonb, 'lexicon');
select ml_ok('the screen''s pass queues one mail to the owner''s address',
  (select count(*) = 1 and bool_and(kind = 'wrote' and to_email = 'owner@gmail.com' and status = 'queued'
                                    and handle = 'ml_owner' and user_id = (select id from celestual_users where instagram_handle = 'ml_owner'))
     from celestual_mail_outbox where letter_id = (select id from ml_l1)));
select wall_screened((select id from ml_l1), 'review', '["x"]'::jsonb, 'test');
select celestual_desk_letter_set((select id from ml_l1), 'live', 'fine');
select ml_ok('a second reading or the desk does not queue it again',
  (select count(*) from celestual_mail_outbox where letter_id = (select id from ml_l1)) = 1);

create temp table ml_l2 as select ml_write('token-ml-writer-0000000', 'ml_owner', 'nonce-ml-0002', 'unread') as id;
select wall_screened((select id from ml_l2), 'reject', '["threat"]'::jsonb, 'test');
select ml_ok('a letter the screen takes down is never mailed about',
  not exists (select 1 from celestual_mail_outbox where letter_id = (select id from ml_l2)));

create temp table ml_self as select ml_write('token-ml-owner-00000000', 'ml_owner', 'nonce-ml-self') as id;
select ml_ok('the owner is not told about their own letter',
  (select id from ml_self) is not null
  and not exists (select 1 from celestual_mail_outbox where letter_id = (select id from ml_self)));

select wall_write('token-ml-writer-0000000', null, 'to a name', null, null, 'berkeley', 'live',
                  '{"verdict":"pass"}'::jsonb, 'name', 'ML Owner', null::jsonb);
select ml_ok('a letter to a name is nobody''s to be told about',
  not exists (select 1 from celestual_mail_outbox o join wall_letters l on l.id = o.letter_id
               where l.target_kind = 'name'));

select ml_write('token-ml-writer-0000000', 'ml_owner', 'nonce-ml-0003');
select ml_write('token-ml-writer-0000000', 'ml_owner', 'nonce-ml-0004');
select ml_write('token-ml-writer-0000000', 'ml_owner', 'nonce-ml-0005');
select ml_ok('three a day, and no more',
  (select count(*) from celestual_mail_outbox o join celestual_users u on u.id = o.user_id
    where u.instagram_handle = 'ml_owner' and o.kind = 'wrote') = 3);

-- ── 5. the drain ────────────────────────────────────────────────────────────
create temp table ml_take as select celestual_mail_take(50) as r;
select ml_ok('the drain takes what is owed, with its links',
  jsonb_array_length((select r from ml_take)) >= 3
  and (select bool_and(x->>'kind' = 'wrote' and x->>'to_email' = 'owner@gmail.com'
                       and char_length(x->>'off_token') >= 40 and char_length(x->>'remove_token') >= 40
                       and x->>'handle' = 'ml_owner' and x ? 'letter_id')
         from jsonb_array_elements((select r from ml_take)) x where x->>'kind' = 'wrote'));
select ml_ok('the links are kept as hashes, one of each a mail',
  (select count(*) from celestual_mail_tokens t
    where t.token_hash in (select ml_hash(x->>'remove_token') from jsonb_array_elements((select r from ml_take)) x)
      and t.kind = 'remove') = 3
  and (select count(*) from celestual_mail_tokens t
    where t.token_hash in (select ml_hash(x->>'off_token') from jsonb_array_elements((select r from ml_take)) x)
      and t.kind = 'off' and t.scope = 'wrote' and t.email = 'owner@gmail.com') = 3);
select ml_ok('a row taken is not taken again while it is out',
  jsonb_array_length(celestual_mail_take(50)) = 0);

create temp table ml_rows as
  select (x->>'id')::uuid as id, (x->>'letter_id')::uuid as letter_id,
         x->>'remove_token' as rm, x->>'off_token' as off, row_number() over () as n
    from jsonb_array_elements((select r from ml_take)) x;
select ml_ok('a sent mail is closed',
  (celestual_mail_done((select id from ml_rows where n = 1), true, null)->>'ok')::boolean);
select ml_ok('and says so',
  (select status = 'sent' and sent_at is not null and attempts = 1 from celestual_mail_outbox
    where id = (select id from ml_rows where n = 1)));
select ml_ok('a failure backs off',
  (celestual_mail_done((select id from ml_rows where n = 2), false, 'resend 500')->>'attempts')::int = 1);
select ml_ok('to a minute from now, queued',
  (select status = 'queued' and due_at > now() and last_error = 'resend 500' and taken_until is null
     from celestual_mail_outbox where id = (select id from ml_rows where n = 2)));
do $$
declare i int;
begin
  for i in 2..5 loop
    perform celestual_mail_done((select id from ml_rows where n = 2), false, 'resend 500');
  end loop;
end $$;
select ml_ok('and gives up after the fifth',
  (select status = 'failed' and attempts = 5 from celestual_mail_outbox where id = (select id from ml_rows where n = 2)));

-- the third comes back owed, but its letter came down meanwhile
select celestual_mail_done((select id from ml_rows where n = 3), false, 'timeout');
update celestual_mail_outbox set due_at = now() where id = (select id from ml_rows where n = 3);
update wall_letters set status = 'removed' where id = (select letter_id from ml_rows where n = 3);
select ml_ok('a mail about a letter that came down is not sent',
  jsonb_array_length(celestual_mail_take(50)) = 0);
select ml_ok('and is closed as skipped, saying why',
  (select status = 'skipped' and last_error = 'letter_down' from celestual_mail_outbox
    where id = (select id from ml_rows where n = 3)));
update wall_letters set status = 'live' where id = (select letter_id from ml_rows where n = 3);

-- ── 6. the links ────────────────────────────────────────────────────────────
create temp table ml_rm as select wall_remove_by_token((select rm from ml_rows where n = 1)) as r;
select ml_ok('the removal link takes the letter down, with a day to undo',
  ((select r from ml_rm)->>'ok')::boolean
  and ((select r from ml_rm)->>'letter_id') = (select letter_id::text from ml_rows where n = 1)
  and ((select r from ml_rm)->>'undo_until')::timestamptz > now() + interval '23 hours');
select ml_ok('as the owner, with no claim, so the name stands',
  (select status = 'removed' and moderation #>> '{desk,via}' = 'owner' and moderation #>> '{desk,by}' = 'mail'
     from wall_letters where id = (select letter_id from ml_rows where n = 1))
  and not exists (select 1 from wall_claims where letter_id = (select letter_id from ml_rows where n = 1))
  and not wall_name_shut_any('ml_owner'));
select ml_ok('it works once',
  (wall_remove_by_token((select rm from ml_rows where n = 1))->>'error') = 'used');
select ml_ok('and puts the letter back within the day',
  (wall_restore_by_token((select rm from ml_rows where n = 1))->>'ok')::boolean);
select ml_ok('the letter is up again',
  (select status = 'live' from wall_letters where id = (select letter_id from ml_rows where n = 1)));
select ml_ok('and the undo pressed twice is still ok',
  (wall_restore_by_token((select rm from ml_rows where n = 1))->>'ok')::boolean);
select ml_ok('a link nobody minted is invalid',
  (wall_remove_by_token('nobody-minted-this-link-at-all')->>'error') = 'invalid'
  and (wall_restore_by_token('nobody-minted-this-link-at-all')->>'error') = 'invalid'
  and (wall_remove_by_token(null)->>'error') = 'invalid');
select ml_ok('an undo before any removal is invalid',
  (wall_restore_by_token((select rm from ml_rows where n = 3))->>'error') = 'invalid');
update celestual_mail_tokens set expires_at = now() - interval '1 minute'
 where token_hash = ml_hash((select rm from ml_rows where n = 3));
select ml_ok('a removal link past thirty days is expired',
  (wall_remove_by_token((select rm from ml_rows where n = 3))->>'error') = 'expired');
select wall_remove_by_token((select rm from ml_rows where n = 2));
update celestual_mail_tokens set used_at = now() - interval '25 hours'
 where token_hash = ml_hash((select rm from ml_rows where n = 2));
select ml_ok('an undo after a day is expired',
  (wall_restore_by_token((select rm from ml_rows where n = 2))->>'error') = 'expired');

select ml_ok('the stop link stops that kind of mail',
  celestual_alerts_off_by_token((select off from ml_rows where n = 1)) = '{"ok":true,"scope":"wrote"}'::jsonb);
select ml_ok('for the person and the address',
  (select not alerts_wrote and alerts_mutual from celestual_users where instagram_handle = 'ml_owner')
  and exists (select 1 from celestual_mail_suppressions where email = 'owner@gmail.com' and scope = 'wrote'));
select ml_ok('pressed twice, it is still ok',
  (celestual_alerts_off_by_token((select off from ml_rows where n = 1))->>'ok')::boolean
  and (celestual_alerts_off_by_token((select off from ml_rows where n = 2))->>'ok')::boolean);
select ml_ok('a stop link nobody minted is invalid',
  (celestual_alerts_off_by_token('nobody-minted-this-link-at-all')->>'error') = 'invalid');
select ml_ok('the owner can turn it back on',
  (celestual_alerts_set('token-ml-owner-00000000', true, null)->>'ok')::boolean);
select ml_ok('which takes the address off the stop list',
  not exists (select 1 from celestual_mail_suppressions where email = 'owner@gmail.com' and scope = 'wrote'));

-- ── 7. it's mutual ──────────────────────────────────────────────────────────
create or replace function ml_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'), ml_hash(p_proof),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;
-- pa  a claimed @ with a confirmed address and the mutual alert on
-- pb  a claimed @ with no address; leaves one on the ping, as 0023 always took
-- pc  a claimed @ who turned the mutual alert off
do $$
declare a uuid; b uuid; c uuid;
begin
  insert into celestual_users (instagram_handle, handle_verified_at, alert_email, alert_email_verified_at)
    values ('ml_pa', now(), 'pa@berkeley.edu', now()) returning id into a;
  insert into celestual_users (instagram_handle, handle_verified_at) values ('ml_pb', now()) returning id into b;
  insert into celestual_users (instagram_handle, handle_verified_at, alert_email, alert_email_verified_at, alerts_mutual)
    values ('ml_pc', now(), 'pc@berkeley.edu', now(), false) returning id into c;
end $$;
select ml_proof('ml_pa', 'proof-ml-pa');
select ml_proof('ml_pb', 'proof-ml-pb');
select ml_proof('ml_pc', 'proof-ml-pc');

select celestual_submit('ml_pa', 'ml_pb', null, 'proof-ml-pa', '{"words":"you first"}'::jsonb);
select ml_ok('the ping resolves mutual',
  (celestual_submit('ml_pb', 'ml_pa', 'PB@Example.com', 'proof-ml-pb', null)->>'mutual')::boolean);
select ml_ok('the side with a confirmed address is queued from the match itself',
  (select count(*) = 1 and bool_and(to_email = 'pa@berkeley.edu' and other_handle = 'ml_pb' and not has_card)
     from celestual_mail_outbox where kind = 'mutual' and handle = 'ml_pa'));
select ml_ok('the side that left an address on the ping is queued there, and told a card waits',
  (select count(*) = 1 and bool_and(to_email = 'pb@example.com' and other_handle = 'ml_pa' and has_card)
     from celestual_mail_outbox where kind = 'mutual' and handle = 'ml_pb'));
select ml_ok('the old queue''s row is stamped, so the old drain never sends it twice',
  (select bool_and(sent_at is not null and last_error = 'celestual_mail_outbox')
     from celestual_notifications where self_handle = 'ml_pb')
  and not exists (select 1 from jsonb_array_elements(celestual_notify_take(100)) x where x->>'self_handle' = 'ml_pb'));

select celestual_submit('ml_pc', 'ml_pa', 'pc-ping@example.com', 'proof-ml-pc', null);
select celestual_submit('ml_pa', 'ml_pc', null, 'proof-ml-pa', null);
select ml_ok('a person who turned the mutual alert off is not mailed',
  not exists (select 1 from celestual_mail_outbox where kind = 'mutual' and handle = 'ml_pc')
  and (select bool_and(last_error = 'alerts_off') from celestual_notifications where self_handle = 'ml_pc'));
select ml_ok('and the other side of that match still is',
  exists (select 1 from celestual_mail_outbox where kind = 'mutual' and handle = 'ml_pa' and other_handle = 'ml_pc'));

create temp table ml_mt as select celestual_mail_take(50) as r;
select ml_ok('a mutual mail goes out with its stop link and no removal link',
  exists (select 1 from jsonb_array_elements((select r from ml_mt)) x
           where x->>'kind' = 'mutual' and x->>'handle' = 'ml_pb' and x->>'to_email' = 'pb@example.com'
             and (x->>'has_card')::boolean and x->>'other_handle' = 'ml_pa'
             and x->'remove_token' = 'null'::jsonb and char_length(x->>'off_token') >= 40));
select ml_ok('a mutual mail''s stop link answers for the mutual mail',
  (celestual_alerts_off_by_token((select x->>'off_token' from jsonb_array_elements((select r from ml_mt)) x
                                   where x->>'handle' = 'ml_pa' and x->>'other_handle' = 'ml_pb'))->>'scope') = 'mutual');
select ml_ok('and on an address with a person behind it, stops that person',
  (select not alerts_mutual and alerts_wrote is not null from celestual_users where instagram_handle = 'ml_pa'));
select ml_ok('one without a person answers too',
  (celestual_alerts_off_by_token((select x->>'off_token' from jsonb_array_elements((select r from ml_mt)) x
                                   where x->>'handle' = 'ml_pb'))->>'ok')::boolean);
select ml_ok('and stops the address',
  exists (select 1 from celestual_mail_suppressions where email = 'pb@example.com' and scope = 'mutual'));

-- a notification written before 0064 (no trigger then) is still the old drain's
alter table celestual_notifications disable trigger celestual_notifications_to_outbox;
insert into celestual_notifications (to_email, self_handle, other_handle, next_attempt_at)
values ('legacy@example.com', 'ml_legacy', 'ml_other', now());
alter table celestual_notifications enable trigger celestual_notifications_to_outbox;
select ml_ok('an old notification still unsent is still drained the old way',
  exists (select 1 from jsonb_array_elements(celestual_notify_take(100)) x where x->>'to_email' = 'legacy@example.com'));

-- ── 8. a merge keeps the alerts ─────────────────────────────────────────────
do $$
declare a uuid; b uuid; r jsonb;
begin
  insert into celestual_users (created_at) values (now() - interval '2 days') returning id into a;
  insert into celestual_users (instagram_handle, handle_verified_at, alert_email, alert_email_verified_at, alerts_wrote, created_at)
    values ('ml_merged', now(), 'merged@berkeley.edu', now(), true, now() - interval '1 day') returning id into b;
  r := celestual_user_merge(a, b, 'test');
  perform ml_ok('a merge carries the alert address and its switches to the survivor',
    (r->>'ok')::boolean
    and (select alert_email = 'merged@berkeley.edu' and alert_email_verified_at is not null and alerts_wrote
                and instagram_handle = 'ml_merged'
           from celestual_users where id = a));
end $$;

-- ── 9. the push ─────────────────────────────────────────────────────────────
select ml_ok('a row in the outbox calls the drain, once a statement',
  exists (select 1 from pg_trigger where tgname = 'celestual_mail_outbox_push'
           and tgrelid = 'celestual_mail_outbox'::regclass and (tgtype & 1) = 0));
select ml_ok('and without pg_net, as here, it writes the row and calls nothing',
  not exists (select 1 from pg_extension where extname = 'pg_net')
  and (select count(*) from celestual_mail_outbox) > 0);

rollback;
