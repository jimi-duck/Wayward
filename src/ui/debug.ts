import type { WebGLRenderer } from 'three';
import type { Input } from '../input/input';
import type { QualityGovernor } from '../render/quality';

// A readout for development milestones: frame rate, quality tier, render cost
// and live input. Toggle with the ` key, or start hidden with ?debug=0.
// Written to the DOM four times a second, not every frame.

const EVERY = 0.25;

export class DebugOverlay {
  private fps = 60;
  private since = EVERY;
  private steps = 0;

  constructor(
    private readonly el: HTMLElement,
    visible: boolean,
  ) {
    el.hidden = !visible;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && !e.repeat) el.hidden = !el.hidden;
    });
  }

  /** Count one simulation step. */
  step(): void {
    this.steps++;
  }

  frame(
    dt: number,
    renderer: WebGLRenderer,
    quality: QualityGovernor,
    input: Input,
    paused: boolean,
  ): void {
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.08;
    this.since += dt;
    if (this.el.hidden || this.since < EVERY) return;
    const stepsPerSec = this.steps / this.since;
    this.since = 0;
    this.steps = 0;

    const { calls, triangles } = renderer.info.render;
    const c = renderer.domElement;
    const f = input.last;
    const aim = f?.aim ? `${deg(f.aim.angle)}° × ${f.aim.mag.toFixed(2)}` : '—';
    this.el.textContent = [
      `M0 · debug${paused ? ' · PAUSED' : ''}`,
      `fps ${this.fps.toFixed(0)} · sim ${stepsPerSec.toFixed(0)}/s · avg ${(quality.average * 1000).toFixed(1)}ms`,
      `tier ${quality.tier.name} · dpr ${renderer.getPixelRatio()} · ${c.width}×${c.height}`,
      `draws ${calls} · tris ${triangles}`,
      `input ${input.device} · turn ${f?.turn ?? 0} · thrust ${(f?.thrust ?? 0).toFixed(2)}`,
      `aim ${aim}`,
      input.device === 'touch'
        ? 'drag anywhere to steer'
        : '←/→ or A/D to steer · Esc to pause · ` to hide',
    ].join('\n');
  }
}

function deg(rad: number): string {
  return ((rad * 180) / Math.PI).toFixed(0);
}
