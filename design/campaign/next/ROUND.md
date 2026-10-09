# round

The next film, written again in pacific's world with a story of its own.
Thirty eight point four seconds, 1080 by 1920, 30 frames a second, thirty
two bars at 150 beats a minute in three, in E flat, mastered to -14 LUFS,
and it never ends: its last frame flips into its first. Made the way the
first film was made (`app/src/studio/` on `claude/campaign-studio`: a
picture drawn from a clock, photographed a frame at a time, a score written
from the same clock).

Read with it:

| | |
| --- | --- |
| [LOOK.md](./LOOK.md) | the look: twelve rules, every reference and what is taken from it, a board for each world, what the film refuses |
| [MAKING.md](./MAKING.md) | how it is made: the tools and techniques weighed, the dither, the flap, the flood, capture, encode, sound, the studio build |
| [page/round-time.js](./page/round-time.js) | the film's clock: every frame in this file comes from it, and `node page/round-table.mjs` prints and checks it |
| [film/round.mp4](./film/round.mp4) | **the final cut**: thirty seconds, four people, with its sound ([film/README.md](./film/README.md) says how to upload it) |
| [treatment.html](./treatment.html) | the final cut with its sound, the same film drawn live and scrubbable, and three held frames |

`design/DESIGN.md` and `design/VOICE.md` are the law, and
`design/campaign/BRIEF.md` (on `claude/campaign-studio`) is how the campaign
reads them.

---

## The final cut

The film as made: **thirty seconds, four people**, in
[film/round.mp4](./film/round.mp4). The script from section 1 on is the long
telling, six people in 38.4 seconds; the final cut keeps its first and last
links and two of the others, closes the loop in one city, and makes every
frame the same way. `CUT` in `page/round-time.js` chooses between them.

| writer | where, when | the letter | colour, battery |
| --- | --- | --- | --- |
| sol | the 51B, 5:14 pm | `dear wren` / `you hum when you think. i hope nobody ever tells you.` | amber, 4 |
| wren | the café, 9:14 pm | `dear pia` / `you sang my grandad to sleep. i was awake.` | acid, 3 |
| pia | the hospital roof, 1:14 am | `dear yuna` / `i don't even like bread.` | ice, 1 |
| yuna | the bakery, 7:14 am | `to the one who always stands` / `you give your seat to whoever looks most tired. last night it was me.` | rose, 4 |

A closed loop in one city: sol hears wren hum at the café; wren sat up with
her grandad on pia's ward; pia buys bread at yuna's bakery after every night
shift; yuna is the woman sol gives the seat to.

**The bars.** 150 a minute in three, 25 bars, 900 frames.

| bars | frames | what |
| --- | --- | --- |
| 1 and 2 | 0 to 71 | the seat on the 51B |
| 3 to 6 | 72 to 215 | sol to wren, amber, with `being read` |
| 7 to 10 | 216 to 359 | wren to pia, acid |
| 11 to 14 | 360 to 503 | pia to yuna, ice |
| 15 to 19 | 504 to 683 | yuna to the one who always stands, rose; the hinge catches at 648 and lets go at 674 |
| 20 | 684 to 719 | the contact sheet: four worlds, two by two, each writer's phone still lit |
| 21 | 720 to 755 | the cascade: flips at 720, 727, 731 and 740, a frame or so off the eighths |
| 22 to 25 | 756 to 899 | the line (756), the lockup (774), held; the loop flap from 888 |

**The file starts at frame 888**, the loop flap's release. Its first frame
is the wall (the line, the four letters, the lockup), so the brand and the
message are in its first second and its thumbnail; the flap falls onto the
bus in twelve frames; the file ends on frame 887, so a platform's loop is
seamless.

**What the picture gained for it.**

- Every pixel of a world is one of its palette's four, falling panes
  included: the pane is drawn crisp at its frame's angle, and its tilt and
  its shadow are a tone step down the palette, not a blur or a multiply.
  `page/round-dev.html?check` counts it.
- The phone is 400 px wide, so its words set at up to about 57 px; every
  world and its spine moved 42 px right (`SHIFT`) to keep the writer clear
  of it.
