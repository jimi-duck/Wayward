import { CanvasTexture, Color, Group, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, type Material, type Texture } from 'three';
import { Kit, metal, seeded, type V3 } from './kit';
import {
  bevelGeo, block, bolts, bracket, frameRing, hatch, lamp, oct, octFaces, octFrame, panel, pipeRun, vent, type Face,
} from './parts';

// ── the Wayward ───────────────────────────────────────────────────────────
// A stolen Obedience-class ore hauler, registry OB-7731-A, after brand v1.1
// and the hero renders (branding/). Heavy, wide and industrial: a dominant
// central hull on an octagonal spine, armoured in layers, with a raised
// spine of modules down its back; two huge engine nacelles clamped tight to
// its flanks, each drive deep in a ringed, armoured housing. No central
// engine: the stern is a cargo face, "03" on its plates.
//
// Built largest forms first: the bodies, then the armour hung on their
// faces segment by segment (plates, stepped plates, hatches, vents, exposed
// machinery bays), then the structure tying the nacelles to the hull, then
// the small things: pipes, brackets, bolts, lamps, stencils. Hazard amber in
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
    paint: amber(0xd98a1c),
    paint2: amber(0xb86a18),
    paint3: amber(0xdc9228),
    // field repairs: plate patched on in grey primer, never painted over
    primer: metal({ tint: 0x8a8f80, roughness: 0.7, metalness: 0.15, scale: 1.1, painted: true, ...used }),
    hull: metal({ tint: 0x6e7378, roughness: 0.55, metalness: 0.5, ...used }),
    dark: metal({ tint: 0x4a4e52, roughness: 0.55, metalness: 0.35, scale: 1.5, ...used }),
    pipe: metal({ tint: 0x34322f, roughness: 0.45, metalness: 0.55, scale: 2, ...used }),
    rubber: new MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 }),
    window: new MeshStandardMaterial({ color: 0x0b1416, roughness: 0.12, metalness: 0.9, emissive: new Color(0.02, 0.09, 0.11) }),
    red: new MeshBasicMaterial({ color: new Color(3.2, 0.35, 0.25), toneMapped: false }),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.4, 1.5), toneMapped: false }),
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
const pickAmber = (rnd: Rnd): string => { const r = rnd(); return r < 0.55 ? 'paint' : r < 0.8 ? 'paint2' : 'paint3'; };

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

const HY = 0.16, HW = 1.5, HH = 1.12;
/** Where the hull's armour breaks into segments, stern to bow. */
const HULL_XS = [-2.4, -1.86, -1.38, -0.62, -0.12, 0.62, 1.2, 1.92];

