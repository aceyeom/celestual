// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MUTUAL'S ONE FACE                                                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The owner, 29 September: the battery on the reveal card should be one, at
// the top of the card and not on each note, and with the card's design it
// should be the two people's to change, "hidden untold mechanism", and
// "these changes will be instantly viewable to the other person"; and "a
// feature to see if they've opened up the mutual letters". So a told mutual
// has one face on the server (0077 `celestual_mutual_faces`), found there
// from the caller's proof and the other @ and never from anything this
// browser holds, and this is its client: the colour the keepsake is lit in,
// the charge of the battery on its band, and whether the other side has
// opened it since it was told. Keepsake.jsx draws it, keepshare.js prints
// the colour and the battery on the picture, and pings.js `markOpened` says
// this side has opened it.
//
// ── what it holds ───────────────────────────────────────────────────────────
// The last face the server said for each pair this tab has asked about, in
// memory and nowhere else, so a keepsake opened again draws its colour on
// its first frame; it goes with the tab. Never stored on the device: a
// shared laptop is not to carry a list of who anybody is mutual with (the
// reason `toldSeen` keeps hashes, pings.js), and a colour by a pair of @s
// would be one.
//
// ── how it moves ────────────────────────────────────────────────────────────
// A change is drawn at once (the keepsake's colour, a tap on its battery)
// and sent after: a colour at once, and a run of taps on the battery once,
// when the finger has stopped, so five taps are one call. The answer is the
// server's word on the face, and it is drawn unless another change has been
// made since it was asked for, which it would undo. The browser that made
// the change, or opened the mutual, nudges the other on the pair's channel
// (api/celestual.js `nudgeMutual`, a broadcast with nothing in it), and a
// keepsake open on the other side hears it and asks again. And, since a
// socket is not a promise, a keepsake that can be seen asks every five
// seconds as well, and when its tab comes back to the front. A reply to an
// ask started before the last change here is not drawn.
//
// ── when there is nothing to share ──────────────────────────────────────────
// `status` is 'wait' until the server has answered, 'ok' with a face, 'off'
// when there is no door to ask (a database a migration behind this front
// end, 'missing', or no backend here at all), and 'none' when the server
// says this person holds no mutual with that @ now (taken off on another
// device). Only 'ok' draws the battery, the colour's menu row and the report
// under your note; every other status is the rose keepsake as it was, minus
// the batteries the notes used to carry, since a thing that cannot be shared
// is not offered, and a word the server has not said is not printed.
import { useCallback, useEffect, useRef, useState } from 'react'
import { mutualFace, setMutualFace, seeMutual, watchMutual, nudgeMutual } from '../api/celestual.js'
import { proofFor, renewProof } from './auth.js'
import { normHandle } from './data.js'
import { COLOURS, hexRgb } from './looks.js'

// The colours the keepsake can wear, in the catalogue's order, which is the
// order the letter's colour panel walks: the lit screens, the ones the
// server takes (0077 `celestual_mutual_tints`, the same seven). A print is
// pulled through a press the keepsake's small screens would come out of as
// flat ink, and the negative's panel is darker than its words; each of these
// was looked at on the keepsake, on a phone and a desk, before it was here.
const WEARS = new Set(['night', 'white', 'ice', 'green', 'amber', 'rose', 'lilac'])
export const TINTS = COLOURS.filter((c) => c.kind === 'lit' && WEARS.has(c.slug)).map((c) => c.slug)
export const TINT_NAMES = new Map(COLOURS.map((c) => [c.slug, c.name]))
export const FIRST_TINT = 'rose'
const tintOf = (t) => (TINTS.includes(t) ? t : FIRST_TINT)

