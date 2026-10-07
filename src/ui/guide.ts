import { t } from '../i18n';
import { AHEAD, BEHIND, GUIDE_RANGE, guideTarget, fix, inFight, sayBearing, sidePlaces, threats, track, type Guide, type Threat } from '../sim/guide';
import type { World } from '../sim/world';
import { range } from './targeting';

// ── the navigation strip ──────────────────────────────────────────────────
// Top centre, read in a second. One bar is the horizon round the ship: the nose
// in the middle, left on the left, behind at the two ends. On it, the thing to
// go to (an amber diamond: the lane mouth, or the event), the other places
// (hollow), the capital ship (red square), each hull that matters (red ticks,
// the most pressing one larger) and the way the ship is actually travelling
// (a small teal caret, for when the nose and the drift disagree).
// Above the bar, in travel, one row: an arrow turned toward the objective, its
// name, how far off the nose it is in words ("30° left"), how far away, and how
// long at this closing speed. In a fight a second row, in red, takes the lead:
// the most pressing hull's bearing and distance, with the objective kept
// beneath it. The strip says which it is with `data-focus` on the HUD.

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const MARKS = 14;
/** The fight keeps the strip this long after the last gun was in reach (s). */
const HOLD = 2;

function text(el: HTMLElement, s: string): void {
  if (el.textContent !== s) el.textContent = s;
}

/** "30° left", "ahead", "behind", in the player's language. */
export function bearingText(rel: number): string {
  const b = sayBearing(rel);
  if (b.word === 'ahead') return t('Ahead');
  if (b.word === 'behind') return t('Behind');
  return t(b.word === 'left' ? '{n}° left' : '{n}° right', { n: b.deg });
}

