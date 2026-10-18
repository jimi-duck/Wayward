import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WALL } from '../src/content/wall';
import { CIVIC_START, WAKE_DROP, civicBand, civicToll } from '../src/sim/civic';
import { CARD_BY_ID, choiceView, type Ctx } from '../src/sim/comms';
import { newJourney } from '../src/sim/journey';
import { migrate } from '../src/meta/save';
import { cerroReveal, wallView } from '../src/sim/wall';
import { World } from '../src/sim/world';
import { Rng } from '../src/sim/rng';

const ctx = (o: Partial<Ctx> = {}): Ctx => ({
  t: 400, heat: 0.2, cyrite: 20, fuel: 20, need: 20, tank: 40, chits: 100, plates: 3, maxPlates: 3, levels: {}, flags: new Set(),
  standing: {}, place: 'open', hostiles: 0, supplies: 10, kind: 'transit', netted: false, behind: 3, ...o,
});

describe('the Civic Score', () => {
  it('starts at 412 on the Story journey and is its own number', () => {
    const j = newJourney(7);
    expect(j.carry.civic).toBe(CIVIC_START);
    expect(CIVIC_START).toBe(412);
    expect(civicBand(CIVIC_START - WAKE_DROP)).not.toBe(civicBand(CIVIC_START));
  });
  it('is absent in Arcade', () => {
    expect(new World(3).civic).toBeUndefined();
  });
  it('raises the toll for officials below 300 and not otherwise', () => {
    expect(civicToll('office', 299)).toBeGreaterThan(1);
    expect(civicToll('office', 350)).toBe(1);
    expect(civicToll('drift', 100)).toBe(1);
  });
  it('greys "show" on the registry card once the Score is low, and opens it when high', () => {
    const def = CARD_BY_ID.story_registry!;
    expect(def.choices.length).toBeLessThanOrEqual(6);
    const show = def.choices.find((c) => c.id === 'show')!;
    expect(choiceView(show, def, ctx({ civic: 374 }), 0).ok).toBe(false);
    expect(choiceView(show, def, ctx({ civic: 412 }), 0).ok).toBe(true);
  });
});

describe('the Cerro reveal', () => {
  it('makes good a missed wake, once, and hands over the reserves clue', () => {
    const c = newJourney(7).carry;
    const lines = cerroReveal(c);
    expect(c.civic).toBe(CIVIC_START - WAKE_DROP);
    expect(c.flags).toEqual(expect.arrayContaining(['archive_woke', 'clue_reserves']));
    expect(lines).toHaveLength(3);
    expect(cerroReveal(c)).toEqual([]);
    expect(c.civic).toBe(CIVIC_START - WAKE_DROP);
  });
  it('does not charge twice when the wake was answered', () => {
    const c = newJourney(7).carry;
    c.flags.push('archive_woke');
    c.civic = 374;
    cerroReveal(c);
    expect(c.civic).toBe(374);
  });
});

describe('save 17 to 18', () => {
  it('gives a past-Cerro save 374 and the two Cerro flags, and is idempotent', () => {
    const old = JSON.parse(readFileSync('tests/fixtures/journey-v17.json', 'utf8'));
    const a = migrate(structuredClone(old))!;
    expect(a.version).toBe(18);
    if (a.trail.length >= 2) {
      expect(a.carry.civic).toBe(374);
      expect(a.carry.flags).toEqual(expect.arrayContaining(['archive_woke', 'clue_reserves']));
    } else expect(a.carry.civic).toBe(412);
    expect(migrate(JSON.parse(JSON.stringify(a)))!.carry.civic).toBe(a.carry.civic);
  });
});

describe('the Wall', () => {
  it('lists found items first and always gives a lead', () => {
    const v = wallView(['archive_woke', 'clue_reserves'], 0);
    expect(v.rows[0]!.found).toBe(true);
    expect(v.lead.length).toBeGreaterThan(0);
    expect(wallView([], -1).rows.every((r) => !r.found)).toBe(true);
  });
  it('plays the short chart on its own subset', () => {
    const v = wallView([], 6, 'three');
    expect(v.file.of).toBeLessThan(wallView([], 6, 'eight').file.of);
  });
  it('has unique flags', () => {
    expect(new Set(WALL.map((w) => w.flag)).size).toBe(WALL.length);
  });
  void Rng;
});

describe('follow-up beats', () => {
  it('wait on the choice that opens them', async () => {
    const { BEATS } = await import('../src/content/story');
    const needs = BEATS.filter((b) => b.needs);
    expect(needs.map((b) => b.card)).toEqual(expect.arrayContaining(['story_brook_arrest', 'story_oduya_rigs']));
    for (const b of needs) expect(b.needs).toMatch(/^(brook_met|pact_holdfast|broker|frag_blackbox|ferry_met|archive_woke|ines_berth)$/);
  });
});
