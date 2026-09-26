#!/usr/bin/env node
// preview.mjs: the visual loop in docs/rebuild-spec.md 7.3, with data in it.
//
// scripts/shots.mjs shoots a route as the dev server serves it. Without a
// Supabase project behind it that means every surface in the product draws its
// empty state, and an empty state is not what 7.3 asks anybody to look at.
//
// So this drives the same routes with the network intercepted: every Supabase
// RPC, every edge function and the resolver are fulfilled from the fixtures
// below, which carry the SHAPES the schema actually returns. Migrations 0030,
// 0031 and 0032 are where those shapes are defined and this file follows them.
//
//   node scripts/preview.mjs               every route, both viewports
//   node scripts/preview.mjs berkeley      one route by its label
//
// Nothing here ships. The fixtures are a fixture and app/.env.local is
// gitignored; what ships is the screenshots, in design/shots, and the critique
// they are for.
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.env.PREVIEW_OUT || join(root, 'design/shots')
// the dev server to shoot, as the other scripts read it
const BASE = process.env.DEV_URL || 'http://localhost:5173'
mkdirSync(out, { recursive: true })

const VIEWPORTS = process.env.PREVIEW_VIEWPORTS
  // `320x568,1280x720`: other sizes, named by themselves, for the layouts
  // that only break at an edge of the range
  ? process.env.PREVIEW_VIEWPORTS.split(',').map((v) => {
    const [width, height] = v.split('x').map(Number)
    return { name: v, width, height, scale: Number(process.env.PREVIEW_SCALE) || (width < 700 ? 2 : 1) }
  })
  : [
    { name: 'phone', width: 390, height: 844, scale: 2 },
    { name: 'desk', width: 1440, height: 900, scale: 1 },
  ]

const DAY = 86400000
const now = Date.now()

// ── the fixtures ────────────────────────────────────────────────────────────
// Names and lines invented; every field name is the one the schema carries.
const HANDLES = [
  ['pilar.echevarria', 'Pilar Echevarría', true],
  ['sofiaaa.reyes', 'Sofia Reyes', false],
  ['jules.k', 'Jules Kwarteng', true],
  ['m.okonkwo', 'Marcus Okonkwo', false],
  ['ren.tanaka', 'Ren Tanaka', false],
  ['ace03d', 'Ace Yeom', false],
  ['dani.arroyo', 'Dani Arroyo', true],
  ['thom.iversen', 'Thom Iversen', false],
  ['aya.nakamura', 'Aya Nakamura', false],
  ['k.villarreal', 'Kai Villarreal', false],
  ['nour.haddad', 'Nour Haddad', false],
  ['elias.brandt', 'Elias Brandt', false],
]

const COUNTS = [3, 1, 2, 1, 4, 1, 1, 2, 1, 1, 1, 1]

// 0048: the index carries the resolver's answer for each name, so the faces
// draw off the one read and the intro can hold for the pictures.
const INDEX = HANDLES.map(([h, name, verified], i) => ({
  target_handle: h,
  campus: 'berkeley',
  letters: COUNTS[i],
  last_at: new Date(now - (i * 9 + 2) * 3600000).toISOString(),
  known: true,
  display_name: name,
  is_verified: verified,
  avatar_path: null,
  kind: 'handle',
  name: null,
  look: null,
}))

// ── the colours (0055, 0058), and the names (0053) ──
// Every letter is a screen now and all it chooses is the colour it is lit
// in (app/src/wall/looks.js). The fixture has every one of the thirteen
// somewhere on the field: the lit screens, the negative, each print in its
// own light and the xerox, so a shot of the wall shows each treatment and a
// turn of the deck walks from one to another. A letter with no colour draws
// the one its id picks.
const LOOKS = {
  'pilar.echevarria': { tint: 'night' },
  'jules.k': { tint: 'lilac' },
  'ren.tanaka': { tint: 'amber' },
  'm.okonkwo': { tint: 'xerox' },
  'aya.nakamura': { tint: 'ice' },
  'dani.arroyo': { tint: 'negative' },
  'thom.iversen': { tint: 'acid' },
  'k.villarreal': { tint: 'violet-yellow' },
  'nour.haddad': { tint: 'green' },
  'elias.brandt': { tint: 'teal' },
  'sofiaaa.reyes': { tint: 'rose' },
  'ace03d': { tint: 'white' },
}
for (const r of INDEX) if (LOOKS[r.target_handle]) r.look = LOOKS[r.target_handle]
const NAMES = [
  ['~sofia', 'Sofia', 2, { tint: 'green' }],
  ['~j', 'J', 1, { tint: 'amber' }],
  ['~51b', '51B', 1, { tint: 'lilac' }],
]
NAMES.forEach(([key, name, letters, look], i) => INDEX.splice(1 + i * 3, 0, {
  target_handle: key, campus: 'berkeley', letters,
  last_at: new Date(now - (i * 7 + 3) * 3600000).toISOString(),
  known: false, display_name: '', is_verified: false, avatar_path: null,
  kind: 'name', name, look,
}))
const COUNT_OF = new Map(INDEX.map((r) => [r.target_handle, r.letters]))

// The second line runs long on purpose: a deck of letters of one height
// never shows what the sheet does when the next card is taller, which is
// the one thing about a turn that used to jump.
const LINES = [
  'you gave me your umbrella outside wheeler and walked home in it. i still have it.',
  'i should have said something in march and i have thought about it every week since. you were reading on the steps of doe with your shoes off and i walked past three times deciding, and then the bell went and you were gone, and i have been late to everything since.',
  'you laughed at the thing nobody else laughed at and i have never forgotten it.',
  'i kept nearly saying something after class and then not saying it.',
]

function lettersFor(handle, open) {
  const n = COUNT_OF.get(handle) || 1
  const row = INDEX.find((r) => r.target_handle === handle)
  // an id of its own for every letter, so every screen in the shots is its
  // own phone (looks.js `quirks` reads the id); the first letter under
  // pilar.echevarria keeps the id the fixture's other reads point at
  let hx = 0x811c9dc5
  for (const ch of handle) hx = Math.imul(hx ^ ch.charCodeAt(0), 0x01000193) >>> 0
  const tag = hx.toString(16).padStart(8, '0')
  return Array.from({ length: n }, (_, i) => {
    const body = LINES[i % LINES.length]
    return {
      id: i === 0 && handle === 'pilar.echevarria'
        ? '11110111-2222-4333-8444-555566660000'
        : `${tag}-2222-4333-8444-5555${String(i).padStart(8, '0')}`,
      handle,
      kind: row ? row.kind : 'handle',
      name: row ? row.name : null,
      // the newest letter carries the key's colour; an older one under the
      // same name draws the one its own id picks, which is what a deck of
      // two colours looks like when it is turned
      look: row && i === 0 ? row.look : null,
      body: open ? body : null,
      words: body.split(/\s+/).length,
      chars: body.length,
      has_seal: i === 0,
      campus: 'berkeley',
      at: new Date(now - (i * 3 + 1) * DAY).toISOString(),
      expires: new Date(now + (27 - i) * DAY).toISOString(),
      // 0042: how many hearted it, and whether this browser did. Two
      // figures on the first, as the hearts a letter began with (0059) left
      // most letters that were up
      hearts: i === 0 ? 12 : i === 1 ? 3 : 0,
      hearted: false,
    }
  })
}

// The resolver's answer for a name, as the reads carry it since 0042: the
// letters, one letter and the sky's rows each ride with these four fields.
function faceOf(handle) {
  const row = HANDLES.find(([h]) => h === handle)
  return {
    known: !!row,
    display_name: row ? row[1] : '',
    is_verified: row ? !!row[2] : false,
    avatar_path: row && FACES[handle] ? `ig/${handle}.jpg` : null,
  }
}

// Whether the fixture browser is through the campus gate and whether it holds a
// verified handle. Both flip per route, below.
let OPEN = true
let VERIFIED = true
// Whether the resolver answers at once or holds its answer for a while: the
// card's looking state is drawn for a wait that can run ten seconds on a cold
// handle, and it only exists on the screen for as long as the wait does.
let SLOW = false
// What the relay has said about the last DM under this handle while a code is
// out (0041): '' while nothing has arrived, 'wrong_code' or 'expired_code'.
let NOTE = ''
// Whether the week's three letters are spent (0044): the composer's act goes
// dark and one line says why. Off, the fixture browser has one left.
let SPENT = false
// Whether a letter this browser put up has since come down (0050 wall_mine):
// the notice at the foot of the wall, in the tab's place.
let DOWN = false
// Whether this browser has put up more letters than the account sheet shows
// at once, so the list's fade and its "see more" are drawn.
let MANY = false
// Whether the fixture browser is nobody at all: signed in to nothing, so the
// gates draw their doors rather than the account.
let ANON = false
// Whether the handle typed at the ping's door is on the desk's pass list
// (0043): proved on the spot, with no code drawn, which is the one way to
// walk the whole of a ping to "it's out." without an Instagram behind it.
let PASS = false
// Whether every slot this person holds is already standing, so the placing
// is refused and the sheet says so (0023 `no_slots`).
let FULL = false
// Whether the fixture browser signed in with google, and nothing else: a
// reader on any wall since 0057, and not a writer on the campus wall. It is
// the person whose heart never counted, because this browser drew them as
// outside the read gate; the store is seeded with that stale answer, so the
// shot shows the wall asking the server and drawing what it says.
let GOOGLE = false
// What the daily check on apify last said (0060): 'ok', 'failing', 'stale'
// or 'never'. The desk draws its line at the top of every screen from it.
let CANARY = 'ok'
// The thread under an open letter (0068, app/src/wall/Replies.jsx): which of
// its states the fixture draws. 'empty' by default, since most letters have
// nothing under them; a replies route names the one it is for.
let THREAD = 'empty'

// ── the replies (0068) ──────────────────────────────────────────────────────
// Every field is wall_reply_thread's. `who` is sixteen hex, as the server's
// salted hash is, and one writer is one `who` all down a thread: the first
// and the fourth reply here are the same person.
const REPLY_AT = (mins) => new Date(now - mins * 60000).toISOString()
const REPLIES = [
  { id: 'r0000001-2222-4333-8444-555566660001', who: 'd41d8cd98f00b204', recipient: false, status: 'live',
    body: 'this is the sweetest thing on here. i hope they know who it is.', at: REPLY_AT(300), likes: 14 },
  { id: 'r0000002-2222-4333-8444-555566660002', who: '3c59dc048e885024', recipient: false, status: 'live',
    body: 'the umbrella detail got me', at: REPLY_AT(250), likes: 6 },
  { id: 'r0000003-2222-4333-8444-555566660003', who: '9bf31c7ff062936a', recipient: true, status: 'live',
    body: 'i still think about that walk. keep the umbrella, it suits you better. and say hi next time.', at: REPLY_AT(180), likes: 31 },
  { id: 'r0000004-2222-4333-8444-555566660004', who: 'd41d8cd98f00b204', recipient: false, status: 'live',
    body: 'THEY ANSWERED. i am not okay', at: REPLY_AT(150), likes: 9 },
  { id: 'r0000005-2222-4333-8444-555566660005', who: 'c74d97b01eae257e', recipient: false, status: 'live',
    body: 'say it to their face next time, you have got this', at: REPLY_AT(40), likes: 2, mine: true },
  { id: 'r0000006-2222-4333-8444-555566660006', who: 'e4da3b7fbbce2345', recipient: false, status: 'live',
    body: 'wheeler at night is the most romantic place on campus and nobody will convince me otherwise', at: REPLY_AT(12), likes: 0 },
]
function thread() {
  const me = { signed: true, recipient: false, edu: true, terms: true, who: 'c74d97b01eae257e', can: true, why: null }
  const rows = REPLIES.map((r) => ({ liked: r.id.endsWith('1'), reported: false, mine: false, ...r }))
  const base = { ok: true, letter: '11110111-2222-4333-8444-555566660000', state: 'open', recipient_replied: true }
  const full = { ...base, count: rows.length, replies: rows, me }
  switch (THREAD) {
    case 'full': return full
    case 'terms': return { ...full, me: { ...me, terms: false } }
    case 'held': return { ...full, count: rows.length, replies: [...rows,
      { id: 'r0000007-2222-4333-8444-555566660007', who: 'c74d97b01eae257e', recipient: false, status: 'held', mine: true,
        body: 'honestly whoever wrote this should just ask them to the thing on friday', at: REPLY_AT(1), likes: 0 },
      { id: 'r0000008-2222-4333-8444-555566660008', who: 'c74d97b01eae257e', recipient: false, status: 'hidden', mine: true,
        body: 'called it weeks ago', at: REPLY_AT(90), likes: 0 }].sort((a, b) => a.at.localeCompare(b.at)) }
    case 'reported': return { ...full, replies: rows.map((r, i) => (i === 1 ? { ...r, reported: true } : r)) }
    case 'recipient': return { ...full,
      replies: rows.map((r) => ({ ...r, mine: r.recipient })),
      me: { ...me, recipient: true, edu: false, who: '9bf31c7ff062936a' } }
    case 'recipient-new': return { ...base, recipient_replied: false, count: 2, replies: rows.slice(0, 2).map((r) => ({ ...r, mine: false })),
      me: { ...me, recipient: true, edu: false, terms: false, who: '9bf31c7ff062936a' } }
    case 'locked': return { ...full, state: 'locked', replies: rows.map((r) => ({ ...r, mine: false })),
      me: { ...me, can: false, why: 'locked' } }
    case 'locked-owner': return { ...full, state: 'locked', replies: rows.map((r) => ({ ...r, mine: r.recipient })),
      me: { ...me, recipient: true, edu: false, who: '9bf31c7ff062936a' } }
    case 'closed': return { ...base, state: 'closed', recipient_replied: false, count: 0, replies: [],
      me: { ...me, can: false, why: 'closed' } }
    case 'closed-owner': return { ...full, state: 'closed', replies: rows.map((r) => ({ ...r, mine: r.recipient })),
      me: { ...me, recipient: true, edu: false, can: false, why: 'closed', who: '9bf31c7ff062936a' } }
    case 'school': return { ...full, replies: rows.map((r) => ({ ...r, mine: false, liked: false })),
      me: { signed: false, recipient: false, edu: false, terms: false, who: null, can: false, why: 'edu' } }
    case 'empty-school': return { ...base, recipient_replied: false, count: 0, replies: [],
      me: { signed: false, recipient: false, edu: false, terms: false, who: null, can: false, why: 'edu' } }
    default: return { ...base, recipient_replied: false, count: 0, replies: [], me }
  }
}

