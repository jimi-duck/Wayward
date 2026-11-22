import type { StoryPlaceDef } from '../../sim/places';

// ── the story's places ────────────────────────────────────────────────────
// Where each beat of the road happens (sim/places.ts). A row of the stop's
// script waits on the place (`{ on: 'place', place: id }`) and plays once she
// has held there or taken it aboard. They stand on the port side of the
// course (the stop's port, if any, is to starboard), about 1.5 to 2 km from
// where she comes in, so she sees the first one as she arrives.

export const STORY_PLACES: StoryPlaceDef[] = [
  // Halden's Reach: Ilse's skiff off the hospice ring; she reads the order to her, then puts the paper out in a canister
  { id: 'hr_skiff', stop: 'halden', name: 'Ilse’s skiff', look: 'skiff', along: 0.17, off: -110, act: { hold: 6 }, r: 16, done: 'ilse_met', skip: ['frag_order'], verb: 'Hold alongside Ilse’s skiff' },
  { id: 'hr_paper', stop: 'halden', name: 'The order, on paper', look: 'canister', along: 0.19, off: -98, act: { pickup: true }, r: 3, done: 'order_aboard', show: 'frag_order', after: 'hr_canister', verb: 'Take the canister aboard' },
  // Tallyhouse: Brook's shuttle, idling off the accounts station; then the spike he leaves behind
  { id: 'ml_shuttle', stop: 'marlow', name: 'A clerk’s shuttle', look: 'skiff', along: 0.25, off: -117, act: { hold: 5 }, r: 16, done: 'brook_alongside', skip: ['frag_ledger'], verb: 'Hold alongside the clerk’s shuttle' },
  { id: 'ml_spike', stop: 'marlow', name: 'Brook’s data spike', look: 'canister', along: 0.28, off: -104, act: { pickup: true }, r: 3, done: 'spike_aboard', show: 'frag_ledger', after: 'ml_brook', verb: 'Take the data spike aboard' },
  // Tallyhouse: Ilse's message buoy, left on Juno's way to the books (only if Juno never heard her at Halden)
  { id: 'ml_buoy', stop: 'marlow', name: 'Ilse’s message buoy', look: 'buoy', along: 0.18, off: 96, act: { hold: 5 }, r: 14, done: 'buoy_read', skip: ['frag_order'], verb: 'Hold by Ilse’s message buoy' },
  // ── the road past the Narrows: each meeting happens at a hull she can see ──
  // The Long Walk: Ma Saffi's ship, the fleet's last, keeping the manifests
  { id: 'mw_saffi', stop: 'm_walk', name: 'Ma Saffi’s ship', look: 'ferry', along: 0.15, off: -110, act: { hold: 5 }, r: 18, done: 'saffi_alongside', skip: ['frag_manifests'], verb: 'Hold alongside Ma Saffi’s ship' },
  // Kessler's Wreck: the Warden cutter Aster, the recorder still running
  { id: 'bk_aster', stop: 'b_kessler', name: 'The Aster’s wreck', look: 'wreck', along: 0.17, off: -104, act: { hold: 6 }, r: 18, done: 'aster_reached', skip: ['frag_blackbox'], verb: 'Hold by the Aster’s wreck' },
  // Kiln: Kesh, slipping away from Val's people to talk (only if Val has been met)
  { id: 'bn_kesh', stop: 'b_kiln', name: 'Kesh’s runabout', look: 'skiff', along: 0.15, off: -110, act: { hold: 5 }, r: 16, done: 'kesh_alongside', show: 'broker', skip: ['kesh_trust'], verb: 'Hold alongside Kesh’s runabout' },
  // Tarik's Lamps: the lamp he hangs where a burned chart bends
  { id: 'bt_lamp', stop: 'b_tarik', name: 'Tarik’s lamp', look: 'buoy', along: 0.15, off: -98, act: { hold: 5 }, r: 14, done: 'lamp_reached', skip: ['frag_charts'], verb: 'Hold by Tarik’s lamp' },
  // The Quiet Ferry, and again at Ninth Fold
  { id: 'df_ferry', stop: 'd_ferry', name: 'The Quiet Ferry', look: 'ferry', along: 0.15, off: -110, act: { hold: 5 }, r: 18, done: 'ferry_alongside', skip: ['ferry_met'], verb: 'Hold alongside the Quiet Ferry' },
  { id: 'dn_ferry', stop: 'd_fold', name: 'The Quiet Ferry', look: 'ferry', along: 0.17, off: -110, act: { hold: 5 }, r: 18, done: 'ferry_alongside_2', skip: ['agent_exposed', 'agent_shielded'], verb: 'Hold alongside the Quiet Ferry' },
  // Yard Nine: Ben Anand's tender, off the claim office where nobody can listen
  { id: 'yn_anand', stop: 'y_nine', name: 'Ben Anand’s tender', look: 'skiff', along: 0.17, off: -110, act: { hold: 5 }, r: 16, done: 'anand_alongside', skip: ['frag_workorder'], verb: 'Hold alongside Anand’s tender' },
  // Mirren's Pier: the old pier boat where she keeps the box
  { id: 'fm_mirren', stop: 'f_mirren', name: 'Old Mirren’s boat', look: 'skiff', along: 0.15, off: -104, act: { hold: 5 }, r: 16, done: 'mirren_alongside', skip: ['frag_witnesses'], verb: 'Hold alongside Old Mirren’s boat' },
  // Palecairn: the hulk where Echo sleeps and Sable hides
  { id: 'hc_hulk', stop: 'h_cairn', name: 'The Palecairn hulk', look: 'wreck', along: 0.17, off: -110, act: { hold: 6 }, r: 18, done: 'hulk_reached', skip: ['echo_trust', 'sable_trust'], verb: 'Hold by the Palecairn hulk' },
  // Oren's three lights: one question at each
  { id: 'lg_light', stop: 'l_gap', name: 'Oren’s light', look: 'buoy', along: 0.15, off: -98, act: { hold: 5 }, r: 14, done: 'light_1', verb: 'Hold by Oren’s light' },
  { id: 'ld_light', stop: 'l_dimrim', name: 'Oren’s light', look: 'buoy', along: 0.15, off: -98, act: { hold: 5 }, r: 14, done: 'light_2', verb: 'Hold by Oren’s light' },
  { id: 'ls_light', stop: 'l_step', name: 'Oren’s light', look: 'buoy', along: 0.15, off: -98, act: { hold: 5 }, r: 14, done: 'light_3', verb: 'Hold by Oren’s light' },
];
