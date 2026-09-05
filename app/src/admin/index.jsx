// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE DESK                                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Phase 7, and its second sitting. Spec section 10: rebuild /admin for a non
// developer, covering every new feature, with a path from a report to a
// removal. The second sitting (migration 0039) is for a team: the rail is
// grouped and each screen says what it is for, the first screen is the few
// numbers that matter and a graph, the product's own object has a screen, and
// the things that used to need Vercel or a SQL console (a sign in, a switch, a
// cap, a wall) are controls.
//
// ── WHAT REPLACED WHAT ──────────────────────────────────────────────────────
// components/admin.jsx was the Bindery's back office: laid paper, saddle brown,
// three state tints, and its own palette declared at the top of the file. That
// design is retired with the rest of it (docs/plan.md finding 1.9), so this is
// the same argument made again in the system that won: the wall's tokens, spent
// for density rather than for room. desk.css says how, at length.
//
// ── THE SCREENS, IN FOUR GROUPS ─────────────────────────────────────────────
//
//   today       the desk        what is waiting, twelve numbers, the graph
//               the guide       what to do when. For whoever is new
//   people      people          celestual_users. spec section 10's "user records"
//               verification    the DM records, and the six handle actions
//               pings           standing, mutual, lapsing. Never who a ping is on
//   the wall    letters         submissions and the moderation queue, one table two ways
//               reports         user-flagged content, and the path from a report to a removal
//               waiting         names looked for and not found, and which flyer
//   the team    the resolver    the Apify cache, the switch, the caps
//               access          sign in links, with no DM in the way
//               settings        the release gate, the caps, the walls, the log
//
// ── THE PASSWORD ────────────────────────────────────────────────────────────
// Held in sessionStorage, sent with every request, and checked in exactly one
// place: the celestual-admin edge function, against a server-held secret. Every
// data function behind it is service_role only, so nothing here is readable
// without it and nothing in this bundle would help anybody who did not have it.
import { useCallback, useEffect, useRef, useState } from 'react'
import '../wall/wall.css'
import './desk.css'
import { Ecliptic } from '../wall/art.jsx'
import { deskOverview, deskConflictResolve } from '../api/admin.js'
import { Btn } from './parts.jsx'
import Overview from './Overview.jsx'
import Guide from './Guide.jsx'
import People from './People.jsx'
import Handles from './Handles.jsx'
import Pings from './Pings.jsx'
import Letters from './Letters.jsx'
import Reports from './Reports.jsx'
import Waitlist from './Waitlist.jsx'
import Resolver from './Resolver.jsx'
import Access from './Access.jsx'
import Settings from './Settings.jsx'

const PW_STORE = 'celestual:adminpw' // session scoped. the server re-checks every call.

const GROUPS = [
  { word: 'today', items: [
    { id: 'overview', word: 'the desk', say: 'what is waiting, and the numbers' },
    { id: 'guide', word: 'the guide', say: 'what to do when' },
  ] },
  { word: 'people', items: [
    { id: 'people', word: 'people', say: 'every row', count: 'users' },
    { id: 'handles', word: 'verification', say: 'the DM records' },
    { id: 'pings', word: 'pings', say: 'standing and mutual', count: 'pings_standing' },
  ] },
  { word: 'the wall', items: [
    { id: 'wall', word: 'letters', say: 'held, live, down', count: 'letters_pending', live: true },
    { id: 'reports', word: 'reports', say: 'flagged letters', count: 'reports_open', live: true },
    { id: 'waitlist', word: 'waiting', say: 'names looked for', count: 'waitlist' },
  ] },
  { word: 'the team', items: [
    { id: 'cache', word: 'the resolver', say: 'faces, apify, the caps', count: 'profiles' },
    { id: 'access', word: 'access', say: 'sign in links' },
    { id: 'settings', word: 'settings', say: 'switches, caps, walls, the log' },
  ] },
]

function held() {
  try { return sessionStorage.getItem(PW_STORE) || '' } catch { return '' }
}

