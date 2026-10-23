import { ENCOUNTERS } from './encounters';
import { lessonOf } from './tutor';
import { lockLifted } from './postjump';
import type { World } from './world';

// ── the one line the pause card shows ─────────────────────────────────────
// What to do now, in a few words, and the jobs taken on. English, for the
// card to run through t().

export interface Goal { goal: string; jobs: string[]; /** A job in the sky, not yet taken on: its name. */ scope?: string }

export function goalOf(w: World): Goal {
  const jobs = w.jobs.map((j) => j.text);
  const les = lessonOf(w);
  if (les) return { goal: les.line, jobs };
  const e = w.encounter;
  if (e && !e.done && e.id === 'scene' && w.stage?.taken) return { goal: w.stage.line, jobs };
  const scope = w.stage?.onScope ? w.stage.def.name : undefined;
  if (w.bk && !lockLifted(w.flags) && w.seenPlaces().some((p) => p.kind === 'audit')) return { goal: 'Head for the audit dock', jobs, scope };
  if (w.bk) return { goal: w.fuel >= w.jumpCost ? 'Head for the Jump Gate and jump' : 'Mine Cyrite to fill the jump tank', jobs, scope };
  if (e && !e.done && !e.dormant) return { goal: ENCOUNTERS[e.id].name, jobs };
  return { goal: 'Survive as long as you can', jobs };
}
