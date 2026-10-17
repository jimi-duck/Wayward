import { Box3, BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Vector3, type BufferGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dirOf, type Sky } from './sky';
import { Kit, metal, seeded, type V3 } from './kit';
import { capitalDesign, designFor } from './hulls';

// ── far works ─────────────────────────────────────────────────────────────
// The things men built that you will never reach: a ring station, a fleet at
// anchor, a hulk. The fleets are the real hull designs, scaled up, in the same
// plating as the ships in front of them, but washed toward the haze they sit
// in (distance takes contrast first), with rows of small warm lights. The
// shapes are built, and their occlusion baked, once a session; each sky only
// re-skins them in its own haze and bakes the set into four draws.

type Mats = { body: Material; mid: Material; dark: Material; lamp: Material; cold: Material; keys: Record<string, Material> };

/** Bake every built work's parts into one mesh a material: hundreds of parts would be hundreds of draws, every frame, for things that never move. */
function merged(all: Group): Group {
  all.updateMatrixWorld(true);
  const by = new Map<Material, BufferGeometry[]>();
  all.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'wear', 'kitOcc'].includes(k)) g.deleteAttribute(k);
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

/**
 * The set for one sky. `grain` is the plating's repeats per model unit: a station is built in plain units, a hull in
 * its own (about one long), so each wants a different grain to show panels, not blotches or mush.
 */
function materials(sky: Sky, grain: number): Mats {
  // distance takes contrast first: the colours sit near the sky's haze, a little under it
  const haze = sky.star.clone().lerp(new Color(0.34, 0.4, 0.52), 0.78);
  // a cool lift on the shaded side, so a hull turned from the sun is still a hull and not a hole
  const lift = haze.clone().multiplyScalar(0.06);
  const coat = { painted: true, worn: 0.4, roughness: 0.7, metalness: 0.16, scale: grain, emissive: lift };
  const body = metal({ ...coat, tint: haze.clone().multiplyScalar(1.05) });
  const mid = metal({ ...coat, tint: haze.clone().multiplyScalar(0.66) });
  const dark = metal({ ...coat, tint: haze.clone().multiplyScalar(0.4), scale: grain * 1.3 });
  for (const m of [body, mid, dark]) m.fog = false;
  const lamp = new MeshBasicMaterial({ color: new Color(1.5, 1.05, 0.58), toneMapped: false, fog: false });
  const cold = new MeshBasicMaterial({ color: new Color(0.5, 0.16, 0.06), toneMapped: false, fog: false });
  return { body, mid, dark, lamp, cold, keys: { body, mid, hull: mid, paint: body, patch: body, dark, trim: body, glow: cold, lamp, cold, crystal: dark, violet: dark } };
}

/** Both sets for a sky: plain-unit builds (the station) and hull-unit builds (fleets, hulks). */
interface Skins { station: Mats; hull: Mats }
function skins(sky: Sky): Skins {
  return { station: materials(sky, 0.4), hull: materials(sky, 7) };
}

// ── the shapes, built once ────────────────────────────────────────────────
type Kind = Parameters<typeof designFor>[0];
type Faction = Parameters<typeof designFor>[1];

const kits = new Map<string, Kit>();
function once(key: string, make: () => Kit): Kit {
  let k = kits.get(key);
  if (!k) { k = make(); kits.set(key, k); }
  return k;
}

const BASIS = new Matrix4(), QUAT = new Quaternion(), UNIT = new Vector3(1, 1, 1), AXIS_X = new Vector3(1, 0, 0);

/** A drum or slab laid out along a direction, for parts that radiate from a point. */
function spar(k: Kit, key: string, a: V3, b: V3, w: number, h = w): void {
  const from = new Vector3(...a), to = new Vector3(...b), len = from.distanceTo(to);
  QUAT.setFromUnitVectors(AXIS_X, to.clone().sub(from).normalize());
  BASIS.compose(from.add(to).multiplyScalar(0.5), QUAT, UNIT);
  k.addMatrix(key, new BoxGeometry(len, h, w), BASIS);
}

/** Round about z: a block placed on a ring at angle `a`, `rad` out and `tan` along. */
function onRing(a: number, rad: number, tan: number, z: number): V3 {
  return [Math.cos(a) * rad - Math.sin(a) * tan, Math.sin(a) * rad + Math.cos(a) * tan, z];
}

