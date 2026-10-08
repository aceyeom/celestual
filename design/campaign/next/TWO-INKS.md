# two inks

The second film, script A. Thirty seconds, 1080 by 1920, 24 frames a second
with the prints on twos, fifteen bars at 120 beats a minute in F major,
mastered to -14 LUFS. Made the way the first film was made (`app/src/studio/`,
photographed a frame at a time, cut to a score written from the same clock),
from a different material.

`design/DESIGN.md` and `design/VOICE.md` are the law, and
`design/campaign/BRIEF.md` (on `claude/campaign-studio`) is how the campaign
reads them. This file is what this film keeps from them and the one rule it
bends on purpose.

---

## 1. The idea

**A private note is one ink. A picture needs both.**

Two people, each printed in their own ink: iris in rose, jun in ice. Alone,
each print is half a picture: a woman on a bench at night, leaning her head
on a shoulder that is not there; a man on the same bench resting his cheek
on hair that is not there. Each of them sends theirs privately, and the
press takes both inks and prints nothing. On Saturday at nine the press
runs. The sheets that only ever had one ink come out blank, and nobody ever
knows. The one that had both comes out whole: her head on his shoulder, his
cheek on her hair, and where they touch, a colour neither ink had. It's
mutual. Then the registration mark in the corner of the sheet slides into
register, and becomes the mark.

Somebody who sees it once can explain celestual to a friend: it only prints
if you both send one.

## 2. Why this, after the first film

| | the first film | two inks |
| --- | --- | --- |
| what it is about | a feeling: a note is a light | the mechanism: two inks, one press |
| whose it is | lin's, and kai's for a bar | nobody's; it is the picture's |
| the material | lit screens in the black room | ink on paper, in daylight |
| the register | looking back (`do they still think about you?`) | looking forward (`next time`) |
| the sound | a song with its words sung | a hocket: one tune split between two players, each half full of holes until both play |
| the end | the name lit under a question | the registration mark coming into register as the mark |

`docs/ULTIMATE-PRODUCT-FRAMEWORK.md` keeps one finding for content: anticipation
spreads and melancholy does not (Berger and Milkman). The first film is
beautiful and sad. This one is warm, and it is about a moment that is coming.

## 3. The perspective

The press's. The film never goes inside either of them. It watches what
celestual does with what they send: it sees both halves, which neither of
them can, and it prints only when there are two. That is the double blind,
drawn as a machine.

## 4. The world: the print rules

**Every frame is a print.** Not a filter over a render: each frame is a
sheet of paper that went through a two drum risograph, photographed on a
copy stand. The product already owns this material (looks.js, `violet /
yellow`: "two drum inks laid a hair out of register on warm paper"). This
film takes it out of the phone and makes it the whole world.

