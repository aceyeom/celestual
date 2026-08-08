# CELESTUAL — Design system (the bindery · the living document)

How celestual looks and moves, and how it stays looking like *itself* — never
like template output, never like "generic AI product" (uniform dark gradients, a
glowing accent, 16px pills, centred hero stacks, three-feature rows). This file
is the design half of the pair; [VOICE.md](./VOICE.md) is the writing half.
**Both are living documents: any visual change ships with an edit here, in the
same commit.**

Enforced mechanically where possible: `app/src/theme.js` is the single source
for colour, type and geometry (nothing defines its own hex), `app/src/texture.js`
draws every material, and `npm run lint:voice` trips on the copy half.

> ## ⛔ Design lock — read before touching anything visual
>
> **The bindery is the canonical, intended look of Celestual.** The near-black
> leather case, the engraved star chart, the one hue from chocolate to ivory,
> the pressed 2px corners, and the fact that **nothing glows** are deliberate.
> They are not leftovers to be tidied.
>
> **Claude must NOT flatten, simplify, "clean up," or restyle this identity on
> its own.** Do not introduce a second accent, do not put a blue or a rose or a
> green back, do not round a corner to 16px, do not add a halo to anything, do
> not retire the chart for a static field, and do not swap a material for a flat
> fill — *unless a human explicitly asks for that specific change in the current
> request.* A visual redesign is a decision the human makes; it is never a
> refactor, a modernization, or a byproduct of unrelated work. When in doubt,
> keep this look and ask.
>
> Product **functionality and workflows may keep evolving** (the ping model, the
> screens, the backend). That is expected. The *visual language* below is what
> stays fixed until a human deliberately changes it.
>
> **There is no exempt route.** There used to be: the bindery was built at
> `/beta` under its own sealed design system so it could be judged beside the
> galaxy edition it replaced. That judgement was made on 2026-08-07 and the
> route is gone. One system now governs every route, every email, every render
> and the back office.

## §1 — The one-paragraph system

The whole product is **a hand-bound almanac**: a leather case, blind-tooled; a
star chart engraved into the cover; the writing set on the case itself. It lives
in **one hue** — chocolate through ivory, and nothing else — where hierarchy is
carried by **value and texture** rather than by a second colour, because a
leather book has no second colour either. Light behaves the way it behaves on a
physical surface: a hairline catch on a top edge, a shadow underneath, and grain
that is genuinely there at 1:1. A garalde carries the voice; a geometric sans
carries every mechanic; a typewriter face carries every piece of metadata. Every
screen has **exactly one primary action** and **one lit thing**. The felt
register everywhere is *quiet, adult, certain — the 2am message, never the
carnival*. The chart moves, but it never performs for attention: it drifts, it
breathes, it holds its seed between screens.

### Why it looks like this

The brief was that the product read as *generic AI output*: uniform dark
gradients, a glowing accent, 16px pills, centred hero stacks, three-feature
rows. Those are not colour problems, so a palette swap would not have fixed any
of them. Six decisions do the work, and only the first is about colour:

1. **One hue, ten values.** Chocolate through ivory. There is no second accent,
   no state colour, no red, no green, no blue. A thing stands out by being
   closer to ivory or by wearing a texture its neighbours do not.
2. **Materials, not effects.** Nothing glows. A catch on a top edge, a shadow
   underneath, and real grain.
3. **Pressed, not rounded.** Two corners in the whole product: 2px and 3px. The
   only circle is the seal, because a seal is a circle.
4. **Ranged left, in a centred block.** Type inside the measure is ranged left;
   the block that carries it sits in the middle of the window. Both halves
   matter — pinned to the left EDGE as well, the same page reads as two
   different products depending on what you open it on.
5. **One object per page.** The send is a slip of paper. The card is a seal. The
   status page is a ledger. Each page has a thing on it you could pick up.
6. **The page admits it was made.** Form numbers, a plate mark, a colophon at
   the foot, a printer's registration mark for a cursor.

## §2 — Colour: the case, and the one light

All tokens live in `app/src/theme.js` (`TOKENS`). Never a raw hex in a
component.

| Token | Value | Role |
| --- | --- | --- |
| `ink` | `#0B0705` | the closed case: the ground behind the chart, and the chart's own floor |
| `ink2` | `#241710` | cocoa — the case, a page ground, a panel lying on it |
| `ink3` | `#2F1E13` | hide — a raised panel, a pocket, the dock |
| `ink4` | `#3C2819` | the lip of a raised panel, a pressed state |
| `cognac` | `#5C3A1F` | tooled edges, the stitch channel, dividers on leather |
| `saddle` | `#8A5C33` | the light chocolate the brand is named for |
| `you` / `star` | `#B98A55` | **caramel — the one light.** what "lit", "yours", "now" looks like |
| `them` | `#D6B78A` | wheat — the palest brown; hairlines, spent states |
| `cream` | `#F1E7D3` | ivory: paper, and the reading colour on leather |
| `muted` | `#A2937E` | the mechanical voice |
| `paper` / `chalk` | `#F1E7D3` / `#C9C2B4` | the two written-on materials |
| `onPaper` | `#241811` | ink, for anything set ON ivory or chalk |
| `onYou` / `onStar` | `#241811` | ink on a lit surface |

Rules that follow:

- **One hue. There is no second accent.** `you` and `them` are the same colour
  at two values, which is how a monochrome brand says "you" and "them" without
  cheating. A third hue anywhere means a screen is doing too much.
- **Caramel is used once per screen.** If two things on a page are lit, one of
  them is wrong.
- **The ground is nearly black, and that is load-bearing.** An earlier cut put
  the case at a brown you can comfortably read type on. The chart is drawn on
  this colour and the renderer's floor is set to it, and a lifted floor spends
  its whole lift on the *faintest* light in the frame — so every outer-arm star
  landed within a few values of the ground it stood on and the galaxy read as a
  brown wash with a bright middle. At `#0B0705` the same stars have most of a
  value scale underneath them. It still measures warm: it is brown ink at four
  percent, not a grey.
- **Because no hue carries meaning, the three ping states are told apart by
  FORM**: standing is a filled mark that breathes, waiting is an open dashed
  mark, mutual is a joined pair. Someone who cannot see colour reads this
  exactly as well as someone who can.
- Errors are calm sentences in ivory, not red. There is no red in the product;
  nothing here is an emergency.

### `ONSKY` — the two quietest registers carry their own ground

The smallest type in the product is a stamped label and a Courier tick, both set
well under half strength directly on the chart. That is right nine tenths of the
time and wrong the moment one crosses the galactic centre, which is orders of
magnitude brighter than the ground either side of it. `TEXT`'s companion `ONSKY`
is a tight, soft halo of the case's own colour sitting under those glyphs:
invisible where there is nothing behind the type — a shadow the colour of the
ground is no shadow — and the difference between legible and not over the core.
Anything set on paper opts out; there is no sky behind it.

## §3 — Type: three faces, strictly cast

The type system *is* the tone system (VOICE.md §3). Breaking register is how
screens start looking assembled-by-template. The three faces are loaded in
`app/index.html`.

- **Cormorant Garamond** — *the voice.* A real garalde: high stroke contrast,
  small x-height, long extenders. Set **large and light with tight leading**,
  which is why a headline reads as an engraved title page rather than a hero
  section. Italic is for a *spoken* line, not for a headline.
- **Jost** — *the hand.* A geometric sans with 1920s bones. Every mechanic:
  buttons, labels, body copy.
