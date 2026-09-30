-- ─────────────────────────────────────────────────────────────────────────────
-- 0077_the_mutual_has_one_face.sql
--
-- The mutual has one face, and it is the two of theirs.
--
-- ── the owner's ruling of 29 September ──────────────────────────────────────
-- "Put the battery sign at the top of the card, not for each message card in
-- the reveal section. Perhaps have an option to change the mutual card design
-- and perhaps the entire card's battery sign (hidden untold mechanism). And
-- these changes will be instantly viewable to the other person. Perhaps also
-- add a feature to see if they've opened up the mutual letters."
--
-- A told mutual was, until this file, two frozen copies and nothing else:
-- each side's row, or its keepsake (0072), holding that side's words and the
-- other side's as they were told, and nothing either of the two could change
-- that the other would see. The keepsake is one phone the two of them hold
-- (app/src/wall/Keepsake.jsx, the pair's seed, the same faults on both
-- glasses), and now it is one phone in the way that matters: the colour it
-- is lit in and the charge of the one battery on its band are the pair's,
-- set by either of them and seen by both, and each of them can see whether
-- the other has opened it since it was told. Three things, and nothing more,
-- in one row a pair:
--
--   the colour   one of the lit screens (looks.js `COLOURS`, the `lit`
--                kind), the rose until one of them chooses another. Checked
--                here against the list the keepsake can wear, below, and a
--                colour off it is refused, never stored.
--   the battery  a whole number of bars, 0 to 4, full until one of them
--                taps it. Nothing on the phone says it can be tapped or that
--                the other person sees it move: the owner's untold
--                mechanism. It counts nothing.
--   opened       when each side first opened the mutual after it was last
--                told. The keepsake says `delivered` under your note until
--                the other side has, and `opened` after (Keepsake.jsx).
--
-- `set_by` is which of the two sides set the colour or the battery last and
-- `set_at` when, as a letter, 'a' or 'b', never a handle, so erasing one of
-- a person's linked @s leaves nothing of it behind in a row that names the
-- other. `topic` is an unguessable name for the nudge (below).
--
-- ── the pair, found by the server ───────────────────────────────────────────
-- The browser never holds a key to the pair. Every door here takes the
-- caller's @ and its proof, and the other @, and finds the pair itself:
-- first that the other @ is one the caller's own told mutual names, exactly
-- (below), then that the caller holds a told mutual with that @ now (a told
-- row of theirs, or a keepsake, from any of their @s to any of the other's,
-- through celestual_group, the way celestual_mutual_forget finds the nights
-- it takes off), and then the row whose two handles are one of each
-- person's, found
-- the same way, the oldest if two of their @s ever made two, so both sides
-- always come to the same one. A row is made the first time either of them
-- asks, on the two @s that asked, in order. So the face is the two people's
-- and not one pair of @s': a person with two linked @s sees one colour on
-- the mutual from either, and a pair told a second time, after writing
-- again, keeps the colour and the battery it had.
--
-- What does belong to one telling is `opened`. The two sides' nights are one
-- night at a Saturday reveal, and can be two when a note is told at once
-- onto a pair already told (0072, two handles linked as one), so opened is
-- kept as a moment and not as a night: `a_opened_at` is when side a first
-- opened the mutual after the pair's latest night on either side, and it is
-- written again only when a night later than it has come; and a reader is
-- told the other side has opened theirs when that moment is at or after the
-- reader's own latest night. A pair told again starts at `delivered` on both
-- sides until each opens it again. A browser that drew an older night than
-- the one the server has now (the reveal ran between the list and the
-- opening) marks nothing (`p_told`, as forget takes it): opening last week's
-- mutual is not opening this one.
--
-- ── the other @, as the caller's own list names it ──────────────────────────
-- The caller's side of the pair is read through their own group, since
-- which @s are theirs is theirs to know. The other side's is not: an @ the
-- caller names is taken only when it is exactly the @ one of the caller's
-- own told rows or keepsakes names, the @ they wrote to (its hash, as the
-- row holds it) or the @ that wrote back and made it a mutual
-- (`matched_handle`, the one the list shows; a keepsake's `other_hash` and
-- `other_handle`, which are the same two). It is never widened through the
-- other person's links. If it were, anybody holding a told mutual could ask
-- here about any @ at all and be answered with the face for every @ their
-- partner has privately linked and `none` for every other: which @s are one
-- person, and that each of them is a proved member, read without writing
-- and as often as they liked. Once the @ is one of those two, the pair is
-- the two people's as below, and every @ that is not is answered `none`, the
-- same answer, byte for byte, as every other refusal here.
--
-- ── the doors ───────────────────────────────────────────────────────────────
--   celestual_mutual_face(handle, proof, them)
--     the face as it stands: { ok, tint, bat, at, topic, opened, opened_at },
--     `opened` whether the OTHER side has opened the mutual since the
--     caller's own latest night and `opened_at` when, or null. The first ask
--     of either side makes the row.
--   celestual_mutual_face_set(handle, proof, them, tint, bat)
--     either or both, a null leaving that one as it is; answers the face as
--     it stands after. A colour off the list or a battery outside 0 to 4 is
--     `invalid` and changes nothing.
--   celestual_mutual_seen(handle, proof, them, told)
--     the caller's side has opened it: first time wins, so a second call
--     changes nothing until the pair is told again. Answers the face.
--
-- Each is proof gated (celestual_consume_ig_proof, the thirty day sliding
-- session, so the keepsake asking every few seconds while it is open costs
-- a lookup), runs the reveal after the proof as every door here does, and
-- answers { ok: false, error: 'unverified' } to a proof it refuses and
-- { ok: false, error: 'none' } to anybody who does not hold a told mutual
-- with that @ now, by that @. That second answer is one answer, byte for
-- byte, whether the caller never wrote to them, wrote and it lapsed, wrote
-- and is waiting, took the mutual off, named an @ nobody has ever proved,
-- or named an @ their partner has linked that their own list never named:
-- whether the other person is on celestual at all, and which @s are one
-- person, is never said here, as it is never said anywhere
-- (docs/SECURITY.md, 0072's header).
--
-- ── why it is the two of theirs, and nobody else's ──────────────────────────
-- This is new information between two people, and it only ever flows
-- between the two people of a told mutual: both of them wrote, both were
-- told, and the colour, the battery and the opening are things each of them
-- does on the one thing they now share. Nothing of it is public: no view
-- reads the table, no policy, no grant, and the picture passed round
-- (keepshare.js) carries the colour and the battery and nothing that says
-- who set either, whether anybody opened anything, or who the two are
-- beyond the first names it always had.
--
-- The list is untouched. `celestual_my_pings` answers as 0072 wrote it (and
-- as the files after it write it), so every answer test-mutual-kept.sql
-- holds byte for byte is still what it was: writing again, keeping and
-- taking off tell the other side nothing through the list, and they tell
-- nothing through here either. Taking the mutual off (celestual_mutual_forget)
-- takes the caller's own told nights, so every door here answers them
-- `none` after, and they can neither read the face nor move it. The other
-- side sees nothing change: the row is not touched by the forgetting, the
-- colour and the battery stay where they were, their view of whether the
-- forgetter had opened it stays what it was, and the topic stays the same
-- (a new one would be a change they could see). The face simply stops
-- changing, which is what a face does when one of the two stops touching
-- it, and says nothing about why.
--
-- The nudge. A change has to reach the other person while their keepsake is
-- open, and the wall's way is a Realtime broadcast that says something moved
-- and nothing else (wall/api.js `subscribeWall`): the browser that set the
-- colour or the battery, or opened the mutual, sends `moved` on the channel
-- `mutual:<topic>`, with no payload, and the other side's keepsake reads the
-- face again through the proof gated door here. The topic is a random uuid
-- the face hands only to the two of them; a person who learns it learns when
-- somebody touched the face and nothing of what, since every value comes
-- back only through the proof. SQL cannot broadcast without pg_net, and a
-- nudge from the browser that made the change costs nothing to anybody else.
--
-- ── erasure ─────────────────────────────────────────────────────────────────
-- A face goes the way the keepsakes go (0072 section 12): every row naming
-- the handle, as either of its two @s. celestual_keepsake_forget is
-- redefined here, 0072's body word for word and the faces after it, so
-- erasure, the opt out and the desk's delete (and so the ban), which all
-- come through celestual_billing_forget after the rows, take the faces too.
-- A mutual the erased person was in has no told rows left on either side
-- after that, so the other person's keepsake of it is gone with it, and
-- their next ask here answers `none`.
--
-- Idempotent, like every migration here: the table if it is not there, its
-- colour check dropped and added again by name, every function created or
-- replaced, and the grants restated.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the faces ─────────────────────────────────────────────────────────────
create table if not exists celestual_mutual_faces (
  id          uuid        primary key default gen_random_uuid(),
  handle_a    text        not null,
  handle_b    text        not null,
  tint        text        not null default 'rose',
  bat         smallint    not null default 4 check (bat between 0 and 4),
  set_by      text        check (set_by in ('a', 'b')),
  set_at      timestamptz,
  topic       uuid        not null default gen_random_uuid(),
  a_opened_at timestamptz,
  b_opened_at timestamptz,
  created_at  timestamptz not null default now(),
  check (handle_a < handle_b),
  unique (handle_a, handle_b),
  unique (topic)
);
comment on table celestual_mutual_faces is
  '0077: a told mutual''s one face, the two people''s: the colour the keepsake is lit in, the charge of the battery on its band, which side set either last and when, a topic for the content free nudge, and when each side first opened the mutual after its latest night. One row a pair of people, found through celestual_group. Read and written only through the proof gated doors. Service role only.';
comment on column celestual_mutual_faces.handle_a is
  '0077: the lesser of the two @s that first asked, one of each person''s; the row is found by either person''s group, whichever of their @s asks.';
comment on column celestual_mutual_faces.tint is
  '0077: the lit screen the keepsake wears (looks.js COLOURS, kind lit): celestual_mutual_tints().';
comment on column celestual_mutual_faces.bat is
  '0077: the battery on the keepsake''s band, 0 to 4 bars; the untold mechanism, counting nothing.';
comment on column celestual_mutual_faces.set_by is
  '0077: which side, a or b, set the colour or the battery last; a letter, never a handle.';
comment on column celestual_mutual_faces.topic is
  '0077: the name of the Realtime channel the two keepsakes nudge each other on (mutual:<topic>); the nudge carries nothing.';
comment on column celestual_mutual_faces.a_opened_at is
  '0077: when side a first opened the mutual after the pair''s latest night; read by side b as opened when it is at or after b''s own latest night.';

-- The colours the keepsake can wear: the lit screens. A print is pulled
-- through a press whose four inks the keepsake's small screens (a panel of
-- `--s-hi` over the glass, a strip of `--s-lo`) would come out of as bands
-- of flat ink, and the negative's panel is darker than its ink; the lit ones
-- are all one arithmetic on one hue (looks.js `skinOf`), and each was looked
-- at on the keepsake, on a phone and on a desk, before it was put here.
create or replace function celestual_mutual_tints() returns text[]
language sql immutable set search_path = public as $$
  select array['night', 'white', 'ice', 'green', 'amber', 'rose', 'lilac']
