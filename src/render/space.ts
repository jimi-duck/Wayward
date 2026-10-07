import { AdditiveBlending, Color, Group, Sprite, SpriteMaterial, type Scene, type Texture } from 'three';
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
// Stage 2 of docs/ENVIRONMENT.md: the dust veil, the curtain and the passage
// have their own look; the rest show as a dim glint where they are, until
// stage 4. Nothing else in the scene changes.

const MAX_SPRITES = 140;

interface Piece {
  s: Sprite;
  /** Offset from the feature's centre, and the opacity it has at full strength. */
  x: number; y: number; z: number;
  a: number;
  /** Sway and drift: phase, and how far it wanders. */
  ph: number;
  w: number;
}

interface Look {
  f: Feature;
  root: Group;
  pieces: Piece[];
  tint: Color;
}

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

  constructor(scene: Scene, private readonly glow: Texture) {
    scene.add(this.group);
  }

  /** Put up what has come into range, take down what has left, and place the lot. `cx`, `cz` is where the camera looks. */
  update(space: Space | null, cx: number, cz: number, dt: number, still: boolean): void {
    this.time += dt;
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
      default: {
        // not drawn yet (docs/ENVIRONMENT.md stage 4): a faint glint, so it is somewhere
        add(this.glow, tint.clone().multiplyScalar(3), f.r * 1.2, f.r * 0.5, 0, 12, 0, 0.18);
      }
    }
    if (!pieces.length) return null;
    this.group.add(root);
    return { f, root, pieces, tint };
  }

  private drop(look: Look): void {
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
    const sway = still ? 0 : 1;
    for (const p of look.pieces) {
      const swing = Math.sin(t * 0.12 * p.w + p.ph) * sway;
      p.s.position.set(p.x + swing * 6, p.y + (def.look.shape === 'ribbon' ? Math.sin(t * 0.4 * p.w + p.ph) * sway * 8 : 0), p.z);
      p.s.material.opacity = p.a * fade * f.level;
    }
  }
}
