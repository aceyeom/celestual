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
| `--gold` | `#FDB515` | the campus's own light, and the wall's only colour of its own: the figures on the split flaps (`Flap`). It lit the Campanile's lantern and the count on the wall's masthead while those stood there; both came off with the hive, and the wall's count is a line of the ear now, in ash. The flaps are kept on the components sheet. Nowhere else, and never as running type. It was the pin on the front door's notice for a while, and it came off: the door's line to the wall is an ear of type now (hero.css `.hm-ear`), and the wall's colour stays on the wall |

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

### 2.5 The looks

One exception to the sentence above, and it is fenced. A letter can choose its
paper (migration 0055, `app/src/wall/looks.js`): eight themes and twenty-three
tints, each a ground and the ink that reads on it, are the only other hues in
the product, they live in that one file and in the theme rules of `wall.css`
keyed on `data-look`, and they are drawn only on a paper, its tile in the panel
and the disc of the name it was written to — on the disc as COLOUR alone, for
the reason 4.0a gives. They are the writer's choice for one
letter and never the product's: no bar, sheet, control or line of the system's
own type is ever set in one. A looked paper is still the one bright thing on
its sheet, in the colour the writer chose it. The ban list's fourth added
check, *the accent appears more than once*, reads the system's accent and not
a letter's paper.

A theme is a whole object and not a fill. Beside its ground and its ink it
carries a `grain` (the ONE surface layer on the card, and `none` is a real
answer), a `chrome` (the parts drawn for that paper and no other — the nokia's
signal and battery, the chalkboard's rail, the letterpress's blind deboss, the
telegram's printed form, the postcard's stamp box), a `layout` where the paper
moves the card's own slots, and a `frame` where the letter is written on
something inside the card rather than on the card. Every mark of it is a
gradient, a border or the wall's own constellation: nothing is downloaded and
nothing is a picture. The handful of literal hues the furniture needs — the
chalkboard's wood, the polaroid's white border — are theme rules in `wall.css`
keyed on `data-look`, which is where this section already puts a look's colour.

`candy`, `night` and `gold` came off with the eight papers, as `y2k`,
`receipt`, `notebook` and `terminal` did before them. A letter written on any
of the seven keeps its slug in its row and draws the plain paper: nothing is
rewritten in the corpus to take a row off a menu.

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
how one product came to sign itself three ways. Off the front door it grows
the chevron the wall's sheets use, so "back" and "home" are the same target in
the same place: on the wall it is a real anchor to `/`, the front, and on a
sheet it is the way back to the wall under it. It used to scroll the wall to
its top, which on a wall one screen tall was a control that did nothing.

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

### 4.0a The faces a letter may be set in

The four faces above are the system's and carry its four jobs. Nine more are in
`app/public/fonts/` and they are not the system's: they are the faces a
letter's LOOK may be set in (`app/src/wall/looks.js` `FACES`, with the serif,
the sans and the mono at the letter's job, which makes the writer's menu
twelve), chosen by the writer for one letter and used for nothing else in the
product. None of them is ever a headline, a label, a control or an identifier.

| Slug | Face | What it is for |
| --- | --- | --- |
| `pixel` | Pixelify Sans | the handheld screen. Carries the nokia |
| `hand` | Caveat | a hand. Carries the postcard and the polaroid |
| `round` | Comfortaa | the softest thing a writer can pick |
| `typewriter` | Special Elite | a struck key with the ink spread. Carries the telegram |
| `screen` | VT323 | a true bitmap, drawn on a grid rather than rounded onto one |
| `poster` | Oswald | condensed and upper case, for the letter that is four words long |
| `display` | Playfair Display | a high-contrast Didone. Carries the velvet |
| `marker` | Permanent Marker | felt tip, fast, no second thoughts |
| `script` | Pinyon Script | copperplate, played straight |

A letter's face is set on the letter, and on the letter alone. Its tile in the
look panel is a preview of the letter, so it takes the face too. The DISC of the
name it was written to does NOT: a monogram is the shortest way of writing who
somebody is, it is therefore an identifier, and the rule above is that none of
these faces is ever one. The hive puts forty discs on the screen at once and
eight writers' faces there is not variety, it is the surface the product is
named for read as a type specimen while somebody is trying to find a name in it.
A disc takes the look's ground, its ink, its texture and its rim — the colour,
which is the part carrying the writer's choice — and the identifier face.

They are fetched by `scripts/fetch-faces.mjs` with the others and a browser
downloads one only when a card set in it is on the screen, so twelve faces cost
a visitor who never sees one exactly nothing. `size` and `title` in `FACES` are
the per-face scale that puts each one's lower case on the same optical line as
the serif's: a hand at 16px is smaller than a serif at 16px, a pixel face is
larger, and a copperplate is barely there.

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

