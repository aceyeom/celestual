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
-- person, and after it a note is a new note; it takes only the nights the
-- person could have been shown, and nothing at all when it answers 'none'.
-- One person with two linked @s keeps and takes off as one, and placing from
-- the @ that was not told, or to the other side's other @, answers and lists
-- the same whether or not the other side wrote again. A person's own two
-- photographs on one @ are read apart. Erasure, the opt out and the desk's
-- delete take the keepsakes of the handle and about it, and a linked @'s
-- words out of a keepsake that names its twin. A keeping that would lose a
-- told row raises instead. The desk counts a kept pair as the two rows it
-- was, in every figure and series. Nights are brought forward by moving the
-- rows' own reveal back, and a world before and after is compared across a
-- savepoint, the first world's answers held in psql variables. Run through
-- scripts/verify-migrations.sh --test; everything is rolled back at the end.
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
                                     'mk_e', 'mk_f', 'mk_o', 'mk_p', 'mk_q', 'mk_r',
                                     'mk_l1', 'mk_l2', 'mk_u', 'mk_v', 'mk_h1', 'mk_h2', 'mk_w', 'mk_z2',
                                     'mk_i1', 'mk_i2', 'mk_x', 'mk_k', 'mk_n1', 'mk_n2',
                                     'mk_s1', 'mk_s2']) h;