1. **The paper and three inks.** Nothing else is ever on the frame.

   | | value | prints |
   | --- | --- | --- |
   | paper | `#F4F0E4` | the riso screen's own paper (looks.js) |
   | rose | `#DF93AF` | iris, her note, her petals. The rose screen's hue |
   | ice | `#8FB8DC` | jun, his note, his petals. The ice screen's hue |
   | black | `#0A0A0C` | the world: the bench, the trees, the press, every word, the lockup |
   | rose over ice | about `#7D6A97` | only where the two of them touch, and at the end the two targets |

   Inks multiply, as inks do: each filters the paper, so rose over ice is
   rose times ice, channel by channel. Nothing is ever lighter than paper,
   so a light is drawn as paper left bare in a field of ink (the moon, the
   scanner's bar).

2. **Screens.** Rose at 75 degrees, ice at 15, black at 45, round dots at a
   pitch of 7 px with the camera at 1 (about 154 across the frame), coarse
   enough to survive a feed's encoder and to read as dots on a phone. Above
   78 percent the dots join and print solid, with the drum's mottle in the
   solid. Dot gain 6 percent. A dropout, a speck of bare paper where the
   ink did not take, about one dot in eight thousand.

3. **A hair out of register.** Each print puts rose and ice up to 1.5 px
   from true and black up to 1 px, in a direction of its own. In the
   product the riso's second drum is "a hair out of register"; here every
   sheet is.

4. **Twelve prints a second.** A new sheet every second frame: its own
   registration, its own ink (density times 1 plus or minus 0.06), its own
   fibres. That boil is the film's life. Nothing else wobbles: no shake,
   no wiggle, no rubber hose.

5. **The figures are the product's own.** The bench telling
   (`app/src/wall/scenes/bench.js`): her (`HER_UP`, the ponytail and the
   ribbon) and him (`HIM`), posed by `rig.js` at the telling's own moment
   of 5800 ms, her head resting on his shoulder and his cheek on her hair,
   each laid on its own `Pad` at ten cells to the intro's one (941 by 741),
   so the rose holds only her and the ice holds only him. Laid together
   they overlap in one band about a tenth of the picture wide, from her
   temple on his shoulder down her side against his: that band is the only
   rose over ice in the film. The boards, the moon, the treeline and the
   branch are the telling's own `bench` and `scenery`, in black. Their
   breath runs on (the telling's own `breath`), so a held print is alive.
   The style frame on the treatment page is drawn from exactly these
   masks.

6. **The words are printed.** Every caption is in the black ink on the
   sheet in the shot: it boils with the sheet, sits a hair out of register
   with the picture, and goes when its sheet goes. Newsreader display 500,
   lowercase, 104 px, line height 0.92, tracking -0.022em, flush left at
   x 80, its first line's cap height at y 270, never more than two lines.
   The italic is kept for one line, `it's mutual.` The notes are set in
   Jersey 10, in their writer's ink, because a note is the phone's words.
   Slugs and the address in Geist Mono.

7. **The camera is a copy stand.** It looks straight down. Sheets are
   slid in under it on the beat and slid out. Inside the press it rides the
   paper path. It eases (DESIGN.md `--ease`, `cubic-bezier(0.16, 1, 0.3,
   1)`) and drifts a pixel; it never rolls. A cut is a new sheet; nothing
   dissolves.

8. **One bright thing.** On paper the brightest thing is the paper, so the
   one thing the eye is pulled to is the overprint: dark, rare, and where
   they touch.

9. **Every sheet is cut to 9 by 16**, the shape of a phone's glass. With the
   camera at 1 a sheet is the frame.

**What it must never look like:** a halftone filter over a 3D render; a
grunge texture pack; CMYK; a printer's advert; paper with a drop shadow on
a white page; anything "vintage".

## 5. The cast

| | iris | jun |
| --- | --- | --- |
| ink | rose | ice |
| on the bench | the left, leaning right, her head on nothing | the right, his head tilted left, his cheek on nothing |
| the note | `next time i'd sit closer.` | `next time i'd move over.` |

First names only, and on the mutual's print the two of them as the
keepsake names two: `iris & jun` (VOICE.md 2). Never a handle.

The notes are each whole on their own, and neither could have been written
after reading the other. Side by side they meet in the middle, which is
what the picture does.

## 6. The sheets

Every sheet is 1080 by 1920 in its own pixels.

| | where | what |
| --- | --- | --- |
| the targets | (96, 112) and (984, 112), 56 px | a registration target in each ink the sheet carries, and crop marks at the four corners, black, 1 px |
| the caption | from y 270, x 80 to 1000 | printed only on the sheet of the moment that has one |
| the picture | x 40 to 1040, y 600 to 1388 | the bench at night: the sky a black halftone from 55 percent at the top to bare paper at the treeline, the moon bare paper with a halftone halo, the branch black with its blossom in the sheet's ink (or both), the treeline black at 22 percent, the boards solid black with a hair of bare paper round them where they cross a body (the telling's own `air`) |
| the note | x 80, y 1450 | the writer's ink, Jersey 10, 64 px |
| the slug | x 80, y 1556 | Geist Mono 22 px, black: `iris · rose`, `jun · ice` |

The mutual's sheet is laid out as the keepsake is: the picture in both inks;
`it's mutual.` in Newsreader italic 112 px at y 1420; `iris & jun` in Jersey
10, 40 px, at y 1548; and the two notes side by side from y 1620, iris's in
rose at x 80 and jun's in ice at x 580, each 44 px with `from iris` and
`from jun` under it in Geist Mono 20 px. Its lower part is in the feed's
caption zone, and the camera moves up the sheet to read it (shot 10).

## 7. The script

120 beats a minute: a beat is 500 ms and a bar 2000. Fifteen bars, 720
frames, 360 prints. Every cut lands on a beat, every caption comes on a
beat and stays until its sheet goes, and every sound is on the frame of
the thing it is the sound of.

| # | ms (bar) | the picture | the words | the sound |
| --- | --- | --- | --- | --- |
| 1 | 0 to 2000 (1) | **iris.** One sheet, edge to edge, rose and black. The bench from behind at night; iris on its left half, her hair up and the ribbon in it, leaning to her right with her head tilted onto a shoulder that is not there. The right half of the bench is bare. Rose petals come down. The camera eases in from 1.00 to 1.04. The print boils. | her note, on the sheet: `next time i'd sit closer.` | a sheet laid down (0). The marimba, iris's player, alone: her half of the hook, the odd eighths, each note with a rest after it where his should be. A pad on F |
| 2 | 2000 to 4000 (2) | **jun.** On the downbeat a second sheet slides in over the first from the right, four prints across, and stops square. Ice and black: the same bench, the same night; jun on its right half, his head tilted left, his cheek on hair that is not there. Ice petals. | his note: `next time i'd move over.` | the slide. The vibraphone, jun's player, alone: his half, the even eighths, every note on an offbeat answering nothing. The pad to D minor |
| 3 | 4000 to 6000 (3) | **apart.** The camera rises from 1 to 0.42 over two beats and settles: both sheets side by side on the table, which is black at 82 percent, a gap of table 120 px wide between them. She leans out of her sheet toward his; he leans out of his toward hers. They do not reach. Each sheet's slug and targets are readable. | none | the two players take turns, half a bar each, never at once. The bass comes in on F2 |
| 4 | 6000 to 8000 (4) | **send it privately.** The two sheets go face down on the glass (beat 1), the lid comes down, and we are under the glass in the dark: black at 92 percent, and the scanner's bar, a band of bare paper with a soft edge, sweeping the length of iris's sheet (beats 1 and 2) and then jun's (3 and 4), each picture showing through the glass mirrored, only where the bar is. | `send it privately.` | the lid; each sweep a rising filtered tone over two beats; the players hold one long note each |
| 5 | 8000 to 10000 (5) | **the drums.** Inside the press: two drums across the frame, the rose drum above and the ice drum below, each wrapped in its master: her picture, in negative, as rows of tiny holes on the rose drum with the ink wet behind them; his on the ice. They turn a quarter turn over the bar and print nothing. The paper path under them is empty. The press's steel in black halftone round them. | `they only read it` / `if they send you one too.` | the drums' hum, a low tick on each beat. The players: one note each, a beat apart, slow |
| 6 | 10000 to 12000 (6) | **the week.** The press's panel: a small LCD drawn in black with its digits left bare (Jersey 10's cells). On the beats it reads `wed`, `thu`, `fri`, and on beat 4 `sat 8:59 pm`, and holds. | `every mutual is revealed` / `on saturday at 9pm pacific.` | four ticks. A riser over the last two beats as the drums spin up |
| 7 | 12000 to 14000 (7) | **nine.** Beat 1: the panel reads `sat 9:00 pm`. Beat 2: cut to the out tray, top down: the press is running, and sheets come out one a beat and land on the stack: blank, blank, blank. Each a slightly different paper. The second has one line on it and nothing else. | on the second blank sheet: `if it isn't,` / `nobody ever knows.` | the press's ready beep at nine (two short square tones). Then the press at full run: the feed on every beat where a kick would be, the eject on every offbeat, the drums' whirr. No tune |
| 8 | 14000 to 16000 (8) | **two inks.** One sheet goes through the other way. We ride the paper path, top down, the sheet coming up the frame under the two drums. Under the rose drum, iris prints onto it (beat 1). Under the ice drum, jun lands (beat 2), 14 px and 0.8 degrees out of register: the two dot screens beat against each other and a moiré storm rolls across their bodies and out over the whole sheet, slow rosettes and fast bars, for two beats. On beat 3 the ice snaps into register over four prints (14, 5, 1.5, 0.4 px) and the storm falls into the quiet rosette of a print in register. Where her head rests on his shoulder the two inks overprint, and that band is violet. | none | beat 1, iris's player; beat 2, jun's lands with it, and for the first time the two halves interlock and the hook is whole. A shimmer under the storm. Beat 3, the snap: a side stick, a low thump, and the choir on F |
| 9 | 16000 to 18000 (9) | **it's mutual.** The sheet slides out onto the stack and the camera is over it: the whole print. The bench, the moon, the branch; iris and jun together, her head on his shoulder, his cheek on her hair; petals in rose and in ice, and a few violet where two cross; the violet band where they touch. | on the print: `it's mutual.`, and under it `iris & jun` | the band: both players, the bass, strings, the press playing the kit (the feed on 1 and 3, the eject on the offbeats, the snap on 2 and 4) |
| 10 | 18000 to 20000 (10) | **both notes.** The camera slides up the sheet to the notes, side by side for the first time: iris's in rose, jun's in ice, each signed in black mono under it. | `you both find out.` and, on the print, `next time i'd sit closer.` `from iris` / `next time i'd move over.` `from jun` | the hook goes on. A counter line on the strings |
| 11 | 20000 to 22000 (11) | **every dot.** The camera goes straight down into the violet band: the dots grow, rose dots and ice dots and the violet where each pair overlaps, and it keeps going into one violet dot until the dot is the frame, and inside it, printed small and whole, is the same picture. It lands on that picture at the framing of shot 9 on the next downbeat. Every dot of it is the two of them. | none | a long rise in the strings and the choir. The hook, both players |
| 12 | 22000 to 24000 (12) | **the corner.** On the whole sheet again, the camera travels to its top right corner: the registration target, printed once in each ink, the two a few px apart. | none | the band drops to the two players and the pad |
| 13 | 24000 to 26000 (13) | **in register.** The camera goes into the target until it fills the middle third of the frame. The rose ring and cross and the ice ring and cross boil a few px apart; on beat 3 they slide into register with the snap, and over the next six prints they become the mark: the circle tilts to -19 degrees and opens into the ring's band, the cross draws its four arms in to the star's curved sides (`mark.js`, the Ecliptic's own constants), and the two inks give way to black. The last of them is the pixel mark (`brand.js` `MARK`, 33 cells) at 8 px a cell, printed. | none | the snap; the hook's last phrase in both players |
| 14 | 26000 to 30000 (14 and 15) | **the name.** The mark settles to 6 px a cell, and on the downbeat the word prints beside it: the lockup (`LOCKUP`, 112 by 33 cells, 672 by 198 px) at x 80, y 1100, in black, with its clear space. The press slows; the sheet still boils, more slowly as it goes (twelve prints a second down to six). | `nothing happens` / `unless it's mutual.` from beat 1 of bar 14, and `celestual.us` under the lockup in Geist Mono 26 px | bar 14: the hook's last bar, B flat to C. Bar 15, beat 1: both players land on F5 together, the bass on F2, the strings on the chord; the press coasts down, its whirr falling a fifth; the last sheet settles at 29.5 s |

