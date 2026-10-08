import { Kit, seeded, type V3 } from './kit';
import type { AlienKind, Faction } from '../sim/enemies';

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

// ═════════════════════════ THE GUTTER ═════════════════════════
// Survived. Dark structure with mismatched armour: a rust plate beside a
// primer-grey one, a bolted repair, a gun from another ship, a hot scar
// astern. Lopsided on purpose: one side carries what the other lacks.

/** The Interceptor and the Hunter: a swept bird; the Hunter's wings come forward. */
const gutterBird = (fwd: boolean): Draw => (s) => {
  const k = s.k, rnd = s.rnd;
  const f = fwd ? 0.4 : -0.3;
  // primary: a blunt fuselage and two long wings, one with its tip chopped
  k.wedge('hull', [[1.0, 0], [0.5, 0.2], [-0.6, 0.23], [-0.72, 0], [-0.6, -0.23], [0.5, -0.2]], 0.28);
  k.wedge('hull', [[0.62, 0.14], [0.2, 0.2], [-0.5, 0.2], [-0.55, 0.14]], 0.34, [0, -0.02, 0]);
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
  k.wedge('hull', [[1.32, 0], [1.1, 0.2], [0.82, 0.22], [0.82, -0.22], [1.1, -0.2]], 0.24);
  k.wedge('hull', [[0.25, 0.14], [-0.4, 0.8], [-0.95, 0.8], [-0.95, -0.8], [-0.4, -0.8], [0.25, -0.14]], 0.2);
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

/** The Patrol fighter and the Interdictor/Enforcer share the Gutter's archetypes, built to regulation. */
const custodyBird = (fwd: boolean): Draw => (s) => {
  const k = s.k, f = fwd ? 0.38 : -0.3;
  k.wedge('hull', [[1.0, 0], [0.55, 0.22], [-0.6, 0.26], [-0.72, 0.12], [-0.72, -0.12], [-0.6, -0.26], [0.55, -0.22]], 0.3);
  for (const sd of [-1, 1]) {
    k.wedge('hull', [[0.2, 0.2 * sd], [f, 0.95 * sd], [f - 0.34, 0.95 * sd], [-0.5, 0.22 * sd]], 0.08, [0, -0.05, 0], [sd * 0.12, 0, 0]);
    // regulation armour: three identical plates along each wing
    for (let i = 0; i < 3; i++) s.plate('paint', f - 0.02 - i * 0.12 + 0.12, sd * (0.45 + i * 0.16), 0.1, 0.12, -0.0, 0.035);
    // a hardpoint with a pair of guns, standard fit
    s.gun(f + 0.12, -0.03, sd * 0.93, 0.5, 0.028, 0.045);
    k.box('trim', [0.05, 0.015, 0.2], [f - 0.2, 0.025, sd * 0.88]);
    s.lamp(f - 0.2, 0.03, sd * 0.97);
  }
  // spine: a ridge of identical armour modules and a sensor housing
  for (let i = 0; i < 4; i++) { s.plate('paint', 0.4 - i * 0.23, 0, 0.19, 0.3, 0.17, 0.045); k.box('dark', [0.04, 0.02, 0.32], [0.3 - i * 0.23, 0.205, 0]); }
  k.box('trim', [0.9, 0.012, 0.03], [0, 0.18, 0]);
  k.box('dark', [0.36, 0.1, 0.24], [0.3, 0.21, 0]);
  k.wedge('dark', [[0.52, 0], [0.38, 0.1], [0.1, 0.11], [0.1, -0.11], [0.38, -0.1]], 0.05, [0, 0.27, 0]);
  s.slit(0.33, 0.3, 0, 0.18, 0.1);
  s.lamp(0.36, 0.31, 0, 0.18, 0.06);
  // side armour modules, vents, a stencilled band
  for (const sd of [-1, 1]) {
    s.plate('paint', -0.2, sd * 0.2, 0.5, 0.1, 0.0, 0.3);
    s.vents(-0.5, sd * 0.1, 0.16, 3, 0.18, 0.12);
    k.box('trim', [0.12, 0.012, 0.05], [0.1, 0.152, sd * 0.19]);
    s.bolts(-0.45, 0.2, sd * 0.26, 0.15, 6);
  }
  k.cyl('dark', 0.05, 0.065, 0.45, [1.0, -0.02, 0], 'x', 8);
  k.cyl('hull', 0.07, 0.07, 0.05, [1.2, -0.02, 0], 'x', 8);
  s.mast(-0.15, 0.17, 0, 0.3, 'dish');
  // two engines in housings with a manifold between them
  s.bell(-0.8, 0, -0.17, 0.115);
  s.bell(-0.8, 0, 0.17, 0.115);
  k.box('dark', [0.2, 0.1, 0.34], [-0.62, 0, 0]);
  s.pipe(-0.6, 0.0, 0.15, 0.1, 0.014);
};

/** The Heavy cruiser: a long arrowhead, a spine, a bridge tower, two side hulls of batteries, three engines. */
const custodyLancer: Draw = (s) => {
  const k = s.k;
  // primary: arrowhead keel, two flank hulls, a stern block
  k.wedge('hull', [[1.0, 0.55], [1.2, 0], [1.0, -0.55], [0.6, -0.22], [-1.0, -0.22], [-1.08, 0], [-1.0, 0.22], [0.6, 0.22]], 0.24);
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
};

/** The Freighter: a spine, a bridge forward, cargo pods in four pairs, two engines. */
const custodyFreighter: Draw = (s) => {
  const k = s.k;
  k.box('hull', [2.0, 0.14, 0.16], [-0.05, 0, 0]);
  k.wedge('hull', [[1.08, 0], [0.88, 0.17], [0.6, 0.2], [0.6, -0.2], [0.88, -0.17]], 0.26, [0, 0.04, 0]);
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

/** The Plasma cruiser: a double crescent round a slim central hull. */
const officeWarbird: Draw = (s) => {
  const k = s.k;
  // primary: a long slim spear of a hull and two crescents that sweep forward then back
  k.wedge('hull', [[1.15, 0], [0.5, 0.14], [-0.3, 0.17], [-0.65, 0.1], [-0.65, -0.1], [-0.3, -0.17], [0.5, -0.14]], 0.26);
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
};

/** The Ambush fighter (Whisper): a narrow dagger with crescent fins and lit edges. */
const officeScout: Draw = (s) => {
  const k = s.k;
  k.wedge('hull', [[1.05, 0], [0.5, 0.13], [-0.55, 0.16], [-0.72, 0.06], [-0.72, -0.06], [-0.55, -0.16], [0.5, -0.13]], 0.24);
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
};

// ═════════════════════════ THE VOICE ═════════════════════════
// Machinery that builds itself: repeating modules, vents, pipes, no windows,
// no crew. Lit slits where something is working.

/** The Grinder: a foundry cube crusted with machinery, a cutter at the front, one engine behind. */
const voiceDrone: Draw = (s) => {
  const k = s.k, rnd = s.rnd;
  // primary: a cube frame with a cut-away core, fixed corner posts
  k.box('dark', [1.3, 1.3, 1.3], [0, 0, 0]);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) k.box('hull', [0.22, 0.22, 0.22], [sx * 0.66, sy * 0.66, sz * 0.66]);
  // secondary: a module on every face, a grid of plates with lit seams
  for (const [ax, sgn] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]] as const) {
    const o1 = (ax + 1) % 3, o2 = (ax + 2) % 3;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const pos: V3 = [0, 0, 0], size: V3 = [0.5, 0.5, 0.5];
      pos[ax] = sgn * 0.68; size[ax] = 0.1;
      pos[o1] = (i - 0.5) * 0.52; pos[o2] = (j - 0.5) * 0.52; size[o1] = 0.46; size[o2] = 0.46;
      k.box((i + j) % 2 ? 'paint' : 'hull', size, pos);
      // a lit seam between
      const lp: V3 = [0, 0, 0], ls: V3 = [0.4, 0.4, 0.4];
      lp[ax] = sgn * 0.735; ls[ax] = 0.012; lp[o1] = pos[o1]; lp[o2] = pos[o2]; ls[o2] = 0.014;
      if ((i + j) % 2 === 0) k.box('glow', ls, lp);
    }
    // machinery on top of the plates: stacks, pipes, a vent grille
    for (let n = 0; n < 7; n++) {
      const pos: V3 = [0, 0, 0], size: V3 = [0.09, 0.09, 0.09];
      const h = 0.05 + rnd() * 0.14;
      pos[ax] = sgn * (0.73 + h / 2); size[ax] = h;
      pos[o1] = (rnd() - 0.5) * 0.9; pos[o2] = (rnd() - 0.5) * 0.9;
      size[o1] = 0.06 + rnd() * 0.12; size[o2] = 0.06 + rnd() * 0.12;
      k.box('dark', size, pos);
    }
    for (let n = 0; n < 3; n++) {
      const pos: V3 = [0, 0, 0], size: V3 = [0.02, 0.02, 0.02];
      pos[ax] = sgn * 0.8; pos[o1] = (n - 1) * 0.3; pos[o2] = 0; size[o2] = 0.9; size[ax] = 0.025;
      k.box('hull', size, pos);
    }
  }
  // a boom with the cutter on the front face: a ring and a blade
  k.cyl('dark', 0.1, 0.12, 0.3, [0.9, 0, 0], 'x', 8);
  k.ring('hull', 0.22, 0.03, [1.0, 0, 0], 'x', 12);
  k.box('glow', [0.01, 0.4, 0.015], [1.05, 0, 0]);
  s.lamp(1.06, 0, 0, 0.08, 0.02);
  s.lamp(0.7, 0.35, 0.36, 0.2, 0.03);
  s.lamp(0.7, -0.35, -0.36, 0.2, 0.03);
  k.cyl('dark', 0.16, 0.2, 0.3, [-0.82, 0, 0], 'x', 10);
  s.engines.push([-0.86, 0, 0]);
  k.cyl('glow', 0.12, 0.12, 0.01, [-0.7, 0, 0], 'x', 10);
};

