import type { Row } from '../../sim/script';
import { HESTER, after, flag, main, notice, objective, radio } from './kit';

// ── the Thren, rising ─────────────────────────────────────────────────────
// One meeting a leg, each closer than the last (docs/ROAD.md): the Slow Door,
// Low Harrow, Saltmarsh, Stillwater (here), Cradle Gap, Lucky Haven,
// Hollowforge and Ghostcinder (here), the Threshold. Gunfire with Thren close
// by draws more (sim/world.ts gunfireDraws); the first time, a notice says so.

export const THREN_ROWS: Row[] = [
  // the rule, told once, wherever it first happens
  notice('tn_drawn', '*', flag('thren_drawn'), 'white', 'They answer', 'gunfire draws more of them'),

  // Stillwater: the swarm emergency
  main('tn_still', 'd_still', after('ds_hester', 8), 'thren_still'),
  radio('tn_still_vented', 'd_still', flag('still_vented'), HESTER[0], HESTER[1], '“You fed them your own pay. Nobody from the core ever did that for us.”'),
  radio('tn_still_rig', 'd_still', flag('still_rig_vented'), HESTER[0], HESTER[1], '“Kellern will dock it from forty contracts. We’ll live. That’s the point, isn’t it?”'),
  radio('tn_still_fought', 'd_still', flag('still_fought'), HESTER[0], HESTER[1], '“They come harder every year we dig. And the Survey still calls them rare.”'),

  // Ghostcinder: the crossing, with no fighting
  objective('tn_cinder_hint', 'h_cinder', after('hg_objective', 4), undefined, 'Hold your fire. Gunfire draws them.'),
  radio('tn_cinder_clean', 'h_cinder', after('tn_cinder_hint', 60), 'Sable', 'unknown', '“You didn’t fire. They noticed. That’s the nearest thing to a word they have.”', { if: { not: ['thren_drawn_h_cinder'] }, stale: 120 }),
];
