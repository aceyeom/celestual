// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE MARK IN PIXELS, AND THE TWO WHO RUN INTO IT                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Three screens in the product tell the same small story on a phone: the
// intro, the door to the core service (screens/Join.jsx) and the mutual
// (screens/Reveal.jsx). A boy and a girl run in from either side of a lit
// panel; he plants his feet and opens his arms, she leaves the ground and
// falls into them, leans into him and then back, and he dips her, like a
// tango, and holds her there while a small heart rises off them. The phone's
// backlight turns pink, a wave from where they meet to the edges of the
// glass, and what they were holding on to glides together as the mark. This file is everything
// that story is made of, and none of it is a picture: the mark is rasterised
// from mark.js, and the two people are rows of pixels drawn by hand, the way
// looks.js draws the aerial and the pen. PixelStory.jsx puts it on the glass.
//
// Nothing here touches the page. A story is a function of the clock that
// answers with a list of lit cells, so it can be held on any frame, drawn
// last frame first under reduced motion, and read in node.

import { ECL, NEAR, CHALK, ringPath, starPath, rad } from './mark.js'
import { introFolk } from './folk.js'

// ── the mark, on a canvas ───────────────────────────────────────────────────
// Moved here out of share.js, which signs the shared picture with it, so the
// signature and the pixel mark are one drawing: the ring, then the star with
// the gutter cut out of it where the ring passes in front, then the ring's
// near half again on top, which is the order `eclipticSVG` layers them in.
// Paths and not an SVG image, because a canvas that has drawn an image can be
// tainted and a tainted canvas cannot be read back or made into a file.

// the half plane the ring is in front of the star in (mark.js `NEAR`)
export function clipNear(g) {
  g.save()
  g.translate(50, 50)
  g.rotate(rad(ECL.tilt))
  g.translate(-50, -50)
  g.beginPath()
  g.rect(NEAR.x, NEAR.y, NEAR.width, NEAR.height)
  g.restore()
  g.clip()
}

// `gutter` is the void cut out of the star where the ring crosses it, and
// `thick` the body the star's arms carry. The picture keeps the mark's own;
// a grid of forty cells wants both corrected (`markCells`).
export function markCanvas(size, { gutter = ECL.gutter, thick = ECL.thick } = {}) {
  const k = size / 100
  const ring = new Path2D(ringPath())
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const g = cv.getContext('2d')
  // the ring, whole
  g.fillStyle = CHALK
  g.setTransform(k, 0, 0, k, 0, 0)
  g.fill(ring, 'evenodd')
  // the star, with the gutter cut out of it on the near side
  const sc = document.createElement('canvas')
  sc.width = size
  sc.height = size
  const s = sc.getContext('2d')
  s.fillStyle = CHALK
  s.setTransform(k, 0, 0, k, 50 * k, 50 * k)
  s.fill(new Path2D(starPath({ ...ECL, thick })))
  s.setTransform(k, 0, 0, k, 0, 0)
  s.save()
  clipNear(s)
  s.globalCompositeOperation = 'destination-out'
  s.fill(new Path2D(ringPath(gutter)), 'evenodd')
  s.restore()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.drawImage(sc, 0, 0)
  // and the ring's near half in front of it
  g.setTransform(k, 0, 0, k, 0, 0)
  g.save()
  clipNear(g)
  g.fill(ring, 'evenodd')
  g.restore()
  return cv
}

// ── the mark, on a grid ─────────────────────────────────────────────────────
// The drawing above at eight times the grid, each cell lit when enough of it
// is covered. The grid is ODD: the star's axis then runs down the middle of
// a column and each arm ends in one cell, where an even grid splits the axis
// between two and every arm comes out two cells wide and blunt. Forty seven
// is the size the three stories draw it at; thirty three still reads.
//
// The ring is cut at a third and the star at a half (`MARK_CUT`). The ring's
// far side is under a cell wide and at a half it broke into dashes; the star
// at a third filled its own curves in and stood as a lozenge with two
// needles, and at a half its sides draw in again the way the mark's do. But
// at a half the long arms stopped five cells short of their points, which
// are the mark's whole reach past the ring, so down the star's own axes a
// cell is lit at an eighth: an arm thinner than a cell is still drawn, one
// cell wide, to its end. The gutter is widened to a cell, or the ring and the
// star it passes in front of fuse into one blot. Nothing else is changed:
// the geometry is mark.js's.
//
// Each lit cell also knows whether it is the ring's or the star's, so a story
// can close the circuit before it opens the star, which is the order the mark
// has always assembled in (mark.js `ECL_SPINE`).
export const MARK_CUT = { thr: 0.35, star: 0.5, tip: 0.12 }
const CELLS = new Map()
export function markCells(n = 47, { thr = 0.35, star = thr, tip = star, ss = 8, thick = ECL.thick } = {}) {
  const key = `${n}|${thr}|${star}|${tip}|${ss}|${thick}`
  if (CELLS.has(key)) return CELLS.get(key)
  const size = n * ss
  const cover = (cv) => {
    const d = cv.getContext('2d').getImageData(0, 0, size, size).data
    const out = new Float32Array(n * n)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) out[Math.floor(y / ss) * n + Math.floor(x / ss)] += d[(y * size + x) * 4 + 3]
    }
    for (let i = 0; i < out.length; i++) out[i] /= 255 * ss * ss
    return out
  }
  const gutter = Math.max(ECL.gutter, 100 / n)
  const all = cover(markCanvas(size, { gutter, thick }))
  // the ring alone and the star alone, to tell whose each cell is
  const alone = (draw) => {
    const cv = document.createElement('canvas')
    cv.width = size
    cv.height = size
    const g = cv.getContext('2d')
    g.setTransform(size / 100, 0, 0, size / 100, 0, 0)
    draw(g)
    return cover(cv)
  }
  const ring = alone((g) => g.fill(new Path2D(ringPath()), 'evenodd'))
  const body = alone((g) => { g.translate(50, 50); g.fill(new Path2D(starPath({ ...ECL, thick }))) })
  // and the gutter's reach, on the near side, where no arm may be drawn in
  const cut = alone((g) => { g.save(); clipNear(g); g.fill(new Path2D(ringPath(gutter)), 'evenodd'); g.restore() })
  const list = []
  const mid = (n - 1) / 2
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x
      const isRing = ring[i] > body[i]
      // the star's own axes, where its arms run out to a point, and not
      // across the gutter the near ring cuts through them
      const axis = !isRing && (x === mid || y === mid) && cut[i] < 0.05
      if (all[i] >= (isRing ? thr : axis ? tip : star)) list.push({ x, y, ring: isRing })
    }
  }
  const out = { n, list }
  CELLS.set(key, out)
  return out
}