$$;

alter table celestual_mutual_faces drop constraint if exists celestual_mutual_faces_tint_ok;
alter table celestual_mutual_faces add constraint celestual_mutual_faces_tint_ok
  check (tint = any (array['night', 'white', 'ice', 'green', 'amber', 'rose', 'lilac']));

alter table celestual_mutual_faces enable row level security;
revoke all on celestual_mutual_faces from public, anon, authenticated;

-- ── 2. the told mutual, as one side holds it ────────────────────────────────
-- The latest night this person's side of the pair was told on, from any of
-- their @s to any of the other's: a told row still here or a keepsake, as
-- celestual_mutual_forget reads it. Null when they hold no told mutual with
-- that @, which every door here answers as `none`. Internal.
create or replace function celestual_mutual_told(p_me text, p_them text) returns timestamptz
language sql stable security definer set search_path = public as $$
  select max(x.t)
    from (select e.matched_at as t from celestual_entries e
           where e.from_handle in (select celestual_group(p_me))
             and e.to_hash in (select celestual_hash_handle(g) from celestual_group(p_them) g)
             and e.matched_at is not null
          union all
          select k.told_at from celestual_keepsakes k
           where k.handle in (select celestual_group(p_me))
             and k.other_hash in (select celestual_hash_handle(g) from celestual_group(p_them) g)) x
