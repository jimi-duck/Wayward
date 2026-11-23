import { AdditiveBlending, BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, RingGeometry, DoubleSide, type Material, type Scene } from 'three';
import type { World } from '../sim/world';
import type { PlaceLook } from '../sim/places';
import { windowMaterial, windowRow } from './breakout';
import { block, bracket, frameRing, hatch, lamp, oct, octFaces, panel, pipeRun, vent, type Face } from './parts';
import type { Effects } from './fx';
import { Kit, metal, seeded } from './kit';
import { crystalMaterial } from './enemies';

// ── the story's places ────────────────────────────────────────────────────
// What she can see where a beat happens (sim/places.ts): a small hull to hold
// alongside, a broken one to read, a canister to take aboard, a buoy. Each
// stands in a teal ring on the plane (teal is information, brand v1.1) that
// fills as she holds; a pickup has a slow beacon instead and comes aboard with
// a flash. One place shows at a time; each look is built once, on first use.

const TEAL = new Color(0.25, 1.1, 1.25);
/** The rings' width (units), and their radius round each look. */
const RING_W = 0.14;
const SNUG: Record<PlaceLook, number> = { skiff: 6.5, ferry: 11, wreck: 9, canister: 2.4, buoy: 3.6, moot: 15, relay: 13, picket: 10, chorus: 11, spiral: 12 };
const BEACON = new Color(0.4, 1.6, 1.8);

let placeMats: Record<string, Material> | null = null;
function mats(): Record<string, Material> {
  if (placeMats) return placeMats;
  // private hulls, not a faction's: a worn off-white coat over dark worked steel, a muted slate band, warm cabin light
  const used = { worn: 0.75 };
  placeMats = {
    paint: metal({ tint: 0xa9a496, roughness: 0.62, metalness: 0.18, scale: 1.1, painted: true, ...used }),
    band: metal({ tint: 0x46565c, roughness: 0.6, metalness: 0.25, scale: 1.1, painted: true, ...used }),
    primer: metal({ tint: 0x7c7f74, roughness: 0.7, metalness: 0.2, scale: 1.2, painted: true, ...used }),
    hull: metal({ tint: 0x5c6169, roughness: 0.55, metalness: 0.5, scale: 1.6, ...used }),
    dark: metal({ tint: 0x3a3d43, roughness: 0.58, metalness: 0.4, scale: 1.8, ...used }),
    pipe: metal({ tint: 0x484b52, roughness: 0.45, metalness: 0.55, scale: 2.2 }),
    burnt: metal({ tint: 0x3b3632, roughness: 0.85, metalness: 0.3, scale: 1.4, worn: 1 }),
    rubber: new MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 }),
    window: new MeshStandardMaterial({ color: 0x0b1416, roughness: 0.12, metalness: 0.9, emissive: new Color(0.03, 0.1, 0.12) }),
    win: windowMaterial(),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.4, 1.5), toneMapped: false }),
    nav: new MeshBasicMaterial({ color: new Color(1.7, 1.8, 1.9), toneMapped: false }),
    orange: new MeshBasicMaterial({ color: new Color(1.5, 0.55, 0.08), toneMapped: false }),
    drive: new MeshBasicMaterial({ color: new Color(0.35, 0.8, 1.4), toneMapped: false }),
  };
  return placeMats;
}

/** Plates down a body's faces with a hairline gap between them, one of them in the band colour, and bolts along their edges. */
function plating(k: Kit, rnd: () => number, faces: Face[], which: number[], x0: number, x1: number, n: number, band = -1): void {
  const step = (x1 - x0) / n;
  for (const fi of which) {
    const f = faces[fi]!;
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * step, key = i === band ? 'band' : rnd() < 0.12 ? 'primer' : 'paint';
      panel(k, key, f, 0, 0, x, 0, step * 0.94, f.wid * 0.9, 0.025, 0.004, 0.012);
    }
  }
}

/** A drive: housing, flared bell, a dim idle glow in the throat. `x` is the mouth. */
function drive(k: Kit, x: number, y: number, z: number, r: number): void {
  k.cyl('hull', r * 1.05, r * 0.9, r * 1.6, [x + r * 1.3, y, z], 'x', 16);
  k.cyl('dark', r * 0.9, r * 1.25, r * 0.9, [x + r * 0.2, y, z], 'x', 16, true);
  k.ring('pipe', r * 1.08, r * 0.08, [x + r * 0.75, y, z], 'x', 18);
  k.cyl('drive', r * 0.72, r * 0.72, 0.01, [x + r * 0.55, y, z], 'x', 14);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.box('dark', [r * 1.1, r * 0.1, r * 0.06], [x + r * 1.4, y + Math.sin(a) * r * 1.02, z + Math.cos(a) * r * 1.02], [a, 0, 0]);
  }
}

/** A docking collar on the port side (-Z), where she comes alongside. */
function collar(k: Kit, x: number, y: number, z: number, r: number): void {
  k.cyl('dark', r, r, 0.08, [x, y, z - 0.04], 'z', 18);
  k.ring('pipe', r, r * 0.14, [x, y, z - 0.09], 'z', 20);
  k.cyl('rubber', r * 0.72, r * 0.72, 0.02, [x, y, z - 0.1], 'z', 16);
  for (const sy of [-1, 1]) lamp(k, 'orange', [x, y + sy * r * 1.25, z - 0.02], 0.025);
}

