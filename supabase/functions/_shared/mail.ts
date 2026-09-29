// CELESTUAL: the mail, in the wall's black room. One design, and the senders
// own only their words (_shared/mails.ts holds the words of every mail).
//
// ── THE PHONE, AT MAIL SCALE ─────────────────────────────────────────────────
// design/DESIGN.md 2.5 to 2.7. The wall is a black room with a phone left on
// in it, and a mail from it is the same room with the same phone in it, in
// the order the product's own sheets stand (the ping, the mutual): the lit
// screen, the words under it, one lit key, and the name signed at the foot.
//
//   THE VOID IS BLACK.   #000, the room's ground and the mail's, edge to edge.
//   THE SCREEN.          the intro's phone, lit, with the mark on its glass
//                        and the one line the mail has to say typed under
//                        the mark with the phone's cursor after it, as the
//                        mutual's screen says "it's mutual." (Reveal.jsx).
//                        Night for every mail but the mutual's, which is the
//                        rose letter with the mark alive on it. A picture
//                        (`SCREENS`), and an animated GIF: the cursor blinks
//                        on the phone's beat, the light goes round the
//                        mutual's ring; its first frame is the whole of it,
//                        for Outlook, which shows no other.
//   THE WORDS.           the sentences under the phone, in the mail's own
//                        text: Helvetica, centred on the phone's axis, ash
//                        with a handle in chalk. A pixel face at body size
//                        is a phone's, and in a mail it would also be the
//                        fallback nobody chose, so the sentences are set in
//                        the fallback on purpose.
//   ONE LIT KEY.         a chalk plate with the word struck out of it in
//                        black, the way the phone lit the chosen row of a
//                        menu, and the thing to press; a second thing a mail
//                        offers (remove it) is the bezel key beside it. Both
//                        pictures, so the word is in the phone's face in
//                        every client, and a client that inverts colours in
//                        its dark mode cannot turn the plate dark.
//   THE ACCENT, ONCE.    #74C7DE, spent on the one fact a mail most needs
//                        read, and on nothing else: the day a lapsing note's
//                        slot opens (the lapse note in mails.ts).
//   THE SIGNATURE.       the lockup, the mark and `celestual.` drawn on the
//                        phone's grid (app/src/wall/brand.js), a picture,
//                        at the foot over the colophon, as the shared
//                        picture is signed under its screen (share.js).
//
// Every picture is made by scripts/export-mail.mjs out of the real screen
// (scripts/darkroom.mjs), served from `${SITE}/mail/`, and carries its words
// in its alt text: a client that blocks pictures shows the line, the key's
// word as a link, and the name, and every sentence is text already.
//
// ── THE CLIENTS ─────────────────────────────────────────────────────────────
// Tables for layout, every rule inline, `bgcolor` beside every background for
// Outlook's Word engine, a fixed column for it where others read max-width,
// width and height on every picture, and a conditional block that pins
// Outlook to Helvetica (it falls back to Times when the first face in a
// stack is a web font it cannot load). Dark mode: the mail is dark already
// and says so (`color-scheme: light dark`, so Apple Mail leaves it as it
// is), and nothing bright in it is a background a client could invert: the
// keys and the screen are pictures on black. Copy is lowercase
// (design/VOICE.md).

// ── the tokens ───────────────────────────────────────────────────────────────
// The wall's values (app/src/wall/phone.css, design/DESIGN.md 2.6). The
// bezel is chalk at sixteen percent, flattened against the black because a
// mail cannot be trusted with alpha.
export const C = {
  void: '#000000', //      the room
  lcd: '#0B0B0B', //       the unlit panel
  edge: '#2A2927', //      its bezel, chalk at 16% on black
  chalk: '#F4F1EA', //     what you are meant to read
  ash: '#9C978E', //       the quieter voice
  dim: '#77736B', //       the foot of the mail
  accent: '#74C7DE', //    once per mail, at most
}

// The origin every link and picture in a mail points at. Reached through
// `globalThis` because scripts/mail-preview.mjs imports this module under
// Node to screenshot it, where a bare `Deno` is a ReferenceError.
// deno-lint-ignore no-explicit-any
const ENV = (globalThis as any).Deno?.env
export const SITE: string = (ENV?.get?.('CELESTUAL_SITE_URL') || 'https://celestual.us').replace(/\/+$/, '')
export const FONT = `${SITE}/fonts/jersey-10-normal-400-latin.woff2`
const PIC = (name: string) => `${SITE}/mail/${name}`

