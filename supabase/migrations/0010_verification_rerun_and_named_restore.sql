-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0010 — verification re-runs + named cross-device restore ║
-- ║ kill the "works once, never twice" failure · pings restore by name   ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- TWO PROBLEMS, ONE MIGRATION.
--
-- 1. THE "ONE AND DONE" VERIFICATION FAILURE. The DM flow could complete a
--    person's FIRST verification and then read as dead on every later run.
--    Three compounding causes, each fixed here or in the paired edge-function/
--    docs changes:
--
--      a. RELAY RE-TRIGGER (the big one — config, documented): a ManyChat
--         automation built on the *Default Reply* trigger fires at most ONCE
--         PER CONTACT PER 24 HOURS by default. The first DM verifies
--         instantly; the second run's DM never reaches the backend at all, so
--         the site polls until the code dies. The setup guide + function
--         comments now make the Keyword trigger (fires every time) canonical
--         and call the trap out loudly. Nothing SQL can do about a relay that
--         never calls — but (b) and (c) stop every failure that IS ours.
--
--      b. STALE SESSION TTL: a database that stopped at migration 0006 still
--         runs 24-HOUR verified sessions and non-sliding proofs, so the day
--         after a successful run every proof reads 'unverified' and the person
--         is thrown back into the (possibly dead, see a) DM dance. 0009 fixed
--         this; this migration RESTATES the 30-day sliding versions so
--         applying 0010 heals a 0006-era database too. Re-runnable, idempotent.
--
--      c. DEAD-END REPLIES: re-sending an old code after a success (or after
--         the other relay path won the race, when both Meta + ManyChat are
--         live) answered "that code didn't match an active request" — which
--         reads as "verification is broken" even though the person IS
--         verified. celestual_complete_ig_verification now tells the relay
--         WHY nothing was pending ('already_verified' with the live handle,
--         or 'code_expired'), so the feedback DM can say the truth: "you're
--         already verified — head back to the app."
--
-- 2. DEVICE-LOCKED PINGS, REMOVED. Unmatched targets were stored ONLY as
--    salted hashes, so celestual_my_pings could restore them merely as
--    anonymous rows — the @s a person typed were readable only on the device
--    that placed them. That privacy posture read as a bug ("my pings vanish on
--    my other phone") and is retired by product decision: celestual_submit now
--    also stores the normalised plaintext target alongside the hash, and
--    celestual_my_pings returns it to the DM-proven owner. Matching,
--    suppression and rate-limiting still run entirely on hashes; the plaintext
--    column exists solely so the owner's own restore is complete. Rows placed
--    before this migration hold no plaintext (it cannot be recovered from a
--    hash) and continue to restore anonymously until re-placed or renewed by
--    the owning device.
--
-- Re-runnable (CREATE OR REPLACE / IF NOT EXISTS / guarded ALTERs).

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- ENTRIES — the plaintext target, restored. Kept next to the hash the
-- mechanism still runs on. Backfill what CAN be recovered: matched pairs
-- already carry their plaintext in matched_handle.
-- ──────────────────────────────────────────────────────────────────────
alter table celestual_entries add column if not exists to_handle text;
update celestual_entries set to_handle = matched_handle
 where to_handle is null and matched_handle is not null;

-- ──────────────────────────────────────────────────────────────────────
-- 1b. RESTATE the 30-day sliding session pieces (0009), so a database that
-- stopped earlier catches up by applying this one file.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_consume_ig_proof(p_handle text, p_proof text)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh text := celestual_norm(p_handle);
  v_hash text;
  v_id uuid;
  c_session_ttl constant interval := interval '30 days';
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
  update celestual_ig_verifications
     set last_used_at = now(),
         expires_at = greatest(expires_at, now() + c_session_ttl)
   where id = v_id;
  return true;
end;
$$;

create index if not exists celestual_ig_token_idx
  on celestual_ig_verifications (token);

-- ──────────────────────────────────────────────────────────────────────
-- 1c. celestual_complete_ig_verification v4 — same decisive check (Meta's
-- authenticated username must equal the claimed handle; the code stays a mere
-- correlation id and completion stays strictly per-token — flipping OTHER
-- pending rows for the handle would hand a proof to any stranger who had a
-- claim open on it). New: when nothing is pending for the code, say WHY, so
-- the relay's feedback DM can stop gaslighting people who already succeeded:
--   { ok:false, error:'no_pending', already_verified:true, handle }
--     — the sender holds a live verified session; the site is (or will read)
--       verified. Reply "you're already verified".
--   { ok:false, error:'no_pending', code_expired:true }
--     — that exact code existed for this sender's handle but timed out.
--       Reply "code expired — get a fresh one".
--   { ok:false, error:'no_pending' } — unknown/foreign code. Generic reply.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_complete_ig_verification(p_token text, p_igsid text, p_username text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  v_handle text;
  nu text := celestual_norm(p_username);
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token is null or nu is null then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  select id, handle into v_id, v_handle
    from celestual_ig_verifications
   where token = p_token and status = 'pending' and expires_at > now()
   limit 1;
  if v_id is null then
    -- Nothing pending under this code. Distinguish the two honest states a
    -- REAL person lands in (re-sent an old code after success; sat on a code
    -- past its TTL) from a genuinely foreign code.
    if exists (select 1 from celestual_ig_verifications
                where handle = nu and status = 'verified' and expires_at > now()) then
      return jsonb_build_object('ok', false, 'error', 'no_pending',
                                'already_verified', true, 'handle', nu);
    end if;
    if exists (select 1 from celestual_ig_verifications
                where token = p_token and handle = nu and expires_at <= now()) then
      return jsonb_build_object('ok', false, 'error', 'no_pending', 'code_expired', true);
    end if;
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
-- 2. celestual_submit — byte-identical to 0009 except: the entry now also
-- stores the normalised plaintext target (to_handle), and re-placing an
-- existing pair refreshes it (healing pre-0010 anonymous rows the moment the
-- owning device re-places or renews-by-replacing).
-- ──────────────────────────────────────────────────────────────────────
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

  v_ip := celestual_client_ip();

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

  -- Record / refresh the ping. Hash for the mechanism, plaintext for the
  -- owner's own cross-device restore (see header §2).
  insert into celestual_entries (from_handle, to_hash, to_handle, from_email, intent, expires_at)
  values (nf, nh, nt, ne, ni, v_expires)
  on conflict (from_handle, to_hash) do update
    set from_email = coalesce(excluded.from_email, celestual_entries.from_email),
        intent     = coalesce(excluded.intent, celestual_entries.intent),
        to_handle  = excluded.to_handle,
        expires_at = case when celestual_entries.matched_at is null then excluded.expires_at
                          else celestual_entries.expires_at end,
        renew_notified_at = null;

  if v_existing_id is null then
    insert into celestual_placements (handle) values (nf);
  end if;

  -- ── GROUP-AWARE RECIPROCAL, BY HASH ─────────────────────────────────
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
    'reachable', v_mutual or celestual_is_member(nt),
    'expires_at', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'slots', jsonb_build_object('standing', v_standing, 'cap', c_standing_cap)
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- 2. celestual_my_pings — cross-device restore, now NAMED. The DM-proven owner
-- gets back the @ of every live ping they placed (matched or standing), because
-- submit stores the plaintext target for exactly this read. Rows from before
-- 0010 carry no plaintext and still return handle:null (anonymous) until the
-- owning device re-places them — the hash cannot be reversed.
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
           'handle', coalesce(e.matched_handle, e.to_handle),
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
-- celestual_suppress — unchanged logic, plus the wipe now also matches the
-- restored plaintext column so an opt-out erases every reference to the
-- handle no matter which side or column names it.
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

  v_ip := celestual_client_ip();
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
  delete from celestual_entries
   where from_handle = nh or to_hash = hh or matched_handle = nh or to_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_community_members where handle = nh;
  delete from celestual_campus_prereg where handle = nh;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — restate so a fresh database applying 0001→0010 in order lands in
-- exactly the right state (CREATE OR REPLACE preserves ACLs on live ones).
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_submit(text, text, text, text, text) from public;
grant execute on function celestual_submit(text, text, text, text, text) to anon, authenticated;
revoke all on function celestual_my_pings(text, text) from public;
grant execute on function celestual_my_pings(text, text) to anon, authenticated;
revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;

revoke execute on function celestual_consume_ig_proof(text, text)      from anon, authenticated, public;
revoke execute on function celestual_complete_ig_verification(text, text, text) from anon, authenticated, public;
grant  execute on function celestual_complete_ig_verification(text, text, text) to service_role;
