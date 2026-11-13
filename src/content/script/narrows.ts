import type { Row } from '../../sim/script';

// ── The Narrows: one scene (docs/ROAD.md) ──────────────────────────────────
// Custody has locked the Jump Gate. Ada's key at the old relay overrides it,
// and knocks the gate offline: it reboots under her key for 90 s with its
// damping field down, the blockade comes for her, and the Patience calls in
// the middle of it (sim/narrows.ts, run by the world). Then the gate opens and
// Sam's signal ends. The handshake sets `relay_broadcast`: from then on the
// hunt knows the route (sim/calloway.ts), and the Course screen names Calloway.

const STOP = 'narrows';
const radio = (id: string, from: string, caller: string, on: Row['on'], text: string, extra: Partial<Row> = {}): Row => ({ id, stop: STOP, on, do: { radio: { from, caller, text } }, ...extra });
const notice = (id: string, on: Row['on'], tone: 'teal' | 'amber' | 'red' | 'white', headline: string, reason?: string): Row => ({ id, stop: STOP, on, do: { notice: { tone, headline, reason } } });
const ASHGROVE = 'Inspector Ashgrove';

export const NARROWS_ROWS: Row[] = [
  // ── 1 · Locked ──
  notice('nr_notice', { on: 'arrive', delay: 2 }, 'amber', 'The Narrows', 'Custody has locked the Jump Gate'),
  { id: 'nr_objective', stop: STOP, on: { on: 'arrive', delay: 2 }, do: { objective: { main: 'Reach Ada’s relay', quiet: 'The Jump Gate is locked by Custody' } } },
  radio('nr_lock', ASHGROVE, 'custody', { on: 'arrive', delay: 6 }, '“The Narrows gate is closed by order. Turn back, whoever you are.”'),
  radio('nr_sam_1', 'Sam Okoro', 'miners', { on: 'after', row: 'nr_lock', delay: 4 }, '“That’s the relay your gran watched. Her key can still talk to that gate.”'),

  // ── 2 · The key: 2 km from the mast ──
  { id: 'nr_answer', stop: STOP, on: { on: 'near', site: 'relay', within: 200 }, wall: 'relay_broadcast', do: { wall: 'clue_relay_answered' }, main: true },
  { id: 'nr_lit', stop: STOP, on: { on: 'near', site: 'relay', within: 200 }, do: { wall: 'relay_narrows' } },
  notice('nr_key', { on: 'near', site: 'relay', within: 200 }, 'teal', 'Warden key accepted', 'the relay is waking'),
  { id: 'nr_note', stop: STOP, on: { on: 'after', row: 'nr_key', delay: 2 }, do: { card: 'warden_note_1' }, main: true },

  // ── 3 · Gate down: the world starts the reboot as the note closes (`narrows_reboot`) ──
  { id: 'nr_hold', stop: STOP, on: { on: 'flag', flag: 'narrows_reboot' }, do: { objective: { main: 'Hold out', quiet: 'The damping field is down' } } },
  radio('nr_ashgrove', ASHGROVE, 'custody', { on: 'flag', flag: 'narrows_reboot' }, '“I’ll remember the hull. Whoever you are.”', { urgent: true }),
  radio('nr_sam_hold', 'Sam Okoro', 'miners', { on: 'after', row: 'nr_ashgrove', delay: 10 }, '“Juno, the whole Reach just heard her key. Hang on.”', { urgent: true }),

  // ── 4 · The Patience: her card comes in the middle of it (sim/narrows.ts) ──

  // ── 5 · The way out ──
  { id: 'nr_gate', stop: STOP, on: { on: 'flag', flag: 'narrows_gate_open' }, do: { objective: { main: 'Jump to Wake', quiet: 'Find the Drift. They never stopped moving.' } } },
  radio('nr_sam_last', 'Sam Okoro', 'miners', { on: 'flag', flag: 'narrows_gate_open' }, '“This is where my signal ends. If those relays carry Ada’s voice, maybe one day they’ll carry mine. Go.”', { urgent: true }),
  { id: 'nr_lost', stop: STOP, on: { on: 'after', row: 'nr_sam_last', delay: 3 }, wall: 'sam_silent', do: { notice: { tone: 'white', headline: 'Signal lost', reason: 'Sam Okoro' } }, urgent: true },
];
