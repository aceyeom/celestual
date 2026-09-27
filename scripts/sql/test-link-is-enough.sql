-- ─────────────────────────────────────────────────────────────────────────────
-- test-link-is-enough.sql: exercises 0070_the_link_is_enough.sql.
--
-- A campus link carries the letter waiting on it to the browser that opens
-- it, when that is not the one that asked, and lets go of it once it is
-- handed over or runs out; the browser that asked is told the link was opened
-- elsewhere; and nothing but a campus link carries anything. The sign in
-- rules themselves are in test-login-link.sql and test-mail.sql. Run through
-- scripts/verify-migrations.sh --test. Everything is rolled back.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function le_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function le_hash(p text) returns text
language sql as $$ select encode(extensions.digest(p, 'sha256'), 'hex') $$;

create or replace function le_user(p_token text) returns uuid
language sql as $$
  select celestual_user_live(user_id) from celestual_sessions where token_hash = le_hash(p_token)
$$;

-- a campus link for an address from a browser, carrying `p_carry`
create or replace function le_open(p_email text, p_session text, p_link text, p_carry jsonb, p_purpose text default 'edu')
returns jsonb language sql as $$
  select celestual_edu_link_open(p_email => p_email, p_session => p_session, p_purpose => p_purpose,
                                 p_campus => case when p_purpose = 'edu' then 'berkeley' end, p_ip => null,
                                 p_link_hash => le_hash(p_link), p_carry => p_carry)
$$;

create or replace function le_carry(p_link text) returns jsonb
language sql as $$ select carry from celestual_edu_verifications where link_hash = le_hash(p_link) $$;

-- the link's row is there, and carries nothing
create or replace function le_bare(p_link text) returns boolean
language sql as $$
  select exists (select 1 from celestual_edu_verifications where link_hash = le_hash(p_link) and carry is null)
$$;

create temp table le_letter as
  select jsonb_build_object('letter', jsonb_build_object(
    'kind', 'handle', 'to', 'sofia', 'body', 'you lent me a pen in the first week', 'proof', 'edu',
    'nonce', 'le-nonce-0000000001')) as d;

-- ── 1. who may call it ───────────────────────────────────────────────────────
select le_ok('the open with a carry is the service role''s',
  not has_function_privilege('anon', 'celestual_edu_link_open(text, text, text, text, text, text, jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_edu_link_open(text, text, text, text, text, text, jsonb)', 'EXECUTE')
  and has_function_privilege('service_role', 'celestual_edu_link_open(text, text, text, text, text, text, jsonb)', 'EXECUTE'));

-- ── 2. what is kept ──────────────────────────────────────────────────────────
select le_ok('a campus link opens with no number and answers none',
  (select (r->>'ok')::boolean and r->>'match' is null
     from (select le_open('writer@berkeley.edu', 'token-le-phone-00000', 'link-le-one-aaaaaaaaaaaaaa',
                          (select d from le_letter)) as r) s));
select le_ok('and keeps the letter it carries',
  le_carry('link-le-one-aaaaaaaaaaaaaa') = (select d from le_letter)
  and (select match is null from celestual_edu_verifications where link_hash = le_hash('link-le-one-aaaaaaaaaaaaaa')));
select le_open('someone@gmail.com', 'token-le-phone-00000', 'link-le-login-aaaaaaaaaaaa', (select d from le_letter), 'login');
select le_ok('a login link carries nothing', le_bare('link-le-login-aaaaaaaaaaaa'));
select le_open('someone@gmail.com', 'token-le-phone-00000', 'link-le-alerts-aaaaaaaaaaa', (select d from le_letter), 'alerts');
select le_ok('nor does an alerts link', le_bare('link-le-alerts-aaaaaaaaaaa'));
select le_open('writer2@berkeley.edu', 'token-le-phone-00000', 'link-le-array-aaaaaaaaaaa', '[1, 2]'::jsonb);
select le_ok('a carry that is not an object is dropped, and the link still goes', le_bare('link-le-array-aaaaaaaaaaa'));
select le_open('writer3@berkeley.edu', 'token-le-phone-00000', 'link-le-big-aaaaaaaaaaaaa',
               jsonb_build_object('letter', jsonb_build_object('body', repeat('x', 5000))));
select le_ok('so is one over four kilobytes', le_bare('link-le-big-aaaaaaaaaaaaa'));
do $$
begin
  insert into celestual_edu_verifications (token, email, slug, code_hash, expires_at, status, carry)
  values (gen_random_uuid()::text, 'code@berkeley.edu', 'uc-berkeley', le_hash('123456'),
          now() + interval '10 minutes', 'pending', '{"letter": {}}'::jsonb);
  raise exception 'FAIL  a code row took a carry';
exception when check_violation then
  raise notice 'PASS  only a link carries anything';
end $$;

-- ── 3. opened on another browser ─────────────────────────────────────────────
-- The phone wrote the letter in Instagram's browser and asked twice (the
-- second link a resend); the mail opens the first in Safari.
select le_open('writer@berkeley.edu', 'token-le-phone-00000', 'link-le-two-aaaaaaaaaaaaaa', (select d from le_letter));
create temp table le_conf as
  select celestual_edu_link_confirm('link-le-one-aaaaaaaaaaaaaa', 'token-le-safari-0000', null) as r;
