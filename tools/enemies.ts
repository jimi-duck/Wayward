// The enemy bench: tools/enemies.html on the dev server. Hulls, enemy fire and
// our own weapons on a fixed stage, lit as in a sector, for judging the look
// and counting what it costs. After ?frames=N frames it fills window.__bench
// with the draw calls, triangles and the CPU time of an update plus a render.
import { CylinderGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3 } from 'three';
import { Environment } from '../src/render/environment';
import { skyFor } from '../src/render/sky';
import { EnemyView } from '../src/render/enemies';
import { Effects } from '../src/render/fx';
import { Post } from '../src/render/post';
import { TIERS, tierIndex } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';
import { glowTexture } from '../src/render/textures';
import { Streaks } from '../src/render/streaks';
import { WeaponView } from '../src/render/weapons';
import { ALIEN_ORDER, ALIEN_TYPES, JINK_ROLL, VARIANT_ORDER, VARIANTS, spawnAlien, type Alien, type EliteId, type Faction, type Shot } from '../src/sim/enemies';
import { Rng } from '../src/sim/rng';
import { newShip } from '../src/sim/ship';
import type { Bolt, Torpedo } from '../src/sim/weapons';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'fleet';
const copies = Math.max(1, Number(params.get('n') ?? '1'));
// ?only=hulls or ?only=fire leaves out the other, to price each on its own
const only = params.get('only') ?? '';
const frames = Number(params.get('frames') ?? '0');
const tier = TIERS[Math.max(0, tierIndex(params.get('quality') ?? 'high'))]!;

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const env = new Environment(scene, renderer);
env.setShadow(tier.shadow);
renderer.info.autoReset = false; // the post chain renders several times a frame: count them all
const camera = new PerspectiveCamera(52, 1, 0.1, 4000);
const post = new Post(renderer, scene, camera, tier);
const glow = glowTexture();
const fx = new Effects(scene, glow, renderer);
fx.setLights(tier.name !== 'low');
const streaks = new Streaks(scene);
const weapons = new WeaponView(streaks);
const enemies = new EnemyView(scene, glow, streaks);
enemies.fx = fx;
env.setSky(skyFor(Number(params.get('sky') ?? '31337'), null));
env.setPixelRatio(1);

const rng = new Rng(7);
const ship = newShip();
const FACTIONS: Faction[] = ['gutter', 'custody', 'office', 'voice', 'thren'];

// the stage: the camera at the origin looking down -Z... no: down +X, as the chase camera does
const aliens: Alien[] = [];
const stands: Array<[number, number, number, number]> = [];
const shots: Shot[] = [];
const bolts: Bolt[] = [];
const torps: Torpedo[] = [];
const eliteParam = (params.get('elite') as EliteId | null);
const spot = (kind: Alien['kind'], faction: Faction | null, x: number, y: number, z: number, face: number, variant?: string, elite?: EliteId | null): Alien => {
  const a = spawnAlien(kind, ship, 0, rng, { x, y, z }, { ...(variant ? { variant } : {}), ...(elite ? { elite } : {}) });
  if (faction) a.faction = faction;
  a.cloak = 0;
  a.face = face;
  a.y = a.cruiseY = y; // the sim keeps hulls on the plane; the stage does not
  aliens.push(a);
  return a;
};
/** Labels laid over the view: a name, and what the hull is made of. */
const tags: Array<{ el: HTMLDivElement; pos: Vector3 }> = [];
const tag = (pos: Vector3, name: string, info: string): void => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;top:0;font:11px/1.35 ui-monospace,monospace;color:#bfe9e4;background:rgba(6,16,18,.72);padding:3px 6px;pointer-events:none;white-space:pre;border:1px solid rgba(120,220,210,.35)';
  el.textContent = `${name}\n${info}`;
  document.body.append(el);
  tags.push({ el, pos });
};
// ?focus=<variant id> in the lineup: the camera orbits that hull and the label says all of it
let orbitTarget = new Vector3(0, 0, 0), orbitDist = 14, orbitAz = Number(params.get('az') ?? String(Math.PI + 0.3)), orbitEl = Number(params.get('el') ?? '0.12');

