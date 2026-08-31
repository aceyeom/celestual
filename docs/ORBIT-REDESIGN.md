# /berkeley/orbit — the rebuild

The core service screen, taken apart and specified again.

**§0–§10 are the plan, written before any of it was built, and are left exactly
as they were argued — including the parts that were then rejected or replaced.**
§11 is the round of variations the plan was tested against. **§12 is what is
actually in the app**, and where §12 disagrees with an earlier section, §12 is
the build.

> **This is a visual redesign of a live route, and `DESIGN.md` carries a lock
> against exactly that.** The lock exempts changes a human asks for explicitly in
> the current request. This one was asked for explicitly: that the screen looks
> cheap and generic, that the ring asset must go, that the design must be
> interactive and intentional rather than a list, and that the whole surface is
> bound for production. §7 records what the lock's own "ships with an edit here,
> in the same commit" rule then obliges.

> **Second pass.** The first version of this plan made every ping a copy of the
> mark and left the page a list. Both were rejected on review and both rejections
> are recorded in §2.4 rather than deleted.

---

## §0 — The one-paragraph plan

The date comes off, the orrery comes off, and the page stops being a ledger.
Two pings is not a list — it is a **hand**: a small stack of real letters you
are carrying, drawn on `Paper`, which is already the best object in the build
and is currently buried two taps deep. The front card is the one running out and
is fully readable; the others peek above it by their datelines. The two actions
that matter become gestures on the card itself — **pull down to renew**, **drag
away to let go**, with an undo — instead of four taps through a sheet. An empty
slot is a place, in flow, below the hand, and it is the only control that places
a ping. The mark appears exactly once on the whole screen, in the bar.

---

## §1 — What is wrong, verified

Read off the built page and the stylesheet, not inferred.

### 1.1 The date is in the headline slot, and `wall.css` says so

`Core.jsx` renders `TODAY.label` through `<Display size="xl">`. The comment at
`.wl-core-day` states it outright: *"on this screen the date is the headline."*
It is then restated as `TODAY.day` and again as a `PillTag` reading "today".
Three objects, one fact, and it is the least useful fact on the page.

### 1.2 The orrery shares no constant with the mark

| | the mark (`ECL`) | the orrery |
| --- | --- | --- |
| tilt | `-19°` | `0°` (axis-aligned) |
| construction | filled annulus, `fill-rule=evenodd` | stroked arcs |
| weight | 6.4 units, **varying ~3:1** round the circuit | `.wl-track` `0.34`, `.wl-run` `0.58`, constant |

Only the crossing behaviour is shared. Everything that makes the mark look drawn
rather than diagrammed is absent. The body compounds it: a `radialGradient`
sphere with a hard silhouette is a 3D idiom in a build that is otherwise flat and
engraved.

### 1.3 The ember ration is spent twice on this route

`wall.css` declares ember rationed to once per screen. Two rules fire together
here: `.wl-moon.is-near` in the hero and `.wl-mark.is-near .wl-mark-gauge` on the
`@wren.p` row.

### 1.4 The hero restates the list, less precisely

`<Orrery rings={rows}>` encodes one quantity per ping — `run`. The rows already
carry all of it, exactly, in words.

### 1.5 Desktop is unresolved

At 1280×900 content ends near 60% height; `wl-core-left` is bottom-weighted and
`wl-core-right` top-weighted, so an empty diagonal runs through the page. The
primary action is a ~590px chalk lozenge floating mid-canvas.

### 1.6 The primary control exists, a third of the time, to say no

`place a ping` is drawn at full weight regardless of `slot.full`. With both slots
held it opens `<Full>`, whose whole content is "Both slots are taken."

### 1.7 The two most important actions cost four steps each

Renew and let-go are both: tap row → sheet → tap → (for let-go) confirm. Four
interactions to change one date on an object that is right there on the screen.

### 1.8 What is NOT wrong, and must survive

`Paper`, `Reveal`, `Mark` (the constellation), and the whole of `orbit.js` —
`pings()`, `slots()`, `nextOpen()`, `place/renew/release`, the single `NOW`
epoch, the derived-never-stored `days`. None of the model changes.

---

