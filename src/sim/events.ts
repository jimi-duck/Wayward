// What happened in the simulation, for everything downstream of it: effects,
// the mission log, the HUD, and later audio. The world appends to a list each
// step and the renderer drains it each frame. Nothing reads these back into
// the simulation. Positions carry an altitude (y) wherever the thing could be
// off the play plane.

export type BlastKind = 'torpedo' | 'bomblet' | 'mine' | 'volatile' | 'elite' | 'reactive' | 'strike';
export type PowerKind = 'shield' | 'rapid' | 'yield' | 'overdrive';

export type GameEvent =
  | { type: 'bolt'; x: number; z: number; heading: number }
  | { type: 'torpedo'; x: number; z: number; heading: number; target: number | null }
  /** A rock took a hit at (x, y, z): `rx`, `rz` is its centre, `hp` what is left of it (0 to 1), `src` the weapon (a string: the sim's Weapon names). */
  | { type: 'rockHit'; x: number; y: number; z: number; id: number; rx: number; rz: number; r: number; kind: string; size: number; hp: number; src: string }
  | { type: 'rockDestroyed'; id: number; x: number; z: number; r: number; vx: number; vz: number; size: number; points: number; kind: string; src: string; left?: number }
  | { type: 'bulwarkHit'; x: number; y: number; z: number }
  | { type: 'bulwarkBroken'; x: number; z: number; r: number; points: number }
  | { type: 'blast'; x: number; y: number; z: number; radius: number; kind: BlastKind }
  | { type: 'shipHit'; x: number; z: number; plates: number; source: string; fx?: number; fz?: number }
  | { type: 'shieldHit'; x: number; z: number; left: number; source: string; fx?: number; fz?: number }
  | { type: 'shieldUp'; charges: number }
  | { type: 'damageControl'; x: number; z: number }
  | { type: 'regen'; plates: number }
  /** Self-repair (the arcade): a plate begun, and a plate done. */
  | { type: 'mendStart' }
  | { type: 'mended'; plates: number }
  | { type: 'breach'; x: number; z: number; score: number }
  | { type: 'bankEmpty' }
  | { type: 'gunsCold' }
  /** The port will not take the ship while a fight is on. */
  | { type: 'dockDenied' }
  /** The fight is over and the clamps take the ship. */
  | { type: 'dockCleared' }
  /** The ship has flown into a place that changes it: what it does, by report kind (sim/space.ts). */
  | { type: 'anomalyIn'; kinds: string[] }
  | { type: 'rackEmpty' }
  | { type: 'enemyFire'; x: number; y: number; z: number; faction: string }
  | { type: 'alienHit'; x: number; y: number; z: number; id: number }
  | { type: 'alienDestroyed'; x: number; y: number; z: number; kind: string; faction: string; points: number; r: number; elite: boolean; label: string }
  | { type: 'evade'; id: number }
  | { type: 'plasma'; x: number; z: number }
  | { type: 'plasmaDown'; x: number; y: number; z: number }
  | { type: 'webSet'; x: number; z: number }
  | { type: 'pickup'; x: number; z: number; plates: number }
  | { type: 'crystal'; x: number; z: number; value: number }
  /** Cyrite picked up; `fuel` is how much of it the refinery sent to the tank. */
  | { type: 'cyrite'; x: number; z: number; value: number; fuel: number }
  | { type: 'power'; x: number; z: number; kind: PowerKind }
  | { type: 'fitted'; id: string }
  | { type: 'salvage'; faction: string; tech: boolean }
  | { type: 'cloak'; x: number; z: number }
  | { type: 'break'; x: number; z: number }
  | { type: 'bossWarn'; name: string; faction: string; hails: boolean }
  | { type: 'hail'; name: string; faction: string }
  | { type: 'bossEvaded'; name: string; faction: string }
  | { type: 'bossSighted'; name: string; faction: string; x: number; z: number; r: number }
  | { type: 'bossJumped'; name: string; faction: string; bounty: number }
  | { type: 'bossArrive'; name: string; faction: string; x: number; z: number }
  | { type: 'bossHit'; x: number; y: number; z: number }
  | { type: 'bossPhase'; name: string; faction: string; phase: number; x: number; y: number; z: number }
  | { type: 'bossCharge'; x: number; z: number }
  | { type: 'bossFlank'; x: number; z: number }
  | { type: 'bossDestroyed'; x: number; y: number; z: number; name: string; faction: string; points: number }
  | { type: 'bossLeft'; name: string }
  /** A named captain looked the Wayward over and turned away. */
  | { type: 'captainLeft'; id: string; name: string; text: string }
  | { type: 'tractor' }
  | { type: 'mineLaid'; x: number; z: number }
  | { type: 'arc'; points: number[] }
  | { type: 'chain'; count: number; mult: number }
  | { type: 'strike'; x: number; z: number; r: number; kind: string }
  | { type: 'sectorEvent'; id: string; name: string; text: string }
  | { type: 'sectorEventEnd'; id: string; name: string; text: string; success: boolean }
  | { type: 'squad'; label: string }
  /** The raiders tore the hold away (the opening): `n` Cyrite of cargo, lost. */
  | { type: 'cargoLost'; n: number }
  /** The opening chase begins: Custody has seen the hauler leave. */
  | { type: 'chase' }
  /** The arcade's encounters: a group on its way, a hull that has made up its mind, and the quiet after. */
  | { type: 'contacts'; n: number }
  | { type: 'noticed'; id: number; x: number; y: number; z: number }
  | { type: 'quiet' }
  | { type: 'ore'; x: number; z: number; value: number }
  | { type: 'parts'; x: number; z: number; value: number }
  | { type: 'holdFull' }
  | { type: 'rockMined'; id: number; x: number; z: number; r: number; vx: number; vz: number; size: number; kind: string; ore: number; cyrite: number; points: number }
  | { type: 'patched'; plates: number }
  | { type: 'docked'; name: string }
  | { type: 'spool' }
  | { type: 'needFuel'; have: number; need: number }
  | { type: 'jumped'; x: number; z: number }
  | { type: 'comms'; id: string; tier: 'major'; kind: string; from: string; title: string; slow: boolean }
  /** A lighter card, as a call that rides along; and its channel closing (lapsed: nobody answered). */
  | { type: 'call'; id: string; tier: 'important' | 'routine'; kind: string; from: string; title: string; seconds: number }
  | { type: 'callEnd'; id: string; lapsed: boolean }
  /** A line on the radio: no answer asked. */
  | { type: 'ping'; id: string; from: string; caller: string; text: string; moment: string; system: string }
  | { type: 'commsAnswer'; id: string; choice: string; text: string; won: boolean }
  /** The Civic Score moved (sim/civic.ts): from, to, and why (English, for t()). */
  | { type: 'civic'; from: number; to: number; why: string }
  | { type: 'jobDone'; id: string; text: string }
  | { type: 'jobShort'; id: string; text: string };
