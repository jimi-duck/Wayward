import type { Row } from '../../sim/script';

// ── The Reach: chapter script ──────────────────────────────────────────────
// One row per beat, stop by stop, word for word from "The Reach: Chapter
// Script" (docs/ROAD.md). The text is English; the world runs it through t().
// The jobs' thread lines follow in their own pull request; the Narrows are in
// narrows.ts.

const SAM = 'Sam Okoro';
const sam = (id: string, stop: string, on: Row['on'], text: string, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { radio: { from: SAM, caller: 'miners', text } }, ...extra });
const notice = (id: string, stop: string, on: Row['on'], tone: 'teal' | 'amber' | 'red' | 'white', headline: string, reason?: string, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { notice: { tone, headline, reason } }, ...extra });
const objective = (id: string, stop: string, on: Row['on'], main: string, quiet?: string): Row => ({ id, stop, on, do: { objective: { main, quiet } } });
const voice = (from: string, caller: string) => (id: string, stop: string, flag: string, text: string, cond: Row['if'] = undefined): Row => ({ id, stop, on: { on: 'flag', flag }, do: { radio: { from, caller, text } }, ...(cond ? { if: cond } : {}) });
const pike = (id: string, flag: string, text: string, cond?: Row['if']): Row => voice('Owen Pike', 'gutter')(id, 'halden', flag, text, cond);
const hester = (id: string, flag: string, text: string): Row => voice('Hester', 'miners')(id, 'branford', flag, text);
const card = (id: string, stop: string, on: Row['on'], def: string, extra: Partial<Row> = {}): Row => ({ id, stop, on, do: { card: def }, ...extra });

