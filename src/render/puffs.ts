import {
  AdditiveBlending, Color, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, LinearFilter, Mesh, NoBlending,
  NormalBlending, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector3, WebGLRenderTarget,
  type Texture, type WebGLRenderer,
} from 'three';

// ── fire and smoke that move ──────────────────────────────────────────────
// Every puff of flame, smoke, dust and steam is one instance of a camera-facing quad in one of two draws (flame added,
// smoke laid over). Each plays through a flipbook as it lives: 64 frames of rolling gas, baked once on the GPU at load
// from 3D noise (`bakeAtlas`), so a fireball churns and breaks into tatters and smoke billows and thins, where a still
// picture only grew and faded. Smoke carries a normal per pixel, so the sun lights one side of each cloud and the fire
// warms it from inside. Before this every puff was its own sprite: 128 draws.
//
// The atlas: 8 by 8 frames. R is the flame's heat, A the smoke's density, G and B the smoke's normal (x, y).

const GRID = 8;
const FRAMES = GRID * GRID;
/** Where the sun is (environment.ts puts the key light at -44, 22, -10 from the ship). */
const SUN = new Vector3(-44, 22, -10).normalize();

/** The shared atlas: set once it is baked; until then the puffs draw nothing. */
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
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
    return s;
  }`;

/**
 * Bake the flipbook: `size` pixels square (1024 on Medium and High, 512 on Phone and Low). Once per page; a second call
 * returns the first bake. Takes a few milliseconds on a GPU.
 */
export function bakeAtlas(renderer: WebGLRenderer, size: number): Texture {
  if (baked) return baked.texture;
  baked = new WebGLRenderTarget(size, size, { magFilter: LinearFilter, minFilter: LinearFilter, generateMipmaps: false, depthBuffer: false });
  const mat = new ShaderMaterial({
    uniforms: {},
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      ${NOISE}
      // the flame: a ball of burning gas that rolls outward, its edge torn by turbulence, breaking into tatters as it cools
      float flame(vec2 q, float t) {
        float r = length(q);
        vec3 p = vec3(q * (2.6 - t * 0.9), t * 2.2);
        vec3 w = vec3(fbm(p + 3.1), fbm(p + 7.7), 0.0);
        float n = fbm(p + w * 1.6);
        // the edge follows the turbulence: cauliflower lobes, not a disc
        float body = smoothstep(0.0, 0.22, n + 0.55 - r * (1.4 + t * 0.3));
        float tatter = smoothstep(t * 0.5, t * 0.5 + 0.25, n);
        return clamp(body * tatter * (0.3 + n * 1.3), 0.0, 1.0);
      }
      // smoke: a billow, lumpy at the edge, thinning and spreading as it ages
      float smoke(vec2 q, float t) {
        float r = length(q);
        vec3 p = vec3(q * (2.2 - t * 0.6), t * 1.3 + 11.0);
        float n = fbm(p + fbm(p * 0.7 + 5.0) * 1.4);
        float body = smoothstep(0.0, 0.28, n + 0.5 - r * (1.3 + t * 0.1));
        return clamp(body * (0.25 + n * 1.1) * (1.0 - t * 0.35), 0.0, 1.0);
      }
      void main() {
        vec2 cell = floor(vUv * ${GRID}.0);
        vec2 q = fract(vUv * ${GRID}.0) * 2.0 - 1.0;
        float t = (cell.y * ${GRID}.0 + cell.x) / ${FRAMES - 1}.0;
        float f = flame(q, t);
        float d = smoke(q, t);
        float e = 0.035;
        vec2 g = vec2(smoke(q + vec2(e, 0.0), t) - smoke(q - vec2(e, 0.0), t), smoke(q + vec2(0.0, e), t) - smoke(q - vec2(0.0, e), t)) / (2.0 * e);
        // the billow bulges toward the eye, and its lumps tilt the surface
        vec3 nrm = normalize(vec3(q * 0.7 - g * 0.35, 0.55 + 0.45 * sqrt(max(0.0, 1.0 - dot(q, q)))));
        // fade every frame to nothing at its border, so neighbours never bleed in
        float edge = 1.0 - smoothstep(0.86, 0.98, max(abs(q.x), abs(q.y)));
        gl_FragColor = vec4(f * edge, nrm.x * 0.5 + 0.5, nrm.y * 0.5 + 0.5, d * edge);
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

/** The GPU context was lost and came back: the baked target is empty, so bake it again at the same size. */
export function rebakeAtlas(renderer: WebGLRenderer): void {
  if (!baked) return;
  const size = baked.width;
  // (not disposed: its GPU objects went with the old context, and freeing them again only draws warnings)
  baked = null;
  bakeAtlas(renderer, size);
}

const VERT = /* glsl */ `
  attribute vec4 iPos;  // centre, size
  attribute vec4 iCol;  // colour, alpha
  attribute vec4 iMisc; // turn, age 0..1, seed, warmth
  uniform vec3 uSun;
  varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying vec2 vRot; varying vec3 vL;
  void main() {
    vec4 mv = viewMatrix * vec4(iPos.xyz, 1.0);
    float c = cos(iMisc.x), s = sin(iMisc.x);
    // the gas fills about the middle two thirds of its frame, so the quad is drawn half again as big as the puff
    mv.xy += vec2(c * position.x - s * position.y, s * position.x + c * position.y) * iPos.w * 1.5;
    gl_Position = projectionMatrix * mv;
    vUv = uv; vCol = iCol; vMisc = iMisc; vRot = vec2(c, s);
    vL = normalize(mat3(viewMatrix) * uSun);
  }`;

const FRAG = (smoke: boolean) => /* glsl */ `
  uniform sampler2D uAtlas; uniform vec3 uSunC; uniform float uAmb;
  varying vec2 vUv; varying vec4 vCol; varying vec4 vMisc; varying vec2 vRot; varying vec3 vL;
  vec2 cellUv(float i, vec2 uv) { return (vec2(mod(i, ${GRID}.0), floor(i / ${GRID}.0)) + uv) / ${GRID}.0; }
  void main() {
    // the seed picks a mirror and a start a few frames in, so no two puffs churn alike
    vec2 uv = vUv;
    if (vMisc.z > 0.5) uv.x = 1.0 - uv.x;
    float fr = min(clamp(vMisc.y, 0.0, 1.0) * ${FRAMES - 9}.0 + fract(vMisc.z * 2.0) * 8.0, ${FRAMES - 1}.0 - 0.001);
    float i0 = floor(fr);
    vec4 s = mix(texture2D(uAtlas, cellUv(i0, uv)), texture2D(uAtlas, cellUv(min(i0 + 1.0, ${FRAMES - 1}.0), uv)), fr - i0);
    ${smoke ? `
    float a = s.a * vCol.a;
    if (a < 0.003) discard;
    vec3 n = vec3(s.g * 2.0 - 1.0, s.b * 2.0 - 1.0, 0.0);
    if (vMisc.z > 0.5) n.x = -n.x;
    n.xy = vec2(vRot.x * n.x - vRot.y * n.y, vRot.y * n.x + vRot.x * n.y);
    n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy)));
    // wrapped light: the sun's side lit, the far side in its own shade, never black
    float w = clamp(dot(n, vL) * 0.6 + 0.4, 0.0, 1.0);
    vec3 col = vCol.rgb * (uAmb + uSunC * w * w * 0.95);
    // smoke the fire is still lighting glows from inside, most where it is thick
    col += vCol.rgb * vMisc.w * (0.6 + s.a * 1.4);
    gl_FragColor = vec4(col, a);
    ` : `
    float h = s.r;
    float a = h * vCol.a;
    if (a < 0.003) discard;
    // the hottest folds burn whiter while the puff is young
    vec3 col = vCol.rgb * (0.4 + h * 1.25) + vec3(1.0, 0.85, 0.6) * smoothstep(0.7, 1.0, h) * (1.0 - vMisc.y) * 1.6;
    gl_FragColor = vec4(col, a);
    `}
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** One draw of puffs: flame (added) or smoke (laid over). Slots are written each frame by the effects that own them. */
export class PuffLayer {
  readonly mesh: Mesh;
  private readonly pos: InstancedBufferAttribute;
  private readonly col: InstancedBufferAttribute;
  private readonly misc: InstancedBufferAttribute;
  /** Which slots hold a puff, how many do, and whether any slot changed since the last commit. */
  private readonly live: Uint8Array;
  private lit = 0;
  private dirty = false;

  constructor(readonly count: number, smoke: boolean) {
    this.live = new Uint8Array(count);
    const quad = new PlaneGeometry(1, 1);
    const g = new InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('uv', quad.getAttribute('uv'));
    const attr = () => new InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(DynamicDrawUsage);
    this.pos = attr(); this.col = attr(); this.misc = attr();
    g.setAttribute('iPos', this.pos); g.setAttribute('iCol', this.col); g.setAttribute('iMisc', this.misc);
    g.instanceCount = count;
    const mat = new ShaderMaterial({
      uniforms: { uAtlas: atlas, uSun: { value: SUN }, uSunC: { value: new Color(1, 0.95, 0.88) }, uAmb: { value: 0.2 } },
      vertexShader: VERT, fragmentShader: FRAG(smoke),
      transparent: true, depthWrite: false, blending: smoke ? NormalBlending : AdditiveBlending,
    });
    this.mesh = new Mesh(g, mat);
    this.mesh.frustumCulled = false;
    // flame added over its own smoke: burning gas glows through the soot it makes
    this.mesh.renderOrder = smoke ? 1 : 2;
  }

  /** Write slot `i` for this frame. `age` 0 to 1 runs the flipbook. */
  set(i: number, x: number, y: number, z: number, size: number, c: Color, alpha: number, turn: number, age: number, seed: number, warm: number): void {
    const P = this.pos.array as Float32Array, C = this.col.array as Float32Array, M = this.misc.array as Float32Array, o = i * 4;
    P[o] = x; P[o + 1] = y; P[o + 2] = z; P[o + 3] = size;
    C[o] = c.r; C[o + 1] = c.g; C[o + 2] = c.b; C[o + 3] = alpha;
    M[o] = turn; M[o + 1] = age; M[o + 2] = seed; M[o + 3] = warm;
    if (!this.live[i]) { this.live[i] = 1; this.lit++; }
    this.dirty = true;
  }

  /** Slot `i` draws nothing (a zero-size quad covers no pixels). */
  hide(i: number): void {
    (this.pos.array as Float32Array)[i * 4 + 3] = 0;
    (this.col.array as Float32Array)[i * 4 + 3] = 0;
    if (this.live[i]) { this.live[i] = 0; this.lit--; }
    this.dirty = true;
  }

  /**
   * Send this frame's slots to the GPU, only when one changed; with no puff in any slot the layer isn't drawn at all
   * (every quad would be zero-sized). docs/PERF.md, pass 17.
   */
  commit(): void {
    if (this.dirty) { this.pos.needsUpdate = true; this.col.needsUpdate = true; this.misc.needsUpdate = true; this.dirty = false; }
    this.mesh.visible = this.lit > 0;
  }
}
