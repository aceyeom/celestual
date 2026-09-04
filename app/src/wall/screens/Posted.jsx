// ── /berkeley/posted — IT IS UP ─────────────────────────────────────────────
//
// The one long animation in the build, and the only place it is worth the
// spend. Somebody has just named a person they never said anything to; the
// three seconds after that are not a loading state.
//
// Three beats, and each one is a claim:
//
//   0 · 0ms      THE READING. The card is still on the screen and it is being
//                looked at — this is the moment a real build spends calling the
//                classifier, and it is drawn rather than hidden. A wall that
//                screens every letter before publishing it has made a promise
//                to the person the letter is about, and the one second where
//                that promise is visibly kept is worth more than the second it
//                costs. It is also the honest shape: the alternative is a
//                progress bar that means nothing, or nothing at all and a
//                letter that appears to have gone up unread.
//   1 · 1100ms   IT PASSED, and the paper goes — the card contracts toward its
//                own centre, the light leaves it, and the sparkles converge on
//                one point that leaves with it
//   2 · 2150ms   the point lands: the name is on the wall, lit, among the
//                others, and the count is one higher
//
// Beat 2 matters more than it looks. The letter is genuinely written into the
// corpus here (data.js `write`), not mimed — so the wall behind this screen,
// the search, and the count in the masthead all really do carry it a moment
// later. A prototype that fakes its own payoff falls over the first time
// somebody at the demo table taps back.
//
// And then it stops. There is no offer on this screen and no next step in it:
// the way on is the tab that will be waiting at the bottom of the wall, which
// is one tap away and does not chase anybody down here to make its case.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Display, Label, Pill, Paper, Prose, Icon, Face } from '../parts.jsx'
import { Sparkle, Bloom } from '../art.jsx'
import { write, wall, liveCount, atHandle, dateline } from '../data.js'
import { getState, patch } from '../store.js'

const BEATS = [0, 1100, 2150]

