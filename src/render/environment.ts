import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, DirectionalLight, Float32BufferAttribute, FogExp2,
  Group, HemisphereLight, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Points,
  Scene, ShaderMaterial, SphereGeometry, type Camera, type WebGLRenderer,
} from 'three';
import { spaceTexture } from './textures';

// ── deep space ────────────────────────────────────────────────────────────
// No grid and no floor: just the dark. Back to front: a painted backdrop (a
// faint galactic band, two far nebulae), three layers of resolved stars at
// infinity, and space dust that streaks with the ship's speed. Fog is thin,
// so a hull 150 units out is still a silhouette with engines lit, but rock at
// the edge of the field fades up out of the dark instead of appearing.
//
// Lights: a hard warm key from high on the left (the reference's sun), a
// faint cold fill, and a dim rim from behind. Metal needs something to
// reflect, so the scene also gets a small, dark environment map: a black
// sky with a warm window where the key light is and a cold one opposite.

const VOID = new Color('#030509');
const INK = new Color('#cfd6e0');
const NEBULA = new Color('#1b0e28');
const DUST_BOX = 130;

export class Environment {
  readonly group = new Group();
  private readonly stars = new Group();
  private readonly dustBase: Float32Array;
  private readonly dustPos: BufferAttribute;
  private readonly rim: DirectionalLight;
  private readonly key: DirectionalLight;
  private readonly starMat: ShaderMaterial;
  private readonly scene: Scene;
  private readonly fog: FogExp2;

  constructor(scene: Scene, renderer: WebGLRenderer) {
    scene.background = spaceTexture();
    scene.backgroundIntensity = 1;
    this.scene = scene;
    this.fog = new FogExp2(VOID.getHex(), 0.0042);
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
    this.addStars(7000, 1.2, 1.9, 0.5);
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

    this.key = new DirectionalLight(0xffe6c8, 4.4);
    this.rim = new DirectionalLight(0x7f9cc8, 0.9);
    this.group.add(this.key, this.key.target, new HemisphereLight(0x56607a, 0x0b0907, 0.8), this.rim);
    scene.add(this.group);
  }

  /**
   * The sector's weather: `nebula` (0 to 1) thickens the fog to a violet murk
   * and dims the sky; `flash` (0 to 1) is a lightning flash in an ion storm.
   */
  weather(nebula: number, flash: number): void {
    this.fog.density = 0.0042 + nebula * 0.016;
    this.fog.color.copy(VOID).lerp(NEBULA, nebula);
    this.scene.backgroundIntensity = 1 - nebula * 0.55 + flash * 0.6;
    this.key.intensity = 4.4 + flash * 9;
    this.key.color.setRGB(1, 0.9 + flash * 0.1, 0.78 + flash * 0.22);
  }

  setPixelRatio(dpr: number): void {
    this.starMat.uniforms.uDpr!.value = dpr;
  }

  update(camera: Camera, cx: number, cz: number, vx: number, vz: number): void {
    this.stars.position.copy(camera.position);
    // the key light keeps its angle, wherever the ship goes
    this.key.position.set(cx - 40, 55, cz - 10);
    this.key.target.position.set(cx, 0, cz);
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

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}
