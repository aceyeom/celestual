// ── what a reply may not say, at the keyboard ──────────────────────────────
//
// The browser's half of the replies' first layer (migration 0068,
// supabase/functions/celestual-wall-reply). A courtesy to the writer and not
// a control on them: the same lists run again in the edge function and in
// the database (`wall_reply_caught`), where nothing can edit them out. What
// this half is FOR is the sentence: a writer is told, under the field while
// they type, exactly what was caught, one thing at a time, so they are one
// edit away from a reply that goes up rather than refused after they send it.
//
// Two things are caught here:
//
//   the list        a letter's (moderate.js `fault`): slurs, links, emails,
//                   phone numbers, street addresses, rooms
//   nobody else     a reply is about the letter and the person it is to, and
//                   it never names or tags anybody else. An @ anywhere, a
//                   word shaped like a handle (`jane.doe`, `j_doe`), and a
//                   full name: two capitalised words side by side that are
//                   neither of them a word a sentence starts with or a place
//                   (`Maria Delgado`, not `Happy Birthday` or `Doe Library`),
//                   or a first name followed by a surname in any case
//                   (`sarah kim`). A first name alone is fine, and so is the
//                   first name of the person the letter is to
//
// The three lists are the edge function's and the migration's, word for
// word. A first name that is also a word (will, grace, may) and a surname
// that is (white, young, park) are left off on purpose, so the rule catches
// "sarah kim" and not "sam do it".

import { fault } from './moderate.js'

const FIRST = new Set(('aaron abby abigail adam adrian ahmed aidan aiden aisha alan alex alexa alexander alexis ali alice alicia alina alison alyssa amanda amelia amir amy ana andre andrea andrew andy angela anika anna annie anthony antonio arjun ari ariana ariel ashley austin ava aya ayesha bella ben benjamin beth bianca blake brandon brendan brian brianna brittany brooke bryan caleb cameron camila carlos carmen caroline carter catherine charlotte chelsea chloe chris christian christina christopher claire clara colin connor dani daniel daniela danielle darius david derek devin diana diego dominic dylan eduardo eli elena eliana elias elijah elizabeth ella ellie emily emma eric erica erik ethan evan evelyn farah fatima felix fernando gabby gabriel gabriela gabriella george gianna greg hailey hana hannah harry hassan hector henry hugo ian isaac isabel isabella isabelle ivan jacob jake james jamie jane jared jasmine jason javier jayden jen jenna jennifer jenny jeremy jesse jessica jin joel joey john jonah jonathan jordan jorge jose joseph josh joshua juan jules julia julian juliana julie justin kai karen karina kate katherine katie kayla kaylee keith kelly kenji kevin kim kimberly kyle laila laura lauren layla leah leila leo leon liam linda lisa logan lorenzo lucas lucia lucy luis luke lydia madeline madison marco marcus maria mariah mariana marissa martin mason matt matthew maya megan melissa mia michael michelle miguel mike mila mina mohamed mohammed muhammad nadia naomi natalia natalie nathan nicholas nick nicole nikhil nina noah noor nora nour olivia omar oscar owen pablo paige paul pilar priya rachel rafael rahul raj rebecca ren riley rohan ryan sabrina sam samantha samir samuel sara sarah sean sebastian serena shreya simon sofia sophia sophie stephanie steven tara taylor thom thomas tiffany timothy tony tyler valentina valeria vanessa victor victoria vivian wei william xavier yasmin yuki yusuf zach zachary zara zoe').split(' '))
const SURNAMES = new Set(('smith johnson williams brown jones garcia miller davis rodriguez martinez hernandez lopez gonzalez wilson anderson thomas taylor moore jackson martin lee perez thompson harris sanchez clark ramirez lewis robinson walker allen wright scott torres nguyen flores adams nelson baker rivera campbell mitchell carter roberts gomez phillips evans turner diaz parker cruz edwards collins reyes stewart morris morales murphy rogers gutierrez ortiz morgan cooper peterson bailey kelly howard ramos kim cox richardson watson chavez james bennett mendoza ruiz hughes alvarez castillo sanders patel myers ross foster jimenez chen wang li zhang liu yang huang zhao wu zhou xu lin guo luo tran pham huynh dang bui ngo duong choi jung kang cho yoon jang lim han seo shin kwon hwang ahn yoo singh kumar shah sharma gupta khan hussain cohen levy friedman schwartz silva santos oliveira costa rossi russo muller schmidt fischer weber meyer wagner becker tanaka suzuki sato takahashi watanabe ito yamamoto nakamura kobayashi kato echevarria okonkwo kwarteng haddad brandt iversen villarreal arroyo yeom').split(' '))
const STOP = new Set(('i im ive id ill the a an and but or so if then than this that these those there here it its you your youre yours we our us he she they them him her his hers my me mine is are was were be been am do did does dont not no yes yeah yep nope ok okay oh ah hi hey hello bye lol lmao omg wow ya yo what who why how when where which just also too very really love loved like liked happy merry thank thanks good great best dear god jesus christ lord mr mrs ms dr prof professor uc cal berkeley stanford oakland san francisco bay area california doe moffitt sproul sather wheeler dwinelle haas soda evans cory memorial glade gate hall library stadium plaza street st avenue ave road rd park campus college university school class dorm unit north south east west new york los angeles monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december christmas halloween valentine valentines easter thanksgiving birthday instagram insta google tiktok snapchat snap twitter facebook spotify netflix iphone apple english spanish french chinese korean japanese american asian african european mexican indian math physics chemistry biology econ history science go bears golden bear big game never always every everyone everybody someone somebody nobody all some one two please sorry same honestly literally anyway maybe well still nah idk tbh ngl fr pls plz congrats congratulations welcome sincerely xoxo miss missed hope hoping praying rip bless').split(' '))

