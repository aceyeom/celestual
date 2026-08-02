// beta/samples.js — what is in the sky when you arrive.
//
// Three cards, so there is something to look at and something to compare. Two
// of them sit on flat plates and one on a photograph, because that is the
// choice the composer offers and the only way to see whether the two grounds
// belong to the same product is to see them next to each other.
//
// The photograph is loaded from `app/public/beta/demo.jpg`. If the file is not
// there the card falls back to a plate and nothing breaks: the sky is still
// full, the poster still reads, and dropping the image in later is the whole
// installation step.
import { prepare } from './photo.js'

const DEMO_IMAGE = '/beta/demo.jpg'

// Fetched rather than pointed at, so it goes through exactly the same path a
// photograph a person takes goes through — square-cropped, treated, re-encoded,
// measured for tone. A demo image that got to skip the treatment would be
// showing a card the product cannot actually make.
export async function demoPhoto() {
  try {
    const res = await fetch(DEMO_IMAGE)
    if (!res.ok) return null
    const blob = await res.blob()
    if (!blob || !blob.type.startsWith('image/')) return null
    return await prepare(new File([blob], 'demo.jpg', { type: blob.type }))
  } catch {
    return null
  }
}

// The register the composer's seeds teach: plain, specific, about a detail
// nobody would invent.
export const SAMPLES = [
  { handle: 'wrenmiles', words: 'you always took the window seat', photo: true, bg: 'ink' },
  { handle: 'juno.k', words: 'you hated that song and sang it anyway', bg: 'violet' },
  { handle: 'theo_park', words: 'we said we would be roommates', bg: 'ember' },
]
