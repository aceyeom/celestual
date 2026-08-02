# CELESTUAL — Design system (the galaxy edition · the living document)

How celestual looks and moves, and how it stays looking like *itself* — never
like template output, never like "generic AI product" (uniform gradients,
glassmorphism cards, three-feature grids, confetti). This file is the design
half of the pair; [VOICE.md](./VOICE.md) is the writing half. **Both are living
documents: any visual change ships with an edit here, in the same commit.**

Enforced mechanically where possible: `app/src/theme.js` is the single source
for color/geometry (nothing defines its own hex), and `npm run lint:voice`
trips on the copy half.

> ## ⛔ Design lock — read before touching anything visual
>
> **This galaxy edition is the canonical, intended look of Celestual.** The
> deep cosmic-violet field, the living 3D galaxy backdrop, and the *two* warm
> stars (starlight-amber + rose) are deliberate — not leftovers to be tidied.
>
> **Claude must NOT flatten, simplify, "clean up," or restyle this identity on
> its own.** Do not collapse the two accents to one, do not swap the cosmic
> violet for navy, do not retire the galaxy for a static field, and do not
> delete the two-star / cosmos vocabulary — *unless a human explicitly asks for
> that specific change in the current request.* A visual redesign is a decision
> the human makes; it is never a refactor, a modernization, or a byproduct of
> unrelated work. When in doubt, keep this look and ask.
>
> Product **functionality and workflows may keep evolving** (the ping model,
> the screens, the backend). That is expected. The *visual language* below is
> what stays fixed until a human deliberately changes it.

## §1 — The one-paragraph system

The whole product lives inside **one deep cosmic-violet field** with a **living
galaxy** slowly orbiting behind every screen. It is lit by **two warm stars**:
**starlight-amber (`you`)** and **rose (`them`)** — the two stars of the core
metaphor, you and the person you're thinking about. Serif italics carry feeling;
a small quiet sans carries mechanics; letterspaced mono carries metadata. Every
screen has **exactly one primary action**. The felt register everywhere is
*quiet, adult, certain — the 2am message, never the carnival*. The cosmos moves,
but it never performs for attention: it drifts, it breathes, it holds its seed
between screens.

## §2 — Color: the cosmos and the two stars

All tokens live in `app/src/theme.js` (`TOKENS`). Never a raw hex in a
component.

| Token | Value | Role |
| --- | --- | --- |
| `ink` | `#0B0814` | the cosmic-violet void — every backdrop and the galaxy field |
| `ink2` | `#16111F` | panels, fields, sheets |
| `ink3` | `#211934` | raised/disabled surfaces |
| `cream` | `#F3ECF6` | text — the emotional and interface voices |
| `muted` | `#9E92B6` | text — the mechanical voice (cool violet-grey) |
| `line` | `rgba(243,236,246,0.10)` | hairlines only |
| `you` | `#FF9E6B` | **starlight-amber — the primary star** (you / the primary action) |
| `them` | `#E6749E` | **rose — the secondary star** (them / mutuality) |
| `onYou` | `#1A0F0A` | ink on the amber CTA |
| `star` | `#FF9E6B` | alias of `you`; every `C.star` in the UI lights up amber |
| `onStar` | `#1A0F0A` | alias of `onYou` |

Rules that follow:

- **Two accents, and only two: amber and rose.** They are the two stars of the
  metaphor, not decoration — amber is *you* / the primary action / the brand
  glyph; rose is *them* / the counterpart / mutuality. A **third** hue anywhere
  means a screen is doing too much. (Amber and rose are the ceiling, not an
  invitation to add more.)
- `star`/`onStar` are aliases of `you`/`onYou`, so components written against
  the single-accent scheme still read correctly — they simply glow amber. The
  primary action and the *you* star are the same light; never split them into a
  third color.
- "Waiting" and disabled states read in `muted`/`line` — cooler, never a
  random hue. Errors are calm sentences in near-star warmth, not red (there is
  no red in the product; nothing here is an emergency).

## §3 — Type: three registers, strictly cast

The type system *is* the tone system (VOICE.md §3). Breaking register is how
screens start looking assembled-by-template. Fonts are loaded in
`app/index.html` (Instrument Serif, Space Grotesk, Space Mono).

- **Instrument Serif, italic** — the emotional register. Headlines, the states,
  the intent lines, handles when they are the hero. Anything a person *means*.
  The second hero line is set in a star color (amber).
- **Space Grotesk** — the interface register. Buttons, body copy, mechanics,
  hints.
- **Space Mono, uppercase, letterspaced** — the metadata register. Kickers,
  labels, counts, day-clocks, statuses, the @ prefix. Never feelings.

### The size ladder (`SIZE` in `theme.js`)

Three faces is only half the system; the other half is that **nothing invents a
size**. `theme.js` holds one ladder and every piece of text in the product is a
step on it:

