// /beta/nothing — THE NULL STATE
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THIS IS THE HERO OF THE BUILD, NOT THE FALLBACK.                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Roughly nineteen of twenty people who scan the flyer land here, and they
// arrive having just typed their own name into a wall and proven they care
// enough to look. That is the highest-intent moment in the entire product and
// it is reached by NOT finding anything. A build that treats this screen as the
// unhappy path has misread which path it is on.
//
// Three decisions carry it:
//
//   1. The sky stops moving. Completely. The field has drifted under every
//      screen up to this one, and here it goes still — the room holding its
//      breath. No illustration, no empty-state graphic, no "nothing here yet"
//      with a shrug. Stillness, which the person feels before they can name.
//   2. The handle field is PREFILLED with what they already typed. The ask is
//      one tap, not re-entry. Making somebody type their own name twice, thirty
//      seconds apart, to be told about a letter that does not exist yet, is how
//      you lose the nineteen.
//   3. Nothing auto-navigates. On submit the field collapses into one italic
//      line with a single bloom behind it and then it just sits there. The
//      second offer brightens two seconds later and waits. Let them sit in it.

import { useEffect, useState } from 'react'
import { ArrowLink, Bloom, Display, Help, HandleField, Rule } from '../parts.jsx'
import { normHandle } from '../handles.js'
import { repo } from '../data/index.js'
import { getState, patch } from '../store.js'

export default function Nothing({ go, setSkyMode }) {
  const [value, setValue] = useState(() => getState().query || '')
  const [kept, setKept] = useState(() => getState().waitlisted)
  const [busy, setBusy] = useState(false)
  const [awake, setAwake] = useState(false)

  useEffect(() => { setSkyMode('still') }, [setSkyMode])

  // The second offer wakes two seconds after the first one is answered, and
  // brightens over 1400ms rather than appearing. A link that pops in the moment
  // you finish something is a product asking for the next thing before you have
  // finished feeling the last one.
  useEffect(() => {
    if (!kept) return
    const t = setTimeout(() => setAwake(true), 2000)
    return () => clearTimeout(t)
  }, [kept])

  async function keep() {
    const h = normHandle(value)
    if (h.length < 3 || busy) return
    setBusy(true)
    await repo.joinWaitlist(h, getState().source)
    patch({ query: h })
    setKept(true)
  }

  return (
    <div className="beta-col">
      <div className="beta-lede-s" />

      <Display>No one yet.</Display>
      <Help style={{ marginTop: 18 }}>We&rsquo;ll tell you the moment someone does.</Help>

      <div style={{ marginTop: 40, position: 'relative', minHeight: 108 }}>
        {kept ? (
          <div style={{ position: 'relative', paddingTop: 6 }}>
            {/* the one bright object on this screen, and it is a luminance, not
                a colour — the whole accent system, spent here, once */}
            <Bloom opacity={0.10} size={300} style={{ top: 34 }} />
            <Display as="p" size={34} vulnerable style={{ position: 'relative' }}>
              We&rsquo;ll be watching for you.
            </Display>
          </div>
        ) : (
          <div style={{ animation: 'none' }}>
            <HandleField value={value} onChange={setValue} onSubmit={keep} />
            <div style={{ marginTop: 18 }}>
              <ArrowLink onClick={keep} disabled={normHandle(value).length < 3 || busy}>keep my handle</ArrowLink>
            </div>
          </div>
        )}
      </div>

      <div className="beta-push" />

      <Rule style={{ marginBottom: 26 }} />
      <Help small dim>Or write one about someone else.</Help>
      <div style={{ marginTop: 10 }}>
        <ArrowLink
          onClick={() => go('write')}
          className={kept ? `is-waking${awake ? ' is-awake' : ''}` : ''}
          tone={kept ? '' : 'quiet'}
        >
          write a letter
        </ArrowLink>
      </div>
    </div>
  )
}
