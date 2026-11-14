import type { Row } from '../../sim/script';
import { SAINTS } from '../resistance';
import { CPS } from './broadcasts';
import { HESTER, PIKE, after, flag, free, main, radio } from './kit';

// ── the divided resistance on the road ────────────────────────────────────
// Three set scenes carry the argument (docs/STORY_DIRECTION.md, plan priority 4):
//   the moot at Kessel Hold · four voices before Oduya's card (its trigger waits for them)
//   the Saints at Tamsin Field · the failed operation (content/resistance.ts)
//   the strike committee at Torchwall · three votes before Marit's card
// One voice at a time: each line follows the last.

const ODUYA = 'Councillor Oduya';
const VAL = 'Val · a broker of the Gutter';
const MARIT = 'Marit Voss';

export const RESISTANCE_ROWS: Row[] = [
  // ── the moot: what freedom is for ──
  radio('rs_moot_hester', 'm_kessel', free(6), HESTER[0], HESTER[1], '“Read it, and every rig in the Marches stops work tomorrow. Together. That’s how you beat Kellern.”'),
  radio('rs_moot_oduya', 'm_kessel', after('rs_moot_hester', 2), ODUYA, 'miners', '“No strike committees and no new bosses. Kessel Hold governs Kessel Hold. We share, we don’t merge.”'),
  radio('rs_moot_pike', 'm_kessel', after('rs_moot_oduya', 2), PIKE[0], PIKE[1], '“The Line doesn’t vote. We move people who need moving. Leave us out of your councils.”'),
  radio('rs_moot_val', 'm_kessel', after('rs_moot_pike', 2), VAL, 'gutter', '“Lovely. Three ideas, no ships. Call me when one of you wins.”'),

  // ── Tamsin Field: the Saints' operation ──
  main('rs_saints', 'm_tamsin', free(40), 'saints_relay'),
  radio('rs_saints_helped', 'm_tamsin', flag('saints_helped'), SAINTS, 'gutter', '“Eleven. We’ll carry their names too. Nobody said this would be clean.”'),
  radio('rs_saints_saved', 'm_tamsin', flag('saints_stopped'), 'A conscript on the relay', 'custody', '“We’re in the pods. Whoever you are, my sister’s in Cerro. Thank you.”'),
  radio('rs_saints_cps', 'm_tamsin', after('rs_saints', 20), CPS, 'office', '“Terrorists destroyed a public relay at Tamsin Field. Eleven contract residents died. Report anyone with Saint ties.”', { if: { not: ['saints_stopped'] }, stale: 200 }),

  // ── Torchwall: the strike committee votes ──
  radio('rs_vote_marit', 'y_torch', free(6), MARIT, 'frontier', '“The committee votes tonight: seize the yard, wreck the breakers, or bargain for passes.”'),
  radio('rs_vote_hester', 'y_torch', after('rs_vote_marit', 2), HESTER[0], HESTER[1], '“Seize it. Run it ourselves. Nobody evicts a crew from a yard it owns.”', { if: { has: ['thread_crews_2'] } }),
  radio('rs_vote_saints', 'y_torch', after('rs_vote_marit', 6), SAINTS, 'gutter', '“Wreck it. Every breaker they build here is another wall around us.”', { if: { has: ['saints_helped'] } }),
  radio('rs_vote_oduya', 'y_torch', after('rs_vote_marit', 10), ODUYA, 'miners', '“Bargain. Passes for every family. Then we go home and govern ourselves.”', { if: { has: ['pact_holdfast'] } }),
  radio('rs_seized', 'y_torch', flag('strike_seized'), MARIT, 'frontier', '“The yard is ours. Nobody builds a breaker here again. Now we find out if we can run it.”'),
  radio('rs_passes', 'y_torch', flag('strike_passes'), MARIT, 'frontier', '“Kellern signed. Passes for crew families. Paper, but it’s paper with our names on it.”'),
];
