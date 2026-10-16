// The rock bench: tools/rocks.html on the dev server. The three resource rocks
// (basalt, rich, volatile) and iron at one scale, with a Krail stream behind,
// for judging the stone at the chase camera's distance and up close.
import { PerspectiveCamera, Scene } from 'three';
import { Environment } from '../src/render/environment';
import { skyFor } from '../src/render/sky';
import { RockView } from '../src/render/rocks';
import { RockFx } from '../src/render/rockfx';
import { Effects } from '../src/render/fx';
import { Field } from '../src/sim/field';
import { Rng } from '../src/sim/rng';
import { ROCK_PUSH } from '../src/sim/tuning';
import type { GameEvent } from '../src/sim/events';
import { SpaceView } from '../src/render/space';
import { Post } from '../src/render/post';
import { TIERS } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';
import { glowTexture } from '../src/render/textures';
import { Space } from '../src/sim/space';
import type { Rock, RockKind } from '../src/sim/field';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'close';
const size = Number(params.get('r') ?? (view === 'close' ? '3' : '1.8'));
const tier = TIERS[TIERS.length - 1]!;

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const env = new Environment(scene, renderer);
env.setShadow(params.get("noshadow") ? 0 : tier.shadow);
const camera = new PerspectiveCamera(52, 1, 0.1, 4000);
const post = new Post(renderer, scene, camera, tier);
const glow = glowTexture();
env.setSky(skyFor(Number(params.get('sky') ?? '31337'), null));
env.setPixelRatio(1);

const rocks = new RockView(scene);
const kinds: RockKind[] = ['basalt', 'rich', 'volatile', 'iron'];
const list: Rock[] = kinds.map((kind, i) => ({
  id: 11 + i * 7, kind: params.get('shapes') ? 'basalt' : kind, x: 14, z: (i - 1.5) * size * 2.6, vx: 0, vz: 0, size: 0, r: size, hp: 9, maxHp: 9, variant: params.get('shapes') ? i : i % 3,
  ax: 0.3, ay: 1, az: 0.2, spin: 0.12, age: 9, hitT: 0, ox: 0, oz: 0, rot: 0,
}));

const fx = new Effects(scene, glow);
fx.setLights(true);
const rockfx = new RockFx(fx, rocks);

