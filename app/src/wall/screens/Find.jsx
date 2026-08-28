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
//   · Finding nothing does not happen here. The rows go quiet and a single
//     door appears, and stepping through it is a deliberate act — because the
//     screen on the other side (screens/None.jsx) is the most important one in
//     the build and it should not be somewhere you got dumped by a filter.

import { useEffect, useMemo, useState } from 'react'
import { Sheet, HandleField, Label, Row, Pill, PillTag, ArrowLink, Display } from '../parts.jsx'
import { Mark, Sparkle } from '../art.jsx'
import { search, wall, lettersFor, normHandle, validHandle, ago, atHandle } from '../data.js'
import { getState, patch } from '../store.js'

export default function Find({ go, back }) {
  const [value, setValue] = useState(() => getState().query || '')
  const q = normHandle(value)
  // Empty is not blank. Before anybody has typed, the sheet shows the names
  // carrying the most letters — the wall's own heaviest rows. A search sheet
  // that opens onto a void teaches somebody that there is nothing to find,
  // which is the exact opposite of what this surface is for.
  const top = useMemo(() => wall().slice().sort((a, b) => b.count - a.count || b.at - a.at).slice(0, 6), [])
  const hits = useMemo(() => (q.length >= 2 ? search(q) : top), [q, top])
  const exact = q.length >= 2 && hits.length > 0 && hits[0].handle === q

  useEffect(() => { patch({ query: q }) }, [q])

  const commit = () => {
    if (!validHandle(q)) return
    if (exact) { go('letter', lettersFor(q)[0].id); return }
    // Not on the wall. That is the interesting outcome, and it gets its own
    // screen rather than an empty list with a sad face in it.
    patch({ handle: q })
    go('none')
  }

  return (
    <Sheet onClose={back} tall labelledBy="wl-find-h">
      <div className="wl-sheet-in wl-find">
        <Display size="s" as="h2" id="wl-find-h">Look for a name.</Display>

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
              <Label tone="dim">nothing on the wall under</Label>
              <p className="wl-find-echo">{atHandle(q)}</p>
              {validHandle(q) && <Pill tone="light" wide onClick={commit}>that one is mine</Pill>}
            </div>
          )}
        </div>

        <div className="wl-find-foot">
          <ArrowLink tone="quiet" onClick={() => go('write')}>write one instead</ArrowLink>
        </div>
      </div>
    </Sheet>
  )
}
