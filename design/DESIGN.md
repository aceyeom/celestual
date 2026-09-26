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
lit surface, which is where anything a person wrote actually lives, and one
pale blue, which is the whole colour budget. The lit surface is a different
object on each side of the product. On the wall it is the letter's own screen,
a phone left on in a black room (2.5), and the wall around it speaks that
phone's language, one pixel face, square keys and unlit panels, so that only
the mark and the word are the room's (2.6). On Main it is the chalk card a
ping is set on (2.3), and four faces carry four different jobs and never each
other's. Nothing is downloaded: every ornament is a path or a loop, drawn from
the same numbers as the thing beside it.

---

## 1. The three rules

Everything below is downstream of these. If a decision is not covered, decide it
by asking which of these three it serves.

**1. The accent is rationed.** One saturated colour exists. Search the build for
`--accent` and the uses are countable on one hand, one of which is a four pixel
dot. An interface with a saturated accent everywhere is the most recognisable
machine made look on the web, and this product cannot afford to look generated.

**2. One bright thing per screen.** Either the lit surface or the bloom, never
both competing, and never two of either. The lit surface is a letter's screen on
the wall and the chalk card on Main (section 0). The eye has to land somewhere,
and a screen where three objects are shouting has no landing place.

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

The wall is the exception: it is the letter's black room (section 7), so
`.wl-root.is-room` sets `--void` to `#000`, `--void-1` to `#0E0E0E`, `--void-2`
to `#131313` and `--void-3` to `#1A1A1A`. Every shade, veil and sheet the wall
pours reads `--void-rgb` and `--void-1-rgb`, so they turn black with it. Main
keeps the values above.

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

Main's bright surface: the card a ping was set on (`.wl-paper`, `Paper` in
`parts.jsx`), on the flow, the sky and the reveal. Those went with Main's ping
pages (2.6), and the card stands now only in the Phase 3 preview at
`/signature`. It is not the wall's. On the wall a person's words are set on a
screen (2.5), and the paper that stood under a letter there went with the
looks; a ping's line is set on a screen too (screens/Ping.jsx).

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

Changing the accent is two lines. Nothing else on the PRODUCT's surfaces names
a hue.

### 2.4a The desk's own palette

One more exception, and like the looks it is fenced and declared in one place.
`app/src/admin/desk.css` opens with eight tokens of its own — `--ad-hold`,
`--ad-stop` and `--ad-go` for a state, and `--ad-s1` to `--ad-s5` for the five
series on the growth chart. They are scoped to `.ad-root` and nothing outside
the desk reads one.

They exist because rule 1 is an argument about a PUBLIC surface: a saturated
accent everywhere is the most recognisable machine-made look on the web and the
product cannot afford it. The desk is an operator tool that four people will
ever open, and the two things it has to do — say whether something is live,
held or stopped, and draw five lines that can be told apart — are the two jobs
a single rationed accent cannot do. A chart whose series are five strengths of
one blue is a chart nobody can read.

It is written down here because the sentence above used to say "nothing else in
the build names a hue", and eight tokens in the build named one.

Two of them are also laid as a surface, in one place: the alarm at the top of
every screen of the desk (`app/src/admin/Canary.jsx`, migration 0060). While
the daily check on apify is failing it is a wash of `--ad-stop` under a
hairline of the same, and while the check has not run for a day and a half, or
ever, the same in `--ad-hold`; the words on it stay chalk and ash. It is the
stop button's language at the size of a sentence, and it is nothing at all
while the check passes.

### 2.5 The screens

One exception to the sentence above, and it is fenced. A letter on the wall
is a phone screen left on in a dark room (`app/src/wall/looks.js`,
`screen.jsx`, `screen.css`): an unsent draft, the cursor still after the last
word. Every letter is the same screen: the status rows across the top (the
aerial, the signal bars, the name, by the battery the day it went up as
`09/24/26`, or on a draft the characters it has left, and never a second date
beside the aerial; the pen, the mode, the handle), the words, and the three
soft keys at the foot
(`options`, the heart and its count, `share`), set in one face, Jersey 10, the
Series 40 grid (`--f-s40`). The only thing a writer chooses is the COLOUR it is
lit in, and each colour carries its own treatment with it:

| kind | colours | what it is |
| --- | --- | --- |
| lit | night, white, ice, green, amber, rose | a backlit LCD photographed in the dark: the panel glows, the bands above and below are the phone's dark glass, the lit words bloom |
| negative | negative | the same screen with the panel dark and the words the bright thing |
| poster | teal, lilac | that photograph screen printed in four flat inks: an SVG filter quantises the screen's greys into the inks, with grain where a press breaks an edge |
| riso | violet / yellow | two drum inks on warm paper, the second a hair out of register |
| xerox | xerox | photocopied and blown out: one threshold between toner and paper, walked by the copier's heat |
| brat | acid | the album cover's square: acid lime edge to edge, black words a hair soft, photographed on cheap film. Painted, never pressed (below) |

These twelve are the only other hues in the product. They live in that one
file and are drawn only on a screen, its thumbnail in the composer and the
small screen of the name it was written to; no bar, sheet, control or line of
the system's own type is ever set in one.

**One pool.** The composer offers them as one pool (`Look.jsx`), in the order
of a spectrum and under no heading: the greys, then round the wheel from ice
through the greens and yellows to amber, rose and lilac, and the negative and
the xerox last. Six to a row, two even rows, at every width down to 320, and
nothing scrolls sideways. How a colour is drawn is the colour's own business;
the words lit, printed and copied were the machinery's, and they came off the
panel. Blush, cobalt, pink / blue, orange / teal and red / green left the pool
on 25 September, and a letter in one of them draws the colour nearest its hue
(`RETIRED`: rose, ice, rose, amber, amber), which migration 0061 wrote into the
rows. Ember left on 25 September as well, so the panel is two even rows of
six, and its letters are amber (migration 0063).

