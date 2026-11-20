import { rockPose } from './rockmotion';
import {
  Color, IcosahedronGeometry, LatheGeometry, Vector2, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion,
  Float32BufferAttribute, ShaderChunk, Vector3, type BufferGeometry, type Object3D, type Scene,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { STEP } from '../core/loop';
import { fbm } from '../core/noise';
import { BULWARK_VARIANTS, ROCK_VARIANTS, type Bulwark, type Rock, type RockKind } from '../sim/field';
import { PERTURB, seeded, WORLD_RIM } from './kit';

// ── rock ──────────────────────────────────────────────────────────────────
// Dark, dusty stone, split by fissures; basalt keeps a dull ember in its thinnest cracks. The shapes are built once
// at startup: an icosphere pushed out by fractal noise, with craters (a bowl
// and a raised rim) pressed into it, smooth-shaded. The surface detail is all
// in the fragment shader, in the rock's own space so it turns with the rock:
// fractal noise for the stone's colour and grain, a ridged noise for the
// crack network (thin dark lines), and the same noise as a height to perturb the normal.
//
// Three kinds share the material: the field (instanced, four shapes),
// bulwarks (individual, finer meshes) and a far backdrop of asteroids at all
// heights (instanced, cheap shapes), which is what tells the eye the sky is
// three-dimensional.

const PER_VARIANT = 48;
/** Icosphere subdivisions: a field rock, and a bulwark (few on screen, seen up close). */
const FIELD_DETAIL = 11, BULWARK_DETAIL = 22;
/** Bulwarks are lumpy potatoes, not spheres: each shape stretched its own way. */
const BULWARK_STRETCH: ReadonlyArray<[number, number, number]> = [[1.12, 0.9, 0.94], [0.94, 1, 1.1], [1.18, 0.86, 1]];
const BACKDROP = 150;
const BACK_BOX = 760;

/** GLSL 3D simplex noise (after Ashima Arts / Stefan Gustavson, MIT). */
const SIMPLEX = /* glsl */ `
  vec3 m289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 m289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return m289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = m289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }`;

const lavaTime = { value: 0 };

/** How a kind of rock looks: its cracks' glow, the stone's tint, how much of it is veined, how fast it pulses. */
interface RockLook {
  id: string;
  glow: [number, number, number];
  tint: [number, number, number];
  /** Added to the vein threshold: more of the rock is cracked. */
  zone: number;
  pulse: number;
  metal: number;
  /** How much of the surface is mineral inclusions (lit crystals in the stone). */
  mineral: number;
  /** Strata contrast: layered stone shows how a rock was laid down. */
  strata: number;
  /** A glancing-light rim in the glow's colour: how the rock reads as charged. */
  rim: number;
}

const LOOKS: Record<RockKind, RockLook> = {
  basalt:   { id: 'basalt',   glow: [3.2, 0.45, 0.06], tint: [0.95, 0.82, 0.72], zone: -0.1,  pulse: 1.2, metal: 0.06, mineral: 0,    strata: 0.65, rim: 0 },
  iron:     { id: 'iron',     glow: [1.2, 0.25, 0.06], tint: [0.65, 0.75, 0.92], zone: -0.25, pulse: 0.5, metal: 0.72, mineral: 0.2,  strata: 0.85, rim: 0 },
  rich:     { id: 'rich',     glow: [2.2, 0.7, 3.8],   tint: [0.82, 0.55, 1.25], zone: 0.15,  pulse: 1.8, metal: 0.15, mineral: 0.85, strata: 0.5,  rim: 0.2 },
  volatile: { id: 'volatile', glow: [0.8, 1.8, 3.2],   tint: [0.7, 0.95, 1.15],  zone: 0.25,  pulse: 6,   metal: 0.06, mineral: 0,    strata: 0.35, rim: 0.5 },
};
const KINDS = Object.keys(LOOKS) as RockKind[];

/**
 * The lava-veined basalt. `detail` is the noise frequency per model unit (a
 * model is a unit sphere, so a bulwark ten times the size needs ten times the
 * frequency for the same grain); `lava` scales the glow; `bump` is the
 * surface relief, in world units. `look` recolours it by kind.
 */
/** The sun's rim on a rock's limb. */
const ROCK_RIM = 0.9;
/** Where the sun cuts off on a rock's smooth shape (a GLSL float), so grain on the night side never catches it. */
const ROCK_EDGE = '0.0';
/** On the face turned from the sun, how much of the other directional light (the cool rim) and the sky's fill stone keeps. */
const ROCK_NIGHT = 0.03;
/** The sky's light on a rock's limb, near and far (times WORLD_RIM, the nebula's colour). */
const SKY_LIMB_NEAR = 0.05, SKY_LIMB_FAR = 1.0;
/**
 * The lights chunk with one change for stone: every directional light after the sun (index 0, the key) is dimmed on the
 * side of the rock turned away from the sun, judged on the smooth shape rather than the bumped surface, so the night side
 * goes dark with a clean terminator. Point lights (blasts, the ship's lamps) are left alone.
 */
const ROCK_LIGHTS = `
  float rockNight = 1.0, rockDay = 1.0;
  #if NUM_DIR_LIGHTS > 0
    float rockSun = dot(nonPerturbedNormal, directionalLights[0].direction);
    rockNight = mix(${ROCK_NIGHT.toFixed(2)}, 1.0, smoothstep(-0.1, 0.25, rockSun));
    rockDay = smoothstep(${ROCK_EDGE}, 0.18, rockSun);
  #endif
` + ShaderChunk.lights_fragment_begin.replace(
  'getDirectionalLightInfo( directionalLight, directLight );',
  'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= UNROLLED_LOOP_INDEX == 0 ? rockDay : rockNight;',
);

export function lavaRock(detail: number, lava: number, bump: number, look: RockLook = LOOKS.basalt, ember = true): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: look.metal, envMapIntensity: 0.3, vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = lavaTime;
    shader.uniforms.uSkyRim = WORLD_RIM;
    shader.uniforms.uDetail = { value: detail };
    shader.uniforms.uLava = { value: lava };
    shader.uniforms.uBump = { value: bump };
    shader.uniforms.uGlow = { value: new Color(...look.glow) };
    shader.uniforms.uTint = { value: new Color(...look.tint) };
    shader.uniforms.uZone = { value: look.zone };
    shader.uniforms.uPulse = { value: look.pulse };
    shader.uniforms.uMineral = { value: look.mineral };
    shader.uniforms.uStrata = { value: look.strata };
    shader.uniforms.uRim = { value: look.rim };
    shader.uniforms.uViolet = { value: ember && look.id === 'rich' ? 1 : 0 };
    shader.uniforms.uCool = { value: ember && look.id === 'volatile' ? 1 : 0 };
    shader.uniforms.uEmber = { value: ember && (look.id === 'basalt' || look.id === 'volatile') ? 1 : 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRockP;\nattribute float aHit;\nvarying float vHit;\nattribute float aGeode;\nvarying float vGeode;\nvarying float vRockAO;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRockP = position;\nvHit = aHit;\nvGeode = aGeode;\nvRockAO = color.r;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vRockP; varying float vHit; varying float vGeode; varying float vRockAO; uniform float uTime; uniform float uDetail; uniform float uLava; uniform float uBump;
        uniform vec3 uGlow; uniform vec3 uTint; uniform float uZone; uniform float uPulse; uniform float uMineral; uniform float uStrata; uniform float uRim; uniform float uEmber; uniform float uViolet; uniform float uCool; uniform vec3 uSkyRim;
        ${SIMPLEX}
        ${PERTURB}
        float rockFbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * snoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }`)
      .replace('#include <map_fragment>', `
        vec3 rp = vRockP * uDetail;
        // how much stone one pixel covers: each fine term fades out before it is small enough to shimmer
        float lod = length(fwidth(rp));
        float lodK = 1.0 - smoothstep(0.06, 0.16, lod), lodF = 1.0 - smoothstep(0.025, 0.07, lod);
        float rn = rockFbm(rp * 0.9);
        float fine = snoise(rp * 5.0) * 0.5 * lodK + snoise(rp * 11.0) * 0.2 * lodF;
        // the crack network: thin ridges of a warped noise, two scales
        float ridgeA = 1.0 - abs(snoise(rp * 0.55 + vec3(rn * 0.7)));
        float ridgeB = 1.0 - abs(snoise(rp * 1.35 + vec3(7.1, 2.3, 5.9) + vec3(rn * 0.4)));
        float ridge = max(ridgeA, ridgeB * 0.97);
        // seams are live only in some regions of a rock
        float zone = smoothstep(0.15 - uZone, 0.55 - uZone, snoise(rp * 0.28 + 3.3));
        // how far down a crevice this point lies (baked from the shape): heat and crystal live only down there, never on an open face
        float deep = smoothstep(0.86, 0.5, vRockAO);
        float crackL = smoothstep(0.975, 0.997, ridgeA) + smoothstep(0.982, 0.998, ridgeB) * 0.6;
        // strata: beds laid down in a slanted plane, warped, in patches; two widths of ribbon, each its own shade
        float bedPos = dot(rp, normalize(vec3(0.35, 0.9, 0.25))) * 1.7 + rn * 1.4;
        float bed = sin(bedPos * 5.0) * 0.5 + 0.5;
        float ribbon = sin(bedPos * 13.0 + fine * 1.5) * 0.5 + 0.5;
        float bedTone = fract(sin(floor(bedPos * 0.8) * 12.9898) * 43758.5453);
        float strataK = uStrata * smoothstep(-0.35, 0.25, snoise(rp * 0.35 + 6.0));
        // regolith: charcoal and grey-brown dust over the stone, paler where bare rock shows
        vec3 stone = mix(vec3(0.04, 0.038, 0.036), vec3(0.14, 0.127, 0.113), smoothstep(-0.6, 0.6, rn + fine * 0.3));
        stone = mix(stone, vec3(0.3, 0.27, 0.22) * (0.7 + 0.5 * bedTone), strataK * smoothstep(0.55, 0.95, ribbon) * 0.5);
        stone *= 1.0 + strataK * ((bed - 0.5) * 0.4 + (bedTone - 0.5) * 0.45);
        // inclusions: grains of metal and mineral set in the stone
        float incl = smoothstep(0.63, 0.72, snoise(rp * vec3(1.6, 7.5, 2.2) + 4.7) * 0.6 + snoise(rp * 2.1 + 9.0) * 0.5) * uMineral * (1.0 - uViolet);
        stone = mix(stone, vec3(0.3, 0.3, 0.3), incl * 0.5);
        // speckle: light and dark grains in the stone
        stone *= 0.8 + 0.4 * smoothstep(-0.4, 0.6, snoise(rp * 13.0 + 1.1)) * lodF + 0.2 * (1.0 - lodF);
        stone = mix(vec3(dot(stone, vec3(0.3, 0.5, 0.2))), stone, 0.6);
        // crack lines and the crust beside a live seam go dark
        stone *= 1.0 - min(0.75, crackL * 0.35 * deep + smoothstep(0.9, 0.975, ridge) * zone * deep * 0.45);
        // the kind tints the stone only lightly: outside, every rock is dusty charcoal; its colour lives in its seams
        diffuseColor.rgb *= stone * mix(vec3(1.0), uTint, 0.3 - 0.15 * uViolet);
        // stepped exfoliation: each layer a sloping tread with a sharp lip that catches grazing light
        float layer = fract(bedPos * 2.2 + fine * 0.15);
        float exfol = (layer - smoothstep(0.84, 1.0, layer)) * strataK;
        // sharp crests between broken faces, and a granular crumble at two scales (creased noise), so the stone reads hard, not moulded
        float crest = pow(1.0 - abs(snoise(rp * 3.0 + 1.7)), 3.0);
        float gran = pow(1.0 - abs(snoise(rp * 7.5 + 4.4)), 4.0) * lodK + pow(1.0 - abs(snoise(rp * 16.0 + 8.8)), 5.0) * 0.6 * lodF;
        // micro craters at two scales: a round bowl, dark inside, with a raised lip that catches the sun
        float mcA = snoise(rp * 2.9 + 9.0), mcB = snoise(rp * 6.5 + 2.0) * lodK;
        float bowl = smoothstep(0.35, 0.8, mcA) + smoothstep(0.4, 0.85, mcB) * 0.5;
        float lipC = smoothstep(0.2, 0.35, mcA) * (1.0 - smoothstep(0.35, 0.45, mcA)) + smoothstep(0.25, 0.4, mcB) * (1.0 - smoothstep(0.4, 0.5, mcB)) * 0.5;
        // regolith pores: sparse fine pockmarks, faded out once they are smaller than a pixel
        float poreF = 1.0 - smoothstep(0.01, 0.03, lod);
        float pore = smoothstep(0.62, 0.85, snoise(rp * 22.0 + 3.1)) * poreF;
        // the geode (rich rock): a cavity lined with crystal, faceted so each face throws its own light
        float geo = smoothstep(0.12, 0.55, vGeode) * uViolet;
        float facet = fract(snoise(rp * 4.5 + 2.0) * 2.5 + snoise(rp * 9.0) * 0.6 * lodF);
        float rockH = crest * 0.34 + rn * 0.24 + gran * 0.14 + exfol * 0.7 + fine * 0.1 - crackL * 0.35 * deep - bowl * 0.3 + lipC * 0.1 - pore * 0.2;
        rockH = mix(rockH, facet * 0.9, geo);
        diffuseColor.rgb *= (1.0 - bowl * 0.3) * (1.0 - pore * 0.45) * (0.8 + 0.5 * gran);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.9 + 0.006, clamp(lipC * 0.3 + crest * 0.15 + exfol * 0.25, 0.0, 0.5));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.05, 0.3) * (0.6 + 0.6 * facet), geo);
        float pulse = 0.85 + 0.15 * sin(uTime * uPulse + rn * 9.0);
        vec3 lavaGlow = vec3(0.0);
        // basalt: magma recessed into the deepest fissures, in three tiers: black crust, dull crimson, a white-hot thread at the centre
        float fis = smoothstep(0.96, 0.998, ridge) * zone * deep;
        vec3 magma = mix(vec3(0.3, 0.02, 0.006), vec3(1.4, 0.28, 0.035), smoothstep(0.25, 0.7, fis));
        magma = mix(magma, vec3(2.0, 1.35, 0.8), smoothstep(0.8, 1.0, fis) * deep);
        lavaGlow += magma * fis * 0.55 * uEmber * (1.0 - uCool) * uLava * (0.92 + 0.08 * pulse) * (uGlow.r / 3.2);
        // volatile: hairline fissures, cyan with a white-hot core, a slow restless pulse
        float hair = smoothstep(0.972, 0.998, ridge) * smoothstep(0.93, 0.6, vRockAO) * zone;
        vec3 cold = mix(vec3(0.04, 0.3, 0.55), vec3(1.0, 1.2, 1.35), smoothstep(0.55, 1.0, hair));
        lavaGlow += cold * hair * 0.6 * uCool * uLava * (0.75 + 0.25 * pulse);
        // rich: thin violet veins down in the crevices, and the geode's faint inner light
        float vein = smoothstep(0.965, 0.995, ridge) * deep * (0.3 + 0.7 * zone);
        lavaGlow += (vec3(0.3, 0.08, 0.6) * vein * 0.2 + vec3(0.2, 0.05, 0.42) * geo * (0.25 + 0.35 * smoothstep(0.7, 1.0, facet)) * (0.5 + 0.5 * smoothstep(0.3, 0.9, vGeode))) * uViolet * uLava;
        // a hit, or damage taken, wakes the seams in the rock's own colour
        vec3 kindC = uGlow / max(uGlow.r, max(uGlow.g, uGlow.b));
        float seamK = fis * uEmber * (1.0 - uCool) * 1.5 + (vein + geo * 0.4) * uViolet * 1.4 + hair * uCool * 1.3 + smoothstep(0.95, 0.99, ridge) * zone * 0.4;
        lavaGlow += kindC * vHit * seamK * 0.3 * uLava * min(uEmber + uViolet, 1.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(0.86 + fine * 0.12 - incl * 0.15 - (bed - 0.5) * strataK * 0.12 - metalness * 0.45 * (1.0 - bowl), 0.3, 1.0);
        roughnessFactor = mix(roughnessFactor, 0.14 + 0.1 * facet, geo);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        // the crystal's highlights take its violet; iron's cleavage faces flash, its dust and craters do not
        metalnessFactor = mix(metalnessFactor * (1.0 - bowl * 0.5) * (1.0 - pore * 0.4), 0.6, geo);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = kitPerturb(-vViewPosition, normal, rockH * uBump, faceDirection);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        // at chase distance the seams are sub-pixel: the kind shows as a faint cast of its own colour instead, under the bloom line
        float farK = smoothstep(18.0, 70.0, length(vViewPosition));
        totalEmissiveRadiance += kindC * farK * 0.06 * (uEmber * (1.0 - uCool) * 0.4 + uViolet + uCool * 0.6) * uLava;
        float rimK = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += lavaGlow + uGlow * rimK * (0.012 * uViolet + 0.01 * uCool) * uLava;`)
      .replace('#include <lights_fragment_begin>', ROCK_LIGHTS)
      .replace('#include <aomap_fragment>', `
        // hard light: in vacuum the side away from the sun is close to black, so the sky's fill and the cool rim light are cut
        // back on the night side (ROCK_LIGHTS) and the terminator between lit face and shadow reads crisp. The sun then catches the silhouette: a thin rim on the limb
        // facing it, stronger where the rock stands against the light, so a rock still reads as a form on a dark sky
        reflectedLight.indirectDiffuse *= rockNight;
        reflectedLight.indirectSpecular *= rockNight;
        #if NUM_DIR_LIGHTS > 0
          vec3 sunL = directionalLights[0].direction;
          vec3 viewV = normalize(vViewPosition);
          float limb = pow(1.0 - clamp(dot(normal, viewV), 0.0, 1.0), 4.0);
          float facing = clamp(dot(normal, sunL) + 0.15, 0.0, 1.0);
          float behind = clamp(dot(-viewV, sunL), 0.0, 1.0);
          totalEmissiveRadiance += directionalLights[0].color * diffuseColor.rgb * limb * (facing * ${ROCK_RIM.toFixed(2)} + behind * facing * ${(ROCK_RIM * 1.5).toFixed(2)});
          // the sky's own light on the limb: the nebula behind a rock lights its edge in its colour, more the further off it is,
          // so a far rock is outlined in the sky's colour instead of standing as a flat cut-out
          float skyLimb = pow(1.0 - clamp(dot(normalize(nonPerturbedNormal), viewV), 0.0, 1.0), 3.5);
          totalEmissiveRadiance += uSkyRim * skyLimb * (${SKY_LIMB_NEAR.toFixed(2)} + ${SKY_LIMB_FAR.toFixed(2)} * smoothstep(25.0, 160.0, length(vViewPosition)));
        #endif
        #include <aomap_fragment>`);
  };
  m.customProgramCacheKey = () => `stone-rock17-${detail}-${lava}-${bump}-${look.id}-${ember ? 1 : 0}`;
  return m;
}

