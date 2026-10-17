// The sites bench: tools/sites.html on the dev server. One situation prop (wreck, yard, settlement ...) lit as in a
// sector and drawn through the post chain, for judging it at the range the ship meets it.
import { PerspectiveCamera, Scene } from 'three';
import { Environment } from '../src/render/environment';
import { skyFor } from '../src/render/sky';
import { BUILD } from '../src/render/site';
import { hulkModel } from '../src/render/space';
import { buildPort } from '../src/render/breakout';
import { singularity } from '../src/render/singularity';
import { Group } from 'three';
import { Post } from '../src/render/post';
import { TIERS, tierIndex } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';
import type { Prop } from '../src/content/situations';

const params = new URLSearchParams(location.search);
const tier = TIERS[Math.max(0, tierIndex(params.get('quality') ?? 'high'))]!;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const env = new Environment(scene, renderer);
env.setShadow(tier.shadow);
const camera = new PerspectiveCamera(52, 1, 0.1, 4000);
const post = new Post(renderer, scene, camera, tier);
env.setSky(skyFor(Number(params.get('sky') ?? '31337'), null));
env.setPixelRatio(1);

const t0 = performance.now();
const prop = (params.get('prop') ?? 'wreck') as Prop;
// ?hulk=0..4 shows one of the space layer's dead hulls at the size it is drawn (26 to 56 long)
const hulk = params.get('hulk');
const body = hulk !== null ? hulkModel(Number(hulk)) : (params.get('prop') === 'port' ? buildPort() : params.get('prop') === 'singularity' ? (() => { const g = new Group(); g.add(singularity(Number(params.get('size') ?? '4'))); return g; })() : BUILD[prop]());
if (hulk !== null) body.scale.setScalar(Number(params.get('size') ?? '18'));
let tris = 0;
body.traverse((o) => { const g = (o as { geometry?: { attributes: { position: { count: number } } } }).geometry; if (g) tris += g.attributes.position.count / 3; });
console.log(JSON.stringify({ prop, buildMs: +(performance.now() - t0).toFixed(0), triangles: tris }));
body.rotation.y = Number(params.get('yaw') ?? '0.6');
scene.add(body);

const dist = Number(params.get('dist') ?? '34'), pitch = Number(params.get('pitch') ?? '0.45');
camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
camera.lookAt(0, 1, 0);

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
