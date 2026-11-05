import type { World } from '../src/sim/world';
import { PAINTED } from '../src/sim/postjump';

const STEP = 1 / 60;
const IDLE = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/**
 * Sam's friend at the depot (owner 2026-11-05): after the code the hull is grey until the ship comes up on the Frontier Supply
 * Depot. Put her 100 units off it, at rest, and let Ned speak and the paint go on. Cards that open meanwhile are answered with `answer`.
 */
export function paintHull(w: World, answer: (w: World) => void = (x) => { x.answer(0); }, max = 60): number {
  const p = w.bk!.port!;
  w.ship.x = p.x - 100; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
  const t0 = w.runTime;
  for (let i = 0; i < Math.round(max / STEP) && !(w.flags.has(PAINTED) && !w.bay); i++) {
    if (w.phase === 'comms') { answer(w); if (w.phase === 'comms') break; continue; }
    w.ship.invuln = 1;
    // until his cut scene takes her (sim/paintbay.ts), she sits where she was put
    if (!w.bay && !w.flags.has(PAINTED)) { w.ship.x = Math.min(w.ship.x, p.x - 60); w.ship.vx = w.ship.vz = 0; }
    w.step(STEP, IDLE);
    w.events.length = 0;
  }
  return w.runTime - t0;
}
