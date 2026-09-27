// CELESTUAL: the words of every mail the product sends, on _shared/mail.ts's
// room. One function a mail, each answering { subject, html, text }, so the
// edge functions that send them and scripts/mail-preview.mjs that shoots
// them render the same thing.
//
// Every sentence is literally true (design/VOICE.md): a mail says what
// happened and what a tap does, and nothing it cannot know. No mail ever
// carries a word somebody wrote to somebody else, or anything that points at
// who wrote it: a mail is forwarded, screenshotted and left open on a desk.
import { body, C, colophon, code, esc, footLink, frame, plate, quiet, SITE, tick, title } from './mail.ts'

export type Mail = { subject: string; html: string; text: string }

// ── verify: the magic link ───────────────────────────────────────────────────
// celestual-edu-verify `link`. It carries the link and never the number. The
// number is on the screen that asked and only there (migration 0065 section
// 3): tapped on that same device the link confirms at once, and tapped on any
// other the page it opens asks for the number on the asking screen. A person
// sent a link they never asked for has no such screen, so their tap signs
// nobody in. The mail used to print the number ("your screen shows 47. if it
// doesn't, don't tap it"), which kept the careful reader safe and left
// everybody else one tap from handing their account to whoever typed their
// address.
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
// wall): a school address is confirmed, not verified.
export function verifyMail(o: {
  link: string
  purpose: 'edu' | 'alerts' | 'login'
  domain?: string | null
  draft?: boolean
}): Mail {
  const edu = o.purpose === 'edu'
  const login = o.purpose === 'login'
  const draft = edu && o.draft !== false
  const head = login ? 'tap to sign in.' : edu ? 'tap to confirm your school email.' : 'tap to confirm this address.'
  const proves = login
    ? `tap the link and you're signed in on the screen that asked for it.` +
      (o.domain ? ` it also confirms you're at ${esc(o.domain)}.` : '')
    : edu
    ? (o.domain ? `this confirms you're at ${esc(o.domain)}.` : `this confirms the address is yours.`) +
      (draft ? ' your letter goes up once you tap.' : '')
    : `your alerts come here: when someone writes you a letter, and when it's mutual. you choose which.`
  const key = login ? 'sign in' : edu ? (draft ? 'confirm and post' : 'confirm') : 'confirm this address'
  const subject = login ? 'tap to sign in to celestual' : edu ? 'tap to confirm your school email' : 'tap to confirm this address'
  // where the number is, and never what it is
  const elsewhere = 'on another phone or computer, it asks for the number on the screen where you asked.'
  const why = login
    ? `you're getting this because this address was typed into celestual to sign in. `
    : `you're getting this because this address was typed into celestual. `

  const html = frame({
    preheader: `${head} the link works once, for 30 minutes.`,
    inner: `
      ${title(head)}
      ${body(proves)}
      ${plate(esc(o.link), key)}
      ${body(elsewhere, C.chalk)}
      ${tick('the link works once, for 30 minutes. nobody sees your address.')}`,
    foot: colophon(
      why + `if you didn't ask for it, ignore it and nothing happens. ${footLink(SITE, 'celestual.us')}`,
    ),
  })
  const text = [
    head,
    '',
    proves,
    '',
    `${key}: ${o.link}`,
    '',
    elsewhere,
    'the link works once, for 30 minutes. nobody sees your address.',
    '',
    `${why}if you didn't ask for it, ignore it and nothing happens.`,
  ].join('\n')
  return { subject, html, text }
}

// ── mutual ───────────────────────────────────────────────────────────────────
// celestual-notify, kind 'mutual'. THAT a note waits, never a word of it: the
// words are read once, in the product, by the person they were written to.
export function mutualMail(o: { other: string; hasCard: boolean; openUrl: string; stopUrl: string }): Mail {
  const other = esc(o.other)
  const lead = `you and @${other} both sent one.`
  const note = o.hasCard ? 'open it to read their note.' : ''
  const html = frame({
    preheader: `${lead} ${note}`.trim(),
    inner: `
      ${title(`it's mutual.`)}
      ${body(`you and <span style="color:${C.chalk}">@${other}</span> both sent one.${note ? ' ' + note : ''}`)}
      ${plate(esc(o.openUrl), 'open celestual')}`,
    foot: colophon(
      `you're getting this because you sent one on celestual and it's mutual. ` +
      `one sided ones are never told to anybody. ${footLink(esc(o.stopUrl), 'stop these emails')}`,
    ),
  })
  const text = [
    `it's mutual.`,
    '',
    `${lead} ${note}`.trim(),
    '',
    `open celestual: ${o.openUrl}`,
    '',
    `you're getting this because you sent one on celestual and it's mutual. one sided ones are never told to anybody.`,
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
  const html = frame({
    preheader: `a letter to @${handle} is on the wall. read it, or take it down with one tap.`,
    inner: `
      ${title('someone wrote you a letter.')}
      ${body(`it's on the wall, written to <span style="color:${C.chalk}">@${handle}</span>.`)}
      ${plate(esc(o.readUrl), 'read it')}
      <p style="font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:15px;line-height:1.6;margin:22px 0 0;color:${C.ash}">${quiet(esc(o.removeUrl), 'remove it')}</p>
      ${tick('one tap takes it down, and you can put it back for a day. nobody is told you opened this.')}`,
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
    preheader: `${o.code} is your celestual code. it lasts ${o.minutes} minutes.`,
    inner: `
      ${title(`you're at ${esc(o.school)}.`)}
      ${body('type this back into celestual and the wall opens.')}
      ${code(esc(o.code))}
      ${tick(`press and hold it to copy. it lasts ${o.minutes} minutes.`)}`,
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
