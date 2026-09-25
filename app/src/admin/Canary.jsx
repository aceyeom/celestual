// ── the daily check ─────────────────────────────────────────────────────────
//
// Migration 0060. Once a day the resolver asks apify about one account that
// always exists, straight past the cache, and writes down what came back. A
// provider failure draws nothing on the wall, on purpose, so without this an
// outage is a quiet day: a token that stopped working, an account out of
// credit, an actor whose answer changed shape. Two things here read the
// record, off the overview every screen already has:
//
//   CanaryAlarm   a line at the top of every screen of the desk. Red while
//                 the last check failed, amber while none has run for a day
//                 and a half, or ever. Nothing while it passes: the desk does
//                 not spend a line on things being fine
//   CanaryPanel   the resolver screen's record of it: the last check, the
//                 ones before, and the same button
//
// Both say what apify said, in its own words, and what that means for a
// person on the wall, and neither guesses at a cause it was not told. The
// button spends one call, so it arms before it fires, like "resolve again".
import { useState } from 'react'
import { deskCanaryRun } from '../api/admin.js'
import { Arm, Btn, State, When, None, Note, ago } from './parts.jsx'

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const count = (n) => COUNT[n] || String(n)

// How long ago, as a sentence says it: the desk's own shorthand, with "ago".
function since(iso) {
  const a = ago(iso)
  return !a ? '' : a === 'just now' ? 'just now' : `${a} ago`
}

// What one check came back with, in a line. Apify's own words stand in it
// as it sent them, in quotes: they are the diagnosis, and a paraphrase of a
// refusal is a guess about it.
export function why(run) {
  if (!run) return ''
  const d = run.detail || {}
  const h = `@${run.handle || 'instagram'}`
  const quoted = d.said ? `: "${d.said}"` : ''
  switch (run.status) {
    case 'ok':
      return `apify answered for ${h} with the name, the picture${d.verified ? ' and the badge' : ''}`
    case 'refused':
      return run.http_status
        ? `apify turned the call away with a ${run.http_status}${quoted}`
        : `the call never reached apify${quoted}`
    case 'timeout':
      return run.attempts > 1
        ? 'apify did not answer inside thirty seconds, twice'
        : 'apify did not answer inside thirty seconds'
    case 'missing':
      return `apify said ${h} does not exist, so what the actor answers has changed`
    case 'unclear':
      return `apify could not see into ${h}${quoted}`
    case 'shape':
      if (d.answered_as) return `apify answered for @${d.answered_as} when it was asked for ${h}`
      if (Array.isArray(d.missing) && d.missing.length) {
        return `apify answered without ${d.missing.join(' or ')}, so what the actor answers has changed`
      }
      return `apify answered with nothing in it${d.said ? `: ${d.said}` : ''}`
    case 'off':
      return 'the resolver has no apify token set'
    case 'error':
      return d.said === 'the check did not finish' ? 'the check did not finish' : `the check stopped${quoted}`
    case 'running':
      return 'asking apify now'
    default:
      return ''
  }
}

// The same, cut down for a row of the table, where the answer column has
// already said which of these it was. The whole line rides on the cell's
// title.
function brief(run) {
  const d = run?.detail || {}
  switch (run?.status) {
    case 'ok': return `${d.display_name || `@${run.handle}`}${d.verified ? ', verified' : ''}`
    case 'refused': return [run.http_status, d.said].filter(Boolean).join(', ') || 'it did not connect'
    case 'timeout': return run.attempts > 1 ? 'thirty seconds, twice' : 'thirty seconds'
    case 'missing': return `@${run.handle} does not exist, it said`
    case 'unclear': return d.said || 'it could not see in'
    case 'shape':
      if (d.answered_as) return `answered for @${d.answered_as}`
      if (Array.isArray(d.missing) && d.missing.length) return `without ${d.missing.join(' or ')}`
      return d.said || 'nothing in it'
    case 'off': return 'no apify token set'
    case 'error': return d.said || 'it stopped'
    default: return ''
  }
}

// A run's answer as a word, and the tint it wears.
const ANSWER = {
  ok: ['answered', 'is-live'],
  refused: ['refused', 'is-stop'],
  timeout: ['no answer', 'is-stop'],
  missing: ['missing', 'is-stop'],
  unclear: ['unclear', 'is-stop'],
  shape: ['changed', 'is-stop'],
  off: ['no token', 'is-stop'],
  error: ['stopped', 'is-stop'],
  running: ['asking', 'is-hold'],
}
function Answer({ run }) {
  const [word, tone] = ANSWER[run?.status] || ['unknown', 'is-off']
  return <State tone={tone}>{word}</State>
}

const seconds = (ms) => (ms === null || ms === undefined ? '' : (ms / 1000).toFixed(1))

// ── the button, shared ──
// One check at a time, on the server as well as here: a second press while
// one is out, or within a minute of the last, is refused there and said so.
function useRun({ password, onLock, onRan }) {
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const run = async () => {
    if (busy) return
    setBusy(true)
    setSaid('')
    const r = await deskCanaryRun(password)
    setBusy(false)
    if (r?.error === 'password') { onLock && onLock(); return }
    if (!r?.ok) {
      setSaid(
        r?.error === 'running' ? 'a check is already out. read it again in a minute'
          : r?.error === 'too_soon' ? 'a check ran less than a minute ago'
            : r?.error === 'bad_input' ? 'the resolver does not know the check yet. it needs deploying'
              : r?.error === 'network' ? 'no answer yet. read it again in a minute'
                : 'the check could not be run. the migrations may be behind',
      )
    }
    onRan && onRan()
  }
  return { busy, said, run }
}

