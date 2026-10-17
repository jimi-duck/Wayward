import {
  AdditiveBlending, BoxGeometry, Color, Euler, Float32BufferAttribute, Group, InstancedMesh,
  LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Matrix4, Quaternion,
  Sprite, SpriteMaterial, Vector3, BufferGeometry, type Material, type Scene, type Texture,
} from 'three';
import { STEP } from '../core/loop';
import type { Boss } from '../sim/bosses';
import {
  ALIEN_ORDER, ALIEN_TYPES, BEAM_FIRE, BEAM_LEN, JINK_ROLL, type Alien, type AlienKind, type EliteId, type Faction, type Shot, type Web,
} from '../sim/enemies';
import { Kit, metal, seeded, type V3 } from './kit';
import { GLOW, HULL_LOOK } from './look';
import { designFor } from './hulls';
import { STREAK, type Streaks } from './streaks';

// ── the enemy ─────────────────────────────────────────────────────────────
// Built from the same industrial kit as the player's ships, so the whole sky
// is one world: weathered, heavy, lived-in. Each faction has its own metal
// (rust-brown, ochre, verdigris, black, amber crystal) and its own engine
// colour, which is how you read a hull 150 units out: the engines are lit
// bright enough to see long before the hull is.
//
//   scout   · a swept bird: a fuselage, angled wings, wingtip guns
//   raptor  · a long neck and a heavy head on a broad wing
//   stalker · forward-swept wings, a hunter's profile
//   lancer  · the heavy cruiser: a spine, a fan for a head, side hulls,
//             towers and batteries, three engines
//   warbird · a double crescent around a central hull
//   drone   · a foundry, every face crusted with machinery, green slits
//   weaver  · a crystal shard with blades
//   freighter · a long spine of cargo pods, slow and fat
//
// A variant is an archetype in another faction's metal and engines (a
// Office scout is the Whisper), so models are built per archetype and
// faction. Capital ships are their faction's hull at several times the
// size. Cloaking hulls get their own materials so each can fade on its own;
// an elite carries a halo in its modifier's colour.

export const NEON: Record<Faction, Color> = {
  gutter: new Color(3.6, 1.6, 0.2),
  custody: new Color(3.4, 2.5, 0.5),
  office: new Color(0.5, 3.4, 1.2),
  voice: new Color(0.7, 3.6, 0.6),
  thren: new Color(3.0, 1.0, 3.4),
};
const WEB = new Color(2.2, 0.9, 3.4);

/** A light on the hull, in model space: position, then length and width (a slit if they differ, a point if not). */
type Lamp = [number, number, number, number, number];

interface Model { root: Group; engines: V3[]; lamps: Lamp[]; }

function lamp(c: Color): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: c, toneMapped: false });
}

/** An elite's halo: the colour says which modifier. */
const ELITE_GLOW: Record<EliteId, Color> = {
  armoured: new Color(1.6, 1.6, 1.7),
  swift: new Color(0.6, 2.2, 3.2),
  volatile: new Color(3.6, 1.4, 0.3),
  gunner: new Color(3.6, 0.5, 0.4),
  cloaked: new Color(0.6, 2.8, 1.2),
  regenerative: new Color(1, 3, 1.4),
  spinner: new Color(2.4, 0.9, 3.4),
};

/** Rough extent of each hull: nose x, tail x, half-width z, deck height y. */
const EXTENT: Partial<Record<AlienKind, [number, number, number, number]>> = {
  scout: [1.0, -0.7, 1.0, 0.28], stalker: [1.0, -0.7, 1.0, 0.28], raptor: [1.25, -0.9, 0.8, 0.22],
  lancer: [1.18, -1.05, 0.55, 0.3], warbird: [1.1, -0.6, 1.0, 0.3], freighter: [1.05, -1.05, 0.4, 0.2],
};

/**
 * What makes a hull of one faction not another, on top of the archetype's
 * shape (SHIPS.md): Gutter patched and lopsided, Custody ordered in heavy
 * rows, the Office slim swept crescents, the Voice machine crust, Thren
 * faceted blades. Each adds to the outline, not just the surface.
 */
