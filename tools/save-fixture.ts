import { writeFileSync } from 'node:fs';
import { newRun } from '../src/sim/run';
import { endSortie, newJourney, VERSION } from '../src/sim/journey';

// Writes tests/fixtures/journey-v<VERSION>.json: a journey out of Cerro and onto the chart, as the
// current game saves it. Run it once when VERSION is bumped: `npx vite-node tools/save-fixture.ts`.

const j = newJourney(7);
const run = newRun(1);
run.escaped = true;
endSortie(j, {
  ended: 'jumped', time: 180, carry: { ...j.carry, cyrite: 20, food: 12, parts: 6, plates: 3 }, run,
  calloway: false, callowayBeaten: false, huntDelay: 0, stall: 0, captain: null, notice: {},
});
writeFileSync(new URL(`../tests/fixtures/journey-v${VERSION}.json`, import.meta.url), JSON.stringify(j));
