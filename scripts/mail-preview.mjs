#!/usr/bin/env node
// mail-preview.mjs: the visual loop in docs/rebuild-spec.md 7.3, for the mail.
//
// Renders every mail the product sends from the REAL templates
// (supabase/functions/_shared/mails.ts on _shared/mail.ts), at the widths a
// mail is read at, and screenshots them into design/shots/ (gitignored:
// regenerate, never commit).
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
// Three views:
//   phone   390 wide at 2x, with the pixel face, as iOS Mail draws it
//   desk    800 wide, with the pixel face, as Apple Mail on a desk draws it
//   plain   800 wide with the web font refused, as Gmail and Outlook draw it
//           (neither loads @font-face, so every stack falls back to Helvetica)
//
// The font and the header image are answered from this checkout rather than
// the live site, so a change is shot before it is deployed. Until
// app/public/mail/head.png exists (builder E draws it), a stand-in is drawn
// here from the real mark and the real faces, 600 by 150 at 2x, and the shots
// say so in the list they print.
import { mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/shots')
mkdirSync(out, { recursive: true })

const mails = await import(pathToFileURL(join(root, 'supabase/functions/_shared/mails.ts')).href)

const SITE = 'https://celestual.us'
const LINK = `${SITE}/verify#t=q9VbX2mL0cN4rT7yW1eA5sD8fG3hJ6kZ0pOiUuYtReW`
const TOKEN = 'Hk3n0pQ8rS2tU6vW9xY1zA4bC7dE0fG3hJ6kL9mN2p'

// Every mail the product sends, with the words it will carry.
const MAILS = {
  verify: () => mails.verifyMail({ link: LINK, match: 47, purpose: 'edu', domain: 'berkeley.edu' }),
  'verify-alerts': () => mails.verifyMail({ link: LINK, match: 82, purpose: 'alerts' }),
  // the door's "continue with email" (0065), for any address, and for a .edu
  // one, which opens its campus as it signs somebody in
  'verify-login': () => mails.verifyMail({ link: LINK, match: 36, purpose: 'login' }),
  'verify-login-edu': () => mails.verifyMail({ link: LINK, match: 58, purpose: 'login', domain: 'berkeley.edu' }),
  mutual: () => mails.mutualMail({
    other: 'jules.k', hasCard: true,
    openUrl: `${SITE}/reveal/jules.k`, stopUrl: `${SITE}/alerts#off=${TOKEN}`,
  }),
  wrote: () => mails.wroteMail({
    handle: 'sofia.reyes', readUrl: `${SITE}/letter/5f0c2a4e-3b1d-4c8e-9a7f-2d6b8e1c0f93`,
    removeUrl: `${SITE}/r#t=${TOKEN}`, stopUrl: `${SITE}/alerts#off=${TOKEN}`,
  }),
  code: () => mails.codeMail({ code: '481920', school: 'UC Berkeley', minutes: 10 }),
}

const VIEWS = [
  { name: 'phone', width: 390, height: 900, scale: 2, font: true },
  { name: 'desk', width: 800, height: 900, scale: 1, font: true },
  { name: 'plain', width: 800, height: 900, scale: 1, font: false },
]

const want = process.argv[2]
const list = Object.keys(MAILS).filter((k) => !want || k === want)

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH
    || (process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
    || undefined,
})

// ── the header image ─────────────────────────────────────────────────────────
const headFile = join(root, 'app/public/mail/head.png')
let head = existsSync(headFile) ? readFileSync(headFile) : null
const standIn = !head
if (!head) {
  const fonts = join(root, 'app/public/fonts')
  const b64 = (f) => readFileSync(f).toString('base64')
  const page = await browser.newPage({ viewport: { width: 600, height: 150 }, deviceScaleFactor: 2 })
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Newsreader; src: url(data:font/woff2;base64,${b64(join(fonts, 'newsreader-normal-200-800-latin.woff2'))}) format('woff2'); font-weight: 200 800; }
    @font-face { font-family: 'Jersey 10'; src: url(data:font/woff2;base64,${b64(join(fonts, 'jersey-10-normal-400-latin.woff2'))}) format('woff2'); }
    html, body { margin: 0; background: #000; }
    .h { width: 600px; height: 150px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; box-sizing: border-box; }
    .lock { display: flex; align-items: center; gap: 10px; color: #F4F1EA; font: 500 30px/1 Newsreader, serif; letter-spacing: -0.02em; }
    .lock img { width: 34px; height: 34px; }
    .lcd { width: 132px; height: 92px; background: #0B0B0B; border: 1px solid rgba(244,241,234,.16); border-radius: 3px;
      display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 6px; }
    .lcd img { width: 40px; height: 40px; image-rendering: pixelated; filter: contrast(1.4); }
    .lcd span { font: 16px/1 'Jersey 10', sans-serif; color: #9C978E; }
  </style></head><body><div class="h">
    <div class="lock"><img src="data:image/png;base64,${b64(join(root, 'app/public/mark-chalk-256.png'))}"><span>celestual.</span></div>
    <div class="lcd"><img src="data:image/png;base64,${b64(join(root, 'app/public/mark-chalk-256.png'))}"><span>stand-in</span></div>
  </div></body></html>`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  head = await page.screenshot({ clip: { x: 0, y: 0, width: 600, height: 150 } })
  await page.close()
}

// ── the shots ────────────────────────────────────────────────────────────────
const made = []
for (const key of list) {
  const m = MAILS[key]()
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale })
    await page.route('**/fonts/jersey-10-normal-400-latin.woff2', (r) => v.font
      ? r.fulfill({ path: join(root, 'app/public/fonts/jersey-10-normal-400-latin.woff2'), contentType: 'font/woff2' })
      : r.abort())
    await page.route('**/mail/head.png', (r) => r.fulfill({ body: head, contentType: 'image/png' }))
    await page.setContent(m.html, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const file = join(out, `mail-${key}-${v.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    made.push(`design/shots/mail-${key}-${v.name}.png`)
    await page.close()
  }
}
await browser.close()

console.log(made.join('\n'))
if (standIn) console.log('(the header is a stand-in: app/public/mail/head.png is not in this checkout yet)')
