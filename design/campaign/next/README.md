# The next film

Scripts for celestual's second film, to choose between and refine. Each is
written to be built in the studio the first film was built in
(`app/src/studio/` and `scripts/studio-*.mjs` on `claude/campaign-studio`):
a clock, a picture drawn from `t`, a score written from the same clock,
photographed and finished.

| file | |
| --- | --- |
| [film/round.mp4](./film/round.mp4) | **round, the finished film.** Thirty seconds, four people, four letters on the wall, each to the next and the last to the first, with its score; it loops. [film/README.md](./film/README.md) says how to upload it |
| [ROUND.md](./ROUND.md) | **script B, round, the lead.** Its final cut first (four people in thirty seconds), then the long telling: one night, six people, six letters on the wall |
| [LOOK.md](./LOOK.md) | round's look: twelve rules, every reference and what is taken from it, a board for each world, what it refuses |
| [MAKING.md](./MAKING.md) | how round is made: the tools and techniques weighed, the dither, the flap, the flood, capture, encode, sound, the studio build |
| [TWO-INKS.md](./TWO-INKS.md) | script A, on file. A private note is one ink; a picture needs both |
| [PACIFIC.md](./PACIFIC.md) | the world round is made in, first written for a story now set aside |
| [treatment.html](./treatment.html) | the scripts drawn live: round's final cut with its sound and as a scrubbable animatic, and the press printing two inks. Open it in a browser |
| [page/](./page/) | the film's and the treatment's sources: `page/round-time.js` is round's clock (`node page/round-table.mjs` prints and checks it), the `round-*.js` modules draw it, `page/round-dev.html` is the bench it was made on, `page/render.mjs`, `page/score.mjs` and `page/encode.sh` make the film, and `python3 page/build.py treatment.html` builds the page |

---

## 1. What the first film was

Thirty five seconds in the black room: lin's note typed on a lit screen, a
hall of everybody's letters in WebGL, a note sent privately rising as a
light, two lights meeting at Saturday nine, the product's own reveal, the
lights that never met going out, and an empty letter under the question
`do they still think about you?`. A song written for it, its hook sung.
One sender, one feeling, looking back.

## 2. How we got here

Two scripts were written first: two inks (the press) and pacific (two
cities, two phones turning rose at nine). The owner loved pacific's look,
the whole world lit and dithered into four tones of a screen's colour with
the phones the only crisp lit things, and did not want its story, which was
the first film's again: two private notes, "is it mutual", a reveal at nine.
Two inks told the same story.

Round is pacific's world with a new story and a new subject: not the private
note and its reveal, but the wall. Before it was written the field was
surveyed for the most beautiful motion work there is, in pixels and dither,
in film and photography, in kinetic art and in the web's own libraries, and
the best of it went into LOOK.md and MAKING.md, with a list of everything
that makes a film look generated, refused.

## 3. The two, side by side

| | A. two inks | B. round |
| --- | --- | --- |
| the line | a private note is one ink. a picture needs both | every letter on the wall is to somebody. |
| what it is about | the private note and the reveal | the wall |
| the story | iris and jun on a bench, each printed in their own ink; Saturday at nine the press prints the one picture in both | six people in one night, each writing a letter to the next; the last to the first, about a seat given on a bus at dusk |
| the perspective | the press: a machine that sees both halves | the wall's: only we see the round; nobody in it knows |
| the world | riso prints on warm paper: rose, ice and black | six worlds of one city, lit and dithered into four tones, grey until each letter's colour runs out of its phone |
| the crazy part | every frame a different print; a moiré storm; a zoom into one violet dot | the frame is a split-flap: the one written to hangs mirrored above and falls, right way up, into the next writer's place; a line runs through all six worlds; the end shows all six at once and flips each into its letter |
| the end | the registration mark slides into register | the contact sheet, the wall, and a flap back into the first frame: it loops |
| the sound | a hocket at 120 bpm in F | a round at 150 in three, in E flat, a voice for each person (four in the final cut) |
| length | 30 s | 30 s, looping (the long telling 38.4 s) |
| cutdowns | 15 s, 6 s, 4:5 | 15 s, 6 s, 4:5 |
| the product's parts | the bench telling's bodies, the riso, rose and ice, the mark | the rig's bodies, the composer and its states, six of the twelve colours, the battery, the product's split-flap digits, its wash, the lockup |
| the biggest risk | the metaphor has to carry the mechanism | six worlds of drawing, and the chain read in one viewing |

## 4. Which one

**Make round.** It is the story the owner asked for in the world the owner
chose. It shows the product as it is (the composer, the greeting, the
colour, the battery, `being read`, the wall) and claims nothing it does not
do. It has a shape people remember (a kindness at the start, the letter
about it at the end) and a form that pays for repeat viewing (it loops, and
the second time the first scene means something). Its 15 second cut is a
whole story and its 6 second cut is a joke that stands on its own.

Two inks stays on file. It is the cheaper film and a good one, but it is
about the private note and its reveal, which is the first film's subject.

## 5. What round keeps

- The voice (VOICE.md): lowercase, says less, no exclamation marks, no
  emoji, no dashes, none of the banned words, no courage framing; letters
  that flatter the one they are to and ask for nothing.
- Only the facts (BRIEF.md 5, and the wall's README where BRIEF is behind
  it): letters to a name or to anything the writer calls somebody, the @
  never printed; every letter read before it goes up; twelve colours. No
  numbers of anybody or anything. No handles. No signal bars. Nobody in the
  film is told they were written to.
- The screens' twelve colours are the only hues.
- The lockup drawn from `brand.js` at whole pixels a cell, in chalk, never
  recoloured.
- Everything drawn by code; the figures are the product's own.
- Instagram's safe area: the top 250 and the bottom 340 px of a story clear
  of type, the right side clear of the buttons.
- The first film's bar: every style frame rendered, looked at as a picture,
  changed and rendered again, three rounds at least.

It stretches one rule on purpose, as pacific did: it dithers whole worlds,
which the product does only to pictures.

## 6. What to decide

ROUND.md, section 15: the letters (with alternatives for each), the names,
the 51B on the bus's sign, fourteen minutes past every time, 6 px cells or
4, the round in three or four, instrumental or a hum with words, and which
length goes first.
