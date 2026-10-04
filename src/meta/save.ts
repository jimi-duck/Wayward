import { VERSION, type Journey } from '../sim/journey';

// ── the journey save ──────────────────────────────────────────────────────
// A journey outlives a run, so it is kept in localStorage: written whenever
// the chart is open (between systems) and at every dock (the hold as it was
// when the clamps went on). A load starts the current system's sortie from
// the top with what the save carries. The save carries a version, and
// `migrate` brings an old one up to date, or refuses it if it cannot.
// Storage can be missing or refuse, so every read and write is guarded.

const KEY = 'wayward.journey';

/** Older saves, brought up to the current shape. Returns null for one that cannot be read. */
export function migrate(raw: unknown): Journey | null {
  if (!raw || typeof raw !== 'object') return null;
  const j = raw as Partial<Journey>;
  if (typeof j.version !== 'number' || j.version > VERSION) return null;
  // version 1 is the first: nothing to migrate yet
  if (!j.chart || !j.carry || !j.hunt || !Array.isArray(j.trail)) return null;
  return j as Journey;
}

export function loadJourney(): Journey | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveJourney(j: Journey): void {
  try {
    if (j.status === 'over') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(j));
  } catch {
    // storage refused: the journey lasts as long as the tab
  }
}

export function clearJourney(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
