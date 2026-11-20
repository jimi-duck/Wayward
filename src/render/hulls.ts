import { Kit, seeded, type V3 } from './kit';
import type { AlienKind, EliteId, Faction } from '../sim/enemies';

// ── the hulls, designed ──────────────────────────────────────────────────
// One model per archetype and faction, built from the kit (merged to one
// draw per material). A hull is dark structure with its faction's coat on
// the armour, and is designed from the inside out: where the power is, where
// the heat goes, where the guns and the hands are. Three levels carry it:
//
//   primary    the silhouette and the big masses
//   secondary  armour plates, engine housings, mounts, ribs, tanks
//   tertiary   vents, bolts, conduit, hatches, stencils, patches
//
// Nose +X, up +Y, starboard +Z, about a unit of radius. Material keys:
//   hull   the bare dark structure     paint  the faction's coat
//   patch  a replacement or old coat   trim   stripes and markings
//   dark   machinery                   glow   lit slits and panels (light)
//   crystal, violet   the Thren's own (their ships are grown, not built)

/** A light on the hull, in model space: position, then length and width (a slit if they differ, a point if not). */
export type Lamp = [number, number, number, number, number];

export interface Design { k: Kit; engines: V3[]; lamps: Lamp[]; }

class Ship {
  readonly k = new Kit();
  readonly engines: V3[] = [];
  readonly lamps: Lamp[] = [];
  constructor(readonly rnd: () => number) {}

  lamp(x: number, y: number, z: number, len = 0.06, wid = len): void { this.lamps.push([x, y, z, len, wid]); }

  /** An engine: housing, flared bell, collar, a lit core. `x` is the rear of the housing; the flame leaves from the bell. */
  bell(x: number, y: number, z: number, r: number, coat: 'dark' | 'patch' | 'hull' = 'dark'): void {
    const k = this.k;
    k.cyl(coat, r, r * 1.15, r * 2.2, [x + r, y, z], 'x', 12);
    k.cyl('dark', r * 0.95, r * 1.3, r * 0.6, [x - r * 0.3, y, z], 'x', 12, true);
    k.ring('trim', r * 1.14, r * 0.07, [x + r * 1.5, y, z], 'x', 14);
    k.cyl('glow', r * 0.78, r * 0.78, 0.01, [x + r * 0.02, y, z], 'x', 10);
    // cooling fins round the housing
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      k.box('hull', [r * 1.2, r * 0.12, r * 0.07], [x + r * 1.1, y + Math.sin(a) * r * 1.12, z + Math.cos(a) * r * 1.12], [a, 0, 0]);
    }
    this.engines.push([x - r * 0.5, y, z]);
  }

  /** A raised armour plate with a dark gap round it. */
  plate(coat: string, x: number, z: number, len: number, wid: number, y: number, t = 0.04): void {
    this.k.box('dark', [len + 0.025, t * 0.6, wid + 0.025], [x, y - t * 0.2, z]);
    this.k.box(coat, [len, t, wid], [x, y, z]);
  }

  /** Armour strakes along both shoulders of a lofted hull: a dark seam with a raised lip above it. */
  chine(x0: number, x1: number, w: number): void {
    const len = x1 - x0, mx = (x0 + x1) / 2;
    for (const sd of [-1, 1]) {
      this.k.box('dark', [len, 0.02, 0.03], [mx, 0.045, sd * (w - 0.015)], [sd * 0.5, 0, 0]);
      this.k.box('hull', [len * 0.96, 0.025, 0.025], [mx, 0.075, sd * (w - 0.045)], [sd * 0.5, 0, 0]);
    }
  }

  /** A row of vent slats along x. */
  vents(x: number, z: number, y: number, n: number, len: number, wid: number): void {
    for (let i = 0; i < n; i++) this.k.box('dark', [len, 0.02, wid / n * 0.55], [x, y, z + (i - (n - 1) / 2) * (wid / n)]);
  }

  /** A row of rivets or bolt heads. */
  bolts(x0: number, x1: number, z: number, y: number, n: number, r = 0.012): void {
    for (let i = 0; i < n; i++) this.k.cyl('hull', r, r, r * 1.2, [x0 + (x1 - x0) * (i / Math.max(1, n - 1)), y, z], 'y', 5);
  }

  /** A lit slit lying on a surface. */
  slit(x: number, y: number, z: number, len: number, wid = 0.02): void { this.k.box('glow', [len, 0.012, wid], [x, y, z]); }

  /** A gun: a turret base, a barrel (or a pair) and a muzzle brake. */
  gun(x: number, y: number, z: number, len: number, r = 0.035, twin = 0, coat: 'dark' | 'patch' = 'dark'): void {
    const k = this.k;
    k.cyl('dark', r * 2.2, r * 2.6, r * 1.6, [x - len * 0.3, y, z], 'y', 8);
    for (const o of twin ? [-twin, twin] : [0]) {
      k.cyl(coat, r, r, len, [x + len * 0.2, y + r * 0.4, z + o], 'x', 7);
      k.cyl('dark', r * 1.5, r * 1.5, r * 1.4, [x + len * 0.7, y + r * 0.4, z + o], 'x', 7);
    }
  }

  /** A strut or blade from a to b: a box `h` tall and `w` wide, its length along the line. */
  beam(key: string, a: V3, b: V3, h: number, w = h): void {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    this.k.box(key, [Math.hypot(dx, dy, dz), h, w], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [0, -Math.atan2(dz, dx), Math.atan2(dy, Math.hypot(dx, dz))]);
  }

  /** A mast with a dish or a sensor head. */
  mast(x: number, y: number, z: number, h: number, head: 'dish' | 'blade' | 'none' = 'dish'): void {
    const k = this.k;
    k.cyl('dark', 0.012, 0.016, h, [x, y + h / 2, z], 'y', 5);
    if (head === 'dish') k.cyl('hull', 0.07, 0.01, 0.025, [x, y + h, z], 'y', 10);
    if (head === 'blade') k.box('hull', [0.1, 0.07, 0.012], [x - 0.02, y + h * 0.85, z]);
  }

  /** A pipe along x, with brackets. */
  pipe(x0: number, x1: number, y: number, z: number, r = 0.015, coat = 'dark'): void {
    const n = Math.max(2, Math.round((x1 - x0) / 0.18));
    this.k.cyl(coat, r, r, x1 - x0, [(x0 + x1) / 2, y, z], 'x', 5);
    for (let i = 0; i <= n; i++) this.k.box('hull', [0.025, r * 2.6, r * 2.6], [x0 + ((x1 - x0) * i) / n, y, z]);
  }

  /** A strapped tank along x. */
  tank(x: number, y: number, z: number, len: number, r: number, coat: string): void {
    const k = this.k;
    k.cyl(coat, r, r, len, [x, y, z], 'x', 10);
    k.cyl('dark', r * 0.9, r * 1.05, r * 0.5, [x + len / 2, y, z], 'x', 8);
    for (const f of [-0.3, 0.3]) k.cyl('dark', r * 1.08, r * 1.08, 0.025, [x + len * f, y, z], 'x', 10);
  }
}

type Draw = (s: Ship) => void;

/** A chamfered armour mantlet over a prow: a flat plate cut back at 45 degrees, with a dark seam round it. */
function mantlet(s: Ship, x0: number, x1: number, w: number, y: number): void {
  const k = s.k, cut = (x1 - x0) * 0.45;
  k.wedge('dark', [[x1 + 0.02, 0], [x1 - cut, w + 0.02], [x0, w + 0.02], [x0, -w - 0.02], [x1 - cut, -w - 0.02]], 0.03, [0, y - 0.02, 0]);
  k.wedge('paint', [[x1, 0], [x1 - cut, w], [x0, w], [x0, -w], [x1 - cut, -w]], 0.045, [0, y, 0]);
  k.box('trim', [(x1 - x0) * 0.5, 0.012, 0.025], [(x0 + x1) / 2 - 0.02, y + 0.03, 0]);
}

/** A railgun turret on the spine: a ring, a faceted housing and one long barrel, with a cyan sight. */
function spinal(s: Ship, x: number, y: number, len: number): void {
  const k = s.k;
  k.cyl('dark', 0.085, 0.1, 0.05, [x, y, 0], 'y', 10);
  k.wedge('paint', [[0.1, 0], [0.04, 0.085], [-0.08, 0.085], [-0.1, 0.04], [-0.1, -0.04], [-0.08, -0.085], [0.04, -0.085]], 0.07, [x, y + 0.06, 0]);
  k.cyl('dark', 0.02, 0.026, len, [x + 0.1 + len / 2, y + 0.07, 0], 'x', 7);
  k.cyl('hull', 0.032, 0.032, 0.05, [x + 0.1 + len, y + 0.07, 0], 'x', 7);
  k.box('trim', [0.05, 0.012, 0.012], [x + 0.03, y + 0.1, 0.05]);
  s.lamp(x + 0.08, y + 0.095, 0, 0.05, 0.02);
}

// ═════════════════════════ THE GUTTER ═════════════════════════
// Survived. Dark structure with mismatched armour: a rust plate beside a
// primer-grey one, a bolted repair, a gun from another ship, a hot scar
// astern. Lopsided on purpose: one side carries what the other lacks.

/** The Interceptor and the Hunter: a swept bird; the Hunter's wings come forward. */
const gutterBird = (fwd: boolean): Draw => (s) => {
  const k = s.k, rnd = s.rnd;
  const f = fwd ? 0.4 : -0.3;
  // primary: a blunt fuselage and two long wings, one with its tip chopped
  k.loft('hull', [[-0.72, 0.07, 0.09, 0.09, 0.6], [-0.6, 0.23, 0.15, 0.14, 0.4], [-0.1, 0.23, 0.16, 0.14, 0.35], [0.45, 0.2, 0.14, 0.12, 0.45], [0.8, 0.1, 0.09, 0.08], [1.0, 0.03, 0.04, 0.04]]);
  s.chine(-0.55, 0.62, 0.2);
  for (const sd of [-1, 1]) {
    const tip = sd === -1 ? 1.0 : 0.82;
    k.wedge('hull', [[0.2, 0.17 * sd], [f, tip * sd], [f - 0.34, tip * sd], [-0.5, 0.2 * sd]], 0.07, [0, -0.04, 0], [sd * 0.16, 0, 0]);
    // secondary: a skin of armour on each wing, a different one per side
    k.wedge(sd === -1 ? 'paint' : 'patch', [[0.12, 0.22 * sd], [f + 0.03, (tip - 0.06) * sd], [f - 0.28, (tip - 0.06) * sd], [-0.4, 0.24 * sd]], 0.03, [0, 0.0, 0], [sd * 0.16, 0, 0]);
    k.box('hull', [0.4, 0.04, 0.03], [f - 0.08, -0.08, sd * tip * 0.5], [sd * 0.16, 0, 0]);
    // the wingtip gun, and what holds it
    s.gun(f + 0.1, -0.05, sd * (tip - 0.02), 0.5, sd === -1 ? 0.034 : 0.044, 0, sd === -1 ? 'dark' : 'patch');
    k.box('trim', [0.22, 0.012, 0.045], [f - 0.14, 0.012, sd * (tip - 0.14)], [sd * 0.16, 0, 0]);
    s.lamp(f - 0.2, 0.03, sd * (tip + 0.02));
  }
  // dorsal armour: rust to port, bolted primer to starboard, a hot scar between
  s.plate('paint', 0.1, -0.1, 0.9, 0.13, 0.16);
  s.plate('patch', 0.0, 0.1, 0.6, 0.12, 0.16);
  s.plate('patch', 0.5, -0.08, 0.2, 0.1, 0.16);
  k.box('trim', [0.9, 0.012, 0.02], [0.05, 0.168, 0], [0, 0, 0]);
  s.bolts(-0.28, 0.3, 0.1, 0.19, 6);
  s.bolts(-0.35, 0.5, -0.17, 0.19, 7);
  // canopy: a small armoured blister, offset a hair to port
  k.box('dark', [0.34, 0.1, 0.19], [0.22, 0.23, -0.02]);
  k.wedge('dark', [[0.5, 0], [0.42, 0.1], [0.05, 0.1], [0.05, -0.1], [0.42, -0.1]], 0.05, [0, 0.29, -0.02]);
  s.slit(0.28, 0.275, -0.02, 0.22, 0.05);
  s.lamp(0.3, 0.3, -0.02, 0.2, 0.05);
  // nose: a cannon, a muzzle brake, a bracket
  k.cyl('dark', 0.045, 0.06, 0.5, [0.98, -0.02, 0], 'x', 8);
  k.cyl('hull', 0.06, 0.06, 0.06, [1.2, -0.02, 0], 'x', 8);
  k.box('hull', [0.15, 0.1, 0.05], [0.7, 0.0, 0.08]);
  // hung on: a salvaged tank on the starboard flank, a boom on the port
  s.tank(-0.1, -0.14, 0.27, 0.55, 0.075, 'patch');
  s.pipe(-0.5, 0.3, -0.04, -0.27, 0.016);
  k.box('dark', [0.05, 0.1, 0.05], [0.18, -0.05, 0.25]);
  // vents and a mast, off centre
  s.vents(-0.3, -0.1, 0.19, 4, 0.2, 0.16);
  s.mast(-0.38, 0.17, 0.12, 0.28, 'blade');
  // exhaust: two nacelles, the starboard one a replacement
  s.bell(-0.78, 0, -0.17, 0.11, 'dark');
  s.bell(-0.78, 0, 0.17, 0.11, 'patch');
  k.box('dark', [0.1, 0.05, 0.04], [-0.55, 0.02, 0]);
  // old paint: a soot-dark stain on the tail is done by the wear shader; add two hatch plates
  k.box('trim', [0.1, 0.012, 0.08], [-0.2, 0.17, 0.15]);
  for (let i = 0; i < 3; i++) k.box('hull', [0.06, 0.02, 0.03], [-0.5 + rnd() * 0.5, 0.17, -0.02 + rnd() * 0.1]);
};

