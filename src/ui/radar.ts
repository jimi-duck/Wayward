import { angleDelta } from '../core/math';
import type { Sector } from '../render/sector';
import { ALIEN_TYPES, cloaked, FIRE_RANGE } from '../sim/enemies';
import { places } from '../sim/breakout';
import { LOOSE } from '../sim/pickups';
import type { World } from '../sim/world';
import { FONT, INK, RGB, rgba } from './palette';

// ── the sensor scope ──────────────────────────────────────────────────────
// Ship-up, so left on the scope is left on the screen. Inside the scope:
// range rings, the camera's field of view as a faint wedge, and every
// contact by kind: hostiles as arrowheads pointing where they fly
// (elites amber), the capital ship as a square, rock by kind (krail-rich
// violet, rare gold, volatile red), bulwarks as shadows, krail crystals,
// repairs and power-ups, our mines, enemy fire, webs, the objective.
// Round the outside, a compass bezel turns with the ship (N stays north),
// and the bezel lights orange-red toward any hostile close enough to fire.
// In the nebula the sensors are down: a shorter reach and static.

/** Units across the scope's radius: 1.0 km. */
export const RADAR_RANGE = 100;
const BEZEL = 15;
const ARCS = 24;

const ROCK_DOT: Record<string, string> = {
  basalt: 'rgba(236,230,225,.34)', iron: 'rgba(160,172,190,.55)', rich: INK.krail, volatile: 'rgba(255,90,60,.85)', rare: INK.amberHi,
};

export class Radar {
  private readonly threat = new Float32Array(ARCS);

  constructor(private readonly canvas: HTMLCanvasElement) {}

  /** Size the backing store to the element. */
  layout(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
  }

  /** The reach the scope is drawing at, in world units. */
  reach(world: World): number {
    return world.sensorsDown ? RADAR_RANGE * 0.45 : RADAR_RANGE;
  }

