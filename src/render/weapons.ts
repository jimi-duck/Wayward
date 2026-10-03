import {
  AdditiveBlending, BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Sprite, SpriteMaterial,
  Vector3, type Scene, type Texture,
} from 'three';
import { STEP } from '../core/loop';
import type { Bolt, Torpedo } from '../sim/weapons';
import type { Effects } from './fx';

// Phaser lances: a white-hot core in a red sheath, long and heavy, pointed
// along their flight (they climb and dive onto targets off the plane).
// Torpedoes: a hot core in a red-orange halo, its motor flaring as it builds
// speed, shedding embers. Ours burn red; enemy fire burns its faction's
// colour.

const MAX_BOLTS = 96;
const MAX_TORPS = 12;
const X = new Vector3(1, 0, 0);

export class WeaponView {
  private readonly cores: InstancedMesh;
  private readonly sheaths: InstancedMesh;
  private readonly torpCores: Sprite[] = [];
  private readonly halos: Sprite[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly d = new Vector3();
  private readonly one = new Vector3(1, 1, 1);
  /** A disruptor bolt: longer and twice as thick. */
  private readonly heavy = new Vector3(1.2, 2.2, 2.2);

  constructor(scene: Scene, glow: Texture) {
    this.cores = new InstancedMesh(new BoxGeometry(3.6, 0.13, 0.13),
      new MeshBasicMaterial({ color: new Color(4.2, 2.8, 2.6), toneMapped: false }), MAX_BOLTS);
    this.sheaths = new InstancedMesh(new BoxGeometry(4.4, 0.5, 0.5),
      new MeshBasicMaterial({ color: new Color(2.2, 0.16, 0.3), transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), MAX_BOLTS);
    for (const im of [this.cores, this.sheaths]) {
      im.count = 0;
      im.frustumCulled = false;
      scene.add(im);
    }
    for (let i = 0; i < MAX_TORPS; i++) {
      const core = new Sprite(new SpriteMaterial({ map: glow, color: new Color(4, 3, 2.4), blending: AdditiveBlending, depthWrite: false }));
      const halo = new Sprite(new SpriteMaterial({ map: glow, color: new Color(2.4, 0.5, 0.25), blending: AdditiveBlending, depthWrite: false, opacity: 0.85 }));
      core.visible = halo.visible = false;
      scene.add(core, halo);
      this.torpCores.push(core);
      this.halos.push(halo);
    }
  }

  update(bolts: readonly Bolt[], torps: readonly Torpedo[], alpha: number, fx: Effects, dt: number, time: number): void {
    const back = (1 - alpha) * STEP;
    let n = 0;
    for (const b of bolts) {
      if (n >= MAX_BOLTS) break;
      this.q.setFromUnitVectors(X, this.d.set(b.vx, b.vy, b.vz).normalize());
      this.m.compose(this.p.set(b.x - b.vx * back, b.y - b.vy * back + 0.1, b.z - b.vz * back), this.q, b.heavy ? this.heavy : this.one);
      this.cores.setMatrixAt(n, this.m);
      this.sheaths.setMatrixAt(n, this.m);
      n++;
    }
    for (const im of [this.cores, this.sheaths]) {
      im.count = n;
      im.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < MAX_TORPS; i++) {
      const t = torps[i];
      const core = this.torpCores[i]!, halo = this.halos[i]!;
      core.visible = halo.visible = !!t;
      if (!t) continue;
      const x = t.x - t.vx * back, y = t.y - t.vy * back + 0.1, z = t.z - t.vz * back;
      const burn = Math.min(1, t.speed / 60);
      core.position.set(x, y, z);
      halo.position.set(x, y, z);
      core.scale.setScalar(0.8 + burn * 0.4);
      halo.scale.setScalar(2.2 + burn * 1.6 + Math.sin(time * 40 + i) * 0.3);
      if (dt > 0) {
        for (let k = 0; k < 2; k++) {
          fx.mote(x, y, z, -t.vx * 0.12 + (Math.random() - 0.5) * 3, -t.vy * 0.12 + (Math.random() - 0.5) * 2, -t.vz * 0.12 + (Math.random() - 0.5) * 3,
            [3.2, 0.9 + Math.random() * 0.8, 0.3], 0.4 + burn * 0.3, 0.45);
        }
      }
    }
  }
}
