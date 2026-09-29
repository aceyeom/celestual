# Celestual design system

The waypoint. Anything visual references this file.

Three inputs made it, and they are all in the repo:

| Input | What it settles |
| --- | --- |
| `design/source/eclipse.html` | the mark. Geometry, crossings, the size ladder. The mark and the lockup on the phone's grid are `app/src/wall/brand.js` (3.1a) |
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
beside the aerial, and after the aerial an envelope, steady, once the person
the letter is to has answered it; the pen, the mode, the handle), the words,
and the three soft keys at the foot (`options`, the heart and its count, the
replies' speech bubble and its count, drawn exactly as the heart is, with no
plate and no light on it; `share` where a letter has no thread), set in one
face, Jersey 10, the Series 40 grid (`--f-s40`). The only thing a writer
chooses about how a letter looks is the COLOUR it is lit in (the greeting
across its top is words, and theirs; a private note, lit in the colour its
person's name picks, has no colour to choose, and its writer sets its face
instead, the line across its top and its battery, 0073, below and 2.6), and
each colour carries its own treatment with it:

| kind | colours | what it is |
| --- | --- | --- |
| lit | night, white, ice, green, amber, rose, lilac | a backlit LCD photographed in the dark: the panel glows, the bands above and below are the phone's dark glass, the lit words bloom |
| negative | negative | the same screen with the panel dark and the words the bright thing |
| poster | teal | that photograph screen printed in four flat inks: an SVG filter quantises the screen's greys into the inks, with grain where a press breaks an edge. Its bands are laid in one of its inks, the status and the keys struck out in the palest |
| riso | violet / yellow | two drum inks on warm paper, the second a hair out of register |
| xerox | xerox | photocopied and blown out: one threshold between toner and paper, walked by the copier's heat |
| brat | acid | the album cover's square: an acid lime panel between near black bands, black words a hair soft, photographed on cheap film. Painted, never pressed (below) |

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

**Every screen keeps the phone's two bands.** The status across the top and
the keys at the foot stand on two bands of the phone's glass above and below
the panel, on all twelve: a lit screen's dark glass, the negative's, a copy's
toner, a print's bands laid in one of its own inks with the status and the keys
struck out in the palest (`bands` in `looks.js`: teal and violet / yellow in
the second ink), and acid's near black. Lilac is lit now, a lavender between
rose and ice, and draws the lit screen's own dark glass (`looks.js`, lilac).
Teal, lilac and
acid were one poster edge to edge until 26 September, and beside nine screens
with bands they read as three other objects rather than one phone in twelve
colours. Each keeps its own light on the panel between the bands.

| colour | bands | the words on them |
| --- | --- | --- |
| teal | the second ink, `#3D6257` | the palest, `#E3A58C` |
| violet / yellow | the violet drum, `#5A3DA8` | the paper, `#F4F0E4` |
| acid | the lime 88 percent to black, `#111900`, with the grain across them | the lime a fifth towards `#F4F07A` |

**Acid is the square.** It was a poster, a lime pulled out of the night
screen by the press with its hot corner caught in pale yellow, and beside the
others it read as one more tint of the same machine. The lime everybody
carries in their head is a flat square of `#8ACE00` with a word on it in
black, the type a little soft, as if made small once and blown up again. So
acid is that square (`kind: 'brat'`, the slug and the name still `acid`, so
no letter's row changes):

| part | what it is |
| --- | --- |
| the lime | `#8ACE00`, the panel between the bands, with no rule round it. Mixed 40 percent towards `#F4F07A` at this phone's hot corner (`--q-hx`, `--q-hy`), which on paper is where the lamp caught it, and 26 percent towards `#1C3300` at the edge. From across the room it is one flat colour |
| the bands | the phone's two, as every screen has: the lime's own shadow, `#111900`, with the status and the keys struck in the lime. The cover's two colours, the other way round |
| the grain | heavy and monochrome, in the lime itself: the film's dark specks laid over it (up to 36 percent black) and its light ones dodged into it (up to 26 percent grey in `color-dodge`), so a speck makes the lime deeper or brighter and never greyer or yellower, and black stays black. On the near black bands the light specks are lifted in `screen` instead, since dodging black leaves it black, so the grain runs across the whole square. An SVG `feTurbulence` inside a data URL image (`--wl-grain`, `--wl-grain-hi`), since an image's filter is drawn by every engine where a filter laid on the page is not drawn by WebKit; started where the letter's own grain starts (`--q-grain`) |
| the words | `#050505` on the lime, softened by `blur(0.18cqw)` on what the three rows hold (not on the bands themselves, so their edges and grain stay sharp) and a halo of the ink at 55 percent. Never so soft a word has to be guessed |
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
its own), on the panel between the bands. It is bound to the colour and never
a second choice, and the letter, the tile, the thumbnail and the shared
picture draw the same one:

| print | light | what it is |
| --- | --- | --- |
| (none) | corner | the backlight's hot corner, caught in the palest ink round the point it is brightest at. It was on every print and read as the same white stain on each, then acid's alone; acid is the square now, and the corner stays as the press's default and `?light=corner` |
| teal | keyline | no light on the panel, and a line of the palest ink round it, a hair inside the black rule and the bands |
| lilac | (none since it is lit) | it was the light as a halftone, white cones on a forty five degree lattice cut by the press into dots, until lilac left the press for the lit screens (`looks.js`, lilac) |
| violet / yellow | plain | no light: the panel the yellow drum, flat. It was called `bands` while violet / yellow was the one print with the phone's bands |

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

On a private note the battery is its writer's own (the owner, 29 September,
and 0073). They set it on the note's screen a bar at a time, full to start,
the empty one blinking as the phone's did, and it is kept with the note and
read with the words by the other person if it is ever mutual: how much they
had left in them, or whatever else they meant by it. It counts nothing, so it
claims nothing (VOICE.md 4, truth exactly), and it is drawn only where the
note is, on the writer's own screens and, once it is mutual, the other's. A
note from before 0073, which has none, still draws the battery running down
with its week on the account's screen, the only place it ever drew one.

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