/**
 * A rock shape of unit radius: an icosphere pushed out by noise, with concave impact basins (a parabolic bowl, a raised
 * ejecta lip and, on the big ones, a central rebound peak), broken faces that step down in jagged ledges, and faults
 * where one half slid. Smooth normals; the creases are baked in as occlusion (vertex colour). `geode` (radians) opens
 * a deep cavity lined for crystal (rich rock): its weight is the `aGeode` attribute and its axis `userData.geode`.
 */
export function rockGeometry(seed: number, detail: number, craters: number, rough = 0.42, cuts = 0, stretch: readonly [number, number, number] = [1, 1, 1], geode = 0): BufferGeometry {
  const g = mergeVertices(new IcosahedronGeometry(1, detail).deleteAttribute('normal').deleteAttribute('uv'), 1e-4);
  const p = g.attributes.position!;
  const v = new Vector3(), u = new Vector3();
  const rnd = seeded(Math.round(seed * 1000) + 7);
  // impact basins: a few big ones that shape the outline, and a scatter of small ones that only a fine mesh shows
  const pit = (size: number, depth: number) => ({ d: new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(), size, depth });
  const pits = [
    ...Array.from({ length: craters }, () => { const size = 0.2 + rnd() * 0.3; return pit(size, size * (0.22 + rnd() * 0.16)); }),
    ...(detail >= 8 ? Array.from({ length: 4 + craters * 3 }, () => { const size = 0.07 + rnd() * 0.1; return pit(size, size * (0.2 + rnd() * 0.15)); }) : []),
  ];
  // broken faces: where the rock split off something bigger it steps down in ledges (exfoliation), not one flat cut
  const breaks = Array.from({ length: Math.round(cuts * 0.6) }, () => ({
    n: new Vector3(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.7, rnd() * 2 - 1).normalize(), d: 0.5 + rnd() * 0.28, step: 0.05 + rnd() * 0.05,
  }));
  // faults: the rock sheared along a plane and one half slid, so the outline gets real steps and overhangs
  const faults = Array.from({ length: Math.min(3, 1 + Math.floor(cuts / 4)) }, () => {
    const n = new Vector3(rnd() * 2 - 1, (rnd() * 2 - 1) * 0.6, rnd() * 2 - 1).normalize();
    const t = new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).cross(n).normalize();
    return { n, t, d: (rnd() - 0.5) * 0.7, slide: (0.14 + rnd() * 0.18) * (rnd() < 0.5 ? -1 : 1), lift: 0.06 + rnd() * 0.08 };
  });
  // the geode: one deep cavity with a ragged mouth, and a smaller one across the rock
  const geodes = geode > 0 ? [new Vector3(rnd() - 0.5, rnd() * 0.6 + 0.4, rnd() - 0.5).normalize()] : [];
  if (geodes.length) geodes.push(geodes[0]!.clone().negate().add(new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.8)).normalize());
  const gw = new Float32Array(p.count);
  const st = new Vector3(...stretch);
  const ledge = new Vector3(rnd() - 0.5, rnd() * 0.8 + 0.2, rnd() - 0.5).normalize();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const big = fbm(v.x * 1.2 + seed, v.y * 1.2, v.z * 1.2, 4, seed);
    const mid = fbm(v.x * 3.1 + seed, v.y * 3.1, v.z * 3.1, 3, seed + 9);
    const ridge = 1 - Math.abs(fbm(v.x * 2.2 - seed, v.y * 2.2, v.z * 2.2, 2, seed + 4));
    const crag = Math.pow(1 - Math.abs(fbm(v.x * 4.4 + seed * 2, v.y * 4.4, v.z * 4.4, 2, seed + 21)), 5);
    const grit = detail >= 8 ? fbm(v.x * 9 + seed, v.y * 9, v.z * 9, 2, seed + 33) : 0;
    // a fine mesh would turn the crags into spines: it takes less of them and more of the fine crumble
    let k = 1 + big * rough + mid * 0.15 + ridge * 0.08 + crag * (detail >= 8 ? 0.08 : 0.14) + grit * 0.035 - 0.04;
    // ledges: a broken bed steps in terraces along the rock's own slant, so the outline has shelves and overhangs
    const bed = (v.x * ledge.x + v.y * ledge.y + v.z * ledge.z) * 3.2 + big * 1.6;
    const fr = bed - Math.floor(bed);
    k += (fr < 0.82 ? fr * 0.07 : (1 - fr) * 0.39) * rough * 0.9 - 0.03 * rough;
    for (const c of pits) {
      const a = Math.acos(Math.min(1, v.dot(c.d))) / c.size;
      if (a < 1.4) {
        if (a < 1) {
          // a parabolic bowl, and for a big basin a central peak where the floor rebounded
          k -= c.depth * (1 - a * a);
          if (c.size > 0.28 && a < 0.35) k += c.depth * 0.45 * (1 - a / 0.35);
        } else k += c.depth * 0.4 * Math.sin(((a - 1) / 0.4) * Math.PI); // the raised ejecta lip
      }
    }
    let gk = 0;
    geodes.forEach((d, j) => {
      const size = geode * (j ? 0.55 : 1) * (1 + mid * 0.5);
      const a = Math.acos(Math.min(1, v.dot(d))) / size;
      if (a < 1) { const w = 1 - a * a; k -= (j ? 0.16 : 0.3) * Math.sqrt(w); gk = Math.max(gk, w); }
      else if (a < 1.3) k += 0.04 * Math.sin(((a - 1) / 0.3) * Math.PI) * (1 + crag);
    });
    gw[i] = gk;
    v.multiplyScalar(k);
    for (const c of breaks) {
      // past the plane the stone is cut back in steps: each ledge a sloping tread and a sharp riser, its edge ragged
      const over = v.dot(c.n) - c.d + mid * 0.05;
      if (over <= 0) continue;
      const t = over / c.step, q = Math.floor(t), f = t - q;
      const kept = (q + Math.min(1, Math.max(0, (f - 0.72) / 0.28)) ** 2) * c.step * 0.45;
      v.addScaledVector(c.n, -(over - kept) * 0.9);
    }
    for (const f of faults) {
      const side = v.dot(f.n) - f.d;
      // a soft shoulder over a few hundredths of a unit keeps the sheared face from tearing the mesh
      const w = Math.min(1, Math.max(0, side / 0.09 + 0.5));
      if (w > 0) v.addScaledVector(f.t, f.slide * w).addScaledVector(f.n, f.lift * w);
    }
    v.multiply(st);
    v.y *= 0.86;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  // the slid halves reach past the old outline: bring the farthest point back to where the hit radius expects it
  let far = 0;
  for (let i = 0; i < p.count; i++) far = Math.max(far, u.fromBufferAttribute(p, i).length());
  if (far > 1.2) g.scale(1.2 / far, 1.2 / far, 1.2 / far);
  g.computeVertexNormals();
  bakeOcclusion(g, detail);
  g.setAttribute('aGeode', new Float32BufferAttribute(gw, 1));
  if (geodes.length) g.userData.geode = geodes[0];
  return g;
}