$$;

-- Whether the other @ is exactly one that a told row or a keepsake of the
-- caller's names: the @ it was written to, by its hash, or the @ that wrote
-- back and made it a mutual, which the caller's list already shows them.
-- Only a told one, since a note still waiting says nothing about who is
-- linked to whom and naming one would be a way to ask. The caller's own @s
-- are read through their group; the other @ never is, so a handle linked to
-- the partner that no row of the caller's names is not taken here (the
-- header). Internal.
create or replace function celestual_mutual_named(p_me text, p_them text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from celestual_entries e
                  where e.from_handle in (select celestual_group(p_me))
                    and e.matched_at is not null
                    and (e.to_hash = celestual_hash_handle(p_them) or e.matched_handle = p_them))
      or exists (select 1 from celestual_keepsakes k
                  where k.handle in (select celestual_group(p_me))
                    and (k.other_hash = celestual_hash_handle(p_them) or k.other_handle = p_them))
$$;

-- ── 3. the pair's row ────────────────────────────────────────────────────────
-- Found by the two people's groups, the oldest if there are two, and made on
-- the two @s asking when there is none. Two sides asking for the first time
-- at once make one row: the second waits on the first's, finds it there, and
-- reads it. Internal; the caller has checked the proof and the mutual.
create or replace function celestual_mutual_face_row(p_me text, p_them text)
returns celestual_mutual_faces
language plpgsql security definer set search_path = public as $$
declare
  f celestual_mutual_faces;
