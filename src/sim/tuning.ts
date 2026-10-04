// Flight constants, in the original game's units, converted at the boundary.
//
// The original measured distance in pixels and time in 60Hz frames. Our
// simulation step is exactly one of those frames, so a per-frame number ports
// as a per-step number unchanged. Only distance converts: one world unit is
// ten of the original's pixels.

/** World units per original pixel. */
export const PX = 0.1;
/** The original's frame rate; one simulation step is one original frame. */
export const HZ = 60;

/** Base turn rate, radians per step (3.6 rad/s). */
export const ROT_SPEED = 0.06;
/** Base thrust, px/frame added per frame at full throttle. */
export const THRUST = 0.155;
/** Of the slide grip removes, the share that comes back as forward speed. */
export const GRIP_CARVE = 0.6;
/**
 * Drag kept per step off the throttle. Lighter than the hull's own (which
 * sets the top speed under thrust), so letting go carries the ship on for a
 * second and a half instead of stopping it dead: it flies like a ship.
 */
export const COAST_DRAG = 0.974;

/** The helm eases in at this rate per second, so a tap nudges and a hold turns. */
export const HELM_EASE = 14;
/** A stick steers once pushed this far. */
export const AIM_DEAD = 0.18;
/** A stick throttles from this far out... */
export const THROTTLE_FROM = 0.3;
/** ...reaching full throttle this much further out. */
export const THROTTLE_SPAN = 0.55;

// ── the barrel roll ───────────────────────────────────────────────────────
// New in the 3D game: the one move that uses the third dimension. A full roll
// with a sideways kick, so it is a dodge, and a short window in which nothing
// can hit you. The kick scales with the hull's top speed, and the hull's own
// drag decides how far the slide carries: grip lets go for the roll, so it
// is a real sidestep of a few ship lengths.
export const ROLL_TIME = 0.45;
export const ROLL_COOLDOWN = 1.0;
export const ROLL_IFRAMES = 0.35;
/** Sideways kick as a fraction of the hull's top speed. */
export const ROLL_KICK = 0.5;

// ── the ship ──────────────────────────────────────────────────────────────
/** Collision radius: the original's 9px. */
export const SHIP_R = 9 * PX;
/** Grace after a hit, and after a hull breach. The original's INVULN and RESPAWN_INVULN. */
export const HIT_GRACE = 1.1;
export const BREACH_GRACE = 2.2;

// ── lasers (button 1) ────────────────────────────────────────────────────
// The original fired by itself. Here the player pulls the trigger, so the
// limit is a bank of energy that refills all the time: a full bank fires
// four lances a second, and a held trigger drains it over about five
// seconds down to the two a second the refill keeps up. The bank never
// stops the guns, so holding fire always fires.
/** Seconds between shots. */
export const SHOT_COOLDOWN = 0.25;
/** Lance speed and life: 95 units/s for 1.1s, about 100 units of reach. */
export const BOLT_SPEED = 95;
export const BOLT_LIFE = 1.1;
export const BOLT_DAMAGE = 1.4;
/**
 * The gunnery computer: steering stays on the plane, so a lance fired with a
 * hull inside this cone (radians either side of the nose, widened by the
 * target's size) is lifted or dropped onto the target's altitude.
 */
export const BOLT_ELEVATE_CONE = 0.14;
/** Laser bank: energy per shot, and refill per second. */
export const BANK_MAX = 100;
export const BANK_SHOT = 9;
export const BANK_REFILL = 18;

// ── torpedoes (button 2) ───────────────────────────────────────────
// Heavy ordnance: launched slow, they light their motor and accelerate onto
// the target, then go off in a big blast. Three in the rack, each reloading
// in the original's 3.4s. The seeker reaches far enough to lock a hull that
// is still on its approach.
export const TORP_SPEED = 16;
export const TORP_ACCEL = 75;
export const TORP_MAX = 64;
export const TORP_LIFE = 3.4;
export const TORP_TURN = 3.4;
export const TORP_SEEK = 95;
export const TORP_FUSE = 1.5;
export const TORP_BLAST = 9;
export const TORP_DAMAGE = 6;
export const TORP_RACK = 3;
export const TORP_RELOAD = 3.4;
/** Seconds between two torpedoes from a full rack. */
export const TORP_SPACING = 0.45;
/** Half-angle of the cone a torpedo looks for a target in, radians. */
export const TORP_CONE = 1.1;