// The column, and the screen's picture in it: 400 by 404, drawn at twice
// that. On a phone both are as wide as the phone will hold.
export const WIDTH = 440
const SCREEN = { w: 400, h: 404 }

export const PIXEL = "'Jersey 10', 'Helvetica Neue', Helvetica, Arial, sans-serif"
export const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif"

// Text for a mail is escaped once, here. Handles and names come from rows a
// person wrote, and a mail is HTML.
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── the pictures ─────────────────────────────────────────────────────────────
// The screens (export-mail.mjs `SCREENS`) and the words typed on each, which
// are its alt text. The link mails, the school's and the alert address's,
// share one screen: what it confirms is said under it.
export const SCREENS = {
  signin: 'tap to sign in.',
  confirm: 'tap to confirm.',
  letter: 'a letter to you.',
  mutual: 'it’s mutual.',
  lapse: 'still feel it?',
  code: 'your code.',
} as const
export type ScreenName = keyof typeof SCREENS

// The keys (export-mail.mjs `KEYS`): the picture and its word. A key alone
// is the phone's width, 272, and two share it; each picture carries 12 of
// the room round its plate for the light the lit key throws, so a key is
// 296 by 72 and each of a pair 148 by 72, and a pair stands as wide as a
// key alone, with the two plates a light's width apart.
export const KEYS = {
  signin: { src: 'key-sign-in.png', word: 'sign in', w: 296 },
  confirm: { src: 'key-confirm.png', word: 'confirm', w: 296 },
  post: { src: 'key-confirm-and-post.png', word: 'confirm and post', w: 296 },
  open: { src: 'key-open.png', word: 'open celestual', w: 296 },
  keep: { src: 'key-keep.png', word: 'keep it for next week', w: 296 },
  read: { src: 'key-read.png', word: 'read it', w: 148 },
  remove: { src: 'key-remove.png', word: 'remove it', w: 148 },
} as const
export type KeyName = keyof typeof KEYS
const KEY_H = 72

// ── the parts ────────────────────────────────────────────────────────────────

// A sentence under the phone. The reading voice, centred on its axis.
export function body(text: string, color: string = C.ash) {
  return `<p style="font-family:${SANS};font-size:16px;line-height:1.6;margin:0 0 12px;color:${color};text-align:center;mso-line-height-rule:exactly">${text}</p>`
}

// A handle or a name inside a sentence: the thing to read, in chalk.
export function em(text: string) {
  return `<span style="color:${C.chalk}">${text}</span>`
}

// Metadata, small and quiet.
export function tick(text: string, color: string = C.dim) {
  return `<p style="font-family:${SANS};font-size:13px;line-height:1.55;margin:0;color:${color};text-align:center;mso-line-height-rule:exactly">${text}</p>`
}

// A key: its picture, linked. With pictures blocked it is its word, as a
// link in chalk, where the plate would have been.
function keyImg(href: string, name: KeyName) {
  const k = KEYS[name]
  return `<a href="${href}" target="_blank" style="display:inline-block;text-decoration:none;color:${C.chalk}"><img src="${PIC(k.src)}" width="${k.w}" height="${KEY_H}" alt="${k.word}" border="0"
    style="display:block;width:${k.w}px;height:${KEY_H}px;border:0;outline:none;text-decoration:none;font-family:${SANS};font-size:16px;line-height:${KEY_H}px;color:${C.chalk};text-align:center" /></a>`
}

// The lit key, alone under the words; or the lit key and the bezel key
// beside it, for a mail that offers a second thing (`also`).
export function key(href: string, name: KeyName, also?: { href: string; name: KeyName }) {
  const cell = (h: string, n: KeyName) => `<td align="center" valign="top" style="padding:0;font-size:0;line-height:0">${keyImg(h, n)}</td>`
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:collapse;margin:0 auto"><tr>${cell(href, name)}${also ? cell(also.href, also.name) : ''}</tr></table>`
}