/** The Voice probe: a machine-built wedge, a sensor crown, modular flanks. */
const voiceProbe: Draw = (s) => {
  const k = s.k, rnd = s.rnd;
  k.wedge('hull', [[1.0, 0], [0.45, 0.2], [-0.6, 0.23], [-0.72, 0.1], [-0.72, -0.1], [-0.6, -0.23], [0.45, -0.2]], 0.3);
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

/** The Web layer: a crystal body with blade wings and a violet core. */
const threnWeaver: Draw = (s) => {
  const k = s.k;
  // primary: a central long crystal, a counter-crystal, two swept blades of different length
  shard(s, 'crystal', 0.42, 1.9, [0.0, 0, 0], [0, 0, Math.PI / 2], 0.5);
  shard(s, 'violet', 0.2, 0.9, [0.1, 0.0, 0], [0, 0, Math.PI / 2]);
  shard(s, 'crystal', 0.22, 1.0, [0.55, 0.1, 0.18], [0.3, 0.1, Math.PI / 2 - 0.2]);
  shard(s, 'crystal', 0.16, 0.8, [-0.2, -0.16, -0.3], [-0.4, -0.2, Math.PI / 2 + 0.25]);
  for (const sd of [-1, 1]) {
    const L = sd === 1 ? 1.0 : 0.82;
    k.wedge('crystal', [[0.35, 0.12 * sd], [-0.35, L * sd], [-0.75, 0.88 * L * sd], [-0.55, 0.12 * sd]], 0.07, [0, 0, 0], [sd * 0.12, 0, 0]);
    k.wedge('violet', [[0.1, 0.14 * sd], [-0.3, 0.8 * L * sd], [-0.34, 0.8 * L * sd], [0.05, 0.14 * sd]], 0.03, [0, 0.045, 0], [sd * 0.12, 0, 0]);
    shard(s, 'crystal', 0.07, 0.5, [-0.45, 0.0, sd * 0.86 * L], [0, 0, Math.PI / 2 + sd * 0.2]);
  }
  // a ring of small facets round the core, like fruit on a vine
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    shard(s, 'violet', 0.05, 0.22, [-0.35, Math.sin(a) * 0.3, Math.cos(a) * 0.3], [a, 0, Math.PI / 2]);
  }
  s.lamp(0.6, 0.12, 0.15, 0.08, 0.03);
  s.lamp(-0.1, -0.15, -0.3, 0.06);
  s.engines.push([-0.9, 0, 0]);
  shard(s, 'violet', 0.14, 0.4, [-0.75, 0, 0], [0, 0, Math.PI / 2]);
};

