# The reel's song

`celestual-reel.wav`, under `celestual-reel.mp4` and `celestual-reel-60.mp4`.
35 seconds, fifty six beats at 96 a minute in B minor, with a bar of two
beats where the reveal begins, written for the reel and made from the same
clock as its picture (`app/src/studio/parts/reel-time.js`), so every word
lands on a note.

## How it is made

`node scripts/studio-score.mjs <out.wav>` writes the song note by note. It
is quiet and it aches: a grand piano played close and soft, strings, a
cello, a contrabass, a harp, voices, a low pad and a timpani's roll, and no
drums. Its melody is the film's question, `do they still think a-bout
you?`: up a sixth, a sigh down, and up again at the end, as a question
goes, onto a note that is not home.

- the letter: the piano alone, a line falling under lin's typing (F sharp,
  E, D, C sharp, B), the sigh on the `d` after the breath
- the hall: the piano's arpeggios as the backlights come on, the strings
  rising with the camera, a cello under the words
- the send: the piano holds its breath on the key; a harp carries the
  letter's pixels up into the envelope; a bell as it is sealed; the strings
  and voices swell as it comes at the lens and break on D as it goes through
- the date: the piano ticks the clock round in eighths and stops at nine; a
  cello comes in with the note that comes in on the thursday
- the reveal: a run up the piano as they run in, its last two notes the
  melody's first, and the melody sung by everything when they are held
- kai's note: the cello answers the melody, a harp falling as the letters
  go to their places
- the ones that go out: the piano alone, a note for each light
- the question: the melody with its words, on the piano alone, left open
- the name: B minor with its ninth, then G with its seventh, where it is
  left

Each note is then loosened a little in its time and its weight, as a player
would, the same way every time the song is made. Each part is played by
FluidSynth from the MuseScore General soundfont into its own stem, and the
stems are mixed in Node (a long, dark hall convolved round them) and
mastered with ffmpeg to -14 LUFS, -1.5 dB true peak. The phone's keys, the
send, the clock and the lights are written into the same score, on the
frames they belong to.

`LEVELS=1` prints each part's level in each section; `STEMS=<dir>` keeps
the stems.

## What it is made from

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
