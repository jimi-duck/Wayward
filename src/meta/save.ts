import { hunchOf, newDossier } from '../sim/calloway';
import { layPlaces, sightPlaces, SIGHT } from '../sim/chart';
import { layScatter } from '../sim/scatter';
import { noKit } from '../sim/modules';
import { newNotice } from '../sim/notice';
import { VERSION, type Journey } from '../sim/journey';
import { pending } from '../sim/endings';

// ── the journey save ──────────────────────────────────────────────────────
// A journey outlives a run, so it is kept in localStorage: written whenever
// the chart is open (between systems) and at every dock (the hold as it was
// when the clamps went on). A load starts the current system's sortie from
// the top with what the save carries. Through the Threshold it is kept until
// the Severance file's fate is chosen, so a reload comes back to the choice. The save carries a version, and
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
  // 4 → 5: Calloway's file (M4). She starts it now, and reads the route already flown.
  if (j.version < 5) { j.calloway = newDossier(); j.hunt.hunch = hunchOf(j.chart, j.trail); }
  if (!j.calloway) return null;
  // 5 → 6: the factions on the move (M7). A journey saved before keeps its one region, and gets its Drift fleet and its Thren now.
  if (j.version < 6) layScatter(j.chart, j.seed ?? 0);
  if (!j.chart.thren || !j.chart.drifts || !j.chart.raid) return null;
  // 6 → 7: Cyrite is the fuel (the refit bay, step 4). What was Krail in the tank, on the lanes, in the rock and at the ports is Cyrite now;
  // Krail is the bay's, and starts at nothing.
  if (j.version < 7) toCyrite(j as unknown as Old);
  j.version = VERSION;
  return j as Journey;
}

/** A journey from before Cyrite, where Krail was the fuel. */
type Old = {
  carry: Record<string, unknown>;
  chart: { systems: Array<Record<string, unknown>>; routes: Array<Record<string, unknown>>; places: Record<string, { reward: string }> };
  legs: Array<Record<string, unknown>>;
};
const move = (o: Record<string, unknown> | null | undefined, from: string, to: string) => {
  if (o && from in o) { o[to] = o[from]; delete o[from]; }
};

function toCyrite(j: Old): void {
  move(j.carry, 'krail', 'cyrite');
  j.carry.krail = 0;
  for (const s of j.chart.systems) {
    move(s, 'krail', 'cyrite');
    move((s.port as { prices?: Record<string, unknown> } | null)?.prices, 'krail', 'cyrite');
  }
  for (const r of j.chart.routes) move(r, 'krail', 'cyrite');
  for (const p of Object.values(j.chart.places)) if (p.reward === 'krail') p.reward = 'cyrite';
  for (const l of j.legs ?? []) { move(l, 'krailIn', 'cyriteIn'); move(l, 'krailOut', 'cyriteOut'); }
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
    if (j.status === 'over' && !pending(j)) localStorage.removeItem(KEY);
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
