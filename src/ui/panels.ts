import { BRANCHES, UPGRADES, type Branch } from '../content/upgrades';
import { COSMETICS, UNLOCKS } from '../content/unlocks';
import { SURVIVAL, SURVIVALS, type SurvivalId } from '../content/survival';
import { ENDING_BY_ID, ENDINGS } from '../content/endings';
import { FRAGMENTS_ALL } from '../content/story';
import { OBSERVATIONS } from '../content/situations';
import { grants, type Profile, type Recorded } from '../meta/profile';
import { identity, type Levels } from '../sim/build';
import { artImg } from './art';
import type { SlotId } from '../content/art';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { VARIANTS } from '../sim/enemies';
import type { RunStats } from '../sim/run';
import { LANG_NAME, LANGS, current, num, plural, setLang, t } from '../i18n';

// ── the panels ────────────────────────────────────────────────────────────
// The run report (the refit cards are ui/refit.ts, comms cards and the hail
// ui/comms.ts, the port ui/port.ts) and the start screen's options. Each stop is a modal sheet that
// the world waits on. Every panel ignores input for its first moments and
// never answers a held key: a hail opens with the trigger down, and a run
// ends with keys held.

export const mmss = (s: number) => { const r = Math.max(0, Math.round(s)); return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; };
const fmt = num;

// ── the build, drawn ──────────────────────────────────────────────────────

/** The ship as built: its name (unless `named` is false), then each branch with what was fitted in it. */
export function buildView(levels: Levels, named = true): HTMLElement {
  const id = identity(levels);
  const wrap = h('div', 'build');
  if (named) wrap.append(h('div', 'sum-ship', t(id.title)));
  const owned = UPGRADES.filter((u) => (levels[u.id] ?? 0) > 0);
  if (!owned.length) { wrap.append(h('p', 'how-note', t('Stock: lasers, three plates, nothing else.'))); return wrap; }
  const order = [...id.branches.map((b) => b.branch), 'synergy' as Branch];
  for (const br of order) {
    const ups = owned.filter((u) => u.branch === br);
    if (!ups.length) continue;
    const row = h('div', 'branch', '', h('span', 'k', t(BRANCHES[br].name)));
    const list = h('div', 'ups');
    for (const u of ups) {
      const lv = levels[u.id]!;
      list.append(h('span', u.kind === 'spec' ? 'spec' : u.kind === 'synergy' ? 'syn' : '', u.max > 1 ? `${t(u.name)} ${lv}` : t(u.name)));
    }
    row.append(list);
    wrap.append(row);
  }
  return wrap;
}

// ── the run report ────────────────────────────────────────────────────────

const WEAPON_WORD: Record<string, string> = {
  laser: 'Lasers', torpedo: 'Torpedoes', mine: 'Mines', plasma: 'Plasma', arc: 'Hull arc', ram: 'Ramming', hazard: 'The sector',
};

