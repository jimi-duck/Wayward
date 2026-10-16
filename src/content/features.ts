// ── the shared world: features and expanses ───────────────────────────────
// The things that sit out in space, as data, and the stretches of space they
// come in. Arcade deals expanses out as the ship flies (sim/space.ts); Story
// places the same rows on purpose, sometimes under a name of its own
// (NAMED). Nothing here is Three.js or a mode: the rows say what a thing is,
// what it does to the ship that is in it, and how it wants to be seen; the
// simulation reads the effects, the renderer reads the look. The plan and
// the reasons are in docs/ENVIRONMENT.md.
//
// A feature is a place in space, not a timed event. The sector events
// (sim/encounters.ts) stay as they are: something that happens. A feature is
// something that is there, that you can see from far off, fly round, fly
// into, or use.
//
// Colours keep clear of the signal colours: amber is the player, teal is
// what the ship tells you, red is threat and nothing else. A feature's tint
// is the light it throws on the hull and into the haze.

export type FeatureId =
  | 'veil' | 'shroud' | 'curtain' | 'static' | 'storm' | 'breakers' | 'graveyard'
  | 'well' | 'seam' | 'works' | 'lanterns' | 'relic' | 'passage' | 'carrier';

export type ExpanseId = 'open' | 'scrap' | 'veil' | 'front' | 'shoals' | 'yards' | 'hush';

/** What a feature is for. Every feature has at least one; the library has all of them. */
export type Purpose =
  | 'visual' | 'exploration' | 'resource' | 'tactical' | 'hazard' | 'mystery' | 'navigation' | 'story' | 'neutral';

/**
 * Where it sits. Air (gas, light, fields) can overlap anything; matter (rubble,
 * wrecks, structures, wells) keeps to its own ground; far is sky: it has a
 * bearing and a size, never a place you can fly to.
 */
export type Layer = 'air' | 'matter' | 'far';

/** How the renderer builds it. */
export type Shape = 'cloud' | 'ribbon' | 'haze' | 'rubble' | 'hulks' | 'lens' | 'frame' | 'buoys' | 'slab' | 'convoy' | 'signal' | 'veins';

/** How often the composer reaches for it, and how far apart two of a kind sit. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'singular';
export const RARITY: Record<Rarity, number> = { common: 1, uncommon: 0.5, rare: 0.2, singular: 0.06 };

/**
 * What it does to a ship inside it, at full strength. Each is a multiplier on
 * the normal (1: no effect) except `jam`, `pull` and `fog`. Blended by how far
 * in the ship is (sim/space.ts `weightAt`), and by the feature's own
 * breathing (`pulse`). Absent: no effect.
 */
export interface Effects {
  /** Radar range. */
  sight?: number;
  /** Torpedo seek: 0 means no lock at all. */
  lock?: number;
  /** Navigation noise, 0 to 1 (the lane mouth wanders; sim/world.ts navNoise). */
  jam?: number;
  /** Drag on the ship and every hull. */
  drag?: number;
  /** Pull toward the centre, units/s² at the centre, falling to nothing at the edge. */
  pull?: number;
  /** How far a hull sees the ship from: its notice range, multiplied. Hulls inside lose you at range. */
  conceal?: number;
  /** Rock density, and the share of it that is veined (added). */
  rock?: number;
  rich?: number;
  /** Chits from rock and wrecks. */
  krail?: number;
  /** Shield recharge. */
  shield?: number;
  /** Steadies navigation: taken off the interference (`jam`) from anywhere, 0 to 1. A lantern line is the way through a static field. */
  steady?: number;
}

export interface Look {
  /** The light it throws: on the hull and into the haze. Linear RGB, kept dim. */
  tint: [number, number, number];
  /** Thickness added to the fog inside, 0 to 1 (a cloud's murk). */
  fog?: number;
  /** How much of the sky it dims behind it, 0 to 1. */
  dim?: number;
  shape: Shape;
  /** Seen from this far off, as a glow or a silhouette. */
  far: number;
}