// ── the colours the story keeps for itself ──────────────────────────────────
// Everything on the glass is the screen's own ink but these, and they are
// the story's and nobody else's. `PANEL` is the pink the backlight turns:
// the panel's own three stops, its hot spot, its body and its edge, in the
// place the night screen has its greys, so the pink panel is the same
// photograph of the same phone lit another colour (PixelStory reads the hot
// spot off the screen, looks.js `quirks`). `BLUSH` is a pastel pink for the
// light round a phone (story.css, intro.css). `ROSE` is a lit cell in the
// pink, deep enough to stay a pixel on a panel that is already pink: the
// heart, and the mutual's twinkle. The two of them, and the mark, are in the
// screen's own ink throughout, and stay dark and crisp on the pink.
export const PANEL = ['#FFE3EE', '#F5BCD1', '#D992AF']
export const BLUSH = '#F7C6D9'
export const ROSE = '#C93F76'

// ── the two of them ─────────────────────────────────────────────────────────
// Drawn by hand, a pixel at a time, facing right; the one who comes in from
// the right is the drawing turned round. The ground is under the last row.
//
// A silhouette of a runner is the same shape on either foot, so a run drawn
// in one ink is three frames that repeat, and it reads as a shuffle. So the
// limbs on the far side are a second, paler ink, and one drawing gives both
// steps: `a` is one arm and leg and `b` the other, and the stride that
// carries the `a` leg in front draws `a` near and `b` far, and the next
// trades them. Three drawings, six frames, and the legs are never mistaken
// for each other. `X` is the body, which is always near, `x` is always far,
// and `p` is lit in the rose.
//
// ── him ──
// 16 by 22, the height of the grid's figures, and a running body leaning
// into it: the stride, down on the front foot, and the push.
const RUN = [
  // the stride: the front leg reaching for the ground, the back one leaving it
  [
    '........XX......',
    '.......XXXX.....',
    '.......XXXX.....',
    '........XX......',
    '.......XX.......',
    '......XXXX...bb.',
    '.....XXXXX..bb..',
    '....aXXXXXbbb...',
    '...aa.XXXX......',
    '...a..XXX.......',
    '..aa..XXX.......',
    '.....XXXX.......',
    '.....bXXXX......',
    '....bb..aa......',
    '....bb...aa.....',
    '...bb.....aa....',
    '..bb......aa....',
    '.bb........aa...',
    'bb.........aa...',
    'b..........aa...',
    '...........aa...',
    '...........aaa..',
  ],
  // down: the weight on the front leg, the other heel kicked up behind
  [
    '................',
    '........XX......',
    '.......XXXX.....',
    '.......XXXX.....',
    '........XX......',
    '.......XX.......',
    '......XXXX......',
    '.....bXXXX......',
    '....bbXXXXa.....',
    '....b.XXX.aa....',
    '......XXX..aa...',
    '......XXX.......',
    '.....XXXX.......',
    '.....bbXaa......',
    '.....bb..aa.....',
    '....bbb..aa.....',
    '.bbbbb...aa.....',
    '.b.......aa.....',
    '.........aa.....',
    '........aa......',
    '........aa......',
    '........aaaa....',
  ],
  // the push: the leg that carried it driving back, the other knee up
  [
    '........XX......',
    '.......XXXX.....',
    '.......XXXX.....',
    '........XX......',
    '.......XX.......',
    '......XXXX..aa..',
    '.....bXXXX.aa...',
    '....bbXXXXaa....',
    '...bb.XXXX......',
    '...b..XXX.......',
    '..bb..XXX.......',
    '......XXXbbb....',
    '......XXXbbbbb..',
    '.....aa.....bb..',
    '.....aa.....bb..',
    '....aa.....bb...',
    '....aa.....bb...',
    '...aa......bbb..',
    '..aa............',
    '.aa.............',
    'aa..............',
    'a...............',
  ],
]

// The last stride, and he stops: feet braced one behind the other, leaning
// back a little against what is coming, and both arms open to her, the far
// one high and the near one lower, so the two of them make a V to run into.
const PLANT = [
  '.......XX.......',
  '......XXXX...bb.',
  '......XXXX..bb..',
  '.......XX..bb...',
  '.......XX.bb....',
  '.....XXXXbb.....',
  '....XXXXXX...a..',
  '....XXXXX.aaa...',
  '....XXXXXaa.....',
  '....XXXX........',
  '....XXXX........',
  '....XXXXX.......',
  '...bXXXXa.......',
  '..bb...aa.......',
  '..b.....a.......',
  '.bb.....aa......',
  '.b.......a......',
  '.b.......aa.....',
  'bb........a.....',
  'b.........a.....',
  'b.........aa....',
  'bb........aaa...',
]

// standing, waiting, the near arm down the body and the hand at the hip
const STAND = [
  '................',
  '........XX......',
  '.......XXXX.....',
  '.......XXXX.....',
  '........XX......',
  '........X.......',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXaX.....',
  '.......XXaX.....',
  '.......XXaX.....',
  '.......XXXa.....',
  '.......XXX......',
  '.......bXaa.....',
  '.......bXaa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '......bb.aaa....',
]

// and the same, the near arm thrown up and forward: a note let go of
// (joinStory). The hand is at (13, 3), where the note leaves from.
const SEND = [
  '................',
  '........XX......',
  '.......XXXX.....',
  '.......XXXX..a..',
  '........XX..a...',
  '........X..a....',
  '.......XXXXa....',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXXX.....',
  '.......XXX......',
  '.......XXX......',
  '.......bXaa.....',
  '.......bXaa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '.......b.aa.....',
  '......bb.aaa....',
]

// ── her ──
// 20 by 22, and two rows shorter than him: her head is on the third row.
// What tells her from him at this size is three shapes, so each is drawn to
// be read before anything else is. Her hair is long and loose, and it
// streams from the nape and not from the crown, so the head stays a round
// head with the hair leaving it. Her dress is an A-line, narrow at the waist
// and out at the hem, and the hem trails when she runs. Her legs are one
// cell wide under it, and her steps are light: one foot is always off the
// floor, and in the float both are.
//
// The hair is late, the way hair is: when she comes down on the front foot
// it is still going up, flicked above her shoulder, and when she floats it
// is still coming down, below it. So it bounces once a stride, a frame
// behind her.
const G_RUN = [
  // the stride: the near leg reaching, the far one trailing; the hair level
  [
    '....................',
    '....................',
    '............XX......',
    '...........XXXX.....',
    '........XXXXXXX.....',
    '.....XXXXXXXXXX.....',
    '...XXXXX.XXXX.......',
    '.XXX......XX........',
    '.........XXXX...bb..',
    '.........XXXXXbb....',
    '........aXXXX.......',
    '.......a..XXX.......',
    '......aa..XX........',
    '.........XXXX.......',
    '........XXXXXX......',
    '......XXXXXXXXX.....',
    '........b...a.......',
    '.......b.....a......',
    '.....bb.......a.....',
    '....b..........a....',
    '...............a....',
    '...............aa...',
  ],
  // down on the near foot, the far heel kicked up; the hair flicked up
  [
    '....................',
    '....................',
    '....................',
    '..XX........XX......',
    '....XXXX...XXXX.....',
    '......XXXXXXXXX.....',
    '........XXXXXXX.....',
    '...........XX.......',
    '..........XXXX......',
    '.........bXXXXa.....',
    '........bb.XXX.a....',
    '...........XXX..a...',
    '...........XX.......',
    '..........XXXX......',
    '.........XXXXXX.....',
    '.......XXXXXXXXX....',
    '.........bb..a......',
    '........b....a......',
    '......bbb....a......',
    '.............a......',
    '.............a......',
    '.............aa.....',
  ],
  // the float: both feet off the floor, the far leg reaching; the hair down
  [
    '....................',
    '............XX......',
    '...........XXXX.....',
    '...........XXXX.....',
    '........XXXXXXX.....',
    '......XXXXXXXX......',
    '....XXXX..XX........',
    '..XXX....XXXX...aa..',
    '.XX......XXXXXaa....',
    '........bXXXX.......',
    '.......b..XXX.......',
    '......bb..XX........',
    '.........XXXX.......',
    '........XXXXXX......',
    '.......XXXXXXXX.....',
    '.....XXXXXXXXX......',
    '.......aa.....b.....',
    '......a........b....',
    '.....a.........bb...',
    '....aa..............',
    '....................',
    '....................',
  ],
]

