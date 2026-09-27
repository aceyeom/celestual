// CELESTUAL: the words of every mail the product sends, on _shared/mail.ts's
// room. One function a mail, each answering { subject, html, text }, so the
// edge functions that send them and scripts/mail-preview.mjs that shoots
// them render the same thing.
//
// Every sentence is literally true (design/VOICE.md): a mail says what
// happened and what a tap does, and nothing it cannot know. No mail ever
// carries a word somebody wrote to somebody else, or anything that points at
// who wrote it: a mail is forwarded, screenshotted and left open on a desk.
//
// Each mail opens on the phone with one line typed on its glass (mail.ts
// `SCREENS`), which is the mail's headline and the alt text of its picture;
// the sentences under it say the rest, so a mail read with its pictures
// blocked still says all of it. The line on the glass is short enough to
// stand on one line of the phone, as "it's mutual." does on the mutual's.
import { C, code, colophon, em, esc, footLink, frame, key, SITE, tick, under, body } from './mail.ts'

export type Mail = { subject: string; html: string; text: string }

// ── verify: the magic link ───────────────────────────────────────────────────
// celestual-edu-verify `link`. It carries the link and nothing to type. Since
// migration 0070 the link confirms on whatever phone or computer opens it,
// for that one: that is where you're signed in, or confirmed at a school. A
// person sent a link they never asked for signs in their own browser, as
// themselves, and never the stranger's that typed their address, so the mail
// says where the tap lands and nothing else. It printed a number once (0064),
// and then said where one was to be typed (0065); neither is asked for now.
//
//   purpose 'edu'     proves a school address. `domain` is the school it
//                     proves (berkeley.edu); null for an address on the pass
//                     list, which proves only that the address is theirs.
//                     `draft` is whether a letter is waiting on this proof.
//   purpose 'alerts'  confirms where the alerts go.
//   purpose 'login'   signs somebody in (0065): the door's "continue with
//                     email". It replaced a code Supabase mailed in its own
//                     template, eight digits into a box that held six.
//                     `domain` is set for a .edu address, which opens its
//                     campus too.
//
// The words are the product's (design/VOICE.md, the shared words of the
// wall): a school address is confirmed, not verified. The school's link and
// the alert address's share a screen, "tap to confirm.", and say under it
// what they confirm.
export function verifyMail(o: {
  link: string
  purpose: 'edu' | 'alerts' | 'login'
  domain?: string | null
  draft?: boolean
}): Mail {
  const edu = o.purpose === 'edu'
  const login = o.purpose === 'login'
  const draft = edu && o.draft !== false
  const head = login ? 'tap to sign in.' : 'tap to confirm.'
  const proves = login
    ? `the link signs in whichever phone or computer you open it on.` +
      (o.domain ? ` it also confirms you're at ${esc(o.domain)}.` : '')
    : edu
    ? (o.domain ? `this confirms you're at ${esc(o.domain)}.` : `this confirms the address is yours.`) +
      (draft ? ' your letter is waiting on it.' : '') +
      ' it works on whichever phone or computer you open it on.'
    : `your alerts come here: when someone writes you a letter, and when it's mutual. you choose which.`
  const act = login ? 'signin' : draft ? 'post' : 'confirm'
  const word = login ? 'sign in' : draft ? 'confirm and post' : 'confirm'
  const subject = login ? 'tap to sign in to celestual' : edu ? 'tap to confirm your school email' : 'tap to confirm this address'
  const once = 'the link works once, for 30 minutes. nobody sees your address.'
  const why = login
    ? `you're getting this because this address was typed into celestual to sign in. `
    : `you're getting this because this address was typed into celestual. `
  const href = esc(o.link)

  const html = frame({
    screen: login ? 'signin' : 'confirm',
    href,
    preheader: `${login ? 'tap to sign in' : edu ? 'tap to confirm your school email' : 'tap to confirm this address'}. ${once}`,
    inner: under({ words: body(proves), act: key(href, act), note: tick(once) }),
    foot: colophon(why + `if you didn't ask for it, ignore it and nothing happens. ${footLink(SITE, 'celestual.us')}`),
  })
  const text = [
    head,
    '',
    proves,
    '',
    `${word}: ${o.link}`,
    '',
    once,
    '',
    `${why}if you didn't ask for it, ignore it and nothing happens.`,
  ].join('\n')
  return { subject, html, text }
}

// ── mutual ───────────────────────────────────────────────────────────────────
// celestual-notify, kind 'mutual'. THAT a note waits, never a word of it: the
// words are read once, in the product, by the person they were written to.
// It is written at the reveal (migration 0069), the saturday night everybody
// finds out together, and says so in the product's own words for it.
export function mutualMail(o: { other: string; hasCard: boolean; openUrl: string; stopUrl: string }): Mail {
  const other = esc(o.other)
  const lead = `saturday's reveal is in. you and @${other} both sent a private note.`
  const note = o.hasCard ? 'their note to you is waiting.' : ''
  const href = esc(o.openUrl)
  const html = frame({
    screen: 'mutual',
    href,
    preheader: `${lead} ${note}`.trim(),
    inner: under({
      words: body(`saturday's reveal is in. you and ${em(`@${other}`)} both sent a private note.${note ? ' ' + note : ''}`),
      act: key(href, 'open'),
    }),
    foot: colophon(
      `you're getting this because you sent a private note on celestual and it's mutual. ` +
      `a note that isn't mutual is never told to anybody. ${footLink(esc(o.stopUrl), 'stop these emails')}`,
    ),
  })
  const text = [
    `it's mutual.`,
    '',
    `${lead} ${note}`.trim(),
    '',
    `open celestual: ${o.openUrl}`,
    '',
    `you're getting this because you sent a private note on celestual and it's mutual. a note that isn't mutual is never told to anybody.`,
    `stop these emails: ${o.stopUrl}`,
  ].join('\n')
  return { subject: `it's mutual.`, html, text }
}

