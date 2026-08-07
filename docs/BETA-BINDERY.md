# THE BINDERY — the `/beta` rebrand

A complete, second brand for celestual, living at **`/beta`**, built to be
assessed beside the production one rather than merged into it.

It shares **no design** with the galaxy edition: not a colour token, not a
typeface, not a corner radius, not a shadow, not a screen. `app/src/beta/`
imports nothing from `app/src/theme.js`, `styles.css` or `components/`, and
nothing in production imports from `beta/`.

It does share the **machine**: the sky engine (`sky/`, `galaxy.js`) and the zoom
curve (`card/zoom.js`), parameterized. That is deliberate — the mechanics and
the animations are meant to be identical to the demo's, and the only honest way
to be identical to something is to be the same code.

> This does **not** replace [DESIGN.md](./DESIGN.md). The galaxy edition is
> still the production look and its design lock still holds. This document
> describes a proposal that lives on one route.

---

## §0 — Why it looks like this

The brief was that the product read as *generic AI output*: uniform dark
gradients, a glowing accent, 16px pills, centred hero stacks, three-feature
rows. Those are not colour problems, so a palette swap would not have fixed
any of them. Six decisions do the work, and only the first is about colour:

1. **One hue, ten values.** Chocolate through ivory, and nothing else. There is
   no second accent, no state colour, no red, no green. A thing stands out by
   being closer to ivory or by wearing a texture its neighbours do not.
2. **Materials, not effects.** Nothing glows. Light behaves the way it behaves
   on a physical surface: a hairline catch on a top edge, a shadow underneath,
   and grain that is genuinely there at 1:1.
3. **Pressed, not rounded.** Two corners in the whole product: 2px and 3px. The
   only circle is the seal, because a seal is a circle.
4. **Ranged left, in a centred block.** The type inside the measure is ranged
   left and hung off a real rule — the spine — and the block that carries it
   sits in the middle of the window. Both halves of that matter, and the second
   half is a correction: the block used to be pinned to the left EDGE as well,
   which is invisible on a phone (the measure is the screen) and on a laptop
   leaves the whole page in the left third with a third of a metre of empty case
   beside it. The same layout was reading as two different products depending on
   what you opened it on.
5. **One object per page.** The send is a slip of paper. The card is a seal.
   The status page is a ledger. Each page has a thing on it you could pick up.
6. **The page admits it was made.** Form numbers, a plate mark, a colophon at
   the foot, a printer's registration mark for a cursor.

The organising idea is **a hand-bound almanac**: a leather case, blind-tooled;
a star chart engraved into the cover; ivory leaves tipped in, where the writing
happens.

## §1 — The case (colour)

All of it in `beta/tokens.js` as `C`. Never a raw hex in a component.

| Token | Value | Role |
| --- | --- | --- |
| `void` | `#0B0705` | the closed case: the ground behind the chart |
| `cocoa` | `#241710` | the leather of the page |
| `hide` | `#2F1E13` | a raised panel, a pocket |
| `hide2` | `#3C2819` | the lip of a raised panel, a pressed state |
| `cognac` | `#5C3A1F` | tooled edges, dividers on leather |
| `saddle` | `#8A5C33` | the light chocolate the brand is named for |
| `caramel` | `#B98A55` | **the one light.** "lit", "yours", "now" |
| `wheat` | `#D6B78A` | the palest brown; hairlines on ivory |
| `ivory` | `#F1E7D3` | paper, and the reading colour on leather |
| `ivory2` / `chalk` | `#E4D6BB` / `#C9C2B4` | the second leaf; the chalk card |
| `ink` | `#241811` | ink, for anything set on paper or chalk |

### The ground, and why it is nearly black

The first cut put the case at `#150E09` — a brown you can comfortably read type
on, chosen so the sky would sit *inside something* rather than float on a black
screen. It did that, and it cost more than it was worth.

The chart is drawn on this colour and the renderer's floor is set to it, and a
lifted floor spends its whole lift on the **faintest** light in the frame. Every
outer-arm star and every wisp of rim dust was landing within a few values of the
ground it stood on, so the galaxy read as a brown wash with a bright middle. The
heart came out tan — the same family as the leather around it, only brighter —
which is the one thing a galaxy printed on a case must not do.

At `#0B0705` the same stars have most of a value scale underneath them. The
heart goes gold, the arms come back, and the ground still measures warm: it is
brown ink at four percent, not a grey, so nothing in here fights a cold cast.
The leathers came down with it (`cocoa`, `hide`, `hide2`, `cognac` are all
darker) because a raised panel is raised by being lighter than what it lies on,
and on a near-black ground the old values stopped being leather and started
being lit slabs floating over it.

