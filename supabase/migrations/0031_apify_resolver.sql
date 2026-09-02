-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0031 · THE APIFY RESOLVER                                           ║
-- ║  The face is ours now, and it does not expire.                       ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- Spec section 5. Open questions Q7, Q8 and Q9.
--
-- Replaces the two tables 0028 created. `celestual_handle_cache` becomes
-- `ig_profiles` and `celestual_handle_lookups` becomes `handle_search_events`,
-- and both are reshaped rather than renamed, because the rules changed as much
-- as the columns did.
--
-- The table names carry no `celestual_` prefix. That is the spec's choice, not
-- a slip: section 5 names both tables outright, and a schema that quietly
-- renames the things its own specification names is a schema nobody can grep
-- against the document. The functions below match the tables they serve.
--
-- ── WHAT CHANGED, AND WHY EACH ONE ───────────────────────────────────────────
--
--   provider    two providers, one free and one metered, to Apify alone.
--               Spec section 5. The old pair are gone from this repository
--               entirely: code, keys, types and comments.
--
--   the face    proxied live on every request, to downloaded once and kept.
--               This is the real change. Instagram's CDN URLs are signed and
--               expire within days, so the old cache held a URL that would be a
--               403 by the weekend, and the only way to draw a face was to
--               fetch it again through us on every single view. Now the bytes
--               are pulled once, put in our own Storage bucket, and served to
--               the browser straight from Supabase. Nothing in the product ever
--               hands out an Instagram CDN URL again.
--
--   the cache   24 hours on a hit and one on a miss, to forever. A display
--               name and a badge do not change often enough to pay a metered
--               provider for the difference, and the spec says so: kept
--               indefinitely, refreshed only when a resolve is forced.
--
--   the caps    distinct handles per device, to rows per key across three keys.
--               Spec section 5's table: 20 for a signed-in user, 20 for an
--               anonymous device, 200 for an address.
--
-- ── THE ONE RULE THAT SURVIVED UNCHANGED ─────────────────────────────────────
-- A cache hit costs nobody anything. 0028 had it as a `billed` flag on every
-- row; here it is simpler, because only a call that actually reached Apify ever
-- writes a row at all. The table cannot contain a free lookup. That keeps the
-- bill bounded and the caps generous at the same time, which is the whole trick.

-- ── the profiles ─────────────────────────────────────────────────────────────
-- One row per handle, keyed on the celestual_norm() form like everything else.
--
-- There is no `found` column and no negative caching, which is a change from
-- 0028 worth naming. A handle nobody has is not a fact worth keeping forever,
-- and with the cache now permanent a stored miss would be permanent too: the
-- account somebody registers tomorrow would read as missing until a human
-- forced it. Misses are handled in the edge function with a short in-memory
-- hold instead, so a person backspacing over a typo does not pay for each
-- keystroke, and the fact expires with the isolate.
--
-- `is_private` is here on Q9's answer. It is not on the result card and the
-- browser is never told it, but a ping or a letter addressed to a private
-- account may never be reachable, and that is worth knowing later. It costs one
-- boolean and Apify returns it anyway.
create table if not exists ig_profiles (
  handle            text        primary key,
  display_name      text,
  is_verified       boolean     not null default false,
  is_private        boolean     not null default false,

  -- The path inside the `avatars` bucket, always `ig/<handle>.jpg`. Never a
  -- URL, and never anything on Instagram's CDN. Null means we have no picture
  -- for this handle, which the UI draws as a monogram rather than as an error.
  avatar_path       text,
  avatar_fetched_at timestamptz,

  resolved_at       timestamptz not null default now(),

  constraint ig_profiles_handle_ck   check (handle ~ '^[a-z0-9._]{1,30}$'),
  constraint ig_profiles_name_len_ck check (display_name is null or char_length(display_name) <= 120),
  constraint ig_profiles_path_ck     check (avatar_path is null or avatar_path = 'ig/' || handle || '.jpg'),
  -- A path with no fetch date, or a date with no path, is a half-written row.
  constraint ig_profiles_avatar_pair_ck
    check ((avatar_path is null) or (avatar_fetched_at is not null))
);

-- The refresh sweep reads this: rows whose picture is older than thirty days,
-- or was never fetched at all.
create index if not exists ig_profiles_avatar_age_idx
  on ig_profiles (avatar_fetched_at nulls first);

alter table ig_profiles enable row level security;
revoke all on ig_profiles from anon, authenticated;

comment on table ig_profiles is
  'Resolved public Instagram profile metadata, kept indefinitely. Read only by the celestual-resolve service role.';
comment on column ig_profiles.avatar_path is
  'Path in the avatars Storage bucket. Never an Instagram CDN URL: those are signed and expire within days.';

-- ── the ledger ───────────────────────────────────────────────────────────────
-- One row per call that actually reached Apify. Spec section 5.
--
-- Three key types in one table rather than three tables, because the counting
-- rule is identical for all three and only the number differs. A signed-in
-- person is counted on `user_id` alone and never on `device_id`, so signing in
-- does not halve anybody's allowance.
create table if not exists handle_search_events (
  id         bigserial   primary key,
  key_type   text        not null,
  key_value  text        not null,
  handle     text        not null,
  created_at timestamptz not null default now(),
  constraint handle_search_events_kind_ck  check (key_type in ('user_id', 'device_id', 'ip')),
  constraint handle_search_events_value_ck check (char_length(key_value) between 1 and 64),
  constraint handle_search_events_handle_ck check (char_length(handle) between 1 and 30)
);

