import type { Stats } from '../sim/stats';

// ── the ship's four systems ───────────────────────────────────────────────
// What the Wayward is, beyond the refit rail: four systems, each fitted with
// modules at a port, each grown from its own resource, so how you play is
// how the ship grows.
//
//   Guns      · salvage off the wrecks of what you fought. Hardpoints, plate,
//               a gunnery rig. A Guns ship fights its way through.
//   Rig       · rig parts out of rock cut clean. Racks, a machine shop, a
//               cutter head. A Rig ship stays out longer and carries more.
//   Signals   · signal kit from bluffs that came off and the tech of ships
//               that listen. Baffles, an array, a jammer, a spoofer, a ghost
//               echo. A Signals ship goes dark, spoofs, jams, sees further
//               and makes the chart lie to whoever follows it.
//   Contacts  · favours from deals kept and people helped. A guild ledger,
//               names in the Gutter, friends on the docks. A Contacts ship
//               opens doors.
//
// The refit rail (content/upgrades.ts, the three cards) stays the field
// refit: small gains mid-sortie, paid in ore. Modules are the port refit:
// fewer, bigger, and each one changes how a system plays rather than only
// adding to it. Several open comms choices: a module can set a flag aboard
// (the spoofer loads clean codes) or count as fitted kit a card asks for
// (the jammer does what a scanner suite does).
//
// A module is fitted in marks, each dearer than the last, in the system's
// resource and in chits for the yard. Fitted modules live in the build's
// levels (sim/build.ts) under their ids, so they save, load and show in a
// card's needs like everything else fitted.

export type ShipSystem = 'guns' | 'rig' | 'signals' | 'contacts';

export const SHIP_SYSTEMS: ShipSystem[] = ['guns', 'rig', 'signals', 'contacts'];

export interface SystemDef {
  name: string;
  /** The resource it grows from, as a word for a count ("4 salvage"). */
  resource: string;
  /** Where that resource comes from, for the port. */
  source: string;
  /** What a ship built mostly on this system is called. */
  identity: string;
}

export const SYSTEM_DEFS: Record<ShipSystem, SystemDef> = {
  guns: { name: 'Guns', resource: 'salvage', source: 'Kills and wrecks', identity: 'Gunboat' },
  rig: { name: 'Rig', resource: 'rig parts', source: 'Clean cuts and ore', identity: 'Deep hauler' },
  signals: { name: 'Signals', resource: 'signal kit', source: 'Bluffs, Office and Voice kills', identity: 'Ghost' },
  contacts: { name: 'Contacts', resource: 'favours', source: 'Help, trade and jobs', identity: 'Fixer' },
};

export interface ModuleDef {
  id: string;
  name: string;
  system: ShipSystem;
  /** Marks it can be fitted to. */
  max: number;
  /** For each mark (index 0 is mark one): the system's resource, and chits for the yard. */
  kit: number[];
  chits: number[];
  /** The benefit of one more mark, one sentence. */
  text: string;
  /** Change the stat block for owning mark `mk` (called once per mark owned). */
  stats?: (s: Stats, mk: number) => void;
  /** Ore the hold carries, per mark. */
  hold?: number;
  /** Parts a patch saves, per mark. */
  patch?: number;
  /** How much slower heat climbs, per mark (0.1: a tenth slower). */
  quiet?: number;
  /** How much the read and the chart's sightings sharpen. */
  sensors?: number;
  /** Off what a port charges for Krail, food, plates and refits, per mark. */
  discount?: number;
  /** Docking quiets the pursuit this much more. */
  dockCool?: number;
  /** A false echo left in the lane behind every jump, per mark: the chart lies to whoever follows it. */
  echo?: number;
  /** Flags set aboard at the start of every sortie: what the module opens in the comms. */
  flags?: string[];
  /** Upgrade ids it counts as when a card asks what is fitted. */
  counts?: string[];
}

const marks = (...n: number[]) => n;

