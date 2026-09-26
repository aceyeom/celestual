// ── /write — THE COMPOSER ───────────────────────────────────────────────────
//
// Two steps, and they are one sentence broken across them:
//
//     step 1   Someone you can't forget.      ← who
//     step 2   And what makes them so.        ← the letter
//
// and then one decision, at the send, about how public it is and who it is
// signed by (the rulings of 25 and 26 September, docs/ONE-WALL.md, migration
// 0066):
//
//     post on the wall            public, and nobody sees who wrote it. Asks
//                                 nothing: anybody can write to an @ or to a
//                                 name, and the note is read by the
//                                 classifier (and, where it is unsure, by a
//                                 person at the desk) before it goes up.
//     post as a Berkeley student  public, marked from Berkeley (CAL in its status row), and up
//                                 at once. It asks "confirm you're at
//                                 Berkeley", by a link to a berkeley.edu
//                                 address, once per device. An @ only.
//     send privately              only they'll ever know, and only if it's
//                                 mutual. It asks "confirm this is your
//                                 Instagram", the one DM, and goes to them as
//                                 a ping with the note as its line. An @ only.
//
// Three rows, each a title, what it does in one line, and what it asks, said
// on its face and asked after the choice, so nobody has to learn which proof
// goes with which act. The first is the one anybody can take, and it is
// first; the Berkeley one is the one the wall marks, and it says so with the
// Berkeley mark it puts on the letter. A letter to a NAME (anything that is
// not an @) is offered the wall, with a school to tag or none, and the
// private note, dimmed with the one line that fixes it: a ping needs an @.
//
// The brief is still the reason the wall fills up. An earlier build asked
// "what did you never say?", which is a question about the writer: it asks
// somebody to find a regret, decide it is worth publishing, and phrase it,
// three jobs, at a table, on a phone. This asks them to think of ONE PERSON,
// which everybody can do instantly, and then say why.
//
// The card is live from the first keystroke of step 2. It is the component
// the wall renders (screen.jsx `Screen`), not a lookalike, in the colour and
// with the words that go up, and with the line across its top that goes up
// too: "dear Sofia", which is the writer's to change (`Greet`), up to forty
// characters, and follows the name until they do.
//
// ── nothing is asked before the letter is written ───────────────────────────
// This screen used to be behind the campus address: the composer did not
// open for anybody who had not given one. Now everybody writes first, and the
// draft is kept whatever happens next (store.js `draft`, with a nonce made
// once per draft, data.js `newNonce`), so a walk to the inbox, a reload, a
// second tab or Instagram and back never costs anybody what they wrote, and a
// draft that posts from two tabs at once is one letter.
//
// The address does not follow the letter anywhere. It is not passed to
// `write`, and there is no author field in the corpus for it to land in
// (data.js): what the wall records is a key, a body, a school and a time.
//
// ── who: an @, or anything else (0053, 0055) ───────────────────────────────
// The first question has two answers on the rail over the field (parts.jsx
// `Segmented`): "Instagram", open when the composer opens, and "custom
// name", whatever the writer calls the person. Under a name, one quiet field
// more: their @, optional, with an (i) that says why somebody might add it
// (it reaches them) and that the @ is never printed. With it the letter goes
// to the @ with the name as its greeting ("dear sofia"), and follows
// everything an @-note follows.
//
// ── and the @ is never on the letter (0066) ─────────────────────────────────
// The @ is what the letter is filed under and found by, and it is not printed
// on the letter's face, so it is not printed on the draft either, which is
// the letter as it will go up. The line across the top says "dear" and the
// resolver's first name for the @, or, where the resolver has none, "dear
// you", with one line under the card asking for their name, which is the
// writer's to put in the greeting.
//
// ── and three of them in any five days ─────────────────────────────────────
// The allowance is the server's (`wall_quota`, 0044 and 0051) and is drawn as
// nothing until it is spent; then the wall's option says when the next one
// can go up, and the private one stays open.
//
// ── the screen, at the keyboard ────────────────────────────────────────────
// Layer 1 of the moderation runs against every keystroke of the letter
// (moderate.js): slurs, links, phone numbers, addresses, room numbers, and it
// says so under the card, naming the thing, and a press with that line still
// there shakes the card and sends nothing. The classifier reads the letter in
// celestual-wall-moderate, the same list runs there, and the greeting goes
// through the same list as the body.
//
// ── and after ───────────────────────────────────────────────────────────────
// A letter that is up closes the sheet, and the wall under it receives the
// name, one pulse out from its disc (screens/Wall.jsx, Hive.jsx `pulse`). A
// letter held for the desk and a note sent privately say so on the screen,
// once, in the words the rest of the product uses for them ("it's being
// read." and "sent privately.", the ping's own sixty days), and the sheet
// goes back to the wall on the next press.
//
// ── and the wall it goes back to is the names, not the poster ──────────────
// A composer opened from a link (a letter's "write to", a shared /write)
// stands over a wall whose veil was never lifted, and closing onto it used
// to land on "a wall of the ones you never told." and "view the wall", with
// the pulse that says the letter is up held back behind it: the one moment
// the writer needed to see the wall, they saw the front page instead. So
// every way out that says "back to the wall" drops the veil first
// (index.jsx `toWall`), as the ping's does (screens/Ping.jsx `home`).
//
// ── and a draft for somebody else is not carried to a new name ─────────────
// The draft is one slot, and the composer opened on a different person
// (a letter's "write to Pilar" while a letter to Sofia is kept) used to
// keep the kept letter's words, and the Berkeley link it was waiting on, and
// put the new name over them: tapping the link then posted the letter
// written for Sofia to Pilar, at once and marked from Berkeley. A composer
// opened on a person the kept draft is not for starts a fresh one.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, Display, Label, Pill, HandleField, Addressed, Light, useResolver, confirmWord,
  useSuggest, Suggest, Segmented, useProfile, DoorFoot, CodeBox, waitLine,
} from '../parts.jsx'
import { LookPanel, useColourSwipe } from '../Look.jsx'
import { Screen, ScreenDraft, ScreenNote, RoomLight, PixIcon, Wait } from '../screen.jsx'
import { Dots } from '../art.jsx'
import {
  normHandle, validHandle, hash, allowance, loadQuota,
  isNameKey, nameKey, cleanName, nameFor, learnName, labelFor, atHandle,
  newNonce, postDraft, openCampuses, loadCampuses, targetKey,
} from '../data.js'
import { normaliseLook, freshLook, colourOf, stampOf } from '../looks.js'
import { fault, whyNot } from '../moderate.js'
import { campus } from '../campus.js'
import { getState, patch, setAfterGate } from '../store.js'
import { DOMAIN, eduBerkeley, eduDomain, refresh, validEmail, anyEmail, normEmail, heldProof } from '../auth.js'
import { sendCampusCode, checkCampusCode, loadPending } from '../handoff.js'
import { sendLink, linkStatus } from '../../api/eduverify.js'
import { sessionToken } from '../../api/identity.js'
import { signOut as dropProof } from '../../api/auth.js'
import { myHandle, canPlace, readyToPlace, place, forgetPings } from '../pings.js'
import { schoolOf, slugOfDomain } from '../schools.js'
import { Sticker } from '../Sticker.jsx'
import { useProve, ProveDoor } from './Ping.jsx'
import { AddressField } from './Gate.jsx'
import '../post.css'