// The section in the address, so a link to a screen can be sent to somebody
// on the team and a reload lands where it was. `#reports`, `#people=@handle`.
function fromHash() {
  const m = (window.location.hash || '').match(/^#([a-z]+)(?:=(.*))?$/)
  const ids = GROUPS.flatMap((g) => g.items.map((i) => i.id))
  if (!m || !ids.includes(m[1])) return { section: 'overview', arg: '' }
  return { section: m[1], arg: decodeURIComponent(m[2] || '') }
}

export default function AdminApp() {
  const [password, setPassword] = useState(held)
  const [ok, setOk] = useState(false)
  const [{ section, arg }, setWhere] = useState(fromHash)
  const [overview, setOverview] = useState(null)
  // The password the overview last accepted, so the door's own successful
  // check is not followed by a second identical call from the effect below.
  const validated = useRef('')

  // The one way out, and every tab has it: the server said the password is
  // wrong. That happens when the secret is rotated under an open desk, and it
  // used to leave every tab drawing "nobody has a row yet" over a full table.
  const lock = useCallback(() => {
    try { sessionStorage.removeItem(PW_STORE) } catch { /* private mode */ }
    validated.current = ''
    setPassword(''); setOk(false); setOverview(null)
  }, [])

  // The overview doubles as the door: if it comes back ok the password is
  // right, and the numbers in the rail are already loaded. A separate "check
  // the password" call would be a second round trip to learn the same thing.
  const refresh = useCallback(async (pw) => {
    const use = pw || password
    const r = await deskOverview(use)
    if (r && r.ok) { validated.current = use; setOverview(r); setOk(true); return r }
    if (r?.error === 'password') lock()
    return r
  }, [password, lock])

  useEffect(() => {
    if (!password || validated.current === password) return
    let alive = true
    deskOverview(password).then((r) => {
      if (!alive) return
      if (r && r.ok) { validated.current = password; setOverview(r); setOk(true) }
      else { setOk(false); try { sessionStorage.removeItem(PW_STORE) } catch { /* private mode */ } }
    })
    return () => { alive = false }
  }, [password])

  const go = useCallback((id, a = '') => {
    setWhere({ section: id, arg: a })
    const h = a ? `#${id}=${encodeURIComponent(a)}` : `#${id}`
    if (window.location.hash !== h) window.history.replaceState(window.history.state, '', h)
    window.scrollTo(0, 0)
  }, [])

  const [said, setSaid] = useState('')
  const onConflictResolve = useCallback(async (id, note) => {
    const r = await deskConflictResolve(password, id, note)
    if (!r?.ok) { setSaid(r?.error === 'password' ? 'the password has changed. open the desk again' : 'that did not go through'); if (r?.error === 'password') lock(); return }
    setSaid('')
    await refresh()
  }, [password, refresh, lock])

  if (!ok) return <Gate onIn={(pw) => { setPassword(pw); }} refresh={refresh} />

  const c = overview?.counts || {}
  const common = { password, go, onLock: lock, onChanged: () => refresh(), overview }

  return (
    <div className="wl-root ad-root">
      <div className="ad-frame">
        <nav className="ad-rail" aria-label="sections">
          <div className="ad-rail-head">
            <Ecliptic size={19} />
            <span className="wl-label">celestual</span>
          </div>
          <div className="ad-nav">
            {GROUPS.map((g) => (
              <div className="ad-nav-group" key={g.word}>
                <div className="ad-nav-gl">{g.word}</div>
                {g.items.map((s) => {
                  const n = s.count ? c[s.count] : null
                  return (
                    <button
                      key={s.id}
                      data-sec={s.id}
                      className={section === s.id ? 'is-on' : ''}
                      onClick={() => go(s.id)}
                      aria-current={section === s.id ? 'page' : undefined}
                    >
                      <span className="ad-nav-w">
                        {s.word}
                        <small>{s.say}</small>
                      </span>
                      {typeof n === 'number' && n > 0
                        ? <span className={`ad-nav-n ${s.live ? 'is-live' : ''}`}>{n.toLocaleString()}</span>
                        : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="ad-rail-foot">
            <Btn onClick={() => refresh()}>read it again</Btn>{' '}
            <Btn onClick={lock}>lock it</Btn>
          </div>
        </nav>

        <main className="ad-body">
          {said ? <p className="ad-head-note" style={{ margin: '0 0 12px' }}>{said}</p> : null}
          {section === 'overview' ? <Overview data={overview} go={go} password={password} onLock={lock} onConflictResolve={onConflictResolve} />
            : section === 'guide' ? <Guide go={go} />
              : section === 'people' ? <People {...common} initialQuery={arg} />
                : section === 'handles' ? <Handles {...common} initialHandle={arg} />
                  : section === 'pings' ? <Pings {...common} />
                    : section === 'wall' ? <Letters {...common} initialStatus={arg || 'pending'} />
                      : section === 'reports' ? <Reports {...common} />
                        : section === 'waitlist' ? <Waitlist {...common} />
                          : section === 'cache' ? <Resolver {...common} />
                            : section === 'access' ? <Access {...common} />
                              : <Settings {...common} />}
        </main>
      </div>
    </div>
  )
}

// ── the door ────────────────────────────────────────────────────────────────
// One field on an empty ground. Nothing about the desk is named here: somebody
// who reaches this address without the password learns that a door exists,
// which they already knew from the address they typed.
function Gate({ onIn, refresh }) {
  const [value, setValue] = useState('')
  const [fault, setFault] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!value || busy) return
    setBusy(true)
    setFault('')
    const r = await refresh(value)
    setBusy(false)
    if (r && r.ok) {
      try { sessionStorage.setItem(PW_STORE, value) } catch { /* private mode */ }
      onIn(value)
      return
    }
    setFault(
      r?.error === 'rate' ? 'too many tries from here. wait an hour.'
        : r?.error === 'network' ? 'no answer. check the connection.'
          : r?.error === 'server' ? 'the desk answered, but the database did not. the migrations may be behind.'
            : 'not that.',
    )
    setValue('')
  }

  return (
    <div className="wl-root ad-root">
      <div className="ad-gate">
        <div className="ad-gate-in">
          <div className="ad-gate-mark"><Ecliptic size={30} /></div>
          <form onSubmit={submit}>
            <label className="wl-sr" htmlFor="ad-pw">password</label>
            <input
              id="ad-pw"
              type="password"
              value={value}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => setValue(e.target.value)}
            />
            {fault ? <p className="ad-gate-fault">{fault}</p> : null}
            <Btn type="submit" tone="key" disabled={!value || busy}>{busy ? 'checking' : 'open it'}</Btn>
          </form>
        </div>
      </div>
    </div>
  )
}
