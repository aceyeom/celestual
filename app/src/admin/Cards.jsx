// ── the cards ───────────────────────────────────────────────────────────────
//
// Five printed cards went out with a QR each, and this is where they are read
// against each other. Migration 0047 built the half of it that is data; this is
// the half that answers the question the cards were printed to ask.
//
// ── WHAT "BEST" MEANS HERE, AND WHY IT IS NOT SCANS ─────────────────────────
// Scans measure the wall the card is taped to. They say how many people walked
// past it with a phone, which is a fact about a corridor and not about the
// card. The number that decides a reprint is `joined`: proofs that landed, out
// of scans. Everything between the two is on the way there, and the shape of
// the fall between the columns is where a card actually loses somebody.
//
// The order is the database's (celestual_desk_cards), not this screen's, so
// that the answer to "which card won" is the same here, in a SQL console, and
// in a screenshot of either.
//
// ── AND WHAT NOT TO READ INTO IT ────────────────────────────────────────────
// Four of the seven columns are reported by the browser: read, asked, joined,
// gone on. They are attribution, in the same class as the scan, and a person
// with a console could report a hundred of any of them. Letters and waiting are
// rows in the database that a person had to write or search to produce, and
// those are the two columns that cannot be inflated. The note under the table
// says so, because a number on a screen with no caveat beside it becomes a
// number somebody quotes.
import { useCallback, useEffect, useState } from 'react'
import { deskCards, deskCardSet } from '../api/admin.js'
import { link as cardLink } from '../cards.js'
import {
  Empty, Fault, When, None, Note, Btn, CopyBtn, Field, Toggle, State,
  Figure, Ledger, failWord,
} from './parts.jsx'

// joined out of scanned, as a whole number of percent. A card nobody has
// scanned has no rate, and drawing 0% against it would be an answer to a
// question nobody has asked yet.
function rate(n, of) {
  if (!of) return null
  return Math.round((n / of) * 100)
}

function Rate({ n, of }) {
  const r = rate(n, of)
  if (r === null) return <None>nothing yet</None>
  return (
    <span className="ad-rate">
      <span className="ad-rate-bar"><span className="ad-rate-fill" style={{ width: `${Math.min(100, r)}%` }} /></span>
      <span className="ad-rate-n">{r}%</span>
    </span>
  )
}

