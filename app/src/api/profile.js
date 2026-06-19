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
  try {
    await supabase.from('celestual_user_keys').upsert({ user_id: uid, wrapped_key: raw }, { onConflict: 'user_id' })
  } catch {
    /* ignore — we still hold the key locally this session */
  }
  try {
    localStorage.setItem(keyCacheName(uid), raw)
  } catch {
    /* ignore */
  }
  return key
}

function readLocalSky() {
  try {
    const s = JSON.parse(localStorage.getItem(SKY_LOCAL))
    if (s && Array.isArray(s.handles)) {
      return { handle: s.me || s.handle || '', email: s.email || '', displayName: s.displayName || '', sky: { handles: s.handles, times: s.times || [], sealCount: s.sealCount ?? s.handles.length }, source: 'local' }
    }
  } catch {
    /* ignore */
  }
  return null
}

function writeLocalSky({ me, email, displayName, handles, times, sealCount }) {
  try {
    localStorage.setItem(SKY_LOCAL, JSON.stringify({ me, email, displayName, handles, times, sealCount }))
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
        .select('handle, email, display_name, sky_cipher, sky_nonce, star_count')
        .eq('user_id', user.id)
        .maybeSingle()
      let sky = EMPTY_SKY
      if (data?.sky_cipher && data?.sky_nonce && key) {
        const dec = await decryptJSON(key, data.sky_cipher, data.sky_nonce)
        if (dec && Array.isArray(dec.handles)) sky = { handles: dec.handles, times: dec.times || [], sealCount: dec.sealCount ?? dec.handles.length }
      }
      const paidStars = await loadEntitlements(user.id)
      return { source: 'db', userId: user.id, handle: data?.handle || '', email: data?.email || user.email || '', displayName: data?.display_name || '', sky, paidStars }
    } catch {
      // Fall back to local so a transient backend error doesn't blank the sky.
      return readLocalSky()
    }
  }
  return readLocalSky()
}

// Persist the account + sky. Debounce at the call site — this writes immediately.
export async function saveProfile({ me, email, displayName, handles, times, sealCount }) {
  const sky = { handles: handles || [], times: times || [], sealCount: sealCount ?? (handles ? handles.length : 0) }
  const user = await dbReady()
  if (user) {
    try {
      const key = await getOrCreateKey(user.id)
      const { cipher, nonce } = await encryptJSON(key, sky)
      await supabase.from('celestual_profiles').upsert(
        {
          user_id: user.id,
          handle: me || null,
          email: email || null,
          display_name: displayName || null,
          sky_cipher: cipher,
          sky_nonce: nonce,
          star_count: sky.handles.length,
        },
        { onConflict: 'user_id' },
      )
      return { source: 'db' }
    } catch {
      // Don't lose the data — mirror it locally if the write failed.
      writeLocalSky({ me, email, displayName, handles: sky.handles, times: sky.times, sealCount: sky.sealCount })
      return { source: 'local' }
    }
  }
  writeLocalSky({ me, email, displayName, handles: sky.handles, times: sky.times, sealCount: sky.sealCount })
  return { source: 'local' }
}

export async function loadEntitlements(uid) {
  try {
    const id = uid || (await currentUser())?.id
    if (!id) return 0
    const { data } = await supabase.from('celestual_entitlements').select('paid_stars').eq('user_id', id).maybeSingle()
    return Number(data?.paid_stars || 0)
  } catch {
    return 0
  }
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

// Wipe everything: the encrypted profile, the key, entitlements, the auth user, and
// every local cache. Used by the account area's "delete account".
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
