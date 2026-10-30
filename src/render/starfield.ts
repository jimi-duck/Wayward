import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Group, Points, ShaderMaterial, Vector3 } from 'three';
import { dirOf, skyLayout, type Sky } from './sky';

// ── the stars ─────────────────────────────────────────────────────────────
// Four layers of resolved stars on a sphere at infinity, one Points draw each:
//
//   dust     thousands of faint pinpoints, a pixel across; thick along the galactic band and in clumps
//   mid      about a thousand, a little larger, white to blue-white, a few warm
//   bright   a hundred or so, rare, with a soft halo, a faint cross and a slow twinkle
//   lamps    a dozen far lights in small groups (a distant yard, a lit hulk): pale ice, slowly pulsing
//
// The distribution is seeded by the sky, so each system has its own constellations: density follows the band
// and a handful of clumps, never a uniform scatter. Each layer rides its own small offset against the ship's
// travel (true parallax at a tiny scale: the further the layer, the less it moves), and the offset is a sine, so
// it never runs away however far the ship goes.

const R = 1000;
/** A layer's shift is a sine of the ship's travel: this many units to the cycle. */
const REACH = 4000;

interface Layer {
  /** Stars on the sphere, before the tier's thinning. */
  count: number;
  size: [number, number];
  /** Brightness at the top of the range; the rest follow a heavy tail below it. */
  bright: number;
  /** 0 smooth scatter, 1 follows the band and the clumps. */
  clump: number;
  /** 0 plain point, 1 halo and cross. */
  glow: number;
  /** Twinkle depth, 0 to 1. */
  twinkle: number;
  /** Radians the layer slides per unit the ship travels (angle on the sphere): the nearer, the more. */
  rate: number;
  /** The sky's star count scales it (the lamps do not). */
  sky: boolean;
}

const LAYERS: readonly Layer[] = [
  { count: 9500, size: [0.9, 1.3], bright: 0.22, clump: 1, glow: 0, twinkle: 0, rate: 3e-6, sky: true },
  { count: 1300, size: [1.4, 2.3], bright: 0.62, clump: 0.7, glow: 0, twinkle: 0.12, rate: 2.5e-5, sky: true },
  { count: 110, size: [3.6, 6.4], bright: 1.15, clump: 0.2, glow: 1, twinkle: 0.4, rate: 5e-5, sky: true },
  { count: 0, size: [2.4, 3.6], bright: 0.55, clump: 0, glow: 0.5, twinkle: 0.85, rate: 4e-5, sky: false },
];

