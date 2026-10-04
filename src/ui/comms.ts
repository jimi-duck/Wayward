import type { Contact } from '../sim/bosses';
import type { Caller, Open } from '../sim/comms';
import { NEON_CSS } from './colors';
import { faceSvg } from './face';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { INK } from './palette';

// ── the comms panel ───────────────────────────────────────────────────────
// Grown out of the hail panel: every channel opened to the ship, drawn the
// same way. A header (who, what kind of call), what they say, the read
// (their strength against yours, who is out there, their cargo, an intent
// estimate as good as the sensors), and the choices as a list: each with
// what it costs, a word for its odds, and, greyed out, what it still needs.
// An ambush shows a draining bar: the world is slowed, not stopped.
//
// It draws a view, not the sim's types, so the arcade's capital-ship hail
// (engage or evade) comes through the same panel. Keys 1–6 answer, the
// arrows and Enter choose, a pad's stick and A, a tap. Like every panel it
// ignores input for its first moments and never answers a held key.

export interface CommsChoice {
  label: string;
  hint: string;
  /** What follows, for the hail's bounty and salvage lines. */
  lines: string[];
  /** Costs, then a word for the odds. */
  tags: string[];
  ok: boolean;
  needs: string[];
}

export interface CommsView {
  kick: string;
  title: string;
  sub: string;
  colour: string;
  /** Red panel: someone means harm. */
  alert: boolean;
  text: string;
  read: { them: number; you: number; rows: Array<[string, string]> } | null;
  choices: CommsChoice[];
  /** A named captain's portrait, as SVG (null: nobody to show). */
  face: string | null;
}

const CALLER_CSS: Record<Caller, string> = {
  custody: NEON_CSS.custody, gutter: NEON_CSS.gutter, office: NEON_CSS.office,
  frontier: INK.teal, guild: INK.amber, kellern: '#d9c27a', miners: INK.white, calloway: INK.red, captain: INK.red, unknown: INK.white2,
};
const KIND_WORD: Record<string, string> = {
  captain: 'Named captain', trade: 'Trade', plea: 'Plea', job: 'Job offer', warning: 'Warning', shakedown: 'Shakedown', checkpoint: 'Checkpoint', distress: 'Distress call', rumour: 'Rumour',
};
const HOSTILE = new Set(['shakedown', 'checkpoint', 'captain']);

/** A word for a chance, never a number: a gamble should feel like one. */
export function oddsWord(p: number): string {
  return p >= 0.8 ? 'Likely' : p >= 0.6 ? 'Good odds' : p >= 0.4 ? 'Even odds' : p >= 0.2 ? 'Long shot' : 'Hopeless';
}