## §2 — The object: a hand of letters

### 2.1 Why letters and not glyphs

The ledger currently shows metadata *about* letters — a constellation, a handle,
a day count — while the actual content, the words somebody wrote to somebody
they could not say it to, sits behind a tap. That is backwards. The letter is
the only thing on this surface anybody has feelings about, and `Paper` already
renders it beautifully.

So the ledger row **is** the letter: `Paper`, at reading size, on the page.

### 2.2 The hand

- **Only held letters stack.** The front card is the one closest to lapsing and
  is fully readable; the others sit above it, offset by `PEEK = 46px`, showing
  their dateline strip — recipient's date on the left, days left on the right.
- **The front card is in normal flow**; the peeked ones are absolutely positioned
  above it, and the hand carries `padding-top: (n-1) × PEEK`. That is what gives
  the stack a real height without measuring anything.
- **z-order runs front-highest.** The prototype shipped this inverted first, and
  the result put the calmest letter over the one running out.
- **Tapping a peeked card promotes it.**

### 2.3 The places

An **empty place** never joins the stack — it has nothing to peek with, and two
overlapping dashed boxes is what the first prototype actually rendered. Places
sit **below the hand, in flow**, with a gap. When nothing is held at all they
take full card height and the cold headline returns above them, so a brand-new
account is a composition rather than a hole.

### 2.4 The countdown, and where the mark went

- The **stamp** in the dateline: `52 DAYS LEFT`, or ember at `≤ NEAR`.
- The **gauge** around the crest constellation — `Mark`'s existing `gauge`
  prop, struck in the paper's own ink, ember when lapsing.
- **The mark appears once**, in the bar, at 20px. A signature that appears eight
  times is a watermark. The per-person work is done by the constellation, which
  is what that system was built for.
- Ember therefore lands on exactly one object per screen and genuinely is
  rationed for the first time on this route.

---

## §3 — The gestures

| intent | today | proposed | why that cost |
| --- | --- | --- | --- |
| read what I wrote | tap → sheet | **already on screen** | it is the content |
| how long is left | read `52 days` | the stamp, and the gauge on the crest | a number to check and a quantity to feel |
| renew | 4 steps | **pull down ≥ 82px, release** | free and reversible → the cheapest gesture |
| let it go | 4 steps | **drag sideways ≥ 120px**, then undo | irreversible → long travel, unused axis, a way back |
| switch letter | scroll | tap the card behind | the whole hand is visible |
| open a mutual | tap → sheet | tap the pair above the hand | it outranks everything in the hand |
| place a ping | dock pill → sheet, or a refusal | tap the empty place | the control exists only when the action does |

**Axis assignment is a safety decision, not a taste one.** Renew and let-go were
first drawn as left/right mirrors, which puts the destructive act one slip from
the safe one. They are now on different axes with different travel.

**Every gesture has a tap path behind it.** Tapping the front card opens the
letter with `renew` and `let it go` as ordinary controls — the sheet that exists
today. Keyboard focus moves through the hand, <kbd>Enter</kbd> opens, and the
actions live in the sheet. Nothing on this surface is reachable only by dragging.

**Implementation notes the prototype forced:**

- The card needs `user-select: none` and `touch-action: none`. Without it the
  browser starts a text selection and the drag never reaches its threshold — the
  first prototype failed exactly this way.
- Pull uses `dy × 0.6` resistance so the card feels held rather than flung.
- Axis locks once at 8px of travel and does not switch mid-drag.
- The leaving card fades only to `0.62`; at `0.35` it turned to mud over the card
  behind it.
- The toast needs a z-index above the stack, which carries `10 + n`.

---

## §4 — What was weighed and dropped

**The circuit ledger** *(the whole of the first pass)* — every ping drawn as the
mark's own band, four states, at row scale. **Dropped:** six logos on one screen
is not a system, it is a page scattered with one glyph. The band survives only at
`/berkeley/join`, where two people assemble it once.

**A carousel** — one letter at full size, swipe between, pips underneath.
**Dropped:** it hides the count. Two is the entire scarcity of this product and a
carousel makes you swipe to discover you have two.

**Both actions on the horizontal axis** — left to let go, right to renew.
**Dropped:** see §3.