/** A small private hull: a plated cabin on an octagonal body, a glazed nose, one drive, side tanks, a dish. About the ship's size. */
function skiff(): Group {
  const k = new Kit(), rnd = seeded(7);
  const W = 0.9, H = 0.74, f = octFaces(W, H);
  oct(k, 'dark', -1.1, 0.9, W - 0.04, H - 0.04, 0, 0);
  plating(k, rnd, f, [0, 1, 2, 6, 7], -1.05, 0.85, 5, 2);
  oct(k, 'paint', 0.9, 1.55, W - 0.04, H - 0.04, 0, 0, 0.42);
  // the glazed nose: a canopy on the slope and two cheek windows
  k.box('window', [0.42, 0.03, 0.3], [1.16, 0.29, 0], [0, 0, -0.33]);
  for (const sd of [-1, 1]) k.box('window', [0.28, 0.12, 0.02], [1.12, 0.1, sd * 0.37], [0, -sd * 0.42, 0]);
  frameRing(k, 0.9, 0.08, W, H, 0, 0);
  frameRing(k, -1.08, 0.1, W, H, 0, 0);
  // the cabin's ports, both sides, some dark
  windowRow(k, rnd, [-0.75, 0.08, 0.47], [0.55, 0.08, 0.47], 7, [0.07, 0.055, 0.02], [0, 0, 0], 0.25);
  windowRow(k, rnd, [-0.75, 0.08, -0.47], [0.55, 0.08, -0.47], 7, [0.07, 0.055, 0.02], [0, 0, 0], 0.25);
  collar(k, 0.15, -0.02, -0.46, 0.16);
  hatch(k, 'paint', f[0]!, 0, 0, 0.45, 0, 0.26, 0.22, 0.03);
  vent(k, f[1]!, 0, 0, -0.75, 0, 0.3, f[1]!.wid * 0.6, 0.03);
  vent(k, f[7]!, 0, 0, -0.75, 0, 0.3, f[7]!.wid * 0.6, 0.03);
  pipeRun(k, -1.0, 0.7, 0.4, 0.17, 0.018, 0.3);
  // the drive section: a dark block, the bell, a fin with a beacon, RCS quads at the corners
  oct(k, 'hull', -1.55, -1.1, 0.78, 0.64, 0, 0);
  drive(k, -1.95, 0, 0, 0.24);
  block(k, 'band', [0.55, 0.32, 0.035], [-0.95, 0.52, 0], [0, 0, 0.18]);
  lamp(k, 'orange', [-0.82, 0.69, 0], 0.03);
  for (const sz of [-1, 1]) for (const x of [-1.3, 0.75]) {
    k.box('dark', [0.08, 0.08, 0.08], [x, 0.24, sz * 0.47]);
    k.box('pipe', [0.03, 0.03, 0.06], [x, 0.24, sz * 0.53]);
  }
  // tanks slung under each flank, banded
  for (const sz of [-1, 1]) {
    k.cyl('pipe', 0.11, 0.11, 0.85, [-0.4, -0.3, sz * 0.4], 'x', 14);
    for (const x of [-0.7, -0.1]) k.ring('dark', 0.115, 0.018, [x, -0.3, sz * 0.4], 'x', 14);
    bracket(k, 'hull', [-0.4, -0.22, sz * 0.32], [0.18, 0.05, 0.06]);
  }
  // skids under the belly, a mast and dish on the back
  for (const sz of [-1, 1]) k.box('dark', [1.3, 0.04, 0.05], [-0.2, -0.4, sz * 0.18]);
  k.cyl('pipe', 0.014, 0.014, 0.36, [-0.35, 0.55, -0.16], 'y', 6);
  k.cyl('hull', 0.13, 0.02, 0.05, [-0.35, 0.74, -0.16], 'y', 16);
  lamp(k, 'nav', [1.5, 0.08, 0], 0.025);
  for (const sz of [-1, 1]) lamp(k, 'nav', [0.85, 0.2, sz * 0.47], 0.02);
  return scaled(k.build(mats(), 0.06), 2.1);
}

