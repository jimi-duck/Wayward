import {
  EXPANSES, EXPANSE_ORDER, FEATURES, FEATURE_ORDER, NAMED, RARITY,
  type Effects, type ExpanseDef, type ExpanseId, type FeatureDef, type FeatureId,
} from '../content/features';
import { clamp } from '../core/math';
import { Rng } from './rng';

// ── space ─────────────────────────────────────────────────────────────────
// The shared world: expanses (a few thousand units of space with a
// character) holding features (a veil, a wreck field, a well). One class for
// both modes. Arcade lets the composer deal expanses out ahead of the ship,
// with a memory of what it dealt, so the sky is varied but never random
// noise; Story calls `addExpanse` and `place` itself, with names. Either way
// the ship is asked one question, `sample(x, z)`: what is here, and what does
// it do to me? The answer is the same plain numbers whoever placed it.
//
// Plain data and the seeded Rng, nothing from Three.js: the renderer reads
// `features` and `expanses` and builds what it likes; the world reads
// `sample` and applies the effects it cares about. A pilot can fly through a
// minute of it without a window.

export interface Feature {
  n: number;
  def: FeatureId;
  x: number;
  z: number;
  /** Radius in units (angular degrees for a far feature). */
  r: number;
  vx: number;
  vz: number;
  /** A far feature's bearing, radians. */
  bearing: number;
  /** The renderer's seed for its look. */
  seed: number;
  /** Strength now, 0 to 1: the feature breathing. */
  level: number;
  /** The Story name's id (content/features.ts NAMED), if it has one. */
  named?: string;
  /** The expanse that dealt it, or -1 (placed by hand). */
  expanse: number;
  born: number;
}

export interface Expanse {
  n: number;
  def: ExpanseId;
  x: number;
  z: number;
  r: number;
  born: number;
}

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

/** What the world does to a ship (or a hull, a rock) at one point, all effects blended. */
export interface Influence {
  sight: number;
  lock: number;
  jam: number;
  drag: number;
  /** Acceleration toward the centres, units/s² on each axis. */
  ax: number;
  az: number;
  conceal: number;
  rock: number;
  rich: number;
  krail: number;
  shield: number;
  /** Murk, and the light it throws (linear RGB). */
  fog: number;
  dim: number;
  tint: [number, number, number];
  /** The strongest hold any feature has here, 0 to 1. */
  weight: number;
  /** The features it comes from, strongest first. */
  from: Feature[];
  /** The expanse the point is in, and how far in (0 at the rim, 1 in the heart). */
  expanse: Expanse | null;
  depth: number;
}

export const CALM: Readonly<Influence> = Object.freeze({
  sight: 1, lock: 1, jam: 0, drag: 1, ax: 0, az: 0, conceal: 1, rock: 1, rich: 0, krail: 1, shield: 1,
  fog: 0, dim: 0, tint: [0, 0, 0] as [number, number, number], weight: 0, from: [] as Feature[], expanse: null, depth: 0,
});

/** How the composer is tuned: how far ahead it deals, when it starts, how many features it keeps. */
export const COMPOSE = {
  /** Deal a new expanse when the nearest one ahead has its rim further than this from the ship. */
  lookahead: 2400,
  /** Its rim is dealt this far ahead, and within this bearing off the nose. */
  dealAt: 2100,
  dealArc: 0.55,
  /** Arcade seconds before the first expanse is dealt: the first stretch is the ship's own. */
  first: 35,
  /** An expanse is let go this far behind. */
  forget: 6500,
  /** The deepest the memory goes. */
  memory: 4,
  /** A feature sits within this share of its expanse's radius, and keeps this much clear of other matter. */
  spread: 0.7,
  clear: 90,
  /** The weight history puts on an expanse seen lately. Never the same twice running; never a third busy one in a row. */
  lately: 0.2,
} as const;

export interface SpaceOptions {
  /** The survival mode's multiplier on busy expanses (content/survival.ts hazard). */
  hazard?: number;
  /** Deal expanses by itself. Story sets it false and places its own. */
  compose?: boolean;
}

export class Space {
  readonly features: Feature[] = [];
  readonly expanses: Expanse[] = [];
  /** What the composer dealt lately, newest last. */
  readonly history: ExpanseId[] = [];
  private readonly rng: Rng;
  private made = 0;
  private nextFeature = 1;
  private readonly lastOf = new Map<FeatureId, { x: number; z: number; t: number }[]>();
  private readonly hazard: number;
  private readonly compose: boolean;

  constructor(seed = 47, opts: SpaceOptions = {}) {
    this.rng = new Rng(seed ^ 0x5a17);
    this.hazard = opts.hazard ?? 1;
    this.compose = opts.compose ?? true;
  }

