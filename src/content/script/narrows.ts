import type { Row } from '../../sim/script';

// ── The Narrows: the five steps (docs/ROAD.md) ────────────────────────────
// Approach at the blockade, the handshake at the relay mast, Ada's first note,
// the Patience's answer, and the way on. Word for word from "The Reach:
// Chapter Script". The handshake sets `relay_broadcast`: from then on the hunt
// knows the route (sim/calloway.ts), and the Course screen names Calloway.

const STOP = 'narrows';
const radio = (id: string, from: string, caller: string, on: Row['on'], text: string, extra: Partial<Row> = {}): Row => ({ id, stop: STOP, on, do: { radio: { from, caller, text } }, ...extra });
const notice = (id: string, on: Row['on'], tone: 'teal' | 'amber' | 'red' | 'white', headline: string, reason?: string): Row => ({ id, stop: STOP, on, do: { notice: { tone, headline, reason } } });

export const NARROWS_ROWS: Row[] = [
  // ── 1 · Approach ──
  notice('nr_notice', { on: 'arrive', delay: 2 }, 'amber', 'The Narrows', 'Custody blockade at the gate'),
  { id: 'nr_objective', stop: STOP, on: { on: 'arrive', delay: 2 }, do: { objective: { main: 'Reach the Narrows relay', quiet: 'Custody blockade · the Jump Gate' } } },
  radio('nr_sam_1', 'Sam Okoro', 'miners', { on: 'free', after: 6 }, '“That’s the relay your gran watched. Seventy years and they still guard a dead thing.”'),
  radio('nr_ashgrove', 'Inspector Ashgrove', 'custody', { on: 'flag', flag: 'ashgrove_met' }, '“I’ll remember the hull. Whoever you are.”'),

  // ── 2 · Handshake: 2 km from the mast ──
  { id: 'nr_answer', stop: STOP, on: { on: 'near', site: 'relay', within: 200 }, wall: 'relay_broadcast', do: { wall: 'clue_relay_answered' }, main: true },
  { id: 'nr_lit', stop: STOP, on: { on: 'near', site: 'relay', within: 200 }, do: { wall: 'relay_narrows' } },
  notice('nr_key', { on: 'near', site: 'relay', within: 200 }, 'teal', 'Warden key accepted'),
  notice('nr_open', { on: 'after', row: 'nr_key' }, 'amber', 'Warden channel open', 'broadcasting on every band'),
  radio('nr_sam_2', 'Sam Okoro', 'miners', { on: 'after', row: 'nr_open', delay: 2 }, '“Juno. The relay’s lit. Did you do that?”'),
  radio('nr_sam_3', 'Sam Okoro', 'miners', { on: 'after', row: 'nr_sam_2' }, '“It’s not just lit, it’s shouting. Every listening post in the Reach just heard Ada’s key, and your hull answer it.”'),

  // ── 3 · The note ──
  { id: 'nr_note', stop: STOP, on: { on: 'after', row: 'nr_sam_3', delay: 2 }, do: { card: 'warden_note_1' }, main: true },

  // ── 4 · The answer: the Patience comes through only after the note has closed ──
  notice('nr_patience', { on: 'flag', flag: 'warden_note_1' }, 'red', 'Offices channel open', 'CCV Patience inbound'),
  radio('nr_sam_gov', 'Sam Okoro', 'miners', { on: 'after', row: 'nr_patience' }, '“That’s no picket. Juno, that’s a Governor’s ship.”'),
  { id: 'nr_calloway', stop: STOP, on: { on: 'after', row: 'nr_sam_gov' }, do: { card: 'story_calloway_narrows' }, main: true },
  notice('nr_knows', { on: 'flag', flag: 'calloway_asked' }, 'amber', 'Governor Calloway', 'knows your route'),

  // ── 5 · The next leg ──
  { id: 'nr_gate', stop: STOP, on: { on: 'flag', flag: 'calloway_asked' }, do: { objective: { main: 'Jump to Wake', quiet: 'Find the Drift. They never stopped moving.' } } },
  radio('nr_sam_last', 'Sam Okoro', 'miners', { on: 'after', row: 'nr_knows', delay: 2 }, '“This is where my signal ends. If those relays carry Ada’s voice, maybe one day they’ll carry mine. Go.”'),
  { id: 'nr_lost', stop: STOP, on: { on: 'after', row: 'nr_sam_last', delay: 3 }, wall: 'sam_silent', do: { notice: { tone: 'white', headline: 'Signal lost', reason: 'Sam Okoro' } } },
];