**Hiding the letter text** — show only recipient and countdown, since the letters
are private and this gets demoed on a table. **Partly kept:** the front card
clamps to three lines. Enough to know which letter it is; not the whole thing
broadcast to a room. Decision 2 in §8 asks whether that should be one line.

**Arc length as the countdown** *(first pass)* — **dropped on the render:** a
partial arc with no ghost behind it reads as a swoosh, and it double-books a
gesture `/berkeley/join` had already given a meaning.

**One band with pings placed along it** *(first pass)* — **dropped because it
lies:** two pings at 4 and 52 days on one circuit asserts they share a clock.
Each carries its own sixty days.

---

## §5 — Layout and states

### Phone (390)

```
bar          ✦ @you                                   ✕      the mark, once
state        ONE ANSWERED · 2 OF 2 HELD · ONE LAPSING        mono, one line
answer       One looked back.                                only when there is one
             ┌ the mutual, unsealed, 2-line clamp ┐
             └ a sliver of their letter beneath ──┘
             both letters →
hand         ┌ @ezra.k.lin · 52 DAYS LEFT ────────┐          peeked, 46px
             ┌ @wren.p · 4 DAYS LEFT ─────────────┐          front, readable
             │ Fourth floor Moffitt, 3 a.m. …     │
             └────────────────────────────────────┘
places       ┌ an empty place · place one → ──────┐          in flow, if any
```

### Desktop (≥ 900)

The hand is a phone object; a stack of overlapping cards in the middle of 1280px
is a phone screenshot. Desktop **fans** instead: the letters lie side by side at
full width in one centred measure of about 940px, all readable, nothing behind
anything. Gestures become drag-down and drag-away on whichever card the pointer
is over.

### Every state

| ledger | above the hand | the hand | the places |
| --- | --- | --- | --- |
| 0 / 0 | the cold headline | — | two, full height |
| 1 held | — | one letter | one |
| 2 held | — | both, lapsing in front | — |
| 1 mutual, 2 held | the pair, unsealed | both letters | — |
| 2+ mutual | newest pair; rest fold to a line under it | unchanged | — |
| 3rd slot bought | unchanged | a third card | — |
| unaccounted slot | unchanged | a card with no name and no words, so the count never lies | — |
| lapsed to 0 | the cold headline | — | two, full height |
| reduced motion | — | cards move without easing; gestures still work | — |
| keyboard only | — | tab through, <kbd>Enter</kbd> opens, actions in the sheet | — |

---

## §6 — Files

| file | change |
| --- | --- |
| `app/src/wall/art.jsx` | **delete** `Orrery` and its constants (`TILT`, `BODY`, `CORONA`, `RMAX`, `RSTEP`, `arcs`, `Moon`, `cut`). `Mark`, `Ecliptic`, `Sparkle`, `Halftone`, `Bloom`, `Field` untouched. Nothing is added. |
| `app/src/wall/parts.jsx` | `Paper` gains nothing. A new `Hand` owns the stack, the promotion and the pointer handling. |
| `app/src/wall/screens/Core.jsx` | rewrite the page body. `Reveal`, `Standing`, `Place`, `Full` keep their content; `Standing` loses its progress bar to the card's own stamp and gauge. |
| `app/src/wall/wall.css` | **delete** `.wl-orrery*`, `.wl-track`, `.wl-run*`, `.wl-moon*`, `.wl-core-date*`, `.wl-core-sky`, `.wl-open*`. **add** `.wl-hand`, `.wl-place`, `.wl-cue`, the cold state, the desktop fan. |
| `app/src/wall/orbit.js` | **no change.** |
| `docs/DESIGN.md` | required by the lock — §7. |
| `scripts/voice-lint.mjs` | add `app/src/wall/` to the scanned set — §7. |

Net: one component deleted, one added, no new dependency, no new asset, no new
font. Still not one downloaded image in the tree.

---

## §7 — What a production merge actually costs

The brief says this replaces production — "the auth, the email design,
everything". That is a much larger piece of work than this page, and **none of it
is in this plan.**

