-- ─────────────────────────────────────────────────────────────────────────────
-- 0073: the note has a face.
--
-- The owner, 29 September: "for the hidden notes, have the name title section
-- adjustable. In fact make the battery adjustable too. Clicking on it change
-- its state." A private note is written on a phone's screen (the ping sheet,
-- app/src/wall/screens/Ping.jsx), and the two things on that screen above the
-- words were the phone's own: the line across the top, `dear` and the name,
-- and the battery. Both are the writer's now, and both are kept with the
-- note, so the other person reads it on the face its writer left it on if it
-- is ever mutual, and the writer sees it so on their own list. (The face
-- here is those two. The card's `face` key is 0022's typeface, which the
-- validator still rebuilds and nothing on the wall reads.)
--
--   greet   the line across the top, in place of `dear` and the name: forty
--           characters at most, its spaces closed, as a letter's greeting is
--           (0055's salutation, docs/ONE-WALL.md). Read by the letters' list
--           (`celestual_text_caught`, 0063), and a line it catches is LEFT
--           OFF, not refused: the note goes, with its words, and `dear` and
--           the name stand where the line would have. The composer screens
--           the line at the keyboard, on its own and with the words (a number
--           split across the two is one number), and refuses the send there
--           with the line to change, so a writer never meets this; it is the
--           floor under a browser that did not.
--   bat     the battery the writer left it on: 0 to 4 bars, a whole number.
--           Read with the same regular expression every number on a card is
--           read with, before any cast, since a hostile cast would raise
--           inside the write path; rounded and clamped, never refused. A
--           battery is not a count of anything: it is the writer's, as the
--           colour of a letter is (design/DESIGN.md 2.5).
--
-- ── the card has to have words ───────────────────────────────────────────────
-- A card with no words is still no card (`null`), whatever face it was sent
-- with, and that return is still the first thing the validator does. Three
-- things stand on "the card is not null" meaning "the note has words": the
-- mutual mail's "their note to you is waiting", the DM's "they left a card
-- for you" (both off `has_card`, 0023 and 0064), and the desk's `has_line`
-- and `with_line`. A face with no words under it would make all three promise
-- a note every screen calls "sent without a note." So:
--
--   words and a face    stored together, and the list reads both back
--   null                keeps the card as it was, face and all (a note sent
--                       again, a lapsed note sent on)
--   {"words": ""}       takes the words off, and the face with them
--   new words, no face  replace the card whole, as a card always has been:
--                       the face is gone. So every send from the wall that
--                       carries words carries the face too (pings.js
--                       `placing`), the letter composer's included
--
-- ── nothing else moves ──────────────────────────────────────────────────────
-- `celestual_place` (0072) stores what this returns, verbatim. The list
-- (`celestual_my_pings`), the one door to the other side's card
-- (`celestual_counterpart_card`), the keepsakes (`celestual_mutual_keep`) and
-- `celestual_ping_status` pass a card through as it is stored, so the two new
-- keys reach the writer's list, the other side's card on the mutual and both
-- keepsakes with no other function redefined. A card kept or told before
-- this has no face, and every screen draws its own default for one: `dear`
-- and the name, and a full battery.
--
-- The validator ran with its caller's rights and was granted to everybody
-- (the default privileges), which did not matter while it only rebuilt a
-- card. It calls `celestual_text_caught` now, which is the service role's
-- alone, so the grant is revoked from public, anon and authenticated: the
-- only caller is `celestual_place`, which is SECURITY DEFINER and reads it as
-- its owner. Nothing in the app, the api modules or an edge function calls it.
--
-- Re-runnable: one `create or replace function`, the revoke and the comment.
-- ─────────────────────────────────────────────────────────────────────────────

-- The validator, as 0063 wrote it, with the card built into a variable and
-- the face laid on it after. Everything above the face is unchanged, and a
-- stored card is never re-cut: this only runs on what a browser sends.
create or replace function celestual_card_clean(p jsonb)
returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  v_words text;
  v_list  text[];
  v_bg    text;
  v_face  text;
  v_x     numeric;
  v_y     numeric;
  v_tone  numeric;
  v_greet text;
  v_out   jsonb;
  c_num constant text := '^-?[0-9]+(\.[0-9]+)?$';
begin
  if p is null or jsonb_typeof(p) <> 'object' then return null; end if;

  -- no words is no card, whatever face it came with (the header says why)
  v_words := btrim(regexp_replace(coalesce(p->>'words', ''), '\s+', ' ', 'g'));
  if v_words = '' then return null; end if;

  -- Eighty words and 280 characters (0063): a note sent privately is as long
  -- as a letter on the wall. The word ceiling is generous on purpose, so the
  -- characters are what a writer meets.
  v_list := regexp_split_to_array(v_words, ' ');
  if array_length(v_list, 1) > 80 then
    v_words := array_to_string(v_list[1:80], ' ');
  end if;
  v_words := rtrim(left(v_words, 280));

  v_bg := lower(coalesce(p->>'bg', 'leaf'));
  if v_bg not in ('leaf', 'chalk', 'hide', 'ink', 'violet', 'ember', 'rose', 'blue') then
    v_bg := 'leaf';
  end if;

  v_face := lower(coalesce(p->>'face', 'serif'));
  if v_face not in ('serif', 'sans', 'mono') then v_face := 'serif'; end if;

  v_x := case when p->>'x' ~ c_num then least(1, greatest(0, (p->>'x')::numeric)) else 0.5 end;
  v_y := case when p->>'y' ~ c_num then least(1, greatest(0, (p->>'y')::numeric)) else 0.5 end;
  v_tone := case when p->>'tone' ~ c_num then least(1, greatest(0, (p->>'tone')::numeric)) else 1 end;

  v_out := jsonb_build_object(
    'words', v_words,
    'bg', v_bg,
    'face', v_face,
    'x', round(v_x, 4),
    'y', round(v_y, 4),
    'tone', round(v_tone, 4));

  -- 0073: the line across the top, the writer's own. A string only, its
  -- spaces closed, forty characters, and read by the letters' list; a line
  -- it catches is left off and the note goes without it. Absent, it is not
  -- written at all, so a card sent without one is the card it always was.
  if jsonb_typeof(p->'greet') = 'string' then
    v_greet := rtrim(left(btrim(regexp_replace(p->>'greet', '\s+', ' ', 'g')), 40));
    if v_greet <> '' and cardinality(celestual_text_caught(v_greet)) = 0 then
      v_out := v_out || jsonb_build_object('greet', v_greet);
    end if;
  end if;

  -- 0073: the battery the writer left it on, 0 to 4. The regular expression
  -- before the cast, as for every number above; rounded, then clamped.
  if p->>'bat' ~ c_num then
    v_out := v_out || jsonb_build_object('bat', least(4, greatest(0, round((p->>'bat')::numeric)))::int);
  end if;

  return v_out;
end;
$$;

-- its only caller is celestual_place, which reads it as its owner
revoke all on function celestual_card_clean(jsonb) from public, anon, authenticated;

comment on function celestual_card_clean(jsonb) is
  '0022, 0024, 0063, 0073: the card validator. Rebuilds every card from scratch: eighty words and 280 characters, one of the grounds, one of the three faces, a position inside the disc and a tone in range; and since 0073 the face its writer left it on, a line across the top (greet: forty characters, spaces closed, left off when celestual_text_caught catches it) and a battery (bat: a whole number, 0 to 4, rounded and clamped). No words is no card, whatever face it came with. A client is a suggestion.';
