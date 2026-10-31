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

type Mats = { body: Material; mid: Material; dark: Material; lamp: Material; cold: Material; seam: Material; keys: Record<string, Material> };

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
  // the light in the joints of a thing nobody built: cold, pale, well under the bloom line
  const seam = new MeshBasicMaterial({ color: sky.accent.clone().lerp(new Color(0.4, 0.75, 0.95), 0.6).multiplyScalar(0.7), toneMapped: false, fog: false });
  return { body, mid, dark, lamp, cold, seam, keys: { body, mid, hull: mid, paint: body, patch: body, dark, trim: body, glow: cold, lamp, cold, seam, crystal: dark, violet: dark } };
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

/** A broken orbital ring: an arc of a hoop that once went all the way round, snapped in three places, its sections drifting off true. */
function brokenRingKit(): Kit {
  return once('broken-ring', () => {
    const k = new Kit(), rnd = seeded(2333);
    const R = 120, N = 60;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      // the gaps: whole sections gone
      if ((i > 9 && i < 15) || (i > 31 && i < 34) || (i > 44 && i < 52)) continue;
      // past each break the ring sags a little out of its plane, as the pieces drift apart
      const sag = i > 34 && i < 45 ? (i - 34) * 0.9 : i >= 52 ? (i - 52) * 1.3 : 0;
      const rot: V3 = [0, 0, a];
      k.add('body', new BoxGeometry(7, 12.8, 9), onRing(a, R, 0, sag), rot);
      k.add('dark', new BoxGeometry(2, 13.4, 3), onRing(a, R + 4, 0, sag), rot);
      if (i % 5 === 0) k.add('mid', new BoxGeometry(3, 4, 22), onRing(a, R, 0, sag), rot);
      // a few windows still lit on a timer, most dark
      if (rnd() < 0.18) k.add('lamp', new BoxGeometry(0.3, 1.4, 0.8), onRing(a, R + 3.6, (rnd() - 0.5) * 6, sag), rot);
    }
    // the torn ends: spars and plating reaching into the gap
    for (const a0 of [10, 15, 31, 34, 44, 52].map((i) => (i / N) * Math.PI * 2)) {
      for (let j = 0; j < 4; j++) spar(k, 'dark', onRing(a0, R + (rnd() - 0.5) * 8, 0, 0), onRing(a0 + (rnd() - 0.5) * 0.12, R + (rnd() - 0.5) * 22, 0, (rnd() - 0.5) * 16), 0.9, 0.9);
    }
    // what came loose: plates and blocks strewn through the largest gap
    for (let i = 0; i < 16; i++) {
      const a = ((44 + rnd() * 8) / N) * Math.PI * 2;
      k.add(i % 3 ? 'mid' : 'body', new BoxGeometry(2 + rnd() * 5, 2 + rnd() * 6, 2 + rnd() * 6), onRing(a, R + (rnd() - 0.5) * 30, 0, (rnd() - 0.5) * 30), [rnd() * 3, rnd() * 3, rnd() * 3]);
    }
    k.bakeOcclusion(3);
    return k;
  });
}