/** The Shard cruiser: a heavy blade of crystal over an amber keel. */
const threnLancer: Draw = (s) => {
  const k = s.k;
  shard(s, 'crystal', 0.34, 2.4, [0.0, 0, 0], [0, 0, Math.PI / 2], 0.6);
  shard(s, 'violet', 0.16, 1.3, [0.0, 0.02, 0], [0, 0, Math.PI / 2]);
  // spurs off a keel: three long blades each side, uneven
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = 0.6 - i * 0.55, L = 0.8 - i * 0.12 + (sd > 0 ? 0.1 : 0);
    shard(s, i % 2 ? 'crystal' : 'violet', 0.09 + (2 - i) * 0.02, L, [x, 0.03 * i, sd * (0.34 + L * 0.28)], [0, 0, Math.PI / 2], 0.5);
    k.box('hull', [0.1, 0.05, 0.4], [x, 0, sd * 0.2]);
  }
  shard(s, 'crystal', 0.2, 1.3, [0.95, 0, 0], [0, 0, Math.PI / 2], 0.3);
  // hull ribs underneath: dark struts holding the grown mass
  for (let i = 0; i < 4; i++) { k.box('hull', [0.05, 0.26, 0.1], [0.6 - i * 0.45, -0.22, 0]); }
  k.box('hull', [1.8, 0.05, 0.1], [-0.1, -0.35, 0]);
  s.lamp(0.2, 0.2, 0, 0.14, 0.03);
  s.lamp(-0.4, 0.2, 0.12, 0.05);
  s.lamp(-0.4, 0.2, -0.12, 0.05);
  for (const z of [-0.14, 0, 0.14]) { shard(s, 'violet', 0.09, 0.35, [-1.1, 0, z], [0, 0, Math.PI / 2]); s.engines.push([-1.2, 0, z]); }
};

