import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Group, LatheGeometry, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, PointLight, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, Vector2, Vector3,
  type Object3D, type Texture,
} from 'three';
import { clamp, lerp } from '../core/math';
import { breakEase, type ShipState } from '../sim/ship';
import { BREAK_TIME, ROLL_TIME } from '../sim/tuning';
import type { V3 } from './kit';
import { glowTexture } from './textures';
import { animateLamps, buildWayward, MODEL_SCALE, type BuiltHull, type Nozzle } from './wayward';

// ── the player's ship ─────────────────────────────────────────────────────
// The Wayward in flight: her model (wayward.ts) on a banking, pitching rig,
// with her drives' glow, plumes and trails, running lights and the shield.

/** Engines: white-hot at the core, ion blue in the bell. */
const CORE = new Color(1.9, 3.0, 4.4);
const BELL = new Color(0.16, 0.85, 3.3);
const HALO = new Color(0.07, 0.33, 1.4);

/**
 * The drive's face, looking in: a dark recessed throat, a ring of twelve segments that chase round on the throttle, slow stator vanes
 * turning in front of a deep blue core, and a small hot centre that only whitens at full burn. Colours come from the engine's
 * (stock or cosmetic) core and bell, and stay under the bloom ceiling so the metal round it keeps its shape.
 */
function driveMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    side: DoubleSide, toneMapped: false,
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 }, uPhase: { value: 0 }, uKick: { value: 0 }, uCore: { value: CORE.clone() }, uBell: { value: BELL.clone() }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; uniform float uTime; uniform float uPhase; uniform float uKick; uniform vec3 uCore; uniform vec3 uBell; uniform float uScale;
      varying vec2 vUv;
      const float TAU = 6.2831853;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p), a = atan(p.y, p.x);
        float h = uHeat, live = 0.3 + 0.7 * h;
        // the throat falls away: dark at the lip, light only deep inside
        float depth = pow(1.0 - smoothstep(0.0, 1.0, r), 1.6);
        vec3 col = uBell * (0.035 + 0.2 * depth * live);
        // the segmented ring: twelve cells with gaps between, a bright pulse chasing round
        float cells = 12.0, f = fract(a / TAU * cells + 0.5);
        float cell = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.84, 0.94, f));
        float band = smoothstep(0.64, 0.68, r) * (1.0 - smoothstep(0.8, 0.84, r));
        float chase = 0.5 + 0.5 * cos(a * 2.0 - uTime * (1.2 + 3.2 * h) + uPhase);
        float cellLife = 0.55 + 0.45 * pow(chase, 2.0);
        col += uBell * band * cell * cellLife * (0.3 + 0.38 * live + uKick * 0.3);
        // a thin bright lip inside the ring, unbroken
        col += uBell * smoothstep(0.855, 0.87, r) * (1.0 - smoothstep(0.87, 0.89, r)) * 0.22 * live;
        // stator vanes, slowly turning: dark blades across the lit core
        float turn = uTime * (0.35 + 1.5 * h);
        float vane = smoothstep(0.34, 0.5, abs(sin((a + turn) * 3.0)));
        float core = (1.0 - smoothstep(0.0, 0.62, r));
        col += mix(uBell, uCore, smoothstep(0.35, 0.0, r)) * core * core * mix(0.35, 1.0, vane) * (0.14 + 0.28 * live + uKick * 0.25);
        // the white-hot centre only on the throttle
        col += uCore * pow(1.0 - smoothstep(0.0, 0.22, r), 2.0) * (0.06 + 0.3 * h + uKick * 0.3);
        col *= 1.0 - smoothstep(0.93, 1.0, r) * 0.85;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// ── engine plumes ─────────────────────────────────────────────────────────