/**
 * Ambient occlusion baked into vertex colours: a vertex sitting below the average of its neighbours (a crease, a
 * crater floor, the foot of a ledge) gets darker, judged near and wide. A finer mesh smooths more times, so the
 * measure covers the same share of the rock at any detail. The rock material multiplies the colour in, and reads
 * the same value to keep magma and crystal down in the crevices. Costs nothing at run time.
 */
function bakeOcclusion(g: BufferGeometry, detail = 4): void {
  const p = g.attributes.position!, idx = g.index!, n = p.count;
  const near: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    near[a]!.push(b, c); near[b]!.push(a, c); near[c]!.push(a, b);
  }
  const r0 = new Float32Array(n);
  for (let i = 0; i < n; i++) r0[i] = Math.hypot(p.getX(i), p.getY(i), p.getZ(i));
  let r = r0;
  const ao = new Float32Array(n);
  const passes = Math.max(3, Math.round(detail * 0.9)), fine = Math.max(1, Math.round(passes / 4));
  for (let pass = 1; pass <= passes; pass++) {
    const sm = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const ns = near[i]!;
      let sum = 0;
      for (const j of ns) sum += r[j]!;
      sm[i] = ns.length ? sum / ns.length : r[i]!;
    }
    r = sm;
    // a crease (near) and a basin or the foot of a ledge (wide)
    if (pass === fine) for (let i = 0; i < n; i++) ao[i] = ao[i]! + Math.max(0, sm[i]! - r0[i]!) * 9;
    if (pass === passes) for (let i = 0; i < n; i++) ao[i] = ao[i]! + Math.max(0, sm[i]! - r0[i]!) * 4;
  }
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.fill(0.3 + 0.7 / (1 + ao[i]! * 1.8), i * 3, i * 3 + 3);
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
}

