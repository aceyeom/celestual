// ── replies ─────────────────────────────────────────────────────────────────
//
// Migration 0068. The replies under the wall's letters, and the two ways one
// comes to a person: the reading was unsure of it before it went up (held,
// and shown to its writer alone), or three devices reported it after it went
// up (hidden, and shown to its writer alone). Either way it is waiting on
// somebody here, and nobody else can see it until they decide.
//
//   put it up     held: it goes up. hidden: it goes back up, and the reports
//                 that hid it stop counting, so three new devices are needed
//                 to hide it again
//   take it down  it comes down for good, and its writer is told in the
//                 thread that it went against the terms for replying
//
// ── anonymous to others, not to us ──────────────────────────────────────────
// This is the one screen in the product where a reply has a writer: the
// school address and the handle of whoever wrote it, how many replies they
// have written and how many came down. That is what the terms for replying
// promise the person replying ("celestual can see who wrote what") and what
// acting on abuse needs. The row says nothing about it anywhere else.
//
// The tabs read the same table: waiting (the default, oldest first), then
// every state on its own, newest first.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskReplies, deskReplySet } from './replies-api.js'
import { Tabs, Paging, Empty, Fault, When, State, None, Btn, Arm, Ledger, Figure, Note, clampOffset, failWord } from './parts.jsx'

const LIMIT = 50
const TABS = [
  { value: 'waiting', label: 'waiting' },
  { value: 'held', label: 'held' },
  { value: 'hidden', label: 'reported' },
  { value: 'live', label: 'up' },
  { value: 'removed', label: 'down' },
  { value: 'rejected', label: 'refused' },
  { value: 'all', label: 'all' },
]

// the word the desk's state column draws for each (parts.jsx `State`)
const SAY = { live: 'up', held: 'held', hidden: 'reported', removed: 'down', rejected: 'refused' }

// The number the rail carries: what is waiting on a person. Read on its own,
// since the desk's overview is a different function's and does not know the
// replies exist (index.jsx merges it into the rail's counts).
export function useReplyCount(password, tick = 0) {
  const [n, setN] = useState(null)
  useEffect(() => {
    if (!password) return undefined
    let alive = true
    deskReplies(password, { status: 'waiting', limit: 1 }).then((r) => {
      if (alive && r && r.ok) setN(Number(r.counts?.waiting) || 0)
    })
    return () => { alive = false }
  }, [password, tick])
  return n
}

export default function Replies({ password, go, onChanged, onLock }) {
  const [status, setStatus] = useState('waiting')
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
    const r = await deskReplies(password, { status, limit: LIMIT, offset })
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

  const act = useCallback(async (id, to) => {
    if (acting) return
    setActing(true)
    setSaid('')
    const r = await deskReplySet(password, id, to, note)
    setActing(false)
    if (!r?.ok) {
      setSaid(failWord(r))
      if (r?.error === 'password') onLock && onLock()
      return
    }
    setNote('')
    setOpen(null)
    await load()
    onChanged && onChanged()
  }, [password, note, load, onChanged, onLock, acting])

  const rows = page?.rows || []
  const c = page?.counts || {}

  return (
    <>
      <div className="ad-head">
        <h1>replies</h1>
        <span className="ad-head-note">
          held by the reading, or out of sight after three reports. nobody else sees these until you decide.
        </span>
        <div className="ad-head-acts">
          <Tabs value={status} onChange={setStatus} options={TABS} />
        </div>
      </div>

      {page && !page.error ? (
        <Ledger>
          <Figure n={c.waiting} of="waiting on you" live={!!c.waiting} />
          <Figure n={c.hidden} of="reported three times" />
          <Figure n={c.replies_7d} of="written this week" />
          <Figure n={c.removed} of="taken down" />
        </Ledger>
      ) : null}

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>{status === 'waiting' ? 'nothing is waiting on you.' : 'nothing here.'}</Empty>
      ) : (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>state</th>
                <th className="is-wide">the reply</th>
                <th className="is-mid">who wrote it</th>
                <th className="is-num">reports</th>
                <th>written</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row
                  key={r.id} r={r} go={go}
                  open={open === r.id} note={note} setNote={setNote} acting={acting}
                  onOpen={() => { setOpen(open === r.id ? null : r.id); setNote(''); setSaid('') }}
                  onUp={() => act(r.id, 'live')} onDown={() => act(r.id, 'removed')}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page ? <Paging total={page.total || 0} limit={LIMIT} offset={offset} onOffset={setOffset} /> : null}

      <Note>
        a reply is read before it goes up: the list, the rule that it names nobody else, and the
        classifier. a pass goes up, an unsure reading is held here, and a refusal is kept under
        refused. three reports from three devices put a reply out of sight until it is decided here.
        putting one back clears the reports that hid it. taking one down tells its writer, in the
        thread, that it went against the terms for replying.
      </Note>
    </>
  )
}

