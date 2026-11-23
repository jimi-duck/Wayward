import type { StoryPlaceDef } from '../../sim/places';

// ── the story's places ────────────────────────────────────────────────────
// Where each beat of the road happens (sim/places.ts). A row of the stop's
// script waits on the place (`{ on: 'place', place: id }`) and plays once she
// has flown by it, a hull has kept pace alongside her, or what it handed
// across is aboard. A fixed place stands on her line to the Jump Gate
// (sim/places.ts placeAt); `along` and `off` only order and side it now
// (owner, 23 November 2026: "far away, out of the direction of the game").

export const STORY_PLACES: StoryPlaceDef[] = [
  // Halden's Reach: Ilse's skiff off the hospice ring; she reads the order to her, then puts the paper out in a canister
  { id: 'hr_skiff', stop: 'halden', name: 'Ilse’s skiff', look: 'skiff', along: 60, off: -32, act: { hold: 6 }, r: 16, done: 'ilse_met', skip: ['frag_order'], verb: 'Ilse’s skiff is coming alongside' },
  { id: 'hr_paper', stop: 'halden', name: 'The order, on paper', look: 'canister', along: 80, off: -22, act: { pickup: true }, r: 3, done: 'order_aboard', show: 'frag_order', after: 'hr_canister', verb: 'The order is coming across' },
  // Tallyhouse: Brook's shuttle, idling off the accounts station; then the spike he leaves behind
  { id: 'ml_shuttle', stop: 'marlow', name: 'Brook’s shuttle', look: 'skiff', along: 60, off: -32, act: { hold: 5 }, r: 16, done: 'brook_alongside', skip: ['frag_ledger'], verb: 'Brook’s shuttle is coming alongside' },
  { id: 'ml_spike', stop: 'marlow', name: 'Brook’s data spike', look: 'canister', along: 80, off: -22, act: { pickup: true }, r: 3, done: 'spike_aboard', show: 'frag_ledger', after: 'ml_brook', verb: 'The data spike is coming across' },
  // Tallyhouse: Ilse's message buoy, left on Juno's way to the books (only if Juno never heard her at Halden)
  { id: 'ml_buoy', stop: 'marlow', name: 'Ilse’s message buoy', look: 'buoy', along: 58, off: 32, act: { pass: true }, r: 14, done: 'buoy_read', skip: ['frag_order'], verb: 'Fly by Ilse’s message buoy' },
  // ── the road past the Narrows: each meeting happens at a hull she can see ──
  // The Long Walk: Ma Saffi's ship, the fleet's last, keeping the manifests
  { id: 'mw_saffi', stop: 'm_walk', name: 'Ma Saffi’s ship', look: 'ferry', along: 78, off: -42, act: { hold: 5 }, r: 26, done: 'saffi_alongside', skip: ['frag_manifests'], verb: 'Ma Saffi’s ship is coming alongside' },
  // Kessler's Wreck: the Warden cutter Aster, the recorder still running
  { id: 'bk_aster', stop: 'b_kessler', name: 'The Aster’s wreck', look: 'wreck', along: 78, off: -42, act: { pass: true }, r: 18, done: 'aster_reached', skip: ['frag_blackbox'], verb: 'Fly by the Aster’s wreck' },
  // Kiln: Kesh, slipping away from Val's people to talk (only if Val has been met)
  { id: 'bn_kesh', stop: 'b_kiln', name: 'Kesh’s runabout', look: 'skiff', along: 60, off: -32, act: { hold: 5 }, r: 16, done: 'kesh_alongside', show: 'broker', skip: ['kesh_trust'], verb: 'Kesh’s runabout is coming alongside' },
  // Tarik's Lamps: the lamp he hangs where a burned chart bends
  { id: 'bt_lamp', stop: 'b_tarik', name: 'Tarik’s lamp', look: 'buoy', along: 58, off: -32, act: { pass: true }, r: 14, done: 'lamp_reached', skip: ['frag_charts'], verb: 'Fly by Tarik’s lamp' },
  // The Quiet Ferry, and again at Ninth Fold
  { id: 'df_ferry', stop: 'd_ferry', name: 'The Quiet Ferry', look: 'ferry', along: 78, off: -42, act: { hold: 5 }, r: 26, done: 'ferry_alongside', skip: ['ferry_met'], verb: 'The Quiet Ferry is coming alongside' },
  { id: 'dn_ferry', stop: 'd_fold', name: 'The Quiet Ferry', look: 'ferry', along: 78, off: -42, act: { hold: 5 }, r: 26, done: 'ferry_alongside_2', skip: ['agent_exposed', 'agent_shielded'], verb: 'The Quiet Ferry is coming alongside' },
  // Yard Nine: Ben Anand's tender, off the claim office where nobody can listen
  // ...then the breaker line (the Yards' set piece, living-world plan): security purges the archive down the yard's chute, and the
  // other work orders spill along the line of half-built breakers, one after another, toward the gate
  { id: 'yn_order1', stop: 'y_nine', name: 'Work order BY9-002', look: 'canister', along: 130, off: -40, act: { pickup: true }, r: 3, done: 'order_1', show: 'frag_workorder', after: 'yn_spill', verb: 'Take work order 1 of 4 aboard', trail: true },
  { id: 'yn_order2', stop: 'y_nine', name: 'Work order BY9-003', look: 'canister', along: 210, off: 36, act: { pickup: true }, r: 3, done: 'order_2', show: 'order_1', verb: 'Take work order 2 of 4 aboard', trail: true },
  { id: 'yn_order3', stop: 'y_nine', name: 'Work order BY9-004', look: 'canister', along: 290, off: -32, act: { pickup: true }, r: 3, done: 'order_3', show: 'order_2', verb: 'Take work order 3 of 4 aboard', trail: true },
  { id: 'yn_order4', stop: 'y_nine', name: 'Work order BY9-005', look: 'canister', along: 370, off: 40, act: { pickup: true }, r: 3, done: 'order_4', show: 'order_3', verb: 'Take work order 4 of 4 aboard', trail: true },
  { id: 'yn_anand', stop: 'y_nine', name: 'Ben Anand’s tender', look: 'skiff', along: 60, off: -32, act: { hold: 5 }, r: 16, done: 'anand_alongside', skip: ['frag_workorder'], verb: 'Anand’s tender is coming alongside' },
  // Mirren's Pier: the old pier boat where she keeps the box
  { id: 'fm_mirren', stop: 'f_mirren', name: 'Old Mirren’s boat', look: 'skiff', along: 60, off: -32, act: { hold: 5 }, r: 16, done: 'mirren_alongside', skip: ['frag_witnesses'], verb: 'Old Mirren’s boat is coming alongside' },
  // Palecairn: the hulk where Echo sleeps and Sable hides
  { id: 'hc_hulk', stop: 'h_cairn', name: 'The Palecairn hulk', look: 'wreck', along: 78, off: -42, act: { pass: true }, r: 18, done: 'hulk_reached', skip: ['echo_trust', 'sable_trust'], verb: 'Fly by the Palecairn hulk' },
  // ── set pieces, one of a kind (owner, 23 November 2026: "distinctive, unique and interesting to look at") ──
  // Kessel Hold: the moot, the holdings' rigs moored round their hall; it speaks once she is among them
  { id: 'mk_moot', stop: 'm_kessel', name: 'The moot', look: 'moot', along: 82, off: -44, act: { pass: true }, r: 22, done: 'moot_reached', verb: 'Fly through the moot’s rigs' },
  // Tamsin Field: Custody's relay, the Saints' charges already on it
  { id: 'mt_relay', stop: 'm_tamsin', name: 'Custody relay', look: 'relay', along: 82, off: -44, act: { pass: true }, r: 26, done: 'relay_seen', verb: 'Fly by the Custody relay' },
  // Torchwall: the crews' picket across the yard crossing
  { id: 'yt_picket', stop: 'y_torch', name: 'The picket line', look: 'picket', along: 82, off: -44, act: { pass: true }, r: 20, done: 'picket_reached', verb: 'Fly by the picket line' },
  // Ninehaven: an old relay ring, broken open, that still speaks
  { id: 'fn_relay', stop: 'f_nine', name: 'The singing relay', look: 'chorus', along: 82, off: -44, act: { pass: true }, r: 22, done: 'chorus_heard', verb: 'Fly by the singing relay' },
  // Hollowforge: the pattern on the scope, hung in space
  { id: 'hf_pattern', stop: 'h_forge', name: 'The pattern', look: 'spiral', along: 82, off: -44, act: { pass: true }, r: 24, done: 'pattern_seen', verb: 'Fly by the pattern' },
  // Oren's three lights: one question at each
  { id: 'lg_light', stop: 'l_gap', name: 'Oren’s light', look: 'buoy', along: 58, off: -32, act: { pass: true }, r: 14, done: 'light_1', verb: 'Fly by Oren’s light' },
  { id: 'ld_light', stop: 'l_dimrim', name: 'Oren’s light', look: 'buoy', along: 58, off: -32, act: { pass: true }, r: 14, done: 'light_2', verb: 'Fly by Oren’s light' },
  { id: 'ls_light', stop: 'l_step', name: 'Oren’s light', look: 'buoy', along: 58, off: -32, act: { pass: true }, r: 14, done: 'light_3', verb: 'Fly by Oren’s light' },
];
