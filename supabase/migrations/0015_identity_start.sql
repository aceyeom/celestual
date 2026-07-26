-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ CELESTUAL · 0015 — the backend decides how you get in                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- THE PROBLEM THIS REMOVES. The sign-in screen used to make the USER resolve an
-- ambiguity the SERVER already knew the answer to. It offered "email me a link"
-- and "verify by dm instead" side by side, then, because the client genuinely
-- could not tell which one would work, printed a conditional at the person:
--
--     "if @ace03d has an email on file, a one-time sign-in link is on its way."
--
-- Nobody should read a sentence about their own account written in the
-- subjunctive. One @ goes in; the server already knows whether that handle
-- exists and whether it has a recovery address bound, so the server picks the
-- route and the screen just reports what happened.
--
-- celestual_handle_route is that answer, and it is deliberately SIDE-EFFECT
-- FREE: it sends nothing and mints nothing, so the client can ask "which door?"
-- before committing to one. Actually mailing the link stays 0013's
-- celestual_relogin_store, called through the existing `request` action.
--
-- WHAT IT RETURNS
--   { ok:true, known:false }                            → sign up (collect an email)
--   { ok:true, known:true, has_email:false }            → known @, prove it by DM
--   { ok:true, known:true, has_email:true, mask:'j•••@gmail.com' }
--                                                       → known @, the link can be mailed
--
-- The address is returned ONLY masked to its first letter and domain — enough
-- for a person to recognise their own inbox, useless to anyone else. The
-- plaintext never leaves Postgres on this path.
--
-- DISCLOSURE NOTE. Answering `known` tells the caller whether a handle is
-- registered. That is not new information: celestual_submit already returns
-- `reachable` for any handle you place a ping on, so "is this @ on celestual"
-- has always been observable by design — it is Loop A's own readout. Only the
-- service role can call this, so it is reachable solely through the edge
-- function, which is where rate limiting lives.
--
-- Re-runnable (CREATE OR REPLACE). Safe on top of 0001→0014.

-- ──────────────────────────────────────────────────────────────────────
-- celestual_handle_route(handle) — SERVICE ROLE ONLY. Reports which way in this
-- handle takes. Reads only; writes nothing.
-- ──────────────────────────────────────────────────────────────────────
create or replace function celestual_handle_route(p_handle text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nh text := celestual_norm(p_handle);
  v_email text;
  v_known boolean;
begin
  if nh is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- "Known" means celestual has seen this handle prove itself: a member row
  -- (written at every successful verification and every relogin redeem) or a
  -- ping it has placed. A handle someone merely typed at us is not known.
  select exists (select 1 from celestual_members where handle = nh)
      or exists (select 1 from celestual_entries where from_handle = nh)
    into v_known;

  if not v_known then
    return jsonb_build_object('ok', true, 'known', false);
  end if;

  select email into v_email from celestual_recovery where handle = nh;
  if v_email is null then
    return jsonb_build_object('ok', true, 'known', true, 'has_email', false);
  end if;

  return jsonb_build_object(
    'ok', true, 'known', true, 'has_email', true,
    -- first letter + the domain, nothing else
    'mask', left(v_email, 1) || '•••' || substring(v_email from position('@' in v_email))
  );
end;
$$;

revoke all on function celestual_handle_route(text) from anon, authenticated, public;
grant execute on function celestual_handle_route(text) to service_role;