**Acid is the square.** It was a poster, a lime pulled out of the night
screen by the press with its hot corner caught in pale yellow, and beside the
others it read as one more tint of the same machine. The lime everybody
carries in their head is a flat square of `#8ACE00` with a word on it in
black, the type a little soft, as if made small once and blown up again. So
acid is that square (`kind: 'brat'`, the slug and the name still `acid`, so
no letter's row changes):

| part | what it is |
| --- | --- |
| the lime | `#8ACE00` edge to edge: no bands of glass, no rule. Mixed 40 percent towards `#F4F07A` at this phone's hot corner (`--q-hx`, `--q-hy`), which on paper is where the lamp caught it, and 26 percent towards `#1C3300` at the edge. From across the room it is one flat colour |
| the grain | heavy and monochrome, in the lime itself: the film's dark specks laid over it (up to 36 percent black) and its light ones dodged into it (up to 26 percent grey in `color-dodge`), so a speck makes the lime deeper or brighter and never greyer or yellower, and black stays black. An SVG `feTurbulence` inside a data URL image (`--wl-grain`, `--wl-grain-hi`), since an image's filter is drawn by every engine where a filter laid on the page is not drawn by WebKit; started where the letter's own grain starts (`--q-grain`) |
| the words | `#050505`, the status and the keys in the same ink as the message, softened by `blur(0.18cqw)` on the three rows and a halo of the ink at 55 percent. Never so soft a word has to be guessed |
| what it is not | an LCD: no pixel grid, moiré, ghost column, pixels up close, dead pixel, dust or backlight's clouds. It is paper (`skinOf().paper`), so it throws almost no light on the room and is uncovered rather than woken, as a print is |

It is painted by the stylesheet on the letter, the composer, the tile and the
swatch alike, so it is the same square in WebKit, where the press does not
run, as in Chromium. `share.js` draws it by hand: the square made small and
blown up again for the soft words, then the same dark and light specks off
the letter's grain seed.

**A print's light is its colour's.** The press lays a print's palest ink
wherever the greys under it cross three quarters, so where the light falls is
decided by the panel's greys, and each print has its own (`LIGHTS` in
`looks.js`, drawn in `screen.css` under the press and by `share.js` before
its own). It is bound to the colour and never a second choice, and the letter,
the tile, the thumbnail and the shared picture draw the same one:

| print | light | what it is |
| --- | --- | --- |
| (none) | corner | the backlight's hot corner, caught in the palest ink round the point it is brightest at. It was on every print and read as the same white stain on each, then acid's alone; acid is the square now, and the corner stays as the press's default and `?light=corner` |
| teal | keyline | no light on the panel, and a line of the palest ink inside the black rule, a hair clear of it |
| lilac | dots | the light as a halftone: white cones on a forty five degree lattice, faded out from the hot corner, cut by the press into dots that are large where the light is strong and gone where it is not |
| violet / yellow | bands | the phone's two bands of glass laid in the violet drum, and the status and the keys on them struck out in paper |

`/looks.html` on the dev server (`app/src/wall/proto/looks.jsx`) draws every
colour in all four places side by side, and `?light=` draws every print in one
light, for choosing between them. It never ships: the build takes
`index.html` alone.

**The room is black.** An opened letter is the only lit thing on the glass:
the wall goes out behind it and the scrim is `#000` with a sensor's grain on
it. The one light in the room is the screen's own, falling on the dark in the
screen's colour (`.wl-room-light`, `.wl-scene-halo-2`). A print keeps its own
ground — a poster is teal — but the room never takes it; it was the print's
darkest ink in the concept, and one black for every letter is what makes the
wall one room rather than a paint chart. The composer writes in the same room
(`.wl-sheet-wrap.is-write`): no pane, the draft's screen on the black with its
own light behind it, and the sheet the size of the window, so nothing is cut
but by the window's edge. On a spread, and on a phone on its side, the screen
stands on the left and the question, the colours and the act on the right.

**Every screen is its own phone** (`quirks`, off the letter's id, never
`Math.random()`): how it is tilted in the photograph, the exact proportion of
its panel, where its backlight is brightest, the pitch of its pixels and the
moiré the camera made of them, a speck or two of dust, sometimes a hairline
scratch or a dead pixel, a column the driver left on, which battery and which
aerial that model draws, whether the name sits in the middle of the top row
or beside the aerial, where the first line starts, the cursor's phase; and on
a print the grain, the drum's slip, the copier's heat, and where its light
sits, which follows the backlight's brightest point. Every value is
small on purpose. The screen reads as one object on every letter, the way a
row of phones on a table is one object, and nothing a quirk does moves a key,
changes a word or makes a letter harder to read.

The bars and the battery are not decoration: the signal is how many people
hearted the letter, the battery how long it has been sitting there unsaid,
and on the wall's small screens the bars are how many letters the name has
and an envelope blinks on a name that heard from somebody today.

**A person is a picture on a screen.** There is no round face anywhere. A
profile picture is cut square round the face (a fifth in from the edges, a
touch above centre), brought down to a few dozen pixels by halving, pulled to
its own levels and local contrast, sharpened, and dithered, Atkinson, in four
tones of the screen's ink (`PixelPic`), so the same picture is green on a
green screen. A near white cell stays paper, so a bright sky does not grow a
row of dots. On a print the tones are the print's own inks, opaque, so the
press strikes each as one ink, and a copy's picture has two. About one cell
to every one and a half CSS pixels: 16 to 44 a side on a chip (`size / 6`,
in fours), 32 on a tile, 40 at the head of a message and 64 opened large.
The monogram in `--f-s40` stands under it until it lands and whenever it
does not. On a sheet, in a row or in the bar, the face is a small square of
the night LCD (`.wl-face`) with a screen's corner, 2px on a chip and 6px
opened, and no pixel grid over a photo. Opened, the picture stands in the
room's black and grain, inside `.wl-root` so it keeps the wall's type.

**What the row keeps** is 0055's column: `{ theme, tint, face }`, cleaned by
`wall_look_clean`. The screens write one key, `{ "tint": "teal" }`. A row with
anything else draws the colour its id picks, and migration 0058 gave every
letter already up a colour of its own, keeping the old looks in
`wall_look_backup_0058`. Migration 0061 moved the letters in the five retired
prints to the colours nearest their hues, keeping what they had in
`wall_look_backup_0061`.

