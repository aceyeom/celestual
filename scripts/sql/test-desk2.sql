-- ─────────────────────────────────────────────────────────────────────────────
-- test-desk2.sql: exercises 0039_the_desk_second_sitting.sql.
--
-- Run through scripts/verify-migrations.sh --test. Sorts after test-desk.sql
-- and, like it, runs inside one transaction that never commits, so the cast
-- it seeds is gone before the next file looks.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

begin;

create or replace function d2_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function d2_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- A live DM proof for a handle, the way the webhook leaves one.
create or replace function d2_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, verified_at, expires_at)
  values (p_handle, 'test' || substr(md5(p_proof), 1, 6), encode(extensions.digest(p_proof, 'sha256'), 'hex'),
          'verified', now(), now() + interval '30 days');
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'desk2-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
do $$
declare w uuid; n uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at, created_at)
    values ('writer2@berkeley.edu', now() - interval '20 days', now() - interval '20 days') returning id into w;
  insert into celestual_users (instagram_handle, handle_verified_at, created_at)
    values ('pinger.one', now() - interval '3 days', now() - interval '3 days') returning id into n;
  perform d2_session(w, 'desk2-writer-00000000000');
  perform d2_proof('pinger.one', 'proof-of-pinger-one');
  perform d2_proof('pinger.two', 'proof-of-pinger-two');
  insert into celestual_members (handle, handle_hash) values
    ('pinger.one', celestual_hash_handle('pinger.one')),
    ('pinger.two', celestual_hash_handle('pinger.two'))
  on conflict do nothing;
end $$;

-- Two pings, one standing and one lapsed, and a mutual pair.
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at, created_at)
values ('pinger.one', celestual_hash_handle('somebody.quiet'), 'somebody.quiet', now() + interval '40 days', now() - interval '2 days'),
       ('pinger.one', celestual_hash_handle('somebody.gone'), 'somebody.gone', now() - interval '1 day', now() - interval '61 days');
insert into celestual_entries (from_handle, to_hash, to_handle, matched_at, matched_handle, expires_at, created_at)
values ('pinger.one', celestual_hash_handle('pinger.two'), 'pinger.two', now() - interval '1 day', 'pinger.two', now() + interval '50 days', now() - interval '2 days'),
       ('pinger.two', celestual_hash_handle('pinger.one'), 'pinger.one', now() - interval '1 day', 'pinger.one', now() + interval '50 days', now() - interval '1 day');
insert into celestual_matches (handle_a, handle_b, matched_at)
values ('pinger.one', 'pinger.two', now() - interval '1 day');

