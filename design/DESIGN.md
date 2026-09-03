# Celestual design system

The waypoint. Anything visual references this file.

Three inputs made it, and they are all in the repo:

| Input | What it settles |
| --- | --- |
| `design/source/eclipse.html` | the mark. Geometry, crossings, the size ladder, the lockup |
| `app/src/wall/wall.css` | the tokens, the type scale, the components, the motion |
| `docs/rebuild-spec.md` section 7 | the bar this has to clear, and the list it must not touch |

`design/components.html` is this file rendered. Open it before you build anything.
If a rule here and that page disagree, the page is wrong and it gets fixed.

`design/VOICE.md` is the writing half.

---

## 0. The system in one paragraph

A blue black room with a light off somewhere behind you. Almost everything in it
is unlit: type at three strengths of the same near white, hairlines at nine
percent, a field of drifting points that is felt more than seen, and a grain
over all of it so the black is a room rather than a screen that is off. Two
things are allowed to be bright, and both are rationed to once per screen: a
cream card, which is the only true surface in the product and is where anything
a person wrote actually lives, and one pale blue, which is the whole colour
budget. Four faces carry four different jobs and never each other's. Nothing is
downloaded: every ornament is a path or a loop, drawn from the same numbers as
the thing beside it.

---

## 1. The three rules

Everything below is downstream of these. If a decision is not covered, decide it
by asking which of these three it serves.

**1. The accent is rationed.** One saturated colour exists. Search the build for
`--accent` and the uses are countable on one hand, one of which is a four pixel
dot. An interface with a saturated accent everywhere is the most recognisable
machine made look on the web, and this product cannot afford to look generated.

**2. One bright thing per screen.** Either the paper or the bloom, never both
competing, and never two of either. The eye has to land somewhere, and a screen
where three objects are shouting has no landing place.

**3. Everything is drawn.** No icon set, no stock illustration, no bitmap
texture. The grain is `feTurbulence` generated in code, the field is a canvas
loop, the constellation beside a name is that name's own hash. An icon set does
not know what it is next to.

---

## 2. Colour

Every colour in the product is one of these tokens. Nothing names a hue anywhere
else. The declarations live in `app/src/wall/wall.css` under `.wl-root`.

### 2.1 The ground

Never pure black. Pure black is a screen that is off, this is a room.

| Token | Value | Where |
| --- | --- | --- |
| `--void` | `#08070B` | the ground, everywhere |
| `--void-1` | `#0D0C12` | a sheet laid on the ground |
| `--void-2` | `#131219` | a sheet laid on that |
| `--void-3` | `#1A1922` | a row, pressed |
| `--hair` | `rgba(244, 241, 234, 0.09)` | every visible dividing line |
| `--hair-soft` | `rgba(244, 241, 234, 0.05)` | a line that should be felt, not seen |

### 2.2 The light

Three strengths of one near white, and the third one has a hard rule on it.

| Token | Value | Where |
| --- | --- | --- |
| `--chalk` | `#F4F1EA` | primary type, the mark, a filled control |
| `--ash` | `#9C978E` | secondary. Meaningful text only |
| `--ash-dim` | `#605C55` | decorative and disabled only. Never body copy |

`--ash-dim` on `--void` is roughly 3.2:1. It is legible for a label and it is not
legible for a sentence somebody has to read. Putting prose in it is the single
easiest way to make this system look careless.

### 2.3 The paper

The only bright surface in the product, and the only place a person's own words
are ever set.

| Token | Value | Where |
| --- | --- | --- |
| `--paper` | `#E9E4D8` | the card's body |
| `--paper-hi` | `#F3EFE5` | its lit top edge |
| `--paper-edge` | `#CFC7B6` | its shadowed foot |
| `--paper-ink` | `#17150F` | type on paper |
| `--paper-ink-2` | `#6A6357` | secondary type on paper |

The card is a gradient across those three, plus its own grain at 16 percent in
`multiply`. Without the grain it is a beige rectangle. With it, it is a material.

### 2.4 The two bright things

| Token | Value | Where |
| --- | --- | --- |
| `--glow` | `#FFF4E4` | the bloom. A luminance, not a colour: warm white through a heavy blur |
| `--accent` | `#74C7DE` | the one saturated colour |
| `--accent-soft` | `rgba(116, 199, 222, 0.14)` | its wash, for a fill behind it |
| `--ember` | `var(--accent)` | the older name. Kept so nothing that reads it has to change |

