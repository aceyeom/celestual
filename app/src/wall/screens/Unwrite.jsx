// ── /r#t=: OFF THE WALL, FROM THE EMAIL ─────────────────────────────────────
//
// The link in "someone wrote you a letter" (docs/ONE-WALL.md). The person the
// letter is about opens it from their inbox and the letter comes down on
// load: no sign in, no proof, no second tap. The email went to the confirmed
// address of the @'s claimed owner, so the link in it is the proof.
//
// And because it happened on a tap in an inbox, which is where a thumb slips,
// the one big control on the sheet is the undo, good for a day
// (`wall_restore_by_token`). Under it, the way to the wall.
//
// ── what the link can answer ────────────────────────────────────────────────
//   used      the letter already came down off this link. It can still be
//             put back within the day, so that is offered, quietly.
//   expired   the link is thirty days old. The letter's own menu is the way
//             to take it down now, once the @ is confirmed.
//   invalid   the link is not one of ours, or was cut short in copying.
// Each says what happened and the one next step (VOICE.md 5).
import { useEffect, useState } from 'react'
import {
  Sheet, SheetHead, SheetFoot, Display, Label, Pill, ClosePill, CloseQuiet, Prose,
} from '../parts.jsx'
import { Wait } from '../screen.jsx'
import { loadWall, loadLetter } from '../data.js'
import { removeByToken, restoreByToken } from '../../api/alerts.js'
import { takeHash } from './Alerts.jsx'

// What this tab took down, kept for the tab's life: a reload has no hash to
// read any more, and the undo has to survive it.
const KEEP = 'celestual.unwrite.v1'
function kept() {
  try {
    const k = JSON.parse(sessionStorage.getItem(KEEP) || 'null')
    return k && k.t ? k : null
  } catch { return null }
}
function keep(k) {
  try {
    if (k) sessionStorage.setItem(KEEP, JSON.stringify(k))
    else sessionStorage.removeItem(KEEP)
  } catch { /* private mode: the undo lasts as long as the page does */ }
}

const HOUR = 3600000
function leftWords(until) {
  const ms = Number(until) - Date.now()
  if (!(ms > 0)) return ''
  const h = Math.max(1, Math.round(ms / HOUR))
  return h >= 23 ? 'within a day' : h === 1 ? 'in the next hour' : `in the next ${h} hours`
}

export default function Unwrite({ up, upLabel = 'back to the wall' }) {
  // the token on the address wins; a tab that already spent one keeps its own
  const [token] = useState(() => takeHash('t'))
  // taking · down · back · error
  const [state, setState] = useState(() => {
    if (token) return { phase: 'taking' }
    const k = kept()
    if (k) return { phase: k.back ? 'back' : 'down', t: k.t, letter: k.letter, until: k.until }
    return { phase: 'error', error: 'invalid' }
  })
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')

  useEffect(() => {
    if (!token) return undefined
    let on = true
    removeByToken(token).then((out) => {
      if (!on) return
      if (out?.ok) {
        const until = out.undo_until ? new Date(out.undo_until).getTime() : Date.now() + 24 * HOUR
        const k = { t: token, letter: out.letter_id || '', until }
        keep(k)
        setState({ phase: 'down', ...k })
        // the wall under this sheet stops drawing it
        loadWall(true)
        if (out.letter_id) loadLetter(out.letter_id, true)
        return
      }
      setState({ phase: 'error', error: out?.error || 'network', t: token })
    })
    return () => { on = false }
  }, [token])

  const undo = async () => {
    const t = state.t || token
    if (!t || busy) return
    setBusy(true)
    setSaid('')
    const out = await restoreByToken(t)
    setBusy(false)
    if (out?.ok) {
      const letter = out.letter_id || state.letter || ''
      keep({ t, letter, until: state.until, back: true })
      setState({ phase: 'back', t, letter })
      loadWall(true)
      if (letter) loadLetter(letter, true)
      return
    }
    setSaid(out?.error === 'expired'
      ? 'it has been more than a day, so it cannot be put back.'
      : out?.error === 'used' ? 'it is already back on the wall.'
      : 'that did not go through. try again.')
  }

  const head = <SheetHead onClose={up} label={upLabel} />
  const toWall = <ClosePill tone="light" wide onClose={up}>go to the wall</ClosePill>

  let title
  let body
  let foot
  if (state.phase === 'taking') {
    title = <>taking it down.</>
    body = <p className="wl-owner-wait"><Wait /><span>one moment</span></p>
    foot = null
  } else if (state.phase === 'down') {
    const left = leftWords(state.until)
    title = <>it&rsquo;s off the wall.</>
    body = (
      <Prose className="wl-gate-copy">
        nobody can read it now.{left ? ` you can put it back ${left}.` : ''}
      </Prose>
    )
    foot = (
      <>
        {left ? (
          <Pill tone="light" wide disabled={busy} onClick={undo} className="wl-owner-undo">
            {busy ? 'putting it back' : 'undo'}
          </Pill>
        ) : null}
        <div className="wl-gate-fault" aria-live="polite">{said}</div>
        {left ? <CloseQuiet onClose={up}>go to the wall</CloseQuiet> : toWall}
      </>
    )
  } else if (state.phase === 'back') {
    title = <>it&rsquo;s back on the wall.</>
    body = (
      <Prose className="wl-gate-copy">
        to take it down again, open it on the wall and choose remove from its menu.
      </Prose>
    )
    foot = toWall
  } else {
    const e = state.error
    title = e === 'used' ? <>this link was<br />already used.</>
      : e === 'expired' ? <>this link is<br />too old.</>
      : e === 'invalid' ? <>this link<br />does not work.</>
      : <>that did not<br />go through.</>
    body = (
      <Prose className="wl-gate-copy">
        {e === 'used' ? 'the letter came down the first time it was opened. if it is up again, open it on the wall and choose remove from its menu.'
          : e === 'expired' ? 'removal links work for 30 days. open the letter on the wall, confirm your Instagram, and choose remove from its menu.'
          : e === 'invalid' ? 'it may have been copied wrong. open the letter on the wall, confirm your Instagram, and choose remove from its menu.'
          : 'nothing came down yet. open the link from the email again in a moment.'}
      </Prose>
    )
    foot = (
      <>
        {toWall}
        <div className="wl-gate-fault" aria-live="polite">{said}</div>
        {e === 'used' && state.t ? (
          <button type="button" className="wl-quiet" disabled={busy} onClick={undo}>
            {busy ? 'putting it back' : 'put it back'}
          </button>
        ) : null}
      </>
    )
  }

  return (
    <Sheet onClose={up} labelledBy="wl-unwrite-h">
      <div className="wl-sheet-in wl-report wl-owner">
        {head}
        <Label tone="dim" className="wl-owner-kicker">a letter about you</Label>
        <Display size="s" as="h2" id="wl-unwrite-h">{title}</Display>
        {body}
        <div className="wl-push" />
        {foot ? <SheetFoot>{foot}</SheetFoot> : null}
      </div>
    </Sheet>
  )
}
