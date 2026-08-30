// ── /beta/find — THE SEARCH ─────────────────────────────────────────────────
//
// The corner button, for the one person in twenty who came here looking for
// themselves rather than browsing. It is a sheet over the wall, not a screen
// instead of it, so the names stay visible behind the results the whole time —
// which quietly says that the thing you are searching is right there.
//
// Two behaviours worth naming:
//
//   · It matches on CONTAINS, not on equals. Somebody who half-remembers a
//     handle, or types the name without the dots, still lands somewhere. An
//     exact hit is always sorted first, so a person who types their own handle
//     precisely gets their own row and not a list of near-misses above it.
//   · Finding nothing is not a dead end and it is not a sign-up. Nobody is
//     asked to leave a handle, register an interest or wait for a
//     notification: the wall has no accounts and cannot tell anybody anything
//     later. What it offers instead is the only thing it can honestly offer —
//     that name is free, be the first to put a letter under it.

import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetHead, HandleField, Label, Row, Pill, PillTag, Display, Icon } from '../parts.jsx'
import { Mark, Sparkle } from '../art.jsx'
import { search, wall, lettersFor, normHandle, validHandle, ago, atHandle } from '../data.js'
import { getState, patch } from '../store.js'

export default function Find({ go, back, rev }) {
  const [value, setValue] = useState(() => getState().query || '')
  const q = normHandle(value)
  // Empty is not blank. Before anybody has typed, the sheet shows the names
  // carrying the most letters — the wall's own heaviest rows. A search sheet
  // that opens onto a void teaches somebody that there is nothing to find,
  // which is the exact opposite of what this surface is for.
  const top = useMemo(() => wall().slice().sort((a, b) => b.count - a.count || b.at - a.at).slice(0, 6), [rev])
  const hits = useMemo(() => (q.length >= 2 ? search(q) : top), [q, top])
  const exact = q.length >= 2 && hits.length > 0 && hits[0].handle === q

  useEffect(() => { patch({ query: q }) }, [q])

  // Enter opens the exact match if there is one, and otherwise starts a letter
  // to whatever was typed. Both are one keystroke, and neither asks who anybody
  // is.
  const commit = () => {
    if (!validHandle(q)) return
    if (exact) { go('letter', lettersFor(q)[0].id); return }
    go('write', q)
  }

  return (
    <Sheet onClose={back} tall labelledBy="wl-find-h">
      <div className="wl-sheet-in wl-find">
        {/* The same header row every sheet opens on. It used to set the
            heading and the close mark on one line, which put a 26px Didone and
            a 36px circle on the same baseline and made the title read as a
            label on the button. The title now stands under the row, at full
            size, with nothing beside it. */}
        <SheetHead onClose={back} label="back to the wall" />

        <Display size="s" as="h2" id="wl-find-h" className="wl-find-h">Look for a name.</Display>

        <div className="wl-find-field">
          <HandleField
            value={value} onChange={setValue} onSubmit={commit}
            autoFocus size="lg" placeholder="yourhandle"
          />
        </div>

        <div className="wl-find-results" role="region" aria-live="polite">
          {q.length < 2 && (
            <Label tone="dim" className="wl-find-hint">
              <Sparkle size={9} /> written to most
            </Label>
          )}

          {hits.map((t) => {
            const list = lettersFor(t.handle)
            return (
              <Row
                key={t.handle}
                lit={t.handle === q}
                mark={<Mark handle={t.handle} size={30} lit={t.handle === q} />}
                handle={t.handle}
                meta={`${t.count === 1 ? 'one letter' : `${t.count} letters`} · ${ago(list[0].at)}`}
                action={<PillTag tone="ghost">read</PillTag>}
                onClick={() => go('letter', list[0].id)}
              />
            )
          })}

          {q.length >= 2 && !hits.length && (
            <div className="wl-find-empty">
              <Label tone="dim">nobody has written to</Label>
              <p className="wl-find-echo">{atHandle(q)}</p>
              {validHandle(q) && (
                <Pill tone="light" wide icon={<Icon name="write" size={17} />} onClick={commit}>
                  be the first
                </Pill>
              )}
            </div>
          )}
        </div>

        {/* Two ways on from an empty search, and neither of them is a way
            back: the X in the corner is the way back, on every sheet, and it
            does not need a sentence underneath it saying so. */}
        <div className="wl-find-foot">
          <Pill tone="ghost" icon={<Icon name="write" size={15} />} onClick={() => go('write')}>
            write one instead
          </Pill>
          <Pill tone="ghost" onClick={() => go('remove', q.length >= 2 ? q : '')}>
            take a name off
          </Pill>
        </div>
      </div>
    </Sheet>
  )
}
