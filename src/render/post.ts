import {
  BlendFunction, BloomEffect, EffectComposer, EffectPass, NoiseEffect, RenderPass, SMAAEffect, SMAAPreset,
  ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from 'three';
import type { QualityTier } from './quality';

// Bloom is what turns HDR colour into light: engines, lava, lances,
// explosions. Only colours well above white bloom (a high threshold), so
// hulls and rock faces never do. Then a heavy vignette and a little film
// grain, for the grit. Tone mapping runs last, so everything before it can
// stay in HDR. All in one pass.
//
// Anti-aliasing is SMAA on Medium (light) and High (full), not multisampling: a multisampled
// half-float chain drew nothing but black on some GPUs and canvas sizes.
// (A chromatic split on hits was tried and dropped for the same reason:
// postprocessing's effect blacks out the frame while its offset is zero.)
//
// The low tier skips the composer entirely: the renderer tone-maps directly
// and nothing blooms, which costs a lot of glow and saves a lot of fill.

export class Post {
  readonly composer: EffectComposer | null;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera, tier: QualityTier) {
    if (tier.name === 'low') {
      this.composer = null;
      return;
    }
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
    this.composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.7, luminanceSmoothing: 0.25, intensity: 1.25, radius: 0.7 });
    // half resolution on every tier: mipmap blur hides it, and it is cheaper
    bloom.resolution.scale = 0.5;
    const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.72 });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    grain.blendMode.opacity.value = 0.06;
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    if (tier.smaa) this.composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: tier.smaa === 'high' ? SMAAPreset.HIGH : SMAAPreset.LOW })));
    this.composer.addPass(new EffectPass(camera, bloom, vignette, grain, tone));
  }

  setSize(width: number, height: number): void {
    this.composer?.setSize(width, height, false);
  }

  render(dt: number): boolean {
    if (!this.composer) return false;
    this.composer.render(dt);
    return true;
  }
}