A handle set inside a label keeps its case.

### 4.2a The ladder, and why there is one

Every size and every tracking above is a TOKEN, declared on `.wl-root` beside
the colours, and nothing in the build names a number any more. There are nine
sizes and six trackings:

| | | |
| --- | --- | --- |
| `--t-label` | 10.5px | a mono uppercase label, and anything at its size |
| `--t-meta` | 11.5px | the line under a name: the @, the date, a row's meta |
| `--t-small` | 12.5px | a quiet control, a reason, a caption |
| `--t-ctrl` | 13.5px | a control's word |
| `--t-name` | 14px | a person's name, and a row's handle |
| `--t-wide` | 15.5px | a wide control's word, and dense reading |
| `--t-read` | 17px | prose. The reading size |
| `--t-subject` | 19px | a handle set as the subject of a sheet |
| `--t-value` | 22px | what somebody typed, in a field |
| `--t-value-lg` | 28px | the same, on a screen whose whole question it is |

| | | |
| --- | --- | --- |
| `--tr-tight` | `-0.012em` | an identifier, and display type at size |
| `--tr-snug` | `-0.008em` | a name, set large |
| `--tr-normal` | `0.008em` | a control's word, running type |
| `--tr-open` | `0.04em` | mono at small size, still lower case |
| `--tr-loose` | `0.08em` | mono, spaced, not yet a label |
| `--tr-label` | `0.15em` | an uppercase label |
| `--tr-label-2` | `0.13em` | the same, dimmed |

`wall.css` carried twenty-nine sizes and twenty-five trackings before this, and
the other three stylesheets carried their own. That is not a scale, it is what
happens when every component picks its own number, and the damage was never one
rule being half a pixel off. It was one ROLE drawn four ways: the `@` under a
name was 11, 11.5, 12.5 and 15px in five places, a person's name was 13 and 14,
and a small control was 11.5, 12 and 12.5. Three things doing one job read as
three different things.

A step is a JOB, not a size, which is why they are named for the job. If none of
them fits, the type is doing a job this system does not have, and that is the
thing to settle rather than the number.

Display type is the exception and keeps `--track-display` (4.0), which is set
with the weight and optical size it belongs to. A letter's own furniture is not
on the ladder and never was: a look's stamp, rail and signal bar are a
material's markings, they are keyed on `--lk-*` and `data-look`, and they keep
their literal numbers for the same reason 2.5 lets them keep literal hues. Handles are lower case identifiers
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

At 900px and up three things change and nothing else: the wall becomes a
poster (the ear under the bar, the hive edge to edge of the screen and
across the whole middle of it, the way in on the bottom row), sheets stop being bottom sheets and
become centred dialogs, and the core service puts its ring system beside its
ledger. Main makes the same
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

A letter's paper takes `--r-card` and nothing else, on all eight
(`looks.js` `radius`). A paper may be a pressed sheet, a slate or a moulded
shell and it is still a LETTER on the wall, and the thing that says so is the
shape it is cut to: eight papers with eight corners read as eight components,
and eight papers with one corner read as one card wearing eight materials,
which is what they are. It was 18 / 26 / 10 / 18 / 18 across five themes, which
was not a scale at all — 26 is `--r-sheet`, a *sheet's* corner and not a
card's, and 10 was not a token. The token stays on the theme so a paper that
one day has a reason can say a number, but it needs the reason, and being made
of paper is not one. The panel's tile scales whichever value the theme carries,
so the swatch draws the corner being chosen rather than a flat 10px.

