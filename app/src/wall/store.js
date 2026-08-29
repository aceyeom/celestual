// The whole of the prototype's state, in one blob under one key.
//
// One key, not several, for a reason that matters at a demo table: the reset
// has to be total and instant. A prototype gets walked six times in an hour,
// and a reset that leaves a claimed handle or a half-written letter behind in
// some second key produces a second walk-through that behaves differently
// from the first — in front of the person you are showing it to.

const KEY = 'celestual.wall.v4'

// There is still no handle in here, and the address that arrived in v4 is not
// one. The wall does not ask who is WRITING, has nothing to tell a writer
// later, and cannot check anything on their behalf. What `member` buys is one
// thing only: the letters come out of redaction. It is never attached to a
// letter and the composer never reads it.
const EMPTY = {
  source: 'direct',   // which printed surface produced this scan
  query: '',          // the last thing typed into the search
  opened: {},         // letterId -> true, so the wall can dim what has been read
  draft: null,        // the composer's in-flight letter
  written: [],        // letters put up in this session, newest first. This is
                      // the ONLY thing that opens the tab to the core service.
  seen: false,        // the opening cascade has played once
  member: null,       // a berkeley.edu address, if one has been given. It gates
                      // READING and nothing else.
  removed: [],        // handles that have asked to come off the wall. Held
                      // beside everything else so the reset clears them too.
}

let cache = null

function read() {
  if (cache) return cache
  try {
    const raw = window.localStorage.getItem(KEY)
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }
  } catch {
    // Private mode, a full quota, storage switched off. The prototype has to
    // walk anyway, so the blob lives in memory for this tab and nobody is
    // told anything about it.
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
