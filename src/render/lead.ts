import { AdditiveBlending, CanvasTexture, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry, Sprite, SpriteMaterial, type Scene } from 'three';
import { DESK } from '../sim/desk';
import { guideTarget } from '../sim/guide';
import { lessonOf } from '../sim/tutor';
import type { World } from '../sim/world';

// ── the lead's lamp: where to go, in the world ───────────────────────────
// The one place the HUD leads to (sim/guide.ts guideTarget) carries a small navigation lamp in the HUD's goal colour (--goal),
// a little above it: a soft point that blinks slowly, as a buoy's light does, the same size on screen at any range. Close in, one
// faint ring opens on the plane round it now and then. It belongs to the world, not to the HUD: it guides the eye without standing
// in the picture (owner, 23 November 2026: the first beacon, a tall shaft, was "too prominent"). It goes when she is there, in a
// lesson, and in a fight; reduced motion keeps it lit and still.

/** The HUD's goal colour (styles/tokens.css --goal). */
const GOAL = new Color(0xf0c85a);
/** Seconds between two blinks, and how long a blink is lit at full. */
const BLINK = 2.6, LIT = 0.55;
/** Seconds between two rings, and how long one takes to open. */
const RING_EVERY = 5.5, RING_T = 2.2;
/** Units: the ring shows only between these ranges (far, the lamp alone guides; on top of it, nothing). */
const RING_NEAR = 30, RING_FAR = 220;
/** The lamp's size on screen (a share of the view's height). */
const LAMP = 0.014;

function soft(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export class LeadBeacon {
  private readonly root = new Group();
  private readonly lamp: Sprite;
  private readonly ring: Mesh;
  private time = 0;
  private k = 0;

  constructor(private readonly scene: Scene) {
    this.lamp = new Sprite(new SpriteMaterial({ map: soft(), color: GOAL, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, sizeAttenuation: false }));
    this.lamp.scale.set(LAMP, LAMP, 1);
    this.ring = new Mesh(new RingGeometry(0.97, 1, 72), new MeshBasicMaterial({ color: GOAL, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.3;
    this.root.add(this.lamp, this.ring);
    this.root.visible = false;
    scene.add(this.root);
  }

  /** `still`: reduced motion, the lamp stays lit and the ring does not open. */
  update(world: World, dt: number, still: boolean): void {
    const lead = world.bk && world.phase === 'play' && !lessonOf(world) ? guideTarget(world) : null;
    const s = world.ship;
    const d = lead ? Math.hypot(lead.x - s.x, lead.z - s.z) : 0;
    const fight = world.aliens.some((a) => !a.civil && world.committed(a) && Math.hypot(a.x - s.x, a.z - s.z) < DESK.threat);
    // there, or in a fight: it steps back (a fight's own marks lead)
    const want = lead && !fight && d > lead.r + 6 ? 1 : 0;
    this.k += (want - this.k) * Math.min(1, dt * 2);
    this.root.visible = !!lead && this.k > 0.02;
    if (!lead || !this.root.visible) return;
    this.time += dt;
    this.root.position.set(lead.x, 0, lead.z);
    // the lamp sits a little above the thing, so it never covers it
    this.lamp.position.set(0, Math.max(2.5, lead.r * 0.35), 0);
    // a slow blink: a quick rise, a held light, a long fall, and a dim glow between, so it never quite goes out
    const ph = (this.time % BLINK) / BLINK, on = ph < 0.08 ? ph / 0.08 : ph < 0.08 + LIT / BLINK ? 1 : Math.max(0, 1 - (ph - 0.08 - LIT / BLINK) / 0.25);
    (this.lamp.material as SpriteMaterial).opacity = this.k * (still ? 0.7 : 0.28 + 0.52 * on);
    // close in, a faint ring now and then
    const r0 = Math.max(3, lead.r * 0.9), r1 = r0 + 9;
    const inRange = d > RING_NEAR && d < RING_FAR ? 1 : 0;
    const rp = (this.time % RING_EVERY) / RING_T;
    const p = Math.min(1, rp);
    const r = r0 + (r1 - r0) * p;
    this.ring.scale.set(r, r, r);
    (this.ring.material as MeshBasicMaterial).opacity = still || rp >= 1 ? 0 : 0.16 * this.k * inRange * (1 - p) ** 2;
  }

  dispose(): void { this.scene.remove(this.root); }
}
