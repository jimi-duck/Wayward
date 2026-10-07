import type { Caller } from '../sim/comms';
import type { SystemKind } from './systems';

// ── radio chatter ─────────────────────────────────────────────────────────
// The lightest weight of transmission: one line, no answer, a few seconds on
// the radio strip, then gone (sim/desk.ts decides when). Rows, not code: who
// says it, what, and when it fits. `on` is the moment: the arrival, a fight
// won, a hold nearly full, or the quiet between. Lines never ask anything
// of the player and never carry a fact the story depends on.

export type Moment = 'arrive' | 'won' | 'haul' | 'calm';

export interface Chatter {
  id: string;
  from: string;
  caller: Caller;
  text: string;
  on: Moment[];
  /** Only in these kinds of system, and only once the Net holds (true) or not (false) the system. */
  kind?: SystemKind[];
  netted?: boolean;
}

export const CHATTER: Chatter[] = [
  { id: 'lane_notice', from: 'Lane control', caller: 'custody', on: ['arrive'], kind: ['port', 'contested', 'gate'], text: '“Traffic advisory: all hulls hold to the marked lane. Inspections are random.”' },
  { id: 'lane_dark', from: 'Lane beacon', caller: 'unknown', on: ['arrive'], kind: ['transit', 'edge'], text: '“No traffic reported. No traffic expected.”' },
  { id: 'claim_chatter', from: 'Claim crew', caller: 'miners', on: ['arrive', 'calm'], kind: ['mining'], text: '“Third pass on this seam and it is still thin. Try the far side.”' },
  { id: 'pit_boss', from: 'Pit boss', caller: 'miners', on: ['arrive'], kind: ['mining'], text: '“Cutters off the lane, please. Somebody is working that rock.”' },
  { id: 'depot_ping', from: 'Depot', caller: 'frontier', on: ['arrive'], kind: ['port'], text: '“Dock is open. Two berths free, one is not what it says.”' },
  { id: 'net_notice', from: 'Net relay', caller: 'office', on: ['arrive', 'calm'], netted: true, text: '“This system is under Office of Peace protection. Welcome.”' },
  { id: 'net_static', from: 'Relay ghost', caller: 'unknown', on: ['calm'], netted: false, text: '“…unregistered carrier… no, never mind. Carry on.”' },
  { id: 'hauler_grumble', from: 'Ore hauler', caller: 'guild', on: ['calm', 'haul'], text: '“Hold full and the dock is a day away. Why do I do this.”' },
  { id: 'tug_song', from: 'Tug', caller: 'frontier', on: ['calm'], text: '“…and the Wayward went down with all her ore. Somebody write a better verse.”' },
  { id: 'kid_scanner', from: 'Scanner kid', caller: 'unknown', on: ['calm'], kind: ['port', 'transit'], text: '“Is that the stolen one? The orange one? Cool.”' },
  { id: 'patrol_bored', from: 'Custody patrol', caller: 'custody', on: ['calm'], kind: ['contested', 'port', 'gate'], text: '“Patrol four, nothing to report. Nothing to report. Nothing.”' },
  { id: 'gutter_laugh', from: 'Gutter crew', caller: 'gutter', on: ['calm', 'won'], kind: ['contested', 'transit'], text: '“Somebody has to lose today. Not us. Keep flying.”' },
  { id: 'salvor_call', from: 'Salvor', caller: 'miners', on: ['won'], text: '“Nice flying. I will be along for the pieces, if you do not mind.”' },
  { id: 'medic_beacon', from: 'Rescue beacon', caller: 'unknown', on: ['won'], text: '“Automated: debris field detected. No survivors requested.”' },
  { id: 'dock_gossip', from: 'Free dock', caller: 'frontier', on: ['won', 'calm'], kind: ['port'], text: '“Heard shooting out your way. Bring us the scrap and we will pretend we did not.”' },
  { id: 'old_hand', from: 'Old hand', caller: 'miners', on: ['haul'], text: '“Full hold means slow turns. Dump a little if something is chasing you.”' },
  { id: 'cargo_cheer', from: 'Barge', caller: 'frontier', on: ['haul'], text: '“That is a fat hold. The dock pays by the lump, not the pound.”' },
  { id: 'drift_hum', from: 'Drift fleet', caller: 'unknown', on: ['calm'], kind: ['transit', 'edge', 'mining'], text: '“We are only passing. The ships are old, and so are we.”' },
  { id: 'pilot_wave', from: 'Passing freighter', caller: 'guild', on: ['calm'], text: '“Clear sky ahead of you. Do not tell anyone I said that.”' },
  { id: 'wake_report', from: 'Weather desk', caller: 'office', on: ['calm', 'arrive'], text: '“Dust is thin and the lanes are quiet. A good day to be nobody.”' },
  { id: 'edge_voice', from: 'Edge relay', caller: 'unknown', on: ['arrive', 'calm'], kind: ['edge', 'gate'], text: '“Past here the charts are wishes. Fly carefully.”' },
];
