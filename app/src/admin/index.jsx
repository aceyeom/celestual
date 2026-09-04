// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE DESK                                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Phase 7. Spec section 10: rebuild /admin for a non developer, covering every
// new feature, with a path from a report to a removal.
//
// ── WHAT REPLACED WHAT ──────────────────────────────────────────────────────
// components/admin.jsx was the Bindery's back office: laid paper, saddle brown,
// three state tints, and its own palette declared at the top of the file. That
// design is retired with the rest of it (docs/plan.md finding 1.9), so this is
// the same argument made again in the system that won: the wall's tokens, spent
// for density rather than for room. desk.css says how, at length.
//
// ── THE SEVEN SECTIONS, AND WHY THEY ARE THOSE SEVEN ────────────────────────
// Spec section 10 names six things the desk must cover. Six sections carry them
// and a seventh carries the half of the product that did not move:
//
//   the desk    what is waiting, the counts, the caps, which flyer
//   people      celestual_users. spec section 10's "user records"
//   the wall    submissions and the moderation queue, one table two ways
//   reports     user-flagged content, and the path from a report to a removal
//   resolution  the Apify cache, and the only place a forced resolve happens
//   waiting     everybody who looked for a name and found nothing
//   handles     the DM verification records, which the old layer still writes
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
import People from './People.jsx'
import Letters from './Letters.jsx'
import Reports from './Reports.jsx'
import Cache from './Cache.jsx'
import Waitlist from './Waitlist.jsx'
import Handles from './Handles.jsx'

const PW_STORE = 'celestual:adminpw' // session scoped. the server re-checks every call.

const SECTIONS = [
  { id: 'overview', word: 'the desk' },
  { id: 'people', word: 'people', count: 'users' },
  { id: 'wall', word: 'the wall', count: 'letters_pending', live: true },
  { id: 'reports', word: 'reports', count: 'reports_open', live: true },
  { id: 'cache', word: 'resolution', count: 'profiles' },
  { id: 'waitlist', word: 'waiting', count: 'waitlist' },
  { id: 'handles', word: 'handles' },
]

function held() {
  try { return sessionStorage.getItem(PW_STORE) || '' } catch { return '' }
}

export default function AdminApp() {
  const [password, setPassword] = useState(held)
  const [ok, setOk] = useState(false)
  const [section, setSection] = useState('overview')
  const [arg, setArg] = useState('')
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

  const go = useCallback((id, a = '') => { setSection(id); setArg(a); window.scrollTo(0, 0) }, [])

  const [said, setSaid] = useState('')
  const onConflictResolve = useCallback(async (id, note) => {
    const r = await deskConflictResolve(password, id, note)
    if (!r?.ok) { setSaid(r?.error === 'password' ? 'the password has changed. open the desk again' : 'that did not go through'); if (r?.error === 'password') lock(); return }
    setSaid('')
    await refresh()
  }, [password, refresh, lock])

  if (!ok) return <Gate onIn={(pw) => { setPassword(pw); }} refresh={refresh} />

  const c = overview?.counts || {}

  return (
    <div className="wl-root ad-root">
      <div className="ad-frame">
        <nav className="ad-rail" aria-label="sections">
          <div className="ad-rail-head">
            <Ecliptic size={19} />
            <span className="wl-label">celestual</span>
          </div>
          <div className="ad-nav">
            {SECTIONS.map((s) => {
              const n = s.count ? c[s.count] : null
              return (
                <button
                  key={s.id}
                  data-sec={s.id}
                  className={section === s.id ? 'is-on' : ''}
                  onClick={() => go(s.id)}
                >
                  {s.word}
                  {typeof n === 'number' && n > 0
                    ? <span className={`ad-nav-n ${s.live ? 'is-live' : ''}`}>{n.toLocaleString()}</span>
                    : null}
                </button>
              )
            })}
          </div>
          <div className="ad-rail-foot">
            <Btn onClick={() => refresh()}>read it again</Btn>{' '}
            <Btn
              onClick={() => {
                try { sessionStorage.removeItem(PW_STORE) } catch { /* private mode */ }
                setPassword(''); setOk(false); setOverview(null)
              }}
            >
              lock it
            </Btn>
          </div>
        </nav>

        <main className="ad-body">
          {said ? <p className="ad-head-note" style={{ margin: '0 0 12px' }}>{said}</p> : null}
          {section === 'overview' ? <Overview data={overview} go={go} onConflictResolve={onConflictResolve} />
            : section === 'people' ? <People password={password} go={go} onLock={lock} />
              : section === 'wall' ? <Letters password={password} initialStatus={arg || 'pending'} onChanged={refresh} onLock={lock} />
                : section === 'reports' ? <Reports password={password} onChanged={refresh} onLock={lock} />
                  : section === 'cache' ? <Cache password={password} onChanged={refresh} onLock={lock} />
                    : section === 'waitlist' ? <Waitlist password={password} onLock={lock} />
                      : <Handles password={password} initialHandle={arg} onLock={lock} />}
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
