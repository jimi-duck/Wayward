import type { World } from '../src/sim/world';
import { PAINTED } from '../src/sim/postjump';
import { OPENING_AT } from '../src/content/story';
import { STARVED } from '../src/sim/uplink';

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

/** The first system past Cerro, from arrival to the breach card (OPENING_AT in). Flies `input` until then. */
export function toBreach(w: World, input: Parameters<World['step']>[1] = IDLE, max = OPENING_AT + 5): number {
  const t0 = w.runTime;
  for (let i = 0; i < Math.round(max / STEP) && w.phase === 'play'; i++) { w.ship.invuln = 1; w.step(STEP, input); }
  return w.runTime - t0;
}

/** Fly to the stop's story place, if one waits (sim/places.ts): put her at its centre, still, as a player holding there would be. */
export function atPlace(w: World): boolean {
  const p = w.storyPlace;
  if (!p) return false;
  w.ship.x = p.x; w.ship.z = p.z; w.ship.vx = w.ship.vz = 0;
  return true;
}

/**
 * A relay she wakes herself (sim/uplink.ts): park her in its ring, as a player would, with what a twist puts in the way gone: a
 * buried mast's rock mined away, a guarded mast's picket driven off, a hungry one's tank filled. True while there is a relay to wake.
 */
export function atRelay(w: World): boolean {
  // (once awake, the key is told within reach of the mast: she stays by it)
  const rl = w.wakeRelay ?? w.gateRelay;
  if (!rl) return false;
  w.ship.x = rl.x - 20; w.ship.z = rl.z; w.ship.vx = w.ship.vz = 0;
  const f = w.field;
  for (let i = f.bulwarks.length - 1; i >= 0; i--) if (Math.hypot(f.bulwarks[i]!.x - rl.x, f.bulwarks[i]!.z - rl.z) < 1) f.bulwarks.splice(i, 1);
  for (let i = w.aliens.length - 1; i >= 0; i--) if (!w.aliens[i]!.ward && Math.hypot(w.aliens[i]!.x - rl.x, w.aliens[i]!.z - rl.z) < 120) w.aliens.splice(i, 1);
  // a hungry relay's starved core: she has mined to feed it
  if (w.uplinkBlock === STARVED) w.fuel = Math.max(w.fuel, 20);
  return true;
}
