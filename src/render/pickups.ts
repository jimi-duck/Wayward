import {
  AdditiveBlending, BoxGeometry, Color, CylinderGeometry, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, Quaternion, Sprite, SpriteMaterial, TorusGeometry, Vector3,
  type BufferGeometry, type Material, type Scene, type Texture,
} from 'three';
import { STEP } from '../core/loop';
import { LOOSE, type Pickup } from '../sim/pickups';
import type { Effects, RGB } from './fx';

// ── things to pick up ─────────────────────────────────────────────────────
// Krail shows what it is worth in its colour: white for the smallest, blue
// for a middling one, purple for the richest, blended smoothly between
// (`krailColour`). Cyrite (the Story mode's fuel) stays its own deeper
// violet. A shard of crystal, HDR so it blooms, spinning, sized by what it
// holds; a rich one pulses and glitters, and any that is being pulled in
// leaves a trail in its colour. Hull repairs
// are a warm amber crystal in a halo; power-ups are a ring round a core in
// their own colour, turning, so a find reads as a find from across the
// field. Everything pops in, and blinks for its last two seconds.

const MAX_CRYSTALS = 320;
/** Cyrite, ore and parts are rarer than Krail. */
const MAX_LOOSE = 96;
const MAX_ITEMS = 10;
const VIOLET = new Color(2.2, 0.9, 3.6);
/** Krail by worth: white (lowest), blue, purple (highest). */
const K_WHITE = new Color(2, 2.05, 2.3);
const K_BLUE = new Color(0.55, 1.5, 4);
const K_PURPLE = new Color(3.2, 0.7, 4.2);
/** The crystals drop as 1, 3 or 5; this is the span they cover. */
const K_LOW = 1, K_HIGH = 5;

/** How rich a crystal of this value is, 0 (lowest) to 1 (highest). */
export function krailRank(value: number): number {
  return Math.min(1, Math.max(0, (value - K_LOW) / (K_HIGH - K_LOW)));
}

/** The colour of a Krail crystal worth `value`: white to blue to purple, blended smoothly. */
export function krailColour(value: number, out: Color): Color {
  const t = krailRank(value);
  return t < 0.5 ? out.copy(K_WHITE).lerp(K_BLUE, t * 2) : out.copy(K_BLUE).lerp(K_PURPLE, t * 2 - 1);
}

/** The same colour as a plain triple, for the effects pool. */
export function krailRGB(value: number): RGB {
  const c = krailColour(value, new Color());
  return [c.r, c.g, c.b];
}
/** Ore: a lump of dull warm rock; parts: a salvage case with a cold cyan lamp. */
const ORE = new Color(0.85, 0.6, 0.4);
const PARTS = new Color(0.55, 0.62, 0.68);
const ITEM_COLOR: Record<string, Color> = {
  repair: new Color(3, 2.4, 1.2),
  shield: new Color(0.9, 1.8, 3.8),
  rapid: new Color(3.8, 0.8, 0.6),
  magnet: new Color(2.4, 1, 3.8),
  overdrive: new Color(3.8, 2.2, 0.4),
};

interface Item { root: Group; core: Mesh; ring: Mesh; halo: Sprite; }

/** One instanced shape for one kind of loose find. */
interface Batch { mesh: InstancedMesh; n: number; }
function batch(scene: Scene, geo: BufferGeometry, mat: Material, max: number): Batch {
  const mesh = new InstancedMesh(geo, mat, max);
  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(max * 3), 3);
  mesh.count = 0;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, n: 0 };
}

