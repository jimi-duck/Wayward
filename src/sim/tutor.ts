import { cost, fee } from './bay';
import type { World } from './world';

// ── the first minutes ─────────────────────────────────────────────────────
// An onboarding level, short and plain: one rock, one upgrade, one shot, and
// the tank is full. The pilot lasers a single violet rock set close ahead
// (it pays Cyrite, the jump's fuel and the upgrade's price in one), opens the bay and fits the
// torpedo bay (the ship starts without it, so the first upgrade is the one
// that matters), then shoots one ship with the new torpedoes. After that the
// jump is in reach and the run goes on as it always did. Each step is a
// thing the game already does; the tutor only sets one up (a rock, a purse,
// a ship) and watches for it. Nothing locks, and Skip ends it. Plain data,
// so a test flies it.

export type LessonId = 'mine' | 'bay' | 'shoot';

/** Where a lesson points: a place in the world and how close counts. */
export interface Mark { x: number; z: number; r: number; name: string }

export interface Tutor {
  steps: LessonId[];
  i: number;
  /** The first step has been set up. */
  begun: boolean;
  /** What the step watches: a stock level, a count. */
  base: number;
  rockId: number;
  alienId: number;
  /** The step's own clock (s). */
  t: number;
  /** Set when the last step is done or it was skipped; the app saves that. */
  done: boolean;
  skipped: boolean;
  /** Seconds to keep a finished step on screen before the next. */
  linger: number;
}

/** What the HUD reads for the step in hand. */
export interface Lesson {
  id: LessonId;
  /** Which step of how many. */
  n: number;
  of: number;
  /** English, one verb phrase; the HUD runs it through t(). */
  line: string;
  /** Which hint to show (the HUD has the words for each device). */
  hint: 'fire' | 'bay' | 'dock' | 'fit';
  mark: Mark | null;
  /** 0 to 1 */
  progress: number;
}

/** The lesson rock and ship sit this far ahead (units); rock wraps at 120 from the ship, so stay inside. */
const ROCK_AT = 52;
const SHIP_AT = 85;
const LINGER = 1.2;
/** The torpedo bay: the one node the bay offers in the lesson. */
export const LESSON_NODE = 'tp_bay';
/** Cyrite over the price in the hold when the bay step begins (the rock pays some too). */
const SPARE = 1;

/** The Story's depot, set this far ahead and aside at the start: a short hop once the first ship is down. */
const DEPOT_AT = 170;
const DEPOT_SIDE = 90;

/** The Story flies to a work bay for its one upgrade, after the first kill; the Arcade fits it in flight, before. */
export function newTutor(story = false): Tutor {
  return { steps: story ? ['mine', 'shoot', 'bay'] : ['mine', 'bay', 'shoot'], i: 0, begun: false, base: 0, rockId: -1, alienId: -1, t: 0, done: false, skipped: false, linger: 0 };
}

/** The step in hand, or null when the training is over (or none is running). */
export const stepOf = (w: World): LessonId | null => (w.tutor && !w.tutor.done ? w.tutor.steps[w.tutor.i]! : null);

/** A point `d` units from the ship along its nose, `side` to the left. */
function ahead(w: World, d: number, side = 0): { x: number; z: number } {
  const s = w.ship, c = Math.cos(s.heading), n = -Math.sin(s.heading);
  return { x: s.x + c * d - n * side, z: s.z + n * d + c * side };
}

/** The stock the mine step watches: the one Cyrite stock. */
const stock = (w: World): number => w.cyrite;
const fitted = (w: World): number => Object.values(w.levels).reduce((a, b) => a + b, 0);

function layRock(w: World, tu: Tutor): void {
  const p = ahead(w, ROCK_AT, 0);
  const r = w.field.spawn(0, p.x, p.z, 0, 0, 'rich', 0.55, 0);
  r.age = 10;
  tu.rockId = r.id;
}

function layShip(w: World, tu: Tutor): void {
  const p = ahead(w, SHIP_AT, 40);
  tu.alienId = w.spawnHostile('scout', { x: p.x, y: 0, z: p.z }).id;
}

function begin(w: World, tu: Tutor): void {
  const id = tu.steps[tu.i]!;
  tu.t = 0;
  if (id === 'mine') {
    // the ship leaves without its torpedo bay, and the tank is short by what the rock holds
    if (w.bk) { const lv = { ...w.levels }; delete lv[LESSON_NODE]; w.setLevels(lv); w.cyrite = Math.max(0, w.jumpCost - 12); }
    tu.base = stock(w);
    layRock(w, tu);
    // the depot sits close by from the start, so the way to the bay is short
    const port = w.bk?.port;
    if (port) { const p = ahead(w, DEPOT_AT, -DEPOT_SIDE); port.x = p.x; port.z = p.z; }
  } else if (id === 'bay') {
    tu.base = fitted(w);
    // the price, and a little over, so the first upgrade is only a press away
    w.cyrite = Math.max(w.cyrite, w.bk ? bayPrice() + SPARE : 6);
  } else {
    tu.base = w.kills;
    layShip(w, tu);
  }
}

