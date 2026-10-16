import { HUSH } from '../sim/desk';
import { CHITS_PER_CYRITE, TANK_MAX, refine } from '../sim/purse';
import { hunchOf, newDossier } from '../sim/calloway';
import { layPlaces, sightPlaces, sysById, SIGHT } from '../sim/chart';
import { dealSituations, layJobs } from '../sim/situations';
import { composeChart } from '../sim/experience';
import { layScatter } from '../sim/scatter';
import { newNotice } from '../sim/notice';
import { VERSION, type Journey } from '../sim/journey';
import { pending } from '../sim/endings';
import { stockLevels } from '../sim/bay';
import { SUPPLIES_MAX } from '../sim/breakout';
import { SCRAP_PRICE } from '../content/systems';
import { survivalOf } from '../content/survival';
import { atChapter } from '../sim/chapters';

// ── the journey save ──────────────────────────────────────────────────────
// A journey outlives a run, so it is kept in localStorage: written whenever
// the chart is open (between systems), at every dock (the hold as it was
// when the clamps went on) and after every answered card (only what the
// answer changed: sim/journey.ts bankAnswer). A load starts the current system's sortie from
// the top with what the save carries. Through the Threshold it is kept until
// the Severance file's fate is chosen, so a reload comes back to the choice. The save carries a version, and
// `migrate` brings an old one up to date, or refuses it if it cannot.
// Each write first keeps the save it replaces (if it still reads) as a safety
// copy, and a save that cannot be read is reported, not silently dropped, so
// the title can offer the copy. The save can also be exported to a file and
// imported back. Storage can be missing or refuse, so every read and write
// is guarded.

const KEY = 'wayward.journey';
/** The save before the latest write, kept while it still reads: the way back if the latest cannot be read. */
const BAK = 'wayward.journey.bak';
/** The journey as it stood at the last gate crossed: "Start this chapter again". */
const CH = 'wayward.journey.chapter';

/** Older saves, brought up to the current shape. Returns null for one that cannot be read. */
export function migrate(raw: unknown): Journey | null {
  if (!raw || typeof raw !== 'object') return null;
  const j = raw as Partial<Journey>;
  if (typeof j.version !== 'number' || j.version > VERSION) return null;
  if (!j.chart || !j.carry || !j.hunt || !Array.isArray(j.trail)) return null;
  // 1 → 2: the factions' notice (M4). A journey saved before it starts with nobody's notice.
  if (j.version < 2) j.notice = newNotice();
  if (!j.notice) return null;
  // 2 → 3: the ship's systems (M5): nothing to bring up now, their resources went with version 7.
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
  // 6 → 7: Cyrite is the fuel and the refit bay builds the ship (the refit bay, step 4). What was Krail in the tank, on the lanes,
  // in the rock and at the ports is Cyrite now; Krail is the bay's.
  if (j.version < 7) toCyrite(j as unknown as Old);
  // 7 → 8: survival modes. A journey saved before them was played as the game was designed: Prospector.
  // A newer-looking id the game does not know (a hand-edited file) falls back to the same.
  // 8 → 9: the comms desk paces itself across systems. A journey saved before it starts quiet.
  if (j.version < 9) j.carry.hush = HUSH;
  j.survival = survivalOf(j.survival).id;
  // 9 → 10: the overcharge reactor is gone. What was fitted for it comes out of the ship, and its Krail comes back.
  if (j.version < 10) retireOvercharge(j.carry as unknown as { krail: number; levels: Record<string, number> });
  // 10 → 11: wrecks are counted for each region (the third in one is a total loss). A journey saved before starts the region clean.
  if (j.version < 11) j.lost = 0;
  // 11 → 12: situations. A journey saved before them is dealt some, and the systems it has been through are done with.
  if (j.version < 12) dealSituations(j.chart, j.seed ?? 0);
  // 12 → 13: one purse and one stock. Krail and ore are chits now, and food and parts are supplies.
  if (j.version < 13) oneEconomy(j as unknown as Old);
  // 13 → 14: Cyrite is the one currency. The chits aboard come across at five to the Cyrite.
  if (j.version < 14) oneCurrency(j.carry as unknown as Record<string, number>);
  // 14 → 15: jump fluid. The Cyrite aboard fills the new drive tank first (it was the jump's fuel), and what is over is the purse.
  if (j.version < 15) driveTank(j.carry as unknown as Record<string, number>);
  // 15 → 16: jobs on the timetable. A journey saved before gets them in the columns still ahead.
  if (j.version >= 12 && j.version < 16) addJobs(j as Journey);
  // 16 → 17: every open system gets a sky (sim/experience.ts), dealt from the seed and the chart as it stands
  if (j.version < 17) composeChart(j.chart, j.seed ?? 0);
  j.version = VERSION;
  return j as Journey;
}

