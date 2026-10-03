import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, LineBasicMaterial,
  LineSegments, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3, type Scene,
} from 'three';
import type { Systems } from '../sim/arsenal';
import { metal } from './kit';

// ── the systems that fire themselves ──────────────────────────────────────
// Mines: a dark spiked shell with an amber lamp that blinks slowly while it
// arms, steadily once armed, and fast once something sets it off. Plasma:
// hot pink patches where the engines vented, cooling as they fade; clouds
// from a chain reaction or a plasma warhead burn orange. Arcs: jagged
// blue-white lightning, redrawn every frame so it crawls, gone in a blink.

const MAX_MINES = 40;
const MAX_BURNS = 260;
const MAX_ARC_SEGS = 900;
const ARC_LIFE = 0.16;
const TRAIL = new Color(3.2, 0.9, 1.7);
const CLOUD = new Color(3.4, 1.3, 0.3);
const ARC = new Color(2.4, 3.2, 4.6);

interface Arc { pts: number[]; life: number; }

export class ArsenalView {
  private readonly shells: InstancedMesh;
  private readonly lamps: InstancedMesh;
  private readonly burns: InstancedMesh;
  private readonly arcLines: LineSegments;
  private readonly arcPos = new Float32Array(MAX_ARC_SEGS * 6);
  private readonly arcs: Arc[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly c = new Color();
  private time = 0;

  constructor(scene: Scene) {
    this.shells = new InstancedMesh(spiked(), metal({ tint: 0x4a4440, roughness: 0.45, metalness: 0.8, scale: 3 }), MAX_MINES);
    this.lamps = new InstancedMesh(new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX_MINES);
    this.lamps.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_MINES * 3), 3);
    this.burns = new InstancedMesh(new SphereGeometry(1, 10, 6),
      new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), MAX_BURNS);
    this.burns.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_BURNS * 3), 3);
    for (const im of [this.shells, this.lamps, this.burns]) {
      im.count = 0;
      im.frustumCulled = false;
      scene.add(im);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.arcPos, 3));
    g.setDrawRange(0, 0);
    this.arcLines = new LineSegments(g, new LineBasicMaterial({ color: ARC, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.arcLines.frustumCulled = false;
    scene.add(this.arcLines);
  }

  /** An arc event: pairs of points (x, y, z, x, y, z, ...). */
  arc(points: number[]): void {
    this.arcs.push({ pts: points, life: ARC_LIFE });
  }

  update(sys: Systems, dt: number): void {
    this.time += dt;
    // mines
    let n = 0;
    for (const mn of sys.mines) {
      if (n >= MAX_MINES) break;
      this.q.setFromAxisAngle(this.p.set(0.3, 1, 0.2).normalize(), this.time * 0.8 + mn.id);
      this.m.compose(this.p.set(mn.x, 0.15, mn.z), this.q, this.s.set(0.42, 0.42, 0.42));
      this.shells.setMatrixAt(n, this.m);
      const rate = mn.fuse >= 0 ? 30 : mn.arm > 0 ? 3 : 6;
      const on = Math.sin(this.time * rate + mn.id) > 0.2;
      const k = mn.fuse >= 0 ? 1.6 : on ? 1 : 0.15;
      this.m.compose(this.p.set(mn.x, 0.55, mn.z), this.q.identity(), this.s.setScalar(0.11 * (mn.fuse >= 0 ? 1.6 : 1)));
      this.lamps.setMatrixAt(n, this.m);
      this.lamps.setColorAt(n, this.c.setRGB(3.6 * k, 1.8 * k, 0.4 * k));
      n++;
    }
    this.shells.count = this.lamps.count = n;
    this.shells.instanceMatrix.needsUpdate = true;
    this.lamps.instanceMatrix.needsUpdate = true;
    if (this.lamps.instanceColor) this.lamps.instanceColor.needsUpdate = true;

    // plasma and clouds
    let b = 0;
    for (const br of sys.burns) {
      if (b >= MAX_BURNS) break;
      const f = Math.max(0, br.life / br.max);
      const r = br.r * (br.trail ? 0.55 + 0.45 * f : 0.7 + 0.3 * Math.sin(this.time * 9 + b));
      this.m.compose(this.p.set(br.x, 0.25, br.z), this.q.identity(), this.s.set(r, r * 0.45, r));
      this.burns.setMatrixAt(b, this.m);
      this.burns.setColorAt(b, this.c.copy(br.trail ? TRAIL : CLOUD).multiplyScalar(0.15 + 0.5 * f));
      b++;
    }
    this.burns.count = b;
    this.burns.instanceMatrix.needsUpdate = true;
    if (this.burns.instanceColor) this.burns.instanceColor.needsUpdate = true;

    // arcs: each pair redrawn as a jagged line, crawling
    let seg = 0;
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i]!;
      a.life -= dt;
      if (a.life <= 0) { this.arcs.splice(i, 1); continue; }
      for (let j = 0; j + 5 < a.pts.length; j += 6) {
        const x0 = a.pts[j]!, y0 = a.pts[j + 1]!, z0 = a.pts[j + 2]!, x1 = a.pts[j + 3]!, y1 = a.pts[j + 4]!, z1 = a.pts[j + 5]!;
        const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0), steps = Math.max(3, Math.min(10, Math.round(len / 1.2)));
        let px = x0, py = y0, pz = z0;
        for (let k = 1; k <= steps && seg < MAX_ARC_SEGS; k++) {
          const t = k / steps, jit = k === steps ? 0 : len * 0.09;
          const nx = x0 + (x1 - x0) * t + (Math.random() - 0.5) * jit;
          const ny = y0 + (y1 - y0) * t + (Math.random() - 0.5) * jit;
          const nz = z0 + (z1 - z0) * t + (Math.random() - 0.5) * jit;
          this.arcPos.set([px, py, pz, nx, ny, nz], seg * 6);
          px = nx; py = ny; pz = nz;
          seg++;
        }
      }
    }
    const g = this.arcLines.geometry;
    g.setDrawRange(0, seg * 2);
    (g.attributes.position as BufferAttribute).needsUpdate = true;
  }
}

/** A mine's shell: a ball with six spikes. */
function spiked(): BufferGeometry {
  const g = new IcosahedronGeometry(1, 1);
  const p = g.attributes.position!;
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const spike = Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z));
    v.multiplyScalar(spike > 0.97 ? 1.7 : 1);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
