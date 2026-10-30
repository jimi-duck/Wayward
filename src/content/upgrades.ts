import type { ShipSystem } from './modules';
import type { Stats } from '../sim/stats';

// ── what can be fitted ────────────────────────────────────────────────────
// One ship, many builds. Everything the ship can become is listed here; a
// refit deals three of them as cards (sim/offers.ts) and you take one. Nine
// branches, each a system or a few stat upgrades leading to three
// specialisations, with synergies between neighbours.
//
//   Weapons ─┬─ Lasers ──── emitters, capacitors, bank, lenses, pierce
//            │                └─ specialise: Cone · Heavy lance · Targeting array
//            ├─ Torpedoes ── bay ─ magazine, yield, tracking
//            │                └─ specialise: Heavy payload · Swarm · Precision
//            ├─ Mines ────── layer ─ yield, racks, seekers
//            │                └─ specialise: Minefield · Chain reaction · Graviton
//            ├─ Plasma ───── vent ─ heat, flow
//            │                └─ specialise: Ignition · Afterburner wake · Corona
//            └─ Close ────── ram prow · hull arc ─ capacitors, reach
//                             └─ specialise: Arc storm · Juggernaut · Shock prow
//   Ship ────┬─ Mobility ─── drive, thrusters, dampers, jets
//            │                └─ specialise: Drift drive · Evasive pattern · Afterburner
//            └─ Utility ──── tractor, krail matrix
//                             └─ specialise: Prospector · Salvage drones · Salvage scanners
//   Defence ──  Shields, armour, bulkheads, damage control
//                             └─ specialise: Fortress · Reactive armour · Regenerative hull
//   Synergies on the bridges between regions, once you own both halves.
//
// The rail is the field refit, under the ship's four systems
// (content/modules.ts): weapons and defence are Guns; the drive
// and the utility rigs are Rig; deep scanners and the evasive pattern are
// Signals. Contacts has no cards: it grows from favours
// at a port. Modules fitted in a system bring its cards round more often.
//   Salvage: one piece of tech per faction, opened by destroying its capital
//   ship in the run.
//
// Kinds: a 'stat' is a step up a ladder (each card adds one level); a
// 'system' switches a weapon or device on; a 'spec' is a specialisation
// (one per group; taking one closes the others); a 'synergy' needs both
// halves; 'tech' needs its faction's capital ship destroyed this run.
//
// Copy follows the brand: one short sentence in the second person, ending
// in a full stop, and a caveat only where it answers "wait, how does that
// work?". The figures are computed, not written: a card shows every number
// it changes (see FIGURES in sim/build.ts).

export type Branch =
  | 'laser' | 'torpedo' | 'mine' | 'plasma' | 'close' | 'mobility' | 'defence' | 'utility' | 'synergy' | 'salvage';
export type Category = 'weapons' | 'defence' | 'ship';
export type UpgradeKind = 'stat' | 'system' | 'spec' | 'synergy' | 'tech';
export type TechFaction = 'gutter' | 'custody' | 'office' | 'voice' | 'thren';

export interface Req { id: string; lv?: number; }

export interface UpgradeDef {
  id: string;
  name: string;
  branch: Branch;
  cat: Category;
  kind: UpgradeKind;
  max: number;
  /** All of these must be owned, at the level given (default 1). */
  requires?: Req[];
  /** Specialisations: one per group, open once the branch has `needs` levels. */
  group?: string;
  needs?: number;
  tags: string[];
  /** Relative pull among the cards. Default 1. */
  weight?: number;
  /** Needs a long-term unlock (content/unlocks.ts) before it can be fitted. */
  locked?: boolean;
  /** Salvage: needs this faction's capital ship destroyed this run. */
  tech?: TechFaction;
  /** The ship system it belongs to, where it is not its branch's (content/modules.ts). */
  system?: ShipSystem;
  /** Only dealt in the arcade: what it changes (self-repair, encounters) has no part in the Story mode. */
  arcade?: boolean;
  /** The benefit, for the level about to be taken. */
  text: string | ((lv: number) => string);
  note?: string;
  /** Change the stat block for owning level `lv` (called once for each level owned). */
  apply(s: Stats, lv: number): void;
}

export interface BranchDef {
  name: string;
  cat: Category;
  /** What a ship built mostly from this branch is called. */
  identity: string;
  /** The ship system its cards belong to (content/modules.ts): modules fitted there bring its cards round more often. */
  system: ShipSystem;
}

