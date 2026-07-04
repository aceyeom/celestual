-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0006 — the ping model                                    ║
-- ║ three standing pings · sixty-day lapse · hashed shadow data ·        ║
-- ║ community counters · assurance-contract campus windows               ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- This migration re-bases the whole backend on docs/ULTIMATE-PRODUCT-FRAMEWORK.md:
--
--   1. THE THREE-SLOT RULE (framework §2.4). A person holds at most THREE standing
--      pings at once. Retiring a ping ("let it go") frees the slot — the old
--      weekly-regen budget and its no-refund rule are gone. What stops
--      retire-and-sweep cycling instead is a placement cadence cap (at most
--      C_PLACE_PER_30D new pings per rolling 30 days) plus the per-hour rate
--      limits. Scarcity is the sincerity mechanism, not a paywall.
--
--   2. THE SIXTY-DAY PING (framework §2.4). Every ping stands for 60 days and then
--      lapses silently unless renewed (free, unlimited, one tap). Lapsed unmatched
--      pings are PURGED — the expiry is doing legal work (shadow-data minimisation),
--      not just trigger work.
--
--   3. HASHED SHADOW DATA (framework §6.3). The server no longer stores WHO a
--      ping points at in plaintext. Unmatched target handles are stored only as
--      salted SHA-256 hashes; matching runs hash-to-hash. Plaintext renders only
--      on the sender's own device, or — once a pair is mutual — as the
--      matched_handle both sides already know. Opt-outs are hashed the same way.
--      A dump of celestual_entries can no longer read the map of unrequited
--      longing.
--
--   4. TARGET STATUS / LOOP A (framework §2.1). After (and only after) placing a
--      ping, the sender learns one bit: is the target reachable on celestual
--      ("standing") or not yet ("waiting")? Membership is the flattering,
--      receiver-side identity; anti-scan protections: status only via a placed
--      ping, three slots, cadence cap, rate limits.
--
--   5. COMMUNITY COUNTERS (framework §2.5). Optional "worlds" a member tags
--      (school + scenes, up to three). Counters are hidden below the 100-floor —
--      enforced HERE, at the source of truth, never in the client.
--
--   6. CAMPUS WINDOWS (framework §2.3). A campus opens by assurance contract:
--      preregistration is a full verified signup; the meter shows the true count;
--      at threshold the campus flips open and every preregistrant is mailed at
--      once. Week-one aggregates are snapshotted at reveal so the published
--      numbers stay exactly true forever.
--
--   7. MONETIZATION STAYS DORMANT. Nothing here sells anything. The only place
--      money will ever fit is a one-time fourth slot (framework Part 3) — not
--      built, deliberately.
--
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE / guarded ALTERs).

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- HARDENING — pin search_path on the pure helpers 0001/0002 left mutable, and
-- drop the updated-at trigger fn that went orphaned with celestual_profiles.
-- ──────────────────────────────────────────────────────────────────────
alter function celestual_norm(text) set search_path = public;
drop function if exists celestual_touch_updated_at() cascade;

