import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART_EXT, SLOTS } from '../src/content/art';
import { artIds, artOptional, slotOfDir } from '../tools/art/ids';
import { allBriefs } from '../tools/art/briefs';

// ── artwork slots ─────────────────────────────────────────────────────────
// Pictures dropped into src/art must carry a name the game looks for, or they
// would sit there unused. A missing picture is fine: the screens have fallbacks.

const ROOT = 'src/art';
const files = (): Array<{ dir: string; id: string; ext: string }> => {
  const out: Array<{ dir: string; id: string; ext: string }> = [];
  for (const d of readdirSync(ROOT)) {
    if (!statSync(join(ROOT, d)).isDirectory()) continue;
    for (const f of readdirSync(join(ROOT, d))) {
      const m = /^(.+)\.(\w+)$/.exec(f);
      if (m) out.push({ dir: d, id: m[1]!, ext: m[2]!.toLowerCase() });
    }
  }
  return out;
};

describe('artwork', () => {
  it('every file in src/art is in a slot folder, with an id the game uses, in a format the loader takes', () => {
    const ids = artIds(), opt = artOptional();
    for (const f of files()) {
      const slot = slotOfDir(f.dir);
      expect(slot, `src/art/${f.dir}: not a slot folder (${Object.values(SLOTS).map((s) => s.dir).join(', ')})`).toBeTruthy();
      expect([...ids[slot!], ...(opt[slot!] ?? [])], `src/art/${f.dir}/${f.id}: not an id the game uses`).toContain(f.id);
      expect(ART_EXT as readonly string[], `src/art/${f.dir}/${f.id}.${f.ext}: format`).toContain(f.ext);
    }
  });

  it('a brief exists for every id, with a size and a file name that match the slot', () => {
    const ids = artIds(), briefs = allBriefs();
    for (const [slot, list] of Object.entries(ids)) {
      const def = SLOTS[slot as keyof typeof SLOTS];
      for (const id of list) {
        const b = briefs.find((x) => x.slot === slot && x.id === id);
        expect(b, `${slot}/${id}: no brief`).toBeTruthy();
        expect(b!.file).toBe(`src/art/${def.dir}/${id}.webp`);
        expect(b!.size).toBe(`${def.w}×${def.h}`);
        expect(b!.prompt.length).toBeGreaterThan(300);
      }
    }
  });

  it('ids are unique within a slot', () => {
    for (const [slot, list] of Object.entries(artIds())) expect(new Set(list).size, slot).toBe(list.length);
  });
});
