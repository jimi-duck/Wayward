import { cost } from './bay';
import { CARD_BY_ID } from './comms';
import { t } from '../i18n';
import type { World } from './world';

// ── the first minutes ─────────────────────────────────────────────────────
// An onboarding level, short and plain: one rock, one upgrade, one shot, and
// the tank is full. The pilot lasers a single Cyrite rock set close ahead
// (the refinery sends what it gives to the drive tank, which starts short by
// that much), flies to the work bay and fits the torpedo bay (the ship
// starts without it, so the first upgrade is the one that matters; the purse
// holds its price), then shoots one ship with the torpedoes it just earned.
// After that the jump is in reach and
// the run goes on as it always did. Each step is a thing the game already
// does; the tutor only sets one up (a rock, a purse, a ship) and watches for
// it. Nothing locks, and Skip ends it. Plain data, so a test flies it.

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
  /** The pirates of the shoot step (two of them), and the radio lines said so far. */
  pirates: number[];
  billed: boolean;
  toll: boolean;
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
  hint: 'fire' | 'bay' | 'dock' | 'fit' | 'torpedo';
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
/** Cyrite over the price in the purse when the bay step begins. */
const SPARE = 1;

/** The Story's depot, set this far ahead and aside at the start: a short hop once the rock is mined. */
const DEPOT_AT = 170;
/** The training's lane entrance, this far ahead (units, 10 km): the real one is far off, and the lesson is not the trip. */
const TRAIN_LANE = 1000;
const DEPOT_SIDE = 90;

/** Mine, upgrade, shoot with it. The Story flies to a work bay for the upgrade; the Arcade fits it in flight. */
export function newTutor(): Tutor {
  return { steps: ['mine', 'bay', 'shoot'], i: 0, begun: false, base: 0, rockId: -1, alienId: -1, t: 0, done: false, skipped: false, linger: 0, pirates: [], billed: false, toll: false };
}

/** Training is at its upgrade: the one thing on offer at the bay is the torpedo bay (the shop reads this to lock the rest). */
export const needsTorpedoFit = (w: World): boolean => stepOf(w) === 'bay';

/** The step in hand, or null when the training is over (or none is running). */
export const stepOf = (w: World): LessonId | null => (w.tutor && !w.tutor.done ? w.tutor.steps[w.tutor.i]! : null);

/** A point `d` units from the ship along its nose, `side` to the left. */
function ahead(w: World, d: number, side = 0): { x: number; z: number } {
  const s = w.ship, c = Math.cos(s.heading), n = -Math.sin(s.heading);
  return { x: s.x + c * d - n * side, z: s.z + n * d + c * side };
}

/** What the mine step watches: everything refined, tank and purse together. */
const stock = (w: World): number => w.cyrite + w.fuel;
const fitted = (w: World): number => Object.values(w.levels).reduce((a, b) => a + b, 0);

function layRock(w: World, tu: Tutor): void {
  const p = ahead(w, ROCK_AT, 0);
  const r = w.field.spawn(0, p.x, p.z, 0, 0, 'rich', 0.55, 0);
  r.age = 10;
  tu.rockId = r.id;
}

/** Pirates in the shoot step: two, so a win is a win, and the chase that follows is not a surprise. */
const PIRATES = 2;

function layShip(w: World, tu: Tutor): void {
  tu.pirates = tu.pirates.filter((id) => w.aliens.some((a) => a.id === id));
  while (tu.pirates.length < PIRATES - (w.kills - tu.base)) {
    const p = ahead(w, SHIP_AT + 18 * tu.pirates.length, 40 - 70 * tu.pirates.length);
    tu.pirates.push(w.spawnHostile('scout', { x: p.x, y: 0, z: p.z }).id);
  }
  tu.alienId = tu.pirates[0] ?? -1;
  if (!tu.toll) {
    tu.toll = true;
    w.events.push({ type: 'ping', id: 'train_toll', from: t('Raiders'), caller: 'unknown', text: t('“Cargo or a toll, hauler. Your pick.”'), moment: 'calm', system: w.sortie.name });
  }
}

