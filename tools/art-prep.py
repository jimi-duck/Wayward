#!/usr/bin/env python3
"""Turn generated pictures into game-ready files.

    npm run art:prep -- <inbox folder>

Put the raw pictures from the image generator in a folder, named like the game
expects: `<slot folder>/<id>.<png|jpg|webp>` (for example `captains/vance.png`,
`emblems/custody.png`), or flat with the slot folder in the name:
`captains__vance.png`. For each one this crops to the slot's shape (from the
middle), resizes to the slot's size, turns the black of an emblem into
transparency, and writes `src/art/<slot folder>/<id>.webp`.

A ZIP of pictures named `captains__vance.png` works too.
A PDF in the folder works too: one picture per page, with a line of page text
`FILE: captains/vance` (docs/art/CHATGPT-BRIEF.md asks the generator for this).
The largest picture on each page is cut out; a page with no such line (a contact
sheet) is skipped.

Needs Pillow (`python3 -m pip install pillow`), and pypdf for PDFs. Sizes and ids are read from
docs/art/briefs.json, which `npm run art:brief` writes from the game's rows.
"""
import io, json, re, sys, zipfile
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit('This needs Pillow: python3 -m pip install pillow')

ROOT = Path(__file__).resolve().parent.parent
EXT = {'.png', '.jpg', '.jpeg', '.webp', '.avif'}
# Slots drawn from a mask or blended on black: the black of the picture is made see-through.
KEYED = {'emblems'}
QUALITY = {'emblems': 90, 'ships': 88, 'fleet': 88}
# Slots drawn on black with a screen blend: the whole picture is kept and padded, never cut.
CONTAIN = {'fleet'}
# Generated sheets leave a thin frame line at the edge: this share is cut off each side first.
TRIM = {'fleet': 0.055}
LEFT_TRIM: dict[str, float] = {}  # per picture, where a frame line sits further in than the usual trim
SMALL_TRIM = 0.07  # a picture under 800 px wide was cut from a sheet and carries a frame


def save(im, key, b):
    """Crop, size, key and write one picture. Returns the file written."""
    w, h = (int(n) for n in b['size'].split('×'))
    folder = key.split('/')[0]
    im = im.convert('RGBA' if folder in KEYED else 'RGB')
    t = TRIM.get(folder, SMALL_TRIM if folder == 'phenomena' and im.width < 800 else 0)
    if t:
        dx, dy = round(im.width * t), round(im.height * t)
        im = im.crop((max(dx, round(im.width * LEFT_TRIM.get(key, 0))), dy, im.width - dx, im.height - dy))
    if folder in CONTAIN:
        im = ImageOps.contain(im, (w, h), Image.LANCZOS)
        canvas = Image.new('RGB', (w, h), (0, 0, 0))
        canvas.paste(im, ((w - im.width) // 2, (h - im.height) // 2))
        im = canvas
    else:
        im = ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.5))
    if folder in KEYED:
        # white mark on black: the brightness becomes the opacity, the colour white
        g = im.convert('L')
        im = Image.merge('RGBA', (Image.new('L', im.size, 255),) * 3 + (g,))
    out = ROOT / 'src/art' / f'{key}.webp'
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, 'WEBP', quality=QUALITY.get(folder, 82), method=6)
    print(f'wrote  {out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024} KB')


def from_pdf(f, known):
    """Yield (key, image) for each captioned page of a PDF."""
    try:
        from pypdf import PdfReader
    except ImportError:
        sys.exit('PDFs need pypdf: python3 -m pip install pypdf')
    for n, page in enumerate(PdfReader(str(f)).pages, 1):
        m = re.search(r'FILE:\s*([a-z]+)\s*/\s*([A-Za-z0-9_-]+)', page.extract_text() or '')
        if not m:
            print(f'skip   {f.name} page {n}: no "FILE: folder/id" line')
            continue
        imgs = []
        for im in page.images:
            try:
                imgs.append(Image.open(io.BytesIO(im.data)))
            except Exception:
                pass
        if not imgs:
            print(f'skip   {f.name} page {n}: no picture on the page')
            continue
        yield f'{m.group(1)}/{m.group(2)}', max(imgs, key=lambda i: i.size[0] * i.size[1])


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    inbox = Path(sys.argv[1])
    briefs = json.loads((ROOT / 'docs/art/briefs.json').read_text())['briefs']
    known = {b['file'].removeprefix('src/art/').removesuffix('.webp'): b for b in briefs}
    done = bad = 0

    def take(key, im, name):
        nonlocal done, bad
        b = known.get(key)
        if not b:
            print(f'skip   {name}: no slot "{key}" (expected folder/id, for example captains/vance)')
            bad += 1
            return
        save(im, key, b)
        done += 1

    for f in sorted(inbox.rglob('*')):
        if f.suffix.lower() == '.pdf':
            for key, im in from_pdf(f, known):
                take(key, im, f'{f.name}')
        elif f.suffix.lower() == '.zip':
            with zipfile.ZipFile(f) as z:
                for name in sorted(z.namelist()):
                    p = Path(name)
                    if p.suffix.lower() in EXT and not p.name.startswith('.'):
                        parts = p.with_suffix('').parts
                        key = '/'.join(parts[-2:]) if len(parts) > 1 else parts[0].replace('__', '/', 1)
                        take(key, Image.open(io.BytesIO(z.read(name))), f'{f.name}:{name}')
        elif f.suffix.lower() in EXT:
            parts = f.relative_to(inbox).with_suffix('').parts
            key = '/'.join(parts[-2:]) if len(parts) > 1 else parts[0].replace('__', '/', 1)
            take(key, Image.open(f), f.name)
    print(f'{done} written, {bad} skipped')
    return 0 if not bad else 1


if __name__ == '__main__':
    sys.exit(main())