- **Courier Prime** — *the stamp.* Metadata only: dates, counts, day-clocks,
  handles, the four-letter codes. It is never allowed to carry a feeling.

### The size ladder (`SIZE` in `theme.js`)

Three faces is only half the system; the other half is that **nothing invents a
size**. Fewer steps than the edition before it, spread further apart: the
distance between the title page and the footnote is most of what makes a book
look like a book.

| Step | Use |
| --- | --- |
| `hero` | the match reveal, and nowhere else |
| `colophon` | the title page, once |
| `display` | the one headline a screen is allowed |
| `title` | a section head, a sheet head |
| `figure` | a number that IS the point of its card |
| `lead` | a spoken serif line |
| `head` / `body` | the reading size |
| `small` | secondary |
| `meta` / `micro` | the stamped label and the Courier tick |

`ui.jsx` exports these as components — `Display`, `Title`, `Lead`, `Body`,
`Small`, `Kicker`/`Label`, `Mono`/`Tick`, `Note` — and screens use those rather
than inline styles. A new size is a change to `theme.js`, argued for there, not
a number typed into a style object.

Hard rules: a spoken line never renders in Courier; a count never renders in the
garalde; nothing anywhere gets an exclamation mark; and there is **no
typographic star glyph anywhere in the product** — `✦` and `✧` were retired with
the galaxy edition. The mark is a drawing (§5).

## §3b — Icons: six, and that is the whole set

A generic outline icon set is the fastest way to make a product look like every
other product. What survives is only what a **hand** needs — back, forward,
close, the check that confirms a thing is done, a search affordance for a real
search field, and the returning arrow on the one mechanic that runs a clock
backwards (renew). Everything else is said in words, or not said at all. The
stroke is a hairline, because everything else in here is drawn with one. See
`ui.jsx`'s `Icon`. **If a screen wants a seventh icon, it wants a word.**

## §4 — The materials (`app/src/texture.js`)

Three surfaces, none of them a stock image and none of them a CSS gradient
pretending. Each tile is rendered pixel by pixel from wrapped value noise,
memoized as a data URL, and tiles seamlessly:

- **pebbled hide** — two scales of ridged cells (the grain), a broad shallow
  swell (the break), and a per-pixel pore.
- **laid paper** — directional fibre, a shallow mottle, the mould's fine laid
  lines and its chain lines, and a tooth.
- **chalk card** — coarser, drier, dustier; cast rather than couched.

Plus **saddle stitching**: slanted, alternating, with the thread's own shadow,
at a 22px pitch, drawn as an SVG tile repeated along each edge so it stays sharp
at any panel size.

Two mistakes worth not repeating, both commented at the site of the fix:
scaling noise input coordinates by a non-integer to get a directional grain
**breaks the tile's wrap** and prints a hard band every repeat (use two integer
lattice periods); and a stitch every 15px at half opacity reads as engine
turning, not thread.

### Paper is an object, not a surface

There is no ivory sheet under the interface, and that is a correction rather
than a preference. A slab of `#F1E7D3` on a near-black case is a contrast ratio
north of eighteen to one held across a rectangle several hundred pixels wide.
Nothing else in the frame survives beside it: the type on the leather goes grey,
the chart goes flat, and the eye reads the *rectangle* rather than anything
written in it. Paper is reserved for the two things genuinely made of it — the
**seal** (the card a ping carries) and the **plate** (the one struck label per
screen, which is what a button is). Everything else is set directly on the case
in ivory. The ground got dark enough to hold that type; that was the point of
the ground getting dark.

## §5 — The chart, and the mark

**The chart** (`galaxy.js`, `communityGalaxy.js`, `sky/`) is the real engine:
a hundred and twenty thousand stars on real density-wave orbits, a real camera
and lens, a real nebula volume. It is not a backdrop — it is the mechanism. A
ping IS a star, you fly to it, and past a certain closeness it stops being a
point of light and becomes the surface it was made of.

What is one hue is the **light**, and it changes in one place. Every star's
colour comes from a 256-entry lookup indexed by temperature; `binderyRamp` in
`galaxy.js` replaces the Planck locus with a curve that keeps the physics'
*shape* and drops its hue — cool stars go deep chocolate, hot ones go ivory.
That is the honest half of the truth: the cool end of the real locus genuinely
is brown and the hot end genuinely is white. What it gives up is the blue. The
consequence is why it works at all: **the bulge is old**, so it is full of
3,000–5,000 K stars and comes out the colour of the leather; **the arms are
young and hot**, so they come out ivory. The galaxy's structure still reads off
demographics rather than off decoration.

Four other places colour lives, all in `_tuneGas` / `_tunePost`: the nebula runs
lit cocoa → saddle → chalk (dust in lamplight, going cold at the rim, never
ionised gas); the **floor** is lifted to exactly `TOKENS.ink`, so the canvas and
the page are one surface with no seam; the meteors carry no magnesium
blue-white; and **chromatic aberration is off**, because a green and magenta
fringe on a bright star reads as a rendering fault in a brand with one hue.
Bloom is pulled back rather than switched off: nothing here glows, but a star
with no bloom is a dot and the field loses its depth.

**Where the heart sits** is a layout decision, not a rendering one, and it is
made on both axes. The galactic centre is orders of magnitude brighter than the
ground either side of it and no halo under a line of type wins against it, so it
goes **where the words are not**: low down the frame on every screen
(`centerY`), and — on a window wide enough that the 560px measure does not fill
it — across to the right of that measure as well (`centerX`), where it lights
the empty case beside the setting instead of sitting behind the one action on
the page.

