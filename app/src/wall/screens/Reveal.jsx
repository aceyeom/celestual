// ── /berkeley/reveal/:handle — IT'S MUTUAL ──────────────────────────────────
//
// The screen the whole product exists to reach. Two people each sent the
// other a note without knowing the other had, and this is where each of them
// is told, on the same phone the letters are written on, that the other did,
// and reads what both of them wrote.
//
// It was Main's (/reveal), in the room's language: a liquid metal seal, the
// sentence in the serif, two chalk cards. Then it was a sheet on the wall, a
// letter's night screen telling the intro's story in a loop over a column of
// the pair, their note and a key, and the owner saw that and said it looked
// like the intro animation slapped on top of the message (28 September). He
// asked for the animation to take over the entire screen, for both names and
// both letters, and for it to become something the two of them would keep
// and share. So it is two things now, in one black room:
//
//   1  the film      (Film.jsx) the first time a mutual is opened on this
//                    device: the slot that was pressed in the private notes
//                    (Slot.jsx) grows until its glass is the whole screen,
//                    and the story is told on it once, in the phone's own
//                    pixels (pixmark.js `filmStory`): two sealed notes that
//                    meet and become one, the one note opening into the two
//                    names, theirs over yours, and the names going as a boy
//                    and a girl run in from either edge; the catch, the
//                    phone turning rose, the two of them becoming the mark,
//                    and `it's mutual.` typed under it. Then the camera pulls
//                    back, and the glass closes down onto the head of one
//                    rose phone
//   2  the keepsake  (Keepsake.jsx) that phone: the night it was told on
//                    its status row, the mark still alive at the head of the
//                    glass with the two names under it, and the two notes
//                    under them, each on the face its writer left it on, one
//                    glass with nothing cutting it. Its keys
//                    are the phone's: `options` (write them a new note, or
//                    take it off your list) and `share` (a picture of all of
//                    it, keepshare.js), and under it the one lit key, their
//                    Instagram. It is what opens on every visit after the
//                    first, out of the slot's glass, with no film
//
// What stayed from before: the room, and nothing but the phone lit in it;
// no heart anywhere (the owner took the beat and the floating heart out on
// 26 September), and the words exactly `it's mutual.`, no congratulations
// and no match (VOICE.md 2). What went, and why: the telling taken back and
// told again for as long as the sheet was open, and the phone rising and
// drifting through the corals (the owner cut the drift and the float, and a
// loop reads as a screen saver and not as a thing that happened once); their
// note under the phone and yours behind a key (a keepsake of two people is
// both of them); and the handles in a row with a `+` between them.
//
// Which it opens as, once the mutual is in hand, in this order: under
// reduced motion, the keepsake, still; from the slot's `edit` key, the
// keepsake with its options up (revealfrom.js `menu`); a mutual this device
// has already watched told (pings.js `wasOpened`), the keepsake, out of the
// slot's glass; and otherwise the film, pushed in from the slot, or woken
// out of the black when there is no slot to grow from (the mail's link, a
// reload, a new device). It is marked watched once `it's mutual.` has been
// said, watched to there or skipped to it, and never before: a person who
// closes it half way has not seen it. The keepsake that opens with no film
// marks it too, the short way and the still one, but not the `edit` key's:
// a person who reaches for the options of a mutual they have not watched
// has not seen it told either, and it marked the film watched for good on
// that device, the slot turned still and the takeover never played (the
// review of 28 September), so the slot still tells it the next time.
//
// The screen reader hears the same facts from the first frame, from a
// heading nobody sees and a line under it, and never waits on the film.
//
// ── where the facts come from ───────────────────────────────────────────────
// Who this is, off the server's row (main/data.js `me`), and the handle the
// ping sheet and the account sheet place and read under (pings.js
// `myHandle`) where the row has none, so the three sheets agree about whose
// mutual this is. Then the pings this person has standing and which of them
// came back (`celestual_my_pings`, checked on the server against the proof
// this browser holds), and a copy of that answer held for a couple of
// minutes, so a tap on a mutual lands on a drawn screen and not a bare one
// while the server is asked again. A read that fails does not unsay a mutual
// already in hand. Since 0072 a handle can carry a mutual and a new note to
// the same person, and the mutual is `mutualOf` the list, never the first
// row that happens to name them.
//
// ── and when there is nothing to show ───────────────────────────────────────
// "nothing here." is said the same way whatever the reason, and its one key
// is the account sheet (screens/You.jsx), which is where each reason has its
// own words and its own way on: a proof this browser does not hold, one the
// server no longer takes, or no @ at all. Neither it nor "sign in" ever
// plays the film.
//
// Except to somebody this device does not know at all. The mutual mail's link
// is opened wherever the mail is read, often a phone or a laptop nobody ever
// signed in on, and "nothing here." there contradicted the mail that had
// just said it was mutual; its key went on to a door that asked for the DM
// again, when an email or a Google sign in brings the @ and its private
// notes back with it (auth.js `restoreProof`). So a person whoami says is not
// signed in is asked to sign in, by the gate's three ways, and the gate comes
// back here once they have (store.js `setAfterGate`). It says nothing about
// anybody: every visitor who is not signed in reads the same line, mutual or
// not.

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Sheet, SheetHead, SheetFoot, Display, Pill, useSheet } from '../parts.jsx'
import { Wait } from '../screen.jsx'
import { normHandle, atHandle } from '../data.js'
import { heldProof } from '../auth.js'
import { href } from '../router.js'
import { setAfterGate } from '../store.js'
import { getSession } from '../../api/auth.js'
import { me } from '../../main/data.js'
import { myHandle, myPings, heldPings, mutualOf, liveOf, revealStamp, wasOpened, markOpened, REVEAL_TZ } from '../pings.js'
import { takeRevealFrom, returnTo } from '../revealfrom.js'
import Film, { pairSeed, namesOf, namesNow, primeFilm, filmFor, keepFor, wordsReady, faceCame, filmHold } from '../Film.jsx'
import Keepsake, { FLY_OPENS } from '../Keepsake.jsx'
import '../mutual.css'

