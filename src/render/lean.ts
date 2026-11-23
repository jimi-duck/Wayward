// Lean geometry: the mesh detail a phone gets (docs/PERF.md pass 15). Quality tiers change pixels, shadows
// and glow at any time; meshes are built once, so how fine they are is decided once, before the sector is
// built: lean on a touch screen or a device that starts at Phone or Low, full on a computer.
// A phone the governor later lifts to Medium keeps the lean meshes (a vertex cost it is spared either way).

let leanOn = false;

/** Decide once, before any mesh is built. */
export function setLeanGeometry(on: boolean): void {
  leanOn = on;
}

/** Are meshes being built lean? */
export function leanGeometry(): boolean {
  return leanOn;
}

/** Pick a mesh detail: the full one, or the lean one on a phone. */
export function detail(full: number, lean: number): number {
  return leanOn ? lean : full;
}
