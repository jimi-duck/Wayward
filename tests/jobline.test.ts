import { describe, expect, it } from 'vitest';
import { jobLine } from '../src/ui/jobline';

describe('a job answer’s line', () => {
  it('drops an exact repeat of what the terms strip states for this answer, and nothing else', () => {
    expect(jobLine(['Avoid detection.', '−4 Cyrite', '+6 Cyrite'], ['−4 Cyrite'])).toEqual(['Avoid detection.', '+6 Cyrite']);
  });
  it('keeps a different amount, unit or condition', () => {
    expect(jobLine(['+27 Cyrite', 'Up to 27 Cyrite if unseen', '27 Krail'], ['Up to 27 Cyrite'])).toEqual(['+27 Cyrite', 'Up to 27 Cyrite if unseen', '27 Krail']);
  });
  it('drops blanks and repeats within the line, keeping the order', () => {
    expect(jobLine(['', 'Risky', ' Risky ', '+6 Cyrite'])).toEqual(['Risky', '+6 Cyrite']);
  });
});
