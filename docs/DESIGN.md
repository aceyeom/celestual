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

Hard rules: an intent line never renders in mono; a count never renders in
serif; nothing anywhere gets an exclamation mark; `✦` is reserved for ritual
moments (mutuality) — it is not a bullet point.

## §4 — The galaxy field (the backdrop)

One persistent backdrop for the whole product: **`GalaxyCanvas`** in
`app/src/components/ui.jsx`, wrapping **`GalaxyField` in `app/src/galaxy.js`** —
a real 3D perspective-projected particle galaxy (dependency-free, hand-rolled
canvas math). Stars live in 3D, spin around the galactic axis, and project
through a perspective camera the viewer can subtly steer with the pointer or
device tilt, so the field has genuine **depth and parallax**. Layered
populations — a bright core bulge, an exponential-falloff disk with feathered
spiral arms, halo stars, soft drifting nebula gas, and a full-frame background
starfield — dissolve it into space instead of a contained shape. The two stars
(`you` amber, `them` rose) are the field's own light.

It is mounted **once**, in **idle mode**, as a fixed full-bleed layer beneath the
content column. It honors `prefers-reduced-motion` (the galaxy settles to a
near-static window into space). `NightField` — the retired static navy field of
the interim "night edition" — remains in `ui.jsx` but is **not mounted**; the
living galaxy is the backdrop.

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
- **The OG share image** (`app/public/og.svg` → `og.png`) — the landing's hero
  restated.
- **Emails** (`supabase/functions/*`) — cosmic-violet field, mono-spaced kicker,
  serif-italic feeling line, one amber button, muted small print.
  Georgia/Arial stand in for the web fonts.
- **The favicon** (`app/public/star.svg`) — the glyph on the cosmos.
- **Posters/QR for campus windows** — school name in the label style, the
  threshold line, the QR. Nearly empty.

## §11 — Changelog

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
