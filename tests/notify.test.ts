import { describe, expect, it } from 'vitest';
import { GAP, Notifier, QUEUED, SECS, SHOWN, type NoticeType, type NoticeView } from '../src/ui/notify';

function rig() {
  const up: string[] = [];
  const log: string[] = [];
  const view: NoticeView = {
    add: (_type: NoticeType, headline: string) => { up.push(headline); log.push(`+${headline}`); return headline; },
    remove: (h) => { up.splice(up.indexOf(h as string), 1); log.push(`-${h}`); },
  };
  const corner: string[] = [];
  return { n: new Notifier(view, (l) => corner.push(l)), up, log, corner };
}

describe('the centre notices', () => {
  it('shows a message, fades it on its own, and does not repeat it inside the gap', () => {
    const r = rig();
    r.n.notify({ type: 'denied', headline: 'Docking denied', reason: 'Hostiles engaged · clear the fight to dock' }, 0);
    expect(r.up).toEqual(['Docking denied']);
    r.n.step(SECS + 0.1);
    expect(r.up).toEqual([]);
    r.n.notify({ type: 'denied', headline: 'Docking denied' }, GAP - 1);
    expect(r.up).toEqual([]);
    r.n.notify({ type: 'denied', headline: 'Docking denied' }, GAP + 1);
    expect(r.up).toEqual(['Docking denied']);
  });

  it('shows two at most and queues the rest in order, none dropped', () => {
    const r = rig();
    for (const h of ['One', 'Two', 'Three', 'Four']) r.n.notify({ type: 'arrival', headline: h }, 0);
    expect(r.up).toEqual(['One', 'Two']);
    r.n.step(SECS + 0.1);
    expect(r.up).toEqual(['Three', 'Four']);
    expect(r.corner).toEqual([]);
    expect(SHOWN).toBe(2);
  });

  it('puts a denial ahead of the waiting arrivals and warnings', () => {
    const r = rig();
    for (const h of ['A', 'B']) r.n.notify({ type: 'arrival', headline: h }, 0);
    r.n.notify({ type: 'arrival', headline: 'C' }, 0);
    r.n.notify({ type: 'warning', headline: 'W' }, 0);
    r.n.notify({ type: 'denied', headline: 'D' }, 0);
    r.n.step(SECS + 0.1);
    expect(r.up).toEqual(['D', 'W']);
    r.n.step(SECS + 0.1);
    expect(r.up).toEqual(['C']);
  });

  it('keeps distinct messages and sends only a long backlog to the corner log', () => {
    const r = rig();
    for (let i = 0; i < SHOWN + QUEUED + 2; i++) r.n.notify({ type: 'arrival', headline: `m${i}` }, 0);
    expect(r.corner).toHaveLength(2);
  });
});
