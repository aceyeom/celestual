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
| `--paper` | `#F4F1EA` | the card's body. Chalk: the same white as the type and the capsule |
| `--paper-hi` | `#FFFDF8` | its lit top edge |
| `--paper-edge` | `#E3DFD6` | its shadowed foot |
| `--paper-ink` | `#17150F` | type on paper |
| `--paper-ink-2` | `#6A6357` | secondary type on paper |

The card is a gradient across those three, plus its own grain at 16 percent in
`multiply`. Without the grain it is a white rectangle. With it, it is a material.
It used to be a cream a step warmer than chalk, and a letter that read as ivory
beside a white button and white type was two whites in one product; the paper
is chalk now, and the grain and the gradient are what make it paper.

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

### 3.4 The face is a different object

`Face` in `parts.jsx` is the disc that stands beside a handle everywhere in the
product: the account's own picture when the resolver has it
(`docs/HANDLE-RESOLVER.md`), and a monogram in the identifier face until then
and otherwise. It is the same object at every size, on the void and struck in
ink on paper, so the person you confirmed against under the field is the person
on your sky, in the wall's search and on the card. It is not the logo and it
never stands in for it.

It replaced the constellation. `Mark` in `art.jsx` still draws that small ring
with points seeded from a handle's hash, and `components.html` still shows it,
but nothing in the product draws it any more: it stood where a photograph would
be while there was no photograph, and there is one now. A product that draws a
person as a hash on one screen and as their own face on the next is two
products.

### 3.5 The mark as a material

