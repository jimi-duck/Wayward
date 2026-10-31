import { describe, expect, it } from 'vitest';
import { chipsOf, consequenceOf, type CommsChoice } from '../src/ui/comms';

// The card templates (docs/DESIGN-GUIDELINES.md): one consequence line per answer, two chips at most.
const choice = (o: Partial<CommsChoice>): CommsChoice => ({ label: 'Go', hint: 'It goes.', lines: [], tags: [], gains: [], ok: true, needs: [], ...o });

describe('a template answer', () => {
  it('shows two chips at most, trouble before gains, costs first', () => {
    const c = choice({ tags: ['−4 Cyrite', 'Good chance'], gains: ['Wall +1', 'Calloway closer', 'Refit'] });
    expect(chipsOf(c)).toEqual([['−4 Cyrite', 'warn'], ['Calloway closer', 'bad']]);
  });

  it('shows what it still needs when the ship cannot give it', () => {
    expect(chipsOf(choice({ ok: false, needs: ['Needs jammer', 'Needs plate'] }))).toEqual([['Needs jammer', 'warn']]);
  });

  it('marks a fight as caution, not threat, and drops a gain that repeats the label', () => {
    expect(chipsOf(choice({ label: 'Refit', gains: ['Fight', 'Refit'] }))).toEqual([['Fight', 'warn']]);
  });

  it('puts the odds on the consequence line, never on a chip', () => {
    expect(consequenceOf(choice({ tags: ['Even chance'] }))).toBe('It goes. · Even chance');
    expect(consequenceOf(choice({ risk: 'High risk · pursuit likely', tags: ['Even chance'] }))).toBe('It goes. · High risk · pursuit likely');
    expect(consequenceOf(choice({ ok: false, tags: ['Even chance'] }))).toBe('It goes.');
  });
});