// The light the phone throws on the room (mutual.css `.wl-keep-light`, the
// story's `--story-glow-rgb`): the rose's is the story's own pink, and every
// other colour's is its hue pushed a quarter further from grey and brought
// up to full, since a pastel thrown faintly on black reads as grey and a
// light seen in a dark room is seen as its colour (story.css says the same
// of the rose). Worked the same way, the rose comes out within a few steps
// of the story's.
const GLOW = new Map([['rose', '255, 150, 194']])
export function glowOf(tint) {
  const t = tintOf(tint)
  if (GLOW.has(t)) return GLOW.get(t)
  const c = COLOURS.find((x) => x.slug === t)
  const rgb = hexRgb(c.hue)
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3
  const pushed = rgb.map((v) => mean + (v - mean) * 1.25)
  const k = 255 / Math.max(1, ...pushed)
  const out = pushed.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(', ')
  GLOW.set(t, out)
  return out
}

// The glint going round the mark's ring, and the cell of the star lit now
// and then (pixmark.js `keepStory`, PixelStory.jsx `heat`): the story's own
// deep rose on the rose, and on every other colour its hue pushed twice as
// far from grey and taken a fifth of the way down, the same deep, lit step
// of it that the rose is of the rose, so the one living thing on the glass
// is in the glass's own colour. Worked the same way, the rose lands a few
// steps from the story's.
const HEAT = new Map([['rose', '#C93F76']])
export function heatOf(tint) {
  const t = tintOf(tint)
  if (HEAT.has(t)) return HEAT.get(t)
  const c = COLOURS.find((x) => x.slug === t)
  const rgb = hexRgb(c.hue)
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3
  const hex = rgb.map((v) => Math.max(0, Math.min(255, Math.round((mean + (v - mean) * 2) * 0.8))))
    .map((v) => v.toString(16).padStart(2, '0')).join('')
  HEAT.set(t, `#${hex.toUpperCase()}`)
  return HEAT.get(t)
}

const keyOf = (me, them) => `${normHandle(me)}>${normHandle(them)}`
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

// the face as the keepsake draws it, off the server's answer
function shape(out) {
  const bat = Number(out.bat)
  return {
    tint: tintOf(out.tint),
    bat: Number.isInteger(bat) && bat >= 0 && bat <= 4 ? bat : 4,
    topic: typeof out.topic === 'string' ? out.topic : '',
    opened: out.opened === true,
    openedAt: Date.parse(out.opened_at || 0) || 0,
  }
}
const same = (a, b) => !!a && !!b && a.tint === b.tint && a.bat === b.bat && a.topic === b.topic
  && a.opened === b.opened && a.openedAt === b.openedAt

// ── what the tab knows, and who is listening ──
const HELD = new Map()
const ASKS = new Map()
const EARS = new Map()
// the pairs with a change made here that the server has not answered yet:
// no ask but that change's own answer is held or drawn until it has, since
// one asked before the server had it would put the face back as it was
const MOVING = new Set()
function tell(k, news) {
  const set = EARS.get(k)
  if (set) for (const fn of set) fn(news)
}
function listen(k, fn) {
  if (!EARS.has(k)) EARS.set(k, new Set())
  EARS.get(k).add(fn)
  return () => {
    const set = EARS.get(k)
    if (!set) return
    set.delete(fn)
    if (!set.size) EARS.delete(k)
  }
}
// What an answer says, held and told, unless something newer is held
// already: a change made here since the answer was asked for, a change on
// its way (`MOVING`, but for that change's own answer, `own`), or an answer
// asked for later, any of which it would undo. A refusal of the proof, or a
// network that did not answer, says nothing about the face, and changes
// nothing
function learn(k, out, asked, own = false) {
  const ok = !!out && out.ok === true
  const error = ok ? null : (out && out.error) || 'network'
  const status = ok ? 'ok' : error === 'none' ? 'none' : error === 'missing' || error === 'offline' ? 'off' : null
  const face = ok ? shape(out) : null
  const held = HELD.get(k)
  if (status && (own || !MOVING.has(k)) && !(held && held.asked > asked)) {
    HELD.set(k, { status, face, asked })
    tell(k, { status, face, asked })
  }
  return ok ? { ok: true, face } : { ok: false, error }
}