/** A slow passenger hull: a long plated body, a raised deck, two rows of lit ports, two collars, a pair of drives. Twice the skiff. */
function ferry(): Group {
  const k = new Kit(), rnd = seeded(23);
  const W = 1.1, H = 1.0, f = octFaces(W, H);
  oct(k, 'dark', -2.2, 2.0, W - 0.04, H - 0.04, 0, 0);
  plating(k, rnd, f, [0, 1, 2, 3, 5, 6, 7], -2.15, 1.95, 9, 4);
  oct(k, 'paint', 2.0, 2.6, W - 0.04, H - 0.04, 0, 0, 0.55);
  k.box('window', [0.36, 0.03, 0.36], [2.22, 0.38, 0], [0, 0, -0.35]);
  // the upper deck: its own body, plated, glazed all round
  oct(k, 'dark', -1.5, 1.3, 0.78, 0.36, 0.56, 0);
  for (const x of [-1.2, -0.5, 0.2, 0.9]) block(k, 'paint', [0.62, 0.05, 0.6], [x, 0.76, 0], [0, 0, 0], 0.015);
  for (const sd of [-1, 1]) {
    windowRow(k, rnd, [-1.35, 0.58, sd * 0.4], [1.15, 0.58, sd * 0.4], 14, [0.08, 0.06, 0.02], [0, 0, 0], 0.18);
    windowRow(k, rnd, [-1.8, 0.1, sd * 0.57], [1.7, 0.1, sd * 0.57], 18, [0.09, 0.065, 0.02], [0, 0, 0], 0.22);
  }
  for (const x of [-1.9, -0.9, 0.1, 1.1, 1.98]) frameRing(k, x, 0.08, W, H, 0, 0, 1.06);
  collar(k, -0.4, -0.05, -0.56, 0.2);
  collar(k, 0.9, -0.05, -0.56, 0.2);
  for (const fi of [1, 7]) { vent(k, f[fi]!, 0, 0, -1.6, 0, 0.4, f[fi]!.wid * 0.5, 0.03); vent(k, f[fi]!, 0, 0, 0.6, 0, 0.3, f[fi]!.wid * 0.5, 0.03); }
  pipeRun(k, -2.0, 1.6, -0.36, 0.42, 0.022, 0.35);
  pipeRun(k, -2.0, 1.6, -0.36, -0.42, 0.022, 0.35);
  // the engine block and two drives
  oct(k, 'hull', -2.7, -2.2, 1.0, 0.86, 0, 0);
  for (const sz of [-1, 1]) drive(k, -3.15, 0, sz * 0.27, 0.22);
  // a mast with a lamp, an aerial farm, nav lights
  k.cyl('pipe', 0.02, 0.02, 0.7, [1.0, 1.1, 0], 'y', 6);
  lamp(k, 'orange', [1.0, 1.47, 0], 0.035);
  for (const x of [-0.9, -0.6]) k.cyl('pipe', 0.008, 0.008, 0.35, [x, 0.95, 0.15], 'y', 5);
  k.cyl('hull', 0.16, 0.025, 0.05, [-1.2, 0.92, -0.15], 'y', 16);
  lamp(k, 'nav', [2.58, 0.05, 0], 0.03);
  for (const sz of [-1, 1]) lamp(k, 'nav', [1.95, 0.35, sz * 0.56], 0.025);
  return scaled(k.build(mats(), 0.07), 2.3);
}

/** A broken hull, cold: the bow section whole, the stern knocked askew, ribs and stringers bare in the gap between, a dying lamp. */
function wreck(): Group {
  const k = new Kit(), rnd = seeded(19);
  const W = 1.0, H = 0.86, f = octFaces(W, H);
  // the bow, still in one piece but scorched
  oct(k, 'dark', 0.1, 1.7, W - 0.04, H - 0.04, 0, 0);
  for (const fi of [0, 1, 2, 6, 7]) {
    const fc = f[fi]!;
    for (let i = 0; i < 4; i++) if (rnd() < 0.8) panel(k, rnd() < 0.5 ? 'burnt' : 'paint', fc, 0, 0, 0.3 + i * 0.4, 0, 0.37, fc.wid * 0.9, 0.025, 0.004, 0.012);
  }
  oct(k, 'burnt', 1.7, 2.2, W - 0.04, H - 0.04, 0, 0, 0.45);
  frameRing(k, 0.12, 0.1, W, H, 0, 0);
  // the gap: ribs standing, some broken short, stringers along the top and the keel
  for (let i = 0; i < 6; i++) {
    const x = -0.15 - i * 0.2, faces = [0, 1, 2, 3, 4, 5, 6, 7].filter(() => rnd() < 0.7);
    for (const fi of faces) panel(k, 'hull', f[fi]!, 0, 0, x, 0, 0.045, f[fi]!.wid * (0.6 + rnd() * 0.4), 0.05, -0.05, 0.008);
  }
  k.box('dark', [1.3, 0.08, 0.14], [-0.7, -0.42, 0]);
  for (const sz of [-0.3, 0.3]) k.box('hull', [1.2 * (0.6 + rnd() * 0.4), 0.04, 0.04], [-0.65, 0.4, sz]);
  // the stern, knocked down and askew, its drive pod torn half away
  const g = new Kit();
  oct(g, 'dark', -2.6, -1.35, W - 0.04, H - 0.04, 0, 0);
  for (const fi of [0, 2, 6, 7, 1]) { const fc = f[fi]!; for (let i = 0; i < 3; i++) if (rnd() < 0.7) panel(g, rnd() < 0.6 ? 'burnt' : 'paint', fc, 0, 0, -2.4 + i * 0.4, 0, 0.36, fc.wid * 0.9, 0.025, 0.004, 0.012); }
  frameRing(g, -1.38, 0.1, W, H, 0, 0);
  drive(g, -3.0, 0.05, 0.22, 0.2);
  g.box('dark', [0.5, 0.18, 0.06], [-2.85, -0.1, -0.25], [0.5, 0.3, 0.6]);
  // plates peeled back off the bow's torn end, cable hanging
  for (let i = 0; i < 4; i++) k.box(i % 2 ? 'burnt' : 'paint', [0.28, 0.02, 0.22], [0.0 - rnd() * 0.15, 0.3 - i * 0.2, (i % 2 ? 1 : -1) * 0.5], [rnd() * 0.6, rnd(), 0.4 + rnd() * 0.6]);
  for (let i = 0; i < 5; i++) k.cyl('pipe', 0.008, 0.008, 0.25 + rnd() * 0.3, [-0.1 - rnd() * 0.9, -0.1 - rnd() * 0.2, (rnd() - 0.5) * 0.7], 'y', 4);
  windowRow(k, rnd, [0.4, 0.1, 0.52], [1.5, 0.1, 0.52], 6, [0.08, 0.06, 0.02], [0, 0, 0], 0.85);
  lamp(k, 'orange', [1.2, 0.47, -0.2], 0.03);
  const root = k.build(mats(), 0.07), stern = g.build(mats(), 0.07);
  stern.position.set(-0.25, -0.12, 0.18);
  stern.rotation.set(0.35, 0.22, -0.12);
  root.add(stern);
  return scaled(root, 2.3);
}

