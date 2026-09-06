-- ─────────────────────────────────────────────────────────────────────────────
-- test-code.sql: exercises 0041_the_code_that_did_not_match.sql against a
-- local database.
--
-- The relay's answer to a DM has to describe the DM, not the account. These
-- assert the four exits of celestual_complete_ig_verification in the order
-- 0041 puts them, and that the browser waiting under the sender's handle is
-- told what arrived. Run through scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function c_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function c_row(p_handle text, p_token text, p_proof text, p_status text, p_expires timestamptz)
returns void language plpgsql as $$
begin
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, verified_at, expires_at)
  values (p_handle, p_token, encode(extensions.digest(p_proof, 'sha256'), 'hex'), p_status,
          case when p_status = 'verified' then now() - interval '1 day' end, p_expires);
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- eli verified last week, and is back today with a live code out: 1111. An
-- older code of eli's, 3333, lapsed an hour ago. 2222 is the code that
-- verified eli last week. fay has never verified.
select c_row('eli', '2222', 'proof-eli-old', 'verified', now() + interval '23 days');
select c_row('eli', '3333', 'proof-eli-lapsed', 'pending', now() - interval '1 hour');
select c_row('eli', '1111', 'proof-eli', 'pending', now() + interval '25 minutes');
select c_row('fay', '4444', 'proof-fay', 'pending', now() + interval '25 minutes');

-- ── 1. the digits are wrong, from a verified account ────────────────────────
-- The bug: this used to answer already_verified.
select c_ok('a wrong code from a verified account is a wrong code',
  (select r->>'error' = 'no_pending' and (r->'already_verified') is null and (r->'code_expired') is null
     from celestual_complete_ig_verification('9999', 'ig-eli', 'eli') r));
select c_ok('and the live code under that handle is told so',
  (select last_dm_note = 'wrong_code' and last_dm_at is not null
     from celestual_ig_verifications where token = '1111'));
select c_ok('and nobody else is told anything',
  (select last_dm_note is null from celestual_ig_verifications where token = '4444'));
select c_ok('the poll hands the note back to the proof holder',
  (celestual_poll_ig_verification('1111', encode(extensions.digest('proof-eli', 'sha256'), 'hex'))->>'note') = 'wrong_code');
select c_ok('and the row is still pending',
  (celestual_poll_ig_verification('1111', encode(extensions.digest('proof-eli', 'sha256'), 'hex'))->>'status') = 'pending');
select c_ok('and to nobody without the proof',
  (celestual_poll_ig_verification('1111', repeat('0', 64))->>'status') = 'none');

-- ── 2. the code has lapsed ──────────────────────────────────────────────────
select c_ok('a lapsed code is a lapsed code, verified account or not',
  (select r->>'error' = 'no_pending' and (r->>'code_expired')::boolean and (r->'already_verified') is null
     from celestual_complete_ig_verification('3333', 'ig-eli', 'eli') r));
select c_ok('and the live code under that handle is told that instead',
  (select last_dm_note = 'expired_code' from celestual_ig_verifications where token = '1111'));

-- ── 3. already verified means this code, this sender ────────────────────────
select c_ok('the code that verified eli, re-sent by eli, is already verified',
  (select (r->>'already_verified')::boolean and r->>'handle' = 'eli'
     from celestual_complete_ig_verification('2222', 'ig-eli', 'eli') r));
select c_ok('the same code from a different account is not',
  (select r->>'error' = 'no_pending' and (r->'already_verified') is null
     from celestual_complete_ig_verification('2222', 'ig-fay', 'fay') r));
select c_ok('and fay was told it did not match',
  (select last_dm_note = 'wrong_code' from celestual_ig_verifications where token = '4444'));

-- ── 4. the right code, and the note goes with it ────────────────────────────
select c_ok('the live code verifies',
  (select (r->>'ok')::boolean and r->>'handle' = 'eli'
     from celestual_complete_ig_verification('1111', 'ig-eli', 'eli') r));
select c_ok('and the note is cleared with it',
  (select last_dm_note is null and last_dm_at is null and status = 'verified'
     from celestual_ig_verifications where token = '1111'));
select c_ok('the poll says verified and carries no note',
  (select r->>'status' = 'verified' and r->>'handle' = 'eli' and (r->'note') = 'null'::jsonb
     from celestual_poll_ig_verification('1111', encode(extensions.digest('proof-eli', 'sha256'), 'hex')) r));
select c_ok('sent again, it is already verified',
  (select (r->>'already_verified')::boolean
     from celestual_complete_ig_verification('1111', 'ig-eli', 'eli') r));

-- ── 5. the grants ───────────────────────────────────────────────────────────
select c_ok('anon can poll',
  has_function_privilege('anon', 'celestual_poll_ig_verification(text, text)', 'execute'));
select c_ok('anon cannot complete',
  not has_function_privilege('anon', 'celestual_complete_ig_verification(text, text, text)', 'execute'));
select c_ok('the service role can',
  has_function_privilege('service_role', 'celestual_complete_ig_verification(text, text, text)', 'execute'));

-- ── the cast leaves ─────────────────────────────────────────────────────────
-- The tests share one database and run in name order. A verification writes
-- a member row (the RPC does, on success), and test-identity.sql counts the
-- members its own backfill picks up, so eli and fay go before it runs.
delete from celestual_ig_verifications where handle in ('eli', 'fay');
delete from celestual_members where handle in ('eli', 'fay');
delete from celestual_users where instagram_handle in ('eli', 'fay');

drop function c_ok(text, boolean);
drop function c_row(text, text, text, text, timestamptz);
