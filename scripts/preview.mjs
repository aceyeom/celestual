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
const out = join(root, 'design/shots')
mkdirSync(out, { recursive: true })

const VIEWPORTS = [
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

const INDEX = HANDLES.map(([h], i) => ({
  target_handle: h,
  campus: 'berkeley',
  letters: COUNTS[i],
  last_at: new Date(now - (i * 9 + 2) * 3600000).toISOString(),
}))

const LINES = [
  'you gave me your umbrella outside wheeler and walked home in it. i still have it.',
  'i should have said something in march and i have thought about it every week since.',
  'you laughed at the thing nobody else laughed at and i have never forgotten it.',
  'i kept nearly saying something after class and then not saying it.',
]

function lettersFor(handle, open) {
  const n = COUNTS[HANDLES.findIndex(([h]) => h === handle)] || 1
  return Array.from({ length: n }, (_, i) => {
    const body = LINES[i % LINES.length]
    return {
      id: `1111${i}111-2222-4333-8444-55556666${String(i).padStart(4, '0')}`,
      handle,
      body: open ? body : null,
      words: body.split(/\s+/).length,
      chars: body.length,
      has_seal: i === 0,
      campus: 'berkeley',
      at: new Date(now - (i * 3 + 1) * DAY).toISOString(),
      expires: new Date(now + (27 - i) * DAY).toISOString(),
    }
  })
}

// Whether the fixture browser is through the campus gate and whether it holds a
// verified handle. Both flip per route, below.
let OPEN = true
let VERIFIED = true

function whoami() {
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
  { id: 'aaa11111-2222-4333-8444-555566660001', target_handle: 'sofiaaa.reyes',
    body: 'you sat two rows ahead all semester and i never once said anything.',
    sealed_line: 'it was the tuesday section.', status: 'pending',
    moderation: { verdict: 'review', reasons: ['names a place'], at: new Date(now - 2 * 3600000).toISOString(), model_layer: 2 },
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
    author_handle: null, letter_reports: 1 },
  { id: 'bbb11111-2222-4333-8444-555566660002', status: 'dismissed',
    reason: 'i think this is about somebody else with a similar name.',
    resolution: 'not the same person. put it back.',
    created_at: new Date(now - 4 * DAY).toISOString(), resolved_at: new Date(now - 4 * DAY + 3600000).toISOString(),
    reporter_id: DESK_USERS[0].id, reporter_handle: 'ace03d',
    letter_id: DESK_LETTERS[2].id, letter_status: 'live', letter_body: DESK_LETTERS[2].body,
    letter_target: 'pilar.echevarria', letter_campus: 'berkeley',
    letter_created_at: DESK_LETTERS[2].created_at, author_id: DESK_USERS[0].id,
    author_handle: 'ace03d', letter_reports: 1 },
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
    letters: 4, letters_live: 1, letters_pending: 1, letters_rejected: 1, letters_removed: 1,
    letters_7d: 2, claims: 3, asks_open: 1, revealed: 2, waitlist: 11, scans: 148,
    reports_open: 1, reports: 2,
    profiles: 9, profiles_faced: 7, profiles_stale: 3, searches_24h: 37,
    conflicts_open: 1,
  },
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

const DESK = {
  desk_overview: () => DESK_OVERVIEW,
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
  desk_letters: (b) => page(b.status ? DESK_LETTERS.filter((l) => l.status === b.status) : DESK_LETTERS),
  desk_reports: (b) => page(b.status ? DESK_REPORTS.filter((r) => r.status === b.status) : DESK_REPORTS),
  desk_waitlist: () => page(DESK_WAITLIST),
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
  wall_search: (b) => {
    const q = String(b.p_query || '').toLowerCase()
    return INDEX.filter((r) => r.target_handle.includes(q))
      .map((r) => ({ handle: r.target_handle, letters: r.letters, last_at: r.last_at, campus: 'berkeley' }))
  },
  wall_letters_for: (b) => ({
    ok: true, open: OPEN, handle: b.p_handle,
    letters: lettersFor(String(b.p_handle || '').replace(/^@/, ''), OPEN),
  }),
  wall_letter: () => ({
    ok: true, open: OPEN,
    letter: { ...lettersFor('pilar.echevarria', OPEN)[0], mine: VERIFIED },
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
      },
      {
        handle: 'sofiaaa.reyes',
        time: now - 6 * DAY,
        expires_at: new Date(now + 54 * DAY).toISOString(),
        mutual: false,
        card: { words: 'you sat two rows ahead all semester.' },
      },
    ],
  }),
}

