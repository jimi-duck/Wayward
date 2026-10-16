import { PLACES, REWARD_WORD } from '../content/phenomena';
import { PROFILES, SITE_OF_PLACE, HAZARDS } from '../content/profiles';
import { SYSTEMS } from '../content/systems';
import { SITUATION_BY_ID } from '../content/situations';
import { cyriteKnown, gateOf, jumps, regionDef, regionOf, viewOf, type Chart, type Place, type StarSystem } from './chart';
import { HEAVY_GOALS, longIndex, situationAt } from './situations';
import { LOW_SUPPLIES } from './breakout';
import { options, type Journey } from './journey';
import { stance, type Stance } from './lanes';
import { t } from '../i18n';

// ── the fork: what each lane out of here asks and offers ──────────────────
// The chart's next-jump list reads these (ui/chart.ts). Every number is the
// journey's own: `options` gives the lane, its jump fluid (the lane's base
// plus the weight surcharge) and the supplies the crossing eats; the graph
// gives the jumps left to the gate. An upside and a trade-off are named only
// where the chart knows them (a port, a breather, a place already sighted,
// the Net's edge as last seen); nothing is scored or ranked.

/** The way out of the region the chart shows from a system: its gate, or the Threshold. */
export const goalOf = (c: Chart, at: string): StarSystem => gateOf(c, viewOf(c, at));

/** Jumps from `id` to that goal by the lanes, or null where there is no way. */
export function toGoal(c: Chart, at: string, id: string): number | null {
  const n = jumps(c, id, goalOf(c, at).id);
  return Number.isFinite(n) ? n : null;
}

/** Where the journey stands in its region: the gate it is heading for, and the jumps left of the jumps the region asks from its way in. */
export function gateProgress(j: Journey): { gate: StarSystem; left: number | null; total: number | null } {
  const c = j.chart, view = viewOf(c, j.at), gate = goalOf(c, j.at);
  // the way in: Cerro, or the gate behind
  const entry = view > 0 ? gateOf(c, view - 1).id : c.home;
  const total = jumps(c, entry, gate.id);
  return { gate, left: toGoal(c, j.at, j.at), total: Number.isFinite(total) && total > 0 ? total : null };
}

/** A line the chart knows to be true, and whether it is a threat (red) or a cost (plain). */
export interface Note { text: string; hot?: boolean }

export interface Fork {
  to: StarSystem;
  stance: Stance;
  days: number;
  /** Jump fluid the lane needs now, with the weight surcharge. */
  fuel: number;
  /** Jump fluid short in the tank for it (0 when it is covered); the jump waits on the refinery, never blocks the choice. */
  short: number;
  supplies: number;
  /** The stores do not cover the crossing: a plate goes. */
  thin: boolean;
  /** Jumps from there to the goal; null where the graph has no way. */
  gateAfter: number | null;
  atGate: boolean;
  /** Brings the goal nearer than here (null when it cannot be told). */
  nearer: boolean | null;
  /** How hard the far end is on you: 0 calm, 1 watched, 2 hostile. */
  danger: 0 | 1 | 2;
  /** How the Custody's heat goes there: 0 it cools (a breather), 1 low, 2 it climbs, 3 it climbs fast. */
  heat: 0 | 1 | 2 | 3;
  /** Jumps this lane adds to the way to the gate over the shortest lane shown (0 for the shortest); null where it cannot be told. */
  detour: number | null;
  netted: boolean;
  shadow: boolean;
  place: Place | null;
  scene: string | null;
  /** One sentence on what to expect there. */
  say: string;
}

/** What the chart knows of a place there, as a short phrase. */
const placeNote = (p: Place) => `${t(PLACES[p.id].name)} · ${t(REWARD_WORD[PLACES[p.id].reward === 'unknown' ? 'unknown' : p.reward])}`;

/** The most lanes the chart offers at once: a choice is a few lanes that differ, not a list. */
export const LANES_SHOWN = 3;
const DANGER: Record<Stance, 0 | 1 | 2> = { quiet: 0, watched: 1, hostile: 2 };

/**
 * How the heat (how hard the Custody is looking) goes in a system, from what the sortie will start with
 * (journey.ts sortieDef): the kind's start and climb, the region's, a Net blockade's, and watched space.
 * A breather cools it. Read as a word; the numbers are the sim's own.
 */
export function heatAt(c: Chart, s: StarSystem, net: boolean): 0 | 1 | 2 | 3 {
  if (s.quiet && !net) return 0;
  const t = SYSTEMS[s.kind], R = regionDef(c, regionOf(s));
  const watch = PROFILES[longIndex(c, regionOf(s))]?.rules.watch ?? 1;
  const score = t.heat + (net ? 0.25 : 0) + t.heatRate * (net ? 1.3 : (R?.heatRate ?? 1)) * Math.max(1, watch);
  return net || score >= HEAT_FAST ? 3 : score >= HEAT_RISING ? 2 : 1;
}
const HEAT_RISING = 0.95, HEAT_FAST = 1.25;

/**
 * Down to the few lanes worth choosing between: the one that goes straight on, the calmest, and then whichever
 * differs most from those (a port, another style, another kind). Lanes that only repeat one of them are left off the chart.
 */
