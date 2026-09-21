#!/usr/bin/env node
// shots-composer.mjs — the composer's first question, in every state it has.
//
// `npm run shots` cannot reach this screen. /berkeley/write is behind the
// campus address (wall/auth.js `isMember`), and the states worth looking at
// are the ones a live resolver decides: a handle that was found, a handle
// that was not, and the seconds while Apify is being asked. So this drives it
// directly — a member in localStorage, /api/resolve answered here, and one
// screenshot per state at both viewports of rebuild-spec 7.3.
//
//   npm run shots:composer                 into design/shots/who
//   npm run shots:composer some/other/dir
//
// Both passes of 7.2: the second one is under prefers-reduced-motion, where
// nothing travels and the words under the field are the whole account of a
// wait.
//
// It needs the dev server up (`npm run dev`, or DEV_URL), and it needs
// VITE_HANDLE_RESOLVE=1 in app/.env.local — with the resolver off there is no
// answer to draw and the composer walks straight past the question.
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2] || join(root, 'design/shots/who')
mkdirSync(out, { recursive: true })
const base = process.env.DEV_URL || 'http://localhost:5173'

const FOUND = {
  ok: true, found: true, handle: 'sofiaruiz', display_name: 'Sofia Ruiz',
  is_verified: true, avatar: '',
}

// Which Chromium to drive, on the same rule as scripts/shots.mjs: Playwright's
// own by default, the image's where one is already installed.
function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (dir && existsSync(join(dir, 'chromium'))) return join(dir, 'chromium')
  return undefined
}

const browser = await chromium.launch({ executablePath: chromiumPath() })

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, scale: 3 },
  { name: 'desk', width: 1440, height: 900, scale: 2 },
]

const PASSES = [{ suffix: '', motion: 'no-preference' }, { suffix: '-still', motion: 'reduce' }]

for (const pass of PASSES) {
for (const v of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.scale,
    reducedMotion: pass.motion,
  })
  // a member, so the composer opens rather than the door
  await ctx.addInitScript(() => {
    localStorage.setItem('celestual.wall.v5', JSON.stringify({
      member: 'someone@berkeley.edu', reader: true, seen: true, source: 'direct',
    }))
  })
  // the resolver, answered here: a found account on commit, nothing on a peek
  await ctx.route('**/api/resolve', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    if (body.peek) return route.fulfill({ json: { results: {} } })
    await new Promise((r) => setTimeout(r, slow ? 3000 : 40))
    if (body.handle !== 'sofiaruiz') return route.fulfill({ json: { ok: true, found: false } })
    return route.fulfill({ json: FOUND })
  })
  // nothing else reaches a server in this shot
  await ctx.route('**/*.supabase.co/**', (route) => route.fulfill({ json: {} }))

  let slow = false
  const page = await ctx.newPage()
  const problems = []
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  page.on('pageerror', (e) => problems.push(String(e)))

  await page.goto(`${base}/berkeley/write`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(1400)

  const shot = async (name) => {
    await page.screenshot({ path: join(out, `${name}-${v.name}${pass.suffix}.png`) })
    console.log(`${name}-${v.name}${pass.suffix}.png`)
  }

  // 1. empty, on the handle
  await shot('1-empty')

  // 2. a handle typed
  await page.fill('.wl-write-step input', 'sofiaruiz')
  await page.waitForTimeout(700)
  await shot('2-typed')

  // 3. the lookup, out: the light travels the field's own rule
  slow = true
  await page.click('.wl-write-foot .wl-pill')
  await page.waitForTimeout(900)
  await shot('3-looking')

  // 4. the answer, in the field's place
  await page.waitForTimeout(2600)
  await shot('4-resolved')

  // 5. no account by that name, in the same place
  slow = false
  await page.click('.wl-settled-clear')
  await page.waitForTimeout(500)
  await page.fill('.wl-write-step input', 'nobodyhere')
  await page.waitForTimeout(600)
  await page.click('.wl-write-foot .wl-pill')
  await page.waitForTimeout(900)
  await shot('5-missing')

  // 6. the other answer: anything else
  await page.click('[data-value="name"]')
  await page.waitForTimeout(700)
  await page.fill('.wl-write-step input', 'the girl on the 51B')
  await page.waitForTimeout(600)
  await shot('6-name')

  // 7. the letter, and the look panel's rail, which wears the same tabs
  await page.click('.wl-write-foot .wl-pill')
  await page.waitForTimeout(700)
  await page.fill('.wl-write-card textarea', 'You gave me your umbrella outside Wheeler and walked home in it. I still have it.')
  await page.waitForTimeout(500)
  await page.click('.wl-pen')
  await page.waitForTimeout(900)
  await shot('7-look')

  if (problems.length) {
    console.error(`  ${v.name}${pass.suffix}: ${problems.length} console error(s)`)
    for (const p of problems.slice(0, 6)) console.error(`    ${p}`)
  }
  await ctx.close()
}
}

await browser.close()
