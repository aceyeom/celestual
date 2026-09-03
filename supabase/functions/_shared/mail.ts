// CELESTUAL: the mail, cut and finished. One design, and the senders own only
// their words.
//
// Phase 8. Rebuilt on the system the rest of the product is in. It used to be
// the Bindery's: a leather case, chocolate through ivory, blind tooled borders,
// nothing round. docs/plan.md finding 1.9 retired that system, so this is the
// same argument made again in the one that won.
//
// ── THE SYSTEM, AT MAIL SCALE ────────────────────────────────────────────────
// app/src/wall/wall.css, and every value below is one of its tokens:
//
//   THE VOID, NOT BLACK.  #08070B. Pure black is a screen that is off; this is
//                         a room. Sheets are laid on it, one step lighter.
//   ONE BRIGHT SURFACE.   The paper, #E9E4D8, and it is the only one. On the
//                         wall it means somebody wrote this; here it is the
//                         one thing to press, and there is one per mail.
//   THE ACCENT, RATIONED. #74C7DE, and wall.css says it is the whole chromatic
//                         budget of the product. At most one use per mail, on
//                         the single fact that matters most, and most mails
//                         spend none of it.
//   NOTHING GLOWS.        No text-shadow, no gradient nebula, no second accent
//                         and no state colour. A thing stands out by being
//                         closer to chalk.
//
// ── LEFT ALIGNED, WHICH IS THE WHOLE TELL ────────────────────────────────────
// Every transactional mail ever sent is a centred column with a centred pill in
// the middle of it. That is what this was on the first pass, and looking at it
// is what showed the problem: it was a perfectly good email belonging to no
// product at all.
//
// The wall is left aligned type with a great deal of room around it, and so is
// this. A rag on the right is the single cheapest signal that a person set the
// page rather than a template generator, it costs nothing in any client, and it
// is also simply easier to read: a centred paragraph moves its own left edge on
// every line, so the eye hunts for the start of the next one.
//
// ── AND THE CONSTRAINT THAT SHAPES ALL OF IT ─────────────────────────────────
// Mail clients are a decade behind. No web fonts (Gmail strips @font-face and
// half of them ignore the link), no custom properties, no flexbox worth
// trusting, and Outlook renders through Word. So every rule is inline, the
// layout is one centred column of block elements, and the four faces fall back
// honestly: a Didone to Didot then Georgia, the garalde to Georgia, the util
// sans to Arial, the mono to Courier. The design survives that because it was
// never carried by the typefaces. It is carried by the value scale and by what
// is absent.
//
// ── WHY THERE IS NO MARK IMAGE ───────────────────────────────────────────────
// There used to be one, as an inline SVG data URI, and it rendered in almost
// nothing. Gmail does not render SVG in an <img> at all, and it proxies every
// image through its own cache, which drops data: URIs; Outlook.com strips them
// too. So the sigil at the head of every mail this product has ever sent was, in
// the two clients most of its readers use, a broken image icon or a blank.
//
// A raster at a public URL would work, and there is nowhere to serve one from
// yet. So the mail signs itself the way it can: the wordmark, as type, tracked
// wide. It renders identically everywhere and it cannot break.
// docs/launchsteps.md section 6 carries what a hosted mark would need.

// ── the tokens ───────────────────────────────────────────────────────────────
// The same values as app/src/wall/wall.css. Kept as literals rather than
// imported because an edge function does not share a bundle with the front end,
// and a colour that drifts between the two is worse than one written twice.
export const C = {
  void: '#08070B', //      the ground. never pure black
  void1: '#0D0C12', //     a sheet laid on it
  void2: '#131219', //     a sheet laid on that
  chalk: '#F4F1EA', //     what you are meant to read
  ash: '#9C978E', //       the quieter voice. meaningful text only
  ashDim: '#605C55', //    a footnote, a tick, the legal foot
  paper: '#E9E4D8', //     the one bright surface. once per mail
  paperInk: '#17150F',
  paperInk2: '#6A6357',
  accent: '#74C7DE', //    the whole chromatic budget. at most once per mail
  // Hairlines are rgba on the wall. A mail cannot be trusted with alpha over an
  // arbitrary ground, so these are the flattened values against the void.
  hair: '#232228',
  hairSoft: '#181820',
}