/** A sealed paper canister: a banded drum with bumpers and grab bars, a lamp, small enough to come aboard. */
function canister(): Group {
  const k = new Kit();
  k.cyl('paint', 0.3, 0.3, 0.8, [0, 0, 0], 'x', 20);
  k.cyl('band', 0.305, 0.305, 0.16, [0, 0, 0], 'x', 20);
  for (const x of [-0.42, 0.42]) { k.cyl('dark', 0.24, 0.3, 0.06, [x, 0, 0], 'x', 20); k.ring('rubber', 0.3, 0.035, [x * 0.93, 0, 0], 'x', 20); }
  for (const x of [-0.25, 0.25]) k.ring('dark', 0.305, 0.016, [x, 0, 0], 'x', 20);
  k.cyl('pipe', 0.09, 0.09, 0.06, [0.47, 0, 0], 'x', 12);
  for (const sz of [-1, 1]) k.box('pipe', [0.34, 0.03, 0.03], [0, 0.33, sz * 0.08]);
  lamp(k, 'orange', [0, 0.32, 0], 0.03);
  return scaled(k.build(mats(), 0.03), 1.6);
}

/** A marker buoy: a turned float with a band, a lattice mast, solar wings, a lamp at the top. */
function buoy(): Group {
  const k = new Kit();
  k.lathe('paint', [[0, -0.6], [0.22, -0.56], [0.4, -0.35], [0.44, -0.05], [0.44, 0.12], [0.3, 0.3], [0.12, 0.36], [0, 0.36]], [0, 0, 0], 24);
  k.ring('band', 0.445, 0.05, [0, 0.04, 0], 'y', 24);
  k.ring('rubber', 0.44, 0.03, [0, -0.2, 0], 'y', 24);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.pipeTo('pipe', [Math.cos(a) * 0.1, 0.34, Math.sin(a) * 0.1], [Math.cos(a) * 0.03, 1.5, Math.sin(a) * 0.03], 0.015); }
  for (const y of [0.7, 1.05]) k.ring('pipe', 0.075 - (y - 0.7) * 0.1, 0.01, [0, y, 0], 'y', 10);
  for (const sz of [-1, 1]) { k.box('dark', [0.04, 0.03, 0.3], [0, 0.85, sz * 0.2]); k.box('window', [0.26, 0.012, 0.3], [0, 0.86, sz * 0.36], [0, 0, 0.25]); }
  k.cyl('dark', 0.06, 0.07, 0.06, [0, 1.53, 0], 'y', 10);
  k.box('lamp', [0.08, 0.08, 0.08], [0, 1.6, 0]);
  k.cyl('pipe', 0.005, 0.005, 0.5, [0.05, 1.8, 0.02], 'y', 4);
  k.cyl('hull', 0.1, 0.1, 0.05, [0, -0.62, 0], 'y', 12);
  return scaled(k.build(mats(), 0.04), 2.6);
}

// ── set pieces: one of each, never repeated ───────────────────────────────
// The stops whose story had nowhere to stand (owner, 23 November 2026: "distinctive, unique and interesting to look at, rather
// than the same repeated elements"): each gets a thing of its own, built once, with something in it that moves.

/** A work tug, a little different each time: an octagonal plated body, a cab fore or aft, a push bumper, a drive. Built along +X. */
function tug(rnd: () => number, len: number): Group {
  const k = new Kit();
  const W = 0.5 + rnd() * 0.12, H = 0.42 + rnd() * 0.1, f = octFaces(W, H), x0 = -len / 2, x1 = len / 2;
  oct(k, 'dark', x0, x1 - 0.18, W - 0.03, H - 0.03, 0, 0);
  plating(k, rnd, f, [0, 1, 2, 6, 7], x0 + 0.03, x1 - 0.21, 3 + Math.floor(rnd() * 3), rnd() < 0.5 ? 1 : -1);
  oct(k, rnd() < 0.5 ? 'paint' : 'primer', x1 - 0.18, x1, W - 0.03, H - 0.03, 0, 0, 0.7);
  frameRing(k, x0 + 0.04, 0.06, W, H, 0, 0);
  frameRing(k, x1 - 0.18, 0.06, W, H, 0, 0);
  // the cab, fore or aft, glazed on three sides
  const cx = rnd() < 0.5 ? x1 - 0.42 : x0 + 0.38;
  oct(k, 'paint', cx - 0.16, cx + 0.16, W * 0.62, 0.22, H * 0.5 + 0.08, 0);
  k.box('window', [0.02, 0.06, W * 0.4], [cx + 0.165, H * 0.5 + 0.1, 0]);
  for (const sz of [-1, 1]) k.box('window', [0.2, 0.05, 0.015], [cx, H * 0.5 + 0.1, sz * W * 0.31]);
  lamp(k, 'lamp', [cx, H * 0.5 + 0.21, 0], 0.025);
  // a push bumper at the bow, a drive at the stern, a hose reel or a crane on the back
  k.box('rubber', [0.1, H * 0.75, W * 1.02], [x1 + 0.04, 0, 0]);
  drive(k, x0 - 0.06, 0, 0, 0.13);
  if (rnd() < 0.5) k.cyl('pipe', 0.09, 0.09, W * 0.6, [(x0 + cx) / 2, H * 0.5 + 0.06, 0], 'z', 12);
  else { k.cyl('pipe', 0.02, 0.02, 0.3, [(x0 + cx) / 2, H * 0.5 + 0.15, 0], 'y', 6); k.pipeTo('pipe', [(x0 + cx) / 2, H * 0.5 + 0.3, 0], [(x0 + cx) / 2 + 0.35, H * 0.5 + 0.18, 0.1], 0.012); }
  for (const sz of [-1, 1]) lamp(k, 'nav', [x1 - 0.1, 0.05, sz * W * 0.5], 0.018);
  return k.build(mats(), 0.05);
}