`share`, the first row of the letter's options (the right soft key where a
letter has no thread), opens a menu drawn the way the phone drew one:
`to someone` hands the letter's picture to the share sheet, on a device that
has one, `save the picture` saves it, and `copy the link` copies the letter's
link. The
picture is drawn with a canvas (`share.js`), from the same table and the same
quirks, at 1080 by 1350 on black, and signed under the screen with the lockup
(3.3): the mark and `celestual.` drawn on their grid at two pixels a cell,
chalk at ninety percent, in the close bloom a lit thing has. It is `brand.js`'s
own cells laid as rectangles, so the picture signs itself with the pixels on the
bar, at twice their size, and not with a picture of them.
The address stood there before, in the pixel face at 42 percent, and it was
the only thing on the picture that said whose it was. The key read `send`
until 24 September, which is the composer's word for putting a letter up
(`send anonymously`), on a key that puts nothing up.
`npm run screens` draws that picture for every colour on five letter ids, which
is the check on the quirks: five phones, and none of them a different design.

### 2.6 The wall is the phone

A letter is a Series 40 screen (2.5), and the wall is where those screens are
kept, so everything on the wall round them is the same phone: one pixel face,
square keys, unlit panels and pixel glyphs. The brand is the phone's too: the
mark and `celestual.` are drawn in its cells (3). The product's own events, the intro
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
| the ping (`screens/Ping.jsx`) | the composer's room (`.is-write`): the step dots, the field in its body with the resolver's answer in the field's place, the wall's names under it, the people written to as the same rows, then the ping's own lit screen with the line on it (`Screen`, `ScreenDraft`), the gate's Instagram door when a proof is needed, and `sent privately.` as a note on that screen (`ScreenNote`). The screen's status rows are the note's face and the writer's to set (0073): the greeting is the composer's (`Greet`, `dear` and their first name until it is changed, forty characters, the dotted pixel line under it), and the battery is a key on the row with the same dotted line under it, a bar off at each press, the empty one blinking, and round to full. A line the writer set has the row to itself and the handle gives way to it. The first time on a device one line under the screen says `the greeting and battery are yours to set.`, and it fades where it stands at the first touch of either, the screen having given up that line's height. One lit key under it. On a spread it keeps the phone's one column, since it has no colours to stand beside the screen |
| the person (`screens/You.jsx`) | the account card on an unlit panel, its rows the letters' rows, with the key held at the foot of the panel over a dashed seam while the card scrolls under it. A standing ping opens onto its own lit screen, on the face its writer left it on (its greeting across the top and its battery, or `dear` and the name and a battery running down with its week for a note from before 0073), whose options key is the phone's menu (`ScreenMenu`) and whose `let it go?` is a note with two soft keys |

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
| `--f-serif` | gone. It named Newsreader for the brand's word and nothing else, and the word is drawn now (3.1a), so nothing read it. Newsreader itself stays in `faces.css`: it is Main's display face |
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
and the mutual (`/reveal/:handle`). A guy runs in from the left and a girl
from the right, her hair streaming and her dress swinging; he slows and opens
his arms, and her run carries her on into them, leaning gently the way she
ran, until she is held half behind him, his arms round her, and they breathe.
The panel's backlight turns pink, spreading from the two of them to the edges
of the glass and no further, and the whole phone becomes a letter lit in
rose, its panel, its two bands and its glow (`turn.js`, `intro.css`). The
intro's is seldom pink now: each load draws one of fifteen looks, one lit
colour, two or three of them melting into each other, or a rainbow of all
five, and the phone's bands and its light follow them (owner, 28 September:
it was pink too often, and it should go round more, above all the rainbow,
and in gradients); the door and the mutual stay the rose. Then
what they stood on glides into the ring and the two of them into the star,
each pixel travelling between cells at the display's rate and landing on the
grid (owner, 26 September: bodies and not stick figures, her lean gentle and
with her run, her tucked in behind him, no heart in the intro, the pink only
inside the phone, the frame the rose letter). On the door they first stand
apart and each sends a note, and the notes become one heart only when both
are there. The mutual is told once, over the whole screen (`Film.jsx`, 28
September, the owner asking for the animation over the entire screen with
both names in it): the two notes and then the two names are set on the glass
in its own pixels, theirs over yours, and are gone before the two of them
come in; the mark gathers up to the top of the story's grid (the top of the
glass on a desk, a little under half way down an upright phone's) and
`it's mutual.` is typed under it; and the camera pulls back and the glass closes onto the
head of one rose phone, the keepsake (`Keepsake.jsx`). The mark crowns it,
alive across the head of the glass with `it's mutual.` in its cells, the two
first names under that as one line, `Jules & Ace`, and under them the two
notes, theirs and then yours, each a small screen on the glass as the
phone's inbox showed a message: a panel a little brighter than the glass
with a hairline of the ink round it, a strip of darker rose across its top
carrying the line its writer set (`dear` and the other's name when they set
none) and the battery they left it on, both lines at the one size the longer
needs, then the words and `from Jules`. Nothing cuts the glass: the unlit
dots run on under everything on the story's own cells, and each small
screen's edges and the foot of its strip lie on the grid's lines between
them, never through a row of pixels (owner, 29 September: the three panels
and the crammed names were subdivided and generic where it should be the one
thing of its kind). A menu, the question before taking it off and every
note after a press are a third small screen of the same kind, as tall as
their rows, in the mark's place with the mark and the names stood still and
out of sight under it, the menu's name and where in it the chosen row is on
its strip, and framed in the ink while it has the keys; the notes stay in
view under it, and the band is the aerial and the night whatever is up. On a
desk the phone is as wide as it is tall and the two notes stand side by side
under the mark; on a phone on its side they stand beside it. Its light no longer drifts through the
colours: the rose is the colour of the mutual, and a loop that turned it to
green was a different phone every few seconds. Nothing in it is a picture. The two
of them are bodies (`folk.js`): a head, a neck, a torso with a chest and a
back, arms and legs thick at the top and thin at the wrist and the ankle,
her hair and her hem with weight, posed for every frame, their feet planted
where they land, and laid on the grid cell by cell by how much of each cell
they cover, in three inks (near, a mid tone for faces and arms, far for the
far limbs), with a line of light where he stands in front of her. The mark
is `mark.js` rasterised on an odd grid, 77 cells on the stories' 95 by 75
and 47 for the page's seal, the ring cut at a third of a cell and the star
at a half (`pixmark.js`). `PixelStory` draws it on a canvas in the screen's body,
a whole number of device pixels to a cell with the gap an LCD has, the unlit
cells faintly there. A screen with a story on it is held square to the
camera and loses the photograph's pixel grid and moire, because a canvas of
square cells under a tilt and a second grid beats into a moire of its own;
its dust, glare and backlight stay, but for the ghost column, which on the
keepsake's glass read as the old cut come back. The status row names nobody,
the keepsake's included, whose band is the aerial and the night it was told:
the two are named on its glass under the mark, `Jules & Ace`, first names
when both are known and both @s when either is not (the row was `Jules ·
Ace` until 29 September). The two of them are posed afresh at
the display's rate and the mark glides at it, the canvas is drawn only when
the frame changes, and the loop stops at the last frame (the keepsake's mark
goes on, ten frames a second). At the size of the screen the film's glass is
drawn a whole number of device pixels to a cell (`crisp`), at no more than
two million of them, and only where the frame changed (8.4).
Under reduced motion every story is drawn on its last frame.