/** What the torpedo bay costs in the lesson's bay (price and fee together). */
function bayPrice(): number {
  return cost(LESSON_NODE, 1, false) + fee(LESSON_NODE, 1, false);
}

/** Where step `tu.i` points, and how far along it is. */
export function lessonOf(w: World): Lesson | null {
  const tu = w.tutor;
  if (!tu || tu.done) return null;
  const id = tu.steps[tu.i]!;
  const base = { id, n: tu.i + 1, of: tu.steps.length };
  if (id === 'mine') {
    const rock = w.field.rocks.find((r) => r.id === tu.rockId);
    const got = stock(w) > tu.base;
    const mark = rock ? { x: rock.x, z: rock.z, r: rock.r + 6, name: 'Violet rock' } : null;
    return { ...base, line: rock || !got ? 'Laser the violet rock' : 'Fly through the drops to collect them', hint: 'fire', mark, progress: got ? 1 : rock ? 0.1 + 0.7 * (1 - rock.hp / rock.maxHp) : 0.85 };
  }
  if (id === 'bay') {
    const port = w.bk?.port;
    if (port) return { ...base, line: w.docked ? 'Fit the torpedo bay' : 'Fly to the work bay', hint: w.docked ? 'fit' : 'dock', mark: { x: port.x, z: port.z, r: port.r, name: port.name }, progress: 0 };
    return { ...base, line: 'Choose an upgrade', hint: 'bay', mark: null, progress: 0 };
  }
  const a = w.aliens.find((x) => x.id === tu.alienId);
  return { ...base, line: 'Shoot the ship', hint: 'fire', mark: a ? { x: a.x, z: a.z, r: 0, name: 'Gutter ship' } : null, progress: a ? 1 - a.hp / Math.max(1, a.maxHp) : 1 };
}

/** Is the step in hand done? */
function met(w: World, tu: Tutor): boolean {
  const id = tu.steps[tu.i]!;
  if (id === 'mine') return !w.field.rocks.some((r) => r.id === tu.rockId) && stock(w) > tu.base;
  if (id === 'bay') return fitted(w) > tu.base && w.phase !== 'bay';
  return w.kills > tu.base;
}

/** One step of the tutor: keep the quiet going, set the next thing up, watch for it done. */
export function stepTutor(w: World, dt: number): void {
  const tu = w.tutor;
  if (!tu || tu.done || !w.alive) return;
  // the first minutes are quiet: no hunters and no cards until the ship has been taught
  if (w.bk) {
    w.bk.nextPursuit = Math.max(w.bk.nextPursuit, w.runTime + 30);
    w.cardNext = Math.max(w.cardNext, w.runTime + 30);
    w.portCalled = true;
  }
  if (!tu.begun) { tu.begun = true; begin(w, tu); }
  if (tu.linger > 0) {
    tu.linger -= dt;
    if (tu.linger > 0) return;
    tu.i++;
    if (tu.i >= tu.steps.length) return finish(w, tu);
    return begin(w, tu);
  }
  tu.t += dt;
  const id = tu.steps[tu.i]!;
  // if the rock is gone and nothing fell out, lay another; if the ship slipped away, send another
  if (id === 'mine' && !w.field.rocks.some((r) => r.id === tu.rockId) && stock(w) <= tu.base && !w.pickups.length) layRock(w, tu);
  if (id === 'shoot' && tu.t > 2 && !w.aliens.some((a) => a.id === tu.alienId) && w.kills <= tu.base) layShip(w, tu);
  if (met(w, tu)) tu.linger = LINGER;
}

/** Run to the end: the tank holds the jump, the quiet lifts a little later, and the app is told. */
function finish(w: World, tu: Tutor): void {
  tu.done = true;
  if (!w.bk) return;
  w.cyrite = Math.max(w.cyrite, w.jumpCost);
  w.bk.nextPursuit = Math.max(w.bk.nextPursuit, w.runTime + 25);
  w.cardNext = Math.min(w.cardNext, w.runTime + 40);
}

/** The player's skip: the torpedo bay is fitted all the same, so the ship is as the run expects it. */
export function skipTutor(w: World): void {
  const tu = w.tutor;
  if (!tu || tu.done) return;
  tu.skipped = true;
  if (w.bk && !w.levels[LESSON_NODE]) w.setLevels({ ...w.levels, [LESSON_NODE]: 1 });
  finish(w, tu);
}
