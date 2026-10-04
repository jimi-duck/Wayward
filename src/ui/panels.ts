import { BRANCHES, UPGRADES, type Branch } from '../content/upgrades';
import { COSMETICS, MODIFIERS, UNLOCKS } from '../content/unlocks';
import { availableModifiers, grants, type Profile, type Recorded } from '../meta/profile';
import { identity, type Levels } from '../sim/build';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { VARIANTS } from '../sim/enemies';
import type { RunStats } from '../sim/run';

// ── the panels ────────────────────────────────────────────────────────────
// The run report (the refit cards are ui/refit.ts, comms cards and the hail
// ui/comms.ts, the port ui/port.ts) and the start screen's options. Each stop is a modal sheet that
// the world waits on. Every panel ignores input for its first moments and
// never answers a held key: a hail opens with the trigger down, and a run
// ends with keys held.

export const mmss = (s: number) => { const r = Math.max(0, Math.round(s)); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };
const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

// ── the build, drawn ──────────────────────────────────────────────────────

/** The ship as built: its name (unless `named` is false), then each branch with what was fitted in it. */
export function buildView(levels: Levels, named = true): HTMLElement {
  const id = identity(levels);
  const wrap = h('div', 'build');
  if (named) wrap.append(h('div', 'sum-ship', id.title));
  const owned = UPGRADES.filter((u) => (levels[u.id] ?? 0) > 0);
  if (!owned.length) { wrap.append(h('p', 'how-note', 'Stock: laser banks, three plates, nothing else fitted.')); return wrap; }
  const order = [...id.branches.map((b) => b.branch), 'synergy' as Branch];
  for (const br of order) {
    const ups = owned.filter((u) => u.branch === br);
    if (!ups.length) continue;
    const row = h('div', 'branch', '', h('span', 'k', BRANCHES[br].name));
    const list = h('div', 'ups');
    for (const u of ups) {
      const lv = levels[u.id]!;
      list.append(h('span', u.kind === 'spec' ? 'spec' : u.kind === 'synergy' ? 'syn' : '', u.max > 1 ? `${u.name} ${lv}` : u.name));
    }
    row.append(list);
    wrap.append(row);
  }
  return wrap;
}

// ── the run report ────────────────────────────────────────────────────────

const WEAPON_WORD: Record<string, string> = {
  laser: 'Lasers', torpedo: 'Torpedoes', mine: 'Mines', plasma: 'Plasma', arc: 'Hull arc', ram: 'Ramming', overcharge: 'Overcharge', hazard: 'The sector',
};

