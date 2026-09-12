-- ─────────────────────────────────────────────────────────────────────────────
-- test-free-reads.sql: exercises 0045_five_before_the_door.sql.
--
-- Eight whole letters to anybody, then the door (0045, raised in 0049). The claims worth asserting are
-- that the count is the SERVER'S (a sixth body does not travel), that reading
-- the same letter twice costs one, that the tally carries no identity and is
-- never listed, and that passing the gate erases it. Run through
-- scripts/verify-migrations.sh --test. Self contained: its cast is its own, so
-- it does not depend on the order the tests run in.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;

create or replace function fr_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if p_cond then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function fr_session(p_user uuid, p_token text) returns void
language plpgsql as $$
begin
  perform celestual_session_bind(p_user, encode(extensions.digest(p_token, 'sha256'), 'hex'));
end; $$;

-- The body of the nth letter under a handle, as one token sees it.
create or replace function fr_body(p_token text, p_handle text, p_n int) returns text
language sql as $$
  select wall_letters_for(p_token, p_handle)->'letters'->p_n->>'body'
$$;

create or replace function fr_left(p_token text, p_handle text) returns int
language sql as $$
  select (wall_letters_for(p_token, p_handle)->'free'->>'left')::int
$$;

insert into celestual_settings (key, value) values ('handle_salt', 'test-salt')
  on conflict (key) do nothing;

-- ── the cast ────────────────────────────────────────────────────────────────
-- fr-writer   at berkeley. Puts the letters up.
-- fr-reader   through the gate. The eight never apply.
-- and two browsers with no session at all, which is who this migration is for.
do $$
declare w uuid; r uuid;
begin
  insert into celestual_users (edu_email, edu_verified_at)
    values ('fr-writer@berkeley.edu', now()) returning id into w;
  insert into celestual_users (instagram_handle, handle_verified_at)
    values ('frreader', now()) returning id into r;
  perform fr_session(w, 'fr-token-writer-000000');
  perform fr_session(r, 'fr-token-reader-000000');
end $$;

-- Ten letters under one name, so one call can run the allowance out and
-- still have two left over to withhold. Inserted directly rather than through
-- wall_write: the three a week is 0044's rule and test-reading-room.sql is
-- where it is asserted, and a fixture that has to fight it proves nothing
-- about the allowance. It was seven, for five; 0049 made it eight, and this
-- file follows.
do $$
declare i int; w uuid;
begin
  select id into w from celestual_users where edu_email = 'fr-writer@berkeley.edu';
  for i in 1..10 loop
    insert into wall_letters (target_handle, body, author_id, campus, status, created_at)
    values ('qqfivesubject', 'letter number ' || i || ', written so there is something to withhold',
            w, 'berkeley', 'live', now() - (i || ' minutes')::interval);
  end loop;
end $$;

select fr_ok('ten letters are up',
  (select count(*) from wall_letters where target_handle = 'qqfivesubject' and status = 'live') = 10);
select fr_ok('the allowance is eight', wall_free_allowance() = 8);

-- ── 1. eight whole letters, then nothing ────────────────────────────────────
-- One call, because that is how the screen reads a name: every letter under it
-- at once, and the allowance spent in the order they come back.
select fr_ok('a browser with no session reads the first',
  fr_body('fr-token-stranger-0001', 'qqfivesubject', 0) is not null);
select fr_ok('and the eighth',
  fr_body('fr-token-stranger-0001', 'qqfivesubject', 7) is not null);
select fr_ok('and the ninth is withheld',
  fr_body('fr-token-stranger-0001', 'qqfivesubject', 8) is null);
select fr_ok('and so is the tenth',
  fr_body('fr-token-stranger-0001', 'qqfivesubject', 9) is null);
select fr_ok('the withheld letter still carries its shape',
  ((wall_letters_for('fr-token-stranger-0001', 'qqfivesubject')->'letters'->8->>'words')::int) > 0);
select fr_ok('nothing is left',
  fr_left('fr-token-stranger-0001', 'qqfivesubject') = 0);
select fr_ok('and the read says so, not that the reader is through the gate',
  (wall_letters_for('fr-token-stranger-0001', 'qqfivesubject')->>'gated')::boolean = false);

-- ── 2. a letter already read costs nothing to read again ────────────────────
-- The point of counting letters rather than requests: walking back to
-- something you have read is not a punishment.
select fr_ok('reading it all again hands back the same eight',
  fr_body('fr-token-stranger-0001', 'qqfivesubject', 0) is not null
  and fr_body('fr-token-stranger-0001', 'qqfivesubject', 7) is not null
  and fr_body('fr-token-stranger-0001', 'qqfivesubject', 8) is null);
select fr_ok('and has not spent a ninth',
  (select count(*) from wall_free_reads where token_key = wall_free_key('fr-token-stranger-0001')) = 8);

-- ── 3. one letter at a time, by its own address ─────────────────────────────
-- What a shared link does. A second browser spends them one by one.
do $$
declare r record; i int := 0;
begin
  for r in select id from wall_letters where target_handle = 'qqfivesubject' order by created_at desc loop
    i := i + 1;
    if i <= 8 then
      perform fr_ok('letter ' || i || ' opens by its own address',
        (wall_letter('fr-token-stranger-0002', r.id)->'letter'->>'body') is not null);
    elsif i = 9 then
      perform fr_ok('the ninth by its own address is withheld',
        (wall_letter('fr-token-stranger-0002', r.id)->'letter'->>'body') is null);
      perform fr_ok('and it says none are left',
        (wall_letter('fr-token-stranger-0002', r.id)->'free'->>'left')::int = 0);
    end if;
  end loop;