**The context.** `PhoneChrome` (`parts.jsx`) is turned on at the wall's root
(`index.jsx`) and read by the shared parts that draw rather than lay out:
`Pill tone="light"` is the lit key and not `LiquidButton`; `Icon`, `Close`,
`ArrowLink` and `Heart` draw pixel glyphs; `Light` draws nothing. Main never
turns it on, so every one of them draws there as section 8 says.

**What stays the room's.** `Ecliptic` at the head of a door; `LiquidMark` on
the root wall's poster; and Instagram's and Google's own marks on their keys.
The brand was on this list, `Brand` on the bar, the site's foot and a letter
reached from a link, and the lockup on the shared picture, pinned to
Newsreader at 22px, 500 and `-0.022em` whatever the tokens said, on the
argument that a name is not set in a phone's font. It is not set in one now
either: since 29 September it is drawn on the phone's grid (3.1a), which is the
phone's language without being its type, and the room's serif sets nothing on
the wall. The intro was on this list until 25 September, in liquid metal, and
it was the one thing a person saw before either surface that belonged to
neither of them.

`design/components.html` draws the phone under its own heading, beside the
system it remaps.

### 2.7 The phone, sent out

What leaves the product is the phone too: every mail, the card a link unfurls
into, and the posts on Instagram. Each is a photograph of the intro's phone
(`quirks('intro')`), held square, lit in the black room, and none of it is drawn
by hand: `scripts/darkroom.mjs` renders the real `Screen` and `PixelStory`
through the app's own Vite and photographs them, so a screen that changes in
the product changes in every picture the next time they are made.

