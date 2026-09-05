// ── the desk ────────────────────────────────────────────────────────────────
//
// What the desk opens on, and one call gets all of it. Three things, in the
// order somebody at a desk actually wants them:
//
//   1  what is waiting        the only rows that ask anything of a person
//   2  the numbers            twelve figures, and not the forty the tables
//                             behind them could produce
//   3  the graph              people over time, and what happened when
//
// Everything else the overview used to carry moved to the screen it is about:
// the caps to the resolver, the flyers to waiting, the campuses to settings. A
// first screen that opens on twenty numbers makes somebody find the one that
// needs them; this opens on the ones that do.
import { Ledger, Figure, State, When, Arm, Empty, Json, Note } from './parts.jsx'
import Growth from './Growth.jsx'

export default function Overview({ password, data, go, onConflictResolve, onLock }) {
  const c = data?.counts || {}
  const settings = data?.settings || {}
  const limits = data?.limits || []
  const conflicts = (data?.conflicts || []).filter((x) => !x.resolved_at)
  const campuses = data?.campuses || []
  const blocked = limits.filter((l) => l.blocked && l.key_type !== 'global')
  const ceiling = limits.some((l) => l.blocked && l.key_type === 'global')

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
    settings.resolver_enabled === false && {
      n: 'off',
      say: <>the <b>resolver</b> is switched off. no handle is looked up and nothing is spent</>,
      go: () => go('cache'), act: 'the resolver',
    },
    ceiling && {
      n: c.searches_24h,
      say: <>the day's <b>ceiling</b> on apify is spent. new handles draw nothing until calls age out</>,
      go: () => go('cache'), act: 'see who',
    },
    !ceiling && blocked.length && {
      n: blocked.length,
      say: <><b>{s(blocked.length, 'key is', 'keys are')}</b> at a cap. those lookups are refused until they age out</>,
      go: () => go('cache'), act: 'see who',
    },
  ].filter(Boolean)

  return (
    <>
      <div className="ad-head">
        <h1>the desk</h1>
        <span className="ad-head-note">
          {campuses.map((x) => `${x.name} wall ${x.is_open ? 'open' : 'closed'}`).join(' · ') || 'no campus yet'}
          {' · '}
          {settings.require_ig_verification ? 'the release gate is on' : 'the release gate is off'}
        </span>
      </div>

      {/* ── what is waiting ──
          First, and a few lines at most. A console that opens on twenty
          numbers makes somebody find the one that needs them; this opens on
          the ones that do, and says so plainly when none do. */}
      {waiting.length ? (
        <div className="ad-waiting">
          {waiting.map((w, i) =>
            w.go ? (
              <button type="button" key={i} className="ad-wait" onClick={w.go}>
                <span className="ad-wait-n">{typeof w.n === 'number' ? w.n.toLocaleString() : w.n}</span>
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

      {/* ── the numbers ──
          Twelve. The tables behind them hold forty, and every one of the
          forty is one screen away, on the screen it is about. */}
      <Ledger label="people">
        <Figure n={c.users} of="people" />
        <Figure n={c.handle_verified} of="proved a handle" />
        <Figure n={c.edu_verified} of="proved a campus" />
        <Figure n={c.users_7d} of="new this week" live={!!c.users_7d} />
      </Ledger>
      <Ledger label="pings">
        <Figure n={c.pings_standing} of="standing now" />
        <Figure n={c.pairs} of="mutual pairs" live={!!c.pairs} />
        <Figure n={c.pings_7d} of="placed this week" />
        <Figure n={c.pings_lapsing_7d} of="lapse within a week" />
      </Ledger>
      <Ledger label="the wall and the resolver">
        <Figure n={c.letters_live} of="letters live" />
        <Figure n={c.letters_7d} of="written this week" />
        <Figure n={c.searches_24h} of={`apify calls today, of ${(settings.cap_global || 1000).toLocaleString()}`} live={ceiling} />
        <Figure n={c.profiles} of="faces cached" />
      </Ledger>

      {/* ── the graph ── */}
      <div className="ad-head is-sub">
        <h2>over time</h2>
        <span className="ad-head-note">point at it for the numbers on a day. the legend hides a line.</span>
      </div>
      <Growth password={password} onLock={onLock} />

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
              nothing was moved. closing one records that you looked, and does not merge them.
            </span>
          </div>
          <Note>
            two rows both proved something one person cannot have twice: two different handles, or two
            different campuses. open both on the people screen, decide which is the person, and close
            the question here.
          </Note>
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
                      <button type="button" className="ad-uuid" onClick={() => go('people', x.a_id)}>{x.a_id}</button>
                      <br />
                      <button type="button" className="ad-uuid" onClick={() => go('people', x.b_id)}>{x.b_id}</button>
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
    </>
  )
}
