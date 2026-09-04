// ── the overview ────────────────────────────────────────────────────────────
//
// What the desk opens on, and one call gets all of it. Four things, in the
// order somebody at a desk actually wants them:
//
//   1  what is waiting        the only rows that ask anything of a person
//   2  the shape of it        counts, as a ledger rather than as tiles
//   3  the caps               spec section 5's three counters, per key
//   4  which flyer            scan attribution, which is the cheapest question
//                             in the campaign and the only one that cannot be
//                             answered later
import { Ledger, Figure, State, When, Arm, Empty, Json } from './parts.jsx'

export default function Overview({ data, go, onConflictResolve }) {
  const c = data?.counts || {}
  const limits = data?.limits || []
  const conflicts = (data?.conflicts || []).filter((x) => !x.resolved_at)
  const scans = data?.scans || []
  const campuses = data?.campuses || []
  const blocked = limits.filter((l) => l.blocked)

  const s = (n, one, many) => (n === 1 ? one : many)
  const waiting = [
    c.letters_pending && {
      n: c.letters_pending,
      say: <><b>{s(c.letters_pending, 'letter', 'letters')}</b> held, waiting to be read</>,
      go: () => go('wall', 'pending'), act: 'read them',
    },
    c.reports_open && {
      n: c.reports_open,
      say: <><b>{s(c.reports_open, 'report', 'reports')}</b> filed, and the {s(c.reports_open, 'letter is', 'letters are')} already down</>,
      go: () => go('reports'), act: 'decide',
    },
    conflicts.length && {
      n: conflicts.length,
      say: <><b>{s(conflicts.length, 'merge', 'merges')}</b> stopped and asked. nothing was moved</>,
    },
    blocked.length && {
      n: blocked.length,
      say: <><b>{s(blocked.length, 'cap', 'caps')}</b> spent. those lookups are refused until they age out</>,
    },
  ].filter(Boolean)

  return (
    <>
      <div className="ad-head">
        <h1>the desk</h1>
        <span className="ad-head-note">
          {campuses.map((x) => `${x.name}, ${x.is_open ? 'open' : 'closed'}`).join(' · ') || 'no campus yet'}
        </span>
      </div>

      {/* ── what is waiting ──
          First, and four lines at most. A console that opens on twenty numbers
          makes somebody find the one that needs them; this opens on the ones
          that do, and says so plainly when none do. */}
      {waiting.length ? (
        <div className="ad-waiting">
          {waiting.map((w, i) =>
            w.go ? (
              <button type="button" key={i} className="ad-wait" onClick={w.go}>
                <span className="ad-wait-n">{w.n}</span>
                <span className="ad-wait-t">{w.say}</span>
                <span className="ad-wait-go">{w.act}</span>
              </button>
            ) : (
              <div key={i} className="ad-wait">
                <span className="ad-wait-n">{w.n}</span>
                <span className="ad-wait-t">{w.say}</span>
              </div>
            ),
          )}
        </div>
      ) : (
        <Empty>nothing is waiting on anybody.</Empty>
      )}

      <Ledger label="people">
        <Figure n={c.users} of="rows" />
        <Figure n={c.handle_verified} of="verified handles" />
        <Figure n={c.edu_verified} of="campus addresses" />
        <Figure n={c.with_email} of="carrying an email" />
        <Figure n={c.sessions_live} of="sessions live" />
        <Figure n={c.users_7d} of="new this week" />
        <Figure n={c.merged} of="merged away" />
        <Figure n={c.conflicts_open} of="merges that stopped" live={!!c.conflicts_open} />
      </Ledger>

      <Ledger label="the wall">
        <Figure n={c.letters_live} of="letters live" />
        <Figure n={c.letters_pending} of="held" live={!!c.letters_pending} />
        <Figure n={c.letters_rejected} of="rejected" />
        <Figure n={c.letters_removed} of="taken down" />
        <Figure n={c.letters_7d} of="written this week" />
        <Figure n={c.claims} of="claims" />
        <Figure n={c.asks_open} of="asks unanswered" />
        <Figure n={c.revealed} of="revealed" />
        <Figure n={c.waitlist} of="waiting for a name" />
        <Figure n={c.scans} of="scans" />
        <Figure n={c.reports_open} of="reports open" live={!!c.reports_open} />
        <Figure n={c.reports} of="reports ever" />
      </Ledger>

      <Ledger label="resolution">
        <Figure n={c.profiles} of="profiles cached" />
        <Figure n={c.profiles_faced} of="with a face" />
        <Figure n={c.profiles_stale} of="faces past thirty days" />
        <Figure n={c.searches_24h} of="apify calls today" />
      </Ledger>

      {/* ── the caps ──
          Spec section 5. Cache hits never appear here, because only a call that
          actually reached Apify writes a row, which is what keeps the number on
          this screen the same number as the bill. */}
      <div className="ad-head is-sub">
        <h2>the caps</h2>
        <span className="ad-head-note">
          rolling twenty four hours. only calls that reached apify are counted.
        </span>
      </div>
      {limits.length ? (
        <div className="ad-scroll">
          <table className="ad-table">
            <thead>
              <tr>
                <th>key</th><th className="is-wide">value</th>
                <th className="is-num">spent</th><th className="is-num">cap</th>
                <th className="is-num">left</th><th>first</th><th>last</th>
              </tr>
            </thead>
            <tbody>
              {limits.slice(0, 40).map((l) => (
                <tr key={`${l.key_type}:${l.key_value}`}>
                  <td><State tone={l.blocked ? 'is-stop' : 'is-live'}>{l.key_type}</State></td>
                  <td className="is-wide"><span className="ad-id">{l.key_value}</span></td>
                  <td className="is-num is-key">{l.spent}</td>
                  <td className="is-num">{l.cap}</td>
                  <td className="is-num">{l.remaining}</td>
                  <td><When at={l.oldest} /></td>
                  <td><When at={l.newest} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>nobody has spent a lookup today.</Empty>
      )}

      {/* ── the stop and ask ──
          0030 refuses a merge that would join two verified handles or two
          campuses, writes the pair here and changes nothing. Closing one records
          that a person looked. There is deliberately no button that performs
          the merge: the spec says stop and ask, and a one click override is not
          asking. */}
      {conflicts.length ? (
        <>
          <div className="ad-head is-sub">
            <h2>merges that stopped</h2>
            <span className="ad-head-note">
              nothing was moved. resolving one records that you looked, and does not merge them.
            </span>
          </div>
          <div className="ad-scroll">
            <table className="ad-table">
              <thead>
                <tr><th>kind</th><th className="is-wide">the two rows</th><th>filed</th><th /></tr>
              </thead>
              <tbody>
                {conflicts.map((x) => (
                  <tr key={x.id}>
                    <td><State>{x.kind}</State></td>
                    <td className="is-wide">
                      <div className="ad-uuid">{x.a_id}</div>
                      <div className="ad-uuid">{x.b_id}</div>
                      <Json value={x.detail} />
                    </td>
                    <td><When at={x.created_at} /></td>
                    <td className="is-act">
                      <Arm tone="go" armed="yes, close it" onAct={() => onConflictResolve(x.id, 'looked at from the desk')}>looked at it</Arm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {scans.length ? (
        <>
          <div className="ad-head is-sub">
            <h2>which flyer</h2>
            <span className="ad-head-note">
              the cheapest question in the campaign, and the only one that cannot be answered later.
            </span>
          </div>
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
        </>
      ) : null}
    </>
  )
}