-- ──────────────────────────────────────────────────────────────────────
-- SALT + HASH — the server-side pepper for target-handle hashes. Minted once,
-- kept in celestual_settings (already locked down: RLS on, zero policies).
-- ──────────────────────────────────────────────────────────────────────
insert into celestual_settings (key, value)
values ('handle_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- Internal only (never granted): salted hash of a normalised handle.
-- search_path includes `extensions` because Supabase installs pgcrypto there
-- (digest() is not visible from `public` alone).
create or replace function celestual_hash_handle(h text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select case when celestual_norm(h) is null then null else
    encode(digest(
      (select value from celestual_settings where key = 'handle_salt') || celestual_norm(h),
      'sha256'), 'hex')
  end
$$;

-- ──────────────────────────────────────────────────────────────────────
-- SUPPRESSIONS → hashed opt-out. The opt-out registry itself must not be a
-- plaintext list of handles.
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_suppressions add column if not exists handle_hash text;
update celestual_suppressions set handle_hash = celestual_hash_handle(handle)
 where handle_hash is null and handle is not null;
alter table celestual_suppressions drop constraint if exists celestual_suppressions_pkey;
alter table celestual_suppressions alter column handle drop not null;
update celestual_suppressions set handle = null;
create unique index if not exists celestual_suppressions_hash_uidx
  on celestual_suppressions (handle_hash);

-- ──────────────────────────────────────────────────────────────────────
-- MEMBERS — who is reachable on celestual (has ever verified their handle, by DM
-- or by campus preregistration). This is the "receiver identity": the flattering
-- side. handle_hash lets hashed entry rows be joined without plaintext.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_members (
  handle            text primary key,          -- normalised @ (a consenting user)
  handle_hash       text not null,
  first_verified_at timestamptz not null default now()
);
create index if not exists celestual_members_hash_idx on celestual_members (handle_hash);
alter table celestual_members enable row level security;
revoke all on celestual_members from anon, authenticated;

-- Backfill from every handle that has ever completed a DM verification.
insert into celestual_members (handle, handle_hash, first_verified_at)
select v.handle, celestual_hash_handle(v.handle), min(v.created_at)
  from celestual_ig_verifications v
 where v.status = 'verified'
 group by v.handle
on conflict (handle) do nothing;

-- Fix a latent 0004 bug while we're here: celestual_consume_ig_proof also calls
-- digest() and needs `extensions` on its search_path on Supabase-hosted projects
-- (it had never run with enforcement on, so the bug never surfaced).
create or replace function celestual_consume_ig_proof(p_handle text, p_proof text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh text := celestual_norm(p_handle);
  v_hash text;
  v_id uuid;
begin
  if nh is null or p_proof is null or length(p_proof) = 0 then
    return false;
  end if;
  v_hash := encode(digest(p_proof, 'sha256'), 'hex');
  select id into v_id
    from celestual_ig_verifications
   where handle = nh and status = 'verified' and proof_hash = v_hash and expires_at > now()
   limit 1;
  if v_id is null then return false; end if;
  update celestual_ig_verifications set last_used_at = now() where id = v_id;
  return true;
end;
$$;

-- Internal: is this handle reachable (a member, and not opted out)?
create or replace function celestual_is_member(h text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from celestual_members m where m.handle = celestual_norm(h))
     and not exists (select 1 from celestual_suppressions s
                      where s.handle_hash = celestual_hash_handle(h))
$$;

-- ──────────────────────────────────────────────────────────────────────
-- ENTRIES → PINGS. Add the ping columns, then scrub target plaintext:
--   to_hash        — salted hash of the target (the only stored pointer)
--   intent         — optional intent-line id, sealed until mutual
--   expires_at     — the sixty-day lapse clock
--   renew_notified_at — the "lapses soon" email bookkeeping
--   matched_handle — plaintext of the @ the sender entered, kept ONLY once the
--                    pair is mutual (both sides know by then; it powers the
--                    match screen + cross-device restore of matches)
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_entries add column if not exists to_hash text;
alter table celestual_entries add column if not exists intent text;
alter table celestual_entries add column if not exists expires_at timestamptz;
alter table celestual_entries add column if not exists renew_notified_at timestamptz;
alter table celestual_entries add column if not exists matched_handle text;

update celestual_entries set to_hash = celestual_hash_handle(to_handle)
 where to_hash is null and to_handle is not null;
update celestual_entries set expires_at = now() + interval '60 days'
 where expires_at is null;
update celestual_entries set matched_handle = to_handle
 where matched_at is not null and matched_handle is null and to_handle is not null;

alter table celestual_entries alter column expires_at set default (now() + interval '60 days');
alter table celestual_entries alter column expires_at set not null;

-- Drop the plaintext target columns (and the raw as-typed audit columns — data
-- minimisation: the mechanism never needs them).
alter table celestual_entries drop constraint if exists celestual_entries_from_handle_to_handle_key;
drop index if exists celestual_entries_to_idx;
alter table celestual_entries drop column if exists to_handle;
alter table celestual_entries drop column if exists raw_from;
alter table celestual_entries drop column if exists raw_to;

create unique index if not exists celestual_entries_from_tohash_uidx
  on celestual_entries (from_handle, to_hash);
create index if not exists celestual_entries_tohash_idx on celestual_entries (to_hash);
create index if not exists celestual_entries_expiry_idx
  on celestual_entries (expires_at) where matched_at is null;

-- ──────────────────────────────────────────────────────────────────────
-- PLACEMENTS — a rolling log of new-ping placements per sender, for the cadence
-- cap and the week-one campus aggregates. Pruned past ~40 days (the campus reveal
-- snapshots its numbers at day 7, so nothing here needs to live longer).
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_placements (
  id         bigserial primary key,
  handle     text not null,                    -- the sender (a consenting user)
  created_at timestamptz not null default now()
);
create index if not exists celestual_placements_handle_idx
  on celestual_placements (handle, created_at);
alter table celestual_placements enable row level security;
revoke all on celestual_placements from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- The weekly-budget model is gone. Drop its table, reminder queue, and RPCs.
-- ──────────────────────────────────────────────────────────────────────
drop function if exists celestual_slots_for(text);
drop function if exists celestual_request_reminder(text, text);
drop function if exists celestual_check_many(text, text[]);
drop function if exists celestual_my_sky(text, text);
drop table if exists celestual_slots;
drop table if exists celestual_reminders;

-- The Supabase-Auth profile layer (0002) is gone too: identity is the DM-proven
-- handle, restore is celestual_my_pings, and deletion is the opt-out. Dropping
-- the encrypted sky blobs is data minimisation — the product can no longer read
-- them, so it must not keep them.
drop function if exists celestual_delete_me();
drop table if exists celestual_profiles;
drop table if exists celestual_user_keys;

-- ──────────────────────────────────────────────────────────────────────
-- COMMUNITIES — "your worlds". Automatic counters, hidden under the 100-floor.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_communities (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  kind       text not null default 'scene' check (kind in ('school', 'scene')),
  created_at timestamptz not null default now()
);
create table if not exists celestual_community_members (
  community_id uuid not null references celestual_communities(id) on delete cascade,
  handle       text not null,                  -- a member (consenting user)
  created_at   timestamptz not null default now(),
  primary key (community_id, handle)
);
alter table celestual_communities        enable row level security;
alter table celestual_community_members  enable row level security;
revoke all on celestual_communities       from anon, authenticated;
revoke all on celestual_community_members from anon, authenticated;

-- Internal: a URL-safe slug from a community name.
create or replace function celestual_slug(n text) returns text
language sql immutable set search_path = public as $$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(trim(coalesce(n, ''))), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g')),
  '')
$$;

-- ──────────────────────────────────────────────────────────────────────
-- CAMPUSES — assurance-contract openings. Rows are created by the operator
-- (see supabase/README.md); nothing public can mint a campus.
--   status: 'window' (preregistering toward threshold) → 'open' (live) →
--           'revealed' (week-one aggregates published)
-- week_pings / week_matches are SNAPSHOTTED at reveal so the published numbers
-- stay exactly true even after lapsed pings purge (framework §6.2: truth is the
-- entire margin).
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_campuses (
  slug         text primary key,
  name         text not null,
  threshold    int  not null default 300,
  status       text not null default 'window' check (status in ('window', 'open', 'revealed')),
  opened_at    timestamptz,
  week_pings   int,
  week_matches int,
  created_at   timestamptz not null default now()
);
create table if not exists celestual_campus_prereg (
  campus_slug text not null references celestual_campuses(slug) on delete cascade,
  handle      text not null,                   -- verified preregistrant
  email       text,
  created_at  timestamptz not null default now(),
  primary key (campus_slug, handle)
);
-- Outbound campus mail queue ("it's open" / the week-one reveal), drained by
-- the celestual-remind function.
create table if not exists celestual_campus_mail (
  id          uuid primary key default gen_random_uuid(),
  campus_slug text not null,
  to_email    text not null,
  kind        text not null default 'open' check (kind in ('open', 'reveal')),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists celestual_campus_mail_pending_idx
  on celestual_campus_mail (created_at) where sent_at is null;
alter table celestual_campuses     enable row level security;
alter table celestual_campus_prereg enable row level security;
alter table celestual_campus_mail  enable row level security;
revoke all on celestual_campuses      from anon, authenticated;
revoke all on celestual_campus_prereg from anon, authenticated;
revoke all on celestual_campus_mail   from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_complete_ig_verification — unchanged decisive check, plus: a
-- verified handle becomes a MEMBER (reachable — the receiver identity).
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_complete_ig_verification(p_token text, p_igsid text, p_username text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  v_handle text;
  nu text := celestual_norm(p_username);
  c_session_ttl constant interval := interval '24 hours';
begin
  if p_token is null or nu is null then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  select id, handle into v_id, v_handle
    from celestual_ig_verifications
   where token = p_token and status = 'pending' and expires_at > now()
   limit 1;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_pending');
  end if;

  -- The whole security model in one line: Meta's username must match the claim.
  if nu <> v_handle then
    return jsonb_build_object('ok', false, 'error', 'handle_mismatch', 'expected', v_handle);
  end if;

  update celestual_ig_verifications
     set status = 'verified', igsid = p_igsid, verified_at = now(),
         expires_at = now() + c_session_ttl
   where id = v_id;

  insert into celestual_members (handle, handle_hash)
  values (v_handle, celestual_hash_handle(v_handle))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', v_handle);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_submit — place a ping. The ping model version:
--   • ownership proof enforced when require_ig_verification is on;
--   • suppression + membership checked by HASH;
--   • three standing (unresolved) pings max — a fourth returns 'no_slots'
--     (the client shows the dormant fourth-slot screen);
--   • cadence cap: at most 6 new placements per rolling 30 days (anti-sweep,
--     since retiring now frees the slot);
--   • stores to_hash + intent + a fresh 60-day expiry; re-placing an existing
--     pair costs nothing and renews the clock;
--   • group-aware mutual check by hash; on mutual, both entries gain their
--     matched_handle and the earlier entrant is queued the exfil-safe email;
--   • returns Loop A's one honest bit: is the target reachable.
-- Returns:
--   { recorded:true, mutual, match, match_intent, reachable, expires_at,
--     slots:{standing,cap} }
--   { recorded:false, error:'rate_limited'|'suppressed'|'no_slots'|'unverified',
--     slots? }
-- ──────────────────────────────────────────────────────────────────────
drop function if exists celestual_submit(text, text, text, text);

create or replace function celestual_submit(
  p_from text, p_to text, p_email text default null,
  p_proof text default null, p_intent text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  nh text;                                   -- hash of the target
  ni text;                                   -- validated intent id
  v_ip    text;
  v_ipn   int;
  v_fromn int;
  v_ton   int;
  v_placed30 int;
  v_existing_id uuid;
  v_standing int;
  reciprocal_from   text;
  reciprocal_email  text;
  reciprocal_intent text;
  reciprocal_id     uuid;
  reciprocal_tohash text;
  v_counterpart text;                        -- which of MY handles they entered
  v_match_id uuid;
  v_mutual boolean := false;
  v_expires timestamptz := now() + interval '60 days';
  ha text;
  hb text;
  c_ip_per_hour    constant int := 40;
  c_from_per_hour  constant int := 20;
  c_to_per_hour    constant int := 60;
  c_standing_cap   constant int := 3;
  c_place_per_30d  constant int := 6;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if nf = nt then raise exception 'same handle'; end if;
  nh := celestual_hash_handle(nt);
  ni := case when p_intent in ('miss', 'sorry', 'unsaid', 'drift', 'know') then p_intent end;

  -- ── HANDLE OWNERSHIP (Instagram DM verification, §verify) ───────────
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('recorded', false, 'error', 'unverified');
    end if;
  end if;

  -- Never record a ping against an opted-out handle (checked by hash).
  if exists (select 1 from celestual_suppressions where handle_hash = nh) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  -- Best-effort client IP.
  begin
    v_ip := nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), '');
  exception when others then v_ip := null; end;

  -- Trailing-hour rate limits (IP / from / to) — the burst backstop.
  if v_ip is not null then
    select count(*) into v_ipn from celestual_attempts
     where ip = v_ip and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
    if v_ipn >= c_ip_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_fromn from celestual_attempts
   where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  -- The per-target cap compares hashes (attempts store the hashed target).
  select count(*) into v_ton from celestual_attempts
   where to_handle = nh and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
  if v_ton >= c_to_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;

  -- Re-placing an existing pair? Free — it just refreshes email/intent and
  -- renews the sixty-day clock (re-placing IS still feeling it).
  select id into v_existing_id
    from celestual_entries where from_handle = nf and to_hash = nh limit 1;

  if v_existing_id is null then
    -- ── THE THREE-SLOT RULE ───────────────────────────────────────────
    -- Standing = unresolved (unmatched), unlapsed pings across the identity group.
    select count(*) into v_standing
      from celestual_entries e
     where e.from_handle in (select celestual_group(nf))
       and e.matched_at is null
       and e.expires_at > now();
    if v_standing >= c_standing_cap then
      return jsonb_build_object(
        'recorded', false, 'error', 'no_slots',
        'slots', jsonb_build_object('standing', v_standing, 'cap', c_standing_cap));
    end if;

    -- ── CADENCE CAP (anti-sweep: retiring frees the slot, so bound the churn) ──
    select count(*) into v_placed30
      from celestual_placements
     where handle = nf and created_at > now() - interval '30 days';
    if v_placed30 >= c_place_per_30d then
      return jsonb_build_object('recorded', false, 'error', 'rate_limited');
    end if;
  end if;

  -- Log this attempt (target hashed), then prune old rows ~2% of the time.
  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nh);
  if random() < 0.02 then
    delete from celestual_attempts where created_at < now() - interval '2 hours';
    delete from celestual_placements where created_at < now() - interval '40 days';
  end if;

  -- Record / refresh the ping. Target stored as hash only.
  insert into celestual_entries (from_handle, to_hash, from_email, intent, expires_at)
  values (nf, nh, ne, ni, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        intent     = coalesce(excluded.intent, celestual_entries.intent),
        expires_at = case when celestual_entries.matched_at is null then excluded.expires_at
                          else celestual_entries.expires_at end,
        renew_notified_at = null;

  if v_existing_id is null then
    insert into celestual_placements (handle) values (nf);
  end if;

  -- ── GROUP-AWARE RECIPROCAL, BY HASH ─────────────────────────────────
  -- Mutual if anyone in the target's identity group holds a live ping whose
  -- hash points at anyone in the sender's group.
  select e.id, e.from_handle, e.from_email, e.intent, e.to_hash
    into reciprocal_id, reciprocal_from, reciprocal_email, reciprocal_intent, reciprocal_tohash
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_hash in (select celestual_hash_handle(g) from celestual_group(nf) g)
     and not (e.from_handle = nf and e.to_hash = nh)   -- never self-match a linked alt
     and (e.matched_at is not null or e.expires_at > now())
   order by e.created_at asc
   limit 1;

  if reciprocal_id is not null then
    v_mutual := true;
    -- Which of MY handles did they enter? Recovered from the live submission
    -- context (my group's plaintext), never from storage.
    select g into v_counterpart
      from celestual_group(nf) g
     where celestual_hash_handle(g) = reciprocal_tohash
     limit 1;

    update celestual_entries
       set matched_at = coalesce(matched_at, now()), matched_handle = nt
     where from_handle = nf and to_hash = nh;
    update celestual_entries
       set matched_at = coalesce(matched_at, now()),
           matched_handle = coalesce(matched_handle, v_counterpart)
     where id = reciprocal_id;

    ha := least(nf, reciprocal_from);
    hb := greatest(nf, reciprocal_from);
    insert into celestual_matches (handle_a, handle_b) values (ha, hb)
      on conflict (handle_a, handle_b) do nothing
      returning id into v_match_id;

    if v_match_id is not null then
      -- Exfil-safe: email ONLY the earlier entrant, at the address THEY stored —
      -- never the address on this triggering request.
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, next_attempt_at)
      select v_match_id, reciprocal_email, reciprocal_from, coalesce(v_counterpart, nf), now()
       where reciprocal_email is not null;
    end if;
  end if;

  select count(*) into v_standing
    from celestual_entries e
   where e.from_handle in (select celestual_group(nf))
     and e.matched_at is null
     and e.expires_at > now();

  return jsonb_build_object(
    'recorded', true,
    'mutual', v_mutual,
    'match', case when v_mutual then nt else null end,
    'match_intent', case when v_mutual then reciprocal_intent else null end,
    -- Loop A's one honest bit: shown only after the ping is placed.
    'reachable', v_mutual or celestual_is_member(nt),
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', jsonb_build_object('standing', v_standing, 'cap', c_standing_cap)
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_withdraw — "let it go". Retiring a ping frees its slot (the cadence
-- cap, not a refund rule, is what bounds churn now). Unchanged teardown of any
-- pending match/notification; never un-tells anyone already mailed.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_withdraw(p_from text, p_to text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ha text;
  hb text;
  v_deleted int;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;

  delete from celestual_entries
   where from_handle = nf and to_hash = celestual_hash_handle(nt);
  get diagnostics v_deleted = row_count;

  ha := least(nf, nt);
  hb := greatest(nf, nt);
  delete from celestual_notifications n
   using celestual_matches m
   where n.match_id = m.id and m.handle_a = ha and m.handle_b = hb
     and n.sent_at is null;
  delete from celestual_matches where handle_a = ha and handle_b = hb;

  return jsonb_build_object('withdrawn', v_deleted > 0);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_renew — one tap keeps a ping standing another sixty days. Free,
-- unlimited, owner-gated exactly like placing.
-- Returns: { ok, expires_at } | { ok:false }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_renew(p_from text, p_to text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  v_expires timestamptz := now() + interval '60 days';
  v_n int;
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('ok', false, 'error', 'unverified');
    end if;
  end if;
  update celestual_entries
     set expires_at = v_expires, renew_notified_at = null
   where from_handle = nf and to_hash = celestual_hash_handle(nt)
     and matched_at is null;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', v_n > 0,
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_ping_status — the sender's own status page (Screen 4). Takes the
-- plaintext list the SENDER's device holds (the server can't produce it — it
-- only stores hashes) and returns each ping's live state. Owner-gated by the
-- same DM proof as placing; capped so it can't become a scan tool; per-target
-- reachability is returned ONLY for targets the caller has actually placed.
-- Returns: { ok, pings:[{ handle, placed, time, expires_at, mutual, intent,
--                         reachable }] }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_ping_status(p_from text, p_to text[], p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  v_to text[];
  v_out jsonb := '[]'::jsonb;
  t text;
  e record;
begin
  if nf is null or p_to is null then return jsonb_build_object('ok', false, 'pings', '[]'::jsonb); end if;
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('ok', false, 'pings', '[]'::jsonb);
    end if;
  end if;
  v_to := p_to[1:10];   -- three slots; ten bounds even a hoarded local list

  foreach t in array v_to loop
    continue when celestual_norm(t) is null;
    select e2.id, e2.created_at, e2.expires_at, e2.matched_at, e2.intent
      into e
      from celestual_entries e2
     where e2.from_handle in (select celestual_group(nf))
       and e2.to_hash = celestual_hash_handle(t)
     limit 1;
    if not found then
      v_out := v_out || jsonb_build_object('handle', celestual_norm(t), 'placed', false);
    else
      v_out := v_out || jsonb_build_object(
        'handle', celestual_norm(t),
        'placed', true,
        'time', (extract(epoch from e.created_at) * 1000)::bigint,
        'expires_at', to_char(e.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'mutual', e.matched_at is not null,
        'intent', e.intent,
        'reachable', e.matched_at is not null or celestual_is_member(t));
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'pings', v_out);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_my_pings — cross-device restore for the proven owner. Because
-- unmatched targets are stored hashed, only MUTUAL pings restore with a name;
-- unmatched ones return as anonymous standing rows (count + clocks). The device
-- that placed a ping keeps its plaintext locally — by design, the server cannot
-- read who you entered.
-- Returns: { ok, pings:[{ handle|null, time, expires_at, mutual, intent }] }
-- ──────────────────────────────────────────────────────────────────────
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
           'handle', e.matched_handle,
           'time',   (extract(epoch from e.created_at) * 1000)::bigint,
           'expires_at', to_char(e.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'mutual', e.matched_at is not null,
           'intent', e.intent
         ) order by e.created_at), '[]'::jsonb)
    into v_pings
    from celestual_entries e
   where e.from_handle in (select celestual_group(nh))
     and (e.matched_at is not null or e.expires_at > now());

  return jsonb_build_object('ok', true, 'pings', v_pings);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_slots_for — the live slot snapshot for the owner's meter. Proof-
-- gated when verification is enforced (a stranger must not read how many pings
-- a handle holds); returns the safe default otherwise.
-- Returns: { standing, cap }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_slots_for(p_handle text, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_standing int := 0;
  c_standing_cap constant int := 3;
begin
  if nf is null then
    return jsonb_build_object('standing', 0, 'cap', c_standing_cap);
  end if;
  if celestual_ig_required() and not celestual_consume_ig_proof(nf, p_proof) then
    return jsonb_build_object('standing', 0, 'cap', c_standing_cap);
  end if;
  select count(*) into v_standing
    from celestual_entries e
   where e.from_handle in (select celestual_group(nf))
     and e.matched_at is null
     and e.expires_at > now();
  return jsonb_build_object('standing', v_standing, 'cap', c_standing_cap);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_suppress — the public opt-out ("make my handle un-pingable and
-- un-storable"). Now stores only the HASH, and also clears membership, worlds
-- and campus preregistrations so opting out is total. Rate-limited as before.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_suppress(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  hh text;
  v_erased int;
  v_ip text;
  v_n  int;
  c_suppress_per_hour constant int := 10;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  hh := celestual_hash_handle(nh);

  begin
    v_ip := nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), '');
  exception when others then v_ip := null; end;
  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:suppress' and created_at > now() - interval '1 hour';
    if v_n >= c_suppress_per_hour then
      return jsonb_build_object('suppressed', null, 'error', 'rate_limited');
    end if;
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:suppress', hh);
  end if;

  insert into celestual_suppressions (handle_hash, reason)
  values (hh, 'self-service opt-out')
  on conflict (handle_hash) do nothing;

  -- Wipe everything referencing this handle, on either side.
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries where from_handle = nh or to_hash = hh or matched_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_community_members where handle = nh;
  delete from celestual_campus_prereg where handle = nh;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_set_worlds — tag the real communities you belong to (one school +
-- scenes, three total). Owner-gated; replaces the caller's memberships.
-- Returns: { ok, worlds:[{ slug, name, count|null }] }  (count under the
-- 100-floor is null — hidden at the source of truth)
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_set_worlds(p_handle text, p_names text[], p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_names text[];
  n text;
  s text;
  v_id uuid;
  c_max constant int := 3;
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nh, p_proof) then
      return jsonb_build_object('ok', false, 'worlds', '[]'::jsonb);
    end if;
  end if;

  v_names := (coalesce(p_names, '{}'::text[]))[1:c_max];
  delete from celestual_community_members where handle = nh;

  foreach n in array v_names loop
    s := celestual_slug(left(coalesce(n, ''), 48));
    continue when s is null;
    insert into celestual_communities (slug, name)
    values (s, trim(regexp_replace(left(n, 48), '\s+', ' ', 'g')))
    on conflict (slug) do nothing;
    select id into v_id from celestual_communities where slug = s;
    insert into celestual_community_members (community_id, handle)
    values (v_id, nh)
    on conflict do nothing;
  end loop;

  return jsonb_build_object('ok', true, 'worlds', coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', c.slug, 'name', c.name,
      'count', case when cnt.n >= 100 then cnt.n end))
      from celestual_community_members m
      join celestual_communities c on c.id = m.community_id
      join lateral (select count(*) as n from celestual_community_members m2
                     where m2.community_id = c.id) cnt on true
     where m.handle = nh
  ), '[]'::jsonb));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_world_counts — public counters for landing pages and cards. The
-- 100-floor is enforced here: below it a community returns count:null (the
-- client shows "still gathering", never a small number).
-- Returns: { worlds:[{ slug, name, count|null }] }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_world_counts(p_slugs text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_slugs text[];
begin
  v_slugs := (coalesce(p_slugs, '{}'::text[]))[1:6];
  return jsonb_build_object('worlds', coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', c.slug, 'name', c.name,
      'count', case when cnt.n >= 100 then cnt.n end))
      from celestual_communities c
      join lateral (select count(*) as n from celestual_community_members m
                     where m.community_id = c.id) cnt on true
     where c.slug = any (select celestual_slug(x) from unnest(v_slugs) x)
  ), '[]'::jsonb));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_campus — the public campus page state. The meter count is the TRUE
