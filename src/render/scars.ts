import { CanvasTexture, Color, Group, LinearFilter, MeshBasicMaterial, Sprite, SpriteMaterial, SRGBColorSpace, type Material, type Scene } from 'three';
import type { World } from '../sim/world';
import type { Scars } from '../sim/scars';
import { t } from '../i18n';
import { materials } from './breakout';
import { Kit, metal, seeded, type V3 } from './kit';
import { thinFog } from './monuments';

// ── the Severance, where she can see it ───────────────────────────────────
// The dead gate, the Bonded work lane and the Continuance's billboard
// (sim/scars.ts). The dead gate lies tilted below the flight plane, huge and
// unlit but for a few dim amber lamps on its breaker; the queue sits just
// under the plane by the live gate; the billboard hangs above it, facing her.
// Each is built once and moved from system to system. No red: these are a
// history, not a threat (brand v1.1).

const TAU = Math.PI * 2;
/** Below the flight plane: the dead gate's centre, and the queue's hulls. */
const DEAD_Y = -30, QUEUE_Y = -5, BOARD_Y = -6;
/** The dead gate's size against the live one (radius about 46 units). */
const DEAD_SCALE = 2.2;

let scarMats: Record<string, Material> | null = null;
function mats(): Record<string, Material> {
  if (scarMats) return scarMats;
  const base = materials();
  scarMats = {
    ...base,
    // seventy years cold: burnt dark steel that keeps most of its shape in the haze
    cold: thinFog(metal({ tint: 0x2e2c2b, roughness: 0.82, metalness: 0.4, worn: 0.75, scale: 1.2 }), 0.45),
    rust: thinFog(metal({ tint: 0x4a3a2a, roughness: 0.86, metalness: 0.3, worn: 0.8 }), 0.45),
    breaker: thinFog(metal({ tint: 0x3a3f45, roughness: 0.6, metalness: 0.55, worn: 0.35 }), 0.45),
    hauler: metal({ tint: 0x5b5548, roughness: 0.7, metalness: 0.35, worn: 0.55 }),
    dim: base.amber!,
    deadstrip: new MeshBasicMaterial({ color: new Color(0.02, 0.09, 0.1), toneMapped: false, fog: false }),
  };
  return scarMats;
}

/** A point on a flat ring of radius r at angle a, lifted y. */
const on = (r: number, a: number, y = 0): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];

/**
 * A Jump Gate shut on Severance night: the same ring as a live one, dark, a few plates gone, and a breaker hulk
 * clamped across it, its four arms gripping the rim so the throat can never open again.
 */
function deadGate(): Group {
  const k = new Kit(), rnd = seeded(1170);
  const R = 20, N = 36, W = (TAU / N) * R;
  // the ring itself, round and whole but for three breaks where the breaker's charges went in
  for (const [a, b] of [[0.12, 2.0], [2.28, 4.3], [4.52, 6.1]] as const) {
    k.ring('cold', R, 2.6, [0, 0, 0], 'y', 40, b - a, [0, -a, 0]);
    k.ring('dark', R - 2.6, 0.9, [0, 0, 0], 'y', 40, b - a, [0, -a, 0]);
    // its light strips, dead: the same broken teal line a live gate carries, gone to a cold dark green
    k.ring('deadstrip', R - 3.4, 0.16, [0, -0.4, 0], 'y', 40, b - a - 0.1, [0, -a - 0.05, 0]);
  }
  // plating and clamps along the ring, as on a live one
  for (let i = 0; i < N; i++) {
    const a = (i + 0.5) * (TAU / N);
    if (a < 0.15 || (a > 1.98 && a < 2.3) || (a > 4.28 && a < 4.54) || a > 6.08) continue;
    k.box(i % 5 === 0 ? 'rust' : 'cold', [3.2, 1.1, W * 0.8], on(R + 0.4, a, 2.2), [0, -a, 0]);
    if (i % 4 === 0) k.box('dark', [6.6, 6.4, 1.4], on(R, a), [0, -a, 0]);
    if (rnd() < 0.25) k.box('rust', [1.4, 0.5, W * 0.5], on(R + 2.6, a, 0.6), [0, -a, 0]);
  }
  // the breaker: a spine across the throat, a heavy body at its middle, and four arms that bite the rim
  k.box('breaker', [2 * R + 6, 2.6, 4.4], [0, 3.4, 0]);
  k.box('breaker', [11, 7, 9], [0, 5.2, 0]);
  k.box('dark', [7, 2.2, 10.4], [0, 8.6, 0]);
  k.cyl('dark', 1.6, 2.2, 3.2, [-4.2, 9.6, 0], 'y', 10);
  for (const a of [TAU / 8, (3 * TAU) / 8, (5 * TAU) / 8, (7 * TAU) / 8]) {
    const [x, , z] = on(R * 0.5, a);
    k.box('breaker', [R, 1.8, 2.6], [x, 3.2, z], [0, -a, 0]);
    // the jaw: one plate over the rim, one under it
    for (const y of [2.6, -2.6]) k.box('breaker', [7.2, 1.4, 4], on(R, a, y), [0, -a, 0]);
    k.box('dark', [1.8, 6.6, 3.2], on(R + 3.4, a), [0, -a, 0]);
    // its one lamp, dim amber: still drawing power from somewhere after seventy years
    k.box('dim', [0.45, 0.45, 0.45], on(R + 3.4, a, 3.6));
  }
  // what the charges threw: plates and spars hanging in the gaps
  for (let i = 0; i < 14; i++) {
    const a = [7.5, 22, 29][i % 3]! * (TAU / N) + (rnd() - 0.5) * 0.3;
    k.box(i % 2 ? 'rust' : 'cold', [1 + rnd() * 3, 0.5 + rnd(), 1 + rnd() * 3], on(R + (rnd() - 0.5) * 9, a, (rnd() - 0.5) * 8), [rnd() * 3, rnd() * 3, rnd() * 3]);
  }
  const g = k.build(mats(), 0.6);
  g.scale.setScalar(DEAD_SCALE);
  return g;
}

