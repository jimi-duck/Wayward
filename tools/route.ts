import { cyriteKnown } from '../src/sim/chart';
import { RATION, options, toEdge, type Journey } from '../src/sim/journey';

// ── the pilots' route planner ─────────────────────────────────────────────
// Shared by the journey and ship pilots.

/**
 * The route planner: toward the Threshold, away from the Net and from where
 * Calloway was last seen, toward a port when the galley or the purse is
 * thin, toward Krail when the tank is. A cautious player who reads the chart.
 */
export function planRoute(j: Journey, c = j.carry): string {
  const left = toEdge(j);
  let best = '', bestV = -Infinity;
  for (const o of options(j)) {
    const s = o.to;
    let v = 0;
    const closer = left - (s.kind === 'edge' ? 0 : toEdgeFrom(j, s.id));
    v += closer * 40;
    v -= o.route.cyrite * 1.2;
    if (o.netted) v -= 35;
    if (o.shadow) v -= 30;
    if (c.supplies < 2 * RATION * 2 && s.port) v += 25;
    if (c.cyrite < 15) v += cyriteKnown(j.chart, s) * 30;
    if (s.port && c.plates < 3) v += 10;
    if (v > bestV) { bestV = v; best = s.id; }
  }
  return best;
}

function toEdgeFrom(j: Journey, id: string): number {
  const at = j.at;
  j.at = id;
  const n = toEdge(j);
  j.at = at;
  return n;
}