/**
 * The modules the overcharge took with it, and what each level cost in Krail when it was fitted
 * (fixed here: the web no longer has them, and a later change to prices must not change a refund).
 */
export const RETIRED: Readonly<Record<string, readonly number[]>> = {
  oc_coils: [40, 60, 80], oc_nova: [60], oc_overload: [60], oc_phase: [60], sy_core_mines: [40],
};

/** Lay the timetable's jobs into the columns ahead of the ship, in systems that have no alien moment promised. */
function addJobs(j: Journey): void {
  const c = j.chart;
  if (!c.situations) return;
  for (const id of layJobs(c, j.seed ?? 0, c.situations, sysById(c, j.at).col)) delete c.places[id];
}

function retireOvercharge(c: { krail: number; levels: Record<string, number> }): void {
  for (const [id, prices] of Object.entries(RETIRED)) {
    const had = c.levels?.[id] ?? 0;
    for (let lv = 0; lv < had; lv++) c.krail += prices[lv] ?? 0;
    if (c.levels) delete c.levels[id];
  }
}

/** Rewrites a price list in place: no ore, and food is supplies. */
function reprice(p: Record<string, number> | undefined | null): void {
  if (!p) return;
  if ('food' in p) { p.supplies = p.food!; delete p.food; }
  delete p.ore;
}

function oneCurrency(c: Record<string, number>): void {
  c.cyrite = (Number(c.cyrite) || 0) + Math.round((Number(c.chits) || 0) / CHITS_PER_CYRITE);
  delete c.chits;
}

function driveTank(c: Record<string, number>): void {
  const all = Math.max(0, Number(c.cyrite) || 0);
  const r = refine(0, 0, TANK_MAX, all);
  c.fuel = r.fuel;
  c.cyrite = r.purse;
}

function oneEconomy(j: Old): void {
  const c = j.carry as Record<string, number>;
  c.chits = (Number(c.chits) || 0) + (Number(c.krail) || 0) + (Number(c.ore) || 0) * SCRAP_PRICE;
  c.supplies = Math.min(SUPPLIES_MAX, (Number(c.food) || 0) + (Number(c.parts) || 0));
  for (const k of ['krail', 'ore', 'parts', 'food']) delete c[k];
  for (const s of j.chart.systems) {
    if ('food' in s) { s.supplies = s.food; delete s.food; }
    reprice((s.port as { prices?: Record<string, number> } | null | undefined)?.prices);
  }
  for (const m of ((j.chart as unknown as { market?: Array<{ mult: Record<string, number> }> }).market ?? [])) reprice(m.mult);
}

/** A journey from before Cyrite, where Krail was the fuel. */
type Old = {
  carry: Record<string, unknown>;
  chart: { systems: Array<Record<string, unknown>>; routes: Array<Record<string, unknown>>; places: Record<string, { reward: string }> };
  legs: Array<Record<string, unknown>>;
};
/** Krail for each unit of a system's old resource: a mark cost three to eight of them, about a tier-one module's worth. */
const KIT_KRAIL = 8;
const move = (o: Record<string, unknown> | null | undefined, from: string, to: string) => {
  if (o && from in o) { o[to] = o[from]; delete o[from]; }
};

