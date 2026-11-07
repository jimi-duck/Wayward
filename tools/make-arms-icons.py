"""Draws the bay's mask icons for the arms-and-reactor pass (white on clear, 128px, like the rest of public/icons/node).
Stand-ins until the owner's own art arrives: run `python3 tools/make-arms-icons.py` to redraw them."""
import math
from PIL import Image, ImageDraw

S = 4  # supersample
W = 128 * S


def canvas():
    im = Image.new('L', (W, W), 0)
    return im, ImageDraw.Draw(im)


def P(x, y):
    return (x * S, y * S)


def line(d, pts, w=6):
    d.line([P(*p) for p in pts], fill=255, width=int(w * S), joint='curve')


def dot(d, x, y, r):
    d.ellipse([P(x - r, y - r), P(x + r, y + r)], fill=255)


def ring(d, x, y, r, w=5):
    d.ellipse([P(x - r, y - r), P(x + r, y + r)], outline=255, width=int(w * S))


def arc(d, x, y, r, a0, a1, w=5):
    d.arc([P(x - r, y - r), P(x + r, y + r)], a0, a1, fill=255, width=int(w * S))


def poly(d, pts):
    d.polygon([P(*p) for p in pts], fill=255)


def save(name, im):
    im = im.resize((128, 128), Image.LANCZOS)
    out = Image.new('LA', (128, 128), (255, 0))
    out.putalpha(im)
    out.save(f'public/icons/node/{name}.png')


def chain(n):
    im, d = canvas()
    xs = [24 + i * (80 / (n - 1)) for i in range(n)]
    ys = [92 - i * (56 / (n - 1)) for i in range(n)]
    line(d, list(zip(xs, ys)), 5)
    for x, y in zip(xs, ys):
        dot(d, x, y, 10)
    d.ellipse([P(xs[0] - 4, ys[0] - 4), P(xs[0] + 4, ys[0] + 4)], fill=0)
    return im


def well():
    im, d = canvas()
    dot(d, 64, 64, 8)
    for r in (22, 38, 54):
        arc(d, 64, 64, r, 20, 330, 5)
    for a in (45, 165, 285):
        x, y = 64 + math.cos(math.radians(a)) * 54, 64 + math.sin(math.radians(a)) * 54
        x2, y2 = 64 + math.cos(math.radians(a)) * 34, 64 + math.sin(math.radians(a)) * 34
        line(d, [(x, y), (x2, y2)], 5)
    return im


def ship(d, x, y, s=1.0):
    poly(d, [(x + 14 * s, y), (x - 10 * s, y - 10 * s), (x - 5 * s, y), (x - 10 * s, y + 10 * s)])


def deflector(extra=False):
    im, d = canvas()
    ship(d, 76, 64, 1.3)
    for k, (cx, cy) in enumerate([(36, 36), (30, 92), (20, 64)]):
        ring(d, cx, cy, 11 if k < 2 else 8, 5)
    for sgn in (-1, 1):
        line(d, [(50, 64 + sgn * 6), (92, 64 + sgn * 34)], 5)
    if extra:
        for i in range(3):
            a = math.radians(-35 + i * 35)
            line(d, [(100 + math.cos(a) * 6, 64 + math.sin(a) * 6), (100 + math.cos(a) * 22, 64 + math.sin(a) * 22)], 5)
    return im


def bow():
    im, d = canvas()
    ship(d, 88, 64, 1.1)
    for r in (22, 36, 50):
        arc(d, 100, 64, r, 130, 230, 5)
    for a in (-40, 0, 40):
        x, y = 40 + math.cos(math.radians(a)) * 6, 64 + math.sin(math.radians(a)) * 6
        line(d, [(x, y), (x - 14, y + math.sin(math.radians(a)) * 14)], 4)
    return im


def flak(more=False):
    im, d = canvas()
    ring(d, 64, 64, 30, 5)
    line(d, [(64, 24), (64, 44)], 5); line(d, [(64, 84), (64, 104)], 5)
    line(d, [(24, 64), (44, 64)], 5); line(d, [(84, 64), (104, 64)], 5)
    dot(d, 64, 64, 5)
    poly(d, [(100, 18), (112, 22), (104, 32)])
    if more:
        ring(d, 64, 64, 48, 4)
    return im


def flux():
    im, d = canvas()
    poly(d, [(70, 14), (36, 70), (60, 70), (50, 114), (92, 54), (66, 54)])
    for y in (34, 64, 94):
        line(d, [(10, y), (30, y)], 4)
    return im


def flush():
    im, d = canvas()
    arc(d, 64, 64, 40, 30, 300, 6)
    poly(d, [(104, 40), (112, 70), (82, 62)])
    poly(d, [(64, 38), (80, 68), (64, 84), (48, 68)])
    return im


def surge():
    im, d = canvas()
    for i, y in enumerate((96, 66, 36)):
        w = 36 - i * 4
        line(d, [(64 - w, y + 14), (64, y - 4), (64 + w, y + 14)], 7)
    dot(d, 64, 112, 5)
    return im


for name, im in {
    'ph_chain': chain(3), 'ph_chain_link': chain(4), 'tp_well': well(), 'mo_deflector': deflector(), 'mo_bow': bow(),
    'df_flak': flak(), 'df_flak_rate': flak(True), 'rx_flux': flux(), 'rx_flush': flush(), 'rx_surge': surge(),
}.items():
    save(name, im)
