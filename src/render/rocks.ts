import {
  Color, IcosahedronGeometry, LatheGeometry, Vector2, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion,
  Vector3, type BufferGeometry, type Scene,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { STEP } from '../core/loop';
import { fbm } from '../core/noise';
import { BULWARK_VARIANTS, ROCK_VARIANTS, type Bulwark, type Rock, type RockKind } from '../sim/field';
import { PERTURB, seeded } from './kit';

// ── rock ──────────────────────────────────────────────────────────────────
// Dark, dusty stone, split by fissures; basalt keeps a dull ember in its thinnest cracks. The shapes are built once
// at startup: an icosphere pushed out by fractal noise, with craters (a bowl
// and a raised rim) pressed into it, smooth-shaded. The surface detail is all
// in the fragment shader, in the rock's own space so it turns with the rock:
// fractal noise for the stone's colour and grain, a ridged noise for the
// crack network (thin dark lines), and the same noise as a height to perturb the normal.
//
// Three kinds share the material: the field (instanced, four shapes),
// bulwarks (individual, finer meshes) and a far backdrop of asteroids at all
// heights (instanced, cheap shapes), which is what tells the eye the sky is
// three-dimensional.

const PER_VARIANT = 48;
const BACKDROP = 90;
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

/** How a kind of rock looks: its cracks' glow, the stone's tint, how much of it is veined, how fast it pulses. */
interface RockLook {
  id: string;
  glow: [number, number, number];
  tint: [number, number, number];
  /** Added to the vein threshold: more of the rock is cracked. */
  zone: number;
  pulse: number;
  metal: number;
  /** How much of the surface is mineral inclusions (lit crystals in the stone). */
  mineral: number;
  /** Strata contrast: layered stone shows how a rock was laid down. */
  strata: number;
  /** A glancing-light rim in the glow's colour: how the rock reads as charged. */
  rim: number;
}

const LOOKS: Record<RockKind, RockLook> = {
  basalt:   { id: 'basalt',   glow: [3.6, 0.55, 0.08], tint: [1, 1, 1],         zone: 0,    pulse: 1.4, metal: 0.04, mineral: 0,   strata: 0.5, rim: 0 },
  iron:     { id: 'iron',     glow: [1.4, 0.3, 0.08],  tint: [0.72, 0.78, 0.9], zone: -0.2, pulse: 0.6, metal: 0.55, mineral: 0.25, strata: 0.9, rim: 0 },
  rich:     { id: 'rich',     glow: [2.4, 0.9, 4.2],   tint: [0.85, 0.8, 1.05], zone: 0.3,  pulse: 2.2, metal: 0.1, mineral: 1,   strata: 0.6, rim: 0.25 },
  volatile: { id: 'volatile', glow: [0.5, 1.7, 3.0],   tint: [0.82, 0.88, 1.0], zone: 0.45, pulse: 7,   metal: 0.04, mineral: 0,   strata: 0.3, rim: 0.7 },
};
const KINDS = Object.keys(LOOKS) as RockKind[];

/**
 * The lava-veined basalt. `detail` is the noise frequency per model unit (a
 * model is a unit sphere, so a bulwark ten times the size needs ten times the
 * frequency for the same grain); `lava` scales the glow; `bump` is the
 * surface relief, in world units. `look` recolours it by kind.
 */
export function lavaRock(detail: number, lava: number, bump: number, look: RockLook = LOOKS.basalt, ember = true): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: look.metal, envMapIntensity: 0.35 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = lavaTime;
    shader.uniforms.uDetail = { value: detail };
    shader.uniforms.uLava = { value: lava };
    shader.uniforms.uBump = { value: bump };
    shader.uniforms.uGlow = { value: new Color(...look.glow) };
    shader.uniforms.uTint = { value: new Color(...look.tint) };
    shader.uniforms.uZone = { value: look.zone };
    shader.uniforms.uPulse = { value: look.pulse };
    shader.uniforms.uMineral = { value: look.mineral };
    shader.uniforms.uStrata = { value: look.strata };
    shader.uniforms.uRim = { value: look.rim };
    shader.uniforms.uViolet = { value: ember && look.id === 'rich' ? 1 : 0 };
    shader.uniforms.uCool = { value: ember && look.id === 'volatile' ? 1 : 0 };
    shader.uniforms.uEmber = { value: ember && (look.id === 'basalt' || look.id === 'volatile') ? 1 : 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRockP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRockP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vRockP; uniform float uTime; uniform float uDetail; uniform float uLava; uniform float uBump;
        uniform vec3 uGlow; uniform vec3 uTint; uniform float uZone; uniform float uPulse; uniform float uMineral; uniform float uStrata; uniform float uRim; uniform float uEmber; uniform float uViolet; uniform float uCool;
        ${SIMPLEX}
        ${PERTURB}
        float rockFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * snoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }`)
      .replace('#include <map_fragment>', `
        vec3 rp = vRockP * uDetail;
        float rn = rockFbm(rp * 0.9);
        float fine = snoise(rp * 5.0) * 0.5 + snoise(rp * 9.0) * 0.12;
        // the crack network: thin ridges of a warped noise, two scales
        float ridgeA = 1.0 - abs(snoise(rp * 0.55 + vec3(rn * 0.7)));
        float ridgeB = 1.0 - abs(snoise(rp * 1.35 + vec3(7.1, 2.3, 5.9) + vec3(rn * 0.4)));
        // lava only in some regions of a rock, and only in its thinnest cracks
        float zone = smoothstep(0.15 - uZone, 0.55 - uZone, snoise(rp * 0.28 + 3.3));
        float crack = (smoothstep(0.972, 0.995, ridgeA) + smoothstep(0.982, 0.997, ridgeB) * 0.6) * zone;
        float heat = smoothstep(0.93, 0.99, max(ridgeA, ridgeB * 0.95)) * zone;
        vec3 stone = mix(vec3(0.06, 0.055, 0.05), vec3(0.24, 0.215, 0.19), smoothstep(-0.55, 0.65, rn + fine * 0.35));
        stone = mix(stone, vec3(0.32, 0.29, 0.26), smoothstep(0.55, 0.9, rn) * 0.6);
        stone = mix(stone, vec3(0.025, 0.018, 0.015), heat * 0.5);
        // strata: beds laid down in a slanted plane, warped, each its own shade; the edge of a bed catches light
        float bedPos = dot(rp, normalize(vec3(0.35, 0.9, 0.25))) * 1.7 + rn * 1.4;
        float bed = sin(bedPos * 5.0) * 0.5 + 0.5, bedId = floor(bedPos * 0.5);
        float bedTone = fract(sin(bedId * 12.9898) * 43758.5453);
        stone *= 1.0 + uStrata * ((bed - 0.5) * 0.35 + (bedTone - 0.5) * 0.5);
        float lip = smoothstep(0.86, 1.0, bed) * uStrata;
        // inclusions: lit crystals set in the stone, thresholded from fine noise
        float incl = smoothstep(0.63, 0.72, snoise(rp * vec3(1.6, 7.5, 2.2) + 4.7) * 0.6 + snoise(rp * 2.1 + 9.0) * 0.5) * uMineral * (1.0 - heat);
        stone = mix(stone, mix(vec3(0.5, 0.46, 0.42), vec3(0.2, 0.1, 0.34), uViolet), incl * 0.5);
        stone = mix(vec3(dot(stone, vec3(0.3, 0.5, 0.2))), stone, 0.5) * 0.34;
        stone *= 0.85 + 0.4 * pow(1.0 - abs(snoise(rp * 3.6 + 1.7)), 3.0);
        diffuseColor.rgb *= stone * uTint;
        float pulse = 0.78 + 0.22 * sin(uTime * uPulse + rn * 9.0);
        // cooled stone: the thinnest cracks keep a dull ember, steady and under the bloom line (basalt and volatile only)
        vec3 lavaGlow = uGlow * crack * heat * mix(0.1, 0.17, uCool) * uLava * uEmber;
        // volatile rock: a few deep pockets lit cold from under the surface, sharp and local
        float pocket = smoothstep(0.62, 0.74, snoise(rp * vec3(2.3, 2.9, 2.1) + 13.1)) * smoothstep(0.9, 0.97, max(ridgeA, ridgeB)) * uCool;
        lavaGlow += uGlow * pocket * 0.26 * uLava;
        float web = smoothstep(0.9, 0.985, max(ridgeA, ridgeB * 0.97)) * smoothstep(-0.25, 0.3, snoise(rp * 0.4 + 8.0)) * uCool;
        lavaGlow += (uGlow * 0.14 + vec3(0.1, 0.12, 0.14) * smoothstep(0.96, 0.99, max(ridgeA, ridgeB))) * web * uLava;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.03, 0.04), pocket * 0.6);
        // rich rock: violet veins through the stone and crystals set in it, steady and well under the bloom line
        float vein = (smoothstep(0.95, 0.99, ridgeA) * 0.7 + smoothstep(0.965, 0.993, ridgeB) * 0.5) * (0.25 + 0.75 * zone);
        lavaGlow += uGlow * (vein * 0.07 + incl * 0.07) * uLava * uViolet;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.06, 0.16), vein * 0.4 * uViolet);
        diffuseColor.rgb *= 1.0 - (smoothstep(0.955, 0.99, ridgeA) * 0.3 + crack * 0.3);
        // sharp crests between broken faces: a creased noise
        float crest = pow(1.0 - abs(snoise(rp * 3.0 + 1.7)), 3.0);
        float rockH = crest * 0.35 + rn * 0.55 + fine * 0.22 - crack * 0.5 + lip * 0.25 - bed * uStrata * 0.12 + mix(incl * 0.2, incl * 0.4, uViolet);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(0.8 + fine * 0.15 - heat * 0.2 - incl * 0.1 * uViolet, 0.6, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = kitPerturb(-vViewPosition, normal, rockH * uBump, faceDirection);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimK = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += lavaGlow + uGlow * rimK * (0.012 * uViolet + 0.01 * uCool) * uLava;`);
  };
  m.customProgramCacheKey = () => `stone-rock7-${detail}-${lava}-${bump}-${look.id}-${ember ? 1 : 0}`;
  return m;
}

/**
 * A rock shape of unit radius: an icosphere of the given subdivision, pushed
 * out by noise and pitted with craters, a little flattened. Smooth normals.
 */
export function rockGeometry(seed: number, detail: number, craters: number, rough = 0.42, cuts = 0): BufferGeometry {
  const g = mergeVertices(new IcosahedronGeometry(1, detail).deleteAttribute('normal').deleteAttribute('uv'), 1e-4);
  const p = g.attributes.position!;
  const v = new Vector3();
  const rnd = seeded(Math.round(seed * 1000) + 7);
  const pits = Array.from({ length: craters }, () => {
    const d = new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    return { d, size: 0.18 + rnd() * 0.32, depth: 0.05 + rnd() * 0.09 };
  });
  // fracture planes: the rock was broken off something bigger, and keeps flat faces
  const planes = Array.from({ length: cuts }, () => ({
    n: new Vector3(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.7, rnd() * 2 - 1).normalize(), d: 0.52 + rnd() * 0.22,
  }));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const big = fbm(v.x * 1.2 + seed, v.y * 1.2, v.z * 1.2, 4, seed);
    const mid = fbm(v.x * 3.1 + seed, v.y * 3.1, v.z * 3.1, 3, seed + 9);
    const ridge = 1 - Math.abs(fbm(v.x * 2.2 - seed, v.y * 2.2, v.z * 2.2, 2, seed + 4));
    let k = 1 + big * rough + mid * 0.17 + ridge * 0.1;
    for (const c of pits) {
      const a = Math.acos(Math.min(1, v.dot(c.d))) / c.size;
      if (a < 1.35) k += a < 1 ? -c.depth * (1 - a * a) : c.depth * 0.6 * Math.sin(((a - 1) / 0.35) * Math.PI);
    }
    v.multiplyScalar(k);
    for (const c of planes) { const over = v.dot(c.n) - c.d; if (over > 0) v.addScaledVector(c.n, -over * 0.94); }
    v.y *= 0.84;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A broken crystal: a six-sided prism closing to a point, every corner pushed off true, base at y = 0 and tip at y = 1. */
function shardGeometry(): BufferGeometry {
  const g = new LatheGeometry([new Vector2(0.001, 0), new Vector2(0.5, 0), new Vector2(0.46, 0.62), new Vector2(0.1, 1)], 6).toNonIndexed();
  const p = g.attributes.position!, rnd = seeded(5);
  const jit = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let j = jit.get(key);
    if (!j) { j = [(rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.3]; jit.set(key, j); }
    const top = p.getY(i) > 0.9 ? 0.4 : 1;
    p.setXYZ(i, p.getX(i) + j[0] * top, p.getY(i) + j[1], p.getZ(i) + j[2] * top);
  }
  g.computeVertexNormals();
  return g;
}

const SEATS = 4, CLUSTER = 3, SHARDS_PER_ROCK = SEATS * CLUSTER;
const MAX_SHARDS = 640;

/** Where crystals sit on a rock shape: in its hollows, spread apart, each leaning out along the surface. */
function shardSeats(g: BufferGeometry, seed: number): Matrix4[] {
  const p = g.attributes.position!, nrm = g.attributes.normal!, rnd = seeded(seed);
  const order = Array.from({ length: p.count }, (_, i) => i).sort((a, b) => Math.hypot(p.getX(a), p.getY(a), p.getZ(a)) - Math.hypot(p.getX(b), p.getY(b), p.getZ(b)));
  const hollow = order.slice(0, Math.floor(p.count * 0.45));
  const seats: Matrix4[] = [], dirs: Vector3[] = [];
  const up = new Vector3(0, 1, 0), n = new Vector3(), v = new Vector3(), q = new Quaternion(), tw = new Quaternion();
  for (let tries = 0; tries < 400 && dirs.length < SEATS; tries++) {
    const i = hollow[Math.floor(rnd() * hollow.length)]!;
    n.fromBufferAttribute(nrm, i).normalize();
    if (dirs.some((d) => d.dot(n) > 0.7)) continue;
    dirs.push(n.clone());
    v.fromBufferAttribute(p, i).addScaledVector(n, -0.06);
    q.setFromUnitVectors(up, n);
    // a little off the normal, and twisted: no two crystals lean alike
    q.premultiply(tw.setFromAxisAngle(new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), (rnd() - 0.5) * 0.7));
    // a cluster: a main crystal and two smaller ones beside it, leaning away
    const w = 0.05 + rnd() * 0.04, len = 0.1 + rnd() * 0.12;
    for (let c = 0; c < CLUSTER; c++) {
      const k = c ? 0.5 + rnd() * 0.3 : 1, qc = q.clone();
      if (c) qc.premultiply(tw.setFromAxisAngle(new Vector3(rnd() - 0.5, 0, rnd() - 0.5).normalize().cross(n).normalize(), 0.25 + rnd() * 0.5));
      const at = v.clone().addScaledVector(new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(n).normalize(), c ? 0.04 + rnd() * 0.04 : 0);
      seats.push(new Matrix4().compose(at, qc, new Vector3(w * k, len * k, w * k * (0.7 + rnd() * 0.6))));
    }
  }
  return seats;
}

export class RockView {
  /** One instanced mesh per kind per shape: meshes[kind index * ROCK_VARIANTS + variant]. */
  private readonly meshes: InstancedMesh[] = [];
  private readonly bulwarks = new Map<number, Mesh>();
  private readonly bulwarkGeo: BufferGeometry[] = [];
  private readonly bulwarkMat = lavaRock(3, 1, 0.1);
  private readonly backdrop: InstancedMesh[] = [];
  private readonly backBase: Float32Array;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly sc = new Vector3();
  private readonly axis = new Vector3();
  private readonly col = new Color();
  private readonly shards: InstancedMesh;
  private readonly seats: Matrix4[][];
  private readonly sm = new Matrix4();
  private time = 0;

  constructor(private readonly scene: Scene) {
    const shapes = Array.from({ length: ROCK_VARIANTS }, (_, k) => rockGeometry(k * 3.7 + 1, 4, 1 + (k % 2), 0.4, 8 + (k % 3)));
    this.seats = shapes.map((g, k) => shardSeats(g, 40 + k));
    // the crystals of the rich rock: one shared mesh, seated in each shape's hollows, and a few loose ones drifting near
    const crystal = new MeshStandardMaterial({ color: new Color(0.1, 0.045, 0.2), emissive: new Color(0.16, 0.05, 0.3), emissiveIntensity: 0.4, roughness: 0.22, metalness: 0.2, flatShading: true, envMapIntensity: 0.9 });
    this.shards = new InstancedMesh(shardGeometry(), crystal, MAX_SHARDS);
    this.shards.count = 0;
    this.shards.frustumCulled = false;
    scene.add(this.shards);
    for (const kind of KINDS) {
      const mat = lavaRock(1.35, 1, 0.15, LOOKS[kind]);
      for (let k = 0; k < ROCK_VARIANTS; k++) {
        const mesh = new InstancedMesh(shapes[k]!, mat, PER_VARIANT);
        mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(PER_VARIANT * 3).fill(1), 3);
        mesh.count = 0;
        mesh.frustumCulled = false;
        this.meshes.push(mesh);
        scene.add(mesh);
      }
    }
    for (let k = 0; k < BULWARK_VARIANTS; k++) this.bulwarkGeo.push(rockGeometry(k * 5.3 + 20, 5, 3 + k, 0.36, 7 + k));
    // a bulwark is a plain mesh, not an instance: hidden here so the warm-up compiles its program too
    const proxy = new Mesh(this.bulwarkGeo[0]!, this.bulwarkMat);
    proxy.visible = false;
    scene.add(proxy);

    // the backdrop: far asteroids above, below and all around
    const backMat = lavaRock(1.6, 0.8, 0.2);
    const per = Math.ceil(BACKDROP / 3);
    this.backBase = new Float32Array(per * 3 * 8);
    const rnd = seeded(99);
    for (let k = 0; k < 3; k++) {
      const mesh = new InstancedMesh(rockGeometry(k * 2.9 + 40, 2, 1, 0.42, 3), backMat, per);
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
    let ns = 0;
    for (const r of rocks) {
      const slot = KINDS.indexOf(r.kind) * ROCK_VARIANTS + r.variant;
      const mesh = this.meshes[slot]!;
      const i = counts[slot]!;
      if (i >= PER_VARIANT) continue;
      counts[slot] = i + 1;
      // no two alike: each rock is stretched its own way and takes its own shade of stone
      const h1 = hash(r.id), h2 = hash(r.id + 17), h3 = hash(r.id + 41);
      const grow = Math.min(1, r.age / 0.6);
      const s = r.r * (grow * grow * (3 - 2 * grow));
      this.q.setFromAxisAngle(this.axis.set(r.ax, r.ay, r.az), r.spin * r.age + r.id);
      this.m.compose(this.pos.set(r.x - r.vx * back, -0.3, r.z - r.vz * back), this.q, this.sc.set(s * (0.8 + 0.4 * h1), s * (0.85 + 0.3 * h2), s * (0.8 + 0.4 * h3)));
      mesh.setMatrixAt(i, this.m);
      if (r.kind === 'rich') {
        // crystals riding the rock, fewer on a small one, and a couple of loose fragments circling it
        const seats = this.seats[r.variant]!, n = Math.min(seats.length, (r.r > 2 ? 4 : r.r > 1.2 ? 3 : 2) * CLUSTER);
        for (let j = 0; j < n && ns < MAX_SHARDS; j++) this.shards.setMatrixAt(ns++, this.sm.multiplyMatrices(this.m, seats[j]!));
        for (let j = 0; j < 2 && ns < MAX_SHARDS; j++) {
          const a = this.time * (0.25 + j * 0.1) * (j ? -1 : 1) + r.id * 1.7 + j * 3, f = r.r * (1.5 + 0.25 * j), c = r.r * (0.05 + 0.03 * h3);
          this.q.setFromAxisAngle(this.axis.set(Math.sin(r.id + j), 1, Math.cos(j + r.id * 2)).normalize(), this.time * 0.6 + j);
          this.sm.compose(this.pos.set(r.x + Math.cos(a) * f, 0.4 * Math.sin(a * 1.3 + j) * r.r, r.z + Math.sin(a) * f), this.q, this.sc.set(c, c * 1.8, c));
          this.shards.setMatrixAt(ns++, this.sm);
        }
      }
      const flash = 1 + (r.hitT / 0.12) * 4;
      const tone = 0.72 + 0.5 * h2, warm = 0.92 + 0.16 * h3;
      mesh.setColorAt(i, this.col.setRGB(flash * tone * warm, flash * tone * 0.9, flash * tone * 0.84 / warm));
    }
    this.shards.count = ns;
    this.shards.instanceMatrix.needsUpdate = true;
    this.meshes.forEach((mesh, k) => {
      mesh.count = counts[k]!;
      mesh.visible = mesh.count > 0;
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

/** A steady 0..1 from an id, for each rock's own proportions and shade. */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}
