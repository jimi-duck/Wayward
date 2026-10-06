import { t as tr } from '../i18n';
import { FLEETS } from '../content/regions';
import { lanesFrom, netted, regionDef, regionOf, regionsOf, sysById, type Chart, type StarSystem } from './chart';
import { Rng } from './rng';

// ── the Scatter: factions acting on their own ─────────────────────────────
// The Net is not the only thing that moves while you fly. Every day the
// chart's other powers do what they do, whether or not the Wayward is
// anywhere near:
//
//   Holdfasts · claims that will not give in. The Net crawls into one
//               (sim/chart.ts), and a Holdfast next to the Net's edge now
//               and then throws it back for a while.
//   Drifts    · fleets that never stop moving: a few days in a system,
//               then on down a lane. Where one is, it trades food and news.
//   the Gutter · crews raid from the systems they hold into the ones next
//               door: a raided system has Gutter crews in it and a dear
//               port, and one nobody held can become theirs.
//   the Voice · foundries build out into the empty systems around them.
//   the Thren · drift between systems, thin out where the Net burns them,
//               and are drawn to Cyrite on the move: the fuller the Wayward's
//               tank, the more of them follow her into the next system.
//               Where they are thick, they swarm (sim/world.ts) and scramble
//               sensors and navigation.
//
// Everything here is chart state (Chart.drifts, .thren, .raid), stepped in
// quarter days like the Net, and reports what it did as news by system, so
// the journey can tell you what happened within sight.

export interface Fleet {
  name: string;
  at: string;
  /** Days before it moves on. */
  stay: number;
}

/** What happened, and where. */
export interface News { id: string; text: string }

/** Days a Drift fleet stays in a system. */
export const DRIFT_STAY: [number, number] = [1, 2.5];
/** A Gutter system raids a neighbour this often a day; a raid lasts so many days; a raid on nobody's system takes it this often. */
export const RAID_CHANCE = 0.25;
export const RAID_DAYS = 2;
export const RAID_TAKE = 0.3;
/** What a raid does to a port: Cyrite and food dearer. */
export const RAID_MARKUP = 1.3;
/** A Holdfast next to the Net throws it back this often a day, for so many days. */
export const HOLD_CHANCE = 0.2;
export const HOLD_DAYS = 1.5;
/** A Voice system builds into an empty neighbour this often a day. */
export const VOICE_GROW = 0.08;
/** Thren: what bleeds to each neighbour a day, what fades a day (much more where the Net is), and the most a system holds. */
export const THREN_SPREAD = 0.08;
export const THREN_FADE = 0.05;
export const THREN_BURN = 0.35;
/** Of the Thren next door, the share a full tank draws into the Wayward's system a day. */
export const THREN_PULL = 0.45;
/** Thren a Thren lane brings with it. */
export const THREN_LANE = 0.6;
/** Thren at which a system has them about (cards, the chart), and at which they gather (news). */
export const THREN_ABOUT = 0.3;
export const THREN_THICK = 0.5;

const wild = (s: StarSystem) => s.kind !== 'home' && s.kind !== 'edge';

/** The factions' starting places on a new chart: Thren where nobody lives, and the Drift fleets. Its own generator, so the systems and places of a seed are the same as before. */
export function layScatter(c: Chart, seed: number): void {
  const rng = new Rng(seed ^ 0xd21f7);
  c.thren = {};
  c.raid = {};
  c.drifts = [];
  for (const s of c.systems) {
    let v = (regionDef(c, regionOf(s))?.thren[s.holder] ?? 0) * rng.range(0.6, 1.2);
    if (c.places[s.id]?.id === 'thren_lane') v = Math.max(v, THREN_LANE);
    if (v > 0.02 && wild(s)) c.thren[s.id] = Math.min(1, Math.round(v * 100) / 100);
  }
  // the long journey has more fleets to name; the first five are the three-region chart's, so its draws do not move
  const names = c.regionSet ? [...FLEETS] : FLEETS.slice(0, 5);
  regionsOf(c).forEach((r, i) => {
    const pool = c.systems.filter((s) => regionOf(s) === i && wild(s) && s.kind !== 'gate');
    for (let k = 0; k < r.drifts && pool.length && names.length; k++) {
      const s = pool.splice(rng.int(pool.length), 1)[0]!;
      c.drifts!.push({ name: names.splice(rng.int(names.length), 1)[0]!, at: s.id, stay: rng.range(DRIFT_STAY[0], DRIFT_STAY[1]) });
    }
  });
}

/** Thren in a system, 0 to 1. */
export const threnAt = (c: Chart, id: string) => c.thren?.[id] ?? 0;
/** The Drift fleet in a system, if one is there. */
export const fleetAt = (c: Chart, id: string) => c.drifts?.find((f) => f.at === id) ?? null;
/** Days of Gutter raid left on a system. */
export const raided = (c: Chart, id: string) => (c.raid?.[id] ?? 0) > 0;

