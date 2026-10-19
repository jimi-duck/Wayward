import { t } from '../i18n';

// ── the centre notice ─────────────────────────────────────────────────────
// One small, quiet message low in the middle of the screen, between the
// crosshair and the ship (never the top: that is the way you are flying).
// No icon: a dark band with hairlines top and bottom, feathered at the ends, and a colour
// that says the kind. It never takes input and fades on its own. The
// persistent fact then lives in the alert corner, which the HUD derives from
// the world each frame; this only decides what the centre says and when.
//   denied  · muted red   · something is refused
//   warning · dull gold   · something is going wrong
//   arrival · calm teal   · a welcome, not an alarm
// One at a time, denied over warning over arrival: the one pushed out (or
// the one that cannot get in) goes straight to the corner log.

export type NoticeType = 'denied' | 'warning' | 'arrival';

export interface Notice {
  type: NoticeType;
  /** Short, shown in capitals. English: it goes through t() here. */
  headline: string;
  /** One quiet line beneath, optional. English. */
  reason?: string;
  /** What the corner log says if the centre could not (or no longer can) show it. Defaults to headline · reason. */
  corner?: string;
  /** Repeat key: the same key is not shown again inside GAP. Defaults to the type and headline. */
  key?: string;
}

const RANK: Record<NoticeType, number> = { arrival: 0, warning: 1, denied: 2 };
/** Seconds on screen, and before the same message may come again. */
export const SECS = 4;
export const GAP = 8;

export class Notifier {
  private left = 0;
  private cur: Notice | null = null;
  private readonly seen = new Map<string, number>();

  constructor(private readonly el: () => HTMLElement, private readonly toCorner: (line: string) => void) {}

  /** Show `n` now, queue nothing: a lower one that meets a higher one goes to the corner. */
  notify(n: Notice, now: number): void {
    const key = n.key ?? `${n.type}:${n.headline}`;
    const last = this.seen.get(key);
    if (last !== undefined && now - last < GAP) return;
    this.seen.set(key, now);
    if (this.cur && this.left > 0) {
      if (RANK[n.type] < RANK[this.cur.type]) { this.toCorner(line(n)); return; }
      this.toCorner(line(this.cur));
    }
    this.cur = n;
    this.left = SECS;
    const el = this.el();
    el.querySelector('#notice-t')!.textContent = t(n.headline);
    const r = el.querySelector('#notice-s')!;
    r.textContent = n.reason ? t(n.reason) : '';
    el.className = n.type;
    void el.offsetWidth;
    el.classList.add('on');
  }

  step(dt: number): void {
    if (this.left > 0 && (this.left -= dt) <= 0) { this.cur = null; this.el().classList.remove('on'); }
  }
}

const line = (n: Notice): string => n.corner ?? (n.reason ? `${t(n.headline)} · ${t(n.reason)}` : t(n.headline));
