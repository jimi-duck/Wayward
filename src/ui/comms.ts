import type { Contact } from '../sim/bosses';
import type { Caller, Open } from '../sim/comms';
import type { LedgerRow } from '../sim/contract';
import { NEON_CSS } from './colors';
import { artImg, artUrl } from './art';
import { CALLOWAY_ID, CONTACTS } from '../content/art';
import { faceSvg } from './face';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { INK } from './palette';
import { num, t } from '../i18n';
import { FACTION_NAME } from './hud';

// ── the comms panel ───────────────────────────────────────────────────────
// Grown out of the hail panel: every channel opened to the ship, drawn the
// same way, as a transmission received rather than a dialogue box. A header
// (incoming transmission; the caller's sigil, name and the kind of call,
// stamped red when they mean harm), what they say, kept short; the read
// (their strength against yours, who is out there, their cargo, an intent
// estimate), and the choices as a list: each with chips for what it brings,
// what it costs, a word for its odds (the read's hidden truth folded in),
// and, greyed out, what it still needs. The choices are numbered 01 on, the
// highlighted one on an amber bar. The sentence under a choice shows on the
// highlighted row only: the chips are enough to play by.
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
  /** What it brings if it comes off, in a few words each. */
  gains: string[];
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
  /** One line, for a glance: what is happening. */
  gist: string;
  /** Contract rows under the text (label, amount or word, tone), or none. */
  ledger: Array<{ k: string; v: string; tone: string }>;
  /** The ledger's attachment title (it starts closed), or '' when the rows just show. */
  attach: string;
  /** Juno's line, or ''. */
  juno: string;
  /** A second voice on the same channel (Sam cutting in), under the ledger. */
  reply: { from: string; text: string; portrait: string | null } | null;
  text: string;
  /** What the ship's state adds to the call: behind the (i), not on the panel. */
  more: string;
  read: { them: number; you: number; bars: boolean; rows: Array<[string, string]> } | null;
  choices: CommsChoice[];
  /** A named captain's portrait, as SVG (null: nobody to show). */
  face: string | null;
  /** Pictures from src/art, by name; each is used only if the build has the file (ui/art.ts). */
  art: ArtRef;
}

/** Which pictures a call could show: a portrait, the caller's emblem, the first hull on the read. */
export interface ArtRef { portrait: ['captain' | 'contact', string] | null; emblem: string | null; ship: string | null; /** The hull drawn for this caller (`lancer-calloway`), tried before `ship`. */ owned?: string | null; scarred?: boolean }
const NO_ART: ArtRef = { portrait: null, emblem: null, ship: null };

/** The pictures a card could show, worked out from the card alone. */
export function artOf(d: Open['def']): ArtRef {
  const person = d.id.startsWith('captain:') ? d.id.slice(8) : d.caller === 'calloway' ? CALLOWAY_ID : null;
  const contact = d.id in CONTACTS ? CONTACTS[d.id] ?? d.id : null;
  const emblem = d.caller === 'calloway' ? 'office' : d.caller !== 'unknown' && d.caller !== 'captain' ? d.caller
    : /^The Voice/.test(d.from) ? 'voice' : /^The Thren/.test(d.from) ? 'thren' : null;
  return { portrait: person ? ['captain', person] : contact ? ['contact', contact] : null, emblem, ship: d.ships?.[0]?.variant ?? null, owned: d.ships?.[0] ? `${d.ships[0].variant}-${d.caller}` : null, scarred: (d.scars ?? 0) > 0 };
}

const CALLER_CSS: Record<Caller, string> = {
  custody: NEON_CSS.custody, gutter: NEON_CSS.gutter, office: NEON_CSS.office,
  frontier: INK.teal, guild: INK.amber, kellern: '#d9c27a', miners: INK.white, calloway: INK.red, captain: INK.red, unknown: INK.white2,
};
const KIND_WORD: Record<string, string> = {
  captain: 'Named captain', trade: 'Trade', plea: 'Plea', job: 'Job offer', warning: 'Warning', shakedown: 'Shakedown', checkpoint: 'Checkpoint', distress: 'Distress call', rumour: 'Rumour', offer: 'Offer',
};
const HOSTILE = new Set(['shakedown', 'checkpoint', 'captain']);

/** A word for a chance, never a number: a gamble should feel like one. */
export function oddsWord(p: number): string {
  return t(p >= 0.8 ? 'Likely to succeed' : p >= 0.6 ? 'Good chance' : p >= 0.4 ? 'Even chance' : p >= 0.2 ? 'Low chance' : 'Very unlikely');
}