| Where | What |
| --- | --- |
| a mail (`supabase/functions/_shared/mail.ts`) | the night screen with the mark standing at the top of its glass and one line typed under it with the phone's cursor, where the mutual's says "it's mutual." (`tap to sign in.`, `tap to confirm.`, `a letter to you.`, `still feel it?`, `your code.`); for the mutual, that screen itself, rose, the mark alive. Under the phone the sentences, in the mail's own Helvetica and centred on its axis, one lit key as wide as the phone, the bezel key beside it when a mail offers a second thing, and the lockup signing the foot over the colophon |
| the card (`app/public/og.png`) | the frame the intro ends on, the mark on the rose letter, with the lockup beside it |
| Instagram (`design/instagram/`) | the same frame, larger, with the lockup signed under it as the shared picture is: a post and a story |
| the mutual's picture (`app/src/wall/keepshare.js`) | the keepsake itself, as it stands on the page, drawn on a canvas in the reader's browser when they share it: the rose phone, a story's 1080 by 1920 with everything that matters inside the feed's 4:5 crop; its band the aerial and the night it was told; the mark crowning the glass with `it's mutual.` in its cells, at six pixels to a cell whenever the notes keep words of 28 beside it and never under five; the two first names under it, `Jules & Ace`, only when both are known, and never an @ or a link (no line of names otherwise); the two notes, each a small screen with its panel and strip laid on the grid's lines, the line its writer set at the strip's start (their own unless it holds an @ or an address, else `dear` and the other's first name, else `dear you`), both lines at the one size the longer needs, and the battery they left it on at its end in the glyph a note's screen draws, then the words and `from` its writer (`from them` and `from me` when nobody is named); the words fitted at one size for both and, when even the least size will not hold them (a note of many short lines), each kept to its share of the room and cut with an ellipsis, so nothing ever leaves the crop (`keeplayout.js`, held by `check-stories.mjs` with lines of forty characters, Korean and Japanese lines and every battery); the unlit dots under all of it on the mark's cells, and the signature under the phone. `leave the notes off` draws the phone with the mark and the names alone, the mark larger, and no line and no battery either |

A mail client runs no stylesheet and loads no web font, so everything in a mail
that is the phone is a picture (`scripts/export-mail.mjs`): the screens are
animated GIFs whose first frame is the whole picture, since Outlook shows no
other, and the cursor blinks on the phone's beat and the light goes round the
mutual's ring on the rest; the keys and the lockup are PNGs. Each picture's
words are its alt text, and every sentence is text, so a mail with its
pictures blocked still says all of it.

---

## 3. The mark

It is called Ecliptic. A four point star of four curves and no corners, inside a
ring that passes behind it at the top of its circuit and in front of it at the
bottom.

It is drawn in two hands, from one geometry. The geometry is nine constants
and two path builders in `app/src/wall/mark.js`, exact at any size, and that
smooth drawing is kept where the mark is a material rather than the name: the
poured metal (3.5), the head of a door, the desk, and the stories, which
rasterise it for themselves (2.6). The brand, which is the mark and the word
wherever the product signs its name, is drawn on the phone's grid, a cell at a
time, in `app/src/wall/brand.js`. Everything round it is the phone (2.6), and a
name in the room's hand over a surface in the phone's read as a second product
laid on the first; the owner asked on 29 September for the logo to take the
new digital style, and to be beautiful in it. `design/source/eclipse.html` is
the specimen sheet of the geometry: four up positive and negative, a ladder from
128px to 12px, the four places the ring and the star cross, and the geometric
argument for the band.

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

### 3.1a The grids

The pixel mark keeps the vector's idea and its geometry by coming from it: each
grid is a raster of these constants, and then every cell of it is looked at.

| | Grid | What |
| --- | --- | --- |
| `MARK` | 25 by 25 | the brand's mark: the bar, the site's foot, the pictures, the exports. It is the stories' own raster (`pixmark.js` `markCells` at 29, whose lit cells fill 25) with the two crossings drawn by hand. At the back the ring stops a cell short of the needle on either side, so the needle reads as passing in front of it; at the front the ring runs on unbroken and the needle stops a cell short of it above and below, which is the gutter. The star keeps its concave sides, a cell narrower on each row than the raster gave it, so it reads as a sparkle rather than a diamond, and the ring's right end loses a cell at each corner, so it is round and not a bracket. The near half stays two cells deep along the bottom and the far half one, which is the band's three to one |
| `MARK_TAB` | 15 by 15 | the tab's, in a 16 pixel icon a cell in from the top and the left. Every cell is chosen by hand so the two crossings still read at one pixel a cell: at 16px the 25 scaled down is a grey blur, and so was the vector |
| the stories' | 47, 51, 77 | the page's seal, the mail's gathered mark, and the mark on the stories' 95 by 75 glass (the intro, the film, the keepsake): `markCells` cut at `MARK_CUT`, drawn by `PixelStory`, and not touched by any of this |
| `FACE` | x-height 11, ascenders 3 | the word's own letters: stems two cells wide and horizontals one, corners cut a cell, the `c` with a cell of terminal at each end, two cells between letters, the stop a two cell square on the baseline |

**The word is drawn, not set.** Three were drawn before one was kept, each as a
lockup at 25, 50 and 150 pixels on the room's black and on chalk: Jersey 10's
own cells, the phone's face, at its own spacing and with a cell more; these drawn
letters; and these letters with a small pixel star for the stop. Jersey was the
most native and the least a name. It is the face every label on the wall is set
in, so at the bar's size the brand read as one more label, and its two cell
horizontals made the word twice the weight of a ring one cell wide. The star for
a stop was a second star a word away from the first, and it cost the full stop,
which is half of how the name is written. The drawn letters keep the phone's
grid and its two cell stem, and their one cell horizontals give the word the
thick and thin the ring has, so the mark and the word read as one drawing; they
were the most beautiful of the three, and they stay legible at one pixel a cell.
Being drawn, the word needs no face to load, and it is the same object on a
canvas, in a mail and in a file as it is on the bar.

### 3.2 The exports

`design/logo/`, all written by `node scripts/export-mark.mjs` from `brand.js`.
Regenerate rather than edit. Every file is whole cells at a whole number of
pixels a cell: the SVGs say `crispEdges`, and the PNGs are written a pixel at a
time in node, with no browser between the cells and the file, so nothing in them
is anti-aliased.

| File | For |
| --- | --- |
| `mark.svg`, `lockup.svg` | embedding. Fill with `currentColor` |
| `mark-chalk.svg`, `mark-ink.svg`, `lockup-chalk.svg`, `lockup-ink.svg` | a fixed ink |
| `mark-{chalk,ink}-{1024,512,128}.png` | transparent, for placement: 40, 20 and 5 pixels a cell, centred |
| `mark-chalk-on-void-1024.png`, `mark-ink-on-chalk-1024.png` | on their ground, 26 pixels a cell. The void is the room's `#000` now |
| `lockup-{chalk,ink}.png` | transparent, 8 pixels a cell, cut to the drawing |
| `lockup-chalk-on-void.png`, `lockup-ink-on-chalk.png` | on their ground, with the clear space round it (3.3) |
| `mark-tab.svg` | the tab's own drawing, for the record of what a tab shows |
| `ecliptic.svg`, `ecliptic-chalk.svg`, `ecliptic-ink.svg` | the vector, from `mark.js` (`eclipticSVG`), for where the product still draws it (3.5) and for the system's sheet |

It writes into `app/public/` as well:

| File | For |
| --- | --- |
| `icon.svg` | the tab, linked from `index.html` and the legal pages. `MARK_TAB` in a 16 by 16 icon, struck in ink so it survives a near white tab strip and handed its chalk back by its own `prefers-color-scheme` rule. The wall injects the same string at runtime (`brand.js` `tabSVG`, `index.jsx`) |
| `apple-touch-icon.png` | a home screen, which takes a PNG and not an SVG: the mark in chalk on `#000` at six pixels a cell, 180 square, clear of the corners iOS rounds off |
| `lockup.svg` | the lockup in chalk at one pixel a cell, which the legal pages sign themselves with (`legal.css` `.brand`) |
| `mark.svg` | the mark in chalk, at the address it has always had |
| `mark-chalk-256.png` | the mark a mail was signed with before the mails carried the lockup, kept at its address for the mails already sent, which now show the mark they would be sent today |

`lockup.html`, the lockup as live markup while the word was type, is gone:
`lockup.svg` is the whole of it.

### 3.3 Placing it

- **Whole pixels, always.** The mark and the lockup are drawn at a whole number
  of pixels a cell with `crispEdges` and are never scaled by a fraction: on a
  screen at one pixel a cell, 25 tall, and in the pictures and the exports at
  two, three, five, six, eight and so on. A size between two steps is the
  smaller step. A press drops the drawing a pixel; nothing scales it.
- **Smallest size.** 25 pixels for the lockup and `MARK`, one a cell. Under that
  the only drawing is the tab's, `MARK_TAB`, at 16 (its 15 cells in a 16 pixel
  icon), which is where it stops. The old floor was 12px, below which the
  vector's far band closed up; a pixel drawing does not close up, it loses
  cells, so its floor is its own grid.