if (view === 'lineup') {
  // every faction's hulls on stanchions, a row each, in the order they unlock: ?faction=custody for one row,
  // ?elite=armoured|swift|... dresses them all, ?capital=1 adds the boss hull at the end of each row.
  // Drag to orbit, wheel to zoom, ?focus=<variant id> to look at one, ?az= ?el= ?dist= to set the view.
  const only1 = params.get('faction') as Faction | null;
  const rows = FACTIONS.filter((f) => !only1 || f === only1);
  const focus = params.get('focus');
  const gap = 7;
  rows.forEach((f, ri) => {
    const ids = VARIANT_ORDER.filter((id) => VARIANTS[id]!.faction === f);
    ids.forEach((id, i) => {
      const v = VARIANTS[id]!;
      if (focus && id !== focus) return;
      const x = 0, y = -ri * 7, z = focus ? 0 : (i - (ids.length - 1) / 2) * gap;
      const al = spot(v.kind, f, x, y, z, Math.PI * 0.75, id, eliteParam);
      al.hp = al.maxHp;
      const info = enemies.hullInfo(v.kind, f);
      const at = new Vector3(x, y + 1.4, z);
      tag(at, `${v.label} · ${f}`, only1 || focus ? `${info.tris} tris · ${info.feel}` : `${info.tris} tris`);
      if (focus === id) orbitTarget = new Vector3(x, y, z);
      // a stanchion under it: a post, a lit foot
      stands.push([x, y - al.r * 0.9, z, al.r]);
    });
  });
  if (!focus) {
    orbitTarget = new Vector3(0, -(rows.length - 1) * 4.5, 0);
    orbitDist = Number(params.get('dist') ?? '58') * (only1 ? 0.4 : 1);
  } else orbitDist = Number(params.get('dist') ?? '9');
  if (params.get('capital') === '1') {
    rows.forEach((f, ri) => {
      const kind = ({ gutter: 'raptor', custody: 'lancer', office: 'warbird', voice: 'drone', thren: 'weaver' } as const)[f];
      const hull = enemies.capitalHull(kind, f);
      hull.scale.setScalar(5 * 0.85 * 0.55);
      hull.position.set(0, -ri * 7, 6 * gap);
      hull.rotation.y = Math.PI * 0.75;
      scene.add(hull);
      tag(new Vector3(0, -ri * 7 + 3.2, 6 * gap), `Capital · ${f}`, `${enemies.hullInfo(kind, f).capitalTris} tris`);
    });
  }
} else if (view === 'boom') {
  // a kill, frozen ?at=0.4 seconds in: ?size=2.8 (the hull's radius) &calm=1
  spot((params.get('kind') ?? 'lancer') as Alien['kind'], null, 0, 0, 0, 2.4);
} else if (view === 'capital') {
  // a boss's hull on its own, as the boss view draws it: ?kind=lancer|raptor|warbird|drone &r=6
  const kind = (params.get('kind') ?? 'lancer') as Alien['kind'];
  const hull = enemies.capitalHull(kind, (params.get('faction') as Faction | null) ?? ALIEN_TYPES[kind].faction);
  hull.scale.setScalar(Number(params.get('r') ?? '5') * 0.85);
  hull.rotation.y = Number(params.get('face') ?? '2.4');
  let tris = 0;
  hull.traverse((o) => { const g = (o as { geometry?: { attributes: { position: { count: number } } } }).geometry; if (g) tris += g.attributes.position.count / 3; });
  console.log('capital triangles', tris);
  scene.add(hull);
} else if (view === 'close') {
  const kind = (params.get('kind') ?? 'lancer') as Alien['kind'];
  const f = (params.get('faction') as Faction | null) ?? ALIEN_TYPES[kind].faction;
  spot(kind, f, 0, 0, 0, Number(params.get('face') ?? '2.4'));
  aliens[0]!.r = Number(params.get('r') ?? '5');
  aliens[0]!.hitT = Number(params.get('hit') ?? '0');
} else {
  // a fleet: every hull in a row, then more rows behind for the count
  for (let row = 0; row < copies; row++) {
    ALIEN_ORDER.forEach((kind, i) => {
      const x = 46 + row * 26, z = (i - (ALIEN_ORDER.length - 1) / 2) * 15, y = 3 + (row % 2) * 4;
      spot(kind, ALIEN_TYPES[kind].faction, x, y, z, Math.PI + 0.35 * (i % 2 ? 1 : -1));
    });
  }
  // the same hulls in the other factions' metal
  FACTIONS.forEach((f, i) => spot('scout', f, 30, 2, (i - 2) * 9, Math.PI + 0.3));
}