function pickLanes<T extends { s: StarSystem; st: Stance; after: number | null; o: { fuel: number } }>(all: T[]): T[] {
  if (all.length <= LANES_SHOWN) return all;
  const far = (x: T) => x.after ?? 1e9;
  const left = [...all], out: T[] = [];
  const take = (best: (a: T, b: T) => number) => { left.sort(best); out.push(left.shift()!); };
  take((a, b) => far(a) - far(b) || DANGER[a.st] - DANGER[b.st] || a.o.fuel - b.o.fuel);
  take((a, b) => DANGER[a.st] - DANGER[b.st] || far(a) - far(b) || a.o.fuel - b.o.fuel);
  while (out.length < LANES_SHOWN && left.length) {
    const score = (x: T) => Number(out.every((y) => y.st !== x.st)) * 3 + Number(out.every((y) => y.s.kind !== x.s.kind)) * 2 + Number(!!x.s.port && out.every((y) => !y.s.port));
    take((a, b) => score(b) - score(a) || far(a) - far(b) || a.o.fuel - b.o.fuel);
  }
  return all.filter((x) => out.includes(x));
}

/** The lanes out of here, each with its facts: at most `LANES_SHOWN`, chosen to differ. */
export function forks(j: Journey): Fork[] {
  const c = j.chart, opts = options(j), now = toGoal(c, j.at, j.at);
  const goal = goalOf(c, j.at);
  const base = pickLanes(opts.map((o) => {
    const s = o.to, st = stance(c, o), after = toGoal(c, j.at, s.id);
    return { o, s, st, after };
  }));
  const shortest = Math.min(...base.map((b) => b.after ?? 1e9));
  return base.map(({ o, s, st, after }): Fork => {
    const nearer = now === null || after === null ? null : after < now;
    const quiet = !!s.quiet && !o.netted && st !== 'hostile';
    // one sentence on what to expect there, from what is known: the worst news first, then what it offers
    const hazard = o.place && HAZARDS.has(SITE_OF_PLACE[o.place.id]);
    const job = situationAt(c, s.id), heavy = !!job && HEAVY_GOALS.has(SITUATION_BY_ID[job.id]?.goal.kind ?? '');
    const rules = PROFILES[longIndex(c, regionOf(s))]?.rules;
    let say: string;
    if (s.id === goal.id) say = t('The gate: jump on and this region is behind you.');
    else if (o.shadow) say = t('Calloway was last seen here, so expect him close.');
    else if (o.netted) say = t('The Net holds it: expect a blockade and a hard fight.');
    else if (s.kind === 'contested') say = t('Patrols and raiders hold it: expect a fight.');
    else if (st === 'hostile') say = t('Raiders or Thren are about: expect a fight.');
    else if (hazard) say = t('Rough flying: a hazard sits in the way.');
    else if (quiet) say = t('A quiet breather: no pursuit, and your heat cools.');
    else if (s.port) say = st === 'watched' ? t('A port to refit and resupply, but it draws the Custody.') : t('A port to trade, resupply and refit.');
    else if (heavy) say = t('A hard job waits here, a fight or a chase.');
    else if (o.place) say = placeNote(o.place);
    else if (rules?.claim && s.kind === 'mining') say = t('Claimed ground: linger and it costs.');
    else if ((rules?.watch ?? 1) > 1) say = t('Watched space: the hunt runs fast in the open.');
    else if (s.kind === 'mining') say = cyriteKnown(c, s) >= 0.7 ? t('Rich rock to mine; no port.') : t('Open rock to mine; no port.');
    else say = t('Open space: nothing known, no port.');
    return {
      to: s, stance: st, days: o.route.days, fuel: o.fuel, short: Math.max(0, Math.ceil(o.fuel - j.carry.fuel)), supplies: o.supplies,
      thin: j.carry.supplies < o.supplies, gateAfter: after, atGate: s.id === goal.id, nearer,
      danger: DANGER[st], heat: heatAt(c, s, o.netted), detour: after === null || shortest >= 1e9 ? null : after - shortest,
      netted: o.netted, shadow: o.shadow, place: o.place, scene: o.scene, say,
    };
  });
}

/** The ship's trouble worth the player's eye before they choose: out of or low on supplies, and no lane the tank can pay for yet. */
export function trouble(j: Journey): Note[] {
  const out: Note[] = [];
  const c = j.carry;
  if (c.supplies <= 0) out.push({ text: t('Out of supplies · a jump costs a plate'), hot: true });
  else if (c.supplies <= LOW_SUPPLIES) out.push({ text: t('Supplies low · buy more at a port') });
  // one line for the tank, with the exact amount the cheapest lane is short by
  const short = Math.min(...options(j).map((o) => Math.ceil(o.fuel - c.fuel)));
  if (Number.isFinite(short) && short > 0) out.push({ text: c.fuel < 1 ? t('No jump fluid · {n} needed for the cheapest lane', { n: short }) : t('Jump fluid short · {n} more for the cheapest lane', { n: short }) });
  return out;
}