| found | state today | what it implies |
| --- | --- | --- |
| **Two marks ship** | the app signs with `Ecliptic`; every email signs with a different sigil in `supabase/functions/_shared/mail.ts` — two wings and a body | replace the mail sigil with `eclipticSVG()`, which already returns client-safe markup |
| **Two palettes ship** | mail and production are chocolate→ivory (`theme.js`); the wall is blue-black with one ember | every inline colour literal in five templates is re-derived; an edge function shares no bundle, so there is deliberately no shared token file |
| **The design lock is stale** | `DESIGN.md` states the wall route "is gone" and one system governs every route. Neither is true | the lock's own rule is that a visual change ships with a `DESIGN.md` edit in the same commit |
| **The wall's copy is unlinted** | `voice-lint.mjs` scans `strings.js`, `growth.js`, `card/`, `public/` — not `src/wall/` | one line in the file list, then the existing copy has to pass |
| **Production carries more** | `PingsScreen` has `unaccounted` slots, `CommunityHome`, the bought third slot, `SandboxChip`, `SealedMutual` vs `OpenMutual`, and i18n | six absorptions. The hand takes all of them — a third slot is a third card, an unaccounted slot is a card with no name, a sealed mutual is a card whose seal has not broken — but they are work, not free |

**Recommendation: this page first, alone.**

---

## §8 — Decisions that are not mine

1. **Does the hand overlap, or lie flat?** *Recommend overlap on phone, flat on
   desktop* — what the prototype does. Overlap is what makes it a hand rather
   than a list; a wide screen has room not to need it.
2. **How much of the letter shows on the front card — three lines, one, or
   none?** *Recommend three.* One line reads as a preview row and we are back to
   a list; none makes the page metadata again.
3. **Is drag-to-let-go acceptable for a destructive act?** *Recommend yes, with
   the undo up for eight seconds* and the tap path keeping its explicit confirm.
4. **Does the mutual open in place or stay a sheet?** *Recommend it stays a
   sheet.* `Reveal`'s whole effect is the second card rising 220ms behind the
   first; inlining spends that for nothing.
5. **This page first, or the production merge?** *Recommend this page first*
   (§7).

---

## §9 — Third pass: the subtraction, and the accent

Two passes were about what the screen should BE. This one is about what should
come off it, plus the colour question the brief settled.

### 9.1 Seven things cut, and the rule behind them

Every one of these was a **second statement of a fact already on the screen**.
That is the whole test, and it is worth keeping as a standing rule for this
surface: *if the composition already says it, the caption is noise.*

| cut | why |
| --- | --- |
| **the day rail** | Twelve ticks and "day 56 of sixty" over a card whose stamp reads `4 DAYS LEFT`. One number, drawn twice, and the drawn one was less precise. |
| **the state line** | `one answered · 2 of 2 held · one lapsing` — all three are visible in the cards directly beneath it. |
| **two kickers** | Handle and date under a headline, above a card carrying the same handle and the same date. Cut on the reveal and on the open letter. |
| **the ghost preview** | Step two's card faded under step one's field. Made the composer read as a form with a disabled section rather than one question at a time. |
| **"0 of 2 held"** | Over a headline reading *Two names. That is all you get.* and two visibly empty places. |
| **the second privacy line** | The empty place already says what it is for. |
| **the reveal's `close`** | A full-width button under a sheet whose bar already carries a ✕. Two controls, one job, and the big one was the less obvious. |

### 9.2 The accent: ice, and no orange

Ember is gone. The lit thing is now **ice** (`#A9C8DA` on glass, `#2E5468` struck
into paper) — a tonal cousin of the blue-black ground rather than a second hue.

**The state still reads without any colour at all.** A lapsing letter's stamp is
*struck into* the paper (filled, reversed out) where every other stamp is
outlined. That is form, not hue, so the "light only" setting is a genuine option
and nobody loses the signal to colour blindness.

### 9.3 Everything else is a control, not an opinion

The published console exposes accent (ice / light / gold / custom picker), the
letters' material, glass blur and fill, the ground's brightness and drift speed,
corner radius, density, and the display face. State persists to `localStorage`.

This is a review tool, not a shipping surface — but the tokens it drives are the
tokens the implementation should use, which is why it is worth keeping: the
argument about radius or blur is settled by moving a slider, not in a comment.

