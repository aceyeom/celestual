// ── /berkeley/find — THE SEARCH ─────────────────────────────────────────────
//
// For the one person in twenty who came here looking for themselves, and
// the nineteen who came looking for one other name: which between them is
// nearly everybody who scans the wall off a flyer. It is a sheet over the
// wall, not a screen instead of it, so the names stay visible behind the
// results the whole time — which quietly says that the thing you are
// searching is right there.
//
// It used to open from a 40px glass in the corner of the bar, and then from
// the wall's own field under the ear. That field answers in place now
// (screens/Wall.jsx `Seek`): it opens downward into its own glass panel, so
// the common case — one name, found and pressed — never leaves the wall.
// This sheet is what `/find` still is: a link straight into the search, and
// the fuller answer for somebody who arrived looking rather than browsing.
// There is no heading over the field: "Look for a name." stood in the Didone
// over a field whose placeholder said the same thing, one sentence twice,
// and on a phone with the keyboard up those fifty pixels are a row of
// results.
//
// Four behaviours worth naming:
//
//   · It answers from the FIRST CHARACTER, the way a search box on a social
//     app does, and since 0054 it hears a NAME as well as a handle: the
//     query goes to the server as typed, spaces and accents and all, and the
//     server matches the handle, the handle with its dots out, the
//     resolver's display name and the name a letter was written to (0053),
//     then, from the third character, a misspelling by trigram and a sound
//     alike by metaphone. The server ranks it: an exact hit first, then a
//     prefix, then a contains, then the near misses, so a person who types
//     their own handle precisely gets their own row and not a list of
//     near-misses above it. Each row arrives with the resolver's name and
//     face already on it, one request for the whole list.
//   · Before anybody has typed, the sheet shows the names most recently
//     written to, in the index's own order. A search sheet that opens onto a
//     void teaches somebody that there is nothing to find. It used to show
//     the six names carrying the most letters, under "written to most", and
//     with the search promoted to the first thing on the wall that list was
//     the first list everybody saw, which is a rank of people with a label on
//     it (docs/WALL-FEATURES.md, G6). Recency is a fact about a letter;
//     "most" is a claim about a person.
//
//     The caption over it has gone too. "on the wall" stood at the head of
//     the list, on the wall, under the wall's own field, over names the wall
//     had just answered with — three words to say where you already are. The
//     rows are people and they say so themselves.
//   · Finding nothing is not a dead end, it is not a sign-up, and it is not a
//     letter to yourself. Nobody is asked to leave a handle, register an
//     interest, share anything or wait for a notification: the wall has no
//     accounts and cannot tell anybody anything later, and a person who has
//     just found nothing under their own name is the last person who should
//     be handed the door to share. What stands there is a fact about the
//     index, and the one thing the wall can honestly offer: the composer,
//     open on its own first question, "Someone at Berkeley you can't
//     forget." Under it, quieter, the letter TO the name that was typed, for
//     the one who was looking for a friend. That line is left out when the
//     name is a handle this browser has itself proved through the DM code,
//     which is the only fact about the searcher the wall honestly holds:
//     nobody is asked "is this you", and nothing is recorded.
//   · It ends on the results. Two capsules used to stand under them on a
//     hairline, "write instead" and "take a name off", and both were doors
//     to other rooms on a sheet whose one job is to find a name: the word in
//     the bar is the composer, and the way off the wall stands under the
//     flag on every letter, which is where a person who has found their name
//     is standing when they want it gone.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet, SheetHead, HandleField, Label, PersonRow, Pill, PillTag } from '../parts.jsx'
import { search, wall, loadWall, normHandle, validHandle, atHandle, nameKey } from '../data.js'
import { getState, patch } from '../store.js'
import { toWrite, verified } from '../auth.js'

const FRESH = 6