  // ── placing ─────────────────────────────────────────────────────────

  /** One feature, by hand (Story) or by the composer. */
  place(def: FeatureId, x: number, z: number, o: { r?: number; named?: string; expanse?: number; t?: number; bearing?: number } = {}): Feature {
    const d = FEATURES[def];
    const named = o.named ? NAMED[o.named] : undefined;
    const r = o.r ?? named?.radius ?? this.rng.range(d.size[0], d.size[1]);
    const drift = d.drift ?? 0, a = this.rng.range(0, Math.PI * 2);
    const f: Feature = {
      n: this.nextFeature++, def, x, z, r,
      vx: Math.cos(a) * drift * this.rng.range(0.5, 1), vz: Math.sin(a) * drift * this.rng.range(0.5, 1),
      bearing: o.bearing ?? this.rng.range(0, Math.PI * 2),
      seed: this.rng.int(1e9), level: 1, named: o.named, expanse: o.expanse ?? -1, born: o.t ?? 0,
    };
    this.features.push(f);
    const mem = this.lastOf.get(def) ?? [];
    mem.push({ x, z, t: f.born });
    this.lastOf.set(def, mem);
    return f;
  }

  /** An expanse by hand: its features are dealt into it from its roster, unless `deal` is false. */
  addExpanse(def: ExpanseId, x: number, z: number, o: { r?: number; t?: number; deal?: boolean } = {}): Expanse {
    const d = EXPANSES[def];
    const e: Expanse = { n: this.made++, def, x, z, r: o.r ?? this.rng.range(d.radius[0], d.radius[1]), born: o.t ?? 0 };
    this.expanses.push(e);
    this.history.push(def);
    if (this.history.length > COMPOSE.memory) this.history.shift();
    if (o.deal !== false) this.deal(e, o.t ?? 0);
    return e;
  }

  // ── the step ────────────────────────────────────────────────────────

  /** Advance `dt` seconds. `t` is the run's clock; `ship` is where it is flying. */
  step(dt: number, t: number, ship: Pose): void {
    for (const f of this.features) {
      f.x += f.vx * dt; f.z += f.vz * dt;
      const p = FEATURES[f.def].pulse;
      f.level = p ? 1 - p.depth * (0.5 + 0.5 * Math.sin((t / p.period) * Math.PI * 2 + f.seed)) : 1;
    }
    if (this.compose) this.dealAhead(t, ship);
    this.forget(ship);
  }

