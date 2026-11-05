// ── the paint bay cut scene ───────────────────────────────────────────────
// Sam's friend Ned Varga does the hull on a work pad marked out beside the Frontier Supply Depot (owner, 5 November 2026: "a bit more
// of a cut scene ... like the paint job in GTA"; then "the building could just be an area marked out nearby the supply depot, where you
// fly in", and no person on screen). Hands off the stick: Ned brings her in on rails to the pad, a light curtain closes across the gate,
// the gantry's spray head sweeps the hull, and the far curtain lifts on her new paint as she rolls out. About twelve seconds, no card.
//
//   0        Ned's line is heard; the ship flies a curve round to the pad's mouth, then in
//   eC       she is on the pad and still; the near curtain comes down (eC-0.3 → eC+0.7)
//   eC..eW   the work: the spray head sweeps, the lamps strobe amber
//   eW       the paint is on (`hull_repainted`); the far curtain lifts; she rolls out
//   eW+3     the helm is hers again; the scene ends a moment later
//
// Plain data, no Three.js: the world drives the ship from `bayFrame`, the renderer draws the pad from the same numbers, and the
// tests read the timeline headless.

export interface Pt { x: number; z: number }

/** The pad: its centre, beside the depot, with the gates on the x axis (in on the left, out on the right). */
export const BAY = { off: 60, halfLen: 7, halfWid: 4.5, door: 3.2, clear: 34 } as const;
/** Seconds the ship takes to cover the curve in, at a plain pace: the curve's length over this, kept between the limits. */
export const BAY_PACE = 30;
export const BAY_IN = [3, 4.8] as const;
/** From the mouth to the middle of the pad, the work, and the roll out (seconds). */
export const BAY_ENTER = 1.4;
export const BAY_WORK = 4.8;
export const BAY_OUT = 3;
/** The pad's lights stay up this long after the helm is back. */
export const BAY_AFTER = 3.2;
/** The speed she leaves at (units/s). */
export const BAY_EXIT_SPEED = 14;
/** The light curtains take this long. */
export const SHUTTER_T = 1;

/** The pad's middle, for a depot at `port`. */
export const bayAt = (port: Pt): Pt => ({ x: port.x - BAY.off, z: port.z });
/** The mouth she comes up to: in front of the near gate, on the axis. */
export const bayMouth = (c: Pt): Pt => ({ x: c.x - BAY.halfLen - 16, z: c.z });

/** What the world keeps of a run of the cut scene. */
export interface Bay {
  /** Seconds since it began. */
  e: number;
  /** Where the ship was and which way she faced, when it began. */
  from: { x: number; z: number; heading: number };
  c: Pt;
  /** Seconds to the mouth. */
  tIn: number;
  /** The control point of the curve in, which keeps the depot out of her way. */
  via: Pt;
}

/** Start it: the ship at `s`, the depot at `port`. */
export function startBay(s: { x: number; z: number; heading: number }, port: Pt): Bay {
  const c = bayAt(port), m = bayMouth(c);
  // the curve bends out to the side she is on, round the depot's side of the pad
  const side = s.z >= port.z ? 1 : -1;
  const via = { x: m.x - 12, z: c.z + side * 46 };
  const len = Math.hypot(via.x - s.x, via.z - s.z) + Math.hypot(m.x - via.x, m.z - via.z);
  const tIn = Math.min(BAY_IN[1], Math.max(BAY_IN[0], len / BAY_PACE));
  return { e: 0, from: { x: s.x, z: s.z, heading: s.heading }, c, tIn, via };
}

/** Key times (seconds since the start). */
export function bayTimes(b: Bay): { mouth: number; inside: number; paint: number; release: number; end: number } {
  const inside = b.tIn + BAY_ENTER, paint = inside + BAY_WORK, release = paint + BAY_OUT;
  return { mouth: b.tIn, inside, paint, release, end: release + BAY_AFTER };
}

