import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, LinearFilter, Mesh, NoBlending, NormalBlending,
  OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector3, Vector4, WebGLRenderTarget, type Texture, type WebGLRenderer,
} from 'three';

// ── gas you can fly into ──────────────────────────────────────────────────
// A bank of dust or gas (a veil, a shroud, a storm cell, a static field) is a few dozen soft billboards spread through
// its volume, each a cell of a baked atlas of cloud shapes that carries its own normal, so the sun lights one side of
// every lump and the far side falls into the sky's colour. One draw per bank. Billboards fade out as the camera comes
// close to them, so flying in, the gas parts round the ship instead of passing through the lens as a flat card, and a
// lightning flash inside a storm lights the gas round it.
//
// The atlas: 4 by 4 cells. R is density, G and B the normal (x, y), A how deep inside the lump a pixel sits (for the
// glow from within).

const GRID = 4;
const CELLS = GRID * GRID;
/** Where the sun is (environment.ts puts the key light at -44, 22, -10 from the ship). */
const SUN = new Vector3(-44, 22, -10).normalize();

const atlas = { value: null as Texture | null };
let baked: WebGLRenderTarget | null = null;

const NOISE = /* glsl */ `
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return s;
  }`;

/** Bake the cloud shapes once per page (`size` square: 1024, or 512 on Phone and Low). */
export function bakeGas(renderer: WebGLRenderer, size: number): Texture {
  if (baked) return baked.texture;
  baked = new WebGLRenderTarget(size, size, { magFilter: LinearFilter, minFilter: LinearFilter, generateMipmaps: false, depthBuffer: false });
  const mat = new ShaderMaterial({
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      ${NOISE}
      // three families, by row: billows (lumpy banks), wisps (torn filaments, combed one way) and sheets (thin, broad)
      float shape(vec2 q, float i) {
        float fam = floor(i / 5.0), sd = i * 7.31;
        vec2 s = fam < 0.5 ? q : fam < 1.5 ? q * vec2(0.55, 1.9) : q * vec2(0.8, 1.3);
        float r = length(s);
        vec3 p = vec3(q * (fam < 1.5 ? 2.4 : 1.7), sd);
        vec3 w = vec3(fbm(p + 3.1), fbm(p * 1.3 + 7.7), 0.0);
        float n = fbm(p + w * (fam < 0.5 ? 1.3 : 2.4));
        float body = smoothstep(0.0, 0.3, n + 0.55 - r * 1.25);
        // wisps keep only the ridges of the noise: strands, not lumps
        if (fam > 0.5 && fam < 1.5) body *= smoothstep(0.42, 0.62, fbm(vec3(q.x * 1.2, q.y * 7.0 + w.x * 2.0, sd + 4.0)));
        // sheets are thin and even, with holes
        if (fam > 1.5) body *= 0.55 + 0.45 * smoothstep(0.35, 0.6, n);
        return clamp(body * (0.35 + n * 1.0), 0.0, 1.0);
      }
      void main() {
        vec2 cell = floor(vUv * ${GRID}.0);
        vec2 q = fract(vUv * ${GRID}.0) * 2.0 - 1.0;
        float i = cell.y * ${GRID}.0 + cell.x;
        float d = shape(q, i);
        float e = 0.03;
        vec2 g = vec2(shape(q + vec2(e, 0.0), i) - shape(q - vec2(e, 0.0), i), shape(q + vec2(0.0, e), i) - shape(q - vec2(0.0, e), i)) / (2.0 * e);
        vec3 nrm = normalize(vec3(q * 0.6 - g * 0.3, 0.5 + 0.5 * sqrt(max(0.0, 1.0 - dot(q, q)))));
        float edge = 1.0 - smoothstep(0.84, 0.98, max(abs(q.x), abs(q.y)));
        // how deep inside: the density of a softer, smaller copy of the lump
        float deep = smoothstep(0.35, 0.95, d) * (1.0 - smoothstep(0.3, 0.9, length(q)));
        gl_FragColor = vec4(d * edge, nrm.x * 0.5 + 0.5, nrm.y * 0.5 + 0.5, deep * edge);
      }`,
    blending: NoBlending, depthTest: false, depthWrite: false,
  });
  const scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(1, 1), mat));
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(baked);
  renderer.render(scene, new OrthographicCamera());
  renderer.setRenderTarget(prev);
  mat.dispose();
  atlas.value = baked.texture;
  return baked.texture;
}

/** The light every bank shares: the sun's colour and the sky's, set once per system (`setGasLight`). */
const SUN_C = { value: new Color(1, 0.95, 0.88) };
const SKY_C = { value: new Color(0.3, 0.32, 0.45) };
/** The newest lightning near the ship: world position and strength (fades in `Gas.update`). */
const FLASH = { value: new Vector4(0, -9999, 0, 0) };

export function setGasLight(sun: Color, sky: Color): void {
  SUN_C.value.copy(sun);
  SKY_C.value.copy(sky);
}

/** A lightning stroke at a world point: the gas round it lights up. */
export function gasFlash(x: number, y: number, z: number, k = 1): void {
  FLASH.value.set(x, y, z, Math.max(FLASH.value.w, k));
}

/** Let the last flash die away. */
export function stepGas(dt: number): void {
  FLASH.value.w = Math.max(0, FLASH.value.w - dt * 4);
}

const VERT = /* glsl */ `
  attribute vec4 iPos;  // centre (in the bank), size
  attribute vec4 iCol;  // colour, alpha
  attribute vec4 iMisc; // turn, cell, glow from within, stretch
  uniform vec4 uFlash; uniform float uNear, uTime;
  varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying vec2 vRot; varying vec3 vL; varying float vFade; varying float vLit;
  void main() {
    vec4 mv = modelViewMatrix * vec4(iPos.xyz, 1.0);
    float turn = iMisc.x + uTime * 0.004 * (fract(iMisc.x * 3.7) - 0.5);
    float c = cos(turn), s = sin(turn);
    vec2 corner = position.xy * vec2(iMisc.w, 1.0) * iPos.w;
    mv.xy += vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
    gl_Position = projectionMatrix * mv;
    vUv = uv; vCol = iCol; vMisc = iMisc; vRot = vec2(c, s);
    vL = normalize(mat3(viewMatrix) * vec3(${SUN.x.toFixed(4)}, ${SUN.y.toFixed(4)}, ${SUN.z.toFixed(4)}));
    // close to the eye a lump thins away: by the time the camera would cut through it, it is gone
    float depth = -mv.z;
    vFade = smoothstep(iPos.w * 0.12 * uNear, iPos.w * 0.75 * uNear, depth);
    // a flash lights what is near it, by distance from the lump's middle
    vec3 wp = (modelMatrix * vec4(iPos.xyz, 1.0)).xyz;
    float fd = length(wp - uFlash.xyz) / (iPos.w * 0.8 + 90.0);
    vLit = uFlash.w / (1.0 + fd * fd * 3.0);
  }`;

const FRAG = /* glsl */ `
  uniform sampler2D uAtlas; uniform vec3 uSunC, uSkyC; uniform float uOpacity;
  varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying vec2 vRot; varying vec3 vL; varying float vFade; varying float vLit;
  void main() {
    vec2 uv = vUv;
    if (fract(vMisc.x * 5.3) > 0.5) uv.x = 1.0 - uv.x;
    vec2 cell = vec2(mod(vMisc.y, ${GRID}.0), floor(vMisc.y / ${GRID}.0));
    vec4 s = texture2D(uAtlas, (cell + uv) / ${GRID}.0);
    float a = s.r * vCol.a * vFade * uOpacity;
    if (a < 0.002) discard;
    vec3 n = vec3(s.g * 2.0 - 1.0, s.b * 2.0 - 1.0, 0.0);
    if (fract(vMisc.x * 5.3) > 0.5) n.x = -n.x;
    n.xy = vec2(vRot.x * n.x - vRot.y * n.y, vRot.y * n.x + vRot.x * n.y);
    n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)));
    // the sun's side of each lump lit and warm, a thin bright rim where the light grazes it, the far side in the sky's colour
    float l = dot(n, vL);
    float w = clamp(l * 0.6 + 0.4, 0.0, 1.0);
    float rim = smoothstep(0.55, 0.0, s.r) * smoothstep(-0.2, 0.6, l);
    vec3 col = vCol.rgb * (uSkyC * 0.55 + uSunC * w * w * 0.9) + uSunC * vCol.rgb * rim * 0.6;
    // lit from within where it is thick (a storm's charge, a veil's cold light), and by lightning
    col += vCol.rgb * vMisc.z * s.a * 1.6;
    col += vec3(0.75, 0.85, 1.0) * vLit * (0.25 + s.a * 1.4);
    gl_FragColor = vec4(col, a);
  }`;

export interface GasLump { x: number; y: number; z: number; size: number; colour: Color; alpha: number; glow: number; stretch: number; family: 0 | 1 | 2 }

/** One bank of gas: a few dozen lumps in one draw, sorted far to near now and then. */
export class Gas {
  readonly mesh: Mesh;
  private readonly mat: ShaderMaterial;
  private readonly pos: InstancedBufferAttribute;
  private readonly col: InstancedBufferAttribute;
  private readonly misc: InstancedBufferAttribute;
  private readonly lumps: GasLump[];
  private readonly order: number[];
  private readonly dist: Float32Array;
  private readonly misc0: Float32Array;
  private sortIn = 0;
  private readonly eye = new Vector3();
  private readonly byFar = (a: number, b: number) => this.dist[b]! - this.dist[a]!;

  constructor(lumps: GasLump[], seed: number) {
    const n = lumps.length;
    this.lumps = lumps;
    this.order = lumps.map((_, i) => i);
    this.dist = new Float32Array(n);
    const geo = new InstancedBufferGeometry();
    const quad = new PlaneGeometry(2, 2);
    geo.index = quad.index;
    geo.setAttribute('position', quad.getAttribute('position'));
    geo.setAttribute('uv', quad.getAttribute('uv'));
    this.pos = new InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(DynamicDrawUsage);
    this.col = new InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(DynamicDrawUsage);
    this.misc = new InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(DynamicDrawUsage);
    geo.setAttribute('iPos', this.pos);
    geo.setAttribute('iCol', this.col);
    geo.setAttribute('iMisc', this.misc);
    geo.instanceCount = n;
    this.misc0 = new Float32Array(n * 4);
    let r = seed % 2147483647 || 1;
    const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    lumps.forEach((l, i) => {
      // the family picks a row of the atlas: billows 0 to 4, wisps 5 to 9, sheets 10 to 15
      const cell = l.family === 0 ? Math.floor(rnd() * 5) : l.family === 1 ? 5 + Math.floor(rnd() * 5) : 10 + Math.floor(rnd() * 6);
      this.misc0.set([rnd() * Math.PI * 2, cell, l.glow, l.stretch], i * 4);
    });
    this.mat = new ShaderMaterial({
      uniforms: {
        uAtlas: atlas, uSunC: SUN_C, uSkyC: SKY_C, uFlash: FLASH,
        uOpacity: { value: 0 }, uNear: { value: 1 }, uTime: { value: 0 },
      },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: NormalBlending, fog: false,
    });
    this.mesh = new Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -2;
    this.write();
  }

  /** Strength (0 to 1, the bank's fade times its level) and the clock; sorts the lumps far to near every quarter second. */
  update(opacity: number, time: number, dt: number, camera: { position: Vector3 }): void {
    this.mat.uniforms.uOpacity!.value = opacity;
    this.mat.uniforms.uTime!.value = time;
    this.mesh.visible = opacity > 0.003 && !!atlas.value;
    if (!this.mesh.visible) return;
    if ((this.sortIn -= dt) > 0) return;
    this.sortIn = 0.25;
    this.mesh.worldToLocal(this.eye.copy(camera.position));
    const e = this.eye;
    for (let i = 0; i < this.lumps.length; i++) {
      const l = this.lumps[i]!;
      this.dist[i] = (l.x - e.x) ** 2 + (l.y - e.y) ** 2 + (l.z - e.z) ** 2;
    }
    this.order.sort(this.byFar);
    this.write();
  }

  private write(): void {
    const p = this.pos.array as Float32Array, c = this.col.array as Float32Array, m = this.misc.array as Float32Array;
    for (let k = 0; k < this.order.length; k++) {
      const i = this.order[k]!, l = this.lumps[i]!;
      p[k * 4] = l.x; p[k * 4 + 1] = l.y; p[k * 4 + 2] = l.z; p[k * 4 + 3] = l.size;
      c[k * 4] = l.colour.r; c[k * 4 + 1] = l.colour.g; c[k * 4 + 2] = l.colour.b; c[k * 4 + 3] = l.alpha;
      for (let j = 0; j < 4; j++) m[k * 4 + j] = this.misc0[i * 4 + j]!;
    }
    this.pos.needsUpdate = this.col.needsUpdate = this.misc.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}

// ── curtains ──────────────────────────────────────────────────────────────
// An aurora: a tall ribbon of charged gas hung along a slow curve, bright along its lower hem and fading upward in
// fine vertical rays that drift sideways, the whole sheet rippling. One strip mesh per fold, added light.

const CURTAIN_V = /* glsl */ `
  attribute float aU;
  uniform float uTime, uLen;
  varying vec2 vUv; varying float vU;
  void main() {
    vec3 p = position;
    // folds travel along the ribbon
    float k = aU * uLen;
    p.z += sin(k * 0.011 + uTime * 0.21) * uLen * 0.035 + sin(k * 0.031 - uTime * 0.33) * uLen * 0.012;
    vUv = uv; vU = aU;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

const CURTAIN_F = /* glsl */ `
  uniform float uTime, uOpacity, uSeed; uniform vec3 uLow, uHigh;
  varying vec2 vUv; varying float vU;
  float h1(float x) { return fract(sin(x * 127.1 + uSeed) * 43758.5453); }
  float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
  void main() {
    float x = vU * 90.0, y = vUv.y;
    // rays: thin and broad strands, drifting sideways at their own speeds
    float rays = n1(x * 3.1 + uTime * 0.35) * 0.6 + n1(x * 0.9 - uTime * 0.12 + 7.0) * 0.55 + n1(x * 9.0 + uTime * 0.8) * 0.25;
    rays = rays * rays;
    // a bright hem low down, a long soft fade upward, the hem itself wavering
    float hem = 0.08 + 0.05 * n1(x * 0.7 + uTime * 0.2);
    float body = smoothstep(hem - 0.06, hem, y) * pow(max(1.0 - (y - hem) / (1.0 - hem), 0.0), 1.6);
    float edge = exp(-sq(max(y - hem, 0.0) / 0.05)) * 0.8;
    // ends fade, so the ribbon has no hard start
    float ends = smoothstep(0.0, 0.12, vU) * smoothstep(1.0, 0.88, vU);
    vec3 c = mix(uLow, uHigh, smoothstep(0.1, 0.8, y));
    float a = (body * rays + edge * rays) * ends * uOpacity;
    gl_FragColor = vec4(c * a, 1.0);
  }`;

/** One fold of a curtain: `pts` the curve along the ground (x, z pairs), `h` its height, from `y0`. */
export function curtainFold(pts: number[], y0: number, h: number, low: Color, high: Color, seed: number): Mesh {
  const n = pts.length / 2, pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), u = new Float32Array(n * 2), idx: number[] = [];
  let len = 0;
  for (let i = 0; i < n; i++) {
    if (i) len += Math.hypot(pts[i * 2]! - pts[i * 2 - 2]!, pts[i * 2 + 1]! - pts[i * 2 - 1]!);
    for (let j = 0; j < 2; j++) {
      const k = i * 2 + j;
      pos.set([pts[i * 2]!, y0 + j * h, pts[i * 2 + 1]!], k * 3);
      uv.set([i / (n - 1), j], k * 2);
      u[k] = i / (n - 1);
    }
    if (i < n - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('uv', new BufferAttribute(uv, 2));
  geo.setAttribute('aU', new BufferAttribute(u, 1));
  geo.setIndex(idx);
  const mat = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: seed % 97 }, uLen: { value: len }, uLow: { value: low.clone() }, uHigh: { value: high.clone() } },
    vertexShader: CURTAIN_V, fragmentShader: 'float sq(float x) { return x * x; }\n' + CURTAIN_F,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false,
  });
  const m = new Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}