function dress(k: Kit, kind: AlienKind, f: Faction, rnd: () => number): void {
  const e = EXTENT[kind];
  if (!e) return;
  const [nose, tail, w, h] = e, len = nose - tail, mid = (nose + tail) / 2;
  switch (f) {
    case 'gutter': {
      // a bolted-on plate and a pod on one side only, a hanging strut, a stripe
      const s = rnd() < 0.5 ? -1 : 1;
      k.box('hull', [len * 0.34, 0.07, w * 0.32], [mid - len * 0.1, h * 0.5, s * w * 0.55], [0, 0.12 * s, 0.08 * s]);
      k.box('trim', [len * 0.3, 0.015, w * 0.1], [mid - len * 0.1, h * 0.5 + 0.045, s * w * 0.55]);
      k.cyl('dark', 0.07, 0.07, len * 0.4, [mid - len * 0.2, -0.04, -s * w * 0.4], 'x', 7);
      k.box('dark', [0.05, 0.05, w * 0.35], [mid + len * 0.15, -0.1, s * w * 0.3]);
      k.box('hull', [len * 0.16, 0.12, 0.1], [tail + 0.1, 0.1, -s * w * 0.28], [0.2, 0, 0]);
      break;
    }
    case 'custody': {
      // armour plates in matched rows, and a band across the nose
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        k.box('dark', [len * 0.22, 0.05, w * 0.22], [mid + len * (0.22 - i * 0.26), h * 0.55, s * w * 0.34]);
      }
      k.box('trim', [0.05, 0.03, w * 0.55], [nose - len * 0.2, h * 0.5, 0]);
      k.box('hull', [len * 0.5, 0.05, w * 0.1], [mid, h * 0.52, 0]);
      for (const s of [-1, 1]) k.box('hull', [len * 0.12, 0.1, w * 0.1], [tail + len * 0.08, 0, s * w * 0.25]);
      break;
    }
    case 'office': {
      // swept crescent fins sweeping back past the tail, a thin green line
      for (const s of [-1, 1]) {
        k.wedge('hull', [[mid + len * 0.1, s * w * 0.25], [mid - len * 0.2, s * w * 0.9], [tail - len * 0.25, s * w * 1.05], [tail + len * 0.1, s * w * 0.55], [mid - len * 0.25, s * w * 0.35]], 0.04, [0, 0.0, 0], [s * 0.1, 0, 0]);
        k.box('trim', [len * 0.5, 0.012, 0.025], [mid - len * 0.1, 0.03, s * w * 0.62], [0, -0.12 * s, 0]);
      }
      k.box('trim', [len * 0.6, 0.012, 0.03], [mid, h * 0.5 + 0.01, 0]);
      break;
    }
    case 'voice': {
      // a foundry crust: vent stacks, pipes along the flanks, a heavy brow
      for (let i = 0; i < 4; i++) k.cyl('dark', 0.05, 0.06, 0.16 + rnd() * 0.12, [tail + len * (0.2 + i * 0.16), h * 0.5 + 0.08, (rnd() - 0.5) * w * 0.3], 'y', 6);
      for (const s of [-1, 1]) {
        k.cyl('dark', 0.035, 0.035, len * 0.7, [mid - len * 0.05, h * 0.2, s * w * 0.3], 'x', 6);
        k.box('trim', [len * 0.16, 0.05, 0.03], [mid + len * 0.1, h * 0.5, s * w * 0.2]);
      }
      k.box('dark', [len * 0.25, 0.1, w * 0.45], [nose - len * 0.25, h * 0.35, 0]);
      k.greebles('dark', rnd, tail + 0.1, nose - 0.3, -w * 0.3, w * 0.3, h + 0.02, 10, 0.08);
      break;
    }
    case 'thren': {
      // faceted blades: a forward shard and swept crystals either side
      k.crystal('trim', 0.18, [nose + len * 0.12, 0, 0], [3.2, 0.5, 0.5]);
      for (const s of [-1, 1]) {
        k.crystal('hull', 0.2, [mid - len * 0.05, 0.02, s * w * 0.62], [2.4, 0.4, 0.9]);
        k.crystal('trim', 0.12, [tail + len * 0.15, 0.04, s * w * 0.4], [2.2, 0.5, 0.5]);
      }
      break;
    }
  }
}