/** A broken crystal: a six-sided prism closing to a point, every corner pushed off true, base at y = 0 and tip at y = 1. */
function shardGeometry(): BufferGeometry {
  const g = new LatheGeometry([new Vector2(0.001, 0), new Vector2(0.5, 0), new Vector2(0.46, 0.62), new Vector2(0.1, 1)], 6).toNonIndexed();
  const p = g.attributes.position!, rnd = seeded(5);
  const jit = new Map<string, [number, number, number]>();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let j = jit.get(key);
    if (!j) { j = [(rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.3]; jit.set(key, j); }
    const top = p.getY(i) > 0.9 ? 0.4 : 1;
    p.setXYZ(i, p.getX(i) + j[0] * top, p.getY(i) + j[1], p.getZ(i) + j[2] * top);
  }
  g.computeVertexNormals();
  return g;
}

const SEATS = 6, CLUSTER = 3;
const MAX_SHARDS = 640;

/** Where crystals sit on a rock shape: down in its geode (or, with none, its hollows), spread apart, each leaning out along the surface. */
function shardSeats(g: BufferGeometry, seed: number): Matrix4[] {
  const p = g.attributes.position!, nrm = g.attributes.normal!, gw = g.attributes.aGeode, rnd = seeded(seed);
  const depth = (i: number) => (gw && gw.getX(i) > 0.15 ? -gw.getX(i) * 10 : 0) + Math.hypot(p.getX(i), p.getY(i), p.getZ(i));
  const order = Array.from({ length: p.count }, (_, i) => i).sort((a, b) => depth(a) - depth(b));
  const lined = gw ? order.filter((i) => gw.getX(i) > 0.3).length : 0;
  const hollow = order.slice(0, lined > 12 ? lined : Math.floor(p.count * 0.45));
  const seats: Matrix4[] = [], dirs: Vector3[] = [];
  const up = new Vector3(0, 1, 0), n = new Vector3(), v = new Vector3(), q = new Quaternion(), tw = new Quaternion();
  // in a geode the crystals crowd together; on open stone they keep apart
  const apart = lined > 12 ? 0.985 : 0.7;
  for (let tries = 0; tries < 600 && dirs.length < SEATS; tries++) {
    const i = hollow[Math.floor(rnd() * hollow.length)]!;
    n.fromBufferAttribute(nrm, i).normalize();
    v.fromBufferAttribute(p, i);
    if (dirs.some((d) => d.distanceTo(v) < (lined > 12 ? 0.09 : 0) || d.clone().normalize().dot(v.clone().normalize()) > apart)) continue;
    dirs.push(v.clone());
    v.addScaledVector(n, -0.04);
    q.setFromUnitVectors(up, n);
    // a little off the normal, and twisted: no two crystals lean alike
    q.premultiply(tw.setFromAxisAngle(new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), (rnd() - 0.5) * 0.8));
    // a cluster: a main crystal and two smaller ones beside it, leaning away
    const w = 0.045 + rnd() * 0.04, len = 0.1 + rnd() * 0.13;
    for (let c = 0; c < CLUSTER; c++) {
      const k = c ? 0.45 + rnd() * 0.35 : 1, qc = q.clone();
      if (c) qc.premultiply(tw.setFromAxisAngle(new Vector3(rnd() - 0.5, 0, rnd() - 0.5).normalize().cross(n).normalize(), 0.25 + rnd() * 0.55));
      const at = v.clone().addScaledVector(new Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(n).normalize(), c ? 0.035 + rnd() * 0.04 : 0);
      seats.push(new Matrix4().compose(at, qc, new Vector3(w * k, len * k, w * k * (0.7 + rnd() * 0.6))));
    }
  }
  return seats;
}

