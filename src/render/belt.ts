import {
  AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Points, ShaderMaterial, type Camera,
} from 'three';
import { Gas, type GasLump } from './gas';
import { seeded } from './kit';
import { rockGeometry } from './rocks';
import { signatureOf } from './signature';
import type { Sky } from './sky';

// ── fuller belts (space plan step 4) ──────────────────────────────────────
// A rock field read as the rocks round the ship and nothing past them. Three layers make it a belt:
//
//   - rubble streams: long rivers of small rock a few hundred metres to a kilometre or two out, above or below the
//     ship's plane, flowing slowly along their length, each with a thin band of dust riding with it (gas.ts sheets);
//   - ice glitter: a scatter of tiny ice motes round the ship that catch the sun for an instant as they turn;
//   - (the close chips are debris.ts, already there).
//
// All of it scales with how much rock the system holds, so open space stays open. Streams sit on a repeating tile in
// the world, like the middle-distance banks, so they slide past with parallax. Fogged like everything else in the world.

const TILE = 3000;
/** Rocks in the system for a full belt; below a few, none. */
const FULL = 30;

interface Stream { mesh: InstancedMesh; dust: Gas; x: number; y: number; z: number; ang: number; len: number; speed: number; base: Float32Array }

const GLITTER_V = /* glsl */ `
  attribute vec2 aTwinkle; // rate, phase
  uniform float uTime, uBox; uniform vec3 uCentre;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x = uCentre.x + mod(p.x - uCentre.x + uBox * 0.5, uBox) - uBox * 0.5;
    p.z = uCentre.z + mod(p.z - uCentre.z + uBox * 0.5, uBox) - uBox * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    // each mote catches the sun for an instant as it turns: a sharp, rare flash
    float s = max(sin(uTime * aTwinkle.x + aTwinkle.y), 0.0);
    vA = pow(s, 24.0) * smoothstep(8.0, 30.0, -mv.z);
    gl_PointSize = 2.0 + 2.0 * vA;
  }`;
const GLITTER_F = /* glsl */ `
  uniform vec3 uColour; uniform float uK;
  varying float vA;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float a = vA * uK * smoothstep(0.5, 0.0, length(d));
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColour * a, 1.0);
  }`;

export class Belt {
  readonly group = new Group();
  private streams: Stream[] = [];
  private readonly glitter: Points;
  private readonly glitterMat: ShaderMaterial;
  private readonly rockMat = new MeshStandardMaterial({ color: 0x2c2826, roughness: 0.95, metalness: 0.05, flatShading: true, envMapIntensity: 0.3 });
  private readonly geo = rockGeometry(311, 1, 0, 0.5, 3);
  private readonly m = new Matrix4();
  private lean = false;
  private sky: Sky | null = null;
  private t = 0;
  private k = 0;
  /** The region's glitter strength (signature.ts). */
  private gk = 1;

