// The finds bench: tools/finds.html on the dev server. Krail of three worths, Cyrite, ore, parts and a power cell in a
// row, close up, for judging the glass, the glints and the cases.
import { PerspectiveCamera, Scene } from 'three';
import { Environment } from '../src/render/environment';
import { skyFor } from '../src/render/sky';
import { PickupView } from '../src/render/pickups';
import { Post } from '../src/render/post';
import { TIERS } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';
import { glowTexture } from '../src/render/textures';
import type { Pickup, PickupKind } from '../src/sim/pickups';

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

const finds = new PickupView(scene, glowTexture());
const row: [PickupKind, number][] = [['crystal', 1], ['crystal', 3], ['crystal', 6], ['cyrite', 2], ['ore', 1], ['parts', 1]];
const list: Pickup[] = row.map(([kind, value], i) => ({ id: i + 1, kind, x: 0, z: (i - (row.length - 1) / 2) * 1.6, vx: 0, vz: 0, life: 99, value, age: 9 }));
camera.position.set(-7, 3.2, 0);
camera.lookAt(0, 0.3, 0);

const frozen = params.get('t');
let last = performance.now(), first = true;
function frame(now: number): void {
  // ?t holds the clock at that second (the first frame jumps there)
  const dt = frozen ? (first ? Number(frozen) : 0) : Math.min(0.05, (now - last) / 1000);
  first = false;
  last = now;
  const dpr = fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth * dpr, canvas.clientHeight * dpr);
  finds.update(list, 1, dt);
  env.update(camera, 0, 0, 0, 0, dt);
  post.render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
