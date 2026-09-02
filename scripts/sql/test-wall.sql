-- ─────────────────────────────────────────────────────────────────────────────
-- test-wall.sql: exercises 0032_the_wall.sql against a local database.
--
-- The wall's whole claim is that the author is never disclosed and the letters
-- are not readable by the open internet. Those are properties of the schema, so
-- they are asserted here rather than trusted. Run through
-- scripts/verify-migrations.sh --test.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function w_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

-- A session on a user, without going through the edge functions.
create or replace function w_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- author   at berkeley, no handle. The ordinary wall writer.
-- subject  at berkeley AND holds the verified handle the letter is about.
-- outsider at stanford. Verified, just not here.
-- stranger no session at all.
do $$
declare a uuid; s uuid; o uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at) values ('author@berkeley.edu', now())
    returning id into a;
  insert into celestual_users (instagram_handle, handle_verified_at, edu_email, edu_verified_at)
    values ('subject', now(), 'subject@berkeley.edu', now()) returning id into s;
  insert into celestual_users (edu_email, edu_verified_at) values ('other@stanford.edu', now())
    returning id into o;
  perform w_session(a, 'token-author-0000000000');
  perform w_session(s, 'token-subject-000000000');
  perform w_session(o, 'token-outsider-00000000');
end $$;

-- ── 1. the gate ─────────────────────────────────────────────────────────────
select w_ok('a berkeley address opens the berkeley wall',
  wall_gate((select id from celestual_users where edu_email='author@berkeley.edu'), 'berkeley'));
select w_ok('a stanford address does not',
  wall_gate((select id from celestual_users where edu_email='other@stanford.edu'), 'berkeley') = false);
select w_ok('nobody at all does not', wall_gate(null, 'berkeley') = false);
select w_ok('a campus that is not open does not', wall_gate(
  (select id from celestual_users where edu_email='author@berkeley.edu'), 'nowhere') = false);

-- ── 2. writing ──────────────────────────────────────────────────────────────
select w_ok('the outsider cannot write',
  (wall_write('token-outsider-00000000', 'subject', 'a letter', null, null, 'berkeley', 'live', '{}')->>'error') = 'gate');
select w_ok('a session-less write is refused',
  (wall_write('token-nobody-00000000000', 'subject', 'a letter', null, null, 'berkeley', 'live', '{}')->>'error') = 'no_session');
select w_ok('a status the screen did not produce is refused',
  (wall_write('token-author-0000000000', 'subject', 'a letter', null, null, 'berkeley', 'removed', '{}')->>'error') = 'status');

select w_ok('the author writes',
  (wall_write('token-author-0000000000', '@Subject', 'i should have said something in march',
              'you lent me a pen and never asked for it back', 'flyer_a', 'berkeley', 'live',
              '{"verdict":"pass","reasons":[]}')->>'ok')::boolean);
select w_ok('the handle was normalised',
  (select count(*) = 1 from wall_letters where target_handle = 'subject'));
select w_ok('the author is recorded as a row, not a string',
  (select author_id = (select id from celestual_users where edu_email='author@berkeley.edu')
     from wall_letters where target_handle = 'subject'));

-- A rejected letter is STORED. Spec section 9.
select wall_write('token-author-0000000000', 'someoneelse', 'call me on 555 123 4567', null, null,
                  'berkeley', 'rejected', '{"verdict":"reject","reasons":["phone"]}');
select w_ok('a rejected letter is stored, not dropped',
  (select count(*) = 1 from wall_letters where status = 'rejected'));
select w_ok('with its reason attached',
  (select moderation->'reasons'->>0 = 'phone' from wall_letters where status = 'rejected'));
select w_ok('and it is not on the wall',
  (select count(*) = 0 from wall_index where target_handle = 'someoneelse'));

-- ── 3. THE PUBLIC INDEX CARRIES NO WORDS ────────────────────────────────────
-- The property the whole feature rests on. Not filtered: absent.
select w_ok('the index has no body column',
  (select count(*) = 0 from information_schema.columns
    where table_name = 'wall_index' and column_name = 'body'));
select w_ok('the index has no author column',
  (select count(*) = 0 from information_schema.columns
    where table_name = 'wall_index' and column_name in ('author_id', 'author_handle')));
select w_ok('the index has no seal column',
  (select count(*) = 0 from information_schema.columns
    where table_name = 'wall_index' and column_name = 'sealed_line'));
