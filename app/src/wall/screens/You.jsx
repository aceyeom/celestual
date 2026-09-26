// ── /berkeley/you, and /you: THE PERSON ─────────────────────────────────────
//
// What this person has out, what they have not finished, and what they have
// written, on one card, raised over the wall from the person in its bar. It
// is the account the gate used to draw once somebody was through it, grown by
// the one thing an account on this product is for: the pings. They used to
// live on Main at /sky, a page in another design reached by leaving the wall,
// and a person who wanted to know whether a ping of theirs was still standing
// had to walk out of the phone to ask.
//
// Three sections under the person, in the order they are asked about:
//
//   your pings   the mutuals first, set apart because they are the only news
//                on the card, then the pings still standing with their days,
//                and what is left of the slots. A mutual opens the reveal. A
//                standing one opens its own screen, with the two things that
//                can be done to it on the screen's own menu.
//   drafts       a letter the composer is still holding, and a ping that is
//                one DM from out. Each opens where it was left.
//   written to   the letters this person put up, with the hearts on each.
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
// So each has its own words and its own way on.
//
// And the second is nearly gone (migration 0065). A person who claimed their
// @ once, on any device, and is signed in here by any proof (the DM, google,
// a mailed link, a campus address) gets the @'s proof back from the server
// as the list is read (pings.js `myPings`, auth.js `restoreProof`), so their
// private notes are simply there. It was the owner's own complaint: signed in
// by email, and asked to confirm their Instagram every single time. What is
// left of 'unverified' is a device that holds a DM proof its person's row
// does not: the DM is the one way to claim an @, and that is when it is owed.
import { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Label, Pill, Face, Icon, Allowance, Heart, DoorFoot, Switch, useProfile,
} from '../parts.jsx'
import { Screen, ScreenText, ScreenMenu, ScreenNote, Wait } from '../screen.jsx'
import { Provider } from '../art.jsx'
import {
  labelFor, allowance, loadQuota, mine, loadMine, sinceline, atHandle, normHandle, nameKey, cleanName, DAY,
} from '../data.js'
import { stampOf } from '../looks.js'
import { getState } from '../store.js'
import { member, memberLabel, isReader, signOut, refresh, toWrite, heldProof } from '../auth.js'
import { loadPending } from '../handoff.js'
import {
  myHandle, myPings, heldPings, forgetPings, renew, release, daysLeft, daysLeftWords, stateWords, slotCap, PING_DAYS,
} from '../pings.js'
import { useProve, ProveDoor } from './Ping.jsx'
import { useAlertLink, AlertEmail } from './Alerts.jsx'
import { alertsGet, alertsSet } from '../../api/alerts.js'

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
// stand in, without counts, since those are the only fact left.
const SHOWN = 4

