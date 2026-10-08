# pacific

The second film, script B. Thirty two seconds, 1080 by 1920, 30 frames a
second (each the two of sixty laid over each other, as the first film's
thirty is), twelve bars at 90 beats a minute in E major, mastered to -14
LUFS. Made the way the first film was made (`app/src/studio/`, photographed a
frame at a time, cut to a score written from the same clock), in a new world.

`design/DESIGN.md` and `design/VOICE.md` are the law, and
`design/campaign/BRIEF.md` (on `claude/campaign-studio`) is how the campaign
reads them. This file is what this film keeps from them and the one rule it
stretches on purpose.

---

## 1. The idea

**It's already tomorrow where they are.**

Theo is in Berkeley. Mina went home to Seoul. Seoul is sixteen hours ahead
(seventeen in the winter), so when it is night for him it is the next
afternoon for her: they live on
different days now. Each still keeps the other's city on their phone, so
the weather is the one thing they still share: on his phone at night,
Seoul's sun; on hers in the afternoon, Berkeley's fog. Each writes a note
and sends it privately. On Saturday at 9pm Pacific, which is 1pm on Sunday
in Seoul, both phones turn rose on the same frame, and the rose runs out
through both of their worlds until the line between their days is gone. The
notes say the same thing from either side of the ocean:
`i still check the weather in seoul.` and
`i still check the weather in berkeley.`

The fact under it is the product's own and the least told: a mutual reaches
both people at the same moment, wherever each of them is.

## 2. Why this, after the first film

| | the first film | pacific |
| --- | --- | --- |
| what it is about | one person's night | two places at one instant |
| whose it is | lin's, and kai's for a bar | the planet's: it cuts and splits between them as if it could be in both places at once, which is what the reveal does |
| the world | the black room, lit screens, a hall of letters | the whole sky, night and day in one frame |
| how the world is drawn | screens photographed in the dark | the world drawn the way the product draws a person: as a picture on a screen, dithered in four tones of the screen's ink |
| the register | looking back | holding a breath until nine |
| the sound | a song with its words sung | a phase piece: one figure played on two sides of the ocean, drifting apart and locking into one on the stroke of nine |
| the end | the name lit under a question | the line between their days bending into the mark's ring |

`docs/ULTIMATE-PRODUCT-FRAMEWORK.md` keeps one finding for content: anticipation
spreads and melancholy does not. This film is a countdown in disguise.

## 3. The perspective

The planet's. Neither of them is the hero. The film is a camera that can be
in two places at once: it goes through one person's phone into the other
person's sky, and when it matters it holds both cities in one frame, the
right way up and upside down, facing each other.

## 4. The world: the rules

1. **Two worlds, two inks.** Berkeley is night, drawn in ice. Seoul is day,
   drawn in amber. Each is lit first as a photograph would be (a sun and
   its glare, a moon and its halo, fog lit from below by a city, the glitter
   on a river), then brought down to four tones of its screen colour, the
   lit screen's own steps from `looks.js` (ink at 12 percent of the hue,
   low at 70, the hue, and lit at the hue taken 84 percent to white):

   | | ink | low | mid | lit |
   | --- | --- | --- | --- | --- |
   | ice, Berkeley | `#11161A` | `#64819A` | `#8FB8DC` | `#EDF4F9` |
   | amber, Seoul | `#1B140B` | `#9D763F` | `#E0A95A` | `#FAF1E5` |
   | rose, from nine | `#1B1215` | `#9C677B` | `#DF93AF` | `#FAEEF2` |

   The dither is ordered by blue noise (a 64 by 64 void and cluster mask
   made once in code, never a bitmap), on cells of 3 px: 360 by 640 across
   the frame. DESIGN.md 2.5 draws every face the product shows this way
   ("a person is a picture on a screen ... dithered ... in four tones of the
   screen's ink"). This film draws the whole world that way, which is the
   rule it stretches, and the reason it looks like nothing else: it is the
   product's own hand, at the size of a sky.

2. **The phones are not dithered.** A phone is the one thing drawn as itself:
   the real `Screen`, lit and crisp, the bright thing in its frame, with
   its own light laid over the dither as `Light` lays a screen's light on
   the black. Each phone shows the other city, so each is lit in the other
   one's colour: theo's glows amber in the ice night (her sun); mina's glows
   ice in the amber afternoon (his fog). Each of them carries the other's
   light in their hand.

3. **The rose is the mutual's.** Nothing is rose until nine. At nine the
   rose runs out of each phone through its whole world, a palette step at a
   time, as a wave with a bright leading edge (the product's own: the
   backlight turning "in a wave from the couple to the glass's edges",
   `turn.js`), until both worlds are rose.

4. **The weather is a door.** On each phone the other city's weather is a
   glyph drawn on the screen's own grid in the manner of `PIX` (a sun, a
   bank of fog with the moon behind it). The camera goes through a glyph
   and comes out in the sky it stands for: the glyph's lit cells and the
   real sun, or the fog's bands, lined up in place and size on the cut.

