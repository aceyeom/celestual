// relogin.js: durable, DM free recovery of a verified session.
//
// A DM verified session lives thirty days server side, but its key, the
// browser's `proof` secret, dies with localStorage: Instagram's in-app browser,
// iOS ITP, a new device. This module trades the recurring DM for a one time
// email link.
//
//   1. bindRecovery(handle, proof, email)  at the DM verification, bind the
//      handle to the email the person already gave. Only a live DM proof can
//      write it, so the trust chain holds.
//   2. beginSignIn(handle)                 ask the server which door this @ has.
//   3. requestSignInLink(handle)           email the link to the bound address.
//   4. redeemSignInLink(token)             opening the link mints a FRESH proof
//      in the browser, sends only its hash, and gets back the handle plus a full
//      thirty day session. The raw proof never leaves this tab.
//
// ── PHASE 8: WHICH BACKEND THIS TALKS TO, AND WHY IT CHANGED ────────────────
// It used to invoke a `celestual-relogin` edge function. That function was
// never deployed, and neither was the migration defining the RPC it called;
// Q4 deleted both in Phase 4a and recorded that rebuilding this file on the
// path that actually shipped was Phase 8's job. This is that rebuild.
//
// What shipped is three SECURITY DEFINER RPCs, transcribed into
// `0029_adopt_sender_and_email_login.sql` from the live definitions:
//
//   celestual_bind_login_email(handle, proof, email)  the bind
//   celestual_login_lookup(email)                     which handles an address holds
//   celestual_redeem_login(token_hash, proof_hash)    the redeem
//
// Two consequences worth stating plainly, because they are behaviour changes
// rather than a port:
//
//   THE ROUTER IS LOCAL NOW. `beginSignIn` used to ask a server which of three
//   doors an @ has and get back a masked inbox. No shipped RPC answers that
//   question, and adding one would mean an endpoint that confirms whether a
//   given @ is registered, to anybody who asks. It answers 'dm' instead, which
//   is the door that always works and the only one that proves anything.
//
//   SENDING THE LINK IS NOT WIRED. `celestual_login_lookup` reads an address to
//   handles, and `celestual_redeem_login` spends a token, but nothing in the
//   shipped set MINTS one and mails it: that half lived in the function Q4
//   deleted. So `requestSignInLink` reports honestly that it could not, rather
//   than resolving ok and leaving somebody waiting for a mail that is not
//   coming. Redeeming a link still works, which is what matters for the links
//   already in inboxes. `docs/launchsteps.md` section 9 carries what closing
//   the gap needs.
import { supabase, hasSupabase } from './supabase.js'
import { genProof, sha256Hex } from './igverify.js'

// Which door this @ has. Always the DM: see the note above.
export async function beginSignIn() {
  return { route: 'dm' }
}

// Bind handle to email under the fresh DM proof. Best effort: a failure means no
// email recovery is available yet, and the DM path still works. Never throws.
export async function bindRecovery({ handle, proof, email }) {
  if (!hasSupabase || !handle || !proof || !email) return { ok: false }
  try {
    const { data, error } = await supabase.rpc('celestual_bind_login_email', {
      p_handle: handle,
      p_proof: proof,
      p_email: String(email).trim().toLowerCase(),
    })
    if (error) return { ok: false }
    return data || { ok: false }
  } catch {
    return { ok: false }
  }
}

// Which handles an address holds. Anti enumeration is the RPC's own business;
// this returns whatever it returns, and an empty list reads the same as an
// address nobody has bound.
export async function handlesForEmail(email) {
  if (!hasSupabase || !email) return []
  try {
    const { data, error } = await supabase.rpc('celestual_login_lookup', {
      p_email: String(email).trim().toLowerCase(),
    })
    if (error || !Array.isArray(data)) return []
    return data.map((r) => r.handle).filter(Boolean)
  } catch {
    return []
  }
}

// Ask for a sign in link. Nothing shipped mints and mails one, so this says so
// rather than resolving ok and stranding somebody. `error: 'unwired'` is the
// slug the UI reads to offer the DM instead.
export async function requestSignInLink() {
  return { ok: false, error: 'unwired' }
}

// Redeem a link token: mint a fresh proof here, send only its hash, and get back
// the handle it re-verified. On success returns { ok:true, handle, proof }; the
// caller stores the session. Never throws.
//
// Returns { ok:true, handle, proof }, or { ok:false, error } where error is
// 'invalid' (the server answered and said no: spent, lapsed, or never minted)
// or 'network' (nothing answered). The screen says different things for those
// two, and it used to say "lapsed" for both.
//
// Honest note on the state of this door: 0029 grants celestual_redeem_login
// to service_role only, and nothing in the repository mints a row in
// celestual_login_links or mails one. Until docs/launchsteps.md section 9 is
// done, every token arriving here is refused, and the screen says so as
// "lapsed". That is a gap in the product, not in this file.
export async function redeemSignInLink(token) {
  if (!hasSupabase || !token) return { ok: false, error: 'invalid' }
  try {
    const proof = genProof()
    const proofHash = await sha256Hex(proof)
    // The token in the link is the SECRET; the row is keyed on its hash, so the
    // hash is what goes up. A server that could read the token could mint a
    // session for anybody whose link it had ever seen.
    const tokenHash = await sha256Hex(String(token).trim())
    const { data, error } = await supabase.rpc('celestual_redeem_login', {
      p_token_hash: tokenHash,
      p_proof_hash: proofHash,
    })
    if (error) return { ok: false, error: /fetch|network/i.test(String(error.message || '')) ? 'network' : 'invalid' }
    if (!data?.ok || !data.handle) return { ok: false, error: 'invalid' }
    return { ok: true, handle: data.handle, proof }
  } catch {
    return { ok: false, error: 'network' }
  }
}