/** Puts a part built along +X at (x, z), facing `yaw` (0 is +X), into a group. */
function moor(into: Group, g: Group, x: number, z: number, yaw: number): void { g.position.set(x, 0, z); g.rotation.y = -yaw; into.add(g); }

/** Kessel Hold's moot: the meeting hall on its spindle, the rigs of every holding moored nose-in round it, lamps strung between. */
function moot(): Group {
  const k = new Kit(), rnd = seeded(41);
  // the hall: a squat turned drum, a gallery of lit ports all round, a crown of aerials
  k.lathe('dark', [[0, -0.7], [1.0, -0.62], [1.25, -0.2], [1.3, 0.25], [1.05, 0.55], [0.5, 0.7], [0, 0.72]], [0, 0, 0], 40);
  k.ring('band', 1.31, 0.05, [0, 0.05, 0], 'y', 40);
  // ribs down the hall's shoulders, and a docking deck round its waist
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.box('hull', [0.05, 0.9, 0.06], [Math.cos(a) * 1.18, 0.05, Math.sin(a) * 1.18], [0, -a, Math.cos(1) * 0.3]); }
  k.cyl('hull', 1.55, 1.55, 0.06, [0, -0.15, 0], 'y', 40);
  k.ring('pipe', 1.55, 0.03, [0, -0.11, 0], 'y', 40);
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; if (rnd() < 0.8) k.box(rnd() < 0.85 ? 'win' : 'window', [0.1, 0.07, 0.03], [Math.cos(a) * 1.3, 0.22, Math.sin(a) * 1.3], [0, -a + Math.PI / 2, 0]); }
  k.cyl('pipe', 0.06, 0.08, 1.6, [0, -1.3, 0], 'y', 10);
  for (let i = 0; i < 5; i++) { const a = rnd() * Math.PI * 2, r = 0.2 + rnd() * 0.4; k.cyl('pipe', 0.01, 0.01, 0.4 + rnd() * 0.5, [Math.cos(a) * r, 0.95, Math.sin(a) * r], 'y', 4); }
  lamp(k, 'orange', [0, 0.78, 0], 0.05);
  // the holdings' rigs, moored nose-in on booms, no two alike
  const n = 7, rigs: Array<[Group, number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.25, r = 3.0 + rnd() * 0.5, len = 1.0 + rnd() * 0.7;
    const cx = Math.cos(a), cz = Math.sin(a);
    rigs.push([tug(rnd, len), cx * (r + len / 2), cz * (r + len / 2), Math.atan2(cz, cx) + Math.PI]);
    k.pipeTo('pipe', [cx * 1.25, -0.05, cz * 1.25], [cx * r, -0.05, cz * r], 0.03);
    // a string of work lamps sagging along the boom
    for (let j = 1; j < 4; j++) { const u = 1.25 + (r - 1.25) * (j / 4); lamp(k, 'lamp', [cx * u, -0.22 - 0.06 * Math.sin((j / 4) * Math.PI), cz * u], 0.022); }
  }
  const root = k.build(mats(), 0.08);
  for (const [g, x, z, yaw] of rigs) moor(root, g, x, z, yaw);
  return scaled(root, 2.7);
}

