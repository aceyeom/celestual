# /berkeley/orbit — the rebuild (the plan, before any of it is built)

The core service screen, taken apart and specified again. Nothing in this file
has been implemented; it exists so the argument can be had before the diff, and
so that whoever writes the diff is not re-deciding anything at 2am.

The visual case, with every figure rendered live from `art.jsx`'s own
constants, is published separately as an artifact. This file is the buildable
half: what changes, in which file, with which numbers.

> **This is a visual redesign of a live route, and `DESIGN.md` carries a lock
> against exactly that.** The lock exempts changes a human asks for explicitly
> in the current request. This one was asked for explicitly — the brief was that
> the screen "looks absolutely shit… amateur… generic", that the ring asset must
> go or be rebuilt to match the mark, and that the whole surface is bound for
> production. That is the exemption, and §7 below records what the lock's own
> "ships with an edit here, in the same commit" rule then obliges.

---

## §0 — The one-paragraph plan

The date comes off. The orrery comes off. Every ping on the ledger becomes **one
object — the mark's own band, drawn from your node** — where *how much of the
circuit is drawn* means *how many of the two of you have placed*, which is the
meaning `/berkeley/join` already assigns to that gesture. A mutual is the circuit
closed with the star lit inside it, which is the logo, whole, earned rather than
printed. An open slot is the same circuit undrawn, and it is the control that
places a ping. The page becomes one ranged-left measure: a sentence in the
display face, the answer, the ledger, the capacity. The countdown stays in the
mono column where a number belongs, because the object's job is state and type's
job is time, and the current screen's worst structural fault is that both were
doing both.

---

## §1 — What is wrong, verified

Not impressions. Each of these was read off the built page or the stylesheet.

### 1.1 The date is in the headline slot, and `wall.css` says so

`Core.jsx` renders `TODAY.label` through `<Display size="xl">`. The stylesheet
comment at `.wl-core-day` states it outright:

> The date is set at the WALL'S HEADLINE SIZE — `Display size="xl"`, the same
> ramp as "Someone here wrote something they never sent." — because on this
> screen the date is the headline.

It is then restated as `TODAY.day` ("TUESDAY") and again as a `PillTag` reading
"today". Three objects, one fact, and the fact is not why anybody opened the
page. This is the "why is there a calendar" in the brief, and it is not a
misreading — the screen genuinely gives its headline to a date.

### 1.2 The orrery shares no constant with the mark

| | the mark (`ECL`) | the orrery |
| --- | --- | --- |
| tilt | `-19°` | `0°` (axis-aligned ellipses) |
| construction | filled annulus, two ellipses, `fill-rule=evenodd` | stroked arcs |
| weight | `w: 3.2` half-width → 6.4 units, **varying ~3:1** round the circuit | `.wl-track` `0.34`, `.wl-run` `0.58`, **constant** |
| crossing | band passes behind the star at the top, in front at the bottom | rings split at the long axis (this part is right) |

Only the last row is shared. Everything that makes the mark look drawn rather
than diagrammed — the varying width, the lean, the fill — is absent. Three
concentric ellipses with dots on them at uniform hairline weight is the most
reproduced graphic on the web; that is the "one or two curves in a minute" read,
and it is fair.

The body compounds it: a `radialGradient` sphere with a hard silhouette and a
rim arc is a 3D idiom sitting in a build that is otherwise flat, engraved and
high-contrast.

### 1.3 The ember ration is spent twice on this route

`wall.css` opens by declaring ember rationed to once per screen. On
`/berkeley/orbit` two rules fire simultaneously:

- `.wl-moon.is-near` — the lapsing moon in the hero
- `.wl-mark.is-near .wl-mark-gauge` — the gauge on the `@wren.p` row

Two saturated objects, forty pixels apart, encoding the same fact.

### 1.4 The hero restates the list, less precisely

`<Orrery rings={rows}>` encodes exactly one quantity per ping: `run`, the
fraction of sixty days spent. The rows underneath already carry all of it, in
words, exactly: `4 days`, `52 days`. The hero spends roughly a third of a phone
screen to say the column beneath it again, worse.

### 1.5 Desktop is unresolved

At 1280×900 the content ends near 60% height. `wl-core-left` is bottom-weighted
(hero, then the date block), `wl-core-right` is top-weighted (sections), and
they share no baseline, so an empty diagonal runs through the page. The primary
action renders as a ~590px chalk lozenge floating mid-canvas.

### 1.6 The primary control exists, a third of the time, to say no

`place a ping` is drawn at full weight regardless of `slot.full`. When both
slots are held it opens `<Full>`, whose entire content is "Both slots are
taken." The loudest object on the page is, in that state, a door to a refusal.

