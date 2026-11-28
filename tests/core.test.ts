import { describe, expect, it } from 'vitest';
import { SCRIPT } from '../src/content/script';
import { CORE_ROWS, CORE_FIRST, CORE_SHIPS } from '../src/content/script/core';
import { ADA, CORE_MET, STORY_CARDS, WAKE_BEAT } from '../src/content/story';
import type { CardDef } from '../src/sim/comms';

// ADA-1, the ship's Warden core (sentient-ship plan, owner 2026-11-27: https://claude.ai/artifact/HciUREW2H4EuAeg434Wp86).
// Her voice rules, held: 20 words a line, "I" in sentence case (never the Voice's capitals), "Juno" never "pilot", never a button.

const words = (s: string): number => s.replace(/[“”"·]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
/** Every line ADA-1 says: her script rows, her cards' radio, and the first relay's record. */
function herLines(): string[] {
  const out: string[] = [CORE_FIRST, CORE_SHIPS];
  for (const r of SCRIPT) if ('radio' in r.do && r.do.radio.caller === 'core') out.push(r.do.radio.text);
  for (const c of STORY_CARDS as CardDef[]) for (const ch of c.choices ?? []) for (const o of [ch.win, ch.lose])
    for (const rd of [o?.radio ?? []].flat()) if (rd.caller === 'core') out.push(...[rd.text].flat());
  return out;
}

describe('ADA-1, the Warden core', () => {
  it('speaks as herself: short, sentence case, Juno by name, never a button', () => {
    const lines = herLines();
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) {
      // (the owner's own lines at the first relay run longer, 28 November 2026)
      expect(words(l), l).toBeLessThanOrEqual(l === CORE_FIRST || l === CORE_SHIPS ? 30 : 20);
      // never the Voice's capitals (a word of four or more capitals)
      expect(/\b[A-Z]{4,}\b/.test(l.replace(/ADA-1|KRAIL/g, '')), l).toBe(false);
      expect(/\bpilot\b/i.test(l), l).toBe(false);
      expect(/\b(press|tap|click|key [A-Z])\b/i.test(l), l).toBe(false);
    }
  });

  it('every line of hers is under her name, on her own caller', () => {
    for (const r of SCRIPT) if ('radio' in r.do && r.do.radio.from === ADA) expect(r.do.radio.caller, r.id).toBe('core');
    for (const r of CORE_ROWS) if ('radio' in r.do) expect(r.do.radio.from, r.id).toBe(ADA);
  });

  it('wakes with one short card at Ringhold: hers, ochre, one answer, and the 94% left for the first relay', () => {
    const wake = STORY_CARDS.find((c) => c.id === WAKE_BEAT)!;
    expect(wake.caller).toBe('core');
    expect(wake.from).toBe(ADA);
    // the owner's own copy (28 November 2026), under the written-document cap
    // the owner's own copy (28 November 2026): it tells the why, so it runs longer than a document
    expect(words(wake.text)).toBeLessThan(160);
    expect(wake.choices).toHaveLength(1);
    const win = wake.choices[0]!.win!;
    expect(win.flag).toEqual(expect.arrayContaining(['archive_woke', CORE_MET]));
    expect(win.flag).not.toContain('clue_reserves');
    // she speaks first, then Sam
    const radio = [win.radio ?? []].flat();
    expect(radio.map((r) => r.caller)).toEqual(['core', 'core', 'miners']);
    expect(CORE_FIRST).toContain('Ninety-four');
  });

  it('a save that read the old letter gets her one-time card, and only that save', () => {
    const row = SCRIPT.find((r) => r.id === 'core_catchup')!;
    expect(row.stop).toBe('*');
    expect(row.if?.not).toContain(CORE_MET);
    const card = STORY_CARDS.find((c) => 'card' in row.do && c.id === row.do.card)!;
    expect(card.caller).toBe('core');
    expect(card.choices[0]!.win!.flag).toContain(CORE_MET);
  });
});