// She leaves the ground: leaning into it, both arms up and out for his neck,
// the near knee up, the far leg left behind, the hem and the hair lifted.
const G_LEAP = [
  '....................',
  '....................',
  '............XX......',
  '...........XXXX..aa.',
  '........XXXXXXX.aa..',
  '.....XXXXXXXXXXaa...',
  '...XXXXX..XXXX..bbb.',
  '.XXX......XXXXbb....',
  '.........XXXXX......',
  '.........XXXX.......',
  '........XXXX........',
  '........XXX.........',
  '.......XXXXX........',
  '......XXXXXXX.......',
  '....XXXXXXXXX.......',
  '...XXXXXXXXXX.......',
  '..bb.....aa.........',
  'bb........aa........',
  '.........aa.........',
  '.........a..........',
  '....................',
  '....................',
]

// and falls into his arms: laid out along the air on a slant, arms reaching
// for him at the height of his shoulders, heels up behind, the hem and the
// hair streaming back. Her last frame alone.
const G_FALL = [
  '....................',
  '.XX.................',
  '..XXX.......XX......',
  '....XXX....XXXX.....',
  '......XXXXXXXXX..aaa',
  '..........XXXX.aa...',
  '.........XXXXXaa.bb.',
  '........XXXXX.bbb...',
  '.......XXXXX........',
  '......XXXXX.........',
  '.....XXXXX..........',
  '....XXXXXXX.........',
  '..XXXXXXXXX.........',
  '.XXXXXXXXX..........',
  'bb...aa.............',
  'b.....aa............',
  '.......a............',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
]

// standing, waiting, facing him across the glass: the hair down her back
// and a gap of light between it and her neck, the near hand at her side
const G_STAND = [
  '....................',
  '....................',
  '............XX......',
  '..........XXXXX.....',
  '.........XXXXXX.....',
  '.........XX.XXX.....',
  '.........XX.XX......',
  '.........XXXXXX.....',
  '.........XXXXXa.....',
  '.........XXXXXa.....',
  '..........XXXXa.....',
  '..........XXX.a.....',
  '..........XXXX......',
  '.........XXXXXX.....',
  '.........XXXXXXX....',
  '........XXXXXXXX....',
  '..........b..a......',
  '..........b..a......',
  '..........b..a......',
  '..........b..a......',
  '..........b..a......',
  '.........bb..aa.....',
]

// and her note let go of, the hand at (17, 3)
const G_SEND = [
  '....................',
  '....................',
  '............XX......',
  '..........XXXXX..a..',
  '.........XXXXXX.a...',
  '.........XX.XXXa....',
  '.........XX.XXa.....',
  '.........XXXXXa.....',
  '.........XXXXX......',
  '.........XXXXX......',
  '..........XXXX......',
  '..........XXX.......',
  '..........XXXX......',
  '.........XXXXXX.....',
  '.........XXXXXXX....',
  '........XXXXXXXX....',
  '..........b..a......',
  '..........b..a......',
  '..........b..a......',
  '..........b..a......',
  '..........b..a......',
  '.........bb..aa.....',
]

