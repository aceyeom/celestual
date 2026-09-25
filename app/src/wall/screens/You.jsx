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
import { useEffect, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Label, Pill, Face, Icon, Allowance, Heart, DoorFoot, useProfile,
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
  if (!rows.length) return <p className="wl-profile-none">nobody yet</p>
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
    body = <ScreenNote title="let it go?">this frees the slot. nothing was ever revealed.</ScreenNote>
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
      : <ScreenNote>placed without a line.</ScreenNote>
    keys = {
      l: { label: 'options', onClick: () => { setAt(0); setMode('menu') }, disabled: busy, aria: 'options: sixty more days, or let it go' },
      r: { label: 'back', onClick: onBack, aria: 'back to your pings' },
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

  useEffect(() => {
    const me = myHandle()
    if (!me) { setList({ loading: false, pings: [], error: 'none' }); return undefined }
    const proof = heldProof(me)
    if (!proof) { setList({ loading: false, pings: [], error: 'unverified' }); return undefined }
    let on = true
    setList((s) => ({ ...s, loading: true }))
    myPings({ handle: me, proof }).then((out) => {
      if (on) setList({ loading: false, pings: out.pings, error: out.ok ? null : out.error })
    })
    return () => { on = false }
  }, [rev])

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
            title={lapsed ? <>one message,<br />and it is back.</> : <>your pings are<br />behind your @.</>}
            say={'nothing happens unless it’s mutual.'}
          />
          <div className="wl-push" />
          <SheetFoot>
            {proof.dm ? (
              <button type="button" className="wl-quiet" onClick={proof.drop}>start over</button>
            ) : known ? (
              <button type="button" className="wl-quiet" onClick={() => { proof.setSaid(''); setView(null) }}>not now</button>
            ) : (
              <button type="button" className="wl-quiet" onClick={() => go('ping')}>or place one first</button>
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
  const also = who && handle && !String(who).includes(handle) ? atHandle(handle) : ''

  const ask = (words) => (
    <div className="wl-you-ask">
      <p className="wl-you-say">{words}</p>
      <Pill tone="ghost" icon={<Provider size={15} />} onClick={() => setView('prove')}>prove it with one DM</Pill>
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
              {also ? <p className="wl-you-also">{also}</p> : null}
            </div>
          </div>

          {/* ── the pings ──
              The mutuals first and set apart, then the standing ones with
              their days, and what is left of the slots on the section's own
              line. Or, when there is no list to draw, which of the three
              reasons it is, and the one thing to do about it. */}
          <div className="wl-profile-sect">
            <div className="wl-you-head">
              <Label tone="dim">your pings</Label>
              {slots ? <Label tone="dim" className="wl-you-slots">{slots}</Label> : null}
            </div>
            {list.error === 'none' ? ask('your pings are behind your @.')
              : list.error === 'unverified' ? ask('one message, and it is back.')
              : list.error ? (
                <div className="wl-you-ask">
                  <p className="wl-you-say">your pings did not load. nothing about them has changed.</p>
                  <button type="button" className="wl-quiet" onClick={() => setRev((n) => n + 1)}>try again</button>
                </div>
              ) : list.loading && !list.pings.length ? (
                <p className="wl-profile-none wl-you-wait" aria-label="reading your pings"><Wait /></p>
              ) : !list.pings.length ? (
                <p className="wl-profile-none">nothing out yet</p>
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
                      <span className="wl-wrote-meta">a ping, waiting on one DM</span>
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
            <Label tone="dim">written to</Label>
            <Wrote go={go} />
          </div>

          {spent ? (
            <Allowance left={left.left} limit={left.limit} resets={left.resets} className="wl-profile-cap" />
          ) : null}
        </section>

        <div className="wl-push" />

        <SheetFoot>
          <Pill tone="light" wide onClick={() => go('ping')}>place a ping</Pill>
          <Pill tone="ghost" className="wl-profile-out" icon={<Icon name="signout" size={15} />} onClick={out}>
            sign out
          </Pill>
        </SheetFoot>
      </div>
    </Sheet>
  )
}