// A face, for the two handles that have one in the fixture. A flat swatch
// rather than a photograph, because a fixture face only has to prove the disc
// draws an image over its monogram; the monogram state is the other half and
// every other handle here is drawn in it.
const swatch = (a, b) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="31" r="13" fill="rgba(255,255,255,0.55)"/><ellipse cx="40" cy="66" rx="22" ry="16" fill="rgba(255,255,255,0.5)"/></svg>`,
)}`
const FACES = { 'jules.k': swatch('#5a6b8a', '#2b3550'), 'pilar.echevarria': swatch('#8a6a5a', '#4a3028') }
// A real photograph, when one is to hand: PREVIEW_FACES names a directory
// of `<handle>.png` or `<handle>.jpg`, and those handles are served that
// picture instead of the swatch, since how a dithered face reads is only
// worth judging on a face. Nothing in the repo carries one.
const REAL = new Map()
if (process.env.PREVIEW_FACES) {
  const { readdirSync, readFileSync } = await import('node:fs')
  for (const f of readdirSync(process.env.PREVIEW_FACES)) {
    const m = f.match(/^(.+)\.(png|jpe?g)$/i)
    if (!m) continue
    REAL.set(m[1], { body: readFileSync(join(process.env.PREVIEW_FACES, f)), type: m[2].toLowerCase() === 'png' ? 'image/png' : 'image/jpeg' })
    if (!FACES[m[1]]) FACES[m[1]] = `real:${m[1]}`
  }
}
for (const r of INDEX) if (FACES[r.target_handle]) r.avatar_path = `ig/${r.target_handle}.jpg`
// what the resolver answers for a face: the swatch itself, or, for a real
// photograph, the bucket's address, which the route below serves it from
const faceUrl = (h) => (REAL.has(h) ? `https://fixture.supabase.co/storage/v1/object/public/avatars/ig/${h}.jpg` : FACES[h] || '')

function whoami() {
  if (ANON) return { ok: true, signed_in: false }
  if (GOOGLE) {
    return { ok: true, signed_in: true, user: {
      id: '99999999-8888-4777-8666-555544443334', handle: null, handle_verified: false, email: null,
      edu_verified: false, campus: null, google_verified: true, email_verified: false,
      login_email: 'someone@gmail.com',
    } }
  }
  return {
    ok: true,
    signed_in: true,
    user: {
      id: '99999999-8888-4777-8666-555544443333',
      handle: VERIFIED ? 'ace03d' : null,
      handle_verified: VERIFIED,
      email: null,
      edu_verified: OPEN,
      campus: OPEN ? 'berkeley.edu' : null,
      // 0057: the two logins. Neither is held by the fixture browser.
      google_verified: false,
      email_verified: false,
      login_email: null,
    },
  }
}

// ── the desk's fixtures ─────────────────────────────────────────────────────
// Phase 7. The admin talks to one edge function and branches on `action`, so
// this is one map keyed the same way. Every field name is the one 0033 returns.
//
// The states worth looking at are the ones that are hard to draw: a queue with
// something held in it, a rejection with the classifier's reasons attached, a
// report whose letter is already down, a cap that is spent, and a merge that
// stopped and asked. An empty desk looks fine by accident.
const DESK_USERS = [
  { id: '99999999-8888-4777-8666-555544443333', handle: 'ace03d', handle_verified_at: new Date(now - 40 * DAY).toISOString(),
    edu_email: 'ace@berkeley.edu', edu_domain: 'berkeley.edu', edu_verified_at: new Date(now - 41 * DAY).toISOString(),
    email: null, created_at: new Date(now - 41 * DAY).toISOString(), updated_at: new Date(now - 2 * DAY).toISOString(),
    merged_into: null, merged_at: null, sessions: 2, letters: 3, claims: 1, reports: 0 },
  { id: '11111111-2222-4333-8444-555566667777', handle: null, handle_verified_at: null,
    edu_email: 'p.echevarria@berkeley.edu', edu_domain: 'berkeley.edu', edu_verified_at: new Date(now - 9 * DAY).toISOString(),
    email: 'pilar@gmail.com', created_at: new Date(now - 9 * DAY).toISOString(), updated_at: new Date(now - 9 * DAY).toISOString(),
    merged_into: null, merged_at: null, sessions: 1, letters: 2, claims: 0, reports: 1 },
  { id: '22222222-3333-4444-8555-666677778888', handle: 'jules.k', handle_verified_at: new Date(now - 6 * DAY).toISOString(),
    edu_email: null, edu_domain: null, edu_verified_at: null, email: null,
    created_at: new Date(now - 6 * DAY).toISOString(), updated_at: new Date(now - 6 * DAY).toISOString(),
    merged_into: null, merged_at: null, sessions: 1, letters: 0, claims: 2, reports: 0 },
  { id: '33333333-4444-4555-8666-777788889999', handle: null, handle_verified_at: null,
    edu_email: null, edu_domain: null, edu_verified_at: null, email: null,
    created_at: new Date(now - 21 * DAY).toISOString(), updated_at: new Date(now - 20 * DAY).toISOString(),
    merged_into: '99999999-8888-4777-8666-555544443333', merged_at: new Date(now - 20 * DAY).toISOString(),
    sessions: 0, letters: 0, claims: 0, reports: 0 },
]

const DESK_LETTERS = [
  // 0050: a letter the screen was unsure of is up, and flagged for a person
  { id: 'aaa11111-2222-4333-8444-555566660001', target_handle: 'sofiaaa.reyes',
    body: 'you sat two rows ahead all semester and i never once said anything.',
    sealed_line: 'it was the tuesday section.', status: 'live',
    moderation: { verdict: 'review', reasons: ['locate'], flagged: true, at: new Date(now - 2 * 3600000).toISOString(), model_layer: 2 },
    campus: 'berkeley', source_code: 'flyer-a', created_at: new Date(now - 2 * 3600000).toISOString(),
    expires_at: new Date(now + 30 * DAY).toISOString(), author_id: DESK_USERS[1].id,
    author_handle: null, author_campus: 'berkeley.edu', claims: 0, reports: 0, reports_open: 0, ask: null },
  { id: 'aaa11111-2222-4333-8444-555566660002', target_handle: 'ren.tanaka',
    body: 'text me on five five five zero one nine nine, i mean it',
    sealed_line: null, status: 'rejected',
    moderation: { verdict: 'reject', reasons: ['phone'], at: new Date(now - 5 * 3600000).toISOString(), model_layer: 1 },
    campus: 'berkeley', source_code: null, created_at: new Date(now - 5 * 3600000).toISOString(),
    expires_at: new Date(now + 30 * DAY).toISOString(), author_id: DESK_USERS[0].id,
    author_handle: 'ace03d', author_campus: 'berkeley.edu', claims: 0, reports: 0, reports_open: 0, ask: null },
  { id: 'aaa11111-2222-4333-8444-555566660003', target_handle: 'pilar.echevarria',
    body: 'you gave me your umbrella outside wheeler and walked home in it. i still have it.',
    sealed_line: null, status: 'live', moderation: { verdict: 'pass', reasons: [] },
    campus: 'berkeley', source_code: 'flyer-a', created_at: new Date(now - 3 * DAY).toISOString(),
    expires_at: new Date(now + 27 * DAY).toISOString(), author_id: DESK_USERS[0].id,
    author_handle: 'ace03d', author_campus: 'berkeley.edu', claims: 1, reports: 0, reports_open: 0, ask: 'pending' },
  { id: 'aaa11111-2222-4333-8444-555566660004', target_handle: 'm.okonkwo',
    body: 'i should have said something in march and i have thought about it every week since.',
    sealed_line: null, status: 'removed',
    moderation: { verdict: 'pass', reasons: [], desk: { status: 'removed', note: 'reported', at: new Date(now - 6 * 3600000).toISOString() } },
    campus: 'berkeley', source_code: null, created_at: new Date(now - 8 * DAY).toISOString(),
    expires_at: new Date(now + 22 * DAY).toISOString(), author_id: DESK_USERS[1].id,
    author_handle: null, author_campus: 'berkeley.edu', claims: 1, reports: 1, reports_open: 1, ask: null },
]

const DESK_REPORTS = [
  { id: 'bbb11111-2222-4333-8444-555566660001', status: 'open',
    reason: 'this is about me and i did not ask for it to be up there.',
    resolution: null, created_at: new Date(now - 6 * 3600000).toISOString(), resolved_at: null,
    reporter_id: DESK_USERS[2].id, reporter_handle: 'jules.k',
    letter_id: DESK_LETTERS[3].id, letter_status: 'removed', letter_body: DESK_LETTERS[3].body,
    letter_target: 'm.okonkwo', letter_campus: 'berkeley',
    letter_created_at: DESK_LETTERS[3].created_at, author_id: DESK_USERS[1].id,
    author_handle: null, letter_reports: 1,
    reporter_campus: 'berkeley.edu', reporter_reports: 1, author_campus: 'berkeley.edu',
    author_letters: 2, author_reported: 1, name_shut: false },
  { id: 'bbb11111-2222-4333-8444-555566660002', status: 'dismissed',
    reason: 'i think this is about somebody else with a similar name.',
    resolution: 'not the same person. put it back.',
    created_at: new Date(now - 4 * DAY).toISOString(), resolved_at: new Date(now - 4 * DAY + 3600000).toISOString(),
    reporter_id: DESK_USERS[0].id, reporter_handle: 'ace03d',
    letter_id: DESK_LETTERS[2].id, letter_status: 'live', letter_body: DESK_LETTERS[2].body,
    letter_target: 'pilar.echevarria', letter_campus: 'berkeley',
    letter_created_at: DESK_LETTERS[2].created_at, author_id: DESK_USERS[0].id,
    author_handle: 'ace03d', letter_reports: 1,
    reporter_campus: 'berkeley.edu', reporter_reports: 1, author_campus: 'berkeley.edu',
    author_letters: 3, author_reported: 1, name_shut: false },
]

// ── 0039: the series, the pings, the settings, the log ──
// A month of days with a slow climb and one busy week, so the graph has a
// shape worth looking at rather than a flat line at zero.
const DESK_GROWTH = (b) => {
  const grain = ['day', 'week', 'month'].includes(b.grain) ? b.grain : 'day'
  const step = grain === 'day' ? DAY : grain === 'week' ? 7 * DAY : 30 * DAY
  const days = Number(b.days) || 30
  const n = Math.min(400, Math.max(2, Math.ceil((days || 365) / (step / DAY)) + 1))
  let users_total = 12, handles_total = 7
  const rows = []
  for (let i = 0; i < n; i++) {
    const t = new Date(now - (n - 1 - i) * step)
    const busy = i > n * 0.55 && i < n * 0.75
    const users = Math.max(0, Math.round((busy ? 6 : 1.4) + Math.sin(i * 1.3) * 1.2))
    const handles = Math.round(users * 0.6)
    users_total += users; handles_total += handles
    rows.push({
      t: t.toISOString().slice(0, 10),
      users, handles, campuses: Math.round(users * 0.4),
      pings: Math.max(0, Math.round((busy ? 9 : 2) + Math.cos(i * 0.9) * 1.5)),
      mutuals: busy && i % 3 === 0 ? 1 : 0,
      letters: Math.max(0, Math.round((busy ? 4 : 1) + Math.sin(i * 2.1))),
      scans: Math.max(0, Math.round((busy ? 14 : 3) + Math.cos(i * 0.4) * 2)),
      users_total, handles_total,
    })
  }
  return { ok: true, grain, days, rows }
}

const DESK_PINGS = [
  { id: 'p1', from_handle: 'ace03d', state: 'standing', matched_handle: null, matched_at: null,
    created_at: new Date(now - 2 * DAY).toISOString(), expires_at: new Date(now + 58 * DAY).toISOString(),
    days_left: 58, has_line: true, has_email: true, reminded: false },
  { id: 'p2', from_handle: 'ace03d', state: 'mutual', matched_handle: 'jules.k', matched_at: new Date(now - 6 * DAY).toISOString(),
    created_at: new Date(now - 9 * DAY).toISOString(), expires_at: new Date(now + 51 * DAY).toISOString(),
    days_left: 51, has_line: true, has_email: true, reminded: false },
  { id: 'p3', from_handle: 'jules.k', state: 'mutual', matched_handle: 'ace03d', matched_at: new Date(now - 6 * DAY).toISOString(),
    created_at: new Date(now - 6 * DAY).toISOString(), expires_at: new Date(now + 54 * DAY).toISOString(),
    days_left: 54, has_line: false, has_email: false, reminded: false },
  { id: 'p4', from_handle: 'ren.tanaka', state: 'standing', matched_handle: null, matched_at: null,
    created_at: new Date(now - 55 * DAY).toISOString(), expires_at: new Date(now + 5 * DAY).toISOString(),
    days_left: 5, has_line: true, has_email: false, reminded: true },
  { id: 'p5', from_handle: 'm.okonkwo', state: 'lapsed', matched_handle: null, matched_at: null,
    created_at: new Date(now - 63 * DAY).toISOString(), expires_at: new Date(now - 3 * DAY).toISOString(),
    days_left: 0, has_line: false, has_email: false, reminded: true },
]
const DESK_PING_COUNTS = { standing: 5, mutual: 2, pairs: 1, lapsed: 1, placed_7d: 3, mutual_7d: 1, lapsing_7d: 1, with_line: 4, senders: 4 }