export const REACH: Row[] = [
  // the pursuit, counted in days, is a HUD readout under the objective now, not a notice (ui/hud.ts; one voice at a time)
  // the Wall's first line about the order, wherever it was taken
  notice('wall_order', '*', { on: 'flag', flag: 'clue_order_sig' }, 'teal', 'The Wall', 'the closing order, signed L. C.'),

  // ── Stop 1 · Northfold (landfall) ──
  notice('nf_notice', 'northfold', { on: 'arrive' }, 'teal', 'Northfold', 'Kellern space, quiet crossing'),
  objective('nf_objective', 'northfold', { on: 'arrive' }, 'Next: Halden’s Reach · find the Warden’s record', 'The Narrows · 7 jumps'),
  sam('nf_sam_1', 'northfold', { on: 'free' }, '“Every lane out of here is watched but one. Whoever left you that message picked a quiet one.”'),
  sam('nf_sam_2', 'northfold', { on: 'after', row: 'nf_sam_1' }, '“My signal won’t reach past the Narrows. Make the most of me while you can.”'),
  objective('nf_gate', 'northfold', { on: 'leave' }, 'Jump to Halden’s Reach'),

  // ── Stop 2 · Halden's Reach (hub) ──
  notice('hr_notice', 'halden', { on: 'arrive' }, 'teal', 'Halden’s Reach', 'Kellern port, hospice ring'),
  objective('hr_objective', 'halden', { on: 'arrive' }, 'Halden’s Reach · find the Warden’s record', 'Frontier port · refit bay open'),
  sam('hr_sam', 'halden', { on: 'free' }, '“Halden’s Reach. Old Warden families retire here. If anyone remembers, it’s them.”'),
  // an old skiff hails from the hospice ring: her account, then (after either of the first two answers) the order, then the name
  // the three hold any job's call; the order and the name follow her card wherever it is answered (it can be carried on)
  card('hr_warden', 'halden', { on: 'after', row: 'hr_sam', delay: 4 }, 'story_warden', { holdsJob: true, main: true }),
  card('hr_order', '*', { on: 'flag', flag: 'frag_order' }, 'story_order', { if: { not: ['clue_order_sig'] }, holdsJob: true }),
  card('hr_hand', '*', { on: 'after', row: 'hr_order' }, 'story_handwriting', { holdsJob: true }),
  // the Quiet Line's first job (content/missions.ts nothing_to_declare): Owen Pike answers by what the player did; flags from sim/stage.ts
  pike('hr_pike_won', 'job_nothing_to_declare_won', '“You never saw what was in it. Good. I’ll call again.”', { not: ['job_nothing_to_declare_sell'] }),
  pike('hr_pike_sold', 'job_nothing_to_declare_sell', '“Custody paid you six. Remember what it cost.”'),
  pike('hr_pike_no', 'job_nothing_to_declare_declined', '“No offence taken. The Line’s patient.”'),
  objective('hr_gate', 'halden', { on: 'leave' }, 'Jump to Hollis'),

  // ── Stop 3 · Hollis (work): the ghost and the job's thread lines follow ──
  notice('ho_notice', 'hollis', { on: 'arrive', delay: 2 }, 'teal', 'Hollis', 'mining claim, rich rock'),
  // Hester's crews, step 1: the prospector's parting line
  { id: 'ho_prospector', stop: 'hollis', on: { on: 'flag', flag: 'job_follow_cyrite_won' }, do: { radio: { from: 'The prospector', caller: 'frontier', text: '“Tell Hester you helped. She keeps a list of people who do.”' } } },
  // the ghost (sim/ghost.ts): the flag comes with the contact; the Wall is set the moment it triggers, so a jump before Sam speaks still logs it
  notice('ho_ghost', 'hollis', { on: 'flag', flag: 'ghost_here' }, 'white', 'UNKNOWN CONTACT', '4.2 km · holding', { wall: 'clue_ghost' }),
  sam('ho_sam_1', 'hollis', { on: 'after', row: 'ho_ghost' }, '“Ghost on the scope. Old rigs throw them.”'),
  sam('ho_sam_2', 'hollis', { on: 'after', row: 'ho_sam_1' }, '“Probably.”'),
  notice('ho_ghost_2', 'hollis', { on: 'flag', flag: 'ghost_close' }, 'white', 'UNKNOWN CONTACT', '3.1 km'),
  sam('ho_sam_3', 'hollis', { on: 'after', row: 'ho_ghost_2' }, '“It’s closer. I don’t like that.”'),
  objective('ho_gate', 'hollis', { on: 'leave' }, 'Jump to Marlow'),

  // ── Stop 4 · Marlow (turn) ──
  notice('ml_notice', 'marlow', { on: 'arrive', delay: 2 }, 'teal', 'Marlow', 'Kellern accounts station'),
  objective('ml_objective', 'marlow', { on: 'arrive', delay: 2 }, 'Marlow · someone here keeps the real books'),
  card('ml_ledger', 'marlow', { on: 'free', after: 6 }, 'story_ledger', { main: true }),
  { id: 'ml_brook', stop: 'marlow', on: { on: 'flag', flag: 'frag_ledger' }, do: { radio: { from: 'Adam Brook', caller: 'kellern', text: '“If anyone asks, I was never here. They will ask.”' } } },
  notice('ml_wall', 'marlow', { on: 'after', row: 'ml_brook' }, 'teal', 'The Wall', 'same initials on the transfers'),
  sam('ml_sam_1', 'marlow', { on: 'after', row: 'ml_wall' }, '“L. C. again. On the order, and on the money.”', { if: { has: ['clue_order_sig'] } }),
  sam('ml_sam_2', 'marlow', { on: 'after', row: 'ml_sam_1' }, '“Whoever that is, they signed both.”'),
  sam('ml_sam_alt', 'marlow', { on: 'after', row: 'ml_wall' }, '“L. C. means nothing to me. Remember it anyway.”', { if: { not: ['clue_order_sig'] } }),
  { id: 'ml_declined', stop: 'marlow', on: { on: 'flag', flag: 'ledger_declined' }, do: { radio: { from: 'Adam Brook', caller: 'kellern', text: '“Then I’ll keep them. For now.”' } } },
  objective('ml_gate', 'marlow', { on: 'leave' }, 'Jump to Vesta'),

  // ── Stop 5 · Vesta (breather): nothing runs on a timer; lines come as Juno settles ──
  notice('ve_notice', 'vesta', { on: 'arrive' }, 'teal', 'Vesta', 'quiet crossing · no pursuit'),
  objective('ve_objective', 'vesta', { on: 'arrive' }, 'Rest here, or keep moving', 'The Narrows · 3 jumps'),
  notice('ve_ghost', 'vesta', { on: 'settle' }, 'teal', 'The Wall', 'unknown contact logged', { if: { has: ['clue_ghost'] } }),
  // Juno cut Ilse off: her recording carries the order, and Ada's name, here
  card('ve_ilse', 'vesta', { on: 'settle' }, 'ilse_recording', { if: { not: ['frag_order'] }, main: true }),
  { id: 've_hester', stop: 'vesta', on: { on: 'settle' }, do: { radio: { from: 'Hester', caller: 'miners', text: '“Hester, rig boss. My prospector says you’re decent. There’s a toll on our lane at Branford we can’t pay.”' } } },
  sam('ve_sam', 'vesta', { on: 'after', row: 've_hester' }, '“Ada Aster. Dad said the Wardens were the Reach’s last honest people. So does Eben, at the yards.”', { if: { has: ['ada_named'] } }),
  // only if she stays: a flavour line, dropped if she jumps first
  sam('ve_stay', 'vesta', { on: 'after', row: 've_sam', delay: 20 }, '“You don’t have to talk. I’ll just stay on the line a bit.”', { stale: 30 }),
  objective('ve_gate', 'vesta', { on: 'leave' }, 'Jump to Branford'),

  // ── Stop 6 · Branford (work under pressure) ──
  notice('bf_notice', 'branford', { on: 'arrive', delay: 2 }, 'teal', 'Branford', 'contested lane'),
  notice('bf_net', 'branford', { on: 'arrive', delay: 4 }, 'amber', 'Net at Northfold'),
  objective('bf_objective', 'branford', { on: 'arrive', delay: 2 }, 'Branford · the lane to Copperline', 'Toll beacon · on the scope'),
  // Hester's crews, step 2: her three results (flags from sim/stage.ts)
  hester('bf_hester_won', 'job_pirate_toll_won', '“That’s two. I’m writing your name down.”'),
  hester('bf_hester_lost', 'job_pirate_toll_lost', '“You tried. More than most.”'),
  hester('bf_hester_no', 'job_pirate_toll_declined', '“Understood. We’ll find another way. We always do.”'),
  sam('bf_sam', 'branford', { on: 'free' }, '“Net’s spreading behind you. Don’t stop long.”'),
  objective('bf_gate', 'branford', { on: 'leave' }, 'Jump to Copperline'),

  // ── Stop 7 · Copperline (reckoning) ──
  notice('cl_notice', 'copperline', { on: 'arrive', delay: 2 }, 'teal', 'Copperline', 'Kellern port · before the Narrows'),
  objective('cl_objective', 'copperline', { on: 'arrive', delay: 2 }, 'Copperline · refit before the Narrows'),
  sam('cl_sam', 'copperline', { on: 'free', after: 5 }, '“Last port before the Narrows. Fit what you can.”'),
  // a Custody transport crosses the system: Brook, whichever way the ledger went
  card('cl_brook', 'copperline', { on: 'after', row: 'cl_sam', delay: 6 }, 'story_brook_road', { if: { has: ['brook_met'] }, main: true }),
  card('cl_brook_no', 'copperline', { on: 'after', row: 'cl_sam', delay: 6 }, 'story_brook_declined', { if: { not: ['brook_met'] }, main: true }),
  sam('cl_taken', 'copperline', { on: 'flag', flag: 'brook_taken' }, '“They’ll make an example of him. Don’t let it be for nothing.”'),
  objective('cl_gate', 'copperline', { on: 'leave' }, 'The Narrows · 1 jump'),
];