const TITLE = /^[A-Z][a-z]+$/
const HANDLE = /^[a-z0-9]{2,}([._][a-z0-9]{2,})+$/i

// Somebody else, named or tagged: { id: 'tag' | 'name', hit } or null. `hit`
// is the words as the writer typed them, so the line under the field can
// quote them back.
//
// A tag is quoted whole, `@` and handle together. It used to be the `@` on
// its own ("take the @ out"), and a writer who did exactly that was left
// with `jules.kim`, which is a handle, and caught a second time. A bare `@`
// with nothing after it is still just the `@`.
export function third(text) {
  const t = String(text || '')
  if (t.includes('@')) {
    const m = t.match(/@[^\s]*/)
    const hit = m ? m[0].replace(/[^A-Za-z0-9_.@]+$/, '').replace(/\.+$/, '') : '@'
    return { id: 'tag', hit: hit || '@' }
  }
  const words = t.trim().split(/\s+/).filter(Boolean)
  for (const raw of words) {
    const w = raw.replace(/^[^A-Za-z0-9_.]+|[^A-Za-z0-9_.]+$/g, '').replace(/\.+$/, '')
    if (HANDLE.test(w) && /[a-z]/i.test(w)) return { id: 'tag', hit: w }
  }
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i]
    const b = words[i + 1]
    // a comma or a full stop between two words is two thoughts, not a name
    if (/[^A-Za-z'’]$/.test(a) || !/^[A-Za-z]/.test(b)) continue
    const aw = a.replace(/^[^A-Za-z]+/, '').replace(/['’]s$/, '')
    const bw = b.replace(/[^A-Za-z'’]+$/, '').replace(/['’]s$/, '')
    if (!aw || !bw) continue
    const al = aw.toLowerCase()
    const bl = bw.toLowerCase()
    const pair = TITLE.test(aw) && TITLE.test(bw) && !STOP.has(al) && !STOP.has(bl)
    const first = FIRST.has(al) && (SURNAMES.has(bl) || (TITLE.test(bw) && !STOP.has(bl)))
    if (pair || first) return { id: 'name', hit: `${aw} ${bw}` }
  }
  return null
}

// The first thing wrong with a reply, said in words, or ''. The list first,
// since a link or a phone number is the graver thing, then nobody else.
export function replyFault(text) {
  const f = fault(text)
  if (f) return f.endsWith('.') ? f : `${f}.`
  const o = third(text)
  if (!o) return ''
  if (o.id === 'tag') {
    return o.hit === '@'
      ? 'take the @ out. a reply can’t tag anybody.'
      : `take “${o.hit}” out. a reply can’t tag anybody.`
  }
  return `take “${o.hit}” out. a reply can’t carry anybody’s full name.`
}

// What a refusal from the reading says, one reason at a time, in the terms'
// own words. The reading's categories (celestual-wall-reply) and the list's.
const WHY = {
  threat: 'it reads as a threat.',
  locate: 'it says where somebody can be found.',
  sexual: 'it is sexual about a person.',
  minor: 'it is about somebody under 18.',
  expose: 'it shares something private about a person.',
  hate: 'it is hateful about a group.',
  contact: 'it carries contact details.',
  third: 'it names somebody else.',
  pile: 'it only goes after the person this is to.',
  slur: 'it carries a slur.',
  url: 'links do not go under a letter.',
  email: 'it carries an email address.',
  phone: 'it carries a phone number.',
  address: 'it carries a street address.',
  room: 'it carries a room number.',
  tag: 'it tags somebody.',
  name: 'it carries somebody’s full name.',
}
export function whyRefused(reasons) {
  const list = Array.isArray(reasons) ? reasons : []
  for (const r of list) if (WHY[r]) return WHY[r]
  return 'it goes against the terms for replying.'
}