### 9.4 Two findings from building it

- **The hand needs opaque letters.** The all-glass fork ("smoke") was built and
  looked good until the hand stacked: blur alone does not hide the card behind,
  so the back letter's text ghosts through the front one. Glass letters would
  force the hand to become a flat list. Paper stays.
- **A page-wide light is what makes glass worth having.** Glass over a flat fill
  is a translucency effect; glass over a moving light is a material. The ground
  is one fullscreen fragment shader, hand-written — the CSP admits cdnjs and
  jsdelivr, but neither is reachable from the build environment, so a library
  would have shipped unverified.

### 9.5 On external component libraries

21st.dev cannot be used in this context: it is not an allowed script host for a
published artifact, and its components are React + Tailwind + framer-motion. The
interaction *patterns* are implemented directly instead — pointer-tracked
spotlight, a magnetic primary control, a border that catches the light on hover,
spring-weighted motion. The one external asset that genuinely loads is type, and
the display face is a console control rather than a decision made quietly.

---

## §10 — Fourth pass: composition

Colour was settled in §9. This pass is layout only.

### 10.1 A sealed letter is drawn sealed

The home screen stacked **three full cream cards** — the answered pair and both
unanswered letters, all open, all at the same weight. Three near-identical beige
blocks down a phone screen, which is the "crowded page of just letters" the brief
named.

The fix is not smaller cards. It is that **a letter nobody has answered has not
been read by anybody, including in a sense by you** — so it is not shown open:

| state | drawn as |
| --- | --- |
| answered | one open card, deckled, full presence, its opening line set larger |
| still sealed | a **spine** — a slim sheet edge-on carrying the constellation, the handle, and the days |
| an empty place | a blank on a form (§10.2) |

One thing to read per screen, two quiet objects beneath it. The label over them
is `still sealed`, once, for the pair.

### 10.2 The two places, rebuilt

They were **two identical dashed rectangles carrying identical text** — *an empty
place / someone you want to hear back from* — printed twice, which is the ugliest
thing that was left on the surface.

They are now **two numbered blanks on a form**: a pressed recess, a numeral
(`one`, `two`), an `@`, and a hairline rule where the handle would be written.

- **Only the first one speaks.** It carries `name someone` and the arrow. The
  second is a blank, which is the honest thing for it to be, and the copy stops
  being duplicated.
- **Numbering is not decoration.** Two is the entire scarcity of this product, so
  counting them is the fact.
- A recess reads as *somewhere a thing goes*. A dashed rectangle reads as an
  upload zone.

### 10.3 The paper has an edge now

`.card` split into a content layer and a `.sheet` background layer, and the sheet
alone takes an SVG `feTurbulence` → `feDisplacementMap` filter. The edge wanders
the way a deckle does; the type on top stays crisp because it is not inside the
filtered element.

This is the single change that stopped the letters reading as rounded `div`s.
Console control: **paper edge · deckle / clean**.

### 10.4 The letter's opening line

The first sentence is set at 17px and separated; the rest runs at 14.5px. A
letter is not a paragraph in a box — it has an opening. `card(p, { lede: true })`.

### 10.5 The door loses the mark, and the account it never had

The 92px ecliptic came off `/berkeley/join` — the screen is type, one field, two
controls, and the ground's light behind it. The bar on that screen also stopped
saying `@you`: **nobody has an account at the door.** It reads `celestual` until
the address is proven.

### 10.6 On importing assets

Nothing external loads into a published artifact except type. cdnjs, jsdelivr and
the Tailwind CDN are permitted by the CSP but unreachable from the build
environment, and 21st.dev is not a permitted host at all. So every "asset" here
is generated: the deckle, the grain, the constellations, the mark, the ground.

**If real assets are wanted** — an illustration, a photograph, a texture scan —
the only path is to hand over the file and have it embedded as a data URI. That
is a real option and a good one for the paper stock in particular; a scanned
sheet would beat a procedural grain. It needs the file, not a link.

---

## §11 — Fifth pass: six places, and the two that were kept

