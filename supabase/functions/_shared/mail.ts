// CELESTUAL — the mail, cut and finished. One design, five senders.
//
// Every email the product sends used to be written where it was sent from, so
// there were five of them and no two agreed: three different grounds, two
// different accent colours, four button radii, and a wordmark that appeared on
// some and not others. That is not a small thing for a product whose only
// contact with a person who is not looking at a screen IS an email.
//
// So the frame lives here and the senders own only their words.
//
// ── the design ───────────────────────────────────────────────────────────────
// It is the product's, which since the Bindery transfer means a hand-bound
// almanac: a leather case, blind-tooled; ivory leaves tipped in, where the
// writing happens. Three consequences, and every value below serves one:
//
//   1. ONE HUE. Chocolate through ivory, and nothing else. No second accent, no
//      state colour, no red, no green, no blue. A thing stands out by being
//      closer to ivory. Caramel is used ONCE per mail.
//   2. MATERIALS, NOT EFFECTS. Nothing glows. There is no text-shadow anywhere
//      in this file, and there is no radial-gradient nebula: the old templates
//      painted four coloured clouds in the corners of every message, which is a
//      picture of a galaxy rather than the thing this product is made of.
//   3. PRESSED, NOT ROUNDED. Two corners: 2px and 3px. The 14px pills the
//      buttons used to wear are the single fastest tell that nobody chose
//      anything.
//
// ── and the constraint that shapes all of it ─────────────────────────────────
// Mail clients are a decade behind. No web fonts (Gmail strips the @font-face
// and half of them ignore the link), no CSS custom properties, no flexbox worth
// trusting, and Outlook renders through Word. So every rule is inline, the
// layout is one centred table-free column of block elements, and the three
// faces fall back honestly: Georgia stands in for the garalde, Arial for the
// geometric sans, Courier for the stamp. The design survives that because it was
// never carried by the typefaces — it is carried by the value scale, the rules,
// and the fact that nothing is round.

// ── the case ─────────────────────────────────────────────────────────────────
// The same tokens as app/src/theme.js. Kept as literals rather than imported
// because an edge function does not share a bundle with the front end, and a
// colour that drifts between the two is worse than one written twice.
export const C = {
  ink: '#0B0705', //     the closed case
  ink2: '#241710', //    cocoa: the page ground, a panel lying on it
  ink3: '#2F1E13', //    hide: a raised panel, a well
  cognac: '#5C3A1F',
  saddle: '#8A5C33',
  caramel: '#B98A55', // the one light. once per mail.
  wheat: '#D6B78A',
  cream: '#F1E7D3', //   ivory: the reading colour
  paper: '#F1E7D3',
  onPaper: '#241811',
  quiet: '#A2937E', //   the mechanical voice
  faint: '#7A6A5B', //   ticks, footnotes, the legal foot
  line: 'rgba(241,231,211,0.11)',
  lineFaint: 'rgba(241,231,211,0.055)',
}

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "Arial, Helvetica, sans-serif"
const MONO = "'Courier New', Courier, monospace"