function hull(k: Kit, rnd: Rnd): void {
  const faces = octFaces(HW, HH), top = HY + HH / 2;
  // the body, its frames, and the armour on it all round
  oct(k, 'dark', HULL_XS[0]!, HULL_XS.at(-1)!, HW, HH, HY, 0);
  for (const x of HULL_XS) frameRing(k, x, 0.08, HW, HH, HY, 0, 1.13);
  armour(k, rnd, HULL_XS, faces, HY, 0, [[0, 'armour'], [1, 'armour'], [7, 'armour'], [2, 'armour'], [6, 'armour'], [3, 'under'], [5, 'under'], [4, 'under']]);
  // a keel under it
  block(k, 'dark', [3.9, 0.14, 0.62], [-0.25, HY - HH / 2 - 0.1, 0], [0, 0, 0], 0.03);
  for (const x of [-1.8, -0.6, 0.6]) block(k, 'hull', [0.5, 0.08, 0.42], [x, HY - HH / 2 - 0.2, 0], [0, 0, 0], 0.02);

  // the spine: a raised run of modules down the back, amber and dark, some stacked
  for (let j = 0; j < HULL_XS.length - 2; j++) {
    const a = HULL_XS[j]! + 0.06, b = HULL_XS[j + 1]! - 0.06, len = b - a, mid = (a + b) / 2;
    const h = 0.18 + rnd() * 0.22, key = rnd() < 0.62 ? pickAmber(rnd) : 'dark', base = top + 0.07;
    block(k, 'dark', [len + 0.08, 0.06, 0.66], [mid, base + 0.03, 0], [0, 0, 0], 0.015);
    const sw = 0.44 + rnd() * 0.18;
    if (rnd() < 0.3) {
      // split into two blocks either side of a dark gutter
      for (const e of [-1, 1]) block(k, rnd() < 0.3 ? 'dark' : key, [len, h * (0.85 + rnd() * 0.3), sw / 2 - 0.03], [mid, base + 0.06 + h / 2, e * sw / 4], [0, 0, 0], 0.03);
    } else block(k, key, [len, h, sw], [mid, base + 0.06 + h / 2, 0], [0, 0, 0], 0.035);
    const crown = base + 0.06 + h;
    const c = rnd();
    if (c < 0.4) block(k, rnd() < 0.5 ? 'dark' : pickAmber(rnd), [len * (0.4 + rnd() * 0.3), 0.08 + rnd() * 0.08, 0.32], [mid + (rnd() - 0.5) * 0.15, crown + 0.06, 0], [0, 0, 0], 0.02);
    else if (c < 0.7) for (const z of [-0.12, 0.12]) block(k, 'pipe', [len * 0.8, 0.03, 0.08], [mid, crown + 0.015, z], [0, 0, 0], 0.008);
    else hatch(k, key, { f: 0, rad: 0, wid: 0.4 }, crown, 0, mid, 0, len * 0.6, 0.36);
    // tie-down straps over the module: a dark band either side of centre, a steel buckle on the crown
    for (const e of [-0.28, 0.28]) {
      block(k, 'dark', [0.04, h + 0.02, sw + 0.03], [mid + e * len, base + 0.06 + h / 2, 0], [0, 0, 0], 0.008);
      block(k, 'hull', [0.05, 0.02, 0.07], [mid + e * len, base + 0.07 + h, 0], [0, 0, 0], 0.005);
    }
    // vents in the spine's flanks
    for (const s of [-1, 1]) if (rnd() < 0.6) vent(k, { f: s * Math.PI / 2, rad: sw / 2, wid: h }, base + 0.06 + h / 2, 0, mid, 0, len * 0.5, h * 0.55);
  }
  // utility modules either side of the spine, pipe runs between
  for (const s of [-1, 1]) {
    pipeRun(k, -2.25, 1.2, top + 0.13, s * 0.38, 0.03, 0.36);
    pipeRun(k, -2.0, 0.9, top + 0.12, s * 0.45, 0.02, 0.5);
    for (let x = -2.1; x < 1.1; x += 0.3 + rnd() * 0.35) {
      if (rnd() < 0.35) continue;
      const w = 0.12 + rnd() * 0.14, h = 0.06 + rnd() * 0.12;
      block(k, rnd() < 0.45 ? pickAmber(rnd) : 'dark', [w, h, 0.1 + rnd() * 0.1], [x, top + 0.07 + h / 2, s * (0.53 + rnd() * 0.06)], [0, 0, 0], 0.012);
    }
  }
  // masts and a sensor dish on the spine
  k.cyl('pipe', 0.012, 0.018, 0.4, [-1.45, top + 0.55, 0.14], 'y', 6);
  k.cyl('pipe', 0.01, 0.014, 0.3, [0.3, top + 0.5, -0.12], 'y', 6);
  k.cyl('hull', 0.12, 0.05, 0.05, [-0.2, top + 0.47, 0], 'y', 12);
  k.cyl('dark', 0.03, 0.03, 0.08, [-0.2, top + 0.42, 0], 'y', 6);

  // the bridge: a dark block on the forward spine, a band of glass, a brow
  block(k, 'dark', [0.5, 0.26, 0.86], [1.6, top + 0.2, 0], [0, 0, 0], 0.04);
  k.box('window', [0.05, 0.08, 0.72], [1.86, top + 0.22, 0], [0, 0, -0.45]);
  for (const z of [-0.24, 0, 0.24]) k.box('dark', [0.07, 0.1, 0.03], [1.86, top + 0.22, z], [0, 0, -0.45]);
  block(k, pickAmber(rnd), [0.44, 0.06, 0.94], [1.66, top + 0.35, 0], [0, 0, 0], 0.02);
  for (const s of [-1, 1]) block(k, 'paint', [0.36, 0.22, 0.08], [1.6, top + 0.2, s * 0.47], [0, 0, 0], 0.02);

  // the prow: stepped armour blocks, a sloped glacis, a dark chin and a sensor nose
  block(k, 'dark', [0.5, 0.86, 1.36], [2.12, HY, 0], [0, 0, 0], 0.08);
  block(k, 'paint', [0.42, 0.56, 1.42], [2.15, HY + 0.08, 0], [0, 0, 0], 0.06);
  block(k, 'paint2', [0.6, 0.07, 1.2], [2.12, top + 0.02, 0], [0, 0, -0.32], 0.025);
  block(k, 'dark', [0.3, 0.5, 0.96], [2.48, HY - 0.04, 0], [0, 0, 0], 0.05);
  block(k, 'paint3', [0.22, 0.3, 0.66], [2.66, HY + 0.02, 0], [0, 0, 0], 0.04);
  block(k, 'dark', [0.5, 0.24, 0.9], [2.3, HY - 0.42, 0], [0, 0, 0], 0.04);
  k.cyl('pipe', 0.05, 0.07, 0.16, [2.82, HY + 0.02, 0], 'x', 10);
  k.cyl('hull', 0.02, 0.02, 0.18, [2.94, HY + 0.02, 0], 'x', 6);
  for (const s of [-1, 1]) {
    block(k, 'paint', [0.5, 0.42, 0.08], [2.12, HY + 0.02, s * 0.74], [0, s * 0.28, 0], 0.02);
    vent(k, { f: s * Math.PI / 2, rad: 0.48, wid: 0.3 }, HY - 0.04, 0, 2.48, 0, 0.18, 0.26);
    lamp(k, 'lamp', [2.6, HY - 0.2, s * 0.3], 0.04);
  }
  vent(k, { f: 0, rad: 0.25, wid: 0.9 }, HY - 0.04, 0, 2.47, 0, 0.18, 0.6);

  // the stern: a cargo face, stepped: a dark recessed hatch between two angled amber blocks, "03" on each
  block(k, 'dark', [0.16, 0.98, 1.5], [-2.46, HY, 0], [0, 0, 0], 0.04);
  block(k, 'rubber', [0.06, 0.5, 0.48], [-2.55, HY + 0.02, 0], [0, 0, 0], 0.01);
  block(k, 'dark', [0.1, 0.42, 0.4], [-2.57, HY + 0.02, 0], [0, 0, 0], 0.02);
  for (const [w, h, y, z] of [[0.56, 0.06, 0.28, 0], [0.56, 0.06, -0.24, 0], [0.06, 0.56, 0.02, 0.28], [0.06, 0.56, 0.02, -0.28]] as const) {
    block(k, 'hull', [0.1, h, w], [-2.58, HY + y, z], [0, 0, 0], 0.012);
  }
  k.decal('decal', DECAL.n03, 0.2, 0.2, [-2.625, HY + 0.02, 0], [-1, 0, 0], UP);
  for (const s of [-1, 1]) {
    const th = s * 0.3, n: V3 = [-Math.cos(th), 0, Math.sin(th)], c: V3 = [-2.62, HY + 0.02, s * 0.52];
    block(k, 'paint', [0.24, 0.66, 0.46], c, [0, th, 0], 0.04);
    block(k, 'dark', [0.2, 0.14, 0.5], [c[0] + 0.02, HY - 0.34, c[2]], [0, th, 0], 0.02);
    k.decal('decal', DECAL.n03, 0.3, 0.3, [c[0] + n[0] * 0.125, c[1] + 0.04, c[2] + n[2] * 0.125], n, UP);
    lamp(k, 'red', [-2.6, HY + 0.4, s * 0.62]);
    lamp(k, 'red', [-2.6, HY - 0.38, s * 0.62]);
  }
  block(k, 'paint2', [0.12, 0.1, 1.3], [-2.56, HY + 0.44, 0], [0, 0, 0], 0.02);
  k.decal('decal', DECAL.hazard, 0.6, 0.075, [-2.625, HY + 0.44, 0], [-1, 0, 0], UP);
  block(k, 'dark', [0.3, 0.3, 0.5], [-2.15, top + 0.22, 0], [0, 0, 0], 0.03);
  for (let i = 0; i < 4; i++) k.box('pipe', [0.02, 0.035, 0.4], [-2.31, top + 0.12 + i * 0.065, 0]);

  // the name on the prow, the registry on boards along the flanks, a number on the spine
  k.decal('decal', DECAL.name, 0.7, 0.1, [2.12, top + 0.06 + 0.065, 0], [Math.sin(0.32), Math.cos(0.32), 0], FWD);
  for (const s of [-1, 1]) {
    const face = faces[s > 0 ? 2 : 6]!;
    panel(k, 'paint3', face, HY, 0, 0.34, 0, 0.7, 0.16, 0.03, 0.07);
    k.decal('decal', DECAL.reg, 0.62, 0.085, [0.34, HY, s * (face.rad + 0.105)], [0, 0, s], UP);
  }
  // lamps along the spine
  for (const [x, z] of [[1.1, 0.3], [-0.4, -0.3], [-1.9, 0.3]] as const) lamp(k, 'red', [x, top + 0.42, z], 0.03);
}

