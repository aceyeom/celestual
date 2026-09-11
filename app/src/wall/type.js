// ── the faces, and knowing when they are there ──────────────────────────────
//
// Both surfaces set their type in the same four faces, served from this
// origin (app/public/fonts, written by scripts/fetch-faces.mjs). Each shell
// used to inject the stylesheet on mount and go on drawing: the type came up
// in its fallback face and was swapped a moment later when the real one
// landed, and every headline changed shape in front of the person reading
// it. That swap is now held behind the intro. main.jsx fetches the files
// with the shell's chunk, this module asks the browser to load the faces off
// them, and the shells hold the intro's lift until it says they are there,
// under a ceiling, so a slow connection gets the fallback rather than a mark
// held forever.

const FONTS = '/fonts/faces.css'

let sheet = null

// The stylesheet, once, for the life of the page. Answers when it has been
// parsed, or after a beat if the browser never says.
export function ensureFaces() {
  if (sheet) return sheet
  let link = document.querySelector(`link[href="${FONTS}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS
    link.dataset.faces = ''
    document.head.appendChild(link)
  }
  const el = link
  sheet = new Promise((done) => {
    if (el.sheet) { done(); return }
    el.addEventListener('load', () => done(), { once: true })
    el.addEventListener('error', () => done(), { once: true })
    setTimeout(done, 2500)
  })
  return sheet
}

// The cuts a first screen is set in: the display face, the reading face's
// italic (the "for" on a letter), the util face and the identifier face.
// One load per family is enough; a variable face carries every weight.
const FACES = [
  '500 40px Newsreader',
  'italic 400 16px Newsreader',
  '500 14px "Inter Tight"',
  '400 12px "Geist Mono"',
]

// Answers when the faces are loaded, or at the ceiling, whichever is first.
// Never throws: a face that will not load is the fallback, which is a
// designed state.
export function warmType(ceiling = 2600) {
  if (typeof document === 'undefined' || !document.fonts || !document.fonts.load) return Promise.resolve()
  const cap = new Promise((done) => setTimeout(done, ceiling))
  const all = ensureFaces()
    .then(() => Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => null))))
    .catch(() => null)
  return Promise.race([all, cap]).then(() => undefined)
}