function Row({ r, go, open, note, setNote, acting, onOpen, onUp, onDown }) {
  const waiting = r.status === 'held' || r.status === 'hidden'
  const reasons = Array.isArray(r.moderation?.reasons) ? r.moderation.reasons : []
  const to = r.letter_kind === 'name' ? (r.letter_name || 'a name') : `@${r.letter_target}`
  const desk = r.moderation?.desk
  return (
    <>
      <tr className={open ? 'is-open' : ''}>
        <td><State tone={r.status === 'live' ? 'is-live' : waiting ? 'is-hold' : 'is-stop'}>{SAY[r.status] || r.status}</State></td>
        <td className="is-wide">
          <div className="ad-head-note ad-meta">
            under the letter to <span className="ad-id is-dim">{to}</span>
            {r.recipient ? <>, by the recipient</> : null}
            {r.thread_state && r.thread_state !== 'open' ? <>, the thread is {r.thread_state === 'locked' ? 'shut' : 'put away'}</> : null}
          </div>
          <p className="ad-body-text is-quote" style={{ margin: 0 }}>{r.body}</p>
          {reasons.length ? (
            <div className="ad-head-note ad-meta">the reading said {reasons.join(', ')}</div>
          ) : null}
        </td>
        <td className="is-mid">
          <p className="ad-body-text" style={{ margin: 0 }}>
            {r.author_edu || (r.author_handle ? `@${r.author_handle}` : <None>no address</None>)}
          </p>
          <div className="ad-head-note ad-meta">
            {r.author_handle && r.author_edu ? `@${r.author_handle} · ` : ''}
            {r.author_replies} {r.author_replies === 1 ? 'reply' : 'replies'}
            {r.author_down ? `, ${r.author_down} down` : ''}
          </div>
        </td>
        <td className="is-num">{r.reports || <None>0</None>}</td>
        <td><When at={r.created_at} /></td>
        <td className="is-act">
          <Btn onClick={onOpen} tone={waiting && !open ? 'key' : ''}>{open ? 'close' : waiting ? 'decide' : 'read'}</Btn>
        </td>
      </tr>
      {open ? (
        <tr className="ad-drawer">
          <td colSpan={6}>
            <div className="ad-drawer-in">
              <div>
                <div className="wl-label" style={{ marginBottom: 6 }}>the letter it answers</div>
                <p className="ad-body-text is-quote" style={{ margin: 0 }}>{r.letter_body}</p>
                <div className="ad-head-note" style={{ marginTop: 4 }}>
                  to {to}, and the letter is {r.letter_status}.{' '}
                  {r.author_id ? (
                    <button type="button" className="ad-id" onClick={() => go('people', r.author_handle || r.author_id)}>
                      open who wrote the reply
                    </button>
                  ) : null}
                </div>
              </div>

              {desk ? (
                <div>
                  <div className="wl-label" style={{ marginBottom: 6 }}>decided</div>
                  <p className="ad-body-text" style={{ margin: 0 }}>
                    {desk.status === 'live' ? 'put up' : 'taken down'}{desk.note ? `: ${desk.note}` : ''}
                  </p>
                  <div className="ad-head-note" style={{ marginTop: 4 }}><When at={desk.at} exact /></div>
                </div>
              ) : null}

              <div>
                <label className="wl-label" htmlFor={`rp-${r.id}`} style={{ marginBottom: 6 }}>
                  what you decided, and why
                </label>
                <textarea
                  id={`rp-${r.id}`} className="ad-note" value={note} maxLength={400}
                  onChange={(e) => setNote(e.target.value)} placeholder="optional. kept beside the decision"
                />
              </div>
              <div className="ad-btns" style={{ justifyContent: 'flex-start' }}>
                {r.status !== 'removed' ? (
                  <Arm armed="it comes down" busy={acting} onAct={onDown}>take it down</Arm>
                ) : null}
                {r.status !== 'live' ? (
                  <Arm tone="go" armed={r.status === 'hidden' ? 'put it back' : 'put it up'} busy={acting} onAct={onUp}>
                    {r.status === 'hidden' ? 'put it back up' : 'put it up'}
                  </Arm>
                ) : null}
              </div>
              <div className="ad-head-note">
                {r.status === 'hidden'
                  ? `${r.reports} ${r.reports === 1 ? 'device' : 'devices'} reported it. putting it back clears them.`
                  : r.status === 'held' ? 'its writer sees it, marked as being read, until you decide.'
                    : 'the writer is told in the thread if it comes down.'}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