export class PickupView {
  private readonly crystals: InstancedMesh;
  private readonly cyrite: Batch;
  private readonly ore: Batch;
  private readonly parts: Batch;
  private readonly items: Item[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly p = new Vector3();
  private readonly s = new Vector3();
  private readonly axis = new Vector3(0, 1, 0);
  private readonly lean = new Vector3(1, 0, 0.4).normalize();
  private readonly tilt = new Quaternion();
  private readonly c = new Color();
  private time = 0;

  constructor(scene: Scene, glow: Texture) {
    this.crystals = new InstancedMesh(new OctahedronGeometry(1, 0).scale(0.55, 1.2, 0.55),
      new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAX_CRYSTALS);
    this.crystals.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_CRYSTALS * 3), 3);
    this.crystals.count = 0;
    this.crystals.frustumCulled = false;
    scene.add(this.crystals);
    // the finds that are not Krail are things, not light: lit lumps and cases
    // with only a small lamp, so a field of Krail still reads first
    this.cyrite = batch(scene, new CylinderGeometry(0.28, 0.5, 1.5, 6, 1).translate(0, 0.1, 0), new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(1.1, 0.25, 1.7), roughness: 0.3, metalness: 0.2 }), MAX_LOOSE);
    this.ore = batch(scene, new IcosahedronGeometry(0.7, 0).scale(1, 0.75, 0.85), new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(0.3, 0.16, 0.06), roughness: 0.9, metalness: 0.15, flatShading: true }), MAX_LOOSE);
    const caseGeo = new BoxGeometry(1.1, 0.7, 0.8);
    this.parts = batch(scene, caseGeo, new MeshStandardMaterial({ color: 0xffffff, emissive: new Color(0.06, 0.4, 0.55), roughness: 0.55, metalness: 0.5 }), MAX_LOOSE);
    // a power-up sits in a small dark housing: a cradle under the core
    const cradle = new CylinderGeometry(0.55, 0.7, 0.22, 6);
    const cradleMat = new MeshStandardMaterial({ color: 0x4a4d4f, roughness: 0.6, metalness: 0.6 });
    const ringGeo = new TorusGeometry(0.9, 0.07, 6, 28);
    for (let i = 0; i < MAX_ITEMS; i++) {
      const root = new Group();
      const core = new Mesh(new OctahedronGeometry(0.45, 0), new MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.9 }));
      const halo = new Sprite(new SpriteMaterial({ map: glow, color: 0xffffff, blending: AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(2.6);
      const base = new Mesh(cradle, cradleMat);
      base.position.y = -0.62;
      root.add(base, core, ring, halo);
      root.visible = false;
      scene.add(root);
      this.items.push({ root, core, ring, halo });
    }
  }

  update(list: readonly Pickup[], alpha: number, dt: number, fx?: Effects): void {
    this.time += dt;
    const back = (1 - alpha) * STEP;
    let n = 0, k = 0;
    this.cyrite.n = this.ore.n = this.parts.n = 0;
    for (const pk of list) {
      const pop = Math.min(1, pk.age / 0.25);
      const blink = pk.life < 2 && Math.sin(this.time * 22) < 0;
      const x = pk.x - pk.vx * back, z = pk.z - pk.vz * back;
      if (LOOSE.has(pk.kind)) {
        const b = pk.kind === 'cyrite' ? this.cyrite : pk.kind === 'ore' ? this.ore : pk.kind === 'parts' ? this.parts : null;
        if (b ? b.n >= MAX_LOOSE : n >= MAX_CRYSTALS) continue;
        const rank = pk.kind === 'crystal' ? krailRank(pk.value) : 0;
        // the richest pulse, the middling barely; the weight eases in so no step shows
        const rich = pk.kind === 'crystal' ? Math.max(0, (rank - 0.5) * 2) : 0;
        const beat = Math.sin(this.time * 5 + pk.id * 1.7);
        const size = (0.32 + pk.value * 0.07) * pop * (blink ? 0.4 : 1) * (1 + rich * 0.1 * beat);
        this.q.setFromAxisAngle(this.axis, this.time * (b ? 0.9 : 2.2) + pk.id);
        this.m.compose(this.p.set(x, 0.35 + Math.sin(this.time * 3 + pk.id) * 0.12, z), this.q, this.s.set(size, size, size));
        if (b) {
          // a find tumbles slowly, so it reads as a thing and not a spark
          this.q.multiply(this.tilt.setFromAxisAngle(this.lean, 0.5 + pk.id * 0.3));
          this.m.compose(this.p, this.q, this.s.setScalar(size * (pk.kind === 'cyrite' ? 1.5 : pk.kind === 'ore' ? 1.4 : 1)));
          b.mesh.setMatrixAt(b.n, this.m);
          this.c.copy(pk.kind === 'cyrite' ? VIOLET.clone().multiplyScalar(0.28) : pk.kind === 'ore' ? ORE : PARTS);
          b.mesh.setColorAt(b.n, this.c);
          if (fx && dt > 0 && !blink && pk.kind === 'cyrite') this.shed(fx, pk, x, z, rank, rich);
          b.n++;
          continue;
        }
        this.crystals.setMatrixAt(n, this.m);
        if (pk.kind === 'crystal') this.c.copy(krailColour(pk.value, this.c)).multiplyScalar(0.85 + rank * 0.25 + rich * 0.3 * (0.5 + 0.5 * beat));
        this.crystals.setColorAt(n, this.c);
        if (fx && dt > 0 && !blink && pk.kind === 'crystal') this.shed(fx, pk, x, z, rank, rich);
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
    for (const b of [this.cyrite, this.ore, this.parts]) {
      b.mesh.count = b.n;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** A fading trail while it is pulled in, and now and then a glint off a rich one. */
  private shed(fx: Effects, pk: Pickup, x: number, z: number, rank: number, rich: number): void {
    const speed = Math.hypot(pk.vx, pk.vz);
    const col: RGB = pk.kind === 'crystal' ? krailRGB(pk.value) : [VIOLET.r, VIOLET.g, VIOLET.b];
    if (speed > 9 && Math.random() < 0.35 + rank * 0.4) {
      fx.mote(x + (Math.random() - 0.5) * 0.3, 0.35, z + (Math.random() - 0.5) * 0.3, -pk.vx * 0.08, 0.4, -pk.vz * 0.08,
        [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7], 0.26 + rank * 0.16, 0.3 + rank * 0.2);
    }
    if (rich > 0 && Math.random() < 0.03 * rich) {
      fx.mote(x, 0.6, z, (Math.random() - 0.5) * 1.5, 2.5 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5, col, 0.2, 0.55);
    }
  }
}