/** A dead relay: a dish on a truss, solar wings (one torn half away), a mast, one slow red-less lamp. */
function relayKit(): Kit {
  return once('relay', () => {
    const k = new Kit(), rnd = seeded(2341);
    k.cyl('body', 6, 6, 22, [0, 0, 0], 'y', 12);
    k.cyl('mid', 7, 7, 2.4, [0, 6, 0], 'y', 12);
    k.cyl('mid', 7, 7, 2.4, [0, -6, 0], 'y', 12);
    // the dish: a shallow cone, and its feed horn on three struts
    k.cyl('mid', 26, 6, 9, [0, 17, 0], 'y', 20, true);
    k.cyl('dark', 6.5, 6.5, 1.5, [0, 12.5, 0], 'y', 12);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      spar(k, 'dark', [Math.cos(a) * 22, 21, Math.sin(a) * 22], [0, 38, 0], 0.7, 0.7);
    }
    k.box('dark', [2.4, 4, 2.4], [0, 38, 0]);
    // wings: a truss, and panels on it; the far wing broken off half way, its last panels hanging
    for (const side of [-1, 1]) {
      spar(k, 'dark', [side * 6, -2, 0], [side * (side > 0 ? 74 : 40), -2, 0], 1.2, 1.2);
      const n = side > 0 ? 6 : 3;
      for (let p = 0; p < n; p++) k.add('body', new BoxGeometry(10, 0.5, 20), [side * (14 + p * 11), -2, 0], [0.04 * p * side, 0, 0]);
    }
    k.add('mid', new BoxGeometry(10, 0.5, 20), [-46, -8, 6], [0.9, 0.4, 0.5]);
    k.add('mid', new BoxGeometry(10, 0.5, 20), [-58, -15, 3], [1.4, -0.2, 0.9]);
    k.cyl('dark', 0.5, 0.8, 26, [0, -24, 0], 'y', 6);
    k.box('lamp', [1.4, 1.4, 1.4], [0, -37, 0]);
    for (let i = 0; i < 5; i++) k.add('dark', new BoxGeometry(1 + rnd() * 2, 1 + rnd() * 2, 1 + rnd() * 2), [-40 - rnd() * 30, -6 - rnd() * 20, (rnd() - 0.5) * 20], [rnd() * 3, rnd() * 3, rnd() * 3]);
    k.bakeOcclusion(2);
    return k;
  });
}

/** A mining rig on a dead rock: the rock, a gantry clamped over it, a conveyor boom, ore cars, and a few work lamps left on. */
function mineKit(): Kit {
  return once('mine', () => {
    const k = new Kit(), rnd = seeded(2357);
    const rock = new IcosahedronGeometry(1, 2);
    const p = rock.attributes.position!;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 0.8 + 0.3 * Math.sin(x * 3.1 + z * 1.7) * Math.cos(y * 2.3 - x) + 0.1 * Math.sin(z * 9.0);
      p.setXYZ(i, x * n, y * n * 0.85, z * n);
    }
    rock.computeVertexNormals();
    k.add('dark', rock, [0, 0, 0], [0.3, 0.5, 0.1], [60, 50, 54]);
    // the cut: a terraced pit face of slabs
    for (let t = 0; t < 4; t++) k.add('mid', new BoxGeometry(34 - t * 6, 3, 12), [0, 40 - t * 5, 30 + t * 3], [0.3, 0, 0]);
    // the gantry over the pit
    for (const x of [-26, 26]) for (const z of [12, 48]) spar(k, 'dark', [x, 38, z], [x, 68, z], 2, 2);
    for (const z of [12, 48]) spar(k, 'body', [-28, 68, z], [28, 68, z], 3, 4);
    spar(k, 'body', [-28, 68, 12], [-28, 68, 48], 3, 4);
    spar(k, 'body', [28, 68, 12], [28, 68, 48], 3, 4);
    k.box('mid', [12, 8, 10], [8, 63, 30]);
    // the boom and its conveyor out to a loading platform
    spar(k, 'dark', [28, 66, 30], [120, 50, 40], 2.4, 3);
    k.box('body', [26, 4, 20], [126, 48, 40]);
    for (let i = 0; i < 5; i++) k.box(i % 2 ? 'mid' : 'body', [5, 4, 7], [114 + i * 6, 52, 40 + (rnd() - 0.5) * 6]);
    // work lamps, a handful
    for (const at of [[-26, 70, 12], [26, 70, 48], [8, 68, 30], [126, 51, 32], [70, 60, 35]] as V3[]) k.box('lamp', [1.6, 1.6, 1.6], at);
    k.bakeOcclusion(3);
    return k;
  });
}

