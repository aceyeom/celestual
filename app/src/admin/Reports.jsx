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
//
// ── what a decision needs, on the row ───────────────────────────────────────
// The letter, the reason, and three numbers the desk used to have to go and
// find: how many reports the reporter has filed (a person who reports
// everything is a different case from a person who reported once), how many
// letters the author has written and how many were reported (the same for
// the author), and whether the name is already shut. Two doors lead out of a
// report besides the decision: the author, whole, on the people screen, and
// the name, shut, so nothing more is written to it.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskReports, deskReportResolve, deskNameShut, deskNameOpen } from '../api/admin.js'
import { Tabs, Paging, Empty, Fault, When, State, None, Btn, Arm, Ledger, Figure, Note, clampOffset, failWord } from './parts.jsx'

const LIMIT = 50
const TABS = [
  { value: 'open', label: 'open' },
  { value: 'upheld', label: 'upheld' },
  { value: 'dismissed', label: 'dismissed' },
  { value: '', label: 'all' },
]

export default function Reports({ password, go, onChanged, onLock }) {
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

  // One act at a time, and the answer is read: a failed write used to close
  // the drawer and reload an unchanged list, which is what "done" looks like.
  const act = useCallback(async (fn, keep = false) => {
    if (acting) return
    setActing(true)
    setSaid('')
    const r = await fn()
    setActing(false)
    if (!r?.ok) {
      setSaid(failWord(r))
      if (r?.error === 'password') onLock && onLock()
      if (r?.error === 'already_resolved') await load()
      return
    }
    if (!keep) { setNote(''); setOpen(null) }
    await load()
    onChanged && onChanged()
  }, [load, onChanged, onLock, acting])

  const rows = page?.rows || []
  const c = page?.counts || {}

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

      {page && !page.error ? (
        <Ledger>
          <Figure n={c.open} of="open, waiting on you" live={!!c.open} />
          <Figure n={c.reports_7d} of="filed this week" />
          <Figure n={c.upheld} of="upheld, stayed down" />
          <Figure n={c.dismissed} of="dismissed, went back up" />
        </Ledger>
      ) : null}

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>{status === 'open' ? 'nothing is waiting on you.' : 'nothing here.'}</Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>report</th>
                <th className="is-wide">the letter</th>
                <th className="is-mid">the reason</th>
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
                  acting={acting}
                  go={go}
                  onUphold={() => act(() => deskReportResolve(password, r.id, true, note))}
                  onDismiss={() => act(() => deskReportResolve(password, r.id, false, note))}
                  onShut={() => act(() => deskNameShut(password, r.letter_target, r.letter_campus, note), true)}
                  onOpenName={() => act(() => deskNameOpen(password, r.letter_target, r.letter_campus), true)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page ? <Paging total={page.total || 0} limit={LIMIT} offset={offset} onOffset={setOffset} /> : null}

      <Note>
        upholding keeps the letter down for good and shuts nothing else. dismissing puts it back
        on the wall. shutting the name takes every letter to that handle down and refuses new
        ones until the name is opened again; use it when the person the letters are about has
        asked, and the wall tab can put single letters back up afterwards.
      </Note>
    </>
  )
}

function ReportRow({ r, open, note, setNote, onOpen, acting, go, onUphold, onDismiss, onShut, onOpenName }) {
  const isOpen = r.status === 'open'
  return (
    <>
      <tr className={open ? 'is-open' : ''}>
        <td><State>{r.status}</State></td>
        <td className="is-wide">
          <div className="ad-head-note ad-meta">
            to <span className="ad-id is-dim">@{r.letter_target}</span>, and it is {r.letter_status}
            {r.name_shut ? <>, and the name is shut</> : null}
          </div>
          <p className="ad-body-text is-quote" style={{ margin: 0 }}>{r.letter_body}</p>
        </td>
        <td className="is-mid">
          <p className="ad-body-text" style={{ margin: 0 }}>{r.reason}</p>
          <div className="ad-head-note ad-meta">
            {r.reporter_handle ? `@${r.reporter_handle}`
              : r.reporter_id ? `a ${r.reporter_campus || 'campus'} address`
                : <None>somebody since removed</None>}
            {r.reporter_reports > 1 ? ` · ${r.reporter_reports} reports filed` : ''}
          </div>
        </td>
        <td className="is-num">{r.letter_reports}</td>
        <td><When at={r.created_at} /></td>
        <td className="is-act">
          <Btn onClick={onOpen} tone={isOpen && !open ? 'key' : ''}>{open ? 'close' : isOpen ? 'decide' : 'read'}</Btn>
        </td>
      </tr>
      {open ? (
        <tr className="ad-drawer">
          <td colSpan={6}>
            <div className="ad-drawer-in">
              <div className="ad-head-note">
                written by {r.author_handle ? `@${r.author_handle}` : `somebody with a ${r.author_campus || 'campus'} address and no handle`},{' '}
                <When at={r.letter_created_at} exact />, on the {r.letter_campus} wall.
                {' '}the author has written {r.author_letters} {r.author_letters === 1 ? 'letter' : 'letters'}
                {r.author_reported ? `, ${r.author_reported} of them reported` : ''}.
                {r.author_id ? (
                  <>
                    {' '}
                    <button type="button" className="ad-id" onClick={() => go('people', r.author_handle || r.author_id)}>
                      open the author
                    </button>
                  </>
                ) : null}
              </div>

              {isOpen ? (
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
                      placeholder="optional. kept beside the decision"
                    />
                  </div>
                  <div className="ad-btns" style={{ justifyContent: 'flex-start' }}>
                    <Arm armed="it stays down" busy={acting} onAct={onUphold}>
                      uphold, and it stays down
                    </Arm>
                    <Arm tone="go" armed="put it back" busy={acting} onAct={onDismiss}>
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

              {/* ── the name ──
                  A different question from the report: not this letter, every
                  letter to this person, and the ones not yet written. */}
              <div className="ad-btns" style={{ justifyContent: 'flex-start', alignItems: 'center', gap: 10 }}>
                {r.name_shut ? (
                  <>
                    <span className="ad-head-note">the name is shut. nothing new can be written to @{r.letter_target}.</span>
                    <Arm tone="go" armed={`open @${r.letter_target} again`} busy={acting} onAct={onOpenName}>
                      open the name again
                    </Arm>
                  </>
                ) : (
                  <Arm armed={`shut @${r.letter_target}`} busy={acting} onAct={onShut} title="every letter to this name comes down and no more can be written to it">
                    shut the name
                  </Arm>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
