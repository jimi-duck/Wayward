import { BRANCHES, UPGRADE, UPGRADES, type Branch, type UpgradeDef } from '../content/upgrades';
import { applyModules } from './modules';
import { flightHull, capStats, newStats, type Stats } from './stats';
import { topSpeed, turnPerStep } from './ship';
import { HZ, PX } from './tuning';

// ── the build ─────────────────────────────────────────────────────────────
// What the player has made of the ship: a level per upgrade id (each card
// taken at a refit adds one). Everything else (the stat block, the
// figures a card would change, the name the ship ends up with) is worked
// out from it, so a build can be saved, compared or replayed.

export type Levels = Record<string, number>;

/** The stat block for a build: base, every owned level in tree order, the fitted modules (sim/modules.ts), then the caps. */
export function computeStats(levels: Levels): Stats {
  const s = newStats();
  for (const u of UPGRADES) {
    const lv = levels[u.id] ?? 0;
    for (let i = 1; i <= lv; i++) u.apply(s, i);
  }
  applyModules(s, levels);
  return capStats(s);
}

/** Levels owned in a branch. */
export function branchLevels(levels: Levels, branch: Branch): number {
  let n = 0;
  for (const u of UPGRADES) if (u.branch === branch) n += levels[u.id] ?? 0;
  return n;
}

/** How much of the build carries each tag: the sum of owned levels of upgrades with it. */
export function tagWeights(levels: Levels): Map<string, number> {
  const w = new Map<string, number>();
  for (const u of UPGRADES) {
    const lv = levels[u.id] ?? 0;
    if (!lv) continue;
    for (const t of u.tags) if (t !== 'unlock' && t !== 'once') w.set(t, (w.get(t) ?? 0) + lv);
  }
  return w;
}

/** Specialisation groups already settled. */
function takenGroups(levels: Levels): Set<string> {
  const g = new Set<string>();
  for (const u of UPGRADES) if (u.group && (levels[u.id] ?? 0) > 0) g.add(u.group);
  return g;
}

/** Can this upgrade be offered now? */
export function available(u: UpgradeDef, levels: Levels, unlocked: ReadonlySet<string>): boolean {
  if ((levels[u.id] ?? 0) >= u.max) return false;
  if (u.locked && !unlocked.has(u.id)) return false;
  if (u.requires && !u.requires.every((r) => (levels[r.id] ?? 0) >= (r.lv ?? 1))) return false;
  if (u.group) {
    if (takenGroups(levels).has(u.group)) return false;
    if (branchLevels(levels, u.branch) < (u.needs ?? 0)) return false;
  }
  return true;
}

export interface Fig { label: string; from: string; to: string; cost: boolean; }

/** What one more level of an upgrade would change, as figures. */
export function upgradeFigures(levels: Levels, id: string): Fig[] {
  return figures(computeStats(levels), computeStats({ ...levels, [id]: (levels[id] ?? 0) + 1 }));
}

// ── figures ───────────────────────────────────────────────────────────────
// Every number a card can change, how to read it and which way is better.
// A card shows the rows whose value it changes, as "before → after".

interface FigDef { label: string; get: (s: Stats) => number; fmt: (v: number) => string; lower?: boolean; }

const f1 = (v: number) => v.toFixed(1);
const f0 = (v: number) => String(Math.round(v));
const sec = (v: number) => `${v.toFixed(1)}s`;
const m = (v: number) => `${Math.round(v / PX)} m`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const off = (on: boolean, v: number) => (on ? v : 0);
const dash = (fmt: (v: number) => string) => (v: number) => (v === 0 ? '—' : fmt(v));

