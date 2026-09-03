// card/photos.js — the photographs: this device's copy, and the seal they
// travel under.
//
// A card is two halves. The WORDS have ridden the ping row since 0022, sealed,
// released only to the counterpart of a pair that is already matched. Until
// 0025 the PHOTOGRAPH did not travel at all — it sat in IndexedDB on the phone
// that took it, and this file said so at length.
//
// That was a real guarantee and it cost the product the thing it was for. A
// person composes a card ON a photograph of where they are, places it, matches,
// and the other half of the pair is shown words on a bare plate; on a new phone
// it was not even theirs any more. "It never left your phone" and "it was never
// saved" are one sentence read from two sides, and the second side is the one
// people actually met.
//
// So the photograph now rides the row under the words' own seal (migration
// 0025): stored on the ping, released by celestual_counterpart_photo and by
// nothing else, and only ever off a row whose `matched_at` is set. Below a
// mutual it is exactly as unreadable as the words beside it. Every path that
// deletes a ping deletes it too — it is a column on the ping.
//
// What is given up, precisely: the picture used to be safe as a FACT about the
// network (nothing sent it, so it could not arrive) and is now safe as a POLICY
// the server keeps (one `where` clause decides who may read it). That is the
// same guarantee the words have had all along.
//
// This file still owns the local half, and that has not changed shape: the
// treated blob is cached in IndexedDB so a disc drawn sixty times a second is
// reading a blob URL and not the network. What is new is `uploadPhoto` and
// `ensurePhoto` at the bottom — the two doors between the cache and the row.
import { putCardPhoto, getCardPhoto } from '../api/celestual.js'

const DB = 'celestual-photos'
const SHELF = 'photos'

// IndexedDB rather than a data URI in localStorage: a treated 1024px JPEG is a
// few hundred kilobytes, localStorage is a five-megabyte string store, and
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
  if (!id || !blob) return false
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

// Letting a ping go takes its photograph with it. A blob left behind after the
// row that referenced it is gone is a picture of somebody's night sitting in a
// browser store with nothing in the product able to show it or delete it.
export async function dropPhoto(id) {
  if (!id) return false
  const url = urls.get(id)
  if (url) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
    urls.delete(id)
  }
  const db = await openDb()
  if (!db) return false
  return new Promise((res) => {
    try {
      const tx = db.transaction(SHELF, 'readwrite')
      tx.objectStore(SHELF).delete(id)
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    } catch {
      res(false)
    }
  })
}

// ── the two keys ─────────────────────────────────────────────────────────────
// One cache, two kinds of thing in it, and they must never collide: `card:` is
// the photograph you put on the card you sent to that @, `theirs:` is the one
// they put on the card they sent you. Both are keyed by the OTHER person's
// handle, because that is the only name a ping has on this device.
export const myKey = (handle) => (handle ? `card:${String(handle).toLowerCase()}` : null)
export const theirKey = (handle) => (handle ? `theirs:${String(handle).toLowerCase()}` : null)

// …and back again, so a key alone is enough to fetch what it names: which @ the
// ping is to, and which side of the pair wrote the picture.
export function parseKey(key) {
  const m = /^(card|theirs):(.+)$/.exec(String(key || ''))
  if (!m) return null
  return { handle: m[2], mine: m[1] === 'card' }
}

// ── the wire form ────────────────────────────────────────────────────────────
// base64, and not a data: URI — the column holds the payload alone, and the
// validator rejects anything that is not the base64 alphabet (migration 0025).
// FileReader rather than a byte loop: a 250KB JPEG is a quarter of a million
// iterations of String.fromCharCode on the main thread, at the exact moment
// somebody is waiting to find out whether it was mutual.
function toBase64(blob) {
  return new Promise((res) => {
    try {
      const r = new FileReader()
      r.onload = () => {
        const s = String(r.result || '')
        const i = s.indexOf(',')
        res(i >= 0 ? s.slice(i + 1) : '')
      }
      r.onerror = () => res('')
      r.readAsDataURL(blob)
    } catch {
      res('')
    }
  })
}

