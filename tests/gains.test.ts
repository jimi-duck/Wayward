import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { CARD_BY_ID, choiceView, openCard, truthOdds, type Ctx } from '../src/sim/comms';
import { MAX_GAINS, gains } from '../src/sim/gains';
import { Rng } from '../src/sim/rng';

const ctx = (x: Partial<Ctx> = {}): Ctx => ({
  t: 300, heat: 0.3, cyrite: 10, need: 20, tank: 40, chits: 0, plates: 3, maxPlates: 3,
  levels: {}, flags: new Set(), standing: {}, place: 'open', hostiles: 0, supplies: 12, kind: 'home', netted: true, behind: Infinity, ...x,
});

describe('what a choice brings', () => {
  it('fits on a line for every card', () => {
    for (const c of CARDS) for (const ch of c.choices) expect(gains(ch.win, ctx(), 40).length, `${c.id}.${ch.id}`).toBeLessThanOrEqual(MAX_GAINS);
  });

  it('says where the lane mouth leaves you', () => {
    const cp = CARD_BY_ID.checkpoint!;
    const of = (id: string) => gains(cp.choices.find((c) => c.id === id)!.win, ctx(), 40);
    expect(of('talk')).toContain('Through the lane');
    expect(of('fight')).toContain('Fight');
    expect(of('run')).toContain('Run the blockade');
  });

  it('marks losses with a minus, like a cost', () => {
    expect(gains({ text: '', chits: -10, plates: -1 }, ctx(), 0)).toEqual(['−2 Cyrite', '−1 hull']);
  });
});

describe('the read as odds', () => {
  const tug = CARD_BY_ID.distress_tug!;
  const go = tug.choices.find((c) => c.loseIf?.length)!;

  it('sums to one over the truths', () => {
    const p = truthOdds(tug, ctx(), tug.truths![0]!.id, 0.65);
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('turns a read of trouble into worse odds, more so with better sensors', () => {
    const bad = go.loseIf![0]!, good = tug.truths!.find((t) => !go.loseIf!.includes(t.id))!.id;
    const at = (shown: string, sure: number) => choiceView(go, tug, ctx(), 0, { shown, sure }).chance!;
    expect(at(bad, 0.65)).toBeLessThan(at(good, 0.65));
    expect(at(bad, 0.95)).toBeLessThan(at(bad, 0.65));
    expect(at(good, 0.95)).toBeGreaterThan(at(good, 0.65));
  });

  it('gives every gamble on a card a chance, and nothing else one', () => {
    for (const def of CARDS) {
      const o = openCard(def, ctx({ chits: 999, cyrite: 30 }), new Rng(3));
      for (const v of o.choices) {
        const ch = def.choices.find((c) => c.id === v.id)!;
        expect(v.chance !== null, `${def.id}.${ch.id}`).toBe(!!ch.odds || v.risky);
        if (v.chance !== null) expect(v.chance).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