// The code, for the one mail that still carries one (the old `send`, for a
// tab on an old build; every sign in is a link since 0065), on the unlit
// panel inside its bezel. Set so one long press or one double click takes
// the whole of it: a mail cannot write to a clipboard, but it can be easy
// to take.
export function code(value: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse:separate;margin:0 auto">
    <tr>
      <td bgcolor="${C.lcd}" align="center" style="background:${C.lcd};border:1px solid ${C.edge};border-radius:3px;padding:16px 26px 14px">
        <div style="font-family:${PIXEL};font-size:44px;line-height:1;letter-spacing:6px;padding-left:6px;color:${C.chalk};white-space:nowrap;
          -webkit-user-select:all;-moz-user-select:all;-ms-user-select:all;user-select:all;mso-line-height-rule:exactly">${value}</div>
      </td>
    </tr>
  </table>`
}

// Why this arrived, and the way out. Every mail has one, under the name.
export function colophon(text: string) {
  return `<p style="font-family:${SANS};font-size:12px;line-height:1.65;margin:0;color:${C.dim};text-align:center;mso-line-height-rule:exactly">${text}</p>`
}

// A link in the foot, in the foot's colour.
export function footLink(href: string, text: string) {
  return `<a href="${href}" target="_blank" style="color:${C.ash};text-decoration:underline">${text}</a>`
}

// ── the room the whole thing sits in ─────────────────────────────────────────
// The screen, linked to what the mail is for (`href`, the lit key's own);
// the rows under it (`inner`: the words, the key, a tick); the signature;
// and the colophon (`foot`). `preheader` is the line an inbox shows beside
// the subject.
export function frame({ screen, href, inner, foot, preheader }: {
  screen: ScreenName
  href: string
  inner: string
  foot: string
  preheader?: string
}) {
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.void};opacity:0">${esc(preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>`
    : ''
  const said = SCREENS[screen]
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
<title>celestual.</title>
<style>
  @font-face { font-family: 'Jersey 10'; font-style: normal; font-weight: 400;
    src: url('${FONT}') format('woff2'); }
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; background: ${C.void}; -webkit-text-size-adjust: 100%; }
  a { color: ${C.chalk}; }
  img { -ms-interpolation-mode: bicubic; }
  /* a day or a time Apple Mail makes into a link keeps the sentence's colour */
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font: inherit !important; }
  @media (max-width: 480px) {
    .words { padding-left: 18px !important; padding-right: 18px !important; }
  }
</style>
<!--[if mso]>
<style>
  p, a, div, td, span { font-family: Helvetica, Arial, sans-serif !important; }
</style>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
</head>
<body bgcolor="${C.void}" style="margin:0;padding:0;background:${C.void};">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.void}" style="background:${C.void};border-collapse:collapse">
  <tr>
    <td align="center" style="padding:12px 10px 44px">
      <!--[if mso]><table role="presentation" width="${WIDTH}" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${WIDTH}px;border-collapse:collapse;margin:0 auto">
        <tr>
          <td align="center" style="padding:0;font-size:0;line-height:0">
            <a href="${href}" target="_blank" style="text-decoration:none"><img src="${PIC(`${screen}.gif`)}" width="${SCREEN.w}" height="${SCREEN.h}" alt="${said}" border="0"
              style="display:block;margin:0 auto;width:100%;max-width:${SCREEN.w}px;height:auto;border:0;outline:none;text-decoration:none;
              font-family:${SANS};font-size:24px;line-height:1.3;color:${C.chalk};text-align:center;background:${C.void}" /></a>
          </td>
        </tr>
        <tr>
          <td class="words" align="center" style="padding:0 34px">${inner}</td>
        </tr>
        <tr>
          <td align="center" style="padding:46px 0 0;font-size:0;line-height:0">
            <a href="${SITE}" target="_blank" style="text-decoration:none;color:${C.chalk}"><img src="${PIC('sign.png')}" width="150" height="48" alt="celestual." border="0"
              style="display:block;margin:0 auto;width:150px;height:48px;border:0;outline:none;text-decoration:none;font-family:${SERIF};font-size:20px;line-height:48px;color:${C.chalk};text-align:center" /></a>
          </td>
        </tr>
        <tr>
          <td class="words" align="center" style="padding:12px 40px 0">${foot}</td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`
}

// The rows under the phone, spaced as the product's sheets space theirs: the
// words, then `gap` and the key, then a tick. Each part is optional.
export function under({ words = '', act = '', note = '' }: { words?: string; act?: string; note?: string }) {
  return [
    words,
    act ? `<div style="padding:${words ? 14 : 0}px 0 0">${act}</div>` : '',
    note ? `<div style="padding:14px 0 0">${note}</div>` : '',
  ].join('')
}