/** A ring station: a hoop of habitat blocks with lit window rows, docking arms and solar wings, spokes to a banded hub, a mast. */
function stationKit(): Kit {
  const k = new Kit(), rnd = seeded(2301);
  const R = 70, N = 24;
  k.ring('dark', R, 2.8, [0, 0, 0], 'z', 72);
  k.ring('mid', R - 11, 1, [0, 0, 7], 'z', 56);
  k.ring('mid', R - 11, 1, [0, 0, -7], 'z', 56);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, rot: V3 = [0, 0, a];
    const h = 9 + rnd() * 4, w = 11 + rnd() * 3, tall = i % 4 === 0;
    k.add('body', new BoxGeometry(h, 13.4, w), onRing(a, R, 0, 0), rot);
    k.add('mid', new BoxGeometry(h * 0.5, 10, w * 0.62), onRing(a, R + h * 0.5 + 1, 0, 0), rot);
    k.add('dark', new BoxGeometry(2, 14.6, w * 0.8), onRing(a, R - h * 0.5, 0, 0), rot);
    if (tall) k.add('body', new BoxGeometry(5, 5, w * 1.3), onRing(a, R + h * 0.5 + 5.5, 0, 0), rot);
    // lit window rows on the outer face and both ends
    for (let row = 0; row < 3; row++) for (let c = 0; c < 4; c++) {
      if (rnd() < 0.42) continue;
      const t = (c - 1.5) * 3.2, y = (row - 1) * 2.4;
      k.add('lamp', new BoxGeometry(0.3, 1.5, 0.9), onRing(a, R + h * 0.5 + (tall ? 8.1 : 3.6), t, y * 0.6), rot);
      k.add('lamp', new BoxGeometry(1.8, 1.1, 0.25), onRing(a, R + (row - 1) * 2.2, t, w / 2 + 0.1), rot);
      k.add('lamp', new BoxGeometry(1.8, 1.1, 0.25), onRing(a, R + (row - 1) * 2.2, t, -w / 2 - 0.1), rot);
    }
    // a docking arm on every third block, a solar wing on every sixth
    if (i % 3 === 1) {
      k.add('dark', new CylinderGeometry(1.4, 1.4, 12, 8).rotateZ(Math.PI / 2), onRing(a, R + h * 0.5 + 7, 0, w * 0.34), rot);
      k.add('lamp', new BoxGeometry(0.6, 0.6, 0.6), onRing(a, R + h * 0.5 + 13.4, 0, w * 0.34), rot);
    }
    if (i % 6 === 2) {
      k.add('mid', new BoxGeometry(0.5, 4, 30), onRing(a, R + h * 0.5 + 3, 0, w * 0.5 + 16), rot);
      k.add('dark', new BoxGeometry(0.7, 4.4, 1), onRing(a, R + h * 0.5 + 3, 0, w * 0.5 + 1), rot);
      for (let s = 0; s < 6; s++) k.add('dark', new BoxGeometry(0.62, 4, 0.5), onRing(a, R + h * 0.5 + 3, 0, w * 0.5 + 4.5 + s * 4.6), rot);
    }
  }
  // the hub: a spine, banded and ringed, lit at the docking collar
  k.cyl('body', 8.5, 8.5, 54, [0, 0, 0], 'z', 16);
  for (const z of [-18, -9, 9, 18]) k.cyl('mid', 9.6, 9.6, 3.6, [0, 0, z], 'z', 16);
  k.cyl('dark', 5, 8.4, 6, [0, 0, 29.5], 'z', 16);
  k.cyl('dark', 6, 3, 8, [0, 0, -31], 'z', 12);
  k.ring('mid', 10, 0.7, [0, 0, 0], 'z', 24);
  for (let i = 0; i < 12; i++) k.box('lamp', [1, 1, 0.5], onRing((i / 12) * Math.PI * 2, 9, 0, 27));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.35;
    spar(k, 'dark', onRing(a, 8, 0, 0), onRing(a, R - 4, 0, i % 2 ? 4 : -4), 2.2, 2.2);
    spar(k, 'mid', onRing(a, 8, 0, 9), onRing(a, R - 11, 0, 7), 0.7, 0.7);
  }
  k.cyl('dark', 0.9, 1.4, 62, [0, 0, 62], 'z', 6);
  k.box('lamp', [2.4, 2.4, 2.4], [0, 0, 94]);
  for (const z of [48, 70]) k.box('mid', [9, 0.4, 0.6], [0, 0, z]);
  k.bakeOcclusion(2.6);
  return k;
}

/** One of the fleet's own designs, with its lit slits made real so they read at range. */
function shipKit(kind: Kind, faction: Faction): Kit {
  return once(`${kind}:${faction}`, () => {
    const design = (capitalDesign(kind, faction) ?? designFor(kind, faction))!;
    for (const [x, y, z, len, wid] of design.lamps) design.k.add('lamp', new BoxGeometry(Math.max(len, 0.05) * 1.5, 0.028, Math.max(wid, 0.05) * 1.5), [x, y, z]);
    design.k.bakeOcclusion(0.04);
    return design.k;
  });
}

const DUMMY = new MeshBasicMaterial();
function extent(k: Kit): Box3 {
  const keys: Record<string, Material> = {};
  for (const n of ['hull', 'paint', 'patch', 'dark', 'trim', 'glow', 'lamp', 'crystal', 'violet']) keys[n] = DUMMY;
  return new Box3().setFromObject(k.build(keys));
}