// the proof, and once more with a fresh one if the server let it go
async function withProof(me, ask) {
  const key = await proofFor(me)
  if (!key) return { ok: false, error: 'unverified' }
  let out = await ask(key)
  if (out && out.ok === false && out.error === 'unverified') {
    const fresh = await renewProof(me, key)
    if (fresh) out = await ask(fresh)
  }
  return out || { ok: false, error: 'network' }
}

// ── the three asks ──
// The face as it stands. Two asks at once are one
export function readFace(me, them) {
  const k = keyOf(me, them)
  if (!normHandle(me) || !normHandle(them)) return Promise.resolve({ ok: false, error: 'none' })
  if (ASKS.has(k)) return ASKS.get(k)
  const asked = now()
  const job = withProof(me, (proof) => mutualFace({ me, them, proof }))
    .then((out) => learn(k, out, asked), () => ({ ok: false, error: 'network' }))
    .finally(() => { if (ASKS.get(k) === job) ASKS.delete(k) })
  ASKS.set(k, job)
  return job
}
// asked for as the reveal opens, so the keepsake has its colour by the time
// it is drawn (screens/Reveal.jsx)
export const primeFace = readFace
export function heldFace(me, them) {
  return HELD.get(keyOf(me, them)) || null
}

// A change, sent: the colour, the battery, or both. The other side is
// nudged once the server has it
async function writeFace(me, them, change) {
  const k = keyOf(me, them)
  const asked = now()
  const out = await withProof(me, (proof) => setMutualFace({ me, them, proof, tint: change.tint, bat: change.bat }))
    .catch(() => ({ ok: false, error: 'network' }))
  const said = learn(k, out, asked, true)
  if (said.ok) nudgeMutual(said.face.topic)
  return said
}

// This side has opened the mutual (pings.js `markOpened`, at the moments the
// reveal says it was watched): once a tab for each telling, and again on a
// later visit only if it did not go through. `told` is the night the list
// drew, so opening last week's keepsake never says this week's was opened.
// The other side is nudged, and a keepsake of theirs that is open changes
// `delivered` to `opened` under their note while they look at it.
const SEEN = new Set()
export function seeFace(me, p) {
  if (!p || !p.to || !p.key || !normHandle(me)) return
  const k = keyOf(me, p.to)
  const mark = `${k}#${p.key}`
  if (SEEN.has(mark)) return
  SEEN.add(mark)
  const told = p.revealedAt ? new Date(p.revealedAt).toISOString() : null
  const asked = now()
  withProof(me, (proof) => seeMutual({ me, them: p.to, proof, told }))
    .then((out) => {
      const said = learn(k, out, asked)
      if (said.ok) nudgeMutual(said.face.topic)
      else if (said.error === 'network' || said.error === 'unverified') SEEN.delete(mark)
    }, () => SEEN.delete(mark))
}

