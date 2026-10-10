import { NAMED, FEATURES, FEATURE_ORDER, type FeatureId } from '../content/features';
import { FACTIONS, type Boss, type Strike, type Telegraph } from '../sim/bosses';
import { newBreakout } from '../sim/breakout';
import { ELITE_ORDER, ELITES, VARIANT_ORDER, VARIANTS, spawnAlien, type Faction, type Shot } from '../sim/enemies';
import { ENCOUNTERS, type Encounter, type EncounterId } from '../sim/encounters';
import type { Bulwark, RockKind, RockSize } from '../sim/field';
import { ROCK_KINDS } from '../sim/field';
import { newId, useIds } from '../sim/ids';
import { POWER_HINT, POWER_LABEL, POWERS, type Pickup, type PickupKind } from '../sim/pickups';
import { BULWARK_HP, BULWARK_R } from '../sim/tuning';
import type { World } from '../sim/world';

// ── the review world's gallery ────────────────────────────────────────────
// One of everything, laid out so a ship can fly past it, with a name on each.
// Plain data on a World built with `review: true` (sim/world.ts stepReview):
// nothing here moves, hunts or hurts, and nothing imports Three.js. The panel
// (review/panel.ts) draws the labels and the menu; this file says what is
// where. Development only, reached by ?dev; the design is in docs/REVIEW.md.
//
// The rows (hulls, rock, pickups, places) sit side by side in the hangar, a
// long way apart so a neighbour is never in the picture. The space stops are
// built when you go to them: one feature or event at a time, so a place is
// seen alone and costs nothing while you are elsewhere.
//
// The words are English only: this is a tool for the people who build the
// game, and none of it reaches a player.

export type Group = 'ships' | 'rock' | 'places' | 'space';

export const GROUPS: ReadonlyArray<{ id: Group; name: string }> = [
  { id: 'ships', name: 'Ships' },
  { id: 'rock', name: 'Rock & items' },
  { id: 'places', name: 'Places & fire' },
  { id: 'space', name: 'Space' },
];

export interface Stop {
  id: string;
  group: Group;
  name: string;
  /** One line on what you are looking at. */
  note: string;
}

/** A name on something in the world. Only the current stop's labels are shown. */
export interface Label {
  stop: string;
  x: number;
  y: number;
  z: number;
  text: string;
  sub?: string;
  /** Shown while the ship is within this many units. */
  reach: number;
  /** A far feature's name hangs in the sky on this bearing, wherever the ship is, instead of at x, z. */
  bearing?: number;
}

/** Between the rows of the hangar, units. */
const ROW = 220;
/** Where the space stops are built, a long way from the hangar. */
const PLOT = { x: 24000, z: 0 };
/** A capital ship's radius, as the command gives it. */
const CAPITAL_R = 6;
const FACE = Math.PI * 0.75;
/** The sky is the same seed in every stop, so a row is always seen in the same light. */
const NAME = (id: string) => id.replace(/_/g, ' ');

const ROCK_NOTE: Record<RockKind, string> = {
  basalt: 'Common rock. Splits in two.',
  iron: 'Dark and dense, three times the hull. Splits in three.',
  rich: 'Violet-veined. A shower of Krail.',
  volatile: 'Glows white-hot and goes off when broken.',
};

const CELL_NOTE: Record<string, string> = {
  repair: 'Hull repair. One plate back.',
  shield: `${POWER_LABEL.shield}. ${POWER_HINT.shield}. From a rescue, or any hull.`,
  rapid: `${POWER_LABEL.rapid}. ${POWER_HINT.rapid}. From an elite's wreck.`,
  yield: `${POWER_LABEL.yield}. ${POWER_HINT.yield}. From a hulk's warheads, or any hull.`,
  overdrive: `${POWER_LABEL.overdrive}. ${POWER_HINT.overdrive}. From a capital ship's wreck.`,
};

const FACTION_NAME: Record<Faction, string> = { gutter: 'Gutter', custody: 'Custody', office: 'Office', voice: 'Voice', thren: 'Thren' };