const DESK_SETTINGS = {
  ok: true,
  settings: { require_ig_verification: 'true', resolver_enabled: 'true', cap_user: 20, cap_device: 20, cap_ip: 200, cap_global: 1000 },
  defaults: { require_ig_verification: 'false', resolver_enabled: 'true', cap_user: 20, cap_device: 20, cap_ip: 200, cap_global: 1000 },
  updated: { require_ig_verification: new Date(now - 30 * DAY).toISOString() },
}

const DESK_LOG = [
  { id: 3, at: new Date(now - 3600000).toISOString(), action: 'desk_letter_set', target: 'id:aaa11111-2222-4333-8444-555566660002', detail: { status: 'live' } },
  { id: 2, at: new Date(now - DAY).toISOString(), action: 'desk_signin', target: 'handle:ace03d', detail: { note: 'testing on my phone', handle: 'ace03d' } },
  { id: 1, at: new Date(now - 4 * DAY).toISOString(), action: 'desk_report_resolve', target: 'id:bbb11111-2222-4333-8444-555566660002', detail: { uphold: false, note: 'not the same person. put it back.', restored: true } },
]

const DESK_PROFILES = HANDLES.slice(0, 9).map(([handle, display_name, is_verified], i) => ({
  handle, display_name, is_verified, is_private: i === 4,
  avatar_path: i === 3 || i === 7 ? null : `ig/${handle}.jpg`,
  avatar_fetched_at: i === 3 || i === 7 ? null
    : new Date(now - (i === 1 ? 46 : i * 3 + 1) * DAY).toISOString(),
  resolved_at: new Date(now - (i * 4 + 1) * DAY).toISOString(),
  stale: i === 1 || i === 3 || i === 7,
  searches: [14, 6, 5, 4, 3, 3, 2, 1, 1][i],
  // The screenshot browser has no Supabase behind it, so the face falls back to
  // the monogram. That is the state worth looking at anyway: it is the one that
  // can look broken, and spec section 5 says it must not.
  avatar: '',
}))

const DESK_OVERVIEW = {
  ok: true,
  now: new Date(now).toISOString(),
  counts: {
    users: 4, handle_verified: 2, edu_verified: 2, with_email: 1, merged: 1,
    sessions_live: 4, users_7d: 1,
    letters: 4, letters_live: 2, letters_flagged: 1, letters_pending: 0, letters_rejected: 1, letters_removed: 1,
    letters_7d: 2, claims: 3, asks_open: 1, revealed: 2, waitlist: 11, scans: 148,
    reports_open: 1, reports: 2,
    profiles: 9, profiles_faced: 7, profiles_stale: 3, searches_24h: 37, searches_48h: 61,
    conflicts_open: 1,
    users_30d: 3, members: 3,
    pings_standing: 5, pings_mutual: 2, pairs: 1, pings_7d: 3, mutuals_7d: 1, pings_lapsing_7d: 1, senders: 4,
    reports_7d: 1, desk_actions_7d: 2,
  },
  settings: { require_ig_verification: true, resolver_enabled: true, cap_global: 1000 },
  limits: [
    { key_type: 'ip', key_value: '169.229.216.200', spent: 24, cap: 200, remaining: 176,
      oldest: new Date(now - 19 * 3600000).toISOString(), newest: new Date(now - 1200000).toISOString(), blocked: false },
    { key_type: 'device_id', key_value: 'c1f0a4e2-9b77-4c31-8d2a-7f5b1e9a0c64', spent: 20, cap: 20, remaining: 0,
      oldest: new Date(now - 7 * 3600000).toISOString(), newest: new Date(now - 900000).toISOString(), blocked: true },
    { key_type: 'user_id', key_value: '99999999-8888-4777-8666-555544443333', spent: 9, cap: 20, remaining: 11,
      oldest: new Date(now - 11 * 3600000).toISOString(), newest: new Date(now - 2400000).toISOString(), blocked: false },
    { key_type: 'device_id', key_value: '7a2b91cc-4d05-4f88-9e13-2c6a08bb5d31', spent: 4, cap: 20, remaining: 16,
      oldest: new Date(now - 3 * 3600000).toISOString(), newest: new Date(now - 600000).toISOString(), blocked: false },
  ],
  conflicts: [
    { id: 'ccc11111-2222-4333-8444-555566660001', kind: 'handle',
      a_id: DESK_USERS[0].id, b_id: DESK_USERS[2].id,
      detail: { why: 'both rows hold a different verified handle', a: 'ace03d', b: 'jules.k' },
      created_at: new Date(now - 2 * DAY).toISOString(), resolved_at: null },
  ],
  scans: [
    { source_code: 'flyer-a', campus: 'berkeley', scans: 91, letters: 2, last_at: new Date(now - 4 * 3600000).toISOString() },
    { source_code: 'flyer-b', campus: 'berkeley', scans: 42, letters: 0, last_at: new Date(now - 2 * DAY).toISOString() },
    { source_code: 'sather-gate', campus: 'berkeley', scans: 15, letters: 0, last_at: new Date(now - 5 * DAY).toISOString() },
  ],
  campuses: [
    { slug: 'berkeley', name: 'UC Berkeley', edu_domain: 'berkeley.edu', is_open: true, letters: 1, waitlist: 11 },
  ],
}

// 0047. The five printed cards, with a spread worth looking at: one that is
// working, one that is scanned and goes nowhere, one taken out of circulation,
// one barely found, and one nobody has scanned at all. The last is the row that
// only exists because the registry does: it is what proves a card with nothing
// against it still appears.
const DESK_CARDS = {
  ok: true,
  now: new Date(now).toISOString(),
  rows: [
    { code: 'c', label: 'the one with the quote', place: 'moffitt, 4th floor',
      campus: 'berkeley', landing: '/berkeley', is_active: true,
      scans: 64, first_at: new Date(now - 9 * DAY).toISOString(), last_at: new Date(now - 2 * 3600000).toISOString(),
      read: 41, gate: 19, joined: 14, handoff: 6, letters: 9, letters_live: 8, waiting: 3 },
    { code: 'a', label: 'card a', place: 'sather gate', campus: 'berkeley', landing: '/berkeley', is_active: true,
      scans: 88, first_at: new Date(now - 11 * DAY).toISOString(), last_at: new Date(now - 3600000).toISOString(),
      read: 40, gate: 12, joined: 7, handoff: 2, letters: 4, letters_live: 4, waiting: 6 },
    { code: 'b', label: 'card b', place: 'the table at sproul', campus: 'berkeley', landing: '/berkeley', is_active: false,
      scans: 31, first_at: new Date(now - 12 * DAY).toISOString(), last_at: new Date(now - 4 * DAY).toISOString(),
      read: 9, gate: 2, joined: 1, handoff: 0, letters: 0, letters_live: 0, waiting: 1 },
    { code: 'd', label: 'card d', place: null, campus: 'berkeley', landing: '/berkeley', is_active: true,
      scans: 5, first_at: new Date(now - 3 * DAY).toISOString(), last_at: new Date(now - 2 * DAY).toISOString(),
      read: 1, gate: 0, joined: 0, handoff: 0, letters: 0, letters_live: 0, waiting: 0 },
    { code: 'e', label: 'card e', place: null, campus: 'berkeley', landing: '/berkeley', is_active: true,
      scans: 0, first_at: null, last_at: null,
      read: 0, gate: 0, joined: 0, handoff: 0, letters: 0, letters_live: 0, waiting: 0 },
  ],
  totals: { cards: 5, scans: 188, joined: 22, letters: 13, other_scans: 148 },
}

// 0068: a reply the reading held for a person, one out of sight after three
// reports, one that went up, one the desk took down, one the reading refused
const DESK_REPLIES = [
  { id: 'eee11111-2222-4333-8444-555566660001', status: 'held', recipient: false,
    body: 'you know exactly what you did at that party and everybody saw it',
    moderation: { verdict: 'review', reasons: ['pile'], model: 'claude-haiku-4-5-20251001', before: true },
    created_at: new Date(now - 40 * 60000).toISOString(), updated_at: new Date(now - 40 * 60000).toISOString(),
    reports: 0, reports_all: 0, likes: 0,
    letter_id: DESK_LETTERS[2].id, letter_status: 'live', letter_target: 'pilar.echevarria', letter_kind: 'handle',
    letter_name: null, letter_body: DESK_LETTERS[2].body, thread_state: 'open',
    author_id: DESK_USERS[1].id, author_handle: null, author_edu: 'p.echevarria@berkeley.edu', author_replies: 4, author_down: 0 },
  { id: 'eee11111-2222-4333-8444-555566660002', status: 'hidden', recipient: false,
    body: 'the umbrella thing is so obviously made up',
    moderation: { verdict: 'pass', reasons: [], hidden_at: new Date(now - 2 * 3600000).toISOString(), hidden_by: 'reports' },
    created_at: new Date(now - 5 * 3600000).toISOString(), updated_at: new Date(now - 2 * 3600000).toISOString(),
    reports: 3, reports_all: 3, likes: 2,
    letter_id: DESK_LETTERS[2].id, letter_status: 'live', letter_target: 'pilar.echevarria', letter_kind: 'handle',
    letter_name: null, letter_body: DESK_LETTERS[2].body, thread_state: 'open',
    author_id: DESK_USERS[0].id, author_handle: 'ace03d', author_edu: 'ace@berkeley.edu', author_replies: 9, author_down: 1 },
  { id: 'eee11111-2222-4333-8444-555566660003', status: 'live', recipient: true,
    body: 'i still think about that walk. keep the umbrella.',
    moderation: { verdict: 'pass', reasons: [] },
    created_at: new Date(now - 3 * 3600000).toISOString(), updated_at: new Date(now - 3 * 3600000).toISOString(),
    reports: 0, reports_all: 0, likes: 31,
    letter_id: DESK_LETTERS[2].id, letter_status: 'live', letter_target: 'pilar.echevarria', letter_kind: 'handle',
    letter_name: null, letter_body: DESK_LETTERS[2].body, thread_state: 'open',
    author_id: DESK_USERS[2].id, author_handle: 'jules.k', author_edu: null, author_replies: 1, author_down: 0 },
  { id: 'eee11111-2222-4333-8444-555566660004', status: 'removed', recipient: false,
    body: 'she only dates people with cars lol',
    moderation: { verdict: 'review', reasons: ['pile'], desk: { status: 'removed', note: 'piling on', at: new Date(now - DAY).toISOString(), from: 'held' } },
    created_at: new Date(now - 2 * DAY).toISOString(), updated_at: new Date(now - DAY).toISOString(),
    reports: 0, reports_all: 0, likes: 0,
    letter_id: DESK_LETTERS[0].id, letter_status: 'live', letter_target: 'sofiaaa.reyes', letter_kind: 'handle',
    letter_name: null, letter_body: DESK_LETTERS[0].body, thread_state: 'locked',
    author_id: DESK_USERS[0].id, author_handle: 'ace03d', author_edu: 'ace@berkeley.edu', author_replies: 9, author_down: 1 },
  { id: 'eee11111-2222-4333-8444-555566660005', status: 'rejected', recipient: false,
    body: 'i know which bus she takes home, it is the 51b at six',
    moderation: { verdict: 'reject', reasons: ['locate'], model: 'claude-haiku-4-5-20251001', before: true },
    created_at: new Date(now - 3 * DAY).toISOString(), updated_at: new Date(now - 3 * DAY).toISOString(),
    reports: 0, reports_all: 0, likes: 0,
    letter_id: DESK_LETTERS[0].id, letter_status: 'live', letter_target: 'sofiaaa.reyes', letter_kind: 'handle',
    letter_name: null, letter_body: DESK_LETTERS[0].body, thread_state: 'locked',
    author_id: DESK_USERS[1].id, author_handle: null, author_edu: 'p.echevarria@berkeley.edu', author_replies: 4, author_down: 0 },
]

const DESK_WAITLIST = ['nour.haddad', 'elias.brandt', 'aya.nakamura', 'k.villarreal', 'thom.iversen']
  .map((handle, i) => ({
    handle, campus: 'berkeley', source_code: i % 2 ? 'flyer-a' : null,
    created_at: new Date(now - (i * 2 + 1) * DAY).toISOString(),
    letters_now: i === 0 ? 1 : 0,
  }))

// The legacy half, which the DM code flow still writes.
const DESK_LEGACY = {
  ok: true,
  now: new Date(now).toISOString(),
  competitors: [],
  users: [
    { handle: 'ace03d', first_verified_at: new Date(now - 40 * DAY).toISOString(), via: 'dm',
      code: '481920', verified_at: new Date(now - 40 * DAY).toISOString(), session_live: true,
      suppressed: false, opted_out: false, pings: 3, received: 2, matches: 1,
      last_ping_at: new Date(now - 2 * DAY).toISOString() },
    { handle: 'jules.k', first_verified_at: new Date(now - 6 * DAY).toISOString(), via: 'dm',
      code: '113077', verified_at: new Date(now - 6 * DAY).toISOString(), session_live: true,
      suppressed: false, opted_out: false, pings: 1, received: 1, matches: 1,
      last_ping_at: new Date(now - 6 * DAY).toISOString() },
    { handle: 'ren.tanaka', first_verified_at: new Date(now - 12 * DAY).toISOString(), via: 'manual',
      code: null, verified_at: new Date(now - 12 * DAY).toISOString(), session_live: false,
      suppressed: true, opted_out: false, pings: 0, received: 1, matches: 0, last_ping_at: null },
  ],
  unverified: [
    { handle: 'nour.haddad', attempts: 4, code: '902144', first_at: new Date(now - 2 * DAY).toISOString(),
      last_at: new Date(now - 40 * 60000).toISOString(), live: true, suppressed: false },
    { handle: 'elias.brandt', attempts: 1, code: '338201', first_at: new Date(now - 9 * DAY).toISOString(),
      last_at: new Date(now - 9 * DAY).toISOString(), live: false, suppressed: false },
  ],
  growth: [],
  logs: [
    { at: new Date(now - 40 * 60000).toISOString(), kind: 'code', handle: 'nour.haddad', detail: '902144' },
    { at: new Date(now - 2 * DAY).toISOString(), kind: 'ping', handle: 'ace03d', detail: 'placed' },
    { at: new Date(now - 6 * DAY).toISOString(), kind: 'match', handle: 'ace03d', detail: '@jules.k' },
    { at: new Date(now - 12 * DAY).toISOString(), kind: 'blocked', handle: null, detail: 'asked never to be entered' },
  ],
  counts: {
    members: 3, assumed: 0, manual: 1, banned: 1, opted_out: 0, suppressed: 1,
    unverified: 2, pings: 4, matches: 1, new_7d: 1, pings_7d: 2,
  },
}

