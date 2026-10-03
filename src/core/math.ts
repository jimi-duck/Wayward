export const TAU = Math.PI * 2;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * A critically damped spring toward `target`: no overshoot, and it settles in
 * roughly `smoothTime` seconds whatever the frame rate. `state.v` carries the
 * velocity between calls. (The usual game-engine SmoothDamp.)
 */
export function smoothDamp(current: number, target: number, state: { v: number }, smoothTime: number, dt: number): number {
  if (dt <= 0) return current;
  const omega = 2 / Math.max(1e-4, smoothTime);
  const x = omega * dt;
  const k = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (state.v + omega * change) * dt;
  state.v = (state.v - omega * temp) * k;
  return target + (change + temp) * k;
}

/** smoothDamp for angles: always takes the short way round. */
export function smoothDampAngle(current: number, target: number, state: { v: number }, smoothTime: number, dt: number): number {
  return smoothDamp(current, current + angleDelta(current, target), state, smoothTime, dt);
}

/** The signed angle from `from` to `to`, in -PI..PI: the short way round. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d < -Math.PI) d += TAU;
  return d;
}