/** What a hulk is made of past the hull: torn plating, exposed ribs, drifting plates and lumps. Built in the hull's own units. */
function hulkKit(): Kit {
  return once('hulk', () => {
    const k = designFor('raptor', 'gutter')!.k, rnd = seeded(2309);
    const box = extent(k), L = box.max.x - box.min.x, W = box.max.z - box.min.z, H = box.max.y - box.min.y;
    const tail = box.min.x;
    // the stern torn open: ribs and spars reaching out of the break
    for (let i = 0; i < 7; i++) {
      const z = (i / 6 - 0.5) * W * 0.8, y = (rnd() - 0.4) * H * 0.7, len = L * (0.1 + rnd() * 0.22);
      spar(k, 'dark', [tail + L * 0.05, y, z], [tail - len, y + (rnd() - 0.5) * H * 0.6, z + (rnd() - 0.5) * W * 0.4], L * 0.012, L * 0.02);
      if (i % 2) k.add('mid', new BoxGeometry(L * 0.012, H * 0.42, W * 0.05), [tail - len * 0.5, y, z], [rnd() * 0.5, rnd() - 0.5, rnd() * 0.5]);
    }
    // a seam opened along the flank, and plates peeled back off it
    for (let i = 0; i < 6; i++) {
      const s = L * (0.04 + rnd() * 0.07);
      k.add(i % 3 ? 'mid' : 'hull', new BoxGeometry(s * 1.6, L * 0.006, s), [box.min.x + rnd() * L, (rnd() - 0.3) * H, (rnd() - 0.5) * W * 1.7], [rnd() * 3, rnd() * 3, rnd() * 3]);
    }
    // the scatter: lumps of broken rock and hull
    const chunk = new IcosahedronGeometry(1, 0);
    for (let i = 0; i < 14; i++) {
      const s = L * (0.008 + rnd() * 0.03);
      k.add(i % 3 ? 'dark' : 'mid', chunk, [tail - L * 0.2 + (rnd() - 0.5) * L * 1.6, (rnd() - 0.5) * H * 2.6, (rnd() - 0.5) * W * 2.6], [rnd() * 3, rnd() * 3, rnd() * 3], [s * (1 + rnd() * 0.6), s, s * (0.6 + rnd() * 0.5)]);
    }
    k.box('cold', [L * 0.012, L * 0.012, L * 0.012], [tail + L * 0.1, 0, 0]);
    k.bakeOcclusion(0.04);
    return k;
  });
}

// ── the works ─────────────────────────────────────────────────────────────
function ringStation(m: Skins, rnd: () => number): Group {
  const g = once('station', stationKit).build(m.station.keys);
  g.rotation.set(1.1 + rnd() * 0.3, rnd() * 0.8, 0);
  return g;
}

/** A fleet at anchor: three of the real capital designs in echelon, one drive cold. */
function fleet(m: Skins, rnd: () => number): Group {
  const g = new Group();
  const picks: Array<[Kind, Faction, number]> = [['warbird', 'office', 78], ['lancer', 'custody', 64], ['freighter', 'custody', 52]];
  picks.forEach(([kind, faction, r], i) => {
    const ship = shipKit(kind, faction).build(m.hull.keys);
    ship.scale.setScalar(r);
    ship.position.set(i * 120 - 120, i * 16 - 16 + (rnd() - 0.5) * 8, i * 70);
    ship.rotation.set(0, 0.08 * i, 0);
    g.add(ship);
  });
  g.rotation.set(0.2, rnd() * 0.5, 0.08);
  return g;
}

/** A hulk: a designed hull tilted off its keel, torn open at the stern, its plating and rock strewn about it, one cold glow. */
function hulk(m: Skins, rnd: () => number): Group {
  const g = new Group();
  const hull = hulkKit().build(m.hull.keys);
  hull.scale.setScalar(70);
  hull.rotation.set(0.5, 0.3, -0.3);
  g.add(hull);
  g.rotation.set(0.5, rnd() * 1.2, 0.2);
  return g;
}

/** One far work by index (0 ring station, 1 fleet, 2 hulk), merged, at the origin: the bench's way to look at one. */
export function farWork(sky: Sky, which: number): Group {
  const rnd = seeded(sky.seed * 7 + 3 + which);
  return merged([ringStation, fleet, hulk][which % 3]!(skins(sky), rnd));
}

/** One or two far works for a sky, set on the sphere of radius `D`, away from the planet. */
export function farWorks(sky: Sky, D: number): Group {
  const all = new Group();
  const rnd = seeded(sky.seed * 7 + 3);
  const m = skins(sky);
  const makers = [ringStation, fleet, hulk];
  const n = 2;
  const start = Math.floor(rnd() * makers.length);
  for (let i = 0; i < n; i++) {
    const work = makers[(start + i) % makers.length]!(m, rnd);
    const avoid = sky.planet ? sky.planet.az : 0;
    const az = avoid + 70 + rnd() * 100 + i * 120, el = -4 + rnd() * 16;
    work.position.copy(dirOf(az, el).multiplyScalar(D * (0.7 + rnd() * 0.15)));
    work.scale.setScalar(2.3 + rnd() * 0.9);
    all.add(work);
  }
  return merged(all);
}
