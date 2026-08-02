# The star & card system

Every ping carries a card. It lives in `app/src/card/`, the composer is a step in
the send flow, and the reveal is on the status page.

This was `/beta` until 2026-08-02: a prototype mounted beside the real app so it
could not touch anything. It is production now, which changed exactly two things
about it and nothing else. The words a card carries **ride on the ping row**
(migration 0022), sealed server-side until both sides exist. The **photograph
does not** — it is treated, stripped and stored in IndexedDB on the phone that
took it, and no code path in this repo uploads one.

That split is the whole security posture of the feature, so it is worth stating
plainly. For the words, the seal stopped being a property of the network and
became a property of a policy: a `matched_at is not null` clause in one SQL
function (§5). That is a strictly weaker guarantee than the prototype had, and
it is the price of both people actually being able to read each other. For the
photograph the old guarantee is intact and unchanged: the bytes are physically
incapable of arriving anywhere.

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

A type poster, cut round. One system at every size it is ever drawn at.

```
   ┌──────────────────────┐      the credit line goes in the half the words
   │   @wren · aug 2      │      left empty, on their margin, in their
   │                      │      alignment
   │                      │
   │   you always took    │      the words: a block with a PLACE, not a
   │   the window seat    │      centered stack
   └──────────────────────┘
```

The words are set **on** the ground, not under it, and the type is small: the
picture is the picture, and the words are what you find in it.

### The composition is derived, not chosen

Where the block starts is decided by how much text there is (`autoPos`). A short
line takes the **lower left**, which is where a poster puts a caption meant to be
read after the picture; a middling one moves up the same left margin so it has
room to break; only the longest text goes to the middle of the disc, because the
middle is the only part of a circle wide enough for six lines, and by then the
type *is* the picture.

After that **the user drags it**, and everything else follows from where it
lands:

| Derived | From | Why |
| --- | --- | --- |
| Alignment | the block's own `x` | Text sitting left of centre hangs off a left margin; text in the middle is centred. It is what a person laying this out by hand would do, so it does not need to be a control. |
| Measure | the circle's real chord at the block's **edge** | A chord is narrower the further it is from the middle, so the width a block may take is a geometric fact about where it is rather than one number applied everywhere. Taken at the edge (`BLEED`) and not at the anchor, where it would be too generous and the last line would run into the limb. |
| Credit position | which half the words left empty | Words low → credit high, and the reverse. On the words' own margin, in the words' own alignment, so the two read as one composition instead of a caption that came with the frame. |

Dragging is bounded to `REACH` from the centre: past it the block eats its own
measure faster than it gains position, and a poster whose text can be dragged
under the limb is not a poster. The block re-composes itself as the text grows
right up until the moment the person moves it; after that it is theirs.

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
range on its own. These are **grounds, not accents** — `docs/DESIGN.md`'s
two-accent law governs the interface, and nothing here is ever used as one.

Under a photograph the type gets a flat, even scrim (`ink` at 0.32) so every
card sets its words at one contrast. **Nothing inside the disc is a gradient.**
The limb darkening and the warm rim that used to live here made the card read as
a lens looking at a picture rather than a printed circle with a picture on it.
What survives is the flat ground, the shared grain, and one hairline limb.

### The type

Three faces, and they are the product's own three (`docs/DESIGN.md` §3), so
choosing one is choosing a register rather than downloading a font:

| | Face | Scale | Leading | Tracking |
| --- | --- | --- | --- | --- |
| `serif` | Instrument Serif italic | 1.00 | 1.15 | 0 |
| `sans` | Space Grotesk 500 | 0.84 | 1.34 | −0.012em |
| `mono` | Space Mono, lowercase | 0.68 | 1.60 | +0.02em |

Each carries its own metrics. A face swap that keeps one size and one leading is
not a design choice, it is a bug with a dropdown: mono needs air and a smaller
size to hold a line where a serif does not.

### Why sizes here are ratios, not ladder steps

Inside the disc, every size is a fraction of the diameter. Narrow deliberate
exception to `docs/DESIGN.md` §3, and the same one `card.js` already takes: a
composed artifact is an artboard, not a screen, and this one is drawn as a 68px
thumbnail, a resolve in the sky, half a spread, and a 1080-wide Story render.

The words fit in three steps rather than continuously, so the same text always
produces the same card and two cards of similar length look like a set:

| words | size |
| --- | --- |
| ≤ 8 | `0.062 × d` |
| 9–13 | `0.053 × d` |
| 14–20 | `0.045 × d` |