/** The Strike fighter: a long neck, a heavy head on a broad wing, two big engines. */
const gutterRaptor: Draw = (s) => {
  const k = s.k;
  // primary: the boom, the head, the broad wing
  k.box('hull', [0.9, 0.12, 0.16], [0.65, 0.02, 0]);
  k.loft('hull', [[0.8, 0.22, 0.12, 0.12, 0.4], [1.1, 0.2, 0.12, 0.11, 0.4], [1.32, 0.03, 0.04, 0.04]]);
  k.loft('hull', [[-0.95, 0.8, 0.1, 0.09, 0.5], [-0.4, 0.8, 0.1, 0.09, 0.5], [-0.1, 0.45, 0.1, 0.09, 0.4], [0.25, 0.14, 0.1, 0.09, 0.4]]);
  // secondary: head armour, wing armour (rust and primer), the raised dark panel
  k.wedge('paint', [[1.25, 0], [1.08, 0.15], [0.9, 0.17], [0.9, -0.17], [1.08, -0.15]], 0.04, [0, 0.13, 0]);
  s.plate('paint', -0.45, -0.38, 0.6, 0.5, 0.11);
  s.plate('patch', -0.45, 0.38, 0.6, 0.5, 0.11);
  k.box('dark', [0.8, 0.1, 1.5], [-0.58, 0.16, 0]);
  s.plate('paint', -0.25, 0.0, 0.2, 1.4, 0.215);
  k.box('trim', [0.05, 0.012, 1.25], [-0.82, 0.121, 0]);
  s.bolts(-0.9, -0.2, -0.66, 0.126, 7);
  s.bolts(-0.9, -0.2, 0.66, 0.126, 7);
  // the head: a cockpit slit, sensor eye, a nose spike
  s.slit(1.0, 0.152, 0, 0.18, 0.12);
  s.lamp(1.02, 0.16, 0, 0.12, 0.04);
  k.cyl('dark', 0.03, 0.05, 0.3, [1.4, 0.0, 0], 'x', 6);
  k.box('hull', [0.18, 0.14, 0.05], [1.0, 0.0, 0.13]);
  k.box('hull', [0.18, 0.14, 0.05], [1.0, 0.0, -0.13]);
  // neck: conduit and a service ladder
  s.pipe(0.3, 1.0, 0.1, 0.05, 0.016);
  s.pipe(0.3, 1.0, 0.1, -0.05, 0.016);
  // guns on the wingtips: one big, one mismatched
  s.gun(-0.4, 0.0, -0.76, 0.75, 0.04);
  s.gun(-0.4, 0.0, 0.76, 0.6, 0.05, 0.0, 'patch');
  k.box('dark', [0.3, 0.14, 0.08], [-0.45, 0.0, -0.7]);
  k.box('dark', [0.3, 0.14, 0.08], [-0.45, 0.0, 0.7]);
  s.lamp(-0.9, 0.03, -0.82); s.lamp(-0.9, 0.03, 0.82);
  s.lamp(0.45, 0.12, 0, 0.1, 0.03);
  // a second fuel tank slung under the port wing only
  s.tank(-0.55, -0.16, -0.42, 0.6, 0.09, 'patch');
  s.vents(-0.7, 0.0, 0.222, 5, 0.3, 0.3);
  s.mast(0.1, 0.1, 0.03, 0.22, 'blade');
  // two big engines, the starboard bell patched
  s.bell(-1.05, 0, -0.42, 0.14, 'dark');
  s.bell(-1.05, 0, 0.42, 0.14, 'patch');
  k.box('hull', [0.14, 0.08, 0.7], [-0.9, 0.0, 0]);
};

// ═════════════════════════ THE CUSTODY ═════════════════════════
// The fleet. Standard construction: the same armour module repeated, a row
// of hardpoints, sensor housings, a numbered hull. Symmetric and heavy, and
// the colour sits on plates that are all the same size.

/**
 * The Patrol fighter, the Interdictor and the Enforcer: built to regulation as a twin-boom delta. An armoured cockpit
 * pod with a braced canopy and twin cyan optics, intake cowlings either side of it, a delta wing with orange chevrons
 * on navy plate, two booms carrying the drives and a tailplane between them, a gun pod under each wing root.
 */
const custodyBird = (fwd: boolean): Draw => (s) => {
  const k = s.k, f = fwd ? 0.25 : -0.05;
  // primary: the pod, and a delta wing sweeping from it
  k.loft('hull', [[-0.35, 0.14, 0.16, 0.14, 0.5], [0.1, 0.2, 0.2, 0.15, 0.5], [0.6, 0.15, 0.14, 0.1, 0.6], [0.9, 0.06, 0.07, 0.06, 0.8], [1.02, 0.03, 0.04, 0.04]]);
  for (const sd of [-1, 1]) {
    k.wedge('hull', [[0.45, 0.16 * sd], [f - 0.1, 0.98 * sd], [f - 0.3, 0.98 * sd], [-0.5, 0.3 * sd]], 0.07, [0, -0.04, 0], [sd * 0.1, 0, 0]);
    // navy plate on the wing with an orange chevron band (a shallow V), a thin trim lip on the edge
    k.wedge('paint', [[0.38, 0.2 * sd], [f - 0.12, 0.86 * sd], [f - 0.28, 0.86 * sd], [-0.4, 0.3 * sd]], 0.03, [0, 0.0, 0], [sd * 0.1, 0, 0]);
    for (let i = 0; i < 2; i++) s.beam('trim', [0.08 - i * 0.2, 0.04, sd * 0.28], [-0.12 - i * 0.2, 0.04, sd * 0.7], 0.012, 0.08);
    k.box('trim', [0.34, 0.012, 0.03], [f - 0.2, 0.0, sd * 0.97], [0, -0.12 * sd, 0]);
    // intake cowlings flanking the pod: a dark mouth, a lip, a duct running back
    k.cyl('dark', 0.11, 0.12, 0.62, [0.2, -0.03, sd * 0.3], 'x', 10);
    k.cyl('hull', 0.125, 0.125, 0.04, [0.51, -0.03, sd * 0.3], 'x', 10);
    k.cyl('glow', 0.07, 0.07, 0.01, [0.5, -0.03, sd * 0.3], 'x', 8);
    // twin underslung autocannons at the wing root: a recoil cowling, a barrel and a vented brake
    k.box('paint', [0.42, 0.1, 0.12], [0.35, -0.16, sd * 0.5]);
    k.cyl('dark', 0.03, 0.03, 0.62, [0.62, -0.16, sd * 0.5 + 0.03], 'x', 7);
    k.cyl('dark', 0.03, 0.03, 0.62, [0.62, -0.16, sd * 0.5 - 0.03], 'x', 7);
    k.cyl('hull', 0.05, 0.05, 0.08, [0.95, -0.16, sd * 0.5], 'x', 7);
    for (const o of [-0.03, 0.03]) k.box('dark', [0.04, 0.012, 0.012], [0.95, -0.115, sd * 0.5 + o]);
    s.lamp(0.97, -0.16, sd * 0.5, 0.05);
    // a boom from the wing back to a drive, a fin, a bolted row
    k.box('hull', [0.95, 0.1, 0.1], [-0.55, 0.0, sd * 0.5]);
    k.box('paint', [0.3, 0.3, 0.035], [-0.78, 0.2, sd * 0.5], [0, 0, -0.35]);
    k.box('trim', [0.1, 0.02, 0.04], [-0.84, 0.32, sd * 0.5], [0, 0, -0.35]);
    s.bell(-1.0, 0, sd * 0.5, 0.1);
    s.bolts(-0.9, -0.2, sd * 0.5, 0.055, 6);
    s.lamp(f - 0.2, 0.03, sd * 0.97);
  }
  // the tailplane between the booms, a sensor housing and a dish
  k.box('hull', [0.22, 0.04, 1.0], [-0.84, 0.05, 0]);
  k.box('dark', [0.2, 0.12, 0.3], [-0.6, 0.03, 0]);
  // the armoured pilot cell: a faceted canopy, braced by ribs, two cyan optics in the brow
  k.loft('dark', [[-0.1, 0.1, 0.2, 0.18, 0.4], [0.2, 0.13, 0.3, 0.2, 0.5], [0.56, 0.08, 0.25, 0.2, 0.6], [0.7, 0.03, 0.2, 0.2]], [0, 0, 0]);
  for (const x of [0.0, 0.18, 0.36]) k.box('hull', [0.025, 0.04, 0.3], [x, 0.3 - x * 0.1, 0], [0, 0, -0.05]);
  for (const sd of [-1, 1]) { k.box('glow', [0.05, 0.02, 0.03], [0.6, 0.23, sd * 0.045]); s.lamp(0.62, 0.23, sd * 0.045, 0.05, 0.03); }
  s.slit(0.3, 0.3, 0, 0.2, 0.05);
  // regulation armour down the spine in identical modules, and a mantlet over the nose
  for (let i = 0; i < 3; i++) s.plate('paint', 0.0 - i * 0.2, 0, 0.17, 0.2, 0.2, 0.03);
  mantlet(s, 0.55, 0.98, 0.1, 0.07);
  s.mast(-0.3, 0.2, 0, 0.3, 'dish');
};

