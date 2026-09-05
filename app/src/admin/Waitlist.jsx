// ── the waitlist ────────────────────────────────────────────────────────────
//
// Everybody who typed a name into the wall and found nothing. 0032 calls it the
// most commercially valuable table in the schema and the one with the least in
// it, and it had nowhere to be read from until this screen.
//
// `letters now` is the column worth having: it says whether the thing they were
// looking for has since arrived, which is the whole reason to keep the row.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskWaitlist } from '../api/admin.js'
import { Paging, Empty, Fault, When, None, clampOffset } from './parts.jsx'

const LIMIT = 100

export default function Waitlist({ password, onLock, overview }) {
  const scans = overview?.scans || []
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const seq = useRef(0)

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true)
    const r = await deskWaitlist(password, { limit: LIMIT, offset })
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
  }, [password, offset, onLock])

  useEffect(() => { load() }, [load])

  const rows = page?.rows || []

  return (
    <>
      <div className="ad-head">
        <h1>waiting</h1>
        <span className="ad-head-note">names somebody looked for and did not find.</span>
      </div>

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>everybody who looked found something.</Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th className="is-wide">handle</th>
                <th>campus</th>
                <th>came from</th>
                <th className="is-num">letters now</th>
                <th>looked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={`${w.handle}:${w.campus}`}>
                  <td className="is-wide"><span className="ad-id">@{w.handle}</span></td>
                  <td>{w.campus}</td>
                  <td>{w.source_code ? <span className="ad-id is-dim">{w.source_code}</span> : <None>unknown</None>}</td>
                  <td className="is-num">
                    {w.letters_now ? <span style={{ color: 'var(--accent)' }}>{w.letters_now}</span> : '0'}
                  </td>
                  <td><When at={w.created_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page ? <Paging total={page.total || 0} limit={LIMIT} offset={offset} onOffset={setOffset} /> : null}

      {/* ── which flyer ──
          Scan attribution: the cheapest question in the campaign and the only
          one that cannot be answered later. It lived on the first screen and
          belongs with the names that came in off the same flyers. */}
      <div className="ad-head is-sub">
        <h2>which flyer</h2>
        <span className="ad-head-note">every scan of a printed code, and how many letters each code produced.</span>
      </div>
      {scans.length ? (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr><th className="is-wide">code</th><th>campus</th><th className="is-num">scans</th><th className="is-num">letters</th><th>last</th></tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={`${s.source_code}:${s.campus}`}>
                  <td className="is-wide"><span className="ad-id">{s.source_code}</span></td>
                  <td>{s.campus}</td>
                  <td className="is-num is-key">{s.scans}</td>
                  <td className="is-num">{s.letters}</td>
                  <td><When at={s.last_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>no flyer has been scanned yet.</Empty>
      )}
    </>
  )
}