/** Who is in a system, for the cards and the chart: a Drift fleet, a Holdfast, a Gutter raid, the Voice, the Thren. */
export function presence(c: Chart, id: string): string[] {
  const s = sysById(c, id), out: string[] = [];
  if (fleetAt(c, id)) out.push('drift');
  if (s.holder === 'holdfast' && !netted(c, id)) out.push('holdfast');
  if (raided(c, id)) out.push('raid');
  if (s.holder === 'voice') out.push('voice');
  if (threnAt(c, id) >= THREN_ABOUT) out.push('thren');
  return out;
}

/**
 * The factions act for `days`. `ship` is where the Wayward is (or is
 * headed, in the lane) and the Cyrite she carries: the Thren follow it.
 * Returns what happened.
 */
export function stepScatter(c: Chart, days: number, rng: Rng, ship: { at: string; cyrite: number; tank: number }): News[] {
  c.thren ??= {};
  c.raid ??= {};
  c.drifts ??= [];
  const news: News[] = [];
  const name = (id: string) => sysById(c, id).name;
  let left = days;
  while (left > 1e-6) {
    const dt = Math.min(0.25, left);
    left -= dt;
    for (const id of Object.keys(c.raid)) if ((c.raid[id]! -= dt) <= 0) delete c.raid[id];

    for (const s of c.systems) {
      if (netted(c, s.id)) continue;
      const near = lanesFrom(c, s.id).map((l) => l.to).filter(wild);
      // the Gutter raids next door
      if (s.holder === 'gutter' && rng.next() < RAID_CHANCE * dt) {
        const pool = near.filter((t) => t.holder !== 'gutter' && !netted(c, t.id) && t.kind !== 'gate');
        const t = pool.length ? pool[rng.int(pool.length)]! : null;
        if (t) {
          c.raid[t.id] = RAID_DAYS;
          if (t.holder === 'none' && rng.next() < RAID_TAKE) { t.holder = 'gutter'; news.push({ id: t.id, text: tr('The Gutter has taken {name}', { name: t.name }) }); }
          else news.push({ id: t.id, text: tr('Gutter raiders hit {name}', { name: t.name }) });
        }
      }
      // a Holdfast on the Net's edge throws it back
      if (s.holder === 'holdfast' && !c.stall[s.id] && (c.net[s.id] ?? 0) > 0 && rng.next() < HOLD_CHANCE * dt) {
        c.stall[s.id] = HOLD_DAYS;
        c.net[s.id] = Math.max(0, (c.net[s.id] ?? 0) - 0.2);
        news.push({ id: s.id, text: tr('The Holdfast at {name} throws the Net back', { name: s.name }) });
      }
      // the Voice builds out
      if (s.holder === 'voice' && rng.next() < VOICE_GROW * dt) {
        const pool = near.filter((t) => (t.holder === 'none' || t.holder === 'thren') && regionOf(t) === regionOf(s) && t.kind !== 'gate' && !t.port);
        const t = pool.length ? pool[rng.int(pool.length)]! : null;
        if (t) { t.holder = 'voice'; news.push({ id: t.id, text: tr('The Voice built a foundry in {name}', { name: t.name }) }); }
      }
    }

    // the Thren drift, fade, and follow Cyrite
    const was = { ...c.thren };
    const next: Record<string, number> = {};
    for (const s of c.systems) {
      if (!wild(s)) continue;
      const v = was[s.id] ?? 0;
      let n = v * (1 - (netted(c, s.id) ? THREN_BURN : THREN_FADE) * dt);
      for (const { to } of lanesFrom(c, s.id)) n += (was[to.id] ?? 0) * THREN_SPREAD * dt * (netted(c, s.id) ? 0.3 : 1) - v * THREN_SPREAD * dt * (wild(to) ? 1 : 0);
      next[s.id] = n;
    }
    const pull = THREN_PULL * Math.min(1, ship.cyrite / Math.max(1, ship.tank)) * dt;
    if (pull > 0 && wild(sysById(c, ship.at))) {
      for (const { to } of lanesFrom(c, ship.at)) {
        const moved = (next[to.id] ?? 0) * pull;
        if (moved <= 0) continue;
        next[to.id]! -= moved;
        next[ship.at] = (next[ship.at] ?? 0) + moved;
      }
    }
    c.thren = {};
    for (const [id, v] of Object.entries(next)) {
      const r = Math.min(1, Math.round(v * 1000) / 1000);
      if (r > 0.01) c.thren[id] = r;
      if (r >= THREN_THICK && (was[id] ?? 0) < THREN_THICK) news.push({ id, text: tr('The Thren are gathering in {name}', { name: name(id) }) });
    }

    // the Drift fleets move on
    for (const f of c.drifts) {
      if ((f.stay -= dt) > 0) continue;
      const pool = lanesFrom(c, f.at).map((l) => l.to).filter((t) => wild(t) && !netted(c, t.id) && !raided(c, t.id) && !fleetAt(c, t.id) && threnAt(c, t.id) < THREN_THICK);
      f.stay = rng.range(DRIFT_STAY[0], DRIFT_STAY[1]);
      if (!pool.length) continue;
      f.at = pool[rng.int(pool.length)]!.id;
      news.push({ id: f.at, text: tr('Drift fleet {fleet} is crossing {name}', { fleet: f.name, name: name(f.at) }) });
    }
  }
  return news;
}