/** What hurt, in words: "rock", "fire:scout" or "ram:raptor" to a phrase. */
export function damageWord(src: string): string {
  const [kind, who, how] = src.split(':');
  const label = (v?: string) => (v === 'capital' ? 'capital ship' : (v && VARIANTS[v]?.label.toLowerCase()) || 'enemy');
  switch (kind) {
    case 'fire': return who === 'plasma' ? 'Plasma torpedoes' : who === 'capital' ? `Capital ship ${how ?? 'fire'}` : `${cap(label(who))} fire`;
    case 'ram': return `Rammed by ${who === 'capital' ? 'a capital ship' : `a ${label(who)}`}`;
    case 'rock': return 'Rock';
    case 'bulwark': return 'Bulwarks';
    case 'beam': return who === 'capital' ? 'A capital ship’s beams' : `${cap(label(who))} beams`;
    case 'web': return 'Thren webs';
    case 'volatile': return 'Volatile rock';
    case 'blast': return 'Blasts';
    case 'lightning': return 'Lightning';
    case 'artillery': return 'Shells';
    case 'anomaly': return 'The anomaly';
    default: return cap(kind ?? src);
  }
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export class SummaryPanel {
  private off: (() => void) | null = null;
  private pad: { opened: number; go: () => void } | null = null;

  show(r: RunStats, rec: Recorded, onAgain: () => void): void {
    this.close();
    const opened = performance.now();
    const p = rec.previous;
    const breakout = r.mode === 'breakout';
    $('summary').classList.toggle('alert', !r.escaped);
    $('summary').querySelector('.kick')!.textContent = r.escaped ? 'Escaped' : 'Hull breach';
    $('sum-t').textContent = r.escaped ? 'Into the lane' : breakout ? 'Caught in the home system' : rec.newBest ? 'New best' : 'Run over';
    // "Rammed by a raptor" already says how; everything else reads after "Breached by"
    const cause = damageWord(r.cause || 'rock');
    $('sum-s').textContent = r.escaped ? `Out of the home system with ${r.krailLeft} Krail to spare` : /^rammed /i.test(cause) ? cause : `Breached by ${cause.toLowerCase()}`;
    $('sum-score').textContent = fmt(r.score);
    const line = $('sum-line');
    line.replaceChildren(h('span', '', `${mmss(r.time)} ${r.escaped ? 'to the lane' : 'survived'} · refit ${r.refit} · ${r.kills} kills`), rec.newBest ? h('span', 'best', ' · new best') : h('span', '', ` · best ${fmt(p.score)}`));
    $('sum-ship').textContent = r.identity;

    // tiles: this run against the best before it
    const tile = (label: string, v: number, best: number, show = (n: number) => fmt(n)) => {
      const up = v > best && best > 0;
      const d = v - best;
      return h('div', `tile${up ? ' up' : ''}`, '', h('span', 'k', label), h('b', '', show(v)),
        h('span', 'cmp', best <= 0 ? 'First record' : d === 0 ? `Matched · best ${show(best)}` : `${d > 0 ? '▲ +' : '▼ −'}${show(Math.abs(d))} · best ${show(best)}`));
    };
    if (breakout) {
      const plain = (label: string, v: string, note: string) => h('div', 'tile', '', h('span', 'k', label), h('b', '', v), h('span', 'cmp', note));
      $('sum-tiles').replaceChildren(
        plain(r.escaped ? 'Escape time' : 'Lasted', mmss(r.time), r.escaped ? 'Through the lane mouth' : 'Short of the lane'),
        plain('Krail', String(r.krail), r.escaped ? `${r.krailLeft} left after the jump` : 'Gathered'),
        plain('Ore', String(r.ore), `${r.oreSold} sold at the port`),
        plain('Rock cut clean', String(r.cut), `${r.fractured} fractured`),
        tile('Refits', r.refit, p.refit),
        tile('Kills', r.kills, p.kills),
        plain('Parts', String(r.parts), `${r.platesGained} plates mended`),
        plain('Port', r.docked ? `${r.docked}×` : '—', r.docked ? 'Docked at Frontier Supply' : 'Never docked'),
      );
    } else $('sum-tiles').replaceChildren(
      tile('Survived', r.time, p.time, mmss),
      tile('Refits', r.refit, p.refit),
      tile('Kills', r.kills, p.kills),
      tile('Best chain', r.bestChain, p.chain),
      tile('Krail', r.krail, p.krail),
      tile('Overcharges', r.overcharges, p.overcharges),
      tile('Capital ships', r.capitals, p.capitals),
      h('div', 'tile', '', h('span', 'k', 'Sector events'), h('b', '', `${r.eventsWon}/${r.events}`), h('span', 'cmp', `${r.powerups} power-ups found`)),
    );
    $('sum-build').replaceChildren(buildView(r.build, false));
    $('sum-how').replaceChildren(this.how(r));
    this.chart(r, rec.previousCurve);

    const un = $('sum-unlocks');
    un.replaceChildren();
    if (rec.unlocked.length) {
      un.append(h('span', 'k', `Unlocked · ${rec.unlocked.length}`));
      for (const u of rec.unlocked) un.append(h('p', '', '', h('b', '', `${u.name}. `), document.createTextNode(u.text)));
    }

    $('summary').hidden = false;
    const again = $<HTMLButtonElement>('again');
    const go = () => { this.close(); onAgain(); };
    this.pad = { opened, go };
    again.onclick = guarded(opened, go);
    again.onpointerdown = (e) => e.stopPropagation();
    setTimeout(() => again.focus({ preventScroll: true }), GUARD);
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') return go(), true;
      // Space would click the focused button on keyup, with the trigger still held from the run: swallow it
      return e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Digit') || e.code.startsWith('Key');
    });
  }

  close(): void {
    this.off?.();
    this.off = null;
    this.pad = null;
    $('summary').hidden = true;
  }

  /** A gamepad: A plays again (after a longer guard: a run ends with buttons held). */
  padInput(p: PadEdges): void {
    const pad = this.pad;
    if (pad && p.a && performance.now() - pad.opened >= GUARD * 2) pad.go();
  }

  /** What did the killing, what did the damage, and one line on the run's shape. */
  private how(r: RunStats): HTMLElement {
    const box = h('div');
    const grid = h('div', 'how');
    const kills = Object.entries(r.killsBy).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const totalK = kills.reduce((a, [, v]) => a + v, 0) || 1;
    for (const [w, v] of kills.slice(0, 4)) {
      const bar = h('div', 'hb'); bar.append(h('i')); (bar.firstChild as HTMLElement).style.width = `${(v / totalK) * 100}%`;
      grid.append(h('span', '', WEAPON_WORD[w] ?? w), bar, h('b', '', String(v)));
    }
    const dmg = Object.entries(r.damageBy).sort((a, b) => b[1] - a[1]);
    const totalD = dmg.reduce((a, [, v]) => a + v, 0) || 1;
    for (const [src, v] of dmg.slice(0, 3)) {
      const bar = h('div', 'hb dmg'); bar.append(h('i')); (bar.firstChild as HTMLElement).style.width = `${(v / totalD) * 100}%`;
      grid.append(h('span', '', damageWord(src)), bar, h('b', '', String(v)));
    }
    box.append(grid);
    const notes: string[] = [];
    const top = kills[0];
    if (top) notes.push(`${WEAPON_WORD[top[0]]} did ${Math.round((top[1] / totalK) * 100)}% of the killing.`);
    const worst = dmg[0];
    if (worst) notes.push(`${damageWord(worst[0])} did the most damage.`);
    const met = r.capitals + r.capitalsEvaded + r.capitalsEscaped;
    if (met) notes.push(`You met ${met} capital ship${met > 1 ? 's' : ''}: ${r.capitals} destroyed, ${r.capitalsEvaded} evaded, ${r.capitalsEscaped} got away.`);
    if (r.shieldsAbsorbed) notes.push(`Shields took ${r.shieldsAbsorbed} hit${r.shieldsAbsorbed > 1 ? 's' : ''} for you.`);
    if (r.platesGained) notes.push(`You mended ${r.platesGained} plate${r.platesGained > 1 ? 's' : ''}.`);
    if (r.dropped) notes.push(`You collected ${Math.round((r.krail / r.dropped) * 100)}% of the krail you shook loose.`);
    box.append(h('p', 'how-note', notes.join(' ')));
    return box;
  }

  private chart(r: RunStats, best: Array<{ t: number; score: number }>): void {
    const svg = $('sum-chart') as unknown as SVGSVGElement;
    const W = 820, H = 120, P = 6;
    const tMax = Math.max(10, ...r.timeline.map((p) => p.t), ...best.map((p) => p.t));
    const sMax = Math.max(100, ...r.timeline.map((p) => p.score), ...best.map((p) => p.score));
    const path = (pts: Array<{ t: number; score: number }>) => pts.map((p, i) =>
      `${i ? 'L' : 'M'}${(P + (p.t / tMax) * (W - 2 * P)).toFixed(1)} ${(H - P - (p.score / sMax) * (H - 2 * P)).toFixed(1)}`).join(' ');
    const ns = 'http://www.w3.org/2000/svg';
    const el = (tag: string, attrs: Record<string, string>) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
    svg.replaceChildren();
    for (let i = 0; i <= 3; i++) svg.append(el('line', { class: 'grid', x1: '0', x2: String(W), y1: String(P + (i / 3) * (H - 2 * P)), y2: String(P + (i / 3) * (H - 2 * P)) }));
    if (best.length > 1) svg.append(el('path', { class: 'best', d: path(best) }));
    if (r.timeline.length > 1) svg.append(el('path', { class: 'run', d: path([{ t: 0, score: 0 }, ...r.timeline]) }));
    svg.setAttribute('aria-label', `Score over time: this run ${fmt(r.score)} at ${mmss(r.time)}${best.length ? `, best run ${fmt(best[best.length - 1]!.score)}` : ''}`);
  }
}

