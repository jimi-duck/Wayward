import {
  CylinderGeometry, OctahedronGeometry,
  AdditiveBlending, NormalBlending, BoxGeometry, BufferAttribute, Color, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector3, type BufferGeometry, type Material, type Scene, type Texture,
} from 'three';
import { FEATURES, type FeatureDef } from '../content/features';
import { clamp } from '../core/math';
import type { Feature, Space } from '../sim/space';
import { designFor } from './hulls';
import { lavaRock, rockGeometry } from './rocks';
import { metal } from './kit';
import { cloudTexture, curtainTexture, streamTexture } from './textures';
import { buoyModel, haulerModel, relicModel, RELIC_TOP, slipwayModel } from './monuments';
import { singularity } from './singularity';

// ── the shared world, drawn ───────────────────────────────────────────────
// Reads sim/space.ts and builds a look for each feature that is near enough
// to matter; nothing here feeds back. The camera stands low with the horizon
// high, so a feature on the plane a few thousand units off sits on the
// horizon as a large, soft shape: that is its far look, and it is the whole
// reason to turn toward it. Drawn as additive sprites at their real places
// (so they have real parallax), faded in over the last quarter of their
// range and thinned as the ship goes in, where the murk and the tint
// (Environment.weather) do the work instead.
//
// Stages 2 and 4 of docs/ENVIRONMENT.md. Air (veil, shroud, curtain, static,
// storm) and the far features (passage, carrier) are sprites alone. Matter
// (rubble, hulks, the slipway, the relic, the well) is also solid: real dark
// meshes, built only when the ship is within a few hundred units and put
// away again after, so a feature costs nothing until it is near. Nothing
// else in the scene changes.

const MAX_SPRITES = 220;

interface Piece {
  s: Sprite;
  /** Offset from the feature's centre, and the opacity it has at full strength. */
  x: number; y: number; z: number;
  a: number;
  /** Sway and drift: phase, and how far it wanders. */
  ph: number;
  w: number;
  /** Blinks at this rate (radians a second), if it does. */
  b?: number;
  /** Turns this fast (radians a second), if it does: layers of a stream pass each other. */
  spin?: number;
  /** Drifts along x at this speed and wraps within the feature: matter carried by the flow. */
  flow?: number;
  rot0?: number;
}

interface Look {
  f: Feature;
  root: Group;
  pieces: Piece[];
  tint: Color;
  /** The solid part, built when the ship is near: its meshes' spin, and the group they hang from. */
  solid?: { group: Group; spin: Array<{ m: Mesh; x: number; y: number; z: number }>; rings: Mesh[]; face: boolean; flow?: Array<{ m: Mesh; v: number; z0: number }> };
  near: boolean;
}

/** How close, from the rim, before the solid part is put up. */
const SOLID_RANGE = 700;

const CHUNKS: BufferGeometry[] = [];
function chunk(i: number): BufferGeometry {
  // the same shaped, cratered rock as the field's, so rubble and hulks' debris are not bare polyhedra
  if (!CHUNKS.length) for (let k = 0; k < 4; k++) CHUNKS.push(rockGeometry(k * 4.1 + 60, 3, 1 + (k % 2), 0.4, 3 + (k % 3)));
  return CHUNKS[i % CHUNKS.length]!;
}
const BOX = new BoxGeometry(1, 1, 1);
const FRAGMENT = new OctahedronGeometry(1, 0);
const FRAGMENT_MAT = new MeshStandardMaterial({ color: new Color(0.1, 0.06, 0.16), emissive: new Color(0.14, 0.05, 0.26), emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.25, flatShading: true });
const ROCK_MAT = lavaRock(2.6, 1, 0.07, undefined, false);
const HULL_MAT = new MeshStandardMaterial({ color: 0x6a7480, roughness: 0.6, metalness: 0.3, flatShading: true, emissive: 0x0a1016, envMapIntensity: 1.3 });
const SLAB_MAT = new MeshStandardMaterial({ color: 0x34404e, roughness: 0.32, metalness: 0.55, emissive: 0x05090e, envMapIntensity: 1.3 });
const CORE_MAT = new MeshBasicMaterial({ color: 0x000000 });
const SEAM_MAT = new MeshBasicMaterial({ color: new Color(0.35, 0.8, 1.1), toneMapped: false, fog: false });