/** One Bonded hauler waiting in the work lane: a blunt ore body, a cab, two drives cold, a lit cabin. */
function hauler(seed: number): Group {
  const k = new Kit(), rnd = seeded(seed);
  const len = 5 + rnd() * 2.5;
  k.box('hauler', [len, 1.7, 2.2], [0, 0, 0]);
  k.box('dark', [len * 0.7, 0.4, 2.3], [-0.3, 0.95, 0]);
  k.box('hull', [1.5, 1.2, 1.6], [len / 2 + 0.6, 0.2, 0]);
  k.cyl('dark', 0.45, 0.55, 0.9, [-len / 2 - 0.35, 0, 0.6], 'x', 8, true);
  k.cyl('dark', 0.45, 0.55, 0.9, [-len / 2 - 0.35, 0, -0.6], 'x', 8, true);
  k.box('lamp', [0.08, 0.16, 0.5], [len / 2 + 1.36, 0.35, 0]);
  return k.build(mats(), 0.5);
}

/** The billboard: the slogan in the Continuance's clean caps, and, once the Scatter has heard Ada's key, a line sprayed over it. */
function boardTexture(line: string, over: string | null): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(6, 18, 22, 0.82)';
  g.fillRect(0, 40, 1024, 150);
  g.strokeStyle = 'rgba(120, 200, 210, 0.55)';
  g.lineWidth = 3;
  g.strokeRect(6, 42, 1012, 146);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // the slogan as large as fits the panel
  let px = 72;
  do { g.font = `600 ${px}px "Barlow Condensed", "Barlow", sans-serif`; px -= 4; } while (px > 30 && g.measureText(line.toUpperCase()).width > 940);
  g.fillStyle = over ? 'rgba(170, 210, 214, 0.55)' : 'rgba(200, 236, 240, 0.95)';
  g.fillText(line.toUpperCase(), 512, 100);
  g.font = '500 26px "Share Tech Mono", monospace';
  g.fillStyle = 'rgba(150, 200, 205, 0.7)';
  g.fillText(t('Continuance Public Service').toUpperCase(), 512, 160);
  if (over) {
    // the struck line, then the Scatter's own words in WAYWARD's ochre, a little crooked
    g.strokeStyle = 'rgba(217, 154, 39, 0.9)';
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(90, 106); g.lineTo(934, 92); g.stroke();
    g.save();
    g.translate(560, 214); g.rotate(-0.04);
    g.font = '700 58px "Barlow Condensed", "Barlow", sans-serif';
    g.fillStyle = 'rgba(217, 154, 39, 0.95)';
    g.fillText(over.toUpperCase(), 0, 0);
    g.restore();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  return tex;
}

export class ScarView {
  private readonly root = new Group();
  private dead: Group | null = null;
  private readonly queue: Group[] = [];
  private readonly board: Sprite;
  private boardKey = '';
  private time = 0;

  constructor(private readonly scene: Scene) {
    this.board = new Sprite(new SpriteMaterial({ color: new Color(1, 1, 1), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    this.board.scale.set(56, 14, 1);
    this.board.visible = false;
    this.root.add(this.board);
    scene.add(this.root);
  }

  update(world: World, dt: number): void {
    const s: Scars = world.severance;
    this.time += dt;
    if (s.dead) {
      if (!this.dead) { this.dead = deadGate(); this.root.add(this.dead); }
      this.dead.visible = true;
      this.dead.position.set(s.dead.x, DEAD_Y, s.dead.z);
      // lying tilted, turning a degree a minute: a thing nobody holds steady any more
      this.dead.rotation.set(0.42, s.dead.yaw + this.time * 0.0003, 0.12);
    } else if (this.dead) this.dead.visible = false;

    const n = s.queue?.n ?? 0;
    while (this.queue.length < n) { const h = hauler(311 + this.queue.length * 17); this.queue.push(h); this.root.add(h); }
    this.queue.forEach((h, i) => {
      h.visible = i < n;
      if (!s.queue || i >= n) return;
      const q = s.queue, fx = Math.cos(q.yaw), fz = -Math.sin(q.yaw);
      // nose to tail, each a little out of line, backed up from the gate toward her
      const back = i * 13, side = (i % 2 ? 1.2 : -0.8);
      h.position.set(q.x - fx * back - fz * side, QUEUE_Y + Math.sin(this.time * 0.3 + i) * 0.15, q.z - fz * back + fx * side);
      h.rotation.set(0, q.yaw, 0);
    });

    if (s.board) {
      const key = `${s.board.line}|${s.board.over ?? ''}`;
      if (key !== this.boardKey) {
        this.boardKey = key;
        const m = this.board.material as SpriteMaterial;
        m.map?.dispose();
        m.map = boardTexture(t(s.board.line), s.board.over ? t(s.board.over) : null);
        m.needsUpdate = true;
      }
      this.board.visible = true;
      this.board.position.set(s.board.x, BOARD_Y, s.board.z);
      // a broadcast panel's slow refresh: it dips for a beat now and then
      (this.board.material as SpriteMaterial).opacity = Math.sin(this.time * 0.7) > 0.97 ? 0.6 : 1;
    } else this.board.visible = false;
  }

  dispose(): void { this.scene.remove(this.root); }
}