function begin(w: World, tu: Tutor): void {
  const id = tu.steps[tu.i]!;
  tu.t = 0;
  if (id === 'mine') {
    // the ship leaves without its torpedo bay, and the tank is short by what the rock holds
    if (w.bk) { const lv = { ...w.levels }; delete lv[LESSON_NODE]; w.setLevels(lv); w.fuel = Math.max(0, w.jumpCost - 12); w.cyrite = 0; }
    tu.base = stock(w);
    layRock(w, tu);
    // the depot sits close by from the start, so the way to the bay is short
    const port = w.bk?.port;
    if (port) { const p = ahead(w, DEPOT_AT, -DEPOT_SIDE); port.x = p.x; port.z = p.z; }
    if (w.bk) { const p = ahead(w, TRAIN_LANE); w.bk.def = { ...w.bk.def, lane: TRAIN_LANE }; w.bk.lane.x = p.x; w.bk.lane.z = p.z; }
  } else if (id === 'bay') {
    tu.base = fitted(w);
    // the price, and a little over, so the first upgrade is only a press away
    w.cyrite = Math.max(w.cyrite, w.bk ? bayPrice() + SPARE : 6);
  } else {
    // the hull waits: it comes once the ship is out past the depot's field
    tu.base = w.kills;
    tu.alienId = -1;
  }
}

/** What the torpedo bay costs in the lesson's bay. */
function bayPrice(): number {
  return cost(LESSON_NODE, 1, false);
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
    const mark = rock ? { x: rock.x, z: rock.z, r: rock.r + 6, name: 'Cyrite rock' } : null;
    return { ...base, line: rock || !got ? 'Laser the Cyrite rock' : 'Fly through the drops to collect them', hint: 'fire', mark, progress: got ? 1 : rock ? 0.1 + 0.7 * (1 - rock.hp / rock.maxHp) : 0.85 };
  }
  if (id === 'bay') {
    const port = w.bk?.port;
    if (port) return { ...base, line: w.docked ? 'Fit the torpedo bay' : 'Fly to the work bay', hint: w.docked ? 'fit' : 'dock', mark: { x: port.x, z: port.z, r: port.r, name: port.name }, progress: 0 };
    return { ...base, line: 'Choose an upgrade', hint: 'bay', mark: null, progress: 0 };
  }
  const a = w.aliens.find((x) => x.id === tu.alienId) ?? w.aliens.find((x) => tu.pirates.includes(x.id));
  return { ...base, line: 'Shoot the raiders with torpedoes', hint: 'torpedo', mark: a ? { x: a.x, z: a.z, r: 0, name: 'Raider' } : null, progress: a ? 1 - a.hp / Math.max(1, a.maxHp) : 1 };
}

/** Is the step in hand done? */
function met(w: World, tu: Tutor): boolean {
  const id = tu.steps[tu.i]!;
  if (id === 'mine') return !w.field.rocks.some((r) => r.id === tu.rockId) && stock(w) > tu.base;
  if (id === 'bay') return fitted(w) > tu.base && w.phase !== 'bay';
  return w.kills >= tu.base + PIRATES;
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
  if (id === 'shoot' && !w.safe && (tu.alienId < 0 || (tu.t > 2 && tu.pirates.some((p) => !w.aliens.some((a) => a.id === p)))) && w.kills < tu.base + PIRATES) layShip(w, tu);
  // the work bay: Tam, and the company's cut, as the ship comes up to it
  const port = w.bk?.port;
  if (id === 'bay' && port && !tu.billed && w.phase === 'play' && Math.hypot(w.ship.x - port.x, w.ship.z - port.z) < port.r + 120) {
    const card = CARD_BY_ID.story_bay;
    tu.billed = true;
    if (card) w.openComms(card);
  }
  if (met(w, tu)) tu.linger = LINGER;
}

/** Run to the end: the tank holds the jump, the quiet lifts a little later, and the app is told. */
function finish(w: World, tu: Tutor): void {
  tu.done = true;
  if (!w.bk) return;
  w.fuel = Math.max(w.fuel, w.jumpCost);
  w.cardNext = Math.min(w.cardNext, w.runTime + 40);
  // the quiet is over: more raiders are coming, and the contract desk will not send cover
  w.startChase();
  w.events.push({ type: 'ping', id: 'train_escort', from: t('Contract desk · 08-441'), caller: 'office', text: t('“Escort cover is not included in Contract 08-441. Continue at operator discretion.”'), moment: 'calm', system: w.sortie.name });
}

/** The player's skip: the torpedo bay is fitted all the same, so the ship is as the run expects it. */
export function skipTutor(w: World): void {
  const tu = w.tutor;
  if (!tu || tu.done) return;
  tu.skipped = true;
  if (w.bk && !w.levels[LESSON_NODE]) w.setLevels({ ...w.levels, [LESSON_NODE]: 1 });
  finish(w, tu);
}