const MAX_CHUNKS = 84;
const CHUNK_TINT: Record<string, [number, number, number]> = {
  basalt: [1, 0.9, 0.8], iron: [0.78, 0.82, 0.9], rich: [0.85, 0.75, 1], volatile: [0.8, 0.9, 1.02],
};

/** The pieces thrown off a breaking rock: a pool of low stone shards that tumble, drift with the parent and crumble away. Visual only. */
class Chunks {
  private readonly mesh: InstancedMesh;
  private readonly p = new Float32Array(MAX_CHUNKS * 3);
  private readonly v = new Float32Array(MAX_CHUNKS * 3);
  private readonly sz = new Float32Array(MAX_CHUNKS * 3);
  private readonly ang = new Float32Array(MAX_CHUNKS * 4); // axis + angle
  private readonly spin = new Float32Array(MAX_CHUNKS);
  private readonly age = new Float32Array(MAX_CHUNKS).fill(-1);
  private readonly life = new Float32Array(MAX_CHUNKS);
  private next = 0;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly ax = new Vector3();
  private readonly pv = new Vector3();
  private readonly sv = new Vector3();
  private readonly col = new Color();

  constructor(scene: Scene) {
    this.mesh = new InstancedMesh(rockGeometry(311, 1, 0, 0.5, 5), lavaRock(1.1, 1, 0.1, LOOKS.basalt, false), MAX_CHUNKS);
    this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(MAX_CHUNKS * 3).fill(1), 3);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    for (let i = 0; i < MAX_CHUNKS; i++) this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
    scene.add(this.mesh);
  }

  burst(kind: string, size: number, x: number, z: number, r: number, vx: number, vz: number, dx: number, dz: number, power: number): void {
    const n = Math.round([7, 5, 3][size]! * power), tint = CHUNK_TINT[kind] ?? CHUNK_TINT.basalt!, base = Math.atan2(dz, dx);
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX_CHUNKS;
      // thrown mostly away from where the blow landed, every piece its own way and speed
      const a = base + (Math.random() - 0.5) * Math.PI * 1.7, d = r * (0.3 + Math.random() * 0.5), sp = (2.5 + Math.random() * 5.5) * (0.7 + power * 0.3);
      this.p.set([x + Math.cos(a) * d, -0.2 + (Math.random() - 0.5) * r * 0.4, z + Math.sin(a) * d], i * 3);
      this.v.set([vx * 0.8 + Math.cos(a) * sp, (Math.random() - 0.4) * sp * 0.4, vz * 0.8 + Math.sin(a) * sp], i * 3);
      const s = r * (0.08 + Math.random() * 0.13);
      this.sz.set([s * (0.7 + Math.random() * 0.6), s * (0.6 + Math.random() * 0.5), s * (0.7 + Math.random() * 0.6)], i * 3);
      const ax = Math.random() - 0.5, ay = Math.random() - 0.5, az = Math.random() - 0.5, nn = Math.hypot(ax, ay, az) || 1;
      this.ang.set([ax / nn, ay / nn, az / nn, Math.random() * 6], i * 4);
      this.spin[i] = (Math.random() - 0.5) * 9;
      this.age[i] = 0;
      this.life[i] = 0.6 + Math.random() * 0.5;
      this.col.setRGB(tint[0] * (0.8 + Math.random() * 0.3), tint[1] * (0.8 + Math.random() * 0.3), tint[2] * (0.8 + Math.random() * 0.3));
      this.mesh.setColorAt(i, this.col);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let live = false;
    for (let i = 0; i < MAX_CHUNKS; i++) {
      if (this.age[i]! < 0) continue;
      live = true;
      const t = (this.age[i] = this.age[i]! + dt), L = this.life[i]!;
      if (t >= L) { this.age[i] = -1; this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0)); continue; }
      const d = Math.pow(0.97, dt * 60);
      for (let k = 0; k < 3; k++) { this.v[i * 3 + k]! *= d; this.p[i * 3 + k] = this.p[i * 3 + k]! + this.v[i * 3 + k]! * dt; }
      this.ang[i * 4 + 3] = this.ang[i * 4 + 3]! + this.spin[i]! * dt;
      this.q.setFromAxisAngle(this.ax.set(this.ang[i * 4]!, this.ang[i * 4 + 1]!, this.ang[i * 4 + 2]!), this.ang[i * 4 + 3]!);
      // whole for the first part of its life, then it crumbles to nothing
      const fade = Math.min(1, (L - t) / (L * 0.4)), f = fade * fade * (3 - 2 * fade);
      this.m.compose(this.pv.set(this.p[i * 3]!, this.p[i * 3 + 1]!, this.p[i * 3 + 2]!), this.q, this.sv.set(this.sz[i * 3]! * f, this.sz[i * 3 + 1]! * f, this.sz[i * 3 + 2]! * f));
      this.mesh.setMatrixAt(i, this.m);
    }
    if (live) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class RockView {
  /** One instanced mesh per kind per shape: meshes[kind index * ROCK_VARIANTS + variant]. */
  private readonly meshes: InstancedMesh[] = [];
  /** Instances per mesh this frame (kept, so the frame allocates nothing). */
  private counts: number[] = [];
  private readonly bulwarks = new Map<number, Mesh>();
  private readonly bulwarkGeo: BufferGeometry[] = [];
  private readonly bulwarkMat = lavaRock(3, 1, 0.1);
  private readonly backdrop: InstancedMesh[] = [];
  private readonly backBase: Float32Array;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly sc = new Vector3();
  private readonly axis = new Vector3();
  private readonly col = new Color();
  private readonly shards: InstancedMesh;
  /** Per-instance hit light, parallel to `meshes`. */
  private readonly hits: InstancedBufferAttribute[] = [];
  private readonly chunks: Chunks;
  private readonly seats: Matrix4[][];
  private readonly sm = new Matrix4();
  private time = 0;

  /** Every rock mesh, for the phone readout's switch (ui/perf.ts). */
  probe(): Object3D[] {
    return [...this.meshes, ...this.backdrop, this.shards, ...this.bulwarks.values()];
  }

  constructor(private readonly scene: Scene) {
    // four characters: blocky with many broken faces, long and shard-like, rounded and pitted by weathering, a flat ridged slab
    const SHAPES: Array<{ craters: number; rough: number; cuts: number; stretch: [number, number, number] }> = [
      { craters: 1, rough: 0.36, cuts: 12, stretch: [1, 0.92, 1] },
      { craters: 1, rough: 0.34, cuts: 8, stretch: [1.4, 0.8, 0.78] },
      { craters: 3, rough: 0.3, cuts: 3, stretch: [1, 1, 1.05] },
      { craters: 2, rough: 0.44, cuts: 9, stretch: [1.18, 0.64, 1.1] },
    ];
    // a field rock carries enough mesh for its basins, ledges and small craters to hold their shape on screen
    const shapes = Array.from({ length: ROCK_VARIANTS }, (_, k) => {
      const c = SHAPES[k % SHAPES.length]!;
      return rockGeometry(k * 3.7 + 1, FIELD_DETAIL, c.craters, c.rough, c.cuts, c.stretch);
    });
    // rich rock is the same stone broken open on a geode: its own copy of each shape with the cavity cut in
    const geodes = Array.from({ length: ROCK_VARIANTS }, (_, k) => {
      const c = SHAPES[k % SHAPES.length]!;
      return rockGeometry(k * 3.7 + 1, FIELD_DETAIL, c.craters, c.rough, c.cuts, c.stretch, 0.62);
    });
    this.chunks = new Chunks(scene);
    this.seats = geodes.map((g, k) => shardSeats(g, 40 + k));
    // the crystals of the rich rock: one shared mesh, seated in each geode, and a few loose ones drifting near.
    // Glassy violet that throws hard highlights; the light it gives of its own stays faint
    const crystal = new MeshStandardMaterial({ color: new Color(0.22, 0.07, 0.42), emissive: new Color(0.2, 0.05, 0.4), emissiveIntensity: 0.45, roughness: 0.1, metalness: 0.45, flatShading: true, envMapIntensity: 1.4 });
    this.shards = new InstancedMesh(shardGeometry(), crystal, MAX_SHARDS);
    this.shards.count = 0;
    this.shards.frustumCulled = false;
    this.shards.castShadow = true;
    scene.add(this.shards);
    for (const kind of KINDS) {
      const mat = lavaRock(1.35, 1, 0.15, LOOKS[kind]);
      for (let k = 0; k < ROCK_VARIANTS; k++) {
        // each kind has its own copy of the shape: the hit light is a per-instance attribute on the geometry
        const geo = (kind === 'rich' ? geodes : shapes)[k]!.clone();
        const hit = new InstancedBufferAttribute(new Float32Array(PER_VARIANT), 1);
        geo.setAttribute('aHit', hit);
        this.hits.push(hit);
        const mesh = new InstancedMesh(geo, mat, PER_VARIANT);
        mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(PER_VARIANT * 3).fill(1), 3);
        mesh.count = 0;
        mesh.frustumCulled = false;
        mesh.castShadow = mesh.receiveShadow = true;
        this.meshes.push(mesh);
        scene.add(mesh);
      }
    }
    this.counts = this.meshes.map(() => 0);
    for (let k = 0; k < BULWARK_VARIANTS; k++) this.bulwarkGeo.push(rockGeometry(k * 5.3 + 20, BULWARK_DETAIL, 3 + k, 0.36, 7 + k, BULWARK_STRETCH[k]));
    // a bulwark is a plain mesh, not an instance: hidden here so the warm-up compiles its program too
    const proxy = new Mesh(this.bulwarkGeo[0]!, this.bulwarkMat);
    proxy.visible = false;
    proxy.castShadow = true; // so the warm frame links the sun's depth program for it as well
    scene.add(proxy);

    // the backdrop: far asteroids above, below and all around
    const backMat = lavaRock(1.6, 0.8, 0.2);
    const per = Math.ceil(BACKDROP / 3);
    this.backBase = new Float32Array(per * 3 * 8);
    const rnd = seeded(99);
    for (let k = 0; k < 3; k++) {
      // full detail: through the haze a far rock shows its lit faces and broken edges, so its outline must hold up too
      const mesh = new InstancedMesh(rockGeometry(k * 2.9 + 40, 4, 2, 0.4, 7, k === 1 ? [1.35, 0.8, 0.85] : [1, 0.92, 1]), backMat, per);
      mesh.frustumCulled = false;
      this.backdrop.push(mesh);
      scene.add(mesh);
      for (let i = 0; i < per; i++) {
        const j = (k * per + i) * 8;
        const x = rnd() * BACK_BOX, z = rnd() * BACK_BOX;
        const y = (rnd() < 0.5 ? -1 : 1) * (35 + Math.pow(rnd(), 1.5) * 140);
        // mostly boulders and hills, and one in nine a colossal anchor of the field, far out where it frames the sky
        const s = rnd() < 0.11 ? 30 + rnd() * 36 : 1.5 + Math.pow(rnd(), 3) * 18;
        const ax = rnd() * 2 - 1, ay = rnd() * 2 - 1, az = rnd() * 2 - 1, n = Math.hypot(ax, ay, az) || 1;
        this.backBase.set([x, y, z, s, ax / n, ay / n, az / n, (rnd() - 0.5) * 0.2], j);
      }
    }
  }

  /** Draw the field, `alpha` of a step past the simulated positions' previous step. */
  /** A rock breaking apart: stone pieces fly from its body, carrying its drift. (dx, dz) is the way the blow came; `power` scales the burst. */
  fracture(kind: string, size: number, x: number, z: number, r: number, vx: number, vz: number, dx: number, dz: number, power: number): void {
    this.chunks.burst(kind, size, x, z, r, vx, vz, dx, dz, power);
  }

  update(rocks: readonly Rock[], bulwarks: readonly Bulwark[], alpha: number, dt: number, cx: number, cz: number): void {
    this.time += dt;
    lavaTime.value = this.time;
    const counts = this.counts.fill(0);
    const back = (1 - alpha) * STEP;
    let ns = 0;
    for (const r of rocks) {
      const slot = KINDS.indexOf(r.kind) * ROCK_VARIANTS + r.variant;
      const mesh = this.meshes[slot]!;
      const i = counts[slot]!;
      if (i >= PER_VARIANT) continue;
      counts[slot] = i + 1;
      // no two alike: each rock is stretched its own way and takes its own shade of stone
      const h1 = hash(r.id), h2 = hash(r.id + 17), h3 = hash(r.id + 41);
      // a piece of a break is full size from the first frame and only eases out the last of its way
      const pose = rockPose(r.age, r.ox !== 0 || r.oz !== 0);
      const s = r.r * pose.scale;
      this.q.setFromAxisAngle(this.axis.set(r.ax, r.ay, r.az), r.rot);
      this.pos.set(r.x - r.vx * back + r.ox * pose.slide, -0.3, r.z - r.vz * back + r.oz * pose.slide);
      this.m.compose(this.pos, this.q, this.sc.set(s * (0.88 + 0.24 * h1), s * (0.9 + 0.2 * h2), s * (0.88 + 0.24 * h3)));
      mesh.setMatrixAt(i, this.m);
      if (r.kind === 'rich') {
        // crystals riding the rock, fewer on a small one, and a couple of loose fragments circling it
        const seats = this.seats[r.variant]!, n = Math.min(seats.length, (r.r > 2 ? 4 : r.r > 1.2 ? 3 : 2) * CLUSTER);
        for (let j = 0; j < n && ns < MAX_SHARDS; j++) this.shards.setMatrixAt(ns++, this.sm.multiplyMatrices(this.m, seats[j]!));
        for (let j = 0; j < 2 && ns < MAX_SHARDS; j++) {
          const a = this.time * (0.25 + j * 0.1) * (j ? -1 : 1) + r.id * 1.7 + j * 3, f = r.r * (1.5 + 0.25 * j), c = r.r * (0.05 + 0.03 * h3);
          this.q.setFromAxisAngle(this.axis.set(Math.sin(r.id + j), 1, Math.cos(j + r.id * 2)).normalize(), this.time * 0.6 + j);
          this.sm.compose(this.pos.set(r.x + Math.cos(a) * f, 0.4 * Math.sin(a * 1.3 + j) * r.r, r.z + Math.sin(a) * f), this.q, this.sc.set(c, c * 1.8, c));
          this.shards.setMatrixAt(ns++, this.sm);
        }
      }
      // the hit wakes the seams (not the whole rock); damage taken keeps them a little lit
      const hit = Math.max(r.hitT / 0.12, (1 - r.hp / r.maxHp) * 0.55);
      this.hits[slot]!.setX(i, hit);
      const flash = 1 + (r.hitT / 0.12) * 0.35;
      const tone = 0.72 + 0.5 * h2, warm = 0.92 + 0.16 * h3;
      mesh.setColorAt(i, this.col.setRGB(flash * tone * warm, flash * tone * 0.9, flash * tone * 0.84 / warm));
    }
    this.shards.count = ns;
    this.shards.instanceMatrix.needsUpdate = true;
    this.meshes.forEach((mesh, k) => {
      mesh.count = counts[k]!;
      mesh.visible = mesh.count > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.hits[k]!.needsUpdate = true;
    });
    this.chunks.update(dt);

    // bulwarks: one mesh each, made as they come into the field
    const seen = new Set<number>();
    for (const b of bulwarks) {
      seen.add(b.id);
      let mesh = this.bulwarks.get(b.id);
      if (!mesh) {
        mesh = new Mesh(this.bulwarkGeo[b.variant % this.bulwarkGeo.length]!, this.bulwarkMat);
        mesh.castShadow = mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.bulwarks.set(b.id, mesh);
      }
      mesh.position.set(b.x - b.vx * back, -0.5, b.z - b.vz * back);
      mesh.quaternion.setFromAxisAngle(this.axis.set(b.ax, b.ay, b.az), b.spin * b.age + b.id);
      mesh.scale.setScalar(b.r);
    }
    for (const [id, mesh] of this.bulwarks) {
      if (seen.has(id)) continue;
      mesh.removeFromParent();
      this.bulwarks.delete(id);
    }

    // the backdrop wraps around the camera, far out in the fog
    const per = this.backdrop[0]!.count, B = this.backBase, h = BACK_BOX / 2;
    this.backdrop.forEach((mesh, k) => {
      for (let i = 0; i < per; i++) {
        const j = (k * per + i) * 8;
        const x = cx + wrap(B[j]! - cx, BACK_BOX) - h, z = cz + wrap(B[j + 2]! - cz, BACK_BOX) - h;
        this.q.setFromAxisAngle(this.axis.set(B[j + 4]!, B[j + 5]!, B[j + 6]!), B[j + 7]! * this.time + i);
        const s = B[j + 3]!;
        this.m.compose(this.pos.set(x, B[j + 1]!, z), this.q, this.sc.set(s, s, s));
        mesh.setMatrixAt(i, this.m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
}

/** A steady 0..1 from an id, for each rock's own proportions and shade. */
function hash(n: number): number {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

function wrap(v: number, m: number): number {
  return ((v % m) + m) % m;
}
