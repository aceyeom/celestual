// ── /copy, the code from the mail ───────────────────────────────────────────
//
// Phase 8. A verification mail used to carry a capsule under its code that
// opened this page with the digits in the FRAGMENT, and this page put them on
// the clipboard, because a six digit code in an email is a thing people fail
// to copy on a phone.
//
// ── nothing sends anybody here any more ─────────────────────────────────────
// That capsule was a button which answered "copy this" by opening a browser: a
// tab, a page load and a second screen between somebody and six characters
// already in front of them, and on a phone it took them out of the mail app
// they were reading in. It is off the mail
// (supabase/functions/_shared/mail.ts `code()`), and what replaced it is the
// code itself being easy to TAKE: `user-select: all` on the digits, so one
// long press or one double click selects the whole of it and the mail client's
// own copy does the rest.
//
// This page stays anyway, and it is not dead code. Every mail already sitting
// in an inbox carries the old link, those codes are live for fifteen minutes
// after they were sent, and an address that answers with a not found is a
// person locked out by a deploy. It is the same screen it was, drawn on the
// door's own axis with the door's own code box, so somebody who does land here
// off an older mail is looking at the object they were about to type into.
//
// It is one button. There is nothing else on it on purpose: somebody who
// followed this link is mid flow in another tab and every additional word is a
// word between them and going back.
import { useEffect, useState } from 'react'
import { CodeBox, Display, Label, Pill, Prose } from '../wall/parts.jsx'
import { Sparkle } from '../wall/art.jsx'
import TopBar from './TopBar.jsx'

function fromHash() {
  const m = (window.location.hash || '').match(/c=(\d{4,8})/)
  return m ? m[1] : ''
}

export default function Copy({ go, who }) {
  const [code] = useState(fromHash)
  const [copied, setCopied] = useState(false)

  // Try once on arrival. A browser that refuses without a gesture leaves the
  // button, which is why the button is there rather than being a fallback.
  useEffect(() => {
    if (!code) return
    navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => {})
  }, [code])

  async function copy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (!code) {
    return (
      <main className="mn-page">
        <TopBar go={go} who={who} />
        <div className="mn-mid is-door">
          <Display size="m" as="h1">no code<br />in this link.</Display>
          <Prose className="mn-copy">open the email again and take the code off it there.</Prose>
        </div>
      </main>
    )
  }

  return (
    <main className="mn-page">
      <TopBar go={go} who={who} />
      <div className="mn-mid is-door mn-copyscreen">
        <Label><Sparkle size={11} />your code</Label>
        {/* The same box the gate types this into and the same box the mail
            drew it in (wall.css `THE CODE BOX`). Three screens, one object. */}
        <CodeBox value={code} />
        <Prose className="mn-copy">
          {copied ? 'copied. go back to the tab you came from and paste it in.'
            : 'press and hold the code to copy it, or use the button below.'}
        </Prose>
      </div>
      <div className="mn-foot">
        <Pill tone="light" wide onClick={copy}>{copied ? 'copied' : 'copy the code'}</Pill>
      </div>
    </main>
  )
}