let copies_fire = copies;
const shotFactions = [...FACTIONS];
if (only === 'fire') aliens.length = 0;
if (only === 'hulls' || view === 'close') copies_fire = 0;
for (let i = 0; i < 24 * copies_fire; i++) {
  const f = shotFactions[i % 5]!;
  const x = 14 + (i % 8) * 4, z = -14 + Math.floor(i / 8) * 9 + (i % 3);
  shots.push({ id: i, x, y: 1.5 + (i % 4), z, vx: -26, vy: 0, vz: (i % 3 - 1) * 2, life: 3, r: 0.32, faction: f, hp: i % 7 === 0 ? 3 : 0, seek: 0, split: 0 });
}
for (let i = 0; i < 12 * copies_fire; i++) {
  bolts.push({ x: 10 + i * 5, y: 1, z: -6 + (i % 4) * 4, vx: 160, vy: 0, vz: 0, life: 1, dmg: 1, pierce: 0, hit: [], homing: 0, heavy: i % 5 === 0 });
}
for (let i = 0; i < (copies_fire ? 6 : 0); i++) {
  torps.push({ id: i, x: 24 + i * 8, y: 1.2, z: -10 + i * 4, vx: 50, vy: 0, vz: 0, speed: 20 + i * 8, life: 3, target: null, dmg: 1, blast: 1, turn: 1, max: 60, accel: 1, cone: 1, seek: 0, small: false });
}

if (view === 'lineup') {
  // stanchions: a dark post, a collar and a lit foot, so each hull stands on something
  const post = new MeshStandardMaterial({ color: 0x20262a, roughness: 0.6, metalness: 0.6 }), lit = new MeshBasicMaterial({ color: 0x5fd8cc });
  for (const [x, y, z, r] of stands) {
    const top = y - 0.2;
    const shaft = new Mesh(new CylinderGeometry(0.09, 0.14, 3, 8), post); shaft.position.set(x, top - 1.5, z);
    const collar = new Mesh(new CylinderGeometry(0.28 + r * 0.05, 0.34 + r * 0.05, 0.18, 12), post); collar.position.set(x, top, z);
    const foot = new Mesh(new CylinderGeometry(0.9, 1.0, 0.1, 16), post); foot.position.set(x, top - 3, z);
    const ring = new Mesh(new CylinderGeometry(0.92, 0.92, 0.04, 16), lit); ring.position.set(x, top - 2.93, z);
    scene.add(shaft, collar, foot, ring);
  }
}

const fit = () => {
  fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth, canvas.clientHeight);
};
new ResizeObserver(fit).observe(canvas);
fit();

if (view === 'lineup') {
  canvas.addEventListener('pointermove', (e) => { if (e.buttons) { orbitAz -= e.movementX * 0.006; orbitEl = Math.max(-1.2, Math.min(1.4, orbitEl + e.movementY * 0.006)); } });
  canvas.addEventListener('wheel', (e) => { orbitDist = Math.max(3, Math.min(160, orbitDist * (1 + Math.sign(e.deltaY) * 0.1))); e.preventDefault(); }, { passive: false });
}
if (view === 'capital') camera.position.set(-9, 3.4, 8).multiplyScalar(Number(params.get('r') ?? '5') / 5 * 0.8);
else if (view === 'close') camera.position.set(-9, 3.4, 8);
else if (view === 'fire') camera.position.set(24, 8, 26);
else if (view === 'boom') camera.position.set(-16, 9, 12);
else camera.position.set(-12, 9, 0);
camera.lookAt(view === 'boom' ? 0 : view === 'close' || view === 'capital' ? 0 : view === 'fire' ? 36 : 40, view === 'fleet' ? 0 : 1, 0);

