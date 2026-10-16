import type { Stats } from '../sim/stats';

// ── the ship's four systems: the yard's modules ───────────────────────────
// What the Wayward is, beyond the guns: four systems, each fitted with
// modules at a port's yard (the Story mode). They sit in the refit bay with
// everything else (content/web.ts, marked `story`), paid in Cyrite like every
// part, and fitted only while docked, so ports keep their pull.
//
//   Guns      · hardpoints, plate, a gunnery rig, a shield projector.
//   Rig       · racks, a machine shop, an ore tractor, a capacitor bank. A Rig
//               ship stays out longer and carries more.
//   Signals   · baffles, an array, a jammer, a spoofer, a ghost echo. A
//               Signals ship goes dark, spoofs, jams, sees further and makes
//               the chart lie to whoever follows it.
//   Contacts  · a guild ledger, names in the Gutter, friends on the docks. A
//               Contacts ship opens doors.
//
// Each one changes how a system plays rather than only adding to it.
// Several open comms choices: a module can set a flag aboard (the spoofer
// loads clean codes) or count as fitted kit a card asks for (the jammer does
// what a scanner suite does). Fitted modules live in the build's levels
// (sim/build.ts) under their ids, so they save, load and show in a card's
// needs like everything else fitted; the marks in each system name the ship
// and open endings.

export type ShipSystem = 'guns' | 'rig' | 'signals' | 'contacts';

export const SHIP_SYSTEMS: ShipSystem[] = ['guns', 'rig', 'signals', 'contacts'];

export interface SystemDef {
  name: string;
  /** What a ship built mostly on this system is called. */
  identity: string;
}

export const SYSTEM_DEFS: Record<ShipSystem, SystemDef> = {
  guns: { name: 'Guns', identity: 'Gunboat' },
  rig: { name: 'Rig', identity: 'Deep hauler' },
  signals: { name: 'Signals', identity: 'Ghost' },
  contacts: { name: 'Contacts', identity: 'Fixer' },
};

export interface ModuleDef {
  id: string;
  name: string;
  system: ShipSystem;
  /** Marks it can be fitted to. */
  max: number;
  /** The benefit of one more mark, one sentence. */
  text: string;
  /** Change the stat block for owning mark `mk` (called once per mark owned). */
  stats?: (s: Stats, mk: number) => void;
  /** Supplies the hold carries, per mark. */
  hold?: number;
  /** Parts a patch saves, per mark. */
  patch?: number;
  /** How much slower heat climbs, per mark (0.1: a tenth slower). */
  quiet?: number;
  /** How much the read and the chart's sightings sharpen. */
  sensors?: number;
  /** Off what a port charges for Cyrite, food and plates, per mark. */
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

export const MODULES: ModuleDef[] = [
  // ── guns ──────────────────────────────────────────────────────────────
  {
    id: 'md_hardpoints', name: 'Hardpoints', system: 'guns', max: 3,
    text: 'Every weapon hits harder. Counts as a torpedo bay.',
    stats: (s) => { s.dmgAll *= 1.1; },
    counts: ['tp_bay'],
  },
  {
    id: 'md_plate', name: 'Armour plate', system: 'guns', max: 2,
    text: 'One more plate of hull.',
    stats: (s) => { s.maxPlates += 1; },
  },
  {
    id: 'md_gunnery', name: 'Gunnery rig', system: 'guns', max: 2,
    text: 'Lasers and torpedoes reload faster.',
    stats: (s) => { s.laserCooldown *= 0.9; s.torpReload *= 0.9; },
  },
  {
    id: 'md_projector', name: 'Shield projector', system: 'guns', max: 2,
    text: 'One more shield charge.',
    stats: (s) => { s.shieldMax += 1; },
  },

  // ── rig ───────────────────────────────────────────────────────────────
  {
    id: 'md_racks', name: 'Cargo racks', system: 'rig', max: 3,
    text: 'Holds 4 more supplies.',
    hold: 4,
  },
  {
    id: 'md_shop', name: 'Machine shop', system: 'rig', max: 2,
    text: 'Patching costs 1 supply less.',
    patch: 1,
  },
  {
    id: 'md_tractor', name: 'Ore tractor', system: 'rig', max: 2,
    text: 'Pulls in pickups from further away.',
    stats: (s) => { s.tractor *= 1.3; },
  },
  {
    id: 'md_capacitor', name: 'Capacitor bank', system: 'rig', max: 2,
    text: 'Your shield recharges sooner and faster.',
    stats: (s) => { s.shieldRecharge *= 0.8; s.shieldDelay *= 0.8; },
  },

  // ── signals ───────────────────────────────────────────────────────────
  {
    id: 'md_baffles', name: 'Baffles', system: 'signals', max: 2,
    text: 'Heat builds slower.',
    quiet: 0.125,
  },
  {
    id: 'md_array', name: 'Long-range array', system: 'signals', max: 1,
    text: 'Better reads, and sight back in dust and shrouds. Spots Calloway more often.',
    sensors: 0.15,
  },
  {
    id: 'md_jammer', name: 'Jammer', system: 'signals', max: 1,
    text: 'Opens jam choices. Filters a static field.',
    counts: ['ut_scanner'],
  },
  {
    id: 'md_spoofer', name: 'Transponder spoofer', system: 'signals', max: 1,
    text: 'Forged codes, every system.',
    flags: ['codes'],
  },
  {
    id: 'md_ghost', name: 'Ghost echo', system: 'signals', max: 2,
    text: 'Slows Calloway at every jump. Mk 2 hides your route.',
    echo: 1,
  },

  // ── contacts ──────────────────────────────────────────────────────────
  {
    id: 'md_ledger', name: 'Guild ledger', system: 'contacts', max: 2,
    text: 'Ports cost 10% less.',
    discount: 0.1,
  },
  {
    id: 'md_names', name: 'Names in the Gutter', system: 'contacts', max: 1,
    text: 'A friend in the Gutter.',
    flags: ['gutter_friend'],
  },
  {
    id: 'md_dock', name: 'Friends on the docks', system: 'contacts', max: 1,
    text: 'Docking cools heat more.',
    dockCool: 0.2,
  },
];

export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));
