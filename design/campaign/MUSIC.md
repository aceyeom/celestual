# The reel's song

`celestual-reel.wav`, under `celestual-reel.mp4` and `celestual-reel-60.mp4`.
35 seconds, fifty six beats at 96 a minute in B minor, with a bar of two
beats where the reveal begins and the harmony moving every two beats from
the turn on, written for the reel and made from the same clock as its
picture (`app/src/studio/parts/reel-time.js`), so every word lands on a
note.

## How it is made

`node scripts/studio-score.mjs <out.wav>` writes the song note by note. It
is quiet and it aches: a grand piano played close and soft, strings, a
cello, a contrabass, a harp, voices, a low pad and a timpani's roll, and no
drums. Its melody is the film's question, `do they still think a-bout
you?`: up a sixth, a sigh down, and up again at the end, as a question
goes, onto a note that is not home.

- the letter: the piano alone, a line falling under lin's typing (F sharp,
  E, D, C sharp, B), the sigh on the `d` after the breath; the phone's keys
  click under it, quietly, a letter at a time
- the hall: the piano's arpeggios as the backlights come on, the strings
  rising with the camera, a cello under the words
- the send: the piano holds its breath on the key; a harp carries the
  letter's pixels up into the envelope, and its chord as it is sealed; the
  strings and voices swell as it comes at the lens and break on D as it goes
  through
- the date: the piano ticks the clock round in eighths and stops at nine; a
  cello comes in with the note that comes in on the thursday
- the reveal: a slow breath of air under the two lights as they go out
  together, as long as they take to spread; the air of lin's letter coming
  out of them at us,
  from the left as it swings out there; a run up the piano, leaning into its
  last two notes, the melody's first, and a harp going up with it into the
  turn; on the turn, as kai's side comes on, the melody sung by everything
- `you both find out.`: the cello answers the melody, down to the B the
  next scene is on; grains of air, a few thousandths of a second each, as
  kai's letter melts back into the light, their band falling as it goes,
  gone on the cut
- the ones that go out: the piano alone, a note for each light
- the question: the melody with its words, on the piano alone, `you?` on a
  note that is not home, and left open over A, its fourth letting go to the
  third, until the name
- the name: B minor with its ninth, then G with its seventh, where it is
  left

Each note is then loosened a little in its time and its weight, as a player
would, the same way every time the song is made. Each part is played by
FluidSynth from the MuseScore General soundfont into its own stem, and the
stems are mixed in Node (a long, dark hall convolved round them) and
mastered with ffmpeg to -14 LUFS, -1.5 dB true peak. The keys are a
phone's, synthesised: a tick and a small bright body, the space bar's
lower and softer, a click a letter as lin's letter and the address are
typed, quiet under the song. The send and
the envelope sealed are a real recording of a tap, laid on their frames;
the air the letter moves and the screens going out are synthesised. There
are no bells.

`LEVELS=1` prints each part's level in each section; `STEMS=<dir>` keeps
the stems.

## The sounds alone

`celestual-reel-sfx.mp4` is the thirty with the film's sounds and no song
(`celestual-reel-sfx.wav`, made by `FOLEY=1 node scripts/studio-score.mjs
<out.wav>`), for a song of someone's own to be laid over it. The same
sounds on the same frames, and a few more of the picture's moments given a
sound of their own, since no music carries them: the camera's move up the
hall and lin's letter coming away from the wall, the air each moves; kai's
note coming on, on the thursday; the two touching, low, under the air of
it; the one who goes, a gust and the scratch of the pencil's lines blown to
the left; and the name lit from its star, a shimmer of air as fine as its
cells; the phone's keys as the letters are typed, as they are heard in
the hand; and the question, a word at a time, each word a soft knock and
a breath, a little more each time, and on `you?` the air drawn in before
it, a deeper knock held under a low one, and a shimmer as it lights. The
long breath of air under the hall is left out, since alone it is only a
hiss. Nothing is pressed: no glue and no saturation, and it is set by its
loudest moment, the envelope at the lens, four and a half decibels under
full scale, which leaves it near -26 LUFS, the sounds being few, so a song
laid over it has the room it needs.

## What it is made from

The tap (`scripts/sounds/`) is a recording from Ion.Sound 3.0.7 by Denis
Ineshin, under the MIT licence; its notice is `scripts/sounds/NOTICE.md`.

Every instrument comes from the MuseScore General soundfont (Debian's
`musescore-general-soundfont`, `/usr/share/sounds/sf3/MuseScore_General_Full.sf3`),
released under the MIT licence, with parts in the public domain or under
CC0. Its grand piano is the Splendid Grand (public domain) and its ensemble
strings are from the Versilian Studios Chamber Orchestra 2 Community
Edition (CC0). FluidSynth (LGPL 2.1) is used only as a program to play it;
nothing of it is in the song.

The soundfont's notice, from its copyright file:

```
MuseScore_General_HQ SoundFont (MIT, parts PD or CC0):

MuseScore Drumline (MDL) samples (CC0) by S. Christian Collins & Amir Oosman
Splendid Grand piano from AKAI S5000 (verified Public Domain)

Marching Cymbals: open crash samples from Versilian Community Sample Library
https://github.com/sgossner/VCSL (CC0) by Sam Gossner

Ensemble strings from Versilian Studios Chamber Orchestra (VSCO) 2.1.1
Community Edition (CC0) by Sam Gossner, Simon Dalzell, Elan Hickler/Soundemote

Adaptation for MuseScore_General Copyright © 2018-2021 S. Christian Collins

Fluid (R3) Mono GM soundfont (MIT):

Mono version Copyright © 2014-2017 Michael Cowgill
Temple Blocks instrument Copyright © 2002 Ethan Winer
Drumline Cymbals Copyright © 2016 Michael Schorsch

(Original Stereo version) Fluid (R3) GM SoundFont (MIT):

Copyright © 2000-2002, 2008 Frank Wen <getfrank@gmail.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
```
