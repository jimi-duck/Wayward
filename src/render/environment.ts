import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, FogExp2,
  Group, HemisphereLight, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator,
  Scene, ShaderMaterial, SphereGeometry, Vector3, type Camera, type Texture, type WebGLRenderer, type WebGLRenderTarget,
} from 'three';
import { bakeSky, detailTile, FarBodies, Parallax, skyFor, type Sky } from './sky';
import { Starfield } from './starfield';
import { Phenomena } from './phenomena';
import { WORLD_RIM } from './kit';

// ── deep space ────────────────────────────────────────────────────────────
// No grid and no floor: just the dark. Back to front: the sky (render/sky.ts:
// a painted backdrop of galactic band and nebulae, a planet and a bright
// star, all picked per system), three layers of resolved stars at infinity,
// wisps and debris that slide past at their own depth, and space dust that
// streaks with the ship's speed. Fog is a cool
// steel haze: a hull 150 units out is still a silhouette with engines lit,
// and rock fades into the haze with distance instead of staying a cut-out.
//
// Lights: a hard warm key from high on the left (the reference's sun), a
// faint cold fill, and a dim rim from behind. Metal needs something to
// reflect, so the scene also gets a small, dark environment map: a black
// sky with a warm window where the key light is and a cold one opposite.

const VOID = new Color('#030509');
/** The distance haze: a dark, cool steel grey, so far rock fades up out of the dark instead of staying a cut-out. */
const HAZE = new Color('#25323f');
const FOG_BASE = 0.0072;
const INK = new Color('#cfd6e0');
const WHITE_LIGHT = new Color(1, 1, 1);
const NEBULA = new Color('#1b0e28');
const DUST_BOX = 130;
/** Speed (units/s) where the dust starts to streak; the hauler's top speed is about 39. */
const DUST_FAST = 20;
const KEY_TINT = new Color();
const RIM_COLOUR = new Color(0x7f9cc8), FIGHT_TINT = new Color();
/** The sun's warmth on the key light, and the sky's cool second colour on the rim behind. */
const SUN_WARM = new Color(1, 0.84, 0.66), COOL = new Color(0.45, 0.85, 0.95);
const RIM_BASE = 1.5, RIM_FIGHT = 2.6;
const HEMI_SKY = new Color(0x56607a);
/** Each layer's slide against the ship's travel is a sine of the distance: this many units to the cycle (starfield.ts). */
const SLIDE = 4000;
/** The cloud's slide (radians of sky) and the far worlds' (units at their own distance), at the sine's top. */
const CLOUD_SLIDE = 0.07, WORLD_SLIDE = 0.06;

export class Environment {
  private readonly skyRim = new Color();
  /** The key light's colour (the sun's) and the rim's (the sky's second colour, cooled), for this sky. */
  private readonly sunCol = new Color(0.94, 0.92, 0.89);
  private readonly rimCol = RIM_COLOUR.clone();
  /** The system's colour mood for the grade (render/post.ts): its main colour lifts the shadows, its sun warms the lights. */
  readonly mood = { shadow: new Color(), light: new Color(1, 1, 1) };
  /** A faint wash of the sky's own colour in the distance haze. */
  private readonly haze = new Color();
  readonly group = new Group();
  private readonly stars = new Group();
  private readonly dustBase: Float32Array;
  private readonly dustPos: BufferAttribute;
  /** The dust's colour: the sun's, so the motes read as sunlit; brighter at speed. */
  private readonly dustMat: LineBasicMaterial;
  private readonly rim: DirectionalLight;
  private fightK = 0;
  private readonly key: DirectionalLight;
  private readonly field = new Starfield();
  /** The sky's rare and passing things: a hole, a rift, a storm cell, shooting stars, far flashes, far traffic. */
  readonly phenomena = new Phenomena();
  private readonly hemi: HemisphereLight;
  /** Reduced motion holds the stars' twinkle and the gas still. */
  motion = true;
  private t = 0;
  private readonly fwd = new Vector3();
  private readonly scene: Scene;
  private readonly fog: FogExp2;
  private readonly parallax = new Parallax();
  private far: FarBodies | null = null;
  private baked: WebGLRenderTarget | null = null;
  private readonly dome: ShaderMaterial;

