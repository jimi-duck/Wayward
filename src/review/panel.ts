import type { Sector } from '../render/sector';
import { PALETTE_COUNT, skyIn } from '../render/sky';
import type { World } from '../sim/world';
import { GROUPS, type Gallery, type Group, type Label } from './gallery';
import './review.css';

// ── the review world's menu and labels ────────────────────────────────────
// A tab on the left edge opens a drawer: which group, which stop, which sky.
// The names on things are small teal tags laid over the view, only for the
// current stop and only while the ship is near. Keys: [ and ] for the
// previous and next stop, V for the next sky, H to hide the names. English
// only: a tool for whoever builds the game (docs/REVIEW.md).

const SKY_NAMES = ['The Reach', 'The Marches', 'The Hollows', 'Violet deep', 'Ice blue'];
const MAX_LABELS = 28;

export class ReviewPanel {
  private readonly root: HTMLElement;
  private readonly drawer: HTMLElement;
  private readonly labels: HTMLElement;
  private readonly tags: HTMLDivElement[] = [];
  private group: Group = 'ships';
  private palette = 0;
  private seed = 1;
  private names = true;
  private readonly pool: HTMLDivElement[] = [];

  constructor(app: HTMLElement, private readonly world: World, private readonly gallery: Gallery, private readonly sector: Sector) {
    this.root = app;
    // the arcade's goals mean nothing here: the page's CSS puts them away
    document.documentElement.classList.add('review');
    this.labels = Object.assign(document.createElement('div'), { id: 'rv-labels' });
    this.drawer = Object.assign(document.createElement('div'), { id: 'rv' });
    const tab = Object.assign(document.createElement('button'), { id: 'rv-btn', type: 'button', textContent: 'Review' });
    tab.setAttribute('aria-label', 'Open the review menu');
    app.append(this.labels, this.drawer, tab);
    // the touch layer and the pause key must not take these presses
    for (const el of [tab, this.drawer]) {
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    }
    tab.addEventListener('click', () => this.open(true));
    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.code === 'BracketRight') { this.gallery.step(1); this.group = this.gallery.current.group; this.render(); e.preventDefault(); }
      else if (e.code === 'BracketLeft') { this.gallery.step(-1); this.group = this.gallery.current.group; this.render(); e.preventDefault(); }
      else if (e.code === 'KeyV') { this.sky((this.palette + 1) % PALETTE_COUNT); e.preventDefault(); }
      else if (e.code === 'KeyH') { this.names = !this.names; this.labels.classList.toggle('off', !this.names); e.preventDefault(); }
    });
    this.sky(0);
    this.render();
  }

  private open(on: boolean): void {
    this.drawer.classList.toggle('on', on);
    document.getElementById('rv-btn')!.classList.toggle('on', on);
  }

  private sky(palette: number, reseed = false): void {
    this.palette = palette;
    this.seed = reseed ? this.seed + 1 : this.seed;
    this.sector.setBackdrop(skyIn(this.seed, palette));
    this.render();
  }

  private render(): void {
    const g = this.gallery;
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, props: Partial<HTMLElementTagNameMap[K]> = {}) => Object.assign(document.createElement(tag), props, text !== undefined ? { textContent: text } : {});
    const button = (text: string, on: () => void, pressed?: boolean) => {
      const b = make('button', text, { type: 'button' });
      if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed));
      b.addEventListener('click', on);
      return b;
    };
    const head = make('div', undefined, { className: 'rv-row' });
    head.append(button('Close', () => this.open(false)), button('◀ Prev', () => { g.step(-1); this.group = g.current.group; this.render(); }), button('Next ▶', () => { g.step(1); this.group = g.current.group; this.render(); }));
    const groups = make('div', undefined, { className: 'rv-row' });
    for (const gr of GROUPS) groups.append(button(gr.name, () => { this.group = gr.id; this.render(); }, this.group === gr.id));
    const list = make('div', undefined, { className: 'rv-stops' });
    for (const s of g.stops.filter((x) => x.group === this.group)) list.append(button(s.name, () => { g.go(s.id); this.render(); }, g.current.id === s.id));
    const skies = make('div', undefined, { className: 'rv-row' });
    SKY_NAMES.forEach((n, i) => skies.append(button(n, () => this.sky(i), this.palette === i)));
    skies.append(button('Another sky', () => this.sky(this.palette, true)));
    this.drawer.replaceChildren(
      make('h2', 'Review world'),
      make('p', `${g.current.name}`, { className: 'rv-k' }),
      make('p', g.current.note, { className: 'rv-note' }),
      head,
      make('p', 'Show', { className: 'rv-k' }), groups, list,
      make('p', 'Background', { className: 'rv-k' }), skies,
      make('p', 'Fly with the usual keys or stick. Nothing here can hurt you. [ ] step through the stops, V changes the sky, H hides the names.', { className: 'rv-hint' }),
    );
  }

  /** Lay this frame's names over the view. */
  frame(): void {
    const s = this.world.ship;
    const cur = this.gallery.current.id;
    let n = 0;
    if (this.names) {
      const near: Array<{ l: Label; x: number; z: number; d: number }> = [];
      for (const l of this.gallery.labels) {
        if (l.stop !== cur) continue;
        // a far feature's name hangs in the sky ahead, where it rides
        const x = l.bearing === undefined ? l.x : s.x + Math.cos(l.bearing) * 3300;
        const z = l.bearing === undefined ? l.z : s.z - Math.sin(l.bearing) * 3300;
        const d = Math.hypot(x - s.x, z - s.z);
        if (d <= l.reach) near.push({ l, x, z, d });
      }
      near.sort((a, b) => a.d - b.d);
      for (const { l, x, z } of near) {
        if (n >= MAX_LABELS) break;
        const p = this.sector.project(x, l.y, z);
        if (!p) continue;
        const tag = this.tag(n++);
        tag.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
        const key = l.text + '|' + (l.sub ?? '');
        if (tag.dataset.k !== key) {
          tag.dataset.k = key;
          tag.replaceChildren(l.text, ...(l.sub ? [Object.assign(document.createElement('small'), { textContent: l.sub })] : []));
        }
      }
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i]!.hidden = true;
  }

  private tag(i: number): HTMLDivElement {
    let t = this.pool[i];
    if (!t) { t = document.createElement('div'); this.labels.append(t); this.pool.push(t); }
    t.hidden = false;
    return t;
  }
}
