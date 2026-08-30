// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE WALL, POPULATED                                                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Seventy-two letters across sixty-six handles. This is a visual prototype, so
// the corpus is not filler — a wall is only legible when it is FULL, and half
// the design decisions in this build (the density of the field, where a long
// handle wraps, what a run of them looks like at three sizes) cannot be judged
// against six rows of lorem.
//
// ── every letter is public, all the way through ─────────────────────────────
// There is no hidden half. An earlier build kept a second line on each letter
// that only the person it was about could open, which meant the wall had to
// know who anybody was — and asking a stranger to prove a handle is theirs, on
// a surface they reached by scanning a card thirty seconds ago, is the whole
// reason that build did not work. The letter you can read is the letter.
//
// The rules the corpus is written to are the product, not a style guide:
//
//   · Berkeley-specific. A place and a rhythm somebody who was there would
//     recognise, because a wall of generic longing is a wall of nobody.
//   · Warm valence only — longing, admiration, regret, apology, thanks. No
//     jokes at anyone's expense. A technically compliant but lukewarm letter
//     about a real person is still a bad day for that person.
//   · Never a physical description paired with a location or a schedule. That
//     combination is the stalking shape, it passes every generic filter, and
//     it is the one thing this wall cannot ever be seen to publish.
//   · Invented handles. Not one of these is a person; they are assembled from
//     parts that do not resolve to anybody.
//   · Thirty to sixty words: someone unforgettable, and what makes them so.
//
// `h` the handle it is about · `b` the letter. There is no third field, and
// there is no field naming who wrote it — see data.js.
// Handles repeat on purpose: six of them carry two or three letters, because
// the first thing anyone does at a demo table is search a handle twice.

