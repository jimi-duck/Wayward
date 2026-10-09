import { $, GUARD, keys, type PadEdges } from './dom';
import { t } from '../i18n';

// ── adrift ────────────────────────────────────────────────────────────────
// A wreck, in a few lines over the dark: the breach, the silence, the lamp of
// a Drift tug (or, on a total loss, no lamp). Any key or tap skips to the
// notice behind it. With reduced motion the lines simply appear, one after
// another, on the same timing.

/** Seconds each line stays. */
const BEAT = 2.2;

export type Scene = 'adrift' | 'lost';

/** The lines of each scene, one per beat. The first is the red kicker's own. */
export const SCENES: Record<Scene, { kick: string; lines: string[] }> = {
  adrift: {
    kick: 'Hull breach',
    lines: [
      'Every light goes out. The hold opens to the dark.',
      'The drive is cold. Nothing answers on any channel.',
      'A lamp, far off, sweeping slowly. A Drift tug, working the wrecks.',
      '“Salvage claim. We tow, you pay. The hold and your Krail.”',
    ],
  },
  lost: {
    kick: 'Total loss',
    lines: [
      'The hull is open to the stars. This time nothing is left to patch.',
      'The Drift tug takes what remains back to the gate it found you at.',
      'A new hull, the same file. The region lies ahead again.',
    ],
  },
};

export class Cutscene {
  private off: (() => void) | null = null;
  private timer = 0;
  private done: (() => void) | null = null;
  private opened = 0;

  get open(): boolean {
    return !$('drift').hidden;
  }

  play(scene: Scene, onDone: () => void): void {
    this.end(false);
    const S = SCENES[scene];
    this.done = onDone;
    this.opened = performance.now();
    $('dr-k').textContent = t(S.kick);
    const box = $('drift');
    box.classList.toggle('tug', scene === 'adrift');
    box.hidden = false;
    let i = 0;
    const next = () => {
      if (i >= S.lines.length) return this.end(true);
      const line = $('dr-l');
      line.classList.remove('in');
      void line.offsetWidth;
      line.textContent = t(S.lines[i++]!);
      line.classList.add('in');
      // the tug's lamp is the teal beat; the rest is the breach
      const tug = scene === 'adrift' && i >= 3;
      box.classList.toggle('tug', tug);
      $('dr-k').textContent = t(tug ? 'Drift tug' : S.kick);
      this.timer = window.setTimeout(next, BEAT * 1000);
    };
    next();
    // the key or tap that ended the sortie must not skip it: a short guard first
    const skip = () => { if (performance.now() - this.opened >= GUARD) this.end(true); };
    this.off = keys(() => (skip(), true));
    box.onpointerdown = (e) => { e.stopPropagation(); skip(); };
  }

  padInput(p: PadEdges): void {
    if (this.open && p.a && performance.now() - this.opened >= GUARD) this.end(true);
  }

  /** Close the scene; `go` runs what comes after (not when a new scene replaces it). */
  private end(go: boolean): void {
    clearTimeout(this.timer);
    this.off?.();
    this.off = null;
    $('drift').hidden = true;
    const fn = this.done;
    this.done = null;
    if (go) fn?.();
  }
}
