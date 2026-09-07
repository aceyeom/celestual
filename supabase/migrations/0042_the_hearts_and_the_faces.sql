-- ─────────────────────────────────────────────────────────────────────────────
-- 0042_the_hearts_and_the_faces.sql
--
-- Two things, and both are about a letter on the wall being a little more
-- alive than a name and a body.
--
-- ── the hearts ───────────────────────────────────────────────────────────────
-- A letter can be hearted, once per person, by anybody through the campus
-- gate, and the card says how many did. It is the one thing on the wall a
-- reader can do that is not writing, reporting or taking down, and it is
-- deliberately small: a heart is a count, never a name. Nothing anywhere
-- returns who hearted what; the letter's own row carries the number and
-- whether THIS session is one of them, and that is the whole of it.
--
--   wall_hearts             one row per (letter, person). The person is the
--                           identity row, so a heart follows a merge and goes
--                           with an erasure, the way a letter does.
--   wall_heart(token, id, on)
--                           put one on, or take it off. Behind wall_gate for
--                           the same reason reading is: a heart on a letter
--                           you could not read is a heart on a redaction.
--   wall_letters_for, wall_letter
--                           carry `hearts` and `hearted` on every letter.
--
-- The merge rule in 0030 follows every foreign key to celestual_users, and
-- two rows that both hearted the same letter would collide on the primary
-- key here and turn the merge into a conflict for the desk. A heart is not
-- worth a merge, so a trigger folds the absorbed row's heart into the
-- survivor's when both exist. The tests assert it.
--
-- ── the faces ────────────────────────────────────────────────────────────────
-- Every face in the product is drawn by asking the resolver's cache about one
-- handle at a time, through a Vercel function and an edge function, per face,
-- on every screen. A sky with six rows was six round trips before a single
-- picture could start, and a letter's crest was one more. The reads that
-- already run carry the answer now, the way wall_search has since 0040: the
-- ping rows on celestual_my_pings and the letter rows on wall_letters_for and
-- wall_letter each ride with the resolver's name, badge and stored face for
-- the handle they name, and the browser learns them into its memo. A screen
-- draws with no second request. The peek itself takes a list, for the faces
-- that are not on a row anybody read: ig_profile_peek answers up to
-- twenty-four exact handles in one call, for the service role only.
--
-- Nothing new is disclosed. A ping row carries a handle its owner typed; a
-- letter row carries a handle that is on the public index; and the peek
-- answers only about handles typed in full, which is the rule the resolver
-- has always kept (docs/HANDLE-RESOLVER.md section 2, "it is not a
-- directory"). The cache is still never listed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. the hearts ────────────────────────────────────────────────────────────
create table if not exists wall_hearts (
  letter_id  uuid        not null references wall_letters (id) on delete cascade,
  user_id    uuid        not null references celestual_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (letter_id, user_id)
);

create index if not exists wall_hearts_user_idx on wall_hearts (user_id);

alter table wall_hearts enable row level security;
revoke all on wall_hearts from anon, authenticated;

comment on table wall_hearts is
  'One heart per (letter, person). Counted, never listed: no function returns who hearted what.';

-- The merge guard. celestual_user_merge (0030) rewrites user_id on every
-- table that references celestual_users, and where the survivor already
-- hearted the same letter the absorbed row's heart has nowhere to go. It is
-- dropped, and the update of that row is skipped, so the count stays one per
-- person and the merge goes through.
create or replace function wall_hearts_fold()
returns trigger
language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id and exists (
    select 1 from wall_hearts h where h.letter_id = new.letter_id and h.user_id = new.user_id
  ) then
    delete from wall_hearts where letter_id = old.letter_id and user_id = old.user_id;
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists wall_hearts_fold on wall_hearts;
create trigger wall_hearts_fold
  before update of user_id on wall_hearts
  for each row execute function wall_hearts_fold();

-- ── 2. wall_heart(token, letter, on) ─────────────────────────────────────────
-- Client-callable. Put a heart on a live letter, or take this person's off.
-- Idempotent both ways: a second press on a heart that is already there
-- changes nothing and answers the same count. Behind the campus gate, like
-- reading. Answers the count so the screen draws the truth and not its own
-- arithmetic.
create or replace function wall_heart(p_token text, p_letter uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_me uuid := celestual_session_user(p_token);
  l    wall_letters%rowtype;
  v_n  integer;
begin
  if v_me is null then return jsonb_build_object('ok', false, 'error', 'no_session'); end if;

  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  if not wall_gate(v_me, l.campus) then
    return jsonb_build_object('ok', false, 'error', 'gate');
  end if;

  if coalesce(p_on, true) then
    insert into wall_hearts (letter_id, user_id) values (l.id, v_me)
      on conflict (letter_id, user_id) do nothing;
  else
    delete from wall_hearts where letter_id = l.id and user_id = v_me;
  end if;

  select count(*)::int into v_n from wall_hearts h where h.letter_id = l.id;
  return jsonb_build_object('ok', true, 'letter', l.id, 'hearts', v_n, 'hearted', coalesce(p_on, true));
end;
$$;

revoke all on function wall_heart(text, uuid, boolean) from public;
grant execute on function wall_heart(text, uuid, boolean) to anon, authenticated;

-- ── 3. the letters, with their hearts and the face beside the name ───────────
-- As 0032, plus three things on every row (`hearts`, `hearted`) and beside
-- the list (the resolver's answer for the handle: `known`, `display_name`,
-- `is_verified`, `avatar_path`). The redaction rule is unchanged: the body is
-- null outside the gate, and the count is a count.
create or replace function wall_letters_for(p_token text, p_handle text)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  nh     text := celestual_norm(p_handle);
  v_me   uuid := celestual_session_user(p_token);
  v_open boolean;
  v_rows jsonb;
  p      ig_profiles%rowtype;
begin
  if nh is null then return jsonb_build_object('ok', false, 'error', 'bad_input'); end if;

  select bool_or(wall_gate(v_me, l.campus)) into v_open
    from wall_letters l
   where l.target_handle = nh and l.status = 'live' and l.expires_at > now();
  v_open := coalesce(v_open, false);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',       l.id,
           'handle',   l.target_handle,
           'body',     case when v_open then l.body end,
           'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
           'chars',    char_length(l.body),
           'has_seal', l.sealed_line is not null,
           'campus',   l.campus,
           'at',       l.created_at,
           'expires',  l.expires_at,
           'hearts',   (select count(*)::int from wall_hearts h where h.letter_id = l.id),
           'hearted',  v_me is not null and exists (
                         select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
         ) order by l.created_at desc), '[]'::jsonb)
    into v_rows
    from wall_letters l
   where l.target_handle = nh and l.status = 'live' and l.expires_at > now();

  select * into p from ig_profiles where handle = nh;

  return jsonb_build_object(
    'ok', true, 'open', v_open, 'handle', nh, 'letters', v_rows,
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path
  );