`share`, the right soft key, opens a menu drawn the way the phone drew one:
`to someone` hands the letter's picture to the share sheet, on a device that
has one, `save the picture` saves it, and `copy the link` copies the letter's
link. The
picture is drawn with a canvas (`share.js`), from the same table and the same
quirks, at 1080 by 1350 on black, and signed under the screen with the lockup
(3.3): the mark and `celestual.` in the room's serif, chalk at ninety percent,
the mark in its own glow. The mark is built from `mark.js` in the layers
`eclipticSVG()` draws, so it is the favicon's geometry and not a picture of it.
The address stood there before, in the pixel face at 42 percent, and it was
the only thing on the picture that said whose it was. The key read `send`
until 24 September, which is the composer's word for putting a letter up
(`send anonymously`), on a key that puts nothing up.
`npm run screens` draws that picture for every colour on five letter ids, which
is the check on the quirks: five phones, and none of them a different design.

### 2.6 The wall is the phone

A letter is a Series 40 screen (2.5), and the wall is where those screens are
kept, so everything on the wall round them is the same phone: one pixel face,
square keys, unlit panels and pixel glyphs. Only the brand (the mark and
`celestual.`) stays the room's own object. The product's own events, the intro
and the mutual, are told on the phone too, in its pixels (the stories, below).
Main (`/optout`, `/copy`, `/signin`) and the desk are not the phone, and
sections 4 and 8 describe them as written.

The ping is the phone too. Placing one, the list of what a person has out and
the mutual used to be Main's pages at `/ping`, `/place`, `/sky` and `/reveal`,
in the room's paper and metal, and a person who had just written a letter left
the phone to ask the one question the letter left them with. They are sheets
on the wall now, built of the wall's own parts and nothing new:

| Sheet | What it is made of |
| --- | --- |
| the ping (`screens/Ping.jsx`) | the composer's room (`.is-write`): the step dots, the field in its body with the resolver's answer in the field's place, the wall's names under it, the people written to as the same rows, then the ping's own lit screen with the line on it (`Screen`, `ScreenDraft`), the gate's Instagram door when a proof is needed, and `it's out.` as a note on that screen (`ScreenNote`). One lit key under it. On a spread it keeps the phone's one column, since it has no colours to stand beside the screen |
| the person (`screens/You.jsx`) | the account card on an unlit panel, its rows the letters' rows, with the key held at the foot of the panel over a dashed seam while the card scrolls under it. A standing ping opens onto its own lit screen, whose options key is the phone's menu (`ScreenMenu`) and whose `let it go?` is a note with two soft keys |

Nothing about a ping is ever drawn anywhere a second person can look. The
sheets show a person their own pings and nobody else's, which is the whole
of what the double blind allows.

It was an Apple interface with Nokia screens in it: a blurred grey search
capsule, frosted sheets with 26px corners and a grip, liquid metal capsules,
round close marks, a stroke icon set and serif headings, round a crowd of
square pixels. Two languages a centimetre apart read as two products, and the
screens are the product's idea, so the chrome took theirs.

**How it is scoped.** `app/src/wall/phone.css`, imported after `wall.css`,
declares everything under `.wl-root.is-room`, which only the wall's root
carries (Main's is `.wl-root.sg-root.mn-root`). It remaps the tokens rather
than restyling the components, so a rule in `wall.css` that reads a token
draws the phone on the wall and the system on Main.

| Token | On the wall |
| --- | --- |
| `--f-display`, `--f-letter`, `--f-util`, `--f-id` | `var(--f-s40)`, Jersey 10 |
| `--f-serif` | Newsreader, for the brand's word and nothing else |
| `--w-display`, `--track-display` | 400, and none |
| `--tr-*` | 0 to `0.03em`: a pixel face carries its spacing in its grid |
| `--t-label`, `--t-meta`, `--t-small` | 16px |
| `--t-ctrl`, `--t-name`, `--t-wide`, `--t-read` | 20px |
| `--t-subject`, `--t-value` | 24px |
| `--t-value-lg` | 30px |
| `--r-card`, `--r-pill`, `--r-field`, `--r-lcd` | 3px |
| `--r-sheet` | 4px |

Jersey at 20px reads as a grotesque at about fifteen, so the nine steps of the
ladder (4.2a) are three here: twenty for anything read or pressed, sixteen for
what stands under a name, and the larger steps for what was typed. The display
scale is restated from 26 to 48px at a close leading, and `font-synthesis` is
off, because a pixel face thickened or slanted by the browser is a smear.

**The materials.**

| | What | Where |
| --- | --- | --- |
| unlit panel | `--lcd`, `#0B0B0B`, a step off the room's black, under `--lcd-grid`, the panel's pixel grid at a strength that is felt | the search, the tab, the notice, every sheet and field, the colour panel |
| bezel | `--lcd-edge`, chalk at 16 percent, one pixel; `--lcd-edge-hi`, at 38, while a field inside it has the focus | round every panel, and round every quiet key |
| lit key | a chalk plate with the word struck out of it in `#000`, the way the phone lit the chosen row of a menu. Pressed it drops a pixel and goes a step darker | the act on every screen: `write a letter`, `view the wall`, `next`, `send anonymously`, a door's default way in |
| inversion | the chosen row takes the chalk ground and its type goes `#000`, as a screen's own menu does (`.wl-scr-menu li.is-on`) | the search's answers, the composer's suggestions, every row of names |

No blur and no big soft shadow. A panel is opaque, as a phone's glass is, and
nothing new is backlit, so a letter's screen stays the one bright thing in the
room.

**The glyphs.** `PIX` in `looks.js` holds the screen's own glyphs and, beside
them, the chrome's: `find`, `back`, `down`, `close`, `key`, `flag`,
`signout`, `arrow` and `wait`. `PixIcon` (`screen.jsx`) draws one at a whole
multiple of its grid with `crispEdges`, in `currentColor`. `Wait` is the
hourglass, blinking at the screen's own 1060ms, and it is how the wall waits:
Main runs a light round an edge.

**The stories.** Three screens tell one small story on a letter's night
screen, in the phone's own pixels: the intro, the door (`/join`, the mechanic)
and the mutual (`/reveal/:handle`). Two shadows run in from either side of
the panel, reach, touch (the whole panel inverts for one frame), hold on, and
what they stood on lifts into the ring while the two of them gather into the
star. Nothing in it is a picture. The runners are drawn by hand, a pixel at a
time, 16 by 22, in two inks: the far arm and leg are the same ink, thinner,
so one drawing gives both steps and a silhouette never reads as a shuffle.
They are the same drawing turned round, not two people with a hair colour
each: two shadows, nobody in particular. The mark is `mark.js` rasterised on
an odd grid, 47 cells, the ring cut at a third of a cell and the star at a
half (`pixmark.js`). `PixelStory` draws it on a canvas in the screen's body,
a whole number of device pixels to a cell with the gap an LCD has, the unlit
cells faintly there. A screen with a story on it is held square to the
camera and loses the photograph's pixel grid and moire, because a canvas of
square cells under a tilt and a second grid beats into a moire of its own;
its dust, glare and backlight stay. The status row names the two of them on
the door and the mutual (`is-pair`: two names of one weight) and nobody on
the intro. The run steps at 80ms a frame and the mark at 33, the canvas is
drawn only when the frame changes, and the loop stops at the last frame.
Under reduced motion every story is drawn on its last frame.

**The context.** `PhoneChrome` (`parts.jsx`) is turned on at the wall's root
(`index.jsx`) and read by the shared parts that draw rather than lay out:
`Pill tone="light"` is the lit key and not `LiquidButton`; `Icon`, `Close`,
`ArrowLink` and `Heart` draw pixel glyphs; `Light` draws nothing. Main never
turns it on, so every one of them draws there as section 8 says.

**What stays the room's.** `Brand` (the bar, the site's foot, a letter
reached from a link), pinned to Newsreader at 22px, 500 and `-0.022em`
whatever the tokens say; `Ecliptic` at the head of a door; `LiquidMark` on the
root wall's poster; Instagram's and Google's own marks on their keys; and the
lockup on the shared picture. They are the product's name, and a name is not
set in a phone's font. The intro was on this list until 25 September, in
liquid metal, and it was the one thing a person saw before either surface
that belonged to neither of them.

