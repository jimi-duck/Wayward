import {
  AdditiveBlending, BackSide, CanvasTexture, Color, DoubleSide, Euler, EquirectangularReflectionMapping, Group, IcosahedronGeometry, InstancedMesh,
  LinearFilter, Mesh, MeshBasicMaterial, MirroredRepeatWrapping, MeshStandardMaterial, Object3D, OrthographicCamera, PlaneGeometry, Quaternion, RepeatWrapping, RingGeometry, Scene, ShaderMaterial,
  SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Vector3, Vector4, WebGLRenderTarget, type Texture, type WebGLRenderer,
} from 'three';
import { farWorks } from './farworks';
import { hulkModel } from './space';
import { glowTexture } from './textures';

// ── the sky ───────────────────────────────────────────────────────────────
// What lies beyond the field, back to front:
//
//   the painted sky   a galactic band crossed by dust lanes, and two or three
//                     nebulae: domain-warped noise, lit from within, torn by
//                     dark filaments. Baked once per system on the GPU into an
//                     equirectangular texture (3D noise over the direction, so
//                     no seam and no pinch at the poles), so it costs nothing
//                     per frame.
//   the far bodies    a planet (banded giant, rock or ice), sometimes ringed,
//                     sometimes with a moon, lit by the same sun as the ship;
//                     and one bright near star. They ride with the camera, so
//                     they keep their place in the sky wherever the ship goes.
//   parallax          a layer of nearer stars and a few nebula wisps far below
//                     the plane, and dark debris tumbling under the field.
//                     They are really out there, so they slide past slower
//                     than the rock: the field has depth.
//
// The look is a Sky: picked per system from its region's palette, or at
// random each arcade run. The colours keep clear of the signal colours
// (amber is the player, teal information, red threat), and the brightest
// cloud stays well under the HUD's text.

export interface Sky {
  seed: number;
  /** Nebula colours: the body, the second body, and the hot core. Linear RGB. */
  neb: [Color, Color, Color];
  /** The galactic band's haze. */
  band: Color;
  /** Overall nebula strength, and how much of the sky the band and clouds take. */
  glow: number;
  clouds: number;
  /** How many stars: 1 is the Reach, less further out. */
  stars: number;
  planet: Planet | null;
  /** More worlds in the same sky (the first system past Cerro, `industrial`). */
  extra?: Planet[];
  /** The bright near star's colour. */
  star: Color;
  /** A warmer knot in the clouds: the second body turned toward magenta where it is blue or violet. */
  accent: Color;
  /** Which palette painted it (0 to 9): the region's identity, for what else shows in its sky. */
  palette?: number;
}

export interface Planet {
  kind: 0 | 1 | 2; // gas giant, rock, ice
  colA: Color;
  colB: Color;
  atmo: Color;
  /** Angular radius in degrees, and where it sits: azimuth and elevation in degrees. */
  size: number;
  az: number;
  el: number;
  ring: boolean;
  moon: boolean;
  /** How far off it hangs (the sky sphere's radius): nearer reads bigger and brighter, further small and cold. */
  dist?: number;
}

interface Palette {
  neb: [string, string, string];
  band: string;
  planets: [string, string, string][];
  star: string;
  stars: number;
  glow: number;
}

// Per region, then extras the arcade also draws from. Hex is sRGB; the bake works in linear.
const PALETTES: Palette[] = [
  // the Reach: cold blues and violet, Kellern's tidy space
  { neb: ['#24357a', '#5a3a9a', '#a9c6ff'], band: '#4a5677', planets: [['#3b5f8f', '#b8c6d8', '#7aa6ff'], ['#6e6a7e', '#2d2a3a', '#9aa8ff']], star: '#d6e4ff', stars: 1, glow: 1 },
  // the Marches: dusky rose and indigo, a frontier sunset
  { neb: ['#6a2a64', '#2c2a72', '#f0b6d8'], band: '#5e4a5c', planets: [['#8a6a5a', '#d8c2a8', '#ffb8d0'], ['#5a4a6a', '#a89ab8', '#d8a8ff']], star: '#fff0e0', stars: 0.85, glow: 1.05 },
  // the Hollows: sour green and bruise violet, nothing human
  { neb: ['#2a5a3a', '#3a1f5c', '#c8ffb0'], band: '#3a4a40', planets: [['#3a4a2e', '#8a9a6a', '#b0ff9a'], ['#2a2236', '#6a5a7a', '#a890ff']], star: '#e8ffe0', stars: 0.6, glow: 1.1 },
  // arcade extras
  { neb: ['#3a2a7a', '#7a2a6a', '#ffd0f0'], band: '#504a6a', planets: [['#6a5a9a', '#d0c0e8', '#e0a8ff']], star: '#f0e8ff', stars: 1, glow: 1.1 },
  { neb: ['#1f4a6a', '#5a2a7a', '#d0e8ff'], band: '#40506a', planets: [['#c8d8e8', '#6a8aa8', '#c0e0ff']], star: '#ffffff', stars: 1.1, glow: 0.95 },
  // the long journey's other regions (5 to 9), each a little less human
  // the Salvage Belt: tarnished amber dust, trader lamps
  { neb: ['#6a4a2a', '#3a2a24', '#e8c89a'], band: '#5a4a3c', planets: [['#7a5a3a', '#c8a880', '#ffd8a0']], star: '#fff2d8', stars: 0.8, glow: 1 },
  // the Drift Deep: cold indigo, few stars, nothing near
  { neb: ['#1a2a5a', '#2a1a4a', '#7aa0e0'], band: '#34405a', planets: [['#2a3a5a', '#7a8aa8', '#7aa0ff']], star: '#cfe0ff', stars: 0.7, glow: 0.95 },
  // the Breaker Yards: iron, rust haze, hard light
  { neb: ['#5a3a2a', '#2a2a3a', '#e8a888'], band: '#4a4448', planets: [['#5a4a44', '#a89a90', '#ffb090']], star: '#ffe8d8', stars: 0.75, glow: 1 },
  // the Free Ports: warm smoke and lamplight
  { neb: ['#6a4a1a', '#2a3a5a', '#ffd890'], band: '#5a5040', planets: [['#7a5a2a', '#d8b878', '#ffc870']], star: '#fff0d0', stars: 0.8, glow: 1.1 },
  // the Last Lanes: near black, a thin violet, almost no stars
  { neb: ['#2a1a4a', '#0a2a2a', '#d0b0ff'], band: '#2a2a3a', planets: [['#1a1a2a', '#5a4a7a', '#b890ff']], star: '#e8e0ff', stars: 0.4, glow: 1.15 },
];