// Who this browser is before the server has said: the handle its own proof
// is for, which is enough to read a held copy on the first frame.
function guessHandle() {
  const s = getSession()
  return s && s.handle ? normHandle(s.handle) : ''
}

// The mutual this address names, out of an answer in hand, with the list
// it came in (for whether a new note to them is standing)
function found(answer, them) {
  const m = mutualOf(answer, them)
  return m ? { mutual: m, list: answer } : null
}

// the night it was told, as a sentence says it: "saturday, september 26",
// in California, where the reveal is
let NIGHT_WORDS = null
function nightWords(ms) {
  if (!ms) return ''
  if (!NIGHT_WORDS) NIGHT_WORDS = new Intl.DateTimeFormat('en-US', { timeZone: REVEAL_TZ, weekday: 'long', month: 'long', day: 'numeric' })
  return NIGHT_WORDS.format(new Date(ms)).toLowerCase()
}

// ── the screenshot loop's holds ──
// Development only, as the intro's `?t=` is: `?film=5200` holds the film
// (Film.jsx), and `?keep` lands on the keepsake at rest, `?keep=options`,
// `?keep=confirm` or `?keep=share` with that up in the mark's place.
function keepHold() {
  if (!import.meta.env.DEV) return null
  const v = new URLSearchParams(window.location.search).get('keep')
  return v === null ? null : ['options', 'confirm', 'share'].includes(v) ? v : ''
}
// and `?slot=67,210,256,60` stands in for a slot's glass pressed at that
// rect (with `&slotmenu=options` for its `edit` key), since the screenshot
// loop opens the reveal by its address and not by a press
function slotHold() {
  if (!import.meta.env.DEV) return null
  const q = new URLSearchParams(window.location.search)
  const v = (q.get('slot') || '').split(',').map(Number)
  if (v.length !== 4 || v.some((n) => !Number.isFinite(n))) return null
  return { x: v[0], y: v[1], w: v[2], h: v[3], menu: q.get('slotmenu') || '' }
}

