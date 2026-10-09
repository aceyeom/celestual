# round, three posters

Three posters from the film for Instagram at 4:5, chosen from nine by the
judgement below. Each lights one thing only: yuna's letter, the one that
closes the round.

| | file | what it is |
| --- | --- | --- |
| 1 | [round-poster-1-letter.png](./round-poster-1-letter.png) | **the letter.** yuna's letter, lit in rose, over the grey bus where sol stands at the pole |
| 2 | [round-poster-2-wall.png](./round-poster-2-wall.png) | **the wall.** the line over the four letters, three with their backlight down, the last one lit |
| 3 | [round-poster-3-clock.png](./round-poster-3-clock.png) | **the clock.** the night as a board: four times on split flap plates, whom each wrote to, the line |

The masters are 2160 by 2700; [1080/](./1080/) holds the same at 1080 by
1350.

## Putting them up

- **As a carousel**, in this order: the letter, which stops the scroll; the
  wall; the clock, with the line last.
- **As one row of the profile grid**: post the clock, then the wall, then
  the letter, so that the row reads letter, wall, clock. The wall's
  symmetry makes it the centre of the three.
- Upload the 2160 masters and keep them at 4:5. Everything that matters is
  clear of the profile grid's 3:4 crop.
- The line is on every poster. If a caption is wanted, use only approved
  lines: `every letter on the wall is to somebody.` and `celestual.us`.

## The system

- **Grid.** Laid out at 1080 by 1350. A module of 90 is fifteen of the
  film's 6 px cells, giving a 12 by 15 grid with a module's margin all round.
  Every edge sits on the cell grid.
- **Whole pixels.** The masters are drawn at twice the layout, so the film's
  cells are 12 px. They become whole 8 px cells at 1440 and whole 6 px cells
  at 1080, the two sizes Instagram serves. This was checked: every cell of
  the letter's bus stays one colour at all three sizes.
- **Type.**
  - The line is Newsreader 500 in its display cut: lowercase, -0.022em,
    italic on one word, 96 px on baselines 180 and 270, two module lines.
  - Jersey 10 appears only on lit things: the letters' screens and the
    clock's plates.
  - Geist Mono is used for the address.
- **Colour.** The room's black, chalk, ash, and one lit thing per poster in
  yuna's rose. The other letters are dimmed to night, as the campaign's own
  posters dim every screen but one.
- **The sign-off.** It is the same on all three: the lockup drawn at 2 px a
  cell (whole pixels) on the bottom margin at the left, and `celestual.us`
  on its baseline at the right.

## The judgement

Every candidate was scored 1 to 5 on eight criteria, weighted:

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

Brand fidelity covers one bright thing, the type rules and the lockup's
rules.

The measures come from `page/poster-judge.py`:
- Weight is each pixel's lightness against the ground, raised by its chroma,
  then read through a squint (a blur a twentieth of the width wide).
- Its centre is set against the optical centre, at (0.5, 0.46).
- The left and top shares say how much of the weight lies left of the
  middle and above it.
- Bright things are the saturated, light regions, counted. The rule is one.

| candidate | score | weight centre | from optical | left | top | bright things |
| --- | --- | --- | --- | --- | --- | --- |
| **the letter** | **92** | 0.43, 0.49 | 0.074 | 0.69 | 0.50 | one |
| **the clock** | **87** | 0.44, 0.47 | 0.060 | 0.64 | 0.51 | the rose line only |
| **the wall** | **82** | 0.54, 0.54 | 0.084 | 0.40 | 0.43 | one |
| round, a dial | 78 | 0.48, 0.51 | 0.052 | 0.51 | 0.57 | the rose line only |
| the seam | 73 | 0.51, 0.55 | 0.086 | 0.49 | 0.37 | four |
| the wall, one held up | 71 | 0.45, 0.47 | 0.054 | 0.61 | 0.54 | one |
| the wall, left aligned | 70 | 0.42, 0.53 | 0.105 | 0.61 | 0.46 | one |
| the film's cover | 61 | 0.50, 0.38 | 0.077 | 0.51 | 0.63 | three |
| the contact sheet | 57 | 0.45, 0.43 | 0.058 | 0.56 | 0.68 | four |

**Why these three.**

- **The letter** carries the whole film in one image: the letter and the man
  it is to, a night apart.
  - Its weight leans left, where the lit screen is. The counterweight is sol's
    figure on the right, the pull between them is the point, and the centre
    still sits 0.07 from the optical centre.
  - The screen is five modules by six, and the line hangs on the module lines.
- **The clock** is the most architected of the nine.
  - Its rows sit two modules apart, and each greeting rests on its plates'
    baseline.
  - Its weight sits nearest the optical centre of the three. The board
    tells the order of the night without a picture, and its one rose line
    says who closes it.
- **The wall** shows the product as it is. Its axial symmetry holds the
  frame, the one lit letter pulls the eye down and right to where the story
  ends, and it gives the set its centre panel.

**Why not the others.**

- **Round** is the cleverest idea, the four as stations on a dial at their
  hours. But its stations are small and it does the clock's job less
  legibly.
- **The seam** is the film's own frame and the most cinematic. Its texture
  fills every corner, the mirrored bus reads as abstract grey, and it shares
  the letter's subject.
- **The wall, one held up** has the best hierarchy, but its three small
  letters set their words too small and it leaves the bottom third empty.
- **The wall, left aligned** leaves a dead column on the right, the worst
  balance of the nine.
- **The film's cover** lights all four letters, so they compete.
- **The contact sheet** has four lit phones and no focal point.

## Making them again

From `design/campaign/next/`, with Playwright's Chromium:

```
node page/posters.mjs posters 2                    # the three masters (2160 by 2700)
node page/posters.mjs posters/1080 1               # the 1080 by 1350 copies
node page/posters.mjs <dir> 2 round seam sheet     # any of the others, by name
python3 page/poster-judge.py <dir> <dir>/*.png     # the measures and the diagnostic sheets
```

Renders are exact from run to run, except that the wall's centred line may
differ by one level on a few hundred of its anti-aliased pixels.
`page/posters.html` is the bench and `page/round-posters.js` holds the
compositions, by name: `letter`, `wall`, `clock`, `round`, `seam`, `wallone`,
`wallleft`, `sheet`. `poster-judge.py` needs numpy and Pillow.
