// ── the refit bay's web ───────────────────────────────────────────────────
// Every module the Wayward can fit, laid out for the bay: a tab
// per part of the ship, and in each a small web read left to right, tier by
// tier. A node is a module with levels. Most are an upgrade from
// content/upgrades.ts under the same id (its `apply` changes the stat
// block); a few are fittings that exist only here and raise the ship's
// ratings instead.
//
// A node opens once any node it comes `from` is fitted (a node with none is
// open from the start), and then by the upgrade's own rules: what it
// requires, one specialisation per group, a branch deep enough
// (sim/build.ts `available`). Each level costs Krail, more by tier, and
// draws on the ship's budgets:
//
//   power · drawn by what runs: guns, drives, shields, kit. A hard ceiling:
//           what needs more than is free cannot be fitted.
//   mass  · added by plating, racks and heavy gear. Over the frame's rating
//           the ship turns and speeds up slower.
//   heat  · made by weapons and the drive. Over the sinks' rating the guns
//           recharge and reload slower.
//
// In the Story mode the yard's modules (content/modules.ts) sit here too,
// and the heaviest work (the frame, the core's last level) needs a port:
// those are fitted only while docked, for a fee in chits as well.
//
// Nothing comes out once it is in, so the bay shows what an install leaves.
// The reactor core draws no power and is open from the start, so a build
// can always find more power until the core is full.

export type Tab = 'hull' | 'weapons' | 'ordnance' | 'engines' | 'defence' | 'utility' | 'signals' | 'reactor' | 'synergies';

export interface TabDef { name: string; /** Three words, as the reference's header. */ sub: string; }

export const TABS: Record<Tab, TabDef> = {
  hull: { name: 'Hull', sub: 'Plating · structure · the prow' },
  weapons: { name: 'Weapons', sub: 'Lasers · reach · rate' },
  ordnance: { name: 'Ordnance', sub: 'Torpedoes · mines' },
  engines: { name: 'Engines', sub: 'Drive · handling · plasma' },
  defence: { name: 'Defence', sub: 'Shields · the hull arc' },
  utility: { name: 'Utility', sub: 'Tractor · scanners · Cyrite' },
  signals: { name: 'Signals', sub: 'Stealth · sensors · contacts' },
  reactor: { name: 'Reactor', sub: 'Power · heat · the core' },
  synergies: { name: 'Synergies', sub: 'Pairings · salvaged tech' },
};
export const TAB_ORDER = Object.keys(TABS) as Tab[];

export interface Budget { power: number; mass: number; heat: number; }
export const NO_BUDGET: Readonly<Budget> = Object.freeze({ power: 0, mass: 0, heat: 0 });

/** The stock ship's ratings, before any fitting raises them. */
export const RATINGS: Readonly<Budget> = Object.freeze({ power: 8, mass: 8, heat: 8 });
/** What the stock ship draws before anything is fitted: the lasers and the shield. */
export const STOCK_DRAW: Readonly<Budget> = Object.freeze({ power: 3, mass: 0, heat: 2 });
/** Fitted on every ship from the start: the torpedo bay. */
export const STOCK: Readonly<Record<string, number>> = Object.freeze({ tp_bay: 1 });

/** Krail for the first level of a node, by tier (1 to 4); each further level costs LEVEL_STEP more of it. */
export const TIER_COST = [0, 40, 60, 90, 130] as const;
export const LEVEL_STEP = 0.5;
/** The Arcade mode's one price, in Krail, for every level of every module, and the Krail at which its bay opens by itself. Below the old average (60) because the first fits were 40 and a flat price slowed the start; 30 is the owner's call (BALANCE.md). */
export const ARCADE_PRICE = 30;
/** The yard's fee in chits for a level of yard work that is not a module (a module has its own, content/modules.ts). */
export const YARD_FEE = 15;

