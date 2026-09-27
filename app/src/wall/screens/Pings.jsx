// ── /pings and /paid: MORE PINGS ────────────────────────────────────────────
//
// One free ping for every Saturday reveal, and more for $2.99 each, as many
// as a person chooses (the owner's ruling of 27 September,
// docs/PINGS-BY-THE-WEEK.md, migration 0071). This is where they are bought,
// and it is reached two ways:
//
//   on its own    a note that cannot be paid for, sent, sent again or kept,
//                 raises it in place of the send (screens/Ping.jsx, the note's
//                 own screen on the account), with the note waiting behind it
//                 (pings.js `waitForPings`) and sent the moment the pings land
//   asked for     `add more pings`, on the private notes, beside what is left
//                 of the week (screens/You.jsx)
//
// ── what it looks like, and why ─────────────────────────────────────────────
// The composer's own screen, lit in rose, the one colour the product keeps
// for a mutual and for the night: the count in the phone's large figures, and
// the phone's two soft keys are the stepper, `less` on the left and `more` on
// the right, as a phone set a number with the keys under its glass. Under it
// what a bought ping is, in one line, and one lit key that says what it gets
// and what it costs, exactly: `get 3 pings · $8.97`. Nothing here is urgent,
// nothing is crossed out, and nothing says premium (VOICE.md 6): a ping is
// bought, and the screen says exactly that.
//
// ── and never a way round the double blind ──────────────────────────────────
// A bought ping buys a note in a reveal, and nothing else: not an earlier
// reveal, not a word about who sent what, not whether anybody is here. The
// person a note is to learns nothing from it being bought (docs/SECURITY.md).
//
// ── back from Stripe (/paid) ────────────────────────────────────────────────
// Stripe hosts the payment and sends the buyer back to /paid?session= (not
// ?s=, which is a flyer's scan on this wall, index.jsx), with the
// session; this confirms it (the same grant the webhook makes, once), says
// how many landed, and does what was waiting: the note goes out, a lapsed
// one is sent again, a running one is kept. `?c=1` is a buyer who turned
// back on Stripe's page: nothing was charged, and the note is still waiting.
import { useEffect, useState } from 'react'
import { Sheet, SheetHead, Display, Label, Pill } from '../parts.jsx'
import { Screen, ScreenNote, RoomLight } from '../screen.jsx'
import { colourOf } from '../looks.js'
import { atHandle } from '../data.js'
import { heldProof } from '../auth.js'
import { checkout, confirm, price, PING_CENTS, MAX_BUY } from '../../api/billing.js'
import '../buy.css'
import {
  myHandle, heldAllowance, loadAllowance, waitingNote, dropWaiting, place, renew, forgetPings, endsWords, nextReveal,
} from '../pings.js'

const ROSE = { tint: 'rose' }
const SEED = 'pings:rose'

const FAULT = {
  unverified: 'confirm your Instagram again first. your note is kept.',
  suppressed: 'this @ cannot buy pings.',
  rate: 'that is a lot of tries for one hour. try again later.',
  quantity: 'from one to ten at a time.',
  config: 'buying pings is not open yet. your note is kept.',
  demo: 'buying pings is not open yet. your note is kept.',
  stripe: 'the payment page did not open. give it a moment, then try again.',
  network: 'there is no connection. try again in a moment.',
}

// what a note waiting on pings is, said on the key and on the screen
function waitWords(w) {
  if (!w) return ''
  const who = atHandle(w.to)
  return w.kind === 'keep' ? `keeping your note to ${who} for next week`
    : w.kind === 'again' ? `sending your note to ${who} again`
    : `your note to ${who}`
}

// and what happens to it once the pings are in
function landWords(w) {
  const who = atHandle(w.to)
  return w.kind === 'keep' ? `your note to ${who} is kept for next week the moment they land.`
    : w.kind === 'again' ? `your note to ${who} goes out again the moment they land.`
    : `your note to ${who} goes out the moment they land.`
}

// ── the count, on the glass ─────────────────────────────────────────────────
// The number in the phone's large figures, what it is, and what it costs,
// centred on the glass. A press on a soft key moves it one, and it ticks: the
// new figure comes up from under the old one, as a phone's counter rolled.
function Count({ n, cents }) {
  return (
    <div className="wl-buy-count" aria-hidden="true">
      <span className="wl-buy-n" key={n}>{n}</span>
      <span className="wl-buy-what">{n === 1 ? 'ping' : 'pings'}</span>
      <span className="wl-buy-cost">{price(n * cents)}</span>
    </div>
  )
}