// ?view=hit: one rock of each size hit once (?src=laser|torpedo); window.__rocks() reads back where they drift and turn
// ?view=break: one large rock, shot twice and broken, then each piece broken in turn, to judge the sequence
// ?kind=basalt|rich|volatile|iron  ?src=laser|torpedo  ?cam=game|near  window.__pause freezes the clock
const field = new Field(new Rng(Number(params.get('seed') ?? '9')));
const events: GameEvent[] = [];
if (view === 'hit') {
  // three rocks side by side, one of each size, hit once: the push and turn they keep afterwards
  list.length = 0;
  field.rocks.length = 0;
  for (const [i, size] of ([0, 1, 2] as const).entries()) {
    const r = field.spawn(size, 14, (i - 1) * 8, 0, 0, (params.get('kind') ?? 'basalt') as 'basalt', 1, 0);
    r.age = 10; r.vx = 0; r.vz = 0; r.spin = 0.1; r.maxHp = r.hp = 99;
  }
}
if (view === 'break') {
  list.length = 0;
  const r = field.spawn(0, 14, 0, 1.5, 0.2, (params.get('kind') ?? 'basalt') as 'basalt', 1, 0);
  r.age = 10; r.maxHp = r.hp = 4;
  field.rocks.length = 0; field.rocks.push(r);
}
const SRC = params.get('src') ?? 'laser';
let clock = 0;
const script: Array<{ t: number; run: () => void }> = [];
const shoot = (pick: () => ReturnType<typeof field.rocks.at>, src: string, dmg: number) => () => {
  const r = pick(); if (!r) return;
  r.hp -= dmg; r.hitT = 0.12;
  events.push({ type: 'rockHit', x: r.x - r.r * 0.85, y: 0, z: r.z + (Math.random() - 0.5) * r.r * 0.6, id: r.id, rx: r.x, rz: r.z, r: r.r, kind: r.kind, size: r.size, hp: Math.max(0, r.hp / r.maxHp), src });
};
const smash = (pick: () => ReturnType<typeof field.rocks.at>, src: string) => () => {
  const r = pick(); if (!r) return;
  shoot(() => r, src, 0)();
  field.split(r);
  events.push({ type: 'rockDestroyed', id: r.id, x: r.x, z: r.z, r: r.r, vx: r.vx, vz: r.vz, size: r.size, points: 1, kind: r.kind, src });
};
if (view === 'break') {
  const parent = () => field.rocks.find((q) => q.size === 0);
  script.push({ t: 0.8, run: shoot(parent, 'laser', 1) }, { t: 1.2, run: shoot(parent, 'laser', 1) }, { t: 1.7, run: smash(parent, SRC) });
  script.push({ t: 3.2, run: smash(() => field.rocks.find((q) => q.size === 1), SRC) });
  script.push({ t: 4.4, run: smash(() => field.rocks.find((q) => q.size === 2), SRC) });
}
if (view === 'hit') {
  // a laser bolt (or a torpedo blast) arrives from the camera side, a little off the centre line
  const torp = SRC === 'torpedo';
  script.push({ t: 0.8, run: () => {
    for (const r of field.rocks) {
      const off = r.r * 0.55;
      events.push({ type: 'rockHit', x: r.x - r.r * 0.85, y: 0, z: r.z + off, id: r.id, rx: r.x, rz: r.z, r: r.r, kind: r.kind, size: r.size, hp: 0.9, src: SRC });
      r.hitT = 0.12;
      if (torp) field.impulse(r, 1, 0, ROCK_PUSH.blast * 0.7);
      else field.impulse(r, 1, 0, ROCK_PUSH.laser, -r.r * 0.85, off);
    }
  } });
}
(window as unknown as { __clock: () => number }).__clock = () => clock;
(window as unknown as { __rocks: () => number[][] }).__rocks = () => field.rocks.map((r) => [r.size, r.x, r.z, r.vx, r.spin, r.rot]);

const space = new Space(47);
const stream = new SpaceView(scene, glow);
if (params.get('stream') !== '0') space.place('seam', 140, 0, { r: 220 });

const fit = () => {
  fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth, canvas.clientHeight);
};
new ResizeObserver(fit).observe(canvas);
fit();

if (view === 'close') camera.position.set(2, 3.5, -1);
else if (view === 'hit') camera.position.set(-6, 14, 0);
else if (view === 'break' && params.get('cam') === 'near') camera.position.set(1, 5, 0);
else camera.position.set(-12, 6, 0);
camera.lookAt(14, 0, 0);

let last = performance.now();
const frame = (now: number) => {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if ((window as unknown as { __pause?: boolean }).__pause) dt = 0;
  if (view === 'break' || view === 'hit') {
    // a fixed step per frame, so a slow renderer plays the same sequence
    dt = dt ? 1 / 30 : 0;
    clock += dt;
    while (script.length && script[0]!.t <= clock) script.shift()!.run();
    for (const r of field.rocks) { r.x += r.vx * dt; r.z += r.vz * dt; r.age += dt; r.rot += r.spin * dt; if (r.hitT > 0) r.hitT = Math.max(0, r.hitT - dt); }
    for (const e of events.splice(0)) rockfx.react(e);
    rocks.update(field.rocks, [], 1, dt, 0, 0);
  } else rocks.update(list, [], 1, dt, 0, 0);
  fx.update(dt);
  stream.update(space, 14, 0, dt, false);
  env.update(camera, 0, 0, 0, 0, dt);
  if (!post.render(dt)) renderer.render(scene, camera);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