/** What each feature's size range reads as in the doc: the middle of it, so a stop shows the usual one. */
const mid = (r: [number, number]) => Math.round((r[0] + r[1]) / 2);

export class Gallery {
  readonly stops: Stop[] = [];
  readonly labels: Label[] = [];
  current: Stop;
  /** Called after the ship has been moved, so the view can snap its camera. */
  onMove: () => void = () => {};
  private readonly at = new Map<string, { x: number; z: number; heading: number }>();
  private readonly bosses: Boss[] = [];

  constructor(private readonly world: World) {
    if (!world.review) throw new Error('the gallery needs a review world');
    useIds(world.ids);
    world.field.rocks = [];
    world.field.bulwarks = [];
    world.aliens = [];
    world.pickups = [];
    // the lane gate and the depot read as lit and ready
    world.fuel = 99;
    this.hulls();
    this.elites();
    this.capitals();
    this.rock();
    this.bulwarks();
    this.loose();
    this.cells();
    this.places();
    this.fire();
    this.events();
    this.features();
    this.current = this.stops[0]!;
  }

  /** Metres to stand closer than a stop's usual place (set from ?near= by the page). */
  near = 0;

  /** Put the ship at a stop, facing the exhibit, with the place built if it is built on arrival. */
  go(id: string): void {
    const stop = this.stops.find((s) => s.id === id);
    if (!stop) return;
    this.current = stop;
    const w = this.world, s = w.ship;
    // the space stops are built now, one at a time; everything else is already laid
    w.space!.features.length = 0;
    w.encounter = null;
    w.siteHere = null;
    w.conditions = [];
    w.air.from.length = 0;
    this.build(stop.id);
    const at = this.at.get(stop.id)!;
    // ?near=N: stand N metres closer to the exhibit, for a still close-up (the software renderer cannot fly there in time)
    const near = this.near;
    Object.assign(s, { x: at.x + near, z: at.z, vx: 0, vz: 0, heading: at.heading, helm: 0, thrust: 0, yawRate: 0, rollT: -1, breakT: -1 });
    Object.assign(w.prev, s);
    w.bolts.length = 0;
    this.onMove();
  }

  /** The next stop (or the one before) in the menu's order, wrapping round. */
  step(by: 1 | -1): void {
    const i = this.stops.indexOf(this.current);
    this.go(this.stops[(i + by + this.stops.length) % this.stops.length]!.id);
  }

  // ── laying ──────────────────────────────────────────────────────────

  private builders = new Map<string, () => void>();
  private build = (id: string) => this.builders.get(id)?.();

  private row = 0;
  /** A new hangar row: the stop, the z of its line, and where the ship starts. */
  private stop(group: Group, id: string, name: string, note: string): number {
    const z = -this.row++ * ROW;
    this.stops.push({ id, group, name, note });
    this.at.set(id, { x: 0, z, heading: 0 });
    return z;
  }

  /** Item i of n on a slant across the view, so a row of small things does not stack up along the line of sight. */
  private fan(i: number, n: number, z: number, dx: number, dz: number): [number, number] {
    return [34 + i * dx, z + (i - (n - 1) / 2) * dz];
  }

  private label(stop: string, x: number, y: number, z: number, text: string, sub?: string, reach = 90): void {
    this.labels.push({ stop, x, y, z, text, sub, reach });
  }

  private hulls(): void {
    const w = this.world;
    const z = this.stop('ships', 'hulls', 'Hulls', 'Every hull the spawner can send, one each, in the order it unlocks. They hold still.');
    VARIANT_ORDER.forEach((id, i) => {
      const v = VARIANTS[id]!;
      const x = 50 + i * 16, zz = z + (i % 2 ? 7 : -7);
      const al = spawnAlien(v.kind, w.ship, 0, w.rng, { x, y: 0, z: zz }, { variant: id, hp: 1 });
      al.face = FACE; al.cloak = 0; al.escort = false; al.mode = 'watch';
      w.aliens.push(al);
      this.label('hulls', x, 4.5, zz, v.label, `${FACTION_NAME[v.faction]} · ${v.kind}`, 70);
    });
  }

