-- ─────────────────────────────────────────────────────────────────────────────
-- 0054: the search hears a name.
--
-- wall_search has matched the normalised handle since 0040: exact, then the
-- handles that start with what was typed, then the ones that contain it. A
-- person who scans the wall off a flyer is looking for themselves, and they
-- type what they are called: "sofia", "Sofia Reyes", "sofía", "sophia", and
-- the browser stripped the space and the accent before the server ever saw
-- them, then asked whether any handle contained "sofiareyes". It did not.
--
-- The search reads three strings per name on the index now, and the browser
-- sends the query as it was typed:
--
--   the handle           as before: exact, prefix, contains
--   the handle, dotless  so "sofiareyes" reaches "sofiaaa.reyes" by shape
--   the name             the resolver's display name for a handle, or the
--                        name as written for a first name letter (0053),
--                        folded the same way on both sides (wall_fold):
--                        lower, accents out, punctuation to spaces. Exact,
--                        then a word that starts with what was typed, then
--                        contains
--
-- and, from the third character, two kinds of nearness:
--
--   pg_trgm              word_similarity of the typed text against the
--                        folded name, and similarity of the dotless handles,
--                        so "soffia", "sofiaa" and "sofiareyes" land
--   fuzzystrmatch        double metaphone, word against word, so "sophia"
--                        hears "sofia" and "reyez" hears "reyes"
--
-- Rank: an exact key or name first, then a prefix, then a contains, then the
-- near misses, and inside a tier by how near, then by letters, then by
-- recency, then the shorter key. Twelve rows. No score is returned.
--
-- ── what it still will not do ───────────────────────────────────────────────
-- The line 0040 drew is the line. Every candidate is a row of wall_index,
-- which is public on purpose, and the resolver's fields ride on those rows
-- and never the other way round: a display name in ig_profiles for a handle
-- nobody has written to is never returned, by any spelling, at any
-- similarity. A first name letter's row carries `known: false` whatever the
-- resolver holds under a handle of the same spelling, because the join is
-- restricted to handle rows (0053). No nickname table: the wall does not
-- decide that Alex is Alexandra, because that is an inference about a person
-- and not a fact about a string. One or two characters match a prefix and
-- nothing looser, so a single letter does not list the wall.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;

create or replace function wall_search(p_query text)
returns jsonb
language sql stable security definer set search_path = public, extensions as $$
  with q as (
    select celestual_norm(p_query)                                              as h,
           nullif(wall_fold(p_query), '')                                       as f,
           regexp_replace(coalesce(celestual_norm(p_query), ''), '[._]', '', 'g') as hd,
           char_length(coalesce(nullif(wall_fold(p_query), ''), celestual_norm(p_query), '')) as n
  ),
  rows as (
    select i.target_handle, i.campus, i.letters, i.last_at, i.known, i.display_name,
           i.is_verified, i.avatar_path, i.kind, i.name,
           q.h, q.f, q.hd, q.n,
           regexp_replace(i.target_handle, '[._~]', '', 'g')                         as ihd,
           wall_fold(case when i.kind = 'name' then i.name else i.display_name end)  as iname
      from wall_index i, q
     where q.h is not null or q.f is not null
  ),
  scored as (
    select r.*,
      case
        when r.h is not null and r.target_handle = r.h                                  then 0
        when r.f is not null and r.iname <> '' and r.iname = r.f                        then 0
        when r.h is not null and left(r.target_handle, char_length(r.h)) = r.h          then 1
        when r.f is not null and r.iname <> ''
             and (left(r.iname, char_length(r.f)) = r.f or r.iname like '% ' || r.f || '%') then 1
        when r.h is not null and strpos(r.target_handle, r.h) > 0                       then 2
        when r.hd <> '' and strpos(r.ihd, r.hd) > 0                                     then 2
        when r.f is not null and r.iname <> '' and strpos(r.iname, r.f) > 0             then 2
        when r.n >= 3 and r.f is not null and r.iname <> ''
             and word_similarity(r.f, r.iname) >= 0.45                                  then 3
        when r.n >= 3 and r.hd <> '' and similarity(r.hd, r.ihd) >= 0.35                then 3
        when r.n >= 3 and r.f is not null and r.iname <> '' and exists (
               select 1
                 from unnest(string_to_array(r.iname, ' ')) w(word),
                      unnest(string_to_array(r.f, ' '))     v(typed)
                where char_length(v.typed) >= 3
                  and char_length(dmetaphone(v.typed)) >= 2
                  and dmetaphone(v.typed) = dmetaphone(w.word))                        then 3
        else null end as rank,
      greatest(
        case when r.f is not null and r.iname <> '' then word_similarity(r.f, r.iname) else 0 end,
        case when r.hd <> '' then similarity(r.hd, r.ihd) else 0 end) as score
    from rows r
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'handle',       s.target_handle,
           'letters',      s.letters,
           'last_at',      s.last_at,
           'campus',       s.campus,
           'known',        s.known,
           -- null, not '', for a name the resolver never saw: the answer 0040
           -- gave and the shape the browser and the tests read
           'display_name', case when s.known then s.display_name end,
           'is_verified',  s.is_verified,
           'avatar_path',  s.avatar_path,
           'kind',         s.kind,
           'name',         s.name)
         order by s.rank, s.score desc, s.letters desc, s.last_at desc, char_length(s.target_handle)), '[]'::jsonb)
    from (
      select * from scored
       where rank is not null
       order by rank, score desc, letters desc, last_at desc, char_length(target_handle)
       limit 12
    ) s;
$$;

revoke all on function wall_search(text) from public;
grant execute on function wall_search(text) to anon, authenticated, service_role;

comment on function wall_search(text) is
  '0054: the public index, as typed. The handle exact, prefix and contains; the folded name (the resolver''s for a handle, the writer''s for a first name) exact, word prefix and contains; from three characters, trigram nearness and double metaphone. Rows of wall_index and nothing else, ever.';
