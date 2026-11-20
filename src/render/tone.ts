import { ACESFilmicToneMapping, AgXToneMapping, NeutralToneMapping, type ToneMapping } from 'three';
import { ToneMappingMode } from 'postprocessing';

// ── the tone map ──────────────────────────────────────────────────────────
// The one curve that turns the HDR picture into screen colour. ACES is the default; `?tone=agx` or `?tone=neutral`
// swaps it everywhere (the post chain, the low tier's direct draw, the readout), for a side-by-side.
// AgX keeps a fireball orange as it brightens and deep blue blue, where ACES pulls them toward yellow and violet.

export type ToneName = 'aces' | 'agx' | 'neutral';

export function toneName(): ToneName {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('tone');
  return q === 'agx' || q === 'neutral' ? q : 'aces';
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