/** The Thren mote: a small swept shard. */
const threnScout: Draw = (s) => {
  const k = s.k;
  shard(s, 'crystal', 0.2, 1.5, [0.1, 0, 0], [0, 0, Math.PI / 2], 0.5);
  shard(s, 'violet', 0.09, 0.8, [0.1, 0.0, 0], [0, 0, Math.PI / 2]);
  for (const sd of [-1, 1]) {
    k.wedge('crystal', [[0.2, 0.08 * sd], [-0.3, 0.85 * sd], [-0.6, 0.72 * sd], [-0.5, 0.1 * sd]], 0.05, [0, 0, 0], [sd * 0.25, 0, 0]);
    shard(s, 'violet', 0.04, 0.4, [-0.45, 0.0, sd * 0.78], [0, 0, Math.PI / 2 + sd * 0.4]);
  }
  shard(s, 'crystal', 0.1, 0.7, [-0.1, 0.18, 0.08], [0.2, 0.3, Math.PI / 2 - 0.3]);
  s.lamp(0.55, 0.02, 0, 0.1, 0.03);
  s.engines.push([-0.7, 0, 0]);
  shard(s, 'violet', 0.08, 0.3, [-0.62, 0, 0], [0, 0, Math.PI / 2]);
};

const DESIGNS: Record<string, Draw> = {
  'scout:gutter': gutterBird(false),
  'stalker:gutter': gutterBird(true),
  'raptor:gutter': gutterRaptor,
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

/** The designed hull for an archetype in a faction's colours, or null for a pairing with no design yet. */
export function designFor(kind: AlienKind, faction: Faction): Design | null {
  const draw = DESIGNS[`${kind}:${faction}`];
  if (!draw) return null;
  const s = new Ship(seeded(kind.length * 31 + kind.charCodeAt(0) + faction.length * 7));
  draw(s);
  return { k: s.k, engines: s.engines, lamps: s.lamps };
}