const page = (rows) => ({ ok: true, total: rows.length, limit: 50, offset: 0, rows })

// ── the daily check on apify (0060) ──
// A run a day while it passes and one every three hours while it does not,
// so a failing morning reads as a short stack of refusals over a week of
// passes. The refusal is the one Apify sends for a token it does not know.
const HOUR = 3600000
const canaryRun = (id, hoursAgo, ok, extra = {}) => ({
  id, ran_at: new Date(now - hoursAgo * HOUR).toISOString(),
  finished_at: new Date(now - hoursAgo * HOUR + (ok ? 8400 : 600)).toISOString(),
  source: 'cron', handle: 'instagram', ok, status: ok ? 'ok' : 'refused',
  http_status: ok ? 201 : 401, latency_ms: ok ? 8400 : 612, attempts: 1, face_ok: ok ? true : null,
  detail: ok
    ? { display_name: 'Instagram', verified: true, actor: 'shu8hvrXbJbY3Eb9W' }
    : { said: 'User was not found or authentication token is not valid', type: 'user-or-token-not-found', actor: 'shu8hvrXbJbY3Eb9W' },
  ...extra,
})
function canaryFixture(state) {
  const at = new Date(now).toISOString()
  const timeout = { status: 'timeout', http_status: null, latency_ms: 33000, attempts: 2,
    detail: { said: 'no answer inside 33 seconds', actor: 'shu8hvrXbJbY3Eb9W' } }
  if (state === 'never') {
    return { state: 'never', enabled: true, now: at, running: false,
      last: null, last_ok_at: null, fails: 0, failing_since: null, runs: [] }
  }
  if (state === 'stale') {
    const runs = [49, 73, 97, 121, 145, 169, 193].map((h, i) => canaryRun(40 - i, h, true))
    return { state: 'stale', enabled: true, now: at, running: false,
      last: runs[0], last_ok_at: runs[0].ran_at, fails: 0, failing_since: null, runs }
  }
  if (state === 'failing') {
    const runs = [
      canaryRun(47, 1.2, false),
      canaryRun(46, 4.2, false),
      canaryRun(45, 7.2, false, { source: 'desk' }),
      canaryRun(44, 9.2, false),
      canaryRun(43, 33.2, true),
      canaryRun(42, 57.2, true, { latency_ms: 21700 }),
      canaryRun(41, 81.2, true),
    ]
    return { state: 'failing', enabled: true, now: at, running: false,
      last: runs[0], last_ok_at: runs[4].ran_at, fails: 4, failing_since: runs[3].ran_at, runs }
  }
  const runs = [
    canaryRun(47, 5.3, true),
    canaryRun(46, 29.3, true, { latency_ms: 9100 }),
    canaryRun(45, 53.3, true, { latency_ms: 21700 }),
    canaryRun(44, 56.3, false, timeout),
    canaryRun(43, 80.3, true),
    canaryRun(42, 104.3, true, { face_ok: false }),
    canaryRun(41, 128.3, true),
  ]
  return { state: 'ok', enabled: true, now: at, running: false,
    last: runs[0], last_ok_at: runs[0].ran_at, fails: 0, failing_since: null, runs }
}

const DESK = {
  desk_overview: () => ({ ...DESK_OVERVIEW, canary: canaryFixture(CANARY) }),
  // the desk's "check it now": apify answers, and the line goes
  desk_canary_run: () => {
    CANARY = 'ok'
    return { ok: true, canary: canaryFixture('ok').last }
  },
  desk_users: (b) => page(b.query
    ? DESK_USERS.filter((u) => (u.handle || '').includes(b.query) || (u.edu_email || '').includes(b.query))
    : DESK_USERS),
  desk_user: () => ({
    ok: true,
    user: { ...DESK_USERS[0] },
    letters: DESK_LETTERS.filter((l) => l.author_id === DESK_USERS[0].id),
    merges: [{ id: 'ddd1', survivor_id: DESK_USERS[0].id, absorbed_id: DESK_USERS[3].id,
      reason: 'same campus address proved twice', moved: { wall_letters: 1, celestual_sessions: 1 },
      created_at: DESK_USERS[3].merged_at }],
    claims: [{ letter_id: DESK_LETTERS[2].id, target_handle: 'pilar.echevarria', created_at: new Date(now - DAY).toISOString() }],
  }),
  desk_profiles: () => page(DESK_PROFILES),
  // 0050: 'flagged' is the live letters the screen was unsure of that nobody
  // has decided about; every row says whether it is one
  desk_letters: (b) => page((b.status === 'flagged'
    ? DESK_LETTERS.filter((l) => l.status === 'live' && l.moderation?.verdict === 'review' && !l.moderation?.desk)
    : b.status ? DESK_LETTERS.filter((l) => l.status === b.status) : DESK_LETTERS)
    .map((l) => ({ ...l, flagged: l.status === 'live' && l.moderation?.verdict === 'review' && !l.moderation?.desk }))),
  desk_reports: (b) => ({
    ...page(b.status ? DESK_REPORTS.filter((r) => r.status === b.status) : DESK_REPORTS),
    counts: { open: 1, upheld: 0, dismissed: 1, reports_7d: 1 },
  }),
  desk_waitlist: () => page(DESK_WAITLIST),
  desk_cards: () => DESK_CARDS,
  desk_card_set: (b) => ({ ok: true, code: b.code, label: b.label }),
  desk_growth: (b) => DESK_GROWTH(b),
  desk_pings: (b) => ({
    ...page(b.state ? DESK_PINGS.filter((p) => p.state === b.state) : DESK_PINGS),
    counts: DESK_PING_COUNTS,
  }),
  desk_settings: () => DESK_SETTINGS,
  desk_log: () => page(DESK_LOG),
  desk_signin: (b) => ({
    ok: true, handle: b.handle || null, edu_email: b.edu_email || null,
    login_token: b.handle ? 'c'.repeat(48) : null, session_token: b.edu_email ? 'd'.repeat(64) : null,
    expires_at: new Date(now + 3600000).toISOString(),
  }),
  desk_setting_set: (b) => ({ ok: true, key: b.key, value: b.value }),
  desk_campus_set: (b) => ({ ok: true, slug: b.slug, is_open: !!b.open }),
  desk_campus_add: (b) => ({ ok: true, slug: b.slug }),
  desk_name_shut: (b) => ({ ok: true, handle: b.handle, campus: b.campus, letters: 1 }),
  desk_name_open: (b) => ({ ok: true, handle: b.handle, campus: b.campus, letters: 1 }),
  // 0068: the replies queue, with who wrote each one, and a decision on one
  desk_replies: (b) => ({
    ...page(DESK_REPLIES.filter((r) => (b.status === 'waiting' || !b.status ? ['held', 'hidden'].includes(r.status)
      : b.status === 'all' ? true : r.status === b.status))),
    counts: { waiting: 2, held: 1, hidden: 1, live: 1, removed: 1, rejected: 1, replies_7d: 5 },
  }),
  desk_reply_set: (b) => ({ ok: true, id: b.id, status: b.status, was: 'held' }),
  overview: () => DESK_LEGACY,
  handle_status: (b) => ({
    ok: true, handle: b.handle, suppressed: false, member: true,
    verifications: [
      { status: 'verified', token: '481920', verified_via: 'dm',
        created_at: new Date(now - 40 * DAY).toISOString(), verified_at: new Date(now - 40 * DAY).toISOString() },
      { status: 'expired', token: '774310', verified_via: null,
        created_at: new Date(now - 41 * DAY).toISOString(), verified_at: null },
    ],
  }),
}

const RPC = {
  celestual_whoami: () => whoami(),
  // 0044: the week's allowance, about the caller. Without this the composer
  // read the RPC's absence as a limit of nought and drew its act dark.
  // `capped` is 0052's switch, and the fixture keeps it on: the shot this
  // exists for is the composer with its allowance spent, which is a state the
  // cap has to be on to reach.
  wall_quota: () => ({
    ok: true, signed_in: true, capped: true,
    limit: 3, used: SPENT ? 3 : 2, left: SPENT ? 0 : 1,
    resets_at: new Date(now + 4 * DAY).toISOString(),
  }),
  // 0040: from the first character, exact then prefix then contains, with the
  // resolver's answer joined on for the names the fixture resolver knows.
  wall_search: (b) => {
    const q = String(b.p_query || '').toLowerCase().replace(/^@/, '').trim()
    if (!q) return []
    const fold = (r) => `${r.target_handle} ${(r.name || r.display_name || '').toLowerCase()}`
    const rank = (r) => (r.target_handle === q || (r.name || '').toLowerCase() === q ? 0 : fold(r).includes(` ${q}`) || r.target_handle.startsWith(q) ? 1 : 2)
    return INDEX.filter((r) => fold(r).includes(q))
      .sort((a, c) => rank(a) - rank(c) || c.letters - a.letters)
      .slice(0, 12)
      .map((r) => {
        const row = HANDLES.find(([x]) => x === r.target_handle)
        return {
          handle: r.target_handle, letters: r.letters, last_at: r.last_at, campus: 'berkeley',
          known: !!row, display_name: row ? row[1] : null, is_verified: row ? !!row[2] : false,
          avatar_path: row && FACES[r.target_handle] ? `ig/${r.target_handle}.jpg` : null,
          kind: r.kind, name: r.name, look: r.look,
        }
      })
  },
  // The DM code flow (0004, 0012, 0041). A code is minted at once, and the
  // poll answers pending for as long as the screenshot takes, carrying
  // whatever note the route asked for.
  celestual_start_ig_verification: () => ({
    ok: true, token: '1283', expires_at: new Date(now + 30 * 60000).toISOString(), passed: PASS,
  }),
  celestual_poll_ig_verification: () => (PASS
    ? { status: 'verified', handle: 'ace03d', note: null }
    : { status: 'pending', handle: null, note: NOTE || null }),
  // 0023: the ping, placed. Standing, never announced as mutual here, and the
  // slots the server holds this person to, which the account sheet counts
  // against. Or refused, with every slot already standing.
  celestual_submit: () => (FULL
    ? { recorded: false, error: 'no_slots', slots: { standing: 2, cap: 2 } }
    : {
      recorded: true, mutual: false, match: null, match_card: null, reachable: false,
      expires_at: new Date(now + 60 * DAY).toISOString(), slots: { standing: 2, cap: 2 },
    }),
  // The front door's notice reads this.
  wall_pulse: () => ({
    ok: true, campus: 'berkeley', name: 'UC Berkeley', open: true,
    names: INDEX.length, letters: INDEX.reduce((n, r) => n + r.letters, 0),
    last_at: INDEX[0] ? INDEX[0].last_at : null,
  }),
  wall_letters_for: (b) => {
    const key = String(b.p_handle || '').replace(/^@/, '')
    const row = INDEX.find((r) => r.target_handle === key)
    return {
      ok: true, open: OPEN, handle: key,
      kind: row ? row.kind : 'handle', name: row ? row.name : null,
      letters: lettersFor(key, OPEN),
      ...faceOf(key),
    }
  },
  wall_letter: () => ({
    ok: true, open: OPEN,
    letter: { ...lettersFor('pilar.echevarria', OPEN)[0], mine: VERIFIED },
    ...faceOf('pilar.echevarria'),
  }),
  // 0042: a heart on, or off, and the count back
  wall_heart: (b) => ({ ok: true, letter: b.p_letter, hearts: b.p_on ? 13 : 12, hearted: !!b.p_on }),
  // 0068: the thread under a letter, a like, a report and the recipient's say
  wall_reply_thread: () => thread(),
  wall_reply_like: (b) => {
    const r = REPLIES.find((x) => x.id === b.p_reply)
    return { ok: true, reply: b.p_reply, likes: (r ? r.likes : 0) + (b.p_on ? 1 : 0), liked: !!b.p_on }
  },
  wall_reply_report: (b) => ({ ok: true, reply: b.p_reply, reported: !!b.p_on, hidden: false }),
  wall_reply_thread_set: (b) => ({ ok: true, letter: b.p_letter, state: b.p_state }),
  // 0050: this browser's own letters and where each stands. One of them has
  // been taken down by the reading, after it went up, when the route asks
  // for it: the notice at the foot of the wall.
  wall_mine: () => ({
    ok: true,
    letters: MANY ? ['pilar.echevarria', 'jules.k', 'ren.tanaka', '~sofia', 'm.okonkwo', 'aya.nakamura'].map((h, i) => ({
      id: `1111${i}111-2222-4333-8444-55556666000${i}`, handle: h, kind: h.startsWith('~') ? 'name' : 'handle',
      name: h === '~sofia' ? 'Sofia' : null, look: null,
      body: LINES[i % LINES.length], status: i === 4 ? 'removed' : 'live', down_by: i === 4 ? 'report' : null,
      hearts: [3, 0, 1, 7, 0, 2][i], reasons: [], flagged: false,
      at: new Date(now - (i * 2 + 1) * DAY).toISOString(),
    })) : DOWN ? [{
      id: '11110111-2222-4333-8444-555566660000', handle: 'ren.tanaka',
      body: 'you were the one singing on the 51B that night. i wanted the song to be about me.',
      status: 'rejected', down_by: 'screen', reasons: ['threat'], flagged: false,
      at: new Date(now - 2 * 3600000).toISOString(),
    }] : [],
  }),
  // The RPC's own shape, which api/celestual.js normalises before Main sees it.
  celestual_my_pings: () => ({
    ok: true,
    pings: [
      {
        handle: 'jules.k',
        time: now - 14 * DAY,
        expires_at: new Date(now + 46 * DAY).toISOString(),
        mutual: true,
        card: { words: 'i have wanted to say this since the second week of term.' },
        their_card: { words: 'i kept nearly saying something after class and then not saying it.' },
        ...faceOf('jules.k'),
      },
      {
        handle: 'ren.tanaka',
        time: now - 6 * DAY,
        expires_at: new Date(now + 54 * DAY).toISOString(),
        mutual: false,
        card: { words: 'you were the one singing on the 51B that night.' },
      },
    ],
  }),
}