**The three frames somebody screenshots:** the woman leaning her head on a
shoulder that is not there (1); the moiré storm as the second ink lands (8);
the one violet dot that holds the whole picture (11).

## 8. The score

A hocket: one tune split between two players so that each plays only the
notes the other leaves out. Alone, each half is a tune with holes in it,
and the ear hears the holes. Together it is whole. That is the film's idea
in sound, and nobody needs to know the word for it.

**Tempo and key.** 120 beats a minute, 4/4, F major and its D minor. The
press prints a sheet a beat, so from bar 7 the machine is the rhythm
section.

**The hook** (first draft; it is tuned by ear in the first round, as the
first film's was). Eighth notes, a bar each, iris on the odd eighths and jun
on the even:

| bar | chord | the eighths | iris (marimba) | jun (vibraphone) |
| --- | --- | --- | --- | --- |
| a | F | A4 C5 F5 C5 A5 G5 F5 C5 | A4 F5 A5 F5 | C5 C5 G5 C5 |
| b | Dm | A4 D5 F5 D5 A5 G5 F5 D5 | A4 F5 A5 F5 | D5 D5 G5 D5 |
| c | B flat | B♭4 D5 F5 D5 B♭5 A5 G5 D5 | B♭4 F5 B♭5 G5 | D5 D5 A5 D5 |
| d | C7 | C5 E5 G5 E5 C6 B♭5 G5 E5 | C5 G5 C6 G5 | E5 E5 B♭5 E5 |

**The form, bar by bar.**

| bar | what plays |
| --- | --- |
| 1 | iris's half of a, alone. Pad on F. A sheet laid down |
| 2 | jun's half of b, alone. Pad on D minor |
| 3 | iris's half of c on beats 1 and 2, jun's half of d on 3 and 4: turns, never together. Bass in |
| 4 | one long note each; the scanner's two sweeps and the lid |
| 5 | one note each, a beat apart; the drums' hum and tick |
| 6 | four ticks; the riser; the pad B flat to C |
| 7 | the ready beep, then the press alone: feed on the beat, eject on the offbeat, the whirr. The bass holds C, the dominant, so the bar leans on the next |
| 8 | the hook whole for the first time (a), both players; a shimmer under the storm; the snap and the choir on beat 3 |
| 9 to 11 | b, c, d with the band: bass, strings, choir, the press as the kit |
| 12 | a, the two players and the pad alone |
| 13 | b, the players; the snap on beat 3 |
| 14 | c, then C on beat 3 |
| 15 | F on beat 1, everything; the press coasting down; ring out |

**The instruments**, each from the MuseScore General SoundFont as in
`design/campaign/MUSIC.md`, numbered from 0 as `studio-score.mjs` numbers
them: marimba (12, iris), vibraphone (11, jun, motor off), fingered bass
(33), the slow string ensemble the first film used (49), choir aahs (52),
a warm pad (89). The press is foley, synthesised in Node on the
frames it happens and written into the score: the feed (a low thump with a
paper rasp), the eject (a short high rasp), the drums' whirr (band passed
noise with a whine near 1.8 kHz that rises as they spin up and falls a
fifth as they stop), the scanner (a filtered sweep), the lid, the panel's
ticks and its two note beep, and the snap (a side stick with a low thump).
Every note is loosened a little in time and weight, the same way every
time (the first film's `feel`).

**The mix and the master**, as the first film: one stem an instrument, the
band ducking under the feed, a room convolved round it, loudnorm in two
passes to -14 LUFS with the true peak at -1.5 dB.

## 9. The cutdowns

All three cut on bar lines, so the hocket is never cut in a half bar.

| cut | bars | words |
| --- | --- | --- |
| 15 s | 1, 2 (iris, jun); 5 (the drums); 7 (nine, the blank sheets); 8 (the storm and the snap); 9 (the print); then 14 and half of 15 (the name) | `send it privately.` / `they only read it if they send you one too.` on the drums; `saturday at 9pm pacific.` on the panel's frame of bar 7; `it's mutual.` on the print; `nothing happens unless it's mutual.` |
| 6 s | 3 (apart); 8 (the snap); 14 (the name) | `nothing happens unless it's mutual.` |
| 4:5 feed | all 15 bars, cropped to the middle 1350 rows (y 285 to 1635) | the captions set again at y 60 of the crop, so they keep their margin |

The cover frame for the reel is shot 3: the two sheets apart, leaning
toward each other across the table.

## 10. How it is built

The pipeline is the first film's: a clock file that the picture and the
score both read, a film drawn from `t` and nothing else, photographed by
`scripts/studio-film.mjs` in shares, the score written by a score script
from the same clock, and one ffmpeg pass to finish.

| file | what it is |
| --- | --- |
| `app/src/studio/parts/inks-time.js` | the clock: 120 bpm, every moment above in ms, the print index (`floor(frame / 2)`), the seeds |
| `app/src/studio/parts/riso-gl.js` | the press, as one WebGL2 fragment shader: up to four density layers in (rose, ice, black, black's knockouts) and the print's seed; paper and its fibres; each layer screened at its angle and pitch with dot gain, rough edges, solid mottle and dropouts; each offset by its registration; the inks multiplied onto the paper. It works in the sheet's own units, so the camera can go into a dot and find dots, and (shot 11) into a dot and find the sheet |
| `app/src/studio/parts/bench-inks.js` | the bench telling's bodies, one per pad, at a moment and a pitch. A small export added to `scenes/bench.js` (`bodiesAt(t, f)`, the `people` it already draws, kept apart instead of laid together) so the telling stays the one source of the two of them |
| `app/src/studio/parts/press.jsx` | the press's own drawings, as density layers: the glass, the lid and the scanner's bar; the two drums with their masters; the paper path; the panel and its LCD; the out tray and its stack |
| `app/src/studio/parts/target.js` | the registration target and its six prints into the mark, from `mark.js`'s constants, ending on `brand.js`'s `MARK` |
| `app/src/studio/parts/inks.jsx` and `films/inks.jsx` | the film, scene by scene, from `t`, as `parts/reel.jsx` is |
| `scripts/studio-score-inks.mjs` | the hocket and the press, written against `inks-time.js`, played and mixed as `studio-score.mjs` does |
| `scripts/studio-finish.mjs` | as it is, called with the grain light (`amp: 5`, `soft: 0.6`) and the halation off: paper does not glow. A copy stand's soft fall off at the corners, 8 percent |

`node scripts/studio-reel.mjs two-inks --fps 24` makes it: 720 frames, then
the finish. No 60 to 30 mix: the prints are on twos and the moves are slow.

**The visual loop, as the brief asks.** Shots 1, 3, 8, 9 and 13 are the
style frames: render each as a still first, look at it as a picture, judge
it against section 4, change it, render it again; three rounds at least
before a frame of the film is rendered.

## 11. What could go wrong, and the test that settles it

| risk | the test |
| --- | --- |
| The metaphor carries the mechanism. If somebody reads it as a printer, the film has failed | Show the 15 s cut, with the sound off, to five people who have never heard of celestual. Ask what it does. Three should say some form of "it only shows if you both send one" |
| Halftones and a feed's encoder. Dots finer than about 6 px smear, and a platform's rescale can make a moiré of its own | Upload the 6 s cut privately to Instagram and TikTok and watch it on two phones before the 30 s is rendered. If the dots go to mush, go to 8 px |
| The boil tires the eye over 30 s | Render shot 1 at three strengths (0.5, 1 and 1.5 px of misregistration) and pick by eye |
| The storm must not flash | Keep the frame's mean light changing under ten percent from one frame to the next through shot 8 (no more than three flashes a second, WCAG 2.3.1) |
| The overprint is too small to see on a phone | The touch band is about a tenth of the picture wide (measured on the masks). If it does not read in shot 9, the camera starts shot 9 a little closer (1.15) and settles out |

## 12. What it claims, and what each claim stands on

| on the frame | stands on |
| --- | --- |
| `send it privately.` | VOICE.md 2: a note to somebody is sent privately |
| `they only read it if they send you one too.` | BRIEF.md 5, the facts: a private note is read only if they send you one back |
| `every mutual is revealed on saturday at 9pm pacific.` | the facts: the reveal is Saturday, 9pm Pacific |
| `if it isn't, nobody ever knows.` | the facts: if they never do, nobody is told anything, ever. It is the first film's line |
| `it's mutual.`, `you both find out.`, `nothing happens unless it's mutual.` | BRIEF.md's lines |
| the blank sheets | a picture, not a count: four sheets, no number anywhere, and none implied (VOICE.md 4, truth exactly) |
| `iris & jun` | first names, never a handle |

No numbers, no handles, no "only a hash" (BRIEF.md 5), no banned word, no
exclamation mark, no dash.

## 13. The levers, for refining

- **The notes.** They carry the ending. Two that each stand alone and meet in
  the middle. Others in the same shape: `i'd sit closer this time.` / `i'd
  save you the seat.`
- **The names.** Any two first names that fit the slug's line.
- **The telling.** The umbrella (`scenes/umbrella.js`: he runs to her and it
  springs open over them) prints the same way, and then the overprint is the
  umbrella itself, the one thing both of them are under.
- **The inks.** Rose and ice are the screen colours that read on paper and
  overprint to something worth seeing. The product's own riso pair, violet
  and yellow, does not: yellow is too faint on this paper to carry a person.
- **The length.** The 15 s cut is a whole film on its own; if only one is
  made, make that one first and grow it.
- **A sung line.** The first film sang its question. This one is wordless on
  purpose; if it wants a voice, one line in bar 9, on the hook: `it's
  mutual.`
