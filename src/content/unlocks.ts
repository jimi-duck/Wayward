import type { RunStats } from '../sim/run';

// ── between runs ──────────────────────────────────────────────────────────
// Long-term progression opens possibilities rather than adding permanent
// bonuses: the base ship never gets stronger between runs, the player gets
// more options. Each unlock is earned by doing something in a run, and the
// logbook on the start screen shows the hint for every one still locked, so
// a player always knows what to try next.
//
// An unlock grants ids: upgrade ids (locked cards in content/upgrades.ts),
// sector event ids (locked rows in sim/encounters.ts), challenge modifier
// ids (MODIFIERS below) or cosmetic ids (COSMETICS below).

export interface Lifetime {
  runs: number;
  kills: number;
  capitals: number;
  dilithium: number;
  /** Capital-ship kills by faction. */
  capitalsBy: Record<string, number>;
  bestTime: number;
  bestScore: number;
}

export type UnlockKind = 'specialisation' | 'synergy' | 'event' | 'modifier' | 'cosmetic';

export interface UnlockDef {
  id: string;
  kind: UnlockKind;
  name: string;
  /** What it opens up, in a sentence. */
  text: string;
  /** How to earn it: shown in the logbook while locked. */
  hint: string;
  grants: string[];
  earned(run: RunStats, life: Lifetime): boolean;
}

const weaponKills = (r: RunStats, w: keyof RunStats['killsBy']) => r.killsBy[w];
const owns = (r: RunStats, id: string) => (r.build[id] ?? 0) > 0;

export const UNLOCKS: UnlockDef[] = [
  {
    id: 'u_swarm', kind: 'specialisation', name: 'Swarm launcher', grants: ['tp_swarm'],
    text: 'A torpedo specialisation: three micro-torpedoes per press.',
    hint: 'Destroy 25 ships with torpedoes in one run.',
    earned: (r) => weaponKills(r, 'torpedo') >= 25,
  },
  {
    id: 'u_graviton', kind: 'specialisation', name: 'Graviton mines', grants: ['mn_gravity'],
    text: 'A mine specialisation: mines that drag their targets in.',
    hint: 'Destroy a capital ship with the mine layer fitted.',
    earned: (r) => r.capitals > 0 && owns(r, 'mn_layer'),
  },
  {
    id: 'u_regenerative', kind: 'specialisation', name: 'Regenerative hull', grants: ['df_regenerative'],
    text: 'A defence specialisation, salvaged from the Borg: a plate that grows back.',
    hint: 'Destroy a Borg cube.',
    earned: (r) => r.capitalFactions.includes('borg'),
  },
  {
    id: 'u_juggernaut', kind: 'specialisation', name: 'Juggernaut', grants: ['cl_juggernaut'],
    text: 'A close-quarters specialisation: an armoured prow for ramming.',
    hint: 'Destroy 12 ships by ramming them in one run.',
    earned: (r) => weaponKills(r, 'ram') >= 12,
  },
  {
    id: 'u_phase', kind: 'specialisation', name: 'Phase cloak', grants: ['oc_phase'],
    text: 'A warp-core specialisation: release to phase out and ram through anything.',
    hint: 'Release 6 overcharges in one run.',
    earned: (r) => r.overcharges >= 6,
  },
  {
    id: 'u_ramjet', kind: 'synergy', name: 'Ramjet', grants: ['sy_ramjet'],
    text: 'A synergy of ram prow and impulse engines: roll into hulls to ram them untouched.',
    hint: 'Reach refit 12.',
    earned: (r) => r.refit >= 12,
  },
  {
    id: 'u_derelict', kind: 'event', name: 'Derelict hulks', grants: ['derelict'],
    text: 'A new sector event: salvage a drifting hulk, and spring its trap.',
    hint: 'Survive 5 minutes.',
    earned: (r) => r.time >= 300,
  },
  {
    id: 'u_anomaly', kind: 'event', name: 'Spatial anomalies', grants: ['anomaly'],
    text: 'A new sector event: a gravity well that drags everything in.',
    hint: 'Destroy 3 capital ships in one run.',
    earned: (r) => r.capitals >= 3,
  },
  {
    id: 'u_ironman', kind: 'modifier', name: 'Ironman', grants: ['ironman'],
    text: 'A challenge: no hull repairs drop, for half again the score.',
    hint: 'Survive 8 minutes.',
    earned: (r) => r.time >= 480,
  },
  {
    id: 'u_glass', kind: 'modifier', name: 'Glass cannon', grants: ['glass'],
    text: 'A challenge: one plate fewer, harder-hitting weapons, more score.',
    hint: 'Score 60,000 in one run.',
    earned: (r) => r.score >= 60000,
  },
  {
    id: 'u_hostile', kind: 'modifier', name: 'Hostile skies', grants: ['hostile'],
    text: 'A challenge: more traffic, tougher hulls, more score.',
    hint: 'Destroy 5 capital ships, across all your runs.',
    earned: (_r, life) => life.capitals >= 5,
  },
  {
    id: 'u_ion', kind: 'cosmetic', name: 'Impulse-red engines', grants: ['engine-ion'],
    text: 'A cosmetic: your engines burn impulse red.',
    hint: 'Complete 5 runs.',
    earned: (_r, life) => life.runs >= 5,
  },
  {
    id: 'u_gold', kind: 'cosmetic', name: 'Tricobalt-gold engines', grants: ['engine-gold'],
    text: 'A cosmetic: your engines burn gold.',
    hint: 'Collect 1,500 dilithium, across all your runs.',
    earned: (_r, life) => life.dilithium >= 1500,
  },
];

// ── challenge modifiers ───────────────────────────────────────────────────

export interface ModifierDef {
  id: string;
  name: string;
  text: string;
  score: number;
  traffic?: number;
  toughness?: number;
  damage?: number;
  plates?: number;
  noRepairs?: boolean;
}

export const MODIFIERS: Record<string, ModifierDef> = {
  ironman: { id: 'ironman', name: 'Ironman', text: 'No hull repairs drop.', score: 1.5, noRepairs: true },
  glass: { id: 'glass', name: 'Glass cannon', text: 'One plate fewer; weapons hit 40% harder.', score: 1.3, damage: 1.4, plates: -1 },
  hostile: { id: 'hostile', name: 'Hostile skies', text: 'More traffic, tougher hulls.', score: 1.4, traffic: 1.35, toughness: 1.2 },
};

// ── cosmetics ─────────────────────────────────────────────────────────────

/** Engine colours (HDR): core and bell. */
export const COSMETICS: Record<string, { name: string; core: [number, number, number]; bell: [number, number, number] }> = {
  'engine-stock': { name: 'Warp cyan', core: [2.6, 3.9, 4.4], bell: [0.3, 2.1, 3.4] },
  // the id is kept from when stock burned red, so profiles that earned it keep it
  'engine-ion': { name: 'Impulse red', core: [4.2, 2.2, 2.6], bell: [3.4, 0.45, 0.9] },
  'engine-gold': { name: 'Tricobalt gold', core: [4.4, 3.6, 2.2], bell: [3.6, 1.8, 0.3] },
};
