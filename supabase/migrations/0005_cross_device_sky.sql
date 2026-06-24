-- ╔══════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0005 — cross-device sky (sign back in → your stars)      ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- A returning person who proves they own their @ (the same Instagram-DM proof
-- used to seal) can now load THEIR sky on any device. The stars were never
-- device-bound: every @ you've sent already lives in celestual_entries. This
-- adds the one read-back the app was missing, gated by exactly the ownership
-- check sealing uses, so it leaks nothing that the owner didn't already record.
--
-- WHY THIS IS SAFE (see docs/SECURITY.md):
--   • Same gate as seal — celestual_my_sky returns rows ONLY when
--     celestual_consume_ig_proof(handle, proof) is true, i.e. there is a live
--     'verified' DM session for that exact handle whose hash matches the held
--     proof secret. No proof / not verified → an empty sky, never an error.
--   • Owner-only — it returns the @s a handle ITSELF entered (its own one-way
--     feelings). It never reveals who entered the caller, and a one-sided entry
--     is still invisible to its target. `mutual` only flips for a pair that the
--     instant-reveal / match email already surfaced, so no new reveal channel.
--   • Identity groups — reads across celestual_group(handle) so a linked
--     multi-account person sees one unified sky, matching how matching works.

-- ──────────────────────────────────────────────────────────────────────
-- celestual_my_sky(handle, proof) — the proven owner's own sky, for cross-device
-- sign-in. Returns the @s this handle (and its linked accounts) has entered,
-- each with when it was sealed and whether it's now mutual.
--   { ok:true,  stars:[ { handle, time, mutual }, ... ] }   -- proof good
--   { ok:false, stars:[] }                                  -- no/!valid proof
-- `time` is epoch milliseconds (matches the client's sealTimes).
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_my_sky(p_handle text, p_proof text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_stars jsonb;
begin
  if nh is null then
    raise exception 'invalid handle';
  end if;

  -- Ownership gate — identical to the seal-time check. Only the proven owner of
  -- this handle reads its sky back; everyone else (and the proofless) gets empty.
  if p_proof is null or not celestual_consume_ig_proof(nh, p_proof) then
    return jsonb_build_object('ok', false, 'stars', '[]'::jsonb);
  end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'handle', e.to_handle,
               'time',   (extract(epoch from e.created_at) * 1000)::bigint,
               'mutual', (e.matched_at is not null)
             )
             order by e.created_at
           ),
           '[]'::jsonb
         )
    into v_stars
    from celestual_entries e
   where e.from_handle in (select celestual_group(nh));

  return jsonb_build_object('ok', true, 'stars', v_stars);
end;
$$;

-- Only the RPC is exposed; like every other client entry point it's a single
-- SECURITY DEFINER function the public roles may execute (its body does the gate).
revoke all on function celestual_my_sky(text, text) from public;
grant execute on function celestual_my_sky(text, text) to anon, authenticated;
