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
  | { type: 'shipHit'; x: number; z: number; plates: number }
  | { type: 'breach'; x: number; z: number; score: number }
  | { type: 'bankEmpty' }
  | { type: 'rackEmpty' };
