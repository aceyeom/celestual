-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0011 — Instagram Login (OAuth 2.0) handle verification   ║
-- ║ the scale path: prove your @ by logging in, no DM, no ManyChat       ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- WHY THIS EXISTS. The DM path (0004/0009/0010) proves handle ownership by having
-- the visitor send a one-time code to @celestual.us, which Meta's Messaging webhook
-- relays back. It works, but it is fragile at scale for reasons that are Meta's, not
-- ours: (1) non-followers' DMs land in the message-requests folder and only deliver
-- webhooks reliably once the thread is replied-to/accepted; (2) while the Meta app is
-- in Development mode, webhooks fire ONLY for accounts holding an app role — so you
-- literally cannot verify strangers until App Review + Live; (3) it leans on a single
-- Instagram inbox (and often on ManyChat) as a shared chokepoint. See
-- docs/OAUTH-SCALING-STRATEGY.md for the full analysis.
--
-- Instagram API with Instagram Login (launched 2024) lets a person authorize your app
-- DIRECTLY with Instagram — no linked Facebook Page, no DM, no ManyChat. You get their
-- real Instagram user id + username straight from Meta. That IS proof of ownership, and
-- it scales to unlimited users (bounded only by a one-time App Review of the low-risk
-- `instagram_business_basic` scope, not by any inbox or webhook quirk).
--
-- THE ONLY NEW PIECE IS THIS RPC. Everything downstream is REUSED unchanged:
--   • The browser mints the same 256-bit `proof` and stores only its SHA-256 hash —
--     identical to the DM flow (see supabase/migrations/0004_ig_verification.sql).
--   • celestual_start_ig_oauth issues a high-entropy `state` and stashes it in the
--     SAME celestual_ig_verifications.token column as a pending row. A 4-digit DM code
--     and a 64-hex OAuth state never collide, and both are unique among pending rows.
--   • The celestual-ig-oauth edge function does the code→token→username exchange with
--     Meta, then calls the EXISTING service-role celestual_complete_ig_verification
--     (0010) with p_token = state. The decisive check is byte-identical: Meta's real
--     username must equal the claimed handle, or nothing verifies.
--   • The browser polls the EXISTING celestual_poll_ig_verification(state, proof_hash)
--     and, on 'verified', seals with the same proof via celestual_submit.
--
-- WHY THE STATE MUST BE HIGH-ENTROPY (and the DM code needn't be). For the DM path the
-- 4-digit code is a mere correlation id: the gate is the DM's authenticated sender, so
-- a guess buys nothing. For OAuth the `state` is what binds the redirect back to a
-- pending browser session; a guessable state would let an attacker complete THEIR
-- OAuth against a victim's pending row (session fixation). So OAuth uses 32 random
-- bytes (256 bits) — unguessable — and doubles as the OAuth CSRF `state` parameter.
--
-- Re-runnable (CREATE OR REPLACE / IF NOT EXISTS). Adds nothing destructive: it only
-- creates one function and grants it. The DM path is untouched.

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_oauth(handle, proof_hash) — begin an OAuth verification.
-- Mirrors celestual_start_ig_verification exactly (same validation, same per-IP /
-- per-handle rate limits keyed on the shared 'celestual:igstart' sentinel, same
-- opportunistic cleanup) EXCEPT it issues a 64-hex `state` instead of a 4-digit code
-- and gives the round-trip a slightly longer TTL (browser → Instagram consent →
-- redirect → token exchange takes longer than typing a code).
-- Returns:
--   { ok:true, state:'<64 hex>', expires_at:'…Z' }
--   { ok:false, error:'rate_limited' | 'busy' }
-- Starting one for a handle you don't own is harmless — it can only ever flip to
-- 'verified' if Instagram reports that exact username for the account that logs in.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_start_ig_oauth(p_handle text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  nh text := celestual_norm(p_handle);
  v_ip text;
  v_n  int;
  v_state text;
  v_try int := 0;
  c_pending_ttl      constant interval := interval '15 minutes';
  c_start_per_ip     constant int := 15;   -- per IP / hour (shared with the DM start)
  c_start_per_handle constant int := 8;    -- per handle / hour
begin
  if nh is null then raise exception 'invalid handle'; end if;
  -- proof_hash must look like a sha-256 hex digest (64 hex chars).
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

  -- Keep the table healthy: drop timed-out rows (gated so concurrent starts don't
  -- all contend). Indexed on expires_at.
  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '1 minute';
  end if;

  -- Issue a high-entropy state, unique among CURRENTLY pending rows (the same partial
  -- unique index on token that the DM path uses). Collisions are astronomically
  -- unlikely at 256 bits; the loop is belt-and-suspenders.
  loop
    v_try := v_try + 1;
    v_state := encode(gen_random_bytes(32), 'hex');
    begin
      insert into celestual_ig_verifications (handle, token, proof_hash, expires_at)
      values (nh, v_state, lower(p_proof_hash), now() + c_pending_ttl);
      exit;
    exception when unique_violation then
      if v_try >= 5 then
        return jsonb_build_object('ok', false, 'error', 'busy');
      end if;
    end;
  end loop;

  insert into celestual_attempts (ip, from_handle, to_handle) values (v_ip, 'celestual:igstart', nh);

  return jsonb_build_object(
    'ok', true,
    'state', v_state,
    'expires_at', to_char((now() + c_pending_ttl) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS. The start RPC is visitor-facing (like celestual_start_ig_verification).
-- Completion still runs ONLY through the service role via the existing
-- celestual_complete_ig_verification — the browser can never self-complete.
-- ──────────────────────────────────────────────────────────────────────
revoke all on function celestual_start_ig_oauth(text, text) from public;
grant execute on function celestual_start_ig_oauth(text, text) to anon, authenticated;
