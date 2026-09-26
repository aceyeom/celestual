// ── the wall ────────────────────────────────────────────────────────────────
//
// Spec section 10's "moderation queue and rejection reasons" and "wall
// submissions", which are one table read two ways.
//
// ── WHY FLAGGED COMES FIRST ─────────────────────────────────────────────────
// Since migration 0050 a letter the classifier is unsure of goes up at once,
// flagged, and a person reads it while it stands. Layer 3 is that person, and
// this screen is where they sit. Anything the classifier returned 'review'
// for is in the flagged queue until somebody decides about it, so the tab
// that opens is the one with work in it rather than the one with the most
// rows in it. "looks fine" is a decision too: it leaves the letter exactly
// where it is and takes it out of the queue.
//
// It used to open on `held`: letters written at pending that rendered nowhere
// until a person moved them. Since 25 September (docs/ONE-WALL.md) things
// land there on their own again: a name-only note always goes through the
// classifier, and one it sends to review, or one written while no classifier
// is configured, waits off the wall for this desk. So the tab says what it
// is, "held", each row says why it is waiting, and the two answers are on the
// row itself: approve puts it on the wall, reject keeps it off.
//
// ── ONE SET OF WORDS ────────────────────────────────────────────────────────
// This screen and the replies' (Replies.jsx) sit side by side on the rail and
// name the same states, so they name them the same way: live, held, down,
// rejected. The tab said "waiting for review" and the replies said "held" for
// the same thing, off the wall until a person decides, and the overview and
// the guide had always said held. And whatever read the words is "the
// reading" on both, where this one said "the screen" and "the classifier",
// with its reasons in words rather than the codes it returns (`reasonWords`).
//
// ── AND WHY THE REJECTED ONES ARE HERE AT ALL ───────────────────────────────
// Spec section 9: rejected content is stored with a rejection reason so it
// appears in admin, not silently dropped. Being unable to read what the screen
// caught is being unable to tell whether the screen works, and a screen nobody
// can check is a screen that quietly starts refusing everything.
import { useCallback, useEffect, useRef, useState } from 'react'
import { deskLetters, deskLetterSet } from '../api/admin.js'
import { Search, useDebounced, Tabs, Paging, Empty, Fault, When, State, Btn, Arm, Json, clampOffset, failWord } from './parts.jsx'

const LIMIT = 50
const TABS = [
  { value: 'flagged', label: 'flagged' },
  { value: 'pending', label: 'held' },
  { value: 'live', label: 'live' },
  { value: 'rejected', label: 'rejected' },
  { value: 'removed', label: 'down' },
  { value: '', label: 'all' },
]

// the word the state column draws for each, the replies' words too
export const STATE_WORDS = { live: 'live', pending: 'held', held: 'held', removed: 'down', rejected: 'rejected' }

// What the reading's own reason words mean, for the ones that are about the
// reading rather than about the words it read.
const REASON_WORDS = {
  unconfigured: 'no reading is set up, so everything it would read waits here',
  classifier_timeout: 'the reading did not answer in time',
  classifier_error: 'the reading failed',
  classifier_refused: 'the reading would not read it',
  unparsed: 'the reading answered in a way that could not be understood',
  unreachable: 'the reading could not be reached',
}
// And the ones about the words: the reading's categories (celestual-wall-
// moderate, celestual-wall-reply) and the list's (layer 1, and the replies'
// rule that a reply names nobody else), in the desk's words, so nobody has
// to know what `locate` or `pile` stands for before deciding.
const WHY_WORDS = {
  threat: 'a threat',
  locate: 'says where someone can be found',
  sexual: 'sexual about a person',
  minor: 'about someone under 18',
  expose: 'shares something private about a person',
  hate: 'hateful about a group',
  contact: 'contact details',
  third: 'names someone else',
  pile: 'piling on the person it is to',
  slur: 'a slur',
  url: 'a link',
  email: 'an email address',
  phone: 'a phone number',
  address: 'a street address',
  room: 'a room number',
  tag: 'tags someone',
  name: 'someone’s full name',
}
export function reasonWords(rs) {
  return (rs || []).map((r) => {
    const k = String(r)
    if (REASON_WORDS[k]) return REASON_WORDS[k]
    if (WHY_WORDS[k]) return WHY_WORDS[k]
    if (k.startsWith('lex:')) return `the word list caught "${k.slice(4)}"`
    return k
  })
}

