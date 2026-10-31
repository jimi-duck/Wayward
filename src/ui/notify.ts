import { t } from '../i18n';

// ── the centre notice ─────────────────────────────────────────────────────
// Short, quiet messages low in the middle of the screen, between the
// crosshair and the ship (never the top: that is the way you are flying).
// The alert plate's own style (a glass plate, right-aligned capitals, a coloured
// headline over a white line), in a colour that says the kind. They never take input and fade on their
// own. Two at most are on screen; the rest wait their turn in order (a denial
// goes ahead of the others), and only a long backlog goes straight to the
// corner log. The persistent fact then lives in the alert corner, which the
// HUD derives from the world each frame; this only decides what the centre
// says and when.
//   denied  · muted red   · something is refused
//   warning · dull gold   · something is going wrong
//   arrival · calm teal   · a welcome, not an alarm

export type NoticeType = 'denied' | 'warning' | 'arrival';

export interface Notice {
  type: NoticeType;
  /** Short. English: it goes through t() here. */
  headline: string;
  /** One quiet line beneath, optional. English. */
  reason?: string;
  /** What the corner log says if the centre could not (or no longer can) show it. Defaults to headline · reason. */
  corner?: string;
  /** Repeat key: the same key is not shown again inside GAP. Defaults to the type and headline. */
  key?: string;
}

/** Where the notices are drawn: the HUD's plates, or a stand-in in a test. */
export interface NoticeView {
  /** Show one plate; the handle is passed back to `remove`. */
  add(type: NoticeType, headline: string, reason: string): unknown;
  remove(handle: unknown): void;
}

const RANK: Record<NoticeType, number> = { arrival: 0, warning: 1, denied: 2 };
/** Seconds on screen, and before the same message may come again. */
export const SECS = 4;
export const GAP = 8;
/** How many plates show at once, and how many wait before the oldest waiting one goes to the corner log. */
export const SHOWN = 2;
export const QUEUED = 8;

interface Slot { n: Notice; left: number; handle: unknown }

export class Notifier {
  private readonly shown: Slot[] = [];
  private readonly queue: Notice[] = [];
  private readonly seen = new Map<string, number>();

  constructor(private readonly view: NoticeView, private readonly toCorner: (line: string) => void) {}

  /** Show `n` now if there is room, else queue it behind the others (a higher kind goes ahead of a lower one). */
  notify(n: Notice, now: number): void {
    const key = n.key ?? `${n.type}:${n.headline}`;
    const last = this.seen.get(key);
    if (last !== undefined && now - last < GAP) return;
    this.seen.set(key, now);
    if (this.shown.length < SHOWN) { this.show(n); return; }
    let at = this.queue.length;
    while (at > 0 && RANK[this.queue[at - 1]!.type] < RANK[n.type]) at--;
    this.queue.splice(at, 0, n);
    if (this.queue.length > QUEUED) this.toCorner(line(this.queue.pop()!));
  }

  step(dt: number): void {
    for (const s of [...this.shown]) {
      if ((s.left -= dt) > 0) continue;
      this.shown.splice(this.shown.indexOf(s), 1);
      this.view.remove(s.handle);
    }
    while (this.shown.length < SHOWN && this.queue.length) this.show(this.queue.shift()!);
  }

  private show(n: Notice): void {
    this.shown.push({ n, left: SECS, handle: this.view.add(n.type, t(n.headline), n.reason ? t(n.reason) : '') });
  }
}

const line = (n: Notice): string => n.corner ?? (n.reason ? `${t(n.headline)} · ${t(n.reason)}` : t(n.headline));

/** The HUD's plates: one glass plate per message inside `#notice`, faded in and out by CSS. */
export class NoticePlates implements NoticeView {
  constructor(private readonly host: () => HTMLElement) {}

  add(type: NoticeType, headline: string, reason: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `nt glass ${type}`;
    const body = document.createElement('div');
    body.className = 'nt-b';
    const head = document.createElement('b');
    head.className = 'nt-t';
    head.textContent = headline;
    body.append(head);
    if (reason) {
      const why = document.createElement('span');
      why.className = 'nt-s';
      why.textContent = reason;
      body.append(why);
    }
    el.append(body);
    this.host().append(el);
    void el.offsetWidth;
    el.classList.add('on');
    return el;
  }

  remove(handle: unknown): void {
    const el = handle as HTMLElement;
    el.classList.remove('on');
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 180);
  }
}
