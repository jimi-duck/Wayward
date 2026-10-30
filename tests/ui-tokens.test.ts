import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool, no types
import { uiTokensCss } from '../tools/make-ui-tokens.mjs';

const json = JSON.parse(readFileSync('brand/system/tokens.json', 'utf8'));
const tokens: { name: string; value: string }[] = json.ui.tokens;
const styles = readdirSync('src/styles').filter((f) => f.endsWith('.css') && f !== 'tokens.css' && f !== 'neon-frames.css');
const outsideDataUrls = (css: string) => css.replace(/url\("data:[^"]*"\)/g, '');

describe('UI colour tokens', () => {
  it('tokens.css is generated from tokens.json (run npm run tokens)', () => {
    expect(readFileSync('src/styles/tokens.css', 'utf8')).toBe(uiTokensCss(json));
  });

  it('keeps the brand v1.1 roles: steel blue hand, teal information, dull gold caution, red threat', () => {
    const v = Object.fromEntries(tokens.map((t) => [t.name, t.value]));
    expect(v.blue).toBe('#86A9D1');
    expect(v.teal).toBe('#39AEB7');
    expect(v.caution).toBe('#C9AB66');
    expect(v['alert-red']).toBe('#C94A3F');
  });

  it('styles use the tokens instead of repeating a token colour', () => {
    const rgbs = new Set(tokens.map((t) => [1, 3, 5].map((i) => parseInt(t.value.slice(i, i + 2), 16)).join(',')));
    const hexes = new Set(tokens.map((t) => t.value.toLowerCase()));
    for (const f of styles) {
      const css = outsideDataUrls(readFileSync(`src/styles/${f}`, 'utf8'));
      for (const m of css.matchAll(/#[0-9a-fA-F]{6}\b/g)) expect(hexes.has(m[0].toLowerCase()), `${f}: ${m[0]}`).toBe(false);
      for (const m of css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) expect(rgbs.has(`${m[1]},${m[2]},${m[3]}`), `${f}: ${m[0]}`).toBe(false);
    }
  });

  it('src/ui takes its colours from the tokens (face.ts draws portraits and is left out)', () => {
    for (const f of readdirSync('src/ui').filter((f) => f.endsWith('.ts') && f !== 'face.ts')) {
      const ts = readFileSync(`src/ui/${f}`, 'utf8');
      expect(ts.match(/#[0-9a-fA-F]{6}\b|rgba?\(\s*\d/g) ?? [], f).toEqual([]);
    }
  });
});