select le_ok('the browser that opened it is handed the letter',
  ((select r from le_conf)->>'ok')::boolean
  and not ((select r from le_conf)->>'same_device')::boolean
  and ((select r from le_conf)->'carry') = (select d from le_letter));
select le_ok('and holds the campus proof it posts with',
  (select edu_email = 'writer@berkeley.edu' from celestual_users where id = le_user('token-le-safari-0000')));
select le_ok('the row lets go of the letter, and so does the resend''s',
  le_bare('link-le-one-aaaaaaaaaaaaaa') and le_bare('link-le-two-aaaaaaaaaaaaaa'));
select le_ok('opened again there, it is answered with no letter',
  (select (r->>'ok')::boolean and (r->'carry' is null or jsonb_typeof(r->'carry') = 'null')
     from (select celestual_edu_link_confirm('link-le-one-aaaaaaaaaaaaaa', 'token-le-safari-0000') as r) s));
select le_ok('the phone is told it was opened elsewhere, and is nobody',
  (select (st->>'elsewhere')::boolean and not (st->>'verified')::boolean
     from (select celestual_edu_link_status(
             (select token from celestual_edu_verifications where link_hash = le_hash('link-le-one-aaaaaaaaaaaaaa')),
             'token-le-phone-00000') as st) s)
  and le_user('token-le-phone-00000') is null);
select le_ok('and the resend it is still waiting on is still pending',
  (select not (st->>'elsewhere')::boolean and not (st->>'verified')::boolean and not (st->>'expired')::boolean
     from (select celestual_edu_link_status(
             (select token from celestual_edu_verifications where link_hash = le_hash('link-le-two-aaaaaaaaaaaaaa')),
             'token-le-phone-00000') as st) s));

-- ── 4. opened on the browser that asked ──────────────────────────────────────
select le_open('here@berkeley.edu', 'token-le-laptop-0000', 'link-le-here-aaaaaaaaaaaaa', (select d from le_letter));
select le_ok('the browser that asked holds its own letter, and is handed none',
  (select (r->>'ok')::boolean and (r->>'same_device')::boolean
          and (r->'carry' is null or jsonb_typeof(r->'carry') = 'null')
     from (select celestual_edu_link_confirm('link-le-here-aaaaaaaaaaaaa', 'token-le-laptop-0000') as r) s));
select le_ok('and the row lets go of it', le_bare('link-le-here-aaaaaaaaaaaaa'));
select le_ok('and its status reads confirmed',
  (celestual_edu_link_status(
     (select token from celestual_edu_verifications where link_hash = le_hash('link-le-here-aaaaaaaaaaaaa')),
     'token-le-laptop-0000')->>'verified')::boolean);

-- ── 5. run out ───────────────────────────────────────────────────────────────
select le_open('late@berkeley.edu', 'token-le-late-000000', 'link-le-late-aaaaaaaaaaaaa', (select d from le_letter));
update celestual_edu_verifications set expires_at = now() - interval '1 minute'
 where link_hash = le_hash('link-le-late-aaaaaaaaaaaaa');
select le_ok('a link that ran out is carrying until its screen asks', le_carry('link-le-late-aaaaaaaaaaaaa') is not null);
select le_ok('a link that ran out hands nothing over',
  (celestual_edu_link_confirm('link-le-late-aaaaaaaaaaaaa', 'token-le-else-000000')->>'error') = 'expired');
select celestual_edu_link_status(
  (select token from celestual_edu_verifications where link_hash = le_hash('link-le-late-aaaaaaaaaaaaa')),
  'token-le-late-000000');
select le_ok('and its letter is let go the next time its screen asks', le_bare('link-le-late-aaaaaaaaaaaaa'));

select le_open('late2@berkeley.edu', 'token-le-late-000000', 'link-le-late2-aaaaaaaaaaaa', (select d from le_letter));
update celestual_edu_verifications set expires_at = now() - interval '1 minute'
 where link_hash = le_hash('link-le-late2-aaaaaaaaaaaa');
select le_ok('a link that ran out still carries until a sweep', le_carry('link-le-late2-aaaaaaaaaaaa') is not null);
select le_open('late3@berkeley.edu', 'token-le-other-00000', 'link-le-late3-aaaaaaaaaaaa', null);
select le_ok('or when anybody asks for a link', le_bare('link-le-late2-aaaaaaaaaaaa'));

-- ── 6. a confirm with no browser signs nobody in and spends nothing ──────────
select le_open('none@berkeley.edu', 'token-le-none-000000', 'link-le-none-aaaaaaaaaaaaa', null);
select le_ok('with no session it is refused, and the link still waits',
  (celestual_edu_link_confirm('link-le-none-aaaaaaaaaaaaa', null)->>'error') = 'invalid'
  and (select status = 'pending' from celestual_edu_verifications where link_hash = le_hash('link-le-none-aaaaaaaaaaaaa')));

rollback;
