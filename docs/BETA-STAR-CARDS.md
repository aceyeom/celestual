# `/beta` — the star & card system

A prototype of the card design, built from the written plan (*Celestual — The
Star & Card System*, August 2026). It lives at **`celestual.us/beta`** and in
`app/src/beta/`.

**It does not touch production.** The fork happens in `main.jsx`, before
`App.jsx`'s router ever sees the path, so the prototype is mounted *beside* the
real app rather than inside it. No ping RPC, no Supabase table, no edge
function, no `celestual:v2` storage key, and no production screen is read or
written by anything in `app/src/beta/`. Deleting the directory and two lines of
`main.jsx` removes it completely.

---

## 1 · The one idea

The plan asks for a card attached to a ping, and asks how a ping becomes one.

The answer was already in the renderer. `app/src/sky/body.js` exists because at
the end of a dive a star stops being a point of light and becomes a **surface**
— a limb-darkened, granulating photosphere, drawn opaque so it occludes the
field behind it, because a body has a horizon. It is the single most expensive
pass in the engine and it currently pays for nothing but a nice arrival.

> **The card is that surface.** The photograph is what the star turns out to be
> made of when you get close enough to see it.

Everything else follows:

- The card is a **circle**, because a resolved body is.
- A ping and its card are **one object at two distances**, not two things joined
  by a transition.
- Opening a card is an **approach**, and the product already knows how to fly
  one.
- A card with **no photograph is still a star** — the disc shows the
  photosphere. This is what lets the photo be optional without leaving a hole in
  the sky.

---

## 2 · The card

One fixed layout, at every size it ever appears at. The user chooses content and
never design (plan §3.4) — there is no crop, no filter, no font, no size
control.

```
              · · · · · · ·              corona, in the card's own light
          ╭───────────────────╮
        ╱      @ H A N D L E    ╲        the rim label: mono, tracked,
      │                           │      set on the arc — the metadata
      │      T H E                │      register at the greatest
      │      S U R F A C E        │      distance a circle allows from
      │                           │      the words
        ╲                       ╱        limb darkening, per channel
          ╰───────────────────╯

        the small thing you                the words: Instrument Serif
          still remember                   italic, one measure, 20 max

           AUG 2 · SEALED                  the tick: mono, micro
```

Three registers, cast exactly as `docs/DESIGN.md` §3 casts them, and not one
size off the ladder.

**The parts, and why each is there** (`app/src/beta/Disc.jsx`):

| Part | Why |
| --- | --- |
| Limb darkening, per channel | You look through more atmosphere at a shallower angle near the edge, so the rim is dimmer *and* redder. It is the one cue that turns a circle into a sphere; without it the card is a coin. |
| Granulation, over everything | Convection cells, and simultaneously the "same grain, every card" the plan asks for. A card with a photo and one without are the same object wearing two surfaces. |
| The corona | Light past the limb, seating the disc *in* the field instead of on top of it. |
| The rim label | An astronomical plate is labelled around its edge. It also solves a layout problem: the handle is metadata and wants to be nowhere near the words. Hidden below ~120px, where curved type stops being legible and becomes decoration. |
| An opaque base | A body occludes. Written with alpha alone the disc let the galaxy shine through and read as a soap bubble. |

### The light a card burns with

