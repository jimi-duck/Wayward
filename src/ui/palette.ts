// The brand palette for what the UI draws itself (canvas and SVG). Every value
// comes from the `ui` section of brand/system/tokens.json, the same list that
// writes src/styles/tokens.css. Brand v1.1, muted: a steel blue is the
// player's hand, teal is information, red is the threat and nothing else,
// white is readability. Amber is left to krail and the caution tone.
import brand from '../../brand/system/tokens.json';

const TOKENS = new Map(brand.ui.tokens.map((t) => [t.name, t.value.toLowerCase()]));

/** A token's hex, for canvas and inline styles. */
export const hex = (name: string): string => {
  const v = TOKENS.get(name);
  if (!v) throw new Error(`no ui token "${name}"`);
  return v;
};

/** An `r,g,b` triple, for `rgba(${c},alpha)`. */
export type Rgb = string;

/** A token's `r,g,b` triple. */
export const rgbOf = (name: string): Rgb => {
  const h = hex(name);
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
};

export const RGB = {
  void: rgbOf('void'),
  white: rgbOf('white'),
  ink: rgbOf('ink-body'),
  amber: rgbOf('blue'),
  caution: rgbOf('caution'),
  teal: rgbOf('teal'),
  red: rgbOf('alert-red'),
  alert: rgbOf('alert'),
  alertText: rgbOf('alert-text'),
  krail: rgbOf('krail'),
  dust: rgbOf('dust'),
  green: rgbOf('hazard-green'),
} satisfies Record<string, Rgb>;

export const rgba = (c: Rgb, a: number) => `rgba(${c},${a})`;

/** Solid colours, tuned to read on the void as text and marks. */
export const INK = {
  white: hex('ink'),
  white2: hex('ink-2'),
  amber: hex('blue'),   // the player's blue; the name is older than the palette
  amberHi: hex('blue-hi'),
  caution: hex('caution'),
  goal: hex('goal'),   // the objective: the one yellow mark
  teal: hex('teal-hi'),
  red: hex('alert'),
  redText: hex('alert-text'),
  dust: hex('ink-3'),
  green: hex('green'),
  krail: hex('krail'),
  cyrite: hex('cyrite'),
  anomaly: hex('anomaly'),
  paper: hex('ink-hi'),
} as const;

/** The display faces, for canvas text. */
export const FONT = {
  rail: '"Space Grotesk", system-ui, sans-serif',
  mono: '"Share Tech Mono", ui-monospace, monospace',
} as const;
