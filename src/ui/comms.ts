import type { Contact } from '../sim/bosses';
import type { Caller, GlassRole, Open } from '../sim/comms';
import type { LedgerRow } from '../sim/contract';
import { NEON_CSS } from './colors';
import { artImg, artUrl } from './art';
import { CALLOWAY_ID, CONTACTS } from '../content/art';
import { faceSvg } from './face';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { INK } from './palette';
import { num, t } from '../i18n';
import { FACTION_NAME } from './hud';
import { arrive, arriving, bars, bearingLine, settle, settleDigits } from './arrive';

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
  /** The answer's tone: a fight draws red on the opening's sheets. */
  tone?: string;
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
  ledger: Row[];
  /** The registry notice's layout (its own panel), or null for an ordinary card. */
  reg: RegView | null;
  /** The opening's Neon Glass sheet (its own panels), or null for an ordinary card. */
  sheet: SheetView | null;
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

const plain = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** The glance line, unless the call already says it: a gist that is the title, or a piece of the quote, would only repeat it. */
export function glanceLine(gist: string, title: string, text: string): string {
  const g = plain(gist);
  return !g || g === plain(title) || plain(text).includes(g) ? '' : gist;
}

/** A ledger row's figure: cargo in Cyrite, credit in CR (the two are never one number), or a word. */
export function ledgerValue(r: LedgerRow): string {
  const amount = r.n ?? r.cr;
  if (amount === undefined) return t(r.v ?? '');
  return (amount < 0 ? '−' : '') + t(r.n !== undefined ? '{n} Cyrite' : '{n} CR', { n: Math.abs(amount) });
}

/** A ledger row as the panel draws it. */
export interface Row { k: string; v: string; tone: string }
const rowsOf = (rows: LedgerRow[] | undefined): Row[] => (rows ?? []).map((r) => ({ k: t(r.k), v: ledgerValue(r), tone: r.tone ?? '' }));

/** One Neon Glass panel of the opening's sheets: who, a status word, then what it says. */
export interface SheetPanel {
  role: GlassRole;
  from: string;
  status: string;
  /** The status dot's colour: the role's, or white for an unknown caller. */
  dot: string;
  title: string;
  sub: string;
  /** A small label over quoted lines (the radio voice). */
  label: string;
  lines: string[];
  /** A private channel's bearing in degrees (Sam's is always the same), or null. */
  rx: number | null;
}

/** The opening's sheets (docs/DESIGN-GUIDELINES.md): a main panel, maybe a second one beside it, and an optional document. */
export interface SheetView {
  main: SheetPanel & { hero: [string, string] | null; rows: Row[]; note: string; letter: { head: Array<[string, string]>; sign: string } | null };
  side: SheetPanel | null;
  /** The document behind the card: the row that opens it (after `at` rows, or as a numbered row), and what it shows. */
  doc: { open: string; at: number; row: boolean; kick: string; title: string; sub: string; rows: Row[]; note: string[]; label: string } | null;
}

function sheetView(d: Open['def'], o: Open): SheetView {
  const role = d.glass ?? 'cyan';
  const lines = o.text.split('\n').map((l) => l.trim()).filter(Boolean);
  const side = d.side;
  return {
    main: {
      role, from: t(d.from), status: d.status ? t(d.status) : '', dot: d.status === 'Unknown' ? 'white' : role,
      title: d.notitle || d.hero ? '' : t(d.title), sub: d.quote ? '' : lines.join(' '), label: '', lines: d.quote ? lines : [],
      hero: d.hero ? [t(d.hero[0]), t(d.hero[1])] : null, rows: rowsOf(o.ledger), note: d.note ? t(d.note) : '', rx: d.rx ?? null,
      letter: d.letter ? { head: d.letter.head.map(([k, v]) => [t(k), t(v)] as [string, string]), sign: t(d.letter.sign) } : null,
    },
    side: side ? {
      role: side.glass ?? 'cyan', from: t(side.from), status: side.status ? t(side.status) : '', dot: side.glass ?? 'cyan',
      title: side.title ? t(side.title) : '', sub: side.sub ? t(side.sub) : '', label: side.label ? t(side.label) : '', lines: side.lines.map((l) => t(l)), rx: null,
    } : null,
    doc: d.doc ? {
      open: t(d.doc.open), at: d.doc.at ?? (o.ledger?.length ?? 0), row: !!d.doc.row, kick: t(d.doc.kick), title: t(d.doc.title),
      sub: d.doc.sub ? t(d.doc.sub) : '', rows: rowsOf(o.doc), label: d.doc.label ? t(d.doc.label) : '',
      note: (d.doc.note ? t(d.doc.note) : '').split('\n').map((l) => l.trim()).filter(Boolean),
    } : null,
  };
}