// ── the engine nacelles ───────────────────────────────────────────────────

const PZ = 1.5, PY = -0.08, PW = 1.14, PH = 1.0;
const POD_XS = [-2.18, -1.7, -1.06, -0.6, 0.12, 0.8];

/** One nacelle, armoured in three sections, its drive astern in a heavy ringed housing. Returns the nozzle. */
function nacelle(k: Kit, rnd: Rnd, z: number): Nozzle {
  const s = Math.sign(z), faces = octFaces(PW, PH);
  // the faces toward the hull, and the ones away from it
  const inb = s > 0 ? [5, 6, 7] : [1, 2, 3], out = s > 0 ? [1, 2, 3] : [5, 6, 7];
  oct(k, 'dark', POD_XS[0]!, POD_XS.at(-1)!, PW, PH, PY, z);
  POD_XS.forEach((x, i) => frameRing(k, x, i === 2 || i === 4 ? 0.13 : 0.07, PW, PH, PY, z, i === 2 || i === 4 ? 1.16 : 1.11));
  armour(k, rnd, POD_XS, faces, PY, z, [[0, 'armour'], ...out.map((i): [number, Role] => [i, i === out[2] ? 'under' : 'armour']), [4, 'under'], ...inb.map((i): [number, Role] => [i, 'inboard'])]);

  // the intake: a tapered cowl, an octagonal frame, a grille of rings
  oct(k, 'dark', 0.8, 1.12, PW * 1.02, PH * 1.02, PY, z, 0.84);
  octFrame(k, 'hull', 1.14, 0.06, 0.42, 0.34, PY, z);
  k.cyl('pipe', 0.34, 0.34, 0.02, [1.12, PY, z], 'x', 24);
  for (const r of [0.28, 0.2, 0.12]) k.ring('dark', r, 0.018, [1.13, PY, z], 'x', 24);
  k.cyl('hull', 0.05, 0.08, 0.08, [1.15, PY, z], 'x', 10);

  // the drive housing: heavier than the barrel, armoured, ribbed, vented
  const HX0 = -2.8, HX1 = -2.14, hw = PW * 1.26, hh = PH * 1.26, hf = octFaces(hw, hh);
  oct(k, 'dark', HX0, HX1, hw, hh, PY, z, 1, true);
  for (const x of [HX1, -2.46]) frameRing(k, x, 0.06, hw, hh, PY, z, 1.05);
  for (const i of [0, ...out, 4]) {
    const face = hf[i]!;
    if (i === out[1]) {
      panel(k, 'paint2', face, PY, z, -2.31, 0, 0.24, face.wid * 0.9, 0.06);
      vent(k, face, PY, z, -2.31, 0, 0.18, face.wid * 0.6, 0.06);
      panel(k, 'paint', face, PY, z, -2.63, 0, 0.24, face.wid * 0.9, 0.06);
      bolts(k, face, PY, z, -2.63, 0, 0.24, face.wid * 0.9, 0.06);
    } else {
      for (const x of [-2.31, -2.63]) {
        panel(k, i === 4 ? 'dark' : pickAmber(rnd), face, PY, z, x, 0, 0.24, face.wid * 0.9, 0.06);
        if (rnd() < 0.5) panel(k, 'dark', face, PY, z, x, 0, 0.12, face.wid * 0.5, 0.02, 0.06, 0.006);
      }
    }
  }
  for (const i of inb) panel(k, 'dark', hf[i]!, PY, z, -2.46, 0, 0.56, hf[i]!.wid * 0.9, 0.05);
  // the stern frame: a thick octagonal ring, a steel lip, then the throat stepping in
  const r = 0.4;
  octFrame(k, 'dark', HX0 - 0.04, 0.14, hh / 2 + 0.01, r + 0.08, PY, z);
  octFrame(k, 'hull', HX0 - 0.12, 0.04, hh / 2 - 0.05, r + 0.11, PY, z);
  k.cyl('dark', r + 0.06, r + 0.02, 0.26, [HX0 + 0.06, PY, z], 'x', 32, true);
  octFrame(k, 'dark', HX0 + 0.02, 0.08, r + 0.13, r + 0.05, PY, z);
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2 + 0.2, d = (hh / 2 + r + 0.08) / 2 + 0.02;
    k.box('hull', [0.02, 0.03, 0.03], [HX0 - 0.115, PY + Math.cos(t) * d, z + Math.sin(t) * d], [t, 0, 0]);
  }
  k.ring('pipe', r + 0.06, 0.03, [HX0 - 0.1, PY, z], 'x', 32);
  k.ring('hull', r * 0.98, 0.022, [HX0 + 0.1, PY, z], 'x', 32);
  k.ring('dark', r * 0.7, 0.02, [HX0 + 0.14, PY, z], 'x', 28);
  // stator struts across the throat, in front of the glow
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    k.box('dark', [0.04, r * 0.62, 0.035], [HX0 + 0.08, PY + Math.cos(a) * r * 0.66, z + Math.sin(a) * r * 0.66], [a, 0, 0]);
  }
  k.cyl('dark', r * 0.16, r * 0.2, 0.08, [HX0 + 0.1, PY, z], 'x', 12);
  // brackets tying the housing to the barrel at the corners
  for (const i of [1, 3, 5, 7]) {
    const f = hf[i]!.f, d = hf[i]!.rad + 0.05;
    bracket(k, 'hull', [HX1 + 0.08, PY + Math.cos(f) * d, z + Math.sin(f) * d], [0.2, 0.05, 0.12], [f, 0, 0]);
  }

  // utility modules on the barrel's back
  for (let x = -1.95; x < 0.6; x += 0.35 + rnd() * 0.4) {
    if (rnd() < 0.4) continue;
    const h = 0.06 + rnd() * 0.1, w = 0.14 + rnd() * 0.2;
    block(k, rnd() < 0.5 ? 'dark' : pickAmber(rnd), [w, h, 0.14 + rnd() * 0.16], [x, PY + PH / 2 + 0.07 + h / 2, z + s * (0.05 + rnd() * 0.12)], [0, 0, 0], 0.015);
  }
  // on the barrel: pipe runs, stencils, lamps
  const outF = faces[out[1]!]!;
  pipeRun(k, -2.0, 0.6, PY + PH / 2 + 0.1, z - s * 0.2, 0.025, 0.42);
  pipeRun(k, -1.9, 0.5, PY + 0.22, z + s * (PW / 2 + 0.1), 0.022, 0.5);
  k.decal('decal', DECAL.hazard, 0.36, 0.08, [-0.18, PY - 0.2, z + s * (outF.rad + 0.08)], [0, 0, s], UP);
  k.decal('decal', DECAL.n9f, 0.2, 0.2, [-0.2, PY + PH / 2 + 0.075, z + s * 0.12], UP, FWD);
  panel(k, 'paint3', faces[0]!, PY, z, -0.2, s * 0.12, 0.26, 0.24, 0.005, 0.07, 0.004);
  lamp(k, 'red', [-2.46, PY + hh / 2 + 0.07, z + s * 0.2]);
  lamp(k, 'red', [0.9, PY + 0.12, z + s * (PW / 2 + 0.02)], 0.03);
  return { p: [HX0 + 0.16, PY, z], r: r * 0.98 };
}

