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
//
// A letter in Korean, Japanese or Chinese is set in a fifth face, the screen's
// pixel face for those three (scripts/fetch-cjk.mjs), which nothing waits on:
// it is declared after the intro, and each of its files is fetched only when
// a character on the glass needs it.

const FONTS = '/fonts/faces.css'
// and the screen's face for Korean, Japanese and Chinese (scripts/fetch-cjk.mjs)
const CJK = '/fonts/faces-cjk.css'

let sheet = null
let cjk = null

// A stylesheet, once, for the life of the page. Answers when it has been
// parsed, or after a beat if the browser never says.
function linkSheet(href, ceiling) {
  let link = document.querySelector(`link[href="${href}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.faces = ''
    document.head.appendChild(link)
  }
  const el = link
  return new Promise((done) => {
    if (el.sheet) { done(); return }
    el.addEventListener('load', () => done(), { once: true })
    el.addEventListener('error', () => done(), { once: true })
    setTimeout(done, ceiling)
  })
}

export function ensureFaces() {
  if (sheet) return sheet
  sheet = linkSheet(FONTS, 2500)
  // The CJK faces come after, when the page has a moment, and nothing waits
  // on them: the intro is set in latin, and the stylesheet only declares the
  // faces (a few hundred small files, each fetched only when a character on
  // the glass falls in it). A letter that needs one sooner asks for it
  // (`ensureCjk`), and one drawn before it lands is drawn again when it does
  if (typeof window !== 'undefined') {
    const later = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200))
    sheet.then(() => later(() => ensureCjk()))
  }
  return sheet
}

export function ensureCjk() {
  if (!cjk) cjk = linkSheet(CJK, 4000)
  return cjk
}

// ── the language of a text, for its face ────────────────────────────────────
// Korean, Japanese and Chinese share the ideographs and draw many of them
// differently, so the face for one is the face for its language, which the
// page is told by `lang` (screen.jsx) and picks by (phone.css `--f-cjk`). A
// letter has no language field, so it is read off the words: any Hangul is
// Korean, any kana is Japanese (a Korean letter quoting a Japanese word is
// still Korean, and its kana falls through to the Japanese face anyway),
// and ideographs alone are Chinese. Anything else is nobody's business here:
// Jersey 10 draws it, and the answer is null.
const HANGUL = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿ﾠ-ￜ]/
const KANA = /[぀-ヿㇰ-ㇿｦ-ﾝ]/
const HAN = /[㐀-䶿一-鿿豈-﫿]|[\uD840-\uD87E][\uDC00-\uDFFF]/
// Chinese in the traditional characters or the simplified: the commonest
// characters that differ between the two, each list in the other's order,
// and whichever a letter has more of. A letter of a few lines always has
// some; a letter with none of either is drawn in the simplified face, which
// is the same drawing wherever the two agree
const SIMPLIFIED = '们这个来说时会为国过还没么对学发现样见话让买钱开关门间问题长东车电视爱点头经乐体气变场应当无实请谢亲几听欢从进边后里书写读认识记忆梦难虽与给动儿两飞马鸟鱼云风卖语词课华岁远带帮伞馆图该总页业医药脑网线红绿蓝黄颜办义习乡'
const TRADITIONAL = '們這個來說時會為國過還沒麼對學發現樣見話讓買錢開關門間問題長東車電視愛點頭經樂體氣變場應當無實請謝親幾聽歡從進邊後裡書寫讀認識記憶夢難雖與給動兒兩飛馬鳥魚雲風賣語詞課華歲遠帶幫傘館圖該總頁業醫藥腦網線紅綠藍黃顏辦義習鄉'
export function langOf(text) {
  const t = String(text ?? '')
  if (HANGUL.test(t)) return 'ko'
  if (KANA.test(t)) return 'ja'
  if (!HAN.test(t)) return null
  let s = 0
  let h = 0
  for (const ch of t) {
    if (SIMPLIFIED.includes(ch)) s++
    else if (TRADITIONAL.includes(ch)) h++
  }
  return h > s ? 'zh-Hant' : 'zh'
}

// The screen's face as a canvas takes it, for a text (share.js): Jersey 10,
// then the faces the text's scripts need, its own language's first. The page
// lists all four in every order (phone.css `--f-cjk`) and fetches only what it
// draws with; a canvas asked to load a font list loads every face in it that
// covers a character, so here the list is only what the text needs.
const FACE_OF = { ko: 'Celestual Pixel KO', ja: 'Celestual Pixel JA', zh: 'Celestual Pixel ZH', 'zh-Hant': 'Celestual Pixel ZH Hant' }
export function s40Face(text) {
  const t = String(text ?? '')
  const lang = langOf(t)
  const faces = lang ? [FACE_OF[lang]] : []
  if (lang && lang !== 'ja' && KANA.test(t)) faces.push(FACE_OF.ja)
  if (lang && lang !== 'ko' && HANGUL.test(t)) faces.push(FACE_OF.ko)
  return ['"Jersey 10"', ...faces.map((f) => `"${f}"`), '"Geist Mono"', 'ui-monospace', 'monospace'].join(', ')
}

// The cuts a first screen is set in: the display face, the reading face's
// italic (the "for" on a letter), the util face and the identifier face.
// One load per family is enough; a variable face carries every weight.
const FACES = [
  '500 40px Newsreader',
  'italic 400 16px Newsreader',
  '500 14px "Inter Tight"',
  '400 12px "Geist Mono"',
  // and the screens': every letter on the wall is set in it
  '400 16px "Jersey 10"',
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
