"""Weigh a poster: where its visual weight sits and how it balances.

    python3 poster-judge.py <out dir> [--ground mean] <poster.png> [poster.png ...]

For each poster, a sheet of diagnostics (the poster with its module grid and
its weight's centre against the optical centre; the squint; the 3:4 crop the
profile grid shows; the thumbnail at a third) and a line of measures, also
written to <out dir>/measures.json. Needs numpy and Pillow.

Weight is what pulls the eye: a pixel's lightness contrast with the ground,
raised by its chroma (a saturated colour outweighs a grey of the same
lightness), read after a squint (a blur of about a twentieth of the width),
as a designer half closes their eyes. The ground is the room's black, for
posters laid on it; `--ground mean` takes the poster's own mean lightness
instead, for posters that are light in places, so that what pulls is what
differs from the whole, dark or light.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

GROUND = (10, 10, 10)
OPTICAL = (0.5, 0.46)  # the optical centre, a little above the middle


def lab(rgb):
    """sRGB 0..255 to CIE L*a*b* (D65)."""
    c = rgb / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    L = 116 * f[..., 1] - 16
    a = 500 * (f[..., 0] - f[..., 1])
    b = 200 * (f[..., 1] - f[..., 2])
    return L, a, b


def weigh(path, ground='black'):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    # measured at 270 px wide: a squint does not need every pixel
    small = im.resize((270, round(270 * H / W)), Image.BOX)
    rgb = np.asarray(small).astype(np.float64)
    L, a, b = lab(rgb)
    L0 = L.mean() if ground == 'mean' else lab(np.array(GROUND, dtype=np.float64))[0]
    chroma = np.hypot(a, b)
    w = np.abs(L - L0) / 100 * (1 + 0.8 * np.clip(chroma / 50, 0, 1))
    wi = Image.fromarray(np.uint8(np.clip(w / max(w.max(), 1e-9), 0, 1) * 255))
    sq = np.asarray(wi.filter(ImageFilter.GaussianBlur(270 / 20))).astype(np.float64) / 255
    h, wd = w.shape
    ys, xs = np.mgrid[0:h, 0:wd]
    tot = w.sum()
    cx = float((w * xs).sum() / tot / (wd - 1))
    cy = float((w * ys).sum() / tot / (h - 1))
    left = float(w[:, : wd // 2].sum() / tot)
    top = float(w[: h // 2].sum() / tot)
    thirds = [[round(float(w[i * h // 3:(i + 1) * h // 3, j * wd // 3:(j + 1) * wd // 3].sum() / tot), 3) for j in range(3)] for i in range(3)]
    spread = float(np.sqrt((w * ((xs / wd - cx) ** 2 + (ys / h - cy) ** 2)).sum() / tot))
    # bright things: saturated, light regions after the squint, counted as blobs
    bright = (chroma > 25) & (L > 45)
    bi = Image.fromarray(np.uint8(bright * 255)).filter(ImageFilter.GaussianBlur(3))
    bm = np.asarray(bi) > 90
    blobs = label_sizes(bm)
    off = float(np.hypot(cx - OPTICAL[0], cy - OPTICAL[1]))
    return im, sq, {
        'centre': [round(cx, 3), round(cy, 3)], 'from_optical': round(off, 3),
        'left_share': round(left, 3), 'top_share': round(top, 3),
        'thirds': thirds, 'spread': round(spread, 3),
        'bright_things': blobs[:4], 'ink': round(float(tot / w.size), 3),
    }, (cx, cy)


def label_sizes(mask):
    """Areas of connected regions, largest first, as shares of the frame."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    sizes = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                stack = [(y, x)]
                seen[y, x] = True
                n = 0
                while stack:
                    j, i = stack.pop()
                    n += 1
                    for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        jj, ii = j + dj, i + di
                        if 0 <= jj < h and 0 <= ii < w and mask[jj, ii] and not seen[jj, ii]:
                            seen[jj, ii] = True
                            stack.append((jj, ii))
                sizes.append(n)
    sizes.sort(reverse=True)
    return [round(s / (h * w), 3) for s in sizes if s / (h * w) > 0.002]


def sheet(im, sq, centre, name):
    """The poster with its grid and centres, the squint, the 3:4 crop, the thumbnail."""
    W, H = im.size
    k = 540 / W
    a = im.resize((540, round(H * k)), Image.LANCZOS)
    d = ImageDraw.Draw(a, 'RGBA')
    m = 90 * 540 / 1080
    for i in range(13):
        d.line([(i * m, 0), (i * m, a.height)], fill=(0, 200, 255, 40))
    for j in range(16):
        d.line([(0, j * m), (a.width, j * m)], fill=(0, 200, 255, 40))
    d.rectangle([m, m, a.width - m, a.height - m], outline=(0, 200, 255, 140))
    for t in (1 / 3, 2 / 3):
        d.line([(a.width * t, 0), (a.width * t, a.height)], fill=(255, 200, 0, 60))
        d.line([(0, a.height * t), (a.width, a.height * t)], fill=(255, 200, 0, 60))
    ox, oy = OPTICAL[0] * a.width, OPTICAL[1] * a.height
    d.ellipse([ox - 7, oy - 7, ox + 7, oy + 7], outline=(255, 255, 255, 230), width=2)
    cx, cy = centre[0] * a.width, centre[1] * a.height
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(255, 60, 60, 230))
    s = Image.fromarray(np.uint8(np.clip(sq / max(sq.max(), 1e-9), 0, 1) * 255)).resize(a.size, Image.BICUBIC).convert('RGB')
    ds = ImageDraw.Draw(s)
    ds.ellipse([ox - 7, oy - 7, ox + 7, oy + 7], outline=(255, 255, 255), width=2)
    ds.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(255, 60, 60))
    # the profile grid's 3:4, from the middle
    cw = round(H * 3 / 4)
    crop = im.crop(((W - cw) // 2, 0, (W - cw) // 2 + cw, H)).resize((round(a.height * 3 / 4), a.height), Image.LANCZOS)
    thumb = im.resize((180, 225), Image.LANCZOS)
    out = Image.new('RGB', (a.width * 2 + crop.width + 180 + 50, a.height + 40), (34, 34, 34))
    out.paste(a, (10, 30))
    out.paste(s, (a.width + 20, 30))
    out.paste(crop, (a.width * 2 + 30, 30))
    out.paste(thumb, (a.width * 2 + crop.width + 40, 30))
    ImageDraw.Draw(out).text((10, 8), f'{name}: grid, thirds, optical centre (ring), weight centre (dot); squint; 3:4 crop; a third', fill=(220, 220, 220))
    return out


def main():
    args = sys.argv[1:]
    ground = 'black'
    if '--ground' in args:
        i = args.index('--ground')
        ground = args[i + 1]
        del args[i:i + 2]
    out = Path(args[0])
    out.mkdir(parents=True, exist_ok=True)
    measures = {}
    for p in args[1:]:
        name = Path(p).stem
        im, sq, m, centre = weigh(p, ground)
        measures[name] = m
        sheet(im, sq, centre, name).save(out / f'{name}-weigh.png')
        print(name, json.dumps(m))
    (out / 'measures.json').write_text(json.dumps(measures, indent=1))


if __name__ == '__main__':
    main()
