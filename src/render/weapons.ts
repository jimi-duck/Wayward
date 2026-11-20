import { Color, Vector3 } from 'three';
import { STEP } from '../core/loop';
import type { Bolt, Torpedo } from '../sim/weapons';
import type { Effects } from './fx';
import { STREAK, type Streaks } from './streaks';

// Laser lances: a white-hot core in a red sheath with a soft glow round it, long and heavy, pointed
// along their flight (they climb and dive onto targets off the plane).
// Torpedoes: a hot core in an amber halo, its motor flaring as it builds
// speed, shedding embers, its smoke laid in segments with an ember in each. Our lances burn red, our torpedoes amber; enemy fire
// burns its faction's colour. All of it is drawn as streaks (streaks.ts), in one draw call
// shared with the enemy's fire.

const MAX_TORPS = 12;
// Red, by request: the player's guns are red lasers. Brand v1.1 keeps red for threat,
// so the enemy side stays off it: Gutter fire is orange-gold, the rest gold, green or magenta.
const LANCE = new Color(4, 0.32, 0.28);
const LANCE_GLOW = new Color(1.5, 0.12, 0.1);
const TORP = new Color(2.5, 1.3, 0.5);
const TORP_FLAME = new Color(3.2, 1.7, 0.4);
/** The lance's hot centre: a slim white line inside the red, so a shot reads sharp against any sky. */
const LANCE_CORE = new Color(3.6, 2.6, 2.3);
/** A torpedo lays its smoke in segments, one puff each this far along its path, with a glowing ember at each. */
const SEGMENT = 0.9;
/** Scratch colour for the shock diamonds. */
const DIAMOND = new Color();

export class WeaponView {
  private readonly d = new Vector3();
  /** Per torpedo slot: which torpedo it was last frame, and where it laid its last smoke segment. */
  private readonly segId = new Float64Array(MAX_TORPS).fill(-1);
  private readonly segX = new Float32Array(MAX_TORPS);
  private readonly segZ = new Float32Array(MAX_TORPS);

  constructor(private readonly streaks: Streaks) {}

  update(bolts: readonly Bolt[], torps: readonly Torpedo[], alpha: number, fx: Effects, dt: number, time: number): void {
    const back = (1 - alpha) * STEP;
    for (const b of bolts) {
      // a disruptor bolt: longer and twice as thick
      this.streaks.push(b.x - b.vx * back, b.y - b.vy * back + 0.1, b.z - b.vz * back, b.vx, b.vy, b.vz,
        b.heavy ? 5.3 : 4.4, b.heavy ? 1.3 : 0.7, STREAK.lance, LANCE, 1);
      // a wider, dimmer sheath over it: the glow, in the same draw
      this.streaks.push(b.x - b.vx * back, b.y - b.vy * back + 0.1, b.z - b.vz * back, b.vx, b.vy, b.vz,
        b.heavy ? 6.5 : 5.4, b.heavy ? 3.4 : 2, STREAK.lance, LANCE_GLOW, 0);
      this.streaks.push(b.x - b.vx * back, b.y - b.vy * back + 0.1, b.z - b.vz * back, b.vx, b.vy, b.vz,
        b.heavy ? 4.8 : 4, b.heavy ? 0.42 : 0.24, STREAK.lance, LANCE_CORE, 1);
    }

    for (let i = 0; i < MAX_TORPS; i++) {
      const t = torps[i];
      if (!t) break;
      const x = t.x - t.vx * back, y = t.y - t.vy * back + 0.1, z = t.z - t.vz * back;
      const burn = Math.min(1, t.speed / 60), k = t.small ? 0.55 : 1;
      this.d.set(t.vx, t.vy, t.vz);
      if (this.d.lengthSq() < 1e-6) this.d.set(1, 0, 0);
      const flick = time * 7 + i * 0.37, wid = (1.8 + burn * 1.2 + Math.sin(time * 40 + i) * 0.25) * k;
      // the motor's exhaust, then the warhead's glow over its head
      this.streaks.push(x, y, z, this.d.x, this.d.y, this.d.z, (2.6 + burn * 3.6) * k, (1.0 + burn * 0.5) * k, STREAK.torp, TORP_FLAME, 0.6, flick);
      this.streaks.push(x, y, z, this.d.x, this.d.y, this.d.z, wid, wid, STREAK.orb, TORP, 1, flick * 2.1);
      // at full burn the exhaust stands in faint shock diamonds behind the motor, each smaller and dimmer than the last
      if (burn > 0.8) {
        const n = this.d.length(), ux = this.d.x / n, uy = this.d.y / n, uz = this.d.z / n, dk = (burn - 0.8) * 5;
        for (let j = 1; j <= 3; j++) {
          const o = (0.55 + j * 0.42) * k, w = (0.5 - j * 0.1) * k;
          DIAMOND.copy(TORP_FLAME).multiplyScalar(0.5 * dk / j);
          this.streaks.push(x - ux * o, y - uy * o, z - uz * o, this.d.x, this.d.y, this.d.z, w, w, STREAK.orb, DIAMOND, 1, flick + j);
        }
      }
      if (dt > 0) {
        for (let n = 0; n < 2; n++) {
          fx.mote(x, y, z, -t.vx * 0.12 + (Math.random() - 0.5) * 3, -t.vy * 0.12 + (Math.random() - 0.5) * 2, -t.vz * 0.12 + (Math.random() - 0.5) * 3,
            [3.2, 0.9 + Math.random() * 0.8, 0.3], 0.4 + burn * 0.3, 0.45);
        }
        // the trail hangs where it has been in segments, a puff of smoke every SEGMENT with an ember glowing in it, so a
        // torpedo's path reads as a heavy round's and never as a lance's line
        if (this.segId[i] !== t.id) { this.segId[i] = t.id; this.segX[i] = x; this.segZ[i] = z; }
        const sx = x - this.segX[i]!, sz = z - this.segZ[i]!, gap = Math.hypot(sx, sz);
        if (gap >= SEGMENT * k) {
          this.segX[i] = x; this.segZ[i] = z;
          if (!fx.calm) fx.dust(x, y, z, 0.62 * k, [0.12, 0.11, 0.1], 1, 0.25, 1.4, 0.3);
          fx.mote(x, y, z, (Math.random() - 0.5) * 0.8, 0.3, (Math.random() - 0.5) * 0.8, [3.4, 1.3, 0.35], 0.32 * k + 0.1, 0.7);
        }
      }
    }
  }
}