// ── the two of them, together: the dance ──
// 30 by 22, him on the left facing right and her on the right facing left.
// It was two runners leaning into each other from the feet up, and it read
// as two people who had collided; then a catch and a cuddle, and it read as
// a hug. The owner asked for a tango: she runs into him, leans into him, and
// then leans back in his arms, and he goes down over her. So the hold is a
// dip, five drawings long, and each is a pose a hand would stop a flip-book
// on:
//
// THE CATCH is the frame she lands. She is off the floor, laid against him
// with her arms round his neck and her far heel kicked up behind her, and he
// has taken her weight: from the hips up he has rocked back a cell.
//
// THE LEAN is her leaning into him from her toes, her head on his shoulder
// under his chin, her hair down her back and the heel come down.
//
// THE TILT is the first of the dip. She has leaned back from the waist, her
// head thrown back and her hair falling from it, and he still stands.
//
// THE SWOOP is the dip on its way down: he has stepped in and bent over her,
// and her head has gone below her shoulders.
//
// THE DIP is where it is held, a row deeper than the swoop. He is in a
// lunge, the back leg long, bowed over her, his arm round her back; she is
// arched back over it, her head thrown back below her shoulders and her hair
// falling from it toward the floor, one foot on the floor under her skirt and
// the other lifted behind. What makes it two people and not one shape is the
// air: the light between his chest and her hips, and under the arch of her
// back. It was drawn deeper, her head on the floor, and it read as somebody
// who had fallen; this depth is the one a dancer holds. It breathes while it
// is held (`BREATH`): his head goes down to hers by a cell and her hair
// swings, and back.
const CATCH = [
  '..............................',
  '........XX....................',
  '.......XXXX...................',
  '.......XXXXX..XX..............',
  '........XXX..XXXX.............',
  '.......XX...XXXXXXX...........',
  '.....XXXXX..XXXXX.XXX.........',
  '....XXXXXXXXXXXXX....XX.......',
  '....XXXXXXXXXXXX..............',
  '....xXXXXXXXXXXXX.............',
  '.....XXXXX.XXXXXX.............',
  '.....XXXXX..XXXXX.............',
  '.....XXXXX..XXXXXX............',
  '.....XX.XX..XXXXXXX..x........',
  '....XX..XX..XXXXXXXXx.........',
  '....XX..XX...X...x.x..........',
  '...XX...XX...X....x...........',
  '...XX...XX....X...............',
  '..XX....XX....X...............',
  '..XX....XX....................',
  '.XX.....XX....................',
  '.XX.....XXX...................',
]
const LEAN = [
  '..............................',
  '.........XX...................',
  '........XXXX..................',
  '........XXXXX.................',
  '.........XXX.XX...............',
  '........XX..XXXX..............',
  '......XXXXX.XXXXX.............',
  '.....XXXXXXXXXXXXX............',
  '.....XXXXXXXXXXXX.X...........',
  '.....xXXXXXXXXXXXX.X..........',
  '......XXXXX.XXXXX..X..........',
  '......XXXXX..XXXX..X..........',
  '......XXXXX...XXXX.X..........',
  '......XX.XX..XXXXXX...........',
  '......XX.XX..XXXXXXX..........',
  '.....XX..XX..XXXXXXXX.........',
  '.....XX..XX...X...x...........',
  '.....XX..XX...X...x...........',
  '....XX...XX....X..x...........',
  '....XX...XX....X..x...........',
  '...XX....XX....X..x...........',
  '...XX....XX....XX.xx..........',
]
const TILT = [
  '..............................',
  '..........XX..................',
  '.........XXXX.................',
  '.........XXXX.....XX..........',
  '..........XX.....XXXX.........',
  '..........XX.....XXXX.X.......',
  '........XXXXX.....XX..X.......',
  '.......XXXXXXX..XXXX...X......',
  '......XXXXXXX.XXXXXX...X......',
  '......xXXXXX..XXXXX....X......',
  '.......XXXXX..XXXXX....X......',
  '.......XXXX..XXXXX.....X......',
  '.......XXXX..XXXXX............',
  '.......XXXX.XXXXXXX...........',
  '......xxXX..XXXXXXX...........',
  '......xx.XX.XXXXXXXX..........',
  '.....xx..XX..X..x.............',
  '.....x...XX..X...x............',
  '....xx...XX..X..x.............',
  '....x....XX..X................',
  '...xx....XX..X................',
  '..xxx....XXX.XX...............',
]
const SWOOP = [
  '..............................',
  '..............................',
  '...............XX.............',
  '..............XXXX............',
  '..............XXXX............',
  '...............XX.............',
  '.............XXXX.............',
  '...........XXXXXX.............',
  '..........XXXXXX.X...XX.......',
  '..........XXXXX...XXXXXX......',
  '.........XXXXX...XXXXXXXX.....',
  '.........XXXX...XXXXXX.XXXX...',
  '.........XXXX..XXXXX...XXXX...',
  '........xXXXX.XXXXX....XXXX...',
  '.......xx.XXX.XXXXXX....XX.X..',
  '.......x..XXX.XXXXXXX......X..',
  '......xx...XX.XXXXXXX......X..',
  '......x....XX...X.x........X..',
  '.....xx....XX...X..x.......X..',
  '.....x.....XX...X.x...........',
  '....xx.....XX...X.............',
  '..xxx......XXX..XX............',
]
const DIP = [
  '..............................',
  '..............................',
  '..............................',
  '................XX............',
  '...............XXXX...........',
  '...............XXXX...........',
  '.............XXXXX............',
  '...........XXXXXX.............',
  '..........XXXXXX.X...XX.......',
  '..........XXXXX...XXXXXX......',
  '.........XXXXX...XXXXXXXX.....',
  '.........XXXX...XXXXXX.XXX....',
  '.........XXXX..XXXXX....XXXX..',
  '........xXXXX.XXXXX.....XXXX..',
  '.......xx.XXX.XXXXXX....XXXX..',
  '.......x..XXX.XXXXXXX....XX.X.',
  '......xx...XX.XXXXXXX.......X.',
  '......x....XX...X.x.........X.',
  '.....xx....XX...X..x........X.',
  '.....x.....XX...X.x.........X.',
  '....xx.....XX...X.............',
  '..xxx......XXX..XX............',
]
const BREATH = [
  '..............................',
  '..............................',
  '..............................',
  '.................XX...........',
  '................XXXX..........',
  '................XXXX..........',
  '.............XXXXXX...........',
  '...........XXXXXX.............',
  '..........XXXXXX.X...XX.......',
  '..........XXXXX...XXXXXX......',
  '.........XXXXX...XXXXXXXX.....',
  '.........XXXX...XXXXXX.XXX....',
  '.........XXXX..XXXXX....XXXX..',
  '........xXXXX.XXXXX.....XXXX..',
  '.......xx.XXX.XXXXXX....XXXX..',
  '.......x..XXX.XXXXXXX....XX.X.',
  '......xx...XX.XXXXXXX.......X.',
  '......x....XX...X.x..........X',
  '.....xx....XX...X..x.........X',
  '.....x.....XX...X.x..........X',
  '....xx.....XX...X.............',
  '..xxx......XXX..XX............',
]

// ── the small things ──
// The heart that rises off them, and the one two notes become (joinStory),
// in the rose; the same heart a beat larger, for the frame it arrives; a
// smaller one for the mutual's screen, where it floats up now and then; and
// a note, sealed.
const HEART = [
  '.pp.pp.',
  'ppppppp',
  'ppppppp',
  '.ppppp.',
  '..ppp..',
  '...p...',
]
const HEART_BIG = [
  '.ppp.ppp.',
  'ppppppppp',
  'ppppppppp',
  'ppppppppp',
  '.ppppppp.',
  '..ppppp..',
  '...ppp...',
  '....p....',
]
const HEART_S = [
  'pp.pp',
  'ppppp',
  '.ppp.',
  '..p..',
]
const NOTE = [
  'XXXXXXX',
  'XX...XX',
  'X.X.X.X',
  'X..X..X',
  'XXXXXXX',
]

// A drawing as cells: [x, y, ink], ink 1 near, 2 far and 3 the rose. `near`
// says which limb pair is in front; `flip` turns the drawing round for the
// one coming from the right, which keeps its near side near. `ink` draws
// every lit cell of it in one ink, for a note that has been sealed.
function cellsOf(rows, { near = 'a', flip = false, x = 0, y = 0, ink = 0 } = {}) {
  const out = []
  const w = rows[0].length
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[i]
      if (ch === '.') continue
      const k = ink || (ch === 'p' ? 3 : ch === 'X' || ch === near ? 1 : 2)
      out.push([x + (flip ? w - 1 - i : i), y + j, k])
    }
  })
  return out
}

// The six frames of a run, in order: the stride, down and push on one foot,
// then the same three on the other.
function runFrame(set, k, o) {
  const f = ((k % 6) + 6) % 6
  return cellsOf(set[f % 3], { ...o, near: f < 3 ? 'a' : 'b' })
}

// ── the grid ────────────────────────────────────────────────────────────────
// Every story is drawn on the same grid, 57 by 45: odd both ways, so the mark
// has a middle column and a middle row, and in the proportion of the body of
// a letter's screen. The feet are on row 34, with the ground under them, and
// the mark stands in the middle. It is 47 cells square, and the tips of the
// star's long arms fall a cell inside that square at either end, so what is
// lit of it is the grid's own 45 rows.
export const COLS = 57
export const ROWS = 45
const GROUND = 34
const FIG_Y = GROUND - 22
const MARK_N = 47
// the pair stands in the middle, and each of them arrives where their half
// of it is: he plants where his body in the catch is, and she leaves the
// ground and comes down on hers. The dance is drawn from the same place, so
// his back foot and her standing foot stay where they landed.
const PAIR_X = (COLS - 26) >> 1
const PLANT_X = PAIR_X + 1
const LEAP_X = PAIR_X + 14
const FALL_X = PAIR_X + 9
// where they meet in the dip, which is where the pink leaves from; and where
// the heart is born, over her and clear of his bowed head
const HEART_OF = { x: PAIR_X + 18, y: FIG_Y + 11 }
const LOVE = { x: PAIR_X + 23, y: FIG_Y + 3 }

