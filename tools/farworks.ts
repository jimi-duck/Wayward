// The far works bench: tools/farworks.html on the dev server. One of the sky's built works (ring station,
// fleet, hulk) lit as in a sector and drawn through the post chain, for judging how it reads at range.
import { PerspectiveCamera, Scene } from 'three';
import { Environment } from '../src/render/environment';
import { skyFor } from '../src/render/sky';
import { farWork } from '../src/render/farworks';
import { Post } from '../src/render/post';
import { TIERS, tierIndex } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';

const params = new URLSearchParams(location.search);
const tier = TIERS[Math.max(0, tierIndex(params.get('quality') ?? 'high'))]!;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const env = new Environment(scene, renderer);
env.setShadow(tier.shadow);
const camera = new PerspectiveCamera(60, 1, 0.1, 6000);
const post = new Post(renderer, scene, camera, tier);
const sky = skyFor(Number(params.get('sky') ?? '31337'), null);
const s0 = performance.now();
env.setSky(sky);
console.log('setSky ms', (performance.now() - s0).toFixed(0));
env.setPixelRatio(1);

const t0 = performance.now();
const work = farWork(sky, Number(params.get('work') ?? '0'));
const built = performance.now() - t0;
const again = performance.now();
farWork(sky, Number(params.get('work') ?? '0'));
const skinned = performance.now() - again;
let tris = 0;
work.traverse((o) => { const g = (o as { geometry?: { attributes: { position: { count: number } } } }).geometry; if (g) tris += g.attributes.position.count / 3; });
(window as unknown as { __farworks: unknown }).__farworks = { firstBuildMs: +built.toFixed(0), reskinMs: +skinned.toFixed(0), triangles: tris };
console.log(JSON.stringify((window as unknown as { __farworks: unknown }).__farworks));
work.position.set(0, Number(params.get('y') ?? '0'), -Number(params.get('dist') ?? '1400'));
work.scale.setScalar(Number(params.get('scale') ?? '2.4'));
work.rotation.y = Number(params.get('yaw') ?? '0');
work.traverse((o) => { o.renderOrder = -3; o.frustumCulled = false; });
scene.add(work);

const fit = () => {
  fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth, canvas.clientHeight);
};
new ResizeObserver(fit).observe(canvas);
fit();

let last = performance.now();
const frame = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  env.update(camera, 0, 0, 0, 0, dt);
  if (!post.render(dt)) renderer.render(scene, camera);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
