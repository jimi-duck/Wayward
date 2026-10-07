import { DESK } from '../sim/desk';
import type { Caller, Open } from '../sim/comms';
import type { GameEvent } from '../sim/events';
import { oddsWord } from './comms';
import { NEON_CSS } from './colors';
import { $, h } from './dom';
import { INK } from './palette';
import { t } from '../i18n';

// ── the radio ─────────────────────────────────────────────────────────────
// The two light weights of transmission (sim/desk.ts), drawn over the flight
// instead of over a stopped world:
//
//   call  · a job, a trade, a warning or a plea. A small card with the caller,
//           what they say, and the answers as buttons with what each brings.
//           The ship keeps flying; Y answers the first, N the last (U a
//           middle one), a tap does too, and left alone it lapses. Routine
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

export class Radio {
  private shown: Open | null = null;
  private opened = 0;
  private lineTimer = 0;
  private padHeld = false;

  constructor(
    private readonly answer: (id: string) => void,
    /** True while a panel, a pause or a launch card has the screen. */
    private readonly blocked: () => boolean,
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
      (($('rd-timer').firstElementChild) as HTMLElement).style.width = `${Math.max(0, Math.min(1, left / total)) * 100}%`;
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
    $('rd-kind').textContent = t(KIND_WORD[d.kind] ?? d.kind);
    $('rd-prio').hidden = o.tier !== 'important';
    const [who, ...what] = t(d.from).split(' · ');
    $('rd-who').textContent = who ?? '';
    $('rd-what').textContent = what.join(' · ');
    $('rd-text').textContent = o.text;
    // the read: one line, and only for a call that can be a lie
    const read = $('rd-read');
    read.hidden = !d.truths?.length;
    read.textContent = d.truths?.length ? o.read.intent && t(o.read.intent) : '';
    // the terms of a plain offer: what the first answer means, in the card's own words
    const terms = $('rd-terms');
    const first = o.choices[0];
    terms.hidden = many || !first || !first.hint;
    terms.textContent = first && !many ? t(first.hint) : '';
    $('rd-list').classList.toggle('many', many);
    $('rd-list').replaceChildren(...o.choices.map((c, i) => {
      const key = i === 0 ? KEY_OF[0]! : i === o.choices.length - 1 ? KEY_OF[2]! : KEY_OF[1]!;
      const chips = c.ok
        ? [...c.gains.filter((g) => g !== 'Job').map((g) => h('span', /^−/.test(g) ? 'g-loss' : 'g-gain', t(g))), ...c.cost.map((x) => h('span', 'g-loss', x)), ...(c.chance !== null ? [h('span', 'g-odds', oddsWord(c.chance))] : [])]
        : c.needs.map((n) => h('span', 'g-need', t(n)));
      const b = h('button', `rd-c${i === o.choices.findIndex((x) => x.ok) ? ' first' : ''}`, '', h('kbd', '', key), h('span', 'rd-l', t(c.label)), chips.length ? h('span', 'rd-chips', '', ...chips) : null) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('aria-disabled', String(!c.ok));
      b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (performance.now() - this.opened > 350) this.pick(i); };
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }
}
