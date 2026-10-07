import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, LineBasicMaterial,
  LineSegments, Matrix4, MeshBasicMaterial, PlaneGeometry, Quaternion, SphereGeometry, Vector3, type Scene,
} from 'three';
import type { Systems } from '../sim/arsenal';
import { metal } from './kit';

// ── the systems that fire themselves ──────────────────────────────────────
// Mines: a dark spiked shell with an amber lamp that blinks slowly while it
// arms, steadily once armed, and fast once something sets it off. Plasma:
// the vent's trail is one thin, steady line strip along where the engines
// vented, dimming as it fades and gone near the lens (soft pink patches hid
// the ship and the HUD, and the bloom washed them out); the damage is
// unchanged, only the drawing is. Clouds from a chain reaction or a plasma
// warhead stay as orange patches. Arcs: jagged
// blue-white lightning, redrawn every frame so it crawls, gone in a blink.

const MAX_MINES = 40;
const MAX_BURNS = 260;
const MAX_ARC_SEGS = 900;
const ARC_LIFE = 0.16;
/** Under the bloom threshold on purpose: a line, not a glow. */
const TRAIL = new Color(1, 0.42, 0.3);
/** Trail points further apart than this are not joined (a roll's ring, a corona). */
const TRAIL_JOIN = 3;
const CLOUD = new Color(3.4, 1.3, 0.3);
const ARC = new Color(2.4, 3.2, 4.6);
/** Plasma within NEAR of the camera is invisible, and full strength from FAR out. */
const BURN_NEAR = 3.5;
const BURN_FAR = 8;

interface Arc { pts: number[]; life: number; }

export class ArsenalView {
  private readonly shells: InstancedMesh;
  private readonly lamps: InstancedMesh;
  private readonly burns: InstancedMesh;
  private readonly arcLines: LineSegments;
  private readonly trailLines: LineSegments;
  private readonly trailPos = new Float32Array(MAX_BURNS * 6);
  private readonly trailCol = new Float32Array(MAX_BURNS * 6);
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
    this.burns = new InstancedMesh(new PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0xffffff, map: glow(), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }), MAX_BURNS);
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
    const t = new BufferGeometry();
    t.setAttribute('position', new BufferAttribute(this.trailPos, 3));
    t.setAttribute('color', new BufferAttribute(this.trailCol, 3));
    t.setDrawRange(0, 0);
    this.trailLines = new LineSegments(t, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.trailLines.frustumCulled = false;
    scene.add(this.trailLines);
  }

  /** An arc event: pairs of points (x, y, z, x, y, z, ...). */
  arc(points: number[]): void {
    this.arcs.push({ pts: points, life: ARC_LIFE });
  }

  /** `eye` is the camera position, so plasma near the lens can fade out. */
  update(sys: Systems, dt: number, eye: Vector3): void {
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
    let b = 0, t = 0, px = 0, pz = 0, pf = 0, linked = false;
    for (const br of sys.burns) {
      const f = Math.max(0, br.life / br.max);
      const near = smoothstep(BURN_NEAR, BURN_FAR, Math.hypot(br.x - eye.x, br.z - eye.z));
      if (br.trail) {
        // one strip: each point joins the last when they are close, else a short tick
        if (t < MAX_BURNS) {
          const join = linked && Math.hypot(br.x - px, br.z - pz) < TRAIL_JOIN;
          const x0 = join ? px : br.x - 0.25, z0 = join ? pz : br.z;
          const k0 = (join ? pf : f * near) * 0.5, k1 = f * near * 0.5;
          this.trailPos.set([x0, 0.08, z0, br.x + (join ? 0 : 0.25), 0.08, br.z], t * 6);
          this.c.copy(TRAIL);
          this.trailCol.set([this.c.r * k0, this.c.g * k0, this.c.b * k0, this.c.r * k1, this.c.g * k1, this.c.b * k1], t * 6);
          t++;
        }
        px = br.x; pz = br.z; pf = f * near; linked = true;
        continue;
      }
      if (b >= MAX_BURNS) continue;
      const r = br.r * (0.7 + 0.3 * Math.sin(this.time * 9 + b));
      this.m.compose(this.p.set(br.x, 0.2, br.z), this.q.identity(), this.s.set(r * 1.3, 1, r * 1.3));
      this.burns.setMatrixAt(b, this.m);
      this.burns.setColorAt(b, this.c.copy(CLOUD).multiplyScalar((0.15 + 0.5 * f) * near));
      b++;
    }
    this.burns.count = b;
    this.burns.instanceMatrix.needsUpdate = true;
    if (this.burns.instanceColor) this.burns.instanceColor.needsUpdate = true;
    const tg = this.trailLines.geometry;
    tg.setDrawRange(0, t * 2);
    (tg.attributes.position as BufferAttribute).needsUpdate = true;
    (tg.attributes.color as BufferAttribute).needsUpdate = true;

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

/** A soft round glow, hot in the middle and gone at the rim. */
function glow(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
