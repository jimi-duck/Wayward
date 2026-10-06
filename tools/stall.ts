import { netted, sysById } from '../src/sim/chart';
import { endSortie, hearNews, newJourney, plot, replot, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { flyWorld, type Policy, type Strategy } from './pilot';
import { planRoute } from './route';

// Finds where a long journey stalls: flies one until a sortie runs out the pilot's clock, then says where and why.
// `JOURNEY_SEED=3000 JOURNEY_POLICY=run npx vite-node tools/stall.ts`

const seed = Number(process.env.JOURNEY_SEED ?? 3000);
const policy = (process.env.JOURNEY_POLICY ?? 'run') as Policy;
const strat: Strategy = { kind: 'random' };
const j = newJourney(seed, false, 'eight');
for (let n = 0; n < 140 && j.status !== 'over'; n++) {
  if (j.status === 'chart') plot(j, planRoute(j));
  const def = sortieDef(j);
  const w = new World(seed * 31 + n * 7 + 1, { mode: 'breakout', sortie: def, carry: j.carry });
  const onDock = (w: World) => {
    if (w.carry().flags.includes('news')) hearNews(j);
    const r = replot(j, planRoute(j, w.carry()));
    if (r && j.dest !== def.dest) w.replot(r.dest, r.jumpCost);
  };
  const res = flyWorld(w, seed * 31 + n, strat, { maxTime: 1200, breakout: true, policy, onDock });
  void res;
  if (w.phase !== 'over') {
    const s = sysById(j.chart, def.system);
    console.log('STALL at system', n + 1, def.name, s.kind, 'region', s.region, 'holder', s.holder, 'cyrite', s.cyrite, 'quiet', !!s.quiet, 'netted', netted(j.chart, s.id));
    console.log('jumpCost', def.jumpCost, 'cyrite aboard', w.cyrite, 'rich', def.rich, 'density', def.density, 'port', !!def.port, 'food', w.carry().food, 'time', w.runTime, 'phase', w.phase);
    break;
  }
  endSortie(j, w.result());
}
console.log('done', j.legs.length, j.status, j.end);
