import {
  AdditiveBlending, BoxGeometry, BufferAttribute, Color, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, type BufferGeometry, type Scene, type Texture,
} from 'three';
import { FEATURES, type FeatureDef } from '../content/features';
import { clamp } from '../core/math';
import type { Feature, Space } from '../sim/space';
import { cloudTexture } from './textures';

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

const MAX_SPRITES = 140;

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
}

interface Look {
  f: Feature;
  root: Group;
  pieces: Piece[];
  tint: Color;
  /** The solid part, built when the ship is near: its meshes' spin, and the group they hang from. */
  solid?: { group: Group; spin: Array<{ m: Mesh; x: number; y: number; z: number }>; rings: Mesh[]; face: boolean };
  near: boolean;
}

/** How close, from the rim, before the solid part is put up. */
const SOLID_RANGE = 700;

const CHUNKS: BufferGeometry[] = [];
function chunk(i: number): BufferGeometry {
  if (!CHUNKS.length) {
    const r = rand(9);
    for (let k = 0; k < 4; k++) {
      const g = new IcosahedronGeometry(1, 0), p = g.getAttribute('position') as BufferAttribute;
      for (let v = 0; v < p.count; v++) p.setXYZ(v, p.getX(v) * (0.7 + r() * 0.5), p.getY(v) * (0.7 + r() * 0.5), p.getZ(v) * (0.7 + r() * 0.5));
      g.computeVertexNormals();
      CHUNKS.push(g);
    }
  }
  return CHUNKS[i % CHUNKS.length]!;
}
const BOX = new BoxGeometry(1, 1, 1);
const ROCK_MAT = new MeshStandardMaterial({ color: 0x24211f, roughness: 0.95, metalness: 0.15, flatShading: true });
const HULL_MAT = new MeshStandardMaterial({ color: 0x4a5058, roughness: 0.55, metalness: 0.5, flatShading: true });
const SLAB_MAT = new MeshStandardMaterial({ color: 0x07090b, roughness: 0.25, metalness: 0.8 });
const CORE_MAT = new MeshBasicMaterial({ color: 0x000000 });

