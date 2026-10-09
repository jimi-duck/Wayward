import { t } from '../i18n';
import { AHEAD, BEHIND, fix, guideTarget, inFight, sayBearing } from '../sim/guide';
import type { World } from '../sim/world';

// ── the heading ───────────────────────────────────────────────────────────
// The compass tape at the top centre, as it was, with the objective on it:
// an amber diamond slides along the tape at the objective's bearing and
// pins to the end as a chevron when it is further round than the tape shows
// (behind you, it sits at the end you turn toward). Either side of the
// heading number, how far off the nose it is ("30° left") and how far away.
// It also tells the rest of the HUD whether this is travel or a fight
// (`data-focus` on the HUD): the edge pointers and chevrons weigh by it.

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
/** Pixels of tape per degree, as the tape's own scale. */
const PX_PER_DEG = 2;
/** The fight keeps the HUD's emphasis this long after the last gun was in reach (s). */
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

export class Heading {
  private readonly hud = $('hud');
  private readonly obj = $('hdg-obj');
  private readonly tape = $('heading');
  private hold = 0;
  private combat = false;
  private half = 80;
  private tick = 0;

  /** True while the fight has the HUD, for the scope. */
  get fighting(): boolean { return this.combat; }

  update(world: World, heading: number, dt: number): void {
    const live = world.alive && world.phase !== 'over';
    if (live && inFight(world)) this.hold = HOLD;
    else this.hold = Math.max(0, this.hold - dt);
    const combat = live && this.hold > 0;
    if (combat !== this.combat) {
      this.combat = combat;
      this.hud.dataset.focus = combat ? 'combat' : 'nav';
    }

    // the compass number and tape, as they always were
    const deg = (((90 - (heading * 180) / Math.PI) % 360) + 360) % 360;
    text($('hdg'), String(Math.round(deg) % 360).padStart(3, '0'));
    $('hdg-tape').style.setProperty('--o', `${(-deg * 2).toFixed(1)}px`);

    // the objective on the tape, a few times a second is plenty for the words
    const lead = live ? guideTarget(world) : null;
    this.obj.hidden = !lead;
    if (!lead) { text($('hdg-rel'), ''); return; }
    const s = world.ship, f = fix(s.x, s.z, heading, lead.x, lead.z);
    if (this.tick++ % 20 === 0) this.half = Math.max(40, this.tape.offsetWidth / 2 - 6);
    const off = -((f.rel * 180) / Math.PI) * PX_PER_DEG;
    const x = Math.max(-this.half, Math.min(this.half, off));
    this.obj.style.transform = `translateX(${x.toFixed(1)}px)`;
    const side = off < -this.half ? 'l' : off > this.half ? 'r' : '';
    if (this.obj.dataset.edge !== side) this.obj.dataset.edge = side;
    this.obj.classList.toggle('on', Math.abs(f.rel) <= AHEAD * 1.5);
    this.obj.classList.toggle('rear', Math.abs(f.rel) >= BEHIND);
    const inside = f.dist <= lead.r;
    text($('hdg-rel'), inside ? t('Inside') : bearingText(f.rel));
  }
}