function Wrote({ go }) {
  const [more, setMore] = useState(false)
  const own = mine()
  const rows = own && own.length
    ? own.map((l) => ({ id: l.id, to: l.to, at: l.at, hearts: l.hearts || 0, down: !!l.downBy, live: !l.downBy }))
    : (getState().wroteTo || []).map((h) => ({ id: '', to: h, at: 0, hearts: null, down: false, live: true }))
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
            className={`wl-wrote-row${r.live ? '' : ' is-down'}`}
            onClick={() => open(r)} disabled={!r.live}
            aria-label={`your letter to ${labelFor(r.to)}${r.hearts ? `, ${r.hearts === 1 ? 'one heart' : `${r.hearts} hearts`}` : ''}${r.down ? ', taken down' : ''}`}
          >
            <Face handle={r.to} size={30} />
            <span className="wl-wrote-who">
              <span className="wl-wrote-name">{labelFor(r.to)}</span>
              <span className="wl-wrote-meta">{r.down ? 'taken down' : r.at ? sinceline(r.at).lead : 'on the wall'}</span>
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
// The switches are the server's (`celestual_alerts_get` / `_set`). A database
// that does not have them yet answers `missing`, and the section then shows
// the @ alone, with nothing to switch: no control on this card may promise an
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
      <div className="wl-profile-sect wl-owner-at">
        <Label tone="dim">your @</Label>
        <div className="wl-you-ask">
          <p className="wl-you-say">
            claim your @ to get an email when someone writes to you, and to remove letters about you in one tap.
          </p>
          <Pill tone="ghost" icon={<Provider size={15} />} onClick={onProve}>confirm your Instagram</Pill>
        </div>
      </div>
    )
  }

  return (
    <div className="wl-profile-sect wl-owner-at">
      <Label tone="dim">your @</Label>
      <div className="wl-owner-me">
        <Face handle={claimed} size={30} />
        <span className="wl-wrote-who">
          <span className="wl-wrote-name">{atHandle(claimed)}</span>
          <span className="wl-wrote-meta">confirmed with Instagram</span>
        </span>
      </div>

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
      ) : alerts.error !== 'missing' ? (
        <div className="wl-you-ask">
          <p className="wl-you-say">your email alerts did not load.</p>
          <button type="button" className="wl-quiet" onClick={() => { setAlerts(null); setAsk((n) => n + 1) }}>try again</button>
        </div>
      ) : null}

      <button type="button" className="wl-quiet wl-owner-off" onClick={() => go('remove', claimed)}>
        take my name off the wall for good
      </button>
    </div>
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
  // null · 'prove' · the handle of the ping whose screen is up
  const [view, setView] = useState(() => (held ? 'prove' : null))
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
  // comes back, and reads the list with the proof it now holds.
  const proof = useProve({
    use: 'you', held,
    onLanded: async () => {
      await refresh()
      forgetPings()
      setView(null)
      setRev((n) => n + 1)
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
  // Nobody known here yet, or somebody known by an address and not by an @:
  // the pings are behind the @, so the card is the door until it is proved.
  if (view === 'prove' || !known) {
    const lapsed = !!handle
    return (
      <Sheet onClose={up} tall labelledBy="wl-you-h">
        <div className="wl-sheet-in wl-gate is-door wl-you">
          <SheetHead onClose={up} label={upLabel} />
          <div className="wl-push" />
          <ProveDoor
            p={proof} headId="wl-you-h" onAsk={() => proof.ask()}
            title={lapsed ? <>confirm your<br />Instagram again.</> : <>confirm this is<br />your Instagram.</>}
            say="to see the notes you sent privately, get email alerts, and remove letters about you."
          />
          <div className="wl-push" />
          <SheetFoot>
            {proof.dm ? (
              <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
            ) : known ? (
              <button type="button" className="wl-quiet" onClick={() => { proof.setSaid(''); setView(null) }}>not now</button>
            ) : (
              <button type="button" className="wl-quiet" onClick={() => go('ping')}>or send a private note first</button>
            )}
          </SheetFoot>
          <DoorFoot />
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
  const room = slotCap() - standing.length
  const slots = list.loading || list.error ? ''
    : room <= 0 ? 'no slot left' : room === 1 ? 'one slot left' : `${room} slots left`

  const d = getState().draft
  const letter = d && String(d.body || '').trim() ? { key: draftKey(d), name: d.kind === 'name' ? cleanName(d.name) : '' } : null
  const waiting = (() => { const r = loadPending(); return r && r.use === 'ping' && r.to ? normHandle(r.to) : '' })()

  const left = allowance()
  const spent = !!who && !!left && left.left <= 0
  const title = who ? memberLabel(who) : handle ? atHandle(handle) : 'signed in'

  const ask = (words) => (
    <div className="wl-you-ask">
      <p className="wl-you-say">{words}</p>
      <Pill tone="ghost" icon={<Provider size={15} />} onClick={() => setView('prove')}>confirm your Instagram</Pill>
    </div>
  )

  return (
    <Sheet onClose={up} labelledBy="wl-you-h" className="is-you">
      <div className="wl-sheet-in wl-you is-card">
        <SheetHead onClose={up} label={upLabel} />

        <section className="wl-profile" aria-labelledby="wl-you-h">
          <div className="wl-profile-id">
            <Face handle={handle || who} size={52} resolve={!!handle || String(who).startsWith('@')} className="wl-profile-face" />
            <div className="wl-profile-who">
              <p className="wl-profile-addr" id="wl-you-h">{title}</p>
            </div>
          </div>

          {/* ── your @ ── what claiming it is for, and the switches */}
          <YourAt handle={handle} rev={rev} go={go} onProve={() => setView('prove')} />

          {/* ── the pings ──
              The mutuals first and set apart, then the standing ones with
              their days, and what is left of the slots on the section's own
              line. Or, when there is no list to draw, which of the three
              reasons it is, and the one thing to do about it. */}
          <div className="wl-profile-sect">
            <div className="wl-you-head">
              <Label tone="dim">your private notes</Label>
              {slots ? <Label tone="dim" className="wl-you-slots">{slots}</Label> : null}
            </div>
            {list.error === 'none' ? (
              <p className="wl-profile-none">confirm your Instagram above to see them.</p>
            ) : list.error === 'unverified' ? ask('confirm your Instagram again to see them.')
              : list.error ? (
                <div className="wl-you-ask">
                  <p className="wl-you-say">your private notes did not load. nothing about them changed.</p>
                  <button type="button" className="wl-quiet" onClick={() => setRev((n) => n + 1)}>try again</button>
                </div>
              ) : list.loading && !list.pings.length ? (
                <p className="wl-profile-none wl-you-wait" aria-label="reading your private notes"><Wait /></p>
              ) : !list.pings.length ? (
                <p className="wl-profile-none">none sent yet</p>
              ) : (
                <div className="wl-wrote">
                  {mutuals.map((p) => (
                    <button
                      type="button" key={p.to} className="wl-wrote-row is-mutual"
                      onClick={() => go('reveal', p.to)}
                    >
                      <Face handle={p.to} size={30} />
                      <span className="wl-wrote-who">
                        <span className="wl-wrote-name">{atHandle(p.to)}</span>
                        <span className="wl-wrote-meta">{stateWords(p)}</span>
                      </span>
                    </button>
                  ))}
                  {standing.map((p) => (
                    <button
                      type="button" key={p.to} className="wl-wrote-row is-standing"
                      onClick={() => setView(p.to)}
                    >
                      <Face handle={p.to} size={30} />
                      <span className="wl-wrote-who">
                        <span className="wl-wrote-name">{atHandle(p.to)}</span>
                        <span className="wl-wrote-meta">{stateWords(p)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* ── what is not out yet ──
              The letter the composer is holding, and a ping that is one DM
              from out. Each opens where it was left. */}
          {letter || waiting ? (
            <div className="wl-profile-sect">
              <Label tone="dim">drafts</Label>
              <div className="wl-wrote">
                {letter ? (
                  <button type="button" className="wl-wrote-row" onClick={() => toWrite(go, letter.key)}>
                    <Face handle={letter.key} name={letter.name} size={30} resolve={!!letter.key} />
                    <span className="wl-wrote-who">
                      <span className="wl-wrote-name">{letter.name || (letter.key ? labelFor(letter.key) : 'no name yet')}</span>
                      <span className="wl-wrote-meta">a letter, not sent</span>
                    </span>
                  </button>
                ) : null}
                {waiting ? (
                  <button type="button" className="wl-wrote-row" onClick={() => go('ping', waiting)}>
                    <Face handle={waiting} size={30} />
                    <span className="wl-wrote-who">
                      <span className="wl-wrote-name">{atHandle(waiting)}</span>
                      <span className="wl-wrote-meta">a private note, waiting on one DM</span>
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ── what this person has written ──
              The letters are anonymous and stay anonymous: nothing on a
              letter points back here. The server answers a writer about
              their OWN letters and nobody else's (wall_mine, 0050). */}
          <div className="wl-profile-sect">
            <Label tone="dim">letters you wrote</Label>
            <Wrote go={go} />
          </div>

          {spent ? (
            <Allowance left={left.left} limit={left.limit} resets={left.resets} className="wl-profile-cap" />
          ) : null}
        </section>

        <div className="wl-push" />

        <SheetFoot>
          <Pill tone="light" wide onClick={() => go('ping')}>send a private note</Pill>
          <Pill tone="ghost" className="wl-profile-out" icon={<Icon name="signout" size={15} />} onClick={out}>
            sign out
          </Pill>
        </SheetFoot>
      </div>
    </Sheet>
  )
}
