import { DESK } from '../sim/desk';
import type { Caller, Open } from '../sim/comms';
import type { GameEvent } from '../sim/events';
import { artOf, oddsWord } from './comms';
import { artImg, artUrl } from './art';
import { icon } from './icons';
import { NEON_CSS } from './colors';
import { $, h } from './dom';
import { INK } from './palette';
import { t } from '../i18n';

/** What a job's call can say of its terms, read from the scene it opens: the pay (best case) and the seconds it allows. */
export interface JobTerms { reward: string[]; limit: number }

// ── the radio ─────────────────────────────────────────────────────────────
// The two light weights of transmission (sim/desk.ts), drawn over the flight
// instead of over a stopped world:
//
//   call  · a job, a trade, a warning or a plea. A small card with the caller,
//           what they say, and the answers as buttons with what each brings.
//           The app holds the world still while a call is up; Y answers the first, N the last (U a
//           middle one), a tap does too, and it waits for one. Routine
//           calls are cyan; an important one carries an amber PRIORITY stamp.
//   line  · radio chatter: one line of subtitle, no answer, a few seconds.
//
// It shows nothing while a panel has the screen, and never takes a key the
// flight uses.

const CALLER_CSS: Record<Caller, string> = {
  custody: NEON_CSS.custody, gutter: NEON_CSS.gutter, office: NEON_CSS.office,
  frontier: INK.teal, guild: INK.amber, kellern: '#d9c27a', miners: INK.white, calloway: INK.red, captain: INK.red, unknown: INK.white2,
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

  constructor(
    private readonly answer: (id: string) => void,
    /** True while a panel, a pause or a launch card has the screen. */
    private readonly blocked: () => boolean,
    /** The terms of a job's call, where the scene has any. */
    private readonly terms: (o: Open) => JobTerms | null = () => null,
  ) {
    window.addEventListener('keydown', (e) => {
      if (!this.shown || e.repeat || e.metaKey || e.ctrlKey || e.altKey || this.blocked() || performance.now() - this.opened < 350) return;
      const n = this.shown.choices.length;
      const i = e.code === 'KeyY' ? 0 : e.code === 'KeyN' ? n - 1 : e.code === 'KeyU' && n > 2 ? 1 : -1;
      if (i >= 0) this.pick(i);
    });
  }

  get open(): boolean {
    return this.shown !== null;
  }

  /** Draw or clear the call to match the world's, and run its clock. Every frame. */
  sync(call: Open | null, left: number): void {
    const root = $('radio');
    root.classList.toggle('under', this.blocked());
    if (call !== this.shown) {
      this.shown = call;
      this.opened = performance.now();
      if (call) this.draw(call);
      $('rd-call').hidden = !call;
      if (call) this.line(null);
    }
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
    if (on && !this.padHeld && !this.blocked() && performance.now() - this.opened > 350) this.pick(0);
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
    }
  }

  private line(e: Extract<GameEvent, { type: 'ping' }> | null): void {
    const box = $('rd-line');
    clearTimeout(this.lineTimer);
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
    $('rd-k').textContent = t(job ? 'Job offer' : 'Incoming');
    // a job's header is one line: the card, then who is offering it
    $('rd-kind').textContent = job ? t(d.from) : t(KIND_WORD[d.kind] ?? d.kind);
    $('rd-prio').hidden = o.tier !== 'important';
    const [who, ...what] = t(d.from).split(' · ');
    // a job is read as a contract: its title, then who is offering it
    $('rd-who').textContent = job ? t(d.title) : who ?? '';
    $('rd-what').textContent = job ? '' : what.join(' · ');
    this.contract(o, job);
    $('rd-text').textContent = o.text;
    // the read: one line, and only for a call that can be a lie
    const read = $('rd-read');
    read.hidden = !d.truths?.length;
    read.textContent = d.truths?.length ? o.read.intent && t(o.read.intent) : '';
    // the terms of a plain offer: what the first answer means, in the card's own words
    const terms = $('rd-terms');
    const first = o.choices[0];
    terms.hidden = job || many || !first || !first.hint;
    terms.textContent = first && !many ? t(first.hint) : '';
    $('rd-list').classList.toggle('many', many);
    $('rd-list').replaceChildren(...o.choices.map((c, i) => {
      const key = i === 0 ? KEY_OF[0]! : i === o.choices.length - 1 ? KEY_OF[2]! : KEY_OF[1]!;
      const chips = c.ok
        ? [...c.gains.filter((g) => g !== 'Job').map((g) => h('span', /^−/.test(g) ? 'g-loss' : 'g-gain', t(g))), ...c.cost.map((x) => h('span', 'g-loss', x)), ...(c.chance !== null ? [h('span', 'g-odds', oddsWord(c.chance))] : [])]
        : c.needs.map((n) => h('span', 'g-need', '', lock(), document.createTextNode(t(n))));
      const b = h('button', `rd-c${i === o.choices.findIndex((x) => x.ok) ? ' first' : ''}`, '', h('kbd', '', key), h('span', 'rd-l', t(c.label)), job && c.hint ? h('span', 'rd-hint', t(c.hint)) : null, chips.length ? h('span', 'rd-chips', '', ...chips) : null) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('aria-disabled', String(!c.ok));
      b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (performance.now() - this.opened > 250) this.pick(i); };
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }

  /** A job's picture and its terms: what it asks, what it pays. Hidden for every other call. */
  private contract(o: Open, job: boolean): void {
    const art = $('rd-art'), sheet = $('rd-sheet');
    art.hidden = sheet.hidden = !job;
    if (!job) { art.replaceChildren(); sheet.replaceChildren(); return; }
    const a = artOf(o.def), [slot, id] = a.portrait ?? [null, ''];
    // the job's own picture first (one per card), then the caller's portrait or hull
    const pic = artImg('job', o.def.id, 'rd-pic') || (slot && artImg(slot, id, 'rd-pic')) || (a.ship ? artImg('ship', a.ship, 'rd-pic rd-hull') : null);
    const emblem = a.emblem ? artUrl('emblem', a.emblem) : null;
    art.classList.toggle('emblem', !pic && !!emblem);
    if (emblem) art.style.setProperty('--emblem', `url("${emblem}")`); else art.style.removeProperty('--emblem');
    art.replaceChildren(...(pic ? [pic] : emblem ? [] : [icon('i-job')]));
    const terms = this.terms(o), lead = o.choices.find((c) => c.ok);
    const costs = lead?.cost ?? [];
    const asks = [...costs, ...(terms?.limit ? [t('{n}s', { n: terms.limit })] : [])];
    const pays = terms?.reward ?? [];
    const col = (k: string, items: string[], cls: string, none: string) => h('div', 'rd-col', '', h('span', 'k', k), h('div', 'rd-items', '', ...(items.length ? items.map((x) => h('span', cls, x)) : [h('span', 'g-none', none)])));
    sheet.replaceChildren(col(t(costs.length ? 'Requires' : 'Time'), asks, 'g-loss', t('Nothing')), col(t('Reward'), pays, 'g-gain', t('Not fixed')));
  }
}
