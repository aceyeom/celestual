-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0011 — pending-code TTL 10 min → 24 h (git ⇄ live sync)  ║
-- ║ capture a hand-edit made live in Supabase but never committed        ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- WHY THIS EXISTS. The pending verification code's TTL was raised from
-- 10 minutes to 24 hours DIRECTLY on the live database (a hand-edit of
-- celestual_start_ig_verification), but the change never made it into a
-- migration — so git said "10 minutes" while Supabase ran "24 hours".
-- This migration restates the function with the 24-hour TTL so a fresh
-- `supabase db reset` / a new environment lands on the SAME behaviour the
-- production database already has. Nothing else about the function changed;
-- this file is byte-identical to the 0009 version except `c_pending_ttl`.
--
-- WHY 24 HOURS IS THE RIGHT FLOOR (not the whole fix). A 10-minute window
-- was hostile to the real delivery path: a first-time DM can sit in Meta's
-- Message-Requests folder, and the Instagram→ManyChat hop can lag minutes,
-- so a person who did everything right would watch the code die and be told
-- to "get a fresh one" — manufacturing exactly the repeat-DM behaviour that
-- trips Instagram's anti-spam throttle. A 24-hour code removes that trap.
--
-- WHAT 24 HOURS DOES *NOT* FIX (see docs/MANYCHAT-SETUP.md §8). The code TTL
-- was never the reason verification "works once, then fails". That is the
-- app forcing re-verification whenever the browser's localStorage session is
-- lost (Instagram's in-app browser sandbox, iOS ITP eviction, a new device),
-- because the verified session + its proof secret live ONLY in that browser
-- with no server-backed recovery. The durable-login work tracked in §8 is the
-- actual remedy; this migration only makes git honest about the live TTL.
--
-- Re-runnable (CREATE OR REPLACE). Safe to apply on top of 0001→0010.

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_verification — identical to 0009 except c_pending_ttl
-- is raised 10 minutes → 24 hours (matching the live database).
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
  c_pending_ttl      constant interval := interval '24 hours';   -- was 10 minutes (0004/0009)
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

  -- Prune timed-out rows so the 4-digit code space stays healthy. With a
  -- 24-hour TTL codes linger far longer than under the old 10-minute window,
  -- so this cleanup matters more — but the partial unique index on pending
  -- tokens still guarantees at most one pending row per code at a time.
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

revoke all on function celestual_start_ig_verification(text, text) from public;
grant execute on function celestual_start_ig_verification(text, text) to anon, authenticated;
