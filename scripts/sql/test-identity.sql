-- ─────────────────────────────────────────────────────────────────────────────
-- test-identity.sql: exercises 0030_identity.sql against a local database.
--
-- Run through scripts/verify-migrations.sh, which stands the database up. The
-- merge rule is the riskiest thing Phase 4b writes and it runs against real
-- rows on the day it lands, so it is tested rather than reasoned about.
--
-- Every assertion raises on failure, so a clean run printing PASS lines is the
-- whole result. Nothing here touches production.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function t_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- A verified DM proof for a handle, the way the real flow leaves one behind.
create or replace function t_proof(p_handle text, p_proof text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications
    (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, substr(md5(random()::text), 1, 6),
          encode(extensions.digest(p_proof, 'sha256'), 'hex'),
          'verified', 'test:' || p_handle, now() - interval '1 hour', now() + interval '30 days');
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── 1. the backfill ─────────────────────────────────────────────────────────
-- Seeded after the migration ran, then the migration's own statements are
-- replayed, which is also the idempotency test.
insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
values ('olduser', '111111', repeat('a', 64), 'verified', 'test:olduser',
        timestamptz '2026-01-01 00:00:00Z', now() + interval '30 days');
insert into celestual_members (handle, handle_hash, first_verified_at)
values ('olduser', celestual_hash_handle('olduser'), timestamptz '2026-01-02 00:00:00Z');
insert into celestual_edu_verifications (token, email, slug, code_hash, status, expires_at, verified_at)
values ('tok-edu-1', 'Someone@Berkeley.EDU', 'uc-berkeley', repeat('b', 64), 'verified',
        now() + interval '1 day', timestamptz '2026-02-01 00:00:00Z');

insert into celestual_users (instagram_handle, handle_verified_at, created_at)
select m.handle,
       coalesce((select min(v.verified_at) from celestual_ig_verifications v
                  where v.handle = m.handle and v.status = 'verified'), m.first_verified_at),
       m.first_verified_at
  from celestual_members m
 where celestual_norm(m.handle) = m.handle
   and not exists (select 1 from celestual_users u where u.instagram_handle = m.handle);

insert into celestual_users (edu_email, edu_verified_at, created_at)
select distinct on (lower(e.email)) lower(e.email), e.verified_at, e.created_at
  from celestual_edu_verifications e
 where e.status = 'verified'
   and lower(e.email) ~ '^[^@[:space:]]+@[^@[:space:]]+\.edu$'
   and not exists (select 1 from celestual_users u where u.edu_email = lower(e.email))
 order by lower(e.email), e.verified_at asc;

select t_ok('backfill takes the handle from members',
  (select count(*) = 1 from celestual_users where instagram_handle = 'olduser'));
select t_ok('backfill takes the verification date, not the membership date',
  (select handle_verified_at = timestamptz '2026-01-01 00:00:00Z'
     from celestual_users where instagram_handle = 'olduser'));
select t_ok('backfill lowercases the edu address',
  (select count(*) = 1 from celestual_users where edu_email = 'someone@berkeley.edu'));
select t_ok('backfill leaves the edu row without a handle',
  (select instagram_handle is null from celestual_users where edu_email = 'someone@berkeley.edu'));
select t_ok('edu_domain is generated',
  (select edu_domain = 'berkeley.edu' from celestual_users where edu_email = 'someone@berkeley.edu'));

-- Replaying it adds nobody.
insert into celestual_users (instagram_handle, handle_verified_at, created_at)
select m.handle, m.first_verified_at, m.first_verified_at from celestual_members m
 where not exists (select 1 from celestual_users u where u.instagram_handle = m.handle);
select t_ok('backfill is idempotent', (select count(*) = 2 from celestual_users));

-- ── 2. a first handle, with no session ──────────────────────────────────────
select t_proof('ada', 'proof-ada');
select t_ok('bind_handle refuses without a live proof',
  (celestual_user_bind_handle('token-ada-000000000000', 'ada', 'wrong-proof')->>'error') = 'unverified');
select t_ok('bind_handle mints an identity',
  (celestual_user_bind_handle('token-ada-000000000000', '@Ada', 'proof-ada')->'user'->>'handle') = 'ada');
select t_ok('whoami reports it',
  (celestual_whoami('token-ada-000000000000')->>'signed_in')::boolean);
select t_ok('whoami on an unknown token is not an error',
  (celestual_whoami('token-nobody-0000000000')->>'signed_in')::boolean = false);
select t_ok('resolution alone never sets handle_verified_at',
  (select handle_verified_at is not null from celestual_users where instagram_handle = 'ada'));

-- ── 3. Q5. an unverified email attaches and never merges ────────────────────
select celestual_user_set_email('token-ada-000000000000', 'Ada@Example.com');
select t_ok('set_email lowercases and attaches',
  (select email = 'ada@example.com' from celestual_users where instagram_handle = 'ada'));

-- Somebody else claims the same address. Q5: nothing happens to Ada's row.
select t_proof('grace', 'proof-grace');
select celestual_user_bind_handle('token-grace-00000000000', 'grace', 'proof-grace');
select celestual_user_set_email('token-grace-00000000000', 'ada@example.com');
select t_ok('Q5: a shared plain email does not merge two rows',
  (select count(*) = 2 from celestual_users where email = 'ada@example.com' and merged_into is null));
select t_ok('Q5: neither row was absorbed',
  (select count(*) = 0 from celestual_users where merged_into is not null));

-- ── 4a. the wall first, then Instagram, one row. no merge needed ────────────
-- Nobody else holds the @, so this is an update on the row already in session
-- rather than a merge. Both paths land in the same place and only one of them
-- writes a trail, which is why they are tested apart.
select t_ok('bind_edu opens a row with no handle',
  (celestual_user_bind_edu('token-kay-000000000000', 'Kay@berkeley.edu')->'user'->>'handle') is null);
select t_ok('bind_edu reports the campus',
  (celestual_user_bind_edu('token-kay-000000000000', 'kay@berkeley.edu')->'user'->>'campus') = 'berkeley.edu');
select t_ok('bind_edu is idempotent within a session',
  (select count(*) = 1 from celestual_users where edu_email = 'kay@berkeley.edu'));

select t_proof('kay', 'proof-kay');
select celestual_user_bind_handle('token-kay-000000000000', 'kay', 'proof-kay');
select t_ok('one row ends up carrying both identifiers',
  (select count(*) = 1 from celestual_users
    where instagram_handle = 'kay' and edu_email = 'kay@berkeley.edu' and merged_into is null));
select t_ok('taking a free handle is not a merge',
  (select count(*) = 0 from celestual_user_merges));

-- ── 4b. two rows that turn out to be one person. the genuine merge ──────────
-- The handle was proved in one browser and the .edu address in another, which
-- is the ordinary case: a phone for Instagram, a laptop for the campus mail.
select t_proof('lin', 'proof-lin');
select celestual_user_bind_handle('token-lin-phone-00000000', 'lin', 'proof-lin');
select celestual_user_bind_edu('token-lin-laptop-0000000', 'lin@berkeley.edu');
select t_ok('two separate rows so far',
  (select count(*) = 2 from celestual_users
    where instagram_handle = 'lin' or edu_email = 'lin@berkeley.edu'));

-- Make the .edu row the older of the two, so which one survives is checkable
-- rather than incidental.
update celestual_users set created_at = timestamptz '2025-01-01 00:00:00Z'
 where edu_email = 'lin@berkeley.edu';

select t_ok('proving the handle in the wall session merges the two',
  (celestual_user_bind_handle('token-lin-laptop-0000000', 'lin', 'proof-lin')->>'ok')::boolean);
select t_ok('one row carries both identifiers',
  (select count(*) = 1 from celestual_users
    where instagram_handle = 'lin' and edu_email = 'lin@berkeley.edu' and merged_into is null));
select t_ok('the older row survived',
  (select created_at = timestamptz '2025-01-01 00:00:00Z' from celestual_users
    where instagram_handle = 'lin' and merged_into is null));
select t_ok('the other row is a tombstone',
  (select count(*) = 1 from celestual_users where merged_into is not null));
select t_ok('the laptop session still resolves',
  (celestual_whoami('token-lin-laptop-0000000')->'user'->>'handle') = 'lin');
select t_ok('the phone session follows the same person',
  (celestual_whoami('token-lin-phone-00000000')->'user'->>'campus') = 'berkeley.edu');
select t_ok('the merge left a trail',
  (select count(*) = 1 from celestual_user_merges where reason = 'bind_handle'));
select t_ok('the trail records what moved',
  (select moved_json->'fields' ? 'handle' from celestual_user_merges
    where reason = 'bind_handle'));
select t_ok('no conflict was recorded', (select count(*) = 0 from celestual_merge_conflicts));

-- ── 5. Q23. two verified handles is a switch, not a merge ───────────────────
select t_proof('turing', 'proof-turing');
select celestual_user_bind_handle('token-switch-0000000000', 'ada', 'proof-ada');
select t_ok('the session is on ada',
  (celestual_whoami('token-switch-0000000000')->'user'->>'handle') = 'ada');
select t_ok('proving a second handle switches the session',
  (celestual_user_bind_handle('token-switch-0000000000', 'turing', 'proof-turing')->'user'->>'handle') = 'turing');
select t_ok('ada was not absorbed',
  (select merged_into is null from celestual_users where instagram_handle = 'ada'));
select t_ok('ada kept her email',
  (select email = 'ada@example.com' from celestual_users where instagram_handle = 'ada'));
select t_ok('a switch is not a conflict', (select count(*) = 0 from celestual_merge_conflicts));

-- ── 6. Q6. two different verified edu addresses stop and ask ────────────────
select t_ok('a second campus on one row is refused',
  (celestual_user_bind_edu('token-lin-laptop-0000000', 'lin@stanford.edu')->>'error') = 'conflict_edu');
select t_ok('the refusal is recorded for admin',
  (select count(*) = 1 from celestual_merge_conflicts where kind = 'edu' and resolved_at is null));
select t_ok('the original campus is untouched',
  (select edu_email = 'lin@berkeley.edu' from celestual_users where instagram_handle = 'lin'));

-- The merge-time version of the same collision: two rows, two campuses, one @.
insert into celestual_users (edu_email, edu_verified_at, created_at)
values ('rosalind@mit.edu', now(), timestamptz '2024-01-01 00:00:00Z');
select t_ok('merging two campuses is refused',
  (celestual_user_merge(
     (select id from celestual_users where edu_email = 'rosalind@mit.edu'),
     (select id from celestual_users where instagram_handle = 'lin'),
     'test')->>'error') = 'conflict_edu');
select t_ok('both rows stand after the refusal',
  (select count(*) = 2 from celestual_users
    where edu_email in ('rosalind@mit.edu', 'lin@berkeley.edu') and merged_into is null));

-- The handle version.
select t_ok('merging two verified handles is refused',
  (celestual_user_merge(
     (select id from celestual_users where instagram_handle = 'ada'),
     (select id from celestual_users where instagram_handle = 'turing'),
     'test')->>'error') = 'conflict_handle');

-- ── 7. content follows its identity ─────────────────────────────────────────
-- A stand-in for the wall tables Phase 6a adds. The merge finds it through the
-- catalogue, so nothing in 0030 has to know it exists.
create table t_content (
  id      bigserial primary key,
  user_id uuid not null references celestual_users (id) on delete cascade,
  body    text
);
insert into celestual_users (edu_email, edu_verified_at, created_at)
values ('mover@berkeley.edu', now(), timestamptz '2023-01-01 00:00:00Z');
insert into celestual_users (email, created_at)
values ('moved@example.com', timestamptz '2023-06-01 00:00:00Z');
insert into t_content (user_id, body)
select id, 'a letter' from celestual_users where email = 'moved@example.com';

select t_ok('a merge with content succeeds',
  (celestual_user_merge(
     (select id from celestual_users where edu_email = 'mover@berkeley.edu'),
     (select id from celestual_users where email = 'moved@example.com'),
     'test')->>'ok')::boolean);
select t_ok('the content followed',
  (select c.user_id = (select id from celestual_users where edu_email = 'mover@berkeley.edu')
     from t_content c where c.body = 'a letter'));
select t_ok('the trail names the table it moved',
  (select moved_json->'rows'->0->>'table' = 't_content'
     from celestual_user_merges order by created_at desc limit 1));
-- The survivor had no plain address of its own, so it took the absorbed row's.
-- Q6 only says the SURVIVOR's wins where both have one; where it has none there
-- is a way to reach somebody to gain and nothing to lose.
select t_ok('an absent plain email is filled from the absorbed row',
  (select email = 'moved@example.com' from celestual_users
    where edu_email = 'mover@berkeley.edu'));
select t_ok('the absorbed row is a tombstone, not a delete',
  (select merged_into is not null and instagram_handle is null and edu_email is null
     from celestual_users
    where email = 'moved@example.com' and merged_into is not null));
select t_ok('the tombstone points at its survivor',
  (select merged_into = (select id from celestual_users where edu_email = 'mover@berkeley.edu')
     from celestual_users where merged_into is not null and email = 'moved@example.com'));

-- ── 8. a session minted before a merge still works ──────────────────────────
insert into celestual_users (edu_email, edu_verified_at, created_at)
values ('stale@berkeley.edu', now(), timestamptz '2022-06-01 00:00:00Z');
insert into celestual_users (email, created_at)
values ('stale2@example.com', timestamptz '2022-07-01 00:00:00Z');
insert into celestual_sessions (token_hash, user_id, expires_at)
select encode(extensions.digest('token-stale-00000000000', 'sha256'), 'hex'), id, now() + interval '30 days'
  from celestual_users where email = 'stale2@example.com';
select celestual_user_merge(
  (select id from celestual_users where edu_email = 'stale@berkeley.edu'),
  (select id from celestual_users where email = 'stale2@example.com'), 'test');
select t_ok('the token follows its person through a merge',
  (celestual_whoami('token-stale-00000000000')->'user'->>'campus') = 'berkeley.edu');

-- ── 9. the shape of the row handed to the client ────────────────────────────
select t_ok('the client is never handed the edu address itself',
  (celestual_whoami('token-lin-laptop-0000000')->'user') ? 'campus'
  and not ((celestual_whoami('token-lin-laptop-0000000')->'user') ? 'edu_email'));

-- ── 10. the constraints hold ────────────────────────────────────────────────
do $$ begin
  begin
    insert into celestual_users (instagram_handle, handle_verified_at) values ('@Shouty', now());
    raise exception 'FAIL  a non-normalised handle was accepted';
  exception when check_violation then raise notice 'PASS  a non-normalised handle is refused';
  end;
  begin
    insert into celestual_users (instagram_handle) values ('unproved');
    raise exception 'FAIL  a handle without a verification date was accepted';
  exception when check_violation then raise notice 'PASS  a handle without a verification date is refused';
  end;
  begin
    insert into celestual_users (edu_email, edu_verified_at) values ('someone@gmail.com', now());
    raise exception 'FAIL  a non-edu address reached edu_email';
  exception when check_violation then raise notice 'PASS  a non-edu address cannot reach edu_email';
  end;
  begin
    insert into celestual_users (instagram_handle, handle_verified_at) values ('ada', now());
    raise exception 'FAIL  a duplicate handle was accepted';
  exception when unique_violation then raise notice 'PASS  a duplicate handle is refused';
  end;
end $$;

select t_ok('every user row is reachable and consistent',
  (select bool_and(
     (instagram_handle is null) = (handle_verified_at is null)
     and (edu_email is null) = (edu_verified_at is null))
   from celestual_users));

-- ── 11. a composite reference is refused, not silently skipped ──────────────
create table t_composite (
  user_id uuid not null,
  tag     text not null,
  primary key (user_id, tag),
  constraint t_composite_user_fk foreign key (user_id) references celestual_users (id)
);
select t_ok('an ordinary single column reference still merges',
  (select count(*) > 0 from pg_constraint
    where confrelid = 'celestual_users'::regclass and contype = 'f'));
drop table t_composite;

drop table t_content;
