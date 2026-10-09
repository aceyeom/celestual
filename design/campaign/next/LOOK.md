# the look of round

How round should look, and what it must never look like. For anybody who
touches a frame: the shader, the poses, the type, the grade, the edit.
[ROUND.md](./ROUND.md) is the script and [MAKING.md](./MAKING.md) the
build; this is the eye.

It was put together from three surveys of the field made for this film
(pixel and low resolution craft; art, film, photography and motion design;
web libraries and real time techniques), read against the product's own
pictures (`app/src/wall/scenes/`, `looks.js`, `screen.css`) and pacific's
frames, which the owner chose. Above everything else here: the film has to
look authored. It must never look generated.

One thing the surveys agreed on: dithering and ASCII renderers are this
year's tutorial trend, so the dither is not what makes round distinctive.
What makes it distinctive is the world building: the light, the weather,
the people, the mechanism of the flap and the colour, and the restraint.

---

## 1. Twelve rules

**1. Light first, quantise last.** Every world is lit as a photograph is,
in linear light, by its own practical light (the street lights, the spot,
the lamps, the city, the street light, the sun through a window), and only
then reduced to four tones. The tones describe light, never surfaces. Only
the key light reaches the top tone; the rest of a room lives in the two
darkest (Octavi Navarro's rooms). *Check: cover the key light with a thumb;
the frame should go nearly to two tones.*

**2. Dither as little as possible.** Lucas Pope's rule for Obra Dinn. A
plateau tone curve holds most of the frame on flat single tones, and the
pattern appears only where light falls off: round a lamp's pool, at the
edge of a beam, in the cloud. A frame that is speckled edge to edge is a
filter. *Check: at least half the cells of any still sit inside a flat field
of one tone.*

**3. The pattern stands still.** The blue noise is fixed to each world (in
composition space, with an offset of its own) and never redrawn; a still
world is identical frame to frame. Moving layers (the streets past the bus)
carry their own pattern with them, moving in whole cells with an even pixel
remainder (the snap and remainder of pixel art cameras). Boiling noise is
what cheap video processing and generated video look like. *Check: two
consecutive frames of a still world differ only where something moved.*

**4. Colour is an event.** Nothing in a world wears a letter's colour
before that letter goes up (Simogo's "Lorelei and the Laser Eyes":
monochrome until colour means something). The grey is the product's neutral
`night` all night long; the night's progress is told by light, never by
tinting.

**5. The flood is a palette event.** Mark Ferrari animated whole scenes
without redrawing a pixel, by changing the palette under them. The flood is
the same: each cell's tone stays where it was and only its palette swaps,
grey to colour, at its own arrival time, behind a crest one tone up. It only
adds; it never fades back (Fischinger's "Motion Painting No. 1", built
stroke on stroke). It is never a dissolve or a tint laid over the picture.

**6. The spine.** One vertical line at x 702 crosses the seam in every frame
of the film, carried by a real thing in each world (the bus's grab pole, the
spot's pipe, the reading room's column, the roof's beacon mast, the street
light's pole, the bakery's window mullion). Each split frame reads as one
image, and every flap lands on a line that was already there (Saul Bass's
grid that becomes a building; Nike "You Can't Stop Us", every pair joined
across the cut). The spine is always a thing, never a drawn line, never
glowing.

**7. A canon of gestures.** In McLaren and Munro's "Canon" the inverted
voice is a man printed upside down. Here each person looks up once above
(inverted, as somebody) and once below (upright, as a writer), on the same
frame as the person across the seam, so at every flood two people who do
not know each other turn toward each other. The gesture is always
motivated: wren looks up from her case, hugo at the dark row, sol at a tired
woman in the aisle.

**8. People on twos, machines on ones.** Figures change pose every other
frame; light, flaps, rain and colour every frame. People are faceless,
seen from behind, read by posture and weight (Jim Campbell: the least
information that still carries feeling; Julian Opie's walkers; Hammershøi's
and Friedrich's backs; the blank faces of "Sword & Sworcery"). Key poses
come from reference footage of real people doing these things. Breathing is
a tone edge moving, not a body inflating.

**9. Many small loops, out of phase.** Kirokaze's scenes never visibly
repeat because a dozen tiny loops of different lengths run over a still
picture. Every loop in round has a length that divides the film's 1152
frames (9, 16, 18, 24, 32, 36, 48, 64, 72, 96, 128, 144, 192, 288, 384,
576), so the picture never repeats inside the film and the film still loops
exactly (John Whitney's differential dynamics). Most lights are steady and a
few restless; most of the frame holds still. Nothing moves just to move.

**10. Specific, never "a city".** Waneella builds her streets from real
ones; specificity is the strongest signal that a person made a picture.
Berkeley's own rhythms: the storefront spacing on the bus's route, the line
of the hills from the flats, the bay and the bridge's lights from a roof.
No landmark that would suggest a school or a sponsor.

**11. Honest screens.** The phones are the product's screens exactly, plus
what a real panel does: each change eases in over about a tenth of a second.
No dither on a phone (Pope's "Mars After Midnight": fine detail dies on a
small screen; bold flat shapes live). No CRT anywhere, ever. Type lives only
on lit things: the phones, the clock's plates, the bus's sign, the end
card's lit cells.

**12. One rule broken once.** The machine keeps perfect time except once:
before the flap that closes the round the hinge catches and trembles for a
whole bar. In Ophüls' "La Ronde" the carousel that carries the story stalls
once; that stall is where the feeling is.

## 2. Where it comes from

### The shape of the story

| reference | what is taken |
| --- | --- |
| Arthur Schnitzler, "Reigen" (1897), and Max Ophüls, "La Ronde" (1950), [Criterion](https://www.criterion.com/films/573-la-ronde) | a chain of people, each scene sharing one with the next, closing on the first; a machine (Ophüls' carousel) that turns the chain, and stalls once |
| Zbigniew Rybczyński, "Tango" (1980), [ZKM](https://zkm.de/en/node/63339) | thirty six looping people in one room who never collide: the contact sheet, six worlds alive at once, each in its own loop |
| Rybczyński, "New Book" (1975), [Torino Film Festival](https://www.torinofilmfest.org/en/21-torino-film-festival/film/nowa-ksiazka-new-book/6585/) | one city in nine panels at one time: six places, one night, readable at once |
| Richard Linklater, "Slacker" (1990) | the story handed from person to person by contact, never by a cut: the letter is the contact |
| Fischli and Weiss, "The Way Things Go" (1987), [Afterall](https://afterall.org/publications/fischli-and-weiss-the-way-things-go); Honda "Cog" (2003), [about it](https://en.wikipedia.org/wiki/Cog_(advertisement)) | every event caused by the last: the colour reaching the seam is what lets the flap go |
| Jim Jarmusch, "Night on Earth" (1991), [Alternate Ending](https://www.alternateending.com/2022/10/night-on-earth-1991.html) | a wall of clocks all reading the same minute: every scene at fourteen minutes past |
| Mike Figgis, "Timecode" (2000), [Film Comment](https://filmcomment.com/article/time-code-review) | four stories at once, the sound mix choosing where to look: the newest voice leads |
| M. C. Escher, "Day and Night" (1938) | link 6 is exactly it: dawn below, dusk above, mirrored |

### Visual music and the canon

| reference | what is taken |
| --- | --- |
| Norman McLaren and Grant Munro, "Canon" (NFB, 1964), [TIFF](https://cfe.tiff.net/content/films/canon) | a canon shown with bodies; inversion as a figure upside down: the mirrored recipient |
| McLaren, "Pas de deux" (1968), [TIFF](https://cfe.tiff.net/content/films/pas-de-deux) | echoes that catch up with a held pose: the cascade, where six notes meet in one chord |
| McLaren, "Synchromy" (1971), [about it](https://en.wikipedia.org/wiki/Synchromy) | see what you hear, and nothing else reacts: no audio visualiser anywhere |
| Oskar Fischinger, "An Optical Poem" (1938), [Canyon Cinema](https://canyoncinema.com/catalog/film/?i=5214); "Motion Painting No. 1" (1947), [MoMA](https://www.moma.org/collection/works/315486) | a picture that only builds: the flood only adds |
| John Whitney, "Arabesque" (1975), [Visual Music Archive](https://visualmusicarchive.org/works/w/arabesque.html) | elements at whole multiples of one speed fall apart and come back together: every loop divides 1152 frames |
| Mary Ellen Bute, "Synchromy No. 4: Escape" (c. 1938), [Canyon Cinema](https://canyoncinema.com/catalog/film/?i=5269) | colour escaping a grid as the whole drama: the flood is light leaving the phone |
| Lucinda Childs, Philip Glass and Sol LeWitt, "Dance" (1979), [INDY Week](https://indyweek.com/culture/art/lucinda-childs-sol-lewitt-philip-glass-transform-concert-dance-postmodern-masterpiece/) | the double at another scale: the person above is a different size in a different world |
| Anne Teresa De Keersmaeker, "Fase" (1982), [Rosas](https://www.rosas.be/en/projects/1123-violin-phase) | the round should leave a trace, never a diagram |
| "Sumer is icumen in" (13th century) | the oldest round in English is six parts over a ground |

### Light

| reference | what is taken |
| --- | --- |
| Saul Leiter, "Early Color" (Steidl, 2006) | through steamed and rain beaded glass, most of the frame dark, one colour found in the scene: the bus |
| Edward Hopper, "Nighthawks" (1942), [Art Institute of Chicago](https://www.artic.edu/articles/471/acquiring-nighthawks); "Automat" (1927), [about it](https://en.wikipedia.org/wiki/Automat_(Hopper)); "Early Sunday Morning" (1930) | a lit room in the dark; ceiling lights doubled in a black window (the bus); low first light raking across a street (the bakery) |
| Fan Ho, "Approaching Shadow" (1954), [Arquitectura Viva](https://arquitecturaviva.com/articles/fan-ho) | one hard wedge of light, a small figure at its edge: the café |
| Todd Hido, "House Hunting" (2001), [Blind](https://www.blind-magazine.com/en/news/todd-hido-a-hunter-of-light/) | "a certain light in a window": the city from the roof as lit windows, each a somebody |
| Gregory Crewdson, "Twilight" (1998 to 2002), [Avant Arte](https://avantarte.com/insights/articles/gregory-crewdson-25-years-of-twilight) | stillness and one practical light: the roof's beacon |
| Christophe Jacrot, "Paris in the Rain", [Hyperallergic](https://hyperallergic.com/rainy-cityscapes-christophe-jacrot); Ernst Haas, [Magnum](https://www.magnumphotos.com/arts-culture/ernst-haas-early-color-images-of-new-york/) | reflections in water and glass: the puddle is the one place the mirror is real |
| Rinko Kawauchi, "Illuminance", [Aperture](https://aperture.org/editorial/reprint-illuminance-rinko-kawauchi/) | wonder in small incidental things: flour in a beam and tired hands, never a sunrise view |

### Pixels and dither

| reference | what is taken |
| --- | --- |
| Mark Ferrari's colour cycling, through Joe Huckaby's [canvascycle](https://github.com/jhuckaby/canvascycle) (code MIT; the art is Ferrari's and is not used); his scenes that changed through the night, [Seize the Day](https://obscuritory.com/software/seize-the-day/) | the flood as a palette event; rain, steam and the oven's glow moved by cycling a ramp |
| Kirokaze, [DeviantArt](https://www.deviantart.com/kirokaze) | many tiny loops out of phase over a still painting |
| Waneella, "Pixelscapes", [Thames and Hudson](https://www.thamesandhudson.com/products/waneella) | real streets, rigorous perspective, deliberate light |
| Octavi Navarro, "Midnight Scenes", [Buried Treasure](https://buried-treasure.org/2020/07/midnight-scenes-the-highway-special-edition/) | monochrome restraint and one theatrical key light |
| Slynyrd, [Pixelblog 1: colour palettes](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes) | hue shifted ramps (weighed, and declined: section 7) |
| Pedro Medeiros, [pixel art tutorials](https://blog.studiominiboss.com/pixelart); Paul Robertson, [about him](https://en.wikipedia.org/wiki/Paul_Robertson_(animator)) | strong key poses; small moving highlights that make a few pixels live |
| Lucas Pope, "Return of the Obra Dinn", [PlayStation Blog](https://blog.playstation.com/archive/2019/10/17/lucas-pope-on-return-of-the-obra-dinns-art-style), [devlog](https://forums.tigsource.com/index.php?topic=40832.msg1363742); "Mars After Midnight", [devlog](https://dukope.itch.io/mars-after-midnight/devlog/261758/mars-after-midnight) | the pattern fixed to the world; dither as little as possible; bold shapes on small screens |
| "The Last Night" (Odd Tales), [E3 2017](https://techraptor.net/content/e3-2017-the-last-night-presentation-details) | light creates the drama; pixels placed in space and lit |
| "Kingdom", its water as described on the [Godot forums](https://godotforums.org/d/35281-2d-water-kingdom-details) | a mirror that is never quite still: the rows by the seam ripple |
| "Superbrothers: Sword & Sworcery", [CDM](https://cdm.link/inside-handheld-game-art-the-art-style-and-making-of-swords-sworcery-superbrothers-pixel-cinema/) | blank faces, elongated figures, large fields of one colour: the roof |
| "Lorelei and the Laser Eyes", [Simogo](https://simogo.com/work/loreleiandthelasereyes/asa-lorelei-and-the-laser-eyes/) | black and white until colour means something |
| "Octopath Traveler", HD-2D, [Siliconera](https://www.siliconera.com/project-octopath-traveler-developers-answer-project-started-troubles-developing-hd-2d/) | real lights with pools in a low haze; depth by tone, never by blur |
| the pixel art camera's snap and remainder ([UPixelator](https://github.com/Radivarig/UPixelator_Documentation), [Bevy's example](https://bevy.org/examples/2d-rendering/pixel-grid-snap/)) | the bus's streets move in whole cells with an even pixel remainder, never resampled |
| Rune Skovbo Johansen, [Surface-Stable Fractal Dithering](https://github.com/runevision/Dither3D) (MPL 2.0) | the model to reach for if anything crawls |
| the Amiga's copper bars, [raster bars](https://en.wikipedia.org/wiki/Raster_bar) | the roof's cloud as horizontal bands whose thresholds undulate a row at a time |

### Mechanical pixels and light art

| reference | what is taken |
| --- | --- |
| Solari di Udine, [about it](https://en.wikipedia.org/wiki/Solari_di_Udine); Gino Valle's "Cifra 3" (1965), [MoMA](https://www.moma.org/collection/works/4399); Oat Foundry, [Untapped Cities](https://www.untappedcities.com/oat-foundry-will-make-you-an-old-school-split-flap-board/) | the flap: gravity, the slap, the rebound, passing every card between, a sound that says something changed |
| BREAKFAST's flip-discs, [CLOT](https://clotmag.com/oped/when-sculpture-transcends-form-a-view-on-new-media-artist-collective-breakfast-by-silvia-iacovcich), [Critical Playground](https://criticalplayground.org/breakfast-studio-and-andrew-zolty/); [flip-disc displays](https://en.wikipedia.org/wiki/Flip-disc_display) | the flood heard as discs turning, a dry tick per cell |
| Daniel Rozin, "Wooden Mirror" (1999), [video](https://vimeo.com/7820888) | only what must change moves, with a clatter |
| Jim Campbell, "Day for Night", [his site](https://www.jimcampbell.tv/portfolio/day-for-night), "Ambiguous Icons", [Whitney](https://whitney.org/collection/works/13823) | walking reads best in low resolution; never hold a figure still |
| Julian Opie, "Bruce and Sarah Walking", [RAC St. Louis](https://racstl.org/public-art/this-is-bruce-and-sarah-walking/) | posture traced from life, detail removed, the walk kept |
| ART+COM, "Kinetic Rain", [Institute for Public Art](https://instituteforpublicart.org/case-studies/kinetic-rain) | two halves that mirror, complement and answer each other: our top and bottom |
| Pixar's zoetrope, [The Kid Should See This](https://thekidshouldseethis.com/post/pixar-zoetrope); Toshio Iwai, [AWN](https://www.awn.com/animationworld/pre-cinema-toys-inspire-multimedia-artist-toshio-iwai) | the loop as a turntable, never a crossfade |
| Studio Drift, "Shylight", [Dutch Design Awards](https://dutchdesignawards.nl/en/gallery/shylight) | lamps as performers: the reading room |
| Ryoji Ikeda, "test pattern", [YCAM](https://special.ycam.jp/datamatics/en/testpattern.html) | one frame exact hit of sound and picture per landing; looser everywhere else |
| Universal Everything, "Walking City", [their site](https://www.universaleverything.com/art/walking-city) | one unchanging pulse holding everything that changes: the ground (its morphing look is not taken) |

### Title, motion and craft

| reference | what is taken |
| --- | --- |
| Saul Bass, "North by Northwest", [Art of the Title](https://www.artofthetitle.com/title/north-by-northwest) | a grid of lines becoming a building's glass: the line carried across the seam |
| Pablo Ferro, "The Thomas Crown Affair", [Art of the Title](https://artofthetitle.com/title/the-thomas-crown-affair) | discipline: two worlds at a time until the end, so six at once is earned |
| Kuntzel+Deygas, "Catch Me If You Can", [Art of the Title](https://artofthetitle.com/title/catch-me-if-you-can) | letters fused into the picture and timed to the score: type only on lit things |
| Dave Whyte, [Bees and Bombs](https://beesandbombs.tumblr.com); [perfect loops](https://bjango.com/articles/processingperfectloops/) | one shape with timing delayed by position: the flood's delay grows with distance |
| Michel Gondry, "Star Guitar", [about it](https://en.wikipedia.org/wiki/Star_Guitar); "Come Into My World", [befores and afters](https://beforesandafters.com/2026/03/24/olivier-gondry-on-the-making-of-kylie-minogues-come-into-my-world/) | the passing world keeps time from a cue sheet; one layer added per entry, none removed |
| Nike "You Can't Stop Us" (W+K, Oscar Hudson), [Colossal](https://www.thisiscolossal.com/2021/04/nike-you-cant-stop-us/) | every pair of halves continuing one movement across the line |
| Spotify "Spreadbeats" (FCB New York), [D&AD](https://www.dandad.org/work/annual/behind-the-work/how-fcb-new-york-turned-an-excel-file-into-a-music-video) | honour a medium's real limits literally: the Series 40 screen |
| Hornbach "The Square Meter" (HeimatTBWA), [Muse](https://musebyclios.com/advertising/hornbach-created-an-amazing-world-that-measures-a-single-square-meter/) | build the vertical frame as a stacked mechanism, never a cropped landscape |
| Telstra "Better on a Better Network" (Bear Meets Eagle On Fire), [shots](https://shots.net/news/view/cannes-lions-2025-film-craft-digital-craft-industry-craft-and-design-winners) | people animated on twos |

## 3. A board for each world

Palettes are darkest first; the `night` four are `#131313 #6E6E6E #9D9D9D
#EFEFEF` for every world until its letter goes up.

### 1. the 51B, 5:14 pm

- **Colour**: night, then amber `#1B140B #9D763F #E0A95A #FAF1E5`.
- **Light**: the passing street lights (keyed), the ceiling strip (fill);
  the strip and the phone doubled in the dark glass.
- **Frame**: over sol's right shoulder in the aisle; the window band across
  the upper half; the woman asleep in the window seat beyond the pole; the
  phone at the left.
- **The spine**: the grab pole.
- **Signature**: condensation drops as thin lenses, each with a small upside
  down street, over long shutter streaks; light through the drops sweeping
  the seats as each street light passes.
- **Loops**: poles every 36 frames, street lights every 72, drops sliding on
  64, 96 and 128 out of phase; the woman's sway 48; sol's breath 96.
- **On ones**: the streets, the drops, the light. **On twos**: sol, the
  woman.
- **Never here**: rain on the glass (the evening is clear; the glass is
  steamed from inside), neon, bokeh discs.

### 2. the café, 9:14 pm

- **Colour**: night, then acid `#050505 #2D4104 #5A8602 #8ACE00` (the
  product's own picture steps for the lime square: no white).
- **Light**: one spot (key), the street through the window (a dim fill),
  passing headlights.
- **Frame**: over wren's shoulder on the riser's edge, the case open beside
  her, the wedge of light across the empty stage, chairs on tables beyond.
- **The spine**: the spot's hanging pipe.
- **Signature**: the beam in closed form; motes flaring only on its axis;
  the mic stand's long shadow.
- **Loops**: motes 96 and 128; headlights every 72; the spot's faint flicker
  on 18 and 32, rarely.
- **Never here**: stage haze everywhere, a lens flare in the spot.

### 3. the reading room, 11:14 pm

- **Colour**: night, then green `#14160D #72834B #A3BB6B #F0F4E7`.
- **Light**: twelve green shaded lamps, each with its pool; then only the
  phone; then the lamps again, green.
- **Frame**: over hugo's shoulder at the end of a row, two rows of tables
  receding to tall windows.
- **The spine**: a column between the windows.
- **Signature**: the filament domino: a fast fall, an ember of 150 to 300 ms,
  the pool dropping a tone; depth by tones in the haze.
- **Loops**: the haze drifting on 384; the lamps are events, not loops.
- **Never here**: depth of field, dust everywhere.

### 4. the roof, 1:14 am

- **Colour**: night, then ice `#11161A #64819A #8FB8DC #EDF4F9`.
- **Light**: the city below; the cloud lit from beneath; the beacon.
- **Frame**: at eye height over pia's shoulder at the parapet; the city to
  the bay; most of the frame one tone of sky.
- **The spine**: the beacon mast.
- **Signature**: windows twinkling at heavy tailed rates; copper bar cloud;
  steam by curl noise.
- **Loops**: windows on 16, 48 and 144 (most never change); the beacon every
  72; the cloud bands 288 and 576; steam 64 and 96.
- **Never here**: a drone's view, a skyline that could be any city.

### 5. the corner, 3:14 am

- **Colour**: night, then violet and yellow `#572E00 #5A3DA8 #F7C200
  #F4F0E4` (the riso's overprint, violet, yellow, paper), the yellow drum a
  third of a cell out of register.
- **Light**: one street light. Rain only inside its cone, brighter
  backlit.
- **Frame**: over omar's hooded shoulder at an empty crossing; the puddle at
  his feet holding him upside down; the signal's hand.
- **The spine**: the street light's pole.
- **Signature**: the puddle mirror with ripple rings; rain sheets moved by
  cycling a ramp.
- **Loops**: drips 9, 16 and 36; rings 24 and 48; the lamp's buzz 18 and 32,
  restless; the rain's cycle 16; the locator tick every 30 (once a second).
- **Never here**: neon signs reflected in wet streets (the most generated
  night city there is), cars, steam from manholes.

### 6. the bakery, 7:14 am

- **Colour**: night, then rose `#1B1215 #9C677B #DF93AF #FAEEF2`.
- **Light**: the oven's glow, then the first sun raking through the window.
- **Frame**: over yuna's shoulder at the steel bench, the phone propped on a
  flour bin, racks of loaves, the window east.
- **The spine**: the window mullion, then the edge of its shadow in the beam.
- **Signature**: flour hanging in the beam with fading trails; steam off the
  loaves; the oven's flicker by cycling.
- **Loops**: flour 128 and 192; steam 96; the oven 9, 24 and 36.
- **Never here**: the sun as a disc, a sunrise view, warm light leaking into
  the night palette before the rose.

## 4. The machine's look

- **The flap** is a real thing: it creeps, then rushes, slaps flat on the
  beat, rebounds a degree or two; it goes a tone darker as it tilts from the
  light; its shadow crosses the half below before it lands; its cells are
  the world's own, foreshortened crisply. Blurred only while fast. The one
  place in the film where cells change size is the falling card, because it
  is a card.
- **The flood** reads as a station board turning to a new colour: a crest
  one tone up, a ragged front in lobes, a fizzle one cell wide, never a
  circle, never a gradient, never a dissolve.
- **The seam** is a surface: two or three rows of cells either side ripple
  when a greeting appears and when a flap lands.
- **The clock** is the product's split-flap digits, chalk on dark plates,
  small, at the left of the hinge above the phone. Only the hour moves.
- **The phone** is crisp, lit and exactly the product's. Its glow lights the
  hands and hair and shows in glass and water; nothing else in the frame is
  that bright.

## 5. The end's look

Six small worlds, two across and three down, each 64 by 57 cells of the
same 6 px: honest pixels, never shrunk, each in its colour, each alive. They
turn into the six letters a panel an eighth, like a board settling. Then the
line, then the lockup, both set whole on their downbeats, no animation at
all: after a film of moving parts, the end is still. The letters are the
product's screens exactly; nothing in the end card is decoration.

## 6. What it refuses

The generic look is the averaged look: what a generator gives back when
asked for "cinematic", "moody", "night city", "retro". Each of these is
refused on sight.

**Post-processing**: bloom, god rays, lens flares, bokeh, haze laid over
everything, tilt shift, chromatic aberration, RGB split, glitch, datamosh,
pixel sorting, VHS, scanlines, CRT curvature, film grain that boils. They
read as a filter over a picture instead of light in a world, and four tones
expose every one of them.

**Motion**: a slow push in on every shot (the default of generated video),
drifting cameras, morphing or melting transitions, infinite zooms, a city
that folds over itself (the cliché version of our mirror: ours is a hinge,
never a bend), the same ease on every move, everything moving at once with
no holds, a loop that crossfades back to its start.

**Texture and colour**: mesh, grain and liquid metal gradients (the hero
backgrounds of landing pages since 2024), Bayer crosshatch and ASCII
renderers (this year's tutorial trend), teal and orange, neon rain on wet
streets, synthwave grids, pink and cyan, generic cyberpunk, straight colour
washes laid on as a tint.

**Type**: centred, widely spaced capitals fading up; a light sweeping across
a logo; evenly timed typewriter reveals; letters that stagger in one by one;
text that scrambles into place; bouncing words; smoothed, rotated or
fractionally scaled pixel type.

**People**: faces lit blue by a phone, a cast smiling at camera, glowing
lines or particles joining people, detail everywhere with no focal light,
a centred symmetrical hero with the background blurred.

## 7. Declined, and why

| idea | why not |
| --- | --- |
| hue shifted ramps (Slynyrd), a grey that drifts warm to cold through the night | beautiful, but colour must arrive as an event, and the twelve colours are the only hues |
| accents of each earlier letter's colour in the later worlds | the same: the accumulation lives in the score and the contact sheet instead |
| signal bars that move with each voice ("Synchromy") | the product removed its signal bars on 24 September; never draw them |
| multi-tap typing | the writers hold touch phones; the screen is a Series 40 look, not a Series 40 phone |
| halftone or riso screening | two screens fighting the blue noise make moiré; the riso stays a palette |
| CRT shaders | the phones are LCDs |
| film grain | it boils, and boiling is the look of processed video |
| a sunrise view | Kawauchi: the light, not the view |
| HTML in Canvas (drawing the DOM phone into the world's texture) | a flagged, moving API; the phone is modelled as a light instead, which gives the same reflections |
| three.js, WebGPU compute, particle libraries | nothing at 180 by 320 cells needs them, and their defaults are the stock look |
| a riffle through all six worlds at the loop | fast full frame changes break the three a second rule and read as a recap |

## 8. How a frame is judged

Every style frame and every rendered still is looked at as a picture,
against this list, and reworked: three rounds at least.

1. Is there one key light, and does only it reach the top tone?
2. Is at least half the frame flat single tones?
3. Is the pattern still where nothing moves?
4. Is the spine there, at x 702, as a real thing?
5. Is anything wearing colour that has not earned it?
6. Could this be any city? If so, what one detail would make it Berkeley?
7. Is anything on the refusals list in it?
8. Does anything move that has no cause?
9. Is the type only on lit things, at whole pixels?
10. Would a person who makes pixel art for a living think a person made it?

## 9. A note on the sources

The surveys were made on 8 October 2026. Several sites (surma.dev,
dukope.com, runevision.com, momentsingraphics.de, nfb.ca and others) could
not be reached from where they were made, so some claims rest on GitHub
sources, publishers' and museums' pages, or search excerpts. Licences quoted
in MAKING.md were read from the projects' own licence files. Nothing from a
work with a non-commercial licence (Shadertoy's default, NVIDIA's STBN,
lygia's Prosperity licence) is copied into the film; such work is studied
and the maths written fresh.
