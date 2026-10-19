import { describe, expect, it } from 'vitest';
import { GAP, Notifier, SECS } from '../src/ui/notify';

function rig() {
  const parts: Record<string, { textContent: string }> = { '#notice-t': { textContent: '' }, '#notice-s': { textContent: '' } };
  const classes = new Set<string>();
  const el = {
    querySelector: (q: string) => parts[q],
    offsetWidth: 0,
    set className(v: string) { classes.clear(); if (v) classes.add(v); },
    classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
  } as unknown as HTMLElement;
  const corner: string[] = [];
  const n = new Notifier(() => el, (l) => corner.push(l));
  return { n, parts, classes, corner };
}

describe('the centre notice', () => {
  it('shows one message, fades on its own, and does not repeat inside the gap', () => {
    const r = rig();
    r.n.notify({ type: 'denied', headline: 'Docking denied', reason: 'Hostiles engaged · clear the fight to dock' }, 0);
    expect(r.parts['#notice-t']!.textContent).toBe('Docking denied');
    expect(r.classes.has('on')).toBe(true);
    r.n.step(SECS + 0.1);
    expect(r.classes.has('on')).toBe(false);
    r.n.notify({ type: 'denied', headline: 'Docking denied' }, GAP - 1);
    expect(r.classes.has('on')).toBe(false);
    r.n.notify({ type: 'denied', headline: 'Docking denied' }, GAP + 1);
    expect(r.classes.has('on')).toBe(true);
  });

  it('puts denied over warning over arrival, and the one pushed out goes to the corner', () => {
    const r = rig();
    r.n.notify({ type: 'arrival', headline: 'Docking cleared' }, 0);
    r.n.notify({ type: 'denied', headline: 'Guns cold', reason: 'The field damps every weapon' }, 0.5);
    expect(r.parts['#notice-t']!.textContent).toBe('Guns cold');
    expect(r.corner).toEqual(['Docking cleared']);
    r.n.notify({ type: 'warning', headline: 'Cargo pod lost' }, 1);
    expect(r.parts['#notice-t']!.textContent).toBe('Guns cold');
    expect(r.corner).toEqual(['Docking cleared', 'Cargo pod lost']);
  });
});