/** Something nobody built, or nobody who lived: a cluster of tall dark facets, cold light in the joints, leaning together. */
function spireKit(): Kit {
  return once('spire', () => {
    const k = new Kit(), rnd = seeded(2371);
    for (let i = 0; i < 7; i++) {
      const h = 60 + rnd() * 110, w = 6 + rnd() * 9, a = (i / 7) * Math.PI * 2 + rnd() * 0.4, r = i === 0 ? 0 : 10 + rnd() * 14;
      const lean: V3 = [Math.sin(a) * 0.18 * (r / 24), 0, -Math.cos(a) * 0.18 * (r / 24)];
      const shard = new CylinderGeometry(0.15, 1, 1, 5, 1);
      k.add('dark', shard, [Math.cos(a) * r, h / 2, Math.sin(a) * r], lean, [w, h, w * 0.8]);
      // the seam: a thin line of light up one edge
      k.add('seam', new BoxGeometry(0.5, h * 0.7, 0.5), [Math.cos(a) * (r + w * 0.55), h * 0.4, Math.sin(a) * (r + w * 0.5)], lean);
    }
    // a slow-turning shard above it, off true, and a ring of fallen pieces at its foot
    k.add('dark', new CylinderGeometry(0.1, 1, 1, 4, 1), [4, 205, -3], [2.6, 0.3, 0.4], [10, 34, 8]);
    for (let i = 0; i < 12; i++) {
      const a = rnd() * Math.PI * 2, r = 34 + rnd() * 24;
      k.add('dark', new CylinderGeometry(0.2, 1, 1, 5, 1), [Math.cos(a) * r, rnd() * 8, Math.sin(a) * r], [1.4 + rnd(), rnd() * 3, rnd()], [4 + rnd() * 3, 10 + rnd() * 20, 4]);
    }
    k.bakeOcclusion(4);
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

function brokenRing(m: Skins, rnd: () => number): Group {
  const g = brokenRingKit().build(m.station.keys);
  g.rotation.set(1.2 + rnd() * 0.3, rnd() * 0.8, rnd() * 6);
  return g;
}

function relay(m: Skins, rnd: () => number): Group {
  const g = relayKit().build(m.station.keys);
  g.rotation.set(0.4 + rnd() * 0.5, rnd() * 6, 0.3 + rnd() * 0.4);
  g.scale.setScalar(0.7);
  return g;
}

function mine(m: Skins, rnd: () => number): Group {
  const g = mineKit().build(m.station.keys);
  g.rotation.set(0.2, rnd() * 6, 0.1);
  g.scale.setScalar(0.6);
  return g;
}

function spire(m: Skins, rnd: () => number): Group {
  const g = spireKit().build(m.station.keys);
  g.rotation.set(0.15, rnd() * 6, -0.1);
  return g;
}

const MAKERS = [ringStation, fleet, hulk, brokenRing, relay, mine, spire];
/** The names of the works, by index, for the bench. */
export const FAR_WORKS = ['station', 'fleet', 'hulk', 'broken ring', 'relay', 'mine', 'spire'] as const;

/** One far work by index (see FAR_WORKS), merged, at the origin: the bench's way to look at one. */
export function farWork(sky: Sky, which: number): Group {
  const rnd = seeded(sky.seed * 7 + 3 + which);
  return merged(MAKERS[which % MAKERS.length]!(skins(sky), rnd));
}

/**
 * Which works a palette leans to (indices into MAKERS). Each region tells its own story at the horizon: the Reach has
 * its stations and relays, the Breaker Yards their wrecks, the Hollows the thing nobody built. The rest draw from all.
 */
const LEAN: Record<number, number[]> = {
  0: [0, 4, 1, 3], 1: [3, 5, 2, 4], 2: [6, 2, 3], 5: [5, 2, 3, 4], 6: [2, 4, 6], 7: [2, 1, 3, 5], 8: [0, 5, 4, 1], 9: [6, 3, 2],
};

/** One or two far works for a sky, set on the sphere of radius `D`, away from the planet. */
export function farWorks(sky: Sky, D: number): Group {
  const all = new Group();
  const rnd = seeded(sky.seed * 7 + 3);
  const m = skins(sky);
  const pool = LEAN[sky.palette ?? -1] ?? [0, 1, 2, 3, 4, 5, 6];
  const n = 2;
  const start = Math.floor(rnd() * pool.length);
  for (let i = 0; i < n; i++) {
    const work = MAKERS[pool[(start + i) % pool.length]!]!(m, rnd);
    const avoid = sky.planet ? sky.planet.az : 0;
    const az = avoid + 70 + rnd() * 100 + i * 120, el = -4 + rnd() * 16;
    work.position.copy(dirOf(az, el).multiplyScalar(D * (0.7 + rnd() * 0.15)));
    work.scale.setScalar(2.3 + rnd() * 0.9);
    all.add(work);
  }
  return merged(all);
}
