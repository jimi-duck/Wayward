import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAst } from 'rolldown/parseAst';

// ── the player-facing text in the source ──────────────────────────────────
// Every string literal in the game's code that reads like words: content
// data, the panels, the sim's lines. Ids, CSS classes, key codes, element
// ids and the like are left out by where they sit (an `id:` key, the first
// two arguments of h(), a comparison, a case label). The i18n test checks
// each one has a German line.

/** Object keys whose values are never shown. */
const SKIP_KEYS = new Set([
  'id', 'kind', 'variant', 'caller', 'trigger', 'tone', 'faction', 'personality', 'branch', 'cat', 'tech', 'hull', 'wing', 'plays',
  'reward', 'system', 'approach', 'hair', 'eye', 'mark', 'jaw', 'skin', 'hairColour', 'type', 'group', 'cargo', 'learn', 'default',
  'holder', 'icon', 'colour', 'color', 'class', 'cls', 'key', 'code', 'flag', 'noFlag', 'tier', 'blockade', 'captain', 'calloway',
  'role', 'tactic', 'fire', 'fill', 'stroke', 'd', 'href', 'textAnchor', 'text-anchor', 'role', 'loseIf', 'role', 'mode', 'face',
  'ships', 'shape', 'fx', 'kit', 'resourceKey', 'dash', 'hp', 'phase', 'stamp', 'pre', 'post',
]);
/** Calls whose arguments (all, or the first n) are never shown. */
const SKIP_CALLS: Record<string, number> = {
  $: 9, el: 9, getElementById: 9, querySelector: 9, querySelectorAll: 9, createElement: 9, createElementNS: 9, setAttribute: 1,
  getAttribute: 9, addEventListener: 9, removeEventListener: 9, toggle: 9, add: 9, remove: 9, contains: 9, setProperty: 9,
  getPropertyValue: 9, h: 2, svg: 1, Error: 9, matchMedia: 9, getItem: 9, setItem: 9, includes: 9, startsWith: 9, endsWith: 9,
  split: 9, join: 9, replace: 9, retrigger: 9, icon: 9, padStart: 9, toLocaleString: 9, has: 9, delete: 9, get: 9, set: 9,
  indexOf: 9, test: 9, keys: 9, log: 9, warn: 9, defineProperty: 9, pick: 9, summon: 9, effects: 9, fitted: 9, hasFitted: 9,
  countedBy: 9, branchLevels: 9, ticks: 9, flag: 9, holds: 9, list: 9,
};
const PATHS = ['src/content', 'src/ui', 'src/sim', 'src/main.ts'];
const LOOKS_LIKE_WORDS = (s: string) => /[A-Za-z]{2}/.test(s) && (/[A-Za-z][,.:;!?’]? [A-Za-z“]/.test(s) || /^[“A-Z][a-z]+/.test(s) || /[“”’]/.test(s));
const NOT_WORDS = /^(#|rgba?\(|var\(|url\(|[MmLlQqCcHhVvZz]\s?-?\d|\.{0,2}\/|https?:|Digit|Numpad|Arrow|Key[A-Z]|(Shift|Enter|Escape|Space|Tab|Backspace|NumpadEnter)$|[a-z]+[A-Z]\w*$|[a-z0-9_-]+$|[a-z-]+( [a-z-]+)+$)/;

type Node = { type: string; [k: string]: unknown };

function files(): string[] {
  const walk = (p: string): string[] => (p.endsWith('.ts') ? [p] : readdirSync(p, { withFileTypes: true }).flatMap((e) => walk(join(p, e.name))));
  return PATHS.flatMap(walk).filter((f) => !f.endsWith('debug.ts') && !f.endsWith('face.ts') && !f.endsWith('palette.ts'));
}

function calleeName(n: Node): string {
  const c = n.callee as Node;
  if (c.type === 'Identifier') return c.name as string;
  if (c.type === 'MemberExpression' && (c.property as Node).type === 'Identifier') return (c.property as Node).name as string;
  return '';
}

/** Every shown-looking string in `src`, with the file it came from. */
export function scanSource(): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of files()) {
    const ast = parseAst(readFileSync(file, 'utf8'), { lang: 'ts' }) as unknown as Node;
    const take = (s: string, force: boolean) => {
      if ((force ? /[A-Za-z]{2}/.test(s) : LOOKS_LIKE_WORDS(s) && !NOT_WORDS.test(s)) && !out.has(s)) out.set(s, file);
    };
    // skip: never shown; force: an argument to t(), always a line
    const visit = (n: unknown, skip = false, force = false): void => {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) { for (const x of n) visit(x, skip, force); return; }
      const node = n as Node;
      switch (node.type) {
        case 'ImportDeclaration': case 'ExportAllDeclaration': case 'TSTypeAnnotation': case 'TSTypeAliasDeclaration':
        case 'TSInterfaceDeclaration': case 'TSLiteralType': return;
        case 'Literal': if (!skip && typeof node.value === 'string') take(node.value, force); return;
        case 'TemplateLiteral': {
          const q = node.quasis as Node[];
          if (!skip && q.length === 1) take(((q[0]!.value as { cooked: string }).cooked), force);
          visit(node.expressions, skip);
          return;
        }
        case 'Property': {
          const k = node.key as Node;
          const name = k.type === 'Identifier' ? k.name as string : k.type === 'Literal' ? String(k.value) : '';
          visit(node.value, skip || SKIP_KEYS.has(name));
          return;
        }
        case 'ConditionalExpression': visit(node.test, skip); visit(node.consequent, skip, force); visit(node.alternate, skip, force); return;
        case 'LogicalExpression': visit(node.left, skip, force); visit(node.right, skip, force); return;
        case 'BinaryExpression': {
          const op = node.operator as string;
          const cmp = op === '===' || op === '!==' || op === '==' || op === '!=' || op === 'in';
          visit(node.left, skip || cmp);
          visit(node.right, skip || cmp);
          return;
        }
        case 'SwitchCase': visit(node.consequent, skip); return;
        case 'MemberExpression': visit(node.object, skip); if (node.computed) visit(node.property, true); return;
        case 'CallExpression': case 'NewExpression': {
          const name = node.type === 'NewExpression' ? ((node.callee as Node).name as string) : calleeName(node);
          const n2 = SKIP_CALLS[name] ?? 0;
          visit(node.callee, skip);
          const tr = name === 't' || name === 'tr' || name === 'plural';
          (node.arguments as Node[]).forEach((a, i) => visit(a, skip || i < n2, tr && !(name === 'plural' && i === 0)));
          return;
        }
      }
      for (const [k, v] of Object.entries(node)) if (k !== 'type' && k !== 'start' && k !== 'end') visit(v, skip);
    };
    visit(ast);
  }
  return out;
}

/** The text in index.html: between tags, and in aria-label and title. */
export function scanPage(): string[] {
  const html = readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<head>[\s\S]*<\/head>/, '').replace(/<noscript>[\s\S]*?<\/noscript>/, '');
  const out = new Set<string>();
  // a data-i18n="html" element is one line, markup and all
  const whole = /<(\w+)[^>]*data-i18n="html"[^>]*>([\s\S]*?)<\/\1>/g;
  const rest = html.replace(whole, (_m, _tag, inner: string) => { out.add(inner.trim()); return ''; }).replace(/<kbd>[^<]*<\/kbd>/g, '');
  for (const m of rest.matchAll(/>([^<>]+)</g)) {
    const s = m[1]!.trim();
    if (/[A-Za-z]{2}/.test(s)) out.add(s);
  }
  for (const m of rest.matchAll(/(?:aria-label|title)="([^"]+)"/g)) if (/[A-Za-z]{2}/.test(m[1]!)) out.add(m[1]!);
  return [...out];
}
