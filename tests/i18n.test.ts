import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DE, KEEP } from '../src/i18n/de';
import { loadDe, num, plural, setLang, t } from '../src/i18n';
import { scanPage, scanSource } from './i18n-scan';
import { HOLDER_NAMES } from '../src/content/systems';

// Every line the player can see has a German one (or is a name, the same in
// both). New text without German fails here, with the list of what is missing.

const holes = (strings: Iterable<string>) => [...strings].filter((s) => DE[s] === undefined && !KEEP.has(s));
const slots = (s: string) => [...s.matchAll(/\{(\w+|#)\}/g)].map((m) => m[1]).sort();

describe('German', () => {
  beforeAll(loadDe);
  afterEach(() => setLang('en', false));

  it('covers every line of text in the code', () => {
    const src = scanSource();
    const missing = holes(src.keys()).map((s) => `${src.get(s)}: ${JSON.stringify(s)}`);
    expect(missing, `${missing.length} lines have no German:\n${missing.join('\n')}`).toEqual([]);
  });

  it('covers the page', () => {
    const missing = holes(scanPage());
    expect(missing, `${missing.length} lines have no German:\n${missing.join('\n')}`).toEqual([]);
  });

  it('covers the lower-case words the scan skips', () => {
    // the scan leaves single lower-case words out; these tables are shown through t()
    expect(holes(Object.values(HOLDER_NAMES))).toEqual([]);
  });

  it('keeps every placeholder', () => {
    const bad = Object.entries(DE).filter(([en, de]) => slots(en).join() !== slots(de).join()).map(([en, de]) => `${en} → ${de}`);
    expect(bad).toEqual([]);
  });

  it('says du, never Sie', () => {
    // a capital Sie or Ihnen mid-sentence is the formal you (sie, she, is lower case there)
    expect(Object.values(DE).filter((de) => /[a-zäöüß,] (Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer)\b/.test(de))).toEqual([]);
  });

  it('looks up, fills and falls back', () => {
    setLang('de', false);
    expect(t('Break out')).toBe(DE['Break out']);
    expect(t('Not a line anyone wrote')).toBe('Not a line anyone wrote');
    expect(t('Bound for {dest}', { dest: 'Cerro' })).toContain('Cerro');
    expect(t('+60 chits')).toBe(DE['+{#} chits']!.replace('{#}', '60'));
    expect(plural(1, '{n} wreck', '{n} wrecks')).toBe(DE['{n} wreck']!.replace('{n}', '1'));
    expect(num(12345)).toBe('12.345');
    setLang('en', false);
    expect(t('Break out')).toBe('Break out');
    expect(num(12345)).toBe('12,345');
  });
});
