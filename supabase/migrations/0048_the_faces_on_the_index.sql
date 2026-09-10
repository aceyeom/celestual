-- ─────────────────────────────────────────────────────────────────────────────
-- 0048: the faces on the index.
--
-- One thing. The public index carries the resolver's answer for every name on
-- it, the way the search has since 0040 and the letter reads have since 0042:
-- `known`, the display name, the badge, and the path to the stored face.
--
-- ── why ──────────────────────────────────────────────────────────────────────
-- The wall is drawn off one select on this view, and until now that select
-- carried a handle and a count and nothing else. Every face on the field was
-- then a second question: the browser batched the handles into a peek, sent
-- it through the Vercel function into the edge function into ig_profile_peek
-- and back, and only THEN could a single picture start to download. On a
-- phone that was the beat everybody saw: the wall up, sixty grey discs, and
-- the faces arriving a second later. The index answers both questions in one
-- read now, so the first thing the browser does with a name is fetch its
-- picture, and the intro can hold until the pictures on the first screen are
-- actually there (app/src/wall/index.jsx).
--
-- ── what is disclosed, and why nothing new is ────────────────────────────────
-- Exactly what wall_search discloses, for exactly the same rows. The index is
-- the list of names on the wall, public on purpose (0032), and the search has
-- joined the resolver's fields onto those names since 0040 for anybody typing
-- one letter. The rule from 0040 still holds and is still the only rule: the
-- profile fields are joined ONTO the public names, never the other way round.
-- The cache itself (ig_profiles) is not listed, has no grant, and nothing
-- here reads a handle that is not already on the wall.
--
-- ── definer semantics, restated ──────────────────────────────────────────────
-- 0032 created this view `security_invoker = true` over tables anon cannot
-- read, and the browser got "permission denied for table wall_letters" for
-- its trouble; 0038 flipped it to false, which is what production runs. The
-- join below reads ig_profiles, which anon cannot read either, so the ruling
-- is restated here rather than inherited: the view answers as its owner, and
-- what it answers with is the redaction.
--
-- `create or replace view` may add columns at the end and nowhere else, so the
-- four columns 0032 defined keep their names, their types and their order.
--
-- Re-runnable.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view wall_index
  with (security_invoker = false) as
  select l.target_handle,
         l.campus,
         count(*)::int                    as letters,
         max(l.created_at)                as last_at,
         -- the resolver's answer for this name, when it has one. `known` is
         -- the fact the browser keys off: a name the resolver never saw draws
         -- its monogram and is not marked found on the strength of being on
         -- a wall.
         (p.handle is not null)           as known,
         coalesce(p.display_name, '')     as display_name,
         coalesce(p.is_verified, false)   as is_verified,
         p.avatar_path
    from wall_letters l
    join wall_campuses c on c.slug = l.campus and c.is_open
    left join ig_profiles p on p.handle = l.target_handle
   where l.status = 'live' and l.expires_at > now()
   group by l.target_handle, l.campus, p.handle, p.display_name, p.is_verified, p.avatar_path;

grant select on wall_index to anon, authenticated;

comment on view wall_index is
  '0032, 0038, 0048: the public index. A handle, a count, when the last letter arrived, and the resolver''s name, badge and face path for it. No body, no author, no seal, ever.';
