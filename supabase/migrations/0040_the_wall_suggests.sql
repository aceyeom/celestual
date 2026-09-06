-- ─────────────────────────────────────────────────────────────────────────────
-- 0040: the wall suggests.
--
-- Two things, both over the public index and nothing else.
--
--   wall_search    re-emitted. It answers from the first character now, ranks
--                  an exact handle first, then the handles that START with what
--                  was typed, then the ones that merely contain it, and it
--                  carries the resolver's own answer for each name: the display
--                  name, the badge and the path to the stored face. The screen
--                  used to draw a bare handle and then peek the resolver once
--                  per row to fill the face in, which was a request per row
--                  per keystroke; it is one request now, and the browser learns
--                  the faces from it.
--   wall_pulse     new. Whether a campus's wall is open and how much is on it:
--                  the front door pins the wall's own poster up while there is
--                  a wall to point at, and takes it down when there is not.
--
-- ── what is deliberately NOT suggested ───────────────────────────────────────
-- The resolver's cache (ig_profiles) holds every handle anybody has ever
-- committed through a field, and most of those were the targets of pings. A
-- typeahead over it would let anybody enumerate who has been pinged, one
-- letter at a time. docs/SECURITY.md: nothing in the product may state or
-- imply anything about another person's activity. So the cache is only ever
-- read for a handle the person has typed in full, and the suggestions here
-- come from wall_index alone, which is public on purpose (0032): a name on
-- the wall is a name somebody wrote a letter to, in public, and the profile
-- fields are joined onto those names and never the other way round.
--
-- Re-runnable: create or replace throughout.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. wall_search ───────────────────────────────────────────────────────────
create or replace function wall_search(p_query text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(t order by t.rank, t.letters desc, t.last_at desc, t.len), '[]'::jsonb)
  from (
    select i.target_handle                         as handle,
           i.letters,
           i.last_at,
           i.campus,
           -- the resolver's answer for this name, when it has one. `known`
           -- is the fact the browser keys off: a name the resolver never saw
           -- draws its monogram and is not marked found.
           (p.handle is not null)                  as known,
           p.display_name,
           coalesce(p.is_verified, false)          as is_verified,
           p.avatar_path,
           case when i.target_handle = q.h then 0
                when left(i.target_handle, char_length(q.h)) = q.h then 1
                else 2 end                          as rank,
           char_length(i.target_handle)            as len
      from (select celestual_norm(p_query) as h) q
      join wall_index i on strpos(i.target_handle, q.h) > 0
      left join ig_profiles p on p.handle = i.target_handle
     where q.h is not null and char_length(q.h) >= 1
     order by rank, i.letters desc, i.last_at desc, len
     limit 12
  ) t;
$$;

revoke all on function wall_search(text) from public;
grant execute on function wall_search(text) to anon, authenticated, service_role;

comment on function wall_search(text) is
  '0040: the public index, from the first character. Exact, then prefix, then contains; the resolver''s name, badge and face path joined on. Never the cache on its own.';

-- ── 2. wall_pulse ────────────────────────────────────────────────────────────
-- One row about one campus: open or not, and how much is on the wall. Reads
-- the same index the wall is drawn from, so the number the front door prints
-- is the number the wall prints. Null for a campus that does not exist, which
-- the browser reads as nothing to pin up.
create or replace function wall_pulse(p_campus text default 'berkeley')
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok',      true,
    'campus',  c.slug,
    'name',    c.name,
    'open',    c.is_open,
    'names',   (select count(*)                   from wall_index i where i.campus = c.slug),
    'letters', (select coalesce(sum(i.letters), 0) from wall_index i where i.campus = c.slug),
    'last_at', (select max(i.last_at)             from wall_index i where i.campus = c.slug)
  )
  from wall_campuses c
  where c.slug = lower(btrim(coalesce(p_campus, '')));
$$;

revoke all on function wall_pulse(text) from public;
grant execute on function wall_pulse(text) to anon, authenticated, service_role;

comment on function wall_pulse(text) is
  '0040: whether a campus''s wall is open and how much is on it. The front door''s notice reads this and nothing else.';
