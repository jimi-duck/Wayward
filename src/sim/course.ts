import { NARROWS, ROAD, type RoadStop } from '../content/road';
import type { SystemKind } from '../content/systems';
import { regionOf, viewOf, type StarSystem } from './chart';
import { RELAY_BROADCAST } from './calloway';
import { daysUntil, halfDays, PURSUIT } from './hunt';
import { here, options, type Journey } from './journey';

// ── the Course screen's view ──────────────────────────────────────────────
// What the Warden's Road shows between two stops (docs/ROAD.md): the leg goal,
// the next stop and the stop after it, the road as a line of stops, the dark
// lanes that lead nowhere, the pursuit in days and what the jump costs. Plain
// data; ui/course.ts draws it.

export interface Layer { name: string; purpose: string; kind: SystemKind }
export type Pip = 'done' | 'here' | 'ahead';
export type Tone = 'calm' | 'amber' | 'red';

export interface Course {
  region: string;
  day: number;
  /** The stop she is at. */
  here: { name: string; kind: SystemKind };
  /** The leg goal, with the jumps left to it. */
  goal: Layer & { jumps: number };
  next: Layer;
  /** The stop after: none at the last stop. */
  after: Layer | null;
  /** The road: a pip for each stop, the Narrows last. */
  road: Array<{ name: string; kind: SystemKind; state: Pip; job: boolean }>;
  /** Dark lanes off the road: they lead nowhere. */
  lanes: number;
  pursuit: { who: 'custody' | 'calloway'; days: number; tone: Tone; hidden: boolean };
  /** The lane's cost against what is aboard. */
  fuel: { need: number; have: number };
  supplies: { need: number; have: number };
  to: StarSystem;
}

/** The index of a system on the road (0 the audit dock's system), or -1 off it. */
export const roadIndex = (j: Journey, s: StarSystem): number => (j.chart.regionSet === 'road' && regionOf(s) === 0 && s.kind !== 'home' ? s.col - 1 : -1);

/** Whether the chart to plot from here is the road's: a road journey, in the Reach, short of the gate. */
export const onRoad = (j: Journey): boolean => {
  const s = here(j), i = roadIndex(j, s);
  return i >= 0 && s.kind !== 'gate' && viewOf(j.chart, j.at) === 0;
};

/** Who the pursuit is: the Custody until the relay has broadcast the route, then Calloway. */
export const pursuerOf = (flags: readonly string[]): 'custody' | 'calloway' => (flags.includes(RELAY_BROADCAST) ? 'calloway' : 'custody');

/** How far behind, as the screens read it: the half day, never a jump count. */
export const toneOf = (days: number): Tone => (days <= PURSUIT.red ? 'red' : days <= PURSUIT.amber ? 'amber' : 'calm');

const layer = (r: RoadStop | undefined): Layer | null => (r ? { name: r.name ?? '', purpose: r.purpose ?? '', kind: r.kind } : null);

/** The Course for a road journey at a stop, or null off the road. */
export function courseView(j: Journey): Course | null {
  if (!onRoad(j)) return null;
  const s = here(j), at = roadIndex(j, s), c = j.chart;
  const R = ROAD.length;
  const stop = (i: number): Layer => (i >= R ? { name: NARROWS.name, purpose: NARROWS.purpose, kind: 'gate' } : layer(ROAD[i])!);
  const o = options(j)[0];
  if (!o) return null;
  const days = halfDays(daysUntil(j.hunt, c, j.trail));
  const to = o.to;
  const ada = j.carry.flags.includes('ada_named');
  return {
    region: 'The Reach',
    day: Math.floor(j.day) + 1,
    here: { name: s.name, kind: s.kind },
    goal: { name: NARROWS.name, purpose: ada ? NARROWS.ada : NARROWS.purpose, kind: 'gate', jumps: R - at },
    next: stop(at + 1),
    after: at + 2 <= R ? stop(at + 2) : null,
    road: [...ROAD.slice(1).map((r, i) => ({ name: r.name ?? '', kind: r.kind, state: (i + 1 < at ? 'done' : i + 1 === at ? 'here' : 'ahead') as Pip, job: !!r.job })), { name: NARROWS.name, kind: 'gate' as SystemKind, state: 'ahead' as Pip, job: false }],
    lanes: 2 + (at % 2),
    pursuit: { who: pursuerOf(j.carry.flags), days, tone: toneOf(days), hidden: !!s.quiet },
    fuel: { need: o.fuel, have: Math.floor(j.carry.fuel) },
    supplies: { need: o.supplies, have: j.carry.supplies },
    to,
  };
}
