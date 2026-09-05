// ── the pings ───────────────────────────────────────────────────────────────
//
// The product's own object, on the desk for the first time. It is a ledger and
// it is deliberately not a map: a standing ping is listed with who placed it,
// when, how long it has left and whether it carries a line, and NOT who it is
// on. docs/SECURITY.md is the reason. The map of who wants whom is the thing
// the product exists to keep, and a console that drew it would be the leak
// with a login on it. A mutual names both sides, because both sides know.
//
// What a person at the desk actually needs from this screen: is the product
// being used, is anything about to lapse, did the mutuals happen, and is one
// sender doing something odd. All four are answerable without the map.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskPings } from '../api/admin.js'
import { Search, useDebounced, Tabs, Paging, Empty, Fault, When, State, None, Ledger, Figure, Note, clampOffset } from './parts.jsx'

const LIMIT = 50
const TABS = [
  { value: 'standing', label: 'standing' },
  { value: 'mutual', label: 'mutual' },
  { value: 'lapsed', label: 'lapsed' },
  { value: '', label: 'all' },
]

export default function Pings({ password, go, onLock }) {
  const [state, setState] = useState('standing')
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const seq = useRef(0)

  useEffect(() => { setOffset(0) }, [q, state])

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true)
    const r = await deskPings(password, { state, query: q, limit: LIMIT, offset })
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
  }, [password, state, q, offset, onLock])

  useEffect(() => { load() }, [load])

  const rows = page?.rows || []
  const c = page?.counts || {}

  return (
    <>
      <div className="ad-head">
        <h1>pings</h1>
        <span className="ad-head-note">who placed one, and when. never who it is on.</span>
        <div className="ad-head-acts">
          <Tabs value={state} onChange={setState} options={TABS} />
          <Search value={query} onChange={setQuery} placeholder="a handle" prefix="@" />
        </div>
      </div>

      {page && !page.error ? (
        <Ledger>
          <Figure n={c.standing} of="standing now" />
          <Figure n={c.pairs} of="mutual pairs" live={!!c.pairs} />
          <Figure n={c.placed_7d} of="placed this week" />
          <Figure n={c.mutual_7d} of="mutual this week" live={!!c.mutual_7d} />
          <Figure n={c.lapsing_7d} of="lapse within a week" />
          <Figure n={c.lapsed} of="lapsed, not yet swept" />
          <Figure n={c.with_line} of="carrying a line" />
          <Figure n={c.senders} of="people who placed one" />
        </Ledger>
      ) : null}

      <Note>
        a standing ping stands sixty days and then lapses; the hourly sweep clears lapsed
        ones, so a lapsed row here is one the sweep has not reached. a mutual is the only
        row that names two people, and it names them because both already know.
      </Note>

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>{q ? 'nothing matches that.' : state === 'standing' ? 'nothing is standing.' : 'nothing here.'}</Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>state</th>
                <th className="is-wide">placed by</th>
                <th>on</th>
                <th>line</th>
                <th className="is-num">days left</th>
                <th>placed</th>
                <th>mutual since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><State tone={p.state === 'mutual' ? 'is-live' : p.state === 'lapsed' ? 'is-off' : 'is-hold'}>{p.state}</State></td>
                  <td className="is-wide">
                    <button type="button" className="ad-id" title="open this person" onClick={() => go('people', p.from_handle)}>
                      @{p.from_handle}
                    </button>
                  </td>
                  <td>
                    {p.matched_handle
                      ? <span className="ad-id">@{p.matched_handle}</span>
                      : <None>not shown</None>}
                  </td>
                  <td>{p.has_line ? <State tone="is-live">a line</State> : <None />}</td>
                  <td className="is-num">{p.state === 'standing' ? p.days_left : ''}</td>
                  <td><When at={p.created_at} /></td>
                  <td><When at={p.matched_at} /></td>
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
