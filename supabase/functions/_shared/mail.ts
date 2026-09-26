// CELESTUAL: the mail, in the wall's black room. One design, and the senders
// own only their words (_shared/mails.ts holds the words of every mail).
//
// ── THE ROOM, AT MAIL SCALE ──────────────────────────────────────────────────
// design/DESIGN.md 2.5 and 2.6. The wall is a black room with a phone left on
// in it, and a mail from it is the same room:
//
//   THE VOID IS BLACK.   #000. The room's ground, and the mail's.
//   ONE UNLIT PANEL.     `--lcd`, #0B0B0B, a step off the black, inside a one
//                        pixel bezel of chalk at sixteen percent and a 3px
//                        corner. The words of the mail sit on it.
//   ONE LIT KEY.         a chalk plate with the word struck out of it in black,
//                        the way the phone lit the chosen row of a menu. One
//                        per mail, and it is the thing to press.
//   THE ACCENT, ONCE.    #74C7DE, spent on the one fact a mail most needs read
//                        (the number on the verify mail), and on nothing else.
//   THE PIXEL FACE.      Jersey 10, the Series 40 grid, for what the phone
//                        would print: the headline, the key, a number. Loaded
//                        by @font-face from the site, which Apple Mail and iOS
//                        draw; Gmail and Outlook do not load web fonts, so
//                        every stack falls back to Helvetica, and every size
//                        below is chosen to read in both.
//   THE READING VOICE.   Helvetica for the sentences. A pixel face at body
//                        size is a phone's; in a mail it is also the fallback
//                        nobody chose, so the sentences are set in the
//                        fallback on purpose.
//   THE BRAND.           the header image, `${SITE}/mail/head.png`: the
//                        lockup (the Ecliptic mark and `celestual.` in
//                        Newsreader) and a small LCD with the pixel mark on
//                        it, on black, 600px wide at 2x. Its alt text is the
//                        word, so a blocked image still signs the mail.
//
// ── THE CLIENTS ─────────────────────────────────────────────────────────────
// Tables for layout, every rule inline, `bgcolor` beside every background for
// Outlook's Word engine, and a conditional block that pins Outlook to
// Helvetica (it falls back to Times when the first face in a stack is a web
// font it cannot load). Dark mode: the mail is dark already and says so
// (`color-scheme: light dark`, so Apple Mail leaves it as it is); Gmail's app
// inverts light surfaces, which turns the chalk key dark with light words,
// which still reads. Copy is lowercase (design/VOICE.md).

// ── the tokens ───────────────────────────────────────────────────────────────
// The wall's values (app/src/wall/phone.css, design/DESIGN.md 2.6). The
// bezel is chalk at sixteen percent, flattened against the black because a
// mail cannot be trusted with alpha.
export const C = {
  void: '#000000', //      the room
  lcd: '#0B0B0B', //       the unlit panel
  edge: '#2A2927', //      its bezel, chalk at 16% on black
  chalk: '#F4F1EA', //     what you are meant to read, and the lit key
  ash: '#9C978E', //       the quieter voice
  dim: '#77736B', //       the foot of the mail
  ink: '#000000', //       the word struck out of the lit key
  accent: '#74C7DE', //    once per mail, at most
  // Kept for the senders written against the old sheet (celestual-remind).
  void1: '#0B0B0B',
  void2: '#000000',
  ashDim: '#77736B',
  paper: '#F4F1EA',
  paperInk: '#000000',
  paperInk2: '#6A6357',
  hair: '#2A2927',
  hairSoft: '#1C1B1A',
}

// The origin every link and image in a mail points at. Reached through
// `globalThis` because scripts/mail-preview.mjs imports this module under
// Node to screenshot it, where a bare `Deno` is a ReferenceError.
// deno-lint-ignore no-explicit-any
const ENV = (globalThis as any).Deno?.env
export const SITE: string = (ENV?.get?.('CELESTUAL_SITE_URL') || 'https://celestual.us').replace(/\/+$/, '')
export const HEAD = `${SITE}/mail/head.png`
export const FONT = `${SITE}/fonts/jersey-10-normal-400-latin.woff2`

// The column. The header image is drawn at 600 and shown at this width.
export const WIDTH = 520

export const PIXEL = "'Jersey 10', 'Helvetica Neue', Helvetica, Arial, sans-serif"
export const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif"
const MONO = "'SF Mono', Menlo, Consolas, 'Courier New', monospace"

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

// ── the parts ────────────────────────────────────────────────────────────────

// A hairline, the panel's own bezel colour.
export function rule(width = '100%') {
  return `<div style="width:${width};height:1px;background:${C.edge};font-size:0;line-height:0">&nbsp;</div>`
}

// What stands over a thing, the way the phone prints the row above a field.
export function label(text: string, color: string = C.ash) {
  return `<div class="px" style="font-family:${PIXEL};font-size:16px;line-height:1.2;color:${color};margin:0;mso-line-height-rule:exactly">${text}</div>`
}

// The one headline a mail is allowed, in the phone's face.
export function title(text: string) {
  return `<h1 class="px" style="font-family:${PIXEL};font-weight:400;font-size:32px;line-height:1.08;letter-spacing:0;margin:0;color:${C.chalk};mso-line-height-rule:exactly">${text}</h1>`
}

// A sentence. The reading voice.
export function body(text: string, color: string = C.ash) {
  return `<p style="font-family:${SANS};font-size:15px;line-height:1.6;margin:16px 0 0;color:${color};mso-line-height-rule:exactly">${text}</p>`
}

