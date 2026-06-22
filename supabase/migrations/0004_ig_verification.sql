-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0004 — Instagram DM handle-ownership verification        ║
-- ║ prove you own the @ you type, with a one-time code sent as a DM      ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- This closes the "one remaining gap" tracked in docs/SECURITY.md: until now the
-- submitter's `from` handle was whatever they TYPED — never proven. This migration
-- adds a ToS-compliant proof of ownership that needs NO Facebook/Instagram OAuth
-- from the visitor: they send a short code to our Instagram account as a DM, and
-- Meta's official Messaging webhook tells our backend the REAL username of whoever
-- sent it. We verify that username equals the claimed handle. See
-- docs/SETUP-IG-VERIFY.md for the operator setup.
--
-- WHY THIS IS SECURE EVEN WITH A 4-DIGIT CODE
--   The 4-digit token is only a CORRELATION code (it links "this incoming DM" to
--   "this browser session") — it is NOT a secret that grants anything. The security
--   comes from the DM's sender identity, which Meta authenticates and which we
--   re-fetch server-side from the Graph API (never trusting the client). A code
--   guess buys nothing: to verify @alice, the DM must come from an account whose
--   Meta username IS @alice, and an attacker cannot send a DM as someone else.
--
-- THE PROOF SECRET (capability the browser holds after verifying)
--   The browser mints a random 256-bit `proof` at start and sends only its SHA-256
--   HASH to the server. On a successful DM the row flips to 'verified'. To actually
--   SEAL, the browser passes the raw `proof` to celestual_submit, which hashes it
--   and matches the stored hash — so the server, not the client, is the authority
--   on "is this handle verified", and a DB leak can't forge a submission.
--
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE).

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- SETTINGS — tiny key/value table for operator-controlled flags. Locked down;
-- read only by SECURITY DEFINER helpers. Seeded with enforcement OFF so the app
-- keeps working before Instagram verification is wired (flip it on as the final
-- go-live step — see docs/SETUP-IG-VERIFY.md).
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
insert into celestual_settings (key, value) values ('require_ig_verification', 'false')
  on conflict (key) do nothing;

alter table celestual_settings enable row level security;
revoke all on celestual_settings from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- VERIFICATIONS — one row per attempt to prove ownership of `handle`.
--   • status 'pending'  : code issued, waiting on the DM (TTL ~10 min)
--   • status 'verified' : the DM arrived from the matching account (TTL ~24 h)
--   • status 'expired'  : superseded / timed out
-- Locked down: no client can read it. The two public RPCs (start/poll) return only
-- a tiny status; the webhook completes it via the service role.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_ig_verifications (
  id           uuid primary key default gen_random_uuid(),
  handle       text not null,                 -- normalised claimed @
  token        text not null,                 -- 4-digit DM code (only meaningful while pending)
  proof_hash   text not null,                 -- sha256 hex of the browser-held proof secret
  status       text not null default 'pending',
  igsid        text,                          -- Meta sender id, bound on success (audit)
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  verified_at  timestamptz,
  last_used_at timestamptz
);
-- At most ONE pending row may hold a given code at a time, so the webhook can map a
-- code → exactly one pending session. (Verified/expired rows free the code for reuse.)
create unique index if not exists celestual_ig_pending_token_uidx
  on celestual_ig_verifications (token) where status = 'pending';
create index if not exists celestual_ig_handle_idx   on celestual_ig_verifications (handle);
create index if not exists celestual_ig_expires_idx  on celestual_ig_verifications (expires_at);

