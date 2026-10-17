import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

// Textures painted on a canvas at startup, so the game downloads none. Each is
// made once and shared. (The hull plating lives in kit.ts; rock is shaded
// procedurally in rocks.ts.)

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function finish(c: HTMLCanvasElement, srgb = true): Texture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const cache = new Map<string, Texture>();
function once(key: string, paint: () => Texture): Texture {
  let t = cache.get(key);
  if (!t) { t = paint(); cache.set(key, t); }
  return t;
}

/** A soft round glow for sprites, white so a material colour tints it. */
export function glowTexture(): Texture {
  return once('glow', () => {
    const [c, g] = canvas(128, 128);
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,.75)');
    grad.addColorStop(0.45, 'rgba(255,255,255,.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return finish(c, false);
  });
}

/**
 * Dust in space: a warped, layered noise, wispy at the edges and clumped in
 * the middle, white so a material colour tints it. Ragged and filamentary, not
 * a ball of soft blobs; the edge always falls away to nothing.
 */
export function cloudTexture(): Texture {
  return once('cloud', () => {
    const N = 256, [c, g] = canvas(N, N);
    const r = rand(77), lat = new Float32Array(33 * 33);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    const val = (x: number, y: number) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const at = (i: number, j: number) => lat[((j & 31) * 33) + (i & 31)]!;
      return at(xi, yi) * (1 - u) * (1 - v) + at(xi + 1, yi) * u * (1 - v) + at(xi, yi + 1) * (1 - u) * v + at(xi + 1, yi + 1) * u * v;
    };
    const fbm = (x: number, y: number) => {
      let a = 0.5, f = 1, t = 0;
      for (let o = 0; o < 5; o++) { t += a * val(x * f, y * f); f *= 2.03; a *= 0.5; }
      return t;
    };
    const img = g.createImageData(N, N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = i / N, y = j / N, dx = x - 0.5, dy = (y - 0.5) * 1.15, d = Math.hypot(dx, dy) * 2;
        // warp the lookup by itself, which pulls the noise into filaments
        const qx = fbm(x * 3, y * 3), qy = fbm(x * 3 + 5.2, y * 3 + 1.3);
        const n = fbm(x * 4 + qx * 3.2, y * 4 + qy * 3.2);
        const body = Math.max(0, Math.min(1, (n - 0.36) / 0.34));
        const fall = Math.max(0, 1 - d * d), a = body * body * (3 - 2 * body) * Math.pow(fall, 1.4);
        const k = (j * N + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
        img.data[k + 3] = Math.round(Math.min(1, a * 1.1) * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, false);
  });
}

/**
 * A stream of dust: strands pulled long by a warped, ridged noise, bright
 * threads inside darker bands with gaps between, curling at the ends. White,
 * so a material colour tints it. `seed` gives each layer its own pattern.
 */
export function streamTexture(seed = 1): Texture {
  return once('stream' + seed, () => {
    const W = 256, H = 128, [c, g] = canvas(W, H);
    const r = rand(300 + seed * 17), lat = new Float32Array(33 * 33);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    const val = (x: number, y: number) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const at = (i: number, j: number) => lat[((j & 31) * 33) + (i & 31)]!;
      return at(xi, yi) * (1 - u) * (1 - v) + at(xi + 1, yi) * u * (1 - v) + at(xi, yi + 1) * (1 - u) * v + at(xi + 1, yi + 1) * u * v;
    };
    const fbm = (x: number, y: number, o = 4) => {
      let a = 0.5, f = 1, t = 0;
      for (let k = 0; k < o; k++) { t += a * val(x * f, y * f); f *= 2.03; a *= 0.5; }
      return t;
    };
    const img = g.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = i / W, y = j / H, d = Math.hypot(x - 0.5, (y - 0.5) * 2) * 2;
        // warp, then stretch along the stream so the noise reads as strands
        const qx = fbm(x * 2.5 + seed, y * 4), qy = fbm(x * 2.5 + 7.7, y * 4 + seed);
        const wx = x * 3 + qx * 2.4, wy = y * 9 + qy * 3.2;
        const body = fbm(wx, wy, 4);
        const strand = 1 - Math.abs(fbm(wx * 1.6, wy * 2.4, 3) * 2 - 1);
        const thread = Math.pow(Math.max(0, strand - 0.72) / 0.28, 2);
        const band = Math.max(0, Math.min(1, (body - 0.4) / 0.3));
        const fall = Math.max(0, 1 - d * d);
        const a = (band * 0.55 + thread * band * 0.9) * Math.pow(fall, 1.3);
        const k = (j * W + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
        img.data[k + 3] = Math.round(Math.min(1, a) * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, false);
  });
}

/**
 * A fold of auroral curtain, tall and narrow: a hard bright lower edge, thinning rays rising from it, and a
 * soft side falloff. White, so a material colour tints it. `seed` gives each fold its own rays.
 */
export function curtainTexture(seed = 1): Texture {
  return once('curtain' + seed, () => {
    const W = 64, H = 256, [c, g] = canvas(W, H);
    const r = rand(500 + seed * 13), rays = new Float32Array(W);
    for (let i = 0; i < W; i++) rays[i] = r();
    const img = g.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      const v = 1 - j / H; // 0 at the lower edge, 1 at the top
      for (let i = 0; i < W; i++) {
        const x = i / (W - 1), side = Math.pow(Math.sin(x * Math.PI), 0.8);
        const ray = 0.45 + 0.55 * (0.5 * rays[i]! + 0.5 * rays[Math.min(W - 1, i + 1)]!);
        // the edge is a thin hard line a little above the bottom, the rays fade up from it
        const edge = Math.exp(-Math.pow((v - 0.1) / 0.035, 2));
        const body = Math.pow(Math.max(0, 1 - v), 1.8) * Math.min(1, v / 0.08);
        const a = Math.min(1, (edge * 0.9 + body * ray * 0.75) * side);
        const k = (j * W + i) * 4;
        img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
        img.data[k + 3] = Math.round(a * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return finish(c, false);
  });
}

/** A ragged ball of flame, white at the heart: tinted and grown for fireballs. */
export function fireTexture(): Texture {
  return once('fire', () => {
    const [c, g] = canvas(128, 128), r = rand(17);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * 30, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, rad = 14 + r() * 26;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, 'rgba(255,255,255,.55)');
      grad.addColorStop(0.5, 'rgba(255,255,255,.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // fade the square's corners right out
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = mask;
    g.fillRect(0, 0, 128, 128);
    return finish(c, false);
  });
}

/** A billow of smoke: grey, lumpy, soft-edged. Drawn with normal blending, so it darkens. */
export function smokeTexture(): Texture {
  return once('smoke', () => {
    const [c, g] = canvas(128, 128), r = rand(29);
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = r() * 34, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, rad = 10 + r() * 24;
      const v = 150 + r() * 80;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, `rgba(${v},${v},${v},.32)`);
      grad.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.fillStyle = grad;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(64, 64, 16, 64, 64, 64);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = mask;
    g.fillRect(0, 0, 128, 128);
    return finish(c, false);
  });
}
