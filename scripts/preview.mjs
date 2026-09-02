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

  // Edge functions.
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
