// The rock bench: tools/rocks.html on the dev server. The three resource rocks
// (basalt, rich, volatile) and iron at one scale, with a Krail stream behind,
// for judging the stone at the chase camera's distance and up close.
import { PerspectiveCamera, Scene } from 'three';
import { Environment } from '../src/render/environment';
import { skyFor } from '../src/render/sky';
import { RockView } from '../src/render/rocks';
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
const camera = new PerspectiveCamera(52, 1, 0.1, 4000);
const post = new Post(renderer, scene, camera, tier);
const glow = glowTexture();
env.setSky(skyFor(Number(params.get('sky') ?? '31337'), null));
env.setPixelRatio(1);

const rocks = new RockView(scene);
const kinds: RockKind[] = ['basalt', 'rich', 'volatile', 'iron'];
const list: Rock[] = kinds.map((kind, i) => ({
  id: 11 + i * 7, kind, x: 14, z: (i - 1.5) * size * 2.6, vx: 0, vz: 0, size: 0, r: size, hp: 9, maxHp: 9, variant: i % 3,
  ax: 0.3, ay: 1, az: 0.2, spin: 0.12, age: 9, hitT: 0,
}));

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
else camera.position.set(-12, 6, 0);
camera.lookAt(14, 0, 0);

let last = performance.now();
const frame = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  rocks.update(list, [], 1, dt, 0, 0);
  stream.update(space, 14, 0, dt, false);
  env.update(camera, 0, 0, 0, 0, dt);
  if (!post.render(dt)) renderer.render(scene, camera);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