select w_ok('anon can read the index', has_table_privilege('anon', 'wall_index', 'SELECT'));
select w_ok('the index counts the live letter',
  (select letters = 1 from wall_index where target_handle = 'subject'));

-- ── 4. THE CLIENT CANNOT REACH THE LETTERS TABLE ────────────────────────────
select w_ok('anon cannot select the letters',      not has_table_privilege('anon', 'wall_letters', 'SELECT'));
select w_ok('anon cannot insert a letter',         not has_table_privilege('anon', 'wall_letters', 'INSERT'));
select w_ok('anon cannot reach the claims',        not has_table_privilege('anon', 'wall_claims', 'SELECT'));
select w_ok('anon cannot read the waitlist',       not has_table_privilege('anon', 'wall_waitlist', 'SELECT'));
select w_ok('anon cannot read the reports',        not has_table_privilege('anon', 'wall_reports', 'SELECT'));
select w_ok('anon cannot call wall_write',
  not has_function_privilege('anon', 'wall_write(text, text, text, text, text, text, text, jsonb)', 'EXECUTE'));
select w_ok('anon cannot call the gate directly',
  not has_function_privilege('anon', 'wall_gate(uuid, text)', 'EXECUTE'));

-- ── 5. the redaction is the database's, not the client's ────────────────────
select w_ok('a stranger gets the letter with no words',
  (wall_letters_for('token-nobody-00000000000', 'subject')->'letters'->0->>'body') is null);
select w_ok('and is told the gate is shut',
  (wall_letters_for('token-nobody-00000000000', 'subject')->>'open')::boolean = false);
select w_ok('but still sees that a letter exists',
  jsonb_array_length(wall_letters_for('token-nobody-00000000000', 'subject')->'letters') = 1);
select w_ok('and that it carries a seal',
  (wall_letters_for('token-nobody-00000000000', 'subject')->'letters'->0->>'has_seal')::boolean);
select w_ok('the outsider gets no words either',
  (wall_letters_for('token-outsider-00000000', 'subject')->'letters'->0->>'body') is null);
select w_ok('somebody at berkeley gets the words',
  (wall_letters_for('token-author-0000000000', 'subject')->'letters'->0->>'body')
    = 'i should have said something in march');
select w_ok('no read ever returns the sealed line',
  not ((wall_letters_for('token-author-0000000000', 'subject')->'letters'->0) ? 'sealed_line'));
select w_ok('and no read ever returns the author',
  not ((wall_letters_for('token-author-0000000000', 'subject')->'letters'->0) ? 'author_id'));

-- ── 6. mine ─────────────────────────────────────────────────────────────────
do $$
declare lid uuid;
begin
  select id into lid from wall_letters where target_handle = 'subject';
  if (wall_letter('token-subject-000000000', lid)->'letter'->>'mine')::boolean is not true then
    raise exception 'FAIL  the subject is not told the letter is about them';
  end if;
  raise notice 'PASS  the subject is told the letter is about them';
  if (wall_letter('token-author-0000000000', lid)->'letter'->>'mine')::boolean then
    raise exception 'FAIL  somebody else was told the letter was about them';
  end if;
  raise notice 'PASS  nobody else is told the letter is about them';
end $$;

