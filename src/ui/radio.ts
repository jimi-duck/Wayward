import { arrive } from './arrive';
import { DESK } from '../sim/desk';
import type { Caller, Open } from '../sim/comms';
import type { GameEvent } from '../sim/events';
import { artOf, oddsWord } from './comms';
import { artImg, artUrl } from './art';
import { CALLOWAY_ID } from '../content/art';
import { icon } from './icons';
import { NEON_CSS } from './colors';
import { $, h } from './dom';
import { INK } from './palette';
import { jobLine } from './jobline';
import { callowayText } from './pressure';
import { t } from '../i18n';

/** What a job's call can say of its terms, read from the scene it opens: the pay (best case) and the seconds it allows. */
export interface JobTerms { reward: string[]; limit: number }

// ── the radio ─────────────────────────────────────────────────────────────
// The two light weights of transmission (sim/desk.ts), drawn over the flight
// instead of over a stopped world:
//
//   call  · a job, a trade, a warning or a plea. A small card with the caller,
//           what they say, and the answers as buttons with what each brings.
//           The app holds the world still while a call is up; the arrows mark an answer and Enter takes it, or Y answers
//           the first, N the last (U a middle one), a tap does too, and it waits for one. Routine
//           calls are cyan; an important one carries an amber PRIORITY stamp.
//   line  · radio chatter: one line of subtitle, no answer, a few seconds.
//
// It shows nothing while a panel has the screen, and never takes a key the
// flight uses.

const CALLER_CSS: Record<Caller, string> = {
  custody: NEON_CSS.custody, gutter: NEON_CSS.gutter, office: NEON_CSS.office,
  frontier: INK.teal, guild: INK.amber, kellern: INK.krail, miners: INK.white, calloway: INK.red, captain: INK.red, unknown: INK.white2,
};
const KIND_WORD: Record<string, string> = {
  trade: 'Trade', plea: 'Plea', job: 'Job offer', warning: 'Warning', distress: 'Distress call', rumour: 'Rumour',
};
/** The keys of a call's answers: the first, a middle one, the last. */
const KEY_OF = ['Y', 'U', 'N'];

const NS = 'http://www.w3.org/2000/svg';
/** A small padlock for an answer the ship cannot give yet. */
function lock(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'rd-lock');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS(NS, 'rect');
  for (const [k, v] of [['x', '3'], ['y', '7'], ['width', '10'], ['height', '7'], ['rx', '1']] as const) body.setAttribute(k, v);
  const shackle = document.createElementNS(NS, 'path');
  shackle.setAttribute('d', 'M5 7V5a3 3 0 0 1 6 0v2');
  svg.append(body, shackle);
  return svg;
}

export class Radio {
  private shown: Open | null = null;
  private opened = 0;
  private lineTimer = 0;
  private padHeld = false;
  /** The answer Enter takes: the first the ship can give, until the arrows move it. */
  private sel = 0;
  /** A job's lead answer, and what the terms strip already says of it (its costs), so its line does not repeat them. */
  private lead: string | null = null;
  private stated: string[] = [];

  constructor(
    private readonly answer: (id: string) => void,
    /** True while a panel, a pause or a launch card has the screen. */
    private readonly blocked: () => boolean,
    /** The terms of a job's call, where the scene has any. */
    private readonly terms: (o: Open) => JobTerms | null = () => null,
  ) {
    window.addEventListener('keydown', (e) => {
      if (!this.shown || e.metaKey || e.ctrlKey || e.altKey || this.blocked() || performance.now() - this.opened < 350) return;
      const n = this.shown.choices.length;
      // the arrows walk the answers it can give; Enter or Space takes the marked one
      const step = e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : e.code === 'ArrowUp' || e.code === 'ArrowLeft' ? -1 : 0;
      if (step) { e.preventDefault(); this.move(step); return; }
      if (e.repeat) return;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') { e.preventDefault(); this.pick(this.sel); return; }
      const i = e.code === 'KeyY' ? 0 : e.code === 'KeyN' ? n - 1 : e.code === 'KeyU' && n > 2 ? 1 : -1;
      if (i >= 0) this.pick(i);
    });
  }

