import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VERSION } from '../src/sim/journey';

// The docs are how a change starts (CLAUDE.md), so the facts they state as current must be the code's.

describe('docs', () => {
  it('PLAN.md names the current save version', () => {
    expect(readFileSync('docs/PLAN.md', 'utf8')).toContain(`The journey save is at version ${VERSION} `);
  });
});
