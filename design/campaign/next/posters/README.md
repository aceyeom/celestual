# round, three posters

Three posters for Instagram at 4:5. Each is drawn the way the films draw a
world: lit, then brought down to four tones of one palette by blue noise.
They run warm to cool, and each says one true thing about celestual.

| | file | what it is | the words |
| --- | --- | --- | --- |
| 1 | [round-poster-1-bus.png](./round-poster-1-bus.png) | **the bus.** the 51B at 5:14 pm in the film's ambers. sol stands at the pole and the woman sleeps against the glass in the seat he gave her. One window across the street is lit in ice. | `every letter on the wall is to somebody.` on the bus's sign |
| 2 | [round-poster-2-pacific.png](./round-poster-2-pacific.png) | **seoul over berkeley.** The minute before nine, from the PACIFIC treatment: Seoul on Sunday afternoon in amber, turned over above Berkeley on Saturday night in ice. Each of them is asleep beside a dark phone. | `every mutual is revealed` / `on saturday at 9pm pacific.` on the seam |
| 3 | [round-poster-3-sea.png](./round-poster-3-sea.png) | **the sea.** Two people on a sea wall at dusk, from behind, a little apart, looking out, from a photograph in ice. Its horizon is the seam. | `nothing happens` / `unless it's mutual.` on the horizon |

The masters are 2160 by 2700; [1080/](./1080/) holds the same at 1080 by
1350.

## What changed

The owner kept the bus and asked for more colour, dropped the hinge and the
board, brought back the Seoul and Berkeley frame from the PACIFIC treatment
at 4:5, and sent two photographs for the third.

- **The bus** keeps its composition.
  - Its world is in the film's ambers, which is the colour the film floods
    it with when sol's letter goes up. A flooded world is the same four
    tones in the letter's palette.
  - The sign's lamps are amber, as a bus sign's are.
  - The one lit window is now ice, which ties it to the other two.
- **Seoul over Berkeley** is the treatment's own frame
  (`treatment.html` at commit `b443af9`). It is ported to `page/pacific.js`
  and placed again for 4:5.
  - First, the port drew the original 9:16 frame, to check it against the
    one the owner loved.
  - At 4:5 each half shows 675 of its world's 960 px.
  - Seoul's skyline sits 60 px nearer its steps, and Berkeley's moon hangs
    in a gap in the fog. So both people, both phones, the tower, the
    Campanile and the moon all stay in.
- **The sea** is the owner's photograph of two people on a sea wall. It is
  levelled, its own grain softened, darkened toward the top for dusk and
  dithered with pacific's blue noise into the ice palette, so it has the
  two cities' grain.
  - The photographs are the owner's, used at the owner's direction. Make
    sure of the rights before they run as ads.

## The words

Each line is true of the product, and none is new:

- `every letter on the wall is to somebody.` is round's line, approved for
  the campaign.
- `every mutual is revealed on saturday at 9pm pacific.` comes from the
  PACIFIC and TWO-INKS scripts. The reveal is Saturday, 9pm, in California,
  for everybody at once (`app/src/wall/pings.js`).
- `nothing happens unless it's mutual.` is one of the brief's approved lines.
  Nothing reaches anybody unless both of them send a note.

The first poster is about the wall, and the other two are about private
notes. Nothing says a letter on the wall makes a mutual, which `VOICE.md`
forbids.

## Putting them up

- **As a carousel**, in this order: the bus, seoul over berkeley, the sea.
  - That is the premise, then how it works, then the promise.
  - It is also warm to cool.
- **As one row of the profile grid**: upload the sea, then seoul over
  berkeley, then the bus. The row then reads bus, seoul over berkeley, sea,
  with the split poster in the middle.
- Upload the 2160 masters and keep them at 4:5. Everything that matters is
  clear of the profile grid's 3:4 crop.
- **For a caption**, use the product's own description, so that the wall
  and the notes are not confused:
  `anonymous letters to the people on your mind. send someone a private note, and if they send you one too, you both find out on saturday at 9pm pacific. if not, nobody ever knows.`
  Then `celestual.us`.

## The system

- **Cells.**
  - The bus is in round's 6 px cells. The two cities and the sea are in
    pacific's 3 px cells.
  - The masters are drawn at twice the layout, so every cell stays whole at
    2160, 1440 and 1080 wide. This was checked at all three sizes:
    - the bus: none of 31,100 cells is more than one colour;
    - the sea: none of 132,904;
    - seoul over berkeley: 24 of 102,240. Those 24 are the blocks along the
      Berkeley phone's thin rim, which is drawn crisp over the cells as the
      treatment drew it.
