-- ─────────────────────────────────────────────────────────────────────────────
-- 0061: the prints thin out, and the letters in the five that went keep
-- their colour.
--
-- The colours a letter can be lit in were eighteen, in three groups. They
-- are one pool of thirteen now (app/src/wall/looks.js), and five of the
-- prints are gone from it: the blush and cobalt posters, and the pink /
-- blue, orange / teal and red / green risos. The browser already draws a
-- letter in one of those five as the colour nearest its hue (looks.js
-- `RETIRED`), so nothing on the wall breaks the day the client ships. This
-- moves the rows to match, so the row says what the screen shows and a
-- later client never has to know the five were there.
--
-- Each goes to the colour nearest the hue of its main ink, so a letter that
-- went up pink is still a pink letter:
--
--   blush          rose
--   pink-blue      rose
--   cobalt         ice
--   orange-teal    ember
--   red-green      ember
--
-- There is no schema to change. `wall_look_clean` and the constraint that
-- holds every row to it (0055) check a look's shape, never its colour, and
-- they are left exactly as they are: a remap inside the function would make
-- the constraint refuse the next update of any row this migration had not
-- reached. `wall_index` is a view, so the names' small screens follow the
-- rows on the next read.
--
-- ── and it can be undone ────────────────────────────────────────────────────
-- Before any row is touched its look is copied, with its id, into
-- `wall_look_backup_0061`, once: a second run inserts nothing over the
-- first, so the copy is always of the looks as they were before the prints
-- thinned out. The table is the service role's alone (no grant, and row
-- level security on with no policy), as 0058's is. To put the five back:
--
--   update wall_letters l set look = b.look
--     from wall_look_backup_0061 b where b.id = l.id;
--
-- (and the five rows back in looks.js COLOURS, or the browser draws them as
-- the colours above whatever the rows say).
--
-- Re-runnable: a second run finds none of the five left to move, and the
-- backup keeps its first copy.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists wall_look_backup_0061 (
  id       uuid primary key,
  look     jsonb,
  saved_at timestamptz not null default now()
);
alter table wall_look_backup_0061 enable row level security;
revoke all on wall_look_backup_0061 from public, anon, authenticated;
comment on table wall_look_backup_0061 is
  '0061: the look of every letter lit in one of the five retired prints, as it was before it was moved to the colour nearest its hue, so the move can be undone.';

insert into wall_look_backup_0061 (id, look)
select id, look from wall_letters
 where look->>'tint' in ('blush', 'pink-blue', 'cobalt', 'orange-teal', 'red-green')
on conflict (id) do nothing;

-- One key, as the screens write it (0058): whatever else a row carried is
-- in the backup, and a row of the five carried only its tint since 0058.
update wall_letters
   set look = jsonb_build_object('tint', case look->>'tint'
     when 'blush' then 'rose'
     when 'pink-blue' then 'rose'
     when 'cobalt' then 'ice'
     when 'orange-teal' then 'ember'
     when 'red-green' then 'ember'
   end)
 where look->>'tint' in ('blush', 'pink-blue', 'cobalt', 'orange-teal', 'red-green');