/** The Heavy cruiser: a long arrowhead, a spine, a bridge tower, two side hulls of batteries, three engines. */
const custodyLancer: Draw = (s) => {
  const k = s.k;
  // primary: arrowhead keel, two flank hulls, a stern block
  k.loft('hull', [[-1.08, 0.1, 0.13, 0.13], [-1.0, 0.22, 0.15, 0.14, 0.4], [0.6, 0.22, 0.15, 0.14, 0.4], [1.0, 0.12, 0.1, 0.1], [1.2, 0.02, 0.03, 0.03]]);
  k.wedge('hull', [[1.0, 0.55], [1.2, 0], [1.0, -0.55], [0.6, -0.22], [0.6, 0.22]], 0.1, [0, -0.04, 0]);
  for (const sd of [-1, 1]) {
    k.box('hull', [1.1, 0.22, 0.24], [-0.4, -0.02, sd * 0.38]);
    // the battery deck: five mounts in a row, twin barrels, each under a hood
    k.box('dark', [1.0, 0.06, 0.28], [-0.4, 0.12, sd * 0.38]);
    for (let i = 0; i < 4; i++) {
      s.gun(-0.15 - i * 0.24, 0.15, sd * 0.38, 0.3, 0.022, 0.045);
      k.cyl('paint', 0.08, 0.1, 0.07, [-0.2 - i * 0.24, 0.12, sd * 0.38], 'y', 8);
      s.lamp(-0.1 - i * 0.2, 0.04, sd * 0.51, 0.05);
    }
    // flank armour: identical plates, a numbered stripe
    for (let i = 0; i < 5; i++) s.plate('paint', 0.05 - i * 0.2, sd * 0.51, 0.17, 0.0, 0.0, 0.0);
    for (let i = 0; i < 5; i++) k.box('paint', [0.17, 0.17, 0.04], [0.05 - i * 0.2, -0.02, sd * 0.51]);
    k.box('trim', [1.0, 0.03, 0.02], [-0.4, 0.04, sd * 0.535]);
    // a crane-armed sensor boom out to the side
    k.box('dark', [0.35, 0.03, 0.03], [0.55, 0.05, sd * 0.66]);
    k.cyl('hull', 0.05, 0.01, 0.06, [0.74, 0.05, sd * 0.66], 'x', 6);
  }
  // keel armour: five identical dorsal modules down the spine
  for (let i = 0; i < 6; i++) { s.plate('paint', 0.75 - i * 0.28, 0, 0.24, 0.3, 0.14, 0.05); k.box('dark', [0.05, 0.03, 0.34], [0.62 - i * 0.28, 0.17, 0]); }
  k.box('hull', [1.6, 0.12, 0.2], [-0.15, 0.2, 0]);
  k.box('trim', [1.4, 0.012, 0.05], [-0.15, 0.265, 0]);
  s.bolts(-0.9, 0.7, -0.12, 0.2, 9, 0.014);
  s.bolts(-0.9, 0.7, 0.12, 0.2, 9, 0.014);
  // the bridge: a stepped tower with a window band, a mast with a sensor array
  k.box('hull', [0.28, 0.2, 0.2], [-0.3, 0.42, 0]);
  k.box('paint', [0.32, 0.06, 0.24], [-0.3, 0.55, 0]);
  k.box('dark', [0.2, 0.1, 0.16], [-0.32, 0.64, 0]);
  s.slit(-0.17, 0.43, 0, 0.012, 0.15);
  s.lamp(-0.16, 0.45, 0, 0.03, 0.16);
  s.lamp(-0.3, 0.7, 0, 0.04);
  s.mast(-0.32, 0.69, 0, 0.35, 'dish');
  k.box('hull', [0.3, 0.012, 0.012], [-0.32, 1.0, 0]);
  // sensor housings on the bow and the keel
  k.cyl('dark', 0.1, 0.12, 0.2, [0.85, 0.2, 0], 'y', 8);
  k.cyl('hull', 0.12, 0.12, 0.03, [0.85, 0.31, 0], 'y', 8);
  k.cyl('dark', 0.04, 0.05, 0.5, [1.2, 0.02, 0], 'x', 7);
  k.box('trim', [0.6, 0.02, 0.04], [0.75, 0.125, 0]);
  s.vents(-0.8, 0, 0.27, 5, 0.3, 0.3);
  // three engines in a stern block with a service gantry across
  k.box('dark', [0.3, 0.3, 0.8], [-1.0, 0, 0]);
  k.box('hull', [0.04, 0.34, 0.84], [-0.84, 0, 0]);
  for (const z of [-0.3, 0, 0.3]) s.bell(-1.2, 0, z, 0.11);
  k.box('paint', [0.3, 0.04, 0.8], [-1.0, 0.17, 0]);
  s.pipe(-1.0, -0.6, 0.0, 0.33, 0.02);
  s.pipe(-1.0, -0.6, 0.0, -0.33, 0.02);
  // the prow is a chamfered mantlet of armour, and a railgun rides the spine
  mantlet(s, 0.62, 1.12, 0.3, 0.1);
  spinal(s, 0.66, 0.26, 0.5);
};

/** The Freighter: a spine, a bridge forward, cargo pods in four pairs, two engines. */
const custodyFreighter: Draw = (s) => {
  const k = s.k;
  k.box('hull', [2.0, 0.14, 0.16], [-0.05, 0, 0]);
  k.loft('hull', [[0.5, 0.2, 0.17, 0.09, 0.4], [0.7, 0.2, 0.17, 0.09, 0.4], [0.92, 0.12, 0.12, 0.07], [1.08, 0.02, 0.04, 0.04]], [0, 0.04, 0]);
  s.plate('paint', 0.8, 0, 0.3, 0.26, 0.19, 0.04);
  k.box('dark', [0.2, 0.1, 0.18], [0.78, 0.25, 0]);
  s.slit(0.88, 0.25, 0, 0.012, 0.14);
  s.lamp(0.9, 0.26, 0, 0.04, 0.14);
  s.mast(0.7, 0.28, 0.05, 0.28, 'dish');
  // four pairs of pods in standard frames: a box cradle, a drum, a lit seam
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const x = 0.34 - i * 0.37, z = sd * 0.25;
    k.box('hull', [0.34, 0.3, 0.3], [x, 0, z]);
    s.plate(i % 2 ? 'paint' : 'patch', x, z, 0.3, 0.26, 0.162, 0.03);
    k.box('trim', [0.34, 0.025, 0.02], [x, 0, sd * 0.405]);
    k.box('dark', [0.04, 0.32, 0.32], [x + 0.19, 0, z]);
    k.box('dark', [0.04, 0.32, 0.32], [x - 0.19, 0, z]);
    if (i % 2 === 0) s.lamp(x, 0.02, sd * 0.42, 0.05);
    s.bolts(x - 0.1, x + 0.1, sd * 0.41, 0.1, 3, 0.012);
  }
  // spine details: conduit, a tank bank aft, a hatch row
  s.pipe(-0.9, 0.6, 0.1, 0.06, 0.018);
  s.pipe(-0.9, 0.6, 0.1, -0.06, 0.018);
  for (let i = 0; i < 3; i++) k.cyl('paint', 0.07, 0.07, 0.2, [-0.78 + i * 0.1, 0.14, 0], 'z', 8);
  s.vents(-0.5, 0, 0.1, 3, 0.2, 0.1);
  k.box('dark', [0.3, 0.26, 0.42], [-1.0, 0, 0]);
  for (const sd of [-1, 1]) s.bell(-1.2, 0, sd * 0.16, 0.1);
};

// ═════════════════════════ THE OFFICE OF PEACE ═════════════════════════
// Quiet. A slim body, crescent wings, no hardware on show: the guns and the
// sensors sit in recessed housings, the lights are thin lines let into the
// hull, the engines are narrow. Everything is swept.


/**
 * Gives a flat swept wing a section: a blended lifting body at the root, a cambered upper skin that stops short of the
 * knife-edge trailing line, a lower skin, flush panel seams, and an emitter let into a recessed conduit at the root.
 * `outline` is the wing's top-view outline for one side (z positive), `y` its height, `roll` its dihedral.
 */
function airfoil(s: Ship, outline: Array<[number, number]>, y: number, roll: number, rootX: number, tailX: number, bodyW: number): void {
  const k = s.k;
  // blended body: the fuselage swells into the root with sharp chines running out to the wing
  k.loft('hull', [[tailX, bodyW * 0.55, 0.1, 0.09, 0.9], [tailX * 0.4, bodyW * 0.95, 0.13, 0.11, 0.85], [rootX * 0.4, bodyW, 0.13, 0.1, 0.85], [rootX, bodyW * 0.3, 0.07, 0.06, 0.9], [rootX + 0.15, 0.02, 0.03, 0.03]]);
  for (const sd of [-1, 1]) {
    const o = (m: number) => outline.map(([x, z]): [number, number] => [x, z * sd * m]);
    // upper skin: a smaller, thicker plate over the middle of the wing, the edges left thin
    k.wedge('paint', outline.map(([x, z]): [number, number] => [x * 0.9 - 0.03, z * 0.8 * sd]), 0.05, [0, y + 0.035, 0], [sd * roll, 0, 0]);
    // lower skin and a keel line
    k.wedge('hull', outline.map(([x, z]): [number, number] => [x * 0.85, z * 0.75 * sd]), 0.04, [0, y - 0.035, 0], [sd * roll, 0, 0]);
    // flush panel seams along the wing: dark lines, and one lit
    k.wedge('dark', o(0.55).map(([x, z]): [number, number] => [x * 0.9, z]), 0.006, [0, y + 0.062, 0], [sd * roll, 0, 0]);
    // emitter: a weapon port set into a recessed conduit at the wing root, flush, with a cold lens
    k.box('dark', [0.34, 0.03, 0.06], [rootX * 0.5, y + 0.03, sd * (bodyW + 0.06)]);
    k.box('glow', [0.1, 0.012, 0.02], [rootX * 0.5 + 0.1, y + 0.034, sd * (bodyW + 0.06)]);
    s.lamp(rootX * 0.5 + 0.1, y + 0.04, sd * (bodyW + 0.06), 0.1, 0.02);
  }
}

/** The Plasma cruiser: a double crescent round a slim central hull. */
const officeWarbird: Draw = (s) => {
  const k = s.k;
  // primary: a long slim spear of a hull and two crescents that sweep forward then back
  k.loft('hull', [[-0.65, 0.1, 0.13, 0.13], [-0.3, 0.17, 0.14, 0.13, 0.4], [0.5, 0.14, 0.12, 0.12, 0.45], [0.9, 0.07, 0.07, 0.07], [1.15, 0.015, 0.03, 0.03]]);
  for (const sd of [-1, 1]) {
    // the crescent: an arc of wing that curls forward at the tip
    k.wedge('hull', [[0.35, 0.12 * sd], [0.05, 0.55 * sd], [-0.3, 0.93 * sd], [-0.5, 1.05 * sd], [-0.56, 0.92 * sd], [-0.42, 0.55 * sd], [-0.55, 0.12 * sd]], 0.07, [0, 0.01, 0], [sd * 0.1, 0, 0]);
    k.wedge('hull', [[-0.3, 0.93 * sd], [0.0, 1.0 * sd], [0.3, 0.85 * sd], [0.05, 0.9 * sd]], 0.06, [0, 0.0, 0], [sd * 0.1, 0, 0]);
    // verdigris armour on the crescent's leading edge, flush
    k.wedge('paint', [[0.3, 0.14 * sd], [0.03, 0.55 * sd], [-0.28, 0.89 * sd], [-0.3, 0.8 * sd], [0.0, 0.46 * sd], [0.2, 0.16 * sd]], 0.03, [0, 0.04, 0], [sd * 0.1, 0, 0]);
    // a lit line let into the wing edge, and a dark sensor panel
    k.wedge('glow', [[0.04, 0.5 * sd], [-0.3, 0.9 * sd], [-0.3, 0.91 * sd], [0.04, 0.51 * sd]], 0.012, [0, 0.07, 0], [sd * 0.1, 0, 0]);
    k.wedge('dark', [[-0.1, 0.4 * sd], [-0.35, 0.7 * sd], [-0.45, 0.62 * sd], [-0.3, 0.38 * sd]], 0.03, [0, 0.055, 0], [sd * 0.1, 0, 0]);
    // wingtip engine with a long narrow nacelle
    s.bell(-0.66, 0.0, sd * 0.88, 0.065);
    k.cyl('hull', 0.04, 0.05, 0.4, [-0.3, 0.0, sd * 0.9], 'x', 7);
    s.lamp(0.28, 0.01, sd * 0.86);
  }
  // secondary: dorsal armour in three long overlapping scales
  for (let i = 0; i < 3; i++) k.wedge('paint', [[0.85 - i * 0.45, 0], [0.4 - i * 0.45, 0.12], [-0.05 - i * 0.45, 0.1], [-0.05 - i * 0.45, -0.1], [0.4 - i * 0.45, -0.12]], 0.04, [0, 0.15 + i * 0.005, 0]);
  k.box('glow', [0.7, 0.012, 0.01], [0.1, 0.19, 0.0]);
  // recessed lights: slits down the flanks, a fine line round the nose
  for (const sd of [-1, 1]) { s.slit(0.05, 0.0, sd * 0.158, 0.9, 0.012); s.slit(-0.4, 0.07, sd * 0.1, 0.3, 0.012); }
  s.lamp(0.7, 0.09, 0, 0.18, 0.03);
  // the weapon: a sunken emitter at the nose behind a lens
  k.cyl('dark', 0.06, 0.08, 0.22, [0.95, 0.0, 0], 'x', 10);
  k.cyl('glow', 0.045, 0.045, 0.01, [1.04, 0.0, 0], 'x', 8);
  k.cyl('hull', 0.085, 0.085, 0.03, [1.0, 0.0, 0], 'x', 10);
  // a keel fin and a sensor blade
  k.wedge('hull', [[0.3, 0], [-0.4, 0.015], [-0.5, 0], [-0.4, -0.015]], 0.3, [0, -0.2, 0]);
  s.vents(-0.45, 0, 0.16, 3, 0.16, 0.12);
  // the main drive: one big engine on the axis
  s.bell(-0.8, 0.0, 0, 0.13);
  k.box('hull', [0.2, 0.2, 0.34], [-0.56, 0, 0]);
  airfoil(s, [[0.35, 0.12], [0.05, 0.55], [-0.3, 0.93], [-0.5, 1.05], [-0.56, 0.92], [-0.42, 0.55], [-0.55, 0.12]], 0.01, 0.1, 0.7, -0.55, 0.32);
};

