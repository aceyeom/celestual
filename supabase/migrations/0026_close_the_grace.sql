-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  0026 · CLOSING THE GRACE                                            ║
-- ║  The twenty-second door is shut. Only a real DM verifies now.        ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- WHAT THIS UNDOES, AND WHY IT WAS EVER THERE
--
-- 0017 opened a temporary door and said so in its own header: the Instagram DM
-- relay was dropping verifications in production, so a browser that had shown
-- its code and waited twenty seconds could call celestual_ig_verify_timeout and
-- be let in AS THE TYPED @ — no webhook, no Meta-authenticated sender, no proof
-- that the person at the keyboard owned the handle they had typed. Rows admitted
-- that way were stamped verified_via = 'timeout' precisely so the desk could see
-- which identities had been ASSUMED rather than proven, and 0017's own comment
-- ends: "remove this function (and the client's timer) once the relay is fixed."
--
-- The relay is fixed. This is that removal.
--
-- It matters more here than it would in most products. Celestual's entire claim
-- is that a ping resolves only between two people who each chose the other, and
-- every part of that rests on one fact: the @ you were admitted as is yours. A
-- door that opens for whoever types a handle and waits twenty seconds is a door
-- somebody walks through wearing somebody else's name — and on the other side of
-- it are another person's sealed words, and now their photograph too (0025).
-- Nothing about a working relay made that safer; it only made it unnecessary.
--
-- WHAT CHANGES
--
--   celestual_ig_verify_timeout   REVOKED from anon and authenticated, and its
--                                 body replaced by a refusal. It is not dropped
--                                 — see below.
--
-- WHY BOTH, AND WHY NOT A DROP
--
-- The REVOKE is the closure. Nothing a browser can reach may call this again,
-- whatever it was compiled against — a bundle still open in somebody's tab gets
-- a refusal from PostgREST, reads it the way it reads any transient failure, and
-- simply goes on waiting for the DM. Which is the correct outcome: the person is
-- not stranded, they are merely held to the same bar as everyone else.
--
-- The body is replaced as well because a revoke alone leaves a live admission
-- path sitting behind a grant that a later migration, a psql session or a
-- service-role call could hand back by accident. A function that cannot admit
-- anyone cannot be re-opened by mistake. Two locks, because the thing behind
-- this door is somebody's sealed card.
--
-- And it is not DROPPED because `verified_via = 'timeout'` still means
-- something. Rows carrying it are real accounts, admitted by a door that was
-- open at the time, and the admin desk still names them ("Assumed at 20s") so
-- they can be checked by hand. Deleting the function that explains where those
-- rows came from would leave the desk describing a mechanism the schema no
-- longer mentions.
--
-- Nothing is migrated and no row is touched: an account that verified through
-- the grace stays verified. This closes the door; it does not evict anyone who
-- already came through it.
--
-- Re-runnable (CREATE OR REPLACE + REVOKE only).

create or replace function celestual_ig_verify_timeout(p_token text, p_proof_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  -- The twenty-second grace is closed (0026). It is not 'early' and it is not
  -- 'expired': there is no longer a wait that ends in admission, so the honest
  -- answer is that this door is gone. In practice nothing reaches this line —
  -- the grant is revoked below and the current client has no such path — and
  -- that is the point of writing it anyway.
  perform p_token, p_proof_hash;
  return jsonb_build_object('ok', false, 'error', 'closed');
end;
$$;

comment on function celestual_ig_verify_timeout(text, text) is
  'CLOSED (migration 0026). Was 0017''s temporary twenty-second grace, which '
  'admitted the TYPED @ without a DM while the relay was dropping them. Revoked '
  'from every client role AND emptied to a refusal, so it cannot be re-opened by '
  'a stray grant; kept rather than dropped so verified_via = ''timeout'' rows '
  'still have something in the schema that explains where they came from.';

revoke all on function celestual_ig_verify_timeout(text, text) from public, anon, authenticated;