/** Custody's relay at Tamsin Field: a long truss with three dishes and the conscripts' pod, the Saints' charges clamped along it. */
function relay(): Group {
  const k = new Kit(), rnd = seeded(53);
  const L = 4.2, h = 0.22;
  // the truss: four chords and a zigzag of braces down each face
  for (const [y, z] of [[h, h], [h, -h], [-h, h], [-h, -h]] as const) k.pipeTo('hull', [-L, y, z], [L, y, z], 0.03);
  for (let i = 0; i < 16; i++) {
    const x0 = -L + (i / 16) * 2 * L, x1 = x0 + (2 * L) / 16;
    k.pipeTo('pipe', [x0, h, h], [x1, -h, h], 0.013); k.pipeTo('pipe', [x0, h, -h], [x1, -h, -h], 0.013);
    k.pipeTo('pipe', [x0, h, h], [x1, h, -h], 0.013);
    if (i % 4 === 0) k.box('dark', [0.06, h * 2.3, h * 2.3], [x0, 0, 0]);
  }
  // three dishes on short masts, each turned its own way
  const dishes: Group[] = [];
  for (const [x, yaw] of [[-3.1, 0.4], [0.2, -0.3], [3.3, 0.9]] as const) {
    k.cyl('dark', 0.05, 0.06, 0.5, [x, h + 0.25, 0], 'y', 8);
    const g = new Kit();
    g.lathe('hull', [[0.02, 0], [0.35, 0.08], [0.62, 0.24], [0.66, 0.27]], [0, 0, 0], 32);
    g.cyl('pipe', 0.012, 0.012, 0.5, [0, 0.25, 0], 'y', 4);
    const dish = g.build(mats(), 0); dish.position.set(x, h + 0.55, 0); dish.rotation.set(0, yaw, 1.1);
    dishes.push(dish);
  }
  // the pod where the eleven conscripts live: plated in Custody grey, lit
  oct(k, 'primer', -0.9, 0.9, 0.9, 0.75, -0.62, 0);
  frameRing(k, -0.9, 0.08, 0.9, 0.75, -0.62, 0); frameRing(k, 0.9, 0.08, 0.9, 0.75, -0.62, 0);
  windowRow(k, rnd, [-0.7, -0.6, 0.47], [0.7, -0.6, 0.47], 8, [0.08, 0.06, 0.02], [0, 0, 0], 0.15);
  windowRow(k, rnd, [-0.7, -0.6, -0.47], [0.7, -0.6, -0.47], 8, [0.08, 0.06, 0.02], [0, 0, 0], 0.15);
  // solar wings at the far ends
  for (const x of [-L - 0.05, L + 0.05]) for (const sz of [-1, 1]) {
    k.box('dark', [0.9, 0.012, 0.7], [x, 0, sz * 0.75], [0.15 * sz, 0, 0]);
    for (let i = 0; i < 4; i++) k.box('pipe', [0.012, 0.02, 0.7], [x - 0.34 + i * 0.226, 0.005, sz * 0.75], [0.15 * sz, 0, 0]);
    k.box('pipe', [0.92, 0.02, 0.014], [x, 0.005 + sz * 0.05, sz * 0.75 + sz * 0.35], [0.15 * sz, 0, 0]);
    k.pipeTo('pipe', [x, 0, 0], [x, 0, sz * 0.42], 0.02);
  }
  lamp(k, 'nav', [L + 0.1, h + 0.1, 0], 0.03); lamp(k, 'nav', [-L - 0.1, h + 0.1, 0], 0.03);
  const root = k.build(mats(), 0.06);
  for (const d of dishes) root.add(d);
  // the Saints' charges: small packs clamped to the chords, their arming lights blinking out of step
  const charges = new Group();
  const armed = new MeshBasicMaterial({ color: new Color(2.4, 1.3, 0.25), toneMapped: false, transparent: true });
  const c = new Kit();
  for (const x of [-2.6, -1.4, 1.4, 2.6, 3.7, -3.7]) { c.box('pack', [0.16, 0.12, 0.1], [x, -h - 0.06, h + 0.02]); }
  const packs = c.build({ pack: mats().dark! }, 0); charges.add(packs);
  const lights: Mesh[] = [];
  for (const [i, x] of [-2.6, -1.4, 1.4, 2.6, 3.7, -3.7].entries()) {
    const m = new Mesh(new BoxGeometry(0.04, 0.04, 0.04), armed.clone()); m.position.set(x, -h - 0.06, h + 0.08); m.userData.phase = i * 0.37; lights.push(m); charges.add(m);
  }
  root.add(charges);
  root.userData.tick = (t: number) => { for (const m of lights) (m.material as MeshBasicMaterial).opacity = ((t + m.userData.phase) % 1.4) < 0.18 ? 1 : 0.12; };
  return scaled(root, 2.4);
}

/** Torchwall's picket: the yard's tugs nose to tail across the crossing, cables and work lamps slung between, the crews' boards hung on them. */
function picket(): Group {
  const k = new Kit(), rnd = seeded(67);
  const n = 6, gap = 1.55;
  const xs: Array<[number, number]> = [], rigs: Array<[Group, number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * gap, x = (rnd() - 0.5) * 0.5, len = 1.0 + rnd() * 0.5;
    // each tug faces the way she comes, a little out of line: a picket, not a parade
    rigs.push([tug(rnd, len), x, z, Math.PI + (rnd() - 0.5) * 0.5]);
    xs.push([x, z]);
  }
  for (let i = 0; i < n - 1; i++) {
    const [x0, z0] = xs[i]!, [x1, z1] = xs[i + 1]!;
    // two cables, sagging, a lamp at each low point; between them a board, ochre, with the yard's mark
    for (const y of [0.32, -0.05]) {
      const mid: [number, number, number] = [(x0 + x1) / 2, y - 0.18, (z0 + z1) / 2];
      k.pipeTo('pipe', [x0, y, z0 + 0.28], mid, 0.012); k.pipeTo('pipe', mid, [x1, y, z1 - 0.28], 0.012);
      lamp(k, 'lamp', [mid[0], mid[1] - 0.04, mid[2]], 0.02);
    }
    if (i % 2 === 0 || rnd() < 0.4) {
      const bx = (x0 + x1) / 2, bz = (z0 + z1) / 2;
      block(k, 'board', [0.02, 0.28, 0.62], [bx, 0.08, bz], [0, 0, (rnd() - 0.5) * 0.2], 0.01);
      k.box('dark', [0.025, 0.05, 0.42], [bx + 0.005, 0.12, bz]);
    }
  }
  const root = k.build({ ...mats(), board: BOARD }, 0.06);
  for (const [g, x, z, yaw] of rigs) moor(root, g, x, z, yaw);
  return scaled(root, 2.3);
}
const BOARD = metal({ tint: 0x9c7a34, roughness: 0.7, metalness: 0.15, scale: 1.2, painted: true, worn: 0.9 });