The two places had been through three shapes and were still the weakest objects
on the surface, so instead of a fourth guess the whole range was drawn at once —
six of them, conservative to wild, in one artifact — and the pick was made by
looking rather than by arguing.

| # | the idea | what it actually was |
| --- | --- | --- |
| 01 | **the ruled blank** | no box at all: an `@`, a placeholder, and a hairline rule where the handle gets written |
| 02 | the aperture | a ring that opens on approach, the mark's own geometry as a shutter |
| 03 | **the shadow** | a letter's cast shadow with no letter above it; paper falls into it on approach |
| 04 | the socket | a pressed recess with a numeral, the form-blank idea taken literally |
| 05 | the constellation gap | a missing star in the field, drawn as the space between two that are there |
| 06 | the drawn frame | a hairline rectangle that draws itself edge by edge on hover |

**01 and 03 were chosen, and they are one object rather than two.** The shadow is
the resting state — a place is the absence of a letter, so it is drawn as what a
letter leaves behind. Approaching it drops paper into that shadow (03), and the
ruled blank (01) is what is written on the paper once it lands.

That composite is `Vacant` in `screens/Core.jsx` and `.wl-vacant*` in `wall.css`.

What it costs to be one object rather than two: nothing on the surface is a box
with dashes round it, the copy is not printed twice, and the interaction is a
single continuous idea (absence → paper → a line to write on) instead of a hover
state bolted to a static tile.

**Discarded, and why:** 02 and 06 animate a frame that is not there yet, which
draws attention to the container instead of the act; 04 numbers the places, and
numbering two things is the surest way to make somebody ask what the third one
costs; 05 was beautiful and unreadable — a gap in a starfield is not a control.

---

## §12 — What is actually in the app

Everything below is in `app/src/wall/`, verified against the running route at
390×844, 896×414, 1024×760 and 1280×900 with a driven browser: every gesture,
every sheet, and the keyboard path.

### 12.1 The composition

```
  the bar        @you, the mark once, and the way out
  the sky        the starfield, and nothing else
  the leaf       one letter, hanging off the sill
  the sill       @handle · state · the count
  the pips       where you are in what you hold
```

- **One letter at a time, laid sideways.** `Spread` is a track of full-width
  slides moved by transform. Sideways navigates; **down and off** releases; a tap
  opens; a tap on the count renews.
- **No headline.** Nothing on the surface editorialises, and there is no rule
  that would produce a Bodoni sentence here. The objects carry the state.
- **The leaf carries the writing and nothing else.** Handle, state and clock are
  on the sill *under* it, in mono. That separation is the composition.
- **The card hangs from the bottom of the spread**, so it always sits the same
  short distance above its own caption and the two read as one object. Cards
  grow *upward* into the sky, which is the empty half anyway. Centred instead,
  a short letter sat two hundred pixels from the sill that described it.
- **The leaf is sized by what is written on it**, between a floor
  (`min(44vh, 23rem)`) and the height of the screen — so the height of the card
  is a readout of how much somebody said, and no two slides are the same shape.
- **The writing is set like the subject it is**: 19px, opening line 23px. At the
  build's body size, three sentences were a small grey block adrift on a large
  cream card.

### 12.2 Two places, and the surface never says otherwise

A free place is one more position in the spread, reached by moving to it. When
both places are held **it does not exist** — no slide, no pip, no sentence.
`slot.open` is derived from the cap, so the vacant slide cannot be rendered in a
state that does not have one. Nothing in `Core.jsx`, `wall.css` or the `Full`
sheet refers, in any state, to a place beyond these two.

> **For whoever does the production merge.** §5 and §7 note that production
> carries a bought third slot and that the spread absorbs it — a slot is a slide,
> however it was come by. That is a note about the data model. **The surface must
> stay silent about it:** no count that implies a ceiling to raise, no locked
> position, no sentence offering one. A slot that exists is a slide; a slot that
> does not exist is nothing at all.

### 12.3 The count is the only picture of time

The gauge that used to ring a crest on the paper now lives **inside the count
chip**, as a fill showing how much of the sixty is left. One object carries the
figure, the proportion and the action that resets it. Tapping it winds the number
up and runs the fill out to the edge on the same curve.

