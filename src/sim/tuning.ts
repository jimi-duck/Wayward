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
// can hit you (used from M2). The kick scales with the hull's top speed, and
// the hull's own drag decides how far the slide carries: the Sovereign slides
// furthest, as a heavy ship should.
export const ROLL_TIME = 0.45;
export const ROLL_COOLDOWN = 1.0;
export const ROLL_IFRAMES = 0.35;
/** Sideways kick as a fraction of the hull's top speed. */
export const ROLL_KICK = 0.4;

// ── the ship ──────────────────────────────────────────────────────────────
/** Collision radius: the original's 9px. */
export const SHIP_R = 9 * PX;
/** Grace after a hit, and after a hull breach. The original's INVULN and RESPAWN_INVULN. */
export const HIT_GRACE = 1.1;
export const BREACH_GRACE = 2.2;

// ── phasers (button 1) ────────────────────────────────────────────────────
// The original fired by itself. Here the player pulls the trigger, so the
// rate is the original's and the limit is a bank of energy instead: hold the
// trigger and it drains, let go and it refills.
/** Seconds between shots: the original's SHOT_COOLDOWN. */
export const SHOT_COOLDOWN = 0.235;
/** Beam speed and life: 11px a frame for 1.35s. */
export const BOLT_SPEED = 11 * PX * HZ;
export const BOLT_LIFE = 1.35;
export const BOLT_DAMAGE = 1;
/** Phaser bank: energy per shot, refill per second, and the pause before it refills. */
export const BANK_MAX = 100;
export const BANK_SHOT = 7;
export const BANK_REFILL = 22;
export const BANK_DELAY = 0.35;

// ── photon torpedoes (button 2) ───────────────────────────────────────────
// The original's numbers: 324px/s, a 2.6s fuse, a 78px blast for 4 damage,
// a 4.2 rad/s turn and a 520px seeker. Three in the rack, each reloading in
// the original's 3.4s.
export const TORP_SPEED = 5.4 * PX * HZ;
export const TORP_LIFE = 2.6;
export const TORP_TURN = 4.2;
export const TORP_SEEK = 520 * PX;
export const TORP_FUSE = 13 * PX;
export const TORP_BLAST = 78 * PX;
export const TORP_DAMAGE = 4;
export const TORP_RACK = 3;
export const TORP_RELOAD = 3.4;
/** Seconds between two torpedoes from a full rack. */
export const TORP_SPACING = 0.35;
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
