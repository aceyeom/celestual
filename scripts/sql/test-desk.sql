-- ─────────────────────────────────────────────────────────────────────────────
-- test-desk.sql: exercises 0033_the_desk.sql and 0034_retire_the_campaign.sql.
--
-- Two things are being asserted and they are different in kind.
--
--   1. The desk reads what spec section 10 says it must read, and the report to
--      removal path actually moves a letter in both directions.
--   2. NOTHING here is reachable without the service role, and the desk cannot
--      stamp a handle verified. Those are the two ways an admin screen turns
--      into a hole, and neither is checked by anything that renders.
--
-- Run through scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- ── one transaction, rolled back ────────────────────────────────────────────
-- verify-migrations.sh runs every scripts/sql/test-*.sql against ONE database,
-- in alphabetical order, and this file sorts first. The other three seed their
-- own cast and count rows, so a desk test that left three users behind would
-- fail test-identity.sql's idempotency assertion from two files away, which is
-- the worst kind of failure to read.
--
-- So everything below happens inside a transaction that never commits. The
-- notices still print, a raised exception still aborts with a non-zero exit,
-- and the database the next file sees is the one it would have seen if this
-- file did not exist.
begin;

create or replace function d_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function d_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'desk-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- writer    at berkeley, no handle. Writes the letters.
-- named     at berkeley and holds the verified handle two of them are about.
-- reporter  at berkeley. Files the report.
do $$
declare w uuid; n uuid; r uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at)
    values ('writer@berkeley.edu', now()) returning id into w;
  insert into celestual_users (instagram_handle, handle_verified_at, edu_email, edu_verified_at)
    values ('named.one', now(), 'named@berkeley.edu', now()) returning id into n;
  insert into celestual_users (edu_email, edu_verified_at, email)
    values ('reporter@berkeley.edu', now(), 'reporter@gmail.com') returning id into r;
  perform d_session(w, 'desk-writer-000000000000');
  perform d_session(n, 'desk-named-0000000000000');
  perform d_session(r, 'desk-reporter-0000000000');
end $$;

-- Three letters in three states, written through the real path so the
-- constraints and the gate both run.
do $$
begin
  perform wall_write('desk-writer-000000000000', 'named.one',
    'you gave me your umbrella outside wheeler and walked home in it.',
    null, 'flyer-a', 'berkeley', 'live', '{"verdict":"pass","reasons":[]}');
  perform wall_write('desk-writer-000000000000', 'someone.else',
    'i should have said something in march.',
    null, null, 'berkeley', 'pending', '{"verdict":"review","reasons":["ambiguous"]}');
  perform wall_write('desk-writer-000000000000', 'third.person',
    'call me on five five five one two three four',
    null, null, 'berkeley', 'rejected', '{"verdict":"reject","reasons":["phone"],"model_layer":1}');
end $$;

