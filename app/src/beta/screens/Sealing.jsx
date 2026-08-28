// /beta/sealing — THE INTERLUDE
//
// It auto-advances after the classifier answers, and it is not skipped even
// though the classifier is stubbed in this build. The delay is the ceremony
// that makes the seal feel like a seal — and in production it is genuinely the
// classifier running, so the demo is not lying about how long the real thing
// takes. Removing this screen would save 2.4 seconds and cost the only moment
// in the flow where the product visibly takes care over what it publishes.

import { useEffect, useState } from 'react'
import { ArrowLink, Bloom, Display } from '../parts.jsx'
import { repo } from '../data/index.js'
import { getState, patch } from '../store.js'

export default function Sealing({ go, setSkyMode }) {
  const [done, setDone] = useState(null)
  const [failed, setFailed] = useState('')

  useEffect(() => { setSkyMode('ambient') }, [setSkyMode])

  useEffect(() => {
    let alive = true
    const draft = getState().draft
    if (!draft || !draft.body) { go('write'); return }
    repo.createLetter({
      targetHandle: draft.targetHandle,
      body: draft.body,
      sealedLine: draft.sealedLine || undefined,
      authorHandle: getState().handle || 'anonymous',
      sourceCode: getState().source,
    }).then((res) => {
      if (!alive) return
      patch({ draft: null })
      if (res.status === 'rejected') { setFailed('This one stays off the wall.'); return }
      setDone(res.id)
    })
    return () => { alive = false }
  }, [go])

  if (failed) {
    return (
      <div className="beta-col">
        <div className="beta-lede" />
        <Display size={34}>{failed}</Display>
        <div className="beta-push" />
        <ArrowLink onClick={() => go('write')}>write another</ArrowLink>
      </div>
    )
  }

  if (!done) {
    return (
      <div className="beta-col" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 200 }}>
          <Bloom opacity={0.14} size={300} breathing />
          <Display size={34} vulnerable style={{ position: 'relative' }}>Sealing.</Display>
        </div>
      </div>
    )
  }

  return (
    <div className="beta-col">
      <div className="beta-lede" />
      <Display>It&rsquo;s on the wall.</Display>
      <div className="beta-push" />
      <ArrowLink onClick={() => go('letter', done)}>see it</ArrowLink>
      <ArrowLink onClick={() => go('look')} tone="secondary">look for your own name</ArrowLink>
    </div>
  )
}
