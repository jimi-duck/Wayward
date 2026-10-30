import { NOTE_8 } from '../content/legs';
import { authoredEnd, choices, choose, type Choice } from '../sim/endings';
import type { Journey } from '../sim/journey';
import { artImg } from './art';
import { $, GUARD, guarded, h, keys, type PadEdges } from './dom';
import { t } from '../i18n';

// ── the Threshold ─────────────────────────────────────────────────────────
// Through the last lane, the Severance file is still aboard. The panel shows
// all six endings: the open ones to choose (a number key, a tap, or the
// arrows and Enter), the shut ones with what they would have needed. A choice
// turns the panel to its epilogue, and the way on closes it.

export class EndingPanel {
  private off: (() => void) | null = null;
  private opened = 0;
  private sel = 0;
  private list: Choice[] = [];
  private onDone: (() => void) | null = null;
  private j: Journey | null = null;

  get open(): boolean {
    return !$('ending').hidden;
  }

  /** The choice. `onDone` runs once the epilogue has been read. */
  show(j: Journey, onDone: () => void): void {
    this.close();
    this.j = j;
    this.onDone = onDone;
    this.opened = performance.now();
    this.list = choices(j);
    this.sel = Math.max(0, this.list.findIndex((c) => c.open));
    // on the road, Ada's last note comes first: to Juno by name, or to whoever flies her if the implant was burned
    if (authoredEnd(j)) { this.note(j); return; }
    this.ask(j);
  }

  /** Ada's eighth note, before the choice. */
  private note(j: Journey): void {
    const n = j.carry.flags.includes('implant_burned') ? NOTE_8.burned : NOTE_8.kept;
    $('en-k').textContent = t('The Threshold');
    $('en-t').textContent = t(NOTE_8.title);
    $('en-s').textContent = '';
    $('en-l').replaceChildren();
    $('en-epi').replaceChildren(...n.lines.map((l) => h('p', '', t(l))), h('p', 'sign', t(n.sign)));
    $('ending').hidden = false;
    const go = $('en-go');
    go.hidden = false;
    go.onclick = guarded(this.opened, () => this.ask(j));
    go.onpointerdown = (e) => e.stopPropagation();
    this.noting = true;
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.ask(j), true;
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(e.code);
    });
  }
  private noting = false;

  /** The six endings, open and shut. */
  private ask(j: Journey): void {
    this.off?.();
    this.off = null;
    this.noting = false;
    this.opened = performance.now();
    $('en-k').textContent = `${t('The Threshold')} · ${t('day {n}', { n: Math.floor(j.day) + 1 })}`;
    $('en-t').textContent = t('What is the Severance file worth?');
    $('en-s').textContent = t('The chase is over, but the Severance file is still aboard.');
    $('en-go').hidden = true;
    $('en-epi').replaceChildren();
    $('ending').hidden = false;
    this.render();
    this.off = keys((e) => {
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
      if (i >= 0) return this.pick(i), true;
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') return this.move(-1), true;
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'Tab') return this.move(1), true;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.pick(this.sel), true;
      return ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyF', 'Escape'].includes(e.code);
    }, ['ArrowUp', 'ArrowDown']);
  }

  close(): void {
    this.off?.();
    this.off = null;
    $('ending').hidden = true;
  }

  padInput(p: PadEdges): void {
    if (!this.open || performance.now() - this.opened < GUARD) return;
    if (this.noting) { if (p.a && this.j) this.ask(this.j); return; }
    if (!$('en-go').hidden) { if (p.a) this.done(); return; }
    if (p.up || p.left) this.move(-1);
    else if (p.down || p.right) this.move(1);
    else if (p.a) this.pick(this.sel);
  }

  private render(): void {
    $('en-l').replaceChildren(...this.list.map((c, i) => {
      const li = h('li', `${c.open ? 'on' : 'shut'}${i === this.sel ? ' sel' : ''}`, '',
        h('b', '', `${i + 1} · ${t(c.def.name)}`), h('span', 'kind', t(c.open ? 'open' : 'shut')),
        h('p', '', t(c.def.pitch)), c.open ? null : h('p', 'need', t(c.def.needs)));
      if (c.open) {
        li.setAttribute('role', 'button');
        li.onclick = guarded(this.opened, () => this.pick(i));
        li.onpointerdown = (e) => e.stopPropagation();
      }
      return li;
    }));
  }

  private move(d: number): void {
    const n = this.list.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.sel + d * k + n * k) % n;
      if (this.list[i]?.open) { this.sel = i; break; }
    }
    this.render();
  }

  private pick(i: number): void {
    const c = this.list[i];
    if (!c?.open || !this.j) return;
    const lines = choose(this.j, c.def.id);
    if (!lines) return;
    this.off?.();
    this.opened = performance.now();
    $('en-k').textContent = t('Epilogue');
    $('en-t').textContent = t(c.def.name);
    $('en-s').textContent = t(c.def.pitch);
    $('en-l').replaceChildren();
    $('en-epi').replaceChildren(...[artImg('ending', c.def.id, 'en-pic')].filter((x): x is HTMLImageElement => !!x), ...lines.map((l) => h('p', '', t(l))));
    const go = $('en-go');
    go.hidden = false;
    go.onclick = guarded(this.opened, () => this.done());
    go.onpointerdown = (e) => e.stopPropagation();
    this.off = keys((e) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return this.done(), true;
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape'].includes(e.code);
    });
  }

  private done(): void {
    const fn = this.onDone;
    this.onDone = null;
    this.close();
    fn?.();
  }
}