function fromBase64(b64) {
  try {
    const bin = atob(String(b64 || '').replace(/\s/g, ''))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: 'image/jpeg' })
  } catch {
    return null
  }
}

// The server's ceiling is 1.4M base64 characters and a treated card is nowhere
// near it — but a treated card is only ever as small as the picture it came
// from, and a bright, busy frame at 1024px can run large. Rather than refuse
// one, re-encode it once, smaller and softer, and send that. A photograph that
// arrives a little softer is a photograph; one that is refused is a plate.
const WIRE_CEILING = 1200000

async function shrink(blob, side, quality) {
  try {
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      const c = document.createElement('canvas')
      c.width = side
      c.height = side
      const ctx = c.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, side, side)
      return await new Promise((res) => c.toBlob(res, 'image/jpeg', quality))
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  } catch {
    return null
  }
}

// ── sending one ──────────────────────────────────────────────────────────────
// Called right after a ping is recorded, with the picture or with null. Null is
// not a no-op and must not be skipped: it CLEARS the column, which is what
// stops a re-placed card coming back wearing the photograph the last version of
// it was written on.
//
// Failure here is deliberately quiet. The ping stands, the words are sealed on
// it, and the card simply has no photograph — the same thing that happens when
// somebody chooses not to add one. Nothing about the most important moment in
// the product is allowed to hinge on an upload.
export async function uploadPhoto({ me, them, proof, blob }) {
  if (!them) return false
  if (!blob) {
    await putCardPhoto({ me, them, proof, photo: null })
    return false
  }
  let wire = blob
  let b64 = await toBase64(wire)
  if (b64.length > WIRE_CEILING) {
    const smaller = await shrink(blob, 768, 0.72)
    if (smaller) {
      wire = smaller
      b64 = await toBase64(wire)
    }
  }
  if (!b64 || b64.length > WIRE_CEILING) return false
  const r = await putCardPhoto({ me, them, proof, photo: b64 })
  return !!(r && r.ok)
}

// ── getting one back ─────────────────────────────────────────────────────────
// The cache first, always: a photograph is fetched once per device and then it
// is local, which is what keeps the reveal's sixty frames a second off the
// network. `mine` false asks for THEIRS, which the server answers only off a
// matched row.
//
// In-flight calls are deduplicated by key. The ledger, the sky and the reveal
// can all ask for the same picture inside the same frame, and three parallel
// downloads of one photograph is three times the wait for it.
const pending = new Map()
// And a key the server has already said it has nothing for is not asked again
// for a while. One row can genuinely have no picture — a card is allowed to
// stand on its own ground — and re-asking on every re-render would turn "there
// isn't one" into a poll.
//
// It expires rather than being permanent, because "there isn't one" can stop
// being true while a tab is open: the other half of an instant mutual uploads
// their photograph a second or two after their ping lands, so a reveal opened
// in that window would otherwise be the last word until a reload.
const missing = new Map()
const MISSING_TTL = 60000

export async function ensurePhoto({ key, me, them, proof, mine = true }) {
  if (!key) return false
  const nope = missing.get(key)
  if (nope && Date.now() - nope < MISSING_TTL) return false
  const held = await getPhoto(key)
  if (held) return true
  if (pending.has(key)) return pending.get(key)
  const at = parseKey(key)
  const job = (async () => {
    const b64 = await getCardPhoto({ me, them: them || (at && at.handle), proof, mine })
    const blob = b64 ? fromBase64(b64) : null
    if (!blob) {
      missing.add(key)
      return false
    }
    await putPhoto(key, blob)
    return true
  })()
    .catch(() => false)
    .finally(() => pending.delete(key))
  pending.set(key, job)
  return job
}

// Sign-out and "delete everything" clear the device. The pictures are part of
// the device.
export async function wipePhotos() {
  releaseUrls()
  const db = await openDb()
  if (!db) return false
  return new Promise((res) => {
    try {
      const tx = db.transaction(SHELF, 'readwrite')
      tx.objectStore(SHELF).clear()
      tx.oncomplete = () => res(true)
      tx.onerror = () => res(false)
    } catch {
      res(false)
    }
  })
}
