// ── Main's data layer ───────────────────────────────────────────────────────
//
// Phase 6b. Where the wall had to have a backend built for it, Main already had
// one: `celestual_submit`, `celestual_my_pings`, `celestual_ping_status`,
// `celestual_renew` and `celestual_withdraw` are deployed and have been for
// months. So this module is thin on purpose, and thinner since the ping moved
// onto the wall: it says who this browser is, and hands the pings on.
//
import { PING_DAYS } from '../api/celestual.js'
import { whoami, ANON } from '../api/identity.js'
import { getSession } from '../api/auth.js'

export { PING_DAYS }

// ── who this browser is ─────────────────────────────────────────────────────
// One row across both surfaces. Somebody who verified their campus address on
// the wall arrives here already known, which is the whole of spec section 3's
// "Berkeley Wall and Main are one session".
//
// The server's row first. When there is none (no 0030 layer behind this
// deployment, or a device that verified before the row existed) the device's
// own DM session stands in: the same handle, the same proof, and every read
// that matters (celestual_my_pings, celestual_submit) still checks that proof
// on the server, so a forged local session buys an empty sky and nothing else.
export async function me() {
  let u
  try {
    u = await whoami()
  } catch {
    u = ANON
  }
  if (u.signedIn) return u
  const s = getSession()
  if (!s?.verified || !s.handle || !s.proof) return ANON
  return {
    ...ANON,
    signedIn: true,
    handle: s.handle,
    handleVerified: true,
    email: s.email || null,
  }
}

// ── the pings ───────────────────────────────────────────────────────────────
// Placing a ping, reading the list, keeping one and letting one go all moved
// to the wall with the sheets that do them (wall/pings.js, screens/Ping.jsx
// and screens/You.jsx). They are handed on from here unchanged, so a screen
// that still reads them off Main reads the same functions and the same held
// answer, and there is one copy of each.
export {
  myPings, heldPings, forgetPings, place, renew, release,
  daysLeft, daysLeftWords, since, sinceAgo, apart,
} from '../wall/pings.js'
