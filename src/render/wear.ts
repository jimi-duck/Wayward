import { CanvasTexture, RepeatWrapping, type Texture } from 'three';

// ── hard use ──────────────────────────────────────────────────────────────
// The wear a ship picks up over years of work, layered on the kit's metal in
// its shader: paint chipped back to steel along every edge and around the
// dents, scrapes and scratches, dents knocked into the plate, grime worked
// into it, soot round the drives, the odd scorch from a hit, and plates
// faded unevenly. All of it in model space, so it holds still on the hull.

const SIZE = 1024;
let scratches: Texture | null = null;

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/**
 * Scratches, white on black: scrapes (bundles of parallel lines, as from
 * dragging along rock or a dock arm), long gouges, and a scatter of small
 * nicks. Tiles.
 */
export function scratchTexture(): Texture {
  if (scratches) return scratches;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d')!;
  const r = rand(5179);
  g.fillStyle = '#000';
  g.fillRect(0, 0, SIZE, SIZE);
  g.lineCap = 'round';
  // draw a stroke three times, offset by the tile, so it wraps cleanly
  const line = (x: number, y: number, x2: number, y2: number) => {
    for (const ox of [-SIZE, 0, SIZE]) for (const oy of [-SIZE, 0, SIZE]) {
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x2 + ox, y2 + oy); g.stroke();
    }
  };
  // scrapes
  for (let i = 0; i < 46; i++) {
    const x = r() * SIZE, y = r() * SIZE, a = (r() - 0.5) * 0.9 + (r() < 0.5 ? 0 : Math.PI / 2), len = 60 + r() * 260;
    const n = 4 + Math.floor(r() * 12), spread = 6 + r() * 26;
    for (let j = 0; j < n; j++) {
      const off = (r() - 0.5) * spread, l = len * (0.4 + r() * 0.6), st = r() * (len - l);
      const px = x - Math.sin(a) * off + Math.cos(a) * st, py = y + Math.cos(a) * off + Math.sin(a) * st;
      g.strokeStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
      g.lineWidth = 0.6 + r() * 1.6;
      line(px, py, px + Math.cos(a) * l, py + Math.sin(a) * l);
    }
  }
  // gouges: long, wider, the odd kink
  for (let i = 0; i < 14; i++) {
    let x = r() * SIZE, y = r() * SIZE, a = r() * Math.PI * 2;
    g.strokeStyle = `rgba(255,255,255,${0.7 + r() * 0.3})`;
    g.lineWidth = 2 + r() * 3;
    for (let k = 0; k < 3; k++) {
      const l = 40 + r() * 140, x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l;
      line(x, y, x2, y2);
      x = x2; y = y2; a += (r() - 0.5) * 0.6;
    }
  }
  // nicks
  for (let i = 0; i < 1400; i++) {
    const x = r() * SIZE, y = r() * SIZE, a = r() * Math.PI, l = 2 + r() * 14;
    g.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`;
    g.lineWidth = 0.5 + r() * 1.2;
    line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  scratches = t;
  return t;
}

/** GLSL: value noise, fbm, and the cell field that places dents and scorches. */
export const WEAR_NOISE = /* glsl */ `
  float wHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float wNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(wHash(i), wHash(i + vec3(1, 0, 0)), f.x), mix(wHash(i + vec3(0, 1, 0)), wHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(wHash(i + vec3(0, 0, 1)), wHash(i + vec3(1, 0, 1)), f.x), mix(wHash(i + vec3(0, 1, 1)), wHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float wFbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * wNoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
  // Round marks on a jittered grid, one chance in (1 - odds) per cell: x the
  // mark's depth profile (1 at the centre, 0 outside), y its rim (a ring at its edge).
  vec2 wCells(vec3 p, float odds) {
    vec3 i = floor(p), f = fract(p); vec2 m = vec2(0.0);
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 c = vec3(float(x), float(y), float(z)), id = i + c;
      if (wHash(id + 3.1) < odds) continue;
      vec3 o = vec3(wHash(id), wHash(id + 11.3), wHash(id + 27.1));
      float r = 0.25 + 0.3 * wHash(id + 5.7), d = length((c + o - f) * vec3(1.0, 0.7 + 0.6 * wHash(id + 8.9), 1.0 + 0.5 * wHash(id + 2.3))) / r;
      float t = clamp(1.0 - d * d, 0.0, 1.0);
      m.x = max(m.x, t * t);
      m.y = max(m.y, smoothstep(0.65, 0.95, d) * (1.0 - smoothstep(0.95, 1.2, d)));
    }
    return m;
  }`;
