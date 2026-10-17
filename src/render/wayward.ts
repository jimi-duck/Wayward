import { CanvasTexture, Color, Group, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, type Material, type Texture } from 'three';
import { Kit, metal, seeded, type V3 } from './kit';
import {
  bevelGeo, block, bolts, bracket, frameRing, hatch, lamp, oct, octFaces, octFrame, panel, pipeRun, vent, type Face,
} from './parts';

// ── the Wayward ───────────────────────────────────────────────────────────
// A stolen Obedience-class ore hauler, registry OB-7731-A, after brand v1.1
// and the hero renders (branding/). Long and slim: a rounded tube of octagonal
// armour stepping in to a sloping bow, a low spine of modules down its back,
// and two big round engine drums low on its flanks, each drive in a ringed
// housing astern. No central engine: the stern is a cargo face, "03" on it.
//
// Built largest forms first: the bodies, then the armour hung on their
// faces segment by segment (plates, stepped plates, hatches, vents, exposed
// machinery bays), then the saddles tying the drums to the hull, then the
// small things: pipes, brackets, bolts, lamps, stencils. Hazard amber in
// three shades over dark metal, worn through to the steel.
//
// The model faces +X with +Y up, so its starboard side is +Z.

let mats: Record<string, Material> | null = null;
function materials(hits: Hit[]): Record<string, Material> {
  if (mats) return mats;
  // all of her worn by hard use (wear.ts), sooted astern by her own drives
  const used = { worn: 1, soot: [2.15, 2.95] as [number, number], hits };
  const amber = (tint: number) => metal({ tint, roughness: 0.62, metalness: 0.08, scale: 0.85, painted: true, emissive: new Color(0.008, 0.004, 0), ...used });
  mats = {
    // weathered grey-blue plate, the odd ochre panel for her markings
    paint: amber(0x7b848d),
    paint2: amber(0x6a727a),
    paint3: amber(0xa88c52),
    // field repairs: plate patched on in grey primer, never painted over
    primer: metal({ tint: 0x8a8f80, roughness: 0.7, metalness: 0.15, scale: 1.1, painted: true, ...used }),
    hull: metal({ tint: 0x585d63, roughness: 0.55, metalness: 0.5, ...used }),
    dark: metal({ tint: 0x30343a, roughness: 0.55, metalness: 0.35, scale: 1.5, ...used }),
    pipe: metal({ tint: 0x34322f, roughness: 0.45, metalness: 0.55, scale: 2, ...used }),
    rubber: new MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 }),
    window: new MeshStandardMaterial({ color: 0x0b1416, roughness: 0.12, metalness: 0.9, emissive: new Color(0.02, 0.09, 0.11) }),
    red: new MeshBasicMaterial({ color: new Color(3.2, 0.35, 0.25), toneMapped: false }),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.4, 1.5), toneMapped: false }),
    // small maintenance lights: a dull orange, under the bloom line
    orange: new MeshBasicMaterial({ color: new Color(1.5, 0.55, 0.08), toneMapped: false }),
    // white navigation lights, tiny, under the bloom line
    nav: new MeshBasicMaterial({ color: new Color(1.7, 1.8, 1.9), toneMapped: false }),
    blue: new MeshBasicMaterial({ color: new Color(0.55, 1.2, 2.1), toneMapped: false }),
    decal: new MeshStandardMaterial({
      map: decalTexture(), transparent: true, alphaTest: 0.35, roughness: 0.8, metalness: 0.1,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }),
  };
  return mats;
}

// ── the stencils ──────────────────────────────────────────────────────────
// One small atlas, painted at startup: hull numbers, a hazard band and the
// registry, in dark paint worn through in places.
type Cell = [number, number, number, number];
const AW = 1024, AH = 512;
const cell = (x0: number, y0: number, x1: number, y1: number): Cell => [x0 / AW, 1 - y1 / AH, x1 / AW, 1 - y0 / AH];
const DECAL = {
  n03: cell(0, 0, 256, 256), n9f: cell(256, 0, 512, 256), n17: cell(512, 0, 768, 256), hazard: cell(768, 0, 1024, 256),
  reg: cell(0, 256, 1024, 384), name: cell(0, 384, 1024, 512),
};