**The accent, and why it is this one.** `design/source/eclipse.html` sets
`--ember: #F2661E`, an orange. The build moved off that colour deliberately in
commit `d0670bf`, "Seven things come off, and the accent stops being orange".
Asked to settle it, you chose the build's blue. So: the artifact is authoritative
for the mark's geometry and for nothing else, and `#74C7DE` is the accent. It is
ice, a cold light on a blue black ground, reading as the same night the mark is
drawn in, where the warm one read as a notification badge.

Two smaller values follow the same ruling, since the artifact and the build also
disagree on them. The build wins on both: `--ash` is `#9C978E` and `--hair` is
`rgba(244, 241, 234, 0.09)`.

`--void` and `--chalk` are identical in both files, so nothing was decided there.

Changing the accent is two lines. Nothing else in the build names a hue.

---

## 3. The mark

It is called Ecliptic. A four point star of four curves and no corners, inside a
ring that passes behind it at the top of its circuit and in front of it at the
bottom.

It is not a drawn asset. It is nine constants and two path builders in
`app/src/wall/mark.js`, which means it is exact at any size and there is no
vector file to keep in sync. `design/source/eclipse.html` is its specimen sheet:
four up positive and negative, the wordmark, a ladder from 128px to 12px, the
four places the ring and the star cross, and the geometric argument for the band.

### 3.1 The constants

| | | |
| --- | --- | --- |
| `rx` | 42 | the ring, to the middle of its band |
| `flat` | 0.5 | ry over rx, the viewing angle, applied to both edges |
| `tilt` | -19 | degrees off horizontal |
| `w` | 3.2 | half the band's width in the ring's own plane |
| `bias` | 1.2 | inner edge pushed to the far side, so the near half runs wider |
| `twist` | 2 | and turned, so the widest part walks round |
| `gutter` | 0.7 | the void between the ring and the star it crosses |
| `up`, `down`, `side` | 47, 47, 24 | the four arms |
| `thick` | 0.80 | how much body the arms carry. 1 is the sparkle exactly |

Two limits, both geometry rather than taste. The inner edge has to stay inside
the outer or the band breaks open, which happens past about `bias` 2 or `twist`
10. And every arm has to finish clear of the band, because an arm that ends
inside it is notched off and left as a floating tip. On the shipped constants the
edges come closest at 0.075, the side arms sit at 0.55 of the hole, and the
vertical arms clear the outer edge by 3.86.

### 3.2 The exports

`design/logo/`, all written by `node scripts/export-mark.mjs` from the constants
above. Regenerate rather than edit.

| File | For |
| --- | --- |
| `mark.svg` | embedding. Fills with `currentColor` |
| `mark-chalk.svg`, `mark-ink.svg` | a fixed ground |
| `mark-{chalk,ink}-{1024,512,128}.png` | transparent, for placement |
| `mark-chalk-on-void-1024.png`, `mark-ink-on-chalk-1024.png` | on their ground |
| `lockup-{chalk,ink}.png` | the mark and the word, rendered with the real face |
| `lockup.html` | the lockup as live markup |

The favicon is the same drawing again, from `eclipticSVG()` in `mark.js`, struck
in ink so it survives a near white tab strip and handed its chalk back by its own
`prefers-color-scheme` rule.

### 3.3 Placing it

- **Clear space.** Half the mark's height on every side. The star's vertical arms
  already overrun the ring, so the square it is drawn in carries some of this.
- **Smallest size.** 12px, which the ladder in the specimen sheet checks. Below
  that the band's far side closes up.
- **In the lockup**, the mark is 1.13 times the word's font size, and the gap is
  `0.38em`. The word is lifted `-0.03em` because a Didone's optical centre sits
  below its cap line.
- **Colour.** It takes `currentColor` always. That is what lets one component be
  the bar's brand, a card's letterhead and the overture's hero with no tone prop
  anywhere.

### 3.4 The constellation is a different object

`Mark` in `art.jsx` draws a small ring with points in it, seeded from a handle's
hash, and it stands wherever the design would otherwise put a photograph. It is
not the logo and it never stands in for it. Three strengths: `--mark-ring`,
`--mark-line`, `--mark-star`, plus `is-lit` for the one that matters on screen.

---

## 4. Type

Four faces, four jobs, and none of them does another's. Files are in
`app/public/fonts/`, fetched by `node scripts/fetch-faces.mjs` and served from
this origin. Nothing renders from a CDN.

| Token | Face | Job |
| --- | --- | --- |
| `--f-display` | Bodoni Moda | the emotional register. Anything a person means |
| `--f-letter` | EB Garamond | the reading face. Letters, and only letters |
| `--f-util` | Inter Tight | mechanics. Buttons, meta, explanation |
| `--f-id` | Geist Mono | identifiers. Handles, counts, dates, codes |

