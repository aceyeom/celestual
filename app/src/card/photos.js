// card/photos.js — the photographs, held in this browser and nowhere else.
//
// A card's words ride on its ping row (the server keeps them sealed until both
// sides exist — migration 0022). Its photograph does not, and that is the
// design rather than an omission: the treated blob lives in IndexedDB on the
// device that took it, and there is no code path in this repo that uploads it.
//
// The plan's first law is that nothing a user makes reaches the other person
// before both have chosen each other. For the words that law is now a policy
// the server keeps. For the photograph it stays a fact about the network: the
// bytes are physically incapable of arriving anywhere, which is a strictly
// stronger guarantee and the reason the picture is the half that stayed home.
//
// So at a mutual you see their words, on their ground, in their light. You do
// not see their room. Nobody's camera roll is on our servers.

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
