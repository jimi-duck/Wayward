import { it } from 'vitest';
import { endSortie, newJourney, plot, sortieDef } from '../src/sim/journey';
import { World } from '../src/sim/world';
import { flyWorld, type Strategy } from './pilot';
import { planRoute } from './route';

// npm run pilot:lag: how long each radio line and notice waited on the floor (sim/floor.ts) between being made and being said, from the
// opening to Northfold. A line that waits long is said out of step with the game (owner, 28 November 2026).
const STRAT: Strategy = { kind: 'focus', branch: 'torpedo', second: 'defence' };
it('lag', () => {
  for (const seed of [5000, 5017, 5034]) {
    const j = newJourney(seed, false, 'road');
    for (let n = 0; n < 3 && j.status !== 'over'; n++) {
      if (j.status === 'chart') plot(j, planRoute(j));
      const def = sortieDef(j);
      const w = new World(seed * 31 + n * 7 + 1, { mode: 'breakout', sortie: def, carry: j.carry });
      flyWorld(w, seed * 31 + n, STRAT, { maxTime: 1500, breakout: true, policy: 'fight' });
      console.log(`== seed ${seed} sortie ${n} ${def.name}`);
      for (const l of w.floor.log) console.log(`${l.t.toFixed(1).padStart(6)} ${l.kind.padEnd(6)} wait=${(l.wait ?? 0).toFixed(1).padStart(5)} ${l.id}`);
      endSortie(j, w.result());
    }
  }
}, 600000);
