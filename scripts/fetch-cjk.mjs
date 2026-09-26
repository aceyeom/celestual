#!/usr/bin/env node
// fetch-cjk.mjs - the screen's face for Korean, Japanese and Chinese.
//
// Every word on a letter is set in Jersey 10, the Series 40 grid
// (scripts/fetch-faces.mjs), and Jersey 10 is latin. A letter written in
// Korean, Japanese or Chinese fell through it to whatever monospace the
// reader's phone had, which is a smooth outline face at a size nobody chose,
// in the middle of a screen drawn a pixel at a time: the one thing on the
// glass that was not the phone.
//
// So the three languages get a pixel face of their own, and one design for
// all three, so a letter in Korean and a letter in Chinese read as the same
// phone: Fusion Pixel Font (TakWolf, SIL Open Font License 1.1), the 12px
// proportional cut, in its Korean, Japanese, simplified Chinese and
// traditional Chinese variants. The variants are the same drawing where the
// scripts are the same and differ where the languages draw the same
// character differently, which is why there is one family per language and
// the page picks between them by the `lang` of the text (type.js `langOf`,
// phone.css `--f-cjk`).
//
// ── where it comes from ──────────────────────────────────────────────────────
// The release is on GitHub. It is also mirrored, byte for byte in its glyphs,
// by Fontsource on npm (`@fontsource/fusion-pixel-12px-proportional-*`, one
// whole font per variant, labelled a latin subset but carrying every glyph),
// and the registry is reachable from places GitHub's release downloads are
// not, this repository's cloud sandbox among them. So the mirror is the
// default, pinned, so a second run writes the same bytes. `FUSION_DIR` points
// the script at an unzipped release instead (the `otf`, `ttf` or `woff2` zip
// of the 12px proportional cut), for when the release itself is wanted.
//
// ── what is kept, and how it is cut ─────────────────────────────────────────
// Only what these three languages need and Jersey 10 does not draw: Hangul in
// the Korean face, kana in the Japanese, bopomofo in the Chinese, and in all
// of them the ideographs, the CJK punctuation and the full width forms. Latin
// stays Jersey's.
//
// A page must load only the characters it shows, so each face is cut into
// about a hundred files, each declared with the `unicode-range` it holds, and
// the browser fetches the few a letter's words fall in. The cut follows
// Google Fonts' own slicing of Noto Sans KR, JP, SC and TC, which orders the
// characters by how often they are written: the commonest few thousand of each
// language are cut exactly as Google cuts them, so an ordinary letter touches
// a handful of files. The rare rest is cut in runs of code points, each
// declared as one span, since Google's exact lists for the rare ones were
// three quarters of a stylesheet every visitor would load. A span overlaps the
// common files round it, so the spans are declared first and the common files
// after: the browser checks the last declared face first, and a common
// character never pulls down a rare file. Without Google's map (offline), every
// file is a run of code points.
//
// ── and how it sits on Jersey 10's grid ─────────────────────────────────────
// Jersey 10 is 1400 units to the em with a pixel of 75, eighteen and two
// thirds pixels to the em, and its capitals ten pixels tall. Fusion Pixel is
// 1200 to the em with a pixel of 100, twelve to the em, and an ideograph
// eleven pixels tall, from a pixel under the baseline to ten over it. Set at
// the same size, a Fusion pixel was half as big again as a Jersey pixel, and
// the words were two screens' type side by side. Each face here is drawn at
// three quarters, a pixel of 100 to one of 75, and declared 1400 to the em,
// so one of its pixels is 75/1400 of an em, Jersey's own numbers: every
// ideograph stands on the same grid as the latin round it, as tall as a
// capital and a pixel under the line, as the phone set it. Every coordinate
// in the release is a multiple of four, so nothing is rounded. Its ascent and descent are Jersey's too, so a line with
// Hangul in it is the same height as one without. It is written into the
// files rather than into `size-adjust` and `ascent-override`, which the
// canvas the shared picture is drawn on, and Safari before 17, do not all
// honour; the stylesheet then needs no descriptor to be right.
//
// And a weight: Jersey 10's strokes are two of its pixels and Fusion's one,
// so every glyph is made bold the way a pixel face is, a pixel to the right
// of every upright that has room for one (`embolden`, in the cut below).
//
// ── and what the licence asks ───────────────────────────────────────────────
// 'Fusion Pixel' is a Reserved Font Name, and a subset is a modified font, so
// the files are renamed (`Celestual Pixel KO`, `JA`, `ZH`, `ZH Hant`, in the
// name table and in the CFF), keep the copyright and the licence in their
// names, and the licence travels beside them (app/public/fonts/cjk/OFL.txt).
//
// Needs Python 3 with fonttools and brotli:  pip install fonttools brotli
// Run:  node scripts/fetch-cjk.mjs
// When Node's fetch has to go through a proxy, run it with NODE_USE_ENV_PROXY=1.
import { mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, copyFileSync, existsSync, mkdtempSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fonts = join(root, 'app/public/fonts')
const out = join(fonts, 'cjk')

// Fontsource's package of the 2024.05.12 release
const MIRROR = '5.3.0'
const RELEASE = '2024.05.12'
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// How many of each language's commonest characters are cut the way Google
// cuts them, and how many code points go in each file of the rare rest
const COMMON = 3500
const RUN = 480

// ── the ranges ──
const R = (a, b) => [a, b]
const SHARED = [
  R(0x3000, 0x303F), // CJK symbols and punctuation
  R(0x3200, 0x32FF), // enclosed letters and months
  R(0x3300, 0x33FF), // CJK compatibility (the squared units)
  R(0x3400, 0x4DBF), // ideographs, extension A
  R(0x4E00, 0x9FFF), // the ideographs
  R(0xF900, 0xFAFF), // compatibility ideographs
  R(0xFE30, 0xFE4F), // compatibility forms
  R(0xFF00, 0xFFEF), // half and full width forms
  R(0x20000, 0x2FA1F), // the ideographs past the first plane
]
const HANGUL = [R(0x1100, 0x11FF), R(0x3130, 0x318F), R(0xA960, 0xA97F), R(0xAC00, 0xD7AF), R(0xD7B0, 0xD7FF)]
const KANA = [R(0x3040, 0x309F), R(0x30A0, 0x30FF), R(0x31F0, 0x31FF)]
const BOPOMOFO = [R(0x3100, 0x312F), R(0x31A0, 0x31BF)]

// One family per language. `fontsource` names the mirror's package, `release`
// the variant's name in the release's files, `noto` the family whose slicing
// orders it, and `file` the prefix its slices are written under
const VARIANTS = [
  { file: 'ko', family: 'Celestual Pixel KO', fontsource: 'kr', release: 'ko', noto: 'Noto+Sans+KR', keep: [...HANGUL, ...SHARED] },
  { file: 'ja', family: 'Celestual Pixel JA', fontsource: 'jp', release: 'ja', noto: 'Noto+Sans+JP', keep: [...KANA, ...SHARED] },
  { file: 'zh', family: 'Celestual Pixel ZH', fontsource: 'sc', release: 'zh_hans', noto: 'Noto+Sans+SC', keep: [...BOPOMOFO, ...SHARED] },
  { file: 'zh-hant', family: 'Celestual Pixel ZH Hant', fontsource: 'tc', release: 'zh_hant', noto: 'Noto+Sans+TC', keep: [...BOPOMOFO, ...SHARED] },
]

// ── the tools ──
const python = process.env.PYTHON || 'python3'
{
  const r = spawnSync(python, ['-c', 'import fontTools, brotli'], { encoding: 'utf8' })
  if (r.status !== 0) {
    console.error('fetch-cjk needs Python 3 with fonttools and brotli: pip install fonttools brotli')
    process.exit(1)
  }
}

async function get(url, as = 'buffer') {
  const r = await fetch(url, { headers: { 'user-agent': UA } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return as === 'text' ? r.text() : Buffer.from(await r.arrayBuffer())
}

const work = mkdtempSync(join(tmpdir(), 'fetch-cjk-'))

// The font for a variant, and the licence it came with: from the release on
// disk when `FUSION_DIR` names one, and otherwise from the mirror
async function source(v) {
  const dir = process.env.FUSION_DIR
  if (dir) {
    const name = readdirSync(dir).find((f) => new RegExp(`^fusion-pixel-12px-proportional-${v.release}\\.(otf|ttf|woff2)$`).test(f))
    if (!name) throw new Error(`no fusion-pixel-12px-proportional-${v.release} font in ${dir}`)
    const licence = readdirSync(dir).find((f) => /^(OFL|LICENSE)(\.txt)?$/i.test(f))
    return { font: join(dir, name), licence: licence ? join(dir, licence) : '' }
  }
  const pkg = `fusion-pixel-12px-proportional-${v.fontsource}`
  const tgz = join(work, `${pkg}.tgz`)
  writeFileSync(tgz, await get(`https://registry.npmjs.org/@fontsource/${pkg}/-/${pkg}-${MIRROR}.tgz`))
  const into = join(work, pkg)
  mkdirSync(into, { recursive: true })
  execFileSync('tar', ['-xzf', tgz, '-C', into])
  const files = join(into, 'package/files')
  const woff2 = readdirSync(files).find((f) => f.endsWith('.woff2'))
  return { font: join(files, woff2), licence: join(into, 'package/LICENSE') }
}

// Google's slices of a Noto family, commonest first: Google numbers them
// from the rarest, so the highest number is the commonest
async function slicing(noto) {
  let css
  try {
    css = await get(`https://fonts.googleapis.com/css2?family=${noto}&display=swap`, 'text')
  } catch (e) {
    console.warn(`  no slicing for ${noto} (${e.message}): runs of code points instead`)
    return null
  }
  const list = []
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1]
    const n = body.match(/\.(\d+)\.woff2/)
    const range = body.match(/unicode-range:\s*([^;]+);/)
    if (!n || !range) continue
    const cps = []
    for (const part of range[1].split(',')) {
      const [a, b] = part.trim().slice(2).split('-').map((h) => parseInt(h, 16))
      for (let c = a; c <= (b ?? a); c++) cps.push(c)
    }
    list.push({ n: Number(n[1]), cps })
  }
  return list.sort((a, b) => b.n - a.n).map((s) => s.cps)
}

// ── the cut, in fonttools ──
// Each variant: kept to its ranges, scaled onto Jersey 10's grid, renamed,
// and then cut into its slices in parallel. Answers, on stdout, every file it
// wrote with the code points in it.
const CUT = String.raw`
import io, json, sys
from multiprocessing import Pool
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen

def options(flavor=None):
    o = subset.Options()
    o.flavor = flavor
    o.hinting = False
    o.desubroutinize = True
    o.notdef_outline = True
    o.name_IDs = ['*']
    o.name_languages = ['*']
    o.drop_tables += ['vhea', 'vmtx', 'VORG', 'BASE', 'JSTF']
    return o

def prepare(v):
    f = TTFont(v['font'])
    keep = set()
    for a, b in v['keep']:
        keep.update(range(a, b + 1))
    cps = sorted(set(f.getBestCmap()) & keep)
    s = subset.Subsetter(options())
    s.populate(unicodes=cps)
    s.subset(f)
    off = embolden(f, 100)
    # one Fusion pixel (100 of 1200) onto one Jersey pixel (75 of 1400): the
    # outlines at three quarters, the em to 1400
    rescale(f, 0.75, 1400)
    # and Jersey 10's ascent and descent, as Jersey 10 declares them
    f['hhea'].ascent, f['hhea'].descent, f['hhea'].lineGap = 1125, -375, 0
    os2 = f['OS/2']
    os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap = 1125, -375, 0
    os2.usWinAscent, os2.usWinDescent = 1130, 375
    os2.fsSelection |= 1 << 7
    rename(f, v['family'])
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue(), cps, off

# ── the weight ──
# Jersey 10's strokes are two of its pixels thick and Fusion Pixel's are one,
# so beside a latin word a Korean one read a weight lighter, as if set in
# another phone's type. So every glyph is made bold the way a pixel face is:
# each lit pixel of its drawing puts one more beside it on the right, unless
# the pixel after that is lit, where it would close a gap of one pixel and run
# two strokes into one (the two uprights of the double consonants, and every
# dense ideograph, keep their gaps). Uprights come out two pixels wide like
# Jersey's, the horizontals stay one, since in a twelve pixel ideograph there
# is no room between them for a second, and every advance is a pixel wider,
# so two characters never touch. The drawing is read back off its own grid of
# p units and traced round again; a glyph that is not on the grid (none, in
# this release) keeps its drawing and takes the wider advance.
def raster(ops, p):
    edges = []
    start = cur = None

    def add(a, b):
        if a[0] == b[0] and a[1] != b[1]:
            edges.append((a[0], min(a[1], b[1]), max(a[1], b[1]), 1 if b[1] > a[1] else -1))
        elif a[0] != b[0] and a[1] != b[1]:
            raise ValueError('off the grid')

    for op, args in ops:
        if op == 'moveTo':
            start = cur = args[0]
        elif op == 'lineTo':
            add(cur, args[0])
            cur = args[0]
        elif op in ('closePath', 'endPath'):
            if cur is not None and cur != start:
                add(cur, start)
            cur = start
        else:
            raise ValueError('off the grid')
    if any(x % p or a % p or b % p for x, a, b, _ in edges):
        raise ValueError('off the grid')
    pix = set()
    if not edges:
        return pix
    for j in range(min(e[1] for e in edges) // p, max(e[2] for e in edges) // p):
        cy = (j + 0.5) * p
        xs = sorted((x, d) for x, a, b, d in edges if a < cy < b)
        wind = 0
        for i, (x, d) in enumerate(xs):
            if wind != 0:
                for k in range(xs[i - 1][0] // p, x // p):
                    pix.add((k, j))
            wind += d
    return pix

def bold(pix):
    out = set(pix)
    for (x, y) in pix:
        if (x + 1, y) not in pix and (x + 2, y) not in pix:
            out.add((x + 1, y))
    return out

# round the lit pixels: every side of a lit pixel against an unlit one, turned
# the same way round each, linked into loops, and the corners kept
def trace(pix, pen, p):
    edges = {}

    def put(a, b):
        edges.setdefault(a, []).append(b)

    for (x, y) in pix:
        if (x, y - 1) not in pix:
            put((x, y), (x + 1, y))
        if (x + 1, y) not in pix:
            put((x + 1, y), (x + 1, y + 1))
        if (x, y + 1) not in pix:
            put((x + 1, y + 1), (x, y + 1))
        if (x - 1, y) not in pix:
            put((x, y + 1), (x, y))
    while edges:
        a = min(edges)
        loop = [a]
        cur = a
        while True:
            nxt = edges[cur].pop()
            if not edges[cur]:
                del edges[cur]
            if nxt == a:
                break
            loop.append(nxt)
            cur = nxt
        n = len(loop)
        pts = [loop[i] for i in range(n) if not (
            loop[i - 1][0] == loop[i][0] == loop[(i + 1) % n][0]
            or loop[i - 1][1] == loop[i][1] == loop[(i + 1) % n][1])]
        pen.moveTo((pts[0][0] * p, pts[0][1] * p))
        for q in pts[1:]:
            pen.lineTo((q[0] * p, q[1] * p))
        pen.closePath()

def embolden(f, p):
    cff = f['CFF '].cff
    top = cff.topDictIndex[0]
    gs = f.getGlyphSet()
    hmtx = f['hmtx'].metrics
    new = {}
    off = []
    for name in f.getGlyphOrder():
        rec = RecordingPen()
        gs[name].draw(rec)
        w = hmtx[name][0] + p
        pen = T2CharStringPen(w, None)
        try:
            trace(bold(raster(rec.value, p)), pen, p)
        except ValueError:
            pen = T2CharStringPen(w, None)
            rec.replay(pen)
            off.append(name)
        new[name] = pen.getCharString(private=top.Private, globalSubrs=cff.GlobalSubrs)
        hmtx[name] = (w, hmtx[name][1])
    top.Private.nominalWidthX = 0
    top.Private.defaultWidthX = 0
    for name, c in new.items():
        top.CharStrings[name] = c
    return len(off)

# Every outline and advance k times over, and the em declared as upem. By
# drawing each glyph again through a pen: fontTools' scale_upem does the same
# to a CFF at a glyph every tenth of a second, which on thirty thousand glyphs
# was most of an hour. The widths are written into every charstring whole, so
# the private dictionary's two defaults go to nought
def rescale(f, k, upem):
    cff = f['CFF '].cff
    top = cff.topDictIndex[0]
    gs = f.getGlyphSet()
    hmtx = f['hmtx'].metrics
    new = {}
    for name in f.getGlyphOrder():
        pen = T2CharStringPen(round(hmtx[name][0] * k), None)
        gs[name].draw(TransformPen(pen, (k, 0, 0, k, 0, 0)))
        new[name] = pen.getCharString(private=top.Private, globalSubrs=cff.GlobalSubrs)
    top.Private.nominalWidthX = 0
    top.Private.defaultWidthX = 0
    for name, c in new.items():
        top.CharStrings[name] = c
    for name, (w, lsb) in list(hmtx.items()):
        hmtx[name] = (round(w * k), round(lsb * k))
    f['head'].unitsPerEm = upem
    top.FontMatrix = [1 / upem, 0, 0, 1 / upem, 0, 0]

def rename(f, family):
    ps = family.replace(' ', '') + '-Regular'
    name = f['name']
    version = name.getDebugName(5) or ''
    for rec in list(name.names):
        if rec.nameID in (1, 2, 3, 4, 6, 10, 16, 17, 18, 21, 22):
            name.removeNames(nameID=rec.nameID)
    name.setName(family, 1, 3, 1, 0x409)
    name.setName('Regular', 2, 3, 1, 0x409)
    name.setName(family + ' Regular; ' + version, 3, 3, 1, 0x409)
    name.setName(family + ' Regular', 4, 3, 1, 0x409)
    name.setName(ps, 6, 3, 1, 0x409)
    name.setName('A subset of Fusion Pixel Font, 12px proportional, by TakWolf, cut and rescaled for celestual.us. Modified under the SIL Open Font License 1.1, and not the original: Fusion Pixel is a Reserved Font Name.', 10, 3, 1, 0x409)
    if 'CFF ' in f:
        cff = f['CFF '].cff
        cff.fontNames = [ps]
        top = cff.topDictIndex[0]
        top.FamilyName = family
        top.FullName = family + ' Regular'

base = None
def init(data):
    global base
    base = data

def cut(task):
    path, cps = task
    f = TTFont(io.BytesIO(base))
    s = subset.Subsetter(options('woff2'))
    s.populate(unicodes=cps)
    s.subset(f)
    f.save(path)
    return path

def main():
    job = json.load(sys.stdin)
    report = []
    for v in job['variants']:
        data, cps, off = prepare(v)
        left = set(cps)
        common = []
        for g in v['slices'] or []:
            if sum(len(s) for s in common) >= job['common']:
                break
            s = sorted(left.intersection(g))
            if s:
                common.append(s)
                left.difference_update(s)
        rest = sorted(left)
        runs = [rest[i:i + job['run']] for i in range(0, len(rest), job['run'])]
        tasks = []
        files = []
        for i, s in enumerate(runs):
            p = '%s/%s-r%02d.woff2' % (job['out'], v['file'], i)
            tasks.append((p, s))
            files.append({'path': p, 'cps': s, 'span': True})
        # the commonest last, so it is the first face the browser checks
        for i, s in enumerate(reversed(common)):
            p = '%s/%s-c%02d.woff2' % (job['out'], v['file'], len(common) - 1 - i)
            tasks.append((p, s))
            files.append({'path': p, 'cps': s, 'span': False})
        with Pool(initializer=init, initargs=(data,)) as pool:
            pool.map(cut, tasks, chunksize=4)
        report.append({'file': v['file'], 'family': v['family'], 'glyphs': len(cps), 'off': off, 'files': files})
    json.dump(report, sys.stdout)

# a guard, since a worker started by spawn (macOS) imports this file again
if __name__ == '__main__':
    main()
`

// ── the stylesheet ──
const hex = (c) => c.toString(16)
// exact, as runs of consecutive code points
function ranges(cps) {
  const out = []
  for (let i = 0; i < cps.length;) {
    let j = i
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++
    out.push(i === j ? `U+${hex(cps[i])}` : `U+${hex(cps[i])}-${hex(cps[j])}`)
    i = j + 1
  }
  return out.join(', ')
}

// ── the run ──
mkdirSync(out, { recursive: true })
for (const f of readdirSync(out)) if (f.endsWith('.woff2')) rmSync(join(out, f))

const variants = []
let licence = ''
for (const v of VARIANTS) {
  const src = await source(v)
  licence = licence || src.licence
  const slices = await slicing(v.noto)
  console.log(`${v.file}: ${src.font.replace(work, '(mirror)')}${slices ? `, sliced as ${v.noto.replace(/\+/g, ' ')}` : ''}`)
  variants.push({ ...v, font: src.font, slices })
}

// from a file and not \`-c\`: a worker started by spawn imports the program
const program = join(work, 'cut.py')
writeFileSync(program, CUT)
const run = spawnSync(python, [program], {
  input: JSON.stringify({ variants, out, common: COMMON, run: RUN }),
  encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
})
if (run.status !== 0) {
  console.error(run.stderr)
  process.exit(1)
}
const report = JSON.parse(run.stdout)

if (licence && existsSync(licence)) copyFileSync(licence, join(out, 'OFL.txt'))

const blocks = []
let total = 0
let count = 0
for (const v of report) {
  let bytes = 0
  for (const f of v.files) {
    const size = statSync(f.path).size
    bytes += size
    const name = f.path.slice(out.length + 1)
    const range = f.span ? `U+${hex(f.cps[0])}-${hex(f.cps[f.cps.length - 1])}` : ranges(f.cps)
    blocks.push([
      '@font-face {',
      `  font-family: '${v.family}';`,
      '  font-style: normal;',
      '  font-weight: 400;',
      '  font-display: swap;',
      `  src: url('./cjk/${name}') format('woff2');`,
      `  unicode-range: ${range};`,
      '}',
    ].join('\n'))
  }
  total += bytes
  count += v.files.length
  console.log(`  ${v.family}: ${v.glyphs} glyphs, ${v.files.length} files, ${(bytes / 1024).toFixed(0)} KB${v.off ? `, ${v.off} glyphs off the grid and not made bold` : ''}`)
}

writeFileSync(join(fonts, 'faces-cjk.css'), [
  '/* faces-cjk.css - generated by scripts/fetch-cjk.mjs. Do not edit by hand.',
  '',
  `   The screen's face for Korean, Japanese and Chinese: Fusion Pixel Font`,
  `   ${RELEASE}, 12px proportional, by TakWolf, under the SIL Open Font`,
  '   License 1.1 (./cjk/OFL.txt), cut, rescaled onto Jersey 10\'s grid and',
  '   renamed, since Fusion Pixel is a Reserved Font Name. One family per',
  '   language, picked by the `lang` of the text (phone.css `--f-cjk`). Each',
  '   family\'s rare characters are declared first, as spans, and its common',
  '   ones last, exactly, so the browser checks a common file first and a',
  '   common character never pulls down a rare file. The grid is in the files,',
  '   so no face here needs size-adjust or an ascent override. */',
  '',
  blocks.join('\n\n'),
  '',
].join('\n'))

rmSync(work, { recursive: true, force: true })
console.log(`\n${count} files, ${(total / 1024).toFixed(0)} KB, plus faces-cjk.css and cjk/OFL.txt, in app/public/fonts/`)
