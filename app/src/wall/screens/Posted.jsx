// ── /berkeley/posted — IT IS UP ─────────────────────────────────────────────
//
// The one long animation in the build, and the only place it is worth the
// spend. Somebody has just named a person they never said anything to; the
// three seconds after that are not a loading state.
//
// Three beats, and each one is a claim:
//
//   0 · the reading    The card is on the screen from the first frame, drawn
//                      from the draft, with the mark poured above it and a
//                      light passing over the paper: the letter is being read.
//                      This is the beat a real build spends calling the
//                      classifier, and it is drawn rather than hidden. A wall
//                      that screens every letter before publishing it has made
//                      a promise to the person the letter is about, and the
//                      second where that promise is visibly kept is worth more
//                      than the second it costs. It used to be an empty page
//                      with three sparkles on it while the request was out,
//                      because the card was not drawn until the id came back;
//                      the words were already here, and the id changes nothing
//                      about them.
//   1 · the seal       It passed. The metal brightens, the paper lifts a
//                      little toward it, its corners go round, and the card
//                      closes into a disc: the same object the letter opens
//                      out of on the wall, run the other way. Then the disc
//                      falls to the wall below.
//   2 · the landing    The disc lands among the names nearest it on the wall,
//                      comes up past its size and settles, one ring leaves it,
//                      and its neighbours are nudged aside and close back, each
//                      a beat after the one before: the ripple a new name
//                      sends through the crowd, at the size of a card. "It's
//                      up." The count is one higher.
//
// Beat 2 matters more than it looks. The letter is genuinely written into the
// corpus here (data.js `write`), not mimed, so the wall behind this screen, the
// search and the count in the ear all really do carry it a moment later, and
// on the way back the wall sends the same pulse out from that name's real disc
// (screens/Wall.jsx, Hive.jsx `pulse`).
//
// ── and when it did not go up ───────────────────────────────────────────────
// The screen refuses a letter on the way in only for the six things it is
// written to refuse (celestual-wall-moderate), and a letter it is merely
// unsure of goes up flagged for a person to look at. So a refusal here is
// rare, and it is told the truth: the card stays on the screen, the mark
// goes quiet, one sentence says what the screen read it as (moderate.js
// `said`), and the writer is handed their own words back to change. The
// draft is kept for exactly that. It used to say "the screen held it back"
// and throw the letter away, which was a locked door with no reason on it.
//
// And then it stops. There is no offer on this screen and no next step in it:
// the way on is the tab that will be waiting at the bottom of the wall, which
// is one tap away and does not chase anybody down here to make its case.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Display, Pill, Paper, Prose, OpenFace, Addressee, Face } from '../parts.jsx'
import { Bloom, Sparkle } from '../art.jsx'
import LiquidMark from '../LiquidMark.jsx'
import { write, wall, liveCount, dateline, normHandle } from '../data.js'
import { getState, patch } from '../store.js'
import { said } from '../moderate.js'

// The reading is shown for at least this long, whatever the request takes: a
// screen that answered in two hundred milliseconds would otherwise seal a
// letter nobody saw being read. The seal is how long the card takes to close
// into the disc and fall, and the wall receives it a little before the end,
// so the pop starts as the disc arrives rather than after it has stopped.
// Once the name has settled, the room the card was read in closes and the
// wall comes up to stand under the mark.
const READ_MIN_MS = 1300
const SEAL_MS = 820
const LAND_AT_MS = 640
const SETTLE_AT_MS = 1000
const EASE_SEAL = 'cubic-bezier(0.32, 0.72, 0, 1)'
const RADIUS = 18   // wall.css --r-card

// The names either side of this one on the wall, as the little wall the disc
// lands in: up to two before and two after, with this one in the middle
// whatever the counts, so the disc always lands under the card it was.
// Nothing is lit but the arrival.
function around(handle) {
  const tiles = wall()
  const i = tiles.findIndex((t) => t.handle === handle)
  if (i < 0) return null
  const one = (t, k) => ({ handle: t.handle, k })
  return {
    before: tiles.slice(Math.max(0, i - 2), i).map((t, j, a) => one(t, a.length - j)),
    after: tiles.slice(i + 1, i + 3).map((t, j) => one(t, j + 1)),
  }
}

