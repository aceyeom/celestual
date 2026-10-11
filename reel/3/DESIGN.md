# celestual: the third reel, "on purpose"

`celestual-reel-3.mp4`: 34.7 seconds, 1080 by 1920, 30 frames a second
(drawn at sixty and mixed down, as the first reel is), sound effects only,
so a song can be laid over it. `celestual-reel-3-b.mp4` is the same film
with a cold open of 1.3 seconds in front of it. `assets/poster.jpg` is a
frame of it.

## The story

One person and one real week, told on her phone's screen.

Nadia walks home every night with her study group. Owen made the group a
playlist for the walk: the walk takes 19 minutes, and his playlist runs 51.
On tuesday at 1:12 am, in the group chat, Bee jokes that the playlist is
longer than the walk. Nadia has a reply typed and not sent, `i already
walk slower`, when Owen answers first, in front of everyone: `so walk
slower`. She deletes her reply. Its letters stay burnt into the dark.

At 1:41 am her phone says `sent privately.` to `dear Owen`, `till this
saturday`. We never see her write it.

On wednesday her phone is at 4% at the library, and he lends her his
charger. Nothing told him about tuesday. Later, Bee: `lost you two`. They
fell behind on the walk again.

On friday she opens her note, and we read it for the first time: `i walk
slower / on purpose.` She goes to let it go (`they never find out you sent
it.`), presses halfway, and keeps it.

On saturday the countdown reaches nine and rolls over to next week, and for
a moment it is only her: `if it's only you, / the walk stays / the walk.`
Then the list reads again. `it's mutual`. His note: `the playlist / was
never / for the walk.` And `he hadn't / seen mine.`

She walks home and lets the playlist play to the end: 51:00.

He is never seen. He is a playlist, one line in a chat, a charger and a
note. They never meet on screen. The two notes were written without either
knowing the other's, and they answer different things: hers his joke in
the chat, his the playlist itself.

## Shot by shot

| seconds | the shot | the words on screen |
| --- | --- | --- |
| 0 | the night panel. Her lilac light walks a channel of cells across the stars to a pin, a small spring past it and back; his white light streams on alone into the dark to the end of the bar | `the walk home is` `19 min` `his playlist for it is` `51 min` |
| 2.7 | the group chat, `tue 1:12 am`, `the long table`. Owen's playlist card, its cover the dancing photograph in 22 by 22 cells; Owen's line arrives and the thread springs up; her draft deleted a key at a time, then a word at a time, each letter's ghost burnt in; the backlight dies and only the ghost is left among the stars | chat only |
| 6.7 | power on: `sent privately.` her note's glass, `dear Owen`, `till this saturday`; its lilac light leaks out into the dark as ink in water; the side button, and the screen relaxes out as liquid crystal does | chat only |
| 9.3 | her lock screen at 4%; plugged in, the bolt and the wake | `he lent me / his charger.` `nothing told him / about tuesday.` |
| 12 | the same lock screen, later, 31%, Bee's notification rising on a spring | `lost you two` (the screen says it) |
| 13.3 | her note in the vault: `i walk slower / on purpose.`; options, `let it go?`, a half press that never goes through, and `keep it` | the product's own words |
| 17.3 | `reveals in 00:00:02`, each second redrawn as an LCD redraws, with the overdrive ring round each changed digit | |
| 20 | nine. The count rolls over to `6d 23h`; silence; the roses photograph comes up through the panel from the digits, in grey cells, a hand reaching and the roses held out, never touching | `if it's only you, / the walk stays / the walk.` |
| 22.7 | the list reads again; the bouquet's cells are the first rose in the film, then `it's mutual`; the slot searches, flickers, finds; the press | `it's mutual` |
| 23.8 | the reveal grows out of the slot as the product's own wash does, in lobes and islands, with the rose spreading through the panel's light; the keepsake: `Owen & Nadia`, his note, `from Owen` | `the playlist / was never / for the walk.` then `he hadn't / seen mine.` |
| 28 | now playing: the dancing photograph, the cover from the chat, as the whole art of the player in 140 by 140 cells, the sun between their raised hands as star cells; each of her footfalls a small spring of the art's depth, as a phone's wallpaper moves when it is carried, and a pulse of rose under it; the scrubber is the hook's bar come back; `50:57` to `51:00`, play to stop | `i let it play` `to the end.` |
| 32 | a door's latch, and the name in the panel's cells, its star where the sun was; the address | `celestual.us` |

## The hooks

- **a**, `celestual-reel-3.mp4`: the numbers. `the walk home is 19 min /
  his playlist for it is 51 min`. The question it leaves (why 51?) needs no
  knowledge of the product.
- **b**, `celestual-reel-3-b.mp4`: the ghost. A cold open on the burnt-in
  letters `i already / walk slower` alone among the stars, then all of a.

Run them against each other; everything after the first seconds is the
same frames.

## Style

