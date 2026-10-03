import { CanvasTexture, EquirectangularReflectionMapping, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

// Textures painted on a canvas at startup, so the game downloads none. Each is
// made once and shared.

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

function finish(c: HTMLCanvasElement, srgb = true, repeat = false): Texture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/**
 * Hull plating: panels in a few greys, dark seams, the odd lit window and a
 * red stripe down the middle, as on the reference ship.
 */
export function hullTexture(): Texture {
  const [c, g] = canvas(512, 512), r = rand(7);
  g.fillStyle = '#8b97a5';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 140; i++) {
    const w = 24 + r() * 120, h = 16 + r() * 70, x = r() * 512, y = r() * 512;
    const v = 120 + r() * 60;
    g.fillStyle = `rgb(${v - 6},${v + 4},${v + 16})`;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(20,28,38,.55)';
    g.lineWidth = 1.2;
    g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  // greebles: vents and hatches
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512;
    g.fillStyle = 'rgba(30,38,50,.7)';
    for (let k = 0; k < 4; k++) g.fillRect(x, y + k * 4, 18, 2);
  }
  // windows
  for (let i = 0; i < 90; i++) {
    const x = r() * 512, y = r() * 512;
    g.fillStyle = r() < 0.7 ? 'rgba(255,236,200,.9)' : 'rgba(150,230,255,.8)';
    g.fillRect(x, y, 3, 2);
  }
  // the red stripe
  g.fillStyle = '#b8323a';
  g.fillRect(250, 0, 5, 512);
  g.fillRect(258, 0, 2, 512);
  return finish(c, true, true);
}

/** Basalt: mottled dark grey-violet with pits and scratches. */
export function rockTexture(seed: number): Texture {
  const [c, g] = canvas(512, 256), r = rand(seed);
  g.fillStyle = '#66666a';
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 256, rad = 2 + r() * 22, v = 70 + r() * 80;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(${v},${v},${v + 5},.55)`);
    grad.addColorStop(1, `rgba(${v},${v},${v + 5},0)`);
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 256, rad = 1 + r() * 4;
    g.fillStyle = 'rgba(20,16,26,.55)';
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(190,180,200,.3)';
    g.beginPath(); g.arc(x + rad * 0.4, y - rad * 0.4, rad * 0.5, 0, Math.PI * 2); g.fill();
  }
  return finish(c);
}

/**
 * Dilithium veins: black, with branching cracks and crystal clusters in
 * violet and magenta. Used as an emissive map, so the cracks glow and bloom.
 */
export function veinTexture(seed: number): Texture {
  const [c, g] = canvas(512, 256), r = rand(seed);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 256);
  g.lineCap = 'round';
  const colours = ['#c77dff', '#ff4fd8', '#9a6bff'];
  const crack = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
    const col = colours[Math.floor(r() * colours.length)]!;
    let px = x, py = y;
    for (let i = 0; i < len; i++) {
      a += (r() - 0.5) * 0.9;
      const nx = px + Math.cos(a) * 9, ny = py + Math.sin(a) * 9;
      g.strokeStyle = col; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = 6;
      g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      px = nx; py = ny;
      if (depth > 0 && r() < 0.12) crack(px, py, a + (r() - 0.5) * 2, len * 0.5, w * 0.6, depth - 1);
    }
  };
  for (let i = 0; i < 7; i++) crack(r() * 512, r() * 256, r() * Math.PI * 2, 10 + r() * 16, 1.6 + r() * 1.6, 2);
  for (let i = 0; i < 26; i++) {
    const x = r() * 512, y = r() * 256, col = colours[Math.floor(r() * colours.length)]!;
    g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 8;
    for (let k = 0; k < 4; k++) g.fillRect(x + (r() - 0.5) * 10, y + (r() - 0.5) * 10, 2 + r() * 3, 2 + r() * 3);
  }
  return finish(c);
}

/** A soft round glow for sprites, white so a material colour tints it. */
export function glowTexture(): Texture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,.75)');
  grad.addColorStop(0.45, 'rgba(255,255,255,.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return finish(c, false);
}

/** Deep space as an equirectangular backdrop: faint teal and violet cloud. */
export function nebulaTexture(): Texture {
  const [c, g] = canvas(2048, 1024), r = rand(31);
  g.fillStyle = '#03060b';
  g.fillRect(0, 0, 2048, 1024);
  const cloud = (x: number, y: number, rad: number, col: string, a: number) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, col.replace('A', String(a)));
    grad.addColorStop(1, col.replace('A', '0'));
    g.fillStyle = grad;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  for (let i = 0; i < 70; i++) {
    const teal = r() < 0.55;
    cloud(r() * 2048, 260 + r() * 560, 80 + r() * 320, teal ? 'rgba(10,70,92,A)' : 'rgba(60,24,96,A)', 0.05 + r() * 0.09);
  }
  for (let i = 0; i < 18; i++) cloud(r() * 2048, 380 + r() * 300, 30 + r() * 90, 'rgba(120,60,170,A)', 0.06 + r() * 0.06);
  const t = finish(c);
  t.mapping = EquirectangularReflectionMapping;
  return t;
}
