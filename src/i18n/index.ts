import { DE } from './de';

// ── languages ─────────────────────────────────────────────────────────────
// The game speaks English and German. English is the source: every string is
// written in English where it is used, and t() looks it up in the German
// dictionary (src/i18n/de/) when German is on. A string the dictionary does
// not have yet stays English, so nothing ever shows blank; the i18n test
// lists any that are missing.
//
// Both languages are kept short and informal (du, not Sie): a player who does
// not want to read should still know what to do.
//
// Names stay as they are: the Wayward, Krail, Calloway, the factions (the
// Custody, the Continuance, the Gutter, the Thren) and every system and port.
//
// Placeholders are {name}: t('Bound for {dest}', { dest }). A string built
// with numbers only also finds its entry with each number as {#}, so
// '+60 chits' finds '+{#} chits'.

export type Lang = 'en' | 'de';
export const LANGS: readonly Lang[] = ['en', 'de'];
export const LANG_NAME: Record<Lang, string> = { en: 'English', de: 'Deutsch' };

const KEY = 'wayward.lang';
let lang: Lang = 'en';
const listeners: Array<() => void> = [];

/** The language on now. */
export const current = (): Lang => lang;

/** The language to start in: ?lang=, then the player's last choice, then the browser's. */
export function detect(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'de') return q;
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'de') return saved;
  } catch { /* no storage: fall through to the browser */ }
  const prefs = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  return prefs.some((l) => /^de\b/i.test(l ?? '')) ? 'de' : 'en';
}

/** Switch language (remembered unless `save` is false), and tell whoever draws text. */
export function setLang(l: Lang, save = true): void {
  lang = l;
  if (save) try { localStorage.setItem(KEY, l); } catch { /* not remembered */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l === 'de' ? 'de' : 'en-GB';
  for (const fn of listeners) fn();
}

/** Call `fn` whenever the language changes. */
export function onLang(fn: () => void): void {
  listeners.push(fn);
}

const NUM = /\d+(?:[.,]\d+)*/g;

/** A string in the current language. `vars` fill its {placeholders}. */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s = en;
  if (lang === 'de' && en) {
    const hit = DE[en];
    if (hit !== undefined) s = hit;
    else {
      // built with numbers: look it up with each number as {#}
      const nums = en.match(NUM);
      const pat = nums && DE[en.replace(NUM, '{#}')];
      if (nums && pat) { let i = 0; s = pat.replace(/\{#\}/g, () => nums[i++] ?? ''); }
    }
  }
  return vars ? fill(s, vars) : s;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Pick by count: plural(n, '{n} wreck', '{n} wrecks'), each looked up and filled. */
export function plural(n: number, one: string, many: string, vars: Record<string, string | number> = {}): string {
  return t(n === 1 ? one : many, { n, ...vars });
}

/** A word moved into the middle of a phrase: lower case in English, as it is in German (whose nouns keep their capital). */
export function midSentence(s: string): string {
  return lang === 'de' ? s : s.toLowerCase();
}

/** A whole number with the language's grouping (12,345 or 12.345). */
export function num(n: number): string {
  return Math.round(n).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB');
}

// ── the page ──────────────────────────────────────────────────────────────
// index.html is written in English. localize() swaps its text in place and
// keeps the English, so the page can switch back and forth. An element
// marked data-i18n="html" is looked up whole (its markup kept), for lines
// with a word picked out in bold.

type Spot = { node: Text; en: string } | { el: Element; attr: string; en: string } | { el: HTMLElement; html: string };
let spots: Spot[] | null = null;
const ATTRS = ['aria-label', 'title'] as const;

/** The page's static text, found once (before any code has written over it). */
function gather(root: Element): Spot[] {
  const out: Spot[] = [];
  const walk = (el: Element) => {
    for (const attr of ATTRS) {
      const en = el.getAttribute(attr);
      if (en && /[A-Za-z]/.test(en)) out.push({ el, attr, en });
    }
    if (el instanceof HTMLElement && el.dataset.i18n === 'html') { out.push({ el, html: el.innerHTML.trim() }); return; }
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'KBD' || el.tagName === 'svg') return;
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        const en = n.nodeValue ?? '';
        if (/[A-Za-z]{2}/.test(en)) out.push({ node: n as Text, en });
      } else if (n.nodeType === Node.ELEMENT_NODE) walk(n as Element);
    }
  };
  walk(root);
  return out;
}

/** Put the page's static text in the current language. */
export function localize(root: Element = document.body): void {
  spots ??= gather(root);
  for (const s of spots) {
    if ('node' in s) { const core = s.en.trim(); s.node.nodeValue = s.en.replace(core, t(core)); }
    else if ('attr' in s) s.el.setAttribute(s.attr, t(s.en));
    else s.el.innerHTML = t(s.html);
  }
}
