import { CAMERA_VIEWS, type CameraView } from '../render/camera';
import { t } from '../i18n';
import type { Haptics } from './haptics';

// ── the player's device settings ──────────────────────────────────────────
// Kept per device in localStorage, shown in two places that must agree: the title's Settings (`s-…`) and the pause
// card (`p-…`). Touch-only rows hide on a mouse. Moved out of main.ts's boot() as it was (2026-11-27).

const store = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const keep = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* not kept */ } };

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from index.html`);
  return node as T;
}

const SIZES = ['normal', 'large', 'small'] as const;
type Size = (typeof SIZES)[number];
// Wide is the cinematic rig; the old Engine level view was folded into it when the card got its three buttons
const VIEW_NAMES: Record<CameraView, string> = { chase: 'Chase', cinematic: 'Wide', cockpit: 'Cockpit' };
const LEFTY_KEY = 'wayward.lefty';

/** A row's switch, on both cards: lit when on, its value word beside it. */
function paintSwitch(ids: readonly string[], on: boolean, label: string): void {
  for (const id of ids) {
    el(id).classList.toggle('on', on);
    el(id).setAttribute('aria-pressed', String(on));
    el(`${id}-v`).textContent = t(label);
  }
}

export class DevicePrefs {
  /** Fire on its own at a locked target (touch). */
  autoFire = store('wayward.autofire') === '1';
  /** Left-handed (touch): the stick on the right, the buttons on the left. */
  lefty = store(LEFTY_KEY) === '1';
  /** The stick: floating (comes to the thumb, the default) or fixed (stays bottom left). */
  fixedStick = store('wayward.stick') === 'fixed';
  size: Size = SIZES.find((x) => x === store('wayward.btnsize')) ?? 'normal';
  /** The compact HUD: on by default on a touch screen (2026-11-23), where the HUD needs the room more than the extra lines. */
  compact: boolean;
  /** The pause card's camera buttons. */
  readonly camButtons = [...document.querySelectorAll<HTMLButtonElement>('#p-cam button[data-view]')];

  constructor(private readonly coarse: boolean, private readonly haptics: Haptics, private readonly rig: { view: CameraView }) {
    this.compact = coarse ? store('wayward.compact') !== '0' : store('wayward.compact') === '1';
    // the camera view: chase by default; an old 'low' (Engine level) is now Wide
    const saved = store('wayward.view') === 'low' ? 'cinematic' : store('wayward.view');
    rig.view = (CAMERA_VIEWS as readonly string[]).includes(saved ?? '') ? (saved as CameraView) : 'chase';
  }

  /** Paint every row (at start, and again when the language changes). */
  paint(): void {
    this.paintLefty();
    this.paintTouch();
    this.paintCompact();
    this.paintView();
  }

  paintTouch(): void {
    const { coarse, haptics, size } = this;
    for (const x of SIZES) document.documentElement.classList.toggle(`btn-${x}`, size === x && x !== 'normal');
    for (const [id, on, label] of [['autofire', this.autoFire, this.autoFire ? 'On' : 'Off'], ['buzz', haptics.on, haptics.on ? 'On' : 'Off'], ['btnsize', size !== 'normal', size === 'large' ? 'Large' : size === 'small' ? 'Small' : 'Normal']] as const) {
      paintSwitch([`s-${id}`, `p-${id}`], on, label);
    }
    document.documentElement.classList.toggle('stick-fixed', this.fixedStick);
    for (const pre of ['s-', 'p-']) {
      el(pre + 'stick').setAttribute('aria-pressed', String(this.fixedStick));
      el(`${pre}stick-v`).textContent = t(this.fixedStick ? 'Fixed' : 'Floating');
    }
    for (const id of ['s-autofire', 's-btnsize', 's-stick']) el(id).hidden = !coarse;
    el('p-stick-r').hidden = !coarse;
    for (const id of ['p-autofire-r', 'p-btnsize-r']) el(id).hidden = !coarse;
    // vibration only where the browser has it (never an iPhone)
    el('s-buzz').hidden = el('p-buzz-r').hidden = !coarse || !haptics.available;
  }

  paintView(): void {
    el('s-view-v').textContent = t(VIEW_NAMES[this.rig.view]);
    for (const b of this.camButtons) {
      const on = b.dataset.view === this.rig.view;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  }

  paintCompact(): void {
    document.documentElement.classList.toggle('compact-hud', this.compact);
    paintSwitch(['s-compact', 'p-compact'], this.compact, this.compact ? 'On' : 'Off');
    el('s-compact').hidden = !this.coarse;
    el('p-compact-r').hidden = !this.coarse;
  }

  paintLefty(): void {
    document.documentElement.classList.toggle('lefty', this.lefty);
    paintSwitch(['s-lefty', 'p-lefty'], this.lefty, this.lefty ? 'On' : 'Off');
    el('s-lefty').hidden = !this.coarse;
    el('p-lefty-r').hidden = !this.coarse;
  }

  setView(v: CameraView): void {
    this.rig.view = v;
    keep('wayward.view', v);
    this.paintView();
  }

  nextView(dir = 1): void {
    const n = CAMERA_VIEWS.length;
    this.setView(CAMERA_VIEWS[(CAMERA_VIEWS.indexOf(this.rig.view) + dir + n) % n]!);
  }

  setLefty(on: boolean): void {
    this.lefty = on;
    keep(LEFTY_KEY, on ? '1' : '0');
    this.paintLefty();
  }

  toggleAuto(): void { this.autoFire = !this.autoFire; keep('wayward.autofire', this.autoFire ? '1' : '0'); this.paintTouch(); }
  nextSize(): void { this.size = SIZES[(SIZES.indexOf(this.size) + 1) % SIZES.length]!; keep('wayward.btnsize', this.size); this.paintTouch(); }
  toggleCompact(): void { this.compact = !this.compact; keep('wayward.compact', this.compact ? '1' : '0'); this.paintCompact(); }
  toggleStick(): void { this.fixedStick = !this.fixedStick; keep('wayward.stick', this.fixedStick ? 'fixed' : 'float'); this.paintTouch(); }
  toggleBuzz(): void { this.haptics.toggle(); this.paintTouch(); }
}
