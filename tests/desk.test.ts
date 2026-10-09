import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/content/cards';
import { CARD_BY_ID, weightOf } from '../src/sim/comms';
import { CHATTER } from '../src/content/chatter';
import { Desk, DESK } from '../src/sim/desk';
import { Rng } from '../src/sim/rng';

const desk = () => new Desk(new Rng(1), 0);

describe('the weights', () => {
  it('put the story, Calloway, captains, blockades and shakedowns on the full panel', () => {
    for (const c of CARDS) {
      if (c.trigger === 'story' || c.trigger === 'offer' || c.trigger === 'hunt' || c.kind === 'shakedown' || c.kind === 'checkpoint') expect(weightOf(c), c.id).toBe('major');
      if (c.choices.length > 3) expect(weightOf(c), c.id).toBe('major');
    }
  });

  it('make a plain job a routine call and a warning an important one', () => {
    expect(weightOf(CARD_BY_ID.haul_job!)).toBe('routine');
    expect(weightOf(CARD_BY_ID.sweep_warning!)).toBe('important');
    expect(weightOf(CARD_BY_ID.runner_favour!)).toBe('important');
  });

  it('keep calls to three answers, so they fit a card that rides along', () => {
    for (const c of CARDS) if (weightOf(c) !== 'major') expect(c.choices.length, c.id).toBeLessThanOrEqual(3);
  });
});

describe('the desk', () => {
  it('holds every card in a fight, and on a jump or a dock', () => {
    const d = desk();
    d.offer(CARD_BY_ID.story_yard!, 'major', 0);
    for (const busy of ['fight', 'transit'] as const) expect(d.next(busy, 100)).toBeNull();
    expect(d.next('free', 100)?.def.id).toBe('story_yard');
  });

  it('lets a card wait through a fight and speak a few seconds after it', () => {
    const d = desk();
    d.offer(CARD_BY_ID.story_yard!, 'major', 0);
    d.watch('fight', 50);
    expect(d.next('free', 51)).toBeNull();
    expect(d.next('free', 50 + DESK.settle.major + 0.1)).not.toBeNull();
  });

  it('keeps off the player while the beam is on rock, and flying tight', () => {
    const d = desk();
    d.offer(CARD_BY_ID.haul_job!, 'routine', 0);
    d.watch('mining', 200);
    expect(d.next('mining', 200)).toBeNull();
    expect(d.next('tight', 200)).toBeNull();
    expect(d.next('free', 200 + DESK.mineSettle + 0.1)).not.toBeNull();
  });

  it('plays the heaviest first and holds the lighter while a heavier one waits', () => {
    const d = desk();
    d.offer(CARD_BY_ID.haul_job!, 'routine', 0);
    d.offer(CARD_BY_ID.sweep_warning!, 'important', 1);
    d.offer(CARD_BY_ID.story_yard!, 'major', 2);
    expect(d.next('free', 300)?.tier).toBe('major');
    d.closed(300);
    expect(d.next('free', 301)).toBeNull();
    expect(d.next('free', 300 + DESK.gap.important)?.tier).toBe('important');
  });

  it('spaces cards out: a routine call waits longer than a major one', () => {
    const d = desk();
    d.closed(100);
    d.offer(CARD_BY_ID.haul_job!, 'routine', 100);
    expect(d.next('free', 100 + DESK.gap.major + 1)).toBeNull();
    expect(d.next('free', 100 + DESK.gap.routine + 1)).not.toBeNull();
  });

  it('drops a routine card that waited too long, and one tied to a port after docking', () => {
    const d = desk();
    d.offer(CARD_BY_ID.haul_job!, 'routine', 0);
    d.offer(CARD_BY_ID.port_news!, 'routine', 0, true);
    d.sweep(DESK.stale.routine + 1, false);
    expect(d.queue).toHaveLength(0);
    d.offer(CARD_BY_ID.port_news!, 'routine', 0, true);
    d.sweep(5, true);
    expect(d.queue).toHaveLength(0);
  });

  it('hears a card once, however often it is offered', () => {
    const d = desk();
    d.offer(CARD_BY_ID.story_yard!, 'major', 0);
    d.offer(CARD_BY_ID.story_yard!, 'major', 1);
    expect(d.queue).toHaveLength(1);
  });

  it('wants a card by chance only on an opening, in a sortie that has one, or after a long quiet', () => {
    const d = desk();
    d.allowed = true;
    expect(d.wants(100, 'free')).toBe(false);
    d.moment('won', 100, new Rng(1));
    expect(d.wants(101, 'free')).toBe(true);
    d.used();
    expect(d.wants(102, 'free')).toBe(false);
    const e = desk();
    e.allowed = true;
    expect(e.wants(DESK.quiet + 1, 'free')).toBe(true);
    e.allowed = false;
    expect(e.wants(DESK.quiet + 1, 'free')).toBe(false);
  });
});

describe('the radio', () => {
  it('speaks in a quiet, while mining, but never in a fight or on a jump, and not too often', () => {
    const d = desk();
    expect(d.pingFor('free', 1, new Rng(2))).toBeNull();
    d.nextPing = 0;
    expect(d.pingFor('fight', 100, new Rng(2))).toBeNull();
    expect(d.pingFor('transit', 100, new Rng(2))).toBeNull();
    expect(d.pingFor('mining', 100, new Rng(2))).toBe('calm');
    d.spoke(100);
    d.nextPing = 0;
    expect(d.pingFor('free', 100 + DESK.ping.least - 1, new Rng(2))).toBeNull();
  });

  it('keeps to a few lines a sortie', () => {
    const d = desk();
    for (let i = 0; i < DESK.ping.max; i++) d.spoke(i * 1000);
    d.nextPing = 0;
    expect(d.pingFor('free', 1e6, new Rng(2))).toBeNull();
  });

  it('has lines for every moment, and none that ask anything of the player', () => {
    for (const m of ['arrive', 'won', 'haul', 'calm'] as const) expect(CHATTER.some((c) => c.on.includes(m)), m).toBe(true);
    expect(new Set(CHATTER.map((c) => c.id)).size).toBe(CHATTER.length);
  });
});
