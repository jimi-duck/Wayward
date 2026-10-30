import { BRANCHES, UPGRADE, UPGRADES, type Branch, type UpgradeDef } from '../content/upgrades';
import { applyModules } from './modules';
import { BASE, flightHull, capStats, newStats, type Stats } from './stats';
import { thrustPerStep, topSpeed, turnPerStep } from './ship';
import { HZ, PX } from './tuning';
import { PACING } from './pacing';
import { feelBudgets } from './budgets';
import { midSentence, t } from '../i18n';

// ── the build ─────────────────────────────────────────────────────────────
// What the player has made of the ship: a level per upgrade id (each card
// taken at a refit adds one). Everything else (the stat block, the
// figures a card would change, the name the ship ends up with) is worked
// out from it, so a build can be saved, compared or replayed.

export type Levels = Record<string, number>;

/**
 * The share of a written level's effect that a level past the top of its ladder gives (the Story's ladders do not
 * end): half for the first, a tenth less with each one after. So the tenth extra level is still worth fitting, but a
 * ship cannot out-build the caps by buying one thing for ever.
 */
export const overhaul = (k: number): number => 0.5 * 0.9 ** (k - 1);

/** Apply level `lv` of a ladder written to `max`: in full up to it, at the `overhaul` share beyond. */
export function applyLevel(s: Stats, apply: (s: Stats, lv: number) => void, lv: number, max: number): void {
  if (lv <= max) { apply(s, lv); return; }
  const full: Stats = { ...s }, f = overhaul(lv - max);
  apply(full, lv);
  for (const k of Object.keys(s) as Array<keyof Stats>) {
    const a = s[k], b = full[k];
    if (typeof a === 'number' && typeof b === 'number') (s[k] as number) = a + (b - a) * f;
    else if (typeof b === 'boolean') (s[k] as boolean) = b;
  }
}

/** The stat block for a build: base, every owned level in tree order, the fitted modules (sim/modules.ts), then the caps. */
export function computeStats(levels: Levels): Stats {
  const s = newStats();
  for (const u of UPGRADES) {
    const lv = levels[u.id] ?? 0;
    for (let i = 1; i <= lv; i++) applyLevel(s, u.apply, i, u.max);
  }
  applyModules(s, levels);
  return capStats(s);
}

