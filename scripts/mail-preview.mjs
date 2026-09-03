#!/usr/bin/env node
// mail-preview.mjs: the visual loop in docs/rebuild-spec.md 7.3, for the mail.
//
// An email is a surface, and until Phase 8 nobody had looked at one. This
// renders every template `supabase/functions/_shared/mail.ts` builds, at the
// widths a mail is actually read at, and screenshots them.
//
//   node scripts/mail-preview.mjs          every template, both viewports
//   node scripts/mail-preview.mjs mutual   one of them
//
// It imports mail.ts by transliterating it: the file is Deno TypeScript, and
// the only TypeScript in it is three type annotations. Stripping those is
// cheaper and more honest than adding a bundler to look at an email.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'design/shots')
const tmp = join(root, 'node_modules/.cache-mail')
mkdirSync(out, { recursive: true })
mkdirSync(tmp, { recursive: true })

const ts = readFileSync(join(root, 'supabase/functions/_shared/mail.ts'), 'utf8')
// The frame's destructured parameter carries an object type, so it is named
// before the general pass: a `[^)]*` capture would swallow half of it.
const js = ts
  .replace(/\{ kicker, inner \}: \{[^}]*\}/, '{ kicker, inner }')
  .replace(/export function (\w+)\(([^)]*)\)/g, (m, n, a) => `export function ${n}(${a.replace(/:\s*[\w.<>|[\] ]+/g, '')})`)
writeFileSync(join(tmp, 'mail.mjs'), js)
const mail = await import(pathToFileURL(join(tmp, 'mail.mjs')).href)

const SITE = 'https://celestual.us'

// Every mail the product sends. Three, and that is all of them.
const MAILS = {
  mutual: () => mail.frame({
    inner: `
      ${mail.title('It is mutual.')}
      ${mail.body(
        `you entered @jules.k. ` +
        `<span style="color:${mail.C.accent}">@jules.k entered you.</span><br/>` +
        `this only ever happens when it is real on both sides.`,
      )}
      ${mail.body('they left a card for you. it opens when you do.')}
      ${mail.plate(`${SITE}/sky`, 'go and see')}
      ${mail.colophon(
        `you are reading this because you placed a ping on celestual and it resolved mutual. ` +
        `one sided pings are never revealed to anybody. to take your @ off entirely, go to ${SITE}/optout.`,
      )}`,
  }),
  code: () => mail.frame({
    kicker: 'your code',
    inner: `
      ${mail.title('You are at UC Berkeley.')}
      ${mail.body('type this back into celestual and the wall opens.')}
      ${mail.code('4819')}
      ${mail.plate(`${SITE}/copy#c=4819`, 'copy the code')}
      ${mail.tick('it lasts 15 minutes.')}
      ${mail.colophon(
        `you are reading this because somebody entered this address on celestual. ` +
        `if that was not you, ignore it and nothing happens. ${SITE}`,
      )}`,
  }),
  lapse: () => mail.frame({
    kicker: 'one of your pings',
    inner: `
      ${mail.title('Still feel it?')}
      ${mail.body(
        'it lapses on November 3. renewing is one tap and free, as often as you feel it. ' +
        'it restarts the sixty days from the day you tap it, and it never uses a slot.',
      )}
      ${mail.body('or let it go, and it disappears completely. nothing was ever revealed either way, and the slot opens back up the same day.')}
      ${mail.plate(SITE, 'keep it standing')}
      ${mail.tick('the slot opens November 3', mail.C.accent)}
      ${mail.colophon(
        'this note is about your own ping only. we cannot and do not tell you anything about anyone else: ' +
        `celestual stores who you entered as a salted hash, and even we cannot read it. opt out entirely at ${SITE}/optout.`,
      )}`,
  }),
}

// A phone reading pane and a desktop one. Both are the WIDTH of a mail client's
// reading area, not of a browser window: the mail is 480px at most and what is
// being looked at is how it sits in the space around it.
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 900, scale: 2 },
  { name: 'desk', width: 800, height: 900, scale: 1 },
]

const want = process.argv[2]
const list = Object.keys(MAILS).filter((k) => !want || k === want)
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH
    || (process.env.PLAYWRIGHT_BROWSERS_PATH && join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
    || undefined,
})
const made = []
for (const key of list) {
  const html = MAILS[key]()
  for (const v of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale })
    await page.setContent(html, { waitUntil: 'load' })
    const file = join(out, `mail-${key}-${v.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    made.push(`design/shots/mail-${key}-${v.name}.png`)
    await page.close()
  }
}
await browser.close()
console.log(made.join('\n'))
