// ── /berkeley/you, and /you: THE PERSON ─────────────────────────────────────
//
// What this person has out, what they have not finished, and what they have
// written, raised over the wall from the person in its bar. It is the account
// the gate used to draw once somebody was through it, grown by the one thing
// an account on this product is for: the pings. They used to live on Main at
// /sky, a page in another design reached by leaving the wall, and a person
// who wanted to know whether a ping of theirs was still standing had to walk
// out of the phone to ask.
//
// ── three places, not one card ──────────────────────────────────────────────
// It was one card that stacked everything: the person, their @ and its two
// switches and its address and the way off the wall, the private notes, the
// drafts, the letters, the week, and a foot with two keys. The owner called
// it messy, with a lot crammed in, and asked for the sections to be distinct,
// the private notes set apart in a frame of their own, and the pings and the
// public letters subdivided. So the sheet is three places now:
//
//   the person   who is signed in, their face and their name, and one quiet
//                key to the settings. Always at the top.
//   two tabs     `private notes` and `letters`, a two way switch in the
//                phone's keys under the person, remembered for the tab
//                (sessionStorage). Each carries its own draft: the ping one
//                DM from out stands with the notes, the letter the composer
//                is holding stands with the letters. And each has its own key
//                at the foot: send a private note, or write a letter.
//   settings     the @ and what owning it is for (the two email switches, the
//                address, taking the name off the wall) and the way out of
//                this device, on a page of their own behind the person's key.
//                They are asked about once, and were in the way every time.
//
// Tabs rather than two stacked sections, because the two lists are two
// different kinds of thing (one sealed and only ever this person's, one up on
// the wall for anybody), a person comes to the sheet for one of them, and on
// a phone a stack put the second a scroll under the first every time.
//
// ── the notes are sealed, and look it ───────────────────────────────────────
// The private notes stand in a frame nothing else on the wall wears: a panel
// with the phone's double rule round it, a title strip with the sealed
// envelope and the slots as pixel cells, the way a phone's own inbox of
// messages you kept was a box inside the box. The mutuals first, set apart
// under their own seam because they are the only news on the sheet, with the
// signal full. A standing note is live and waiting, so its signal is
// searching: the bars climb one, two, three and fall back, and never reach
// four, since four is what a mutual has. It is opacity on four small spans,
// the compositor's cheapest thing, and under reduced motion two bars stand
// still. A mutual opens the reveal. A standing one opens its own screen, with
// the two things that can be done to it on the screen's own menu.
//
// ── and only ever their own ─────────────────────────────────────────────────
// Nothing here is about anybody else. A standing ping says who and how long
// it has left, and nothing about whether they have seen it, whether they are
// on celestual, or whether anybody else has placed one on them, because none
// of that is knowable without telling somebody something they did not agree
// to being told. And nothing here is ever on the wall: a ping is sealed until
// both sides exist, and showing one anywhere a second person can look would
// be the double blind broken by the product itself.
//
// ── the three ways the list can not be there ────────────────────────────────
// "nothing out yet." used to be drawn for three different facts: no @ proved
// on this device, a proof the server no longer honours (thirty idle days, or
// a verification made on another phone), and a read that failed. The second
// is the expensive one: a person with a mutual on their row was told they had
// nothing out, and had no control on the screen to prove the handle again.
// So each has its own words and its own way on, inside the frame.
//
// And the second is nearly gone (migration 0065). A person who claimed their
// @ once, on any device, and is signed in here by any proof (the DM, google,
// a mailed link, a campus address) gets the @'s proof back from the server
// as the list is read (pings.js `myPings`, auth.js `restoreProof`), so their
// private notes are simply there. It was the owner's own complaint: signed in
// by email, and asked to confirm their Instagram every single time. What is
// left of 'unverified' is a device that holds a DM proof its person's row
// does not: the DM is the one way to claim an @, and that is when it is owed.
//
// ── nobody known here ───────────────────────────────────────────────────────
// Signed out, this sheet is the gate's door, all three ways in with Instagram
// first (screens/Gate.jsx, landing back here). It was the Instagram DM alone,
// with "or send a private note first", and it is reached from the places a
// returning person comes back by: a mail's link to /sky, the stop page's
// "turn them back on", the reveal's "your private notes". Somebody who
// signed in by email or Google before, whose account holds their @ and their
// notes, was sent into a second DM for what one mailed link would have
// brought back.
//
// One arrival is the DM on purpose: the nudge under a letter
// (`openForAlerts`), which promises an email when a letter is written to
// you. Only the @ can be written to, and only the DM proves the @, so that
// door is the DM, and once it lands the person is asked the one question the
// nudge was about (screens/Claim.jsx, "want an email when someone writes to
// you?").
import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Label, Pill, Face, Icon, Allowance, Heart, DoorFoot, Switch, useProfile,
} from '../parts.jsx'
import { Screen, ScreenText, ScreenMenu, ScreenNote, Wait, PixIcon } from '../screen.jsx'
import { Provider } from '../art.jsx'
import {
  labelFor, allowance, loadQuota, mine, loadMine, sinceline, atHandle, normHandle, nameKey, cleanName, DAY,
} from '../data.js'
import { stampOf } from '../looks.js'
import { getState, patch } from '../store.js'
import { member, memberLabel, isReader, signOut, refresh, toWrite, heldProof } from '../auth.js'
import { loadPending } from '../handoff.js'
import {
  myHandle, myPings, heldPings, forgetPings, renew, release, daysLeft, daysLeftWords, stateWords, slotCap, PING_DAYS,
} from '../pings.js'
import { useProve, ProveDoor } from './Ping.jsx'
import { useAlertLink, AlertEmail } from './Alerts.jsx'
import Gate from './Gate.jsx'
import { alertsGet, alertsSet } from '../../api/alerts.js'
import '../profile.css'

