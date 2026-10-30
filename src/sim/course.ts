import { GATES, LEGS, NARROWS, ROAD, type RoadStop } from '../content/road';
import type { SystemKind } from '../content/systems';
import { gateOf, regionDef, regionOf, viewOf, type StarSystem } from './chart';
import { RELAY_BROADCAST } from './calloway';
import { daysUntil, halfDays, PURSUIT } from './hunt';
import { here, options, type Journey } from './journey';
import { legOf, stopIndex } from './road';
import { accountCalled, debtLeft, ACCOUNT_DEBT } from './threads';

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
  /** The breach debt Kellern Recovery holds, once its Accounts have called: what is left, and whether Draper now holds it as settled. */
  debt: { left: number; settled: boolean } | null;
  /** The lane's cost against what is aboard. */
  fuel: { need: number; have: number };
  supplies: { need: number; have: number };
  to: StarSystem;
}

/** The index of a system on the road (0 the audit dock's system), or -1 off it. The Reach's, as the scripts and tests count it. */
export const roadIndex = (j: Journey, s: StarSystem): number => (legOf(j.chart, s) === 0 && s.kind !== 'home' ? s.col - 1 : -1);

/**
 * Where she is on the leg the Course shows: the leg (through a gate, the next one) and her place in its stops, counted from 0 at
 * the first stop past the way in (-1 at the way in: the audit dock's system in the Reach, or the gate behind). Null off the road.
 */
export function legPlace(j: Journey): { leg: number; pos: number; rows: RoadStop[] } | null {
  const s = here(j), c = j.chart, leg = legOf(c, s);
  if (leg < 0) return null;
  const gate = s.kind === 'gate' || s.kind === 'edge';
  if (gate) { const next = leg + 1; return LEGS[next] && legOf(c, gateOf(c, next)) === next ? { leg: next, pos: -1, rows: LEGS[next]! } : null; }
  if (leg === 0) return { leg, pos: roadIndex(j, s) - 1, rows: ROAD.slice(1) };
  return { leg, pos: stopIndex(c, s), rows: LEGS[leg]! };
}

/** Whether the chart to plot from here is the road's: a road journey on a leg of the road, its gate ahead. */
export const onRoad = (j: Journey): boolean => legPlace(j) !== null && viewOf(j.chart, j.at) === legPlace(j)!.leg;

/** Who the pursuit is: the Custody until the relay has broadcast the route, then Calloway. */
export const pursuerOf = (flags: readonly string[]): 'custody' | 'calloway' => (flags.includes(RELAY_BROADCAST) ? 'calloway' : 'custody');

/** How far behind, as the screens read it: the half day, never a jump count. */
export const toneOf = (days: number): Tone => (days <= PURSUIT.red ? 'red' : days <= PURSUIT.amber ? 'amber' : 'calm');

const layer = (r: RoadStop | undefined): Layer | null => (r ? { name: r.name ?? '', purpose: r.purpose ?? '', kind: r.kind } : null);

/** The Course for a road journey at a stop, or null off the road. */
export function courseView(j: Journey): Course | null {
  const p = legPlace(j);
  if (!p || !onRoad(j)) return null;
  const s = here(j), c = j.chart, { leg, pos, rows } = p;
  const R = rows.length;
  const gate = gateOf(c, leg);
  const ada = leg === 0 && j.carry.flags.includes('ada_named');
  const gateLayer: Layer = { name: gate.name, purpose: ada ? NARROWS.ada : GATES[leg]?.purpose ?? '', kind: gate.kind };
  const stop = (i: number): Layer => (i >= R ? gateLayer : layer(rows[i])!);
  const o = options(j)[0];
  if (!o) return null;
  const days = halfDays(daysUntil(j.hunt, c, j.trail));
  const to = o.to;
  const debt = accountCalled(j.carry.flags) ? { left: debtLeft(j.carry.flags), settled: j.carry.flags.includes('draper_revealed') } : null;
  return {
    region: regionDef(c, leg)?.name ?? 'The Reach',
    day: Math.floor(j.day) + 1,
    here: { name: s.name, kind: s.kind },
    goal: { ...gateLayer, jumps: R - pos },
    next: stop(pos + 1),
    after: pos + 2 <= R ? stop(pos + 2) : null,
    road: [...rows.map((r, i) => ({ name: r.name ?? '', kind: r.kind, state: (i < pos ? 'done' : i === pos ? 'here' : 'ahead') as Pip, job: !!r.job })), { name: gate.name, kind: gate.kind, state: 'ahead' as Pip, job: false }],
    lanes: 2 + ((pos + 1) % 2),
    pursuit: { who: pursuerOf(j.carry.flags), days, tone: toneOf(days), hidden: !!s.quiet },
    debt: debt && { ...debt, left: debt.settled ? 0 : debt.left },
    fuel: { need: o.fuel, have: Math.floor(j.carry.fuel) },
    supplies: { need: o.supplies, have: j.carry.supplies },
    to,
  };
}

export { ACCOUNT_DEBT };