// the run is stepped: a frame of the cycle every 80ms, three cells a frame,
// which is the stride the drawings take, so no foot slides
export const STEP = 80
const PACE = 3

// the ground, dashed, in the far ink
function ground() {
  const out = []
  for (let x = 0; x < COLS; x++) if (x % 3 !== 2) out.push([x, GROUND, 2])
  return out
}

// ── the morph ──
// What they stood on becomes the orbit, and the two of them become the star.
// The dashed ground lifts off its row and bends into the ring: every dash is
// laid out along the ring's near half and again along its far half, left to
// right, so the line opens into the ellipse rather than scattering into it.
// Then the pair gathers into the star, each pixel paired with the part of
// the star on its own side of them (both laid round their own centres by
// angle), so the heads go up the long arm and the feet down the other. There
// are more pixels in the ring than dashes in the ground, and fewer in the
// star than in the pair, so some split on the way and some meet.
//
// It used to hop: every pixel rounded to a whole cell on every frame, thirty
// times a second, on a hard start. It glides now. A pixel waits in its cell,
// leaves on its own moment, travels between the cells at the display's own
// rate on an ease that is slow to start and slow to arrive, bending a little
// off the straight line as it goes, all of them the same way round, so the
// whole of it turns as it gathers, the way the ring turns; and it is put
// back on the grid only when it lands. The ground leaves from the left to
// the right, the ring's near half first; the star opens from its middle out,
// each pixel a little early or late by its own number, so they do not
// arrive as a wall. The ring closes first, the order the mark has always
// assembled in.
const glide = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
const RING_SPREAD = 200
const RING_FLIGHT = 500
const STAR_AT = 120
const STAR_SPREAD = 120
const STAR_JITTER = 50
const STAR_FLIGHT = 500
export const MORPH_MS = Math.max(RING_SPREAD + 40 + RING_FLIGHT, STAR_AT + STAR_SPREAD + STAR_JITTER + STAR_FLIGHT)
// how far a pixel bends off its line, at most, in cells
const BEND = 3.2

function pairs(src, dst) {
  const n = Math.max(src.length, dst.length)
  const out = []
  for (let k = 0; k < n; k++) out.push([src[Math.floor((k * src.length) / n)], dst[Math.floor((k * dst.length) / n)]])
  return out
}
function byAngle(list, get) {
  let cx = 0
  let cy = 0
  list.forEach((p) => { const [x, y] = get(p); cx += x; cy += y })
  cx /= list.length
  cy /= list.length
  const a = (p) => { const [x, y] = get(p); return Math.atan2(y - cy, x - cx) }
  return [...list].sort((p, q) => a(p) - a(q))
}
// a number from two others, the same every time it is asked
const hash = (a, b) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}

// the mark on the grid at `n` cells, its ring and its star, placed at
// (`ox`, `oy`), each ring cell with its place along the ring's long axis
// (`u`), which half it is on, and its angle round the middle
function markOn(n, ox, oy) {
  const m = markCells(n, MARK_CUT)
  const t = rad(ECL.tilt)
  const c = (n - 1) / 2
  const ring = m.list.filter((p) => p.ring).map((p) => {
    const dx = p.x - c
    const dy = p.y - c
    const u = dx * Math.cos(t) + dy * Math.sin(t)
    const v = -dx * Math.sin(t) + dy * Math.cos(t)
    return { x: p.x + ox, y: p.y + oy, u, near: v > 0, ang: Math.atan2(v * 2, u) }
  })
  const star = m.list.filter((p) => !p.ring).map((p) => ({ x: p.x + ox, y: p.y + oy, r: Math.hypot(p.x - c, p.y - c) }))
  return { ring, star, cx: ox + c, cy: oy + c, all: m.list.map((p) => [p.x + ox, p.y + oy, 1]) }
}
const BIG = { ox: (COLS - MARK_N) >> 1, oy: (ROWS - MARK_N) >> 1 }

// one pixel's way from (sx, sy) to (dx, dy), leaving at `delay` and taking
// `flight`: where it is at `t`, off the grid while it travels
function bitOf(sx, sy, dx, dy, ink, delay, flight) {
  const len = Math.hypot(dx - sx, dy - sy) || 1
  const bend = Math.min(BEND, len * 0.16)
  // the bend is to the left of the way it goes, for every pixel, so the
  // whole of it turns one way
  return { sx, sy, dx, dy, ink, delay, flight, nx: -(dy - sy) / len * bend, ny: (dx - sx) / len * bend }
}
function bitAt(b, t) {
  const k = (t - b.delay) / b.flight
  if (k <= 0) return [b.sx, b.sy, b.ink]
  if (k >= 1) return [b.dx, b.dy, 1]
  const e = glide(k)
  const arc = Math.sin(Math.PI * e)
  return [b.sx + (b.dx - b.sx) * e + b.nx * arc, b.sy + (b.dy - b.sy) * e + b.ny * arc, 1]
}

function morphOf(pair, dashes) {
  const m = markOn(MARK_N, BIG.ox, BIG.oy)
  const maxR = Math.max(...m.star.map((p) => p.r))
  const bits = []
  const line = [...dashes].sort((p, q) => p[0] - q[0])
  for (const near of [true, false]) {
    const arc = m.ring.filter((p) => p.near === near).sort((p, q) => p.u - q.u)
    for (const [s, d] of pairs(line, arc)) {
      const delay = (s[0] / COLS) * RING_SPREAD + (near ? 0 : 40)
      bits.push(bitOf(s[0], s[1], d.x, d.y, s[2], delay, RING_FLIGHT))
    }
  }
  const src = byAngle(pair, (p) => [p[0], p[1]])
  const dst = byAngle(m.star, (p) => [p.x, p.y])
  pairs(src, dst).forEach(([s, d], i) => {
    const delay = STAR_AT + (d.r / maxR) * STAR_SPREAD + hash(i, 7) * STAR_JITTER
    bits.push(bitOf(s[0], s[1], d.x, d.y, s[2], delay, STAR_FLIGHT))
  })
  return { bits, done: m.all }
}

function morphAt(m, t) {
  if (t >= MORPH_MS) return m.done
  return m.bits.map((b) => bitAt(b, t))
}

