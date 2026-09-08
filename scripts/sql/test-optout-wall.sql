-- ─────────────────────────────────────────────────────────────────────────────
-- test-optout-wall.sql: exercises 0046_the_opt_out_reaches_the_wall.sql.
--
-- The opt out is one act across two surfaces. What is worth asserting is that
-- the letters written ABOUT the handle come off the wall and out of the index,
-- that the ones written BY it go with the identity row, that the name stays
-- shut so the next writer cannot put it back, and that neither desk path can
-- publish a letter to a handle that has left. Run through
-- scripts/verify-migrations.sh --test. Self contained: its cast is its own.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function ow_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- ow-writer      at berkeley. Writes to the subject, and stays. Its three
--                letters are its whole allowance for the week, which is why
--                the writer who has to write one AFTER the opt out is a
--                second person: a refusal for the cap would look exactly like
--                a refusal for the name.
-- ow-other       at berkeley, and has written nothing.
-- qqoptsubject   the person who leaves. Has a proved handle, three letters
--                written about them, and one letter of their own.
do $$
declare w uuid; o uuid; s uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at)
    values ('ow-writer@berkeley.edu', now()) returning id into w;
  insert into celestual_users (edu_email, edu_verified_at)
    values ('ow-other@berkeley.edu', now()) returning id into o;
  perform celestual_session_bind(o, encode(extensions.digest('ow-token-other-000000000', 'sha256'), 'hex'));
  insert into celestual_users (instagram_handle, handle_verified_at, edu_email, edu_verified_at)
    values ('qqoptsubject', now(), 'ow-subject@berkeley.edu', now()) returning id into s;

  perform celestual_session_bind(w, encode(extensions.digest('ow-token-writer-00000000', 'sha256'), 'hex'));

  insert into wall_letters (target_handle, body, author_id, campus, status)
  values ('qqoptsubject', 'the first one, written about the person who is about to leave', w, 'berkeley', 'live'),
         ('qqoptsubject', 'the second one, same name over it', w, 'berkeley', 'live'),
         ('qqoptsubject', 'the third one, held back by the screen', w, 'berkeley', 'pending');

  insert into wall_letters (target_handle, body, author_id, campus, status)
  values ('qqothername', 'the one the subject wrote about somebody else', s, 'berkeley', 'live');

  -- the DM proof the opt out asks for
  insert into celestual_ig_verifications (handle, token, proof_hash, status, expires_at, verified_at)
  values ('qqoptsubject', '4321',
          encode(extensions.digest('ow-proof-subject-000000', 'sha256'), 'hex'),
          'verified', now() + interval '30 days', now());
end $$;

-- ── before ──────────────────────────────────────────────────────────────────
select ow_ok('the name is on the wall',
  (select letters from wall_index where target_handle = 'qqoptsubject') = 2);
select ow_ok('and the letter it wrote is up',
  (select count(*) from wall_letters where target_handle = 'qqothername' and status = 'live') = 1);
select ow_ok('and the name is not shut', wall_name_shut('qqoptsubject', 'berkeley') = false);

-- ── the act ─────────────────────────────────────────────────────────────────
select ow_ok('the opt out goes through',
  (celestual_suppress('qqoptsubject', 'ow-proof-subject-000000')->>'suppressed') = 'qqoptsubject');

-- ── after ───────────────────────────────────────────────────────────────────
select ow_ok('the name is off the index',
  not exists (select 1 from wall_index where target_handle = 'qqoptsubject'));
select ow_ok('every letter about it is down',
  (select count(*) from wall_letters
    where target_handle = 'qqoptsubject' and status <> 'removed') = 0);
select ow_ok('and each one says why it came down',
  (select count(*) from wall_letters
    where target_handle = 'qqoptsubject' and moderation #>> '{desk,via}' = 'optout') = 3);
select ow_ok('the letter it wrote went with the identity row',
  not exists (select 1 from wall_letters where target_handle = 'qqothername'));
select ow_ok('the identity row is gone',
  not exists (select 1 from celestual_users where instagram_handle = 'qqoptsubject'));
select ow_ok('the name is shut at berkeley', wall_name_shut('qqoptsubject', 'berkeley') = true);
select ow_ok('and at a campus it was never written on', wall_name_shut('qqoptsubject', 'anywhere') = true);
select ow_ok('a handle that never opted out is untouched',
  wall_name_shut('qqneverleft', 'berkeley') = false);

-- ── nobody can write to it again ────────────────────────────────────────────
select ow_ok('a new letter to the name is refused',
  (wall_write('ow-token-writer-00000000', 'qqoptsubject',
              'the letter that must not land', null, null, 'berkeley', 'live', null)->>'error') = 'removed');
select ow_ok('and a letter to a name that has not left still lands',
  (wall_write('ow-token-other-000000000', 'qqstillhere',
              'a letter to a name that has not left the product', null, null, 'berkeley', 'live', null)->>'ok')::boolean = true);

-- ── and no desk can put one back ────────────────────────────────────────────
do $$
declare l uuid; r uuid; out1 jsonb; out2 jsonb;
begin
  select id into l from wall_letters where target_handle = 'qqoptsubject' limit 1;

  out1 := celestual_desk_letter_set(l, 'live', 'putting it back');
  perform ow_ok('the desk cannot publish a letter to a handle that left',
    (out1->>'error') = 'optout');
  perform ow_ok('and the letter is still down',
    (select status from wall_letters where id = l) = 'removed');

  insert into wall_reports (letter_id, reason, status)
    values (l, 'a report filed before the opt out', 'open') returning id into r;
  out2 := celestual_desk_report_resolve(r, false, 'the letter was fine');
  perform ow_ok('dismissing a report answers it', (out2->>'closed')::int = 1);
  perform ow_ok('and does not restore the letter', (out2->>'restored')::boolean = false);
  perform ow_ok('and says why', (out2->>'optout')::boolean = true);
  perform ow_ok('the letter is still down after the dismissal',
    (select status from wall_letters where id = l) = 'removed');
end $$;

-- ── the desk still works for everybody else ─────────────────────────────────
do $$
declare l uuid; out1 jsonb;
begin
  select id into l from wall_letters where target_handle = 'qqstillhere' limit 1;
  update wall_letters set status = 'removed' where id = l;
  out1 := celestual_desk_letter_set(l, 'live', 'back up');
  perform ow_ok('a letter to a handle that has not left can go back up',
    (out1->>'status') = 'live');
end $$;

drop function ow_ok(text, boolean);