// ── wrote ────────────────────────────────────────────────────────────────────
// celestual-notify, kind 'wrote'. To the claimed owner of the @, who turned it
// on. It says a letter is up and where, and gives the two things they can do
// about it. Nothing about who wrote it, when beyond today, or what it says.
export function wroteMail(o: { handle: string; readUrl: string; removeUrl: string; stopUrl: string }): Mail {
  const handle = esc(o.handle)
  const readUrl = esc(o.readUrl)
  const html = frame({
    screen: 'letter',
    href: readUrl,
    preheader: `a letter to @${handle} is on the wall. read it, or remove it with one tap.`,
    inner: under({
      words: body(`it's on the wall, written to ${em(`@${handle}`)}.`),
      act: key(readUrl, 'read', { href: esc(o.removeUrl), name: 'remove' }),
      note: tick('one tap takes it down, and you can put it back for a day. nobody is told you opened this.'),
    }),
    foot: colophon(
      `you're getting this because you turned on alerts for @${handle} on celestual. ` +
      `at most three a day. ${footLink(esc(o.stopUrl), 'stop these emails')}`,
    ),
  })
  const text = [
    'someone wrote you a letter.',
    '',
    `it's on the wall, written to @${o.handle}.`,
    '',
    `read it: ${o.readUrl}`,
    `remove it (one tap, you can put it back for a day): ${o.removeUrl}`,
    '',
    `you're getting this because you turned on alerts for @${o.handle} on celestual. at most three a day.`,
    `stop these emails: ${o.stopUrl}`,
  ].join('\n')
  return { subject: 'someone wrote you a letter.', html, text }
}

// ── the code ─────────────────────────────────────────────────────────────────
// celestual-edu-verify `send`, for a tab still on the old build. The code is
// the subject too, so the notification alone is enough to type it back.
export function codeMail(o: { code: string; school: string; minutes: number }): Mail {
  const html = frame({
    screen: 'code',
    href: SITE,
    preheader: `${o.code} is your celestual code. it lasts ${o.minutes} minutes.`,
    inner: under({
      words: body(`you're at ${em(esc(o.school))}. type this back into celestual and the wall opens.`),
      act: code(esc(o.code)),
      note: tick(`press and hold it to copy. it lasts ${o.minutes} minutes.`),
    }),
    foot: colophon(
      `you're getting this because this address was typed into celestual. ` +
      `if that wasn't you, ignore it and nothing happens. ${footLink(SITE, 'celestual.us')}`,
    ),
  })
  const text = [
    `you're at ${o.school}.`,
    '',
    'type this back into celestual and the wall opens.',
    '',
    o.code,
    '',
    `it lasts ${o.minutes} minutes. if you didn't ask for it, ignore this email.`,
  ].join('\n')
  return { subject: `${o.code} is your celestual code`, html, text }
}

// ── the lapse note ───────────────────────────────────────────────────────────
// celestual-remind, a few days before the reveal a private note lapses at.
// The one mail in the product whose whole job is a decision, so it names
// both halves of it and prices them: keeping it for the week after is free
// and takes no other slot; letting go frees the slot on the same day. That
// second fact is the one the product used to keep to itself. `date` is the
// reveal's day in California, where the reveal is ("September 26"). It
// names no handle: the server keeps only a salted hash of who a note is to.
export function lapseMail(o: { date: string }): Mail {
  const date = esc(o.date)
  const lapses =
    `one of your private notes lapses at the reveal on ${date}, at 9pm california time, unless it's mutual. ` +
    `keeping it for next week is one tap and free, and it never uses another slot.`
  const going = 'or let it go, and it disappears completely. nothing was ever revealed either way, and the slot opens back up the same day.'
  const html = frame({
    screen: 'lapse',
    href: SITE,
    preheader: `your private note lapses at saturday's reveal unless it's mutual. keeping it for next week is one tap.`,
    inner: under({
      words: body(lapses) + body(going),
      act: key(SITE, 'keep'),
      note: tick(`the slot opens ${date}`, C.accent),
    }),
    foot: colophon(
      `this email is about your own private note only. we cannot and do not tell you anything about anyone else: ` +
      `celestual keeps who you sent it to as a salted hash, and even we cannot read it. ` +
      `opt out entirely at ${footLink(`${SITE}/optout`, 'celestual.us/optout')}.`,
    ),
  })
  const text = [
    'still feel it?',
    '',
    `one of your private notes lapses at the reveal on ${o.date}, at 9pm california time, unless it's mutual. keeping it for next week is one tap and free, and it never uses another slot.`,
    '',
    going,
    '',
    `keep it for next week: ${SITE}`,
    '',
    `this email is about your own private note only. celestual keeps who you sent it to as a salted hash, and even we cannot read it. opt out entirely at ${SITE}/optout.`,
  ].join('\n')
  return { subject: 'your private note lapses on saturday. still feel it?', html, text }
}