/** m:ss, or a dash when it is not worth saying. */
export function eta(seconds: number): string {
  if (!isFinite(seconds) || seconds > 599) return '';
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface MarkState { cls: string; x: string; o: string }

export class GuideStrip {
  private readonly root = $('heading');
  private readonly go = $('gd-go');
  private readonly foe = $('gd-foe');
  private readonly marks: HTMLSpanElement[] = [];
  private readonly state: MarkState[] = [];
  private readonly hud = $('hud');
  private hold = 0;
  private rows = '';
  private combat = false;
  /** What the closing speed was measured against. */
  private key = '';
  private last = 0;
  private closing = 0;

  /** The fight, as the rest of the HUD reads it. */
  get fighting(): boolean { return this.combat; }

  constructor() {
    const host = $('gd-marks');
    for (let i = 0; i < MARKS; i++) {
      const s = document.createElement('span');
      s.hidden = true;
      host.append(s);
      this.marks.push(s);
      this.state.push({ cls: '', x: '', o: '' });
    }
  }

  /** Draw one frame; true when the strip changed height (a row came or went). */
  update(world: World, dt: number): boolean {
    const live = world.alive && world.phase !== 'over';
    if (live && inFight(world)) this.hold = HOLD;
    else this.hold = Math.max(0, this.hold - dt);
    const combat = live && this.hold > 0;
    if (combat !== this.combat) {
      this.combat = combat;
      this.hud.dataset.focus = combat ? 'combat' : 'nav';
      this.root.classList.toggle('combat', combat);
    }

    const s = world.ship;
    const lead = live ? guideTarget(world) : null;
    const foes = live ? threats(world, MARKS - 4) : [];
    this.root.classList.toggle('idle', !lead && foes.length === 0);
    this.drawGo(lead, s, dt);
    this.drawFoe(world, foes, combat);
    this.drawBar(world, lead, foes, combat, live);
    const h = this.go.hidden + ':' + this.foe.hidden;
    const changed = h !== this.rows;
    this.rows = h;
    return changed;
  }

  private drawGo(lead: Guide | null, s: World['ship'], dt: number): void {
    this.go.hidden = !lead;
    if (!lead) { this.key = ''; return; }
    const f = fix(s.x, s.z, s.heading, lead.x, lead.z);
    const left = Math.max(0, f.dist - lead.r);
    // how fast the way is closing: the distance's change, smoothed over about half a second
    const key = `${lead.kind}${lead.x.toFixed(0)}${lead.z.toFixed(0)}`;
    if (key !== this.key || dt <= 0) { this.key = key; this.closing = 0; }
    else this.closing += ((this.last - left) / dt - this.closing) * (1 - Math.exp(-dt / 0.5));
    this.last = left;

    const inside = left <= 0;
    const ahead = Math.abs(f.rel) <= AHEAD * 1.5 && this.closing > 1;
    const away = !inside && this.closing < -1.5;
    this.go.classList.toggle('on', ahead);
    this.go.classList.toggle('turn', !inside && Math.abs(f.rel) >= BEHIND);
    this.go.classList.toggle('away', away);
    this.go.classList.toggle('in', inside);
    ($('gd-arrow') as unknown as HTMLElement).style.rotate = `${(-f.rel).toFixed(2)}rad`;
    text($('gd-name'), t(lead.name));
    text($('gd-rel'), inside ? t('Inside') : bearingText(f.rel));
    text($('gd-dist'), inside ? '' : range(f.dist));
    text($('gd-eta'), inside ? '' : away ? t('Away') : this.closing > 1.5 ? eta(left / this.closing) : '');
  }

  private drawFoe(world: World, foes: Threat[], combat: boolean): void {
    const top = foes.find((f) => !f.friendly);
    this.foe.hidden = !(combat && top);
    if (this.foe.hidden || !top) return;
    const armed = foes.filter((f) => f.armed).length;
    const b = world.command.boss;
    const bossNear = !!b && !b.arriving && !b.leaving && b.cloak < 0.5;
    // the capital ship leads the row when she is the nearest of the lot
    let rel = top.rel, dist = top.dist, name = t('Hostile');
    if (bossNear) {
      const bf = fix(world.ship.x, world.ship.z, world.ship.heading, b!.x, b!.z);
      if (bf.dist < dist * 1.4) { rel = bf.rel; dist = bf.dist; name = t(b!.name); }
    }
    const close = dist < 50 && Math.abs(rel) >= BEHIND;
    this.foe.classList.toggle('rear', Math.abs(rel) >= BEHIND);
    this.foe.classList.toggle('close', close);
    ($('gd-foe-arrow') as unknown as HTMLElement).style.rotate = `${(-rel).toFixed(2)}rad`;
    text($('gd-foe-n'), name);
    text($('gd-foe-rel'), bearingText(rel));
    text($('gd-foe-d'), range(dist));
    text($('gd-foe-c'), armed > 1 ? `×${armed}` : '');
  }

  private drawBar(world: World, lead: Guide | null, foes: Threat[], combat: boolean, live: boolean): void {
    const s = world.ship;
    let n = 0;
    const put = (cls: string, rel: number, o = 1) => {
      if (n >= MARKS) return;
      const m = this.marks[n]!, st = this.state[n]!;
      n++;
      const x = (50 - (rel / Math.PI) * 50).toFixed(1), op = o.toFixed(2);
      if (st.cls !== cls) { st.cls = cls; m.className = cls; }
      if (st.x !== x) { st.x = x; m.style.left = `${x}%`; }
      if (st.o !== op) { st.o = op; m.style.opacity = op; }
      m.hidden = false;
    };
    if (live) {
      for (const p of sidePlaces(world, lead)) put(`p ${p.kind}`, fix(s.x, s.z, s.heading, p.x, p.z).rel);
      if (lead) put(`o ${lead.kind}`, fix(s.x, s.z, s.heading, lead.x, lead.z).rel);
      const b = world.command.boss;
      if (b && !b.arriving && !b.leaving && b.cloak < 0.5) put('k', fix(s.x, s.z, s.heading, b.x, b.z).rel);
      let first = true;
      for (const f of foes) {
        // in travel only a gun that can reach you earns a mark; in a fight, every hull
        if (!combat && !f.friendly && !f.armed) continue;
        const near = 1 - f.dist / GUIDE_RANGE;
        const cls = f.friendly ? 'f' : `t${f.armed ? '' : ' cold'}${f.elite ? ' elite' : ''}${first && !f.friendly ? ' top' : ''}`;
        if (!f.friendly) first = false;
        put(cls, f.rel, 0.5 + near * 0.5);
      }
      const v = track(world);
      if (v) put('v', v.rel, 0.55 + v.frac * 0.45);
    }
    for (; n < MARKS; n++) if (!this.marks[n]!.hidden) { this.marks[n]!.hidden = true; this.state[n]!.cls = ''; }
  }
}
