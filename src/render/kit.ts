import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, Euler, ExtrudeGeometry, Group, LatheGeometry, Matrix4, Mesh,
  MeshStandardMaterial, OctahedronGeometry, PlaneGeometry, Quaternion, RepeatWrapping, SRGBColorSpace, Shape, TorusGeometry, Vector2,
  Vector3, Vector4, type Material, type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scratchTexture, WEAR_NOISE } from './wear';

// ── the industrial kit ────────────────────────────────────────────────────
// Every hull in the game, ours and theirs, is built from this kit: boxes,
// drums, wedges and greebles merged into one mesh per material, so a ship
// with hundreds of parts is still three or four draws.
//
// The look is weathered metal. One plating texture is painted at startup
// (panels, seams, rivets, grime streaks, rust, scratches, the odd hazard
// stripe) with a matching height map, and both are projected triplanar in
// the model's own space: no UVs to unwrap, and the same density of detail on
// a tiny vent as on a hull plate. The height map perturbs the normal, so
// seams and rivets catch the light.

const SIZE = 1024;
let plating: { map: Texture; bump: Texture; paint: Texture } | null = null;

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** The plating, painted once: albedo and height. */
export function platingTextures(): { map: Texture; bump: Texture; paint: Texture } {
  if (plating) return plating;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    return [c, c.getContext('2d', { willReadFrequently: true })!] as const;
  };
  const [ca, a] = make(); // albedo
  const [cb, b] = make(); // height: mid grey is the plate surface
  const r = rand(4711);

  a.fillStyle = '#86807a';
  a.fillRect(0, 0, SIZE, SIZE);
  b.fillStyle = '#808080';
  b.fillRect(0, 0, SIZE, SIZE);

  // panels: split the square again and again, unevenly, like real plating
  const panels: Array<[number, number, number, number]> = [];
  const split = (x: number, y: number, w: number, h: number, depth: number) => {
    if (depth > 5 || (w < 90 && h < 90) || (depth > 2 && r() < 0.18)) { panels.push([x, y, w, h]); return; }
    if (w > h) { const k = w * (0.3 + r() * 0.4); split(x, y, k, h, depth + 1); split(x + k, y, w - k, h, depth + 1); }
    else { const k = h * (0.3 + r() * 0.4); split(x, y, w, k, depth + 1); split(x, y + k, w, h - k, depth + 1); }
  };
  split(0, 0, SIZE, SIZE, 0);

  for (const [x, y, w, h] of panels) {
    const v = 112 + r() * 46, warm = r() * 10;
    a.fillStyle = `rgb(${v + warm},${v + warm * 0.5},${v - 4})`;
    a.fillRect(x + 2, y + 2, w - 4, h - 4);
    const lift = 128 + (r() - 0.5) * 30;
    b.fillStyle = `rgb(${lift},${lift},${lift})`;
    b.fillRect(x + 3, y + 3, w - 6, h - 6);
    // seams: a dark groove with a light lip
    a.strokeStyle = 'rgba(28,24,22,.9)'; a.lineWidth = 3; a.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    a.strokeStyle = 'rgba(210,200,185,.18)'; a.lineWidth = 1; a.strokeRect(x + 4, y + 4, w - 8, h - 8);
    b.strokeStyle = '#141414'; b.lineWidth = 5; b.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    // rivets along some edges
    if (r() < 0.55) {
      const step = 16 + r() * 10;
      for (let px = x + 10; px < x + w - 8; px += step) {
        for (const py of [y + 8, y + h - 8]) {
          a.fillStyle = 'rgba(40,36,32,.8)'; a.beginPath(); a.arc(px, py, 2.4, 0, Math.PI * 2); a.fill();
          a.fillStyle = 'rgba(220,210,190,.35)'; a.beginPath(); a.arc(px - 0.6, py - 0.6, 1.1, 0, Math.PI * 2); a.fill();
          b.fillStyle = '#e0e0e0'; b.beginPath(); b.arc(px, py, 2.6, 0, Math.PI * 2); b.fill();
        }
      }
    }
    // inset hatches and vents
    if (r() < 0.25 && w > 60 && h > 60) {
      const iw = w * (0.3 + r() * 0.3), ih = h * (0.25 + r() * 0.3), ix = x + (w - iw) * r(), iy = y + (h - ih) * r();
      a.fillStyle = 'rgba(30,28,26,.55)'; a.fillRect(ix, iy, iw, ih);
      b.fillStyle = '#4a4a4a'; b.fillRect(ix, iy, iw, ih);
      if (r() < 0.6) {
        for (let k = iy + 5; k < iy + ih - 4; k += 7) {
          a.fillStyle = 'rgba(10,9,8,.8)'; a.fillRect(ix + 4, k, iw - 8, 3);
          b.fillStyle = '#202020'; b.fillRect(ix + 4, k, iw - 8, 3);
        }
      }
    }
    // the odd hazard stripe or faded red marking
    if (r() < 0.05 && w > 80) {
      a.save(); a.beginPath(); a.rect(x + 6, y + h - 26, w - 12, 18); a.clip();
      for (let k = -30; k < w + 30; k += 20) {
        a.fillStyle = 'rgba(190,150,40,.75)';
        a.beginPath(); a.moveTo(x + k, y + h - 8); a.lineTo(x + k + 10, y + h - 8); a.lineTo(x + k + 28, y + h - 26); a.lineTo(x + k + 18, y + h - 26); a.fill();
      }
      a.restore();
    } else if (r() < 0.06) {
      a.fillStyle = 'rgba(120,30,26,.7)'; a.fillRect(x + 8, y + 8, Math.min(w - 16, 40 + r() * 80), 10 + r() * 14);
    }
  }

  // the paint: the same panels in a light coat (the material's tint makes it
  // hazard amber), chipped through to dark metal along the edges and in
  // scuffed patches, as on the boards. The seams match the height map.
  const [cp, p] = make();
  p.fillStyle = '#d9d4cb';
  p.fillRect(0, 0, SIZE, SIZE);
  const pr = rand(9031);
  for (const [x, y, w, h] of panels) {
    const v = 205 + pr() * 40;
    p.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    p.fillRect(x + 2, y + 2, w - 4, h - 4);
    p.strokeStyle = 'rgba(24,20,18,.6)'; p.lineWidth = 2; p.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    // edge wear: the paint gone along a panel edge or two
    for (let e = 0; e < 4; e++) {
      if (pr() > 0.45) continue;
      const along = e % 2 === 0 ? w : h, n = Math.floor(along / 6);
      for (let i = 0; i < n; i++) {
        if (pr() < 0.35) continue;
        const t = i * 6 + pr() * 4, depth = 2 + pr() * pr() * 16, wd = 3 + pr() * 9;
        p.fillStyle = `rgba(${38 + pr() * 20},${34 + pr() * 16},${30 + pr() * 12},${0.75 + pr() * 0.25})`;
        if (e === 0) p.fillRect(x + t, y + 3, wd, depth);
        else if (e === 2) p.fillRect(x + t, y + h - 3 - depth, wd, depth);
        else if (e === 1) p.fillRect(x + w - 3 - depth, y + t, depth, wd);
        else p.fillRect(x + 3, y + t, depth, wd);
      }
    }
    // a scuffed patch: a cluster of chips, the dark camouflage of hard use
    if (pr() < 0.4) {
      const cx = x + pr() * w, cy = y + pr() * h, rad = 12 + pr() * 50;
      for (let i = 0; i < 40 + rad; i++) {
        const a2 = pr() * Math.PI * 2, d2 = Math.sqrt(pr()) * rad;
        const px = cx + Math.cos(a2) * d2, py = cy + Math.sin(a2) * d2 * 0.6, sz = 2 + pr() * 9;
        p.fillStyle = `rgba(40,36,32,${0.6 + pr() * 0.4})`;
        p.beginPath(); p.moveTo(px, py); p.lineTo(px + sz, py + pr() * 3); p.lineTo(px + sz * 0.6, py + sz * 0.7); p.lineTo(px - pr() * 3, py + sz * 0.5); p.fill();
      }
    }
    // stencilled marks and a faded old coat
    if (pr() < 0.08 && w > 70) { p.fillStyle = 'rgba(30,26,22,.85)'; p.fillRect(x + 10, y + 10, Math.min(w - 20, 30 + pr() * 60), 5 + pr() * 6); }
    if (pr() < 0.12) { p.fillStyle = 'rgba(255,250,235,.12)'; p.fillRect(x + 4, y + 4, w - 8, h * (0.2 + pr() * 0.5)); }
  }
  for (let i = 0; i < 220; i++) {
    const x = pr() * SIZE, y = pr() * SIZE, len = 30 + pr() * 170, wd = 2 + pr() * 12;
    const g = p.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, `rgba(40,30,20,${0.2 + pr() * 0.35})`);
    g.addColorStop(1, 'rgba(40,30,20,0)');
    p.fillStyle = g;
    p.fillRect(x, y, wd, len);
  }
  p.lineCap = 'round';
  for (let i = 0; i < 500; i++) {
    const x = pr() * SIZE, y = pr() * SIZE, ang = pr() * Math.PI, len = 4 + pr() * 30;
    p.strokeStyle = `rgba(50,44,38,${0.35 + pr() * 0.4})`;
    p.lineWidth = 0.7 + pr() * 1.6;
    p.beginPath(); p.moveTo(x, y); p.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); p.stroke();
  }

  // grime: streaks running down from seams
  for (let i = 0; i < 260; i++) {
    const x = r() * SIZE, y = r() * SIZE, len = 30 + r() * 160, wd = 2 + r() * 14;
    const g = a.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, `rgba(28,22,18,${0.25 + r() * 0.35})`);
    g.addColorStop(1, 'rgba(28,22,18,0)');
    a.fillStyle = g;
    a.fillRect(x, y, wd, len);
  }
  // rust and burn patches
  for (let i = 0; i < 70; i++) {
    const x = r() * SIZE, y = r() * SIZE, rad = 10 + r() * 60;
    const rust = r() < 0.6;
    const g = a.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rust ? `rgba(110,52,24,${0.3 + r() * 0.3})` : `rgba(18,14,12,${0.35 + r() * 0.3})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    a.fillStyle = g;
    a.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // scratches and chipped paint: bare metal shows through
  a.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    const x = r() * SIZE, y = r() * SIZE, ang = r() * Math.PI, len = 4 + r() * 26;
    a.strokeStyle = `rgba(215,208,196,${0.15 + r() * 0.3})`;
    a.lineWidth = 0.6 + r() * 1.2;
    a.beginPath(); a.moveTo(x, y); a.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); a.stroke();
  }
  // fine grain on the height map, so flat plates are not glass
  const img = b.getImageData(0, 0, SIZE, SIZE), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 14;
    d[i] = d[i]! + n; d[i + 1] = d[i + 1]! + n; d[i + 2] = d[i + 2]! + n;
  }
  b.putImageData(img, 0, 0);

  const map = new CanvasTexture(ca);
  map.colorSpace = SRGBColorSpace;
  const bump = new CanvasTexture(cb);
  const paintMap = new CanvasTexture(cp);
  paintMap.colorSpace = SRGBColorSpace;
  for (const t of [map, bump, paintMap]) { t.wrapS = t.wrapT = RepeatWrapping; t.anisotropy = 8; }
  plating = { map, bump, paint: paintMap };
  return plating;
}

/** GLSL: the normal perturbed by a height `h` (three's perturbNormalArb, without a bump map). */
export const PERTURB = /* glsl */ `
  vec3 kitPerturb(vec3 surfPos, vec3 surfNorm, float h, float faceDir) {
    vec3 sx = dFdx(surfPos), sy = dFdy(surfPos), n = surfNorm;
    vec3 r1 = cross(sy, n), r2 = cross(n, sx);
    float det = dot(sx, r1) * faceDir;
    vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
    vec3 p = abs(det) * n - grad;
    // degenerate at silhouettes and under multisampling: a NaN here would be
    // smeared across the whole frame by bloom, so fall back to the plain normal
    float l = dot(p, p);
    return (l > 1e-20 && l == l) ? p * inversesqrt(l) : n;
  }`;

export interface MetalOptions {
  tint: number | Color;
  roughness?: number;
  metalness?: number;
  /** Texture repeats per model unit. */
  scale?: number;
  /** Strength of the seams and rivets. */
  bump?: number;
  emissive?: Color;
  /** Painted plate (the worn coat) instead of bare metal. */
  painted?: boolean;
  /**
   * Hard use, 0 to 1 (wear.ts): chipped edges, scratches, dents, grime,
   * scorches. Needs the kit's `wear` attribute, so only for kit-built meshes.
   */
  worn?: number;
  /** With `worn`: soot from the drives, rising from nothing at x = soot[0] to full at soot[1] (model units, aft is -X). */
  soot?: [number, number];
  /** With `worn`: old hits, [x, y, z, reach] in model space, up to six: scorched, the paint burnt back round each. */
  hits?: Array<[number, number, number, number]>;
}

/** Weathered metal: the plating, triplanar in model space, with bump from the height map. */
export function metal(o: MetalOptions): MeshStandardMaterial {
  const { map: bare, bump, paint } = platingTextures();
  const map = o.painted ? paint : bare;
  const m = new MeshStandardMaterial({
    color: o.tint, map, roughness: o.roughness ?? 0.62, metalness: o.metalness ?? 0.55, envMapIntensity: 0.9,
    emissive: o.emissive ?? new Color(0, 0, 0),
  });
  const scale = o.scale ?? 0.9, strength = o.bump ?? 0.004, worn = o.worn ?? 0, painted = o.painted ? 1 : 0;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uKitBump = { value: bump };
    if (worn > 0) {
      shader.uniforms.uWearTex = { value: scratchTexture() };
      shader.uniforms.uWorn = { value: worn };
      shader.uniforms.uSoot = { value: o.soot ? new Vector2(...o.soot) : new Vector2(-1e4, -1e4 - 1) };
      const hits = (o.hits ?? []).slice(0, 6).map((h) => new Vector4(...h));
      while (hits.length < 6) hits.push(new Vector4(0, -1e4, 0, 0.001));
      shader.uniforms.uHits = { value: hits };
    }
    shader.uniforms.uKitScale = { value: scale };
    shader.uniforms.uKitStrength = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKitP; varying vec3 vKitN; uniform float uKitScale;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKitP = position * uKitScale; vKitN = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vKitP; varying vec3 vKitN; uniform sampler2D uKitBump; uniform float uKitStrength;
        ${PERTURB}`)
      .replace('#include <map_fragment>', `
        vec3 kitW = pow(abs(normalize(vKitN)), vec3(4.0)); kitW /= (kitW.x + kitW.y + kitW.z);
        vec4 kitC = texture2D(map, vKitP.zy) * kitW.x + texture2D(map, vKitP.xz) * kitW.y + texture2D(map, vKitP.xy) * kitW.z;
        float kitH = texture2D(uKitBump, vKitP.zy).r * kitW.x + texture2D(uKitBump, vKitP.xz).r * kitW.y + texture2D(uKitBump, vKitP.xy).r * kitW.z;
        diffuseColor *= kitC;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (0.5 - kitC.g) * 0.5, 0.2, 1.0);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = kitPerturb(-vViewPosition, normal, kitH * uKitStrength, faceDirection);`);
    if (worn > 0) wearShader(shader, painted);
  };
  m.customProgramCacheKey = () => `kit-metal-${scale}-${strength}-${worn > 0 ? 1 : 0}-${painted}`;
  return m;
}

