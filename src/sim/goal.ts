import { ENCOUNTERS } from './encounters';
import { lessonOf } from './tutor';
import type { World } from './world';

// ── the one line the pause card shows ─────────────────────────────────────
// What to do now, in a few words, and the jobs taken on. English, for the
// card to run through t().

export interface Goal { goal: string; jobs: string[] }

export function goalOf(w: World): Goal {
  const jobs = w.jobs.map((j) => j.text);
  const les = lessonOf(w);
  if (les) return { goal: les.line, jobs };
  const e = w.encounter;
  if (e && !e.done && e.id === 'scene' && w.stage) return { goal: w.stage.line, jobs };
  if (w.bk) return { goal: w.fuel >= w.jumpCost ? 'Head for the lane entrance and jump' : 'Mine Cyrite to fill the jump tank', jobs };
  if (e && !e.done) return { goal: ENCOUNTERS[e.id].name, jobs };
  return { goal: 'Collect Cyrite and upgrade your ship', jobs };
}
