import {
  AdditiveBlending, Color, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Sprite, SpriteMaterial, Vector3,
} from 'three';
import { dirOf, skyLayout, type Sky } from './sky';
import { singularity } from './singularity';
import { glowTexture } from './textures';

// ── what happens in the deep ──────────────────────────────────────────────
// The sky's rare and passing things, all at infinity with the far bodies:
//
//   kept      a black hole with its disc (rare), an energy rift (rare), a storm
//             cell inside one of the nebulae that throws lightning now and then
//   passing   a shooting star, a meteor shower, a far flash (a reactor going, a
//             mining charge), a few far lights crossing the sky slowly
//
// Each region leans its own way (PHENOM): the Hollows have their rifts, the
// Breaker Yards their flashes, the Free Ports their traffic. Most skies keep
// at most one of the kept things, so the deep stays dark and mostly empty.
// Nothing is made per frame: the passing things are a small pool, reused.
// Reduced motion keeps what is there and lets nothing pass.

interface Lean {
  hole: number;
  rift: number;
  storm: number;
  /** Shooting stars and showers, and far flashes: each a mean gap in seconds (0 never). */
  meteors: number;
  flashes: number;
  /** Far lights crossing the sky. */
  movers: number;
}

// by palette (render/sky.ts PALETTES)
const PHENOM: Lean[] = [
  { hole: 0.06, rift: 0.04, storm: 0.25, meteors: 40, flashes: 0, movers: 2 }, // the Reach: tidy, lit lanes
  { hole: 0.08, rift: 0.08, storm: 0.35, meteors: 35, flashes: 90, movers: 1 }, // the Marches
  { hole: 0.1, rift: 0.45, storm: 0.2, meteors: 0, flashes: 0, movers: 0 }, // the Hollows: nothing human
  { hole: 0.15, rift: 0.15, storm: 0.4, meteors: 30, flashes: 80, movers: 1 },
  { hole: 0.25, rift: 0.1, storm: 0.25, meteors: 30, flashes: 0, movers: 1 },
  { hole: 0.05, rift: 0.04, storm: 0.15, meteors: 14, flashes: 45, movers: 2 }, // the Salvage Belt: mining charges, showers
  { hole: 0.45, rift: 0.1, storm: 0.1, meteors: 60, flashes: 0, movers: 0 }, // the Drift Deep: the quiet, and what lives in it
  { hole: 0.06, rift: 0.04, storm: 0.3, meteors: 25, flashes: 30, movers: 1 }, // the Breaker Yards: things still going up
  { hole: 0.04, rift: 0.04, storm: 0.15, meteors: 40, flashes: 120, movers: 4 }, // the Free Ports: traffic
  { hole: 0.35, rift: 0.4, storm: 0.25, meteors: 0, flashes: 0, movers: 0 }, // the Last Lanes
];

const D = 1500;

const QUAD_V = /* glsl */ `
  uniform float uSize, uAspect;
  varying vec2 vUv;
  void main() {
    vUv = position.xy;
    vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * (c + vec4(position.x * uSize * uAspect, position.y * uSize, 0.0, 0.0));
  }`;

