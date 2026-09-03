// eduverify.js: campus (.edu) email verification.
//
// A campus address is proved, not declared: you enter a one-time code mailed to
// an address at that campus's domain. Spec section 3 makes a verified .edu the
// requirement for the Berkeley Wall, and this is how it is met.
//
// The flow:
//   1. send(email, slug)  → the celestual-edu-verify edge function checks the
//      address is at the school's domain, mints a 4-digit code, stores only its
//      SHA-256 hash, emails the code (the code rides the subject line too, so
//      the notification alone is enough), and returns a correlation `token`.
//   2. verify(token, code, session) → the same function checks the code against
//      the stored hash (never returning it) and, on a match, reports the email
//      and slug back AND binds the address to this browser's identity row.
//
// The code is a SECRET: it is emailed, never returned to the browser, and only
// its hash is stored.
//
// ── the client side pre-check came off in Phase 8 ────────────────────────────
// `localEmailCheck` used to fail an address fast when its domain did not belong
// to the campus. Its only caller was the community join sheet, which went with
// the communities feature (Q15), and the campus list it read lived in
// `communities.js`, which went with it.
//
// Nothing is weaker for it. The list the check consulted was a copy of the one
// the edge function holds, and the edge function's copy is the gate: a second
// copy in the browser could only ever agree with it or be wrong. The wall does
// its own shaping check in `wall/auth.js` against its own campus domain, which
// is the surface that has one.
import { supabase, hasSupabase } from './supabase.js'

const FUNCTION = 'celestual-edu-verify'

// On only when the flag is set AND a real backend exists. Otherwise the sheet uses
// a local accept (like the IG stub) so dev/preview stays fully testable.
export const eduVerifyEnabled = () =>
  import.meta.env.VITE_EDU_VERIFY_ENABLED === '1' && hasSupabase

// Send a code to `email` for `slug`. Returns { token, expiresAt }. Throws an Error
// whose .code is one of 'domain' | 'email' | 'rate' | 'send' so the UI can
// localize it.
//
// The sandbox's @gmail.com carve-out is gone with /demo (Q16). The edge function
// still accepts a `demo` flag and still gates it on its own SANDBOX_GMAIL
// secret, and nothing in this repository sets either any more.
export async function sendEduCode({ email, slug }) {
  const { data, error } = await supabase.functions.invoke(FUNCTION, {
    body: { action: 'send', email: String(email).trim().toLowerCase(), slug },
  })
  if (error) {
    const e = new Error('send_failed')
    e.code = 'send'
    throw e
  }
  if (!data?.ok) {
    const e = new Error(data?.error || 'send_failed')
    e.code = data?.error || 'send'
    throw e
  }
  return { token: data.token, expiresAt: data.expires_at }
}

// Verify a code. Never throws: a transient failure reads as { ok:false, error }.
// On success returns { ok:true, email, slug, signed_in, user, identity_error? }.
//
// `session` is this browser's identity token. The edge function passes it to
// celestual_user_bind_edu (migration 0030), which is what turns a verified
// address into an identity that survives the tab and carries across to Main.
// Without one the address still verifies and `signed_in` comes back false.
export async function verifyEduCode({ token, code, session }) {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, {
      body: {
        action: 'verify',
        token,
        code: String(code).replace(/\D/g, ''),
        ...(session ? { session } : {}),
      },
    })
    if (error) return { ok: false, error: 'send' }
    return data || { ok: false, error: 'code' }
  } catch {
    return { ok: false, error: 'send' }
  }
}
