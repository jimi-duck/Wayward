import type { Row } from '../../sim/script';
import { relay } from './kit';

// ── The Reach: chapter script ──────────────────────────────────────────────
// One row per beat, stop by stop, word for word from "The Reach: Chapter
// Script" (docs/ROAD.md). The text is English; the world runs it through t().
// The jobs' thread lines follow in their own pull request; the Narrows are in
// narrows.ts.

const SAM = 'Sam Okoro';
const ILSE = 'Ilse Marrow';
const sam = (id: string, stop: string, on: Row['on'], text: string, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { radio: { from: SAM, caller: 'miners', text } }, ...extra });
const notice = (id: string, stop: string, on: Row['on'], tone: 'teal' | 'amber' | 'red' | 'white', headline: string, reason?: string, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { notice: { tone, headline, reason } }, ...extra });
const objective = (id: string, stop: string, on: Row['on'], main: string, quiet?: string): Row => ({ id, stop, on, do: { objective: { main, quiet } } });
const voice = (from: string, caller: string) => (id: string, stop: string, flag: string, text: string, cond: Row['if'] = undefined): Row => ({ id, stop, on: { on: 'flag', flag }, do: { radio: { from, caller, text } }, ...(cond ? { if: cond } : {}) });
const pike = (id: string, flag: string, text: string, cond?: Row['if']): Row => voice('Owen Pike', 'gutter')(id, 'northfold', flag, text, cond);
const hester = (id: string, flag: string, text: string): Row => voice('Hester', 'miners')(id, 'branford', flag, text);
/** A Reach relay woken (sim/uplink.ts, content/road.ts REACH_RELAYS): the key is told even in a fight, and the gate opens. */
const lit = (id: string, stop: string, reason: string): Row => ({ id, stop, on: relay(), wall: `relay_${stop}`, do: { notice: { tone: 'teal', headline: 'Warden key accepted', reason } }, main: true, urgent: true });
const card = (id: string, stop: string, on: Row['on'], def: string, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { card: def }, ...extra });