- **Palettes.**
  - amber is `#1B140B #9D763F #E0A95A #FAF1E5`;
  - ice is `#11161A #64819A #8FB8DC #EDF4F9`.
  - This was checked on the masters:
    - the bus has eight colours exactly: the four ambers, the sign's two
      darks, the ice window and chalk;
    - in the other two, 99.5% and 99.8% of pixels are exactly palette or
      type colours. The rest are the type's softened edges and the phones'
      rims.
- **Type.**
  - The bus's sign is Jersey 10, one lamp a pixel.
  - The seam captions are set as the treatment set them: Newsreader 500 at
    80 px and -0.022em, from 80 px in. The first line stands 18 px above the
    seam and the second hangs 14 px below it.
  - The clocks are Jersey 10 at 2 px a pixel, 64 px in from the outer
    corners, with their seconds dimmer.
- **The seam.** Seoul over berkeley's sits at 675, the middle. The sea's
  sits on its photograph's horizon at 672, so the two posters' captions
  stand at the same height.
- **The sign-off.** The lockup is drawn in chalk at 2 px a cell, at the
  bottom left on all three:
  - on Berkeley's wall, its words on the clock's baseline;
  - on the sea wall, in the last 98 px.

## The judgement

Each poster was scored 1 to 5 on the same criteria and weights as before:

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

Two of these posters are light in places, so weight is now measured
against each poster's own mean lightness, not against the room's black
(`page/poster-judge.py --ground mean`). What pulls the eye is then whatever
differs from the whole, dark or light.

| poster | score | weight centre | from optical | left | top |
| --- | --- | --- | --- | --- | --- |
| **seoul over berkeley** | **96** | 0.51, 0.49 | 0.028 | 0.49 | 0.57 |
| **the sea** | **92** | 0.50, 0.56 | 0.102 | 0.50 | 0.48 |
| **the bus** | **91** | 0.48, 0.51 | 0.048 | 0.52 | 0.50 |
| the sea, with both photographs | 77 | 0.52, 0.50 | 0.041 | 0.48 | 0.53 |

**Why these three.**

- **Seoul over berkeley** is the frame the owner loved, and all of it
  stays at 4:5.
  - Its weight sits nearest the optical centre.
  - The seam is the middle, and the clocks are in opposite corners.
  - Two people, a day and an ocean apart, wait for the same minute.
- **The sea** puts the line on its horizon, at the same height as the
  second poster's seam, so the two rhyme.
  - Its weight sits low, 0.10 below the optical centre, by design: the two
    of them at the foot of a big sky.
- **The bus** is kept as the owner liked it, now in its own colour.
  - The amber sign reads at a third of the width.
  - The one window in ice is the only cool thing in a warm world.

**The alternate.** The second photograph, of somebody passing by as a blur
beside somebody standing still, was tried above the seam with the sea wall
below it (`seapair`). It tells the before as well as the after, and it
balances well. But its figures fill their band, so the first line lands
across their legs. It is kept, and not chosen.

**The rounds.**

- **The bus.**
  - Amber worked first time.
  - The window was tried in rose (yuna's colour) and in ice. Ice won: it
    is the one cool thing in a warm world, where rose reads as one more warm
    light.
- **Seoul over berkeley.**
  - The 9:16 frame was reproduced first.
  - At 4:5 the tower first stood in the caption, so the skyline moved.
  - Then Berkeley moved 40 px lower, so that its wall holds the phone, the
    clock and the lockup together.
- **The sea.**
  - At first the second line's chalk sat on a pale sea. A darker curve and
    softening the photograph's grain fixed that.
  - The lockup moved down onto the wall.

## Making them again

From `design/campaign/next/`, with Playwright's Chromium:

```
node page/posters.mjs posters 2                       # the three masters (2160 by 2700)
node page/posters.mjs posters/1080 1                  # the 1080 by 1350 copies
node page/posters.mjs <dir> 2 seapair                 # the alternate
python3 page/poster-judge.py <dir> --ground mean <dir>/*.png
```

- Renders are exact from run to run.
- `page/posters.html` is the bench, and `page/round-posters.js` holds the
  compositions, by name.
- `page/pacific.js` is the two cities' renderer. `pacific-her.png` and
  `pacific-him.png` are its two people. `photo-sea-wall.jpg` and
  `photo-passing.jpg` are the owner's photographs, cropped to their
  pictures.
- `poster-judge.py` needs numpy and Pillow.