export const FIGURES: FigDef[] = [
  { label: 'Lance damage', get: (s) => s.laserDamage, fmt: f1 },
  { label: 'Laser shots/sec', get: (s) => 1 / s.laserCooldown, fmt: f1 },
  { label: 'Lances per shot', get: (s) => s.laserLances, fmt: f0 },
  { label: 'Lance reach', get: (s) => s.laserSpeed * s.laserLife, fmt: m },
  { label: 'Targets pierced', get: (s) => s.laserPierce, fmt: f0 },
  { label: 'Laser bank', get: (s) => s.bankMax, fmt: f0 },
  { label: 'Bank refill/sec', get: (s) => s.bankRefill, fmt: f0 },
  { label: 'Energy per shot', get: (s) => s.bankShot, fmt: f1, lower: true },
  { label: 'Torpedo rack', get: (s) => off(s.torpedoes, s.torpRack), fmt: dash(f0) },
  { label: 'Torpedo reload', get: (s) => off(s.torpedoes, s.torpReload), fmt: dash(sec), lower: true },
  { label: 'Torpedoes per press', get: (s) => off(s.torpedoes, s.torpSalvo), fmt: dash(f0) },
  { label: 'Blast damage', get: (s) => off(s.torpedoes, s.torpDamage), fmt: dash(f1) },
  { label: 'Blast radius', get: (s) => off(s.torpedoes, s.torpBlast), fmt: dash(m) },
  { label: 'Torpedo turn', get: (s) => off(s.torpedoes, (s.torpTurn * 180) / Math.PI), fmt: dash((v) => `${Math.round(v)}°/s`) },
  { label: 'Seeker reach', get: (s) => off(s.torpedoes, s.torpSeek), fmt: dash(m) },
  { label: 'Bomblets', get: (s) => s.torpCluster, fmt: f0 },
  { label: 'Mine damage', get: (s) => off(s.mines, s.mineDamage), fmt: dash(f1) },
  { label: 'Mine blast', get: (s) => off(s.mines, s.mineBlast), fmt: dash(m) },
  { label: 'Mine every', get: (s) => off(s.mines, s.mineInterval), fmt: dash(sec), lower: true },
  { label: 'Mines out', get: (s) => off(s.mines, s.mineMax), fmt: dash(f0) },
  { label: 'Mine trigger', get: (s) => off(s.mines, s.mineTrigger), fmt: dash(m) },
  { label: 'Mine life', get: (s) => off(s.mines, s.mineLife), fmt: dash(sec) },
  { label: 'Plasma burn/sec', get: (s) => off(s.plasma, s.plasmaDps), fmt: dash(f1) },
  { label: 'Trail lasts', get: (s) => off(s.plasma, s.plasmaLife), fmt: dash(sec) },
  { label: 'Afterburn/sec', get: (s) => s.plasmaBurn, fmt: dash(f1) },
  { label: 'Arc damage', get: (s) => off(s.arc, s.arcDamage), fmt: dash(f1) },
  { label: 'Arc every', get: (s) => off(s.arc, s.arcInterval), fmt: dash(sec), lower: true },
  { label: 'Arc targets', get: (s) => off(s.arc, s.arcTargets), fmt: dash(f0) },
  { label: 'Arc reach', get: (s) => off(s.arc, s.arcRange), fmt: dash(m) },
  { label: 'Arc jumps', get: (s) => s.arcJumps, fmt: f0 },
  { label: 'Ram damage', get: (s) => s.ramDamage, fmt: f0 },
  { label: 'Top speed', get: (s) => topSpeed(flightHull(s)), fmt: (v) => `${Math.round(v / PX)} m/s` },
  { label: 'Turn rate', get: (s) => (turnPerStep(flightHull(s)) * HZ * 180) / Math.PI, fmt: (v) => `${Math.round(v)}°/s` },
  { label: 'Grip in turns', get: (s) => s.grip, fmt: (v) => `${Math.round(v * 1000) / 10}%/step` },
  { label: 'Roll every', get: (s) => s.rollCooldown, fmt: sec, lower: true },
  { label: 'Roll cover', get: (s) => s.rollIframes, fmt: sec },
  { label: 'Hull plates', get: (s) => s.maxPlates, fmt: f0 },
  { label: 'Shield charges', get: (s) => s.shieldMax, fmt: dash(f0) },
  { label: 'Shield recharge', get: (s) => off(s.shieldMax > 0, s.shieldRecharge), fmt: dash(sec), lower: true },
  { label: 'Shield wait', get: (s) => off(s.shieldMax > 0, s.shieldDelay), fmt: dash(sec), lower: true },
  { label: 'Grace after a hit', get: (s) => s.grace, fmt: sec },
  { label: 'Tractor reach', get: (s) => s.tractor, fmt: m },
  { label: 'Krail yield', get: (s) => s.xpMult, fmt: pct },
  { label: 'Overcharge gain', get: (s) => s.ocGain, fmt: pct },
  { label: 'Release radius', get: (s) => s.ocRadius, fmt: m },
  { label: 'Release damage', get: (s) => s.ocDamage, fmt: f0 },
  { label: 'Overload', get: (s) => s.ocOverload, fmt: sec },
  { label: 'All weapon damage', get: (s) => s.dmgAll, fmt: pct },
  { label: 'Krail from rock', get: (s) => s.crystalChance, fmt: pct },
  { label: 'Repair drops', get: (s) => s.repairChance, fmt: pct },
  { label: 'Power-up time', get: (s) => s.powerTime, fmt: pct },
  { label: 'Rare rock', get: (s) => s.rareRate, fmt: pct },
  { label: 'Elite krail', get: (s) => s.eliteLoot, fmt: pct },
  { label: 'Disruptor bolt every', get: (s) => s.disruptor, fmt: dash((v) => `${v} shots`), lower: true },
  { label: 'Roll cloak', get: (s) => s.rollCloak, fmt: dash(sec) },
  { label: 'Snare', get: (s) => s.snare, fmt: dash(sec) },
];

