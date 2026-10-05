// ── the wheatpaste ──────────────────────────────────────────────────────────
// Eighteen by twenty four inches, for a hoarding: the line at a size read
// from across the street, three unsent drafts under it with one of them lit
// and the other two with their backlight down, the lockup, and along the
// foot a row of tabs to tear off, the way a lost cat is looked for. Each tab
// is a key of the phone's pad with the address running down it, so the
// twelve of them are the keypad, torn into strips.
//
// On a grid of fifteen units across, sixty pixels each, inside the trim.
// The file carries a bleed past the trim on every side (a little over an
// eighth of an inch, on whole device pixels), the black and the cut lines
// running on into it, so the poster can be trimmed to its edge.

import { Board, Phone, Lockup, Light } from '../kit.jsx'
import { Tabs } from '../parts/print.jsx'

const W = 900
const H = 1200
const B = 6.5
const U = 60
const BASE = 772
const TABS = 950

const DRAFTS = [
  { name: 'jules', tint: 'negative', seed: 'paste-jules', w: 200, dim: true, fs: 15.6, text: 'do you still sleep\non the left side?' },
  { name: 'noah', tint: 'rose', seed: 'paste-noah', w: 300, fs: 12.6, text: 'you said we’d see\nthe cherry blossoms\nnext year.\nit’s next year.' },
  { name: 'ana', tint: 'negative', seed: 'paste-ana', w: 200, dim: true, fs: 12.8, text: 'i saw your dog\nat the park today.\nhe remembered me.' },
]
const AR = 1.16
const GAP = (W - 2 * U - DRAFTS.reduce((a, d) => a + d.w, 0)) / 2

function Poster() {
  let x = U
  return (
    <Board w={W + 2 * B} h={H + 2 * B} grain={0} className="pr-paste">
      <div style={{ position: 'absolute', left: B, top: B, width: W, height: H }}>
        <h1 className="pr-head" style={{ left: U - 4, top: U - 16 }}>
          nothing happens<br />unless it&rsquo;s<br /><em>mutual.</em>
        </h1>
        <Light x={W / 2} y={BASE - 174} size={760} tint="rose" strength={0.42} />
        {DRAFTS.map((d) => {
          const left = x
          x += d.w + GAP
          return (
            <Phone
              key={d.name} w={d.w} tint={d.tint} seed={d.seed} name={d.name} text={d.text} square
              className={d.dim ? 'pr-dim' : ''}
              screenStyle={{ '--q-ar': String(AR), '--pr-fs': `${d.fs}cqw` }}
              style={{ position: 'absolute', left, top: BASE - Math.round(d.w * AR) }}
            />
          )
        })}
        <div className="pr-sign" style={{ left: U, right: U, top: BASE + U }}>
          <Lockup cell={2} />
          <span>write a letter. put it up.</span>
        </div>
        <Tabs w={W} top={TABS} h={H - TABS} bleed={B} />
      </div>
    </Board>
  )
}

export default { id: 'print-wheatpaste', w: W + 2 * B, h: H + 2 * B, scale: 6, title: 'the wheatpaste', format: 'print, 18 by 24 in, with bleed', order: 85, Poster }
