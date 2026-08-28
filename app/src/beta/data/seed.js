// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  THE WALL, SEEDED                                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Forty live letters. Ten came with the brief and are set here verbatim; the
// thirty after them were written to the same rules, and the rules are the
// product rather than a style guide:
//
//   · Berkeley-specific. A place and a rhythm someone who was there would
//     recognise, because a wall of generic longing is a wall of nobody.
//   · Warm valence only — longing, admiration, regret, apology. No jokes at
//     anyone's expense. A technically compliant but lukewarm letter about a
//     real person is still a bad day for that person.
//   · Never a physical description paired with a location or a schedule. That
//     combination is the stalking shape, it passes every generic filter, and
//     it is the single thing this wall cannot ever be seen to publish.
//   · Invented handles only. Not one of these is a name; they are all built
//     from parts that do not resolve to a person.
//   · 25–45 words, and about a third carry no seal, so the seal reads as a
//     thing somebody chose rather than a field the form demanded.
//
// The handles are also the ONLY way into these letters: the wall is not
// browsable, there is no index, and the public view is queried by handle. A
// person finds their own letter or they find nothing.

export const SEED = [
  { h: 'sofiaaa.reyes', b: "You sat on the left side of Doe every Thursday and I moved two tables closer each week. You never noticed. I never said anything. I hope finals were kind to you.", s: 'You always folded the corner of page one.' },
  { h: 'danny.k.k', b: "You gave me your umbrella outside Wheeler and walked home in it. I still have it. It's been two years and I still have it.", s: 'Green handle, one broken spoke.' },
  { h: 'm.oyelaran', b: "Free Speech Movement Café, corner table, October. You were reading something with a cracked spine and laughing at it alone. I've thought about that more than I've thought about most conversations.", s: null },
  { h: 'june.hh', b: "We were both waiting for the 51B in the rain and you said the thing about how buses only come in pairs. I've told that joke maybe forty times since and never once credited you.", s: 'You were holding two coffees. Neither was yours.' },
  { h: 'theo.arroyo', b: "I said something unkind in front of people who didn't matter and you never brought it up. I've been carrying it since March. I'm sorry. That's the whole letter.", s: null },
  { h: 'wren.p', b: "Fourth floor Moffitt, 3 a.m., dead week. You lent me a pen without looking up. I finished the exam with it. I never gave it back and I never introduced myself.", s: 'It was out of ink by page three.' },
  { h: 'abbygail.s', b: "You sang the whole way down Telegraph and did not care who heard. I was three steps behind you and I have never once in my life been that unembarrassed.", s: null },
  { h: 'nnamdi.o', b: "We had one conversation on the steps and then four years of nodding. I think about the version where I said something on the second day.", s: "You said you'd rather be early than right." },
  { h: 'lucia.mendes.b', b: "You saved me a seat for a month without ever mentioning it. I noticed every single time.", s: 'Third row, aisle, always.' },
  { h: 'ezra.k.lin', b: "I keep the receipt from Cheese Board. Not because of the pizza.", s: 'You paid and pretended it was your turn.' },

  { h: 'priya.n.raghav', b: "You held the door at Dwinelle for a full minute because there was a line of us behind you, and you did it like it cost you nothing at all. I have tried to be that patient ever since.", s: 'You were carrying too many books to be doing that.' },
  { h: 'cal.westergren', b: "Every morning on the 51B you gave up your seat before anyone had to ask for it. I watched you do that for two semesters and I never once said thank you.", s: null },
  { h: 'hana.tsuji.b', b: "Memorial Glade in April. You were asleep in the sun with a book over your face and I walked the long way around so I would not wake you. I still take the long way.", s: 'The book was upside down.' },
  { h: 'omar.dabbagh', b: "You explained the whole problem set to a stranger in the Soda lobby at midnight and then left before he could get your name. I was the stranger's roommate. He passed.", s: 'You drew the diagram on a napkin.' },
  { h: 'linnea.q', b: "I saw you crying on the Campanile steps and I kept walking because I thought that was the polite thing to do. I have decided since that it was not. I hope somebody sat down.", s: null },
  { h: 'teddy.marchetti', b: "Caffe Strada, the outside table under the heater, winter. You were arguing about a poem with somebody who was not listening to you. I was listening.", s: 'You lost the argument and you were right.' },
  { h: 'yaz.almeida.k', b: "You gave me the last cinnamon roll at the Golden Bear and said you had already had two. You had not. I watched you order coffee and nothing else.", s: 'Black, no sugar, every single time.' },
  { h: 'simone.oduya', b: "We were lab partners for eleven weeks and I learned your handwriting before I learned anything about you. I would know it now, years on, on the back of an envelope.", s: 'You crossed your sevens.' },
  { h: 'rafa.villanueva.j', b: "You waited with me at the Unit 3 desk until my key card worked, at two in the morning, in the cold, for somebody you had never met. It took forty minutes.", s: 'You said you were not tired and then yawned nine times.' },
  { h: 'bex.hollowell', b: "I was the one who laughed too loud in Wheeler during the quiet part, and you were the only person in that room who laughed with me instead of turning around.", s: null },
  { h: 'ivo.stanek', b: "You left a note in the margin of a library book in Doe about how the author was wrong, and wrong beautifully. I checked that same book out four times looking for more of you.", s: 'Third floor, the shelf by the window.' },
  { h: 'noor.a.esfahani', b: "Down in the eucalyptus grove by the creek, you were on the phone to your mother in a language I do not speak, and I understood the entire conversation anyway.", s: null },
  { h: 'gus.pemberton', b: "You covered my shift at Crossroads the night my father was in the hospital and you never brought it up again. Not once. Not even when I tried to thank you for it.", s: 'You told the manager you owed me. You did not.' },
  { h: 'adaeze.n.mbeki', b: "First day of dead week, Moffitt fourth floor, you handed out granola bars to a whole floor of strangers and left. Nobody asked you to do that. I still think about why you did.", s: 'There were exactly enough.' },
  { h: 'wyatt.solomon.c', b: "We shared an umbrella from Sproul to Bancroft and had the best conversation of my four years there and then never spoke again. I do not know how that happens. It happened.", s: null },
  { h: 'clem.arriaga', b: "You sang along to something in your headphones in the RSF stairwell, badly and completely, and I have thought about your total lack of self-consciousness more than I have thought about most books.", s: 'It was in Portuguese.' },
  { h: 'dez.whitfield.b', b: "I said I would come to your show at the Greek and I did not, because I was tired, which is the worst reason there is. I heard it was good. I am sorry I was not there.", s: null },
  { h: 'maren.lindqvist', b: "You always said good morning to the woman who cleaned our floor in Unit 3, and you always used her name. I did not know her name for two years. I know it now.", s: 'It was Rosa.' },
  { h: 'kofi.asante.b', b: "Free Speech Movement Café. You gave up the seat by the outlet for somebody whose laptop was at four percent, and moved to the floor, and stayed on the floor for three hours.", s: 'You said the floor was better for your back.' },
  { h: 'tallulah.ibarra', b: "You told me my essay was bad and exactly why it was bad, kindly, at eleven at night, and it was the single most useful thing anybody did for me at that school.", s: 'You used a green pen. Everyone else used red.' },
  { h: 'sana.k.mirza', b: "The 51B broke down at Ashby and you organised twenty strangers into a walking group so that nobody had to go the rest of the way alone in the dark. You were the last one to peel off.", s: null },
  { h: 'bram.vandersteen', b: "Cheese Board line, a Tuesday, and you let the person behind you go first because they were obviously in a hurry. Then you did it again for the next one.", s: 'You waited through four people. I counted.' },
  { h: 'isadora.chen.w', b: "I have never told anybody this. I chose my major because of something you said on the steps of Wheeler about work being a way of paying attention. You were talking to someone else.", s: null },
  { h: 'ronan.mcgrath.b', b: "You lent me your notes for a class you were also failing. That is the part I keep coming back to. You had nothing to give and you gave it to me anyway.", s: 'We both retook it. You got the A.' },
  { h: 'pilar.echevarria', b: "Telegraph, the man outside the bookshop who asks everybody for change. You are the only person I ever saw stop and ask him how he was and then stand there and wait for the answer.", s: null },
  { h: 'nate.oyelowo.k', b: "I was new and homesick and eating alone at Clark Kerr and you sat down across from me without asking and talked about nothing for an hour. I made it through that year.", s: 'You had two desserts and no dinner.' },
  { h: 'juno.baptiste', b: "You held the elevator in Evans for me and I said do not worry about it and you said it is already held. I have used that line for years. It is yours.", s: null },
  { h: 'sol.ferreira.a', b: "Up at the Big C at sunrise in October, you offered half your thermos to a person you had met nine minutes earlier. It was terrible tea. I have never forgotten it.", s: 'Too much sugar. On purpose, you said.' },
  { h: 'edith.kwarteng', b: "You noticed I had stopped coming to the study group before anybody else did, and you texted me, and that text is the reason I came back. I never told you that it was.", s: null },
  { h: 'linus.hartvig.p', b: "La Val's, after the last final, you paid for a table of people who were mostly strangers to you and slipped out before the check came back. I saw you do it. Nobody else did.", s: 'You left cash under the salt.' },
]

// Where a scan can come from. Shipped as a list so the flyer, the card, the
// chalk and the booth are all measurable against each other for zero cost —
// which quote and which location actually works is a question you only get to
// answer if you asked it before printing.
export const SOURCES = ['flyer-a', 'flyer-b', 'flyer-c', 'card', 'chalk', 'booth', 'direct']

export function normSource(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24)
  return SOURCES.includes(s) ? s : 'direct'
}
