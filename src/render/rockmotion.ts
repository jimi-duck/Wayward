// How a rock is drawn through its first moments, apart from the simulation.

/**
 * `scale` is the share of its radius a rock is drawn at and `slide` the share of its start offset still
 * to travel. A rock that drifts in out of the fog grows in; a piece of a broken rock is at its full
 * size from the first frame and only eases out the last bit of the way, so a break never swells.
 */
export function rockPose(age: number, piece: boolean): { scale: number; slide: number } {
  if (piece) {
    const u = Math.min(1, age / 0.25);
    return { scale: 1, slide: (1 - u) * (1 - u) };
  }
  const g = Math.min(1, age / 0.45);
  return { scale: g * g * (3 - 2 * g), slide: 0 };
}