Three more things hold across all eight, for the same reason the corner does.
The card's hairline is derived from the paper's own ink (`--lk-edge`), so every
paper carries one weight of edge where a fixed black one drew hard on cream and
nothing at all on near-black. The inset is three tokens (`--lk-pad-x`,
`--lk-pad-t`, `--lk-pad-b`) rather than a padding each theme re-states. And the
foot — the reader's three marks — is laid out against the CARD and not against
the paper's inset, so the heart, the pen and the flag sit 20px from the edge and
18px from the bottom on every letter in the deck, whatever paper somebody else
chose. A control that moves is a control to be found again on every card.

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
| `wl-shake`, `wl-cell-pop` | the composer's card refusing a press, a short travel side to side losing amplitude; and a name that has just arrived on the wall rising past its size and settling, under the pulse the wall sends out from its disc. No ring leaves the disc |
| `wl-cell-turn` | the wall turning over. Every couple of seconds one disc on the hive, out of the light and in off the rim, recedes and fades over 320ms and somebody else on the same wall comes up in its place over 510ms, both on `--ease-out`, with the face changed in the 150ms between where the orb is at nought opacity. No overshoot, no ring, no light and no pulse: an arrival is a claim that a letter went up and is drawn as one, and a turn claims nothing (`wall/Hive.jsx`, the cycle). Nothing turns over under the veil, under a sheet, during the opening, under a pulse or a pull, or under reduced motion |
| `wl-acts-in`, `wl-act-in` | the pane the flag opens on a letter, and its two rows arriving a beat apart |
| `wl-mast-ring` | the ring leaving the veil's capsule every 1600ms, the shape of the pulse a tap sends through the crowd |
| `wl-glass-out`, `wl-tab-drop` | a sheet's glass fading in place while a card flies home to its disc; the tab at the foot of the wall being put away |
| `wl-lead`, `wl-breathe` | the circuit, the pulse |
| `wl-light-run` | the running light, round the edge of the thing it is on |
| the veil (`.wl-veil`) | the wall's masthead laid over its greyed hive, centred in the glass, lifted once per tab, from the tap: 1600 to 2300ms on a shallow ease out, the grey and the type opened together as a circle from where the veil was touched, while a pulse runs through the crowd under it and the lens arrives with the light (`wall/Hive.jsx`). Then the bar's controls and the dock rise in, 620 to 700ms, a beat apart. The ear does not move. Under reduced motion it goes without travelling |
| the tap (`Hive.jsx tapAt`) | a disc pressed: the same pulse sent out from it, the field travelling to bring it into the light (a 300ms time constant), and its letter opening out of it 520ms in. The card closes back into the disc on the way out, 420ms, while the glass fades in place |
| the intro (`.hi`) | the same two seconds on both surfaces, at `/` and at `/berkeley`, once per tab. 2280ms: the liquid mark, uncovered in the order the mark assembles in, through a black cover whose cuts are FEATHERED — a hard edge over a material is an edge the material did not ask for, and the sweep's used to close the orbit as a notch with two square corners. The sweep's blur is taken on the stroke and the band clips it afterwards, so the ring's silhouette stays sharp and only the front of the reveal is soft. The band round its circuit at 180, the star at 520, assembled at 1180 (and the black cover fades here, under the veil, so nothing but the metal lifts), the lift at 1560. The held frame before the band stretches, up to 760ms, until the metal has drawn a frame behind the cover, so the sequence uncovers metal from its first pixel on a phone as well as on a laptop; past that ceiling it runs on the flat mark and the metal fades in over it. No name, no bloom: the logo and the black it comes out of. Skippable on any tap or key. Under reduced motion it renders assembled and lifts |

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
| `.wl-sky` | the clouds, drawn by the field's own loop (field.js, THE SKY BEHIND THE STARS). The void with two lights in it at a whisper, the body of the cloud and the veins along its warp: the galaxy's violet and pink on Main, and the campus's blue on the wall, deep in the body and cold along the veins (`SKY_TINT`, passed as `tint` on `Ground`), so the two surfaces are two rooms and not one room with two headlines. The wall's gold is not in its sky: gold through blue mixes to olive, and it reads as gold only where it is small and alone. A domain warped noise with a current, posterised through an 8x8 ordered dither at two pixels so it is texture and not gradient. It is a layer of the one field, drifting to the right the way the stars drift, at the pace of a star in the middle of the field, churning as it goes, and shifting to the hand the way a star shifts; it lights by a few counts under the pointer, and it parts round the type: whichever screen is up registers its headline (`useSkyAvoid` in ground.jsx) and the clouds flow round it, thin under it and gather a little pink along its edge. One pixel per CSS pixel, capped under a megapixel. Without WebGL2 it is a still gradient of the same two colours |
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
| Primary capsule | `.wl-pill.wl-lq`, `LiquidButton` | the liquid metal capsule: a near-black face inside a metal rim, poured by the same fragment shader the mark is (`wall/LiquidButton.jsx`), with the word over both, 40px, 50px at `is-wide`. One per screen. It keeps `.wl-pill` for its metrics, so every size and every contextual rule still reaches it, and brings only its own surface. The clock idles at 0.6, doubles under a pointer and is thrown to 2.4 for the length of a press, which leaves a ripple where the hand landed. Mounts are counted and capped at four per page; past the cap, with no WebGL2, and disabled, it draws the still frame of the same material. It was a chalk fill with the running light on it until 21 September |
| Ghost capsule | `.wl-pill.is-ghost` | hairline, ash type, 32px |
| Tag capsule | `.wl-pill.is-tag` | not a control. `pointer-events: none` |
| Arrow link | `.wl-arrow` | display face. The arrow travels on hover, the word does not |
| Icon button | `.wl-iconbtn` | 38px, `is-on` lights the ground behind the glyph |
| Close | `.wl-close` | 36px hairline ring, turns a quarter under the pointer |
| Quiet control | `.wl-quiet` | a sentence that is a control. Second option under a primary, and nothing else |
| Claim | `.wl-mine` | hairline capsule. A control with a consequence, so not a link |