export default function Find({ go, back, rev }) {
  const [value, setValue] = useState(() => getState().query || '')
  // as typed, trimmed: what the server hears (0054)
  const q = value.trim().replace(/\s+/g, ' ')
  // and the handle shape of it, for the exact check and the letter's address
  const h = normHandle(value)
  // whether what was typed could only be a name: a space, or a character no
  // handle carries. It decides how the echo is set and whether the quiet
  // line offers a letter to a handle
  const nameShaped = q.length > 0 && (q.includes(' ') || normHandle(q).length < q.replace(/^@+/, '').length)

  // The names most recently written to: the index's own order, newest
  // first, and no rank in it.
  const fresh = useMemo(() => wall().slice(0, FRESH), [rev]) // eslint-disable-line react-hooks/exhaustive-deps

  // The search is the server's, so it is a request rather than a filter.
  // Debounced, because a request per keystroke over a field is a request
  // per keystroke, and the last one in is the only one that may set state: a
  // slow answer for "sof" must never land on top of a fast one for "sofia".
  const [found, setFound] = useState(null)
  const [asking, setAsking] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    if (q.length < 1) { setFound(null); setAsking(false); return }
    const seq = ++latest.current
    setAsking(true)
    const t = setTimeout(async () => {
      const rows = await search(q)
      if (seq !== latest.current) return
      setFound(rows)
      setAsking(false)
    }, 120)
    return () => clearTimeout(t)
  }, [q])

  // The wall's newest rows are what the empty state draws, so it has to be
  // loaded even when somebody opened this sheet directly off a link.
  useEffect(() => { loadWall() }, [])

  const hits = q.length >= 1 ? (found || []) : fresh
  const exact = q.length >= 1 && hits.length > 0
    && (hits[0].handle === h || (hits[0].kind === 'name' && hits[0].handle === nameKey(q)))

  useEffect(() => { patch({ query: q }) }, [q])

  // The one fact about the searcher this browser holds: a handle it proved
  // itself, through the DM code. Nothing is asked and nothing is written.
  const own = !!h && verified().some((x) => normHandle(x) === h)

  // Enter opens the exact match if there is one, and otherwise the first
  // row. Both are one keystroke, and neither asks who anybody is.
  const commit = () => {
    if (hits.length) go('letter', hits[0].handle)
  }
  // The composer, on its own first question, with nothing filled in.
  const writeNew = () => { patch({ draft: null }); toWrite(go) }
  // And the letter to the name that was typed, for the one who searched a friend.
  const writeTo = () => toWrite(go, h)

  return (
    <Sheet onClose={back} tall labelledBy="wl-find-h">
      <div className="wl-sheet-in wl-find">
        <SheetHead onClose={back} label="back to the wall" />
        <h2 id="wl-find-h" className="wl-sr">look for a name</h2>

        <div className="wl-find-field">
          <HandleField
            kind="search" value={value} onChange={setValue} onSubmit={commit}
            autoFocus focusOnTouch size="lg" placeholder="look for a name" label="look for a name"
          />
        </div>

        <div className="wl-find-results" role="region" aria-live="polite">
          {/* A person per row: the face and the name the resolver has, or the
              name a letter was written to, the key under it with how many
              letters, and the way in. The same row the sky draws, so a person
              looks the same on both surfaces. */}
          {hits.map((t) => (
            <PersonRow
              key={t.handle}
              lit={exact && t === hits[0]}
              handle={t.handle}
              size={36}
              meta={t.count > 1 ? `${t.count} letters` : null}
              action={<PillTag tone="ghost">read</PillTag>}
              onClick={() => go('letter', t.handle)}
            />
          ))}

          {q.length >= 1 && asking && !hits.length && (
            <Label tone="dim" className="wl-find-hint">looking</Label>
          )}

          {q.length >= 1 && !asking && !hits.length && (
            <div className="wl-find-empty">
              <Label tone="dim">nothing on the wall under</Label>
              <p className={`wl-find-echo${nameShaped ? ' is-name' : ''}`}>{nameShaped ? q : (atHandle(h) || q)}</p>
              <Pill tone="light" wide onClick={writeNew}>write a letter</Pill>
              {!nameShaped && validHandle(h) && !own ? (
                <button type="button" className="wl-quiet wl-find-to" onClick={writeTo}>write to {atHandle(h)}</button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
