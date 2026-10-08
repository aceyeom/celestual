# The reel's song

`celestual-reel.wav`, under `celestual-reel.mp4` and `celestual-reel-60.mp4`.
35 seconds at 96 beats a minute in D major and its B minor, fourteen bars,
written for the reel and made from the same clock as its picture
(`app/src/studio/parts/reel-time.js`), so every word lands on a note.

## How it is made

`node scripts/studio-score.mjs <out.wav>` writes the song note by note: a
hook (`do they still think a-bout you`) first heard on a celesta and a music
box as the hall rises, sung by the band when the two of them are held, half
remembered on the piano when the lights go out and last with its words; a
progression of Bm, G, D and A; a Rhodes, a nylon guitar picking, a bass,
strings, voices, a pad, brushes and a kit. Each note is then loosened a
little in its time and its weight, as a player would, the same way every
time the song is made.
Each part is played by FluidSynth from the MuseScore General soundfont
into its own stem, and the stems are mixed in Node (the kit ducks the band,
a delay answers the hook, a room is convolved round it) and mastered with
ffmpeg to -14 LUFS, -1.5 dB true peak. The phones' keys, the board's cards
and the lights are written into the same score, on the frames they belong
to.

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