// ── the start screen: records, challenge modifiers, engine colour, logbook ─

export class StartOptions {
  constructor(private readonly profile: Profile, private readonly onChange: () => void) {
    $('logbook-b').addEventListener('click', (e) => { e.stopPropagation(); this.logbook(true); });
    $('logbook-b').addEventListener('pointerdown', (e) => e.stopPropagation());
    $('logbook-x').addEventListener('click', () => this.logbook(false));
    $('logbook').addEventListener('pointerdown', (e) => e.stopPropagation());
    this.render();
  }

  get logbookOpen(): boolean {
    return !$('logbook').hidden;
  }

  render(): void {
    const p = this.profile;
    const rec = $('records');
    rec.replaceChildren();
    if (p.life.runs) {
      rec.append(h('span', '', 'Best', h('b', '', fmt(p.best.score))), h('span', '', 'Longest', h('b', '', mmss(p.best.time))), h('span', '', 'Runs', h('b', '', String(p.life.runs))));
    }
    const mods = $('mods');
    mods.replaceChildren();
    for (const id of availableModifiers(p)) {
      const d = MODIFIERS[id]!;
      const b = h('button', '', `${d.name} ×${d.score}`) as HTMLButtonElement;
      b.type = 'button';
      b.title = d.text;
      b.setAttribute('aria-pressed', String(p.modifiers.includes(id)));
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        p.modifiers = p.modifiers.includes(id) ? p.modifiers.filter((m) => m !== id) : [...p.modifiers, id];
        this.render();
        this.onChange();
      });
      mods.append(b);
    }
    const paint = $('paint');
    paint.replaceChildren();
    const owned = ['engine-stock', ...grants(p).filter((g) => COSMETICS[g])];
    if (owned.length > 1) {
      for (const id of owned) {
        const b = h('button', '', COSMETICS[id]!.name) as HTMLButtonElement;
        b.type = 'button';
        b.setAttribute('aria-pressed', String(p.cosmetic === id));
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => { e.stopPropagation(); p.cosmetic = id; this.render(); this.onChange(); });
        paint.append(b);
      }
    }
  }

  logbook(on: boolean): void {
    const p = this.profile;
    if (on) {
      const list = $('logbook-l');
      list.replaceChildren(...UNLOCKS.map((u) => {
        const got = p.earned.includes(u.id);
        return h('li', got ? 'on' : '', '', h('b', '', got ? u.name : '???'), h('span', 'kind', u.kind), h('p', '', got ? u.text : u.hint));
      }));
      $('logbook-s').textContent = `${p.earned.length} of ${UNLOCKS.length} · nothing here makes the ship stronger; it gives you more ways to build it`;
    }
    $('logbook').hidden = !on;
  }
}

export { identity };
