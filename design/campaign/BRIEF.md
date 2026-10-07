# The campaign: brief

Posters and a film for celestual, drawn with the product's own parts. This is
the brief every picture in `design/campaign/` was made against. The pictures
are made by code (`app/src/studio/`), photographed by
`node scripts/studio.mjs`, and the reel by `node scripts/studio-reel.mjs`
(section 8).

`design/DESIGN.md` and `design/VOICE.md` are the law. This file is how the
campaign reads them.

---

## 1. The idea in one paragraph

**Unsent.** A phone left on in a black room, an unsent draft on its screen,
the cursor still after the last word. The street campaign already said it:
printed Series 40 screens taped up with plasters on shutters, walls and
fridges, each a short, specific letter to one person ("the pretzel guy asked
why i came alone. i said he won't see you anymore."). The campaign is that
object carried into every format: the feed, a story, LinkedIn, a banner, a
wall. One lit thing in the dark per picture. The words are the hero; the
phone is how they are carried; the mark and the word sign it.

What it must never look like: a SaaS ad, a gradient blob, a dating app, a
template. No stock, no icons, no emoji, no glassmorphism, no purple to blue
gradients, no rounded white cards with drop shadows, no "AI poster" bloom
everywhere. If a picture could belong to any other product, it is wrong.

## 2. The materials (all real, all in the repo)

| Material | Where | How to use it |
| --- | --- | --- |
| the screen | `Phone` in `app/src/studio/kit.jsx` (the wall's `Screen`) | `mode="draft"`: the street posters' composer (name, `216/1`, pen `abc`, words, cursor, `options ♡0 send`). `mode="letter"`: a wall letter (`dear Sofia`, the date, options, heart and replies). `mode="bare"`: a glass for a story |
| twelve colours | `tint`: `night`, `white`, `ice`, `teal`, `green`, `acid`, `violet-yellow`, `amber`, `rose`, `lilac`, `negative`, `xerox` | each is its own treatment (lit LCD, screen print, riso, xerox, the brat square). `seed` makes each phone its own phone (tilt, dust, backlight) |
| the stories | `StoryPhone` / `StoryGlass` / `filmOf` | `intro`: two people run in, are held, glide into the mark. `reveal`, `film` (names credited, then `it's mutual.` typed), `gathered`, `mark`. Any `t` on their clock, or the last frame |
| the brand | `Lockup`, `Mark` | always the drawn pixel lockup, at a WHOLE number of pixels a cell (`cell={2}`, `{3}`...), chalk with its bloom on dark, ink without on light. Never a font, never scaled by a fraction, never recoloured but chalk `#F4F1EA` or ink `#0A0A0C` |
| the light | `Light` | the light a lit screen throws on the black, in its colour |
| the grain | `Board grain={0.07}`, `Grain` | feTurbulence, generated |
| the plaster | `Plaster` | the campaign's tape: the posters went up with plasters |
| the photographs | `Photo name="..."` | the campaign's own stills, 16:9: `street-four` (four people, faces covered by their screens, pointing at camera), `street-spiders` (two spider-men with screens on their heads), `wall-david` (the green screen on a stickered wall), `shutter-lin` (the riso screen on a teal shutter), `shutter-ryan` (the white screen on a black shutter), `fridge-sasha` (the xerox screen on a drinks fridge), `mutual-cafe` (a man reading the mutual on his phone in a green cafe) |
| the faces | `--st-serif` Newsreader (display and italic, 200 to 800), `--st-pixel` Jersey 10, `--st-mono` Geist Mono, `--st-sans` Inter Tight | see 4 |
| shaders | `@paper-design/shaders-react` (in the app's deps): `Dithering`, `GrainGradient`, `MeshGradient`, `LiquidMetal`, `PaperTexture`, `HalftoneDots`, `ImageDithering` and more | only where they are the light of a screen or the room, never as decoration for its own sake. WebGL renders headless (SwiftShader); use `speed={0}` and a fixed `frame` so a picture is the same every time, and `useHold` until the first frame is drawn |
| GSAP | `gsap` (app devDependency) | the film's timeline: a paused timeline seeked to `t` |

## 3. The rules the pictures keep

1. **One bright thing per picture.** A lit screen OR a bloom, never two
   competing. A grid of screens is allowed when it reads as ONE wall, with one
   screen lit brighter than the rest.
2. **The accent is rationed.** `#74C7DE` at most once, small, or not at all.
   The screens' twelve colours are the colour; nothing else names a hue.
3. **The ground is the room's black** `#000`, with grain. A light ground is
   chalk `#F4F1EA` (paper), used rarely and deliberately, with ink type.
4. **Everything is drawn.** No icon set, no stock, no emoji, no clip art.
5. **The lockup signs the picture**, small, with clear space of half its
   height round it. Usually under the phone, as the shared picture signs
   itself, or at a corner on a wide format.
6. **Whole pixels.** The pixel things (the lockup, the mark) at whole cells.
   Phones at any width; Jersey at any size.
7. **Nothing touches an edge it should not.** Instagram's 4:5 safe area,
   the story's top 250 and bottom 340 pixels kept clear of type, LinkedIn's
   banner left third kept clear (the profile photo covers it).

## 4. Type

| Face | Job |
| --- | --- |
| Jersey 10 | anything on or of the phone: the letters, labels, the url, keys |
| Newsreader display (500, tracking `-0.022em`) and its italic | feeling. A headline a person means. Set large, lowercase, with real optical sizing. The italic for one word at most |
| Geist Mono | identifiers: `celestual.us`, dates, counts, frame numbers, a hash. Small, `0.04em` to `0.15em` tracking, lowercase or uppercase labels |
| Inter Tight | small mechanics only, rarely |

Type sits on a grid. Big contrasts of scale (a 300px headline and an 11px
label) beat many medium sizes. Ash `#9C978E` for secondary, never
`#605C55` for anything that must be read.

## 5. The voice (design/VOICE.md, enforced)

Lowercase. Says less. Never excited, never selling, never apologetic.
Literally true. **No exclamation marks, no emoji, no em or en dashes, ever.**
Never: match, matched, unlock, premium, hurry, don't miss, find out who
likes you, someone entered you, swipe, dating. Courage-deficit framing is
banned ("too scared to tell them?"). Silence is the product working.

### The lines (use these, or write new ones as carefully)

- nothing happens unless it's mutual.
- no profiles. no browsing. nothing happens unless it's mutual.
- send it privately. they only read it if they send you one.
- if it's ever mutual, you'll both know. if it isn't, nobody ever will.
- it's mutual.
- you've both sent each other a message.
- the rest is yours. celestual's part is done.
- not this time. they didn't send you one. they'll never know you did.
- write a letter. put it up.
- every letter on the wall is to somebody.
- still feel it?
- unsent.
- the cursor is still blinking.
- celestual.us

### The facts (the only claims a picture may make)

- A private note is read only if they send you one back. If they never do,
  nobody is told anything, ever.
- One free ping every week. More at $2.99 each.
- The reveal is Saturday, 9pm Pacific.
- Letters on the wall are addressed to an Instagram @ or a first name, and
  the @ is never printed on the letter.
- Every letter is read before it goes up.
- A letter can be lit in twelve colours.
- The copy has a linter: no exclamation marks, no emoji, no dashes.
- Matching runs on a salted hash. **Do not** claim the server stores only a
  hash: since migration 0010 it does not (docs/SECURITY.md).
- No numbers of users, letters, mutuals or anything else. None are given here
  and none may be invented.

### The letters

The street campaign's own (the name is who wrote it, on the draft's status
row, and the colour it was printed in):

| name | colour | letter |
| --- | --- | --- |
| charlie | amber | i made so many cupcakes. i can't quite make them like you do. |
| amy | ice | the alleyway behind the dumpling shop where u kissed me. |
| jessica | rose | i wonder if you still wear our ring. i do. |
| lin | rose (it was printed pink on blue) | do you ever think about me when you pass by our cafe? |
| sasha | xerox | the pretzel guy asked why i came alone. i said he won't see you anymore. |
| david | green | my little alcoholic. the bartender at fifth ave asked about you. |
| ryan | white | i still can't forgive you for what you have done. or maybe i can't forgive myself for forgiving you. |

New ones, written for this campaign:

| name | letter |
| --- | --- |
| maya | the coffee guy still makes two. i drink both. |
| noah | you said we'd see the cherry blossoms next year. it's next year. |
| june | your song came on at the laundromat and i let my clothes go round again. |
| theo | i walk the long way home now. it passes your building. |
| mina | we never finished the show. i'm on episode six. i'm waiting. |
| eli | i kept the receipt from our first dinner. $41.80. best money i ever spent. |
| ren | the library seat by the window is free on tuesdays. i check. |
| jules | do you still sleep on the left side? |
| sam | you still have my hoodie. keep it. i just wanted you to know i know. |
| ana | i saw your dog at the park today. he remembered me. |

The mutual in the cafe still is two Korean notes: `그때 나를 놓아줘서 고마웠어`
(thank you for letting me go back then) and `잘 봤어 항상 응원할게` (i saw
you on tv. i'll be rooting for you). The handles on that phone are real
people's; never set them again in a new picture.

## 6. The formats

| id | size | for |
| --- | --- | --- |
| `ig-*` | 1080 by 1350 | the feed, 4:5 |
| `ig-story-*` | 1080 by 1920 | a story or a reel cover |
| `ig-carousel-*` | 1080 by 1350 each | a carousel, the slides reading as one strip when swiped |
| `li-post-*` | 1200 by 1500 | a LinkedIn post, 4:5 |
| `li-link` | 1200 by 627 | a LinkedIn link card |
| `li-banner` | 1584 by 396 | the LinkedIn profile banner |
| `li-doc-*` | 1080 by 1350 each | a LinkedIn document carousel, also bound as one PDF |
| `x-header` | 1500 by 500 | the X header |
| `print-*` | A4 at 300 dpi (827 by 1169 CSS at `scale: 3`), and 18 by 24 in (900 by 1200 at `scale: 6`) | printed and pasted up |

"LinkedIn larping" is the founder's register on LinkedIn: the design system
flex, the principle card, the lesson carousel. It is still this voice: no
"thrilled to announce", no "we're hiring", no invented metrics. The flex is
that the product is made with this much care, and that is true.

## 7. The bar

Every picture is looked at, as a picture, before it is kept: rendered,
opened, judged, changed, rendered again. At least three rounds. It is done
when a stranger scrolling past would stop on it, a designer would screenshot
it, and the founder would post it without changing a word. Typographic
detail matters: optical alignment, real line lengths, no widows on a
headline, no orphaned word on its own line, consistent margins from a grid
(the board's width over 12 or 15 is a good unit).

## 8. The reel

`film-unsent.mp4` (30 fps) and `film-unsent-60.mp4` (60 fps), 1080 by 1920,
15 seconds, cut to its own score at 120 beats a minute. One clock
(`app/src/studio/parts/reel-time.js`) times the picture (`parts/reel.jsx`)
and the score (`scripts/studio-score.mjs`), so a key is heard on the frame
its letter lands and the drop is the frame the two meet.

| ms | the shot |
| --- | --- |
| 0 | the glass up close, lin's note typed a letter at a time, the camera after the cursor to the question mark |
| 1750 | the camera falls back through the phone into a wall of unsent notes (the letters in 5), lit one by one |
| 2500 | `unsent.` |
| 3500 | the hard cut on the bar: send, the envelope off the glass and through the lens, `send it privately.`, the screen going out |
| 5500 | the other phone: kai's own note, `they only read it if they send you one.` |
| 7500 | the week on a split flap board, a day a sixteenth, the city under it, to `sat 9:00 pm pacific.` |
| 9000 | the product's own reveal (`filmOf`) on the glass at the size of the room: they run in |
| 10000 | the drop: they are held, the glass turns rose, the pixels gather into the mark, `it's mutual.` |
| 12600 | the mark in liquid metal (the product's `LiquidMark` shader), `nothing happens unless it's mutual.`, `celestual.us` |

How it is made: `node scripts/studio-reel.mjs film-unsent --jobs 3`. The
score is synthesised from the clock and mastered to −14 LUFS; three browsers
each photograph a share of the 900 frames (`studio-film.mjs --frames`); one
pass of ffmpeg lays the score under them, blooms the lights, parts the red
and blue by a pixel, and moves a grain over it. The thirty is each pair of
the sixty laid over each other, a shutter open half the frame.
