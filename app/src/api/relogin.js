// relogin.js: the sign in link, redeemed.
//
// A DM verified session lives thirty days server side, but its key, the
// browser's `proof` secret, dies with localStorage: Instagram's in-app browser,
// iOS ITP, a new device. A one time link in a mail was meant to trade the
// recurring DM for a tap, and this is the half of it that shipped: the redeem.
//
// ── the honest state of this door ───────────────────────────────────────────
// `celestual_redeem_login` (migration 0029) is granted to service_role only,
// and nothing in the repository mints a row in `celestual_login_links` or
// mails one. So every token arriving at /signin is refused, and the screen
// says so as "lapsed". docs/launchsteps.md section 9 is what closing the gap
// needs. The rest of this module (the local router, the bind, the lookup, the
// request that always answered "unwired") went on 4 September with the
// retired design that called it.
import { supabase, hasSupabase } from './supabase.js'
import { genProof, sha256Hex } from './igverify.js'

// Returns { ok:true, handle, proof }, or { ok:false, error } where error is
// 'invalid' (the server answered and said no: spent, lapsed, or never minted)
// or 'network' (nothing answered). The screen says different things for those
// two. The raw proof is minted here and never leaves this tab; only its hash
// goes up, and the token in the link is hashed the same way because the row is
// keyed on the hash.
export async function redeemSignInLink(token) {
  if (!hasSupabase || !token) return { ok: false, error: 'invalid' }
  try {
    const proof = genProof()
    const proofHash = await sha256Hex(proof)
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