5. **The two cities face each other.** When the film is in both places at
   once the frame is split across its middle: Berkeley the right way up
   below, Seoul turned over above, so the two skies meet in the middle of
   the frame and the two of them sit at its two ends, looking toward each
   other through them. The seam is the line between their days.

6. **The words stand on the horizon.** In a shot of one city the horizon is
   set at y 760 and the caption stands on it. In a split shot the caption
   is set on the seam, its first line in Seoul's sky in ink and its second
   in Berkeley's in chalk; a caption of one line straddles the seam, every
   letter ink above it and chalk below. Newsreader display 500, lowercase,
   96 px, line height 0.94, tracking -0.022em, flush left at x 80. On the
   phones, Jersey 10.

7. **The dither is the grain.** The finish keeps the veil and the halation,
   round the sun and the phones, and lays no grain over the dither.

8. **The camera moves like a camera.** Slow pushes, a crane down over Seoul,
   a drift over Berkeley. The doors are the only fast moves, and they are
   falls, not whips.

**What it must never look like:** Google Earth; a spinning globe; an
airplane or its window; a map with a dotted line across an ocean; a travel
advert; generic pixel art; a lens flare.

## 5. The cast

They are the bench telling's own two (`scenes/bench.js`), as it seats them
at its first moment, apart: he looking up at the moon, she sitting up, her
hair tied with the ribbon. The same `bodiesAt(t, f)` that script A adds
lays each on its own pad.

| | theo | mina |
| --- | --- | --- |
| where | Berkeley: on a low stone wall on the hill above the campus, the bay below | Seoul: on the wide steps down to the Han |
| at the reveal | Saturday, 9:00 pm | Sunday, 1:00 pm |
| his, her phone | lit amber: `seoul`, a sun, `66°` | lit ice: `berkeley`, the fog, `13°` |
| the note | `i still check the weather in seoul.` | `i still check the weather in berkeley.` |

His phone gives Seoul's weather in Fahrenheit and hers gives Berkeley's in
Celsius: the same afternoon, 19 degrees, in his units. Nobody needs to
notice. Somebody will.

## 6. The clocks

The reveal is Saturday at 9pm Pacific. Seoul is nine hours ahead of UTC all
year. Berkeley is seven behind until Sunday 1 November 2026, and eight
behind from then until Sunday 14 March 2027. So the moment is Sunday 1:00
pm in Seoul while daylight time lasts, and Sunday 2:00 pm after it. The film
is rendered for the dates it runs (`SEASON=pdt` or `SEASON=pst`); nothing but
the faces of the clocks changes.

| when | Berkeley | Seoul, until 1 November | Seoul, from 1 November |
| --- | --- | --- | --- |
| the week begins (shots 1 to 6) | `tue 11:04 pm` | `wed 3:04 pm` | `wed 4:04 pm` |
| the minute (shot 8) | `sat 8:59 pm` | `sun 12:59 pm` | `sun 1:59 pm` |
| the reveal (shot 9) | `sat 9:00 pm` | `sun 1:00 pm` | `sun 2:00 pm` |

## 7. The script

90 beats a minute: a beat is 666.7 ms and a bar 2666.7. Twelve bars,
1920 frames at sixty. Every cut lands on a beat and every sound is on the
frame of the thing it is the sound of.

