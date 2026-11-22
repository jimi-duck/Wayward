import type { Row } from '../../sim/script';

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
  sam('nf_sam_1', 'northfold', { on: 'free' }, '“Every lane out of here is watched but one. Whoever left you that message picked a quiet one.”'),
  sam('nf_sam_2', 'northfold', { on: 'after', row: 'nf_sam_1' }, '“My signal won’t reach past the Narrows. Make the most of me while you can.”'),
  // the Quiet Line's first job, at the quiet landfall so Halden is the Warden's alone (owner, 6 November 2026) (content/missions.ts nothing_to_declare): Owen Pike answers by what the player did; flags from sim/stage.ts
  pike('hr_pike_won', 'job_nothing_to_declare_won', '“Medicine through, and nobody saw you. Good. I’ll call again.”', { not: ['job_nothing_to_declare_sell'] }),
  pike('hr_pike_sold', 'job_nothing_to_declare_sell', '“Custody paid you thirty-five. The hospice paid the rest.”'),
  pike('hr_pike_no', 'job_nothing_to_declare_declined', '“No offence taken. The Line’s patient.”'),
  // the ghost (sim/ghost.ts): the quiet lane is not quite empty. The flag comes with the contact; the Wall is set the moment it triggers,
  // so a jump before Sam speaks still logs it
  notice('nf_ghost', 'northfold', { on: 'flag', flag: 'ghost_here' }, 'white', 'UNKNOWN CONTACT', '4.2 km · holding', { wall: 'clue_ghost' }),
  sam('nf_sam_g1', 'northfold', { on: 'after', row: 'nf_ghost' }, '“Ghost on the scope. Old relays throw them.”'),
  sam('nf_sam_g2', 'northfold', { on: 'after', row: 'nf_sam_g1' }, '“Probably.”'),
  notice('nf_ghost_2', 'northfold', { on: 'flag', flag: 'ghost_close' }, 'white', 'UNKNOWN CONTACT', '3.1 km'),
  sam('nf_sam_g3', 'northfold', { on: 'after', row: 'nf_ghost_2' }, '“It’s closer. I don’t like that.”'),
  objective('nf_gate', 'northfold', { on: 'leave' }, 'Jump to Halden’s Reach'),

  // ── Stop 2 · Halden's Reach (hub) ──
  notice('hr_notice', 'halden', { on: 'arrive' }, 'teal', 'Halden’s Reach', 'Kellern port, hospice ring'),
  // the model scene (owner, 22 November 2026, "Make every stop readable"): the arrival looks at the skiff, Ilse speaks first and
  // alone, she talks Juno in, the card, the paper, and Sam once, at the end
  objective('hr_objective', 'halden', { on: 'arrive' }, 'Ilse’s skiff · hold alongside', 'Frontier port · refit bay open'),
  { id: 'hr_ilse', stop: 'halden', on: { on: 'arrive' }, do: { radio: { from: ILSE, caller: 'miners', text: '“Wayward, this is Ilse Marrow, off the hospice ring. Come alongside. Slowly. Kellern listens on the open band.”' } } },
  { id: 'hr_ilse_near', stop: 'halden', on: { on: 'near', site: 'hr_skiff', within: 40 }, if: { not: ['ilse_met'] }, do: { radio: { from: ILSE, caller: 'miners', text: '“Closer. Hold there. Let me read your hull.”' } } },
  // Ilse's skiff off the hospice ring (content/script/places.ts): she reads the order once Juno holds alongside (no choice: the owner,
  // 31 October 2026), then puts the paper out in a canister to be taken aboard. The gate waits for both, and names the place.
  // The name follows the order wherever it is taken (it can be carried on)
  card('hr_warden', 'halden', { on: 'place', place: 'hr_skiff' }, 'story_order', { holdsJob: true, main: true }),
  { id: 'hr_canister', stop: 'halden', on: { on: 'flag', flag: 'frag_order' }, do: { radio: { from: ILSE, caller: 'miners', text: '“It’s in the canister off my bow. Paper can’t be wiped.”' } } },
  sam('hr_paper', 'halden', { on: 'place', place: 'hr_paper' }, '“Paper, signed L. C. Tallyhouse keeps Kellern’s books. Someone there will know the hand.”', { main: true }),
  card('hr_order', '*', { on: 'flag', flag: 'frag_order' }, 'story_order', { if: { not: ['clue_order_sig'] }, holdsJob: true }),
  card('hr_hand', '*', { on: 'flag', flag: 'clue_order_sig' }, 'story_handwriting', { if: { not: ['ada_named'] }, holdsJob: true }),
  objective('hr_gate', 'halden', { on: 'leave' }, 'Jump to Tallyhouse'),

  // ── Stop 3 · Tallyhouse (turn) ──
  notice('ml_notice', 'marlow', { on: 'arrive', delay: 2 }, 'teal', 'Tallyhouse', 'Kellern accounts station'),
  objective('ml_objective', 'marlow', { on: 'arrive', delay: 2 }, 'Tallyhouse · someone here keeps the real books'),
  // Brook's shuttle idles off the station (content/script/places.ts): alongside, he offers the books; the spike he leaves is taken aboard
  card('ml_ledger', 'marlow', { on: 'place', place: 'ml_shuttle' }, 'story_ledger', { main: true }),
  { id: 'ml_brook', stop: 'marlow', on: { on: 'flag', flag: 'frag_ledger' }, do: { radio: { from: 'Adam Brook', caller: 'kellern', text: '“The spike’s off my stern. If anyone asks, I was never here. They’ll ask.”' } } },
  notice('ml_wall', 'marlow', { on: 'place', place: 'ml_spike' }, 'teal', 'The Wall', 'same initials on the transfers', { main: true }),
  sam('ml_sam_1', 'marlow', { on: 'after', row: 'ml_wall' }, '“L. C. again. On the order, and on the money.”', { if: { has: ['clue_order_sig'] } }),
  sam('ml_sam_2', 'marlow', { on: 'after', row: 'ml_sam_1' }, '“Whoever that is, they signed both.”'),
  sam('ml_sam_alt', 'marlow', { on: 'after', row: 'ml_wall' }, '“L. C. means nothing to me. Remember it anyway.”', { if: { not: ['clue_order_sig'] } }),
  // Juno never heard Ilse at Halden: her recording waits on a message buoy off the station, with the order and Ada's name
  card('ml_ilse', 'marlow', { on: 'place', place: 'ml_buoy' }, 'ilse_recording', { if: { not: ['frag_order'] }, main: true }),
  sam('ml_ada', 'marlow', { on: 'after', row: 'ml_sam_2', delay: 4 }, '“Ada Aster. Dad said the Wardens were the Reach’s last honest people. So does Eben, at the yards.”', { if: { has: ['ada_named'] } }),
  objective('ml_gate', 'marlow', { on: 'leave' }, 'Jump to Miners’ Gap'),

  // ── Stop 4 · Miners’ Gap (work under pressure) ──
  notice('bf_notice', 'branford', { on: 'arrive', delay: 2 }, 'teal', 'Miners’ Gap', 'contested lane · Hester’s crews'),
  notice('bf_net', 'branford', { on: 'arrive', delay: 4 }, 'amber', 'Net at Northfold'),
  objective('bf_objective', 'branford', { on: 'arrive', delay: 2 }, 'Miners’ Gap · the lane to Copperline', 'Toll beacon · on the scope'),
  // Hester's opener: the beacon is on her crews' lane, and the job's call follows
  { id: 'bf_hester', stop: 'branford', on: { on: 'arrive', delay: 6 }, do: { radio: { from: 'Hester', caller: 'miners', text: '“Hester, rig boss. Heard you’re flying alone. That beacon’s on our lane, and we can’t pay its toll.”' } } },
  // Hester's crews, step 1: her three results (flags from sim/stage.ts)
  hester('bf_hester_won', 'job_pirate_toll_won', '“I owe you one. I’m writing your name down.”'),
  hester('bf_hester_lost', 'job_pirate_toll_lost', '“You tried. More than most.”'),
  hester('bf_hester_no', 'job_pirate_toll_declined', '“Understood. We’ll find another way. We always do.”'),
  sam('bf_sam', 'branford', { on: 'free' }, '“Net’s spreading behind you. Don’t stop long.”'),
  objective('bf_gate', 'branford', { on: 'leave' }, 'Jump to Copperline'),

  // ── Stop 5 · Copperline (reckoning) ──
  notice('cl_notice', 'copperline', { on: 'arrive', delay: 2 }, 'teal', 'Copperline', 'Kellern port · before the Narrows'),
  objective('cl_objective', 'copperline', { on: 'arrive', delay: 2 }, 'Copperline · refit before the Narrows'),
  sam('cl_sam', 'copperline', { on: 'free', after: 5 }, '“Last port before the Narrows. Fit what you can.”'),
  // a Custody transport crosses the system: Brook, whichever way the ledger went
  card('cl_brook', 'copperline', { on: 'after', row: 'cl_sam', delay: 6 }, 'story_brook_road', { if: { has: ['brook_met'] }, main: true }),
  card('cl_brook_no', 'copperline', { on: 'after', row: 'cl_sam', delay: 6 }, 'story_brook_declined', { if: { not: ['brook_met'] }, main: true }),
  sam('cl_taken', 'copperline', { on: 'flag', flag: 'brook_taken' }, '“They’ll make an example of him. Don’t let it be for nothing.”'),
  objective('cl_gate', 'copperline', { on: 'leave' }, 'Jump to the Narrows'),
];
