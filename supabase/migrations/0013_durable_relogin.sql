-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0013 — durable, DM-free recovery (Fix B)                 ║
-- ║ bind handle⇄email once, then an email magic-link re-issues the proof ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- THE ROOT-CAUSE FIX (docs/MANYCHAT-SETUP.md §8.2/§8.4 "B"). A DM-verified
-- session is a 30-day sliding window in Postgres, but its only key — the `proof`
-- secret — lived ONLY in the browser's localStorage. Lose that storage
-- (Instagram's in-app browser sandbox, iOS ITP eviction, a new device, a clear)
-- and the app has no way to reach the still-live server session, so it forces a
-- fresh DM. That re-DMing is the repetitive pattern Instagram's anti-spam layer
-- throttles — i.e. the discarded session is what MANUFACTURED the "works once,
-- then fails" complaint. See §8 for the full investigation.
--
-- THE REMEDY: a server-backed recovery that needs no DM and works cross-device.
--   1. BIND (once, at DM verification). The browser, holding a fresh valid proof,
--      binds its handle to the email the user already gave us
--      (celestual_bind_recovery). Only a genuine DM proof can write the binding,
--      so the trust chain is intact: the DM proved handle↔account once.
--   2. RE-LOGIN (any later return, any device). "Sign back in" emails a one-time
--      magic link to the bound address. Opening it redeems a fresh, randomly
--      generated proof (minted client-side; only its hash is stored) bound to
--      that handle — celestual_relogin_redeem — re-establishing a full 30-day
--      verified session WITHOUT another DM. Email ownership stands in for the DM
--      on re-entry, exactly like a magic-link login anywhere.
--
-- This reuses the existing Resend email path (celestual-notify / celestual-remind
-- style) via a new celestual-relogin edge function. The DM becomes a ONE-TIME
-- step instead of a recurring tax.
--
-- SECURITY POSTURE. The link token is a secret: the browser gets the raw token in
-- the email, the DB stores only its SHA-256 hash, it is single-use and short-TTL.
-- The recovery email is the same address already trusted for match/lapse mail; a
-- compromised email can re-login as the handle, which is the standard, accepted
-- magic-link tradeoff (documented in docs/SECURITY.md). Both service-role RPCs
-- are callable only by the edge function; the browser can never mint its own proof.
--
-- Re-runnable (IF NOT EXISTS / CREATE OR REPLACE). Safe on top of 0001→0012.

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_recovery — the handle⇄email binding, written ONLY under a live DM
-- proof. One row per handle; the plaintext email is the recovery channel (same
-- retention/deletion story as celestual_entries.from_email — see SECURITY.md and
-- the opt-out wipe below). RLS-locked: no client reads or writes it directly.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_recovery (
  handle     text primary key,
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table celestual_recovery enable row level security;
revoke all on celestual_recovery from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_relogin_tokens — one row per magic link issued. token_hash is the
-- SHA-256 of the raw token that rode the email; the raw token never touches the
-- DB. Single-use (used_at) and short-lived (expires_at). RLS-locked.
-- ──────────────────────────────────────────────────────────────────────
create table if not exists celestual_relogin_tokens (
  id         uuid primary key default gen_random_uuid(),
  handle     text not null,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists celestual_relogin_token_idx   on celestual_relogin_tokens (token_hash);
create index if not exists celestual_relogin_expires_idx on celestual_relogin_tokens (expires_at);
alter table celestual_relogin_tokens enable row level security;
revoke all on celestual_relogin_tokens from anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_bind_recovery(handle, proof, email) — CLIENT-callable (anon).
-- Binds handle⇄email, but ONLY when `proof` matches a live verified session for
-- `handle` (the fresh DM proof the browser just earned). A bad proof, a missing
-- email, or a malformed address is a silent no-op. This is the ONE moment the
-- recurring DM is traded for a durable email recovery.
-- Returns: { ok:true } | { ok:false }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_bind_recovery(p_handle text, p_proof text, p_email text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  ne text := nullif(trim(lower(coalesce(p_email, ''))), '');
begin
  if nh is null or ne is null then
    return jsonb_build_object('ok', false);
  end if;
  if ne !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok', false);
  end if;
  -- The gate: the caller must hold a live DM proof for this handle. Reuses the
  -- same owner-only check celestual_submit / celestual_my_pings use (it also
  -- slides the session forward, which is exactly right on a fresh verify).
  if not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false);
  end if;

  insert into celestual_recovery (handle, email)
  values (nh, ne)
  on conflict (handle) do update set email = excluded.email, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_relogin_store(handle, token_hash) — SERVICE ROLE ONLY.
-- Called by the celestual-relogin edge function on a "sign back in" request. If a
-- recovery email is bound for the handle, records the token hash (20-minute TTL,
-- single-use) and returns the address to send the link to. Rate-limited per
-- handle. NEVER reveals whether a handle is bound to the browser — the edge
-- function answers { ok:true } to the client either way (anti-enumeration).
-- Returns: { ok:true, email } | { ok:false }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_relogin_store(p_handle text, p_token_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_email text;
  v_n int;
  c_ttl        constant interval := interval '20 minutes';
  c_per_hour   constant int := 5;
begin
  if nh is null or p_token_hash is null or p_token_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false);
  end if;

  select email into v_email from celestual_recovery where handle = nh;
  if v_email is null then
    return jsonb_build_object('ok', false);
  end if;

  select count(*) into v_n from celestual_relogin_tokens
   where handle = nh and created_at > now() - interval '1 hour';
  if v_n >= c_per_hour then
    return jsonb_build_object('ok', false);
  end if;

  -- Opportunistic sweep of spent/dead tokens so the table stays small.
  if random() < 0.2 then
    delete from celestual_relogin_tokens
     where used_at is not null or expires_at < now() - interval '1 day';
  end if;

  insert into celestual_relogin_tokens (handle, token_hash, expires_at)
  values (nh, lower(p_token_hash), now() + c_ttl);

  return jsonb_build_object('ok', true, 'email', v_email, 'handle', nh);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_relogin_redeem(token_hash, proof_hash) — SERVICE ROLE ONLY.
-- Called by the edge function when the magic link is opened. Validates the token
-- (live + unused), burns it, and mints a FRESH verified session for the bound
-- handle with the browser's new proof hash (30-day sliding window, same as a DM
-- completion). The raw proof stays in the browser; only its hash is stored, so a
-- DB leak still can't forge a submission.
-- Returns: { ok:true, handle } | { ok:false, error:'invalid' }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_relogin_redeem(p_token_hash text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  v_handle text;
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-fA-F]{64}$'
     or p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select id, handle into v_id, v_handle
    from celestual_relogin_tokens
   where token_hash = lower(p_token_hash) and used_at is null and expires_at > now()
   order by created_at desc
   limit 1
   for update;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  update celestual_relogin_tokens set used_at = now() where id = v_id;

  -- Mint the verified session. `token` here is meaningless (the partial unique
  -- index only constrains PENDING rows); use a random value so it's never null.
  insert into celestual_ig_verifications (handle, token, proof_hash, status, expires_at, verified_at)
  values (v_handle, 'relogin:' || substr(md5(random()::text || clock_timestamp()::text), 1, 12),
          lower(p_proof_hash), 'verified', now() + c_session_ttl, now());

  insert into celestual_members (handle, handle_hash)
  values (v_handle, celestual_hash_handle(v_handle))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', v_handle);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_suppress — extend the opt-out wipe to the new recovery surfaces, so
-- deleting everything erases the handle's bound email and any live magic links.
-- (Byte-identical to 0010 except the two extra deletes.)
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
  -- the durable-recovery surfaces (0013)
  delete from celestual_recovery where handle = nh;
  delete from celestual_relogin_tokens where handle = nh;
  delete from celestual_ig_verifications where handle = nh;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS. bind is client-facing (proof-gated); store + redeem are the edge
-- function's alone (service role) — the browser can never mint its own proof.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_bind_recovery(text, text, text) from public;
grant execute on function celestual_bind_recovery(text, text, text) to anon, authenticated;

revoke all on function celestual_relogin_store(text, text)  from anon, authenticated, public;
grant execute on function celestual_relogin_store(text, text)  to service_role;
revoke all on function celestual_relogin_redeem(text, text) from anon, authenticated, public;
grant execute on function celestual_relogin_redeem(text, text) to service_role;

revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;
