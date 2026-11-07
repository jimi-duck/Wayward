import { t } from '../i18n';
import { lockLifted } from './postjump';
import { portStyleOf } from './site';
import type { World } from './world';

// ── what a place is, said where it stands ──────────────────────────────────
// Every built thing in a system names itself when you come near: what it is on
// the first line, what it does for you (or why it will not, now) on the second.
// Read by the targeting overlay (ui/targeting.ts), which pins it beside the
// model. Plain data from what the world already holds (docs/SITES.md).

export interface SiteTag {
  x: number; z: number;
  /** Height of the label's anchor above the plane (units). */
  y: number;
  name: string;
  /** What it does, or what it is doing now. One short line. */
  line: string;
  /** A warning (amber) rather than a plain teal tag. */
  warn?: boolean;
}

/** Inside this range (units) a place names itself. */
export const TAG_R = 240;

/** Who runs a depot, by holder: said under its name. */
const HOLDER_LINE: Record<ReturnType<typeof portStyleOf>, string> = {
  frontier: 'Frontier Supply · fuel and refits',
  kellern: 'Kellern Company · fuel, claims, checks',
  gutter: 'Gutter port · no questions asked',
  holdfast: 'Holdfast hub · guarded by flak',
  guild: 'Dust Traders · goods from anywhere',
};

/** The places near the ship, nearest first. */
export function siteTags(w: World): SiteTag[] {
  const b = w.bk;
  if (!b || w.phase === 'over') return [];
  const s = w.ship, out: SiteTag[] = [];
  const near = (x: number, z: number) => Math.hypot(x - s.x, z - s.z) < TAG_R;
  if (b.port && near(b.port.x, b.port.z) && !b.def.first) {
    const shut = w.portMood === 'shut';
    out.push({ x: b.port.x + 17, z: b.port.z - 6, y: 16, name: b.port.name, line: shut ? t('Shield up · fight at the ring') : t(HOLDER_LINE[portStyleOf(b.def.holder)]), warn: shut });
  }
  if (b.audit && !lockLifted(w.flags) && near(b.audit.x, b.audit.z)) out.push({ x: b.audit.x, z: b.audit.z, y: 18, name: b.audit.name, line: t('Company checkpoint · hulls are inspected'), warn: true });
  const g = w.gantry;
  if (g && near(g.x, g.z)) {
    const line = g.state === 'working' ? t('Mending · hold still on the pad')
      : g.state === 'spent' ? t('Spent · no mends left')
        : g.state === 'shut' ? t('Locked · fight in range')
          : g.state === 'refuses' ? t('Won’t service a flagged hull')
            : g.state === 'full' ? t('Plating full · nothing to mend')
              : t('Stop on the pad · mends a plate ({n} left)', { n: String(g.uses) });
    out.push({ x: g.x, z: g.z, y: 12, name: t('Repair gantry'), line, warn: g.state === 'shut' || g.state === 'refuses' });
  }
  const m = w.market;
  if (m && near(m.x, m.z)) {
    const line = m.state === 'sold' ? t('Sold out') : m.state === 'shut' ? t('Stalls shut · fight near') : t('Slow down on the deck to trade');
    out.push({ x: m.x, z: m.z, y: 10, name: t('Dust Market'), line, warn: m.state === 'shut' });
  }
  const bg = w.barge;
  if (bg && near(bg.x, bg.z)) out.push({ x: bg.x, z: bg.z, y: 7, name: t('Refinery barge'), line: bg.mood === 'fleeing' ? t('Running from the fight') : t('Grinds rock · spills Cyrite for you'), warn: bg.mood === 'fleeing' });
  const dn = w.den;
  if (dn && dn.seen && dn.state !== 'moving' && near(dn.x, dn.z)) out.push({ x: dn.x, z: dn.z, y: 12, name: t('Raider den'), line: dn.state === 'awake' ? t('Launching raiders · shoot the dock') : t('Raider nest · wakes if you come close'), warn: true });
  const sd = w.thrSeed;
  if (sd && sd.state !== 'dead' && near(sd.x, sd.z)) {
    const line = sd.state === 'studied' ? t('Studied · leave it or burn it') : sd.state === 'quiet' ? t('Quiet · stay still to study it') : t('Thren growth · hold still near it to study');
    out.push({ x: sd.x, z: sd.z, y: sd.r + 3, name: t('Thren seed'), line });
  }
  const rp = w.traffic?.relayPost;
  if (rp && near(rp.x, rp.z)) {
    const off = w.runTime < rp.jammedUntil;
    out.push({ x: rp.x, z: rp.z, y: 10, name: t('Custody relay post'), line: off ? t('Offline · jammed') : t('Reports flagged hulls · hover close to jam'), warn: !off });
  }
  return out.sort((p, q) => Math.hypot(p.x - s.x, p.z - s.z) - Math.hypot(q.x - s.x, q.z - s.z));
}
