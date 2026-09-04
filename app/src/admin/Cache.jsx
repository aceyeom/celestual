// ── the resolution cache ────────────────────────────────────────────────────
//
// Spec section 10's "handle resolution cache". Spec section 5 keeps these rows
// forever and refreshes them only when a resolve is explicitly forced, which
// makes this screen the only place a forced resolve can come from.
//
// Forgetting a handle deletes its row, so the next lookup is an ordinary cache
// miss taking the ordinary path: one Apify call, one avatar download, one row
// written. It is the only destructive act on this screen and it costs one
// billed call, which is why it arms before it fires.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskProfiles, deskProfileForget } from '../api/admin.js'
import { Search, useDebounced, Paging, Empty, Fault, When, State, None, Arm, clampOffset, failWord } from './parts.jsx'

const LIMIT = 50

export default function Cache({ password, onChanged, onLock }) {
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const [said, setSaid] = useState('')
  const [acting, setActing] = useState(false)
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
    // the rail's count of resolved profiles is one lower now
    onChanged && onChanged()
  }, [password, load, onChanged, onLock, acting])

  const rows = page?.rows || []

  return (
    <>
      <div className="ad-head">
        <h1>resolution</h1>
        <span className="ad-head-note">
          kept forever, served from here, and refreshed only when you force it.
        </span>
        <div className="ad-head-acts">
          <Search value={query} onChange={setQuery} placeholder="a handle or a name" prefix="@" />
        </div>
      </div>

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

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
