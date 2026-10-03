import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, FogExp2, Group,
  HemisphereLight, LineBasicMaterial, LineSegments, Mesh, PlaneGeometry, Points, PointsMaterial, ShaderMaterial,
  type Camera, type Scene,
} from 'three';
import { nebulaTexture } from './textures';

// ── deep space ────────────────────────────────────────────────────────────
// Back to front: a nebula backdrop (painted once), stars at infinity, a hex
// tactical grid on the play plane, space dust that streaks with the ship's
// speed, and fog, so rock coming in from the edge of the field fades up out
// of the dark instead of appearing. Lights: one hard key, a cool fill, and a
// cyan rim from behind the camera that picks out every silhouette.

const VOID = new Color('#03060B');
const INK = new Color('#E8F3F7');
const SIGNAL = new Color('#00F0FF');
const DUST_BOX = 130;

export class Environment {
  readonly group = new Group();
  private readonly stars = new Group();
  private readonly starMats: Array<{ mat: PointsMaterial; px: number }> = [];
  private readonly grid: Mesh;
  private readonly gridMat: ShaderMaterial;
  private readonly dustBase: Float32Array;
  private readonly dustPos: BufferAttribute;
  private readonly rim: DirectionalLight;

  constructor(scene: Scene) {
    scene.background = nebulaTexture();
    scene.fog = new FogExp2(VOID.getHex(), 0.0105);

    this.addStars(2600, 1.1, 0.55);
    this.addStars(420, 2.0, 1);
    this.group.add(this.stars);

    this.gridMat = new ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uColor: { value: SIGNAL }, uCenter: { value: [0, 0] }, uFade: { value: 70 }, uAlpha: { value: 0.13 } },
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
        // distance to the nearest hex edge, in cell units
        float hexLine(vec2 p) {
          vec2 r = vec2(1.0, 1.7320508), h = r * 0.5;
          vec2 a = mod(p, r) - h, b = mod(p - h, r) - h;
          vec2 g = dot(a, a) < dot(b, b) ? a : b;
          g = abs(g);
          float d = 0.5 - max(dot(g, normalize(r)), g.x);
          float w = fwidth(p.x) * 1.2;
          return 1.0 - smoothstep(0.0, w, d);
        }
        void main() {
          float a = hexLine(vWorld / 3.2) * 0.55 + hexLine(vWorld / 16.0) * 0.6;
          float d = length(vWorld - uCenter);
          a *= 1.0 - smoothstep(uFade * 0.25, uFade, d);
          gl_FragColor = vec4(uColor, a * uAlpha);
        }`,
    });
    this.grid = new Mesh(new PlaneGeometry(400, 400).rotateX(-Math.PI / 2), this.gridMat);
    this.grid.position.y = -2.6;
    this.grid.renderOrder = -1;
    this.group.add(this.grid);

    const N = 260;
    this.dustBase = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.dustBase[i * 3] = Math.random() * DUST_BOX;
      this.dustBase[i * 3 + 1] = -10 + Math.random() * 14;
      this.dustBase[i * 3 + 2] = Math.random() * DUST_BOX;
    }
    const g = new BufferGeometry();
    this.dustPos = new BufferAttribute(new Float32Array(N * 6), 3);
    g.setAttribute('position', this.dustPos);
    const col = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const b = 0.12 + Math.random() * 0.3;
      col.set([INK.r * b, INK.g * b, INK.b * b, 0, 0, 0], i * 6);
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    const dust = new LineSegments(g, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false }));
    dust.frustumCulled = false;
    this.group.add(dust);

    const sun = new DirectionalLight(0xfff1dc, 2.6);
    sun.position.set(-30, 50, 25);
    this.rim = new DirectionalLight(0x6fe8ff, 1.4);
    this.group.add(sun, new HemisphereLight(0x8fa8e0, 0x0a0d16, 1.0), this.rim);
    scene.add(this.group);
  }

  setPixelRatio(dpr: number): void {
    for (const s of this.starMats) s.mat.size = s.px * dpr;
  }

  update(camera: Camera, cx: number, cz: number, vx: number, vz: number): void {
    this.stars.position.copy(camera.position);
    this.grid.position.x = cx;
    this.grid.position.z = cz;
    const c = this.gridMat.uniforms.uCenter!.value as number[];
    c[0] = cx; c[1] = cz;
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
    const mat = new PointsMaterial({ size: px, sizeAttenuation: false, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -2;
    this.starMats.push({ mat, px });
    this.stars.add(pts);
  }
}

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}