`design/components.html` draws the phone under its own heading, beside the
system it remaps.

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
silhouette. It is spent on the room's few moments and on nothing else: the
root wall's poster, the seal on the hero's scene and the seal on a mutual row
on the sky. The intro and the reveal were its until they became the phone's
(2.6), where the mark is drawn in the phone's pixels from the same nine
constants (`pixmark.js`). Wherever the mark is a glyph
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

On the wall it is the one object in the room's own hand (2.6): the lockup in
Newsreader over a surface set in Jersey, so the name is the product's and
everything round it is the phone. And a letter reached from a link carries it,
until the tab has been to the wall: small, the mark at 19px and the word at
17px, at the top left across from the close key, a real anchor to the wall;
and under the letter, after the seal's `read it` on a sealed one, `view the
wall`. Before that, a letter somebody was sent was a screen with a real
handle on it, a close key and nothing else, which is what a confessions page
run by anybody looks like. Both links drop the wall's poster and land on the
names, so the letter closing reveals the wall rather than a second `view the
wall`; the close key still lands on the poster (`index.jsx` `toWall`, the
`celestual.cold` flag in `store.js`).

---

## 4. Type

Three faces, and the first does two jobs at two ends of one axis. Files are in
`app/public/fonts/`, fetched by `node scripts/fetch-faces.mjs` (and the pixel
face for Korean, Japanese and Chinese by `node scripts/fetch-cjk.mjs`, 4.0a)
and served from this origin. Nothing renders from a CDN.

This section is Main's type. On the wall one face carries every word but the
brand's, Jersey 10 (4.0a), and the tokens below are remapped to it (2.6).

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

### 4.0a The face a letter is set in

The four faces above are the system's and carry its four jobs. One more is in
`app/public/fonts/`: Jersey 10, drawn on the ten pixel grid the Series 40
phones set their messages on (`--f-s40`). Every word on a letter's screen is
set in it (the status rows, the words, the soft keys, the menus), and so is
the monogram on a small screen and on a face.

On the wall it is every other word too: the headings, the labels, the
controls, the fields and the explanations (2.6), because the wall is the
phone and a phone has one font. The brand's word is the one exception. On
Main it is never a headline, a label or a control outside a screen.

It was twenty-four faces a writer chose between, one menu per paper. The
screen took the choice away with the papers (2.5): a phone has one font, and
the font is part of what makes it that phone.

**In Korean, Japanese and Chinese.** Jersey 10 is latin, and a letter in any
of the three fell through it to the reader's system monospace: a smooth
outline face in the middle of a screen drawn a pixel at a time. Past Jersey's
latin, `--f-s40` now falls to one pixel design for all three, Fusion Pixel Font
(TakWolf, SIL Open Font License 1.1), the 12px proportional cut in its Korean,
Japanese, simplified and traditional Chinese variants, so a letter in Korean
and a letter in Chinese are the same phone. `scripts/fetch-cjk.mjs` makes it:

| | |
| --- | --- |
| the families | `Celestual Pixel KO`, `JA`, `ZH` and `ZH Hant`, renamed because Fusion Pixel is a Reserved Font Name and a subset is a modified font. The licence is `app/public/fonts/cjk/OFL.txt` |
| what is kept | Hangul in the Korean face, kana in the Japanese, bopomofo in the Chinese, and in all four the ideographs, the CJK punctuation and the full width forms. Latin stays Jersey's |
| the grid | drawn at three quarters and declared 1400 to the em, so a pixel is 75/1400 of an em, Jersey's own: an ideograph is eleven pixels tall, as tall as a capital and one under the line, and the ascent and descent are Jersey's. It is in the files, so the stylesheet needs no `size-adjust`, and the shared picture's canvas and older Safari draw it the same |
| the weight | Jersey's strokes are two pixels and Fusion's one, so every glyph is made bold as a pixel face is: a pixel to the right of each upright, unless it would close a one pixel gap. Uprights are two pixels, horizontals one, every advance a pixel wider |
| the files | 289 woff2, 2.7 MB in all, declared in `app/public/fonts/faces-cjk.css` (160 KB, 25 KB over the wire). Each language's commonest 3500 characters are cut as Google Fonts cuts Noto Sans KR, JP, SC and TC, by frequency; the rare rest in runs of code points, declared first so a common character never pulls a rare file |
| per letter | a letter of eighty to ninety characters fetches 27 KB in Korean (9 files), 42 KB in Japanese (15), 72 KB in Chinese (10); a latin letter fetches none |

Which face draws an ideograph is the text's language, since the three
languages draw many of the same characters differently. A letter has no
language field, so `type.js` `langOf` reads it off the words (any Hangul is
Korean, any kana Japanese, ideographs alone Chinese, the traditional
characters over the simplified Traditional Chinese), and `screen.jsx` sets it
as `lang` on the words, the draft and the name's row. `phone.css` orders
`--f-cjk` by `:lang()`: the language's own face first and the others after it
for a script it lacks. The stylesheet is linked by `ensureFaces` once the page
is idle and nothing waits on it; the shared picture links it itself and loads
the faces its words need before it draws.

Main and the desk have no pixel face. Their four stacks end in the system's
own Korean, Japanese and Chinese sans (`Apple SD Gothic Neo`, `Hiragino Sans`,
`PingFang SC`, `Noto Sans CJK KR`) before the generic family.

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

On the wall every one of them is an LCD's corner, 3px, and a sheet's is 4px
(2.6).

A letter is not a paper any more (2.5), so `--r-card` is Main's ping card and
the plain cream sheet. A screen's corner is its own quirk, between 0.8% and
1.9% of its width, which is a pixel or two on every phone: the corner of an
LCD, never a card's.

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
| the deck (`screens/Letter.jsx`) | the letter before and the letter after stand either side of an opened letter, asleep: dimmer and a little smaller, a sliver at the edges of a phone and whole in a wide room, coming up over 480ms from 420ms into the card's wake. A hand has the card one to one and each screen is lit by how near the middle it stands. Let go, the strip runs on in 240 to 420ms at the speed it was let go at, on the travel curve bent to leave at the hand's speed, or springs home in 220 to 380ms; a press on a neighbour turns it in 340ms and an arrow key in 260ms. The first two times a device opens it the card leans 26px toward the next letter and back, 380ms out and 680ms home. Under reduced motion a turn is a cut and nothing leans |
| `wl-mast-ring` | the ring leaving the veil's capsule every 1600ms, the shape of the pulse a tap sends through the crowd |
| `wl-glass-out`, `wl-tab-drop` | a sheet's glass fading in place while a card flies home to its disc; the tab at the foot of the wall being put away |
| the story (`PixelStory`) | two shadows running in on a letter's night screen, meeting, and becoming the mark (2.6). The run is stepped, 80ms a frame and three cells a frame, so no foot slides; the frame they touch inverts the whole panel for 70ms; they hold on for 480ms; then the ground lifts into the ring over 380ms and the hug gathers into the star from its middle out, 220 to 660ms, every pixel on a hard start and a long settle and rounded to a whole cell each frame, so the pixels hop. Tap to land |
| `wl-light-run` | the running light, round the edge of the thing it is on |
| the veil (`.wl-veil`) | the wall's masthead laid over its dimmed, out of focus hive, centred in the glass, lifted once per tab, from the tap: 1600 to 2300ms on a shallow ease out, the grey and the type opened together as a circle from where the veil was touched, while a pulse runs through the crowd under it and the lens and the focus arrive with the light (`wall/Hive.jsx`). Then the bar's controls and the dock rise in, 620 to 700ms, a beat apart. The ear does not move. Under reduced motion it goes without travelling |
| the tap (`Hive.jsx tapAt`) | a disc pressed: the same pulse sent out from it, the field travelling to bring it into the light (a 300ms time constant), and its letter opening out of it 520ms in. The card closes back into the disc on the way out, 420ms, while the glass fades in place |
| the intro (`.hi`) | the same three seconds at `/` and at `/berkeley`, once per tab: a letter's night screen on black, and the story on it. Black for 120ms, then the screen wakes (`wl-wake`) and throws its light on the black; the two run in at 300, meet at 1180, and the mark stands whole at 2470. The lift at 2870, which waits on the page being ready: the screen goes to sleep (`wl-sleep`, 560ms), the phone rises 18px and dissolves, and the black goes over 720ms, gone at 3590. The status row carries the aerial and the battery and nothing that would say a message had come in. Skippable on any tap or key, which lands the mark and lifts at once. Under reduced motion it draws the mark and lifts after 560ms. `?beat=` and `?t=` hold it for the screenshot loop in development, and `?intro=ascii` and `?tint=green` draw it typed or on the classic green, for comparison |
| the door (`.wl-join-scr`) | the mechanic, on the same screen: @you runs in at 800, once the screen is on, and stands; @them at 1700 and stands, each lit in the status row as they arrive; at 2600 both set off on the same frame and meet, and the mark forms. The three lines arrive on those beats and the key as they touch |
| the mutual (`.is-reveal`) | a sheet in the black room: the story with both handles in the status row, `it's mutual.` typed from the frame they touch at 70ms a character with the caret after it, the two lines on unlit panels rising together once the mark is whole, and the key 360ms after. A tap that is not on a control lands all of it. A tab opened on it does not play the intro first: it is the same story, and the second telling would be the one waited through |

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

