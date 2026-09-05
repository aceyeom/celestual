// ── reports ─────────────────────────────────────────────────────────────────
//
// Spec section 10: "reporting mechanism for user-flagged content, with an
// action path from report to removal."
//
// The removal already happened. wall_report sets the letter to removed in the
// same statement that files the report, because the screenshot exists before
// you delete it and a ninety second exposure window is not a small version of
// the harm. So this queue is not asking whether the letter comes down. It is
// asking whether it goes back up, which is a question a person can take their
// time over.
//
//   uphold    the report was right. it stays down, and it stays down for good.
//   dismiss   the report was wrong. it goes back on the wall.
//
// Either way every report on the same letter closes together, because three
// people reporting one letter is one decision.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskReports, deskReportResolve } from '../api/admin.js'
import { Tabs, Paging, Empty, Fault, When, State, None, Btn, Arm, clampOffset, failWord } from './parts.jsx'

const LIMIT = 50
const TABS = [
  { value: 'open', label: 'open' },
  { value: 'upheld', label: 'upheld' },
  { value: 'dismissed', label: 'dismissed' },
  { value: '', label: 'all' },
]

export default function Reports({ password, onChanged, onLock }) {
  const [status, setStatus] = useState('open')
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')
  const [said, setSaid] = useState('')
  const [acting, setActing] = useState(false)
  const seq = useRef(0)

  useEffect(() => { setOffset(0) }, [status])

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true)
    const r = await deskReports(password, { status, limit: LIMIT, offset })
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
  }, [password, status, offset, onLock])

  useEffect(() => { load() }, [load])

  const resolve = useCallback(async (id, uphold) => {
    if (acting) return
    setActing(true)
    setSaid('')
    const r = await deskReportResolve(password, id, uphold, note)
    setActing(false)
    if (!r?.ok) {
      setSaid(failWord(r))
      if (r?.error === 'password') onLock && onLock()
      // Somebody else decided it: the list is stale, so read it again.
      if (r?.error === 'already_resolved') await load()
      return
    }
    setNote('')
    setOpen(null)
    await load()
    onChanged && onChanged()
  }, [password, note, load, onChanged, onLock, acting])

  const rows = page?.rows || []

  return (
    <>
      <div className="ad-head">
        <h1>reports</h1>
        <span className="ad-head-note">
          the letter came down when the report was filed. this decides whether it goes back up.
        </span>
        <div className="ad-head-acts">
          <Tabs value={status} onChange={setStatus} options={TABS} />
        </div>
      </div>

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>{status === 'open' ? 'nothing has been reported.' : 'nothing here.'}</Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>report</th>
                <th className="is-wide">the letter</th>
                <th>said</th>
                <th className="is-num">reports</th>
                <th>filed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ReportRow
                  key={r.id}
                  r={r}
                  open={open === r.id}
                  note={note}
                  setNote={setNote}
                  onOpen={() => { setOpen(open === r.id ? null : r.id); setNote(''); setSaid('') }}
                  onResolve={resolve}
                  acting={acting}
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

function ReportRow({ r, open, note, setNote, onOpen, onResolve, acting }) {
  return (
    <>
      <tr className={open ? 'is-open' : ''}>
        <td><State>{r.status}</State></td>
        <td className="is-wide">
          <div className="ad-head-note ad-meta">
            to @{r.letter_target}, and it is {r.letter_status}
          </div>
          <p className="ad-body-text is-quote" style={{ margin: 0 }}>{r.letter_body}</p>
        </td>
        <td className="is-mid">
          <p className="ad-body-text" style={{ margin: 0 }}>{r.reason}</p>
          <div className="ad-head-note ad-meta">
            {r.reporter_handle ? `@${r.reporter_handle}` : r.reporter_id ? 'a campus address' : <None>somebody since removed</None>}
          </div>
        </td>
        <td className="is-num">{r.letter_reports}</td>
        <td><When at={r.created_at} /></td>
        <td className="is-act">
          {r.status === 'open'
            ? <Btn onClick={onOpen}>{open ? 'close' : 'decide'}</Btn>
            : <Btn onClick={onOpen}>{open ? 'close' : 'read'}</Btn>}
        </td>
      </tr>
      {open ? (
        <tr className="ad-drawer">
          <td colSpan={6}>
            <div className="ad-drawer-in">
              <div className="ad-head-note">
                written by {r.author_handle ? `@${r.author_handle}` : 'somebody with a campus address and no handle'},{' '}
                <When at={r.letter_created_at} exact />, on the {r.letter_campus} wall.
              </div>

              {r.status === 'open' ? (
                <>
                  <div>
                    <label className="wl-label" htmlFor={`r-${r.id}`} style={{ marginBottom: 6 }}>
                      what you decided, and why
                    </label>
                    <textarea
                      id={`r-${r.id}`}
                      className="ad-note"
                      value={note}
                      maxLength={400}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="optional"
                    />
                  </div>
                  <div className="ad-btns" style={{ justifyContent: 'flex-start' }}>
                    <Arm armed="it stays down" busy={acting} onAct={() => onResolve(r.id, true)}>
                      uphold, and it stays down
                    </Arm>
                    <Arm tone="go" armed="put it back" busy={acting} onAct={() => onResolve(r.id, false)}>
                      dismiss, and it goes back up
                    </Arm>
                  </div>
                  <div className="ad-head-note">
                    {r.letter_reports > 1
                      ? `all ${r.letter_reports} reports on this letter close with it.`
                      : 'this closes the report either way.'}
                  </div>
                </>
              ) : (
                <div>
                  <div className="wl-label" style={{ marginBottom: 6 }}>resolved</div>
                  <p className="ad-body-text" style={{ margin: 0 }}>
                    {r.resolution || 'no reason was written down.'}
                  </p>
                  <div className="ad-head-note" style={{ marginTop: 4 }}>
                    <When at={r.resolved_at} exact />
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
