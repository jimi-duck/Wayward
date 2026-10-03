import { UPGRADE, type Branch, type UpgradeKind } from './upgrades';

// ── the refit web ─────────────────────────────────────────────────────────
// Every refit point is spent on a node joined to one you already have, so a
// build is a route out from the core across a web of about two hundred
// nodes, not a hand of three cards. Nine regions sit round the core like the
// spokes of a wheel; each is the same shape, filled with its own upgrades:
//
//                 F2   F2   F2      follow-ups behind each specialisation
//                 F1   F1   F1
//                 K1   K2   K3      three specialisations: take one
//                   \   |   /
//          L5 ──── L4 ─ H ─ R4 ──── R5      side pockets, the hub
//                  │  ╲   ╱  │
//                  L3   M3   R3 ┄┄┄ bridge to the next region
//                  │  ╱   ╲  │
//                  L2        R2
//                    ╲      ╱
//                       S             the first big node
//                       │
//                       E             the entry, joined to the core
//                       │
//                     core
//
// Two paths climb each region and cross in the middle, so there is more
// than one way up; pockets hang off the sides; the bridges between
// neighbouring regions carry synergies and shared stats, which is what
// makes the wheel a web. Salvaged tech sits in a ring round the core, each
// opened by destroying its faction's capital ship in the run.
//
// A node adds one level of its upgrade (content/upgrades.ts), so the stat
// block, the figures and the build's name all work as before. Positions are
// in web units; the core is at (0, 0).

export type NodeKind = 'core' | UpgradeKind;

export interface WebNode {
  id: string;
  /** The upgrade this node adds a level of (null for the core). */
  up: string | null;
  kind: NodeKind;
  region: Branch | 'core';
  x: number;
  y: number;
  links: string[];
}

type Slot = 'E' | 'S' | 'L2' | 'R2' | 'L3' | 'M3' | 'R3' | 'L4' | 'R4' | 'H' | 'L5' | 'R5' | 'K1' | 'K2' | 'K3';

interface RegionFill {
  region: Branch;
  /** Upgrade id per slot (omit a slot to leave it out). */
  slots: Partial<Record<Slot, string>>;
  /** Follow-up upgrades behind each specialisation (by its upgrade id). */
  follow?: Record<string, string[]>;
  /** The entry also opens the left path (so a region's side road needs no system first). */
  sideRoad?: boolean;
  /** Pockets beside the hub: PL hangs off L4, PR off R4, both joined to the hub too. */
  pockets?: Partial<Record<'PL' | 'PR', string>>;
}

