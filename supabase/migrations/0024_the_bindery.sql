-- ══════════════════════════════════════════════════════════════════════
-- 0024 — THE BINDERY
--
-- The design transfer, on the one line of it the server has an opinion about.
--
-- A card is written on a GROUND, and the ground is stored on the ping row. It
-- used to be one of five flat dark plates (`ink`, `violet`, `ember`, `rose`,
-- `blue`); it is one of three MATERIALS now (`leaf` laid paper, `chalk` a chalk
-- card, `hide` the leather itself), because you are choosing what the note is
-- written on rather than picking a colour off a ramp.
--
-- celestual_card_clean is the only thing that ever writes that column, and it
-- rebuilds every card from scratch rather than checking and passing it through
-- — which is exactly the right design and exactly why this migration is not
-- optional. Left alone, the validator would take a browser sending `leaf` and
-- silently store `ink`, and the card would come back wearing a ground that no
-- longer exists in the product. A card is somebody's words on a surface they
-- chose; handing back a different surface is a small lie the server has no
-- business telling.
--
-- ── what happens to the cards already placed ──────────────────────────────
-- Nothing rewrites them. Their stored `bg` stays exactly as it was, and the
-- validator still ACCEPTS the five old ids so a row re-validated by a renew or
-- a re-place is not mangled. The five map onto the three at read time, in one
-- place, in the client (card/model.js LEGACY_PLATES): all five plates were dark,
-- so all five resolve to the leather, and a card written before today keeps a
-- ground the same colour it was written on.
--
-- Doing the map here instead was the other option and it is the wrong one: a
-- migration that rewrites the column destroys the record of what somebody
-- actually chose, and it cannot be undone.
--
-- The faces are untouched (`serif`, `sans`, `mono`). Their ids are the same;
-- what is behind them is three new typefaces, which is a client fact and not a
-- database one.
--
-- Re-runnable (CREATE OR REPLACE only). Nothing is dropped, no data is moved.
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- THE VALIDATOR (0022 revision, widened)
-- ──────────────────────────────────────────────────────────────────────
-- Identical to 0022's in every other respect: everything the browser sends is
-- rebuilt from scratch so an unknown key cannot ride along inside the jsonb and
-- come back out at a reveal, numbers are matched against a regex BEFORE being
-- cast, and the twenty-word ceiling is the one the composer writes under.
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
  c_num constant text := '^-?[0-9]+(\.[0-9]+)?$';
begin
  if p is null or jsonb_typeof(p) <> 'object' then return null; end if;

  -- The words are the card. Without them there is nothing to seal.
  v_words := btrim(regexp_replace(coalesce(p->>'words', ''), '\s+', ' ', 'g'));
  if v_words = '' then return null; end if;

  -- Twenty words, hard (card/model.js MAX_WORDS). Not a character count: a
  -- character count teaches people to write shorter sentences, a word count
  -- teaches them to write one true thing. The 400-character ceiling under it is
  -- only so that one "word" cannot be a novel.
  v_list := regexp_split_to_array(v_words, ' ');
  if array_length(v_list, 1) > 20 then
    v_words := array_to_string(v_list[1:20], ' ');
  end if;
  v_words := left(v_words, 400);

  -- The three materials, plus the five plates that came before them. The old
  -- ids are accepted rather than translated: a stored card keeps the ground it
  -- was written on, and the client maps the five onto the three when it draws.
  -- The default is the laid paper, which is what the composer opens on.
  v_bg := lower(coalesce(p->>'bg', 'leaf'));
  if v_bg not in ('leaf', 'chalk', 'hide', 'ink', 'violet', 'ember', 'rose', 'blue') then
    v_bg := 'leaf';
  end if;

  v_face := lower(coalesce(p->>'face', 'serif'));
  if v_face not in ('serif', 'sans', 'mono') then v_face := 'serif'; end if;

  v_x := case when p->>'x' ~ c_num then least(1, greatest(0, (p->>'x')::numeric)) else 0.5 end;
  v_y := case when p->>'y' ~ c_num then least(1, greatest(0, (p->>'y')::numeric)) else 0.5 end;
  v_tone := case when p->>'tone' ~ c_num then least(1, greatest(0, (p->>'tone')::numeric)) else 1 end;

  return jsonb_build_object(
    'words', v_words,
    'bg', v_bg,
    'face', v_face,
    'x', round(v_x, 4),
    'y', round(v_y, 4),
    'tone', round(v_tone, 4));
end;
$$;

comment on function celestual_card_clean(jsonb) is
  'The card validator. Rebuilds every poster from scratch: twenty words, one of '
  'the three grounds (leaf/chalk/hide, with the five pre-Bindery plates still '
  'accepted so an old card is never mangled), one of the three faces, a position '
  'inside the disc and a tone in range. A client is a suggestion.';
