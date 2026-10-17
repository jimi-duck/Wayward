import { InstancedMesh, Matrix4, MeshStandardMaterial, type Scene } from 'three';
import { rockGeometry } from './rocks';
import { seeded } from './kit';

// ── the debris layer ────────────────────────────────────────────────────────
// Thousands of small chips of stone between the big rocks are what gives a
// field its scale: the eye measures a rock against the grit round it. This is
// a few hundred small, dull, simple shapes in a box that follows the ship,
// each drifting and turning slowly. Visual only (the simulation never sees
// them), none within a few units of the ship, so the hull and the shots are
// never hidden. One draw call; a shared plain material.

const BOX = 120;
const MAX = 800;
const CLEAR_NEAR = 4;
const CLEAR_FAR = 9;

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}

export class DebrisField {
  private readonly mesh: InstancedMesh;
  private readonly base = new Float32Array(MAX * 3);
  private readonly drift = new Float32Array(MAX * 3);
  private readonly spin = new Float32Array(MAX * 4);
  private readonly size = new Float32Array(MAX);
  private readonly m = new Matrix4();
  private time = 0;

  constructor(scene: Scene) {
    const material = new MeshStandardMaterial({ color: 0x45484e, roughness: 0.95, metalness: 0.05, vertexColors: true, envMapIntensity: 0.3 });
    this.mesh = new InstancedMesh(rockGeometry(77, 1, 0, 0.45, 4), material, MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    const rnd = seeded(5151);
    for (let i = 0; i < MAX; i++) {
      this.base.set([rnd() * BOX, -13 + rnd() * 26, rnd() * BOX], i * 3);
      this.drift.set([(rnd() - 0.5) * 1.2, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 1.2], i * 3);
      const ax = rnd() - 0.5, ay = rnd() - 0.5, az = rnd() - 0.5, n = Math.hypot(ax, ay, az) || 1;
      this.spin.set([ax / n, ay / n, az / n, (rnd() - 0.5) * 1.6], i * 4);
      // mostly grit, now and then a fist-sized lump
      this.size[i] = 0.05 + Math.pow(rnd(), 3) * 0.42;
    }
    scene.add(this.mesh);
  }

  /** How many chips are drawn: the tier's share of the layer (0 hides it). */
  setCount(n: number): void {
    this.mesh.count = Math.max(0, Math.min(MAX, n));
  }

  update(cx: number, cz: number, dt: number): void {
    if (!this.mesh.count) return;
    this.time += dt;
    const h = BOX / 2, t = this.time, e = this.m.elements;
    for (let i = 0; i < this.mesh.count; i++) {
      const x = cx + wrap(this.base[i * 3]! + this.drift[i * 3]! * t - cx, BOX) - h;
      const y = this.base[i * 3 + 1]! + this.drift[i * 3 + 1]! * t;
      const z = cz + wrap(this.base[i * 3 + 2]! + this.drift[i * 3 + 2]! * t - cz, BOX) - h;
      const d = Math.hypot(x - cx, z - cz);
      // a chip near the ship melts to nothing rather than popping
      const k = Math.min(1, Math.max(0, (d - CLEAR_NEAR) / (CLEAR_FAR - CLEAR_NEAR)));
      const s = this.size[i]! * k * k * (3 - 2 * k);
      // Rodrigues rotation about the chip's own axis
      const ax = this.spin[i * 4]!, ay = this.spin[i * 4 + 1]!, az = this.spin[i * 4 + 2]!, a = this.spin[i * 4 + 3]! * t + i;
      const c = Math.cos(a), sn = Math.sin(a), oc = 1 - c;
      e[0] = (c + ax * ax * oc) * s; e[1] = (ay * ax * oc + az * sn) * s; e[2] = (az * ax * oc - ay * sn) * s; e[3] = 0;
      e[4] = (ax * ay * oc - az * sn) * s; e[5] = (c + ay * ay * oc) * s; e[6] = (az * ay * oc + ax * sn) * s; e[7] = 0;
      e[8] = (ax * az * oc + ay * sn) * s; e[9] = (ay * az * oc - ax * sn) * s; e[10] = (c + az * az * oc) * s; e[11] = 0;
      e[12] = x; e[13] = y; e[14] = z; e[15] = 1;
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