// wall.css --f-display, --f-util and --f-id, each with the fallback a mail
// client will actually reach for. Chosen for metric proximity, not taste.
//
// --f-letter is deliberately absent. On the wall that face carries what people
// wrote to each other and nothing else, and no mail this product sends quotes a
// letter: the mutual note says THAT a card exists and never a word of what it
// says, because a mail is forwarded, screenshotted and left open on a desk, and
// none of that is a thing we get to do to somebody else's message. If a mail
// ever does carry one, it needs the letter face and this is where it goes.
const DISPLAY = "Didot, 'Bodoni MT', 'Playfair Display', Georgia, 'Times New Roman', serif"
const UTIL = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const MONO = "'SF Mono', Menlo, Consolas, 'Courier New', Courier, monospace"

// ── the parts ────────────────────────────────────────────────────────────────

// A hairline. One div, one colour: the wall's rules are a single 1px line and
// the two-line tooled channel belonged to leather.
export function rule(width = '100%') {
  return `<div style="width:${width};height:1px;background:${C.hair};font-size:0;line-height:0">&nbsp;</div>`
}

// The stamped label. wall.css .wl-label: mono, 10.5px, tracked to 0.15em,
// uppercase, ash. It is a caption printed on a plate, not small text.
export function label(text: string, color = C.ash) {
  return `<div style="font-family:${MONO};font-size:11px;letter-spacing:1.7px;text-transform:uppercase;color:${color};margin:0">${text}</div>`
}

// The one headline a mail is allowed. wall.css .wl-display: a Didone, set large
// and light, leading pulled tight, so it reads as a title page.
export function title(text: string) {
  return `<h1 style="font-family:${DISPLAY};font-weight:400;font-size:34px;line-height:1.04;letter-spacing:-0.6px;margin:16px 0 0;color:${C.chalk}">${text}</h1>`
}

// The reading register.
export function body(text: string) {
  return `<p style="font-family:${UTIL};font-size:15px;line-height:1.62;margin:20px 0 0;max-width:380px;color:${C.ash}">${text}</p>`
}

// Metadata. Mono only, and never allowed to carry a feeling.
export function tick(text: string, color = C.ashDim) {
  return `<p style="font-family:${MONO};font-size:12px;letter-spacing:0.4px;line-height:1.6;margin:16px 0 0;color:${color}">${text}</p>`
}

// The one thing to press: the paper, which is the only bright surface the
// product has. A pill, because every control in this system is a pill, and
// Outlook rendering it square is a rounded corner lost rather than a design
// lost.
export function plate(href: string, text: string) {
  return `
  <div style="margin:30px 0 0">
    <a href="${href}" style="display:inline-block;background:${C.paper};color:${C.paperInk};text-decoration:none;
      border-radius:999px;padding:15px 34px;
      font-family:${UTIL};font-size:14px;font-weight:500;letter-spacing:0.1px;color:${C.paperInk}">${text}</a>
  </div>`
}

// A one time code. It is the only thing on the screen it is on, so it is set at
// the size of a thing you read off one device and type into another, in the
// mono face, where no glyph can be mistaken for another one.
export function code(value: string) {
  return `
  <div style="margin:26px 0 0;background:${C.void2};border:1px solid ${C.hair};border-radius:14px;padding:22px 22px 20px">
    <div style="font-family:${MONO};font-size:38px;letter-spacing:10px;line-height:1;color:${C.chalk};white-space:nowrap">${value}</div>
  </div>`
}

// The colophon: why this arrived, and the way out. Every mail carries one.
export function colophon(text: string) {
  return `
  <div style="margin:38px 0 0;max-width:400px">
    ${rule('44px')}
    <p style="font-family:${UTIL};font-size:11.5px;line-height:1.7;margin:18px 0 0;color:${C.ashDim}">${text}</p>
  </div>`
}

// ── the case the whole thing sits in ─────────────────────────────────────────
// One sheet on the void, with the wordmark at its head. `kicker` is the one
// stamped label above the headline; a mail should drop it whenever the headline
// underneath already says the same thing.
export function frame({ kicker, inner }: { kicker?: string; inner: string }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:${C.void}">
  <div style="background:${C.void};padding:34px 14px 60px;margin:0">
    <div style="max-width:480px;margin:0 auto;background:${C.void1};border:1px solid ${C.hairSoft};border-radius:22px;padding:34px 28px 36px;text-align:left">
      <!-- The signature. A hairline under it rather than beside it, so it reads
           as the head of a sheet rather than as a caption floating over one. -->
      <div style="font-family:${UTIL};font-size:12px;font-weight:500;letter-spacing:3.4px;text-transform:uppercase;color:${C.chalk};margin:0 0 16px">celestual</div>
      ${rule('100%')}
      ${kicker ? `<div style="margin:30px 0 0">${label(kicker)}</div>` : '<div style="height:12px;font-size:0;line-height:0">&nbsp;</div>'}
      ${inner}
    </div>
  </div>
</body></html>`
}
