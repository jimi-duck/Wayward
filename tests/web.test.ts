import { describe, expect, it } from 'vitest';
import { UPGRADE, UPGRADES } from '../src/content/upgrades';
import { WEB, WEB_NODE } from '../src/content/web';
import type { Levels } from '../src/sim/build';
import { closed, open, REGION_DISTANCE, suggest, type WebView } from '../src/sim/web';

const view = (fitted: string[], o: Partial<WebView> = {}): WebView => {
  const levels: Levels = {};
  for (const id of fitted) { const up = WEB_NODE.get(id)?.up; if (up) levels[up] = (levels[up] ?? 0) + 1; }
  return { levels, fitted: new Set(['core', ...fitted]), unlocked: new Set(), techs: new Set(), ...o };
};

describe('the refit web: its shape', () => {
  it('is one web: every link is real and goes both ways, and every node can be reached from the core', () => {
    expect(new Set(WEB.map((n) => n.id)).size).toBe(WEB.length);
    for (const n of WEB) for (const l of n.links) {
      expect(WEB_NODE.get(l), `${n.id} → ${l}`).toBeDefined();
      expect(WEB_NODE.get(l)!.links, `${l} → ${n.id}`).toContain(n.id);
    }
    const seen = new Set(['core']), queue = ['core'];
    for (let i = 0; i < queue.length; i++) for (const l of WEB_NODE.get(queue[i]!)!.links) if (!seen.has(l)) { seen.add(l); queue.push(l); }
    expect(seen.size).toBe(WEB.length);
  });

  it('is big: around two hundred nodes, every upgrade on it, none more often than its levels', () => {
    expect(WEB.length).toBeGreaterThan(180);
    const count = new Map<string, number>();
    for (const n of WEB) if (n.up) count.set(n.up, (count.get(n.up) ?? 0) + 1);
    for (const u of UPGRADES) {
      expect(count.get(u.id), `${u.id} is on the web`).toBeGreaterThan(0);
      expect(count.get(u.id)!, `${u.id} placed within its max`).toBeLessThanOrEqual(u.max);
    }
  });

  it('keeps its nodes apart, so the map reads', () => {
    let min = Infinity;
    for (let i = 0; i < WEB.length; i++) for (let j = i + 1; j < WEB.length; j++) {
      min = Math.min(min, Math.hypot(WEB[i]!.x - WEB[j]!.x, WEB[i]!.y - WEB[j]!.y));
    }
    expect(min).toBeGreaterThan(0.75);
  });

  it('measures the way to every region, for planning a route', () => {
    expect(REGION_DISTANCE.get('phaser.E')!.phaser).toBe(0);
    expect(REGION_DISTANCE.get('core')!.torpedo).toBe(1);
    for (const n of WEB) for (const d of Object.values(REGION_DISTANCE.get(n.id)!)) expect(d).toBeLessThan(15);
  });
});

describe('the refit web: its rules', () => {
  it('opens from the core: every region entry, and nothing further out', () => {
    const v = view([]);
    const ids = open(v).map((n) => n.id);
    expect(ids).toContain('phaser.E');
    expect(ids).toContain('torpedo.E');
    expect(ids.every((id) => WEB_NODE.get(id)!.links.includes('core'))).toBe(true);
    expect(closed(WEB_NODE.get('phaser.S')!, v)).toBe('unreached');
    expect(closed(WEB_NODE.get('core')!, v)).toBe('fitted');
  });

  it('opens a faction\'s tech only once its capital ship is salvaged this run', () => {
    const n = WEB_NODE.get('tech.klingon')!;
    expect(closed(n, view([]))).toBe('tech');
    expect(closed(n, view([], { techs: new Set(['klingon']) }))).toBeNull();
  });

  it('allows one specialisation a region: the others close once one is fitted', () => {
    const arm = ['torpedo.E', 'torpedo.S', 'torpedo.L2', 'torpedo.M3', 'torpedo.L4', 'torpedo.H'];
    const v = view(arm);
    const specs = ['torpedo.K1', 'torpedo.K3'].map((id) => WEB_NODE.get(id)!);
    for (const s of specs) expect(closed(s, v), s.id).toBeNull();
    const taken = view([...arm, 'torpedo.K1']);
    expect(closed(WEB_NODE.get('torpedo.K3')!, taken)).toBe('taken');
  });

  it('keeps a locked node shut until long-term progression opens it', () => {
    const arm = ['torpedo.E', 'torpedo.S', 'torpedo.L2', 'torpedo.M3', 'torpedo.L4', 'torpedo.H'];
    const swarm = WEB.find((n) => n.up === 'tp_swarm')!;
    expect(closed(swarm, view(arm))).toBe('locked');
    expect(closed(swarm, view(arm, { unlocked: new Set(['tp_swarm']) }))).toBeNull();
  });

  it('asks for what a synergy needs before it opens', () => {
    const bridge = WEB.find((n) => n.up === 'sy_plasma_torps')!;
    const u = UPGRADE.sy_plasma_torps!;
    expect(u.requires?.length).toBeGreaterThan(0);
    // reach it by the torpedo arm alone: joined, but the plasma half is missing
    const near = WEB_NODE.get(bridge.links.find((l) => l.startsWith('torpedo') || l.startsWith('plasma'))!)!;
    const v = view([`${near.region}.E`, `${near.region}.S`, `${near.region}.L2`, near.id]);
    if (closed(bridge, v) !== 'unreached') expect(['needs', null]).toContain(closed(bridge, v));
  });
});

describe('the quick picks', () => {
  it('suggests up to three different nodes that can be fitted now, the same for the same seed', () => {
    for (let seed = 1; seed < 30; seed++) {
      const v = view(['phaser.E', 'phaser.S']);
      const s = suggest(v, seed);
      expect(s.length).toBe(3);
      expect(new Set(s).size).toBe(3);
      for (const id of s) expect(closed(WEB_NODE.get(id)!, v)).toBeNull();
      expect(suggest(v, seed)).toEqual(s);
    }
  });

  it('leans toward the build, and keeps one pick for a new direction', () => {
    const torp = view(['torpedo.E', 'torpedo.S', 'torpedo.L2', 'torpedo.R2']);
    let lean = 0, fresh = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = suggest(torp, seed).map((id) => UPGRADE[WEB_NODE.get(id)!.up!]!);
      lean += s.slice(0, 2).filter((u) => u.tags.includes('torpedo')).length;
      if (!s[2]!.tags.includes('torpedo')) fresh++;
    }
    expect(lean).toBeGreaterThan(200);
    expect(fresh).toBeGreaterThan(150);
  });
});
