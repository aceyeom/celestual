-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0014 — DM code: 6 digits, 30-minute TTL                  ║
-- ║ shrink the collision surface and the live-code pool                  ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- Two tuning changes to the pending DM code, both aimed at the ONE residual the
-- pure-correlation-id model (0012) leaves: a stray DM (a typo, or a guess) that
-- happens to match SOMEONE ELSE's currently-live code would flip that person's
-- session to the DMing account. It can never impersonate anyone (you only ever
-- verify the account you DM from), but at scale a 4-digit space (10,000 values)
-- makes an accidental collision thinkable. This migration:
--
--   1. WIDENS the code from 4 to 6 digits (1,000,000 values) — a ~100× drop in
--      the chance a stray DM lands on a live code. The code is still only a
--      correlation id; length was never the security boundary (0004 header), it
--      just governs how crowded the live-code space gets.
--
--   2. SHORTENS the pending TTL from 24 hours (0011) to 30 minutes. With the
--      durable email re-login shipped (0013), the DM is a one-time step, so the
--      long TTL that 0011 added to avoid repeat-DM throttling is no longer
--      load-bearing — and a shorter window keeps far fewer codes live at once,
--      shrinking the collision surface further. 30 min still comfortably covers a
--      first DM sitting briefly in Instagram's Message-Requests folder or a
--      ManyChat relay lag (the trap 0011 called out), which 10 minutes did not.
--
-- The paired edge functions (celestual-ig-webhook, celestual-manychat) widen
-- their code-parsing to \d{4,6} so in-flight 4-digit codes still resolve during
-- the brief cutover.
--
-- Re-runnable (CREATE OR REPLACE). Safe on top of 0001→0013.

-- ──────────────────────────────────────────────────────────────────────
-- celestual_start_ig_verification — identical to 0011 except the code is now
-- 6 digits and the pending TTL is 30 minutes.
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
  c_pending_ttl      constant interval := interval '30 minutes';  -- was 24 hours (0011)
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

  -- Prune timed-out rows so the code space stays healthy (the partial unique
  -- index still guarantees at most one pending row per code at a time).
  if random() < 0.2 then
    delete from celestual_ig_verifications where expires_at < now() - interval '1 minute';
  end if;

  -- Issue a 6-digit code unique among CURRENTLY pending rows (retry on collision).
  loop
    v_try := v_try + 1;
    v_token := lpad((floor(random() * 1000000))::int::text, 6, '0');
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