- **Clear space.** Half the mark's height on every side, which is twelve of its
  cells at whatever size it is drawn. The exports on a ground carry it. On a bar
  the lockup is a control, and the row gives it its air.
- **In the lockup**, the word stands six cells after the mark, on the mark's
  grid and its baseline: the x-height is rows 7 to 17 of the mark's 25, centred
  on the star's arms, so the stop sits on the ring's near band and the needle
  runs past the word at both ends. The whole is 113 cells by 25.
- **Light.** On a dark ground it has the close bloom a lit thing has on the
  phone (`screen.css` `.wl-lit-g`): the room's glow as two drop shadows, 3
  pixels at 30 percent and 9 at 10, and never a large soft shadow. On chalk it
  has none.
- **Colour.** It takes `currentColor` always. That is what lets one drawing be
  the bar's brand, the foot's, a picture's signature and a file on a deck with
  no tone prop anywhere.

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
constants (`pixmark.js`). Wherever the mark is the brand (the bar, the site's
foot, the tab, the pictures and the files) it is the pixel mark of 3.1a, and
`Ecliptic`, flat, is kept for where it is the room's material rather than its
name: the head of a door and the desk. Nothing glows behind the metal. The
metal is the light.

### 3.6 The brand, on every bar

`Brand` in `parts.jsx` is the lockup as a control: the mark and the word drawn
on their grid at one pixel a cell, 25 tall and 113 wide, both chalk while the
row around them is ash, each in the close bloom a lit thing has. It is the way
home on every bar in the product, the front door's, Main's flow screens' and
the wall's, and it stands again at the head of the site's foot. It used to be
three things: the word alone on the front door, the mark alone on Main's other
screens, and the mark alone on the wall, which is how one product came to sign
itself three ways. Off the front door it grows the chevron the wall's sheets
use, so "back" and "home" are the same target in the same place: on the wall
it is a real anchor to `/`, the front, and on a sheet it is the way back to
the wall under it. It used to scroll the wall to its top, which on a wall one
screen tall was a control that did nothing.

It is two drawings, the mark and the word, six pixels apart, so the narrowest
phones (under 360) can give the word back and keep the mark. Hover is a step
brighter, the bloom and nothing else, since the drawing is chalk already. A
press drops the whole of it a pixel and puts the bloom out, as the lit key
does, and it never scales: a drawing on a pixel grid scaled by 0.97 is a blur,
and on the wall nothing shrinks (9). The name is the anchor's label, and the
drawings are hidden from a reader as a glyph is.

Until 29 September it was the one object on the wall in the room's own hand
(2.6): the vector mark and the word in Newsreader over a surface set in Jersey,
on the argument that a name is not set in a phone's font. It is not set in one
now either. It is drawn in the phone's cells, the same drawing on Main, the
legal pages, the pictures and the mails. And a letter reached from a link
carries it, until the tab has been to the wall: the same lockup at the top
left across from the close key, a real anchor to the wall; and under the
letter, after the seal's `read it` on a sealed one, `view the wall`. Before
that, a letter somebody was sent was a screen with a real handle on it, a close
key and nothing else, which is what a confessions page run by anybody looks
like. Both links drop the wall's poster and land on the names, so the letter
closing reveals the wall rather than a second `view the wall`; the close key
still lands on the poster (`index.jsx` `toWall`, the `celestual.cold` flag in
`store.js`).

---

## 4. Type

Three faces, and the first does two jobs at two ends of one axis. Files are in
`app/public/fonts/`, fetched by `node scripts/fetch-faces.mjs` (and the pixel
face for Korean, Japanese and Chinese by `node scripts/fetch-cjk.mjs`, 4.0a)
and served from this origin. Nothing renders from a CDN.

This section is Main's type. On the wall one face carries every word, Jersey
10 (4.0a), and the tokens below are remapped to it (2.6). The brand's word is
not type anywhere: it is drawn (3.1a).

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
scale below, the intro and the overture, a card's title, the arrow link, the
ledger line and the tab. The lockup read them until it was drawn (3.1a).

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
phone and a phone has one font. The brand's word is not an exception: it is
not set at all, but drawn in the phone's cells (3.1a). On
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
| 200 to 240ms | a colour, a border, a hover; a screen put out |
| 220ms | a control's whole state change; the replies laid down |
| 260 to 340ms | a dimming, an entrance; the replies raised (280) |
| 380 to 420ms | a card powering on (380), the close mark's quarter turn |
| 460 to 540ms | a sheet arriving: 540 off the foot of a phone, 460 as a dialog from 900 wide |
| 520ms | the focus line drawing across a field |
| 620 to 900ms | the field changing speed, a rise, a sweep |
| 1200 to 1600ms | a bloom, a starfield fading out |

