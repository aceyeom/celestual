// ── the wall's letters ──────────────────────────────────────────────────────
//
// The letters the reel's wall is made of: the street campaign's own, the ones
// written for the campaign (design/campaign/BRIEF.md 5), and more in the same
// hand, each to one first name, lit in one of the twelve colours. They are
// photographed once, each on the wall's own `Screen`, into one sheet
// (films/wall-atlas.jsx), lin's note in the first cell and these after it,
// and the reel's wall draws every letter of it from that sheet
// (parts/wall-gl.js).

export const ATLAS = { cols: 8, rows: 6, w: 400, h: 464 }

export const TINTS = ['night', 'white', 'ice', 'teal', 'green', 'acid', 'violet-yellow', 'amber', 'rose', 'lilac', 'negative', 'xerox']

// [first name, letter]
export const LETTERS = [
  ['jessica', 'i wonder if you still wear our ring. i do.'],
  ['charlie', 'i made so many cupcakes. i can’t quite make them like you do.'],
  ['amy', 'the alleyway behind the dumpling shop where u kissed me.'],
  ['sasha', 'the pretzel guy asked why i came alone. i said he won’t see you anymore.'],
  ['david', 'my little alcoholic. the bartender at fifth ave asked about you.'],
  ['ryan', 'i still can’t forgive you for what you have done. or maybe i can’t forgive myself for forgiving you.'],
  ['maya', 'the coffee guy still makes two. i drink both.'],
  ['noah', 'you said we’d see the cherry blossoms next year. it’s next year.'],
  ['june', 'your song came on at the laundromat and i let my clothes go round again.'],
  ['theo', 'i walk the long way home now. it passes your building.'],
  ['mina', 'we never finished the show. i’m on episode six. i’m waiting.'],
  ['eli', 'i kept the receipt from our first dinner. $41.80. best money i ever spent.'],
  ['ren', 'the library seat by the window is free on tuesdays. i check.'],
  ['jules', 'do you still sleep on the left side?'],
  ['sam', 'you still have my hoodie. keep it. i just wanted you to know i know.'],
  ['ana', 'i saw your dog at the park today. he remembered me.'],
  ['iris', 'i still have the playlist you made me. i never skip the last song.'],
  ['leo', 'we said we’d stay friends. i’m still trying.'],
  ['nina', 'i kept your jacket. it still smells like rain.'],
  ['omar', 'you were the first person i wanted to tell, every time.'],
  ['zoe', 'i drove past your old apartment tonight. the light was on.'],
  ['felix', 'you taught me your mom’s soup. i make it when i miss you.'],
  ['ava', 'we never had a last conversation. this is it, i guess.'],
  ['kofi', 'i hope your new city is kind to you.'],
  ['mei', 'you said see you tomorrow. that was in march.'],
  ['luca', 'i wrote this six times. this is the shortest one.'],
  ['rosa', 'i still set two cups out some mornings.'],
  ['dev', 'you were right about the movie. i watched it again.'],
  ['clara', 'i think about the night the power went out and we just talked.'],
  ['ivan', 'you held my hand for one song. i remember which one.'],
  ['yuki', 'if you ever come back, the spare key is still under the plant.'],
  ['sol', 'i was never good at saying it. so: thank you.'],
  ['ezra', 'we both pretended not to see each other at the station. i saw you.'],
  ['nell', 'you looked happy in the photo. i’m glad. mostly.'],
  ['aria', 'the bakery on fourth closed. i wanted to tell you first.'],
  ['finn', 'you left before i said the important part.'],
  ['tara', 'i wish i’d kissed you at the bus stop. i think about it at every bus stop.'],
  ['bea', 'i still say goodnight to you. you just can’t hear it.'],
  ['cyrus', 'we were good at being quiet together.'],
  ['hana', 'you are the reason i like rainy days.'],
  ['owen', 'i still have the ticket stub. row f, seat 12.'],
  ['priya', 'i almost called you on your birthday. this is me calling.'],
  ['marco', 'you made the city feel small. it feels so big now.'],
  ['tess', 'i read your old texts sometimes. only the good ones.'],
  ['ruby', 'i saved you a seat at graduation. nobody sat there.'],
  ['jonah', 'you were never just a friend. i should have said so.'],
  ['wren', 'i still have your voicemail. i don’t play it. i just keep it.'],
]

// the colour each wall letter is lit in, the twelve in turn and staggered so
// two neighbours on the sheet are never the same
export const tintOf = (i) => TINTS[(i * 5 + Math.floor(i / 12)) % TINTS.length]
// the sheet's cells: lin's note in the first, every letter after it
export const CELLS = LETTERS.length + 1
export const cellTint = (c) => (c === 0 ? 'ice' : tintOf(c - 1))
// hearts on a letter: a few, different on each
export const heartsOf = (i) => [3, 7, 1, 12, 4, 9, 2, 5, 6, 0, 8, 11][i % 12]
