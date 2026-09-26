-- ─────────────────────────────────────────────────────────────────────────────
-- test-google-merge.sql: exercises 0062_the_google_identity_moves.sql.
--
-- A merge moves the google login from the absorbed row to the survivor and
-- clears it off the tombstone, subject and date together; two different
-- google logins stop the merge and are recorded as a conflict of kind
-- 'google', where 0030's check used to throw. Run through
-- scripts/verify-migrations.sh --test. Everything here is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function gm_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- ── 1. the check ────────────────────────────────────────────────────────────
select gm_ok('a google conflict is a kind the table takes',
  (select pg_get_constraintdef(oid) like '%google%' from pg_constraint
    where conname = 'celestual_merge_conflicts_kind_ck'));
select gm_ok('the merge is still the service role''s alone',
  not has_function_privilege('anon', 'celestual_user_merge(uuid, uuid, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_user_merge(uuid, uuid, text)', 'EXECUTE'));
select gm_ok('the merge carries the patched line',
  (select prosrc like '%set google_sub = null, google_verified_at = null where id = b.id%'
     from pg_proc where proname = 'celestual_user_merge'));

-- ── 2. the login follows the person ─────────────────────────────────────────
do $$
declare a uuid; b uuid; r jsonb;
begin
  insert into celestual_users (instagram_handle, handle_verified_at, created_at)
    values ('gm_older', now(), now() - interval '2 days') returning id into a;
  insert into celestual_users (google_sub, google_email, google_verified_at, created_at)
    values ('gm-sub-1', 'gm1@gmail.com', now() - interval '1 day', now() - interval '1 day') returning id into b;
  r := celestual_user_merge(a, b, 'test');
  perform gm_ok('a merge where only the absorbed row has google succeeds', (r->>'ok')::boolean);
  perform gm_ok('and says it moved the login', (r #>> '{moved,google}') = 'true');
  perform gm_ok('the survivor holds the login, the address and the date',
    (select google_sub = 'gm-sub-1' and google_email = 'gm1@gmail.com' and google_verified_at is not null
       from celestual_users where id = a));
  perform gm_ok('the tombstone holds neither half of it',
    (select google_sub is null and google_verified_at is null and merged_into = a
       from celestual_users where id = b));
end $$;

-- ── 3. two different logins stop and ask ────────────────────────────────────
do $$
declare a uuid; b uuid; r jsonb; n int;
begin
  insert into celestual_users (google_sub, google_email, google_verified_at, created_at)
    values ('gm-sub-a', 'a@gmail.com', now(), now() - interval '2 days') returning id into a;
  insert into celestual_users (google_sub, google_email, google_verified_at, created_at)
    values ('gm-sub-b', 'b@gmail.com', now(), now() - interval '1 day') returning id into b;
  select count(*) into n from celestual_merge_conflicts where kind = 'google';
  r := celestual_user_merge(a, b, 'test');
  perform gm_ok('two different google logins answer conflict_google, and do not throw',
    (r->>'error') = 'conflict_google');
  perform gm_ok('and the pair is on the desk''s list',
    (select count(*) from celestual_merge_conflicts where kind = 'google') = n + 1);
  perform gm_ok('and neither row moved',
    (select count(*) from celestual_users where id in (a, b) and merged_into is null) = 2);
end $$;

rollback;
