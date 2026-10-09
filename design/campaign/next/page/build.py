#!/usr/bin/env python3
# Builds the treatment page into one self contained HTML file: the template,
# its script, two inks' masks as data URIs, round's animatic (its modules,
# and the app's rig, bundled into the script), the face its screens are set
# in, the shot lists, the palettes and the real lockup, read from the app.
#   python3 build.py ../treatment.html [artifact.html]
import base64, html, json, re, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
OUT = Path(sys.argv[1])
ART = Path(sys.argv[2]) if len(sys.argv) > 2 else None

# the parts read from the app, written fresh: the palettes, screens, glyphs
# and lockup (palettes.mjs), and the lockup as the page's SVG
subprocess.run(['node', str(HERE / 'palettes.mjs')], check=True, capture_output=True)
svg = subprocess.run(['node', '--input-type=module', '-e',
                      f"import {{ lockupSVG }} from '{ROOT / 'app/src/wall/brand.js'}'; process.stdout.write(lockupSVG('currentColor'))"],
                     check=True, capture_output=True, text=True).stdout
svg = re.sub(r'\sid="[^"]*"', '', svg).replace('role="img"', 'role="img" aria-label="celestual."')

def uri(name, kind='image/png'):
    return f'data:{kind};base64,' + base64.b64encode((HERE / name).read_bytes()).decode()

masks = {f'a_{n}': uri(f'a-{n}.png') for n in ['her', 'him', 'ribbon', 'boards', 'boardsair', 'moon', 'trees', 'branch', 'bloom']}

# ── round's modules, as one expression ──────────────────────────────────────
# Each ES module becomes a function whose result is its exports; an import
# becomes a name for that result. Only the forms the modules use: named
# imports, `* as`, and `export` on a const or a function.
IMPORT = re.compile(r"^import\s+(?:\{([^}]*)\}|\*\s+as\s+(\w+))\s+from\s+'([^']+)'\s*;?[ \t]*$", re.M)
ALIAS = {(ROOT / 'app/src/wall/scenes/kit.js').resolve(): (HERE / 'kit-shim.js').resolve()}

def bundle(entry, expose):
    order, seen = [], set()
    def real(p):
        p = p.resolve()
        return ALIAS.get(p, p)
    def visit(p):
        if p in seen:
            return
        seen.add(p)
        for m in IMPORT.finditer(p.read_text()):
            visit(real(p.parent / m.group(3)))
        order.append(p)
    visit(real(entry))
    names = {p: f'__m{i}' for i, p in enumerate(order)}
    parts = []
    for p in order:
        src = p.read_text()
        def imp(m):
            ref = names[real(p.parent / m.group(3))]
            if m.group(2):
                return f'const {m.group(2)} = {ref}'
            items = [re.sub(r'^(\w+)\s+as\s+(\w+)$', r'\1: \2', x.strip()) for x in m.group(1).split(',') if x.strip()]
            return 'const { ' + ', '.join(items) + ' } = ' + ref
        src = IMPORT.sub(imp, src)
        exports = re.findall(r'^export\s+(?:async\s+)?(?:const|let|function\*?|class)\s+(\w+)', src, re.M)
        src = re.sub(r'^export\s+', '', src, flags=re.M)
        parts.append(f'// {p.relative_to(ROOT)}\nconst {names[p]} = (() => {{\n{src}\nreturn {{ {", ".join(exports)} }}\n}})()')
    out = ', '.join(f'{k}: {names[real(HERE / v)]}{"." + a if a else ""}' for k, (v, a) in expose.items())
    return '(() => {\n' + '\n'.join(parts) + f'\nreturn {{ {out} }}\n}})()'

ROUND = bundle(HERE / 'round-page.js', {'createRound': ('round-page.js', 'createRound'), 'T': ('round-time.js', '')})

def words(items):
    out = []
    for kind, text, *ink in items:
        t = html.escape(text).replace(' / ', '<br>')
        cls = f' class="{ink[0]}"' if ink else ''
        if kind == 'none':
            out.append('<span class="none">no words</span>')
        elif kind == 'px':
            out.append(f'<span class="px{(" " + ink[0]) if ink else ""}">{t}</span>')
        elif kind == 'it':
            out.append(f'<i>{t}</i>')
        elif kind == 'mono':
            out.append(f'<span class="mono" style="font-size:13px">{t}</span>')
        else:
            out.append(f'<span{cls}>{t}</span>')
    return '<div class="say">' + '<br>'.join(out) + '</div>'