export default function Posted({ go, reduce }) {
  const draft = getState().draft
  const [beat, setBeat] = useState(reduce ? 2 : 0)
  const timers = useRef([])

  // ── the screen, and it is real now ──
  // Written once, on mount. The request goes to celestual-wall-moderate, which
  // runs layer 1 again, calls the classifier, and writes the letter with the
  // status that came back. That is a round trip rather than a function call, so
  // the beats below are waiting on something now instead of performing a wait.
  //
  // Three outcomes, and two of them land here identically on purpose. A letter
  // held for a person to look at reads as published, because a screen that
  // distinguished them would be a way to find out what gets through by writing
  // until something does.
  const [row, setRow] = useState(undefined)   // undefined asking · null refused
  const [refused, setRefused] = useState(null)
  const sent = useRef(false)

  // Set on the way IN as well as cleared on the way out, and it has to be a ref
  // rather than a closure variable. React's StrictMode mounts, unmounts and
  // remounts every component in development: a flag captured in the effect's
  // closure is set false by the FIRST cleanup, the second mount takes the
  // `sent` guard and starts nothing, and the request that is still in flight
  // comes back to a screen that has decided it is dead. It sat on "read before
  // it goes up" forever and nothing in the console said why.
  //
  // This is the same trap Remove.jsx documents, and it was worth writing down
  // twice because it is invisible until somebody looks at the screen.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if (sent.current) return undefined
    sent.current = true
    if (!draft || !draft.to || !draft.body) { setRow(null); return undefined }

    ;(async () => {
      // The flyer code this session arrived with rides along, so the desk can
      // say which piece of paper a letter came off. It was never sent, and
      // the column was null on every row.
      const out = await write({ ...draft, source: getState().source || null })
      if (!alive.current) return
      if (!out?.ok) {
        setRefused(out?.error || 'network')
        setRow(null)
        // A refusal the server made is final and the draft goes. A network
        // that never answered is not a refusal, and three hundred characters
        // somebody just wrote are not thrown away over it.
        if (out?.error !== 'network') patch({ draft: null })
        return
      }
      if (out.status === 'rejected') {
        setRefused('screened')
        setRow(null)
        patch({ draft: null })
        return
      }
      const r = { id: out.id, to: draft.to, body: draft.body, at: Date.now() }
      const was = getState()
      patch({
        draft: null,
        written: [r.id, ...was.written].slice(0, 12),
        // and the name, so the account sheet can still list it after a reload
        // has taken the letter itself out of memory
        wroteTo: [r.to, ...(was.wroteTo || []).filter((h) => h !== r.to)].slice(0, 12),
      })
      setRow(r)
    })()
    return undefined
  }, [draft])

  useEffect(() => {
    if (reduce || !row) return
    BEATS.forEach((at, i) => {
      if (i === 0) return
      timers.current.push(setTimeout(() => setBeat(i), at))
    })
    return () => timers.current.forEach(clearTimeout)
  }, [reduce, row])

  // The strip: this name, and the four nearest it on the wall, so the landing
  // reads as joining something rather than as a confirmation dialogue.
  const strip = useMemo(() => {
    if (!row) return []
    const tiles = wall()
    const i = tiles.findIndex((t) => t.handle === row.to)
    // A letter held for a person is not on the index yet. Five other names
    // with none of them lit is not "yours is the newest"; nothing is.
    if (i < 0) return []
    return tiles.slice(i, i + 5)
  }, [row])

  // Still out. The card is not drawn yet because there is nothing to draw it
  // from: the id comes back with the answer.
  if (row === undefined) {
    return (
      <div className="wl-page wl-posted is-b0">
        <div className="wl-posted-air" />
        <div className="wl-posted-screen" role="status">
          <Sparkle size={9} twinkle={!reduce} delay={0} />
          <Sparkle size={9} twinkle={!reduce} delay={240} />
          <Sparkle size={9} twinkle={!reduce} delay={480} />
          <Label tone="dim">read before it goes up</Label>
        </div>
      </div>
    )
  }

  if (!row) {
    return (
      <div className="wl-page wl-posted">
        <div className="wl-posted-air" />
        <Display size="m">
          {refused === 'screened' ? <>It didn&rsquo;t go up.</>
            : refused === 'removed' ? <>That name is off<br />the wall.</>
            : refused === 'gate' || refused === 'no_session' ? <>Letters are written<br />by Berkeley.</>
            : refused === 'network' ? <>It did not<br />go through.</>
            : <>Nothing to put up.</>}
        </Display>
        {/* One sentence, and it names the thing rather than citing a policy.
            A refusal that says "this violates our guidelines" teaches nobody
            anything; the screen's own list is what somebody can act on, and
            they have already read it under the composer. */}
        {refused && refused !== 'network' ? (
          <Label tone="dim" className="wl-posted-count">
            {refused === 'screened' ? 'the screen held it back'
              : refused === 'removed' ? 'nobody can write to it now'
              : refused === 'gate' ? 'open the letters first'
              : refused === 'no_session' ? 'this device is no longer signed in. sign in again and it is still here'
              : 'it did not go through'}
          </Label>
        ) : refused === 'network' ? (
          <Label tone="dim" className="wl-posted-count">your letter is still here. try again</Label>
        ) : null}
        <div className="wl-gap" />
        <Pill tone="light" icon={<Icon name="write" size={17} />}
          onClick={() => go(refused === 'gate' || refused === 'no_session' ? 'gate' : 'write')}>
          {refused === 'gate' || refused === 'no_session' ? 'open them' : refused === 'network' ? 'try again' : 'write one'}
        </Pill>
      </div>
    )
  }

  return (
    <div className={`wl-page wl-posted is-b${beat}`}>
      <div className="wl-posted-air" />

      {/* beats 0–1 · the paper going */}
      <div className="wl-posted-stage">
        <Bloom size={300} opacity={beat >= 1 ? 0.44 : 0.12} className="wl-posted-bloom" />
        <div className="wl-posted-card">
          <Paper
            dateline={dateline(row.at)}
            crest={<Face handle={row.to} size={26} />}
            title={<span className="wl-letter-to">{atHandle(row.to)}</span>}
          >
            <Prose>{row.body}</Prose>
          </Paper>
          {/* The screen, said on the card it is reading. Three sparkles and a
              sentence — a status, not a spinner: nothing is being computed for
              the person waiting, and the pause belongs to the person the letter
              is about. The words are visible rather than hidden in a live
              region, because the whole reason to draw this beat is that it can
              be seen. */}
          <div className="wl-posted-screen" role="status">
            <Sparkle size={9} twinkle={!reduce} delay={0} />
            <Sparkle size={9} twinkle={!reduce} delay={240} />
            <Sparkle size={9} twinkle={!reduce} delay={480} />
            <Label tone="dim">read before it goes up</Label>
          </div>
        </div>
        <div className="wl-converge" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Sparkle key={i} size={10 + (i % 3) * 4} className={`wl-conv c${i}`} />
          ))}
        </div>
      </div>

      {/* beat 2 · it is on the wall */}
      <div className="wl-posted-land">
        <Display size="m">It&rsquo;s up.</Display>
        <Label tone="dim" className="wl-posted-count">{liveCount()} letters · yours is the newest</Label>
        <div className="wl-strip" aria-hidden="true">
          {strip.map((t) => (
            <span key={t.handle} className={`wl-strip-n${t.handle === row.to ? ' is-mine' : ''}`}>
              {atHandle(t.handle)}
            </span>
          ))}
        </div>
      </div>

      <div className="wl-push" />

      <div className="wl-posted-foot">
        {/* It says what you get, not where you came from. "Back to the wall"
            describes a direction; the wall now has this letter on it, and that
            is the thing worth naming on the one control that leaves here. */}
        <Pill tone="light" wide icon={<Icon name="wall" size={17} />} onClick={() => go('wall')}>
          see it on the wall
        </Pill>
      </div>
    </div>
  )
}
