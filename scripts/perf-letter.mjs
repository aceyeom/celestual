#!/usr/bin/env node
// perf-letter.mjs: how smooth a letter is, counted in frames, with data in it.
//
// The owner's word for it was lag: a glitch whenever a letter is swiped or
// opened. This is that, measured, the way a phone would feel it. The wall is
// opened on a phone's window (390 by 844 at three pixels to the point, with
// touch) with the processor slowed four times, a letter is opened off a disc
// with a finger, turned by the hand three times, turned by the arrow keys in
// quick succession, turned onto the next name, closed, and then a letter's
// replies are raised by its key and laid down by the grip of the sheet they
// stand on (the key is under the sheet by then, as a thumb would find it).
// Each of those is watched frame by frame
// (a frame loop in the page, and the long tasks the page reports), and the
// numbers are the frames that came late, how late the worst one was, and
// the tasks that held the page for more than fifty milliseconds. A swipe's
// frames while the finger is down are counted apart, since those are the
// ones a hand feels.
//
//   node scripts/perf-letter.mjs                     every moment, on a phone
//   node scripts/perf-letter.mjs swipe,keys          some of them
//   PERF_MODE=desk node scripts/perf-letter.mjs      a wide room, at full speed
//   PERF_RUNS=3 node scripts/perf-letter.mjs         the middle of three runs
//   PERF_TRACE=1 node scripts/perf-letter.mjs        and where the time went
//
// DEV_URL is the server to measure, as the other scripts read it. Measure a
// production build (`vite build`, then `vite preview`) and not the dev
// server: React's development build costs several times what it ships at,
// and it is the shipped one a phone runs.
//
// The data is scripts/preview.mjs's: the half of that file before its
// routes (the fixtures, and what answers every request) is read and run with
// the measurement below after it, so the two can never disagree about what
// is on the wall. Nothing here ships.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// the measurement, run inside the fixtures' module (it reads their names:
// `fulfil`, `INDEX`, `COUNT_OF`, `THREAD`, `BASE`, `now`, `chromium`)
async function measurement() {
  const MODE = process.env.PERF_MODE || 'phone'
  const RUNS = Number(process.env.PERF_RUNS || 1)
  const THROTTLE = Number(process.env.PERF_THROTTLE || (MODE === 'phone' ? 4 : 1))
  const ONLY = process.argv[2] ? process.argv[2].split(',') : null
  const TRACE = !!process.env.PERF_TRACE
  const want = (k) => !ONLY || ONLY.includes(k)
  const V = MODE === 'phone'
    ? { width: 390, height: 844, scale: 3, touch: true }
    : { width: 1440, height: 900, scale: 1, touch: false }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH
      || (process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
      || undefined,
  })

  // in the page: a frame loop that runs only while it is asked to, the long
  // tasks, and marks for when a finger went down and came up
  const init = () => {
    const P = window.__perf = { frames: [], long: [], marks: [], rec: false, t0: 0 }
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (P.rec) P.long.push(Math.round(e.duration))
      }).observe({ type: 'longtask' })
    } catch { /* a browser without them */ }
    const loop = (t) => { if (!P.rec) return; P.frames.push(t); requestAnimationFrame(loop) }
    P.start = () => { P.frames = []; P.long = []; P.marks = []; P.rec = true; P.t0 = performance.now(); requestAnimationFrame(loop) }
    P.mark = (m) => { if (P.rec) P.marks.push([m, performance.now()]) }
    P.stop = () => { P.rec = false; return { frames: P.frames, long: P.long, marks: P.marks } }
  }

  // late frames: a frame that took more than 20ms missed the next, and each
  // whole frame it ran over by is one dropped
  const stats = (fr, inside = () => true) => {
    let n = 0, late = 0, dropped = 0, worst = 0
    for (let i = 1; i < fr.length; i++) {
      if (!inside(fr[i])) continue
      const dt = fr[i] - fr[i - 1]
      n++
      if (dt > 20) late++
      dropped += Math.max(0, Math.round(dt / 16.667) - 1)
      worst = Math.max(worst, dt)
    }
    return { frames: n, late, dropped, worst: Math.round(worst) }
  }

  // where the time went on the page's main thread, off a Chrome trace
  const summarise = (buf) => {
    const ev = JSON.parse(buf.toString()).traceEvents
    const names = new Map()
    for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') names.set(`${e.pid}:${e.tid}`, e.args.name)
    const busy = new Map()
    for (const e of ev) {
      const k = `${e.pid}:${e.tid}`
      if (names.get(k) === 'CrRendererMain' && e.ph === 'X') busy.set(k, (busy.get(k) || 0) + (e.dur || 0))
    }
    const main = [...busy].sort((a, b) => b[1] - a[1])[0]?.[0]
    const sum = {}
    const add = (k, v) => { sum[k] = (sum[k] || 0) + v }
    for (const e of ev) {
      if (e.ph !== 'X' || !e.dur) continue
      if (`${e.pid}:${e.tid}` === main) {
        if (e.name === 'UpdateLayoutTree') add('style', e.dur)
        else if (e.name === 'Layout') add('layout', e.dur)
        else if (e.name === 'Paint' || e.name === 'PrePaint') add('paint', e.dur)
        else if (e.name === 'Layerize' || e.name === 'Commit') add('composite', e.dur)
        else if (e.name === 'FunctionCall' || e.name === 'EventDispatch' || e.name === 'FireAnimationFrame') add('script', e.dur)
        else if (/^(MinorGC|MajorGC)$/.test(e.name)) add('gc', e.dur)
      } else if (e.name === 'RasterTask') add('raster', e.dur)
    }
    return Object.entries(sum).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v / 1000)}ms`).join(', ')
  }

  const open = async (path, thread = 'empty') => {
    THREAD = thread
    INDEX.forEach((row, i) => { row.letters = COUNT_OF.get(row.target_handle) || 1; row.last_at = new Date(now - (i * 9 + 2) * 3600000).toISOString() })
    const ctx = await browser.newContext({
      viewport: { width: V.width, height: V.height }, deviceScaleFactor: V.scale, hasTouch: V.touch, isMobile: V.touch,
    })
    const page = await ctx.newPage()
    await page.route('**/*', (route) => {
      const u = route.request().url()
      if (u.includes('/api/resolve')) return fulfil(route)
      if (u.startsWith(BASE)) return route.continue()
      return fulfil(route)
    })
    // a reader who has turned the deck before, so the lean is not in it
    await page.addInitScript(() => {
      try {
        localStorage.setItem('celestual.wall.v5', JSON.stringify({
          member: 'someone@berkeley.edu', reader: true, verified: ['ace03d'], wroteTo: [], written: [],
          proof: 'a'.repeat(64), turned: true,
        }))
        localStorage.setItem('celestual.session.v1', 'b'.repeat(64))
      } catch { /* private mode */ }
    })
    await page.addInitScript(init)
    const cdp = await ctx.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
    await page.goto(BASE + path, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => !document.querySelector('.hi'), null, { timeout: 12000 }).catch(() => {})
    return { ctx, page, cdp }
  }

  // a finger, as the touch events a phone sends, or the mouse in a wide room
  const at = (page, sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  const tap = async (page, cdp, sel) => {
    const b = await at(page, sel)
    if (!V.touch) { await page.mouse.click(b.x, b.y); return }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y, id: 2 }] })
    await wait(40)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const swipe = async (page, cdp, dx) => {
    const b = await at(page, '.wl-letter-card')
    await page.evaluate(() => window.__perf.mark('down'))
    if (!V.touch) {
      await page.mouse.move(b.x, b.y)
      await page.mouse.down()
      for (let i = 1; i <= 14; i++) { await page.mouse.move(b.x + (dx * i) / 14, b.y); await wait(16) }
      await page.mouse.up()
    } else {
      const pt = (x) => [{ x, y: b.y, id: 1, radiusX: 8, radiusY: 8, force: 1 }]
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(b.x) })
      for (let i = 1; i <= 14; i++) {
        await wait(16)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(b.x + (dx * i) / 14) })
      }
      await wait(16)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await page.evaluate(() => window.__perf.mark('lift'))
  }

  const rows = {}
  const watch = async (page, label, fn) => {
    if (!want(label)) { await fn(); return }
    if (TRACE) await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] })
    await page.evaluate(() => window.__perf.start())
    await fn()
    const r = await page.evaluate(() => window.__perf.stop())
    const all = stats(r.frames)
    const downs = r.marks.filter((m) => m[0] === 'down').map((m) => m[1])
    const lifts = r.marks.filter((m) => m[0] === 'lift').map((m) => m[1])
    const hand = downs.length ? stats(r.frames, (t) => downs.some((d, k) => t > d && t <= (lifts[k] ?? Infinity))) : null
    const row = { ...all, long: r.long.length, longest: Math.max(0, ...r.long), hand, where: TRACE ? summarise(await browser.stopTracing()) : '' }
    ;(rows[label] = rows[label] || []).push(row)
  }

  for (let run = 0; run < RUNS; run++) {
    if (['open', 'swipe', 'keys', 'name', 'close'].some(want)) {
      const { ctx, page, cdp } = await open('/berkeley')
      await page.click('.wl-mast-go', { force: true, timeout: 4000 }).catch(() => {})
      await wait(3800)
      await watch(page, 'open', async () => { await tap(page, cdp, '.wl-cell[aria-label^="@ren.tanaka"] .wl-cell-disc'); await wait(1600) })
      await wait(1200)
      await watch(page, 'swipe', async () => {
        await swipe(page, cdp, -200); await wait(1100)
        await swipe(page, cdp, 200); await wait(1100)
        await swipe(page, cdp, -200); await wait(1100)
      })
      await wait(800)
      await watch(page, 'keys', async () => {
        await page.keyboard.press('ArrowRight'); await wait(130)
        await page.keyboard.press('ArrowRight'); await wait(1000)
        await page.keyboard.press('ArrowLeft'); await wait(130)
        await page.keyboard.press('ArrowLeft'); await wait(1000)
      })
      // to the last letter under the name, and over onto the next one
      await page.keyboard.press('ArrowRight'); await wait(900)
      await page.keyboard.press('ArrowRight'); await wait(1800)
      await watch(page, 'name', async () => { await swipe(page, cdp, -200); await wait(1800) })
      await wait(600)
      await watch(page, 'close', async () => { await tap(page, cdp, '.wl-close'); await wait(1400) })
      await ctx.close()
    }
    if (want('replies') || want('shut')) {
      const { ctx, page, cdp } = await open('/letter/pilar.echevarria', 'full')
      await wait(2200)
      await watch(page, 'replies', async () => { await tap(page, cdp, '.wl-letter-card .wl-sk.is-thread'); await wait(1300) })
      // the grip on a phone, the close key at the head of the panel in a wide
      // room: whichever of the two the sheet is showing
      const shut = MODE === 'phone' ? '.wl-th .wl-th-grip' : '.wl-th .wl-th-x'
      await watch(page, 'shut', async () => { await tap(page, cdp, shut); await wait(1100) })
      await ctx.close()
    }
  }
  await browser.close()

  // the middle run of each, by frames dropped
  console.log(`\n${MODE}, processor at 1/${THROTTLE}, ${RUNS} run${RUNS > 1 ? 's' : ''}, ${BASE}\n`)
  console.log('moment    frames  late  dropped  worst   long tasks (longest)   finger down: dropped (worst)')
  for (const [k, rs] of Object.entries(rows)) {
    const r = [...rs].sort((a, b) => a.dropped - b.dropped)[Math.floor((rs.length - 1) / 2)]
    const hand = r.hand ? `${r.hand.dropped} (${r.hand.worst}ms)` : ''
    console.log(`${k.padEnd(9)} ${String(r.frames).padStart(6)} ${String(r.late).padStart(5)} ${String(r.dropped).padStart(8)} ${`${r.worst}ms`.padStart(7)}   ${`${r.long} (${r.longest}ms)`.padStart(18)}   ${hand}`)
    if (r.where) console.log(`          ${r.where}`)
  }
}

// the fixtures' half of preview.mjs, with its screenshots taken off, and the
// measurement after it, run as one module from a folder of its own
const preview = readFileSync(join(here, 'preview.mjs'), 'utf8')
const cut = preview.indexOf('// one label, or several separated by commas')
if (cut < 0) throw new Error('preview.mjs has moved its routes; perf-letter.mjs reads the half before them')
const playwright = pathToFileURL(join(dirname(require.resolve('playwright/package.json')), 'index.mjs')).href
const dir = mkdtempSync(join(tmpdir(), 'perf-letter-'))
process.env.PREVIEW_OUT = join(dir, 'shots')
const file = join(dir, 'perf.mjs')
writeFileSync(file, `${preview.slice(0, cut).replace("from 'playwright'", `from '${playwright}'`)}\nawait (${measurement.toString()})()\n`)
try {
  await import(pathToFileURL(file).href)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
