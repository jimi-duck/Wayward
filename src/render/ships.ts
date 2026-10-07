import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, Group, Mesh,
  MeshBasicMaterial, PointLight, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, TorusGeometry, Vector3,
  type Object3D, type Texture,
} from 'three';
import { clamp, lerp } from '../core/math';
import { breakEase, type ShipState } from '../sim/ship';
import { BREAK_TIME, ROLL_TIME } from '../sim/tuning';
import type { V3 } from './kit';
import { glowTexture } from './textures';
import { buildWayward, MODEL_SCALE, type BuiltHull, type Nozzle } from './wayward';

// ── the player's ship ─────────────────────────────────────────────────────
// The Wayward in flight: her model (wayward.ts) on a banking, pitching rig,
// with her drives' glow, plumes and trails, running lights and the shield.

/** Engines: white-hot at the core, drive cyan in the bell. */
const CORE = new Color(2.6, 3.9, 4.4);
const BELL = new Color(0.3, 2.1, 3.4);
const HALO = new Color(0.2, 1.4, 2.2);

/** The drive's throat, looking in: a white-hot centre, glow falling off through stator rings. White, tinted by the engine colour. */
let vanes: Texture | null = null;
function vaneTexture(): Texture {
  if (vanes) return vanes;
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, 124);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.22, 'rgba(255,255,255,.9)');
  glow.addColorStop(0.55, 'rgba(255,255,255,.42)');
  glow.addColorStop(1, 'rgba(255,255,255,.12)');
  g.fillStyle = glow;
  g.beginPath(); g.arc(0, 0, 124, 0, Math.PI * 2); g.fill();
  // stator rings and a few struts, dark against the light
  g.strokeStyle = 'rgba(0,0,0,.55)';
  for (const [r, wd] of [[58, 5], [84, 4], [108, 6]] as const) { g.lineWidth = wd; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    g.beginPath(); g.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); g.lineTo(Math.cos(a) * 122, Math.sin(a) * 122); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 5;
  g.beginPath(); g.arc(0, 0, 123, 0, Math.PI * 2); g.stroke();
  vanes = new CanvasTexture(c);
  vanes.colorSpace = SRGBColorSpace;
  return vanes;
}