| Step | Use |
| --- | --- |
| `hero` | the match reveal, and nowhere else |
| `display` | the one headline a screen is allowed |
| `title` | a sheet's or a section's headline |
| `figure` | a number that IS the point of its card |
| `lead` | a spoken serif line inside a card |
| `head` | a card title, a button |
| `body` | the reading size |
| `small` | secondary sans |
| `meta` / `micro` | mono metadata, with `TRACK.meta` / `TRACK.micro` |

`ui.jsx` exports these as components — `Display`, `Title`, `Lead`, `Body`,
`Small`, `Kicker`, `Mono`, `Note` — and screens use those rather than inline
styles. Before 2026-07-26 they didn't: the app carried **26 distinct font
sizes**, seven letterspacings and twelve different `clamp()` headline formulas,
which is why the same idea looked like three different products on three
different screens. A new size is a change to `theme.js`, argued for there, not a
number typed into a style object.

Hard rules: an intent line never renders in mono; a count never renders in
serif; nothing anywhere gets an exclamation mark; `✦` is reserved for ritual
moments (mutuality) — it is not a bullet point.

## §3b — Icons: five, and that is the whole set

`Icon` in `ui.jsx` draws exactly **back, arrow, close, check, search**. Nothing
else. There is no icon for mail, lock, eye, instagram, clock, info, message,
share, planet, plus, copy, download or refresh, and adding one back is a design
decision that belongs in this file first.

A generic outline icon set is the single fastest way to make a product look like
every other product. This one carried twenty of them: an envelope on the email
hint, a padlock beside the privacy line, an eyeball on "no alert", a camera on
every mention of Instagram, a share node-graph. None of them said anything the
sentence beside them did not already say, they came from the same free outline
vocabulary everyone draws from, and because each call site picked its own size
and stroke they did not even match each other.

**What replaced them:** words, or nothing. The five that survive are the ones a
*hand* needs — go back, go on, close, confirm — plus the affordance on a real
search field. Meaning is carried by type, by light, and by the one star.

## §4 — The galaxy field (the backdrop)

One persistent backdrop for the whole product: **`GalaxyCanvas`** in
`app/src/components/ui.jsx`, wrapping **`GalaxyField` in `app/src/galaxy.js`** —
a real 3D galaxy rendered on a dependency-free **WebGL2** engine (`app/src/sky/`).
The two skies (`galaxy.js`, the ambient field, and `communityGalaxy.js`, the
countable community sky) are two *populations* on that one engine, so they can
never drift apart.

The physics is the art direction, and everything below follows from it:

- **The arms are density waves, not drawings.** Every star travels its own
  elliptical orbit; each orbit is rotated slightly further than the one inside
  it, and where the ellipses crowd, density rises. That crowding *is* the arm.
  It survives differential rotation (stars flow through the arms; the pattern
  stays), which is why the field can be permanently, slowly alive.
- **Colour is demographics.** A star's hue is its blackbody temperature on the
  Planck locus. The bulge is gold because it is old, the arms are blue because
  they are where gas is still collapsing into hot short-lived stars, and the
  red giants are red because they are cool. No palette is picked.
- **Brightness is luminosity over distance squared**, displayed through an
  asinh stretch (the standard astronomical transform) so six orders of
  magnitude fit in one frame without the supergiants erasing everything else.
- **A star has two sizes**: the instrument's point-spread function, and its
  true angular diameter. The larger wins. Far away it is a point of light;
  close enough, it resolves into a **body** — a limb-darkened, granulating
  photosphere. A dive goes all the way in.
- **The nebula is a volume**, raymarched with real emission and extinction, so
  dust genuinely occludes the disk behind it and the camera can fly *through*
  the gas rather than having to dissolve it on approach.
- **The frame ends in a sensor**: an unclamped half-float buffer, dual-Kawase
  bloom, and an ACES tonemap. Brightness is spent as *light*, never as size.

It is mounted **once**, in **idle mode**, as a fixed full-bleed layer beneath the
content column. Under `prefers-reduced-motion` the sky keeps a slow, steady,
non-accelerating drift at half frame rate rather than freezing — the preference
is about vestibular safety, not about wanting a dead picture. Where WebGL2 is
unavailable the same public API hands back a modest canvas-2D field
(`sky/fallback2d.js`), so the product is never without a night sky.

What it is *not*: not a flat 2D swirl, not a looping decorative gradient. It's a
window into a real cosmos, calm at rest.

## §5 — The star (the mark)

`StarMark`: a white core breathing in **light, never in scale** (a scale pulse
reads as a notification ping) inside a soft warm halo. The brand glyph
(`Brandmark`, favicon, card) is the concave four-point sparkle — pinched arms,
photographic glisten — white-hot center to warm (amber) edge. The custom cursor
(`styles.css`) is that same four-point glisten with a soft amber edge.

Sizing is meaning: the star is small on quiet screens and largest — the one
place the brand permits real brightness — at the moment of mutuality. Nowhere
else does anything glow harder.

## §6 — Geometry, spacing, surfaces

