-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0003 — deferred reveal + erasure + harder limits.       ║
-- ║ ADDITIVE & idempotent. Touches only still_* objects.                ║
-- ╚══════════════════════════════════════════════════════════════════╝
-- Implements the launch-blocking safety/privacy fixes from PRODUCT-ANALYSIS.md
-- that do NOT require handle-ownership verification (Instagram OAuth):
--
--   §2.3  DEFERRED REVEAL (max-safety). still_submit no longer tells the caller
--         whether the pair is mutual. It returns only { recorded: true }. The
--         "yes" is delivered solely through the owner-controlled channel (the
--         match email to the EARLIER entrant — the exfil-safe rule from 0007).
--         This closes the live "prober oracle": an attacker who submits
--         from=<victim>, to=<target> can no longer read, on screen, whether the
--         target privately entered the victim. (The complete fix is ownership
--         verification; this is the strongest mitigation available without it.)
--
--   §4.1  HARDER RATE LIMITS. Adds a per-to_handle cap so a targeted prober who
--         rotates the (attacker-controlled) `from` handle is still throttled on
--         the victim they keep probing.
--
--   §2.5/§4.6  ERASURE + SUPPRESSION. New still_withdraw() lets a submitter
--         un-send a one-way entry; new still_suppress() is a public erasure /
--         "never let me be entered" endpoint for a third party whose handle was
--         entered without their consent. A suppressed to_handle is rejected.
--
--   §5.1  EMAIL DEAD-LETTER. Adds attempt/backoff/dead-letter columns to
--         still_notifications so a permanently-failing address stops being
--         retried forever and is visible as failed (drained by still-notify).
--
-- Re-runnable: every object uses IF NOT EXISTS / CREATE OR REPLACE / ADD COLUMN
-- IF NOT EXISTS.

-- ──────────────────────────────────────────────────────────────────────
-- SUPPRESSIONS — handles that must never be entered (third-party erasure).
-- Locked down like every other still_* table (RLS on, no client grants).
-- ──────────────────────────────────────────────────────────────────────
create table if not exists still_suppressions (
  handle     text primary key,        -- normalised @, blocked as a to_handle
  reason     text,
  created_at timestamptz not null default now()
);
alter table still_suppressions enable row level security;
revoke all on still_suppressions from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- EMAIL QUEUE — retry / dead-letter columns (§5.1). Additive.
-- ──────────────────────────────────────────────────────────────────────
alter table still_notifications add column if not exists attempts        int not null default 0;
alter table still_notifications add column if not exists last_error      text;
alter table still_notifications add column if not exists next_attempt_at timestamptz;
alter table still_notifications add column if not exists failed_at       timestamptz; -- dead-lettered

