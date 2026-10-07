import type { GameEvent } from '../sim/events';

// ── sound and touch feedback ───────────────────────────────────────────────
// Every sound is made here from oscillators and a burst of noise: no files to
// download. The app hands each frame's events to `Feel.events`; nothing here
// reads back into the simulation. Quiet by design: short, low, one voice per
// kind at a time, and a master level well under the clipping point.
// The context starts on the first tap or key (browsers refuse earlier). Sound
// and haptics are the player's choice, kept in their own small record.

const KEY = 'wayward.feel.v1';

export interface FeelPrefs {
  sound: boolean;
  haptics: boolean;
}

export function loadPrefs(): FeelPrefs {
  const fresh: FeelPrefs = { sound: true, haptics: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh;
    const p = JSON.parse(raw) as Partial<FeelPrefs>;
    return { sound: p.sound !== false, haptics: p.haptics !== false };
  } catch {
    return fresh;
  }
}

function savePrefs(p: FeelPrefs): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage refused: the choice lasts this session */ }
}

interface Tone {
  /** Start and end pitch in Hz; a glide when they differ. */
  f: number;
  to?: number;
  /** Seconds. */
  d: number;
  /** Peak level, 0 to 1. */
  v: number;
  type?: OscillatorType;
  /** Seconds to wait before the tone starts. */
  at?: number;
}

/** One cue: a few tones and, optionally, a burst of noise. */
interface Cue {
  tones: Tone[];
  noise?: { d: number; v: number; lo?: number; hi?: number };
  /** Least seconds between two plays of this cue. */
  gap: number;
  /** A phone buzz in ms, if the cue has one. */
  buzz?: number | number[];
}

const CUES: Record<string, Cue> = {
  bolt: { tones: [{ f: 880, to: 440, d: 0.05, v: 0.05, type: 'square' }], gap: 0.09 },
  hitRock: { tones: [{ f: 160, to: 90, d: 0.09, v: 0.12, type: 'triangle' }], noise: { d: 0.06, v: 0.08, lo: 600, hi: 3000 }, gap: 0.06 },
  breakRock: { tones: [{ f: 120, to: 50, d: 0.22, v: 0.2, type: 'triangle' }], noise: { d: 0.22, v: 0.16, lo: 200, hi: 2000 }, gap: 0.05 },
  breakShip: { tones: [{ f: 190, to: 40, d: 0.32, v: 0.22, type: 'sawtooth' }], noise: { d: 0.3, v: 0.2, lo: 150, hi: 2500 }, gap: 0.05, buzz: 18 },
  blast: { tones: [{ f: 90, to: 30, d: 0.5, v: 0.28, type: 'triangle' }], noise: { d: 0.45, v: 0.22, lo: 100, hi: 1800 }, gap: 0.1, buzz: 40 },
  hull: { tones: [{ f: 110, to: 55, d: 0.3, v: 0.3, type: 'sawtooth' }], noise: { d: 0.18, v: 0.2, lo: 100, hi: 1200 }, gap: 0.2, buzz: [60, 30, 60] },
  shield: { tones: [{ f: 520, to: 260, d: 0.18, v: 0.14, type: 'sine' }, { f: 780, to: 390, d: 0.14, v: 0.08, type: 'sine' }], gap: 0.15, buzz: 30 },
  shieldUp: { tones: [{ f: 330, to: 660, d: 0.25, v: 0.12, type: 'sine' }], gap: 0.3 },
  pick: { tones: [{ f: 880, d: 0.08, v: 0.09, type: 'sine' }, { f: 1320, d: 0.12, v: 0.08, type: 'sine', at: 0.06 }], gap: 0.05 },
  power: { tones: [{ f: 440, to: 880, d: 0.2, v: 0.12, type: 'triangle' }, { f: 660, to: 1320, d: 0.2, v: 0.08, type: 'sine', at: 0.08 }], gap: 0.2 },
  fit: { tones: [{ f: 70, to: 45, d: 0.2, v: 0.3, type: 'triangle' }], noise: { d: 0.05, v: 0.1, lo: 300, hi: 1500 }, gap: 0.15 },
  horn: { tones: [{ f: 82, d: 0.9, v: 0.2, type: 'sawtooth' }, { f: 123, d: 0.9, v: 0.1, type: 'sawtooth' }], gap: 2 },
  hail: { tones: [{ f: 660, d: 0.12, v: 0.09, type: 'sine' }, { f: 495, d: 0.2, v: 0.09, type: 'sine', at: 0.16 }], gap: 1 },
  // the radio: a call is two soft tones (a third, higher, when it is a priority); chatter is one squelch
  call: { tones: [{ f: 520, d: 0.09, v: 0.06, type: 'sine' }, { f: 660, d: 0.12, v: 0.06, type: 'sine', at: 0.11 }], noise: { d: 0.05, v: 0.03, lo: 1500, hi: 4000 }, gap: 2, buzz: 20 },
  callPrio: { tones: [{ f: 520, d: 0.09, v: 0.07, type: 'sine' }, { f: 660, d: 0.09, v: 0.07, type: 'sine', at: 0.11 }, { f: 880, d: 0.14, v: 0.07, type: 'sine', at: 0.22 }], noise: { d: 0.05, v: 0.03, lo: 1500, hi: 4000 }, gap: 2, buzz: [25, 40, 25] },
  ping: { tones: [{ f: 740, d: 0.05, v: 0.035, type: 'sine' }], noise: { d: 0.12, v: 0.025, lo: 1200, hi: 3500 }, gap: 3 },
  break: { tones: [{ f: 300, to: 90, d: 0.45, v: 0.14, type: 'sawtooth' }], noise: { d: 0.45, v: 0.14, lo: 400, hi: 3000 }, gap: 0.5, buzz: [25, 20, 25] },
  jump: { tones: [{ f: 60, to: 600, d: 0.7, v: 0.2, type: 'sawtooth' }], noise: { d: 0.7, v: 0.12, lo: 200, hi: 4000 }, gap: 1 },
  win: { tones: [{ f: 440, d: 0.3, v: 0.12, type: 'triangle' }, { f: 554, d: 0.3, v: 0.12, type: 'triangle', at: 0.15 }, { f: 659, d: 0.6, v: 0.14, type: 'triangle', at: 0.3 }], gap: 1 },
};

