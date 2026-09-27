// darkroom.mjs: where the product's pictures are taken.
//
// Everything celestual sends out of itself is a photograph of one of its own
// phones, lit in a black room: the screen at the head of every mail, the card
// a link unfurls into, the posts on Instagram (design/DESIGN.md 2.7). None of
// them is drawn by hand. This serves the app through Vite, with the app's own
// config, so the page it photographs renders the REAL screen: `Screen` from
// app/src/wall/screen.jsx, `PixelStory` and the stories from PixelStory.jsx
// and pixmark.js, the colours and quirks from looks.js, the mutual's line
// from mutual.css, the mark from mark.js, the faces from app/public/fonts. A
// screen that changes in the product changes in every picture the next time
// they are made, and a picture cannot disagree with the page it points at.
//
// It is a module the exporters share, and it ships nothing:
//
//   scripts/export-mail.mjs   the mails' screens, keys and signature
//   scripts/export-og.mjs     the share card and the Instagram posts
//
// ── a scene ─────────────────────────────────────────────────────────────────
// A picture is described, not drawn: `w` by `h` of the room, in CSS pixels,
// photographed at `scale` device pixels to each. In it:
//
//   phone   the screen: its width `w`, its centre `x`, `y`, the colour it is
//           lit in (`tint`), whose phone it is (`seed`, looks.js `quirks`),
//           and what is on its glass (`glass`, below). Held square to the
//           camera, as every screen with a story on it is (PixelStory.jsx
//           `SQUARE`), with no second status row and no keys, as every
//           story's screen has none. It throws its own light on the room
//           (screen.css `.wl-scene-halo`), and `room` lays the wider light a
//           letter is read in round it as well (`.wl-room-light`), that many
//           times the phone's width across
//   sign    the lockup, as the shared picture is signed (share.js
//           `signature`): the mark and `celestual.` in the room's serif at
//           `word` pixels, centred at `y`, and across the room or from `x`
//   grain   the sensor's grain over the whole photograph, at this strength,
//           as the shared picture and the share card have it
//   key     a key on its own, for a mail: the lit key (`lit`) or the bezel
//           key, `w` by `h`, with its word in the phone's face at `size`,
//           in the middle of the room
//   quiet   the photograph's layers left off: `rgb`, the pixels up close, and
//           `shine`, the sensor's grain. Both are noise to a GIF's palette
//   fade    the room's edge taken to black over this many pixels, for a
//           picture cut close round its phone
//
// The glass is a story (`story`), at `t` on its clock, with `say` typed under
// it the way Reveal.jsx types "it's mutual." (mutual.css `.wl-mutual-say`):
//
//   intro      the intro, told in `tint`; with no `t`, its last frame, the
//              mark on the phone lit in that colour
//   reveal     the mutual's; `glow` holds the light behind its mark where it
//              was at that moment (`heldOf`)
//   gathered   the mark standing where the mutual's gathers to, at the top of
//              the glass, for a line under it
//   mark       the mark alone in the middle, on the phone's coarser grid
//
// ── a frame ─────────────────────────────────────────────────────────────────
// `shoot(scene, frames)` answers a PNG for each frame: `{ t }` moves a
// story's clock (ms, or one of the story's own moments and ms from it,
// 'live+1650'), and `{ cursor: false }` puts the cursor out for the half of
// the phone's beat it is out. Nothing on the page runs on its own clock while
// it is photographed: every animation that would is held, and each frame is
// drawn from what it is told.
import { createServer as createHttp } from 'node:http'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const app = join(root, 'app')

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  const dir = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (dir && existsSync(join(dir, 'chromium'))) return join(dir, 'chromium')
  if (existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium'
  return undefined
}

// The app's own Vite, from app/node_modules (`npm --prefix app install`), so
// the screen is compiled exactly as the dev server compiles it.
async function vite() {
  const req = createRequire(join(app, 'package.json'))
  let pkg
  try {
    pkg = req.resolve('vite/package.json')
  } catch {
    throw new Error('darkroom: the app has no node_modules. Run `npm --prefix app install` first.')
  }
  return import(pathToFileURL(join(dirname(pkg), 'dist/node/index.js')).href)
}