// ── the pink ──
// The moment is not their touching, which used to be one frame of the whole
// panel inverted, the way a phone's screen flashed when something came in:
// that was a collision, and this is somebody caught. The moment is the dip,
// held: and while it is held the phone's own backlight turns pink. It leaves
// the place where the two of them meet as a wave, its front a little
// brighter than what is behind it, and goes out across the panel until the
// whole screen is lit pink and not grey, with the two of them, and then the
// mark, dark on it. It stays: the mark is whole on a pink screen. It is the
// panel's colour and not a light laid over the cells, so it is drawn under
// them (PixelStory `paint`, in the panel's own gradient), and on its own
// clock, at the display's rate, where the run steps twelve times a second: a
// light does not step. The room round the phone takes it up as the front
// reaches the glass's edge (intro.css, mutual.css).
const WASH_MS = 720
// the radius the front has reached, in cells, `p` of the way through: out of
// the two of them quickly and slowing as it goes, at the glass's sides by
// about 260ms and past the far corner of any panel by the end
const washR = (p) => 2 + 54 * (1 - (1 - p) ** 1.6)
function washAt(u) {
  if (u < WASH_AT) return null
  const p = (u - WASH_AT) / WASH_MS
  if (p >= 1) return { x: HEART_OF.x, y: HEART_OF.y, r: null, level: 1, rim: 0 }
  return { x: HEART_OF.x, y: HEART_OF.y, r: washR(p), level: 1, rim: 1 - p }
}

// ── one story, from what comes before the catch ─────────────────────────────
// Every story ends the same way from the frame she lands (`catchAt`); what
// comes before it is each story's own (`before`). From the catch, in ms:
//
//      0   THE CATCH. Her weight, his step back, her heel up.
//    140   THE LEAN. She leans into him.
//    360   THE TILT, and she leans back
//    460   THE SWOOP: he steps in and goes down over her
//    560   THE DIP, held, breathing every 180ms
//    600   the heart leaves them: small, then a beat larger, then its own
//          size, rising a row every 100ms, and fading
//    640   THE PINK: the backlight, as a wave from where they meet, over the
//          whole panel by about 1120
//    880   THE MARK: the dip into the star and the ground into the ring,
//          gliding
//   1670   the mark is whole, on a pink screen
//
// `frame(t)` answers { key, cells, wash, glow }. The key changes only when
// the drawing does, so the canvas is drawn a dozen times a second while the
// two run and dance, at the display's rate while the pink spreads and the
// mark forms, and not at all while nothing moves. `times` are the story's
// own beats, for whoever holds the screen round it. A cell is [x, y, ink,
// heat, alpha]: `heat` is how much of the rose it carries and `alpha` how
// much of it is lit, both 1 when left out; a cell off the grid (a fraction
// in x or y) is one travelling, and is drawn where it is.
const DANCE = [
  { at: 0, rows: CATCH, key: 'catch' },
  { at: 140, rows: LEAN, key: 'lean' },
  { at: 360, rows: TILT, key: 'tilt' },
  { at: 460, rows: SWOOP, key: 'swoop' },
  { at: 560, rows: DIP, key: 'dip' },
]
const HOLD = 180
const HEART_AT = 600
const HEART_RISE = 100
const HEART_ROWS = 6
const WASH_AT = 640
const MORPH_AT = 880

function danceAt(u) {
  let d = DANCE[0]
  for (const f of DANCE) if (u >= f.at) d = f
  // held, it breathes
  if (d.rows === DIP && Math.floor((u - d.at) / HOLD) % 2 === 1) return { cells: cellsOf(BREATH, { x: PAIR_X, y: FIG_Y }), key: 'breath' }
  return { cells: cellsOf(d.rows, { x: PAIR_X, y: FIG_Y }), key: d.key }
}

// A glyph rising a row every `step` ms from `y`, lit in over its first step
// (unless it is already lit, `lit`) and out over its last three.
function rising(glyph, x, y, u, rows, step = HEART_RISE, lit = false) {
  const i = Math.floor(u / step)
  if (i < 0 || i >= rows) return { cells: [], key: '' }
  const alpha = i === 0 && !lit ? 0.55 : i >= rows - 3 ? (rows - i) / 4 : 1
  return {
    cells: cellsOf(glyph, { x, y: y - i }).map(([cx, cy, ink]) => [cx, cy, ink, 0, alpha]),
    key: `h${i}`,
  }
}

// The heart off them is born before it rises: the small one, for a step,
// then the large one for a step, the way a heart on a phone's screen beat
// once when it came on, and then its own size, going up.
function born(x, y, u) {
  const i = Math.floor(u / HEART_RISE)
  if (i < 0) return { cells: [], key: '' }
  if (i === 0) return { cells: cellsOf(HEART_S, { x: x + 1, y: y + 2 }).map(([cx, cy, ink]) => [cx, cy, ink, 0, 0.7]), key: 'hs' }
  if (i === 1) return { cells: cellsOf(HEART_BIG, { x: x - 1, y: y - 1 }), key: 'hb' }
  return rising(HEART, x, y, u - 2 * HEART_RISE, HEART_ROWS, HEART_RISE, true)
}

function makeStory({ before, catchAt, heart = null }) {
  const morphs = catchAt + MORPH_AT
  const done = morphs + MORPH_MS
  const end = Math.max(done, catchAt + WASH_AT + WASH_MS)
  let morph = null
  // the heart: resting where a story left one, or born over the dip
  const hx = heart ? heart.x : LOVE.x
  const hy = heart ? heart.y : LOVE.y
  const frame = (t) => {
    if (t < catchAt) return before(t)
    const u = t - catchAt
    const wash = washAt(u)
    const wk = !wash ? '' : wash.r == null ? 'W' : `w${Math.round(u)}`
    const h = !heart ? born(hx, hy, u - HEART_AT)
      : u < HEART_AT ? { cells: cellsOf(HEART, { x: hx, y: hy }), key: 'hr' }
      : rising(HEART, hx, hy, u - HEART_AT, HEART_ROWS, HEART_RISE, true)
    if (u >= MORPH_AT) {
      if (!morph) morph = morphOf(cellsOf(DIP, { x: PAIR_X, y: FIG_Y }), ground())
      const mt = u - MORPH_AT
      return { key: `m${mt >= MORPH_MS ? 'done' : Math.round(mt)}|${h.key}|${wk}`, cells: [...morphAt(morph, mt), ...h.cells], wash }
    }
    const d = danceAt(u)
    return { key: `${d.key}|${h.key}|${wk}`, cells: [...d.cells, ...h.cells, ...ground()], wash }
  }
  return {
    cols: COLS, rows: ROWS, end,
    times: { touch: catchAt, catch: catchAt, dip: catchAt + DANCE[DANCE.length - 1].at, glow: catchAt + WASH_AT, morphs, done, end },
    frame,
  }
}

