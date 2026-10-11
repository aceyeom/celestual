# celestual: the third reel

`celestual-reel-3.mp4`: 27.4 seconds, 1080 by 1920, 30 frames a second,
sound effects only. `celestual-reel-3-b.mp4` is the same film with its hook
told another way. `assets/poster.jpg` is its frame at 0.5 seconds.

## The idea

Two people like each other, and each is waiting for the other to say it
first, so nobody does. Celestual is how you say it anyway: both of you can,
privately, and you only find out if you both did.

The film shows this with its photographs. Each one shows two people
together. It is laid on the paper as a print, cut in two along the line
between them, and the halves are pulled apart:

- While they wait, the two halves are apart.
- The notes they send wait in the gap.
- When it is mutual, the print closes and is whole again.
- When only one of them sent one, the other half goes back into the paper.

## Shot by shot

| seconds | the shot | the words |
| --- | --- | --- |
| 0 | the roses, cut between the reaching hand (`maya`) and the hand holding them out (`jun`), the halves apart; whoever each line is about is lit, the other a little down | `maya's waiting for jun / to say it first.` then `jun's waiting for maya / to say it first.` |
| 3.5 | the gap opens wider | `so nobody does.` |
| 4.5 | wipe to the dancers, cut under their joined hands. Apart, each half is toned to its person: ice for maya, rose for jun. A card over each: `dear jun`, `dear maya`. Both type `i like you` in step, hover over `send`, and delete it | `they both / write it.` then `they both / delete it.` |
| 9.5 | a jolt back, caught with a shutter's blur; typed again, and the key now says `send privately`. Both press it, and each card folds into a sealed note drawn in the gap | `on celestual, / you send it anyway.` then `they only read it / if the other sent one too.` |
| 14.5 | `sat · 9:00 pm`. The halves close (motion blurred), the notes meet, and two rings of light go out. The print is whole and warms into one tone | `it's / mutual.` |
| 18.2 | the two in the sea at sunset, the whole frame, warm, a slow push in | `you both / find out.` |
| 20.8 | the roses again, apart. One note in the gap. The reaching half fades into the paper, and the note goes with it | `if only one of you / sends it,` then `nobody / ever knows.` |
| 24.2 | the paper. The line, then the name and the address | `stop waiting / for them to / say it first.` `celestual.us` |

The hook, two ways, for testing against each other:

- **a**, `celestual-reel-3.mp4`: `maya's waiting for jun / to say it first.`
  / `jun's waiting for maya / to say it first.` Two names make it a story
  at once.
- **b**, `celestual-reel-3-b.mp4`: `you're both waiting / for the other one
  / to say it first.` Spoken to the viewer.

## The design

This is a new look, made to share nothing with the first two reels except
the drawn lockup that signs it.

**Ground.** Chalk paper `#F4F1EA` with ink `#17150F`. It is the brand's
light ground, kept for rare use, where the first two reels were night. The
sea is the one exception: the whole frame, on purpose.

**Photographs as prints.** Each photograph sits on the paper with a soft
shadow. It is cut along a seam, straight or diagonal, that follows the gap
between the two people, and the halves turn slightly away from each other.
Every photograph drifts a little on Perlin noise and is never quite still.

**Tone.** The two black and white photographs are toned as duotone prints:
ice while she waits, rose while he does, and both warm as soon as it is
mutual. The roses are the only true colour in the film.

**Type.** The brand's Newsreader, set large and tight, each word rising
into its own mask on a spring and leaving the same way. The key words are
in italic: *first*, *write*, *delete*, *anyway*, *mutual*, *nobody*. The
small labels (`MAYA`, `JUN`, the cards, the chip) are Inter Tight. There is
no pixel type except the lockup.

**The product.** The composer card is drawn fresh as a soft paper card,
not the phone's screen, but it carries the product's own words: `dear
jun`, `send privately`, `it's mutual.`, and saturday at nine.

**Motion.** Springs on everything. Camera motion blur on the jolt and the
close. A wipe, a fade and a slide between scenes. Grain new every frame,
and a light vignette.

**Truth.** Only true claims. A private note is read only if the other sent
one too. Every mutual is revealed on saturday at nine. If only one of you
sent it, nobody ever knows.

**Safe zones.** Nothing to read below 1540 px or in the right-hand column
where Instagram's buttons sit.

## Sound

`assets/sound.wav` is effects only, near -30 LUFS, built by
`studio/scripts/sound.mjs` from the recordings in `studio/sounds/`
(`NOTICE.md` there says whose).

- a soft drum and gong as the roses appear
- a bowed cymbal under `so nobody does.`
- the keys as both type, softer as both delete
- a cymbal drawn in to the jolt
- the keys again, the two presses
- a breath into the notes
- a soft drum at saturday at nine
- a cymbal swell landing on the drum and the gong as the print closes
- the ocean drum under the sea
- a gong drawn in, backwards, as the one note goes
- a soft drum and gong under the name

## How it was made

`studio/` is a Remotion project:

- `src/Reel.tsx`: the film and its scenes
- `src/parts/Print.tsx`: the cut print and the tones
- `src/parts/Line.tsx`: the type
- `src/parts/Bits.tsx`: the paper, the grain, the card, the note, the rings and the lockup

To make it again:

```
cd reel/3/studio
npm install
node scripts/sound.mjs
npx remotion render src/index.ts Reel3 out/celestual-reel-3.mp4 --concurrency=3 --crf=19
npx remotion render src/index.ts Reel3B out/celestual-reel-3-b.mp4 --concurrency=3 --crf=19
```

To preview or edit the film live, run `npm run studio`.

`remotion.config.ts` points at the headless Chromium already on the
machine. On another machine, remove that line and Remotion downloads its
own.

## Credits and permissions

The photographs (`studio/public/photos/`) were supplied for the brief.
Unless they were taken for the campaign, the film needs their
photographers' permission before it is posted. `PHOTOS.md` says what to
shoot to replace them.

Remotion is free for individuals and for companies of up to three people.
Beyond that it needs a company licence (remotion.dev/license).

The recordings are from the Versilian Community Sample Library (CC0 1.0)
and Ion.Sound (MIT). The faces are Newsreader and Inter Tight (SIL Open
Font License).