/** What it sounds like inside, for the ambient bed (audio is stage 5). */
export interface Voice {
  /** A low hum, Hz, and how gritty it is, 0 to 1. */
  hum: number;
  grit: number;
}

/** What Story can do with it, as tags the story and comms code read. */
export type StoryUse = 'place' | 'route' | 'cover' | 'wreck' | 'signal' | 'site' | 'history';

export interface FeatureDef {
  id: FeatureId;
  name: string;
  /** One line for the ship's catalogue and the doc. */
  blurb: string;
  purpose: Purpose[];
  layer: Layer;
  /** Radius range in units (the ship is about 1 across; a rock 7 to 12; a lane about 2,400). Far features: angular size in degrees. */
  size: [number, number];
  rarity: Rarity;
  /** Least units between two of its kind, and the earliest arcade second it appears. */
  gap: number;
  from: number;
  effects: Effects;
  look: Look;
  voice: Voice;
  /** Slow behaviour: it drifts (units/s), and its strength breathes (period in seconds, depth 0 to 1). */
  drift?: number;
  pulse?: { period: number; depth: number };
  /** The composer's budget for it: busy features are not dealt twice in a row. */
  load: 'calm' | 'busy';
  story: StoryUse[];
}

export const FEATURES: Record<FeatureId, FeatureDef> = {
  veil: {
    id: 'veil', name: 'Dust veil', blurb: 'A drifting bank of cold dust, lit from inside. Harmless, and lovely.',
    purpose: ['visual', 'neutral'], layer: 'air', size: [420, 900], rarity: 'common', gap: 1400, from: 30,
    effects: {}, look: { tint: [0.16, 0.2, 0.3], fog: 0.35, dim: 0.35, shape: 'cloud', far: 3600 },
    voice: { hum: 48, grit: 0.1 }, drift: 2, load: 'calm', story: ['place', 'cover'],
  },
  shroud: {
    id: 'shroud', name: 'Shroud', blurb: 'Dust thick enough to blind the scope. Nobody sees far in here, you included.',
    purpose: ['tactical', 'mystery'], layer: 'air', size: [280, 520], rarity: 'uncommon', gap: 2200, from: 150,
    effects: { sight: 0.4, lock: 0.5, conceal: 0.45 }, look: { tint: [0.18, 0.1, 0.24], fog: 0.9, dim: 0.7, shape: 'cloud', far: 3000 },
    voice: { hum: 38, grit: 0.45 }, drift: 1.5, load: 'busy', story: ['cover', 'site', 'wreck'],
  },
  curtain: {
    id: 'curtain', name: 'Curtain', blurb: 'Charged gas lit in ribbons, miles tall. It does nothing but shine.',
    purpose: ['visual', 'neutral'], layer: 'air', size: [600, 1100], rarity: 'uncommon', gap: 2600, from: 45,
    effects: {}, look: { tint: [0.06, 0.34, 0.26], fog: 0.05, dim: 0.1, shape: 'ribbon', far: 6000 },
    voice: { hum: 70, grit: 0.05 }, pulse: { period: 38, depth: 0.5 }, load: 'calm', story: ['place', 'history'],
  },
  static: {
    id: 'static', name: 'Static field', blurb: 'A field that scrambles instruments. Navigation markers drift, and target locks fail.',
    purpose: ['navigation', 'tactical'], layer: 'air', size: [380, 760], rarity: 'uncommon', gap: 2400, from: 120,
    effects: { jam: 0.8, lock: 0.25, sight: 0.7 }, look: { tint: [0.12, 0.24, 0.34], fog: 0.15, dim: 0.15, shape: 'haze', far: 3200 },
    voice: { hum: 120, grit: 0.7 }, pulse: { period: 11, depth: 0.45 }, load: 'busy', story: ['route', 'signal', 'place'],
  },
  storm: {
    id: 'storm', name: 'Storm cell', blurb: 'Lightning walks the cell. It charges whatever it misses, and breaks what it does not.',
    purpose: ['hazard', 'resource'], layer: 'air', size: [260, 480], rarity: 'rare', gap: 3200, from: 210,
    effects: { shield: 2, jam: 0.3 }, look: { tint: [0.3, 0.4, 0.62], fog: 0.3, dim: 0.3, shape: 'cloud', far: 3600 },
    voice: { hum: 90, grit: 0.9 }, pulse: { period: 7, depth: 0.7 }, drift: 3, load: 'busy', story: ['site', 'route'],
  },
  breakers: {
    id: 'breakers', name: 'Breaker field', blurb: 'Rubble where something large broke up. Cover for you, and for whoever is chasing.',
    purpose: ['tactical', 'resource'], layer: 'matter', size: [260, 560], rarity: 'common', gap: 1800, from: 60,
    effects: { rock: 2.6, lock: 0.55, krail: 1.3 }, look: { tint: [0.2, 0.17, 0.15], shape: 'rubble', far: 2200 },
    voice: { hum: 30, grit: 0.35 }, drift: 1, load: 'busy', story: ['place', 'wreck', 'history'],
  },
  graveyard: {
    id: 'graveyard', name: 'Graveyard', blurb: 'A battle’s worth of hulks, left where they fell. Someone may be picking at them.',
    purpose: ['exploration', 'story', 'resource'], layer: 'matter', size: [320, 620], rarity: 'uncommon', gap: 3000, from: 100,
    effects: { rock: 1.4, krail: 1.6 }, look: { tint: [0.18, 0.18, 0.2], shape: 'hulks', far: 2400 },
    voice: { hum: 26, grit: 0.2 }, drift: 0.5, load: 'calm', story: ['wreck', 'history', 'site', 'signal'],
  },
  well: {
    id: 'well', name: 'Gravity well', blurb: 'Something heavy and unseen. The light bends round it, and everything leans in.',
    purpose: ['tactical', 'hazard', 'mystery'], layer: 'matter', size: [300, 600], rarity: 'rare', gap: 3600, from: 240,
    effects: { pull: 12, drag: 1.1 }, look: { tint: [0.2, 0.1, 0.32], dim: 0.2, shape: 'lens', far: 4200 },
    voice: { hum: 22, grit: 0.15 }, pulse: { period: 19, depth: 0.25 }, load: 'busy', story: ['site', 'history', 'route'],
  },
  seam: {
    id: 'seam', name: 'Cyrite seam', blurb: 'Rock shot through with violet veins. It glints before you can read it.',
    purpose: ['resource', 'exploration'], layer: 'matter', size: [180, 340], rarity: 'uncommon', gap: 2600, from: 75,
    effects: { rock: 1.6, rich: 0.4 }, look: { tint: [0.26, 0.1, 0.36], shape: 'veins', far: 2400 },
    voice: { hum: 64, grit: 0.1 }, load: 'calm', story: ['place', 'site'],
  },
  works: {
    id: 'works', name: 'Slipway', blurb: 'A dead yard: a gantry frame, an unfinished hull in it, lamps still on a timer.',
    purpose: ['exploration', 'story', 'visual'], layer: 'matter', size: [200, 380], rarity: 'rare', gap: 3600, from: 130,
    effects: { krail: 1.5 }, look: { tint: [0.24, 0.2, 0.14], shape: 'frame', far: 3200 },
    voice: { hum: 55, grit: 0.25 }, load: 'calm', story: ['place', 'site', 'history', 'wreck'],
  },
  lanterns: {
    id: 'lanterns', name: 'Lantern line', blurb: 'Old marker buoys, still lit, a few hundred metres apart. They lead somewhere.',
    purpose: ['navigation', 'exploration'], layer: 'matter', size: [140, 260], rarity: 'rare', gap: 2800, from: 90,
    effects: { steady: 0.95 }, look: { tint: [0.1, 0.34, 0.36], shape: 'buoys', far: 3000 },
    voice: { hum: 82, grit: 0 }, load: 'calm', story: ['route', 'signal', 'place'],
  },
  relic: {
    id: 'relic', name: 'Relic', blurb: 'A slab nobody built, or nobody who lived. Dark, enormous, and facing you.',
    purpose: ['mystery', 'story', 'visual'], layer: 'matter', size: [160, 300], rarity: 'singular', gap: 6000, from: 200,
    effects: { sight: 0.85 }, look: { tint: [0.08, 0.1, 0.12], dim: 0.15, shape: 'slab', far: 5200 },
    voice: { hum: 18, grit: 0.05 }, load: 'calm', story: ['site', 'history', 'signal'],
  },
  passage: {
    id: 'passage', name: 'Passage', blurb: 'A convoy so far off it crosses the sky in minutes: a mile of lit windows.',
    purpose: ['visual', 'neutral'], layer: 'far', size: [6, 14], rarity: 'uncommon', gap: 4000, from: 70,
    effects: {}, look: { tint: [0.3, 0.26, 0.2], shape: 'convoy', far: 9000 },
    voice: { hum: 0, grit: 0 }, drift: 1, load: 'calm', story: ['place', 'history'],
  },
  carrier: {
    id: 'carrier', name: 'Carrier', blurb: 'A signal on the scope with nothing at its bearing yet. Follow it.',
    purpose: ['mystery', 'navigation', 'story'], layer: 'far', size: [2, 4], rarity: 'rare', gap: 5000, from: 100,
    effects: {}, look: { tint: [0.1, 0.4, 0.4], shape: 'signal', far: 9000 },
    voice: { hum: 160, grit: 0.4 }, pulse: { period: 6, depth: 0.8 }, load: 'calm', story: ['signal', 'route', 'site'],
  },
};
export const FEATURE_ORDER = Object.keys(FEATURES) as FeatureId[];