One component, `wall/ground.jsx`, mounted once per shell, and there are two
rooms in it.

**The wall is the black room** (`Ground room`). Every letter is a screen left
on in a dark room, and an opened letter is one of them lit in a black room, so
the wall is that room with every screen on: `#000`, four enormous far glows at
two to three and a half percent drifting on their own minute long clocks
(`.wl-far`), and the letter room's own grain, tile for tile (`feTurbulence` at
`0.85`, two octaves, 7 percent, screen, 200px). The corners fall away over the
screens (`.wl-root.is-room .wl-stage::after`). No canvas, no WebGL, no sky and
no star. Opening a letter turns the other screens off without changing the
room. The sheets the wall raises (find, the gate, a report, a removal) are
black glass with the same grain, and the browser's bar and the page behind
the wall are black too.

**Main keeps its sky** (`/optout`, `/copy`, `/signin`): four fixed layers
under everything, in this order, never reordered.

| Layer | What it is |
| --- | --- |
| `.wl-sky` | the clouds, drawn by the field's own loop (field.js, THE SKY BEHIND THE STARS). The void with two lights in it at a whisper, the body of the cloud and the veins along its warp: the galaxy's violet and pink (`SKY_TINT`). A domain warped noise with a current, posterised through an 8x8 ordered dither at two pixels so it is texture and not gradient. It is a layer of the one field, drifting to the right the way the stars drift, at the pace of a star in the middle of the field, churning as it goes, and shifting to the hand the way a star shifts; it lights by a few counts under the pointer, and it parts round the type: whichever screen is up registers its headline (`useSkyAvoid` in ground.jsx) and the clouds flow round it, thin under it and gather a little pink along its edge. One pixel per CSS pixel, capped under a megapixel. Without WebGL2 it is a still gradient of the same two colours |
| `.wl-halo` | one enormous off centre warm radial at 7.5 percent, plus a cold one at 4.5. It is what stops the void reading as `#000` with things on it |
| `.wl-starfield` | the point field, on the GPU (`wall/field.js`): depth per point, parallax off the hand, and a count that is a density, about 0.9 points per thousand CSS pixels on every screen, so a desktop is as dense as a phone. It used to be a floor of 320 points that only a phone ever hit, and the desktop sky was three times sparser |
| `.wl-grain` | `feTurbulence` at `baseFrequency 0.84`, three octaves, desaturated, 3.6 percent, tiled at 190px |