async function fulfil(route) {
  const req = route.request()
  const url = req.url()

  // The resolver, through the first party rewrite.
  if (url.includes('/api/resolve')) {
    const body = JSON.parse(req.postData() || '{}')
    // A batched peek (api/handles.js flushPeeks): every face on a screen in
    // one request, answered from what the fixture resolver knows and nothing
    // for the rest, which draws their monograms.
    if (Array.isArray(body.handles)) {
      const results = {}
      for (const raw of body.handles) {
        const h = String(raw || '').toLowerCase()
        const row = HANDLES.find(([x]) => x === h)
        results[h] = row
          ? { ok: true, found: true, handle: row[0], display_name: row[1], is_verified: row[2], avatar: faceUrl(row[0]), cached: true }
          : { ok: true, found: false, handle: h, cached: true }
      }
      return route.fulfill({ json: { ok: true, results } })
    }
    const h = String(body.handle || '').toLowerCase()
    const row = HANDLES.find(([x]) => x === h)
    // a handle the fixture does not carry is an account the resolver did not
    // find, which is a state worth drawing, and not a reason to stop the run
    if (!row) return route.fulfill({ json: { ok: true, found: false, handle: h, cached: true } })
    const answer = () => route.fulfill({
      json: {
        ok: true, found: true, handle: row[0], display_name: row[1], is_verified: row[2],
        // Mostly no avatar. Spec section 5: a failed download stores nothing
        // and the card falls back to a monogram, and this is the state most
        // worth looking at because it is the one that can look broken.
        avatar: faceUrl(row[0]), cached: true,
      },
    })
    if (SLOW) { setTimeout(answer, 15000); return undefined }
    return answer()
  }

  // A stored face off the public bucket, by the path the search carries: the
  // fixture's swatch for the two handles that have one, and a 404 for the
  // rest, which draws the monogram under it.
  const face = url.match(/\/storage\/v1\/object\/public\/avatars\/ig\/([a-z0-9._]+)\.jpg/)
  if (face && REAL.has(face[1])) {
    const r = REAL.get(face[1])
    return route.fulfill({ status: 200, contentType: r.type, body: r.body, headers: { 'access-control-allow-origin': '*' } })
  }
  if (face) {
    const src = FACES[face[1]]
    if (!src) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({
      status: 200, contentType: 'image/svg+xml',
      body: decodeURIComponent(src.replace(/^data:image\/svg\+xml;utf8,/, '')),
    })
  }

  // The public index, read straight off the view.
  if (url.includes('/rest/v1/wall_index')) {
    return route.fulfill({ json: INDEX })
  }

  // Every RPC.
  const m = url.match(/\/rest\/v1\/rpc\/([a-z_]+)/)
  if (m) {
    const fn = RPC[m[1]]
    const body = req.postData() ? JSON.parse(req.postData()) : {}
    return route.fulfill({ json: fn ? fn(body) : { ok: true } })
  }

  // The desk. One edge function, and it branches on `action`, so this does too.
  if (url.includes('/functions/v1/celestual-admin')) {
    const b = req.postData() ? JSON.parse(req.postData()) : {}
    const fn = DESK[b.action]
    return route.fulfill({ json: fn ? fn(b) : { ok: true } })
  }

  // The screen the composer posts through: the letter is up at once
  // (celestual-wall-moderate writes it live and reads it after), and the
  // index carries it on the next read, so the wall under the sheet has a
  // name to receive. The count is put back at the start of every route.
  if (url.includes('/functions/v1/celestual-wall-moderate')) {
    const b = req.postData() ? JSON.parse(req.postData()) : {}
    const named = b.kind === 'name'
    const key = named
      ? `~${String(b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`
      : String(b.target || '').toLowerCase()
    let row = INDEX.find((r) => r.target_handle === key)
    if (row) { row.letters += 1; row.last_at = new Date().toISOString(); row.look = b.look || null }
    else if (key) {
      row = { target_handle: key, campus: 'berkeley', letters: 1, last_at: new Date().toISOString(),
        known: false, display_name: '', is_verified: false, avatar_path: null,
        kind: named ? 'name' : 'handle', name: named ? b.name : null, look: b.look || null }
      INDEX.unshift(row)
    }
    return route.fulfill({ json: {
      ok: true, status: 'live', id: 'dddd0111-2222-4333-8444-555566660000',
      handle: key, kind: named ? 'name' : 'handle', name: named ? b.name : null, look: b.look || null,
    } })
  }

  // 0068: a reply, read before it is written. The words say which way the
  // reading goes, so a route can shoot each answer: 'wait' is held for a
  // person, 'refuse' is refused, anything else goes up.
  if (url.includes('/functions/v1/celestual-wall-reply')) {
    const b = req.postData() ? JSON.parse(req.postData()) : {}
    const words = String(b.body || '')
    if (THREAD === 'terms' && !b.accept) return route.fulfill({ json: { ok: false, error: 'terms' } })
    const status = /wait/i.test(words) ? 'held' : /refuse/i.test(words) ? 'rejected' : 'live'
    return route.fulfill({ json: {
      ok: true, id: 'r0000009-2222-4333-8444-555566660009', status, recipient: THREAD.startsWith('recipient'),
      ...(status === 'held' ? { say: "it's being read. it shows here once it passes." } : {}),
      ...(status === 'rejected' ? { say: "it can't go up as it's written.", reasons: ['pile'] } : {}),
    } })
  }
  // The school's link (celestual-edu-verify `link` and `status`), asked from
  // under a letter: mailed, and not yet tapped.
  if (url.includes('/functions/v1/celestual-edu-verify')) {
    const b = req.postData() ? JSON.parse(req.postData()) : {}
    if (b.action === 'link') {
      return route.fulfill({ json: { ok: true, request: 'req-preview-0001', match: 42, domain: 'berkeley.edu', campus: 'berkeley', school: 'UC Berkeley' } })
    }
    if (b.action === 'status') return route.fulfill({ json: { ok: true, verified: false, purpose: 'edu' } })
  }

  // Every other edge function.
  if (url.includes('/functions/v1/')) {
    return route.fulfill({ json: { ok: true } })
  }

  // Supabase Auth, for the door that mails a code to any address (api/login.js
  // `sendEmailCode`, `checkEmailCode`). signInWithOtp posts to /auth/v1/otp and
  // answers with an empty object; verifyOtp posts to /auth/v1/verify and answers
  // with a session. Without both, the catch-all below 404s and every shot of the
  // code step is a shot of the ADDRESS step with a fault line under it.
  if (url.includes('/auth/v1/otp')) return route.fulfill({ json: {} })
  if (url.includes('/auth/v1/verify')) {
    return route.fulfill({ json: {
      access_token: 'preview', token_type: 'bearer', expires_in: 3600, refresh_token: 'preview',
      user: { id: '00000000-0000-4000-8000-000000000001', email: 'you@anywhere.com' },
    } })
  }
  if (url.includes('/auth/v1/')) return route.fulfill({ json: {} })

  return route.fulfill({ status: 404, body: '' })
}

