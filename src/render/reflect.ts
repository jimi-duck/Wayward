import {
  BackSide, Color, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, Vector3,
  type Texture, type WebGLRenderer, type WebGLRenderTarget,
} from 'three';

// ── what metal reflects ───────────────────────────────────────────────────
// The system's own sky: the baked nebula and stars, with the sun as a hot spot where the key light comes from, so a
// teal system puts teal on the hull's edges and the plating facing the sun takes its warmth. Made once per system
// (when the sky is baked) through one PMREM generator and one small scene kept for the page's life, so a new system
// links no new program. Nothing runs per frame.
//
// It replaces a fixed studio (a black sphere, a warm window, a cold one) that every system shared. The sun lobe is
// sized to give about the studio's warm window's light, so hulls keep their exposure and only change colour.

/** Where the key light comes from (environment.ts puts it at -44, 22, -10 from the ship). */
const KEY_DIR = new Vector3(-44, 22, -10).normalize();
/** The baked sky's brightness in the reflection: a touch over the dome's, so dark plating still shows the gas. */
const SKY_GAIN = 2.6;

export class SkyReflections {
  private readonly pmrem: PMREMGenerator;
  private readonly scene = new Scene();
  private readonly mat: ShaderMaterial;
  private target: WebGLRenderTarget | null = null;

  constructor(private readonly renderer: WebGLRenderer) {
    this.pmrem = new PMREMGenerator(renderer);
    this.mat = new ShaderMaterial({
      uniforms: { uMap: { value: null as Texture | null }, uSunD: { value: KEY_DIR.clone() }, uSunC: { value: new Color(1, 0.9, 0.8) }, uGain: { value: SKY_GAIN } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uSunD, uSunC; uniform float uGain; varying vec3 vDir;
        vec2 eq(vec3 d) { return vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5); }
        void main() {
          vec3 d = normalize(vDir);
          vec3 col = texture2D(uMap, eq(d)).rgb * uGain;
          float sd = max(dot(d, uSunD), 0.0);
          // the sun: a hot core (about 4 degrees), a halo and a wide wash, in its own colour
          float core = smoothstep(0.9976, 0.9994, sd) * 25.0;
          float halo = sd * sd; halo *= halo; halo *= halo; halo *= halo; // sd^16
          col += uSunC * (core + halo * 1.1 + sd * sd * sd * sd * 0.12);
          // the far side of the sky, below the plane, a little darker: plating reads lit from above
          col *= 0.75 + 0.25 * smoothstep(-0.6, 0.3, d.y);
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: BackSide, depthWrite: false, depthTest: false,
    });
    this.scene.add(new Mesh(new SphereGeometry(10, 48, 24), this.mat));
  }

  /** Build the reflection for a sky: its bake and its sun's colour. Returns the map to set as the scene's environment. */
  update(sky: Texture, sun: Color): Texture {
    this.mat.uniforms.uMap!.value = sky;
    (this.mat.uniforms.uSunC!.value as Color).copy(sun);
    const old = this.target;
    this.target = this.pmrem.fromScene(this.scene, 0.04);
    old?.dispose();
    return this.target.texture;
  }
}
