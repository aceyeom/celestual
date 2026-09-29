-- ─────────────────────────────────────────────────────────────────────────────
-- test-note-face.sql: exercises what 0073_the_note_has_a_face.sql holds for
-- the face a private note is written on, the line across its top (`greet`)
-- and the battery its writer left it on (`bat`).
--
-- The validator keeps a line with its spaces closed and cut to forty, leaves
-- off one the letters' list catches and keeps the words, reads a battery as a
-- whole number from 0 to 4 and drops anything that is not a number, and makes
-- no card of a face with no words; a card sent without a face is the card it
-- always was, to the byte. Placed, the face is on the row and on the list;
-- sent again with no card it stays; new words sent without it replace the
-- card whole; the other side reads it off their card once it is mutual, the
-- keepsake keeps both faces when the pair is written to again, and the new
-- note has its own; and the words taken off take the face with them. Nobody
-- but the placement can call the validator.
-- Run through scripts/verify-migrations.sh --test; everything is rolled back
-- at the end.
-- ─────────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on
set client_min_messages = notice;
begin;

create or replace function nf_ok(p_name text, p_cond boolean) returns void
language plpgsql as $$
begin
  if coalesce(p_cond, false) then raise notice 'PASS  %', p_name;
  else raise exception 'FAIL  %', p_name; end if;
end; $$;

create or replace function nf_proof(p_handle text) returns void
language plpgsql as $$
begin
  insert into celestual_ig_verifications (handle, token, proof_hash, status, igsid, verified_at, expires_at)
  values (p_handle, lpad((floor(random() * 10000))::int::text, 4, '0'),
          encode(extensions.digest('proof-' || p_handle, 'sha256'), 'hex'),
          'verified', 'igsid-' || p_handle, now(), now() + interval '30 days');
end; $$;

create or replace function nf_row(p_from text, p_to text) returns celestual_entries
language sql as $$
  select * from celestual_entries where from_handle = p_from and to_hash = celestual_hash_handle(p_to)
$$;

-- ── 1. the validator ────────────────────────────────────────────────────────
select nf_ok('a line is kept, its spaces closed',
  celestual_card_clean('{"words":"hi","greet":"  to the girl   on the 51B "}')->>'greet' = 'to the girl on the 51B');
select nf_ok('and cut to forty characters',
  char_length(celestual_card_clean(jsonb_build_object('words', 'hi', 'greet', repeat('x', 60)))->>'greet') = 40);
select nf_ok('a line the list catches is left off, and the words are kept',
  not (celestual_card_clean('{"words":"hi","greet":"call 510 555 0199"}') ? 'greet')
  and celestual_card_clean('{"words":"hi","greet":"call 510 555 0199"}')->>'words' = 'hi');
select nf_ok('a line that is not a string, or only spaces, is not written',
  not (celestual_card_clean('{"words":"hi","greet":7}') ? 'greet')
  and not (celestual_card_clean('{"words":"hi","greet":"   "}') ? 'greet'));
select nf_ok('a battery is a whole number from 0 to 4, rounded and clamped',
  (celestual_card_clean('{"words":"hi","bat":2}')->'bat') = '2'::jsonb
  and (celestual_card_clean('{"words":"hi","bat":"0"}')->'bat') = '0'::jsonb
  and (celestual_card_clean('{"words":"hi","bat":9}')->'bat') = '4'::jsonb
  and (celestual_card_clean('{"words":"hi","bat":-3}')->'bat') = '0'::jsonb
  and (celestual_card_clean('{"words":"hi","bat":2.6}')->'bat') = '3'::jsonb);
select nf_ok('and anything that is not a number is dropped, never cast',
  not (celestual_card_clean('{"words":"hi","bat":"full"}') ? 'bat')
  and not (celestual_card_clean('{"words":"hi","bat":[1]}') ? 'bat')
  and not (celestual_card_clean('{"words":"hi","bat":"1e9"}') ? 'bat'));