export const SEED = [
  { h: 'sofiaaa.reyes', b: "You sat on the left side of Doe every Thursday and I moved two tables closer each week. You never noticed. I never said anything. I hope finals were kind to you. You always folded the corner of page one." },
  { h: 'danny.k.k', b: "You gave me your umbrella outside Wheeler and walked home in it. I still have it. It's been two years and I still have it. Green handle, one broken spoke." },
  { h: 'm.oyelaran', b: "Free Speech Movement Café, corner table, October. You were reading something with a cracked spine and laughing at it alone. I've thought about that more than I've thought about most conversations." },
  { h: 'june.hh', b: "We were both waiting for the 51B in the rain and you said the thing about how buses only come in pairs. I've told that joke maybe forty times since and never once credited you. You were holding two coffees. Neither was yours." },
  { h: 'theo.arroyo', b: "I said something unkind in front of people who didn't matter and you never brought it up. I've been carrying it since March. I'm sorry. That's the whole letter." },
  { h: 'wren.p', b: "Fourth floor Moffitt, 3 a.m., dead week. You lent me a pen without looking up. I finished the exam with it. I never gave it back and I never introduced myself. It was out of ink by page three." },
  { h: 'abbygail.s', b: "You sang the whole way down Telegraph and did not care who heard. I was three steps behind you and I have never once in my life been that unembarrassed." },
  { h: 'nnamdi.o', b: "We had one conversation on the steps and then four years of nodding. I think about the version where I said something on the second day. You said you'd rather be early than right." },
  { h: 'lucia.mendes.b', b: "You saved me a seat for a month without ever mentioning it. I noticed every single time. Third row, aisle, always." },
  { h: 'ezra.k.lin', b: "I keep the receipt from Cheese Board. Not because of the pizza. You paid and pretended it was your turn." },
  { h: 'priya.n.raghav', b: "You held the door at Dwinelle for a full minute because there was a line of us behind you, and you did it like it cost you nothing at all. I have tried to be that patient ever since. You were carrying too many books to be doing that." },
  { h: 'cal.westergren', b: "Every morning on the 51B you gave up your seat before anyone had to ask for it. I watched you do that for two semesters and I never once said thank you." },
  { h: 'hana.tsuji.b', b: "Memorial Glade in April. You were asleep in the sun with a book over your face and I walked the long way around so I would not wake you. I still take the long way. The book was upside down." },
  { h: 'omar.dabbagh', b: "You explained the whole problem set to a stranger in the Soda lobby at midnight and then left before he could get your name. I was the stranger's roommate. He passed. You drew the diagram on a napkin." },
  { h: 'linnea.q', b: "I saw you crying on the Campanile steps and I kept walking because I thought that was the polite thing to do. I have decided since that it was not. I hope somebody sat down." },
  { h: 'teddy.marchetti', b: "Caffe Strada, the outside table under the heater, winter. You were arguing about a poem with somebody who was not listening to you. I was listening. You lost the argument and you were right." },
  { h: 'yaz.almeida.k', b: "You gave me the last cinnamon roll at the Golden Bear and said you had already had two. You had not. I watched you order coffee and nothing else. Black, no sugar, every single time." },
  { h: 'simone.oduya', b: "We were lab partners for eleven weeks and I learned your handwriting before I learned anything about you. I would know it now, years on, on the back of an envelope. You crossed your sevens." },
  { h: 'rafa.villanueva.j', b: "You waited with me at the Unit 3 desk until my key card worked, at two in the morning, in the cold, for somebody you had never met. It took forty minutes. You said you were not tired and then yawned nine times." },
  { h: 'bex.hollowell', b: "I was the one who laughed too loud in Wheeler during the quiet part, and you were the only person in that room who laughed with me instead of turning around." },
  { h: 'ivo.stanek', b: "You left a note in the margin of a library book in Doe about how the author was wrong, and wrong beautifully. I checked that same book out four times looking for more of you. Third floor, the shelf by the window." },
  { h: 'noor.a.esfahani', b: "Down in the eucalyptus grove by the creek, you were on the phone to your mother in a language I do not speak, and I understood the entire conversation anyway." },
  { h: 'gus.pemberton', b: "You covered my shift at Crossroads the night my father was in the hospital and you never brought it up again. Not once. Not even when I tried to thank you for it. You told the manager you owed me. You did not." },
  { h: 'adaeze.n.mbeki', b: "First day of dead week, Moffitt fourth floor, you handed out granola bars to a whole floor of strangers and left. Nobody asked you to do that. I still think about why you did. There were exactly enough." },
  { h: 'wyatt.solomon.c', b: "We shared an umbrella from Sproul to Bancroft and had the best conversation of my four years there and then never spoke again. I do not know how that happens. It happened." },
  { h: 'clem.arriaga', b: "You sang along to something in your headphones in the RSF stairwell, badly and completely, and I have thought about your total lack of self-consciousness more than I have thought about most books. It was in Portuguese." },
  { h: 'dez.whitfield.b', b: "I said I would come to your show at the Greek and I did not, because I was tired, which is the worst reason there is. I heard it was good. I am sorry I was not there." },
  { h: 'maren.lindqvist', b: "You always said good morning to the woman who cleaned our floor in Unit 3, and you always used her name. I did not know her name for two years. I know it now. It was Rosa." },
  { h: 'kofi.asante.b', b: "Free Speech Movement Café. You gave up the seat by the outlet for somebody whose laptop was at four percent, and moved to the floor, and stayed on the floor for three hours. You said the floor was better for your back." },
  { h: 'tallulah.ibarra', b: "You told me my essay was bad and exactly why it was bad, kindly, at eleven at night, and it was the single most useful thing anybody did for me at that school. You used a green pen. Everyone else used red." },
  { h: 'sana.k.mirza', b: "The 51B broke down at Ashby and you organised twenty strangers into a walking group so that nobody had to go the rest of the way alone in the dark. You were the last one to peel off." },
  { h: 'bram.vandersteen', b: "Cheese Board line, a Tuesday, and you let the person behind you go first because they were obviously in a hurry. Then you did it again for the next one. You waited through four people. I counted." },
  { h: 'isadora.chen.w', b: "I have never told anybody this. I chose my major because of something you said on the steps of Wheeler about work being a way of paying attention. You were talking to someone else." },
  { h: 'ronan.mcgrath.b', b: "You lent me your notes for a class you were also failing. That is the part I keep coming back to. You had nothing to give and you gave it to me anyway. We both retook it. You got the A." },
  { h: 'pilar.echevarria', b: "Telegraph, the man outside the bookshop who asks everybody for change. You are the only person I ever saw stop and ask him how he was and then stand there and wait for the answer." },
  { h: 'nate.oyelowo.k', b: "I was new and homesick and eating alone at Clark Kerr and you sat down across from me without asking and talked about nothing for an hour. I made it through that year. You had two desserts and no dinner." },
  { h: 'juno.baptiste', b: "You held the elevator in Evans for me and I said do not worry about it and you said it is already held. I have used that line for years. It is yours." },
  { h: 'sol.ferreira.a', b: "Up at the Big C at sunrise in October, you offered half your thermos to a person you had met nine minutes earlier. It was terrible tea. I have never forgotten it. Too much sugar. On purpose, you said." },
  { h: 'edith.kwarteng', b: "You noticed I had stopped coming to the study group before anybody else did, and you texted me, and that text is the reason I came back. I never told you that it was." },
  { h: 'linus.hartvig.p', b: "La Val's, after the last final, you paid for a table of people who were mostly strangers to you and slipped out before the check came back. I saw you do it. Nobody else did. You left cash under the salt." },

  // ── the second pass ──────────────────────────────────────────────────────
  // Written to the same rules. Six handles below repeat a handle above, so the
  // search returns more than one row and the letter sheet has somewhere to go.
  { h: 'sofiaaa.reyes', b: "Different person, same table. You explained the reading to somebody who had clearly not done it and you did it without once making them feel stupid. That is a rarer skill than the reading." },
  { h: 'wren.p', b: "You were the only one who stayed to stack the chairs after the meeting, every week, for a year, while the rest of us were already out of the door and talking about dinner. You did the back row first. Always the back row." },
  { h: 'june.hh', b: "I have started three letters to you and deleted all of them. This is the fourth and I am going to leave it. You were kind to me on a day I had not earned it." },
  { h: 'omar.dabbagh', b: "Soda, second floor, and you talked me out of dropping out at one in the morning using nothing but a whiteboard and about nine minutes. I finished. I never said why. You drew a very bad graph." },
  { h: 'maren.lindqvist', b: "You brought soup to a floor meeting because one of us had been sick and you did not announce it or make it a thing. It was just there. There was a lid and a ladle." },
  { h: 'ezra.k.lin', b: "Berkeley Marina in February, and you said the thing about how the fog is not weather, it is the bay breathing. I have repeated that to every person I have ever taken there. You were wearing the wrong coat for it." },
  { h: 'ines.baptista.v', b: "You waited outside the exam hall for a friend who was still inside, for an hour, in the rain, so that they would not walk out to nobody. I was two doors down and I saw all of it." },
  { h: 'kwame.osei.b', b: "You laughed at my terrible joke in section, the only person who did, and then defended it afterwards on the way out to somebody who had told me it was terrible. It was about the Peloponnesian War. It was terrible." },
  { h: 'saoirse.nolan.k', b: "You gave a whole tutorial to somebody in the Moffitt stairwell on how to use the printers, patiently, twice, when you were obviously late for something yourself." },
  { h: 'yuki.matsuda.r', b: "Every Sunday you put the kitchen back the way you found it, including the parts that were not yours, and never once mentioned it to any of us. I noticed in week three. You lined the mugs up by handle." },
  { h: 'tomas.aguirre.n', b: "You told me the truth about the thing I had written when everyone else was being polite about it, and you were right, and I rewrote it, and it got in." },
  { h: 'delphine.roux.b', b: "Zellerbach, the interval, and you gave your programme to somebody who did not have one and then sat through the whole second half without knowing what was being played. You said you would rather be surprised." },
  { h: 'hassan.el.tayeb', b: "You changed a stranger's bike tyre outside Kroeber and would not take the five dollars they tried to give you, and then you were late, and you did not say you were late." },
  { h: 'nkechi.obiora.a', b: "I sat behind you in a lecture for a whole semester and never spoke to you, and I still think about the way you asked questions like the answer mattered more than looking clever. You always put your hand up last." },
  { h: 'anders.vikstrom', b: "You spent forty minutes helping me find a book in Doe that turned out to be on the wrong floor entirely, and when we found it you seemed genuinely pleased about it." },
  { h: 'marisol.quintero', b: "Sproul in the middle of something loud, and you stopped to help somebody pick their whole bag up off the ground while everybody else went round. I went round. I am sorry I went round. A hundred flyers, all face down." },
  { h: 'sinead.oflaherty', b: "You wrote to somebody on this wall. I know because you told me you were going to and then went quiet about whether you had. I hope they looked. I hope it was mutual." },
  { h: 'raj.balasubramanian', b: "You made a room of very tired people laugh at eleven at night in the middle of a project that was going badly, and everything after that went better, and nobody ever said so. You did the voice. You know the voice." },
  { h: 'oona.mccarthy.b', b: "You brought your own mug to the coffee place every single day for four years and never once made anybody else feel bad about not doing it. That is the whole thing I admired." },
  { h: 'jonah.osterman', b: "You said something on the steps about how being homesick is just love with nowhere to put itself. I have given that line to four people since. I am giving it back to you now. You did not think it was any good." },
  { h: 'amara.diallo.k', b: "You noticed the new person standing at the edge of the room and you went and stood with them instead of waiting for them to come in. I have watched you do that three times." },
  { h: 'felix.nakamura.b', b: "You returned a wallet to the desk at Doe with everything still in it and did not leave a name, and I only know it was you because I was in the queue behind you. You were annoyed it took so long." },
  { h: 'zainab.hakimi', b: "You explained the same thing to me four times without ever once letting on that it was the fourth. I got it on the fourth. I have tried to be that person for other people." },
  { h: 'lars.henriksen.j', b: "Crossroads, the end of a long night, and you carried three trays that were not yours because the person carrying them was clearly about to drop all of them. You dropped one. It was fine." },
  { h: 'aiko.shimizu.p', b: "You left a plant with me over the summer and told me it was hard to kill, which was a kind lie, and I did kill it, and you said nothing about it in September." },
  { h: 'oskar.bielinski', b: "You lent your only good jacket to somebody going to an interview and wore something useless for a week in February and never mentioned where the jacket was. They got the job." },
  { h: 'thandiwe.mokoena', b: "You told me you liked something I made before I had told anybody I made it, which means you went looking, which is the part I have never got over." },
  { h: 'emil.rasmussen.c', b: "Evans, the lift that is always broken, and you took the stairs with somebody's boxes for them to the seventh floor and then went back down for the second load. You counted the flights out loud." },
  { h: 'gemma.oyelaran.t', b: "You read a whole draft of something for me in one night and gave it back covered in questions, none of which were unkind, all of which were the right question." },
  { h: 'petra.kovacevic', b: "You held a seat at a full table for somebody who was fifteen minutes late and got looks about it from three people and held it anyway. I was one of the three. I was wrong. You put your bag on it and did not blink." },
  { h: 'malik.johansson.b', b: "You waited at the bottom of the hill for the slowest person in the group on every single walk, and you did it in a way that never made it look like waiting." },
  { h: 'freya.osullivan', b: "You told a very long story badly and completely committed to it, and the whole table was better for it, and I have thought about that as a way of being in the world. It was about a heron. It went nowhere." },
]

