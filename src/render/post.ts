import {
  BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from 'three';
import type { QualityTier } from './quality';

// Bloom is what turns HDR colour into light: engine ports, nacelle strips,
// dilithium veins, phaser bolts, explosions. Only colours well above white
// bloom (a high threshold), so hulls and rock faces never do. Tone mapping
// runs last, so everything before it can stay in HDR.
//
// The low tier skips the composer entirely: the renderer tone-maps directly
// and nothing blooms, which costs a lot of glow and saves a lot of fill.

export class Post {
  readonly composer: EffectComposer | null;
  private readonly bloom: BloomEffect | null = null;

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera, tier: QualityTier) {
    if (tier.name === 'low') {
      this.composer = null;
      return;
    }
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: tier.msaa ? 4 : 0 });
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.62, luminanceSmoothing: 0.25, intensity: 1.35, radius: 0.72 });
    if (tier.name === 'medium') this.bloom.resolution.scale = 0.5;
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.62 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.composer.addPass(new EffectPass(camera, this.bloom, vignette, tone));
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
