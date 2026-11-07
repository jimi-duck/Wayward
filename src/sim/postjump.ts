import type { Exp } from '../content/profiles';
import { BASE_PRICES } from '../content/systems';
import type { SortieDef } from './breakout';
import { WEATHER } from './encounters';

// ── the first system past Cerro ───────────────────────────────────────────
// The level the first jump lands in (docs/POSTJUMP.md). A mined-out industrial
// system that still runs: the company's audit dock stands off the course, a
// small supply depot sits on the way to the Jump Gate, the rock is worked
// over, and ships still go about their trade (sim/traffic.ts).
//
// The objective follows the story and nothing else. Until Sam's code has
// lifted the owner lock (`ship_stolen`, set by the `story_sam` card) the course
// is set for the audit dock; the moment it is, for the Jump Gate. One flag, one
// objective: nothing here keeps a second state, so a saved and reloaded journey
// picks the right one up from its flags.

/** What the dock and the depot are called on the HUD and the scope. */
export const AUDIT_DOCK = 'Kellern Audit Dock';
export const SUPPLY_DEPOT = 'Frontier Supply Depot';

/** The flag that lifts the owner lock (content/story.ts `story_sam`): from here on the course is the Jump Gate. */
const LOCK_LIFTED = 'ship_stolen';
export const lockLifted = (flags: ReadonlySet<string> | readonly string[]): boolean => (flags instanceof Set ? flags.has(LOCK_LIFTED) : (flags as readonly string[]).includes(LOCK_LIFTED));

/**
 * The repaint (owner, 5 November 2026). Sam's code lifts the lock and sets the call sign; the paint is another matter. A friend of
 * Sam's runs the paint bay at the Frontier Supply Depot and does the hull for nothing, so the course is the depot until she has been
 * there. `paint_due` is banked with the code, `hull_repainted` at the depot. A save that has the lock lifted and no `paint_due` (made
 * before this) is repainted already, so no old save is sent back to the depot and the flag set needs no new save version.
 */
export const PAINT_DUE = 'paint_due';
export const PAINTED = 'hull_repainted';
/** Set when Ned's yard has renamed and reprogrammed her: the call sign is OB-7731-A until then, WAYWARD after. */
export const RENAMED = 'ship_renamed';
const has = (flags: ReadonlySet<string> | readonly string[], f: string): boolean => (flags instanceof Set ? flags.has(f) : (flags as readonly string[]).includes(f));
/** The hull wears the WAYWARD's paint: the depot did it, or the save is older than the paint bay. */
export const painted = (flags: ReadonlySet<string> | readonly string[]): boolean => has(flags, PAINTED) || (has(flags, LOCK_LIFTED) && !has(flags, PAINT_DUE));
/** The lock is lifted and the hull is still the company's grey: the objective is the paint bay. */
export const paintDue = (flags: ReadonlySet<string> | readonly string[]): boolean => lockLifted(flags) && !painted(flags);
/** Whose bay it is: Sam's friend, who does the work himself. */
export const PAINTER = 'Ned Varga';
/** Ned on the radio when the ship comes up on his yard: hold her in the ring and he does the rest. */
export const PAINT_LINE = '“You must be Juno. Ned here. Sam said you’d come, and I owe him one. Ease her into the ring and I’ll do the rest. No charge.”';
/** The pop-up card once the work is done (content/story.ts `story_yard_done`). */
export const YARD_DONE = 'story_yard_done';
export const PAINT_NOTICE = ['Reprogrammed', 'Owner lock stripped'] as const;
/** The special moment after the work (owner 2026-11-06): a second notice, then the title card, with the camera's pan as she flies out of the front. Seconds since she left the ring. */
export const YARD_REPAINT_AT = 2.8;
export const YARD_REPAINT = ['Repainted', 'Company grey to yellow'] as const;
export const YARD_TITLE_AT = 4.2;
/**
 * Ned's yard is done on autopilot (owner 2026-11-06): once she is in the ring the helm is taken, she is flown to the pad and held
 * while lightning zaps the hull and the HUD glitches (`YARD_ZAP` seconds), then the screen goes dark, reboots with the new colours
 * (the rename reveal), and the autopilot flies her out of the front, handing the helm back `YARD_AUTO_END` seconds after the reboot.
 * She starts to move out `YARD_OUT_AT` seconds after it. The HUD is dark until `YARD_DARK`, then flickers back until `YARD_BOOT`.
 */