### 6.3 The named sequences

| Name | What it does |
| --- | --- |
| `wl-rise` | 22px up and in. The default entrance |
| `wl-fade` | opacity only, for something that must not move |
| `wl-rise-sheet`, `wl-drop-sheet` | a sheet off and back to the bottom edge |
| the power on (`screen.jsx` `useWake`, `screen.css` `is-power`) | where a card opens, its phone comes on the way a phone does when it is picked up (owner, 29 September: a phone turning on, not a page opening; subtle, smooth, still quick). The letter's first card, the composer's card, the ping's and the pings'. The glass is black for its first 45ms and then its backlight rises, one smooth ramp to full at 380ms on a curve that starts slow and lands soft (`cubic-bezier(0.45, 0.05, 0.25, 1)`), with no flicker, no dip and no blur; the light it throws, the halo and the room's light, follows 90ms behind on the same ramp; and the phone settles from .985 of its size to its size where it stands, on `--ease`, with no travel. Compositor work only: a black pane inside the glass whose opacity falls (`.wl-scr-veil`), the lights' opacity and the glass's `scale`. A print is uncovered in 240ms instead, since it is lit and does not light, and the square not at all. Put out, the screen dims to nothing in 200ms (`wl-sleep`) as the column leaves (`wl-letter-out`, 260ms, the card holding for 60 percent of it) and the room lifts from 60ms to 260ms, and the route changes when the column has gone (parts.jsx `Sheet` hears `wl-letter-out`). The composer's column no longer rises off the foot of the window: its room fades up in 320ms, the phone powers on where it stands, and the head, the question and the foot settle 6px into place over 300ms from 60ms. A step that puts the card on the glass of a sheet that is already up powers it on too. The old wake (`wl-wake`, a blurred flicker of 900ms that dipped to a third) is the intro's and the door's alone. Under reduced motion the screen is simply lit |
| `wl-twinkle` | the sparkle, 3600ms, scale and rotation, staggered by `--spark-delay` |
| `wl-shake`, `wl-cell-pop` | the composer's card refusing a press, a short travel side to side losing amplitude; and a name that has just arrived on the wall rising past its size and settling, under the pulse the wall sends out from its disc. No ring leaves the disc |
| `wl-cell-turn` | the wall turning over. Every couple of seconds one disc on the hive, out of the light and in off the rim, recedes and fades over 320ms and somebody else on the same wall comes up in its place over 510ms, both on `--ease-out`, with the face changed in the 150ms between where the orb is at nought opacity. No overshoot, no ring, no light and no pulse: an arrival is a claim that a letter went up and is drawn as one, and a turn claims nothing (`wall/Hive.jsx`, the cycle). Nothing turns over under the veil, under a sheet, during the opening, under a pulse or a pull, or under reduced motion |
| `wl-acts-in`, `wl-act-in` | the pane the flag opens on a letter, and its two rows arriving a beat apart |
| the deck (`screens/Letter.jsx`) | the letter before and the letter after stand either side of an opened letter, asleep: dimmer and a little smaller, a sliver at the edges of a phone and whole in a wide room, drawn once the card has powered on and the page is idle, and coming up out of the dark over 420ms on `--ease`. A turn's landing changes one attribute on two screens and nothing that is laid out (`data-side`, every screen in one box). A hand has the card one to one and each screen is lit by how near the middle it stands. Let go, the strip runs on in 240 to 420ms at the speed it was let go at, on the travel curve bent to leave at the hand's speed, or springs home in 220 to 380ms; a press on a neighbour turns it in 340ms and an arrow key in 260ms. The first two times a device opens it the card leans 26px toward the next letter and back, 1050ms in, 380ms out and 680ms home; a press on the card's keys while it leans ends the lean and is answered. Under reduced motion a turn is a cut and nothing leans |
| the replies (`Replies.jsx` `ThreadSheet`, `screens/Letter.jsx` the sheet) | a letter's right soft key raises its replies. On a phone a sheet comes up from the foot of the glass in 280ms on the sheet's curve (`--ease-sheet`), and on the same clock the letter's phone squares up, rises and steps back about its top until it stands whole between the close mark and the sheet's edge (never under half its size); the neighbours go dark in the first 140ms, the turn keys and the foot go. The motion starts on the frame after the press, on the compositor, before the letter has drawn anything for it. It goes down in 220ms, the neighbours coming back over 180ms from a fifth of the way in, and the letter takes a press or a hand from the moment it starts down (a press on the black round it is let go of until 160ms after it lands, so a second tap never closes the letter). The rows are on the sheet as it rises, with no stagger: the first twelve are there before it is raised and the rest of a long thread are put under them while it rises; a reply that arrives while it is up rises into its place on its own (`wl-rp-new`, 260ms). It was 440ms up and 340ms down with the rows coming up 40ms apart from 120ms in, and the letter swallowed every press for 620ms after a lay down, which the owner felt as a good second (29 September). A hand has the sheet one to one by its head, or by the list at its top pulled down; let go past three tenths of the way or thrown down faster than 0.11px/ms it goes, short it springs back, pulled up it gives; a press anywhere off it, the grip, the key or Escape lays it down, and anything that catches it moving catches it where it is seen. From 900 wide, or on a phone on its side, the letter slides left and a panel rises 24px into place at its right as it fades up, on the same clock, its light three quarters of it from a tenth in. Over a phone's keyboard the sheet rides up by what the keys cover, 280ms. The letter's own close takes it down in 220ms. Under reduced motion nothing travels: the letter stands where it is going and the sheet is simply there, and gone |
| `wl-mast-ring` | the ring leaving the veil's capsule every 1600ms, the shape of the pulse a tap sends through the crowd |
| `wl-tab-drop` | the tab at the foot of the wall being put away. (`wl-glass-out`, a sheet's glass fading in place while a card flew home to its disc, went with the flight; parts.jsx `Sheet` no longer listens for it) |
| the story (`PixelStory`) | a guy and a girl running in on a letter's night screen, the catch that carries her on into his arms and half behind him, and the mark (2.6). They are posed afresh at the display's rate with their feet planted where they land; the hold breathes; the backlight turns pink in a wave from the couple to the glass's edges and the phone becomes the rose letter (`PANEL` in `pixmark.js`, `turn.js`); then the ground and the pair glide into the ring and the star, easing in and out, each pixel landing on the grid. The mark is whole on the rose screen at about 2.9s. Tap to land |
| `wl-light-run` | the running light, round the edge of the thing it is on |
| the veil (`.wl-veil`) | the wall's masthead laid over its dimmed, out of focus hive, centred in the glass, lifted once per tab, from the tap: 1600 to 2300ms on a shallow ease out, the grey and the type opened together as a circle from where the veil was touched, while a pulse runs through the crowd under it and the lens and the focus arrive with the light (`wall/Hive.jsx`). Then the bar's controls and the dock rise in, 620 to 700ms, a beat apart. The ear does not move. Under reduced motion it goes without travelling |
| the tap (`Hive.jsx tapAt`) | a disc pressed: the same pulse sent out from it and the field travelling to bring it into the light (a 300ms time constant), under the letter, which opens on the press itself and powers on (the power on, above). It goes the way it came, put out where it stands, and does not fly back into the disc |
| the intro (`.hi`) | the same four seconds at `/` and at `/berkeley`, once per tab: a letter's night screen on black, and the story on it. Black, then at 40ms the screen wakes (`wl-wake`, 500ms) and throws its light on the black; the two run in at 780 and meet at 1690. At 2110 the backlight turns from where they hold each other, and at 2190, in the same movement, they and the ground glide into the mark, whole at 2780 while the last corners turn. The look is drawn on every load out of a bag of fifteen kept on the device (`Intro.jsx LOOKS`, `drawLook`), every colour in it a lit letter's own and only neighbours on the wheel side by side: five one colour, the rose, lilac, ice, green or amber letter's; five rainbows, in the bag twice, four round the wheel out from where they hold each other, each colour an equal share of the glass and their light on the black a wheel of the five turning once in 4.5s, two one way and two the other, and the prism, the five laid across the glass; and five gradients, peach, seaglass and twilight out from them and dusk and lagoon laid across, a look across throwing its light laid across behind the phone, still. Of every twenty loads ten are a rainbow, five a gradient and five one colour; never the same look, the same colour round the two of them or two pinks running. The bands and the status follow the colours of the glass under them. The lift at 3780, which waits on the page being ready: the screen goes to sleep (`wl-sleep`, 560ms), the phone rises 18px and dissolves, and the black goes over 610ms, gone at 4390. The status row carries the aerial and the battery and nothing that would say a message had come in. Skippable on any tap or key, which lands the mark and lifts at once. Under reduced motion it draws the mark and lifts after 1200ms. `?beat=` and `?t=` hold it in the rose for the screenshot loop in development, `?tint=` in any look, any lit colour or `rainbow`, and `?intro=ascii` and `?screen=green` draw it typed or on the classic green, for comparison |
| the door (`.wl-join-scr`) | the mechanic, on the same screen: @you runs in at 800, once the screen is on, and stands; @them at 1700 and stands, each lit in the status row as they arrive; at 2600 both set off on the same frame and meet, and the mark forms. The three lines arrive on those beats and the key as they touch |
| the mutual (`.is-reveal`, `Film.jsx`, `Keepsake.jsx`) | the first time on a device, a film over the whole screen in the black room. The slot's glass grows to the screen in 560ms on `--ease`, asleep under the slot's .38, the bands sliding in over its last quarter; out of nothing the backlight flickers on over 900ms instead. From the glass's nought: the two notes, then the two names from 760ms, a block of the glass at a time 40ms apart, whole from 1080ms for 1200ms (they stood 540ms, too short to read the second, until the review of 28 September) and gone the same way from 2280ms; the two of them in at 2890ms; the pink from 4220ms, the phone turning rose with it; the mark whole at 5370ms and gathering up at 5870ms; `it's mutual.` typed from 6030ms at 70ms a character with the caret after it. 300ms after it is said the camera pulls back, 900ms on the sweep, and the glass closes onto the keepsake's mark at the head of its glass while its room light comes up; the film goes out over the keepsake in 140ms as it unfolds from the mark (380ms on `--ease`, the strip squeezed onto its mark and the squeeze undone inside it, two transforms and no clip-path), the two names and both notes waking on one frame and the keys 240ms after. A menu, the question and a note after a press come up in the mark's place at once, as a phone put one on its screen, and nothing moves under them. A tap not on a control, a key that is not a modifier alone, or `skip` jumps to the sentence and pulls back 160ms later, in 600ms; in the push-in or the wake it waits for the glass, and in the pull-back it runs what is left two and a half times as fast. Every time after, it opens as the keepsake: the slot's glass flies to its mark in 360ms, the phone unfolds out from under it from 150ms in 280ms with its notes already there, the lit key 80ms behind it in 200ms, and the glass goes into the mark over 90ms, all of it in 450ms (it was 480ms of flight, the film's landing after it, and the notes a second from the press, until the review of 28 September). A tab opened on it does not play the intro first: it is the same story, and the second telling would be the one waited through |
| the slot (`Slot.jsx`) | a mutual in the private notes, and what it opens, small: the night screen along the row, a 20px band over a 40px panel, its backlight asleep (black at .38 over the panel) and the rose letter's edge light round it, a hairline and a trace of glow, so it reads as a mutual before it is watched and never as a key greyed out. Two sealed notes step toward each other a cell every 110ms (WAAPI transforms on `steps(n)`), each trailing what it has just left at .30, .15 and .07, stop two cells apart, hold 700ms, go out in three steps 110ms apart (.45, .15, nothing) and stay dark 550ms, n·110 + 1470ms a loop (3.56s on a phone), each slot at its own place in it. They never meet: the meeting is the film's. The pointer wakes the backlight (120ms, in two steps) and the notes lean in at twice the rate from where they are; the focus wakes it too, at once; a press inverts the panel and holds them. Opened once on this device it is the rose letter with one note on it, backlit (no veil: under it the keepsake read dimmer than the rows round it), the note blinking out and back in three steps 110ms apart (.45, .15, .45) every 4s, each slot at its own place in that. On the night it is dark and `searching…` until it is in sight, then wakes in the screen's flicker (500ms) and the notes set out 500ms after. Only the three newest not yet opened move and the three newest opened blink, none out of sight or on a hidden tab; under reduced motion each is its held frame (owner, 28 September: more beautiful, pixels moving across it, suspense) |

Stagger by 60 to 220ms. Two objects entering on the same frame read as one.

### 6.4 Reduced motion

Not a blanket `animation: none`. Two sequences are the only way a screen ever
reaches its final state, and switching those off leaves somebody looking at an
empty page. The JavaScript honours the preference by jumping to the last beat,
and the stylesheet removes what is left: drift, travel, blur and the twinkle.
Everything ends where it was going, it just does not move to get there.

Every surface has to be correct as a still frame. If it is not, the motion is
carrying meaning that the layout should have carried.

The stylesheet's floor under all of it (wall.css, REDUCED MOTION) takes every
animation and transition on the wall to a millisecond, with `!important`, so a
gentler fade a file asks for under this preference is a millisecond too unless
it is itself `!important` and more specific; and it does not take delays away,
so an entrance held for a delay under it is held, and then lands. The power on
is never started under the preference (`useWake` answers nothing), and the
words round the composer's phone are simply there.

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
| Sheet | `.wl-sheet` | rises off the bottom edge over a wall that stays mounted, dimmed and slightly out of focus behind it. A centred dialog at 900px. It is GLASS, and it has to look like it. Written as glass and drawn as a panel (a tint at 66 to 80 percent over a fourteen pixel blur, which on a near-black wall is opaque), nothing came through it while the search plate twelve pixels above it read as the glass it is, which is two surfaces on one ground in two materials. A sheet is also the biggest surface here, and a big translucent surface reads as a THICKER one, so it takes the heavier blur and the deeper shadow rather than the lighter. On the wall it is not glass: an opaque unlit panel under the pixel grid, a one pixel bezel, 4px corners and a grip of three pixel dashes (2.6). A letter's replies are the one sheet raised over another (`.wl-th`, `Replies.jsx` `ThreadSheet`): the same panel, standing on the letter's glass rather than on a route of its own, so it is not a `Sheet` and takes none of its ways out; it is laid down by a press off it, its grip, a pull, its key or Escape, all heard by the letter, and it carries the letter's own light on the edge that faces the letter and on the recipient's badge. From 900 wide it is a panel beside the letter, not a dialog (6.3) |
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
| `Ecliptic` | the mark as a vector, where it is a material rather than the name: the head of a door, the desk. `size`, `sweep` |
| `Brand` | the lockup on the phone's grid, as a control (`parts.jsx`, from `brand.js`): the way home on every bar and at the head of the foot. See 3.6 |
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
| `PixelStory` | the story on a screen's body: a canvas of the phone's cells, drawn from `pixmark.js` and `folk.js` (the two of them, the notes and the hearts, the mark on its grid, and the three stories as functions of the clock). `at` holds the clock on a frame, `mode="ascii"` sets each lit cell as a character instead, for comparison only. `SQUARE` holds the screen square to the camera. `crisp` is for a glass the size of the screen (the mutual's film): a whole number of device pixels to a cell, up to three to a point and two million pixels in all, drawn only where the frame changed, its pink a pixel to four cells. `onLayout` says where the cells are each time the glass is laid out, so the film can land on the keepsake's. `paintStill` draws one frame on a canvas with no screen round it (the mutual's picture). `dots` off leaves its unlit dots to the page, which lays them over the whole of the keepsake's glass on the same cells, and to the picture, which does the same. See 2.6 |
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
| `app/src/wall/brand.js` | the brand on the phone's grid: the mark at 25, the tab's at 15, the word's letters, the lockup, and the SVG strings the tab, the pictures and the exports are made of (3.1a) |
| `app/src/wall/pixmark.js` | the mark on a grid of the phone's cells, the two runners, and the stories they are in (2.6) |
| `app/src/wall/art.jsx` | every drawn ornament |
| `app/public/fonts/` | the three faces, and the `faces.css` that declares them |
| `scripts/export-mark.mjs` | writes `design/logo/`, and the tab's icon, the home screen's, the legal pages' lockup and the chalk marks in `app/public/` |
| `scripts/export-liquid.mjs` | writes `app/public/liquid-mark.png`, the shader's mask, from the same geometry |
| `scripts/fetch-faces.mjs` | writes `app/public/fonts/` |
| `scripts/shots.mjs` | the screenshot loop |
| `scripts/darkroom.mjs` | photographs the real screen for everything sent out of the product (2.7) |
| `scripts/export-mail.mjs` | writes `app/public/mail/`, the mails' screens, keys and lockup |
| `scripts/export-og.mjs` | writes `app/public/og.png` and `design/instagram/` |
| `scripts/mail-preview.mjs` | the screenshot loop, for every mail |

### The one that is not here

`docs/DESIGN.md` documented the bindery: a leather case, one hue from chocolate
to ivory, materials drawn per pixel. That system is retired by
`docs/rebuild-spec.md` section 2 and this file replaces it. Its code is still
live at the old routes until the Wall and Main rebuild lands, and it is held in
git history until then.
