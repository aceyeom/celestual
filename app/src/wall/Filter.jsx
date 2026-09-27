// ── the filter ──────────────────────────────────────────────────────────────
//
// The owner, 26 September: "Add a filtering mechanism, to see only Berkeley,
// newest, most liked, these kind of things. Make it clean."
//
// Four ways to look at the field, one at a time: every name, the newest,
// the most liked, and the ones with a letter from Berkeley (data.js, the
// filter, says what each one lets through and in what order). This file is
// how a person chooses one and how the field changes when they do.
//
// ── where it stands ─────────────────────────────────────────────────────────
// At the end of the search, inside the same strip of unlit LCD: the word for
// what the field is showing and the phone's down chevron after it, behind a
// seam of the strip's own dashed pixels. It is the phone's options key on
// the phone's find, which is where a phone put the choice of what a list
// shows. It was weighed as a row of four keys of its own under the search,
// and a second strip of chrome over the crowd is the thing the masthead has
// been cut down to one line to be rid of (DESIGN.md 8.2, Ear and Seek); and
// as a key in the bar, which is the brand's and the person's.
//
// The word is ash while the field shows every name and chalk while it shows
// fewer, so a filtered wall says so at the top of the screen without a
// second mark. It is never lit: the lit key on this screen is the act at its
// foot, `write a letter`.
//
// ── what it opens ───────────────────────────────────────────────────────────
// The strip's own panel, the way the search opens it: the choices arrive
// inside the glass under the same dashed seam, a phone's menu, the row under
// the finger or the arrows inverted and the choice that is on marked with
// the phone's own check. A choice puts the menu away and moves the field.
// The search and the menu are one panel and never both: pressing the key
// takes the caret out of the field, which folds the answers, and typing
// again puts the menu away.
//
// ── and how the field moves ─────────────────────────────────────────────────
// Calmly, and as one thing. The crowd goes out and a little smaller (220ms),
// and the new field comes up where it stands, from a hair larger, over half
// a second on the travel curve, seated afresh: its first name in the light
// and the rest outward in the filter's order (Hive.jsx, the tile). A field
// of two hundred screens sliding into new seats would be two hundred things
// moving to say one thing changed. Under reduced motion it is a cut.
//
// A filter that lets nothing through says what would be there, and offers
// the one thing that fills the glass again: every name.

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { PixIcon } from './screen.jsx'
import { FILTERS, wallFilter, setWallFilter, filtersOpen } from './data.js'
import './filter.css'

// how long the field takes to go out before the new one is seated, and
// how long the new one takes to come up (filter.css `wl-sift-in`)
export const SIFT_OUT_MS = 220
export const SIFT_IN_MS = 560

const wordOf = (key) => (FILTERS.find((f) => f.key === key) || FILTERS[0]).word

// ── the choosing, and the field's move ──
// `shown` is the filter the field is drawn for, `want` the one the key says
// (it moves on the press, a beat before the field does), `out` whether the
// field is on its way out, and `moved` whether it has changed at all since
// the wall was landed on, since the field's first frame is the veil's or the
// wall's own and not a filter's.
export function useSift(reduce) {
  const shown = wallFilter()
  // the choice made and not yet drawn, while the field goes out
  const [pending, setPending] = useState(null)
  const [moved, setMoved] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const pick = useCallback((key) => {
    clearTimeout(timer.current)
    if (key === wallFilter()) { setPending(null); return }
    if (reduce) { setWallFilter(key); return }
    setPending(key)
    timer.current = window.setTimeout(() => {
      setMoved(true)
      setPending(null)
      setWallFilter(key)
    }, SIFT_OUT_MS)
  }, [reduce])
  return { shown, want: pending || shown, out: pending !== null, moved, pick }
}

// ── the key, at the end of the search ──
export function FilterKey({ want, open, onToggle, menuId, ref = null }) {
  const on = want !== 'all'
  return (
    <button
      ref={ref} type="button"
      className={`wl-filter-key${on ? ' is-on' : ''}${open ? ' is-open' : ''}`}
      onClick={onToggle}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined}
      aria-label={`show ${wordOf(want)}, change what the wall shows`}
    >
      <span className="wl-filter-word">{wordOf(want)}</span>
      <PixIcon name="down" scale={2} className="wl-filter-chev" />
    </button>
  )
}

// ── the menu, in the strip's panel ──
// Keys as the search's: the arrows walk it, enter or space takes the row,
// escape puts it away and hands the focus back to the key.
export function FilterMenu({ want, menuId, onPick, onClose }) {
  const keys = filtersOpen()
  const list = FILTERS.filter((f) => keys.includes(f.key))
  const [active, setActive] = useState(() => Math.max(0, list.findIndex((f) => f.key === want)))
  const rows = useRef([])
  useEffect(() => { rows.current[active]?.focus({ preventScroll: true }) }, [active])
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % list.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + list.length) % list.length) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(list.length - 1) }
    else if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') e.preventDefault(); onClose(e.key === 'Escape') }
  }
  return (
    <div className="wl-seek-found wl-filter-menu" role="listbox" id={menuId} aria-label="what the wall shows" onKeyDown={onKeyDown}>
      {list.map((f, i) => (
        <button
          type="button" role="option" key={f.key} aria-selected={f.key === want}
          ref={(el) => { rows.current[i] = el }}
          tabIndex={i === active ? 0 : -1}
          className={`wl-filter-row${i === active ? ' is-active' : ''}${f.key === want ? ' is-on' : ''}`}
          onPointerEnter={() => setActive(i)}
          onClick={() => onPick(f.key)}
        >
          <span className="wl-filter-row-word">{f.word}</span>
          {f.key === want ? <PixIcon name="check" scale={2} className="wl-filter-check" /> : null}
        </button>
      ))}
    </div>
  )
}

// ── the key and the menu, held together ──
// `open` is the menu. It is put away by a choice, by escape, by a press
// anywhere outside the strip, and by the caret going back into the search.
export function useFilterMenu() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const toggle = useCallback(() => setOpen((o) => !o), [])
  const close = useCallback(() => setOpen(false), [])
  return { open, menuId, toggle, close, setOpen }
}

// A press outside `el` puts the menu away. On the document and not on an
// overlay: nothing invisible is ever laid over the faces to catch it, and
// the press still reaches the face it landed on.
export function useOutside(el, on, onOut) {
  useEffect(() => {
    if (!on) return undefined
    const down = (e) => { if (el.current && !el.current.contains(e.target)) onOut() }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [el, on, onOut])
}

// ── nothing under this filter ──
// Over the middle of the empty glass, a phone's note on an unlit panel:
// what would be here, and the one thing that fills the glass again.
const NONE = {
  new: 'nothing new this week.',
  liked: 'no letter has a heart yet.',
  berkeley: 'no letters from Berkeley yet.',
}
export function FilterNone({ filter, onAll }) {
  return (
    <div className="wl-filter-none" role="status">
      <p className="wl-filter-none-h">{NONE[filter] || 'nothing here yet.'}</p>
      <button type="button" className="wl-filter-none-all" onClick={onAll}>see every name</button>
    </div>
  )
}
