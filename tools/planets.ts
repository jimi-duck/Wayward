// The planet bench: the three kinds of planet side by side, drawn straight through the post chain, for judging
// the far-body shader (terminator, limb, cloud, night side) without flying anywhere.
import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { FarBodies, skyFor, dirOf, type Sky } from '../src/render/sky';
import { Post } from '../src/render/post';
import { TIERS } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';

const params = new URLSearchParams(location.search);
const tier = TIERS[TIERS.length - 1]!;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const camera = new PerspectiveCamera(46, 1, 1, 6000);
const post = new Post(renderer, scene, camera, tier);
const sun = new Vector3(...(params.get('sun') ?? '-40,34,-10').split(',').map(Number) as [number, number, number]);
const seed = Number(params.get('sky') ?? '31337');

const base = skyFor(seed, 0);
([[0, -16], [1, 0], [2, 16]] as const).forEach(([kind, az]) => {
  const sky: Sky = { ...base, planet: { kind, colA: base.neb[0], colB: base.neb[1], atmo: base.neb[2], size: 6.2, az, el: 0, ring: kind === 0, moon: false } };
  scene.add(new FarBodies(sky, sun).group);
});
camera.lookAt(dirOf(Number(params.get('az') ?? '0'), 0));

function frame(): void {
  const dpr = fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth * dpr, canvas.clientHeight * dpr);
  post.render(0.016);
  requestAnimationFrame(frame);
}
frame();