### 1.7 What is NOT wrong, and must survive

- **`Paper`** (the cream card, dateline, crest, EB Garamond prose). The strongest
  object in the build. Untouched.
- **`Reveal`** — two Papers, together, the second rising 220ms behind the first.
  The best screen in the tree. Untouched.
- **`Join`'s `Circuit`** — the mark taken apart into two halves with the two
  people named in cuts in the band. This is the asset §2 extracts.
- **`Mark`** (the handle's constellation). The identity system the whole build
  runs on. Kept, and moved *inside* the circuit.
- **The ledger model in `orbit.js`.** `pings()`, `slots()`, `nextOpen()`,
  `place/renew/release`, the single `NOW` epoch, the derived-never-stored `days`.
  All of it is correct and none of it changes.

---

## §2 — The object

### 2.1 What it is

One component, `Circuit`, drawn entirely from constants that already exist in
`app/src/wall/art.jsx`:

```
ringPath()          the band, at its true varying width
ringPath(gutter)    the dilated band, for the star's notch
starPath(ECL)       the four-point star, at full size
eclipticHalves()    the two halves of the circuit and the two nodes
```

Layer order is the mark's own and is never reordered: **the far half, then what
stands at the centre, then the near half over the top of it.** That third layer
is the whole reason the mark reads as one object rather than a starburst on a
hoop, and it is why `Circuit` cannot be assembled out of two stroked arcs.

A partial circuit is produced the way `Ecliptic`'s `sweep` and `Join`'s figure
already produce one: a 24-unit stroke along that half's own arc inside a mask,
`pathLength="100"`, dash driven to 0 or 100. The band therefore arrives at its
real varying width; it is never approximated by a stroke.

### 2.2 The four states

| state | drawn | at the centre | when |
| --- | --- | --- | --- |
| `closed` | both halves | `starPath(ECL)`, lit, notched by the near band | a mutual |
| `open` | your half only; theirs at 5.5% | the handle's constellation | standing |
| `open` + `near` | as above, in ember | the constellation, in ember | ≤ `NEAR` days |
| `empty` | neither half; the whole circuit at 5.5% | nothing | an open slot |

**They differ by form before they differ by colour.** `DESIGN.md` §2 requires
this: someone who cannot see colour reads the four states exactly as well as
someone who can, because *how much of the circuit is drawn* carries the state and
ember only ever intensifies one of them.

### 2.3 Sizes, tested

| role | px | constellation inside |
| --- | --- | --- |
| hero (the mutual, or a promoted slot) | 132 phone / 176 desktop | n/a (the star is there) |
| promoted open slot | 120 | none |
| ledger row | **64** | yes |
| the bar's brand mark | 22 | none, `flat` (no ghost, no bloom) |

64 is not a taste number. At 56 the constellation inside the band crowds against
the near edge; at 64 it clears. If the row height cannot carry 64, drop the
constellation from the row rather than shrinking it — see §8, decision 3.

### 2.4 What was rejected, and why

Four hero directions were drawn and screenshotted before this one was kept.
Recorded so the ground is not walked twice.

**A · nested bands.** Rebuild the orrery, every ring as `ringPath()` at its own
radius. *Rejected:* `ECL`'s `w`, `bias` and `twist` are tuned for one ring at one
size. Nested copies either hold `w` and go fat at small radii, or scale it and
collapse back into hairlines. And three tilted bands is still "rings around a
planet" — it fixes the drawing without fixing the idea.

**B · one band, pings placed along it.** *Rejected because it lies.* Two pings at
4 and 52 days would sit at very different points on one circuit, which asserts
they share a clock. They do not: each ping carries its own sixty days. A diagram
that misstates the mechanic is worse than no diagram — and it is the same class
of error `Orrery`'s own header says was fixed once already.

**C · arc length = days remaining.** Drawn: your half retreats toward your node
as the sixty days run out. *Rejected on the render.* With no ghost half behind
it a partial arc reads as a swoosh, not as half a circuit. And it overloads one
gesture with two meanings — *who has placed* on `/berkeley/join`, *how long is
left* here — which is exactly what makes a system feel arbitrary.

**D · the slots as the permanent hero.** *Kept in part.* It is the right
composition when there is no mutual, and it is what fills the empty state. It is
not the always-on hero: when a mutual exists, nothing on this page outranks it.

---

## §3 — The layout

### 3.1 Reading order

What a person opens this page to find out, in order:

1. **did anyone answer** — the only thing that is news
2. **what am I carrying** — the only thing that needs an action
3. **can I place another** — the only thing that is an offer

Nothing above (1). The date was above all three.

### 3.2 Phone (390)

```
bar          ✦ @you                                    ✕
             ↕ 36
headline     One looked          Bodoni, 40px/1.02, ranged left, ≤3 lines
             back.
             ↕ 40
THE ANSWER   [circuit 132]  @june.hh                   ranged left, gap 30
                            you were both looking
                            open →
             ↕ 46
section      STANDING                          2 of 2  mono 11, hairline under
row          [circuit 64]  @wren.p             4 days  ember — the one accent
                           renew it, or let it go
row          [circuit 64]  @ezra.k.lin        52 days
                           nothing shows until they do
             ↕ 22
foot         both slots are held · the next opens in 4 days, or the
             moment you let one go
```

- **Ranged left, in a centred block** — `DESIGN.md` §1 rule 4, which this route
  currently breaks by centring the answer block inside an otherwise left-ranged
  page.
- The page takes its **natural height**. It does not stretch the foot to the
  bottom of the viewport; the current build's `wl-push` + fixed dock is what
  produces the hole between the last row and the CTA.

### 3.3 Desktop (≥ 900)

**One measure, 660px, optically centred.** Not two columns.

A two-column version was drawn (hero left, ledger right, vertically centred as
one band) and dropped: the ledger column is always much shorter than the hero
column, so the pair floats and the empty diagonal survives the redesign. One
measure removes it at every width and needs no second layout to maintain.

The only desktop deltas: headline to 60px, hero circuit to 176, row padding up
one step. Same DOM, same order.

### 3.4 The dock

**The white lozenge goes.** When a slot is free, the last object on the page *is*
the open circuit — tapping it places a ping, so the affordance and the offer are
one object. When both are held there is no control at all, only the line saying
when the next opens.

Consequence, and it is the point: **the page can no longer offer an action it
cannot perform.** `<Full>` stops being a door the UI pushes people through. The
route `/berkeley/orbit/place` and the sheet stay — a deep link has to land
somewhere — but nothing on the surface leads to it while slots are full.

Cost: with a long ledger the primary action leaves the thumb arc. Mitigated by
the open slot being pinned to the foot and being the only thing there. Flagged,
not hidden.

---

## §4 — Stress tests

Every ledger state the prototype and production can produce. Anything needing a
special case is a design that is not finished.

| ledger | headline | hero register | foot |
| --- | --- | --- | --- |
| 0 / 0 | Two names. That is all you get. | two `empty` circuits at 120, promoted | both are the control |
| 0 mutual, 1 held | One is standing. | the held circuit and the empty one, side by side | the empty circuit |
| 0 mutual, 2 held | Two are standing. | slots promoted; no answer register | next slot opens in *n* days |
| 1 mutual, 2 held | One looked back. | the closed circuit, ranged left with its name | next slot opens in *n* days |
| 2+ mutual | Two looked back. | first at hero scale, the rest as rows beneath | unchanged |
| lapsed to 0 | Nothing is standing. | two `empty` circuits — identical to a new account | both are the control |
| long handle | — | row handle ellipsises (`wl-row-handle` already does); the circuit never resizes | — |
| reduced motion | — | no breathe, no draw-on; the star is simply lit | — |
| no colour vision | — | ember carries nothing colour alone carries; lapsing is also the only row whose count is chalk | — |
| 320px phone | drops one step on the ramp | hero circuit 108; rows unchanged | — |

**One rule covers the promotions:** when there is no mutual, the slot register
takes the hero scale. That is what stops the empty state being a headline over a
hole, and it is why 0/0 and lapsed-to-0 need no separate design.

---

## §5 — Files

| file | change |
| --- | --- |
| `app/src/wall/art.jsx` | **add** `Circuit`. **delete** `Orrery` (and its `TILT`/`BODY`/`CORONA`/`RMAX`/`RSTEP`, `arcs`, `Moon`, `cut`). `Halftone`, `Bloom`, `Sparkle`, `Mark`, `Field`, `Ecliptic` untouched. |
| `app/src/wall/screens/Core.jsx` | rewrite the page body. The four sheets (`Reveal`, `Standing`, `Place`, `Full`) keep their content; `Standing`'s progress bar is restated as a `Circuit` + the mono line. |
| `app/src/wall/wall.css` | **delete** `.wl-orrery*`, `.wl-track`, `.wl-run*`, `.wl-moon*`, `.wl-core-date*`, `.wl-core-sky`, `.wl-open*`. **add** `.wl-ci*`, the answer block, the row at 64, the foot. The `wl-core` grid at ≥900 collapses to one measure. |
| `app/src/wall/seed.js` | `TODAY` stays — the sheets date their cards off it via `orbit.js NOW`. Only its render on the page goes. |
| `app/src/wall/orbit.js` | **no change.** |
| `docs/DESIGN.md` | required by the lock — see §7. |
| `scripts/voice-lint.mjs` | add `app/src/wall/` to the scanned set — see §7. |

Bundle: `Orbit`'s removal is roughly a wash against `Circuit`; no new dependency,
no new asset, no new font. There is still not one downloaded image in the tree.

---

## §6 — Copy

Every headline below is **unverified against `VOICE.md`**, because
`voice-lint.mjs` does not currently scan `src/wall/` (§7). They are drafts, and
§8 decision 4 asks for a voice pass before implementation rather than per-string.

| state | draft |
| --- | --- |
| 1 mutual | One looked back. |
| 2+ mutual | Two looked back. |
| 0 mutual, held | One is standing. / Two are standing. |
| 0 / 0 | Two names. That is all you get. |
| lapsed to 0 | Nothing is standing. |
| sub, empty | sixty days each · renewing is free |
| foot, full | both slots are held · the next opens in *n* days, or the moment you let one go |

Note the register conflict this exposes: `VOICE.md` §3 mandates lowercase product
copy and names Cormorant Garamond / Jost / Courier Prime, while the wall ships
sentence-case `Display` headings ("You were both looking.") in Bodoni Moda / EB
Garamond / Inter Tight / Geist Mono. The docs describe the Bindery; the wall is a
second system. Settling that is §7's job, not a per-headline decision.

---

## §7 — What a production merge actually costs

The brief says this replaces production — "the auth, the email design,
everything." That is a much larger piece of work than this page, and it is named
here rather than absorbed silently. **None of it is in this plan.**

| found | state today | what it implies |
| --- | --- | --- |
| **Two marks ship** | the app signs with `Ecliptic` (ring + star); every email signs with a different sigil in `supabase/functions/_shared/mail.ts` — two four-point wings and a body | if this brand wins, the mail sigil is replaced by `eclipticSVG()`, which already returns client-safe markup with no host and no round trip |
| **Two palettes ship** | mail and production are chocolate→ivory (`theme.js`); the wall is blue-black with one ember | every inline colour literal in the five templates is re-derived. There is deliberately no shared token file across that boundary (an edge function shares no bundle) |
| **The design lock is stale** | `DESIGN.md` states the wall route "is gone" and that one system governs every route. It is not gone, and two systems govern | the lock's own rule is that a visual change ships with an edit to `DESIGN.md` in the same commit. That edit is larger than this page |
| **The wall's copy is unlinted** | `voice-lint.mjs` scans `strings.js`, `growth.js`, `card/`, `public/` — not `src/wall/` | one line in the file list; then the wall's existing copy has to actually pass |
| **Production carries more than the prototype** | `PingsScreen` has `unaccounted` slots, `CommunityHome`, the bought third slot (`EmptySlotCard paywall`), `SandboxChip`, `SealedMutual` vs `OpenMutual`, and i18n. `orbit.js` has none of these | six absorptions. The circuit system takes all of them cleanly — a third slot is a third circuit, an unaccounted slot is a circuit with no handle, a sealed mutual is a closed circuit whose star has not lit yet — but they are work, not free |

**Recommendation: this page first, alone.** It is the proof the system holds. The
mail templates and the auth screens are each their own plan, and each touches
something a bad merge takes down for people who are not looking at a screen.

---

## §8 — Decisions that are not mine

Everything above will be built as specified. These five change the shape of the
work.

1. **Does the date come off entirely, or does a dateline survive somewhere
   quiet?** *Recommend: entirely.* Every card in every sheet already carries its
   own dateline off `orbit.js NOW`, which is where a date belongs. Nothing on the
   ledger needs today's.

2. **Is the chalk pill retired on this route only, or across the wall?**
   *Recommend: this route only, for now.* The wall's `write one` is the same
   component; changing it here alone is an inconsistency worth introducing
   deliberately rather than pretending away. Say so and it comes off both.

3. **Does the row circuit keep the handle's constellation inside it?**
   *Recommend: yes, at 64px rows.* It is the identity system the build runs on.
   Below ~60px it crowds, which is an argument for the row height, not against
   the constellation.

4. **Voice pass before or after implementation?** *Recommend: before.* The
   headlines are the one part of this that is not geometry, and `VOICE.md` §3 and
   the wall's sentence-case display are in open conflict (§6). Settle it once.

5. **Is the production merge in scope for the next run, or is this page first?**
   *Recommend: this page first* (§7).