export const REACH: Row[] = [
  // the pursuit, counted in days, is a HUD readout under the objective now, not a notice (ui/hud.ts; one voice at a time)
  // the Wall's first line about the order, wherever it was taken
  notice('wall_order', '*', { on: 'flag', flag: 'clue_order_sig' }, 'teal', 'The Wall', 'the closing order, signed L. C.'),

  // ── The audit dock's system: the first jump is Northfold, the quiet lane the archive points to (Halden's Reach is the one after) ──
  objective('au_gate', 'audit', { on: 'leave' }, 'Jump to Northfold', 'Then Halden’s Reach · meet Ilse Marrow'),

  // ── Stop 1 · Northfold (landfall) ──
  notice('nf_notice', 'northfold', { on: 'arrive' }, 'teal', 'Northfold', 'Kellern space, quiet crossing'),
  objective('nf_objective', 'northfold', { on: 'arrive' }, 'Next: Halden’s Reach · meet Ilse Marrow', 'The Narrows · 5 jumps'),
  // Sam speaks once a stop (owner, 22 November 2026): here, on the ghost; the Narrows' warning moves to Copperline
  // the Quiet Line's first job, at the quiet landfall so Halden is the Warden's alone (owner, 6 November 2026) (content/missions.ts nothing_to_declare): Owen Pike answers by what the player did; flags from sim/stage.ts
  pike('hr_pike_won', 'job_nothing_to_declare_won', '“The medicine reached the hospice, and nobody saw you do it. People out here will live because of that. I’ll call again, Wayward.”', { not: ['job_nothing_to_declare_sell'] }),
  pike('hr_pike_sold', 'job_nothing_to_declare_sell', '“Custody paid you thirty-five for my medicine. The hospice paid the rest, in people. I hope the Cyrite keeps you warm.”'),
  pike('hr_pike_no', 'job_nothing_to_declare_declined', '“No offence taken. The Quiet Line has waited seventy years for the gates to open. We can wait for you too.”'),
  // the ghost (sim/ghost.ts): the quiet lane is not quite empty. The flag comes with the contact; the Wall is set the moment it triggers,
  // so a jump before Sam speaks still logs it
  notice('nf_ghost', 'northfold', { on: 'flag', flag: 'ghost_here' }, 'white', 'UNKNOWN CONTACT', '4.2 km · holding', { wall: 'clue_ghost' }),
  sam('nf_sam_g1', 'northfold', { on: 'after', row: 'nf_ghost' }, '“Something’s on your scope, Juno. Old relays throw ghosts sometimes, echoes from before the gates went dark. Probably that. Keep an eye on it anyway.”'),
  notice('nf_ghost_2', 'northfold', { on: 'flag', flag: 'ghost_close' }, 'white', 'UNKNOWN CONTACT', '3.1 km'),
  objective('nf_gate', 'northfold', { on: 'leave' }, 'Jump to Halden’s Reach'),

  // ── Stop 2 · Halden's Reach (hub) ──
  notice('hr_notice', 'halden', { on: 'arrive' }, 'teal', 'Halden’s Reach', 'Kellern port, hospice ring'),
  // the model scene (owner, 22 November 2026, "Make every stop readable"): the arrival looks at the skiff, Ilse speaks first and
  // alone, the card, the paper, and Sam once, at the end
  objective('hr_objective', 'halden', { on: 'arrive' }, 'Ilse’s skiff · coming alongside', 'Frontier port · refit bay open'),
  { id: 'hr_ilse', stop: 'halden', on: { on: 'arrive' }, do: { radio: { from: ILSE, caller: 'miners', text: '“Wayward, this is Ilse Marrow, off the hospice ring. Keep flying, I’ll come to you. Kellern listens on the open band.”' } } },
  // Ilse's skiff off the hospice ring (content/script/places.ts): she reads the order once Juno holds alongside (no choice: the owner,
  // 31 October 2026), then puts the paper out in a canister to be taken aboard. The gate waits for both, and names the place.
  // The name follows the order wherever it is taken (it can be carried on)
  card('hr_warden', 'halden', { on: 'place', place: 'hr_skiff' }, 'story_order', { holdsJob: true, main: true }),
  { id: 'hr_canister', stop: 'halden', on: { on: 'flag', flag: 'frag_order' }, do: { radio: { from: ILSE, caller: 'miners', text: '“I’m passing it across in a canister. Seventy years I’ve kept that paper. They can wipe a record, Juno, but they can’t wipe paper.”' } } },
  sam('hr_paper', 'halden', { on: 'place', place: 'hr_paper' }, '“A signed order to shut the gates, Juno. Not a failure. Someone chose this, and signed it L. C. Tallyhouse keeps Kellern’s books. Someone there will know the hand.”', { main: true }),
  card('hr_order', '*', { on: 'flag', flag: 'frag_order' }, 'story_order', { if: { not: ['clue_order_sig'] }, holdsJob: true }),
  // at Halden, Ilse names Ada on the radio after the order: one card a stop (owner, 23 November 2026); the card is for an order found elsewhere
  { id: 'hr_ada', stop: 'halden', on: { on: 'flag', flag: 'frag_order' }, if: { has: ['ilse_met'], not: ['ada_named'] }, wall: 'ada_named', do: { radio: { from: ILSE, caller: 'miners', text: '“That’s Ada Aster’s tender. I’d know her lamps anywhere. We stood watch together the night it went dark. Is her old core still in there?”' } } },
  card('hr_hand', '*', { on: 'flag', flag: 'clue_order_sig' }, 'story_handwriting', { if: { not: ['ada_named', 'ilse_met'] }, holdsJob: true }),
  // her relay: Ilse points to it as the paper crosses, so it is said before a pilot already at the mast wakes it (the lines
  // are longer since 28 November 2026); the gate waits for it (spaceways plan, step 4)
  { id: 'hr_relay_say', stop: 'halden', on: { on: 'after', row: 'hr_canister', delay: 2 }, do: { radio: { from: ILSE, caller: 'miners', text: '“The relay by your gate was ours, once. Let Ada’s core talk to it, and Halden can trade with the outer systems again.”' } } },
  lit('hr_relay', 'halden', 'Halden’s gate is open'),
  objective('hr_gate', 'halden', { on: 'leave' }, 'Jump to Tallyhouse'),

  // ── Stop 3 · Tallyhouse (turn) ──
  notice('ml_notice', 'marlow', { on: 'arrive', delay: 2 }, 'teal', 'Tallyhouse', 'Kellern accounts station'),
  objective('ml_objective', 'marlow', { on: 'arrive', delay: 2 }, 'Brook’s shuttle · coming alongside'),
  { id: 'ml_hail', stop: 'marlow', on: { on: 'arrive' }, if: { not: ['brook_met'] }, do: { radio: { from: 'Adam Brook', caller: 'kellern', text: '“This is Adam Brook, Kellern accounts. I’m coming out to you, so keep your heading. My shift ends soon, and after that someone will ask where I went.”' } } },
  // Brook's shuttle idles off the station (content/script/places.ts): alongside, he offers the books; the spike he leaves is taken aboard
  card('ml_ledger', 'marlow', { on: 'place', place: 'ml_shuttle' }, 'story_ledger', { main: true }),
  { id: 'ml_brook', stop: 'marlow', on: { on: 'flag', flag: 'frag_ledger' }, do: { radio: { from: 'Adam Brook', caller: 'kellern', text: '“The data spike’s coming across now. Every payment Kellern made the night the gates closed is on it. If anyone asks, I was never here. They’ll ask.”' } } },
  notice('ml_wall', 'marlow', { on: 'place', place: 'ml_spike' }, 'teal', 'The Wall', 'same initials on the transfers', { main: true }),
  sam('ml_sam_1', 'marlow', { on: 'after', row: 'ml_wall' }, '“L. C. again, Juno. On the order that shut the gates, and on the money that paid for it. Whoever that is, they signed both.”', { if: { has: ['clue_order_sig'] } }),
  sam('ml_sam_alt', 'marlow', { on: 'after', row: 'ml_wall' }, '“The transfers are all signed L. C. That means nothing to me yet. Remember it anyway. Somebody was paid well the night the gates went dark.”', { if: { not: ['clue_order_sig'] } }),
  // Juno never heard Ilse at Halden: her recording waits on a message buoy off the station, with the order and Ada's name
  card('ml_ilse', 'marlow', { on: 'place', place: 'ml_buoy' }, 'ilse_recording', { if: { not: ['frag_order'] }, main: true }),
  { id: 'ml_relay_say', stop: 'marlow', on: { on: 'after', row: 'ml_wall', delay: 8 }, if: { has: ['brook_met'] }, do: { radio: { from: 'Adam Brook', caller: 'kellern', text: '“That relay by the gate carried Kellern’s books out-system, back when the gates were open. Wake it, and the truth travels with you instead.”' } } },
  lit('ml_relay', 'marlow', 'the books can travel now'),
  objective('ml_gate', 'marlow', { on: 'leave' }, 'Jump to Miners’ Gap'),

  // ── Stop 4 · Miners’ Gap (work under pressure) ──
  notice('bf_notice', 'branford', { on: 'arrive', delay: 2 }, 'teal', 'Miners’ Gap', 'contested gate · Hester’s crews'),
  objective('bf_objective', 'branford', { on: 'arrive', delay: 2 }, 'Miners’ Gap · the gate to Copperline', 'Toll beacon · on the scope'),
  // Hester's opener: the beacon is on her crews' lane, and the job's call follows
  { id: 'bf_hester', stop: 'branford', on: { on: 'arrive', delay: 6 }, do: { radio: { from: 'Hester', caller: 'miners', text: '“Hester, rig boss, Miners’ Gap. Our gate’s shut twice over. Pirates have a toll beacon on it, and the relay’s buried under our spoil rock. Clear either and my crews eat.”' } } },
  // Hester's crews, step 1: her three results (flags from sim/stage.ts)
  hester('bf_hester_won', 'job_pirate_toll_won', '“The beacon’s gone and my crews can haul again. I owe you one, Juno. Out here we write those names down, and we remember them.”'),
  hester('bf_hester_lost', 'job_pirate_toll_lost', '“You tried, and that’s more than most would. The beacon’s still there, but my crews saw who stood up for them.”'),
  hester('bf_hester_no', 'job_pirate_toll_declined', '“Understood. You’ve got your own trouble. We’ll find another way. Since the gates closed, we always do.”'),
  sam('bf_sam', 'branford', { on: 'free' }, '“The Net’s spreading behind you, Juno. Custody checkpoints, scanners, the lot. Every hour you stay, they get closer. Don’t stop long.”'),
  // the buried relay: a spoil rock sits on the mast (sim/world.ts stepTwist); Hester's opener says so
  lit('bf_relay', 'branford', 'Hester’s gate is open'),
  objective('bf_gate', 'branford', { on: 'leave' }, 'Jump to Copperline'),

  // ── Stop 5 · Copperline (reckoning) ──
  notice('cl_notice', 'copperline', { on: 'arrive', delay: 2 }, 'teal', 'Copperline', 'Kellern port · before the Narrows'),
  objective('cl_objective', 'copperline', { on: 'arrive', delay: 2 }, 'Copperline · refit before the Narrows'),
  sam('cl_sam', 'copperline', { on: 'free', after: 5 }, '“This is the last port before the Narrows, Juno. My signal won’t reach past it, so fit what you can now. After the Narrows, you’re in the outer systems.”'),
  // a Custody transport crosses the system: Brook, whichever way the ledger went
  card('cl_brook', 'copperline', { on: 'after', row: 'cl_sam', delay: 6 }, 'story_brook_road', { if: { has: ['brook_met'] }, main: true }),
  card('cl_brook_no', 'copperline', { on: 'after', row: 'cl_sam', delay: 6 }, 'story_brook_declined', { if: { not: ['brook_met'] }, main: true }),
  // the guarded relay: two patrol fighters sit on the mast (sim/world.ts stepTwist)
  lit('cl_relay', 'copperline', 'the last gate before the Narrows'),
  objective('cl_gate', 'copperline', { on: 'leave' }, 'Jump to the Narrows'),
];
