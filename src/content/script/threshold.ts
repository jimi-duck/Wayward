import type { Comer } from '../../sim/gathering';
import type { Row } from '../../sim/script';
import { CPS } from './broadcasts';
import { ALLIES } from '../waves';
import { ANALYST, PIKE, after, free, notice, objective, radio, relay } from './kit';

// ── the Threshold: the last stop as a scene ───────────────────────────────
// Wane Rest, before the last gate (docs/STORY_DIRECTION.md, plan "The Threshold
// as a scene"). Beats in order, one voice at a time:
//   1 · approach: Thane's last broadcast, on every band
//   2 · they gather: the Thren close round the gate
//   3 · who came: one line from each ally the player built, and a rival
//   4 · Calloway holds the gate herself (her last card, sim/calloway.ts)
//   5 · the last relay, by the gate: woken under her guns, allies on the ring (spaceways plan, step 7)
//   · Ada's note 8, and Juno's answer (ui/ending.ts)
//   6 · the choice: the six endings, each a political future
// The scene's last notice is a main beat: the gate holds until it has played.

const STOP = 'l_wane';
/** Who came: their lines, `d` seconds after the gathering, each only if the player built them. */
const came = (id: string, d: number, from: string, caller: string, text: string, has: string[]): Row =>
  radio(id, STOP, after('th_gather', d), from, caller, text, { if: { has } });

export const THRESHOLD_ROWS: Row[] = [
  // 1 · approach
  radio('th_thane', STOP, free(4), CPS, 'office', '“Commissioner Thane, on every band. The Scatter’s terrorist will open the last gate tonight. What follows is hers.”'),

  // 2 · they gather
  notice('th_gather', STOP, after('th_thane', 20), 'white', 'They gather', 'the Thren close round the gate'),

  // 3 · who came
  came('th_pike', 6, PIKE[0], PIKE[1], '“Pike. The Quiet Line brought forty Bonded through tonight. They wanted to see it open.”', ['thread_line_2']),
  came('th_hester', 12, 'Hester Vane', 'miners', '“Hester. Every rig that stood with you is on this channel. We’re not leaving.”', ['thread_crews_3']),
  came('th_walk', 18, 'The Long Walk', 'frontier', '“The Long Walk is here. We kept the names. Now we’ll keep watch.”', ['job_long_walk_won']),
  // or the Drift she walked to the gate in the Marches (content/situations.ts drift_walk)
  radio('th_walk_drift', STOP, after('th_gather', 18), 'The Long Walk', 'frontier', '“The Long Walk is here. We kept the names. Now we’ll keep watch.”', { if: { has: ['drift_walked'], not: ['job_long_walk_won'] } }),
  came('th_analyst', 24, ANALYST[0], ANALYST[1], '“Unofficially: I brought the sealed reports. All of them.”', ['thread_survey_2']),
  came('th_saints', 27, 'Sister Vera Hask · the Hollow Saints', 'gutter', '“The Saints are here. Point us at something, or don’t. We came anyway.”', ['saints_helped']),
  came('th_val', 30, 'Val · a broker of the Gutter', 'gutter', '“Still buying, love. I’ll be at the back.”', ['broker']),
  { id: 'th_alone', stop: STOP, on: after('th_gather', 8), if: { not: [...ALLIES] }, do: { notice: { tone: 'white', headline: 'Nobody came', reason: 'just you, and them' } } },

  // 4 · Calloway: the gate is hers
  { ...notice('th_ready', STOP, after('th_gather', 40), 'teal', 'The Threshold', 'Calloway holds the gate'), main: true },
  objective('th_go', STOP, after('th_ready', 0), 'Fly to the Threshold', 'Wake the last relay · Calloway holds the gate'),
  // 5 · the last relay (spaceways plan, step 7): woken under her guns, whoever came on the ring; the gate opens on it
  { id: 'th_relay', stop: STOP, on: relay(), wall: 'relay_l_wane', do: { notice: { tone: 'teal', headline: 'Warden key accepted', reason: 'the Threshold is open' } }, main: true, urgent: true },
];

/** Who came, as hulls (sim/gathering.ts): each ally's line brings them in, and they line the lane to the gate. */
export const GATHERING: Comer[] = [
  { row: 'th_pike', variant: 'liner', n: 3, tag: 'Quiet Line' },
  { row: 'th_hester', variant: 'barge', n: 3, tag: 'Hester’s rigs' },
  { row: 'th_walk', variant: 'hauler', n: 4, tag: 'The Long Walk' },
  { row: 'th_walk_drift', variant: 'hauler', n: 4, tag: 'The Long Walk' },
  { row: 'th_analyst', variant: 'liner', n: 1, tag: 'Survey Office' },
  { row: 'th_saints', variant: 'barge', n: 2, tag: 'Hollow Saints' },
  { row: 'th_val', variant: 'barge', n: 1, tag: 'Val' },
];