**Three capsule heights and two round diameters, and no others.** They are
tokens on `.wl-root` beside the type ladder, and a tier is the control's JOB on
the screen it is on:

| | | |
| --- | --- | --- |
| `--c-sm` | 32px | an affordance printed on a row, or a tag. Not the point of anything |
| `--c-md` | 40px | a control in a bar. The default capsule |
| `--c-lg` | 48px | the ACT: the one thing the screen is asking, and every way through a door |
| `--c-round` | 40px | the close mark and the icon button, on the void |
| `--c-round-paper` | 32px | the pen, struck in a letter's own ink |

The build had EIGHT capsule heights — 30, 32, 36, 40, 44, 46, 48 and 50 — at six
word sizes, and three diameters for a round control. Nothing chose any of them.
What that reads as is buttons that are nearly the same size, which is worse than
buttons that are plainly different sizes: nearly-the-same looks like a mistake
and different looks like a decision. The round tier is two because a round
control on PAPER is drawn in the paper's ink at the paper's scale and one on the
void is a target on a phone; they are the pen and the close mark and nothing
else. The bar's three targets are now literally one height.
| Bookmarks | `.wl-seg`, `Segmented` | two or three words, and the open one is a TAB ON THE SHEET BELOW IT: the same ground (`--void-1`), the same hairline, rounded at the head and open at the foot, standing over the sheet's own top border and interrupting it. There is no seam to hide because there is no second surface — the tab and the body are one sheet of paper, which is the whole join. Both read `--sheet` and `--sheet-edge` off the wrapper rather than naming a ground and a hairline each, so there is no pair of numbers to drift apart and focus lifts the whole sheet at once: a tab drawn a step darker than the field it opens, with a dimmer outline, is a different object standing next to it, not a tab on it. The label sits at the tab's left edge, on the same vertical as the `@` under it. It sizes to its words and sits at the left, since a tab as wide as half the column is a switch. One element sliding on the sheet's own curve. A radio group to a keyboard, a tablist over the look panel. The composer's first question (`instagram` or `custom name`, over `.wl-write-body`) and the look panel's three axes (over `.wl-look-sheet`). The sheet keeps square only the corner the tab is standing on, from `--i`. It was a filled capsule with an inset ring and a glyph beside each word: a second box over a bare baseline field, a lit ground spent on a choice while the act at the foot is the screen's one bright thing, and an icon set the product does not have |
| Pen | `.wl-pen` | the nib in a hairline ring, struck in the paper's ink, at the end of a line that can be changed. `is-on` while the panel it opens is up, the way the flag stands open |

There were four pill roles. The filled saturated one had one caller in the whole
build and it was spending the entire colour ration on a word beside a date that
had already said it. The role went with the caller.

### 8.2 Surfaces

