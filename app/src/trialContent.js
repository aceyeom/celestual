// trialContent.js — the Celestual Challenge, distilled for the /trial page.
//
// SOURCE OF TRUTH: the official competition doc, served as-is from
// /celestual-challenge.docx and /celestual-challenge.pdf (app/public) and
// readable in place through the viewer sheet on the page.
//
// THE PAGE IS A DOOR, NOT A REPRINT. Everything a competitor needs to DECIDE
// lives on screen: what it is, what they make, what they win, what they do
// next, and the field that hands them their link. Everything they need to
// EXECUTE — hooks, shot notes, the weighted score, the hard rules, the eight
// clauses of the agreement — lives in the doc, one tap away, and is not
// duplicated here. A page that reprints the doc makes people read twice and
// decide once; this one asks for one decision and gets out of the way.
//
// Like demoData.js, this file sits outside the voice-linted copy (strings.js
// carries the page's chrome; this quotes the doc's own language, which is
// sentence-case and speaks as the company).

export const TRIAL_DOC = {
  // read in place, inside the page (the viewer sheet loads this in an iframe)
  html: '/celestual-challenge.html',
  // the same document, printable and signable
  pdf: '/celestual-challenge.pdf',
  docx: '/celestual-challenge.docx',
}

// The one instant everything on this page counts down to: the close of
// applications, end of day August 10 (US Pacific, the company's clock). Written
// as an absolute instant WITH its offset so the countdown reads the same second
// in every timezone — a competitor in London and one in LA see one deadline,
// not two. When the date moves, move it here: the landing banner, the page's
// countdown and the deadline line all read this.
export const TRIAL_DEADLINE = '2026-08-10T23:59:59-07:00'

// The landing's banner — the one door to this page from the front of the
// product. Deliberately the doc's voice, not the product's: it is a job ad
// resting on a poster, and it is allowed to sound like one.
export const TRIAL_BANNER = 'Head of Marketing Applications!'

export const TRIAL = {
  kicker: 'the celestual challenge',
  title1: 'market celestual for one week.',
  title2: 'the best one gets hired.',
  intro:
    'We’re hiring a head of marketing. Instead of an interview, you spend one week marketing Celestual however you want, and we post all of it.',

  // The page's main visual: the two things you make, and the thing you win.
  // Three cards, one line each. The how lives in the doc.
  makes: [
    {
      n: '01',
      kind: 'video',
      title: 'the intro',
      line: 'Who you are and what you’re about to do. 20 to 60 seconds.',
    },
    {
      n: '02',
      kind: 'video',
      title: 'the result',
      line: 'What you actually did. Goes up on the Celestual account.',
    },
    {
      n: '1%',
      kind: 'prize',
      title: 'equity',
      line: 'Head of marketing. Vesting over two years, one year cliff.',
    },
  ],

  steps: [
    { head: 'enter', body: 'Sign the doc and claim your four letters.' },
    { head: 'share your link', body: 'celestual.us/jack. Every open is counted for you.' },
    { head: 'make the two videos', body: 'One week. However you want.' },
    { head: 'send them in', body: 'contact@celestual.app, before the deadline.' },
  ],

  deadline: 'applications close august 10',

  doc: {
    title: 'the official doc',
    sub: 'The hooks, the scoring, the rules, and the agreement you sign.',
  },

  everyone:
    'Everyone who finishes becomes a paid Celestual ambassador, with a signed letter to prove it. You keep everything you shoot.',

  contact: 'Questions any time: @celestual.us on Instagram, or contact@celestual.app.',
}