  private elites(): void {
    const w = this.world;
    const z = this.stop('ships', 'elites', 'Elites', 'The seven elite marks, each on a strike fighter. Only an elite wears a halo.');
    ELITE_ORDER.forEach((id, i) => {
      const x = 50 + i * 18, zz = z + (i % 2 ? 7 : -7);
      const al = spawnAlien('raptor', w.ship, 0, w.rng, { x, y: 0, z: zz }, { variant: 'raptor', elite: id, hp: 1 });
      al.face = FACE; al.cloak = 0; al.escort = false; al.mode = 'watch';
      w.aliens.push(al);
      this.label('elites', x, 5, zz, ELITES[id].label, 'Strike fighter', 70);
    });
  }

  private capitals(): void {
    const w = this.world;
    const z = this.stop('ships', 'capitals', 'Capital ships', 'One for each faction, as they arrive in a fight. Held at rest.');
    (['gutter', 'custody', 'office', 'voice', 'thren'] as const).forEach((f, i) => {
      const def = FACTIONS[f], x = 70 + i * 34, zz = z + (i % 2 ? 15 : -15);
      const b: Boss = {
        id: newId(), faction: f, name: def.names[0]!, n: 0, x, y: 2, z: zz, vx: 0, vy: 0, vz: 0, face: FACE, arriving: false,
        hp: 1, maxHp: 1, r: CAPITAL_R, phase: 0, attack: def.cycles[0][0]!, attackT: 0, cycleI: 0, shotT: 0, spin: 0, windT: 0, aimLock: 0,
        fuse: def.fuse, leaving: false, cloak: 0, hitT: 0, soaked: 0, beams: [], chargeT: 0, fightT: 0, orbit: 0, arriveT: 0, unaware: false, aware: 0, stay: 0, jumpT: 0, sense: 0,
      };
      this.bosses.push(b);
      this.label('capitals', x, 11, zz, def.names[0]!, `${FACTION_NAME[f]} capital ship · ${def.hull}`, 130);
    });
    w.review!.bosses = this.bosses;
  }

  private rock(): void {
    const w = this.world;
    const z = this.stop('rock', 'rock', 'Rock', 'Every kind of rock in three sizes: large, medium, small, front to back.');
    (Object.keys(ROCK_KINDS) as RockKind[]).forEach((kind, i) => {
      const x = 50 + i * 28;
      ([0, 1, 2] as RockSize[]).forEach((size) => {
        const r = w.field.spawn(size, x, z + size * 10, 0, 0, kind, 1, 0);
        r.vx = r.vz = 0; r.age = 10;
      });
      this.label('rock', x, 7, z, NAME(kind) + ' rock', ROCK_NOTE[kind], 60);
    });
  }

  private bulwarks(): void {
    const w = this.world;
    const z = this.stop('rock', 'bulwarks', 'Bulwarks', 'The massive rock that stops fire: three shapes, small to large. They can be broken, but not here.');
    [BULWARK_R[0], (BULWARK_R[0] + BULWARK_R[1]) / 2, BULWARK_R[1]].forEach((r, i) => {
      const x = 60 + i * 40, zz = z + (i % 2 ? 14 : -14);
      const hp = Math.round(BULWARK_HP[0] + ((r - BULWARK_R[0]) / (BULWARK_R[1] - BULWARK_R[0])) * (BULWARK_HP[1] - BULWARK_HP[0]));
      const b: Bulwark = { id: newId(), x, z: zz, vx: 0, vz: 0, r, variant: i, ax: 0, ay: 1, az: 0, spin: 0.05, age: 10, hp, maxHp: hp };
      w.field.bulwarks.push(b);
      this.label('bulwarks', x, r + 3, zz, `Bulwark ${['small', 'medium', 'large'][i]}`, `${hp} hp · bursts into rock carrying Krail`, 90);
    });
  }

