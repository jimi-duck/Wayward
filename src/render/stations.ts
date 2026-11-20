import {
  AdditiveBlending, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace,
  type Material, type Object3D, type Texture,
} from 'three';
import { Kit, metal, seeded, type V3 } from './kit';
import { cable, crate, lump, materials, stoneOf, stripes, strut, tank, truss, windowMaterial } from './breakout';
import { GUILD_SKIFFS, GUILD_TENTS, HOLDFAST_ROCK, KELLERN_ARCH, PORT_TANKS } from '../sim/solids';
import type { PortStyle } from '../sim/site';

// ── the depots, one per holder ─────────────────────────────────────────────
// A port is the place a holder lives, so each holder builds its own: Frontier
// Supply's yellow fuel depot, Kellern's white company tower and checkpoint
// arch, the Gutter's port in a gutted freighter under a salvage crane, a
// Holdfast hub dug into a rock with greenhouse domes and flak turrets, and the
// Dust Traders' raft of coloured tents strung with lanterns. Each carries its
// name on a lit board and its own paint, lamps and light pools, read from the
// chase camera above: roofs and decks carry most of the detail.
//
// Every depot shares one footprint the sim knows (sim/solids.ts): the hub at
// the middle, the berth 18 units off at local (-17, 6) between two docking
// arms, and the holder's own parts where the solids say. Units are metres.

const TAU = Math.PI * 2;
/** The berth in the depot's own frame: the arms reach out to straddle it. */
const BERTH = { x: -17, z: 6 } as const;

/** What a holder paints and lights its port with. Never red: red is the threat's colour. */
interface Livery {
  hull: number; trim: number; accent: number; deck: number;
  /** Window light, and the colour of edge and strip lights. */
  win: Color; strip: Color;
  /** The name board: its face and its letters, and whether it is neon on a dark board (lit letters) or a lit board. */
  board: string; ink: string; neon: boolean;
}

const LIVERY: Record<PortStyle, Livery> = {
  frontier: { hull: 0x8b8e92, trim: 0x2d2e30, accent: 0xf2b21f, deck: 0x5a5d61, win: new Color(1.5, 1.05, 0.55), strip: new Color(1.4, 1.0, 0.32), board: '#f2b21f', ink: '#16120a', neon: false },
  kellern: { hull: 0xdadde0, trim: 0x26354b, accent: 0x34557f, deck: 0x8e98a3, win: new Color(0.95, 1.15, 1.35), strip: new Color(0.25, 1.15, 1.35), board: '#e8ecf0', ink: '#1c2a3d', neon: false },
  gutter: { hull: 0x70492f, trim: 0x2c2724, accent: 0x4c7464, deck: 0x463d35, win: new Color(1.7, 0.9, 0.36), strip: new Color(1.7, 0.85, 0.28), board: '#101615', ink: '#5ee6d4', neon: true },
  holdfast: { hull: 0x8e826b, trim: 0x37362f, accent: 0x6e7c48, deck: 0x6a6253, win: new Color(1.6, 1.12, 0.6), strip: new Color(0.55, 1.25, 0.55), board: '#1b1a16', ink: '#f2e3bf', neon: true },
  guild: { hull: 0x3e7174, trim: 0x2a2a31, accent: 0xd49a2e, deck: 0x5e4a38, win: new Color(1.65, 1.15, 0.55), strip: new Color(1.6, 1.05, 0.35), board: '#1a140c', ink: '#f0b24a', neon: true },
};

/** The guild's tent cloths, and the Gutter's patch plates: a few colours each, all muted. */
const CLOTH = [0xd49a2e, 0x3f8f8a, 0x6e4c78, 0xd6cdb4];
const PATCH = [0x4c7464, 0x4b5d74, 0x8a6a3e, 0x5c5048];

let cloths: Record<string, Material> | null = null;
/** The traders' cloths as materials c0..c3, for the Dust Market's awnings too. */
export function clothMats(): Record<string, Material> {
  return (cloths ??= Object.fromEntries(CLOTH.map((c, i) => [`c${i}`, metal({ tint: c, roughness: 0.85, metalness: 0.02, painted: true, worn: 0.25, scale: 0.6 })])));
}

const liveryMats = new Map<PortStyle, Record<string, Material>>();
function matsOf(st: PortStyle): Record<string, Material> {
  let m = liveryMats.get(st);
  if (m) return m;
  const L = LIVERY[st];
  m = {
    ...materials(),
    hull: metal({ tint: L.hull, roughness: 0.58, metalness: 0.3, painted: true, worn: 0.3, scale: 0.8 }),
    trim: metal({ tint: L.trim, roughness: 0.5, metalness: 0.65, scale: 1.2 }),
    accent: metal({ tint: L.accent, roughness: 0.55, metalness: 0.1, painted: true, worn: 0.45 }),
    paint: metal({ tint: L.accent, roughness: 0.6, metalness: 0.08, painted: true, worn: 0.35 }),
    deck: metal({ tint: L.deck, roughness: 0.82, metalness: 0.3, scale: 1.4, bump: 0.006 }),
    glass: new MeshStandardMaterial({ color: 0x0b1418, roughness: 0.1, metalness: 0.85, envMapIntensity: 1.8 }),
    cool: new MeshBasicMaterial({ color: L.win, toneMapped: false, fog: false }),
    edge: new MeshBasicMaterial({ color: L.strip, toneMapped: false, fog: false }),
    // greenhouse light: plants under lamps, dim, never a glow
    green: new MeshBasicMaterial({ color: new Color(0.15, 0.36, 0.17), toneMapped: false, fog: false }),
    stone: stoneOf(),
    ...clothMats(),
    ...Object.fromEntries(PATCH.map((c, i) => [`p${i}`, metal({ tint: c, roughness: 0.62, metalness: 0.35, painted: true, worn: 0.6 })])),
  };
  liveryMats.set(st, m);
  return m;
}

/** What moves on a depot: parts that turn, strobes that blink, a neon that stutters. BreakoutView drives it. */
export interface StationAnim {
  spin: Array<{ o: Object3D; w: number }>;
  strobe: MeshBasicMaterial;
  neon: MeshBasicMaterial | null;
  neonBase: Color;
  /** Small craft working the depot: each flies a slow loop round it at its own height and pace. */
  craft: Array<{ o: Object3D; r: number; h: number; w: number; ph: number }>;
}

// ── shared parts ───────────────────────────────────────────────────────────