-- The index the spec asks for, and the only one the counting query needs.
create index if not exists handle_search_events_key_idx
  on handle_search_events (key_type, key_value, created_at);
-- The prune's index. Separate, because the prune has no key to narrow on.
create index if not exists handle_search_events_created_idx
  on handle_search_events (created_at);

alter table handle_search_events enable row level security;
revoke all on handle_search_events from anon, authenticated;

comment on table handle_search_events is
  'Append only. One row per call that actually reached Apify. A cache hit writes nothing, so the caps never charge for our own cache.';

-- ── the limits, in one place ─────────────────────────────────────────────────
-- Named here rather than in the edge function so the number the database
-- enforces and the number the documentation states cannot drift apart.
create or replace function handle_search_limit(p_key_type text)
returns integer
language sql immutable set search_path = public as $$
  select case p_key_type
           when 'user_id'   then 20
           when 'device_id' then 20
           when 'ip'        then 200
         end
$$;

-- ── handle_search_allow(user, device, ip) ────────────────────────────────────
-- May this request reach Apify, and if not, for how long.
--
-- One round trip for all three counters. The edge function calls this before it
-- spends anything, and a client is never trusted with any part of it: the
-- device id comes from a cookie this server set, and the address from a proxy
-- header the client cannot forge.
--
-- `retry_after` is the seconds until the OLDEST counted event in the offending
-- window ages out, which is the moment one slot comes back. Spec section 5 asks
-- for exactly that number so the UI can say when rather than say no.
--
-- Signed in is counted on user_id only. Spec section 5.
create or replace function handle_search_allow(p_user uuid, p_device text, p_ip text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_since constant timestamptz := now() - interval '24 hours';
  r       record;
  v_worst integer := 0;
  v_kind  text;
begin
  for r in
    select k.key_type, k.key_value from (
      values
        ('user_id',   case when p_user is not null then p_user::text end),
        ('device_id', case when p_user is null then nullif(p_device, '') end),
        ('ip',        nullif(p_ip, ''))
    ) as k(key_type, key_value)
     where k.key_value is not null
  loop
    declare
      v_n      bigint;
      v_oldest timestamptz;
      v_wait   integer;
    begin
      select count(*), min(created_at) into v_n, v_oldest
        from handle_search_events e
       where e.key_type = r.key_type and e.key_value = r.key_value and e.created_at >= v_since;

      if v_n >= handle_search_limit(r.key_type) then
        v_wait := greatest(1, ceil(extract(epoch from (v_oldest + interval '24 hours' - now())))::integer);
        if v_wait > v_worst then
          v_worst := v_wait;
          v_kind  := r.key_type;
        end if;
      end if;
    end;
  end loop;

  if v_worst > 0 then
    return jsonb_build_object('ok', false, 'retry_after', v_worst, 'key', v_kind);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── handle_search_record(user, device, ip, handle) ───────────────────────────
-- Called only after a call actually reached Apify. Writes one row per key that
-- applies, so the same call counts once against the person and once against
-- their address, which is what makes the address the backstop rather than a
-- second copy of the same cap.
create or replace function handle_search_record(p_user uuid, p_device text, p_ip text, p_handle text)
returns void
language sql security definer set search_path = public as $$
  insert into handle_search_events (key_type, key_value, handle)
  select k.key_type, k.key_value, left(p_handle, 30) from (
    values
      ('user_id',   case when p_user is not null then p_user::text end),
      ('device_id', case when p_user is null then nullif(left(p_device, 64), '') end),
      ('ip',        nullif(left(p_ip, 64), ''))
  ) as k(key_type, key_value)
   where k.key_value is not null and p_handle is not null and length(p_handle) > 0;
$$;

-- ── handle_search_prune() ────────────────────────────────────────────────────
-- Spec section 5 asks for a scheduled prune of rows older than 48 hours. The
-- counting window is 24, so 48 leaves a full window of slack for a clock skew
-- or a late job without ever letting the table grow without bound.
create or replace function handle_search_prune()
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from handle_search_events where created_at < now() - interval '48 hours';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── ig_profile_get(handle) ───────────────────────────────────────────────────
-- The cache read. Returns the row plus whether its picture wants refreshing, so
-- the edge function makes one call and gets both facts.
--
-- A picture is stale at thirty days, per spec section 5, and a null
-- `avatar_fetched_at` counts as stale: it means we have never had one. That is
-- what makes the forty rows carried over from `celestual_handle_cache` fill in
-- their faces on first use rather than sitting faceless forever behind a cache
-- that is now permanent.
create or replace function ig_profile_get(p_handle text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when p.handle is null then null else jsonb_build_object(
    'handle',        p.handle,
    'display_name',  coalesce(p.display_name, ''),
    'is_verified',   p.is_verified,
    'is_private',    p.is_private,
    'avatar_path',   p.avatar_path,
    'avatar_stale',  p.avatar_fetched_at is null
                       or p.avatar_fetched_at < now() - interval '30 days',
    'resolved_at',   p.resolved_at
  ) end
  from ig_profiles p where p.handle = celestual_norm(p_handle);
$$;

-- ── ig_profile_put(...) ──────────────────────────────────────────────────────
-- The cache write. Everything except the picture is written on every resolve;
-- the picture is written only when the download actually succeeded, which is
-- what `p_avatar_ok` says.
--
-- Spec section 5: if the download fails, store nothing and let the UI fall back
-- to a monogram. So a failed download leaves `avatar_path` exactly as it was,
-- which is null the first time and the previous good picture on a refresh. A
-- face that worked yesterday is not thrown away because a fetch timed out.
create or replace function ig_profile_put(
  p_handle       text,
  p_display_name text,
  p_is_verified  boolean,
  p_is_private   boolean,
  p_avatar_ok    boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
begin
  if nh is null then return null; end if;

  insert into ig_profiles (handle, display_name, is_verified, is_private,
                           avatar_path, avatar_fetched_at, resolved_at)
  values (nh, nullif(left(coalesce(p_display_name, ''), 120), ''),
          coalesce(p_is_verified, false), coalesce(p_is_private, false),
          case when p_avatar_ok then 'ig/' || nh || '.jpg' end,
          case when p_avatar_ok then now() end,
          now())
  on conflict (handle) do update
    set display_name      = excluded.display_name,
        is_verified       = excluded.is_verified,
        is_private        = excluded.is_private,
        avatar_path       = case when p_avatar_ok then excluded.avatar_path
                                 else ig_profiles.avatar_path end,
        avatar_fetched_at = case when p_avatar_ok then excluded.avatar_fetched_at
                                 else ig_profiles.avatar_fetched_at end,
        resolved_at       = excluded.resolved_at;

  return ig_profile_get(nh);
end;
$$;

-- ── the grants, which is to say: none for the browser ────────────────────────
-- Every function here is service role only. Spec section 5 puts rate limiting
-- server side and says never trust the client, and a client that could call
-- handle_search_allow could also decline to call handle_search_record.
revoke all on function handle_search_limit(text)                        from public, anon, authenticated;
revoke all on function handle_search_allow(uuid, text, text)            from public, anon, authenticated;
revoke all on function handle_search_record(uuid, text, text, text)     from public, anon, authenticated;
revoke all on function handle_search_prune()                            from public, anon, authenticated;
revoke all on function ig_profile_get(text)                             from public, anon, authenticated;
revoke all on function ig_profile_put(text, text, boolean, boolean, boolean) from public, anon, authenticated;

grant execute on function handle_search_limit(text)                     to service_role;
grant execute on function handle_search_allow(uuid, text, text)         to service_role;
grant execute on function handle_search_record(uuid, text, text, text)  to service_role;
grant execute on function handle_search_prune()                         to service_role;
grant execute on function ig_profile_get(text)                          to service_role;
grant execute on function ig_profile_put(text, text, boolean, boolean, boolean) to service_role;

-- ── carrying the forty rows over ─────────────────────────────────────────────
-- Q7: migrate `handle`, `display_name` and `is_verified`, leave `avatar_path`
-- null so the faces refill lazily, and drop `pic_url`.
--
-- `is_private` is deliberately NOT carried, also per Q7, and that costs nothing
-- here: every one of these rows arrives with a null `avatar_fetched_at`, which
-- `ig_profile_get` reports as a stale picture, so the first person to resolve
-- one of these handles triggers an Apify call that refreshes the private flag
-- along with the face. Carrying a stale boolean forward to save a call that is
-- going to happen anyway would be the worse trade.
--
-- Only rows that were actually found are worth carrying. A cached miss under
-- the old one-hour rule is not a fact about anything now.
--
-- Guarded on the table existing at all, so this migration applies to a database
-- that never had 0028 in it.
do $$
begin
  if to_regclass('public.celestual_handle_cache') is not null then
    insert into ig_profiles (handle, display_name, is_verified, resolved_at)
    select c.handle,
           nullif(left(coalesce(c.display_name, ''), 120), ''),
           coalesce(c.is_verified, false),
           c.fetched_at
      from celestual_handle_cache c
     where c.found is true
       and c.handle ~ '^[a-z0-9._]{1,30}$'
    on conflict (handle) do nothing;
  end if;
end $$;

-- ── and dropping the counters ────────────────────────────────────────────────
-- Q7: `celestual_handle_lookups` holds nothing but rate limit counters against
-- a window that no longer exists, so it goes with the rule it served.
--
-- `celestual_handle_cache` is deliberately NOT dropped here. Q7 said to migrate
-- out of it and said nothing about removing it, the free tier has no point in
-- time recovery, and it is the source this migration just read. Dropping it is
-- a step in docs/launchsteps.md, to be taken once ig_profiles is answering in
-- production. Nothing reads it after this migration.
drop table if exists celestual_handle_lookups;