// ── the body, in whichever sheet it stands ──────────────────────────────────
// `out` is whether it was raised by a note that could not be paid for, which
// is what the heading says; `onBack` is the way out of it, and `backLabel`
// what that key says.
export function BuyPings({ out = false, onBack, backLabel = 'not now', headId = 'wl-buy-h' }) {
  const me = myHandle()
  const [week, setWeek] = useState(() => heldAllowance(me))
  const [n, setN] = useState(1)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const waiting = waitingNote()
  useEffect(() => {
    let on = true
    loadAllowance(me).then((a) => { if (on && a) setWeek(a) })
    return () => { on = false }
  }, [me])
  const cents = week?.priceCents || PING_CENTS
  // no more than the week can still take: ten a reveal, less what is spent
  const room = week ? Math.max(1, Math.min(MAX_BUY, week.ceiling - week.sent)) : MAX_BUY
  const most = Math.min(MAX_BUY, room)
  const step = (d) => { setSaid(''); setN((x) => Math.max(1, Math.min(most, x + d))) }

  const buy = async () => {
    if (busy || !me) return
    setBusy(true)
    setSaid('')
    const got = await checkout({ handle: me, proof: heldProof(me), quantity: n })
    if (got && got.ok && got.url) {
      // the browser leaves for Stripe's own page; what was waiting is kept
      window.location.assign(got.url)
      return
    }
    setBusy(false)
    setSaid(FAULT[got?.error] || FAULT.stripe)
  }

  const next = week?.revealAt || nextReveal()
  // the note behind the paywall, and what happens to it, said first; with
  // none, when the free one comes back
  const line = waiting ? landWords(waiting)
    : week && week.freeLeft
    ? `your free ping for ${endsWords(next) || 'saturday'} is still yours. these are on top of it.`
    : `your free ping comes back after ${endsWords(next) || 'saturday'}’s reveal, at 9pm pacific.`

  return (
    <>
      <Display size="s" as="h2" id={headId} className="wl-write-h">
        {out ? <>this week&rsquo;s ping<br />is spent.</> : <>more pings.</>}
      </Display>
      <div className="wl-write-step">
        <div className="wl-write-card wl-buy-card">
          <span className="wl-write-light" aria-hidden="true">
            <RoomLight key={colourOf(ROSE, SEED).slug} look={ROSE} seed={SEED} />
          </span>
          <Screen
            look={ROSE} seed={SEED} live
            top={{ name: 'pings', icon: 'pen', counter: `${price(cents)} ea` }}
            keys={{
              l: { label: 'less', onClick: () => step(-1), disabled: n <= 1 || busy, keepFocus: true, aria: `one fewer. ${n} now` },
              r: { label: 'more', onClick: () => step(1), disabled: n >= most || busy, keepFocus: true, aria: `one more. ${n} now` },
            }}
          >
            <Count n={n} cents={cents} />
          </Screen>
          <div className="wl-write-floor" aria-live="polite">
            {said ? <Label className="wl-write-caught">{said}</Label> : <Label tone="dim" className="wl-buy-say">{line}</Label>}
          </div>
        </div>
        <p className="wl-buy-fine">
          {price(cents)} each, paid once, never a subscription. a bought ping is yours until you use it, and a note you let go before its reveal gives its ping back.
        </p>
      </div>
      <div className="wl-write-foot">
        <Pill tone="light" onClick={buy} disabled={busy || !me} aria-busy={busy || undefined}>
          {busy ? 'opening the payment' : `get ${n} ${n === 1 ? 'ping' : 'pings'} · ${price(n * cents)}`}
        </Pill>
        {onBack ? <button type="button" className="wl-quiet" onClick={onBack}>{backLabel}</button> : null}
      </div>
      <span className="wl-sr" aria-live="polite">{`${n} ${n === 1 ? 'ping' : 'pings'}, ${price(n * cents)}`}</span>
    </>
  )
}

// ── what was waiting, done ──────────────────────────────────────────────────
// A note to send goes with the words it was kept with; a lapsed one is sent
// again with its own; a running one is kept for next week. Answers what the
// screen says: { ok, title, text } or a fault.
async function finish(w) {
  const me = myHandle()
  if (!w || !me) return null
  if (w.kind === 'keep') {
    const out = await renew({ me, them: w.to })
    if (!out.ok) return { ok: false, text: 'your note was not kept. open it on your private notes and keep it there.' }
    return { ok: true, title: 'kept for next week', text: `your note to ${atHandle(w.to)} runs to ${endsWords(out.expires) || 'next saturday'}.` }
  }
  const out = await place({ me, them: w.to, proof: heldProof(me), words: w.kind === 'again' || w.line == null ? undefined : w.line })
  if (!out.ok) return { ok: false, text: 'your note did not go out. open it and send it again.' }
  const ends = Date.parse(out.expires_at || 0) || nextReveal()
  return { ok: true, title: 'sent privately', text: `your note to ${atHandle(w.to)} runs to ${endsWords(ends) || 'saturday'}. if they send you one by then, you both find out at 9pm pacific.` }
}

