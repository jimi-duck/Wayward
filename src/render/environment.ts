import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, FogExp2,
  Group, HemisphereLight, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Points,
  Scene, ShaderMaterial, SphereGeometry, Vector3, type Camera, type Texture, type WebGLRenderer, type WebGLRenderTarget,
} from 'three';
import { bakeSky, FarBodies, Parallax, skyFor, type Sky } from './sky';
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
const NEBULA = new Color('#1b0e28');
const DUST_BOX = 130;
const KEY_TINT = new Color();

export class Environment {
  private readonly skyRim = new Color();
  /** A faint wash of the sky's own colour in the distance haze. */
  private readonly haze = new Color();
  readonly group = new Group();
  private readonly stars = new Group();
  private readonly dustBase: Float32Array;
  private readonly dustPos: BufferAttribute;
  private readonly rim: DirectionalLight;
  private readonly key: DirectionalLight;
  private readonly starMat: ShaderMaterial;
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
      uniforms: { uMap: { value: null as Texture | null }, uLevel: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
          gl_Position.z = gl_Position.w * 0.99999;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform float uLevel; varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          gl_FragColor = vec4(texture2D(uMap, uv).rgb * uLevel, 1.0);
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

    this.starMat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false,
      uniforms: { uDpr: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute vec3 color; varying vec3 vCol; uniform float uDpr;
        void main() {
          vCol = color;
          gl_PointSize = size * uDpr;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position.z = gl_Position.w; // at infinity
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d);
          gl_FragColor = vec4(vCol * a, a);
        }`,
    });
    this.addStars(7000, 1.2, 1.9, 0.34);
    this.addStars(1100, 1.9, 2.8, 0.9);
    this.addStars(90, 3.2, 5.0, 1.6);
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
      col.set([INK.r * b, INK.g * b, INK.b * b, 0, 0, 0], i * 6);
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    const dust = new LineSegments(g, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false }));
    dust.frustumCulled = false;
    this.group.add(dust);

    this.key = new DirectionalLight(0xffe6c8, 4.9);
    // the sun's shadow covers only the ship's neighbourhood: rocks darken the hull and each other close in
    const cam = this.key.shadow.camera;
    cam.left = cam.bottom = -SHADOW_REACH;
    cam.right = cam.top = SHADOW_REACH;
    cam.near = 20;
    cam.far = 130;
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.06;
    this.key.shadow.radius = 2;
    this.rim = new DirectionalLight(0x7f9cc8, 0.9);
    this.group.add(this.key, this.key.target, new HemisphereLight(0x56607a, 0x0b0907, 0.58), this.rim);
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
    const proof = new FarBodies(sky, new Vector3(-40, 34, -10));
    proof.group.visible = false;
    this.stars.add(proof.group);
  }

  /** A new sky: repaint the backdrop and put up its far bodies. */
  setSky(sky: Sky): void {
    const old = this.baked;
    this.baked = bakeSky(this.renderer, sky);
    this.dome.uniforms.uMap!.value = this.baked.texture;
    old?.dispose();
    if (this.far) { this.far.group.removeFromParent(); this.far.dispose(); }
    // the planet takes its light from the key's quarter of the sky
    this.far = new FarBodies(sky, new Vector3(-40, 34, -10));
    this.stars.add(this.far.group);
    this.parallax.setSky(sky);
    this.haze.copy(sky.neb[0]).multiplyScalar(0.08);
    this.skyRim.copy(sky.neb[0]).lerp(sky.neb[2], 0.35).multiplyScalar(0.5);
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
    this.fog.color.copy(HAZE).add(this.haze).lerp(NEBULA, nebula);
    if (t) this.fog.color.r += t[0] * 0.3, this.fog.color.g += t[1] * 0.3, this.fog.color.b += t[2] * 0.3;
    this.dome.uniforms.uLevel!.value = (1 - nebula * 0.55) * (1 - dim * 0.5) + flash * 0.6;
    this.far?.dim(1 - nebula * 0.7);
    this.parallax.dim(1 - nebula * 0.6);
    WORLD_RIM.value.copy(this.skyRim).multiplyScalar(1 + flash * 4);
    if (t) WORLD_RIM.value.r += t[0] * 0.25, WORLD_RIM.value.g += t[1] * 0.25, WORLD_RIM.value.b += t[2] * 0.25;
    this.key.intensity = 4.9 + flash * 9;
    this.key.color.setRGB(1, 0.9 + flash * 0.1, 0.78 + flash * 0.22);
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
    this.starMat.uniforms.uDpr!.value = dpr;
  }

  update(camera: Camera, cx: number, cz: number, vx: number, vz: number, dt: number): void {
    this.stars.position.copy(camera.position);
    this.parallax.update(cx, cz, dt);
    // the key light keeps its angle, wherever the ship goes
    // (the target snaps to a grid so the shadow edges do not crawl as the ship moves)
    const kx = Math.round(cx * 4) / 4, kz = Math.round(cz * 4) / 4;
    this.key.position.set(kx - 40, 34, kz - 10);
    this.key.target.position.set(kx, 0, kz);
    this.rim.position.set(camera.position.x - cx, camera.position.y * 0.4, camera.position.z - cz).multiplyScalar(-1);

    const P = this.dustPos.array as Float32Array, B = this.dustBase;
    const sx = -vx * 0.035, sz = -vz * 0.035, h = DUST_BOX / 2;
    for (let i = 0; i < B.length / 3; i++) {
      const x = cx + wrap(B[i * 3]! - cx, DUST_BOX) - h;
      const z = cz + wrap(B[i * 3 + 2]! - cz, DUST_BOX) - h;
      const y = B[i * 3 + 1]!;
      P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z;
      P[i * 6 + 3] = x + sx + 0.05; P[i * 6 + 4] = y; P[i * 6 + 5] = z + sz;
    }
    this.dustPos.needsUpdate = true;
  }

  private addStars(count: number, min: number, max: number, brightness: number): void {
    const pos: number[] = [], col: number[] = [], size: number[] = [], c = new Color();
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      pos.push(Math.cos(t) * r * 1000, u * 1000, Math.sin(t) * r * 1000);
      const tint = Math.random();
      c.setHSL(tint < 0.18 ? 0.07 : tint > 0.8 ? 0.6 : 0, tint < 0.18 || tint > 0.8 ? 0.45 : 0, 1);
      const b = brightness * (0.3 + Math.pow(Math.random(), 2) * 0.7);
      col.push(c.r * b, c.g * b, c.b * b);
      size.push(min + Math.random() * (max - min));
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    geo.setAttribute('size', new Float32BufferAttribute(size, 1));
    const pts = new Points(geo, this.starMat);
    pts.frustumCulled = false;
    pts.renderOrder = -2;
    this.stars.add(pts);
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