export function figures(before: Stats, after: Stats): Fig[] {
  const out: Fig[] = [];
  for (const d of FIGURES) {
    const a = d.get(before), b = d.get(after);
    const fa = d.fmt(a), fb = d.fmt(b);
    if (fa === fb) continue;
    // a figure appearing from nothing (a system switched on) is never a cost
    out.push({ label: d.label, from: fa, to: fb, cost: a !== 0 && (d.lower ? b > a : b < a) });
  }
  return out;
}

// ── what the ship became ──────────────────────────────────────────────────

export interface Identity {
  /** "Swarm torpedo boat", "Heavy-lance gunship / minelayer". */
  title: string;
  /** Branches by levels owned, deepest first (synergies left out). */
  branches: Array<{ branch: Branch; levels: number }>;
  /** Specialisations taken, by name. */
  specs: string[];
}

const SPEC_PREFIX: Record<string, string> = {
  ph_cone: 'Cone', ph_lance: 'Heavy-lance', ph_array: 'Array', tp_heavy: 'Heavy', tp_swarm: 'Swarm', tp_precision: 'Precision',
  mn_field: 'Minefield', mn_chain: 'Chain-reaction', mn_gravity: 'Graviton', pl_ignite: 'Incendiary', pl_wake: 'Afterburner',
  cl_storm: 'Storm', cl_juggernaut: 'Juggernaut', mo_drift: 'Drift', mo_evasion: 'Evasive', df_fortress: 'Fortress',
  df_reactive: 'Reactive', df_regenerative: 'Regenerative', oc_nova: 'Nova', oc_overload: 'Overload', oc_phase: 'Phase',
  pl_corona: 'Corona', cl_shock: 'Shock', mo_afterburner: 'Redline', ut_prospector: 'Deep-core', ut_salvager: 'Salvager',
  ut_scanner: 'Scanner',
};

export function identity(levels: Levels): Identity {
  const branches = (Object.keys(BRANCHES) as Branch[])
    .filter((b) => b !== 'synergy' && b !== 'salvage')
    .map((branch) => ({ branch, levels: branchLevels(levels, branch) }))
    .filter((b) => b.levels > 0)
    .sort((a, b) => b.levels - a.levels);
  const specs = UPGRADES.filter((u) => u.kind === 'spec' && (levels[u.id] ?? 0) > 0);
  if (!branches.length) return { title: 'Stock Wayward', branches, specs: [] };
  const top = branches[0]!;
  const spec = specs.find((u) => u.branch === top.branch);
  let title = BRANCHES[top.branch].identity;
  if (spec) title = `${SPEC_PREFIX[spec.id] ?? spec.name} ${title.toLowerCase()}`;
  const second = branches[1];
  if (second && second.levels >= top.levels * 0.6 && second.levels >= 3) title += ` / ${BRANCHES[second.branch].identity.toLowerCase()}`;
  return { title, branches, specs: specs.map((u) => u.name) };
}

