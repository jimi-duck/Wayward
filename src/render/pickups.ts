import {
  AdditiveBlending, BoxGeometry, BufferAttribute, Color, CylinderGeometry, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh,
  LatheGeometry, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, Vector2, Quaternion, Sprite, SpriteMaterial, TorusGeometry, Vector3,
  type BufferGeometry, type Material, type Scene, type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STEP } from '../core/loop';
import { LOOSE, type Pickup } from '../sim/pickups';
import type { Effects, RGB } from './fx';

// ── things to pick up ─────────────────────────────────────────────────────
// Krail shows what it is worth in its colour: white for the smallest, blue
// for a middling one, purple for the richest, blended smoothly between
// (`krailColour`). Cyrite (the Story mode's fuel) stays its own deeper
// violet. A shard of crystal, HDR so it blooms, spinning, sized by what it
// holds, lit like stone, not like a lamp; one being pulled in leaves a short
// trail in its colour. Hull repairs
// are a warm amber crystal in a halo; power-ups are a ring round a core in
// their own colour, turning, so a find reads as a find from across the
// field. Everything pops in, and blinks for its last two seconds.

const MAX_CRYSTALS = 320;
/** Ore and parts are rarer than crystal. */
const MAX_LOOSE = 96;
const MAX_ITEMS = 10;
/** Cyrite crystals by worth: a deep violet for a small one, a bright one for the richest. */
const C_DEEP = new Color(0.34, 0.16, 0.5), C_BRIGHT = new Color(0.56, 0.3, 0.72);
/** Krail by worth: white (lowest), blue, purple (highest). */
const K_WHITE = new Color(0.8, 0.84, 0.9);
const K_BLUE = new Color(0.25, 0.5, 0.85);
const K_PURPLE = new Color(0.5, 0.25, 0.75);
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
  yield: new Color(2.4, 1, 3.8),
  overdrive: new Color(3.8, 2.2, 0.4),
};

interface Item { root: Group; core: Mesh; ring: Mesh; halo: Sprite; }

/**
 * A Krail crystal: one long six-sided prism with pointed ends and two small
 * shards grown off its flank, flat-faced so each facet takes its own light.
 */
function krailCluster(): BufferGeometry {
  const prism = (r: number, len: number): BufferGeometry => {
    const g = new LatheGeometry([new Vector2(0, -len), new Vector2(r * 0.55, -len * 0.55), new Vector2(r, -len * 0.1), new Vector2(r, len * 0.3), new Vector2(0, len)], 6).toNonIndexed();
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    return g;
  };
  const a = prism(0.5, 1.15);
  const b = prism(0.22, 0.6).rotateZ(0.7).translate(0.38, -0.3, 0.1);
  const c = prism(0.17, 0.45).rotateZ(-0.8).rotateY(1.9).translate(-0.3, -0.35, -0.2);
  return mergeGeometries([a, b, c])!;
}

/**
 * Krail's stone: dark and glassy, lit from inside in its own colour (the
 * instance colour carries the worth). A bright core, a rim that fills at a
 * glancing angle, and a slow shimmer that passes from facet to facet.
 */
