# THE BINDERY — the `/beta` rebrand

A complete, second brand for celestual, living at **`/beta`**, built to be
assessed beside the production one rather than merged into it.

It shares **nothing** with the galaxy edition: not a colour token, not a
typeface, not a corner radius, not a shadow, not a screen. `app/src/beta/`
imports nothing from `app/src/theme.js`, `styles.css`, `components/` or `sky/`,
and nothing in production imports from `beta/`. The two can be opened in two
tabs and judged as two products, which is the whole point of the route.

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
4. **Nothing is centred.** Every page hangs off a rule on the left. This one
   structural change does more than the palette does.
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
| `void` | `#150E09` | the closed case: the ground behind the chart |
| `cocoa` | `#2E1E14` | the leather of the page |
| `hide` | `#3B2716` | a raised panel, a pocket |
| `hide2` | `#4A3220` | the lip of a raised panel, a pressed state |
| `cognac` | `#6B4526` | tooled edges, dividers on leather |
| `saddle` | `#8A5C33` | the light chocolate the brand is named for |
| `caramel` | `#B98A55` | **the one light.** "lit", "yours", "now" |
| `wheat` | `#D6B78A` | the palest brown; hairlines on ivory |
| `ivory` | `#F1E7D3` | paper, and the reading colour on leather |
| `ivory2` / `chalk` | `#E4D6BB` / `#C9C2B4` | the second leaf; the chalk card |
| `ink` | `#241811` | ink, for anything set on paper or chalk |

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

## §4 — The chart (`beta/Chart.jsx`)

The production sky is 120,000 stars on a WebGL2 engine, coloured by blackbody
temperature. This is the opposite decision:

- **~150 stars**, one per 9,000 square pixels. Emptiness is the material.
- **Ivory only.** No temperature, no second accent.
- **It is a chart, not a photograph.** A graticule tooled into the case, a
  chalk band of dust, and each ping drawn the way an astronomer marks an object
  they have found: a struck star, a scribed ring, a leader out to a hand-set
  label. The ring is the design.
- **Your pings make a constellation.** Two or more and the chart joins them
  with a slack hairline, between the rings rather than through the stars.
- **The send-off** is a spark that arcs out to its anchor; the ring is then
  scribed around it, and the flight reports its own arrival rather than being
  raced by a timer.

The star *logic* is unchanged from production: pings are stars, placed once and
staying put, standing burns and waiting does not, and a mutual is a binary.

**On narrow screens the marked pings are dropped** and the chart keeps only the
field, band and graticule. There is no margin to engrave into on a phone, so a
label lands on the sentence being read. A plate printed small loses its legend
first.

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
  #reveal · #specimen`. The **index ribbon** at the top right opens them all.

## §8 — Reading it

| Page | Address | What it is for |
| --- | --- | --- |
| the title page | `/beta#title` | the colophon, the one claim, one plate |
| the send | `/beta#send` | the slip, the ruled line, the form mark |
| the card | `/beta#card` | three grounds, three hands, twenty words |
| the truth | `/beta#truth` | standing or waiting, said plainly |
| your pings | `/beta#pings` | the ledger, the three slots, the empty one |
| the reveal | `/beta#reveal` | two seals, struck together |
| the specimen | `/beta#specimen` | every colour, material, face and part on one sheet |

`#specimen` is the sheet to judge the system from. The other six are the sheet
applied.