-- ── 7. the seal ─────────────────────────────────────────────────────────────
do $$
declare lid uuid;
begin
  select id into lid from wall_letters where target_handle = 'subject';

  if (wall_letter_seal('token-subject-000000000', lid)->>'error') <> 'sealed' then
    raise exception 'FAIL  the seal opened without an answer';
  end if;
  raise notice 'PASS  the seal is shut before anybody asks';

  if (wall_reveal_request('token-author-0000000000', lid)->>'error') <> 'unverified' then
    raise exception 'FAIL  somebody without the handle could ask';
  end if;
  raise notice 'PASS  only the person it is about can ask';

  if not (wall_reveal_request('token-subject-000000000', lid)->>'ok')::boolean then
    raise exception 'FAIL  the subject could not ask';
  end if;
  raise notice 'PASS  the subject asks';

  -- Once per letter, ever.
  perform wall_reveal_request('token-subject-000000000', lid);
  if (select count(*) from wall_reveal_requests where letter_id = lid) <> 1 then
    raise exception 'FAIL  a second ask was recorded';
  end if;
  raise notice 'PASS  asking twice is still one ask';

  if (wall_letter_seal('token-subject-000000000', lid)->>'error') <> 'sealed' then
    raise exception 'FAIL  asking alone opened the seal';
  end if;
  raise notice 'PASS  asking alone does not open the seal';

  if (wall_reveal_answer('token-subject-000000000', lid, true)->>'error') <> 'not_yours' then
    raise exception 'FAIL  somebody who did not write it could answer';
  end if;
  raise notice 'PASS  only the author answers';

  if not (wall_reveal_answer('token-author-0000000000', lid, true)->>'ok')::boolean then
    raise exception 'FAIL  the author could not answer';
  end if;
  raise notice 'PASS  the author answers';

  if (wall_letter_seal('token-subject-000000000', lid)->>'seal')
     <> 'you lent me a pen and never asked for it back' then
    raise exception 'FAIL  the seal did not open for the subject';
  end if;
  raise notice 'PASS  the seal opens for the subject';

  if (wall_letter_seal('token-outsider-00000000', lid)->>'error') <> 'sealed' then
    raise exception 'FAIL  the seal opened for somebody else';
  end if;
  raise notice 'PASS  and for nobody else';

  -- Answered once. A second answer changes nothing.
  if (wall_reveal_answer('token-author-0000000000', lid, false)->>'error') <> 'no_request' then
    raise exception 'FAIL  the author could answer twice';
  end if;
  raise notice 'PASS  the author answers once';
end $$;

-- ── 8. reporting takes it down on the tap ───────────────────────────────────
do $$
declare lid uuid;
begin
  select id into lid from wall_letters where target_handle = 'subject';

  if (wall_report('token-outsider-00000000', lid, 'i do not like it')->>'error') <> 'gate' then
    raise exception 'FAIL  somebody off campus could report';
  end if;
  raise notice 'PASS  reporting needs the campus';

  if not (wall_report('token-author-0000000000', lid, 'on reflection')->>'ok')::boolean then
    raise exception 'FAIL  a report from campus was refused';
  end if;
  raise notice 'PASS  a report from campus is filed';

  if (select status from wall_letters where id = lid) <> 'removed' then
    raise exception 'FAIL  the letter stayed up after a report';
  end if;
  raise notice 'PASS  the letter comes down on the tap';

  if (select count(*) from wall_index where target_handle = 'subject') <> 0 then
    raise exception 'FAIL  a removed letter is still on the wall';
  end if;
  raise notice 'PASS  and it is off the index';

  if (select count(*) from wall_reports where letter_id = lid and status = 'open') <> 1 then
    raise exception 'FAIL  no open report was filed';
  end if;
  raise notice 'PASS  with an open report for a person to look at';
end $$;

-- ── 9. a name that came off stays off ───────────────────────────────────────
select w_ok('the handle cannot be written to again',
  (wall_write('token-author-0000000000', 'subject', 'again', null, null, 'berkeley', 'live', '{}')->>'error')
    = 'removed');

-- ── 10. the takedown by the subject ─────────────────────────────────────────
do $$
declare lid uuid;
begin
  insert into wall_letters (target_handle, body, author_id, campus, status)
  values ('another', 'a second letter',
          (select id from celestual_users where edu_email='author@berkeley.edu'), 'berkeley', 'live')
  returning id into lid;

  if (wall_remove_letter('token-author-0000000000', lid)->>'error') <> 'unverified' then
    raise exception 'FAIL  somebody without the handle could take it down';
  end if;
  raise notice 'PASS  a takedown needs the verified handle';

  insert into celestual_users (instagram_handle, handle_verified_at) values ('another', now());
  perform w_session((select id from celestual_users where instagram_handle='another'), 'token-another-000000000');

  if not (wall_remove_letter('token-another-000000000', lid)->>'ok')::boolean then
    raise exception 'FAIL  the subject could not take it down';
  end if;
  raise notice 'PASS  the subject takes it down';

  if (select status from wall_letters where id = lid) <> 'removed' then
    raise exception 'FAIL  the takedown did not remove it';
  end if;
  raise notice 'PASS  it is removed and not deleted';

  if (select count(*) from wall_claims where letter_id = lid) <> 1 then
    raise exception 'FAIL  the takedown filed no claim';
  end if;
  raise notice 'PASS  and the claim is filed in the same breath';
end $$;

