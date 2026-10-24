import { Color, CustomBlending, DoubleSide, Mesh, OneFactor, OneMinusSrcAlphaFactor, PlaneGeometry, ShaderMaterial } from 'three';

// ── the singularity ────────────────────────────────────────────────────────
// A black hole as it is pictured, drawn as one camera-facing quad and one
// shader: a hard black horizon, a thin photon ring hugging it, a tilted
// accretion disc (hot and white inside, the tint outside, bright on the side
// turning toward us, streaked and turning), and the far side of the same disc
// bent up over and under the hole. Nothing reads the scene, so it costs one
// quad of fill on any tier: no distortion pass, the same look on a phone.
// The horizon is premultiplied black, so it eats the stars behind it, and a ring of stars is bent round it.

const VERT = /* glsl */ `
  uniform float uSize;
  varying vec2 vUv;
  void main() {
    vUv = position.xy;
    vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * (c + vec4(position.xy * uSize, 0.0, 0.0));
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  uniform float uTilt;
  uniform float uSpin;
  varying vec2 vUv;
  const float RH = 0.2;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  /** The disc's light at radius rho (in horizon radii, 1.5 to 4.6) and angle a. */
  vec3 disc(float rho, float a) {
    float t = clamp((rho - 1.5) / 3.1, 0.0, 1.0);
    float body = smoothstep(0.0, 0.05, t) * pow(max(1.0 - t, 0.0), 1.5);
    // streaks along the flow: angle stretched by radius so the inner turns faster
    float sw = a + uTime * uSpin / pow(rho, 1.5);
    vec2 cs = vec2(cos(sw), sin(sw));
    float n = vnoise(cs * 5.0 + rho * 4.0) * 0.6 + vnoise(cs * 13.0 + rho * 9.0) * 0.4;
    float streak = 0.55 + 0.9 * n;
    // the side turning toward us is brighter and bluer, the receding side dimmer and redder
    float dop = 0.55 + 0.45 * cos(a - 0.35);
    vec3 hot = vec3(1.55, 1.3, 1.1);
    vec3 cold = uTint;
    vec3 col = mix(hot, cold, smoothstep(0.0, 0.7, t));
    return col * body * streak * (0.35 + 1.1 * dop);
  }
  void main() {
    vec2 p = vUv;
    float r = length(p);
    float ct = uTilt;
    vec3 light = vec3(0.0);
    float occ = 0.0;
    // the disc seen at a slant: the near half in front of the hole, the far half behind it
    vec2 q = vec2(p.x, p.y / ct) / RH;
    float rho = length(q);
    float a = atan(q.y, q.x);
    if (rho > 1.5 && rho < 4.6) {
      float front = smoothstep(0.12, -0.12, q.y);
      vec3 d = disc(rho, a);
      // the far half is hidden by the hole where they overlap (below), and dimmer
      light += d * mix(0.55, 1.0, front) * 0.62;
    }
    // the far side of the disc bent up over and under the hole: a band hugging it, brightest at the poles
    float rb = r / RH;
    float pole = pow(abs(p.y) / max(r, 1e-4), 1.4);
    float bd = (rb - 1.62) / 0.34;
    float bend = exp(-bd * bd) * (0.3 + 0.7 * pole);
    vec3 bc = disc(2.1 + 0.5 * pole, atan(p.y, p.x) + 1.2);
    light += bc * bend * 0.62;
    // the photon ring: thin, bright, round
    float rr = (rb - 1.07) / 0.04;
    float ring = exp(-rr * rr);
    light += vec3(1.7, 1.55, 1.4) * ring * 0.75;
    // a faint soft halo, so the edge of it is not a cut
    light += uTint * 0.05 * exp(-pow(rb / 2.7, 2.0));
    // the stars behind it, bent: a procedural field read at the place each image would have come from, stretched along the
    // ring and brightest near it. The real sky is not read, so the cost is one hash and a few multiplies a pixel.
    float rE = 1.3 * RH;
    if (r > rE && r < 0.78) {
      vec2 n = p / r, t = vec2(-n.y, n.x);
      float rs = r - rE * rE / r;
      vec2 ps = n * rs;
      float cell = 0.03;
      vec2 ci = floor(ps / cell), cf = fract(ps / cell);
      float h = hash(ci), h2 = hash(ci + 7.3), h3 = hash(ci + 19.1);
      if (h > 0.8) {
        vec2 sp = vec2(0.25 + 0.5 * h2, 0.25 + 0.5 * h3);
        vec2 d = (cf - sp) * cell;
        float stretch = 1.0 + 2.2 * pow(rE / r, 3.0);
        float dt = dot(d, t) / stretch, dn = dot(d, n);
        float star = exp(-(dt * dt + dn * dn) / (0.0028 * 0.0028));
        float mag = clamp(rE / (r - rE * 0.7), 1.0, 3.2);
        float fade = smoothstep(0.78, 0.42, r);
        light += mix(vec3(0.8, 0.9, 1.3), vec3(1.3, 1.1, 0.9), h3) * star * mag * 0.55 * fade * (0.5 + h2);
      }
    }
    // the horizon: black, hard, and it hides the stars behind it (and the far half of the disc)
    float hor = 1.0 - smoothstep(0.985, 1.0, rb);
    light *= 1.0 - hor;
    occ = hor;
    // fade to nothing at the quad's edge
    float edge = 1.0 - smoothstep(0.82, 1.0, r);
    gl_FragColor = vec4(light * edge, occ);
  }
`;

/** One camera-facing singularity: `horizon` is the black disc's radius in world units. `tint` is the outer disc's colour (HDR, kept low). */
export function singularity(horizon: number, tint: Color = new Color(0.9, 0.45, 1.5), tilt = 0.3): Mesh {
  const material = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uSize: { value: horizon / 0.2 }, uTime: { value: 0 }, uTint: { value: tint }, uTilt: { value: tilt }, uSpin: { value: 0.6 } },
    transparent: true, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide,
    blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor, blendSrcAlpha: OneFactor, blendDstAlpha: OneMinusSrcAlphaFactor,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.onBeforeRender = () => { material.uniforms.uTime!.value = performance.now() / 1000; };
  return mesh;
}