/** The Ambush fighter (Whisper): a narrow dagger with crescent fins and lit edges. */
const officeScout: Draw = (s) => {
  const k = s.k;
  k.loft('hull', [[-0.72, 0.06, 0.12, 0.12], [-0.55, 0.16, 0.13, 0.12, 0.4], [0.5, 0.13, 0.11, 0.1, 0.45], [0.85, 0.06, 0.06, 0.06], [1.05, 0.012, 0.03, 0.03]]);
  for (const sd of [-1, 1]) {
    k.wedge('hull', [[0.3, 0.1 * sd], [-0.05, 0.62 * sd], [-0.45, 0.95 * sd], [-0.52, 0.8 * sd], [-0.4, 0.4 * sd], [-0.5, 0.12 * sd]], 0.05, [0, 0, 0], [sd * 0.2, 0, 0]);
    k.wedge('paint', [[0.25, 0.12 * sd], [-0.03, 0.57 * sd], [-0.38, 0.84 * sd], [-0.4, 0.74 * sd], [-0.05, 0.42 * sd]], 0.03, [0, 0.03, 0], [sd * 0.2, 0, 0]);
    k.wedge('glow', [[-0.03, 0.57 * sd], [-0.38, 0.84 * sd], [-0.38, 0.85 * sd], [-0.03, 0.58 * sd]], 0.012, [0, 0.05, 0], [sd * 0.2, 0, 0]);
    s.slit(0.1, 0.0, sd * 0.135, 0.7, 0.012);
    s.bell(-0.75, 0, sd * 0.1, 0.075);
    s.lamp(-0.46, 0.04, sd * 0.88);
  }
  for (let i = 0; i < 2; i++) k.wedge('paint', [[0.8 - i * 0.5, 0], [0.4 - i * 0.5, 0.1], [-0.05 - i * 0.5, 0.09], [-0.05 - i * 0.5, -0.09], [0.4 - i * 0.5, -0.1]], 0.04, [0, 0.13, 0]);
  k.cyl('dark', 0.035, 0.05, 0.3, [1.0, 0, 0], 'x', 8);
  k.cyl('glow', 0.03, 0.03, 0.01, [1.17, 0, 0], 'x', 8);
  s.lamp(0.55, 0.11, 0, 0.14, 0.03);
  s.vents(-0.3, 0, 0.145, 3, 0.15, 0.1);
  airfoil(s, [[0.3, 0.1], [-0.05, 0.62], [-0.45, 0.95], [-0.52, 0.8], [-0.4, 0.4], [-0.5, 0.12]], 0.0, 0.2, 0.6, -0.5, 0.22);
};

// ═════════════════════════ THE VOICE ═════════════════════════
// Machinery that builds itself: repeating modules, vents, pipes, no windows,
// no crew. Lit slits where something is working.

/**
 * The Grinder: a crucible. A beveled octagonal furnace body, its flanks opened to show a lit core behind slotted bars,
 * gimbal rings of brass and iron round it, a spire and radiator rings on top, and at the front a drill collar with
 * claw brackets and focus coils. One engine behind.
 */
const voiceDrone: Draw = (s) => {
  const k = s.k, rnd = s.rnd;
  // primary: an octagonal drum along the axis, bevelled at both ends (a truncated rhombic mass, not a box)
  k.loft('dark', [[-0.7, 0.36, 0.36, 0.36, 0.9], [-0.55, 0.58, 0.58, 0.58, 0.7], [0.5, 0.62, 0.62, 0.62, 0.7], [0.68, 0.4, 0.4, 0.4, 0.9]]);
  // secondary: iron ribs round the drum, brass bands between them
  for (let i = 0; i < 5; i++) k.ring(i % 2 ? 'paint' : 'hull', 0.64, 0.035, [-0.45 + i * 0.28, 0, 0], 'x', 8, Math.PI * 2, [Math.PI / 8, 0, 0]);
  // the flanks and the deck opened: a dark bay, the core burning in it, slotted bars across
  for (const [y, z, w, h] of [[0, 0.6, 0.78, 0.5], [0, -0.6, 0.78, 0.5]] as const) {
    k.box('dark', [w, h, 0.05], [0.0, y, z]);
    k.box('glow', [w * 0.86, h * 0.86, 0.012], [0.0, y, z - Math.sign(z) * 0.028]);
    for (let i = 0; i < 7; i++) k.box('hull', [0.03, h, 0.03], [-w * 0.42 + i * (w * 0.84 / 6), y, z + Math.sign(z) * 0.03]);
    k.box('hull', [w + 0.06, 0.03, 0.05], [0.0, y + h / 2, z]);
    k.box('hull', [w + 0.06, 0.03, 0.05], [0.0, y - h / 2, z]);
    s.lamp(0.0, y, z + Math.sign(z) * 0.05, w * 0.8, 0.02);
  }
  // heat louvres under the belly, a vent grille either side of the spine
  s.vents(-0.1, 0, -0.62, 6, 0.5, 0.6);
  for (const sd of [-1, 1]) s.vents(-0.25, sd * 0.26, 0.63, 4, 0.3, 0.22);
  // gimbal rings: three, each turned on a different axis, brass and iron, held off the body on struts
  k.ring('paint', 0.86, 0.03, [0.05, 0, 0], 'x', 16);
  k.ring('hull', 0.9, 0.025, [0.05, 0, 0], 'y', 16);
  k.ring('trim', 0.82, 0.015, [-0.05, 0, 0], 'z', 16);
  for (const sd of [-1, 1]) { s.beam('dark', [0.05, 0, sd * 0.6], [0.05, 0, sd * 0.86], 0.04, 0.04); s.beam('dark', [0.05, sd * 0.6, 0], [0.05, sd * 0.9, 0], 0.04, 0.04); }
  // radiator rings stepping up the stern, a pyramidal sensor mast on the shoulder
  for (let i = 0; i < 3; i++) k.ring('hull', 0.4 - i * 0.04, 0.02, [-0.62 - i * 0.06, 0, 0], 'x', 10);
  for (let i = 0; i < 3; i++) k.box(i % 2 ? 'hull' : 'dark', [0.2 - i * 0.06, 0.07, 0.2 - i * 0.06], [-0.25, 0.64 + i * 0.07, 0.3]);
  s.mast(-0.25, 0.85, 0.3, 0.2, 'none');
  // the cutter: a collar, a drill cone with cutting rings, four claw brackets and capacitor focus coils
  k.cyl('dark', 0.24, 0.3, 0.16, [0.74, 0, 0], 'x', 10);
  k.cyl('hull', 0.02, 0.2, 0.42, [1.0, 0, 0], 'x', 8);
  for (let i = 0; i < 3; i++) k.ring('paint', 0.17 - i * 0.05, 0.012, [0.9 + i * 0.12, 0, 0], 'x', 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, c = Math.cos(a), sn = Math.sin(a);
    s.beam('hull', [0.74, sn * 0.27, c * 0.27], [1.08, sn * 0.2, c * 0.2], 0.04, 0.03);
    k.cyl('glow', 0.025, 0.025, 0.05, [1.0, sn * 0.16, c * 0.16], 'x', 6);
  }
  s.lamp(1.2, 0, 0, 0.08, 0.02);
  for (const [lx, ly, lz] of [[0.5, 0.45, 0.45], [0.5, -0.45, -0.45]] as const) s.lamp(lx, ly, lz, 0.2, 0.03);
  // stern: one engine in a bell housing
  k.cyl('dark', 0.16, 0.2, 0.3, [-0.88, 0, 0], 'x', 10);
  s.engines.push([-0.92, 0, 0]);
  k.cyl('glow', 0.12, 0.12, 0.01, [-0.76, 0, 0], 'x', 10);
  for (let i = 0; i < 6; i++) k.box('dark', [0.1, 0.08, 0.1], [0.4 - rnd() * 0.8, 0.62, (rnd() - 0.5) * 0.7]);
  gothic(s, 1.0, 0.62, 0.45, 0.9, false);
};

/**
 * The Voice's cathedral: a spire rising from the deck on buttress ribs, a row of serrated teeth round the prow, and an
 * exposed furnace core in an open frame (a lit disc, a ring of ribs round it). `nose` is the prow's x, `deck` the top
 * face's y, `span` the half-width the buttresses spread to.
 */
function gothic(s: Ship, nose: number, deck: number, span: number, spire = 0.9, full = true): void {
  const k = s.k;
  // the spire: three stacked tapering drums and a needle, ribs leaning in from the shoulders
  k.cyl('paint', 0.1, 0.16, 0.22, [-0.1, deck + 0.11, 0], 'y', 8);
  k.cyl('hull', 0.06, 0.1, 0.22, [-0.1, deck + 0.33, 0], 'y', 8);
  k.cyl('paint', 0.01, 0.06, spire * 0.6, [-0.1, deck + 0.44 + spire * 0.3, 0], 'y', 8);
  s.lamp(-0.1, deck + 0.46 + spire * 0.6, 0, 0.05);
  for (const sd of [-1, 1]) for (const dx of [-0.32, 0.12]) {
    s.beam('hull', [-0.1 + dx, deck, sd * span], [-0.1, deck + 0.3, sd * 0.05], 0.045, 0.04);
  }
  if (!full) return;
  // serrated prow: a comb of teeth, long at the middle and short at the corners, each a lit-edged blade
  for (let i = 0; i < 7; i++) {
    const t = (i - 3) / 3, h = 0.2 - Math.abs(t) * 0.08;
    k.wedge(i % 2 ? 'hull' : 'paint', [[nose + 0.16, 0], [nose, 0.04], [nose, -0.04]], 0.05, [0, deck - 0.17 + t * 0.0, t * span * 0.9], [0, 0, 0]);
    k.box('dark', [0.04, h, 0.03], [nose - 0.02, deck - 0.1, t * span * 0.9]);
  }
  // the furnace: a lit disc in a ring of ribs, open on top, its light in the bloom's reach
  k.ring('hull', 0.2, 0.025, [0.18, deck + 0.015, 0], 'y', 14);
  k.cyl('glow', 0.17, 0.17, 0.012, [0.18, deck + 0.01, 0], 'y', 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.box('dark', [0.02, 0.11, 0.03], [0.18 + Math.cos(a) * 0.2, deck + 0.055, Math.sin(a) * 0.2], [0, -a, 0]);
  }
  s.lamp(0.18, deck + 0.04, 0, 0.12, 0.12);
}