When a letter is lapsing the fill is the accent — and it is a *sliver*, because
what makes it urgent is how little of the chip is still filled. It is the one
saturated object on the screen.

A pair that has closed has no clock, so on that row the control in the count's
place opens the pair instead.

### 12.4 The seven things that came off

| gone | why |
| --- | --- |
| the orrery (`art.jsx`, 237 lines) | three axis-aligned ellipses under a mark built from a filled band at −19°; it shared no constant with the logo and encoded three numbers the rows already carried, in words, more precisely |
| the date as headline | `wall.css` said "on this screen the date is the headline" in its own comment; a ledger's headline is not a date |
| the day-count rail | twelve ticks and "day 56 of sixty" under a card whose stamp already carried that number |
| the crest on the letter | the sill names the same handle and counts the same days forty pixels lower |
| `2 of 2` under the pips | a closed pair is a pip but not a slot, so the row could show three marks beside the figure two and be right twice in two different units |
| the corner mark on `/berkeley/join` | it stood 180px above the same mark drawn 17× larger, assembling itself, as the subject of the page |
| orange | `--ember` is now `var(--accent)`, and the accent is ice |

### 12.5 The accent, and how to change it

```css
--accent:      #74C7DE;   /* ice */
--accent-soft: rgba(116, 199, 222, 0.14);
```

Every coloured thing in the build reads `--accent`. No hue is named anywhere
else, and `--ember`/`--ember-soft` are kept as aliases so nothing that already
read them had to change. **Trying a different accent is editing those two lines.**

### 12.6 Every gesture has a tap path, and every tap path has a key

| | pointer | tap | key |
| --- | --- | --- | --- |
| move through what you hold | swipe sideways | a pip | `←` `→` |
| open a letter | — | the leaf | `Enter` |
| sixty more days | — | the count | in the sheet |
| let one go | drag down and off | the sheet's `let it go` | `Backspace` |
| name someone | — | the free place | `Enter` on it |

The axis locks once at seven pixels and does not switch mid-drag, so the
destructive gesture cannot be entered on the way to the safe one. The slide you
are on is the single tab stop, and it takes the ring.

### 12.7 The position is a letter, not a number

`pings()` sorts by what is closest to running out, so renewing moves a letter in
the order. Held as an index, the position made the letter you just acted on
vanish sideways and put a different one under your finger — caught by the driven
browser, not by reading. The position is now the row's **id**; the track glides
to wherever the letter went, and falls back to the index only when the id is gone
(you let it go), so whatever moves into that position is what you are looking at.

### 12.8 Four breakpoints, one composition

The screen is one flexible column at every size — the desktop grid that used to
split it into two columns is deleted, not overridden.

| | |
| --- | --- |
| phone | full-bleed slides, the leaf hanging off the sill |
| ≥900px | the same column, capped at a 30rem measure and centred; the room goes *around* it |
| sideways (≤560px tall) | keeps `100dvh` — under the shared `min-height: auto` the spread grew to nothing and the letter disappeared — and caps the measure at 40rem so a letter is not set to a ninety-character line |
| ≤359px | the gutter narrows and everything follows it |

`--pad` is now declared beside the padding that sets it, at every breakpoint, so
the spread's full-bleed cancel is exact instead of a hard-coded 20px that was
right on none of them.

### 12.9 Faults found by driving the real route

Four things that reading the diff would not have caught:

1. **`.wl-ground` collided** with the full-viewport backdrop layer of the same
   name, so the sill was `position: fixed; inset: 0` behind the top bar. Renamed
   `.wl-sill`.
2. **`.wl-sheet` collided** with the modal drawer, so every letter card inherited
   a bottom-sheet's gradient, radius and rise animation. Renamed `.wl-leaf`.
3. **`.wl-track`'s `height: 100%` silently did nothing** — the spread is a flex
   item with an auto height, so the percentage had nothing to resolve against and
   the track collapsed to one card, pinning the letter to the top of an empty
   screen. The track is now laid over the spread with `inset: 0`.
4. **`.wl-say` was collateral damage** from removing the old core block, taking
   the quiet-sentence voice off four sentences across the product. Restored, with
   its argument, as its own block.
