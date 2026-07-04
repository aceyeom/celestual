# CELESTUAL — Design system (the living document)

How celestual looks and moves, and how it stays looking like *itself* — never
like template output, never like "generic AI product" (uniform gradients,
glassmorphism cards, three-feature grids, confetti). This file is the design
half of the pair; [VOICE.md](./VOICE.md) is the writing half. **Both are living
documents: any visual change ships with an edit here, in the same commit.**
The source of product truth is
[ULTIMATE-PRODUCT-FRAMEWORK.md](./ULTIMATE-PRODUCT-FRAMEWORK.md) Part 4, which
this system implements.

Enforced mechanically where possible: `app/src/theme.js` is the single source
for color/geometry (nothing defines its own hex), and `npm run lint:voice`
trips on the copy half.

## §1 — The one-paragraph system

Deep navy fields. Generous, deliberate emptiness. **One warm star as the only
accent in the entire product** — there is no secondary color, no theme picker,
no cosmetic variation, anywhere, ever. Serif italics carry feeling; a small
quiet sans carries mechanics; letterspaced mono carries metadata. Every screen
has **exactly one primary action**. The felt register everywhere is *quiet,
adult, certain — the 2am message, never the carnival*. The night behind every
screen is still: nothing drifts, nothing sparkles for attention, because the
product's integrity is that nothing happens until everything does.

## §2 — Color: the night and the star

All tokens live in `app/src/theme.js` (`TOKENS`). Never a raw hex in a
component.

| Token | Value | Role |
| --- | --- | --- |
| `ink` | `#070B14` | the night — every backdrop |
| `ink2` | `#0C1322` | panels, fields, sheets |
| `ink3` | `#141D31` | raised/disabled surfaces |
| `cream` | `#F2EEE5` | text — the emotional and interface voices |
| `muted` | `#8B94A8` | text — the mechanical voice (cool slate) |
| `line` | `rgba(242,238,229,0.10)` | hairlines only |
| `star` | `#FFA25C` | **the single warm accent** |
| `onStar` | `#1A0F06` | ink on star-colored buttons |

Rules that follow:

- The star color marks exactly four things: the primary action, the brand
  glyph, a "standing" state, and mutuality. If a fifth thing wants it, one of
  the four is wrong.
- "Waiting" and disabled states read in `muted`/`line` — cooler, never a
  second hue. Errors are calm sentences in near-star warmth, not red (there is
  no red in the product; nothing here is an emergency).
- The old two-accent system (amber "you" / rose "them") is **retired**. One
  star. A screen that seems to need two accents is doing too much.

## §3 — Type: three registers, strictly cast

The type system *is* the tone system (VOICE.md §3). Breaking register is how
screens start looking assembled-by-template.

- **Instrument Serif, italic** — the emotional register. Headlines, the states
  ("it's standing."), the intent lines, handles when they are the hero.
  Anything a person *means*.
- **Space Grotesk** — the interface register. Buttons, body copy, mechanics,
  hints.
- **Space Mono, uppercase, letterspaced** — the metadata register. Kickers,
  labels, counts, day-clocks, statuses, the @ prefix. Never feelings.

Hard rules: an intent line never renders in mono; a count never renders in
serif; nothing anywhere gets an exclamation mark; `✦` is reserved for ritual
moments (mutuality, the sandbox controls) — it is not a bullet point.

## §4 — The night field (backdrop)

One persistent backdrop for the whole product: `NightField` in
`app/src/components/ui.jsx`. A seeded, **static** scatter of faint cool stars
(one in ~14 carries a whisper of warmth), a barely-there vertical falloff, and
a film-grain overlay at 5% (styles.css) so flat navy never reads as a dead hex
rectangle. The seed is fixed — the same sky holds still between screens.

What it is *not*: no parallax, no drifting particles, no nebula gradients, no
canvas animation loop. A backdrop that performs is a backdrop that lies about
what the product does. (The old interactive galaxy — tags, zoom camera, star
morphs — was retired with the repositioning; Screen 4 is a quiet list on
purpose.)

## §5 — The star (the mark)

`StarMark`: a white core breathing in **light, never in scale** (a scale pulse
reads as a notification ping) inside a soft warm halo. The brand glyph
(`Brandmark`, favicon, card) is the concave four-point sparkle — pinched arms,
photographic glisten — white-hot center to warm edge.

Sizing is meaning: ~64px on the landing, ~82px on "placed," and its largest —
128px — on the match screen, **the one place the brand permits brightness**.
Nowhere else does anything glow harder than the star.

## §6 — Geometry, spacing, surfaces