// ── the run to each other ──
// Each of them runs `frames` frames of the cycle from where they start,
// three cells a frame, ending on the frame that carries them to where they
// stop; on the next he plants and she leaves the ground, 110ms later she is
// in the air falling, and she hangs there a little longer than a frame of
// the run, 150ms, before she is in his arms: the one moment in the story
// that is slower than the phone's own step, and it is the one that matters.
// `phase` is
// the frame of the cycle each starts on, so that the last stride before the
// plant and the leap is a push, a knee coming through.
const LEAP_MS = 110
const FALL_MS = 150
function approach({ start, frames, him = 1, her = 4 }) {
  const plantAt = start + frames * STEP
  const fallAt = plantAt + LEAP_MS
  const catchAt = fallAt + FALL_MS
  const at = (t) => {
    const k = Math.floor((t - start) / STEP)
    let a
    let ka
    let b
    let kb
    if (t >= plantAt) {
      a = cellsOf(PLANT, { x: PLANT_X, y: FIG_Y })
      ka = 'P'
    } else {
      const x = PLANT_X - PACE * (frames - k)
      a = runFrame(RUN, k + him, { x, y: FIG_Y })
      ka = `${x}.${(k + him) % 6}`
    }
    if (t >= fallAt) {
      b = cellsOf(G_FALL, { x: FALL_X, y: FIG_Y + 2, flip: true })
      kb = 'F'
    } else if (t >= plantAt) {
      b = cellsOf(G_LEAP, { x: LEAP_X, y: FIG_Y - 2, flip: true })
      kb = 'L'
    } else {
      const x = LEAP_X + PACE * (frames - k)
      b = runFrame(G_RUN, k + her, { x, y: FIG_Y, flip: true })
      kb = `${x}.${(k + her) % 6}`
    }
    return { key: `${ka}|${kb}`, cells: [...a, ...b, ...ground()] }
  }
  // where each of them stands before they set off (joinStory)
  const standHim = PLANT_X - PACE * frames
  const standHer = LEAP_X + PACE * frames
  return { at, plantAt, catchAt, standHim, standHer }
}

// ── the intro ───────────────────────────────────────────────────────────────
// Its own story now, and not the door's and the mutual's ending: the two of
// them are bodies drawn from poses (folk.js), a head taller than the typed
// sprites, on a ground four rows lower; she runs into his arms and does not
// dip; there is no heart. From `start`, in ms:
//
//      0   they run in from either edge, sixteen drawings a second, and
//          slide between the panel's cells at the display's own rate
//    690   he slows, the stride shortening, and stops at 875 with his arms
//          open to her
//   1000   she lands in them: her run carries her on into him, leaning the
//          way she ran, her heel up behind her, her hair and hem swinging
//          past and settling, until at 1310 she is still, behind him, his
//          arm round her; and they hold on, breathing
//   1370   THE PINK, from where they hold each other: the backlight, a wave
//          out to the edges of the glass, the phone's own bands and the
//          light it throws turning with it (Intro.jsx, intro.css), until the
//          whole phone is a letter lit in rose
//   1970   THE MARK: the two of them into the star and the ground into the
//          ring, gliding, whole at 2760
//
// `panel` is the rose letter's three panel colours and `ink` the night's
// ink and the rose's, which the wave carries the one to the other.
const I_GROUND = 38
const I_WASH = 60
const I_HOLD = 540
function groundAt(row) {
  const out = []
  for (let x = 0; x < COLS; x++) if (x % 3 !== 2) out.push([x, row, 2])
  return out
}
function washFrom(u, x, y) {
  if (u < 0) return null
  const p = u / WASH_MS
  if (p >= 1) return { x, y, r: null, level: 1, rim: 0 }
  return { x, y, r: washR(p), level: 1, rim: 0.6 * (1 - p) }
}
export function introStory(start = 180, { panel = PANEL, ink = null } = {}) {
  const folk = introFolk({ start, ground: I_GROUND, mid: (COLS - 1) >> 1 })
  const floor = groundAt(I_GROUND)
  const washAt = folk.times.hold + I_WASH
  const morphs = washAt + I_HOLD
  const done = morphs + MORPH_MS
  const end = Math.max(done, washAt + WASH_MS)
  let morph = null
  // the ink, from the night's to the rose's as the wave goes out
  const inkAt = (u) => (ink ? (u < WASH_MS * 0.45 ? ink[0] : ink[1]) : null)
  const frame = (t) => {
    // the glide is worked out while the screen is still dark (it rasterises
    // the mark), so the frame it starts on is not the one that pays for it
    if (!morph && t < start) morph = morphOf(folk.pair, floor)
    const u = t - washAt
    const wash = washFrom(u, folk.heart.x, folk.heart.y)
    const wk = !wash ? '' : wash.r == null ? 'W' : `w${Math.round(u)}`
    if (t >= morphs) {
      if (!morph) morph = morphOf(folk.pair, floor)
      const mt = t - morphs
      return { key: `m${mt >= MORPH_MS ? 'done' : Math.round(mt)}|${wk}`, cells: morphAt(morph, mt), wash, ink: inkAt(u) }
    }
    const f = folk.at(t)
    return { key: `${f.key}|${wk}`, cells: [...floor, ...f.cells], wash, ink: inkAt(u) }
  }
  return {
    cols: COLS, rows: ROWS, end, panel,
    times: { ...folk.times, catch: folk.times.meet, glow: washAt, morphs, done, end },
    frame,
  }
}

// ── the door ────────────────────────────────────────────────────────────────
// The mechanic, told in the order it happens (screens/Join.jsx). They stand a
// screen apart, each on their own side, and each sends the other a note that
// never arrives: it goes up, stops in the air and seals, dimmed, over the
// middle of the glass. He sends his (`you`); she sends hers (`them`),
// neither seeing the other's. Only when both are there (`both`) do the two
// notes wake, slide into each other and become one heart, and that is the
// moment they both find out: on the same frame, and not before. Then they
// run to each other under it, and the ending is the intro's.
const NOTE_FLIGHT = 560
const NOTE_Y = 4
const NOTE_A = 17
const NOTE_B = COLS - 7 - NOTE_A
const SLIDE_MS = 200
const HEART_X = PAIR_X + 9
const HEART_Y = 3
// a note from a hand to where it seals: across, and up on a curve that
// rises fast and settles, a whole cell at a time
function noteAt(u, from, to) {
  const k = Math.max(0, Math.min(1, u / NOTE_FLIGHT))
  const e = 1 - (1 - k) ** 3
  const x = Math.round(from.x + (to.x - from.x) * k)
  const y = Math.round(from.y + (to.y - from.y) * e)
  return { x, y, sealed: k >= 1 }
}

