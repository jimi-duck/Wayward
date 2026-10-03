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
/** A stick turns the nose this much faster than the keys do. */
export const STICK_TURN = 1.7;

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