alter table celestual_ig_verifications enable row level security;
revoke all on celestual_ig_verifications from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_ig_required() — is ownership verification enforced right now?
-- Internal (SECURITY DEFINER, NOT granted to clients); celestual_submit reads it.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_ig_required() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true' from celestual_settings where key = 'require_ig_verification'), false)
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_verification(handle, proof_hash) — begin a proof.
-- Issues a unique 4-digit code with a short TTL and records the browser's proof
-- HASH (never the secret). Rate-limited per IP and per handle. Returns:
--   { ok:true, token:'1234', expires_at:'…Z' }  |  { ok:false, error:'rate_limited'|'busy' }
-- NOTE: starting a verification for a handle you don't own is harmless — it can
-- only ever flip to 'verified' if a DM arrives from that exact account.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_start_ig_verification(p_handle text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_ip text;
  v_n  int;
  v_token text;
  v_try int := 0;
  c_pending_ttl      constant interval := interval '10 minutes';
  c_start_per_ip     constant int := 15;   -- per IP / hour
  c_start_per_handle constant int := 8;    -- per handle / hour
  -- ↑ Widen the code to 6 digits by changing 10000→1000000 and lpad(...,4→6) below.
  --   Security does NOT depend on code length (see header), so 4 digits is fine.
begin
  if nh is null then raise exception 'invalid handle'; end if;
  -- proof_hash must look like a sha-256 hex digest (64 hex chars).
  if p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid proof';
  end if;

  begin
    v_ip := nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), '');
  exception when others then v_ip := null; end;

  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
    if v_n >= c_start_per_ip then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_n from celestual_attempts
    where to_handle = nh and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
  if v_n >= c_start_per_handle then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  -- Keep the table (and the code space) healthy: drop timed-out rows. Indexed on
  -- expires_at, gated so concurrent starts don't all contend.
  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '1 minute';
  end if;

  -- Issue a code unique among CURRENTLY pending rows (retry on the rare collision).
  loop
    v_try := v_try + 1;
    v_token := lpad((floor(random() * 10000))::int::text, 4, '0');
    begin
      insert into celestual_ig_verifications (handle, token, proof_hash, expires_at)
      values (nh, v_token, lower(p_proof_hash), now() + c_pending_ttl);
      exit;
    exception when unique_violation then
      if v_try >= 30 then
        return jsonb_build_object('ok', false, 'error', 'busy');
      end if;
    end;
  end loop;

  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);

  return jsonb_build_object(
    'ok', true,
    'token', v_token,
    'expires_at', to_char((now() + c_pending_ttl) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_poll_ig_verification(token, proof_hash) — has the DM arrived yet?
-- Requires BOTH the code AND the matching proof hash, so a random poller learns
-- nothing (it never returns a handle, a secret, or another session's state).
-- Returns: { status: 'pending' | 'verified' | 'expired' | 'none' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_poll_ig_verification(p_token text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status  text;
  v_expires timestamptz;
begin
  if p_token is null or p_proof_hash is null then
    return jsonb_build_object('status', 'none');
  end if;
  select status, expires_at into v_status, v_expires
    from celestual_ig_verifications
   where token = p_token and proof_hash = lower(p_proof_hash)
   order by created_at desc
   limit 1;
  if not found then
    return jsonb_build_object('status', 'none');
  end if;
  if v_expires < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  return jsonb_build_object('status', v_status);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_complete_ig_verification(token, igsid, username) — SERVICE ROLE ONLY.
-- Called by the celestual-ig-webhook edge function once Meta has authenticated the
-- DM. The decisive check lives here: the REAL username Meta reports for the sender
-- must equal the handle this code was issued for. The browser can NEVER call this.
-- Returns: { ok:true, handle } | { ok:false, error:'no_pending'|'handle_mismatch'|… }
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

  return jsonb_build_object('ok', true, 'handle', v_handle);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_consume_ig_proof(handle, proof) — internal gate used by celestual_submit.
-- True iff there is a live 'verified' row for `handle` whose stored hash matches
-- sha256(proof). SECURITY DEFINER, NOT granted to clients (only celestual_submit,
-- running as owner, calls it).
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_consume_ig_proof(p_handle text, p_proof text)
returns boolean
language plpgsql security definer set search_path = public as $$
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

-- ──────────────────────────────────────────────────────────────────────
-- celestual_submit — now also enforces handle-ownership when it is turned on.
-- Identical to 0003 except: (a) it takes an optional p_proof, and (b) when
-- require_ig_verification is 'true' it rejects a submit whose `from` is not proven
-- (error 'unverified'). With enforcement OFF (default) behaviour is unchanged, so
-- nothing breaks before Instagram verification is wired.
-- We DROP the 3-arg signature and CREATE the 4-arg one (p_proof defaults null, so
-- existing 3-argument callers keep working).
-- ──────────────────────────────────────────────────────────────────────
drop function if exists celestual_submit(text, text, text);

create or replace function celestual_submit(p_from text, p_to text, p_email text default null, p_proof text default null)
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

  -- ── HANDLE OWNERSHIP (Instagram DM verification, §verify) ───────────
  -- When enforcement is on, the submitter must prove they own `from`. The proof is
  -- minted only by a Meta-authenticated DM (celestual_complete_ig_verification);
  -- the browser can't fake it, so this is the server-side authority that finally
  -- ties every entry's "from" side to a real, controlled Instagram account.
  if celestual_ig_required() then
    if not celestual_consume_ig_proof(nf, p_proof) then
      return jsonb_build_object('recorded', false, 'error', 'unverified');
    end if;
  end if;

  -- Never record an entry against a suppressed (opted-out) handle.
  if exists (select 1 from celestual_suppressions where handle = nt) then
    return jsonb_build_object('recorded', false, 'error', 'suppressed');
  end if;

  -- Best-effort client IP.
  begin
    v_ip := nullif(trim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), '');
  exception when others then v_ip := null; end;

  -- Trailing-hour rate limits (IP / from / to) — a backstop against bursts. We
  -- exclude the sentinel rows that verification/suppress write (from_handle
  -- 'celestual:%') so a handle's own verifications don't inflate the per-to cap on
  -- entering it, nor the per-IP submit cap.
  if v_ip is not null then
    select count(*) into v_ipn from celestual_attempts
     where ip = v_ip and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
    if v_ipn >= c_ip_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_fromn from celestual_attempts where from_handle = nf and created_at > now() - interval '1 hour';
  if v_fromn >= c_from_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;
  select count(*) into v_ton from celestual_attempts
   where to_handle = nt and created_at > now() - interval '1 hour' and from_handle not like 'celestual:%';
  if v_ton >= c_to_per_hour then return jsonb_build_object('recorded', false, 'error', 'rate_limited'); end if;

  -- Is this a brand-new person, or a re-submit of an existing pair? Re-submits
  -- (e.g. adding an email later) never cost a slot.
  select true into v_existing from celestual_entries where from_handle = nf and to_handle = nt limit 1;

  -- ── SLOT BUDGET ─────────────────────────────────────────────────────
  if not coalesce(v_existing, false) then
    insert into celestual_slots (handle) values (nf) on conflict (handle) do nothing;
    select remaining, updated_at into v_remaining, v_updated
      from celestual_slots where handle = nf for update;

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
      insert into celestual_notifications (match_id, to_email, self_handle, other_handle, next_attempt_at)
      select v_match_id, reciprocal_email, reciprocal_from, nf, now()
       where reciprocal_email is not null;
    end if;
  end if;

  -- For a re-submit (no slot spent) read the live snapshot so the meter is accurate.
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
    'match', case when v_mutual then nt else null end,
    'slots', jsonb_build_object(
      'remaining', greatest(coalesce(v_remaining, c_slot_cap), 0), 'cap', c_slot_cap,
      'next_at', case when coalesce(v_remaining, c_slot_cap) >= c_slot_cap then null
        else to_char((v_updated + c_regen) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') end)
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — only the two visitor-facing RPCs are exposed. The completion path and
-- the internal gates stay private (clients can never self-verify or self-submit).
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_start_ig_verification(text, text) from public;
grant execute on function celestual_start_ig_verification(text, text) to anon, authenticated;
revoke all on function celestual_poll_ig_verification(text, text) from public;
grant execute on function celestual_poll_ig_verification(text, text) to anon, authenticated;

revoke all on function celestual_submit(text, text, text, text) from public;
grant execute on function celestual_submit(text, text, text, text) to anon, authenticated;

-- Internal-only (no client grant): the webhook uses the service role; the gates are
-- reached only by celestual_submit running as owner.
revoke all on function celestual_complete_ig_verification(text, text, text) from public;
grant execute on function celestual_complete_ig_verification(text, text, text) to service_role;
revoke all on function celestual_consume_ig_proof(text, text) from public;
revoke all on function celestual_ig_required() from public;
