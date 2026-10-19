import type { Faction } from './enemies';
import type { Amount, Cost, Ctx, Outcome, Standing } from './comms';
import { chipsOf } from './consequences';
import { cy } from './purse';

// ── what a choice brings ──────────────────────────────────────────────────
// A comms choice's outcome in a few short words, worked out from the data so
// no card has to say it twice: what lands in the hold, what happens next at
// the lane mouth, who likes you more, whether the hunt gets hotter. The
// panel draws them beside the costs and the odds, so a player who reads
// none of the card can still see what each answer is for. Losses start with
// a minus sign (U+2212), like costs, so the panel colours them the same.

/** At most this many: a choice reads at a glance or not at all. */
export const MAX_GAINS = 3;

const STANDING_SHORT: Record<Standing, string> = {
  custody: 'Custody', gutter: 'Gutter', frontier: 'Frontier', guild: 'Guild', kellern: 'Kellern', miners: 'Miners',
};
/** Flags worth naming: what the player now holds. */
const FLAG_SHORT: Record<string, string> = {
  codes: 'Forged codes', freqs: 'Office codes', news: 'Lane news', fee_known: 'Intel', forger_known: 'Intel', gutter_friend: 'Gutter friend',
};
/** The story's flags (content/story.ts): what a beat's answer puts in your hands, named first. */
const STORY_SHORT: Record<string, string> = {
  frag_order: 'File +1', frag_ledger: 'File +1', frag_manifests: 'File +1', frag_keys: 'File +1',
  frag_blackbox: 'File +1', frag_charts: 'File +1', frag_workorder: 'File +1', frag_witnesses: 'File +1',
  copy_warden: 'Copy out', voice_read: 'Copy out',
  clue_archive_log: 'Wall +1', clue_agent: 'Wall +1', clue_scarred: 'Wall +1', clue_cyrite: 'Wall +1',
  clue_draper: 'Wall +1', clue_sig_reach: 'Wall +1', clue_sig_yards: 'Wall +1', clue_sig_ports: 'Wall +1', clue_reserves: 'Wall +1',
  tam_codes: 'Forged codes', lease_financed: 'On the lease', ship_stolen: 'Hull stolen',
};
const WHAT: Array<[keyof Cost, string]> = [['cyrite', 'Cyrite'], ['supplies', 'supplies']];

const held = (x: Ctx, k: keyof Cost) => ({ chits: x.cyrite, cyrite: x.cyrite, supplies: x.supplies, fuel: Math.floor(x.fuel) })[k];

/** An amount as a delta, without the comms module (which imports this one). */
function delta(a: Amount | undefined, have: number, fee: number, chits = false): number {
  if (a === undefined) return 0;
  if (typeof a === 'number') return chits ? cy(a) : a;
  return a === 'fee' ? fee : a === '-fee' ? -fee : a === '-all' ? -have : -Math.ceil(have / 2);
}

/** What an outcome brings, most telling first. `paid`: what the choice's cost took (a sale is paid per ore taken). */
export function gains(o: Outcome, x: Ctx, fee: number, paid: Partial<Record<keyof Cost, number>> = {}): string[] {
  const out: string[] = [];
  // the story first: a piece of the file, an ally, a buyer
  // a flag with consequences names them (what it brings, then what it costs) in place of its short name
  for (const f of [o.flag ?? []].flat()) for (const c of chipsOf(f) ?? [STORY_SHORT[f]]) if (c && !out.includes(c)) out.push(c);
  // the registry's view of it
  if (o.civic) out.push(o.civic > 0 ? 'Registry ↑' : 'Registry ↓');
  // where it leaves you: the lane mouth, Calloway, a named captain, a fight
  if (o.blockade) out.push(o.blockade === 'pass' ? 'Through the lane' : o.blockade === 'run' ? 'Run the blockade' : 'Fight');
  if (o.calloway) out.push(o.calloway === 'fight' ? 'Calloway fights' : 'Calloway chases');
  if (o.captain) out.push(o.captain === 'fight' ? 'Fight' : o.captain === 'run' ? 'Run' : o.captain === 'pay' ? 'They let you go' : 'They leave');
  if (o.spawn?.length && !o.blockade && !o.captain) out.push('Hostiles');
  if (o.dismiss) out.push('They leave');
  // what changes hands
  for (const [k, word] of WHAT) {
    // chits and Cyrite are one stock: what a row gives in chits is told in Cyrite
    const n = delta(o[k], held(x, k), fee) + (k === 'cyrite' ? delta(o.chits, held(x, k), fee, true) : 0);
    if (n) out.push(`${n > 0 ? '+' : '−'}${Math.abs(n)} ${word}`);
  }
  if (o.fuel) out.push(`${o.fuel > 0 ? '+' : '−'}${Math.abs(o.fuel)} jump fluid`);
  if (o.krail) out.push(`${o.krail > 0 ? '+' : '−'}${Math.abs(cy(o.krail))} Cyrite`);
  if (o.plates) out.push(o.plates > 0 ? `+${o.plates} hull` : `−${-o.plates} hull`);
  if (o.job) out.push('Job');
  if (o.seam) out.push('Rich rock');
  for (const f of [o.flag ?? []].flat()) if (FLAG_SHORT[f] && !out.includes(FLAG_SHORT[f]!)) out.push(FLAG_SHORT[f]!);
  // the hunt and the Net
  if (o.hunt) out.push(o.hunt > 0 ? 'Calloway delayed' : 'Calloway closer');
  if (o.stall) out.push(o.stall > 0 ? 'Net held off' : 'Net spreads');
  // how you stand
  for (const [s, n] of Object.entries(o.standing ?? {}) as Array<[Standing, number]>) if (n) out.push(`${n > 0 ? '+' : '−'}${STANDING_SHORT[s]}`);
  const notice = Object.values(o.notice ?? {} as Partial<Record<Faction, number>>).reduce((a, n) => a + (n ?? 0), 0);
  const hot = (o.heat ?? 0) + notice * 0.01;
  if (hot > 0) out.push('Wanted ↑');
  else if (hot < 0) out.push('Wanted ↓');
  return out.slice(0, MAX_GAINS);
}
