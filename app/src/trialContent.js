// trialContent.js — the First Light brief, distilled for the /trial page.
//
// SOURCE OF TRUTH: the official competition doc ("First Light Comp.docx",
// served as-is from /first-light.docx and /first-light.pdf in app/public).
// This module is that doc's key parts restated for a screen: same facts, same
// numbers, same rules, shorter sentences. If the doc changes, change BOTH.
//
// Like demoData.js, this file is deliberately outside the voice-linted copy
// (strings.js carries the page's chrome; the brief quotes the doc's own
// language, dashes and all). One divergence is deliberate and requested: the
// doc's "comment under our video → DM" application step is replaced by
// registering on the trial page itself, which is where this content lives.

export const TRIAL_DOC = {
  docx: '/first-light.docx',
  pdf: '/first-light.pdf',
}

export const TRIAL = {
  kicker: 'first light',
  title1: 'market celestual for one week.',
  title2: 'the best one gets hired.',
  intro:
    'We’re hiring a head of marketing. Instead of interviewing you, we’re letting you prove it in public. Everyone who enters spends one week marketing Celestual however they want. We post all of it. The best one wins the job.',

  steps: [
    { head: 'register below', body: 'Verify your email, sign the agreement, and pick your four-letter code. Your personal tracking link is yours the moment you finish.' },
    { head: 'get your link', body: 'celestual.us/ plus your code. Every open and every signup through it is counted for you.' },
    { head: 'make two videos', body: 'An intro and a result. Both are laid out below.' },
    { head: 'send them in', body: 'Email both videos to contact@celestual.app.' },
    { head: 'we post and score', body: 'Your videos go on our page. We score everyone and hire the winner.' },
  ],

  deadline:
    'Applications are open for three days after our marketing video is posted. Once those three days close, you have seven days to send both videos to contact@celestual.app. Late entries aren’t scored.',

  video1: {
    title: 'video 1 · the intro',
    sub: 'Your pitch. Who you are, what you’re going to do, and why it’ll work. 25 to 60 seconds, filmed vertical.',
    beats: [
      'Open with your hook, straight to camera, no cut. Pick one from the doc or bring your own.',
      'Make it clear you’re in Celestual’s competition to become their head of marketing.',
      'Your plan, one sentence. What you’re going to do to market Celestual.',
      'Explain Celestual so a stranger gets it: put their @ in. They’re never told. If they put you in too, you both find out at the same second.',
      'One line on why your plan will hit.',
      'Close: “Follow Celestual to see how I do.”',
    ],
    shoot: [
      'Face a window for light. No ceiling lights.',
      'Phone at eye level, propped up, not handheld.',
      'Framed chest up, plain wall behind you.',
      'Somewhere quiet that doesn’t echo. Bad audio means a reshoot.',
    ],
    crosspost:
      'Post your intro to your own account as a collab with us if you can. Optional, but intro engagement is the tiebreaker when two candidates finish close.',
  },

  video2: {
    title: 'video 2 · the result',
    sub: 'What you actually did. Posted on the Celestual account. At least 30 seconds, no hard cap.',
    beats: [
      'If your campaign is content, your result video is that content. Submit the real thing you made and posted.',
      'If it happened in the real world, tell the story: the setup, people showing up, the moment it’s working, what you pulled off. End on one line, with real numbers if you have them.',
      'Either way it must market Celestual clearly and land the mechanic: put their @ in, they’re never told, you only both find out if they put you in too.',
    ],
  },

  scoring: {
    note:
      'Every category is scored against the best person in the group. Engagement is measured as rates, not totals, so a smaller following can still win.',
    rows: [
      { cat: 'engagement', weight: 60, what: 'Share and save rate 26 · link clicks 20 · views index 14. Mostly your result video; your intro is the tiebreaker.' },
      { cat: 'signups', weight: 10, what: 'Signups through your link and code · matches that fired.' },
      { cat: 'fit', weight: 20, what: 'Sounds like us · explains the product right · good first impression · followed the rules.' },
      { cat: 'quality', weight: 10, what: 'Strong hook · shot and cut well · holds to the end.' },
    ],
    zeroRule:
      'One rule above the others: if your video doesn’t clearly get the mechanic across, your engagement points don’t count at all. Zero, not a deduction.',
  },

  hardRules: {
    note: 'Breaking any one of these drops you from the competition immediately, no warning.',
    rows: [
      'No advertising or targeting anyone under 18, and nothing filmed at or aimed at a high school audience.',
      'Don’t rename, restyle, or present Celestual as a different brand than it is.',
      'Don’t falsify or inflate results. Our tracker is the only source that counts for scoring.',
      'No paid promotion, boosting, or bought views, followers, or engagement.',
      'Don’t enter anyone’s @ without their knowledge, and don’t claim to speak for the company.',
    ],
  },

  win: {
    title: 'what you win',
    rows: [
      'Win, and you become our Head of Marketing with 1% equity, vesting over two years with a one-year cliff. Monthly pay is discussed directly with the winner.',
      'Everyone who finishes becomes an official Celestual ambassador and gets a signed letter confirming it. You keep everything you shoot.',
    ],
  },

  reference:
    'You put someone’s handle in. They’re never told. If they put you in too, you both find out at the same second. If they never do, nobody ever knows. It’s not a dating app: the point is that somebody finally says the thing they were never going to say, without the risk of being the one who cared more.',

  understand:
    'Celestual only works when the people around a person are on it too. Right now reach matters more to us than signups: a follower costs us nothing and stays. Make people watch, share, and remember us.',

  agreement: {
    title: 'the agreement',
    version: 'first-light-v1',
    points: [
      'You’re 18 or older and keep ownership of what you create.',
      'Celestual gets a perpetual, royalty-free licence to post, edit, and promote your competition content on any platform.',
      'The result video is posted on Celestual’s account; don’t remove or untag collab posts before the winner is announced.',
      'You have permission from everyone appearing in your content and rights to any music or footage in it.',
      'You’ll follow the hard rules; breaking them means disqualification.',
      'Entering isn’t employment. Only the winner is offered the role, on the equity terms above.',
      'You consent to Celestual tracking signups through your link and code, for scoring.',
    ],
    foot: 'The full text lives in the doc above. Signing here records your name, your @, your email and the date against that version.',
  },
}
