import { BRANCHES, type Branch } from '../content/upgrades';
import { branchLevels, identity, type Levels } from '../sim/build';
import { h } from './dom';

// ── the loadout ───────────────────────────────────────────────────────────
// The ship as fitted, one chip per system: what the refits so far have made
// of it, read at a glance on the refit web. The node under the cursor lights
// its system with the level it would add, so a pick reads as fitting a
// module to this ship rather than taking a perk. Phasers and the warp core
// are fitted from the yard, so they count from level 1, as on the HUD.

const STOCK = new Set<Branch>(['phaser', 'overcharge']);

export function systemLevel(levels: Levels, b: Branch): number {
  return branchLevels(levels, b) + (STOCK.has(b) ? 1 : 0);
}

export function loadout(levels: Levels, hl: Branch | null): HTMLElement[] {
  const out: HTMLElement[] = [h('span', 'lbl', 'Your ship · ', h('b', '', identity(levels).title))];
  let lit = false;
  for (const b of Object.keys(BRANCHES) as Branch[]) {
    if (b === 'synergy' || b === 'salvage') continue;
    const n = systemLevel(levels, b);
    if (n <= 0 && b !== hl) continue;
    if (b === hl) lit = true;
    out.push(h('span', `mod${b === hl ? ' hl' : ''}${n <= 0 ? ' new' : ''}`, BRANCHES[b].name, h('b', '', String(n))));
  }
  if (hl === 'synergy' && !lit) out.push(h('span', 'mod hl new', 'Synergy', h('b', '', '0')));
  return out;
}
