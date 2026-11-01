import {
  Effect, BlendFunction, BloomEffect, BrightnessContrastEffect, EffectComposer, EffectPass, HueSaturationEffect, NoiseEffect, RenderPass, SMAAEffect, SMAAPreset,
  ToneMappingEffect, ToneMappingMode, VignetteEffect,
} from 'postprocessing';
import { Color, HalfFloatType, Uniform, Vector3, type Camera, type Scene, type WebGLRenderer } from 'three';
import type { QualityTier } from './quality';

// Bloom is what turns HDR colour into light: engines, lava, lances,
// explosions. Only colours well above white bloom (a high threshold), so
// hulls and rock faces never do. Then the system's colour mood (a split tone),
// a soft vignette and a little film grain, for the grit. Tone mapping runs last, so everything before it can
// stay in HDR. All in one pass.
//
// Anti-aliasing is SMAA on Medium (light) and High (full), not multisampling: a multisampled
// half-float chain drew nothing but black on some GPUs and canvas sizes.
// (A chromatic split on hits was tried and dropped for the same reason:
// postprocessing's effect blacks out the frame while its offset is zero.)
//
// The low tier skips the composer entirely: the renderer tone-maps directly
// and nothing blooms, which costs a lot of glow and saves a lot of fill.

/**
 * Each system's own colour mood: a split tone in the HDR picture, before the tone map. The shadows take a breath
 * of the sky's main colour, the lights a touch of its sun. Small amounts: the scene's own light does the rest.
 */
class MoodEffect extends Effect {
  constructor() {
    super('Mood', /* glsl */ `
      uniform vec3 uShadow, uLight;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c += uShadow * (1.0 - smoothstep(0.0, 0.18, l));
        c *= mix(vec3(1.0), uLight, smoothstep(0.15, 0.9, l));
        outputColor = vec4(c, inputColor.a);
      }`, { uniforms: new Map<string, Uniform>([['uShadow', new Uniform(new Vector3())], ['uLight', new Uniform(new Vector3(1, 1, 1))]]) });
  }
}

/** The mood for a sky: its main colour in the shadows, its sun in the lights. */
export interface Mood { shadow: Color; light: Color }

export class Post {
  readonly composer: EffectComposer | null;
  private readonly mood = new MoodEffect();

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
    const vignette = new VignetteEffect({ offset: 0.34, darkness: 0.48 });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    grain.blendMode.opacity.value = 0.035;
    // a light grade: the sky carries colour now (each system its own two), so nothing is drained; the HUD guards its own text
    const grade = new HueSaturationEffect({ saturation: 0.04 });
    const contrast = new BrightnessContrastEffect({ contrast: 0.06 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    if (tier.smaa) this.composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: tier.smaa === 'high' ? SMAAPreset.HIGH : SMAAPreset.LOW })));
    this.composer.addPass(new EffectPass(camera, bloom, this.mood, vignette, grain, grade, contrast, tone));
  }

  setMood(m: Mood): void {
    (this.mood.uniforms.get('uShadow')!.value as Vector3).set(m.shadow.r, m.shadow.g, m.shadow.b);
    (this.mood.uniforms.get('uLight')!.value as Vector3).set(m.light.r, m.light.g, m.light.b);
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
