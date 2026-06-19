// vault.js — client-side encryption for the user's sky.
//
// The sky (the @handles a person has sealed) is sensitive, so it is encrypted in
// the browser with AES-GCM before it is ever stored. The key is a per-user random
// 256-bit key that lives in celestual_user_keys, a table readable ONLY by its
// owner (RLS on auth.uid()). So the ciphertext stored in celestual_profiles is
// opaque to everyone but the signed-in owner — see supabase/migrations/0002.
//
// Everything here is plain Web Crypto (SubtleCrypto) — no dependencies.

const b64 = {
  enc(buf) {
    const bytes = new Uint8Array(buf)
    let s = ''
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
    return btoa(s)
  },
  dec(str) {
    const s = atob(str)
    const bytes = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
    return bytes
  },
}

const subtle = () => (typeof crypto !== 'undefined' && crypto.subtle) || null

export function cryptoAvailable() {
  return !!subtle()
}

// Generate a fresh, exportable AES-GCM key.
export async function generateKey() {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function exportKey(key) {
  const raw = await subtle().exportKey('raw', key)
  return b64.enc(raw)
}

export async function importKey(rawB64) {
  const raw = b64.dec(rawB64)
  return subtle().importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
}

// Encrypt a JSON-serialisable value → { cipher, nonce } (both base64).
export async function encryptJSON(key, value) {
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(value))
  const buf = await subtle().encrypt({ name: 'AES-GCM', iv: nonce }, key, data)
  return { cipher: b64.enc(buf), nonce: b64.enc(nonce) }
}

// Decrypt { cipher, nonce } back into the original value (or null on failure).
export async function decryptJSON(key, cipher, nonce) {
  try {
    const buf = await subtle().decrypt({ name: 'AES-GCM', iv: b64.dec(nonce) }, key, b64.dec(cipher))
    return JSON.parse(new TextDecoder().decode(buf))
  } catch {
    return null
  }
}
