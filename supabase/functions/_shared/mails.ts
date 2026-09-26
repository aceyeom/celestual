// CELESTUAL: the words of every mail the product sends, on _shared/mail.ts's
// room. One function a mail, each answering { subject, html, text }, so the
// edge functions that send them and scripts/mail-preview.mjs that shoots
// them render the same thing.
//
// Every sentence is literally true (design/VOICE.md): a mail says what
// happened and what a tap does, and nothing it cannot know. No mail ever
// carries a word somebody wrote to somebody else, or anything that points at
// who wrote it: a mail is forwarded, screenshotted and left open on a desk.
import { body, C, colophon, code, esc, footLink, frame, plate, quiet, SITE, tick, title, well } from './mail.ts'

export type Mail = { subject: string; html: string; text: string }

// ── verify: the magic link ───────────────────────────────────────────────────
// celestual-edu-verify `link`. The number is the one the asking screen shows,
// so a person can tell their own request from somebody else's before they tap.
//
//   purpose 'edu'     proves a school address. `domain` is the school it
//                     proves (berkeley.edu); null for an address on the pass
//                     list, which proves only that the address is theirs.
//                     `draft` is whether a letter is waiting on this proof.
//   purpose 'alerts'  confirms where the alerts go.
export function verifyMail(o: {
  link: string
  match: number
  purpose: 'edu' | 'alerts'
  domain?: string | null
  draft?: boolean
}): Mail {
  const n = String(o.match)
  const edu = o.purpose === 'edu'
  const draft = edu && o.draft !== false
  const head = edu ? 'tap to verify your school email.' : 'tap to confirm this address.'
  const proves = edu
    ? (o.domain ? `this proves you're at ${esc(o.domain)}.` : `this proves the address is yours.`) +
      (draft ? ' your letter goes up once you tap.' : '')
    : `your alerts come here: when someone writes you a letter, and when it's mutual. you choose which.`
  const key = edu ? (draft ? 'verify and post' : 'verify') : 'confirm this address'
  const subject = edu ? `tap to verify your school email · ${n}` : `tap to confirm this address · ${n}`

  const html = frame({
    preheader: `your screen shows ${n}. the link works once, for 30 minutes.`,
    inner: `
      ${title(head)}
      ${body(proves)}
      ${well('your screen shows', n, C.accent)}
      ${body("if it doesn't, ignore this email.", C.chalk)}
      ${plate(esc(o.link), key)}
      ${tick('the link works once, for 30 minutes. nobody sees your address.')}`,
    foot: colophon(
      `you're getting this because this address was typed into celestual. ` +
      `if that wasn't you, ignore it and nothing happens. ${footLink(SITE, 'celestual.us')}`,
    ),
  })
  const text = [
    head,
    '',
    proves,
    '',
    `${key}: ${o.link}`,
    '',
    `your screen shows ${n}. if it doesn't, ignore this email.`,
    'the link works once, for 30 minutes. nobody sees your address.',
    '',
    `you're getting this because this address was typed into celestual. if that wasn't you, ignore it and nothing happens.`,
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

// ── the Supabase Auth code ───────────────────────────────────────────────────
// "continue with email" (migration 0057) is Supabase Auth's own mail, sent by
// Supabase from a template pasted into the dashboard. This is that template,
// written to supabase/templates/magic-link.html by scripts/mail-preview.mjs.
// `{{ .Token }}` is Supabase's; it is left for Supabase to fill.
export function magicLinkTemplate(): Mail {
  const token = '{{ .Token }}'
  const html = frame({
    preheader: 'your celestual code is inside. it works once.',
    inner: `
      ${title('your code for celestual.')}
      ${body('type it where you asked for it, and you are in.')}
      ${code(token)}
      ${tick(`it works once. if you didn't ask for it, ignore this email.`)}`,
    foot: colophon(
      `you're getting this because this address asked to continue on celestual. ` +
      `nobody sees your address. ${footLink(SITE, 'celestual.us')}`,
    ),
  })
  return {
    subject: 'your celestual code: {{ .Token }}',
    html,
    text: `your code for celestual: ${token}\n\nit works once. if you didn't ask for it, ignore this email.`,
  }
}