/** What the registry notice draws (opening chapter sheet H, after the approved mock-up). */
export interface RegView {
  head: string; sub: string; tag: string;
  /** The verified previous hull ID (struck through), or '' to leave it out; and the new name. */
  from: string; to: string;
  /** The reveal copy under the name. */
  copy: string[];
  active: string;
  /** A voice on the radio by the action (Sam's closing line), or null. */
  voice: { label: string; line: string } | null;
  rows: Array<{ k: string; v: string; to: string }>;
  repaint: [string, string];
  before: string; after: string; now: string;
  button: string; foot: string;
}

function regView(d: Open['def'], o: Open): RegView {
  const [head = '', sub = ''] = d.from.split(' · ');
  const [from = '', to = ''] = d.title.split(' → ');
  return {
    head: t(head), sub: sub ? t(sub) : '', tag: d.status ? t(d.status) : '', from, to, active: o.text,
    copy: (d.copy ?? []).map((l) => t(l)),
    voice: d.side?.lines[0] ? { label: t(d.side.label ?? d.side.from), line: t(d.side.lines[0]) } : null,
    // a row with an arrow in it is a change: what it was, then what it is
    rows: (o.ledger ?? []).map((r) => { const [v = '', after = ''] = ledgerValue(r).split(' → '); return { k: t(r.k), v, to: after }; }),
    repaint: [t(d.repaint?.[0] ?? ''), t(d.repaint?.[1] ?? '')],
    before: t('Original livery'), after: t('Current livery'), now: t('Current livery'),
    button: t(d.choices[0]?.label ?? ''), foot: t('Local identity updated · Registration not restored'),
  };
}

/** The game's own mark (the title's `.st-mark`): its lower segment stands apart. */
function mark(cls: string): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 34');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', 'M0 0H15L20 9L25 0H40L30.88 15.5H9.12Z M10.29 17.5H29.71L20 34Z');
  svg.append(path);
  return svg;
}
const wave = () => { const i = h('i', 'tx-wave'); i.setAttribute('aria-hidden', 'true'); return i; };

