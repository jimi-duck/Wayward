import { BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, TorusGeometry, type BufferGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dirOf, type Sky } from './sky';
import { metal, seeded } from './kit';
import { designFor } from './hulls';

// ── far works ─────────────────────────────────────────────────────────────
// The things men built that you will never reach: a ring station, a fleet at
// anchor, a hulk. The fleets are the real hull designs, scaled up, in the same
// plating as the ships in front of them, but washed toward the haze they sit
// in (distance takes contrast first), with a few small warm lights. The whole
// set merges into four draws a sky, whatever it holds.

type Mats = { body: Material; dark: Material; lamp: Material; cold: Material; keys: Record<string, Material> };

/** Bake every built work's parts into one mesh a material: hundreds of parts would be hundreds of draws, every frame, for things that never move. */
function merged(all: Group): Group {
  all.updateMatrixWorld(true);
  const by = new Map<Material, BufferGeometry[]>();
  all.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    o.geometry.dispose();
    const list = by.get(o.material as Material);
    if (list) list.push(g); else by.set(o.material as Material, [g]);
  });
  const out = new Group();
  for (const [material, list] of by) {
    const geo = mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)))!;
    for (const g of list) g.dispose();
    out.add(new Mesh(geo, material));
  }
  return out;
}

function materials(sky: Sky): Mats {
  // distance takes contrast first: the colours sit near the sky's haze, a little under it
  const haze = sky.star.clone().lerp(new Color(0.34, 0.4, 0.52), 0.78);
  const coat = { painted: true, worn: 0.4, roughness: 0.66, metalness: 0.3, scale: 0.7 };
  const body = metal({ ...coat, tint: haze.clone().multiplyScalar(0.5) });
  const dark = metal({ ...coat, tint: haze.clone().multiplyScalar(0.28), scale: 0.9 });
  for (const m of [body, dark]) m.fog = false;
  const lamp = new MeshBasicMaterial({ color: new Color(1.5, 1.05, 0.58), toneMapped: false, fog: false });
  const cold = new MeshBasicMaterial({ color: new Color(0.5, 0.16, 0.06), toneMapped: false, fog: false });
  return { body, dark, lamp, cold, keys: { hull: dark, paint: body, patch: body, dark, trim: body, glow: cold, lamp, crystal: dark, violet: dark } };
}

/** One of the fleet's own designs, built in the far set. */
function hullOf(m: Mats, kind: Parameters<typeof designFor>[0], faction: Parameters<typeof designFor>[1]): Group {
  return designFor(kind, faction)!.k.build(m.keys);
}

/** A ring station: a wide hoop of habitat blocks round a hub, spokes, a lit rim. */
function ringStation(m: Mats, rnd: () => number): Group {
  const g = new Group();
  const R = 70;
  g.add(new Mesh(new TorusGeometry(R, 3.2, 6, 48), m.dark));
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const b = new Mesh(new BoxGeometry(9, 7 + rnd() * 5, 8), m.body);
    b.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    b.rotation.z = a;
    g.add(b);
    if (i % 3 === 0) {
      const l = new Mesh(new BoxGeometry(1.2, 1.2, 1.2), m.lamp);
      l.position.set(Math.cos(a) * (R + 7), Math.sin(a) * (R + 7), 0);
      g.add(l);
    }
  }
  const hub = new Mesh(new CylinderGeometry(9, 11, 40, 12).rotateX(Math.PI / 2), m.body);
  g.add(hub);
  for (let i = 0; i < 4; i++) {
    const s = new Mesh(new BoxGeometry(R * 2, 1.6, 1.6), m.dark);
    s.rotation.z = (i / 4) * Math.PI + 0.4;
    g.add(s);
  }
  const spire = new Mesh(new CylinderGeometry(0.8, 1.2, 70, 6).rotateX(Math.PI / 2), m.dark);
  spire.position.z = 50;
  g.add(spire);
  const tip = new Mesh(new BoxGeometry(2.4, 2.4, 2.4), m.lamp);
  tip.position.z = 86;
  g.add(tip);
  g.rotation.set(1.1 + rnd() * 0.3, rnd() * 0.8, 0);
  return g;
}

/** A fleet at anchor: three of the real capital designs in echelon, one drive cold. */
function fleet(m: Mats, rnd: () => number): Group {
  const g = new Group();
  const picks: Array<[Parameters<typeof designFor>[0], Parameters<typeof designFor>[1], number]> = [['warbird', 'office', 78], ['lancer', 'custody', 64], ['freighter', 'custody', 52]];
  picks.forEach(([kind, faction, r], i) => {
    const ship = hullOf(m, kind, faction);
    ship.scale.setScalar(r);
    ship.position.set(i * 120 - 120, i * 16 - 16 + (rnd() - 0.5) * 8, i * 70);
    ship.rotation.set(0, 0.08 * i, 0);
    g.add(ship);
  });
  g.rotation.set(0.2, rnd() * 0.5, 0.08);
  return g;
}

/** A hulk: a designed hull tilted off its keel, with its torn plating and scattered rock strewn about it, one cold glow. */
function hulk(m: Mats, rnd: () => number): Group {
  const g = new Group();
  const hull = hullOf(m, 'raptor', 'gutter');
  hull.scale.setScalar(70);
  hull.rotation.set(0.5, 0.3, -0.3);
  g.add(hull);
  const chunk = new IcosahedronGeometry(1, 0);
  for (let i = 0; i < 16; i++) {
    const s = 3 + rnd() * 9;
    const p = new Mesh(chunk, i % 3 ? m.dark : m.body);
    p.position.set(-30 + (rnd() - 0.5) * 140, (rnd() - 0.5) * 50, (rnd() - 0.5) * 60);
    p.scale.set(s * (1 + rnd() * 0.6), s, s * (0.6 + rnd() * 0.5));
    p.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    g.add(p);
  }
  const l = new Mesh(new BoxGeometry(1.6, 1.6, 1.6), m.cold);
  l.position.set(-70, 4, 0);
  g.add(l);
  g.rotation.set(0.5, rnd() * 1.2, 0.2);
  return g;
}

/** One or two far works for a sky, set on the sphere of radius `D`, away from the planet. */
export function farWorks(sky: Sky, D: number): Group {
  const all = new Group();
  const rnd = seeded(sky.seed * 7 + 3);
  const m = materials(sky);
  const makers = [ringStation, fleet, hulk];
  const n = 2;
  const start = Math.floor(rnd() * makers.length);
  for (let i = 0; i < n; i++) {
    const work = makers[(start + i) % makers.length]!(m, rnd);
    const avoid = sky.planet ? sky.planet.az : 0;
    const az = avoid + 70 + rnd() * 100 + i * 120, el = -4 + rnd() * 16;
    work.position.copy(dirOf(az, el).multiplyScalar(D * (0.7 + rnd() * 0.15)));
    work.scale.setScalar(1.9 + rnd() * 0.9);
    all.add(work);
  }
  return merged(all);
}