// Why a letter is waiting, in one line: the desk's own hold, or the
// reading's verdict and its reasons, or whatever reason the row carries.
function heldWhy(l) {
  const m = l.moderation && typeof l.moderation === 'object' ? l.moderation : {}
  const desk = m.desk && typeof m.desk === 'object' ? m.desk : null
  if (desk && desk.status === 'pending') return `held back by hand${desk.note ? `: ${desk.note}` : ''}`
  const said = reasonWords(m.reasons)
  // no classifier ran, or it failed: that is the reason, and nothing asked
  const system = (m.reasons || []).some((r) => REASON_WORDS[String(r)])
  if (system) return said.join(', ')
  if (m.verdict === 'review') return said.length ? `the reading asked for a person: ${said.join(', ')}` : 'the reading asked for a person'
  if (m.verdict === 'reject') return said.length ? `the reading said no: ${said.join(', ')}` : 'the reading said no'
  if (m.reason) return String(m.reason)
  if (said.length) return said.join(', ')
  return 'no reason was recorded'
}

export default function Letters({ password, initialStatus = 'flagged', onChanged, onLock }) {
  const [status, setStatus] = useState(initialStatus)
  const [query, setQuery] = useState('')
  const q = useDebounced(query)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState(null)
  const [busy, setBusy] = useState(true)
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')
  const [said, setSaid] = useState('')
  const [acting, setActing] = useState(false)
  // The latest request wins. A filter change and a page reset land in the
  // same commit and fire two loads; whichever answered last used to draw.
  const seq = useRef(0)

  useEffect(() => { setOffset(0) }, [q, status])

  const load = useCallback(async () => {
    const mine = ++seq.current
    setBusy(true)
    const r = await deskLetters(password, { status, query: q, limit: LIMIT, offset })
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
  }, [password, status, q, offset, onLock])

  useEffect(() => { load() }, [load])

  // The answer is read. It used to be dropped, so a failed write closed the
  // drawer, wiped the note and reloaded an unchanged list, which is what
  // "done" looks like.
  const decide = useCallback(async (id, to) => {
    if (acting) return
    setActing(true)
    setSaid('')
    const r = await deskLetterSet(password, id, to, note)
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

  return (
    <>
      <div className="ad-head">
        <h1>the wall</h1>
        <span className="ad-head-note">
          {status === 'pending'
            ? 'these are off the wall until you decide. approve puts one on the wall. reject keeps it off.'
            : 'a flagged letter is on the wall while it waits for you. looks fine keeps it there. take it down takes it off.'}
        </span>
        <div className="ad-head-acts">
          <Tabs value={status} onChange={setStatus} options={TABS} />
          <Search value={query} onChange={setQuery} placeholder="a name or a word" />
        </div>
      </div>

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

      {busy && !page ? <Empty>reading</Empty> : page?.error ? <Fault error={page.error} /> : rows.length === 0 ? (
        <Empty>
          {status === 'flagged' ? 'nothing is waiting to be read.'
            : status === 'pending' ? 'nothing is held.'
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
                  onOpen={() => { setOpen(open === l.id ? null : l.id); setNote(''); setSaid('') }}
                  onDecide={decide}
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

function LetterRow({ l, open, note, setNote, onOpen, onDecide, acting }) {
  const reasons = l.moderation?.reasons || []
  // waiting for a person, and nothing else deciding it: a report still open
  // on it is decided on the reports page
  const waiting = l.status === 'pending' && !l.reports_open
  const named = l.target_kind === 'name'
  return (
    <>
      <tr className={open ? 'is-open' : ''}>
        <td><State tone={waiting ? 'is-hold' : undefined}>{l.flagged ? 'flagged' : STATE_WORDS[l.status] || l.status}</State></td>
        {/* a first name (0053) prints as written, with no @; the paper the
            letter chose (0055) stands under it, as its slugs */}
        <td>
          <span className="ad-id">{named ? (l.target_name || String(l.target_handle).slice(1)) : `@${l.target_handle}`}</span>
          <div className="ad-id is-dim">{named ? 'a name note' : 'an @ note'}</div>
          {l.look && typeof l.look === 'object' ? (
            <div className="ad-id is-dim">{['theme', 'tint', 'face'].map((k) => l.look[k]).filter(Boolean).join(' · ')}</div>
          ) : null}
        </td>
        <td className="is-wide">
          <p className="ad-body-text is-quote" style={{ margin: 0 }}>{l.body}</p>
          {waiting ? (
            <div className="ad-head-note ad-meta">why it is waiting: {heldWhy(l)}</div>
          ) : reasons.length ? (
            <div className="ad-head-note ad-meta">the reading said: {reasonWords(reasons).join(', ')}</div>
          ) : null}
        </td>
        <td>
          {l.author_handle
            ? <span className="ad-id is-dim">@{l.author_handle}</span>
            : <span className="ad-id is-dim">{l.author_campus || 'unknown'}</span>}
        </td>
        <td className="is-num">{l.reports_open ? <span style={{ color: 'var(--ad-stop)' }}>{l.reports}</span> : l.reports || ''}</td>
        <td><When at={l.created_at} /></td>
        <td className="is-act">
          {waiting && !open ? (
            <div className="ad-btns">
              <Arm tone="go" armed="approve it" busy={acting} onAct={() => onDecide(l.id, 'live')}>approve</Arm>
              <Arm armed="reject it" busy={acting} onAct={() => onDecide(l.id, 'rejected')}>reject</Arm>
              <Btn onClick={onOpen}>more</Btn>
            </div>
          ) : (
            <Btn onClick={onOpen}>{open ? 'close' : 'decide'}</Btn>
          )}
        </td>
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
                  why, in your words. it is kept beside what the reading said.
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

              {l.reports_open ? (
                <div className="ad-head-note" style={{ color: 'var(--ad-stop)' }}>
                  a report on this one is still open. decide it on the reports page: putting
                  the letter up from here and upholding the report there would be two
                  answers to one question.
                </div>
              ) : null}

              <div className="ad-btns" style={{ justifyContent: 'flex-start' }}>
                {/* A flagged letter is already up: the decision that keeps it
                    is a decision, and it is what takes it out of the queue. */}
                {l.flagged && !l.reports_open ? (
                  <Arm tone="go" armed="keep it up" busy={acting} onAct={() => onDecide(l.id, 'live')}>
                    looks fine
                  </Arm>
                ) : null}
                {l.status !== 'live' && !l.reports_open ? (
                  <Arm tone="go" armed={waiting ? 'approve it' : 'publish it'} busy={acting} onAct={() => onDecide(l.id, 'live')}>
                    {waiting ? 'approve' : 'put it on the wall'}
                  </Arm>
                ) : null}
                {l.status !== 'removed' ? (
                  <Arm armed="take it down" busy={acting} onAct={() => onDecide(l.id, 'removed')}>
                    take it down
                  </Arm>
                ) : null}
                {l.status !== 'rejected' ? (
                  <Arm armed="reject it" busy={acting} onAct={() => onDecide(l.id, 'rejected')}>
                    {waiting ? 'reject' : 'reject it'}
                  </Arm>
                ) : null}
                {l.status !== 'pending' ? (
                  /* Armed like the others: it takes a live letter off the wall on the
                     press, and used to do that on one click. */
                  <Arm tone="quiet" armed="hold it back" busy={acting} onAct={() => onDecide(l.id, 'pending')}>
                    hold it back
                  </Arm>
                ) : null}
              </div>

              <div className="ad-head-note">
                taking a letter down from here does not shut the name: only the subject's own
                takedown, or a report upheld on the reports page, refuses new letters to it.
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
