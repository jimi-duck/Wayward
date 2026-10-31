import { describe, expect, it } from 'vitest';
import { SCRIPT } from '../src/content/script';
import { STORY_CARDS } from '../src/content/story';
import { CARDS } from '../src/content/cards';
import type { CardDef } from '../src/sim/comms';

// The writing caps (docs/COPY.md, "One voice at a time"): a Voice is 20 words, a Moment 60, a Signal's headline 3
// and its reason 6. A written document (a card with a `letter`, the archive and Ada's notes) is read, not glanced at:
// 110 words. The middle dot is a separator, not a word.

const CAPS = { voice: 20, moment: 60, document: 110, headline: 3, reason: 6 } as const;
const words = (s: string): number => s.replace(/[“”"·]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
const over = (s: string, cap: number) => (words(s) > cap ? [`${words(s)}/${cap}: ${s}`] : []);

describe('the writing caps', () => {
  it('keeps every scripted radio line and notice short', () => {
    const out: string[] = [];
    for (const r of SCRIPT) {
      const d = r.do as { radio?: { text: string | string[] }; notice?: { headline: string; reason?: string } } | undefined;
      for (const x of [d?.radio?.text ?? []].flat()) out.push(...over(x, CAPS.voice).map((m) => `${r.id} ${m}`));
      if (d?.notice) {
        out.push(...over(d.notice.headline, CAPS.headline).map((m) => `${r.id} ${m}`));
        if (d.notice.reason) out.push(...over(d.notice.reason, CAPS.reason).map((m) => `${r.id} ${m}`));
      }
    }
    expect(out).toEqual([]);
  });

  it('keeps every card and its radio follow-ups within the caps', () => {
    const out: string[] = [];
    for (const c of [...STORY_CARDS, ...CARDS] as CardDef[]) {
      out.push(...over(c.text ?? '', c.letter ? CAPS.document : CAPS.moment).map((m) => `${c.id} ${m.slice(0, 40)}`));
      for (const ch of c.choices ?? []) for (const o of [ch.win, ch.lose]) {
        for (const x of [o?.radio?.text ?? []].flat()) out.push(...over(x, CAPS.voice).map((m) => `${c.id} ${m}`));
        if (o?.signal) out.push(...over(o.signal.headline, CAPS.headline), ...over(o.signal.reason, CAPS.reason));
      }
      if (c.herald) out.push(...over(c.herald.headline, CAPS.headline), ...over(c.herald.reason, CAPS.reason));
    }
    expect(out).toEqual([]);
  });
});
