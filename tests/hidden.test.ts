import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// An element the app shows and hides with the `hidden` attribute has to stay hidden: a rule like
// `#rd-call.job { display: grid }` outranks `.rd-call[hidden]`, and the card then stayed on
// screen, inert, after it was answered.

const css = readdirSync('src/styles').filter((f) => f.endsWith('.css')).map((f) => readFileSync(`src/styles/${f}`, 'utf8')).join('\n');
const html = readFileSync('index.html', 'utf8');
const strip = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...strip.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1]!.trim(), body: m[2]! }));

const hiddenIds = [...html.matchAll(/<(?:div|section|aside|nav|header|footer|span|button|p)\b[^>]*\bid="([\w-]+)"[^>]*\shidden(?=[\s>])[^>]*>/g)].map((m) => m[1]!);

describe('hidden elements stay hidden', () => {
  it('finds the hidden elements', () => expect(hiddenIds).toContain('rd-call'));

  it.each(hiddenIds)('#%s: no id rule with a display outranks its hidden state', (id) => {
    const shows = rules.flatMap((r) => (/(^|[\s,>+~])display\s*:\s*(?!none)/.test(' ' + r.body) ? r.sel.split(',').map((s) => s.trim()).filter((s) => !/\[hidden\]/.test(s) && new RegExp(`^#${id}(?![\\w-])`).test(s) && !/\s/.test(s)) : []));
    if (!shows.length) return;
    const covered = rules.some((r) => /display\s*:\s*none/.test(r.body) && r.sel.split(',').some((s) => new RegExp(`^#${id}(?![\\w-])`).test(s.trim()) && /\[hidden\]/.test(s) && !/\s/.test(s.trim())));
    expect(covered, `${shows.join(', ')} sets display on #${id}; add "#${id}[hidden] { display: none }"`).toBe(true);
  });
});
