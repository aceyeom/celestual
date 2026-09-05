// ── people ──────────────────────────────────────────────────────────────────
//
// Spec section 10's "user records", which since Phase 4b means celestual_users:
// one row per person, the handle canonical, the campus address separate, a plain
// email a note. Search matches any of the three, or an id.
//
// A row opens under itself rather than in a modal. The question somebody has
// while looking at one person is almost always "what else did they write", and
// a modal means losing your place in the table to find out.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskUsers, deskUser } from '../api/admin.js'
import { Search, useDebounced, Paging, Empty, Fault, When, State, None, Btn, Def, Json, clampOffset } from './parts.jsx'

const LIMIT = 50

export default function People({ password, go, onLock }) {
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const [open, setOpen] = useState(null)
  // null while reading, { error } when it could not be read, else the answer.
  const [detail, setDetail] = useState(null)
  const seq = useRef(0)

  useEffect(() => { setOffset(0) }, [q])

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true)
    const r = await deskUsers(password, { query: q, limit: LIMIT, offset })
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

  const openRow = useCallback(async (id) => {
    if (open === id) { setOpen(null); setDetail(null); return }
    setOpen(id)
    setDetail(null)
    const r = await deskUser(password, id)
    if (r?.error === 'password') { onLock && onLock(); return }
    setDetail(r && r.ok ? r : { error: r?.error || 'network' })
  }, [password, open, onLock])

  const rows = page?.rows || []

  return (
    <>
      <div className="ad-head">
        <h1>people</h1>
        <span className="ad-head-note">the handle is the identity. the address is a second one.</span>
        <div className="ad-head-acts">
          <Search value={query} onChange={setQuery} placeholder="a handle or an address" />
        </div>
      </div>

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>{q ? 'nobody matches that.' : 'nobody has a row yet.'}</Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th className="is-wide">handle</th>
                <th>campus</th>
                <th>email</th>
                <th className="is-num">letters</th>
                <th className="is-num">claims</th>
                <th className="is-num">sessions</th>
                <th>joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <RowPair
                  key={u.id}
                  u={u}
                  open={open === u.id}
                  detail={open === u.id ? detail : null}
                  onOpen={() => openRow(u.id)}
                  go={go}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page ? <Paging total={page.total || 0} limit={LIMIT} offset={offset} onOffset={setOffset} /> : null}
    </>
  )
}

function RowPair({ u, open, detail, onOpen, go }) {
  const merged = !!u.merged_into
  return (
    <>
      <tr className={open ? 'is-open' : ''}>
        {/* The id is in the drawer, not here. A thirty six character uuid under
            every handle outweighs the handle it is labelling, on every row, and
            the question a table answers is "which one", not "what is its key". */}
        <td className="is-wide">
          {u.handle
            ? <span className="ad-id">@{u.handle}</span>
            : <None>no handle yet</None>}
        </td>
        <td>{u.edu_domain ? <span className="ad-id is-dim">{u.edu_domain}</span> : <None />}</td>
        <td>{u.email ? <span className="ad-id is-dim">{u.email}</span> : <None />}</td>
        <td className="is-num">{u.letters}</td>
        <td className="is-num">{u.claims}</td>
        <td className="is-num">{u.sessions}</td>
        <td><When at={u.created_at} /></td>
        <td className="is-act">
          {merged ? <None>merged away</None> : null}
          <Btn onClick={onOpen}>{open ? 'close' : 'open'}</Btn>
        </td>
      </tr>
      {open ? (
        <tr className="ad-drawer">
          <td colSpan={8}>
            <div className="ad-drawer-in">
              <Def
                items={[
                  ['id', <span className="ad-uuid">{u.id}</span>],
                  ['handle', u.handle ? `@${u.handle}` : null],
                  ['handle verified', u.handle_verified_at ? <When at={u.handle_verified_at} exact /> : 'not proved'],
                  ['campus address', u.edu_email],
                  ['campus verified', u.edu_verified_at ? <When at={u.edu_verified_at} exact /> : 'not proved'],
                  ['email', u.email],
                  ['joined', <When at={u.created_at} exact />],
                  ['last touched', <When at={u.updated_at} exact />],
                  merged ? ['merged into', <span className="ad-uuid">{u.merged_into}</span>] : null,
                  merged ? ['merged', <When at={u.merged_at} exact />] : null,
                ]}
              />

              {detail === null ? <p className="ad-head-note" aria-live="polite">reading</p>
                : detail.error ? <p className="ad-head-note">the rest of this row could not be read. open it again.</p> : (
                <>
                  {detail.letters?.length ? (
                    <div>
                      <div className="wl-label" style={{ marginBottom: 8 }}>what they wrote</div>
                      <ul className="ad-sub">
                        {detail.letters.map((l) => (
                          <li key={l.id}>
                            <div>
                              <State>{l.status}</State>{' '}
                              <span className="ad-id is-dim">to @{l.target_handle}</span>{' '}
                              <When at={l.created_at} />
                            </div>
                            <p className="ad-body-text is-quote" style={{ margin: '4px 0 0' }}>{l.body}</p>
                            {l.status === 'rejected' ? <Json value={l.moderation} /> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : <p className="ad-head-note">they have written nothing.</p>}

                  {detail.claims?.length ? (
                    <div>
                      <div className="wl-label" style={{ marginBottom: 8 }}>what they claimed</div>
                      <ul className="ad-sub">
                        {detail.claims.map((c) => (
                          <li key={c.letter_id}>
                            <span className="ad-id is-dim">@{c.target_handle}</span> <When at={c.created_at} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {detail.merges?.length ? (
                    <div>
                      <div className="wl-label" style={{ marginBottom: 8 }}>merges</div>
                      <ul className="ad-sub">
                        {detail.merges.map((m) => (
                          <li key={m.id}>
                            <div className="ad-uuid">{m.absorbed_id} into {m.survivor_id}</div>
                            <div className="ad-head-note">{m.reason} · <When at={m.created_at} exact /></div>
                            <Json value={m.moved} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}

              {u.handle ? (
                <div>
                  <Btn tone="key" onClick={() => go('handles', u.handle)}>
                    look this @ up in the verification records
                  </Btn>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