/** The Voice probe: a machine-built wedge, a sensor crown, modular flanks. */
const voiceProbe: Draw = (s) => {
  const k = s.k, rnd = s.rnd;
  k.loft('hull', [[-0.72, 0.1, 0.13, 0.13], [-0.6, 0.23, 0.16, 0.15, 0.35], [0.1, 0.22, 0.16, 0.15, 0.3], [0.45, 0.2, 0.14, 0.13, 0.4], [0.8, 0.09, 0.08, 0.08], [1.0, 0.03, 0.04, 0.04]]);
  // flanks: four identical modules each side, stacked as a repeated unit
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const x = 0.4 - i * 0.28;
      k.box('paint', [0.22, 0.22, 0.2], [x, 0, sd * 0.3]);
      k.box('dark', [0.06, 0.26, 0.24], [x - 0.12, 0, sd * 0.3]);
      k.box('glow', [0.12, 0.012, 0.02], [x, 0.114, sd * 0.3]);
      k.cyl('dark', 0.025, 0.025, 0.1, [x, 0.17, sd * 0.3], 'y', 5);
    }
    k.wedge('dark', [[0.35, 0.35 * sd], [-0.05, 0.72 * sd], [-0.45, 0.72 * sd], [-0.55, 0.35 * sd]], 0.06, [0, -0.04, 0], [sd * 0.1, 0, 0]);
    k.box('dark', [0.4, 0.1, 0.08], [-0.15, -0.04, sd * 0.7]);
    k.cyl('hull', 0.04, 0.05, 0.3, [0.15, -0.04, sd * 0.7], 'x', 6);
  }
  // spine: pipes, a manifold, vents, a crown of sensors
  for (let i = 0; i < 3; i++) s.pipe(-0.55, 0.7, 0.17 + (i % 2) * 0.03, (i - 1) * 0.07, 0.02);
  k.box('dark', [0.3, 0.1, 0.2], [0.35, 0.22, 0]);
  for (let i = 0; i < 3; i++) k.cyl('hull', 0.04, 0.05, 0.12 + rnd() * 0.08, [0.4 - i * 0.08, 0.3, (i - 1) * 0.07], 'y', 6);
  s.vents(-0.2, 0, 0.16, 5, 0.35, 0.3);
  s.slit(0.8, 0.07, 0, 0.012, 0.18);
  s.lamp(0.82, 0.08, 0, 0.03, 0.18);
  k.cyl('dark', 0.05, 0.07, 0.4, [0.95, 0, 0], 'x', 6);
  k.cyl('glow', 0.03, 0.03, 0.01, [1.15, 0, 0], 'x', 6);
  k.box('dark', [0.3, 0.3, 0.6], [-0.75, 0, 0]);
  s.bell(-0.95, 0, -0.17, 0.1); s.bell(-0.95, 0, 0.17, 0.1);
  s.lamp(0.1, 0.15, 0.15, 0.04); s.lamp(0.1, 0.15, -0.15, 0.04);
  gothic(s, 1.1, 0.23, 0.3, 0.5);
};

// ═════════════════════════ THE THREN ═════════════════════════
// Grown, not built: faceted crystal, blades, asymmetric spurs, a violet
// light in the body, no panel lines. 'crystal' is the amber body, 'violet'
// the lit core.

/** A faceted shard: a six-sided prism with pointed ends, flat-shaded. */
const shard = (s: Ship, key: string, r: number, len: number, pos: V3, rot: V3, taper = 0.45): void => {
  const pts: Array<[number, number]> = [[0, -len / 2], [r * 0.5, -len / 2 + len * 0.1], [r, -len * 0.12], [r, len * taper * 0.5 - len * 0.12], [r * 0.45, len * 0.34], [0, len / 2]];
  s.k.shard(key, pts, pos, rot);
};


/** Floating carapace: detached arcs of ring that sit round the body with air between them, never touching it. */
function carapace(s: Ship, stations: Array<[number, number, number]>): void {
  // each station: x along the body, radius, and the roll its arc starts at
  for (const [x, r, roll] of stations) {
    s.k.ring('hull', r, 0.04, [x, 0, 0], 'x', 14, Math.PI * 1.15, [roll, 0, 0]);
    s.k.ring('violet', r * 0.985, 0.01, [x, 0, 0], 'x', 14, Math.PI * 1.15, [roll, 0, 0]);
    s.k.ring('crystal', r * 1.1, 0.02, [x - 0.08, 0, 0], 'x', 14, Math.PI * 0.7, [roll + Math.PI * 1.3, 0, 0]);
  }
}


/**
 * A grown crystal cluster along the axis: one long prism, and smaller ones sprouting from its spine in a spiral, each
 * leaning forward and shrinking toward the tip, the way a geode throws its spears. Every third is a vein of 'violet'.
 */
function cluster(s: Ship, x0: number, x1: number, off: number, n: number, r: number, len: number, flip = 1): void {
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1), a = i * 2.4 + (flip > 0 ? 0 : 1.1);
    const x = x0 + (x1 - x0) * t, o = off * (1 - 0.3 * t), rr = r * (1 - 0.55 * t) + 0.03, ll = len * (1 - 0.5 * t) + 0.15;
    shard(s, i % 3 === 2 ? 'violet' : 'crystal', rr, ll, [x, Math.cos(a) * o, Math.sin(a) * o], [a, 0, -Math.PI / 2 - 0.5], 0.5);
  }
}

/** A curving prong: a chain of shards that bows out from the hull and closes toward a focal point ahead of it. */
function tendril(s: Ship, sd: number, x0: number, z0: number, focus: number, bow: number, n = 6): void {
  let px = x0, pz = z0 * sd;
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = x0 + (focus - x0) * Math.pow(t, 1.1), z = sd * ((z0 + bow * Math.sin(Math.PI * t)) * (1 - 0.85 * t));
    const ang = Math.atan2(z - pz, x - px), segLen = Math.hypot(x - px, z - pz);
    shard(s, i % 2 ? 'crystal' : 'violet', 0.055 * (1 - 0.7 * t) + 0.015, segLen * 1.25, [(x + px) / 2, 0.02 * Math.sin(t * 3), (z + pz) / 2], [0, -ang, Math.PI / 2], 0.5);
    px = x; pz = z;
  }
  s.lamp(focus, 0, 0, 0.06);
}

/** The Web layer: a crystal body with blade wings and a violet core. */
const threnWeaver: Draw = (s) => {
  const k = s.k;
  // primary: a long central prism with a lit violet vein through it, and a spiral of spears grown from its spine
  shard(s, 'crystal', 0.34, 1.8, [0.0, 0, 0], [0, 0, Math.PI / 2], 0.5);
  shard(s, 'violet', 0.16, 1.2, [0.05, 0.0, 0], [0, 0, Math.PI / 2]);
  cluster(s, 0.6, -0.55, 0.2, 10, 0.12, 0.75);
  cluster(s, 0.35, -0.7, 0.26, 6, 0.09, 0.5, -1);
  // two broad crystal fins swept back, thin, with a vein each
  for (const sd of [-1, 1]) {
    const L = sd === 1 ? 1.0 : 0.82;
    k.wedge('crystal', [[0.3, 0.12 * sd], [-0.35, L * sd], [-0.75, 0.88 * L * sd], [-0.55, 0.12 * sd]], 0.06, [0, 0, 0], [sd * 0.12, 0, 0]);
    k.wedge('violet', [[0.1, 0.14 * sd], [-0.3, 0.8 * L * sd], [-0.34, 0.8 * L * sd], [0.05, 0.14 * sd]], 0.025, [0, 0.04, 0], [sd * 0.12, 0, 0]);
  }
  // the web-caster: two arcs of resonator prongs curving forward to one focal point
  for (const sd of [-1, 1]) tendril(s, sd, 0.3, 0.3, 1.5, 0.55, 7);
  shard(s, 'violet', 0.07, 0.3, [1.5, 0, 0], [0, 0, Math.PI / 2]);
  s.lamp(0.6, 0.12, 0.15, 0.08, 0.03);
  s.lamp(-0.1, -0.15, -0.3, 0.06);
  s.engines.push([-0.9, 0, 0]);
  shard(s, 'violet', 0.14, 0.4, [-0.75, 0, 0], [0, 0, Math.PI / 2]);
  carapace(s, [[0.45, 0.5, 0.2], [0.0, 0.58, 1.9], [-0.4, 0.52, 3.3]]);
};

/** The Shard cruiser: a heavy blade of crystal over an amber keel. */
const threnLancer: Draw = (s) => {
  const k = s.k;
  shard(s, 'crystal', 0.34, 2.4, [0.0, 0, 0], [0, 0, Math.PI / 2], 0.6);
  shard(s, 'violet', 0.16, 1.3, [0.0, 0.02, 0], [0, 0, Math.PI / 2]);
  // spears grown from the keel in two spirals, and the dark struts they grip
  cluster(s, 0.8, -0.8, 0.3, 11, 0.13, 0.85);
  cluster(s, 0.6, -0.9, 0.38, 7, 0.1, 0.6, -1);
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) k.box('hull', [0.1, 0.05, 0.4], [0.6 - i * 0.55, 0, sd * 0.2]);
  shard(s, 'crystal', 0.2, 1.3, [0.95, 0, 0], [0, 0, Math.PI / 2], 0.3);
  // hull ribs underneath: dark struts holding the grown mass
  for (let i = 0; i < 4; i++) { k.box('hull', [0.05, 0.26, 0.1], [0.6 - i * 0.45, -0.22, 0]); }
  k.box('hull', [1.8, 0.05, 0.1], [-0.1, -0.35, 0]);
  s.lamp(0.2, 0.2, 0, 0.14, 0.03);
  s.lamp(-0.4, 0.2, 0.12, 0.05);
  s.lamp(-0.4, 0.2, -0.12, 0.05);
  for (const z of [-0.14, 0, 0.14]) { shard(s, 'violet', 0.09, 0.35, [-1.1, 0, z], [0, 0, Math.PI / 2]); s.engines.push([-1.2, 0, z]); }
  carapace(s, [[0.9, 0.45, 0.4], [0.2, 0.62, 2.0], [-0.5, 0.58, 3.5], [-1.0, 0.45, 5.0]]);
};

/** The Thren mote: three curved crystal petals closing on a lit nexus. */
const threnScout: Draw = (s) => {
  const k = s.k;
  shard(s, 'crystal', 0.12, 1.0, [0.2, 0, 0], [0, 0, Math.PI / 2], 0.5);
  shard(s, 'violet', 0.09, 0.5, [0.35, 0, 0], [0, 0, Math.PI / 2]);
  // three petals 120 degrees apart round the axis: each a long blade swept forward and tipped in toward the nexus
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2, y = Math.cos(a) * 0.3, z = Math.sin(a) * 0.3;
    k.shard('crystal', [[0, -0.55], [0.09, -0.4], [0.15, -0.05], [0.12, 0.3], [0.04, 0.5], [0, 0.62]], [-0.15, y, z], [a, 0, -Math.PI / 2 - 0.3]);
    k.shard('violet', [[0, -0.3], [0.04, -0.2], [0.05, 0.1], [0, 0.4]], [-0.15, y, z], [a, 0, -Math.PI / 2 - 0.3]);
    s.lamp(-0.55, y * 1.4, z * 1.4, 0.05);
  }
  s.lamp(0.6, 0.02, 0, 0.1, 0.03);
  s.engines.push([-0.7, 0, 0]);
  shard(s, 'violet', 0.08, 0.3, [-0.55, 0, 0], [0, 0, Math.PI / 2]);
};


/** A latticed boom from a to b: two chords `d` apart and a zigzag of braces between, so it reads as steel truss, not a stick. */
function truss(s: Ship, a: V3, b: V3, d: number, n: number, key = 'patch'): void {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  // a side vector square to the boom, as near vertical as it can be
  let ux = -dy * dx, uy = dx * dx + dz * dz, uz = -dy * dz;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux = ux / ul * d / 2; uy = uy / ul * d / 2; uz = uz / ul * d / 2;
  const up = (p: V3, k: number): V3 => [p[0] + ux * k, p[1] + uy * k, p[2] + uz * k];
  s.beam(key, up(a, 1), up(b, 1), 0.03, 0.03);
  s.beam(key, up(a, -1), up(b, -1), 0.03, 0.03);
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, p0: V3 = [a[0] + dx * t0, a[1] + dy * t0, a[2] + dz * t0], p1: V3 = [a[0] + dx * t1, a[1] + dy * t1, a[2] + dz * t1];
    s.beam('dark', up(p0, i % 2 ? 1 : -1), up(p1, i % 2 ? -1 : 1), 0.018, 0.018);
  }
  void len;
}

