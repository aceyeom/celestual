// relogin.js: the sign in link, redeemed.
//
// A DM verified session lives thirty days server side, but its key, the
// browser's `proof` secret, dies with localStorage: Instagram's in-app browser,
// iOS ITP, a new device. A one time link in a mail was meant to trade the
// recurring DM for a tap, and this is the half of it that shipped: the redeem.
//
// ── the state of this door ──────────────────────────────────────────────────
// `celestual_redeem_login` was granted to service_role only until migration
// 0039, so every token that reached /signin was refused at the door; it is
// callable by the browser now, because the token is the credential and the
// function mints nothing without it. What mints a token today is the desk
// (`celestual_desk_signin`): a link the team hands somebody, or opens
// themselves, that signs a browser in as a handle with no DM. Nothing mails
// one yet; docs/launchsteps.md section 9 is what that needs. The rest of this
// module (the local router, the bind, the lookup, the request that always
// answered "unwired") went on 4 September with the retired design.
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
