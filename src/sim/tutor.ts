import { CARD_BY_ID } from './comms';
import { CREDIT_START, HOLD, HOLD_AT_START, QUOTA, ROCK_LOAD, type Cargo } from './contract';
import { t } from '../i18n';
import { newId } from './ids';
import type { World } from './world';

// ── the first minutes ─────────────────────────────────────────────────────
// An onboarding level, short and plain, and the first act of Contract 08-441
// (docs/ONBOARDING.md). The ship starts in flight with 800 of the 1,000 Cyrite
// in the hold. The pilot lasers a rock set close ahead, flies to the work bay,
// which does not take the load: it shows the account (the company's charges, a
// projection of the payout) and finances the torpedo launcher against it (the
// ship starts without one). Then back out for the last of the contract, a second
// rock, and two raiders close in, shown as UNKNOWN. The world stops for their
// offer: pay and be taken (the opening starts again), or refuse and shoot them
// with the launcher just fitted. Their fire tears the hold open. After that the
// jump is in reach and the run goes on. Each step is a thing the game already
// does; the tutor only sets one up (a rock, a purse, a ship) and watches for it.
// Nothing locks, and Skip ends it. Plain data, so a test flies it. The Arcade
// keeps the short version: rock, upgrade, shot.

export type LessonId = 'mine' | 'bay' | 'haul' | 'shoot';

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
  /** Radio lines said so far: the dispatcher, the demand, the second voice, the way out. */
  said: string[];
  /** Cargo (sim/contract.ts): on board, and counted by the work bay. Both are 0 in the Arcade. */
  onboard: number;
  delivered: number;
  /** The load was torn away. */
  lost: boolean;
  /** The work bay has shown the account. */
  settled: boolean;
  /** Credit in the purse at the bay, kept to settle the purse after the loss. */
  credit: number;
  /** The raiders' offer: 0 not yet, 1 on the table, 2 answered (refused). */
  parley: 0 | 1 | 2;
  /** Seconds until the scripted missile hits (0: none in flight, or already hit). */
  missile: number;
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
/** The second trip's rock sits further out, clear of the depot's damping field. */
const HAUL_AT = 80;
const LINGER = 1.2;
/** The torpedo bay: the one node the bay offers in the lesson. */
export const LESSON_NODE = 'tp_bay';
/** Cyrite over the price in the purse when the bay step begins. */
const SPARE = 1;

/** The Story's depot, set this far ahead and aside at the start: a short hop once the rock is mined. */
const DEPOT_AT = 170;
/** The training's Jump Gate, this far ahead (units, 10 km): the real one is far off, and the lesson is not the trip. */
const TRAIN_LANE = 1000;
const DEPOT_SIDE = 90;

/** Mine, upgrade, shoot with it. The Story flies to a work bay for the settlement and the upgrade, then hauls the last of the contract; the Arcade fits it in flight. */
export function newTutor(story = true): Tutor {
  return { steps: story ? ['mine', 'bay', 'haul', 'shoot'] : ['mine', 'bay', 'shoot'], i: 0, begun: false, base: 0, rockId: -1, alienId: -1, t: 0, done: false, skipped: false, linger: 0, pirates: [], said: [], onboard: 0, delivered: 0, lost: false, settled: false, credit: 0, parley: 0, missile: 0 };
}

