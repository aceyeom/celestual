-- ─────────────────────────────────────────────────────────────────────────────
-- test-mutual-kept.sql: exercises 0072_the_mutual_kept.sql.
--
-- A person writes again to somebody they are mutual with: the pair is kept,
-- both sides of it frozen into keepsakes, and the new note is a new note, a
-- ping spent, sealed only when the other side writes again too, and told at
-- a reveal with a match row, a mail and a DM of its own, the first one's news
-- still owed. The other side learns nothing: every answer the server gives
-- them about the pair (the list, the status, a placement, letting go,
-- keeping, the photographs, the week) is what it was, byte for byte. A
-- refusal (the proof, the words, no pings) keeps nothing. Taking a mutual off
-- takes it off the one list only, with the news still on its way to that
-- person, and after it a note is a new note. One person with two linked @s
-- keeps and takes off as one. Erasure, the opt out and the desk's delete take
-- the keepsakes of the handle and about it, and the desk counts a kept pair
-- as the two mutual rows it was. Nights are brought forward by moving the
-- rows' own reveal back. Run through scripts/verify-migrations.sh --test;
-- everything is rolled back at the end.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function mk_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function mk_proof(p_handle text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest('proof-' || p_handle, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

create or replace function mk_row(p_from text, p_to text) returns celestual_entries
language sql as $$
  select * from celestual_entries where from_handle = p_from and to_hash = celestual_hash_handle(p_to)
$$;

create or replace function mk_list(p_handle text) returns jsonb
language sql as $$ select celestual_my_pings(p_handle, 'proof-' || p_handle) $$;

-- the mutual on a list for an @, and the note beside it
create or replace function mk_mutual(p_handle text, p_to text) returns jsonb
language sql as $$
  select x from jsonb_array_elements(mk_list(p_handle)->'pings') x
   where x->>'handle' = p_to and (x->>'mutual')::boolean limit 1
$$;
create or replace function mk_note(p_handle text, p_to text) returns jsonb
language sql as $$
  select x from jsonb_array_elements(mk_list(p_handle)->'pings') x
   where x->>'handle' = p_to and not (x->>'mutual')::boolean limit 1
$$;
create or replace function mk_count(p_handle text, p_to text) returns int
language sql as $$
  select count(*)::int from jsonb_array_elements(mk_list(p_handle)->'pings') x where x->>'handle' = p_to
$$;

create or replace function mk_kept(p_handle text, p_to text) returns int
language sql as $$
  select count(*)::int from celestual_keepsakes
   where handle = p_handle and other_hash = celestual_hash_handle(p_to)
$$;

-- Everything a person can ask the server about a pair, in one object: the
-- list, the status, a placement on it, letting it go, keeping it for next
-- week, the two photographs, putting one on it, and the week's pings three
-- ways. Only ever asked with no note of their own to the other running, since
-- placing and letting go would change one.
create or replace function mk_seen(p_me text, p_them text) returns jsonb
language sql as $$
  select jsonb_build_object(
    'list',    celestual_my_pings(p_me, 'proof-' || p_me),
    'status',  celestual_ping_status(p_me, array[p_them], 'proof-' || p_me),
    'placed',  celestual_submit(p_me, p_them, null, 'proof-' || p_me, null),
    'let_go',  celestual_withdraw(p_me, p_them, 'proof-' || p_me),
    'kept',    celestual_renew(p_me, p_them, 'proof-' || p_me),
    'mine',    celestual_card_photo(p_me, p_them, 'proof-' || p_me, true),
    'theirs',  celestual_card_photo(p_me, p_them, 'proof-' || p_me, false),
    'photo',   celestual_card_photo_put(p_me, p_them, 'proof-' || p_me, null),
    'week',    celestual_ping_allowance(p_me, 'proof-' || p_me),
    'slots',   celestual_slots_for(p_me, 'proof-' || p_me),
    'billing', celestual_billing_status(p_me, 'proof-' || p_me))
$$;

-- bring the night of every sealed pair here to a moment gone by
create or replace function mk_night(p_ago interval) returns int
language plpgsql as $$
begin
  update celestual_entries set reveal_at = now() - p_ago
   where sealed_with is not null and from_handle like 'mk\_%';
  return celestual_reveal_due();
end; $$;

select mk_proof(h) from unnest(array['mk_a', 'mk_b', 'mk_z', 'mk_g1', 'mk_g2', 'mk_t',
                                     'mk_e', 'mk_f', 'mk_o', 'mk_p', 'mk_q', 'mk_r']) h;

-- ── 1. the doors ────────────────────────────────────────────────────────────
select mk_ok('writing again and taking one off are the browser''s, behind the proof',
  has_function_privilege('anon', 'celestual_mutual_again(text, text, text, jsonb, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_mutual_again(text, text, text, jsonb, text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_mutual_forget(text, text, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_mutual_forget(text, text, text)', 'EXECUTE'));
select mk_ok('keeping, the placement under the door and the erasure of keepsakes are nobody''s',
  not has_function_privilege('anon', 'celestual_mutual_keep(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_mutual_keep(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_place(text, text, text, text, jsonb, boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_place(text, text, text, text, jsonb, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_keepsake_forget(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_keepsake_forget(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_billing_forget(text)', 'EXECUTE'));
select mk_ok('the keepsakes are nobody''s to read or write',
  not has_table_privilege('anon', 'celestual_keepsakes', 'SELECT')
  and not has_table_privilege('authenticated', 'celestual_keepsakes', 'SELECT')
  and not has_table_privilege('anon', 'celestual_keepsakes', 'INSERT')
  and not has_table_privilege('authenticated', 'celestual_keepsakes', 'INSERT')
  and (select relrowsecurity from pg_class where oid = 'celestual_keepsakes'::regclass)
  and not exists (select 1 from pg_policy where polrelid = 'celestual_keepsakes'::regclass));
select mk_ok('the doors the browser had, it still has, and the reveal and the desk are still not its',
  has_function_privilege('anon', 'celestual_submit(text, text, text, text, jsonb)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_my_pings(text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_withdraw(text, text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_ping_status(text, text[], text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_card_photo(text, text, text, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_reveal_due()', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_pings(text, text, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_overview()', 'EXECUTE')
  and has_function_privilege('service_role', 'celestual_desk_pings(text, text, integer, integer)', 'EXECUTE'));

-- ── 2. a told pair ──────────────────────────────────────────────────────────
select celestual_submit('mk_a', 'mk_b', 'mk_a@example.com', 'proof-mk_a', '{"words":"the orange bike, every morning"}'::jsonb);
select celestual_submit('mk_b', 'mk_a', 'mk_b@example.com', 'proof-mk_b', '{"words":"i ride slower past the library"}'::jsonb);
-- a photograph under each, from before the photograph went with the retired
-- design (0025), so the keepsake is seen to carry it
update celestual_entries set photo = 'QUJD' where from_handle in ('mk_a', 'mk_b');
select mk_ok('the night tells the pair', mk_night(interval '3 days') = 1);
create temp table mk_m1 as select id from celestual_matches where handle_a = 'mk_a' and handle_b = 'mk_b';
select mk_ok('told to both: one match row, a mail and a DM each',
  (select count(*) from mk_m1) = 1
  and (select count(*) from celestual_mail_outbox
        where kind = 'mutual' and match_id = (select id from mk_m1) and status = 'queued') = 2
  and (select count(*) from celestual_dm_outbox where match_id = (select id from mk_m1) and sent_at is null) = 2);
-- everything the other side can see, and the mutual on this side's list
create temp table mk_b0 as select mk_seen('mk_b', 'mk_a') as s;
create temp table mk_a0 as select mk_mutual('mk_a', 'mk_b') as m;
select mk_ok('a told pair placed again answers as it always did',
  ((select s from mk_b0)->'placed'->>'mutual')::boolean
  and (select s from mk_b0)->'placed'->'match_card'->>'words' = 'the orange bike, every morning'
  and (select s from mk_b0)->'let_go'->>'error' = 'mutual'
  and (select s from mk_b0)->'kept'->>'error' = 'none');
select mk_ok('and a told note''s photograph stays what the other side saw',
  (select s from mk_b0)->'photo'->>'error' = 'told'
  and (select s from mk_b0)->'mine'->>'photo' = 'QUJD'
  and (select s from mk_b0)->'theirs'->>'photo' = 'QUJD'
  and (mk_row('mk_b', 'mk_a')).photo = 'QUJD');

-- ── 3. a refusal keeps nothing ──────────────────────────────────────────────
-- Each call is made on its own and read after, since a statement's own reads
-- see the rows as they stood when it began.
create or replace function mk_untouched() returns boolean
language sql as $$
  select (mk_row('mk_a', 'mk_b')).matched_at is not null
     and (mk_row('mk_b', 'mk_a')).matched_at is not null
     and not exists (select 1 from celestual_keepsakes where handle in ('mk_a', 'mk_b'))
     and (select kept_at from celestual_matches where id = (select id from mk_m1)) is null
$$;
create temp table mk_no as
  select celestual_mutual_again('mk_a', 'mk_b', 'not-the-proof', '{"words":"x"}'::jsonb) as again,
         celestual_mutual_forget('mk_a', 'mk_b', 'not-the-proof') as forget,
         celestual_mutual_forget('mk_a', 'mk_b', null) as bare;
select mk_ok('writing again without the proof is refused, and so is taking it off',
  (select again->>'error' from mk_no) = 'unverified'
  and not ((select again->>'recorded' from mk_no))::boolean
  and (select forget->>'error' from mk_no) = 'unverified'
  and (select bare->>'error' from mk_no) = 'unverified');
select mk_ok('and neither keeps or takes anything', mk_untouched());
create temp table mk_caught as
  select celestual_mutual_again('mk_a', 'mk_b', 'proof-mk_a', '{"words":"text me 510 555 0199 tonight"}'::jsonb) as r;
select mk_ok('words the letters'' list catches are refused, as a placement refuses them',
  (select r->>'error' from mk_caught) = 'card');
select mk_ok('and the pair stays told, on both sides', mk_untouched());
-- the week's free ping spent on somebody else, and nothing bought
select celestual_submit('mk_a', 'mk_z', null, 'proof-mk_a', null);
create temp table mk_refused as
  select celestual_mutual_again('mk_a', 'mk_b', 'proof-mk_a', '{"words":"again"}'::jsonb) as r;
select mk_ok('with no ping to spend it is refused as a placement is, with the week',
  (select r from mk_refused)->>'error' = 'no_pings'
  and not ((select r from mk_refused)->>'recorded')::boolean
  and ((select r from mk_refused)->'allowance'->>'free_left')::int = 0
  and (select r from mk_refused)->'slots' is not null);
select mk_ok('and the pair stays told on both sides, and nothing is spent on it',
  mk_untouched()
  and not exists (select 1 from celestual_ping_spends
                   where handle = 'mk_a' and to_hash = celestual_hash_handle('mk_b') and reveal_at > now()));
select celestual_withdraw('mk_a', 'mk_z', 'proof-mk_a');

-- ── 4. writing again ────────────────────────────────────────────────────────
create temp table mk_again as
  select celestual_mutual_again('mk_a', 'mk_b', 'proof-mk_a',
                                '{"words":"still the orange bike"}'::jsonb, 'mk_a@example.com') as r;
select mk_ok('a new note to a mutual goes out, answered as a note nobody has answered yet',
  ((select r from mk_again)->>'recorded')::boolean
  and not ((select r from mk_again)->>'mutual')::boolean
  and (select r from mk_again)->'match' = 'null'::jsonb
  and (select r from mk_again)->'match_card' = 'null'::jsonb
  and not ((select r from mk_again)->>'reachable')::boolean
  and ((select r from mk_again)->>'expires_at')::timestamptz = celestual_note_ends(now()));
select mk_ok('it spends a ping, as any new note does',
  (select kind from celestual_ping_spends
    where handle = 'mk_a' and to_hash = celestual_hash_handle('mk_b')
      and reveal_at = celestual_note_ends(now())) = 'free'
  and ((select r from mk_again)->'allowance'->>'sent')::int = 1
  and ((select r from mk_again)->'allowance'->>'free_left')::int = 0);
select mk_ok('and it is sealed to nothing, since the other side has not written again',
  (mk_row('mk_a', 'mk_b')).sealed_with is null
  and (mk_row('mk_a', 'mk_b')).matched_at is null
  and (mk_row('mk_a', 'mk_b')).card->>'words' = 'still the orange bike');
select mk_ok('the pair is kept: both told rows out of the notes, a keepsake for each side',
  not exists (select 1 from celestual_entries where from_handle in ('mk_a', 'mk_b') and matched_at is not null)
  and (mk_row('mk_b', 'mk_a')).id is null
  and mk_kept('mk_a', 'mk_b') = 1 and mk_kept('mk_b', 'mk_a') = 1);
select mk_ok('each side keeps its own words and the other''s, and the photographs under them',
  (select card->>'words' = 'the orange bike, every morning' and (card->>'photo')::boolean
      and their_card->>'words' = 'i ride slower past the library'
      and photo = 'QUJD' and their_photo = 'QUJD' and other_handle = 'mk_b'
     from celestual_keepsakes where handle = 'mk_a')
  and (select card->>'words' = 'i ride slower past the library'
      and their_card->>'words' = 'the orange bike, every morning' and other_handle = 'mk_a'
     from celestual_keepsakes where handle = 'mk_b'));
select mk_ok('the match row stays, kept, with the news of it still on its way',
  (select kept_at is not null from celestual_matches where id = (select id from mk_m1))
  and (select count(*) from celestual_mail_outbox
        where kind = 'mutual' and match_id = (select id from mk_m1) and status = 'queued') = 2
  and (select count(*) from celestual_dm_outbox where match_id = (select id from mk_m1) and sent_at is null) = 2);

create temp table mk_b1 as select mk_seen('mk_b', 'mk_a') as s;
select mk_ok('the other side''s list is what it was, in every field',
  (select s->'list' from mk_b1) = (select s->'list' from mk_b0)
  and jsonb_array_length((select s->'list'->'pings' from mk_b1)) = 1
  and ((select s->'list'->'pings'->0->>'mutual' from mk_b1))::boolean);
select mk_ok('and the status of the pair',
  (select s->'status' from mk_b1) = (select s->'status' from mk_b0));
select mk_ok('placing on it answers as a told pair placed again, and writes nothing',
  (select s->'placed' from mk_b1) = (select s->'placed' from mk_b0)
  and (mk_row('mk_b', 'mk_a')).id is null
  and mk_kept('mk_b', 'mk_a') = 1);
select mk_ok('letting it go says mutual, and keeping it says none, as they did',
  (select s->'let_go' from mk_b1) = (select s->'let_go' from mk_b0)
  and (select s->'kept' from mk_b1) = (select s->'kept' from mk_b0));
select mk_ok('the photographs read the same, their own and the other side''s, and one put on it is refused the same',
  (select s->'mine' from mk_b1) = (select s->'mine' from mk_b0)
  and (select s->'theirs' from mk_b1) = (select s->'theirs' from mk_b0)
  and (select s->'photo' from mk_b1) = (select s->'photo' from mk_b0));
select mk_ok('and their week is the same, however it is asked',
  (select s->'week' from mk_b1) = (select s->'week' from mk_b0)
  and (select s->'slots' from mk_b1) = (select s->'slots' from mk_b0)
  and (select s->'billing' from mk_b1) = (select s->'billing' from mk_b0));
select mk_ok('nothing in all of it differs', (select s from mk_b1) = (select s from mk_b0));

select mk_ok('the one who wrote again still has the mutual, just as it was',
  mk_mutual('mk_a', 'mk_b') = (select m from mk_a0));
select mk_ok('and the new note beside it, as a running note',
  mk_count('mk_a', 'mk_b') = 2
  and mk_note('mk_a', 'mk_b')->'card'->>'words' = 'still the orange bike'
  and not (mk_note('mk_a', 'mk_b')->>'lapsed')::boolean
  and mk_note('mk_a', 'mk_b')->'their_card' = 'null'::jsonb
  and mk_note('mk_a', 'mk_b')->>'revealed_at' is null);
select mk_ok('its status is the new note, and it says reachable, which a told pair is',
  not (celestual_ping_status('mk_a', array['mk_b'], 'proof-mk_a')->'pings'->0->>'mutual')::boolean
  and (celestual_ping_status('mk_a', array['mk_b'], 'proof-mk_a')->'pings'->0->>'reachable')::boolean);

-- ── 5. a new note let go ────────────────────────────────────────────────────
create temp table mk_gone as select celestual_withdraw('mk_a', 'mk_b', 'proof-mk_a') as r;
select mk_ok('the new note can be let go, and gives its ping back',
  ((select r from mk_gone)->>'withdrawn')::boolean
  and not exists (select 1 from celestual_ping_spends
                   where handle = 'mk_a' and to_hash = celestual_hash_handle('mk_b') and reveal_at > now()));
select mk_ok('and takes nothing of the mutual before it: the kept row, its news, the keepsakes',
  exists (select 1 from celestual_matches where id = (select id from mk_m1))
  and (select count(*) from celestual_mail_outbox
        where match_id = (select id from mk_m1) and status = 'queued') = 2
  and (select count(*) from celestual_dm_outbox where match_id = (select id from mk_m1)) = 2
  and mk_mutual('mk_a', 'mk_b') = (select m from mk_a0)
  and mk_note('mk_a', 'mk_b') is null
  and mk_kept('mk_b', 'mk_a') = 1);
select mk_ok('with no note left, letting go says mutual, as it would of a told pair',
  celestual_withdraw('mk_a', 'mk_b', 'proof-mk_a')->>'error' = 'mutual');
create temp table mk_plain as
  select celestual_submit('mk_a', 'mk_b', null, 'proof-mk_a', '{"words":"not this way"}'::jsonb) as r;
select mk_ok('and an ordinary placement answers as the told pair, spending nothing',
  ((select r from mk_plain)->>'mutual')::boolean
  and (select r from mk_plain)->'match_card'->>'words' = 'i ride slower past the library'
  and (mk_row('mk_a', 'mk_b')).id is null
  and not exists (select 1 from celestual_ping_spends
                   where handle = 'mk_a' and to_hash = celestual_hash_handle('mk_b') and reveal_at > now()));

-- ── 6. both write again, and it is mutual again ─────────────────────────────
select celestual_mutual_again('mk_a', 'mk_b', 'proof-mk_a', '{"words":"still the orange bike"}'::jsonb, 'mk_a@example.com');
select mk_ok('a second writing again finds the pair already kept, and keeps nothing more',
  mk_kept('mk_a', 'mk_b') = 1 and mk_kept('mk_b', 'mk_a') = 1
  and (select count(*) from celestual_matches where handle_a = 'mk_a' and handle_b = 'mk_b') = 1);
create temp table mk_bagain as
  select celestual_mutual_again('mk_b', 'mk_a', 'proof-mk_b',
                                '{"words":"i will ride past at nine"}'::jsonb, 'mk_b@example.com') as r;
select mk_ok('the other side writes again too, and it answers as a note nobody answered',
  ((select r from mk_bagain)->>'recorded')::boolean
  and not ((select r from mk_bagain)->>'mutual')::boolean
  and (select r from mk_bagain)->'match_card' = 'null'::jsonb
  and ((select r from mk_bagain)->'allowance'->>'sent')::int = 1);
select mk_ok('the two new notes are sealed to each other for the night',
  (mk_row('mk_a', 'mk_b')).sealed_with = (mk_row('mk_b', 'mk_a')).id
  and (mk_row('mk_b', 'mk_a')).sealed_with = (mk_row('mk_a', 'mk_b')).id);
select mk_ok('and until it neither list says anything new about the other',
  mk_mutual('mk_a', 'mk_b') = (select m from mk_a0)
  and mk_note('mk_a', 'mk_b')->'their_card' = 'null'::jsonb
  and not (mk_note('mk_a', 'mk_b')->>'lapsed')::boolean
  and mk_mutual('mk_b', 'mk_a') = (select s->'list'->'pings'->0 from mk_b0)
  and mk_note('mk_b', 'mk_a')->'their_card' = 'null'::jsonb
  and mk_note('mk_b', 'mk_a')->'card'->>'words' = 'i will ride past at nine');

select mk_ok('the night tells it again', mk_night(interval '1 second') = 1);
select mk_ok('each side lists one mutual, the one just told, and the new words both ways',
  mk_count('mk_a', 'mk_b') = 1 and mk_count('mk_b', 'mk_a') = 1
  and mk_mutual('mk_a', 'mk_b')->'card'->>'words' = 'still the orange bike'
  and mk_mutual('mk_a', 'mk_b')->'their_card'->>'words' = 'i will ride past at nine'
  and mk_mutual('mk_b', 'mk_a')->'card'->>'words' = 'i will ride past at nine'
  and mk_mutual('mk_b', 'mk_a')->'their_card'->>'words' = 'still the orange bike'
  and (mk_mutual('mk_a', 'mk_b')->>'revealed_at')::timestamptz
      > ((select m from mk_a0)->>'revealed_at')::timestamptz);
select mk_ok('the first one is still kept, underneath, for both',
  mk_kept('mk_a', 'mk_b') = 1 and mk_kept('mk_b', 'mk_a') = 1);
select mk_ok('the second one is a match row of its own, and the first''s stands, kept',
  (select count(*) from celestual_matches where handle_a = 'mk_a' and handle_b = 'mk_b') = 2
  and (select count(*) from celestual_matches
        where handle_a = 'mk_a' and handle_b = 'mk_b' and kept_at is null) = 1);
create temp table mk_m2 as
  select id from celestual_matches where handle_a = 'mk_a' and handle_b = 'mk_b' and kept_at is null;
select mk_ok('it is told to both exactly as the first was: a mail and a DM each, a note waiting',
  (select count(*) from celestual_mail_outbox
        where kind = 'mutual' and match_id = (select id from mk_m2) and status = 'queued') = 2
  and (select count(*) from celestual_mail_outbox
        where kind = 'mutual' and match_id = (select id from mk_m2) and handle = 'mk_a' and to_email = 'mk_a@example.com') = 1
  and (select count(*) from celestual_dm_outbox where match_id = (select id from mk_m2) and sent_at is null) = 2
  and (select bool_and(has_card) from celestual_dm_outbox where match_id = (select id from mk_m2)));
select mk_ok('while the first one''s news is still owed, every row of it',
  (select count(*) from celestual_mail_outbox where match_id = (select id from mk_m1) and status = 'queued') = 2
  and (select count(*) from celestual_dm_outbox where match_id = (select id from mk_m1) and sent_at is null) = 2);
select mk_ok('a second night does nothing more', mk_night(interval '1 second') = 0);

-- ── 7. taking it off ────────────────────────────────────────────────────────
create temp table mk_b3 as select mk_seen('mk_b', 'mk_a') as s;
select mk_ok('taking the mutual off says yes', (celestual_mutual_forget('mk_a', 'mk_b', 'proof-mk_a')->>'ok')::boolean);
select mk_ok('it is gone from the list of the one who took it off, every night of it',
  mk_mutual('mk_a', 'mk_b') is null
  and mk_count('mk_a', 'mk_b') = 0
  and mk_kept('mk_a', 'mk_b') = 0
  and (mk_row('mk_a', 'mk_b')).id is null);
select mk_ok('the other side keeps both of theirs, and every answer they get is what it was',
  mk_kept('mk_b', 'mk_a') = 2
  and mk_seen('mk_b', 'mk_a') = (select s from mk_b3));
select mk_ok('the news still on its way to the one who took it off does not go, and the other side''s does',
  not exists (select 1 from celestual_dm_outbox
               where handle = 'mk_a' and sent_at is null
                 and match_id in ((select id from mk_m1), (select id from mk_m2)))
  and (select bool_and(status = 'skipped') from celestual_mail_outbox
        where handle = 'mk_a' and match_id in ((select id from mk_m1), (select id from mk_m2)))
  and (select count(*) from celestual_mail_outbox
        where handle = 'mk_b' and status = 'queued'
          and match_id in ((select id from mk_m1), (select id from mk_m2))) = 2
  and (select count(*) from celestual_dm_outbox
        where handle = 'mk_b' and sent_at is null
          and match_id in ((select id from mk_m1), (select id from mk_m2))) = 2);
select mk_ok('the match rows stand, both kept now',
  (select count(*) from celestual_matches
    where handle_a = 'mk_a' and handle_b = 'mk_b' and kept_at is not null) = 2);
select mk_ok('taking it off again finds nothing to take',
  celestual_mutual_forget('mk_a', 'mk_b', 'proof-mk_a')->>'error' = 'none');

-- ── 8. after it, a note is a new note ───────────────────────────────────────
create temp table mk_fresh as
  select celestual_submit('mk_a', 'mk_b', null, 'proof-mk_a', '{"words":"hello, from the start"}'::jsonb) as r;
select mk_ok('an ordinary note to them is a new note: nobody has answered it, and it spends',
  ((select r from mk_fresh)->>'recorded')::boolean
  and not ((select r from mk_fresh)->>'mutual')::boolean
  and exists (select 1 from celestual_ping_spends
               where handle = 'mk_a' and to_hash = celestual_hash_handle('mk_b')
                 and reveal_at = celestual_note_ends(now()))
  and (mk_row('mk_a', 'mk_b')).sealed_with is null
  and (mk_row('mk_a', 'mk_b')).matched_at is null);
select mk_ok('and the other side, who kept theirs, still sees only the mutual',
  mk_seen('mk_b', 'mk_a') = (select s from mk_b3));
create temp table mk_bthird as select celestual_mutual_again('mk_b', 'mk_a', 'proof-mk_b', null) as r;
select mk_ok('until they write again, when the two are sealed like any two notes',
  not ((select r from mk_bthird)->>'mutual')::boolean
  and (mk_row('mk_a', 'mk_b')).sealed_with = (mk_row('mk_b', 'mk_a')).id);
select mk_ok('and told at their night', mk_night(interval '1 second') = 1);
select mk_ok('on a match row of their own, a third',
  (select count(*) from celestual_matches where handle_a = 'mk_a' and handle_b = 'mk_b') = 3
  and (select count(*) from celestual_matches
        where handle_a = 'mk_a' and handle_b = 'mk_b' and kept_at is null) = 1
  and mk_mutual('mk_a', 'mk_b')->'card'->>'words' = 'hello, from the start'
  and mk_mutual('mk_a', 'mk_b')->'their_card' = 'null'::jsonb
  and mk_count('mk_a', 'mk_b') = 1 and mk_count('mk_b', 'mk_a') = 1);

-- ── 9. one person, two handles ──────────────────────────────────────────────
-- Linked as one person (celestual_handle_links, from before 0036 took the
-- linking away). The pair is told on one @ and written again from the other.
with g as (select gen_random_uuid() as id)
insert into celestual_handle_links (handle, group_id)
select h, g.id from g, unnest(array['mk_g1', 'mk_g2']) h;
select celestual_submit('mk_g1', 'mk_t', null, 'proof-mk_g1', '{"words":"the green umbrella"}'::jsonb);
select celestual_submit('mk_t', 'mk_g1', null, 'proof-mk_t', '{"words":"the tall one by the door"}'::jsonb);
select mk_ok('the linked pair is told', mk_night(interval '3 days') = 1);
create temp table mk_t0 as select mk_seen('mk_t', 'mk_g1') as s;
create temp table mk_g as
  select celestual_mutual_again('mk_g2', 'mk_t', 'proof-mk_g2', '{"words":"from my other account"}'::jsonb) as r;
select mk_ok('writing again from the other @ keeps the pair the first was told on',
  ((select r from mk_g)->>'recorded')::boolean
  and not exists (select 1 from celestual_entries
                   where matched_at is not null and from_handle in ('mk_g1', 'mk_g2', 'mk_t'))
  and mk_kept('mk_g1', 'mk_t') = 1 and mk_kept('mk_t', 'mk_g1') = 1
  and (mk_row('mk_g2', 'mk_t')).card->>'words' = 'from my other account');
select mk_ok('the other side sees nothing', mk_seen('mk_t', 'mk_g1') = (select s from mk_t0));
select mk_ok('and both linked @s list the one mutual',
  mk_mutual('mk_g1', 'mk_t') is not null
  and mk_mutual('mk_g1', 'mk_t') = mk_mutual('mk_g2', 'mk_t')
  and mk_mutual('mk_g2', 'mk_t')->'their_card'->>'words' = 'the tall one by the door');
create temp table mk_goff as select celestual_mutual_forget('mk_g2', 'mk_t', 'proof-mk_g2') as r;
select mk_ok('taking it off from either @ takes it off the person, and leaves the other side''s',
  ((select r from mk_goff)->>'ok')::boolean
  and mk_mutual('mk_g1', 'mk_t') is null and mk_mutual('mk_g2', 'mk_t') is null
  and mk_kept('mk_g1', 'mk_t') = 0
  and mk_kept('mk_t', 'mk_g1') = 1
  and mk_note('mk_g2', 'mk_t') is not null);

-- ── 10. erasure ─────────────────────────────────────────────────────────────
select celestual_submit('mk_e', 'mk_f', null, 'proof-mk_e', '{"words":"e, to f"}'::jsonb);
select celestual_submit('mk_f', 'mk_e', null, 'proof-mk_f', '{"words":"f, to e"}'::jsonb);
select celestual_submit('mk_o', 'mk_p', null, 'proof-mk_o', '{"words":"o, to p"}'::jsonb);
select celestual_submit('mk_p', 'mk_o', null, 'proof-mk_p', '{"words":"p, to o"}'::jsonb);
select celestual_submit('mk_q', 'mk_r', null, 'proof-mk_q', '{"words":"q, to r"}'::jsonb);
select celestual_submit('mk_r', 'mk_q', null, 'proof-mk_r', '{"words":"r, to q"}'::jsonb);
select mk_ok('three more pairs are told', mk_night(interval '3 days') = 3);
select celestual_mutual_again('mk_e', 'mk_f', 'proof-mk_e', null);
select celestual_mutual_again('mk_o', 'mk_p', 'proof-mk_o', null);
select celestual_mutual_again('mk_r', 'mk_q', 'proof-mk_r', null);
select mk_ok('before it, each is kept, a keepsake a side',
  mk_kept('mk_e', 'mk_f') = 1 and mk_kept('mk_f', 'mk_e') = 1
  and mk_kept('mk_o', 'mk_p') = 1 and mk_kept('mk_p', 'mk_o') = 1
  and mk_kept('mk_q', 'mk_r') = 1 and mk_kept('mk_r', 'mk_q') = 1);
select celestual_erase_account('mk_f', 'proof-mk_f');
select mk_ok('erasing an account takes its keepsakes and every keepsake about it, its words with them',
  not exists (select 1 from celestual_keepsakes
               where handle = 'mk_f' or other_hash = celestual_hash_handle('mk_f') or other_handle = 'mk_f')
  and not exists (select 1 from celestual_keepsakes where their_card->>'words' = 'f, to e')
  and mk_mutual('mk_e', 'mk_f') is null
  and mk_note('mk_e', 'mk_f') is null);
select celestual_suppress('mk_o', 'proof-mk_o');
select mk_ok('the opt out takes them the same way',
  not exists (select 1 from celestual_keepsakes
               where handle = 'mk_o' or other_hash = celestual_hash_handle('mk_o') or other_handle = 'mk_o')
  and not exists (select 1 from celestual_keepsakes where their_card->>'words' = 'o, to p')
  and mk_mutual('mk_p', 'mk_o') is null);
select celestual_admin_delete_user('mk_q');
select mk_ok('and so does the desk''s delete',
  not exists (select 1 from celestual_keepsakes
               where handle = 'mk_q' or other_hash = celestual_hash_handle('mk_q') or other_handle = 'mk_q')
  and mk_mutual('mk_r', 'mk_q') is null);
select mk_ok('nobody else''s keepsakes went with them',
  mk_kept('mk_b', 'mk_a') = 2 and mk_kept('mk_t', 'mk_g1') = 1);

-- ── 11. the desk ────────────────────────────────────────────────────────────
select mk_ok('the desk counts a kept pair as the two mutual rows it was',
  (celestual_desk_pings()#>>'{counts,mutual}')::int
    = (select count(*) from celestual_entries where matched_at is not null)
      + (select count(*) from celestual_keepsakes)
  and (celestual_desk_overview()#>>'{counts,pings_mutual}')::int
    = (select count(*) from celestual_entries where matched_at is not null)
      + (select count(*) from celestual_keepsakes));
select mk_ok('lists a keepsake as a mutual that is kept, naming both sides',
  (select count(*) from jsonb_array_elements(celestual_desk_pings('mutual', 'mk_b')->'rows') r
    where r->>'from_handle' = 'mk_b' and (r->>'kept')::boolean and r->>'matched_handle' = 'mk_a'
      and r->>'state' = 'mutual') = 2
  and (celestual_desk_pings('mutual', 'mk_b')->>'total')::int
      = jsonb_array_length(celestual_desk_pings('mutual', 'mk_b')->'rows'));
select mk_ok('and counts every pair told, a pair told twice as two',
  (celestual_desk_pings()#>>'{counts,pairs}')::int = (select count(*) from celestual_matches)
  and (celestual_desk_overview()#>>'{counts,pairs}')::int = (select count(*) from celestual_matches));

rollback;
