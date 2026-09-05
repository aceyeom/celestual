-- ─────────────────────────────────────────────────────────────────────────────
-- test-doors.sql: exercises 0036_close_the_open_doors.sql against a local
-- database.
--
-- The product's promise is that nobody learns anything until both sides have
-- spoken. These assert that the four functions 0036 touches cannot be used to
-- learn it, or to undo somebody else's ping, without the owner's proof. Run
-- through scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function d_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- A verified DM proof for a handle, the way the real flow leaves one behind.
create or replace function d_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest(p_proof, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- ana has a proof and has pinged bo. A stranger with no proof at all is the
-- caller in every negative case below.
select d_proof('ana', 'proof-ana');
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at)
values ('ana', celestual_hash_handle('bo'), 'bo', now() + interval '60 days');

-- ── 1. withdraw ─────────────────────────────────────────────────────────────
select d_ok('withdraw without a proof is refused',
  (celestual_withdraw('ana', 'bo', null)->>'error') = 'unverified');
select d_ok('and it says withdrawn:false, whether or not the ping exists',
  (celestual_withdraw('ana', 'bo', null)->>'withdrawn') = 'false'
  and (celestual_withdraw('ana', 'nobody', null)->>'withdrawn') = 'false');
select d_ok('and the ping is still standing',
  exists (select 1 from celestual_entries where from_handle = 'ana' and to_handle = 'bo'));
select d_ok('a wrong proof is refused the same way',
  (celestual_withdraw('ana', 'bo', 'not-the-proof')->>'error') = 'unverified');
select d_ok('the owner withdraws with the proof',
  (celestual_withdraw('ana', 'bo', 'proof-ana')->>'withdrawn') = 'true');
select d_ok('and the ping is gone',
  not exists (select 1 from celestual_entries where from_handle = 'ana' and to_handle = 'bo'));
select d_ok('the two-argument withdraw no longer exists',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'celestual_withdraw'
                 and pg_get_function_identity_arguments(p.oid) = 'p_from text, p_to text'));

-- ── 1b. withdrawing a mutual frees the other side ──────────────────────────
-- 0038. The other person's row used to stay stamped matched_at and
-- matched_handle, with nobody on the far end of it.
select d_proof('cy', 'proof-cy');
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at, matched_at, matched_handle)
values ('cy', celestual_hash_handle('di'), 'di', now() + interval '60 days', now(), 'di');
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at, matched_at, matched_handle)
values ('di', celestual_hash_handle('cy'), 'cy', now() - interval '1 day', now(), 'cy');
insert into celestual_matches (handle_a, handle_b) values ('cy', 'di');
select d_ok('the owner withdraws their half of a mutual',
  (celestual_withdraw('cy', 'di', 'proof-cy')->>'withdrawn') = 'true');
select d_ok('and the other half is standing again, with a fresh window',
  (select matched_at is null and matched_handle is null and expires_at > now()
     from celestual_entries where from_handle = 'di' and to_handle = 'cy'));
select d_ok('and the match row is gone',
  not exists (select 1 from celestual_matches where handle_a = 'cy' and handle_b = 'di'));

-- ── 2. link ─────────────────────────────────────────────────────────────────
select d_ok('anon cannot link handles',
  not has_function_privilege('anon', 'celestual_link(text[])', 'execute'));
select d_ok('authenticated cannot link handles',
  not has_function_privilege('authenticated', 'celestual_link(text[])', 'execute'));
select d_ok('the service role still can',
  has_function_privilege('service_role', 'celestual_link(text[])', 'execute'));

-- ── 3. erase ────────────────────────────────────────────────────────────────
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at)
values ('ana', celestual_hash_handle('cy'), 'cy', now() + interval '60 days');
select d_ok('erase without a proof is refused',
  (celestual_erase_account('ana', null)->>'error') = 'unverified');
select d_ok('and it counts nothing',
  (celestual_erase_account('ana', null)->>'erased') = '0');
select d_ok('and the rows are still there',
  exists (select 1 from celestual_entries where from_handle = 'ana'));
select d_ok('the owner erases with the proof',
  (celestual_erase_account('ana', 'proof-ana')->>'erased')::int >= 1);
select d_ok('and the rows are gone',
  not exists (select 1 from celestual_entries where from_handle = 'ana'));
-- 0038. The identity row goes with the account, and its sessions with it.
insert into celestual_users (instagram_handle, handle_verified_at) values ('erased', now());
insert into celestual_sessions (token_hash, user_id, expires_at)
select encode(extensions.digest('token-erased-0000000000', 'sha256'), 'hex'), id, now() + interval '30 days'
  from celestual_users where instagram_handle = 'erased';
select d_proof('erased', 'proof-erased');
-- Two statements: a subquery in the same statement as the call sees the
-- snapshot from before the call, and the row is still there in it.
select d_ok('the erase itself answers',
  (celestual_erase_account('erased', 'proof-erased')->>'handle') = 'erased');
select d_ok('erasing the account forgets the identity row',
  not exists (select 1 from celestual_users where instagram_handle = 'erased'));
select d_ok('and the browser that held it is signed out',
  (celestual_whoami('token-erased-0000000000')->>'signed_in') = 'false');
select d_ok('the one-argument erase no longer exists',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'celestual_erase_account'
                 and pg_get_function_identity_arguments(p.oid) = 'p_handle text'));

-- ── 4. suppress ─────────────────────────────────────────────────────────────
-- 0039: the opt out takes the DM proof. Without one nothing is read and the
-- refusal says nothing about the name.
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at)
values ('dee', celestual_hash_handle('bo'), 'bo', now() + interval '60 days');
select d_ok('suppress refuses without a proof',
  (celestual_suppress('bo')->>'error') = 'unverified');
select d_ok('and erased nothing on the refusal',
  exists (select 1 from celestual_entries where to_handle = 'bo'));
select d_proof('bo', 'proof-bo');
select d_ok('with the proof it goes through',
  (celestual_suppress('bo', 'proof-bo')->>'suppressed') = 'bo');
select d_ok('and does not say how much it erased',
  not (celestual_suppress('bo', 'proof-bo') ? 'erased'));
select d_ok('and the rows pointing at the name are gone',
  not exists (select 1 from celestual_entries where to_handle = 'bo'));
select d_ok('and the name is on the suppression list',
  exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle('bo')));