  private pickup(kind: PickupKind, x: number, z: number, value = 1): Pickup {
    const pk: Pickup = { id: newId(), kind, x, z, vx: 0, vz: 0, life: 1e9, value, age: 10 };
    this.world.pickups.push(pk);
    return pk;
  }

  private loose(): void {
    const z = this.stop('rock', 'loose', 'Krail & loose cargo', 'What the tractor pulls in. Krail goes white, blue, purple with its worth.');
    const items: Array<[PickupKind, number, string, string?]> = [
      ['crystal', 1, 'Krail 1', 'the smallest'], ['crystal', 2, 'Krail 2'], ['crystal', 3, 'Krail 3'], ['crystal', 4, 'Krail 4'], ['crystal', 5, 'Krail 5', 'the richest'],
      ['cyrite', 3, 'Cyrite', 'refined into jump fluid first, then the purse'], ['ore', 3, 'Ore', 'sold at the port'], ['parts', 3, 'Parts', 'patches a hull plate'],
    ];
    items.forEach(([kind, value, name, sub], i) => {
      const [x, zz] = this.fan(i, items.length, z, 8, 7);
      this.pickup(kind, x, zz, value);
      this.label('loose', x, 3, zz, name, sub, 60);
    });
  }

  private cells(): void {
    const z = this.stop('rock', 'cells', 'Cells & repair', 'The pickups you fly to: a hull repair and the four salvage cells. They are not tractored.');
    const kinds = ['repair', ...POWERS] as const;
    kinds.forEach((kind, i) => {
      const [x, zz] = this.fan(i, kinds.length, z, 10, 9);
      this.pickup(kind, x, zz);
      const name = kind === 'repair' ? 'Hull repair' : `${POWER_LABEL[kind]} cell`;
      this.label('cells', x, 4, zz, name, CELL_NOTE[kind], 70);
    });
  }

  private places(): void {
    const w = this.world;
    const z = this.stop('places', 'places', 'Lane gate & port', 'The Story mode\'s two places: the Accord lane mouth, where the drive spools, and Frontier Supply\'s depot.');
    const bk = newBreakout(0);
    bk.lane.x = 90; bk.lane.z = z;
    bk.port!.x = 190; bk.port!.z = z;
    w.review!.bk = bk;
    this.label('places', 90, 12, z, 'Lane entrance', 'Hold inside the ring with the jump fluid to jump', 140);
    this.label('places', 190, 12, z, 'Port', 'Slow inside the cyan ring to dock', 140);
  }

  private fire(): void {
    const w = this.world;
    const z = this.stop('places', 'fire', 'Enemy fire & warnings', 'The shots each faction throws, and the circles and lines drawn before a capital ship\'s attack lands.');
    const shots: Array<[Faction, string, boolean]> = [
      ['gutter', 'Gutter fire', false], ['custody', 'Custody fire', false], ['office', 'Office plasma', true], ['voice', 'Voice fire', false], ['thren', 'Thren fire', false],
    ];
    const n = shots.length + 6;
    let i = 0;
    shots.forEach(([faction, name, plasma]) => {
      const [x, zz] = this.fan(i++, n, z, 10, 9);
      const s: Shot = { id: newId(), x, y: 0.3, z: zz, vx: 0.01, vy: 0, vz: 0, life: 1e9, r: plasma ? 0.9 : 0.45, faction, hp: plasma ? 1 : 0, seek: 0, split: 0 };
      w.shots.push(s);
      this.label('fire', x, 3, zz, name, plasma ? 'shootable, steers after you' : undefined, 70);
    });
    const [wx, wz] = this.fan(i++, n, z, 10, 9);
    w.webs.push({ id: newId(), x: wx, z: wz, life: 1e9, r: 9 });
    this.label('fire', wx, 3, wz, 'Thren web', 'wades the ship', 70);
    const tele = (kind: 'line' | 'ring', faction: Faction, name: string, sub: string) => {
      const [x, zz] = this.fan(i++, n, z, 10, 9);
      const t: Telegraph = { id: newId(), kind, x, z: zz, ang: 0, len: 26, r: 10, t: 0.6, total: 1.2, faction };
      w.tele.push(t);
      this.label('fire', x, 3, zz, name, sub, 70);
    };
    tele('line', 'gutter', 'Charge line', 'where a charge or volley will go');
    tele('ring', 'custody', 'Nova ring', 'a ring about to go off');
    const strike = (kind: Strike['kind'], name: string, sub: string) => {
      const [x, zz] = this.fan(i++, n, z, 10, 9);
      const st: Strike = { id: newId(), kind, x, z: zz, r: 7, t: 0.6, total: 1.2, faction: null };
      w.strikes.push(st);
      this.label('fire', x, 3, zz, name, sub, 70);
    };
    strike('blast', 'Shell circle', 'artillery lands here');
    strike('lightning', 'Lightning circle', 'a storm cell strikes here');
    strike('web', 'Web circle', 'a Thren web lands here');
  }