async function fulfil(route) {
  const req = route.request()
  const url = req.url()

  // The resolver, through the first party rewrite.
  if (url.includes('/api/resolve')) {
    const h = String(JSON.parse(req.postData() || '{}').handle || '').toLowerCase()
    const row = HANDLES.find(([x]) => x === h)
    if (!row) return route.fulfill({ json: { ok: true, found: false, handle: h } })
    return route.fulfill({
      json: {
        ok: true, found: true, handle: row[0], display_name: row[1], is_verified: row[2],
        // No avatar. Spec section 5: a failed download stores nothing and the
        // card falls back to a monogram, and this is the state most worth
        // looking at because it is the one that can look broken.
        avatar: '', cached: true,
      },
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

  // Every other edge function.
  if (url.includes('/functions/v1/')) {
    return route.fulfill({ json: { ok: true } })
  }

  return route.fulfill({ status: 404, body: '' })
}

// ── the routes ──────────────────────────────────────────────────────────────
// Every route docs/plan.md puts in Phase 6b's scope, plus the states of them
// that only exist behind a gate.
const ROUTES = [
  { label: 'hero',          path: '/' },
  { label: 'place',         path: '/place' },
  { label: 'place-card',    path: '/place', type: { into: ".wl-field input", text: 'jules.k' } },
  { label: 'place-named',   path: '/@pilar.echevarria' },
  { label: 'sky',           path: '/sky' },
  { label: 'reveal',        path: '/reveal/jules.k' },
  { label: 'berkeley',      path: '/berkeley' },
  { label: 'find',          path: '/berkeley/find' },
  { label: 'letter',        path: '/berkeley/letter/pilar.echevarria' },
  { label: 'letter-sealed', path: '/berkeley/letter/pilar.echevarria', open: false },
  { label: 'write',         path: '/berkeley/write/sofiaaa.reyes' },
  { label: 'write-name',    path: '/berkeley/write', type: { into: ".wl-field input", text: 'pilar.echevarria' }, draft: null },
  { label: 'gate',          path: '/berkeley/gate', open: false },
  { label: 'report',        path: '/berkeley/report/11110111-2222-4333-8444-555566660000' },
  { label: 'remove',        path: '/berkeley/remove/ace03d' },
  { label: 'join',          path: '/berkeley/join' },
  { label: 'posted',        path: '/berkeley/posted' },

  // Phase 7. The desk, and the states worth looking at: what it opens on, the
  // queue with something held in it, a report whose letter is already down, the
  // cache with a stale face and a missing one, and the door.
  { label: 'admin',         path: '/admin', desk: true },
  { label: 'admin-people',  path: '/admin', desk: true, click: 'people' },
  { label: 'admin-wall',    path: '/admin', desk: true, click: 'wall' },
  { label: 'admin-reports', path: '/admin', desk: true, click: 'reports' },
  { label: 'admin-cache',   path: '/admin', desk: true, click: 'cache' },
  { label: 'admin-handles', path: '/admin', desk: true, click: 'handles' },
  { label: 'admin-gate',    path: '/admin' },

  // Phase 8. The three addresses that arrive from outside the product, and the
  // one that arrives from a typo.
  { label: 'optout',        path: '/optout' },
  { label: 'copy',          path: '/copy#c=481920' },
  { label: 'signin',        path: '/signin' },
  { label: 'notfound',      path: '/nothing-here' },
]

const want = process.argv[2]
const list = want ? ROUTES.filter((r) => r.label === want) : ROUTES
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
  for (const v of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: v.width, height: v.height },
      deviceScaleFactor: v.scale,
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
      if (u.startsWith('http://localhost:5173')) return route.continue()
      return fulfil(route)
    })

    // The wall's composer keeps a draft, and the posted screen reads one. Both
    // are localStorage, so they are seeded rather than clicked through.
    const DRAFT = r.draft === null
      ? null
      : { to: 'sofiaaa.reyes', body: 'you sat two rows ahead all semester and i never once said anything.' }
    // The desk holds its password in sessionStorage and the server re-checks it
    // on every call. Seeding it here is what puts the screenshot behind the
    // door rather than on it; `admin-gate` deliberately does not, because the
    // door is a surface too.
    if (r.desk) {
      await page.addInitScript(() => {
        try { sessionStorage.setItem('celestual:adminpw', 'preview') } catch { /* private mode */ }
      })
    }

    await page.addInitScript((DRAFT) => {
      try {
        localStorage.setItem('celestual.wall.v5', JSON.stringify({
          member: 'someone@berkeley.edu',
          verified: ['ace03d'],
          wroteTo: ['pilar.echevarria', 'jules.k', 'ren.tanaka'],
          written: [],
          proof: 'a'.repeat(64),
          draft: DRAFT,
        }))
        localStorage.setItem('celestual.session.v1', 'b'.repeat(64))
      } catch { /* private mode */ }
    }, DRAFT)

    await page.goto('http://localhost:5173' + r.path, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

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
    if (r.click) {
      await page.click(`.ad-nav button[data-sec="${r.click}"]`, { timeout: 4000 }).catch(() => {})
      await page.waitForTimeout(900)
    }
    await page.waitForTimeout(2600)

    const file = join(out, `${r.label}-${v.name}.png`)
    await page.screenshot({ path: file })
    made.push(`design/shots/${r.label}-${v.name}.png`)

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