/** Ninehaven's singing relay: an old relay ring, broken open, its aerials splayed; a light runs round what is left of it as it speaks. */
function chorus(): Group {
  const k = new Kit(), rnd = seeded(79);
  const R = 3.0, arc = Math.PI * 1.55;
  k.ring('hull', R, 0.2, [0, 0, 0], 'y', 64, arc);
  k.ring('dark', R, 0.24, [0, 0, 0], 'y', 64, arc * 0.98, [0, 0.02, 0]);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * arc, c = Math.cos(a), s = Math.sin(a);
    k.box('band', [0.18, 0.5, 0.5], [c * R, 0, s * R], [0, -a, 0]);
    // aerials, bent every way the years left them
    if (rnd() < 0.8) { const len = 0.5 + rnd() * 1.3, tilt = (rnd() - 0.5) * 1.2; k.pipeTo('pipe', [c * R, 0.2, s * R], [c * (R + len * Math.sin(0.6 + tilt)), 0.2 + len * Math.cos(0.6 + tilt), s * (R + len * Math.sin(0.6 + tilt))], 0.012, 4); }
  }
  // the break: two torn ends, plates peeled
  for (const a of [0, arc]) for (let j = 0; j < 3; j++) k.box('burnt', [0.3, 0.03, 0.25], [Math.cos(a) * (R + (rnd() - 0.5) * 0.3), (rnd() - 0.5) * 0.4, Math.sin(a) * (R + (rnd() - 0.5) * 0.3)], [rnd(), rnd() * 2, rnd()]);
  // the core it hung from, dark, on three spokes
  k.lathe('dark', [[0, -0.4], [0.5, -0.3], [0.6, 0], [0.5, 0.3], [0, 0.4]], [0, 0, 0], 24);
  for (const a of [0.4, 2.3, 4.0]) k.pipeTo('hull', [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], [Math.cos(a) * R, 0, Math.sin(a) * R], 0.04);
  const root = k.build(mats(), 0.08);
  // the voice: a pale light running round the ring and back, and the core answering it
  const pulse = new Mesh(new BoxGeometry(0.22, 0.06, 0.42), new MeshBasicMaterial({ color: new Color(0.7, 1.05, 1.15), toneMapped: false, transparent: true, blending: AdditiveBlending, depthWrite: false }));
  const core = new Mesh(new CylinderGeometry(0.12, 0.12, 0.84, 12), new MeshBasicMaterial({ color: new Color(1.2, 1.5, 1.7), toneMapped: false, transparent: true, blending: AdditiveBlending, depthWrite: false }));
  root.add(pulse, core);
  root.userData.tick = (t: number) => {
    const p = (Math.sin(t * 0.7) * 0.5 + 0.5) * arc;
    pulse.position.set(Math.cos(p) * R, 0.28, Math.sin(p) * R); pulse.rotation.y = -p;
    (pulse.material as MeshBasicMaterial).opacity = 0.35 + 0.4 * Math.abs(Math.sin(t * 3.1));
    (core.material as MeshBasicMaterial).opacity = 0.15 + 0.35 * Math.max(0, Math.sin(t * 1.9));
  };
  return scaled(root, 2.5);
}

/** Hollowforge's pattern: Thren shards hung in a slow spiral, grown not built, turning as she nears. */
function spiral(): Group {
  const k = new Kit(), rnd = seeded(97);
  const n = 34;
  for (let i = 0; i < n; i++) {
    const u = i / n, a = u * Math.PI * 4.2, r = 0.5 + u * 3.6, len = 0.35 + (1 - u) * 0.9 + rnd() * 0.3, w = 0.07 + (1 - u) * 0.12;
    k.shard(i % 4 === 3 ? 'violet' : 'crystal', [[0, 0], [w, len * 0.2], [w * 0.8, len * 0.8], [0, len]], [Math.cos(a) * r, (rnd() - 0.5) * 0.5 + Math.sin(u * 9) * 0.25, Math.sin(a) * r], [Math.PI / 2 + (rnd() - 0.5) * 0.6, 0, -a + (rnd() - 0.5) * 0.8]);
  }
  k.crystal('violet', 0.35, [0, 0, 0], [1, 1.8, 1]);
  const g = k.build(SHARD, 0);
  const root = new Group(); root.add(g);
  root.userData.tick = (t: number) => { g.rotation.y = t * 0.12; g.position.y = 0.2 * Math.sin(t * 0.5); };
  return scaled(root, 2.6);
}
const SHARD = { crystal: crystalMaterial(0x6a4a20, 0xd09040, 0.04, 'place-crystal'), violet: crystalMaterial(0x2a1040, 0xd030e0, 0.5, 'place-violet') };

/** A look at its size in the world: the skiff about her length, the ferry twice it, a canister she could fit in her hold. */
function scaled(g: Group, k: number): Group { g.scale.setScalar(k); return g; }

const BUILD: Record<PlaceLook, () => Group> = { skiff, ferry, wreck, canister, buoy, moot, relay, picket, chorus, spiral };

export class PlaceView {
  private readonly root = new Group();
  private readonly looks = new Map<PlaceLook, Group>();
  /** The hull that came alongside, after the meeting (World.escort): its own copy, so the next place can show beside it. */
  private readonly escorts = new Map<PlaceLook, Group>();
  private readonly ring: Mesh;
  private readonly fill: Mesh;
  private readonly beacon: Mesh;
  private time = 0;
  private shown = '';
  private ringR = 0;
  private fillAt = -1;