Metadata is `0.026 × d`, clamped to 7–11px. Below 118px the disc carries no type
at all: there is no legible size for a poster in a thumbnail, and type too small
to read is decoration pretending to be content.

### The light a card burns with

The plan bans relationship labels outright (§1.3 — "no dropdown, no category,
the ambiguity is the product"), so the corona tint cannot come from a picker.

For a photograph it is **measured off the image** — luminance-weighted, squared,
so the light source in the frame decides and the shadows barely count. A flat
average over a night photograph is an average of mostly darkness, and a warm
ceiling and a cold street through a window both come back at almost exactly
neutral. For a plate it is the plate's own declared tone.

Either way the result maps between the product's **existing two stars**: warm
grounds burn amber, cold ones rose. No third hue, no category, nobody asked.

---

## 2b · The composer

The composer *is* the card. You type into the poster at the size and in the face
it will keep, and you drag the block to where you want it; there is no preview
step, because the thing on screen is the artifact.

Everything changeable lives in **one labelled panel** under it, on a two-column
grid that shares a left edge:

```
┌────────────────────────────────────────┐
│  GROUND   ● ● ● ● ●        [ PHOTO ]   │
│  ────────────────────────────────────  │
│  TYPE     Aa    Aa    Aa               │
└────────────────────────────────────────┘
```

What is **not** there is as deliberate: no size, no colour, no alignment, no
crop. Those are derived from what was chosen, which is the only reason forty of
these can look like one series.

One gesture carries two meanings — a tap on the block wants the caret, a drag
wants the block — so distance decides. Under `DRAG_SLOP` nothing is prevented
and the textarea focuses like any textarea; past it the field is blurred and the
pointer is captured for the rest of the drag.

## 3 · The approach (star → card)

`app/src/card/Resolve.jsx`. The card is hung on `cam.focus`, the same variable the
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

`app/src/card/Spread.jsx`. The engine's match mode already does the physics: a
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

| Thing | Where | Who can read it |
| --- | --- | --- |
| The words, the ground, the face, the block's position, the tone | `celestual_entries.card` (jsonb, migration 0022), and in `pings` on the device that placed it | Its author. The other person **only once the pair is matched**. |
| The photograph | `IndexedDB`, database `celestual-photos`, keyed `card:<handle>` | This device. There is no upload path. |
| Anything else | nowhere | — |

### The seal

`celestual_entries` has RLS on with **zero client read policies** — every read
goes through a `SECURITY DEFINER` RPC — so adding a column added no reader. The
one function that can return somebody else's card is
`celestual_counterpart_card`, and it is not granted to `anon` or
`authenticated` at all: it is called from inside the RPCs that have already
spent a DM proof, and its `where` clause carries the seal —

```sql
and e.matched_at is not null
```

That is a `where` on the row **being read**, not a check on the caller's own
row, because those two facts are set in the same statement and reading the one
that actually holds the words is the check that cannot be got around. There is
no argument to it, and no shape of call to anything else, that returns the words
on an unanswered ping. Below a mutual, a card is as unreadable as the hash of
the handle it was addressed to.

Everything a browser sends is rebuilt from scratch by `celestual_card_clean`
before it is stored — twenty words, a known plate, a known face, a position
inside the disc, a tone in range — so an unknown key cannot ride along inside
the jsonb and come back out at a reveal. A client is a suggestion.

The card is deleted by every path that already deletes a ping: the sixty-day
purge, "let one go", "delete everything", and the public opt-out. Nothing about
it needed its own cleanup. Letting a ping go also drops its photograph from
IndexedDB (`card/photos.js` `dropPhoto`) — a blob left behind after the row that
pointed at it is gone is a picture of somebody's night sitting in a browser
store, unreachable and undeletable.

### Why the photograph stayed home

EXIF is stripped on the way in: every image is decoded and re-encoded through a
canvas (`photo.js`), which drops every metadata block for free. There is no path
in that file by which the original bytes survive.

It could have been uploaded — a bucket, signed URLs released at a mutual — and
it deliberately was not. The plan's first law is that nothing reaches the other
person before both have chosen each other, and for the words that law is now a
policy a `where` clause keeps. For the photograph it is still a fact about the
network, which is a strictly stronger thing to be able to say and the reason the
picture is the half that stayed on the phone.

So at a mutual you are shown their **words**, on their ground, in their light.
You are not shown their room, and nobody's camera roll is on our servers.

A card restored onto a new device (`celestual_my_pings`) comes back with its
words and none of its picture, so it stands on its plate — which is the same
thing that happens when somebody chooses not to add one.

### The camera

`<input type="file">`, not `getUserMedia`. This is not a shortcut: `vercel.json`
sets `Permissions-Policy: camera=()`, which disables the camera API site-wide.
The native capture sheet is not governed by that header, needs no permission
dialog, and is the better interaction on a phone anyway. **No production header
had to change.**

Tapping **photo** opens a sheet with three doors, and the reason there are three
is that `capture` cannot be undone from inside the sheet it opens:

| | what the input carries |
| --- | --- |
| take a photo | `accept="image/*" capture="environment"` |
| photo library | `accept="image/*"` |
| browse files | neither — for the picture that arrived as a download, sits in Drive, or came out of a chat |

One `<input>` is re-pointed the instant before the click rather than three
living permanently in the tree, because a browser reads those attributes then
and three inputs are three ways for a stale one to fire.

---

## 6 · What is in the sky on arrival

Nothing. The prototype seeded three sample cards on a first visit so there was
something to look at; production shows a person their own pings and no one
else's, so the seeds and their demo photograph are gone. The register they were
teaching survives where it is actually useful: as the three example lines under
an empty composer (`model.js` `SEEDS`), which go the moment there is anything to
teach against.

`/demo` still ships a seeded world (`demoData.js`) — three cards, one of them
already mutual and sealed — because the sandbox's whole job is to show what a
live launch looks like before one exists.

---

## 7 · Decisions taken, and the ones still open

Settled:

1. **Words required, photo optional** (the plan's own lean, §7.1). The words are
   the costly signal; the photo is the step most likely to lose someone at 2am,
   and a card without one is still a star.
2. **The card is a circle**, for the reason in §1 above.
3. **No relationship categories**, per §1.3. The category tabs and the sixteen
   "why them" lines are deleted, not hidden: a ping's light is measured off its
   card's ground now, and nobody is asked anything.
4. **The words on the server, the photograph on the phone**, per §5.
5. **The reveal is opened by hand.** A match announces itself for two seconds
   and says nothing about what was written. The cards unseal when somebody
   decides to look at them, which is the one decision in this product that
   belongs entirely to the person it happened to.

Deliberately not built:

- **The response card** (plan §3, "response — one card each"). It is build-order
  #5 in the plan's own §6 — *"the most build for the least reach"* — and the
  reveal has to be right before the thing after the reveal is worth building.
- **Face detection.** Excluded by direction. The plan's §1.4 still stands as a
  law; nothing here implements it.
- **Uploading the photograph.** See §5. This one is a decision, not a gap.

Still open, from the plan's §7:

- Is the sky live or cumulative, and does a purged star leave it?
- Does the first free ping include a card, or is the card the paid upgrade?
- Who owns abuse review on matched pairs?
- A card is currently readable by whoever holds the device it was placed on
  (`localStorage`, like the plaintext handles beside it). That was true of the
  handles already; it is worth deciding whether the words raise the stakes.

---

## 8 · Files

```
app/src/card/
├── Disc.jsx      THE CARD — the poster, the ground and the body
├── Composer.jsx  the composer, which is the card being filled in
├── Resolve.jsx   the approach: a held star resolving into its card
├── Spread.jsx    the fused spread, and the unseal
├── model.js      the card as data, the prompt, the seeds, the tint, the wire
├── photo.js      a photograph becomes a surface (strip, treat, measure)
├── photos.js     the blob store — this device, and nowhere else
└── share.js      the story render — your card and the mutual mark, never theirs
```

Where it is wired in:

| | |
| --- | --- |
| `App.jsx` | the `compose` screen between the @ and the placement, the draft card held across the identity gate, the sealed/opened mutual state, and the held star's resolve |
| `components/screens.jsx` | `ComposeScreen`, `MutualScreen` (the two-second announcement), `RevealScreen` (the spread), and the mutual slot that shakes until it is opened |
| `api/celestual.js` | `placePing` carries the card up; `match_card` and `their_card` are the only ways one ever comes back |
| `supabase/migrations/0022_the_card.sql` | the column, the validator, the seal, and the three RPCs that changed |

`beta` stays in `RESERVED_CODES` (`app/src/api/trial.js`) even though the route
is gone: a First Light competitor claiming it would put a four-letter tracking
link where a year of git history says a prototype lived.
