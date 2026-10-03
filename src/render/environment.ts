import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, Group,
  HemisphereLight, LineBasicMaterial, LineSegments, Mesh, PlaneGeometry, Points, PointsMaterial, ShaderMaterial,
  type Camera, type Scene,
} from 'three';

// ── deep space ────────────────────────────────────────────────────────────
// Four layers, back to front:
//  · stars at infinity, which only turn with the camera;
//  · a tactical grid on the play plane, cyan at a whisper, fading with
//    distance, so drift and speed read even in an empty sector;
//  · space dust around the ship that streaks along the ship's velocity, which
//    is the speed readout this game never needed a gauge for (the original
//    did the same with its near star layer);
//  · lights: one hard key, a cool fill, and a cyan rim from behind the camera.

const VOID = new Color('#03060B');
const INK = new Color('#E8F3F7');
const SIGNAL = new Color('#00F0FF');

export class Environment {
  readonly group = new Group();
  private readonly stars = new Group();
  private readonly starMats: Array<{ mat: PointsMaterial; px: number }> = [];
  private readonly grid: Mesh;
  private readonly gridMat: ShaderMaterial;
  private readonly dust: LineSegments;
  private readonly dustBase: Float32Array;
  private readonly dustPos: BufferAttribute;
  private readonly rim: DirectionalLight;

  constructor(scene: Scene) {
    scene.background = VOID;

    this.addStars(2400, 1.1, 0.55);
    this.addStars(380, 2.0, 1);
    this.group.add(this.stars);

    this.gridMat = new ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: SIGNAL }, uCenter: { value: [0, 0] }, uFade: { value: 120 }, uAlpha: { value: 0.16 } },
      vertexShader: /* glsl */ `
        varying vec2 vWorld;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec2 uCenter; uniform float uFade; uniform float uAlpha;
        varying vec2 vWorld;
        float grid(vec2 p, float cell) {
          vec2 q = p / cell;
          vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
          return 1.0 - min(min(g.x, g.y), 1.0);
        }
        void main() {
          float a = grid(vWorld, 10.0) * 0.4 + grid(vWorld, 50.0) * 0.6;
          float d = length(vWorld - uCenter);
          a *= 1.0 - smoothstep(uFade * 0.3, uFade, d);
          gl_FragColor = vec4(uColor, a * uAlpha);
        }`,
    });
    this.grid = new Mesh(new PlaneGeometry(600, 600).rotateX(-Math.PI / 2), this.gridMat);
    this.grid.position.y = -0.6;
    this.grid.renderOrder = -1;
    this.group.add(this.grid);

    // dust: N segments, each a fixed offset in a box that tiles around the ship
    const N = 240;
    this.dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.dustBase[i * 3] = Math.random() * DUST_BOX[0];
      this.dustBase[i * 3 + 1] = -14 + Math.random() * 17;
      this.dustBase[i * 3 + 2] = Math.random() * DUST_BOX[2];
    }
    const g = new BufferGeometry();
    this.dustPos = new BufferAttribute(new Float32Array(N * 6), 3);
    g.setAttribute('position', this.dustPos);
    const col = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const b = 0.1 + Math.random() * 0.28;
      col.set([INK.r * b, INK.g * b, INK.b * b, 0, 0, 0], i * 6); // head bright, tail dark
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    this.dust = new LineSegments(g, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }));
    this.dust.frustumCulled = false;
    this.group.add(this.dust);

    const sun = new DirectionalLight(0xfff1dc, 2.4);
    sun.position.set(-40, 60, 20);
    this.rim = new DirectionalLight(0x6fe8ff, 1.1);
    this.group.add(sun, new HemisphereLight(0x7f9fd8, 0x0a0d16, 0.9), this.rim);
    scene.add(this.group);
  }

  setPixelRatio(dpr: number): void {
    for (const s of this.starMats) s.mat.size = s.px * dpr;
  }

  /** Follow the camera and the ship. `vx`, `vz` are the ship's velocity. */
  update(camera: Camera, cx: number, cz: number, vx: number, vz: number): void {
    this.stars.position.copy(camera.position);
    this.grid.position.x = cx;
    this.grid.position.z = cz;
    (this.gridMat.uniforms.uCenter!.value as number[])[0] = cx;
    (this.gridMat.uniforms.uCenter!.value as number[])[1] = cz;

    // the rim light sits behind the camera, so silhouettes catch a cyan edge
    this.rim.position.set(camera.position.x - cx, camera.position.y * 0.4, camera.position.z - cz).multiplyScalar(-1);

    const P = this.dustPos.array as Float32Array, B = this.dustBase;
    const sx = -vx * 0.035, sz = -vz * 0.035; // streak: 35ms of travel
    const hx = DUST_BOX[0] / 2, hz = DUST_BOX[2] / 2;
    for (let i = 0; i < B.length / 3; i++) {
      const x = cx + wrap(B[i * 3]! - cx, DUST_BOX[0]) - hx;
      const z = cz + wrap(B[i * 3 + 2]! - cz, DUST_BOX[2]) - hz;
      const y = B[i * 3 + 1]!;
      P[i * 6] = x; P[i * 6 + 1] = y; P[i * 6 + 2] = z;
      P[i * 6 + 3] = x + sx + 0.06; P[i * 6 + 4] = y; P[i * 6 + 5] = z + sz;
    }
    this.dustPos.needsUpdate = true;
  }

  private addStars(count: number, px: number, brightness: number): void {
    const pos: number[] = [], col: number[] = [], c = new Color();
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      pos.push(Math.cos(t) * r * 1500, u * 1500, Math.sin(t) * r * 1500);
      const tint = Math.random();
      c.setHSL(tint < 0.15 ? 0.08 : tint > 0.85 ? 0.52 : 0, tint < 0.15 || tint > 0.85 ? 0.6 : 0, 1);
      const b = brightness * (0.35 + Math.random() * 0.65);
      col.push(c.r * b, c.g * b, c.b * b);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    const mat = new PointsMaterial({ size: px, sizeAttenuation: false, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -2;
    this.starMats.push({ mat, px });
    this.stars.add(pts);
  }
}

const DUST_BOX = [130, 0, 130] as const;

/** v mod m into [0, m). */
function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}
