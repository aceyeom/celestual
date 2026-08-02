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
- A card with **no photograph is still a star** — it stands on a colour plate
  and keeps its body, its light and its type. This is what lets the photo be
  optional without leaving a hole in the sky.

---

## 2 · The card

A type poster, cut round. One fixed layout at every size it is ever drawn at.

```
              @ W R E N M I L E S        mono, tracked, quiet
                    ─────                a hairline

                you always took          serif italic, large, tight
                 the window seat

                    A U G  2             mono, quieter still
```

The words are set **on** the ground, not under it. That is what makes it a
poster rather than an image with a caption, and it is why the card survives
being small: at a hundred and fifty pixels in a spread it is still one object
saying one thing, where a disc with a paragraph beneath it would have been two.

A circle is radially symmetric, so centered type is the honest answer to it.
What makes it read as designed rather than defaulted is scale and restraint:
one big voice, two small ones, a hairline between them, nothing else. No
alignment control, no crop, no type colour, no size — the user chooses the
words and the ground.

### The ground

A photograph, or one flat plate. `model.js` `PLATES` holds five, all dark and
low-chroma:

| | |
| --- | --- |
| `ink` | `#08070D` |
| `violet` | `#191327` |
| `ember` | `#2B1710` |
| `rose` | `#2B1220` |
| `blue` | `#101A2E` |

Deliberately a short list rather than a picker. The sky has to keep reading as
one work, and forty cards in forty saturated hues is exactly the collage the
plan is trying to avoid; a photograph of a room at night already lands in this
range on its own, so a plate and a photo sit together instead of looking like
two different products. These are **grounds, not accents** — `docs/DESIGN.md`'s
two-accent law governs the interface, and nothing here is ever used as one.

Under a photograph the type gets a flat, even scrim (`ink` at 0.46). Flat rather
than a gradient shaped behind the text, which reads as a smudge on the picture.
Its whole job is that every card in the product sets its words at one contrast,
which is most of what makes forty of them look like one series.

### Why type sizes here are ratios, not ladder steps

Inside the disc, every size is a fraction of the diameter. That is a narrow
deliberate exception to `docs/DESIGN.md` §3, and it is the same one `card.js`
already takes: a composed artifact is an artboard, not a screen. The card is
drawn as a 68px thumbnail, as a ~400px resolve in the sky, as half a spread, and
as a 1080-wide Story render. A fixed pixel size would be four different designs.

The words fit in three steps rather than continuously, so the same text always
produces the same card and two cards of similar length look like a set:

| words | size |
| --- | --- |
| ≤ 8 | `0.100 × d` |
| 9–13 | `0.082 × d` |
| 14–20 | `0.066 × d` |

Metadata is `0.032 × d`, clamped to 8–12px — purely proportional it fell under
five pixels on the spread and grew to a headline on the Story render. Below
118px the disc carries no type at all: there is no legible size for a poster in
a thumbnail, and type too small to read is decoration pretending to be content.

### The body

The poster sits on a body, and the body is why it is a circle:

| Part | Why |
| --- | --- |
| Limb darkening | More atmosphere at a shallower angle near the edge, so the rim is dimmer *and* redder. It is the one cue that turns a circle into a sphere; without it the card is a coin. |
| A light from one side | On a flat plate, the same. Without it a plate is a swatch rather than a body. |
| Granulation | Convection cells, and simultaneously the one grain every card shares. Two jobs, one texture. |
| The corona | Light past the limb, seating the disc *in* the field instead of on top of it. |
| An opaque base | A body occludes. Written with alpha alone the disc let the galaxy shine through and read as a soap bubble. |

### The light a card burns with

The plan bans relationship labels outright (§1.3 — "no dropdown, no category,
the ambiguity is the product"), so the corona tint cannot come from a picker the
way production's category tints do.

For a photograph it is **measured off the image** — luminance-weighted, squared,
so the light source in the frame decides and the shadows barely count. A flat
average over a night photograph is an average of mostly darkness, and a warm
dorm ceiling and a cold street through a window both come back at almost exactly
neutral. For a plate it is the plate's own declared tone.

Either way the result maps between the product's **existing two stars**: warm
grounds burn amber, cold ones rose. No third hue, no category, nobody asked.

## 3 · The approach (star → card)

`app/src/beta/Sky.jsx`. The card is hung on `cam.focus`, the same variable the
engine uses to decide whether a star has resolved:

| `cam.focus` | What you see |
| --- | --- |
| 0.00 → 0.52 | a point of light. Nothing of the card exists. |
| 0.52 → 0.99 | the disc opens out of the point — blurred at first, the way an unresolved body is, sharpening as it grows, travelling from where the star hangs toward the frame it will hold. |
| 1.00 | resolved. A poster, hanging in the field. |

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

`/beta` seeds three cards on a first visit: two on plates and one on a
photograph, because that is the choice the composer offers and the only way to
see whether the two grounds belong to the same product is to see them next to
each other.

The photograph is loaded from **`app/public/beta/demo.jpg`**. It is fetched and
run through `photo.js` rather than pointed at, so it takes exactly the path a
photograph a person takes would take — square-cropped, treated, re-encoded,
measured for tone. A demo image that skipped the treatment would be showing a
card the product cannot actually make.

If the file is not there that card keeps its plate and nothing breaks.

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
├── Disc.jsx      THE CARD — the poster, the ground and the body
├── Sky.jsx       the approach: the field, the tap surface, the resolve
├── Composer.jsx  the composer, which is the card being filled in
├── Spread.jsx    the fused spread, and the unseal
├── model.js      the card as data, the prompt, the seeds, the tint
├── photo.js      a photograph becomes a surface (strip, treat, measure)
├── samples.js    what is in the sky on arrival, and the demo photograph
├── share.js      the story render — your card and the mutual mark, never theirs
└── store.js      localStorage + IndexedDB, and nothing else
```

Two lines outside it: the fork in `app/src/main.jsx`, and `beta` added to
`RESERVED_CODES` in `app/src/api/trial.js` so a First Light competitor can never
claim a four-letter code that collides with the route.