The fourth is structural, not decorative. Every handle, count, date and code is
monospaced because those are identifiers, and monospace is how a person reads
one. It is the only device in the build that encodes something true about what
it is setting.

Fallbacks are chosen for metric proximity, so a swap is invisible: a Didone falls
back to a Didone, a Garamond to an old style with the same x height.

All four are variable fonts and `faces.css` declares each as a weight range,
`400 900` for the display face, so any weight a rule asks for is drawn from the
axis rather than synthesised. Before this the files were clipped to 400 and 500
and a rule asking for 600 quietly got 500.

### 4.0 The display weight

`--w-display: 600` and `--opsz-display: 'opsz' 24`, declared on `.wl-root` and
read by every rule that sets the display face. Both are a legibility ruling,
not a taste.

A Didone is a thick stroke and a hairline, and on a blue black ground the
hairline is the half that goes: light on dark, a thin stroke loses luminance to
the ground around it in a way the same stroke in ink on paper does not. At 400
with the optical size left to the browser, the hero line at 46px lost the thin
side of every bowl and read as a row of stems. Weight 600 brings the hairlines
up to where they survive, and pinning the optical size to 24, the cut drawn for a
subhead, keeps them there at 46px where the browser would otherwise pick the
96 cut with the finest hairlines the face has. The contrast that makes it a
Didone is still there; the strokes that carry the letterforms are no longer the
first thing to disappear.

The same two tokens govern the lockup, the overture's word, a card's title, the
arrow link, the ledger line and the tab, so the face has one weight across the
product. `scripts/export-mark.mjs` sets the lockup exports at the same values.

### 4.1 The display scale

Fluid, not stepped. A Didone at 46px needs about 400px to hold a five word line
and the column has 350px at 390 wide, so a fixed size with a break in the markup
put the break inside the intended line. `clamp()` keeps the large size wherever
it fits and hands the type back to the browser where it does not.

| Class | Size | Line |
| --- | --- | --- |
| `.wl-display.is-xl` | `clamp(34px, 10.4vw, 46px)` | 1.03 |
| `.wl-display.is-l` | `clamp(30px, 8.8vw, 39px)` | 1.03 |
| `.wl-display.is-m` | `clamp(26px, 7.4vw, 33px)` | 1.03 |
| `.wl-display.is-s` | `clamp(21px, 5.8vw, 26px)` | 1.14 |

All four at `--w-display`, tracking `-0.018em`, `text-wrap: balance`.

### 4.2 The rest

| Role | Face | Size | Tracking |
| --- | --- | --- | --- |
| `.wl-label` | mono | 10.5px, uppercase | `0.15em` |
| `.wl-label.is-dim` | mono | 10.5px, uppercase, `--ash-dim` | `0.13em` |
| `.wl-prose` | letter | 16.5px / 1.52 | `0.002em` |
| `.wl-arrow` | display | 21px, or 16px at `is-s`, at `--w-display` | |
| `.wl-pill` | util | 13.5px / 500 | `0.008em` |
| `.wl-row-handle` | mono | 14px | `-0.012em` |
| `.wl-row-meta` | util | 11.5px | `0.004em` |
| `.wl-field input` | mono | 22px, or 28px at `is-lg` | `-0.012em` |

A handle set inside a label keeps its case. Handles are lower case identifiers
and uppercasing one makes a different string from the one on the wall.

---

## 5. Space and geometry

### 5.1 The column

460px, centred, and the void bleeds to the edges of the viewport. It refuses to
fill a large screen on purpose: a surface met almost entirely on a phone, after
picking a card up off a table, should not stretch into a dashboard to prove that
it can. The empty field around the column is the design.

| | |
| --- | --- |
| `--pad` | 22px, dropping to 16px under 360px, rising to 40px at 900px |
| max width | 460px, rising to 1080px at 900px where the layout becomes a spread |
| page min height | `100dvh` |

At 900px and up three things change and nothing else: the wall becomes a two
column spread, sheets stop being bottom sheets and become centred dialogs, and
the core service puts its ring system beside its ledger.

### 5.2 Radii

One family, and it is soft. The reference card is generously rounded and the
reference poster has no boxes at all.

| Token | Value | Where |
| --- | --- | --- |
| `--r-sheet` | 26px | a sheet's top corners |
| `--r-card` | 18px | the paper |
| `--r-field` | 12px | an input that has a box |
| `--r-pill` | 999px | every capsule and icon button |

A row uses 14px, which is the one exception, because a 18px radius on a 60px tall
row reads as a card and a row is not one.

### 5.3 Rhythm