**The mark** (`ui.jsx`'s `Sigil`, `app/public/star.svg`) is a four-pointed star
cut down the middle with a body sitting in the cut. It is ONE drawing used
twice: the right wing is the star, the left wing is the same star turned a
hundred and eighty degrees about the body, which is why it leans without ever
having been drawn on a slant. Three things about it are load-bearing:

- **The cut is the ground.** The hairline between the halves and the crescent
  around the body are HOLES, not white paint. What shows through is whatever the
  mark is standing on, which is what lets one drawing serve the case, an ivory
  seal, a browser tab and print without being redrawn.
- **The body is the one light**, and it is warmer than either wing. The order —
  left wing light, right wing deep, body brightest — *is* the drawing. Invert it
  and the long point that leads the eye stops being the one that reaches up, and
  the body stops reading as something lit and starts reading as a hole.
- **It carries the name on its own.** There is no wordmark. CELESTUAL used to be
  set beside it on one baseline on every screen, which is a business card
  stapled to every page of a product somebody has already opened.

It is drawn at exactly its own bounds — 1.212 times taller than wide, no margin,
nothing trimmed off the long points. Where a square slot is required (the
favicon, a home-screen icon) the *viewport* is squared around it rather than the
drawing being moved, so every clip and mask coordinate stays in the artwork's
own space.

The custom cursor (`styles.css`) is a printer's **registration mark**: the small
crosshair-in-a-circle a press operator lines two plates up with, which is what
you are doing on every screen in here.

## §6 — Geometry, spacing, surfaces

From `theme.js`: `RADIUS` — **2px and 3px, and the seal's circle. That is the
whole set.** A 16px pill is the single fastest tell that nobody chose anything,
and `chip: 999` is why the product used to have one on every small control.
`SPACE` is a **6px** rhythm, not 4px: a bigger step, and it gives the layout the
slower cadence of a printed page. `LIGHT` is the one shadow vocabulary and every
entry in it is **edge behaviour** — a catch on the top, a shadow under the
bottom, and the shadow an object casts on what it lies on. Nothing emits.
`MEASURE` (560px) is the measure, ranged left inside a centred block. Rules
(`Rule`) are **tooled**: a dark channel the tool cut and the light catching on
its upper lip, two pixels doing the work of a border.

## §6b — The ledger: entries, not cards

A list of things in this product is a **page in a ledger**: an object, the
writing beside it, and a hairline rule under the pair. It is not a stack of
panels.

Every ping used to sit on its own slab of stitched leather. Five of those down a
screen is five objects competing to be looked at, and the one thing on the row
that genuinely *is* an object — the seal — was shrunk to a 38px chip inside the
panel shouting over it. The leather came off, the seal went up to **88px**, and
the entry is set beside it directly on the case.

Two rules follow, and they generalise past the ledger:

- **Every slot wears the same footprint**, filled or not. An open slot is the
  seal's own circle, scored and empty; a slot held on another device is the same
  circle with a state mark in it. That is what makes the column read as a set of
  *slots* rather than as a list that happens to have pictures down one side.
- **The object is the affordance.** The seal is the only thing on the row that
  flies the camera to its star. When the whole row was the button, every quiet
  action inside it had to stop its own click from falling through.

`WORD_FLOOR` (54px) and `TYPE_FLOOR` (118px) are two different floors on
purpose: below the second, a seal drops its **legend** and gives the room to the
words; below the first it stops setting type at all. Setting them to one number
is what made every entry in the ledger a blank disc.

## §7 — Screens: one action each, and one navigation

Every screen sits over the same chart, carries **exactly one** primary action
(the ivory plate), casts its type by register (§3), and keeps its emptiness.

**The navigation is the masthead and the index, and there is nothing else.** One
bar across the head of every page — the wordmark left, the index right, on one
baseline. Opening the index takes `INDEX_W` out of the setting and the page
re-centres in what is left; the two move together, which is the difference
between opening a drawer and having something drop on top of your work. On a
phone there is no width to give away, so the column is the whole measure and the
page steps aside.

It replaced four things: a two-station dock fixed to the foot of two screens, a
profile chip pinned to the top-left corner on some screens, a "log in" chip in
the same corner on others, and a scattering of ghost links at the bottom of
whichever page needed one. None of them was aligned to anything else, they
disagreed about where "back" lives, and between them they still could not reach
half the product.

**The index is four lines and nothing else**: pings, community, account, terms
and privacy. No numbers, no notes under the entries, no heading over them, no
colophon at their foot, and no caption on the glyph that opens them. All five
were the same mistake — an index in a *book* is numbered because a book has
chapters in a fixed order and the number is how you find one. A product has four
places and you are already in one of them; numbering them claims the page is a
chapter rather than helping anybody get around.

Product workflow evolves independently — but each screen must still pass §9
before it ships.

## §8 — Motion

**Nothing springs, nothing bounces, nothing pulses for attention. Things
settle.** Every easing in `styles.css` is decelerating or linear; there is not
an overshoot in the file. The inventory: a leaf laid down (with half a degree of
rotation you never consciously see), a rule tooled in, a seal set by a die, a
lamp breathing in **luminosity and never in scale**, a sealed mutual straining
against its lid, and the page turning (the old leaf falls away upward, the new
one comes over it). Anything looping faster than ~3s, bouncing, spinning, or
scaling to draw the eye is off-brand. All of it collapses under
`prefers-reduced-motion`.

## §9 — The anti-generic checklist (review gate)

Before any screen ships, check it against these — each one is a known tell of
template/AI output:

- [ ] Exactly one primary action? (Two struck plates = redesign.)
- [ ] **Exactly one lit thing?** (Caramel once per screen. Two = one is wrong.)
- [ ] **One hue?** (A second accent, a state colour, a red, a green, a blue
      anywhere = send it back.)
- [ ] **Does anything glow?** (A halo, a drop-shadow in an accent colour, a
      `filter: blur` used as light, a backdrop-filter. All banned.)
- [ ] **Any corner that is not 2px, 3px, or the seal?** (A pill is a review
      failure, not a detail.)
- [ ] Registers cast correctly? (The voice in the garalde, mechanics in Jost,
      metadata in Courier.)
- [ ] Emptiness preserved? (If it feels like it needs "more content," it needs
      less.)
- [ ] No cards-in-cards, no icon grids, no gradient buttons, no glass panels, no
      emoji, no exclamation marks, no confetti, **no typographic star glyphs**.
- [ ] **Any icon at all?** Six exist (§3b). If the screen wants a seventh, it
      wants a word instead.
- [ ] **Every size a step on the ladder?** (§3. A raw `fontSize: 12.5` is a
      review failure.)
- [ ] **Does anything explain the interface?** A note under a field saying what
      the field is for means the field is wrong. Delete the note, fix the field.
      "Tap to place a ping" under a slot you can press is this. (A note stating a
      *product rule* — what renewing costs, when a slot opens — is not, and is
      required. See §9b.)
- [ ] **Is the same fact printed twice?** A countdown IS a date; a row carrying
      "4 days left" and "stands until 12 aug" is one number said two ways.
- [ ] **Does the product name itself on this screen?** It should not. The mark
      signs the page and there is no wordmark, no colophon, and no line telling
      the reader which edition they are looking at.
- [ ] **Any em or en dash in the copy?** `npm run lint:voice` fails the build on
      one. A dash is a writer stalling; choose a thought and end the sentence.
- [ ] **Is a list a ledger?** (§6b. Entries divided by rules, not a stack of
      panels. If every item is on its own slab, redesign it.)
- [ ] **No status pills.** A bordered uppercase chip with a coloured "live" dot
      is a named tell of AI-template output and is banned here permanently. A
      state reads as a **mark** (§2) plus quiet words in register.
- [ ] Does the case still read as one continuous surface behind it? (No screen
      swaps to a different ground.)
- [ ] Every number shown literally true, or not shown?
- [ ] **Can the reader account for every number on screen?** A meter that counts
      something the list does not show is the product calling its own user a
      liar. (See §9b.)
- [ ] Would the screen still feel certain with the copy removed? (The layout
      itself should carry the calm.)
- [ ] Is the change reflected in this file?

## §9b — Say the rule, never the widget

"Nothing explains the UI" is a rule about *chrome*, and it was being read as a
rule about *facts*. A note under a field saying "enter your handle here" is the
field failing. A line saying **"renewing is free, restarts the sixty days, and
takes no slot"** is a product rule that cannot be inferred from any arrangement
of pixels, and leaving it out does not make the screen quieter — it makes it
unanswerable.

The test: **could a careful person work this out by looking?** If yes, delete
the sentence. If no, and the fact changes what they would do, print it. Three
things in this product failed that test and now pass it: what renewing costs,
when the next slot opens, and why a slot can be held by a ping this device
cannot name.

## §10 — Artifacts covered by this system

The system extends beyond the app; these must all read as the same object:

- **The open-door / community share card** (`app/src/card.js`) — the most public
  pixel the brand owns. Gorgeous is a requirement, not a preference.
- **The seal** (`app/src/card/Disc.jsx`) — the circular body a ping resolves
  into, and its Story render (`app/src/card/share.js`). One fixed layout at
  every size it ever appears at.
- **The OG share image** (`app/public/og.svg` → `og.png`).
- **Emails** (`supabase/functions/_shared/mail.ts`) — one frame, five senders.
  The case blind-tooled, the mark, tooled rules, the ivory plate for the one
  action, the code struck into a well, and a colophon at the foot. Georgia,
  Arial and Courier stand in for the three faces, because mail clients do not
  load web fonts and the design was never carried by the typefaces.
- **The favicon** (`app/public/star.svg`) — the mark on the case.
- **The static legal pages** (`app/public/*.html`) — the same case, the same
  three faces, the same two corners.
- **The back office** (`app/src/components/admin.jsx`) — deliberately a LIGHT
  ground and dense tabular rows, because the job there is reading numbers
  accurately under time pressure. It is the almanac's back office, not a
  different product: laid paper, the case's own ink, the one caramel light, 2px
  corners, the three faces. Its three state tints (banned / opted out / fine)
  are the one sanctioned exception to §2, and they are pulled to a printed
  register rather than SaaS chips.

## §11 — Changelog

- **2026-08-07c** — **The mark, and everything the product stopped saying**
  (human-directed: *"remove the celestual type... remove unnecessary text
  throughout... stop using words like lapses or standing... minimal is best"*).
  §5, §7 and §9 revised.
  - **The mark stands alone.** The supplied artwork's own inks replaced the
    re-inked ones (the two taupes and the rose-gold body clear the case without
    help), the drawing is cropped to its own bounds, and the CELESTUAL wordmark
    came off the masthead, the favicon, every email and the legal pages.
  - **The index is four lines.** Numbers, notes, heading and colophon all gone,
    and the glyph that opens it lost its caption. A glyph that has to be
    captioned is the wrong glyph.
  - **The clock is days left, and only days left.** The lapse date came off a
    ping entry: a countdown is already a date arrived at by the only arithmetic
    anybody does with one, and printing both said one number twice.
  - **"Lapses" and "standing" are retired** from every user-facing string. They
    are filing-cabinet words for a thing somebody feels.

- **2026-08-07b** — **The ledger, the title page and the index** (human-directed,
  in review of the transfer below: *"I don't like how the entire pingslot is
  leather... have the log in button next to the find out... have stuff like
  profiles and the different pages in the index"*). §6b and §7 are new; §5 gains
  `centerX`.
  - **The ledger stopped being a stack of cards** (§6b). The leather panel per
    ping is gone, the seal is at 88px on the case, and the entries are divided
    by hairline rules. The seal also *sets its words* now: one type floor was
    doing two jobs, so every seal under 118px rendered blank.
  - **The title page carries both doors.** The plate and the quiet exit sit on
    one baseline, which is where a returning person's way in belongs. The
    trial notice moved out of a viewport corner and into the setting, where it
    stopped colliding with whatever else lived in that corner.
  - **One navigation** (§7). The masthead and the index column replaced the
    dock, both corner chips and the loose ghost links.
  - **The heart moved sideways.** `centerX` joins `centerY`, so on a wide window
    the galactic centre sits beside the measure rather than behind the one
    action on the page. Same argument as `centerY`, other axis.

- **2026-08-07** — **The bindery transfer** (human-directed: *"move all design
  features in celestual/beta to production and delete /beta"*). §1–§10 are
  rewritten; this is the one entry in this file that replaced the design system
  rather than refining it.
  - **The galaxy edition is retired.** The cosmic-violet void, the two warm
    stars (amber + rose), Instrument Serif / Space Grotesk / Space Mono, the
    16px pills, the glass panels and every halo in the product are gone. What
    replaced them is what had been living at `/beta` since it was built to be
    judged beside this: the leather case, the one hue, the pressed corners, the
    three new faces, and the law that nothing glows.
  - **`/beta` is deleted, not merged behind a flag.** `app/src/beta/` is gone,
    `main.jsx` no longer forks before mount, and `beta.css` no longer exists to
    be scoped against. There is nothing left to compare to, which was the point
    of building it on a route: a second brand is only worth keeping while a
    decision is open.
  - **What moved, and where it landed.** `beta/tokens.js` → `theme.js` (keeping
    every export name, so nothing had to be rewired). `beta/texture.js` →
    `texture.js`. `beta/ui.jsx` → `components/ui.jsx` (the plate, the ruled
    line, the tooled rule, the sigil, the marks, the slot meter). `beta/sky.js`
    → `galaxy.js` (`binderyRamp`, the nebula, the lifted floor, the meteors, the
    per-window framing) and `communityGalaxy.js`. `beta.css` → `styles.css`.
  - **The card became the seal.** Five flat dark plates → three MATERIALS (laid
    paper, chalk card, the leather), drawn per pixel, with a double keyline
    struck inside the trim and the ink taken off the ground rather than off the
    brand. Migration 0024 widens the server's validator to accept the three new
    ids; the five old ones are still accepted and are mapped at read time, so no
    stored card is ever rewritten or handed back on a surface nobody chose.
  - **The emails became one design.** There were five templates and no two
    agreed on a ground, an accent, a radius or whether to carry a wordmark.
    `_shared/mail.ts` owns the frame now and each sender owns only its words.
  - **The back office came along.** The desk keeps its light ground and its
    density (that argument was always right), and stops being a white-and-indigo
    fintech console belonging to no product.
  - **Three product facts got printed** (§9b), all of which the design had been
    quietly withholding: what renewing costs, when the next slot opens, and why
    a slot can be held by a ping the device in your hand cannot name.

- **2026-08-04** — **The mutual reveal, reworked around light instead of
  motion** (human-directed: *"too finicky and game-like — make it elegant and
  romantic"*). Nothing in §1–§10 changed.
  - **The coin flip is gone, and the crash with it.** A coin flip is a *wager* —
    chance, suspense, heads-or-tails — and a mutual is the precise opposite of
    chance: two people already decided, separately, weeks ago. A collision is
    worse; it is violence, and nobody here was hit. Between them they spent
    eleven separate events (impact, flash, tumble, wobble, overshoot, glint,
    rock) on a screen that is not a game and has no input to reward. Juice
    rewards input. §VOICE has the sentence for it: *the 2am message, never the
    carnival.*
  - **Nothing arrives now. Something stops being hidden.** Their card has
    existed since the day they wrote it, in the dark, behind yours, the whole
    time you were checking and finding nothing — so the reveal is not an event
    that happens to you, it is a thing you are shown. Three beats: the ordinary
    held dive into your own ping; their light rising around the limb of it; one
    half turn.
  - **The middle beat is an eclipse**, and it is the whole claim of the product
    in one image: the near body is dark and all you get of the far one is the
    corona around its edge. Nothing moves for a second and a half.
  - **The turn is a photograph being turned over, not a coin.** One half turn
    about the *vertical* axis — end-over-end is the coin, and the axis is most
    of the difference — on `sky/camera.js`'s own flight curve, with no
    overshoot, no spring and no bounce anywhere in the file. A hand setting a
    photograph down does not bounce.
  - **At rest, your light is still behind theirs**, a quieter corona that never
    goes away. The other side does not stop existing when you turn to it.
  - **The light carries the drama, since almost nothing moves.** The corona has
    three levels — loud through the eclipse, brightest as the disc comes side-on
    because a disc seen side-on blocks nothing, quiet forever after — it hugs
    the limb rather than washing the frame, and whose light it is hands over
    late, in the last quarter of the turn. Crossed over at side-on, amber and
    rose at full intensity mix to orange and the most important instant in the
    product came out the colour of a streetlight.
  - **The sky has no event left at all.** No inspiral, no echo, no flight to
    nowhere, and now no flash either, because there is no impact to flash at.
    Light around a card belongs in the layer the card is drawn in. `galaxy.js`
    keeps one setter, `matchCover`, for a compositing reason rather than a
    dramatic one.
  - **Fixed while in there:** past the wall-clock grace the reveal now stops
    *waiting* on a camera that has not kept up and resolves the card itself,
    easing in. Before, the floor only started the beats — so on a machine slow
    enough to take fifteen seconds over the dive, the light came up and the disc
    turned over a card whose resolve was still at zero, and the screen played to
    an empty frame.

- **2026-08-03** — **The mutual reveal, reworked into one object with two
  faces** (human-directed). Nothing in §1–§10 changed.
  - **The reveal happens to the ping you actually placed.** It used to arrive by
    its own private route: a camera flight to an empty patch of disk, which is
    the one place in the product a person's ping is *not*. It now opens with the
    ordinary held dive into your own star — the same `focusStar` the status
    page's "see it in the sky" makes, resolving on the same curve, landing on
    the same object. `resolveOf()` is exported from `card/Resolve.jsx` and used
    by both, so "the same zoom" means the same code rather than the same
    intention.
  - **Their ping arrives as a crash.** A point of light out of the deep field on
    a collision bearing: it holds that bearing and only *grows*, because
    apparent size goes as 1/distance and a body on an intercept has no angular
    motion to spare. Its scintillation dies out as it closes — only a point of
    light can twinkle — and it rakes your card with rose light before it lands.
  - **The two people are one object with two sides.** Yours is the back, theirs
    is the front, and the strike turns it over: a real tumble, then a spring
    that catches it on the nearest face showing theirs, overshooting once and
    rocking flat. Nothing counts revolutions — the impulse decays and the disc
    picks its own landing — so the turn count reads as physics rather than as a
    number somebody typed. Tapping the card turns it back to yours.
  - **What that replaced was a binary that never stopped.** Two actual cards
    orbiting each other was true to §3 ("neither of you moved second") and had
    no resting frame: nothing to read, nowhere for the eye to land, and a second
    disc permanently eating the space the first one needed — so both had to be
    small, and small is where a poster stops being a poster. One disc gets
    `fullSize()`, the same size every other resolve in the product lands on.
  - **The light echo is gone, and so is every other piece of scenery.** The
    expanding shell was beautiful physics lighting a band of gas across the one
    screen whose entire job is to hold two people's words still enough to read.
    The sky's whole part is now `matchStrike()`: one small flash at the impact,
    in world space, on the star that was actually hit.
  - **Exactly one object on this screen has a face.** The engine stops drawing
    the photosphere the card is covering (`matchCover`, fed the card's own
    opacity so the hand-off runs on one curve, because a disc seen edge-on stops
    covering what is behind it); and the field is forbidden to resolve at all
    during a reveal, since `discOf()` scales with `cam.unit` and a standoff that
    leaves the disk a field of points on a phone opens a dozen of them into
    lens-dust plates on a laptop.
  - **Under `prefers-reduced-motion`** there is no dive, no crash and no spin:
    their card, resolved, square on, and a tap presents the other side outright.

- **2026-08-02 (d)** — **The mutual reveal, reworked so the two things orbiting
  are the two cards** (human-directed). Nothing in §1–§10 changed.
  - **The pair moved out of the sky and into the overlay.** The sky used to draw
    the whole event — two hero stars inspiralling out in the disk, a tidal
    bridge, a merger flash, a settled binary — and the two cards then appeared
    over the top of it, scaled up out of nothing, and sat still. The pair you
    watched fall together were abstractions *of* the pings rather than the
    pings; the pings arrived after the event, having done nothing. A reveal in
    which the two objects it is about are the two objects that never move is not
    a reveal. Now the two actual cards fall, whirl, magnify and go on circling
    (`card/Spread.jsx`; the sequence is set out in `docs/STAR-CARDS.md` §4).
  - **Kepler sets the speed; the time-lapse sets the playback.** Angular speed
    goes as separation^−1.5 and the fall is played at a rate that falls as the
    square root of separation, so the *seen* speed goes as 1/separation: a
    steady glide that becomes a whirl only because the circle is collapsing.
    Separation itself decays as (T − t)^⅔ — what two bodies dropped toward each
    other from rest actually do — because an ease gets slower as it arrives and
    nothing in a gravitational field does that.
  - **Both cards ride one orbit at opposite phases.** Same size, same distance,
    same speed, forever: §3 of the plan ("neither of you moved second") as
    geometry rather than as a shared timer. The settled binary turns about once
    every twenty-five seconds and never stops; under `prefers-reduced-motion` it
    is simply already there, held still.
  - **The card has no drawn edge.** The hairline ring and the chromosphere arc
    are gone from `Disc.jsx` and `share.js` alike. At the size a ping is
    actually seen the ring *was* the object — a badge, not a body. What ends it
    now is the light falling off: the corona in its own colour over a soft
    shadow.
  - **The sky keeps the place, the dark and the light echo**, and got quieter
    doing it: the flash was tuned when the pair lived in the field, and over the
    top of two readable cards it washed the window to warm grey. The dive also
    stands well back now, because pressed in close `discOf()` opens nearby stars
    into out-of-focus plates that read as lens dust lying across the two cards.

- **2026-08-02 (c)** — **The card is production** (human-directed). `/beta` is
  deleted and `src/beta/` is `src/card/`. Nothing in §1–§10 changed; three
  things moved.
  - **The composer is a step in the send flow.** The @, confirmed, then the
    card, then the placement.
  - **The category tabs and the sixteen intent lines are gone.** A star's tint
    was looked up from the chosen category; it is measured off the card's own
    ground now (§9's two stars, walked between). The bookmark component and its
    tint table went with them.
  - **The reveal is a thing you open.** A match announces itself for two
    seconds and says nothing about what was written. On the status page the
    mutual slot sits sealed, shaking every few seconds, until it is tapped; then
    the sky plays the match and both cards unseal off its clock. Afterwards the
    slot holds the two discs, open, and there is no second unsealing.


- **2026-08-02 (b)** — **The card becomes a composition** (human-directed,
  continuing the `/beta` prototype). The poster was a centered stack; it is now
  a placed block whose whole layout is derived from where it sits.
  - **The type is smaller and it has a place.** A short line takes the lower
    left, the way a poster puts a caption meant to be read after the picture;
    longer text moves up the same margin; only the longest goes to the middle,
    where a circle is wide enough for six lines. The picture is the picture and
    the words are what you find in it.
  - **The user drags the block, and the composition re-derives.** Alignment is
    read off the block's own x, the measure is the circle's real chord at the
    block's edge, and the credit line moves to whichever half the words left
    empty, on their margin, in their alignment. Nothing is a control that can
    be inferred from something already on screen.
  - **No gradients inside the disc.** The limb darkening and warm rim made the
    card read as a lens looking at a picture rather than a printed circle with
    a picture on it. Flat ground, one even scrim over a photograph, the shared
    grain, one hairline limb.
  - **The type is choosable**, from the product's own three faces, each with
    its own scale, leading and tracking — a face swap that keeps one size and
    one leading is a bug with a dropdown.
  - **The composer got an instrument.** One labelled two-column panel (ground,
    type) instead of chips drifting under the card, and the step narration is
    gone.

- **2026-08-02** — **`/beta`: the star & card system** (human-directed, from a
  written plan). A prototype route, mounted in `main.jsx` beside the real app
  rather than inside its router, so production screens, the ping model and the
  Supabase schema are untouched. It adds one object to the system and the rest
  follows from it. Everything below uses the existing tokens, the existing
  ladder and the existing two stars; nothing in §1–§9 changed.
  - **The card is a circle, because the card is the star's surface.**
    `sky/body.js` already resolves a star into a limb-darkened, granulating
    photosphere when the camera closes on it. The card is that surface with a
    photograph on it, so a ping and its card are one object at two distances
    rather than two things joined by a transition.
  - **The approach replaces the modal.** Tapping a star flies the existing
    camera to it, and the disc opens out of the point of light as `cam.focus`
    crosses the engine's own resolve threshold: blurred first, the way an
    unresolved body is, sharpening as it grows. Closing runs the same curve
    backwards. There is no open or close animation written anywhere.
  - **The card is a type poster, cut round.** The words are set ON the ground
    rather than under it: the `@` in tracked mono, a hairline, the twenty words
    in serif italic large and tight, the date in mono below. Three registers,
    cast as §3 casts them, inside the disc. A disc with a paragraph beneath it
    was two objects; this is one, and it survives being a thumbnail.
  - **Type inside the disc is a ratio of the diameter**, not a step on the
    ladder. Narrow deliberate exception, and the same one `card.js` already
    takes: a composed artifact is an artboard, not a screen, and this one is
    drawn at four sizes from a 68px thumbnail to a 1080-wide Story render. The
    words fit in three steps so cards of similar length look like a set.
  - **The ground is a photograph or one of five dark plates.** Grounds, not
    accents: the two-accent law governs the interface, and a short low-chroma
    set is what keeps forty cards reading as one work where a colour picker
    would not. Under a photograph the type gets one flat even scrim, so every
    card in the product sets its words at the same contrast.
  - **A card's light comes from its photograph.** The plan bans relationship
    labels outright, so the tint cannot come from a picker: it is measured off
    the image, luminance-weighted so the light source in the frame decides, and
    mapped between the two existing stars. A warm room burns amber, a cold one
    rose. No third hue, no category, nobody asked.
  - **A card with no photograph is still a star** — it stands on a plate and
    keeps its body, its light and its type. This is the reason the photo can be
    optional at all.
  - **The mutual spread.** The engine's inspiral, flash, light echo and settled
    binary play as built; the two cards then unseal together, out of the two
    stars, on the frame the binary first exists on. The unseal is driven by the
    engine's own match clock, not a timer: the sky clamps `dt`, so on a slow
    device a wall-clock reveal opens the cards mid-inspiral and the merger flash
    goes off over the top of it.
  - **One shared grain over every surface**, photographs included, so forty
    frames from forty rooms composite into one field instead of a collage.

- **2026-07-31** — **The sky, rebuilt on a GPU** (human-directed, and an
  explicit authorization under the design lock: the cosmic-violet field, the two
  stars and the type registers are untouched; how the cosmos is *rendered* is
  what changed). The two canvas engines are gone; both skies are now populations
  on one dependency-free WebGL2 engine in **`app/src/sky/`**.
  - **One engine, two populations.** `galaxy.js` (1,736 lines) and
    `communityGalaxy.js` (2,516) each carried their own copy of the camera,
    projection, dive grammar, nebula pass, frame-time governor and tag renderer,
    kept identical by hand and by comment. All of it moved into `sky/` once, and
    the two files became what they always should have been: a description of
    what lives in each sky. `nebula.js` is retired.
  - **A hundred and twenty thousand stars, not eighteen hundred.** Orbits are
    integrated in the vertex shader from eight floats and one clock, so the main
    thread spends nothing per star per frame.
  - **The arms are real.** Density-wave orbital mechanics (Lin & Shu) replace
    `ang = arm * PI + r * TWIST`. The arms emerge from the orbit family instead
    of being drawn, so they hold their shape at every radius with no feathering
    hack, and the galaxy shears continuously without winding them up.
  - **Blackbody colour, inverse-square brightness, resolving bodies.** See §4.
    A dive now goes *all the way in*: past a certain closeness a star stops being
    a point of light and becomes a photosphere.
  - **The nebula became a volume.** Raymarched emission and extinction, sheared
    with the local orbital speed. Dust occludes because it is in front; you can
    fly through the gas.
  - **Real optics.** Half-float HDR, dual-Kawase bloom, ACES, chromatic
    point-spread, per-star motion blur. Every pre-baked glow and spike sprite is
    gone — brightness is light now, so the hard caps that fought bokeh discs
    could be deleted rather than ported.
  - **The community sky genuinely grows.** A ping's radius was previously divided
    by a fixed cap of 1,200, so the 1,201st ping silently re-scaled everyone
    else's position. Radii are absolute now: at 10,000 members the disk really is
    bigger and the camera simply stands further back. Nobody moves.
  - **The forming state resolves.** A gathering community and an open one are the
    same volumetric field at different settings, so crossing the privacy floor
    turns the proto-cloud into a spiral *in place*.
  - **The match reveal, redesigned** (it was the weakest thing in the product and
    the most important frame in it). The old version was a flat screen-space
    overlay — two dots on arcs, a gradient bridge, ten motes — that merged into
    ONE star. It is now a real event in the disk: a decaying Keplerian inspiral
    whose angular speed rises as the pair closes, tidal streams bridging them,
    a merger flash that sends a **light echo** expanding outward and lighting the
    surrounding gas from inside as it passes, settling into a **binary** — two
    distinct stars, amber and rose, in a stable shared orbit. A merge would have
    said one of them stopped existing.
  - **Reduced motion keeps drifting** (§4) instead of freezing.

- **2026-07-31 (b)** — **The calibration pass**, human-directed, on top of the
  same-day rebuild. The engine was right and the exposure was not:
  - **The sky is genuinely dark again.** The deep-space floor dropped by about a
    third of a stop, the far galaxy's band with it, the vignette deepened, and
    the field thinned from 120,000 stars to 46,000. The backdrop is what the
    copy rests on; it had started competing with it.
  - **Nothing is allowed to be a dinner plate.** A star's point-spread now grows
    logarithmically to a hard ceiling in core-radii AND an absolute pixel cap,
    and a resolved star's halo is capped against its own disc rather than the
    frame. One bright foreground star was spreading a wash of its own colour
    over every pixel in the frame.
  - **Your star got quiet.** The beacon (a tinted halo, a warm-white bloom, a
    glisten, all stacked) is now ONE small tinted halo and a modestly brighter
    core: about 1.5x white at rest. The point is to be findable, not loud.
  - **The countable population scales with the community.** A ping is drawn at
    the instrument's point-spread size, which does not shrink when the galaxy
    does, so forty pings on a small disk rendered exactly as loud as a thousand
    on a large one. Ping prominence is now linear in how full the sky is.
  - **The exposure stops down on approach**, the way a real one would on a
    source getting four hundred times brighter, so a dive arrives on a star
    rather than on a white screen.
  - **The tap-burst is gone.** A backdrop that flashed whenever a thumb brushed
    it read as a toy and fought every real tap target sitting over the galaxy.
  - **Two rendering bugs**, both found by driving the real app: the camera basis
    was uploaded to the GPU row-major when `uniformMatrix3fv` reads
    column-major, so every shader had been applying the *inverse* rotation and
    the CPU and GPU disagreed about where every star was (a galaxy rotated the
    wrong way is still a galaxy, which is why it hid); and a zero-length motion
    vector was normalized at the exact instant a dive centred its target, which
    NaN'd `gl_Position` and discarded the one star the viewer had asked to look
    at.
  - **Everything below the sky is unchanged**: the same lens (`CAM`/`FOCAL`/
    `TILT`), the same framing, the same send-off meteor grammar, the same held
    star view, the same gestures, and every method signature `App.jsx`,
    `ui.jsx` and `CommunityScreen` call.

- **2026-07-26** — **The consistency pass** (human-directed: "the biggest
  problem throughout the entire web is design inconsistency"). The system had
  the right *rules* and no enforcement, so every screen drifted:
  - **One size ladder** (§3). 26 font sizes → 9 steps; 7 letterspacings → 2;
    12 headline `clamp()`s → 3. Typography primitives (`Display`, `Title`,
    `Lead`, `Body`, `Small`, `Note`) added to `ui.jsx` so screens stop
    hand-rolling type.
  - **Twenty icons → five** (§3b). The rest became words or nothing.
  - **One `ScreenHeader`.** Every screen used to hand-roll a header row with a
    guessed-width spacer, which is why nothing lined up between them.
  - **The dock lost a station.** Three, two of which opened the same place.
  - **Explanation text cut** throughout. The identity screen alone lost five
    notes and a sentence about the reader's own account written in the
    conditional ("*if* @ace03d has an email on file…") — the server knows the
    answer, so migration 0015 has it decide and the screen just reports.
  - **Zero em dashes** in copy, enforced by `npm run lint:voice`.

- **2026-07-09 (b)** — **Ping-logic + UI refinements pass** (human-directed;
  identity untouched — same cosmos, two stars, one primary action per screen):
  - **The status pill is dead.** The communities' amber `● open` chip (bordered
    uppercase pill + breathing dot) was called out as generic-AI output and
    retired everywhere, replaced by `SkyStatus` — the state spoken as a quiet
    serif-italic line ("the sky is open." / "still gathering."). A permanent
    §9 rule now bans the pattern product-wide.
  - **The seal moved into the sky.** On the community page the school's mark no
    longer sits in the top lockup; it rests at the galaxy's heart (the engine's
    projected core, 42% of the viewport), inside a soft core halo and a fine
    ring — the place's flag planted in its own cosmos.
  - **Your pings page reorganized.** Your ONE community now leads the page as
    its own glass banner (seal, name, spoken status, hero stat, an explicit
    "view the community" action, and the finder one tap away), clearly separated
    from the slot rows by a hairline. The community's live beats — meteors for
    pings, constellations for matches, with the same quiet `LivePulse` caption —
    now play on this screen too (the backdrop is the same shared sky).
  - **Fly to your ping.** Tapping a ping row sends the backdrop camera diving
    to that ping's own star while the foreground melts away; at arrival the @
    it holds rises over the star on a slim tick (device-held plaintext only).
    Works over both engines (community dive / ambient focus glide); any tap
    brings the screen back.
  - **"Your star" redesigned** in both engines: a white-hot core inside layered
    amber + rose light, the product's diffraction glisten resting shyly on top,
    and a fine breathing ring — replacing the old bare dot-with-glow (called
    out as low-quality). `locateMine` now tracks a *list* of your stars (one
    per ping, restored across remounts), so find-your-star resolves with any
    number of pings and cycles through them.
  - **The public @** — an opt-in: your own handle resting above your own star
    in your community's sky (canvas-drawn mono tags, capped and faint, so the
    sky reads inhabited, never a roster). One warning sheet before it flips
    public; one tap back to anonymous.
  - **The landing hero rebalanced.** The typed promise is now two deliberate
    lines with a held breath between them, and both line-boxes are reserved
    from the first frame — the second line arriving no longer shifts the hero.
  - **The joined community is a badge, not a chip.** The onboarding step's
    small removable chip became a full-width amber-lit "joined" panel (there is
    only ever one membership, and it deserves the room).

- **2026-07-09** — **The community sky rebuilt as a real 3D galaxy — one
  universe, two instruments.** A human-directed ground-up redesign of
  `app/src/communityGalaxy.js` + `CommunityScreen`: the old flat squashed
  point-field (which read as a scatter plot next to the landing galaxy) is gone.
  - **Same universe.** The community engine now shares the backdrop galaxy's
    entire visual language — the exact deep-space gradient, perspective camera
    (`CAM`/`FOCAL`/`TILT`), soft round star sprites, diffraction spikes, nebula
    gas, disk haze, full-frame background field, pointer/tilt parallax — so
    swapping backdrops (joining, browsing) reads as facing a different part of
    the SAME cosmos. The engines stay deliberately separate files: `galaxy.js`
    is the ambient sky for everyone; `communityGalaxy.js` is live and countable.
  - **The countable logic, upgraded.** Every disk star is still one real ping,
    but slots now seat a bright spheroidal heart + two feathered logarithmic
    arms + inter-arm scatter (deterministic per index, filling heart-outward),
    so ANY count reads as a genuine spiral — a small community is a young tight
    galaxy, a big one the full sprawl. Core glow, disk haze and nebula all
    scale with fill: density stays *felt*.
  - **Meteors, not rockets.** A new ping arrives as a slim shooting star that
    decelerates out of deep space into its slot and ignites with the
    diffraction-spike glisten (the send-off morph's own signature). Bursts are
    guarded: past six at once, the rest settle in quietly (a data catch-up must
    never read as a meteor storm).
  - **Constellations live IN the disk** — seated inside the lit fill envelope,
    riding the disk's rotation in 3D, traced node-to-node by a travelling
    spark; retired figures dissolve. Still structurally anonymous (never tied
    to an identifiable ping).
  - **New interactions.** A tap sends a wave through the disk *plane* (a
    projected ring that tilts with the galaxy) and stars flare as the front
    crosses them; `locateMine()` is now a cinematic camera dive — the camera
    flies through the field to the viewer's own star, holds while it flares in
    its ring, and glides back (reduced motion: a calm converging ring instead).
  - **The page got out of the sky's way** (`CommunityScreen`): compact identity
    lockup, an unobstructed hero zone, ONE quiet live-pulse caption docked at
    the sky's foot (`LivePulse`, replacing the center-screen toast stack), and
    one glass readout panel holding the reveal clock (now a single heartbeat
    line) + the weekly numbers. The forming state is a slowly swirling
    proto-galaxy of gas and uncountable motes. `CommunityGalaxyCanvas` now
    reconciles live counts after mount, so crossing the 100 floor *resolves*
    the nebula into stars in place.

- **2026-07-08** — **Communities become a living galaxy: pings as stars, matches
  as anonymous constellations, a moderated shoutout wall — and the broken
  countdown/percentage removed.** A human-directed rework of the community page,
  inside the locked galaxy identity (two stars only, one primary action, §3
  registers). *Why:* the page ran three fighting progress systems — a launch
  countdown (time), a percentage ring (members÷threshold), and a live feed — that
  could disagree (the clock hitting 0:00 at 0%). The masterguide already resolves
  this: celestual is globally open, so a community is **never a gate**; at a fixed
  **100 members** its stats simply open. So the countdown and the percentage are
  gone, and density is now *felt*, not read.
  - **A second galaxy** (`app/src/communityGalaxy.js`, `CommunityGalaxy` +
    `CommunityGalaxyCanvas` in `ui.jsx`) — distinct from the ambient backdrop
    (`galaxy.js`). Here **every star is one real ping**: the field starts empty and
    fills (0 → ~1000+) with a phyllotaxis spiral, each new ping igniting via a
    launch streak that rises and settles ("someone placed a ping"). A small
    community is a tight bright core; a large one sprawls to the rim — size is felt.
  - **Anonymous match-constellations** — every mutual match this week lights ONE
    unattributed asterism seated within the community's light. A constellation is
    never tied to an identifiable ping, so the sky can never reveal who matched
    whom: the double-blind, kept structurally. Capped so it never tangles.
  - **The privacy floor as a visual** — a gathering community (<100 members) hides
    its exact counts (small counts de-anonymize), so its galaxy is an *uncountable
    forming nebula*; crossing 100 resolves it into discrete stars + its first
    constellations. The unlock is a real visual reward, not a bar hitting 100%.
  - **A live shoutout wall** (`ShoutoutPanel`, `app/src/moderation.js`) — the one
    public voice on the platform, anonymous by construction: the composer strips
    @handles / names / contacts, blocks abuse, and rate-limits (45s), so it can be
    alive without outing a person or a match. Ping toasts (`GalaxyToasts`) rise
    over the field as the demo pulse (`useCommunityPulse`) fires pings, matches,
    and shoutouts. The `Meter`/`ProgressRing`/countdown are retired from the page
    (`ProgressRing`/`Meter` stay exported for the optional `/c/` campus window).

- **2026-07-06** — **Communities complete rework (curated launch spaces), the
  progress ring, live activity, crush-first onboarding, and a calmer galaxy core.**
  A human-directed feature change, kept inside the locked galaxy identity (no new
  hue — the two stars only; one primary action per screen; registers per §3):
  - **Communities** (`WorldsScreen` → the communities list, plus a new
    `CommunityScreen`) — no longer user-typed "worlds" but an **official, curated**
    set the team owns (`app/src/communities.js`: UC Berkeley, Wesleyan, CMU). Each
    school wears a small monochrome **seal** (`SchoolMark`) — a cosmos ring + serif
    monogram + the one amber crest star — designed to be swapped for a real logo by
    dropping a black-on-transparent asset in `app/public/schools/`.
  - **The progress ring** (`ProgressRing`) — a community's climb toward its
    team-set threshold, shown as a ring instead of a raw count: faint cream track,
    amber→rose arc that fills once and eases when the value changes, a white star
    riding the leading edge (the `Meter` edge-star, curved), and the percentage as
    the serif hero. This is the one deliberate voice exception in the system: its
    center label is intentionally literal ("unlocked"), sourced from
    `communities.js` — a human decision for this growth surface, documented in
    VOICE.md, and kept out of the linted copy.
  - **Live activity** (`useLiveFeed` / `LiveActivity`, /demo only) — one anonymized
    beat at a time, popping up and fading over the communities surfaces so the
    sandbox reads as actively used; beats nudge the ring so it visibly climbs. All
    in-memory, gone on tab close. Literal beat copy lives in `demoData.js`.
  - **Crush-first onboarding** — a new user now names their crush (`who`) before
    themselves (`you`), then is offered the curated schools (`SchoolsScreen`,
    opt-in cards) once, before the first ping places.
  - **The campus window is folded in** — the old `/c/<slug>` linear `Meter` flow is
    retired into the community page; `Meter` stays exported but unmounted.
  - **Galaxy core calmed** (`galaxy.js`, `_coreGrad` + core radius) — by explicit
    human request (satisfies the design lock): the central bulge wash is dialed
    back so it never blooms over mid-screen text. Identity untouched — still the
    living galaxy, cosmic violet, two stars; only the central brightness changed.
  Each new surface was checked against §9: one primary action, amber+rose only,
  serif feeling / mono metadata, generous emptiness, real motion (the ring's fill,
  not a spinner), one continuous cosmos behind it.
- **2026-07-05** — **Communities redesign, mutual/slot separation, hero rework,
  demo checkout.** Four visual changes, all within the locked galaxy identity (no
  new hue — the two stars only; one primary action per screen; registers cast per
  §3):
  - **Your worlds** (`WorldsScreen`) — the communities feature, rebuilt from a
    plain account-sheet list into a dedicated view. Open worlds (100+) show a live
    weekly readout written as *language*, not a KPI grid — one hero number
    (serif), the top reason as a real quote, a quiet mono line of pings/joined,
    and a breathing "this week" dot. Gathering worlds (<100) show *no count* (the
    floor) and a lock-icon preview of what opens at 100. Deliberately avoids the
    generic dashboard tells in §9 (no metric grid, no icon grid, no cards-in-cards
    beyond the one glass panel).
  - **Status page** — a mutual match is now its own compact section under a
    "✦ mutual" rule, so it never crowds the three standing-slot rows (which stay
    exactly three: live pings + open slots). The empty-slot card copy no longer
    claims "room for one more" regardless of count.
  - **Hero typewriter** (`HeroSequence`) — the two mechanic lines now type on
    stacked lines and *hold together* before fading; the amber payoff then enters
    alone and holds longest. Easier to follow than the single erase-and-retype
    line. Collapses to a static three-line stack under reduced-motion.
  - **Sandbox fourth-slot checkout** (`FourthSlotPaywall`, `/demo` only) — a
    realistic one-time-payment card (card field with brand marks, MM/YY · CVC ·
    ZIP, "pay $3.99", "powered by stripe") shown only when a user runs out of
    slots. The two product stars double as the mastercard glyph, so no third hue
    enters. Production is untouched: the fourth-slot screen still shows only the
    free "let one go" door.
- **2026-07-04** — **Cold-landing mechanism as a three-beat constellation.** Per
  the Master Guide §4.1 ([MASTER-GUIDE.md](./MASTER-GUIDE.md)), the landing's
  three mechanic lines — previously a flat stack of muted sans lines ("enter their
  instagram handle." / …) — were rebuilt as a small vertical constellation
  (`LandingBeats` in `screens.jsx`): three nodes down a rail that warms from
  `muted` to `you`/amber, escalating from a sent-signal amber dot (*the ping*)
  through a hollow ring (*the silence*) to the ✦ where the two stars meet (*the
  reveal*). Mechanics stay in the interface register (Space Grotesk); the reveal's
  payoff crosses into serif italic — the one lit line, echoing the match screen.
  The `@` in "put their @ in." lights up in the handle's amber mono glyph. No new
  hue (amber + rose only), one primary action, emptiness preserved, all copy
  literally true — passes §9. The change is reflected here per the living-document
  rule. Nothing else visual changed; the galaxy backdrop, palette, and type
  registers are untouched.
- **2026-07-04** — **Restored the galaxy edition** as the canonical visual
  identity, by explicit human request. Brought back `app/src/galaxy.js` (the
  living 3D particle galaxy) and re-mounted it via `GalaxyCanvas` as the
  product-wide backdrop, replacing the static `NightField`. Reinstated the
  cosmic-violet palette (`ink #0B0814`) and the **two-star accent system**
  (starlight-amber `you #FF9E6B` + rose `them #E6749E`); `star`/`onStar` kept as
  aliases of `you`/`onYou` so no component broke. Amber cursor and selection
  restored; interim film-grain overlay removed (the galaxy carries the texture).
  This document rewritten to describe the galaxy edition and to **lock** it (see
  the Design lock at the top): the look does not change again without an explicit
  human request. Type registers and geometry are unchanged from the interim
  edition; product workflows are untouched — this was purely a visual restore.
- **2026-07-03** — (interim "night edition") Navy field, single warm star,
  static `NightField`; galaxy retired. Superseded by the 2026-07-04 restore
  above.