function krailMaterial(_clock: { value: number }): MeshStandardMaterial {
  // lit like mineral, not like a lamp: the stone takes the scene's light and
  // a faint inner colour keeps it readable in shadow, well under the bloom line
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.15, flatShading: true, envMapIntensity: 0.8 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 krailTint = diffuseColor.rgb;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += krailTint * 0.12;`);
  };
  m.customProgramCacheKey = () => 'krail-crystal-lit';
  return m;
}

/** A part of a find: its geometry, a tone for its colour (1 is the find's own), and how much of its light it keeps (0 is a dark housing). */
function part(geo: BufferGeometry, tone: number, lit: number): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  const n = g.attributes.position!.count;
  g.setAttribute('color', new BufferAttribute(new Float32Array(n * 3).fill(tone), 3));
  g.setAttribute('aLit', new BufferAttribute(new Float32Array(n).fill(lit), 1));
  return g;
}

/** A find's material: vertex tones under the instance colour, and an emissive each part keeps in its own measure (`aLit`). */
function findMaterial(emissive: Color, roughness: number, metalness: number, flat = true): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: 0xffffff, emissive, roughness, metalness, flatShading: flat, vertexColors: true });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLit; varying float vLit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLit = aLit;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLit;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vLit;');
  };
  m.customProgramCacheKey = () => `find-${emissive.getHexString()}`;
  return m;
}

/** Ore: a split lump of rock, a bright metal seam through the break, a strap round it. */
function oreGeo(): BufferGeometry {
  const lump = new IcosahedronGeometry(0.62, 1);
  const p = lump.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.2 * Math.sin(x * 7.1 + z * 3.3) * Math.cos(y * 5.7 + x * 2.1) + (y > 0.25 ? -0.12 : 0);
    p.setXYZ(i, x * k * 1.15, y * k * 0.78, z * k * 0.95);
  }
  lump.computeVertexNormals();
  return mergeGeometries([
    part(lump, 0.8, 0.15),
    part(new BoxGeometry(0.9, 0.05, 0.2).translate(0.05, 0.16, 0.5), 1.8, 1),
    part(new BoxGeometry(0.2, 0.05, 0.7).translate(-0.3, 0.3, 0.1), 1.5, 0.8),
    part(new CylinderGeometry(0.69, 0.69, 0.07, 10).translate(0, -0.1, 0), 0.25, 0),
  ])!;
}

/** Parts: a hard case with corner guards, a handle and a latch lamp. */
function partsGeo(): BufferGeometry {
  const guards: BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) guards.push(part(new BoxGeometry(0.22, 0.78, 0.22).translate(sx * 0.5, 0, sz * 0.34), 0.3, 0));
  return mergeGeometries([
    part(new BoxGeometry(1.1, 0.7, 0.8), 1, 0.35),
    part(new BoxGeometry(1.12, 0.06, 0.82).translate(0, 0.06, 0), 0.35, 0),
    ...guards,
    part(new BoxGeometry(0.5, 0.06, 0.06).translate(0, 0.42, 0), 0.25, 0),
    part(new BoxGeometry(0.06, 0.1, 0.06).translate(0.22, 0.38, 0), 0.25, 0),
    part(new BoxGeometry(0.06, 0.1, 0.06).translate(-0.22, 0.38, 0), 0.25, 0),
    part(new BoxGeometry(0.12, 0.1, 0.03).translate(0.35, 0.12, 0.41), 2.4, 3),
    part(new BoxGeometry(0.5, 0.05, 0.03).translate(-0.1, -0.05, 0.41), 1.2, 1),
  ])!;
}

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
  private readonly clock = { value: 0 };

  constructor(scene: Scene, glow: Texture) {
    this.crystals = new InstancedMesh(krailCluster(), krailMaterial(this.clock), MAX_CRYSTALS);
    this.crystals.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_CRYSTALS * 3), 3);
    this.crystals.count = 0;
    this.crystals.frustumCulled = false;
    scene.add(this.crystals);
    // the finds that are not crystal are things, not light: lit lumps and cases
    // with only a small lamp, so a field of crystal still reads first
    this.ore = batch(scene, oreGeo(), findMaterial(new Color(0.9, 0.5, 0.2), 0.85, 0.3), MAX_LOOSE);
    this.parts = batch(scene, partsGeo(), findMaterial(new Color(0.1, 0.7, 0.9), 0.5, 0.6), MAX_LOOSE);
    // a power-up sits in a small dark housing: a cradle under the core
    const cradleParts: BufferGeometry[] = [new CylinderGeometry(0.55, 0.7, 0.22, 6), new CylinderGeometry(0.3, 0.4, 0.2, 6).translate(0, 0.2, 0), new TorusGeometry(0.46, 0.035, 5, 6).rotateX(Math.PI / 2).translate(0, 0.12, 0)];
    // three arms rise from the base round the core and meet over it: a cage, with a clamp where each leaves the base
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      cradleParts.push(new BoxGeometry(0.06, 1.15, 0.08).rotateZ(-0.42).translate(-0.32, 0.62, 0).rotateY(a));
      cradleParts.push(new BoxGeometry(0.16, 0.14, 0.14).translate(-0.58, 0.14, 0).rotateY(a));
    }
    const cradle = mergeGeometries(cradleParts.map((g) => { const n = g.index ? g.toNonIndexed() : g; n.deleteAttribute('uv'); return n; }))!;
    const cradleMat = new MeshStandardMaterial({ color: 0x4a4d4f, roughness: 0.6, metalness: 0.6 });
    const ringGeo = new TorusGeometry(0.8, 0.04, 8, 32);
    for (let i = 0; i < MAX_ITEMS; i++) {
      const root = new Group();
      // a cell is a faceted glass core and a thin steel band, lit by the scene with a small inner colour, not a lamp
      const core = new Mesh(new OctahedronGeometry(0.4, 0), new MeshStandardMaterial({ color: 0x20262c, roughness: 0.2, metalness: 0.4, flatShading: true, emissive: 0x000000 }));
      const ring = new Mesh(ringGeo, new MeshStandardMaterial({ color: 0x6a7076, roughness: 0.4, metalness: 0.8, emissive: 0x000000 }));
      const halo = new Sprite(new SpriteMaterial({ map: glow, color: 0xffffff, blending: AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(1.8);
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
    this.clock.value = this.time;
    const back = (1 - alpha) * STEP;
    let n = 0, k = 0;
    this.ore.n = this.parts.n = 0;
    for (const pk of list) {
      const pop = Math.min(1, pk.age / 0.25);
      const blink = pk.life < 2 && Math.sin(this.time * 22) < 0;
      const x = pk.x - pk.vx * back, z = pk.z - pk.vz * back;
      if (LOOSE.has(pk.kind)) {
        const b = pk.kind === 'ore' ? this.ore : pk.kind === 'parts' ? this.parts : null;
        const cy = pk.kind === 'cyrite';
        if (b ? b.n >= MAX_LOOSE : n >= MAX_CRYSTALS) continue;
        const rank = pk.kind === 'crystal' || cy ? krailRank(pk.value) : 0;
        // Cyrite is the one thing worth finding: a plain violet crystal, a little bigger than Krail
        const size = (cy ? 0.42 + pk.value * 0.1 : 0.3 + pk.value * 0.06) * pop * (blink ? 0.4 : 1);
        this.q.setFromAxisAngle(this.axis, this.time * (b ? 0.9 : 2.2) + pk.id);
        this.m.compose(this.p.set(x, 0.35 + Math.sin(this.time * 3 + pk.id) * 0.12, z), this.q, this.s.set(size, size, size));
        if (b) {
          // a find tumbles slowly, so it reads as a thing and not a spark
          this.q.multiply(this.tilt.setFromAxisAngle(this.lean, 0.5 + pk.id * 0.3));
          this.m.compose(this.p, this.q, this.s.setScalar(size * (pk.kind === 'ore' ? 1.4 : 1)));
          b.mesh.setMatrixAt(b.n, this.m);
          this.c.copy(pk.kind === 'ore' ? ORE : PARTS);
          b.mesh.setColorAt(b.n, this.c);
          b.n++;
          continue;
        }
        this.crystals.setMatrixAt(n, this.m);
        if (cy) this.c.copy(C_DEEP).lerp(C_BRIGHT, rank).multiplyScalar(1);
        else this.c.copy(krailColour(pk.value, this.c)).multiplyScalar(0.9 + rank * 0.2);
        this.crystals.setColorAt(n, this.c);
        if (fx && dt > 0 && !blink) this.shed(fx, pk, x, z, rank);
        n++;
        continue;
      }
      const it = this.items[k++];
      if (!it) continue;
      const col = ITEM_COLOR[pk.kind] ?? ITEM_COLOR.repair!;
      it.root.visible = !blink;
      it.root.position.set(x, 0.55 + Math.sin(this.time * 2.5 + pk.id) * 0.15, z);
      it.root.scale.setScalar(pop);
      (it.core.material as MeshStandardMaterial).emissive.copy(col).multiplyScalar(0.55);
      (it.ring.material as MeshStandardMaterial).emissive.copy(col).multiplyScalar(0.22);
      (it.halo.material as SpriteMaterial).color.copy(col).multiplyScalar(0.2);
      it.core.rotation.y = this.time * 2;
      it.ring.visible = pk.kind !== 'repair';
      it.ring.rotation.set(this.time * 1.3 + pk.id, this.time * 0.9, 0);
    }
    for (; k < MAX_ITEMS; k++) this.items[k]!.root.visible = false;
    this.crystals.count = n;
    this.crystals.instanceMatrix.needsUpdate = true;
    if (this.crystals.instanceColor) this.crystals.instanceColor.needsUpdate = true;
    for (const b of [this.ore, this.parts]) {
      b.mesh.count = b.n;
      b.mesh.instanceMatrix.needsUpdate = true;
      if (b.mesh.instanceColor) b.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** A short fading trail while it is pulled in. */
  private shed(fx: Effects, pk: Pickup, x: number, z: number, rank: number): void {
    const speed = Math.hypot(pk.vx, pk.vz);
    const col: RGB = pk.kind === 'crystal' ? krailRGB(pk.value) : [0.5, 0.28, 0.7];
    if (speed > 9 && Math.random() < 0.35 + rank * 0.4) {
      fx.mote(x + (Math.random() - 0.5) * 0.3, 0.35, z + (Math.random() - 0.5) * 0.3, -pk.vx * 0.08, 0.4, -pk.vz * 0.08,
        [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6], 0.16 + rank * 0.08, 0.25 + rank * 0.1);
    }
  }
}
