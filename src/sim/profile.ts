import { branchLevels, type Levels } from './build';
import { budgets } from './bay';

// ── the build's profile ───────────────────────────────────────────────────
// What the fitted modules add up to, in a word and a few plain lines: how
// much of the build leans on each of four ways to fight, a name for the
// leading one, what it is good and poor at, and what the ratings say.
// Shown in the bay; the identity title (sim/build.ts) stays the Story's.

export type Axis = 'close' | 'ordnance' | 'range' | 'defence';

export interface Profile {
  /** English; the UI puts it through t(). */
  name: string;
  /** Each way's share of the build's levels, 0 to 1 against the deepest. */
  axes: Record<Axis, number>;
  lines: string[];
}

const AXIS_OF: Record<Axis, Parameters<typeof branchLevels>[1][]> = {
  close: ['close', 'plasma'],
  ordnance: ['torpedo', 'mine'],
  range: ['laser', 'mobility'],
  defence: ['defence'],
};
const NAME: Record<Axis, string> = { close: 'Rammer', ordnance: 'Bombardier', range: 'Lancer', defence: 'Bulwark' };
const LINES: Record<Axis, [string, string]> = {
  close: ['Hits hardest up close', 'Poor at range'],
  ordnance: ['Big single hits', 'Slow to reload'],
  range: ['Reaches far', 'Light on armour'],
  defence: ['Takes hits well', 'Low damage'],
};

export function profileOf(levels: Levels): Profile {
  const raw = Object.fromEntries((Object.keys(AXIS_OF) as Axis[]).map((a) => [a, AXIS_OF[a].reduce((n, b) => n + branchLevels(levels, b), 0)])) as Record<Axis, number>;
  const ranked = (Object.keys(raw) as Axis[]).sort((a, b) => raw[b] - raw[a]);
  const top = ranked[0]!, max = raw[top];
  const axes = Object.fromEntries(ranked.map((a) => [a, max ? raw[a] / max : 0])) as Record<Axis, number>;
  const lines: string[] = [];
  let name = 'Stock hauler';
  if (max >= 3) {
    const second = ranked[1]!;
    name = raw[second] >= max * 0.75 ? 'Hybrid' : NAME[top];
    lines.push(...(name === 'Hybrid' ? ['No single strength', 'Good at nothing yet'] : LINES[top]));
  } else lines.push('Stock lasers, a shield, a torpedo bay');
  const { use, cap } = budgets(levels);
  if (use.heat / cap.heat >= 0.8) lines.push('Runs hot');
  else if (use.mass / cap.mass >= 0.8) lines.push('Heavy: slow to turn');
  else if (use.power >= cap.power) lines.push('Power is tight');
  return { name, axes, lines: lines.slice(0, 3) };
}
