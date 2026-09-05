// ── the resolver ────────────────────────────────────────────────────────────
//
// Spec section 10's "handle resolution cache", and everything that costs money
// beside it: the switch, the day's spend against the ceiling, the caps per
// key, and the rows themselves.
//
// Forgetting a handle deletes its row, so the next lookup is an ordinary cache
// miss taking the ordinary path: one Apify call, one avatar download, one row
// written. It is the only destructive act on this screen and it costs one
// billed call, which is why it arms before it fires.
//
// The switch is migration 0039's `resolver_enabled`. Off, nothing reaches
// Apify and a handle nobody has looked up before draws no card; cache hits
// still answer, because they cost nothing. It is the one control on the desk
// that stops a bill on its own.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskProfiles, deskProfileForget, deskSettingSet } from '../api/admin.js'
import { Search, useDebounced, Paging, Empty, Fault, When, State, None, Arm, Toggle, Ledger, Figure, Note, clampOffset, failWord } from './parts.jsx'

const LIMIT = 50

export default function Resolver({ password, overview, onChanged, onLock }) {
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const [said, setSaid] = useState('')
  const [acting, setActing] = useState(false)
  const [switching, setSwitching] = useState(false)
  const seq = useRef(0)

  useEffect(() => { setOffset(0) }, [q])

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true)
    const r = await deskProfiles(password, { query: q, limit: LIMIT, offset })
    if (mine !== seq.current) return
    if (r?.error === 'password') { onLock && onLock(); return }
    if (r && r.ok) {
      const at = clampOffset(offset, r.total || 0, LIMIT)
      if (at !== offset) { setOffset(at); return }
      setPage(r)
    } else {
      setPage({ rows: [], total: 0, error: r?.error || 'network' })
    }
    setBusy(false)
  }, [password, q, offset, onLock])

  useEffect(() => { load() }, [load])

  const forget = useCallback(async (handle) => {
    if (acting) return
    setActing(true)
    setSaid('')
    const r = await deskProfileForget(password, handle)
    setActing(false)
    if (!r?.ok) {
      setSaid(failWord(r))
      if (r?.error === 'password') onLock && onLock()
      return
    }
    await load()
    onChanged && onChanged()
  }, [password, load, onChanged, onLock, acting])

  const c = overview?.counts || {}
  const settings = overview?.settings || {}
  const on = settings.resolver_enabled !== false
  const limits = overview?.limits || []
  const blocked = limits.filter((l) => l.blocked)

  const flip = useCallback(async (next) => {
    if (switching) return
    setSwitching(true)
    setSaid('')
    const r = await deskSettingSet(password, 'resolver_enabled', next ? 'true' : 'false')
    setSwitching(false)
    if (!r?.ok) { setSaid(failWord(r)); if (r?.error === 'password') onLock && onLock(); return }
    onChanged && onChanged()
  }, [password, switching, onChanged, onLock])

  const rows = page?.rows || []

  return (
    <>
      <div className="ad-head">
        <h1>the resolver</h1>
        <span className="ad-head-note">
          the face and the name under a typed handle. every miss is one apify call.
        </span>
        <div className="ad-head-acts">
          <Search value={query} onChange={setQuery} placeholder="a handle or a name" prefix="@" />
        </div>
      </div>

      {/* ── the switch and the meter ── */}
      <div className="ad-panel">
        <div className="ad-panel-row">
          <div>
            <div className="wl-label" style={{ marginBottom: 6 }}>apify</div>
            <Toggle on={on} busy={switching} onChange={flip} words={['on. new handles are looked up', 'off. only the cache answers']} />
          </div>
          <div className="ad-panel-fig">
            <span className={`ad-fig-n ${(c.searches_24h || 0) >= (settings.cap_global || 1000) ? 'is-live' : ''}`}>
              {(c.searches_24h || 0).toLocaleString()}
            </span>
            <span className="ad-fig-t">calls in the last day, of {(settings.cap_global || 1000).toLocaleString()} allowed</span>
          </div>
        </div>
        <Note>
          turning it off stops the bill at once: a handle already in the cache still shows its face,
          a new one shows nothing, and every ping still goes through. the ceiling and the per person
          caps are on the settings screen.
        </Note>
      </div>

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

      <Ledger label="the cache">
        <Figure n={c.profiles} of="profiles cached, kept for good" />
        <Figure n={c.profiles_faced} of="with a face stored" />
        <Figure n={c.profiles_stale} of="faces past thirty days" />
        <Figure n={c.searches_48h} of="calls in two days" />
      </Ledger>

      {/* ── the caps ──
          Spec section 5. Cache hits never appear here, because only a call that
          actually reached Apify writes a row, which is what keeps the number on
          this screen the same number as the bill. */}
      <div className="ad-head is-sub">
        <h2>who has spent what</h2>
        <span className="ad-head-note">
          rolling twenty four hours, per key. a person or a device at its cap is refused until the oldest call ages out.
        </span>
      </div>
      {limits.length ? (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>key</th><th className="is-wide">value</th>
                <th className="is-num">spent</th><th className="is-num">cap</th>
                <th className="is-num">left</th><th>first</th><th>last</th>
              </tr>
            </thead>
            <tbody>
              {limits.slice(0, 40).map((l) => (
                <tr key={`${l.key_type}:${l.key_value}`}>
                  <td><State tone={l.blocked ? 'is-stop' : 'is-live'}>{l.key_type === 'user_id' ? 'person' : l.key_type === 'device_id' ? 'device' : l.key_type === 'ip' ? 'address' : 'everybody'}</State></td>
                  <td className="is-wide"><span className="ad-id">{l.key_value}</span></td>
                  <td className="is-num is-key">{l.spent}</td>
                  <td className="is-num">{l.cap}</td>
                  <td className="is-num">{l.remaining}</td>
                  <td><When at={l.oldest} /></td>
                  <td><When at={l.newest} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>nobody has spent a lookup today.</Empty>
      )}
      {blocked.length ? (
        <Note>{blocked.length === 1 ? 'one key is' : `${blocked.length} keys are`} at the cap. that is what "the card never shows up" means when a person writes in.</Note>
      ) : null}

      <div className="ad-head is-sub">
        <h2>the cache</h2>
        <span className="ad-head-note">kept forever, served from here, and refreshed only when you force it.</span>
      </div>

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>{q ? 'nothing matches that.' : 'nothing has been resolved yet.'}</Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th />
                <th className="is-wide">handle</th>
                <th>name</th>
                <th>badge</th>
                <th>face</th>
                <th className="is-num">looked up, two days</th>
                <th>resolved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.handle}>
                  <td style={{ width: 34 }}><Face src={p.avatar} name={p.display_name} handle={p.handle} /></td>
                  <td className="is-wide">
                    <span className="ad-id">@{p.handle}</span>
                    {p.is_private ? <div className="ad-head-note ad-meta">private account</div> : null}
                  </td>
                  <td>{p.display_name || <None />}</td>
                  <td>{p.is_verified ? <State tone="is-live">verified</State> : <None>no</None>}</td>
                  <td>
                    {p.avatar_path
                      ? <State tone={p.stale ? 'is-hold' : 'is-live'}>{p.stale ? 'past thirty days' : 'stored'}</State>
                      : <None />}
                  </td>
                  <td className="is-num">{p.searches}</td>
                  <td><When at={p.resolved_at} /></td>
                  <td className="is-act">
                    <Arm tone="quiet" armed="spend a call" busy={acting} onAct={() => forget(p.handle)} title="deletes the row so the next lookup resolves it again">
                      resolve again
                    </Arm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page ? <Paging total={page.total || 0} limit={LIMIT} offset={offset} onOffset={setOffset} /> : null}
    </>
  )
}

// The same fallback the wall's result card uses: initials off the display name
// when there is no stored face, never a broken image and never an icon.
function Face({ src, name, handle }) {
  const [failed, setFailed] = useState(false)
  const letters = (name || handle || '')
    .trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?'
  if (!src || failed) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%',
          border: '1px solid var(--hair)', color: 'var(--ash-dim)',
          fontFamily: 'var(--f-id)', fontSize: 10, letterSpacing: '0.04em',
        }}
      >
        {letters}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={28}
      height={28}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
    />
  )
}
