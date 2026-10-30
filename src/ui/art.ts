import { ART_EXT, SLOTS, type SlotId } from '../content/art';

// ── artwork, found at build time ──────────────────────────────────────────
// Every file under src/art is picked up by the bundler, which hashes it and
// hands back its url. Nothing is fetched until a screen asks for it, and a
// picture that is not there is simply absent: the caller keeps its fallback.

const FILES = import.meta.glob('../art/*/*.{webp,avif,png,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const BY_KEY = new Map<string, string>();
const rank = (path: string) => ART_EXT.indexOf(path.slice(path.lastIndexOf('.') + 1).toLowerCase() as never);
// two formats of one picture: the earlier in ART_EXT wins
for (const [path, url] of Object.entries(FILES).sort((a, b) => rank(a[0]) - rank(b[0]))) {
  const m = /\/art\/([^/]+)\/([^/]+)\.\w+$/.exec(path);
  if (m && !BY_KEY.has(`${m[1]}/${m[2]}`)) BY_KEY.set(`${m[1]}/${m[2]}`, url);
}

/** The url of a picture for a slot and id, or null when there is none. */
export function artUrl(slot: SlotId, id: string): string | null {
  return BY_KEY.get(`${SLOTS[slot].dir}/${id}`) ?? null;
}

/** An <img> for the picture (decorative, so no alt), or null. */
export function artImg(slot: SlotId, id: string, cls = 'art'): HTMLImageElement | null {
  const url = artUrl(slot, id);
  if (!url) return null;
  const img = new Image();
  img.className = cls;
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  // a picture that fails to load leaves its slot empty rather than a broken-image mark
  img.addEventListener('error', () => img.remove(), { once: true });
  img.src = url;
  return img;
}

/** How many pictures the build found, for the dev panel and the tests. */
export const artCount = () => BY_KEY.size;