  // ── built on arrival ────────────────────────────────────────────────

  private plot(id: string, name: string, note: string, group: Group, build: (x: number, z: number) => number): void {
    const stop: Stop = { id, group, name, note };
    this.stops.push(stop);
    // where the ship lands is known once it is built; until then, short of the plot
    this.at.set(id, { x: PLOT.x - 200, z: PLOT.z, heading: 0 });
    this.builders.set(id, () => {
      const stand = build(PLOT.x, PLOT.z);
      this.at.set(id, { x: PLOT.x - stand, z: PLOT.z, heading: 0 });
    });
  }

  private events(): void {
    const w = this.world;
    const set = (id: EncounterId, r: number, sub: string) => {
      this.plot(`event:${id}`, ENCOUNTERS[id].name, sub, 'space', (x, z) => {
        const e: Encounter = { id, t: 12, dur: 1e9, x, z, r, progress: 0.4, done: false, success: false, timer: 99, ids: [] };
        w.encounter = e;
        return 90;
      });
      this.label(`event:${id}`, PLOT.x, 8, PLOT.z, ENCOUNTERS[id].name, ENCOUNTERS[id].text, 400);
    };
    set('distress', 11, 'A sector event: a beacon you hold position at. The circle fills.');
    set('derelict', 7, 'A sector event: a dark hulk to salvage.');
    set('ion_storm', 0, 'A sector event: the sky flashes. In play, lightning lands on drawn circles.');
    set('nebula', 0, 'A sector event: the fog thickens and the sensors go short.');
    set('anomaly', 3.5, 'A sector event: a gravity well, black core in turning rings.');
  }

  private features(): void {
    const w = this.world;
    const lay = (id: string, name: string, feature: FeatureId, radius: number, note: string, named?: string) => {
      const def = FEATURES[feature];
      this.plot(id, name, note, 'space', (x, z) => {
        const far = def.layer === 'far';
        // a far feature rides a bearing in the sky: ahead of the ship, which faces +x
        const f = w.space!.place(feature, x, z, { r: radius, named, bearing: 0 });
        f.vx = f.vz = 0;
        return far ? 60 : Math.round(radius * 1.5 + 160);
      });
      if (def.layer !== 'far') this.label(id, PLOT.x, 12, PLOT.z, name, def.blurb, radius + 600);
      else {
        // there is nothing to fly up to: the name goes in the sky, ahead
        this.labels.push({ stop: id, x: 0, y: 30, z: 0, text: name, sub: def.blurb, reach: 1e9, bearing: 0 });
      }
    };
    for (const id of FEATURE_ORDER) {
      const d = FEATURES[id];
      lay(`feature:${id}`, d.name, id, mid(d.size), `${d.blurb}${d.layer === 'far' ? ' Sky only: it can never be reached.' : ''}`);
    }
    for (const n of Object.values(NAMED)) {
      const d = FEATURES[n.feature];
      lay(`named:${n.id}`, n.name, n.feature, n.radius ?? mid(d.size), `A named place in the Story (${d.name}). ${n.note}`, n.id);
    }
  }
}