/**
 * Layer hard use onto a kit metal shader (after metal() has patched it):
 * see wear.ts. `painted` decides what wear does to the colour: paint comes
 * off to bright steel; bare metal only scuffs lighter.
 */
function wearShader(shader: { vertexShader: string; fragmentShader: string }, painted: number): void {
  shader.vertexShader = shader.vertexShader
    .replace('varying vec3 vKitP;', 'varying vec3 vKitP; attribute vec2 wear; varying vec2 vWear; varying vec3 vKitM;')
    .replace('vKitP = position * uKitScale;', 'vKitP = position * uKitScale; vKitM = position; vWear = wear;');
  shader.fragmentShader = shader.fragmentShader
    .replace('varying vec3 vKitP;', `varying vec3 vKitP; varying vec3 vKitM; varying vec2 vWear;
      uniform sampler2D uWearTex; uniform float uWorn; uniform vec2 uSoot; uniform vec4 uHits[6];
      ${WEAR_NOISE}`)
    .replace('diffuseColor *= kitC;', `diffuseColor *= kitC;
      vec3 wp = vKitM;
      float wEdge = vWear.x, wTone = vWear.y;
      float wScr = texture2D(uWearTex, wp.zy * 0.9).r * kitW.x + texture2D(uWearTex, wp.xz * 0.9).r * kitW.y + texture2D(uWearTex, wp.xy * 0.9).r * kitW.z;
      vec2 wDent = wCells(wp * 2.8, 0.55);
      float wN = wFbm(wp * 7.0);
      float wLow = wFbm(wp * 1.4 + 1.7);
      // paint lost: along the edges, round the dents, in scrapes, in chipped patches
      float wChip = smoothstep(0.7, 0.76, wN + (wLow - 0.5) * 0.3) + wEdge * smoothstep(0.5, 0.58, wFbm(wp * 22.0) + (wLow - 0.5) * 0.4);
      float wScrape = smoothstep(0.25, 0.6, wScr) * smoothstep(0.25, 0.5, wLow);
      // paint worn thin to the dark undercoat in patches, round the dents too
      float wThin = smoothstep(0.64, 0.7, wN * 0.6 + wFbm(wp * 2.2 + 5.3) * 0.6 + wDent.x * 0.25 + wEdge * 0.1);
      float wBare = clamp(max(wChip, wScrape) * uWorn, 0.0, 1.0);
      // rust and dirt run down from the seams in streaks
      float wStreak = smoothstep(0.5, 0.85, wFbm(wp * vec3(7.0, 0.7, 7.0) + 2.3)) * smoothstep(0.35, 0.6, wLow);
      vec3 wSteel = vec3(0.45, 0.44, 0.42) * (0.7 + 0.5 * wN);
      // each plate its own shade; a few sun-faded
      diffuseColor.rgb *= ${painted ? '0.84 + 0.3 * wTone' : '0.88 + 0.24 * wTone'};
      ${painted ? 'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * 1.2, step(0.85, wTone) * 0.16 * uWorn);' : ''}
      // grime worked in, heaviest in the dents; soot astern; scorch marks from old hits
      float wGrime = smoothstep(0.38, 0.78, wFbm(wp * vec3(0.8, 3.2, 3.2) + 3.7)) * 0.6 + wDent.x * 0.45 + wStreak * 0.35;
      float wSoot = smoothstep(uSoot.x, uSoot.y, -wp.x) * (0.45 + 0.7 * wFbm(wp * 2.6));
      vec2 wBurn = wCells(wp * 0.85 + 4.0, 0.78);
      float wScorch = wBurn.x * smoothstep(0.35, 0.65, wFbm(wp * 5.0 + 9.0));
      // the old hits: charred at the heart, paint blistered and burnt back round them
      for (int i = 0; i < 6; i++) {
        float d = length(wp - uHits[i].xyz) / uHits[i].w * (0.8 + 0.4 * wN);
        wScorch = max(wScorch, 1.0 - smoothstep(0.15, 0.75, d));
        wBare = max(wBare, (smoothstep(0.3, 0.5, d) - smoothstep(0.5, 0.75, d)) * step(0.45, wN) * uWorn);
      }
      vec3 wCol = ${painted ? 'mix(diffuseColor.rgb, vec3(0.24, 0.2, 0.15), wThin * 0.8 * uWorn)' : 'diffuseColor.rgb'};
      wCol = mix(wCol, ${painted ? 'wSteel' : 'wSteel * 1.15'}, wBare * ${painted ? '1.0' : '0.4'});
      wCol *= 1.0 - min(wGrime + step(0.62, fract(wTone * 7.3)) * 0.3, 0.65) * uWorn;
      ${painted ? 'wCol = mix(wCol, vec3(0.2, 0.09, 0.04), wStreak * 0.45 * uWorn * (1.0 - wBare));' : ''}
      wCol = mix(wCol, vec3(0.04, 0.035, 0.03), clamp(wSoot * 0.6 + wScorch * 0.9, 0.0, 0.92) * uWorn);
      diffuseColor.rgb = wCol;
      float wDirt = (wGrime + wSoot + wScorch) * uWorn;`)
    .replace('roughnessFactor = clamp(roughnessFactor + (0.5 - kitC.g) * 0.5, 0.2, 1.0);', `roughnessFactor = clamp(roughnessFactor + (0.5 - kitC.g) * 0.5, 0.2, 1.0);
      roughnessFactor = clamp(mix(roughnessFactor, 0.46, wBare) + wDirt * 0.3, 0.25, 1.0);`)
    .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
      metalnessFactor = mix(metalnessFactor, 0.7, wBare * ${painted ? '1.0' : '0.5'});`)
    .replace('normal = kitPerturb(-vViewPosition, normal, kitH * uKitStrength, faceDirection);',
      'normal = kitPerturb(-vViewPosition, normal, kitH * uKitStrength - (wDent.x * 0.03 + wScr * 0.0008) * uWorn, faceDirection);');
}

// ── building ──────────────────────────────────────────────────────────────

export type V3 = [number, number, number];
type Axis = 'x' | 'y' | 'z';

const M = new Matrix4(), Q = new Quaternion(), E = new Euler(), P = new Vector3(), S = new Vector3();

/** A part's own tone, 0 to 1, from its place in the build: stable from run to run. */
function toneOf(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Turn a geometry built along +Y to lie along an axis (+X or +Z). */
function along(g: BufferGeometry, axis: Axis): BufferGeometry {
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  else if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Collects parts, by material key, and merges each key's parts into one
 * geometry. Model space: nose +X, up +Y, starboard +Z.
 */
export class Kit {
  private readonly parts = new Map<string, BufferGeometry[]>();

  private count = 0;

  add(key: string, geo: BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): void {
    this.addMatrix(key, geo, M.compose(P.set(...pos), Q.setFromEuler(E.set(...rot)), S.set(...scale)));
  }

  /**
   * A part placed by a whole matrix (for parts that need a basis, not angles).
   * Every part carries a `wear` attribute: x is how much of an edge the
   * surface is (a part's own geometry may set it: bevels are edges), y a tone
   * of its own, so the plates of one material are not all one shade.
   */
  addMatrix(key: string, geo: BufferGeometry, m: Matrix4): void {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'wear'].includes(k)) g.deleteAttribute(k);
    const n = g.attributes.position!.count, tone = toneOf(this.count++);
    const wear = new Float32Array(n * 2), edge = g.attributes.wear;
    for (let i = 0; i < n; i++) { wear[i * 2] = edge ? edge.getX(i) : 0; wear[i * 2 + 1] = tone; }
    g.setAttribute('wear', new BufferAttribute(wear, 2));
    g.applyMatrix4(m);
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
  }

  /** A solid of revolution round +Y from a profile of [radius, height] points (bottom to top), centred on pos. */
  lathe(key: string, profile: Array<[number, number]>, pos: V3, seg = 48): void {
    this.add(key, new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), seg), pos);
  }

  /**
   * A flat quad showing one cell of a texture atlas, laid on a surface: `normal`
   * is the way the surface faces, `up` the way the top of the cell points.
   * `uv` is the cell as [u0, v0, u1, v1].
   */
  decal(key: string, uv: [number, number, number, number], w: number, h: number, pos: V3, normal: V3, up: V3): void {
    const g = new PlaneGeometry(w, h);
    const a = g.attributes.uv!;
    for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    const n = new Vector3(...normal).normalize(), u = new Vector3(...up).normalize();
    const r = new Vector3().crossVectors(u, n).normalize();
    u.crossVectors(n, r).normalize();
    this.addMatrix(key, g, new Matrix4().makeBasis(r, u, n).setPosition(...pos));
  }

  box(key: string, size: V3, pos: V3, rot: V3 = [0, 0, 0]): void {
    this.add(key, new BoxGeometry(...size), pos, rot);
  }

  /** A drum along an axis; rTop is the +axis end. */
  cyl(key: string, rTop: number, rBot: number, len: number, pos: V3, axis: Axis = 'y', seg = 12, open = false): void {
    this.add(key, along(new CylinderGeometry(rTop, rBot, len, seg, 1, open), axis), pos);
  }

  /** A ring around an axis. */
  ring(key: string, r: number, tube: number, pos: V3, axis: Axis = 'x', seg = 24): void {
    const g = new TorusGeometry(r, tube, 6, seg);
    if (axis === 'x') g.rotateY(Math.PI / 2);
    else if (axis === 'y') g.rotateX(Math.PI / 2);
    this.add(key, g, pos);
  }

  /** A prism from a top-view outline (x forward, z to starboard), `height` thick, centred on pos.y. */
  wedge(key: string, outline: Array<[number, number]>, height: number, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]): void {
    const g = new ExtrudeGeometry(new Shape(outline.map(([x, z]) => new Vector2(x, -z))),
      { depth: height, bevelEnabled: true, bevelSize: Math.min(0.03, height * 0.2), bevelThickness: Math.min(0.03, height * 0.2), bevelSegments: 1 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, -height / 2, 0);
    this.add(key, g, pos, rot);
  }

  crystal(key: string, r: number, pos: V3, scale: V3): void {
    this.add(key, new OctahedronGeometry(r, 0), pos, [0, 0, 0], scale);
  }

  /** Small boxes scattered on a top surface: pipes, vents, housings. */
  greebles(key: string, rnd: () => number, x0: number, x1: number, z0: number, z1: number, y: number, n: number, size: number): void {
    for (let i = 0; i < n; i++) {
      const w = size * (0.3 + rnd() * 0.9), d = size * (0.3 + rnd() * 0.9), h = size * (0.25 + rnd() * 0.75);
      const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
      if (rnd() < 0.2) this.cyl(key, h * 0.4, h * 0.4, w * 1.6, [x, y + h * 0.4, z], rnd() < 0.5 ? 'x' : 'z', 6);
      else this.box(key, [w, h, d], [x, y + h / 2, z]);
    }
  }

  /** Merge each key's parts into one mesh, with the material given for that key. */
  build(mats: Record<string, Material>): Group {
    const g = new Group();
    for (const [key, list] of this.parts) {
      const mat = mats[key];
      if (!mat) continue;
      const merged = mergeGeometries(list);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new Mesh(merged, mat);
      mesh.name = key;
      g.add(mesh);
    }
    return g;
  }
}

export function seeded(seed: number): () => number {
  return rand(seed);
}
