// The places bench: tools/places.html on the dev server. One story place, lit as in a sector, from the chase camera's
// distance (?view=game) or close (?view=close), to judge a set piece without flying to its stop.
import { PerspectiveCamera, Scene } from 'three';
import { Environment } from '../src/render/environment';
import { skyFor } from '../src/render/sky';
import { PlaceView } from '../src/render/places';
import { Post } from '../src/render/post';
import { TIERS } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';
import type { PlaceLook } from '../src/sim/places';
import type { World } from '../src/sim/world';

const params = new URLSearchParams(location.search);
const tier = TIERS[TIERS.length - 1]!;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const env = new Environment(scene, renderer);
env.setShadow(tier.shadow);
const camera = new PerspectiveCamera(40, 1, 0.1, 4000);
const post = new Post(renderer, scene, camera, tier);
env.setSky(skyFor(Number(params.get('sky') ?? '31337'), null));
env.setPixelRatio(1);

const look = (params.get('look') ?? 'moot') as PlaceLook;
const view = new PlaceView(scene);
const world = { storyPlace: { def: { id: `bench_${look}`, look, act: { hold: 5 }, r: 18 }, x: 0, z: 0, held: 0.35 } } as unknown as World;
const close = params.get('view') === 'close';
// the chase camera sits about 60 units back and 20 up; close is a third of that
const k = close ? 0.45 : 1;
camera.position.set(-48 * k, 26 * k, 22 * k);
camera.lookAt(0, 0, 0);

const frozen = params.get('t');
let last = performance.now(), first = true;
function frame(now: number): void {
  const dt = frozen ? (first ? Number(frozen) : 0) : Math.min(0.05, (now - last) / 1000);
  first = false;
  last = now;
  const dpr = fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth * dpr, canvas.clientHeight * dpr);
  view.update(world, dt);
  env.update(camera, 0, 0, 0, 0, dt);
  post.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