The grain is load bearing rather than decoration. Without it the black is a dead
screen. On the sky it uses plain opacity and no `mix-blend-mode`, because a
blending sheet over a live canvas takes every animation off the compositor's
fast path and there is a canvas of drifting points directly underneath it. The
black room has no canvas, so its grain screens like the letter room's.

---

## 8. The components

Every one of these is on `design/components.html` in each of its states.

The tables describe each as Main draws it. On the wall the same component is
drawn as the phone (2.6): the metal capsule is the lit key, the ghost capsule
is a bezel key, a tag takes an LCD's corner, the icon button and the close mark
are square keys with pixel glyphs, a field is an LCD box, a sheet is an unlit panel, and the chosen
row inverts. Where a wall surface differs beyond that, its row says so.

### 8.1 Controls

| Component | Class | Notes |
| --- | --- | --- |
| Primary capsule | `.wl-pill.wl-lq`, `LiquidButton` | the liquid metal capsule: a chalk face inside a metal rim, poured by the same fragment shader the mark is (`wall/LiquidButton.jsx`), with the word over both, 40px, 50px at `is-wide`. One per screen. It keeps `.wl-pill` for its metrics, so every size and every contextual rule still reaches it, and brings only its own surface. The clock idles at 0.6, doubles under a pointer and is thrown to 2.4 for the length of a press, which leaves a ripple where the hand landed. Mounts are counted and capped at four per page; past the cap, with no WebGL2, and disabled, it draws the still frame of the same material. **The face is chalk as of 23 September**, in the paper's own three steps and struck in the paper's ink, with no shadow under the word — a dark shadow on white is grime, not depth — and a bloom added to `--lq-seat`, because a chalk capsule on the void throws a little warm light and without it the brightest object on the screen is pasted onto the room rather than standing in it. It was a near-black plate before that, which made the primary a hole in the metal, and a hole cannot be the one bright thing on a screen. This is NOT the chalk fill the primary wore until 21 September: that one had the running light on the FILL, a second current under the word; here the light is the two pixels round the edge and the face is flat, so there is one bright object and one moving one and they are not the same object. The change is on the ROLE: `Pill tone="light"` is this object on every screen, and one surface making an exception for itself is the thing this component exists to stop. Note the cost, and it is deliberate: on a screen where a letter is open the paper and the capsule are both bright, which is rule 2 spent twice — the wall, where no paper is open, is the screen this was decided for |
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
| Look panel | `.wl-look`, `Look.jsx` | the composer's colours: under its screen while the left key is on, and always beside it on a spread, where that key takes the focus to them. One pool of twelve under no heading, in the order of a spectrum, each colour drawn as the small screen it makes (`Mini`) with a print's own light on it, the chosen one ringed and named under the lot. Six to a row and two even rows at every width, the swatches taking what the row has up to 40px, and nothing scrolls sideways, centred under the name it stands over, beside the screen as under it. A swatch is a key: a step brighter under a pointer, a pixel down under a finger, never scaled. The screen is the preview, and it gives the panel room while it is open. Escape takes the panel down before the sheet |
| Sheet | `.wl-sheet` | rises off the bottom edge over a wall that stays mounted, dimmed and slightly out of focus behind it. A centred dialog at 900px. It is GLASS, and it has to look like it. Written as glass and drawn as a panel (a tint at 66 to 80 percent over a fourteen pixel blur, which on a near-black wall is opaque), nothing came through it while the search plate twelve pixels above it read as the glass it is, which is two surfaces on one ground in two materials. A sheet is also the biggest surface here, and a big translucent surface reads as a THICKER one, so it takes the heavier blur and the deeper shadow rather than the lighter. On the wall it is not glass: an opaque unlit panel under the pixel grid, a one pixel bezel, 4px corners and a grip of three pixel dashes (2.6) |
| Row | `.wl-row`, `PersonRow` | a person: the face, the name, the handle and a line under it, and the way in at the end. The sky's standing pings and the wall's search are the same row. `is-lit` for the one that matters. A letter to a first name draws the name as written in the name's face, a monogram, and no handle line |
| Who | `.wl-who` | the face with the name and the handle beside it. On the void and on paper |
| You | `.wl-me` | the chip on Main's bar, on every screen: the face and the handle once one is proved, and the way in before that |
| Dock | `.wl-dock` | a sticky gradient off the bottom edge. On the wall it carries only what is about the person looking, one thing at a time: the tab (`.wl-tab`), an unlit panel with the faces of the names they wrote to, the one door out of the wall, and `not now` under it, which puts it away for a few days or until another letter goes up; or the notice (`.wl-down`), when a letter of theirs has been taken down, an unlit phone note with the envelope, saying it went against the terms, with their words back and one soft key, `ok`. The composer's act is the lit key in the dock, with the pixel pen (`WriteAct`, `.wl-write-act`); it read `.wl-top-write` here for a while and no such class has ever been in the markup or the stylesheet, which is how a preview route that pressed it went on shooting the bare wall |
| Top bar | `.wl-top` | the brand is the way home, and it is chalk while everything beside it is ash. On the wall the bar carries the brand and the person and nothing else: the search stands under it (Seek) and the act at the foot (Dock). The person is a 40px square key round the square face, which fills it at thirty, or the pixel key while nobody is signed in. The `write` capsule and the glass that stood beside it came off when the search and the act moved |
| Veil | `.wl-veil` | the wall's masthead, over the hive rather than above it: the title, the one line and the `view the wall` capsule, centred in the glass, on a scrim that is deep under the words, gone where they are not, and is itself the way in. The capsule is the product's primary, the same object as `write a letter` at the foot of the wall, which on the wall is the lit key (2.6): it was the last caller anywhere of the chalk plate with the running light inside it and an arrow after the word, so the first button anybody pressed was the one button that did not match the product behind it. The arrow went with the plate: an arrow inside a capsule is the arrow LINK's voice borrowed by a control that is already a door. Nothing else is on the screen under it: no dock, no foot, no controls in the bar. It opens as a circle from the tap. Once per tab |
| Ear | `.wl-ear`, and `.hm-ear` on the front door | one line in the identifier face, at the label's size and tracking, the word in ash and the figure in chalk: on the door, the way to the wall while one is open; on the wall, the campus and the count, under the bar, standing still through the veil's lift so the veil and the field share one masthead element. The wall's figure is a `Roll`, a step larger than its word, and turns when a letter goes up. The term stood at the end of the line for a while and came off, so the line above the search stays quiet. On the wall it is the phone's operator line (2.6): the campus, the envelope, the figure in chalk and `letters` in ash, all in Jersey |
| Seek | `.wl-seek-glass`, `Seek` in `screens/Wall.jsx` | the wall's own question, under the ear, once the veil has gone: an unlit LCD strip with the pixel lens in the place a field paints its @ (`HandleField kind="search"`), `look for a name` beside it, capped at the column's measure. It reads LEFT TO RIGHT, because it is a field. The lens stood against the left edge of nothing and the question was centred in a 16ch box beside it, so the glass had a hundred pixels of dead room either side of the one thing in it and the first character typed landed in the middle of the capsule, with every character after it shoving the ones already typed sideways: the text moved while it was being read and the caret never sat still. Every other field in the build is a left-aligned baseline, and the same question on the `/find` sheet was left aligned all along. It carries a hairline, and did not until 22 September: the argument against one was that a white hairline over a crowd of PALE discs is an edge belonging to no object, and that the blur was the material and the edge both. The discs are not pale any more (2.5a), and the plate itself came down with them. It was 440px filled at ten per cent chalk over a ground at L\* 2, under a 48px drop, which made the one object on the wall that is not about a person the heaviest thing on the screen, standing over the densest part of the hive. It is a field and it weighs what a field weighs now: 348px, 44px high, seated on a hairline rather than on a shadow, and in the wall's black room it is neutral grey glass (`rgba(44, 44, 44, 0.42)`), opaque enough that no screen's colour shows in it. At that fill the blur can no longer be the edge as well, and the hairline has a dark crowd to sit against. Its `saturate(1.25)` came off with the rest: a backdrop filter saturates what is BEHIND it, and what is behind this is forty faces, so the glass was amplifying the colour of every disc it covered. It ANSWERS IN PLACE: the capsule is the head of a panel that grows downward inside the same glass as the rows arrive (`useSuggest`, six rows) and folds back when the field is emptied or left, with nothing about the head moving while it opens. No caption over the rows. It was grey glass until 24 September, the last piece of an Apple interface on a wall of phones, and it is the phone's now (2.6): the unlit panel at ninety percent under the pixel grid, the bezel lit while it has the focus, the question in Jersey, and the answers opening under a dotted seam with the active one inverted and `looking` beside the blinking hourglass while they come. It used to behave as a door, pushing `/find` and a second field onto a sheet; that sheet is still at `/find` as a link into the search. It replaced a 40px glass ring in the bar. The council of 20 September, `docs/THE-COUNCIL.md` |
| Hive | `.wl-hive`, `Hive` | the wall's names as a crowd of faces on a hexagonal torus, bent by a lens (`wall/Hive.jsx`): one continuous function of distance from the light sets a disc's size, how far the lattice opens around it, and how much of the room left over it is allowed to wander in — so the middle is large, tight and ordered and the rim is small, far apart and scattered. It runs corner to corner behind the bar and the pill, dissolving at every edge under two gradients, and the far screens are out of focus in six steps (`Hive.jsx BLUR`, 0.5 to 3.2px on the glass, each dimmer and from the third lit by a round glow in its own colour), so the sides of the glass are distant lights and never cards cut off by the frame; under the veil every screen is at least four steps out. It drifts by itself and every disc breathes on its own clock; it can be pulled in any direction, and under a mouse it swells where the pointer is, the screens near the pointer come into focus, and the one pointed at brightens and says whose it is on a small tag under it (15px, `.wl-cell-tag`, hover devices only). On a phone the pitch is a fifth of the width (80px at 390). A press flies the disc into the letter's card (`wall/Morph.jsx`). `app/src/wall/README.md`, The hive |
| Running light | `.wl-light`, `Light` | a point of light running the host's own edge, corners and all, on an `offset-path` the component measures. Three grounds: `star`, the dark plate the result card waits on; `chalk`, an opaque chalk plate, so the light shows around the capsule as a halo; and `none`, for a host that already has a ground of its own (the composer's body), where the beam alone is drawn, softened exactly as `star`'s is. Spent on the result card while it is looking, on the composer's body while the resolver is out, on the veil's way in (`.wl-mast-go-pill`), and on the mutual row on the sky. It came off the primary when the primary became metal: a rose point travelling round the inside of a metal capsule is two currents under one word. It is not drawn on the wall (2.6): a wait there is the pixel hourglass, blinking |

