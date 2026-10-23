// The ship bench: tools/ship.html on the dev server. The Wayward on her own,
// in the sector's lights and post chain, from a fixed set of views, for
// working on the model without flying her.
import { PerspectiveCamera, Scene } from 'three';
import { Environment } from '../src/render/environment';
import { Post } from '../src/render/post';
import { TIERS, tierIndex } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';
import { ShipView } from '../src/render/ships';
import { setLivery } from '../src/render/wayward';
import { newShip } from '../src/sim/ship';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'three';
const heat = Number(params.get('heat') ?? '0.6');
const spin = params.get('spin') === '1';
// ?livery=1: the yellow repaint after the rename
const livery = params.get('livery') === '1';
// ?hit=<bearing degrees>&age=<seconds into the flare>: freeze a shield flare from that bearing (0 ahead, 90 to starboard)
const hitBearing = params.get('hit');
const hitAge = Number(params.get('age') ?? '0.15');
const tier = TIERS[Math.max(0, tierIndex(params.get('quality') ?? 'high'))]!;

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = createRenderer(canvas, tier);
const scene = new Scene();
const env = new Environment(scene, renderer);
env.setShadow(tier.shadow);
const camera = new PerspectiveCamera(32, 1, 0.05, 4000);
const post = new Post(renderer, scene, camera, tier);
const ship = new ShipView();
scene.add(ship.root);
(window as unknown as { ship: ShipView }).ship = ship;
setLivery(livery);
const s = newShip();
s.heading = 0;
s.thrust = heat;
s.invuln = 0;

// where the camera sits, in the model's frame (nose +X, starboard +Z), and what it looks at
const VIEWS: Record<string, [number, number, number, number, number, number]> = {
  chase: [-5.2, 2.6, 0, 0.6, 0, 0],
  three: [2.6, 1.9, 3.4, -0.2, 0, 0],
  rear: [-3.6, 1.5, 2.2, 0, 0, 0],
  side: [0, 0.3, 5.2, 0, 0, 0],
  top: [0.01, 6, 0, 0, 0, 0],
  front: [4.6, 0.8, 0.6, 0, 0, 0],
  drive: [-3.3, 0.5, 1.4, -1.6, 0, 0.9],
  close: [-0.6, 1.5, 2.2, -0.3, 0.2, 0.2],
};
const fit = () => {
  fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth, canvas.clientHeight);
};
new ResizeObserver(fit).observe(canvas);
fit();

let last = performance.now(), t = 0, hitDone = false;
const frame = (now: number) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  t += dt;
  const [x, y, z, lx, ly, lz] = VIEWS[view] ?? VIEWS.three!;
  const a = spin ? t * 0.4 : 0, c = Math.cos(a), sn = Math.sin(a);
  // three.js yaw: heading 0 keeps the model's +X; the bench swings the camera, not the ship
  camera.position.set(x * c - z * sn, y, x * sn + z * c);
  camera.lookAt(lx, ly, lz);
  if (hitBearing !== null && !hitDone) {
    const b = Number(hitBearing) * Math.PI / 180;
    ship.flareShield(false, Math.cos(b) * 5, Math.sin(b) * 5);
    ship.update(s, hitAge, true);
    hitDone = true;
  }
  ship.update(s, hitBearing !== null ? 0 : dt, true);
  env.update(camera, 0, 0, 0, 0, dt);
  if (!post.render(dt)) renderer.render(scene, camera);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