// ── the page ─────────────────────────────────────────────────────────────────
// Plain script and not JSX, so it needs nothing but what Vite already does
// for the app. It keeps one scene on the page and draws it again for each
// frame, and says when a frame is on the glass.
const PAGE = `
import { createElement as h, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Screen } from '/src/wall/screen.jsx'
import PixelStory, { SQUARE } from '/src/wall/PixelStory.jsx'
import { introStory, revealStory, markCells, MARK_CUT, I_QUICK } from '/src/wall/pixmark.js'
import { skinOf, skinVars, mix, hexRgb } from '/src/wall/looks.js'
import { eclipticSVG, CHALK } from '/src/wall/mark.js'
import '/src/wall/mutual.css'

const NIGHT = skinOf('night')
const panelOf = (s) => [s.hi, s.mid, s.lo]

// the stories, made once for each colour they are told in
const STORIES = new Map()
function storyOf(name, tint) {
  const k = name + '|' + tint
  if (STORIES.has(k)) return STORIES.get(k)
  const to = skinOf(tint)
  let s
  if (name === 'reveal') {
    // the mutual's, as Reveal.jsx tells it: the night's ink to the rose's
    s = revealStory({ panel: panelOf(to), ink: [NIGHT.ink, to.ink] })
  } else if (name === 'intro') {
    // the intro, as Intro.jsx tells it in one colour
    s = introStory(0, {
      pace: I_QUICK, panel: panelOf(to), ink: [NIGHT.ink, to.ink],
      front: hexRgb(mix(to.mid, '#FFFFFF', 0.6)).join(', '),
    })
  } else if (name === 'gathered') {
    // the mark standing where the mutual's gathers up to (pixmark.js
    // \`R_SMALL\`, cut as the mutual cuts it): 51 cells, at the top of the
    // same grid, so a line goes under it where the mutual's is typed
    const n = 51
    const { list } = markCells(n, { ...MARK_CUT, ss: 6 })
    const ox = (95 - n) >> 1
    const cells = list.map((c) => [c.x + ox, c.y + 2, 1])
    const f = { key: name, cells }
    s = { cols: 95, rows: 75, end: 0, fine: true, frame: () => f }
  } else {
    // the mark alone in the middle, on the phone's coarser grid, in the
    // screen's ink (the seal PixelStory.jsx draws at 47 cells)
    const { list, n } = markCells(47, MARK_CUT)
    const cols = 57
    const rows = 45
    const ox = (cols - n) >> 1
    const oy = (rows - n) >> 1
    const cells = list.map((c) => [c.x + ox, c.y + oy, 1])
    const f = { key: 'mark', cells }
    s = { cols, rows, end: 0, frame: () => f }
  }
  STORIES.set(k, s)
  return s
}

// A moment on a story's clock: ms, or one of its own moments and ms from it
// ('live+1600' is 1.6s into the mutual's life), or its end when none is given
function clockOf(story, t) {
  if (t == null) return story.end
  if (typeof t === 'number') return t
  const m = /^([a-z]+)([+-]\\d+)?$/.exec(t)
  const at = m && story.times ? story.times[m[1]] : null
  if (at == null) throw new Error('darkroom: no moment ' + t)
  return at + Number(m[2] || 0)
}

// A story with the light behind its mark held where it was at one moment
// (\`glow\`): the mutual's breath is the whole panel's light going up and
// down, which a GIF can only carry as every pixel of the panel on every
// frame, while the glint and the twinkle are a few cells. The story's own
// light at that moment, and nothing made up.
const HELD = new Map()
function heldOf(story, key, glow) {
  if (glow == null) return story
  const k = key + '|' + glow
  if (!HELD.has(k)) {
    const light = story.frame(clockOf(story, glow)).glow
    HELD.set(k, { ...story, frame: (t, edge) => ({ ...story.frame(t, edge), glow: light }) })
  }
  return HELD.get(k)
}

function Glass({ glass, tint, t }) {
  const story = heldOf(storyOf(glass.story, tint), glass.story + '|' + tint, glass.glow)
  const kids = [h(PixelStory, { key: 's', story, at: clockOf(story, t) })]
  if (glass.say) kids.push(h('p', { key: 'p', className: 'wl-mutual-say' }, glass.say, h('span', { className: 'wl-scr-cur' })))
  return kids
}

function Sign({ word }) {
  const mark = Math.round(word * 1.13)
  return h('div', { className: 'dr-sign', style: { gap: Math.round(word * 0.38) + 'px' } },
    h('span', { className: 'dr-sign-mark', style: { width: mark + 'px', height: mark + 'px' }, dangerouslySetInnerHTML: { __html: eclipticSVG(CHALK) } }),
    h('span', { className: 'dr-sign-word', style: { fontSize: word + 'px' } }, 'celestual.'))
}

function Room({ scene, frame }) {
  const p = scene.phone
  // (\`wl-root\` for the rules screen.css writes under it; wall.css, which
  // gives it the rest, is not on this page)
  const cls = ['dr-room wl-root', frame.cursor === false && 'is-out',
    scene.fade && 'has-fade', ...(scene.quiet || []).map((q) => 'no-' + q)].filter(Boolean).join(' ')
  const style = { width: scene.w + 'px', height: scene.h + 'px', background: '#000', '--fade': (scene.fade || 0) + 'px' }
  const kids = []
  if (p) {
    const look = { tint: p.tint || 'night' }
    const x = p.x ?? scene.w / 2
    const y = p.y ?? scene.h / 2
    if (scene.room) {
      const v = skinVars(look.tint)
      kids.push(h('span', { key: 'l', className: 'dr-light', style: { left: x + 'px', top: y + 'px', width: Math.round(p.w * scene.room) + 'px', '--s-halo': v['--s-halo'] } }))
    }
    kids.push(h('div', { key: 'p', className: 'dr-phone', style: { width: p.w + 'px', left: (x - p.w / 2) + 'px', top: y + 'px' } },
      h(Screen, { look, seed: p.seed || 'intro', keys: {}, live: false, style: SQUARE },
        h(Glass, { glass: p.glass, tint: look.tint, t: frame.t }))))
  }
  if (scene.sign) {
    const s = scene.sign
    kids.push(h('div', { key: 's', className: 'dr-signed', style: s.x == null ? { top: s.y + 'px' } : { top: s.y + 'px', left: s.x + 'px', right: 'auto', transform: 'translateY(-50%)' } }, h(Sign, { word: s.word })))
  }
  if (scene.grain) {
    kids.push(h('svg', { key: 'g', className: 'dr-grain', style: { opacity: scene.grain }, xmlns: 'http://www.w3.org/2000/svg', width: '100%', height: '100%' },
      h('filter', { id: 'dr-n' }, h('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.85', numOctaves: '2', stitchTiles: 'stitch' }), h('feColorMatrix', { type: 'saturate', values: '0' })),
      h('rect', { width: '100%', height: '100%', filter: 'url(#dr-n)' })))
  }
  if (scene.key) {
    const k = scene.key
    kids.push(h('div', { key: 'k', className: 'dr-key ' + (k.lit ? 'is-lit' : 'is-bezel'), style: { fontSize: k.size + 'px', width: k.w + 'px', height: k.h + 'px' } }, k.word))
  }
  return h('div', { className: cls, style }, kids)
}

let show = null
function App() {
  const [st, setSt] = useState(null)
  show = setSt
  if (!st) return null
  return h(Room, st)
}
createRoot(document.getElementById('root')).render(h(App))

const twice = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
window.__room = {
  async show(scene, frame) {
    flushSync(() => show({ scene, frame: frame || {} }))
    await document.fonts.ready
    await twice()
    // the pixels up close are made off the page's thread and faded in
    // (screen.jsx \`RgbLayer\`); a picture that keeps them waits for them
    if (!(scene.quiet || []).includes('rgb') && scene.phone) {
      const t0 = performance.now()
      while (!document.querySelector('.wl-scr-fx.is-rgb') && performance.now() - t0 < 4000) await twice()
      await new Promise((r) => setTimeout(r, 600))
    }
    await twice()
  },
  async frame(scene, frame) {
    flushSync(() => show({ scene, frame }))
    await twice()
    await twice()
  },
}
window.__ready = true
`