Vertical spacing is on no strict scale, but the values in use are few and they
repeat: 2, 4, 6, 8, 11, 13, 14, 18, 22, 26. Reach for one of those before
inventing a number.

---

## 6. Motion

### 6.1 The curves

| Token | Value | For |
| --- | --- | --- |
| `--ease` | `cubic-bezier(0.16, 1, 0.30, 1)` | almost everything. A hard start, a long settle |
| `--ease-out` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | travel that should not overshoot |

Named sweeps use `cubic-bezier(0.33, 0.02, 0.15, 1)`, which is slow at both ends,
for anything drawn along its own path.

### 6.2 The durations

Chosen per element, never a default applied everywhere.

| | |
| --- | --- |
| 200 to 240ms | a colour, a border, a hover |
| 220ms | a control's whole state change |
| 260 to 340ms | a dimming, an entrance |
| 380 to 420ms | a sheet arriving, the close mark's quarter turn |
| 520ms | the focus line drawing across a field |
| 620 to 900ms | the field changing speed, a rise, a sweep |
| 1200 to 1600ms | a bloom, a starfield fading out |

### 6.3 The named sequences

| Name | What it does |
| --- | --- |
| `wl-rise` | 22px up and in. The default entrance |
| `wl-fade` | opacity only, for something that must not move |
| `wl-rise-sheet`, `wl-drop-sheet` | a sheet off and back to the bottom edge |
| `wl-twinkle` | the sparkle, 3600ms, scale and rotation, staggered by `--spark-delay` |
| `wl-converge`, `wl-land` | the letter going up and the card landing |
| `wl-sheen`, `wl-lead`, `wl-breathe` | the overture, the circuit, the pulse |

Stagger by 60 to 220ms. Two objects entering on the same frame read as one.

### 6.4 Reduced motion

Not a blanket `animation: none`. Two sequences are the only way a screen ever
reaches its final state, and switching those off leaves somebody looking at an
empty page. The JavaScript honours the preference by jumping to the last beat,
and the stylesheet removes what is left: drift, travel, blur and the twinkle.
Everything ends where it was going, it just does not move to get there.

Every surface has to be correct as a still frame. If it is not, the motion is
carrying meaning that the layout should have carried.

---

## 7. The ground

Three fixed layers under everything, in this order, never reordered.

| Layer | What it is |
| --- | --- |
| `.wl-halo` | one enormous off centre warm radial at 7.5 percent, plus a cold one at 4.5. It is what stops the void reading as `#000` with things on it |
| `.wl-starfield` | the point field. A canvas today, WebGL on the signature surfaces |
| `.wl-grain` | `feTurbulence` at `baseFrequency 0.84`, three octaves, desaturated, 3.6 percent, tiled at 190px |

The grain is load bearing rather than decoration. Without it the black is a dead
screen. It uses plain opacity and no `mix-blend-mode`, because a blending sheet
over a live canvas takes every animation off the compositor's fast path and
there is a canvas of drifting points directly underneath it.

---

## 8. The components

Every one of these is on `design/components.html` in each of its states.

### 8.1 Controls

| Component | Class | Notes |
| --- | --- | --- |
| Primary capsule | `.wl-pill.is-light` | chalk fill, ink type, 40px, 50px at `is-wide`. One per screen |
| Ghost capsule | `.wl-pill.is-ghost` | hairline, ash type, 32px |
| Tag capsule | `.wl-pill.is-tag` | not a control. `pointer-events: none` |
| Arrow link | `.wl-arrow` | display face. The arrow travels on hover, the word does not |
| Icon button | `.wl-iconbtn` | 38px, `is-on` lights the ground behind the glyph |
| Close | `.wl-close` | 36px hairline ring, turns a quarter under the pointer |
| Quiet control | `.wl-quiet` | a sentence that is a control. Second option under a primary, and nothing else |
| Claim | `.wl-mine` | hairline capsule. A control with a consequence, so not a link |

There were four pill roles. The filled saturated one had one caller in the whole
build and it was spending the entire colour ration on a word beside a date that
had already said it. The role went with the caller.

### 8.2 Surfaces

| Component | Class | Notes |
| --- | --- | --- |
| Paper | `.wl-paper` | the cream card. Variants `is-empty`, `is-theirs`. Its own grain, its own crest, a head of two cells and a foot |
| Sheet | `.wl-sheet` | rises off the bottom edge over a wall that stays mounted, dimmed and slightly out of focus behind it. A centred dialog at 900px |
| Row | `.wl-row` | the constellation where a photograph would be. `is-lit` for the one that matters |
| Dock | `.wl-dock` | a sticky gradient off the bottom edge. Why the composer never has to be advertised |
| Top bar | `.wl-top` | the mark is the way home, and it is chalk while everything beside it is ash |