// round the wheel, counter-clockwise from the top; neighbours share a bridge
const REGIONS: RegionFill[] = [
  {
    region: 'phaser',
    slots: {
      E: 'mi_phaser_dmg', S: 'ph_emitters', L2: 'ph_capacitors', R2: 'ph_bank', L3: 'mi_phaser_rate', M3: 'ph_lenses', R3: 'mi_bank',
      L4: 'ph_pierce', R4: 'ph_emitters', H: 'mi_reach', L5: 'ph_pierce', R5: 'ph_capacitors', K1: 'ph_cone', K2: 'ph_lance', K3: 'ph_array',
    },
    follow: { ph_cone: ['ph_cone_wide', 'ph_cone_wide'], ph_lance: ['ph_lance_cap', 'ph_lance_cap'], ph_array: ['ph_fire_control', 'ph_fire_control'] },
    pockets: { PL: 'mi_phaser_dmg', PR: 'mi_phaser_rate' },
  },
  {
    region: 'torpedo',
    slots: {
      E: 'tp_bay', S: 'tp_yield', L2: 'tp_magazine', R2: 'mi_torp_dmg', L3: 'mi_torp_reload', M3: 'tp_tracking', R3: 'tp_yield',
      L4: 'tp_magazine', R4: 'mi_blast', H: 'tp_tracking', L5: 'tp_magazine', R5: 'tp_yield', K1: 'tp_heavy', K2: 'tp_swarm', K3: 'tp_precision',
    },
    follow: { tp_heavy: ['tp_cluster', 'tp_cluster'], tp_swarm: ['tp_swarm_volley', 'tp_swarm_volley'], tp_precision: ['tp_painter', 'mi_torp_dmg'] },
    pockets: { PL: 'sy_arc_torps', PR: 'mi_torp_reload' },
  },
  {
    region: 'plasma',
    slots: {
      E: 'pl_vent', S: 'pl_heat', L2: 'pl_flow', R2: 'mi_plasma_dps', L3: 'mi_plasma_life', M3: 'pl_heat', R3: 'mi_plasma_dps',
      L4: 'pl_flow', R4: 'pl_heat', H: 'mi_plasma_dps', L5: 'mi_plasma_life', R5: 'mi_plasma_dps', K1: 'pl_ignite', K2: 'pl_corona', K3: 'pl_wake',
    },
    follow: { pl_ignite: ['mi_plasma_dps', 'mi_plasma_dps'], pl_corona: ['mi_plasma_life', 'mi_plasma_dps'], pl_wake: ['mi_roll', 'mi_plasma_life'] },
  },
  {
    region: 'utility',
    slots: {
      E: 'mi_tractor', S: 'ut_tractor', L2: 'ut_matrix', R2: 'mi_tractor', L3: 'mi_xp', M3: 'ut_tractor', R3: 'mi_xp',
      L4: 'ut_matrix', R4: 'ut_tractor', H: 'mi_xp', L5: 'mi_xp', R5: 'mi_tractor', K1: 'ut_prospector', K2: 'ut_salvager', K3: 'ut_scanner',
    },
    follow: { ut_prospector: ['mi_xp', 'mi_tractor'], ut_salvager: ['mi_grace', 'mi_shield'], ut_scanner: ['mi_all_damage', 'mi_xp'] },
  },
  {
    region: 'defence',
    slots: {
      E: 'df_shield', S: 'df_regen', L2: 'df_armour', R2: 'mi_shield', L3: 'df_bulkheads', M3: 'df_regen', R3: 'mi_grace',
      L4: 'df_armour', R4: 'df_regen', H: 'df_control', L5: 'df_bulkheads', R5: 'mi_shield', K1: 'df_fortress', K2: 'df_reactive', K3: 'df_regenerative',
    },
    follow: { df_fortress: ['mi_grace', 'mi_grace'], df_reactive: ['mi_shield', 'mi_all_damage'], df_regenerative: ['mi_grace', 'mi_shield'] },
    sideRoad: true,
  },
  {
    region: 'close',
    slots: {
      E: 'cl_ram', S: 'cl_arc', L2: 'mi_ram', R2: 'cl_arc_power', L3: 'cl_ram', M3: 'mi_arc_dmg', R3: 'cl_arc_reach',
      L4: 'mi_ram', R4: 'cl_arc_power', H: 'mi_arc_dmg', L5: 'cl_ram', R5: 'cl_arc_power', K1: 'cl_juggernaut', K2: 'cl_shock', K3: 'cl_storm',
    },
    follow: { cl_juggernaut: ['mi_ram', 'mi_grace'], cl_shock: ['mi_ram', 'mi_arc_dmg'], cl_storm: ['mi_arc_dmg', 'mi_arc_dmg'] },
    sideRoad: true,
    pockets: { PR: 'cl_arc_reach' },
  },
  {
    region: 'mobility',
    slots: {
      E: 'mi_thrust', S: 'mo_impulse', L2: 'mo_thrusters', R2: 'mo_jets', L3: 'mi_turn', M3: 'mo_dampers', R3: 'mi_roll',
      L4: 'mo_thrusters', R4: 'mo_jets', H: 'mo_impulse', L5: 'mo_dampers', R5: 'mo_jets', K1: 'mo_drift', K2: 'mo_afterburner', K3: 'mo_evasion',
    },
    follow: { mo_drift: ['mi_turn', 'mi_phaser_dmg'], mo_afterburner: ['mi_thrust', 'mi_oc_gain'], mo_evasion: ['mi_roll', 'mi_roll'] },
    pockets: { PL: 'mi_thrust', PR: 'mo_impulse' },
  },
  {
    region: 'overcharge',
    slots: {
      E: 'mi_oc_gain', S: 'oc_coils', L2: 'mi_oc_dmg', R2: 'oc_coils', L3: 'mi_oc_gain', M3: 'mi_oc_dmg', R3: 'oc_coils',
      L4: 'mi_oc_gain', R4: 'mi_oc_dmg', H: 'mi_oc_gain', L5: 'mi_oc_dmg', R5: 'mi_oc_gain', K1: 'oc_nova', K2: 'oc_overload', K3: 'oc_phase',
    },
    follow: { oc_nova: ['mi_oc_dmg', 'mi_oc_dmg'], oc_overload: ['mi_oc_gain', 'mi_all_damage'], oc_phase: ['mi_oc_gain', 'mi_ram'] },
  },
  {
    region: 'mine',
    slots: {
      E: 'mn_layer', S: 'mn_yield', L2: 'mn_racks', R2: 'mi_mine_dmg', L3: 'mi_mine_rate', M3: 'mn_seekers', R3: 'mn_yield',
      L4: 'mn_racks', R4: 'mi_mine_dmg', H: 'mn_seekers', L5: 'mn_racks', R5: 'mn_yield', K1: 'mn_field', K2: 'mn_chain', K3: 'mn_gravity',
    },
    follow: { mn_field: ['mi_mine_rate', 'mi_mine_rate'], mn_chain: ['mi_mine_dmg', 'mi_blast'], mn_gravity: ['mi_mine_dmg', 'mi_blast'] },
    pockets: { PR: 'mi_blast' },
  },
];

