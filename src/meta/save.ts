import { layPlaces, sightPlaces, SIGHT } from '../sim/chart';
import { noKit } from '../sim/modules';
import { newNotice } from '../sim/notice';
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
  if (!j.chart || !j.carry || !j.hunt || !Array.isArray(j.trail)) return null;
  // 1 → 2: the factions' notice (M4). A journey saved before it starts with nobody's notice.
  if (j.version < 2) j.notice = newNotice();
  if (!j.notice) return null;
  // 2 → 3: the ship's systems (M5). A journey saved before it has earned nothing for them and fitted no modules.
  if (j.version < 3) j.carry.kit = noKit();
  if (!j.carry.kit) return null;
  // 3 → 4: places (M7). A journey saved before them gets the ones its seed would have dealt, seen from where it has been.
  if (j.version < 4) {
    j.chart.places = layPlaces(j.chart, j.seed ?? 0);
    for (const id of j.chart.visited) sightPlaces(j.chart, id, SIGHT);
  }
  if (!j.chart.places) return null;
  j.version = VERSION;
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
