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
likes you, someone entered you, swipe, dating. And never `unsent.` set as a
title: on its own and large it reads as The Unsent Project, which is
somebody else's. Courage-deficit framing is
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

`celestual-reel.mp4` (30 fps) and `celestual-reel-60.mp4` (60 fps), 1080 by
1920, 35 seconds, cut to a song written for it (`MUSIC.md`), every word on a
note. One story, told once, and one world for it: the phone's own screen.
lin writes the thing never said and sends it privately; it waits; every
mutual is revealed on saturday at nine; in the week somebody's note comes
in; at nine the two find each other and their two lights go out together
over the whole panel, and out of them comes lin's letter, which turns over:
on its other side is kai's, to lin, read for the first time, and it is
mutual; kai's melts back into the light; the ones that never meet go out,
their light going in, and nobody knows. Only lin is ever seen writing; kai's note is first read when
lin reads it. One clock (`app/src/studio/parts/reel-time.js`)
times the picture (`parts/reel.jsx`) and the song
(`scripts/studio-score.mjs`).

| ms | the shot | the words |
| --- | --- | --- |
| 0 | lin's note on the glass, the first sentence already there and the rest typed at a hand's pace: `i love`, a breath, `d` | `i never said this two years ago. i loved you. maybe i still do.` (on the phone) |
| 3750 | one shot: the camera comes back from the glass and rests on the letter under lin's long enough to read it, then makes one move up the hall's height and round, lands a little past and settles; the backlights come on outward from lin's, each in its own colour, a few screens dead; lin's letter comes away from the wall to the camera | `a wall of the ones / you never told.` |
| 10000 | send: every lit pixel of the letter's words leaves its place, the first words first, and goes into the envelope, so the envelope is made of the letter; sealed, a light goes over it and it lights; the phone goes out behind it as an old screen goes, to a bright line and a point; the envelope comes at the lens, the frames it was in a moment ago after it | `or send it / privately.` |
| 12500 | through the lens into the dark, and the frame is a screen's panel; the envelope's light goes on out over the whole of it as ink goes out in water, in smoky streaks that wind as they go, and the envelope goes away from us to its place, to wait, its light left round it, breathing as a phone's light does with something on it | `they only read it if / they send you one.`, centred under it |
| 15000 | the sentence ends on a clock that runs through the week, the day over the time and the time large; the week's notes come in round it, each as a screen comes on, each spreading a little of its colour round it, and on the thursday one in amber; while the clock runs the colours rush, the week in a few seconds; the clock stops at nine and `pacific` comes on under it; the others' colours go in, and are gone; the camera leans in and down on the two, the dark between them lighting as they near, and they find each other, wait a moment apart, and touch | `every mutual is / revealed on`, and the clock set in from them: `sat / 9:00 pm / pacific` |
| 20000 | on the touch the two lights go out together from where the envelopes touched, quickly at first and then slower and slower, never stopping, as a drop of ink spreads: lin's ice on one side and kai's amber on the other, winding into each other along spirals, a flash of the two at once at its heart, the envelopes' own pixels carried out on it. A third of a second on, out of the light comes lin's letter, at us, white as a screen coming on, its glass rippling and its words swimming as if under water, coming clear as it comes out: quickly out of the light, up and away on a curve and round, slowing, into the hand, banking into its curve and leaving its light behind it as an old screen's phosphor does. Before it has quite come to rest it turns over, leaning back a little first as a hand turns a thing and going a little past, its glass catching the light, the colours turning with it; on its edge, on the bar the song comes in on, it is a bright line and a ring of light goes out from it; and its other side comes on as a screen does, rippling once as the ring goes through it, in the amber it was written in: kai's, to lin | `i was waiting for you to say it first.` (on its other side), `it's / mutual.`, large, centred over it |
| 23750 | kai's, held, and brought a little nearer to be read, the light quieter round it and its colours on the letter's edges; then kai's melts back into the light: its words drawn out along the flow and its glass drawn outward, lifting into the light's own pale gold and thinning away into it, its edges first and its middle last, never a hole eaten in it and never a glowing edge, which would be paper burning; its light goes out from where it was, and the whole panel brightens to the cut | `you both find out.` |
| 25000 | the panel again, the light most of the way gone at the cut and the rest going out after; three notes alone on it, each with a little light round it, each going out as a screen does, to a line and a point, in its own time, its light going in as it goes | `if it isn't, / nobody / ever knows.`, flush right |
| 27500 | the question, a word on each note of the melody, centred, its last word large, and left there, whole, for as long as it took to ask; a low light rises from the foot of the frame under it, ice on one side and amber on the other; a ring goes out from `you?`; and as it ends all of the light is drawn in to one point | `do they still / think about / you?` |
| 31250 | the name: the point is the name's star, and the name is lit a cell at a time from it, in the middle of the frame, the camera come to rest for it; the star keeps a little of the light, breathing, and as the address is typed under it a last ring goes out from it | `celestual.us` |

The type is the phone's own face, Jersey 10, cut into its cells
(`app/src/wall/pixtype.js`) as the glass's own words are, a pixel of the
face seven of ours, and for the words that carry a scene fourteen; each
word lit on its note as a screen's pixels light, swept across in a few
frames, and gone the same way before its scene cuts. Each scene sets its
words its own way (`WORDS` in `parts/reel.jsx`): the hall's two lines
staggered, the first flush left and the second flush right under it;
`privately.` twice the size of the line before it; the night's centred
under the envelope as it waits; the date's clock large, set in from the
sentence it ends; `it's / mutual.` large and centred over the letter; the
ones that never meet flush right; the question centred in the middle of
the frame, its last word large; and the name in the middle. All of it is
on one grid, a large line's cells two of the grid's: the panel's grid is
the words' grid, and the notes on it and the name are on it too. The panel
is kept a little darker under each scene's words while they are up.

