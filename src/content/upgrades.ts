import type { Stats } from '../sim/stats';

// ── what can be fitted ────────────────────────────────────────────────────
// One ship, many builds. Everything the ship can become is listed here, and
// laid out as the refit web in content/web.ts: nine regions round the core,
// each a few paths of small nodes between bigger ones, ending in three
// specialisations, with synergies on the bridges between neighbours.
//
//   Weapons ─┬─ Phasers ──── emitters, capacitors, bank, lenses, pierce
//            │                └─ specialise: Cone · Heavy lance · Targeting array
//            ├─ Torpedoes ── bay ─ magazine, yield, tracking
//            │                └─ specialise: Heavy payload · Swarm · Precision
//            ├─ Mines ────── layer ─ yield, racks, seekers
//            │                └─ specialise: Minefield · Chain reaction · Graviton
//            ├─ Plasma ───── vent ─ heat, flow
//            │                └─ specialise: Ignition · Afterburner wake · Corona
//            └─ Close ────── ram prow · hull arc ─ capacitors, reach
//                             └─ specialise: Arc storm · Juggernaut · Shock prow
//   Ship ────┬─ Mobility ─── impulse, thrusters, dampers, jets
//            │                └─ specialise: Drift drive · Evasive pattern · Afterburner
//            ├─ Utility ──── tractor, dilithium matrix
//            │                └─ specialise: Prospector · Salvage drones · Deep scanners
//            └─ Warp core ── coils
//                             └─ specialise: Warp nova · Weapons overload · Phase cloak
//   Defence ──  Shields, armour, bulkheads, damage control
//                             └─ specialise: Fortress · Reactive armour · Regenerative hull
//   Synergies on the bridges between regions, once you own both halves.
//   Salvage: one piece of tech per faction, opened by destroying its capital
//   ship in the run.
//
// Kinds: a 'minor' is a small step along a path (the web has many of each);
// a 'stat' is a bigger node; a 'system' switches a weapon or device on; a
// 'spec' is a specialisation (one per group; taking one closes the others);
// a 'synergy' needs both halves; 'tech' needs its faction's capital ship
// destroyed this run. Each node in the web adds one level of its upgrade.
//
// Copy follows the brand: one short sentence in the second person, ending
// in a full stop, and a caveat only where it answers "wait, how does that
// work?". The figures are computed, not written: the web shows every
// number a node changes (see FIGURES in sim/build.ts).

export type Branch =
  | 'phaser' | 'torpedo' | 'mine' | 'plasma' | 'close' | 'mobility' | 'defence' | 'utility' | 'overcharge' | 'synergy' | 'salvage';
export type Category = 'weapons' | 'defence' | 'ship';
export type UpgradeKind = 'minor' | 'stat' | 'system' | 'spec' | 'synergy' | 'tech';
export type TechFaction = 'klingon' | 'cardassian' | 'romulan' | 'borg' | 'tholian';

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
  /** Relative pull among the quick picks. Default 1. */
  weight?: number;
  /** Needs a long-term unlock (content/unlocks.ts) before it can be fitted. */
  locked?: boolean;
  /** Salvage: needs this faction's capital ship destroyed this run. */
  tech?: TechFaction;
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
}

export const BRANCHES: Record<Branch, BranchDef> = {
  phaser: { name: 'Phasers', cat: 'weapons', identity: 'Gunship' },
  torpedo: { name: 'Torpedoes', cat: 'weapons', identity: 'Torpedo boat' },
  mine: { name: 'Mines', cat: 'weapons', identity: 'Minelayer' },
  plasma: { name: 'Warp plasma', cat: 'weapons', identity: 'Plasma runner' },
  close: { name: 'Close quarters', cat: 'weapons', identity: 'Brawler' },
  mobility: { name: 'Mobility', cat: 'ship', identity: 'Interceptor' },
  defence: { name: 'Defence', cat: 'defence', identity: 'Bulwark' },
  utility: { name: 'Utility', cat: 'ship', identity: 'Prospector' },
  overcharge: { name: 'Warp core', cat: 'ship', identity: 'Core diver' },
  synergy: { name: 'Synergy', cat: 'weapons', identity: 'Hybrid' },
  salvage: { name: 'Salvage', cat: 'ship', identity: 'Raider' },
};

