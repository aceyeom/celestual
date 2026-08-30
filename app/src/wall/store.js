// The whole of the prototype's state, in one blob under one key.
//
// One key, not several, for a reason that matters at a demo table: the reset
// has to be total and instant. A prototype gets walked six times in an hour,
// and a reset that leaves a claimed handle or a half-written letter behind in
// some second key produces a second walk-through that behaves differently
// from the first — in front of the person you are showing it to.

const KEY = 'celestual.wall.v5'

// There is still no handle in here that belongs to a WRITER. The wall does not
// ask who is writing, has nothing to tell a writer later, and cannot check
// anything on their behalf.
//
// Two different identities live here and they are not the same key, because
// they do not buy the same thing and they are not proven the same way:
//
//   member    a berkeley.edu address. It opens reading, writing and reporting
//             — the three things a stranger off the street does not get — and
//             it is never attached to a letter. The composer never reads it.
//   verified  handles proven through the Instagram handoff. Not an account and
//             not a login: it is the answer to one question, asked once, on the
//             one action that is permanent — taking a whole name off the wall.
const EMPTY = {
  source: 'direct',   // which printed surface produced this scan
  query: '',          // the last thing typed into the search
  opened: {},         // letterId -> true, so the wall can dim what has been read
  draft: null,        // the composer's in-flight letter
  written: [],        // letters put up in this session, newest first. This is
                      // the ONLY thing that opens the tab to the core service.
  wroteTo: [],        // the HANDLES those letters were addressed to, newest
                      // first. Held beside the ids rather than derived from
                      // them because the letters themselves live in memory and
                      // a reload loses them, while the account sheet still has
                      // to be able to say who this device has written to. It is
                      // a record of the READER, never of a writer: it is on
                      // this device, it is cleared with everything else, and
                      // nothing on a letter points back at it.
  seen: false,        // the opening cascade has played once
  member: null,       // a berkeley.edu address, if one has been given. It gates
                      // reading, writing and reporting — and nothing else.
  removed: [],        // handles that have asked to come off the wall. Held
                      // beside everything else so the reset clears them too.
  reported: [],       // letters a report took down. HELD, never deleted — the
                      // wall cannot see them and a desk still can, which is the
                      // whole difference between a takedown and a delete.
  verified: [],       // handles proven through the Instagram handoff
  // The core service's ledger, held as a delta against the seeded one
  // (orbit.js) rather than as a copy of it: what this session placed, what it
  // renewed and what it let go. It lives under the same key as everything
  // else so the one reset clears the account too — a demo that walks a second
  // time with somebody's third ping still standing in it is a demo that
  // behaves differently in front of the person you are showing it to.
  orbit: null,
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

// Append to one of the list buckets, once. Written here rather than at four
// call sites so `[...removed(), h]` cannot be spelled two different ways and
// end up with a duplicate in one of them.
export function push(bucket, value) {
  const s = read()
  const list = s[bucket] || []
  return list.includes(value) ? s : write({ ...s, [bucket]: [...list, value] })
}

export function drop(bucket, value) {
  const s = read()
  const list = s[bucket] || []
  return write({ ...s, [bucket]: list.filter((v) => v !== value) })
}

export function mark(bucket, id) {
  const s = read()
  return write({ ...s, [bucket]: { ...s[bucket], [id]: true } })
}

export function reset() {
  cache = null
  try { window.localStorage.removeItem(KEY) } catch { /* see read() */ }
  return read()
}