The hall is drawn in WebGL (`parts/wall-gl.js`): some three thousand
screens from one sheet of 125 different letters (`parts/wall-letters.js`,
photographed by `films/wall-atlas.jsx` into
`app/src/studio/assets/wall-atlas.jpg`), no letter within five screens of
itself and no colour beside itself, each on the inside of a curve that
rises out of sight, softened by its distance from the plane in focus, hazed
with distance, with dust in the air. An unlit screen is dark glass, and one
in fourteen is dead. lin's own phone is laid over its cell by a projective
transform, so it can type, come away from the wall and send, and the send's
pixels are mapped through the same transform. The camera is held as a hand
holds one: a slow unsteadiness, more on a longer lens, and a move that
lands a little past and settles; on the dark panel and on the letter, a
drift of a pixel or two and a breath of roll, under words that keep still
as a film's titles do, coming to rest for the name, which is never drawn
off its grid.

The dark is never only dark: from the lens on, the panel is a screen and
light moves in it. What the story places in it is colour, spreading
(`parts/reel-aura.js`): every note's light goes out round it into the dark
as ink goes out in water, quickly at first and then slower and slower,
never quite stopping, as a drop's spread does. Inside it the light is drawn
into smoky streaks and, through them, fine bright threads, as marbled ink's
are, flowing outward along the light's own spirals as it spreads, never
along spokes; its edge reaches further where its streaks are bright, as
ink's does along its tendrils, so it is never a circle and its front is
never a ring. Even the empty dark has a little of it, a faint blue from the
foot and a violet from the top, drifting, so no stretch of the film is a
still black frame. Each spread is a source the panel's shader draws each
frame (`parts/panel-fluid.js`): a domain-warped noise in the source's own
log-polar space, so its streaks flow out faster the further out they are
and lie along spirals (the warping after Inigo Quilez), drawn into a layer
of the panel's own cells, each cell a round point of light with its own
slow shimmer and a little of the same light smooth between them. Dim light
goes cool and grey as the eye sees it at night, and a warm light keeps its
colour only when it is bright, so nothing in it fades through brown.
Under it the light moves as ink moves in water, quietly. It is a
fluid, solved on the graphics card every sixtieth of a second (stable
fluids, after Pavel Dobryakov's WebGL Fluid Simulation, MIT): its flow
kept from piling up, its eddies kept alive, and its dye, the light, carried
on a grid of exactly the panel's cells, so each cell of the screen shows
the light that has drifted into it, as a star: drawn in the panel's own
pixels, a point where a little light has come, then a cross, a longer
cross and a sparkle where more has, each twinkling in its own time, mostly
the white of starlight with a little of the light's own colour, over a
faint haze of it. Not every cell is a star, so the sky is never the
screen's grid; it is a night, quiet, made of the screen. Its light is what
the notes and the spreading colours give off, a little at a time, carried
by three slow currents; it curls only a little and never rises, so nothing
in it reads as smoke or flame. The flow is stepped from the lens at a fixed
rate, so every frame is the same however it is come to. It is drawn with
three.js (MIT), the stars' glow postprocessing's mipmap bloom (Zlib).

How it moves, and why. The two lights at nine go out from the frame the
envelopes touch, from where they touch, as one thing is seen to cause
another (Michotte's launching effect), and the envelopes' own pixels are
carried out on them along the same spirals, so they read as one thing
becoming another (common fate). Where the two colours meet they wind into
each other along the streaks rather than meeting at a line, and where they
cross they make a third, pale warm white, as overlapping colours read as
transparent (Albers). The letter is in the light, and the light moves it:
in the reveal it is drawn in WebGL (`parts/reel-card.js`) from photographs
of its two faces (`films/reel-faces.jsx`), a mesh of its glass that the
flow moves and a picture drawn through the same flow, so as it comes out of
the light its words swim and come clear, a ring from its edge ripples it
once as it turns, and kai's melts back into the light the way the light
moves, drawn out along it. The mutual ones spread and the others go in:
one idea, carried through the whole film. Away from it the dark stays dark
enough to read in (Kenya Hara's emptiness), and nothing in it turns as a
spinner does or flickers as a flame does.

Nothing moves as a machine would. Every word comes on a little early or
late and at its own pace; the two notes come together on curves, kai's
moving first and lin's hanging back a moment before it touches; each of
the week's notes, and each of the ones that go out, comes on and goes out
in its own time and at its own brightness; the letter leans into its own
speed and comes level as it slows, and turns over as a hand turns a thing.
The letter's glass keeps its light, its dust and its glare, and not its
finest pixels, which would crawl as it turns and comes nearer.

What the reel keeps to: one grid throughout, each scene's words set their
own way on it, and a phone one size in one place, all of it clear of
Instagram's buttons on the right and its caption at the foot; one face; the
scenes cut, they never dissolve; and one glass, lin's, seen at the start
and, turned over, at the reveal, never another.

How it is made: `node scripts/studio-reel.mjs celestual-reel`. The song
first, in a minute (`MUSIC.md`); then two browsers each photograph a share
of the 2100 frames (`studio-film.mjs --frames`); then one pass of ffmpeg
lays the song under them and finishes them as a print would be
(`scripts/studio-finish.mjs`): the lens's faint veil, a red rim of
halation round the brightest light, a print's lifted black and rolled off
white, and a grain new every frame, strongest in the mid tones. The thirty
is each pair of the sixty laid over each other, a shutter open half the
frame, mixed before its grain.
