# The star & card system

Every ping carries a card. It lives in `app/src/card/`, the composer is a step in
the send flow, and the reveal is on the status page.

This was a prototype route until 2026-08-02: mounted beside the real app so it
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

A photograph, or one MATERIAL. `theme.js` `GROUNDS` holds three, and the reason
it is three is that these are materials rather than colours: you are choosing
what the note is written on, and there are only so many things in a book to
write on.

| id | what it is | `tone` |
| --- | --- | --- |
| `leaf` | ivory laid paper. the default. warm, fibrous, slightly mottled | 1 |
| `chalk` | a chalky grey gesso card. cooler, drier, more matte | 0.55 |
| `hide` | the leather itself, written in the pale ink the case is stamped with | 0.12 |

None of the three is an image or a CSS gradient pretending. `texture.js` renders
each one pixel by pixel from wrapped value noise — the paper has the fibre the
pulp settled with, the mottle where the sheet is thicker, and the fine wires and
chain lines of the mould pressed into it — memoized as a data URL and seamless
at any size. It is REAL at 1:1, which is the difference between a material and a
filter.

Before 2026-08-07 this was five flat dark plates (`ink`, `violet`, `ember`,
`rose`, `blue`). Every card placed under them keeps the id it was stored with;
all five were dark, so all five map to the leather when one is drawn
(`model.js` `LEGACY_PLATES`), and migration 0024 widened the server's validator
to accept both sets rather than rewriting anybody's row. A card is somebody's
words on a surface they chose, and handing back a different surface is a small
lie.

`tone` is the light that ping's star burns with, and it is measured off the
ground exactly the way it is measured off a photograph: paper throws the palest
light, leather the deepest. One number, no picker.

Under a photograph the type gets a flat, even scrim (`ink` at 0.4) so every card
sets its words at one contrast, and the ink comes off the GROUND rather than off
the brand — type set ivory on ivory is the one thing this card may never do.
**Nothing inside the disc is a gradient.** The limb darkening and the warm rim
that used to live here made the card read as a lens looking at a picture rather
than a struck seal with something printed on it. What survives is the material,
the shared grain, and the double keyline printed inside the trim.

**Nothing is drawn on the edge either.** A hairline ring and a bright
chromosphere arc used to sit on the limb, and at the size a ping is actually
seen — 38px in a list, 46px falling through the sky at a reveal — the ring *was*
the object: a drawn circle with a photograph inside it, which is a badge rather
than a body. Nothing in a real sky has a stroke on it. What ends a star is the
light falling off, so that is all that ends this one — the corona in the card's
own colour, over a soft shadow that seats the disc in the field instead of on
top of it. `share.js` draws the same object the same way, because a share sheet
that draws it differently is a different product.

### The type

Three faces, and they are the product's own three (`docs/DESIGN.md` §3), so
choosing one is choosing a register rather than downloading a font:

| | Face | Scale | Leading | Tracking |
| --- | --- | --- | --- | --- |
| `serif` | Cormorant Garamond italic | 1.00 | 1.16 | +0.004em |
| `sans` | Jost 300 | 0.78 | 1.46 | +0.006em |
| `mono` | Courier Prime, lowercase | 0.62 | 1.62 | +0.02em |

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

Either way the result maps along the product's **one value ramp**: pale
grounds burn wheat, deep ones saddle. One hue moved along its own value ramp.
No second hue, no category, nobody asked.

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

`app/src/card/Spread.jsx`. **One object with two sides — and nothing on this
screen arrives. The other side was always there.**

This has now been wrong three times, and the third one is worth writing down
because it is why the current design looks the way it does.

First the sky drew the whole event — two invented hero stars inspiralling, a
merger flash, a settled binary — and the two cards turned up afterwards, having
done nothing. Then the pair became the actual cards, orbiting each other: truer,
and with **no resting frame**, because two discs circling forever means nothing
to read and nowhere for the eye to land. Then their ping came in from the deep
field on a collision course, struck yours, and set it spinning like a tossed
coin.

