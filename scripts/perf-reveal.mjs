#!/usr/bin/env node
// perf-reveal.mjs: how smooth the mutual's film is, counted in frames.
//
// The film is the one place in the product that draws the whole screen, a
// canvas of two and a half million pixels on a phone at three to the point,
// every frame while the two of them run and the mark gathers, and then
// flies the whole stage onto the keepsake with a transform and a clip
// (Film.jsx). This is that, measured the way a phone would feel it: the
// private notes are opened on a phone's window (390 by 844 at three pixels
// to the point, with touch) with the processor slowed four times, the
// mutual is pressed, and the film is watched frame by frame to its rest
// (a frame loop in the page, and the long tasks the page reports), in its
// beats: the push-in or the wake before the glass's nought, the story, the
// pull-back and the landing, and a few seconds of the keepsake at rest,
// alive. A second run presses `skip` part way.
//
//   node scripts/perf-reveal.mjs                    the film and a skip, on a phone
//   node scripts/perf-reveal.mjs film               only the film
//   PERF_MODE=desk node scripts/perf-reveal.mjs     a wide room, at full speed
//   PERF_RUNS=3 node scripts/perf-reveal.mjs        the middle of three runs
//   PERF_TRACE=1 node scripts/perf-reveal.mjs       and where the time went
//   PERF_TRACE=2 node scripts/perf-reveal.mjs       and the main thread's own
//                                                   events, and its longest task
//   PERF_TRACE=3 node scripts/perf-reveal.mjs       and every long task, in order
//   PERF_BUCKETS=1 node scripts/perf-reveal.mjs     the frames lost in each half
//                                                   second from the nought
//   PERF_CSS='…' node scripts/perf-reveal.mjs       with a rule laid over the page
//
// The frames are counted on the page's own thread. The push-in and the wake
// are the compositor's (a transform, and an opacity), and the page mounts
// the film's cells and the keepsake behind it while they run, so `to
// nought` loses frames here that a phone does not show; the press itself
// is the longest task in it, and is what to watch there.
//
// DEV_URL is the server to measure. Measure a production build (`vite
// build`, then `vite preview`), as perf-letter.mjs says, and not the dev
// server. The data is scripts/preview.mjs's, read and run the way
// perf-letter.mjs reads it. Nothing here ships.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// the measurement, run inside the fixtures' module (it reads their names:
// `fulfil`, `BASE`, `chromium`)
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

  // in the page: a frame loop, the long tasks, and the moments the film
  // reaches each of its beats, read off the classes it carries
  const init = () => {
    const P = window.__perf = { frames: [], long: [], beats: {}, rec: false }
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (P.rec) P.long.push([Math.round(e.startTime), Math.round(e.duration)])
      }).observe({ type: 'longtask' })
    } catch { /* a browser without them */ }
    const beat = (k, on) => { if (on && P.beats[k] === undefined) P.beats[k] = performance.now() }
    const loop = (t) => {
      if (!P.rec) return
      P.frames.push(t)
      beat('on', !!document.querySelector('.wl-film.is-on'))
      beat('pull', !!document.querySelector('.wl-film.is-pulling'))
      beat('land', !!document.querySelector('.wl-keep.is-landing'))
      beat('gone', P.beats.land !== undefined && !document.querySelector('.wl-film'))
      requestAnimationFrame(loop)
    }
    P.start = () => { P.frames = []; P.long = []; P.beats = { press: performance.now() }; P.rec = true; requestAnimationFrame(loop) }
    P.stop = () => { P.rec = false; return { frames: P.frames, long: P.long, beats: P.beats } }
  }

  // late frames: a frame that took more than 20ms missed the next, and each
  // whole frame it ran over by is one dropped
  const stats = (fr, a, b) => {
    let n = 0, late = 0, dropped = 0, worst = 0
    for (let i = 1; i < fr.length; i++) {
      if (fr[i] <= a || fr[i] > b) continue
      const dt = fr[i] - fr[i - 1]
      n++
      if (dt > 20) late++
      dropped += Math.max(0, Math.round(dt / 16.667) - 1)
      worst = Math.max(worst, dt)
    }
    return { frames: n, late, dropped, worst: Math.round(worst), share: n ? dropped / (n + dropped) : 0 }
  }

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
    // PERF_TRACE=2: the main thread's own events, the dozen longest in all
    if (process.env.PERF_TRACE === '2' || process.env.PERF_TRACE === '3') {
      const by = {}
      for (const e of ev) if (e.ph === 'X' && e.dur && `${e.pid}:${e.tid}` === main) by[e.name] = (by[e.name] || 0) + e.dur
      console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${Math.round(v / 1000)}ms`).join(', '))
      // and the longest task, by what ran inside it, a level down and two
      const mine = ev.filter((e) => e.ph === 'X' && e.dur && `${e.pid}:${e.tid}` === main)
      const task = mine.filter((e) => e.name === 'RunTask').sort((a, b) => b.dur - a.dur)[0]
      const within = (t) => mine.filter((e) => e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e.dur > 3000)
      const say = (e) => `${e.name}${e.args?.data?.functionName ? `(${e.args.data.functionName})` : ''}${e.args?.data?.type ? `[${e.args.data.type}]` : ''} ${Math.round(e.dur / 1000)}`
      if (task) console.log(`  longest task ${Math.round(task.dur / 1000)}ms:`, within(task).slice(0, 24).map(say).join(', '))
      // PERF_TRACE=3: every long task, in order, from the first
      if (process.env.PERF_TRACE === '3') {
        const long = mine.filter((e) => e.name === 'RunTask' && e.dur > 40000)
        const t0 = long.length ? long[0].ts : 0
        for (const t of long) console.log(`  +${Math.round((t.ts - t0) / 1000)}ms ${Math.round(t.dur / 1000)}ms:`, within(t).slice(0, 16).map(say).join(', '))
      }
    }
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

  const open = async () => {
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
    // a reader with a proved @ and its proof, whose private notes carry the
    // fixture's mutual, never watched on this device
    await page.addInitScript(() => {
      try {
        localStorage.setItem('celestual.wall.v5', JSON.stringify({
          member: 'someone@berkeley.edu', reader: true, verified: ['ace03d'], wroteTo: [], written: [],
          proof: 'a'.repeat(64), turned: true,
        }))
        localStorage.setItem('celestual.session.v1', 'b'.repeat(64))
        localStorage.setItem('celestual:auth', JSON.stringify({ verified: true, handle: 'ace03d', proof: 'a'.repeat(64), at: Date.now() }))
      } catch { /* private mode */ }
    })
    await page.addInitScript(init)
    const cdp = await ctx.newCDPSession(page)
    await page.goto(`${BASE}/berkeley/you`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => !document.querySelector('.hi'), null, { timeout: 12000 }).catch(() => {})
    // PERF_CSS: a rule laid over the page, to see what one thing costs
    if (process.env.PERF_CSS) await page.addStyleTag({ content: process.env.PERF_CSS })
    await wait(1600)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
    return { ctx, page, cdp }
  }

  // the mutual in the private notes: the slot's glass (Slot.jsx), or the
  // row it replaced
  const MUTUAL = '.wl-slot-open, .wl-vault-row.is-mutual'
  const tap = async (page, cdp, sel) => {
    const b = await page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
    if (!V.touch) { await page.mouse.click(b.x, b.y); return }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: b.y, id: 2 }] })
    await wait(40)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }

  const rows = {}
  const watch = async (label, page, fn) => {
    if (TRACE) await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] })
    await page.evaluate(() => window.__perf.start())
    await fn()
    const r = await page.evaluate(() => window.__perf.stop())
    const B = r.beats
    const end = r.frames[r.frames.length - 1]
    const on = B.on ?? B.press
    const phases = {
      'to nought': [B.press, on],
      story: [on, B.pull ?? end],
      'pull-back': [B.pull ?? end, B.land ?? end],
      landing: [B.land ?? end, B.gone ?? end],
      'at rest': [B.gone ?? end, end],
    }
    const out = {}
    for (const [k, [a, b]] of Object.entries(phases)) {
      const s = stats(r.frames, a, b)
      const long = r.long.filter(([t]) => t >= a && t < b)
      out[k] = { ...s, long: long.length, longest: Math.max(0, ...long.map(([, d]) => d)), ms: Math.round(b - a) }
    }
    out.where = TRACE ? summarise(await browser.stopTracing()) : ''
    // PERF_BUCKETS=1: the frames dropped in each half second from the
    // glass's nought, and the long tasks in it, to find which beat it is
    if (process.env.PERF_BUCKETS) {
      const line = []
      for (let a = on; a < end; a += 500) {
        const s = stats(r.frames, a, a + 500)
        const long = r.long.filter(([t]) => t >= a && t < a + 500)
        line.push(`${Math.round(a - on)}:${s.dropped}${long.length ? `(${Math.max(...long.map(([, d]) => d))})` : ''}`)
      }
      console.log(`  ${label} dropped by half second from nought: ${line.join(' ')}`)
    }
    ;(rows[label] = rows[label] || []).push(out)
  }

  for (let run = 0; run < RUNS; run++) {
    if (want('film')) {
      const { ctx, page, cdp } = await open()
      await watch('film', page, async () => { await tap(page, cdp, MUTUAL); await wait(11500) })
      await ctx.close()
    }
    if (want('skip')) {
      const { ctx, page, cdp } = await open()
      await watch('skip', page, async () => {
        await tap(page, cdp, MUTUAL)
        await page.waitForSelector('.wl-film.is-on', { state: 'attached', timeout: 8000 }).catch(() => {})
        await wait(1500)
        await tap(page, cdp, '.wl-film .wl-sk.is-r')
        await wait(4500)
      })
      await ctx.close()
    }
  }
  await browser.close()

  console.log(`\n${MODE}, processor at 1/${THROTTLE}, ${RUNS} run${RUNS > 1 ? 's' : ''}, ${BASE}\n`)
  console.log('run    beat          ms  frames  late  dropped  dropped%   worst   long tasks (longest)')
  for (const [k, rs] of Object.entries(rows)) {
    const total = (r) => Object.values(r).reduce((n, v) => n + (v.dropped || 0), 0)
    const r = [...rs].sort((a, b) => total(a) - total(b))[Math.floor((rs.length - 1) / 2)]
    for (const [beat, s] of Object.entries(r)) {
      if (beat === 'where') continue
      console.log(`${k.padEnd(6)} ${beat.padEnd(10)} ${String(s.ms).padStart(6)} ${String(s.frames).padStart(7)} ${String(s.late).padStart(5)} ${String(s.dropped).padStart(8)} ${`${(100 * s.share).toFixed(1)}%`.padStart(9)} ${`${s.worst}ms`.padStart(7)}   ${`${s.long} (${s.longest}ms)`.padStart(18)}`)
    }
    if (r.where) console.log(`       ${r.where}`)
  }
}

// the fixtures' half of preview.mjs, with its screenshots taken off, and the
// measurement after it, run as one module from a folder of its own
const preview = readFileSync(join(here, 'preview.mjs'), 'utf8')
const cut = preview.indexOf('// one label, or several separated by commas')
if (cut < 0) throw new Error('preview.mjs has moved its routes; perf-reveal.mjs reads the half before them')
const playwright = pathToFileURL(join(dirname(require.resolve('playwright/package.json')), 'index.mjs')).href
const dir = mkdtempSync(join(tmpdir(), 'perf-reveal-'))
process.env.PREVIEW_OUT = join(dir, 'shots')
const file = join(dir, 'perf.mjs')
writeFileSync(file, `${preview.slice(0, cut).replace("from 'playwright'", `from '${playwright}'`)}\nawait (${measurement.toString()})()\n`)
try {
  await import(pathToFileURL(file).href)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