export const BRANCHES: Record<Branch, BranchDef> = {
  laser: { name: 'Lasers', cat: 'weapons', identity: 'Gunship', system: 'guns' },
  torpedo: { name: 'Torpedoes', cat: 'weapons', identity: 'Torpedo boat', system: 'guns' },
  mine: { name: 'Mines', cat: 'weapons', identity: 'Minelayer', system: 'guns' },
  plasma: { name: 'Drive plasma', cat: 'weapons', identity: 'Plasma runner', system: 'guns' },
  close: { name: 'Close quarters', cat: 'weapons', identity: 'Brawler', system: 'guns' },
  mobility: { name: 'Mobility', cat: 'ship', identity: 'Interceptor', system: 'rig' },
  defence: { name: 'Defence', cat: 'defence', identity: 'Bulwark', system: 'guns' },
  utility: { name: 'Utility', cat: 'ship', identity: 'Prospector', system: 'rig' },
  synergy: { name: 'Synergy', cat: 'weapons', identity: 'Hybrid', system: 'guns' },
  salvage: { name: 'Salvage', cat: 'ship', identity: 'Raider', system: 'guns' },
};

/** The ship system an upgrade's card belongs to. */
export const upgradeSystem = (u: UpgradeDef): ShipSystem => u.system ?? BRANCHES[u.branch].system;