export const YARD_ZAP = 3.6;
export const YARD_OUT_AT = 1.4;
export const YARD_AUTO_END = 5.6;
export const YARD_DARK = 0.3;
export const YARD_BOOT = 1.2;
/** After the zaps the ship shuts down: a dark screen with a rebooting loader (ui/hud.ts reboot) for this long, then the new colours and name. */
export const YARD_REBOOT = 2.8;
/** The explanation card comes this long after the work (the reveal has played by then), and the archive's message this long after the work. */
export const PAINT_CARD = 10.5;
export const PAINT_WAKE = 8.4;

/** The straight run from the arrival to the Jump Gate, in units: 10 km, about 25 s flat out. */
const POSTJUMP_LANE = 1000;

/**
 * The sky: a worked-over scrap expanse. A gantry works, a breaker field and a graveyard of hulls are the spent
 * mine's leavings, a Cyrite seam is what is left in it, and a passage is the far traffic that still crosses.
 */
const POSTJUMP_SKY: Exp = { x: 'scrap', f: ['works', 'breakers', 'graveyard', 'seam', 'passage'] };

/** The first level's own numbers: a worked-out field (thin, with a few veined rocks left), a slow pursuit, no blockade. */
const WORKED = { density: 0.6, rich: 0.1, pace: { first: 150, calm: 30 }, heatRate: 0.7 } as const;

/**
 * What the first system past Cerro is, laid over what the chart dealt it. The chart keeps its row (its name, holder,
 * lane to the next system, and whatever it deals of a place, a situation, a blockade or a hunt); this is the level's
 * shape: the company's dock and the depot are always here, whatever the chart said of a port, the Jump Gate stands
 * a straight run off, the rock is worked over, and the pursuit starts late and slow.
 */
export function postJump(def: SortieDef): SortieDef {
  return {
    ...def,
    first: true,
    audit: AUDIT_DOCK,
    lane: POSTJUMP_LANE,
    port: { name: SUPPLY_DEPOT, prices: def.port?.prices ?? { ...BASE_PRICES } },
    density: Math.min(def.density, WORKED.density),
    rich: Math.min(def.rich, WORKED.rich),
    pace: { ...WORKED.pace },
    heatRate: Math.min(def.heatRate, WORKED.heatRate),
    exp: POSTJUMP_SKY,
    // no anomalies here (owner, 23 October 2026): no storm, nebula or gravity well, as an event or as the system's place
    calm: true,
    place: def.place && WEATHER.has(def.place.plays) ? null : def.place,
  };
}

/**
 * After Sam's code, in seconds of play: Sam names the depot (only if the tank is short), the company reports the
 * hull stolen, a few seconds on the Wanted note explains it (once a profile, main.ts), and the first Custody hull comes. Nothing hunts her before the lock lifts (sim/world.ts `stolen`).
 */
export const STOLEN = { sam: 20, notice: 38, explain: 4, pursuit: 70 } as const;
/** Sam's line once the registry card is closed: the short tank and where to fill it (the depot, or the rock when she cannot pay). */
export const STOLEN_SAM = '“One more thing, your tank’s nearly dry. Buy fluid at the Frontier depot or mine some Cyrite on the way. Fill up, then the gate.”';
export const STOLEN_SAM_POOR = '“One more thing, your tank’s nearly dry and you can’t pay for fluid. Mine the veined rock on the way. The refinery fills the tank first.”';
/** The amber notice that tells her the pursuit has started, and why. */
/** The depot's word on the approach, on the radio (no card): what it sells, and how to dock. */
export const DEPOT_LINE = '“Depot control. Fuel, plating and stores at posted prices. Slow into the ring to dock.”';
export const STOLEN_NOTICE = ['Hull reported stolen', 'Kellern has called in Custody'] as const;

/** The objective is the paint bay: the first system past Cerro, the lock lifted, the hull not yet repainted. */
export function paintAt(w: { bk: { yard: unknown } | null; flags: ReadonlySet<string> }): boolean {
  return !!w.bk?.yard && paintDue(w.flags);
}

/** The objective is the tank, bought at the depot or mined: the first system past Cerro, the lock lifted, a tank short of the jump, not docked yet, and Cyrite to buy with. */
export function refuelAt(w: { bk: { def: { first?: boolean }; port: unknown; docks: number } | null; flags: ReadonlySet<string>; fuel: number; jumpCost: number; cyrite: number; fluidPrice: number }): boolean {
  const b = w.bk;
  return !!b?.def.first && !!b.port && b.docks === 0 && painted(w.flags) && w.fuel < w.jumpCost && w.cyrite >= w.fluidPrice;
}
