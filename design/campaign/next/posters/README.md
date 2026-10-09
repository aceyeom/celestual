# round, three posters

Three posters from the film for Instagram at 4:5, in the night's greys with
one small accent in yuna's rose.

They replace the first set (the letter, the wall, the clock), which read as
a stock app advert: a serif headline over a picture, a pink card, a logo in
the corner. These are made of the film's own material at its own pixel
size, and words appear only where the film would put them, on lit or
mechanical things.

| | file | what it is |
| --- | --- | --- |
| 1 | [round-poster-1-bus.png](./round-poster-1-bus.png) | **the bus.** the 51B at 5:14 pm: sol standing at the pole, the woman asleep against the glass in the seat he gave her. The line is on the bus's sign, and one window across the street is lit rose. |
| 2 | [round-poster-2-hinge.png](./round-poster-2-hinge.png) | **the hinge.** the film's seam at 7:14 am with the colour held back. yuna's letter is up on the retro grey screen, its heart in rose, and she looks up at the bus hanging above her. |
| 3 | [round-poster-3-board.png](./round-poster-3-board.png) | **the board.** the night as a station board, every character on its own split flap module: the line, then the four letters as departures, each to the next writer. The last one's lamp is lit rose, and under it the next 5:14 pm is turning in. |

The masters are 2160 by 2700; [1080/](./1080/) holds the same at 1080 by
1350.

## What changed

- **No headline over a picture.** The line is on the bus's sign and on the
  board's modules. The hinge carries yuna's letter on her phone.
- **Grey, with one accent.** Everything is the night palette (`#131313`
  `#6E6E6E` `#9D9D9D` `#EFEFEF`), the room's black, chalk and the dark of
  the film's plates.
  - The letter is on the retro grey screen, not the rose card.
  - The rose is a few cells on each poster: a lit window, a heart, a lamp.
- **The film's own material at its own size.**
  - The worlds are drawn by the film's own programs in its 6 px cells.
  - The type is Jersey 10 in its own pixels.
  - The plates are the film's clock plates.

## Putting them up

- **As a carousel**, in this order: the bus, the hinge, the board.
  - The bus stops the scroll and says the line.
  - The hinge is the morning after: the letter, and the man it is to.
  - The board is the whole night, and it ends with the round beginning
    again.
- **As one row of the profile grid**: upload the hinge, then the board, then
  the bus, so that the row reads bus, board, hinge, with the board's grid in
  the middle.
- Upload the 2160 masters and keep them at 4:5. Everything that matters is
  clear of the profile grid's 3:4 crop.
- If a caption is wanted, use only approved lines:
  `every letter on the wall is to somebody.` and `celestual.us`.

## The system

- **Pixels.**
  - The bus reframes the film's half: 768 px of it across the poster's
    1080, from x 240 and from 189 px above the seam. So a cell is 4.27 px of
    the half and 6 px of the poster.
  - The hinge is the film's own frame, cut from 420 px down.
  - The masters are drawn at twice the layout, so a cell is 12 px; at 1440
    and 1080 wide it is a whole 8 and 6 px. This was checked: of the bus's
    31,100 cells and the 14,940 above the hinge's seam, none is more than
    one colour at any of the three sizes.
  - Jersey 10's own pixel is 3 px at 56 px. This was measured: every edge of
    every glyph falls on that grid.
  - The board draws its characters in those pixels, 3 px on the small
    modules and 6 px on the large, on a grid of 3 px, so they stay whole at
    all three sizes.
  - The sign lights one lamp a pixel, 6 px apart, the size of a cell.
- **Type.** Jersey 10 only, and only on lit or mechanical things: the
  board's modules, the bus's sign, the hinge's clock plates and the phone's
  screen.
- **The board.**
  - It has 24 columns of small modules 39 px apart, in rows 60 px apart. A
    large module is two columns by two rows.
  - The line takes four rows of large modules, ragged as a board is. Every
    unused place has a blank module rather than none.
  - Each departure has an empty row before it, and the lamps stand in the
    last column.
- **The bus.** The sign is the line in two rows, centred, with the unlit
  lamps showing. It hangs from the ceiling on two rods, one of them on the
  pole's own line.