// the dead: hull models from the same designs the fleets fly, gone cold, scorched and breached
let dead: Record<string, Material> | null = null;
function deadMaterials(): Record<string, Material> {
  if (dead) return dead;
  // a dead hull is drawn thirty or fifty units long on a model one unit long, so the plating is cut fine: panels, not slabs
  const coat = { painted: true, worn: 0.55, roughness: 0.74, metalness: 0.35, emissive: new Color(0.014, 0.016, 0.022) }, grain = 3;
  const cold = new MeshBasicMaterial({ color: new Color(0.9, 0.22, 0.06), toneMapped: false });
  dead = {
    hull: metal({ ...coat, tint: 0x34353a, scale: 1.6 * grain }), paint: metal({ ...coat, tint: 0x5a5750, scale: 1.2 * grain }), patch: metal({ ...coat, tint: 0x6a6458, scale: 0.9 * grain }),
    dark: metal({ ...coat, tint: 0x24262a, scale: 1.8 * grain }), trim: metal({ ...coat, tint: 0x4e403a, scale: 0.9 * grain }), glow: new MeshBasicMaterial({ color: 0x050505 }),
    lamp: cold, crystal: metal({ ...coat, tint: 0x3c3628, scale: 0.9 * grain }), violet: new MeshBasicMaterial({ color: 0x0a0610 }),
  };
  return dead;
}
const HULKS: Array<[Parameters<typeof designFor>[0], Parameters<typeof designFor>[1]]> = [['lancer', 'custody'], ['raptor', 'gutter'], ['warbird', 'office'], ['drone', 'voice'], ['freighter', 'custody']];
const hulkModels = new Map<number, Group>();
/** A dead hull of unit radius: one of the five designs, each built once. */
export function hulkModel(i: number): Group {
  let g = hulkModels.get(i % HULKS.length);
  if (!g) {
    const [kind, faction] = HULKS[i % HULKS.length]!;
    g = designFor(kind, faction)!.k.build(deadMaterials(), 0.09);
    hulkModels.set(i % HULKS.length, g);
  }
  return g.clone();
}

/** A square bar from a to b, for gantry work. */
function bar(parent: Group, mat: Material, a: Vector3, b: Vector3, t: number): void {
  const m = new Mesh(BOX, mat as MeshStandardMaterial);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.scale.set(t, t, a.distanceTo(b));
  m.lookAt(b);
  parent.add(m);
}

