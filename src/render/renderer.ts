import { ACESFilmicToneMapping, NoToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import type { QualityTier } from './quality';

// Medium and high tiers render through the post chain, which anti-aliases
// and tone-maps itself; only the low tier asks the renderer to do either.
export function createRenderer(canvas: HTMLCanvasElement, tier: QualityTier): WebGLRenderer {
  const direct = tier.name === 'low';
  const renderer = new WebGLRenderer({
    canvas,
    antialias: direct && tier.msaa,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  // The link check asks the driver for each program's log the first time it is used, which
  // makes the browser finish compiling right there, in the frame. Shipped shaders do not
  // need it; ?debug=1 and the dev server keep it for anyone writing one.
  renderer.debug.checkShaderErrors = import.meta.env.DEV || new URLSearchParams(location.search).get('debug') === '1';
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = direct ? ACESFilmicToneMapping : NoToneMapping;
  return renderer;
}

/** Keep the renderer's own tone mapping in step with whether the post chain runs. */
export function matchTier(renderer: WebGLRenderer, tier: QualityTier): void {
  renderer.toneMapping = tier.name === 'low' ? ACESFilmicToneMapping : NoToneMapping;
}

/**
 * Size the drawing buffer to the canvas's CSS box at the tier's pixel-ratio
 * cap. Returns the ratio used. Fill cost goes with the square of the ratio,
 * so on a 3x phone the cap is the single cheapest protection there is.
 */
export function fitRenderer(renderer: WebGLRenderer, tier: QualityTier): number {
  const canvas = renderer.domElement;
  const dpr = Math.min(window.devicePixelRatio || 1, tier.dprCap);
  renderer.setPixelRatio(dpr);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  return dpr;
}