- **The hinge.**
  - The seam sits 540 px from the top, at 0.4 of the height.
  - The pole above it and the window's mullion below it are the film's
    spine: one line across the seam.
  - The clock plates are the film's: the hour, its colon, 1, 4 and the
    meridiem, each split on the seam.
- **Colour.** This was checked on the masters.
  - The only pixels with any colour are the rose ones: 0.10% of the bus,
    0.04% of the board and 0.02% of the hinge (its heart).
  - Everything else is grey, with a chroma under 4.5 (the plates' faint
    violet is the most of it), but for the heart's own softened edge.
- **The sign-off.**
  - The lockup is drawn in chalk at 2 px a cell, on the bottom margin.
  - On the board and the bus it sits at the left margin.
  - On the hinge it sits on the phone, under the letter.

## The judgement

Each poster was scored 1 to 5 on the first set's criteria, with the same
weights:

| criterion | weight |
| --- | --- |
| the idea, read in two seconds | x2 |
| hierarchy: one focal point and an order of reading | x1.5 |
| weight and balance | x2 |
| architecture: grid, proportion, alignment | x1.5 |
| negative space | x1 |
| legibility at full size and as a thumbnail a third wide | x1 |
| brand fidelity | x1.5 |
| distinctiveness | x1 |

The first set scored about as well on that rubric, and still read as
generic. So each poster now also has to pass one check the first set
failed. Is everything on it made of the film's own material, with no
headline laid over a picture and no card? All three pass.

The measures come from `page/poster-judge.py`, as for the first set:

| poster | score | weight centre | from optical | left | top |
| --- | --- | --- | --- | --- | --- |
| **the bus** | **91** | 0.47, 0.46 | 0.029 | 0.53 | 0.61 |
| **the board** | **90** | 0.45, 0.43 | 0.057 | 0.58 | 0.63 |
| **the hinge** | **88** | 0.51, 0.50 | 0.043 | 0.49 | 0.43 |

The judge counts bright things as saturated blobs. It finds none on any of
the three: each rose accent is smaller than its smallest blob, which is what
"one tiny accent" means.

**Why these three.**

- **The bus** puts the line where a bus puts words, on its sign.
  - Its weight sits nearest the optical centre of the three.
  - The sign reads at a third of the width.
  - The eye runs from the sign down the pole to sol, then out to the one
    lit window.
- **The board** is the most architected: one grid, every edge on it.
  - It tells the order of the night without a picture.
  - Its weight sits high, at 0.43, because the line is the heaviest thing on
    it. It was lowered by half a row to bring that down.
- **The hinge** is the most of the film: the seam, the mirrored world, the
  clock, the letter on its screen. The letter and the man it is to are a
  night apart and a seam apart.

**The rounds.** Five rounds each.

- **The board.**
  - At first only the words had modules. Every place now has one, blank or
    not, so it reads as a board.
  - It was lowered by half a row.
  - A half turned "s" read as a broken letter, so the turning module moved
    to the empty last row, as the next 5:14 pm.
- **The bus.**
  - At 9 px cells the world was noise, and the sign's letters broke: the
    face's pixel had been taken as 4 px, and it is 3. It now uses 6 px cells
    and the measured grid.
  - The framing came closer, so that sol and the woman are larger.
  - It moved later in the clock, after sol has put his phone down, which
    clears the lower left for the lockup.
  - The accent moved twice. The sign's full stop was too small to see, and
    a clip in her hair was lost in the dark. It is now a window across the
    street.
- **The hinge.**
  - A pane falling across the seam hid the bakery and read as noise, so it
    is now the film's own frame with no pane.
  - The seam moved to 0.4 of the height.
  - The lockup moved off the busy floor onto the phone.
  - The clock's digits were centred on the split, and the plates lost their
    pins.

## Making them again

From `design/campaign/next/`, with Playwright's Chromium:

```
node page/posters.mjs posters 2                    # the three masters (2160 by 2700)
node page/posters.mjs posters/1080 1               # the 1080 by 1350 copies
node page/posters.mjs <dir> 2 bus                  # any one, by name
python3 page/poster-judge.py <dir> <dir>/*.png     # the measures and the diagnostic sheets
```

- Renders are exact from run to run.
- `page/posters.html` is the bench, and `page/round-posters.js` holds the
  compositions, by name: `bus`, `hinge` and `board`.
- `poster-judge.py` needs numpy and Pillow.
