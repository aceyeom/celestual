#!/usr/bin/env node
// mail-preview.mjs: the visual loop in docs/rebuild-spec.md 7.3, for the mail.
//
// Renders every mail the product sends from the REAL templates
// (supabase/functions/_shared/mails.ts on _shared/mail.ts), at the widths a
// mail is read at, and screenshots them into design/shots/ (gitignored:
// regenerate, never commit), or into PREVIEW_OUT.
//
// It used to write one more file: supabase/templates/magic-link.html, the
// "continue with email" code that Supabase Auth mailed for us, for pasting
// into the dashboard. It was never pasted, and the live project mailed its
// own template with an eight digit code into a box that held six. The login
// is our own link now (migration 0065, `verify-login` below), sent by
// celestual-edu-verify like every other mail, so there is no template to
// paste and the file is gone.
//
//   node scripts/mail-preview.mjs            every mail, every view
//   node scripts/mail-preview.mjs wrote      one of them
//
// The templates are Deno TypeScript and are imported as they are: Node 22
// strips the types itself, so what is shot is what the edge functions send.
//
// Four views:
//   phone    390 wide at 2x, as iOS Mail draws it
//   desk     800 wide, as Apple Mail on a desk draws it
//   plain    800 wide with the web font refused, as Gmail and Outlook draw it
//            (neither loads @font-face; the one thing set in the pixel face
//            as text is the old code mail's code)
//   blocked  800 wide with every picture refused, as a client that blocks
//            them until asked draws it: the alt text, and the words
//
// The pictures and the font are answered from this checkout
// (app/public/mail/, scripts/export-mail.mjs, and app/public/fonts) rather
// than the live site, so a change is shot before it is deployed.
import { mkdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.env.PREVIEW_OUT || join(root, 'design/shots')
mkdirSync(out, { recursive: true })

const mails = await import(pathToFileURL(join(root, 'supabase/functions/_shared/mails.ts')).href)

const SITE = 'https://celestual.us'
const LINK = `${SITE}/verify#t=q9VbX2mL0cN4rT7yW1eA5sD8fG3hJ6kZ0pOiUuYtReW`
const TOKEN = 'Hk3n0pQ8rS2tU6vW9xY1zA4bC7dE0fG3hJ6kL9mN2p'

// Every mail the product sends, with the words it will carry.
const MAILS = {
  verify: () => mails.verifyMail({ link: LINK, purpose: 'edu', domain: 'berkeley.edu' }),
  'verify-alerts': () => mails.verifyMail({ link: LINK, purpose: 'alerts' }),
  // the door's "continue with email" (0065), for any address, and for a .edu
  // one, which opens its campus as it signs somebody in
  'verify-login': () => mails.verifyMail({ link: LINK, purpose: 'login' }),
  'verify-login-edu': () => mails.verifyMail({ link: LINK, purpose: 'login', domain: 'berkeley.edu' }),
  mutual: () => mails.mutualMail({
    other: 'jules.k', hasCard: true,
    openUrl: `${SITE}/reveal/jules.k`, stopUrl: `${SITE}/alerts#off=${TOKEN}`,
  }),
  wrote: () => mails.wroteMail({
    handle: 'sofia.reyes', readUrl: `${SITE}/letter/5f0c2a4e-3b1d-4c8e-9a7f-2d6b8e1c0f93`,
    removeUrl: `${SITE}/r#t=${TOKEN}`, stopUrl: `${SITE}/alerts#off=${TOKEN}`,
  }),
  code: () => mails.codeMail({ code: '481920', school: 'UC Berkeley', minutes: 10 }),
  // celestual-remind's, a few days before the reveal
  lapse: () => mails.lapseMail({ date: 'October 3' }),
}

const VIEWS = [
  { name: 'phone', width: 390, height: 900, scale: 2, font: true, pictures: true },
  { name: 'desk', width: 800, height: 900, scale: 1, font: true, pictures: true },
  { name: 'plain', width: 800, height: 900, scale: 1, font: false, pictures: true },
  { name: 'blocked', width: 800, height: 900, scale: 1, font: false, pictures: false },
]

const want = process.argv[2]
const list = Object.keys(MAILS).filter((k) => !want || k === want)

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH
    || (process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
    || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
})

const TYPES = { '.gif': 'image/gif', '.png': 'image/png' }
const made = []
const missing = new Set()
for (const key of list) {
  const m = MAILS[key]()
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale })
    await page.route('**/fonts/jersey-10-normal-400-latin.woff2', (r) => v.font
      ? r.fulfill({ path: join(root, 'app/public/fonts/jersey-10-normal-400-latin.woff2'), contentType: 'font/woff2' })
      : r.abort())
    await page.route('**/mail/*', (r) => {
      const name = basename(new URL(r.request().url()).pathname)
      const file = join(root, 'app/public/mail', name)
      if (!existsSync(file)) missing.add(name)
      return v.pictures && existsSync(file)
        ? r.fulfill({ path: file, contentType: TYPES[name.slice(name.lastIndexOf('.'))] || 'application/octet-stream' })
        : r.abort()
    })
    await page.setContent(m.html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const file = join(out, `mail-${key}-${v.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    made.push(file.replace(`${root}/`, ''))
    await page.close()
  }
}
await browser.close()

console.log(made.join('\n'))
if (missing.size) console.log(`(not in app/public/mail yet, so drawn as their alt text: ${[...missing].join(', ')}. Run node scripts/export-mail.mjs)`)
