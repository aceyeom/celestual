// ── the verification records ────────────────────────────────────────────────
//
// The older half of the desk, and it is here because the product still has two
// halves. Phase 4b layered celestual_users over celestual_members and
// celestual_ig_verifications and backfilled from them rather than replacing
// them, so the DM code flow still writes the old tables and these are still the
// records that answer "their codes are correct and nothing happens".
//
// Six actions, and one of them is the only thing in the product that refuses an
// identity. None of them can stamp celestual_users.handle_verified_at: that
// column has one writer and it demands a live DM proof (spec section 4).
// Admitting somebody here stamps the OLD layer, marked 'manual', which is
// honest about being our word rather than Meta's.
import { useCallback, useEffect, useState } from 'react'
import {
  adminOverview, adminHandleStatus, adminDeleteUser, adminBanUser,
  adminUnbanUser, adminClearPending, adminVerifyUser,
} from '../api/admin.js'
import { Search, Empty, When, State, Btn, Arm, Ledger, Figure, Def } from './parts.jsx'

export default function Handles({ password, initialHandle = '', onLock }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(true)
  const [handle, setHandle] = useState(initialHandle)
  const [look, setLook] = useState(null)
  const [said, setSaid] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    const r = await adminOverview(password)
    if (r?.error === 'password') { onLock && onLock(); return }
    setData(r && r.ok ? r : null)
    setBusy(false)
  }, [password, onLock])

  useEffect(() => { load() }, [load])

  const clean = handle.trim().replace(/^@/, '').toLowerCase()

  // Every handle in every table below is the control. It used to be a "put it
  // in the field" button in a column of its own, repeated down the right edge
  // of three tables, which is a lot of chrome to say "this row is a handle".
  const pick = useCallback((h) => { setHandle(h); setLook(null); window.scrollTo(0, 0) }, [])

  const lookUp = useCallback(async () => {
    if (!clean) return
    setSaid('')
    setLook({ loading: true })
    const r = await adminHandleStatus(password, clean)
    setLook(r && r.ok ? r : { error: true })
  }, [password, clean])

  useEffect(() => { if (initialHandle) lookUp() }, [initialHandle]) // eslint-disable-line react-hooks/exhaustive-deps

  // Every action is about the record on the screen, never about the text in
  // the field. They used to send `clean`, so looking @alice up, starting to
  // type @bob, and pressing "erase everything" erased bob while the drawer
  // showed alice.
  const [acting, setActing] = useState(false)
  const act = useCallback(async (fn, word) => {
    const target = look?.handle
    if (!target || acting) return
    setActing(true)
    setSaid('')
    const r = await fn(password, target)
    setActing(false)
    if (r?.error === 'password') { onLock && onLock(); return }
    setSaid(r && r.ok !== false ? `${word}: @${target}` : 'that did not go through')
    await lookUp()
    await load()
  }, [password, look, lookUp, load, onLock, acting])

  const c = data?.counts || {}
  const users = data?.users || []
  const unverified = data?.unverified || []
  const logs = data?.logs || []

  return (
    <>
      <div className="ad-head">
        <h1>verification</h1>
        <span className="ad-head-note">
          the instagram dm code flow, and the only place an identity is refused.
        </span>
      </div>

      {/* ── one @, and what to do about it ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <Search value={handle} onChange={setHandle} placeholder="one handle" prefix="@" />
        <Btn tone="key" onClick={lookUp} disabled={!clean}>look it up</Btn>
      </div>

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px' }}>{said}</p> : null}

      {look?.loading ? <Empty>reading</Empty> : look && !look.error ? (
        <div className="ad-drawer-in" style={{ marginBottom: 26 }}>
          <Def
            items={[
              ['handle', `@${look.handle}`],
              ['member', look.member ? 'yes' : 'no'],
              /* `blocked` is the server's own word for un-pingable either way;
                 `kind` says which way. The row used to read `suppressed`, which
                 0020 keeps for a desk older than itself and which is ban only. */
              ['blocked', look.blocked ? (look.kind === 'optout' ? 'yes, they opted out' : 'yes, refused') : 'no'],
              ['attempts on record', (look.verifications || []).length],
            ]}
          />
          {(look.verifications || []).length ? (
            <div className="ad-scroll">
              <table className="ad-table">
                <thead>
                  <tr><th>state</th><th>code</th><th>how</th><th>started</th><th>finished</th></tr>
                </thead>
                <tbody>
                  {look.verifications.map((v, i) => (
                    /* `code` and `via`: what celestual_admin_handle_status has
                       always returned. The columns read `token` and
                       `verified_via`, which nothing sends, so the code was
                       blank and every row said dm. */
                    <tr key={`${v.code}-${i}`}>
                      <td><State>{v.status}</State></td>
                      <td><span className="ad-id">{v.code}</span></td>
                      <td>{v.via || (v.status === 'verified' ? 'dm' : '')}</td>
                      <td><When at={v.created_at} exact /></td>
                      <td><When at={v.verified_at} exact /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="ad-head-note">no attempts on record.</p>}

          <div className="ad-btns" style={{ justifyContent: 'flex-start' }}>
            <Btn disabled={acting} onClick={() => act(adminClearPending, 'cleared the stuck codes for')}>
              clear their stuck codes
            </Btn>
            <Arm tone="go" armed={`admit @${look.handle} by hand`} busy={acting} onAct={() => act(adminVerifyUser, 'admitted')}>
              admit them by hand
            </Arm>
            <Arm armed={`erase everything @${look.handle} has`} busy={acting} onAct={() => act(adminDeleteUser, 'erased')}>
              erase everything they have
            </Arm>
            {look.blocked
              ? <Arm tone="go" armed={`let @${look.handle} back in`} busy={acting} onAct={() => act(adminUnbanUser, 'lifted the block on')}>
                {look.kind === 'optout' ? 'lift their opt out' : 'lift the block'}
              </Arm>
              : <Arm armed={`refuse @${look.handle}`} busy={acting} onAct={() => act(adminBanUser, 'blocked')}>
                erase and refuse this @
              </Arm>}
          </div>
          <div className="ad-head-note">
            admitting somebody here marks the old record manual. it does not prove a handle:
            that needs the dm code, and nothing on this screen can stand in for it.
          </div>
        </div>
      ) : look?.error ? (
        <p className="ad-head-note" style={{ margin: '0 0 20px' }}>that handle could not be read.</p>
      ) : null}

      {busy && !data ? <Empty>reading</Empty> : !data ? (
        <Empty>the records could not be read.</Empty>
      ) : (
        <>
          <Ledger>
            <Figure n={c.members} of="members" />
            <Figure n={c.unverified} of="mid attempt" live={!!c.unverified} />
            <Figure n={c.manual} of="admitted by hand" />
            <Figure n={c.assumed} of="admitted on timeout" />
            <Figure n={c.banned} of="refused" />
            <Figure n={c.opted_out} of="opted out" />
            <Figure n={c.pings} of="pings" />
            <Figure n={c.matches} of="mutual" />
            <Figure n={c.new_7d} of="new this week" />
            <Figure n={c.pings_7d} of="pings this week" />
          </Ledger>

          {unverified.length ? (
            <>
              <div className="wl-label ad-ledger-label">mid attempt, and stuck</div>
              <div className="ad-scroll">
                <table className="ad-table">
                  <thead>
                    <tr><th className="is-wide">handle</th><th className="is-num">tries</th><th>last code</th><th>live</th><th>first</th><th>last</th></tr>
                  </thead>
                  <tbody>
                    {unverified.slice(0, 60).map((u) => (
                      <tr key={u.handle}>
                        <td className="is-wide"><Pick handle={u.handle} onPick={pick} /></td>
                        <td className="is-num">{u.attempts}</td>
                        <td><span className="ad-id is-dim">{u.code}</span></td>
                        <td>{u.live ? <State tone="is-live">live</State> : <State tone="is-off">expired</State>}</td>
                        <td><When at={u.first_at} /></td>
                        <td><When at={u.last_at} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ height: 26 }} />
            </>
          ) : null}

          <div className="wl-label ad-ledger-label">members</div>
          {users.length === 0 ? <Empty>nobody has verified a handle yet.</Empty> : (
            <div className="ad-scroll">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th className="is-wide">handle</th><th>how</th><th>state</th>
                    <th className="is-num">placed</th><th className="is-num">received</th>
                    <th className="is-num">mutual</th><th>verified</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 120).map((u) => (
                    <tr key={u.handle}>
                      <td className="is-wide"><Pick handle={u.handle} onPick={pick} /></td>
                      <td>{u.via || 'dm'}</td>
                      <td>
                        {u.suppressed ? <State tone="is-stop">refused</State>
                          : u.opted_out ? <State tone="is-hold">opted out</State>
                            : <State tone="is-live">fine</State>}
                      </td>
                      <td className="is-num">{u.pings}</td>
                      <td className="is-num">{u.received}</td>
                      <td className="is-num">{u.matches}</td>
                      <td><When at={u.first_verified_at} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {logs.length ? (
            <>
              <div style={{ height: 30 }} />
              <div className="wl-label ad-ledger-label">what happened</div>
              <div className="ad-scroll">
                <table className="ad-table">
                  <thead>
                    <tr><th>when</th><th>what</th><th>who</th><th className="is-wide">detail</th></tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 80).map((l, i) => (
                      <tr key={`${l.at}-${i}`}>
                        <td><When at={l.at} exact /></td>
                        <td><State>{l.kind}</State></td>
                        <td>{l.handle ? <span className="ad-id is-dim">@{l.handle}</span> : ''}</td>
                        <td className="is-wide">{l.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  )
}

function Pick({ handle, onPick }) {
  return (
    <button type="button" className="ad-id" onClick={() => onPick(handle)} title="look this one up">
      @{handle}
    </button>
  )
}