  /** What the ship has ahead and what it has dealt: the composer's one decision. */
  private dealAhead(t: number, ship: Pose): void {
    if (t < COMPOSE.first) return;
    const fx = Math.cos(ship.heading), fz = -Math.sin(ship.heading);
    for (const e of this.expanses) {
      const dx = e.x - ship.x, dz = e.z - ship.z, d = Math.hypot(dx, dz);
      const ahead = d < 1 || (dx * fx + dz * fz) / d > -0.25;
      if (ahead && d - e.r < COMPOSE.lookahead) return;
    }
    const def = this.pick(t);
    const d = EXPANSES[def];
    const r = this.rng.range(d.radius[0], d.radius[1]);
    for (let tries = 0; tries < 6; tries++) {
      const a = ship.heading + this.rng.range(-COMPOSE.dealArc, COMPOSE.dealArc);
      const dist = COMPOSE.dealAt + r + tries * 400;
      const x = ship.x + Math.cos(a) * dist, z = ship.z - Math.sin(a) * dist;
      if (this.expanses.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r - 300) || tries === 5) {
        this.addExpanse(def, x, z, { r, t });
        return;
      }
    }
  }

  /** The next expanse: by weight, with a memory, a rhythm and the clock. */
  pick(t: number): ExpanseId {
    const last = this.history[this.history.length - 1];
    const tired = this.history.slice(-2).filter((h) => EXPANSES[h].load === 'busy').length >= 2;
    const pool: Array<[ExpanseId, number]> = [];
    let total = 0;
    for (const id of EXPANSE_ORDER) {
      const d = EXPANSES[id];
      if (d.from > t) continue;
      // the first stretch is for looking: calm only
      if (this.made === 0 && d.load !== 'calm') continue;
      // never the same twice running, and never a third busy one in a row
      if (id === last || (tired && d.load === 'busy')) continue;
      let w = d.weight;
      if (this.history.includes(id)) w *= COMPOSE.lately;
      if (d.load === 'busy') w *= this.hazard;
      // after a spell of calm, the busy ones come a little more readily
      else if (last && EXPANSES[last].load === 'calm') w *= 0.8;
      if (w <= 0) continue;
      pool.push([id, w]);
      total += w;
    }
    if (!pool.length) return 'open';
    let roll = this.rng.next() * total;
    for (const [id, w] of pool) { roll -= w; if (roll <= 0) return id; }
    return pool[pool.length - 1]![0];
  }

  /** Fill an expanse from its roster: weighted by kind and rarity, spaced out, never on top of other matter. */
  private deal(e: Expanse, t: number): void {
    const d = EXPANSES[e.def];
    const n = this.rng.int(d.count[1] - d.count[0] + 1) + d.count[0];
    const used = new Set<FeatureId>();
    for (let i = 0; i < n; i++) {
      const id = this.pickFeature(d, t, used);
      if (!id) break;
      const fd = FEATURES[id];
      if (fd.rarity === 'rare' || fd.rarity === 'singular') used.add(id);
      if (fd.layer === 'far') {
        this.place(id, e.x, e.z, { r: this.rng.range(fd.size[0], fd.size[1]), expanse: e.n, t, bearing: this.rng.range(0, Math.PI * 2) });
        continue;
      }
      const r = this.rng.range(fd.size[0], fd.size[1]);
      for (let tries = 0; tries < 12; tries++) {
        const a = this.rng.range(0, Math.PI * 2), k = Math.sqrt(this.rng.next()) * Math.max(0, e.r * COMPOSE.spread - r * 0.4);
        const x = e.x + Math.cos(a) * k, z = e.z + Math.sin(a) * k;
        if (this.fits(fd, x, z, r)) { this.place(id, x, z, { r, expanse: e.n, t }); break; }
      }
    }
  }

  private pickFeature(d: ExpanseDef, t: number, used: Set<FeatureId>): FeatureId | null {
    let total = 0;
    const pool: Array<[FeatureId, number]> = [];
    for (const id of FEATURE_ORDER) {
      const w0 = d.roster[id];
      if (!w0 || used.has(id)) continue;
      const fd = FEATURES[id];
      if (fd.from > t) continue;
      const w = w0 * RARITY[fd.rarity];
      pool.push([id, w]);
      total += w;
    }
    if (!pool.length) return null;
    let roll = this.rng.next() * total;
    for (const [id, w] of pool) { roll -= w; if (roll <= 0) return id; }
    return pool[pool.length - 1]![0];
  }

  /** Whether a feature of this kind may sit at x, z: its own kind far enough off, other matter not under it. */
  private fits(fd: FeatureDef, x: number, z: number, r: number): boolean {
    for (const o of this.lastOf.get(fd.id) ?? []) if (Math.hypot(o.x - x, o.z - z) < fd.gap) return false;
    if (fd.layer !== 'matter') return true;
    for (const f of this.features) {
      if (FEATURES[f.def].layer !== 'matter') continue;
      if (Math.hypot(f.x - x, f.z - z) < f.r + r + COMPOSE.clear) return false;
    }
    return true;
  }

  /** Let go what is far behind. */
  private forget(ship: Pose): void {
    const fx = Math.cos(ship.heading), fz = -Math.sin(ship.heading);
    const gone = new Set<number>();
    for (let i = this.expanses.length - 1; i >= 0; i--) {
      const e = this.expanses[i]!;
      const dx = e.x - ship.x, dz = e.z - ship.z, d = Math.hypot(dx, dz);
      if (d - e.r > COMPOSE.forget && dx * fx + dz * fz < 0) { gone.add(e.n); this.expanses.splice(i, 1); }
    }
    if (!gone.size) return;
    for (let i = this.features.length - 1; i >= 0; i--) if (gone.has(this.features[i]!.expanse)) this.features.splice(i, 1);
    for (const mem of this.lastOf.values()) while (mem.length > 8) mem.shift();
  }

  // ── asking ──────────────────────────────────────────────────────────

  /** The expanse a point is in (the nearest centre, if several), and how far in. */
  expanseAt(x: number, z: number): { e: Expanse; depth: number } | null {
    let best: { e: Expanse; depth: number } | null = null;
    for (const e of this.expanses) {
      const depth = 1 - Math.hypot(x - e.x, z - e.z) / e.r;
      if (depth > 0 && (!best || depth > best.depth)) best = { e, depth };
    }
    return best;
  }

  /** What the world does at a point: every feature's hold on it, blended. */
  sample(x: number, z: number, out: Influence = fresh()): Influence {
    reset(out);
    const at = this.expanseAt(x, z);
    if (at) {
      const d = EXPANSES[at.e.def], k = smooth(at.depth * 2);
      out.expanse = at.e;
      out.depth = at.depth;
      out.rock = 1 + (d.rock.density - 1) * k;
      out.rich = d.rock.rich * k;
      out.tint[0] += d.mood.tint[0] * k; out.tint[1] += d.mood.tint[1] * k; out.tint[2] += d.mood.tint[2] * k;
    }
    for (const f of this.features) {
      const fd = FEATURES[f.def];
      if (fd.layer === 'far') continue;
      const w = weightAt(f, x, z) * f.level;
      if (w <= 0.001) continue;
      const e = fd.effects;
      out.sight *= mix(e.sight, w); out.lock *= mix(e.lock, w); out.drag *= mix(e.drag, w);
      out.conceal *= mix(e.conceal, w); out.rock *= mix(e.rock, w); out.krail *= mix(e.krail, w); out.shield *= mix(e.shield, w);
      out.jam = Math.max(out.jam, (e.jam ?? 0) * w);
      out.rich += (e.rich ?? 0) * w;
      if (e.pull) {
        const dx = f.x - x, dz = f.z - z, d = Math.hypot(dx, dz) || 1;
        out.ax += (dx / d) * e.pull * w; out.az += (dz / d) * e.pull * w;
      }
      out.fog = Math.max(out.fog, (fd.look.fog ?? 0) * w);
      out.dim = Math.max(out.dim, (fd.look.dim ?? 0) * w);
      out.tint[0] += fd.look.tint[0] * w; out.tint[1] += fd.look.tint[1] * w; out.tint[2] += fd.look.tint[2] * w;
      if (w > out.weight) out.weight = w;
      out.from.push(f);
    }
    out.from.sort((a, b) => weightAt(b, x, z) * b.level - weightAt(a, x, z) * a.level);
    return out;
  }
}

