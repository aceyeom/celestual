// ── a note, on its phone ────────────────────────────────────────────────────
//
// The composer of the reel's notes (reel.jsx), lin's and kai's, mid letter
// and then sent, at `t`: the words laid out whole, a letter landing at each
// of `times`. The wall's sheet (films/wall-atlas.jsx) photographs lin's from
// this same component, so the wall's cell and the phone over it in the reel
// are the same picture.
import { useLayoutEffect, useRef } from 'react'
import { Phone } from '../kit.jsx'
import { ScreenNote } from '../../wall/screen.jsx'
import './note-screen.css'

export const PW = 1000
export const typedAt = (times, t) => { let n = 0; while (n < times.length && times[n] <= t) n++; return n }
const blink = (t, last) => t - last < 530 || Math.floor((t - last) / 530) % 2 === 1

// The words laid out whole, a span a letter, what is not typed yet there and
// unseen, so no word jumps a line as it is typed and the cursor's place is
// the place of the next letter. `onMeasure` is handed every letter's place
// in the phone's own pixels, once, and the face's size and ascent there, so
// the reel can cut the same letters into cells exactly where they stand.
// `hide` keeps the words' places and shows none of them.
function Typed({ text, n, cursor, fs, lift = 0, hide = false, onMeasure = null }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (!onMeasure || !ref.current) return
    const root = ref.current.closest('.st-phone')
    const r0 = root.getBoundingClientRect()
    const k = r0.width / root.offsetWidth
    const spans = [...ref.current.querySelectorAll('[data-i]')]
    const box = (e) => { const r = e.getBoundingClientRect(); return { x: (r.left - r0.left) / k, y: (r.top - r0.top) / k, w: r.width / k, h: r.height / k } }
    // the face as it is set here: its size, and its ascent at that size, so
    // a letter's baseline is its box's top and the ascent
    const size = parseFloat(getComputedStyle(ref.current).fontSize)
    const g = document.createElement('canvas').getContext('2d')
    g.font = `400 ${size}px "Jersey 10"`
    const asc = g.measureText('Hg').fontBoundingBoxAscent
    onMeasure(spans.map(box), { w: root.offsetWidth, h: root.offsetHeight, size, asc })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const chars = [...text]
  // the cursor takes no room on the line, as a caret takes none
  const cur = cursor ? <span className="wl-scr-cur rl-cur" aria-hidden="true" /> : null
  return (
    <div className={`wl-scr-msg rl-typed${hide ? ' is-hidden' : ''}`} ref={ref} style={{ '--fs': `${fs}cqw` }}>
      <span className="rl-lift" style={lift ? { transform: `translateY(${-lift * 1.02}em)` } : undefined}>
        {chars.map((c, i) => (
          <span key={i} data-i={i} className={i < n ? undefined : 'rl-rest'}>{i === n ? cur : null}{c}</span>
        ))}
        <span data-i={chars.length}>{n >= chars.length ? cur : null}</span>
      </span>
    </div>
  )
}

// a note's phone: the composer, mid letter, then sent (`still` holds the
// cursor lit, for a photograph). With `fx` the send is drawn by whoever
// holds the phone (the reel's own, its pixels gathered into the envelope):
// the key lit while pressed, and no lift and no `sent privately.` of its
// own. `hide`, `cursor`, `top`, `keys`, `seed`, `tint` and `screenStyle`
// are for a note that is not being written: a received one, read.
export function NoteScreen({
  who, t, times, sendAt, fs, onMeasure, quiet = true, still = false,
  fx = false, hide = false, cursor = null, top = null, keys = null, seed = null, tint = null, screenStyle = null,
}) {
  const n = typedAt(times, t)
  const last = n ? times[n - 1] : times[0]
  const since = t - sendAt
  const pressed = since >= 0 && since < 170
  const lifting = !fx && since >= 170 && since < 410
  const sent = !fx && since >= 410
  const lift = lifting ? 1 + Math.floor(((since - 170) / 240) * 3) : 0
  const compose = { l: { label: 'options' }, c: { glyph: 'heartO', label: '0' }, r: { label: 'send', open: pressed } }
  const lit = cursor != null ? cursor : still || (!lifting && blink(t, last))
  return (
    <Phone
      w={PW} tint={tint || who.tint} seed={seed || who.seed} mode="bare" square quiet={quiet} screenStyle={screenStyle}
      top={top || { counter: `${260 - n}/1`, icon: 'pen', name: who.to, dear: true, bat: 4 }} keys={sent ? {} : keys || compose}
    >
      {sent
        ? <ScreenNote glyph="env" title="sent privately." />
        : <Typed text={who.text} n={n} cursor={lit && !hide} fs={fs} lift={lift} hide={hide} onMeasure={onMeasure} />}
    </Phone>
  )
}