-- ── 2. the settings ─────────────────────────────────────────────────────────
select d2_ok('the settings answer with defaults',
  (celestual_desk_settings()#>>'{settings,cap_global}')::int = 1000);
select d2_ok('the salt is not on the desk',
  not (celestual_desk_settings()->'settings' ? 'handle_salt'));
select d2_ok('a cap can be set',
  (celestual_desk_setting_set('cap_global', '5')->>'ok')::boolean);
select d2_ok('and the limit reads it',
  handle_search_limit('global') = 5);
select d2_ok('a bad value is refused',
  (celestual_desk_setting_set('cap_global', 'lots')->>'error') = 'bad_value');
select d2_ok('a key off the list is refused',
  (celestual_desk_setting_set('handle_salt', 'x')->>'error') = 'bad_key');
-- Two statements, because a stable function inside the statement that writes
-- the row reads the snapshot from before the write.
select d2_ok('the release gate can be turned on from the desk',
  (celestual_desk_setting_set('require_ig_verification', 'true')->>'ok')::boolean);
select d2_ok('and the product reads it', celestual_ig_required());
select celestual_desk_setting_set('require_ig_verification', 'false');
select celestual_desk_setting_set('cap_global', '1000');

-- ── 3. the resolver switch ──────────────────────────────────────────────────
select d2_ok('with the resolver on a fresh device is allowed',
  (handle_search_allow(null, 'device-fresh', '10.1.1.1')->>'ok')::boolean);
select celestual_desk_setting_set('resolver_enabled', 'false');
select d2_ok('with the resolver off every call is refused as off',
  (handle_search_allow(null, 'device-fresh', '10.1.1.1')->>'off')::boolean);
select celestual_desk_setting_set('resolver_enabled', 'true');
select d2_ok('and on again it is allowed',
  (handle_search_allow(null, 'device-fresh', '10.1.1.1')->>'ok')::boolean);

-- ── 4. growth ───────────────────────────────────────────────────────────────
select d2_ok('growth answers',                    (celestual_desk_growth(30, 'day')->>'ok')::boolean);
select d2_ok('thirty days of days is thirty one buckets',
  jsonb_array_length(celestual_desk_growth(30, 'day')->'rows') = 31);
select d2_ok('the newest bucket is today',
  (celestual_desk_growth(30, 'day')->'rows'->-1->>'t') = to_char(now(), 'YYYY-MM-DD'));
select d2_ok('the running total ends at everybody',
  (celestual_desk_growth(30, 'day')->'rows'->-1->>'users_total')::int
    = (select count(*) from celestual_users where merged_into is null));
select d2_ok('a week grain buckets by week',
  jsonb_array_length(celestual_desk_growth(90, 'week')->'rows') between 13 and 15);
select d2_ok('all time answers and is bounded',
  jsonb_array_length(celestual_desk_growth(0, 'day')->'rows') between 1 and 401);
select d2_ok('a bad grain falls back to days',
  (celestual_desk_growth(7, 'hour')->>'grain') = 'day');
select d2_ok('the pings landed in the series',
  (select sum((r->>'pings')::int) from jsonb_array_elements(celestual_desk_growth(30, 'day')->'rows') r) >= 3);

-- ── 5. the pings ────────────────────────────────────────────────────────────
select d2_ok('the ledger answers',            (celestual_desk_pings()->>'ok')::boolean);
select d2_ok('it counts one standing',        (celestual_desk_pings()#>>'{counts,standing}')::int = 1);
select d2_ok('it counts the lapsed one',      (celestual_desk_pings()#>>'{counts,lapsed}')::int = 1);
select d2_ok('it counts both sides of the mutual', (celestual_desk_pings()#>>'{counts,mutual}')::int = 2);
select d2_ok('and the pair once',                (celestual_desk_pings()#>>'{counts,pairs}')::int = 1);
select d2_ok('a standing row never names its target',
  not exists (select 1 from jsonb_array_elements(celestual_desk_pings('standing')->'rows') r
               where r ? 'to_handle' or r ? 'to_hash'));
select d2_ok('a standing row names who placed it',
  (celestual_desk_pings('standing')->'rows'->0->>'from_handle') = 'pinger.one');
select d2_ok('a mutual row names both sides',
  (celestual_desk_pings('mutual')->'rows'->0->>'matched_handle') is not null);
select d2_ok('a bad state is refused',        (celestual_desk_pings('open')->>'error') = 'bad_state');
select d2_ok('a search finds the sender both ways', (celestual_desk_pings(null, '@pinger.one')->>'total')::int = 4);

-- ── 6. the sign in link ─────────────────────────────────────────────────────
do $$
declare
  r jsonb; red jsonb; b jsonb; who jsonb;
  proof text := 'desk-minted-proof-000000';
begin
  r := celestual_desk_signin('Desk.Person', 'desk.person@berkeley.edu', 'plain@example.com', 'testing the flow');
  perform d2_ok('the desk mints a link', (r->>'ok')::boolean);
  perform d2_ok('it carries a login token', length(r->>'login_token') = 48);
  perform d2_ok('and a session token', length(r->>'session_token') = 64);
  perform d2_ok('the handle was normalised', (r->>'handle') = 'desk.person');
  perform d2_ok('nothing stamped the handle verified yet',
    not exists (select 1 from celestual_users where instagram_handle = 'desk.person'));
  perform d2_ok('the campus row exists and the session is it',
    (celestual_whoami(r->>'session_token')#>>'{user,edu_verified}')::boolean);
  perform d2_ok('the plain email rode along',
    (select email from celestual_users where edu_email = 'desk.person@berkeley.edu') = 'plain@example.com');

  -- the browser's half: redeem, then bind
  red := celestual_redeem_login(encode(extensions.digest(r->>'login_token', 'sha256'), 'hex'),
                                encode(extensions.digest(proof, 'sha256'), 'hex'));
  perform d2_ok('the browser redeems it', (red->>'ok')::boolean and (red->>'handle') = 'desk.person');
  perform d2_ok('the record says the desk minted it',
    (select verified_via from celestual_ig_verifications where handle = 'desk.person' limit 1) = 'desk');
  perform d2_ok('it is single use',
    (celestual_redeem_login(encode(extensions.digest(r->>'login_token', 'sha256'), 'hex'),
                            encode(extensions.digest(proof, 'sha256'), 'hex'))->>'error') = 'invalid');
  b := celestual_user_bind_handle(r->>'session_token', 'desk.person', proof);
  perform d2_ok('the one writer binds the handle onto the campus row', (b->>'ok')::boolean);
  who := celestual_whoami(r->>'session_token');
  perform d2_ok('and the browser is both at once',
    (who#>>'{user,handle_verified}')::boolean and (who#>>'{user,edu_verified}')::boolean
    and (who#>>'{user,handle}') = 'desk.person');
  perform d2_ok('and the proof places a ping',
    celestual_consume_ig_proof('desk.person', proof));

  perform d2_ok('a banned handle gets no link',
    (select (celestual_admin_ban_user('banned.one')->>'ok')::boolean)
    and (celestual_desk_signin('banned.one', null, null, null)->>'error') = 'banned');
  perform d2_ok('a link needs a handle or a campus',
    (celestual_desk_signin(null, null, null, null)->>'error') = 'invalid');
  perform d2_ok('a non edu address is refused',
    (celestual_desk_signin(null, 'x@gmail.com', null, null)->>'error') = 'email');
end $$;

select d2_ok('the redeem is callable by the browser',
  has_function_privilege('anon', 'public.celestual_redeem_login(text, text)', 'execute'));
select d2_ok('the mint is not',
  not has_function_privilege('anon', 'public.celestual_desk_signin(text, text, text, text)', 'execute'));

-- ── 7. the campus ───────────────────────────────────────────────────────────
select d2_ok('the campus can be closed',
  not (celestual_desk_campus_set('berkeley', false)->>'is_open')::boolean);
select d2_ok('closed, the gate is shut',
  not wall_gate((select id from celestual_users where edu_email = 'writer2@berkeley.edu'), 'berkeley'));
select d2_ok('and opened again',
  (celestual_desk_campus_set('berkeley', true)->>'is_open')::boolean);
select d2_ok('an unknown campus is not found',
  (celestual_desk_campus_set('nowhere', true)->>'error') = 'not_found');
select d2_ok('a campus can be added',
  (celestual_desk_campus_add('reed', 'Reed', 'reed.edu')->>'ok')::boolean);
select d2_ok('and it arrives closed',
  not (select is_open from wall_campuses where slug = 'reed'));
select d2_ok('and not twice',
  (celestual_desk_campus_add('reed', 'Reed', 'reed.edu')->>'error') = 'exists');

-- ── 8. a name shut from the desk ────────────────────────────────────────────
do $$
declare w text := 'desk2-writer-00000000000'; a jsonb; b jsonb; c jsonb;
begin
  a := wall_write(w, 'shut.me', 'a first letter, live.', null, null, 'berkeley', 'live', '{"verdict":"pass"}');
  perform d2_ok('a letter to the name goes up', (a->>'ok')::boolean);
  perform d2_ok('the name is open', not wall_name_shut('shut.me', 'berkeley'));
  b := celestual_desk_name_shut('shut.me', 'berkeley', 'asked by the person');
  perform d2_ok('the desk shuts it and takes the letter down',
    (b->>'ok')::boolean and (b->>'letters')::int = 1
    and (select status from wall_letters where id = (a->>'id')::uuid) = 'removed');
  perform d2_ok('the name is shut', wall_name_shut('shut.me', 'berkeley'));
  c := wall_write(w, 'shut.me', 'a second letter, refused.', null, null, 'berkeley', 'live', '{"verdict":"pass"}');
  perform d2_ok('a new letter to it is refused', (c->>'error') = 'removed');
  b := celestual_desk_name_open('shut.me', 'berkeley');
  perform d2_ok('the desk opens it again', (b->>'ok')::boolean and (b->>'letters')::int = 1);
  perform d2_ok('the name is open again', not wall_name_shut('shut.me', 'berkeley'));
  c := wall_write(w, 'shut.me', 'a third letter, allowed.', null, null, 'berkeley', 'live', '{"verdict":"pass"}');
  perform d2_ok('and a new letter goes up', (c->>'ok')::boolean);
  perform d2_ok('the first letter stayed down',
    (select status from wall_letters where id = (a->>'id')::uuid) = 'removed');
end $$;

-- ── 9. the reports carry what a decision needs ──────────────────────────────
do $$
declare w text := 'desk2-writer-00000000000'; l jsonb; rid uuid; rows jsonb;
begin
  l := wall_write(w, 'reported.one', 'a letter somebody will report.', null, null, 'berkeley', 'live', '{"verdict":"pass"}');
  perform wall_report(w, (l->>'id')::uuid, 'not kind');
  rows := celestual_desk_reports('open')->'rows';
  perform d2_ok('the report is listed', jsonb_array_length(rows) >= 1);
  perform d2_ok('it counts the reporter''s reports', (rows->0->>'reporter_reports')::int >= 1);
  perform d2_ok('it counts the author''s letters', (rows->0->>'author_letters')::int >= 3);
  perform d2_ok('it says whether the name is shut', (rows->0->>'name_shut')::boolean = false);
  perform d2_ok('the counts are on it', (celestual_desk_reports('open')#>>'{counts,open}')::int >= 1);
end $$;

-- ── 10. the log ─────────────────────────────────────────────────────────────
select celestual_desk_log_add('desk_letter_set', 'letter:abc', '{"status":"live"}'::jsonb);
select celestual_desk_log_add('Bad Action!', null, null);
select d2_ok('the log keeps a row',
  (celestual_desk_log_list()->>'total')::int = 2);
select d2_ok('and cleans an action name',
  (celestual_desk_log_list()->'rows'->0->>'action') = 'bad_action_');
select d2_ok('nothing outside the service role can read it',
  not has_table_privilege('anon', 'celestual_desk_log', 'select'));

-- ── 11. the overview ────────────────────────────────────────────────────────
select d2_ok('the overview counts the standing ping',
  (celestual_desk_overview()#>>'{counts,pings_standing}')::int = 1);
select d2_ok('and the pair',
  (celestual_desk_overview()#>>'{counts,pairs}')::int = 1);
select d2_ok('and says the resolver is on',
  (celestual_desk_overview()#>>'{settings,resolver_enabled}')::boolean);
select d2_ok('every desk function is service role only',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'celestual_desk_%'
       and has_function_privilege('anon', p.oid, 'execute')));
select d2_ok('no desk function writes handle_verified_at',
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'celestual_desk_%'
       and pg_get_functiondef(p.oid) ~ 'update\s+celestual_users'));

-- ── 1. the opt out takes a proof (last, because it erases the cast)  ────────────────────────────────────────────
select d2_ok('the one argument opt out is gone',
  to_regprocedure('public.celestual_suppress(text)') is null);
select d2_ok('without a proof the opt out refuses',
  (celestual_suppress('pinger.two', null)->>'error') = 'unverified');
select d2_ok('and nothing was erased by the refusal',
  (select count(*) from celestual_entries where from_handle = 'pinger.two') = 1);
select d2_ok('with a wrong proof it refuses the same way',
  (celestual_suppress('pinger.two', 'not-the-proof')->>'error') = 'unverified');
select d2_ok('with the proof it goes through',
  (celestual_suppress('pinger.two', 'proof-of-pinger-two')->>'suppressed') = 'pinger.two');
select d2_ok('and the handle is on the opt out list',
  exists (select 1 from celestual_suppressions
           where handle_hash = celestual_hash_handle('pinger.two') and kind = 'optout'));
select d2_ok('and its pings are gone both ways',
  (select count(*) from celestual_entries
    where from_handle = 'pinger.two' or to_hash = celestual_hash_handle('pinger.two')) = 0);
select d2_ok('and the proof went with it',
  (select count(*) from celestual_ig_verifications where handle = 'pinger.two') = 0);


rollback;
