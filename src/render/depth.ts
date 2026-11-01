import {
  AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshStandardMaterial, Points, PointsMaterial, Group, Vector3,
  type Camera,
} from 'three';
import { rockGeometry } from './rocks';

// ── depth: near stars and the odd rock past the lens ───────────────────────
// The stars in starfield.ts sit at infinity, so they all turn together. These sit at a real distance, far under the
// plane in a box that follows the ship: when the chase camera swings round her they slide against the far stars, and the
// eye reads the sky as deep. Small, dim, one draw.
//
// Now and then a rock tumbles past right by the camera, out at the edge of the picture: dark, soft at the edges and
// stretched along its path (a cheap motion blur), there and gone in well under a second. Never with reduced motion.

const NEAR_STARS = 420;
const BOX = 1400;
/** Seconds between rocks past the lens, at least and at most. */
const PASS_GAP: [number, number] = [22, 55];
const PASS_T = 0.75;

const wrap = (v: number, m: number) => ((v % m) + m) % m;

export class Depth {
  readonly group = new Group();
  private readonly base: Float32Array;
  private readonly pos: Float32BufferAttribute;
  private readonly rock: Mesh;
  /** Points the rock along its path; the rock spins about that axis inside it, so its stretch stays on the path. */
  private readonly holder = new Group();
  private readonly rockMat: MeshStandardMaterial;
  private wait = PASS_GAP[0];
  private passT = -1;
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private readonly spin = new Vector3();
  private readonly right = new Vector3();
  private readonly fwd = new Vector3();
  private readonly up = new Vector3();

  constructor() {
    this.base = new Float32Array(NEAR_STARS * 3);
    const col = new Float32Array(NEAR_STARS * 3), c = new Color();
    for (let i = 0; i < NEAR_STARS; i++) {
      this.base[i * 3] = Math.random() * BOX;
      this.base[i * 3 + 1] = -120 - Math.random() * 420;
      this.base[i * 3 + 2] = Math.random() * BOX;
      // most pale blue-white, a few warm; a few brighter, most faint
      c.setRGB(0.8, 0.88, 1).lerp(new Color(1, 0.85, 0.7), Math.random() < 0.15 ? 0.8 : 0).multiplyScalar(0.25 + Math.pow(Math.random(), 3) * 0.75);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new BufferGeometry();
    this.pos = new Float32BufferAttribute(new Float32Array(NEAR_STARS * 3), 3);
    g.setAttribute('position', this.pos);
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    const stars = new Points(g, new PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false }));
    stars.frustumCulled = false;
    stars.renderOrder = -1;

    this.rockMat = new MeshStandardMaterial({ color: 0x2a2724, roughness: 0.95, metalness: 0.05, flatShading: true, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.rock = new Mesh(rockGeometry(4242, 2, 1, 0.45, 3), this.rockMat);
    this.rock.frustumCulled = false;
    this.holder.add(this.rock);
    this.holder.visible = false;
    this.group.add(stars, this.holder);
  }

  /** Low tier: half the near stars. */
  setThin(low: boolean): void {
    (this.group.children[0] as Points).geometry.setDrawRange(0, low ? NEAR_STARS >> 1 : NEAR_STARS);
  }

  /** `cx`, `cz` the ship's place; `motion` false (reduced motion) lets no rock pass. */
  update(camera: Camera, cx: number, cz: number, dt: number, motion: boolean): void {
    const P = this.pos.array as Float32Array, B = this.base, h = BOX / 2;
    for (let i = 0; i < NEAR_STARS; i++) {
      P[i * 3] = cx + wrap(B[i * 3]! - cx, BOX) - h;
      P[i * 3 + 1] = B[i * 3 + 1]!;
      P[i * 3 + 2] = cz + wrap(B[i * 3 + 2]! - cz, BOX) - h;
    }
    this.pos.needsUpdate = true;
    if (dt <= 0) return;

    if (this.passT < 0) {
      if (!motion || (this.wait -= dt) > 0) return;
      this.wait = PASS_GAP[0] + Math.random() * (PASS_GAP[1] - PASS_GAP[0]);
      this.start(camera);
    }
    this.passT += dt / PASS_T;
    if (this.passT >= 1) { this.passT = -1; this.holder.visible = false; return; }
    const t = this.passT;
    this.holder.position.lerpVectors(this.from, this.to, t);
    this.rock.rotation.z = this.spin.x * t;
    this.rockMat.opacity = Math.sin(t * Math.PI) * 0.75;
  }

  /** A rock from ahead of the camera, out at one edge of the picture, past the lens and behind it. */
  private start(camera: Camera): void {
    camera.getWorldDirection(this.fwd);
    this.right.crossVectors(this.fwd, camera.up).normalize();
    this.up.crossVectors(this.right, this.fwd).normalize();
    const side = Math.random() < 0.5 ? -1 : 1, lift = (Math.random() - 0.5) * 1.4, off = 2.6 + Math.random() * 1.6;
    const c = camera.position;
    this.from.copy(c).addScaledVector(this.fwd, 14).addScaledVector(this.right, side * off * 1.6).addScaledVector(this.up, lift);
    this.to.copy(c).addScaledVector(this.fwd, -3).addScaledVector(this.right, side * off).addScaledVector(this.up, lift * 0.6);
    // stretched along its path, so it reads as moving too fast to see sharply
    const s = 0.35 + Math.random() * 0.4;
    this.rock.scale.set(s, s, s * 2.4);
    this.holder.position.copy(this.from);
    this.holder.lookAt(this.to);
    this.spin.set(2 + Math.random() * 3, 0, 0);
    this.holder.visible = true;
    this.passT = 0;
  }
}
