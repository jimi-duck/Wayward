import type { StarSystem } from './chart';
import type { Chart } from './chart';
import { raided, threnAt, THREN_ABOUT } from './scatter';

// ── how a lane reads ──────────────────────────────────────────────────────
// A lane's style at a glance, from what the chart already knows of the system
// at its far end: quiet (an empty crossing, rock with few claim crews, a
// breather), watched (a busy port, a gate) or hostile (a contested system,
// the Net's, a raid, Thren, or Calloway's last sighting). The chart shows it
// as a tag beside the days, so two lanes read as a fork in style, not a sum.

export type Stance = 'quiet' | 'watched' | 'hostile';

/** What a lane's far end shows the player. */
export interface Far { to: StarSystem; netted: boolean; shadow: boolean }

export function stance(c: Chart, far: Far): Stance {
  const { to } = far;
  if (far.netted || far.shadow || to.kind === 'contested' || raided(c, to.id) || threnAt(c, to.id) >= THREN_ABOUT) return 'hostile';
  if (to.quiet || to.kind === 'transit' || to.kind === 'mining') return 'quiet';
  return 'watched';
}

/** Do these lanes differ in style or in length? Then choosing between them is a choice of style. */
export function forked(c: Chart, lanes: Array<Far & { days: number }>): boolean {
  return lanes.length > 1 && (new Set(lanes.map((l) => stance(c, l))).size > 1 || new Set(lanes.map((l) => l.days)).size > 1);
}
