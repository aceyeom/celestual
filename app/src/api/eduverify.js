// eduverify.js: school (.edu) email verification.
//
// A school address is proved, not declared. Since 25 September it is proved by
// a MAGIC LINK (docs/ONE-WALL.md): a post to an @ on the wall asks for a
// Berkeley address at the moment it is posted, the link is mailed to it, and
// tapping the link confirms it. `sendLink`, `confirmLink` and `linkStatus`
// below are that flow; the device is verified once and its session kept.
// Since 26 September the same link signs anybody in by email too (purpose
// 'login', api/login.js `sendEmailLink`), with any address, in place of a
// code Supabase mailed that nobody could type back.
//
// The code flow under them is the one it replaces, kept for a tab still on an
// old build and for a function still on the old deploy:
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

// ── the link ────────────────────────────────────────────────────────────────
// The magic link (docs/ONE-WALL.md, `celestual-edu-verify`'s link actions).
// None of these throw: every answer is `{ ok, ... }`, and a function that
// does not know the link actions yet (the deploy before them answers an
// unknown action with a 400 and `bad_input`) answers `unsupported`, so the
// screen can fall back to the code.
//
//   sendLink     mail a link to `email` for this session. `purpose` is 'edu'
//                (a post), 'alerts' (the alert address) or 'login' (the
//                door's "continue with email", migration 0065: any address,
//                and the device is signed in as whoever holds it). `campus`
//                asks the function to refuse an address that is not at that
//                school ('domain'). Answers { ok, request, match, domain,
//                campus, school }: `request` is what `linkStatus` asks after,
//                and `match` the two digits the asking screen shows, and
//                nothing else does: the mail never prints them (migration
//                0065 section 3).
//   confirmLink  the link's token, spent by whichever device tapped it. On
//                the device that asked it confirms at once. On any other it
//                answers 'match' and spends nothing, until it is called again
//                with `match`, the number typed off the asking screen: the
//                right one confirms, a wrong one burns the link ('mismatch').
//                Answers { ok, purpose, request, campus, school, sameDevice }
//                or { ok: false, error, purpose }, with error one of
//                'invalid', 'expired', 'used', 'match', 'mismatch' or
//                'offline', and `purpose` whenever the link was found.
//   linkStatus   whether the request this session made has been confirmed,
//                wherever the link was tapped. { ok, verified, expired,
//                purpose, campus, school }.
async function invokeLink(body) {
  if (!hasSupabase) return { ok: false, error: 'offline' }
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION, { body })
    if (error) {
      // a function that answered, and said why it would not
      let said = null
      try { said = error.context && typeof error.context.json === 'function' ? await error.context.json() : null } catch { said = null }
      const status = error.context && error.context.status
      if (status === 400 && (!said || said.error === 'bad_input')) return { ok: false, error: 'unsupported' }
      if (said && said.error) return { ok: false, error: String(said.error) }
      return { ok: false, error: 'send' }
    }
    return data || { ok: false, error: 'send' }
  } catch {
    return { ok: false, error: 'send' }
  }
}

// The three purposes a link has, and 'edu' for anything else, as the
// function reads them.
const purposeOf = (p) => (p === 'alerts' || p === 'login' ? p : 'edu')

export async function sendLink({ email, session, purpose = 'edu', campus = null }) {
  const out = await invokeLink({
    action: 'link',
    email: String(email || '').trim().toLowerCase(),
    session: String(session || ''),
    purpose: purposeOf(purpose),
    ...(campus ? { campus: String(campus) } : {}),
  })
  if (!out.ok) return { ok: false, error: out.error || 'send' }
  return {
    ok: true,
    request: String(out.request || ''),
    match: out.match == null ? null : Number(out.match),
    domain: String(out.domain || ''),
    campus: out.campus ? String(out.campus) : null,
    school: out.school ? String(out.school) : null,
  }
}

// The answers the page words, each its own way. 'taken' was read as 'invalid'
// here, and the page's own line for it ("already confirmed on another
// account") was never drawn.
const CONFIRM_FAULTS = new Set(['expired', 'used', 'offline', 'taken', 'match', 'mismatch'])

export async function confirmLink({ token, session, match = null }) {
  const typed = match == null ? '' : String(match).replace(/\D/g, '')
  const out = await invokeLink({
    action: 'confirm', token: String(token || ''), session: String(session || ''),
    ...(typed ? { match: typed } : {}),
  })
  if (!out.ok) {
    const e = CONFIRM_FAULTS.has(out.error) ? out.error : 'invalid'
    return { ok: false, error: e, purpose: out.purpose ? purposeOf(out.purpose) : null }
  }
  return {
    ok: true,
    purpose: purposeOf(out.purpose),
    request: String(out.request || ''),
    campus: out.campus ? String(out.campus) : null,
    school: out.school ? String(out.school) : null,
    sameDevice: !!out.same_device,
  }
}

export async function linkStatus({ request, session }) {
  const out = await invokeLink({ action: 'status', request: String(request || ''), session: String(session || '') })
  if (!out.ok) return { ok: false, error: out.error || 'send', verified: false }
  return {
    ok: true,
    verified: !!out.verified,
    // thirty minutes gone with nobody tapping it (0064), so the screen that
    // is waiting can say so rather than wait for ever
    expired: !out.verified && !!out.expired,
    purpose: purposeOf(out.purpose),
    campus: out.campus ? String(out.campus) : null,
    school: out.school ? String(out.school) : null,
  }
}
