import { t } from '../i18n';

// ── The start-up screen: the canopy's optical calibration (owner, 28 November 2026) ─────────────────────
// While main.ts warms the shaders and the governor finds the quality, the screen reads as the cockpit visor powering on:
// four alignment brackets lock to the screen's edges, a reticle sweeps round as the gauge steps up, and the status line
// walks through the visor's checks. No word about screens, windows or devices: the drawing size shows as the visor's
// grid. The world behind stays held. Everything moves by transform and opacity, so the screen costs the frames it
// measures next to nothing; with reduced motion nothing turns or pulses and the brackets are simply locked.

const SEGS = 20;
/** A mechanical leap: the gauge moves at most this often, one or two segments at a time. */
const LEAP_MS = 110;
/** How long the ready flash holds before the screen clears (the world waits for it). */
const READY_MS = 520;
/** The clearing: an iris out over this long (hud.css). */
const OUT_MS = 460;

function el<T extends Element = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from index.html`);
  return node as unknown as T;
}


/** The reticle's repeated geometry, drawn once: the tick ring and the pitch ladder. */
function drawReticle(svg: SVGSVGElement): void {
  const parts: string[] = [];
  // pitch ladder either side of the ring: short rungs, a gap at the centre line
  for (const y of [-80, -40, 40, 80]) {
    const w = y % 80 === 0 ? 34 : 22;
    for (const s of [-1, 1]) parts.push(`<path class="cb-lad" d="M${s * 112} ${y}h${s * w}v${y < 0 ? 6 : -6}"/>`);
  }
  // the side rungs at the centre line
  for (const sx of [-1, 1]) parts.push(`<path class="cb-lad" d="M${sx * 128} 0h${sx * 22}"/>`);
  // the tick ring: 72 ticks, every sixth long
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, long = i % 6 === 0;
    const r0 = long ? 80 : 84, r1 = 89;
    const c = Math.cos(a), s = Math.sin(a);
    parts.push(`<line class="cb-tick${long ? ' l' : ''}" x1="${(c * r0).toFixed(1)}" y1="${(s * r0).toFixed(1)}" x2="${(c * r1).toFixed(1)}" y2="${(s * r1).toFixed(1)}"/>`);
  }
  // under the static parts in index.html (crosshair, diamond, spinning ring, arc, sweep)
  svg.insertAdjacentHTML('afterbegin', parts.join(''));
}

export class CalibScreen {
  private readonly root = el('calib');
  private readonly arc = el<SVGCircleElement>('cb-arc');
  private readonly sweep = el<SVGGElement>('cb-sw');
  private readonly segs: HTMLElement[];
  private shown = 0;
  private target = 0;
  private lastLeap = 0;
  private finishing = false;
  private grid = '';
  /** Which showing this is, so a clearing timer left from the last one never closes a new one. */
  private run = 0;

  constructor() {
    drawReticle(el<SVGSVGElement>('cb-r'));
    const bar = el('cb-i');
    bar.replaceChildren(...Array.from({ length: SEGS }, () => document.createElement('i')));
    this.segs = [...bar.children] as HTMLElement[];
  }

  get open(): boolean {
    return this.root.classList.contains('on');
  }

  /** Up, at nought: the brackets inset and pulsing, the reticle at rest. */
  show(): void {
    this.shown = 0;
    this.target = 0;
    this.lastLeap = 0;
    this.finishing = false;
    this.run++;
    this.root.classList.remove('locked', 'ready', 'out');
    el('cb-t').textContent = t('Optical collimation // Canopy HUD rev 4.2');
    this.paint();
    this.root.classList.add('on');
  }

  /**
   * The calibration's progress (0 to 1) and the visor grid it is drawing (the drawing buffer, in pixels). The gauge
   * follows in stepped leaps and never reaches the last segment before `ready`.
   */
  set(p: number, w: number, h: number): void {
    if (this.finishing) return;
    this.target = Math.max(this.target, Math.min(SEGS - 1, Math.floor(p * SEGS)));
    this.grid = `${t('Grid')} [ ${w} × ${h} ]`;
    const now = performance.now();
    if (this.shown < this.target && now - this.lastLeap >= LEAP_MS) {
      this.lastLeap = now;
      this.shown = Math.min(this.target, this.shown + (this.target - this.shown > 3 ? 2 : 1));
      this.paint();
    } else if (this.shown >= 5 && this.shown < 12) el('cb-g').textContent = this.grid;
  }

  /** All checks done: the gauge fills, everything flashes teal, then the screen irises out. `clear` runs as it clears. */
  ready(clear: () => void): void {
    if (this.finishing) return;
    this.finishing = true;
    this.shown = SEGS;
    this.paint();
    this.root.classList.add('ready');
    const run = this.run;
    window.setTimeout(() => {
      if (run !== this.run) return;
      this.root.classList.add('out');
      clear();
      window.setTimeout(() => { if (run === this.run) this.root.classList.remove('on', 'out', 'ready', 'locked'); }, OUT_MS);
    }, READY_MS);
  }

  private paint(): void {
    const pct = Math.round((this.shown / SEGS) * 100);
    this.segs.forEach((s, i) => {
      s.classList.toggle('on', i < this.shown);
      // the newest segment carries the amber pulse
      s.classList.toggle('hd', i === this.shown - 1 && this.shown < SEGS);
    });
    el('cb-p').textContent = `${String(Math.min(pct, 99)).padStart(2, '0')}%`;
    if (this.shown >= SEGS) el('cb-p').textContent = '100%';
    this.arc.style.strokeDasharray = `${pct} 100`;
    this.sweep.style.transform = `rotate(${(pct / 100) * 360}deg)`;
    // the brackets snap out to the edges once the aperture locks
    this.root.classList.toggle('locked', pct >= 25);
    el('cb-s').textContent = t(
      pct >= 100 ? 'Canopy ready // All sensors nominal'
        : pct >= 85 ? 'Gyro stabilisers armed'
          : pct >= 60 ? 'Vector core // Kinematic trajectory synch'
            : pct >= 25 ? 'Aligned // Focal aperture lock'
              : 'Zeroing visor reticle matrix…',
    );
    // the grid's size only while the aperture locks; the line keeps its room otherwise, so nothing jumps
    const g = el('cb-g');
    g.textContent = pct >= 25 && pct < 60 ? this.grid : '';
  }
}