// There is no floor: a letter is short because it is true. The ceiling is
// the server's (wall_letters_body_ck, and wall_write's left(…, 280)), and the
// same 280 goes as a ping's line when the note is sent privately.
const MAX_BODY = 280
// and the name's (wall_name_clean, 0055): thirty characters, five words
const MAX_NAME = 30
// and the greeting's: forty characters (docs/ONE-WALL.md)
const MAX_GREET = 40
// how long a mailed link lives (celestual-edu-verify): the composer stops
// waiting on one after this
const LINK_MS = 30 * 60000

const EXAMPLES = () => campus().examples

const KINDS = [
  { value: 'handle', label: 'Instagram' },
  { value: 'name', label: 'custom name' },
]

// Berkeley, the one school posting to an @ (docs/ONE-WALL.md), for its
// mark on the option that posts there
const BERKELEY = schoolOf('berkeley')

// What the send says when the ping path says no (pings.js `place`), in the
// world and with the one next step.
const PING_SAY = {
  self: 'that is your own @.',
  slots: 'every slot is in use. let one of your private notes go to free one.',
  suppressed: 'that @ has opted out of private notes.',
  rate: 'that is a lot of private notes for one month. try again later.',
  invalid: 'that handle does not look right.',
  card: 'that can’t go in a note as it is. take out links, addresses and numbers.',
  night: 'it did not go through. try again.',
}

// The greeting's name where the resolver has none for the @: the letter is
// to "you" until the writer says who (screens/Letter.jsx says the same).
const NO_NAME = 'you'

// What the send says when the wall says no (celestual-wall-moderate, v2).
const WALL_SAY = {
  throttle: 'too many from this device today. try again tomorrow.',
  removed: 'that name has come off the wall. nobody can write to it now.',
  name: 'that is not something the wall can carry. a name, a nickname, a letter, a number.',
  handle: 'that handle does not look right.',
  salutation: 'the greeting can’t go up as it is. change the line at the top of the screen.',
  rate: 'too many links to that address. try again in an hour.',
  send: 'the mail did not go out. try again.',
  empty: 'there is nothing written yet.',
  network: 'it did not go through. try again.',
}

// Whether the composer is on a spread, where the colours stand beside the
// screen and not under it (wall.css, the composer's two columns).
const WIDE = '(min-width: 900px)'
function useWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(WIDE).matches)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const m = window.matchMedia(WIDE)
    const f = () => setWide(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return wide
}

// A link that was mailed, while it can still be tapped.
function live(held) {
  return held && held.at && Date.now() - held.at < LINK_MS ? held : null
}

// The kept draft, when this composer is for the person it was written to:
// opened on nobody (the bar's "write"), or on the same @ or name. Opened on
// anybody else, nothing (the head of this file says why), and the composer
// starts a fresh draft, which the first write through below puts in the
// slot. A name with its @ is for either.
function draftFor(prefill) {
  const d = getState().draft || {}
  const want = prefill ? targetKey(prefill) : ''
  if (!want) return d
  const keys = d.kind === 'name' ? [nameKey(cleanName(d.name)), normHandle(d.at)] : [normHandle(d.to)]
  return keys.includes(want) ? d : {}
}

// The Instagram proof's pending record, when it was minted here for this
// draft's @: a reload on the way back from the DM resumes the door
// (screens/Ping.jsx `useProve`). One minted for another draft is left to
// lapse, as the ping's own is (screens/Ping.jsx `resume`), since the note it
// would send is not the one on the glass.
function resumeIg(d) {
  const p = loadPending()
  if (!p || p.use !== 'write') return null
  const to = d.kind === 'name' ? normHandle(d.at) : normHandle(d.to)
  return !p.to || normHandle(p.to) === to ? p : null
}

// The @ a note went to privately from this entry of the history, when it
// did. "your private notes" on the screen that says so raises the account
// sheet over this one, and closing that sheet comes back one step, to this
// address, where the composer is drawn afresh: it opens again on "sent
// privately." rather than on an empty letter to the same person. Written on
// the entry itself (`wallSent`), so a composer opened later, which is an
// entry of its own, starts as a composer.
function sentFrom(prefill) {
  const s = window.history.state && window.history.state.wallSent
  return s && (!prefill || s === targetKey(prefill)) ? String(s) : ''
}

