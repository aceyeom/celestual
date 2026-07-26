-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0012 — the DM code is a PURE correlation id (Fix C)      ║
-- ║ the Meta-authenticated DMing account defines identity, not a typed @ ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- WHAT CHANGES, AND WHY. Until now a verification pre-bound the handle the user
-- TYPED on the site: celestual_start_ig_verification stored that @, and
-- celestual_complete_ig_verification demanded the DM come from an account whose
-- Meta username equalled it — returning 'handle_mismatch' (the "that code was
-- started for a different @" reply) otherwise. That gate was sound but the
-- product shape around it manufactured dead ends for real people: a typo
-- (`sogeum_in` vs `soguem_in`), or DMing from a second logged-in account, both
-- read as "verification is broken." See docs/MANYCHAT-SETUP.md §8.3.
--
-- The fix (MANYCHAT-SETUP §8.4 "C"): the 4-digit code becomes a PURE correlation
-- id — it only names "this incoming DM" ↔ "this browser session" — and identity
-- is ALWAYS the Meta-authenticated account that actually sends the DM. Whoever
-- DMs a live code is verified as THAT account, and the site adopts that @. There
-- is nothing left to mismatch against, so the whole handle_mismatch class is
-- gone.
--
-- WHY THIS IS STRICTLY MORE SECURE. Identity was previously part typed claim,
-- part Meta fact; now it is entirely a Meta fact. You can only ever verify the
-- account you actually control (the one you DM from) — you could never verify
-- someone else's, before or after. The proof secret is still browser-held and
-- only its hash is stored; the decisive authority is still the Graph-API-fetched
-- username, checked in a SECURITY DEFINER RPC the browser can't call.
--
-- NO SCHEMA CHANGE. The `handle` column still holds the TYPED value while a row
-- is pending (a hint, used only for the per-handle start rate-limit); completion
-- OVERWRITES it with the authenticated username. poll matches on (token,
-- proof_hash), never on handle, so overwriting is safe — and poll now returns
-- the adopted handle to the proof-holder so the browser can adopt the real @.
--
-- Paired non-SQL changes (same PR): celestual-ig-webhook + celestual-manychat
-- drop the "different @" reply; igverify.js/screens.jsx/App.jsx read the adopted
-- handle back from poll and adopt it as identity.
--
-- Re-runnable (CREATE OR REPLACE). Safe on top of 0001→0011.

-- ──────────────────────────────────────────────────────────────────────
-- celestual_complete_ig_verification v5 — SERVICE ROLE ONLY.
-- The pending row's handle is a hint; the DM's Meta-authenticated username is the
-- identity. On a live pending code we ADOPT that username (overwriting the hint),
-- flip the row verified with the 30-day session TTL, and register membership.
-- There is no handle_mismatch branch any more — a code from any real account
-- simply verifies THAT account. The 'no_pending' feedback still distinguishes the
-- two honest states (already verified / code expired) so the relay never gaslights
-- a person who already succeeded.
-- Returns: { ok:true, handle } | { ok:false, error:'no_pending'[,already_verified|code_expired] }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_complete_ig_verification(p_token text, p_igsid text, p_username text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid;
  nu text := celestual_norm(p_username);
  c_session_ttl constant interval := interval '30 days';
begin
  if p_token is null or nu is null then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  select id into v_id
    from celestual_ig_verifications
   where token = p_token and status = 'pending' and expires_at > now()
   limit 1;
  if v_id is null then
    -- Nothing pending under this code. Distinguish the two honest states a REAL
    -- person lands in (re-sent an old code after success; sat on a code past its
    -- TTL) from a genuinely foreign code — keyed on the authenticated username.
    if exists (select 1 from celestual_ig_verifications
                where handle = nu and status = 'verified' and expires_at > now()) then
      return jsonb_build_object('ok', false, 'error', 'no_pending',
                                'already_verified', true, 'handle', nu);
    end if;
    if exists (select 1 from celestual_ig_verifications
                where token = p_token and expires_at <= now()) then
      return jsonb_build_object('ok', false, 'error', 'no_pending', 'code_expired', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'no_pending');
  end if;

  -- ADOPT the Meta-authenticated account as the identity. The typed hint is
  -- discarded; whoever DM'd this code is verified as themselves.
  update celestual_ig_verifications
     set handle = nu, status = 'verified', igsid = p_igsid, verified_at = now(),
         expires_at = now() + c_session_ttl
   where id = v_id;

  insert into celestual_members (handle, handle_hash)
  values (nu, celestual_hash_handle(nu))
  on conflict (handle) do nothing;

  return jsonb_build_object('ok', true, 'handle', nu);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_poll_ig_verification — now returns the ADOPTED handle when verified.
-- Still requires BOTH the code AND the matching proof hash, so only the browser
-- that started this session (and holds the secret) can read its handle back; a
-- random poller without the proof hash learns nothing, exactly as before. The
-- browser needs the handle so it can adopt the real @ the DM authenticated.
-- Returns: { status: 'pending'|'verified'|'expired'|'none', handle?: text }
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_poll_ig_verification(p_token text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_status  text;
  v_expires timestamptz;
  v_handle  text;
begin
  if p_token is null or p_proof_hash is null then
    return jsonb_build_object('status', 'none');
  end if;
  select status, expires_at, handle into v_status, v_expires, v_handle
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
  -- Only hand the handle back once it's actually verified (the proof-holder
  -- adopting their real @); a pending row's `handle` is only the typed hint.
  return jsonb_build_object(
    'status', v_status,
    'handle', case when v_status = 'verified' then v_handle else null end
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — unchanged from 0010, restated so a fresh apply lands correct.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_poll_ig_verification(text, text) from public;
grant execute on function celestual_poll_ig_verification(text, text) to anon, authenticated;
revoke execute on function celestual_complete_ig_verification(text, text, text) from anon, authenticated, public;
grant  execute on function celestual_complete_ig_verification(text, text, text) to service_role;