export interface WebNode {
  id: string;
  tab: Tab;
  /** Column, 1 to 4: how deep into the tab. */
  tier: number;
  /** Lane within the tab, 0 at the top, for the bay's layout. */
  row: number;
  /** Any one of these fitted opens it. None: open from the start. */
  from?: string[];
  /** What each level draws, of power and heat, and adds, of mass. */
  draw: Partial<Budget>;
  /** What each level adds to the ship's ratings (fittings). */
  gives?: Partial<Budget>;
  /** A multiplier on its price, where the tier's alone would be too dear for what it does. */
  price?: number;
  /** Story mode only. */
  story?: boolean;
  /** The Story mode: from this level on it is fitted only at a port's yard (1: every level), for Krail and a fee in chits. */
  yard?: number;
}

/** Nodes of the bay's own, with no upgrade behind them: they raise the ratings. */
export interface Fitting { id: string; name: string; text: string; max: number; }

export const FITTINGS: Fitting[] = [
  { id: 'rx_core', name: 'Reactor core', text: 'A bigger core: more power for everything you fit.', max: 3 },
  { id: 'rx_sinks', name: 'Heat exchangers', text: 'More sinks: your guns and drive run hotter before they suffer.', max: 3 },
  { id: 'hl_frame', name: 'Structural frame', text: 'A stronger frame: the hull carries more mass before it slows.', max: 3 },
];
export const FITTING: Record<string, Fitting> = Object.fromEntries(FITTINGS.map((f) => [f.id, f]));

const n = (id: string, tab: Tab, tier: number, row: number, from: string[] | null, draw: Partial<Budget>, more: Partial<WebNode> = {}): WebNode =>
  ({ id, tab, tier, row, ...(from ? { from } : {}), draw, ...more });