Two consequences elsewhere, both in `beta/sky.js`: the ramp's middle is turned
toward gold (§4), and the post chain's exposure comes up over 1 while its
vignette comes off — the vignette had been doing the darkening the ground now
does for itself.

### `ONSKY` — the two quietest registers carry their own ground

The smallest type in the product is a stamped `Label` and a Courier `Tick`, both
set well under half strength directly on the chart. That is right nine tenths of
the time and wrong the moment one crosses the galactic centre, which is orders of
magnitude brighter than the ground either side of it. `TEXT`'s companion
`ONSKY` is a tight, soft halo of the case's own colour sitting under those
glyphs: invisible where there is nothing behind the type — a shadow the colour of
the ground is no shadow — and the difference between legible and not over the
core. Anything set on paper opts out; there is no sky behind it.

**Caramel is used once per screen.** If two things on a page are lit, one of
them is wrong.

Because there is no hue carrying meaning, the three ping states are told apart
by **form**: standing is a filled mark that breathes, waiting is an open dashed
mark, mutual is a joined pair. Someone who cannot see colour reads this exactly
as well as someone who can.

## §2 — Type

Three faces, none of which appears in production. Fetched only on this route
(`FONT_HREF`, injected on mount), so production pays nothing.

- **Cormorant Garamond** — *the voice.* A real garalde: high contrast, small
  x-height, long extenders. Set large and light with tight leading, which is
  why a headline reads as a title page rather than a hero section.
- **Jost** — *the hand.* Geometric sans with 1920s bones. Every mechanic:
  buttons, labels, body copy.
- **Courier Prime** — *the stamp.* Metadata only. Dates, counts, day-clocks,
  handles. Never a feeling.

The ladder is `SIZE` in `tokens.js`: `colophon · title · chapter · lead · body ·
small · label · tick`. Fewer steps than production's, spread further apart.
Nothing invents a size.

## §3 — The materials (`beta/texture.js`)

Three surfaces, none of them a stock image or a CSS gradient pretending. Each
tile is rendered pixel by pixel from wrapped value noise, memoized as a data
URL, and tiles seamlessly:

- **pebbled hide** — two scales of ridged cells (the grain), a broad shallow
  swell (the break), and a per-pixel pore.
- **laid paper** — directional fibre, a shallow mottle, the mould's fine laid
  lines and its chain lines, and a tooth.
- **chalk card** — coarser, drier, dustier; cast rather than couched.

Plus **saddle stitching**: slanted, alternating, with the thread's own shadow,
at a 22px pitch, drawn as an SVG tile repeated along each edge so it stays
sharp at any panel size.

Two mistakes worth not repeating, both of which shipped in the first cut and
are commented at the site of the fix:

- Scaling noise input coordinates by a non-integer (`nx * 0.34`) to get a
  directional grain **breaks the tile's wrap** and prints a hard band every
  repeat. Use two integer lattice periods (`fbmA`) instead.
- A stitch every 15px at half opacity reads as engine turning, not thread.

## §4 — The sky: production's engine, one hue

**The beta runs the real engine.** `beta/sky.js` subclasses `GalaxyField`, so
the field is production's: the same hundred and twenty thousand stars on real
density-wave orbits, the same camera and lens, the same nebula volume, the same
send-off the camera rides, the same held dive, the same opaque body pass. Every
mechanic and every animation on this route is production's code.

An earlier cut of this route drew its own 2D star chart instead. It was a nice
drawing and it was the wrong call: the sky here is not a backdrop, it is the
mechanism — a ping IS a star, you fly to it, and past a certain closeness it
stops being a point of light and becomes the surface it was made of. A
hand-rolled chart cannot do any of that, so a rebrand built on one is a rebrand
of the pictures rather than of the product.

What changes is the light, and it changes in **one place**.

### The ramp

Every star's colour in this engine comes from a single 256-entry lookup indexed
by temperature: the Planck locus, deep amber at 2,500 K through white at
6,500 K to hard blue past 20,000 K. `sky/blackbody.js` now takes an optional
replacement curve (`makeBlackbodyLUT(gl, ramp)`), so the whole universe is
recoloured by handing it a different one-dimensional ramp. No shader change, no
second code path, and production passes nothing and is unaffected.

The Bindery's curve keeps the physics' *shape* and drops its hue: cool stars go
deep chocolate, hot ones go ivory. That is the honest half of the truth — the
cool end of the real locus genuinely is brown and the hot end genuinely is
white. What it gives up is the blue, which is the one thing this brand has no
room for.