/**
 * The structure binding a nacelle to the hull: beams along the channel
 * between them above and below, armoured straps over the top, cable runs and
 * machinery in the gap.
 */
function mounting(k: Kit, rnd: Rnd, z: number): void {
  const s = Math.sign(z), zc = s * ((HW / 2 + Math.abs(z) - PW / 2) / 2 + 0.02);
  // beams down the channel, above and below
  for (const y of [0.2, -0.36]) block(k, 'dark', [3.7, 0.14, 0.4], [-0.6, y, zc], [0, 0, 0], 0.03);
  // clamps across it, each a dark yoke with a hydraulic ram and an amber cap
  for (const x of [-1.9, -1.0, -0.15, 0.55]) {
    block(k, 'dark', [0.24, 0.2, 0.74], [x, 0.34, zc], [0, 0, 0], 0.03);
    block(k, 'dark', [0.2, 0.16, 0.7], [x, -0.5, zc], [0, 0, 0], 0.03);
    if (rnd() < 0.7) block(k, pickAmber(rnd), [0.18, 0.05, 0.4], [x, 0.465, zc], [0, 0, 0], 0.012);
    k.cyl('hull', 0.035, 0.035, 0.5, [x + 0.16, 0.3, zc], 'z', 8);
    k.cyl('pipe', 0.05, 0.05, 0.18, [x + 0.16, 0.3, zc - s * 0.12], 'z', 8);
    bolts(k, { f: 0, rad: 0, wid: 0.7 }, 0.44, zc, x, 0, 0.24, 0.7, 0);
  }
  // cable runs and machinery in the gap
  for (const [dy, dz] of [[0.3, -0.1], [0.3, 0.1], [0.36, 0]] as const) pipeRun(k, -2.1, 0.75, dy, zc + dz, 0.024, 0.45);
  for (let x = -2.0; x < 0.6; x += 0.3 + rnd() * 0.25) {
    if (rnd() < 0.4) continue;
    block(k, rnd() < 0.25 ? 'hull' : 'dark', [0.12 + rnd() * 0.14, 0.08 + rnd() * 0.1, 0.16 + rnd() * 0.14], [x, 0.3, zc + (rnd() - 0.5) * 0.12], [0, 0, 0], 0.015);
  }
}