The plan bans relationship labels outright (§1.3 — "no dropdown, no category,
the ambiguity is the product"), so the tint cannot come from a picker the way
production's category tints do.

It is **measured off the photograph** instead. A star's colour is its
temperature, and the card is the star's surface, so the surface decides. The
measurement is luminance-weighted — squared, so the light source in the frame
dominates and the shadows barely count — because a flat average over a night
photograph is an average of mostly darkness, and a warm dorm ceiling and a cold
street through a window both come back at almost exactly neutral. Weighting by
what is actually lit is what makes the answer mean something.

The result maps between the product's **existing two stars**: warm rooms burn
amber, cold ones rose. No third hue enters, no category is stored, and nobody is
asked anything.

---

## 3 · The approach (star → card)

`app/src/beta/Sky.jsx`. The card is hung on `cam.focus`, the same variable the
engine uses to decide whether a star has resolved:

| `cam.focus` | What you see |
| --- | --- |
| 0.00 → 0.52 | a point of light. Nothing of the card exists. |
| 0.52 → 0.99 | the disc opens out of the point — blurred at first, the way an unresolved body is, sharpening as it grows, travelling from where the star hangs toward the frame it will hold. |
| 1.00 | resolved. The words rise. |

Every one of those is read off the camera **on the frame it is true**, not
scheduled against a guess at how long the flight takes. `screens.jsx` learned
this the hard way and left the note: *"a dive's bank breathes with how far the
star is, so no single delay was ever going to be right."*

Closing runs the identical curve backwards, because it *is* the identical curve:
`clearFocus()` releases the dive, `focus` decays, and the card contracts into
the point of light it grew out of. **There is no exit animation in the file.**

The send-off is the same gesture at speed: the finished card appears once,
whole, then shrinks to a point that the galaxy's own send-off flight carries
into the disk (plan §3.5). The DOM shrink and the sky's flight share one origin,
so there is no seam between them.

---

## 4 · The mutual spread

`app/src/beta/Spread.jsx`. The engine's match mode already does the physics: a
decaying Keplerian inspiral whose angular speed rises as the pair closes, tidal
streams bridging them, a merger flash that sends a light echo out through the
gas, settling into a **binary** — two distinct stars, amber and rose, in an
orbit that does not decay. None of that is re-animated here.

What the spread adds is the moment after: the two stars resolve, **together**,
into the two cards. The plan's strictest sentence is that both unseal in the
same instant (§3), because the whole ethical architecture is that neither person
moved second.

**The unseal is driven by the engine's match clock, not a timer.** The sky
advances its own time per frame and clamps `dt` at 50 ms, so a device drawing at
ten frames a second plays the inspiral at a fraction of wall speed. A
`setTimeout` opened both cards while the stars were still falling toward each
other and the merger flash then went off over the top of an already-revealed
spread, washing it white. The engine knows what time it is in the match it is
playing; the spread asks it.

The Instagram DM is the loudest thing on the screen from the reveal onward
(§1.6). **The share sheet renders your card only** — there is no argument that
gets their words into `share.js`, which is the only way to be certain they never
end up in the output (§4, content & safety).

---

## 5 · What is stored, and where

Nothing leaves the browser.

| Thing | Where |
| --- | --- |
| Card text, handles, tone | `localStorage`, key `celestual:beta:v1` |
| Photographs | `IndexedDB`, database `celestual-beta` |
| Anything else | nowhere. There is no network call in `app/src/beta/`. |

EXIF is stripped on the way in: every image is decoded and re-encoded through a
canvas (`photo.js`), which drops every metadata block for free. There is no path
in that file by which the original bytes survive.

This is a design position and not only a prototype convenience. The plan's first
law is that nothing reaches the other person before both have chosen each other,
and the cheapest possible proof of that law is a build where the bytes are
physically incapable of arriving anywhere. When this gets a backend, the seal
stops being a property of the network and becomes a property of a policy — a
strictly weaker guarantee, and worth knowing you are trading down to.

### The camera

`<input type="file" capture="environment">`, not `getUserMedia`. This is not a
shortcut: `vercel.json` sets `Permissions-Policy: camera=()`, which disables the
camera API site-wide. The native capture sheet is not governed by that header,
needs no permission dialog, and is the better interaction on a phone anyway. **No
production header had to change.**

---

## 6 · The seeded sky

`/beta` seeds three cards on a first visit. The plan's §2 makes a claim the whole
design lives or dies on: that a ceiling, a dashboard and a window at night
composite into *one work* rather than a collage of strangers' vacations. You
cannot evaluate that against an empty sky, and you cannot evaluate it against one
card either.

The three frames are **drawn, not shipped** (`samples.js`) — abstract low-light
images in the shape of the real thing, pushed through the same treatment in
`photo.js` that a real photograph gets, and measured for tone by the same
function. Nobody is being shown a stock photo and told a user took it.

---

## 7 · Decisions taken, and the ones still open

Settled for this build:

1. **Words required, photo optional** (the plan's own lean, §7.1). The words are
   the costly signal; the photo is the step most likely to lose someone at 2am,
   and a card without one is still a star.
2. **The card is a circle**, for the reason in §1 above.
3. **No relationship categories**, per §1.3 — the tint comes from the photograph.
4. **Local-only storage**, per §5 above.

Deliberately not built:

- **The response card** (plan §3, "response — one card each"). It is build-order
  #5 in the plan's own §6 — *"the most build for the least reach"* — and the
  reveal has to be right before the thing after the reveal is worth building.
- **Face detection.** Excluded by direction. The plan's §1.4 still stands as a
  law; nothing here implements it.

Still open, from the plan's §7:

- Is the sky live or cumulative, and does a purged star leave it?
- Does the first free ping include a card, or is the card the paid upgrade?
- Who owns abuse review on matched pairs?

---

## 8 · Files

```
app/src/beta/
├── index.jsx     BetaApp: the route root, the six screens, the flow
├── Disc.jsx      THE CARD — the circular body, in every state
├── Sky.jsx       the approach: the field, the tap surface, the resolve
├── Composer.jsx  the composer, which is the card being filled in
├── Spread.jsx    the fused spread, and the unseal
├── model.js      the card as data, the prompt, the seeds, the tint
├── photo.js      a photograph becomes a surface (strip, treat, measure)
├── samples.js    three drawn frames, so the sky is not empty on arrival
├── share.js      the story render — your card and the mutual mark, never theirs
└── store.js      localStorage + IndexedDB, and nothing else
```

Two lines outside it: the fork in `app/src/main.jsx`, and `beta` added to
`RESERVED_CODES` in `app/src/api/trial.js` so a First Light competitor can never
claim a four-letter code that collides with the route.
