// profile.js — the signed-in user's account + their (encrypted) sky.
//
// Two persistence paths, chosen automatically:
//   • SIGNED IN (Supabase Auth session present): the sky is AES-GCM encrypted in
//     the browser (see vault.js) and stored in celestual_profiles; the key lives in
//     celestual_user_keys, readable only by the owner. Account fields (handle,
//     email, display name) sit alongside as plain columns. This is the real,
//     cross-device, "saved in the database" path.
//   • NOT SIGNED IN (dev/preview, or before Instagram is wired): the sky is kept in
//     localStorage so a refresh no longer wipes it. Same shape, no server.
//
// Nothing here ever throws into the UI — every call degrades to the local path or a
// safe empty value, so the app keeps working with or without a backend.
import { supabase, hasSupabase } from './supabase.js'
import { cryptoAvailable, generateKey, exportKey, importKey, encryptJSON, decryptJSON } from './vault.js'

const SKY_LOCAL = 'celestual:sky'
const keyCacheName = (uid) => `celestual:key:${uid}`
const EMPTY_SKY = { handles: [], times: [], sealCount: 0 }

// The live Supabase user (from the locally-cached session — no network). null when
// signed out or when Supabase isn't configured.
export async function currentUser() {
  if (!hasSupabase || !supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.user || null
  } catch {
    return null
  }
}

// Can we use the real encrypted-DB path right now?
async function dbReady() {
  if (!hasSupabase || !cryptoAvailable()) return null
  const user = await currentUser()
  return user || null
}

// Fetch (or lazily create) this user's AES key. Cached in localStorage for instant
// same-device reads; otherwise pulled from / written to celestual_user_keys so it's
// available on any device the owner signs in on.
async function getOrCreateKey(uid) {
  try {
    const cached = localStorage.getItem(keyCacheName(uid))
    if (cached) return await importKey(cached)
  } catch {
    /* ignore */
  }
  // Try the server's stored key.
  try {
    const { data } = await supabase.from('celestual_user_keys').select('wrapped_key').eq('user_id', uid).maybeSingle()
    if (data?.wrapped_key) {
      try {
        localStorage.setItem(keyCacheName(uid), data.wrapped_key)
      } catch {
        /* ignore */
      }
      return await importKey(data.wrapped_key)
    }
  } catch {
    /* ignore — fall through to create */
  }
  // First time on this account: mint a key, store it (owner-only row) + cache it.
  const key = await generateKey()
  const raw = await exportKey(key)
  let stored = raw
  try {
    // Don't clobber an existing key — a concurrent first-login on another tab/device
    // could have written one, and overwriting it would make the already-stored sky
    // undecryptable. Insert-if-absent, then adopt whatever actually persisted.
    await supabase.from('celestual_user_keys').upsert({ user_id: uid, wrapped_key: raw }, { onConflict: 'user_id', ignoreDuplicates: true })
    const { data } = await supabase.from('celestual_user_keys').select('wrapped_key').eq('user_id', uid).maybeSingle()
    if (data?.wrapped_key) stored = data.wrapped_key
  } catch {
    /* ignore — we still hold the freshly-minted key locally this session */
  }
  try {
    localStorage.setItem(keyCacheName(uid), stored)
  } catch {
    /* ignore */
  }
  return stored === raw ? key : await importKey(stored)
}

function readLocalSky() {
  try {
    const s = JSON.parse(localStorage.getItem(SKY_LOCAL))
    if (s && Array.isArray(s.handles)) {
      return {
        handle: s.me || s.handle || '',
        myHandles: Array.isArray(s.myHandles) ? s.myHandles : [],
        email: s.email || '',
        sky: { handles: s.handles, times: s.times || [], sealCount: s.sealCount ?? s.handles.length },
        source: 'local',
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

// The handle that owns the device-local sky, if any. Used to avoid presenting one
// handle's locally-stored sky as a different handle's on the stub/no-backend path.
export function localSkyOwner() {
  try {
    const s = JSON.parse(localStorage.getItem(SKY_LOCAL))
    return s && (s.me || s.handle) ? String(s.me || s.handle) : ''
  } catch {
    return ''
  }
}

function writeLocalSky({ me, myHandles, email, handles, times, sealCount }) {
  try {
    localStorage.setItem(SKY_LOCAL, JSON.stringify({ me, myHandles: myHandles || [], email, handles, times, sealCount }))
  } catch {
    /* ignore */
  }
}

// Load the account + decrypted sky. Returns null only when there's genuinely
// nothing stored anywhere (fresh visitor with no local sky).
export async function loadProfile() {
  const user = await dbReady()
  if (user) {
    try {
      const key = await getOrCreateKey(user.id)
      const { data } = await supabase
        .from('celestual_profiles')
        .select('handle, handles, email, sky_cipher, sky_nonce, star_count')
        .eq('user_id', user.id)
        .maybeSingle()
      let sky = EMPTY_SKY
      if (data?.sky_cipher && data?.sky_nonce && key) {
        const dec = await decryptJSON(key, data.sky_cipher, data.sky_nonce)
        if (dec && Array.isArray(dec.handles)) sky = { handles: dec.handles, times: dec.times || [], sealCount: dec.sealCount ?? dec.handles.length }
      }
      return {
        source: 'db',
        userId: user.id,
        handle: data?.handle || '',
        myHandles: Array.isArray(data?.handles) ? data.handles : [],
        email: data?.email || user.email || '',
        sky,
      }
    } catch {
      // Fall back to local so a transient backend error doesn't blank the sky.
      return readLocalSky()
    }
  }
  return readLocalSky()
}

// Persist the account + sky. Debounce at the call site — this writes immediately.
// `myHandles` is the user's own @s (multi-account); stored as a plain column.
export async function saveProfile({ me, myHandles, email, handles, times, sealCount }) {
  const sky = { handles: handles || [], times: times || [], sealCount: sealCount ?? (handles ? handles.length : 0) }
  const own = Array.isArray(myHandles) ? myHandles : []
  const user = await dbReady()
  if (user) {
    try {
      const key = await getOrCreateKey(user.id)
      const { cipher, nonce } = await encryptJSON(key, sky)
      await supabase.from('celestual_profiles').upsert(
        {
          user_id: user.id,
          handle: me || null,
          handles: own,
          email: email || null,
          sky_cipher: cipher,
          sky_nonce: nonce,
          star_count: sky.handles.length,
        },
        { onConflict: 'user_id' },
      )
      return { source: 'db' }
    } catch {
      // Don't lose the data — mirror it locally if the write failed.
      writeLocalSky({ me, myHandles: own, email, handles: sky.handles, times: sky.times, sealCount: sky.sealCount })
      return { source: 'local' }
    }
  }
  writeLocalSky({ me, myHandles: own, email, handles: sky.handles, times: sky.times, sealCount: sky.sealCount })
  return { source: 'local' }
}

// Sign out of Supabase and drop the local session caches (but NOT the sky — that's
// the account's data; deleteAccount() handles removal).
export async function signOutUser() {
  try {
    if (supabase) await supabase.auth.signOut()
  } catch {
    /* ignore */
  }
}

// Wipe everything: the encrypted profile, the key, the auth user, and every local
// cache. Used by the account area's "delete account".
export async function deleteAccount() {
  const user = await currentUser()
  try {
    if (user && supabase) await supabase.rpc('celestual_delete_me')
  } catch {
    /* ignore — clear locally regardless */
  }
  try {
    if (user) localStorage.removeItem(keyCacheName(user.id))
    localStorage.removeItem(SKY_LOCAL)
  } catch {
    /* ignore */
  }
  await signOutUser()
  return { deleted: true }
}
