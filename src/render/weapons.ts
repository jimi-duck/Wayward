import { Color, Vector3 } from 'three';
import { STEP } from '../core/loop';
import type { Bolt, Torpedo } from '../sim/weapons';
import type { Effects } from './fx';
import { STREAK, type Streaks } from './streaks';

// Laser lances: a white-hot core in a red sheath with a soft glow round it, long and heavy, pointed
// along their flight (they climb and dive onto targets off the plane).
// Torpedoes: a hot core in an amber halo, its motor flaring as it builds
// speed, shedding embers. Our lances burn red, our torpedoes amber; enemy fire
// burns its faction's colour. All of it is drawn as streaks (streaks.ts), in one draw call
// shared with the enemy's fire.

const MAX_TORPS = 12;
// Red, by request: the player's guns are red lasers. Brand v1.1 keeps red for threat,
// so the enemy side stays off it: Gutter fire is orange-gold, the rest gold, green or magenta.
const LANCE = new Color(4, 0.32, 0.28);
const LANCE_GLOW = new Color(1.5, 0.12, 0.1);
const TORP = new Color(2.5, 1.3, 0.5);
const TORP_FLAME = new Color(3.2, 1.7, 0.4);

export class WeaponView {
  private readonly d = new Vector3();

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
      if (dt > 0) {
        for (let n = 0; n < 2; n++) {
          fx.mote(x, y, z, -t.vx * 0.12 + (Math.random() - 0.5) * 3, -t.vy * 0.12 + (Math.random() - 0.5) * 2, -t.vz * 0.12 + (Math.random() - 0.5) * 3,
            [3.2, 0.9 + Math.random() * 0.8, 0.3], 0.4 + burn * 0.3, 0.45);
        }
      }
    }
  }
}