end $$;

-- ── 4. the browsers are separate browsers ───────────────────────────────────
-- Note that `free` is the state AFTER the read that answered it, which is the
-- number a screen wants: a stranger who has just been handed one letter is
-- told four, not five. So a browser that has spent nothing is asked about
-- without reading anything.
select fr_ok('one browser spending eight does not spend anybody else s',
  (select count(distinct token_key) from wall_free_reads) = 2);
select fr_ok('a third browser has spent nothing',
  wall_free_used(wall_free_key('fr-token-stranger-0003')) = 0);
select fr_ok('and gets its own eight',
  (select count(*) from jsonb_array_elements(
     wall_letters_for('fr-token-stranger-0003', 'qqfivesubject')->'letters') e
    where e->>'body' is not null) = 8);
select fr_ok('and is at nothing left once it has',
  fr_left('fr-token-stranger-0003', 'qqfivesubject') = 0);

-- ── 5. the key cannot be joined to an identity ──────────────────────────────
-- The same browser secret, hashed with its own prefix, so a reader of the
-- database cannot put wall_free_reads beside celestual_sessions.
select fr_ok('the free read key is not the session token hash',
  wall_free_key('fr-token-reader-000000')
    <> encode(extensions.digest('fr-token-reader-000000', 'sha256'), 'hex'));
select fr_ok('a token too short to be one of ours gets no key',
  wall_free_key('short') is null);
select fr_ok('and therefore no free reads',
  wall_free_take(wall_free_key('short'), (select id from wall_letters where target_handle='qqfivesubject' limit 1)) = false);
select fr_ok('the tally carries no identity',
  (select count(*) = 0 from information_schema.columns
    where table_name = 'wall_free_reads'
      and column_name in ('user_id', 'handle', 'email', 'ip', 'token_hash')));
select fr_ok('and the browser cannot reach any of it',
  not has_table_privilege('anon', 'wall_free_reads', 'SELECT')
  and not has_function_privilege('anon', 'wall_free_used(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_free_take(text, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'wall_free_key(text)', 'EXECUTE'));
select fr_ok('the reads themselves stay open to the browser',
  has_function_privilege('anon', 'wall_letters_for(text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'wall_letter(text, uuid)', 'EXECUTE'));

-- ── 6. through the gate, the eight do not apply ──────────────────────────────
select fr_ok('a proved reader gets every letter',
  (select count(*) from jsonb_array_elements(wall_letters_for('fr-token-reader-000000', 'qqfivesubject')->'letters') e
    where e->>'body' is not null) = 10);
select fr_ok('and is told they are through the gate',
  (wall_letters_for('fr-token-reader-000000', 'qqfivesubject')->>'gated')::boolean);
select fr_ok('and is not counted down',
  fr_left('fr-token-reader-000000', 'qqfivesubject') = 8);
select fr_ok('a proved reader spends nothing',
  (select count(*) from wall_free_reads where token_key = wall_free_key('fr-token-reader-000000')) = 0);

-- ── 7. passing the gate erases what it makes irrelevant ─────────────────────
-- The rows exist to ration something. The moment they stop rationing anything
-- they stop existing, so the readership record does not outlive its reason.
select fr_ok('the stranger has eight rows before the door opens',
  (select count(*) from wall_free_reads where token_key = wall_free_key('fr-token-stranger-0001')) = 8);
do $$
declare u uuid;
begin
  insert into celestual_users (instagram_handle, handle_verified_at)
    values ('frlater', now()) returning id into u;
  perform fr_session(u, 'fr-token-stranger-0001');
end $$;
-- The clear happens ON the read, so the read comes first and the count after
-- it. Asserting both halves in one expression counted the rows before the
-- statement that deletes them had run.
select fr_ok('the same browser is through the gate now',
  (wall_letters_for('fr-token-stranger-0001', 'qqfivesubject')->>'gated')::boolean);
select fr_ok('and its eight rows are gone',
  (select count(*) from wall_free_reads where token_key = wall_free_key('fr-token-stranger-0001')) = 0);

-- ── 8. an empty name does not count anybody down ────────────────────────────
select fr_ok('a proved reader on a name with nothing under it is still gated',
  (wall_letters_for('fr-token-reader-000000', 'frnobodywroteto')->>'gated')::boolean);
select fr_ok('and a stranger there spends nothing',
  fr_left('fr-token-stranger-0004', 'frnobodywroteto') = 8
  and (select count(*) from wall_free_reads where token_key = wall_free_key('fr-token-stranger-0004')) = 0);

-- ── 9. a letter that comes down takes its tally rows with it ────────────────
do $$
declare v_id uuid; v_n int;
begin
  select id into v_id from wall_letters where target_handle = 'qqfivesubject' order by created_at desc limit 1;
  select count(*) into v_n from wall_free_reads where letter_id = v_id;
  perform fr_ok('the letter has readers recorded against it', v_n > 0);
  delete from wall_letters where id = v_id;
  select count(*) into v_n from wall_free_reads where letter_id = v_id;
  perform fr_ok('and deleting it takes them', v_n = 0);
end $$;
