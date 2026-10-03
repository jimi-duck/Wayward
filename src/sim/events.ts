// What happened in the simulation, for everything downstream of it: effects,
// the mission log, the HUD, and later audio. The world appends to a list each
// step and the renderer drains it each frame. Nothing reads these back into
// the simulation. Positions carry an altitude (y) wherever the thing could be
// off the play plane.

export type BlastKind = 'torpedo' | 'bomblet' | 'mine' | 'volatile' | 'elite' | 'reactive' | 'strike';
export type PowerKind = 'shield' | 'rapid' | 'magnet' | 'overdrive' | 'charge';

export type GameEvent =
  | { type: 'bolt'; x: number; z: number; heading: number }
  | { type: 'torpedo'; x: number; z: number; heading: number; target: number | null }
  | { type: 'rockHit'; x: number; y: number; z: number; id: number }
  | { type: 'rockDestroyed'; x: number; z: number; size: number; points: number; kind: string }
  | { type: 'bulwarkHit'; x: number; y: number; z: number }
  | { type: 'blast'; x: number; y: number; z: number; radius: number; kind: BlastKind }
  | { type: 'shipHit'; x: number; z: number; plates: number; source: string }
  | { type: 'shieldHit'; x: number; z: number; left: number; source: string }
  | { type: 'shieldUp'; charges: number }
  | { type: 'damageControl'; x: number; z: number }
  | { type: 'regen'; plates: number }
  | { type: 'breach'; x: number; z: number; score: number }
  | { type: 'bankEmpty' }
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
  | { type: 'power'; x: number; z: number; kind: PowerKind }
  | { type: 'levelUp'; refit: number }
  | { type: 'fitted'; id: string; up: string | null }
  | { type: 'salvage'; faction: string; points: number; tech: boolean }
  | { type: 'cloak'; x: number; z: number }
  | { type: 'bossWarn'; name: string; faction: string; hails: boolean }
  | { type: 'hail'; name: string; faction: string }
  | { type: 'bossEvaded'; name: string; faction: string }
  | { type: 'bossArrive'; name: string; faction: string; x: number; z: number }
  | { type: 'bossHit'; x: number; y: number; z: number }
  | { type: 'bossPhase'; name: string; faction: string; phase: number; x: number; y: number; z: number }
  | { type: 'bossCharge'; x: number; z: number }
  | { type: 'bossFlank'; x: number; z: number }
  | { type: 'bossDestroyed'; x: number; y: number; z: number; name: string; faction: string; points: number }
  | { type: 'bossLeft'; name: string }
  | { type: 'tractor' }
  | { type: 'mineLaid'; x: number; z: number }
  | { type: 'arc'; points: number[] }
  | { type: 'graze'; x: number; y: number; z: number; amount: number }
  | { type: 'overchargeReady' }
  | { type: 'overcharge'; x: number; z: number; radius: number; hits: number }
  | { type: 'chain'; count: number; mult: number }
  | { type: 'strike'; x: number; z: number; r: number; kind: string }
  | { type: 'sectorEvent'; id: string; name: string; text: string }
  | { type: 'sectorEventEnd'; id: string; name: string; text: string; success: boolean }
  | { type: 'squad'; label: string };
