// The ship bench: tools/ship.html on the dev server. The Wayward on her own,
// in the sector's lights and post chain, from a fixed set of views, for
// working on the model without flying her.
import { PerspectiveCamera, Scene } from 'three';
import { NEON } from '../src/render/enemies';
import type { Faction } from '../src/sim/enemies';
import { Environment } from '../src/render/environment';
import { Post } from '../src/render/post';
import { TIERS, tierIndex } from '../src/render/quality';
import { createRenderer, fitRenderer } from '../src/render/renderer';
import { ShipView } from '../src/render/ships';
import { setLivery, setLiverySweep } from '../src/render/wayward';
import { newShip } from '../src/sim/ship';

const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'three';
const heat = Number(params.get('heat') ?? '0.6');
const spin = params.get('spin') === '1';
// ?livery=1: the yellow repaint after the rename
const livery = params.get('livery') === '1';
// ?sweep=<model x>: freeze the rename's livery pass there (+3.4 the bow, -3.4 the stern)
const sweep = params.get('sweep');
// ?hit=<bearing degrees>&age=<seconds into the flare>: freeze a shield flare from that bearing (0 ahead, 90 to starboard)
const hitBearing = params.get('hit');
const hitAge = Number(params.get('age') ?? '0.15');
// ?plates=<left>&maxplates=<of>: show the wounds for the plates lost (default: none lost)
const plates = Number(params.get('plates') ?? '3'), maxPlates = Number(params.get('maxplates') ?? '3');
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
ship.setDamage(plates, maxPlates);
if (sweep !== null) setLiverySweep(Number(sweep));
const s = newShip();
s.heading = 0;
s.thrust = heat;
s.invuln = 0;
s.yawRate = Number(params.get('yaw') ?? '0');

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
  hull: [0.5, 2.2, 1.7, 0.5, 0.3, 0],
  sidep: [0.4, 0.5, -3.2, 0.4, 0.1, 0],
  sidew: [0.9, 0.6, 2.4, 0.9, 0.1, 0],
};
const fit = () => {
  fitRenderer(renderer, tier);
  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();
  post.setSize(canvas.clientWidth, canvas.clientHeight);
};
new ResizeObserver(fit).observe(canvas);
fit();

// ?shield=1: a standing charge; ?ready=<0..1>: freeze the charge-complete shimmer at that point (1 just started)
const shield = params.get('shield') === '1', ready = params.get('ready');
let last = performance.now(), t = 0, hitDone = false;
const frame = (now: number) => {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
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
  if (shield) ship.status.charged = 1;
  if (ready !== null) { ship.status.charged = 0; ship.update(s, 0, true); ship.status.charged = 1; ship.update(s, (1 - Number(ready)) * 0.7, true); }
  else ship.update(s, hitBearing !== null ? 0 : dt, true);
  env.update(camera, 0, 0, 0, 0, dt);
  // ?fight=gutter|custody|office|voice|thren: the rim as in a fight with that faction
  const fight = params.get('fight');
  env.fight(fight ? NEON[fight as Faction] ?? null : null, fight ? 1 : 0);
  if (!post.render(dt)) renderer.render(scene, camera);
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