**One world, the first reel's.** Every frame is one LCD panel, 154 by 274
cells of 7 pixels, a 6 pixel lit square and a 1 pixel gap, on the first
reel's grid. The dark is the first reel's living panel: unlit cells, the
sky, the stars, and light that spreads as ink does in water through the
first reel's fluid (a fork of `panel-fluid.js`). Every word is Jersey 10
cut into the cells. Every photograph is sampled once per cell. The finish
is the first reel's: veil, halation, a print's grade, fresh grain every
frame, sixty mixed to thirty.

**No camera.** Nothing zooms, pans, pushes or dissolves. Everything that
moves is either something a phone's screen really does (a thread scrolling
on a spring, a key held down deleting letters then words, burn-in, a
screen powering on, liquid crystal relaxing, a half press, a notification
rising, a digit redrawn with its overdrive ring, a wallpaper's depth when
it is carried) or light (her walking light, the ink leaking from a sent
note, the rose spreading from the slot). Each of these happens once.

**The photographs, as pixel arrays.**
- **The dance:** the cover of his playlist in the chat at 22 by 22 cells.
  It pays off at the end as the player's whole art at 140 by 140.
- **The roses:** the limbo, in grey cells only. The bouquet's cells turn
  rose first when it is mutual.

Each photograph is area-averaged to four by four samples a cell, its
levels stretched and its local contrast lifted, then quantised to eight
levels with each cell's own hash, not a Bayer pattern, so it never
moirés. The brightest cells take the stars' point, cross and sparkle
shapes, and the dark figures stay dark against the light, as in the first
reel. A photograph moves only by being sampled again, and the cells
re-form in place as a moving image does on a real screen.

**Colour.** Her light is lilac, his is white, and rose is the reveal's
alone. No rose cell comes on before the list reads again at nine. One
bright thing per shot.

**The product, true.** Every screen is the product's own copy and order,
set in cells: the sent sheet, the vault's note, its options and the ask,
the reveal strip's countdown and its roll to next week, the second look
that finds the mutual, the slot, the wash out of the slot's rectangle, the
keepsake with theirs first. The film claims only what is true: the
recipient is never told a note exists, every mutual is revealed on
saturday at nine, and if it is only you, nobody ever knows.

**Safe zones.** Every word clear of Instagram's buttons on the right and
its caption at the foot.

## Sound

`assets/sound.wav`: effects only, near -30 LUFS, all of it on B. The night
air; a piano note as she arrives at the pin; a haptic buzz as Owen's line
lands; the keys of the deletes; a room hum that stops with the backlight; a
power-on click and a reversed cymbal into the sent note; a charging chime;
a muted note for Bee; two taps and a soft drum for `keep it`; the ticks of
the countdown; at nine, silence for two and a half seconds; the slot's
electric ticks, a tap, a gong as the wash opens, its grains panned with the
front, a bowed cymbal under his note; her footfalls and the player's stop;
a door's latch; the night air again under the name.

## How it was made

Made with the first reel's studio, on the `claude/campaign-studio`
branch. `studio.patch` adds the third reel to it:

- **Clock and text.** `app/src/studio/parts/reel3-time.js` holds the
  clock, every event frame, every string with its place in cells, the
  layouts, the springs, the sound cues and the hooks.
- **Drawing.**
  - `reel3-panel.js`: the panel, a fork of the first reel's fluid and
    light with the scene, title and shape layers.
  - `reel3-cells.js`: the cell buffer, its painters and the screen's
    behaviours.
  - `reel3-photo.js`: the photographs as cells.
  - `reel3-ui.js`: the product's screens in cells, each citing its
    source.
  - `reel3-wash.js`: the product's own wash, `spreadMap`.
  - `reel3-motion.js`: springs, eases, the route and the colour ramps.
- **Scenes and film.** `reel3/*.js` holds the nine scenes, `reel3.jsx`
  the film, and `films/reel-3*.jsx` the two cuts.
- **Scripts.**
  - `scripts/reel3-sounds.mjs`: the sound.
  - `scripts/reel3-render.mjs`: photographed in parallel and finished.
  - `scripts/reel3-check.mjs`: grid, springs, voice, copy, safe zones and
    determinism.

Libraries used, each for something seen:
- **gsap**: the master timeline, the eases and the ink's route.
- **motion-dom**: every spring.
- **culori**: OKLCH colour turns.
- **three with postprocessing**: the panel and its bloom.

To make it again, apply the patch to that branch and install:

```
npm --prefix app install
```

Then run:

```
node scripts/reel3-check.mjs
node scripts/reel3-render.mjs
```

## Credits and permissions

The two photographs (the dance and the roses) were supplied for the brief;
unless they were taken for the campaign, the film needs their
photographers' permission before it is posted. The drums, cymbals and gong
are from the Versilian Community Sample Library (CC0 1.0); the type is
Jersey 10 (SIL Open Font License).