export const UPGRADES: UpgradeDef[] = [
  // ── phasers ────────────────────────────────────────────────────────────
  {
    id: 'ph_emitters', name: 'Phaser emitters', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 5, tags: ['phaser', 'damage'],
    text: 'Your phaser lances hit harder.',
    apply: (s) => { s.phaserDamage *= 1.25; },
  },
  {
    id: 'ph_capacitors', name: 'Phaser capacitors', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 4, tags: ['phaser', 'rate'],
    text: 'Your phasers fire faster, and draw less from the bank.',
    apply: (s) => { s.phaserCooldown *= 0.86; s.bankShot *= 0.95; },
  },
  {
    id: 'ph_bank', name: 'Phaser bank', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 3, tags: ['phaser', 'sustain'],
    text: 'Your phaser bank holds more and refills faster.',
    apply: (s) => { s.bankMax += 35; s.bankRefill *= 1.3; },
  },
  {
    id: 'ph_lenses', name: 'Focusing lenses', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 3, tags: ['phaser', 'range'],
    text: 'Your lances fly faster and reach further.',
    apply: (s) => { s.phaserSpeed *= 1.14; s.phaserLife *= 1.06; },
  },
  {
    id: 'ph_pierce', name: 'Piercing lances', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 3, tags: ['phaser', 'pierce'],
    requires: [{ id: 'ph_emitters' }],
    text: 'Each lance passes through one more target.',
    apply: (s) => { s.phaserPierce += 1; },
  },
  {
    id: 'ph_cone', name: 'Phaser cone', branch: 'phaser', cat: 'weapons', kind: 'spec', max: 1, group: 'phaser', needs: 4,
    tags: ['phaser', 'spread', 'close'],
    text: 'Every shot becomes a fan of three lances.',
    note: 'Shorter reach, and each lance is a little lighter.',
    apply: (s) => { s.phaserLances += 2; s.phaserSpread = 0.13; s.phaserLife *= 0.72; s.phaserDamage *= 0.82; },
  },
  {
    id: 'ph_cone_wide', name: 'Wide-angle cone', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 2, tags: ['phaser', 'spread'],
    requires: [{ id: 'ph_cone' }],
    text: 'Your fan gains two more lances.',
    apply: (s) => { s.phaserLances += 2; s.phaserSpread += 0.015; s.bankShot *= 1.1; },
  },
  {
    id: 'ph_lance', name: 'Heavy lance', branch: 'phaser', cat: 'weapons', kind: 'spec', max: 1, group: 'phaser', needs: 4,
    tags: ['phaser', 'pierce', 'range'],
    text: 'Slow, heavy lances that punch through a line of targets.',
    apply: (s) => { s.phaserCooldown *= 1.9; s.phaserDamage *= 2.7; s.phaserPierce += 2; s.phaserSpeed *= 1.3; s.bankShot *= 1.55; },
  },
  {
    id: 'ph_lance_cap', name: 'Lance capacitor', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 2, tags: ['phaser', 'damage'],
    requires: [{ id: 'ph_lance' }],
    text: 'Your heavy lances charge faster and hit harder.',
    apply: (s) => { s.phaserDamage *= 1.18; s.phaserCooldown *= 0.88; },
  },
  {
    id: 'ph_array', name: 'Targeting array', branch: 'phaser', cat: 'weapons', kind: 'spec', max: 1, group: 'phaser', needs: 4,
    tags: ['phaser', 'rate', 'sustain'],
    text: 'Your lances bend onto the hull nearest your nose.',
    note: 'They track inside a narrow cone, so you still have to point the ship.',
    apply: (s) => { s.phaserHoming = 2.4; s.phaserCooldown *= 0.88; },
  },
  {
    id: 'ph_fire_control', name: 'Fire control', branch: 'phaser', cat: 'weapons', kind: 'stat', max: 2, tags: ['phaser', 'sustain'],
    requires: [{ id: 'ph_array' }],
    text: 'Your lances cost less energy and track harder.',
    apply: (s) => { s.bankShot *= 0.75; s.phaserHoming += 0.9; s.phaserDamage *= 1.1; },
  },

  // ── torpedoes ──────────────────────────────────────────────────────────
  {
    id: 'tp_bay', name: 'Photon torpedo bay', branch: 'torpedo', cat: 'weapons', kind: 'system', max: 1, tags: ['torpedo', 'unlock'],
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
    id: 'tp_yield', name: 'Photon yield', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 4, tags: ['torpedo', 'damage', 'area'],
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
    id: 'tp_painter', name: 'Target painter', branch: 'torpedo', cat: 'weapons', kind: 'stat', max: 1, tags: ['torpedo', 'phaser'],
    requires: [{ id: 'tp_precision' }],
    text: 'Phaser hits paint a target; torpedoes lock it first and hit it harder.',
    apply: (s) => { s.painter = true; s.markBonus = 1.6; },
  },

  // ── mines ──────────────────────────────────────────────────────────────
  {
    id: 'mn_layer', name: 'Tricobalt mine layer', branch: 'mine', cat: 'weapons', kind: 'system', max: 1, tags: ['mine', 'unlock', 'area'],
    weight: 1.2,
    text: 'Lays mines in your wake that wait for anything that follows you.',
    note: 'They lay themselves. Where you fly is where they go.',
    apply: (s) => { s.mines = true; },
  },
  {
    id: 'mn_yield', name: 'Tricobalt yield', branch: 'mine', cat: 'weapons', kind: 'stat', max: 4, tags: ['mine', 'damage', 'area'],
    requires: [{ id: 'mn_layer' }],
    text: 'Your mines hit harder, over a wider blast.',
    apply: (s) => { s.mineDamage *= 1.25; s.mineBlast *= 1.1; },
  },
  {
    id: 'mn_racks', name: 'Mine racks', branch: 'mine', cat: 'weapons', kind: 'stat', max: 3, tags: ['mine', 'rate'],
    requires: [{ id: 'mn_layer' }],
    text: 'You lay mines more often and keep more of them out.',
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

  // ── warp plasma ────────────────────────────────────────────────────────
  {
    id: 'pl_vent', name: 'Warp plasma vent', branch: 'plasma', cat: 'weapons', kind: 'system', max: 1, tags: ['plasma', 'unlock', 'area'],
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
    id: 'pl_wake', name: 'Afterburner wake', branch: 'plasma', cat: 'weapons', kind: 'spec', max: 1, group: 'plasma', needs: 2,
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
    apply: (s) => { s.maxPlates += 1; s.ramDamage *= 1.8; s.thrust *= 0.94; s.grace += 0.3; },
  },

  // ── mobility ───────────────────────────────────────────────────────────
  {
    id: 'mo_impulse', name: 'Impulse engines', branch: 'mobility', cat: 'ship', kind: 'stat', max: 4, tags: ['mobility', 'speed'],
    text: 'More thrust and a higher top speed.',
    apply: (s) => { s.thrust *= 1.08; },
  },
  {
    id: 'mo_thrusters', name: 'Manoeuvring thrusters', branch: 'mobility', cat: 'ship', kind: 'stat', max: 3, tags: ['mobility', 'turning'],
    text: 'You turn faster.',
    apply: (s) => { s.turn *= 1.12; },
  },
  {
    id: 'mo_dampers', name: 'Inertial dampers', branch: 'mobility', cat: 'ship', kind: 'stat', max: 2, tags: ['mobility', 'turning'],
    text: 'You carve tighter turns under thrust, and slide less.',
    apply: (s) => { s.grip += 0.04; },
  },
  {
    id: 'mo_jets', name: 'Evasive jets', branch: 'mobility', cat: 'ship', kind: 'stat', max: 3, tags: ['mobility', 'evasion'],
    text: 'Your barrel roll comes round sooner and throws you further.',
    apply: (s) => { s.rollCooldown *= 0.8; s.rollKick *= 1.12; },
  },
  {
    id: 'mo_drift', name: 'Drift drive', branch: 'mobility', cat: 'ship', kind: 'spec', max: 1, group: 'mobility', needs: 4,
    tags: ['mobility', 'speed', 'phaser'],
    text: 'Off the throttle you keep your speed and turn faster, and your lances hit harder.',
    note: 'Lances fired while drifting deal a third more.',
    apply: (s) => { s.drift = true; s.driftBonus = 1.33; },
  },
  {
    id: 'mo_evasion', name: 'Evasive pattern', branch: 'mobility', cat: 'ship', kind: 'spec', max: 1, group: 'mobility', needs: 4,
    tags: ['mobility', 'evasion', 'overcharge'],
    text: 'A longer roll, and grazing fire mid-roll counts double and refunds it.',
    apply: (s) => { s.evasion = true; s.rollIframes += 0.2; },
  },

  // ── defence ────────────────────────────────────────────────────────────
  {
    id: 'df_shield', name: 'Deflector shields', branch: 'defence', cat: 'defence', kind: 'system', max: 1, tags: ['defence', 'unlock', 'shield'],
    text: 'A shield that takes one hit for you, then recharges.',
    note: 'It recharges only after it breaks, and slowly.',
    apply: (s) => { s.shieldMax = 1; },
  },
  {
    id: 'df_regen', name: 'Shield regenerators', branch: 'defence', cat: 'defence', kind: 'stat', max: 3, tags: ['defence', 'shield'],
    requires: [{ id: 'df_shield' }],
    text: 'Your shield recharges faster.',
    apply: (s) => { s.shieldRecharge *= 0.8; },
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
    id: 'df_fortress', name: 'Fortress', branch: 'defence', cat: 'defence', kind: 'spec', max: 1, group: 'defence', needs: 3,
    tags: ['defence', 'armour', 'shield'],
    text: 'Another hull plate and a second shield charge.',
    note: 'All that armour costs top speed.',
    apply: (s) => { s.maxPlates += 1; s.shieldMax += 1; s.shieldRecharge *= 0.85; s.thrust *= 0.92; },
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
    text: 'Borg alloy: one plate grows back after a long spell without damage.',
    note: 'A minute without a hit, and only below full hull.',
    apply: (s) => { s.regen = 60; },
  },

  // ── utility ────────────────────────────────────────────────────────────
  {
    id: 'ut_tractor', name: 'Tractor beam', branch: 'utility', cat: 'ship', kind: 'stat', max: 3, tags: ['utility', 'tractor'],
    text: 'You pull dilithium in from further away.',
    apply: (s) => { s.tractor *= 1.35; },
  },
  {
    id: 'ut_matrix', name: 'Dilithium matrix', branch: 'utility', cat: 'ship', kind: 'stat', max: 2, tags: ['utility', 'xp'],
    weight: 0.8,
    text: 'Every crystal is worth more toward your next refit.',
    apply: (s) => { s.xpMult *= 1.12; },
  },

  // ── the warp core ──────────────────────────────────────────────────────
  {
    id: 'oc_coils', name: 'Warp core coils', branch: 'overcharge', cat: 'ship', kind: 'stat', max: 3, tags: ['overcharge', 'evasion'],
    text: 'Near misses charge your overcharge faster.',
    apply: (s) => { s.ocGain *= 1.25; },
  },
  {
    id: 'oc_nova', name: 'Warp nova', branch: 'overcharge', cat: 'ship', kind: 'spec', max: 1, group: 'overcharge', needs: 2,
    tags: ['overcharge', 'area', 'damage'],
    text: 'Your overcharge release is a much bigger, harder blast.',
    apply: (s) => { s.ocRadius *= 1.45; s.ocDamage *= 1.8; },
  },
  {
    id: 'oc_overload', name: 'Weapons overload', branch: 'overcharge', cat: 'ship', kind: 'spec', max: 1, group: 'overcharge', needs: 2,
    tags: ['overcharge', 'rate'],
    text: 'A release overloads your weapons for longer, and refills your racks.',
    apply: (s) => { s.ocOverload = 7; s.ocRefill = true; },
  },
  {
    id: 'oc_phase', name: 'Phase cloak', branch: 'overcharge', cat: 'ship', kind: 'spec', max: 1, group: 'overcharge', needs: 2,
    tags: ['overcharge', 'evasion', 'ram'], locked: true,
    text: 'A release phases you out: nothing touches you, and you ram through anything.',
    note: 'For three seconds.',
    apply: (s) => { s.ocPhase = 3; },
  },

  // ── synergies ──────────────────────────────────────────────────────────
  {
    id: 'sy_plasma_torps', name: 'Plasma warheads', branch: 'synergy', cat: 'weapons', kind: 'synergy', max: 1,
    requires: [{ id: 'tp_bay' }, { id: 'pl_vent' }], tags: ['torpedo', 'plasma', 'area'],
    text: 'Your torpedo blasts leave a burning plasma cloud.',
    apply: (s) => { s.torpPlasma = true; },
  },
  {
    id: 'sy_detonator', name: 'Phaser detonators', branch: 'synergy', cat: 'weapons', kind: 'synergy', max: 1,
    requires: [{ id: 'mn_layer' }, { id: 'ph_emitters', lv: 2 }], tags: ['mine', 'phaser'],
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
  {
    id: 'sy_core_mines', name: 'Core-charged mines', branch: 'synergy', cat: 'weapons', kind: 'synergy', max: 1,
    requires: [{ id: 'mn_layer' }, { id: 'oc_coils' }], tags: ['mine', 'overcharge'],
    text: 'Your overcharge release lays a ring of mines around you and refills your racks.',
    apply: (s) => { s.ocRefill = true; },
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
    tags: ['mobility', 'speed', 'overcharge'],
    text: 'A higher top speed, and near misses at speed charge the core twice as fast.',
    apply: (s) => { s.thrust *= 1.12; s.speedGraze = true; },
  },
  {
    id: 'ut_prospector', name: 'Prospector', branch: 'utility', cat: 'ship', kind: 'spec', max: 1, group: 'utility', needs: 3,
    tags: ['utility', 'xp'],
    text: 'Rock gives up dilithium half again as often.',
    apply: (s) => { s.crystalChance *= 1.5; s.tractor *= 1.1; },
  },
  {
    id: 'ut_salvager', name: 'Salvage drones', branch: 'utility', cat: 'ship', kind: 'spec', max: 1, group: 'utility', needs: 3,
    tags: ['utility', 'defence'],
    text: 'Hull repairs turn up more often, and power-ups last half again as long.',
    note: 'Still no more than one repair every half minute.',
    apply: (s) => { s.repairChance *= 1.8; s.powerTime *= 1.5; },
  },
  {
    id: 'ut_scanner', name: 'Deep scanners', branch: 'utility', cat: 'ship', kind: 'spec', max: 1, group: 'utility', needs: 3,
    tags: ['utility', 'xp', 'damage'],
    text: 'Rare rock turns up twice as often, and elites carry twice the dilithium.',
    apply: (s) => { s.rareRate *= 2; s.eliteLoot *= 2; },
  },

  // ── salvage: tech from the capital ships you destroy ───────────────────
  {
    id: 'tech_klingon', name: 'Klingon disruptors', branch: 'salvage', cat: 'weapons', kind: 'tech', max: 1, tech: 'klingon', tags: ['phaser', 'damage'],
    text: 'Every fourth phaser shot is a disruptor bolt at triple damage.',
    apply: (s) => { s.disruptor = 4; },
  },
  {
    id: 'tech_cardassian', name: 'Cardassian compressors', branch: 'salvage', cat: 'weapons', kind: 'tech', max: 1, tech: 'cardassian', tags: ['phaser', 'torpedo', 'range'],
    text: 'Your lances reach further and pierce one more target; torpedo blasts widen.',
    apply: (s) => { s.phaserLife *= 1.2; s.phaserPierce += 1; s.torpBlast *= 1.1; },
  },
  {
    id: 'tech_romulan', name: 'Romulan cloak', branch: 'salvage', cat: 'ship', kind: 'tech', max: 1, tech: 'romulan', tags: ['mobility', 'evasion'],
    text: 'A barrel roll cloaks you: hostile hulls hold their fire for a moment.',
    note: 'Capital ships see through it.',
    apply: (s) => { s.rollCloak = 1.6; s.rollIframes += 0.1; },
  },
  {
    id: 'tech_borg', name: 'Borg adaptive shield', branch: 'salvage', cat: 'defence', kind: 'tech', max: 1, tech: 'borg', tags: ['defence', 'shield'],
    text: 'Your shield adapts: it recharges faster, and a ship with no shield gets one.',
    apply: (s) => { s.shieldMax = Math.max(1, s.shieldMax); s.shieldRecharge *= 0.8; },
  },
  {
    id: 'tech_tholian', name: 'Tholian snares', branch: 'salvage', cat: 'weapons', kind: 'tech', max: 1, tech: 'tholian', tags: ['mine', 'torpedo', 'control'],
    text: 'Your torpedo and mine blasts snare the hulls they catch, slowing them hard.',
    apply: (s) => { s.snare = 3; },
  },

  // ── minor nodes: the small steps along the web's paths ─────────────────
  ...minor('mi_phaser_dmg', 'Emitter tuning', 'phaser', 'weapons', ['phaser', 'damage'], 'Your lances hit a little harder.', (s) => { s.phaserDamage *= 1.1; }),
  ...minor('mi_phaser_rate', 'Capacitor trim', 'phaser', 'weapons', ['phaser', 'rate'], 'Your phasers cycle a little faster.', (s) => { s.phaserCooldown *= 0.96; }),
  ...minor('mi_bank', 'Bank cells', 'phaser', 'weapons', ['phaser', 'sustain'], 'Your phaser bank holds a little more.', (s) => { s.bankMax += 12; s.bankRefill *= 1.06; }),
  ...minor('mi_reach', 'Lens polish', 'phaser', 'weapons', ['phaser', 'range'], 'Your lances fly a little faster.', (s) => { s.phaserSpeed *= 1.05; }),
  ...minor('mi_torp_dmg', 'Warhead trim', 'torpedo', 'weapons', ['torpedo', 'damage'], 'Your torpedoes hit a little harder.', (s) => { s.torpDamage *= 1.08; }),
  ...minor('mi_torp_reload', 'Loading drill', 'torpedo', 'weapons', ['torpedo', 'rate'], 'Your torpedoes reload a little faster.', (s) => { s.torpReload *= 0.95; }),
  ...minor('mi_blast', 'Shaped charges', 'torpedo', 'weapons', ['torpedo', 'mine', 'area'], 'Your torpedo and mine blasts reach a little wider.', (s) => { s.torpBlast *= 1.04; s.mineBlast *= 1.04; }),
  ...minor('mi_mine_dmg', 'Tricobalt grade', 'mine', 'weapons', ['mine', 'damage'], 'Your mines hit a little harder.', (s) => { s.mineDamage *= 1.08; }),
  ...minor('mi_mine_rate', 'Rack drill', 'mine', 'weapons', ['mine', 'rate'], 'You lay mines a little more often, and they last longer.', (s) => { s.mineInterval *= 0.95; s.mineLife *= 1.05; }),
  ...minor('mi_plasma_dps', 'Plasma injectors', 'plasma', 'weapons', ['plasma', 'damage'], 'Your plasma burns a little hotter.', (s) => { s.plasmaDps *= 1.1; }),
  ...minor('mi_plasma_life', 'Plasma baffles', 'plasma', 'weapons', ['plasma', 'area'], 'Your trail lingers a little longer, a little wider.', (s) => { s.plasmaLife *= 1.08; s.plasmaRadius *= 1.04; }),
  ...minor('mi_arc_dmg', 'Arc coils', 'close', 'weapons', ['close', 'arc'], 'Your arcs hit a little harder.', (s) => { s.arcDamage *= 1.04; }),
  ...minor('mi_ram', 'Prow plating', 'close', 'weapons', ['close', 'ram'], 'Your rams hit a little harder.', (s) => { s.ramDamage *= 1.05; }),
  ...minor('mi_thrust', 'Impulse trim', 'mobility', 'ship', ['mobility', 'speed'], 'A little more thrust.', (s) => { s.thrust *= 1.03; }),
  ...minor('mi_turn', 'Thruster trim', 'mobility', 'ship', ['mobility', 'turning'], 'You turn a little faster.', (s) => { s.turn *= 1.04; }),
  ...minor('mi_roll', 'Jet trim', 'mobility', 'ship', ['mobility', 'evasion'], 'Your roll comes round a little sooner.', (s) => { s.rollCooldown *= 0.94; }),
  ...minor('mi_shield', 'Shield cells', 'defence', 'defence', ['defence', 'shield'], 'Your shield recharges a little faster.', (s) => { s.shieldRecharge *= 0.94; }),
  ...minor('mi_grace', 'Bracing', 'defence', 'defence', ['defence', 'armour'], 'You stay untouchable a little longer after a hit.', (s) => { s.grace += 0.08; }),
  ...minor('mi_tractor', 'Tractor emitters', 'utility', 'ship', ['utility', 'tractor'], 'You pull dilithium in from a little further.', (s) => { s.tractor *= 1.1; }),
  ...minor('mi_xp', 'Dilithium lattice', 'utility', 'ship', ['utility', 'xp'], 'Every crystal is worth a little more.', (s) => { s.xpMult *= 1.04; }),
  ...minor('mi_oc_gain', 'Core sensors', 'overcharge', 'ship', ['overcharge', 'evasion'], 'Near misses charge the core a little faster.', (s) => { s.ocGain *= 1.08; }),
  ...minor('mi_oc_dmg', 'Core focus', 'overcharge', 'ship', ['overcharge', 'damage'], 'Your overcharge release hits a little harder and wider.', (s) => { s.ocDamage *= 1.12; s.ocRadius *= 1.03; }),
  ...minor('mi_all_damage', 'Fire control', 'synergy', 'weapons', ['damage'], 'All your weapons hit a little harder.', (s) => { s.dmgAll *= 1.04; }),
];

/** A minor upgrade: a small step, owned up to ten times (one per node of it in the web). */
function minor(id: string, name: string, branch: Branch, cat: Category, tags: string[], text: string, apply: (s: Stats) => void): UpgradeDef[] {
  return [{ id, name, branch, cat, kind: 'minor', max: 10, tags, text, apply }];
}

export const UPGRADE: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** The text for the level about to be fitted. */
export function upgradeText(u: UpgradeDef, lv: number): string {
  return typeof u.text === 'function' ? u.text(lv) : u.text;
}