def shots(rows):
    out = []
    for n, when, bar, title, pic, say, snd in rows:
        out.append(
            f'<li class="shot"><div class="when">{n} · {html.escape(when)} ms<br>{html.escape(bar)}<b>{html.escape(title)}</b></div>'
            f'<p class="pic">{html.escape(pic)}</p>'
            f'<div class="side">{words(say)}<div class="snd">{html.escape(snd)}</div></div></li>'
        )
    return '\n      '.join(out)

A = [
    (1, '0 to 2000', 'bar 1', 'iris',
     "One sheet, edge to edge, in rose and black. The bench from behind at night; iris on its left half, her hair up and the ribbon in it, leaning to her right with her head tilted onto a shoulder that is not there. The right half of the bench is bare. Rose petals come down. The camera eases in from 1.00 to 1.04, and the print boils.",
     [('px', "next time i'd sit closer.", 'ink-rose')],
     "A sheet laid down. The marimba alone: her half of the hook, a rest after every note where his should be. A pad on F."),
    (2, '2000 to 4000', 'bar 2', 'jun',
     "On the downbeat a second sheet slides in over the first, four prints across, and stops square. Ice and black: the same bench, the same night; jun on its right half, his head tilted left, his cheek on hair that is not there. Ice petals.",
     [('px', "next time i'd move over.", 'ink-ice')],
     "The slide. The vibraphone alone: his half, every note on an offbeat answering nothing. The pad to D minor."),
    (3, '4000 to 6000', 'bar 3', 'apart',
     "The camera rises to 0.42: both sheets side by side on a table of black at 82 percent, a gap of table between them. She leans out of her sheet toward his; he leans out of his toward hers. They do not reach. The slugs read iris · rose and jun · ice.",
     [('none', '')],
     "The two players take turns, half a bar each, never at once. The bass comes in."),
    (4, '6000 to 8000', 'bar 4', 'send it privately',
     "Both sheets go face down on the glass and the lid comes down. Under the glass, in the dark: the scanner's bar, a band of bare paper, sweeps iris's sheet and then jun's, each picture showing through mirrored, only where the bar is.",
     [('serif', 'send it privately.')],
     "The lid. Two sweeps, rising. Each player holds one long note."),
    (5, '8000 to 10000', 'bar 5', 'the drums',
     "Inside the press: the rose drum above and the ice drum below, each wrapped in its master, her picture and his in negative as rows of tiny holes with the wet ink behind them. They turn a quarter turn and print nothing. The paper path under them is empty.",
     [('serif', 'they only read it / if they send you one too.')],
     "The drums' hum and a low tick on each beat. One note each, a beat apart."),
    (6, '10000 to 12000', 'bar 6', 'the week',
     "The press's panel, an LCD drawn in black with its digits left bare: wed, thu and fri on the beats, then sat 8:59 pm, and it holds.",
     [('serif', 'every mutual is revealed / on saturday at 9pm pacific.')],
     "Four ticks. A riser as the drums spin up."),
    (7, '12000 to 14000', 'bar 7', 'nine',
     "The panel reads sat 9:00 pm. Cut to the out tray: the press is running, a sheet a beat, and they land blank, blank, blank, each a slightly different paper. The second has one line printed on it and nothing else.",
     [('serif', "if it isn't, / nobody ever knows.")],
     "The press's ready beep. Then the press alone: the feed where a kick would be, the eject on the offbeats, the whirr. No tune."),
    (8, '14000 to 16000', 'bar 8', 'two inks',
     "One sheet goes through the other way. Riding the paper path: under the rose drum iris prints; under the ice drum jun lands 14 px and 0.8° out, and the camera goes down into the band where they overlap, where the two screens beat against each other in a moiré storm. On beat 3 the ice snaps into register over four prints, the storm falls quiet, and the camera comes back up: where her head rests on his shoulder the inks overprint, violet.",
     [('none', '')],
     "Her half, then his lands with it: for the first time the hook is whole. A shimmer under the storm. The snap, a low thump, the choir on F."),
    (9, '16000 to 18000', 'bar 9', "it's mutual",
     "The sheet slides out onto the stack and the camera is over the whole print: the bench, the moon, the branch, iris and jun together, petals in rose and ice and a few violet where two cross, and the violet band where they touch.",
     [('it', "it's mutual."), ('px', 'iris & jun')],
     "The band: both players, the bass, strings, and the press as the kit."),
    (10, '18000 to 20000', 'bar 10', 'both notes',
     "The camera slides up the sheet to the notes, side by side for the first time, each in its writer's ink and signed in black under it.",
     [('serif', 'you both find out.'), ('px', "next time i'd sit closer.", 'ink-rose'), ('px', "next time i'd move over.", 'ink-ice')],
     "The hook goes on. A counter line on the strings."),
    (11, '20000 to 22000', 'bar 11', 'every dot',
     "Straight down into the violet band: the dots grow, rose and ice and the violet where each pair overlaps, and on into one violet dot until it is the frame, and inside it, printed small and whole, is the same picture. It lands at the framing of shot 9 on the next downbeat.",
     [('none', '')],
     "A long rise in the strings and the choir."),
    (12, '22000 to 24000', 'bar 12', 'the corner',
     "On the whole sheet again, the camera travels to its top right corner: the registration target, printed once in each ink, a few px apart.",
     [('none', '')],
     "The band drops to the two players and the pad."),
    (13, '24000 to 26000', 'bar 13', 'in register',
     "Into the target. The rose and ice rings and crosses boil apart; on beat 3 they slide into register, and over six prints become the mark: the circle tilts to -19° and opens into the ring's band, the cross draws its arms in to the star's curved sides, and the inks give way to black. The last print is the pixel mark, 33 cells at 8 px a cell.",
     [('none', '')],
     "The snap. The hook's last phrase."),
    (14, '26000 to 30000', 'bars 14 and 15', 'the name',
     "The mark settles to 6 px a cell and the word prints beside it: the lockup, 672 by 198 px, in black, on the words' margin. The press slows, and the boil with it, from twelve prints a second to six.",
     [('serif', "nothing happens / unless it's mutual."), ('mono', 'celestual.us')],
     "B flat to C, then both players land on F5 together on the last downbeat. The press coasts down, its whirr falling a fifth."),
]
R = [
    (1, '0 to 2400', 'bars 1 and 2', 'the seat',
     "The 51B at 5:14 pm, everything in night's four greys: the street streaming past the steamed glass, the shops lit behind it. A woman stands in the aisle with a hand on the pole, her back to us, swaying, asleep on her feet. Sol is in the window seat beyond the pole. At 24 the stop chime. On the twos, sol stands; she steps aside to let him out, and he gives her the seat. She sits and her head goes to the glass. Sol takes the pole she held. From 54 his phone comes up into the left of the frame. Above, mirrored: the café after the open mic, wren on the riser packing her guitar.",
     [('mono', '5:14 pm, on the hinge')],
     "The ground's second half, Cm then A\u266d, a plucked bass and a strummed waltz: the film opens inside the round. The motor, a streetlight past the glass, the stop chime."),
    (2, '2400 to 7200', 'bars 3 to 6', 'sol to wren',
     "Over sol's shoulder, the phone up at the left: the composer, lit amber, dear wren. The words land a word at a time from 78. At 144 send anonymously; the screen says being read for two beats, then the letter is up and the count has become the day. The amber runs out of the phone, down the aisle and out of the windows into the street. At 180 sol looks up, and above, wren looks up from her case. The clock riffles 6, 7, 8, 9. At 204 the amber reaches the hinge; the café falls, right way up, and lands at 216.",
     [('px', 'dear wren / you hum when you think. i hope nobody ever tells you.'), ('serif', 'being read / it goes up once it passes.')],
     "Sol's voice enters, a clarinet: the tune, sol mi la. A soft key for each word; the café case's two latches above; the flood a run of dry ticks; the landing, one click."),
    (3, '7200 to 12000', 'bars 7 to 10', 'wren to pia',
     "Wren on the riser's edge, the spot's wedge falling beside her onto the stage, the front window behind her. Above, mirrored: the hospital roof, pia at the parapet with her tea. Her phone rises lit acid. An eighth of nothing before i was awake. Sent at 312; acid up the beam and across the room, the café gone dark and lime. Both look up at 324. The clock riffles 10, 11, 12, 1.",
     [('px', 'dear pia / you sang my grandad to sleep. i was awake.')],
     "Wren's voice, a harp: the tune an octave up, over sol's answer. The roof's wind above."),
    (4, '12000 to 16800', 'bars 11 to 14', 'pia to yuna',
     "The roof, at eye height over the parapet: the cloud lit from beneath in bands, the bay, the city as windows. Above: the bakery, yuna at the oven with the peel. Three eighths of nothing, then five words. Sent at 456: the ice crosses the parapet and the whole city takes it, the biggest flood in the film. Both look up at 468. The clock riffles 2, 3, 4, 5, 6, 7.",
     [('px', "dear yuna / i don't even like bread.")],
     "Pia's voice, a cello: the tune low, the harp's answer high, sol's walk between them. Wind; the oven's fan above."),
    (5, '16800 to 22800', 'bars 15 to 19', 'yuna to the one who always stands',
     "The bakery, the phone propped on the flour bin. Above, mirrored: the 51B in the seconds before bar 1, the woman swaying in the aisle, sol in the window seat. Yuna takes back dear a character a press and types to; the greeting takes a second row. Sent at 612, and the first sun comes through the window with the rose. At 624 she looks up into the beam, and above, a night earlier, sol looks up at the woman: their one meeting. At 648 the rose reaches the hinge and it catches, trembling on its pin. At 674 it lets go.",
     [('px', 'to the one who always stands / you give your seat to whoever looks most tired. last night it was me.')],
     "Yuna's voice, a horn, the tune: all four at once, the clarinet's long notes high over them. Bar 19 holds the dominant over a small ratchet, the harp trembling with the pane. The first birds."),
    (6, '22800 to 24000', 'bar 20', 'the contact sheet',
     "It lands on the contact sheet: for the first time the four worlds at once, two by two, each in its own colour, each writer's phone still lit with their letter. Nobody in them knows the others are there.",
     [('none', '')],
     "Home to E flat, all four together, with the clack."),
    (7, '24000 to 25200', 'bar 21', 'the cascade',
     "On each eighth, a frame or so early or late as a board's modules are, in the order the letters went up, one module flips, and where its world was stands its letter on the wall: the product's screen in that colour, the day, the greeting, the words, options and the heart, no cursor.",
     [('none', '')],
     "Each flip sounds its writer's note, B\u266d, G, C, F, the tune's own: the last chord built a note at a time."),
    (8, '25200 to 30000', 'bars 22 to 25', 'the wall, and round again',
     "Every letter on the wall is to somebody, set whole above the four at 756. At 774 the lockup and the address under them. At 888 the end card's top half lets go; on its back is the 51B, grey, the moment before bar 1. It lands on frame 0 and the clock's plates turn over to 5:14 pm. The file starts at 888, so its first frame is the wall.",
     [('px', 'every letter on the wall is to somebody.'), ('mono', 'celestual.us')],
     "The ground under the wall, the clarinet remembering the tune's head; a glockenspiel on the lockup; the last bar a breath before the landing."),
]

