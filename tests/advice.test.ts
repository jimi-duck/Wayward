import { describe, expect, it } from 'vitest';
import { UPGRADES } from '../src/content/upgrades';
import { NODE, WEB } from '../src/content/web';
import { reasonOf, type AdviceCtx } from '../src/sim/advice';
import { install, stockLevels, type BayCtx } from '../src/sim/bay';
import { profileOf } from '../src/sim/profile';

const ALL = new Set(UPGRADES.map((u) => u.id));
const bctx = (levels: Record<string, number>): BayCtx => ({ levels, unlocked: ALL, techs: new Set(), arcade: true, krail: 1e9 });
const ctx = (o: Partial<AdviceCtx> = {}): AdviceCtx => ({ levels: stockLevels(), plates: 3, maxPlates: 3, pressure: 0, ...o });

/** Fit a module n levels, ignoring cost. */
function fit(levels: Record<string, number>, id: string, n: number): Record<string, number> {
  let l = levels;
  for (let i = 0; i < n; i++) { const r = install(id, bctx(l)); if (typeof r === 'string') break; l = r.levels; }
  return l;
}

describe('the ship\'s computer', () => {
  it('says nothing about a stock ship in a calm sky', () => {
    for (const w of WEB) expect(reasonOf(w.id, ctx())).toBeNull();
  });

  it('recommends the reactor core when power is full, and heat exchangers when hot', () => {
    let l = stockLevels();
    for (let i = 0; i < 40 && !reasonOf('rx_core', ctx({ levels: l })); i++) {
      const next = WEB.find((n) => !NODE[n.id]!.gives && typeof install(n.id, bctx(l)) !== 'string' && (NODE[n.id]!.draw.power ?? 0) > 0);
      if (!next) break;
      l = fit(l, next.id, 1);
    }
    expect(reasonOf('rx_core', ctx({ levels: l }))?.text).toBe('Power running short');
  });

  it('recommends defence when the plates are worn, and close work under pressure', () => {
    const guard = UPGRADES.find((u) => u.branch === 'defence')!, close = UPGRADES.find((u) => u.branch === 'close')!;
    expect(reasonOf(guard.id, ctx({ plates: 1 }))?.text).toBe('Plates down to {n}/{max}');
    expect(reasonOf(close.id, ctx({ pressure: 4 }))?.text).toBe('Hostiles pressing close');
    expect(reasonOf(close.id, ctx({ pressure: 1 }))).toBeNull();
  });
});

describe('the build profile', () => {
  it('names a stock ship, and a build by its deepest way to fight', () => {
    expect(profileOf(stockLevels()).name).toBe('Stock hauler');
    const torp = UPGRADES.filter((u) => u.branch === 'torpedo' && u.kind === 'stat');
    let l = stockLevels();
    for (const u of torp) l = fit(l, u.id, 3);
    const p = profileOf(l);
    expect(p.name).toBe('Bombardier');
    expect(p.axes.ordnance).toBe(1);
    expect(p.lines.length).toBeGreaterThan(0);
    expect(p.lines.length).toBeLessThanOrEqual(3);
  });
});