-- ── 11. the waitlist and the flyer ──────────────────────────────────────────
select w_ok('a handle joins the waitlist',
  (wall_waitlist_add('nobodyhere', 'berkeley', 'flyer_a')->>'ok')::boolean);
select w_ok('joining twice is still once',
  (select count(*) = 1 from (select wall_waitlist_add('nobodyhere', 'berkeley', 'flyer_a')) x
     where (select count(*) from wall_waitlist where handle = 'nobodyhere') = 1));
select w_ok('nothing in the schema reads the waitlist back',
  (select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'wall_%'
      and p.prosrc like '%from wall_waitlist%'));
select w_ok('a scan is logged', (wall_scan('flyer_b', 'berkeley')->>'ok')::boolean);
select w_ok('a nonsense source is refused', (wall_scan('../../etc', 'berkeley')->>'error') = 'source');

-- ── 12. search reads the index and nothing else ─────────────────────────────
do $$
begin
  insert into wall_letters (target_handle, body, author_id, campus, status)
  values ('findme', 'a third letter',
          (select id from celestual_users where edu_email='author@berkeley.edu'), 'berkeley', 'live');
end $$;
select w_ok('an exact handle is found', (wall_search('findme')->0->>'handle') = 'findme');
select w_ok('a partial handle is found', (wall_search('find')->0->>'handle') = 'findme');
select w_ok('one character finds nothing', jsonb_array_length(wall_search('f')) = 0);
select w_ok('search returns no bodies', not ((wall_search('findme')->0) ? 'body'));

-- ── 13. content follows its author through a merge ──────────────────────────
-- 0030's catalogue loop should pick wall_letters up with nothing here to tell
-- it about the wall.
do $$
declare older uuid; newer uuid; n int;
begin
  -- The older row carries no campus of its own, so this is the ordinary case:
  -- somebody who had a row before they verified anything. Two rows that BOTH
  -- carry a verified campus is Q6's stop condition, and 0032 does not get to
  -- change that.
  insert into celestual_users (email, created_at)
  values ('older@example.com', timestamptz '2020-01-01') returning id into older;
  newer := (select id from celestual_users where edu_email = 'author@berkeley.edu');
  select count(*) into n from wall_letters where author_id = newer;

  if not (celestual_user_merge(older, newer, 'test')->>'ok')::boolean then
    raise exception 'FAIL  the merge was refused';
  end if;
  if (select count(*) from wall_letters where author_id = older) <> n then
    raise exception 'FAIL  the letters did not follow their author';
  end if;
  raise notice 'PASS  letters follow their author through a merge';

  -- And 0032 wrote nothing to make that happen: the catalogue loop in 0030
  -- found wall_letters by its foreign key.
  if (select moved_json->'rows' @> '[{"table":"wall_letters"}]'::jsonb
        from celestual_user_merges order by created_at desc limit 1) is not true then
    raise exception 'FAIL  the merge trail does not name wall_letters';
  end if;
  raise notice 'PASS  and the merge trail names the wall table it moved';
end $$;

-- Two campuses on two rows is still refused, with the wall in play.
do $$
declare a uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at, created_at)
  values ('two@stanford.edu', now(), timestamptz '2019-01-01') returning id into a;
  if (celestual_user_merge(a,
        (select id from celestual_users where edu_email = 'subject@berkeley.edu'),
        'test')->>'error') <> 'conflict_edu' then
    raise exception 'FAIL  two campuses merged';
  end if;
  raise notice 'PASS  two campuses still refuse to merge';
end $$;

-- ── 14. the pending sweep ───────────────────────────────────────────────────
do $$
begin
  insert into wall_letters (target_handle, body, author_id, campus, status, created_at)
  values ('stale', 'held forever',
          (select id from celestual_users where email='older@example.com' and merged_into is null),
          'berkeley', 'pending', now() - interval '8 days');
end $$;
select w_ok('a letter held past a week is closed out', wall_expire() = 1);
select w_ok('and it says why',
  (select moderation->'reasons'->>0 = 'expired_in_review' from wall_letters where target_handle = 'stale'));

-- ── 15. the beta tables are gone ────────────────────────────────────────────
select w_ok('beta_letters is gone',       to_regclass('public.beta_letters') is null);
select w_ok('beta_letters_public is gone', to_regclass('public.beta_letters_public') is null);
select w_ok('beta_remove_letter is gone',
  (select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'beta_remove_letter'));