/** The Mining barge: a kitbashed hauler. An ironclad hull with chined skirts, staggered patch plates and bare girders, clamped manifold pipes, a cargo cradle, an off-centre pod, an outrigger engine. */
const gutterBarge: Draw = (s) => {
  const k = s.k, rnd = s.rnd;
  // primary: a chamfered hull, wide at the shoulder, tumbling home to a narrow deck, a blunt prow
  k.loft('hull', [[-1.0, 0.26, 0.2, 0.18, 0.6], [-0.5, 0.42, 0.3, 0.2, 0.7], [0.45, 0.4, 0.28, 0.2, 0.7], [0.9, 0.14, 0.12, 0.1, 0.8], [1.02, 0.03, 0.04, 0.04]], [0, 0, 0.06]);
  // heavy skirts along the shoulders, canted out, with a dark gap
  for (const sd of [-1, 1]) {
    k.box('dark', [1.3, 0.1, 0.06], [-0.05, -0.02, 0.06 + sd * 0.45], [sd * 0.5, 0, 0]);
    k.box(sd < 0 ? 'paint' : 'patch', [1.2, 0.09, 0.05], [-0.05, 0.03, 0.06 + sd * 0.47], [sd * 0.5, 0, 0]);
  }
  // overlapping plates, never the same size, never square to the hull
  const plates: Array<[string, number, number, number, number, number]> = [['paint', 0.4, -0.12, 0.5, 0.3, 0.07], ['patch', 0.1, -0.2, 0.42, 0.26, 0.09], ['paint', -0.3, -0.1, 0.5, 0.34, 0.1], ['patch', 0.35, 0.3, 0.3, 0.24, 0.08], ['paint', -0.15, 0.32, 0.5, 0.3, 0.09]];
  for (const [coat, x, z, len, wid, y] of plates) { s.plate(coat, x, z + 0.06, len, wid, y + 0.18, 0.045); s.bolts(x - len * 0.4, x + len * 0.4, z + 0.06 + wid * 0.4, y + 0.205, 5); }
  // bare girders where the skin was stripped aft on the port side: an I-beam frame, flanges and webs
  for (let i = 0; i < 4; i++) {
    const x = -0.9 + i * 0.16;
    k.box('hull', [0.03, 0.3, 0.03], [x, 0.05, -0.36]);
    k.box('hull', [0.03, 0.03, 0.14], [x, 0.2, -0.3]);
    k.box('hull', [0.03, 0.03, 0.14], [x, -0.1, -0.3]);
  }
  s.beam('hull', [-0.95, 0.2, -0.36], [-0.3, 0.2, -0.36], 0.03, 0.03);
  k.box('trim', [0.2, 0.012, 0.3], [0.62, 0.215, 0.06], [0, 0.25, 0]);
  // power plant: manifold pipes rising from the engine housing and bending forward, banded with clamps, scorched at the collars
  for (const [z, hh] of [[-0.14, 0.3], [0.2, 0.22]] as const) {
    const a: V3 = [-0.86, 0.12, z], m: V3 = [-0.62, hh + 0.12, z + (z < 0 ? -0.04 : 0.04)], e: V3 = [-0.18, hh + 0.14, z + (z < 0 ? -0.06 : 0.06)];
    k.pipeTo('dark', a, m, 0.042, 7);
    k.pipeTo('dark', m, e, 0.038, 7, 0.05);
    for (const t of [0.3, 0.7]) { const q: V3 = [m[0] + (e[0] - m[0]) * t, m[1] + (e[1] - m[1]) * t, m[2] + (e[2] - m[2]) * t]; k.cyl('trim', 0.06, 0.06, 0.04, q, 'x', 7); }
    k.cyl('dark', 0.065, 0.06, 0.08, e, 'x', 7);
    k.cyl('glow', 0.04, 0.04, 0.01, [e[0] + 0.045, e[1], e[2]], 'x', 6);
  }
  s.vents(-0.5, 0.0, 0.3, 4, 0.22, 0.2);
  // starboard: a cargo cradle in a steel frame holding a fuel tank, a second tank strapped outboard
  for (let i = 0; i < 3; i++) { k.box('dark', [0.04, 0.34, 0.04], [0.45 - i * 0.45, 0, 0.52]); k.box('dark', [0.04, 0.04, 0.26], [0.45 - i * 0.45, 0.17, 0.4]); }
  s.beam('dark', [0.45, -0.17, 0.52], [-0.45, -0.17, 0.52], 0.04, 0.04);
  s.tank(0.0, 0.0, 0.5, 0.8, 0.14, 'patch');
  s.tank(0.62, -0.1, 0.72, 0.36, 0.07, 'paint');
  // a cockpit pod hung off to port at the bow on its own boom, a halogen flood on a stalk
  k.loft('hull', [[0.5, 0.15, 0.14, 0.14, 0.4], [0.9, 0.17, 0.15, 0.13, 0.4], [1.12, 0.05, 0.05, 0.05]], [0, 0.04, -0.4]);
  k.wedge('dark', [[1.0, 0], [0.85, 0.12], [0.6, 0.12], [0.6, -0.12], [0.85, -0.12]], 0.04, [0, 0.21, -0.4]);
  s.slit(0.95, 0.235, -0.4, 0.16, 0.09);
  s.lamp(1.0, 0.24, -0.4, 0.16, 0.06);
  s.beam('hull', [0.4, 0.05, -0.34], [0.7, 0.05, -0.1], 0.07, 0.05);
  k.cyl('dark', 0.04, 0.05, 0.4, [1.2, 0.04, -0.4], 'x', 6);
  s.mast(0.9, 0.22, -0.55, 0.16, 'none'); s.lamp(0.9, 0.4, -0.55, 0.07);
  // engines: a big bell aft, a small mismatched one on an outrigger spar to starboard
  k.box('dark', [0.34, 0.3, 0.5], [-1.04, 0, 0.06]);
  s.bell(-1.24, 0, -0.08, 0.13, 'patch');
  s.beam('hull', [-0.95, 0.0, 0.18], [-1.05, 0.0, 0.72], 0.06, 0.05);
  s.bell(-1.28, 0, 0.72, 0.075, 'dark');
  for (let i = 0; i < 3; i++) k.box('hull', [0.06, 0.02, 0.03], [-0.5 + rnd() * 0.6, 0.2, 0.2 + rnd() * 0.2]);
};

/** The Freight liner: a monolith. One unbroken faceted prism with a knife edge, a trench for an eye, nothing on its skin. */
const officeLiner: Draw = (s) => {
  const k = s.k;
  // primary: a long acute spearhead, flat topped, its chines sharp
  k.loft('hull', [[-1.05, 0.3, 0.2, 0.2, 0.15], [-0.4, 0.4, 0.24, 0.2, 0.2], [0.4, 0.34, 0.22, 0.18, 0.25], [0.85, 0.15, 0.12, 0.1, 0.3], [1.15, 0.015, 0.03, 0.03]]);
  // secondary: two long armour planes laid over it with no seams of their own
  k.wedge('paint', [[1.0, 0], [0.4, 0.3], [-0.9, 0.28], [-0.9, -0.28], [0.4, -0.3]], 0.03, [0, 0.235, 0]);
  for (const sd of [-1, 1]) {
    k.wedge('paint', [[0.8, 0.14 * sd], [0.3, 0.38 * sd], [-0.9, 0.3 * sd], [-0.9, 0.22 * sd], [0.3, 0.3 * sd]], 0.03, [0, 0.0, 0]);
    // the knife edge: a lit line let into each chine
    s.slit(-0.05, 0.02, sd * 0.375, 1.5, 0.012);
  }
  // the observation trench: a recess down the deck with a thin cold line in it
  k.box('dark', [1.2, 0.03, 0.07], [0.0, 0.245, 0]);
  s.slit(0.0, 0.262, 0, 1.0, 0.016);
  s.lamp(0.55, 0.27, 0, 0.3, 0.03);
  // drives sunk into the stern: dark recesses, no nozzle to see
  k.box('dark', [0.1, 0.3, 0.5], [-1.06, 0, 0]);
  for (const z of [-0.12, 0.12]) { k.cyl('dark', 0.1, 0.12, 0.2, [-1.0, 0, z], 'x', 10, true); s.engines.push([-1.12, 0, z]); k.cyl('glow', 0.07, 0.07, 0.01, [-1.0, 0, z], 'x', 8); }
};

// ═════════════════════════ THE FACTION MARKS ═════════════════════════
// At 150 units a hull is a few dozen pixels: colour says a faction is near, only
// shape says which. Each faction hangs one oversized mark on every hull it
// builds, at the scale of the primary silhouette, so a scout and a fighter of
// the same faction share it. Drawn after the hull (and so on a capital's too).

/** A crane far too big for the hull, on the starboard side only: a slewing base, a lattice truss boom in two lengths, a hydraulic ram, a cable and a hook block. */
const gutterMark: Draw = (s) => {
  const k = s.k;
  k.cyl('dark', 0.13, 0.16, 0.24, [0.0, 0.14, 0.35], 'y', 8);
  k.cyl('hull', 0.17, 0.17, 0.05, [0.0, 0.27, 0.35], 'y', 10);
  truss(s, [0.0, 0.3, 0.35], [0.55, 0.8, 0.95], 0.14, 6);
  truss(s, [0.55, 0.8, 0.95], [1.05, 0.45, 1.5], 0.1, 5);
  // the ram: a trim-coloured cylinder and a bright piston from the base to a third of the way up the boom
  k.pipeTo('trim', [0.12, 0.17, 0.4], [0.3, 0.62, 0.7], 0.035, 7);
  k.pipeTo('hull', [0.3, 0.62, 0.7], [0.4, 0.74, 0.82], 0.02, 6);
  s.beam('dark', [1.05, 0.45, 1.5], [1.07, -0.1, 1.52], 0.025);
  k.box('dark', [0.14, 0.1, 0.16], [1.07, -0.15, 1.52]);
  k.cyl('hull', 0.05, 0.05, 0.05, [1.07, -0.08, 1.52], 'y', 8);
  s.lamp(1.07, -0.15, 1.52, 0.07);
  s.lamp(0.55, 0.8, 0.95, 0.06);
};

/** A tall, ordered row of fins down the spine, evenly spaced: the fleet's drill-square signature. */
const custodyMark: Draw = (s) => {
  const k = s.k;
  k.box('dark', [1.5, 0.05, 0.1], [-0.15, 0.1, 0]);
  for (let i = 0; i < 6; i++) {
    const x = 0.45 - i * 0.26;
    k.box('paint', [0.05, 0.4, 0.2], [x, 0.3, 0]);
    k.box('trim', [0.06, 0.04, 0.22], [x, 0.51, 0]);
  }
  s.lamp(0.45, 0.55, 0, 0.05);
  s.lamp(-1.05, 0.55, 0, 0.05);
};

/** A long sweeping crescent: a blade that rises from midships and runs well back past the tail. */
const officeMark: Draw = (s) => {
  const N = 10, at = (t: number): V3 => [0.35 - 2.3 * t, 0.12 + 0.55 * Math.sin(Math.PI * Math.pow(t, 0.8) * 0.85), 0];
  for (let i = 0; i < N; i++) {
    const a = at(i / N), b = at((i + 1) / N), h = 0.05 + 0.1 * Math.sin(Math.PI * (i + 0.5) / N);
    s.beam(i % 3 === 0 ? 'patch' : 'paint', a, b, h, 0.04);
  }
  s.beam('trim', at(0.1), at(0.9), 0.012, 0.06);
  for (const t of [0.12, 0.3, 0.5]) s.beam('dark', [at(t)[0], 0.1, 0], at(t), 0.03);
  s.lamp(...at(1), 0.07, 0.03);
};

/** A crusted foundry mass on the deck, off to one side, its stacks leaning aft. */
const voiceMark: Draw = (s) => {
  const k = s.k, rnd = s.rnd;
  for (let i = 0; i < 6; i++) k.box(i % 2 ? 'hull' : 'dark', [0.2 + rnd() * 0.2, 0.12 + rnd() * 0.18, 0.16 + rnd() * 0.16], [0.35 - i * 0.14, 0.14 + rnd() * 0.1, -0.2 - rnd() * 0.12], [rnd() * 0.3, rnd() * 0.5, rnd() * 0.3]);
  for (let i = 0; i < 3; i++) {
    const x = 0.2 - i * 0.2, z = -0.3 + i * 0.05, top: V3 = [x - 0.5 - i * 0.08, 0.7 + i * 0.1, z];
    s.beam('dark', [x, 0.2, z], top, 0.1);
    s.beam('hull', [x - 0.15, 0.32, z], [top[0] - 0.02, top[1] - 0.05, z], 0.13);
    s.lamp(top[0], top[1] + 0.03, z, 0.05);
  }
};