/** The model's own scale: built in kit units, brought to play scale where it is shown (the hitbox is 0.9). */
export const MODEL_SCALE = 0.56;

export function buildWayward(): BuiltHull {
  const k = new Kit(), rnd = seeded(7731);
  knock = seeded(4471);
  hull(k, rnd);
  const nozzles = [nacelle(k, rnd, -PZ), nacelle(k, rnd, PZ)];
  mounting(k, rnd, -PZ);
  mounting(k, rnd, PZ);
  // years of it: old hits on the hull and nacelles, and the patches over older ones
  const hf = octFaces(HW, HH), pf = octFaces(PW, PH);
  const hits: Hit[] = [
    crater(k, rnd, hf[1]!, HY, 0, -0.95, 0.02, 0.17),
    crater(k, rnd, hf[6]!, HY, 0, 0.9, -0.08, 0.15),
    crater(k, rnd, hf[0]!, HY, 0, 1.0, -0.47, 0.12),
    crater(k, rnd, pf[0]!, PY, PZ, -0.82, 0.12, 0.16),
    crater(k, rnd, pf[6]!, PY, -PZ, -1.35, 0.04, 0.17),
    crater(k, rnd, pf[1]!, PY, PZ, 0.4, 0.0, 0.11),
  ];
  for (let i = 0; i < 16; i++) {
    const onHull = rnd() < 0.55, faces = onHull ? hf : pf, z0 = onHull ? 0 : (rnd() < 0.5 ? -PZ : PZ);
    const pick = onHull ? [0, 1, 7, 2, 6] : [0, z0 > 0 ? 1 : 7, z0 > 0 ? 2 : 6];
    const face = faces[pick[Math.floor(rnd() * pick.length)]!]!;
    const x = onHull ? -2.1 + rnd() * 3.8 : -1.9 + rnd() * 2.5;
    patch(k, rnd, face, onHull ? HY : PY, z0, x, (rnd() - 0.5) * face.wid * 0.4);
  }
  const root = k.build(materials(hits));
  const tip = PZ + PW * 0.6;
  return { root, nozzles, wings: [[0.9, PY + PH / 2 - 0.05, -tip], [0.9, PY + PH / 2 - 0.05, tip]], shield: [3.1, 1.2, 2.45] };
}