let boomFrame = 0;
const rgbFor = (f: Faction): [number, number, number] => ({ gutter: [3, 1.6, 0.5], custody: [1.4, 2, 3], office: [3, 2.4, 0.8], voice: [0.8, 2.6, 1.4], thren: [2.6, 1, 2.6] } as Record<Faction, [number, number, number]>)[f];
let last = performance.now(), t = 0, n = 0, cpu = 0;
const calls: number[] = [], tris: number[] = [];
const frame = (now: number) => {
  const boom = view === 'boom';
  const dt = boom ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
  last = now;
  if (boom) {
    // fixed steps so a shot lands at the same moment every time; the blast goes off on frame 5, and the stage freezes at ?at
    fx.calm = params.get('calm') === '1';
    const bf = ++boomFrame;
    if (bf === 5) {
      const al = aliens[0]!, sz = Number(params.get('size') ?? '2.8');
      aliens.length = 0;
      fx.explode(al.x, al.y, al.z, sz, rgbFor(al.faction), 'metal');
    }
    if (bf > 5 + Math.round(Number(params.get('at') ?? '0.4') * 60)) { (window as unknown as { __boom: boolean }).__boom = true; if (!post.render(0)) renderer.render(scene, camera); return; }
  }
  t += dt;
  if (view === 'lineup') {
    // the camera on a sphere round the target; the hulls turn slowly on their stanchions unless ?still=1
    const ce = Math.cos(orbitEl);
    camera.position.set(orbitTarget.x + Math.cos(orbitAz) * ce * orbitDist, orbitTarget.y + Math.sin(orbitEl) * orbitDist, orbitTarget.z + Math.sin(orbitAz) * ce * orbitDist);
    camera.lookAt(orbitTarget);
    if (params.get('still') !== '1') for (const a of aliens) a.face += dt * 0.35;
    for (const { el, pos } of tags) {
      const p = pos.clone().project(camera);
      const ok = p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
      el.style.display = ok ? 'block' : 'none';
      el.style.transform = `translate(${((p.x + 1) / 2 * innerWidth).toFixed(0)}px, ${((1 - p.y) / 2 * innerHeight).toFixed(0)}px) translate(-50%, -100%)`;
    }
  }
  // ?turn=<rad/s> swings the close hull's heading and velocity in place (steering puffs, drives); ?jink=1 rolls it every 2 s; ?hp=<n> sets its armour
  const al0 = aliens[0];
  if (al0 && view === 'close') {
    const w = Number(params.get('turn') ?? '0'), sp = Number(params.get('speed') ?? '20');
    if (params.has('hp')) al0.hp = Number(params.get('hp'));
    if (w || params.has('speed')) { al0.face += w * dt; al0.vx = Math.cos(al0.face) * sp; al0.vz = -Math.sin(al0.face) * sp; }
    if (params.get('jink') === '1') { const ph = t % 2; al0.roll = ph < JINK_ROLL ? ph : -1; }
  }
  renderer.info.reset();
  const t0 = performance.now();
  streaks.begin();
  weapons.update(bolts, torps, 1, fx, dt, t);
  fx.drawStreaks(streaks);
  enemies.eye.copy(camera.position);
  enemies.update(aliens, [], shots, [], 1, dt);
  streaks.end();
  fx.update(dt);
  env.update(camera, 0, 0, 0, 0, dt);
  if (!post.render(dt)) renderer.render(scene, camera);
  cpu += performance.now() - t0;
  calls.push(renderer.info.render.calls);
  tris.push(renderer.info.render.triangles);
  if (frames && ++n === frames) {
    const med = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1]!;
    (window as unknown as { __bench: unknown }).__bench = {
      calls: med(calls), triangles: med(tris), cpuMs: +(cpu / n).toFixed(2), programs: renderer.info.programs?.length ?? 0,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, hulls: aliens.length,
    };
  }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