// ── on the keepsake ──
// The face for one keepsake, and a way to change it. `live` is whether it
// can be seen (not behind the film): only then does it listen on the pair's
// channel and ask on the clock.
const POLL_MS = 5000
const TAPS_MS = 360
const HEARD_MS = 220
const FRESH_MS = 2000
// the page's next idle moment, or a second at the most
function soon(fn) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 1000 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 400)
  return () => clearTimeout(id)
}
export function useFace(me, them, live) {
  const k = keyOf(me, them)
  const [state, setState] = useState(() => {
    const h = HELD.get(k)
    return h ? { status: h.status, face: h.face } : { status: 'wait', face: null }
  })
  const cur = useRef(state)
  cur.current = state
  // when this keepsake last changed the face, how many of its changes are
  // on their way, and the change not sent yet
  const local = useRef(-Infinity)
  const busy = useRef(0)
  const pend = useRef(null)
  const timer = useRef(null)

  const draw = useCallback((status, face) => {
    setState((o) => (o.status === status && (o.face === face || same(o.face, face)) ? o : { status, face: face || o.face }))
  }, [])

  // what the server says, unless a change here has been made since it asked;
  // and nothing at all, not even an update React then finds is the same,
  // when it says what is drawn already, which is most of what it says (the
  // answer to this side's opening lands while the film pulls back)
  useEffect(() => listen(k, (n) => {
    if (n.status === 'ok' && (n.asked < local.current || busy.current || pend.current)) return
    const s = cur.current
    if (s.status === n.status && (n.face === s.face || same(s.face, n.face) || (!n.face && s.face))) return
    draw(n.status, n.face)
  }), [k, draw])

  // asked once on arriving, unless the reveal has only just asked (Reveal.jsx
  // asks as it opens, `primeFace`), or is asking now, which is the same ask
  useEffect(() => {
    const h = HELD.get(k)
    if (h && now() - h.asked < FRESH_MS) return
    readFace(me, them)
  }, [k]) // eslint-disable-line react-hooks/exhaustive-deps

  // and, while it can be seen, on the clock and when the tab comes back;
  // and whenever the other side nudges, a moment after, so a run of nudges
  // is one ask. Both start once the page is next idle after it comes into
  // sight (`soon`): it comes into sight on the film's landing, whose frames
  // are the unfold's, and a channel joined and a clock set on the landing's
  // first frame were work on the one frame that could least spare it
  useEffect(() => {
    if (!live) return undefined
    const tick = () => { if (typeof document === 'undefined' || document.visibilityState === 'visible') readFace(me, them) }
    const back = () => { if (document.visibilityState === 'visible') tick() }
    let id = null
    const stop = soon(() => {
      id = setInterval(tick, POLL_MS)
      document.addEventListener('visibilitychange', back)
      window.addEventListener('focus', tick)
    })
    return () => {
      stop()
      clearInterval(id)
      document.removeEventListener('visibilitychange', back)
      window.removeEventListener('focus', tick)
    }
  }, [live, k]) // eslint-disable-line react-hooks/exhaustive-deps

  const topic = state.face ? state.face.topic : ''
  useEffect(() => {
    if (!live || !topic) return undefined
    let t = null
    let off = () => {}
    const stop = soon(() => {
      off = watchMutual(topic, () => { clearTimeout(t); t = setTimeout(() => readFace(me, them), HEARD_MS) })
    })
    return () => { stop(); clearTimeout(t); off() }
  }, [live, topic, k]) // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    timer.current = null
    const change = pend.current
    pend.current = null
    if (!change) return
    busy.current += 1
    const said = await writeFace(me, them, change)
    busy.current -= 1
    if (busy.current || pend.current) return
    MOVING.delete(k)
    if (said.ok) draw('ok', said.face)
    else readFace(me, them)
  }, [me, them, k, draw])

  // A change, drawn now and sent after (see the header), worked out from the
  // face as it stands this moment (`c` may be a function of it, as a tap on
  // the battery is), so two taps a frame apart are two bars. Only once the
  // server has said there is a face to change
  const change = useCallback((c0) => {
    const s = cur.current
    if (s.status !== 'ok' || !s.face) return
    const h = HELD.get(k)
    const base = h && h.status === 'ok' && h.face ? h.face : s.face
    const c = typeof c0 === 'function' ? c0(base) : c0
    const face = { ...base, ...c }
    local.current = now()
    MOVING.add(k)
    HELD.set(k, { status: 'ok', face, asked: local.current })
    draw('ok', face)
    pend.current = { ...(pend.current || {}), ...c }
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 'tint' in c ? 0 : TAPS_MS)
  }, [k, draw, flush])

  // a run of taps still waiting when the keepsake closes goes all the same
  useEffect(() => () => { if (pend.current) flush() }, [flush])

  return { ...state, change }
}
