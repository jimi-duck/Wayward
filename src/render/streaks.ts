import {
  AdditiveBlending, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedBufferGeometry, Float32BufferAttribute, Mesh, ShaderMaterial,
  type Scene,
} from 'three';

// ── fire as light ─────────────────────────────────────────────────────────
// Every bolt, slug, plasma ball and torpedo in the sky is one instance of a
// flat ribbon that turns to face the camera about its own line of flight, in
// one draw call. The shader paints the whole shot: a white-hot head with a
// round nose, a sheath in the shot's colour, a tail that thins to nothing.
// Before this, a shot was two lit-up boxes or spheres (up to 300 triangles
// each, two draws per kind) and a torpedo was two sprites; now it is two
// triangles, and the look is a streak of light rather than a lump.
//
// A shot never gets thinner than a couple of pixels, however far off: a
// bolt at the edge of the sky must still be seen coming.

/** How a shot is shaped. */
export const STREAK = {
  /** A laser lance: long, thin, a hard white core in a sheath. */
  lance: 0,
  /** An enemy slug: a round nose and a short tail. */
  slug: 1,
  /** A plasma ball (shootable): a pulsing orb, barely a tail. */
  orb: 2,
  /** A torpedo: a bright head and a long exhaust. */
  torp: 3,
} as const;
export type StreakStyle = (typeof STREAK)[keyof typeof STREAK];

const VERT = /* glsl */ `
  attribute vec3 aPos;      // the head, world space
  attribute vec3 aDir;      // unit vector of flight
  attribute vec4 aSize;     // length, width, style, phase
  attribute vec4 aCol;      // sheath colour (HDR), core strength
  uniform float uMinPx;     // world width per unit distance: the thinnest a streak may be
  varying vec2 vUv;         // x: 0 at the tail to 1 at the head; y: -1 to 1 across
  varying vec4 vCol;
  varying vec2 vShape;      // style, phase
  varying float vAspect;    // length over width, for the round nose
  void main() {
    vec3 eye = cameraPosition - aPos;
    float dist = length(eye);
    vec3 side = normalize(cross(aDir, eye / max(dist, 1e-4)));
    float width = max(aSize.y, dist * uMinPx);
    // a head-on shot is seen end on: keep it a spot, not a hairline
    float len = max(aSize.x, width * 1.2);
    // position.x runs 0 (tail) to 1 (head); position.y -1 to 1 across
    vec3 world = aPos - aDir * len * (1.0 - position.x) + side * position.y * width * 0.5;
    vUv = position.xy;
    vCol = aCol;
    vShape = aSize.zw;
    vAspect = len / width;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }`;

const FRAG = /* glsl */ `
  varying vec2 vUv; varying vec4 vCol; varying vec2 vShape; varying float vAspect;
  void main() {
    float u = vUv.x, v = abs(vUv.y);
    float style = vShape.x, phase = vShape.y;
    // a flame is a cone: wide at the head, a thread at the tail
    if (style > 2.5) v /= mix(0.2, 1.0, u);
    // the nose: round, as wide as the ribbon, so a short ribbon is a pill
    float noseLen = clamp(1.0 / vAspect, 0.04, 1.0);
    float nose = u > 1.0 - noseLen ? length(vec2((u - (1.0 - noseLen)) / noseLen, v)) : v;
    float body = 1.0 - smoothstep(0.55, 1.0, nose);
    float tailLen = style < 0.5 ? 1.0 : style < 1.5 ? 0.85 : style < 2.5 ? 0.3 : 1.0;
    float tail = pow(smoothstep(0.0, tailLen, u), style > 2.5 ? 2.2 : 1.4);
    // sheath: soft, wider at the head; core: narrow and white
    float sheath = body * tail * (0.35 + 0.65 * (1.0 - v * v));
    if (style > 2.5) sheath *= 1.0 - smoothstep(0.0, 1.0, v);
    float coreW = style < 0.5 ? 0.16 : style < 1.5 ? 0.3 : style < 2.5 ? 0.5 : 0.34;
    float core = (1.0 - smoothstep(0.0, coreW + 0.25, nose)) * tail;
    core = pow(core, style < 0.5 ? 2.0 : 1.4) * vCol.w;
    // torpedo motor and plasma orb flicker; the phase keeps them apart
    float flick = style > 1.5 ? 0.88 + 0.12 * sin(phase * 6.2831853) : 1.0;
    vec3 hot = vec3(4.2, 3.2, 2.6);
    vec3 rgb = (vCol.rgb * sheath + hot * core) * flick;
    float a = clamp(sheath + core, 0.0, 1.0);
    gl_FragColor = vec4(rgb, a);
  }`;

export class Streaks {
  private readonly pos: InstancedBufferAttribute;
  private readonly dir: InstancedBufferAttribute;
  private readonly size: InstancedBufferAttribute;
  private readonly col: InstancedBufferAttribute;
  private readonly geo = new InstancedBufferGeometry();
  readonly mesh: Mesh;
  private n = 0;

  constructor(scene: Scene, private readonly max = 640) {
    // a quad: x 0..1 tail to head, y -1..1
    this.geo.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    const attr = (items: number) => {
      const a = new InstancedBufferAttribute(new Float32Array(max * items), items);
      a.setUsage(DynamicDrawUsage);
      return a;
    };
    this.pos = attr(3);
    this.dir = attr(3);
    this.size = attr(4);
    this.col = attr(4);
    this.geo.setAttribute('aPos', this.pos);
    this.geo.setAttribute('aDir', this.dir);
    this.geo.setAttribute('aSize', this.size);
    this.geo.setAttribute('aCol', this.col);
    this.geo.instanceCount = 0;
    const mat = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMinPx: { value: 0.003 } },
      transparent: true,
      side: DoubleSide, // the ribbon turns to face the camera, so its winding flips
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    this.mesh = new Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /** Start a frame's list of streaks. */
  begin(): void {
    this.n = 0;
  }

  /**
   * Add one. (x, y, z) is the head; (dx, dy, dz) need not be a unit vector.
   * `length` and `width` are world units; `rgb` is the sheath, in HDR.
   */
  push(
    x: number, y: number, z: number, dx: number, dy: number, dz: number,
    length: number, width: number, style: StreakStyle, rgb: { r: number; g: number; b: number }, core = 1, phase = 0,
  ): void {
    if (this.n >= this.max) return;
    const m = Math.hypot(dx, dy, dz) || 1, i = this.n++;
    this.pos.setXYZ(i, x, y, z);
    this.dir.setXYZ(i, dx / m, dy / m, dz / m);
    this.size.setXYZW(i, length, width, style, phase);
    this.col.setXYZW(i, rgb.r, rgb.g, rgb.b, core);
  }

  /** Upload what was pushed. */
  end(): void {
    this.geo.instanceCount = this.n;
    for (const a of [this.pos, this.dir, this.size, this.col]) a.needsUpdate = true;
  }
}