// The printed surfaces a scan can come from. Shipped as a list so the flyer,
// the card, the chalk and the table are measurable against each other for
// nothing — which quote and which corner actually works is a question you only
// get to answer if you asked it before printing.
export const SOURCES = ['flyer-a', 'flyer-b', 'flyer-c', 'card', 'chalk', 'table', 'direct']

export function normSource(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)
  return SOURCES.includes(s) ? s : 'direct'
}

// ── the ledger ──────────────────────────────────────────────────────────────
// What the CORE SERVICE looks like once somebody is standing in it — reached
// only from the tab that appears after you have put a letter up, and never
// from the wall itself. Nothing below is wall data: the wall has no accounts,
// no pings, no mutuals and no idea who anybody is.
//
// `days` is days remaining on the sixty; `state` is what the row says out loud.
export const LEDGER = [
  {
    id: 'p-mutual',
    handle: 'june.hh',
    state: 'mutual',
    days: 41,
    placed: 'nineteen days ago',
    // A mutual is two cards, and both of them are readable, because the whole
    // point of the mechanism is that this moment is the only one where they are.
    yours: "You said buses only come in pairs and I have been telling that joke for two years without ever once giving you the credit for it. I am giving it to you now.",
    theirs: "I have started three letters to you and deleted all of them. This is the fourth and I am going to leave it. You were kind to me on a day I had not earned it.",
  },
  { id: 'p-standing', handle: 'ezra.k.lin',   state: 'standing', days: 52, placed: 'eight days ago',
    yours: "I keep the receipt from Cheese Board. Not because of the pizza. You paid and pretended it was your turn." },
  { id: 'p-lapsing',  handle: 'wren.p',       state: 'lapsing',  days: 4,  placed: 'fifty-six days ago',
    yours: "Fourth floor Moffitt, 3 a.m., dead week. You lent me a pen without looking up. I finished the exam with it." },
]

// The account the core-service preview is standing in. The wall has no
// identity of any kind, so this is the first point anywhere in the prototype
// where somebody has one — and it arrives at registration, not before.
export const ME = 'you'

// The date the core screen opens on. Fixed rather than read off the clock: a
// prototype that reads differently on a Sunday is a prototype somebody has to
// apologise for mid-demo.
export const TODAY = { d: 17, m: 3, y: 2026, day: 'Tuesday', label: '17.03.2026' }