// ── the field ─────────────────────────────────────────────────────────────
/** Rock radii by size: large, medium, small. */
export const ROCK_R = [3.2, 1.9, 1.05] as const;
export const ROCK_HP = [4, 2, 1] as const;
/** Points per rock, the classic arcade ladder: the smaller, the more. */
export const ROCK_POINTS = [20, 50, 100] as const;
/** How many large rocks' worth of field to keep around the ship. */
export const FIELD_TARGET = 34;
/** The field tiles in a square this wide around the ship. */
export const FIELD_BAND = 240;

// ── bulwarks ──────────────────────────────────────────────────────────────
// Massive asteroids that nothing breaks. They stop fire from both sides,
// they hurt to fly into, and the heavier enemy hulls hide behind them.
export const BULWARK_COUNT = 5;
export const BULWARK_R = [7, 12] as const;

// ── the run ───────────────────────────────────────────────────────────────
// Krail to the next refit: the first in about ten seconds of steady
// mining (the first card is the hook), then a climb, so refits come quickly
// early (a build takes shape before the sector turns dangerous) and spread
// out late (each one counts). A refit is one card, so they come a little
// more often than when a refit was two points on the web.
export const xpFor = (refit: number) => Math.round(6 + refit * 4 + Math.pow(refit, 1.8) * 0.75);
/** Seconds of slow motion between a full rail and the refit panel. */
export const CELEBRATE = 0.35;
/** Seconds the wreck drifts before the run report. */
export const DYING = 1.8;

// The kill chain: score only. Each hull kill inside the window adds one;
// breaking rock keeps it alive without adding. Every five is another 25%.
export const CHAIN_WINDOW = 3.2;
export const chainMult = (n: number) => 1 + Math.min(3, Math.floor(n / 5) * 0.25);

export const SCORE_PER_SECOND = 8;
export const SCORE_PER_CRYSTAL = 3;
export const OVERCHARGE_POINTS = 250;

// Hull repairs are meant to be rare: a small chance from a kill, never more
// than one every REPAIR_GAP seconds, never on a full hull, and one from each
// capital ship killed.
export const REPAIR_CHANCE = 0.06;
export const REPAIR_CHANCE_ELITE = 0.1;
export const REPAIR_GAP = 35;
// ── the shield ───────────────────────────────────────────────────────────
// Every ship flies with one. It is a meter, not a count: a hit takes a whole
// charge, and once the ship has gone SHIELD_DELAY seconds without damage the
// meter fills again, a charge every SHIELD_RECHARGE seconds. So pulling out
// of a fight builds it back up, and pressing on with it down costs plate.
export const SHIELD_MAX = 1;
export const SHIELD_RECHARGE = 10;
export const SHIELD_DELAY = 5;
/** Grace after a shield absorbs a hit: shorter than a plate's, so one charge never eats a volley. */
export const SHIELD_GRACE = 0.7;

// ── overcharge ────────────────────────────────────────────────────────────
// The reactor charges from near misses: fire that passes close, rock
// skimmed at speed, hulls passed close aboard, beams and webs brushed.
export const OC_MAX = 100;
export const OC_GAIN = { shot: 7, rock: 5, hull: 9, beam: 14, web: 6, strike: 8 } as const;
/** How close counts as a near miss, beyond touching: units. */
export const GRAZE = { shot: 1.6, rock: 1.4, hull: 2.6, beam: 1.6, web: 1.6, strike: 2.5 } as const;
export const RARE_FIRST = 50;
