import { SIGNS, type SignCat, type SignDef } from '../content/gatesigns';
import { wardenRelays } from './evidence';
import { legOf } from './scars';

// ── what the gate signs say ───────────────────────────────────────────────
// Which line a panel shows next. Plain data in, a row of content/gatesigns.ts
// out; nothing here draws, and nothing is saved: what she has found (the
// flags) decides what the world has to say.
//
// Choosing a line:
//   1. a rare line, now and then (RARE_CHANCE), if one is ripe; a line that has a
//      `then` is followed by it
//   2. otherwise a category, by weight: the mix moves from the Continuance's own
//      voice toward the truth as relays wake (MIX_EARLY → MIX_LATE), is bent by
//      which panel it is (SLOT_BIAS) and by the gate (its holder, its leg, a lean
//      of its own)
//   3. then a line of that category she may see, by its own weight; never the line the panel just showed

/** Seconds a line stays up before the next replaces it. */
export const SIGN_HOLD: readonly [number, number] = [8, 12];
/** The chance a change is a rare line, when one is ripe. */
export const RARE_CHANCE = 0.04;
/** Relays it takes for the mix to finish moving (the road has about twenty). */
export const MIX_SPAN = 12;

type Mix = Record<Exclude<SignCat, 'rare'>, number>;
/** Before she has woken a relay: the Continuance everywhere, the graffiti already there. */
const MIX_EARLY: Mix = { official: 42, defaced: 26, resistance: 16, krail: 0, civilian: 10, warden: 6 };
/** Well along the road: the official voice thin, the truth loud. (Half way is about 25 / 30 / 20 / 10 / 10 / 5.) */
const MIX_LATE: Mix = { official: 10, defaced: 30, resistance: 22, krail: 22, civilian: 12, warden: 4 };
/** Until she holds the Krail record only the two questions anyone could scrawl may show, so the category stays small. */
const KRAIL_UNKNOWN = 3;

/** The panels at a gate: the big board, the display someone altered beside it, and the old transmission further along. */
export const SIGN_SLOTS = 3;
const SLOT_BIAS: readonly Mix[] = [
  { official: 3, defaced: 0.6, resistance: 0.2, krail: 0.3, civilian: 0.3, warden: 1 },
  { official: 0.4, defaced: 3, resistance: 1, krail: 1, civilian: 0.5, warden: 0.5 },
  { official: 0.2, defaced: 0.8, resistance: 2.5, krail: 1.5, civilian: 2, warden: 1.5 },
];

/** Everything a pick reads about the gate and her journey. Built when a panel changes, not every frame. */
export interface SignCtx {
  relays: number;
  /** She holds the Krail record. */
  reserves: boolean;
  flags: ReadonlySet<string>;
  /** This gate's own relay is awake. */
  lit: boolean;
  leg: number;
  kellern: boolean;
  /** A lean of this gate's own, 0 to 1 per category, from its name: no two gates carry quite the same pool. */
  lean: Readonly<Record<string, number>>;
  /** A stable number of this gate's, for the way a line ripens a relay later or sooner here. */
  seed: number;
}

const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export function signCtx(flags: ReadonlySet<string>, def: { script?: string; holder?: string; first?: boolean }, litKey: string): SignCtx {
  const seed = hash(def.script ?? 'first');
  const lean: Record<string, number> = {};
  for (const [i, c] of (['official', 'defaced', 'resistance', 'krail', 'civilian', 'warden'] as const).entries()) lean[c] = 0.7 + 0.6 * (((seed >>> (i * 4)) & 15) / 15);
  return { relays: wardenRelays(flags), reserves: flags.has('clue_reserves'), flags, lit: flags.has(litKey), leg: legOf(def.script), kellern: def.holder === 'kellern', lean, seed };
}

