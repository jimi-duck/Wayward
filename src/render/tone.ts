import { ACESFilmicToneMapping, AgXToneMapping, NeutralToneMapping, type ToneMapping } from 'three';
import { ToneMappingMode } from 'postprocessing';

// ── the tone map ──────────────────────────────────────────────────────────
// The one curve that turns the HDR picture into screen colour. Khronos PBR Neutral, the owner's pick (2026-11-20): it
// keeps a material's own colour and saturation through the mid tones and rolls the highlights off late. `?tone=aces`
// or `?tone=agx` swaps it everywhere (the post chain, the low tier's direct draw, the readout), for a side-by-side.

export type ToneName = 'aces' | 'agx' | 'neutral';

export function toneName(): ToneName {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('tone');
  return q === 'agx' || q === 'aces' ? q : 'neutral';
}

/** The renderer's own tone map, for the draw that skips the post chain. */
export function rendererTone(): ToneMapping {
  const t = toneName();
  return t === 'agx' ? AgXToneMapping : t === 'neutral' ? NeutralToneMapping : ACESFilmicToneMapping;
}

/** The post chain's tone map. */
export function postTone(): ToneMappingMode {
  const t = toneName();
  return t === 'agx' ? ToneMappingMode.AGX : t === 'neutral' ? ToneMappingMode.NEUTRAL : ToneMappingMode.ACES_FILMIC;
}
