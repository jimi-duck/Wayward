import type { World } from './world';
import { t } from '../i18n';

// ── the raider den ────────────────────────────────────────────────────────
// A hideout in a mining system's rock field, well off the course. It is dark
// until you are close (or until it has shot at you). Wake it and it launches
// raiders in waves from its dock; shoot it and it sends a wing round your
// flank; crush it once and it slips away to a second den. Raid it dead for
// loot. Rock round it is cover, as everywhere (enemy fire stops on rock).
// Plain data and the world's own spawner (docs/SITES.md).

/** Its hull, the hits it can take (a bolt is ~1, a torpedo 30). */
export const DEN_HP = 45;
/** Its hull radius (units). */
export const DEN_R = 12;
/** How near the ship must be to see it on the scope and in the dark (units), and to wake it. */
export const DEN_SEE_R = 140;
export const DEN_WAKE_R = 220;
/** Seconds between waves, the most it launches before it is dry, the most its raiders alive at once, and the hulls in a wave. */
export const DEN_EVERY = 30;
export const DEN_WAVES = 4;
export const DEN_ALIVE = 2;
/** Hulls in the first wave, and in each later one. */
export const DEN_WAVE_FIRST = 1;
export const DEN_WAVE = 1;
/** Seconds between flank wings sent when it is shot, and how far round the flank they appear (units). */
export const DEN_FLANK_EVERY = 15;
export const DEN_FLANK_R = 90;
/** Hull left (0 to 1) at which it runs to its second den, the hull it has there, and the seconds it lies low first. */
export const DEN_FLEE = 0.35;
export const DEN_SECOND_HP = 0.6;
export const DEN_LIE_LOW = 20;
/** What a dead den spills (Cyrite, parts) and its bounty (score). */
export const DEN_CYRITE = 60;
export const DEN_PARTS = 8;
export const DEN_BOUNTY = 400;

export type DenState = 'dark' | 'seen' | 'awake' | 'moving' | 'dead';

export class Den {
  x: number; z: number;
  hp = DEN_HP;
  /** Hit flash for the renderer (s). */
  hitT = 0;
  state: DenState = 'dark';
  /** Its second hideout, and whether it has run to it. */
  readonly second: { x: number; z: number };
  moved = false;
  /** Waves launched from this hideout. */
  waves = 0;
  /** Seconds to the next wave; to the next flank wing; of lying low. */
  private nextWave = 2;
  private nextFlank = 0;
  private low = 0;
  /** The raiders it has sent (ids). */
  readonly sent = new Set<number>();
  /** Whether it has shown itself by firing. */
  private shown = false;

  constructor(x: number, z: number, second: { x: number; z: number }) { this.x = x; this.z = z; this.second = second; }

  get seen(): boolean { return this.state !== 'dark' && this.state !== 'dead'; }

  /** A bolt or torpedo lands on the hull. Returns true when it is destroyed. */
  hurt(w: World, dmg: number): boolean {
    if (this.state === 'dead' || this.state === 'moving') return false;
    this.hp -= dmg;
    this.hitT = 0.15;
    this.shown = true;
    if (this.state === 'dark') this.state = 'seen';
    // shot at: a wing comes round the flank
    this.flank(w);
    if (this.hp <= 0) { this.state = 'dead'; return true; }
    if (!this.moved && this.hp <= DEN_HP * DEN_FLEE) this.run(w);
    return false;
  }

  step(w: World, dt: number): void {
    if (this.state === 'dead') return;
    this.hitT = Math.max(0, this.hitT - dt);
    const s = w.ship, d = Math.hypot(s.x - this.x, s.z - this.z);
    if (this.state === 'moving') {
      this.low -= dt;
      if (this.low <= 0) { this.x = this.second.x; this.z = this.second.z; this.state = 'dark'; this.shown = false; this.waves = 0; this.nextWave = 6; this.hp = DEN_HP * DEN_SECOND_HP; }
      return;
    }
    // the raiders it has sent that are gone
    for (const id of [...this.sent]) if (!w.aliens.some((a) => a.id === id)) this.sent.delete(id);
    if (this.state === 'dark' && (d < DEN_SEE_R || this.shown)) this.state = 'seen';
    if (d < DEN_WAKE_R && w.alive) this.state = 'awake';
    else if (this.state === 'awake') this.state = d < DEN_SEE_R || this.shown ? 'seen' : 'dark';
    this.nextFlank = Math.max(0, this.nextFlank - dt);
    if (this.state !== 'awake') return;
    this.nextWave -= dt;
    if (this.nextWave > 0 || this.waves >= DEN_WAVES || this.sent.size > DEN_ALIVE - (this.waves === 0 ? DEN_WAVE_FIRST : DEN_WAVE)) return;
    this.nextWave = DEN_EVERY;
    this.waves++;
    this.shown = true;
    const first = this.waves === 1;
    if (first) this.say(w, t('“Unregistered dock. Raiders launching.”'));
    for (let i = 0; i < (first ? DEN_WAVE_FIRST : DEN_WAVE); i++) this.launch(w, 'scout', i);
  }

  private launch(w: World, variant: string, i: number): void {
    const a = (i - 0.5) * 1.2 + Math.atan2(w.ship.z - this.z, w.ship.x - this.x);
    const al = w.spawnHostile(variant, { x: this.x + Math.cos(a) * 12, y: 0, z: this.z + Math.sin(a) * 12 });
    al.extra = true;
    this.sent.add(al.id);
  }

  /** Shot at: a scout comes in from the player's flank, not from the den. */
  private flank(w: World): void {
    if (this.nextFlank > 0 || this.sent.size >= DEN_ALIVE) return;
    this.nextFlank = DEN_FLANK_EVERY;
    const s = w.ship, to = Math.atan2(this.z - s.z, this.x - s.x), side = (this.waves & 1) ? 1 : -1, a = to + side * Math.PI / 2;
    const al = w.spawnHostile('scout', { x: s.x + Math.cos(a) * DEN_FLANK_R, y: 0, z: s.z + Math.sin(a) * DEN_FLANK_R });
    al.extra = true;
    this.sent.add(al.id);
    this.say(w, t('“Wing round your flank!”'));
  }

  /** Crushed once: it cuts its lights and slips away to a second den. */
  private run(w: World): void {
    this.moved = true;
    this.state = 'moving';
    this.low = DEN_LIE_LOW;
    this.say(w, t('“Den abandoned. They have gone to ground.”'));
  }

  private say(w: World, text: string): void {
    w.events.push({ type: 'ping', id: `den_${this.state}_${this.waves}_${this.moved ? 1 : 0}`, from: t('Raider den'), caller: 'unknown', text, moment: 'calm', system: w.sortie.name });
  }
}

/** Where a mining system's first den lies, and its second: a long way off the course, on the side the barge is not. */
export function denBerth(x0: number, z0: number, heading: number, lane: number, side: number): { x: number; z: number; second: { x: number; z: number } } {
  const fx = Math.cos(heading), fz = -Math.sin(heading), rx = Math.sin(heading), rz = Math.cos(heading);
  const at = (f: number, o: number) => ({ x: x0 + fx * lane * f + rx * side * o, z: z0 + fz * lane * f + rz * side * o });
  return { ...at(0.55, 480), second: at(0.78, 560) };
}