| # | ms (bar) | the picture | the words | the sound |
| --- | --- | --- | --- | --- |
| 1 | 0 to 2667 (1) | **his phone.** Black, and close already: theo's phone in the dark, square to the camera, lit amber. The weather, the phone's own screen: the aerial, `seoul` and the battery on the status row; in the middle of the glass a sun of 15 by 15 cells, its rays blinking on the screen's 1060 ms; `66°` under it at the large size; `wed 3:04 pm` under that; `options` and `back` on the keys. The amber light falls on the black round it. The camera is falling into the sun from the first frame, scale 1 to 30 on a curve that does not slow. By beat 3 one lit cell of it is the frame, and on beat 3, cut: the real sun, dithered, at that place and size, blazing in an amber sky. On beat 4 the camera pulls back off it and Seoul opens out underneath | none | the room in Berkeley; the fog horn far off on the bay, one long low note with its grunt at the end. On the cut, daylight: wind, a city far off, and the marimba's figure starting, Seoul's |
| 2 | 2667 to 5333 (2) | **Seoul.** A Wednesday afternoon in amber. The Han, wide and bright, its glitter in lit cells; a long low bridge running away to the left on its piers; the far bank's slabs of flats with their windows in a grid; Namsan on the right with the tower on it; the mountains pale behind. The camera cranes down out of the sky to the wide steps on the near bank, where mina sits two thirds of the way down the frame, from behind, her hair up and the ribbon in it, her phone in her lap lit ice: the one cool thing in the warm world | `it's already tomorrow` / `where they are.` | the marimba's figure; wind; a magpie, three calls, on beat 3 |
| 3 | 5333 to 8000 (3) | **her phone.** Over her shoulder, close: her phone in the sun, her other hand cupped over it as anybody shades a screen. The glass is ice: `berkeley` on the status row, the fog (three bands of cells with a crescent behind the top one), `13°`, `tue 11:04 pm`. The glare slides across the glass. On beat 3 the camera falls into the fog, its bands fill the frame, and on beat 4, cut: the fog itself, in the dark, in ice, three bands of it rolling over the Berkeley hills where the glyph's bands were | none | the marimba thins to every other note. On the cut the fog horn, nearer, and the vibraphone's figure, Berkeley's, a beat behind the marimba's |
| 4 | 8000 to 10667 (4) | **Berkeley.** Tuesday night in ice. The fog pours over the ridge and down through the trees. Below, the campus, the Campanile through the fog with its clock lit, the flats' lights, the bay black, a bridge's lights in a line across it, the city far off. The camera drifts down onto the hill above the campus, where theo sits on a low stone wall from behind, looking up at the moon, his phone in his hand lit amber: the one warm thing in the cold world | none | both figures, a beat apart and drifting, shimmering against each other. The fog horn on the downbeat |
| 5 | 10667 to 13333 (5) | **his note.** Close on theo's phone, square: a private note's screen, lit amber, `dear mina` across its top, the pen, the characters left. `i still check the weather in seoul.`, the first words there on the cut and the rest typed at a hand's pace to beat 3. On beat 4, `send`, and the screen says `sent privately.` and dims | `send it privately.` | the phone's keys on the sixteenths; the send, two notes on the music box |
| 6 | 13333 to 16000 (6) | **her note.** Mina's phone in the sun, a private note lit ice, `dear theo`: `i still check the weather in berkeley.` already written. Her thumb on `send` on beat 2; `sent privately.` | `they only read it` / `if they send you one too.` | the send; the figures; a low pad comes in on E |
| 7 | 16000 to 18667 (7) | **the week.** The camera pulls back from her phone and the world turns over: Seoul swings up and over to hang in the top half, Berkeley rises the right way up into the bottom, and the two skies meet in the middle of the frame. Time runs. In each half the light goes round, a day every two beats, out of step with the other: a sun crosses Seoul's sky while the moon crosses Berkeley's, the fog comes and goes. In each half's outer corner the day, in Jersey: Seoul's turns first every time, `thu` above while it is still `wed` below, and so on to `sun` above and `sat` below | on the seam, `every mutual is revealed` in Seoul's sky, in ink, and `on saturday at 9pm pacific.` in Berkeley's, in chalk | a soft tick and a breath of air for each day turning, Seoul's first; the two figures closing on each other; the pad rising |
| 8 | 18667 to 21333 (8) | **the minute.** It stops. Above, upside down, Seoul at 12:59 on Sunday: mina on the steps, her phone face up on the step beside her, asleep. Below, Berkeley at 8:59 on Saturday: theo on the wall, his phone face up beside him, asleep. The clocks in the outer corners, `sun 12:59 pm` and `sat 8:59 pm`, and their seconds on the beats: 57, 58, 59. Nothing moves but the fog, the river's glitter and her hair | the clocks only | the two figures alone, now less than a sixteenth apart, every note a double strike. The magpie on beat 2, the horn on beat 3. On beat 4 everything drops out but one note |
| 9 | 21333 to 24000 (9) | **nine.** On the downbeat both phones wake on the same frame, rose; the clocks read `sun 1:00 pm` and `sat 9:00 pm`. From each phone the rose runs out through its world, a wave with a bright edge stepping through the four tones: up the steps and over the river and the city and into Seoul's sky toward the seam; up the wall and through the fog and into Berkeley's sky toward the seam. The two edges reach the seam together on beat 3 and the seam goes, a line of lit cells and then nothing: one rose sky from the top of the frame to the bottom | on both phones, the product's own: `it's mutual.` | the two figures land on each other: unison. The band comes in, strings, choir, bass, a soft kick. The fog horn and the magpie on the same downbeat |
| 10 | 24000 to 26667 (10) | **both notes.** Cut to one phone held square in the rose: the keepsake. The mark crowning the glass with `it's mutual.` in its cells, `mina & theo` under it, and the two notes, `i still check the weather in seoul.` `from theo` and `i still check the weather in berkeley.` `from mina`. Whose phone it is does not matter: it is the same on both | `you both find out` | a line over the figure on the strings, four notes |
| 11 | 26667 to 29333 (11) | **the same moment.** Back to the two cities, both rose, still facing each other. Theo lifts his head; mina lifts hers. In Berkeley's sky, low in the west over the bay, a young crescent moon; in Seoul's afternoon, low in the east, the same crescent, pale. It is true of a moon about five days old: at that instant it hangs over the ocean between them, setting for him and risen for her. The two hang either side of the seam, and as the camera drifts in on the middle of the frame they come together into one disc | on the seam, straddling it: `at the same moment.` | the cadence coming |
| 12 | 29333 to 32000 (12) | **the mark.** The one moon draws in and becomes the star, its four arms drawing out; the seam, which was the line between their days, tilts to -19 degrees and bends round it into the ring (`mark.js`, the Ecliptic's own constants, which are a sun and its path); the rose world steps down to the room's black in three steps of its palette, and the mark is the pixel mark (`brand.js` `MARK`) at 8 px a cell, chalk, with the close bloom a lit thing has. The word draws on beside it a column at a time: the lockup at 6 px a cell, on the words' margin, `celestual.us` under it in Geist Mono | `celestual.us` | the marimba and the vibraphone strike E5 together on the downbeat and ring; the horn once more, very far; nothing by 32 s |

**The three frames somebody screenshots:** the pixel sun on a phone at night
opening into an afternoon sky (1); the two cities facing each other with
their skies meeting in the middle (7, 8); the rose running through both
worlds at once and the seam going out (9).

## 8. The score

A phase piece. One figure, played on two sides of the ocean by two players
who cannot hear each other: the marimba in Seoul, the vibraphone in
Berkeley. They start a beat apart. Berkeley's plays a little fast, so it
creeps up on Seoul's a sixteenth a bar, and on the way the two make
patterns neither plays, a shimmer that keeps changing. On the downbeat of
nine they land on each other and are one. It is the time zone, played; and
it is a countdown nobody has to be told is one.

**Tempo and key.** 90 beats a minute, 4/4, E major and its C sharp minor.

**The figure** (first draft, tuned by ear in the first round). Sixteen
sixteenths, a bar, B4 on a three, three, two pattern under a line:

`B4 E5 F♯5 · B4 G♯5 E5 · B4 C♯6 · B4 G♯5 F♯5 · B4 E5 D♯5 · B4 F♯5`

**The phase.** The marimba starts on the cut into Seoul (beat 3 of bar 1)
at 90 and never moves. The vibraphone comes in on the cut into Berkeley
(beat 4 of bar 3) four sixteenths behind. From the downbeat of bar 4 it
plays at 94.5, which over the five bars to the downbeat of bar 9 gains it
exactly the four sixteenths, so it arrives on the marimba's downbeat on the
frame both phones turn rose, and from there it plays at 90, in unison. The
score writes every note's moment from that, so nothing is approximate.

**The form.**

| bar | what plays |
| --- | --- |
| 1 | the horn, far; from beat 3, the marimba |
| 2 | the marimba; wind; the magpie |
| 3 | the marimba thinning; on beat 4 the vibraphone, a beat behind |
| 4 to 6 | both, drifting; the keys and the two sends; the pad from bar 6 |
| 7 | both, closing; a tick and a breath of air for each day turning |
| 8 | both, less than a sixteenth apart; the magpie, the horn; the last beat all but empty |
| 9 | unison; strings, choir, bass, a soft kick; the horn and the magpie together |
| 10 and 11 | unison, the band, a line of four notes on the strings over it |
| 12 | E5 on both, once, ringing; the horn, very far |

**The instruments**, numbered from 0 as `studio-score.mjs` numbers them:
marimba (12, Seoul), vibraphone (11, Berkeley, motor off), the music box
for the sends (10), fretless bass (35), the slow strings (49), choir aahs
(52), a warm pad (89), a soft kick from the room kit (8, drums). The fog
horn and the magpie are synthesised in Node and written into the score on
their frames: the horn two sawtooths an octave apart on E2 through a low
pass, a slow swell, and its fall to B1 at the end; the magpie three calls
of band passed noise between 2.5 and 4 kHz, 70 ms each, falling in pitch.
The phone's keys are the first film's.

**The mix and the master**, as the first film: one stem an instrument, a
room convolved round it, the horn and the magpie panned to their cities
(Berkeley a little left, Seoul a little right, as the frame has them when
they are side by side in the cutdowns), loudnorm in two passes to -14 LUFS
with the true peak at -1.5 dB.

## 9. The cutdowns

| cut | bars | words |
| --- | --- | --- |
| 15 s | 1 (the door into Seoul); 2 (mina); 8 (the minute); 9 (nine); 10 (both notes); half of 12 (the name) | `it's already tomorrow where they are.`; `send it privately. they only read it if they send you one too.` on the minute, in two lines on the seam; `it's mutual.` on the phones; `you both find out at the same moment.` |
| 6 s | half of 8 (the clocks at :58, :59); 9 (nine); the end of 12 (the name) | `at the same moment.` |
| 4:5 feed | all 12 bars, cropped to the middle 1350 rows (y 285 to 1635); in the split shots the seam stays in the middle of the crop | the captions keep the seam; in a shot of one city the horizon moves to y 475 of the crop |

The cover frame for the reel is shot 8: the two cities facing each other,
both phones asleep, `sat 8:59 pm` and `sun 12:59 pm`.

## 10. How it is built

The pipeline is the first film's: a clock file the picture and the score
both read, a film drawn from `t`, photographed by `scripts/studio-film.mjs`
in shares, the score written from the same clock, one ffmpeg pass to
finish.

| file | what it is |
| --- | --- |
| `app/src/studio/parts/pacific-time.js` | the clock: 90 bpm, every moment above in ms, `SEASON` and the clock faces it gives, the vibraphone's phase |
| `app/src/studio/parts/world-gl.js` | one WebGL2 program drawing either city in linear light: the sky and its sun or moon; clouds; the far ridges; the skylines as signed distance shapes (Seoul's slabs with their window grids, the tower on Namsan, the long bridge on its piers; Berkeley's hills, the Campanile with its lit clock, the flats' lights, the bay, a bridge's line of lights, the city far off); the water (Seoul's glitter, the bay's reflections); the fog, a domain warped noise drifting in from the west and lit from below by the city; and the figure, as a mask, lit as a silhouette with a rim from what is in front of it. Out: the light, and where the sun and the clock face are |
| `app/src/studio/parts/dither.js` | the light to four tones: the blue noise mask, 3 px cells, the three palettes; the rose's wave from each phone (a radius, its edge a tone brighter); the turn of Seoul's half and the seam |
| `app/src/studio/parts/weather.jsx` | the weather on `Phone mode="bare"`: the glyphs (the sun, the fog, the moon) on the screen's grid as `PIX` draws its glyphs, the city on the status row, the temperature and the clock in Jersey 10 |
| `app/src/studio/parts/bench-inks.js` | shared with script A: the bench telling's two bodies, each on its own pad, here at the telling's first moment, with his head and hers lifted a few degrees in shot 11 |
| `app/src/studio/parts/pacific.jsx` and `films/pacific.jsx` | the film, scene by scene, from `t` |
| `scripts/studio-score-pacific.mjs` | the phase, the band, the horn and the magpie, written against `pacific-time.js` |
| `scripts/studio-finish.mjs` | as it is, with the grain off (`amp: 0`): the dither is the grain |

`SEASON=pdt node scripts/studio-reel.mjs pacific` makes it: sixty frames a
second, laid two at a time into the thirty, as the first film's are.

**Live plates, if they are wanted.** The dither will take any camera's
picture and make it the product's: footage from a phone on the steps of the
Han in the afternoon and on the hill above Berkeley at night, run through
the same `dither.js` pass, with the phones composited over it by the
projective transform the first film used for lin's phone. The figures are
then real people from behind. The drawn cities are the default because
they need nobody to be anywhere.

**The visual loop, as the brief asks.** Shots 1 (at the cut), 2, 4, 8 and
9 (on beat 3) are the style frames: rendered as stills, looked at as
pictures, changed, rendered again, three rounds at least before a frame of
the film.

## 11. What could go wrong, and the test that settles it

| risk | the test |
| --- | --- |
| The time difference is half the idea. If it does not read, the film is two pretty cities | Show the 15 s cut, sound off, to five people. Ask where each of the two is and what time it is for each. Three should get both |
| Seoul upside down reads as a mistake, or as a reflection | Render shot 8 two ways, turned and the right way up (Seoul simply above), and show both to the same five people. Keep the turn only if it reads as two places facing each other |
| A dither on a feed's encoder | Upload the 6 s cut privately to Instagram and TikTok and watch it on two phones. If 3 px cells go to mush, go to 4 |
| Two cities is the larger build of the two scripts | The cities are made to read in silhouette; if time is short each is four layers (sky, one skyline, the water, the figure), because the dither forgives detail. Or live plates (section 10) |
| The season | Render with the `SEASON` of the dates the film runs. The clock faces are the only thing that changes |
| Long distance is a narrower story than a crush on campus | It is the film for the people far apart, and the truest picture of "at the same moment". For a campus, script A is the film |

## 12. What it claims, and what each claim stands on

| on the frame | stands on |
| --- | --- |
| `it's already tomorrow where they are.` | the scene: Seoul is sixteen hours ahead of Berkeley in daylight time. Not a claim about the product |
| `send it privately.` | VOICE.md 2: a note to somebody is sent privately |
| `they only read it if they send you one too.` | BRIEF.md 5, the facts: a private note is read only if they send you one back |
| `every mutual is revealed on saturday at 9pm pacific.` | the facts: the reveal is Saturday, 9pm Pacific |
| `sun 1:00 pm` beside `sat 9:00 pm` | the same instant, UTC+9 and UTC-7; `sun 2:00 pm` from 1 November |
| `it's mutual.`, `you both find out`, `at the same moment.` | BRIEF.md's lines, and the product's own: "you both find out at the same moment" (README) |
| the weather screens | the phone's, not celestual's. Celestual has no weather, and nothing on those screens says celestual |
| `mina & theo` | first names, never a handle |

No numbers, no handles, no "only a hash", no banned word, no exclamation
mark, no dash.

## 13. The levers, for refining

- **The city.** Any city already on Sunday at 9pm Pacific works the same way:
  Seoul or Tokyo (1pm), Taipei, Shanghai, Manila or Singapore (noon), Sydney
  (mid afternoon), each an hour later from 1 November. New York is the other
  kind of version: there it is midnight, and the reveal lands on the very
  moment their Saturday ends.
- **The moon.** Shot 11 needs a waxing crescent about five days old, which
  at 9pm Pacific is over the ocean between them: low in Berkeley's west and
  low in Seoul's east. In the autumn it sits low in both skies and in the
  spring it rides high in both. By day it is faint, and the film draws it
  pale. If the film is dated to a real Saturday, pick one in that phase.
- **Her note in Korean.** `아직도 버클리 날씨 확인해.` with the English under it in
  italic, as the cafe poster set its two notes. Celestual sets Korean in
  its own pixel face (`scripts/fetch-cjk.mjs`).
- **The notes.** Two sentences that are the same sentence from either side
  are the payoff. Others in that shape: `i still keep your city on my
  phone.` from both.
- **The names.** Any two first names.
- **The turn.** Seoul turned over above Berkeley, or both the right way up
  (section 11).
- **A sung line.** Wordless on purpose. If it wants a voice, the choir in bar
  9 can carry two words on the figure's top notes: `same moment`.