`LiquidMark` is the mark poured: a liquid metal shader cut to the mark's own
silhouette. It is spent on exactly the moments that are the product's, and on
nothing else: the intro (on both surfaces), the seal on the hero's scene, the
seal on a mutual row on the sky, and the reveal. Wherever the mark is a glyph
rather than an event (the bar, a sheet's head, the favicon) it is `Ecliptic`,
flat. Nothing glows behind the metal. The metal is the light.

### 3.6 The brand, on every bar

`Brand` in `parts.jsx` is the lockup as a control: the mark at 26px and the
name beside it in the display face at 22px, both chalk while the row around
them is ash. It is the way home on every bar in the product, the front door's,
Main's flow screens' and the wall's, and it stands again at the head of the
site's foot. It used to be three things: the word alone on the front door, the
mark alone on Main's other screens, and the mark alone on the wall, which is
how one product came to sign itself three ways. Off the wall it grows the
chevron the wall's sheets use, so "back" and "home" are the same target in the
same place.

---

## 4. Type

Three faces, and the first does two jobs at two ends of one axis. Files are in
`app/public/fonts/`, fetched by `node scripts/fetch-faces.mjs` and served from
this origin. Nothing renders from a CDN.

| Token | Face | Job |
| --- | --- | --- |
| `--f-display` | Newsreader, display cut | the emotional register. Anything a person means |
| `--f-letter` | Newsreader, text cut | reading. Letters, and the explanation of the mechanic |
| `--f-util` | Inter Tight | mechanics. Buttons, meta, counts' captions |
| `--f-id` | Geist Mono | identifiers. Handles, counts, dates, codes |

The fourth is structural, not decorative. Every handle, count, date and code is
monospaced because those are identifiers, and monospace is how a person reads
one.

**Why one serif and not two.** The system shipped with Bodoni Moda for display
and EB Garamond for letters, and neither survived the void. A Didone is a thick
stroke and a hairline, and light on dark the hairline is the half that goes: at
46px the hero line lost the thin side of every bowl. Weighting it to 600 fixed
the legibility and left a face that was heavy without being pretty. The
replacement was chosen off a pairing sheet of twenty candidates set as the
actual hero block on the actual ground (`design/shots/type-pairings.png`, regenerated by `scripts/shots.mjs`; the shots are not committed).
Newsreader won on three counts: it is a transitional serif, so the contrast is
moderate and nothing vanishes on dark; it is drawn along an optical size axis
from 6 to 72, so a 48px headline and a 17px paragraph are two cuts of one
design rather than two designers' faces asked to agree; and set as reading copy
it stops the secondary text reading as interface.

**Explanation is reading, not mechanics.** Inter Tight used to carry every
paragraph that explained the product. It is a fine face for a capsule, a field's
meta and a caption under a count, and at fifteen pixels in ash a paragraph set in
it read as chrome: correct, plain and skipped. The paragraphs are in the reading
face now, at 17px, on the front door and on the flow screens after it, so the
explanation speaks in the product's own voice. Inter Tight keeps the controls.

Fallbacks are chosen for metric proximity, so a swap is invisible: Newsreader
falls back to an old style with a similar x height.

All three are variable fonts and `faces.css` declares each as a weight range,
`200 800` for Newsreader, so any weight a rule asks for is drawn from the axis
rather than synthesised.

### 4.0 The display tokens

`--w-display: 500`, `--opsz-display: normal` and `--track-display: -0.022em`,
declared on `.wl-root` and read by every rule that sets the display face: the
scale below, the lockup, the intro and the overture, a card's title, the arrow
link, the ledger line and the tab. The exporter sets the lockup PNGs at the
same values.

Weight 500 because the 400 is a text weight and reads thin light on dark, and
the 600 starts to clot at 48px. The optical size is left to the browser, which
hands a 48px line the 48 cut and a 22px card title the 22 cut, each drawn for
its size. Tracking tightens a little at display size, as a transitional serif
expects; the text cut is set with none.

### 4.1 The display scale

Fluid, not stepped. A Didone at 46px needs about 400px to hold a five word line
and the column has 350px at 390 wide, so a fixed size with a break in the markup
put the break inside the intended line. `clamp()` keeps the large size wherever
it fits and hands the type back to the browser where it does not.

| Class | Size | Line |
| --- | --- | --- |
| `.wl-display.is-xl` | `clamp(34px, 10.4vw, 46px)` | 1.06 |
| `.wl-display.is-l` | `clamp(30px, 8.8vw, 39px)` | 1.06 |
| `.wl-display.is-m` | `clamp(26px, 7.4vw, 33px)` | 1.06 |
| `.wl-display.is-s` | `clamp(21px, 5.8vw, 26px)` | 1.14 |

All four at `--w-display`, tracking `--track-display`, line 1.06, `text-wrap: balance`.

### 4.2 The rest

| Role | Face | Size | Tracking |
| --- | --- | --- | --- |
| `.wl-label` | mono | 10.5px, uppercase | `0.15em` |
| `.wl-label.is-dim` | mono | 10.5px, uppercase, `--ash-dim` | `0.13em` |
| `.wl-prose` | letter | 17px / 1.5 | 0 |
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
the core service puts its ring system beside its ledger. Main makes the same
move at the same width: the hero's object goes beside its type, and the flow
screens keep their 460px question on the left under a bar that spans the hero's
1080, with the control following the question rather than docked to the bottom
of a screen nine hundred pixels tall. A phone on its side (`max-height: 560px`
and `min-width: 640px`) gets the spread early on both surfaces.

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
| `wl-lead`, `wl-breathe` | the circuit, the pulse |
| `wl-light-run` | the running light, round the edge of the thing it is on |
| the intro (`.hi`) | the same two seconds on both surfaces, at `/` and at `/berkeley`, once per tab. 2280ms: the liquid mark, uncovered in the order the mark assembles in. The band round its circuit at 180, the star at 520, assembled at 1180 (and the black cover fades here, under the veil, so nothing but the metal lifts), the lift at 1560. No name, no bloom: the logo and the black it comes out of. Skippable on any tap or key. Under reduced motion it renders assembled and lifts |

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

Four fixed layers under everything, in this order, never reordered. They are
one component, `wall/ground.jsx`, mounted once per shell, and both shells mount
it: Main used to mount a WebGL field and the wall a 2D one, at a different
count and a different drift, and the two surfaces of one product had two
different skies.

| Layer | What it is |
| --- | --- |
| `.wl-sky` | the clouds, drawn by the field's own loop (field.js, THE SKY BEHIND THE STARS). The void with the galaxy's violet and pink in it at a whisper: a domain warped noise with a current, posterised through an 8x8 ordered dither at two pixels so it is texture and not gradient. It is a layer of the one field, drifting to the right the way the stars drift, at the pace of a star in the middle of the field, churning as it goes, and shifting to the hand the way a star shifts; it lights by a few counts under the pointer, and it parts round the type: whichever screen is up registers its headline (`useSkyAvoid` in ground.jsx) and the clouds flow round it, thin under it and gather a little pink along its edge. One pixel per CSS pixel, capped under a megapixel. Without WebGL2 it is a still gradient of the same two colours |
| `.wl-halo` | one enormous off centre warm radial at 7.5 percent, plus a cold one at 4.5. It is what stops the void reading as `#000` with things on it |
| `.wl-starfield` | the point field, on the GPU (`wall/field.js`): depth per point, parallax off the hand, and a count that is a density, about 0.9 points per thousand CSS pixels on every screen, so a desktop is as dense as a phone. It used to be a floor of 320 points that only a phone ever hit, and the desktop sky was three times sparser |
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
| Primary capsule | `.wl-pill.is-light` | chalk fill, ink type, 40px, 50px at `is-wide`. One per screen. `is-lit` puts the running light on it |
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
| Row | `.wl-row`, `PersonRow` | a person: the face, the name, the handle and a line under it, and the way in at the end. The sky's standing pings and the wall's search are the same row. `is-lit` for the one that matters |
| Who | `.wl-who` | the face with the name and the handle beside it. On the void and on paper |
| You | `.wl-me` | the chip on Main's bar, on every screen: the face and the handle once one is proved, and the way in before that |
| Dock | `.wl-dock` | a sticky gradient off the bottom edge. Why the composer never has to be advertised |
| Top bar | `.wl-top` | the brand is the way home, and it is chalk while everything beside it is ash |
| Foot | `.wl-colophon`, `SiteFoot` | the foot of the site, under the front door, under the wall, and restated in `legal.css` under the legal pages: the lockup and the sentence on one line, two short columns (the legal pages with the opt out among them, and the company: `COMPANY` in `parts.jsx`, the name, the address, the telephone and the street), and the company's line. Short on purpose: it used to run three columns and stood taller than the hero's type block on a phone. The one place the company is written as a company |
| Running light | `.wl-light`, `Light` | a point of light running the host's own edge, corners and all, on an `offset-path` the component measures. Two grounds: `star`, the dark plate with star shaped holes the result card waits on, and `chalk`, the pill's own fill, so the light shows around the capsule as a halo. Spent on the result card while it is looking, on the pill that places a ping (`Pill lit`), and on the mutual row on the sky |

### 8.3 Fields

A bare baseline, not a box. The `@` is painted beside the input, is never in the
value, and cannot be backspaced away. On focus a gradient line draws across the
rule in 520ms and the `@` lifts from `--ash-dim` to `--ash`.

| Component | Class |
| --- | --- |
| Handle field | `.wl-field`, `.wl-field.is-lg` |
| The result card | `.wl-card`, under a handle field. The resolver's answer while somebody is still typing: the face, the name, the badge, the handle, and no fifth thing. While it is looking a point of light runs round the card's own edge and twinkles through the plate's star shaped holes; given a handler it is a button from the first frame, disabled while looking and live the moment the answer lands, one element throughout so the light going out and the arrow arriving are one transition |
| Letter field | `.wl-letterfield`, on paper, with `.wl-count` under it |
| Address and code | `.wl-addr`, `.wl-code` |
| Reason | `.wl-reason` |

### 8.4 Drawn things

| Component | What |
| --- | --- |
| `Sparkle` | the four point star. `twinkle` and `delay` |
| `Ecliptic` | the mark. `size`, `sweep` |
| `Face` | the disc beside a handle. The picture, or a monogram. See 3.4 |
| `Mark` | the constellation, seeded from a handle. Retired from the product, kept on this page |
| `Halftone` | the dotted sphere |
| `Bloom` | the soft blurred mass. The whole accent system, spent once |
| `Field` | the drifting points |
| `Dots` | step dots. The one place in the build with a sequence worth counting |
| `LiquidMark` | the mark as a material. A liquid metal fragment shader cut to the mark's silhouette, on `app/public/liquid-mark.png`, which `scripts/export-liquid.mjs` writes from the geometry. Spent on the intro, the seal on the hero's scene, a mutual on the sky, and the reveal. See 3.5 |
| `Orbits` | the mark's states for a ledger: one ring, two rings apart. The third state is `Ecliptic` itself |

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
- **Loading** is `.wl-waiting`, a sparkle and a line of ash, or under a handle
  field the result card's light running its frame. No spinner.
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
| `app/public/fonts/` | the three faces, and the `faces.css` that declares them |
| `scripts/export-mark.mjs` | writes `design/logo/` |
| `scripts/export-liquid.mjs` | writes `app/public/liquid-mark.png`, the shader's mask, from the same geometry |
| `scripts/fetch-faces.mjs` | writes `app/public/fonts/` |
| `scripts/shots.mjs` | the screenshot loop |

### The one that is not here

`docs/DESIGN.md` documented the bindery: a leather case, one hue from chocolate
to ivory, materials drawn per pixel. That system is retired by
`docs/rebuild-spec.md` section 2 and this file replaces it. Its code is still
live at the old routes until the Wall and Main rebuild lands, and it is held in
git history until then.