/** One long dark crystal spike, grown out of the hull and not built. */
const threnMark: Draw = (s) => {
  const k = s.k;
  k.shard('crystal', [[0, -0.8], [0.12, -0.7], [0.2, -0.1], [0.2, 0.3], [0.08, 0.6], [0, 1.1]], [-0.3, 0.55, 0.1], [0, 0, 1.05]);
  k.shard('violet', [[0, -0.4], [0.06, -0.3], [0.08, 0.1], [0, 0.55]], [-0.3, 0.55, 0.1], [0, 0, 1.05]);
  s.lamp(-0.78, 1.1, 0.1, 0.05);
};

const MARKS: Record<Faction, Draw> = { gutter: gutterMark, custody: custodyMark, office: officeMark, voice: voiceMark, thren: threnMark };
const marked = (faction: Faction, draw: Draw): Draw => (s) => { draw(s); MARKS[faction](s); };

const DESIGNS_BASE: Record<string, Draw> = {
  'scout:gutter': gutterBird(false),
  'stalker:gutter': gutterBird(true),
  'raptor:gutter': gutterRaptor,
  'freighter:gutter': gutterBarge,
  'freighter:office': officeLiner,
  'scout:custody': custodyBird(false),
  'stalker:custody': custodyBird(true),
  'raptor:custody': custodyBird(false),
  'lancer:custody': custodyLancer,
  'freighter:custody': custodyFreighter,
  'warbird:office': officeWarbird,
  'scout:office': officeScout,
  'drone:voice': voiceDrone,
  'stalker:voice': voiceProbe,
  'weaver:thren': threnWeaver,
  'lancer:thren': threnLancer,
  'scout:thren': threnScout,
};

const DESIGNS: Record<string, Draw> = Object.fromEntries(Object.entries(DESIGNS_BASE).map(([key, draw]) => [key, marked(key.split(':')[1] as Faction, draw)]));

/** The designed hull for an archetype in a faction's colours, or null for a pairing with no design yet. */
export function designFor(kind: AlienKind, faction: Faction): Design | null {
  const draw = DESIGNS[`${kind}:${faction}`];
  if (!draw) return null;
  const s = new Ship(seeded(kind.length * 31 + kind.charCodeAt(0) + faction.length * 7));
  draw(s);
  return { k: s.k, engines: s.engines, lamps: s.lamps };
}

// ═════════════════════════ THE CAPITALS ═════════════════════════
// A boss is the fighter's design drawn some five times larger, so the eye has
// room for more than the fighter carried: hangar mouths, a second battery,
// cable runs, hull numbers, radiator fins and an antenna farm. Added to the same
// kit before it is built, so the bake covers it. Each follows its faction's rule.

type Dress = (s: Ship) => void;

/** A hangar mouth let into a flank: a dark recess, a lit slit inside it, hazard bars at the lip. */
function hangar(s: Ship, x: number, y: number, z: number, len: number, h: number): void {
  const k = s.k, sd = Math.sign(z);
  k.box('dark', [len, h, 0.05], [x, y, z]);
  k.box('glow', [len * 0.8, 0.012, 0.012], [x, y + h * 0.3, z + sd * 0.03]);
  k.box('trim', [len + 0.03, 0.014, 0.03], [x, y + h * 0.5 + 0.007, z + sd * 0.012]);
  k.box('trim', [len + 0.03, 0.014, 0.03], [x, y - h * 0.5 - 0.007, z + sd * 0.012]);
  for (let i = 0; i < 4; i++) k.box('trim', [0.012, h, 0.02], [x - len * 0.5 + (i + 0.5) * len / 4, y, z + sd * 0.03], [0, 0, 0.5]);
  s.lamp(x, y + h * 0.3, z + sd * 0.04, len * 0.7, 0.02);
}

/** Hull numbering: a few short trim bars, as stencilled on a flank. */
function numerals(s: Ship, x: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++) s.k.box('trim', [0.012, 0.07 + (i % 2) * 0.03, 0.01], [x + i * 0.035, y, z]);
}

/** A fin radiator: a thin plate on a stalk, with ribs. */
function radiator(s: Ship, x: number, y: number, z: number, w: number, h: number): void {
  const k = s.k;
  k.box('hull', [w, h, 0.012], [x, y + h / 2, z]);
  for (let i = 0; i < 4; i++) k.box('dark', [w * 0.9, 0.01, 0.018], [x, y + h * (0.15 + i * 0.22), z]);
  k.box('dark', [0.03, 0.04, 0.03], [x, y, z]);
}

const CAPITAL: Record<string, Dress> = {
  // a regulation cruiser: a second battery, hangars on both flanks, hull numbers, an antenna farm
  'lancer:custody': (s) => {
    const k = s.k;
    for (const sd of [-1, 1]) {
      hangar(s, -0.52, -0.02, sd * 0.545, 0.34, 0.12);
      numerals(s, 0.2, -0.02, sd * 0.545, 4);
      s.pipe(-0.9, 0.6, -0.12, sd * 0.46, 0.014);
      s.pipe(-0.8, 0.5, -0.15, sd * 0.4, 0.012);
      // a point-defence mount on each shoulder
      k.cyl('dark', 0.05, 0.06, 0.05, [0.5, 0.0, sd * 0.56], 'y', 8);
      k.cyl('hull', 0.012, 0.012, 0.14, [0.58, 0.04, sd * 0.56], 'x', 5);
      radiator(s, -0.95, 0.19, sd * 0.2, 0.22, 0.16);
      // a docking collar under the bow, with a lit ring
      k.ring('hull', 0.07, 0.016, [0.9, -0.06, sd * 0.1], 'y', 12);
    }
    // two heavy turrets on the spine, in front of the bridge
    for (const x of [0.45, 0.12]) {
      k.cyl('paint', 0.11, 0.13, 0.05, [x, 0.285, 0], 'y', 10);
      k.cyl('dark', 0.08, 0.08, 0.06, [x, 0.335, 0], 'y', 10);
      for (const o of [-0.03, 0.03]) k.cyl('dark', 0.016, 0.016, 0.3, [x + 0.19, 0.335, o], 'x', 6);
    }
    // seams across the keel plates, and an antenna farm behind the bridge
    for (let i = 0; i < 7; i++) k.box('dark', [0.01, 0.012, 0.3], [0.6 - i * 0.14, 0.2, 0]);
    for (let i = 0; i < 4; i++) s.mast(-0.5 - i * 0.13, 0.25, (i % 2 ? 1 : -1) * 0.06, 0.12 + (i % 3) * 0.08, i % 2 ? 'blade' : 'none');
    s.lamp(-0.62, 0.42, 0.06, 0.03); s.lamp(-0.8, 0.45, -0.06, 0.03);
  },
  // a ruin that still works: a boom crane, spot lamps, welded patches and a cargo grab slung under the wing
  'raptor:gutter': (s) => {
    const k = s.k;
    for (const sd of [-1, 1]) {
      // a welded scab across the wing, with a row of bolts
      k.box(sd > 0 ? 'patch' : 'paint', [0.34, 0.025, 0.24], [-0.15, 0.13, sd * 0.45], [0, sd * 0.3, 0]);
      s.bolts(-0.3, 0, sd * 0.45, 0.145, 5);
      // a floodlight on a stalk, lit
      k.cyl('dark', 0.01, 0.012, 0.1, [-0.8, 0.12, sd * 0.7], 'y', 5);
      k.box('hull', [0.05, 0.035, 0.05], [-0.8, 0.185, sd * 0.7]);
      s.lamp(-0.78, 0.2, sd * 0.7, 0.05);
      // cable swag along the wing's trailing edge
      s.pipe(-0.95, -0.2, 0.0, sd * 0.78, 0.01);
    }
    // a crane boom on the neck, tipped with a hook
    k.box('dark', [0.5, 0.03, 0.03], [0.55, 0.14, 0.0], [0, 0, 0.12]);
    k.cyl('dark', 0.006, 0.006, 0.16, [0.8, 0.07, 0], 'y', 4);
    k.box('hull', [0.04, 0.025, 0.04], [0.8, -0.02, 0]);
    // a cargo grab slung under the neck, beside the existing fuel tank
    for (const sd of [-1, 1]) k.box('dark', [0.22, 0.02, 0.02], [0.35, -0.1, sd * 0.07], [sd * 0.3, 0, 0]);
    for (let i = 0; i < 3; i++) s.mast(-0.1 - i * 0.18, 0.22, 0.55 - i * 0.55, 0.1 + i * 0.05, 'none');
    s.vents(-0.8, 0.3, 0.235, 3, 0.2, 0.2);
  },
  // quiet and swept: thin lit lines along the crescents, recessed sensor blades, one tall antenna
  'warbird:office': (s) => {
    const k = s.k;
    for (const sd of [-1, 1]) {
      s.slit(0.15, 0.13, sd * 0.12, 0.7, 0.01);
      k.box('trim', [0.5, 0.01, 0.02], [-0.35, 0.02, sd * 0.45], [0, -0.25 * sd, 0]);
      k.box('hull', [0.14, 0.05, 0.012], [0.55, 0.12, sd * 0.07], [0, sd * 0.2, 0]);
      radiator(s, -0.55, 0.12, sd * 0.12, 0.28, 0.12);
      // recessed gun housings in the crescents
      k.box('dark', [0.14, 0.03, 0.05], [-0.25, 0.04, sd * 0.78], [sd * 0.2, 0, 0]);
      s.lamp(-0.2, 0.06, sd * 0.78, 0.1, 0.012);
    }
    k.cyl('dark', 0.008, 0.012, 0.5, [-0.35, 0.4, 0], 'y', 5);
    k.cyl('hull', 0.035, 0.01, 0.012, [-0.35, 0.65, 0], 'y', 10);
    s.lamp(-0.35, 0.67, 0, 0.03);
  },
  // a foundry cube: frame ribs on every edge, chimney stacks and a heavy blast shield at the cutter
  'drone:voice': (s) => {
    const k = s.k;
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) k.box('hull', [1.3, 0.05, 0.05], [0, sy * 0.46, sz * 0.46], [0, 0, 0]);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, y = 0.62 + (i % 2) * 0.08;
      k.cyl('dark', 0.035, 0.05, 0.22 + (i % 3) * 0.08, [-0.2 + Math.cos(a) * 0.3, y + 0.1, Math.sin(a) * 0.3], 'y', 6);
      k.ring('hull', 0.05, 0.01, [-0.2 + Math.cos(a) * 0.3, y + 0.2 + (i % 3) * 0.04, Math.sin(a) * 0.3], 'y', 8);
    }
    for (const sd of [-1, 1]) {
      s.pipe(-0.5, 0.5, 0.78, sd * 0.45, 0.02);
      s.pipe(-0.5, 0.5, -0.78, sd * 0.45, 0.02);
      s.lamp(0.2, 0.74, sd * 0.2, 0.18, 0.025);
    }
    for (let i = 0; i < 4; i++) k.box('dark', [0.04, 0.5, 0.012], [1.02, 0, (i - 1.5) * 0.12]);
  },
};

/** Rough extent of each capital's hull: nose x, tail x, half-width, deck height. */
const CAP_EXTENT: Record<string, [number, number, number, number]> = {
  lancer: [1.0, -1.0, 0.6, 0.28], raptor: [1.2, -0.9, 0.8, 0.2], warbird: [1.0, -0.6, 0.9, 0.18], drone: [0.8, -0.8, 0.7, 0.8], weaver: [1.0, -0.9, 0.7, 0.4],
};

/**
 * What a capital ship has that a fighter has not, to say how big it is: maintenance catwalks with railings along both
 * flanks, a scatter of deck machinery, and a ring of navigation and warning beacons at the extremities. The Office's is
 * left clean (its hulls show nothing they need not) and the Thren's is grown: a third of floating segments and lit nodes.
 */
