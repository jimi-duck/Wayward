import { CanvasTexture, Color, LinearFilter, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
import type { SignCat, SignDef } from '../content/gatesigns';
import { pickSign, signHold, signRuns, type SignCtx } from '../sim/signs';
import { t } from '../i18n';
import { seeded } from './kit';

// ── a sign by a Jump Gate ─────────────────────────────────────────────────
// One public display: a sprite with its own canvas, drawn again only when its
// line changes (sim/signs.ts picks the line, content/gatesigns.ts holds them).
// The official look is the billboard as it always was: a dark teal panel, a
// pale teal line in the Continuance's clean caps, "Continuance Public Service"
// beneath. The others are that panel, worn: defaced ones show the old words
// struck out and the new ones over them in WAYWARD's ochre; resistance is
// near-black with a bone-white scrawl, a little crooked; civilian is faded and
// drops out now and then; the Warden's are mechanical mono. No red anywhere
// (brand v1.1), and every line stays set large enough to read in flight.

const W = 1024, H = 256;
const SANS = '"Barlow Condensed", "Barlow", sans-serif';
const MONO = '"Share Tech Mono", monospace';
const OCHRE = '217, 154, 39';
const FADE = 0.3, COME = 0.4;

interface Look { fill: string; rim: string; rimW: number; text: string; tag: string; tagText: string }
const LOOKS: Record<SignCat, Look> = {
  official: { fill: 'rgba(6, 18, 22, 0.82)', rim: 'rgba(120, 200, 210, 0.55)', rimW: 3, text: 'rgba(200, 236, 240, 0.95)', tag: 'rgba(150, 200, 205, 0.7)', tagText: 'Continuance Public Service' },
  defaced: { fill: 'rgba(6, 18, 22, 0.82)', rim: 'rgba(120, 200, 210, 0.4)', rimW: 3, text: 'rgba(200, 236, 240, 0.95)', tag: 'rgba(150, 200, 205, 0.55)', tagText: 'Continuance Public Service' },
  resistance: { fill: 'rgba(12, 10, 8, 0.9)', rim: `rgba(${OCHRE}, 0.85)`, rimW: 4, text: 'rgba(244, 236, 218, 0.98)', tag: `rgba(${OCHRE}, 0.85)`, tagText: 'Unregistered signal' },
  krail: { fill: 'rgba(12, 10, 8, 0.9)', rim: `rgba(${OCHRE}, 0.85)`, rimW: 4, text: 'rgba(244, 236, 218, 0.98)', tag: 'rgba(120, 200, 210, 0.8)', tagText: 'Recovered record' },
  civilian: { fill: 'rgba(14, 20, 22, 0.7)', rim: 'rgba(150, 170, 170, 0.35)', rimW: 2, text: 'rgba(208, 218, 214, 0.86)', tag: 'rgba(160, 175, 172, 0.6)', tagText: 'Open channel · unverified' },
  warden: { fill: 'rgba(4, 14, 16, 0.88)', rim: 'rgba(95, 175, 165, 0.6)', rimW: 2, text: 'rgba(165, 220, 208, 0.96)', tag: 'rgba(110, 175, 165, 0.7)', tagText: 'Warden relay · automatic' },
  rare: { fill: 'rgba(6, 18, 22, 0.82)', rim: 'rgba(120, 200, 210, 0.55)', rimW: 3, text: 'rgba(200, 236, 240, 0.95)', tag: 'rgba(150, 200, 205, 0.7)', tagText: 'Continuance Public Service' },
};

/** Set `text` as large as fits `max` wide (from `top` down to `min` px); returns the size, or 0 if even `min` is too wide. */
function fit(g: CanvasRenderingContext2D, text: string, weight: string, family: string, top: number, min: number, max: number): number {
  for (let px = top; px >= min; px -= 2) { g.font = `${weight} ${px}px ${family}`; if (g.measureText(text).width <= max) return px; }
  return 0;
}

/** Break a line in two at the space nearest its middle. */
function halves(s: string): [string, string] {
  const mid = s.length / 2;
  let best = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? [s, ''] : [s.slice(0, best), s.slice(best + 1)];
}

/** Draw one line onto the canvas, in the look of its category. */
export function drawSign(g: CanvasRenderingContext2D, d: SignDef, seed: number): void {
  const look = LOOKS[d.look];
  const kind = d.look;
  g.clearRect(0, 0, W, H);
  const rnd = seeded(seed);
  g.save();
  g.fillStyle = look.fill;
  g.fillRect(0, 40, W, 150);
  g.strokeStyle = look.rim;
  g.lineWidth = look.rimW;
  g.strokeRect(6, 42, 1012, 146);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const runs = signRuns(t(d.text));
  const shown = runs.map((r) => r.text).join('').toUpperCase();
  const mono = kind === 'warden';
  const family = mono ? MONO : SANS;
  const weight = kind === 'resistance' || kind === 'krail' ? '700' : kind === 'civilian' ? '500' : '600';

  if (kind === 'defaced') {
    // the old line small and struck where it was altered, the new one large with its own words in ochre
    const old = runs.map((r) => (r.old ?? r.text).toUpperCase());
    const opx = fit(g, old.join(''), '500', SANS, 30, 20, 900) || 20;
    g.font = `500 ${opx}px ${SANS}`;
    let x = 512 - g.measureText(old.join('')).width / 2;
    g.textAlign = 'left';
    runs.forEach((r, i) => {
      const w = g.measureText(old[i]!).width;
      g.fillStyle = r.old === undefined ? 'rgba(150, 200, 205, 0.55)' : `rgba(${OCHRE}, 0.6)`;
      g.fillText(old[i]!, x, 70);
      if (r.old !== undefined) { g.strokeStyle = `rgba(${OCHRE}, 0.85)`; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 4, 70); g.lineTo(x + w + 4, 68); g.stroke(); }
      x += w;
    });
    const px = fit(g, shown, weight, SANS, 62, 32, 940) || 32;
    g.font = `${weight} ${px}px ${SANS}`;
    x = 512 - g.measureText(shown).width / 2;
    runs.forEach((r) => {
      const part = r.text.toUpperCase();
      const w = g.measureText(part).width;
      g.fillStyle = r.old === undefined ? look.text : `rgba(${OCHRE}, 0.98)`;
      g.fillText(part, x, 116);
      x += w;
    });
    g.textAlign = 'center';
    // a couple of knife scratches across the panel's corner, nothing over the words
    g.strokeStyle = `rgba(${OCHRE}, 0.3)`; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const y = 150 + i * 7; g.beginPath(); g.moveTo(24 + rnd() * 30, y); g.lineTo(70 + rnd() * 50, y - 14 - rnd() * 6); g.stroke(); }
  } else {
    let lines: string[] = [shown];
    let px = fit(g, shown, weight, family, mono ? 54 : 72, mono ? 34 : 46, 940);
    if (!px) {
      lines = halves(shown).filter(Boolean);
      px = fit(g, lines.reduce((a, b) => (b.length > a.length ? b : a), ''), weight, family, mono ? 40 : 48, 30, 940) || 30;
    }
    g.font = `${weight} ${px}px ${family}`;
    g.fillStyle = look.text;
    g.save();
    // a scrawl sits a little crooked; the rest stand square
    if (kind === 'resistance' || kind === 'krail') g.transform(1, -0.02, 0, 1, 0, 10);
    const gap = px * 1.08, y0 = lines.length > 1 ? 92 - gap / 2 : 98;
    lines.forEach((ln, i) => g.fillText(ln, 512, y0 + i * gap));
    g.restore();
    if (kind === 'warden') {
      // ticks in the corners, as on a panel with a bezel
      g.strokeStyle = look.rim; g.lineWidth = 3;
      for (const [cx, cy, sx, sy] of [[14, 50, 1, 1], [1010, 50, -1, 1], [14, 180, 1, -1], [1010, 180, -1, -1]] as const) { g.beginPath(); g.moveTo(cx, cy + sy * 16); g.lineTo(cx, cy); g.lineTo(cx + sx * 16, cy); g.stroke(); }
    }
    if (kind === 'civilian') {
      // worn: grain on the glass, a streak where it has faded
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(190, 205, 200, ${0.04 + rnd() * 0.06})`; g.fillRect(8 + rnd() * 1008, 44 + rnd() * 142, 2 + rnd() * 3, 1); }
    }
    if (kind === 'resistance' || kind === 'krail') {
      // the rim chipped in two places
      g.clearRect(150 + rnd() * 300, 40, 40, 6); g.clearRect(560 + rnd() * 300, 184, 46, 6);
    }
  }
  g.font = `500 24px ${MONO}`;
  g.fillStyle = look.tag;
  g.textAlign = 'center';
  g.fillText(t(look.tagText).toUpperCase(), 512, 172);
  g.restore();
}

/** One panel by a gate: shows a line, holds it 8 to 12 s, changes it with a short fade and flicker. */
export class SignPanel {
  readonly sprite: Sprite;
  private readonly canvas = document.createElement('canvas');
  private readonly g: CanvasRenderingContext2D;
  private readonly tex: CanvasTexture;
  private readonly mat: SpriteMaterial;
  private rnd: () => number;
  private cur: SignDef | null = null;
  /** Seconds in the current phase. */
  private age = 0;
  private hold = 10;
  private fading = false;
  /** Where in the hold the civilian signal drops out. */
  private drop = 5;

  constructor(readonly slot: number, seed: number, w: number, h: number) {
    this.canvas.width = W; this.canvas.height = H;
    this.g = this.canvas.getContext('2d')!;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.tex.minFilter = LinearFilter;
    this.mat = new SpriteMaterial({ map: this.tex, color: new Color(1, 1, 1), transparent: true, depthWrite: false, toneMapped: false, fog: false, opacity: 0 });
    this.sprite = new Sprite(this.mat);
    this.sprite.scale.set(w, h, 1);
    this.sprite.visible = false;
    this.rnd = seeded(seed + slot * 7919);
  }

  /** Start fresh at a new gate (or `first` as the opening line there, if given). */
  reset(c: SignCtx, first?: SignDef): void {
    this.rnd = seeded(c.seed + this.slot * 7919);
    this.cur = null;
    this.show(first ?? pickSign(this.rnd, c, this.slot, null));
    // the panels do not change together
    this.age = this.hold * (0.2 + 0.25 * this.slot) * this.rnd();
  }

  private show(d: SignDef): void {
    this.cur = d;
    drawSign(this.g, d, Math.floor(this.rnd() * 1e6));
    this.tex.needsUpdate = true;
    this.age = 0;
    this.fading = false;
    this.hold = signHold(this.rnd);
    this.drop = this.hold * (0.3 + 0.4 * this.rnd());
  }

  /** Move on `dt` seconds; `c` is built only if a new line is needed. */
  update(dt: number, ctx: () => SignCtx): void {
    this.age += dt;
    const d = this.cur!;
    if (!this.fading && this.age >= this.hold) { this.fading = true; this.age = 0; }
    if (this.fading && this.age >= FADE) { this.show(pickSign(this.rnd, ctx(), this.slot, d)); this.age = 0; }
    this.mat.opacity = this.fading ? 1 - this.age / FADE : this.shownOpacity(d);
  }

  /** The hold's opacity: the transmission settling in, then the category's own unrest. */
  private shownOpacity(d: SignDef): number {
    const a = this.age;
    if (a < COME) {
      // coming in: a few stuttering frames, then solid
      const n = Math.floor(a * 24);
      return a / COME * (n % 3 === 1 ? 0.55 : 1);
    }
    switch (d.look) {
      case 'official': case 'rare': return Math.sin(a * 0.7) > 0.97 ? 0.6 : 1;
      case 'defaced': return Math.sin(a * 2.3) * Math.sin(a * 0.9 + 1) > 0.93 ? 0.45 : 0.97;
      case 'resistance': case 'krail': return (0.93 + 0.07 * Math.sin(a * 9)) * (Math.sin(a * 3.1) * Math.sin(a * 1.3) > 0.9 ? 0.55 : 1);
      case 'civilian': return a > this.drop && a < this.drop + 0.35 ? 0.2 : 0.82;
      case 'warden': return 1;
    }
  }

  dispose(): void { this.tex.dispose(); this.mat.dispose(); }
}
