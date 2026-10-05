// ── our copy has a linter ───────────────────────────────────────────────────
// The voice, typeset as a diff: the app generic words struck out, each
// against the line the product says instead (VOICE.md 2, 5, 6 and 8). The
// struck lines are quoted only to be struck. The hunks are numbered as git
// numbers them with no context (`diff -U0`): the old file one line a hunk,
// the new one with the error's two. At the right of a struck line is what
// scripts/voice-lint.mjs prints for it, after its cross, drawn here rather
// than set, since the glyph the script prints is in the range it calls
// emoji. The foot is the command that keeps it so, with the cursor after it.

import { Page, W, H, U, M } from '../parts/li.jsx'

// a hunk: its range, what the line is for, the words struck, and the
// product's own, and what the linter says of the struck line, in its words
const HUNKS = [
  { at: '-1 +1', what: 'the mutual', out: ['Match found. Congratulations!'], why: ['exclamation mark', 'copy starts capitalised'], in: ['it’s mutual.'] },
  { at: '-2 +2,2', what: 'an error', out: ['Oops. Something went wrong.'], why: ['banned phrase'], in: ['it did not go through.', 'give it a moment, then send it again.'] },
  { at: '-3 +4', what: 'a note, standing', out: ['Hurry, expires soon.'], why: ['banned phrase'], in: ['lapses in 4 days. still feel it?'] },
  { at: '-4 +5', what: 'more pings', out: ['Unlock Premium.'], why: ['banned phrase'], in: ['get 3 pings · $8.97'] },
]

// the linter's cross: two strokes on the cap height
function Cross() {
  return (
    <svg className="li-x" width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
      <path d="M1 1L8 8M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" fill="none" />
    </svg>
  )
}

function Diff() {
  return (
    <div className="li-diff">
      <p className="li-diff-file"><span>---</span>a/the usual words</p>
      <p className="li-diff-file"><span>+++</span>b/celestual</p>
      {HUNKS.map((h) => (
        <div key={h.what} className="li-hunk">
          <p className="li-diff-at"><span>@@</span><b>{h.at} @@</b>{h.what}</p>
          {h.out.map((l) => (
            <p key={l} className="li-diff-out">
              <span>-</span><s>{l}</s>
              <i className="li-diff-why">{h.why.map((w) => <em key={w}><Cross />{w}</em>)}</i>
            </p>
          ))}
          {h.in.map((l) => <p key={l} className="li-diff-in"><span>+</span>{l}</p>)}
        </div>
      ))}
    </div>
  )
}

// the command that keeps it so, where the address would stand
const CMD = <span className="li-cmd"><span>$</span>npm run lint:voice<i className="li-cur" /></span>

function Poster() {
  return (
    <Page head={{ l: 'celestual · the voice', r: 'no exclamation marks, no emoji, no dashes' }} url={CMD}>
      <h2 className="li-line" style={{ left: M - 6, top: 2 * U + 10, fontSize: 142 }}>
        our copy<br />has a <em>linter.</em>
      </h2>
      <div style={{ position: 'absolute', left: M, right: M, top: 6.5 * U }}><Diff /></div>
    </Page>
  )
}

export default { id: 'li-post-linter', w: W, h: H, title: 'our copy has a linter', format: 'linkedin 4:5', order: 32, Poster }