The **middle** of the curve is where the galaxy's mass is — the bulge and inner
disk are 3,000–7,000 K — so the middle is what the eye reads as "the colour of
the galaxy". It used to run through `saddle` and `caramel`, the leather's own
browns, and on the old lifted ground that came out tan. It runs through struck
bronze and gold now: more yellow, less red, a good deal less blue, which is the
difference between old brass and old chocolate. The ends are untouched.

The consequence is why it works at all: **the bulge is old**, so it is full of
3,000–5,000 K stars and comes out the colour of the leather; **the arms are
young and hot**, so they come out ivory. The galaxy's structure still reads —
an old brown heart, pale forming arms — off demographics rather than off
decoration, in one hue.

### The four other places colour lives

- **The nebula.** Production's ramp is warm heart → H-alpha rose → violet rim.
  The Bindery's is lit cocoa → saddle → chalk: the same structure read as dust
  caught in lamplight going cold at the rim.
- **The floor.** `post.js` gained a `uFloor` — the value the frame never goes
  below, the way a print on paper has no true black in it because the paper is
  not black. Zero in production; here it is the colour of a closed case. Without
  it the rebrand is a brown galaxy on a black screen instead of a brown galaxy
  *inside something*.
- **The meteors.** Production's set includes a magnesium blue-white, which is a
  lovely real detail and the only blue that would ever appear here.
  `shootHues` is now a field option.
- **No chromatic aberration.** A real lens artefact, and the one thing in the
  pipeline that can put a green and a magenta fringe on a bright star. In a
  one-hue brand that reads as a rendering fault.

Bloom is pulled back rather than switched off: nothing in this brand glows, but
a star with no bloom is a dot and the field loses its depth.

### The framing, per window

The engine solves its framing off the **short** side of the window and its star
size against a reference phone. Left alone, that makes the same galaxy two
different pictures:

- on a laptop the short side is 900px, so the disk is drawn across ~500px of
  radius and every star is scaled *down* to about 0.45 of reference. Fine grain,
  wide galaxy.
- on a phone the short side is 390px, so the disk gets ~225px and the stars stay
  at 1.0. Half the picture, twice the grain — a tight bright knot of
  comparatively enormous points, rotating fastest exactly where it is densest.
  On a display that renders the sky below its native resolution and scales it
  up, that knot is also what shimmers.

`BinderyField._layout` gives a narrow window its own numbers — the disk is drawn
half again as wide, the stars are cut to 0.74 (the engine spends the difference
on *population*, since it scales its count by 1/sizeScale), and the ambient orbit
clock is slowed. A wide window gets a wider disk too, so the chart is the field
the page is printed on rather than an object with case all round it. The engine
itself is untouched; production shares it and sees none of this.

`centerY` moves with the layout for the same reason it exists: the heart is the
one part of the picture nothing can be read over, so it goes where the words are
not. The words are in the middle of the window now, so the heart sits low —
under the setting rather than behind it, with the arms carrying the frame the
type actually sits in.

### The tremor

Per-star motion blur is honest about camera **rotation**, and the camera takes a
whisper of parallax off the pointer on a desktop and off *device orientation* on
a phone. A pointer is still while you read. A phone in a hand never is, and the
engine's tilt dead-zone opens at about two degrees of roll — less than the tremor
of holding something up to read it. So the camera was always very slightly
turning, and the whole field was smeared along the swing: a sky of short dashes
changing direction several times a second, which does not read as parallax. It
reads as the page glitching, and it is the one artefact that could not appear on
a desktop at all.

The beta damps two of the engine's own numbers on narrow windows —
`cam.parallaxGain` and `motionScale`, how far a tilt may swing the camera and how
much of the resulting velocity is drawn. A dive is unaffected in feel: its smear
comes from travel, which is orders of magnitude larger and still capped at a
sixth of the viewport.

### The zoom and the reveal

- **The zoom** (`beta/Resolve.jsx`): tap a ping in the ledger and the camera
  dives to that star and stays there. `resolveOf` is *imported* from
  `card/zoom.js` rather than reimplemented — two copies of those four numbers
  are two zooms that agree until somebody tunes one. What arrives at the end of
  the dive is a struck seal instead of a photographic disc.
- **The reveal** (`beta/Reveal.jsx`): production's three beats, unchanged. The
  arrival (the ordinary held dive into your own ping), the light (their light
  rising around the limb — an eclipse, and the claim of the product in one
  image), the turn (one half turn about the vertical axis, the way a hand turns
  something over to read the back).

The turn happens **by itself** the first time, which is also how this route gets
to carry no instruction. Production prints "turn it over" under the disc, and it
is right to: an object with a second side is worth nothing if nobody knows it
has one. An object that turns itself once has already said so.