const rand = (seed: number) => {
  let s = (seed >>> 0) % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

const wrap = (v: number, m: number) => ((v % m) + m) % m;
const smooth = (x: number) => { const k = clamp(x, 0, 1); return k * k * (3 - 2 * k); };

/**
 * Paint and build what a feature needs the first time it comes near, now, behind the title: the seam's stream
 * textures, the rubble's rock shapes and the five hulks. Left to the first sighting each cost a frame of 35 to
 * 80 ms on a fast machine. Each is built once, so asking again is free.
 */
export function prepareSpace(): void {
  streamTexture(1); streamTexture(2);
  chunk(0);
  for (let i = 0; i < HULKS.length; i++) hulkModel(i);
  relicModel(); slipwayModel(); buoyModel(); haulerModel();
}

export class SpaceView {
  private readonly looks = new Map<number, Look>();
  private readonly group = new Group();
  private sprites = 0;
  private time = 0;
  private dt = 0;

  constructor(scene: Scene, private readonly glow: Texture) {
    scene.add(this.group);
  }

  /** Put up what has come into range, take down what has left, and place the lot. `cx`, `cz` is where the camera looks. */
  update(space: Space | null, cx: number, cz: number, dt: number, still: boolean): void {
    this.time += dt;
    this.dt = dt;
    this.group.visible = !!space;
    if (!space) return;
    const live = new Set<number>();
    for (const f of space.features) {
      const def = FEATURES[f.def];
      const far = def.layer === 'far';
      const d = far ? 0 : Math.hypot(f.x - cx, f.z - cz);
      if (!far && d - f.r > def.look.far) continue;
      live.add(f.n);
      let look = this.looks.get(f.n);
      if (!look) {
        look = this.build(f, def) ?? undefined;
        if (!look) continue;
        this.looks.set(f.n, look);
      }
      this.place(look, def, d, cx, cz, still);
    }
    for (const [n, look] of this.looks) {
      if (live.has(n)) continue;
      this.drop(look);
      this.looks.delete(n);
    }
  }

  // ── building ────────────────────────────────────────────────────────

  private build(f: Feature, def: FeatureDef): Look | null {
    const r = rand(f.seed);
    const tint = new Color(def.look.tint[0], def.look.tint[1], def.look.tint[2]);
    const root = new Group();
    const pieces: Piece[] = [];
    const add = (map: Texture, colour: Color, scaleX: number, scaleY: number, x: number, y: number, z: number, a: number, rot = 0, dark = false) => {
      if (this.sprites >= MAX_SPRITES) return;
      const s = new Sprite(new SpriteMaterial({ map, color: colour, blending: dark ? NormalBlending : AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0, rotation: rot, toneMapped: false }));
      s.scale.set(scaleX, scaleY, 1);
      s.frustumCulled = false;
      s.renderOrder = dark ? -2 : -1;
      root.add(s);
      this.sprites++;
      pieces.push({ s, x, y, z, a, ph: r() * Math.PI * 2, w: 0.5 + r() });
    };
    switch (def.look.shape) {
      case 'cloud': case 'haze': {
        // a bank: blobs of dust at different heights, lit warmer toward the middle
        const n = def.look.shape === 'cloud' ? 8 : 5, murk = def.id === 'shroud' ? 0.85 : def.id === 'storm' ? 0.6 : 0.4;
        // the body of the cloud: dark, dense dust that eats the stars behind it, in layers of different height
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.6;
          add(cloudTexture(), tint.clone().multiplyScalar(0.07), f.r * (0.7 + r() * 0.6), f.r * (0.4 + r() * 0.3), Math.cos(a) * k, 2 + r() * 12, Math.sin(a) * k, murk * (0.5 + r() * 0.4), r() * Math.PI * 2, true);
        }
        // lit from within and from the side: warm cores toward the middle, thin bright edges high up, each blob its own tilt
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.62, core = 1 - k / (f.r * 0.62);
          const c = tint.clone().multiplyScalar(1.5 + r() * 0.8 + core * 1.1);
          add(cloudTexture(), c, f.r * (0.55 + r() * 0.5), f.r * (0.3 + r() * 0.25), Math.cos(a) * k, 14 + r() * 40, Math.sin(a) * k, 0.38 + r() * 0.25, r() * Math.PI * 2);
        }
        // a few small bright knots: the grain that shows scale and gives the light somewhere to live
        for (let i = 0; i < 4; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.45;
          add(this.glow, tint.clone().multiplyScalar(4 + r() * 3), f.r * 0.12, f.r * 0.12, Math.cos(a) * k, 10 + r() * 30, Math.sin(a) * k, 0.45);
          if (def.id === 'storm') pieces[pieces.length - 1]!.b = 1.5 + r() * 3;
        }
        // fine dust carried through it at different depths and speeds, a few catching the light: this is what shows it has volume
        for (let i = 0; i < 12; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.6, z = 1.2 + r() * 2.4;
          add(this.glow, tint.clone().multiplyScalar(3 + r() * 4), z, z, Math.cos(a) * k, 6 + r() * 40, 0, 0.3 + r() * 0.35);
          const q = pieces[pieces.length - 1]!;
          q.b = 0.25 + r() * 0.9;
          q.flow = 2 + r() * 7;
          q.z = Math.sin(a) * k;
        }
        break;
      }
      case 'ribbon': {
        // an aurora: folds of curtain strung along a slow curve, in two layers so the near one crosses the far one
        const along = r() * Math.PI * 2, n = 22;
        for (let layer = 0; layer < 2; layer++) {
          for (let i = 0; i < n; i++) {
            const u = (i / (n - 1) - 0.5) * 2, bow = (1 - u * u) * f.r * (0.25 + layer * 0.12);
            const shade = layer ? new Color(0.1, 0.5, 0.75) : tint.clone().multiplyScalar(1);
            const c = shade.multiplyScalar((layer ? 2.6 : 3.4 + r()) * (0.5 + 0.9 * Math.abs(Math.sin(i * 1.7 + layer * 2.1))));
            const x = Math.cos(along) * u * f.r + Math.cos(along + Math.PI / 2) * bow, z = Math.sin(along) * u * f.r + Math.sin(along + Math.PI / 2) * bow;
            const h = f.r * (0.9 + r() * 0.9);
            add(curtainTexture(1 + ((i + layer) % 3)), c, f.r * (0.13 + r() * 0.08), h, x, f.r * (0.45 + r() * 0.2 + layer * 0.1), z, 0.3 + r() * 0.2);
            pieces[pieces.length - 1]!.b = 0.12 + r() * 0.3;
          }
        }
        break;
      }
      case 'convoy': {
        // a column of haulers, far off: each a real small ship with a lit window row and its drive, a thin lit line behind them
        const w = tint.clone().multiplyScalar(5);
        add(this.glow, tint.clone().multiplyScalar(0.5), 520, 5, 0, 0, 0, 0.35);
        for (let i = 0; i < 9; i++) {
          const ship = haulerModel(), len = 26 + r() * 8;
          ship.scale.setScalar(len);
          ship.position.set((i - 4) * 60 + (r() - 0.5) * 8, (r() - 0.5) * 6, (r() - 0.5) * 20);
          ship.rotation.y = (r() - 0.5) * 0.08;
          ship.traverse((o) => { o.renderOrder = -3; o.frustumCulled = false; });
          root.add(ship);
          add(this.glow, w, 9, 9, ship.position.x + len * 0.5, ship.position.y + 1, ship.position.z, 0.6);
        }
        break;
      }
      case 'rubble': case 'hulks': case 'frame': case 'slab': case 'lens': {
        // far: a faint glint where it is; near: the solid part (below)
        add(this.glow, tint.clone().multiplyScalar(3), f.r * 1.2, f.r * 0.5, 0, 12, 0, 0.18);
        // the well bends light: a halo round its dark centre
        if (def.look.shape === 'lens') add(this.glow, tint.clone().multiplyScalar(3), f.r * 0.3, f.r * 0.3, 0, 3, 0, 0.4);
        break;
      }
      case 'buoys': {
        // a line of lamps, a few hundred metres apart, each on its own beat
        const along = r() * Math.PI * 2, n = 9;
        for (let i = 0; i < n; i++) {
          const u = (i / (n - 1) - 0.5) * 2;
          add(this.glow, tint.clone().multiplyScalar(7), 11, 11, Math.cos(along) * u * f.r, 5, Math.sin(along) * u * f.r, 0.9);
          pieces[pieces.length - 1]!.b = 0.9 + r() * 0.5;
        }
        break;
      }
      case 'veins': {
        // violet glints in dark rock, slow
        for (let i = 0; i < 16; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.8, z = 0.8 + r() * 1.8;
          add(this.glow, tint.clone().multiplyScalar(5 + r() * 3), z, z, Math.cos(a) * k, 2 + r() * 6, Math.sin(a) * k, 0.5 + r() * 0.4);
          pieces[pieces.length - 1]!.b = 0.4 + r() * 0.9;
        }
        // the Krail stream: a dark body that eats the stars, then lit strands in layers at their own depth and sway, running across the view
        add(streamTexture(1), tint.clone().multiplyScalar(0.06), f.r * 1.7, f.r * 0.55, 0, 4, 0, 0.6, 0, true);
        for (let i = 0; i < 5; i++) {
          const c = new Color(0.34, 0.2, 0.62).lerp(new Color(0.24, 0.3, 0.7), r()).multiplyScalar(0.9 + r() * 0.8);
          add(streamTexture(1 + (i % 2)), c, f.r * (1.0 + r() * 0.6), f.r * (0.3 + r() * 0.2), (r() - 0.5) * f.r * 0.5, 4 + i * 3, (r() - 0.5) * f.r * 0.5, 0.34 - i * 0.03, (r() - 0.5) * 0.3);
          const q = pieces[pieces.length - 1]!;
          q.spin = 0.05 + r() * 0.08;
          q.rot0 = q.s.material.rotation;
        }
        // carried along the flow: bright motes at different depths and speeds, a few drifting mineral fragments
        for (let i = 0; i < 26; i++) {
          const k = r(), z = 0.5 + r() * 1.4;
          add(this.glow, new Color(0.55, 0.35, 1.0).lerp(new Color(0.4, 0.6, 1.0), r()).multiplyScalar(2.5 + r() * 3), z, z, (r() - 0.5) * f.r * 0.5, 2 + k * 14, (r() - 0.5) * f.r * 1.6, 0.35 + r() * 0.4);
          const q = pieces[pieces.length - 1]!;
          q.b = 0.3 + r() * 1.2;
          q.flow = (4 + k * 14) * (r() < 0.8 ? 1 : -0.5);
        }
        break;
      }
      case 'signal': {
        // a pulse on a bearing, with nothing behind it yet
        add(this.glow, tint.clone().multiplyScalar(8), 34, 34, 0, 0, 0, 0.9);
        pieces[pieces.length - 1]!.b = 1.05;
        add(this.glow, tint.clone().multiplyScalar(2), 150, 150, 0, 0, 0, 0.35);
        break;
      }
    }
    if (!pieces.length) return null;
    this.group.add(root);
    return { f, root, pieces, tint, near: false };
  }

  /** The solid part of matter: dark meshes, built once the ship is near. */
  private raise(look: Look, def: FeatureDef): void {
    const f = look.f, r = rand(f.seed + 5), g = new Group(), spin: NonNullable<Look['solid']>['spin'] = [], rings: Mesh[] = [], flow: Array<{ m: Mesh; v: number; z0: number }> = [];
    let face = false;
    const mesh = (geo: BufferGeometry, mat: MeshStandardMaterial | MeshBasicMaterial, parent: Group, x: number, y: number, z: number, sx: number, sy: number, sz: number, tumble = 0) => {
      const m = new Mesh(geo, mat);
      m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      m.rotation.set(r() * 6, r() * 6, r() * 6);
      parent.add(m);
      if (tumble) spin.push({ m, x: (r() - 0.5) * tumble, y: (r() - 0.5) * tumble, z: (r() - 0.5) * tumble });
      return m;
    };
    switch (def.look.shape) {
      case 'rubble':
        // loose blocks where something large broke up
        for (let i = 0; i < 26; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.85, s = 3 + Math.pow(r(), 2) * 13;
          mesh(chunk(i), ROCK_MAT, g, Math.cos(a) * k, (r() - 0.5) * 8, Math.sin(a) * k, s, s * (0.6 + r() * 0.5), s * (0.7 + r() * 0.5), 0.12);
        }
        break;
      case 'hulks':
        // dead ships: the fleets' own hulls, cold, one lamp that has not quite died, a torn half drifting off each
        for (let i = 0; i < 5; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.8, hull = new Group(), L = 26 + r() * 30;
          hull.position.set(Math.cos(a) * k, (r() - 0.5) * 6, Math.sin(a) * k);
          const body = hulkModel(i + Math.floor(r() * 5));
          body.scale.setScalar(L * 0.5);
          hull.add(body);
          // wreckage: bent plates and a spar that came away
          for (let j = 0; j < 5; j++) mesh(BOX, HULL_MAT, hull, (r() - 0.5) * L, (r() - 0.5) * L * 0.4, (r() - 0.5) * L * 0.8, 1.2 + r() * 4, 0.3, 1 + r() * 3.5);
          bar(hull, HULL_MAT, new Vector3(-L * 0.2, 1, 0), new Vector3(-L * 0.9, 5 + r() * 6, (r() - 0.5) * 12), 0.5);
          hull.rotation.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6);
          g.add(hull);
          spin.push({ m: hull as unknown as Mesh, x: 0.01, y: (r() - 0.5) * 0.08, z: 0.01 });
        }
        break;
      case 'frame': {
        // a slipway: lattice gantry towers on rails with decks and working lamps, a crane across the top, and an unfinished hull on the stocks
        g.add(slipwayModel());
        g.rotation.y = r() * 6;
        break;
      }
      case 'slab': {
        // the relic: a tower of twisted, tapering sections of dark stone, cold light in the joints and down each face, and a shard hanging above it, turning
        face = true;
        const relic = relicModel();
        g.add(relic);
        const y0 = RELIC_TOP;
        const shard = mesh(new OctahedronGeometry(1, 0), SLAB_MAT, g, 0, y0 + 14, 0, 4.2, 9, 4.2);
        spin.push({ m: shard, x: 0, y: 0.35, z: 0 });
        mesh(new OctahedronGeometry(1, 0), SEAM_MAT, g, 0, y0 + 14, 0, 1.6, 3.6, 1.6);
        // three small shards turning slowly about the big one, on their own tilt
        const orbit = new Group();
        orbit.position.set(0, y0 + 14, 0);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2, s3 = 0.9 + r() * 0.8;
          mesh(new OctahedronGeometry(1, 0), SLAB_MAT, orbit, Math.cos(a) * 9, Math.sin(a * 2) * 3, Math.sin(a) * 9, s3, s3 * 2.2, s3);
        }
        g.add(orbit);
        spin.push({ m: orbit as unknown as Mesh, x: 0.02, y: 0.18, z: 0.02 });
        const halo = new Sprite(new SpriteMaterial({ map: this.glow, color: new Color(0.3, 0.8, 1.2), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.5 }));
        halo.scale.setScalar(24); halo.position.set(0, y0 + 14, 0); g.add(halo);
        for (let i = 0; i < 9; i++) {
          const a = r() * Math.PI * 2, k = 9 + r() * 14, s2 = 1.5 + r() * 4;
          mesh(chunk(i), ROCK_MAT, g, Math.cos(a) * k, s2 * 0.3, Math.sin(a) * k, s2, s2 * 0.6, s2);
        }
        break;
      }
      case 'buoys': {
        // the lanterns: each a small designed object riding where its lamp sprite is
        const along = rand(f.seed)() * Math.PI * 2;
        for (let i = 0; i < 9; i++) {
          const u = (i / 8 - 0.5) * 2, b = buoyModel();
          b.position.set(Math.cos(along) * u * f.r, 5, Math.sin(along) * u * f.r);
          b.rotation.set((r() - 0.5) * 0.2, r() * 6, (r() - 0.5) * 0.2);
          b.scale.setScalar(1.4);
          g.add(b);
        }
        break;
      }
      case 'veins': {
        // mineral fragments carried along the stream: small, angular, dark violet, tumbling as they drift
        for (let i = 0; i < 34; i++) {
          const s2 = 0.25 + Math.pow(r(), 2) * 1.1;
          const m = mesh(FRAGMENT, FRAGMENT_MAT, g, 0, 2 + r() * 14, 0, s2, s2 * (0.6 + r() * 0.9), s2 * (0.6 + r() * 0.6), 0.5);
          const z0 = (r() - 0.5) * f.r * 1.6;
          m.position.x = (r() - 0.5) * f.r * 0.6;
          flow.push({ m, v: 3 + r() * 9, z0 });
        }
        break;
      }
      case 'lens': {
        // a black hole: horizon, photon ring, tilted disc and its bent far side, all in one camera-facing quad
        const hole = singularity(f.r * 0.07, new Color(0.9, 0.45, 1.5).multiplyScalar(0.9));
        hole.position.y = 3;
        g.add(hole);
        break;
      }
      default:
        return;
    }
    g.position.set(0, 0, 0);
    look.root.add(g);
    look.solid = { group: g, spin, rings, face, flow };
  }

  private put(look: Look): void {
    if (look.solid) { look.root.add(look.solid.group); }
  }

  private drop(look: Look): void {
    if (look.solid) {
      for (const r of look.solid.rings) { r.geometry.dispose(); (r.material as MeshBasicMaterial).dispose(); }
      look.solid.group.removeFromParent();
    }
    for (const p of look.pieces) { p.s.material.dispose(); this.sprites--; }
    look.root.removeFromParent();
  }

  // ── placing ─────────────────────────────────────────────────────────

  private place(look: Look, def: FeatureDef, d: number, cx: number, cz: number, still: boolean): void {
    const f = look.f, t = this.time;
    const far = def.layer === 'far';
    // where the whole thing is: a far feature rides a bearing at a fixed range and slides slowly across the sky
    let ox = f.x, oz = f.z, fade: number;
    if (far) {
      const b = f.bearing + (still ? 0 : t * 0.0009 * (def.drift ?? 1));
      ox = cx + Math.cos(b) * 3300; oz = cz - Math.sin(b) * 3300;
      look.root.rotation.y = b + Math.PI / 2;
      fade = smooth(1 - Math.abs(Math.sin(f.bearing * 0.5 + t * 0.0006)) * 0.2);
    } else {
      const range = def.look.far, near = smooth((range - d) / (range * 0.28));
      // inside, the sprites thin out so the cloud is a place to be in and not a wall
      const inside = 0.22 + 0.78 * smooth((d - f.r * 0.1) / (f.r * 0.9));
      fade = near * inside;
    }
    look.root.position.set(ox, 0, oz);
    // matter is solid when the ship is near: raised then, put away after
    const near = !far && def.layer === 'matter' && d - f.r < SOLID_RANGE;
    if (near && !look.solid && !look.near) this.raise(look, def);
    if (near !== look.near) {
      look.near = near;
      if (look.solid) { if (near) this.put(look); else look.solid.group.removeFromParent(); }
    }
    if (near && look.solid) {
      const so = look.solid, dt = this.dt;
      if (!still) for (const sp of so.spin) { sp.m.rotation.x += sp.x * dt; sp.m.rotation.y += sp.y * dt; sp.m.rotation.z += sp.z * dt; }
      if (so.flow && !still) for (const fl of so.flow) fl.m.position.z = wrap(fl.z0 + fl.v * this.time + f.r * 0.8, f.r * 1.6) - f.r * 0.8;
      so.rings.forEach((rg, i) => { rg.rotation.z += dt * (0.5 - i * 0.2) * (i % 2 ? -1 : 1); });
      if (so.face) so.group.rotation.y = Math.atan2(cx - f.x, cz - f.z);
    }
    const sway = still ? 0 : 1;
    for (const p of look.pieces) {
      const swing = Math.sin(t * 0.12 * p.w + p.ph) * sway;
      const drift = p.flow && !still ? wrap(p.z + p.flow * t + f.r * 0.8, f.r * 1.6) - f.r * 0.8 : p.z;
      p.s.position.set(p.x + swing * 6, p.y + (def.look.shape === 'ribbon' ? Math.sin(t * 0.4 * p.w + p.ph) * sway * 8 : 0), drift);
      if (p.spin && p.rot0 !== undefined) p.s.material.rotation = p.rot0 + (still ? 0 : Math.sin(t * p.spin + p.ph) * 0.3);
      const blink = p.b ? 0.5 + 0.5 * Math.sin(t * p.b + p.ph) : 1;
      p.s.material.opacity = p.a * fade * f.level * blink;
    }
  }
}