- A greeting too long for its row at full size takes a second row (yuna's),
  on the phone and on the wall.
- The wall: four modules of 444 by 474 at x 78 and 558, y 336 and 846, each
  letter's screen 398 by 462 with its words at up to about 61 px; the line at
  60 px from y 264; the lockup at 3 px a cell from y 1356. All of it inside
  the platforms' safe areas.
- The contact sheet shows each world as it stood when its letter went up,
  with its writer's phone held up in it and the letter on the phone.
- The clock folds away as the sheet lands and comes back when the loop flap
  lands the bus, its plates turning over from blank to 5:14 pm.

**The sound.** A four voice round in E flat over the ground, played from
real recordings: VSCO 2 Community Edition and the Versilian Community Sample
Library, both CC0. Sol a clarinet, wren a harp, pia a cello, yuna a horn; a
plucked double bass on every downbeat; a strumstick's waltz on beats two and
three until the walk takes over at bar 11. Each voice enters at its own flap
with the tune and goes on through the answer, the walk and the long notes
(`page/score.mjs` writes them out), so in bars 15 to 18 all four sound at
once. Bar 19 holds the dominant under the catch, the harp trembling with the
pane; bar 20 is home as the sheet lands; in bar 21 each flip sounds its
writer's note, B flat, G, C, F, the tune's own head, so the last chord is
built a note at a time; bars 22 to 25 are the ground under the wall, the
clarinet remembering the tune, a glockenspiel on the lockup, and a last bar
that keeps only its first beat, a breath before the landing.
`node page/score.mjs --check` holds the round to chord tones on every
downbeat and no parallel fifths or octaves.

The machine sounds only on its moments, each from `events()`: a dry click at
each landing, the hinge's ratchet and three small ticks as it trembles, a
lighter click for each module of the cascade, a tick for each plate of the
clock, a soft key for each word, a tock for each send, the colour turning as
a run of tiny ticks, the stop chime. The places are a breath under it: the
bus's motor and the streetlights going by, the café's room, the roof's wind,
the bakery's oven and its first birds, each while its world is in the
picture. A room made in code under the music (early reflections and a tail
of 1.9 s), a smaller one under the machine. The held instruments start into
their swell and a little early, by each recording's measured attack, so a
cello section speaks on the beat.

Mastered to -14 LUFS (-13.8 as delivered), true peak under -1.5 dBTP (-1.7):
the peaks are held to 11.5 dB over the loudness first, so the two pass
normalisation stays linear. The sound is one loop: every tail and echo past
the last frame sounds again under the first.

**Made and checked.**

```
node page/round-table.mjs                                    # the clock: 900 frames, every check
node page/render.mjs <frames>                                # the frames, in the file's order
node page/score.mjs --check                                  # the round's counterpoint
node page/score.mjs <samples> <score.wav>                    # the sound
sh page/encode.sh <frames> <score.wav> film/round.mp4        # the file
```

A world's tones never change with its colour; every landing is exact; still
and falling frames are all palette outside the phone and the clock. The file
is 900 frames, 30.000 s at a constant 30, 4:2:0, BT.709, closed GOPs, the
moov atom first and no edit lists; against the frames it measures 60.5 dB in
YUV and 44.7 dB back in RGB after 4:2:0 (40.4 at worst); every click is on its
frame to within 10 ms, and the loop's seam is continuous.

---

## 1. The idea

**every letter on the wall is to somebody.**

One night in Berkeley, from the evening rush to sunrise, six people each
write a letter on the wall. Each is to the next of them, and the last is to
the first. At 5:14 pm sol gives a seat on the 51B to a woman asleep on her
feet, then writes to wren. Wren, packing up after an open mic, writes to
hugo. Hugo, turning off a reading room's lamps, writes to pia. Pia, on a
hospital roof on her break, writes to omar. Omar, at a corner in the rain,
writes to yuna. And yuna, at a bakery as the sun clears the hills, writes
to the one who always stands: `you give your seat to whoever looks most
tired. last night it was me.`

None of them knows they are in a round. Nobody is told anything. Only we
see it, from outside, which is where a wall is seen from.

The fact under it is the product's plainest one: the wall is letters, each
to somebody, by name or by anything the writer calls them; anybody can put
one up; every one is read before it goes up.

## 2. Why this, after pacific

Pacific's world was right and its story was the first film's again: two
private notes, "is it mutual", a reveal at nine. Round keeps the world and
gives it a new job.

| | pacific | round |
| --- | --- | --- |
| what it is about | two people and the moment a mutual reaches both | six people, and the wall |
| what the seam is | the line between two days | a hinge between strangers |
| what happens | both phones turn rose at nine | each letter's colour floods its writer's world, and the one it is to falls into place as the next writer |
| the product's part | the private note and the reveal | the wall: the letter, its colour, its greeting, its battery, `being read` |
| the ending | the line bends into the mark's ring | all six worlds at once, each turning into its letter |
| the music | a phase piece | a round, a voice for each person |
| the look | kept: worlds lit and dithered into four tones of a screen's colour, crisp lit phones, two worlds across a seam, the colour running out of a phone | |

## 3. Where it comes from

Schnitzler's "Reigen" and Ophüls' "La Ronde" (a chain of people that
closes on the first, and a machine that tells it); McLaren and Munro's
"Canon" (a canon shown with bodies, the inverted voice a man upside down);
Rybczyński's "Tango" and "New Book" (loops in one room; one city in panels);
the Solari board; Saul Leiter, Edward Hopper and Fan Ho for the light; Mark
Ferrari, Kirokaze and Lucas Pope for the pixels. LOOK.md has each with its
source and exactly what is taken from it.

## 4. The rules of the picture

1. **The frame is a split-flap.** The seam at y 960 is its hinge.
2. **Below the seam, the one writing**, right way up in their world, seen
   from behind, over the shoulder (as the product's tellings see people:
   `app/src/wall/scenes/bench.js`, "behind them, at night, close").
   **Above, the one they are writing to**, in their own world and their
   own hour, mirrored vertically in the seam. They do not know.
3. **The camera never moves.** Each world is framed once, close enough to
   read the phone, and held. What moves is the machine: the flaps, the
   clock, the colour.
4. **The worlds are lit, then dithered** into four tones of a screen colour
   in 6 px cells. Until a letter goes up a world is `night`, the neutral
   grey one of the twelve. **The phone is the only crisp lit thing.**
5. **When a letter goes up its colour runs out of the phone** through the
   writer's world, cell by cell, and **when it reaches the seam the hinge
   lets go**: the flap falls because the colour arrived.
6. **The top half falls like a pane**: its back is its front seen from
   behind, so the one written to lands right way up and is the next one
   writing, and behind it the next somebody is already there. At the end
   the flaps are cards. Every transition in the film is a flap.
7. **A split-flap clock sits on the hinge**, the product's own digits
   (`app/src/wall/art.jsx` `FlapDigit`, `.wl-flap`). Every scene is at
   fourteen minutes past, so only the hour turns: 5:14 pm, 9:14, 11:14,
   1:14 am, 3:14, 7:14.

## 5. The six, and their letters

| | writer | world, time | to | the letter | colour | battery |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | sol, they | the 51B, 5:14 pm | wren | `dear wren` / `you hum when you think. i hope nobody ever tells you.` | amber | 4 |
| 2 | wren, she | the café, 9:14 pm | hugo | `dear hugo` / `i laughed at your band. i'm in one now. sorry.` | acid | 3 |
| 3 | hugo, he | the reading room, 11:14 pm | pia | `dear pia` / `you sang my grandad to sleep. i was awake.` | green | 2 |
| 4 | pia, she | the roof, 1:14 am | omar | `dear omar` / `i don't remember the fight. i remember everything else.` | ice | 1 |
| 5 | omar, he | the corner, 3:14 am | yuna | `dear yuna` / `i don't even like bread.` | violet / yellow | 0, blinking |
| 6 | yuna, she | the bakery, 7:14 am | the one who always stands (sol) | `to the one who always stands` / `you give your seat to whoever looks most tired. last night it was me.` | rose | 4, round again |

Every letter flatters the one it is to (VOICE.md, "receiver face"), asks
for nothing ("resolution, never pursuit") and says nowhere anybody can be
found. They sit in the family of the composer's own examples
(`app/src/wall/campus.js`: "you held the door at two in the morning and
asked if i was okay. i was not, and then i was.") and repeat none of them.
Together: a crush, a sibling's apology, a thank you, a lost friend, a funny
one, a kindness noticed.

**sol to wren.** A crush that asks for nothing, and a joke at its own
expense: the letter tells her the thing it hopes nobody tells her. Amber,
the colour of the street lights streaming past the bus.

**wren to hugo.** She played tonight. Years ago she called his band a
phase. It is an apology and a gift: he was right. She stops for an eighth
before `sorry.`. Acid: the lime square every band poster borrows, the cover
everybody knows (`looks.js`, `brat`).

**hugo to pia.** His grandad was in. She sang to him on her night shifts
when she thought nobody could hear. `i was awake.` is the thank you. Green,
the colour of the lamps he spends the night turning off.

**pia to omar.** A friendship that ended over nothing either of them can
name. She types `i miss`, stops, takes it back with the composer's own
`clear` a character at a time, and writes `i remember everything else.`
instead. Ice, the coldest hour.

**omar to yuna.** He goes in every morning. He waits a beat before five
words. Violet and yellow, the riso: the only world printed rather than lit,
the rain in two inks.

**yuna to sol.** She never knew sol's name. The composer made her greeting
from the custom name she gave it, `dear the one who always stands`; she
taps it, takes back `dear` and types `to`. Rose, at sunrise. The custom name
is the product's own example of what a name can be (`the girl on the 51B`,
`app/src/wall/README.md`, "Who a letter is for", migrations 0053 and 0055).

Sol is the only one never named.

**The batteries.** A letter's battery is its writer's to set, full to
start, a bar off at each press, the empty one blinking, then round to full
(`app/src/wall/README.md`, the status rows; migration 0076). Across the
night they run down, 4, 3, 2, 1, empty and blinking at 3:14 am, and yuna's
comes round to full at dawn. Nothing explains it.

**The status row** carries the count of characters left while a letter is
written (`N/1`, `app/src/wall/screens/Write.jsx`) and, on the tap that puts
it up, the day: `11/05/26` for the first three, `11/06/26` for the last
three. A letter that is up has no cursor.

## 6. The night

Thursday 5 to Friday 6 November 2026, Pacific Standard Time (the clocks went
back on 1 November). Computed for Berkeley at 37.87 N, 122.27 W:

| | |
| --- | --- |
| sunset | 5:06 pm, so 5:14 is the afterglow low in the west south west, the evening rush, a full bus |
| civil dusk | 5:34 pm |
| civil dawn | 6:13 am |
| sunrise | 6:41 am on the horizon; from the flats the hills stand about 6 degrees high at azimuth 110, so the sun clears the ridge at about 7:14 (the bakery's place is set so it is exact) |
| the moon | a thin waning crescent, about 7 to 12 per cent lit, below the horizon all evening and night, up a little after 4 am, a faint hook in the south east when the sun clears the ridge |
| the weather | clear at dusk, the bus's glass steamed from inside; cloud by midnight, lit from beneath by the city; rain at three; clearing for the morning |

`stampOf` (`app/src/wall/looks.js`) reads the browser's local time, so
every capture pins `America/Los_Angeles`; in UTC the first three letters
would read `11/06`. All of this is pinned again with an ephemeris before the
film is shot.

## 7. The six worlds

Each world is drawn once and seen twice: first above, mirrored, as
somebody who does not know; then fallen and right way up, writing. Each has
one clock that runs on unbroken from one appearance to the next
(`WORLDS[k].origin` in `round-time.js`), so a landing is continuous. Every
writer's frame is the same in its bones: seen over the right shoulder, the
head and shoulder dark at the lower right, the phone up at the left, the
world beyond in the upper right, and the spine, one vertical line at x 702,
crossing the seam into the world above. The spine is a real thing in every
world, so every split frame reads as one image and every flap lands on a
line that was already there.

### 1. the 51B, 5:14 pm

**The frame.** Inside the bus, standing in the aisle behind sol. The long
window band across the upper half, its glass steamed at the edges; beyond
it University Avenue in the afterglow, streaming left to right (the bus is
heading left), its shops lit at street level so the heads aboard are dark
against them. The ceiling
strip light along the seam. **The spine**: the grab pole sol holds, floor
to ceiling. The woman in the window seat beyond it, asleep against the
glass. The bus's own interior sign at the front, `51B`, the only words in
the world.

**The light.** The street lights passing and the strip above. The strip is
doubled in the dark glass (Hopper's "Automat"), and so is the phone's glow,
its letter mirrored and soft in the window.

**The signature.** The steamed glass is a window of condensation drops,
each a thin lens holding a small, sharp, upside down street over the city
streaming behind it in long shutter streaks: the film's mirror, in
miniature, a hundred times. As each street light passes, the light through
the drops sweeps the seats. Poles pass the window on every downbeat and
street lights on every other (Gondry's "Star Guitar": the city keeps time).

**Above** (link 6, mirrored over yuna's bakery): the same bus in the
seconds before bar 1. Sol seated by the window, the woman standing in the
aisle, swaying, asleep on her feet. At frame 912, as yuna looks up into the
first light, sol, above, looks up at her: the only time the two of them
meet, a night apart, both upside down to each other.

**Below** (bars 1 to 6): sol stands and gives her the seat; she sits and is
asleep against the glass by the end of the link; sol holds the pole and
writes.

**The flood.** Amber, from the phone down the aisle, along the seats and out
of the windows into the street, the passing lights turning amber as they
come.

**The sound.** The hybrid's whine, the stop chime at frame 24, a soft
pass for each pole and street light.

### 2. the café after the open mic, 9:14 pm

**The frame.** Over wren's shoulder as she sits on the edge of the riser, the
guitar case open beside her. Chairs up on the tables, the counter dark, the
front window onto an empty street. **The spine**: the pipe the last spot
hangs from.

**The light.** One spot still on, a hard wedge across the empty stage (Fan
Ho's "Approaching Shadow"), wren small at its edge. Only the spot reaches
the brightest tone (Octavi Navarro's rule); the room stays in the two
darkest. Headlights from the street sweep the far wall on every other
downbeat.

**The signature.** The beam solved in closed form, so its brightness falls
off as light does in air, with motes that flare only as they cross its
axis. The mic stand's long shadow.

**Above** (bars 1 to 6, over the bus): wren packing the guitar away; the
case's two latches at frames 156 and 162. She looks up at frame 180, from
the case, as sol below looks up from the phone.

**Below** (bars 7 to 10): she writes; she stops an eighth before `sorry.`.

**The flood.** Acid, up the beam first (the lit air takes it fastest), then
across the stage and the room. The café goes dark and lime: the cover has no
white.

**The sound.** The fridge, a cup set down on the counter, the latches.

### 3. the reading room at closing, 11:14 pm

**The frame.** Over hugo's shoulder at the end of a row: two rows of long
tables receding toward tall windows, a green shaded lamp at every place,
each with its pool on the desk in a low haze. **The spine**: a column
between the windows.

**The light.** The lamps, and then only the phone. Depth is told by tones
compressing toward the windows, never by blur.

**The signature.** The lamps go out one by one on the beat like filaments:
a fast fall, an ember of 150 to 300 ms, the pool on the desk dropping a tone
(Studio Drift's "Shylight", lamps as performers). Nine go out while he is
above, on the beats from frame 228 to 324; the last three as his own link
opens, at 360, 372 and 384, so the phone is the last light in the room.

**Above** (bars 7 to 10, over the café): hugo at the end of a row in his
coat, as the building's timer puts the lamps out, one on each beat, from the
far end. He looks up at frame 324, at the dark row.

**Below** (bars 11 to 14): he writes in the dark with his phone the only
light.

**The flood.** Green, along the rows from the phone, and every lamp the
colour reaches comes back on, green, pool and all.

**The sound.** Each switch, a dry click on the beat: the round's percussion.
The building's air.

### 4. the hospital roof on her break, 1:14 am

**The frame.** At eye height over pia's shoulder at the parapet, a paper cup
in her other hand. Below and beyond, the city as lit windows all the way to
the bay and the bridge's line of lights. Most of the frame is one tone of
sky. **The spine**: the beacon mast at the roof's corner.

**The light.** The city below. The cloud is lit from beneath in horizontal
bands whose thresholds slowly undulate, a row at a time (the Amiga's copper
bars). The beacon blinks once every two bars.

**The signature.** The windows of the city twinkle at heavy tailed rates:
most steady, a few restless, one going out somewhere every so often (Todd
Hido: every lit window a somebody). Steam from the tea curls up through the
cold by curl noise and catches the city's light.

**Above** (bars 11 to 14, over the reading room): pia at the parapet with
her tea. She looks up at frame 468.

**Below** (bars 15 to 18): she writes, takes back `i miss`, writes on.

**The flood.** Ice, from the phone over the parapet and out across the whole
city, every window taking it: the biggest flood in the film.

**The sound.** Wind, a siren far off once, the plant's hum.

### 5. a corner in the rain, 3:14 am

**The frame.** Over omar's shoulder, hood up, at an empty crossing. Wet
asphalt, one street light, the crossing signal's hand, a puddle at his feet.
No cars. No neon anywhere. **The spine**: the street light's pole.

**The light.** The one street light. Rain is visible only inside its cone,
brighter where it is backlit; outside the cone the rain is only heard.

**The signature.** The puddle is a true mirror trembling with ripple rings
where drops land; the street light and the rain in its cone are upside down
in it (the product's own umbrella telling puts its two "upside down in the
pavement", `app/src/wall/scenes/umbrella.js`), so the film's mirror is here
for real.
Drips, rings and the lamp's buzz run on loops of different lengths, all
dividing the film's 1152 frames (Kirokaze's small loops out of phase).

**Above** (bars 15 to 18, over the roof): omar waiting at the crossing for a
light nobody needs. He looks up at frame 612.

**Below** (bars 19 to 22): three eighths of nothing, then five words. As his
letter goes up at frame 744 the walk signal comes on.

**The flood.** Violet and yellow: the rain in the cone turns yellow, the dark
turns violet, the yellow drum a third of a cell out of register, as a riso's
second drum slips.

**The sound.** Rain; the crossing's locator tick once a second (every
thirty frames, five eighths: five against the bar's six); the walk signal's
quick ticks at 744.

### 6. the bakery as the sun clears the hills, 7:14 am

**The frame.** Over yuna's shoulder at the steel bench, flour on her
sleeves, the phone propped against a flour bin. Racks of loaves, the deck
oven's glow, the window east to the hills. **The spine**: the window's
mullion, and later the edge of its shadow in the beam.

**The light.** First light raking through the window across the bench
(Hopper's "Early Sunday Morning"). The sun is never seen as a disc: it
arrives as a beam (Rinko Kawauchi: the flour in the light, not the
sunrise).

**The signature.** Flour hanging in the beam with fading trails; steam off
the loaves; the oven's glow flickering by colour cycling (Mark Ferrari).

**Above** (bars 19 to 22, over the corner): yuna sliding loaves into the
oven with the peel. She looks up at frame 756.

**Below** (bars 23 to 27): she turns `dear` into `to`, writes, sends, and
looks up into the beam as sol, above, looks up at her.

**The flood.** Rose, across the bench and out of the window as the sun
clears the ridge.

**The sound.** The oven's fan, its timer once while she is above, the first
birds as the rose comes, the hum of a bus passing outside.

## 8. The film, bar by bar

Frames are from `page/round-time.js`; a beat is 12 frames, a bar 36.

| bars | frames | what happens | the score |
| --- | --- | --- | --- |
| 1 to 2 | 0 to 71 | the 51B at 5:14 pm: sol seated, the woman standing asleep on her feet; at 24 the stop chime; sol stands and gives her the seat; from 54 sol's phone rises. Above, the café, mirrored, grey: wren packing up | the ground's second half, `Cm | Ab`, alone: the film opens inside the round |
| 3 to 6 | 72 to 215 | link 1, sol to wren, amber | sol's voice enters, clarinet, the tune |
| 7 to 10 | 216 to 359 | link 2, wren to hugo, acid; above, the lamps going out on the beat | wren's enters, nylon guitar with a hum |
| 11 to 14 | 360 to 503 | link 3, hugo to pia, green | hugo's, bass |
| 15 to 18 | 504 to 647 | link 4, pia to omar, ice | pia's, cello |
| 19 to 22 | 648 to 791 | link 5, omar to yuna, violet / yellow | omar's, marimba |
| 23 to 26 | 792 to 935 | link 6, yuna to the one who always stands, rose; above, the bus before bar 1 | yuna's, horn, the tune: all six sound at once |
| 27 | 936 to 971 | the colour reaches the hinge and it catches, trembling, for the whole bar; at 962 it lets go | the dominant held, the room nearly silent |
| 28 | 972 to 1007 | the flap falls onto the contact sheet: all six worlds at once, each in its colour, each alive | resolved, E flat, with the clack |
| 29 | 1008 to 1043 | the cascade: on each eighth one world flips into its letter on the wall, in round order | each flip its writer's note: the last chord built a note at a time |
| 30 | 1044 to 1079 | `every letter on the wall is to somebody.` set whole above the six | the chord rings |
| 31 to 32 | 1080 to 1151 | the lockup and `celestual.us` set whole under them; from 1140 the loop flap falls; it lands on frame 0 | the ground's first half, `Eb | Bb/D`, bass alone, into bar 1 |

### Each link, frame by frame

| link | writer | starts | the words | sent | the colour runs | both look up | the hinge lets go | lands | the words stand |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | sol | 72 (bar 3) | 78 to 129 | 144, then `being read` to 168 | 168 to 204 | 180 | 204 | 216 | 3.7 s |
| 2 | wren | 216 (bar 7) | 246 to 297 | 312 | 312 to 348 | 324 | 348 | 360 | 3.7 s |
| 3 | hugo | 360 (bar 11) | 390 to 438 | 456 | 456 to 492 | 468 | 492 | 504 | 3.7 s |
| 4 | pia | 504 (bar 15) | 522 to 591, `i miss` taken back 558 to 573 | 600 | 600 to 636 | 612 | 636 | 648 | 4.1 s |
| 5 | omar | 648 (bar 19) | 696 to 723 | 744 | 744 to 780 | 756 | 780 | 792 | 3.1 s |
| 6 | yuna | 792 (bar 23) | greeting 798 to 813; 822 to 885 | 900 | 900 to 936 | 912 | catches 936, lets go 962 | 972 | 4.9 s |

The template inside a link (frames from its start): 0 the flap lands, with
its click and a rebound of a degree or two settled by 8; 6 to 24 the phone
rises into the frame and lights as `screen.css` lights its kind (a lit
screen's veil and then its halo; acid at once, as a printed square is;
the riso uncovered); 24 the composer with its greeting; 30 to 90 the words,
landing a word at a time in human bursts on the sixteenth grid while the
count falls from 280; 96 the tap on `send anonymously`, the count turning
into the day, the caret and the composer's keys going; 96 to 132 the colour
running out of the phone; 108 the one writing and the one above both look
up; 132 the colour reaches the hinge, it lets go, and the pane falls in
twelve frames to land on the next link's downbeat. Link 1 is the one that
shows `being read` and `it goes up once it passes.`; every later link cuts
from the tap to the letter as it stands on the wall.

The words stand from their first word until the falling pane covers the
phone. At the product's own reading pace, 20 characters a second, the
longest middle letter needs 2.8 s and gets 4.1; the last needs 3.5 and gets
4.9, and then stands again on the wall.

### The shots

**Bars 1 and 2, frames 0 to 71.** The loop flap has just landed with its
click. The 51B, 5:14 pm, amber nowhere yet: everything in night's four
greys, the street streaming past the steamed glass, the shops lit behind
it. A woman stands in the aisle nearest us, her back to us, a hand on the
pole, swaying with the bus, asleep on her feet. Sol is in the window seat
beyond the pole. At 24 the stop chime. On the twos, sol stands; she steps
aside to let him out, and he gives her the seat. She sits, her head going
to the glass. Sol takes the pole she held. At 54 the phone comes up into
the left of the frame, lighting amber. Above, mirrored: the café, wren on
the riser packing her guitar. The clock on the hinge reads 5:14 pm.

**Link 1, frames 72 to 215.** `dear wren` at 72. The words from 78: `you
hum when you think.` and then `i hope nobody ever tells you.` by 129. At 144
`send anonymously`; the letter gives way to the product's own note, `being
read`, `it goes up once it passes.`, for two beats; at 168 it is up, the
count become `11/05/26`, no caret. The amber runs out of the phone, down the
aisle, along the seats, out of the windows; the passing lights come amber.
At 180 sol looks up from the phone, and above, wren looks up from her case.
From 180 the clock riffles 6, 7, 8, 9. At 204 the amber reaches the hinge.
The café falls, right way up, and lands at 216 with its click.

**Link 2, frames 216 to 359.** Wren on the riser, the spot's wedge beside
her; behind the fallen pane the reading room, mirrored above: hugo at the
end of a row, the lamps going out on the beat from 228. Her phone rises lit
acid. `dear hugo`. `i laughed at your band. i'm in one now.`, an eighth of
nothing, `sorry.` by 297. Sent at 312. Acid up the beam and across the
room. Both look up at 324; above, the ninth lamp has just gone out. The
clock to 11 pm. Lands at 360.

**Link 3, frames 360 to 503.** The reading room right way up, three lamps
left; they go out at 360, 372 and 384 and his phone is the last light.
Above, the roof: pia at the parapet, the city below her. `dear pia`. `you
sang my grandad to sleep. i was awake.` by 438. Sent at 456. Green runs
along the rows, and every lamp it reaches comes back on. Both look up at
468. The clock passes 12 to 1 am. Lands at 504.

**Link 4, frames 504 to 647.** The roof right way up. Above, the corner in the
rain, omar at the crossing. `dear omar`. `i don't remember the fight. i
miss`, a beat, the clear key six times from 558, a character a press,
`i remember everything else.` by 591. Sent at 600. Ice across the parapet
and over the whole city. Both look up at 612. The clock to 3 am. Lands at
648.

**Link 5, frames 648 to 791.** The corner right way up, the crossing ticking
once a second. Above, the bakery: yuna at the oven with the peel. `dear
yuna`. Three eighths of nothing. `i don't even like bread.` by 723. Sent at
744 as the walk signal comes on, its quick ticks. Violet in the dark, yellow
in the cone. Both look up at 756. From 756 the clock riffles 4, 5, 6, 7.
Lands at 792.

**Link 6, frames 792 to 971.** The bakery right way up, the phone already on,
propped on the flour bin. Above, behind the fallen pane: the 51B, the
seconds before bar 1, sol seated, the woman swaying in the aisle. The
composer shows `dear the one who always stands`; at 798 she takes back
`dear` a character a press and types `to`. `you give your seat to whoever
looks most tired. last night it was me.` by 885. Sent at 900, and the first
light comes through the window with the rose. At 912 she looks up into the
beam, and above, a night earlier, sol looks up at the woman in the aisle.
At 936 the rose reaches the hinge and the hinge catches: the pane trembles
on its pin, a degree, two, five, for the whole of bar 27 while the music
holds its breath. At 962 it lets go.

**Bar 28, frames 972 to 1007.** It lands on the contact sheet: for the first
time the six worlds at once, two across and three down, each small and in
its own colour, each still alive (the bus streaming, the beam, the lamps
relit, the city twinkling, the rain, the flour). Nobody in them knows the
others are there.

**Bar 29, frames 1008 to 1043.** The cascade. On each eighth, in the order
the letters went up, one panel flips like a module of a station board, and
where its world was stands its letter on the wall: the product's lit screen
in that colour, the greeting, the words, the battery, the day, no cursor.

**Bars 30 to 32, frames 1044 to 1151.** `every letter on the wall is to
somebody.` set whole above the six at 1044, in lit Jersey 10. At 1080 the
lockup and `celestual.us` under them. At 1140 the end card's top half lets
go and falls; on its back is the 51B, grey, the moment before bar 1, and
behind it the café, mirrored. It lands on frame 0, and the clock is back at
5:14 pm.

## 9. The machine

### The flap

A pane hinged at the seam falls as a plate does. Released with a small kick
(about 4 degrees), gravity's torque grows with the sine of its angle, so it
creeps, then rushes, and slaps flat in twelve frames, on the downbeat. It
rebounds a degree or two and once more, smaller, settled by the eighth
frame, a sliver of the world under it showing through the rebound. While it
tilts away from the light it goes a tone darker; its shadow sweeps the half
below before it lands. Its cells are the world's own, baked on the card, so
they foreshorten crisply and land exactly on the live world beneath.
Motion blur only while it is fast. One dry click on each landing, frame
exact. In link 6 the hinge catches: from 936 the pane trembles on its pin,
growing from a degree to about five, and lets go at 962 to land at 972,
the one time the machine breaks its rhythm (the carousel in Ophüls' "La
Ronde" that stalls once).

Between worlds the pane's back is its front seen from behind, so the
mirrored world above lands upright. At the end the flaps are cards, as a
split-flap's are: the back of each carries the next card's lower half (the
contact sheet, the end card, the bus at the loop).

### The flood

The colour leaves the phone and reaches every cell of the writer's world in
36 frames, quick at the phone and slower into the far corners, the hinge
last. The shape is the product's own wash (`app/src/wall/PixelStory.jsx`,
`spreadMap`, copied with its constants: lobes from two octaves of a slow
noise, a jitter of its own, blocks of two cells), measured along each
world's paths so it travels fastest through lit space (the aisle and the
windows, the beam, the rows of lamps, the city, the cone, the bench and the
window). It is a palette event: each cell's four tones stay exactly where
they were, and only the palette under them changes, from night to the
letter's colour, behind a crest one tone brighter and a fizzle one cell
wide ranked by the same blue noise the dither uses. It only ever adds. It is
heard as a layer of dry flip-disc ticks whose density is the number of cells
turning on that frame, panned by where they are.

### The seam

The two or three rows of cells either side of the seam ripple in whole
cells, a water surface, a pulse when a greeting appears and when a flap
lands.

### The clock

Chalk digits on dark plates, the product's split-flap digits, sitting on
the hinge at the left above the phone. The minutes never change. The hour
drum riffles forward through every hour in between, each step the product's
own fold (130 ms, 130 ms, 40 ms still: a dotted eighth), timed so the last
step lands on the flap's downbeat; the meridiem drum turns as it passes
twelve.

| riffle | steps | frames |
| --- | --- | --- |
| 5 pm to 9 pm | 6, 7, 8, 9 | 180 to 216 |
| 9 pm to 11 pm | 10, 11 | 342 to 360 |
| 11 pm to 1 am | 12 am, 1 | 486 to 504 |
| 1 am to 3 am | 2, 3 | 630 to 648 |
| 3 am to 7 am | 4, 5, 6, 7 | 756 to 792 |

It folds away as the contact sheet lands and comes back when the loop flap
lands the bus at frame 0, its plates turning over from blank to 5:14 pm.

### The phone

The product's composer exactly: the letter screen in the writer's colour
with its two bands of glass, the status row (the aerial, the writer's
battery, the count `N/1`), the pen and the greeting, the words in Jersey 10
as large as the screen holds them, the composer's keys (`colour`, `clear`),
and under it the pill, `send anonymously`. The words land a word at a time;
each change eases in over about a tenth of a second, as a panel's pixels
do. The caret is the product's own. On the tap the count turns into the
day, the caret and the keys go, and the screen is the letter as it stands
on the wall. The phone's glow is also a light in the world: it lights the
writer's hands and hair, and it shows in the bus's glass and omar's puddle.

## 10. The end and the loop

The contact sheet, the wall and the end card share one grid in the safe
area, in whole cells:

| | x | y | size |
| --- | --- | --- | --- |
| the line | centred | 258 | one line of Jersey 10, chalk |
| the six panels, two across | 138 and 558 | 318, 690 and 1062 | 384 by 342 each, 64 by 57 cells |
| the lockup | centred | 1440 | `brand.js` LOCKUP at 2 px a cell, 224 by 66, chalk |
| `celestual.us` | centred | 1530 | Jersey 10, chalk |

On the contact sheet each panel is its world's writer's frame at a sixth of
the size, drawn at the same 6 px cells, so each is a small picture of 64 by
57 cells: honest pixels, never shrunk. In the cascade each panel flips as a
module, its world on the falling card, its letter on the card beneath: the
product's letter screen in that colour (`.wl-scr`, `aspect-ratio: 1 /
var(--q-ar, 1.16)`), its status row with the writer's battery and the day,
the greeting, the words, `options` and the heart with no count, no cursor.

The loop is a mechanism, not a fade: at 1140 the end card's top half
releases; its back is the bus at the moment before bar 1; it lands on frame
0, where everything is as it was.

## 11. The score

**Form.** A strict canon, six voices in E flat, 150 beats a minute in
three: a lullaby. Each person is a voice entering when they start to write,
bars 3, 7, 11, 15, 19 and 23, so a voice joins at every flap and the night
thickens; in bars 23 to 26 all six sound at once, each on a different
phrase. The oldest round in English, "Sumer is icumen in", is six parts
over a ground.

**The ground.** Four bars, one chord a bar: `Eb | Bb/D | Cm | Ab` (I, V6,
vi, IV), a falling bass, never stopping, even across the loop. Bars 1 and 2
are its second half, so the film opens inside it; bars 31 and 32 are its
first half, so bar 32 hands it to bar 1. Bar 27 replaces the expected E flat
with a held B flat, the dominant, under the trembling hinge; bar 28 resolves
as the contact sheet lands.

**The six phrases**, four bars each, in the order each voice sings them:

| | phrase | notes (a bar each) |
| --- | --- | --- |
| 1 | the tune | `Bb4` dotted half / `F4 Ab4 G4` / `Eb4` half, `D4` / `C4` dotted half |
| 2 | the answer | `G4` half, `F4` / `D4` dotted half / `Eb4 G4 Ab4` / `C5` dotted half |
| 3 | the walk | `Eb5 D5 C5` / `Bb4 D5 F5` / `C5 Eb5 G5` / `Ab5 Eb5 C5` |
| 4 | the long notes | `Bb3` / `Bb3` / `C4` / `C4`, dotted halves |
| 5 | the figure | eighths: `Bb5 G5` three times / `Bb5 F5` / `C6 G5` / `C6 Ab5` |
| 6 | the high hold | `Eb6` / `F6` / `Eb6` / `C6`, dotted halves |

All six sounding together at every eighth, and every join where a voice
moves on to its next phrase while a new one enters, were checked by script:
a chord tone on every downbeat, and no parallel fifths or octaves in similar
motion between any two voices. Each voice sings in its own octave.

**The voices.** Sol, clarinet (in bars 23 to 26 the high hold above
everything). Wren, nylon guitar, the figure in her fingers, doubled by a
quiet hum on her first phrase only, the hum sol's letter is about. Hugo,
bass guitar (the band), the long notes two octaves down. Pia, cello, the
walk. Omar, marimba against the rain, the answer. Yuna, horn, the tune, at
sunrise. The newest voice leads the mix and older ones recede as their
worlds fall away, as "Timecode" mixes its four takes.

**Bars 27 to 32.** Bar 27 holds the dominant; the room tone drops nearly to
nothing; the hinge's tremble is a tiny metal rattle. Bar 28, E flat, with
the clack. In bar 29 each flip of the cascade sounds its writer's note, so
the last chord is built a note a flip: sol's B flat, wren's G, hugo's E
flat, pia's C, omar's D, yuna's F. Bars 30 to 32 let it ring and hand the
ground, bass alone, to bar 1.

**The sound, on the grid.** The click on each landing (216, 360, 504, 648,
792, 972 and 0); the hinge catching at 936; the flood's tick layer (168,
312, 456, 600, 744, 900, 36 frames each); the clock's fourteen folds; a soft
key for each word (72); the lamp switches (228 to 324 on the beat, then 360,
372, 384); the case's latches (156, 162); the crossing's tick every thirty
frames from 504 to 791 and the walk signal at 744; a pole or a street light
past the bus on each downbeat while it is on screen; the stop chime at 24;
the oven's timer while yuna is above; the first birds from 900.

**The master.** The notes are humanised once and played twice end to end,
and the second pass kept, so every reverb tail wraps into the start (38.4
seconds is exactly 96 beats, and 1,843,200 samples at 48 kHz). No fades. Two pass `loudnorm` to -14 LUFS and -1.5 dBTP, which
must stay linear.

## 12. The cutdowns

- **15 s** (432 frames): bars 1 and 2, the seat, with the bakery above
  instead of the café; a flap straight to link 6; the end. A kindness, and
  the letter about it, whole.
- **6 s** (180 frames): link 5, `i don't even like bread.`, and the lockup's
  bar.
- **4:5** (1080 by 1350): the seam at y 678 (113 cells above, 112 below),
  every world recomposed wider, the spine kept.

## 13. What the picture claims

| the picture shows | true because |
| --- | --- |
| a letter to a name, `dear wren`, and one to a custom name, `to the one who always stands` | `app/src/wall/README.md`, "Who a letter is for": an @ or anything else, one to thirty characters and five words (0053, 0055); `screen.jsx`, `salutation` |
| the composer's greeting made from the name and changed by the writer | `screens/Write.jsx`, `defaultGreet` and the greeting field (up to forty characters) |
| the count while writing, the day once it is up | `app/src/wall/README.md`, the status rows; `Write.jsx`, `counter` |
| `send anonymously`, then `being read` and `it goes up once it passes.` | `Write.jsx` |
| every letter read before it goes up | BRIEF.md 5; the film shows the reading once and elides it after |
| twelve colours; amber, acid, green, ice, violet / yellow, rose | `looks.js`, `COLOURS`, `skinOf` |
| the battery is the writer's | `app/src/wall/README.md`, 0076 |
| the 51B | the product's own example (`the girl on the 51B`), here only on the bus's interior sign |

**Never shown**: signal bars (the aerial alone; bars were removed on 24
September), a cursor on a letter that is up, a count of hearts or replies, a
handle, anybody being told they were written to, `dear you` or "someone
wrote you a letter" aimed at whoever is watching, any number of anything.
The film skips the composer's "how public is it?" step, and after link 1
the reading: ellipses of time, never a claim that a letter goes up at once.

**The fact line BRIEF.md needs** (its list says "an Instagram @ or a first
name", which the product has outgrown): *Letters on the wall are addressed
to an Instagram @ or to anything else the writer calls the person, a first
name or a description, and the @ is never printed on the letter.*

**No flashing**: no area of the frame changes faster than three times a
second; the flaps are 4.8 s apart and the cascade turns six separate panels
once each.

## 14. Risks

1. **Six worlds is a lot of drawing.** Each is drawn once and seen twice, on
   one shared kit of light and weather, with locked cameras; the animatic
   proves the staging before any detail.
2. **The chain has to read in one viewing.** The greeting names the person
   above; the flap physically brings them down; the spine holds each frame
   together; the clock turns; and the pattern repeats five times before the
   turn that closes it.
3. **Reading time.** Budgeted letter by letter (section 8); the wall gives
   every letter a second reading.
4. **The dither through Instagram and TikTok.** 6 px cells stay 4 px even
   when a platform serves 720p; lossless frames, no frame blending; an
   encode check; a private test upload of the 6 s cut first.
5. **The loop.** Continuous world clocks, the ground unbroken, the audio
   played twice; frame 1152 is checked against frame 0.

## 15. What to decide

1. **The letters.** As written, or any of these instead:
   - sol to wren: `you hum when you think. don't let anybody tell you.`
   - wren to hugo: `you were right about the band. i'm in one now.`
   - hugo to pia: `you sang to my grandad when you thought nobody could hear. i could.`
   - pia to omar: `we stopped talking over something i can't remember. i remember the rest.`
   - omar to yuna: `i don't even like bread.` (keep)
   - yuna to sol: `you give your seat to the most tired person on the bus. last night it was me.`
2. **The names.** sol, wren, hugo, pia, omar, yuna.
3. **The 51B on the bus's sign**, or a bus with no number.
4. **Fourteen minutes past, every time**, or times that feel found (5:14,
   9:58, 11:47, 1:12, 3:05, 7:14).
5. **The cells**: 6 px (bolder, safer through the platforms) or 4 px
   (finer, closer to pacific's frames); the first test renders both.
6. **The round**: in three at 150, a lullaby, or in four at 100.
7. **Instrumental**, or wren's hum given words.
8. **The 38.4 s or the 15 s first.**
