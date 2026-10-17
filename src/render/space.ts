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
import { cloudTexture, streamTexture } from './textures';

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
        break;
      }
      case 'ribbon': {
        // an aurora: tall ribbons strung along a slow curve
        const along = r() * Math.PI * 2, n = 22;
        for (let i = 0; i < n; i++) {
          const u = (i / (n - 1) - 0.5) * 2, bow = (1 - u * u) * f.r * 0.25;
          const c = tint.clone().multiplyScalar((6 + r() * 2) * (0.6 + 0.8 * Math.abs(Math.sin(i * 1.7))));
          const x = Math.cos(along) * u * f.r + Math.cos(along + Math.PI / 2) * bow, z = Math.sin(along) * u * f.r + Math.sin(along + Math.PI / 2) * bow;
          add(this.glow, c, f.r * (0.1 + r() * 0.07), f.r * (0.9 + r() * 0.9), x, f.r * (0.45 + r() * 0.2), z, 0.22 + r() * 0.16);
        }
        break;
      }
      case 'convoy': {
        // a mile of lit windows, far off: a dim bar and a row of points
        const w = tint.clone().multiplyScalar(5);
        add(this.glow, tint.clone().multiplyScalar(0.7), 520, 7, 0, 0, 0, 0.5);
        for (let i = 0; i < 16; i++) add(this.glow, w, 12, 12, (i - 7.5) * 30 + (r() - 0.5) * 8, (r() - 0.5) * 4, 0, 0.7 + r() * 0.3);
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
        // a slipway: two gantry towers on rails, a lattice bridge, and an unfinished hull in the cradle, ribs and keel with no skin
        const y = r() * 6, V = (x: number, yy: number, z: number) => new Vector3(x, yy, z);
        for (let i = 0; i < 11; i++) {
          const x = -36 + i * 7.2, h = 6 + Math.sin((i / 10) * Math.PI) * 8 * (i > 8 ? 0.4 : 1), w = 5 + Math.sin((i / 10) * Math.PI) * 5;
          bar(g, HULL_MAT, V(x, 5 - h * 0.3, -w), V(x, 5 + h * 0.8, -w * 0.7), 0.6);
          bar(g, HULL_MAT, V(x, 5 - h * 0.3, w), V(x, 5 + h * 0.8, w * 0.7), 0.6);
          bar(g, HULL_MAT, V(x, 5 + h * 0.8, -w * 0.7), V(x, 5 + h * 0.8, w * 0.7), 0.5);
          bar(g, HULL_MAT, V(x, 5 - h * 0.3, -w), V(x, 5 - h * 0.3, w), 0.5);
          if (i < 10) bar(g, HULL_MAT, V(x, 5, 0), V(x + 7.2, 5, 0), 1.1);
        }
        for (const s2 of [-1, 1]) for (const x of [-26, 26]) {
          const z = s2 * 22;
          bar(g, HULL_MAT, V(x - 3, -2, z - 3), V(x, 46, z), 1.2);
          bar(g, HULL_MAT, V(x + 3, -2, z - 3), V(x, 46, z), 1.2);
          for (let j = 0; j < 6; j++) bar(g, HULL_MAT, V(x - 2.4 + (j % 2) * 4.8, 4 + j * 7, z), V(x + 2.4 - (j % 2) * 4.8, 11 + j * 7, z), 0.4);
          mesh(BOX, HULL_MAT, g, x, -2, z, 9, 1.6, 9).rotation.set(0, 0, 0);
        }
        for (const x of [-26, 26]) bar(g, HULL_MAT, V(x, 46, -22), V(x, 46, 22), 1.4);
        bar(g, HULL_MAT, V(-26, 47, 0), V(26, 47, 0), 1.6);
        for (let j = 0; j < 9; j++) bar(g, HULL_MAT, V(-26 + j * 6.5, 46, 0), V(-26 + (j + 1) * 6.5, 50, 0), 0.4);
        // the hull on the stocks: a freighter's, cold, riding in the cradle between the ribs
        const keel = hulkModel(4);
        keel.scale.setScalar(30);
        keel.position.set(-2, 6, 0);
        g.add(keel);
        g.rotation.y = y;
        break;
      }
      case 'slab': {
        // the relic: a tower of twisted, tapering sections of dark stone, cold light in the joints and down each face, and a shard hanging above it, turning
        face = true;
        const seam = new MeshBasicMaterial({ color: new Color(0.35, 0.8, 1.1), toneMapped: false });
        let y0 = 0;
        for (let i = 0; i < 5; i++) {
          const RB = [9.5, 6.4, 8.2, 5.2, 6.4][i]!, rb = RB, rt = RB * (i % 2 ? 1.3 : 0.62), h = 17;
          const sec = mesh(new CylinderGeometry(rt, rb, h, 6, 1), SLAB_MAT, g, 0, y0 + h / 2, 0, 1, 1, 1);
          sec.rotation.set(0, i * 0.42, 0);
          // glyph strips down three of its faces
          for (let k = 0; k < 3; k++) {
            const a = i * 0.42 + (k / 3) * Math.PI * 2, rr = (rb + rt) / 2 * 0.87 + 0.12;
            const strip = mesh(BOX, seam, g, Math.cos(a) * rr, y0 + h / 2, Math.sin(a) * rr, 0.22, h * (0.5 + 0.12 * ((i + k) % 3)), 0.06);
            strip.rotation.set(0, Math.PI / 2 - a, 0);
          }
          y0 += h;
          if (i < 4) {
            const ring = mesh(new CylinderGeometry(rt * 0.92, [6.4, 8.2, 5.2, 6.4][i]! * 0.92, 1.2, 6, 1), seam, g, 0, y0 + 0.6, 0, 1, 1, 1);
            ring.rotation.set(0, (i + 0.5) * 0.42, 0);
            y0 += 1.2;
          }
        }
        const shard = mesh(new OctahedronGeometry(1, 0), SLAB_MAT, g, 0, y0 + 14, 0, 4.2, 9, 4.2);
        spin.push({ m: shard, x: 0, y: 0.35, z: 0 });
        mesh(new OctahedronGeometry(1, 0), seam, g, 0, y0 + 14, 0, 1.6, 3.6, 1.6);
        const halo = new Sprite(new SpriteMaterial({ map: this.glow, color: new Color(0.3, 0.8, 1.2), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.5 }));
        halo.scale.setScalar(24); halo.position.set(0, y0 + 14, 0); g.add(halo);
        for (let i = 0; i < 9; i++) {
          const a = r() * Math.PI * 2, k = 9 + r() * 14, s2 = 1.5 + r() * 4;
          mesh(chunk(i), ROCK_MAT, g, Math.cos(a) * k, s2 * 0.3, Math.sin(a) * k, s2, s2 * 0.6, s2);
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
        // a dark centre, a rim of light, rings turning
        const core = new Mesh(new SphereGeometry(1, 20, 14), CORE_MAT);
        core.scale.setScalar(f.r * 0.07); core.position.y = 3; g.add(core);
        // a photon ring hugging the dark, and a soft halo behind it that the core cuts a hole in
        const photon = new Mesh(new TorusGeometry(f.r * 0.073, f.r * 0.0035, 6, 96), new MeshBasicMaterial({ color: new Color(2.6, 1.8, 3.4), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
        photon.rotation.x = Math.PI / 2; photon.position.y = 3; g.add(photon); rings.push(photon);
        const halo = new Sprite(new SpriteMaterial({ map: this.glow, color: new Color(1.4, 0.7, 2.6), blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.55 }));
        halo.scale.setScalar(f.r * 0.5); halo.position.set(0, 3, 0); g.add(halo);
        for (let i = 0; i < 3; i++) {
          const ring = new Mesh(new TorusGeometry(f.r * (0.12 + i * 0.1), 0.35 + i * 0.15, 6, 72), new MeshBasicMaterial({ color: new Color(1.1 + i * 0.3, 0.5, 2.4 - i * 0.3), transparent: true, opacity: 0.45 - i * 0.1, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
          ring.rotation.x = Math.PI / 2; ring.position.y = 3; g.add(ring); rings.push(ring);
        }
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
