// The enemy bench: tools/enemies.html on the dev server. Hulls, enemy fire and
// our own weapons on a fixed stage, lit as in a sector, for judging the look
// and counting what it costs. After ?frames=N frames it fills window.__bench
// with the draw calls, triangles and the CPU time of an update plus a render.
import { PerspectiveCamera, Scene } from 'three';
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
import { ALIEN_ORDER, ALIEN_TYPES, spawnAlien, type Alien, type Faction, type Shot } from '../src/sim/enemies';
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
renderer.info.autoReset = false; // the post chain renders several times a frame: count them all
const camera = new PerspectiveCamera(52, 1, 0.1, 4000);
const post = new Post(renderer, scene, camera, tier);
const glow = glowTexture();
const fx = new Effects(scene, glow);
fx.setLights(tier.name !== 'low');
const streaks = new Streaks(scene);
const weapons = new WeaponView(streaks);
const enemies = new EnemyView(scene, glow, streaks);
env.setSky(skyFor(Number(params.get('sky') ?? '31337'), null));
env.setPixelRatio(1);

const rng = new Rng(7);
const ship = newShip();
const FACTIONS: Faction[] = ['gutter', 'custody', 'office', 'voice', 'thren'];

// the stage: the camera at the origin looking down -Z... no: down +X, as the chase camera does
const aliens: Alien[] = [];
const shots: Shot[] = [];
const bolts: Bolt[] = [];
const torps: Torpedo[] = [];
const spot = (kind: Alien['kind'], faction: Faction | null, x: number, y: number, z: number, face: number): void => {
  const a = spawnAlien(kind, ship, 0, rng, { x, y, z });
  if (faction) a.faction = faction;
  a.cloak = 0;
  a.face = face;
  aliens.push(a);
};

if (view === 'close') {
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

const fit = () => {
  fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth, canvas.clientHeight);
};
new ResizeObserver(fit).observe(canvas);
fit();

if (view === 'close') camera.position.set(-9, 3.4, 8);
else if (view === 'fire') camera.position.set(24, 8, 26);
else camera.position.set(-12, 9, 0);
camera.lookAt(view === 'close' ? 0 : view === 'fire' ? 36 : 40, view === 'fleet' ? 0 : 1, 0);

let last = performance.now(), t = 0, n = 0, cpu = 0;
const calls: number[] = [], tris: number[] = [];
const frame = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  renderer.info.reset();
  const t0 = performance.now();
  streaks.begin();
  weapons.update(bolts, torps, 1, fx, dt, t);
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
