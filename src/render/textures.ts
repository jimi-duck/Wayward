import { CanvasTexture, EquirectangularReflectionMapping, SRGBColorSpace, type Texture } from 'three';

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

/**
 * Deep space as an equirectangular backdrop: near black, a faint galactic
 * band of unresolved stars and blue-grey dust crossed by dark lanes, and a
 * couple of far, dim nebulae. The resolved stars are points, drawn on top.
 */
export function spaceTexture(): Texture {
  return once('space', () => {
    const W = 2048, H = 1024;
    const [c, g] = canvas(W, H), r = rand(31);
    g.fillStyle = '#020307';
    g.fillRect(0, 0, W, H);
    const cloud = (x: number, y: number, rad: number, rgb: string, a: number) => {
      for (const ox of [-W, 0, W]) {
        if (x + ox + rad < 0 || x + ox - rad > W) continue;
        const grad = g.createRadialGradient(x + ox, y, 0, x + ox, y, rad);
        grad.addColorStop(0, `rgba(${rgb},${a})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = grad;
        g.fillRect(x + ox - rad, y - rad, rad * 2, rad * 2);
      }
    };
    const band = (x: number) => H * 0.42 + Math.sin((x / W) * Math.PI * 2 + 0.6) * H * 0.2;
    // the band: dust and unresolved stars
    for (let i = 0; i < 520; i++) {
      const x = r() * W, y = band(x) + (r() - 0.5) * (r() * 220);
      const warm = r() < 0.3;
      cloud(x, y, 30 + r() * 120, warm ? '78,62,58' : '62,72,98', 0.035 + r() * 0.05);
    }
    for (let i = 0; i < 9000; i++) {
      const x = r() * W, y = band(x) + (r() + r() + r() - 1.5) * 150;
      const v = 120 + r() * 120;
      g.fillStyle = `rgba(${v},${v},${v + 15},${0.15 + r() * 0.3})`;
      g.fillRect(x, y, 1, 1);
    }
    // dark lanes through it
    for (let i = 0; i < 120; i++) {
      const x = r() * W, y = band(x) + (r() - 0.5) * 60;
      cloud(x, y, 20 + r() * 60, '2,3,7', 0.25 + r() * 0.3);
    }
    // far nebulae, very dim: one rust-red, one deep teal
    for (let i = 0; i < 26; i++) cloud(1400 + (r() - 0.5) * 260, 300 + (r() - 0.5) * 180, 40 + r() * 140, '96,32,40', 0.03 + r() * 0.04);
    for (let i = 0; i < 22; i++) cloud(380 + (r() - 0.5) * 240, 700 + (r() - 0.5) * 160, 40 + r() * 130, '24,56,72', 0.03 + r() * 0.04);
    const t = finish(c);
    t.mapping = EquirectangularReflectionMapping;
    return t;
  });
}
