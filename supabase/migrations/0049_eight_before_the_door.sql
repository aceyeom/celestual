-- ─────────────────────────────────────────────────────────────────────────────
-- 0049: eight before the door.
--
-- One thing. The letters a browser reads whole before it is asked for a
-- proof go from five to eight. 0045 built the count and everything about it
-- (the key, the table, the take, the clear) reads its ceiling from one
-- function, so the change is that function and nothing else: wall_letters_for
-- and wall_letter keep spending free reads the way they did, and the meter
-- the screens draw is still the server's `free` on every read.
--
-- Five was too few. A person who has just scanned a code off a card reads
-- the first few letters to find out what this is, and the door arrived while
-- they were still finding out. Eight is a few past that.
--
-- Nothing already spent changes: a browser that read five under 0045 has
-- three left under this, counted off the same rows.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function wall_free_allowance()
returns int
language sql immutable set search_path = public as $$ select 8 $$;

comment on table wall_free_reads is
  '0045, 0049: the eight letters a browser may read before the door. One row per (browser key, letter), at most eight per browser, no identity on it, and nothing returns which letters they were.';
