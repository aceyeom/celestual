// The bar. One mark, one word, and nothing else on it.
//
// The wall has its own (parts.jsx TopBar) carrying a search and an account,
// because the wall is a surface somebody browses. Main is a flow: there is one
// thing to do on each screen and the bar's whole job is to be the way back to
// the front door.
import { ECL, ringPath, starPath } from '../wall/mark.js'

const MARK = { ring: ringPath(), star: starPath(ECL) }

function Mark({ size = 22 }) {
  return (
    <svg className="wl-ecl" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="mn-bar-near">
          <rect x="-110" y="50" width="320" height="160" transform={`rotate(${ECL.tilt} 50 50)`} />
        </clipPath>
        <mask id="mn-bar-notch" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          <path d={ringPath(ECL.gutter)} fill="#000" fillRule="evenodd" clipPath="url(#mn-bar-near)" />
        </mask>
      </defs>
      <path d={MARK.ring} fill="currentColor" fillRule="evenodd" />
      <g mask="url(#mn-bar-notch)"><path d={MARK.star} transform="translate(50 50)" fill="currentColor" /></g>
      <path d={MARK.ring} fill="currentColor" fillRule="evenodd" clipPath="url(#mn-bar-near)" />
    </svg>
  )
}

export default function TopBar({ go, right = null }) {
  return (
    <header className="sg-top mn-top">
      <button type="button" className="sg-top-mark mn-top-mark" onClick={() => go('hero')}
        aria-label="celestual, back to the front">
        <Mark />
        <span className="wl-label">celestual</span>
      </button>
      {right}
    </header>
  )
}
