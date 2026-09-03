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
select d_ok('the one-argument erase no longer exists',
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'celestual_erase_account'
                 and pg_get_function_identity_arguments(p.oid) = 'p_handle text'));

-- ── 4. suppress ─────────────────────────────────────────────────────────────
insert into celestual_entries (from_handle, to_hash, to_handle, expires_at)
values ('dee', celestual_hash_handle('bo'), 'bo', now() + interval '60 days');
select d_ok('suppress still needs no proof',
  (celestual_suppress('bo')->>'suppressed') = 'bo');
select d_ok('and no longer says how much it erased',
  not (celestual_suppress('bo') ? 'erased'));
select d_ok('and the rows pointing at the name are gone',
  not exists (select 1 from celestual_entries where to_handle = 'bo'));
select d_ok('and the name is on the suppression list',
  exists (select 1 from celestual_suppressions where handle_hash = celestual_hash_handle('bo')));