// ── engine plumes ─────────────────────────────────────────────────────────
// A cone of light out of each nozzle: dense and white-pink at the throat,
// thinning to red, longer and brighter on the throttle, flickering.
function plumeMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 }, uCore: { value: CORE }, uBell: { value: BELL } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; uniform float uTime; uniform vec3 uCore; uniform vec3 uBell;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float along = vUv.y; // 0 at the nozzle, 1 at the tip
        float edge = pow(clamp(abs(dot(vN, vV)), 0.0, 1.0), 1.6);
        float flick = 0.85 + 0.15 * sin(uTime * 63.0 + along * 20.0) * sin(uTime * 41.0);
        float a = pow(1.0 - along, 1.7) * edge * flick * (0.35 + 0.65 * uHeat);
        vec3 c = mix(uCore, uBell, smoothstep(0.0, 0.45, along));
        gl_FragColor = vec4(c * a, a);
      }`,
  });
}

// ── engine trails ─────────────────────────────────────────────────────────
const TRAIL_N = 18;
/** World units of trail at most: the close camera sits only a few units behind the ship. */
const TRAIL_LEN = 1.4;
const TRAIL_EVERY = 1 / 60;
const TRAIL_HEAD = new Color(0.4, 1.8, 2.6);
const TRAIL_TAIL = new Color(0.05, 0.3, 0.6);

class Trail {
  readonly mesh: Mesh;
  width = 0.3;
  readonly head = TRAIL_HEAD.clone();
  readonly tail = TRAIL_TAIL.clone();
  private readonly pts = new Float32Array(TRAIL_N * 3);
  private readonly heat = new Float32Array(TRAIL_N);
  private readonly pos: BufferAttribute;
  private readonly col: BufferAttribute;
  private primed = false;

  constructor() {
    const g = new BufferGeometry();
    this.pos = new BufferAttribute(new Float32Array(TRAIL_N * 6), 3);
    this.col = new BufferAttribute(new Float32Array(TRAIL_N * 6), 3);
    g.setAttribute('position', this.pos);
    g.setAttribute('color', this.col);
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setIndex(idx);
    this.mesh = new Mesh(g, new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    this.mesh.frustumCulled = false;
  }

  push(x: number, y: number, z: number, heat: number): void {
    if (!this.primed) { for (let i = 0; i < TRAIL_N; i++) this.pts.set([x, y, z], i * 3); this.primed = true; }
    this.pts.copyWithin(3, 0, (TRAIL_N - 1) * 3);
    this.heat.copyWithin(1, 0, TRAIL_N - 1);
    this.pts[0] = x; this.pts[1] = y; this.pts[2] = z; this.heat[0] = heat;
  }

  draw(x: number, y: number, z: number): void {
    this.pts[0] = x; this.pts[1] = y; this.pts[2] = z;
    const p = this.pts, P = this.pos.array as Float32Array, C = this.col.array as Float32Array;
    let run = 0;
    for (let i = 0; i < TRAIL_N; i++) {
      if (i > 0) run += Math.hypot(p[i * 3]! - p[i * 3 - 3]!, p[i * 3 + 1]! - p[i * 3 - 2]!, p[i * 3 + 2]! - p[i * 3 - 1]!);
      const fade = Math.max(0, 1 - run / TRAIL_LEN);
      const j = Math.min(i + 1, TRAIL_N - 1), k = Math.max(i - 1, 0);
      let dx = p[k * 3]! - p[j * 3]!, dz = p[k * 3 + 2]! - p[j * 3 + 2]!;
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const t = i / (TRAIL_N - 1), w = this.width * (1 - t * 0.7) * 0.5;
      const ox = -dz * w, oz = dx * w;
      P.set([p[i * 3]! + ox, p[i * 3 + 1]!, p[i * 3 + 2]! + oz, p[i * 3]! - ox, p[i * 3 + 1]!, p[i * 3 + 2]! - oz], i * 6);
      const a = this.heat[i]! * fade * fade * (1 - t) * 0.3;
      const H = this.head, T = this.tail;
      const r = (H.r + (T.r - H.r) * t) * a;
      const gg = (H.g + (T.g - H.g) * t) * a;
      const bb = (H.b + (T.b - H.b) * t) * a;
      C.set([r, gg, bb, r, gg, bb], i * 6);
    }
    this.pos.needsUpdate = true;
    this.col.needsUpdate = true;
  }
}

// ── the shield ────────────────────────────────────────────────────────────
// Unseen until it takes a hit: then a hex lattice flares, red at the rim
// (red is damage). It shimmers teal through the grace after a hit. With
// shield charges up it stands faintly blue at the rim, and a hit it absorbs
// flares blue instead of red; phased, it shimmers violet.
function shieldMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHit: { value: 0 }, uGrace: { value: 0 }, uTime: { value: 0 }, uCharge: { value: 0 }, uColor: { value: new Color(2.6, 0.9, 0.35) } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHit; uniform float uGrace; uniform float uTime; uniform float uCharge; uniform vec3 uColor;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float hexEdge(vec2 p) {
        vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
        vec2 g = dot(a, a) < dot(b, b) ? a : b;
        g = abs(g);
        float d = max(dot(g, normalize(r)), g.x);
        return smoothstep(0.42, 0.5, d);
      }
      void main() {
        // clamped: rounding can push the dot past 1, and pow of a negative is NaN,
        // which bloom would smear across the whole frame
        float fres = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5);
        vec2 uv = vec2(atan(vP.z, vP.x) * 3.0, vP.y * 9.0);
        float hex = hexEdge(uv * 1.6 + vec2(0.0, uTime * 0.6));
        float pulse = uGrace * (0.12 + 0.08 * sin(uTime * 18.0));
        // a charged shield stands faintly at the rim, so the player can see it is up
        float standing = uCharge * (0.045 + 0.02 * sin(uTime * 2.4)) * (fres * 1.6 + hex * 0.3);
        float a = (fres * 0.9 + hex * 0.5) * max(uHit, pulse) + standing;
        gl_FragColor = vec4(uColor * a, a);
      }`,
  });
}