  constructor(scene: Scene, private readonly renderer: WebGLRenderer) {
    this.scene = scene;
    // The sky is drawn on a dome with one material for the page's life. As scene.background three
    // would turn each new sky into a cube map through a throwaway program, linked again every system.
    this.dome = new ShaderMaterial({
      uniforms: { uMap: { value: null as Texture | null }, uDetail: { value: null as Texture | null }, uLevel: { value: 1 }, uTime: { value: 0 }, uShift: { value: new Vector3() } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
          gl_Position.z = gl_Position.w * 0.99999;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap, uDetail; uniform float uLevel, uTime; uniform vec3 uShift; varying vec3 vDir;
        vec2 eq(vec3 d) { return vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5); }
        void main() {
          // the cloud sits far off: the ship's travel slides it a hair (uShift), so it is never quite pinned to the glass
          vec2 uv = eq(normalize(normalize(vDir) + uShift));
          vec3 col = texture2D(uMap, uv).rgb;
          #ifdef DETAIL
          // fine wisps laid over the cloud at two scales and slid slowly, each blending between two fields: the gas thins, folds and brightens without ever repeating
          float lum = dot(col, vec3(0.3, 0.5, 0.2));
          float on = smoothstep(0.012, 0.1, lum);
          vec3 a = texture2D(uDetail, uv * vec2(5.0, 2.5) + uTime * vec2(0.0042, 0.0016)).rgb;
          vec3 b = texture2D(uDetail, uv * vec2(11.0, 5.5) - uTime * vec2(0.0031, 0.0021) + 0.37).rgb;
          float f = mix(a.r, a.g, 0.5 + 0.5 * sin(uTime * 0.06));
          float g = mix(b.g, b.b, 0.5 + 0.5 * sin(uTime * 0.045 + 2.0));
          float wisps = f * 0.62 + g * 0.5;
          col *= mix(1.0, 0.42 + wisps * 1.05, on);
          col += col * pow(wisps, 3.0) * 0.55 * on;
          #endif
          gl_FragColor = vec4(col * uLevel, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: BackSide, depthWrite: false, fog: false,
    });
    const dome = new Mesh(new SphereGeometry(50, 32, 16), this.dome);
    dome.renderOrder = -1000;
    dome.frustumCulled = false;
    this.group.add(dome);
    this.fog = new FogExp2(HAZE.getHex(), FOG_BASE);
    scene.fog = this.fog;
    scene.environment = reflections(renderer);

    this.stars.add(this.field.group, this.phenomena.group);
    this.group.add(this.stars);

    const N = 300;
    this.dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.dustBase[i * 3] = Math.random() * DUST_BOX;
      this.dustBase[i * 3 + 1] = -12 + Math.random() * 22;
      this.dustBase[i * 3 + 2] = Math.random() * DUST_BOX;
    }
    const g = new BufferGeometry();
    this.dustPos = new BufferAttribute(new Float32Array(N * 6), 3);
    g.setAttribute('position', this.dustPos);
    const col = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const b = 0.1 + Math.random() * 0.25;
      // the head of each mote catches the light, the tail fades: a faint streak at speed
      col.set([b, b, b, 0, 0, 0], i * 6);
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    this.dustMat = new LineBasicMaterial({ color: INK, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false });
    const dust = new LineSegments(g, this.dustMat);
    dust.frustumCulled = false;
    this.group.add(dust);

    this.key = new DirectionalLight(0xf0ebe4, 5.4);
    // the sun's shadow covers only the ship's neighbourhood: rocks darken the hull and each other close in
    const cam = this.key.shadow.camera;
    cam.left = cam.bottom = -SHADOW_REACH;
    cam.right = cam.top = SHADOW_REACH;
    cam.near = 20;
    cam.far = 130;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.06;
    this.key.shadow.radius = 2;
    this.rim = new DirectionalLight(RIM_COLOUR, RIM_BASE);
    this.hemi = new HemisphereLight(HEMI_SKY.getHex(), 0x0b0907, 0.36);
    this.group.add(this.key, this.key.target, this.hemi, this.rim);
    this.group.add(this.parallax.group);
    scene.add(this.group);
    this.setSky(skyFor(1, 0));
    this.anchorPrograms();
  }

  /**
   * A disposed material takes its program with it once nothing else uses it,
   * so each new sky's planet, halo and ring would compile again, in play. A
   * hidden planet with every extra, kept for the page's life, holds them.
   */
  private anchorPrograms(): void {
    const sky = skyFor(1, 0), [colA, colB, atmo] = sky.neb;
    sky.planet = { kind: 0, colA, colB, atmo, size: 6, az: 0, el: -10, ring: true, moon: true };
    const proof = new FarBodies(sky, new Vector3(-44, 22, -10));
    proof.group.visible = false;
    this.stars.add(proof.group);
  }

  /**
   * A fight lifts the rim: stronger, and cooled toward the faction you are fighting (`tint`, HDR, any scale; null keeps the sky's).
   * `k` 0 to 1 is how far into the fight the view is. One directional light and a uniform: no second light.
   */
  fight(tint: Color | null, k: number): void {
    this.fightK = k;
    this.rim.intensity = RIM_BASE + (RIM_FIGHT - RIM_BASE) * k;
    this.rim.color.copy(this.rimCol);
    if (tint) {
      const m = Math.max(tint.r, tint.g, tint.b, 1e-3);
      this.rim.color.lerp(FIGHT_TINT.setRGB(tint.r / m, tint.g / m, tint.b / m), 0.3 * k);
    }
  }

  /** A new sky: repaint the backdrop and put up its far bodies. */
  setSky(sky: Sky): void {
    const old = this.baked;
    this.baked = bakeSky(this.renderer, sky);
    this.dome.uniforms.uMap!.value = this.baked.texture;
    old?.dispose();
    if (this.far) { this.far.group.removeFromParent(); this.far.dispose(); }
    // the planet takes its light from the key's quarter of the sky
    this.far = new FarBodies(sky, new Vector3(-44, 22, -10));
    this.stars.add(this.far.group);
    this.parallax.setSky(sky);
    this.field.setSky(sky);
    this.phenomena.setSky(sky);
    // the ambient fill takes a breath of the sky's blue and violet
    this.hemi.color.copy(HEMI_SKY).lerp(sky.neb[0], 0.22).lerp(sky.accent, 0.08);
    // distant rock fades into the sky's own colour, not into black
    this.haze.copy(sky.neb[0]).lerp(sky.neb[1], 0.3).multiplyScalar(0.42);
    // warm sun on one side, the sky's cool second colour on the rim behind
    this.sunCol.copy(SUN_WARM).lerp(sky.star, 0.4);
    const c2 = sky.neb[1], m = Math.max(c2.r, c2.g, c2.b, 1e-3);
    this.rimCol.setRGB(c2.r / m, c2.g / m, c2.b / m).lerp(COOL, 0.5);
    this.rim.color.copy(this.rimCol);
    this.skyRim.copy(sky.neb[0]).lerp(sky.neb[2], 0.35).multiplyScalar(0.5);
    this.mood.shadow.copy(sky.neb[0]).lerp(sky.neb[1], 0.25).multiplyScalar(0.022);
    const s = this.sunCol, top = Math.max(s.r, s.g, s.b, 1e-3);
    this.mood.light.setRGB(s.r / top, s.g / top, s.b / top).lerp(WHITE_LIGHT, 0.82);
    WORLD_RIM.value.copy(this.skyRim);
  }

  /**
   * The sector's weather: `nebula` (0 to 1) thickens the fog to a violet murk
   * and dims the sky; `flash` (0 to 1) is a lightning flash in an ion storm.
   */
  weather(nebula: number, flash: number, mood?: { fog: number; dim: number; tint: readonly [number, number, number] }): void {
    // the place the ship is in (sim/space.ts): its murk, its dimming of the sky, and its light on everything
    const fog = mood?.fog ?? 0, dim = mood?.dim ?? 0, t = mood?.tint;
    this.fog.density = FOG_BASE + nebula * 0.016 + fog * 0.012;
    this.fog.color.copy(HAZE).lerp(this.haze, 0.75).lerp(NEBULA, nebula);
    if (t) this.fog.color.r += t[0] * 0.3, this.fog.color.g += t[1] * 0.3, this.fog.color.b += t[2] * 0.3;
    this.dome.uniforms.uLevel!.value = (1 - nebula * 0.55) * (1 - dim * 0.5) + flash * 0.6;
    this.far?.dim(1 - nebula * 0.7);
    this.phenomena.group.visible = nebula < 0.6;
    this.parallax.dim(1 - nebula * 0.6);
    WORLD_RIM.value.copy(this.skyRim).multiplyScalar((1 + flash * 4) * (1 + this.fightK * 0.8));
    if (t) WORLD_RIM.value.r += t[0] * 0.25, WORLD_RIM.value.g += t[1] * 0.25, WORLD_RIM.value.b += t[2] * 0.25;
    this.key.intensity = 5.4 + flash * 9;
    this.key.color.copy(this.sunCol).lerp(FIGHT_TINT.setRGB(1, 1, 1), flash);
    if (t) this.key.color.lerp(KEY_TINT.setRGB(0.55 + t[0] * 1.6, 0.6 + t[1] * 1.6, 0.7 + t[2] * 1.6), Math.min(0.6, (t[0] + t[1] + t[2]) * 1.1));
  }

  /** Shadow map size for the tier; 0 turns the sun's shadow off. */
  setShadow(size: number): void {
    const sh = this.key.shadow;
    this.key.castShadow = size > 0;
    if (sh.mapSize.x !== size && size > 0) {
      sh.mapSize.set(size, size);
      sh.map?.dispose();
      sh.map = null;
    }
  }

  setPixelRatio(dpr: number): void {
    this.field.setPixelRatio(dpr);
  }

  /** Low tier: half the stars and no wisp layer over the cloud (the detail tile is baked the first time a better tier asks). */
  setDetail(low: boolean): void {
    this.field.setThin(low);
    this.parallax.setThin(low);
    const mat = this.dome;
    if (mat.defines.DETAIL === (low ? undefined : '')) return;
    if (low) delete mat.defines.DETAIL; else { mat.defines.DETAIL = ''; mat.uniforms.uDetail!.value = detailTile(this.renderer); }
    mat.needsUpdate = true;
  }

  update(camera: Camera, cx: number, cz: number, vx: number, vz: number, dt: number): void {
    this.stars.position.copy(camera.position);
    this.parallax.update(cx, cz, dt);
    if (dt > 0) this.t = (this.t + (this.motion ? dt : 0)) % 4000;
    this.field.update(cx, cz, dt, this.motion);
    // the cloud and the far worlds slide against the ship's travel, each a sine of the distance so they never run off
    this.dome.uniforms.uTime!.value = this.t;
    this.dome.uniforms.uShift!.value.set(CLOUD_SLIDE * Math.sin(cx / SLIDE), 0, CLOUD_SLIDE * Math.sin(cz / SLIDE));
    this.far?.tick(this.t);
    this.far?.group.position.set(-WORLD_SLIDE * 2000 * Math.sin(cx / SLIDE), 0, -WORLD_SLIDE * 2000 * Math.sin(cz / SLIDE));
    this.phenomena.group.position.set(-WORLD_SLIDE * 1500 * Math.sin(cx / SLIDE), 0, -WORLD_SLIDE * 1500 * Math.sin(cz / SLIDE));
    if (dt > 0) this.phenomena.look(camera.getWorldDirection(this.fwd));
    this.phenomena.update(dt, this.motion);
    // the key light keeps its angle, wherever the ship goes
    // (the target snaps to a grid so the shadow edges do not crawl as the ship moves)
    const kx = Math.round(cx * 4) / 4, kz = Math.round(cz * 4) / 4;
    this.key.position.set(kx - 44, 22, kz - 10);
    this.key.target.position.set(kx, 0, kz);
    this.rim.position.set(camera.position.x - cx, camera.position.y * 0.4, camera.position.z - cz).multiplyScalar(-1);

    const P = this.dustPos.array as Float32Array, B = this.dustBase;
    // past about half of top speed the motes stretch into faint speed streaks and brighten a little
    const fast = Math.min(1, Math.max(0, (Math.hypot(vx, vz) - DUST_FAST) / DUST_FAST));
    const len = 0.035 + 0.045 * fast;
    const sx = -vx * len, sz = -vz * len, h = DUST_BOX / 2;
    this.dustMat.color.copy(this.sunCol).multiplyScalar(0.85 + 0.6 * fast);
    for (let i = 0; i < B.length / 3; i++) {
      const x = cx + wrap(B[i * 3]! - cx, DUST_BOX) - h;
      const z = cz + wrap(B[i * 3 + 2]! - cz, DUST_BOX) - h;
      const y = B[i * 3 + 1]!;
      P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z;
      P[i * 6 + 3] = x + sx + 0.05; P[i * 6 + 4] = y; P[i * 6 + 5] = z + sz;
    }
    this.dustPos.needsUpdate = true;
  }
}

/** A small, dark environment for metal to reflect: black sky, a warm window for the sun, a cold one opposite. */
function reflections(renderer: WebGLRenderer) {
  const env = new Scene();
  env.add(new Mesh(new SphereGeometry(10, 16, 8), new MeshBasicMaterial({ color: 0x07080b, side: BackSide })));
  const panel = (color: Color, w: number, h: number, x: number, y: number, z: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color, side: BackSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(new Color(2.4, 2.0, 1.6), 5, 3, -6, 6, -1);
  panel(new Color(0.25, 0.32, 0.48), 8, 4, 6, 2, 3);
  panel(new Color(0.1, 0.1, 0.12), 14, 3, 0, -6, 0);
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, 0.04);
  pmrem.dispose();
  return target.texture;
}

/** Half-width of the sun's shadow window, in world units. */
const SHADOW_REACH = 38;

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}