-- count (the assurance contract runs on the real number); week-one aggregates
-- appear only once the operator has revealed them (snapshotted, exact).
-- Returns: { ok, slug, name, threshold, count, status, opened_at,
--            week_pings, week_matches }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_campus(p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_count int;
begin
  select * into c from celestual_campuses where slug = celestual_slug(p_slug);
  if not found then return jsonb_build_object('ok', false); end if;
  select count(*) into v_count from celestual_campus_prereg where campus_slug = c.slug;
  return jsonb_build_object(
    'ok', true, 'slug', c.slug, 'name', c.name,
    'threshold', c.threshold, 'count', v_count, 'status', c.status,
    'opened_at', case when c.opened_at is null then null
      else to_char(c.opened_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end,
    'week_pings', case when c.status = 'revealed' then c.week_pings end,
    'week_matches', case when c.status = 'revealed' then c.week_matches end);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_campus_preregister — "count me in". Preregistration IS the full
-- signup: the handle must be verified (herd cover — joining an event, not a
-- confession). At threshold the campus flips open atomically and every
-- preregistrant with an email is queued the "it's open" note at once.
-- Returns: { ok, count, threshold, status } | { ok:false, error }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_campus_preregister(
  p_slug text, p_handle text, p_email text default null, p_proof text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ns text := celestual_slug(p_slug);
  nh text := celestual_norm(p_handle);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  c record;
  v_count int;
begin
  if ns is null or nh is null then raise exception 'invalid input'; end if;
  select * into c from celestual_campuses where slug = ns for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_campus'); end if;

  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nh, p_proof) then
      return jsonb_build_object('ok', false, 'error', 'unverified');
    end if;
  end if;

  insert into celestual_campus_prereg (campus_slug, handle, email)
  values (ns, nh, ne)
  on conflict (campus_slug, handle) do update
    set email = coalesce(excluded.email, celestual_campus_prereg.email);

  -- Preregistering is a verified arrival — the handle becomes reachable.
  insert into celestual_members (handle, handle_hash)
  values (nh, celestual_hash_handle(nh))
  on conflict (handle) do nothing;

  select count(*) into v_count from celestual_campus_prereg where campus_slug = ns;

  -- The assurance contract trips: open at once, notify everyone together.
  if c.status = 'window' and v_count >= c.threshold then
    update celestual_campuses set status = 'open', opened_at = now() where slug = ns;
    insert into celestual_campus_mail (campus_slug, to_email)
    select ns, p.email from celestual_campus_prereg p
     where p.campus_slug = ns and p.email is not null;
    c.status := 'open';
  end if;

  return jsonb_build_object('ok', true, 'count', v_count,
    'threshold', c.threshold, 'status', c.status);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_campus_reveal — OPERATOR ONLY (service role). Snapshots the week-one
-- aggregates from the placement log + match records and publishes them. Run once,
-- seven days after opening, after eyeballing that the numbers are right — every
-- published number must be exactly true (framework §6.2).
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_campus_reveal(p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  ns text := celestual_slug(p_slug);
  c record;
  v_pings int;
  v_matches int;
begin
  select * into c from celestual_campuses where slug = ns;
  if not found or c.opened_at is null then
    return jsonb_build_object('ok', false, 'error', 'not_open');
  end if;

  select count(*) into v_pings
    from celestual_placements pl
   where pl.handle in (select handle from celestual_campus_prereg where campus_slug = ns)
     and pl.created_at >= c.opened_at
     and pl.created_at <  c.opened_at + interval '7 days';

  select count(*) into v_matches
    from celestual_matches m
   where m.handle_a in (select handle from celestual_campus_prereg where campus_slug = ns)
     and m.handle_b in (select handle from celestual_campus_prereg where campus_slug = ns)
     and m.matched_at >= c.opened_at
     and m.matched_at <  c.opened_at + interval '7 days';

  update celestual_campuses
     set status = 'revealed', week_pings = v_pings, week_matches = v_matches
   where slug = ns;

  -- The collective payoff goes to everyone at once, exactly as it opened.
  insert into celestual_campus_mail (campus_slug, to_email, kind)
  select ns, p.email, 'reveal' from celestual_campus_prereg p
   where p.campus_slug = ns and p.email is not null;

  return jsonb_build_object('ok', true, 'week_pings', v_pings, 'week_matches', v_matches);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_purge_expired — the sixty-day broom. Deletes lapsed, unmatched
-- pings (hash and all) so unresolved longing self-destructs instead of
-- accumulating into a toxic archive. Driven by the celestual-remind cron
-- function; service-role only.
-- Returns: { purged: n }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_purge_expired()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  delete from celestual_entries
   where matched_at is null and expires_at < now();
  get diagnostics v_n = row_count;
  return jsonb_build_object('purged', v_n);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — visitor-facing RPCs only. Everything internal stays private.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_submit(text, text, text, text, text) from public;
grant execute on function celestual_submit(text, text, text, text, text) to anon, authenticated;
revoke all on function celestual_withdraw(text, text) from public;
grant execute on function celestual_withdraw(text, text) to anon, authenticated;
revoke all on function celestual_renew(text, text, text) from public;
grant execute on function celestual_renew(text, text, text) to anon, authenticated;
revoke all on function celestual_ping_status(text, text[], text) from public;
grant execute on function celestual_ping_status(text, text[], text) to anon, authenticated;
revoke all on function celestual_my_pings(text, text) from public;
grant execute on function celestual_my_pings(text, text) to anon, authenticated;
revoke all on function celestual_slots_for(text, text) from public;
grant execute on function celestual_slots_for(text, text) to anon, authenticated;
revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;
revoke all on function celestual_set_worlds(text, text[], text) from public;
grant execute on function celestual_set_worlds(text, text[], text) to anon, authenticated;
revoke all on function celestual_world_counts(text[]) from public;
grant execute on function celestual_world_counts(text[]) to anon, authenticated;
revoke all on function celestual_campus(text) from public;
grant execute on function celestual_campus(text) to anon, authenticated;
revoke all on function celestual_campus_preregister(text, text, text, text) from public;
grant execute on function celestual_campus_preregister(text, text, text, text) to anon, authenticated;

-- Internal / operator only — no client grant, ever. NOTE: Supabase grants
-- EXECUTE to anon/authenticated DIRECTLY (not only via PUBLIC), so revoking
-- `from public` alone is NOT enough — the roles must be named explicitly, or an
-- attacker could e.g. call celestual_hash_handle to defeat the salted hashing,
-- or celestual_is_member to scan reachability without placing a ping.
revoke execute on function celestual_hash_handle(text)                 from anon, authenticated, public;
revoke execute on function celestual_is_member(text)                   from anon, authenticated, public;
revoke execute on function celestual_group(text)                       from anon, authenticated, public;
revoke execute on function celestual_consume_ig_proof(text, text)      from anon, authenticated, public;
revoke execute on function celestual_ig_required()                     from anon, authenticated, public;
revoke execute on function celestual_complete_ig_verification(text, text, text) from anon, authenticated, public;
grant  execute on function celestual_complete_ig_verification(text, text, text) to service_role;
revoke execute on function celestual_campus_reveal(text)               from anon, authenticated, public;
grant  execute on function celestual_campus_reveal(text)               to service_role;
revoke execute on function celestual_purge_expired()                   from anon, authenticated, public;
grant  execute on function celestual_purge_expired()                   to service_role;

-- ──────────────────────────────────────────────────────────────────────
-- OPERATOR NOTES
--   • Create a campus window:
--       insert into celestual_campuses (slug, name, threshold)
--       values ('reed', 'Reed', 300);
--   • Reveal week one (after eyeballing):  select celestual_campus_reveal('reed');
--   • The sixty-day broom + lapse-warning emails + campus-open mail all run from
--     the celestual-remind edge function — schedule it hourly (pg_cron or the
--     Supabase scheduler).
-- ──────────────────────────────────────────────────────────────────────
