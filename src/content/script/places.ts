import type { StoryPlaceDef } from '../../sim/places';

// ── the story's places ────────────────────────────────────────────────────
// Where each beat of the road happens (sim/places.ts). A row of the stop's
// script waits on the place (`{ on: 'place', place: id }`) and plays once she
// has held there or taken it aboard. They stand on the port side of the
// course (the stop's port, if any, is to starboard), about a third of the way.

export const STORY_PLACES: StoryPlaceDef[] = [
  // Halden's Reach: Ilse's skiff off the hospice ring; she reads the order to her, then puts the paper out in a canister
  { id: 'hr_skiff', stop: 'halden', name: 'Ilse’s skiff', look: 'skiff', along: 0.32, off: -170, act: { hold: 6 }, r: 16, done: 'ilse_met', skip: ['frag_order'], verb: 'Hold alongside Ilse’s skiff' },
  { id: 'hr_paper', stop: 'halden', name: 'The order, on paper', look: 'canister', along: 0.34, off: -150, act: { pickup: true }, r: 3, done: 'order_aboard', show: 'frag_order', after: 'hr_canister', verb: 'Take the canister aboard' },
  // Marlow: Brook's shuttle, idling off the accounts station; then the spike he leaves behind
  { id: 'ml_shuttle', stop: 'marlow', name: 'A clerk’s shuttle', look: 'skiff', along: 0.4, off: -180, act: { hold: 5 }, r: 16, done: 'brook_alongside', skip: ['frag_ledger'], verb: 'Hold alongside the clerk’s shuttle' },
  { id: 'ml_spike', stop: 'marlow', name: 'Brook’s data spike', look: 'canister', along: 0.43, off: -160, act: { pickup: true }, r: 3, done: 'spike_aboard', show: 'frag_ledger', after: 'ml_brook', verb: 'Take the data spike aboard' },
  // Vesta: Ilse's message buoy, left where she knew Juno would rest (only if Juno never heard her at Halden)
  { id: 've_buoy', stop: 'vesta', name: 'Ilse’s message buoy', look: 'buoy', along: 0.3, off: -140, act: { hold: 5 }, r: 14, done: 'buoy_read', skip: ['frag_order'], verb: 'Hold by Ilse’s message buoy' },
];