/** What hurt, in words: "rock", "fire:scout" or "ram:raptor" to a phrase. */
export function damageWord(src: string): string {
  const [kind, who, how] = src.split(':');
  const name = () => t((who && VARIANTS[who]?.label) || 'Enemy');
  switch (kind) {
    case 'fire': return who === 'plasma' ? t('Plasma torpedoes') : who === 'capital' ? t('Capital ship fire') : t('{name} fire', { name: name() });
    case 'ram': return who === 'capital' ? t('Rammed by a capital ship') : t('Rammed by: {name}', { name: name() });
    case 'beam': return who === 'capital' ? t('Capital ship beams') : t('{name} beams', { name: name() });
    default: return t(DAMAGE_WORD[kind ?? ''] ?? cap(kind ?? src));
  }
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DAMAGE_WORD: Record<string, string> = {
  rock: 'Rock', bulwark: 'Bulwarks', web: 'Thren webs', volatile: 'Volatile rock', blast: 'Blasts', lightning: 'Lightning', artillery: 'Shells', anomaly: 'The anomaly',
};

/** A picture beside a found entry in the Archive, if the build has one. Entries not yet found show nothing, so nothing is given away. */
function pictured(li: HTMLElement, slot: SlotId, id: string, got: boolean): HTMLElement {
  const img = got ? artImg(slot, id, 'ar-pic') : null;
  if (img) { li.classList.add('pic'); li.prepend(img); }
  return li;
}

export class SummaryPanel {
  private off: (() => void) | null = null;
  private pad: { opened: number; go: () => void } | null = null;

  show(r: RunStats, rec: Recorded, onAgain: () => void): void {
    this.close();
    const opened = performance.now();
    const p = rec.previous;
    const breakout = r.mode === 'breakout';
    $('summary').classList.toggle('alert', !r.escaped);
    $('summary').querySelector('.kick')!.textContent = t(r.escaped ? 'Escaped' : 'Hull breach');
    $('sum-t').textContent = t(r.escaped ? 'Into the lane' : breakout ? 'Caught in the home system' : rec.newBest ? 'New best' : 'Run over');
    // what did it: the kicker already says hull breach
    $('sum-s').textContent = r.escaped ? t('Out with {n} Cyrite to spare', { n: r.cyriteLeft }) : damageWord(r.cause || 'rock');
    $('sum-score').textContent = fmt(r.score);
    const line = $('sum-line');
    line.replaceChildren(h('span', '', `${mmss(r.time)} ${t(r.escaped ? 'to the lane' : 'survived')} · ${t('refit')} ${r.refit} · ${t('{n} kills', { n: r.kills })}`), rec.newBest ? h('span', 'best', ` · ${t('new best')}`) : h('span', '', ` · ${t('best')} ${fmt(p.score)}`));
    $('sum-ship').textContent = t(r.identity);

    // tiles: this run against the best before it
    const tile = (label: string, v: number, best: number, show = (n: number) => fmt(n)) => {
      const up = v > best && best > 0;
      const d = v - best;
      return h('div', `tile${up ? ' up' : ''}`, '', h('span', 'k', t(label)), h('b', '', show(v)),
        h('span', 'cmp', best <= 0 ? t('First record') : d === 0 ? `${t('Matched')} · ${t('best')} ${show(best)}` : `${d > 0 ? '▲ +' : '▼ −'}${show(Math.abs(d))} · ${t('best')} ${show(best)}`));
    };
    if (breakout) {
      const plain = (label: string, v: string, note: string) => h('div', 'tile', '', h('span', 'k', t(label)), h('b', '', v), h('span', 'cmp', note));
      $('sum-tiles').replaceChildren(
        plain(r.escaped ? 'Escape time' : 'Lasted', mmss(r.time), t(r.escaped ? 'Through the lane mouth' : 'Short of the lane')),
        plain('Cyrite', String(r.cyrite), r.escaped ? t('{n} left after the jump', { n: r.cyriteLeft }) : t('Gathered')),
        plain('Scrap', String(r.ore), t('{n} chits paid', { n: r.oreSold })),
        plain('Rock mined', String(r.mined), t('{n} blasted', { n: r.blasted })),
        tile('Refits', r.refit, p.refit),
        tile('Kills', r.kills, p.kills),
        plain('Supplies', String(r.parts), t('{n} plates mended', { n: r.platesGained })),
        plain('Port', r.docked ? `${r.docked}×` : '—', t(r.docked ? 'Docked at Frontier Supply' : 'Never docked')),
      );
    } else $('sum-tiles').replaceChildren(
      tile('Survived', r.time, p.time, mmss),
      tile('Refits', r.refit, p.refit),
      tile('Kills', r.kills, p.kills),
      tile('Best chain', r.bestChain, p.chain),
      tile('Chits', r.krail, p.krail),
      tile('Capital ships', r.capitals, p.capitals),
      h('div', 'tile', '', h('span', 'k', t('Sector events')), h('b', '', `${r.eventsWon}/${r.events}`), h('span', 'cmp', t('{n} boosters found', { n: r.powerups }))),
    );
    $('sum-build').replaceChildren(buildView(r.build, false));
    $('sum-how').replaceChildren(this.how(r));
    this.chart(r, rec.previousCurve);

    const un = $('sum-unlocks');
    un.replaceChildren();
    if (rec.unlocked.length) {
      un.append(h('span', 'k', `${t('Unlocked')} · ${rec.unlocked.length}`));
      for (const u of rec.unlocked) un.append(h('p', '', '', h('b', '', `${t(u.name)}. `), document.createTextNode(t(u.text))));
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
      grid.append(h('span', '', t(WEAPON_WORD[w] ?? w)), bar, h('b', '', String(v)));
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
    if (top) notes.push(t('{w}: {p}% of kills.', { w: t(WEAPON_WORD[top[0]] ?? top[0]), p: Math.round((top[1] / totalK) * 100) }));
    const worst = dmg[0];
    if (worst) notes.push(t('Worst damage: {what}.', { what: damageWord(worst[0]) }));
    const met = r.capitals + r.capitalsEvaded + r.capitalsEscaped;
    if (met) notes.push(t('Capital ships: {a} killed, {b} evaded, {c} got away.', { a: r.capitals, b: r.capitalsEvaded, c: r.capitalsEscaped }));
    if (r.shieldsAbsorbed) notes.push(plural(r.shieldsAbsorbed, 'Shields took {n} hit.', 'Shields took {n} hits.'));
    if (r.platesGained) notes.push(plural(r.platesGained, 'You mended {n} plate.', 'You mended {n} plates.'));
    if (r.dropped) notes.push(t('Chits picked up: {p}%.', { p: Math.round((r.krail / r.dropped) * 100) }));
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
    svg.setAttribute('aria-label', `${t('Score over the run')}: ${fmt(r.score)}${best.length ? ` · ${t('best')} ${fmt(best[best.length - 1]!.score)}` : ''}`);
  }
}

// ── the start screen: records, the survival mode, the language; the Archive ─
// The Archive replaces the logbook: the file (the endings reached, and what
// the Archive kept of it), the journeys, the people met, and the unlocks.
// The title no longer has a button for it; logbook(true) still opens it.

/** What each survival mode is as a difficulty, under its name. */
const LEVEL: Record<SurvivalId, string> = { drifter: 'Easy', prospector: 'Normal', raider: 'Hard' };

export class StartOptions {
  constructor(private readonly profile: Profile, private readonly onChange: () => void, private readonly onPick: () => void) {
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
      rec.append(h('span', '', t('Best'), h('b', '', fmt(p.best.score))), h('span', '', t('Longest'), h('b', '', mmss(p.best.time))), h('span', '', t('Runs'), h('b', '', String(p.life.runs))));
    }
    // the survival mode: Drifter, Prospector or Raider, with what the one picked means and how it differs, written under it
    const mods = $('mods');
    mods.replaceChildren(...SURVIVALS.map((m) => {
      const b = h('button', 'st-row dif', '', h('span', 'st-t', t(m.name)), h('span', 'st-s', t(LEVEL[m.id]))) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(p.survival === m.id));
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (p.survival !== m.id) {
          p.survival = m.id;
          this.render();
          this.onChange();
        }
        // choosing a difficulty is the way in: the game starts on it
        this.onPick();
      });
      // what a row means shows while it is under the pointer or the focus, and settles back on the pick when they leave
      b.addEventListener('pointerenter', () => this.preview(m.id));
      b.addEventListener('focus', () => this.preview(m.id));
      return b;
    }));
    mods.onpointerleave = () => this.preview(p.survival);
    this.preview(p.survival);
    // the language: English or German, remembered
    $('lang').replaceChildren(...LANGS.map((l) => {
      const b = h('button', '', LANG_NAME[l]) as HTMLButtonElement;
      b.type = 'button';
      b.lang = l;
      b.setAttribute('aria-pressed', String(current() === l));
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', (e) => { e.stopPropagation(); if (current() !== l) setLang(l); });
      return b;
    }));
    const paint = $('paint');
    paint.replaceChildren();
    const owned = ['engine-stock', ...grants(p).filter((g) => COSMETICS[g])];
    if (owned.length > 1) {
      for (const id of owned) {
        const b = h('button', '', t(COSMETICS[id]!.name)) as HTMLButtonElement;
        b.type = 'button';
        b.setAttribute('aria-pressed', String(p.cosmetic === id));
        b.addEventListener('pointerdown', (e) => e.stopPropagation());
        b.addEventListener('click', (e) => { e.stopPropagation(); p.cosmetic = id; this.render(); this.onChange(); });
        paint.append(b);
      }
    }
  }

  /** The difficulty's preview: its line, the three pips and, in Story, what a wreck costs. */
  private preview(id: SurvivalId): void {
    const K = SURVIVAL[id];
    $('sv-t').textContent = t(K.tag);
    $('diff-s').textContent = t(K.text);
    const pips = (n: number, cls: string) => h('i', cls, '', ...[1, 2, 3].map((k) => h('s', k <= n ? 'on' : '')));
    $('sv-scale').replaceChildren(
      h('span', 'sv-c sky', '', h('em', '', t('Skies')), pips(K.scale.sky, 'sky')),
      h('span', 'sv-c', '', h('em', '', t('Mining')), pips(K.scale.mining, '')),
      h('span', 'sv-c', '', h('em', '', t('Wrecks')), pips(K.scale.wrecks, '')),
    );
    $('sv-rule').textContent = t('Wrecked? You drift on, a share of your stores gone. {n} wrecks in one region and you fly it again.', { n: K.voyage.wrecks });
  }

  logbook(on: boolean): void {
    const p = this.profile;
    if (on) {
      const a = p.archive;
      $('ar-e').replaceChildren(...ENDINGS.map((e) => {
        const got = a.endings.includes(e.id);
        return pictured(h('li', got ? 'on' : '', '', h('b', '', got ? t(e.name) : '???'), h('span', 'kind', t(got ? 'reached' : 'ending')), h('p', '', t(got ? e.file : e.pitch))), 'ending', e.id, got);
      }));
      $('ar-s').replaceChildren(...FRAGMENTS_ALL.map((f) => {
        const got = a.records.includes(f.flag);
        return pictured(h('li', got ? 'on' : '', '', h('b', '', got ? t(f.name) : '???'), h('span', 'kind', t(got ? 'found' : 'missing')), h('p', '', t(got ? f.line : f.where))), 'file', f.flag, got);
      }));
      $('ar-o').replaceChildren(...OBSERVATIONS.map((o) => {
        const got = (a.sightings ?? []).includes(o.flag);
        return pictured(h('li', got ? 'on' : '', '', h('b', '', got ? t(o.name) : '???'), h('span', 'kind', t(got ? 'seen' : 'unseen')), h('p', '', got ? `${t(o.line)} ${t(o.theory)}` : t('Somewhere out there.'))), 'sighting', o.flag, got);
      }));
      $('ar-j').replaceChildren(...a.journeys.slice(0, 12).map((r) => h('li', r.end === 'through' ? '' : 'lost', '',
        h('b', '', t(r.ending ? ENDING_BY_ID[r.ending].name : r.end === 'through' ? 'Through' : r.end === 'captured' ? 'Taken' : 'Lost')),
        h('span', '', [plural(r.jumps, '{n} jump', '{n} jumps'), plural(r.days, '{n} day', '{n} days'), plural(r.wrecks, '{n} wreck', '{n} wrecks'), r.hardcore ? t('hardcore') : ''].filter(Boolean).join(' · ')))));
      $('ar-p').textContent = a.people.map((p) => t(p)).join(' · ');
      const list = $('logbook-l');
      list.replaceChildren(...UNLOCKS.map((u) => {
        const got = p.earned.includes(u.id);
        return h('li', got ? 'on' : '', '', h('b', '', got ? t(u.name) : '???'), h('span', 'kind', t(u.kind)), h('p', '', t(got ? u.text : u.hint)));
      }));
      $('logbook-s').textContent = [plural(a.journeys.length, '{n} journey', '{n} journeys'), t('{n} of {of} endings', { n: a.endings.length, of: ENDINGS.length }), t('{n} of {of} pieces of the Severance', { n: a.records.length, of: FRAGMENTS_ALL.length }), t('{n} of {of} sightings', { n: (a.sightings ?? []).length, of: OBSERVATIONS.length }), t('{n} of {of} unlocks', { n: p.earned.length, of: UNLOCKS.length }), t('none of it makes the ship stronger')].join(' · ');
    }
    $('logbook').hidden = !on;
  }
}

export { identity };
