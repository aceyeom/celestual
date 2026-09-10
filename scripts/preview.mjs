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
      // 0042: how many hearted it, and whether this browser did
      hearts: i === 0 ? 3 : i === 1 ? 1 : 0,
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

// A face, for the two handles that have one in the fixture. A flat swatch
// rather than a photograph, because a fixture face only has to prove the disc
// draws an image over its monogram; the monogram state is the other half and
// every other handle here is drawn in it.
const swatch = (a, b) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="31" r="13" fill="rgba(255,255,255,0.55)"/><ellipse cx="40" cy="66" rx="22" ry="16" fill="rgba(255,255,255,0.5)"/></svg>`,
)}`
const FACES = { 'jules.k': swatch('#5a6b8a', '#2b3550'), 'pilar.echevarria': swatch('#8a6a5a', '#4a3028') }
for (const r of INDEX) if (FACES[r.target_handle]) r.avatar_path = `ig/${r.target_handle}.jpg`

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
    letters: 4, letters_live: 1, letters_pending: 1, letters_rejected: 1, letters_removed: 1,
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
  wall_quota: () => ({
    ok: true, signed_in: true, limit: 3, used: SPENT ? 3 : 2, left: SPENT ? 0 : 1,
    resets_at: new Date(now + 4 * DAY).toISOString(),
  }),
  // 0040: from the first character, exact then prefix then contains, with the
  // resolver's answer joined on for the names the fixture resolver knows.
  wall_search: (b) => {
    const q = String(b.p_query || '').toLowerCase().replace(/^@/, '')
    if (!q) return []
    const rank = (h) => (h === q ? 0 : h.startsWith(q) ? 1 : 2)
    return INDEX.filter((r) => r.target_handle.includes(q))
      .sort((a, c) => rank(a.target_handle) - rank(c.target_handle) || c.letters - a.letters)
      .slice(0, 12)
      .map((r) => {
        const row = HANDLES.find(([x]) => x === r.target_handle)
        return {
          handle: r.target_handle, letters: r.letters, last_at: r.last_at, campus: 'berkeley',
          known: !!row, display_name: row ? row[1] : null, is_verified: row ? !!row[2] : false,
          avatar_path: row && FACES[r.target_handle] ? `ig/${r.target_handle}.jpg` : null,
        }
      })
  },
  // The DM code flow (0004, 0012, 0041). A code is minted at once, and the
  // poll answers pending for as long as the screenshot takes, carrying
  // whatever note the route asked for.
  celestual_start_ig_verification: () => ({
    ok: true, token: '1283', expires_at: new Date(now + 30 * 60000).toISOString(),
  }),
  celestual_poll_ig_verification: () => ({ status: 'pending', handle: null, note: NOTE || null }),
  // The front door's notice reads this.
  wall_pulse: () => ({
    ok: true, campus: 'berkeley', name: 'UC Berkeley', open: true,
    names: INDEX.length, letters: INDEX.reduce((n, r) => n + r.letters, 0),
    last_at: INDEX[0] ? INDEX[0].last_at : null,
  }),
  wall_letters_for: (b) => ({
    ok: true, open: OPEN, handle: b.p_handle,
    letters: lettersFor(String(b.p_handle || '').replace(/^@/, ''), OPEN),
    ...faceOf(String(b.p_handle || '').replace(/^@/, '')),
  }),
  wall_letter: () => ({
    ok: true, open: OPEN,
    letter: { ...lettersFor('pilar.echevarria', OPEN)[0], mine: VERIFIED },
    ...faceOf('pilar.echevarria'),
  }),
  // 0042: a heart on, or off, and the count back
  wall_heart: (b) => ({ ok: true, letter: b.p_letter, hearts: b.p_on ? 4 : 3, hearted: !!b.p_on }),
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
          ? { ok: true, found: true, handle: row[0], display_name: row[1], is_verified: row[2], avatar: FACES[row[0]] || '', cached: true }
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
        avatar: FACES[row[0]] || '', cached: true,
      },
    })
    if (SLOW) { setTimeout(answer, 15000); return undefined }
    return answer()
  }

  // A stored face off the public bucket, by the path the search carries: the
  // fixture's swatch for the two handles that have one, and a 404 for the
  // rest, which draws the monogram under it.
  const face = url.match(/\/storage\/v1\/object\/public\/avatars\/ig\/([a-z0-9._]+)\.jpg/)
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
  // The intro, held on its assembled beat: the liquid mark and the name.
  { label: 'intro',         path: '/?beat=3' },
  // The hero scrolls: it is a page with three sections rather than one
  // composition, so it is shot whole as well as at the fold. Without the intro
  // in front of it, which has its own frame above.
  { label: 'hero',          path: '/?nointro=1' },
  // The front door with a handle in it: the card that pops up under the field,
  // once with the answer and once while the resolver is still out, which is
  // the state the light was drawn for.
  { label: 'hero-card',     path: '/?nointro=1', type: { into: '.wl-field input', text: 'jules.k' } },
  { label: 'hero-looking',  path: '/?nointro=1', type: { into: '.wl-field input', text: 'jules.k' }, slow: true, press: '.hm-ask-row .wl-pill' },
  { label: 'place',         path: '/place' },
  { label: 'place-card',    path: '/place', type: { into: ".wl-field input", text: 'jules.k' } },
  { label: 'place-named',   path: '/@pilar.echevarria' },
  // the third step, the envelope: asked of a browser that knows nobody, and
  // shown to one that has already proved
  { label: 'place-you',       path: '/@pilar.echevarria', type: { into: 'textarea', text: 'i have wanted to say this since the second week of term.' }, press: '.mn-foot .wl-pill', verified: false },
  { label: 'place-you-known', path: '/@pilar.echevarria', type: { into: 'textarea', text: 'i have wanted to say this since the second week of term.' }, press: '.mn-foot .wl-pill' },
  // The code, out: the FROM row says proving and the foot is the code. And
  // the same screen once a DM with the wrong digits has arrived (0041).
  { label: 'place-code',      path: '/@pilar.echevarria', verified: false,
    acts: [['fill', 'textarea', 'i have wanted to say this since the second week of term.'], ['click', '.mn-foot .wl-pill'],
           ['fill', '.mn-mail-field input', 'ace03d'], ['click', '.mn-foot .wl-pill']] },
  { label: 'place-code-note', path: '/@pilar.echevarria', verified: false, note: 'wrong_code',
    acts: [['fill', 'textarea', 'i have wanted to say this since the second week of term.'], ['click', '.mn-foot .wl-pill'],
           ['fill', '.mn-mail-field input', 'ace03d'], ['click', '.mn-foot .wl-pill'], ['wait', 3200]] },
  { label: 'sky',           path: '/sky' },
  // A standing ping, opened: the card, and the two things you can do to it.
  { label: 'sky-card',      path: '/sky', press: '.mn-list .wl-row' },
  // The sky before a handle is proved on this device: where the front door's
  // "sign in" lands, and the screen that asks the question.
  { label: 'sky-prove',     path: '/sky', verified: false },
  { label: 'sky-prove-code', path: '/sky', verified: false,
    acts: [['fill', '.wl-field input', 'ace03d'], ['click', '.mn-mid .wl-pill.is-light']] },
  { label: 'reveal',        path: '/reveal/jules.k' },
  // the veil over the field, with the flaps rolled into place (art.jsx
  // Flap), so the wall is shot once they have landed; then the field with
  // the veil lifted, once the lens has bloomed and the walk has taken its
  // first step and come to rest on a person
  { label: 'berkeley',        path: '/berkeley', settle: 6000 },
  // the veil opening from the tap, held at four tenths of its reach
  // (Wall.jsx `heldRipple`): the circle, the ring on its edge, and the type
  // going where the edge has reached it. A capture takes longer than the
  // ripple's middle lasts, so the frame is held rather than caught.
  { label: 'berkeley-ripple', path: '/berkeley?rp=0.42', press: '.wl-veil-scrim', at: { x: 0.62, y: 0.58 }, settle: 900 },
  { label: 'berkeley-lifted', path: '/berkeley', press: '.wl-mast-go', settle: 5200 },
  // the field under a mouse: the disc the pointer is on, lifted and named,
  // and the crowd parted round it. The one state of the wall that only a
  // pointer can draw, and the one that used to draw a frame round the name.
  { label: 'berkeley-hover',  path: '/berkeley', press: '.wl-mast-go', settle: 4200, hover: true },
  // the foot of the site, where the wall's own gradient runs out into it
  { label: 'berkeley-foot',   path: '/berkeley', press: '.wl-mast-go', settle: 4200, scroll: 'bottom' },
  { label: 'berkeley-tab',    path: '/berkeley', tab: true, press: '.wl-mast-go', settle: 5200 },
  // the same two under prefers-reduced-motion (rebuild-spec 7.2): the veil
  // composed with nothing arriving, and the field still, with the lens on
  { label: 'berkeley-still',        path: '/berkeley', still: true, settle: 1200 },
  { label: 'berkeley-lifted-still', path: '/berkeley', still: true, press: '.wl-mast-go', settle: 1200 },
  { label: 'find',          path: '/berkeley/find' },
  { label: 'letter',        path: '/berkeley/letter/pilar.echevarria' },
  // the stack, turned once: the second letter under the name, in from the right
  { label: 'letter-turned', path: '/berkeley/letter/pilar.echevarria', press: '.wl-turn.is-next', settle: 1200 },
  { label: 'letter-sealed', path: '/berkeley/letter/pilar.echevarria', open: false },
  { label: 'letter-flag',   path: '/berkeley/letter/pilar.echevarria', press: '.wl-flag' },
  { label: 'write',         path: '/berkeley/write/sofiaaa.reyes' },
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
  { label: 'report',        path: '/berkeley/report/11110111-2222-4333-8444-555566660000' },
  { label: 'remove',        path: '/berkeley/remove/ace03d' },
  { label: 'remove-code',   path: '/berkeley/remove/ace03d', verified: false, acts: [['click', '.wl-foot .wl-pill']] },
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
  // the second sitting (0039): the ledger, the doors, the switches, the guide
  { label: 'admin-pings',    path: '/admin', desk: true, click: 'pings' },
  { label: 'admin-access',   path: '/admin', desk: true, click: 'access' },
  { label: 'admin-settings', path: '/admin', desk: true, click: 'settings' },
  { label: 'admin-guide',    path: '/admin', desk: true, click: 'guide' },
  // 0047: the five printed cards, ordered by the one number that decides a
  // reprint, and the address that goes in each QR
  { label: 'admin-cards',    path: '/admin', desk: true, click: 'cards' },
  { label: 'admin-gate',    path: '/admin' },

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
  for (const v of VIEWPORTS) {
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

    // The tab at the foot of the wall exists once this browser has put a
    // letter up, and `written` is the list of those letters' ids.
    const WRITTEN = r.tab ? ['11110111-2222-4333-8444-555566660000'] : []
    await page.addInitScript(({ DRAFT, VERIFIED, WRITTEN }) => {
      try {
        localStorage.setItem('celestual.wall.v5', JSON.stringify({
          member: 'someone@berkeley.edu',
          verified: VERIFIED ? ['ace03d'] : [],
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
        if (VERIFIED) {
          localStorage.setItem('celestual:auth', JSON.stringify({
            verified: true, handle: 'ace03d', proof: 'a'.repeat(64), at: Date.now(),
          }))
        } else {
          localStorage.removeItem('celestual:auth')
        }
      } catch { /* private mode */ }
    }, { DRAFT, VERIFIED, WRITTEN })

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
    for (const [act, sel, arg] of r.acts || []) {
      if (act === 'wait') { await page.waitForTimeout(Number(sel) || 500); continue }
      await page.waitForSelector(sel, { timeout: 4000 }).catch(() => {})
      if (act === 'fill') await page.fill(sel, arg).catch(() => {})
      if (act === 'click') await page.click(sel, { timeout: 4000 }).catch(() => {})
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

    const file = join(out, `${r.label}-${v.name}.png`)
    await page.screenshot({ path: file })
    made.push(`design/shots/${r.label}-${v.name}.png`)
    if (r.full) {
      const whole = join(out, `${r.label}-${v.name}-full.png`)
      await page.screenshot({ path: whole, fullPage: true })
      made.push(`design/shots/${r.label}-${v.name}-full.png`)
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