export const UPGRADES: UpgradeDef[] = [
  // ── lasers ────────────────────────────────────────────────────────────
  {
    id: 'ph_emitters', name: 'Laser emitters', branch: 'laser', cat: 'weapons', kind: 'stat', max: 5, tags: ['laser', 'damage'],
    text: 'Your laser lances hit harder.',
    apply: (s) => { s.laserDamage *= 1.25; },
  },
  {
    id: 'ph_capacitors', name: 'Laser capacitors', branch: 'laser', cat: 'weapons', kind: 'stat', max: 4, tags: ['laser', 'rate'],
    text: 'Your lasers fire faster, and draw less from the bank.',
    apply: (s) => { s.laserCooldown *= 0.86; s.bankShot *= 0.95; },
  },
  {
    id: 'ph_bank', name: 'Laser bank', branch: 'laser', cat: 'weapons', kind: 'stat', max: 3, tags: ['laser', 'sustain'],
    text: 'Your laser bank holds more and refills faster.',
    apply: (s) => { s.bankMax += 35; s.bankRefill *= 1.3; },
  },
  {
    id: 'ph_lenses', name: 'Focusing lenses', branch: 'laser', cat: 'weapons', kind: 'stat', max: 3, tags: ['laser', 'range'],
    text: 'Your lances fly faster and reach further.',
    note: 'Lance reach tops out at a set range.',
    apply: (s) => { s.laserSpeed *= 1.14; s.laserLife *= 1.06; },
  },
  {
    id: 'ph_pierce', name: 'Piercing lances', branch: 'laser', cat: 'weapons', kind: 'stat', max: 3, tags: ['laser', 'pierce'],
    requires: [{ id: 'ph_emitters' }],
    text: 'Each lance passes through one more target.',
    apply: (s) => { s.laserPierce += 1; },
  },
  {
    id: 'ph_cone', name: 'Laser cone', branch: 'laser', cat: 'weapons', kind: 'spec', max: 1, group: 'laser', needs: 4,
    tags: ['laser', 'spread', 'close'],
    text: 'Every shot becomes a fan of three lances.',
    note: 'Shorter reach, and each lance is a little lighter.',
    apply: (s) => { s.laserLances += 2; s.laserSpread = 0.13; s.laserLife *= 0.72; s.laserDamage *= 0.82; },
  },
  {
    id: 'ph_cone_wide', name: 'Wide-angle cone', branch: 'laser', cat: 'weapons', kind: 'stat', max: 2, tags: ['laser', 'spread'],
    requires: [{ id: 'ph_cone' }],
    text: 'Your fan gains two more lances.',
    apply: (s) => { s.laserLances += 2; s.laserSpread += 0.015; s.bankShot *= 1.1; },
  },
  {
    id: 'ph_lance', name: 'Heavy lance', branch: 'laser', cat: 'weapons', kind: 'spec', max: 1, group: 'laser', needs: 4,
    tags: ['laser', 'pierce', 'range'],
    text: 'Slow, heavy lances that punch through a line of targets.',
    apply: (s) => { s.laserCooldown *= 1.9; s.laserDamage *= 2.7; s.laserPierce += 2; s.laserSpeed *= 1.3; s.bankShot *= 1.55; },
  },
  {
    id: 'ph_lance_cap', name: 'Lance capacitor', branch: 'laser', cat: 'weapons', kind: 'stat', max: 2, tags: ['laser', 'damage'],
    requires: [{ id: 'ph_lance' }],
    text: 'Your heavy lances charge faster and hit harder.',
    apply: (s) => { s.laserDamage *= 1.18; s.laserCooldown *= 0.88; },
  },
  {
    id: 'ph_array', name: 'Targeting array', branch: 'laser', cat: 'weapons', kind: 'spec', max: 1, group: 'laser', needs: 4,
    tags: ['laser', 'rate', 'sustain'],
    text: 'Your lances bend onto the hull nearest your nose.',
    note: 'They track inside a narrow cone, so you still have to point the ship.',
    apply: (s) => { s.laserHoming = 2.4; s.laserCooldown *= 0.88; },
  },
  {
    id: 'ph_fire_control', name: 'Fire control', branch: 'laser', cat: 'weapons', kind: 'stat', max: 2, tags: ['laser', 'sustain'],
    requires: [{ id: 'ph_array' }],
    text: 'Your lances cost less energy and track harder.',
    apply: (s) => { s.bankShot *= 0.75; s.laserHoming += 0.9; s.laserDamage *= 1.1; },
  },

  // ── torpedoes ──────────────────────────────────────────────────────────
  {
    id: 'tp_bay', name: 'Torpedo bay', branch: 'torpedo', cat: 'weapons', kind: 'system', max: 1, tags: ['torpedo', 'unlock'],
    weight: 1.4,
    text: 'Adds torpedoes on button 2 that chase their target.',
    note: 'They lock the best target in a cone ahead: ships before rock.',
    apply: (s) => { s.torpedoes = true; },
  },
  {
    id: 'tp_magazine', name: 'Torpedo magazine', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 3, tags: ['torpedo', 'rate'],
    requires: [{ id: 'tp_bay' }],
    text: 'Your rack holds another torpedo and reloads faster.',
    apply: (s) => { s.torpRack += 1; s.torpReload *= 0.9; },
  },
  {
    id: 'tp_yield', name: 'Warhead yield', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 4, tags: ['torpedo', 'damage', 'area'],
    requires: [{ id: 'tp_bay' }],
    text: 'Your torpedoes hit harder, over a wider blast.',
    apply: (s) => { s.torpDamage *= 1.25; s.torpBlast *= 1.07; },
  },
  {
    id: 'tp_tracking', name: 'Torpedo tracking', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 3, tags: ['torpedo', 'tracking'],
    requires: [{ id: 'tp_bay' }],
    text: 'Your torpedoes turn harder and lock from further off the nose.',
    apply: (s) => { s.torpTurn *= 1.35; s.torpSeek *= 1.12; s.torpCone += 0.22; },
  },
  {
    id: 'tp_heavy', name: 'Heavy payload', branch: 'torpedo', cat: 'weapons', kind: 'spec', max: 1, group: 'torpedo', needs: 3,
    tags: ['torpedo', 'damage', 'area'],
    text: 'Quantum warheads: each torpedo is a much bigger blast.',
    note: 'One fewer in the rack, and a slower reload.',
    apply: (s) => { s.torpDamage *= 2.2; s.torpBlast *= 1.45; s.torpRack -= 1; s.torpReload *= 1.15; },
  },
  {
    id: 'tp_cluster', name: 'Cluster warhead', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 2, tags: ['torpedo', 'area'],
    requires: [{ id: 'tp_heavy' }],
    text: (lv) => (lv === 1 ? 'Each blast throws out three bomblets.' : 'Each blast throws out two more bomblets.'),
    apply: (s, lv) => { s.torpCluster += lv === 1 ? 3 : 2; },
  },
  {
    id: 'tp_swarm', name: 'Swarm launcher', branch: 'torpedo', cat: 'weapons', kind: 'spec', max: 1, group: 'torpedo', needs: 3,
    tags: ['torpedo', 'rate', 'tracking'], locked: true,
    text: 'Each press fires three micro-torpedoes at different targets.',
    note: 'Each is lighter, with a smaller blast.',
    apply: (s) => { s.torpSalvo = 3; s.torpDamage *= 0.46; s.torpBlast *= 0.62; s.torpRack += 1; },
  },
  {
    id: 'tp_swarm_volley', name: 'Swarm volley', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 2, tags: ['torpedo', 'rate'],
    requires: [{ id: 'tp_swarm' }],
    text: 'Each salvo adds another micro-torpedo.',
    apply: (s) => { s.torpSalvo += 1; },
  },
  {
    id: 'tp_precision', name: 'Precision guidance', branch: 'torpedo', cat: 'weapons', kind: 'spec', max: 1, group: 'torpedo', needs: 3,
    tags: ['torpedo', 'tracking', 'range'],
    text: 'Your torpedoes lock in every direction, fly faster and hit hulls harder.',
    apply: (s) => { s.torpCone = Math.PI; s.torpSeek *= 1.35; s.torpMax *= 1.4; s.torpAccel *= 1.5; s.torpTurn *= 1.8; s.torpVsShips *= 1.5; },
  },
  {
    id: 'tp_painter', name: 'Target painter', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 1, tags: ['torpedo', 'laser'],
    requires: [{ id: 'tp_precision' }],
    text: 'Laser hits paint a target; torpedoes lock it first and hit it harder.',
    apply: (s) => { s.painter = true; s.markBonus = 1.6; },
  },

  // ── mines ──────────────────────────────────────────────────────────────
  {
    id: 'mn_layer', name: 'Seismic mine layer', branch: 'mine', cat: 'weapons', kind: 'system', max: 1, tags: ['mine', 'unlock', 'area'],
    weight: 1.2,
    text: 'Under attack, you drop a mine in your wake now and then.',
    note: 'Only on red alert. Where you fly is where they go.',
    apply: (s) => { s.mines = true; },
  },
  {
    id: 'mn_yield', name: 'Charge yield', branch: 'mine', cat: 'weapons', kind: 'stat', max: 4, tags: ['mine', 'damage', 'area'],
    requires: [{ id: 'mn_layer' }],
    text: 'Your mines hit harder, over a wider blast.',
    apply: (s) => { s.mineDamage *= 1.25; s.mineBlast *= 1.1; },
  },
  {
    id: 'mn_racks', name: 'Mine racks', branch: 'mine', cat: 'weapons', kind: 'stat', max: 3, tags: ['mine', 'rate'],
    requires: [{ id: 'mn_layer' }],
    text: 'Mines drop sooner and more can be out.',
    apply: (s) => { s.mineInterval *= 0.82; s.mineMax += 2; },
  },
  {
    id: 'mn_seekers', name: 'Proximity seekers', branch: 'mine', cat: 'weapons', kind: 'stat', max: 2, tags: ['mine', 'tracking'],
    requires: [{ id: 'mn_layer' }],
    text: (lv) => (lv === 1 ? 'Your mines trigger from further away.' : 'Your mines drift toward hulls nearby.'),
    apply: (s, lv) => { if (lv === 1) s.mineTrigger *= 1.4; else s.mineSeek = 6; },
  },
  {
    id: 'mn_field', name: 'Minefield doctrine', branch: 'mine', cat: 'weapons', kind: 'spec', max: 1, group: 'mine', needs: 3,
    tags: ['mine', 'area', 'rate'],
    text: 'Twice the mines, lasting twice as long.',
    note: 'Each blast is a little smaller.',
    apply: (s) => { s.mineLife *= 2; s.mineMax *= 2; s.mineInterval *= 0.75; s.mineDamage *= 0.85; },
  },
  {
    id: 'mn_chain', name: 'Chain reaction', branch: 'mine', cat: 'weapons', kind: 'spec', max: 1, group: 'mine', needs: 3,
    tags: ['mine', 'area', 'damage'],
    text: 'A blast sets off every mine near it and leaves a burning cloud.',
    apply: (s) => { s.mineChain = true; s.mineBlast *= 1.1; },
  },
  {
    id: 'mn_gravity', name: 'Graviton mines', branch: 'mine', cat: 'weapons', kind: 'spec', max: 1, group: 'mine', needs: 3,
    tags: ['mine', 'control'], locked: true,
    text: 'Your mines drag hulls and rock in before they go off, harder.',
    apply: (s) => { s.mineGravity = true; s.mineDamage *= 1.3; },
  },

  // ── drive plasma ────────────────────────────────────────────────────────
  {
    id: 'pl_vent', name: 'Drive plasma vent', branch: 'plasma', cat: 'weapons', kind: 'system', max: 1, tags: ['plasma', 'unlock', 'area'],
    text: 'Your engines leave a burning trail while you thrust.',
    note: 'Lead what chases you through it.',
    apply: (s) => { s.plasma = true; },
  },
  {
    id: 'pl_heat', name: 'Plasma heat', branch: 'plasma', cat: 'weapons', kind: 'stat', max: 3, tags: ['plasma', 'damage'],
    requires: [{ id: 'pl_vent' }],
    text: 'Your trail burns hotter.',
    apply: (s) => { s.plasmaDps *= 1.35; },
  },
  {
    id: 'pl_flow', name: 'Plasma flow', branch: 'plasma', cat: 'weapons', kind: 'stat', max: 2, tags: ['plasma', 'area'],
    requires: [{ id: 'pl_vent' }],
    text: 'Your trail is wider and lasts longer.',
    apply: (s) => { s.plasmaLife *= 1.4; s.plasmaRadius *= 1.2; },
  },
  {
    id: 'pl_ignite', name: 'Ignition', branch: 'plasma', cat: 'weapons', kind: 'spec', max: 1, group: 'plasma', needs: 2,
    tags: ['plasma', 'damage'],
    text: 'Hulls that touch your trail keep burning after they leave it.',
    apply: (s) => { s.plasmaBurn = s.plasmaDps * 0.6; },
  },
  {
    id: 'pl_wake', name: 'Plasma wake', branch: 'plasma', cat: 'weapons', kind: 'spec', max: 1, group: 'plasma', needs: 2,
    tags: ['plasma', 'mobility', 'evasion'],
    text: 'Your barrel roll dumps a ring of plasma, and comes round sooner.',
    apply: (s) => { s.rollBurst = true; s.rollCooldown *= 0.7; },
  },

  // ── close quarters ─────────────────────────────────────────────────────
  {
    id: 'cl_arc', name: 'Hull arc emitter', branch: 'close', cat: 'weapons', kind: 'system', max: 1, tags: ['close', 'unlock', 'arc'],
    text: 'Lightning arcs from your hull to anything close.',
    note: 'It fires by itself. You have to get near.',
    apply: (s) => { s.arc = true; },
  },
  {
    id: 'cl_arc_power', name: 'Arc capacitors', branch: 'close', cat: 'weapons', kind: 'stat', max: 3, tags: ['close', 'arc', 'damage'],
    requires: [{ id: 'cl_arc' }],
    text: (lv) => (lv === 2 ? 'Your arcs hit harder and fork to one more target.' : 'Your arcs hit harder and fire faster.'),
    apply: (s, lv) => { s.arcDamage *= 1.2; s.arcInterval *= 0.94; if (lv === 2) s.arcTargets += 1; },
  },
  {
    id: 'cl_arc_reach', name: 'Arc reach', branch: 'close', cat: 'weapons', kind: 'stat', max: 2, tags: ['close', 'arc', 'range'],
    requires: [{ id: 'cl_arc' }],
    text: 'Your arcs jump further.',
    apply: (s) => { s.arcRange *= 1.2; },
  },
  {
    id: 'cl_ram', name: 'Ram prow', branch: 'close', cat: 'weapons', kind: 'stat', max: 3, tags: ['close', 'ram', 'defence'],
    text: (lv) => (lv === 1 ? 'Ramming hits hard, and a ram that destroys its target costs no hull.' : 'Your rams hit harder.'),
    note: 'A ram at speed hits twice as hard as a nudge.',
    apply: (s) => { s.ramDamage += 5; s.ramSafe = true; },
  },
  {
    id: 'cl_storm', name: 'Arc storm', branch: 'close', cat: 'weapons', kind: 'spec', max: 1, group: 'close', needs: 3,
    tags: ['close', 'arc', 'area'],
    text: 'Your arcs jump on from each target to one more.',
    apply: (s) => { s.arcJumps += 1; },
  },
  {
    id: 'cl_juggernaut', name: 'Juggernaut', branch: 'close', cat: 'weapons', kind: 'spec', max: 1, group: 'close', needs: 3,
    tags: ['close', 'ram', 'defence'], locked: true,
    text: 'An extra hull plate, and rams that hit nearly twice as hard.',
    note: 'The armour costs a little top speed.',
    apply: (s) => { s.maxPlates += 1; s.ramDamage *= 1.8; s.topSpeed *= 0.94; s.grace += 0.3; },
  },

  // ── mobility ───────────────────────────────────────────────────────────
  {
    id: 'mo_impulse', name: 'Main drive', branch: 'mobility', cat: 'ship', kind: 'stat', max: 4, tags: ['mobility', 'speed'],
    text: 'You get up to speed faster.',
    apply: (s) => { s.drive *= 1.15; },
  },
  {
    id: 'mo_thrusters', name: 'Manoeuvring thrusters', branch: 'mobility', cat: 'ship', kind: 'stat', max: 3, tags: ['mobility', 'turning'],
    text: 'You turn faster.',
    apply: (s) => { s.turn *= 1.12; },
  },
  {
    id: 'mo_dampers', name: 'Grip dampers', branch: 'mobility', cat: 'ship', kind: 'stat', max: 2, tags: ['mobility', 'turning'],
    text: 'You carve tighter turns and slide less.',
    apply: (s) => { s.grip += 0.04; },
  },
  {
    id: 'mo_jets', name: 'Evasive jets', branch: 'mobility', cat: 'ship', kind: 'stat', max: 3, tags: ['mobility', 'evasion'],
    text: 'Your barrel roll comes round sooner, throws you further and covers you longer.',
    apply: (s) => { s.rollCooldown *= 0.8; s.rollKick *= 1.12; s.rollIframes += 0.05; },
  },
  {
    id: 'mo_drift', name: 'Drift drive', branch: 'mobility', cat: 'ship', kind: 'spec', max: 1, group: 'mobility', needs: 4,
    tags: ['mobility', 'speed', 'laser'],
    text: 'Off the throttle you keep your speed and turn faster, and your lances hit harder.',
    note: 'Lances fired while drifting deal a third more.',
    apply: (s) => { s.drift = true; s.driftBonus = 1.33; },
  },
  {
    id: 'mo_evasion', name: 'Evasive pattern', branch: 'mobility', cat: 'ship', kind: 'spec', system: 'signals', max: 1, group: 'mobility', needs: 4,
    tags: ['mobility', 'evasion'],
    text: 'A longer roll, and it comes round much sooner.',
    apply: (s) => { s.rollIframes += 0.2; s.rollCooldown *= 0.75; },
  },

  // ── defence ────────────────────────────────────────────────────────────
  {
    id: 'df_shield', name: 'Shield emitters', branch: 'defence', cat: 'defence', kind: 'system', max: 1, tags: ['defence', 'unlock', 'shield'],
    text: 'A second shield charge, and it recharges sooner.',
    apply: (s) => { s.shieldMax += 1; s.shieldDelay *= 0.8; },
  },
  {
    id: 'df_regen', name: 'Shield regenerators', branch: 'defence', cat: 'defence', kind: 'stat', max: 3, tags: ['defence', 'shield'],
    requires: [{ id: 'df_shield' }],
    text: 'Your shield recharges faster.',
    apply: (s) => { s.shieldRecharge *= 0.8; s.shieldDelay *= 0.9; },
  },
  {
    id: 'df_armour', name: 'Ablative armour', branch: 'defence', cat: 'defence', kind: 'stat', max: 2, tags: ['defence', 'armour'],
    weight: 0.8,
    text: 'One more hull plate, fitted whole.',
    apply: (s) => { s.maxPlates += 1; },
  },
  {
    id: 'df_bulkheads', name: 'Reinforced bulkheads', branch: 'defence', cat: 'defence', kind: 'stat', max: 2, tags: ['defence', 'armour'],
    text: 'You stay untouchable for longer after a hit.',
    apply: (s) => { s.grace += 0.35; },
  },
  {
    id: 'df_control', name: 'Damage control', branch: 'defence', cat: 'defence', kind: 'stat', max: 1, tags: ['defence', 'once'],
    weight: 0.7,
    text: 'Once, the hit that would breach your hull leaves you one plate instead.',
    note: 'One use. It does not stack.',
    apply: (s) => { s.damageControl = 1; },
  },
  {
    id: 'df_repair', name: 'Repair drones', branch: 'defence', cat: 'defence', kind: 'stat', max: 3, tags: ['defence', 'armour', 'repair'],
    arcade: true,
    text: (lv) => (lv === 1 ? 'Self-repair starts sooner, works faster, and mends a second plate in a quiet spell.' : 'Self-repair starts sooner and works faster.'),
    note: 'Self-repair still waits for quiet: nothing hostile close, no fire near.',
    apply: (s, lv) => { s.repairDelay *= 0.8; s.repairRate *= 1.25; if (lv === 1) s.repairMax += 1; },
  },
  {
    id: 'df_fortress', name: 'Fortress', branch: 'defence', cat: 'defence', kind: 'spec', max: 1, group: 'defence', needs: 3,
    tags: ['defence', 'armour', 'shield'],
    text: 'Another hull plate and a second shield charge.',
    note: 'All that armour costs top speed.',
    apply: (s) => { s.maxPlates += 1; s.shieldMax += 1; s.shieldRecharge *= 0.85; s.topSpeed *= 0.92; },
  },
  {
    id: 'df_reactive', name: 'Reactive armour', branch: 'defence', cat: 'defence', kind: 'spec', max: 1, group: 'defence', needs: 3,
    tags: ['defence', 'area'],
    text: 'Losing a plate or a shield blasts away the fire around you.',
    apply: (s) => { s.reactive = true; },
  },
  {
    id: 'df_regenerative', name: 'Regenerative hull', branch: 'defence', cat: 'defence', kind: 'spec', max: 1, group: 'defence', needs: 3,
    tags: ['defence', 'armour'], locked: true,
    text: 'Voice alloy: your hull mends itself faster, even with hostiles close.',
    note: 'In the Story mode, a plate grows back after a minute without a hit.',
    apply: (s) => { s.regen = 60; s.repairUnderFire = true; s.repairRate *= 1.5; },
  },

  // ── utility ────────────────────────────────────────────────────────────
  {
    id: 'ut_tractor', name: 'Tractor beam', branch: 'utility', cat: 'ship', kind: 'stat', max: 3, tags: ['utility', 'tractor'],
    text: 'You pull Cyrite in from further away.',
    apply: (s) => { s.tractor *= 1.35; },
  },
  {
    id: 'ut_matrix', name: 'Cyrite matrix', branch: 'utility', cat: 'ship', kind: 'stat', max: 2, tags: ['utility', 'xp'],
    weight: 0.8,
    text: 'Every Cyrite pickup is worth 12% more.',
    apply: (s) => { s.xpMult *= 1.12; },
  },
  {
    id: 'ut_quiet', name: 'Quiet running', branch: 'utility', cat: 'ship', kind: 'stat', system: 'signals', max: 2, tags: ['utility', 'stealth'],
    arcade: true,
    text: 'Enemies notice you later, and the quiet between fights lasts longer.',
    apply: (s) => { s.notice *= 0.8; s.lull *= 1.15; },
  },
  {
    id: 'ut_tactical', name: 'Tactical computer', branch: 'utility', cat: 'weapons', kind: 'stat', max: 3, tags: ['damage'],
    weight: 0.8,
    text: 'All your weapons hit harder.',
    apply: (s) => { s.dmgAll *= 1.07; },
  },

  // ── synergies ──────────────────────────────────────────────────────────
  {
    id: 'sy_plasma_torps', name: 'Plasma warheads', branch: 'synergy', cat: 'weapons', kind: 'synergy', max: 1,
    requires: [{ id: 'tp_bay' }, { id: 'pl_vent' }], tags: ['torpedo', 'plasma', 'area'],
    text: 'Your torpedo blasts leave a burning plasma cloud.',
    apply: (s) => { s.torpPlasma = true; },
  },
  {
    id: 'sy_detonator', name: 'Laser detonators', branch: 'synergy', cat: 'weapons', kind: 'synergy', max: 1,
    requires: [{ id: 'mn_layer' }, { id: 'ph_emitters', lv: 2 }], tags: ['mine', 'laser'],
    text: 'Shoot your own mines to set them off early, harder.',
    apply: (s) => { s.mineDetonate = true; },
  },
  {
    id: 'sy_arc_shield', name: 'Capacitor shield', branch: 'synergy', cat: 'defence', kind: 'synergy', max: 1,
    requires: [{ id: 'cl_arc' }, { id: 'df_shield' }], tags: ['close', 'arc', 'defence', 'shield'],
    text: 'When your shield breaks, it discharges into every hull nearby.',
    apply: (s) => { s.arcShield = true; },
  },
  {
    id: 'sy_ramjet', name: 'Ramjet', branch: 'synergy', cat: 'ship', kind: 'synergy', max: 1, locked: true,
    requires: [{ id: 'cl_ram' }, { id: 'mo_impulse', lv: 2 }], tags: ['close', 'ram', 'mobility', 'evasion'],
    text: 'Roll into a hull to ram it untouched; rams scale with your speed.',
    apply: (s) => { s.ramjet = true; s.ramDamage *= 1.25; },
  },
  {
    id: 'sy_arc_torps', name: 'Arc warheads', branch: 'synergy', cat: 'weapons', kind: 'synergy', max: 1,
    requires: [{ id: 'tp_bay' }, { id: 'cl_arc' }], tags: ['torpedo', 'close', 'arc'],
    text: 'Your torpedo blasts arc on to three nearby hulls.',
    apply: (s) => { s.torpArc = 3; },
  },

  // ── more specialisations ───────────────────────────────────────────────
  {
    id: 'pl_corona', name: 'Plasma corona', branch: 'plasma', cat: 'weapons', kind: 'spec', max: 1, group: 'plasma', needs: 2,
    tags: ['plasma', 'close', 'damage'],
    text: 'While you thrust, plasma wreathes your hull: anything you brush burns.',
    apply: (s) => { s.plasmaCorona = true; s.plasmaDps *= 1.15; },
  },
  {
    id: 'cl_shock', name: 'Shock prow', branch: 'close', cat: 'weapons', kind: 'spec', max: 1, group: 'close', needs: 3,
    tags: ['close', 'ram', 'arc'],
    text: 'Every ram discharges an arc into the hulls near what you hit.',
    apply: (s) => { s.ramArc = true; s.ramDamage *= 1.2; },
  },
  {
    id: 'mo_afterburner', name: 'Afterburner', branch: 'mobility', cat: 'ship', kind: 'spec', max: 1, group: 'mobility', needs: 4,
    tags: ['mobility', 'speed'],
    text: 'A much higher top speed.',
    note: 'It does not change how fast you pick up speed.',
    apply: (s) => { s.topSpeed *= 1.25; },
  },
  {
    id: 'ut_prospector', name: 'Prospector', branch: 'utility', cat: 'ship', kind: 'spec', max: 1, group: 'utility', needs: 3,
    tags: ['utility', 'xp'],
    text: 'Rock gives up Cyrite half again as often.',
    apply: (s) => { s.crystalChance *= 1.5; s.tractor *= 1.1; },
  },
  {
    id: 'ut_salvager', name: 'Salvage drones', branch: 'utility', cat: 'ship', kind: 'spec', max: 1, group: 'utility', needs: 3,
    tags: ['utility', 'defence'],
    text: 'Hull repairs turn up 80% more often, and boosters last half again as long.',
    note: 'Still no more than one repair every half minute.',
    apply: (s) => { s.repairChance *= 1.8; s.powerTime *= 1.5; },
  },
  {
    id: 'ut_scanner', name: 'Salvage scanners', branch: 'utility', cat: 'ship', kind: 'spec', system: 'signals', max: 1, group: 'utility', needs: 3,
    tags: ['utility', 'xp', 'damage'],
    text: 'Boosters turn up twice as often, and elites carry twice the Cyrite.',
    apply: (s) => { s.boostRate *= 2; s.eliteLoot *= 2; },
  },

  // ── salvage: tech from the capital ships you destroy ───────────────────
  {
    id: 'tech_gutter', name: 'Gutter scatterguns', branch: 'salvage', cat: 'weapons', kind: 'tech', max: 1, tech: 'gutter', tags: ['laser', 'damage'],
    text: 'Every fourth laser shot is a scattergun slug at triple damage.',
    apply: (s) => { s.disruptor = 4; },
  },
  {
    id: 'tech_custody', name: 'Custody compressors', branch: 'salvage', cat: 'weapons', kind: 'tech', max: 1, tech: 'custody', tags: ['laser', 'torpedo', 'range'],
    text: 'Your lances reach further and pierce one more target; torpedo blasts widen.',
    apply: (s) => { s.laserLife *= 1.2; s.laserPierce += 1; s.torpBlast *= 1.1; },
  },
  {
    id: 'tech_office', name: 'Offices of Peace cloak', branch: 'salvage', cat: 'ship', kind: 'tech', max: 1, tech: 'office', tags: ['mobility', 'evasion'],
    text: 'A barrel roll cloaks you: hostile hulls hold their fire for a moment.',
    note: 'Capital ships see through it.',
    apply: (s) => { s.rollCloak = 1.6; s.rollIframes += 0.1; },
  },
  {
    id: 'tech_voice', name: 'Voice adaptive shield', branch: 'salvage', cat: 'defence', kind: 'tech', max: 1, tech: 'voice', tags: ['defence', 'shield'],
    text: 'Your shield adapts: it recharges sooner and faster.',
    apply: (s) => { s.shieldRecharge *= 0.75; s.shieldDelay *= 0.75; },
  },
  {
    id: 'tech_thren', name: 'Thren snares', branch: 'salvage', cat: 'weapons', kind: 'tech', max: 1, tech: 'thren', tags: ['mine', 'torpedo', 'control'],
    text: 'Your torpedo and mine blasts snare the hulls they catch, slowing them hard.',
    apply: (s) => { s.snare = 3; },
  },
];

export const UPGRADE: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** The text for the level about to be fitted. */
export function upgradeText(u: UpgradeDef, lv: number): string {
  return typeof u.text === 'function' ? u.text(lv) : u.text;
}