export const MODULES: ModuleDef[] = [
  // ── guns ──────────────────────────────────────────────────────────────
  {
    id: 'md_hardpoints', name: 'Hardpoints', system: 'guns', max: 3, kit: marks(3, 5, 8), chits: marks(10, 20, 30),
    text: 'Every weapon hits harder. Counts as a torpedo bay.',
    stats: (s) => { s.dmgAll *= 1.1; },
    counts: ['tp_bay'],
  },
  {
    id: 'md_plate', name: 'Armour plate', system: 'guns', max: 2, kit: marks(4, 7), chits: marks(15, 30),
    text: 'One more plate of hull.',
    stats: (s) => { s.maxPlates += 1; },
  },
  {
    id: 'md_gunnery', name: 'Gunnery rig', system: 'guns', max: 2, kit: marks(4, 6), chits: marks(10, 25),
    text: 'Lasers and torpedoes reload faster.',
    stats: (s) => { s.laserCooldown *= 0.9; s.torpReload *= 0.9; },
  },
  {
    id: 'md_projector', name: 'Shield projector', system: 'guns', max: 2, kit: marks(4, 7), chits: marks(15, 30),
    text: 'One more shield charge.',
    stats: (s) => { s.shieldMax += 1; },
  },

  // ── rig ───────────────────────────────────────────────────────────────
  {
    id: 'md_racks', name: 'Cargo racks', system: 'rig', max: 3, kit: marks(3, 5, 7), chits: marks(10, 20, 30),
    text: 'Holds 15 more ore.',
    hold: 15,
  },
  {
    id: 'md_shop', name: 'Machine shop', system: 'rig', max: 2, kit: marks(4, 6), chits: marks(10, 20),
    text: 'Patching costs 2 parts less.',
    patch: 2,
  },
  {
    id: 'md_tractor', name: 'Ore tractor', system: 'rig', max: 2, kit: marks(3, 6), chits: marks(10, 20),
    text: 'Pulls in pickups from further away.',
    stats: (s) => { s.tractor *= 1.3; },
  },
  {
    id: 'md_capacitor', name: 'Capacitor bank', system: 'rig', max: 2, kit: marks(3, 6), chits: marks(10, 20),
    text: 'Your shield recharges sooner and faster.',
    stats: (s) => { s.shieldRecharge *= 0.8; s.shieldDelay *= 0.8; },
  },

  // ── signals ───────────────────────────────────────────────────────────
  {
    id: 'md_baffles', name: 'Baffles', system: 'signals', max: 2, kit: marks(3, 6), chits: marks(10, 25),
    text: 'Heat builds slower.',
    quiet: 0.125,
  },
  {
    id: 'md_array', name: 'Long-range array', system: 'signals', max: 1, kit: marks(4), chits: marks(20),
    text: 'Better reads. Spots Calloway more often.',
    sensors: 0.15,
  },
  {
    id: 'md_jammer', name: 'Jammer', system: 'signals', max: 1, kit: marks(5), chits: marks(20),
    text: 'Opens jam choices.',
    counts: ['ut_scanner'],
  },
  {
    id: 'md_spoofer', name: 'Transponder spoofer', system: 'signals', max: 1, kit: marks(6), chits: marks(25),
    text: 'Forged codes, every system.',
    flags: ['codes'],
  },
  {
    id: 'md_ghost', name: 'Ghost echo', system: 'signals', max: 2, kit: marks(5, 8), chits: marks(20, 30),
    text: 'Slows Calloway at every jump. Mk 2 hides your route.',
    echo: 1,
  },

  // ── contacts ──────────────────────────────────────────────────────────
  {
    id: 'md_ledger', name: 'Guild ledger', system: 'contacts', max: 2, kit: marks(3, 6), chits: marks(10, 15),
    text: 'Ports cost 10% less.',
    discount: 0.1,
  },
  {
    id: 'md_names', name: 'Names in the Gutter', system: 'contacts', max: 1, kit: marks(4), chits: marks(10),
    text: 'A friend in the Gutter.',
    flags: ['gutter_friend'],
  },
  {
    id: 'md_dock', name: 'Friends on the docks', system: 'contacts', max: 1, kit: marks(4), chits: marks(15),
    text: 'Docking cools heat more.',
    dockCool: 0.2,
  },
];

export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));
