// ── a job offer's answers: one quiet line under each label ────────────────
// The hint, then what the answer brings, what it costs and its odds, as plain words joined by a middle dot instead of a
// row of outlined chips. A fact the terms strip above already states for this same answer is dropped: an exact match
// only, so a different amount, unit or condition always stays.

/** The parts of an answer's line, in order, without blanks, repeats or anything in `stated`. */
export function jobLine(parts: readonly string[], stated: readonly string[] = []): string[] {
  const seen = new Set(stated.map((x) => x.trim()));
  const out: string[] = [];
  for (const p of parts) {
    const x = p.trim();
    if (!x || seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}
