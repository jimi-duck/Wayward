// The sky bench: a baked sky round the camera, with its stars, aimed at the sky's great nebula, straight through the
// post chain, for judging the bake (sky.ts BAKE) without flying anywhere.
import { PerspectiveCamera, Scene } from 'three';
import { bakeSky, dirOf, skyIn } from '../src/render/sky';
import { Starfield } from '../src/render/starfield';
import { Post } from '../src/render/post';
import { TIERS } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';

const params = new URLSearchParams(location.search);
const tier = TIERS[TIERS.length - 1]!;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const camera = new PerspectiveCamera(Number(params.get('fov') ?? '70'), 1, 1, 6000);
const post = new Post(renderer, scene, camera, tier);
const sky = skyIn(Number(params.get('sky') ?? '31337'), Number(params.get('palette') ?? '0'));
const baked = bakeSky(renderer, sky);
scene.background = baked.texture;
const stars = new Starfield();
stars.setSky(sky);
scene.add(stars.group);
const h = sky.hero!;
camera.lookAt(dirOf(h.az + Number(params.get('off') ?? '0'), h.el));
document.title = `sky bench: palette ${sky.palette} hero ${h.kind}`;

function frame(): void {
  const dpr = fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  stars.setPixelRatio(dpr);
  stars.update(0, 0, 1 / 60, true);
  post.setSize(canvas.clientWidth * dpr, canvas.clientHeight * dpr);
  post.render(1 / 60);
  requestAnimationFrame(frame);
}
frame();