// ── expanses ──────────────────────────────────────────────────────────────
// A stretch of space with a character, a few thousand units across: what
// the sky around the ship is for the next minute. Its roster says which
// features it deals and how many; its rock says what the field does there.
// Arcade rolls one ahead of the ship whenever the last is behind it; Story
// picks one for a system by its kind and region.

export interface ExpanseDef {
  id: ExpanseId;
  name: string;
  blurb: string;
  /** Its radius range in units, and the earliest arcade second. */
  radius: [number, number];
  from: number;
  /** Weight in the deal, before history. */
  weight: number;
  /** Calm expanses are for looking; busy ones are for playing. */
  load: 'calm' | 'busy';
  /** How many features it deals, and the weight of each kind (a count of 0 to 1 in the lighter ones). */
  count: [number, number];
  roster: Partial<Record<FeatureId, number>>;
  /** What the rock does while the ship is in it: density and veined share. */
  rock: { density: number; rich: number };
  /** The sky's mood, as the ship is in it: a light on everything (linear RGB, very dim) and how dark the dark is. */
  mood: { tint: [number, number, number]; dark: number };
}

export const EXPANSES: Record<ExpanseId, ExpanseDef> = {
  open: {
    id: 'open', name: 'Open dark', blurb: 'Long sightlines and nothing in them. The place to breathe.',
    radius: [900, 1500], from: 0, weight: 1.4, load: 'calm', count: [0, 2],
    roster: { curtain: 1, passage: 1.2, lanterns: 0.8, carrier: 0.4, seam: 0.6 },
    rock: { density: 0.6, rich: 0.02 }, mood: { tint: [0.02, 0.03, 0.05], dark: 1 },
  },
  scrap: {
    id: 'scrap', name: 'The Scrap', blurb: 'A broken-up fleet and the rock it broke. Rich, crowded, and good to fight in.',
    radius: [1100, 1700], from: 60, weight: 1.2, load: 'busy', count: [2, 4],
    roster: { breakers: 2, graveyard: 1, seam: 0.8, shroud: 0.4, carrier: 0.3 },
    rock: { density: 1.3, rich: 0.06 }, mood: { tint: [0.05, 0.04, 0.03], dark: 0.9 },
  },
  veil: {
    id: 'veil', name: 'The Veil', blurb: 'Banks of cold dust and strange light. Things hide here, and so do you.',
    radius: [1200, 1900], from: 30, weight: 1.2, load: 'calm', count: [2, 4],
    roster: { veil: 2, shroud: 0.9, curtain: 0.7, seam: 0.7, graveyard: 0.5, relic: 0.1 },
    rock: { density: 0.8, rich: 0.05 }, mood: { tint: [0.03, 0.04, 0.07], dark: 0.8 },
  },
  front: {
    id: 'front', name: 'The Front', blurb: 'A standing storm of charge. The instruments argue; the sky is on fire.',
    radius: [1200, 1800], from: 120, weight: 0.9, load: 'busy', count: [2, 3],
    roster: { static: 2, storm: 0.9, curtain: 1.2, lanterns: 0.4, carrier: 0.5 },
    rock: { density: 0.7, rich: 0.04 }, mood: { tint: [0.02, 0.05, 0.07], dark: 0.85 },
  },
  shoals: {
    id: 'shoals', name: 'The Shoals', blurb: 'Space leans here. Rock and wrecks have settled into the slope of something.',
    radius: [1100, 1600], from: 200, weight: 0.7, load: 'busy', count: [2, 3],
    roster: { well: 1.4, breakers: 1, static: 0.5, relic: 0.3, graveyard: 0.5 },
    rock: { density: 1, rich: 0.04 }, mood: { tint: [0.04, 0.02, 0.06], dark: 0.95 },
  },
  yards: {
    id: 'yards', name: 'The Yards', blurb: 'Where ships were built and mended. Gantries, hulks on slips, lamps on timers.',
    radius: [1100, 1700], from: 110, weight: 0.9, load: 'busy', count: [2, 4],
    roster: { works: 1.5, lanterns: 1, graveyard: 0.8, breakers: 0.7, passage: 0.5 },
    rock: { density: 0.5, rich: 0.02 }, mood: { tint: [0.05, 0.04, 0.025], dark: 0.85 },
  },
  hush: {
    id: 'hush', name: 'The Hush', blurb: 'The old quiet: nothing moves, nothing answers, and something is watching.',
    radius: [1000, 1600], from: 180, weight: 0.5, load: 'calm', count: [1, 3],
    roster: { relic: 1, carrier: 1, lanterns: 0.8, curtain: 0.6 },
    rock: { density: 0.35, rich: 0.01 }, mood: { tint: [0.02, 0.04, 0.05], dark: 1 },
  },
};
export const EXPANSE_ORDER = Object.keys(EXPANSES) as ExpanseId[];

