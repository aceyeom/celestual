-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0001 — full schema                                      ║
-- ║ Anonymous, reciprocal "does your ex still think about you?" matching ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- The whole product in one file. A person records a one-way "I still think
-- about @them". They are NEVER told on screen whether it's mutual (deferred
-- reveal); the only "yes" is a private email to the earlier entrant. The raw
-- "who entered whom" data is never readable by the client: the anon/auth roles
-- get no table privileges and no RLS policy, so the only way in is the
-- SECURITY DEFINER RPCs, which return just a recorded/throttled status.
--
-- This single migration is the complete, hardened schema (it supersedes the
-- former 0001/0002/0003 split). Every object uses IF NOT EXISTS /
-- CREATE OR REPLACE, so applying it to an existing project is safe and
-- re-runnable.
--
-- SECURITY MODEL (see docs/SECURITY.md):
--   • Deferred reveal — celestual_submit returns only { recorded: true }.
--   • Rate limiting   — per-IP, per-from, and per-to trailing-hour caps.
--   • Exfil-safe mail — only the EARLIER entrant is emailed, never the address
--                       supplied on the request that triggers the match.
--   • Erasure         — celestual_withdraw (un-send) + celestual_suppress
--                       (block + wipe a handle).

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- NORMALISE — strip a leading @, lowercase, keep only IG-legal characters.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_norm(h text) returns text
language sql immutable as $$
  select nullif(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(h, ''))), '^@+', ''),
      '[^a-z0-9._]', '', 'g'
    ),
  '')
$$;

-- ──────────────────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────────────────
-- One directed entry: from_handle "still thinks about" to_handle.
create table if not exists celestual_entries (
  id          uuid primary key default gen_random_uuid(),
  from_handle text not null,          -- normalised submitter @
  to_handle   text not null,          -- normalised ex/crush @
  from_email  text,                   -- optional, for the mutual-match email
  raw_from    text not null,          -- as typed (display / audit)
  raw_to      text not null,
  matched_at  timestamptz,            -- set when this pair becomes mutual
  created_at  timestamptz not null default now(),
  unique (from_handle, to_handle)
);
create index if not exists celestual_entries_to_idx on celestual_entries (to_handle);

-- One row per mutual pair (canonical a<b ordering), so a match is recorded once.
create table if not exists celestual_matches (
  id         uuid primary key default gen_random_uuid(),
  handle_a   text not null,
  handle_b   text not null,
  matched_at timestamptz not null default now(),
  unique (handle_a, handle_b)
);