// ── asking for the link again ───────────────────────────────────────────────
// It waits before it offers, as the code's does (parts.jsx `Resend`): a
// button pressed three times in eight seconds mails three links and walks
// somebody into the limit on the address.
function ResendLink({ onSend, wait = 30 }) {
  const [left, setLeft] = useState(wait)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  useEffect(() => {
    if (left <= 0) return undefined
    const t = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  if (busy) return <p className="wl-resend">sending</p>
  if (left > 0) {
    return (
      <p className="wl-resend" role="status" aria-live="polite">
        {sent ? 'a new link is on its way' : 'no email yet?'} <span className="wl-resend-clock">{left}s</span>
      </p>
    )
  }
  return (
    <button
      type="button" className="wl-quiet wl-resend-go"
      onClick={async () => { setBusy(true); const ok = await onSend(); setBusy(false); if (ok !== false) { setSent(true); setLeft(wait) } }}
    >
      send it again
    </button>
  )
}

export default function Write({
  to: prefill, go, back, up = back, upLabel = 'back to the wall', nested = false, reduce = false, toWall = null,
}) {
  const [d0] = useState(() => draftFor(prefill))
  const [sentTo] = useState(() => sentFrom(prefill))
  // A prefill that is a name key (`~sofia`, from "write to Sofia" on a
  // letter) opens the composer on the name, in name mode.
  const named = !!prefill && isNameKey(prefill)
  const [kind, setKind] = useState(() => (named ? 'name' : prefill ? 'handle' : (d0.kind === 'name' ? 'name' : 'handle')))
  const [to, setTo] = useState(() => (named ? '' : prefill || sentTo || d0.to || ''))
  const [name, setName] = useState(() => (named ? nameFor(prefill) : d0.name || ''))
  // the @ the name nudge asks for, under a name
  const [at, setAt] = useState(() => (prefill ? '' : d0.at || ''))
  const [body, setBody] = useState(() => d0.body || '')
  const [look, setLook] = useState(() => normaliseLook(d0.look) || freshLook())
  // the greeting as the writer set it, or null while it follows the name
  const [greet, setGreet] = useState(() => (typeof d0.greet === 'string' ? d0.greet : null))
  // a name note's school: a slug, '' for none, or null before one is chosen
  const [school, setSchool] = useState(() => (typeof d0.school === 'string' ? d0.school : null))
  // how a letter to an @ goes up (data.js `draftPost`): 'none', from
  // anybody, read first; or 'edu', as a Berkeley student. Kept with the
  // draft, so a draft waiting on the Berkeley link posts as one wherever the
  // link is opened (screens/Verify.jsx). A draft kept from before this
  // carries none, and one of those waiting on the link was always the
  // Berkeley kind
  const [postAs, setPostAs] = useState(() => (d0.proof === 'edu' || (d0.proof == null && live(d0.held)) ? 'edu' : 'none'))
  // one per draft, kept with it
  const [nonce, setNonce] = useState(() => d0.nonce || newNonce())
  const renonce = useCallback(() => setNonce(newNonce()), [])
  // the Berkeley link this draft is waiting on
  const [held, setHeld] = useState(() => live(d0.held))
  const [igHeld] = useState(() => resumeIg(d0))
  // who · 1 (the letter) · how · edu · ig · done
  const [step, setStep] = useState(() => (sentTo ? 'done' : live(d0.held) ? 'edu' : igHeld ? 'ig' : prefill ? 1 : 0))
  const [done, setDone] = useState(() => (sentTo ? 'private' : ''))
  const [styling, setStyling] = useState(false)
  const wide = useWide()
  const letterRef = useRef(null)
  const greetRef = useRef(null)
  const atRef = useRef(null)
  const [settled, setSettled] = useState(false)
  const field = useRef(null)
  const sheet = useRef(null)
  const by = useRef('')
  const leave = () => (by.current === 'sent' ? back() : up())
  // ── and back onto the wall ──
  // The wall under the sheet drops its veil first (the head of this file),
  // so what the sheet uncovers is the names, with the new one pulsing among
  // them, and not the poster. The close mark on the last screen says "back
  // to the wall" too, where the composer stands on the wall and not on a
  // letter (index.jsx `nested`), and goes to the same place.
  const home = () => {
    if (toWall) toWall()
    if (sheet.current) sheet.current.dismiss('sent')
    else back()
  }
  const onClosing = (b) => {
    by.current = b
    if (b !== 'sent' && step === 'done' && !nested && toWall) toWall()
  }

  const h = normHandle(to)
  const nm = cleanName(name)
  const nudge = normHandle(at)
  // whether this letter goes to an @: the Instagram kind, or a name with its @
  const toAt = kind === 'handle' || (kind === 'name' && validHandle(nudge))
  const target = kind === 'handle' ? h : nudge
  // what the letter is filed under: the handle, or the tilde key of the name
  const key = kind === 'name' && !toAt ? nameKey(nm) : target
  const caught = body.trim() ? fault(body) : ''
  const ok = [kind === 'name' ? !!nm : validHandle(h), body.trim().length > 0]
  const [asking, setAsking] = useState(false)
  const resolving = kind === 'handle' && (asking || settled)

  const [sending, setSending] = useState(false)
  const [said, setSaid] = useState('')
  const [shaking, setShaking] = useState(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  useEffect(() => { loadQuota(); loadCampuses() }, [])
  const left = allowance()
  const spent = !!left && left.left <= 0

  // ── the draft, kept ──
  // Every change is written through, the nonce and the link it waits on with
  // it, so a reload or a second tab picks up exactly this (data.js `postDraft`).
  // What the server or the screen said was about the words as they were, so
  // a keystroke in the letter or its greeting takes it off.
  // A composer drawn again on a note it sent (`sentFrom`) keeps nothing: the
  // draft went with the note.
  const words = useRef(`${body}\u0000${greet}`)
  useEffect(() => {
    if (sentTo) return
    patch({ draft: { to: h, body, kind, name, at, look, greet, school, proof: postAs, nonce, held } })
    const now = `${body}\u0000${greet}`
    if (now !== words.current) { words.current = now; setSaid('') }
  }, [sentTo, h, body, kind, name, at, look, greet, school, postAs, nonce, held])

  const them = useResolver(kind === 'name' ? '' : to)
  const prof = useProfile(kind === 'name' ? '' : h)
  const profFirst = prof && prof.name ? String(prof.name).trim().split(/\s+/)[0] : ''
  // the name the greeting is made of: the name, or the resolver's first
  // name for the @, and never the @ (the head of this file says why)
  const toFirst = kind === 'name' ? nm : profFirst
  const defaultGreet = `dear ${toFirst || NO_NAME}`
  const greeting = greet === null ? defaultGreet : greet
  // an @ the resolver has no name for, and a greeting nobody has changed:
  // the line under the card asks for their name
  const askName = kind === 'handle' && !profFirst && greet === null
  // the hint over the greeting, the first time: shown until it is tapped once
  const [hint, setHint] = useState(() => !getState().greetSeen)
  const seenHint = useCallback(() => { setHint(false); patch({ greetSeen: true }) }, [])
  const onGreet = useCallback((v) => setGreet(v === defaultGreet ? null : v), [defaultGreet])

  const sug = useSuggest(kind === 'name' ? name : to, {
    skip: step !== 0 || asking || settled || (kind === 'handle' && them.at.state === 'found' && them.at.handle === h),
    exclude: key,
    onPick: (t) => {
      if (t.kind === 'name') { setKind('name'); setName(t.name || nameFor(t.handle)) }
      else { setKind('handle'); setTo(t.handle) }
    },
  })
  const pickKind = useCallback((k) => { setKind(k); setSaid(''); setSettled(false) }, [])
  const retype = useCallback((v) => { setTo(v); setSettled(false) }, [])
  const retry = useCallback(() => {
    setSettled(false)
    requestAnimationFrame(() => {
      const el = field.current
      if (!el) return
      el.focus()
      const n = el.value.length
      try { el.setSelectionRange(n, n) } catch { /* not a text input */ }
    })
  }, [])
  const [info, setInfo] = useState(false)

  const shake = useCallback(() => {
    if (reduce) return
    setShaking(true)
    try { if (navigator.vibrate) navigator.vibrate(24) } catch { /* not a phone */ }
  }, [reduce])

  // the draft as it stands, for the post
  const draftNow = () => ({ to: h, body, kind, name, at, look, greet, school: schoolPicked(), proof: postAs, nonce, held })

  // ── a name note's school ──
  // The open campuses (api.js `campuses`), and none. It starts on the
  // school this device is verified at, when it is one of them.
  const list = openCampuses() || []
  const mySchool = eduDomain() ? slugOfDomain(eduDomain()) : ''
  const schoolPicked = () => (school !== null ? school : list.some((c) => c.slug === mySchool) ? mySchool : '')

  // ── what the wall answered ──
  const landedWall = (out, p) => {
    if (out.ok && out.status === 'live') { home(); return }
    if (out.ok && out.status === 'pending') { setDone('pending'); setStep('done'); return }
    if (out.ok && out.status === 'rejected') {
      if (out.id) patch({ noticed: { ...(getState().noticed || {}), [out.id]: true } })
      renonce()
      setStep(1)
      // what the reading found, and the one thing to change (moderate.js
      // `whyNot`), rather than one sentence for every refusal
      setSaid(whyNot(out.reasons))
      shake()
      return
    }
    const e = out.error || 'network'
    if (e !== 'network' && e !== 'offline') renonce()
    if (e === 'edu') { setHeld(null); setWrongSchool(false); setStep('edu'); return }
    if (e === 'campus') { setHeld(null); setWrongSchool(true); setStep('edu'); return }
    if (e === 'gate' || e === 'no_session') {
      // a function from before the one wall: an @ still needs the campus
      // address there, and a name needs a sign in
      if (p && p.kind === 'handle') { setHeld(null); setStep('edu'); return }
      setAfterGate({ name: 'write', id: key })
      go('gate')
      return
    }
    if (e === 'salutation') {
      setStep(1)
      setSaid(WALL_SAY.salutation)
      requestAnimationFrame(() => greetRef.current && greetRef.current.focus())
      return
    }
    if (e === 'name' || e === 'handle') { setStep(0); setSaid(WALL_SAY[e]); return }
    if (e === 'cap') { setStep('how'); setSaid(''); return }
    setSaid(WALL_SAY[e] || WALL_SAY.network)
  }

  // ── posting on the wall ──
  async function postWall(over = null) {
    if (sending) return
    setSending(true)
    setSaid('')
    const d = { ...draftNow(), ...(over || {}) }
    const out = await postDraft(d)
    if (!alive.current) return
    setSending(false)
    landedWall(out || { ok: false, error: 'network' }, { kind: over && over.kind === 'name' ? 'name' : toAt ? 'handle' : 'name' })
  }

  // ── the Berkeley address, and the link ──
  const [email, setEmail] = useState(() => (live(d0.held) ? d0.held.email.replace(/@berkeley\.edu$/, '') : ''))
  const [busy, setBusy] = useState(false)
  const [wrongSchool, setWrongSchool] = useState(false)
  const [code, setCode] = useState('')
  const whole = email.includes('@')
  const address = whole ? normEmail(email) : normEmail(`${email}@${DOMAIN}`)
  const emailOk = validEmail(address, DOMAIN)
  // a whole address somewhere else (oski@stanford.edu): the key is live, and
  // pressing it, or Enter, says why it cannot go, rather than a dim key and
  // nothing
  const elsewhere = whole && !emailOk && anyEmail(address)

  const sendIt = async () => {
    if (elsewhere && !busy) { setSaid('only a berkeley.edu address posts marked from Berkeley.'); return false }
    if (!emailOk || busy) return false
    setBusy(true)
    setSaid('')
    const out = await sendLink({ email: address, session: sessionToken(), purpose: 'edu', campus: 'berkeley' })
    if (!alive.current) return false
    if (!out.ok && out.error === 'unsupported') {
      // a function that does not mail the link yet: the code it always mailed
      const got = await sendCampusCode(address)
      if (!alive.current) return false
      setBusy(false)
      if (!got.ok) { setSaid(got.error === 'rate' ? WALL_SAY.rate : got.error === 'domain' || got.error === 'email' ? 'that is not a berkeley.edu address.' : WALL_SAY.send); return false }
      setCode('')
      setHeld({ email: address, request: '', match: null, legacy: got.token, at: Date.now() })
      return true
    }
    setBusy(false)
    if (!out.ok) {
      setSaid(
        out.error === 'domain' || out.error === 'email' ? 'that is not a berkeley.edu address.'
          : out.error === 'rate' ? WALL_SAY.rate
          : out.error === 'taken' ? 'that address is already confirmed on another account.'
          : WALL_SAY.send,
      )
      return false
    }
    // A link asked for again leaves the one before it alive, for its thirty
    // minutes: the mail that came late is the one somebody taps. So the
    // requests before it are kept with it and asked after too, and the
    // screen says to use the newest mail, since it is the newest one's number
    // on the glass.
    setHeld((was) => ({
      email: address, request: out.request, match: out.match, at: Date.now(),
      earlier: was && was.request && was.email === address ? [...(was.earlier || []), was.request].slice(-4) : [],
    }))
    return true
  }

  // the link was tapped, here or on any device: this session is verified,
  // and the letter goes up
  const post = useRef(postWall)
  post.current = postWall
  const confirmed = useCallback(async () => {
    await refresh()
    if (!alive.current) return
    setHeld(null)
    post.current()
  }, [])
  // and every link this draft asked for ran out: the address again, kept,
  // with the line that says so
  const lapsed = useCallback(() => {
    setHeld(null)
    setSaid('that link has run out. send a new one.')
  }, [])

  // ── waiting on the link ──
  // Asked every two and a half seconds, and at once when the tab comes back
  // to the screen, which is when somebody who tapped the link in their mail
  // app has come back to it. Every link this draft asked for is asked after,
  // the newest first, and any one of them tapped is the letter going up: the
  // wait used to follow the newest alone, and a first link tapped after
  // "send it again" confirmed the address and left this screen waiting for
  // ever. A link that has run out, or was spent on a wrong number on another
  // device (celestual-edu-verify), is let go; when none is left the screen
  // says so and asks again, as the door's wait does (linkdoor.jsx
  // `useLinkWait`).
  const requests = step === 'edu' && held && held.request ? [...new Set([held.request, ...(held.earlier || [])])].join(' ') : ''
  useEffect(() => {
    if (!requests) return undefined
    let stop = false
    let polling = false
    let timer = 0
    let open = requests.split(' ')
    const tick = async () => {
      if (stop || polling) return
      polling = true
      const outs = await Promise.all(open.map((request) => linkStatus({ request, session: sessionToken() })))
      polling = false
      if (stop || !alive.current) return
      if (outs.some((out) => out.ok && out.verified)) { stop = true; clearTimeout(timer); confirmed(); return }
      open = open.filter((_, i) => !((outs[i].ok && outs[i].expired) || outs[i].error === 'invalid'))
      if (!open.length) { stop = true; clearTimeout(timer); lapsed(); return }
      timer = setTimeout(tick, 2500)
    }
    timer = setTimeout(tick, 2500)
    const onBack = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onBack)
    window.addEventListener('focus', onBack)
    return () => {
      stop = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onBack)
      window.removeEventListener('focus', onBack)
    }
  }, [requests, confirmed, lapsed])

  // the code, for a function that mailed one
  const checkCode = async () => {
    if (!held || !held.legacy || busy || code.length < 4) return
    setBusy(true)
    setSaid('')
    const out = await checkCampusCode(held.legacy, code)
    if (!alive.current) return
    setBusy(false)
    if (!out.ok) { setSaid(out.error === 'expired' ? 'that code has lapsed. ask for another.' : 'that code is not right.'); return }
    confirmed()
  }

  // ── not at Berkeley: the same letter, on the wall ──
  // It used to go to their name instead, with the @ taken off, since an @
  // was what asked for Berkeley. Anybody writes to an @ now (0066): the same
  // letter, to the same @, goes up the way anybody's does, read first and
  // without the Berkeley mark.
  const toOpen = () => {
    setHeld(null)
    setWrongSchool(false)
    setSaid('')
    setPostAs('none')
    postWall({ proof: 'none' })
  }

  // ── sending it privately ──
  const [adopted, setAdopted] = useState(null)
  const proof = useProve({
    use: 'write', held: igHeld,
    stash: { to: target },
    onLanded: async (got, asked, spent) => {
      await refresh()
      if (!alive.current) return
      if (got && got !== asked) { setAdopted({ handle: got, proof: spent }); return }
      sendPrivately(got || asked, spent)
    },
  })

  async function sendPrivately(from = '', spent = null) {
    const me = normHandle(from || myHandle())
    if (sending) return
    if (me && me === target) { setSaid(PING_SAY.self); setStep('how'); return }
    setSending(true)
    setSaid('')
    const out = await place({ me, them: target, proof: spent || heldProof(me), words: body.trim() })
    if (!alive.current) return
    setSending(false)
    if (!out.ok) {
      if (out.error === 'unverified') {
        dropProof()
        setAdopted(null)
        setStep('ig')
        proof.setSaid('that proof has lapsed. one more DM proves it again')
        return
      }
      setStep('how')
      setSaid(PING_SAY[
        out.error === 'no_slots' || out.error === 'cap' ? 'slots'
          : out.error === 'self' ? 'self'
          : out.error === 'suppressed' ? 'suppressed'
          : out.error === 'rate_limited' ? 'rate'
          : out.error === 'invalid' ? 'invalid'
          : out.error === 'card' ? 'card'
          : 'night'])
      return
    }
    forgetPings()
    setAdopted(null)
    patch({ draft: null })
    try { window.history.replaceState({ ...window.history.state, wallSent: target }, '') } catch { /* a sandbox */ }
    setDone('private')
    setStep('done')
  }

  // ── the three choices ──
  // The wall, from anybody: posted as it is, and read before it goes up.
  const chooseWall = () => {
    if (sending || spent) return
    setSaid('')
    setPostAs('none')
    postWall({ proof: 'none' })
  }
  // As a Berkeley student, which is a letter to an @ (the row stands for
  // nothing else): posted at once from a device already confirmed, and
  // otherwise the link first, with the draft kept waiting on it.
  const chooseCal = () => {
    if (sending || spent || !toAt) return
    setSaid('')
    setPostAs('edu')
    if (eduBerkeley()) { postWall({ proof: 'edu' }); return }
    setWrongSchool(false)
    setStep('edu')
  }
  const choosePrivate = () => {
    if (sending) return
    setSaid('')
    if (!toAt) {
      // a ping needs an @: the field that takes one
      setStep(0)
      setKind('name')
      requestAnimationFrame(() => atRef.current && atRef.current.focus())
      return
    }
    if (canPlace()) { sendPrivately(); return }
    // a person signed in a beat ago holds their @ already and its proof is
    // on its way back (pings.js `readyToPlace`, 0065): wait for it rather
    // than ask for a DM they have already sent once
    if (myHandle()) {
      readyToPlace().then((proof) => { if (proof) sendPrivately(); else setStep('ig') }, () => setStep('ig'))
      return
    }
    setStep('ig')
  }

  async function next() {
    if (step === 0) {
      if (!ok[0] || asking) return
      if (kind === 'name') {
        if (at.trim() && !validHandle(nudge)) { setSaid('that @ does not look right.'); return }
        learnName(nameKey(nm), nm)
        setSaid('')
        setStep(1)
        return
      }
      if (!settled) {
        setAsking(true)
        const r = await them.ask()
        setAsking(false)
        if (r && (r.state === 'found' || r.state === 'missing')) { setSettled(true); return }
      }
      setStep(1)
      return
    }
    if (step === 1) {
      if (!ok[1] || sending) return
      if (caught) { shake(); return }
      setSaid('')
      setStyling(false)
      setStep('how')
    }
  }

  const toWho = useCallback(() => { setStyling(false); setStep(0) }, [])

  // ── the key that takes a character back ──
  const clearOne = () => {
    const el = letterRef.current
    if (!el || document.activeElement !== el) {
      setBody(body.replace(/(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S])$/, ''))
      return
    }
    let a = el.selectionStart
    const b = el.selectionEnd
    if (a === b) {
      if (!a) return
      a -= 1
      if (a && /[\uDC00-\uDFFF]/.test(el.value[a])) a -= 1
    }
    el.setRangeText('', a, b, 'end')
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const onEscape = () => {
    const inPanel = document.activeElement && document.activeElement.closest('.wl-look')
    if (wide ? !inPanel : !styling) return false
    if (!wide) setStyling(false)
    if (inPanel) document.querySelector('.wl-write-card .wl-sk.is-l')?.focus()
    return true
  }
  const colourKey = wide
    ? {
      label: 'colour', aria: 'choose the colour it is lit in',
      onClick: () => document.querySelector('.wl-write .wl-look-opt[aria-checked="true"]')?.focus(),
    }
    : {
      label: styling ? 'done' : 'colour', onClick: () => setStyling((v) => !v), on: styling, pressed: styling,
      aria: styling ? 'done with the colour' : 'choose the colour it is lit in',
    }
  const seed = `draft:${key || 'wall'}`
  const colourSwipe = useColourSwipe(look, seed, setLook)

  // ── the steps ──
  const dot = step === 0 ? 0 : step === 1 ? 1 : 2
  const goDot = (i) => {
    if (sending) return
    if (step === 'ig') proof.drop()
    setSaid('')
    if (i === 0) toWho()
    if (i === 1) setStep(1)
  }

  let body_ = null
  let foot = null

  if (step === 0) {
    body_ = (
      <>
        <Display size="s" as="h2" id="wl-write-h" className="wl-write-h">
          {campus().someone[0]}<br />{campus().someone[1]}
        </Display>
        <div className="wl-write-step wl-write-who" style={{ '--i': kind === 'name' ? 1 : 0 }}>
          <Segmented
            className="wl-write-tabs" value={kind} onChange={pickKind} options={KINDS}
            label="who the letter is for, by their Instagram or by anything else"
          />
          <div className={`wl-write-body${resolving ? ' is-answering' : ''}`}>
            {resolving ? <Light on={asking} plate="none" /> : null}
            {resolving ? (
              <Addressed at={them.at} looking={asking} onClear={retry} label="not them. type it again" />
            ) : (
              <HandleField
                kind={kind}
                value={kind === 'name' ? name : to}
                onChange={kind === 'name' ? (v) => setName(v.slice(0, MAX_NAME)) : retype}
                onSubmit={next}
                autoFocus size="lg" inputRef={field}
                placeholder={kind === 'name' ? 'whatever you call them' : 'theirhandle'}
                label={kind === 'name' ? 'a name, a nickname, anything' : 'Instagram handle'}
                onKeyDown={sug.keyDown}
              />
            )}
          </div>
          <Suggest sug={sug} />
          {/* ── the name nudge ──
              Under a name, their @, if the writer knows it. Optional, and it
              says why with the (i): it reaches them, and it asks for one
              check at the send. */}
          {kind === 'name' ? (
            <div className="wl-nudge">
              <div className="wl-nudge-head">
                <Label as="span" tone="dim" className="wl-nudge-lab">their Instagram @ (optional)</Label>
                <button
                  type="button" className={`wl-nudge-i${info ? ' is-on' : ''}`} onClick={() => setInfo((v) => !v)}
                  aria-expanded={info} aria-controls="wl-nudge-pop" aria-label="why add their @"
                >
                  i
                </button>
              </div>
              {info ? (
                <p id="wl-nudge-pop" className="wl-nudge-pop" role="note">
                  add their @ so it reaches them. without it, there&rsquo;s a lower chance they end up
                  reading it. the @ is never shown on the letter, only the name.
                </p>
              ) : null}
              <HandleField
                value={at} onChange={(v) => { setAt(v); setSaid('') }} onSubmit={next}
                inputRef={atRef} placeholder="theirhandle" label="their Instagram handle, optional"
              />
            </div>
          ) : null}
          <div className="wl-write-floor" aria-live="polite">
            {said ? <Label className="wl-write-caught">{said}</Label> : null}
          </div>
        </div>
      </>
    )
    foot = (
      <Pill tone="light" onClick={next} disabled={!ok[0]} aria-busy={asking || undefined}>
        {asking ? 'looking' : settled && kind === 'handle' ? confirmWord(them.at, 'next') : 'next'}
      </Pill>
    )
  } else if (step === 1 || step === 'done') {
    const fin = step === 'done'
    const floor = caught || said
    body_ = (
      <>
        <Display size="s" as="h2" id="wl-write-h" className="wl-write-h">
          {!fin ? <>and what<br />makes them so.</>
            : done === 'private' ? <>sent privately.</>
            : <>it&rsquo;s being<br />read.</>}
        </Display>
        <div className="wl-write-step">
          <div
            {...(fin ? {} : colourSwipe)}
            className={`wl-write-card${shaking ? ' is-shaking' : ''}`}
            onAnimationEnd={(e) => { if (e.animationName === 'wl-shake') setShaking(false) }}
          >
            <span className="wl-write-light" aria-hidden="true">
              <RoomLight key={colourOf(look, seed).slug} look={look} seed={seed} />
            </span>
            {/* The same screen the wall shows, with the line across its top
                that goes up with it: "dear" and the name, the writer's to
                change, in the line's own face (screen.jsx `Greet`). */}
            <Screen
              look={look} seed={seed} live
              top={fin ? {
                salutation: greeting, icon: 'pen', stamp: stampOf(Date.now()),
              } : {
                greet: {
                  value: greeting, onChange: onGreet, max: MAX_GREET, placeholder: defaultGreet,
                  label: 'the greeting. tap to change it', inputRef: greetRef, onFocus: seenHint,
                },
                icon: 'pen',
                counter: `${MAX_BODY - body.length}/1`,
              }}
              keys={fin ? {} : {
                l: colourKey,
                r: body
                  ? { label: 'clear', onClick: clearOne, keepFocus: true, aria: 'take a character back' }
                  : { label: 'back', onClick: toWho, aria: `for ${labelFor(key)}. change who it is for` },
              }}
            >
              {/* the ping sheet's own words for a note sent privately
                  (screens/Ping.jsx), and the server's for a letter held
                  for the desk (celestual-wall-moderate `say`), so one state
                  has one name wherever it is met */}
              {fin ? (
                done === 'private' ? (
                  <ScreenNote glyph="check" title="sixty days">if they send you one in that time, you both find out.</ScreenNote>
                ) : (
                  <ScreenNote glyph="wait" title="being read">it goes up once it passes.</ScreenNote>
                )
              ) : (
                <ScreenDraft
                  value={body} onChange={setBody} max={MAX_BODY} autoFocus inputRef={letterRef}
                  placeholder={EXAMPLES()[hash(key || 'wheeler') % EXAMPLES().length]}
                />
              )}
            </Screen>
            <div className="wl-write-floor" aria-live="polite">
              {floor ? <Label className="wl-write-caught">{floor}</Label>
                : !fin && askName ? <Label tone="dim" className="wl-write-hint">tap the greeting to put their name in</Label>
                : !fin && hint ? <Label tone="dim" className="wl-write-hint">tap the greeting to change it</Label>
                : null}
            </div>
          </div>
          {!fin && (styling || wide) ? <LookPanel look={look} onChange={setLook} seed={seed} reveal={styling && !wide} /> : null}
        </div>
      </>
    )
    foot = fin ? (
      <>
        <Pill tone="light" onClick={home}>back to the wall</Pill>
        {done === 'private' ? (
          <button type="button" className="wl-quiet" onClick={() => { if (toWall) toWall(); go('you') }}>your private notes</button>
        ) : null}
      </>
    ) : (
      <Pill tone="light" onClick={next} disabled={!ok[1]}>send anonymously</Pill>
    )
  } else if (step === 'how') {
    // ── ONE DECISION ──
    // Three rows for a letter to an @, two for a letter to a name (the head
    // of this file). Each is a title, what it does, and what it asks, and
    // what it asks is skipped where this device has already answered it.
    // The week's allowance, when the desk has it on and it is spent, closes
    // both of the wall's rows and says when; the private one stays open.
    const waiting = spent ? { tone: 'is-warn', glyph: 'wait', text: waitLine(left && left.resets) } : null
    const wallAsks = waiting || { tone: '', glyph: 'wait', text: 'read before it goes up' }
    const calAsks = waiting
      || (eduBerkeley() ? { tone: 'is-done', glyph: 'check', text: 'you’re confirmed at Berkeley' }
        : { tone: '', glyph: 'key', text: 'asks you to confirm you’re at Berkeley' })
    const mine = myHandle()
    const privAsks = !toAt ? { tone: 'is-off', glyph: 'arrow', text: 'add their @ to send privately' }
      : canPlace() && mine ? { tone: 'is-done', glyph: 'check', text: `goes from ${atHandle(mine)}` }
      : { tone: '', glyph: 'key', text: 'asks you to confirm this is your Instagram' }
    const picked = schoolPicked()
    const busyWith = (which) => sending && postAs === which
    body_ = (
      <>
        <Display size="s" as="h2" id="wl-write-h" className="wl-write-h">how public<br />is it?</Display>
        <div className="wl-write-step wl-how">
          <Label as="p" tone="dim" className="wl-how-for">
            your letter to <span className="wl-h">{toAt ? atHandle(target) : nm}</span>
          </Label>
          <div className="wl-how-list" role="group" aria-labelledby="wl-write-h">
            <div className={`wl-how-opt is-wall${spent ? ' is-off' : ''}`}>
              <button
                type="button" className="wl-how-go" onClick={chooseWall} disabled={spent}
                aria-busy={busyWith('none') || undefined}
              >
                <span className="wl-how-mark" aria-hidden="true"><PixIcon name="env" scale={3} /></span>
                <span className="wl-how-text">
                  <span className="wl-how-title">post on the wall</span>
                  <span className="wl-how-why">public, and nobody sees who wrote it.</span>
                  <span className={`wl-how-asks ${wallAsks.tone}`}>
                    {busyWith('none') ? <><Wait />posting</> : <><PixIcon name={wallAsks.glyph} scale={2} />{wallAsks.text}</>}
                  </span>
                </span>
                <span className="wl-how-arrow" aria-hidden="true"><PixIcon name="arrow" scale={2} /></span>
              </button>
              {!toAt ? (
                <div className="wl-how-pick" role="radiogroup" aria-label="tag a school">
                  <span className="wl-how-pick-lab" aria-hidden="true">tag a school</span>
                  {[{ slug: '', name: 'no school' }, ...list].map((c) => (
                    <button
                      type="button" key={c.slug || 'none'} role="radio" aria-checked={picked === c.slug}
                      className={`wl-how-chip${picked === c.slug ? ' is-on' : ''}`}
                      onClick={() => setSchool(c.slug)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {toAt ? (
              <div className={`wl-how-opt is-cal${spent ? ' is-off' : ''}`}>
                <button
                  type="button" className="wl-how-go" onClick={chooseCal} disabled={spent}
                  aria-busy={busyWith('edu') || undefined}
                >
                  <span className="wl-how-mark" aria-hidden="true"><Sticker school={BERKELEY} tilt={-7} label="" /></span>
                  <span className="wl-how-text">
                    <span className="wl-how-title">post as a Berkeley student</span>
                    <span className="wl-how-why">public, marked from Berkeley. it goes up at once.</span>
                    <span className={`wl-how-asks ${calAsks.tone}`}>
                      {busyWith('edu') ? <><Wait />posting</> : <><PixIcon name={calAsks.glyph} scale={2} />{calAsks.text}</>}
                    </span>
                  </span>
                  <span className="wl-how-arrow" aria-hidden="true"><PixIcon name="arrow" scale={2} /></span>
                </button>
              </div>
            ) : null}
            <div className={`wl-how-opt is-private${toAt ? '' : ' is-off'}`}>
              <button type="button" className="wl-how-go" onClick={choosePrivate} aria-describedby="wl-how-priv">
                <span className="wl-how-mark" aria-hidden="true"><PixIcon name="lock" scale={3} /></span>
                <span className="wl-how-text">
                  <span className="wl-how-title">send privately</span>
                  <span className="wl-how-why">only they&rsquo;ll ever know, and only if it&rsquo;s mutual.</span>
                  <span className={`wl-how-asks ${privAsks.tone}`} id="wl-how-priv">
                    <PixIcon name={privAsks.glyph} scale={2} />{privAsks.text}
                  </span>
                </span>
                <span className="wl-how-arrow" aria-hidden="true"><PixIcon name="arrow" scale={2} /></span>
              </button>
            </div>
          </div>
          <div className="wl-write-floor" aria-live="polite">
            {said ? <Label className="wl-write-caught">{said}</Label> : null}
          </div>
        </div>
      </>
    )
    foot = (
      <button type="button" className="wl-quiet" onClick={() => { setSaid(''); setStep(1) }}>back to the letter</button>
    )
  } else if (step === 'edu') {
    // ── confirm you're at Berkeley ──
    // The address, then the wait for the link, with the two digits of this
    // request, "your number". They are on this screen and nowhere else: the
    // mail no longer prints them, and a link opened on another device than
    // this one asks for them before it confirms anything, so a link nobody
    // here asked for cannot sign anybody in (celestual-edu-verify). Opened on
    // this device it confirms at once. After "send it again" it is the
    // newest mail whose number this is, and the screen says to use that one.
    // The way out of it is said plainly: not at Berkeley, the same letter
    // goes up on the wall, read first, without the mark.
    const waiting = !!held
    const again = waiting && !!(held.earlier && held.earlier.length)
    body_ = (
      <div className="wl-write-step wl-edu">
        <div className="wl-door">
          <div className="wl-door-head wl-edu-head">
            <Sticker school={BERKELEY} tilt={-6} className="wl-edu-sticker" label="" />
            <Display size="s" as="h2" id="wl-write-h" className="wl-door-title">
              {wrongSchool ? <>you&rsquo;re confirmed<br />at another school.</>
                : waiting ? <>check your inbox.</>
                : <>confirm you&rsquo;re<br />at Berkeley.</>}
            </Display>
            <p className="wl-door-say">
              {wrongSchool ? 'only a Berkeley address posts marked from Berkeley. it can still go up on the wall, read first.'
                : waiting ? (held.legacy
                  ? <>we mailed a code to <span className="wl-h">{held.email}</span>. type it here and your letter goes up.</>
                  : held.match != null
                    ? <>at <span className="wl-h">{held.email}</span>. tap the link in the {again ? 'newest mail' : 'mail'}. on another phone or computer, it asks for this number.</>
                    : <>at <span className="wl-h">{held.email}</span>. tap the link and your letter goes up.</>)
                : 'the Berkeley mark is for Berkeley students. we email you one link, and your address never goes on the letter.'}
            </p>
          </div>
          <div className="wl-door-ways">
            {wrongSchool ? (
              <Pill tone="light" wide onClick={toOpen} aria-busy={sending || undefined}>{sending ? 'posting' : 'post it on the wall'}</Pill>
            ) : waiting && held.legacy ? (
              <>
                <CodeBox value={code} onChange={setCode} onSubmit={checkCode} autoFocus />
                <Pill tone="light" wide disabled={code.length < 4 || busy} onClick={checkCode}>{busy ? 'checking' : 'confirm'}</Pill>
              </>
            ) : waiting ? (
              <>
                {held.match != null ? (
                  <div className="wl-edu-match" role="group" aria-label={`your number, ${held.match}`}>
                    <span className="wl-edu-match-lab" aria-hidden="true">your number</span>
                    <span className="wl-edu-match-n" aria-hidden="true">{held.match}</span>
                  </div>
                ) : null}
                <p className="wl-edu-wait" role="status">
                  {sending ? <><Wait />posting your letter</> : <><Wait />waiting for the link</>}
                </p>
                <ResendLink onSend={sendIt} />
              </>
            ) : (
              <>
                <AddressField
                  value={email} onChange={(v) => { setEmail(v); setSaid('') }} onSubmit={sendIt}
                  domain={DOMAIN} autoFocus label="your berkeley email"
                />
                <Pill tone="light" wide disabled={!(emailOk || elsewhere) || busy} onClick={sendIt} aria-busy={busy || undefined}>
                  {busy ? 'sending' : 'send me the link'}
                </Pill>
              </>
            )}
          </div>
          <div className="wl-gate-fault" aria-live="polite">{said}</div>
          {wrongSchool || waiting ? null : (
            <button type="button" className="wl-quiet wl-edu-out" onClick={toOpen}>
              not at Berkeley? post it on the wall without the Berkeley mark.
            </button>
          )}
        </div>
      </div>
    )
    foot = waiting && !wrongSchool ? (
      <button type="button" className="wl-quiet" onClick={() => { setHeld(null); setCode(''); setSaid('') }}>use a different address</button>
    ) : (
      <button type="button" className="wl-quiet" onClick={() => { setSaid(''); setWrongSchool(false); setStep('how') }}>back</button>
    )
  } else if (step === 'ig') {
    // ── confirm this is your Instagram ──
    // The ping's own door (screens/Ping.jsx `ProveDoor`): the @, one DM,
    // and the note goes to them the moment the DM lands. A DM from another
    // account than the one typed asks before it sends as that one.
    body_ = (
      <div className="wl-write-step wl-ping-prove">
        {adopted ? (
          <div className="wl-door">
            <div className="wl-door-head">
              <Display size="s" as="h2" id="wl-write-h" className="wl-door-title">
                the DM came from<br />{atHandle(adopted.handle)}.
              </Display>
              <p className="wl-door-say">send it privately as {atHandle(adopted.handle)}?</p>
            </div>
            <div className="wl-door-ways">
              <Pill tone="light" wide onClick={() => sendPrivately(adopted.handle, adopted.proof)} aria-busy={sending || undefined}>
                {sending ? 'sending' : `send it as ${atHandle(adopted.handle)}`}
              </Pill>
            </div>
            <div className="wl-gate-fault" aria-live="polite">{said}</div>
          </div>
        ) : (
          <ProveDoor
            p={proof} headId="wl-write-h" onAsk={() => proof.ask(target)}
            title={<>confirm this is<br />your Instagram.</>}
            say="only they’ll ever know, and only if it’s mutual. one DM proves the @ is yours."
          />
        )}
      </div>
    )
    foot = adopted ? (
      <button type="button" className="wl-quiet" onClick={() => { setAdopted(null); proof.drop() }}>not that account</button>
    ) : proof.dm ? (
      <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
    ) : (
      <button type="button" className="wl-quiet" onClick={() => { setSaid(''); setStep('how') }}>back</button>
    )
  }

  return (
    <Sheet
      ref={sheet} onClose={leave} onClosing={onClosing} onEscape={onEscape}
      tall labelledBy="wl-write-h" className="is-write"
    >
      <div className={`wl-sheet-in wl-write is-${typeof step === 'number' ? `step${step}` : step}`}>
        <SheetHead
          onClose={leave} label={step === 'done' ? upLabel : 'back'}
          lead={step === 'done' ? null : <Dots n={3} at={dot} onGo={goDot} />}
        />
        {body_}
        <div className="wl-write-foot">
          {foot}
        </div>
        {step === 'ig' ? <DoorFoot /> : null}
      </div>
    </Sheet>
  )
}