/** Whether she may see this line here and now. */
export function ripe(d: SignDef, c: SignCtx): boolean {
  if (d.needs && !c.flags.has(d.needs)) return false;
  if (d.legs && (c.leg < d.legs[0] || c.leg > d.legs[1])) return false;
  if (d.gate === 'dark' && c.lit) return false;
  if (d.gate === 'lit' && !c.lit) return false;
  // a line ripens a relay sooner or later from gate to gate, so a new truth does not appear everywhere the moment a relay wakes
  const need = d.relays ? d.relays + (c.seed + hash(d.id)) % 2 : 0;
  return c.relays >= need;
}

const byId = new Map(SIGNS.map((d) => [d.id, d]));
export const signById = (id: string): SignDef | undefined => byId.get(id);

/** The weight of each category here and now. */
export function mixAt(c: SignCtx, slot: number, out: Record<string, number> = {}): Record<string, number> {
  const p = Math.min(1, c.relays / MIX_SPAN);
  const bias = SLOT_BIAS[slot % SIGN_SLOTS]!;
  for (const k of Object.keys(MIX_EARLY) as Array<keyof Mix>) {
    let w = MIX_EARLY[k] + (MIX_LATE[k] - MIX_EARLY[k]) * p;
    if (k === 'krail') w = c.reserves ? w || 8 : KRAIL_UNKNOWN;
    if (k === 'official' && c.kellern) w *= 1.4;
    if (k === 'resistance' && c.kellern) w *= 0.75;
    out[k] = w * bias[k] * (c.lean[k] ?? 1);
  }
  return out;
}

/** The next line for a panel; `prev` is what it shows now (never repeated), `rnd` is 0 to 1. */
export function pickSign(rnd: () => number, c: SignCtx, slot: number, prev: SignDef | null): SignDef {
  const ok = (d: SignDef) => d.id !== prev?.id && ripe(d, c);
  // a rare line has its follower: flagged for removal, then removed
  const follow = prev?.then ? byId.get(prev.then) : undefined;
  if (follow && ok(follow) && rnd() < 0.9) return follow;
  const rare = SIGNS.filter((d) => d.cat === 'rare' && d.w !== 0 && ok(d));
  if (rare.length && rnd() < RARE_CHANCE) return rare[Math.floor(rnd() * rare.length)]!;
  const mix = mixAt(c, slot);
  const pool: Record<string, SignDef[]> = {};
  for (const d of SIGNS) if (d.cat !== 'rare' && ok(d)) (pool[d.cat] ??= []).push(d);
  let total = 0;
  for (const k in mix) total += pool[k] ? mix[k]! : 0;
  let r = rnd() * total, cat = '';
  for (const k in mix) { if (!pool[k]) continue; cat = k; r -= mix[k]!; if (r < 0) break; }
  const lines = pool[cat] ?? SIGNS.filter((d) => d.cat === 'official' && d.id !== prev?.id);
  let sum = 0;
  for (const d of lines) sum += d.w ?? 1;
  let q = rnd() * sum;
  for (const d of lines) { q -= d.w ?? 1; if (q < 0) return d; }
  return lines[lines.length - 1]!;
}

/** Seconds until the next change. */
export const signHold = (rnd: () => number): number => SIGN_HOLD[0] + (SIGN_HOLD[1] - SIGN_HOLD[0]) * rnd();

// ── `[old|new]` ───────────────────────────────────────────────────────────
/** One run of a line: plain words, or old words struck out and the new ones put over them. */
export interface SignRun { text: string; old?: string }
const parsed = new Map<string, SignRun[]>();
export function signRuns(text: string): SignRun[] {
  const hit = parsed.get(text);
  if (hit) return hit;
  const runs: SignRun[] = [];
  const re = /\[([^|\]]*)\|([^\]]*)\]/g;
  let at = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > at) runs.push({ text: text.slice(at, m.index) });
    runs.push({ text: m[2]!, old: m[1]! });
    at = m.index + m[0].length;
  }
  if (at < text.length) runs.push({ text: text.slice(at) });
  parsed.set(text, runs);
  return runs;
}
