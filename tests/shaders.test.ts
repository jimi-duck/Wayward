import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

// GLSL's pow(x, y) is undefined for x < 0, and on a real GPU it is NaN. One NaN pixel in the HDR buffer is smeared by the
// bloom across the whole frame, which is the flat grey screen seen at the Jump Gate (docs/POSTJUMP.md, "The whiteout").
// So a pow whose base can go negative must clamp it, or be written as a product.

const GUARD = /clamp\(|max\(|abs\(|smoothstep\(|saturate\(/;
const FILES = readdirSync('src/render').filter((f) => f.endsWith('.ts'));

/** The first argument of each GLSL pow( in a source text (the JS Math.pow is not GLSL). */
function bases(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?<![\w.])pow\(/g)) {
    let depth = 1, i = m.index! + m[0].length;
    const start = i;
    for (; i < src.length && depth > 0; i++) {
      const c = src[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 1) break;
    }
    out.push(src.slice(start, i).trim());
  }
  return out;
}

describe('the shaders', () => {
  it('never take pow of something that can be negative', () => {
    const bad: string[] = [];
    for (const f of FILES) for (const b of bases(readFileSync(`src/render/${f}`, 'utf8'))) if (b.includes('-') && !GUARD.test(b)) bad.push(`${f}: pow(${b}, …)`);
    expect(bad).toEqual([]);
  });
});
