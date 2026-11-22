import { AdditiveBlending, BufferAttribute, Color, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry, type Scene } from 'three';
import { DESK } from '../sim/desk';
import { guideTarget } from '../sim/guide';
import { lessonOf } from '../sim/tutor';
import type { World } from '../sim/world';

// ── the lead's beacon: where to go, in the world ─────────────────────────
// The one place the HUD leads to (sim/guide.ts guideTarget) gets a light in the world in the HUD's goal colour
// (--goal): a thin shaft standing up from it, and a slow ring that opens out on the plane round it, so it can be
// found by eye from across the stop (owner, 22 November 2026: "hard to see where you should be going"). It goes
// when she is there, in a lesson, and in a fight; reduced motion keeps the ring still.

/** The HUD's goal colour (styles/tokens.css --goal), a little over one so the bloom takes it. */
const GOAL = new Color(0xf0c85a).multiplyScalar(1.3);
const SHAFT_H = 90;
/** Seconds for one ring to open out. */
const RING_T = 2.4;

export class LeadBeacon {
  private readonly root = new Group();
  private readonly shaft: Mesh;
  private readonly ring: Mesh;
  private time = 0;
  private k = 0;

  constructor(private readonly scene: Scene) {
    // the shaft fades from the plane upward (vertex alpha through colour, additive)
    const g = new CylinderGeometry(0.35, 0.35, SHAFT_H, 10, 6, true);
    const pos = g.getAttribute('position'), col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const f = Math.max(0, 1 - (pos.getY(i) + SHAFT_H / 2) / SHAFT_H) ** 1.6;
      col[i * 3] = f; col[i * 3 + 1] = f; col[i * 3 + 2] = f;
    }
    g.setAttribute('color', new BufferAttribute(col, 3));
    g.translate(0, SHAFT_H / 2, 0);
    this.shaft = new Mesh(g, new MeshBasicMaterial({ color: GOAL, vertexColors: true, transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }));
    this.ring = new Mesh(new RingGeometry(0.94, 1, 72), new MeshBasicMaterial({ color: GOAL, transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.3;
    this.root.add(this.shaft, this.ring);
    this.root.visible = false;
    scene.add(this.root);
  }

  /** `still`: reduced motion, the ring does not open out. */
  update(world: World, dt: number, still: boolean): void {
    const lead = world.bk && world.phase === 'play' && !lessonOf(world) ? guideTarget(world) : null;
    const s = world.ship;
    const d = lead ? Math.hypot(lead.x - s.x, lead.z - s.z) : 0;
    const fight = world.aliens.some((a) => !a.civil && world.committed(a) && Math.hypot(a.x - s.x, a.z - s.z) < DESK.threat);
    // there, or in a fight: it steps back (a fight's own marks lead)
    const want = lead && !fight && d > lead.r + 6 ? 1 : 0;
    this.k += (want - this.k) * Math.min(1, dt * 3);
    this.root.visible = !!lead && this.k > 0.02;
    if (!lead || !this.root.visible) return;
    this.time += dt;
    this.root.position.set(lead.x, 0, lead.z);
    // a little thinner close in, so it never stands in front of the thing itself
    const near = Math.min(1, Math.max(0, (d - lead.r) / 60));
    (this.shaft.material as MeshBasicMaterial).opacity = 0.5 * this.k * (0.35 + 0.65 * near);
    const r0 = Math.max(3, lead.r * 0.9), r1 = r0 + 14;
    const p = still ? 0.5 : (this.time % RING_T) / RING_T;
    const r = r0 + (r1 - r0) * p;
    this.ring.scale.set(r, r, r);
    (this.ring.material as MeshBasicMaterial).opacity = 0.45 * this.k * (still ? 0.6 : (1 - p) ** 1.5);
  }

  dispose(): void { this.scene.remove(this.root); }
}