/** A card on the table, as the panel draws it. */
export function cardView(o: Open): CommsView {
  const d = o.def, r = o.read;
  return {
    kick: t(o.slow > 0 ? 'Ambush · act now' : KIND_WORD[d.kind] ?? d.kind),
    title: t(d.title),
    sub: t(d.from),
    colour: CALLER_CSS[d.caller],
    alert: HOSTILE.has(d.kind) || o.slow > 0,
    gist: glanceLine(gistOf(d, o.text), t(d.title), o.text),
    ledger: rowsOf(o.ledger),
    reg: d.layout === 'registry' ? regView(d, o) : null,
    sheet: d.glass && d.layout !== 'registry' ? sheetView(d, o) : null,
    text: o.text,
    more: o.more.join(' '),
    // the read: strength as two bars, and the one line that matters (the
    // choices' odds already carry how far it can be trusted)
    // only when there is something to read: hulls to weigh up, or a story that could be a lie
    read: d.ships?.length || d.truths?.length ? { them: r.them, you: r.you, bars: !!d.ships?.length, rows: d.truths?.length ? [[t('Intent'), t(r.intent)]] : [] } : null,
    choices: o.choices.map((c) => ({
      label: t(c.label), hint: c.hint ? t(c.hint) : '', lines: [], ok: c.ok, needs: c.needs.map((n) => t(n)), gains: c.gains, tone: c.tone,
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
    reg: null,
    sheet: null,
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
  /** When the panel last closed: a card that follows at once arrives in a window that is already open. */
  private closedAt = -1e9;
  private sel = 0;
  private view: CommsView | null = null;
  private onAnswer: ((i: number) => void) | null = null;

  get open(): boolean {
    return !$('comms').hidden;
  }

  show(view: CommsView, onAnswer: (i: number) => void): void {
    const again = performance.now() - this.closedAt < 400;
    this.close();
    arrive($('comms'), again);
    this.view = view;
    this.onAnswer = onAnswer;
    this.opened = performance.now();
    this.sel = Math.max(0, view.choices.findIndex((c) => c.ok));
    $('comms').classList.toggle('reg', !!view.reg);
    $('comms').classList.toggle('ns', !!view.sheet);
    if (view.reg) this.drawReg(view.reg);
    if (view.sheet) return this.showSheet(view, view.sheet);
    $('comms').classList.toggle('alert', view.alert);
    $('cm-k').textContent = `${t('Incoming')} · ${view.kick}`;
    $('cm-t').textContent = view.title;
    // the caller: who, then what they are, from the line under the title
    const [who, ...what] = view.sub.split(' · ');
    $('cm-who').textContent = who ?? '';
    $('cm-s').textContent = what.join(' · ');
    $('cm-gist').textContent = view.gist;
    $('cm-gist').style.setProperty('--cc', view.colour);
    $('cm-text').textContent = view.text;
    $('cm-ledger').replaceChildren(...view.ledger.map((r) => h('li', r.tone, '', h('span', '', r.k), h('b', '', r.v))));
    $('cm-ledger').hidden = !view.ledger.length;
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

  /**
   * The opening's sheets (opening chapter mockups v10, docs/DESIGN-GUIDELINES.md): Neon Glass panels in their role colour,
   * numbered actions, and a document behind the card that opens on request and closes back to it. The arrows (a pad's
   * stick) walk every action, the document's row among them; the number keys answer; Escape closes the document.
   */
  private showSheet(view: CommsView, sv: SheetView): void {
    $('comms').classList.remove('alert');
    this.docOpen = false;
    this.drawSheet(view, sv);
    $('comms').hidden = false;
    // a private channel: the line toward where the call comes from, once, as it arrives
    const main = $('cm-ng').querySelector<HTMLElement>('.ns-main');
    if (sv.main.rx !== null && main && arriving($('comms'))) bearingLine($('cm-ng'), main, sv.main.rx);
    this.off = keys((e) => {
      if (this.docOpen) {
        if (['Escape', 'Backspace', 'Enter', 'NumpadEnter', 'Space'].includes(e.code)) return this.setDoc(view, sv, false), true;
        return e.code === 'Tab';
      }
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
      const np = ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6'].indexOf(e.code);
      const k = Math.max(n, np);
      if (k >= 0) { const item = this.items.find((x) => x.n === k + 1); if (item) item.act(); return true; }
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') return this.moveItem(-1), true;
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') return this.moveItem(1), true;
      if (e.code === 'Enter' || e.code === 'NumpadEnter') return this.items[this.sel]?.act(), true;
      return e.code === 'Space' || e.code === 'Tab';
    }, ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  }

  /** Every action on the sheet, in reading order: what Enter, the arrows and the number keys reach. */
  private items: Array<{ el: HTMLElement; act: () => void; n: number }> = [];
  private docOpen = false;

  private moveItem(d: number): void {
    const n = this.items.length;
    if (!n) return;
    this.sel = (this.sel + d + n) % n;
    this.items.forEach((x, i) => x.el.classList.toggle('sel', i === this.sel));
  }

  private setDoc(view: CommsView, sv: SheetView, on: boolean): void {
    this.docOpen = on;
    // the same message, redrawn: nothing arrives again
    settle($('comms'));
    this.drawSheet(view, sv);
  }

  private drawSheet(view: CommsView, sv: SheetView): void {
    this.items = [];
    const item = (el: HTMLElement, act: () => void, n = 0) => {
      (el as HTMLButtonElement).type = 'button';
      el.onclick = guarded(this.opened, act);
      el.onpointerdown = (e) => e.stopPropagation();
      this.items.push({ el, act, n });
      return el;
    };
    const head = (p: { from: string; status: string; dot: string; rx?: number | null }, box = false) => {
      const deg = p.rx != null ? h('span', 'rx-deg') : null;
      const rx = t('RX {n}°', { n: String(p.rx).padStart(3, '0') });
      if (deg) { if (arriving($('comms'))) settleDigits(deg, rx); else deg.textContent = rx; }
      return h('header', 'ns-h', '', wave(), h('span', 'ns-from', p.from), deg, bars(),
        p.status ? h('span', `ns-st ${box ? 'box' : p.dot}`, p.status) : null);
    };
    const rows = (rs: Row[]) => rs.map((r) => h('div', `ns-r ${r.tone}`, '', h('span', 'k', r.k), h('b', 'v', r.v)));
    // the lines read as one block of text, no bar (the owner, 23 October 2026)
    const quotes = (ls: string[]) => (ls.length ? h('div', 'ns-q', '', h('p', '', ls.join(' '))) : null);
    const d = sv.doc;
    if (this.docOpen && d) {
      // the document, in place of the card: read only, and one way back
      const x = item(h('button', 'ng-n ns-x sel', '', h('span', 'ns-xi', '✕'), h('span', '', t('Close'))), () => this.setDoc(view, sv, false));
      this.sel = 0;
      $('cm-ng').replaceChildren(h('div', 'ns-stack', '', h('section', 'ng cyan ns-p ns-doc', '',
        head({ from: d.kick, status: t('Read only'), dot: 'cyan' }, true),
        h('h2', 'ns-t', d.title), d.sub ? h('p', 'ns-sub', d.sub) : null,
        h('div', 'ns-rows', '', ...rows(d.rows)),
        ...(d.label
          ? [h('p', 'ns-label', d.label), quotes(d.note)]
          : d.note.map((l) => h('p', 'ns-note', l))),
        h('div', 'ns-acts', '', x))));
      $('cm-ng').dataset.lay = 'doc';
      return;
    }
    const m = sv.main;
    const opener = d ? item(h('button', `ng-n ${d.row ? 'ns-c' : 'ns-open'}${m.role === 'cyan' ? '' : ` ${m.role}`}`, '',
      d.row ? h('kbd', '', String(view.choices.length + 1).padStart(2, '0')) : null, h('span', 'ns-l', d.open), d.row ? null : h('b', '', t('Open'))),
    () => this.setDoc(view, sv, true), d.row ? view.choices.length + 1 : 0) : null;
    const main = rows(m.rows);
    if (opener && !d!.row) main.splice(Math.min(d!.at, main.length), 0, opener);
    // the answers first in the reading order, the document's row after them; the first answer is where the selection starts
    const acts = view.choices.map((c, i) => {
      const tone = c.tone === 'fight' ? ' red' : m.role === 'cyan' ? '' : ` ${m.role}`;
      return item(h('button', `ng-n ns-c${tone}`, '', h('kbd', '', String(i + 1).padStart(2, '0')),
        h('span', 'ns-cb', '', h('span', 'ns-l', c.label), c.hint ? h('span', 'ns-hint', c.hint) : null)), () => this.pick(i), i + 1);
    });
    const panel = h('section', `ng ${m.role} ns-p ns-main`, '',
      head(m),
      m.hero ? h('div', 'ns-hero', '', h('b', '', m.hero[0]), h('span', '', m.hero[1])) : null,
      m.title ? h('h2', 'ns-t', m.title) : null,
      m.sub ? h('p', 'ns-sub', m.sub) : null,
      // a written message: who it is for and from, then the writer's own paragraphs and sign-off
      ...(m.letter ? [
        h('dl', 'ns-mail', '', ...m.letter.head.map(([k, v]) => h('div', '', '', h('dt', '', k), h('dd', '', v)))),
        h('div', 'ns-letter', '', ...m.lines.map((l) => h('p', '', l)), h('p', 'ns-sign', m.letter.sign)),
      ] : [quotes(m.lines)]),
      main.length ? h('div', 'ns-rows', '', ...main) : null,
      m.note ? h('p', 'ns-note', m.note) : null,
      h('div', 'ns-acts', '', ...acts, ...(opener && d!.row ? [opener] : [])));
    const sd = sv.side;
    const side = sd ? h('section', `ng ${sd.role} ns-p ns-side`, '', head(sd),
      sd.title ? h('h2', 'ns-t', sd.title) : null, sd.sub ? h('p', 'ns-sub', sd.sub) : null,
      sd.label ? h('p', 'ns-label', sd.label) : null, quotes(sd.lines)) : null;
    // a voice on the radio sits beside the card, to its left; a status line sits under it
    const lay = sd ? (sd.title ? 'row' : 'col') : 'one';
    $('cm-ng').dataset.lay = lay;
    $('cm-ng').replaceChildren(...(lay === 'row' ? [side!, panel] : [h('div', 'ns-stack', '', panel, side)]));
    // the arrows walk the actions in reading order; the selection starts on the first answer
    this.items.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    this.sel = Math.max(0, this.items.findIndex((x) => x.n === 1));
    this.items.forEach((x, i) => x.el.classList.toggle('sel', i === this.sel));
  }

  /**
   * The registry update (sheet H): owner lock lifted, the old hull ID struck through and the new name, the ship in its new
   * paint, the repaint's before and after at one scale, the warning and one action. The reveal settles in under a second
   * (none with reduced motion); the identity is already committed by the answer's flags, not by the animation.
   */
  private drawReg(r: RegView): void {
    const pic = (id: string, cls: string) => artImg('fleet', id, cls);
    const thumb = (id: string, label: string, now: boolean) => h('figure', `ng-n rg-th${now ? ' ochre' : ''}`, '', pic(id, 'rg-thimg'), h('figcaption', '', label));
    const go = h('button', 'ng-n ochre rg-go sel', '', h('kbd', '', '01'), h('span', '', r.button), h('i', 'rg-arrow', '→')) as HTMLButtonElement;
    go.type = 'button';
    go.onclick = guarded(this.opened, () => this.pick(0));
    go.onpointerdown = (e) => e.stopPropagation();
    const [w1 = '', w2 = ''] = r.repaint[1].split(/(?<=\.)\s+/);
    $('cm-reg').replaceChildren(
      h('header', 'rg-h', '', h('div', 'rg-org', '', h('b', '', '', wave(), h('span', '', r.head)), h('span', '', r.sub)), bars(), h('span', 'rg-tag', r.tag)),
      h('div', 'rg-main', '',
        h('div', 'rg-left', '',
          r.from ? h('p', 'rg-old', '', h('s', '', r.from), h('i', '', '→')) : null,
          h('h2', 'rg-name', '', mark('rg-mark'), h('span', '', r.to)),
          ...r.copy.map((l) => h('p', 'rg-copy', l)),
          h('p', 'rg-active', r.active),
          h('dl', 'rg-rows', '', ...r.rows.flatMap((x) => [h('dt', '', x.k), h('dd', x.to ? 'chg' : '', '', h('span', 'a', x.v), ...(x.to ? [h('i', '', '→'), h('span', 'b', x.to)] : []))])),
          h('h3', 'rg-rp', r.repaint[0]),
          h('div', 'rg-ths', '', thumb('wayward-registry-before', r.before, false), h('i', 'rg-tharrow', '→'), thumb('wayward-registry-after', r.after, true)),
        ),
        h('div', 'rg-right', '',
          h('figure', 'rg-ship', '', pic('wayward-registry', 'rg-hero'), h('figcaption', '', r.now)),
          h('div', 'rg-act', '', h('p', 'rg-warn', '', h('span', '', w1), h('span', '', w2)),
            r.voice ? h('div', 'rg-voice', '', h('p', 'ns-label', r.voice.label), h('div', 'ns-q', '', h('p', '', r.voice.line))) : null, go),
        ),
      ),
      h('footer', 'rg-foot', r.foot),
    );
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
    if (!$('comms').hidden) this.closedAt = performance.now();
    this.docOpen = false;
    this.items = [];
    this.off?.();
    this.off = null;
    this.view = null;
    this.onAnswer = null;
    $('comms').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (!this.view || performance.now() - this.opened < GUARD) return;
    if (this.view.sheet) {
      if (this.docOpen) { if (p.a || p.b) this.setDoc(this.view, this.view.sheet, false); return; }
      if (p.up || p.left) this.moveItem(-1);
      else if (p.down || p.right) this.moveItem(1);
      else if (p.a) this.items[this.sel]?.act();
      return;
    }
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
      // one row: the key, the label and its sentence, then what it brings, what it costs and the odds (or what it still needs)
      const chip = (cls: string, text: string) => h('span', `cm-chip ${cls}`, text);
      const chips = c.gains.filter((g) => plain(t(g)) !== plain(c.label)).map((g) => chip(gainClass(g), t(g)));
      const side = c.ok ? c.tags.map((tag) => (/^−/.test(tag) ? chip('cost', tag) : h('span', 'odds', tag))) : c.needs.map((n) => h('span', 'need', n));
      const sel = i === this.sel;
      const b = h('button', `cm-c${sel ? ' sel' : ''}`, '',
        h('kbd', '', String(i + 1).padStart(2, '0')),
        h('span', 'cm-main', '', h('span', 'cm-l', c.label), c.hint ? h('span', 'cm-h', c.hint) : null, c.lines.length ? h('span', 'cm-lines', c.lines.join(' · ')) : null),
        c.ok && chips.length ? h('span', 'cm-gains', '', ...chips) : null,
        h('span', 'cm-side', '', ...side),
      ) as HTMLButtonElement;
      b.type = 'button';
      if (c.hint) b.title = c.hint;
      b.setAttribute('aria-disabled', String(!c.ok));
      b.onclick = guarded(this.opened, () => this.pick(i));
      b.onpointerdown = (e) => e.stopPropagation();
      return b;
    }));
    // a long list scrolls inside the card: the highlighted answer stays on screen
    $('cm-list').querySelector('.cm-c.sel')?.scrollIntoView({ block: 'nearest' });
  }
}
