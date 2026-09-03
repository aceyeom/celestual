// ── Main's data layer ───────────────────────────────────────────────────────
//
// Phase 6b. Where the wall had to have a backend built for it, Main already had
// one: `celestual_submit`, `celestual_my_pings`, `celestual_ping_status`,
// `celestual_renew` and `celestual_withdraw` are deployed and have been for
// months. So this module is thin on purpose. It shapes what those RPCs return
// into what these screens draw, and it does not reimplement any of it.
//
// The one thing it adds is the wall's numbers on the hero, which come off
// `wall_index` (migration 0032). The hero's gate into Berkeley carries two real
// counts, because a campus surface that will not say how many letters are on it
// is a campus surface nobody believes.
import { placePing, fetchMyPings, PING_DAYS } from '../api/celestual.js'
import { wallIndex } from '../wall/api.js'
import { whoami, ANON } from '../api/identity.js'
import { getSession } from '../api/auth.js'

export { PING_DAYS }

// ── who this browser is ─────────────────────────────────────────────────────
// One row across both surfaces. Somebody who verified their campus address on
// the wall arrives here already known, which is the whole of spec section 3's
// "Berkeley Wall and Main are one session".
//
// The server's row first. When there is none — no 0030 layer behind this
// deployment, or a device that verified before the row existed — the device's
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

// ── the wall, from here ─────────────────────────────────────────────────────
// Two numbers and the newest name. Read off the public index, so it needs no
// session and works for somebody who has never answered anything.
export async function wallSummary() {
  const out = await wallIndex()
  if (!out.ok || !out.tiles.length) return null
  const letters = out.tiles.reduce((n, t) => n + t.count, 0)
  const newest = out.tiles.reduce((a, b) => (b.at > a.at ? b : a))
  return {
    campus: 'berkeley',
    letters,
    handles: out.tiles.length,
    newest: newest.handle,
    newestAt: newest.at,
  }
}

// ── the standing pings ──────────────────────────────────────────────────────
// What this person has out, and which of them came back. The proof is the DM
// flow's, held in this browser, and it is what `celestual_my_pings` checks.
export async function myPings({ handle, proof }) {
  if (!handle || !proof) return { ok: false, pings: [], mutuals: [] }
  try {
    // api/celestual.js already normalises what celestual_my_pings returns, and
    // this follows ITS shape rather than the RPC's: one place in the product
    // reads that RPC and this is not it. The fields are
    // { handle, time, expires_at, mutual, card, theirCard }.
    const rows = await fetchMyPings({ handle, proof })
    const pings = (Array.isArray(rows) ? rows : []).map(shapePing)
    return { ok: true, pings, mutuals: pings.filter((p) => p.state === 'mutual') }
  } catch {
    return { ok: false, pings: [], mutuals: [] }
  }
}

function shapePing(p) {
  const to = p.handle || ''
  return {
    // A ping is one per pair, so the handle is its identity. There is no id on
    // the wire and inventing one would only be inventing a key for React.
    id: to,
    to,
    state: p.mutual ? 'mutual' : 'standing',
    at: Number(p.time) || 0,
    expires: Date.parse(p.expires_at || 0) || 0,
    line: p.card?.words || '',
    theirLine: p.theirCard?.words || '',
    // The moment it opened is not on the wire either. A mutual opens when the
    // second of the two is placed, and the only timestamp either side holds is
    // its own, so the screen says how long each has been standing rather than
    // pretending to know when the pair closed.
    openedAt: 0,
  }
}

// ── placing one ─────────────────────────────────────────────────────────────
// Straight through to `celestual_submit`, which is where the cap, the window,
// the suppression list and the billing chain all already live. Q3 keeps that
// chain intact, so nothing here inlines a cap of its own.
export async function place({ me: mine, them, email, proof, words }) {
  try {
    const out = await placePing({
      me: mine,
      them,
      email: email || null,
      proof,
      card: words ? { words } : null,
    })
    if (out?.ok === false) return { ok: false, error: out.error || 'failed' }
    return { ok: true, ...out }
  } catch (e) {
    return { ok: false, error: e?.code || 'network' }
  }
}

// ── time, in words ──────────────────────────────────────────────────────────
// The same voice the wall uses. A ping is a sixty day object and its clock
// should read like one.
export function daysLeft(expires) {
  if (!expires) return PING_DAYS
  return Math.max(0, Math.ceil((expires - Date.now()) / 86400000))
}

export function since(ts) {
  if (!ts) return ''
  const days = Math.max(0, Math.round((Date.now() - ts) / 86400000))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days`
  return `${Math.round(days / 7)} weeks`
}

// The same fact, as a phrase that stands on its own. `since` returns a
// DURATION for the callers that put it beside a label, and two of its answers
// are not durations: "today" and "yesterday" are already whole. A caller that
// appends "ago" to every one of them prints "today ago", which is what the
// hero's gate did until somebody looked at it.
export function sinceAgo(ts) {
  const s = since(ts)
  if (!s) return ''
  return s === 'today' || s === 'yesterday' ? s : `${s} ago`
}

// The distance between two moments. Not currently called anywhere and that is
// on purpose rather than an oversight: celestual_my_pings hands each person
// their own timestamp and not the other's, so nothing in the product can
// honestly say how far apart a pair was placed. It stays because the day the
// RPC returns both, the reveal's eyebrow has a true sentence to say and this is
// what says it.
export function apart(a, b) {
  if (!a || !b) return ''
  const days = Math.abs(Math.round((a - b) / 86400000))
  if (days === 0) return 'hours'
  if (days === 1) return 'a day'
  if (days < 14) return `${days} days`
  return `${Math.round(days / 7)} weeks`
}
