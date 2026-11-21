import {
  Effect, EffectAttribute, BlendFunction, BloomEffect, BrightnessContrastEffect, EffectComposer, EffectPass, FXAAEffect, HueSaturationEffect, NoiseEffect, RenderPass, SMAAEffect, SMAAPreset,
  ToneMappingEffect, VignetteEffect,
} from 'postprocessing';
import { Color, HalfFloatType, Uniform, Vector2, Vector3, type Camera, type Scene, type WebGLRenderer } from 'three';
import { dirOf, SUN_AZ, SUN_EL } from './sky';
import type { QualityTier } from './quality';
import { postTone } from './tone';

// Bloom is what turns HDR colour into light: engines, lava, lances,
// explosions. Only colours well above white bloom (a high threshold), so
// hulls and rock faces never do. Then the system's colour mood (a split tone),
// a soft vignette and a little film grain, for the grit. Tone mapping runs last, so everything before it can
// stay in HDR. All in one pass.
//
// Anti-aliasing is SMAA on Medium (light) and High (full), not multisampling; a phone on Medium takes FXAA instead,
// one pass after the tone map where SMAA takes three over the whole picture (docs/PERF.md pass 13): a multisampled
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

/**
 * Light that travels (space plan step 3): shafts from the sun across the picture. A short march from each pixel toward
 * the sun's place on screen gathers what is bright on the way (the star, its glare, gas lit behind it); whatever dark
 * stands in between (rock, a hull) breaks the march, so a rock against the sun throws a shadow shaft through the haze.
 * Added light, held small and well under the bloom line, and only on what is far off (past a few hundred metres, by
 * depth): a near rock is never washed over. It fades out as the sun leaves the view. High and Medium only.
 */
class ShaftsEffect extends Effect {
  constructor() {
    super('Shafts', /* glsl */ `
      uniform vec2 uSun; uniform float uOn; uniform vec3 uTint;
      void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
        vec2 step = (uv - uSun) * (0.8 / 22.0);
        vec2 p = uv;
        float acc = 0.0, w = 1.0;
        for (int i = 0; i < 22; i++) {
          p -= step;
          vec3 c = texture2D(inputBuffer, clamp(p, vec2(0.001), vec2(0.999))).rgb;
          acc += smoothstep(0.7, 2.2, dot(c, vec3(0.2126, 0.7152, 0.0722))) * w;
          w *= 0.94;
        }
        acc /= 22.0;
        float fall = 1.0 - smoothstep(0.05, 0.95, length((uv - uSun) * vec2(aspect, 1.0)));
        // the shafts hang in the distance: nothing within a few hundred metres (a near rock, the ship) is hazed over
        float far = smoothstep(0.9995, 0.99995, depth);
        outputColor = vec4(inputColor.rgb + uTint * acc * fall * uOn * far, inputColor.a);
      }`, {
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([['uSun', new Uniform(new Vector2(0.5, 0.5))], ['uOn', new Uniform(0)], ['uTint', new Uniform(new Vector3(0.4, 0.36, 0.3))]]),
    });
  }
}

/** Where the sun is, a long way off in the world (sky.ts places it). */
const SUN_DIR = dirOf(SUN_AZ, SUN_EL);
/** How strong the shafts are at most (added light, linear). */
const SHAFTS = 0.42;

/** The mood for a sky: its main colour in the shadows, its sun in the lights. */
export interface Mood { shadow: Color; light: Color }

export class Post {
  readonly composer: EffectComposer | null;
  private readonly mood = new MoodEffect();
  private shafts: ShaftsEffect | null = null;
  private readonly camera: Camera;
  private readonly sunAt = new Vector3();
  private readonly fwd = new Vector3();

  constructor(renderer: WebGLRenderer, scene: Scene, camera: Camera, tier: QualityTier) {
    this.camera = camera;
    if (tier.name === 'low') {
      this.composer = null;
      return;
    }
    this.composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
    this.composer.addPass(new RenderPass(scene, camera));
    // five blur levels, not the default eight: the last three are a few pixels across at half size and add little but passes
    const bloom = new BloomEffect({ mipmapBlur: true, levels: 5, luminanceThreshold: 0.82, luminanceSmoothing: 0.14, intensity: 1.25, radius: 0.7 });
    // half resolution on every tier: mipmap blur hides it, and it is cheaper
    bloom.resolution.scale = 0.5;
    const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.62 });
    const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    grain.blendMode.opacity.value = 0.035;
    // a light grade: the sky carries colour now (each system its own two), so nothing is drained; the HUD guards its own text
    const grade = new HueSaturationEffect({ saturation: 0.04 });
    const contrast = new BrightnessContrastEffect({ contrast: 0.06 });
    const tone = new ToneMappingEffect({ mode: postTone() });
    const fxaa = tier.smaa === 'low' && matchMedia('(pointer: coarse)').matches;
    if (tier.smaa && !fxaa) this.composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: tier.smaa === 'high' ? SMAAPreset.HIGH : SMAAPreset.LOW })));
    // the sun's shafts on Medium and High, before the bloom, so the brightest of them glow like the rest of the light
    if (tier.name === 'medium' || tier.name === 'high') {
      this.shafts = new ShaftsEffect();
      this.composer.addPass(new EffectPass(camera, this.shafts));
    }
    this.composer.addPass(new EffectPass(camera, bloom, this.mood, vignette, grain, grade, contrast, tone));
    if (fxaa) this.composer.addPass(new EffectPass(camera, new FXAAEffect()));
  }

  setMood(m: Mood): void {
    (this.mood.uniforms.get('uShadow')!.value as Vector3).set(m.shadow.r, m.shadow.g, m.shadow.b);
    (this.mood.uniforms.get('uLight')!.value as Vector3).set(m.light.r, m.light.g, m.light.b);
    // the shafts take the sun's colour
    if (this.shafts) (this.shafts.uniforms.get('uTint')!.value as Vector3).set(m.light.r, m.light.g, m.light.b).multiplyScalar(SHAFTS);
  }

  /** Put the sun on screen for the shafts, and fade them as it leaves the view. */
  private aimShafts(): void {
    if (!this.shafts) return;
    const cam = this.camera;
    const facing = cam.getWorldDirection(this.fwd).dot(SUN_DIR);
    this.sunAt.copy(cam.position).addScaledVector(SUN_DIR, 1000).project(cam);
    const off = Math.max(Math.abs(this.sunAt.x), Math.abs(this.sunAt.y));
    const on = facing <= 0 ? 0 : Math.min(1, facing * 4) * (1 - Math.min(1, Math.max(0, (off - 1.1) / 0.6)));
    (this.shafts.uniforms.get('uSun')!.value as Vector2).set(this.sunAt.x * 0.5 + 0.5, this.sunAt.y * 0.5 + 0.5);
    this.shafts.uniforms.get('uOn')!.value = on;
  }

  setSize(width: number, height: number): void {
    this.composer?.setSize(width, height, false);
  }

  render(dt: number): boolean {
    if (!this.composer) return false;
    this.aimShafts();
    this.composer.render(dt);
    return true;
  }
}
