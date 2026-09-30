-- ─────────────────────────────────────────────────────────────────────────────
-- 0076: the battery is the writer's.
--
-- The owner, 30 September: "battery state customizations shouldnt be for
-- pings only for wall letters and it can just be clicked to change its charge
-- state." Since 0073 the battery on a private note was its writer's, set a
-- bar at a time on the note's screen, and the battery on a wall letter was
-- the phone's own, drawn off the letter's age (app/src/wall/looks.js
-- `chargeOf`): full for the first day, a bar off at sixty hours, at five and
-- a half days and at ten, and empty after that. The two change places. A
-- private note is no longer given a battery by its writer (the ping sheet
-- loses its key), and a wall letter is: the composer's battery is a key, a
-- bar off at each press and the empty one round to full, starting full, and
-- what the writer leaves it on goes up with the letter and is what every
-- reader's phone draws, on the letter, on its picture and on the name's small
-- screen on the field.
--
-- ── where it is kept ────────────────────────────────────────────────────────
-- In the look. A letter's look (0055) is the one thing its writer chooses
-- about how it is drawn, the colour it is lit in, and the battery is the
-- second such thing, so it goes beside the colour rather than into a column
-- of its own: every read that hands a letter back already carries `look`
-- whole (`wall_letters_for`, `wall_letter`, `wall_mine`, the desk), the index
-- carries the newest letter's under its key (`wall_index`, 0067), the search
-- carries it, and a takedown takes it with the rest (0055's tests hold all of
-- those), so the battery reaches every reader with no read redefined. The
-- write stores what `wall_look_clean` returns (`wall_write`, 0066), and the
-- row is held to that same function by `wall_letters_look_ck`, so this one
-- function is the whole of the change.
--
--   bat   0 to 4 bars, a whole number, only when the look carries a JSON
--         number there: rounded and clamped to the five a battery can show,
--         never refused, since a battery is not worth refusing a letter over.
--         Anything else, a string, a boolean, an object, is dropped, as a
--         fourth slug always was, and never reaches a row. The cast is only
--         ever made from a value `jsonb_typeof` has already called a number,
--         which a numeric always takes, so nothing a browser sends can raise
--         inside the write.
--
-- A look that is ONLY a battery (a letter with no colour chosen and a battery
-- set) is a look, `{"bat": 1}`, and the letter is lit in the colour its id
-- picks, as one with no look always was.
--
-- ── the letters from before ─────────────────────────────────────────────────
-- Nothing is backfilled. A letter written before this has no `bat`, and every
-- reader draws it as it always did, by its age (looks.js `batOfLetter`), so
-- no letter already up changes its face overnight, and its battery keeps
-- running down as it did. Only a letter written with a battery set holds one.
--
-- ── what it claims ──────────────────────────────────────────────────────────
-- Nothing. The battery on a letter with one is the writer's, as its colour is
-- (design/DESIGN.md 2.5): it counts nothing, so it claims nothing, and it is
-- not explained anywhere on the wall, which is the owner's (the untold
-- mechanism). It says nothing about who wrote the letter, and it is set before
-- anybody reads it.
--
-- ── the constraint ──────────────────────────────────────────────────────────
-- `wall_letters_look_ck` is `look is not distinct from wall_look_clean(look)`,
-- which reads the function as it is now, so replacing the function widens
-- the check with no `alter table`. Every stored look still passes: a stored
-- look has no `bat`, and the function keeps the three slugs exactly as 0055
-- did. A stored battery passes too, since a whole number from 0 to 4 cleans
-- to itself (the tests hold the function idempotent).
--
-- ── the grants ──────────────────────────────────────────────────────────────
-- None change. `wall_look_clean` reads no table, is immutable, and was left
-- to everybody by 0055 (the check constraint calls it on whoever's insert),
-- and it is replaced here with the same signature, which keeps its grants.
-- It is not SECURITY DEFINER and never was: it has no rights to lend.
--
-- Re-runnable: one `create or replace function` and its comment.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function wall_look_clean(p jsonb)
returns jsonb
language sql immutable set search_path = public as $$
  select case
    when p is null or jsonb_typeof(p) <> 'object' then null
    else nullif(jsonb_strip_nulls(jsonb_build_object(
      'theme', case when p->>'theme' ~ '^[a-z][a-z0-9-]{0,23}$' and p->>'theme' <> 'paper' then p->>'theme' end,
      'tint',  case when p->>'tint'  ~ '^[a-z][a-z0-9-]{0,23}$' then p->>'tint' end,
      'face',  case when p->>'face'  ~ '^[a-z][a-z0-9-]{0,23}$' then p->>'face' end,
      -- the writer's battery (0076): a JSON number, rounded, and held to the
      -- five a battery can show; anything else is left off
      'bat',   case when jsonb_typeof(p->'bat') = 'number'
                    then to_jsonb(least(4, greatest(0, round((p->>'bat')::numeric)))::int) end)), '{}'::jsonb)
    end
$$;

comment on function wall_look_clean(jsonb) is
  '0055, 0076: {theme, tint, face}, each a slug, and bat, the writer''s battery, a whole number 0 to 4 (a number rounded and clamped, anything else dropped); null for the plain paper or nothing. Held to itself by wall_letters_look_ck.';