/** The first sentence of a call, trimmed to ten words: the glance line for a card that has no gist of its own. */
export function gistOf(d: Pick<Open['def'], 'gist' | 'title'>, text: string): string {
  if (d.gist) return t(d.gist);
  const first = text.replace(/[“”"]/g, '').split(/(?<=[.!?])\s/)[0] ?? '';
  const words = first.trim().split(/\s+/);
  return words.length > 10 ? `${words.slice(0, 10).join(' ').replace(/[,;:]$/, '')}…` : first.trim() || t(d.title);
}

/** A ledger row's figure: cargo in Cyrite, credit as credit (the two are never one number), or a word. */
function ledgerValue(r: LedgerRow): string {
  const amount = r.n ?? r.cr;
  if (amount === undefined) return t(r.v ?? '');
  const sign = amount < 0 ? '−' : r.cr !== undefined && r.tone !== 'mine' && r.tone !== 'bad' && r.tone !== 'warn' && amount > 0 ? '+' : '';
  return sign + t(r.n !== undefined ? '{n} Cyrite' : '{n} credit', { n: Math.abs(amount) });
}

/** A card on the table, as the panel draws it. */
export function cardView(o: Open): CommsView {
  const d = o.def, r = o.read;
  return {
    kick: t(o.slow > 0 ? 'Ambush · act now' : KIND_WORD[d.kind] ?? d.kind),
    title: t(d.title),
    sub: t(d.from),
    colour: CALLER_CSS[d.caller],
    alert: HOSTILE.has(d.kind) || o.slow > 0,
    gist: gistOf(d, o.text),
    ledger: (o.ledger ?? []).map((r) => ({ k: t(r.k), v: ledgerValue(r), tone: r.tone ?? '' })),
    attach: d.attach ? t(d.attach) : '',
    juno: d.juno ? t(d.juno) : '',
    reply: d.reply ? { from: t(d.reply.from), text: t(d.reply.text), portrait: d.reply.portrait ?? null } : null,
    text: o.text,
    more: o.more.join(' '),
    // the read: strength as two bars, and the one line that matters (the
    // choices' odds already carry how far it can be trusted)
    // only when there is something to read: hulls to weigh up, or a story that could be a lie
    read: d.ships?.length || d.truths?.length ? { them: r.them, you: r.you, bars: !!d.ships?.length, rows: d.truths?.length ? [[t('Intent'), t(r.intent)]] : [] } : null,
    choices: o.choices.map((c) => ({
      label: t(c.label), hint: t(c.hint), lines: [], ok: c.ok, needs: c.needs.map((n) => t(n)), gains: c.gains,
      tags: [...c.cost, ...(c.chance !== null ? [oddsWord(c.chance)] : [])],
    })),
    face: d.face ? faceSvg(d.face, CALLER_CSS[d.caller], d.scars ?? 0) : null,
    art: artOf(d),
  };
}

const fmt = num;

/** The arcade's capital-ship hail: engage or evade. */
export function hailView(c: Contact): CommsView {
  const evade: CommsChoice = c.canEvade
    ? { label: t('Evade'), hint: t('You escape this time, but not every time.'), lines: [], gains: ['No bounty available', t('Next in {n}s', { n: c.evadeGap })], tags: [], ok: true, needs: [] }
    : { label: t('Evade'), hint: t('Break away.'), lines: [], gains: [], tags: [], ok: false, needs: [t(c.faction === 'voice' ? 'You can’t outrun a foundry' : 'Not now: you dodged the last one')] };
  return {
    kick: t('Alarm'), title: t(c.name), sub: `${t('{f} capital ship', { f: t(FACTION_NAME[c.faction] ?? c.faction) })} · ${t('on intercept')}`, colour: NEON_CSS[c.faction], alert: true,
    gist: t('A capital ship is on intercept'),
    ledger: [],
    attach: '',
    juno: '',
    reply: null,
    text: t('She fights back with her escort · the area clears for the duel.'),
    more: '',
    read: null,
    face: null,
    art: { ...NO_ART, emblem: c.faction },
    choices: [
      { label: t('Engage'), hint: t('Fight her. Her wreck can yield an upgrade, tech, hull repairs, Cyrite and a power-up.'), lines: [], gains: ['Fight', t('+{n} score', { n: fmt(c.bounty) }), 'Refit'], tags: [], ok: true, needs: [] },
      evade,
    ],
  };
}

const THREAT = /^(Fight|Hostiles|Run the blockade|Calloway fights|Calloway chases|Calloway closer|Net spreads|Wanted ↑)$/;
/** A chip's colour: red for trouble, amber for what it takes (like a cost), teal for what you get. */
const gainClass = (g: string) => (THREAT.test(g) ? 'g-threat' : /^−/.test(g) ? 'g-loss' : 'g-gain');

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
    $('cm-t').textContent = view.title;
    // the caller: who, then what they are, from the line under the title
    const [who, ...what] = view.sub.split(' · ');
    $('cm-who').textContent = who ?? '';
    $('cm-who').style.color = view.colour;
    $('cm-s').textContent = what.join(' · ');
    $('cm-gist').textContent = view.gist;
    $('cm-gist').style.setProperty('--cc', view.colour);
    $('cm-text').textContent = view.text;
    $('cm-ledger').replaceChildren(...view.ledger.map((r) => h('li', r.tone, '', h('span', '', r.k), h('b', '', r.v))));
    $('cm-juno').textContent = view.juno;
    $('cm-juno').hidden = !view.juno;
    // an attachment starts closed: a bar with its title, and Open / Close
    const att = $('cm-att');
    att.hidden = !view.attach || !view.ledger.length;
    const setAtt = (on: boolean) => {
      $('cm-ledger').hidden = !view.ledger.length || (!!view.attach && !on);
      att.setAttribute('aria-expanded', String(on));
      att.replaceChildren(h('span', '', `${t('Attached')} · ${view.attach}`), h('b', '', t(on ? 'Close' : 'Open')));
    };
    setAtt(false);
    att.onclick = () => setAtt(att.getAttribute('aria-expanded') !== 'true');
    att.onpointerdown = (e) => e.stopPropagation();
    $('cm-reply').hidden = !view.reply;
    // on a short screen the second voice moves beside the answers (the card's left column is full): the same words
    $('cm-reply-s').hidden = !view.reply;
    if (view.reply) {
      $('cm-reply-s-who').textContent = view.reply.from;
      $('cm-reply-s-text').textContent = view.reply.text;
      $('cm-reply-who').textContent = view.reply.from;
      $('cm-reply-text').textContent = view.reply.text;
      // the voice's portrait, where the build has one
      const pic = view.reply.portrait ? artImg('contact', view.reply.portrait, 'cm-reply-pic') : null;
      $('cm-reply').classList.toggle('pic', !!pic);
      $('cm-reply-face').replaceChildren(...(pic ? [pic] : []));
    }
    $('comms').classList.toggle('replied', !!view.reply);
    $('comms').classList.toggle('ledgered', view.ledger.length > 0);
    // what the ship's state adds sits one tap behind the (i)
    this.info(false);
    $('cm-i').hidden = !view.more;
    $('cm-i').onclick = () => this.info();
    $('cm-i').onpointerdown = (e) => e.stopPropagation();
    $('cm-more').textContent = view.more;
    // a painted portrait where the build has one; else the drawn face; else the caller's emblem; else the plain sigil
    const [pslot, pid] = view.art.portrait ?? [null, ''];
    // a captain you have scarred may have a second portrait, `<id>-scarred`
    const portrait = pslot ? (view.art.scarred && artImg(pslot, `${pid}-scarred`, 'cm-pic')) || artImg(pslot, pid, 'cm-pic') : null;
    $('cm-face').hidden = !view.face && !portrait;
    $('cm-face').classList.toggle('art', !!portrait);
    if (portrait) $('cm-face').replaceChildren(portrait);
    else $('cm-face').innerHTML = view.face ?? '';
    $('cm-sigil').hidden = !$('cm-face').hidden;
    $('cm-sigil').style.setProperty('--cc', view.colour);
    const emblem = view.art.emblem ? artUrl('emblem', view.art.emblem) : null;
    $('cm-sigil').classList.toggle('emblem', !!emblem);
    if (emblem) $('cm-sigil').style.setProperty('--emblem', `url("${emblem}")`);
    else $('cm-sigil').style.removeProperty('--emblem');
    this.drawRead(view);
    $('cm-body').classList.toggle('solo', !view.read);
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
      if (e.code === 'KeyI' && view.more) return this.info(), true;
      if (!view.read && e.code === 'KeyF') return this.pick(0), true;
      if (!view.read && e.code === 'KeyE') return this.pick(1), true;
      return e.code === 'Space' || e.code === 'Tab';
    }, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  }

  /** Show or hide the lines behind the (i). */
  private info(on?: boolean): void {
    on ??= $('cm-more').hidden === true;
    $('cm-more').hidden = !on;
    $('cm-i').setAttribute('aria-expanded', String(on));
    $('cm-i').classList.toggle('on', on);
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
    const hull = (v.art.owned && artImg('fleet', v.art.owned, 'cm-hull')) || (v.art.ship ? artImg('ship', v.art.ship, 'cm-hull') : null);
    box.replaceChildren(
      ...(hull ? [hull] : []),
      ...(r.bars ? [h('div', 'cm-str', '', bar(t('Them'), r.them, 'them'), bar(t('You'), r.you, 'you'))] : []),
      ...r.rows.map(([k, val], i) => h('div', `cm-row${i === 0 ? ' intent' : ''}`, '', h('span', 'k', k), h('span', 'v', val))),
    );
  }

  private render(): void {
    const v = this.view;
    if (!v) return;
    $('cm-list').replaceChildren(...v.choices.map((c, i) => {
      const side = c.ok ? c.tags.map((t) => h('span', /^−/.test(t) ? 'cost' : 'odds', t)) : c.needs.map((n) => h('span', 'need', n));
      // what it brings, as chips beside the label; the sentence only on the highlighted row
      const gains = c.gains.length ? h('span', 'cm-gains', '', ...c.gains.map((g) => h('span', gainClass(g), t(g)))) : null;
      const sel = i === this.sel;
      const b = h('button', `cm-c${sel ? ' sel' : ''}`, '',
        h('kbd', '', String(i + 1).padStart(2, '0')),
        h('span', 'cm-main', '', h('span', 'cm-l', '', h('span', '', c.label), gains), c.hint ? h('span', 'cm-h', c.hint) : null, c.lines.length ? h('span', 'cm-lines', c.lines.join(' · ')) : null),
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