// Two layers out of each nozzle: a bell of drive colour that swells just
// past the throat and tapers to nothing, and inside it a short, narrow, hot
// core with shock diamonds. Streaks drift astern through the bell; both grow
// longer and brighter on the throttle. Colours come from the engine's
// (stock or cosmetic) core and bell, and stay under the bloom ceiling.
function plumeMaterial(inner: boolean): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 }, uCore: { value: CORE }, uBell: { value: BELL }, uInner: { value: inner ? 1 : 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vAxial;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        // how far down the barrel the eye looks: the plume is thin there, so it must not paint over the drive face
        vAxial = abs(dot(normalize(normalMatrix * vec3(-1.0, 0.0, 0.0)), vV));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; uniform float uTime; uniform vec3 uCore; uniform vec3 uBell; uniform float uInner;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vAxial;
      void main() {
        float along = vUv.y; // 0 at the nozzle, 1 at the tip
        float face = clamp(abs(dot(vN, vV)), 0.0, 1.0);
        float flick = 0.88 + 0.12 * sin(uTime * 63.0 + along * 20.0) * sin(uTime * 41.0);
        float heat = (0.35 + 0.65 * uHeat) * (1.0 - 0.85 * pow(vAxial, 1.3));
        if (uInner > 0.5) {
          // the hot core: shock diamonds standing in the first third, fading out fast
          float diamonds = 0.72 + 0.28 * cos(along * 30.0 - uTime * 2.0 + sin(uTime * 9.0));
          float a = pow(1.0 - along, 2.4) * mix(0.38, 1.0, pow(face, 1.3)) * diamonds * flick * heat * 0.6;
          gl_FragColor = vec4(uCore * a, a);
          return;
        }
        // turbulence builds with distance: streaks and wisps drifting astern, none at the throat
        float streak = 0.5 + 0.5 * sin(vUv.x * 37.7 + along * 9.0 - uTime * 21.0);
        float wisp = 0.5 + 0.5 * sin(vUv.x * 18.8 - along * 6.0 - uTime * 13.0 + 1.7);
        float turb = mix(1.0, 0.55 + 0.3 * streak + 0.25 * wisp, smoothstep(0.08, 0.7, along));
        float a = pow(1.0 - along, 1.7) * mix(0.16, 1.0, pow(face, 1.6)) * flick * turb * heat * 0.9;
        vec3 c = mix(uCore, uBell, smoothstep(0.0, 0.4, along));
        gl_FragColor = vec4(c * a, a);
      }`,
  });
}

/** The bell: full width at the throat, a slight swell, then a long taper to a soft tip. Unit length along -X from the nozzle. */
function plumeGeometry(): LatheGeometry {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    pts.push(new Vector2(0.06 + 0.94 * Math.pow(1 - t, 1.25) * (1 + 0.14 * Math.sin(Math.min(t * 7, Math.PI))), t));
  }
  return new LatheGeometry(pts, 20).rotateZ(Math.PI / 2);
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
// flares blue instead of red.
function shieldMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uHit: { value: 0 }, uGrace: { value: 0 }, uTime: { value: 0 }, uCharge: { value: 0 }, uLocal: { value: 0 }, uImpact: { value: new Vector3(1, 0, 0) }, uColor: { value: new Color(2.6, 0.9, 0.35) } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uHit; uniform float uGrace; uniform float uTime; uniform float uCharge; uniform float uLocal; uniform vec3 uImpact; uniform vec3 uColor;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float hexEdge(vec2 p) {
        vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
        vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
        vec2 g = dot(a, a) < dot(b, b) ? a : b;
        g = abs(g);
        float d = max(dot(g, normalize(r)), g.x);
        return smoothstep(0.455, 0.5, d);
      }
      void main() {
        // clamped: rounding can push the dot past 1, and pow of a negative is NaN,
        // which bloom would smear across the whole frame
        float fres = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 2.5);
        vec2 uv = vec2(atan(vP.z, vP.x) * 3.0, vP.y * 9.0);
        // a blow from a known side: a bright spot and a ring running out from it over the field, the lattice bending as it passes
        float d = acos(clamp(dot(normalize(vP), uImpact), -1.0, 1.0));
        float age = 1.0 - uHit;
        float ring = exp(-pow((d - age * 2.6) / 0.34, 2.0)) * (1.0 - age);
        float spot = exp(-d * d / 0.2) * (1.0 - age) * (1.0 - age);
        float hex = hexEdge(uv * 1.6 + vec2(0.0, uTime * 0.6) + vec2(ring * 0.3 * uLocal, 0.0));
        float hitA = mix(uHit, 0.08 * uHit + ring * 1.0 + spot * 1.7, uLocal);
        float pulse = uGrace * (0.12 + 0.08 * sin(uTime * 18.0));
        // a charged shield stands faintly at the rim, so the player can see it is up
        float standing = uCharge * (0.045 + 0.02 * sin(uTime * 2.4)) * (fres * 1.6 + hex * 0.3);
        float a = (fres * 0.75 + hex * 0.26) * max(hitA, pulse) + standing;
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

const TOP = 0.66;
const MARKS: Record<string, V3[]> = {
  hull: [[-1.6, TOP, 0], [-0.4, TOP, 0], [0.8, TOP, 0], [1.7, 0.6, 0], [0, 0.1, 0.56], [0, 0.1, -0.56]],
  weapons: [[2.3, 0.1, 0.25], [2.3, 0.1, -0.25], [2.95, 0.1, 0]],
  ordnance: [[2.0, -0.3, 0], [1.2, -0.45, 0], [0.2, -0.45, 0]],
  engines: [[-2.66, -0.22, 0.86], [-2.66, -0.22, -0.86], [-1.2, -0.22, 0.86], [-1.2, -0.22, -0.86]],
  defence: [[2.0, 0.3, 0.3], [2.0, 0.3, -0.3], [-0.2, 0.4, 1.2], [-0.2, 0.4, -1.2]],
  utility: [[-1.4, TOP + 0.2, 0.3], [-0.2, TOP + 0.3, 0], [0.4, TOP + 0.2, -0.3], [1.3, TOP + 0.3, 0]],
  reactor: [[-1.0, 0.1, 0], [-0.4, 0.1, 0], [-1.0, -0.22, 0.86], [-1.0, -0.22, -0.86]],
  synergies: [[2.3, 0.1, 0], [-0.4, 0.5, 0], [-2.3, 0.1, 0]],
};
const BRIEF_ZONES: Record<string, number> = { weapons: 0.5, ordnance: 0.4, engines: 0.6, utility: 0.35, reactor: 0.35 };
const MARK = new Color(3.2, 1.8, 0.35);

// wingtip strobes: red to port, green to starboard, at slightly different rates so they never flash together
const STROBE_COLOR = [new Color(3, 0.25, 0.25), new Color(0.25, 3, 0.6)];
const STROBE_PERIOD = [2.0, 2.35];
const STROBE_PHASE = [0, 0.43];

// ── the view ──────────────────────────────────────────────────────────────
interface Engine { nozzle: Nozzle; disc: Mesh; plume: Mesh; hot: Mesh; phase: number; halo: Sprite; trail: Trail; mat: ShaderMaterial; side: number; }

export class ShipView {
  readonly root = new Group();
  private readonly yawG = new Group();
  private readonly pitchG = new Group();
  private readonly rollG = new Group();
  private readonly model: BuiltHull;
  private readonly engines: Engine[] = [];
  private readonly lights: Sprite[] = [];
  /** Attitude jets at the bow and stern: one fires on the side the turn needs, fading as the yaw rate settles. */
  private readonly jets: Array<{ sprite: Sprite; turn: number }> = [];
  private readonly shield: Mesh;
  private readonly shieldMat = shieldMaterial();
  private readonly plumeMat = plumeMaterial(false);
  private readonly hotMat = plumeMaterial(true);
  private readonly plumeMats = [this.plumeMat, this.hotMat];
  /** The engines light the ship's own stern and whatever is behind it. */
  private readonly glowLight = new PointLight(0xbfeaff, 0, 7, 2);
  /**
   * Her work lights: a warm fill from above and astern, close in, so the
   * hull the chase camera looks at always reads, plates, wear and all,
   * whichever way the sector's sun falls.
   */
  private readonly workLight = new PointLight(0xffd98a, 4, 6, 1.6);
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
  private surge = 0;
  private steer = 0;

  constructor(glow: Texture = glowTexture()) {
    this.model = buildWayward();
    this.model.root.scale.setScalar(MODEL_SCALE);
    this.rollG.add(this.model.root);
    this.model.root.traverse((o) => { if ((o as Mesh).isMesh && (o as Mesh).material instanceof MeshStandardMaterial) o.castShadow = o.receiveShadow = true; });
    const disc = new CircleGeometry(1, 24).rotateY(-Math.PI / 2);
    const plumeGeo = plumeGeometry();
    let engineNo = 0;
    for (const n of this.model.nozzles) {
      const mat = driveMaterial();
      mat.uniforms.uPhase!.value = engineNo * 1.9;
      const e: Engine = {
        nozzle: { p: [n.p[0] * MODEL_SCALE, n.p[1] * MODEL_SCALE, n.p[2] * MODEL_SCALE], r: n.r * MODEL_SCALE },
        disc: new Mesh(disc, mat),
        mat,
        side: Math.sign(n.p[2]),
        plume: new Mesh(plumeGeo, this.plumeMat),
        hot: new Mesh(plumeGeo, this.hotMat),
        phase: engineNo++ * 1.9,
        halo: new Sprite(new SpriteMaterial({ map: glow, color: this.halo, blending: AdditiveBlending, depthWrite: false })),
        trail: new Trail(),
      };
      e.plume.frustumCulled = false;
      e.hot.frustumCulled = false;
      this.rollG.add(e.disc, e.plume, e.hot, e.halo);
      this.root.add(e.trail.mesh);
      this.engines.push(e);
    }
    for (const c of STROBE_COLOR) {
      const s = new Sprite(new SpriteMaterial({ map: glow, color: c, blending: AdditiveBlending, depthWrite: false }));
      s.scale.setScalar(0.17);
      this.lights.push(s);
      this.rollG.add(s);
    }
    // bow jets fire to the outside of the turn's push, stern jets opposite, so the nose and tail swing together
    for (const [x, y, z, turn] of [[2.35, 0.1, 0.3, 1], [2.35, 0.1, -0.3, -1], [-2.5, 0.38, 0.5, -1], [-2.5, 0.38, -0.5, 1]] as const) {
      const sprite = new Sprite(new SpriteMaterial({ map: glow, color: new Color(0, 0, 0), blending: AdditiveBlending, depthWrite: false }));
      sprite.position.set(x * MODEL_SCALE, y * MODEL_SCALE, z * MODEL_SCALE + Math.sign(z) * 0.05);
      this.jets.push({ sprite, turn });
      this.rollG.add(sprite);
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

  /** The jump draws the hull out along its length and thins it (1: as built). */
  stretch(k: number): void {
    const n = 1 / Math.sqrt(k);
    this.yawG.scale.set(k, n, n);
  }

  /** Put the engines, running lights and shield on the model. */
  private place(): void {
    const S = MODEL_SCALE;
    for (const e of this.engines) {
      const [x, y, z] = e.nozzle.p, r = e.nozzle.r;
      e.disc.position.set(x + 0.04, y, z);
      e.disc.scale.setScalar(r * 0.92);
      e.plume.position.set(x - 0.1, y, z);
      e.hot.position.set(x - 0.1, y, z);
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
  flareShield(absorbed = false, fromX?: number, fromZ?: number): void {
    this.hit = 1;
    this.absorbed = absorbed;
    // the blow's bearing in the ship's own frame, so the ripple starts on the side it came from (none known: the whole field flares)
    const u = this.shieldMat.uniforms;
    if (fromX === undefined || fromZ === undefined) { u.uLocal!.value = 0; return; }
    const dx = fromX - this.yawG.position.x, dz = fromZ - this.yawG.position.z, c = Math.cos(this.yawG.rotation.y), sn = Math.sin(this.yawG.rotation.y);
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c, n = Math.hypot(lx, lz);
    if (n < 1e-4) { u.uLocal!.value = 0; return; }
    (u.uImpact!.value as Vector3).set(lx / n, 0, lz / n);
    u.uLocal!.value = 1;
  }

  /** Engine colours, HDR: the bright core and the bell around it. */
  setEngine(core: [number, number, number], bell: [number, number, number]): void {
    this.core.setRGB(...core);
    this.bell.setRGB(...bell);
    this.halo.setRGB(bell[0] * 0.42, bell[1] * 0.42, bell[2] * 0.42);
    for (const m of this.plumeMats) { m.uniforms.uCore!.value = this.core; m.uniforms.uBell!.value = this.bell; }
    for (const e of this.engines) {
      e.mat.uniforms.uCore!.value = this.core; e.mat.uniforms.uBell!.value = this.bell;
      e.trail.head.setRGB(bell[0] * 0.78, bell[1] * 0.9, bell[2] * 0.9);
      e.trail.tail.setRGB(bell[0] * 0.18, bell[1] * 0.14, bell[2] * 0.14);
    }
  }

  /** The visible state the build adds: shield charges up, rapid fire, cloaked. */
  status = { charged: 0, rapid: false, cloaked: false };

  update(s: ShipState, dt: number, reduceMotion: boolean): void {
    this.time += dt;
    this.yawG.position.set(s.x, 0, s.z);
    this.yawG.rotation.y = s.heading;

    const wantBank = clamp(-s.yawRate * 0.16, -0.6, 0.6);
    const wantPitch = -0.07 * s.thrust;
    const k = Math.min(1, 6 * dt);
    this.bank = lerp(this.bank, wantBank, k);
    this.pitch = lerp(this.pitch, wantPitch, k);
    // a throttle snap lights the drives past the steady burn for a moment, then settles
    const burn = lerp(this.heat, s.thrust, Math.min(1, 8 * dt));
    this.surge = Math.max(0, this.surge - 2.4 * dt, Math.min(1, (burn - this.heat) * 14));
    this.heat = burn;
    this.steer = lerp(this.steer, clamp(s.yawRate * 0.12, -0.3, 0.3), Math.min(1, 7 * dt));

    let roll = 0;
    if (s.rollT >= 0 && !reduceMotion) {
      const t = clamp(s.rollT / ROLL_TIME, 0, 1);
      roll = s.rollDir * Math.PI * 2 * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    }
    // the break is a loop: the nose comes up and over the top while the heading swings round
    let loop = 0, lift = 0;
    if (s.breakT >= 0 && !reduceMotion) {
      const u = clamp(s.breakT / BREAK_TIME, 0, 1);
      loop = Math.PI * 2 * breakEase(u);
      lift = Math.sin(Math.PI * u) * 0.9;
    }
    this.pitchG.rotation.z = this.pitch + loop;
    this.rollG.rotation.x = this.bank + roll;
    // a slow heave, so a ship at rest still reads as afloat
    this.pitchG.position.y = Math.sin(this.time * 1.3) * 0.03 + lift;

    const h = this.heat, flick = 1 + Math.sin(this.time * 47) * 0.05, hot = this.status.rapid ? 1.6 : 1;
    for (const m of this.plumeMats) { m.uniforms.uHeat!.value = h; m.uniforms.uTime!.value = this.time; }
    for (const e of this.engines) {
      const r = e.nozzle.r, u = e.mat.uniforms;
      u.uHeat!.value = h * hot; u.uTime!.value = this.time; u.uKick!.value = this.surge;
      // turning vectors each drive's thrust a little and works the outer one harder
      const diff = 1 + e.side * this.steer * 0.9;
      e.plume.rotation.y = e.hot.rotation.y = -this.steer * 0.9;
      // the length breathes a little, each drive on its own beat; the two stay within a few percent of each other
      const breath = flick + Math.sin(this.time * 13 + e.phase) * 0.04 * (0.4 + h);
      const len = r * (1.2 + 3.2 * h + 1.2 * this.surge) * breath * diff;
      e.plume.scale.set(len, r * 0.95, r * 0.95);
      e.hot.scale.set(len * 0.5, r * 0.36, r * 0.36);
      e.halo.scale.setScalar(r * (1.3 + 0.7 * h + 0.5 * this.surge) * flick);
    }
    // attitude jets: puff while the yaw rate is up, never when she is flying straight
    for (const j of this.jets) {
      const want = clamp(Math.max(0, j.turn * s.yawRate) * 0.9 - 0.12, 0, 1), m = j.sprite.material as SpriteMaterial;
      m.color.setRGB(0.18 * want, 0.4 * want, 0.9 * want);
      j.sprite.visible = want > 0.01;
      j.sprite.scale.setScalar(0.04 + 0.05 * want);
    }
    this.glowLight.intensity = (1.1 + 1.6 * h) * flick;
    // wingtip strobes: port and starboard on their own rates and phases, a sharp flash that dies away
    this.lights.forEach((l, i) => {
      const period = STROBE_PERIOD[i]!, u = (this.time / period + STROBE_PHASE[i]!) % 1;
      const f = reduceMotion ? 0.5 : Math.exp(-u * 7);
      const m = l.material as SpriteMaterial;
      m.color.copy(STROBE_COLOR[i]!).multiplyScalar(f);
      l.visible = f > 0.03;
    });
    animateLamps(this.time);

    this.hit = Math.max(0, this.hit - dt * 2.2);
    const st = this.status;
    const grace = st.cloaked ? 1 : s.invuln > 0 && s.rollT < 0 ? Math.min(1, s.invuln) : 0;
    const u = this.shieldMat.uniforms;
    u.uHit!.value = this.hit;
    if (this.hit <= 0) u.uLocal!.value = 0;
    u.uGrace!.value = grace;
    u.uTime!.value = this.time;
    u.uCharge!.value = st.charged;
    // a hit that got through flares red (damage); a charge or the grace after a hit stands in teal (the ship's own state)
    const tint: [number, number, number] = st.cloaked ? [0.6, 2.4, 1.3]
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