  /** Mark the next (or previous) answer the ship can give. */
  private move(by: number): void {
    const cs = this.shown?.choices;
    if (!cs?.some((c) => c.ok)) return;
    let i = this.sel;
    do i = (i + by + cs.length) % cs.length; while (!cs[i]!.ok);
    this.sel = i;
    this.mark();
  }

  private mark(): void {
    [...$('rd-list').children].forEach((b, i) => b.classList.toggle('first', i === this.sel));
  }

  get open(): boolean {
    return this.shown !== null;
  }

  /** Draw or clear the call to match the world's, and run its clock. Every frame. */
  sync(call: Open | null, left: number): void {
    const root = $('radio');
    root.classList.toggle('under', this.blocked());
    if (call !== this.shown) {
      // a call that replaces one still on screen rings the antenna; a fresh one fills the signal bars
      const again = !!call && !!this.shown;
      this.shown = call;
      this.opened = performance.now();
      if (call) { this.draw(call); arrive($('rd-call'), again); }
      $('rd-call').hidden = !call;
      if (call) this.line(null);
    }
    // a job offer has the middle of the screen: the world's labels and the HUD under it step back until it goes
    document.documentElement.classList.toggle('job-open', !!call && call.def.kind === 'job' && !this.blocked());
    document.documentElement.classList.toggle('demand-open', !!call?.def.demand && !this.blocked());
    if (call) {
      const total = call.tier === 'important' ? DESK.window.important : DESK.window.routine;
      // only when it moves: a held call stands still, and a style write each frame costs a layout under the glass
      const w = `${Math.round(Math.max(0, Math.min(1, left / total)) * 1000) / 10}%`;
      const bar = $('rd-timer').firstElementChild as HTMLElement;
      if (bar.style.width !== w) bar.style.width = w;
      this.pad();
    }
  }

  /** The pad's right stick click answers the first choice: every other button flies the ship. */
  private pad(): void {
    const pad = typeof navigator.getGamepads === 'function' ? navigator.getGamepads().find((p) => p && p.connected) : null;
    const on = !!pad?.buttons[11]?.pressed;
    if (on && !this.padHeld && !this.blocked() && performance.now() - this.opened > 350) this.pick(this.sel);
    this.padHeld = on;
  }

  private pick(i: number): void {
    const c = this.shown?.choices[i];
    if (!c || !c.ok) return;
    this.answer(c.id);
  }

  /** The events: a radio line comes in, a call ends. */
  events(evs: readonly GameEvent[]): void {
    for (const e of evs) {
      if (e.type === 'ping') this.line(e);
      else if (e.type === 'callowayReads' || e.type === 'callowayClose' || e.type === 'callowayLost') this.herLine(callowayText(e));
    }
  }

  /** Calloway, as herself: her portrait and name, then what she has read of your route (sim/pressure.ts). Not at the Wanted bar. */
  private herLine(text: string): void {
    const box = $('rd-line');
    this.line({ type: 'ping', id: 'calloway_route', from: 'Calloway', caller: 'calloway', text, moment: 'calm', system: '' });
    box.classList.add('her');
    $('rdl-from').style.color = '';
    const face = artImg('captain', CALLOWAY_ID, 'rdl-face');
    if (face) box.prepend(face);
  }

  private line(e: Extract<GameEvent, { type: 'ping' }> | null): void {
    const box = $('rd-line');
    clearTimeout(this.lineTimer);
    box.classList.remove('her');
    box.querySelector('.rdl-face')?.remove();
    if (!e) { box.hidden = true; return; }
    $('rdl-from').textContent = t(e.from);
    $('rdl-from').style.color = CALLER_CSS[e.caller as Caller] ?? INK.white2;
    $('rdl-text').textContent = t(e.text);
    box.hidden = false;
    box.classList.remove('in');
    void box.offsetWidth;
    box.classList.add('in');
    this.lineTimer = window.setTimeout(() => { box.hidden = true; }, DESK.ping.show * 1000);
  }