const NOISE2 = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm2(vec2 p) { return vnoise(p) * 0.5 + vnoise(p * 2.1 + 3.1) * 0.3 + vnoise(p * 4.3 + 7.7) * 0.2; }`;

// An energy rift: a long tear, bright and thin at the seam, its light bleeding out in torn wisps, motes drifting round it.
// The only thing in the sky with a colour split, and that only at the seam.
const RIFT_F = /* glsl */ `
  uniform float uTime; uniform vec3 uA, uB;
  varying vec2 vUv;
  ${NOISE2}
  // the tear: a long lens, pinched at both ends and torn ragged along its lips
  float lips(vec2 p) {
    float bend = (fbm2(vec2(p.y * 1.4, uTime * 0.04)) - 0.5) * 0.25;
    float w = 0.3 * max(1.0 - p.y * p.y * 1.3, 0.0) * (0.75 + 0.5 * fbm2(vec2(p.y * 6.0, uTime * 0.07 + 3.0)));
    return abs(p.x - bend) - w;
  }
  void main() {
    vec2 p = vUv;
    float e = lips(p);
    // the colour split, only on the rim
    float er = lips(p + vec2(0.008, 0.0)), eb = lips(p - vec2(0.008, 0.0));
    vec3 rim = vec3(exp(-abs(er) * 70.0), exp(-abs(e) * 70.0), exp(-abs(eb) * 70.0)) * vec3(0.95, 1.0, 1.15);
    // inside: something else's sky, slowly turning, dim
    float inside = smoothstep(0.01, -0.02, e);
    float swirl = fbm2(vec2(atan(p.y, p.x * 3.0) * 2.0 + uTime * 0.05, length(p * vec2(3.0, 1.0)) * 4.0 - uTime * 0.1));
    vec3 deep = mix(uB * 0.3, uA * 0.9, swirl * swirl) * inside;
    // outside: its light bleeding out in torn wisps
    float out1 = max(e, 0.0);
    float flow = fbm2(vec2(p.x * 5.0, p.y * 2.5 - uTime * 0.1));
    float bleed = exp(-out1 * 5.0) * (0.25 + 0.75 * flow) * (1.0 - inside);
    float wisps = smoothstep(0.5, 0.85, fbm2(p * vec2(3.0, 1.6) + vec2(uTime * 0.03, 0.0))) * exp(-out1 * 3.0) * (1.0 - inside);
    // motes: a few bright specks drifting up round it
    vec2 cell = vec2(p.x * 14.0, p.y * 9.0 + uTime * 0.25);
    vec2 ci = floor(cell), cf = fract(cell);
    float mote = hash(ci) > 0.88 ? exp(-dot(cf - 0.5, cf - 0.5) * 140.0) * exp(-out1 * 5.0) : 0.0;
    vec3 col = rim * 0.7 + deep + uA * bleed * 0.6 + uB * wisps * 0.5 + mix(uA, vec3(1.0), 0.5) * mote * 0.7;
    float edge = smoothstep(1.0, 0.7, length(p * vec2(1.2, 1.0)));
    gl_FragColor = vec4(col * edge, 1.0);
  }`;

// A storm cell in a nebula: a soft glow that wakes when a bolt goes, and the bolt itself, forked, gone in a blink.
const BOLT_F = /* glsl */ `
  uniform float uFlash, uSeed; uniform vec3 uA;
  varying vec2 vUv;
  ${NOISE2}
  float bolt(vec2 p, float s, float y0, float y1) {
    float t = clamp((p.y - y0) / (y1 - y0), 0.0, 1.0);
    float x = (fbm2(vec2(p.y * 5.0, s)) - 0.5) * 0.5 + (vnoise(vec2(p.y * 22.0, s * 3.0)) - 0.5) * 0.08;
    float inside = step(y0, p.y) * step(p.y, y1);
    return exp(-abs(p.x - x - s * 0.02) * 160.0) * inside * (1.0 - t * 0.6);
  }
  void main() {
    vec2 p = vUv;
    float r = length(p);
    float glow = exp(-r * r * 5.0) * (0.6 + 0.4 * fbm2(p * 3.0 + uSeed));
    float b = bolt(p, uSeed, -0.7, 0.6) + bolt(p * vec2(1.0, 1.0) + vec2(0.12, 0.0), uSeed + 4.0, -0.1, 0.45) * 0.6;
    vec3 col = uA * glow * 0.9 + vec3(0.85, 0.9, 1.15) * b * 0.85;
    gl_FragColor = vec4(col * uFlash, 1.0);
  }`;

// A streak: a shooting star or a meteor, bright at the head, fading back along its path.
const STREAK_F = /* glsl */ `
  uniform float uK; uniform vec3 uC;
  varying vec2 vUv;
  void main() {
    float x = vUv.x * 0.5 + 0.5;
    float head = smoothstep(uK - 0.5, uK, x) * step(x, uK);
    float w = exp(-vUv.y * vUv.y * 60.0);
    gl_FragColor = vec4(uC * head * head * w * smoothstep(1.0, 0.85, uK), 1.0);
  }`;

interface Streak { m: Mesh; mat: ShaderMaterial; t: number; dur: number }
interface Flash { s: Sprite; t: number; dur: number; peak: number }
interface Mover { s: Sprite; from: Vector3; to: Vector3; t: number; dur: number; ph: number }

function rand(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const QUAD = new PlaneGeometry(2, 2);

export class Phenomena {
  readonly group = new Group();
  /** What this sky keeps, for the review world and the docs. */
  kept: string[] = [];
  private readonly kept3: Group = new Group();
  private rift: ShaderMaterial | null = null;
  private storm: ShaderMaterial | null = null;
  private stormNext = 0;
  private stormT = -1;
  private lean: Lean = PHENOM[0]!;
  private readonly streaks: Streak[] = [];
  private readonly flashes: Flash[] = [];
  private readonly movers: Mover[] = [];
  private meteorNext = 0;
  private flashNext = 0;
  private shower = 0;
  private t = 0;
  private readonly tmp = new Vector3();
  /** With ?phenom, the forced thing is put where the camera first looks (the screenshot rig). */
  private aim: Mesh | null = null;

  constructor() {
    this.group.add(this.kept3);
    for (let i = 0; i < 6; i++) {
      const mat = new ShaderMaterial({
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: STREAK_F, uniforms: { uK: { value: 0 }, uC: { value: new Color() } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide,
      });
      const m = new Mesh(QUAD, mat);
      m.visible = false;
      m.frustumCulled = false;
      m.renderOrder = -3;
      this.streaks.push({ m, mat, t: 0, dur: 0 });
      this.group.add(m);
    }
    for (let i = 0; i < 2; i++) {
      const s = new Sprite(new SpriteMaterial({ map: glowTexture(), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 }));
      s.visible = false;
      s.renderOrder = -3;
      this.flashes.push({ s, t: 0, dur: 0, peak: 0 });
      this.group.add(s);
    }
    for (let i = 0; i < 4; i++) {
      const s = new Sprite(new SpriteMaterial({ map: glowTexture(), color: new Color(0.9, 0.95, 1.1), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.8 }));
      s.scale.setScalar(5);
      s.visible = false;
      s.renderOrder = -3;
      this.movers.push({ s, from: new Vector3(), to: new Vector3(), t: 0, dur: 1, ph: 0 });
      this.group.add(s);
    }
  }

  setSky(sky: Sky): void {
    for (const o of [...this.kept3.children]) {
      o.removeFromParent();
      if (o instanceof Mesh && o.geometry !== QUAD) o.geometry.dispose();
      if (o instanceof Mesh) (o.material as ShaderMaterial).dispose();
    }
    this.rift = this.storm = null;
    this.kept = [];
    const r = rand(sky.seed * 17 + 23);
    let lean = (this.lean = PHENOM[sky.palette ?? 0] ?? PHENOM[0]!);
    // ?phenom=hole|rift|storm|busy puts that thing in every sky (a screenshot rig, like ?near)
    const force = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('phenom');
    if (force) lean = this.lean = { ...lean, hole: force === 'hole' ? 1 : 0, rift: force === 'rift' ? 1 : 0, storm: force === 'storm' ? 1 : lean.storm, meteors: force === 'busy' ? 3 : lean.meteors, flashes: force === 'busy' ? 4 : lean.flashes, movers: force === 'busy' ? 4 : lean.movers };
    const lay = skyLayout(sky);
    // the planet's quarter is kept clear
    const pAz = sky.planet?.az ?? r() * 360;
    const away = (k: number) => pAz + 90 + k * 70 + r() * 40;
    // at most one great thing in most skies: a hole, else a rift
    if (r() < lean.hole) {
      const tint = sky.accent.clone().lerp(sky.neb[2], 0.3).multiplyScalar(1.2);
      const hole = singularity(36 + r() * 20, tint, 0.18 + r() * 0.2);
      hole.position.copy(dirOf(away(0), -10 - r() * 16).multiplyScalar(D));
      hole.renderOrder = -3;
      this.kept3.add(hole);
      this.kept.push('black hole');
      if (force) this.aim = hole;
    } else if (r() < lean.rift) {
      const a = sky.accent.clone().lerp(new Color(0.35, 0.75, 1), 0.55), b = sky.neb[1].clone().multiplyScalar(1.4);
      this.rift = new ShaderMaterial({
        vertexShader: QUAD_V, fragmentShader: RIFT_F,
        uniforms: { uSize: { value: 180 + r() * 80 }, uAspect: { value: 0.75 }, uTime: { value: 0 }, uA: { value: a }, uB: { value: b } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide,
      });
      const m = new Mesh(QUAD, this.rift);
      m.position.copy(dirOf(away(1), -8 - r() * 18).multiplyScalar(D));
      m.rotation.z = (r() - 0.5) * 0.8;
      m.frustumCulled = false;
      m.renderOrder = -3;
      this.kept3.add(m);
      this.kept.push('rift');
      if (force) this.aim = m;
    }
    // a storm cell lodged in one of the nebulae: lightning, now and then
    if (r() < lean.storm) {
      const c = lay.clouds[Math.floor(r() * lay.clouds.length)]!;
      this.storm = new ShaderMaterial({
        vertexShader: QUAD_V, fragmentShader: BOLT_F,
        uniforms: { uSize: { value: 110 + r() * 60 }, uAspect: { value: 1 }, uFlash: { value: 0 }, uSeed: { value: r() * 10 }, uA: { value: sky.neb[2].clone().lerp(sky.accent, 0.4) } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide,
      });
      const m = new Mesh(QUAD, this.storm);
      m.position.set(c.x, c.y, c.z).normalize().multiplyScalar(D * 1.05);
      m.frustumCulled = false;
      m.renderOrder = -3;
      this.kept3.add(m);
      this.stormNext = 4 + r() * 10;
      this.kept.push('storm cell');
    }
    // the far lights: traffic on a long lane, crossing in minutes
    this.movers.forEach((mv, i) => {
      mv.s.visible = i < lean.movers;
      if (!mv.s.visible) return;
      const az = r() * 360, el = -6 - r() * 20, span = 25 + r() * 30;
      mv.from.copy(dirOf(az, el)).multiplyScalar(D);
      mv.to.copy(dirOf(az + span, el + (r() - 0.5) * 6)).multiplyScalar(D);
      mv.dur = 160 + r() * 200;
      mv.t = r() * mv.dur;
      mv.ph = r() * 6;
    });
    this.meteorNext = lean.meteors ? lean.meteors * (0.3 + r()) : Infinity;
    this.flashNext = lean.flashes ? lean.flashes * (0.3 + r()) : Infinity;
  }

  /** Where the camera looks, for the screenshot rig (see `aim`). */
  look(forward: Vector3): void {
    if (!this.aim) return;
    const az = Math.atan2(forward.z, forward.x) * 57.3 + 14;
    this.aim.position.copy(dirOf(az, -12)).multiplyScalar(D);
    this.aim = null;
  }

  update(dt: number, motion: boolean): void {
    if (dt <= 0) return;
    this.t += dt;
    if (this.rift && motion) this.rift.uniforms.uTime!.value = this.t % 1000;
    for (const mv of this.movers) {
      if (!mv.s.visible) continue;
      if (motion) mv.t = (mv.t + dt) % mv.dur;
      mv.s.position.lerpVectors(mv.from, mv.to, mv.t / mv.dur);
      // a slow beacon: steady with a brief bright beat
      mv.s.material.opacity = 0.35 + (motion ? 0.6 * Math.max(0, Math.sin(this.t * 1.6 + mv.ph)) ** 8 : 0.2);
    }
    if (!motion) {
      if (this.storm) this.storm.uniforms.uFlash!.value = 0;
      for (const s of this.streaks) s.m.visible = false;
      for (const f of this.flashes) f.s.visible = false;
      return;
    }
    // lightning: a flash, sometimes a second straight after, then quiet for a while
    if (this.storm) {
      if ((this.stormNext -= dt) <= 0) {
        this.stormT = 0;
        this.storm.uniforms.uSeed!.value = Math.random() * 10;
        this.stormNext = Math.random() < 0.35 ? 0.18 + Math.random() * 0.2 : 7 + Math.random() * 16;
      }
      if (this.stormT >= 0) {
        this.stormT += dt;
        const k = this.stormT < 0.04 ? this.stormT / 0.04 : Math.exp(-(this.stormT - 0.04) * 9);
        this.storm.uniforms.uFlash!.value = k * (0.8 + Math.random() * 0.2);
        if (this.stormT > 0.6) { this.stormT = -1; this.storm.uniforms.uFlash!.value = 0; }
      }
    }
    // shooting stars, and now and then a shower: a few in quick succession from one radiant
    if ((this.meteorNext -= dt) <= 0) {
      if (this.shower <= 0 && Math.random() < 0.18) this.shower = 3 + Math.floor(Math.random() * 4);
      this.launchStreak(this.shower > 0);
      this.meteorNext = this.shower-- > 0 ? 0.4 + Math.random() * 1.2 : this.lean.meteors * (0.5 + Math.random());
    }
    for (const s of this.streaks) {
      if (!s.m.visible) continue;
      s.t += dt;
      const k = s.t / s.dur;
      s.mat.uniforms.uK!.value = k * 1.4;
      if (k >= 1) s.m.visible = false;
    }
    // a far flash: something going up a long way off, white-gold, swelling and gone
    if ((this.flashNext -= dt) <= 0) {
      const f = this.flashes.find((x) => !x.s.visible);
      if (f) {
        f.s.position.copy(dirOf(Math.random() * 360, -4 - Math.random() * 24, this.tmp)).multiplyScalar(D);
        f.s.material.color.setRGB(1.3, 1.1, 0.85);
        f.t = 0; f.dur = 1.6 + Math.random() * 1.4; f.peak = 18 + Math.random() * 26;
        f.s.visible = true;
      }
      this.flashNext = this.lean.flashes * (0.5 + Math.random());
    }
    for (const f of this.flashes) {
      if (!f.s.visible) continue;
      f.t += dt;
      const k = f.t / f.dur;
      f.s.scale.setScalar(f.peak * (0.3 + 0.7 * Math.sqrt(k)));
      f.s.material.opacity = (k < 0.06 ? k / 0.06 : (1 - k) ** 2) * 0.9;
      if (k >= 1) f.s.visible = false;
    }
  }

  private readonly radiant = new Vector3();
  private readonly eye = new Vector3();
  private launchStreak(shower: boolean): void {
    const s = this.streaks.find((x) => !x.m.visible);
    if (!s) return;
    if (!shower || this.radiant.lengthSq() === 0 || Math.random() < 0.1) dirOf(Math.random() * 360, -4 - Math.random() * 26, this.radiant);
    // spread round the radiant: a shower's streaks share a direction of travel
    const at = this.tmp.set(this.radiant.x + (Math.random() - 0.5) * 0.25, this.radiant.y + (Math.random() - 0.5) * 0.12, this.radiant.z + (Math.random() - 0.5) * 0.25).normalize();
    s.m.position.copy(at).multiplyScalar(D);
    s.m.lookAt(this.group.getWorldPosition(this.eye));
    s.m.rotateZ(shower ? -0.5 : (Math.random() - 0.5) * 2.4);
    const len = 30 + Math.random() * 50;
    s.m.scale.set(len, 0.9, 1);
    s.mat.uniforms.uC!.value.setRGB(0.95, 0.97, 1.05).multiplyScalar(0.8 + Math.random() * 0.5);
    s.t = 0; s.dur = 0.5 + Math.random() * 0.6;
    s.m.visible = true;
  }
}
