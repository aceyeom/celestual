// /beta/look — THE SEARCH
//
// The primary surface, and the one screen where the wait is a feature. The
// lookup is a filter over an in-memory array and answers in a millisecond; it
// is held to a floor of 1600ms anyway, and the drift decelerates to a stop
// while it runs. That pause is the person deciding whether they want the answer
// — it is doing the emotional work of the whole flow, and optimising it away
// would leave a form that returns a result.

import { useEffect, useRef, useState } from 'react'
import { ArrowLink, Display, HandleField, Help, Looking } from '../parts.jsx'
import { normHandle } from '../handles.js'
import { repo } from '../data/index.js'
import { getState, patch } from '../store.js'

const FLOOR = 1600

export default function Look({ go, setSkyMode }) {
  const [value, setValue] = useState(() => getState().query || '')
  const [looking, setLooking] = useState(false)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const ready = normHandle(value).length >= 3

  async function submit() {
    if (!ready || looking) return
    setLooking(true)
    setSkyMode('slowing')
    const handle = normHandle(value)
    patch({ query: handle })

    const started = Date.now()
    const found = await repo.findByHandle(handle)
    const rest = Math.max(0, FLOOR - (Date.now() - started))
    timers.current.push(setTimeout(() => {
      if (found.length) go('letter', found[0].id)
      else go('nothing')
    }, rest))
  }

  return (
    <div className="beta-col">
      <div className="beta-lede-s" />

      <Display size={38}>Type your handle.</Display>
      <Help style={{ marginTop: 16 }}>We&rsquo;ll look for letters written about you.</Help>

      <div style={{ marginTop: 40 }}>
        <HandleField
          id="beta-handle"
          label="Your Instagram handle"
          value={value}
          onChange={setValue}
          onSubmit={submit}
          autoFocus
          locked={looking}
        />
      </div>

      <div style={{ marginTop: 18, minHeight: 44 }}>
        {looking
          ? <div style={{ paddingTop: 14 }}><Looking /></div>
          : <ArrowLink onClick={submit} disabled={!ready}>look</ArrowLink>}
      </div>

      <div className="beta-push" />
    </div>
  )
}