let decals: Texture | null = null;
function decalTexture(): Texture {
  if (decals) return decals;
  const c = document.createElement('canvas');
  c.width = AW; c.height = AH;
  const g = c.getContext('2d')!;
  const rnd = seeded(1903);
  const ink = 'rgba(30,27,24,.94)';
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 190px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  [['03', 128], ['9F', 384], ['17', 640]].forEach(([t, x]) => g.fillText(String(t), Number(x), 136));
  // the hazard band: diagonal stripes in a frame
  g.save();
  g.beginPath(); g.rect(776, 72, 240, 112); g.clip();
  for (let k = -120; k < 260; k += 44) {
    g.beginPath(); g.moveTo(776 + k, 184); g.lineTo(776 + k + 22, 184); g.lineTo(776 + k + 22 + 112, 72); g.lineTo(776 + k + 112, 72); g.fill();
  }
  g.restore();
  g.lineWidth = 8; g.strokeStyle = ink; g.strokeRect(780, 76, 232, 104);
  g.font = '800 92px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  g.fillText('OB-7731-A', 512, 322);
  g.font = '700 70px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  g.fillText('WAYWARD', 512, 450);
  // wear: chips and scratches through the paint
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${0.4 + rnd() * 0.6})`;
    g.beginPath(); g.arc(rnd() * AW, rnd() * AH, 1 + rnd() * 5, 0, Math.PI * 2); g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = rnd() * AW, y = rnd() * AH, a = rnd() * Math.PI, l = 10 + rnd() * 50;
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  decals = t;
  return t;
}

export interface Nozzle { p: V3; r: number; }

export interface BuiltHull {
  root: Group;
  /** Engine nozzles, model space: where the plumes, trails and halos sit. */
  nozzles: Nozzle[];
  /** Wingtips, for running lights: port then starboard. */
  wings: V3[];
  /** Shield ellipsoid radii (x, y, z). */
  shield: V3;
}

const UP: V3 = [0, 1, 0], FWD: V3 = [1, 0, 0];

type Rnd = () => number;
/** Its own stream, so which plates are knocked askew leaves the layout alone. */
let knock = seeded(4471);
const pickAmber = (rnd: Rnd): string => { const r = rnd(); return r < 0.5 ? 'paint' : r < 0.84 ? 'paint2' : 'paint3'; };

// ── armour ────────────────────────────────────────────────────────────────

/** How a face is armoured: plated in amber, plated dark, or left open on its machinery. */
type Role = 'armour' | 'under' | 'inboard';
const ODDS: Record<Role, [number, number]> = { armour: [0.72, 0.9], under: [0.18, 0.75], inboard: [0, 0.35] };

/** An open machinery bay on a face: housings, tanks and pipe runs on the body, no plate over them. */
function bay(k: Kit, rnd: Rnd, face: Face, y0: number, z0: number, x: number, len: number): void {
  panel(k, 'pipe', face, y0, z0, x, 0, len, face.wid * 0.8, 0.012, 0, 0.004);
  for (let i = 0; i < 3 + Math.floor(rnd() * 3); i++) {
    const l = len * (0.15 + rnd() * 0.3), w = face.wid * (0.15 + rnd() * 0.3), t = 0.03 + rnd() * 0.07;
    panel(k, rnd() < 0.25 ? 'hull' : 'dark', face, y0, z0, x + (rnd() - 0.5) * (len - l), (rnd() - 0.5) * (face.wid * 0.7 - w), l, w, t, 0.012, 0.008);
  }
  for (const v of [-0.25, 0, 0.25]) if (rnd() < 0.7) panel(k, 'pipe', face, y0, z0, x, v * face.wid, len * 0.96, 0.03, 0.03, 0.012, 0.01);
}

/**
 * Armour on a body along X, segment by segment between the breaks `xs`:
 * each face named in `plan` gets, by its role, amber plate (whole, split,
 * stepped, hatched, vented, bolted), dark plate, or an open machinery bay.
 * `lift` raises the armour off the body.
 */
function armour(k: Kit, rnd: Rnd, xs: number[], faces: Face[], y0: number, z0: number, plan: Array<[number, Role]>, lift = 0): void {
  for (let j = 0; j < xs.length - 1; j++) {
    const a = xs[j]! + 0.045, b = xs[j + 1]! - 0.045, len = b - a, mid = (a + b) / 2;
    for (const [i, role] of plan) {
      const r = rnd(), [pa, pd] = ODDS[role];
      // now and then a plate knocked askew
      const face = knock() < 0.08 ? { ...faces[i]!, f: faces[i]!.f + (knock() - 0.5) * 0.14, rad: faces[i]!.rad + 0.012 } : faces[i]!, wid = face.wid * 0.92;
      if (r < pa) {
        const key = pickAmber(rnd), q = rnd(), t = 0.07;
        if (q < 0.4) {
          panel(k, key, face, y0, z0, mid, 0, len, wid, t, lift);
          const extra = rnd();
          if (extra < 0.35) panel(k, rnd() < 0.6 ? key : pickAmber(rnd), face, y0, z0, mid + (rnd() - 0.5) * len * 0.3, (rnd() - 0.5) * wid * 0.2, len * (0.4 + rnd() * 0.3), wid * (0.5 + rnd() * 0.2), 0.045, lift + t);
          else if (extra < 0.6) hatch(k, key, face, y0, z0, mid + (rnd() - 0.5) * len * 0.25, 0, len * (0.3 + rnd() * 0.25), wid * 0.5, lift + t);
          else if (extra < 0.8) vent(k, face, y0, z0, mid + (rnd() - 0.5) * len * 0.3, (rnd() - 0.5) * wid * 0.3, len * (0.25 + rnd() * 0.2), wid * 0.4, lift + t);
          else bolts(k, face, y0, z0, mid, 0, len, wid, lift + t);
        } else if (q < 0.7) {
          // split along the run, a seam between; sometimes one half dark
          const h = len / 2 - 0.02;
          panel(k, key, face, y0, z0, a + h / 2, 0, h, wid, t, lift);
          panel(k, rnd() < 0.3 ? 'dark' : rnd() < 0.5 ? key : pickAmber(rnd), face, y0, z0, b - h / 2, 0, h, wid, t * (0.8 + rnd() * 0.4), lift);
        } else if (q < 0.88) {
          // split across the face
          for (const e of [-1, 1]) panel(k, rnd() < 0.2 ? 'dark' : key, face, y0, z0, mid, e * wid * 0.25, len, wid * 0.47, t * (0.85 + rnd() * 0.3), lift);
        } else {
          panel(k, key, face, y0, z0, mid, 0, len, wid, t, lift);
          bolts(k, face, y0, z0, mid, 0, len, wid, lift + t);
          if (rnd() < 0.5) vent(k, face, y0, z0, mid, 0, len * 0.4, wid * 0.4, lift + t);
        }
      } else if (r < pd) {
        panel(k, rnd() < 0.8 ? 'dark' : 'hull', face, y0, z0, mid, 0, len, wid, 0.06, lift);
        if (rnd() < 0.4) panel(k, pickAmber(rnd), face, y0, z0, mid, 0, len * 0.5, wid * 0.55, 0.035, lift + 0.06);
        else if (rnd() < 0.4) vent(k, face, y0, z0, mid, 0, len * 0.5, wid * 0.5, lift + 0.06);
      } else bay(k, rnd, face, y0, z0, mid, len);
    }
  }
}

// ── damage and repairs ────────────────────────────────────────────────────

/** An old hit: where it struck (model space) and how far the scorch spreads. The hull shader burns round it. */
export type Hit = [number, number, number, number];

/** A point on a face of a body at (y0, z0): `x` along it, `v` across, `lift` off it. */
function onFace(face: Face, y0: number, z0: number, x: number, v: number, lift: number): V3 {
  const c = Math.cos(face.f), s = Math.sin(face.f), d = face.rad + lift;
  return [x, y0 + d * c - v * s, z0 + d * s + v * c];
}

/**
 * A blast crater: a charred hole punched through the plate, torn shards of
 * it curled outward round the rim. Returns the hit for the scorch.
 */
function crater(k: Kit, rnd: Rnd, face: Face, y0: number, z0: number, x: number, v: number, r: number): Hit {
  const lift = 0.07;
  for (const spin of [0, Math.PI / 4]) k.add('rubber', bevelGeo(r * 0.9, 0.03, r * 0.9, 0.01), onFace(face, y0, z0, x, v, lift - 0.005), [face.f, spin, 0]);
  k.add('dark', bevelGeo(r * 0.5, 0.03, r * 0.42, 0.01), onFace(face, y0, z0, x + (rnd() - 0.5) * r * 0.3, v, lift - 0.01), [face.f, rnd(), 0]);
  const n = 7 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.4, rr = r * (0.5 + rnd() * 0.12), tilt = 0.4 + rnd() * 0.7;
    const len = r * (0.25 + rnd() * 0.25), wid = r * (0.2 + rnd() * 0.25);
    const p = onFace(face, y0, z0, x + Math.cos(a) * rr, v - Math.sin(a) * rr, lift + Math.sin(tilt) * len * 0.4);
    k.add(rnd() < 0.7 ? 'paint2' : 'dark', bevelGeo(len, 0.012, wid, 0.004), p, [face.f, a, tilt]);
  }
  const [hx, hy, hz] = onFace(face, y0, z0, x, v, lift);
  return [hx, hy, hz, r * 2.6];
}

/** A field repair: a plate of primer slapped over damage, a little askew, bolted all round. */
function patch(k: Kit, rnd: Rnd, face: Face, y0: number, z0: number, x: number, v: number): void {
  const len = 0.14 + rnd() * 0.16, wid = Math.min(face.wid * 0.7, 0.1 + rnd() * 0.14), lift = 0.07, spin = (rnd() - 0.5) * 0.3;
  k.add('primer', bevelGeo(len, 0.018, wid, 0.006), onFace(face, y0, z0, x, v, lift + 0.009), [face.f, spin, 0]);
  const n = Math.max(3, Math.round((len + wid) / 0.05));
  for (let i = 0; i < n * 2; i++) {
    const t = (i / (n * 2)) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    const lx = Math.sign(c) * Math.min(1, Math.abs(c) * 1.6) * (len / 2 - 0.015), lz = Math.sign(sn) * Math.min(1, Math.abs(sn) * 1.6) * (wid / 2 - 0.015);
    const px = lx * Math.cos(spin) + lz * Math.sin(spin), pz = -lx * Math.sin(spin) + lz * Math.cos(spin);
    k.add('hull', bevelGeo(0.014, 0.01, 0.014, 0.003), onFace(face, y0, z0, x + px, v - pz, lift + 0.02), [face.f, 0, 0]);
  }
}

// ── the central hull ──────────────────────────────────────────────────────
// A long, slim tube of octagonal armour that steps in toward a rounded bow.

/**
 * The container deck: a truss frame down the back with two columns of
 * boxes in it, some stacked, each braced across its lid, tie-downs at the
 * corners and a small white light at each corner of the frame.
 */
function deck(k: Kit, rnd: Rnd, top: number): void {
  const x0 = -2.28, x1 = 1.0, rows = 6, len = (x1 - x0) / rows, cw = 0.46, base = top + 0.03;
  block(k, 'dark', [x1 - x0 + 0.1, 0.06, cw * 2 + 0.16], [(x0 + x1) / 2, base, 0], [0, 0, 0], 0.015);
  for (const z of [-cw - 0.07, cw + 0.07]) block(k, 'hull', [x1 - x0 + 0.1, 0.05, 0.04], [(x0 + x1) / 2, base + 0.05, z], [0, 0, 0], 0.008);
  for (let r = 0; r <= rows; r++) for (const sd of [-1, 1]) block(k, 'hull', [0.05, 0.13, 0.05], [x0 + r * len, base + 0.09, sd * (cw + 0.07)], [0, 0, 0], 0.008);
  for (let r = 0; r < rows; r++) {
    const x = x0 + (r + 0.5) * len;
    for (const sd of [-1, 1]) {
      const z = sd * (cw / 2 + 0.03), tall = rnd() < 0.3, h = 0.17 + (tall ? 0.15 : 0);
      const key = rnd() < 0.22 ? 'dark' : pickAmber(rnd), y = base + 0.03 + h / 2;
      block(k, key, [len - 0.05, h, cw - 0.04], [x, y, z], [0, 0, 0], 0.02);
      // the lid: two diagonal braces and a seam down the middle
      const top2 = y + h / 2 + 0.003, ang = Math.atan2(cw - 0.12, len - 0.14), d = Math.hypot(len - 0.14, cw - 0.12);
      for (const e of [-1, 1]) k.box('dark', [d, 0.008, 0.022], [x, top2, z], [0, e * ang, 0]);
      k.box('hull', [len - 0.08, 0.009, 0.016], [x, top2, z + (rnd() - 0.5) * 0.04]);
      // ribs down the side of the box
      for (let i = 1; i < 4; i++) k.box('dark', [0.012, h * 0.8, 0.012], [x - (len - 0.05) / 2 + (i * (len - 0.05)) / 4, y, z + sd * (cw / 2 - 0.02)]);
      if (rnd() < 0.18) k.box('orange', [0.02, 0.02, 0.02], [x + len * 0.3, y, z + sd * (cw / 2 + 0.005)]);
    }
  }
  for (const x of [x0, x1]) for (const sd of [-1, 1]) lamp(k, 'nav', [x, base + 0.17, sd * (cw + 0.07)], 0.02);
  lamp(k, 'nav', [-0.6, top + 0.5, 0], 0.02);
}

const HY = 0.1, HW = 1.15, HH = 0.95;
/** The run of armour, stern to bow: [x0, x1, width]. The height keeps the same proportion. */
const RUN: Array<[number, number, number]> = [
  [-2.4, -1.75, 1.15], [-1.75, -1.1, 1.15], [-1.1, -0.45, 1.15], [-0.45, 0.2, 1.15], [0.2, 0.85, 1.15],
  [0.85, 1.3, 1.02], [1.3, 1.72, 0.88], [1.72, 2.1, 0.72],
];

function hull(k: Kit, rnd: Rnd): void {
  const ratio = HH / HW, top = HY + HH / 2;
  const plan: Array<[number, Role]> = [[0, 'armour'], [1, 'armour'], [7, 'armour'], [2, 'armour'], [6, 'armour'], [3, 'under'], [5, 'under'], [4, 'under']];
  RUN.forEach(([x0, x1, w], j) => {
    oct(k, 'dark', x0, x1, w, w * ratio, HY, 0);
    frameRing(k, x0, 0.08, w, w * ratio, HY, 0, 1.12);
    armour(k, rnd, [x0, x1], octFaces(w, w * ratio), HY, 0, plan);
    if (j === RUN.length - 1) frameRing(k, x1, 0.08, w, w * ratio, HY, 0, 1.12);
  });
  // the bow: a rounded, sloping nose of amber plate over a dark chin
  k.loft('paint', [[2.06, 0.34, 0.27, 0.27, 0.4], [2.4, 0.3, 0.24, 0.22, 0.5], [2.72, 0.2, 0.16, 0.14, 0.55], [2.96, 0.05, 0.07, 0.06]], [0, HY, 0]);
  k.loft('dark', [[2.0, 0.3, 0.2, 0.3, 0.4], [2.45, 0.2, 0.12, 0.3, 0.5], [2.8, 0.08, 0.05, 0.2]], [0, HY - 0.1, 0]);
  k.cyl('pipe', 0.045, 0.06, 0.16, [3.0, HY + 0.02, 0], 'x', 10);
  k.cyl('hull', 0.018, 0.018, 0.18, [3.12, HY + 0.02, 0], 'x', 6);
  for (const x of [2.18, 2.5]) k.box('dark', [0.03, 0.02, 0.5 - (x - 2.18) * 0.7], [x, HY + 0.24 - (x - 2.18) * 0.28, 0], [0, 0, -0.55]);
  for (const sd of [-1, 1]) {
    block(k, 'paint2', [0.5, 0.2, 0.05], [2.35, HY + 0.02, sd * 0.28], [0, sd * 0.38, 0], 0.015);
    lamp(k, 'lamp', [2.6, HY - 0.04, sd * 0.1], 0.03);
  }
  k.decal('decal', DECAL.n03, 0.24, 0.24, [2.42, HY + 0.262, 0], [0.1, 1, 0], FWD);
  // a keel under the hull, and the belly bay's plates
  block(k, 'dark', [3.6, 0.12, 0.46], [-0.4, HY - HH / 2 - 0.08, 0], [0, 0, 0], 0.03);
  for (const x of [-1.8, -0.6, 0.6]) block(k, 'hull', [0.5, 0.07, 0.34], [x, HY - HH / 2 - 0.17, 0], [0, 0, 0], 0.02);

  deck(k, rnd, top);
  // small orange maintenance lights, in pairs, by hatches and ladders, never in a straight line
  for (const sd of [-1, 1]) for (const [x, y] of [[-2.0, top + 0.07], [-1.05, top + 0.07], [0.0, top + 0.07], [0.7, top + 0.06], [1.1, HY + 0.16], [-0.8, HY - 0.46], [0.3, HY - 0.46]] as const) lamp(k, 'orange', [x, y, sd * (y > top ? 0.22 : 0.56)], 0.026);
  for (const sd of [-1, 1]) for (const y of [0.26, -0.2]) lamp(k, 'orange', [-2.6, HY + y, sd * 0.12], 0.024);
  // masts and a sensor dish
  k.cyl('pipe', 0.012, 0.018, 0.36, [-1.5, top + 0.3, 0.1], 'y', 6);
  k.cyl('pipe', 0.01, 0.014, 0.28, [0.4, top + 0.26, -0.1], 'y', 6);
  k.cyl('hull', 0.11, 0.05, 0.05, [-0.5, top + 0.3, 0], 'y', 12);
  k.cyl('dark', 0.03, 0.03, 0.08, [-0.5, top + 0.25, 0], 'y', 6);

  // the bridge: a dark block on the forward spine, a band of glass, a brow
  block(k, 'dark', [0.46, 0.22, 0.54], [1.3, top + 0.16, 0], [0, 0, 0], 0.04);
  k.box('window', [0.05, 0.07, 0.46], [1.56, top + 0.18, 0], [0, 0, -0.45]);
  for (const z of [-0.15, 0, 0.15]) k.box('dark', [0.07, 0.09, 0.03], [1.56, top + 0.18, z], [0, 0, -0.45]);
  block(k, pickAmber(rnd), [0.4, 0.05, 0.6], [1.32, top + 0.29, 0], [0, 0, 0], 0.02);

  // the stern: a cargo face between the drums, "03" on it
  block(k, 'dark', [0.16, HH * 0.96, 0.78], [-2.46, HY, 0], [0, 0, 0], 0.04);
  block(k, 'rubber', [0.06, 0.46, 0.4], [-2.55, HY + 0.02, 0], [0, 0, 0], 0.01);
  block(k, 'dark', [0.1, 0.38, 0.34], [-2.57, HY + 0.02, 0], [0, 0, 0], 0.02);
  for (const [w, h, y, z] of [[0.46, 0.06, 0.26, 0], [0.46, 0.06, -0.22, 0], [0.06, 0.5, 0.02, 0.23], [0.06, 0.5, 0.02, -0.23]] as const) block(k, 'hull', [0.1, h, w], [-2.58, HY + y, z], [0, 0, 0], 0.012);
  k.decal('decal', DECAL.n03, 0.2, 0.2, [-2.625, HY + 0.02, 0], [-1, 0, 0], UP);
  block(k, 'paint2', [0.12, 0.1, 0.7], [-2.56, HY + 0.4, 0], [0, 0, 0], 0.02);
  k.decal('decal', DECAL.hazard, 0.46, 0.06, [-2.625, HY + 0.4, 0], [-1, 0, 0], UP);
  for (const sd of [-1, 1]) { lamp(k, 'red', [-2.6, HY + 0.36, sd * 0.36]); lamp(k, 'red', [-2.6, HY - 0.3, sd * 0.36]); }

  // the name along both flanks, high on the upper chamfer where the drums do not hide it
  const faces = octFaces(HW, HH);
  for (const sd of [-1, 1]) {
    const face = faces[sd > 0 ? 1 : 7]!, c = Math.cos(face.f), sn = Math.sin(face.f);
    panel(k, 'paint3', face, HY, 0, 0.15, 0, 1.85, 0.3, 0.03, 0.07);
    const n: V3 = [0, c, sn], up: V3 = [0, Math.abs(sn), -Math.sign(sn) * Math.abs(c)];
    const at = (x: number, v: number, lift: number): V3 => [x, HY + (face.rad + lift) * c - v * sn, (face.rad + lift) * sn + v * c];
    k.decal('decal', DECAL.name, 1.6, 0.2, at(0.15, 0, 0.1), n, up);
    k.decal('decal', DECAL.reg, 0.56, 0.07, at(0.3, 0.255, 0.1), n, up);
  }
  for (const [x, z] of [[1.0, 0.25], [-0.4, -0.25], [-1.9, 0.25]] as const) lamp(k, 'red', [x, top + 0.4, z], 0.03);
}

// ── the engine drums ──────────────────────────────────────────────────────
// Two round drums low on the flanks, each armoured in banded rings, its drive
// in a ringed housing astern.

const DZ = 0.98, DY = -0.12, DR = 0.5;
const BANDS = [-2.4, -2.0, -1.6, -1.2, -0.8, -0.4, 0, 0.46];

function drum(k: Kit, rnd: Rnd, z: number): Nozzle {
  const sd = Math.sign(z), R = DR, y = DY;
  k.cyl('dark', R, R, 2.95, [-0.95, y, z], 'x', 28);
  for (let i = 0; i < BANDS.length - 1; i++) {
    const a = BANDS[i]!, b = BANDS[i + 1]!, mid = (a + b) / 2, len = b - a;
    k.cyl(rnd() < 0.72 ? pickAmber(rnd) : 'dark', R * 1.035, R * 1.035, len - 0.07, [mid, y, z], 'x', 28);
    k.cyl('dark', R * 1.075, R * 1.075, 0.06, [a, y, z], 'x', 28);
    k.cyl('hull', R * 1.09, R * 1.09, 0.02, [a, y, z], 'x', 28);
    // a hatch or a vent on the outboard flank of the band
    if (rnd() < 0.7) {
      const face: Face = { f: sd * Math.PI / 2, rad: R * 1.035, wid: 0.3 };
      if (rnd() < 0.5) hatch(k, pickAmber(rnd), face, y, z, mid, 0, len * 0.5, 0.26, 0.012);
      else vent(k, face, y, z, mid, 0, len * 0.4, 0.26, 0.012);
    }
    for (let j = 0; j < 14; j++) {
      const t = (j / 14) * Math.PI * 2;
      k.box('hull', [0.02, 0.025, 0.025], [a, y + Math.cos(t) * R * 1.09, z + Math.sin(t) * R * 1.09], [t, 0, 0]);
    }
  }
  // the intake: a tapering cowl, a grille of rings
  k.cyl('dark', R * 0.84, R * 1.05, 0.26, [0.6, y, z], 'x', 28);
  k.cyl('pipe', R * 0.72, R * 0.72, 0.02, [0.73, y, z], 'x', 24);
  for (const r of [0.3, 0.22, 0.14]) k.ring('dark', r, 0.016, [0.745, y, z], 'x', 24);
  k.cyl('hull', 0.05, 0.08, 0.08, [0.75, y, z], 'x', 10);
  // the drive housing astern: a ringed tube, a dark cap, a pale blue ring round the throat
  k.cyl('dark', R * 1.16, R * 1.2, 0.4, [-2.65, y, z], 'x', 28, true);
  k.cyl('dark', R * 1.12, R * 1.12, 0.02, [-2.47, y, z], 'x', 28);
  k.ring('pipe', R * 1.16, 0.035, [-2.86, y, z], 'x', 28);
  k.ring('blue', R * 0.9, 0.016, [-2.84, y, z], 'x', 28);
  k.ring('hull', R * 0.98, 0.022, [-2.6, y, z], 'x', 28);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    k.box('dark', [0.04, R * 0.6, 0.035], [-2.62, y + Math.cos(a) * R * 0.62, z + Math.sin(a) * R * 0.62], [a, 0, 0]);
  }
  // the throat, stepped inward: three dark rings at falling radii in front of the glow, each hiding more of it, so the light sits deep in a
  // mechanical bell; ten armoured petals on the lip, two pale ticks on the first step
  for (const [x, r, tube] of [[-2.8, 0.88, 0.034], [-2.74, 0.74, 0.03], [-2.68, 0.6, 0.026]] as const) k.ring('pipe', R * r, tube, [x, y, z], 'x', 28);
  k.ring('hull', R * 0.86, 0.012, [-2.77, y, z], 'x', 28);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.box('dark', [0.13, R * 0.2, 0.06], [-2.83, y + Math.cos(a) * R * 0.93, z + Math.sin(a) * R * 0.93], [a, 0, 0]);
    if (i % 5 === 0) k.box('blue', [0.01, R * 0.1, 0.03], [-2.86, y + Math.cos(a + 0.31) * R * 0.88, z + Math.sin(a + 0.31) * R * 0.88], [a + 0.31, 0, 0]);
  }
  // on the drum: a pipe run along its crown, utility modules, stencils, lamps
  pipeRun(k, -2.0, 0.2, y + R * 1.1, z - sd * 0.1, 0.022, 0.42);
  for (let x = -1.9; x < 0.2; x += 0.4 + rnd() * 0.4) {
    if (rnd() < 0.4) continue;
    block(k, rnd() < 0.5 ? 'dark' : pickAmber(rnd), [0.14 + rnd() * 0.16, 0.05 + rnd() * 0.07, 0.12 + rnd() * 0.12], [x, y + R * 1.1 + 0.03, z + sd * (0.05 + rnd() * 0.1)], [0, 0, 0], 0.015);
  }
  k.decal('decal', DECAL.hazard, 0.34, 0.08, [-0.3, y - 0.05, z + sd * (R * 1.035 + 0.01)], [0, 0, sd], UP);
  k.decal('decal', DECAL.n9f, 0.2, 0.2, [-1.4, y + R * 1.04 + 0.005, z + sd * 0.1], UP, FWD);
  lamp(k, 'red', [-2.46, y + R * 1.12, z + sd * 0.1]);
  lamp(k, 'red', [0.9, y + 0.1, z + sd * (R + 0.02)], 0.03);
  return { p: [-2.66, y, z], r: R * 0.98 };
}

/** The saddles holding a drum to the hull, and cable and machinery in the channel between. */
function mounting(k: Kit, rnd: Rnd, z: number): void {
  const sd = Math.sign(z), zc = sd * 0.58;
  for (const x of [-1.95, -1.1, -0.25, 0.4]) {
    block(k, 'dark', [0.26, 0.12, 0.46], [x, DY + DR + 0.03, sd * 0.62], [0, 0, 0], 0.03);
    block(k, 'dark', [0.22, 0.12, 0.34], [x, DY - DR + 0.02, sd * 0.5], [0, 0, 0], 0.03);
    if (rnd() < 0.7) block(k, pickAmber(rnd), [0.2, 0.04, 0.3], [x, DY + DR + 0.1, sd * 0.62], [0, 0, 0], 0.012);
    k.cyl('hull', 0.03, 0.03, 0.4, [x + 0.15, DY + DR + 0.04, zc], 'z', 8);
  }
  for (const dz of [-0.06, 0.06]) pipeRun(k, -2.1, 0.4, DY + DR + 0.1, zc + dz, 0.02, 0.45);
  // the stern fairing: sloped armour taking the hull's aft flank down onto the drum housing, so the drive grows out of the hull
  block(k, 'paint2', [0.62, 0.05, 0.5], [-2.28, DY + DR + 0.1, sd * 0.68], [0, 0, 0.32], 0.02);
  block(k, 'dark', [0.7, 0.1, 0.12], [-2.3, DY + DR - 0.02, sd * 0.45], [0, 0, 0.18], 0.02);
  k.box('lamp', [0.03, 0.03, 0.03], [-2.0, DY + DR + 0.16, sd * 0.66]);
}

/** The model's own scale: built in kit units, brought to play scale where it is shown (the hitbox is 0.9). */
export const MODEL_SCALE = 0.56;

export function buildWayward(): BuiltHull {
  const k = new Kit(), rnd = seeded(7731);
  knock = seeded(4471);
  hull(k, rnd);
  const nozzles = [drum(k, rnd, -DZ), drum(k, rnd, DZ)];
  mounting(k, rnd, -DZ);
  mounting(k, rnd, DZ);
  // years of it: old hits on the hull, and the patches over older ones
  const hf = octFaces(HW, HH);
  const hits: Hit[] = [
    crater(k, rnd, hf[1]!, HY, 0, -0.95, 0.02, 0.15),
    crater(k, rnd, hf[6]!, HY, 0, 0.75, -0.05, 0.14),
    crater(k, rnd, hf[0]!, HY, 0, -1.55, -0.04, 0.12),
    crater(k, rnd, hf[7]!, HY, 0, 0.1, 0.0, 0.11),
  ];
  for (let i = 0; i < 12; i++) {
    const face = hf[[0, 1, 7, 2, 6][Math.floor(rnd() * 5)]!]!;
    patch(k, rnd, face, HY, 0, -2.0 + rnd() * 3.0, (rnd() - 0.5) * face.wid * 0.4);
  }
  const root = k.build(materials(hits), 0.07);
  return { root, nozzles, wings: [[0.3, DY + DR - 0.05, -(DZ + DR)], [0.3, DY + DR - 0.05, DZ + DR]], shield: [3.1, 1.05, 1.75] };
}
