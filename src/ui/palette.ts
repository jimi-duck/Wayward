// The brand palette for what the UI draws itself (canvas and SVG), matching
// the tokens at the top of styles/main.css. Brand v1.1, muted: a steel blue is
// the player's hand, teal is information, red is the threat and nothing else,
// white is readability. Amber is left to krail and the caution tone.

/** An `r,g,b` triple, for `rgba(${c},alpha)`. */
export type Rgb = string;

export const RGB = {
  void: '8,13,14',
  white: '216,213,198',
  amber: '134,169,209',
  caution: '201,171,102',
  teal: '57,174,183',
  red: '201,74,63',
  dust: '89,97,96',
  green: '116,136,65',
} satisfies Record<string, Rgb>;

export const rgba = (c: Rgb, a: number) => `rgba(${c},${a})`;

/** Solid colours, tuned to read on the void as text and marks. */
export const INK = {
  white: '#e4e1d3',
  white2: '#a9a89c',
  amber: '#86a9d1',   // the player's blue; the name is older than the palette
  amberHi: '#b3cdea',
  caution: '#c9ab66',
  goal: '#f0c85a',   // the objective: the one yellow mark
  teal: '#4cc2cb',
  red: '#e0574b',
  dust: '#757a74',
  green: '#9db35a',
  krail: '#d8c48f',
  cyrite: '#b590f2',
} as const;

/** The display faces, for canvas text. */
export const FONT = {
  rail: '"Barlow Condensed", "Arial Narrow", sans-serif',
  mono: '"Share Tech Mono", ui-monospace, monospace',
} as const;