  private draw(o: Open): void {
    const d = o.def, many = o.choices.length > 2;
    const card = $('rd-call');
    card.classList.toggle('prio', o.tier === 'important');
    card.style.setProperty('--cc', CALLER_CSS[d.caller]);
    const job = d.kind === 'job';
    card.classList.toggle('job', job);
    // a demand (the patrol's) is read as one: who asks, what they want, then the price of each answer
    const demand = !!d.demand;
    card.classList.toggle('demand', demand);
    $('rd-k').textContent = t(job ? 'Job offer' : demand ? 'Incoming transmission' : 'Incoming');
    // a job's header is one line: the card, then who is offering it
    $('rd-kind').textContent = job ? t(d.from) : t(KIND_WORD[d.kind] ?? d.kind);
    $('rd-prio').hidden = o.tier !== 'important';
    $('rd-prio').textContent = t(d.status ?? 'Priority');
    const [who, ...what] = t(d.from).split(' · ');
    // a job is read as a contract: its title, then who is offering it
    $('rd-who').textContent = job ? t(d.title) : who ?? '';
    $('rd-what').textContent = job ? '' : what.join(' · ');
    this.contract(o, job);
    $('rd-text').textContent = o.text;
    // a job in one of the road's threads: its chip, and the one line it adds
    const th = $('rd-thread');
    th.hidden = !o.thread;
    if (o.thread) { th.firstElementChild!.textContent = t(o.thread.chip); th.lastElementChild!.textContent = t(o.thread.line); }
    // the read: one line, and only for a call that can be a lie
    const read = $('rd-read');
    read.hidden = !d.truths?.length;
    read.textContent = d.truths?.length ? o.read.intent && t(o.read.intent) : '';
    // the terms of a plain offer: what the first answer means, in the card's own words
    const terms = $('rd-terms');
    const first = o.choices[0];
    terms.hidden = job || (many && !demand) || !first || !(first.hint || demand);
    terms.textContent = demand ? t(d.demand!, { amount: this.price(o) }) : first && !many ? t(first.hint) : '';
    $('rd-list').classList.toggle('many', many);
    this.sel = Math.max(0, o.choices.findIndex((x) => x.ok));
    const stated = job ? this.stated : [];
    $('rd-list').replaceChildren(...o.choices.map((c, i) => {
      const key = i === 0 ? KEY_OF[0]! : i === o.choices.length - 1 ? KEY_OF[2]! : KEY_OF[1]!;
      const gains = c.gains.filter((g) => g !== 'Job').map((g) => t(g)), odds = c.chance !== null ? [oddsWord(c.chance)] : [];
      let more: HTMLElement | null;
      if (demand) {
        // one line per answer: what it does, in teal or red, then what it costs, in amber
        const say = c.hint ? [h('span', c.tone === 'refuse' ? 'cq-bad' : 'cq-ok', t(c.hint))] : [];
        const line = c.ok ? [...say, ...c.cost.map((x) => h('span', 'cq-cost', x))] : c.needs.map((n) => h('span', 'g-need', '', lock(), document.createTextNode(t(n))));
        more = line.length ? h('span', 'rd-more', '', ...line.flatMap((e, k) => (k ? [document.createTextNode(' · '), e] : [e]))) : null;
      } else if (job) {
        // one quiet line: the hint, then what it brings and costs, joined by a dot; what the strip says of this answer, once
        const parts = c.ok ? jobLine([...(c.hint ? [t(c.hint)] : []), ...gains, ...c.cost, ...odds], c.id === this.lead ? stated : [])
          : jobLine(c.hint ? [t(c.hint)] : []);
        const needs = c.ok ? [] : c.needs.map((n) => h('span', 'g-need', '', lock(), document.createTextNode(t(n))));
        more = parts.length || needs.length ? h('span', 'rd-more', '', ...[...parts.map((x) => h('span', '', x)), ...needs].flatMap((e, k) => (k ? [document.createTextNode(' · '), e] : [e]))) : null;
      } else {
        const chips = c.ok
          ? [...gains.map((g) => h('span', /^−/.test(g) ? 'g-loss' : 'g-gain', g)), ...c.cost.map((x) => h('span', 'g-loss', x)), ...odds.map((x) => h('span', 'g-odds', x))]
          : c.needs.map((n) => h('span', 'g-need', '', lock(), document.createTextNode(t(n))));
        more = chips.length ? h('span', 'rd-chips', '', ...chips) : null;
      }
      const b = h('button', `rd-c${i === this.sel ? ' first' : ''}`, '', h('kbd', '', key), h('span', 'rd-l', t(c.label)), more) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('aria-disabled', String(!c.ok));
      b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (performance.now() - this.opened > 250) this.pick(i); };
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }

  /** What the first answer that pays asks, as the demand names it ("3 Cyrite"). */
  private price(o: Open): string {
    const c = o.choices.find((x) => x.cost.length);
    return c ? c.cost[0]!.replace(/^−/, '') : '';
  }

  /** A job's picture and its terms: what it asks, what it pays. Hidden for every other call. */
  private contract(o: Open, job: boolean): void {
    const art = $('rd-art'), sheet = $('rd-sheet'), card = $('rd-call');
    art.hidden = sheet.hidden = !job;
    this.stated = []; this.lead = null;
    card.classList.remove('noart', 'emblem-only', 'bleed');
    if (!job) { art.replaceChildren(); sheet.replaceChildren(); return; }
    const a = artOf(o.def), [slot, id] = a.portrait ?? [null, ''];
    // the job's own picture first (one per card), then the caller's portrait or hull
    const own = artImg('job', o.def.id, 'rd-pic');
    const pic = own || (slot && artImg(slot, id, 'rd-pic')) || (a.ship ? artImg('ship', a.ship, 'rd-pic rd-hull') : null);
    // the job's own picture runs the full height of the card, to its edge; a borrowed portrait or hull stays a framed picture
    card.classList.toggle('bleed', !!own);
    const emblem = a.emblem ? artUrl('emblem', a.emblem) : null;
    art.classList.toggle('emblem', !pic && !!emblem);
    if (emblem) art.style.setProperty('--emblem', `url("${emblem}")`); else art.style.removeProperty('--emblem');
    // no picture and no emblem: the words take the whole width rather than leave an empty slab
    art.replaceChildren(...(pic ? [pic] : emblem ? [] : [icon('i-job')]));
    art.hidden = !pic && !emblem;
    card.classList.toggle('noart', art.hidden);
    card.classList.toggle('emblem-only', !pic && !!emblem);
    const terms = this.terms(o), lead = o.choices.find((c) => c.ok);
    const costs = lead?.cost ?? [];
    this.lead = lead?.id ?? null;
    this.stated = costs;
    const asks = [...costs, ...(terms?.limit ? [t('{n} s', { n: terms.limit })] : [])];
    const pays = terms?.reward ?? [];
    const col = (k: string, items: string[], cls: string, none: string) => h('div', 'rd-col', '', h('span', 'k', k), h('div', 'rd-items', '', ...(items.length ? items.map((x) => h('span', cls, x)) : [h('span', 'g-none', none)])));
    sheet.replaceChildren(col(t(costs.length ? 'Requires' : 'Time limit'), asks, 'g-loss', t('Nothing')), col(t('Reward'), pays, 'g-gain', t('Not fixed')));
  }
}