end;
$$;

create or replace function wall_letter(p_token text, p_letter uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_me   uuid := celestual_session_user(p_token);
  l      wall_letters%rowtype;
  p      ig_profiles%rowtype;
  v_open boolean;
  v_mine boolean;
begin
  select * into l from wall_letters
   where id = p_letter and status = 'live' and expires_at > now();
  if not found then return jsonb_build_object('ok', false, 'error', 'gone'); end if;

  v_open := wall_gate(v_me, l.campus);
  v_mine := v_me is not null and exists (
    select 1 from celestual_users u
     where u.id = v_me and u.merged_into is null
       and u.handle_verified_at is not null
       and u.instagram_handle = l.target_handle
  );
  select * into p from ig_profiles where handle = l.target_handle;

  return jsonb_build_object('ok', true, 'open', v_open,
    'known',        p.handle is not null,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  coalesce(p.is_verified, false),
    'avatar_path',  p.avatar_path,
    'letter', jsonb_build_object(
      'id',       l.id,
      'handle',   l.target_handle,
      'body',     case when v_open then l.body end,
      'words',    array_length(regexp_split_to_array(btrim(l.body), '\s+'), 1),
      'chars',    char_length(l.body),
      'has_seal', l.sealed_line is not null,
      'campus',   l.campus,
      'at',       l.created_at,
      'expires',  l.expires_at,
      'mine',     v_mine,
      'hearts',   (select count(*)::int from wall_hearts h where h.letter_id = l.id),
      'hearted',  v_me is not null and exists (
                    select 1 from wall_hearts h where h.letter_id = l.id and h.user_id = v_me)
    ));
end;
$$;

-- The grants are unchanged from 0032 and `create or replace` keeps them;
-- restated so this file stands on its own.
grant execute on function wall_letters_for(text, text) to anon, authenticated;
grant execute on function wall_letter(text, uuid)      to anon, authenticated;

-- ── 4. the sky's rows, with the face beside each name ────────────────────────
-- As 0025, plus the resolver's answer for the handle each ping names. The
-- handle is the owner's own plaintext (0010), read with the owner's own
-- proof; the profile beside it is the one the owner confirmed against when
-- they placed it. Nothing about anybody's activity rides here.
create or replace function celestual_my_pings(p_handle text, p_proof text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_pings jsonb;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'pings', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'handle', coalesce(e.matched_handle, e.to_handle),
           'time',   (extract(epoch from e.created_at) * 1000)::bigint,
           'expires_at', to_char(e.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'mutual', e.matched_at is not null,
           'card', case when e.card is null then null
                        else e.card || jsonb_build_object('photo', e.photo is not null) end,
           'their_card', case when e.matched_at is not null
                              then celestual_counterpart_card(nh, coalesce(e.matched_handle, e.to_handle)) end,
           'known',        p.handle is not null,
           'display_name', coalesce(p.display_name, ''),
           'is_verified',  coalesce(p.is_verified, false),
           'avatar_path',  p.avatar_path
         ) order by e.created_at), '[]'::jsonb)
    into v_pings
    from celestual_entries e
    left join ig_profiles p on p.handle = coalesce(e.matched_handle, e.to_handle)
   where e.from_handle in (select celestual_group(nh))
     and (e.matched_at is not null or e.expires_at > now());

  return jsonb_build_object('ok', true, 'pings', v_pings);
end;
$$;

grant execute on function celestual_my_pings(text, text) to anon, authenticated;

-- ── 5. the peek, for a list ──────────────────────────────────────────────────
-- What the cache holds for up to twenty-four exact handles, in one call, for
-- the edge function's service role and nobody else. Exact match only, and
-- only what the card draws: no `is_private`, no dates, nothing that would let
-- a caller tell one row's age from another's.
create or replace function ig_profile_peek(p_handles text[])
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(p.handle, jsonb_build_object(
    'handle',       p.handle,
    'display_name', coalesce(p.display_name, ''),
    'is_verified',  p.is_verified,
    'avatar_path',  p.avatar_path
  )), '{}'::jsonb)
  from ig_profiles p
  where p.handle in (
    select celestual_norm(h) from unnest(coalesce(p_handles[1:24], '{}'::text[])) as h
  );
$$;

revoke all on function ig_profile_peek(text[]) from public, anon, authenticated;
grant execute on function ig_profile_peek(text[]) to service_role;
