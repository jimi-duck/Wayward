import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, TorusGeometry, type BufferGeometry, type Material } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { dirOf, type Sky } from './sky';
import { seeded } from './kit';

// ── far works ─────────────────────────────────────────────────────────────
// The things men built that you will never reach: a ring station, a fleet at
// anchor, a hulk. Each is a small kit model set far out on the sky sphere, a
// dark silhouette with a few lights, tinted toward the haze it sits in, so
// the sky has scale and a history, and a ship in the foreground is measured
// against them. They are kit-built and merged: one draw a material, three apiece.

type Mats = { body: Material; dark: Material; lamp: Material };

/** Bake a built work's parts into one mesh a material: dozens of boxes would be dozens of draws, every frame, for a thing that never moves. */
function merged(work: Group): Group {
  work.updateMatrixWorld(true);
  const by = new Map<Material, BufferGeometry[]>();
  work.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    o.geometry.dispose();
    const list = by.get(o.material as Material);
    if (list) list.push(g); else by.set(o.material as Material, [g]);
  });
  const out = new Group();
  for (const [material, list] of by) {
    const geo = mergeGeometries(list)!;
    for (const g of list) g.dispose();
    out.add(new Mesh(geo, material));
  }
  return out;
}

function materials(sky: Sky): Mats {
  const haze = sky.star.clone().lerp(new Color(0.2, 0.22, 0.32), 0.7);
  return {
    body: new MeshStandardMaterial({ color: haze.clone().multiplyScalar(0.42), roughness: 0.6, metalness: 0.6, fog: false }),
    dark: new MeshStandardMaterial({ color: haze.clone().multiplyScalar(0.28), roughness: 0.7, metalness: 0.5, fog: false }),
    lamp: new MeshBasicMaterial({ color: new Color(2.4, 1.7, 0.9), toneMapped: false, fog: false }),
  };
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
    if (i % 2 === 0) {
      const l = new Mesh(new BoxGeometry(1.6, 1.6, 1.6), m.lamp);
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

/** A fleet at anchor: three slab-sided capitals in echelon, lamps along the flanks, one engine cold. */
function fleet(m: Mats, rnd: () => number): Group {
  const g = new Group();
  for (let i = 0; i < 3; i++) {
    const L = 120 - i * 22, h = 14 - i * 2;
    const ship = new Group();
    ship.add(new Mesh(new BoxGeometry(L, h, h * 1.6), m.body));
    const brow = new Mesh(new BoxGeometry(L * 0.5, h * 0.9, h * 1.1), m.dark);
    brow.position.set(L * 0.1, h * 0.8, 0);
    ship.add(brow);
    const tower = new Mesh(new BoxGeometry(L * 0.12, h * 1.8, h * 0.5), m.body);
    tower.position.set(-L * 0.18, h * 1.2, 0);
    ship.add(tower);
    for (let j = 0; j < 7; j++) {
      const l = new Mesh(new BoxGeometry(1.4, 1.2, 1.4), m.lamp);
      l.position.set(-L * 0.4 + j * (L * 0.13), -h * 0.1, h * 0.82);
      ship.add(l);
    }
    for (const z of [-0.3, 0.3]) {
      const e = new Mesh(new BoxGeometry(2, h * 0.5, h * 0.4), i === 2 && z < 0 ? m.dark : m.lamp);
      e.position.set(-L / 2 - 1, 0, z * h * 1.6);
      ship.add(e);
    }
    ship.position.set(i * 90 - 90, i * 18 - 18 + (rnd() - 0.5) * 8, i * 40);
    ship.rotation.y = 0.1 * i;
    g.add(ship);
  }
  g.rotation.set(0.2, rnd() * 0.5, 0.08);
  return g;
}

/** A hulk: a long hull broken in two, drifting apart, with its parts strewn between. */
function hulk(m: Mats, rnd: () => number): Group {
  const g = new Group();
  const a = new Mesh(new BoxGeometry(110, 16, 24), m.body);
  a.position.set(-60, 0, 0);
  a.rotation.z = 0.08;
  const b = new Mesh(new BoxGeometry(80, 14, 22), m.dark);
  b.position.set(62, -10, 6);
  b.rotation.set(0.3, 0.2, -0.22);
  g.add(a, b);
  for (let i = 0; i < 22; i++) {
    const s = 1.5 + rnd() * 6;
    const p = new Mesh(new BoxGeometry(s * (1 + rnd()), s, s * (0.6 + rnd())), rnd() < 0.5 ? m.body : m.dark);
    p.position.set(-10 + (rnd() - 0.5) * 70, (rnd() - 0.5) * 30, (rnd() - 0.5) * 40);
    p.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    g.add(p);
  }
  const l = new Mesh(new BoxGeometry(1.4, 1.4, 1.4), m.lamp);
  l.position.set(-112, 4, 0);
  g.add(l);
  g.rotation.set(0.5, rnd() * 1.2, 0.2);
  return g;
}

/** One or two far works for a sky, set on the sphere of radius `D`, away from the planet. */
export function farWorks(sky: Sky, D: number): Group {
  const out = new Group();
  const rnd = seeded(sky.seed * 7 + 3);
  const m = materials(sky);
  const makers = [ringStation, fleet, hulk];
  const n = 2;
  const start = Math.floor(rnd() * makers.length);
  for (let i = 0; i < n; i++) {
    const work = merged(makers[(start + i) % makers.length]!(m, rnd));
    const avoid = sky.planet ? sky.planet.az : 0;
    const az = avoid + 70 + rnd() * 100 + i * 120, el = -4 + rnd() * 16;
    const at = dirOf(az, el).multiplyScalar(D * (0.7 + rnd() * 0.15));
    work.position.copy(at);
    work.scale.setScalar(1.9 + rnd() * 0.9);
    out.add(work);
  }
  return out;
}
