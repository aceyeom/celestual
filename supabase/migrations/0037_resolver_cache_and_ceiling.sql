-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0037 · THE RESOLVER'S CACHE HOLDS, AND THE METER GETS A CEILING     ║
-- ║  A missing face no longer empties the cache. The day has a cap.      ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- The audit of the Apify resolver after the ten handle billing pilot (4
-- September). Two things in 0031 were wrong in a way the pilot could see and
-- the four days of production traffic before it paid for.
--
-- ── 1. THE LEAK ──────────────────────────────────────────────────────────────
-- `ig_profile_get` reported a row as stale when its picture was more than
-- thirty days old OR had never been fetched. The edge function treats a stale
-- row as a cache miss. So a row whose picture never downloaded, which is what
-- `avatar_fetched_at is null` means, was stale from the moment it was written,
-- and every lookup of that handle went back to Apify, forever. Those rows never
-- cached at all. In production 30 of the 50 rows were in that state, and the
-- pilot's `supabase` came back "cached" at 21 seconds because a full actor run
-- had just happened behind it.
--
-- The fix separates the two questions the one flag was answering:
--
--   is the PROFILE fresh?   resolved_at, and a profile is a name and a badge,
--                           which do not change often enough to pay for.
--   is the PICTURE fresh?   avatar_fetched_at, thirty days, as before.
--
-- A row with no picture is a fresh profile with a missing face, and a missing
-- face never blocks a card (spec section 5). So it is a cache hit, and the
-- picture is retried at most once a week, on the next lookup after seven days.
-- A row with a picture refreshes the picture at thirty days, as it always did.
--
-- ── 2. THE CEILING ───────────────────────────────────────────────────────────
-- The three caps in 0031 are per key: a person, a device, an address. None of
-- them bounds the bill. A device cap is beaten by not sending the cookie, and
-- an address cap is beaten by having more than one address, which is what a
-- residence hall, a phone on cellular and a cloud box all are. Both of those
-- keep one actor honest; neither says what the worst day can cost.
--
-- So a fourth key, `global`, counted on every call that reaches Apify no matter
-- who made it. When the day's calls reach the number in handle_search_limit,
-- the function stops reaching Apify until the oldest call ages out of the 24
-- hour window. Cache hits are unaffected, because a cache hit reaches nothing.
-- The card goes quiet for new handles and the act still goes through, which is
-- the product's rule for every failure on this path.
--
-- The number is a product decision and it lives in one place. A thousand
-- distinct new handles in a day is far past a campus pilot, and it is the most
-- the meter can ever run in one day, regardless of how many devices or
-- addresses are asking.
--
-- ── 3. WHAT IS COUNTED ───────────────────────────────────────────────────────
-- 0031's comment on the ledger says "one row per call that actually reached
-- Apify", and the edge function had drifted from that: it recorded only calls
-- that came back with an account, so a handle nobody has cost nothing here
-- while still running the actor. That made misses free in the ledger, and
-- unlimited. The function now records every call that reached the actor,
-- found or not, and the ledger means what its comment says again. Nothing in
-- this file changes for that; it is written here because this is where the
-- rule is stated.
--
-- The desk (0033) still counts "profiles_stale" as rows without a fresh
-- picture, which is what an operator means by the word. That is a different
-- question from whether the resolver should spend a call, and it stays as it
-- is.

-- ── the ledger takes a fourth key ────────────────────────────────────────────
alter table handle_search_events drop constraint if exists handle_search_events_kind_ck;
alter table handle_search_events
  add constraint handle_search_events_kind_ck
  check (key_type in ('user_id', 'device_id', 'ip', 'global'));

comment on table handle_search_events is
  'Append only. One row per key per call that reached Apify, found or not. A cache hit writes nothing, so the caps never charge for our own cache. The global key is written on every call and is the ceiling on the day.';

-- ── the limits, in one place ─────────────────────────────────────────────────
create or replace function handle_search_limit(p_key_type text)
returns integer
language sql immutable set search_path = public as $$
  select case p_key_type
           when 'user_id'   then 20
           when 'device_id' then 20
           when 'ip'        then 200
           when 'global'    then 1000
         end
$$;

-- ── handle_search_allow(user, device, ip) ────────────────────────────────────
-- As 0031, plus the global row, which applies to every request.
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
        ('ip',        nullif(p_ip, '')),
        ('global',    'all')
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
-- As 0031, plus the global row.
create or replace function handle_search_record(p_user uuid, p_device text, p_ip text, p_handle text)
returns void
language sql security definer set search_path = public as $$
  insert into handle_search_events (key_type, key_value, handle)
  select k.key_type, k.key_value, left(p_handle, 30) from (
    values
      ('user_id',   case when p_user is not null then p_user::text end),
      ('device_id', case when p_user is null then nullif(left(p_device, 64), '') end),
      ('ip',        nullif(left(p_ip, 64), '')),
      ('global',    'all')
  ) as k(key_type, key_value)
   where k.key_value is not null and p_handle is not null and length(p_handle) > 0;
$$;

-- ── ig_profile_get(handle) ───────────────────────────────────────────────────
-- The cache read. `avatar_stale` keeps its name, because the edge function and
-- the tests read it, but it now means "this lookup should spend a call to try
-- for a better face", and a row with no face and a fresh profile says no.
--
--   no picture     stale once the profile is seven days old. Retry weekly.
--   a picture      stale once the picture is thirty days old. As before.
create or replace function ig_profile_get(p_handle text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when p.handle is null then null else jsonb_build_object(
    'handle',        p.handle,
    'display_name',  coalesce(p.display_name, ''),
    'is_verified',   p.is_verified,
    'is_private',    p.is_private,
    'avatar_path',   p.avatar_path,
    'avatar_stale',  case when p.avatar_path is null
                          then p.resolved_at < now() - interval '7 days'
                          else p.avatar_fetched_at < now() - interval '30 days' end,
    'resolved_at',   p.resolved_at
  ) end
  from ig_profiles p where p.handle = celestual_norm(p_handle);
$$;

-- The grants are unchanged from 0031 and `create or replace` keeps them, but
-- they are restated so this file stands on its own if it is ever read alone.
revoke all on function handle_search_limit(text)                    from public, anon, authenticated;
revoke all on function handle_search_allow(uuid, text, text)        from public, anon, authenticated;
revoke all on function handle_search_record(uuid, text, text, text) from public, anon, authenticated;
revoke all on function ig_profile_get(text)                         from public, anon, authenticated;
grant execute on function handle_search_limit(text)                     to service_role;
grant execute on function handle_search_allow(uuid, text, text)         to service_role;
grant execute on function handle_search_record(uuid, text, text, text)  to service_role;
grant execute on function ig_profile_get(text)                          to service_role;
