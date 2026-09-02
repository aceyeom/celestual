// ── the wall ────────────────────────────────────────────────────────────────
//
// Spec section 10's "moderation queue and rejection reasons" and "wall
// submissions", which are one table read two ways.
//
// ── WHY HELD COMES FIRST ────────────────────────────────────────────────────
// A letter is written at pending and renders nowhere until all three layers of
// celestual-wall-moderate pass. Layer 3 is a person, and this screen is that
// person. Anything the classifier returned 'review' for sits here until
// somebody moves it or it expires, so the tab that opens is the one with work
// in it rather than the one with the most rows in it.
//
// ── AND WHY THE REJECTED ONES ARE HERE AT ALL ───────────────────────────────
// Spec section 9: rejected content is stored with a rejection reason so it
// appears in admin, not silently dropped. Being unable to read what the screen
// caught is being unable to tell whether the screen works, and a screen nobody
// can check is a screen that quietly starts refusing everything.
import { useCallback, useEffect, useState } from 'react'
import { deskLetters, deskLetterSet } from '../api/admin.js'
import { Search, useDebounced, Tabs, Paging, Empty, When, State, Btn, Arm, Json } from './parts.jsx'

const LIMIT = 50
const TABS = [
  { value: 'pending', label: 'held' },
  { value: 'live', label: 'live' },
  { value: 'rejected', label: 'rejected' },
  { value: 'removed', label: 'down' },
  { value: '', label: 'all' },
]

export default function Letters({ password, initialStatus = 'pending', onChanged }) {
  const [status, setStatus] = useState(initialStatus)
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => { setOffset(0) }, [q, status])

  const load = useCallback(async () => {
    setBusy(true)
    const r = await deskLetters(password, { status, query: q, limit: LIMIT, offset })
    setPage(r && r.ok ? r : { rows: [], total: 0 })
    setBusy(false)
  }, [password, status, q, offset])

  useEffect(() => { load() }, [load])

  const decide = useCallback(async (id, to) => {
    await deskLetterSet(password, id, to, note)
    setNote('')
    setOpen(null)
    await load()
    onChanged && onChanged()
  }, [password, note, load, onChanged])

  const rows = page?.rows || []

  return (
    <>
      <div className="ad-head">
        <h1>the wall</h1>
        <span className="ad-head-note">
          a letter renders nowhere until it is live. publishing one from here is the third layer of the screen.
        </span>
        <div className="ad-head-acts">
          <Tabs value={status} onChange={setStatus} options={TABS} />
          <Search value={query} onChange={setQuery} placeholder="a name or a word" />
        </div>
      </div>

      {busy && !page ? <Empty>reading</Empty> : rows.length === 0 ? (
        <Empty>
          {status === 'pending' ? 'nothing is waiting to be read.'
            : q ? 'nothing matches that.'
              : 'nothing here yet.'}
        </Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>state</th>
                <th>to</th>
                <th className="is-wide">what it says</th>
                <th>from</th>
                <th className="is-num">reports</th>
                <th>written</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <LetterRow
                  key={l.id}
                  l={l}
                  open={open === l.id}
                  note={note}
                  setNote={setNote}
                  onOpen={() => { setOpen(open === l.id ? null : l.id); setNote('') }}
                  onDecide={decide}
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

function LetterRow({ l, open, note, setNote, onOpen, onDecide }) {
  const reasons = l.moderation?.reasons || []
  return (
    <>
      <tr className={open ? 'is-open' : ''}>
        <td><State>{l.status}</State></td>
        <td><span className="ad-id">@{l.target_handle}</span></td>
        <td className="is-wide">
          <p className="ad-body-text is-quote" style={{ margin: 0 }}>{l.body}</p>
          {reasons.length ? (
            <div className="ad-head-note ad-meta">the screen said: {reasons.join(', ')}</div>
          ) : null}
        </td>
        <td>
          {l.author_handle
            ? <span className="ad-id is-dim">@{l.author_handle}</span>
            : <span className="ad-id is-dim">{l.author_campus || 'unknown'}</span>}
        </td>
        <td className="is-num">{l.reports_open ? <span style={{ color: 'var(--ad-stop)' }}>{l.reports}</span> : l.reports || ''}</td>
        <td><When at={l.created_at} /></td>
        <td className="is-act"><Btn onClick={onOpen}>{open ? 'close' : 'decide'}</Btn></td>
      </tr>
      {open ? (
        <tr className="ad-drawer">
          <td colSpan={7}>
            <div className="ad-drawer-in">
              {l.sealed_line ? (
                <div>
                  <div className="wl-label" style={{ marginBottom: 6 }}>the sealed line, which the wall never shows</div>
                  <p className="ad-body-text is-quote" style={{ margin: 0 }}>{l.sealed_line}</p>
                </div>
              ) : null}

              <Json value={l.moderation} />

              <div>
                <label className="wl-label" htmlFor={`n-${l.id}`} style={{ marginBottom: 6 }}>
                  why, in your words. it is kept beside what the screen said.
                </label>
                <textarea
                  id={`n-${l.id}`}
                  className="ad-note"
                  value={note}
                  maxLength={400}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="optional"
                />
              </div>

              <div className="ad-btns" style={{ justifyContent: 'flex-start' }}>
                {l.status !== 'live' ? (
                  <Arm tone="go" armed="publish it" onAct={() => onDecide(l.id, 'live')}>
                    put it on the wall
                  </Arm>
                ) : null}
                {l.status !== 'removed' ? (
                  <Arm armed="take it down" onAct={() => onDecide(l.id, 'removed')}>
                    take it down
                  </Arm>
                ) : null}
                {l.status !== 'rejected' ? (
                  <Arm armed="reject it" onAct={() => onDecide(l.id, 'rejected')}>
                    reject it
                  </Arm>
                ) : null}
                {l.status !== 'pending' ? (
                  <Btn onClick={() => onDecide(l.id, 'pending')}>hold it back</Btn>
                ) : null}
              </div>

              <div className="ad-head-note">
                a name that has come off stays off: the wall refuses a new letter to a handle
                with a removed one on it, so taking this down closes that address.
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