// Metadata, small and quiet.
export function tick(text: string, color: string = C.dim) {
  return `<p style="font-family:${SANS};font-size:13px;line-height:1.55;margin:14px 0 0;color:${color};mso-line-height-rule:exactly">${text}</p>`
}

// The lit key: a chalk plate, the word in black, a 3px corner. The padding is
// on the cell so Outlook, which ignores it on a link, still draws a key.
export function plate(href: string, text: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:26px 0 0">
    <tr>
      <td bgcolor="${C.chalk}" style="background:${C.chalk};border-radius:3px;padding:13px 24px 12px;mso-padding-alt:13px 24px 12px">
        <a href="${href}" class="px" style="font-family:${PIXEL};font-size:20px;line-height:1;color:${C.ink};text-decoration:none;display:inline-block;mso-line-height-rule:exactly">${text}</a>
      </td>
    </tr>
  </table>`
}

// A quiet key: the words on the panel, underlined, for the second thing a
// mail offers (remove it) beside its one lit key.
export function quiet(href: string, text: string) {
  return `<a href="${href}" style="font-family:${SANS};font-size:15px;color:${C.chalk};text-decoration:underline">${text}</a>`
}

// A thing set on the black inside the panel: the room showing through, the
// way a field is on the phone. `big` is what is read off it.
export function well(caption: string, big: string, color: string = C.chalk) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:22px 0 0">
    <tr>
      <td bgcolor="${C.void}" style="background:${C.void};border:1px solid ${C.edge};border-radius:3px;padding:10px 16px 8px">
        ${label(caption)}
        <div class="px" style="font-family:${PIXEL};font-size:48px;line-height:1;color:${color};margin:4px 0 0;letter-spacing:2px;mso-line-height-rule:exactly">${big}</div>
      </td>
    </tr>
  </table>`
}

// The code, for the one mail that still carries one (the old `send`, for a
// tab on an old build; every sign in is a link since 0065). Set so one long
// press or one double click takes the whole of it: a mail cannot write to a
// clipboard, but it can be easy to take.
export function code(value: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;margin:24px 0 0">
    <tr>
      <td bgcolor="${C.void}" align="center" style="background:${C.void};border:1px solid ${C.edge};border-radius:3px;padding:18px 12px 16px">
        <div class="px" style="font-family:${PIXEL};font-size:48px;line-height:1;letter-spacing:6px;padding-left:6px;color:${C.chalk};white-space:nowrap;
          -webkit-user-select:all;-moz-user-select:all;-ms-user-select:all;user-select:all;mso-line-height-rule:exactly">${value}</div>
      </td>
    </tr>
  </table>`
}

// Why this arrived, and the way out. Every mail has one, under the panel.
export function colophon(text: string) {
  return `<p style="font-family:${SANS};font-size:12px;line-height:1.6;margin:0;color:${C.dim};mso-line-height-rule:exactly">${text}</p>`
}

// A link in the foot, in the foot's colour.
export function footLink(href: string, text: string) {
  return `<a href="${href}" style="color:${C.ash};text-decoration:underline">${text}</a>`
}

// ── the room the whole thing sits in ─────────────────────────────────────────
// The header image, one panel with the mail's words on it, and the foot
// under the panel. `preheader` is the line an inbox shows beside the
// subject; `kicker` is a label over the headline, for a mail that needs one.
// `foot` is the colophon under the panel, and a sender that passes its old
// colophon inside `inner` still renders (celestual-remind).
export function frame({ kicker, inner, foot, preheader }: {
  kicker?: string
  inner: string
  foot?: string
  preheader?: string
}) {
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.void};opacity:0">${esc(preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>`
    : ''
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<meta name="x-apple-disable-message-reformatting">
<title>celestual.</title>
<style>
  @font-face { font-family: 'Jersey 10'; font-style: normal; font-weight: 400;
    src: url('${FONT}') format('woff2'); }
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; background: ${C.void}; -webkit-text-size-adjust: 100%; }
  a { color: ${C.chalk}; }
  @media (max-width: 560px) {
    .panel { padding: 26px 20px 24px !important; }
    .foot { padding: 20px 20px 0 !important; }
  }
</style>
<!--[if mso]>
<style>
  .px, h1, p, a, div, td { font-family: Helvetica, Arial, sans-serif !important; }
</style>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
</head>
<body bgcolor="${C.void}" style="margin:0;padding:0;background:${C.void};">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.void}" style="background:${C.void};border-collapse:collapse">
  <tr>
    <td align="center" style="padding:28px 12px 56px">
      <table role="presentation" width="${WIDTH}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${WIDTH}px;border-collapse:collapse">
        <tr>
          <td style="padding:0 0 16px;line-height:0">
            <a href="${SITE}" style="text-decoration:none"><img src="${HEAD}" width="${WIDTH}" alt="celestual."
              style="display:block;width:100%;max-width:${WIDTH}px;height:auto;border:0;outline:none;text-decoration:none;
              font-family:${SERIF};font-size:26px;line-height:1.2;color:${C.chalk};background:${C.void}" /></a>
          </td>
        </tr>
        <tr>
          <td class="panel" bgcolor="${C.lcd}" style="background:${C.lcd};border:1px solid ${C.edge};border-radius:3px;padding:30px 28px 28px;text-align:left">
            ${kicker ? `<div style="margin:0 0 14px">${label(kicker)}</div>` : ''}
            ${inner}
          </td>
        </tr>
        ${foot ? `<tr><td class="foot" style="padding:22px 28px 0;text-align:left">${foot}</td></tr>` : ''}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// A mono aside, kept for any sender that wants the identifier face.
export function mono(text: string, color: string = C.ash) {
  return `<span style="font-family:${MONO};font-size:13px;color:${color}">${text}</span>`
}