/** The palettes the arcade draws from at random (the original five). */
const ARCADE = [0, 1, 2, 3, 4];

function rand(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** A string to a seed. */
export function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The sky for a seed: a region's palette (0 to 9), or any of the arcade's (null). */
export function skyFor(seed: number, region: number | null): Sky {
  const r = rand(seed);
  const i = region === null ? ARCADE[Math.floor(r() * ARCADE.length)]! : Math.max(0, Math.min(PALETTES.length - 1, region));
  return { ...paint(seed, r, PALETTES[i]!), palette: i };
}

/** How many palettes there are: the three regions' and the arcade's extras. */
export const PALETTE_COUNT = PALETTES.length;

/** The sky for a seed in one named palette (the review world's switch; the game draws through skyFor). */
export function skyIn(seed: number, palette: number): Sky {
  const i = Math.max(0, Math.min(PALETTES.length - 1, palette));
  return { ...paint(seed, rand(seed), PALETTES[i]!), palette: i };
}

const STEEL = new Color('#4a5a6e');
const HSL = { h: 0, s: 0, l: 0 };

/** The second body's hue pulled toward magenta when it is blue or violet; other palettes keep their own hue, a little lighter. */
function accentOf(c: Color): Color {
  c.getHSL(HSL);
  const h = HSL.h > 0.55 && HSL.h < 0.86 ? HSL.h + (0.86 - HSL.h) * 0.5 : HSL.h;
  return new Color().setHSL(h, Math.min(1, HSL.s * 1.1), Math.min(0.5, HSL.l * 1.25));
}

function paint(seed: number, r: () => number, p: Palette): Sky {
  const lin = (hex: string) => new Color(hex);
  // the palettes keep their hue but sit nearer a cool steel grey, so every sky shares one mood
  const calm = (hex: string) => new Color(hex).lerp(STEEL, 0.3);
  const pp = p.planets[Math.floor(r() * p.planets.length)]!;
  // most systems have a world in view; a few are just the deep
  const planet: Planet | null = r() < 0.85 ? {
    kind: (r() < 0.5 ? 0 : r() < 0.6 ? 1 : 2) as 0 | 1 | 2,
    colA: lin(pp[0]), colB: lin(pp[1]), atmo: lin(pp[2]),
    size: 4 + r() * 5, az: r() * 360, el: -8 - r() * 16,
    ring: r() < 0.45, moon: r() < 0.6,
  } : null;
  const neb: [Color, Color, Color] = [calm(p.neb[0]), calm(p.neb[1]), calm(p.neb[2])];
  const glow = p.glow * (0.85 + r() * 0.3), clouds = 0.8 + r() * 0.4;
  // now and then a second, much smaller world far off, so the deep is not always one planet
  const extra: Planet[] | undefined = r() < 0.3 ? [{
    kind: (r() < 0.5 ? 1 : 2) as 1 | 2, colA: lin(pp[1]), colB: lin(pp[0]), atmo: lin(pp[2]),
    size: 1.3 + r() * 1.1, az: (planet ? planet.az + 90 + r() * 180 : r() * 360), el: -10 - r() * 22, ring: false, moon: r() < 0.3, dist: 2600,
  }] : undefined;
  return { seed: seed % 9973, neb, band: lin(p.band), glow, clouds, stars: p.stars, planet, extra, star: lin(p.star), accent: accentOf(neb[1]) };
}

/** A direction from azimuth and elevation in degrees. */
export function dirOf(az: number, el: number, out = new Vector3()): Vector3 {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  return out.set(Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a));
}

// Ashima's 3D simplex noise (MIT), and fractal sums of it.
const NOISE = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
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
    i = mod289(i);
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
  }
  // 0 to 1
  float fbm(vec3 p, int oct) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 7; i++) {
      if (i >= oct) break;
      s += a * snoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 4.1);
      a *= 0.5;
    }
    return s * 0.5 + 0.5;
  }