## §5 — The seal

The card a ping carries. Still a circle, for the reason it was always a circle:
a ping is a star and this is the star's surface. What is new is that it is an
object — a struck seal with a double keyline inside the trim, one of three
materials underneath, and its rim text set on a real curve (SVG `textPath`, so
it is crisp at 88px in a list and at 252px in the composer).

Below **120px the rim comes off** and the words take the space. A coin too
small to read its legend does not print the legend smaller.

The three grounds replace production's five dark plates, and they are
**materials rather than colours**: laid paper, chalk card, the leather itself.
Each carries a `tone`, which is the light that ping's star burns with — measured
off the ground, never picked from a list, exactly as production measures it off
a photograph.

### Paper is an object now, not a surface

There used to be a `Leaf` in `ui.jsx`: an ivory sheet of laid paper tipped into
the case, and every form in the product was written on one. It was the most
literal expression of the idea this brand is built on, and on the new ground it
was the worst thing on the page.

A slab of `#F1E7D3` on a near-black case is a contrast ratio north of eighteen
to one, held across a rectangle several hundred pixels wide. Nothing else in the
frame survives beside it: the type on the leather goes grey, the galaxy goes
flat, and the eye reads the *rectangle* rather than anything written in it. It
was legible the way a lightbox is legible.

So paper is no longer a surface the interface is built out of. It is reserved
for the two things genuinely made of it — the **seal**, which is the card a ping
carries, and the **plate**, which is the one struck label per screen — and
everything that used to sit on a leaf is set directly on the case in ivory. The
ruled lines stayed, because they were the part actually doing work: you write
*on* a rule. They are drawn in the case's light now instead of in ink.

The ground got dark enough to hold that type. That was the point of the ground
getting dark.

## §5.5 — The masthead and the index

One bar across the head of **every** page: the wordmark on the left, the way
into the index on the right, on the same baseline. Before, the wordmark appeared
on two screens and the index was a bookmark ribbon hanging off the top-right
corner — set vertically, on its own scrap of leather, with its own trim and its
own drop shadow. Two problems, and only one was decoration: it was the single
element in the product aligned to nothing else, and it read as a thing stuck
*on* the page rather than as part of it.

The index tab is now the same stamped label everything else is labelled with,
with no plate under it at all. Its mark is three ruled entries — an index, drawn
the way an index is set — and the short line moves when the index opens, like a
finger keeping the place. It is the only thing in the bar that changes.

**The index is a column, not a menu.** Opening it takes `INDEX_W` out of the
setting and the page re-centres in what is left; the two move together, which is
the difference between opening a drawer and having something drop on top of your
work. It has no panel, no fill and no trim — one tooled channel down its left
edge, the same rule the rest of the product is divided with, and a wash of the
ground itself deep enough to read type over the chart. On a phone there is no
width to give away, so the column is the whole measure and the page steps aside
for it. Escape closes it, as does a pointer-down anywhere on the page.

## §6 — Motion

Nothing springs, nothing bounces, nothing pulses for attention. Things settle.
Every easing in `beta.css` is decelerating or linear; there is not an overshoot
in the file. Five gestures: a leaf laid down (with half a degree of rotation you
never consciously see), a rule tooled in, a seal set by a die, a lamp breathing
in luminosity, and a sealed mutual straining against its lid.

## §7 — The route

- `app/src/main.jsx` forks on `/beta` **before mounting**, so production's
  stylesheet, galaxy engine and state tree never boot on this route, and the
  beta chunk is loaded on demand.
- `beta.css` scopes every rule that could collide under `html.beta`, a class the
  fork sets. Specificity, not bundler ordering, keeps the two apart.
- The beta holds its own state in memory, talks to no server, and resets on
  reload, so every visit starts from the same seeded page.
- Every page is deep-linkable: `#title · #send · #card · #truth · #pings ·
  #reveal · #specimen`. The **index** in the masthead opens them all (§5.5).

## §8 — Reading it

| Page | Address | What it is for |
| --- | --- | --- |
| the title page | `/beta#title` | the colophon, the one claim, one plate |
| the send | `/beta#send` | the slip, the ruled line, the form mark |
| the card | `/beta#card` | three grounds, three hands, twenty words |
| the flight | (no address) | the star launches and the camera rides it |
| the truth | `/beta#truth` | standing or waiting, said plainly |
| your pings | `/beta#pings` | the ledger, the three slots, the empty one |
| the reveal | `/beta#reveal` | two seals, struck together |
| the specimen | `/beta#specimen` | every colour, material, face and part on one sheet |

`#specimen` is the sheet to judge the system from. The other six are the sheet
applied.