begin
  select * into f from celestual_mutual_faces m
   where (m.handle_a in (select celestual_group(p_me)) and m.handle_b in (select celestual_group(p_them)))
      or (m.handle_a in (select celestual_group(p_them)) and m.handle_b in (select celestual_group(p_me)))
   order by m.created_at, m.id
   limit 1;
  if found then return f; end if;
  insert into celestual_mutual_faces (handle_a, handle_b)
  values (least(p_me, p_them), greatest(p_me, p_them))
  on conflict (handle_a, handle_b) do nothing;
  select * into f from celestual_mutual_faces m
   where (m.handle_a in (select celestual_group(p_me)) and m.handle_b in (select celestual_group(p_them)))
      or (m.handle_a in (select celestual_group(p_them)) and m.handle_b in (select celestual_group(p_me)))
   order by m.created_at, m.id
   limit 1;
  return f;
end;
$$;

-- Which side of the row the caller is: the side whose @ is one of theirs
create or replace function celestual_mutual_side(f celestual_mutual_faces, p_me text) returns text
language sql stable security definer set search_path = public as $$
  select case when f.handle_a in (select celestual_group(p_me)) then 'a' else 'b' end
$$;

-- ── 4. the answer ────────────────────────────────────────────────────────────
-- The face, as the caller is told it: the colour, the battery, when either
-- was last set (or when the face was made), the topic, and whether the
-- OTHER side has opened the mutual since the caller's own latest night, and
-- when. Never which side set anything, and never the caller's own opening,
-- which they know. Internal.
create or replace function celestual_mutual_face_answer(f celestual_mutual_faces, p_side text, p_told timestamptz)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'ok', true,
    'tint', f.tint,
    'bat', f.bat,
    'at', to_char(coalesce(f.set_at, f.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'topic', f.topic,
    'opened', coalesce(o.at >= p_told, false),
    'opened_at', case when o.at >= p_told
                      then to_char(o.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end)
    from (select case when p_side = 'a' then f.b_opened_at else f.a_opened_at end as at) o
$$;

-- The one refusal every door gives anybody without a told mutual with that
-- @ now, whatever the reason
create or replace function celestual_mutual_face_none() returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object('ok', false, 'error', 'none')
$$;

-- ── 5. the doors ─────────────────────────────────────────────────────────────
create or replace function celestual_mutual_face(p_handle text, p_proof text, p_them text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  nt text := celestual_norm(p_them);
  v_told timestamptz;
  f celestual_mutual_faces;
begin
  if nh is null or nt is null then raise exception 'invalid handle'; end if;
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();
  if nt in (select celestual_group(nh)) then return celestual_mutual_face_none(); end if;
  if not celestual_mutual_named(nh, nt) then return celestual_mutual_face_none(); end if;
  v_told := celestual_mutual_told(nh, nt);
  if v_told is null then return celestual_mutual_face_none(); end if;
  f := celestual_mutual_face_row(nh, nt);
  return celestual_mutual_face_answer(f, celestual_mutual_side(f, nh), v_told);
end;
$$;

create or replace function celestual_mutual_face_set(
  p_handle text, p_proof text, p_them text, p_tint text default null, p_bat integer default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  nt text := celestual_norm(p_them);
  v_told timestamptz;
  v_side text;
  f celestual_mutual_faces;
begin
  if nh is null or nt is null then raise exception 'invalid handle'; end if;
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();
  -- what is asked for says nothing about the other person, so it is read
  -- first: a colour off the list, or a battery outside its four bars
  if (p_tint is not null and not (p_tint = any (celestual_mutual_tints())))
     or (p_bat is not null and (p_bat < 0 or p_bat > 4)) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if nt in (select celestual_group(nh)) then return celestual_mutual_face_none(); end if;
  if not celestual_mutual_named(nh, nt) then return celestual_mutual_face_none(); end if;
  v_told := celestual_mutual_told(nh, nt);
  if v_told is null then return celestual_mutual_face_none(); end if;
  f := celestual_mutual_face_row(nh, nt);
  v_side := celestual_mutual_side(f, nh);
  if p_tint is not null or p_bat is not null then
    update celestual_mutual_faces
       set tint = coalesce(p_tint, tint), bat = coalesce(p_bat::smallint, bat),
           set_by = v_side, set_at = now()
     where id = f.id
    returning * into f;
  end if;
  return celestual_mutual_face_answer(f, v_side, v_told);
end;
$$;

create or replace function celestual_mutual_seen(
  p_handle text, p_proof text, p_them text, p_told timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  nt text := celestual_norm(p_them);
  v_told timestamptz;
  v_pair timestamptz;
  v_side text;
  f celestual_mutual_faces;
begin
  if nh is null or nt is null then raise exception 'invalid handle'; end if;
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'error', 'unverified');
  end if;
  perform celestual_reveal_due();
  if nt in (select celestual_group(nh)) then return celestual_mutual_face_none(); end if;
  if not celestual_mutual_named(nh, nt) then return celestual_mutual_face_none(); end if;
  v_told := celestual_mutual_told(nh, nt);
  if v_told is null then return celestual_mutual_face_none(); end if;
  f := celestual_mutual_face_row(nh, nt);
  v_side := celestual_mutual_side(f, nh);
  -- the night the screen drew, to the second, as the list said it; one told
  -- since is one this person has not opened yet
  if p_told is null
     or v_told <= date_trunc('second', p_told) + interval '1 second' - interval '1 microsecond' then
    -- the pair's latest night on either side, so an opening from before a
    -- night told at once onto the pair is written again by the next one
    v_pair := greatest(v_told, celestual_mutual_told(nt, nh));
    if v_side = 'a' then
      update celestual_mutual_faces set a_opened_at = now()
       where id = f.id and (a_opened_at is null or a_opened_at < v_pair)
      returning * into f;
    else
      update celestual_mutual_faces set b_opened_at = now()
       where id = f.id and (b_opened_at is null or b_opened_at < v_pair)
      returning * into f;
    end if;
    if not found then f := celestual_mutual_face_row(nh, nt); end if;
  end if;
  return celestual_mutual_face_answer(f, v_side, v_told);
end;
$$;

-- ── 6. erasure ───────────────────────────────────────────────────────────────
-- celestual_keepsake_forget, as 0072 wrote it, and every face naming the
-- handle after the keepsakes. Internal; celestual_billing_forget calls it.
create or replace function celestual_keepsake_forget(p_handle text) returns void
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
begin
  if nh is null then return; end if;
  delete from celestual_keepsakes
   where handle = nh or other_hash = celestual_hash_handle(nh) or other_handle = nh;
  update celestual_keepsakes
     set their_card = null, their_photo = null, their_handle = null
   where their_handle = nh;
  delete from celestual_mutual_faces where handle_a = nh or handle_b = nh;
end;
$$;

comment on function celestual_mutual_face(text, text, text) is
  '0077: the told mutual''s one face, as this side is told it: colour, battery, when set, the nudge''s topic, and whether the other side has opened it since this side''s latest night. Proof gated; none to anybody without a told mutual with that @ now.';
comment on function celestual_mutual_face_set(text, text, text, text, integer) is
  '0077: set the pair''s colour (a lit screen, celestual_mutual_tints) and or its battery (0 to 4). Proof gated; invalid for a value off the list; none without a told mutual.';
comment on function celestual_mutual_seen(text, text, text, timestamptz) is
  '0077: this side has opened the mutual: first time wins until the pair is told again, and a screen that drew an older night than the latest marks nothing. Proof gated; none without a told mutual.';

-- ── 7. grants ────────────────────────────────────────────────────────────────
-- The browser's: the three doors, behind the proof. Nobody's from outside:
-- the table, the helpers the doors read it with, and forgetting on erasure.
revoke all on function celestual_mutual_face(text, text, text) from public;
grant execute on function celestual_mutual_face(text, text, text) to anon, authenticated;
revoke all on function celestual_mutual_face_set(text, text, text, text, integer) from public;
grant execute on function celestual_mutual_face_set(text, text, text, text, integer) to anon, authenticated;
revoke all on function celestual_mutual_seen(text, text, text, timestamptz) from public;
grant execute on function celestual_mutual_seen(text, text, text, timestamptz) to anon, authenticated;

revoke all on function celestual_mutual_tints()                                              from public, anon, authenticated;
revoke all on function celestual_mutual_told(text, text)                                     from public, anon, authenticated;
revoke all on function celestual_mutual_named(text, text)                                    from public, anon, authenticated;
revoke all on function celestual_mutual_face_row(text, text)                                 from public, anon, authenticated;
revoke all on function celestual_mutual_side(celestual_mutual_faces, text)                   from public, anon, authenticated;
revoke all on function celestual_mutual_face_answer(celestual_mutual_faces, text, timestamptz) from public, anon, authenticated;
revoke all on function celestual_mutual_face_none()                                          from public, anon, authenticated;
revoke all on function celestual_keepsake_forget(text)                                       from public, anon, authenticated;
revoke all on function celestual_billing_forget(text)                                        from public, anon, authenticated;