const ease = (u: number): number => { const t = Math.min(1, Math.max(0, u)); return t * t * (3 - 2 * t); };
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export interface BayFrame {
  x: number; z: number; heading: number; vx: number; vz: number;
  /** The helm is locked while true. */
  locked: boolean;
  /** 0 open, 1 shut: the near gate's light curtain, and the far one's. */
  near: number;
  far: number;
  /** The work is going on on the pad (the lamps strobe). */
  working: boolean;
  /** Which shot: 0 the chase camera, 1 the pad from the near side, 2 the far gate. */
  shot: 0 | 1 | 2;
}

/** The ship's place on the rails and the scene's state at `b.e`. */
export function bayFrame(b: Bay, e = b.e): BayFrame {
  const t = bayTimes(b), c = b.c, m = bayMouth(c), f = b.from;
  const h0 = f.heading;
  let x: number, z: number, heading = 0, vx = 0, vz = 0;
  const speedAt = (dx: number, dz: number, dt: number) => ({ vx: dx / dt, vz: dz / dt });
  const pos = (ee: number): { x: number; z: number; h: number } => {
    if (ee <= t.mouth) {
      // a quadratic curve from where she was, bent through `via`, eased at both ends
      const u = ease(ee / t.mouth), k = 1 - u;
      const px = k * k * f.x + 2 * k * u * b.via.x + u * u * m.x, pz = k * k * f.z + 2 * k * u * b.via.z + u * u * m.z;
      // heading along the curve (the tangent), blending from her own to the pad's axis at the end
      const tx = 2 * k * (b.via.x - f.x) + 2 * u * (m.x - b.via.x), tz = 2 * k * (b.via.z - f.z) + 2 * u * (m.z - b.via.z);
      const tan = Math.atan2(-tz, tx);
      const blend = ease(ee / 0.8) * (1 - ease((ee - (t.mouth - 1)) / 1)) ;
      const toward = h0 + wrap(tan - h0) * blend;
      const h = ee < t.mouth - 1 ? toward : toward + wrap(0 - toward) * ease((ee - (t.mouth - 1)) / 1);
      return { x: px, z: pz, h };
    }
    if (ee <= t.inside) {
      const u = ease((ee - t.mouth) / BAY_ENTER);
      return { x: m.x + (c.x - m.x) * u, z: c.z, h: 0 };
    }
    if (ee <= t.paint + 0.4) return { x: c.x, z: c.z, h: 0 };
    const u = Math.min(1, (ee - (t.paint + 0.4)) / (BAY_OUT - 0.4));
    // out of the far gate: from rest to the exit speed, then on at that speed
    const run = u < 1 ? BAY_EXIT_SPEED * (BAY_OUT - 0.4) * 0.5 * u * u : BAY_EXIT_SPEED * (BAY_OUT - 0.4) * 0.5 + BAY_EXIT_SPEED * (ee - t.release);
    return { x: c.x + run, z: c.z, h: 0 };
  };
  const p = pos(e), q = pos(e + 1 / 60);
  x = p.x; z = p.z; heading = p.h;
  ({ vx, vz } = speedAt(q.x - p.x, q.z - p.z, 1 / 60));
  const locked = e < t.release;
  const near = e < t.inside - 0.3 ? 0 : ease((e - (t.inside - 0.3)) / SHUTTER_T);
  const far = e < t.paint ? 1 : 1 - ease((e - t.paint) / SHUTTER_T);
  const shot: 0 | 1 | 2 = e < t.mouth - 0.2 ? 0 : e < t.paint ? 1 : e < t.release + 0.4 ? 2 : 0;
  return { x, z, heading, vx, vz, locked, near, far, working: e >= t.inside && e < t.paint, shot };
}

/** The ship's pose once the scene is over: out of the far gate at the exit speed, facing along the axis. */
export function bayExit(b: Bay): { x: number; z: number; heading: number; vx: number; vz: number } {
  const f = bayFrame(b, bayTimes(b).release);
  return { x: f.x, z: f.z, heading: 0, vx: BAY_EXIT_SPEED, vz: 0 };
}