/** How firmly a feature holds a point: 1 in its heart, easing to 0 at its rim. */
export function weightAt(f: Feature, x: number, z: number): number {
  if (FEATURES[f.def].layer === 'far') return 0;
  const d = Math.hypot(x - f.x, z - f.z);
  return smooth(clamp((f.r - d) / (f.r * 0.45), 0, 1));
}

const smooth = (x: number) => { const k = clamp(x, 0, 1); return k * k * (3 - 2 * k); };
const mix = (m: number | undefined, w: number) => (m === undefined ? 1 : 1 + (m - 1) * w);

function fresh(): Influence {
  return { ...CALM, tint: [0, 0, 0], from: [] };
}

function reset(o: Influence): void {
  o.sight = 1; o.lock = 1; o.jam = 0; o.drag = 1; o.ax = 0; o.az = 0; o.conceal = 1; o.rock = 1; o.rich = 0; o.krail = 1; o.shield = 1;
  o.fog = 0; o.dim = 0; o.tint[0] = o.tint[1] = o.tint[2] = 0; o.weight = 0; o.from.length = 0; o.expanse = null; o.depth = 0;
}

// ── what the ship says ────────────────────────────────────────────────────
// A feature that changes how the ship works is reported, once, in the ship's
// voice, where it is felt: a short chip under the navigation strip, teal,
// gone when the effect is. A feature that only looks like something is not
// reported at all. Conditions never raise the Yellow or Red alert: those are
// for being watched and being targeted.

export type ReportKind = 'sight' | 'lock' | 'jam' | 'pull' | 'drag' | 'conceal';
export interface Report { kind: ReportKind; value: number; }

/** Least hold before an effect is worth a word. */
export const REPORT_AT = 0.3;

/** The conditions to tell the player about, strongest first, at most `max`. */
export function reports(inf: Influence, max = 2): Report[] {
  if (inf.weight < REPORT_AT) return [];
  const out: Array<Report & { s: number }> = [];
  const add = (kind: ReportKind, value: number, s: number) => { if (s >= 0.2) out.push({ kind, value, s }); };
  add('lock', inf.lock, inf.lock <= 0.3 ? 1 - inf.lock + 0.2 : 1 - inf.lock);
  add('sight', inf.sight, 1 - inf.sight);
  add('jam', inf.jam, inf.jam);
  add('pull', Math.hypot(inf.ax, inf.az), Math.hypot(inf.ax, inf.az) / 5);
  add('drag', inf.drag, inf.drag - 1 > 0.05 ? (inf.drag - 1) * 4 : 0);
  add('conceal', inf.conceal, 1 - inf.conceal);
  return out.sort((a, b) => b.s - a.s).slice(0, max).map(({ kind, value }) => ({ kind, value }));
}

/** The words, in the ship's voice. Sensors and drag carry a number; the rest are a state. */
export const REPORT_TEXT: Record<ReportKind, string> = {
  sight: 'Sensors degraded',
  lock: 'Torpedo lock unreliable',
  jam: 'Navigation interference',
  pull: 'Gravity pull',
  drag: 'Heavy going',
  conceal: 'Hidden from hulls',
};

export type { Effects };
