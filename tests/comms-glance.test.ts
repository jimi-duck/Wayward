import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { glanceLine, gistOf } from '../src/ui/comms';

describe('the call says each thing once', () => {
  it('drops a glance line that the quote already holds', () => {
    const text = '“Hauler, your transponder identifies you as an Obedience Heavy Lift. Your ship does not match the record.”';
    expect(glanceLine('Hauler, your transponder identifies you as an Obedience Heavy Lift.', 'Your ship does not match its registry', text)).toBe('');
    expect(glanceLine('Hauler, your transponder identifies you as an Obedience Heavy…', 'Title', text)).toBe('');
  });

  it('drops a glance line that is the title, and keeps one that adds something', () => {
    expect(glanceLine('Report your cargo', 'Report your cargo!', '“Net sweep.”')).toBe('');
    expect(glanceLine('The Guild wants to buy a copy', 'An offer', '“We would pay well for it.”')).toBe('The Guild wants to buy a copy');
  });

  it('leaves no card whose shown glance line repeats its own words', () => {
    for (const c of CARDS) {
      const g = glanceLine(gistOf(c, c.text), c.title, c.text);
      if (g) expect(c.text.toLowerCase()).not.toContain(g.toLowerCase().replace(/[“”"]/g, ''));
    }
  });
});