### 8.3 Fields

A bare baseline, not a box. The `@` is painted beside the input, is never in the
value, and cannot be backspaced away. On focus a gradient line draws across the
rule in 520ms and the `@` lifts from `--ash-dim` to `--ash`.

That is Main's field. On the wall every field is an LCD box (2.6): the unlit
panel, the value in Jersey, no line drawn across it, and the bezel lit while it
has the focus, since the input itself carries no outline.

**The caret is the phone's** (`caret.jsx`), on the wall only: the draft's
screen and the fields of the chrome (the handle, the search, the address, the
code and the reason). Main keeps the browser's. It is drawn on the face's own
grid, where a stroke is two pixels, the gap between two letters one and a
space four: between words and at the end of them it is a bar four pixels
wide (0.214em, two strokes), from the top of the capitals to a stroke under
the line, standing in the cell the next character will take; in the middle
of a word, where a bar that wide swallowed a narrow letter, it is the letter
after it inverted, a cell of that letter's width with the letter struck out
in the ground's colour. On the screen it is the words' ink with their bloom
and sits under the screen's tilt, blur and press, so a print prints it in
its darkest ink; in the chrome it is chalk, on the device's pixels, with no
glow. It blinks on the phone's beat (1060ms, two steps), lit at once and
again from the lit half on every keystroke, so it is solid while somebody
types; still under reduced motion; gone while a range is selected, which is
drawn inverted in its place; kept at the end of what an input method is
composing; and the browser's own caret in a forced colour scheme and in any
state it does not draw. An empty draft's painted cursor (`wl-draft-cur`) is
the same bar, so a tap does not change it. The draft's native caret is the
words' ink: the chrome's chalk rule reached it once and drew a chalk hairline
on a pale panel.