export default function Cards({ password, onLock }) {
  const [data, setData] = useState(null)
  const [edit, setEdit] = useState({})     // code -> { label, place }
  const [saving, setSaving] = useState('')
  const [said, setSaid] = useState('')

  const load = useCallback(async () => {
    const r = await deskCards(password)
    if (r?.error === 'password') { onLock && onLock(); return }
    if (r && r.ok) {
      setData(r)
      // The fields are seeded from the answer once per read, so a name typed
      // and not saved survives a refresh of the numbers beside it.
      setEdit((was) => {
        const next = { ...was }
        for (const c of r.rows) if (!next[c.code]) next[c.code] = { label: c.label || '', place: c.place || '' }
        return next
      })
      return
    }
    setData({ rows: [], error: r?.error || 'network' })
  }, [password, onLock])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (code, fields) => {
    if (saving) return
    setSaving(code)
    setSaid('')
    const r = await deskCardSet(password, code, fields)
    setSaving('')
    if (!r?.ok) {
      setSaid(r?.error === 'not_found' ? 'that card is not in the registry' : failWord(r))
      if (r?.error === 'password') onLock && onLock()
      return
    }
    await load()
  }, [password, saving, load, onLock])

  const rows = data?.rows || []
  const totals = data?.totals || {}

  return (
    <>
      <div className="ad-head">
        <h1>cards</h1>
        <span className="ad-head-note">five printed cards, and how far each one carried somebody.</span>
      </div>

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

      {!data ? <Empty>reading</Empty> : data.error ? <Fault error={data.error} /> : (
        <>
          <Ledger label="all five together">
            <Figure n={totals.scans || 0} of="scans" />
            <Figure n={totals.joined || 0} of="joined" live />
            <Figure n={totals.letters || 0} of="letters" />
            <Figure n={totals.other_scans || 0} of="scans off other paper" />
          </Ledger>

          {/* ── the funnel ──
              One row per card, best first, the order the database chose. */}
          <div className="ad-head is-sub">
            <h2>what each one brought</h2>
            <span className="ad-head-note">best first. joined is a proof that landed: a campus address, or a handle through the DM.</span>
          </div>
          <div className="ad-scroll">
            <table className="ad-table">
              <thead>
                <tr>
                  <th className="is-wide">card</th>
                  <th className="is-num">scanned</th>
                  <th className="is-num">read one</th>
                  <th className="is-num">asked</th>
                  <th className="is-num">joined</th>
                  <th className="is-num">wrote</th>
                  <th className="is-num">waiting</th>
                  <th className="is-num">gone on</th>
                  <th>onboarding</th>
                  <th>last scan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.code}>
                    <td className="is-wide">
                      <span className="ad-id">{c.label}</span>{' '}
                      <span className="ad-id is-dim">{c.code}</span>
                      {c.place ? <div className="ad-sub">{c.place}</div> : null}
                      {!c.is_active ? <div className="ad-sub"><State tone="is-off">out of circulation</State></div> : null}
                    </td>
                    <td className="is-num is-key">{c.scans}</td>
                    <td className="is-num">{c.read}</td>
                    <td className="is-num">{c.gate}</td>
                    <td className="is-num">{c.joined ? <span style={{ color: 'var(--accent)' }}>{c.joined}</span> : '0'}</td>
                    <td className="is-num">{c.letters}{c.letters ? <span className="ad-id is-dim"> {c.letters_live} live</span> : null}</td>
                    <td className="is-num">{c.waiting}</td>
                    <td className="is-num">{c.handoff}</td>
                    <td><Rate n={c.joined} of={c.scans} /></td>
                    <td>{c.last_at ? <When at={c.last_at} /> : <None>never</None>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note>
            scanned is the code being opened. read one, asked, joined and gone on are reported once per
            phone, by the phone, so they are attribution and not accounting. wrote and waiting are rows
            somebody had to write or search to produce, and those two are the ones that cannot be inflated.
          </Note>

          {/* ── the paper ──
              What is printed, and the two things about a card the database
              cannot know. The link is built from the site's own address rather
              than from wherever the desk happens to be open, so a card printed
              off a preview deployment cannot happen. */}
          <div className="ad-head is-sub">
            <h2>what is in the QR</h2>
            <span className="ad-head-note">one address per card. change where a card lands in src/cards.js, and the paper stays good.</span>
          </div>
          <div className="ad-cards">
            {rows.map((c) => {
              const e = edit[c.code] || { label: '', place: '' }
              const dirty = e.label !== (c.label || '') || e.place !== (c.place || '')
              return (
                <div className="ad-card" key={c.code}>
                  <div className="ad-link-url">{cardLink(c.code)}</div>
                  <div className="ad-card-acts">
                    <CopyBtn text={cardLink(c.code)}>copy the link</CopyBtn>
                    <span className="ad-id is-dim">lands on {c.landing}</span>
                  </div>
                  <div className="ad-form">
                    <Field
                      label="what it says" id={`card-l-${c.code}`} mono={false} value={e.label}
                      onChange={(v) => setEdit((w) => ({ ...w, [c.code]: { ...w[c.code], label: v } }))}
                    />
                    <Field
                      label="where it is" id={`card-p-${c.code}`} mono={false} value={e.place}
                      hint="a corner, a table, a building. left empty, nowhere in particular"
                      onChange={(v) => setEdit((w) => ({ ...w, [c.code]: { ...w[c.code], place: v } }))}
                    />
                    <Btn
                      tone="key" disabled={!dirty || !e.label || saving === c.code}
                      onClick={() => save(c.code, { label: e.label, place: e.place })}
                    >
                      {saving === c.code ? 'saving' : 'save'}
                    </Btn>
                    <Toggle
                      on={c.is_active}
                      busy={saving === c.code}
                      onChange={(v) => save(c.code, { active: v })}
                      words={['out there', 'out of circulation']}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <Note>
            taking a card out of circulation changes nothing about the address: a code that is already
            printed goes on working, and goes on counting. it is a note to the desk that this one is no
            longer being handed out, so a row that stops moving is not read as a card that stopped working.
          </Note>
        </>
      )}
    </>
  )
}