function rand(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const WHITE = new Color(0.95, 0.97, 1), BLUE = new Color(0.7, 0.82, 1), WARM = new Color(1, 0.84, 0.66), ICE = new Color(0.62, 0.86, 1);

/** A star colour from its temperature: mostly white, a good share blue-white, a few warm. */
function tint(t: number, out: Color): Color {
  if (t < 0.1) return out.copy(WARM).lerp(WHITE, t * 4);
  if (t > 0.58) return out.copy(WHITE).lerp(BLUE, Math.min(1, (t - 0.58) * 2.4));
  return out.copy(WHITE);
}

export class Starfield {
  readonly group = new Group();
  private readonly mat: ShaderMaterial;
  private readonly layers: { pts: Points; layer: Layer }[] = [];
  private sky: Sky | null = null;
  private thin = 1;
  private t = 0;

  constructor() {
    this.mat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false,
      uniforms: { uDpr: { value: 1 }, uTime: { value: 0 }, uMotion: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute vec3 color; attribute vec3 fx;
        varying vec3 vCol; varying vec2 vFx;
        uniform float uDpr, uTime, uMotion;
        void main() {
          // fx: glow, phase, twinkle depth. Each star keeps its own pace and phase; with reduced motion they hold at the middle.
          float wave = mix(0.0, sin(uTime * (0.7 + fract(fx.y * 7.13) * 3.1) + fx.y * 40.0), uMotion);
          float tw = 1.0 - fx.z * (0.5 - 0.5 * wave);
          vCol = color;
          vFx = vec2(fx.x, tw);
          gl_PointSize = size * uDpr * mix(1.0, 0.88 + 0.12 * tw, fx.x);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position.z = gl_Position.w; // at infinity
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying vec2 vFx;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float r = length(p) * 2.0;
          float core = smoothstep(1.0, 0.0, r * mix(1.1, 3.2, vFx.x));
          core *= core;
          float halo = vFx.x * exp(-r * r * 7.0) * 0.38;
          float cross = vFx.x * (max(0.0, 1.0 - abs(p.x) * 24.0) * max(0.0, 1.0 - abs(p.y) * 2.2) + max(0.0, 1.0 - abs(p.y) * 24.0) * max(0.0, 1.0 - abs(p.x) * 2.2)) * 0.22;
          float a = (core + halo + cross) * vFx.y;
          gl_FragColor = vec4(vCol * a, 1.0);
        }`,
    });
  }

  /** A new sky: new constellations, thicker along its galactic band. */
  setSky(sky: Sky): void {
    this.sky = sky;
    this.build();
  }

  /** Low tier thins the layers to half; the same stars come back when the tier does. */
  setThin(low: boolean): void {
    const thin = low ? 0.5 : 1;
    if (thin === this.thin) return;
    this.thin = thin;
    if (this.sky) this.build();
  }

  setPixelRatio(dpr: number): void {
    this.mat.uniforms.uDpr!.value = dpr;
  }

  /** `cx`, `cz` the ship's place; `motion` 0 holds the twinkle still (reduced motion). */
  update(cx: number, cz: number, dt: number, motion: boolean): void {
    this.t = (this.t + dt) % 6000;
    this.mat.uniforms.uTime!.value = this.t;
    this.mat.uniforms.uMotion!.value = motion ? 1 : 0;
    for (const { pts, layer } of this.layers) {
      // against the ship's travel, and bounded: a sine of the distance, amplitude rate * REACH * R
      const a = layer.rate * REACH * R;
      pts.position.set(-a * Math.sin(cx / REACH), 0, -a * Math.sin(cz / REACH));
    }
  }

  private build(): void {
    const sky = this.sky!;
    for (const { pts } of this.layers) { pts.removeFromParent(); pts.geometry.dispose(); }
    this.layers.length = 0;
    const r = rand(sky.seed * 31 + 11), lay = skyLayout(sky);
    // clumps: a dozen soft knots in the density, so the stars gather and thin like a real sky
    const knots = Array.from({ length: 12 }, () => ({ d: dirOf(r() * 360, Math.asin(r() * 2 - 1) * 57.3), w: 0.04 + r() * 0.16, k: 0.4 + r() * 0.8 }));
    const d = new Vector3(), jitter = new Vector3(), c = new Color();
    const density = (v: Vector3, clump: number): number => {
      const bd = v.dot(lay.bandN);
      let n = 0;
      for (const k of knots) n += k.k * Math.exp(-(1 - v.dot(k.d)) / k.w);
      const rich = 0.22 + 0.5 * Math.min(1, n) + 0.9 * Math.exp(-bd * bd * 9);
      return 1 + (rich - 1) * clump;
    };
    for (const layer of LAYERS) {
      const want = layer.sky ? Math.round(layer.count * this.thin * Math.max(0.3, sky.stars)) : 12 + Math.floor(r() * 6);
      const pos = new Float32Array(want * 3), col = new Float32Array(want * 3), size = new Float32Array(want), fx = new Float32Array(want * 3);
      let n = 0, guard = want * 40;
      while (n < want && guard-- > 0) {
        const u = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - u * u);
        if (layer.sky) {
          d.set(Math.cos(a) * q, u, Math.sin(a) * q);
          if (r() * 2.1 > density(d, layer.clump)) continue;
        } else {
          // the lamps: groups of two to four in the half of the sky the camera looks at (below the horizon), each its own small knot
          if (n % 3 === 0) d.copy(dirOf(r() * 360, -6 - r() * 36));
          else d.add(jitter.set(r() - 0.5, (r() - 0.5) * 0.5, r() - 0.5).multiplyScalar(0.03)).normalize();
        }
        pos[n * 3] = d.x * R; pos[n * 3 + 1] = d.y * R; pos[n * 3 + 2] = d.z * R;
        // heavy tail: most are faint, a few stand out
        const b = layer.bright * (0.22 + 0.78 * Math.pow(r(), layer.glow >= 1 ? 1.4 : 3.2));
        if (layer.sky) tint(r(), c); else c.copy(ICE).lerp(WHITE, r() * 0.5);
        col[n * 3] = c.r * b; col[n * 3 + 1] = c.g * b; col[n * 3 + 2] = c.b * b;
        size[n] = layer.size[0] + r() * (layer.size[1] - layer.size[0]);
        fx[n * 3] = layer.glow; fx[n * 3 + 1] = r(); fx[n * 3 + 2] = layer.twinkle * (layer.sky && layer.glow < 1 ? (r() < 0.25 ? 1 : 0) : 1);
        n++;
      }
      const geo = new BufferGeometry();
      geo.setAttribute('position', new Float32BufferAttribute(pos.subarray(0, n * 3), 3));
      geo.setAttribute('color', new Float32BufferAttribute(col.subarray(0, n * 3), 3));
      geo.setAttribute('size', new Float32BufferAttribute(size.subarray(0, n), 1));
      geo.setAttribute('fx', new Float32BufferAttribute(fx.subarray(0, n * 3), 3));
      const pts = new Points(geo, this.mat);
      pts.frustumCulled = false;
      pts.renderOrder = -2;
      this.layers.push({ pts, layer });
      this.group.add(pts);
    }
  }
}