| Component | Class | Notes |
| --- | --- | --- |
| Paper | `.wl-paper` | the cream card. Variants `is-empty`, `is-theirs`. Its own grain, its own crest, a head of two cells and a foot. Every ink on it is one of its look tokens (`--lk-ground`, `--lk-ink`, `--lk-ink-2`, `--lk-rule`, the strengths of the ink, `--lk-face`, `--lk-radius`), declared at the plain paper's values on the card itself; a look (`has-look`, `wl-looked`, `data-look`) sets the same tokens inline and the card is the same card. See the looks, below |
| Look panel | `.wl-look`, `Look.jsx` | under the composer's card while its pen is on: a row of small papers (`.wl-look-tile`, the real tokens on a tile with the two letters and a few bars), a row of colours (`.wl-look-dot`) and a row of faces (`.wl-look-chip`), each a radio group that scrolls sideways out to the sheet's edges. The chosen one is ringed the way a disc under the lens is ringed. The card above is the preview |
| Sheet | `.wl-sheet` | rises off the bottom edge over a wall that stays mounted, dimmed and slightly out of focus behind it. A centred dialog at 900px. It is GLASS, and it has to look like it: written as glass and drawn as a panel — a tint at 66 to 80 percent over a fourteen pixel blur, which on a near-black wall is opaque — nothing came through it while the search plate twelve pixels above it read as the glass it is, which is two surfaces on one ground in two materials. A sheet is also the biggest surface here, and a big translucent surface reads as a THICKER one, so it takes the heavier blur and the deeper shadow rather than the lighter |
| Row | `.wl-row`, `PersonRow` | a person: the face, the name, the handle and a line under it, and the way in at the end. The sky's standing pings and the wall's search are the same row. `is-lit` for the one that matters. A letter to a first name draws the name as written in the name's face, a monogram, and no handle line |
| Who | `.wl-who` | the face with the name and the handle beside it. On the void and on paper |
| You | `.wl-me` | the chip on Main's bar, on every screen: the face and the handle once one is proved, and the way in before that |
| Dock | `.wl-dock` | a sticky gradient off the bottom edge. On the wall it carries only what is about the person looking, one thing at a time: the tab (`.wl-tab`), a card with the faces of the names they wrote to, the one door out of the wall, and `not now` under it, which puts it away for a few days or until another letter goes up; or the notice (`.wl-down`), when a letter of theirs has been taken down, saying it went against the terms, with their words back. The composer's act is the metal capsule in the dock (`WriteAct`, `.wl-write-act`); it read `.wl-top-write` here for a while and no such class has ever been in the markup or the stylesheet, which is how a preview route that pressed it went on shooting the bare wall |
| Top bar | `.wl-top` | the brand is the way home, and it is chalk while everything beside it is ash. On the wall the one act stands in it as a word: `write`, the primary capsule at the bar's scale with the nib and the running light. The three targets on the right are one height: forty pixel rings for the glass and the person, the capsule thirty-six tall between them, and the person's face fills its ring at thirty |
| Veil | `.wl-veil` | the wall's masthead, over the hive rather than above it: the title, the one line and the `view the wall` capsule, centred in the glass, on a scrim that is deep under the words, gone where they are not, and is itself the way in. The capsule is the product's primary, the same liquid metal object as `write a letter` at the foot of the wall: it was the last caller anywhere of the chalk plate with the running light inside it and an arrow after the word, so the first button anybody pressed was the one button that did not match the product behind it. The arrow went with the plate — an arrow inside a capsule is the arrow LINK's voice borrowed by a control that is already a door. Nothing else is on the screen under it: no dock, no foot, no controls in the bar. It opens as a circle from the tap. Once per tab |
| Ear | `.wl-ear`, and `.hm-ear` on the front door | one line in the identifier face, at the label's size and tracking, the word in ash and the figure in chalk: on the door, the way to the wall while one is open; on the wall, the campus and the count, under the bar, standing still through the veil's lift so the veil and the field share one masthead element. The wall's figure is a `Roll`, a step larger than its word, and turns when a letter goes up. The term stood at the end of the line for a while and came off, so the line above the search stays quiet |
| Seek | `.wl-seek-glass`, `Seek` in `screens/Wall.jsx` | the wall's own question, under the ear, once the veil has gone: blurred void in a capsule with the lens in the place a field paints its @ (`HandleField kind="search"`), `look for a name` beside it, capped at the column's measure. It reads LEFT TO RIGHT, because it is a field. The lens stood against the left edge of nothing and the question was centred in a 16ch box beside it, so the glass had a hundred pixels of dead room either side of the one thing in it and the first character typed landed in the middle of the capsule, with every character after it shoving the ones already typed sideways: the text moved while it was being read and the caret never sat still. Every other field in the build is a left-aligned baseline, and the same question on the `/find` sheet was left aligned all along. No ring on it — a white hairline over a crowd of pale discs is an edge belonging to no object, and the blur is the material and the edge both. It ANSWERS IN PLACE: the capsule is the head of a panel that grows downward inside the same glass as the rows arrive (`useSuggest`, six rows) and folds back when the field is emptied or left, with nothing about the head moving while it opens. No caption over the rows. It used to behave as a door, pushing `/find` and a second field onto a sheet; that sheet is still at `/find` as a link into the search. It replaced a 40px glass ring in the bar. The council of 20 September, `docs/THE-COUNCIL.md` |
| Hive | `.wl-hive`, `Hive` | the wall's names as a crowd of faces on a hexagonal torus, bent by a lens (`wall/Hive.jsx`): one continuous function of distance from the light sets a disc's size, how far the lattice opens around it, and how much of the room left over it is allowed to wander in — so the middle is large, tight and ordered and the rim is small, far apart and scattered. It runs corner to corner behind the bar and the pill, dissolving at every edge under two gradients; it drifts by itself and every disc breathes on its own clock; it can be pulled in any direction, and under a mouse it swells where the pointer is. One handle is on the screen at a time, on one glass plate. A press flies the disc into the letter's card (`wall/Morph.jsx`). `app/src/wall/README.md`, The hive |
| Running light | `.wl-light`, `Light` | a point of light running the host's own edge, corners and all, on an `offset-path` the component measures. Three grounds: `star`, the dark plate the result card waits on; `chalk`, an opaque chalk plate, so the light shows around the capsule as a halo; and `none`, for a host that already has a ground of its own — the composer's body — where the beam alone is drawn, softened exactly as `star`'s is. Spent on the result card while it is looking, on the composer's body while the resolver is out, on the veil's way in (`.wl-mast-go-pill`), and on the mutual row on the sky. It came off the primary when the primary became metal: a rose point travelling round the inside of a metal capsule is two currents under one word |