/** A hull of unit radius, nose +X, in a faction's metal. */
function build(kind: AlienKind, faction: Faction): Model {
  const design = designFor(kind, faction);
  if (design) return { root: design.k.build(factionMaterials(faction), 0.04), engines: design.engines, lamps: design.lamps };
  const k = new Kit(), rnd = seeded(kind.length * 31 + kind.charCodeAt(0));
  const engines: V3[] = [];
  // Running lights and windows are not geometry: they are drawn as light
  // (HullView.flare), in the same draw as the drives and the shots.
  const lamps: Lamp[] = [];
  const lamp = (x: number, y: number, z: number, len = 0.06, wid = len) => lamps.push([x, y, z, len, wid]);
  const engine = (x: number, y: number, z: number, r: number) => {
    k.cyl('dark', r, r * 1.15, r * 2.2, [x + r, y, z], 'x', 12);
    k.cyl('dark', r * 0.95, r * 1.25, r * 0.6, [x - r * 0.3, y, z], 'x', 12, true);
    engines.push([x - r * 0.5, y, z]);
  };
  switch (kind) {
    case 'scout':
    case 'stalker': {
      const fwd = kind === 'stalker' ? 0.35 : -0.3;
      k.wedge('hull', [[1.0, 0], [0.45, 0.2], [-0.6, 0.22], [-0.7, 0], [-0.6, -0.22], [0.45, -0.2]], 0.28);
      k.box('dark', [0.4, 0.14, 0.22], [0.15, 0.2, 0]);
      for (const s of [-1, 1]) {
        k.wedge('dark', [[0.15, 0.18 * s], [fwd, 1.0 * s], [fwd - 0.32, 1.0 * s], [-0.5, 0.18 * s]], 0.07, [0, -0.04, 0], [s * 0.18, 0, 0]);
        k.cyl('dark', 0.04, 0.05, 0.6, [fwd + 0.05, -0.04 - s * 0.16, s * 0.98], 'x', 6);
        k.box('trim', [0.3, 0.02, 0.12], [fwd - 0.12, 0.0, s * 0.7]);
      }
      k.cyl('dark', 0.12, 0.16, 0.36, [0.85, 0.02, 0], 'x', 8);
      lamp(0.3, 0.285, 0, 0.22, 0.05);
      for (const s of [-1, 1]) lamp(fwd - 0.2, 0.03, s * 1.02);
      k.greebles('dark', rnd, -0.5, 0.4, -0.15, 0.15, 0.14, 8, 0.1);
      for (const s of [-1, 1]) engine(-0.75, 0, s * 0.16, 0.11);
      break;
    }
    case 'raptor':
      k.box('hull', [0.9, 0.12, 0.16], [0.65, 0.02, 0]);
      k.wedge('hull', [[1.25, 0], [1.05, 0.2], [0.9, 0.2], [0.9, -0.2], [1.05, -0.2]], 0.22);
      k.wedge('hull', [[0.25, 0.14], [-0.4, 0.8], [-0.9, 0.8], [-0.9, -0.8], [-0.4, -0.8], [0.25, -0.14]], 0.2);
      k.box('dark', [0.8, 0.1, 1.5], [-0.55, 0.14, 0]);
      lamp(1.13, 0.12, 0, 0.1, 0.04);
      for (const s of [-1, 1]) lamp(-0.9, 0.03, s * 0.82);
      k.greebles('dark', rnd, -0.85, -0.2, -0.7, 0.7, 0.19, 18, 0.1);
      for (const s of [-1, 1]) { k.cyl('dark', 0.05, 0.05, 0.55, [-0.4, -0.05, s * 0.82], 'x', 6); engine(-1.0, 0, s * 0.45, 0.12); }
      break;
    case 'lancer':
      k.wedge('hull', [[1.0, 0.55], [1.18, 0], [1.0, -0.55], [0.6, -0.22], [-1.0, -0.2], [-1.05, 0], [-1.0, 0.2], [0.6, 0.22]], 0.22);
      k.box('hull', [1.5, 0.18, 0.2], [-0.15, 0.2, 0]);
      for (const s of [-1, 1]) {
        k.box('hull', [1.0, 0.2, 0.22], [-0.45, -0.02, s * 0.36]);
        k.box('dark', [0.9, 0.06, 0.26], [-0.45, 0.11, s * 0.36]);
        for (let i = 0; i < 3; i++) k.cyl('dark', 0.025, 0.03, 0.2, [-0.2 - i * 0.25, -0.02, s * 0.52], 'z', 6);
      }
      k.box('hull', [0.22, 0.32, 0.18], [-0.35, 0.42, 0]);
      k.box('dark', [0.28, 0.04, 0.24], [-0.35, 0.6, 0]);
      lamp(-0.23, 0.5, 0, 0.03, 0.12);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) lamp(-0.1 - i * 0.2, 0.04, s * 0.49, 0.05);
      k.cyl('dark', 0.012, 0.012, 0.3, [-0.4, 0.75, 0], 'y', 5);
      k.box('trim', [0.6, 0.02, 0.5], [0.75, 0.12, 0]);
      k.greebles('dark', rnd, -0.95, 0.5, -0.18, 0.18, 0.29, 22, 0.08);
      for (const z of [-0.36, 0, 0.36]) engine(-1.15, 0, z, 0.1);
      break;
    case 'warbird':
      for (const s of [-1, 1]) {
        k.wedge('hull', [[0.9, 0.05 * s], [0.3, 0.95 * s], [-0.6, 1.05 * s], [-0.2, 0.4 * s], [-0.5, 0.05 * s]], 0.08, [0, s * 0.16, 0]);
        k.box('dark', [0.5, 0.04, 0.3], [0, s * 0.21, s * 0.6]);
      }
      k.wedge('hull', [[1.1, 0], [0.4, 0.16], [-0.6, 0.13], [-0.6, -0.13], [0.4, -0.16]], 0.3);
      k.box('trim', [0.5, 0.02, 0.12], [0.3, 0.16, 0]);
      lamp(0.78, 0.12, 0, 0.18, 0.04);
      for (const s of [-1, 1]) lamp(-0.55, s * 0.17, s * 1.03);
      k.greebles('dark', rnd, -0.5, 0.5, -0.12, 0.12, 0.15, 10, 0.08);
      engine(-0.75, 0, 0, 0.13);
      for (const s of [-1, 1]) engine(-0.65, s * 0.16, s * 0.9, 0.07);
      break;
    case 'drone': {
      k.box('dark', [1.4, 1.4, 1.4], [0, 0, 0]);
      // machinery on every face
      for (const [ax, sgn] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]] as const) {
        for (let i = 0; i < 14; i++) {
          const u = (rnd() - 0.5) * 1.2, v = (rnd() - 0.5) * 1.2, s = 0.08 + rnd() * 0.22, h = 0.04 + rnd() * 0.12;
          const pos: V3 = [0, 0, 0], size: V3 = [s, s, s];
          pos[ax] = sgn * (0.7 + h / 2); size[ax] = h;
          pos[(ax + 1) % 3] = u; pos[(ax + 2) % 3] = v;
          k.box(rnd() < 0.5 ? 'hull' : 'dark', size, pos);
        }
        for (let i = 0; i < 3; i++) {
          const pos: V3 = [0, 0, 0], size: V3 = [0.5, 0.03, 0.03];
          pos[ax] = sgn * 0.71; size[ax] = 0.02;
          pos[(ax + 1) % 3] = (rnd() - 0.5) * 1.0; pos[(ax + 2) % 3] = (rnd() - 0.5) * 1.0;
          if (ax === 1) { size[0] = 0.03; size[2] = 0.5; }
          k.box('lamp', size, pos);
        }
      }
      engines.push([-0.72, 0, 0]);
      break;
    }
    case 'weaver':
      k.crystal('trim', 0.8, [0, 0, 0], [1.5, 0.55, 0.8]);
      for (const s of [-1, 1]) k.wedge('hull', [[0.2, 0], [-0.4, 0.9 * s], [-0.7, 0.8 * s], [-0.3, 0]], 0.06);
      k.crystal('lamp', 0.25, [0.2, 0, 0], [1.6, 0.6, 0.8]);
      engines.push([-0.8, 0, 0]);
      break;
    case 'freighter': {
      // a spine, a bridge forward, cargo pods slung either side
      k.box('dark', [1.9, 0.12, 0.14], [-0.05, 0, 0]);
      k.wedge('hull', [[1.05, 0], [0.85, 0.16], [0.6, 0.18], [0.6, -0.18], [0.85, -0.16]], 0.24, [0, 0.04, 0]);
      for (let i = 0; i < 4; i++) {
        for (const s of [-1, 1]) {
          k.box('hull', [0.32, 0.26, 0.26], [0.35 - i * 0.36, 0, s * 0.22]);
          k.box('dark', [0.33, 0.04, 0.27], [0.35 - i * 0.36, 0.14, s * 0.22]);
          if (i % 2 === 0) lamp(0.35 - i * 0.36, 0.02, s * 0.37, 0.05);
        }
      }
      k.greebles('dark', rnd, -0.9, 0.5, -0.1, 0.1, 0.07, 10, 0.06);
      for (const s of [-1, 1]) engine(-1.05, 0, s * 0.16, 0.1);
      break;
    }
  }
  dress(k, kind, faction, seeded(kind.length * 17 + faction.length * 5));
  return { root: k.build(factionMaterials(faction)), engines, lamps };
}