// ── the mutual ──────────────────────────────────────────────────────────────
// Which way it opens, the two names frozen once, the film's clock and the
// keepsake's, and a skip. `opened` is where the reveal was opened from, if
// it was a slot (revealfrom.js).
function Mutual({ mine, them, p, list, reduce, opened, go, onPhase, escRef }) {
  const sheet = useSheet()
  const [hold] = useState(() => {
    const film = filmHold()
    const keep = keepHold()
    return { film, keep }
  })
  // how it opens, decided once: a mutual marked watched a moment from now
  // is still being watched now
  const [entry] = useState(() => {
    if (hold.keep !== null) return 'rest'
    if (hold.film !== null) return 'film'
    if (reduce) return 'still'
    if (opened && opened.menu === 'options') return 'options'
    if (wasOpened(mine, p)) return 'short'
    return 'film'
  })
  const rect = opened && opened.w > 0 && opened.h > 0 ? opened : null
  const seed = pairSeed(mine, them)
  const stamp = p.revealedAt ? revealStamp(p.revealedAt) : ''

  // ── the names, frozen ──
  // Once the resolver has said them or 400ms after the reveal opened,
  // whichever is first, and the words cut into cells in the phone's face.
  // The keepsake and every line wait for them; nothing is drawn with one
  // pair of names and then another. A keepsake whose sentence was cut
  // before the phone's face had come (a cold link on a slow network) has it
  // cut again once the face is there, and a film that was is let play.
  const [made, setMade] = useState(null)
  useEffect(() => {
    let alive = true
    let done = false
    const settle = async (pair) => {
      if (done) return
      done = true
      const ok = await wordsReady(pair.names)
      if (!alive) return
      const credit = ok ? pair.names : [atHandle(them), atHandle(mine)]
      const keep = keepFor()
      setMade({ ...pair, film: entry === 'film' ? filmFor(credit) : null, keep })
      if (keep.sure) return
      const came = await faceCame()
      if (alive && came) setMade((m) => (m ? { ...m, keep: keepFor() } : m))
    }
    if (entry === 'film') primeFilm(mine, them)
    namesOf(mine, them).then(settle, () => settle(namesNow(mine, them)))
    const t = setTimeout(() => settle(namesNow(mine, them)), 400)
    return () => { alive = false; clearTimeout(t) }
  }, [entry, mine, them])

  // ── watched ──
  // on arriving the short way or the still one (not with the options up, see
  // the header), and for the film once the sentence is said, whether it was
  // watched to there or skipped to it (below)
  useEffect(() => {
    if ((entry === 'short' || entry === 'still') && hold.keep === null) markOpened(mine, p)
    // once, on arriving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── the film's clock ──
  // `from` is the film's nought; a skip moves it so the sentence is said, and
  // says when it came (`skipAt`). A skip before the glass is there waits for
  // it. Every beat after is the film's (Film.jsx).
  const [phase, setPhase] = useState(entry === 'film' ? 'film' : 'rest')
  const [from, setFrom] = useState(null)
  const [skipAt, setSkipAt] = useState(null)
  const [queued, setQueued] = useState(false)
  const clock = useRef({ from: null, skipAt: null, pulling: false })
  const film = made && made.film
  const skip = useCallback(() => {
    const c = clock.current
    const now = performance.now()
    if (c.from === null || now < c.from) { setQueued(true); return }
    if (c.skipAt !== null && !c.pulling) return
    if (!c.pulling && film && now - c.from < film.times.said) {
      c.from = now - film.times.said
      setFrom(c.from)
    }
    c.skipAt = now
    setSkipAt(now)
  }, [film])
  const onFrom = useCallback((t) => {
    const c = clock.current
    if (c.from !== null) return
    c.from = t
    setFrom(t)
  }, [])
  // A skip that came during the push-in or the wake is taken at nought. It
  // was a flag on the clock, read when the nought was set, and the push-in
  // sets its nought on its first frame, so a tap any later than that was
  // held for a nought that had already been read, and never taken. (The
  // wait is rounded up and a millisecond over: a timer is set in whole
  // milliseconds, and one that came a fraction short of the nought was held
  // again, and lost.)
  useEffect(() => {
    if (from === null || !queued) return undefined
    const id = setTimeout(() => { setQueued(false); skip() }, Math.max(0, Math.ceil(from - performance.now()) + 1))
    return () => clearTimeout(id)
  }, [from, queued, skip])
  // The film is watched when its sentence is said, and written down then:
  // in the beat the glass holds before the camera pulls back, where the page
  // has nothing else to do. Written on the pull-back's first frame, the
  // store's change woke the wall under the sheet on it, a long frame on a
  // slow phone just as the glass began to move. A skip moves the nought so
  // the sentence is said now, and it is written a moment after the jump.
  useEffect(() => {
    if (entry !== 'film' || from === null || !film || hold.film !== null) return undefined
    const id = setTimeout(() => markOpened(mine, p), Math.max(0, from + film.times.said - performance.now()))
    return () => clearTimeout(id)
  }, [entry, from, film, hold.film, mine, p])

  // ── the keepsake, behind the film ──
  // Laid out and hidden while the film plays, since the camera pulls back
  // onto it; but not on the press, which has the glass to put up. It comes
  // once the glass has begun to grow or wake (its nought is known) and the
  // page is next idle, which the push-in and the wake leave it, both of them
  // the compositor's to draw, and always before the nought: on a phone
  // slowed four times the press was half a second before anything moved,
  // and half of that was this.
  const [behind, setBehind] = useState(entry !== 'film')
  useEffect(() => {
    if (behind || from === null) return undefined
    const on = () => setBehind(true)
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(on, { timeout: 240 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(on, 60)
    return () => clearTimeout(id)
  }, [behind, from])

  const keep = useRef(null)
  const onPull = useCallback((ms, paused) => {
    clock.current.pulling = true
    if (keep.current) keep.current.lightUp(ms, paused)
    // (already written when it was said, and so nothing, but for a film
    // whose sentence came sooner than its timer)
    if (paused === null) markOpened(mine, p)
  }, [mine, p])
  const onLand = useCallback(() => setPhase('landing'), [])
  const onGone = useCallback(() => setPhase('rest'), [])
  const onBack = useCallback(() => sheet && sheet.dismiss('film'), [sheet])
  // (before the frame is painted, so the corner key is never seen over the
  // film for a frame)
  useLayoutEffect(() => { onPhase(phase) }, [phase, onPhase])

  // Escape takes down what stands in the mark's place first; during the
  // film it is the sheet's, and puts the screen to sleep
  const keepEsc = useRef(null)
  useImperativeHandle(escRef, () => (e) => (phase === 'rest' && keepEsc.current ? keepEsc.current(e) : false), [phase])

  // the keepsake's clock: the film's, at the moment its mark came alive, so
  // the two draw one mark; or from when it arrives, and out of the slot from
  // when the phone opens under the glass flying in (Keepsake.jsx
  // `FLY_OPENS`); or held on one frame of it alive, under reduced motion and
  // for the screenshot loop
  const [arrived] = useState(() => performance.now() + (entry === 'short' || entry === 'options' ? (rect ? FLY_OPENS : 0) : 0))
  const keepStory = made && made.keep
  const keepAt = entry === 'still' || hold.keep !== null ? keepStory && keepStory.still
    : hold.film !== null && film ? Math.max(0, hold.film - film.times.live) : null
  const keepFrom = entry === 'film' ? (from === null || !film ? null : from + film.times.live) : arrived
  const enter = entry === 'film' ? 'film' : (entry === 'short' || entry === 'options') && rect ? 'fly' : 'fade'
  const state = phase === 'film' ? 'hidden' : phase === 'landing' ? 'landing' : 'rest'
  // (asked of the slot and not of the entry, which under reduced motion is
  // the still one, and the `edit` key opened the keepsake with no options)
  const menu = hold.keep ? hold.keep : opened && opened.menu === 'options' ? 'options' : null
  const names = made ? made.names : namesNow(mine, them).names
  // a new note out on them since the mutual, running (the keepsake's options
  // open it as itself, and its question says it stays)
  const live = liveOf(list, them)
  const standing = live && live.state === 'standing' ? live : null
  const night = nightWords(p.revealedAt)

  return (
    <div className={`wl-mutual is-${phase}`}>
      {/* what the page is, for a reader that never sees the phone */}
      <h2 id="wl-reveal-h" className="wl-sr">it&#8217;s mutual with {names[0]}</h2>
      <p className="wl-sr">
        you both sent a note, and nobody else was told.{night ? ` told ${night}.` : ''}
      </p>
      {made && behind ? (
        <Keepsake
          me={mine} them={them} p={p} names={made.names} first={made.first} seed={seed} stamp={stamp}
          story={made.keep} from={keepFrom} at={keepAt} state={state} enter={enter} fly={rect}
          menu={menu} standing={standing} go={go} apiRef={keep} escRef={keepEsc}
          onGone={() => sheet && sheet.dismiss('taken')}
        />
      ) : null}
      {film && phase !== 'rest' ? (
        <Film
          story={film} seed={seed} stamp={stamp} rect={rect} hold={hold.film} from={from} skipAt={skipAt}
          onFrom={onFrom} onSkip={skip} onPull={onPull} onLand={onLand} onGone={onGone} onBack={onBack} keep={keep}
        />
      ) : null}
    </div>
  )
}

export default function Reveal({
  id, go, up, upLabel = 'back to the wall', nested = false, reduce, toWall = null,
}) {
  const them = normHandle(id)
  // who this is: null until the server has said, then the row (main/data.js)
  const [who, setWho] = useState(null)
  // and nobody at all: whoami has answered, and there is no session here by
  // any proof, so there is no one whose private notes these could be
  const stranger = !!who && !who.signedIn
  const [got, setGot] = useState(() => found(heldPings(guessHandle()), them) || undefined)
  // where it was opened from, taken once, on the first frame (revealfrom.js)
  const [opened] = useState(() => takeRevealFrom(them) || slotHold())

  useEffect(() => {
    let alive = true
    me().then((u) => { if (alive) setWho(u) })
    return () => { alive = false }
  }, [])

  const handle = !who ? ''
    : who.handleVerified && who.handle ? normHandle(who.handle)
    : myHandle()
  // The mutual itself, off the same RPC the list of pings reads. Asked here
  // as well so a shared or reloaded address lands on the screen, and so a
  // copy held from a moment ago is checked against the row. Nothing is said
  // until whoami has answered.
  useEffect(() => {
    if (!who) return undefined
    if (!handle || !them) { setGot(null); return undefined }
    let alive = true
    const held = found(heldPings(handle), them)
    setGot((g) => held || g || undefined)
    myPings({ handle, proof: heldProof(handle) }).then((out) => {
      if (!alive) return
      if (!out.ok && held) return
      setGot(found(out, them))
    })
    return () => { alive = false }
  }, [who, handle, them])

  // Every way out goes back one step, as every sheet's does: the close
  // mark, the scrim, Escape and the film's `back`. When that step is the
  // wall (the mark says "back to the wall" then, and not "back"), a link
  // that brought somebody here before the wall was ever opened has its
  // poster still up under the sheet, and it is dropped as the sheet starts
  // to go (index.jsx `toWall`), as the ping's own way back does. A mutual
  // taken off the list closes onto the private notes, where it no longer is:
  // back down to them when they are what it was opened from, and up to them
  // otherwise. And the slot has the focus again (revealfrom.js `returnTo`),
  // named on every close and not only when this one was opened from it: a
  // reveal mounted again under a ping sheet that was raised over it has no
  // slot of its own, and closed onto the private notes it left the focus on
  // the page's body. Only the account sheet takes it, and only for as long
  // as a press is worth, so a close onto anything else leaves nothing. The
  // old sheet also had a quiet way out to the wall under its key, whatever
  // it was opened from; the keepsake has none, and its branch went with it
  // (the review of 28 September).
  const way = useRef('')
  const fromSlot = !!opened
  const onClosing = useCallback((by) => {
    way.current = by
    if (by === 'taken') return
    if (toWall && !nested) toWall()
  }, [toWall, nested])
  const toYou = useCallback(() => {
    if (!window.history.state?.wallPushed) {
      window.history.replaceState({ ...window.history.state, wall: 'wall', wallDepth: 0 }, '', href('wall'))
    }
    go('you')
  }, [go])
  const onClose = useCallback(() => {
    returnTo(them)
    if (way.current === 'taken' && !fromSlot) { toYou(); return }
    up()
  }, [up, toYou, fromSlot, them])
  // Not signed in: the gate, with this reveal as the way back once it has
  // let them in (Gate.jsx `finish`). Closing the gate without signing in
  // comes back here too, one step up, as every sheet over a sheet does.
  const toGate = useCallback(() => {
    setAfterGate({ name: 'reveal', id: them })
    go('gate')
  }, [go, them])

  // what the room is doing: the film over it, landing, or at rest
  const [phase, setPhase] = useState('rest')
  const esc = useRef(null)
  const onEscape = useCallback((e) => (esc.current ? esc.current(e) === true : false), [])
  const mine = handle || guessHandle()
  const mutual = got && got.mutual
  // Out of a slot the room is black from its first frame, a cut: the other
  // screens go out and the glass grows in the dark. Any other way it fades
  // up, as the letter's room does.
  const cut = !!(opened && opened.w > 0 && !reduce && mutual)
  const cls = ['is-reveal', cut && 'is-cut', mutual && phase !== 'rest' && `is-${phase}`].filter(Boolean).join(' ')

  // (`is-mutual`: the room is the keepsake's, as wide as the window, and
  // every other state keeps the column in the middle of it, mutual.css)
  return (
    <Sheet onClose={onClose} onClosing={onClosing} onEscape={onEscape} labelledBy="wl-reveal-h" className={cls} room>
      <div className={`wl-sheet-in wl-reveal${mutual ? ' is-mutual' : ''}`}>
        <SheetHead onClose={up} label={upLabel} />
        {got === undefined ? (
          // asked, and not answered yet: the phone's hourglass, and nothing
          // said about it
          <div className="wl-reveal-wait">
            <h2 id="wl-reveal-h" className="wl-sr">it&#8217;s mutual</h2>
            <Wait scale={3} />
          </div>
        ) : got === null && stranger ? (
          // Nobody this device knows: the same words to every such visitor,
          // and the one key is the gate, which comes back here.
          <div className="wl-reveal-none">
            <Display size="l" as="h2" id="wl-reveal-h">sign in to read it.</Display>
            <div className="wl-push" />
            <SheetFoot>
              <Pill tone="light" wide onClick={toGate}>sign in</Pill>
            </SheetFoot>
          </div>
        ) : got === null ? (
          // Not a mutual, or not this person's to see. Said flatly and
          // without a reason, because every reason this screen could give is
          // a fact about somebody else. The one key is this person's own
          // pings, where whatever is theirs to know is said.
          <div className="wl-reveal-none">
            <Display size="l" as="h2" id="wl-reveal-h">nothing here.</Display>
            <div className="wl-push" />
            <SheetFoot>
              <Pill tone="light" wide onClick={toYou}>your private notes</Pill>
            </SheetFoot>
          </div>
        ) : (
          <Mutual
            mine={mine} them={them} p={mutual} list={got.list} reduce={reduce} opened={opened}
            go={go} onPhase={setPhase} escRef={esc}
          />
        )}
      </div>
    </Sheet>
  )
}
