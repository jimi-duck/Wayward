import type { World } from '../src/sim/world';
import { PAINTED } from '../src/sim/postjump';

const STEP = 1 / 60;
const IDLE = { turn: 0, thrust: 0, aim: null, fire: false, torpedo: false, roll: false, brk: false, device: 'keyboard' } as const;

/**
 * Sam's friend in his own yard (owner 2026-11-05): after the code the hull is the company's until the ship goes into Ned's yard ring.
 * Put her 100 units off it so he is heard, then at the ring's edge, and let the autopilot do the work (owner 2026-11-06: it flies her to
 * the pad, the zaps run, the reboot sets the flags and it flies her out). Cards that open meanwhile are answered with `answer`.
 */
export function paintHull(w: World, answer: (w: World) => void = (x) => { x.answer(0); }, max = 60): number {
  const p = w.bk!.yard!;
  w.ship.x = p.x - 100; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
  const t0 = w.runTime;
  let inRing = false;
  for (let i = 0; i < Math.round(max / STEP) && !w.flags.has(PAINTED); i++) {
    if (w.phase === 'comms') { answer(w); if (w.phase === 'comms') break; continue; }
    w.ship.invuln = 1;
    // Ned is heard on the way in (a few seconds), then she is in the ring and the autopilot has her
    if (i <= 3 / STEP) { w.ship.x = p.x - 100; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0; }
    else if (!inRing) { inRing = true; w.ship.x = p.x - p.r * 0.8; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0; }
    w.step(STEP, IDLE);
    w.events.length = 0;
  }
  return w.runTime - t0;
}