// ── the routes ──────────────────────────────────────────────────────────────
// Every route docs/plan.md puts in Phase 6b's scope, plus the states of them
// that only exist behind a gate.
const ROUTES = [
  // The intro, held on its last beat: the phone, and the mark in its pixels.
  // Then held on the run and on the hug by the clock (Intro.jsx `?t=`), and
  // the same last beat typed, for setting beside it (`?intro=ascii`).
  { label: 'intro',         path: '/?beat=3' },
  { label: 'intro-run',     path: '/?t=900' },
  { label: 'intro-hug',     path: '/?t=1500' },
  { label: 'intro-ascii',   path: '/?beat=3&intro=ascii' },
  // ── the ping, on the wall ──
  // Raised over the Berkeley wall, from the tab, the bar and the foot, and
  // from every address Main used to draw it at. The people written to, with
  // what each one's ping is doing; a new @ typed, with the wall's names under
  // it, and the resolver's answer in the field's place; the ping's own
  // screen; the door, when the proof is not on this device; and "it's out."
  { label: 'ping',          path: '/berkeley/ping' },
  { label: 'ping-typed',    path: '/berkeley/ping', type: { into: '.wl-ping .wl-field input', text: 'a' } },
  { label: 'ping-found',    path: '/berkeley/ping',
    acts: [['fill', '.wl-ping .wl-field input', 'pilar.echevarria'], ['click', '.wl-write-foot .wl-pill.is-light']], settle: 1400 },
  { label: 'ping-line',     path: '/berkeley/ping',
    acts: [['click', '.wl-ping-wrote .wl-suggest-row'], ['fill', '.wl-ping textarea', 'i kept nearly saying something after class and then not saying it.']] },
  { label: 'ping-long',     path: '/berkeley/ping/pilar.echevarria',
    acts: [['fill', '.wl-ping textarea', 'i kept nearly saying something after class and then not saying it and then the term ended and i still had not said it']] },
  { label: 'ping-full',     path: '/berkeley/ping/pilar.echevarria', full: true,
    acts: [['fill', '.wl-ping textarea', 'i kept nearly saying something after class.'], ['click', '.wl-write-foot .wl-pill.is-light']], settle: 1600 },
  { label: 'ping-proof',    path: '/berkeley/ping/pilar.echevarria', verified: false,
    acts: [['fill', '.wl-ping textarea', 'i kept nearly saying something after class.'], ['click', '.wl-write-foot .wl-pill.is-light']] },
  { label: 'ping-code',     path: '/berkeley/ping/pilar.echevarria', verified: false,
    acts: [['fill', '.wl-ping textarea', 'i kept nearly saying something after class.'], ['click', '.wl-write-foot .wl-pill.is-light'],
           ['fill', '.wl-door .wl-field input', 'ace03d'], ['click', '.wl-door-ways .wl-pill.is-light']] },
  { label: 'ping-done',     path: '/berkeley/ping/pilar.echevarria',
    acts: [['fill', '.wl-ping textarea', 'i kept nearly saying something after class.'], ['click', '.wl-write-foot .wl-pill.is-light']], settle: 1600 },
  // the whole story from the wall: the tab, a name written to, a line, the
  // door passed on the spot, "it's out.", and back on the names
  { label: 'ping-story-tab',  path: '/berkeley', tab: true, verified: false, pass: true,
    acts: [['click', '.wl-mast-go'], ['wait', 3400], ['click', '.wl-tab-main']], settle: 1400 },
  { label: 'ping-story-line', path: '/berkeley', tab: true, verified: false, pass: true,
    acts: [['click', '.wl-mast-go'], ['wait', 3400], ['click', '.wl-tab-main'], ['wait', 900],
           ['click', '.wl-ping-wrote .wl-suggest-row'], ['fill', '.wl-ping textarea', 'you laughed at the wrong part of the film and i liked you for it.']] },
  { label: 'ping-story-door', path: '/berkeley', tab: true, verified: false, pass: true,
    acts: [['click', '.wl-mast-go'], ['wait', 3400], ['click', '.wl-tab-main'], ['wait', 900],
           ['click', '.wl-ping-wrote .wl-suggest-row'], ['fill', '.wl-ping textarea', 'you laughed at the wrong part of the film and i liked you for it.'],
           ['click', '.wl-write-foot .wl-pill.is-light'], ['fill', '.wl-door .wl-field input', 'ace03d']] },
  { label: 'ping-story-done', path: '/berkeley', tab: true, verified: false, pass: true,
    acts: [['click', '.wl-mast-go'], ['wait', 3400], ['click', '.wl-tab-main'], ['wait', 900],
           ['click', '.wl-ping-wrote .wl-suggest-row'], ['fill', '.wl-ping textarea', 'you laughed at the wrong part of the film and i liked you for it.'],
           ['click', '.wl-write-foot .wl-pill.is-light'], ['fill', '.wl-door .wl-field input', 'ace03d'], ['click', '.wl-door-ways .wl-pill.is-light'], ['wait', 1600]], settle: 600 },
  { label: 'ping-story-home', path: '/berkeley', tab: true, verified: false, pass: true,
    acts: [['click', '.wl-mast-go'], ['wait', 3400], ['click', '.wl-tab-main'], ['wait', 900],
           ['click', '.wl-ping-wrote .wl-suggest-row'], ['fill', '.wl-ping textarea', 'you laughed at the wrong part of the film and i liked you for it.'],
           ['click', '.wl-write-foot .wl-pill.is-light'], ['fill', '.wl-door .wl-field input', 'ace03d'], ['click', '.wl-door-ways .wl-pill.is-light'], ['wait', 1600],
           ['click', '.wl-write-foot .wl-pill.is-light'], ['wait', 1400]], settle: 1200 },
  // and from a link, cold: an old /@handle lands on the ping over Berkeley,
  // and "back to the wall" leaves the names with no poster over them
  { label: 'ping-cold',      path: '/@pilar.echevarria' },
  { label: 'ping-cold-home', path: '/@pilar.echevarria',
    acts: [['wait', 3200], ['fill', '.wl-ping textarea', 'i kept nearly saying something after class.'], ['click', '.wl-write-foot .wl-pill.is-light'], ['wait', 1400],
           ['click', '.wl-write-foot .wl-pill.is-light'], ['wait', 1600]], settle: 1200 },
  // ── the person ──
  // The bar's face opens it: the pings, the drafts, the letters. A standing
  // ping opened onto its own screen, its options, and letting it go asked.
  // The three ways the list can not be there: no @ here, a proof gone, and
  // nobody at all, which is the door.
  { label: 'you',           path: '/berkeley/you' },
  { label: 'you-bar',       path: '/berkeley', acts: [['click', '.wl-mast-go'], ['wait', 3400], ['click', '.wl-memberbtn']], settle: 1400 },
  { label: 'you-ping',      path: '/berkeley/you', acts: [['wait', 1400], ['click', '.wl-wrote-row.is-standing']], settle: 1200 },
  { label: 'you-options',   path: '/berkeley/you',
    acts: [['wait', 1400], ['click', '.wl-wrote-row.is-standing'], ['wait', 900], ['click', '.wl-you-ping .wl-sk.is-l']], settle: 900 },
  { label: 'you-let-go',    path: '/berkeley/you',
    acts: [['wait', 1400], ['click', '.wl-wrote-row.is-standing'], ['wait', 900], ['click', '.wl-you-ping .wl-sk.is-l'], ['wait', 500],
           ['click', '.wl-scr-menu li:last-child']], settle: 900 },
  { label: 'you-unproved',  path: '/berkeley/you', verified: false },
  { label: 'you-door',      path: '/berkeley/you', anon: true },
  { label: 'you-home',      path: '/you' },
  // and both under prefers-reduced-motion: the screen does not dip, and
  // every state is still whole as a still frame
  { label: 'ping-done-still', path: '/berkeley/ping/pilar.echevarria', still: true,
    acts: [['fill', '.wl-ping textarea', 'i kept nearly saying something after class.'], ['click', '.wl-write-foot .wl-pill.is-light']], settle: 900 },
  { label: 'you-still',     path: '/berkeley/you', still: true, settle: 900 },
  // the addresses Main used to draw, landing on the wall
  { label: 'legacy-sky',    path: '/sky' },
  { label: 'legacy-place',  path: '/place' },
  { label: 'legacy-ping',   path: '/ping' },
  // It's mutual, a sheet on the wall now: the fixture's mutual with jules.k,
  // once the story on its screen has landed, and a handle that is not one.
  // `?beat=4` lifts the intro at once, so the sheet is what is shot.
  { label: 'reveal',        path: '/reveal/jules.k?beat=4', settle: 4200 },
  { label: 'reveal-berkeley', path: '/berkeley/reveal/jules.k?beat=4', settle: 4200 },
  { label: 'reveal-none',   path: '/berkeley/reveal/sofiaaa.reyes?beat=4' },
  // the three stories and the deck under prefers-reduced-motion, where each
  // is drawn on its last frame and has to be whole as a still
  { label: 'reveal-still',  path: '/berkeley/reveal/jules.k', still: true, settle: 1600 },
  { label: 'join-still',    path: '/berkeley/join', still: true, settle: 1600 },
  { label: 'intro-still',   path: '/?beat=3', still: true, settle: 900 },
  { label: 'letter-still',  path: '/berkeley/letter/ren.tanaka', still: true, settle: 1200 },
  // the veil over the field, with the flaps rolled into place (art.jsx
  // Flap), so the wall is shot once they have landed; then the field with
  // the veil lifted, once the lens has bloomed and the walk has taken its
  // first step and come to rest on a person
  // ── the wall at the root (0057): the same wall for everybody, with the
  //    mark on its poster, and the door with three ways in ──
  { label: 'home',            path: '/', settle: 6000 },
  { label: 'home-lifted',     path: '/', press: '.wl-mast-go', settle: 5200 },
  { label: 'home-gate',       path: '/gate', anon: true },
  { label: 'home-gate-ig',    path: '/gate', anon: true, press: '[data-way="instagram"]' },
  { label: 'home-gate-email', path: '/gate', anon: true, press: '[data-way="email"]' },
  // The code step, on both walls: the address typed, the code asked for, and
  // the box it comes back into. The one screen in the door nobody had ever
  // looked at, because reaching it needs a mail to have gone out.
  { label: 'home-gate-code', path: '/gate', anon: true, acts: [
    ['click', '[data-way="email"]'],
    ['fill', '.wl-addr-in', 'you@anywhere.com'],
    ['click', '.wl-door-ways .wl-pill.is-light'],
  ] },
  { label: 'home-gate-code-typed', path: '/gate', anon: true, acts: [
    ['click', '[data-way="email"]'],
    ['fill', '.wl-addr-in', 'you@anywhere.com'],
    ['click', '.wl-door-ways .wl-pill.is-light'],
    ['fill', '.wl-codebox-in', '481920'],
  ] },
  // the DM code, on the door: the one screen whose success depends on what
  // somebody does after they have left the product
  { label: 'home-gate-ig-code', path: '/gate', anon: true, acts: [
    ['click', '[data-way="instagram"]'],
    ['fill', '.wl-field input', 'ace03d'],
    ['click', '.wl-door-ways .wl-pill.is-light'],
  ] },
  { label: 'berkeley-gate-code', path: '/berkeley/gate', anon: true, acts: [
    ['fill', '.wl-addr-in', 'you'],
    ['click', '.wl-door-ways .wl-pill.is-light'],
    ['fill', '.wl-codebox-in', '481920'],
  ] },
  { label: 'home-write',      path: '/write/sofiaaa.reyes' },
  { label: 'home-letter',     path: '/letter/pilar.echevarria' },
  { label: 'berkeley-gate-google', path: '/berkeley/gate', anon: true },
  { label: 'berkeley',        path: '/berkeley', settle: 6000 },
  // the veil opening from the tap, held at four tenths of its reach
  // (Wall.jsx `heldRipple`): the circle, the crest of the pulse running
  // through the discs on its edge, and the type going where the edge has
  // reached it. A capture takes longer than the ripple's middle lasts, so
  // the frame is held rather than caught.
  { label: 'berkeley-ripple', path: '/berkeley?rp=0.42', press: '.wl-veil-scrim', at: { x: 0.62, y: 0.58 }, settle: 900 },
  { label: 'berkeley-lifted', path: '/berkeley', press: '.wl-mast-go', settle: 5200 },
  // the field under a mouse: the disc the pointer is on, lifted and named,
  // and the crowd parted round it. The one state of the wall that only a
  // pointer can draw, and the one that used to draw a frame round the name.
  { label: 'berkeley-hover',  path: '/berkeley', press: '.wl-mast-go', settle: 4200, hover: true },
  // the foot of the site, where the wall's own gradient runs out into it
  { label: 'berkeley-foot',   path: '/berkeley', press: '.wl-mast-go', settle: 4200, scroll: 'bottom' },
  { label: 'berkeley-tab',    path: '/berkeley', tab: true, press: '.wl-mast-go', settle: 5200 },
  // a letter this browser put up has come down since: the notice stands in
  // the tab's place, with the reason and the way to the words
  { label: 'berkeley-down',   path: '/berkeley', tab: true, down: true, press: '.wl-mast-go', settle: 5200 },
  // the wall's own search, typed into: the strip opened into the phone's
  // menu of names, the first one chosen by the pointer that typed it
  { label: 'berkeley-seek-typed', path: '/berkeley',
    acts: [['click', '.wl-mast-go'], ['wait', 3400], ['fill', '.wl-seek .wl-field input', 'a']], settle: 1200 },
  // the same two under prefers-reduced-motion (rebuild-spec 7.2): the veil
  // composed with nothing arriving, and the field still, with the lens on
  { label: 'berkeley-still',        path: '/berkeley', still: true, settle: 1200 },
  { label: 'berkeley-lifted-still', path: '/berkeley', still: true, press: '.wl-mast-go', settle: 1200 },
  { label: 'find',          path: '/berkeley/find' },
  { label: 'letter',        path: '/berkeley/letter/pilar.echevarria' },
  // a letter reached from a link, by its own id: the name in the corner and
  // `view the wall` under the card, and that line pressed, which lands on
  // the names and not on the poster (screens/Letter.jsx `LetterBrand`)
  { label: 'letter-cold',   path: '/berkeley/letter/11110111-2222-4333-8444-555566660000' },
  { label: 'letter-view-wall', path: '/berkeley/letter/11110111-2222-4333-8444-555566660000',
    acts: [['wait', 900], ['click', '.wl-letter-out'], ['wait', 1800]], settle: 900 },
  // and one opened from the wall itself, which is the wall's and carries
  // neither
  { label: 'letter-warm',   path: '/berkeley',
    acts: [['click', '.wl-mast-go'], ['wait', 3600], ['click', '.wl-cell[aria-label^="@ren.tanaka"] .wl-cell-disc'], ['wait', 1400]], settle: 400 },
  // the stack, turned once: the second letter under the name, in from the right
  { label: 'letter-turned', path: '/berkeley/letter/pilar.echevarria', press: '.wl-turn.is-next', settle: 1200 },
  // and turned back: the previous letter, in from the left
  { label: 'letter-back',   path: '/berkeley/letter/pilar.echevarria',
    acts: [['click', '.wl-turn.is-next'], ['wait', 500], ['click', '.wl-turn.is-prev']], settle: 1000 },
  // a finger on the card, held mid swipe: the next card standing beside it
  { label: 'letter-swipe',  path: '/berkeley/letter/pilar.echevarria',
    acts: [['swipe', '.wl-letter-card', -150, 'hold']], settle: 400 },
  // and let go past the threshold: the strip ran on to the next letter
  { label: 'letter-swiped', path: '/berkeley/letter/pilar.echevarria',
    acts: [['swipe', '.wl-letter-card', -220]], settle: 900 },
  // the deck at rest from the middle of it, a neighbour asleep either side;
  // the same card under a mouse held mid drag; the first letter pulled the
  // way there is nothing, giving; and the lean a first visit is shown, caught
  // at its furthest
  { label: 'letter-deck',   path: '/berkeley/letter/ren.tanaka' },
  { label: 'letter-drag',   path: '/berkeley/letter/ren.tanaka',
    acts: [['mouse', '.wl-letter-card', -170, 'hold']], settle: 300 },
  { label: 'letter-end',    path: '/berkeley/letter/pilar.echevarria',
    acts: [['swipe', '.wl-letter-card', 180, 'hold']], settle: 300 },
  { label: 'letter-lean',   path: '/berkeley/letter/ren.tanaka', lean: true,
    acts: [['until', "(document.querySelector('.wl-letter-card') || {}).style?.transform?.includes('-')", 8000]], settle: 200 },
  // a mouse resting on the letter after this one: it wakes a little and
  // leans in, and a press there turns to it
  { label: 'letter-hover',  path: '/berkeley/letter/ren.tanaka',
    acts: [['mouse', '.wl-turn.is-next', 0, 'hover']], settle: 600 },
  // the keyboard's rings on the deck: the letter after this one, which the
  // turn's own button covers, and a soft key on the card
  { label: 'letter-focus',  path: '/berkeley/letter/ren.tanaka', acts: [['focus', '.wl-turn.is-next']], settle: 500 },
  { label: 'letter-focus-key', path: '/berkeley/letter/ren.tanaka', acts: [['focus', '.wl-letter-card .wl-sk.is-r']], settle: 500 },
  // the screen's two menus, and the screen in each of its treatments
  { label: 'letter-options', path: '/berkeley/letter/pilar.echevarria', press: '.wl-letter-card .wl-sk.is-l', settle: 700 },
  // the heart, pressed: by a campus reader, and by somebody signed in with
  // google and nothing else, whose press used to go to the gate and count
  // nothing (auth.js `refresh`)
  { label: 'letter-heart',  path: '/berkeley/letter/pilar.echevarria', press: '.wl-letter-card .wl-sk.is-c', settle: 900 },
  { label: 'letter-heart-google', path: '/berkeley/letter/pilar.echevarria', google: true,
    press: '.wl-letter-card .wl-sk.is-c', settle: 900 },
  { label: 'letter-share',   path: '/berkeley/letter/pilar.echevarria', press: '.wl-letter-card .wl-sk.is-r', settle: 700 },
  { label: 'letter-shared',  path: '/berkeley/letter/pilar.echevarria',
    acts: [['click', '.wl-letter-card .wl-sk.is-r'], ['wait', 900], ['click', '.wl-scr-menu li:last-child']], settle: 900 },
  { label: 'letter-poster',  path: '/berkeley/letter/jules.k' },
  { label: 'letter-riso',    path: '/berkeley/letter/k.villarreal' },
  { label: 'letter-xerox',   path: '/berkeley/letter/m.okonkwo' },
  { label: 'letter-negative', path: '/berkeley/letter/dani.arroyo' },
  // the card on its way back into the disc it belongs to, caught mid flight:
  // the glass fading in place, the head and foot gone, the paper going round
  { label: 'letter-close',  path: '/berkeley/letter/pilar.echevarria',
    acts: [['wait', 600], ['click', '.wl-close', null, 90]], settle: 0 },
  // opened from a disc on the lifted wall, then closed by the mark: the
  // card flying back into the disc it came out of, caught half way, with
  // the glass fading in place around it
  // opened from a disc, turned twice, then closed: back on the wall in one
  // step, not back through the letters that were turned past
  { label: 'letter-turned-close', path: '/berkeley',
    acts: [['click', '.wl-mast-go'], ['wait', 3600], ['click', '.wl-cell[aria-label^="@ren.tanaka"] .wl-cell-disc'], ['wait', 1400],
           ['click', '.wl-turn.is-next'], ['wait', 900], ['click', '.wl-turn.is-next'], ['wait', 900], ['click', '.wl-close'], ['wait', 1600]], settle: 400 },
  { label: 'letter-close-disc', path: '/berkeley',
    acts: [['click', '.wl-mast-go'], ['wait', 3600], ['click', '.wl-cell[aria-label^="@ren.tanaka"] .wl-cell-disc'], ['wait', 1400], ['click', '.wl-close', null, 150]], settle: 0 },
  // a disc pressed on the wall: the letter's card opening out of it on the
  // frame of the press, caught mid flight, with the pulse leaving the disc
  // through the crowd under the glass
  { label: 'berkeley-tap',  path: '/berkeley',
    acts: [['click', '.wl-mast-go'], ['wait', 3600], ['click', '.wl-cell[aria-label^="@ren.tanaka"] .wl-cell-disc', null, 180]], settle: 0 },
  // "write", in the bar, pressed by a browser not through the gate: the gate,
  // with the composer set as where it opens onto
  { label: 'berkeley-write-gate', path: '/berkeley', open: false,
    acts: [['click', '.wl-mast-go'], ['wait', 3000], ['click', '.wl-write-act']], settle: 1200 },

  // ── the way back out of a process ──
  // Every sheet used to close to the WALL, whatever it had been opened from,
  // so "sign in" from the composer and then the close mark landed a person on
  // the field with the letter they were part way through gone from the screen.
  // Only the composer honoured the stack. These two shoot the frame AFTER the
  // close mark on a sheet that was opened from another sheet, so the shot is
  // the screen underneath or it is the bug: `write-gate-back` must be the
  // composer's door and not the wall, and `letter-report-back` must be the
  // letter and not the wall.
  { label: 'find-letter-back', path: '/berkeley/find',
    acts: [['wait', 700], ['click', '.wl-find-results .wl-row'], ['wait', 1200],
           ['click', '.wl-close'], ['wait', 1000]], settle: 600 },
  // and the case the two above do NOT cover: a browser that opened DIRECTLY on
  // a sheet, with nothing behind it in its own history. The close mark has to
  // land on the wall and the visitor has to still be in the product — an `up`
  // that reads depth instead of asking whether this shell pushed the entry
  // walks them off the site, back to whatever tab the link came from.
  { label: 'letter-close-out', path: '/berkeley/letter/pilar.echevarria',
    acts: [['wait', 900], ['click', '.wl-close'], ['wait', 1400]], settle: 600 },
  { label: 'letter-report-back', path: '/berkeley/letter/pilar.echevarria',
    acts: [['wait', 900], ['click', '.wl-letter-card .wl-sk.is-l'], ['wait', 600], ['click', '.wl-scr-menu li:nth-child(2)'], ['wait', 900],
           ['click', '.wl-close'], ['wait', 900]], settle: 600 },
  { label: 'letter-sealed', path: '/berkeley/letter/pilar.echevarria', open: false },
  // `write to` in the screen's options opens the composer on the name, and
  // the composer's mark comes back to the letter it was opened from
  // (index.jsx `up`)
  { label: 'letter-pen',    path: '/berkeley/letter/pilar.echevarria',
    acts: [['click', '.wl-letter-card .wl-sk.is-l'], ['wait', 500], ['click', '.wl-scr-menu li:nth-child(1)']], settle: 1400 },
  { label: 'letter-pen-back', path: '/berkeley/letter/pilar.echevarria',
    acts: [['click', '.wl-letter-card .wl-sk.is-l'], ['wait', 500], ['click', '.wl-scr-menu li:nth-child(1)'], ['wait', 1200], ['click', '.wl-write .wl-close'], ['wait', 900]], settle: 1200 },
  { label: 'write',         path: '/berkeley/write/sofiaaa.reyes' },
  // 0055: the first question with its two answers on one rail, the handle
  // on; then the other answer on, with a name that is not a first name in it
  { label: 'write-who',     path: '/berkeley/write', draft: null },
  { label: 'write-anything', path: '/berkeley/write', draft: null,
    acts: [['click', '.wl-seg-opt[data-value="name"]'], ['fill', '.wl-field input', 'the girl on the 51B']], settle: 900 },
  // the screen's `colour` key, pressed: the colours under the screen; then a
  // poster chosen, and the screen printed; then the copy
  { label: 'write-look',    path: '/berkeley/write/sofiaaa.reyes', press: '.wl-write-card .wl-sk.is-l', settle: 1200 },
  { label: 'write-look-poster', path: '/berkeley/write/sofiaaa.reyes',
    acts: [['click', '.wl-write-card .wl-sk.is-l'], ['wait', 400], ['click', '.wl-look-opt[data-value="teal"]']], settle: 1200 },
  { label: 'write-look-xerox', path: '/berkeley/write/sofiaaa.reyes',
    acts: [['click', '.wl-write-card .wl-sk.is-l'], ['wait', 400], ['click', '.wl-look-opt[data-value="xerox"]']], settle: 1200 },
  // the phone's caret (caret.jsx): after the last word, in the middle of a
  // word, where it is the letter after it struck out of a cell of its own,
  // and in an empty field, just before the hint, on the ping and on both
  // of the door's fields
  { label: 'caret-end',     path: '/berkeley/write/sofiaaa.reyes', acts: [['caret', '.wl-write-card textarea', -1]], settle: 150 },
  { label: 'caret-mid',     path: '/berkeley/write/sofiaaa.reyes', acts: [['caret', '.wl-write-card textarea', 9]], settle: 150 },
  { label: 'caret-empty',   path: '/berkeley/ping', acts: [['caret', '.wl-ping .wl-field input', 0]], settle: 150 },
  { label: 'caret-door',    path: '/gate', anon: true, acts: [['click', '[data-way="email"]'], ['caret', '.wl-addr-in', 0]], settle: 150 },
  { label: 'caret-door-ig', path: '/gate', anon: true, acts: [['click', '[data-way="instagram"]'], ['caret', '.wl-door .wl-field input', 0]], settle: 150 },
  // a letter to a name, read; and the same deck turned to the older letter
  // under the name, in the colour its own id picks
  { label: 'letter-name',   path: '/berkeley/letter/~sofia' },
  { label: 'letter-name-turned', path: '/berkeley/letter/~sofia', press: '.wl-turn.is-next', settle: 1200 },
  // a handle's letter, lit amber
  { label: 'letter-look',   path: '/berkeley/letter/ren.tanaka' },
  { label: 'letter-look-sealed', path: '/berkeley/letter/m.okonkwo', open: false },
  // the week spent: the act dark, and the one line the foot says about it
  { label: 'write-spent',   path: '/berkeley/write/sofiaaa.reyes', spent: true },
  { label: 'write-name',    path: '/berkeley/write', type: { into: ".wl-field input", text: 'pilar.echevarria' }, draft: null },
  // 0040: the names off the index under the field while a handle is still
  // being typed, and the search from its first character
  { label: 'write-suggest', path: '/berkeley/write', type: { into: ".wl-field input", text: 'a' }, draft: null },
  { label: 'find-typed',    path: '/berkeley/find', type: { into: ".wl-field input", text: 'a' } },
  { label: 'gate',          path: '/berkeley/gate', open: false },
  // the same address, through the door: the profile card
  { label: 'gate-in',       path: '/berkeley/gate' },
  { label: 'gate-in-more',  path: '/berkeley/gate', many: true },
  { label: 'report',        path: '/berkeley/report/11110111-2222-4333-8444-555566660000' },
  // and taken down: the box for why, with the caret before its example
  { label: 'report-why',    path: '/berkeley/report/11110111-2222-4333-8444-555566660000',
    acts: [['click', '.wl-foot .wl-pill.is-light'], ['caret', '.wl-reason textarea', 0]], settle: 150 },
  { label: 'remove',        path: '/berkeley/remove/ace03d' },
  { label: 'remove-code',   path: '/berkeley/remove/ace03d', verified: false, acts: [['click', '.wl-foot .wl-pill']] },
  { label: 'join',          path: '/berkeley/join?beat=4', settle: 5200 },
  // the letter caught at the keyboard: a street address in it, the button
  // pressed anyway, and the card shaking under the press with the line under
  // it saying what was caught (Write.jsx `shake`)
  { label: 'write-caught', path: '/berkeley/write/sofiaaa.reyes',
    body: 'you can find me most nights at 2650 durant ave if you ever want to talk.',
    acts: [['click', '.wl-write-foot .wl-pill.is-light', null, 240]], settle: 0 },
  // and the letter going up, from the wall: a name pressed, "write to" on
  // its letter, the letter sent, and the sheet gone, with the wall receiving
  // the name under it, the pulse out from its disc and the disc coming to
  // the light (Wall.jsx, the arrival; there is no screen between)
  { label: 'write-sent', path: '/berkeley',
    acts: [['click', '.wl-mast-go'], ['wait', 3600], ['click', '.wl-cell[aria-label^="@ren.tanaka"] .wl-cell-disc'], ['wait', 1400],
      ['click', '.wl-foot .wl-pill.is-light'], ['wait', 900], ['click', '.wl-write-foot .wl-pill.is-light', null, 1000]], settle: 0 },

  // ── the replies (0068) ──
  // The thread under an open letter, in every state it has: the first
  // screenful (the letter and the thread's head together), the thread
  // itself, nothing yet, the recipient's own view and their reply, shut and
  // put away, a device with no school, the link sent, the terms before a
  // first reply, a name caught at the keyboard, a reply held and one
  // refused, a report folded away, and the desk's queue.
  { label: 'replies',          path: '/letter/pilar.echevarria', thread: 'full', settle: 1800 },
  { label: 'replies-thread',   path: '/letter/pilar.echevarria', thread: 'full',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1200]], settle: 400 },
  { label: 'replies-bottom',   path: '/letter/pilar.echevarria', thread: 'full',
    acts: [['wait', 900], ['end', '.wl-sheet-wrap.is-letter']], settle: 600 },
  { label: 'replies-empty',    path: '/letter/pilar.echevarria', thread: 'empty',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-recipient', path: '/letter/pilar.echevarria', thread: 'recipient-new',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-recipient-thread', path: '/letter/pilar.echevarria', thread: 'recipient',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-locked',   path: '/letter/pilar.echevarria', thread: 'locked',
    acts: [['wait', 900], ['end', '.wl-sheet-wrap.is-letter']], settle: 600 },
  { label: 'replies-locked-owner', path: '/letter/pilar.echevarria', thread: 'locked-owner',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-closed',   path: '/letter/pilar.echevarria', thread: 'closed', settle: 1800 },
  { label: 'replies-closed-owner', path: '/letter/pilar.echevarria', thread: 'closed-owner',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-school',   path: '/letter/pilar.echevarria', thread: 'school',
    acts: [['wait', 900], ['end', '.wl-sheet-wrap.is-letter']], settle: 600 },
  { label: 'replies-school-sent', path: '/letter/pilar.echevarria', thread: 'empty-school',
    acts: [['wait', 900], ['fill', '.wl-rp-school .wl-addr-in', 'you@berkeley.edu'], ['click', '.wl-rp-school .wl-pill.is-light'],
           ['end', '.wl-sheet-wrap.is-letter']], settle: 600 },
  { label: 'replies-terms',    path: '/letter/pilar.echevarria', thread: 'terms',
    acts: [['wait', 900], ['end', '.wl-sheet-wrap.is-letter'], ['fill', '.wl-rp-field textarea', 'this made my whole week'],
           ['click', '.wl-rp-go']], settle: 700 },
  { label: 'replies-caught',   path: '/letter/pilar.echevarria', thread: 'full',
    acts: [['wait', 900], ['end', '.wl-sheet-wrap.is-letter'], ['fill', '.wl-rp-field textarea', 'i bet Maria Delgado wrote this']], settle: 500 },
  { label: 'replies-held',     path: '/letter/pilar.echevarria', thread: 'held',
    acts: [['wait', 900], ['end', '.wl-sheet-wrap.is-letter'], ['fill', '.wl-rp-field textarea', 'wait until they see this'],
           ['click', '.wl-rp-go']], settle: 900 },
  { label: 'replies-refused',  path: '/letter/pilar.echevarria', thread: 'full',
    acts: [['wait', 900], ['end', '.wl-sheet-wrap.is-letter'], ['fill', '.wl-rp-field textarea', 'refuse this one please'],
           ['click', '.wl-rp-go']], settle: 900 },
  { label: 'replies-reported', path: '/letter/pilar.echevarria', thread: 'full',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000], ['click', '.wl-rp-item:nth-child(2) .wl-rp-flag']], settle: 700 },
  // the recipient's reply lit in the letter's own colour, one of each kind
  { label: 'replies-rose',     path: '/letter/sofiaaa.reyes', thread: 'full',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-acid',     path: '/letter/thom.iversen', thread: 'full',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-lilac',    path: '/letter/jules.k', thread: 'full',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-negative', path: '/letter/dani.arroyo', thread: 'full',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-teal',     path: '/letter/elias.brandt', thread: 'full',
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 1000]], settle: 400 },
  { label: 'replies-still',    path: '/letter/pilar.echevarria', thread: 'full', still: true,
    acts: [['wait', 900], ['click', '.wl-rp-head-go', null, 400]], settle: 400 },
  { label: 'admin-replies',    path: '/admin', desk: true, click: 'replies' },

  // Phase 7. The desk, and the states worth looking at: what it opens on, the
  // queue with something held in it, a report whose letter is already down, the
  // cache with a stale face and a missing one, and the door.
  { label: 'admin',         path: '/admin', desk: true },
  { label: 'admin-people',  path: '/admin', desk: true, click: 'people' },
  { label: 'admin-wall',    path: '/admin', desk: true, click: 'wall' },
  { label: 'admin-reports', path: '/admin', desk: true, click: 'reports' },
  { label: 'admin-cache',   path: '/admin', desk: true, click: 'cache' },
  { label: 'admin-handles', path: '/admin', desk: true, click: 'handles' },
  // the second sitting (0039): the ledger, the doors, the switches, the guide
  { label: 'admin-pings',    path: '/admin', desk: true, click: 'pings' },
  { label: 'admin-access',   path: '/admin', desk: true, click: 'access' },
  { label: 'admin-settings', path: '/admin', desk: true, click: 'settings' },
  { label: 'admin-guide',    path: '/admin', desk: true, click: 'guide' },
  // 0047: the five printed cards, ordered by the one number that decides a
  // reprint, and the address that goes in each QR
  { label: 'admin-cards',    path: '/admin', desk: true, click: 'cards' },
  { label: 'admin-gate',    path: '/admin' },
  // 0060: the daily check on apify. Red on every screen while the last check
  // failed, amber while none has run for a day and a half or ever, and its
  // record on the resolver screen; `-armed` is the button between its two
  // presses, and `-ran` is the line gone once a check has passed.
  { label: 'admin-canary-failing', path: '/admin', desk: true, canary: 'failing' },
  { label: 'admin-canary-reports', path: '/admin', desk: true, canary: 'failing', click: 'reports' },
  { label: 'admin-canary-stale',   path: '/admin', desk: true, canary: 'stale' },
  { label: 'admin-canary-never',   path: '/admin', desk: true, canary: 'never' },
  { label: 'admin-canary-cache',   path: '/admin', desk: true, canary: 'failing', click: 'cache', full: true },
  { label: 'admin-canary-cache-ok', path: '/admin', desk: true, canary: 'ok', click: 'cache', full: true },
  { label: 'admin-canary-armed',   path: '/admin', desk: true, canary: 'failing',
    acts: [['click', '.ad-alarm .ad-btn']], settle: 400 },
  { label: 'admin-canary-ran',     path: '/admin', desk: true, canary: 'failing',
    acts: [['click', '.ad-alarm .ad-btn'], ['click', '.ad-alarm .ad-btn']], settle: 1600 },

  // Phase 8. The three addresses that arrive from outside the product, and the
  // one that arrives from a typo.
  { label: 'optout',        path: '/optout' },
  { label: 'copy',          path: '/copy#c=481920' },
  { label: 'signin',        path: '/signin' },
  { label: 'notfound',      path: '/nothing-here' },
]