### 8.3 Fields

A bare baseline, not a box. The `@` is painted beside the input, is never in the
value, and cannot be backspaced away. On focus a gradient line draws across the
rule in 520ms and the `@` lifts from `--ash-dim` to `--ash`.

| Component | Class |
| --- | --- |
| Handle field | `.wl-field`, `.wl-field.is-lg` |
| Letter field | `.wl-letterfield`, on paper, with `.wl-count` under it |
| Address and code | `.wl-addr`, `.wl-code` |
| Reason | `.wl-reason` |

### 8.4 Drawn things

| Component | What |
| --- | --- |
| `Sparkle` | the four point star. `twinkle` and `delay` |
| `Ecliptic` | the mark. `size`, `sweep` |
| `Mark` | the constellation, seeded from a handle |
| `Halftone` | the dotted sphere |
| `Bloom` | the soft blurred mass. The whole accent system, spent once |
| `Field` | the drifting points |
| `Dots` | step dots. The one place in the build with a sequence worth counting |

---

## 9. States

Every interactive thing has all five, and `components.html` shows them.

| State | Rule |
| --- | --- |
| rest | as documented above |
| hover | one step brighter. Never a size change on anything with type in it |
| focus | `1px solid rgba(244, 241, 234, 0.55)`, offset 3px, radius 2px. Never removed |
| active | `scale(0.975)` on a capsule, nothing on a link |
| disabled | `--ash-dim` type, `rgba(244, 241, 234, 0.13)` fill, `cursor: default` |

Empty, loading and error states are part of a component, not an afterthought:

- **Empty** says what would be here and offers the one action that fills it.
- **Loading** is `.wl-waiting`, a sparkle and a line of ash. No spinner.
- **Error** is a plain sentence in `--accent`, in place, next to what failed. No
  banner, no dialog, no exclamation mark.

---

## 10. The ban list

From `docs/rebuild-spec.md` section 7.1. This is a gate, not a preference. Run it
against every screenshot before a surface is presented.

- [ ] No centred hero with a headline, a subhead and two side by side buttons
- [ ] No three or four column feature card grid
- [ ] No icon plus title plus paragraph blocks
- [ ] No gradient filled buttons
- [ ] No `box-shadow` utility class used for depth
- [ ] No emoji used as iconography
- [ ] No stock vector illustration, undraw style figure, or generic 3D blob
- [ ] No lorem ipsum or placeholder copy of any kind
- [ ] No button reading "Get started", "Learn more", or "Join the waitlist"
- [ ] No Tailwind default palette value. Every colour is a token from section 2
- [ ] No `transition: all` with a default duration

And four this system adds, because they are the ways it specifically goes wrong:

- [ ] The accent appears more than once on the screen
- [ ] Two bright objects compete, or none exists
- [ ] Body copy is set in `--ash-dim`
- [ ] A face is doing another face's job

---

## 11. The visual loop

Mandatory for every signature surface and every page in a UI phase.
`docs/rebuild-spec.md` section 7.3.

1. Build the surface.
2. `npm run shots` renders it at 390x844 and 1440x900.
3. Open both files and actually look at them.
4. Critique against `design/source/`, this file, and section 10. Write it down.
5. Revise. Repeat.

Three rounds minimum before anything is presented. A surface that has not been
viewed is not finished, whatever the build says.

`scripts/shots.mjs` drives it. It uses the Chromium already on the machine when
`CHROMIUM_PATH` is set, and Playwright's own otherwise.

---

## 12. Where things live

| Path | What |
| --- | --- |
| `design/DESIGN.md` | this file |
| `design/VOICE.md` | the copy rules |
| `design/components.html` | every component, colour, type size and state |
| `design/source/eclipse.html` | the mark's specimen sheet |
| `design/logo/` | the exports, all generated |
| `app/src/wall/wall.css` | the tokens and the components, in code |
| `app/src/wall/mark.js` | the mark's geometry |
| `app/src/wall/art.jsx` | every drawn ornament |
| `app/public/fonts/` | the four faces, and the `faces.css` that declares them |
| `scripts/export-mark.mjs` | writes `design/logo/` |
| `scripts/fetch-faces.mjs` | writes `app/public/fonts/` |
| `scripts/shots.mjs` | the screenshot loop |

### The one that is not here

`docs/DESIGN.md` documented the bindery: a leather case, one hue from chocolate
to ivory, materials drawn per pixel. That system is retired by
`docs/rebuild-spec.md` section 2 and this file replaces it. Its code is still
live at the old routes until the Wall and Main rebuild lands, and it is held in
git history until then.
