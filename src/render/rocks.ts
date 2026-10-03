import {
  Color, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion,
  Vector3, type BufferGeometry, type Scene,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { STEP } from '../core/loop';
import { fbm } from '../core/noise';
import { BULWARK_VARIANTS, ROCK_VARIANTS, type Bulwark, type Rock } from '../sim/field';
import { PERTURB, seeded } from './kit';

// ── rock ──────────────────────────────────────────────────────────────────
// Dark basalt, split by fissures of glowing lava. The shapes are built once
// at startup: an icosphere pushed out by fractal noise, with craters (a bowl
// and a raised rim) pressed into it, smooth-shaded. The surface detail is all
// in the fragment shader, in the rock's own space so it turns with the rock:
// fractal noise for the stone's colour and grain, a ridged noise for the
// crack network (thin lines glow lava-hot and pulse slowly; the stone near
// them is scorched), and the same noise as a height to perturb the normal.
//
// Three kinds share the material: the field (instanced, four shapes),
// bulwarks (individual, finer meshes) and a far backdrop of asteroids at all
// heights (instanced, cheap shapes), which is what tells the eye the sky is
// three-dimensional.

const PER_VARIANT = 48;
const BACKDROP = 150;
const BACK_BOX = 760;

/** GLSL 3D simplex noise (after Ashima Arts / Stefan Gustavson, MIT). */
const SIMPLEX = /* glsl */ `
  vec3 m289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 m289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return m289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = m289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }`;

export const lavaTime = { value: 0 };

/**
 * The lava-veined basalt. `detail` is the noise frequency per model unit (a
 * model is a unit sphere, so a bulwark ten times the size needs ten times the
 * frequency for the same grain); `lava` scales the glow; `bump` is the
 * surface relief, in world units.
 */
function lavaRock(detail: number, lava: number, bump: number): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.04, envMapIntensity: 0.35 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = lavaTime;
    shader.uniforms.uDetail = { value: detail };
    shader.uniforms.uLava = { value: lava };
    shader.uniforms.uBump = { value: bump };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRockP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRockP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vRockP; uniform float uTime; uniform float uDetail; uniform float uLava; uniform float uBump;
        ${SIMPLEX}
        ${PERTURB}
        float rockFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * snoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }`)
      .replace('#include <map_fragment>', `
        vec3 rp = vRockP * uDetail;
        float rn = rockFbm(rp * 0.9);
        float fine = snoise(rp * 6.0) * 0.5 + snoise(rp * 14.0) * 0.25;
        // the crack network: thin ridges of a warped noise, two scales
        float ridgeA = 1.0 - abs(snoise(rp * 0.55 + vec3(rn * 0.7)));
        float ridgeB = 1.0 - abs(snoise(rp * 1.35 + vec3(7.1, 2.3, 5.9) + vec3(rn * 0.4)));
        // lava only in some regions of a rock, and only in its thinnest cracks
        float zone = smoothstep(0.15, 0.55, snoise(rp * 0.28 + 3.3));
        float crack = (smoothstep(0.972, 0.995, ridgeA) + smoothstep(0.982, 0.997, ridgeB) * 0.6) * zone;
        float heat = smoothstep(0.93, 0.99, max(ridgeA, ridgeB * 0.95)) * zone;
        vec3 stone = mix(vec3(0.05, 0.045, 0.042), vec3(0.2, 0.18, 0.16), smoothstep(-0.55, 0.65, rn + fine * 0.35));
        stone = mix(stone, vec3(0.32, 0.29, 0.26), smoothstep(0.55, 0.9, rn) * 0.6);
        stone = mix(stone, vec3(0.025, 0.018, 0.015), heat * 0.75);
        diffuseColor.rgb *= stone;
        float pulse = 0.78 + 0.22 * sin(uTime * 1.4 + rn * 9.0);
        vec3 lavaGlow = (vec3(3.6, 0.55, 0.08) * crack * pulse + vec3(0.5, 0.06, 0.01) * heat * 0.4) * uLava;
        float rockH = rn * 0.55 + fine * 0.22 - crack * 0.5;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(0.8 + fine * 0.15 - heat * 0.2, 0.4, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = kitPerturb(-vViewPosition, normal, rockH * uBump, faceDirection);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += lavaGlow;`);
  };
  m.customProgramCacheKey = () => `lava-rock-${detail}-${lava}-${bump}`;
  return m;
}

/**
 * A rock shape of unit radius: an icosphere of the given subdivision, pushed
 * out by noise and pitted with craters, a little flattened. Smooth normals.
 */
function rockGeometry(seed: number, detail: number, craters: number, rough = 0.42): BufferGeometry {
  const g = mergeVertices(new IcosahedronGeometry(1, detail).deleteAttribute('normal').deleteAttribute('uv'), 1e-4);
  const p = g.attributes.position!;
  const v = new Vector3();
  const rnd = seeded(Math.round(seed * 1000) + 7);
  const pits = Array.from({ length: craters }, () => {
    const d = new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    return { d, size: 0.18 + rnd() * 0.32, depth: 0.05 + rnd() * 0.09 };
  });
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const big = fbm(v.x * 1.2 + seed, v.y * 1.2, v.z * 1.2, 4, seed);
    const mid = fbm(v.x * 3.1 + seed, v.y * 3.1, v.z * 3.1, 3, seed + 9);
    const ridge = 1 - Math.abs(fbm(v.x * 2.2 - seed, v.y * 2.2, v.z * 2.2, 2, seed + 4));
    let k = 1 + big * rough + mid * 0.1 + ridge * 0.06;
    for (const c of pits) {
      const a = Math.acos(Math.min(1, v.dot(c.d))) / c.size;
      if (a < 1.35) k += a < 1 ? -c.depth * (1 - a * a) : c.depth * 0.6 * Math.sin(((a - 1) / 0.35) * Math.PI);
    }
    v.multiplyScalar(k);
    v.y *= 0.84;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export class RockView {
  private readonly meshes: InstancedMesh[] = [];
  private readonly bulwarks = new Map<number, Mesh>();
  private readonly bulwarkGeo: BufferGeometry[] = [];
  private readonly bulwarkMat = lavaRock(4.5, 1, 0.3);
  private readonly backdrop: InstancedMesh[] = [];
  private readonly backBase: Float32Array;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly sc = new Vector3();
  private readonly axis = new Vector3();
  private readonly col = new Color();
  private time = 0;

  constructor(private readonly scene: Scene) {
    const mat = lavaRock(1.35, 1, 0.12);
    for (let k = 0; k < ROCK_VARIANTS; k++) {
      const mesh = new InstancedMesh(rockGeometry(k * 3.7 + 1, 4, 4 + k), mat, PER_VARIANT);
      mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(PER_VARIANT * 3).fill(1), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.meshes.push(mesh);
      scene.add(mesh);
    }
    for (let k = 0; k < BULWARK_VARIANTS; k++) this.bulwarkGeo.push(rockGeometry(k * 5.3 + 20, 5, 9 + k * 2, 0.36));

    // the backdrop: far asteroids above, below and all around
    const backMat = lavaRock(1.6, 0.8, 0.2);
    const per = Math.ceil(BACKDROP / 3);
    this.backBase = new Float32Array(per * 3 * 8);
    const rnd = seeded(99);
    for (let k = 0; k < 3; k++) {
      const mesh = new InstancedMesh(rockGeometry(k * 2.9 + 40, 2, 2), backMat, per);
      mesh.frustumCulled = false;
      this.backdrop.push(mesh);
      scene.add(mesh);
      for (let i = 0; i < per; i++) {
        const j = (k * per + i) * 8;
        const x = rnd() * BACK_BOX, z = rnd() * BACK_BOX;
        const y = (rnd() < 0.5 ? -1 : 1) * (35 + Math.pow(rnd(), 1.5) * 140);
        const s = 2 + Math.pow(rnd(), 3) * 16;
        const ax = rnd() * 2 - 1, ay = rnd() * 2 - 1, az = rnd() * 2 - 1, n = Math.hypot(ax, ay, az) || 1;
        this.backBase.set([x, y, z, s, ax / n, ay / n, az / n, (rnd() - 0.5) * 0.2], j);
      }
    }
  }

  /** Draw the field, `alpha` of a step past the simulated positions' previous step. */
  update(rocks: readonly Rock[], bulwarks: readonly Bulwark[], alpha: number, dt: number, cx: number, cz: number): void {
    this.time += dt;
    lavaTime.value = this.time;
    const counts = new Array<number>(this.meshes.length).fill(0);
    const back = (1 - alpha) * STEP;
    for (const r of rocks) {
      const mesh = this.meshes[r.variant]!;
      const i = counts[r.variant]!;
      if (i >= PER_VARIANT) continue;
      counts[r.variant] = i + 1;
      const grow = Math.min(1, r.age / 0.6);
      const s = r.r * (grow * grow * (3 - 2 * grow));
      this.q.setFromAxisAngle(this.axis.set(r.ax, r.ay, r.az), r.spin * r.age + r.id);
      this.m.compose(this.pos.set(r.x - r.vx * back, -0.3, r.z - r.vz * back), this.q, this.sc.set(s, s, s));
      mesh.setMatrixAt(i, this.m);
      const flash = 1 + (r.hitT / 0.12) * 4;
      mesh.setColorAt(i, this.col.setRGB(flash, flash * 0.8, flash * 0.7));
    }
    this.meshes.forEach((mesh, k) => {
      mesh.count = counts[k]!;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    // bulwarks: one mesh each, made as they come into the field
    const seen = new Set<number>();
    for (const b of bulwarks) {
      seen.add(b.id);
      let mesh = this.bulwarks.get(b.id);
      if (!mesh) {
        mesh = new Mesh(this.bulwarkGeo[b.variant % this.bulwarkGeo.length]!, this.bulwarkMat);
        this.scene.add(mesh);
        this.bulwarks.set(b.id, mesh);
      }
      mesh.position.set(b.x - b.vx * back, -0.5, b.z - b.vz * back);
      mesh.quaternion.setFromAxisAngle(this.axis.set(b.ax, b.ay, b.az), b.spin * b.age + b.id);
      mesh.scale.setScalar(b.r);
    }
    for (const [id, mesh] of this.bulwarks) {
      if (seen.has(id)) continue;
      mesh.removeFromParent();
      this.bulwarks.delete(id);
    }

    // the backdrop wraps around the camera, far out in the fog
    const per = this.backdrop[0]!.count, B = this.backBase, h = BACK_BOX / 2;
    this.backdrop.forEach((mesh, k) => {
      for (let i = 0; i < per; i++) {
        const j = (k * per + i) * 8;
        const x = cx + wrap(B[j]! - cx, BACK_BOX) - h, z = cz + wrap(B[j + 2]! - cz, BACK_BOX) - h;
        this.q.setFromAxisAngle(this.axis.set(B[j + 4]!, B[j + 5]!, B[j + 6]!), B[j + 7]! * this.time + i);
        const s = B[j + 3]!;
        this.m.compose(this.pos.set(x, B[j + 1]!, z), this.q, this.sc.set(s, s, s));
        mesh.setMatrixAt(i, this.m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
}

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}
