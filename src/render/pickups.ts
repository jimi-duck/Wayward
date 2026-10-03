import {
  AdditiveBlending, Color, Group, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, OctahedronGeometry,
  Quaternion, Sprite, SpriteMaterial, TorusGeometry, Vector3, type Scene, type Texture,
} from 'three';
import { STEP } from '../core/loop';
import type { Pickup } from '../sim/pickups';

// ── things to pick up ─────────────────────────────────────────────────────
// Dilithium is violet, the brand's colour for the field: a long shard of
// crystal, HDR so it blooms, spinning, sized by what it holds. Hull repairs
// are a warm amber crystal in a halo; power-ups are a ring round a core in
// their own colour, turning, so a find reads as a find from across the
// field. Everything pops in, and blinks for its last two seconds.

const MAX_CRYSTALS = 320;
const MAX_ITEMS = 10;
const VIOLET = new Color(2.2, 0.9, 3.6);
const ITEM_COLOR: Record<string, Color> = {
  repair: new Color(3, 2.4, 1.2),
  shield: new Color(0.9, 1.8, 3.8),
  rapid: new Color(3.8, 0.8, 0.6),
  magnet: new Color(2.4, 1, 3.8),
  overdrive: new Color(3.8, 2.2, 0.4),
  charge: new Color(3.8, 3, 1.2),
};

interface Item { root: Group; core: Mesh; ring: Mesh; halo: Sprite; }

export class PickupView {
  private readonly crystals: InstancedMesh;
  private readonly items: Item[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly axis = new Vector3(0, 1, 0);
  private readonly c = new Color();
  private time = 0;

  constructor(scene: Scene, glow: Texture) {
    this.crystals = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.55, 1.2, 0.55),
      new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX_CRYSTALS);
    this.crystals.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_CRYSTALS * 3), 3);
    this.crystals.count = 0;
    this.crystals.frustumCulled = false;
    scene.add(this.crystals);
    const ringGeo = new TorusGeometry(0.9, 0.07, 6, 28);
    for (let i = 0; i < MAX_ITEMS; i++) {
      const root = new Group();
      const core = new Mesh(new OctahedronGeometry(0.45, 0), new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 }));
      const halo = new Sprite(new SpriteMaterial({ map: glow, color: 0xffffff, blending: AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(2.6);
      root.add(core, ring, halo);
      root.visible = false;
      scene.add(root);
      this.items.push({ root, core, ring, halo });
    }
  }

  update(list: readonly Pickup[], alpha: number, dt: number): void {
    this.time += dt;
    const back = (1 - alpha) * STEP;
    let n = 0, k = 0;
    for (const pk of list) {
      const pop = Math.min(1, pk.age / 0.25);
      const blink = pk.life < 2 && Math.sin(this.time * 22) < 0;
      const x = pk.x - pk.vx * back, z = pk.z - pk.vz * back;
      if (pk.kind === 'crystal') {
        if (n >= MAX_CRYSTALS) continue;
        const size = (0.32 + pk.value * 0.07) * pop * (blink ? 0.4 : 1);
        this.q.setFromAxisAngle(this.axis, this.time * 2.2 + pk.id);
        this.m.compose(this.p.set(x, 0.35 + Math.sin(this.time * 3 + pk.id) * 0.12, z), this.q, this.s.set(size, size, size));
        this.crystals.setMatrixAt(n, this.m);
        this.crystals.setColorAt(n, this.c.copy(VIOLET).multiplyScalar(0.8 + pk.value * 0.12));
        n++;
        continue;
      }
      const it = this.items[k++];
      if (!it) continue;
      const col = ITEM_COLOR[pk.kind] ?? ITEM_COLOR.repair!;
      it.root.visible = !blink;
      it.root.position.set(x, 0.55 + Math.sin(this.time * 2.5 + pk.id) * 0.15, z);
      it.root.scale.setScalar(pop);
      (it.core.material as MeshBasicMaterial).color.copy(col);
      (it.ring.material as MeshBasicMaterial).color.copy(col).multiplyScalar(0.8);
      (it.halo.material as SpriteMaterial).color.copy(col).multiplyScalar(0.5);
      it.core.rotation.y = this.time * 2;
      it.ring.visible = pk.kind !== 'repair';
      it.ring.rotation.set(this.time * 1.3 + pk.id, this.time * 0.9, 0);
    }
    for (; k < MAX_ITEMS; k++) this.items[k]!.root.visible = false;
    this.crystals.count = n;
    this.crystals.instanceMatrix.needsUpdate = true;
    if (this.crystals.instanceColor) this.crystals.instanceColor.needsUpdate = true;
  }
}