/** Would one more level of an upgrade change the ship at all, caps included? An endless ladder stops where it would not. */
export function gains(levels: Levels, id: string): boolean {
  return figures(computeStats(levels), computeStats({ ...levels, [id]: (levels[id] ?? 0) + 1 }), false).length > 0;
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
export function available(u: UpgradeDef, levels: Levels, unlocked: ReadonlySet<string>, endless = false): boolean {
  if (!endless && (levels[u.id] ?? 0) >= u.max) return false;
  if (u.locked && !unlocked.has(u.id)) return false;
  if (u.requires && !u.requires.every((r) => (levels[r.id] ?? 0) >= (r.lv ?? 1))) return false;
  if (u.group) {
    if (takenGroups(levels).has(u.group)) return false;
    if (branchLevels(levels, u.branch) < (u.needs ?? 0)) return false;
  }
  return true;
}

export interface Fig {
  label: string; from: string; to: string; cost: boolean;
  /** The change in the figure's own unit, signed: "+0.4", "−0.5s", "+2 m". Where it rounds to nothing, the new value. */
  delta: string;
  /** The change is under 3% of what it was: real, but nothing a player can feel, so a card leaves it out. */
  minor: boolean;
}

/**
 * The three things a ship feels: acceleration, top speed, and the guns' cooldown, as a share of the stock ship's (1 is
 * the stock ship; a cooldown above 1 is slower) and in real units. The upgrades and the loads together, as the ship flies.
 */
export function felt(levels: Levels): { accel: number; speed: number; cooldown: number; accelAbs: number; speedAbs: number; cooldownAbs: number } {
  const s = feelBudgets(computeStats(levels), levels), h = flightHull(s), b = flightHull(BASE);
  return {
    accel: thrustPerStep(h) / thrustPerStep(b), speed: topSpeed(h) / topSpeed(b), cooldown: s.laserCooldown / BASE.laserCooldown,
    // in the game's own units: metres per second squared, metres per second, seconds between laser shots
    accelAbs: (thrustPerStep(h) * HZ) / PX, speedAbs: topSpeed(h) / PX, cooldownAbs: s.laserCooldown,
  };
}

/** What one more level of an upgrade would change, as figures (in the Story mode, `arcade` false, without the arcade's own). */
export function upgradeFigures(levels: Levels, id: string, arcade = true): Fig[] {
  const next = { ...levels, [id]: (levels[id] ?? 0) + 1 };
  // the ship feels the budgets (sim/budgets.ts): a module that runs it hot or heavy shows it
  const at = (lv: Levels) => feelBudgets(computeStats(lv), lv);
  return figures(at(levels), at(next), arcade);
}

// ── figures ───────────────────────────────────────────────────────────────
// Every number a card can change, how to read it and which way is better.
// A card shows the rows whose value it changes, as "before → after".

interface FigDef { label: string; get: (s: Stats) => number; fmt: (v: number) => string; lower?: boolean; /** Only means something in the arcade. */ arcade?: boolean; }

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
  { label: 'Acceleration', get: (s) => (thrustPerStep(flightHull(s)) * HZ) / PX, fmt: (v) => `${v.toFixed(1)} m/s²` },
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
  { label: 'Self-repair, a plate', get: (s) => 1 / s.repairRate, fmt: sec, lower: true, arcade: true },
  { label: 'Self-repair waits', get: (s) => s.repairDelay, fmt: sec, lower: true, arcade: true },
  { label: 'Plates a quiet spell', get: (s) => s.repairMax, fmt: f0, arcade: true },
  { label: 'Spotted from', get: (s) => PACING.notice * s.notice, fmt: m, lower: true, arcade: true },
  { label: 'Quiet between fights', get: (s) => s.lull, fmt: pct, arcade: true },
  { label: 'Tractor reach', get: (s) => s.tractor, fmt: m },
  { label: 'Cyrite yield', get: (s) => s.xpMult, fmt: pct },
  { label: 'All weapon damage', get: (s) => s.dmgAll, fmt: pct },
  { label: 'Cyrite from rock', get: (s) => s.crystalChance, fmt: pct },
  { label: 'Repair drops', get: (s) => s.repairChance, fmt: pct },
  { label: 'Booster time', get: (s) => s.powerTime, fmt: pct },
  { label: 'Boosters', get: (s) => s.boostRate, fmt: pct },
  { label: 'Elite Cyrite', get: (s) => s.eliteLoot, fmt: pct },
  { label: 'Disruptor bolt every', get: (s) => s.disruptor, fmt: dash((v) => `${v} shots`), lower: true },
  { label: 'Drift lance bonus', get: (s) => (s.drift ? s.driftBonus - 1 : 0), fmt: dash(pct) },
  { label: 'Lance homing', get: (s) => s.laserHoming, fmt: dash((v) => `${Math.round((v * 180) / Math.PI)}°/s`) },
  { label: 'Painted target bonus', get: (s) => (s.painter ? s.markBonus - 1 : 0), fmt: dash(pct) },
  { label: 'Plate regrows after', get: (s) => s.regen, fmt: dash(sec), lower: true },
  { label: 'Breach saved', get: (s) => s.damageControl, fmt: dash(() => t('Once a run')) },
  { label: 'Mines seek hulls', get: (s) => s.mineSeek, fmt: dash(() => t('On')) },
  { label: 'Chain reaction', get: (s) => +s.mineChain, fmt: dash(() => t('On')) },
  { label: 'Graviton pull', get: (s) => +s.mineGravity, fmt: dash(() => t('On')) },
  { label: 'Shootable mines', get: (s) => +s.mineDetonate, fmt: dash(() => t('On')) },
  { label: 'Plasma clouds', get: (s) => +s.torpPlasma, fmt: dash(() => t('On')) },
  { label: 'Arc blasts', get: (s) => s.torpArc, fmt: dash((v) => t('{n} hulls', { n: v })) },
  { label: 'Plasma ring on roll', get: (s) => +s.rollBurst, fmt: dash(() => t('On')) },
  { label: 'Plasma corona', get: (s) => +s.plasmaCorona, fmt: dash(() => t('On')) },
  { label: 'Reactive blast', get: (s) => +s.reactive, fmt: dash(() => t('On')) },
  { label: 'Shield-break arc', get: (s) => +s.arcShield, fmt: dash(() => t('On')) },
  { label: 'Rolls ram safely', get: (s) => +s.ramjet, fmt: dash(() => t('On')) },
  { label: 'Ram arcs', get: (s) => +s.ramArc, fmt: dash(() => t('On')) },
  { label: 'Killing rams are free', get: (s) => +s.ramSafe, fmt: dash(() => t('On')) },
  { label: 'Roll cloak', get: (s) => s.rollCloak, fmt: dash(sec) },
  { label: 'Snare', get: (s) => s.snare, fmt: dash(sec) },
];

export function figures(before: Stats, after: Stats, arcade = true): Fig[] {
  const out: Fig[] = [];
  for (const d of FIGURES) {
    if (d.arcade && !arcade) continue;
    const a = d.get(before), b = d.get(after);
    const fa = d.fmt(a), fb = d.fmt(b);
    if (fa === fb) continue;
    // a figure appearing from nothing (a system switched on) is never a cost
    const step = d.fmt(Math.abs(b - a));
    const delta = /[1-9]/.test(step) ? `${b > a ? '+' : '−'}${step}` : fb;
    out.push({ label: d.label, from: fa, to: fb, cost: a !== 0 && (d.lower ? b > a : b < a), delta, minor: a !== 0 && Math.abs(b - a) / Math.abs(a) < 0.03 });
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
  mn_field: 'Minefield', mn_chain: 'Chain-reaction', mn_gravity: 'Graviton', pl_ignite: 'Incendiary', pl_wake: 'Wake',
  cl_storm: 'Storm', cl_juggernaut: 'Juggernaut', mo_drift: 'Drift', mo_evasion: 'Evasive', df_fortress: 'Fortress',
  df_reactive: 'Reactive', df_regenerative: 'Regenerative',
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
  if (!branches.length) return { title: t('Stock Wayward'), branches, specs: [] };
  const top = branches[0]!;
  const spec = specs.find((u) => u.branch === top.branch);
  let title = t(BRANCHES[top.branch].identity);
  if (spec) title = t('{spec} {ship}', { spec: t(SPEC_PREFIX[spec.id] ?? spec.name), ship: midSentence(title) });
  const second = branches[1];
  if (second && second.levels >= top.levels * 0.6 && second.levels >= 3) title += ` / ${midSentence(t(BRANCHES[second.branch].identity))}`;
  return { title, branches, specs: specs.map((u) => u.name) };
}