export const WEB: WebNode[] = [
  // ── hull: the frame, plating, the prow, and what keeps it together ──────
  n('hl_frame', 'hull', 1, 0, null, {}, { gives: { mass: 4 }, yard: 1 }),
  n('df_armour', 'hull', 1, 1, null, { mass: 3 }),
  n('cl_ram', 'hull', 1, 2, null, { mass: 2 }),
  n('df_repair', 'hull', 1, 4, null, { power: 1 }),
  n('df_control', 'hull', 2, 0, ['hl_frame'], { power: 1 }),
  n('df_bulkheads', 'hull', 2, 1, ['df_armour'], { mass: 1 }),
  n('df_fortress', 'hull', 3, 0, ['df_control', 'df_bulkheads'], { mass: 3, power: 1 }),
  n('df_reactive', 'hull', 3, 1, ['df_bulkheads'], { power: 1, mass: 1 }),
  n('cl_shock', 'hull', 3, 2, ['cl_ram'], { power: 1, mass: 1 }),
  n('cl_juggernaut', 'hull', 3, 3, ['cl_ram'], { mass: 4 }),
  n('df_regenerative', 'hull', 3, 4, ['df_repair'], { power: 1 }),
  // the yard (the Story mode)
  n('md_plate', 'hull', 2, 2, null, { mass: 2 }, { story: true, yard: 1 }),
  n('md_shop', 'hull', 2, 4, null, { mass: 1 }, { story: true, yard: 1 }),

  // ── weapons: the lasers ─────────────────────────────────────────────────
  n('ph_emitters', 'weapons', 1, 0, null, { heat: 1 }),
  n('ph_capacitors', 'weapons', 1, 1, null, { heat: 1 }),
  n('ph_bank', 'weapons', 1, 2, null, { power: 1 }),
  n('ph_pierce', 'weapons', 2, 0, ['ph_emitters'], { heat: 1 }),
  n('ph_lenses', 'weapons', 2, 2, ['ph_bank'], { heat: 1 }),
  n('ph_lance', 'weapons', 3, 0, ['ph_pierce'], { heat: 2, power: 1 }),
  n('ph_cone', 'weapons', 3, 1, ['ph_capacitors', 'ph_lenses'], { heat: 2, power: 1 }),
  n('ph_array', 'weapons', 3, 2, ['ph_lenses'], { power: 2 }),
  n('ph_lance_cap', 'weapons', 4, 0, ['ph_lance'], { heat: 1 }),
  n('ph_cone_wide', 'weapons', 4, 1, ['ph_cone'], { heat: 1 }),
  n('ph_fire_control', 'weapons', 4, 2, ['ph_array'], { power: 1 }),
  // the yard (the Story mode)
  n('md_hardpoints', 'weapons', 2, 3, null, { power: 1, mass: 1 }, { story: true, yard: 1 }),
  n('md_gunnery', 'weapons', 2, 4, null, { heat: 1 }, { story: true, yard: 1 }),

  // ── ordnance: torpedoes above, mines below ──────────────────────────────
  n('tp_bay', 'ordnance', 1, 1, null, { power: 2, heat: 1, mass: 1 }),
  n('tp_magazine', 'ordnance', 2, 0, ['tp_bay'], { mass: 1 }),
  n('tp_yield', 'ordnance', 2, 1, ['tp_bay'], { heat: 1 }),
  n('tp_tracking', 'ordnance', 2, 2, ['tp_bay'], { power: 1 }),
  // the torpedo and mine specialisations cost less than their tier: those builds have to save past more of the ladder
  n('tp_heavy', 'ordnance', 3, 0, ['tp_magazine', 'tp_yield'], { mass: 1, heat: 1 }, { price: 0.7 }),
  n('tp_swarm', 'ordnance', 3, 1, ['tp_yield'], { power: 1, heat: 1 }, { price: 0.7 }),
  n('tp_precision', 'ordnance', 3, 2, ['tp_tracking'], { power: 1 }, { price: 0.7 }),
  n('tp_cluster', 'ordnance', 4, 0, ['tp_heavy'], { mass: 1 }, { price: 0.65 }),
  n('tp_swarm_volley', 'ordnance', 4, 1, ['tp_swarm'], { heat: 1 }, { price: 0.65 }),
  n('tp_painter', 'ordnance', 4, 2, ['tp_precision'], { power: 1 }, { price: 0.65 }),
  n('mn_layer', 'ordnance', 1, 4, null, { power: 1, mass: 2 }),
  n('mn_yield', 'ordnance', 2, 3, ['mn_layer'], { heat: 1 }),
  n('mn_racks', 'ordnance', 2, 4, ['mn_layer'], { mass: 1 }),
  n('mn_seekers', 'ordnance', 2, 5, ['mn_layer'], { power: 1 }),
  n('mn_field', 'ordnance', 3, 3, ['mn_yield', 'mn_racks'], { mass: 2 }, { price: 0.7 }),
  n('mn_chain', 'ordnance', 3, 4, ['mn_yield', 'mn_racks'], { heat: 1 }, { price: 0.7 }),
  n('mn_gravity', 'ordnance', 3, 5, ['mn_seekers'], { power: 2 }, { price: 0.7 }),

  // ── engines: the drive and handling above, drive plasma below ───────────
  n('mo_impulse', 'engines', 1, 0, null, { power: 1, heat: 1 }),
  n('mo_thrusters', 'engines', 1, 1, null, { power: 1 }),
  n('mo_dampers', 'engines', 2, 1, ['mo_thrusters'], { mass: 1 }),
  n('mo_jets', 'engines', 2, 2, ['mo_thrusters'], { power: 1 }),
  n('mo_afterburner', 'engines', 3, 0, ['mo_impulse'], { heat: 2, power: 1 }),
  n('mo_drift', 'engines', 3, 1, ['mo_dampers'], { power: 1 }),
  n('mo_evasion', 'engines', 3, 2, ['mo_jets'], { power: 1 }),
  n('pl_vent', 'engines', 1, 4, null, { power: 2, heat: 2 }),
  n('pl_heat', 'engines', 2, 3, ['pl_vent'], { heat: 1 }),
  n('pl_flow', 'engines', 2, 5, ['pl_vent'], { heat: 1 }),
  n('pl_ignite', 'engines', 3, 3, ['pl_heat'], { heat: 1 }),
  n('pl_corona', 'engines', 3, 4, ['pl_heat', 'pl_flow'], { heat: 2 }),
  n('pl_wake', 'engines', 3, 5, ['pl_flow'], { heat: 1 }),

  // ── defence: shields above, the hull arc below ──────────────────────────
  n('df_shield', 'defence', 1, 0, null, { power: 2 }),
  n('df_regen', 'defence', 2, 0, ['df_shield'], { power: 1 }),
  n('cl_arc', 'defence', 1, 2, null, { power: 2, heat: 1 }),
  n('cl_arc_power', 'defence', 2, 1, ['cl_arc'], { heat: 1 }),
  n('cl_arc_reach', 'defence', 2, 2, ['cl_arc'], { power: 1 }),
  n('cl_storm', 'defence', 3, 2, ['cl_arc_power', 'cl_arc_reach'], { power: 1, heat: 1 }),
  // the yard (the Story mode)
  n('md_projector', 'defence', 2, 3, null, { power: 2 }, { story: true, yard: 1 }),
  n('md_capacitor', 'defence', 2, 4, null, { power: 1 }, { story: true, yard: 1 }),

  // ── utility ─────────────────────────────────────────────────────────────
  n('ut_tractor', 'utility', 1, 0, null, { power: 1 }),
  n('ut_matrix', 'utility', 1, 1, null, { power: 1 }),
  n('ut_quiet', 'utility', 1, 2, null, { power: 1 }),
  n('ut_tactical', 'utility', 2, 1, ['ut_tractor', 'ut_matrix'], { power: 1, heat: 1 }),
  n('ut_prospector', 'utility', 3, 0, ['ut_tractor'], { power: 1 }),
  n('ut_salvager', 'utility', 3, 1, ['ut_matrix'], { power: 1 }),
  n('ut_scanner', 'utility', 3, 2, ['ut_quiet', 'ut_matrix'], { power: 2 }),
  // the yard (the Story mode)
  n('md_racks', 'utility', 1, 3, null, { mass: 2 }, { story: true, yard: 1 }),
  n('md_tractor', 'utility', 2, 3, ['md_racks'], { power: 1 }, { story: true, yard: 1 }),

  // ── signals: the yard's quiet kit and the people you know (the Story mode) ──
  n('md_baffles', 'signals', 1, 0, null, { mass: 1 }, { story: true, yard: 1 }),
  n('md_array', 'signals', 1, 1, null, { power: 1 }, { story: true, yard: 1 }),
  n('md_jammer', 'signals', 2, 1, ['md_array'], { power: 1 }, { story: true, yard: 1 }),
  n('md_spoofer', 'signals', 2, 0, ['md_baffles'], { power: 1 }, { story: true, yard: 1 }),
  n('md_ghost', 'signals', 3, 0, ['md_spoofer', 'md_jammer'], { power: 1 }, { story: true, yard: 1 }),
  n('md_ledger', 'signals', 1, 3, null, {}, { story: true, yard: 1 }),
  n('md_names', 'signals', 2, 3, ['md_ledger'], {}, { story: true, yard: 1 }),
  n('md_dock', 'signals', 2, 4, ['md_ledger'], {}, { story: true, yard: 1 }),

  // ── reactor: power and heat ────────────────────────
  n('rx_core', 'reactor', 1, 0, null, { heat: 1 }, { gives: { power: 3 }, yard: 3 }),
  n('rx_sinks', 'reactor', 1, 1, null, { mass: 1 }, { gives: { heat: 4 } }),

  // ── synergies (each needs its two halves) and salvaged tech ─────────────
  n('sy_plasma_torps', 'synergies', 1, 0, null, { power: 1, heat: 1 }),
  n('sy_detonator', 'synergies', 1, 1, null, { power: 1, heat: 1 }),
  n('sy_arc_shield', 'synergies', 1, 2, null, { power: 1, heat: 1 }),
  n('sy_ramjet', 'synergies', 1, 3, null, { power: 1, heat: 1 }),
  n('sy_arc_torps', 'synergies', 1, 4, null, { power: 1, heat: 1 }),
  n('tech_gutter', 'synergies', 2, 0, null, { power: 1 }),
  n('tech_custody', 'synergies', 2, 1, null, { power: 1 }),
  n('tech_office', 'synergies', 2, 2, null, { power: 1 }),
  n('tech_voice', 'synergies', 2, 3, null, { power: 1 }),
  n('tech_thren', 'synergies', 2, 4, null, { power: 1 }),
];

export const NODE: Record<string, WebNode> = Object.fromEntries(WEB.map((w) => [w.id, w]));
