-- ─────────────────────────────────────────────────────────────────────────────
-- 0058: every letter is a screen, and every letter already up is lit.
--
-- A letter on the wall is no longer a paper (0055's forty-two of them, with a
-- tint and a face each). It is a phone screen left on in a dark room, set in
-- one face, and the only thing a writer chooses is the colour it is lit in
-- (app/src/wall/looks.js). What the row keeps is still 0055's column and
-- 0055's shape: `look` is `{ theme, tint, face }`, cleaned by
-- `wall_look_clean`, and a letter written by the screens stores exactly one
-- of the three, `{ "tint": "teal" }`. So there is no schema to change and
-- the function, the constraint and the view all stand as they are.
--
-- What changes is what is already up. A row written before the screens
-- carries a paper (`{"theme": "nokia", "face": "serif"}`), a tint the new
-- list does not have, or nothing at all, and all three would draw the
-- colour the letter's id picks. That is a screen, but not one anybody
-- chose; the product asked for every letter on the wall to be given one of
-- the new designs outright. So every row whose look is not already one of
-- the eighteen colours is given one, at random, row by row.
--
-- ── and it can be undone ────────────────────────────────────────────────────
-- Before any row is touched its look is copied, with its id, into
-- `wall_look_backup_0058`, once: a second run inserts nothing over the
-- first, so the copy is always of the looks as they were before the screens.
-- The table is the service role's alone (no grant, and row level security
-- on with no policy), because it is an internal record and not part of the
-- wall. To put a letter's paper back:
--
--   update wall_letters l set look = b.look
--     from wall_look_backup_0058 b where b.id = l.id;
--
-- Re-runnable: the backup keeps its first copy, and a letter that already
-- has one of the colours is left with it, so a second run changes nothing a
-- writer chose in the new composer.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists wall_look_backup_0058 (
  id       uuid primary key,
  look     jsonb,
  saved_at timestamptz not null default now()
);
alter table wall_look_backup_0058 enable row level security;
revoke all on wall_look_backup_0058 from public, anon, authenticated;
comment on table wall_look_backup_0058 is
  '0058: every letter''s look as it was before the screens, copied once, so the colours given to the letters already up can be undone.';

insert into wall_look_backup_0058 (id, look)
select id, look from wall_letters
on conflict (id) do nothing;

-- The eighteen, in looks.js COLOURS order. `random()` is volatile, so it is
-- drawn again for every row: each letter gets its own.
with colours(c) as (
  select array[
    'night', 'green', 'ice', 'amber', 'rose', 'white', 'negative',
    'teal', 'blush', 'cobalt', 'acid', 'ember', 'lilac',
    'pink-blue', 'orange-teal', 'red-green', 'violet-yellow',
    'xerox'
  ]
)
update wall_letters l
   set look = jsonb_build_object('tint', (select c from colours)[1 + floor(random() * 18)::int])
 where l.look is null
    or l.look <> jsonb_build_object('tint', l.look->>'tint')
    or not (l.look->>'tint' = any ((select c from colours)::text[]));
