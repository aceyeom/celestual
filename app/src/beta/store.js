// The whole of the beta's client state, in one JSON blob under one key.
//
// One key, not several, for a reason that matters at a demo table: `↺ start
// over` has to be total and instant. A demo gets walked six times in an hour,
// and a reset that leaves a verified handle or a half-finished composer behind
// in some second key produces a walk-through that behaves differently from the
// first one, in front of the person you are showing it to.

const KEY = 'celestual.beta.v1'

const EMPTY = {
  source: 'direct',       // which QR surface produced this session
  query: '',              // the last handle typed into /beta/look
  handle: '',             // the handle this session has PROVEN it holds
  waitlisted: false,
  claimed: {},            // letterId -> true
  asked: {},              // letterId -> true
  removed: {},            // letterId -> true (one-tap takedown, client mirror)
  draft: null,            // the composer's in-flight letter, handed to /beta/sealing
  written: [],            // letters composed in this session
  pings: [],              // /beta/app
}

let cache = null

function read() {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(KEY)
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }
  } catch {
    // Private mode, a full quota, a browser with storage switched off. The
    // demo has to walk anyway, so the blob lives in memory for this tab and
    // nobody is told anything.
    cache = { ...EMPTY }
  }
  return cache
}

function write(next) {
  cache = next
  try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* see read() */ }
  return cache
}

export function getState() { return read() }

export function patch(fields) { return write({ ...read(), ...fields }) }

export function mark(bucket, id) {
  const s = read()
  return write({ ...s, [bucket]: { ...s[bucket], [id]: true } })
}

export function reset() {
  cache = null
  try { window.localStorage.removeItem(KEY) } catch { /* see read() */ }
  return read()
}