// ── the nudge's way in ──────────────────────────────────────────────────────
// The account, opened on the Instagram DM rather than on the three ways in,
// and handed on to the question about the email once the DM lands (the head
// of this file says why). Held here for the one mount it is for, and carried
// in the DM's pending record across the walk to Instagram and back.
let FOR_ALERTS = false
export function openForAlerts(go) {
  FOR_ALERTS = true
  go('you')
}

// ── which tab was open ──────────────────────────────────────────────────────
// Remembered for as long as the browser's tab is, so a person who went to
// the letters, opened one and came back finds the letters again. Storage can
// be switched off or full, and then the notes open every time, which is the
// right first answer anyway.
const TAB_KEY = 'celestual.you.tab'
function readTab() {
  try { return window.sessionStorage.getItem(TAB_KEY) === 'letters' ? 'letters' : 'notes' } catch { return 'notes' }
}
function keepTab(t) {
  try { window.sessionStorage.setItem(TAB_KEY, t) } catch { /* the notes open next time, as above */ }
}

// ── drawn here ──────────────────────────────────────────────────────────────
// The frame's own glyph, on the phone's grid like every glyph on the wall
// (looks.js `PIX`), and drawn only here: the envelope, its flap closing on a
// seal. One string per row, `X` lit.
const SEAL = [
  'XXXXXXXXXXXXXXX',
  'XX...........XX',
  'X.XX.......XX.X',
  'X...XX...XX...X',
  'X....XXXXX....X',
  'X....XXXXX....X',
  'X.....XXX.....X',
  'X.............X',
  'XXXXXXXXXXXXXXX',
]
const SEAL_D = SEAL.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${x} ${y}h1v1h-1z` : ''))).join('')
function Seal({ scale = 2 }) {
  return (
    <svg
      className="wl-pxi wl-vault-seal" viewBox={`0 0 ${SEAL[0].length} ${SEAL.length}`}
      width={SEAL[0].length * scale} height={SEAL.length * scale}
      shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false"
    >
      <path d={SEAL_D} />
    </svg>
  )
}

// The signal a note is standing on, as the phone drew its own in the status
// row: the aerial and four bars. `full` is a mutual, every bar lit and still.
// Otherwise it is searching, the bars climbing and falling back (the head of
// this file says why they never reach four), all of it in profile.css.
function Signal({ full = false }) {
  return (
    <span className={`wl-signal${full ? ' is-full' : ' is-seeking'}`} aria-hidden="true">
      <PixIcon name="ant" scale={2} className="wl-signal-ant" />
      <span className="wl-signal-bars"><i /><i /><i /><i /></span>
    </span>
  )
}

// What is left of the slots, as cells: one per slot, lit for each one a note
// is standing in. The words beside them say the same thing for a person who
// does not read cells, and are what a screen reader is given.
function Slots({ used, cap }) {
  const room = cap - used
  const words = room <= 0 ? 'no slot left' : room === 1 ? 'one slot left' : `${room} slots left`
  return (
    <span className="wl-slots">
      <span className="wl-slots-cells" aria-hidden="true">
        {Array.from({ length: Math.max(cap, used) }, (_, i) => <i key={i} className={i < used ? 'is-used' : ''} />)}
      </span>
      <span className="wl-slots-say">{words}</span>
    </span>
  )
}

// ── the letters this person put up ──────────────────────────────────────────
// A list, one row per letter: the face and the name it was written to, how
// long ago, and how many hearted it, and the row opens the letter. It used
// to be a row of chips, one per name, which was a record that opened
// nothing and said nothing about how any of it was received. Four rows,
// and past four the list fades under a line that opens the rest.
//
// The rows are the server's (wall_mine): this identity's letters of the last
// thirty days, with the heart count on each (0056). When the server has not
// answered, or answers nothing, the names this browser remembers writing to
// stand in, without counts, since those are the only fact left. The tab's
// count reads the same rows as the list, so the two never disagree.
const SHOWN = 4

// A letter that came down is listed until it has been seen once, here or
// in the notice at the foot of the wall, and then it is gone from both
// (store.js `noticed`): the owner asked for it, and a list that carries a
// takedown for thirty days is a list that keeps saying so.
const isDown = (l) => !!l.downBy && l.downBy !== 'held'
function wroteRows() {
  const own = mine()
  const read = getState().noticed || {}
  return own && own.length
    ? own.filter((l) => !(isDown(l) && read[l.id])).map((l) => ({
      id: l.id, to: l.to, at: l.at, hearts: l.hearts || 0,
      held: l.downBy === 'held', down: !!l.downBy && l.downBy !== 'held', live: !l.downBy,
    }))
    : (getState().wroteTo || []).map((h) => ({ id: '', to: h, at: 0, hearts: null, held: false, down: false, live: true }))
}

// A letter held to be read before it goes up (wall_mine's `down_by: 'held'`,
// a pending row) is not down, and was drawn greyed as "taken down" while it
// was still being read. It is "being read" now, in the wall's own words for
// it, and not opened, since it is not on the wall yet to open.
function Wrote({ go, rows }) {
  const [more, setMore] = useState(false)
  // the ones that came down and were on the list while it was open are
  // read once it is left: the tab changed, or the sheet shut
  const shownDown = useRef([])
  useEffect(() => { shownDown.current = rows.filter((r) => r.down && r.id).map((r) => r.id) }, [rows])
  useEffect(() => () => {
    if (!shownDown.current.length) return
    patch({ noticed: { ...(getState().noticed || {}), ...Object.fromEntries(shownDown.current.map((id) => [id, true])) } })
  }, [])
  if (!rows.length) return <p className="wl-profile-none">no letters yet</p>
  const cut = !more && rows.length > SHOWN
  const shown = cut ? rows.slice(0, SHOWN) : rows
  const open = (r) => {
    if (!r.live) return
    go('letter', r.id || r.to)
  }
  return (
    <>
      <div className={`wl-wrote${cut ? ' is-cut' : ''}`}>
        {shown.map((r, i) => (
          <button
            type="button" key={r.id || `${r.to}-${i}`}
            className={`wl-wrote-row${r.down ? ' is-down' : ''}`}
            onClick={() => open(r)} disabled={!r.live}
            aria-label={`your letter to ${labelFor(r.to)}${r.hearts ? `, ${r.hearts === 1 ? 'one heart' : `${r.hearts} hearts`}` : ''}${r.held ? ', being read' : r.down ? ', taken down' : ''}`}
          >
            <Face handle={r.to} size={30} />
            <span className="wl-wrote-who">
              <span className="wl-wrote-name">{labelFor(r.to)}</span>
              <span className="wl-wrote-meta">{r.held ? 'being read' : r.down ? 'taken down' : r.at ? sinceline(r.at).lead : 'on the wall'}</span>
            </span>
            {r.hearts !== null && r.live ? (
              <span className="wl-wrote-n" aria-hidden="true">
                <Heart size={13} on={r.hearts > 0} />
                <span>{r.hearts || ''}</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {cut ? (
        <button type="button" className="wl-quiet wl-wrote-more" onClick={() => setMore(true)}>
          see more
        </button>
      ) : null}
    </>
  )
}

// ── a ping's own screen ─────────────────────────────────────────────────────
// A standing ping, opened: the screen it was placed on, lit in the colour its
// name picks, with the line on it and the day it was placed by the battery,
// as a letter that is up carries its day (screen.jsx `stamp`), and the
// battery running down with the sixty days, the way the phone's did. Its left key is the phone's own options, and the two things that can
// be done to a ping are the menu's two rows: sixty more days, which is free
// and undoes nothing, and letting it go, which frees the slot and asks once,
// on the screen, in the words the product always asks it in.
function batOf(expires) {
  return Math.max(0, Math.min(4, Math.ceil(daysLeft(expires) / (PING_DAYS / 4))))
}

function PingScreen({ p, me, onBack, onChange }) {
  // line · menu · ask · kept
  const [mode, setMode] = useState('line')
  const [at, setAt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const [expires, setExpires] = useState(p.expires)
  const prof = useProfile(p.to)
  const first = prof && prof.name ? String(prof.name).trim().split(/\s+/)[0] : ''

  const keep = async () => {
    setBusy(true)
    const ok = await renew({ me, them: p.to })
    setBusy(false)
    if (!ok) { setSaid('it did not go through. try again.'); setMode('line'); return }
    setExpires(Date.now() + PING_DAYS * DAY)
    setMode('kept')
    onChange()
  }
  const drop = async () => {
    setBusy(true)
    const ok = await release({ me, them: p.to })
    setBusy(false)
    if (!ok) { setSaid('it did not go through. try again.'); setMode('line'); return }
    onChange()
    onBack()
  }

  // A ping with all sixty of its days has nothing to renew.
  const items = [
    ...(daysLeft(expires) < PING_DAYS ? [{ t: 'sixty more days', run: keep }] : []),
    { t: 'let it go', run: () => setMode('ask') },
  ]
  const sel = Math.min(at, items.length - 1)
  const pick = (j) => { const it = items[j]; if (it) { setSaid(''); it.run() } }

  // the day it was placed by the battery, as a letter that is up carries
  // its own, and the same row under the menu so nothing moves when it opens
  const dated = { stamp: stampOf(p.at), bat: batOf(expires) }
  let top = { ...dated, name: first || atHandle(p.to), handle: first ? atHandle(p.to) : '', dear: true, icon: 'pen' }
  let body
  let keys
  if (mode === 'menu') {
    top = { ...dated, name: 'options', pos: `${sel + 1}/${items.length}`, icon: '' }
    body = (
      <ScreenMenu
        items={items.map((x) => x.t)} at={sel} onAt={setAt} onPick={pick} label="options"
        onBack={() => setMode('line')}
      />
    )
    keys = {
      l: { label: 'select', onClick: () => pick(sel), aria: `select ${items[sel]?.t || ''}` },
      r: { label: 'back', onClick: () => setMode('line'), aria: 'back to the ping' },
    }
  } else if (mode === 'ask') {
    body = <ScreenNote title="let it go?">this frees the slot. they never find out you sent it.</ScreenNote>
    keys = {
      l: { label: 'let it go', onClick: drop, disabled: busy, aria: 'let it go' },
      r: { label: 'keep it', onClick: () => setMode('line'), aria: 'keep it standing' },
    }
  } else if (mode === 'kept') {
    body = <ScreenNote glyph="check" title="sixty more days" />
    keys = { l: { label: 'ok', onClick: () => setMode('line'), aria: 'back to the ping' } }
  } else {
    body = p.line
      ? <ScreenText text={p.line} />
      : <ScreenNote>sent without a note.</ScreenNote>
    keys = {
      l: { label: 'options', onClick: () => { setAt(0); setMode('menu') }, disabled: busy, aria: 'options: sixty more days, or let it go' },
      r: { label: 'back', onClick: onBack, aria: 'back to your private notes' },
    }
  }

  return (
    <div className="wl-you-ping">
      <Screen look={null} seed={`ping:${p.to}`} top={top} keys={keys} live nameId="wl-you-h">
        {body}
      </Screen>
      <p className="wl-you-floor" aria-live="polite">
        {said || `standing · ${daysLeftWords(expires)}`}
      </p>
    </div>
  )
}

// ── your @ ───────────────────────────────────────────────────────────────────
// The @ this person has claimed (docs/ONE-WALL.md: Instagram verification is
// ownership), and what owning it is for: an email when somebody writes to
// them, an email when a private note turns out mutual, the address those go
// to, and the way to take the name off the wall for good. Or, with no @
// claimed, the one line on what claiming it gets them and the key to it.
//
// Drawn on the settings page, not the card, as two groups: the @ itself, and
// the email alerts on it, each a panel under its own label, with the way off
// the wall under both as a quiet line, since it is the one act here that
// cannot be taken back and should never be the nearest thing to a thumb.
//
// The switches are the server's (`celestual_alerts_get` / `_set`). A database
// that does not have them yet answers `missing`, and the page then shows the
// @ alone, with nothing to switch: no control on this sheet may promise an
// email that nothing will send.
function YourAt({ handle, rev, go, onProve }) {
  // null while it is asked · the answer · { ok: false, error }
  const [alerts, setAlerts] = useState(null)
  const [saving, setSaving] = useState('')
  const [said, setSaid] = useState('')
  const [mail, setMail] = useState(false)
  const [ask, setAsk] = useState(0)
  // a switch turned on before there was an address to send to, kept until
  // the address is confirmed and then turned on for real
  const waiting = useRef(null)

  useEffect(() => {
    let on = true
    alertsGet().then((a) => { if (on) setAlerts(a || { ok: false, error: 'network' }) })
    return () => { on = false }
  }, [rev, ask])

  const link = useAlertLink({
    onConfirmed: async () => {
      const want = waiting.current
      waiting.current = null
      if (want) await alertsSet(want.wrote, want.mutual)
      const a = await alertsGet()
      setAlerts(a || { ok: false, error: 'network' })
      setMail(false)
      setSaid('')
      link.reset()
    },
  })

  const ok = !!alerts?.ok
  const claimed = ok ? (alerts.claimed ? normHandle(alerts.handle || handle) : '') : handle
  const hasMail = ok && !!alerts.email_verified

  const flip = async (key, value) => {
    if (!ok || saving) return
    const next = { wrote: !!alerts.wrote, mutual: !!alerts.mutual, [key]: value }
    setSaid('')
    if (value && !hasMail) {
      waiting.current = next
      setMail(true)
      setSaid('add an email first. it turns on once the address is confirmed.')
      return
    }
    const was = alerts
    setAlerts({ ...alerts, [key]: value })
    setSaving(key)
    const out = await alertsSet(next.wrote, next.mutual)
    setSaving('')
    if (out?.ok) return
    setAlerts(was)
    if (out?.error === 'email') { waiting.current = next; setMail(true); setSaid('add an email first. it turns on once the address is confirmed.'); return }
    if (out?.error === 'claim') { setSaid('confirm your Instagram again to turn this on.'); return }
    setSaid('that did not save. try again.')
  }

  if (!claimed) {
    return (
      <section className="wl-set-group" aria-labelledby="wl-set-at">
        <Label tone="dim" className="wl-set-h"><span id="wl-set-at">your @</span></Label>
        <div className="wl-set-panel">
          <div className="wl-you-ask">
            <p className="wl-you-say">
              confirm your Instagram to get an email when someone writes to you, and to remove letters about you in one tap.
            </p>
            <Pill tone="ghost" icon={<Provider size={15} />} onClick={onProve}>confirm your Instagram</Pill>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="wl-set-group" aria-labelledby="wl-set-at">
        <Label tone="dim" className="wl-set-h"><span id="wl-set-at">your @</span></Label>
        <div className="wl-set-panel wl-owner-me">
          <Face handle={claimed} size={30} />
          <span className="wl-wrote-who">
            <span className="wl-wrote-name">{atHandle(claimed)}</span>
            <span className="wl-wrote-meta">confirmed with Instagram</span>
          </span>
        </div>
      </section>

      {alerts === null || ok || alerts.error !== 'missing' ? (
        <section className="wl-set-group" aria-labelledby="wl-set-mail">
          <Label tone="dim" className="wl-set-h"><span id="wl-set-mail">email alerts</span></Label>
          <div className="wl-set-panel">
            {alerts === null ? (
              <p className="wl-profile-none wl-you-wait" aria-label="reading your alerts"><Wait /></p>
            ) : ok ? (
              <div className="wl-owner-alerts">
                <Switch on={!!alerts.wrote} busy={saving === 'wrote'} onChange={(v) => flip('wrote', v)}>
                  email me when someone writes to me
                </Switch>
                <Switch on={!!alerts.mutual} busy={saving === 'mutual'} onChange={(v) => flip('mutual', v)}>
                  email me when it&rsquo;s mutual
                </Switch>
                <p className="wl-owner-to">
                  {hasMail
                    ? <>emails go to <span className="wl-h">{alerts.email}</span></>
                    : 'no email address yet'}
                  {!mail ? (
                    <button type="button" className="wl-quiet" onClick={() => { setMail(true); setSaid('') }}>
                      {hasMail ? 'change' : 'add one'}
                    </button>
                  ) : null}
                </p>
                {said ? <p className="wl-owner-said" aria-live="polite">{said}</p> : null}
                {mail ? (
                  <div className="wl-owner-change">
                    <AlertEmail link={link} compact autoFocus />
                    {!link.sent ? (
                      <button type="button" className="wl-quiet" onClick={() => { setMail(false); waiting.current = null; setSaid('') }}>cancel</button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="wl-you-ask">
                <p className="wl-you-say">your email alerts did not load.</p>
                <button type="button" className="wl-quiet" onClick={() => { setAlerts(null); setAsk((n) => n + 1) }}>try again</button>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <button type="button" className="wl-quiet wl-owner-off" onClick={() => go('remove', claimed)}>
        take my name off the wall for good
      </button>
    </>
  )
}

// What a draft of the composer's is addressed to, as a key: the handle, or
// the tilde key of the name as written, or nothing yet.
function draftKey(d) {
  if (d.kind === 'name') { const n = cleanName(d.name); return n ? nameKey(n) : '' }
  return normHandle(d.to)
}

export default function You({ go, up, upLabel = 'back to the wall', onOut = null }) {
  const who = member()
  const reads = isReader()
  const handle = myHandle()
  const known = !!(who || reads || handle)
  const [held] = useState(() => { const r = loadPending(); return r && r.use === 'you' ? r : null })
  // come from the nudge: the DM first, and the email asked about after it
  // (`openForAlerts`). Read without spending it, since a development mount
  // runs this twice, and spent once the sheet is up.
  const [want] = useState(() => !!(held && held.alerts) || FOR_ALERTS)
  useEffect(() => { FOR_ALERTS = false }, [])
  // null · 'prove' · 'settings' · the handle of the ping whose screen is up
  const [view, setView] = useState(() => (held || want ? 'prove' : null))
  // 'notes' · 'letters', the two tabs under the person
  const [tab, setTab] = useState(readTab)
  const tabs = useRef(null)
  const [rev, setRev] = useState(0)
  // loading · pings · error, where error is 'none' (no @ proved here),
  // 'unverified' (one is, and the proof that spends it is not on this
  // device, or the server no longer takes it), 'network', or null
  const [list, setList] = useState(() => {
    const got = handle ? heldPings(handle) : null
    return got ? { loading: false, pings: got.pings, error: null } : { loading: !!handle, pings: [], error: null }
  })

  // The letters, and the week's allowance, which is a question about the
  // account and this is the account.
  useEffect(() => { loadMine(); if (member()) loadQuota() }, [])

  // Read with the proof held here, or, with none, with the one the server
  // gives back to the person this device is signed in as (pings.js `myPings`).
  // Read again when the @ changes under the card: the shell asks the server
  // who this is as it mounts (auth.js `refresh`), and a card opened cold is
  // drawn before the answer is in.
  useEffect(() => {
    const me = myHandle()
    if (!me) { setList({ loading: false, pings: [], error: 'none' }); return undefined }
    let on = true
    setList((s) => ({ ...s, loading: true }))
    myPings({ handle: me, proof: heldProof(me) }).then((out) => {
      if (on) setList({ loading: false, pings: out.pings, error: out.ok ? null : out.error })
    })
    return () => { on = false }
  }, [rev, handle])

  // ── proving the @ ──
  // The same door the ping asks at, filed under its own use. Whoever DMs is
  // the identity (0012), so there is nothing to ask afterwards: the card
  // comes back, and reads the list with the proof it now holds. From the
  // nudge, the one thing asked afterwards is the email, on the claim's own
  // sheet for the @ just proved ("it's yours. want an email when someone
  // writes to you?"), which closes back onto this card.
  const proof = useProve({
    use: 'you', held, stash: want ? { alerts: true } : null,
    onLanded: async (got) => {
      await refresh()
      forgetPings()
      setView(null)
      setRev((n) => n + 1)
      if (want && got) go('claim', got)
    },
  })

  // The way out of this device. Both halves of the one session (auth.js
  // `signOut`) and the list held for the reveal, which is this person's and
  // should not outlive them on a shared laptop.
  const out = () => {
    signOut()
    forgetPings()
    if (onOut) onOut()
    else up()
  }

  // ── the door ──
  // The Instagram DM, asked for: from the notes' "confirm your Instagram"
  // (somebody known by an address and not by an @, whose pings are behind
  // the @), from the settings' own, from a DM this sheet was waiting on, and
  // from the nudge.
  if (view === 'prove') {
    const lapsed = !!handle
    return (
      <Sheet onClose={up} tall labelledBy="wl-you-h">
        <div className="wl-sheet-in wl-gate is-door wl-you">
          <SheetHead onClose={up} label={upLabel} />
          <div className="wl-push" />
          <ProveDoor
            p={proof} headId="wl-you-h" onAsk={() => proof.ask()}
            title={lapsed ? <>confirm your<br />Instagram again.</> : <>confirm this is<br />your Instagram.</>}
            say={want
              ? 'then we can email you if a letter is ever written to you, and only you.'
              : 'to see the notes you sent privately, get email alerts, and remove letters about you.'}
          />
          <div className="wl-push" />
          <SheetFoot>
            {proof.dm ? (
              <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
            ) : known ? (
              <button type="button" className="wl-quiet" onClick={() => { proof.setSaid(''); setView(null) }}>not now</button>
            ) : (
              <button type="button" className="wl-quiet" onClick={up}>not now</button>
            )}
          </SheetFoot>
          <DoorFoot />
        </div>
      </Sheet>
    )
  }

  // Nobody known here: the gate's three ways in, Instagram first, and this
  // card once one of them lands (the head of this file says why).
  if (!known) return <Gate go={go} up={up} upLabel={upLabel} after={{ name: 'you' }} />

  // ── settings ──
  // The @, its alerts, the way off the wall, and the way out of this device,
  // on a page of their own. The sheet's head carries the one way back to the
  // card, in the phone's back key, and the foot carries the way out.
  if (view === 'settings') {
    return (
      <Sheet onClose={up} labelledBy="wl-you-h" className="is-you">
        <div className="wl-sheet-in wl-you is-card is-settings">
          <SheetHead
            onClose={up} label={upLabel}
            lead={(
              <button type="button" className="wl-you-back" onClick={() => setView(null)} aria-label="back to your notes and letters">
                <PixIcon name="back" scale={2} />
                <span>back</span>
              </button>
            )}
          />
          <h2 className="wl-you-title" id="wl-you-h">settings</h2>
          <YourAt handle={handle} rev={rev} go={go} onProve={() => setView('prove')} />
          <div className="wl-push" />
          <SheetFoot>
            <Pill tone="ghost" className="wl-profile-out" icon={<Icon name="signout" size={15} />} onClick={out}>
              sign out
            </Pill>
          </SheetFoot>
        </div>
      </Sheet>
    )
  }

  const opened = view ? list.pings.find((p) => p.to === view && p.state !== 'mutual') : null
  if (opened) {
    return (
      <Sheet onClose={up} labelledBy="wl-you-h" className="is-you">
        <div className="wl-sheet-in wl-you is-screen">
          <SheetHead onClose={up} label={upLabel} />
          <PingScreen
            key={opened.to} p={opened} me={handle}
            onBack={() => setView(null)}
            onChange={() => { forgetPings(); setRev((n) => n + 1) }}
          />
        </div>
      </Sheet>
    )
  }

  // ── the card ──
  const mutuals = list.pings.filter((p) => p.state === 'mutual')
  const standing = list.pings.filter((p) => p.state !== 'mutual')
  const settled = !list.loading && !list.error

  const d = getState().draft
  const letter = d && String(d.body || '').trim() ? { key: draftKey(d), name: d.kind === 'name' ? cleanName(d.name) : '' } : null
  const waiting = (() => { const r = loadPending(); return r && r.use === 'ping' && r.to ? normHandle(r.to) : '' })()
  const rows = wroteRows()

  const left = allowance()
  const spent = !!who && !!left && left.left <= 0
  // The @ is the name on the wall, so it is the heading when there is one,
  // and the address this device signed in by stands under it.
  const title = handle ? atHandle(handle) : who ? memberLabel(who) : 'signed in'
  const also = handle && who ? memberLabel(who) : ''

  const pick = (t) => { setTab(t); keepTab(t) }
  // the arrow keys move between the two tabs, as a tab list's do
  const keys = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = tab === 'notes' ? 'letters' : 'notes'
    pick(next)
    tabs.current?.querySelector(`[data-tab="${next}"]`)?.focus()
  }
  const count = (n) => (n > 0 ? <span className="wl-you-tab-n">{n}</span> : null)

  const ask = (words) => (
    <div className="wl-you-ask">
      <p className="wl-you-say">{words}</p>
      <Pill tone="ghost" icon={<Provider size={15} />} onClick={() => setView('prove')}>confirm your Instagram</Pill>
    </div>
  )

  // ── the notes' frame ──
  // The title strip, then whatever is true: the reason there is no list and
  // the one thing to do about it, the wait, nothing yet, or the list, the
  // mutuals first under their own seam. The ping still one DM from out stands
  // at the end, drawn as not sent.
  const notes = (
    <div className="wl-vault" aria-labelledby="wl-vault-h">
      <div className="wl-vault-bar">
        <span className="wl-vault-title" id="wl-vault-h">
          <Seal />
          <span>sealed until it&rsquo;s mutual</span>
        </span>
        {settled ? <Slots used={standing.length} cap={slotCap()} /> : null}
      </div>
      <div className="wl-vault-body">
        {list.error === 'none' ? ask('confirm your Instagram to see the notes you sent privately.')
          : list.error === 'unverified' ? ask('confirm your Instagram again to see them.')
            : list.error ? (
              <div className="wl-you-ask">
                <p className="wl-you-say">your private notes did not load. nothing about them changed.</p>
                <button type="button" className="wl-quiet" onClick={() => setRev((n) => n + 1)}>try again</button>
              </div>
            ) : list.loading && !list.pings.length ? (
              <p className="wl-profile-none wl-you-wait" aria-label="reading your private notes"><Wait /></p>
            ) : !list.pings.length && !waiting ? (
              <p className="wl-profile-none wl-vault-none">none sent yet</p>
            ) : null}
        {mutuals.length ? (
          <div className="wl-vault-news">
            {mutuals.map((p) => (
              <button
                type="button" key={p.to} className="wl-vault-row is-mutual"
                onClick={() => go('reveal', p.to)}
                aria-label={`${atHandle(p.to)}, it’s mutual. open it`}
              >
                <Face handle={p.to} size={30} />
                <span className="wl-wrote-who">
                  <span className="wl-wrote-name">{atHandle(p.to)}</span>
                  <span className="wl-wrote-meta">{stateWords(p)}</span>
                </span>
                <Signal full />
              </button>
            ))}
          </div>
        ) : null}
        {standing.length || waiting ? (
          <div className="wl-vault-list">
            {standing.map((p) => (
              <button
                type="button" key={p.to} className="wl-vault-row is-standing"
                onClick={() => setView(p.to)}
                aria-label={`your private note to ${atHandle(p.to)}, waiting, ${stateWords(p)}`}
              >
                <Face handle={p.to} size={30} />
                <span className="wl-wrote-who">
                  <span className="wl-wrote-name">{atHandle(p.to)}</span>
                  <span className="wl-wrote-meta">waiting · {stateWords(p)}</span>
                </span>
                <Signal />
              </button>
            ))}
            {waiting ? (
              <button type="button" className="wl-vault-row is-draft" onClick={() => go('ping', waiting)}>
                <Face handle={waiting} size={30} />
                <span className="wl-wrote-who">
                  <span className="wl-wrote-name">{atHandle(waiting)}</span>
                  <span className="wl-wrote-meta">not sent · waiting on one DM</span>
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )

  // ── the letters ──
  // Unlit rows, as the wall's own are: the letter the composer is holding
  // first, then what is up, then the week when it is spent. The letters are
  // anonymous and stay anonymous: nothing on a letter points back here. The
  // server answers a writer about their OWN letters and nobody else's
  // (wall_mine, 0050).
  const letters = (
    <div className="wl-you-letters">
      {letter ? (
        <button type="button" className="wl-wrote-row is-draft" onClick={() => toWrite(go, letter.key)}>
          <Face handle={letter.key} name={letter.name} size={30} resolve={!!letter.key} />
          <span className="wl-wrote-who">
            <span className="wl-wrote-name">{letter.name || (letter.key ? labelFor(letter.key) : 'no name yet')}</span>
            <span className="wl-wrote-meta">a letter, not sent</span>
          </span>
        </button>
      ) : null}
      <Wrote go={go} rows={rows} />
      {spent ? (
        <Allowance left={left.left} limit={left.limit} resets={left.resets} className="wl-profile-cap" />
      ) : null}
    </div>
  )

  return (
    <Sheet onClose={up} labelledBy="wl-you-h" className="is-you">
      <div className="wl-sheet-in wl-you is-card">
        <SheetHead onClose={up} label={upLabel} />

        {/* ── the person ── */}
        <header className="wl-you-id">
          <Face handle={handle || who} size={52} resolve={!!handle || String(who).startsWith('@')} className="wl-profile-face" />
          <div className="wl-you-who">
            <p className="wl-profile-addr" id="wl-you-h">{title}</p>
            {also ? <p className="wl-you-also">{also}</p> : null}
          </div>
          <button type="button" className="wl-you-set" onClick={() => setView('settings')} aria-label="settings: your @, email alerts and sign out">
            settings
          </button>
        </header>

        {/* ── the two tabs ── */}
        <div className="wl-you-tabs" role="tablist" aria-label="what you sent" ref={tabs} onKeyDown={keys}>
          <button
            type="button" role="tab" id="wl-you-tab-notes" data-tab="notes"
            aria-selected={tab === 'notes'} aria-controls="wl-you-panel" tabIndex={tab === 'notes' ? 0 : -1}
            className="wl-you-tab" onClick={() => pick('notes')}
          >
            <span>private notes</span>
            {settled ? count(list.pings.length + (waiting ? 1 : 0)) : null}
            {tab !== 'notes' && mutuals.length ? (
              <><i className="wl-you-tab-pip" aria-hidden="true" /><span className="wl-sr">, it&rsquo;s mutual</span></>
            ) : null}
          </button>
          <button
            type="button" role="tab" id="wl-you-tab-letters" data-tab="letters"
            aria-selected={tab === 'letters'} aria-controls="wl-you-panel" tabIndex={tab === 'letters' ? 0 : -1}
            className="wl-you-tab" onClick={() => pick('letters')}
          >
            <span>letters</span>
            {count(rows.length)}
          </button>
        </div>

        <div className="wl-you-panel" role="tabpanel" id="wl-you-panel" aria-labelledby={`wl-you-tab-${tab}`} key={tab}>
          {tab === 'notes' ? notes : letters}
        </div>

        <div className="wl-push" />

        <SheetFoot>
          {tab === 'notes'
            ? <Pill tone="light" wide onClick={() => go('ping')}>send a private note</Pill>
            : <Pill tone="light" wide onClick={() => toWrite(go)}>write a letter</Pill>}
        </SheetFoot>
      </div>
    </Sheet>
  )
}