-- ── 1. the overview ─────────────────────────────────────────────────────────
select d_ok('the overview answers at all',      (celestual_desk_overview()->>'ok')::boolean);
select d_ok('it counts the three users',        (celestual_desk_overview()#>>'{counts,users}')::int = 3);
select d_ok('it counts one verified handle',    (celestual_desk_overview()#>>'{counts,handle_verified}')::int = 1);
select d_ok('it counts three campus addresses', (celestual_desk_overview()#>>'{counts,edu_verified}')::int = 3);
select d_ok('it counts the live letter',        (celestual_desk_overview()#>>'{counts,letters_live}')::int = 1);
select d_ok('it counts the held letter',        (celestual_desk_overview()#>>'{counts,letters_pending}')::int = 1);
select d_ok('it counts the rejected letter',    (celestual_desk_overview()#>>'{counts,letters_rejected}')::int = 1);
select d_ok('the campus is on it',
  (celestual_desk_overview()#>>'{campuses,0,slug}') = 'berkeley');

-- ── 2. rate limit status ────────────────────────────────────────────────────
-- Spec section 5's three counters, read the way enforcement reads them. Only a
-- call that reached Apify is ever recorded, so a key that appears here is a key
-- that has spent something.
do $$
declare i int;
begin
  for i in 1..20 loop
    perform handle_search_record(null, 'device-at-the-cap', '10.0.0.9', 'h' || i);
  end loop;
  perform handle_search_record(null, 'device-with-room', '10.0.0.9', 'other');
end $$;

select d_ok('the capped device is reported blocked',
  exists (select 1 from jsonb_array_elements(celestual_desk_overview()->'limits') e
           where e->>'key_value' = 'device-at-the-cap' and (e->>'blocked')::boolean));
select d_ok('and with nothing left',
  (select (e->>'remaining')::int from jsonb_array_elements(celestual_desk_overview()->'limits') e
    where e->>'key_value' = 'device-at-the-cap') = 0);
select d_ok('the other device is not blocked',
  exists (select 1 from jsonb_array_elements(celestual_desk_overview()->'limits') e
           where e->>'key_value' = 'device-with-room' and not (e->>'blocked')::boolean));
select d_ok('the shared address carries both',
  (select (e->>'spent')::int from jsonb_array_elements(celestual_desk_overview()->'limits') e
    where e->>'key_type' = 'ip' and e->>'key_value' = '10.0.0.9') = 21);
select d_ok('the address is nowhere near its own cap',
  (select (e->>'blocked')::boolean from jsonb_array_elements(celestual_desk_overview()->'limits') e
    where e->>'key_type' = 'ip') = false);

-- ── 3. user records ─────────────────────────────────────────────────────────
select d_ok('users lists everybody',   (celestual_desk_users()->>'total')::int = 3);
select d_ok('a handle search finds one', (celestual_desk_users('named')->>'total')::int = 1);
select d_ok('an @ is stripped off it',   (celestual_desk_users('@named')->>'total')::int = 1);
select d_ok('an address search finds one', (celestual_desk_users('reporter@gmail')->>'total')::int = 1);
select d_ok('a campus address finds three', (celestual_desk_users('berkeley.edu')->>'total')::int = 3);
select d_ok('the writer shows three letters',
  (select (r->>'letters')::int from jsonb_array_elements(celestual_desk_users('writer@')->'rows') r) = 3);
select d_ok('one person, whole, comes back',
  (celestual_desk_user((select id from celestual_users where edu_email='writer@berkeley.edu'))->>'ok')::boolean);
select d_ok('and carries their letters with the bodies',
  jsonb_array_length(celestual_desk_user(
    (select id from celestual_users where edu_email='writer@berkeley.edu'))->'letters') = 3);
select d_ok('a user who is not there says so',
  (celestual_desk_user('00000000-0000-4000-8000-000000000000')->>'error') = 'not_found');

-- ── 4. the resolution cache ─────────────────────────────────────────────────
do $$
begin
  perform ig_profile_put('named.one', 'The Named One', true, false, true);
  perform ig_profile_put('faceless', 'No Picture', false, false, false);
end $$;

select d_ok('the cache lists both',        (celestual_desk_profiles()->>'total')::int = 2);
select d_ok('a search narrows it',         (celestual_desk_profiles('named')->>'total')::int = 1);
select d_ok('a stored face is not stale',
  (select (r->>'stale')::boolean from jsonb_array_elements(celestual_desk_profiles('named')->'rows') r) = false);
select d_ok('a row with no face is stale',
  (select (r->>'stale')::boolean from jsonb_array_elements(celestual_desk_profiles('faceless')->'rows') r) = true);
select d_ok('the path is returned, never a URL',
  (select r->>'avatar_path' from jsonb_array_elements(celestual_desk_profiles('named')->'rows') r)
    = 'ig/named.one.jpg');

-- Forcing a resolve is a delete, so the next lookup is an ordinary cache miss.
select d_ok('forgetting a handle reports it',
  (celestual_desk_profile_forget('@Named.One')->>'forgotten')::boolean);
select d_ok('and the row is gone',        (celestual_desk_profiles('named')->>'total')::int = 0);
select d_ok('forgetting it twice is honest',
  (celestual_desk_profile_forget('named.one')->>'forgotten')::boolean = false);

-- ── 5. the moderation queue ─────────────────────────────────────────────────
select d_ok('everything is listed by default', (celestual_desk_letters()->>'total')::int = 3);
select d_ok('the queue filters to pending',    (celestual_desk_letters('pending')->>'total')::int = 1);
select d_ok('a bad status is refused',         (celestual_desk_letters('nonsense')->>'error') = 'bad_status');
select d_ok('the rejection carries its reason',
  (select r#>>'{moderation,reasons,0}' from jsonb_array_elements(celestual_desk_letters('rejected')->'rows') r)
    = 'phone');
select d_ok('the desk sees the author, which no reader ever does',
  (select r->>'author_campus' from jsonb_array_elements(celestual_desk_letters('live')->'rows') r)
    = 'berkeley.edu');
select d_ok('a body search finds the letter',  (celestual_desk_letters(null, 'umbrella')->>'total')::int = 1);

-- Publishing from the queue is the escape from layer 3.
select d_ok('a held letter can be published',
  (celestual_desk_letter_set(
     (select id from wall_letters where target_handle = 'someone.else'), 'live', 'read it, it is fine')
   ->>'status') = 'live');
select d_ok('and the note is kept beside the verdict',
  (select moderation#>>'{desk,note}' from wall_letters where target_handle = 'someone.else')
    = 'read it, it is fine');
select d_ok('the classifier verdict survives the note',
  (select moderation->>'verdict' from wall_letters where target_handle = 'someone.else') = 'review');
select d_ok('and it is on the wall now',
  exists (select 1 from wall_index where target_handle = 'someone.else'));
select d_ok('a status the table does not have is refused',
  (celestual_desk_letter_set(
     (select id from wall_letters where target_handle = 'someone.else'), 'deleted') ->>'error') = 'bad_status');

-- ── 6. report to removal, and back ──────────────────────────────────────────
-- The letter is already down when the report arrives, so the queue is asking
-- whether it goes back up.
do $$
begin
  perform wall_report('desk-reporter-0000000000',
    (select id from wall_letters where target_handle = 'named.one'),
    'this is about me and i do not want it up');
end $$;

select d_ok('reporting took the letter down immediately',
  (select status from wall_letters where target_handle = 'named.one') = 'removed');
select d_ok('the report is open',              (celestual_desk_reports('open')->>'total')::int = 1);
select d_ok('and it carries the letter body',
  (select r->>'letter_body' from jsonb_array_elements(celestual_desk_reports('open')->'rows') r)
    like 'you gave me your umbrella%');
select d_ok('and who filed it',
  (select r->>'reporter_id' from jsonb_array_elements(celestual_desk_reports('open')->'rows') r)
    = (select id::text from celestual_users where edu_email = 'reporter@berkeley.edu'));

-- Dismissing puts it back.
select d_ok('dismissing restores the letter',
  (celestual_desk_report_resolve(
     (select id from wall_reports limit 1), false, 'not about the reporter')
   ->>'restored')::boolean);
select d_ok('the letter is live again',
  (select status from wall_letters where target_handle = 'named.one') = 'live');
select d_ok('the report is closed',            (celestual_desk_reports('open')->>'total')::int = 0);
select d_ok('and reads dismissed',             (celestual_desk_reports('dismissed')->>'total')::int = 1);
select d_ok('resolving it twice is refused',
  (celestual_desk_report_resolve((select id from wall_reports limit 1), true)->>'error') = 'already_resolved');

-- Upholding leaves it down, and every report on the same letter closes together.
do $$
declare l uuid;
begin
  l := (select id from wall_letters where target_handle = 'named.one');
  delete from wall_reports where letter_id = l;
  insert into wall_reports (letter_id, reporter_id, reason)
  select l, id, 'first report' from celestual_users where edu_email = 'reporter@berkeley.edu';
  insert into wall_reports (letter_id, reporter_id, reason)
  select l, id, 'second report' from celestual_users where edu_email = 'named@berkeley.edu';
  update wall_letters set status = 'removed' where id = l;
end $$;

select d_ok('two reports on one letter are both open', (celestual_desk_reports('open')->>'total')::int = 2);
select d_ok('upholding one closes both',
  (celestual_desk_report_resolve(
     (select id from wall_reports where reason = 'first report'), true, 'stands')
   ->>'closed')::int = 2);
select d_ok('nothing is left in the queue',    (celestual_desk_reports('open')->>'total')::int = 0);
select d_ok('and the letter stays down',
  (select status from wall_letters where target_handle = 'named.one') = 'removed');

-- A dismissal does not resurrect something the screen rejected.
do $$
declare l uuid;
begin
  l := (select id from wall_letters where target_handle = 'third.person');
  insert into wall_reports (letter_id, reason) values (l, 'reported while rejected');
end $$;

select d_ok('dismissing a report on a rejected letter leaves it rejected',
  (celestual_desk_report_resolve(
     (select id from wall_reports where reason = 'reported while rejected'), false)
   ->>'restored')::boolean = false);
select d_ok('it is still rejected',
  (select status from wall_letters where target_handle = 'third.person') = 'rejected');

-- ── 7. the waitlist and the stop-and-ask ────────────────────────────────────
do $$
begin
  perform wall_waitlist_add('nobody.here', 'berkeley', 'flyer-a');
end $$;

select d_ok('the waitlist is readable',        (celestual_desk_waitlist()->>'total')::int = 1);
select d_ok('and says nothing is there yet',
  (select (r->>'letters_now')::int from jsonb_array_elements(celestual_desk_waitlist()->'rows') r) = 0);

do $$
begin
  insert into celestual_merge_conflicts (kind, a_id, b_id, detail)
  select 'handle', a.id, b.id, '{"why":"two verified handles"}'::jsonb
    from celestual_users a, celestual_users b
   where a.edu_email = 'named@berkeley.edu' and b.edu_email = 'writer@berkeley.edu';
end $$;

select d_ok('an open conflict is on the overview',
  (celestual_desk_overview()#>>'{counts,conflicts_open}')::int = 1);
select d_ok('closing it records that a person looked',
  (celestual_desk_conflict_resolve((select id from celestual_merge_conflicts limit 1), 'same person, asked them')
   ->>'ok')::boolean);
select d_ok('and it leaves the open count',
  (celestual_desk_overview()#>>'{counts,conflicts_open}')::int = 0);
select d_ok('closing it twice is refused',
  (celestual_desk_conflict_resolve((select id from celestual_merge_conflicts limit 1))->>'error') = 'not_found');
select d_ok('the merge itself was NOT performed',
  (select count(*) from celestual_users where merged_into is not null) = 0);

-- ── 8. the door ─────────────────────────────────────────────────────────────
-- Every one of these is service_role only. A desk whose reads are
-- client-callable is a desk with a second door, and this is the assertion that
-- there is not one.
select d_ok('anon cannot execute any desk function',
  not exists (
    select 1 from information_schema.routine_privileges
     where routine_schema = 'public' and routine_name like 'celestual_desk_%'
       and grantee in ('anon', 'authenticated', 'PUBLIC')));
select d_ok('service_role can execute all eleven',
  (select count(distinct routine_name) from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name like 'celestual_desk_%'
      and grantee = 'service_role' and privilege_type = 'EXECUTE') = 11);

-- ── 9. what the desk is not allowed to do ───────────────────────────────────
-- handle_verified_at has exactly one writer and it demands a DM proof. If any
-- desk function ever mentions that column, this fails, which is the point.
select d_ok('no desk function writes handle_verified_at',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'celestual_desk_%'
       and pg_get_functiondef(p.oid) ~ 'update\s+celestual_users'));

-- ── 10. the campaign is gone ────────────────────────────────────────────────
-- 0034. Q12 answered: the whole group.
select d_ok('celestual_recruits is gone',        to_regclass('public.celestual_recruits') is null);
select d_ok('celestual_recruit_visits is gone',  to_regclass('public.celestual_recruit_visits') is null);
select d_ok('celestual_recruit_signups is gone', to_regclass('public.celestual_recruit_signups') is null);
select d_ok('celestual_trial_emails is gone',    to_regclass('public.celestual_trial_emails') is null);
select d_ok('every trial and recruit function is gone',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'celestual_trial_%' or p.proname like 'celestual_recruit_%')) = 0);
select d_ok('the competitor delete is gone too',
  to_regprocedure('public.celestual_admin_delete_competitor(text)') is null);

-- The two functions that read those tables still run, which is the whole reason
-- 0034 redefines them rather than only dropping things.
select d_ok('the legacy overview still answers',  (celestual_admin_overview()->>'ok')::boolean);
select d_ok('and returns an empty competitor list',
  jsonb_array_length(celestual_admin_overview()->'competitors') = 0);
select d_ok('and no longer counts campaign traffic',
  not (celestual_admin_overview()->'counts' ? 'visits'));
select d_ok('the legacy erase still runs',
  (celestual_admin_delete_user('nobody.at.all')->>'ok')::boolean);

rollback;
