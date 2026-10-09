#!/usr/bin/env python3
"""Turn generated pictures into game-ready files.

    npm run art:prep -- <inbox folder>

Put the raw pictures from the image generator in a folder, named like the game
expects: `<slot folder>/<id>.<png|jpg|webp>` (for example `captains/vance.png`,
`emblems/custody.png`), or flat with the slot folder in the name:
`captains__vance.png`. For each one this crops to the slot's shape (from the
middle), resizes to the slot's size, turns the black of an emblem into
transparency, and writes `src/art/<slot folder>/<id>.webp`.

Needs Pillow (`python3 -m pip install pillow`). Sizes and ids are read from
docs/art/briefs.json, which `npm run art:brief` writes from the game's rows.
"""
import json, sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit('This needs Pillow: python3 -m pip install pillow')

ROOT = Path(__file__).resolve().parent.parent
EXT = {'.png', '.jpg', '.jpeg', '.webp', '.avif'}
# Slots drawn from a mask or blended on black: the black of the picture is made see-through.
KEYED = {'emblems'}
QUALITY = {'emblems': 90, 'ships': 88}


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    inbox = Path(sys.argv[1])
    briefs = json.loads((ROOT / 'docs/art/briefs.json').read_text())['briefs']
    known = {b['file'].removeprefix('src/art/').removesuffix('.webp'): b for b in briefs}
    done = bad = 0
    for f in sorted(inbox.rglob('*')):
        if f.suffix.lower() not in EXT:
            continue
        parts = f.relative_to(inbox).with_suffix('').parts
        key = '/'.join(parts[-2:]) if len(parts) > 1 else parts[0].replace('__', '/', 1)
        b = known.get(key)
        if not b:
            print(f'skip   {f.name}: no slot "{key}" (expected folder/id, for example captains/vance)')
            bad += 1
            continue
        w, h = (int(n) for n in b['size'].split('×'))
        folder = key.split('/')[0]
        im = Image.open(f).convert('RGBA' if folder in KEYED else 'RGB')
        im = ImageOps.fit(im, (w, h), Image.LANCZOS, centering=(0.5, 0.5))
        if folder in KEYED:
            # white mark on black: the brightness becomes the opacity, the colour white
            g = im.convert('L')
            im = Image.merge('RGBA', (Image.new('L', im.size, 255),) * 3 + (g,))
        out = ROOT / 'src/art' / f'{key}.webp'
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, 'WEBP', quality=QUALITY.get(folder, 82), method=6)
        print(f'wrote  {out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024} KB')
        done += 1
    print(f'{done} written, {bad} skipped')
    return 0 if not bad else 1


if __name__ == '__main__':
    sys.exit(main())