// ── the mark ─────────────────────────────────────────────────────────────────
// The product's own sigil, as an inline SVG data URI. Every client that renders
// HTML mail renders an <img>, and a data URI needs no host, no tracking pixel
// and no round trip. It is the same drawing the app signs its name with: one
// four-pointed star, the same star turned half a turn about the body, and the
// cut between them showing the ground through.
//
// The cut has to be painted here rather than left transparent — an email has no
// way to know what is behind it — so it is painted the case's own colour, which
// is what is behind it on every mail this file builds.
function sigil(size = 30, ground = C.ink) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="121.2" viewBox="0 0 100 121.2">` +
    `<defs><clipPath id="l"><rect x="-10" y="-10" width="59" height="141"/></clipPath>` +
    `<clipPath id="r"><rect x="51" y="-10" width="59" height="141"/></clipPath>` +
    `<linearGradient id="b" x1="0.12" y1="0.02" x2="0.86" y2="1">` +
    `<stop offset="0%" stop-color="#F2DCCC"/><stop offset="52%" stop-color="#DCB39A"/>` +
    `<stop offset="100%" stop-color="#BE8C71"/></linearGradient></defs>` +
    // The left wing: the same star, turned a hundred and eighty degrees about
    // the body — so the long point that reaches up on one side reaches down on
    // the other. Both paths are the app's own geometry (ui.jsx SIGIL), traced
    // out here because an edge function cannot import a component.
    `<path clip-path="url(#l)" fill="#BFAAA1" d="M49.1 25.6Q54.01 61.6 98.2 65.6Q54.01 71.16 49.1 121.2Q44.19 71.16 0 65.6Q44.19 61.6 49.1 25.6Z"/>` +
    // the right wing
    `<path clip-path="url(#r)" fill="#8D7169" d="M50.9 0Q55.81 50.04 100 55.6Q55.81 59.6 50.9 95.6Q45.99 59.6 1.8 55.6Q45.99 50.04 50.9 0Z"/>` +
    // where the cut opens out around the body, and the body itself
    `<circle clip-path="url(#l)" cx="50" cy="60.6" r="16" fill="${ground}"/>` +
    `<circle cx="50" cy="60.6" r="11.6" fill="url(#b)"/></svg>`
  const src = `data:image/svg+xml;base64,${btoa(svg)}`
  return `<img src="${src}" width="${size}" height="${Math.round(size * 1.212)}" alt="" style="display:block;margin:0 auto;border:0" />`
}

// ── the parts ────────────────────────────────────────────────────────────────

// A tooled rule: the dark channel the tool cut, and the light catching on its
// upper lip. Two one-pixel divs, because a mail client will not render a
// gradient reliably and this is more honest anyway.
export function rule(width = '100%') {
  return (
    `<div style="width:${width};margin:0 auto;height:1px;background:rgba(0,0,0,0.4);font-size:0;line-height:0">&nbsp;</div>` +
    `<div style="width:${width};margin:0 auto;height:1px;background:rgba(255,226,186,0.10);font-size:0;line-height:0">&nbsp;</div>`
  )
}

// The stamped label: uppercase, tracked wide enough to read as a caption printed
// on a plate rather than as small text.
export function label(text: string, color = C.faint) {
  return `<div style="font-family:${SANS};font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:${color};margin:0">${text}</div>`
}

// The one headline a mail is allowed. A garalde set large and light, leading
// pulled tight, so it reads as a title page rather than a hero section.
export function title(text: string) {
  return `<h1 style="font-family:${SERIF};font-weight:400;font-size:34px;line-height:1.06;letter-spacing:-0.4px;margin:14px 0 0;color:${C.cream}">${text}</h1>`
}

// The reading register.
export function body(text: string) {
  return `<p style="font-family:${SANS};font-size:15px;line-height:1.72;margin:20px auto 0;max-width:380px;color:${C.quiet}">${text}</p>`
}

// Metadata. Courier only, and never allowed to carry a feeling.
export function tick(text: string, color = C.faint) {
  return `<p style="font-family:${MONO};font-size:12px;letter-spacing:0.8px;line-height:1.6;margin:14px 0 0;color:${color}">${text}</p>`
}

// The plate: a letterpress button. Ivory stock, the label struck into it, a
// keyline printed inside the trim. Two nested divs rather than padding on the
// anchor, because Outlook collapses padding on inline elements and the keyline
// is the part that makes it an object.
export function plate(href: string, text: string) {
  return `
  <div style="margin:30px 0 0">
    <a href="${href}" style="display:inline-block;background:${C.paper};color:${C.onPaper};text-decoration:none;
      border-radius:2px;padding:3px">
      <span style="display:block;border:1px solid rgba(36,24,17,0.18);border-radius:1px;padding:14px 30px;
        font-family:${SANS};font-size:11.5px;letter-spacing:2.4px;text-transform:uppercase;color:${C.onPaper}">${text}</span>
    </a>
  </div>`
}

// A code, struck into a well pressed into the leather. The old one was a
// glowing amber number inside a rounded box; this is a number stamped into a
// recess, which is what a one-time code actually is.
export function code(value: string) {
  return `
  <div style="margin:28px auto 0;max-width:280px;background:${C.ink};border:1px solid ${C.line};border-radius:2px;padding:20px 10px 18px">
    <div style="font-family:${MONO};font-size:40px;letter-spacing:11px;padding-left:11px;line-height:1;color:${C.cream};white-space:nowrap">${value}</div>
  </div>`
}

// The colophon: why this arrived, and the way out. Every mail carries one.
export function colophon(text: string) {
  return `
  <div style="margin:38px auto 0;max-width:400px">
    ${rule('40px')}
    <p style="font-family:${SANS};font-size:11px;line-height:1.75;margin:16px 0 0;color:${C.faint}">${text}</p>
  </div>`
}

// ── the case the whole thing sits in ─────────────────────────────────────────
// The blind-tooled border every screen in the product hangs inside, at mail
// scale: a heavy fillet and a light one, on the leather, on the closed case.
// `kicker` is the one stamped label at the head; it is optional, and a mail
// should drop it whenever the headline underneath already says the same thing.
export function frame({ kicker, inner }: { kicker?: string; inner: string }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:${C.ink}">
  <div style="background:${C.ink};padding:28px 14px;margin:0">
    <div style="max-width:480px;margin:0 auto;background:${C.ink2};border-radius:3px;padding:12px">
      <div style="border:1px solid rgba(241,231,211,0.075);border-radius:2px;padding:1px">
        <div style="border:1px solid rgba(241,231,211,0.04);padding:38px 22px 34px;text-align:center">
          ${sigil(30, C.ink2)}
          ${kicker ? `<div style="margin:26px 0 0">${label(kicker)}</div>` : ''}
          ${inner}
        </div>
      </div>
    </div>
  </div>
</body></html>`
}