-- Outbound email queue (drained by the celestual-notify edge function), with
-- retry / dead-letter bookkeeping so a permanently-bad address stops retrying.
create table if not exists celestual_notifications (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references celestual_matches(id) on delete cascade,
  to_email        text not null,
  self_handle     text not null,   -- recipient's @
  other_handle    text not null,   -- the @ that entered them back
  attempts        int not null default 0,
  last_error      text,
  next_attempt_at timestamptz,
  failed_at       timestamptz,     -- dead-lettered after repeated failures
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists celestual_notifications_pending_idx
  on celestual_notifications (created_at) where sent_at is null;

-- Minimal attempt log, for rate limiting only. Auto-pruned.
create table if not exists celestual_attempts (
  id          bigserial primary key,
  ip          text,
  from_handle text,
  to_handle   text,
  created_at  timestamptz not null default now()
);
create index if not exists celestual_attempts_ip_idx   on celestual_attempts (ip, created_at);
create index if not exists celestual_attempts_from_idx on celestual_attempts (from_handle, created_at);
create index if not exists celestual_attempts_to_idx   on celestual_attempts (to_handle, created_at);

-- Handles that must never be entered (third-party / self-service erasure).
create table if not exists celestual_suppressions (
  handle     text primary key,        -- normalised @, blocked as a to_handle
  reason     text,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- RLS — lock every table down. No policies + RLS on = no direct client access.
-- The SECURITY DEFINER RPCs run as the table owner and bypass RLS; the edge
-- functions use the service-role key, which also bypasses RLS.
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_entries       enable row level security;
alter table celestual_matches       enable row level security;
alter table celestual_notifications enable row level security;
alter table celestual_attempts      enable row level security;
alter table celestual_suppressions  enable row level security;

revoke all on celestual_entries       from anon, authenticated;
revoke all on celestual_matches       from anon, authenticated;
revoke all on celestual_notifications from anon, authenticated;
revoke all on celestual_attempts      from anon, authenticated;
revoke all on celestual_suppressions  from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_submit — record my one-way entry. DEFERRED REVEAL: it returns ONLY
-- whether the entry was recorded, never whether the pair is mutual. On a mutual
-- match it queues an exfil-safe email to the EARLIER entrant.
-- Returns: { "recorded": true }
--          { "recorded": false, "error": "rate_limited" }
--          { "recorded": false, "error": "suppressed" }
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
  reciprocal boolean;
  v_match_id uuid;
  ha text;
  hb text;
  -- Tunable trailing-hour limits. Generous for honest use, tight enough that a
  -- sweep trips fast. The per-to cap is higher so a genuinely popular handle in
  -- a viral spike isn't blocked, while a single prober hammering one victim is.
  c_ip_per_hour   constant int := 40;
  c_from_per_hour constant int := 20;
  c_to_per_hour   constant int := 60;
begin
  if nf is null or nt is null then
    raise exception 'invalid handle';
  end if;
  if nf = nt then
    raise exception 'same handle';
  end if;

  -- Never record an entry against a suppressed (opted-out) handle.
  if exists (select 1 from celestual_suppressions where handle = nt) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  -- Best-effort client IP (PostgREST exposes the forwarded headers as a GUC).
  begin
    v_ip := split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1);
    v_ip := nullif(trim(v_ip), '');
  exception when others then
    v_ip := null;
  end;

  -- Rate limit on the trailing hour (IP, from-handle, and to-handle).
  if v_ip is not null then
    select count(*) into v_ipn
      from celestual_attempts
     where ip = v_ip and created_at > now() - interval '1 hour';
    if v_ipn >= c_ip_per_hour then
      return jsonb_build_object('recorded', false, 'error', 'rate_limited');
    end if;
  end if;
  select count(*) into v_fromn
    from celestual_attempts
   where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then
    return jsonb_build_object('recorded', false, 'error', 'rate_limited');
  end if;
  -- Throttle a targeted prober who rotates the (attacker-controlled) `from` to
  -- reset their own counter: cap how many entries one target absorbs per hour.
  select count(*) into v_ton
    from celestual_attempts
   where to_handle = nt and created_at > now() - interval '1 hour';
  if v_ton >= c_to_per_hour then
    return jsonb_build_object('recorded', false, 'error', 'rate_limited');
  end if;

  -- Log this attempt, then prune old rows ~2% of the time to keep it small.
  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, nf, nt);
  if random() < 0.02 then
    delete from celestual_attempts where created_at < now() - interval '2 hours';
  end if;

  -- Record / refresh this directed entry. Re-submitting the same pair keeps a
  -- previously-given email if the new submission omits one.
  insert into celestual_entries (from_handle, to_handle, from_email, raw_from, raw_to)
  values (nf, nt, ne, p_from, p_to)
  on conflict (from_handle, to_handle) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        raw_from   = excluded.raw_from,
        raw_to     = excluded.raw_to;

  -- Did they already enter us?
  select true into reciprocal
    from celestual_entries
   where from_handle = nt and to_handle = nf
   limit 1;

  -- DEFERRED REVEAL: regardless of mutuality, the caller is told only that the
  -- entry was recorded. We still do all match bookkeeping so the (exfil-safe)
  -- email to the OTHER side goes out — that email is now the sole reveal channel.
  if coalesce(reciprocal, false) then
    -- Mutual. Stamp both directed entries.
    update celestual_entries set matched_at = coalesce(matched_at, now())
     where (from_handle = nf and to_handle = nt)
        or (from_handle = nt and to_handle = nf);

    -- Record the match once (canonical ordering). If it already existed, the
    -- emails were already queued — do nothing, so nobody is mailed twice.
    ha := least(nf, nt);
    hb := greatest(nf, nt);
    insert into celestual_matches (handle_a, handle_b)
    values (ha, hb)
    on conflict (handle_a, handle_b) do nothing
    returning id into v_match_id;

    if v_match_id is not null then
      -- Exfil-safe: notify ONLY the OTHER side (the earlier entrant,
      -- from_handle = nt). We never email the address supplied on THIS
      -- triggering request, so an impersonator can't have a target's private
      -- feeling mailed to their own inbox.
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, next_attempt_at)
      select v_match_id, e.from_email, e.from_handle, e.to_handle, now()
        from celestual_entries e
       where e.from_handle = nt and e.to_handle = nf
         and e.from_email is not null;
    end if;
  end if;

  return jsonb_build_object('recorded', true);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_withdraw — a submitter un-sends a one-way entry. If the pair was
-- mutual, tear down the match row and any STILL-PENDING notification so no NEW
-- reveal goes out — but never retroactively "un-tell" anyone already emailed.
-- Returns: { "withdrawn": true|false }
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
  if nf is null or nt is null then
    raise exception 'invalid handle';
  end if;

  delete from celestual_entries where from_handle = nf and to_handle = nt;
  get diagnostics v_deleted = row_count;

  -- If the reverse entry no longer makes a mutual pair, clear match + pending mail.
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
-- celestual_suppress — public erasure / "never let me be entered" endpoint.
-- A third party whose handle was entered without consent can block it and wipe
-- existing data referencing it. Open by design (a non-user can't authenticate);
-- the effect is privacy-positive (block + delete). Rate limiting / verification
-- can be layered on later with handle ownership.
-- Returns: { "suppressed": "<handle>", "erased": <rows> }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_suppress(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_erased int;
begin
  if nh is null then
    raise exception 'invalid handle';
  end if;

  insert into celestual_suppressions (handle, reason)
  values (nh, 'self-service erasure')
  on conflict (handle) do nothing;

  -- Wipe pending mail + match rows + entries touching this handle (either side).
  delete from celestual_notifications where self_handle = nh or other_handle = nh;
  delete from celestual_matches where handle_a = nh or handle_b = nh;
  delete from celestual_entries where from_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — only the RPCs are exposed to the public roles.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_submit(text, text, text) from public;
grant execute on function celestual_submit(text, text, text) to anon, authenticated;
revoke all on function celestual_withdraw(text, text) from public;
grant execute on function celestual_withdraw(text, text) to anon, authenticated;
revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;
grant execute on function celestual_norm(text) to anon, authenticated;