-- ── 1. the doors ────────────────────────────────────────────────────────────
select mk_ok('writing again and taking one off are the browser''s, behind the proof',
  has_function_privilege('anon', 'celestual_mutual_again(text, text, text, jsonb, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_mutual_again(text, text, text, jsonb, text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_mutual_forget(text, text, text, timestamptz)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_mutual_forget(text, text, text, timestamptz)', 'EXECUTE'));
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
  and has_function_privilege('anon', 'celestual_card_photo(text, text, text, boolean, boolean)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_reveal_due()', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_pings(text, text, integer, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_overview()', 'EXECUTE')
  and has_function_privilege('service_role', 'celestual_desk_pings(text, text, integer, integer)', 'EXECUTE'));
select mk_ok('the desk''s two series are still the service role''s alone, and what they wrap is nobody else''s',
  has_function_privilege('service_role', 'celestual_desk_growth(integer, text)', 'EXECUTE')
  and has_function_privilege('service_role', 'celestual_admin_overview()', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_growth(integer, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_admin_overview()', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_desk_growth_0039(integer, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_admin_overview_0034()', 'EXECUTE'));
select mk_ok('there is one photograph read, so a call naming four arguments finds it',
  (select count(*) from pg_proc where proname = 'celestual_card_photo') = 1
  and (select count(*) from pg_proc where proname = 'celestual_mutual_forget') = 1);

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
select mk_ok('each keepsake says whose @ the other side''s words were read off',
  (select their_handle from celestual_keepsakes where handle = 'mk_a') = 'mk_b'
  and (select their_handle from celestual_keepsakes where handle = 'mk_b') = 'mk_a');

-- their own two photographs on the one @: the mutual's and the new note's
select celestual_card_photo_put('mk_a', 'mk_b', 'proof-mk_a', 'WFla');
select mk_ok('a photograph goes onto the new note, and the mutual''s stays what was told',
  celestual_card_photo('mk_a', 'mk_b', 'proof-mk_a', true, false)->>'photo' = 'WFla'
  and celestual_card_photo('mk_a', 'mk_b', 'proof-mk_a', true, true)->>'photo' = 'QUJD'
  and (mk_mutual('mk_a', 'mk_b')->'card'->>'photo')::boolean
  and (mk_note('mk_a', 'mk_b')->'card'->>'photo')::boolean);
select mk_ok('asked for neither, it reads the note there is, as it always read the row',
  celestual_card_photo('mk_a', 'mk_b', 'proof-mk_a', true)->>'photo' = 'WFla'
  and celestual_card_photo('mk_a', 'mk_b', 'proof-mk_a', false)->>'photo' = 'QUJD'
  and celestual_card_photo('mk_a', 'mk_b', 'proof-mk_a', false, false)->>'photo' = 'QUJD');
select celestual_card_photo_put('mk_a', 'mk_b', 'proof-mk_a', null);
select mk_ok('and a note with none reads none, never the mutual''s',
  celestual_card_photo('mk_a', 'mk_b', 'proof-mk_a', true, false)->'photo' = 'null'::jsonb
  and celestual_card_photo('mk_a', 'mk_b', 'proof-mk_a', true, true)->>'photo' = 'QUJD');

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

-- ── 12. nothing to take off changes nothing ─────────────────────────────────
-- A half told before the weekly reveal (0069), with no half of the other
-- side's: the other side has never been shown a mutual, and taking one off
-- answers 'none' and neither keeps the pair nor marks its match row.
insert into celestual_entries (from_handle, to_hash, to_handle, card, expires_at, matched_at, matched_handle)
values ('mk_l1', celestual_hash_handle('mk_l2'), 'mk_l2', '{"words":"from before the reveal"}'::jsonb,
        now() - interval '40 days', now() - interval '50 days', 'mk_l2');
insert into celestual_matches (handle_a, handle_b) values ('mk_l1', 'mk_l2');
create temp table mk_lnone as select celestual_mutual_forget('mk_l2', 'mk_l1', 'proof-mk_l2') as r;
select mk_ok('taking off a mutual never shown answers none',
  (select r->>'error' from mk_lnone) = 'none');
select mk_ok('and keeps nothing: the told half is where it was, and its match row is not kept',
  (mk_row('mk_l1', 'mk_l2')).matched_at is not null
  and not exists (select 1 from celestual_keepsakes where handle in ('mk_l1', 'mk_l2'))
  and (select kept_at from celestual_matches where handle_a = 'mk_l1' and handle_b = 'mk_l2') is null);
create temp table mk_lsent as select celestual_submit('mk_l2', 'mk_l1', null, 'proof-mk_l2', null) as r;
select mk_ok('so a note from the other side is told at once, as it was before',
  ((select r from mk_lsent)->>'mutual')::boolean);

-- ── 13. only the nights shown ───────────────────────────────────────────────
-- A pair told once, and both write again, sealed for a night that has come
-- and that nothing has run yet. Taking the first mutual off must not take the
-- second, which the person has never seen and the other side is about to be
-- told of.
select celestual_submit('mk_u', 'mk_v', 'mk_u@example.com', 'proof-mk_u', '{"words":"u, the first time"}'::jsonb);
select celestual_submit('mk_v', 'mk_u', 'mk_v@example.com', 'proof-mk_v', '{"words":"v, the first time"}'::jsonb);
select mk_ok('the first night tells it', mk_night(interval '14 days') = 1);
-- the reveal that told it ran on its night, as it does, long before anybody
-- could write again
update celestual_matches set matched_at = now() - interval '14 days'
 where handle_a = 'mk_u' and handle_b = 'mk_v';
create temp table mk_un1 as select id from celestual_matches where handle_a = 'mk_u' and handle_b = 'mk_v';
create temp table mk_ushown as select mk_mutual('mk_u', 'mk_v') as m;
select celestual_mutual_again('mk_u', 'mk_v', 'proof-mk_u', '{"words":"u, again"}'::jsonb, 'mk_u@example.com');
select celestual_mutual_again('mk_v', 'mk_u', 'proof-mk_v', '{"words":"v, again"}'::jsonb, 'mk_v@example.com');
select mk_ok('both wrote again, sealed for the night',
  (mk_row('mk_u', 'mk_v')).sealed_with = (mk_row('mk_v', 'mk_u')).id);
update celestual_entries set reveal_at = now() - interval '1 second'
 where sealed_with is not null and from_handle in ('mk_u', 'mk_v');

create or replace function mk_only_first(p_r jsonb) returns boolean
language sql as $$
  select (p_r->>'ok')::boolean
     and mk_count('mk_u', 'mk_v') = 1
     and mk_mutual('mk_u', 'mk_v')->'their_card'->>'words' = 'v, again'
     and (mk_mutual('mk_u', 'mk_v')->>'revealed_at')::timestamptz
         > ((select m from mk_ushown)->>'revealed_at')::timestamptz
     and mk_kept('mk_u', 'mk_v') = 1 and mk_kept('mk_v', 'mk_u') = 2
$$;
-- the news of the second: the match row that is not kept, as the reveal wrote it
create or replace function mk_second_news(p_handle text) returns boolean
language sql as $$
  select (select count(*) from celestual_mail_outbox o join celestual_matches m on m.id = o.match_id
           where m.handle_a = 'mk_u' and m.handle_b = 'mk_v' and m.id <> (select id from mk_un1)
             and o.handle = p_handle and o.status = 'queued') = 1
     and (select count(*) from celestual_dm_outbox d join celestual_matches m on m.id = d.match_id
           where m.handle_a = 'mk_u' and m.handle_b = 'mk_v' and m.id <> (select id from mk_un1)
             and d.handle = p_handle and d.sent_at is null) = 1
$$;
create or replace function mk_first_news_gone() returns boolean
language sql as $$
  select not exists (select 1 from celestual_mail_outbox
                      where match_id = (select id from mk_un1) and handle = 'mk_u' and status = 'queued')
     and not exists (select 1 from celestual_dm_outbox
                      where match_id = (select id from mk_un1) and handle = 'mk_u' and sent_at is null)
     and (select count(*) from celestual_mail_outbox
           where match_id = (select id from mk_un1) and handle = 'mk_v' and status = 'queued') = 1
$$;

savepoint mk_s13;
create temp table mk_off as
  select celestual_mutual_forget('mk_u', 'mk_v', 'proof-mk_u',
                                 ((select m from mk_ushown)->>'revealed_at')::timestamptz) as r;
select mk_ok('the night come in the same call: the mutual the list drew goes, and the one told just now stays',
  mk_only_first((select r from mk_off)));
select mk_ok('with its news still on its way to both, while the first one''s to this person does not go',
  mk_second_news('mk_u') and mk_second_news('mk_v') and mk_first_news_gone());
rollback to savepoint mk_s13;
create temp table mk_off as select celestual_mutual_forget('mk_u', 'mk_v', 'proof-mk_u') as r;
select mk_ok('and the same with no night sent: what was told before the call goes, nothing after',
  mk_only_first((select r from mk_off)) and mk_second_news('mk_u') and mk_first_news_gone());
rollback to savepoint mk_s13;
select mk_ok('told by another door first, and the list read before it', mk_night(interval '1 second') = 1);
create temp table mk_off as
  select celestual_mutual_forget('mk_u', 'mk_v', 'proof-mk_u',
                                 ((select m from mk_ushown)->>'revealed_at')::timestamptz) as r;
select mk_ok('the list''s night bounds it: the second, told since, stays, with its news',
  mk_only_first((select r from mk_off)) and mk_second_news('mk_u') and mk_first_news_gone());
create temp table mk_off2 as select celestual_mutual_forget('mk_u', 'mk_v', 'proof-mk_u') as r;
select mk_ok('and once that list is drawn, it goes too',
  ((select r from mk_off2)->>'ok')::boolean
  and mk_count('mk_u', 'mk_v') = 0 and mk_kept('mk_u', 'mk_v') = 0 and mk_kept('mk_v', 'mk_u') = 2);

-- ── 14. two handles, and the other side writes again ────────────────────────
-- h1 and h2 are one person (linked before 0036), told on h1. While it was
-- told, a note from h2 was told at once: a ping spent and given back, and a
-- mutual more on the list. The other side writing again, or taking theirs
-- off, must not change a word of what h2 is answered, or of the list.
with g as (select gen_random_uuid() as id)
insert into celestual_handle_links (handle, group_id)
select h, g.id from g, unnest(array['mk_h1', 'mk_h2']) h;
select celestual_submit('mk_h1', 'mk_w', null, 'proof-mk_h1', '{"words":"h1, by the fountain"}'::jsonb);
select celestual_submit('mk_w', 'mk_h1', null, 'proof-mk_w', '{"words":"w, the blue coat"}'::jsonb);
select mk_ok('the pair is told on the one @', mk_night(interval '3 days') = 1);

savepoint mk_s14;
select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', '{"words":"h2, the other account"}'::jsonb)::text
    as mk_h2_placed \gset
select mk_list('mk_h1')::text as mk_h2_list \gset
rollback to savepoint mk_s14;
select celestual_submit('mk_h1', 'mk_z2', null, 'proof-mk_h1', null);
select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', '{"words":"h2, the other account"}'::jsonb)::text
    as mk_h2_spent \gset
rollback to savepoint mk_s14;
select mk_ok('while it is told, the other @ is told at once, and with none left it is refused',
  (:'mk_h2_placed'::jsonb->>'mutual')::boolean
  and :'mk_h2_placed'::jsonb->'match_card'->>'words' = 'w, the blue coat'
  and jsonb_array_length(:'mk_h2_list'::jsonb->'pings') = 2
  and :'mk_h2_spent'::jsonb->>'error' = 'no_pings');

select celestual_mutual_again('mk_w', 'mk_h1', 'proof-mk_w', '{"words":"w, again"}'::jsonb);
savepoint mk_s14b;
create temp table mk_h2k as
  select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', '{"words":"h2, the other account"}'::jsonb) as r;
select mk_ok('the other side wrote again: the other @ is answered exactly as it was',
  (select r from mk_h2k) = :'mk_h2_placed'::jsonb);
select mk_ok('and the list grows by the same mutual, in every field',
  mk_list('mk_h1') = :'mk_h2_list'::jsonb
  and mk_kept('mk_h2', 'mk_w') = 1
  and (mk_row('mk_h2', 'mk_w')).id is null);
select mk_ok('the ping it spent went back, as it did',
  not exists (select 1 from celestual_ping_spends
               where handle = 'mk_h2' and to_hash = celestual_hash_handle('mk_w') and reveal_at > now()));
create temp table mk_h2again as select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', null) as r;
select mk_ok('placed on again, it is the told pair it became',
  ((select r from mk_h2again)->>'mutual')::boolean
  and (mk_row('mk_h2', 'mk_w')).id is null);
rollback to savepoint mk_s14b;
select celestual_submit('mk_h1', 'mk_z2', null, 'proof-mk_h1', null);
create temp table mk_h2none as
  select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', '{"words":"h2, the other account"}'::jsonb) as r;
select mk_ok('and with no ping left it is refused the same way, and nothing is kept',
  (select r from mk_h2none) = :'mk_h2_spent'::jsonb
  and mk_kept('mk_h2', 'mk_w') = 0 and (mk_row('mk_h2', 'mk_w')).id is null);
rollback to savepoint mk_s14;
select celestual_mutual_forget('mk_w', 'mk_h1', 'proof-mk_w');
create temp table mk_h2off as
  select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', '{"words":"h2, the other account"}'::jsonb) as r;
select mk_ok('the other side took theirs off instead: the same answer, the same list',
  (select r from mk_h2off) = :'mk_h2_placed'::jsonb
  and mk_list('mk_h1') = :'mk_h2_list'::jsonb);
rollback to savepoint mk_s14;

-- a note of h2's from before the pair was told, lapsed since: sent again
-- while the pair is told it is told at once, and the same once it is kept
insert into celestual_entries (from_handle, to_hash, to_handle, card, expires_at, created_at)
values ('mk_h2', celestual_hash_handle('mk_w'), 'mk_w', '{"words":"h2, a while ago"}'::jsonb,
        now() - interval '2 days', now() - interval '9 days');
savepoint mk_s14c;
select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', null)::text as mk_old_placed \gset
select mk_list('mk_h1')::text as mk_old_list \gset
rollback to savepoint mk_s14c;
select celestual_mutual_again('mk_w', 'mk_h1', 'proof-mk_w', '{"words":"w, again"}'::jsonb);
savepoint mk_s14d;
create temp table mk_oldk as select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', null) as r;
select mk_ok('a note from before the keeping, sent again, is told at once as it was, and listed the same',
  (:'mk_old_placed'::jsonb->>'mutual')::boolean
  and (select r from mk_oldk) = :'mk_old_placed'::jsonb
  and mk_list('mk_h1') = :'mk_old_list'::jsonb
  and (mk_row('mk_h2', 'mk_w')).id is null
  and mk_kept('mk_h2', 'mk_w') = 1);
rollback to savepoint mk_s14d;
select celestual_mutual_again('mk_h2', 'mk_w', 'proof-mk_h2', '{"words":"h2, new"}'::jsonb);
select mk_ok('written again from that @, the old note goes and a new one takes its place',
  (mk_row('mk_h2', 'mk_w')).created_at = now()
  and (mk_row('mk_h2', 'mk_w')).card->>'words' = 'h2, new'
  and (mk_row('mk_h2', 'mk_w')).sealed_with = (mk_row('mk_w', 'mk_h1')).id);
create temp table mk_newer as
  select celestual_submit('mk_h2', 'mk_w', null, 'proof-mk_h2', '{"words":"h2, newer"}'::jsonb) as r;
select mk_ok('and placed on after, it is a note like any other, never the old night told at once',
  not ((select r from mk_newer)->>'mutual')::boolean
  and (mk_row('mk_h2', 'mk_w')).card->>'words' = 'h2, newer'
  and (mk_row('mk_h2', 'mk_w')).sealed_with = (mk_row('mk_w', 'mk_h1')).id
  and mk_kept('mk_h2', 'mk_w') = 0);
-- the two new notes are told at the night, and nothing is left sealed here
select mk_ok('and told at their night', mk_night(interval '1 second') = 1);

-- the other side's other @: x was told with i1, and places to i2
with g as (select gen_random_uuid() as id)
insert into celestual_handle_links (handle, group_id)
select h, g.id from g, unnest(array['mk_i1', 'mk_i2']) h;
select celestual_submit('mk_x', 'mk_i1', null, 'proof-mk_x', '{"words":"x, the red scarf"}'::jsonb);
select celestual_submit('mk_i1', 'mk_x', null, 'proof-mk_i1', '{"words":"i1, the corner table"}'::jsonb);
select mk_ok('told', mk_night(interval '3 days') = 1);
savepoint mk_s14e;
select celestual_submit('mk_x', 'mk_i2', null, 'proof-mk_x', '{"words":"x, to the other"}'::jsonb)::text
    as mk_x_placed \gset
select mk_list('mk_x')::text as mk_x_list \gset
rollback to savepoint mk_s14e;
select celestual_mutual_again('mk_i1', 'mk_x', 'proof-mk_i1', '{"words":"i1, again"}'::jsonb);
create temp table mk_xk as
  select celestual_submit('mk_x', 'mk_i2', null, 'proof-mk_x', '{"words":"x, to the other"}'::jsonb) as r;
select mk_ok('placing to the other side''s other @ answers and lists the same after they wrote again',
  (:'mk_x_placed'::jsonb->>'mutual')::boolean
  and (select r from mk_xk) = :'mk_x_placed'::jsonb
  and mk_list('mk_x') = :'mk_x_list'::jsonb
  and jsonb_array_length(mk_list('mk_x')->'pings') = 2);

-- ── 15. a linked @'s words, erased ──────────────────────────────────────────
-- k noted n2, and n1 (the same person) noted k: told, and the words k was
-- told were n1's. k writes again, so they are in k's keepsake, which names
-- n2. Erasing n1 takes them out of it, as it took them off k's list when the
-- list read them off n1's row.
with g as (select gen_random_uuid() as id)
insert into celestual_handle_links (handle, group_id)
select h, g.id from g, unnest(array['mk_n1', 'mk_n2']) h;
select celestual_submit('mk_k', 'mk_n2', null, 'proof-mk_k', '{"words":"k, to n2"}'::jsonb);
select celestual_submit('mk_n1', 'mk_k', null, 'proof-mk_n1', '{"words":"n1, the words only k was told"}'::jsonb);
update celestual_entries set photo = 'Tk4x' where from_handle = 'mk_n1';
select mk_ok('told through the group', mk_night(interval '3 days') = 1);
select celestual_mutual_again('mk_k', 'mk_n2', 'proof-mk_k', null);
select mk_ok('k''s keepsake names n2, and says the words and the photograph were n1''s',
  (select other_handle = 'mk_n2' and their_handle = 'mk_n1'
          and their_card->>'words' = 'n1, the words only k was told' and their_photo = 'Tk4x'
     from celestual_keepsakes where handle = 'mk_k'));
select celestual_erase_account('mk_n1', 'proof-mk_n1');
select mk_ok('erasing n1 takes its words and its photograph out, and leaves k the mutual it had',
  (select their_card is null and their_photo is null and their_handle is null
     from celestual_keepsakes where handle = 'mk_k')
  and not exists (select 1 from celestual_keepsakes
                   where their_handle = 'mk_n1' or their_card->>'words' = 'n1, the words only k was told')
  and mk_mutual('mk_k', 'mk_n2') is not null
  and mk_mutual('mk_k', 'mk_n2')->'their_card' = 'null'::jsonb);

-- ── 16. a keeping never loses a told row ────────────────────────────────────
select celestual_submit('mk_s1', 'mk_s2', null, 'proof-mk_s1', '{"words":"s1"}'::jsonb);
select celestual_submit('mk_s2', 'mk_s1', null, 'proof-mk_s2', '{"words":"s2"}'::jsonb);
select mk_ok('told', mk_night(interval '3 days') = 1);
-- a keepsake already there for the very night, which no path writes
insert into celestual_keepsakes (handle, other_hash, other_handle, placed_at, expires_at, told_at)
select from_handle, to_hash, 'mk_s2', created_at, expires_at, matched_at
  from celestual_entries where from_handle = 'mk_s1';
create or replace function mk_refused(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'ran';
exception when unique_violation then
  return 'unique';
end; $$;
create temp table mk_clash as
  select mk_refused($q$select celestual_mutual_again('mk_s1', 'mk_s2', 'proof-mk_s1', null)$q$) as r;
select mk_ok('a keeping that would lose a told row raises, and nothing is kept or taken',
  (select r from mk_clash) = 'unique'
  and (mk_row('mk_s1', 'mk_s2')).matched_at is not null
  and (mk_row('mk_s2', 'mk_s1')).matched_at is not null
  and mk_kept('mk_s1', 'mk_s2') = 1 and mk_kept('mk_s2', 'mk_s1') = 0);
delete from celestual_keepsakes where handle = 'mk_s1';

-- ── 17. the desk's figures and series ───────────────────────────────────────
select mk_ok('the week''s pings count a kept pair''s two as the rows they were',
  (celestual_desk_overview()#>>'{counts,pings_7d}')::int
    = (select count(*) from celestual_entries where created_at > now() - interval '7 days')
      + (select count(*) from celestual_keepsakes where placed_at > now() - interval '7 days')
  and (celestual_desk_overview()#>>'{counts,pings_7d}')::int
    = (celestual_desk_pings()#>>'{counts,placed_7d}')::int);
create temp table mk_grow as select celestual_desk_growth(30, 'day') as v;
select mk_ok('the growth series counts them in the bucket their notes went out in',
  (select sum((r->>'pings')::int) from jsonb_array_elements((select v from mk_grow)->'rows') r)
    = (select count(*) from celestual_entries
        where created_at >= ((select v from mk_grow)->>'from')::timestamptz
          and created_at < ((select v from mk_grow)->>'to')::timestamptz)
      + (select count(*) from celestual_keepsakes
          where placed_at >= ((select v from mk_grow)->>'from')::timestamptz
            and placed_at < ((select v from mk_grow)->>'to')::timestamptz)
  and (select count(*) from celestual_keepsakes) > 0
  and jsonb_array_length((select v from mk_grow)->'rows') > 1);
insert into celestual_members (handle, handle_hash) values ('mk_b', celestual_hash_handle('mk_b'))
on conflict (handle) do nothing;
create temp table mk_admin as select celestual_admin_overview() as v;
select mk_ok('the older desk counts a person''s kept pings with their rows, placed and received',
  (select (u->>'pings')::int from jsonb_array_elements((select v from mk_admin)->'users') u
    where u->>'handle' = 'mk_b')
    = (select count(*) from celestual_entries where from_handle = 'mk_b')
      + (select count(*) from celestual_keepsakes where handle = 'mk_b')
  and (select (u->>'received')::int from jsonb_array_elements((select v from mk_admin)->'users') u
        where u->>'handle' = 'mk_b')
    = (select count(*) from celestual_entries where to_handle = 'mk_b')
      + (select count(*) from celestual_keepsakes where other_handle = 'mk_b')
  and (select count(*) from celestual_keepsakes where handle = 'mk_b') > 0);
select mk_ok('and its totals and its thirty days the same',
  ((select v from mk_admin)#>>'{counts,pings}')::int
    = (select count(*) from celestual_entries) + (select count(*) from celestual_keepsakes)
  and ((select v from mk_admin)#>>'{counts,pings_7d}')::int
    = ((celestual_desk_overview())#>>'{counts,pings_7d}')::int
  and (select sum((g->>'pings')::int) from jsonb_array_elements((select v from mk_admin)->'growth') g)
    = (select count(*) from celestual_entries where created_at::date >= (now() - interval '29 days')::date)
      + (select count(*) from celestual_keepsakes where placed_at::date >= (now() - interval '29 days')::date));

rollback;