`;

const BAKE = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uSeed, uGlow, uClouds, uStars, uMode;
  uniform vec3 uNebA, uNebB, uNebC, uNebD, uBand, uBandN;
  uniform vec4 uKnot;
  uniform vec4 uC[5];
  ${NOISE}
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }

  // one nebula: a warped cloud gathered round a direction, torn by dark filaments, threaded with bright wisps and a few hot knots
  vec3 nebula(vec3 d, vec3 c, float r, float s, inout float shade) {
    float m = exp(-(1.0 - dot(d, c)) / r);
    if (m < 0.004) return vec3(0.0);
    vec3 q = d * 2.2 + s;
    vec3 w = vec3(fbm(q, 4), fbm(q + 5.2, 4), fbm(q + 9.7, 4));
    vec3 q2 = d * 3.4 + w * 2.2 + s;
    float n = fbm(q2, 6);
    float body = smoothstep(0.4, 0.85, n * (0.55 + m * 0.75)) * m;
    float hue = fbm(q2 * 1.6 + 3.0, 4);
    float core = pow(smoothstep(0.55, 0.95, n), 3.0) * m * m;
    // thin bright ridges inside the gas: where it is folded, it catches the light
    float ridge = 1.0 - abs(snoise(q2 * 2.3 + w * 1.4));
    ridge = pow(ridge, 3.0) * (0.6 + 0.4 * (1.0 - abs(snoise(q2 * 5.1 + 2.0))));
    // dark filaments torn through it
    float lane = smoothstep(0.55, 0.78, fbm(d * 7.0 + w * 3.0 + s, 5));
    shade = max(shade, lane * m * 0.75);
    vec3 tint = mix(uNebA, uNebB, smoothstep(0.3, 0.7, hue));
    tint = mix(tint, vec3(dot(tint, vec3(0.3, 0.5, 0.2))), 0.15);
    // a few knots lean to the accent (magenta in the blue and violet skies)
    tint = mix(tint, uNebD, smoothstep(0.6, 0.85, hue) * 0.75);
    float wisp = ridge * smoothstep(0.35, 0.7, n) * m;
    return tint * body * 1.0 + tint * wisp * 0.3 + uNebC * (core * 0.4 + wisp * wisp * 0.12);
  }

  // the detail tile: three fields of fine wisps, seamless round the sky (u runs on a circle), mirrored over the poles (v).
  // The dome lays it over the baked cloud at two scales and slides it, so the gas keeps changing.
  vec3 detail(vec2 uv) {
    float a = uv.x * 6.2831853;
    vec3 p = vec3(cos(a) * 1.9, sin(a) * 1.9, uv.y * 5.97);
    vec3 o = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      vec3 q = p + float(i) * vec3(7.3, 3.1, 11.7);
      float f = fbm(q * 1.4, 5);
      float ridge = pow(1.0 - abs(snoise(q * 2.2 + f)), 3.0);
      o[i] = clamp(f * 0.7 + ridge * 0.3, 0.0, 1.0);
    }
    return o;
  }

  void main() {
    if (uMode > 0.5) { gl_FragColor = vec4(detail(vUv), 1.0); return; }
    float phi = (vUv.x - 0.5) * 6.2831853, th = (vUv.y - 0.5) * 3.1415927;
    vec3 d = vec3(cos(th) * cos(phi), sin(th), cos(th) * sin(phi));
    vec3 s = vec3(uSeed * 0.137, uSeed * 0.071, uSeed * 0.193);

    // the deep: not quite black, a breath of the palette
    vec3 col = mix(vec3(0.03, 0.04, 0.06), uNebB * 0.045, fbm(d * 1.5 + s, 3));
    // enormous, faint: the far side of the nebula, a wash of the first colour at a very large scale
    col += uNebA * 0.05 * smoothstep(0.45, 0.8, fbm(d * 0.9 + s * 1.3 + 2.0, 3));

    // the galactic band: unresolved stars and dust along a great circle, lanes through the middle
    float bd = dot(d, uBandN);
    float band = exp(-bd * bd * 18.0);
    float haze = band * (0.4 + 0.8 * fbm(d * 4.0 + s, 5));
    col += uBand * haze * 0.22 * uClouds;
    float lanes = smoothstep(0.5, 0.72, fbm(d * vec3(9.0, 9.0, 9.0) + s * 2.0, 5)) * exp(-bd * bd * 60.0);

    float shade = lanes * 0.85;
    vec3 neb = vec3(0.0);
    for (int i = 0; i < 5; i++) neb += nebula(d, uC[i].xyz, uC[i].w, uSeed + float(i) * 11.0, shade) * (1.0 - float(i) * 0.12);
    col += neb * uGlow;
    // now and then a lit heart in a cloud: young stars inside the gas, lighting it from within (the brightest thing the
    // sky paints, still well under the HUD's text)
    if (uKnot.w > 0.0) {
      float kd = 1.0 - dot(d, uKnot.xyz);
      float lit = exp(-kd / 0.02) * uKnot.w;
      col += neb * lit * 2.2 + mix(uNebC, uNebD, 0.3) * exp(-kd / 0.0012) * uKnot.w * 0.5;
      shade *= 1.0 - exp(-kd / 0.004) * 0.6;
    }
    col *= 1.0 - shade;

    // pinprick stars too small for points: thicker in the band
    vec3 cell = floor(d * 900.0);
    float h = hash(cell + s);
    float dens = (0.012 + band * 0.05) * uStars;
    if (h < dens) {
      float b = pow(hash(cell * 1.7 + 3.0), 3.0);
      col += mix(vec3(0.9, 0.95, 1.0), vec3(1.0, 0.9, 0.8), hash(cell + 9.0)) * (0.02 + b * 0.12) * (1.0 - shade * 0.8);
    }
    // a little dither so the dark gradients never band
    col += (hash(vec3(gl_FragCoord.xy, uSeed)) - 0.5) * 0.0015;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

/**
 * The baking pass: one material, one quad, kept for the life of the page. A
 * material disposed after each bake would drop its program with it, and the
 * heaviest shader in the game would compile again for every system.
 */
let baker: { scene: Scene; camera: OrthographicCamera; uniforms: Record<string, { value: unknown }> } | null = null;

function bakePass() {
  if (baker) return baker;
  const mat = new ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: BAKE,
    uniforms: {
      uSeed: { value: 0 }, uGlow: { value: 0 }, uClouds: { value: 0 }, uStars: { value: 0 }, uMode: { value: 0 },
      uNebA: { value: new Color() }, uNebB: { value: new Color() }, uNebC: { value: new Color() }, uNebD: { value: new Color() },
      uBand: { value: new Color() }, uBandN: { value: new Vector3() },
      uC: { value: [0, 1, 2, 3, 4].map(() => new Vector4()) }, uKnot: { value: new Vector4() },
    },
    depthTest: false, depthWrite: false,
  });
  const scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(2, 2), mat));
  return (baker = { scene, camera: new OrthographicCamera(), uniforms: mat.uniforms });
}

/** Where a sky's clouds and its galactic band lie: five clouds spread round the compass, and the band's pole. */
export function skyLayout(sky: Sky): { clouds: Vector4[]; bandN: Vector3; seed: number } {
  const r = rand(sky.seed * 7 + 3);
  // five clouds spread round the compass, so every heading has one in view,
  // where the camera looks: round the horizon and below it
  const az0 = r() * 360;
  const clouds = [0, 1, 2, 3, 4].map((i) => {
    const d = dirOf(az0 + i * 72 + (r() - 0.5) * 40, -32 + r() * 38);
    return new Vector4(d.x, d.y, d.z, (0.05 + r() * 0.07) * sky.clouds);
  });
  // the band tilts down through the view somewhere round the compass
  const bandN = dirOf(r() * 360, 25 + r() * 40);
  return { clouds, bandN, seed: sky.seed % 97 + r() * 10 };
}

/** Paint a sky into an equirectangular texture, on the GPU. The caller owns (and disposes) the target. */
export function bakeSky(renderer: WebGLRenderer, sky: Sky, width = 2048): WebGLRenderTarget {
  const target = new WebGLRenderTarget(width, width / 2, { colorSpace: SRGBColorSpace, magFilter: LinearFilter, minFilter: LinearFilter, generateMipmaps: false, depthBuffer: false });
  target.texture.mapping = EquirectangularReflectionMapping;
  const lay = skyLayout(sky);
  const pass = bakePass(), u = pass.uniforms;
  (u.uC!.value as Vector4[]).forEach((c, i) => c.copy(lay.clouds[i]!));
  (u.uBandN!.value as Vector3).copy(lay.bandN);
  u.uMode!.value = 0;
  u.uSeed!.value = lay.seed;
  // a lit heart in one of the clouds, in about a third of skies (the violet palettes more often)
  const kr = rand(sky.seed * 19 + 7), knot = u.uKnot!.value as Vector4;
  if (kr() < (sky.palette === 0 || sky.palette === 1 || sky.palette === 3 ? 0.5 : 0.3)) {
    const c = lay.clouds[Math.floor(kr() * 5)]!, d = new Vector3(c.x + (kr() - 0.5) * 0.15, c.y + (kr() - 0.5) * 0.1, c.z + (kr() - 0.5) * 0.15).normalize();
    knot.set(d.x, d.y, d.z, 0.5 + kr() * 0.5);
  } else knot.set(0, 1, 0, 0);
  u.uGlow!.value = sky.glow; u.uClouds!.value = sky.clouds; u.uStars!.value = sky.stars;
  (u.uNebA!.value as Color).copy(sky.neb[0]); (u.uNebB!.value as Color).copy(sky.neb[1]); (u.uNebC!.value as Color).copy(sky.neb[2]);
  (u.uNebD!.value as Color).copy(sky.accent);
  (u.uBand!.value as Color).copy(sky.band);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(pass.scene, pass.camera);
  renderer.setRenderTarget(prev);
  return target;
}

/**
 * The detail tile the dome lays over every sky: fine wisps in three channels, the same for every system. Baked once, on
 * the baking pass's own program (no second shader to compile), and only on Medium and High.
 */
let tile: WebGLRenderTarget | null = null;
export function detailTile(renderer: WebGLRenderer): Texture {
  if (tile) return tile.texture;
  tile = new WebGLRenderTarget(1024, 512, { magFilter: LinearFilter, minFilter: LinearFilter, generateMipmaps: false, depthBuffer: false });
  tile.texture.wrapS = RepeatWrapping;
  tile.texture.wrapT = MirroredRepeatWrapping;
  const pass = bakePass();
  pass.uniforms.uMode!.value = 1;
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(tile);
  renderer.render(pass.scene, pass.camera);
  renderer.setRenderTarget(prev);
  pass.uniforms.uMode!.value = 0;
  return tile.texture;
}

// ── the far bodies ────────────────────────────────────────────────────────

const PLANET_V = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec3 vV;
  void main() {
    vP = position;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const PLANET_F = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec3 vV;
  uniform vec3 uA, uB, uAtmo, uL; uniform float uKind, uSeed, uDim, uAir;
  ${NOISE}
  void main() {
    vec3 p = normalize(vP), n = normalize(vN);
    vec3 s = vec3(uSeed * 0.31, uSeed * 0.17, uSeed * 0.53);
    vec3 col;
    if (uKind < 0.5) {
      // a gas giant: bands stirred into storms
      float w = fbm(p * vec3(2.0, 7.0, 2.0) + s, 5);
      float t = p.y * 7.0 + w * 2.6;
      float bands = 0.5 + 0.5 * sin(t * 2.0) * (0.6 + 0.4 * sin(t * 0.7 + 1.0));
      col = mix(uA, uB, bands);
      col *= 0.8 + 0.4 * fbm(p * vec3(4.0, 22.0, 4.0) + s, 4);
    } else if (uKind < 1.5) {
      // rock: plains and highlands, old craters as mottling
      float h = fbm(p * 2.6 + s, 6);
      col = mix(uA, uB, smoothstep(0.4, 0.6, h));
      col *= 0.6 + 0.7 * fbm(p * 10.0 + s, 4);
      // old craters: pale rims round dark floors
      float cr = fbm(p * 18.0 + s * 2.0, 2);
      col *= 1.0 - smoothstep(0.62, 0.7, cr) * 0.35 + smoothstep(0.56, 0.6, cr) * smoothstep(0.64, 0.6, cr) * 0.3;
    } else {
      // ice: pale, cracked
      float h = fbm(p * 3.0 + s, 5);
      col = mix(uB, uA, smoothstep(0.45, 0.7, h) * 0.6);
      col *= 0.85 + 0.3 * smoothstep(0.48, 0.5, fbm(p * 9.0 + s, 3));
    }
    // weather: thin cloud over rock and ice worlds that hold some air, torn into streaks and lit white
    if (uKind > 0.5) {
      float warp = fbm(p * 2.0 + s, 3);
      float cl = smoothstep(0.5, 0.95, fbm(p * vec3(2.4, 11.0, 2.4) + vec3(warp * 1.4) + s * 1.7 + 4.0, 5)) * smoothstep(0.35, 0.7, fbm(p * 1.6 + s * 0.6, 3));
      col = mix(col, vec3(0.78, 0.8, 0.84), cl * (0.12 + 0.3 * uAir));
    }
    float l = dot(n, uL);
    float day = smoothstep(-0.08, 0.5, l);
    float fres = pow(1.0 - max(dot(n, vV), 0.0), 2.5);
    // twilight: a warm band where day becomes night, and a faint glow of the dark side, with a few city lights on a rock world
    float dusk = smoothstep(-0.18, 0.0, l) * smoothstep(0.34, 0.04, l);
    float city = uKind > 0.5 && uKind < 1.5 ? smoothstep(0.78, 0.84, fbm(p * 38.0 + s, 3)) * smoothstep(0.6, 0.35, fbm(p * 2.6 + s, 4)) * (1.0 - day) : 0.0;
    vec3 c = col * day * 0.95 + col * 0.018 + uAtmo * fres * smoothstep(-0.35, 0.45, l) * uAir * 0.34
      + vec3(0.55, 0.26, 0.12) * dusk * fres * uAir * 0.5 + vec3(0.7, 0.5, 0.25) * city * 0.22;
    gl_FragColor = vec4(c * uDim, 1.0);
  }`;