/** The cargo the HUD reads, or null where there is no contract (the Arcade, or the training over). */
export function cargoOf(w: World): Cargo | null {
  const tu = w.tutor;
  if (!tu || !w.bk || !tu.steps.includes('haul')) return null;
  return { onboard: tu.onboard, delivered: tu.delivered, quota: QUOTA, hold: HOLD };
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

function layRock(w: World, tu: Tutor, at = ROCK_AT): void {
  const p = ahead(w, at, 0);
  const r = w.field.spawn(0, p.x, p.z, 0, 0, 'rich', 0.55, 0);
  r.age = 10;
  tu.rockId = r.id;
}

/** Pirates in the shoot step: two, so a win is a win, and the chase that follows is not a surprise. */
const PIRATES = 2;
/** The raiders call when they are this close (units): the ships are on the scope and in sight. */
const PARLEY_R = 70;

/** Two ships close in, white and unnamed: the Story's raiders are wards until the offer is refused. */
function layShip(w: World, tu: Tutor): void {
  tu.pirates = tu.pirates.filter((id) => w.aliens.some((a) => a.id === id));
  while (tu.pirates.length < PIRATES - (w.kills - tu.base)) {
    const p = ahead(w, SHIP_AT + 18 * tu.pirates.length, 40 - 70 * tu.pirates.length);
    const al = w.spawnHostile('scout', { x: p.x, y: 0, z: p.z });
    if (story(w, tu) && tu.parley === 0) {
      al.ward = { act: 'hold', temper: 'wary', hx: p.x, hz: p.z, ring: 0, warned: 0, tag: 'UNKNOWN' };
      al.mode = 'drift';
    }
    tu.pirates.push(al.id);
  }
  tu.alienId = tu.pirates[0] ?? -1;
  if (!story(w, tu)) say(w, tu, 'demand', t('Unregistered raider'), 'unknown', t('“Cut thrust. Pay the toll and grant boarding rights, or we’ll open the hold for you.”'));
}

/** Until the offer is answered the raiders close on the ship without a shot; in range, the world stops for them. */
function parley(w: World, tu: Tutor): void {
  const live = tu.pirates.map((id) => w.aliens.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a);
  for (const al of live) { al.ax = w.ship.x; al.az = w.ship.z; }
  if (live.length < PIRATES || w.phase !== 'play' || live.some((a) => Math.hypot(a.x - w.ship.x, a.z - w.ship.z) > PARLEY_R)) return;
  const card = CARD_BY_ID.story_raiders;
  if (!card) return;
  tu.parley = 1;
  w.openComms(card);
}

/** Seconds from the missile's launch to its hit. */
const MISSILE_T = 1.5;
/** Marks the scripted missile among the shots. */
const MISSILE = 'tutor-missile';

/**
 * Refused: the nearer raider fires a missile at once, and it always hits (scripted: it cannot be shot down or dodged, so the
 * beat plays the same every time). It flies as a harmless shot timed to arrive on the hit, which tears the pod away.
 */
function missile(w: World, tu: Tutor): void {
  const from = tu.pirates.map((id) => w.aliens.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => Math.hypot(a.x - w.ship.x, a.z - w.ship.z) - Math.hypot(b.x - w.ship.x, b.z - w.ship.z))[0];
  if (!from) return;
  const s = w.ship, d = Math.hypot(s.x - from.x, s.z - from.z) || 1, sp = d / MISSILE_T;
  w.shots.push({ id: newId(), x: from.x, y: from.y, z: from.z, vx: ((s.x - from.x) / d) * sp, vy: 0, vz: ((s.z - from.z) / d) * sp, life: MISSILE_T + 1, r: 0.02, faction: from.faction, hp: 99, seek: 0, split: 0, from: MISSILE });
  w.events.push({ type: 'plasma', x: from.x, z: from.z });
  tu.missile = MISSILE_T;
}

/** The scripted missile arrives: it is gone, and the pod with it. */
function missileHit(w: World, tu: Tutor): void {
  w.shots = w.shots.filter((x) => x.from !== MISSILE);
  loseCargo(w, tu);
}

/** The hold is torn open by the raiders' fire: once, and it is gone. */
function loseCargo(w: World, tu: Tutor): void {
  if (tu.lost || !story(w, tu)) return;
  const n = tu.onboard;
  tu.lost = true;
  tu.onboard = 0;
  w.cyrite = Math.min(w.cyrite, tu.credit);
  w.events.push({ type: 'cargoLost', n });
  // the hit rings on the hull (the shield ripple; the Wayward has no bubble)
  w.events.push({ type: 'shieldHit', x: w.ship.x, z: w.ship.z, left: Math.floor(w.shields), source: 'missile' });
}

/** One radio line, once: over live flight, so it never stops the ship. */
function say(w: World, tu: Tutor, id: string, from: string, caller: string, text: string): void {
  if (tu.said.includes(id)) return;
  tu.said.push(id);
  w.events.push({ type: 'ping', id: `train_${id}`, from, caller, text, moment: 'calm', system: w.sortie.name });
}

function begin(w: World, tu: Tutor): void {
  const id = tu.steps[tu.i]!;
  tu.t = 0;
  if (id === 'mine') {
    // the ship leaves without its torpedo bay, and the tank is short by what the rock holds
    if (w.bk) { const lv = { ...w.levels }; delete lv[LESSON_NODE]; w.setLevels(lv); w.fuel = Math.max(0, w.jumpCost - 12); w.cyrite = 0; }
    tu.base = stock(w);
    layRock(w, tu);
    if (story(w, tu)) tu.onboard = HOLD_AT_START;
    // the depot sits close by from the start, so the way to the bay is short
    const port = w.bk?.port;
    if (port) { const p = ahead(w, DEPOT_AT, -DEPOT_SIDE); port.x = p.x; port.z = p.z; }
    if (w.bk) { const p = ahead(w, TRAIN_LANE); w.bk.def = { ...w.bk.def, lane: TRAIN_LANE }; w.bk.lane.x = p.x; w.bk.lane.z = p.z; }
    say(w, tu, 'dispatch', t('Contract desk · 08-441'), 'office', t('“08-441, the Work Bay is open for supplies. Take the upgrade you need and get back to the field. A late return comes out of your allocation.”'));
  } else if (id === 'bay') {
    tu.base = fitted(w);
    // the Arcade's upgrade is a press away; the Story's is bought from the settlement, at the bay
    if (!w.bk) w.cyrite = Math.max(w.cyrite, 6);
  } else if (id === 'haul') {
    tu.base = stock(w);
    // out past the depot's damping field: the lasers are cold inside it
    layRock(w, tu, HAUL_AT);
    say(w, tu, 'tam', t('Sam Okoro'), 'miners', t('“Juno, I’ve heard raiders are working past the field. Eyes up, and don’t take risks for a contract that would never take one for you.”'));
  } else {
    // the hull waits: it comes once the ship is out past the depot's field
    tu.base = w.kills;
    tu.alienId = -1;
  }
}

/** The Story's training holds a contract: the Arcade's does not. */
const story = (w: World, tu: Tutor): boolean => !!w.bk && tu.steps.includes('haul');

/** How far through the rock the step is, 0 to 1: the laser's work, then the drops collected. */
function rockProgress(w: World, tu: Tutor): number {
  const rock = w.field.rocks.find((r) => r.id === tu.rockId);
  const got = stock(w) > tu.base;
  return got ? 1 : rock ? 0.1 + 0.7 * (1 - rock.hp / rock.maxHp) : 0.85;
}

/** Cargo to the nearest ten, so the meter reads as a count and does not flicker. */
const tens = (n: number): number => Math.round(n / 10) * 10;
/** How much of a span the rock has filled: nothing before the laser bites (progress 0.1), all of it when the drops are in. */
const filled = (p: number): number => Math.max(0, p - 0.1) / 0.9;

/** Where step `tu.i` points, and how far along it is. */
export function lessonOf(w: World): Lesson | null {
  const tu = w.tutor;
  if (!tu || tu.done) return null;
  const id = tu.steps[tu.i]!;
  const base = { id, n: tu.i + 1, of: tu.steps.length };
  if (id === 'mine' || id === 'haul') {
    const rock = w.field.rocks.find((r) => r.id === tu.rockId);
    const got = stock(w) > tu.base;
    const mark = rock ? { x: rock.x, z: rock.z, r: rock.r + 6, name: 'Cyrite rock' } : null;
    const line = rock || !got ? (id === 'haul' ? 'Mine the last of the contract' : 'Laser the Cyrite rock') : 'Fly through the drops to collect them';
    return { ...base, line, hint: 'fire', mark, progress: rockProgress(w, tu) };
  }
  if (id === 'bay') {
    const port = w.bk?.port;
    if (port) return { ...base, line: w.docked ? 'Fit the torpedo launcher' : 'Dock at the Work Bay', hint: w.docked ? 'fit' : 'dock', mark: { x: port.x, z: port.z, r: port.r, name: port.name }, progress: 0 };
    return { ...base, line: 'Choose an upgrade', hint: 'bay', mark: null, progress: 0 };
  }
  const a = w.aliens.find((x) => x.id === tu.alienId) ?? w.aliens.find((x) => tu.pirates.includes(x.id));
  return { ...base, line: story(w, tu) ? (tu.parley === 2 ? 'Destroy the raiders' : 'Raiders closing') : 'Shoot the raiders with torpedoes', hint: 'torpedo', mark: a ? { x: a.x, z: a.z, r: 0, name: story(w, tu) && tu.parley < 2 ? 'Unknown' : 'Raider' } : null, progress: a ? 1 - a.hp / Math.max(1, a.maxHp) : 1 };
}

/** Is the step in hand done? */
function met(w: World, tu: Tutor): boolean {
  const id = tu.steps[tu.i]!;
  if (id === 'mine' || id === 'haul') return !w.field.rocks.some((r) => r.id === tu.rockId) && stock(w) > tu.base;
  if (id === 'bay') return fitted(w) > tu.base && w.phase !== 'bay';
  return w.kills >= tu.base + PIRATES;
}

/**
 * The ship has docked at the work bay in the story training. It takes no cargo: the account is the one panel (the
 * company's charges, what the contract leaves), with the torpedo launcher on offer, financed. Returns whether it opened.
 */
export function settleAtBay(w: World): boolean {
  const tu = w.tutor, card = CARD_BY_ID.story_bay;
  if (!tu || tu.done || !w.bk || !card || tu.steps[tu.i] !== 'bay' || tu.settled || !story(w, tu)) return false;
  tu.settled = true;
  // the hold stays full; what mining on the way put in the purse does not count
  w.cyrite = CREDIT_START;
  tu.credit = CREDIT_START;
  w.openComms(card);
  return true;
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
  // the settlement is answered: the ship casts off by itself, straight back to flight
  if (w.docked && w.phase === 'play' && tu.settled && w.bk) { w.docked = false; w.bk.castOff = true; w.ship.invuln = Math.max(w.ship.invuln, 2); }
  if (tu.linger > 0) {
    tu.linger -= dt;
    if (tu.linger > 0) return;
    tu.i++;
    if (tu.i >= tu.steps.length) return finish(w, tu);
    return begin(w, tu);
  }
  tu.t += dt;
  const id = tu.steps[tu.i]!;
  // the hold's meter follows the laser: the first rock tops it up to the load, the second is the rest of the contract
  if (story(w, tu)) {
    if (id === 'mine') tu.onboard = tens(HOLD_AT_START + ROCK_LOAD * filled(rockProgress(w, tu)));
    else if (id === 'haul') tu.onboard = tens(HOLD_AT_START + ROCK_LOAD + ROCK_LOAD * filled(rockProgress(w, tu)));
    else if (id === 'bay') tu.onboard = HOLD_AT_START + ROCK_LOAD;
    if (met(w, tu)) tu.onboard = id === 'mine' ? HOLD_AT_START + ROCK_LOAD : id === 'haul' ? HOLD_AT_START + 2 * ROCK_LOAD : tu.onboard;
  }
  // if the rock is gone and nothing fell out, lay another; if the ship slipped away, send another
  if ((id === 'mine' || id === 'haul') && !w.field.rocks.some((r) => r.id === tu.rockId) && stock(w) <= tu.base && !w.pickups.length) layRock(w, tu, id === 'haul' ? HAUL_AT : ROCK_AT);
  if (id === 'shoot' && story(w, tu) && !tu.lost) {
    // the raiders turn hostile when the offer is refused; their first hit on the ship, or the first one down, opens the hold
    if (tu.parley === 1 && w.phase === 'play' && tu.pirates.every((p) => { const a = w.aliens.find((x) => x.id === p); return !a || !a.ward; })) { tu.parley = 2; missile(w, tu); }
    if (tu.missile > 0 && (tu.missile -= dt) <= 0) { tu.missile = 0; missileHit(w, tu); }
  }
  if (id === 'shoot' && story(w, tu) && tu.parley === 0 && tu.pirates.length) parley(w, tu);
  if (id === 'shoot' && !w.safe && (tu.alienId < 0 || (tu.t > 2 && tu.pirates.some((p) => !w.aliens.some((a) => a.id === p)))) && w.kills < tu.base + PIRATES) layShip(w, tu);
  // the raiders know a company hauler when they see one
  if (id === 'shoot' && tu.t > 7 && tu.pirates.length && !(story(w, tu) && tu.parley < 2)) say(w, tu, 'lock', t('Unregistered raider'), 'unknown', t('“Company hauler. Owner lock and all. Nobody’s coming to claim you out here.”'));
  if (met(w, tu)) tu.linger = LINGER;
}

/** Run to the end: the load is torn away, the tank holds the jump, the quiet lifts a little later, and the app is told. */
function finish(w: World, tu: Tutor): void {
  tu.done = true;
  if (!w.bk) return;
  w.fuel = Math.max(w.fuel, w.jumpCost);
  w.cardNext = Math.min(w.cardNext, w.runTime + 40);
  // the quiet is over: more raiders are coming, and the contract desk will not send cover
  w.startChase();
  if (!tu.skipped && story(w, tu)) {
    // the last raider's guns have taken the hold if nothing did before: the shortfall is something the player saw
    loseCargo(w, tu);
    w.events.push({ type: 'inbound' });
    say(w, tu, 'reinforce', t('Cerro Lane Control'), 'office', t('“Additional hostile contacts detected. Reach the Jump Gate.”'));
  }
  if (!story(w, tu) || tu.skipped) say(w, tu, 'escort', t('Contract desk · 08-441'), 'office', t('“Escort cover is not included in Contract 08-441. Continue at operator discretion.”'));
}

/** The player's skip: the torpedo bay is fitted all the same, so the ship is as the run expects it. */
export function skipTutor(w: World): void {
  const tu = w.tutor;
  if (!tu || tu.done) return;
  tu.skipped = true;
  if (w.bk && !w.levels[LESSON_NODE]) w.setLevels({ ...w.levels, [LESSON_NODE]: 1 });
  if (w.bk && story(w, tu)) { tu.onboard = 0; tu.lost = true; }
  finish(w, tu);
}