From `theme.js`: `RADIUS` (chip 999 for tiny pills only · field 16 shared by
inputs AND buttons · card 20 · inner 12) and `SPACE` (4px rhythm). One shadow
vocabulary (`makeShadow`): the focus glow, the resting halo, the CTA lift, the
sheet drop. The content column is an intimate measure, phone and desktop alike.
Hairlines (`Rule`) fade at both ends and grow from center.

## §7 — Screens: one action each

Every screen sits over the same living galaxy, carries **exactly one** primary
action (amber), casts its type by register (§3), and keeps its emptiness.
Feeling is serif italic; the second hero line and the primary action are amber;
mutuality is where rose appears and the star burns brightest. Product workflow
(the ping model, the specific screens) evolves independently — but each screen
must still pass §9 before it ships.

## §8 — Motion

Motion states facts; it never begs. The inventory: the galaxy's slow idle orbit
and whisper of pointer/tilt parallax, `fadeUp`/`fadeIn` entrances (≤600ms, one
soft curve), the star's slow breath in light (4.5s/7s), the sonar for
genuinely-waiting states, the meter's single fill, the verification pop, sheet
scrims, and the View Transitions cross-fade (320ms) over the persistent galaxy.
Anything looping faster than ~3s, bouncing, or spinning is off-brand. All of it
collapses under `prefers-reduced-motion`.

## §9 — The anti-generic checklist (review gate)

Before any screen ships, check it against these — each one is a known tell of
template/AI output:

- [ ] Exactly one primary action? (Two bright buttons = redesign.)
- [ ] Only the two stars — amber and rose — as accents? (A *third* hue
      anywhere = send it back.)
- [ ] Registers cast correctly? (Feelings in serif italic, metadata in mono?)
- [ ] Emptiness preserved? (If it feels like it needs "more content," it
      needs less.)
- [ ] No cards-in-cards, no icon grids, no gradient buttons, no glassmorphism
      panels, no emoji, no exclamation marks, no confetti.
- [ ] **Any icon at all?** Five exist (§3b). If the screen wants a sixth, it
      wants a word instead.
- [ ] **Every size a step on the ladder?** (§3. A raw `fontSize: 12.5` is a
      review failure, not a detail.)
- [ ] **Does anything explain the interface?** A note under a field saying what
      the field is for means the field is wrong. Delete the note, fix the field.
- [ ] **Any em or en dash in the copy?** `npm run lint:voice` fails the build on
      one. A dash is a writer stalling; choose a thought and end the sentence.
- [ ] **No status pills.** A bordered uppercase chip with a colored "live" dot
      (the `● OPEN` badge) is a named tell of AI-template output and is banned
      here permanently — it shipped once (the communities' amber "open" chip)
      and was retired 2026-07-09. A state reads as quiet *words* in register:
      serif italic when it's felt ("the sky is open."), mono when it's metadata.
      Never a pill, never a pulsing dot beside a label.
- [ ] Does the cosmos still read as one continuous field behind it? (No screen
      swaps to a different background hue family.)
- [ ] Every number shown literally true, or not shown?
- [ ] Would the screen still feel certain with the copy removed? (The layout
      itself should carry the calm.)
- [ ] Is the change reflected in this file?

## §10 — Artifacts covered by this system

The system extends beyond the app; these must all read as the same cosmos:

- **The open-door / share card** (`app/src/card.js`) — the most public pixel the
  brand owns. Gorgeous is a requirement, not a preference.
- **The card** (`app/src/beta/Disc.jsx`) — the circular body a ping resolves
  into, and its story render (`app/src/beta/share.js`). One fixed layout at
  every size it ever appears at; see the 2026-08-02 changelog entry.
- **The OG share image** (`app/public/og.svg` → `og.png`) — the landing's hero
  restated.
- **Emails** (`supabase/functions/*`) — cosmic-violet field, mono-spaced kicker,
  serif-italic feeling line, one amber button, muted small print.
  Georgia/Arial stand in for the web fonts.
- **The favicon** (`app/public/star.svg`) — the glyph on the cosmos.
- **Posters/QR for campus windows** — school name in the label style, the
  threshold line, the QR. Nearly empty.

## §11 — Changelog

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
  - **The card's fixed layout**, and it is the whole vocabulary: the disc, per-
    channel limb darkening, a corona in the card's own light, the `@` set on
    the rim (mono, tracked, the metadata register at the greatest possible
    distance from the words), twenty words in serif italic beneath, one mono
    tick under that. The user chooses content and never design.
  - **A card's light comes from its photograph.** The plan bans relationship
    labels outright, so the tint cannot come from a picker: it is measured off
    the image, luminance-weighted so the light source in the frame decides, and
    mapped between the two existing stars. A warm room burns amber, a cold one
    rose. No third hue, no category, nobody asked.
  - **A card with no photograph is still a star** — the disc shows the
    photosphere. This is the reason the photo can be optional at all.
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