| Component | Class |
| --- | --- |
| Handle field | `.wl-field`, `.wl-field.is-lg`. Three kinds, one baseline: `handle`, the painted `@`; `name` (`.is-name`), the `@` gone and the input set in the display face, because a name is something a person means and a handle is an identifier, for a letter to a first name; `search` (`.is-search`), the lens in the `@`'s place (the pixel `find` glyph on the wall), since a name is as good an answer as a handle |
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
| `Face` | a small square of the night LCD beside a handle: the picture dithered into the screen's ink (`PixelPic`), or the monogram in `--f-s40`. Never round (2.5) |
| `Mark` | the constellation, seeded from a handle. Retired from the product, kept on this page |
| `Halftone` | the dotted sphere. Off the wall's masthead since the Campanile; kept |
| `Campanile` | a front elevation of Sather Tower in hairlines, from a handful of numbers, with the lantern lit in `--gold`. `width` (the height is three times it, or 2.84 standing), `lit`, `twinkle`, `stands`. It stood in the wall's masthead corner and then on the count as its plinth, and it came off with the hive: a drawing beside a headline that had already said which campus this was. Kept, and drawn by nothing |
| `Bloom` | the soft blurred mass. The whole accent system, spent once |
| `Field` | the drifting points |
| `Dots` | step dots. The one place in the build with a sequence worth counting |
| `Flap` | a count on split flaps: one per digit, the digit in `--gold` on a flat plate a step up from the void, a hairline round it and a seam across it, the word beside it. The one count in the build set in the util face rather than the mono, because on a board a figure is a thing on a plate and not an identifier in a line of type. The top half of the old digit folds down over the new one when the number changes, and on mount it can roll into place. It was the wall's count on the masthead; that is a line in the ear now, and the flaps are kept, drawn on the components sheet and by nothing in the product. Nothing moves under reduced motion (`.wl-flap`) |
| `Heart` | the tenth glyph, on the icon set's grid at its stroke, with two states: a hairline until this person has pressed it, filled with its own ink when they have. It stands on the account screen beside each of a person's letters (`Gate.jsx`), and on the wall it is the screen's own pixel heart, outlined and filled (`PIX.heartO`, `PIX.heart`, 2.6). A letter's heart is not this component: it is the centre soft key on the letter's screen (2.5). It stood in a letter's foot while letters were paper |
| `Roll` | a count whose figures turn: each digit a window one figure tall over a column of the ten, slid to the figure it shows, 640ms on `--ease` when the number changes and still on mount. Keyed from the right so a hundredth letter mounts a column at the head and keeps the two it had. The wall's count in the ear. Under reduced motion the columns do not slide (`.wl-roll`) |
| `LiquidMark` | the mark as a material. A liquid metal fragment shader cut to the mark's silhouette, on `app/public/liquid-mark.png`, which `scripts/export-liquid.mjs` writes from the geometry. Spent on the root wall's poster, the seal on the hero's scene and a mutual on the sky. The flat mark stands under it until the metal is opaque and leaves after, 900ms on `--ease-out` then 320ms: a fade in over the flat, never a crossfade, because two opaque shapes of one silhouette crossfading on black dip to three quarters halfway and blink. See 3.5 |
| `PixelStory` | the story on a screen's body: a canvas of the phone's cells, drawn from `pixmark.js` (the runners, the hug, the mark on its grid, and the three stories as functions of the clock). `at` holds the clock on a frame, `mode="ascii"` sets each lit cell as a character instead, for comparison only. `SQUARE` holds the screen square to the camera. See 2.6 |
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

On the wall (2.6) nothing shrinks when it is pressed: the lit key drops a pixel
and goes a step darker, and a bezel key or a square key inverts. Focus rings
follow the keys' square corners.

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
| `app/src/wall/phone.css` | the wall's phone: the tokens remapped for `.wl-root.is-room`, and the parts both surfaces share, drawn as the phone (2.6) |
| `app/src/wall/mark.js` | the mark's geometry |
| `app/src/wall/pixmark.js` | the mark on a grid of the phone's cells, the two runners, and the stories they are in (2.6) |
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