/** Which cue an event calls for, if any. */
function cueFor(e: GameEvent): string | undefined {
  switch (e.type) {
    case 'bolt': return 'bolt';
    case 'rockHit': case 'alienHit': case 'bulwarkHit': case 'bossHit': return 'hitRock';
    case 'rockDestroyed': case 'bulwarkBroken': case 'rockCut': return 'breakRock';
    case 'alienDestroyed': case 'bossDestroyed': return 'breakShip';
    case 'blast': case 'overcharge': return 'blast';
    case 'shipHit': return 'hull';
    case 'shieldHit': return 'shield';
    case 'shieldUp': return 'shieldUp';
    case 'pickup': case 'crystal': case 'cyrite': case 'ore': case 'parts': return 'pick';
    case 'power': return 'power';
    case 'fitted': return 'fit';
    case 'bossArrive': case 'bossWarn': return 'horn';
    case 'hail': case 'comms': return 'hail';
    case 'call': return e.tier === 'important' ? 'callPrio' : 'call';
    case 'ping': return 'ping';
    case 'jumped': return 'jump';
    case 'break': return 'break';
    default: return undefined;
  }
}

export class Feel {
  prefs = loadPrefs();
  /** Set from the reduced-motion preference: no buzzing for those who asked for less. */
  reduceMotion = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private last = new Map<string, number>();

  constructor() {
    // browsers only allow sound after a gesture
    const wake = () => { this.start(); };
    addEventListener('pointerdown', wake, { once: true });
    addEventListener('keydown', wake, { once: true });
  }

  /** Make or resume the audio context. Safe to call again. */
  start(): void {
    if (!this.prefs.sound) return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setSound(on: boolean): void {
    this.prefs.sound = on;
    savePrefs(this.prefs);
    if (on) this.start();
    else if (this.ctx) void this.ctx.suspend();
  }

  setHaptics(on: boolean): void {
    this.prefs.haptics = on;
    savePrefs(this.prefs);
    if (on) this.buzz(25);
  }

  /** A phone can buzz; a desktop browser cannot. */
  get canBuzz(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  events(list: readonly GameEvent[]): void {
    for (const e of list) {
      const id = cueFor(e);
      if (id) this.play(id);
    }
  }

  /** The win beat: a short rising figure. */
  win(): void { this.play('win'); }

  play(id: string): void {
    const cue = CUES[id];
    if (!cue) return;
    const now = performance.now() / 1000;
    if (now - (this.last.get(id) ?? -9) < cue.gap) return;
    this.last.set(id, now);
    if (cue.buzz !== undefined) this.buzz(cue.buzz);
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.prefs.sound || ctx.state !== 'running') return;
    const t0 = ctx.currentTime;
    for (const tone of cue.tones) this.tone(ctx, this.master, t0 + (tone.at ?? 0), tone);
    if (cue.noise) this.hiss(ctx, this.master, t0, cue.noise);
  }

  private buzz(pattern: number | number[]): void {
    if (!this.prefs.haptics || this.reduceMotion || !this.canBuzz) return;
    try { navigator.vibrate(pattern); } catch { /* some browsers refuse without a gesture */ }
  }

  private tone(ctx: AudioContext, out: AudioNode, at: number, T: Tone): void {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = T.type ?? 'sine';
    osc.frequency.setValueAtTime(T.f, at);
    if (T.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, T.to), at + T.d);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(T.v, at + Math.min(0.01, T.d / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, at + T.d);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + T.d + 0.02);
  }

  private hiss(ctx: AudioContext, out: AudioNode, at: number, N: NonNullable<Cue['noise']>): void {
    if (!this.noise) {
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = Math.sqrt((N.lo ?? 200) * (N.hi ?? 2000));
    band.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(N.v, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + N.d);
    src.connect(band).connect(g).connect(out);
    src.start(at);
    src.stop(at + N.d + 0.02);
  }
}
