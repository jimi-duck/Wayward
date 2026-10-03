// What happened in the simulation, for everything downstream of it: effects,
// the mission log, the HUD, and later audio. The world appends to a list each
// step and the renderer drains it each frame. Nothing reads these back into
// the simulation.

export type GameEvent =
  | { type: 'bolt'; x: number; z: number; heading: number }
  | { type: 'torpedo'; x: number; z: number; heading: number; target: number | null }
  | { type: 'rockHit'; x: number; z: number; id: number }
  | { type: 'rockDestroyed'; x: number; z: number; size: number; points: number }
  | { type: 'blast'; x: number; z: number; radius: number }
  | { type: 'shipHit'; x: number; z: number; plates: number; source: string }
  | { type: 'breach'; x: number; z: number; score: number }
  | { type: 'bankEmpty' }
  | { type: 'rackEmpty' }
  | { type: 'alienHit'; x: number; z: number; id: number }
  | { type: 'alienDestroyed'; x: number; z: number; kind: string; faction: string; points: number }
  | { type: 'plasma'; x: number; z: number }
  | { type: 'plasmaDown'; x: number; z: number }
  | { type: 'webSet'; x: number; z: number }
  | { type: 'pickup'; x: number; z: number; plates: number }
  | { type: 'bossWarn'; name: string; faction: string }
  | { type: 'bossArrive'; name: string; faction: string; x: number; z: number }
  | { type: 'bossHit'; x: number; z: number }
  | { type: 'bossCharge'; x: number; z: number }
  | { type: 'bossDestroyed'; x: number; z: number; name: string; faction: string; points: number }
  | { type: 'bossLeft'; name: string }
  | { type: 'tractor' };