/** The derelict for the sector event: a lancer hull, dark and dead. */
export function wreck(): Group {
  const m = build('lancer', 'custody');
  const dead = metal({ tint: 0x2e2a28, roughness: 0.8, metalness: 0.6, scale: 1.6 });
  for (const c of m.root.children as Mesh[]) c.material = c.name === 'lamp' ? new MeshBasicMaterial({ color: new Color(0.6, 0.15, 0.05), toneMapped: false }) : dead;
  m.root.scale.setScalar(4.5);
  return m.root;
}

/**
 * Grown crystal: a dark smoky amber body that lights from inside. Facing
 * the eye it is deep and nearly black; at a glancing angle the edge fills
 * with amber, and every facet takes a slightly different depth, so a hull
 * reads as a cut stone with a light in it, not a painted shape.
 */
function crystalMaterial(body: number, glow: number, core = 0.01, name = 'thren-crystal'): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: new Color(body).multiplyScalar(0.16), roughness: 0.2, metalness: 0.7, flatShading: true, envMapIntensity: 0.8 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uInner = { value: new Color(glow).multiplyScalar(1.5) };
    sh.uniforms.uCore = { value: core };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uInner; uniform float uCore;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 nv = normalize(vViewPosition);
        float edge = pow(1.0 - abs(dot(normalize(normal), nv)), 3.6);
        float facet = fract(sin(dot(floor(normal * 6.0), vec3(12.9, 78.2, 37.7))) * 43758.5) * 0.5 + 0.5;
        totalEmissiveRadiance += uInner * (uCore + edge * 1.7) * facet * facet * facet;`);
  };
  m.customProgramCacheKey = () => name;
  return m;
}

/** How hot a faction's lit slits run: the Office's are a thin quiet line, the Gutter's a working lamp. */
const SLIT: Record<Faction, number> = { gutter: 0.9, custody: 0.85, office: 0.4, voice: 0.55, thren: 0.6 };

const factionMats = new Map<string, Record<string, Material>>();
/**
 * A faction's metal. `grain` multiplies the plating's repeats per model unit: a capital ship is drawn five times the
 * size of a fighter, so on the fighter's grain its plates would be slabs; finer grain gives it panels and seams.
 */
function factionMaterials(f: Faction, grain = 1): Record<string, Material> {
  const id = `${f}:${grain}`;
  let m = factionMats.get(id);
  if (!m) {
    const l = HULL_LOOK[f];
    const coat = { painted: true, worn: Math.min(1, l.worn + (grain > 1 ? 0.12 : 0)), roughness: 0.62, metalness: 0.1, engine: NEON[f].clone().multiplyScalar(0.12) };
    const lit = (c: number, k: number) => new MeshStandardMaterial({ color: c, emissive: new Color(c).multiplyScalar(k), roughness: 0.4, metalness: 0.2 });
    m = {
      hull: metal({ ...coat, tint: l.base, roughness: 0.6, metalness: 0.45, scale: 1.8 * grain }),
      paint: metal({ ...coat, tint: l.paint, scale: 1.2 * grain }),
      patch: metal({ ...coat, tint: l.patch, scale: 1.4 * grain }),
      dark: metal({ ...coat, tint: l.under, roughness: 0.55, metalness: 0.5, scale: 1.8 * grain }),
      trim: f === 'thren' ? lit(l.trim, GLOW.trim * 0.35) : metal({ ...coat, tint: l.trim, scale: 1.6 * grain, emissive: new Color(l.trim).multiplyScalar(GLOW.trim * 0.12) }),
      glow: lamp(NEON[f].clone().multiplyScalar(SLIT[f])),
      lamp: lamp(NEON[f].clone().multiplyScalar(0.9)),
      crystal: crystalMaterial(l.paint, l.trim, 0.07),
      violet: crystalMaterial(0x2a1040, 0x9a40ff, 0.5, 'thren-violet'),
    };
    factionMats.set(id, m);
  }
  return m;
}

/** How much finer a capital ship's plating is cut than a fighter's. */
const CAPITAL_GRAIN = 2.6;

const FLASH = new MeshStandardMaterial({ color: 0x444444, emissive: new Color(3, 2.6, 2.2) });

class HullView {
  readonly root = new Group();
  readonly body = new Group();
  readonly meshes: Mesh[];
  readonly mats: Material[];
  /** Engine nozzles in model space, and whether the flares show. */
  readonly engines: V3[];
  readonly lamps: Lamp[];
  flaring = true;
  readonly halo: Sprite;
  private cloaked = -1;
  /** `own`: its own materials, so it can fade (cloak) without fading every hull of its kind. */
  constructor(readonly key: string, model: Model, glowTex: Texture, readonly colour: Color, readonly own = false) {
    const copy = model.root.clone();
    this.meshes = copy.children as Mesh[];
    if (own) for (const m of this.meshes) m.material = (m.material as Material).clone();
    this.mats = this.meshes.map((m) => m.material as Material);
    this.body.add(copy);
    this.engines = model.engines;
    this.lamps = model.lamps;
    this.halo = new Sprite(new SpriteMaterial({ map: glowTex, color: 0xffffff, blending: AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    this.halo.visible = false;
    this.root.add(this.body, this.halo);
  }

  flash(on: boolean): void {
    this.meshes.forEach((m, i) => { m.material = on ? FLASH : this.mats[i]!; });
  }

  /** Fade toward invisible as the cloak comes up: a shimmer, never quite nothing. */
  cloak(k: number, time: number): void {
    if (!this.own) return;
    const vis = k <= 0 ? 1 : Math.max(0.04, 1 - k) + (k > 0.5 ? 0.04 * Math.sin(time * 9) : 0);
    if (Math.abs(vis - this.cloaked) < 0.005) return;
    this.cloaked = vis;
    for (const m of this.mats) { m.transparent = vis < 0.99; m.opacity = vis; m.depthWrite = vis >= 0.99; }
    this.flaring = k < 0.5;
  }

  /** The drives and running lights of this hull (see `lights`). */
  flare(streaks: Streaks, size: number, burn: number, time: number, id: number, far: number): void {
    if (!this.flaring) return;
    this.body.updateWorldMatrix(true, false);
    lights(streaks, this.body.matrixWorld, this, this.colour, size, burn, time, id, far);
  }
}

const LP = new Vector3(), LBACK = new Vector3(), LFWD = new Vector3();

/**
 * The drives and running lights, as streaks (streaks.ts): a white-hot nozzle
 * and a flame astern along the hull's own axis, so the plume points where the
 * ship is not going. `m` is the hull's world matrix; `size` its scale in the
 * world; `far` grows the flare with distance so a drive still shows from
 * across the sky.
 */
function lights(streaks: Streaks, m: Matrix4, model: { engines: V3[]; lamps: Lamp[] }, colour: Color, size: number, burn: number, time: number, id: number, far: number): void {
  const flick = 1 + Math.sin(time * 31 + id) * 0.06;
  LBACK.set(-1, 0, 0).transformDirection(m);
  LFWD.set(1, 0, 0).transformDirection(m);
  // running lights: a few points that blink out of step, windows that stay lit
  for (let i = 0; i < model.lamps.length; i++) {
    const [lx, ly, lz, len, wid] = model.lamps[i]!;
    const slit = len !== wid, blink = slit ? 1 : 0.35 + 0.65 * Math.max(0, Math.sin(time * 2.4 + id * 1.7 + i * 2.1) * 3 - 1.2);
    if (!slit && blink < 0.05) continue;
    LP.set(lx, ly, lz).applyMatrix4(m);
    streaks.push(LP.x, LP.y, LP.z, LFWD.x, LFWD.y, LFWD.z,
      Math.max(len * size, 0.05) * far, Math.max(wid * size, 0.05) * far, slit ? STREAK.slug : STREAK.orb, colour, blink * (slit ? 0.9 : 1.1), 0);
  }
  for (const e of model.engines) {
    LP.set(e[0], e[1], e[2]).applyMatrix4(m);
    // the flame trails behind the nozzle: its head is at the nozzle
    streaks.push(LP.x, LP.y, LP.z, LFWD.x, LFWD.y, LFWD.z, size * (0.7 + 1.1 * burn) * flick * far, size * 0.2 * far, STREAK.torp, colour, 0.5, time * 5 + id);
    streaks.push(LP.x, LP.y, LP.z, LBACK.x, LBACK.y, LBACK.z, size * 0.3 * far, size * 0.3 * far, STREAK.orb, colour, 0.45, time * 3 + id);
  }
}

const MAX_BATCH = 48;

/**
 * Every plain hull of one model (kind and faction) in one set of draws: an
 * InstancedMesh per material, so twenty scouts cost what one does. Hulls that
 * need their own state (a cloak fading its materials, an elite's halo) stay
 * a HullView. A hit flash moves the hull to a second set drawn in the flash
 * material for the few frames it lasts.
 */
class HullBatch {
  private readonly sets: InstancedMesh[][];
  private readonly counts = [0, 0];
  constructor(scene: Scene, readonly model: Model, readonly colour: Color) {
    const src = model.root.children as Mesh[];
    this.sets = [0, 1].map((flash) => src.map((m) => {
      const im = new InstancedMesh(m.geometry, flash ? FLASH : (m.material as Material), MAX_BATCH);
      im.count = 0;
      im.castShadow = im.receiveShadow = true;
      im.visible = false;
      // drawn from the origin's bounding sphere otherwise: cull nothing, as the streaks do
      im.frustumCulled = false;
      scene.add(im);
      return im;
    }));
  }

  begin(): void {
    this.counts[0] = this.counts[1] = 0;
  }

  /** Place one hull. False when the batch is full (the hull is simply not drawn). */
  add(m: Matrix4, flash: boolean): boolean {
    const k = flash ? 1 : 0, i = this.counts[k]!;
    if (i >= MAX_BATCH) return false;
    for (const im of this.sets[k]!) im.setMatrixAt(i, m);
    this.counts[k] = i + 1;
    return true;
  }

  end(): void {
    for (const k of [0, 1]) {
      for (const im of this.sets[k]!) {
        im.count = this.counts[k]!;
        im.visible = im.count > 0;
        im.instanceMatrix.needsUpdate = true;
      }
    }
  }

  /** Throwaway instanced meshes on the same materials, for compiling their programs ahead of play. */
  gallery(): InstancedMesh[] {
    return this.sets.flat().map((im) => {
      const w = new InstancedMesh(im.geometry, im.material, 1);
      w.frustumCulled = false;
      return w;
    });
  }
}


export class EnemyView {
  private readonly models = new Map<string, Model>();
  private readonly capitals = new Map<string, Model>();
  private readonly pools = new Map<string, HullView[]>();
  private readonly live = new Map<number, HullView>();
  private readonly batches = new Map<string, HullBatch>();
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly e = new Euler();
  private readonly p = new Vector3();
  private readonly sc = new Vector3();
  private readonly beams: Mesh[] = [];
  private readonly webs: LineSegments[] = [];
  /** The capital ships on show: one in a fight, five in the review world. */
  private readonly bossViews = new Map<number, { root: Group; hull: HullView; mats: Material[] }>();
  private readonly c = new Color();
  private time = 0;
  /** The camera's position, for distance-aware glow sizes. */
  readonly eye = new Vector3();

  constructor(private readonly scene: Scene, private readonly glowTex: Texture, private readonly streaks: Streaks) {
    for (let i = 0; i < 8; i++) {
      const b = new Mesh(new BoxGeometry(1, 1, 1).translate(0.5, 0, 0), new MeshBasicMaterial({ color: NEON.voice.clone(), transparent: true, blending: AdditiveBlending, depthWrite: false }));
      b.visible = false;
      scene.add(b);
      this.beams.push(b);
    }
    const webGeo = webGeometry();
    for (let i = 0; i < 12; i++) {
      const w = new LineSegments(webGeo, new LineBasicMaterial({ color: WEB.clone(), transparent: true, toneMapped: false }));
      w.visible = false;
      scene.add(w);
      this.webs.push(w);
    }
  }

  /**
   * One of every hull, and the hit flash, for warming the shaders up before
   * a run: a program compiled mid-fight is a stall on a phone.
   */
  gallery(): Group {
    const g = new Group();
    for (const kind of ALIEN_ORDER) {
      const f = ALIEN_TYPES[kind].faction;
      g.add(new HullView(kind, this.model(kind, f), this.glowTex, NEON[f]).root);
    }
    g.add(new Mesh(new BoxGeometry(1, 1, 1), FLASH));
    for (const kind of ALIEN_ORDER) g.add(...this.batch(kind, ALIEN_TYPES[kind].faction).gallery());
    return g;
  }

  /** A capital ship's hull: the fighter's design in finer plating, built the first time one arrives. */
  private capitalModel(kind: AlienKind, faction: Faction): Model {
    const key = `${kind}:${faction}`;
    let m = this.capitals.get(key);
    if (!m) {
      const design = designFor(kind, faction);
      m = design ? { root: design.k.build(factionMaterials(faction, CAPITAL_GRAIN), 0.04), engines: design.engines, lamps: design.lamps } : this.model(kind, faction);
      this.capitals.set(key, m);
    }
    return m;
  }

  private model(kind: AlienKind, faction: Faction): Model {
    const key = `${kind}:${faction}`;
    let m = this.models.get(key);
    if (!m) { m = build(kind, faction); this.models.set(key, m); }
    return m;
  }

  private batch(kind: AlienKind, faction: Faction): HullBatch {
    const key = `${kind}:${faction}`;
    let b = this.batches.get(key);
    if (!b) { b = new HullBatch(this.scene, this.model(kind, faction), NEON[faction]); this.batches.set(key, b); }
    return b;
  }

  private take(al: Alien): HullView {
    const key = `${al.kind}:${al.faction}:${al.canCloak ? 1 : 0}`;
    let pool = this.pools.get(key);
    if (!pool) { pool = []; this.pools.set(key, pool); }
    const v = pool.pop() ?? new HullView(key, this.model(al.kind, al.faction), this.glowTex, NEON[al.faction], al.canCloak);
    this.scene.add(v.root);
    return v;
  }

  update(aliens: readonly Alien[], bosses: readonly Boss[], shots: readonly Shot[], webs: readonly Web[], alpha: number, dt: number): void {
    this.time += dt;
    const back = (1 - alpha) * STEP;

    // plain hulls: batched per model. Cloakers and elites keep a view of their own.
    for (const b of this.batches.values()) b.begin();
    const seen = new Set<number>();
    for (const al of aliens) {
      const plain = !al.canCloak && !al.elite;
      this.p.set(al.x - al.vx * back, al.y - al.vy * back, al.z - al.vz * back);
      if (al.kind === 'drone') {
        this.e.set(0, this.time * 0.4 + al.id, 0);
      } else {
        // yaw, then pitch with the climb, then bank (and a jink's barrel roll)
        const hs = Math.hypot(al.vx, al.vz);
        const pitch = Math.atan2(al.vy, Math.max(4, hs)) * 0.8;
        const roll = al.roll >= 0 ? al.rollDir * Math.PI * 2 * smooth(al.roll / JINK_ROLL) : 0;
        this.e.set(al.bank + roll + Math.sin(this.time * 1.7 + al.id) * 0.04, al.face, pitch, 'YZX');
      }
      const burn = Math.min(1, Math.hypot(al.vx, al.vy, al.vz) / 30);
      // engines read from far off: the flare keeps a size on screen as the hull shrinks with distance
      const far = Math.min(2.4, Math.sqrt(Math.max(1, this.p.distanceTo(this.eye) / 40)));
      if (plain) {
        const batch = this.batch(al.kind, al.faction);
        this.m.compose(this.p, this.q.setFromEuler(this.e), this.sc.setScalar(al.r));
        batch.add(this.m, al.hitT > 0);
        lights(this.streaks, this.m, batch.model, batch.colour, al.r, burn, this.time, al.id, far);
        continue;
      }
      seen.add(al.id);
      let v = this.live.get(al.id);
      if (!v) { v = this.take(al); this.live.set(al.id, v); }
      v.root.position.copy(this.p);
      v.root.scale.setScalar(al.r);
      v.body.rotation.copy(this.e);
      v.flash(al.hitT > 0 && al.cloak < 0.5);
      v.cloak(al.cloak, this.time + al.id);
      v.halo.visible = !!al.elite && al.cloak < 0.5;
      if (al.elite) {
        (v.halo.material as SpriteMaterial).color.copy(ELITE_GLOW[al.elite]).multiplyScalar(al.elite === 'volatile' ? 0.22 + 0.12 * Math.sin(this.time * 12) : 0.24);
        v.halo.scale.setScalar(2.6 + Math.sin(this.time * 3 + al.id) * 0.15);
      }
      v.flare(this.streaks, al.r, burn, this.time, al.id, far);
    }
    for (const b of this.batches.values()) b.end();
    for (const [id, v] of this.live) {
      if (seen.has(id)) continue;
      v.root.removeFromParent();
      this.pools.get(v.key)!.push(v);
      this.live.delete(id);
    }

    // the capital ships
    for (const [id, bv] of this.bossViews) {
      if (bosses.some((b) => b.id === id)) continue;
      bv.root.removeFromParent();
      this.bossViews.delete(id);
    }
    for (const boss of bosses) {
      const bv = this.bossViews.get(boss.id) ?? this.makeBoss(boss);
      bv.root.position.set(boss.x - boss.vx * back, boss.y - boss.vy * back, boss.z - boss.vz * back);
      const pitch = boss.arriving ? Math.atan2(boss.vy, Math.max(6, Math.hypot(boss.vx, boss.vz))) * 0.5 : 0;
      bv.hull.body.rotation.set(Math.sin(this.time * 0.6) * 0.03, boss.face, pitch, 'YZX');
      if (boss.faction === 'voice') bv.hull.body.rotation.y = this.time * 0.15;
      const vis = 1 - boss.cloak * 0.92;
      for (const m of bv.mats) { m.opacity = vis; m.transparent = vis < 1; }
      bv.hull.flaring = boss.cloak < 0.6;
      bv.hull.flare(this.streaks, boss.r * 0.85, 0.5, this.time, boss.id, 1);
      bv.hull.flash(boss.hitT > 0);
    }

    // enemy fire: a hot slug in a glow of its faction's colour; plasma is a pulsing orb
    for (const b of shots) {
      const plasma = b.hp > 0, r = plasma ? b.r * (1.1 + Math.sin(this.time * 14 + b.id) * 0.15) : b.r;
      this.c.copy(NEON[b.faction]).multiplyScalar(plasma ? 0.7 : 0.55);
      this.streaks.push(b.x - b.vx * back, b.y - b.vy * back + 0.1, b.z - b.vz * back, b.vx, b.vy, b.vz,
        plasma ? r * 4.2 : r * 7, plasma ? r * 3.2 : r * 2.6, plasma ? STREAK.orb : STREAK.slug, this.c, plasma ? 1.2 : 0.9, this.time * 2 + b.id * 0.31);
    }

    // beams: a thin telegraph while winding up, then the cut
    const bms = [
      ...aliens.filter((a) => a.beamT > 0).map((a) => ({ x: a.x, y: a.y, z: a.z, beamT: a.beamT, beamAng: a.beamAng })),
      ...bosses.flatMap((boss) => boss.beams.filter((b) => b.beamT > 0).map((b) => ({ ...b, y: boss.y }))),
    ];
    this.beams.forEach((mesh, i) => {
      const b = bms[i];
      mesh.visible = !!b;
      if (!b) return;
      const live = b.beamT <= BEAM_FIRE;
      const w = live ? 0.55 + Math.sin(this.time * 40) * 0.08 : 0.08;
      mesh.position.set(b.x, b.y + 0.2, b.z);
      mesh.rotation.set(0, b.beamAng, 0);
      mesh.scale.set(BEAM_LEN, w, w);
      (mesh.material as MeshBasicMaterial).opacity = live ? 1 : 0.45;
    });

    // webs
    this.webs.forEach((mesh, i) => {
      const w = webs[i];
      mesh.visible = !!w && w.r > 0.1;
      if (!w) return;
      mesh.position.set(w.x, 0.05, w.z);
      mesh.scale.setScalar(w.r);
      mesh.rotation.y = this.time * 0.3 + w.id;
      (mesh.material as LineBasicMaterial).opacity = Math.min(1, w.life);
    });

  }

  private makeBoss(b: Boss) {
    const kind = { gutter: 'raptor', custody: 'lancer', office: 'warbird', voice: 'drone', thren: 'weaver' }[b.faction] as AlienKind;
    const model = this.capitalModel(kind, b.faction);
    // its own materials, so the cloak can fade them
    const own: Model = { root: model.root.clone(), engines: model.engines, lamps: model.lamps };
    const mats: Material[] = [];
    for (const m of own.root.children as Mesh[]) { m.material = (m.material as Material).clone(); mats.push(m.material); }
    const hull = new HullView(kind, own, this.glowTex, NEON[b.faction]);
    hull.root.scale.setScalar(b.r * 0.85);
    const root = new Group();
    root.add(hull.root);
    this.scene.add(root);
    const view = { root, hull, mats };
    this.bossViews.set(b.id, view);
    return view;
  }
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}

/** A Thren web of unit radius: three rings and eight spokes. */
function webGeometry(): BufferGeometry {
  const pts: number[] = [];
  for (const r of [0.35, 0.68, 1]) {
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, 0, Math.sin(a0) * r, Math.cos(a1) * r, 0, Math.sin(a1) * r);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pts.push(0, 0, 0, Math.cos(a), 0, Math.sin(a));
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}
