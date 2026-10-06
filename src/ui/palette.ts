// The brand palette for what the UI draws itself (canvas and SVG), matching
// the tokens at the top of styles/main.css. Brand v1.1: amber is the Wayward
// and the player's hand, teal is information, red is the threat and nothing
// else, white is readability.

/** An `r,g,b` triple, for `rgba(${c},alpha)`. */
export type Rgb = string;

export const RGB = {
  void: '8,13,14',
  white: '216,213,198',
  amber: '217,154,39',
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
  amber: '#e5a93a',
  amberHi: '#f2b84a',
  teal: '#4cc2cb',
  red: '#e0574b',
  dust: '#757a74',
  green: '#9db35a',
  krail: '#e8bf6a',
  cyrite: '#b590f2',
} as const;

/** The display faces, for canvas text. */
export const FONT = {
  rail: '"Barlow Condensed", "Arial Narrow", sans-serif',
  mono: '"Share Tech Mono", ui-monospace, monospace',
} as const;
