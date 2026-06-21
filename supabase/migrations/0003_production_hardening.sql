-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0003 — production hardening                              ║
-- ║ slot budget · multi-account identity · group-aware matching         ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- This migration removes the paywall and replaces it with the integrity controls
-- that keep CELESTUAL honest now that every star is free:
--
--   1. SLOT BUDGET (anti-fishing). With no paywall, the only thing stopping a
--      person from entering everyone they know — to fish for who likes them — is a
--      cap on how many people they can enter. Each person starts with 3 slots and
--      regains 1 per week (capped at 3). Sealing spends one; WITHDRAWING NEVER
--      REFUNDS one (so you can't cycle a slot through enter→peek→withdraw→repeat).
--      Enforced server-side in celestual_submit, keyed on the submitter's handle,
--      so clearing localStorage / a new device can't reset it.
--
--   2. MULTI-ACCOUNT IDENTITY. People often have several Instagram accounts. They
--      can link up to 3 of their own @s into one identity group; being entered on
--      ANY of them counts as being entered. Matching is GROUP-AWARE: a reciprocal
--      is anyone in their group pointing back at anyone in yours. (Until Instagram
--      login lands we cannot verify ownership of a claimed @ — so claiming is
--      first-come, never steals an @ already in another group, and is capped. See
--      docs/SECURITY.md "Interim identity".)
--
--   3. INSTANT REVEAL (product decision). celestual_submit now returns whether the
--      pair is mutual, so the person completing a match finds out immediately. The
--      slot budget above is what bounds this into a non-abusable channel. The
--      exfil-safe email to the earlier entrant is unchanged.
--
-- It is re-runnable (CREATE OR REPLACE / IF NOT EXISTS) and supersedes the paid-
-- star entitlements from 0002.

-- ──────────────────────────────────────────────────────────────────────
-- Drop the paywall. Entitlements are gone; every star is free.
-- ──────────────────────────────────────────────────────────────────────
drop table if exists celestual_entitlements cascade;

-- Multi-account: a signed-in profile keeps the full list of its own @s (0002 only
-- had a single `handle`). Defensive add for already-applied instances.
alter table celestual_profiles add column if not exists handles text[] not null default '{}';

-- ──────────────────────────────────────────────────────────────────────
-- SLOTS — the per-handle entry budget. One row per submitter handle.
-- `remaining` is the unspent slots; `updated_at` anchors weekly regen.
-- Locked down: no direct client access, only the RPCs (SECURITY DEFINER) touch it.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_slots (
  handle     text primary key,                  -- normalised submitter @
  remaining  int  not null default 3,
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- HANDLE LINKS — multi-account identity groups. Each @ belongs to at most one
-- group_id; all @s sharing a group_id are "the same person". A handle is claimed
-- first-come (never moved out of an existing group), so nobody can yank an @ that
-- is already linked elsewhere.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_handle_links (
  handle     text primary key,                  -- normalised @
  group_id   uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists celestual_handle_links_group_idx on celestual_handle_links (group_id);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — lock the new tables down. No policies + RLS on = no direct client access;
-- the SECURITY DEFINER RPCs reach them as owner.
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_slots        enable row level security;
alter table celestual_handle_links enable row level security;
revoke all on celestual_slots        from anon, authenticated;
revoke all on celestual_handle_links from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_group(h) — every @ in h's identity group (or just {h} if unlinked).
-- Internal helper only (SECURITY DEFINER, NOT granted to clients) so group
-- membership — which would expose a person's other accounts — is never directly
-- queryable. celestual_submit / celestual_check_many call it as owner.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_group(h text) returns setof text
language sql stable security definer set search_path = public as $$
  select celestual_norm(h)
  union
  select l.handle
    from celestual_handle_links l
   where l.group_id = (select group_id from celestual_handle_links where handle = celestual_norm(h))
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_link(p_handles) — claim up to 3 @s as one identity group. Idempotent:
-- re-linking the same set is a no-op; adding an @ extends the group. Never steals
-- an @ already in another group, and never grows a group past 3.
-- Returns: { "group": ["handle", ...] }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_link(p_handles text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_norm   text[];
  v_handle text;
  v_group  uuid;
  v_count  int;
  c_max constant int := 3;
begin
  -- normalise, drop nulls, de-dupe, cap to 3
  select array_agg(n) into v_norm from (
    select distinct celestual_norm(x) as n from unnest(p_handles) as x
  ) s where n is not null;
  if v_norm is null or array_length(v_norm, 1) = 0 then
    return jsonb_build_object('group', '[]'::jsonb);
  end if;
  v_norm := v_norm[1:c_max];

  -- adopt an existing group if any of these @s already belongs to one
  select group_id into v_group
    from celestual_handle_links where handle = any(v_norm) limit 1;
  if v_group is null then
    v_group := gen_random_uuid();
  end if;

  select count(*) into v_count from celestual_handle_links where group_id = v_group;
  foreach v_handle in array v_norm loop
    exit when v_count >= c_max;
    insert into celestual_handle_links (handle, group_id)
    values (v_handle, v_group)
    on conflict (handle) do nothing;     -- never move an @ out of another group
    if found then v_count := v_count + 1; end if;
  end loop;

  return jsonb_build_object(
    'group',
    coalesce((select jsonb_agg(handle order by created_at) from celestual_handle_links where group_id = v_group), '[]'::jsonb)
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_submit — record my one-way entry. Now also:
--   • enforces the slot budget (new people only; re-submits are free);
--   • matches across identity groups;
--   • returns whether it is mutual (instant reveal) + the live slot snapshot.
-- Returns: { recorded, mutual, match, slots:{remaining,cap,next_at} }
--          { recorded:false, error:'rate_limited' | 'suppressed' | 'no_slots' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_submit(p_from text, p_to text, p_email text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  nt text := celestual_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_ip    text;
  v_ipn   int;
  v_fromn int;
  v_ton   int;
  v_existing boolean;
  v_remaining int;
  v_updated   timestamptz;
  v_weeks     int;
  reciprocal_from  text;
  reciprocal_email text;
  reciprocal_to    text;
  v_match_id uuid;
  v_mutual boolean := false;
  ha text;
  hb text;
  c_ip_per_hour   constant int := 40;
  c_from_per_hour constant int := 20;
  c_to_per_hour   constant int := 60;
  c_slot_cap constant int := 3;
  c_regen    constant interval := interval '7 days';
begin
  if nf is null or nt is null then raise exception 'invalid handle'; end if;
  if nf = nt then raise exception 'same handle'; end if;

  -- Never record an entry against a suppressed (opted-out) handle.
  if exists (select 1 from celestual_suppressions where handle = nt) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  -- Best-effort client IP.
  begin
    v_ip := nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), '');
  exception when others then v_ip := null; end;

  -- Trailing-hour rate limits (IP / from / to) — a backstop against bursts.
  if v_ip is not null then
    select count(*) into v_ipn from celestual_attempts where ip = v_ip and created_at > now() - interval '1 hour';
    if v_ipn >= c_ip_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_fromn from celestual_attempts where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  select count(*) into v_ton from celestual_attempts where to_handle = nt and created_at > now() - interval '1 hour';
  if v_ton >= c_to_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;

  -- Is this a brand-new person, or a re-submit of an existing pair? Re-submits
  -- (e.g. adding an email later) never cost a slot.
  select true into v_existing from celestual_entries where from_handle = nf and to_handle = nt limit 1;

  -- ── SLOT BUDGET ─────────────────────────────────────────────────────
  if not coalesce(v_existing, false) then
    insert into celestual_slots (handle) values (nf) on conflict (handle) do nothing;
    select remaining, updated_at into v_remaining, v_updated
      from celestual_slots where handle = nf for update;

    -- Weekly regen, capped. Carry partial-week progress; reset the clock at cap.
    v_weeks := floor(extract(epoch from (now() - v_updated)) / extract(epoch from c_regen))::int;
    if v_weeks > 0 then
      if v_remaining + v_weeks >= c_slot_cap then
        v_remaining := c_slot_cap; v_updated := now();
      else
        v_remaining := v_remaining + v_weeks; v_updated := v_updated + (v_weeks * c_regen);
      end if;
    end if;

    if v_remaining <= 0 then
      update celestual_slots set remaining = v_remaining, updated_at = v_updated where handle = nf;
      return jsonb_build_object(
        'recorded', false, 'error', 'no_slots',
        'slots', jsonb_build_object('remaining', 0, 'cap', c_slot_cap,
          'next_at', to_char((v_updated + c_regen) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      );
    end if;
  end if;

  -- Log this attempt, then prune old rows ~2% of the time to keep it small.
  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nt);
  if random() < 0.02 then delete from celestual_attempts where created_at < now() - interval '2 hours'; end if;

  -- Record / refresh this directed entry.
  insert into celestual_entries (from_handle, to_handle, from_email, raw_from, raw_to)
  values (nf, nt, ne, p_from, p_to)
  on conflict (from_handle, to_handle) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        raw_from = excluded.raw_from, raw_to = excluded.raw_to;

  -- Spend the slot now that the new entry is safely recorded.
  if not coalesce(v_existing, false) then
    v_remaining := v_remaining - 1;
    update celestual_slots set remaining = v_remaining, updated_at = v_updated where handle = nf;
  end if;

  -- ── GROUP-AWARE RECIPROCAL ──────────────────────────────────────────
  -- Mutual if anyone in TO's identity group already entered anyone in FROM's.
  select e.from_handle, e.from_email, e.to_handle
    into reciprocal_from, reciprocal_email, reciprocal_to
    from celestual_entries e
   where e.from_handle in (select celestual_group(nt))
     and e.to_handle   in (select celestual_group(nf))
   order by e.created_at asc
   limit 1;

  if reciprocal_from is not null then
    v_mutual := true;
    update celestual_entries set matched_at = coalesce(matched_at, now())
     where (from_handle = nf and to_handle = nt)
        or (from_handle = reciprocal_from and to_handle = reciprocal_to);

    ha := least(nf, reciprocal_from);
    hb := greatest(nf, reciprocal_from);
    insert into celestual_matches (handle_a, handle_b) values (ha, hb)
      on conflict (handle_a, handle_b) do nothing
      returning id into v_match_id;

    if v_match_id is not null then
      -- Exfil-safe: email ONLY the earlier (reciprocal) entrant, at the address
      -- THEY stored — never the address on this triggering request.
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, next_attempt_at)
      select v_match_id, reciprocal_email, reciprocal_from, nf, now()
       where reciprocal_email is not null;
    end if;
  end if;

  -- For a re-submit (no slot was spent) v_remaining is still unset — read the live
  -- snapshot (regen read-only) so the returned meter is accurate, not "full".
  if coalesce(v_existing, false) then
    select remaining, updated_at into v_remaining, v_updated from celestual_slots where handle = nf;
    if not found then
      v_remaining := c_slot_cap; v_updated := now();
    else
      v_weeks := floor(extract(epoch from (now() - v_updated)) / extract(epoch from c_regen))::int;
      if v_weeks > 0 then
        if v_remaining + v_weeks >= c_slot_cap then v_remaining := c_slot_cap; v_updated := now();
        else v_remaining := v_remaining + v_weeks; v_updated := v_updated + (v_weeks * c_regen); end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'recorded', true,
    'mutual', v_mutual,
    -- The @ they entered — what the caller already typed, so no new handle leaks.
    'match', case when v_mutual then nt else null end,
    'slots', jsonb_build_object(
      'remaining', greatest(coalesce(v_remaining, c_slot_cap), 0), 'cap', c_slot_cap,
      'next_at', case when coalesce(v_remaining, c_slot_cap) >= c_slot_cap then null
        else to_char((v_updated + c_regen) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end)
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_check_many — for a submitter and a list of @s they've entered, return
-- which are now mutual (group-aware). Powers the in-app constellations view so the
-- EARLIER entrant can see matches in-app, not only by email. Read-only; the array
-- is capped so it can't be turned into a bulk gossip scan. This is no more
-- revealing than the instant reveal in celestual_submit (same identity model).
-- Returns: { "mutual": ["handle", ...] }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_check_many(p_from text, p_to text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_from);
  v_to text[];
begin
  if nf is null or p_to is null then return jsonb_build_object('mutual', '[]'::jsonb); end if;
  v_to := p_to[1:50];   -- bound the scan
  return jsonb_build_object('mutual', coalesce((
    select jsonb_agg(distinct t)
      from unnest(v_to) as t
     where celestual_norm(t) is not null
       and exists (
         select 1 from celestual_entries e
          where e.from_handle in (select celestual_group(celestual_norm(t)))
            and e.to_handle   in (select celestual_group(nf))
       )
  ), '[]'::jsonb));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_slots_for — read the live slot snapshot for a handle (for display).
-- Pure read (computes regen without persisting); celestual_submit is the
-- authority. Returns full when the handle has never spent a slot.
-- Returns: { remaining, cap, next_at }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_slots_for(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  v_remaining int;
  v_updated timestamptz;
  v_weeks int;
  c_slot_cap constant int := 3;
  c_regen constant interval := interval '7 days';
begin
  if nf is null then
    return jsonb_build_object('remaining', c_slot_cap, 'cap', c_slot_cap, 'next_at', null);
  end if;
  select remaining, updated_at into v_remaining, v_updated from celestual_slots where handle = nf;
  if not found then
    return jsonb_build_object('remaining', c_slot_cap, 'cap', c_slot_cap, 'next_at', null);
  end if;
  v_weeks := floor(extract(epoch from (now() - v_updated)) / extract(epoch from c_regen))::int;
  if v_weeks > 0 then
    if v_remaining + v_weeks >= c_slot_cap then v_remaining := c_slot_cap; v_updated := now();
    else v_remaining := v_remaining + v_weeks; v_updated := v_updated + (v_weeks * c_regen); end if;
  end if;
  return jsonb_build_object(
    'remaining', greatest(v_remaining, 0), 'cap', c_slot_cap,
    'next_at', case when v_remaining >= c_slot_cap then null
      else to_char((v_updated + c_regen) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_suppress — public erasure, now rate-limited per IP so it can't be used
-- to mass-wipe handles. (Behaviour otherwise unchanged from 0001.)
-- Returns: { suppressed, erased }  |  { suppressed:null, error:'rate_limited' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_suppress(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_erased int;
  v_ip text;
  v_n  int;
  c_suppress_per_hour constant int := 10;
begin
  if nh is null then raise exception 'invalid handle'; end if;

  begin
    v_ip := nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), '');
  exception when others then v_ip := null; end;
  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:suppress' and created_at > now() - interval '1 hour';
    if v_n >= c_suppress_per_hour then
      return jsonb_build_object('suppressed', null, 'error', 'rate_limited');
    end if;
    insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:suppress', nh);
  end if;

  insert into celestual_suppressions (handle, reason)
  values (nh, 'self-service erasure')
  on conflict (handle) do nothing;

  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries where from_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- REMINDERS — opt-in "tell me when my next star is ready". The out-of-slots
-- screen records one here; the celestual-remind edge function drains the due
-- ones by email. Locked down; only the RPC writes it.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_reminders (
  id         uuid primary key default gen_random_uuid(),
  handle     text not null,
  to_email   text not null,
  due_at     timestamptz not null,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists celestual_reminders_pending_idx
  on celestual_reminders (due_at) where sent_at is null;
alter table celestual_reminders enable row level security;
revoke all on celestual_reminders from anon, authenticated;

-- celestual_request_reminder — schedule the nudge for when this handle's next slot
-- regenerates (timing is computed server-side from celestual_slots, not trusted
-- from the client). One pending reminder per handle.
create or replace function celestual_request_reminder(p_handle text, p_email text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := celestual_norm(p_handle);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_due timestamptz;
  c_regen constant interval := interval '7 days';
begin
  if nf is null or ne is null then return jsonb_build_object('ok', false); end if;
  select updated_at + c_regen into v_due from celestual_slots where handle = nf;
  if v_due is null then v_due := now() + c_regen; end if;
  delete from celestual_reminders where handle = nf and sent_at is null;
  insert into celestual_reminders (handle, to_email, due_at) values (nf, ne, v_due);
  return jsonb_build_object('ok', true,
    'due_at', to_char(v_due at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — only the public-facing RPCs are exposed. celestual_group stays private.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_link(text[]) from public;
grant execute on function celestual_link(text[]) to anon, authenticated;
revoke all on function celestual_check_many(text, text[]) from public;
grant execute on function celestual_check_many(text, text[]) to anon, authenticated;
revoke all on function celestual_slots_for(text) from public;
grant execute on function celestual_slots_for(text) to anon, authenticated;
revoke all on function celestual_request_reminder(text, text) from public;
grant execute on function celestual_request_reminder(text, text) to anon, authenticated;