// The room's own rules: the faces, the black, the phone placed, and every
// clock on the glass held so a frame is only what it is told.
const HTML = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/fonts/faces.css">
<style>
  html, body { margin: 0; background: #000; }
  #root { display: inline-block; }
  .dr-room {
    --f-s40: 'Jersey 10', 'Geist Mono', ui-monospace, monospace;
    --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
    position: relative; overflow: hidden; -webkit-font-smoothing: antialiased;
  }
  .dr-phone { position: absolute; transform: translateY(-50%); }
  /* a picture cut close round its phone: the light it throws falls to the
     black a little sooner at the edges, so the edge of the picture is the
     room's black and is never seen */
  .dr-room.has-fade::after {
    content: ''; position: absolute; inset: 0; z-index: 5; pointer-events: none;
    box-shadow: inset 0 0 var(--fade) calc(var(--fade) / 2) #000;
  }
  /* the light a letter is read in, round the phone (screen.css .wl-room-light) */
  .dr-light {
    position: absolute; aspect-ratio: 1; transform: translate(-50%, -50%); pointer-events: none;
    background: radial-gradient(closest-side, var(--s-halo) 0%, color-mix(in srgb, var(--s-halo) 40%, transparent) 38%, transparent 100%);
  }
  /* a screen that names nobody has no second status row (story.css) */
  .dr-room .wl-scr-r2 { display: none; }
  /* no dead pixel: on a screen that is the only thing in the picture it is
     read as a mark somebody meant (mutual.css says the same of its glass) */
  .dr-room .wl-scr-fx.is-glass { background: var(--q-scratch, none), var(--q-dust, none); }
  /* the clocks, held: the cursor is lit or out as the frame says */
  .dr-room .wl-scr-cur { animation: none !important; }
  .dr-room.is-out .wl-scr-cur { opacity: 0; }
  .dr-room.no-rgb .wl-scr-fx.is-rgb, .dr-room.no-shine .wl-scr-fx.is-shine { display: none; }
  /* the sensor's grain over the whole photograph, as the shared picture has */
  .dr-grain { position: absolute; inset: 0; z-index: 6; pointer-events: none; mix-blend-mode: screen; }
  /* the lockup, as the shared picture signs itself (share.js \`signature\`) */
  .dr-signed { position: absolute; left: 0; right: 0; display: flex; justify-content: center; transform: translateY(-50%); }
  .dr-sign { display: inline-flex; align-items: center; color: #F4F1EA; opacity: 0.9; }
  .dr-sign-mark { display: block; filter: drop-shadow(0 0 10px rgba(244, 241, 234, 0.18)); }
  .dr-sign-mark svg { display: block; width: 100%; height: 100%; }
  .dr-sign-word {
    font-family: 'Newsreader', 'Iowan Old Style', Palatino, Georgia, serif;
    font-weight: 500; line-height: 1; letter-spacing: -0.022em; transform: translateY(-0.03em);
  }
  /* a key, as the wall draws its two (phone.css, THE KEYS) */
  .dr-key {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;
    box-sizing: border-box; border-radius: 3px; font-family: var(--f-s40); line-height: 1;
  }
  .dr-key.is-lit {
    background: #F4F1EA; color: #000;
    box-shadow: 0 0 0 1px rgba(244, 241, 234, 0.22), 0 0 26px -8px rgba(244, 241, 234, 0.5);
  }
  .dr-key.is-bezel { background: #0B0B0B; color: #F4F1EA; box-shadow: inset 0 0 0 1px #2A2927; }
</style></head><body><div id="root"></div>
<script type="module" src="/@id/virtual:darkroom"></script></body></html>`

// ── the room, open ───────────────────────────────────────────────────────────
export async function darkroom({ scale = 2 } = {}) {
  const { createServer } = await vite()
  const server = await createServer({
    root: app,
    configFile: join(app, 'vite.config.js'),
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: [{
      name: 'darkroom',
      resolveId: (id) => (id === 'virtual:darkroom' ? '\0virtual:darkroom' : null),
      load: (id) => (id === '\0virtual:darkroom' ? PAGE : null),
    }],
  })
  const http = createHttp(async (req, res) => {
    if (req.url.split('?')[0] === '/__darkroom') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(await server.transformIndexHtml('/__darkroom', HTML))
      return
    }
    server.middlewares(req, res, () => res.writeHead(404).end())
  })
  await new Promise((done) => http.listen(0, '127.0.0.1', done))
  const browser = await chromium.launch({ executablePath: chromiumPath() })
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: scale })
  // (the dev client asks for the socket a dev server keeps for reloading,
  // and there is none here: nothing is edited while a picture is taken)
  const problems = []
  page.on('pageerror', (e) => { if (!/WebSocket/.test(String(e))) problems.push(String(e)) })
  await page.goto(`http://127.0.0.1:${http.address().port}/__darkroom`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 })

  // `glass` answers where the screen stood in the last picture, in its own
  // pixels, for a palette made in two parts (prints.mjs). A picture is a PNG,
  // or a JPEG at `quality` for one that is posted and made a JPEG anyway
  let glass = null
  async function shoot(scene, frames = [{}], { quality = 0 } = {}) {
    await page.setViewportSize({ width: Math.max(scene.w, 200), height: Math.max(scene.h, 200) })
    await page.evaluate(([s, f]) => window.__room.show(s, f), [scene, frames[0]])
    const clip = await page.locator('.dr-room').boundingBox()
    const scr = scene.phone ? await page.locator('.wl-scr').boundingBox() : null
    glass = scr && {
      x: Math.round((scr.x - clip.x) * scale), y: Math.round((scr.y - clip.y) * scale),
      w: Math.round(scr.width * scale), h: Math.round(scr.height * scale),
    }
    const out = []
    for (const f of frames) {
      await page.evaluate(([s, fr]) => window.__room.frame(s, fr), [scene, f])
      out.push(await page.screenshot(quality ? { type: 'jpeg', quality, clip } : { type: 'png', clip }))
    }
    if (problems.length) throw new Error(problems.join('\n'))
    return out
  }
  async function close() {
    await browser.close()
    http.close()
    await server.close()
  }
  return { shoot, close, scale, glass: () => glass }
}