export function joinStory({ you = 900, them = 2300, both = 3600 } = {}) {
  const found = both + SLIDE_MS
  const runAt = found + 300
  const run = approach({ start: runAt, frames: 4, him: 2, her: 5 })
  const himX = run.standHim
  const herX = run.standHer
  // where each hand lets go
  const handA = { x: himX + 13, y: FIG_Y + 2 }
  const handB = { x: herX + 19 - 17 - 6, y: FIG_Y + 2 }
  const before = (t) => {
    const cells = []
    let key
    if (t < runAt) {
      // the two of them, standing, and each the frame they let go
      const sendA = t >= you && t < you + 2 * STEP
      const sendB = t >= them && t < them + 2 * STEP
      cells.push(...cellsOf(sendA ? SEND : STAND, { x: himX, y: FIG_Y }))
      cells.push(...cellsOf(sendB ? G_SEND : G_STAND, { x: herX, y: FIG_Y, flip: true }))
      cells.push(...ground())
      key = `s${sendA ? 1 : 0}${sendB ? 1 : 0}`
    } else {
      const r = run.at(t)
      cells.push(...r.cells)
      key = r.key
    }
    // the notes: in the air, sealed, then sliding into each other
    if (t < found) {
      for (const [at, from, to, name] of [[you, handA, { x: NOTE_A, y: NOTE_Y }, 'a'], [them, handB, { x: NOTE_B, y: NOTE_Y }, 'b']]) {
        if (t < at) continue
        let n = noteAt(t - at, from, to)
        let ink = n.sealed ? 2 : 1
        if (t >= both) {
          const k = Math.min(1, (t - both) / SLIDE_MS)
          const e = k * k * (3 - 2 * k)
          n = { x: Math.round(to.x + (HEART_X - to.x) * e), y: to.y }
          ink = 1
        }
        cells.push(...cellsOf(NOTE, { x: n.x, y: n.y, ink }))
        key += `|${name}${n.x}.${n.y}.${ink}`
      }
    } else {
      // and the heart they become: a beat larger the frame it arrives
      const big = t < found + STEP
      cells.push(...(big ? cellsOf(HEART_BIG, { x: HEART_X - 1, y: HEART_Y - 1 }) : cellsOf(HEART, { x: HEART_X, y: HEART_Y })))
      key += big ? '|H' : '|h'
    }
    return { key, cells }
  }
  const s = makeStory({ before, catchAt: run.catchAt, heart: { x: HEART_X, y: HEART_Y } })
  Object.assign(s.times, { you, them, both, found, run: runAt, meet: run.plantAt })
  return s
}

// ── the mutual ──────────────────────────────────────────────────────────────
// The same run, a little nearer, so the screen comes to its point sooner
// than the intro does; and then the screen does not stop.
//
// When the mark is whole it gathers up into the top of the glass at two
// thirds of its size (`SMALL`), gliding like everything else, to leave the
// bottom of the panel to the words (screens/Reveal.jsx types them there, in
// the phone's face). Then it is alive, ten times a second, on the pink the
// dip left, on a loop that is only ever a function of the clock:
//
//   the beat     the backlight behind the mark brighter, lub and dub, once
//                every 1400ms, and the star warming a little with it
//   the glint    a light going round the ring, once every 2400ms
//   twinkle      a cell or two of the star lit in the rose each frame
//   the heart    a small one floating up off the star every 4000ms
//
// None of it is random: each frame is chosen by its own number, so a frame
// held for a screenshot is the same frame every time. `still` is a frame of
// it at rest, for reduced motion.
const SMALL_N = 31
const SMALL = { ox: (COLS - SMALL_N) >> 1, oy: 1 }
const GATHER_MS = 560
const LIVE_MS = 100
const BEAT = [1, 0.5, 0.78, 0.36, 0.2, 0.1, 0.05, 0, 0, 0, 0, 0, 0, 0]
const GLINT = 24
const FLOAT_EVERY = 40
const FLOAT_FROM = 14
const PINK = { r: null, level: 1, rim: 0 }

export function revealStory(start = 200) {
  const run = approach({ start, frames: 7, him: 3, her: 0 })
  const s = makeStory({
    before: (t) => (t < start ? { key: '-', cells: ground() } : run.at(t)),
    catchAt: run.catchAt,
  })
  const told = s.frame
  const gatherAt = s.times.done + 200
  const liveAt = gatherAt + GATHER_MS
  let gather = null
  let small = null
  const smallMark = () => {
    if (!small) small = markOn(SMALL_N, SMALL.ox, SMALL.oy)
    return small
  }
  const wash = () => ({ ...PINK, x: smallMark().cx, y: smallMark().cy })
  const gatherOf = () => {
    const big = markOn(MARK_N, BIG.ox, BIG.oy)
    const to = smallMark()
    const bits = []
    const ring = pairs(byAngle(big.ring, (p) => [p.x, p.y]), byAngle(to.ring, (p) => [p.x, p.y]))
    const star = pairs(byAngle(big.star, (p) => [p.x, p.y]), byAngle(to.star, (p) => [p.x, p.y]))
    ring.forEach(([a, b], i) => bits.push(bitOf(a.x, a.y, b.x, b.y, 1, hash(i, 3) * 80, GATHER_MS - 100)))
    star.forEach(([a, b], i) => bits.push(bitOf(a.x, a.y, b.x, b.y, 1, 20 + hash(i, 5) * 80, GATHER_MS - 100)))
    return bits
  }
  const live = (t) => {
    const i = Math.floor((t - liveAt) / LIVE_MS)
    const m = smallMark()
    const beat = BEAT[i % BEAT.length]
    const cells = []
    // the glint, going round the ring by its own angle
    const g = ((i % GLINT) / GLINT) * Math.PI * 2 - Math.PI
    for (const p of m.ring) {
      let d = Math.abs(p.ang - g)
      if (d > Math.PI) d = Math.PI * 2 - d
      cells.push([p.x, p.y, 1, d < 0.55 ? 0.9 * (1 - d / 0.55) : 0])
    }
    // the star, warming on the beat, and a cell or two of it lit
    m.star.forEach((p, j) => {
      const tw = hash(i, j) < 2.2 / m.star.length ? 1 : 0
      cells.push([p.x, p.y, 1, Math.max(tw, 0.3 * beat)])
    })
    // and now and then a heart off the top of the star
    const f = i - FLOAT_FROM
    let fk = ''
    if (f >= 0) {
      const h = rising(HEART_S, Math.round(m.cx) - 2, Math.round(m.cy) - 9, (f % FLOAT_EVERY) * LIVE_MS, 9, LIVE_MS)
      cells.push(...h.cells)
      fk = h.key
    }
    return {
      key: `L${i}${fk}`,
      cells,
      wash: wash(),
      // the beat: the backlight behind the mark going brighter, and back
      glow: { x: m.cx, y: m.cy, r: 13 + 5 * beat, a: 0.12 + 0.6 * beat, inner: 0.9, light: true },
    }
  }
  s.frame = (t) => {
    if (t < gatherAt) return told(t)
    if (t < liveAt) {
      if (!gather) gather = gatherOf()
      const u = t - gatherAt
      return { key: `G${Math.round(u)}`, cells: gather.map((b) => bitAt(b, u)), wash: wash() }
    }
    return live(t)
  }
  // the told part is over when the words start; the rest goes on
  s.end = liveAt
  s.live = true
  s.still = liveAt + 6 * LIVE_MS
  Object.assign(s.times, { gather: gatherAt, live: liveAt, meet: run.plantAt })
  return s
}
