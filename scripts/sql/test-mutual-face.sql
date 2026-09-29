-- ─────────────────────────────────────────────────────────────────────────────
-- test-mutual-face.sql: exercises 0077_the_mutual_has_one_face.sql.
--
-- A told mutual has one face, the two people's: the colour its keepsake is
-- lit in and the charge of the battery on its band, set by either and read
-- by both, and whether each side has opened it since it was last told. Both
-- sides read and set it, and read the same row and the same topic; a colour
-- off the list and a battery outside its four bars are refused and change
-- nothing, and so does the table itself; opened is first time wins, belongs
-- to the telling (a pair told again starts at delivered on both sides, its
-- colour and battery kept), and is never marked by a screen that drew an
-- older night. Anybody without a told mutual with that @ now is answered one
-- refusal, byte for byte, whether they never wrote, wrote and are waiting,
-- wrote and it lapsed, named an @ nobody proved, or took the mutual off; the
-- one who took it off can neither read nor set after, and the other side
-- reads exactly what they read before. Two linked @s are one person on one
-- face. Erasure takes every face naming the handle. The browser has the
-- three doors and nothing under them. Nights are brought forward by moving
-- the rows' own reveal back, and an opening is moved back in time the same
-- way, since a whole test is one transaction and one `now()`. Run through
-- scripts/verify-migrations.sh --test; everything is rolled back at the end.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function mf_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function mf_proof(p_handle text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest('proof-' || p_handle, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

create or replace function mf_face(p_me text, p_them text) returns jsonb
language sql as $$ select celestual_mutual_face(p_me, 'proof-' || p_me, p_them) $$;
create or replace function mf_set(p_me text, p_them text, p_tint text, p_bat integer) returns jsonb
language sql as $$ select celestual_mutual_face_set(p_me, 'proof-' || p_me, p_them, p_tint, p_bat) $$;
create or replace function mf_seen(p_me text, p_them text, p_told timestamptz default null) returns jsonb
language sql as $$ select celestual_mutual_seen(p_me, 'proof-' || p_me, p_them, p_told) $$;
create or replace function mf_row(p_a text, p_b text) returns celestual_mutual_faces
language sql as $$
  select * from celestual_mutual_faces where handle_a = least(p_a, p_b) and handle_b = greatest(p_a, p_b)
$$;

-- bring the night of every sealed pair here to a moment gone by
create or replace function mf_night(p_ago interval) returns int
language plpgsql as $$
begin
  update celestual_entries set reveal_at = now() - p_ago
   where sealed_with is not null and from_handle like 'mf\_%';
  return celestual_reveal_due();
end; $$;

-- the list's night for the mutual, as the browser holds it
create or replace function mf_told(p_me text, p_them text) returns timestamptz
language sql as $$
  select (x->>'revealed_at')::timestamptz
    from jsonb_array_elements(celestual_my_pings(p_me, 'proof-' || p_me)->'pings') x
   where x->>'handle' = p_them and (x->>'mutual')::boolean limit 1
$$;

select mf_proof(h) from unnest(array['mf_a', 'mf_b', 'mf_y', 'mf_z', 'mf_x', 'mf_w',
                                     'mf_c', 'mf_d', 'mf_g1', 'mf_g2', 'mf_t']) h;

-- ── 1. the doors ────────────────────────────────────────────────────────────
select mf_ok('the three doors are the browser''s, behind the proof',
  has_function_privilege('anon', 'celestual_mutual_face(text, text, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_mutual_face(text, text, text)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_mutual_face_set(text, text, text, text, integer)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_mutual_face_set(text, text, text, text, integer)', 'EXECUTE')
  and has_function_privilege('anon', 'celestual_mutual_seen(text, text, text, timestamptz)', 'EXECUTE')
  and has_function_privilege('authenticated', 'celestual_mutual_seen(text, text, text, timestamptz)', 'EXECUTE'));
select mf_ok('what the doors read it with is nobody''s, and erasure is still nobody''s',
  not has_function_privilege('anon', 'celestual_mutual_told(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_mutual_told(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_mutual_face_row(text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_mutual_face_row(text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_mutual_side(celestual_mutual_faces, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_mutual_face_answer(celestual_mutual_faces, text, timestamptz)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_mutual_face_answer(celestual_mutual_faces, text, timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_mutual_tints()', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_mutual_face_none()', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_keepsake_forget(text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'celestual_keepsake_forget(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'celestual_billing_forget(text)', 'EXECUTE'));
select mf_ok('the faces are nobody''s to read or write',
  not has_table_privilege('anon', 'celestual_mutual_faces', 'SELECT')
  and not has_table_privilege('authenticated', 'celestual_mutual_faces', 'SELECT')
  and not has_table_privilege('anon', 'celestual_mutual_faces', 'INSERT')
  and not has_table_privilege('authenticated', 'celestual_mutual_faces', 'UPDATE')
  and (select relrowsecurity from pg_class where oid = 'celestual_mutual_faces'::regclass)
  and not exists (select 1 from pg_policy where polrelid = 'celestual_mutual_faces'::regclass));
select mf_ok('and the list is still the one door it was',
  (select count(*) from pg_proc where proname = 'celestual_my_pings') = 1
  and has_function_privilege('anon', 'celestual_my_pings(text, text)', 'EXECUTE'));

-- ── 2. nobody without a told mutual is told anything ────────────────────────
-- mf_y wrote to mf_z and is waiting; mf_x wrote to mf_w and it lapsed; mf_z
-- was written to and wrote nothing; mf_a names an @ nobody ever proved
select celestual_submit('mf_y', 'mf_z', null, 'proof-mf_y', '{"words":"the red scarf on the 51B"}'::jsonb);
select celestual_submit('mf_x', 'mf_w', null, 'proof-mf_x', '{"words":"the one with the paper crane"}'::jsonb);
update celestual_entries set expires_at = now() - interval '1 day' where from_handle = 'mf_x';
create temp table mf_none as
  select celestual_mutual_face_none() as none,
         mf_face('mf_y', 'mf_z') as waiting, mf_set('mf_y', 'mf_z', 'ice', 2) as waiting_set,
         mf_seen('mf_y', 'mf_z') as waiting_seen,
         mf_face('mf_z', 'mf_y') as written_to, mf_face('mf_x', 'mf_w') as lapsed,
         mf_face('mf_a', 'mf_ghost') as nobody, mf_set('mf_a', 'mf_ghost', null, 1) as nobody_set,
         mf_seen('mf_a', 'mf_ghost') as nobody_seen, mf_face('mf_a', 'mf_a') as themselves;
select mf_ok('one refusal, byte for byte, however there is no mutual',
  (select none from mf_none) = '{"ok": false, "error": "none"}'::jsonb
  and (select waiting = none and waiting_set = none and waiting_seen = none and written_to = none
          and lapsed = none and nobody = none and nobody_set = none and nobody_seen = none
          and themselves = none from mf_none));
select mf_ok('and no face is made for any of them',
  not exists (select 1 from celestual_mutual_faces where handle_a like 'mf\_%' or handle_b like 'mf\_%'));
create temp table mf_bad as
  select celestual_mutual_face('mf_a', 'not-the-proof', 'mf_b') as face,
         celestual_mutual_face_set('mf_a', null, 'mf_b', 'ice', null) as set,
         celestual_mutual_seen('mf_a', 'not-the-proof', 'mf_b') as seen;
select mf_ok('a proof the server refuses is refused, and says nothing about the other @',
  (select face->>'error' = 'unverified' and set->>'error' = 'unverified' and seen->>'error' = 'unverified'
     and not (face->>'ok')::boolean from mf_bad));

-- ── 3. a told pair, read by both ────────────────────────────────────────────
select celestual_submit('mf_a', 'mf_b', null, 'proof-mf_a', '{"words":"the orange bike, every morning"}'::jsonb);
select celestual_submit('mf_b', 'mf_a', null, 'proof-mf_b', '{"words":"i ride slower past the library"}'::jsonb);
select mf_ok('the night tells the pair', mf_night(interval '3 days') = 1);
create temp table mf_ab0 as select mf_face('mf_a', 'mf_b') as a, mf_face('mf_b', 'mf_a') as b;
select mf_ok('both sides read one face, rose and full, on one topic, nobody opened',
  (select (a->>'ok')::boolean and a->>'tint' = 'rose' and (a->>'bat')::int = 4
      and not (a->>'opened')::boolean and a->'opened_at' = 'null'::jsonb
      and a->>'topic' = b->>'topic' and a->>'tint' = b->>'tint' and a->>'bat' = b->>'bat'
      and not (b->>'opened')::boolean from mf_ab0)
  and (select count(*) from celestual_mutual_faces where handle_a = 'mf_a' and handle_b = 'mf_b') = 1
  and (select topic::text from celestual_mutual_faces where handle_a = 'mf_a') = (select a->>'topic' from mf_ab0));
select mf_ok('the answer carries nothing about who set what, or the reader''s own opening',
  (select array(select jsonb_object_keys(a) order by 1) from mf_ab0)
    = array['at', 'bat', 'ok', 'opened', 'opened_at', 'tint', 'topic']);

-- ── 4. set by either, read by both ──────────────────────────────────────────
create temp table mf_set1 as select mf_set('mf_a', 'mf_b', 'ice', null) as r;
select mf_ok('one side sets the colour, and its answer is the face after',
  (select r->>'tint' = 'ice' and (r->>'bat')::int = 4 from mf_set1));
select mf_ok('and the other side reads it',
  mf_face('mf_b', 'mf_a')->>'tint' = 'ice' and (mf_face('mf_b', 'mf_a')->>'bat')::int = 4);
select mf_set('mf_b', 'mf_a', null, 2);
select mf_ok('the other sets the battery, and the colour stays; the first reads both',
  mf_face('mf_a', 'mf_b')->>'tint' = 'ice' and (mf_face('mf_a', 'mf_b')->>'bat')::int = 2
  and (mf_row('mf_a', 'mf_b')).set_by = 'b' and (mf_row('mf_a', 'mf_b')).set_at is not null);
select mf_ok('both at once, and the side that set them is written as a letter',
  (mf_set('mf_a', 'mf_b', 'amber', 3)->>'tint') = 'amber'
  and (mf_row('mf_a', 'mf_b')).bat = 3 and (mf_row('mf_a', 'mf_b')).set_by = 'a');
select mf_ok('every colour on the list is taken',
  (select bool_and(mf_set('mf_a', 'mf_b', t, null)->>'tint' = t)
     from unnest(array['night', 'white', 'ice', 'green', 'amber', 'rose', 'lilac']) t));
select mf_ok('and every charge from empty to full',
  (select bool_and((mf_set('mf_b', 'mf_a', null, n)->>'bat')::int = n) from generate_series(0, 4) n));
select mf_set('mf_a', 'mf_b', 'ice', 2);
create temp table mf_before as select to_jsonb(mf_row('mf_a', 'mf_b')) as r;
create temp table mf_invalid as
  select mf_set('mf_a', 'mf_b', 'teal', null) as print, mf_set('mf_a', 'mf_b', 'negative', null) as neg,
         mf_set('mf_a', 'mf_b', 'pink', null) as unknown, mf_set('mf_a', 'mf_b', 'ROSE', null) as cased,
         mf_set('mf_a', 'mf_b', null, 5) as over, mf_set('mf_a', 'mf_b', null, -1) as under,
         mf_set('mf_a', 'mf_b', 'rose', 7) as half;
select mf_ok('a print, the negative, a colour nobody has, and a battery off its four bars are refused',
  (select print->>'error' = 'invalid' and neg->>'error' = 'invalid' and unknown->>'error' = 'invalid'
      and cased->>'error' = 'invalid' and over->>'error' = 'invalid' and under->>'error' = 'invalid'
      and half->>'error' = 'invalid' from mf_invalid));
select mf_ok('and change nothing, not even the half of the ask that was good',
  to_jsonb(mf_row('mf_a', 'mf_b')) = (select r from mf_before));
select mf_ok('asking to set nothing answers the face and touches nothing',
  (mf_set('mf_a', 'mf_b', null, null)->>'tint') = 'ice'
  and to_jsonb(mf_row('mf_a', 'mf_b')) = (select r from mf_before));
do $$
begin
  begin
    update celestual_mutual_faces set tint = 'teal' where handle_a = 'mf_a';
    raise exception 'FAIL  the table took a print';
  exception when check_violation then raise notice 'PASS  the table itself refuses a colour off the list';
  end;
  begin
    update celestual_mutual_faces set bat = 5 where handle_a = 'mf_a';
    raise exception 'FAIL  the table took a fifth bar';
  exception when check_violation then raise notice 'PASS  and a battery off its four bars';
  end;
end $$;

-- ── 5. opened ───────────────────────────────────────────────────────────────
create temp table mf_seen1 as select mf_seen('mf_a', 'mf_b') as r;
select mf_ok('one side opens it: the other reads opened, and when',
  (mf_face('mf_b', 'mf_a')->>'opened')::boolean
  and (mf_face('mf_b', 'mf_a')->>'opened_at')::timestamptz = date_trunc('second', now())
  and (mf_row('mf_a', 'mf_b')).a_opened_at = now());
select mf_ok('and the one who opened it reads that the other has not',
  not (mf_face('mf_a', 'mf_b')->>'opened')::boolean
  and not ((select r from mf_seen1)->>'opened')::boolean
  and (select r from mf_seen1)->'opened_at' = 'null'::jsonb);
-- the first opening an hour ago, well after the night
update celestual_mutual_faces set a_opened_at = now() - interval '1 hour' where handle_a = 'mf_a';
select mf_seen('mf_a', 'mf_b');
select mf_ok('the first time wins: opening it again changes nothing',
  (mf_row('mf_a', 'mf_b')).a_opened_at = now() - interval '1 hour'
  and (mf_face('mf_b', 'mf_a')->>'opened_at')::timestamptz = date_trunc('second', now() - interval '1 hour'));
select mf_seen('mf_b', 'mf_a', now() - interval '10 days');
select mf_ok('a screen that drew an older night than the latest marks nothing',
  (mf_row('mf_a', 'mf_b')).b_opened_at is null and not (mf_face('mf_a', 'mf_b')->>'opened')::boolean);
select mf_seen('mf_b', 'mf_a', mf_told('mf_b', 'mf_a'));
select mf_ok('and the night the list drew, to the second, marks it',
  (mf_row('mf_a', 'mf_b')).b_opened_at = now() and (mf_face('mf_a', 'mf_b')->>'opened')::boolean);

-- ── 6. a pair told again ────────────────────────────────────────────────────
-- Both write again: the pair is kept, each side a keepsake, and the face is
-- read off the keepsakes as it was off the rows
create temp table mf_kept0 as select mf_face('mf_b', 'mf_a') as b;
select celestual_mutual_again('mf_a', 'mf_b', 'proof-mf_a', '{"words":"still the orange bike"}'::jsonb);
select mf_ok('kept, the pair reads the same face from its keepsakes',
  exists (select 1 from celestual_keepsakes where handle = 'mf_a')
  and mf_face('mf_b', 'mf_a') = (select b from mf_kept0));
-- both openings from before the next night, as they would be
update celestual_mutual_faces set a_opened_at = now() - interval '2 days', b_opened_at = now() - interval '2 days'
 where handle_a = 'mf_a';
select celestual_mutual_again('mf_b', 'mf_a', 'proof-mf_b', '{"words":"slower still"}'::jsonb);
select mf_ok('the new notes tell the pair again', mf_night(interval '1 day') = 1);
select mf_ok('told again, the colour and the battery and the topic are the pair''s still',
  mf_face('mf_a', 'mf_b')->>'tint' = 'ice' and (mf_face('mf_a', 'mf_b')->>'bat')::int = 2
  and mf_face('mf_a', 'mf_b')->>'topic' = (select b->>'topic' from mf_kept0)
  and (select count(*) from celestual_mutual_faces where handle_a = 'mf_a') = 1);
select mf_ok('and both sides start at delivered, since the opening was of the last telling',
  not (mf_face('mf_a', 'mf_b')->>'opened')::boolean and not (mf_face('mf_b', 'mf_a')->>'opened')::boolean);
select mf_seen('mf_a', 'mf_b', mf_told('mf_a', 'mf_b'));
select mf_ok('opened again, it is opened again, now',
  (mf_face('mf_b', 'mf_a')->>'opened')::boolean
  and (mf_row('mf_a', 'mf_b')).a_opened_at = now()
  and not (mf_face('mf_a', 'mf_b')->>'opened')::boolean);

-- ── 7. taking it off ────────────────────────────────────────────────────────
select celestual_submit('mf_c', 'mf_d', null, 'proof-mf_c', '{"words":"the green umbrella"}'::jsonb);
select celestual_submit('mf_d', 'mf_c', null, 'proof-mf_d', '{"words":"the tall one by the door"}'::jsonb);
select mf_ok('a second pair is told', mf_night(interval '2 days') = 1);
select mf_set('mf_d', 'mf_c', 'lilac', 1);
select mf_seen('mf_c', 'mf_d');
create temp table mf_d0 as select mf_face('mf_d', 'mf_c') as d, to_jsonb(mf_row('mf_c', 'mf_d')) as r;
select mf_ok('the other side reads it opened', ((select d from mf_d0)->>'opened')::boolean);
select mf_ok('one side takes it off their list',
  (celestual_mutual_forget('mf_c', 'mf_d', 'proof-mf_c')->>'ok')::boolean);
create temp table mf_gone as
  select mf_face('mf_c', 'mf_d') as face, mf_set('mf_c', 'mf_d', 'night', 4) as set,
         mf_seen('mf_c', 'mf_d') as seen;
select mf_ok('and can neither read the face nor move it, answered as anybody with no mutual is',
  (select face = celestual_mutual_face_none() and set = celestual_mutual_face_none()
      and seen = celestual_mutual_face_none() from mf_gone));
select mf_ok('the face is untouched by it',
  to_jsonb(mf_row('mf_c', 'mf_d')) = (select r from mf_d0));
select mf_ok('and the other side reads exactly what they read before, opened and all',
  mf_face('mf_d', 'mf_c') = (select d from mf_d0));
select mf_ok('they can still set it, and it simply stops changing on the other side',
  (mf_set('mf_d', 'mf_c', null, 0)->>'bat')::int = 0
  and mf_face('mf_c', 'mf_d') = celestual_mutual_face_none());

-- ── 8. one person, two handles ──────────────────────────────────────────────
with g as (select gen_random_uuid() as id)
insert into celestual_handle_links (handle, group_id)
select h, g.id from g, unnest(array['mf_g1', 'mf_g2']) h;
select celestual_submit('mf_g1', 'mf_t', null, 'proof-mf_g1', '{"words":"the one who hums"}'::jsonb);
select celestual_submit('mf_t', 'mf_g1', null, 'proof-mf_t', '{"words":"the one who hums back"}'::jsonb);
select mf_ok('a pair told on one of a person''s two @s', mf_night(interval '2 days') = 1);
select mf_set('mf_g2', 'mf_t', 'green', 3);
select mf_ok('either @ of that person reads and sets the one face, and so does the other side, by either',
  mf_face('mf_g1', 'mf_t')->>'tint' = 'green'
  and mf_face('mf_t', 'mf_g2')->>'topic' = mf_face('mf_g1', 'mf_t')->>'topic'
  and mf_face('mf_t', 'mf_g1')->>'topic' = mf_face('mf_g2', 'mf_t')->>'topic'
  and (select count(*) from celestual_mutual_faces
        where (handle_a in ('mf_g1', 'mf_g2') and handle_b = 'mf_t')
           or (handle_b in ('mf_g1', 'mf_g2') and handle_a = 'mf_t')) = 1);
select mf_seen('mf_g2', 'mf_t');
select mf_ok('and an opening from either is the person''s',
  (mf_face('mf_t', 'mf_g1')->>'opened')::boolean);

-- ── 9. erasure ──────────────────────────────────────────────────────────────
select mf_ok('there are faces naming the handle before',
  exists (select 1 from celestual_mutual_faces where handle_a = 'mf_b' or handle_b = 'mf_b'));
select celestual_erase_account('mf_b', 'proof-mf_b');
select mf_ok('erasure takes every face naming the handle',
  not exists (select 1 from celestual_mutual_faces where handle_a = 'mf_b' or handle_b = 'mf_b'));
select mf_ok('and the other side of it holds no mutual there to read',
  mf_face('mf_a', 'mf_b') = celestual_mutual_face_none());
select mf_ok('the other pairs'' faces stand',
  exists (select 1 from celestual_mutual_faces where handle_a = 'mf_c' and handle_b = 'mf_d')
  and exists (select 1 from celestual_mutual_faces where handle_b = 'mf_t'));
select celestual_billing_forget('mf_t');
select mf_ok('and the billing door erasure comes through takes them by itself',
  not exists (select 1 from celestual_mutual_faces where handle_a = 'mf_t' or handle_b = 'mf_t'));

rollback;
