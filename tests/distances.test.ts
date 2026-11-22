import { describe, expect, it } from 'vitest';
import { STORY_PLACES } from '../src/content/script/places';
import { ROAD_LANE } from '../src/sim/chart';
import { newJourney } from '../src/sim/journey';
import { placeAt } from '../src/sim/places';

// Every stop is its scene, not a haul (plan "Make every stop readable", 22 November 2026): the owner read a story place as
// 25 km away when the number beside it was the Jump Gate's, 25 km off. The road's gates are close, and its places closer.

describe('distances on the road', () => {
  it('puts every road gate 5.5 to 6.5 km from arrival', () => {
    for (const seed of [1, 4242, 77]) {
      const j = newJourney(seed, false, 'road');
      for (const s of j.chart.systems.filter((x) => x.kind !== 'home')) {
        expect(s.lane, s.name).toBeGreaterThanOrEqual(ROAD_LANE[0]);
        expect(s.lane, s.name).toBeLessThanOrEqual(ROAD_LANE[1]);
      }
    }
  });

  it('puts every story place within 4 km of arrival (a trail of pickups at most), and well short of the gate', () => {
    for (const p of STORY_PLACES) {
      for (const lane of [ROAD_LANE[0], ROAD_LANE[1]]) {
        const at = placeAt(p, { lane: { x: 0, z: -lane } as never });
        const d = Math.hypot(at.x, at.z);
        expect(d, p.id).toBeLessThan(400);
        expect(Math.hypot(at.x, at.z + lane), p.id).toBeGreaterThan(150);
      }
    }
  });
});
