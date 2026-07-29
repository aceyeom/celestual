// trialContent.js — the First Light brief, distilled for the /trial page.
//
// SOURCE OF TRUTH: the official competition doc, served as-is from
// /first-light.docx and /first-light.pdf (app/public). The PAGE is deliberately
// visual and short — a poster, not a reprint: stat tiles, the five steps, the
// two videos, the weighted score bars, the rules, the prize. Every detail cut
// from the screen still lives in the doc, which is why the doc card sits at
// the top. If the doc changes, change BOTH.
//
// Like demoData.js, this file sits outside the voice-linted copy (strings.js
// carries the page's chrome; this quotes the doc's own language).

export const TRIAL_DOC = {
  docx: '/first-light.docx',
  pdf: '/first-light.pdf',
}

export const TRIAL = {
  kicker: 'first light',
  title1: 'market celestual for one week.',
  title2: 'the best one gets hired.',
  intro: 'We post everything as a series. The winner becomes our head of marketing.',

  // the three numbers that ARE the pitch
  stats: [
    { v: '1', l: 'week' },
    { v: '2', l: 'videos' },
    { v: '1%', l: 'equity' },
  ],

  doc: {
    title: 'the official brief',
    sub: 'Hooks, shot lists, scoring detail, the full agreement. Read it once before you film anything.',
  },

  steps: [
    { head: 'register below.', body: 'Verify your email, sign, pick your four letters.' },
    { head: 'share your link.', body: 'celestual.us/yours. Every open and signup is counted for you.' },
    { head: 'make two videos.', body: 'An intro and a result. The doc lays out both.' },
    { head: 'email them in.', body: 'Both to contact@celestual.app.' },
    { head: 'we post and score.', body: 'Everything goes on our page. The best one wins.' },
  ],

  deadline: '3 days to enter once our video posts · then 7 days to send both videos',

  videos: [
    {
      title: 'video 1 · the intro',
      sub: 'Your pitch, straight to camera. 25 to 60 seconds, vertical.',
      pts: ['Open on a hook.', 'Your plan, one sentence.', 'Explain celestual so a stranger gets it.'],
    },
    {
      title: 'video 2 · the result',
      sub: 'What you actually did. 30 seconds or more.',
      pts: ['The real thing you made, or the story of what happened.', 'It has to land the mechanic.', 'Real numbers if you have them.'],
    },
  ],

  scoring: [
    { cat: 'engagement', weight: 60, what: 'share + save rate · link clicks · views' },
    { cat: 'fit', weight: 20, what: 'sounds like us · explains it right' },
    { cat: 'signups', weight: 10, what: 'through your link and code' },
    { cat: 'quality', weight: 10, what: 'hook · shot well · holds to the end' },
  ],
  scoringNote: 'Scored against the best in the group. Rates, not totals — a small following can win.',
  zeroRule: 'Miss the mechanic — their @ goes in, they’re never told, only mutual reveals — and engagement scores zero.',

  hardRules: [
    'Nothing aimed at under-18s or high schools.',
    'Don’t rebrand or restyle celestual.',
    'Don’t inflate results. Our tracker is the score.',
    'No paid promotion or bought engagement.',
    'Never enter anyone’s @ without their knowledge.',
  ],
  hardNote: 'Breaking one drops you immediately.',

  win: {
    headline: 'head of marketing. 1% equity.',
    sub: 'Two-year vest, one-year cliff. Pay discussed with the winner.',
    everyone: 'Every finisher becomes an official celestual ambassador, in writing.',
  },

  mechanic: 'their @ goes in. they’re never told. if they enter you too, you both find out at the same second.',

  agreementNote: 'The Content, IP & Rights Agreement is in the doc above.',
}
