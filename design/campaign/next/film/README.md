# round, the film

| file | |
| --- | --- |
| [round.mp4](./round.mp4) | the film: 30.000 s, loops, 1080 by 1920, 30 fps, with its score. 6.9 MB |
| [round-poster.png](./round-poster.png) | its first frame, the wall: the line, the four letters, the lockup. For a cover |

Four people in one night in Berkeley, each writing a letter on the wall to
the next of them, the last to the first. The script, the bars and the sound
are in [ROUND.md](../ROUND.md), section "The final cut".

## Putting it up

- **Instagram (reels).** Turn on Settings, Data usage and media quality,
  Upload at highest quality, before uploading. The first frame is the wall,
  so the default cover already carries the line and the lockup; or choose
  `round-poster.png`. The file meets Meta's reference for reels (H.264,
  progressive, closed GOP, 4:2:0, under 25 Mbps, AAC at 48 kHz, the moov atom
  at the front, no edit lists), so it also goes up through the API and the
  tools that use it.
- **TikTok.** Turn on Allow high quality uploads under More options.
- **Everywhere.** Upload the file as it is: no trims, no filters, no speed
  change, no music laid over it (it has its own). It starts on the wall and
  ends on the frame before it, so the platform's loop is seamless.
- **Safe areas.** Everything that has to be read sits between x 72 and 1002
  and y 264 and 1556, clear of the platforms' top bar, side buttons and
  caption.

## What it is, measured

| | |
| --- | --- |
| picture | H.264 High, level 4.2, 1080 by 1920, 900 frames at a constant 30 fps, 4:2:0, BT.709, limited range, chroma sited left |
| GOP | closed, an IDR every 60 frames, two B frames |
| sound | AAC LC, 256 kbps, 48 kHz, stereo; -13.8 LUFS integrated, true peak -1.7 dBTP, loudness range 5.1 LU |
| container | MP4, the moov atom first, no edit lists |
| against the frames | 60.5 dB PSNR in YUV (50.3 at worst, the loop flap); 44.7 dB back in RGB after 4:2:0 (40.4 at worst, the acid flood behind the phone's words) |
| sync | the decoded sound lies on the score to the sample; every landing's click within 10 ms after its frame |
| the loop | the last frame is the one before the first; the score crosses its seam with no click (its last sample to its first is a step of -45 dBFS), and its first 21 ms, which an AAC encoder's priming takes, are kept near silent |

## Making it again

From `design/campaign/next/`, with Node 20 or later, Playwright's Chromium
and ffmpeg built with zimg (`zscale`) and libx264:

```
node page/round-table.mjs                                    # the clock, checked
node page/render.mjs <frames>                                # 900 PNG frames in the file's order, about 25 min
node page/score.mjs --check                                  # the round's counterpoint
node page/score.mjs <samples> <score.wav>                    # the score, mastered
sh page/encode.sh <frames> <score.wav> film/round.mp4        # the file
```

`render.mjs` can be stopped and started again: it skips the frames already
on disk. The frames and the score are the masters; keep them if the film
will be cut again.

The score plays real recordings, all CC0, fetched as sparse git clones into
`<samples>`:

| folder | from |
| --- | --- |
| `<samples>/vsco` | [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) (Versilian Studios), commit `4403009`: `Woodwinds/Clarinet/susLong`, `Brass/F Horn/sus`, `Strings/Cello Section/*susvib*`, `Strings/Solo Contrabass/*Pizz*`, `Strings/Harp`, `Percussion/Glock`, `Percussion/Triangle3-HitM*`, `Percussion/Ratchet1-Fast*`, `VSCO 1 Percussion/varWood/claves_*`, `VSCO 1 Percussion/varWood/Camo's Shaker/shake1.wav` |
| `<samples>/vcsl` | [Versilian Community Sample Library](https://github.com/sgossner/VCSL), commit `c1ea7bc`: `Chordophones/Composite Chordophones/Strumstick/Finger` |

```
git clone --filter=blob:none --sparse https://github.com/sgossner/VSCO-2-CE <samples>/vsco
git -C <samples>/vsco sparse-checkout set --no-cone "/Woodwinds/Clarinet/susLong/*" "/Brass/F Horn/sus/*" \
  "/Strings/Cello Section/*susvib*" "/Strings/Solo Contrabass/*Pizz*" "/Strings/Harp/*" "/Percussion/Glock/*" \
  "/Percussion/Triangle3-HitM*" "/Percussion/Ratchet1-Fast*" "/VSCO 1 Percussion/varWood/claves_*" \
  "/VSCO 1 Percussion/varWood/Camo's Shaker/shake1.wav"
git clone --filter=blob:none --sparse https://github.com/sgossner/VCSL <samples>/vcsl
git -C <samples>/vcsl sparse-checkout set --no-cone "/Chordophones/Composite Chordophones/Strumstick/Finger/*"
```