# the seven palettes as a table, from the app's own (round-product.js)
prod = (HERE / 'round-product.js').read_text()
PAL = json.loads(re.search(r'export const PALETTES = (\{.*?\n\})', prod, re.S).group(1))
tones = '\n'.join(
    f'            <tr><td>{n.replace("-", " / ")}</td>' + ''.join(f'<td class="notes"><span class="sw" style="background:{h}"></span>{h}</td>' for h in PAL[n]) + '</tr>'
    for n in PAL)

page = (HERE / 'src.html').read_text()
font = uri('../../../../app/public/fonts/jersey-10-normal-400-latin.woff2', 'font/woff2')
page = page.replace('<style>', "<style>\n  @font-face { font-family: 'Jersey 10'; font-style: normal; font-weight: 400; font-display: block; src: url(" + font + ") format('woff2'); }", 1)
js = (HERE / 'page.js').read_text().replace('%%MASKS%%', json.dumps(masks)).replace('%%ROUND%%', ROUND)
page = (page.replace('%%SHOTS_A%%', shots(A)).replace('%%SHOTS_ROUND%%', shots(R)).replace('%%TONES%%', tones)
        .replace('%%LOCKUP%%', svg).replace('%%SCRIPT%%', js))
assert '%%' not in page, re.findall(r'%%\w+%%', page)
if ART:
    ART.write_text(page)
# the repo's copy is a whole document, so it opens as itself from a folder;
# the artifact's is the page alone, which the publisher wraps
cut = page.index('</style>') + len('</style>')
OUT.write_text('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + page[:cut] + '\n</head>\n<body>\n' + page[cut:].lstrip('\n') + '\n</body>\n</html>\n')
bad = [l for l in page.split('\n') if re.search('[\u2014\u2013]', l)]
print('wrote', OUT, len(page), 'bytes; dashes:', len(bad))