function RunButton({ busy, running, onAct }) {
  return (
    <Arm tone="quiet" armed="spend a call" busy={busy || running} onAct={onAct}
      title="asks apify about the account now, past the cache. one call">
      {busy || running ? 'checking' : 'check it now'}
    </Arm>
  )
}

// ── the line at the top ─────────────────────────────────────────────────────
export function CanaryAlarm({ canary, password, onLock, onRan, go, here }) {
  const { busy, said, run } = useRun({ password, onLock, onRan })
  const state = canary?.state
  if (state !== 'failing' && state !== 'stale' && state !== 'never') return null
  const last = canary.last
  const fails = Number(canary.fails) || 0
  const red = state === 'failing'

  const head = state === 'failing'
    ? (fails > 1
      ? `the daily check on apify has failed ${count(fails)} times in a row, the last ${since(last?.ran_at)}.`
      : `the daily check on apify failed ${since(last?.ran_at)}.`)
    : state === 'stale'
      ? `the daily check on apify last ran ${since(last?.ran_at)}, and it runs once a day.`
      : 'the daily check on apify has not run yet.'
  const lines = state === 'failing'
    ? [`${why(last)}.`, 'until it answers, a handle that is not in the cache draws no card.']
    : state === 'stale'
      ? ['the hourly job that asks for it, or the resolver that runs it, has stopped.']
      : ['the first runs within the hour once the new resolver is deployed, or it can be checked from here.']

  return (
    <section
      className={`ad-alarm${red ? '' : ' is-hold'}`}
      role={red ? 'alert' : 'status'}
      aria-labelledby="ad-alarm-t"
    >
      <span className="ad-alarm-k"><State tone={red ? 'is-stop' : 'is-hold'}>apify</State></span>
      <div className="ad-alarm-body">
        <p className="ad-alarm-t" id="ad-alarm-t">{head}</p>
        {busy
          ? <p className="ad-alarm-why">asking apify. it can take a minute.</p>
          : lines.map((l) => <p className="ad-alarm-why" key={l}>{l}</p>)}
        {said ? <p className="ad-alarm-why is-said" role="status">{said}</p> : null}
      </div>
      {/* on the resolver screen its record stands under the heading with
          the same button, so the line only says what is wrong */}
      {here === 'cache' ? null : (
        <div className="ad-alarm-acts">
          <RunButton busy={busy} running={!!canary.running} onAct={run} />
          <Btn onClick={() => go('cache')}>the resolver</Btn>
        </div>
      )}
    </section>
  )
}

// ── the record, on the resolver screen ──────────────────────────────────────
export function CanaryPanel({ canary, password, onLock, onRan }) {
  const { busy, said, run } = useRun({ password, onLock, onRan })
  const last = canary?.last || null
  const runs = canary?.runs || []
  const state = canary?.state || 'never'
  const handle = `@${last?.handle || runs[0]?.handle || 'instagram'}`

  return (
    <div className="ad-panel ad-canary">
      <div className="ad-canary-top">
        <div className="ad-canary-now">
          <div className="wl-label" style={{ marginBottom: 8 }}>the daily check</div>
          {last ? (
            <div className="ad-canary-line">
              <Answer run={last} />
              <When at={last.ran_at} />
              {last.latency_ms !== null && last.latency_ms !== undefined
                ? <span className="ad-when">{seconds(last.latency_ms)} seconds</span> : null}
              {state === 'stale' ? <State tone="is-hold">late</State> : null}
            </div>
          ) : (
            <div className="ad-canary-line"><None>not run yet</None></div>
          )}
          <p className="ad-canary-why">
            {busy ? 'asking apify. it can take a minute.' : last ? `${why(last)}.` : `apify has not been asked about ${handle} yet.`}
          </p>
          {said ? <p className="ad-canary-why is-said" role="status">{said}</p> : null}
        </div>
        <div className="ad-canary-act">
          <RunButton busy={busy} running={!!canary?.running} onAct={run} />
        </div>
      </div>
      <Note>
        once a day apify is asked about {handle} past the cache, and what it says is kept here. it costs
        one call, counted with the rest. while the last check has failed, a line stands at the top of every
        screen of the desk, and it goes by itself once one passes.
      </Note>

      {runs.length ? (
        <div className="ad-canary-runs">
          <table className="ad-table is-series">
            <thead>
              <tr>
                <th>when</th><th>from</th><th>answer</th>
                <th className="is-num">seconds</th><th>face</th><th className="is-wide">what came back</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td><When at={r.ran_at} /></td>
                  <td>{r.source === 'desk' ? 'the desk' : 'schedule'}</td>
                  <td><Answer run={r} /></td>
                  <td className="is-num">{seconds(r.latency_ms) || <None>none</None>}</td>
                  <td>
                    {r.face_ok === true ? <State tone="is-live">fetched</State>
                      : r.face_ok === false ? <State tone="is-hold">refused</State>
                        : <None />}
                  </td>
                  <td className="is-wide"><span className="ad-canary-said" title={why(r)}>{brief(r)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