/** The bridge between region i and region i+1 (round the wheel). */
const BRIDGES: string[] = [
  'mi_all_damage',  // phaser · torpedo
  'sy_plasma_torps', // torpedo · plasma
  'mi_xp',          // plasma · utility
  'mi_all_damage',  // utility · defence
  'sy_arc_shield',  // defence · close
  'sy_ramjet',      // close · mobility
  'mi_oc_gain',     // mobility · overcharge
  'sy_core_mines',  // overcharge · mine
  'sy_detonator',   // mine · phaser
];

const TECH = ['tech_klingon', 'tech_cardassian', 'tech_romulan', 'tech_borg', 'tech_tholian'];

/** Slot positions on the arm: r out from the region's start, s across it. */
const AT: Record<Slot, [number, number]> = {
  E: [0, 0], S: [1, 0], L2: [2, -1.15], R2: [2, 1.15], L3: [3, -1.45], M3: [3, 0], R3: [3, 1.45],
  L4: [4, -1.15], R4: [4, 1.15], H: [5, 0], L5: [5, -2.35], R5: [5, 2.35], K1: [6.1, -1.55], K2: [6.4, 0], K3: [6.1, 1.55],
};
const ARM_LINKS: Array<[Slot, Slot]> = [
  ['E', 'S'], ['S', 'L2'], ['S', 'R2'], ['L2', 'L3'], ['L2', 'M3'], ['R2', 'R3'], ['R2', 'M3'], ['L3', 'L4'], ['M3', 'L4'], ['M3', 'R4'],
  ['R3', 'R4'], ['L4', 'H'], ['R4', 'H'], ['L4', 'L5'], ['R4', 'R5'], ['H', 'K1'], ['H', 'K2'], ['H', 'K3'],
];
/** Where an arm starts, and the length of a step along it. */
const R0 = 2.6, STEP = 1.12;

