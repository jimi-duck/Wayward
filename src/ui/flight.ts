import { HULLS, type HullId } from '../content/hulls';
import type { CameraMode } from '../sim/controls';
import { PX } from '../sim/tuning';
import type { World } from '../sim/world';

/** The flight-test panel: which hull, which camera. */
export class FlightPanel {
  private readonly hullBtns: HTMLButtonElement[];
  private readonly camBtns: HTMLButtonElement[];

  private readonly zoomV: HTMLElement | null;

  constructor(root: HTMLElement, onHull: (id: HullId) => void, onCam: (m: CameraMode) => void, onZoom: () => void) {
    this.zoomV = root.querySelector('#zoom-v');
    root.querySelector<HTMLButtonElement>('#zoom')?.addEventListener('click', (e) => { onZoom(); (e.currentTarget as HTMLElement).blur(); });
    this.hullBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-hull]')];
    this.camBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-cam]')];
    for (const b of this.hullBtns) b.addEventListener('click', () => { onHull(b.dataset.hull as HullId); b.blur(); });
    for (const b of this.camBtns) b.addEventListener('click', () => { onCam(b.dataset.cam as CameraMode); b.blur(); });
    // A tap on the panel must not also anchor the thumbstick underneath it.
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  showZoom(factor: number): void {
    if (this.zoomV) this.zoomV.textContent = `${factor.toFixed(1).replace('.0', '')}×`;
  }

  show(hull: HullId, mode: CameraMode): void {
    for (const b of this.hullBtns) b.setAttribute('aria-checked', String(b.dataset.hull === hull));
    for (const b of this.camBtns) b.setAttribute('aria-checked', String(b.dataset.cam === mode));
  }
}

/**
 * True values as texture: speed in the original game's px/s, heading as a
 * compass bearing (000 is up the screen, clockwise). Written ten times a
 * second, not every frame.
 */
export class Telemetry {
  private since = 1;

  constructor(private readonly hullEl: HTMLElement, private readonly dataEl: HTMLElement) {}

  showHull(id: HullId): void {
    const h = HULLS[id];
    this.hullEl.textContent = `${h.name} · ${h.role}`;
  }

  update(world: World, dt: number): void {
    this.since += dt;
    if (this.since < 0.1) return;
    this.since = 0;
    const s = world.ship;
    const vel = Math.round(Math.hypot(s.vx, s.vz) / PX);
    const deg = ((90 - (s.heading * 180) / Math.PI) % 360 + 360) % 360;
    this.dataEl.textContent = `VEL ${vel} · HDG ${String(Math.round(deg) % 360).padStart(3, '0')}${s.rollT >= 0 ? ' · ROLL' : ''}`;
  }
}
