// One id sequence per world, shared by everything in it (rock, hulls, fire,
// pickups), so a torpedo's lock can never point at the wrong kind of thing.
// The world makes its sequence current whenever it runs, which keeps two
// worlds in one process (tests, the scripted pilot) each deterministic.

export class Ids {
  n = 1;
}

let current = new Ids();

export function useIds(ids: Ids): void {
  current = ids;
}

export const newId = (): number => current.n++;