// ── named places (Story) ──────────────────────────────────────────────────
// The same rows under a name of their own. Story drops one where the chart
// says it is (a system's `site`), and the comms and story code key off its
// id. The size and look are the feature's own unless overridden.

export interface NamedDef {
  id: string;
  name: string;
  feature: FeatureId;
  /** The regions it can sit in (content/regions.ts), and a line the ship's catalogue shows once you are in it. */
  regions: [number, number];
  note: string;
  radius?: number;
}

export const NAMED: Record<string, NamedDef> = {
  veyr_belt: { id: 'veyr_belt', name: 'The Veyr Belt', feature: 'breakers', regions: [0, 1], note: 'Mined out and abandoned. The Gutter’s favourite hiding place.' },
  cerro_debris: { id: 'cerro_debris', name: 'The Cerro Debris', feature: 'graveyard', regions: [0, 0], note: 'What was left of the first fleet that tried to leave.' },
  sable_well: { id: 'sable_well', name: 'The Sable Well', feature: 'well', regions: [1, 2], note: 'Charted twice. Both surveyors are listed as lost.', radius: 520 },
  halloran_line: { id: 'halloran_line', name: 'Halloran’s line', feature: 'lanterns', regions: [0, 1], note: 'A courier route, lit by hand. The lamps still burn.' },
};