// ── /paid ───────────────────────────────────────────────────────────────────
// One run per session, kept for the page's life: the sheet can be drawn more
// than once while the wall comes up under it, and every drawing waits on the
// same confirm, so the pings are asked for once and the waiting note is sent
// once. Stripe can send the buyer home a moment before the payment settles,
// so an answer of not paid yet is asked again, a few times, calmly.
const RUNS = new Map()
function runPaid(session) {
  if (RUNS.has(session)) return RUNS.get(session)
  const run = (async () => {
    const w = waitingNote()
    for (let i = 0; i < 5; i++) {
      const out = await confirm(session)
      if (out && out.ok && out.paid) {
        forgetPings()
        await loadAllowance()
        const done = w ? await finish(w) : null
        if (w) dropWaiting()
        return { got: out, w, done }
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
    return { fault: true, w }
  })()
  RUNS.set(session, run)
  return run
}

function Paid({ go, up }) {
  const [query] = useState(() => new URLSearchParams(window.location.search))
  const session = query.get('session') || ''
  const turned = query.get('c') === '1'
  const [w] = useState(() => waitingNote())
  // asking · landed · turned · fault
  const [phase, setPhase] = useState(turned ? 'turned' : session ? 'asking' : 'fault')
  const [got, setGot] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    // turned back on Stripe's page: the address is only a note of that
    if (turned) window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [turned])

  useEffect(() => {
    if (!session) return undefined
    let on = true
    runPaid(session).then((r) => {
      if (!on) return
      // the session off the address bar once it has been read, so a reload
      // does not ask again
      window.history.replaceState(window.history.state, '', window.location.pathname)
      if (r.fault) { setPhase('fault'); return }
      setGot(r.got)
      setDone(r.done)
      setPhase('landed')
    })
    return () => { on = false }
  }, [session])

  const n = Number(got?.quantity) || 0
  let body
  let act
  let quiet = null
  if (phase === 'asking') {
    body = <ScreenNote glyph="wait" title={w ? 'sending your note' : 'one moment'} />
    act = null
  } else if (phase === 'landed') {
    body = (
      <ScreenNote glyph="check" title={n ? `${n} ${n === 1 ? 'ping' : 'pings'} added` : 'your pings are in'}>
        {done ? done.text : 'they are yours until you use them.'}
      </ScreenNote>
    )
    act = done && !done.ok && w
      ? <Pill tone="light" onClick={() => go('ping', w.to)}>open your note</Pill>
      : <Pill tone="light" onClick={() => go('you')}>your private notes</Pill>
    quiet = !w || (done && done.ok) ? <button type="button" className="wl-quiet" onClick={() => go('ping')}>send a private note</button> : null
  } else if (phase === 'turned') {
    body = <ScreenNote title="nothing bought">nothing was charged.{w ? ` ${waitWords(w)} is still waiting.` : ''}</ScreenNote>
    act = w
      ? <Pill tone="light" onClick={() => go('pings')}>choose again</Pill>
      : <Pill tone="light" onClick={() => go('you')}>your private notes</Pill>
    quiet = <button type="button" className="wl-quiet" onClick={() => { dropWaiting(); up() }}>not now</button>
  } else {
    body = (
      <ScreenNote title="not confirmed yet">
        if you paid, your pings land in a minute or two, and your private notes will show them.
      </ScreenNote>
    )
    act = <Pill tone="light" onClick={() => go('you')}>your private notes</Pill>
  }

  return (
    <>
      <Display size="s" as="h2" id="wl-buy-h" className="wl-write-h">
        {phase === 'landed' ? <>thank you.</> : phase === 'turned' ? <>no pings bought.</> : <>more pings.</>}
      </Display>
      <div className="wl-write-step">
        <div className="wl-write-card wl-buy-card">
          <span className="wl-write-light" aria-hidden="true">
            <RoomLight key={colourOf(ROSE, SEED).slug} look={ROSE} seed={SEED} />
          </span>
          <Screen look={ROSE} seed={SEED} live top={{ name: 'pings', icon: 'pen' }} keys={{}}>
            {body}
          </Screen>
        </div>
      </div>
      <div className="wl-write-foot">
        {act}
        {quiet}
      </div>
    </>
  )
}

// ── the sheet ───────────────────────────────────────────────────────────────
// Raised over the wall like the composer, in the composer's own sheet, for
// both addresses: `/pings` to choose, `/paid` to come back to.
export default function Pings({ paid = false, go, up, upLabel = 'back to the wall' }) {
  const w = waitingNote()
  const me = myHandle()
  // nobody with an @ has pings to buy: the account first, which asks for it
  useEffect(() => { if (!paid && !me) go('you') }, [paid, me, go])
  return (
    <Sheet onClose={up} tall labelledBy="wl-buy-h" className="is-write is-ping is-buy">
      <div className="wl-sheet-in wl-write wl-ping wl-buy">
        <SheetHead onClose={up} label={upLabel} />
        {paid
          ? <Paid go={go} up={up} />
          : <BuyPings out={!!w} onBack={up} backLabel={w ? 'not now, keep the note' : 'not now'} />}
      </div>
    </Sheet>
  )
}