/** A card on the table, as the panel draws it. */
export function cardView(o: Open): CommsView {
  const d = o.def, r = o.read;
  return {
    kick: o.slow > 0 ? 'Ambush · act now' : KIND_WORD[d.kind] ?? d.kind,
    title: d.title,
    sub: d.from,
    colour: CALLER_CSS[d.caller],
    alert: HOSTILE.has(d.kind) || o.slow > 0,
    text: o.text,
    read: {
      them: r.them, you: r.you,
      rows: [['Contacts', r.ships], ['Cargo', r.cargo], ['Intent', r.intent], ['Sensors', `${Math.round(r.sure * 100)}% reliable`]],
    },
    choices: o.choices.map((c) => ({
      label: c.label, hint: c.hint, lines: [], ok: c.ok, needs: c.needs,
      tags: [...c.cost, ...(c.odds !== null ? [oddsWord(c.odds)] : c.risky ? ['Trust the read'] : [])],
    })),
    face: d.face ? faceSvg(d.face, CALLER_CSS[d.caller], d.scars ?? 0) : null,
  };
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

/** The arcade's capital-ship hail: engage or evade. */
export function hailView(c: Contact): CommsView {
  const evade: CommsChoice = c.canEvade
    ? { label: 'Evade', hint: 'You get clear, but you cannot break away twice running.', lines: ['No bounty · no salvage', `Next contact in ${c.evadeGap}s`], tags: [], ok: true, needs: [] }
    : { label: 'Evade', hint: 'Break away.', lines: [], tags: [], ok: false, needs: [c.faction === 'voice' ? 'There is no outrunning a foundry' : 'Not available: you broke away from the last one'] };
  return {
    kick: 'Alarm', title: c.name, sub: `${c.faction} capital ship · on intercept course`, colour: NEON_CSS[c.faction], alert: true,
    text: 'She will fight back, and her escort wing comes in with her. The sector clears for the duel.',
    read: null,
    face: null,
    choices: [
      { label: 'Engage', hint: 'Stand and fight.', lines: [`+${fmt(c.bounty)} score`, 'Salvage · a refit · her tech', 'Hull repair · krail · a power-up'], tags: [], ok: true, needs: [] },
      evade,
    ],
  };
}

export class CommsPanel {
  private off: (() => void) | null = null;
  private opened = 0;
  private sel = 0;
  private view: CommsView | null = null;
  private onAnswer: ((i: number) => void) | null = null;

  get open(): boolean {
    return !$('comms').hidden;
  }

  show(view: CommsView, onAnswer: (i: number) => void): void {
    this.close();
    this.view = view;
    this.onAnswer = onAnswer;
    this.opened = performance.now();
    this.sel = Math.max(0, view.choices.findIndex((c) => c.ok));
    $('comms').classList.toggle('alert', view.alert);
    $('cm-k').textContent = view.kick;
    const t = $('cm-t');
    t.textContent = view.title;
    $('cm-s').textContent = view.sub;
    $('cm-s').style.color = view.colour;
    $('cm-text').textContent = view.text;
    $('cm-face').hidden = !view.face;
    $('cm-face').innerHTML = view.face ?? '';
    $('cm-body').classList.toggle('face', !!view.face);
    $('cm-sigil').style.setProperty('--cc', view.colour);
    this.drawRead(view);
    this.timer(0);
    this.render();
    $('comms').hidden = false;
    this.off = keys((e) => {
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
      const np = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6'].indexOf(e.code);
      if (n >= 0 || np >= 0) return this.pick(Math.max(n, np)), true;
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') return this.move(-1), true;
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') return this.move(1), true;
      if (e.code === 'Enter' || e.code === 'NumpadEnter') return this.pick(this.sel), true;
      // the arcade hail's old keys: F engages, E evades
      if (!view.read && e.code === 'KeyF') return this.pick(0), true;
      if (!view.read && e.code === 'KeyE') return this.pick(1), true;
      return e.code === 'Space' || e.code === 'Tab';
    }, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  }

  /** The ambush's bar: the share of its time left (0 hides it). */
  timer(left: number): void {
    const bar = $('cm-timer');
    bar.hidden = left <= 0;
    if (left > 0) (bar.firstElementChild as HTMLElement).style.width = `${Math.min(1, left) * 100}%`;
  }

  close(): void {
    this.off?.();
    this.off = null;
    this.view = null;
    this.onAnswer = null;
    $('comms').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (!this.view || performance.now() - this.opened < GUARD) return;
    if (p.up || p.left) this.move(-1);
    else if (p.down || p.right) this.move(1);
    else if (p.a) this.pick(this.sel);
    else if (p.b && !this.view.read) this.pick(1);
  }

  private move(d: number): void {
    const n = this.view?.choices.length ?? 0;
    if (!n) return;
    this.sel = (this.sel + d + n) % n;
    this.render();
  }

  private pick(i: number): void {
    const v = this.view, c = v?.choices[i];
    if (!c) return;
    this.sel = i;
    if (!c.ok) { this.render(); return; }
    const cb = this.onAnswer;
    this.close();
    cb?.(i);
  }

  private drawRead(v: CommsView): void {
    const box = $('cm-read');
    box.hidden = !v.read;
    if (!v.read) { box.replaceChildren(); return; }
    const r = v.read, top = Math.max(r.them, r.you, 1);
    const bar = (label: string, n: number, cls: string) => {
      const b = h('div', `cm-bar ${cls}`, '', h('span', 'k', label), h('i'), h('b', '', n ? n.toFixed(0) : '—'));
      (b.children[1] as HTMLElement).style.setProperty('--w', `${(n / top) * 100}%`);
      return b;
    };
    box.replaceChildren(
      h('div', 'cm-str', '', bar('Them', r.them, 'them'), bar('You', r.you, 'you')),
      ...r.rows.map(([k, val]) => h('div', `cm-row${k === 'Intent' ? ' intent' : ''}`, '', h('span', 'k', k), h('span', 'v', val))),
    );
  }

  private render(): void {
    const v = this.view;
    if (!v) return;
    $('cm-list').replaceChildren(...v.choices.map((c, i) => {
      const side = c.ok ? c.tags.map((t) => h('span', /^−/.test(t) ? 'cost' : 'odds', t)) : c.needs.map((n) => h('span', 'need', n));
      const b = h('button', `cm-c${i === this.sel ? ' sel' : ''}`, '',
        h('kbd', '', String(i + 1)),
        h('span', 'cm-main', '', h('span', 'cm-l', c.label), h('span', 'cm-h', c.hint), c.lines.length ? h('span', 'cm-lines', c.lines.join(' · ')) : null),
        h('span', 'cm-side', '', ...side),
      ) as HTMLButtonElement;
      b.type = 'button';
      b.setAttribute('aria-disabled', String(!c.ok));
      b.onclick = guarded(this.opened, () => this.pick(i));
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
  }
}