function toCyrite(j: Old): void {
  move(j.carry, 'krail', 'cyrite');
  // the refit rail's progress comes back as Krail; the cards' upgrades stay fitted (the bay's modules are the same ids), with the stock fit
  j.carry.krail = Math.round(Number(j.carry.xp) || 0);
  delete j.carry.xp;
  j.carry.levels = { ...stockLevels(), ...(j.carry.levels as Record<string, number>) };
  // the four systems' resources (salvage, rig parts, signal kit, favours) went into the yard's modules: what was left is Krail now
  const kit = (j.carry.kit ?? {}) as Record<string, number>;
  j.carry.krail = Number(j.carry.krail) + Object.values(kit).reduce((a, v) => a + (Number(v) || 0), 0) * KIT_KRAIL;
  delete j.carry.kit;
  for (const s of j.chart.systems) {
    move(s, 'krail', 'cyrite');
    const prices = (s.port as { prices?: Record<string, unknown> } | null)?.prices;
    move(prices, 'krail', 'cyrite');
    if (prices) delete prices.refit;
  }
  for (const r of j.chart.routes) move(r, 'krail', 'cyrite');
  for (const p of Object.values(j.chart.places)) if (p.reward === 'krail') p.reward = 'cyrite';
  for (const l of j.legs ?? []) { move(l, 'krailIn', 'cyriteIn'); move(l, 'krailOut', 'cyriteOut'); }
}

/** The last load found a save it could not read (corrupt, or from a newer game). */
let unreadable = false;
export const saveUnreadable = (): boolean => unreadable;

export function loadJourney(): Journey | null {
  try {
    const raw = localStorage.getItem(KEY);
    unreadable = false;
    if (!raw) return null;
    const j = migrate(JSON.parse(raw));
    unreadable = !j;
    return j;
  } catch {
    unreadable = true;
    return null;
  }
}

/** The safety copy, made the current save (for when the latest could not be read). Null if there is none or it cannot be read either. */
export function restoreJourney(): Journey | null {
  try {
    const raw = localStorage.getItem(BAK);
    const j = raw ? migrate(JSON.parse(raw)) : null;
    if (!j) return null;
    localStorage.setItem(KEY, JSON.stringify(j));
    unreadable = false;
    return j;
  } catch {
    return null;
  }
}

/** Whether a safety copy is there to restore. */
export function hasBackup(): boolean {
  try {
    return !!localStorage.getItem(BAK);
  } catch {
    return false;
  }
}

/** The chapter snapshot, if there is one that reads. */
export function chapterSave(): Journey | null {
  try {
    const raw = localStorage.getItem(CH);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** The chapter snapshot made the current save: the chapter played again from its gate. Null if there is none. */
export function restartChapter(): Journey | null {
  const j = chapterSave();
  if (j) saveJourney(j);
  return j;
}

/** Ask the browser not to clear the saves when space runs short (once; it may say no). */
let asked = false;
function keep(): void {
  if (asked) return;
  asked = true;
  try {
    void navigator.storage?.persist?.().catch(() => {});
  } catch {
    // not offered here
  }
}

export function saveJourney(j: Journey): void {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) {
      try {
        JSON.parse(prev);
        localStorage.setItem(BAK, prev);
      } catch {
        // the one being replaced is already broken: the copy already there stays
      }
    }
    if (j.status === 'over' && !pending(j)) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(BAK);
      localStorage.removeItem(CH);
    } else {
      const text = JSON.stringify(j);
      localStorage.setItem(KEY, text);
      // standing at a gate just crossed: the chapter's start, kept beside the safety copy
      if (atChapter(j)) {
        try { localStorage.setItem(CH, text); } catch { /* no room for it: the save itself went in */ }
      }
      unreadable = false;
      keep();
    }
  } catch {
    // storage refused: the journey lasts as long as the tab
  }
}

export function clearJourney(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BAK);
    localStorage.removeItem(CH);
  } catch {
    // nothing to clear
  }
}

/** The journey as text, for a file the player keeps. */
export const exportJourney = (j: Journey): string => JSON.stringify(j);

/** A journey from an exported file, saved as the current one. Null if the text is not a save this game can read. */
export function importJourney(text: string): Journey | null {
  let j: Journey | null = null;
  try {
    j = migrate(JSON.parse(text));
  } catch {
    return null;
  }
  if (!j) return null;
  saveJourney(j);
  return j;
}
