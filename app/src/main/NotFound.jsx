// ── nothing here ────────────────────────────────────────────────────────────
//
// Phase 8. Every address that matches nothing lands on this, and until now it
// landed on the old design's cold landing instead, which meant a typo rendered a
// retired page and looked deliberate.
//
// The one thing it does NOT do is guess. A near miss handled by redirecting
// somebody to the front page is a page insisting it knows better than the
// address they typed.
import { Display, Pill, Prose } from '../wall/parts.jsx'
import TopBar from './TopBar.jsx'

export default function NotFound({ go }) {
  return (
    <main className="mn-page">
      <TopBar go={go} />
      <div className="mn-mid">
        <Display size="m" as="h1">Nothing<br />at this address.</Display>
        <Prose className="mn-copy">
          it may have been a campus wall that has come down, or a link that lost a
          character on its way to you.
        </Prose>
      </div>
      <div className="mn-foot">
        <Pill tone="light" wide onClick={() => go('hero')}>the front page</Pill>
      </div>
    </main>
  )
}