// ── the refit bay's lights ────────────────────────────────────────────────
// While the bay is open the ship under the screen lights the part of itself
// the open tab is about, in amber (the player's hand), softly and through the
// plating, never a hologram. Model space, +X toward the bow: the prow's guns,
// the belly where the torpedo bay sits, the nacelles, the spine's modules,
// the core amidships. 'brief' (the pause card) wakes a little of each.

const TOP = 0.72;
const MARKS: Record<string, V3[]> = {
  hull: [[-1.6, TOP, 0], [-0.4, TOP, 0], [0.8, TOP, 0], [1.9, TOP, 0], [0, 0.16, 1.3], [0, 0.16, -1.3]],
  weapons: [[2.3, 0.2, 0.78], [2.3, 0.2, -0.78], [2.94, 0.18, 0]],
  ordnance: [[2.3, -0.3, 0], [1.2, -0.5, 0], [0.2, -0.5, 0]],
  engines: [[-2.64, -0.08, 1.5], [-2.64, -0.08, -1.5], [-1.4, -0.08, 1.5], [-1.4, -0.08, -1.5]],
  defence: [[2.1, 0.5, 0.9], [2.1, 0.5, -0.9], [-0.2, 0.9, 1.9], [-0.2, 0.9, -1.9]],
  utility: [[-1.4, TOP + 0.2, 0.3], [-0.2, TOP + 0.45, 0], [0.4, TOP + 0.2, -0.3], [1.6, TOP + 0.4, 0]],
  reactor: [[-1.0, 0.2, 0], [-0.4, 0.2, 0], [-1.0, -0.08, 1.5], [-1.0, -0.08, -1.5]],
  synergies: [[2.3, 0.2, 0], [-0.4, 0.4, 0], [-2.3, 0, 0]],
};
const BRIEF_ZONES: Record<string, number> = { weapons: 0.5, ordnance: 0.4, engines: 0.6, utility: 0.35, reactor: 0.35 };
const MARK = new Color(3.2, 1.8, 0.35);

// ── the view ──────────────────────────────────────────────────────────────
interface Engine { nozzle: Nozzle; disc: Mesh; core: Mesh; rim: Mesh; plume: Mesh; halo: Sprite; trail: Trail; }

export class ShipView {
  readonly root = new Group();
  private readonly yawG = new Group();
  private readonly pitchG = new Group();
  private readonly rollG = new Group();
  private readonly model: BuiltHull;
  private readonly engines: Engine[] = [];
  private readonly lights: Sprite[] = [];
  private readonly shield: Mesh;
  private readonly shieldMat = shieldMaterial();
  private readonly plumeMat = plumeMaterial();
  private readonly discMat = new MeshBasicMaterial({ color: BELL.clone(), map: vaneTexture(), side: DoubleSide, toneMapped: false });
  private readonly coreMat = new MeshBasicMaterial({ color: CORE.clone(), side: DoubleSide, toneMapped: false });
  /** The engines light the ship's own stern and whatever is behind it. */
  private readonly glowLight = new PointLight(0xbfeaff, 0, 7, 2);
  /**
   * Her work lights: a warm fill from above and astern, close in, so the
   * hull the chase camera looks at always reads, plates, wear and all,
   * whichever way the sector's sun falls.
   */
  private readonly workLight = new PointLight(0xffd9a8, 5, 6, 1.6);
  private readonly rimMat = new MeshBasicMaterial({ color: BELL.clone(), toneMapped: false });
  /** The engines' colours: stock red, or a cosmetic. */
  private readonly core = CORE.clone();
  private readonly bell = BELL.clone();
  private readonly halo = HALO.clone();
  private absorbed = false;
  /** The bay's lights: a sprite a mark, eased in and out by zone. */
  private readonly marks: Array<{ zone: string; sprite: Sprite; size: number }> = [];
  private readonly zoneLevel: Record<string, number> = {};
  /** A fit just landed on a zone: a brighter flash that dies away. */
  private readonly kick: Record<string, number> = {};
  private bank = 0;
  private pitch = 0;
  private heat = 0;
  private hit = 0;
  private trailClock = 0;
  private time = 0;