  draw(world: World, sector: Sector, target: number | null): void {
    const c = this.canvas, g = c.getContext('2d');
    if (!g || !c.width) return;
    const s = sector.shipNow, h = s.heading;
    const reach = this.reach(world);
    const W = c.width, C = W / 2, dpr = W / Math.max(1, c.clientWidth);
    const R = C - BEZEL * dpr, k = R / reach;
    const fx = Math.cos(h), fz = -Math.sin(h), rx = Math.sin(h), rz = Math.cos(h);
    const to = (x: number, z: number, pin = R - 5 * dpr): [number, number, boolean] => {
      const dx = x - s.x, dz = z - s.z;
      let px = (dx * rx + dz * rz) * k, py = -(dx * fx + dz * fz) * k;
      const d = Math.hypot(px, py), out = d > pin;
      if (out) { px *= pin / d; py *= pin / d; }
      return [C + px, C + py, out];
    };
    const HUD = RGB.teal;
    g.clearRect(0, 0, W, W);

    // ── the bezel: compass ticks that turn with the ship, N/E/S/W, the threat ring
    const Rb = R + 4 * dpr;
    g.save();
    g.translate(C, C);
    // a world bearing (heading convention) sits at this angle from the top of the scope
    const at = (bearing: number) => -angleDelta(h, bearing);
    for (let i = 0; i < 12; i++) {
      const a = at((i / 12) * Math.PI * 2) - Math.PI / 2;
      const big = i % 3 === 0;
      const r0 = Rb + (big ? 1 : 3) * dpr, r1 = Rb + 6 * dpr;
      g.strokeStyle = big ? 'rgba(236,230,225,.45)' : 'rgba(236,230,225,.2)';
      g.lineWidth = (big ? 1.4 : 1) * dpr;
      g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
    }
    g.font = `${8.5 * dpr}px ${FONT.mono}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [label, bearing] of [['N', Math.PI / 2], ['E', 0], ['S', -Math.PI / 2], ['W', Math.PI]] as const) {
      const a = at(bearing) - Math.PI / 2, r = Rb - 6 * dpr;
      g.fillStyle = label === 'N' ? `rgb(${HUD})` : 'rgba(236,230,225,.55)';
      g.fillText(label, Math.cos(a) * r, Math.sin(a) * r);
    }
    // threat: each slice of the ring lights toward a hostile in firing range, brighter the closer
    this.threat.fill(0);
    if (!world.sensorsDown) {
      for (const a of world.aliens) {
        if (cloaked(a) || ALIEN_TYPES[a.kind].fire === 'none') continue;
        const d = Math.hypot(a.x - s.x, a.z - s.z), range = FIRE_RANGE * a.rgK;
        if (d > range) continue;
        const rel = at(Math.atan2(-(a.z - s.z), a.x - s.x));
        const slot = ((Math.round((rel / (Math.PI * 2)) * ARCS) % ARCS) + ARCS) % ARCS;
        this.threat[slot] = Math.max(this.threat[slot]!, 1 - d / range);
      }
      const b = world.command.boss;
      if (b && !b.arriving && b.cloak < 0.5) {
        const rel = at(Math.atan2(-(b.z - s.z), b.x - s.x));
        const slot = ((Math.round((rel / (Math.PI * 2)) * ARCS) % ARCS) + ARCS) % ARCS;
        this.threat[slot] = 1;
      }
    }
    g.lineWidth = 3 * dpr;
    for (let i = 0; i < ARCS; i++) {
      const v = this.threat[i]!;
      const a = (i / ARCS) * Math.PI * 2 - Math.PI / 2, half = Math.PI / ARCS - 0.03;
      g.strokeStyle = v > 0 ? rgba(RGB.red, 0.35 + v * 0.6) : 'rgba(236,230,225,.07)';
      g.beginPath(); g.arc(0, 0, Rb + 9.5 * dpr, a - half, a + half); g.stroke();
    }
    // the Breakout's two places, always: a diamond on the ring along each one's bearing (amber the lane, teal the port)
    const bk = world.bk;
    if (bk) {
      for (const wp of places(bk)) {
        const a = at(Math.atan2(-(wp.z - s.z), wp.x - s.x)) - Math.PI / 2, r = Rb + 9.5 * dpr, sz = 4 * dpr;
        g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.rotate(Math.PI / 4);
        g.fillStyle = wp.kind === 'lane' ? INK.amber : INK.teal;
        g.fillRect(-sz / 2, -sz / 2, sz, sz);
        g.restore();
      }
    }
    // the heading index: a notch at the top, where the nose points
    g.fillStyle = `rgb(${HUD})`;
    g.beginPath(); g.moveTo(0, -Rb + 1 * dpr); g.lineTo(-3.5 * dpr, -Rb - 5 * dpr); g.lineTo(3.5 * dpr, -Rb - 5 * dpr); g.closePath(); g.fill();
    g.restore();

    // ── the scope
    g.save();
    g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.clip();
    const bg = g.createRadialGradient(C, C, 0, C, C, R);
    bg.addColorStop(0, 'rgba(14,24,25,.72)'); bg.addColorStop(1, 'rgba(8,13,14,.82)');
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    g.strokeStyle = rgba(RGB.teal, 0.14); g.lineWidth = dpr;
    for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.arc(C, C, R * f, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(C, C - R); g.lineTo(C, C + R); g.moveTo(C - R, C); g.lineTo(C + R, C); g.stroke();

    // what the camera sees: the horizontal field of view, from the ship
    const cam = sector.camera;
    const hf = Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect);
    g.fillStyle = 'rgba(236,230,225,.045)';
    g.beginPath(); g.moveTo(C, C); g.arc(C, C, R, -Math.PI / 2 - hf, -Math.PI / 2 + hf); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(236,230,225,.12)';
    for (const a of [-hf, hf]) { g.beginPath(); g.moveTo(C, C); g.lineTo(C + Math.sin(a) * R, C - Math.cos(a) * R); g.stroke(); }

    // the field
    g.fillStyle = 'rgba(236,230,225,.1)'; g.strokeStyle = 'rgba(236,230,225,.2)';
    for (const b of world.field.bulwarks) {
      const [x, y, out] = to(b.x, b.z, R + b.r * k);
      if (out) continue;
      g.beginPath(); g.arc(x, y, Math.max(3 * dpr, b.r * k), 0, Math.PI * 2); g.fill(); g.stroke();
    }
    for (const r of world.field.rocks) {
      const [x, y, out] = to(r.x, r.z);
      if (out && r.kind !== 'rare') continue;
      g.fillStyle = ROCK_DOT[r.kind] ?? ROCK_DOT.basalt!;
      g.beginPath(); g.arc(x, y, Math.max((r.kind === 'rare' || r.kind === 'rich' ? 2.2 : 1.2) * dpr, r.r * k), 0, Math.PI * 2); g.fill();
    }
    for (const p of world.pickups) {
      if (!LOOSE.has(p.kind)) continue;
      const [x, y, out] = to(p.x, p.z);
      g.fillStyle = p.kind === 'crystal' ? INK.krail : p.kind === 'ore' ? 'rgba(236,200,160,.8)' : rgba(RGB.teal, 0.8);
      if (!out) g.fillRect(x - 0.8 * dpr, y - 0.8 * dpr, 1.6 * dpr, 1.6 * dpr);
    }
    // the port and the lane mouth, when they are in the scope's reach
    if (bk) {
      for (const wp of places(bk)) {
        const [x, y, out] = to(wp.x, wp.z);
        if (out) continue;
        g.strokeStyle = wp.kind === 'lane' ? INK.amber : INK.teal; g.lineWidth = 1.5 * dpr;
        g.beginPath(); g.moveTo(x, y - 5 * dpr); g.lineTo(x + 5 * dpr, y); g.lineTo(x, y + 5 * dpr); g.lineTo(x - 5 * dpr, y); g.closePath(); g.stroke();
        g.beginPath(); g.arc(x, y, Math.max(3 * dpr, wp.r * k), 0, Math.PI * 2); g.stroke();
      }
    }
    g.fillStyle = rgba(RGB.red, 0.16);
    for (const w of world.webs) { const [x, y] = to(w.x, w.z); g.beginPath(); g.arc(x, y, w.r * k, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = rgba(RGB.red, 0.6); g.lineWidth = dpr;
    for (const st of world.strikes) {
      const [x, y, out] = to(st.x, st.z);
      if (!out) { g.beginPath(); g.arc(x, y, Math.max(2 * dpr, st.r * k), 0, Math.PI * 2); g.stroke(); }
    }
    g.fillStyle = rgba(RGB.amber, 0.85);
    for (const m of world.sys.mines) { const [x, y, out] = to(m.x, m.z); if (!out) g.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr); }

    // the objective: a diamond, and the circle that matters
    const e = world.encounter;
    if (e && !e.done && e.r > 0) {
      const [x, y] = to(e.x, e.z);
      g.strokeStyle = INK.amber; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.moveTo(x, y - 5 * dpr); g.lineTo(x + 5 * dpr, y); g.lineTo(x, y + 5 * dpr); g.lineTo(x - 5 * dpr, y); g.closePath(); g.stroke();
      g.strokeStyle = rgba(RGB.amber, 0.35); g.lineWidth = dpr;
      g.beginPath(); g.arc(x, y, e.r * k, 0, Math.PI * 2); g.stroke();
    }

    // hostiles: arrowheads pointing where they fly
    for (const a of world.aliens) {
      if (cloaked(a)) continue;
      const [x, y, out] = to(a.x, a.z);
      g.fillStyle = out ? rgba(RGB.red, 0.5) : a.elite ? '#f08a7e' : a.kind === 'freighter' ? INK.white2 : INK.red;
      g.save(); g.translate(x, y); g.rotate(-(a.face - h));
      const role = ALIEN_TYPES[a.kind].role;
      const sz = (role === 'cruiser' || a.kind === 'freighter' ? 4.6 : 3.4) * dpr;
      g.beginPath(); g.moveTo(sz * 1.35, 0); g.lineTo(-sz, sz * 0.9); g.lineTo(-sz * 0.5, 0); g.lineTo(-sz, -sz * 0.9); g.closePath(); g.fill();
      g.restore();
      if (a.id === target && !out) this.bracket(g, x, y, 6 * dpr, dpr, INK.red);
    }
    const b = world.command.boss;
    if (b && b.cloak < 0.5) {
      const [x, y] = to(b.x, b.z);
      g.strokeStyle = INK.red; g.lineWidth = 2 * dpr;
      g.strokeRect(x - 5.5 * dpr, y - 5.5 * dpr, 11 * dpr, 11 * dpr);
      g.fillStyle = rgba(RGB.red, 0.35);
      g.fillRect(x - 3 * dpr, y - 3 * dpr, 6 * dpr, 6 * dpr);
    }
    g.fillStyle = 'rgba(255,170,150,.85)';
    for (const sh of world.shots) { const [x, y, out] = to(sh.x, sh.z); if (!out) g.fillRect(x - 0.9 * dpr, y - 0.9 * dpr, 1.8 * dpr, 1.8 * dpr); }
    for (const p of world.pickups) {
      if (LOOSE.has(p.kind)) continue;
      const [x, y] = to(p.x, p.z);
      g.fillStyle = p.kind === 'repair' ? INK.teal : INK.amber;
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-2.2 * dpr, -2.2 * dpr, 4.4 * dpr, 4.4 * dpr); g.restore();
    }
    // the target, if it is rock (hulls are bracketed above)
    if (target !== null) {
      const rock = world.field.find(target);
      if (rock) { const [x, y, out] = to(rock.x, rock.z); if (!out) this.bracket(g, x, y, 5 * dpr, dpr, 'rgba(236,230,225,.85)'); }
    }

    if (world.sensorsDown) {
      // sensors down: static over the scope
      for (let i = 0; i < 110; i++) {
        g.fillStyle = `rgba(236,230,225,${Math.random() * 0.22})`;
        g.fillRect(Math.random() * W, Math.random() * W, 1.5 * dpr, 1.5 * dpr);
      }
    }
    g.restore();

    // the rim, and our ship in the middle
    g.strokeStyle = `rgba(${HUD},.55)`; g.lineWidth = 1.2 * dpr;
    g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.stroke();
    g.fillStyle = INK.amber;
    g.beginPath(); g.moveTo(C, C - 6 * dpr); g.lineTo(C + 4 * dpr, C + 4.5 * dpr); g.lineTo(C, C + 2 * dpr); g.lineTo(C - 4 * dpr, C + 4.5 * dpr); g.closePath(); g.fill();
  }

  /** Four small corner ticks round a blip. */
  private bracket(g: CanvasRenderingContext2D, x: number, y: number, r: number, dpr: number, col: string): void {
    const l = r * 0.55;
    g.strokeStyle = col; g.lineWidth = dpr;
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      g.moveTo(x + sx * r, y + sy * (r - l)); g.lineTo(x + sx * r, y + sy * r); g.lineTo(x + sx * (r - l), y + sy * r);
    }
    g.stroke();
  }
}