export default function Posted({ go, reduce }) {
  const draft = getState().draft
  const [beat, setBeat] = useState(reduce ? 2 : 0)
  const timers = useRef([])

  // ── the screen, and it is real ──
  // Written once, on mount. The request goes to celestual-wall-moderate, which
  // runs layer 1 again, calls the classifier, and writes the letter with the
  // status that came back. That is a round trip rather than a function call, so
  // the beats below are waiting on something now instead of performing a wait.
  //
  // A letter the classifier passed and a letter it flagged for a person both
  // come back as live, and both land here identically on purpose: a screen
  // that distinguished them would be a way to find out what gets through by
  // writing until something does.
  const [row, setRow] = useState(undefined)   // undefined asking · null refused
  const [refused, setRefused] = useState(null)
  const [reasons, setReasons] = useState([])
  const sent = useRef(false)

  // Set on the way IN as well as cleared on the way out, and it has to be a ref
  // rather than a closure variable. React's StrictMode mounts, unmounts and
  // remounts every component in development: a flag captured in the effect's
  // closure is set false by the FIRST cleanup, the second mount takes the
  // `sent` guard and starts nothing, and the request that is still in flight
  // comes back to a screen that has decided it is dead. It sat on "read before
  // it goes up" forever and nothing in the console said why.
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if (sent.current) return undefined
    sent.current = true
    if (!draft || !draft.to || !draft.body) { setRow(null); return undefined }
    const t0 = performance.now()

    ;(async () => {
      // The flyer code this session arrived with rides along, so the desk can
      // say which piece of paper a letter came off.
      const out = await write({ ...draft, source: getState().source || null })
      if (!alive.current) return
      if (!out?.ok) {
        setRefused(out?.error || 'network')
        setRow(null)
        // A refusal the server made is final and the draft goes, except the
        // one that is about the letter: a network that never answered is not
        // a refusal, and three hundred characters somebody just wrote are not
        // thrown away over it.
        if (out?.error !== 'network') patch({ draft: null })
        return
      }
      if (out.status === 'rejected') {
        // The screen refused it, and the writer is told what it read it as
        // and keeps the words: the composer opens on them from "change it".
        setReasons(Array.isArray(out.reasons) ? out.reasons.map(String) : [])
        setRefused('screened')
        setRow(null)
        // remembered as read, so the wall does not raise the same notice
        // about a refusal that was answered here
        if (out.id) patch({ noticed: { ...(getState().noticed || {}), [out.id]: true } })
        return
      }
      const r = { id: out.id, to: normHandle(draft.to), body: draft.body, at: Date.now() }
      const was = getState()
      patch({
        draft: null,
        written: [r.id, ...was.written].slice(0, 12),
        // and the name, so the account sheet can still list it after a reload
        // has taken the letter itself out of memory
        wroteTo: [r.to, ...(was.wroteTo || []).filter((h) => h !== r.to)].slice(0, 12),
        // and the wall sends one pulse out from this name on the way back
        justPosted: r.to,
      })
      setRow(r)
      // the reading has been on the screen for as long as the request took;
      // it stays for the rest of its floor, then the seal
      if (reduce) { setBeat(2); return }
      const wait = Math.max(0, READ_MIN_MS - (performance.now() - t0))
      timers.current.push(setTimeout(() => { if (alive.current) setBeat(1) }, wait))
    })()
    return undefined
  }, [draft, reduce])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // The little wall, once the answer is in: this name among the four nearest
  // it on the wall. Read once the index has moved, which `write` waits for.
  const strip = useMemo(() => (row ? around(row.to) : null), [row])

  // ── the settling ──
  // A beat after the name has landed, the room the card was read in closes:
  // the stage is given its own height and then none, so the landing glides
  // up to stand under the mark rather than under an empty room. Under
  // reduced motion it starts there.
  const stageEl = useRef(null)
  const [settled, setSettled] = useState(!!reduce)
  useEffect(() => {
    if (beat !== 2 || settled) return undefined
    const t = setTimeout(() => {
      const el = stageEl.current
      if (el) { el.style.height = `${el.offsetHeight}px`; void el.offsetHeight }
      if (alive.current) setSettled(true)
    }, SETTLE_AT_MS)
    return () => clearTimeout(t)
  }, [beat, settled])

  // ── the seal ──
  // Before the first paint of beat 1: the card is measured where it stands
  // and the disc it is going to is measured where it will be (the landing
  // is in the document at nothing from the first frame, so the target is
  // real), and one transform runs the card up a little toward the mark, round
  // at the corners, and down into the disc, dissolving over the last stretch
  // so what arrives is the disc and not a small paper. The wall receives it
  // a beat before the flight ends.
  const cardBox = useRef(null)
  const mineEl = useRef(null)
  useLayoutEffect(() => {
    if (beat !== 1) return undefined
    const el = cardBox.current
    const to = mineEl.current
    if (!el || !to || !el.animate) { setBeat(2); return undefined }
    const c = el.getBoundingClientRect()
    const t = to.getBoundingClientRect()
    if (!c.width || !t.width) { setBeat(2); return undefined }
    const s = t.width / c.width
    const ox = t.left + t.width / 2 - (c.left + c.width / 2)
    const oy = t.top + t.height / 2 - (c.top + c.height / 2)
    const paper = el.querySelector('.wl-paper') || el
    const a = el.animate([
      { transform: 'none', opacity: 1 },
      { transform: `translate3d(${(ox * 0.12).toFixed(1)}px, -22px, 0) scale(0.94)`, opacity: 1, offset: 0.26 },
      { opacity: 1, offset: 0.78 },
      { transform: `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0) scale(${s.toFixed(4)})`, opacity: 0 },
    ], { duration: SEAL_MS, easing: EASE_SEAL, fill: 'forwards' })
    const b = paper.animate([
      { borderRadius: `${RADIUS}px` },
      { borderRadius: `${RADIUS}px`, offset: 0.2 },
      { borderRadius: '50%', offset: 0.6 },
      { borderRadius: '50%' },
    ], { duration: SEAL_MS, easing: EASE_SEAL, fill: 'forwards' })
    const land = setTimeout(() => { if (alive.current) setBeat(2) }, LAND_AT_MS)
    // a tab that goes to the background stops handing out frames, and a
    // letter that never lands is worse than one that lands late
    const bail = setTimeout(() => { if (alive.current) setBeat(2) }, SEAL_MS + 600)
    return () => {
      clearTimeout(land); clearTimeout(bail)
      try { a.cancel(); b.cancel() } catch { /* gone */ }
    }
  }, [beat])

  // ── the card, whichever beat it is ──
  // Drawn from the draft while the answer is out and from the row once it is
  // in, and it is the same card: the words do not change when the id lands.
  const to = row ? row.to : normHandle(draft?.to || '')
  const body = row ? row.body : (draft?.body || '')
  const at = row ? row.at : Date.now()
  const card = (
    <div className="wl-posted-card" ref={cardBox}>
      <Paper
        dateline={dateline(at)}
        crest={<span className="wl-letter-crest"><OpenFace handle={to} size={34} /></span>}
        title={<Addressee handle={to} />}
      >
        <Prose>{body}</Prose>
      </Paper>
      {/* the light passing over the paper while it is read */}
      <span className="wl-posted-sheen" aria-hidden="true" />
    </div>
  )
  // the mark, poured, over the card, and then over the wall the card joined:
  // fast while it reads, brightest as the screen passes, and slow once the
  // letter is up
  const mark = (dim) => (
    <div className="wl-posted-mark" aria-hidden="true">
      <Bloom size={260} opacity={beat === 1 ? 0.5 : dim ? 0.06 : beat === 2 ? 0.1 : 0.16} className="wl-posted-bloom" />
      <LiquidMark size={92} speed={dim ? 0.15 : beat === 1 ? 1.4 : beat === 2 ? 0.35 : 0.8} still={reduce} quality="seal" />
    </div>
  )
  // one face in the little wall
  const one = (t, side) => (
    <span key={t.handle} className="wl-strip-n" data-side={side} style={{ '--k': t.k }}>
      <Face handle={t.handle} size={42} />
    </span>
  )

  // ── it did not go up ──
  if (row === null) {
    const kept = !!draft && (refused === 'screened' || refused === 'network')
    const why = refused === 'screened' ? (said(reasons) || 'the screen held it back.')
      : refused === 'removed' ? 'nobody can write to it now.'
      : refused === 'cap' ? 'three a week. wait a week and try again.'
      : refused === 'gate' ? 'open the letters first.'
      : refused === 'no_session' ? 'this device is no longer signed in. sign in again and it is still here.'
      : refused === 'network' ? 'your letter is still here. try again.'
      : ''
    return (
      <div className="wl-page wl-posted is-refused">
        <div className="wl-posted-air" />
        {kept ? mark(true) : null}
        {kept ? <div className="wl-posted-stage">{card}</div> : null}
        <div className="wl-posted-land is-in">
          <Display size="m">
            {refused === 'screened' ? <>It didn&rsquo;t go up.</>
              : refused === 'removed' ? <>That name is off<br />the wall.</>
              : refused === 'cap' ? <>Letter limit<br />reached.</>
              : refused === 'gate' || refused === 'no_session' ? <>Berkeley only.</>
              : refused === 'network' ? <>It did not<br />go through.</>
              : <>Nothing to put up.</>}
          </Display>
          {/* One sentence, and it names the thing rather than citing a policy.
              A refusal that says "this violates our guidelines" teaches nobody
              anything; the screen's own word for what it read is what somebody
              can act on. */}
          {why ? <p className="wl-say is-lead wl-posted-why">{why}</p> : null}
        </div>
        <div className="wl-push" />
        <div className="wl-posted-foot">
          {refused === 'screened' ? (
            <>
              {/* the words, back: the composer opens on the draft */}
              <Pill tone="light" wide onClick={() => go('write', to || undefined)}>change it</Pill>
              <button type="button" className="wl-quiet" onClick={() => { patch({ draft: null }); go('wall') }}>leave it</button>
            </>
          ) : refused === 'cap' ? (
            /* Nothing to press towards on a cap: another letter is the one
               thing this person cannot do, and a button offering it would be
               the screen arguing with itself. */
            <Pill tone="light" wide onClick={() => go('wall')}>back to the wall</Pill>
          ) : (
            <Pill tone="light" wide
              onClick={() => go(refused === 'gate' || refused === 'no_session' ? 'gate' : 'write')}>
              {refused === 'gate' || refused === 'no_session' ? 'open them' : refused === 'network' ? 'try again' : 'write'}
            </Pill>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`wl-page wl-posted is-b${beat}${settled ? ' is-settled' : ''}`}>
      <div className="wl-posted-air" />

      {mark(false)}

      {/* The stage and the landing share one cell (wall.css .wl-posted-body):
          the landing stands at the foot of the space the card is read in, so
          the disc the card closes into is a short drop below where the card
          stood; and once the name has settled the stage closes and the
          landing comes up to stand under the mark. */}
      <div className="wl-posted-body">
        {/* beats 0 and 1 · the reading, and the seal */}
        <div className="wl-posted-stage" ref={stageEl}>
          {card}
          {/* The screen, said under the card. Three sparkles and a sentence:
              a status, not a spinner. Nothing is being computed for the
              person waiting; the pause belongs to the person the letter is
              about, and the words are visible rather than hidden in a live
              region because the whole reason to draw this beat is that it can
              be seen. */}
          <div className="wl-posted-screen" role="status">
            <Sparkle size={9} twinkle={!reduce} delay={0} />
            <Sparkle size={9} twinkle={!reduce} delay={240} />
            <Sparkle size={9} twinkle={!reduce} delay={480} />
            <span className="wl-posted-screen-say">read before it goes up</span>
          </div>
        </div>

        {/* beat 2 · it is on the wall. In the document from the first frame,
            at nothing, so the disc the card is flying to is already standing
            where it will land. */}
        <div className="wl-posted-land" aria-hidden={beat < 2 || undefined}>
          <Display size="m" className="wl-posted-h">It&rsquo;s up.</Display>
          <p className="wl-say is-lead wl-posted-count">
            {liveCount()} {liveCount() === 1 ? 'letter' : 'letters'} on the wall. yours is the newest.
          </p>
          <div className="wl-strip">
            <span className="wl-strip-side is-l">{strip ? strip.before.map((t) => one(t, 'l')) : null}</span>
            <span className="wl-strip-n is-mine" ref={mineEl}>
              <Face handle={to} size={54} />
            </span>
            <span className="wl-strip-side is-r">{strip ? strip.after.map((t) => one(t, 'r')) : null}</span>
          </div>
        </div>
      </div>

      <div className="wl-push" />

      <div className={`wl-posted-foot${beat === 2 ? ' is-in' : ''}`}>
        {/* It says what you get, not where you came from. "Back to the wall"
            describes a direction; the wall now has this letter on it, and that
            is the thing worth naming on the one control that leaves here. */}
        <Pill tone="light" wide onClick={() => go('wall')} disabled={beat < 2}>
          see it on the wall
        </Pill>
      </div>
    </div>
  )
}