// one label, or several separated by commas
const want = process.argv[2]
const wants = want ? want.split(',') : null
const list = wants ? ROUTES.filter((r) => wants.includes(r.label)) : ROUTES
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH
    || (process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
    || undefined,
})

const made = []
let bad = 0

for (const r of list) {
  OPEN = r.open !== false
  VERIFIED = r.verified !== false
  SLOW = r.slow === true
  NOTE = r.note || ''
  SPENT = r.spent === true
  DOWN = r.down === true
  MANY = r.many === true
  ANON = r.anon === true
  PASS = r.pass === true
  FULL = r.full === true
  GOOGLE = r.google === true
  THREAD = r.thread || 'empty'
  for (const v of VIEWPORTS) {
    // a check run on the last pass cleared the line; it is put back
    CANARY = r.canary || 'ok'
    // a letter sent on the last pass moved the index; it is put back
    INDEX.forEach((row, i) => { row.letters = COUNT_OF.get(row.target_handle) || 1; row.last_at = new Date(now - (i * 9 + 2) * 3600000).toISOString() })
    const page = await browser.newPage({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: v.scale,
      // a route marked `still` is shot under prefers-reduced-motion
      reducedMotion: r.still ? 'reduce' : 'no-preference',
    })
    const problems = []
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
    page.on('pageerror', (e) => problems.push(String(e)))
    await page.route('**/*', (route) => {
      const u = route.request().url()
      // /api/resolve is SAME ORIGIN by design: vercel.json rewrites it onto the
      // edge function so the resolver's device cookie is first party (Q8). That
      // means it has to be matched before the dev server's own assets are let
      // through, or it goes to a proxy with nothing behind it.
      if (u.includes('/api/resolve')) return fulfil(route)
      if (u.startsWith(BASE)) return route.continue()
      return fulfil(route)
    })

    // The wall's composer keeps a draft, in localStorage, so it is seeded
    // rather than typed; a route can bring its own words (`write-caught`).
    const DRAFT = r.draft === null
      ? null
      : { to: 'sofiaaa.reyes', body: r.body || 'you sat two rows ahead all semester and i never once said anything.' }
    // The desk holds its password in sessionStorage and the server re-checks it
    // on every call. Seeding it here is what puts the screenshot behind the
    // door rather than on it; `admin-gate` deliberately does not, because the
    // door is a surface too.
    if (r.desk) {
      await page.addInitScript(() => {
        try { sessionStorage.setItem('celestual:adminpw', 'preview') } catch { /* private mode */ }
      })
    }

    // The tab at the foot of the wall exists once this browser has put a
    // letter up, and `written` is the list of those letters' ids.
    const WRITTEN = r.tab ? ['11110111-2222-4333-8444-555566660000'] : []
    await page.addInitScript(({ DRAFT, VERIFIED, WRITTEN, ANON, GOOGLE }) => {
      try {
        localStorage.setItem('celestual.wall.v5', JSON.stringify({
          member: ANON || GOOGLE ? null : 'someone@berkeley.edu',
          reader: !ANON && !GOOGLE,
          verified: VERIFIED && !ANON && !GOOGLE ? ['ace03d'] : [],
          wroteTo: ['pilar.echevarria', 'jules.k', 'ren.tanaka'],
          written: WRITTEN,
          proof: 'a'.repeat(64),
          draft: DRAFT,
        }))
        localStorage.setItem('celestual.session.v1', 'b'.repeat(64))
        // The DM flow's own session (api/auth.js), which is what `heldProof`
        // reads on the sky and the reveal. Without it those two screens hold
        // a verified handle with no proof to spend, `celestual_my_pings` is
        // never asked, and the reveal draws "nothing here" over a fixture that
        // has a mutual in it.
        if (VERIFIED && !ANON) {
          localStorage.setItem('celestual:auth', JSON.stringify({
            verified: true, handle: 'ace03d', proof: 'a'.repeat(64), at: Date.now(),
          }))
        } else {
          localStorage.removeItem('celestual:auth')
        }
      } catch { /* private mode */ }
    }, { DRAFT, VERIFIED, WRITTEN, ANON, GOOGLE })
    // The letter's deck leans toward the next letter the first times a
    // device opens it (screens/Letter.jsx `nudge`), which would catch a shot
    // part way through. Every device here has turned it, but the one the
    // lean is shot on (`lean`).
    if (!r.lean) {
      await page.addInitScript(() => {
        try {
          const s = JSON.parse(localStorage.getItem('celestual.wall.v5') || '{}')
          localStorage.setItem('celestual.wall.v5', JSON.stringify({ ...s, turned: true }))
        } catch { /* private mode */ }
      })
    }

    await page.goto(BASE + r.path, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // The intro plays on every cold address but the reveal, and it is three
    // and a half seconds to a bare page now, longer than a route's settle.
    // So the shot waits for it to have gone, unless the route holds it on a
    // beat or a frame to be looked at (`?beat=`, `?t=`), where it never goes,
    // or on the last beat, which lifts it at once (`?beat=4`).
    if (!/[?&](beat|t)=/.test(r.path)) {
      await page.waitForFunction(() => !document.querySelector('.hi'), null, { timeout: 8000 }).catch(() => {})
    }

    // Some states only exist once somebody has typed: the result card is the
    // one spec section 5 calls the main affordance, and it does not draw until
    // a handle is in the field.
    if (r.type) {
      await page.waitForSelector(r.type.into, { timeout: 4000 }).catch(() => {})
      await page.fill(r.type.into, r.type.text).catch(() => {})
    }
    // The desk's sections, by the id on the button rather than by its words:
    // a section carrying a count renders that count inside the button, so its
    // accessible name is "the wall 1" and matching on "the wall" silently
    // clicks nothing. Every screenshot then shows the section it opened on.
    // A control on the screen, pressed, for the states that only exist behind
    // one: the sky's card is raised by tapping a row.
    if (r.press) {
      await page.waitForSelector(r.press, { timeout: 4000 }).catch(() => {})
      // `at` presses a point on the element, as a fraction of its box, for
      // the one control whose response depends on where it was touched
      const pos = r.at ? await page.$eval(r.press, (el, at) => {
        const b = el.getBoundingClientRect()
        return { x: b.width * at.x, y: b.height * at.y }
      }, r.at).catch(() => null) : null
      await page.click(r.press, { timeout: 4000, position: pos || undefined }).catch(() => {})
      await page.waitForTimeout(r.pressWait ?? 900)
    }
    if (r.click) {
      await page.click(`.ad-nav button[data-sec="${r.click}"]`, { timeout: 4000 }).catch(() => {})
      await page.waitForTimeout(900)
    }
    // A state several presses deep: fill, click and wait, in order, each on
    // whatever the last one drew.
    for (const [act, sel, arg, more] of r.acts || []) {
      if (act === 'wait') { await page.waitForTimeout(Number(sel) || 500); continue }
      // until the page says so, for a frame inside a movement nothing
      // pressed started: `sel` is the expression, `arg` how long to wait
      if (act === 'until') { await page.waitForFunction(sel, null, { timeout: Number(arg) || 6000 }).catch(() => {}); continue }
      // a control reached by the keyboard: focused, then a step back and
      // forward again with Tab, so the ring is the keyboard's and it shows,
      // which nothing else here reaches
      if (act === 'focus') {
        await page.waitForSelector(sel, { timeout: 4000 }).catch(() => {})
        await page.focus(sel).catch(() => {})
        await page.keyboard.press('Shift+Tab').catch(() => {})
        await page.keyboard.press('Tab').catch(() => {})
        await page.waitForTimeout(Number(more) || 400)
        continue
      }
      // the caret put in a field, `arg` characters in, or counted back from
      // the end when it is negative (-1 is after the last one). It blinks on
      // the phone's beat, so once it has been drawn its beat is held on the
      // lit half, and the shot is of the caret and not of the half it is out
      // a scroller taken to its foot, for the thread under a letter
      if (act === 'end') {
        await page.waitForSelector(sel, { timeout: 4000 }).catch(() => {})
        await page.$eval(sel, (el) => { el.scrollTop = el.scrollHeight }).catch(() => {})
        await page.waitForTimeout(Number(arg) || 500)
        continue
      }
      if (act === 'caret') {
        await page.waitForSelector(sel, { timeout: 4000 }).catch(() => {})
        await page.$eval(sel, (el, at) => {
          el.focus()
          const n = at < 0 ? el.value.length + at + 1 : at
          el.setSelectionRange(n, n)
        }, Number(arg) || 0).catch(() => {})
        await page.waitForTimeout(Number(more) || 160)
        await page.evaluate(() => {
          for (const a of document.getAnimations()) {
            if (String(a.animationName || '').startsWith('wl-caret')) { a.pause(); a.currentTime = 0 }
          }
        }).catch(() => {})
        continue
      }
      await page.waitForSelector(sel, { timeout: 4000 }).catch(() => {})
      if (act === 'fill') await page.fill(sel, arg).catch(() => {})
      // a click's fourth field, when it is a number, is how long to wait
      // after it instead of the beat below: the way to catch a frame in the
      // middle of a movement the click started
      // forced, because a disc on the wall never stands still and a click
      // that waits for a still target waits forever
      if (act === 'click') {
        await page.click(sel, { timeout: 4000, force: true }).catch(() => {})
        if (typeof more === 'number') { await page.waitForTimeout(more); continue }
      }
      // A finger across an element, as the pointer events a touch sends.
      // `arg` is how far, in pixels, and `more` of 'hold' leaves the finger
      // down so the frame in the middle of the gesture can be shot.
      if (act === 'swipe') {
        await page.evaluate(async ({ sel, dx, hold }) => {
          const el = document.querySelector(sel)
          if (!el) return
          const b = el.getBoundingClientRect()
          const x0 = b.left + b.width / 2, y0 = b.top + b.height / 2
          const ev = (type, x, y) => el.dispatchEvent(new PointerEvent(type, {
            bubbles: true, cancelable: true, composed: true,
            pointerId: 7, pointerType: 'touch', isPrimary: true,
            clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1,
          }))
          const frame = () => new Promise((r) => requestAnimationFrame(r))
          ev('pointerdown', x0, y0)
          const steps = 12
          for (let i = 1; i <= steps; i++) {
            await frame()
            ev('pointermove', x0 + (dx * i) / steps, y0)
          }
          if (!hold) { await frame(); ev('pointerup', x0 + dx, y0) }
        }, { sel, dx: Number(arg) || 0, hold: more === 'hold' }).catch(() => {})
      }
      // The same with the browser's own mouse, which the letter's deck takes
      // too: to the middle of the element, then pressed and drawn `arg`
      // pixels across. `more` of 'hold' keeps the button down, and 'hover'
      // only goes there.
      if (act === 'mouse') {
        const b = await page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }).catch(() => null)
        if (b) {
          await page.mouse.move(b.x, b.y, { steps: 4 })
          if (more !== 'hover') {
            const dx = Number(arg) || 0
            await page.mouse.down()
            await page.mouse.move(b.x + dx, b.y, { steps: 12 })
            if (more !== 'hold') await page.mouse.up()
          }
        }
      }
      await page.waitForTimeout(700)
    }
    await page.waitForTimeout(r.settle ?? 2600)
    // a pointer on the field, a little off the middle, so the lens has a
    // person under it and the crowd has parted round them
    if (r.hover) {
      await page.mouse.move(v.width / 2 + 30, v.height / 2 - 20, { steps: 10 })
      await page.waitForTimeout(1100)
    }
    // the foot of a page, for the one screen whose bottom edge is a join
    if (r.scroll === 'bottom') {
      await page.mouse.move(v.width / 2, v.height - 24)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(900)
    }

    // `PREVIEW_EVAL` is an expression asked of the page before the shot and
    // printed, for a question a picture cannot answer (a computed style)
    if (process.env.PREVIEW_EVAL) {
      console.log(`  ${r.label} ${v.name}:`, await page.evaluate(process.env.PREVIEW_EVAL).catch((e) => String(e)))
    }
    const file = join(out, `${r.label}-${v.name}.png`)
    // `PREVIEW_CLIP` shoots one element rather than the window, for a detail
    // that has to be looked at closely
    const clip = process.env.PREVIEW_CLIP ? await page.$(process.env.PREVIEW_CLIP) : null
    if (clip) await clip.screenshot({ path: file })
    else await page.screenshot({ path: file })
    made.push(file)
    if (r.full) {
      const whole = join(out, `${r.label}-${v.name}-full.png`)
      await page.screenshot({ path: whole, fullPage: true })
      made.push(whole)
    }

    if (problems.length) {
      bad += problems.length
      console.error(`  ${r.label} ${v.name}: ${problems.length} console error(s)`)
      for (const p of problems.slice(0, 4)) console.error(`    ${p}`)
    }
    await page.close()
  }
}

await browser.close()
console.log(made.join('\n'))
console.log(bad ? `\n${bad} console error(s)` : '\nno console errors')