/** A soft pool of light on a deck, seen from above: the lamps' throw, so a lit station reads as worked. */
let poolTex: Texture | null = null;
function poolTexture(): Texture {
  if (poolTex) return poolTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  poolTex = new CanvasTexture(c);
  return poolTex;
}
const poolGeo = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
export function pools(g: Group, color: Color, at: Array<[number, number, number, number]>, strength = 0.22): void {
  if (typeof document === 'undefined') return;
  const m = new MeshBasicMaterial({ map: poolTexture(), color: color.clone().multiplyScalar(strength), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
  for (const [x, y, z, r] of at) {
    const p = new Mesh(poolGeo, m);
    p.position.set(x, y, z);
    p.scale.set(r * 2, 1, r * 2);
    p.renderOrder = 1;
    g.add(p);
  }
}

/** White anti-collision strobes on the high points, sharing one material so they blink together. */
const strobeGeo = new SphereGeometry(0.22, 8, 6);
function strobes(g: Group, m: MeshBasicMaterial, at: V3[]): void {
  for (const p of at) { const s = new Mesh(strobeGeo, m); s.position.set(...p); g.add(s); }
}

/** The holder's name on a lit board: two faces back to back, so it reads from either side, leaning back to be read from above. */
function nameBoard(name: string, L: Livery, w: number): { g: Group; mat: MeshBasicMaterial } {
  const g = new Group();
  const mat = new MeshBasicMaterial({ color: new Color(1, 1, 1).multiplyScalar(L.neon ? 1.25 : 0.95), toneMapped: false, fog: false });
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 192;
    const draw = (): void => {
      const x = c.getContext('2d')!;
      x.fillStyle = L.board; x.fillRect(0, 0, 1024, 192);
      x.strokeStyle = L.neon ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.35)'; x.lineWidth = 8; x.strokeRect(10, 10, 1004, 172);
      const text = name.toUpperCase();
      let size = 124;
      x.font = `600 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
      try { (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '6px'; } catch { /* older canvas: no spacing */ }
      while (x.measureText(text).width > 930 && size > 40) { size -= 6; x.font = `600 ${size}px "Barlow Condensed", "Arial Narrow", sans-serif`; }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (L.neon) { x.shadowColor = L.ink; x.shadowBlur = 22; }
      x.fillStyle = L.ink; x.fillText(text, 512, 100);
      x.shadowBlur = 0;
      if (mat.map) mat.map.needsUpdate = true;
    };
    draw();
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    mat.map = tex;
    void document.fonts?.ready.then(draw);
  }
  const h = w * (192 / 1024);
  const face = new PlaneGeometry(w, h);
  const front = new Mesh(face, mat), back = new Mesh(face, mat);
  front.position.z = 0.09; back.position.z = -0.09; back.rotation.y = Math.PI;
  g.add(front, back);
  const k = new Kit();
  k.box('trim', [w + 0.5, h + 0.5, 0.14], [0, 0, 0]);
  k.box('trim', [0.3, h + 3, 0.1], [-w * 0.35, -1.5, 0]);
  k.box('trim', [0.3, h + 3, 0.1], [w * 0.35, -1.5, 0]);
  g.add(k.build({ trim: materials().dark! }));
  return { g, mat };
}

/** The two docking arms reaching from the hub to the berth: clamps, fenders, edge lamps along them, hazard bands at the tips. */
function arms(k: Kit, x0: number): void {
  // the neck: a cross beam at the hub's edge carrying both arms, braced back to the hub
  k.box('trim', [1.4, 0.9, 9.4], [x0, -0.2, BERTH.z]);
  k.box('hull', [x0 < -6.5 ? 2.4 : 1.6, 1.2, 2.4], [x0 + 1.0, -0.2, 2.6]);
  strut(k, 'trim', [x0, -0.6, BERTH.z + 3.2], [x0 + 3.5, -0.6, 3.5], 0.14, 5);
  for (const s of [-1, 1]) {
    const z = BERTH.z + s * 3.2, len = x0 - (BERTH.x - 3.5), mid = (x0 + BERTH.x - 3.5) / 2;
    k.box('trim', [len, 0.7, 1.0], [mid, -0.2, z]);
    k.box('deck', [len - 0.6, 0.12, 0.8], [mid, 0.2, z]);
    k.box('hull', [1.6, 1.0, 1.6], [BERTH.x - 3, -0.2, z]);
    k.box('paint', [0.5, 1.8, 0.5], [BERTH.x - 2, 0.9, z]);
    for (const d of [-1, 1]) { strut(k, 'trim', [BERTH.x - 3.6, -0.2, z - s * 0.7 + d * 0.4], [BERTH.x - 4.6, 0.1, z - s * 1.1 + d * 0.4], 0.12, 5); }
    stripes(k, BERTH.x - 1, 0.28, z, 'x', 6, 0.7, 5);
    for (let j = 0; j < 6; j++) k.box('edge', [0.22, 0.1, 0.22], [x0 - 1.5 - j * ((len - 3) / 5), 0.32, z - s * 0.42]);
    truss(k, [BERTH.x - 2, -1.2, z], [x0, -1.2, z], 0.9, 8);
  }
  for (let i = 0; i < 4; i++) { const x = BERTH.x - 1 + i * ((x0 - BERTH.x) / 4); strut(k, 'trim', [x, -1.2, BERTH.z - 3.2], [x, -1.2, BERTH.z + 3.2], 0.08, 4); }
}

/** A band of window lights round a polygon face, `n` sided, at radius r (to the face) and height y. */
function polyWindows(k: Kit, rnd: () => number, key: string, sides: number, r: number, y: number, per: number, size: [number, number], skip = 0.2): void {
  for (let i = 0; i < sides; i++) {
    const a = ((i + 0.5) / sides) * TAU, ca = Math.cos(a), sa = Math.sin(a), half = r * Math.tan(Math.PI / sides) * 0.8;
    for (let j = 0; j < per; j++) {
      if (rnd() < skip) continue;
      const t = per > 1 ? -half + (2 * half * j) / (per - 1) : 0;
      k.box(key, [0.08, size[1], size[0]], [ca * (r + 0.03) - sa * t, y, sa * (r + 0.03) + ca * t], [0, -a, 0]);
    }
  }
}

// ── Frontier Supply: the yellow fuel depot ────────────────────────────────

/** A square box girder from a to b, `w` across: four chords and a zigzag brace down each face. Points any way. */
function girder(k: Kit, a: V3, b: V3, w: number, bays: number, chord = 'trim', r = 0.09): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  const tx = dx / len, ty = dy / len, tz = dz / len;
  // u lies level where it can; v is the third axis
  let ux = 1, uz = 0;
  if (Math.abs(ty) <= 0.9) { const l = Math.hypot(tx, tz); ux = -tz / l; uz = tx / l; }
  const vx = ty * uz, vy = tz * ux - tx * uz, vz = -ty * ux;
  const h = w / 2, C: Array<[number, number]> = [[-h, -h], [h, -h], [h, h], [-h, h]];
  const at = (t: number, c: [number, number]): V3 => [a[0] + dx * t + ux * c[0] + vx * c[1], a[1] + dy * t + vy * c[1], a[2] + dz * t + uz * c[0] + vz * c[1]];
  for (const c of C) strut(k, chord, at(0, c), at(1, c), r, 4);
  for (let f = 0; f < 4; f++) {
    const c0 = C[f]!, c1 = C[(f + 1) % 4]!;
    for (let i = 0; i < bays; i++) strut(k, 'dark', at(i / bays, i % 2 ? c1 : c0), at((i + 1) / bays, i % 2 ? c0 : c1), r * 0.55, 3);
  }
}

/** Hazard chevrons on an upright face: slanted paint bars on a dark plate. The face looks along x (`facing` its sign) or along z. */
function chevrons(k: Kit, x: number, y: number, z: number, face: 'x' | 'z', facing: number, len: number, h: number, n: number): void {
  const o = facing * 0.04;
  if (face === 'x') k.box('dark', [0.06, h, len], [x, y, z]);
  else k.box('dark', [len, h, 0.06], [x, y, z]);
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + (i + 0.5) * (len / n), w = (len / n) * 0.5;
    if (face === 'x') k.box('paint', [0.04, h * 0.98, w], [x + o, y, z + t], [0.55, 0, 0]);
    else k.box('paint', [w, h * 0.98, 0.04], [x + t, y, z + o], [0, 0, 0.55]);
  }
}

/** A rail with posts between two points at deck height y, and amber sodium lamps every few posts: a walkway's edge. */
function railing(k: Kit, a: V3, b: V3, posts: number, lampEvery = 0): void {
  const top = (p: V3): V3 => [p[0], p[1] + 0.6, p[2]];
  strut(k, 'trim', top(a), top(b), 0.035, 3);
  for (let i = 0; i <= posts; i++) {
    const t = i / posts, p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    k.box('trim', [0.06, 0.6, 0.06], [p[0], p[1] + 0.3, p[2]]);
    if (lampEvery && i % lampEvery === 0) k.box('amber', [0.12, 0.1, 0.12], [p[0], p[1] + 0.66, p[2]]);
  }
}

/** The gantry arch's frames (x), its legs' half-span (z), the top chord and the lower chord the name board hangs between. */
const GANTRY_X = [-4, 5] as const, GANTRY_Z = 6.6, GANTRY_TOP = 12.4, GANTRY_LOW = 8.4;

/**
 * The great arch over the cargo deck that carries the name: two deep truss frames on four box-girder legs standing in the
 * habitat ring (inside the hub's solid circle, so nothing stands where she flies), catwalks, cable trays, chevron end blocks,
 * floods on the shoulders angled down at the deck and the berth, a hoist over the yard and the beacon mast on its back.
 */
function gantryArch(k: Kit): void {
  const [fx, rx] = GANTRY_X, Z = GANTRY_Z, top = GANTRY_TOP, low = GANTRY_LOW;
  for (const x of GANTRY_X) {
    for (const s of [-1, 1]) {
      const z = s * Z;
      k.box('trim', [1.8, 0.6, 1.8], [x, 1.3, z]);
      k.box('paint', [1.4, 0.3, 1.4], [x, 1.75, z]);
      girder(k, [x, 1.9, z], [x, top, z], 1.0, 7, 'paint', 0.11);
      // knee braces where the leg meets the beam
      strut(k, 'trim', [x, top - 2.8, z], [x, top - 0.3, z - s * 2.6], 0.12, 5);
      // a ladder up the outer face, sodium lamps on it
      for (const d of [-0.22, 0.22]) k.box('trim', [0.04, top - 2.2, 0.04], [x - 0.62, (top + 2.2) / 2, z + d]);
      for (let y = 3.2; y < top; y += 2.2) k.box('amber', [0.1, 0.12, 0.14], [x - 0.66, y, z]);
    }
    // the top chord and the lower one, braced between: one deep frame
    girder(k, [x, top, -Z - 0.8], [x, top, Z + 0.8], 1.0, 12, 'paint', 0.12);
    girder(k, [x, low, -Z], [x, low, Z], 0.6, 10, 'trim', 0.08);
    for (let i = 0; i < 6; i++) {
      const z0 = -Z + (i * 2 * Z) / 6, z1 = -Z + ((i + 1) * 2 * Z) / 6;
      strut(k, 'trim', [x + 0.5, i % 2 ? top - 0.5 : low, z0], [x + 0.5, i % 2 ? low : top - 0.5, z1], 0.07, 4);
    }
    // chevron end blocks over the legs, on both faces
    for (const s of [-1, 1]) {
      k.box('trim', [1.1, 1.1, 2.0], [x, top, s * (Z - 0.2)]);
      for (const f of [-1, 1]) chevrons(k, x + f * 0.58, top, s * (Z - 0.2), 'x', f, 1.9, 1.0, 5);
      stripes(k, x, top + 0.58, s * (Z - 0.2), 'z', 2.0, 1.0, 5);
    }
    // a cable tray under the top chord
    k.box('dark', [0.5, 0.1, 2 * Z], [x + 0.9, top - 0.75, 0]);
    k.box('trim', [0.06, 0.2, 2 * Z], [x + 1.15, top - 0.68, 0]);
  }
  // stringers tying the two frames, a catwalk along the top of each, and cables slung between
  for (const s of [-1, 1]) {
    girder(k, [fx, top, s * Z], [rx, top, s * Z], 0.8, 6, 'trim', 0.08);
    cable(k, [fx + 0.5, top - 0.6, s * (Z - 1.5)], [rx - 0.5, top - 0.6, s * (Z - 1.5)], 0.8, 0.07);
    // diagonal suspension struts from the shoulders down to the lower chord
    for (const x of GANTRY_X) strut(k, 'trim', [x + 0.3, top + 0.4, s * (Z + 0.6)], [x + 0.3, low + 0.2, s * 1.4], 0.06, 4);
  }
  for (const x of GANTRY_X) {
    k.box('deck', [1.1, 0.08, 2 * Z + 1.4], [x, top + 0.62, 0]);
    for (const e of [-0.55, 0.55]) railing(k, [x + e, top + 0.66, -Z - 0.6], [x + e, top + 0.66, Z + 0.6], 8, 2);
  }
  k.box('deck', [rx - fx - 1, 0.08, 0.9], [(fx + rx) / 2, top + 0.62, 0]);
  railing(k, [fx + 0.6, top + 0.66, 0.45], [rx - 0.6, top + 0.66, 0.45], 5, 2);
  // a catwalk behind the board, at the lower chord
  k.box('deck', [0.9, 0.08, 2 * Z - 1], [fx + 1.0, low - 0.32, 0]);
  railing(k, [fx + 1.4, low - 0.28, -Z + 0.5], [fx + 1.4, low - 0.28, Z - 0.5], 8, 2);
  // floods on the front shoulders, angled down at the deck and out to the berth
  for (const z of [-Z, -2.4, 2.4, Z]) {
    k.box('trim', [0.7, 0.5, 0.9], [fx - 0.75, top - 0.75, z], [0, 0, -0.55]);
    k.box('lamp', [0.08, 0.42, 0.72], [fx - 1.1, top - 0.98, z], [0, 0, -0.55]);
  }
  for (const s of [-1, 1]) {
    k.box('trim', [0.7, 0.5, 0.9], [rx + 0.75, top - 0.75, s * Z], [0, 0, 0.55]);
    k.box('lamp', [0.08, 0.42, 0.72], [rx + 1.1, top - 0.98, s * Z], [0, 0, 0.55]);
  }
  // the hoist over the cargo yard, hanging from the front frame
  k.box('paint', [1.1, 0.6, 1.3], [fx, low - 0.7, -5.4]);
  for (const d of [-0.35, 0.35]) strut(k, 'dark', [fx, low - 1.0, -5.4 + d], [fx - 0.2, 3.3, -5.4 + d], 0.04, 3);
  k.box('paint', [1.2, 0.7, 1.0], [fx - 0.2, 3.0, -5.4]);
  stripes(k, fx - 0.2, 3.37, -5.4, 'z', 1.0, 1.2, 3);
  // the beacon mast you steer for, on the arch's back
  k.box('trim', [0.8, 4.6, 0.8], [rx, top + 2.9, 0]);
  k.box('trim', [2.4, 0.3, 0.3], [rx, top + 3.6, 0]);
  k.box('amber', [0.22, 4.0, 0.22], [rx - 0.45, top + 2.9, 0]);
  k.box('lamp', [1.2, 1.2, 1.2], [rx, top + 5.8, 0]);
}

/**
 * The keel below the hub: a tapering skirt to a cross of box-girder spines running out under the tank farm, a lower chord with
 * ballast blocks hung from it down to y -9, conduits and fuel lines along the spines, and lit maintenance walkways beside them.
 */
function keel(k: Kit): void {
  k.cyl('hull', 5.0, 3.4, 2.4, [0, -2.7, 0], 'y', 28);
  k.ring('trim', 4.3, 0.12, [0, -2.4, 0], 'y', 28);
  k.cyl('trim', 3.2, 1.8, 1.6, [0, -4.7, 0], 'y', 18);
  for (let i = 0; i < 18; i++) { const an = (i / 18) * TAU; k.box('win', [0.3, 0.16, 0.06], [Math.cos(an) * 4.6, -2.9, Math.sin(an) * 4.6], [0, -an + Math.PI / 2, 0]); }
  // the spines: one along x out under the eastern tanks, one along z under the north and south ones
  const y = -4.4;
  girder(k, [-8, y, 0], [14, y, 0], 1.6, 14, 'trim', 0.12);
  girder(k, [0, y, -11], [0, y, 13], 1.4, 12, 'trim', 0.11);
  // the keel post under the hub, down to the lower chord, with a lit band
  k.cyl('hull', 1.9, 1.3, 2.2, [0, -6.5, 0], 'y', 16);
  for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; k.box('win', [0.26, 0.14, 0.06], [Math.cos(an) * 1.72, -6.0, Math.sin(an) * 1.72], [0, -an + Math.PI / 2, 0]); }
  // the lower chord and its bracing, the ballast blocks hung from it, deepest under the hub
  const lo = -7.6;
  girder(k, [-6, lo, 0], [10, lo, 0], 1.0, 8, 'hull', 0.09);
  for (let i = 0; i < 8; i++) {
    const x0 = -6 + i * 2, x1 = x0 + 2;
    for (const s of [-1, 1]) strut(k, 'trim', [i % 2 ? x1 : x0, y - 0.8, s * 0.7], [i % 2 ? x0 : x1, lo + 0.5, s * 0.5], 0.08, 4);
  }
  for (const [bx, d] of [[-5.2, 1.2], [0, 1.4], [9.4, 1.2]] as const) {
    k.box('hull', [2.4, d, 2.4], [bx, lo - 0.5 - d / 2, 0]);
    k.box('trim', [2.6, 0.2, 2.6], [bx, lo - 0.5, 0]);
    for (const s of [-1, 1]) chevrons(k, bx, lo - 0.6 - d / 2, s * 1.24, 'z', s, 2.0, d * 0.5, 5);
  }
  // the tip under the hub: an antenna down to the strobe
  k.cyl('trim', 0.12, 0.12, 1.4, [0, -10.2, 0], 'y', 6);
  // pump housings hung under the cross spine
  for (const z of [-11, -5, 7, 13]) k.box('hull', [1.8, 0.9, 1.8], [0, y - 1.3, z]);
  // conduits and fuel lines along the spines
  for (const s of [-1, 1]) {
    k.cyl('trim', 0.22, 0.22, 22, [3, y + 1.1, s * 1.15], 'x', 8);
    k.cyl('paint', 0.15, 0.15, 22, [3, y + 1.1, s * 1.55], 'x', 8);
    k.cyl('trim', 0.2, 0.2, 24, [s * 1.1, y + 1.0, 1], 'z', 8);
    for (let x = -6; x <= 13; x += 3.8) k.ring('dark', 0.3, 0.06, [x, y + 1.1, s * 1.15], 'x', 10);
  }
  // maintenance walkways beside the long spine, railed, under sodium lamps
  for (const s of [-1, 1]) {
    k.box('deck', [19, 0.08, 0.9], [3, y - 0.9, s * 1.55]);
    for (let x = -6.5; x < 13; x += 1.1) k.box('dark', [0.06, 0.05, 0.86], [x, y - 0.84, s * 1.55]);
    railing(k, [-6.5, y - 0.86, s * 2.0], [12.5, y - 0.86, s * 2.0], 9, 2);
  }
}

/** The tanks' roll-cages, cradles, collars, manifolds and valves, and their pipes down to the keel. */
function tankCage(k: Kit, tx: number, tz: number, an: number, sphere: boolean): void {
  const ca = Math.cos(an), sa = Math.sin(an);
  if (sphere) {
    const r = 2.35, cy = 2.8;
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * TAU + 0.2, t1 = ((i + 1) / 8) * TAU + 0.2;
      const p: V3 = [tx + Math.cos(t) * r, 0, tz + Math.sin(t) * r], q: V3 = [tx + Math.cos(t1) * r, 0, tz + Math.sin(t1) * r];
      k.box('trim', [0.16, 5.2, 0.16], [p[0], 2.4, p[2]], [0, -t, 0]);
      if (i % 2) strut(k, 'dark', [p[0], 0.3, p[2]], [q[0], 2.6, q[2]], 0.05, 3);
      else strut(k, 'dark', [p[0], 2.9, p[2]], [q[0], 4.8, q[2]], 0.05, 3);
    }
    for (const y of [0.1, cy, 5.0]) k.ring('trim', r, 0.08, [tx, y, tz], 'y', 24);
    k.ring('paint', 1.97, 0.13, [tx, cy + 0.9, tz], 'y', 24);
    // a ladder up the side toward the hub, lamps at the rungs' head
    const lx = tx - ca * (r + 0.1), lz = tz - sa * (r + 0.1);
    for (const d of [-0.22, 0.22]) k.box('trim', [0.04, 5.0, 0.04], [lx - sa * d, 2.5, lz + ca * d]);
    for (const y of [1.6, 3.4, 5.1]) k.box('amber', [0.12, 0.1, 0.12], [lx, y, lz]);
  } else {
    // a capsule along x: hoops, a box frame of rails round it, pylons into a cradle under it
    for (const e of [-3.1, -1.0, 1.0, 3.1]) {
      for (const d of [-1, 1]) k.box('trim', [0.14, 3.8, 0.14], [tx + e, 2.2, tz + d * 1.75]);
      k.box('trim', [0.14, 0.14, 3.6], [tx + e, 4.1, tz]);
      k.ring('trim', 1.6, 0.07, [tx + e, 2.4, tz], 'x', 18);
    }
    for (const [yy, d] of [[4.1, -1], [4.1, 1], [0.4, -1], [0.4, 1]] as const) k.box('trim', [6.4, 0.14, 0.14], [tx, yy, tz + d * 1.75]);
    for (const d of [-1, 1]) for (const [a0, a1] of [[-3.1, -1.0], [1.0, 3.1]] as const) strut(k, 'dark', [tx + a0, 0.4, tz + d * 1.75], [tx + a1, 4.1, tz + d * 1.75], 0.05, 3);
    for (const e of [-2.6, 2.6]) {
      k.box('paint', [0.5, 1.6, 0.5], [tx + e, -0.1, tz - 0.9]);
      k.box('paint', [0.5, 1.6, 0.5], [tx + e, -0.1, tz + 0.9]);
      k.box('trim', [0.7, 0.3, 2.4], [tx + e, -0.95, tz]);
    }
    for (const y of [1.2, 2.6, 3.8]) k.box('amber', [0.1, 0.1, 0.12], [tx - 3.25, y, tz + 1.75]);
  }
  // the manifold toward the hub: a junction box, two valve wheels, vent slits glowing amber
  const mx = tx - ca * 3.6, mz = tz - sa * 3.6;
  k.box('paint', [1.1, 0.8, 1.1], [mx, 0.2, mz], [0, -an, 0]);
  k.box('trim', [1.3, 0.12, 1.3], [mx, 0.66, mz], [0, -an, 0]);
  for (const d of [-0.32, 0.32]) {
    k.cyl('trim', 0.06, 0.06, 0.5, [mx - sa * d, 0.95, mz + ca * d], 'y', 5);
    k.ring('dark', 0.26, 0.045, [mx - sa * d, 1.2, mz + ca * d], 'y', 12);
  }
  for (const h of [-0.15, 0.05, 0.25]) k.box('amber', [0.6, 0.05, 0.03], [mx - ca * 0.57, 0.2 + h, mz - sa * 0.57], [0, -an + Math.PI / 2, 0]);
  k.box('paint', [0.5, 0.8, 0.4], [tx + sa * 2.9, 0.5, tz - ca * 2.9], [0, -an, 0]);
  k.box('amber', [0.04, 0.05, 0.3], [tx + sa * 2.9 - ca * 0.27, 0.65, tz - ca * 2.9 - sa * 0.27], [0, -an, 0]);
  // a fuel line from the tank's foot down to the keel
  strut(k, 'paint', [tx - ca * 1.2, -0.4, tz - sa * 1.2], [tx * 0.55, -3.3, tz * 0.55], 0.13, 6);
  strut(k, 'trim', [tx - ca * 0.6, -0.5, tz - sa * 0.6], [tx * 0.62, -3.6, tz * 0.62], 0.09, 5);
}

/** Frontier's cradle round the berth, on top of the shared arms: a second tier of trusses below, hydraulic rams, guide rails with lamps, fenders, and a service arch over the throat. */
function cradle(k: Kit, x0: number): void {
  for (const s of [-1, 1]) {
    const z = BERTH.z + s * 3.2, xs = BERTH.x - 2, len = x0 - xs, mid = (x0 + xs) / 2;
    truss(k, [xs + 0.5, -2.4, z], [x0, -2.4, z], 0.7, 8);
    for (let i = 0; i <= 4; i++) { const x = xs + 0.5 + (i * (len - 0.5)) / 4; strut(k, 'trim', [x, -1.7, z], [x, -1.2, z], 0.07, 4); }
    // hydraulic rams from the lower tier up to the arm: a yellow barrel and a bright rod
    for (const x of [xs + 2.5, mid, x0 - 2.5]) {
      const a: V3 = [x - 1.0, -2.1, z + s * 0.35], b: V3 = [x + 0.9, -0.5, z + s * 0.35], m: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z + s * 0.35];
      strut(k, 'paint', a, m, 0.17, 8);
      strut(k, 'trim', m, b, 0.08, 6);
    }
    // a guide rail along the inner edge, edge lamps on it
    const zr = z - s * 0.55;
    k.box('trim', [len - 1.5, 0.16, 0.16], [mid + 0.6, 1.0, zr]);
    for (let i = 0; i <= 5; i++) {
      const x = xs + 1.4 + (i * (len - 2.5)) / 5;
      k.box('trim', [0.12, 0.7, 0.12], [x, 0.62, zr]);
      k.box('edge', [0.2, 0.1, 0.2], [x, 1.14, zr]);
    }
    // the fender at the berth: a dark pad facing her, chevrons on it, a bumper strobe's housing at the tip
    k.box('dark', [1.6, 1.3, 0.3], [xs, 0.55, z - s * 0.85]);
    chevrons(k, xs, 0.55, z - s * 1.02, 'z', -s, 1.5, 1.0, 5);
    k.box('trim', [0.8, 0.5, 0.8], [BERTH.x - 3.6, 0.55, z]);
  }
  // the service arch over the throat, lamps on its underside pointing down the way in
  const ax = -12, az = BERTH.z;
  for (const s of [-1, 1]) {
    girder(k, [ax, 0.3, az + s * 3.4], [ax, 5.4, az + s * 3.4], 0.7, 4, 'trim', 0.08);
    k.box('trim', [1.0, 0.4, 1.0], [ax, 0.4, az + s * 3.4]);
  }
  k.box('paint', [0.8, 0.8, 7.8], [ax, 5.7, az]);
  stripes(k, ax, 6.12, az, 'z', 7.6, 0.8, 9);
  k.box('dark', [0.5, 0.3, 6.4], [ax, 5.18, az]);
  for (let i = -2; i <= 2; i++) k.box('edge', [0.28, 0.08, 0.36], [ax, 4.99, az + i * 1.25]);
  for (const s of [-1, 1]) {
    k.box('trim', [0.6, 0.45, 0.7], [ax - 0.6, 5.25, az + s * 3.0], [0, 0, -0.5]);
    k.box('lamp', [0.08, 0.36, 0.56], [ax - 0.92, 5.1, az + s * 3.0], [0, 0, -0.5]);
  }
}

function frontier(k: Kit, g: Group, rnd: () => number, L: Livery, a: StationAnim): V3 {
  // the hub: a drum core on a broad skirt, a lit habitat ring round it, a control drum on top with a window band
  k.cyl('hull', 4.5, 5.5, 3, [0, 0, 0], 'y', 28);
  k.cyl('trim', 5.9, 5.9, 0.4, [0, -1.2, 0], 'y', 28);
  k.cyl('paint', 3, 3.6, 1.6, [0, 2.2, 0], 'y', 20);
  k.cyl('trim', 3.1, 3.1, 0.22, [0, 3.1, 0], 'y', 20);
  k.cyl('glass', 2.4, 3, 1.0, [0, 3.7, 0], 'y', 20);
  k.cyl('deck', 2.6, 2.6, 0.2, [0, 4.3, 0], 'y', 20);
  for (let i = 0; i < 36; i++) { const an = (i / 36) * TAU; if (rnd() > 0.22) k.box('win', [0.34, 0.2, 0.06], [Math.cos(an) * 3.62, 2.2, Math.sin(an) * 3.62], [0, -an + Math.PI / 2, 0]); }
  for (let i = 0; i < 24; i++) { const an = (i / 24) * TAU; k.box('cool', [0.06, 0.16, 0.6], [Math.cos(an) * 2.72, 3.75, Math.sin(an) * 2.72], [0, -an, 0]); }
  for (let i = 0; i < 12; i++) {
    const an = (i / 12) * TAU, ca = Math.cos(an), sa = Math.sin(an);
    k.box('hull', [2.6, 1.6, 2.2], [ca * 7, 0.2, sa * 7], [0, -an, 0]);
    k.box(i % 3 ? 'paint' : 'deck', [2.2, 0.16, 1.8], [ca * 7, 1.08, sa * 7], [0, -an, 0]);
    k.box('trim', [0.5, 0.5, 2.2], [Math.cos(an + 0.26) * 7, -0.2, Math.sin(an + 0.26) * 7], [0, -an - 0.26, 0]);
    for (const y of [0.0, 0.5]) for (const t of [-0.6, 0, 0.6]) if (rnd() > 0.25) k.box('win', [0.08, 0.2, 0.32], [ca * 8.33 - sa * t, y, sa * 8.33 + ca * t], [0, -an, 0]);
    k.cyl('trim', 0.22, 0.22, 0.7, [ca * 6.4 + sa * 0.5, 1.5, sa * 6.4 - ca * 0.5], 'y', 6);
  }
  for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; k.box('edge', [0.18, 0.12, 0.18], [Math.cos(an) * 4.6, 1.5, Math.sin(an) * 4.6]); }
  arms(k, -6);
  cradle(k, -6);
  keel(k);
  // cargo yard and the tank farm: pressure spheres and long capsule tanks in roll-cages, piped to the hub and down to the keel
  for (let i = 0; i < 6; i++) crate(k, ['paint', 'p1', 'hull'][i % 3]!, -3.2 - (i % 3) * 1.8, 0.1, -4.8 - Math.floor(i / 3) * 1.3, (rnd() - 0.5) * 0.3, 1.6, 0.95, 1.05);
  PORT_TANKS.forEach(([tx, tz], i) => {
    const an = Math.atan2(tz, tx);
    if (i % 2) {
      k.cyl('paint', 1.5, 1.5, 4.6, [tx, 2.4, tz], 'x', 16);
      for (const e of [-1, 1]) k.add('paint', new SphereGeometry(1.5, 14, 8, 0, TAU, 0, Math.PI / 2).rotateZ(-e * Math.PI / 2), [tx + e * 2.3, 2.4, tz]);
      for (const e of [-1.4, 0, 1.4]) k.ring('trim', 1.52, 0.08, [tx + e, 2.4, tz], 'x', 16);
      for (const e of [-1.6, 1.6]) k.box('trim', [0.4, 1.8, 2.6], [tx + e, 0.7, tz]);
      stripes(k, tx, 3.92, tz, 'x', 3.6, 0.5, 5);
    } else tank(k, tx, tz, 1.9, an);
    tankCage(k, tx, tz, an, !(i % 2));
    k.cyl('trim', 0.2, 0.2, 7, [Math.cos(an) * 9, 0, Math.sin(an) * 9], 'x', 6);
    cable(k, [Math.cos(an) * 6, 1.4, Math.sin(an) * 6], [Math.cos(an) * 12.3, 2.7, Math.sin(an) * 12.3], 1.2, 0.09);
  });
  // the arch over the yard that carries the name, and radiators round the control drum
  gantryArch(k);
  for (let i = 0; i < 4; i++) {
    const an = (i / 4) * TAU + 0.78;
    k.box('hull', [0.1, 3.4, 5.2], [Math.cos(an) * 5.4, 3.7, Math.sin(an) * 5.4], [0, -an, 0]);
    strut(k, 'trim', [Math.cos(an) * 4.6, 2.4, Math.sin(an) * 4.6], [Math.cos(an) * 5.3, 4.8, Math.sin(an) * 5.3], 0.12, 4);
  }
  k.greebles('hull', rnd, -4, 4, -4, 4, 1.6, 14, 0.8);
  // a dish that turns on the hub roof
  const dk = new Kit();
  strut(dk, 'trim', [0, 0, 0], [0, 1.4, 0], 0.12, 5);
  dk.add('hull', new CylinderGeometry(1.7, 0.2, 0.55, 14, 1, true), [0.6, 1.9, 0], [0, 0, 0.6]);
  dk.box('lamp', [0.18, 0.18, 0.18], [0.6, 1.7, 0]);
  const dish = dk.build(matsOf('frontier'));
  dish.position.set(1.4, 4.4, -1.4);
  g.add(dish);
  a.spin.push({ o: dish, w: 0.35 });
  const [fx, rx] = GANTRY_X, Z = GANTRY_Z, top = GANTRY_TOP;
  pools(g, L.strip, [
    [0, 4.45, 0, 4], [-11, 0.35, BERTH.z, 6], [-15.5, 0.35, BERTH.z, 4], [-4.5, 0.2, -5.5, 4],
    // under the arch's floods, on the ring roof and the yard in front of it
    [fx - 2, 1.2, -4, 4], [fx - 2, 1.2, 4, 4], [(fx + rx) / 2, 1.2, 0, 5],
    ...PORT_TANKS.map(([x, z]): [number, number, number, number] => [x, 0.1, z, 4.4]),
  ]);
  strobes(g, a.strobe, [
    [rx, top + 7, 0], [fx, top + 1.4, -Z - 0.8], [fx, top + 1.4, Z + 0.8], [rx, top + 1.4, -Z - 0.8], [rx, top + 1.4, Z + 0.8],
    [0, -11, 0], [14.2, -4.4, 0],
    [BERTH.x - 3.6, 1.0, BERTH.z - 3.2], [BERTH.x - 3.6, 1.0, BERTH.z + 3.2],
  ]);
  return [fx - 1.1, (GANTRY_LOW + top) / 2 + 0.1, 0];
}

// ── Kellern: the company tower and its checkpoint ─────────────────────────

function kellern(k: Kit, g: Group, rnd: () => number, L: Livery, a: StationAnim): V3 {
  // the tower: an octagonal skirt, two white tiers with a navy band, a glass bridge, a landing deck on top
  k.cyl('trim', 8.4, 8.8, 1.0, [0, -1.0, 0], 'y', 8);
  k.cyl('hull', 7.2, 7.6, 3.2, [0, 0.9, 0], 'y', 8);
  k.cyl('accent', 7.28, 7.28, 0.5, [0, 1.9, 0], 'y', 8);
  polyWindows(k, rnd, 'cool', 8, 7.0, 0.4, 7, [0.38, 0.22], 0.15);
  polyWindows(k, rnd, 'cool', 8, 7.0, 1.0, 7, [0.38, 0.22], 0.25);
  k.cyl('deck', 6.4, 7.0, 0.3, [0, 2.65, 0], 'y', 8);
  k.cyl('hull', 5.0, 5.4, 3.0, [0, 4.2, 0], 'y', 8);
  k.cyl('accent', 5.06, 5.06, 0.4, [0, 5.2, 0], 'y', 8);
  polyWindows(k, rnd, 'cool', 8, 4.85, 3.6, 5, [0.36, 0.22], 0.1);
  polyWindows(k, rnd, 'cool', 8, 4.85, 4.3, 5, [0.36, 0.22], 0.2);
  k.cyl('glass', 4.1, 4.4, 1.6, [0, 6.5, 0], 'y', 16);
  for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; k.box('trim', [0.12, 1.6, 0.12], [Math.cos(an) * 4.28, 6.5, Math.sin(an) * 4.28]); }
  k.cyl('cool', 3.9, 3.9, 0.18, [0, 6.9, 0], 'y', 16);
  // the landing deck: overhangs the tower, edge lamps, a navy cross on a pale pad
  k.cyl('trim', 6.6, 6.0, 0.5, [0, 7.6, 0], 'y', 8);
  k.cyl('deck', 6.3, 6.3, 0.12, [0, 7.9, 0], 'y', 8);
  for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; k.box('edge', [0.22, 0.12, 0.22], [Math.cos(an) * 6.1, 8.0, Math.sin(an) * 6.1]); }
  k.box('accent', [5.4, 0.06, 0.9], [0, 8.0, 0]);
  k.box('accent', [0.9, 0.06, 5.4], [0, 8.0, 0]);
  k.ring('hull', 3.1, 0.12, [0, 7.98, 0], 'y', 32);
  // radiator fins on the lower tier roof, the company mast with its amber light
  for (let i = 0; i < 4; i++) {
    const an = (i / 4) * TAU + Math.PI / 4;
    k.box('hull', [0.12, 2.2, 3.2], [Math.cos(an) * 6.1, 3.8, Math.sin(an) * 6.1], [0, -an + Math.PI / 2, 0]);
    for (let j = -1; j <= 1; j++) k.box('accent', [0.14, 2.0, 0.12], [Math.cos(an) * 6.1 - Math.sin(an) * j, 3.8, Math.sin(an) * 6.1 + Math.cos(an) * j], [0, -an + Math.PI / 2, 0]);
  }
  k.box('trim', [0.5, 6, 0.5], [3.4, 11, -3.4]);
  k.box('amber', [0.3, 0.3, 0.3], [3.4, 14.2, -3.4]);
  k.box('trim', [2.2, 0.2, 0.2], [3.4, 12.6, -3.4]);
  // the claims office: a long white block across a skybridge, cool windows round it, panels and plant on the roof
  const [ox, oz] = [4, 15];
  k.box('hull', [9, 4.6, 8], [ox, 1.4, oz]);
  k.box('accent', [9.1, 0.5, 8.1], [ox, 2.4, oz]);
  k.box('trim', [9.4, 0.4, 8.4], [ox, 3.9, oz]);
  for (const y of [0.5, 1.4, 3.1]) {
    for (let j = 0; j < 9; j++) { if (rnd() > 0.2) k.box('cool', [0.5, 0.24, 0.06], [ox - 4 + j, y, oz - 4.03]); if (rnd() > 0.2) k.box('cool', [0.5, 0.24, 0.06], [ox - 4 + j, y, oz + 4.03]); }
    for (let j = 0; j < 7; j++) { if (rnd() > 0.2) k.box('cool', [0.06, 0.24, 0.5], [ox - 4.53, y, oz - 3 + j]); if (rnd() > 0.2) k.box('cool', [0.06, 0.24, 0.5], [ox + 4.53, y, oz - 3 + j]); }
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) k.box('glass', [2.2, 0.1, 1.5], [ox - 2.6 + i * 2.6, 4.2, oz - 1.4 + j * 2.6], [0.12, 0, 0]);
  k.greebles('hull', rnd, ox - 4, ox + 4, oz + 2, oz + 3.6, 4.1, 6, 0.7);
  k.box('hull', [1.6, 1.4, 6.5], [2.2, 2.4, 9.6], [0, -0.3, 0]);
  for (let j = 0; j < 5; j++) k.box('cool', [0.06, 0.3, 0.6], [1.38 + j * 0.25, 2.4, 7.6 + j * 1.0]);
  // two white fuel capsules with navy bands
  for (const [tx, tz] of PORT_TANKS.slice(2)) {
    k.cyl('hull', 1.6, 1.6, 5, [tx, 1.8, tz], 'x', 18);
    for (const e of [-1, 1]) k.add('hull', new SphereGeometry(1.6, 16, 8, 0, TAU, 0, Math.PI / 2).rotateZ(-e * Math.PI / 2), [tx + e * 2.5, 1.8, tz]);
    for (const e of [-1.6, 1.6]) { k.ring('accent', 1.63, 0.16, [tx + e, 1.8, tz], 'x', 18); k.box('trim', [0.5, 1.6, 2.8], [tx + e, 0.1, tz]); }
    k.cyl('trim', 0.2, 0.2, 8, [tx / 2, -0.2, tz / 2], 'x', 6);
  }
  arms(k, -7.5);
  // the checkpoint over the approach: an arch the ship flies under, a teal scan strip, amber at the leg tops
  const [axp, az0, az1] = KELLERN_ARCH;
  for (const z of [az0, az1]) {
    k.box('trim', [2.4, 0.6, 2.4], [axp, -0.6, z]);
    k.box('hull', [1.6, 11, 1.6], [axp, 4.6, z]);
    k.box('accent', [1.66, 0.6, 1.66], [axp, 1.4, z]);
    k.box('accent', [1.66, 0.6, 1.66], [axp, 2.6, z]);
    k.box('amber', [0.36, 0.36, 0.36], [axp - 0.9, 9.6, z]);
  }
  const amid = (az0 + az1) / 2, alen = az1 - az0 + 1.6;
  k.box('hull', [1.8, 1.6, alen], [axp, 10.4, amid]);
  k.box('accent', [1.86, 0.5, alen - 0.4], [axp, 10.6, amid]);
  k.box('edge', [0.12, 0.16, alen - 3], [axp - 0.95, 9.55, amid]);
  for (let i = 0; i < 6; i++) k.box('trim', [0.6, 0.6, 0.5], [axp - 1.0, 9.9, az0 + 2 + i * ((alen - 4) / 5)]);
  pools(g, L.strip, [[0, 8.05, 0, 4.5], [axp, -0.4, amid, 5.5], [-12, 0.3, BERTH.z, 5.5], [ox, 4.2, oz, 4]], 0.18);
  strobes(g, a.strobe, [[3.4, 14.9, -3.4], [axp, 11.4, az0], [axp, 11.4, az1], [ox + 4.4, 4.3, oz + 3.8]]);
  // a beacon that turns on the landing deck's rim
  const bk = new Kit();
  bk.box('trim', [0.4, 1.1, 0.4], [0, 0.55, 0]);
  bk.box('edge', [1.6, 0.2, 0.2], [0, 1.2, 0]);
  const beacon = bk.build(matsOf('kellern'));
  beacon.position.set(-4.6, 8, -2.2);
  g.add(beacon);
  a.spin.push({ o: beacon, w: 1.6 });
  return [-3.5, 12.2, 3.6];
}

// ── the Gutter: a port in a gutted freighter under a salvage crane ────────

function gutter(k: Kit, g: Group, rnd: () => number, L: Livery, a: StationAnim): V3 {
  const patch = (): string => `p${Math.floor(rnd() * PATCH.length)}`;
  // the hub: a patched drum, plates of every colour bolted over it, scaffold round it and a string of sodium lamps
  k.cyl('hull', 6.0, 6.6, 3.6, [0, 0.4, 0], 'y', 10);
  k.cyl('trim', 7.0, 7.4, 0.6, [0, -1.4, 0], 'y', 10);
  k.cyl('deck', 5.7, 6.0, 0.3, [0, 2.35, 0], 'y', 10);
  for (let i = 0; i < 18; i++) {
    const an = rnd() * TAU, y = -0.8 + rnd() * 2.8;
    k.box(patch(), [0.12, 0.6 + rnd() * 1.2, 1 + rnd() * 2], [Math.cos(an) * 6.45, y, Math.sin(an) * 6.45], [0, -an, (rnd() - 0.5) * 0.2]);
  }
  for (let i = 0; i < 10; i++) { const an = ((i + 0.5) / 10) * TAU; for (const y of [-0.3, 0.6, 1.5]) if (rnd() > 0.35) k.box('win', [0.08, 0.24, 0.42], [Math.cos(an) * 6.62, y, Math.sin(an) * 6.62], [0, -an, 0]); }
  for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; strut(k, 'trim', [Math.cos(an) * 7.2, -1, Math.sin(an) * 7.2], [Math.cos(an) * 7.2, 4.4, Math.sin(an) * 7.2], 0.07, 4); }
  for (let i = 0; i < 8; i++) { const a0 = (i / 8) * TAU, a1 = ((i + 1) / 8) * TAU; strut(k, 'trim', [Math.cos(a0) * 7.2, 4.4, Math.sin(a0) * 7.2], [Math.cos(a1) * 7.2, 4.4, Math.sin(a1) * 7.2], 0.06, 4); }
  for (let i = 0; i < 16; i++) { const an = (i / 16) * TAU; k.box('edge', [0.18, 0.18, 0.18], [Math.cos(an) * 7.25, 4.1 - 0.25 * Math.abs(Math.sin(an * 4)), Math.sin(an) * 7.25]); }
  k.greebles('trim', rnd, -4, 4, -4, 4, 2.4, 16, 1.0);
  // shacks and containers stacked on the roof, every one a different colour
  for (let i = 0; i < 7; i++) crate(k, patch(), -3 + (i % 3) * 2.2, 3.1 + Math.floor(i / 3) * 1.0, -2.5 + Math.floor(i / 3) * 1.8, (rnd() - 0.5) * 0.6, 2.0, 1.0, 1.3);
  // the salvage crane: a tall lattice tower and a long boom that swings over the scrap, a hook block hanging off it
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) strut(k, 'accent', [2 + x * 1.1, 2.4, 2 + z * 1.1], [2 + x * 0.6, 14, 2 + z * 0.6], 0.14, 4);
  for (let i = 0; i < 6; i++) { const y = 3.5 + i * 1.8, w = 1.1 - i * 0.08; k.box('trim', [w * 2.2, 0.12, w * 2.2], [2, y, 2]); }
  const ck = new Kit();
  truss(ck, [-4, 0, 0], [16, 0.6, 0], 1.0, 12, 3);
  ck.box('trim', [3, 1.6, 2], [-4.6, -0.2, 0]);
  ck.box('accent', [2.6, 1.0, 2.4], [0, 1.2, 0]);
  ck.box('win', [0.06, 0.3, 1.2], [1.32, 1.3, 0]);
  for (const d of [-0.3, 0.3]) strut(ck, 'trim', [14, 0.2, d], [14, -7.5, d], 0.04, 3);
  ck.box('accent', [1.4, 0.8, 1.4], [14, -7.9, 0]);
  ck.box('edge', [0.2, 0.2, 0.2], [16, 1.0, 0]);
  const crane = ck.build(matsOf('gutter'));
  crane.position.set(2, 14.6, 2);
  g.add(crane);
  a.spin.push({ o: crane, w: 0.08 });
  // the hulk: a long freighter broken open along the middle, ribs showing, patched, a bridge still lit at the stern
  const hk = new Kit(), hr = seeded(53);
  hk.loft('hull', [[-14, 2.4, 2.6, 2.6, 0.5], [-12, 3.4, 3.2, 3.2, 0.45], [-3, 3.6, 3.4, 3.4, 0.45]]);
  hk.loft('hull', [[3, 3.6, 3.4, 3.4, 0.45], [11, 3.4, 3.2, 3.2, 0.45], [14, 2.0, 2.4, 2.6, 0.6]]);
  for (let x = -3; x <= 3; x += 1.5) hk.ring('trim', 3.3, 0.16, [x, 0, 0], 'x', 12);
  for (let x = -2.5; x <= 2.5; x += 1.2) hk.box('trim', [0.18, 0.2, 6.8], [x, -3.0, 0]);
  hk.box('deck', [6.2, 0.2, 5.6], [0, -2.4, 0]);
  for (let i = 0; i < 4; i++) crate(hk, `p${i % PATCH.length}`, -1.8 + i * 1.2, -1.8, (i % 2 ? 1 : -1) * 1.2, 0.2 * i, 1.4, 0.9, 1.0);
  for (let i = 0; i < 12; i++) { const x = (hr() < 0.5 ? -1 : 1) * (4 + hr() * 9); hk.box(`p${Math.floor(hr() * PATCH.length)}`, [1.4 + hr() * 2.2, 0.1, 1 + hr() * 2], [x, 3.42, (hr() - 0.5) * 3]); }
  hk.box('accent', [4, 0.06, 2.8], [8, 3.44, 0]);
  for (let j = 0; j < 10; j++) for (const s of [-1, 1]) if (hr() > 0.3) hk.box('win', [0.42, 0.22, 0.08], [-11 + j * 2.2 + (j > 4 ? 6 : 0) * 0, 0.6, s * 3.62]);
  hk.box('hull', [3.2, 3.2, 4.2], [-11, 4.8, 0]);
  hk.box('glass', [0.1, 0.9, 3.6], [-9.35, 5.4, 0]);
  hk.box('cool', [0.06, 0.4, 3.0], [-9.3, 5.4, 0]);
  hk.box('trim', [3.4, 0.3, 4.4], [-11, 6.5, 0]);
  strut(hk, 'trim', [-11, 6.6, 0], [-11, 10, 0], 0.08, 4);
  hk.greebles('trim', hr, -12, 12, -2, 2, 3.4, 18, 0.8);
  const hulk = hk.build(matsOf('gutter'), 0.6);
  hulk.position.set(16, 0, -6);
  hulk.rotation.y = -Math.PI / 4;
  g.add(hulk);
  // a rusted ball tank, scrap piles on the berth side, strings of lamps hull to hub
  tank(k, PORT_TANKS[1]![0], PORT_TANKS[1]![1], 2.0, 1);
  for (let i = 0; i < 9; i++) k.box(patch(), [1 + rnd() * 2.4, 0.3 + rnd() * 0.6, 1 + rnd() * 2], [-6 + rnd() * 5, -0.4 + rnd() * 0.4, -6 - rnd() * 5], [rnd() * 0.4, rnd() * 3, rnd() * 0.4]);
  cable(k, [4.6, 4.2, -4.6], [10.6, 3.6, -9.6], 1.2, 0.05, 6);
  cable(k, [5.8, 4.0, -2.0], [15, 3.6, -2.0], 1.4, 0.05, 6);
  for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; k.box('win', [0.2, 0.2, 0.2], [4.6 + 6 * t, 4.2 - 0.6 * t - 1.2 * 4 * t * (1 - t), -4.6 - 5 * t]); k.box('win', [0.2, 0.2, 0.2], [5.8 + 9.2 * t, 4.0 - 0.4 * t - 1.4 * 4 * t * (1 - t), -2.0]); }
  arms(k, -6.5);
  pools(g, L.strip, [[0, 2.6, 0, 4.5], [-11, 0.3, BERTH.z, 5], [16, 3.6, -6, 6], [-3.5, 0.1, -8.5, 3.5]], 0.26);
  strobes(g, a.strobe, [[2, 15.2, 2], [16 - 11 * Math.SQRT1_2, 10.1, -6 - 11 * Math.SQRT1_2]]);
  return [-4, 8.6, -2.5];
}

// ── a Holdfast: a hub dug into a rock, greenhouses on top, flak on the ridge ──

function holdfast(k: Kit, g: Group, rnd: () => number, L: Livery, a: StationAnim): V3 {
  const [rx, rz, rr] = HOLDFAST_ROCK;
  k.add('stone', lump(rr, 11, [1.15, 0.62, 1]), [rx, -1.8, rz]);
  k.add('stone', lump(6.2, 12, [1, 0.7, 1]), [-4, -1.6, -12]);
  k.add('stone', lump(3, 13), [rx + 9, -1.2, rz - 7]);
  // the hub: a squat drum in olive with a band of warm windows, and a glass roof garden on it
  k.cyl('hull', 6.4, 7.0, 3.2, [0, 0.4, 0], 'y', 14);
  k.cyl('accent', 6.46, 6.46, 0.5, [0, 1.6, 0], 'y', 14);
  polyWindows(k, rnd, 'win', 14, 6.6, 0.3, 3, [0.36, 0.26], 0.2);
  polyWindows(k, rnd, 'win', 14, 6.6, 0.95, 3, [0.36, 0.26], 0.3);
  k.cyl('deck', 6.2, 6.4, 0.3, [0, 2.15, 0], 'y', 14);
  // habitat blocks cut into the rock face, lit, in rows; a dug road of lamps up the slope
  for (let i = 0; i < 9; i++) {
    const an = -1.9 + i * 0.32, bx = rx + Math.cos(an) * (rr * 0.92), bz = rz + Math.sin(an) * (rr * 0.82), h = 1.6 + (i % 3) * 0.8;
    k.box('hull', [2.6, h, 2.2], [bx, -0.6 + h / 2, bz], [0, -an, 0]);
    k.box('accent', [2.64, 0.2, 2.24], [bx, -0.6 + h, bz], [0, -an, 0]);
    for (let r = 0; r < Math.floor(h / 0.7); r++) for (const t of [-0.7, 0, 0.7]) if (rnd() > 0.25) k.box('win', [0.08, 0.22, 0.38], [bx + Math.cos(an) * 1.32 - Math.sin(an) * t, -0.2 + r * 0.7, bz + Math.sin(an) * 1.32 + Math.cos(an) * t], [0, -an, 0]);
  }
  for (let i = 0; i < 10; i++) { const t = i / 9; k.box('edge', [0.2, 0.12, 0.2], [2 + t * (rx - 4), 2.3 + t * 3.0, 5 + t * (rz - 6)]); }
  // greenhouses: glass domes on the rock's crown and the hub roof, a dim green inside, ribbed frames
  for (const [x, y, z, r] of [[rx - 1, 4.0, rz + 1, 3.2], [rx + 4, 3.0, rz - 4, 2.2], [rx - 5, 2.6, rz + 5, 2.0], [0, 2.3, 0, 3.6]] as const) {
    k.add('green', new SphereGeometry(r, 18, 9, 0, TAU, 0, Math.PI / 2), [x, y, z]);
    for (let j = 0; j < 6; j++) k.add('trim', new SphereGeometry(r * 1.01, 18, 9, (j / 6) * TAU, 0.06, 0, Math.PI / 2), [x, y, z]);
    k.ring('trim', r * 1.01, 0.1, [x, y + 0.05, z], 'y', 24);
  }
  // flak turrets on the ridge and at the berth: a ring base, a turret that turns, twin barrels
  for (const [x, y, z, w] of [[rx + 6, 3.4, rz + 3, 0.5], [-4, 2.8, -12, -0.4], [-9, 0.6, -2, 0.7], [rx - 7, 3.0, rz - 4, -0.6]] as const) {
    k.cyl('trim', 1.3, 1.6, 0.8, [x, y, z], 'y', 10);
    const tk = new Kit();
    tk.cyl('accent', 0.9, 1.1, 0.9, [0, 0.45, 0], 'y', 10);
    tk.box('accent', [1.6, 0.7, 1.2], [0.3, 1.0, 0]);
    for (const d of [-0.3, 0.3]) tk.cyl('trim', 0.12, 0.12, 2.8, [1.8, 1.15, d], 'x', 6);
    tk.box('edge', [0.14, 0.14, 0.14], [-0.5, 1.4, 0]);
    const tur = tk.build(matsOf('holdfast'));
    tur.position.set(x, y + 0.4, z);
    tur.rotation.y = w * 3;
    g.add(tur);
    a.spin.push({ o: tur, w: w * 0.4 });
  }
  // a drill rig sunk into the small rock, its lamp
  k.box('trim', [0.5, 8, 0.5], [-4, 2.4, -12]);
  truss(k, [-4, 6.2, -12], [-1, 6.6, -12], 0.6, 4);
  k.box('lamp', [0.4, 0.4, 0.4], [-4, 6.6, -12]);
  arms(k, -7);
  pools(g, L.win, [[0, 2.35, 0, 4.5], [-11, 0.3, BERTH.z, 5], [rx, 4.2, rz, 7]], 0.16);
  pools(g, L.strip, [[rx - 1, 4.05, rz + 1, 3.6]], 0.2);
  strobes(g, a.strobe, [[-4, 6.9, -12], [rx + 6, 5.4, rz + 3]]);
  return [-3.6, 7.4, 3.2];
}

// ── the Dust Traders: a raft of tents strung with lanterns ────────────────

function guild(k: Kit, g: Group, rnd: () => number, L: Livery, a: StationAnim): V3 {
  // the raft: a wide round deck of planks, a rim of bollards, a hall in the middle under a tent roof
  k.cyl('trim', 17.2, 17.6, 0.5, [0, -1.7, 0], 'y', 36);
  k.cyl('deck', 16.8, 16.8, 0.12, [0, -1.4, 0], 'y', 36);
  for (let i = 0; i < 22; i++) { const z = -16 + i * 1.52, w = 2 * Math.sqrt(Math.max(0, 16.6 * 16.6 - z * z)); if (i % 2) k.box('trim', [w, 0.04, 0.08], [0, -1.33, z]); }
  for (let i = 0; i < 24; i++) { const an = (i / 24) * TAU; k.cyl('trim', 0.25, 0.3, 0.7, [Math.cos(an) * 16.9, -1.0, Math.sin(an) * 16.9], 'y', 6); }
  k.cyl('hull', 5.4, 6.0, 3.0, [0, 0.1, 0], 'y', 12);
  polyWindows(k, rnd, 'win', 12, 5.6, 0.2, 2, [0.5, 0.5], 0.15);
  k.cyl('c0', 0.4, 7.2, 3.6, [0, 3.4, 0], 'y', 12);
  for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; strut(k, 'trim', [Math.cos(an) * 7.1, 1.65, Math.sin(an) * 7.1], [Math.cos(an) * 0.4, 5.2, Math.sin(an) * 0.4], 0.06, 4); }
  // the mast: pennants down its stays
  k.box('trim', [0.4, 12, 0.4], [0, 8, 0]);
  k.box('lamp', [0.5, 0.5, 0.5], [0, 14.2, 0]);
  for (let s = 0; s < 4; s++) {
    const an = (s / 4) * TAU + 0.4, end: V3 = [Math.cos(an) * 14, -0.8, Math.sin(an) * 14];
    strut(k, 'trim', [0, 13.6, 0], end, 0.04, 3);
    for (let j = 1; j < 8; j++) { const t = j / 8; k.box(`c${(j + s) % CLOTH.length}`, [0.06, 0.7, 0.5], [end[0] * t, 13.6 + (end[1] - 13.6) * t - 0.4, end[2] * t], [0, -an, 0]); }
  }
  // the stalls: tents in the traders' colours, poles at the corners, a lantern under each
  GUILD_TENTS.forEach(([x, z, r], i) => {
    const an = Math.atan2(z, x);
    k.box('deck', [r * 1.9, 0.2, r * 1.9], [x, -1.2, z], [0, -an, 0]);
    k.cyl(`c${(i + 1) % CLOTH.length}`, 0.15, r * 1.25, 1.8, [x, 2.2, z], 'y', 4);
    for (let c = 0; c < 4; c++) { const ca = (c / 4) * TAU + Math.PI / 4 - an; strut(k, 'trim', [x + Math.cos(ca) * r * 0.85, -1.2, z + Math.sin(ca) * r * 0.85], [x + Math.cos(ca) * r * 0.85, 1.4, z + Math.sin(ca) * r * 0.85], 0.06, 4); }
    k.box('lamp', [0.26, 0.26, 0.26], [x, 1.0, z]);
    for (let c = 0; c < 3; c++) crate(k, ['c3', 'p2', 'hull'][c]!, x - 0.8 + c * 0.8, -0.8, z + (c % 2 ? 0.6 : -0.6), an, 0.7, 0.6, 0.6);
  });
  // lanterns strung from the hall roof to every tent
  for (const [x, z] of GUILD_TENTS) {
    const top: V3 = [x * 0.38, 4.4, z * 0.38], end: V3 = [x, 3.0, z];
    cable(k, top, end, 0.8, 0.03, 6);
    for (let j = 1; j < 6; j++) { const t = j / 6; k.box('win', [0.22, 0.26, 0.22], [top[0] + (end[0] - top[0]) * t, top[1] + (end[1] - top[1]) * t - 0.8 * 4 * t * (1 - t) - 0.2, top[2] + (end[2] - top[2]) * t]); }
  }
  // two traders' skiffs moored off the deck, each its own colour
  GUILD_SKIFFS.forEach(([x, z], i) => {
    const sk = new Kit();
    sk.loft(`c${i === 0 ? 2 : 1}`, [[-4, 0.8, 0.8, 0.8, 0.5], [-2.6, 1.4, 1.2, 1.0, 0.5], [2, 1.3, 1.0, 1.0, 0.5], [4.2, 0.4, 0.4, 0.6, 0.7]]);
    sk.box('trim', [2.2, 0.8, 1.6], [-1.6, 1.4, 0]);
    sk.box('glass', [0.1, 0.5, 1.2], [-0.48, 1.5, 0]);
    sk.box('win', [0.06, 0.2, 0.8], [-0.44, 1.5, 0]);
    sk.box('edge', [0.24, 0.24, 0.24], [-4.2, 0.2, 0]);
    const s = sk.build(matsOf('guild'));
    s.position.set(x, -0.2, z);
    s.rotation.y = Math.atan2(-z, x) + Math.PI / 2;
    g.add(s);
    cable(k, [x * 0.86, -1.0, z * 0.86], [x * 0.95, -0.2, z * 0.95], 0.2, 0.04, 3);
  });
  arms(k, -6);
  pools(g, L.win, [...GUILD_TENTS.map(([x, z]): [number, number, number, number] => [x, -1.25, z, 4]), [0, -1.25, 0, 9], [-11, 0.3, BERTH.z, 5]], 0.2);
  strobes(g, a.strobe, [[0, 14.8, 0]]);
  return [-6.2, 8.4, -1.4];
}

const BODY: Record<PortStyle, (k: Kit, g: Group, rnd: () => number, L: Livery, a: StationAnim) => V3> = { frontier, kellern, gutter, holdfast, guild };

/** Where the work craft fly: radius, height over the deck, turns per second (signed), start angle. Clear of the docking arms' height. */
const CRAFT: Array<[number, number, number, number]> = [[17, 7.5, 0.045, 0.4], [21, 10.5, -0.032, 2.6]];

/**
 * A work skiff: a stubby hull in the depot's paint, a lit nose and a tail strobe (the depot's own, so it blinks with the
 * masts). Two materials, so two draws per craft.
 */
function skiff(m: Record<string, Material>, strobe: MeshBasicMaterial): Group {
  const k = new Kit();
  k.box('hull', [1.5, 0.45, 0.8], [0, 0, 0]);
  k.box('hull', [0.6, 0.3, 0.6], [-0.2, 0.34, 0]);
  for (const z of [-0.55, 0.55]) k.box('hull', [0.9, 0.22, 0.3], [-0.35, -0.08, z]);
  k.box('lamp', [0.12, 0.12, 0.5], [0.78, 0, 0]);
  const g = k.build({ hull: m.hull!, lamp: m.lamp! });
  const tail = new Mesh(strobeGeo, strobe);
  tail.scale.setScalar(0.5);
  tail.position.set(-0.8, 0.3, 0);
  g.add(tail);
  g.scale.setScalar(1.4);
  return g;
}

/** A faint warm haze round a lit depot: the lamps' light in the vented gas and dust, so the station sits in its own glow. */
function haze(g: Group, color: Color): void {
  if (typeof document === 'undefined') return;
  const s = new Sprite(new SpriteMaterial({ map: poolTexture(), color: color.clone().multiplyScalar(0.07), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(44);
  s.position.set(0, 2, 0);
  s.renderOrder = 1;
  g.add(s);
}

/**
 * A holder's depot, named on its board. `own` is the caller's lamp and window material (tinted by the port's mood); the animated
 * parts ride in `userData.anim` (StationAnim). Stands at the origin with its berth at local (-17, 6).
 */
export function buildStation(style: PortStyle, name: string, own?: { lamp: Material; win: Material }): Group {
  const L = LIVERY[style], g = new Group(), k = new Kit(), rnd = seeded(9 + style.length * 13);
  const anim: StationAnim = { spin: [], strobe: new MeshBasicMaterial({ color: new Color(2.4, 2.4, 2.4), toneMapped: false, fog: false }), neon: null, neonBase: new Color(), craft: [] };
  const signAt = BODY[style](k, g, rnd, L, anim);
  const m = matsOf(style), lamp = own?.lamp ?? m.lamp!;
  g.add(k.build({ ...m, lamp, win: own?.win ?? windowMaterial() }, 0.6));
  for (const [r, h, w, ph] of CRAFT) {
    const o = skiff({ ...m, lamp }, anim.strobe);
    g.add(o);
    anim.craft.push({ o, r, h, w: w * TAU, ph });
  }
  if ('color' in lamp) haze(g, (lamp as MeshBasicMaterial).color);
  // the board faces the berth and leans back, so the ship coming in reads it from above
  const board = nameBoard(name, L, style === 'kellern' ? 8 : 9);
  board.g.position.set(...signAt);
  board.g.rotation.set(0, -Math.PI / 2, 0);
  board.g.rotateX(-0.55);
  g.add(board.g);
  if (style === 'gutter') { anim.neon = board.mat; anim.neonBase.copy(board.mat.color); }
  g.userData.anim = anim;
  return g;
}

/** Turn, blink and stutter a depot's moving parts: `time` is seconds. */
export function animateStation(g: Group, time: number, dt: number): void {
  const a = g.userData.anim as StationAnim | undefined;
  if (!a) return;
  for (const s of a.spin) s.o.rotation.y += s.w * dt;
  for (const c of a.craft) {
    // a slow ellipse round the depot, rising and settling a little, nose along the path and banked into the turn
    const an = c.ph + c.w * time, ca = Math.cos(an), sa = Math.sin(an);
    c.o.position.set(ca * c.r, c.h + Math.sin(an * 2 + c.ph) * 1.2, sa * c.r * 0.8);
    const tx = -sa * Math.sign(c.w), tz = ca * 0.8 * Math.sign(c.w);
    c.o.rotation.set(0, Math.atan2(-tz, tx), 0);
    c.o.rotateX(-0.18 * Math.sign(c.w));
  }
  const ph = time % 1.6;
  a.strobe.color.setScalar(ph < 0.07 || (ph > 0.22 && ph < 0.27) ? 2.4 : 0.06);
  if (a.neon) {
    // a neon that has seen hard use: steady, then a short stutter every few seconds
    const t = time % 5.3, out = (t > 4.6 && t < 4.68) || (t > 4.8 && t < 4.86);
    a.neon.color.copy(a.neonBase).multiplyScalar(out ? 0.25 : 1);
  }
}