const rand = (seed: number) => {
  let s = (seed >>> 0) % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

const smooth = (x: number) => { const k = clamp(x, 0, 1); return k * k * (3 - 2 * k); };

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
    const add = (map: Texture, colour: Color, scaleX: number, scaleY: number, x: number, y: number, z: number, a: number, rot = 0) => {
      if (this.sprites >= MAX_SPRITES) return;
      const s = new Sprite(new SpriteMaterial({ map, color: colour, blending: AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0, rotation: rot, toneMapped: false }));
      s.scale.set(scaleX, scaleY, 1);
      s.frustumCulled = false;
      s.renderOrder = -1;
      root.add(s);
      this.sprites++;
      pieces.push({ s, x, y, z, a, ph: r() * Math.PI * 2, w: 0.5 + r() });
    };
    switch (def.look.shape) {
      case 'cloud': case 'haze': {
        // a bank: blobs of dust at different heights, lit warmer toward the middle
        const n = def.look.shape === 'cloud' ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.62;
          const c = tint.clone().multiplyScalar(2.6 + r() * 1.2);
          add(cloudTexture(), c, f.r * (0.8 + r() * 0.7), f.r * (0.5 + r() * 0.35), Math.cos(a) * k, 8 + r() * 40, Math.sin(a) * k, 0.5 + r() * 0.3, r() * Math.PI * 2);
        }
        break;
      }
      case 'ribbon': {
        // an aurora: tall ribbons strung along a slow curve
        const along = r() * Math.PI * 2, n = 12;
        for (let i = 0; i < n; i++) {
          const u = (i / (n - 1) - 0.5) * 2, bow = (1 - u * u) * f.r * 0.25;
          const c = tint.clone().multiplyScalar(6 + r() * 2);
          const x = Math.cos(along) * u * f.r + Math.cos(along + Math.PI / 2) * bow, z = Math.sin(along) * u * f.r + Math.sin(along + Math.PI / 2) * bow;
          add(this.glow, c, f.r * 0.5, f.r * (0.8 + r() * 0.5), x, f.r * 0.4, z, 0.3 + r() * 0.14);
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
        if (def.look.shape === 'lens') add(this.glow, tint.clone().multiplyScalar(6), f.r * 0.3, f.r * 0.3, 0, 3, 0, 0.55);
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
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.8, z = 3 + r() * 7;
          add(this.glow, tint.clone().multiplyScalar(6 + r() * 3), z, z, Math.cos(a) * k, 2 + r() * 6, Math.sin(a) * k, 0.5 + r() * 0.4);
          pieces[pieces.length - 1]!.b = 0.4 + r() * 0.9;
        }
        add(cloudTexture(), tint.clone().multiplyScalar(2), f.r * 1.4, f.r * 0.8, 0, 6, 0, 0.3);
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
    const f = look.f, r = rand(f.seed + 5), g = new Group(), spin: NonNullable<Look['solid']>['spin'] = [], rings: Mesh[] = [];
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
        // dead ships: a long hull, a stub of a spar, a dim lamp that has not quite died
        for (let i = 0; i < 5; i++) {
          const a = r() * Math.PI * 2, k = Math.sqrt(r()) * f.r * 0.8, hull = new Group(), L = 30 + r() * 40;
          hull.position.set(Math.cos(a) * k, (r() - 0.5) * 6, Math.sin(a) * k);
          mesh(BOX, HULL_MAT, hull, 0, 0, 0, L, 6 + r() * 5, 8 + r() * 6).rotation.set(0, 0, 0);
          mesh(BOX, HULL_MAT, hull, L * 0.3, 4, 0, L * 0.3, 3, 4).rotation.set(0, 0, 0);
          mesh(BOX, HULL_MAT, hull, -L * 0.35, -2, 3, L * 0.25, 2, 9).rotation.set(0.2, 0.3, 0);
          hull.rotation.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6);
          g.add(hull);
          spin.push({ m: hull as unknown as Mesh, x: 0.01, y: (r() - 0.5) * 0.08, z: 0.01 });
        }
        break;
      case 'frame': {
        // a gantry over an unfinished hull
        const y = r() * 6;
        mesh(BOX, HULL_MAT, g, 0, 9, 0, 80, 9, 14).rotation.set(0, 0, 0);
        mesh(BOX, HULL_MAT, g, 30, 9, 0, 20, 7, 10).rotation.set(0, 0, 0);
        for (const x of [-24, 24]) {
          mesh(BOX, HULL_MAT, g, x, 22, 18, 3, 44, 3).rotation.set(0, 0, 0);
          mesh(BOX, HULL_MAT, g, x, 22, -18, 3, 44, 3).rotation.set(0, 0, 0);
          mesh(BOX, HULL_MAT, g, x, 44, 0, 3, 3, 39).rotation.set(0, 0, 0);
        }
        mesh(BOX, HULL_MAT, g, 0, 44, 0, 52, 2, 2).rotation.set(0, 0, 0);
        g.rotation.y = y;
        break;
      }
      case 'slab': {
        face = true;
        mesh(BOX, SLAB_MAT, g, 0, 46, 0, 14, 92, 3).rotation.set(0, 0, 0);
        break;
      }
      case 'lens': {
        // a dark centre, a rim of light, rings turning
        const core = new Mesh(new SphereGeometry(1, 20, 14), CORE_MAT);
        core.scale.setScalar(f.r * 0.07); core.position.y = 3; g.add(core);
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
    look.solid = { group: g, spin, rings, face };
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
      so.rings.forEach((rg, i) => { rg.rotation.z += dt * (0.5 - i * 0.2) * (i % 2 ? -1 : 1); });
      if (so.face) so.group.rotation.y = Math.atan2(cx - f.x, cz - f.z);
    }
    const sway = still ? 0 : 1;
    for (const p of look.pieces) {
      const swing = Math.sin(t * 0.12 * p.w + p.ph) * sway;
      p.s.position.set(p.x + swing * 6, p.y + (def.look.shape === 'ribbon' ? Math.sin(t * 0.4 * p.w + p.ph) * sway * 8 : 0), p.z);
      const blink = p.b ? 0.5 + 0.5 * Math.sin(t * p.b + p.ph) : 1;
      p.s.material.opacity = p.a * fade * f.level * blink;
    }
  }
}