select nf_ok('no words is no card, whatever face it came with',
  celestual_card_clean('{"words":"","greet":"hey","bat":1}') is null
  and celestual_card_clean('{"words":"   ","greet":"hey"}') is null);
select nf_ok('a card sent without a face is the card it always was',
  celestual_card_clean('{"words":"you are the reason","bg":"hide","face":"mono"}'::jsonb)
    = '{"words":"you are the reason","bg":"hide","face":"mono","x":0.5,"y":0.5,"tone":1}'::jsonb);
select nf_ok('nobody but the placement calls it',
  not has_function_privilege('anon', 'celestual_card_clean(jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'celestual_card_clean(jsonb)', 'execute'));

-- ── 2. placed, kept and told ────────────────────────────────────────────────
select nf_proof(h) from unnest(array['nf_a', 'nf_b']) h;
select celestual_submit('nf_a', 'nf_b', null, 'proof-nf_a', '{"words":"the bus stop","greet":"to the one at the bus stop","bat":1}'::jsonb);
select nf_ok('placed with its face',
  (nf_row('nf_a', 'nf_b')).card->>'greet' = 'to the one at the bus stop'
  and (nf_row('nf_a', 'nf_b')).card->'bat' = '1'::jsonb);
select nf_ok('and listed with it',
  exists (select 1 from jsonb_array_elements(celestual_my_pings('nf_a', 'proof-nf_a')->'pings') x
           where x->'card'->>'greet' = 'to the one at the bus stop' and x->'card'->'bat' = '1'::jsonb));
select celestual_submit('nf_a', 'nf_b', null, 'proof-nf_a', null);
select nf_ok('sent again with no card, the face stays',
  (nf_row('nf_a', 'nf_b')).card->'bat' = '1'::jsonb
  and (nf_row('nf_a', 'nf_b')).card->>'greet' = 'to the one at the bus stop');
select celestual_submit('nf_a', 'nf_b', null, 'proof-nf_a', '{"words":"the bus stop, again"}'::jsonb);
select nf_ok('new words with no face replace the card whole',
  not ((nf_row('nf_a', 'nf_b')).card ? 'greet') and not ((nf_row('nf_a', 'nf_b')).card ? 'bat')
  and (nf_row('nf_a', 'nf_b')).card->>'words' = 'the bus stop, again');
select celestual_submit('nf_a', 'nf_b', null, 'proof-nf_a', '{"words":"the bus stop","greet":"hey","bat":3}'::jsonb);
select celestual_submit('nf_b', 'nf_a', null, 'proof-nf_b', '{"words":"i saw you too","greet":"to the one who waved","bat":0}'::jsonb);
update celestual_entries set reveal_at = now() - interval '1 second' where from_handle in ('nf_a', 'nf_b');
select celestual_reveal_due();
select nf_ok('told, their card carries their face, and mine mine',
  exists (select 1 from jsonb_array_elements(celestual_my_pings('nf_a', 'proof-nf_a')->'pings') x
           where (x->>'mutual')::boolean and x->'their_card'->>'greet' = 'to the one who waved'
             and x->'their_card'->'bat' = '0'::jsonb and x->'card'->>'greet' = 'hey'));
select celestual_mutual_again('nf_a', 'nf_b', 'proof-nf_a', '{"words":"again","greet":"once more","bat":4}'::jsonb);
select nf_ok('written to again, the keepsake keeps both faces',
  exists (select 1 from celestual_keepsakes
           where handle = 'nf_a' and card->>'greet' = 'hey' and their_card->>'greet' = 'to the one who waved'));
select nf_ok('and the new note has its own',
  (nf_row('nf_a', 'nf_b')).card->>'greet' = 'once more' and (nf_row('nf_a', 'nf_b')).card->'bat' = '4'::jsonb);
select celestual_submit('nf_a', 'nf_b', null, 'proof-nf_a', '{"words":""}'::jsonb);
select nf_ok('the words taken off take the face with them', (nf_row('nf_a', 'nf_b')).card is null);

rollback;
