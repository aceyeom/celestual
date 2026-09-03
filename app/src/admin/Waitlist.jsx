// ── the waitlist ────────────────────────────────────────────────────────────
//
// Everybody who typed a name into the wall and found nothing. 0032 calls it the
// most commercially valuable table in the schema and the one with the least in
// it, and it had nowhere to be read from until this screen.
//
// `letters now` is the column worth having: it says whether the thing they were
// looking for has since arrived, which is the whole reason to keep the row.
import { useCallback, useEffect, useState } from 'react'
import { deskWaitlist } from '../api/admin.js'
import { Paging, Empty, When, None } from './parts.jsx'

const LIMIT = 100

export default function Waitlist({ password }) {
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)

  const load = useCallback(async () => {
    setBusy(true)
    const r = await deskWaitlist(password, { limit: LIMIT, offset })
    setPage(r && r.ok ? r : { rows: [], total: 0 })
    setBusy(false)
  }, [password, offset])

  useEffect(() => { load() }, [load])

  const rows = page?.rows || []

  return (
    <>
      <div className="ad-head">
        <h1>waiting</h1>
        <span className="ad-head-note">names somebody looked for and did not find.</span>
      </div>

      {busy && !page ? <Empty>reading</Empty> : rows.length === 0 ? (
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
    </>
  )
}
