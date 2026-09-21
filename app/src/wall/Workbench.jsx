// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE WORKBENCH — the knobs, on the surface they turn                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// A design system you can only evaluate by rebuilding is a design system
// nobody evaluates. This is the other way round: the five styles, the four
// layouts and the three knobs, on top of the live wall, so a choice is made
// against the real type at the real size over the real crowd rather than
// against a swatch.
//
// ── it is not part of the product ───────────────────────────────────────────
// `?design` in the address asks for it and nothing else does (design.js
// `panelWanted`). A person who scanned a card off a table never sees it, and
// it is mounted, not merely hidden, so the whole component is absent from
// every ordinary visit.
//
// ── and it does not wear what it is wearing ─────────────────────────────────
// Every rule in workbench.css is a literal value, and not one of them reads a
// token from system.css. That looks like a violation of everything the token
// layer is for, and it is the one place the violation is right: a panel that
// restyled itself as you turned the style would be a panel you could not read
// while making the comparison it exists for — labels going uppercase, corners
// going square, the type going monospace, all while you are trying to judge
// whether the corners should go square. The control surface has to hold still
// while the thing it controls moves.
//
// ── what leaves the tab ─────────────────────────────────────────────────────
// Two things, and between them they are why this is a design tool and not a
// toy. The LINK is the design as an address, which is a design two people can
// be looking at while they talk about it. The CSS is the design as the four
// lines that put it in the build, so the answer to "I like that one" is a
// paste rather than a conversation about which slider was where.

import { useEffect, useRef, useState } from 'react'
import './workbench.css'
import { STYLES, LAYOUTS, TUNERS, DEFAULT, save, forget, toQuery, toCss } from './design.js'

export default function Workbench({ design, onChange }) {
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState('')
  const timer = useRef(0)

  // Every turn is remembered, so a reload during a review comes back to what
  // was being looked at rather than to the defaults.
  useEffect(() => { save(design) }, [design])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // The address is rewritten as the design changes, in the history rather
  // than through a navigation: the bar is where a person copies a design
  // from, so it has to be true without anybody pressing anything.
  useEffect(() => {
    const q = toQuery(design)
    const url = window.location.pathname + (q ? `${q}&design` : '?design') + window.location.hash
    window.history.replaceState(window.history.state, '', url)
  }, [design])

  const set = (patch) => onChange({ ...design, ...patch })

  const copy = (what, text) => {
    const done = () => {
      setCopied(what)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(''), 1600)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => {})
    else done()
  }

  const link = window.location.href
  const css = toCss(design)
  const style = STYLES.find((s) => s.slug === design.style)
  const layout = LAYOUTS.find((l) => l.slug === design.layout)

  if (!open) {
    return (
      <button type="button" className="wb-tab" onClick={() => setOpen(true)}>
        design
      </button>
    )
  }

  return (
    <aside className="wb" aria-label="design workbench">
      <header className="wb-head">
        <span className="wb-h">design</span>
        <button type="button" className="wb-x" onClick={() => setOpen(false)} aria-label="put the panel away">×</button>
      </header>

      <div className="wb-body">
        {/* ── the voice ── */}
        <section className="wb-sec">
          <h3 className="wb-lab">style · the voice</h3>
          <div className="wb-grid">
            {STYLES.map((s) => (
              <button
                key={s.slug} type="button"
                className={`wb-opt${design.style === s.slug ? ' is-on' : ''}`}
                onClick={() => set({ style: s.slug })}
              >
                <span className="wb-opt-n">{s.name}</span>
                <span className="wb-opt-r">{s.roles.display} · {s.roles.body} · {s.roles.label}</span>
              </button>
            ))}
          </div>
          {style && <p className="wb-note">{style.note}</p>}
        </section>

        {/* ── the arrangement ── */}
        <section className="wb-sec">
          <h3 className="wb-lab">layout · the arrangement</h3>
          <div className="wb-grid">
            {LAYOUTS.map((l) => (
              <button
                key={l.slug} type="button"
                className={`wb-opt${design.layout === l.slug ? ' is-on' : ''}`}
                onClick={() => set({ layout: l.slug })}
              >
                <span className="wb-opt-n">{l.name}</span>
              </button>
            ))}
          </div>
          {layout && <p className="wb-note">{layout.note}</p>}
        </section>

        {/* ── the three knobs ── */}
        <section className="wb-sec">
          <h3 className="wb-lab">scales</h3>
          {TUNERS.map((t) => (
            <label key={t.key} className="wb-knob">
              <span className="wb-knob-n">{t.name}</span>
              <input
                type="range" min={t.min} max={t.max} step={t.step}
                value={design[t.key]}
                onChange={(e) => set({ [t.key]: Number(e.target.value) })}
              />
              <span className="wb-knob-v">{Number(design[t.key]).toFixed(2)}×</span>
            </label>
          ))}
        </section>

        {/* ── what leaves the tab ── */}
        <section className="wb-sec">
          <h3 className="wb-lab">take it with you</h3>
          <div className="wb-acts">
            <button type="button" className="wb-act" onClick={() => copy('link', link)}>
              {copied === 'link' ? 'link copied' : 'copy the link'}
            </button>
            <button type="button" className="wb-act" onClick={() => copy('css', css)}>
              {copied === 'css' ? 'css copied' : 'copy the css'}
            </button>
            <button
              type="button" className="wb-act is-quiet"
              onClick={() => { forget(); onChange({ ...DEFAULT }) }}
            >
              as built
            </button>
          </div>
          <pre className="wb-css">{css}</pre>
        </section>
      </div>
    </aside>
  )
}