From `theme.js`: `RADIUS` (chip 999 for tiny pills only · field 16 shared by
inputs AND buttons · card 20 · inner 12) and `SPACE` (4px rhythm). One shadow
vocabulary (`makeShadow`): the focus glow, the resting halo, the CTA lift, the
sheet drop. Content column is capped at 460px — an intimate measure, phone
and desktop alike. Hairlines (`Rule`) fade at both ends and grow from center.

## §7 — Screens: one action each

Framework Part 4 is the wireframe spec; these are the standing visual rules:

1. **Landing** — star high, hero serif italic (second line in star color),
   three mechanics lines in small sans, one button, one safety line, a whisper
   footer. No navigation weight, no feature grid, no counters.
2. **The send** — a small mono kicker ("who is it?"), one centered field with
   the @ prefix, the optional intent row (five serif-italic chips), the slot
   pips beneath. Weight, not friction.
3. **Placed** — the star, the state in serif italic, the sub-line pre-framing
   silence. State B adds the titled "how people do it" block. State A's only
   action is quiet; State B's "post your door" is the primary.
4. **Your pings** — a quiet list, at most three-plus-mutual rows: serif handle,
   state word + dot (standing = faint warm breath · waiting = cool grey ·
   mutual = ✦), mono day-clock, whisper-level "let it go." Deliberately boring;
   nothing rewards checking.
5. **The door** — the rendered Story card itself (never a mockup), the three
   steps, save + copy-link. The card: navy, the sparse night, the star, the
   receiver-voice line in serif italic, handle + link small at the bottom.
6. **Campus window** — campus name in the label style, the meter (a thin line
   filling with warm light, a white leading spark, the true count in large
   serif numerals), one button.
7. **Open / week one** — "it's open." with the send field one tap away; the
   reveal is numbers in serif italic, matches line in star color, nothing
   decorated. Every number exact or absent.
8. **The match** — the star at 128, "it's mutual." larger than any other
   headline, intent lines quoted in bordered blocks (theirs first, star-warm
   border), one button out. **No share button, no confetti, no screenshot
   artifact** — the absence is the anti-humiliation architecture.
9. **The fourth slot** — three lit dots, the fact, one door ("let one go").
   The paid second door stays unbuilt until monetization wakes (framework
   Part 3); this screen never gains urgency copy.

## §8 — Motion

Motion states facts; it never begs. The complete inventory: `fadeUp`/`fadeIn`
entrances (≤600ms, one soft curve), the star's slow breath (4.5s/7s), the
sonar for genuinely-waiting states, the meter's single fill (1.1s, once), the
verification pop, sheet scrims, and the View Transitions cross-fade (320ms).
Anything looping faster than ~3s, bouncing, or spinning is off-brand. All of
it collapses under `prefers-reduced-motion`.

## §9 — The anti-generic checklist (review gate)

Before any screen ships, check it against these — each one is a known tell of
template/AI output:

- [ ] Exactly one primary action? (Two bright buttons = redesign.)
- [ ] One accent only? (A second hue anywhere = send it back.)
- [ ] Registers cast correctly? (Feelings in serif italic, metadata in mono?)
- [ ] Emptiness preserved? (If it feels like it needs "more content," it
      needs less.)
- [ ] No cards-in-cards, no icon grids, no gradient buttons, no glassmorphism
      panels, no emoji, no exclamation marks, no confetti.
- [ ] Every number shown literally true, or not shown? (Counters floor at 100;
      meters show the true count; nothing is ever padded.)
- [ ] Would the screen still feel certain with the copy removed? (The layout
      itself should carry the calm.)
- [ ] Is the change reflected in this file?

## §10 — Artifacts covered by this system

The system extends beyond the app; these must all read as the same night:

- **The open-door Story card** (`app/src/card.js`) — the most public pixel the
  brand owns. Gorgeous is a requirement, not a preference (framework §2.2).
- **The OG share image** (`app/public/og.svg` → `og.png`) — the landing's hero
  restated.
- **Emails** (supabase/functions/celestual-notify, -remind) — navy field,
  mono-spaced kicker, serif-italic feeling line, one star-colored button,
  slate small print. Georgia/Arial stand in for the web fonts.
- **The favicon** (`app/public/star.svg`) — the glyph on navy.
- **Posters/QR for campus windows** — school name in the label style, the
  threshold line, the QR to the meter. The meter is the campaign; the poster
  stays nearly empty.

## §11 — Changelog

- **2026-07-03** — Repositioned to the masterguide (ULTIMATE-PRODUCT-FRAMEWORK):
  navy night replaces cosmic violet; single warm star replaces the amber/rose
  pair; interactive galaxy retired in favor of the still night field and the
  quiet pings list; Nova seal styles/sky themes deleted (no cosmetic variation,
  no monetization surfaces); meter, state dots, door card, and campus screens
  added; this document created.
