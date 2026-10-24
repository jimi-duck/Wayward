import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// An element the app shows and hides with the `hidden` attribute has to stay hidden. A rule like
// `#rd-call.job { display: grid }` in a later stylesheet outranks an earlier `#rd-call[hidden]`, and the card
// then stayed on screen, inert, after it was answered. So for each such element, the hide rule must win the
// cascade over every rule that sets its display: at least as specific, and in the same file or a later one.

const html = readFileSync('index.html', 'utf8');
const sheets = [...html.matchAll(/<link rel="stylesheet" href="\.\/(src\/styles\/[\w.-]+\.css)"/g)].map((m) => m[1]!);
interface Rule { sel: string; body: string; at: number; spec: number }

/** A selector's weight: ids, then classes, attributes and pseudo-classes, then elements. */
const weight = (sel: string): number => {
  const bare = sel.replace(/::?[\w-]+\(([^)]*)\)/g, (_m, inner: string) => ` ${inner} `);
  const ids = (bare.match(/#[\w-]+/g) ?? []).length;
  const cls = (bare.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length;
  const els = (bare.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|::?[\w-]+/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return ids * 10000 + cls * 100 + els;
};

const rules: Rule[] = sheets.flatMap((f, fi) => {
  const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].flatMap((m, ri) => m[1]!.split(',').map((s) => ({ sel: s.trim(), body: m[2]!, at: fi * 100000 + ri, spec: weight(s) })));
});

/** The element's own compound is the last one: `#id.cls` and `#id[hidden]` count, `#id .child` does not. */
const own = (sel: string, id: string) => !/[():]/.test(sel.replace(/\[[^\]]*\]/g, '')) && new RegExp(`#${id}(?![\\w-])[^\\s>+~]*$`).test(sel);
const hiddenIds = [...html.matchAll(/<(?:div|section|aside|nav|header|footer|span|button|p)\b[^>]*\bid="([\w-]+)"[^>]*\shidden(?=[\s>])[^>]*>/g)].map((m) => m[1]!);

describe('hidden elements stay hidden', () => {
  it('finds the stylesheets and the hidden elements', () => {
    expect(sheets).toContain('src/styles/neon.css');
    expect(hiddenIds).toContain('rd-call');
  });

  it.each(hiddenIds)('#%s: its hide rule beats every rule that sets its display', (id) => {
    const shows = rules.filter((r) => own(r.sel, id) && !/\[hidden\]/.test(r.sel) && /(^|[\s;])display\s*:\s*(?!none)/.test(' ' + r.body));
    if (!shows.length) return;
    const hides = rules.filter((r) => own(r.sel, id) && /\[hidden\]/.test(r.sel) && /display\s*:\s*none/.test(r.body));
    for (const s of shows) {
      const beaten = hides.some((h) => h.spec >= s.spec && h.at > s.at);
      expect(beaten, `"${s.sel}" sets display on #${id} and no later "#${id}[hidden] { display: none }" is at least as specific`).toBe(true);
    }
  });
});