-- ──────────────────────────────────────────────────────────────────────
-- still_submit — same recording/matching as 0007, but DEFERRED REVEAL:
-- returns ONLY { recorded: true }. Never tells the caller if it's mutual.
-- Adds a per-to_handle rate cap and a suppression check.
-- Returns: { "recorded": true }
--          { "recorded": false, "error": "rate_limited" }
--          { "recorded": false, "error": "suppressed" }
-- ──────────────────────────────────────────────────────────────────────
create or replace function still_submit(p_from text, p_to text, p_email text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := still_norm(p_from);
  nt text := still_norm(p_to);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
  v_ip   text;
  v_ipn  int;
  v_fromn int;
  v_ton   int;
  reciprocal boolean;
  v_match_id uuid;
  ha text;
  hb text;
  -- Tunable trailing-hour limits. Generous for honest use, tight enough that a
  -- sweep trips fast. The per-to_handle cap is deliberately higher than the
  -- from/IP caps so a genuinely popular handle during a viral spike isn't
  -- blocked, while a single prober hammering one victim still trips it.
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

  -- §2.5/§4.6 — never record an entry against a suppressed (opted-out) handle.
  if exists (select 1 from still_suppressions where handle = nt) then
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
      from still_attempts
     where ip = v_ip and created_at > now() - interval '1 hour';
    if v_ipn >= c_ip_per_hour then
      return jsonb_build_object('recorded', false, 'error', 'rate_limited');
    end if;
  end if;
  select count(*) into v_fromn
    from still_attempts
   where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then
    return jsonb_build_object('recorded', false, 'error', 'rate_limited');
  end if;
  -- §4.1 — throttle a targeted prober who rotates the (attacker-controlled)
  -- `from` to reset their own counter: cap how many entries one target absorbs.
  select count(*) into v_ton
    from still_attempts
   where to_handle = nt and created_at > now() - interval '1 hour';
  if v_ton >= c_to_per_hour then
    return jsonb_build_object('recorded', false, 'error', 'rate_limited');
  end if;

  -- Log this attempt, then prune old rows ~2% of the time to keep it small.
  insert into still_attempts (ip, from_handle, to_handle) values (v_ip, nf, nt);
  if random() < 0.02 then
    delete from still_attempts where created_at < now() - interval '2 hours';
  end if;

  -- Record / refresh this directed entry. Re-submitting the same pair keeps a
  -- previously-given email if the new submission omits one.
  insert into still_entries (from_handle, to_handle, from_email, raw_from, raw_to)
  values (nf, nt, ne, p_from, p_to)
  on conflict (from_handle, to_handle) do update
    set from_email = coalesce(excluded.from_email, still_entries.from_email),
        raw_from   = excluded.raw_from,
        raw_to     = excluded.raw_to;

  -- Did they already enter us?
  select true into reciprocal
    from still_entries
   where from_handle = nt and to_handle = nf
   limit 1;

  -- DEFERRED REVEAL: regardless of whether it's mutual, the caller is told only
  -- that the entry was recorded. We still do all the match bookkeeping below so
  -- the (exfil-safe) email to the OTHER side goes out — that email is now the
  -- sole reveal channel.
  if coalesce(reciprocal, false) then
    -- Mutual. Stamp both directed entries.
    update still_entries set matched_at = coalesce(matched_at, now())
     where (from_handle = nf and to_handle = nt)
        or (from_handle = nt and to_handle = nf);

    -- Record the match once (canonical ordering). If it already existed, the
    -- emails were already queued — do nothing, so nobody is mailed twice.
    ha := least(nf, nt);
    hb := greatest(nf, nt);
    insert into still_matches (handle_a, handle_b)
    values (ha, hb)
    on conflict (handle_a, handle_b) do nothing
    returning id into v_match_id;

    if v_match_id is not null then
      -- Exfil-safe: notify ONLY the OTHER side (the earlier entrant,
      -- from_handle = nt). We never email the address supplied on THIS
      -- triggering request, so an impersonator can't have a target's private
      -- feeling mailed to their own inbox. (The triggering submitter is not
      -- notified for this pair until ownership verification ships — documented
      -- tradeoff of deferred reveal without OAuth.)
      insert into still_notifications (match_id, to_email, self_handle, other_handle, next_attempt_at)
      select v_match_id, e.from_email, e.from_handle, e.to_handle, now()
        from still_entries e
       where e.from_handle = nt and e.to_handle = nf
         and e.from_email is not null;
    end if;
  end if;

  return jsonb_build_object('recorded', true);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- still_withdraw — a submitter un-sends a one-way entry (§4.6). Removes the
-- directed from→to entry. If the pair was mutual, we tear down the match row
-- and any STILL-PENDING notification, so no NEW reveal goes out — but we never
-- retroactively "un-tell" anyone already emailed (documented rule).
-- Returns: { "withdrawn": true|false }
-- ──────────────────────────────────────────────────────────────────────
create or replace function still_withdraw(p_from text, p_to text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nf text := still_norm(p_from);
  nt text := still_norm(p_to);
  ha text;
  hb text;
  v_deleted int;
begin
  if nf is null or nt is null then
    raise exception 'invalid handle';
  end if;

  delete from still_entries where from_handle = nf and to_handle = nt;
  get diagnostics v_deleted = row_count;

  -- If the reverse entry no longer makes a mutual pair, clear match + pending mail.
  ha := least(nf, nt);
  hb := greatest(nf, nt);
  delete from still_notifications n
   using still_matches m
   where n.match_id = m.id and m.handle_a = ha and m.handle_b = hb
     and n.sent_at is null;
  delete from still_matches where handle_a = ha and handle_b = hb;

  return jsonb_build_object('withdrawn', v_deleted > 0);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- still_suppress — public erasure / "never let me be entered" endpoint (§2.5).
-- A third party whose handle was entered without consent can block it and wipe
-- existing data referencing it. Open by design (a non-user can't authenticate);
-- the effect is privacy-positive (block + delete), so abuse risk is low. Rate
-- limiting / verification can be layered on later with ownership.
-- Returns: { "suppressed": "<handle>", "erased": <rows> }
-- ──────────────────────────────────────────────────────────────────────
create or replace function still_suppress(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := still_norm(p_handle);
  v_erased int;
begin
  if nh is null then
    raise exception 'invalid handle';
  end if;

  insert into still_suppressions (handle, reason)
  values (nh, 'self-service erasure')
  on conflict (handle) do nothing;

  -- Wipe pending mail + match rows + entries touching this handle (either side).
  delete from still_notifications where self_handle = nh or other_handle = nh;
  delete from still_matches where handle_a = nh or handle_b = nh;
  delete from still_entries where from_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — only the RPCs are exposed to the public roles.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function still_submit(text, text, text) from public;
grant execute on function still_submit(text, text, text) to anon, authenticated;
revoke all on function still_withdraw(text, text) from public;
grant execute on function still_withdraw(text, text) to anon, authenticated;
revoke all on function still_suppress(text) from public;
grant execute on function still_suppress(text) to anon, authenticated;
