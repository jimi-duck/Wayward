import {
  AdditiveBlending, BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Sprite, SpriteMaterial,
  Vector3, type Scene, type Texture,
} from 'three';
import { STEP } from '../core/loop';
import type { Bolt, Torpedo } from '../sim/weapons';
import type { Effects } from './fx';

// Phaser bolts: thin beams in HDR cyan, so they bloom. Torpedoes: a white-hot
// core in a cyan halo, shedding sparks behind. Cyan is ours: nothing the
// player fires is ever warm.

const MAX_BOLTS = 96;
const MAX_TORPS = 12;

export class WeaponView {
  private readonly bolts: InstancedMesh;
  private readonly cores: Sprite[] = [];
  private readonly halos: Sprite[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3(1, 1, 1);
  private readonly up = new Vector3(0, 1, 0);

  constructor(scene: Scene, glow: Texture) {
    this.bolts = new InstancedMesh(new BoxGeometry(1.7, 0.09, 0.09),
      new MeshBasicMaterial({ color: new Color(0.6, 3.2, 3.8), toneMapped: false }), MAX_BOLTS);
    this.bolts.count = 0;
    this.bolts.frustumCulled = false;
    scene.add(this.bolts);
    for (let i = 0; i < MAX_TORPS; i++) {
      const core = new Sprite(new SpriteMaterial({ map: glow, color: new Color(3, 3.4, 3.6), blending: AdditiveBlending, depthWrite: false }));
      const halo = new Sprite(new SpriteMaterial({ map: glow, color: new Color(0.2, 1.4, 2.2), blending: AdditiveBlending, depthWrite: false, opacity: 0.8 }));
      core.scale.setScalar(0.9);
      halo.scale.setScalar(2.8);
      core.visible = halo.visible = false;
      scene.add(core, halo);
      this.cores.push(core);
      this.halos.push(halo);
    }
  }

  update(bolts: readonly Bolt[], torps: readonly Torpedo[], alpha: number, fx: Effects, dt: number, time: number): void {
    const back = (1 - alpha) * STEP;
    let n = 0;
    for (const b of bolts) {
      if (n >= MAX_BOLTS) break;
      this.q.setFromAxisAngle(this.up, Math.atan2(-b.vz, b.vx));
      this.m.compose(this.p.set(b.x - b.vx * back, 0.05, b.z - b.vz * back), this.q, this.s);
      this.bolts.setMatrixAt(n++, this.m);
    }
    this.bolts.count = n;
    this.bolts.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_TORPS; i++) {
      const t = torps[i];
      const core = this.cores[i]!, halo = this.halos[i]!;
      core.visible = halo.visible = !!t;
      if (!t) continue;
      const x = t.x - t.vx * back, z = t.z - t.vz * back;
      core.position.set(x, 0.1, z);
      halo.position.set(x, 0.1, z);
      halo.scale.setScalar(2.6 + Math.sin(time * 40 + i) * 0.35);
      if (dt > 0) fx.mote(x, 0.1, z, -t.vx * 0.08 + (Math.random() - 0.5) * 2, -t.vz * 0.08 + (Math.random() - 0.5) * 2, [0.4, 2.2, 3], 0.45, 0.35);
    }
  }
}