  constructor(private readonly scene: Scene) {
    this.root.visible = false;
    const flat = (opacity: number) => {
      const m = new Mesh(new RingGeometry(0.9, 1, 64), new MeshBasicMaterial({ color: TEAL.clone(), transparent: true, opacity, side: DoubleSide, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.35;
      return m;
    };
    // the ring and, inside it, the part of the hold already done (a thin arc that grows round)
    this.ring = flat(0.14);
    this.fill = flat(0.4);
    this.beacon = new Mesh(new CylinderGeometry(0.08, 0.08, 0.14, 8), new MeshBasicMaterial({ color: BEACON.clone(), transparent: true, opacity: 1, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    this.root.add(this.ring, this.fill, this.beacon);
    scene.add(this.root);
  }

  private look(l: PlaceLook): Group {
    let g = this.looks.get(l);
    if (!g) { g = BUILD[l](); this.looks.set(l, g); this.root.add(g); }
    return g;
  }

  /** The hull alongside after its meeting: it flies with her, then peels away nose first. */
  private escort(world: World, dt: number): void {
    const e = world.escort;
    for (const [l, g] of this.escorts) g.visible = !!e && l === e.look;
    if (!e) return;
    let g = this.escorts.get(e.look);
    if (!g) { g = BUILD[e.look](); this.escorts.set(e.look, g); this.scene.add(g); }
    g.visible = true;
    g.position.set(e.x, 0.15 * Math.sin(this.time * 0.6), e.z);
    if (Math.hypot(e.vx, e.vz) > 0.5) {
      const h = Math.atan2(-e.vz, e.vx), d = Math.atan2(Math.sin(h - g.rotation.y), Math.cos(h - g.rotation.y));
      g.rotation.y += d * Math.min(1, dt * 3);
    }
  }

  update(world: World, dt: number): void {
    this.escort(world, dt);
    const sp = world.storyPlace;
    if (!sp) { this.root.visible = false; this.shown = ''; return; }
    this.time += dt;
    this.root.visible = true;
    this.root.position.set(sp.x, 0, sp.z);
    const g = this.look(sp.def.look);
    for (const [l, m] of this.looks) m.visible = l === sp.def.look;
    if (this.shown !== sp.def.id) {
      this.shown = sp.def.id;
      // each place sits at its own angle, so two of the same look never read as one; a hull coming to her starts nose toward her
      g.rotation.y = sp.heading !== undefined ? Math.atan2(sp.z - world.ship.z, world.ship.x - sp.x) : (sp.def.id.length * 1.7) % (Math.PI * 2);
    }
    // a set piece's own motion: charges blinking, a light running round a ring, shards turning
    (g.userData.tick as ((t: number) => void) | undefined)?.(this.time);
    // a hull coming alongside flies nose first (sim/places.ts stepMeet): it turns toward where it is going
    if (sp.heading !== undefined) {
      const d = Math.atan2(Math.sin(sp.heading - g.rotation.y), Math.cos(sp.heading - g.rotation.y));
      g.rotation.y += d * Math.min(1, dt * 4);
    }
    // a slow drift, so a dead hull still reads as adrift
    g.position.y = 0.15 * Math.sin(this.time * 0.6);
    g.rotation.z = 0.04 * Math.sin(this.time * 0.4);
    const pickup = 'pickup' in sp.def.act;
    // a hairline ring close round the thing itself (not the hold's full reach, which would cut under the camera): it says "here",
    // and fills as she holds; the HUD counts the seconds
    const r = SNUG[sp.def.look];
    if (this.ringR !== r) {
      this.ringR = r;
      this.ring.geometry.dispose();
      this.ring.geometry = new RingGeometry(r - RING_W, r, 96);
      this.fillAt = -1;
    }
    (this.ring.material as MeshBasicMaterial).opacity = 0.1 + 0.05 * Math.sin(this.time * 1.6);
    // the hold fills a second hairline just inside it: an arc that grows round as she holds
    const held = sp.held;
    this.fill.visible = !pickup && held > 0.01;
    if (this.fill.visible && Math.abs(this.fillAt - held) > 0.01) {
      this.fillAt = held;
      this.fill.geometry.dispose();
      this.fill.geometry = new RingGeometry(r - RING_W * 3, r - RING_W * 1.6, 96, 1, Math.PI / 2, held * Math.PI * 2);
    }
    // a hull carries its own lamps now; only a pickup gets the slow beacon over it
    this.beacon.visible = pickup;
    this.beacon.position.set(0, 1.3, 0);
    (this.beacon.material as MeshBasicMaterial).opacity = Math.sin(this.time * 3.1) > 0.4 ? 1 : 0.18;
  }

  /** A place is done: a pickup comes aboard with a small teal flash; a hold ends with a soft pulse. */
  done(x: number, z: number, pickup: boolean, fx: Effects): void {
    fx.flash(x, 0.4, z, pickup ? 1.4 : 2.4, [0.6, 2.2, 2.4], 0.14);
    if (pickup) fx.burst(x, 0.4, z, 10, [0.5, 1.8, 2], 5, 0.12, 0.35);
  }

  dispose(): void { this.scene.remove(this.root); for (const g of this.escorts.values()) this.scene.remove(g); }
}
