-- ─────────────────────────────────────────────────────────────────────────────
-- 0067: the wall, sorted.
--
-- The owner, 26 September: "Add a filtering mechanism, to see only Berkeley,
-- newest, most liked, these kind of things. Make it clean." The wall's field
-- is drawn from one public read, `wall_index_all` (0063), a row per name, and
-- the four ways to look at it (every name, the newest, the most liked, the
-- ones with a letter from Berkeley) are four orders and three cuts of that
-- one read. So the read carries what they need, per name, and the browser
-- sorts and cuts it (app/src/wall/data.js, the filter):
--
--   last_at      when the newest letter under the name went up. It was
--                always there, and it is the newest filter's order
--   hearts       every heart on every letter standing under the name, the
--                count each letter shows added together: the letter's seeded
--                hearts (0059) and the ones people pressed (0042), never
--                either on its own. The most liked filter's order
--   berkeley     how many of the letters standing under the name went up
--                from a verified Berkeley address, which is the letter that
--                carries the Cal sticker (0063 `verified`). The Berkeley
--                filter's cut
--   berkeley_at  when the newest of those went up, and its order
--
-- ── what it discloses ───────────────────────────────────────────────────────
-- Nothing a reader cannot already count off the wall. Every letter shows its
-- hearts on its own screen and carries its sticker on its face, to anybody,
-- sealed or open; this is the same numbers added up under the name. No
-- author, no body and no heart's person, ever: a heart is still counted and
-- never listed, and the view reads `wall_hearts` as its owner, as it reads
-- everything else, so that table's grants do not move.
--
-- ── backward compatible ─────────────────────────────────────────────────────
-- The four columns are added at the END of the view, after every column
-- 0063 declared, in the same order, with the same types, which is the one
-- change `create or replace view` allows and the reason it is safe: a tab on
-- the deployed build asks for its columns by name and is answered exactly as
-- before, and `wall_pulse_all` and `wall_search`, which read the view, read
-- the columns they always read. A build that asks for the new columns of a
-- database without them is refused and steps down to the columns it knows
-- (api.js `ALL_TIERS`). `wall_index`, the per-campus view the oldest tabs
-- read, is untouched.
--
-- Re-runnable: one `create or replace view`, the grant and the comment.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view wall_index_all
  with (security_invoker = false) as
  select l.target_handle,
         (array_agg(l.campus order by l.created_at desc))[1]      as campus,
         count(*)::int                                            as letters,
         max(l.created_at)                                        as last_at,
         (p.handle is not null)                                   as known,
         coalesce(p.display_name, '')                             as display_name,
         coalesce(p.is_verified, false)                           as is_verified,
         p.avatar_path,
         min(l.target_kind)                                       as kind,
         (array_agg(l.target_name order by l.created_at desc))[1] as name,
         (array_agg(l.look order by l.created_at desc))[1]        as look,
         (array_agg(l.verified order by l.created_at desc))[1]    as verified,
         (array_agg(case when c.edu_domain is not null then c.name end
                    order by l.created_at desc))[1]               as school,
         -- 0067: the filter's numbers
         coalesce(sum(l.hearts_seed + h.n), 0)::int               as hearts,
         (count(*) filter (where l.campus = 'berkeley' and l.verified))::int
                                                                  as berkeley,
         max(l.created_at) filter (where l.campus = 'berkeley' and l.verified)
                                                                  as berkeley_at
    from wall_letters l
    join wall_campuses c on c.slug = l.campus and c.is_open
    left join ig_profiles p on p.handle = l.target_handle and l.target_kind = 'handle'
    -- a letter's pressed hearts, counted off the primary key (letter_id, user_id)
    cross join lateral (
      select count(*)::int as n from wall_hearts hh where hh.letter_id = l.id
    ) h
   where l.status = 'live' and l.expires_at > now()
   group by l.target_handle, p.handle, p.display_name, p.is_verified, p.avatar_path;

grant select on wall_index_all to anon, authenticated;

comment on view wall_index_all is
  '0063: the one wall''s index. wall_index''s columns grouped by the key alone, with the newest letter''s campus, verified and school. 0067: and the filter''s numbers, hearts (seeded and pressed, summed over the standing letters), berkeley (letters from a verified Berkeley address) and berkeley_at. No body, no author, no seal, ever.';
