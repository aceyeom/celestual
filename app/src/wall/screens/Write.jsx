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
//     post as a Berkeley student  public, with the Cal sticker on it, and up
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
// sticker it puts on the letter. A letter to a NAME (anything that is not an
// @) is offered the wall, with a school to tag or none, and the private note,
// dimmed with the one line that fixes it: a ping needs an @.
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
// `Segmented`): "instagram", open when the composer opens, and "custom
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
// name note waiting on the desk and a note sent privately say so on the
// screen, once, and the sheet goes back to the wall on the next press.

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
  newNonce, postDraft, openCampuses, loadCampuses,
} from '../data.js'
import { normaliseLook, freshLook, colourOf, stampOf } from '../looks.js'
import { fault } from '../moderate.js'
import { campus } from '../campus.js'
import { getState, patch, setAfterGate } from '../store.js'
import { DOMAIN, eduBerkeley, eduDomain, refresh, validEmail, normEmail, heldProof } from '../auth.js'
import { sendCampusCode, checkCampusCode, loadPending } from '../handoff.js'
import { sendLink, linkStatus } from '../../api/eduverify.js'
import { sessionToken } from '../../api/identity.js'
import { signOut as dropProof } from '../../api/auth.js'
import { myHandle, canPlace, place, forgetPings } from '../pings.js'
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

// What the card says when the server's copy of the list caught what this
// browser's did not, and what this browser's own catch of a slur says
// (moderate.js `fault`): the same sentence, since to the writer it is the
// same fact.
const INAPPROPRIATE = 'that’s inappropriate for the wall.'

const KINDS = [
  { value: 'handle', label: 'instagram' },
  { value: 'name', label: 'custom name' },
]

// Berkeley, the one school posting to an @ (docs/ONE-WALL.md), for its
// sticker on the option that posts there
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

// The Instagram proof's pending record, when it was minted here: a reload on
// the way back from the DM resumes the door (screens/Ping.jsx `useProve`).
function resumeIg() {
  const p = loadPending()
  return p && p.use === 'write' ? p : null
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

export default function Write({ to: prefill, go, back, up = back, upLabel = 'back to the wall', reduce = false }) {
  const d0 = getState().draft || {}
  // A prefill that is a name key (`~sofia`, from "write to Sofia" on a
  // letter) opens the composer on the name, in name mode.
  const named = !!prefill && isNameKey(prefill)
  const [kind, setKind] = useState(() => (named ? 'name' : prefill ? 'handle' : (d0.kind === 'name' ? 'name' : 'handle')))
  const [to, setTo] = useState(() => (named ? '' : prefill || d0.to || ''))
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
  const [igHeld] = useState(() => resumeIg())
  // who · 1 (the letter) · how · edu · ig · done
  const [step, setStep] = useState(() => (live(d0.held) ? 'edu' : resumeIg() ? 'ig' : prefill ? 1 : 0))
  const [done, setDone] = useState('')
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

  const h = normHandle(to)
  const nm = cleanName(name)
  const nudge = normHandle(at)
  // whether this letter goes to an @: the instagram kind, or a name with its @
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
  const words = useRef(`${body}\u0000${greet}`)
  useEffect(() => {
    patch({ draft: { to: h, body, kind, name, at, look, greet, school, proof: postAs, nonce, held } })
    const now = `${body}\u0000${greet}`
    if (now !== words.current) { words.current = now; setSaid('') }
  }, [h, body, kind, name, at, look, greet, school, postAs, nonce, held])

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
    if (out.ok && out.status === 'live') {
      if (sheet.current) sheet.current.dismiss('sent')
      else back()
      return
    }
    if (out.ok && out.status === 'pending') { setDone('pending'); setStep('done'); return }
    if (out.ok && out.status === 'rejected') {
      if (out.id) patch({ noticed: { ...(getState().noticed || {}), [out.id]: true } })
      renonce()
      setStep(1)
      setSaid(INAPPROPRIATE)
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

  const sendIt = async () => {
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
    setHeld({ email: address, request: out.request, match: out.match, at: Date.now() })
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

  // ── waiting on the link ──
  // Asked every two and a half seconds, and at once when the tab comes back
  // to the screen, which is when somebody who tapped the link in their mail
  // app has come back to it.
  const request = step === 'edu' && held && held.request ? held.request : ''
  useEffect(() => {
    if (!request) return undefined
    let stop = false
    let polling = false
    let timer = 0
    const tick = async () => {
      if (stop || polling) return
      polling = true
      const out = await linkStatus({ request, session: sessionToken() })
      polling = false
      if (stop || !alive.current) return
      if (out.ok && out.verified) { stop = true; clearTimeout(timer); confirmed(); return }
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
  }, [request, confirmed])

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
  // without the sticker.
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

  const home = () => { if (sheet.current) sheet.current.dismiss('sent'); else back() }

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
            label="who the letter is for, by their instagram or by anything else"
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
                <Label as="span" tone="dim" className="wl-nudge-lab">their instagram @ (optional)</Label>
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
                inputRef={atRef} placeholder="theirhandle" label="their instagram handle, optional"
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
            : done === 'private' ? <>sent.</>
            : <>it&rsquo;s being<br />checked.</>}
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
              {fin ? (
                done === 'private' ? (
                  <ScreenNote glyph="check" title="sent">they&rsquo;re never told unless they send you one too.</ScreenNote>
                ) : (
                  <ScreenNote glyph="wait" title="checking">it goes up once it&rsquo;s reviewed.</ScreenNote>
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
      <Pill tone="light" onClick={home}>back to the wall</Pill>
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
      : canPlace() && mine ? { tone: 'is-done', glyph: 'check', text: `sent as ${atHandle(mine)}` }
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
                    <span className="wl-how-why">public, with the Cal sticker on it. it goes up at once.</span>
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
    // The address, then the wait for the link, with the two digits the mail
    // prints so a person can tell their own mail from anybody else's. The way
    // out of it is said plainly: not at Berkeley, the same letter goes to
    // their name instead.
    const waiting = !!held
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
              {wrongSchool ? 'only a Berkeley address posts with the Cal sticker. it can still go up on the wall, read first.'
                : waiting ? (held.legacy
                  ? <>we mailed a code to <span className="wl-h">{held.email}</span>. type it here and your letter goes up.</>
                  : <>at <span className="wl-h">{held.email}</span>. tap the link and your letter goes up.</>)
                : 'the Cal sticker is for Berkeley students. we email you one link, and your address never goes on the letter.'}
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
                  <div className="wl-edu-match" role="group" aria-label={`your email says ${held.match}`}>
                    <span className="wl-edu-match-lab" aria-hidden="true">your email says</span>
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
                <Pill tone="light" wide disabled={!emailOk || busy} onClick={sendIt} aria-busy={busy || undefined}>
                  {busy ? 'sending' : 'send me the link'}
                </Pill>
              </>
            )}
          </div>
          <div className="wl-gate-fault" aria-live="polite">{said}</div>
          {wrongSchool || waiting ? null : (
            <button type="button" className="wl-quiet wl-edu-out" onClick={toOpen}>
              not at Berkeley? post it on the wall without the sticker.
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
      ref={sheet} onClose={leave} onClosing={(b) => { by.current = b }} onEscape={onEscape}
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
