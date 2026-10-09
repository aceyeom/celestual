# making round

How round is made: every tool and technique weighed for it, what was chosen
and why, and the build, stage by stage, from the clock to the file that goes
up on Instagram. [ROUND.md](./ROUND.md) is the script, [LOOK.md](./LOOK.md)
the eye. Versions, dates and licences are as of 8 October 2026, read from
npm, git tags and the projects' own licence files; anything that could not
be confirmed is marked.

The film is made the way the first one was: a picture drawn from a clock in
the browser, photographed a frame at a time by the studio on
`claude/campaign-studio` (`app/src/studio/`, `scripts/studio-*.mjs`), and a
score written from the same clock. Its first draft is the live animatic on
[treatment.html](./treatment.html), whose sources are in [page/](./page/).

---

## 1. The pipeline

```
page/round-time.js            the clock: frameAt(f) says everything about a frame
        |
        |-- worlds            one WebGL2 program each; linear luminance, 4 samples a cell
        |     `-- figures     scenes/rig.js, posed on twos, filled into a mask, lit at the rim
        |-- tones             exposure, the plateau curve, blue noise: a tone per cell, fixed
        |-- flood             the product's wash: an arrival frame per cell, a palette per cell
        |-- composite         full resolution: the top mirrored, the flap by ray and plane,
        |                     palettes, the seam's ripple, the phone's light in glass and water
        |-- DOM               the phone (the product's Screen on boxOnto), the clock
        |                     (the product's FlapDigit), the end card
        |-- capture           Chromium seeked frame by frame, PNG, lossless
        |-- encode            FFV1 archive; x264 for delivery, settings that keep four tones
        `-- events()          the score: the canon as MIDI, the foley, rendered twice,
                              the second pass kept, loudnorm, muxed
```

Everything is a function of the frame. Nothing reads the wall clock,
nothing calls `Math.random`, nothing carries state from one frame to the
next that cannot be worked out again from the frame alone.

## 2. The toolbox

### Chosen

| stage | tool | why |
| --- | --- | --- |
| timeline | our own `page/round-time.js` | every curve here is physics or the score's grid; a library's eases are the generic ones |
| rendering | raw WebGL2, as `app/src/studio/wall-gl.js` already is | three passes and a handful of programs; no hidden clock, no defaults to fight |
| shader maths | written here from published work (section 3) | the only way to own every line and every licence |
| figures | `app/src/wall/scenes/rig.js` | the product's own bodies, sculpted in centimetres |
| letters | `app/src/wall/screen.jsx`, `looks.js`, `screens/Write.jsx` | the product's own screens, exactly |
| clock | `app/src/wall/art.jsx` `FlapDigit`, `wall.css` `.wl-flap` | the product's own split-flap digits |
| capture | the studio's Playwright Chromium (`scripts/studio-film.mjs`) | already seeks a film by `t` and photographs it |
| encode | FFmpeg (6.1.1 here, 9.0.2 current) with x264 | the settings in section 11 keep the cells clean |
| sound | FluidSynth 2.6.1 (LGPL 2.1) with MuseScore General 0.2.1 (MIT), as the studio does; voices upgraded from VSCO 2 CE and the Versilian Community Sample Library (both CC0) through `sfizz_render` (sfizz 1.2.3, BSD 2, archived in June 2026 and still working) | the first film's chain, with better clarinet, cello, horn and marimba samples |

### Weighed, and why not

| tool | version, licence | verdict |
| --- | --- | --- |
| GSAP | 3.15.0 (April 2026); a proprietary no-charge licence, every plugin free since 3.13 (it bars no-code animation builders that compete with Webflow) | already in the studio; its eases are what everybody's motion looks like; ScrambleText calls `Math.random` on every render and cannot be seeked; CustomBounce could be sampled for the flap but gravity is simpler and truer |
| anime.js | 4.5.0, MIT | a seeded random and springs; not needed |
| Motion | 14.0.0, MIT | interface motion |
| Theatre.js | core 0.7.2 (Apache 2.0), studio AGPL 3.0 | a keyframe editor; public development stopped in 2024 |
| Motion Canvas, Revideo | 3.17.2 and 0.11.0, MIT | 2D scene graphs; dormant and mostly 2D |
| Remotion | 4.0.534 | free to three people, then a company licence (25 dollars a seat a month, or a cent a render with a 100 dollar minimum); the studio already does what it does |
| HyperFrames | 0.8.141, Apache 2.0 | HTML with seekable adapters, Puppeteer and FFmpeg: the nearest free thing to the studio |
| three.js | r186 (0.186.1), MIT | WebGPURenderer and TSL fall back to WebGL2, and TSL compute even runs there; the move only if the worlds become fully 3D |
| OGL | 1.0.11, Unlicense | a minimal WebGL2 layer with no hidden clock: the helper to reach for if raw WebGL gets long |
| twgl.js, regl, PicoGL | 7.0.0, 2.1.1, 0.17.9, MIT | thin helpers; regl and PicoGL dormant |
| PixiJS and pixi-filters | 8.22.0 and 6.1.5, MIT | a fine 2D engine whose filters (bloom, CRT, glitch, god rays, old film) are the stock look |
| pmndrs postprocessing | 6.39.5, Zlib | only with three |
| VFX-JS | 1.1.0, MIT | shaders on DOM elements; reads `Date.now`, so it must be faked to be seeked; its presets are generic |
| Hydra | 1.4.0, AGPL | the instantly recognisable VJ look |
| cables.gl, p5.js | 0.23.0 MIT, 2.3.4 LGPL 2.1 | patching and sketching; the tutorial look |
| Paper Design shaders | 0.0.81, Apache 2.0 | its dither is two colours on Bayer or a hash, and its image dither takes a loaded image, not a live render; its mesh, grain and liquid metal gradients are the landing page look; the dither code is worth reading |
| Unicorn Studio | proprietary; the commercial licence on its top plan | the no-code landing page look; no public seek |
| lygia | 1.4.1, Prosperity licence (non-commercial without sponsorship) | dithers, blue noise and Oklab; nothing copied |
| Shadertoy | CC BY-NC-SA 3.0 by default | studied (BigWings' "Heartfelt" and "The Drive Home" for rain on glass), never copied |
| Lottie and dotLottie, Rive | 5.13.0 and 0.81.0 MIT; runtimes 2.44.0 MIT | After Effects and interface animation; the most generic look there is |
| Mediabunny | 1.61.3, MPL 2.0 (mp4-muxer is deprecated for it) | an in-browser encoder: the page's "save a preview", never the master |
| puppeteer-capture, timesnap | 1.58.0 MIT; 0.3.3 BSD 3 | BeginFrame capture (headless shell only) and clock overrides; the studio seeks instead |
| Tone.js, spessasynth_core, node-web-audio-api | 15.1.22 MIT, 4.3.22 Apache 2.0, 2.2.0 | offline audio in code; FluidSynth and sfizz already do it |
| HTML in Canvas (WICG) | a proposal behind a Chromium flag and an origin trial, still changing | would draw the DOM phone into the world's texture; the phone is modelled as a light instead |
| WebGPU compute | shipped in Chrome, Edge, Firefox and Safari 26; Linux still in progress | nothing at 180 by 320 cells needs it |

## 3. Techniques

Each is written here from the published maths, computed as luminance (or a
mask) before the dither, deterministic in the frame, and cheap enough for
SwiftShader at cell resolution.

| technique | where | from | how it stays inside four tones |
| --- | --- | --- | --- |
| thin lens drops: hashed drops on a grid, a stick slip slide, trails above; inside a drop the scene behind sampled inverted and magnified; drops wipe the fog | the bus's steamed glass | BigWings' method, re-derived (the Shadertoy code is non-commercial) | each drop's tiny inverted street is a shape, not a gradient; the fog is one tone |
| shutter integrated streaks: light discs integrated over the exposure in closed form | the street past the bus | the same | streaks are bright lines on a dark field: two tones and an edge |
| closed form single scattering in a cone, `[atan((d+b)/h) - atan(b/h)] / h`, clipped by ray and cone, with slowly drifting fbm | the café's beam, the bakery's sunbeam | Sun et al. 2005; Pegoraro and Parker 2009 | noise free, so the dither falls off as light does |
| motes: hashed points, brightness by in-cone phase (Henyey and Greenstein, g about 0.7) over distance squared, splatted as Gaussians of at least half a cell | the beams, the flour | the same | they reach the top tone only on the beam's axis |
| filament cool-down: a fast fall, an ember tail of 150 to 300 ms, the pool dropping a tone | the reading room | incandescent physics; Studio Drift's "Shylight" | events, not gradients |
| copper bars: horizontal bands whose per row thresholds undulate slowly | the roof's cloud | the Amiga's Copper | the bands are the tones |
| heavy tailed twinkle: each window's rate from a hashed power law, most never changing | the roof's city | Todd Hido's windows | single cells changing a tone |
| curl noise density, advected over a short fixed horizon, Beer and Lambert with forward scatter | tea steam, the loaves, flour | Bridson et al. 2007; Perlin and Neyret 2001 | glows against its light, a tone above the dark |
| a Fresnel weighted mirror of the world about the ground line, offset by the gradient of summed ripple rings `sin(k(r - v a)) e^(-a/tau)` from hashed impacts | the corner's puddle | Lagarde's rain articles (2012 to 2013); Tatarchuk 2006 | moving the reflection's edges reads in four tones; adding brightness would not |
| rain visible only inside the light's cone, brighter backlit | the corner | the same | streaks are tone 3 inside the cone and nothing outside |
| palette index cycling with blend shift: luminance = ramp(fract(index - rate t)) | the rain sheets, the oven's flicker, rivulets | Mark Ferrari; Huckaby's canvascycle (MIT) | the cycle moves through the four tones only |
| halation in linear light: highlights spread by a ring tailed kernel on a pyramid, before the tone curve | every practical light | film optics, done before the dither, never a glow on top | highlights grow coronas of dither density |
| unrolled feedback, a sum over a few earlier frames of the world itself | flour trails | PICO-8 trails, made stateless | trails fade a tone at a time |
| snap and remainder: a layer moved in whole cells plus an even pixel remainder | the bus's moving streets | pixel art cameras (UPixelator, Bevy) | no resampling, the pattern moving with its layer |
| sharp bilinear sampling and sub frame blur | the falling card | pixel art scaling | cells foreshorten crisply; blur only while fast |
| arrival time palette swap with a crest and a blue noise ranked fizzle | the flood | Ferrari; Wolfenstein 3D's fizzlefade (Sanglard) | a palette event: tones never change |

Weighed and left: error diffusion (it shimmers frame to frame: Rehman and
Evans), Bayer (it reads as a crosshatch, and is the trend), temporal blue
noise as the final mask (NVIDIA's STBN is non-commercial; EA's FAST, BSD 3,
only ever before quantising), halftone and riso screening (moiré against the
blue noise), CRT shaders (the wrong device), stable fluids, reaction
diffusion, boids and flow fields as visible effects (recognisable memes;
used, if at all, only as invisible velocity fields), datamosh, pixel
sorting, Rutt-Etra, slit-scan (except where the story motivates it), film
grain (it boils).

## 4. The dither

**Cells.** 6 px, aligned to (0, 0): 180 by 320 for the frame, 180 by 160 for
each half, the seam on the boundary between rows 159 and 160. A cell covers
three whole 2 by 2 chroma blocks, so a cell is never smeared by 4:2:0, and
when a platform serves 720p a cell is still 4 px. The first test renders 4 px
cells beside them (also on the chroma grid) and is judged on a phone at arm's
length and after a 720p re-encode; 4 px are finer and closer to pacific's
frames, 6 px bolder and safer.

**Samples.** Each world returns linear luminance; four samples a cell (2 by
2) are averaged in linear light, then exposure.

**The plateau curve.** Between each two palette levels the value is pushed
toward the nearer: `y' = L[k] + (L[k+1] - L[k]) * smoothstep(w, 1 - w, u)`,
`u` the value's place between them. With `w` near 0 it is a plain dither;
near 0.45 nearly a poster. Each world sets its own `w` (about 0.25 to 0.35),
so most of the frame sits on flat tones and the pattern appears only where
light falls off (LOOK.md, rule 2).

**The noise.** A 128 by 128 void and cluster blue noise (Ulichney, 1993;
Gaussian sigma 1.5 on a torus; Christoph Peters' CC0 generator as the
reference), generated in code at build time from a fixed seed. A 64 px tile
repeats every 384 px at 6 px cells and shows as a lattice in flat fields;
128 does not. It is never redrawn.

**Composition space.** Every half is rendered with row 0 against the seam,
counting outward, and the composite mirrors the top. The noise is read in
composition space with an offset per world, so a world dithers identically
upstairs, on the falling pane and landed: the landing is exact by
construction, and two worlds never show the same pattern mirrored across the
seam.

**The tone map.** `toneOf(y)` picks the two palette levels that bracket the
value (in linear light, against night's own luminances: .007, .155, .337,
.863) and compares the fraction between them with the noise. Each world's
tone map is made once against night and kept: the flood changes the
palette, never the tones (LOOK.md, rule 5). So acid's café goes dark and
lime (its four, from the product's own picture steps for the lime square:
.002, .044, .190, .500) and the riso corner snaps into two darks and two
lights.

**The riso.** Each cell's tone is split into a violet bit and a yellow bit
(overprint is both), and the yellow drum is laid 2 px out of register (a
third of a cell: even, so the chroma grid holds), as a riso's second drum
slips. The inks are exact; never the product's thirty per cent ghost.

**Stability.** Locked cameras. Moving layers move in whole cells plus an even
pixel remainder, their noise with them. The falling pane carries its own
cells. If anything ever crawls, Rune Skovbo Johansen's Surface-Stable
Fractal Dithering (MPL 2.0) is the model to port.

**Palettes** (from `skinOf`, linear luminance in brackets):

| | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| night | #131313 (.007) | #6E6E6E (.155) | #9D9D9D (.337) | #EFEFEF (.863) |
| amber | #1B140B (.008) | #9D763F (.205) | #E0A95A (.450) | #FAF1E5 (.889) |
| acid | #050505 (.002) | #2D4104 (.044) | #5A8602 (.190) | #8ACE00 (.500) |
| green | #14160D (.008) | #72834B (.203) | #A3BB6B (.444) | #F0F4E7 (.890) |
| ice | #11161A (.008) | #64819A (.207) | #8FB8DC (.453) | #EDF4F9 (.895) |
| violet / yellow | #572E00 (.040) | #5A3DA8 (.083) | #F7C200 (.584) | #F4F0E4 (.872) |
| rose | #1B1215 (.007) | #9C677B (.182) | #DF93AF (.397) | #FAEEF2 (.879) |

The page dumps these from `looks.js` with node at build time, so they have
one source.

## 5. The flap

**The fall.** A plate hinged at one edge: `theta'' = a sin(theta)`, released
at 0.07 rad (about 4 degrees), integrated once into a table and scaled so it
lands in exactly the frames given (12 for a pane, 10 after link 6's catch, 5
for a module of the cascade). It creeps, rushes and slaps flat.

**The landing.** `theta = PI - 0.042 e^(-0.42 n) |sin(PI n / 3.6)|` for the
n frames after it: a rebound of a degree or two and a smaller one, settled
by the eighth frame. The world under it shows through the rebound.

**The catch.** In link 6 the pane trembles from frame 936: an amplitude
growing from a degree to about five, two incommensurate sines and a hashed
jitter, then the fall from 962.

**The geometry.** Solved per pixel in the full resolution composite. The
camera stands about 4200 px in front of the frame, so the pane's swelling
toward the lens stays under 1.3 times and its free edge stays in the frame.
For a pixel, intersect its ray with the pane's plane, `n = (0, sin theta,
cos theta)`; the hit's distance from the hinge gives the row (from the seam)
on the pane, and which side faces the camera gives front or back. Front and
back of a world pane are the same picture, so the mirrored world lands
upright; a card's back is the next card's lower half.

**Light.** Before the dither, the falling world is a tone darker as it faces
away from a key light about 35 degrees above, and brighter again as its
back comes round; the half below takes the pane's shadow, traced toward the
same light, with a penumbra growing with distance. Up to 16 samples of the
angle across a 180 degree shutter are averaged in linear light, only while
the pane moves fast.

**The DOM.** The phone and the clock are crisp HTML over the canvas; the
same intersection gives the screen row the falling pane has reached, and
the phone's wrapper is clipped there (`clip-path: inset(...)`), so the pane
covers the phone exactly as it covers the world.

## 6. The flood

**The shape.** `hash3`, `noise` and `spreadMap` copied verbatim from
`app/src/wall/PixelStory.jsx` (SPREAD 2; `smooth = d + 7 noise(x, y, 19, 1) +
2.6 noise(x, y, 7, 2)`; `v = smooth + 3.4 (hash3(i, j, 3) - 0.5)`;
normalised over the region), with their provenance in a comment. Three
changes, each declared: `d` is a distance measured along each world's paths
(a Dijkstra pass over the blocks on a speed field: fast along the aisle and
the windows, the beam, the lamp rows, the city grid, the cone, the bench and
the window), the lattice sizes are scaled to the frame, and it steps every
frame (the product's 40 ms steps judder at 30 fps).

**The arrival.** Each block's normalised value is its arrival frame inside
the flood's 36 frames, eased as the product eases a wash (quick at the
phone, slower into the corners, the hinge last). The thresholds are a
texture in the writer's cell grid.

**The swap.** At its arrival frame a cell's palette changes from night to
the letter's colour. Its tone does not change. The cells within a cell of
the front are a tone brighter (the product's fresh front), and the front's
edge is ranked by the same blue noise the dither uses, so it fizzles a cell
wide in lobes.

**The sound.** The page counts the cells turning on each frame; the studio
writes those counts out, and the score lays one dry flip-disc tick per cell
at that density, panned by where the cells are.

## 7. The figures

The product's bodies (`scenes/rig.js`: `HIM` at 180 cm and `HER` at 165,
`withHair`, `solve`, `ik`, `solid`, `flat`, `camera`, `chains`, `breath`,
`aim`), posed per frame in `scenes/bench.js`'s format (a root, a yaw, two
joints of spine, neck, head, shoulders, and arms and legs that reach by
inverse kinematics) by `page/round-cast.js`. Poses change on twos. Key poses
are taken from reference footage of people doing these things (standing in a
bus aisle, packing a guitar, reaching for a lamp's chain, leaning on a
parapet, waiting at a crossing in a hood, working at a bench).

`rig.camera` is orthographic, and an over the shoulder shot needs the near
shoulder larger than the far hand, so a small perspective variant of
`flat` scales each primitive by focal length over depth. The figures are
filled into a mask canvas at twice the cell resolution (main figure, second
figure, props, the near occluder), mipmapped, and read by the world's
program: the body is a tone 0 shape, lit at the rim from the gradient of the
blurred mask toward the key light and toward the phone, with a soft contact
shadow. Hair is `withHair`'s cap; `chains` for anything that swings, settled
from a fixed start so it is the same every time.

## 8. The phone

The studio uses the product's own `Screen`, `ScreenNote` and `Pill`; the
page a faithful copy in plain HTML with the app's own Jersey 10
(`app/public/fonts/jersey-10-normal-400-latin.woff2`, inlined). Laid out
1000 px wide and placed on the hand's quad by `boxOnto` (`wall-gl.js`, a
projective `matrix3d`), never with `will-change`, so Chromium redraws the
text sharp at every size.

| state | the status row | keys | the body |
| --- | --- | --- | --- |
| draft | the aerial, the battery, the count `N/1` | `colour`, `clear` | the words so far, the caret |
| read (link 1 only) | the aerial, the battery, the day | none | `being read`, `it goes up once it passes.` |
| up | the aerial, the battery, the day | `options`, the heart with no count | the letter, no caret |

The words land a word at a time on the sixteenth grid; the whole letter is
laid out from the start with untyped characters clear, so lines never
reflow (as `note-screen.jsx`'s `Typed` does it). Each change eases in over
about a tenth of a second, as a panel's pixels do. The caret is the
product's (`caret.jsx`). An empty battery blinks on the frame clock. The
power on follows `screen.css` for the kind: a lit screen's veil and then its
halo; acid at once; the riso uncovered.

The phone is also an area light in the world shader, at its quad and in its
colour: it lights the writer's hands, hair and sleeve, and it is reflected
in the bus's glass and in omar's puddle.

## 9. The clock

The product's split-flap digits, chalk on dark plates, scaled up and sat on
the hinge. Only the hour drum and the meridiem drum move. A step is the
product's own fold, 130 ms down, 130 ms up, 40 ms still: 9 frames, a dotted
eighth, so the riffles are scheduled back from each landing and the last
step lands on the downbeat. Every CSS animation is off; every transform is
set from the frame.

## 10. Capture

The studio's `scripts/studio-film.mjs` loads the film in Playwright's
Chromium and calls `window.__seek(ms)` for each frame. For round:

- `--enable-unsafe-swiftshader` where there is no GPU (since about Chrome 139
  SwiftShader no longer starts on its own for WebGL), and every frame of a
  film rendered on the same GPU and driver.
- `--force-color-profile=srgb`, and the page's time zone pinned to
  `America/Los_Angeles` (`stampOf` reads local time).
- PNG frames, never JPEG (a JPEG of a dithered frame is a different
  picture). CDP's `Page.captureScreenshot` with `optimizeForSpeed` for
  speed.
- Integer hashes everywhere (a `fract(sin(x))` hash differs between GPUs),
  every CSS animation and transition off inside the film, fonts and tiles
  awaited before the first frame, `chains` settled from a fixed start.
  Playwright's `page.clock.install()` as a second guard on time.
- Determinism checked: five random frames rendered in two sessions must be
  identical, and frame 1152 must equal frame 0.

## 11. Encode

| | settings |
| --- | --- |
| archive | PNG frames; FFV1 with `-pix_fmt bgr0` |
| master | `-vf "zscale=m=709:r=limited:chromal=left:filter=point,format=yuv420p" -c:v libx264 -preset veryslow -crf 12 -tune grain -x264-params deblock=-3,-3:aq-mode=3:no-fast-pskip=1 -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -movflags +faststart` |
| social | the same at `-crf 16 -maxrate 25M -bufsize 50M -g 15 -bf 2 -flags +cgop -level:v 4.2` |

- **Why point chroma**: with left sited chroma (H.264's own), point sampling
  takes each 2 by 2 block's colour from inside one uniform cell, so the
  encode is exact. A decoder's bilinear upsampling still lends a cell's outer
  pixels a quarter of its neighbour's colour; inside one palette that is
  invisible (the tones differ in lightness), and at a flood's edge slight.
- **Never**: `tmix` (averaging dithered frames makes colours that are in no
  palette), `-tune animation` (it raises deblocking and smears cells),
  `lanczos` scaling, the finish's grade or grain on these frames.
- **Instagram** asks for 9:16, at least 30 fps and 720 px, High profile, two
  consecutive B frames, a closed GOP of half the frame rate, 4:2:0, up to 25
  Mbps and 300 MB through its API; it re-encodes everything into several
  versions (AV1 among them), and videos with few views get worse encodes.
  **TikTok** takes H.264 at 23 to 60 fps; turn on its high quality upload.
- **The check**: two seconds of the corner through the social settings and
  through a 720p rescale, decoded, and the share of cells off their four
  tones counted, at 4 px and at 6 px. A private upload of the 6 s cut to both
  platforms before the rest is finished.

## 12. Sound

- **The canon** (ROUND.md, section 11) is written in code from
  `round-time.js`: six voices, entries at bars 3, 7, 11, 15, 19 and 23, the
  ground under them, bar 27's held dominant, the cascade's six notes in bar
  29. A script checks the phrases together and at every join: a chord tone
  on each downbeat, no parallel fifths or octaves in similar motion.
- **The instruments**: clarinet, nylon guitar (with a hummed voice on wren's
  first phrase), bass guitar, cello, marimba, horn. General MIDI programs in
  MuseScore General through FluidSynth for the sketch; the clarinet, cello,
  horn and marimba replaced with VSCO 2 CE and VCSL samples through
  `sfizz_render` for the master.
- **The foley** is made in code in the Node mix from `events()`: the dry
  click of each landing, the hinge's rattle, the flood's ticks, the clock's
  folds, the soft keys, the lamp switches, the latches, the crossing's tick,
  the bus passing poles and lights, the stop chime, rain, wind, the oven.
- **The loop**: the notes humanised once and played twice end to end, the
  second pass kept, so every tail wraps into the start; 38.4 s is 96 beats
  and 1,843,200 samples at 48 kHz. No fades.
- **The master**: two pass `loudnorm` (I -14, TP -1.5, LRA 11), the second
  pass with the first's measurements and `linear=true`, then `-ar 48000`
  (loudnorm works at 192 kHz in its dynamic mode). No platform publishes a
  loudness target for Reels or TikTok; -14 is the common reference.

## 13. The studio build

Made after the script is approved, on a branch that has the studio
(`claude/campaign-studio`, whose product code is main's but for one export
in `art.jsx`).

**Files.**

- `app/src/studio/films/round.jsx`, and `round-15.jsx`, `round-6.jsx`,
  `round-45.jsx` for the cutdowns (sequences of the film's frames from
  `CUTS`, not remaps of time); `films/round-wall.jsx`, a one frame sheet of
  the six letters photographed into an atlas, as `wall-atlas.jsx` is.
- `app/src/studio/parts/`: the page's modules promoted (`round-time.js`,
  `blue.js`, `round-flood.js`, `round-worlds.js`, `round-gl.js`,
  `round-cast.js`), and `round-phone.jsx` (the real `Screen` on `boxOnto`),
  `round-clock.jsx` (`.wl-flap` driven by the frame), `round-wall.jsx`,
  `round.css` (every animation off inside the film).
- `scripts/score-kit.mjs` (the machinery of `studio-score.mjs`, extracted,
  with the first film's WAV unchanged to within -90 dB),
  `scripts/studio-score-round.mjs`, `scripts/round-check.mjs`.

**Changes to the studio's scripts.**

| script | change |
| --- | --- |
| `studio.mjs` | `--force-color-profile=srgb`, `--enable-unsafe-swiftshader`, the page's `timezoneId` and `locale` |
| `studio-film.mjs` | `--frames` writes PNG (`--format png`, today JPEG at 96); no `lanczos` in the mp4 path; encoder presets (`--enc dither`, `--enc social`); `--check-loop` compares frame 1152 with frame 0 |
| `studio-reel.mjs` | reads the film's `ms` and `fps` from the registry; `--fps`; `--score <script>` or `none`; `--audio <wav>`; `--mix none` (no `tmix` unless the film asks for it); `--finish none`; `--grain`; `-frames:v` exact; the audio cut to the film's length; `--master` for the FFV1 archive |
| `studio-finish.mjs` | every stage optional (`veil`, `halation`, `grade`, `amp`); the final conversion with an explicit matrix |
| `studio-score.mjs` | its machinery moved to `score-kit.mjs`; round's score is its own script |

One existing fault found on the way: the reel's finish converts to YUV with
swscale's default BT.601 matrix and writes no colour tags, so players
guess. Kept as it is for the first film until it is re-rendered; round uses
the explicit matrix.

**The order.** The clock and its table; the dither, palettes and plateau
curve on test ramps at 4 and 6 px; the flap on flat test worlds; the clock;
the rig, the masks and the rim; the phone; world 1 with bars 1 and 2; the
flood and its ticks; worlds 4, 5, 3, 2 and 6, in order of risk; the contact
sheet, the cascade, the end card and the loop; the score; the encode checks;
the cutdowns. Stills are looked at after every step (LOOK.md, section 8).

## 14. The checks

`page/round-table.mjs` checks the clock now; `scripts/round-check.mjs` will
check the film:

- every event on a whole frame, and every letter's words standing at least
  as long as the product's reading pace needs (20 characters a second);
- the stamps right for Pacific time;
- every pixel of a still frame outside a falling pane one of its palette's
  four tones;
- a world's tone map identical before and after its flood;
- the frame a pane lands identical to the world beneath it;
- frame 1152 identical to frame 0, and two sessions identical;
- the spine at x 702 in every link's frame;
- the canon's harmony;
- the clack's onset within 5 ms of its frame;
- the master's loudness and true peak.

## 15. Sources

Dither and pixels: Surma, ["Ditherpunk"](https://surma.dev/things/ditherpunk/);
Lucas Pope's [devlog](https://dukope.com/devlogs/obra-dinn/tig-32/);
Rune Skovbo Johansen, [Dither3D](https://github.com/runevision/Dither3D);
Christoph Peters, [blue noise](https://momentsingraphics.de/BlueNoise.html)
and its [generator](https://github.com/MomentsInGraphics/BlueNoise) (the
textures' own CC0 statement could not be confirmed); NVIDIA,
[STBN](https://github.com/NVIDIA-RTX/STBN); EA,
[FAST](https://github.com/electronicarts/fastnoise); the
[Game Boy Camera](https://gbdev.io/pandocs/Gameboy_Camera.html); Rehman and
Evans on [dither flicker](https://jivp-eurasipjournals.springeropen.com/articles/10.1155/2010/625191);
Björn Ottosson, [Oklab](https://bottosson.github.io/posts/oklab/); Fabien
Sanglard, [fizzlefade](https://fabiensanglard.net/fizzlefade/); Joe Huckaby,
[canvascycle](https://github.com/jhuckaby/canvascycle).

Light, rain, smoke: Sun et al. 2005,
[a practical analytic single scattering model](https://www.ri.cmu.edu/publications/a-practical-analytic-single-scattering-model-for-real-time-rendering);
Pegoraro and Parker 2009,
[physically based single scattering](https://diglib.eg.org/handle/10.2312/CGF.v28i2pp329-335);
Sébastien Lagarde's rain series, [summarised at 3DVF](https://3dvf.com/actualite-5676-sebastien-lagarde-simulation-pluie-en-jeu-video-html/);
Evan Wallace, [WebGL Water](https://github.com/evanw/webgl-water) (MIT);
Pavel Dobryakov, [WebGL fluid](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)
(MIT); [jsexp](https://github.com/pmneila/jsexp) (BSD 3); Inigo Quilez's
[articles](https://iquilezles.org/articles/); Stefan Gustavson,
[webgl-noise](https://github.com/stegu/webgl-noise); libretro's
[shaders](https://github.com/libretro/glsl-shaders) (`crt-lottes`, `lcd3x`
and `dot` public domain; the handheld Game Boy and `simpletex_lcd` GPL;
`lcd-grid-v2` without a licence).

Libraries: [GSAP's licence](https://gsap.com/community/standard-license/) and
[it going free](https://webflow.com/blog/gsap-becomes-free);
[anime.js](https://www.npmjs.com/package/animejs);
[Motion](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md);
[three.js](https://github.com/mrdoob/three.js/releases) and its
[WebGPURenderer](https://threejs.org/manual/en/webgpurenderer);
[pixi filters](https://github.com/pixijs/filters);
[Paper shaders](https://github.com/paper-design/shaders);
[VFX-JS](https://github.com/fand/vfx-js); [lygia](https://lygia.xyz);
[HyperFrames](https://github.com/heygen-com/hyperframes);
[Revideo](https://github.com/midrender/revideo);
[HTML in Canvas](https://github.com/WICG/html-in-canvas);
[WebGPU's support](https://web.dev/blog/webgpu-supported-major-browsers).

Platforms: [Instagram's video specifications](https://help.instagram.com/1038071743007909);
[TikTok's media transfer guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide);
[Playwright's browsers](https://playwright.dev/docs/browsers).

The film's references, with what is taken from each, are in LOOK.md.