function scale(s: Ship, kind: AlienKind, faction: Faction): void {
  const e = CAP_EXTENT[kind];
  if (!e) return;
  const [nose, tail, w, h] = e, k = s.k, rnd = seeded(kind.length * 11 + faction.length * 3 + 1);
  if (faction === 'thren') {
    carapace(s, [[nose * 0.7, 0.75, 0.9], [nose * 0.2, 0.85, 2.6], [tail * 0.4, 0.8, 4.2], [tail * 0.8, 0.65, 5.4]]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.4; shard(s, 'violet', 0.05, 0.2, [nose * 0.1 - i * 0.15, Math.sin(a) * 0.5, Math.cos(a) * 0.5], [a, 0, Math.PI / 2]); s.lamp(nose * 0.1 - i * 0.15, Math.sin(a) * 0.55, Math.cos(a) * 0.55, 0.05); }
    return;
  }
  if (faction !== 'office') {
    // catwalks: a rail and a toe-board each side, posts every few hand-spans, a ladder down at either end
    for (const sd of [-1, 1]) {
      const z = sd * w * 0.62, y = h + 0.04, x0 = tail * 0.7, x1 = nose * 0.55;
      s.beam('dark', [x0, y, z], [x1, y, z], 0.012, 0.03);
      s.beam('hull', [x0, y + 0.07, z], [x1, y + 0.07, z], 0.01, 0.01);
      for (let i = 0; i <= 8; i++) k.box('hull', [0.01, 0.07, 0.01], [x0 + (x1 - x0) * i / 8, y + 0.035, z]);
      for (const x of [x0, x1]) s.beam('dark', [x, y, z], [x, y - 0.1, z - sd * 0.04], 0.012, 0.02);
    }
    k.greebles('dark', rnd, tail * 0.7, nose * 0.5, -w * 0.4, w * 0.4, h + 0.02, 22, 0.07);
  }
  // beacons: one at the bow, one atop, one on each flank and one astern; the lamp blink is theirs
  s.lamp(nose * 0.9, h + 0.05, 0, 0.06);
  s.lamp(0, h + 0.35, 0, 0.06);
  s.lamp(tail * 0.9, h + 0.05, 0, 0.06);
  for (const sd of [-1, 1]) s.lamp(0, 0.0, sd * (w + 0.03), 0.06);
}

/** A capital ship's hull: the fighter's design plus a second pass of detail, or null where there is no design. */
export function capitalDesign(kind: AlienKind, faction: Faction): Design | null {
  const draw = DESIGNS[`${kind}:${faction}`];
  if (!draw) return null;
  const s = new Ship(seeded(kind.length * 31 + kind.charCodeAt(0) + faction.length * 7));
  draw(s);
  CAPITAL[`${kind}:${faction}`]?.(s);
  scale(s, kind, faction);
  return { k: s.k, engines: s.engines, lamps: s.lamps };
}

// ═════════════════════════ THE DEAD ═════════════════════════
// A hulk is a design cut open: a breach torn through the top deck with its ribs showing, plates peeled back, cable
// hanging from the edge and one cold lamp that has not died. Built into the same kit before the bake.

/** Where each design is torn open: centre x, y (the deck top), z, and the breach's length (x) and width (z). */
const BREACH: Record<string, [number, number, number, number, number]> = {
  'lancer:custody': [0.3, 0.27, 0, 0.7, 0.3],
  'raptor:gutter': [-0.55, 0.23, 0, 0.75, 0.8],
  'warbird:office': [0.1, 0.15, 0, 0.6, 0.22],
  'drone:voice': [0, 0.62, 0, 0.7, 0.7],
  'freighter:custody': [0.0, 0.16, 0, 0.7, 0.24],
};

/** A design, torn open and cold, for the dead hulks. */
export function deadDesign(kind: AlienKind, faction: Faction): Design | null {
  const draw = DESIGNS[`${kind}:${faction}`];
  const b = BREACH[`${kind}:${faction}`];
  if (!draw || !b) return null;
  const s = new Ship(seeded(kind.length * 31 + kind.charCodeAt(0) + faction.length * 7));
  draw(s);
  const k = s.k, rnd = seeded(kind.length * 57 + faction.length * 13 + 5), [x, y, z, w, d] = b;
  // the hole: a dark recess, scorched round the edge
  k.box('dark', [w, 0.03, d], [x, y + 0.004, z]);
  k.box('dark', [w * 1.25, 0.012, d * 1.3], [x, y + 0.002, z]);
  // ribs standing in it, some with their top bar still on, some broken short
  for (let i = 0; i < 8; i++) {
    const rx = x - w * 0.45 + (i / 7) * w * 0.9, h = 0.1 + rnd() * 0.12;
    for (const sd of [-1, 1]) if (rnd() < 0.85) k.box('hull', [0.03, h, 0.03], [rx, y + h / 2, z + sd * d * 0.46]);
    if (i % 2 === 0) {
      const len = d * (0.45 + rnd() * 0.5), from = rnd() < 0.5 ? -1 : 1;
      k.box('hull', [0.03, 0.026, len], [rx, y + h, z + from * (d * 0.46 - len / 2)]);
      k.box('hull', [0.03, 0.026, len * 0.45], [rx, y + h * 0.55, z - from * (d * 0.46 - len * 0.22)], [0.4 * from, 0, 0]);
    }
  }
  for (const sd of [-1, 1]) k.box('hull', [w * 0.8, 0.018, 0.02], [x, y + 0.045, z + sd * d * 0.46]);
  // plates peeled back from the edge
  for (let i = 0; i < 3; i++) {
    const sd = i === 1 ? -1 : 1;
    k.box(i === 2 ? 'patch' : 'paint', [0.2, 0.014, 0.15], [x - w * 0.3 + i * w * 0.3, y + 0.05, z + sd * (d * 0.58)], [sd * (0.7 + rnd() * 0.5), 0, 0]);
  }
  // cable hanging from the lip
  for (let i = 0; i < 4; i++) k.cyl('dark', 0.005, 0.005, 0.12 + rnd() * 0.1, [x - w * 0.35 + i * w * 0.22, y - 0.03, z + (rnd() < 0.5 ? -1 : 1) * d * 0.5], 'y', 4);
  // the lamp that has not quite died
  k.box('lamp', [0.018, 0.012, 0.018], [x + w * 0.35, y + 0.02, z - d * 0.3]);
  return { k, engines: s.engines, lamps: s.lamps };
}

// ═════════════════════════ THE ELITES ═════════════════════════
// An elite is its hull with something added that tells you what it will do, in the shape of the thing, before the halo
// does: a mantlet for armour, outboard nacelles for speed, hardpoints for the gunner, split vents for the volatile.
// Every elite also carries two red warning strobes. Built once per elite, kind and faction, from the hull's rough extent.

/** Where an elite's accessories hang: the hull's nose x, tail x, half-width and deck height. */
export type Extent = [number, number, number, number];

export interface EliteDesign extends Design { strobes: V3[]; }

/** The accessories of one elite modifier on a hull of the given extent, in the faction's own coat. */
export function eliteDesign(id: EliteId, [nose, tail, w, h]: Extent, seed: number): EliteDesign {
  const s = new Ship(seeded(seed)), k = s.k, len = nose - tail, mid = (nose + tail) / 2;
  const strobes: V3[] = [[tail + len * 0.28, h + 0.16, 0], [tail + len * 0.12, h * 0.3, w * 0.85], [tail + len * 0.12, h * 0.3, -w * 0.85]];
  k.box('dark', [0.03, 0.1, 0.03], [strobes[0]![0], h + 0.07, 0]);
  for (const sd of [-1, 1]) k.box('dark', [0.03, 0.03, 0.12], [strobes[1]![0], h * 0.3, sd * (w * 0.85 - 0.05)]);
  switch (id) {
    case 'armoured':
      // a thick chamfered mantlet over the prow and a skirt of plate down each flank
      mantlet(s, nose - len * 0.38, nose + 0.06, Math.max(0.1, w * 0.3), h * 0.55);
      mantlet(s, nose - len * 0.38, nose + 0.06, Math.max(0.1, w * 0.3), -h * 0.2);
      for (const sd of [-1, 1]) {
        k.box('hull', [len * 0.5, h * 0.7, 0.05], [mid + len * 0.05, h * 0.1, sd * (w * 0.3 + 0.06)], [sd * 0.12, 0, 0]);
        k.box('trim', [len * 0.46, 0.02, 0.055], [mid + len * 0.05, h * 0.42, sd * (w * 0.3 + 0.06)]);
      }
      break;
    case 'swift':
      // two outboard nacelles on stub spars, their own drives lit
      for (const sd of [-1, 1]) {
        const z = sd * Math.max(0.38, w * 0.62);
        s.beam('hull', [mid - len * 0.1, 0, sd * w * 0.2], [mid - len * 0.2, 0, z], 0.05, 0.05);
        k.cyl('dark', 0.05, 0.07, len * 0.5, [mid - len * 0.2, 0, z], 'x', 8);
        s.bell(tail + len * 0.05, 0, z, 0.06);
        k.box('trim', [len * 0.3, 0.012, 0.03], [mid - len * 0.05, 0.065, z]);
      }
      break;
    case 'gunner':
      // two extra hardpoints on the shoulders, muzzles lit
      for (const sd of [-1, 1]) {
        const z = sd * Math.max(0.2, w * 0.4);
        s.gun(mid + len * 0.05, h * 0.55, z, len * 0.5, 0.028, 0.035);
        k.cyl('glow', 0.03, 0.03, 0.012, [mid + len * 0.05 + len * 0.55, h * 0.55 + 0.011, z + 0.035], 'x', 6);
        k.cyl('glow', 0.03, 0.03, 0.012, [mid + len * 0.05 + len * 0.55, h * 0.55 + 0.011, z - 0.035], 'x', 6);
        s.lamp(mid + len * 0.05 + len * 0.55, h * 0.55 + 0.011, z, 0.05);
      }
      break;
    case 'volatile':
      // hot seams across the deck and a pair of strapped canisters, the fuel it will go up with
      for (let i = 0; i < 4; i++) s.slit(mid - len * 0.28 + i * len * 0.18, h + 0.015, (i % 2 ? 1 : -1) * w * 0.12, 0.14, 0.022);
      for (const sd of [-1, 1]) {
        s.tank(mid - len * 0.1, h * 0.2, sd * (w * 0.32 + 0.1), len * 0.4, 0.07, 'patch');
        k.cyl('glow', 0.073, 0.073, 0.03, [mid - len * 0.1, h * 0.2, sd * (w * 0.32 + 0.1)], 'x', 8);
      }
      break;
    case 'regenerative':
      // two repair arms folded along the spine, each with a lit tip
      for (const sd of [-1, 1]) {
        s.beam('hull', [mid + len * 0.2, h + 0.02, sd * 0.05], [mid - len * 0.2, h + 0.2, sd * w * 0.3], 0.03, 0.03);
        k.cyl('dark', 0.03, 0.03, 0.06, [mid - len * 0.2, h + 0.2, sd * w * 0.3], 'y', 6);
        s.lamp(mid - len * 0.2, h + 0.24, sd * w * 0.3, 0.05);
      }
      break;
    case 'spinner':
      // a projector ring at the prow with a lit disc, the thing it casts the web from
      k.ring('hull', Math.max(0.12, w * 0.28), 0.025, [nose + 0.05, 0, 0], 'x', 12);
      k.cyl('glow', Math.max(0.1, w * 0.25), Math.max(0.1, w * 0.25), 0.012, [nose + 0.03, 0, 0], 'x', 12);
      for (const sd of [-1, 1]) s.beam('hull', [nose - 0.3, 0, sd * 0.06], [nose + 0.03, 0, sd * Math.max(0.12, w * 0.28)], 0.03, 0.03);
      break;
    case 'cloaked':
      // a sensor blade up top and a lit lens
      k.box('hull', [0.2, 0.2, 0.012], [mid, h + 0.1, 0]);
      s.lamp(mid + 0.08, h + 0.2, 0, 0.04);
      break;
  }
  return { k, engines: s.engines, lamps: s.lamps, strobes };
}