That last one is the instructive failure. **A coin flip is a wager** — chance,
suspense, heads-or-tails — and a mutual is the precise opposite of chance: two
people already decided, separately, weeks ago. A collision is worse; it is
violence, and nobody here was hit. Between them the two ideas spent **eleven
separate events** — impact, flash, tumble, wobble, overshoot, glint, rock — on a
screen that is not a game and has no input to reward. Juice rewards input.
[VOICE.md](./VOICE.md) has the sentence for it: *the 2am message, never the
carnival.*

### What it is now

Their card did not fly in from anywhere. It has existed since the day they wrote
it, in the dark, behind yours, the whole time you were checking and finding
nothing. What changes at a reveal is not that something happens — it is that
something stops being hidden.

| | |
| --- | --- |
| **the arrival** | The ordinary held dive into **your** ping — the same `focusStar` the status page's "see it in the sky" makes, resolving on the same curve (`resolveOf`, exported from `card/Resolve.jsx` so the two zooms cannot drift apart). It has no duration here: `cam.focus` is read every frame, because a dive's bank breathes with how far the star is. |
| **the light** | Their light rises around the limb of your card, over a second and a half, and **nothing moves**. This is an *eclipse*: the near body is dark and all you get of the far one is the corona around its edge. It is the product's whole claim in one image and it needs no words — there is something on the other side of this. |
| **the turn** | One half turn, about the **vertical** axis, on `sky/camera.js`'s own flight curve. End-over-end is the coin; turning something over in your hands is this, and the axis is most of the difference. It does not overshoot, because a hand setting a photograph down does not bounce. |
| **the rest** | Their card at `fullSize()`, square on, still — and yours is now the fainter corona behind it, which never goes away. **The other side does not stop existing when you turn to it.** Tap to turn it back. |

### The light is the drama

Given that almost nothing moves, every value on this screen is a lighting value,
and all of them come off one cosine — how square-on the disc is.

- **The corona has three levels, not one.** Loud through the eclipse (it is the
  only thing happening); brightest as the disc comes side-on, because a disc
  seen side-on is not blocking anything; and quiet forever after, as a residue.
  The first cut had a single level and the beat meant to carry the whole middle
  of the screen played at a quarter opacity.
- **It hugs the limb.** A corona is light escaping past an edge, so it is
  brightest within a fraction of a radius of the body and gone shortly after.
  Given the whole frame to spread across it stops being that and becomes a
  colour wash with a card in it — the same mistake the old impact flash made.
  Every pixel lifted at once is not brightness; it is a lower contrast ratio.
- **Whose light it is hands over late.** Theirs holds pure all the way through
  the side-on peak and gives way only in the last quarter of the turn, where
  their face has taken the frame and the light has already fallen back. Crossed
  over at side-on instead, a half-and-half of the two values at full intensity
  is orange, and the most important instant in the product came out the colour
  of a streetlight.
- **One lens.** The disc is photographed through a perspective of 2.35 × its own
  diameter — `sky/camera.js`'s `FOCAL` — so it foreshortens on its way round
  exactly as hard as a star does on its way past.

### The sky's part is to be dark

There is no event in `galaxy.js` at all any more: no inspiral, no echo, no
flight to nowhere, and no flash, because there is no longer an impact to flash
at. The reveal's light is a corona around one card, and light around a card
belongs in the layer the card is drawn in; a sky that lit up as well would be a
sky insisting on being part of it.

What is left is one setter, `matchCover`, and it exists for a compositing reason
rather than a dramatic one: the card is opaque, sits exactly over the star it
grew out of, and **turns over** — so the sky has to be told when to stop drawing
the photosphere underneath, or the turn opens a hole onto a grey ball. It is fed
the card's own opacity, so the hand-off runs on one curve. Alongside it the
field is forbidden to resolve during a reveal, because `discOf()` scales with
`cam.unit` and a standoff that leaves the disk a field of points on a phone
opens a dozen of them into lens-dust plates on a laptop.

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