function build(): WebNode[] {
  const nodes: WebNode[] = [{ id: 'core', up: null, kind: 'core', region: 'core', x: 0, y: 0, links: [] }];
  const byId = new Map<string, WebNode>([['core', nodes[0]!]]);
  const link = (a: string, b: string) => {
    const na = byId.get(a)!, nb = byId.get(b)!;
    if (!na.links.includes(b)) na.links.push(b);
    if (!nb.links.includes(a)) nb.links.push(a);
  };
  const add = (id: string, up: string, region: Branch, x: number, y: number) => {
    const u = UPGRADE[up];
    if (!u) throw new Error(`web: no upgrade ${up}`);
    const n: WebNode = { id, up, kind: u.kind, region, x, y, links: [] };
    nodes.push(n);
    byId.set(id, n);
    return n;
  };
  const N = REGIONS.length;
  const angle = (i: number) => Math.PI / 2 + (i / N) * Math.PI * 2;
  const place = (i: number, r: number, s: number): [number, number] => {
    const a = angle(i), dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
    const rr = R0 + r * STEP;
    return [dx * rr + px * s, dy * rr + py * s];
  };

  REGIONS.forEach((reg, i) => {
    const id = (slot: string) => `${reg.region}.${slot}`;
    for (const [slot, up] of Object.entries(reg.slots) as Array<[Slot, string]>) {
      const [r, sx] = AT[slot];
      const [x, y] = place(i, r, sx);
      add(id(slot), up, reg.region, x, y);
    }
    for (const [a, b] of ARM_LINKS) if (reg.slots[a] && reg.slots[b]) link(id(a), id(b));
    if (reg.sideRoad) link(id('E'), id('L2'));
    link('core', id('E'));
    // follow-ups behind each specialisation
    for (const k of ['K1', 'K2', 'K3'] as const) {
      const up = reg.slots[k];
      if (!up) continue;
      const [kr, ks] = AT[k];
      (reg.follow?.[up] ?? []).forEach((f, j) => {
        const [x, y] = place(i, kr + 1 + j * 0.95, ks * (1.2 + j * 0.12));
        add(id(`${k}F${j + 1}`), f, reg.region, x, y);
        link(id(j ? `${k}F${j}` : k), id(`${k}F${j + 1}`));
      });
    }
    // pockets beside the hub
    for (const [p, up] of Object.entries(reg.pockets ?? {}) as Array<['PL' | 'PR', string]>) {
      const [x, y] = place(i, 5, p === 'PL' ? -1.2 : 1.2);
      add(id(p), up, reg.region, x, y);
      link(id(p === 'PL' ? 'L4' : 'R4'), id(p));
      link(id('H'), id(p));
    }
  });

  // bridges between neighbours: R3 of one region to L3 of the next, out between them
  REGIONS.forEach((reg, i) => {
    const next = REGIONS[(i + 1) % N]!;
    const a = (angle(i) + angle(i) + (Math.PI * 2) / N) / 2, rr = R0 + 3.55 * STEP;
    const b = add(`bridge.${reg.region}.${next.region}`, BRIDGES[i]!, 'synergy', Math.cos(a) * rr, Math.sin(a) * rr);
    link(b.id, `${reg.region}.R3`);
    link(b.id, `${next.region}.L3`);
  });

  // salvaged tech: a ring round the core, between the spokes
  TECH.forEach((up, j) => {
    const a = angle(j * 2 + 0.5) + 0.0;
    const n = add(`tech.${up.slice(5)}`, up, 'salvage', Math.cos(a) * 1.35, Math.sin(a) * 1.35);
    link('core', n.id);
  });
  return nodes;
}

export const WEB: readonly WebNode[] = build();
export const WEB_NODE: ReadonlyMap<string, WebNode> = new Map(WEB.map((n) => [n.id, n]));
/** Where each region's label sits: past the end of its arm. */
export const REGION_LABELS: ReadonlyArray<{ region: Branch; x: number; y: number }> = REGIONS.map((r, i) => {
  const a = Math.PI / 2 + (i / REGIONS.length) * Math.PI * 2, rr = R0 + 9.9 * STEP;
  return { region: r.region, x: Math.cos(a) * rr, y: Math.sin(a) * rr };
});
