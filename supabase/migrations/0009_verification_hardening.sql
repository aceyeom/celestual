-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0009 — verification & auth hardening                     ║
-- ║ spoof-proof rate-limit IPs · 30-day sliding sessions · input caps    ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- The full-audit hardening pass over the login/verification path. Three things
-- change, everything else is byte-identical to 0006:
--
--   1. SPOOF-RESISTANT CLIENT IP. Every per-IP rate limit used to key on the
--      FIRST hop of x-forwarded-for — which the client itself can prepend to,
--      so one machine could rotate fake IPs and never trip a cap. The new
--      celestual_client_ip() helper prefers cf-connecting-ip (set by
--      Cloudflare, which fronts Supabase — a client cannot forge it), then
--      x-real-ip, then the old XFF first hop as a last resort. All three
--      IP-limited RPCs (submit / start-verification / suppress) now use it.
--
--   2. 30-DAY SLIDING VERIFIED SESSION (friction fix). A completed DM
--      verification used to live 24 hours, forcing the DM dance daily. Now a
--      verified session stands 30 days, and every successful proof use slides
--      it forward another 30 — an active user never re-verifies; an abandoned
--      proof still dies. The proof secret is unchanged (256-bit, browser-held,
--      only its hash stored), so this widens exposure exactly like a normal
--      long-lived session cookie does — and signing out still kills it locally.
--
--   3. INPUT CAP AT THE SOURCE. celestual_norm() now returns NULL for anything
--      longer than Instagram's 30-character handle maximum, so every RPC
--      rejects over-long garbage at the front door instead of storing it.
--
-- Plus one index: poll reads on non-pending rows had no token index (the 0004
-- unique index only covers status='pending'); celestual_ig_token_idx fixes it.
--
-- Re-runnable (CREATE OR REPLACE / IF NOT EXISTS). Safe to apply to a live
-- project: signatures are unchanged, so ACLs and callers are untouched.

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_norm — unchanged normalisation, plus the 30-char Instagram cap.
-- A real IG handle can never exceed 30 chars, so anything longer is junk and
-- normalises to NULL ("invalid handle") everywhere at once.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_norm(h text) returns text
language sql immutable set search_path = public as $$
  select case when x is null or length(x) > 30 then null else x end
  from (
    select nullif(
      regexp_replace(
        regexp_replace(lower(trim(coalesce(h, ''))), '^@+', ''),
        '[^a-z0-9._]', '', 'g'
      ),
    '') as x
  ) s
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_client_ip — the one place that decides "who is this request from"
-- for rate limiting. Internal only (never granted to clients).
--   • cf-connecting-ip: set by Cloudflare itself on every request it fronts —
--     a client cannot inject it, so it's the trusted first choice.
--   • x-real-ip: set by some proxies; second choice.
--   • x-forwarded-for first hop: the legacy fallback. A client CAN prepend to
--     it, which is exactly why it's last — and why per-IP caps remain a rate
--     bucket, never an identity.
-- Returns NULL when no header is readable (the caller then skips the IP cap,
-- exactly as before).
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_client_ip() returns text
language plpgsql stable security definer set search_path = public as $$
declare
  h json;
  v text;
begin
  begin
    h := current_setting('request.headers', true)::json;
  exception when others then
    return null;
  end;
  if h is null then return null; end if;
  v := nullif(trim(h ->> 'cf-connecting-ip'), '');
  if v is not null then return v; end if;
  v := nullif(trim(h ->> 'x-real-ip'), '');
  if v is not null then return v; end if;
  return nullif(trim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), '');
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- Poll reads look rows up by token AFTER they leave 'pending' (the 0004 unique
-- index is partial on status='pending'), so give the lookup a real index.
-- ──────────────────────────────────────────────────────────────────────
create index if not exists celestual_ig_token_idx
  on celestual_ig_verifications (token);

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_verification — identical to 0004 except the IP source.
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
begin
  if nh is null then raise exception 'invalid handle'; end if;
  if p_proof_hash is null or p_proof_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'invalid proof';
  end if;

  v_ip := celestual_client_ip();

  if v_ip is not null then
    select count(*) into v_n from celestual_attempts
      where ip = v_ip and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
    if v_n >= c_start_per_ip then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;
  end if;
  select count(*) into v_n from celestual_attempts
    where to_handle = nh and from_handle = 'celestual:igstart' and created_at > now() - interval '1 hour';
  if v_n >= c_start_per_handle then return jsonb_build_object('ok', false, 'error', 'rate_limited'); end if;

  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '1 minute';
  end if;

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
-- celestual_complete_ig_verification — identical decisive check (Meta's real
-- username must equal the claim), with the session TTL raised 24h → 30 days.
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
-- celestual_consume_ig_proof — identical gate, now SLIDING: each successful
-- use pushes the session another 30 days out, so an active person never has to
-- redo the DM dance, while an abandoned proof still dies on schedule.
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

-- ──────────────────────────────────────────────────────────────────────
-- celestual_submit — byte-identical to 0006 except the IP source.
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
-- celestual_suppress — byte-identical to 0006 except the IP source.
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
  delete from celestual_entries where from_handle = nh or to_hash = hh or matched_handle = nh;
  get diagnostics v_erased = row_count;
  delete from celestual_members where handle = nh;
  delete from celestual_community_members where handle = nh;
  delete from celestual_campus_prereg where handle = nh;

  return jsonb_build_object('suppressed', nh, 'erased', v_erased);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — CREATE OR REPLACE preserves ACLs, but restate them so a fresh
-- database applying 0001→0009 in order ends in exactly the right state.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_start_ig_verification(text, text) from public;
grant execute on function celestual_start_ig_verification(text, text) to anon, authenticated;
revoke all on function celestual_submit(text, text, text, text, text) from public;
grant execute on function celestual_submit(text, text, text, text, text) to anon, authenticated;
revoke all on function celestual_suppress(text) from public;
grant execute on function celestual_suppress(text) to anon, authenticated;

revoke execute on function celestual_client_ip()                       from anon, authenticated, public;
revoke execute on function celestual_consume_ig_proof(text, text)      from anon, authenticated, public;
revoke execute on function celestual_complete_ig_verification(text, text, text) from anon, authenticated, public;
grant  execute on function celestual_complete_ig_verification(text, text, text) to service_role;