  constructor() {
    const n = 420, pos = new Float32Array(n * 3), tw = new Float32Array(n * 2), r = seeded(4242), box = 360;
    for (let i = 0; i < n; i++) {
      pos.set([(r() - 0.5) * box, -30 + r() * 60, (r() - 0.5) * box], i * 3);
      tw.set([0.4 + r() * 1.4, r() * 6.283], i * 2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('aTwinkle', new Float32BufferAttribute(tw, 2));
    this.glitterMat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uBox: { value: box }, uCentre: { value: { x: 0, y: 0, z: 0 } }, uColour: { value: new Color(1.1, 1.2, 1.3) }, uK: { value: 0 } },
      vertexShader: GLITTER_V, fragmentShader: GLITTER_F, transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false,
    });
    this.glitter = new Points(g, this.glitterMat);
    this.glitter.frustumCulled = false;
    this.group.add(this.glitter);
  }

  setLean(lean: boolean): void {
    if (lean === this.lean) return;
    this.lean = lean;
    if (this.sky) this.setSky(this.sky);
  }

  setSky(sky: Sky): void {
    this.sky = sky;
    for (const s of this.streams) { s.mesh.removeFromParent(); s.mesh.dispose(); s.dust.mesh.removeFromParent(); s.dust.dispose(); }
    this.streams = [];
    // the rock takes a breath of the sky's main colour, the ice its star
    this.rockMat.color.setHex(0x2c2826).lerp(sky.neb[0], 0.08);
    // the region's signature: clean ice or warm metal flakes, more or fewer streams, and in torn space all pulled one way
    const sig = signatureOf(sky.palette);
    this.gk = sig.glitter;
    (this.glitterMat.uniforms.uColour!.value as Color).copy(sky.star).lerp(new Color(0.75, 0.9, 1.1), 0.5).lerp(new Color(1.15, 0.92, 0.66), sig.flakes).multiplyScalar(1.3);
    const r = seeded(sky.seed * 17 + 3);
    const count = Math.max(1, Math.min(4, Math.round((this.lean ? 2 : 3) * sig.streams))), per = this.lean ? 140 : 320;
    const pullAng = r() * Math.PI;
    for (let i = 0; i < count; i++) {
      const len = (1300 + r() * 900) * (sig.pull ? 1.4 : 1), base = new Float32Array(per * 5);
      for (let j = 0; j < per; j++) {
        // along the stream (0..1), across, height, size, turn
        const across = (r() + r() + r() - 1.5) * 60;
        base.set([r(), across, (r() - 0.5) * 18, 2.5 + Math.pow(r(), 3) * 14, r() * 6.283], j * 5);
      }
      const mesh = new InstancedMesh(this.geo, this.rockMat, per);
      mesh.frustumCulled = false;
      const lumps: GasLump[] = [];
      const hue = sky.neb[i % 2]!.clone().multiplyScalar(0.3);
      for (let j = 0; j < (this.lean ? 6 : 12); j++) {
        lumps.push({ x: (j / (this.lean ? 5 : 11) - 0.5) * len * 0.9, y: (r() - 0.5) * 10, z: (r() - 0.5) * 30, size: 120 + r() * 90, colour: hue.clone().multiplyScalar(0.8 + r() * 0.4), alpha: 0.22 + r() * 0.12, glow: 0, stretch: 2.2 + r(), family: 2 });
      }
      const dust = new Gas(lumps, sky.seed + i * 7);
      this.group.add(mesh, dust.mesh);
      this.streams.push({ mesh, dust, x: r() * TILE, y: (r() < 0.5 ? -1 : 1) * (60 + r() * 160), z: r() * TILE, ang: sig.pull ? pullAng + (r() - 0.5) * 0.15 : r() * Math.PI, len, speed: ((4 + r() * 6) * (sig.pull ? 2.5 : 1)) / len, base });
    }
  }

  /** `rocks`: how many rocks the system holds, for how much belt to draw. */
  update(camera: Camera, cx: number, cz: number, dt: number, motion: boolean, rocks: number): void {
    if (motion) this.t += dt;
    // ease the belt in and out with the field, so a jump never pops it
    const want = Math.min(1, Math.max(0, (rocks - 4) / (FULL - 4)));
    this.k += (want - this.k) * Math.min(1, dt * 0.8);
    const k = this.k, u = this.glitterMat.uniforms;
    u.uTime!.value = this.t;
    u.uK!.value = k * this.gk;
    const c = u.uCentre!.value as { x: number; y: number; z: number };
    c.x = cx; c.z = cz;
    this.glitter.visible = k * this.gk > 0.01;
    const e = this.m.elements;
    for (const s of this.streams) {
      const on = k > 0.01;
      s.mesh.visible = on;
      s.dust.update(on ? k : 0, this.t, dt, camera);
      if (!on) continue;
      const ox = cx + wrap(s.x - cx), oz = cz + wrap(s.z - cz);
      const ca = Math.cos(s.ang), sa = Math.sin(s.ang);
      s.dust.mesh.position.set(ox, s.y, oz);
      s.dust.mesh.rotation.y = -s.ang;
      // a thin field shows a thin stream: fewer stones, never smaller ones
      const b = s.base, n = (s.mesh.count = Math.max(1, Math.round((b.length / 5) * k)));
      for (let j = 0; j < n; j++) {
        const along = ((((b[j * 5]! + this.t * s.speed) % 1) + 1) % 1 - 0.5) * s.len, across = b[j * 5 + 1]!;
        // the ends of a stream thin away instead of stopping
        const end = 1 - Math.pow(Math.abs(along / (s.len * 0.5)), 6);
        const sz = b[j * 5 + 3]! * end, turn = b[j * 5 + 4]! + this.t * 0.2;
        const cr = Math.cos(turn) * sz, sr = Math.sin(turn) * sz;
        e[0] = cr; e[1] = 0; e[2] = -sr; e[3] = 0;
        e[4] = 0; e[5] = sz * 0.7; e[6] = 0; e[7] = 0;
        e[8] = sr; e[9] = 0; e[10] = cr; e[11] = 0;
        e[12] = ox + ca * along - sa * across; e[13] = s.y + b[j * 5 + 2]!; e[14] = oz + sa * along + ca * across; e[15] = 1;
        s.mesh.setMatrixAt(j, this.m);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

function wrap(v: number): number {
  return ((((v + TILE / 2) % TILE) + TILE) % TILE) - TILE / 2;
}