  constructor(glow: Texture = glowTexture()) {
    this.model = buildWayward();
    this.model.root.scale.setScalar(MODEL_SCALE);
    this.rollG.add(this.model.root);
    const disc = new CircleGeometry(1, 24).rotateY(-Math.PI / 2);
    const rimGeo = new TorusGeometry(1, 0.09, 6, 32).rotateY(Math.PI / 2);
    const plumeGeo = new CylinderGeometry(0.15, 1, 1, 20, 1, true).translate(0, 0.5, 0).rotateZ(Math.PI / 2);
    for (const n of this.model.nozzles) {
      const e: Engine = {
        nozzle: { p: [n.p[0] * MODEL_SCALE, n.p[1] * MODEL_SCALE, n.p[2] * MODEL_SCALE], r: n.r * MODEL_SCALE },
        disc: new Mesh(disc, this.discMat),
        core: new Mesh(disc, this.coreMat),
        rim: new Mesh(rimGeo, this.rimMat),
        plume: new Mesh(plumeGeo, this.plumeMat),
        halo: new Sprite(new SpriteMaterial({ map: glow, color: this.halo, blending: AdditiveBlending, depthWrite: false })),
        trail: new Trail(),
      };
      e.plume.frustumCulled = false;
      this.rollG.add(e.disc, e.core, e.rim, e.plume, e.halo);
      this.root.add(e.trail.mesh);
      this.engines.push(e);
    }
    for (const c of [new Color(3, 0.25, 0.25), new Color(0.25, 3, 0.6)]) {
      const s = new Sprite(new SpriteMaterial({ map: glow, color: c, blending: AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.17);
      this.lights.push(s);
      this.rollG.add(s);
    }
    for (const [zone, pts] of Object.entries(MARKS)) {
      for (const p of pts) {
        const sprite = new Sprite(new SpriteMaterial({ map: glow, color: MARK, blending: AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 }));
        sprite.position.set(p[0] * MODEL_SCALE, p[1] * MODEL_SCALE, p[2] * MODEL_SCALE);
        sprite.visible = false;
        sprite.renderOrder = 5;
        this.rollG.add(sprite);
        this.marks.push({ zone, sprite, size: zone === 'hull' || zone === 'reactor' ? 3 : 2.4 });
      }
    }
    this.shield = new Mesh(new SphereGeometry(1, 40, 20), this.shieldMat);
    this.rollG.add(this.shield, this.glowLight, this.workLight);
    this.place();
    this.pitchG.add(this.rollG);
    this.yawG.add(this.pitchG);
    this.root.add(this.yawG);
  }

  /** Put the engines, running lights and shield on the model. */
  private place(): void {
    const S = MODEL_SCALE;
    for (const e of this.engines) {
      const [x, y, z] = e.nozzle.p, r = e.nozzle.r;
      e.disc.position.set(x + 0.04, y, z);
      e.disc.scale.setScalar(r);
      e.core.position.set(x + 0.02, y, z);
      e.core.scale.setScalar(r * 0.2);
      e.rim.position.set(x + 0.01, y, z);
      e.rim.scale.setScalar(r * 0.93);
      e.plume.position.set(x, y, z);
      e.halo.position.set(x - r * 0.4, y, z);
      e.trail.width = r * 0.3;
    }
    this.glowLight.position.set(Math.min(...this.model.nozzles.map((n) => n.p[0])) * S - 1.4, 0.2, 0);
    this.workLight.position.set(-2.6, 2.2, 0.9);
    this.model.wings.forEach((w, i) => this.lights[i]!.position.set(w[0] * S, w[1] * S, w[2] * S));
    this.shield.scale.set(...(this.model.shield.map((v) => v * S) as V3));
  }

  /**
   * Light the part of the ship a bay tab is about (a tab id, 'brief' for the
   * pause card, null for none), easing in and out over about half a second.
   * `dt` is real time: the world may be waiting.
   */
  light(zone: string | null, dt: number): void {
    const k = Math.min(1, 5 * dt), t = this.time;
    for (const z of Object.keys(this.kick)) this.kick[z] = Math.max(0, this.kick[z]! - 1.6 * dt);
    for (const z of Object.keys(MARKS)) {
      const want = zone === 'brief' ? BRIEF_ZONES[z] ?? 0 : zone === z ? 1 : 0, cur = this.zoneLevel[z] ?? 0;
      this.zoneLevel[z] = cur + (want - cur) * k;
    }
    for (const m of this.marks) {
      const v = Math.min(1.6, (this.zoneLevel[m.zone] ?? 0) + (this.kick[m.zone] ?? 0) * 0.9);
      m.sprite.visible = v > 0.01;
      if (!m.sprite.visible) continue;
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.4 + m.sprite.position.x * 3);
      (m.sprite.material as SpriteMaterial).opacity = Math.min(1, v * 0.95 * pulse);
      m.sprite.scale.setScalar(m.size * MODEL_SCALE * (0.8 + 0.2 * v));
    }
    // the shield zone shows the ellipsoid itself, faintly
    if (this.zoneLevel.defence! > 0.05) this.hit = Math.max(this.hit, this.zoneLevel.defence! * 0.3);
  }

  /** A fit landed on a zone: flash its lights. */
  flashZone(zone: string): void {
    this.kick[zone] = 1;
  }

  /** The world positions of a zone's lights. */
  zonePoints(zone: string): Vector3[] {
    this.rollG.updateWorldMatrix(true, false);
    return this.marks.filter((m) => m.zone === zone).map((m) => m.sprite.getWorldPosition(new Vector3()));
  }

  /** World positions of the nozzles and how hard they are burning, for exhaust sparks. */
  exhaust(): { points: Array<[number, number, number]>; heat: number } {
    return { points: this.engines.map((e) => [...tipWorld(this.rollG, e.nozzle.p)] as [number, number, number]), heat: this.heat };
  }

  /** Flare the shield: a hit landed. `absorbed` when a shield charge took it. */
  flareShield(absorbed = false): void {
    this.hit = 1;
    this.absorbed = absorbed;
  }

  /** Engine colours, HDR: the bright core and the bell around it. */
  setEngine(core: [number, number, number], bell: [number, number, number]): void {
    this.core.setRGB(...core);
    this.bell.setRGB(...bell);
    this.halo.setRGB(bell[0] * 0.65, bell[1] * 0.65, bell[2] * 0.65);
    this.plumeMat.uniforms.uCore!.value = this.core;
    this.plumeMat.uniforms.uBell!.value = this.bell;
    for (const e of this.engines) {
      e.trail.head.setRGB(bell[0] * 0.78, bell[1] * 0.9, bell[2] * 0.9);
      e.trail.tail.setRGB(bell[0] * 0.18, bell[1] * 0.14, bell[2] * 0.14);
    }
  }

  /** The visible state the build adds: shield charges up, phased, weapons overloaded. */
  status = { charged: 0, phased: false, overload: false, cloaked: false };

  update(s: ShipState, dt: number, reduceMotion: boolean): void {
    this.time += dt;
    this.yawG.position.set(s.x, 0, s.z);
    this.yawG.rotation.y = s.heading;

    const wantBank = clamp(-s.yawRate * 0.16, -0.6, 0.6);
    const wantPitch = -0.07 * s.thrust;
    const k = Math.min(1, 6 * dt);
    this.bank = lerp(this.bank, wantBank, k);
    this.pitch = lerp(this.pitch, wantPitch, k);
    this.heat = lerp(this.heat, s.thrust, Math.min(1, 8 * dt));

    let roll = 0;
    if (s.rollT >= 0 && !reduceMotion) {
      const t = clamp(s.rollT / ROLL_TIME, 0, 1);
      roll = s.rollDir * Math.PI * 2 * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    }
    if (s.breakT >= 0 && !reduceMotion) roll = s.breakDir * Math.PI * 2 * breakEase(s.breakT / BREAK_TIME);
    this.pitchG.rotation.z = this.pitch;
    this.rollG.rotation.x = this.bank + roll;
    // a slow heave, so a ship at rest still reads as afloat
    this.pitchG.position.y = Math.sin(this.time * 1.3) * 0.03;

    const h = this.heat, flick = 1 + Math.sin(this.time * 47) * 0.05, hot = this.status.overload ? 1.6 : 1;
    this.discMat.color.copy(this.bell).multiplyScalar((0.3 + 0.35 * h) * hot);
    this.rimMat.color.copy(this.bell).multiplyScalar((0.22 + 0.3 * h) * flick * hot);
    this.coreMat.color.copy(this.core).multiplyScalar((0.22 + 0.5 * h) * flick * hot);
    this.plumeMat.uniforms.uHeat!.value = h;
    this.plumeMat.uniforms.uTime!.value = this.time;
    for (const e of this.engines) {
      const r = e.nozzle.r;
      e.plume.scale.set(r * (1.2 + 3.2 * h) * flick, r * 0.95, r * 0.95);
      e.halo.scale.setScalar(r * (1.7 + 1.1 * h) * flick);
    }
    this.glowLight.intensity = (1.1 + 1.6 * h) * flick;
    const blink = Math.sin(this.time * Math.PI * 2) > 0.6;
    for (const l of this.lights) l.visible = blink;

    this.hit = Math.max(0, this.hit - dt * 2.2);
    const st = this.status;
    const grace = st.phased || st.cloaked ? 1 : s.invuln > 0 && s.rollT < 0 ? Math.min(1, s.invuln) : 0;
    const u = this.shieldMat.uniforms;
    u.uHit!.value = this.hit;
    u.uGrace!.value = grace;
    u.uTime!.value = this.time;
    u.uCharge!.value = st.charged;
    // a hit that got through flares red (damage); a charge or the grace after a hit stands in teal (the ship's own state)
    const tint: [number, number, number] = st.phased ? [2.2, 0.8, 3.6] : st.cloaked ? [0.6, 2.4, 1.3]
      : this.hit > 0 && !this.absorbed ? [2.6, 0.55, 0.35] : this.absorbed || st.charged > 0 ? [0.7, 1.5, 3.4] : [0.45, 1.6, 1.8];
    (u.uColor!.value as Color).setRGB(...tint);
    this.shield.visible = this.hit > 0 || grace > 0 || st.charged > 0;

    this.root.updateMatrixWorld(true);
    this.trailClock += dt;
    const lay = this.trailClock >= TRAIL_EVERY;
    if (lay) this.trailClock %= TRAIL_EVERY;
    for (const e of this.engines) {
      const v = tipWorld(this.rollG, e.nozzle.p);
      if (lay) e.trail.push(v[0], v[1], v[2], 0.15 + 0.85 * h);
      e.trail.draw(v[0], v[1], v[2]);
    }
  }
}

const tmp: [number, number, number] = [0, 0, 0];
function tipWorld(o: Object3D, l: readonly number[]): [number, number, number] {
  const e = o.matrixWorld.elements;
  tmp[0] = e[0]! * l[0]! + e[4]! * l[1]! + e[8]! * l[2]! + e[12]!;
  tmp[1] = e[1]! * l[0]! + e[5]! * l[1]! + e[9]! * l[2]! + e[13]!;
  tmp[2] = e[2]! * l[0]! + e[6]! * l[1]! + e[10]! * l[2]! + e[14]!;
  return tmp;
}
