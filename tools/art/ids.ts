import { CAPTAINS } from '../../src/content/captains';
import { CONTACTS, EMBLEMS, FLEET, PLACES, regionSlug, SLOTS, type SlotId } from '../../src/content/art';
import { ENDINGS } from '../../src/content/endings';
import { REGIONS_LONG } from '../../src/content/regions';
import { OBSERVATIONS } from '../../src/content/situations';
import { FRAGMENTS_ALL } from '../../src/content/story';
import { FEATURE_ORDER } from '../../src/content/features';
import { MISSION_CARDS } from '../../src/content/missions';
import { VARIANT_ORDER } from '../../src/sim/enemies';

// Every picture the game could show, by slot: the names a file can have.
// Shared by the prompt writer (art-brief.pilot.ts), the prep step and tests/art.test.ts.

/** The names a file can have, by slot. */
export function artIds(): Record<SlotId, string[]> {
  return {
    captain: [...CAPTAINS.map((c) => c.id), 'calloway'],
    contact: Object.entries(CONTACTS).filter(([, v]) => v === null).map(([k]) => k),
    emblem: [...EMBLEMS],
    ship: VARIANT_ORDER,
    place: [...PLACES],
    ending: ENDINGS.map((e) => e.id),
    sighting: OBSERVATIONS.map((o) => o.flag),
    file: FRAGMENTS_ALL.map((f) => f.flag),
    region: [...new Set(REGIONS_LONG.map((r) => regionSlug(r.name)))],
    fleet: [...FLEET],
    job: MISSION_CARDS.map((c) => c.id),
    phenomenon: [...FEATURE_ORDER],
  };
}

/** Extra names a slot accepts besides its ids: a captain's second portrait once you have scarred them. */
export function artOptional(): Partial<Record<SlotId, string[]>> {
  return { captain: CAPTAINS.map((c) => `${c.id}-scarred`) };
}

export const slotOfDir = (dir: string): SlotId | undefined => (Object.values(SLOTS).find((s) => s.dir === dir))?.id;