### 8.3 Fields

A bare baseline, not a box. The `@` is painted beside the input, is never in the
value, and cannot be backspaced away. On focus a gradient line draws across the
rule in 520ms and the `@` lifts from `--ash-dim` to `--ash`.

| Component | Class |
| --- | --- |
| Handle field | `.wl-field`, `.wl-field.is-lg`. Three kinds, one baseline: `handle`, the painted `@`; `name` (`.is-name`), the `@` gone and the input set in the display face, because a name is something a person means and a handle is an identifier, for a letter to a first name; `search` (`.is-search`), the glass in the `@`'s place, since a name is as good an answer as a handle |
| The result card | `.wl-card`, under a handle field, on Main. The resolver's answer while somebody is still typing: the face, the name, the badge, the handle, and no fifth thing. While it is looking a point of light runs round the card's own edge; given a handler it is a button from the first frame, disabled while looking and live the moment the answer lands, one element throughout so the light going out and the arrow arriving are one transition |
| The answer in the field's place | `.wl-settled`, `Addressed`, inside the composer's `.wl-write-body`. The same answer, standing where the handle was typed rather than under it: the same measure, the same ground, the same height, and no plate and no frame of its own, because it is not a second object arriving under the field — it IS the field, answered. One element in every state: while the resolver is out the disc is empty, two bars breathe where the words will land, and the running light goes round the BODY'S edge (`Light plate="none"`, since the body brought its own ground), and nothing is said in words beside it. That wait is the result card's wait and not a copy of it: the beam resolves identical in every property (`is-none` shares `is-star`'s rule), and the disc, the bars and their breath are the card's own numbers and its own keyframe. The way out of it is the close mark at its end and not an arrow: an arrow says the row is the way on, and the way on is the capsule at the foot of the sheet |
| Letter field | `.wl-letterfield`, on paper, with `.wl-count` under it |
| Address | `.wl-addr`. One baseline carrying an editable half and a painted half (`@berkeley.edu`), sized to what is typed so the two read as one address |
| Code | `.wl-codebox`. The one field in the build that is a BOX rather than a baseline, and 8.5 says why |
| Reason | `.wl-reason` |

### 8.4 Drawn things

| Component | What |
| --- | --- |
| `Sparkle` | the four point star. `twinkle` and `delay` |
| `Verified` | Instagram's badge: twelve lobes on one radius, twelve valleys on another, a quadratic between each pair, and a check cut through in the ground (`ink`). It is the one glyph in the build that is another service's mark, and it is drawn here for the same reason everything else is — and because a claim about somebody's Instagram account has to read as that service's claim. The sparkle stood here and was this product's own mark doing another product's job. Struck in `--accent`, never in Instagram's blue: nothing outside the tokens names a hue, and the shape is what says whose badge it is |
| `Ecliptic` | the mark. `size`, `sweep` |
| `Provider`, `Google` | Instagram's mark and Google's, on the buttons that go to them, and both are the service's own mark rather than a drawing that resembles it. `Verified` is the precedent: a claim about another service reads as that service's claim, and a person scanning three sign in buttons is looking for the mark they know rather than reading the words. `Provider` was a hairline camera on the icon set's grid, which beside a four-colour G redrawn as a single arc read as a product that could not get the logos right. Still not pasted assets: both are paths in `art.jsx`, taking `currentColor`, so they wear the build's chalk and never a brand's blue or a four-colour fill |
| `Envelope` | the third glyph on the same door, and solid for that reason alone. An address is not a brand and there is no logo for one, but an outline between two filled marks is the odd one out. The flap is cut through the body with `evenodd` rather than drawn over it in the button's colour, so it carries no ground |
| `Face` | the disc beside a handle. The picture, or a monogram. See 3.4. With a look (`has-look`): the look's ground and its texture, and on a picture a rim in the look's paper (`::after`). The look gives the disc its COLOUR and never its face — the monogram and the whole name are set in the system's own faces on every paper, because a disc is an identifier (4.0a). A name's disc writes the name whole on any paper |
| `Mark` | the constellation, seeded from a handle. Retired from the product, kept on this page |
| `Halftone` | the dotted sphere. Off the wall's masthead since the Campanile; kept |
| `Campanile` | a front elevation of Sather Tower in hairlines, from a handful of numbers, with the lantern lit in `--gold`. `width` (the height is three times it, or 2.84 standing), `lit`, `twinkle`, `stands`. It stood in the wall's masthead corner and then on the count as its plinth, and it came off with the hive: a drawing beside a headline that had already said which campus this was. Kept, and drawn by nothing |
| `Bloom` | the soft blurred mass. The whole accent system, spent once |
| `Field` | the drifting points |
| `Dots` | step dots. The one place in the build with a sequence worth counting |
| `Flap` | a count on split flaps: one per digit, the digit in `--gold` on a flat plate a step up from the void, a hairline round it and a seam across it, the word beside it. The one count in the build set in the util face rather than the mono, because on a board a figure is a thing on a plate and not an identifier in a line of type. The top half of the old digit folds down over the new one when the number changes, and on mount it can roll into place. It was the wall's count on the masthead; that is a line in the ear now, and the flaps are kept, drawn on the components sheet and by nothing in the product. Nothing moves under reduced motion (`.wl-flap`) |
| `Heart` | the tenth glyph, on the icon set's grid at its stroke, with two states: a hairline until this person has pressed it, filled with its own ink when they have. It stands in a letter's foot on the wall with the count beside it in the identifier face, struck in the paper's ink, and nowhere else (`.wl-hearts`, `.wl-heart`) |
| `Roll` | a count whose figures turn: each digit a window one figure tall over a column of the ten, slid to the figure it shows, 640ms on `--ease` when the number changes and still on mount. Keyed from the right so a hundredth letter mounts a column at the head and keeps the two it had. The wall's count in the ear. Under reduced motion the columns do not slide (`.wl-roll`) |
| `LiquidMark` | the mark as a material. A liquid metal fragment shader cut to the mark's silhouette, on `app/public/liquid-mark.png`, which `scripts/export-liquid.mjs` writes from the geometry. Spent on the intro, the seal on the hero's scene, a mutual on the sky, and the reveal. The flat mark stands under it until the metal is opaque and leaves after, 900ms on `--ease-out` then 320ms: a fade in over the flat, never a crossfade, because two opaque shapes of one silhouette crossfading on black dip to three quarters halfway and blink. `onReady` says when the metal has drawn a frame; `cut` makes the swap instant for a mark under a cover. See 3.5 |
| `Orbits` | the mark's states for a ledger: one ring, two rings apart. The third state is `Ecliptic` itself |

### 8.5 The door

Every sign in screen in the product, on one shape: the mark, the line that says
what is being asked, at most one sentence, the ways through, and the legal line
at the foot. `parts.jsx` `DoorHead`, `Or`, `CodeBox`, `Resend` and `DoorFoot`;
`wall.css` `THE DOOR`; stood up by `screens/Gate.jsx` on both walls and by
`main/Copy.jsx` and `main/Signin.jsx` on Main.

| Component | Class | Notes |
| --- | --- | --- |
| Door head | `.wl-door-head` | the mark at 38px, the title in the display face at `is-s`, and one sentence in the reading face under it. The mark is `Ecliptic`, flat: 3.5 rations the poured metal to the product's own events and a sign in is not one |
| The ways | `.wl-door-ways` | one capsule per way in, stacked, at a 22rem measure so a door does not stretch into a row of wide grey bars on a spread. The default is the metal capsule, the rest are ghosts at the door's scale (48px, a little fill under the hairline). NOT a pane of rows: see below |
| The reason | `.wl-door-why` | one line under the default, in the util face at 12.5px in ash, saying why it is the default. Under the control it is about and never inside it |
| Or | `.wl-or` | a hairline with one word in it, in TWO segments either side of the word rather than one line with the word masking a hole in it — the sheet is glass with the room blurred through it, and a word carrying an opaque swatch to cover the rule reads as a patch stuck on the glass |
| Code box | `.wl-codebox` | `--void-2` behind a hairline, the field's 14px corner, and the digits in the identifier face at 38px tracked `0.14em`, centred, tabular. Six middle dots for the empty state. Focus moves the EDGE and not the fill, for the reason below |
| Resend | `.wl-resend` | one line under the box, counting down in the identifier face before it becomes a control. It waits because a resend offered at once is a button people press three times in eight seconds, which mails three codes, invalidates two and walks somebody into the rate limit |
| Legal line | `.wl-door-foot` | the terms and the privacy policy, as real anchors, quieter than anything above them |

**The composer, shut, is this door with one way through.** `Locked` in
`parts.jsx`, over `screens/Write.jsx`. It used to be its own screen entirely —
left aligned, no mark, sentence case, one bare capsule — standing four hundred
pixels from `/gate`, which asks the same question centred under the mark with
three ways through and the legal line at its foot. Two screens for one question,
in two alignments, with two casings, and the one a person hits first was the one
that did not look like the product. It does not duplicate the three ways: it is
the one door that leads to them.

**It is centred, and it is the only thing in the build that is.** Section 0 and
the rest of this file are emphatic that this product is left aligned, and the
argument is about READING: a centred paragraph moves its own left edge on every
line, so the eye hunts for the start of the next one. None of that is true of a
door. There is no paragraph on one. There is a symmetrical mark, one sentence
and two or three ways through, and that block pushed hard left with a stack of
capsules under it reads as a form to be filled in rather than as a way in. The
axis changes at the door and changes back behind it, and the change is itself
the signal that this sheet is not part of the wall. The account screen on the
same sheet (`.wl-profile`) does NOT take it: that screen is a record of what
somebody wrote, it is reading matter, and it stays left aligned.

**Every way in is the same shape, and only the material differs.** The ways
were a capsule with a PANE of rows under it — a glyph in a circle, a label, a
line of reason and a chevron, on a tinted plate. That put two component
languages on one screen and it made the rows unreadable *as choices*: somebody
weighing three doors was reading one button and two list items, and the list
items lost every time for reasons that had nothing to do with the doors. Three
capsules now, one height, one shape, and the one difference between them is the
one that matters — the default is the metal, the alternatives are hairline. A
reason that used to sit inside a row sits under the capsule it is about, because
a capsule carrying a sentence is a row again.

**Which way is the default is the surface's answer, not a ranking.** On the wall
at the root it is **instagram**, because it is the only proof that lets the
product tell somebody a ping of theirs is mutual — that is the one thing about
those three doors that is not interchangeable, and google and the mailed code
stand under the rule as what they are. On the wall at Berkeley it is the
**campus address**, because that address is the only thing that opens writing
there; the campus's own google is the same proof by a shorter road and stands
under the rule as `sign in with google`.

**The primary stands in the door, not in the sheet's foot.** Everywhere else
the primary is docked (8.1, and `SheetFoot`: a control that moves between
screens is a control somebody has to find twice). The door is the exception and
the exception is the point — the ways in ARE the content here, and a
`continue with google` capsule parked at the bottom edge with two feet of void
between it and the two rows it is an alternative TO is a different question.
The foot carries the one thing that is not a step: the terms.

**The code box is drawn twice, and the second one is in an inbox.**
`supabase/functions/_shared/mail.ts` `code()` holds the same values: the same
ground, the same corner, the same size, the same tracking, centred. A person
reads six characters off one screen and types them into another about ten
seconds later, and a code that is one shape in the mail and another in the
field is a code they have to check twice. The one thing that cannot match is
the face — no mail client loads a web font, so the mail falls back to SF Mono
and Courier where this is Geist Mono — and everything a client CAN hold is
held. It is also why nothing glows on it: a mail cannot carry a text shadow
(Outlook renders through Word), so a lit code here would be a code that lights
on one of the two screens it appears on. `.wl-dm-digits`, the code you SEND
rather than the one you are given, keeps its bloom; it is never drawn in a mail.

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

`prefers-reduced-transparency: reduce` is answered too, and the answer is not a
thinner blur: the sheet and the search plate become the opaque surfaces they
already fall back to without `backdrop-filter`. Nothing moves and nothing is
laid out differently — the material is the only thing that changes.

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

`scripts/preview.mjs` drives the same loop with the network intercepted, so
every surface is shot with data in it. Two of its routes are not compositions to
look at but assertions: `find-letter-back` and `letter-report-back` shoot the
frame AFTER the close mark on a sheet that was opened from another sheet, so the
screen underneath is either in the shot or the bug is back. Nothing needs a
Supabase project to run them, but the app does need `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` set to anything in `app/.env.local`: with no client
constructed the app never makes the calls the fixtures are there to answer, and
every route shoots an empty wall reading `not connected here`.

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
