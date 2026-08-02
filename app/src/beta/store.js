// beta/store.js — everything, held in this browser.
//
// /beta is self-contained by design, not by omission. Card text lives in
// localStorage; photographs live as blobs in IndexedDB. Nothing here opens a
// socket, and none of it touches the production Supabase schema, the ping RPCs,
// or the live app's `celestual:v2` key.
//
// That is a design position and not just a prototype convenience. The plan's
// first law is that nothing a user makes reaches the other person before both
// have chosen each other (§1.1), and the cheapest possible proof of that law is
// a build where the bytes are physically incapable of arriving anywhere. When
// this does get a backend, the seal stops being a property of the network and
// starts being a property of a policy — which is a strictly weaker guarantee,
// and worth knowing you are trading down to.

const KEY = 'celestual:beta:v1'
const DB = 'celestual-beta'
const SHELF = 'photos'

// ── the card list (text) ─────────────────────────────────────────────────────
export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && Array.isArray(raw.cards)) return raw
  } catch {
    /* private mode, quota, a hand-edited value — start clean */
  }
  return { cards: [], me: '' }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cards: state.cards || [], me: state.me || '' }))
  } catch {
    /* a card that cannot be persisted still works for this session */
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  openDb()
    .then((db) => db && db.transaction(SHELF, 'readwrite').objectStore(SHELF).clear())
    .catch(() => {})
}

// ── the photographs (blobs) ──────────────────────────────────────────────────
// IndexedDB rather than a data URI in localStorage: a treated 1024px JPEG is
// a few hundred kilobytes, localStorage is a five-megabyte string store, and
// base64 costs a third again on top. Three cards would fill it.

let dbp = null
function openDb() {
  if (dbp) return dbp
  dbp = new Promise((res) => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(SHELF)) db.createObjectStore(SHELF)
      }
      req.onsuccess = () => res(req.result)
      req.onerror = () => res(null)
    } catch {
      res(null)
    }
  })
  return dbp
}

export async function putPhoto(id, blob) {
  const db = await openDb()
  if (!db) return false
  return new Promise((res) => {
    try {
      const tx = db.transaction(SHELF, 'readwrite')
      tx.objectStore(SHELF).put(blob, id)
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    } catch {
      res(false)
    }
  })
}

export async function getPhoto(id) {
  if (!id) return null
  const db = await openDb()
  if (!db) return null
  return new Promise((res) => {
    try {
      const req = db.transaction(SHELF, 'readonly').objectStore(SHELF).get(id)
      req.onsuccess = () => res(req.result || null)
      req.onerror = () => res(null)
    } catch {
      res(null)
    }
  })
}

// ── object URLs, cached and released ─────────────────────────────────────────
// A blob URL is a live reference the page holds until it is revoked or the
// document goes away. The disc re-renders on every camera frame during a
// resolve, so minting a fresh URL per render would leak one per frame; this
// hands back the same string for the same id, forever, and releases the lot on
// teardown.
const urls = new Map()

export async function photoUrl(id) {
  if (!id) return null
  if (urls.has(id)) return urls.get(id)
  const blob = await getPhoto(id)
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urls.set(id, url)
  return url
}

export function releaseUrls() {
  for (const url of urls.values()) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
  }
  urls.clear()
}
