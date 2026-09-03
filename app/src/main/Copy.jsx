// ── /copy, the code from the mail ───────────────────────────────────────────
//
// Phase 8. A verification mail carries its code in a plate that links here, with
// the code in the FRAGMENT so it never appears in a request line or a server
// log. This page's whole job is to put it on the clipboard, because a six digit
// code in an email is a thing people fail to copy on a phone.
//
// It is one button. There is nothing else on it on purpose: somebody who
// followed this link is mid flow in another tab and every additional word is a
// word between them and going back.
import { useEffect, useState } from 'react'
import { Display, Label, Pill, Prose } from '../wall/parts.jsx'
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
        <div className="mn-mid">
          <Display size="m" as="h1">No code<br />in this link.</Display>
          <Prose className="mn-copy">open the email again and press the button there.</Prose>
        </div>
      </main>
    )
  }

  return (
    <main className="mn-page">
      <TopBar go={go} who={who} />
      <div className="mn-mid mn-copyscreen">
        <Label><Sparkle size={11} />your code</Label>
        <div className="mn-code" aria-label={`your code is ${code.split('').join(' ')}`}>{code}</div>
        <Prose className="mn-copy">
          {copied ? 'copied. go back to the tab you came from and paste it in.'
            : 'copy it, then go back to the tab you came from.'}
        </Prose>
      </div>
      <div className="mn-foot">
        <Pill tone="light" wide onClick={copy}>{copied ? 'copied' : 'copy the code'}</Pill>
      </div>
    </main>
  )
}
