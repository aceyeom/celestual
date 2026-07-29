// trialContent.js — the Celestual Challenge, distilled for the /trial page.
//
// SOURCE OF TRUTH: the official competition doc, served as-is from
// /celestual-challenge.docx and /celestual-challenge.pdf (app/public) and
// readable in place through the viewer sheet on the page. The PAGE is
// deliberately a poster, not a reprint: the numbers, the five steps, the two
// videos, the weighted score, the rules, the prize. Every detail cut from the
// screen still lives in the doc, which is why the doc card sits near the top
// and opens without leaving the page. If the doc changes, change BOTH.
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

export const TRIAL = {
  kicker: 'the celestual challenge',
  title1: 'market celestual for one week.',
  title2: 'the best one gets hired.',
  intro:
    'We’re hiring a head of marketing. Instead of an interview, we want to see if you’re willing to try. Everyone who enters spends one week marketing Celestual however they want, and we post all of it.',

  // the three numbers that ARE the pitch
  stats: [
    { v: '1', l: 'week' },
    { v: '2', l: 'videos' },
    { v: '1%', l: 'equity' },
  ],

  doc: {
    title: 'the official doc',
    sub: 'Hooks, shot notes, the full scoring, the hard rules, and the agreement you sign. Read it once before you film anything.',
  },

  steps: [
    { head: 'apply.', body: 'Read the doc, then register below and sign it.' },
    { head: 'get your link.', body: 'Four letters, yours: celestual.us/jack. Every open and signup through it is counted for you.' },
    { head: 'make two videos.', body: 'An intro and a result. Both are laid out below and in the doc.' },
    { head: 'send them in.', body: 'Email both videos and your signed doc to contact@celestual.app.' },
    { head: 'we post and score.', body: 'Your videos go on our page. We score everyone and hire the winner.' },
  ],

  deadline: 'applications are open until august 10 · send both videos to contact@celestual.app',

  videos: [
    {
      title: 'video 1 · the intro',
      sub: 'Your pitch. Who you are, what you’re going to do, and why it’ll work. 20 to 60 seconds, vertical, lit well.',
      pts: [
        'Open on a hook, said with a straight face, like you mean it.',
        'Say plainly that you’re in Celestual’s competition to become their head of marketing.',
        'Your plan for the week — brief, but detailed.',
        'Explain Celestual to someone who’s never heard of it. Not the steps: what it saves you from.',
        'Close on “follow Celestual to see how I do.”',
      ],
    },
    {
      title: 'video 2 · the result',
      sub: 'What you actually did. 30 seconds or more, no cap. This one is posted on the Celestual account.',
      pts: [
        'If your campaign was content, submit the real thing you made and posted.',
        'If it happened in the real world, tell the story: the setup, people showing up, the moment it worked.',
        'It has to land the mechanic, or a viewer finishes with nothing.',
        'End on what you accomplished, in one line, with real numbers if you have them.',
      ],
    },
  ],

  // straight from the doc's table
  scoring: [
    { cat: 'engagement', weight: 40, what: 'share and save rate · link clicks · views' },
    { cat: 'quality', weight: 30, what: 'strong hook · shot and cut well · holds to the end' },
    { cat: 'fit', weight: 20, what: 'sounds like us · explains the product right · good first impression' },
    { cat: 'signups', weight: 10, what: 'through your link and code · matches that fired' },
  ],
  scoringNote: 'Signups are only a small part of the score. If your campaign has nowhere natural to put a link, don’t force one.',
  zeroRule: 'The video has to get the mechanic across. One that goes viral and teaches nobody what we do isn’t worth much.',

  hardRules: [
    'No advertising or targeting anyone under 18, and nothing filmed at or aimed at a high school audience.',
    'No paid promotion, boosting, or bought views, followers, or engagement.',
    'Don’t claim to speak for the company.',
    'If the video or the idea is too shabby, it probably won’t be posted on our account. Try your best.',
  ],
  hardNote: 'Breaking any one of these is a hard drop.',

  win: {
    headline: 'head of marketing. 1% equity.',
    sub: 'Vesting over two years with a one-year cliff. Monthly pay is discussed directly with the winner.',
    everyone:
      'Everyone who finishes becomes an official Celestual ambassador with monthly pay, and gets a signed letter confirming it. That’s a real job. You keep everything you shoot.',
  },

  mechanic:
    'you put someone’s handle in. they’re never told. if they put you in too, you both find out at the same second.',

  // the doc's "the part you should understand" — the strategic note that makes
  // a competitor make better calls all week, so it belongs on the page.
  understand: {
    title: 'the part you should understand',
    body:
      'Celestual only works when the people around a person are on it too. One user alone enters a handle and nothing fires, because the other side isn’t there yet. That’s why, right now, reach matters more to us than signups. A person who joins an empty app leaves and doesn’t come back. A follower costs us nothing and stays. So we’re paying you to make people watch, share, and remember us — not just to fill the app.',
  },

  contact: 'Questions any time: @celestual.us on Instagram, or contact@celestual.app.',

  agreementNote:
    'Registering below records your signature on the Content, IP & Rights Agreement in the doc — eligibility, who owns the content, the licence you grant us, and the eight clauses in full.',
}