const HALO_F = /* glsl */ `
  varying vec3 vN; varying vec3 vP; varying vec3 vV;
  uniform vec3 uAtmo, uL; uniform float uDim, uAir;
  void main() {
    vec3 n = normalize(vN);
    float edge = -dot(n, normalize(vV));
    float a = pow(smoothstep(0.0, 0.46, edge), 2.0);
    float lit = smoothstep(-0.45, 0.55, dot(n, uL));
    gl_FragColor = vec4(uAtmo * a * lit * 0.2 * uAir * uDim, 1.0);
  }`;

const RING_V = /* glsl */ `
  varying vec2 vR; varying vec3 vW;
  void main() {
    vR = position.xy;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const RING_F = /* glsl */ `
  varying vec2 vR; varying vec3 vW;
  uniform vec3 uA, uB, uCentre, uL; uniform float uIn, uOut, uSeed, uDim, uRad;
  float h(float x) { return fract(sin(x * 127.1 + uSeed) * 43758.5453); }
  void main() {
    float r = (length(vR) - uIn) / (uOut - uIn);
    float k = r * 14.0, i = floor(k), f = fract(k);
    float wide = mix(h(i), h(i + 1.0), smoothstep(0.0, 1.0, f));
    float k2 = r * 70.0, i2 = floor(k2), f2 = fract(k2);
    float fine = mix(h(i2 + 40.0), h(i2 + 41.0), smoothstep(0.0, 1.0, f2));
    float band = wide * 0.7 + fine * 0.3;
    float gaps = smoothstep(0.015, 0.05, abs(r - 0.62)) * smoothstep(0.0, 0.1, r) * smoothstep(1.0, 0.8, r);
    float a = (0.35 + 0.65 * band) * gaps * 0.6;
    // the planet's shadow across the far side of the ring
    vec3 rel = vW - uCentre;
    float along = dot(rel, uL);
    float off = length(rel - uL * along);
    float shadow = along < 0.0 ? smoothstep(uRad * 0.92, uRad * 1.02, off) : 1.0;
    vec3 c = mix(uA, uB, band) * 0.5 * shadow;
    gl_FragColor = vec4(c * a * uDim, a);
  }`;

const UP = new Vector3(0, 1, 0);

/** The far bodies: a planet (with its halo, maybe rings and a moon) and one bright near star. */
export class FarBodies {
  readonly group = new Group();
  private readonly mats: ShaderMaterial[] = [];
  private readonly sun: Vector3;
  private dimNow = 1;

  constructor(sky: Sky, sun: Vector3) {
    this.sun = sun.clone().normalize();
    const r = rand(sky.seed * 13 + 5);
    const D = 1800;
    const p = sky.planet;
    for (const pl of [...(p ? [p] : []), ...(sky.extra ?? [])]) {
      const Dp = pl.dist ?? D;
      const at = dirOf(pl.az, pl.el).multiplyScalar(Dp);
      const rad = Dp * Math.sin(pl.size * Math.PI / 180);
      const body = new Group();
      body.position.copy(at);
      // a tilt, so bands and rings sit at an angle
      body.rotation.set((r() - 0.5) * 0.9, r() * Math.PI * 2, (r() - 0.5) * 0.9);
      // each world has its own phase: most lit from the sun's side, some a half, a few a thin crescent with the air lit round
      // the dark limb (the sun nearly behind them)
      const ph = r(), turn = ph < 0.55 ? 0 : ph < 0.8 ? 1.2 + r() * 0.5 : 2.3 + r() * 0.5;
      const lit = this.sun.clone().applyAxisAngle(UP, turn * (r() < 0.5 ? -1 : 1));
      const common = { uL: { value: lit }, uDim: { value: 1 }, uAir: { value: pl.kind === 1 ? 0.35 : 1 } };
      const planetMat = new ShaderMaterial({
        vertexShader: PLANET_V, fragmentShader: PLANET_F,
        uniforms: { ...common, uA: { value: pl.colA }, uB: { value: pl.colB }, uAtmo: { value: pl.atmo }, uKind: { value: pl.kind }, uSeed: { value: sky.seed % 50 } },
      });
      const halo = new ShaderMaterial({
        vertexShader: PLANET_V, fragmentShader: HALO_F, side: BackSide, transparent: true, blending: AdditiveBlending, depthWrite: false,
        uniforms: { ...common, uAtmo: { value: pl.atmo } },
      });
      const sphere = new Mesh(new SphereGeometry(rad, 64, 32), planetMat);
      const shell = new Mesh(new SphereGeometry(rad * 1.12, 48, 24), halo);
      body.add(sphere, shell);
      this.mats.push(planetMat, halo);
      if (pl.ring) {
        const inner = rad * 1.35, outer = rad * (2 + r() * 0.5);
        const ringMat = new ShaderMaterial({
          vertexShader: RING_V, fragmentShader: RING_F, side: DoubleSide, transparent: true, depthWrite: false,
          uniforms: { ...common, uA: { value: pl.colA }, uB: { value: pl.colB }, uCentre: { value: at }, uIn: { value: inner }, uOut: { value: outer }, uSeed: { value: sky.seed % 31 }, uRad: { value: rad } },
        });
        const ring = new Mesh(new RingGeometry(inner, outer, 128, 1), ringMat);
        ring.rotation.x = -Math.PI / 2 + 0.25;
        body.add(ring);
        this.mats.push(ringMat);
      }
      this.group.add(body);
      if (pl.moon) {
        const moonMat = new ShaderMaterial({
          vertexShader: PLANET_V, fragmentShader: PLANET_F,
          uniforms: { ...common, uAir: { value: 0 }, uA: { value: new Color(0.16, 0.16, 0.17) }, uB: { value: new Color(0.42, 0.41, 0.4) }, uAtmo: { value: new Color(0, 0, 0) }, uKind: { value: 1 }, uSeed: { value: sky.seed % 23 + 7 } },
        });
        const moon = new Mesh(new SphereGeometry(rad * (0.12 + r() * 0.1), 32, 16), moonMat);
        moon.position.copy(dirOf(pl.az + (r() < 0.5 ? -1 : 1) * pl.size * (1.6 + r() * 0.8), pl.el + (r() - 0.3) * pl.size).multiplyScalar(Dp * 0.96));
        this.group.add(moon);
        this.mats.push(moonMat);
      }
    }
    // a bright near star, away from the planet, with a soft glow and a spike
    const az = (p ? p.az + 120 + r() * 120 : r() * 360), el = -6 - r() * 18;
    const flare = new Sprite(new SpriteMaterial({ map: glowTexture(), color: sky.star.clone().multiplyScalar(1.6), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    flare.position.copy(dirOf(az, el).multiplyScalar(D));
    flare.scale.setScalar(D * 0.05);
    const spike = new Sprite(new SpriteMaterial({ map: spikeTexture(), color: sky.star.clone().multiplyScalar(1.1), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    spike.scale.setScalar(D * 0.11);
    spike.position.copy(flare.position);
    this.group.add(flare, spike, farWorks(sky, D));
    this.group.traverse((o) => { o.renderOrder = -3; o.frustumCulled = false; });
  }

  /** Dim the far bodies (a nebula closing in), 0 to 1. */
  dim(v: number): void {
    if (Math.abs(v - this.dimNow) < 0.005) return;
    this.dimNow = v;
    for (const m of this.mats) m.uniforms.uDim!.value = v;
    this.group.traverse((o) => { if (o instanceof Sprite) o.material.opacity = v; });
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof Mesh) { o.geometry.dispose(); (o.material as ShaderMaterial).dispose(); }
      if (o instanceof Sprite) o.material.dispose();
    });
  }
}

let spike: Texture | null = null;
/** A four-point diffraction spike, white. */
function spikeTexture(): Texture {
  if (spike) return spike;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  for (const [w, h] of [[128, 3], [3, 128]] as const) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,.9)');
    grad.addColorStop(0.3, 'rgba(255,255,255,.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(64 - w / 2, 64 - h / 2, w, h);
  }
  spike = new CanvasTexture(c);
  return spike;
}

// ── parallax ──────────────────────────────────────────────────────────────

const WISP_BOX = 900;
/** The far rock clusters: a wide box, so a cluster hangs hundreds of units off and rides past slowly. */
const FAR_BOX = 2400;
const FAR_ROCKS = 150;
const DEBRIS_BOX = 260;
const HULK_BOX = 1100;

/** Nearer stars, nebula wisps far below the plane, and debris under the field: things that slide past at their own depth. */
export class Parallax {
  readonly group = new Group();
  private readonly wisps: { s: Sprite; alpha: number; x: number; y: number; z: number; turn: number }[] = [];
  /** Far rock clusters: dark silhouettes, one draw, that fade into the haze by their own colour (the scene fog cannot reach them). */
  private readonly far: InstancedMesh;
  private readonly farRocks: { x: number; y: number; z: number; s: number; q: Quaternion }[] = [];
  private farX = NaN;
  private farZ = NaN;
  private thin = false;
  private readonly debris: InstancedMesh;
  private readonly rocks: { x: number; y: number; z: number; s: number; ax: Vector3; spin: number }[] = [];
  private readonly dummy = new Object3D();
  /** The dead: two to four hulks of the fleets' own designs, huge and cold, far under the plane, each tumbling on its own slow axis. Scenery, never in the sim. */
  private readonly hulks: { g: Group; x: number; y: number; z: number; ax: Vector3; spin: number; phase: number }[] = [];
  private t = 0;

  constructor() {
    this.debris = new InstancedMesh(rockGeometry(), new MeshStandardMaterial({ color: 0x1d1b1a, roughness: 0.95, metalness: 0.1, flatShading: true }), 46);
    this.debris.frustumCulled = false;
    for (let i = 0; i < this.debris.count; i++) {
      this.rocks.push({
        x: Math.random() * DEBRIS_BOX, y: -26 - Math.random() * 60, z: Math.random() * DEBRIS_BOX,
        s: 0.4 + Math.pow(Math.random(), 2) * 2.4,
        ax: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), spin: (Math.random() - 0.5) * 0.6,
      });
    }
    this.group.add(this.debris);
    this.far = new InstancedMesh(rockGeometry(), new MeshBasicMaterial({ color: 0xffffff, fog: false }), FAR_ROCKS);
    this.far.frustumCulled = false;
    this.far.renderOrder = -4;
    this.group.add(this.far);
  }

  /** Low tier: half the wisps and far rocks. */
  setThin(low: boolean): void {
    this.thin = low;
    this.far.count = low ? FAR_ROCKS >> 1 : FAR_ROCKS;
    this.wisps.forEach((w, i) => { w.s.visible = !low || i % 2 === 0; });
    this.farX = NaN;
  }

  /** The wisps take the sky's colours. */
  setSky(sky: Sky): void {
    for (const w of this.wisps) { w.s.material.dispose(); w.s.removeFromParent(); }
    this.wisps.length = 0;
    for (const h of this.hulks) h.g.removeFromParent();
    this.hulks.length = 0;
    const hr = rand(sky.seed * 5 + 9), n = 2 + Math.floor(hr() * 3);
    for (let i = 0; i < n; i++) {
      const g = hulkModel(Math.floor(hr() * 5)), size = 34 + hr() * 30;
      g.scale.setScalar(size);
      g.quaternion.setFromEuler(new Euler(hr() * 6, hr() * 6, hr() * 6));
      // a fraction of a degree a second, each its own way round
      this.hulks.push({ g, x: hr() * HULK_BOX, y: -95 - hr() * 90, z: hr() * HULK_BOX, ax: new Vector3(hr() - 0.5, hr() - 0.5, hr() - 0.5).normalize(), spin: (0.004 + hr() * 0.008) * (hr() < 0.5 ? -1 : 1), phase: hr() * 6 });
      this.group.add(g);
    }
    const r = rand(sky.seed * 3 + 1);
    for (let i = 0; i < 12; i++) {
      // violet, blue and a little magenta, each its own strength: a few brighter, most faint
      const c = (i % 4 === 3 ? sky.accent : sky.neb[i % 2]!).clone().multiplyScalar(0.8 + r() * 0.4);
      const alpha = 0.18 + Math.pow(r(), 1.6) * 0.42;
      const s = new Sprite(new SpriteMaterial({ map: wispTexture(i % 3), color: c, blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: alpha, rotation: r() * Math.PI * 2 }));
      s.scale.setScalar(220 + r() * 280);
      s.renderOrder = -1;
      s.frustumCulled = false;
      s.visible = !this.thin || i % 2 === 0;
      this.wisps.push({ s, alpha, x: r() * WISP_BOX, y: -180 - r() * 200, z: r() * WISP_BOX, turn: (r() - 0.5) * 0.006 });
      this.group.add(s);
    }
    // far rock clusters: a few knots of small rock, each its own place, size and tilt; colder and darker the further out
    const fr = rand(sky.seed * 11 + 4), knots = 4 + Math.floor(fr() * 2);
    this.farRocks.length = 0;
    const base = new Color(), shade = new Color(0x1a2030).lerp(sky.neb[0], 0.18);
    const cx = Array.from({ length: knots }, () => ({ x: fr() * FAR_BOX, z: fr() * FAR_BOX, y: -330 - fr() * 260, w: 70 + fr() * 110 }));
    for (let i = 0; i < FAR_ROCKS; i++) {
      const k = cx[i % knots]!, a = fr() * Math.PI * 2, d = Math.sqrt(fr()) * k.w;
      this.farRocks.push({ x: k.x + Math.cos(a) * d * 1.6, y: k.y + (fr() - 0.5) * k.w * 0.5, z: k.z + Math.sin(a) * d * 1.6, s: 3 + Math.pow(fr(), 2.2) * 14, q: new Quaternion().setFromEuler(new Euler(fr() * 6, fr() * 6, fr() * 6)) });
      this.far.setColorAt(i, base.copy(shade).multiplyScalar(0.55 + fr() * 0.7));
    }
    this.far.instanceColor!.needsUpdate = true;
    this.farX = NaN;
  }

  /** Dim the wisps (a nebula closing in), 0 to 1. */
  dim(v: number): void {
    for (const w of this.wisps) w.s.material.opacity = w.alpha * v;
  }

  update(cx: number, cz: number, dt: number): void {
    this.t += dt;
    for (const w of this.wisps) {
      w.s.position.set(cx + wrap(w.x - cx, WISP_BOX) - WISP_BOX / 2, w.y, cz + wrap(w.z - cz, WISP_BOX) - WISP_BOX / 2);
      // the gas turns, very slowly
      w.s.material.rotation += w.turn * dt;
    }
    // the far rocks hold still but for the ship's travel: matrices are rebuilt only when the ship has moved a little
    if (!(Math.abs(cx - this.farX) < 0.5 && Math.abs(cz - this.farZ) < 0.5)) {
      this.farX = cx; this.farZ = cz;
      const f = this.dummy, h = FAR_BOX / 2;
      for (let i = 0; i < this.farRocks.length; i++) {
        const k = this.farRocks[i]!;
        f.position.set(cx + wrap(k.x - cx * 0.6, FAR_BOX) - h, k.y, cz + wrap(k.z - cz * 0.6, FAR_BOX) - h);
        f.quaternion.copy(k.q);
        f.scale.setScalar(k.s);
        f.updateMatrix();
        this.far.setMatrixAt(i, f.matrix);
      }
      this.far.instanceMatrix.needsUpdate = true;
    }
    for (const k of this.hulks) {
      k.g.position.set(cx + wrap(k.x - cx, HULK_BOX) - HULK_BOX / 2, k.y, cz + wrap(k.z - cz, HULK_BOX) - HULK_BOX / 2);
      k.g.quaternion.premultiply(this.dummy.quaternion.setFromAxisAngle(k.ax, k.spin * dt));
    }
    const d = this.dummy, h = DEBRIS_BOX / 2;
    for (let i = 0; i < this.rocks.length; i++) {
      const k = this.rocks[i]!;
      d.position.set(cx + wrap(k.x - cx, DEBRIS_BOX) - h, k.y, cz + wrap(k.z - cz, DEBRIS_BOX) - h);
      d.quaternion.setFromAxisAngle(k.ax, this.t * k.spin + i);
      d.scale.setScalar(k.s);
      d.updateMatrix();
      this.debris.setMatrixAt(i, d.matrix);
    }
    this.debris.instanceMatrix.needsUpdate = true;
  }
}

function rockGeometry() {
  const g = new IcosahedronGeometry(1, 1);
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 0.75 + 0.5 * Math.abs(Math.sin(x * 4.1 + y * 2.3) * Math.cos(z * 3.7 - x));
    p.setXYZ(i, x * n, y * n * 0.8, z * n);
  }
  g.computeVertexNormals();
  return g;
}

const wisps: Texture[] = [];
/** A ragged cloud, white, soft all round: tinted for the nebula wisps. Three shapes: a broad veil, a streak, a knotted bank. */
function wispTexture(kind: number): Texture {
  if (wisps[kind]) return wisps[kind]!;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!, r = rand(77 + kind * 19);
  const n = [60, 90, 40][kind]!;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, dd = Math.pow(r(), 0.7) * 80;
    // the streak lies along one line; the bank gathers in knots; the veil spreads
    const x = kind === 1 ? 128 + (r() - 0.5) * 190 : 128 + Math.cos(a) * dd * 1.3;
    const y = kind === 1 ? 128 + (r() - 0.5) * 26 + Math.sin((x - 128) * 0.03) * 14 : 128 + Math.sin(a) * dd * (kind === 2 ? 1.0 : 0.7);
    const rad = (kind === 1 ? 10 : 20) + r() * (kind === 2 ? 70 : 50);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(255,255,255,${kind === 2 ? 0.12 : 0.1})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, 256, 256);
  return (wisps[kind] = new CanvasTexture(c));
}

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}

/**
 * The first system past Cerro's sky: a spent mine's parent world and its neighbours. A near ringed giant with a moon, a
 * small rock world further out and a cold ice moon-world beyond it, at different sizes and distances. `bearing` is the
 * course's heading in radians, so the giant stands off the course on the left and the others to the right of it.
 */
export function industrial(sky: Sky, bearing: number): Sky {
  const lin = (hex: string) => new Color(hex);
  const course = -(bearing * 180) / Math.PI;
  return {
    ...sky,
    planet: { kind: 0, colA: lin('#6e6252'), colB: lin('#c4b49a'), atmo: lin('#ffc890'), size: 10.5, az: course - 48, el: -13, ring: true, moon: true, dist: 1500 },
    extra: [
      { kind: 1, colA: lin('#4e463e'), colB: lin('#8e8476'), atmo: lin('#b8b0a4'), size: 3.4, az: course + 38, el: -9, ring: false, moon: true, dist: 2300 },
      { kind: 2, colA: lin('#8fa6b8'), colB: lin('#dce7ef'), atmo: lin('#bfe0ff'), size: 2.1, az: course + 112, el: -19, ring: false, moon: false, dist: 2700 },
    ],
  };
}
