import { AdditiveBlending, CanvasTexture, Color, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Vector3, type Mesh, Vector4, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, type Material, type Texture } from 'three';
import { Kit, metal, seeded, type V3 } from './kit';
import { buildFits, FITTED, fitKey, shown } from './fitted';
import { bevelGeo, setBevelScale, lamp, octFaces, type Face } from './parts';
import { at, body, band, normal, plate, point, roundBlock, roundSlab, turned, type Station } from './smooth';

// ── the Wayward ───────────────────────────────────────────────────────────
// A stolen Obedience-class ore hauler, registry OB-7731-A, after brand v1.1
// and the hero renders (branding/). Long and slim: a rounded tube of octagonal
// armour stepping in to a sloping bow, a low spine of modules down its back,
// and two big round engine drums low on its flanks, each drive in a ringed
// housing astern. No central engine: the stern is a cargo face, "03" on it.
//
// Built largest forms first: the bodies, then the armour hung on their
// faces segment by segment (plates, stepped plates, hatches, vents, exposed
// machinery bays), then the saddles tying the drums to the hull, then the
// small things: pipes, brackets, bolts, lamps, stencils. Hazard amber in
// three shades over dark metal, worn through to the steel.
//
// The model faces +X with +Y up, so its starboard side is +Z.

let mats: Record<string, Material> | null = null;
/** How hard the run has used her, 0 to 1: read by every worn material's shader. */
const USE = { value: 0 };
/** Her own drives' light on her stern: the bell colour at the faction coats' scale (0.12), shared by every painted material so it can follow the burn. */
const ENGINE = new Color(0, 0, 0), ENGINE_BASE = new Color(0.16, 0.85, 3.3).multiplyScalar(0.12);
let engineBurn = 0;
/** The drive's bell colour (HDR), when a cosmetic changes it: the stern's warmth follows. */
export function setHullGlow(bell: [number, number, number]): void {
  ENGINE_BASE.setRGB(...bell).multiplyScalar(0.12);
  ENGINE.copy(ENGINE_BASE).multiplyScalar(engineBurn);
}
/** The hull's six scorch uniforms, shared by every worn material: four old hits, two kept for live damage (setDamage), then four that a run burns in (setUse). */
const HITS = Array.from({ length: 10 }, () => new Vector4(0, -1e4, 0, 0.001));
function materials(hits: Hit[]): Record<string, Material> {
  if (mats) return mats;
  // all of her worn by hard use (wear.ts), sooted astern by her own drives
  hits.forEach((h, i) => HITS[i]!.set(...h));
  const used = { worn: 1, shade: true, run: USE, soot: [2.15, 2.95] as [number, number], hitUniforms: HITS, engine: ENGINE };
  const amber = (tint: number) => metal({ tint, roughness: 0.62, metalness: 0.08, scale: 0.85, painted: true, emissive: new Color(...LIVERY.stockGlow), ...used });
  mats = {
    // weathered grey plate, one shade lighter and one darker, the repaint's three tints under them
    paint: sweepable(amber(LIVERY.stock[0]), 0),
    paint2: sweepable(amber(LIVERY.stock[1]), 1),
    paint3: sweepable(amber(LIVERY.stock[2]), 2),
    // field repairs: plate patched on in grey primer, never painted over
    primer: metal({ tint: 0x8a8f80, roughness: 0.7, metalness: 0.15, scale: 1.1, painted: true, ...used }),
    hull: metal({ tint: 0x6a6f78, roughness: 0.55, metalness: 0.5, emissive: new Color(0.018, 0.022, 0.03), ...used }),
    dark: metal({ tint: 0x41454d, roughness: 0.55, metalness: 0.35, scale: 1.5, emissive: new Color(0.014, 0.018, 0.026), ...used }),
    pipe: metal({ tint: 0x454850, roughness: 0.45, metalness: 0.55, scale: 2, ...used }),
    rubber: new MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 }),
    window: new MeshStandardMaterial({ color: 0x0b1416, roughness: 0.12, metalness: 0.9, emissive: new Color(0.02, 0.09, 0.11) }),
    red: new MeshBasicMaterial({ color: new Color(3.2, 0.35, 0.25), toneMapped: false }),
    lamp: new MeshBasicMaterial({ color: new Color(3.2, 2.4, 1.5), toneMapped: false }),
    // small maintenance lights: a dull orange, under the bloom line
    orange: new MeshBasicMaterial({ color: new Color(1.5, 0.55, 0.08), toneMapped: false }),
    // white navigation lights, tiny, under the bloom line
    nav: new MeshBasicMaterial({ color: new Color(1.7, 1.8, 1.9), toneMapped: false }),
    blue: new MeshBasicMaterial({ color: new Color(0.55, 1.2, 2.1), toneMapped: false }),
    // the bridge's visor slits: warm amber cabin light, under the bloom line
    visor: new MeshBasicMaterial({ color: VISOR.clone(), toneMapped: false }),
    decal: new MeshStandardMaterial({
      map: decalTexture(), transparent: true, alphaTest: 0.35, roughness: 0.8, metalness: 0.1,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }),
  };
  return mats;
}

const ORANGE = new Color(1.5, 0.55, 0.08), BLUE = new Color(0.55, 1.2, 2.1);
/** The maintenance lamps breathe a little, slow and off the drive's beat (the shared material is tinted, the mesh never moves). */
export function animateLamps(time: number, dt = 0, burn = 1): void {
  const o = mats?.orange as MeshBasicMaterial | undefined;
  // with one plate left the lamps stutter hard, as if the wiring were open
  const stutter = critical ? 0.35 + 0.65 * (Math.sin(time * 41) * Math.sin(time * 17.3) > -0.2 ? 1 : 0) : 1;
  if (o) o.color.copy(ORANGE).multiplyScalar((1 + 0.12 * Math.sin(time * Math.PI * 2 * 0.4)) * stutter * Math.min(1, lightLevel));
  // the cargo face and drum housings pick up the drive's light as it burns, and go quiet when the throttle is cut
  engineBurn = burn;
  ENGINE.copy(ENGINE_BASE).multiplyScalar(burn);
  // the drum's blue seam lights wind up and down with the drives, so the whole stern settles together
  const bl = mats?.blue as MeshBasicMaterial | undefined;
  if (bl) bl.color.copy(BLUE).multiplyScalar(0.4 + 0.6 * burn);
  stepInspect(dt);
  // a wound's burn spreads over about half a second rather than popping
  WOUNDS.forEach((w, i) => {
    w.level += clampStep(w.want - w.level, 2 * dt);
    const u = HITS[4 + i]!;
    if (w.level < 0.002) u.set(0, -1e4, 0, 0.001);
    else u.set(w.at[0], w.at[1], w.at[2], w.at[3] * w.level);
  });
}
const clampStep = (d: number, m: number) => Math.max(-m, Math.min(m, d));

// ── damage on the hull ────────────────────────────────────────────────────
// A lost plate shows: the first burns a scorch into the hull and tears a crater in its plating; the second a larger one on the
// other flank. With one plate left the wound smokes and the lamps stutter (render/sector.ts reads `woundPoints`).
interface Wound { at: Hit; want: number; level: number }
const WOUNDS: Wound[] = [{ at: [0, 0, 0, 0.4], want: 0, level: 0 }, { at: [0, 0, 0, 0.4], want: 0, level: 0 }];
const woundGroups: Group[][] = [];
let critical = false;

/** `plates` left of `maxPlates`: the hull wears the wounds for what is lost. */
export function setDamage(plates: number, maxPlates: number): void {
  const lost = Math.max(0, maxPlates - plates);
  critical = maxPlates > 1 && plates <= 1;
  WOUNDS.forEach((w, i) => { w.want = lost > i ? 1 : 0; });
  for (const g of woundGroups) g.forEach((grp, i) => { grp.visible = lost > i; });
}

const cargoGroups: Group[][] = [];
/** The deck answers the hold: `frac` (0 to 1) of the hold's capacity fills the boxes from astern, stern run first, then the middle, then the bow. */
export function setCargo(frac: number): void {
  for (const g of cargoGroups) g.forEach((grp, i) => { grp.visible = frac > i / 3 + 1e-6; });
}

// ── fittings and use ──────────────────────────────────────────────────────
let fitGroup: Group | null = null;
let fitMats: Record<string, Material> | null = null;
let fitSeen = '';
let fitWas: Record<string, number> = {};
let fitBuilt = false;
// ── the inspection trace ──────────────────────────────────────────────────
// A part just fitted is traced in thin teal lines over its edges (teal is
// information: "this is new"), pulsing twice and gone in about two and a half
// seconds of flight, so the player sees on the hull what the bay put there.
// Built once per fit, never per frame.
const INSPECT = new LineBasicMaterial({ color: new Color(0.3, 1.25, 1.2), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const INSPECT_TIME = 2.4;
let inspect: Group | null = null;
let inspectT = INSPECT_TIME;
/** A save loaded or a new run: more than this many new levels at once is a whole build arriving, not a fit. */
const INSPECT_MAX = 4;

/** What the upgrades put on her: only what is fitted is built, and only when it changes. */
export function setFit(levels: Record<string, number>): void {
  if (!fitGroup || !fitMats) return;
  const s = shown(levels), key = fitKey(s);
  if (key === fitSeen && fitBuilt) return;
  const first = !fitBuilt;
  fitBuilt = true;
  fitSeen = key;
  if (inspect) { for (const c of inspect.children) (c as LineSegments).geometry.dispose(); inspect = null; }
  for (const c of [...fitGroup.children]) { fitGroup.remove(c); (c as Mesh).geometry?.dispose(); }
  const g = buildFits(s).build(fitMats);
  g.children.slice().forEach((c) => { (c as Mesh).castShadow = (c as Mesh).receiveShadow = true; fitGroup!.add(c); });
  // only the levels that are new since the last build
  const fresh: Record<string, number> = {};
  let added = 0;
  for (const id of Object.keys(s)) {
    const was = fitWas[id] ?? 0;
    if (s[id]! > was) { fresh[id] = s[id]!; added += s[id]! - was; }
  }
  const was = fitWas;
  fitWas = s;
  if (first || added === 0 || added > INSPECT_MAX) return;
  const k = new Kit();
  for (const id of Object.keys(fresh)) for (let i = was[id] ?? 0; i < fresh[id]!; i++) FITTED[id]![i]!(k);
  const ng = k.build(fitMats);
  inspect = new Group();
  for (const c of ng.children) {
    const m = c as Mesh;
    if (!m.geometry) continue;
    const lines = new LineSegments(new EdgesGeometry(m.geometry, 35), INSPECT);
    lines.position.copy(m.position); lines.quaternion.copy(m.quaternion); lines.scale.copy(m.scale);
    lines.scale.multiplyScalar(1.01);
    inspect.add(lines);
    m.geometry.dispose();
  }
  fitGroup.add(inspect);
  inspectT = 0;
}

/** The inspection trace's two pulses, in flight time (the bay holds the world, so it plays once she launches). */
function stepInspect(dt: number): void {
  if (!inspect) return;
  inspectT += dt;
  const t = inspectT;
  if (t >= INSPECT_TIME) { inspect.visible = false; INSPECT.opacity = 0; return; }
  inspect.visible = true;
  INSPECT.opacity = 0.5 * (1 - Math.cos((2 * Math.PI * t) / (INSPECT_TIME / 2))) * (1 - t / INSPECT_TIME) * 0.9;
}

/** Scorch marks a run burns in, model space; each grows as `use` passes its turn. */
const SCARS: Hit[] = [];
/** `use` (0 to 1): how hard the run has used her. The paint chips, the grime builds, and scorch marks open one after another. */
export function setUse(use: number): void {
  USE.value = Math.max(0, Math.min(1, use));
  SCARS.forEach((h, i) => {
    const grow = Math.max(0, Math.min(1, (USE.value - 0.12 - i * 0.18) / 0.2));
    HITS[6 + i]!.set(h[0], h[1], h[2], Math.max(0.001, h[3] * grow));
  });
}

/** Where the live wounds are, model space: for smoke and sparks. `hard` is true at one plate left. */
export function woundPoints(): { points: V3[]; hard: boolean } {
  return { points: WOUNDS.filter((w) => w.level > 0.3).map((w) => [w.at[0], w.at[1], w.at[2]] as V3), hard: critical };
}

/**
 * The paint, one switch for the whole hull (docs/ONBOARDING.md): weathered grey steel plate before the rename, a dark, worn ochre after it.
 * The paint materials are shared, so this tints them in place; the geometry never changes. `setLivery` snaps, `setLiveryBlend` takes
 * 0 (grey) to 1 (ochre) so the rename can sweep it. Primer patches and the dark machinery stay as they are in both.
 */
const LIVERY = {
  // the repaint: industrial yellow plate with a darker amber stripe (owner 2026-11-05: she still did not read as yellow, off-white was
  // too pale); the wear in metal() keeps it "repaired and stolen"
  stock: [0x969ca2, 0x70767c, 0xb0b6ba], yellow: [0xf0bb1c, 0xcf7d0c, 0xf6d553],
  stockGlow: [0.02, 0.022, 0.026], yellowGlow: [0.07, 0.05, 0.008],
} as const;
const A = new Color(), B = new Color();
let liveryMix = 0;
export function setLiveryBlend(t: number): void {
  t = Math.min(1, Math.max(0, t));
  if (!mats || t === liveryMix) return;
  liveryMix = t;
  (['paint', 'paint2', 'paint3'] as const).forEach((k, i) => {
    const m = mats![k] as MeshStandardMaterial;
    m.color.copy(A.setHex(LIVERY.stock[i]!).lerp(B.setHex(LIVERY.yellow[i]!), t));
    // the grey plate sits quiet in the sector's dim light; the repaint reads as paint
    m.emissive.setRGB(...(LIVERY.stockGlow.map((v, j) => v + (LIVERY.yellowGlow[j]! - v) * t) as [number, number, number]));
    // the ochre is flatter and duller than the grey plate: cheap paint, no sheen
    m.roughness = 0.62 + 0.16 * t;
  });
}
export function setLivery(yellow: boolean): void {
  setLiveryBlend(yellow ? 1 : 0);
}

/**
 * The rename's one livery pass (render/reveal.ts): a narrow amber band crosses the hull from bow to stern, and the plate
 * forward of it is already ochre. `at` is the band's place along the model's length (+X is the bow, the hull spans about
 * ±3.2); null ends the pass and hands the paint back to `setLiveryBlend`. Presentation only: the flag is the livery.
 */
const SWEEP = { on: { value: 0 }, at: { value: 0 } };
export const SWEEP_SPAN = 3.4;
export function setLiverySweep(at: number | null): void {
  if (at === null) { SWEEP.on.value = 0; return; }
  setLiveryBlend(0);
  SWEEP.on.value = 1;
  SWEEP.at.value = at;
}

/** Give a paint material the sweep: ochre forward of the band, the band itself a thin amber light. */
function sweepable(m: MeshStandardMaterial, i: number): MeshStandardMaterial {
  const prev = m.onBeforeCompile, key = m.customProgramCacheKey.bind(m);
  const col = new Color().setHex(LIVERY.yellow[i]!);
  const glow = new Vector3(...LIVERY.yellowGlow.map((v, j) => v - LIVERY.stockGlow[j]!));
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.uniforms.uSweepOn = SWEEP.on;
    sh.uniforms.uSweepAt = SWEEP.at;
    sh.uniforms.uSweepCol = { value: col };
    sh.uniforms.uSweepGlow = { value: glow };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSweepOn; uniform float uSweepAt; uniform vec3 uSweepCol; uniform vec3 uSweepGlow;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float swX = vKitP.x / uKitScale - uSweepAt;
        float swIn = uSweepOn * smoothstep(-0.04, 0.04, swX);
        vec4 diffuseColor = vec4( mix( diffuse, uSweepCol, swIn ), opacity );`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uSweepGlow * swIn + vec3(1.6, 0.92, 0.22) * uSweepOn * exp(-swX * swX / 0.01);`);
  };
  m.customProgramCacheKey = () => `${key()}-sweep`;
  return m;
}

// ── the stencils ──────────────────────────────────────────────────────────
// One small atlas, painted at startup: hull numbers, a hazard band and the
// registry, in dark paint worn through in places.
type Cell = [number, number, number, number];
const AW = 1024, AH = 512;
const cell = (x0: number, y0: number, x1: number, y1: number): Cell => [x0 / AW, 1 - y1 / AH, x1 / AW, 1 - y0 / AH];
const DECAL = {
  n03: cell(0, 0, 256, 256), n9f: cell(256, 0, 512, 256), n17: cell(512, 0, 768, 256), hazard: cell(768, 0, 1024, 256),
  reg: cell(0, 256, 1024, 384), name: cell(0, 384, 1024, 512),
};

let decals: Texture | null = null;
function decalTexture(): Texture {
  if (decals) return decals;
  const c = document.createElement('canvas');
  c.width = AW; c.height = AH;
  const g = c.getContext('2d')!;
  const rnd = seeded(1903);
  const ink = 'rgba(30,27,24,.94)';
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 190px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  [['03', 128], ['9F', 384], ['17', 640]].forEach(([t, x]) => g.fillText(String(t), Number(x), 136));
  // the hazard band: diagonal stripes in a frame
  g.save();
  g.beginPath(); g.rect(776, 72, 240, 112); g.clip();
  for (let k = -120; k < 260; k += 44) {
    g.beginPath(); g.moveTo(776 + k, 184); g.lineTo(776 + k + 22, 184); g.lineTo(776 + k + 22 + 112, 72); g.lineTo(776 + k + 112, 72); g.fill();
  }
  g.restore();
  g.lineWidth = 8; g.strokeStyle = ink; g.strokeRect(780, 76, 232, 104);
  // wear: chips and scratches through the paint
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${0.4 + rnd() * 0.6})`;
    g.beginPath(); g.arc(rnd() * AW, rnd() * AH, 1 + rnd() * 5, 0, Math.PI * 2); g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const x = rnd() * AW, y = rnd() * AH, a = rnd() * Math.PI, l = 10 + rnd() * 50;
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  decals = t;
  decalCanvas = c;
  drawNames(markDone);
  return t;
}

// ── the registry and the name (Ned's yard, render/paintbay.ts) ─────────────
// The company registry OB-7731-A is on her from the start; the name WAYWARD is not. At the yard's mark arch the registry is struck
// through and the name is written, left to right, and both stay. `setMark` takes 0 (the company's hull) to 1 (done); the two stencil
// cells are redrawn when it moves a step, with their own wear, so the rest of the atlas is left alone.
let decalCanvas: HTMLCanvasElement | null = null;
let markDone = 0;
const MARK_STEPS = 32;
function drawNames(m: number): void {
  if (!decalCanvas) return;
  const g = decalCanvas.getContext('2d')!;
  g.save();
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 256, AW, 256);
  const ink = 'rgba(30,27,24,.94)';
  g.fillStyle = ink; g.strokeStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 92px "Arial Black", Impact, "Helvetica Neue", sans-serif';
  g.fillText('OB-7731-A', 512, 322);
  const rw = g.measureText('OB-7731-A').width;
  // the registry struck through, drawn first half of the work
  const strike = Math.min(1, m / 0.45);
  if (strike > 0) { g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(512 - rw / 2 - 14, 322); g.lineTo(512 - rw / 2 - 14 + (rw + 28) * strike, 322); g.stroke(); }
  // the name, written from the left
  const write = Math.min(1, Math.max(0, (m - 0.3) / 0.7));
  if (write > 0) {
    g.font = '700 70px "Arial Black", Impact, "Helvetica Neue", sans-serif';
    const nw = g.measureText('WAYWARD').width;
    g.save(); g.beginPath(); g.rect(512 - nw / 2 - 10, 384, (nw + 20) * write, 128); g.clip();
    g.fillText('WAYWARD', 512, 450);
    g.restore();
  }
  // the same wear as the rest of the stencils: chips and scratches through the paint
  g.globalCompositeOperation = 'destination-out';
  const rnd = seeded(2207);
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(0,0,0,${0.4 + rnd() * 0.6})`;
    g.beginPath(); g.arc(rnd() * AW, 256 + rnd() * 256, 1 + rnd() * 5, 0, Math.PI * 2); g.fill();
  }
  g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = rnd() * AW, y = 256 + rnd() * 256, a = rnd() * Math.PI, l = 10 + rnd() * 50;
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
  if (decals) decals.needsUpdate = true;
}
/** 0 the company's registry alone, 1 struck out and the name written. */
export function setMark(m: number): void {
  const q = Math.round(Math.min(1, Math.max(0, m)) * MARK_STEPS) / MARK_STEPS;
  if (q === markDone) return;
  markDone = q;
  drawNames(q);
}

/** Her lights as the scan arch leaves them: 1 as she is, 0 dark, above 1 a white flash as they come back. */
const NAV = new Color(1.7, 1.8, 1.9), RED = new Color(3.2, 0.35, 0.25), LAMP = new Color(3.2, 2.4, 1.5), VISOR = new Color(0.78, 0.4, 0.11);
let lightLevel = 1;
export function setLightLevel(v: number): void {
  if (!mats || v === lightLevel) return;
  lightLevel = v;
  (mats.nav as MeshBasicMaterial).color.copy(NAV).multiplyScalar(v);
  (mats.red as MeshBasicMaterial).color.copy(RED).multiplyScalar(v);
  (mats.lamp as MeshBasicMaterial).color.copy(LAMP).multiplyScalar(v);
  (mats.visor as MeshBasicMaterial).color.copy(VISOR).multiplyScalar(v);
}

export interface Nozzle { p: V3; r: number; }

export interface BuiltHull {
  root: Group;
  /** The deck's boxes in three runs, stern first: shown as the hold fills (setCargo). */
  cargo: Group[];
  /** The torn plating of each live wound, hidden until a plate is lost (a child of `root`, not merged into the hull). */
  wounds: Group[];
  /** Engine nozzles, model space: where the plumes, trails and halos sit. */
  nozzles: Nozzle[];
  /** Wingtips, for running lights: port then starboard. */
  wings: V3[];
  /** Shield ellipsoid radii (x, y, z). */
  shield: V3;
}

const UP: V3 = [0, 1, 0], FWD: V3 = [1, 0, 0];

type Rnd = () => number;
/** Its own stream, so which plates are knocked askew leaves the layout alone. */
let knock = seeded(4471);
let braces = seeded(5521);
// plates take the off-white in two shades; the ochre stripe (paint2) is kept to the parts drawn as the stripe, so it reads as a bold block
const pickAmber = (rnd: Rnd): string => (rnd() < 0.6 ? 'paint' : 'paint3');

// ── damage and repairs ────────────────────────────────────────────────────

/** An old hit: where it struck (model space) and how far the scorch spreads. The hull shader burns round it. */
export type Hit = [number, number, number, number];

/** A point on a face of a body at (y0, z0): `x` along it, `v` across, `lift` off it. */
function onFace(face: Face, y0: number, z0: number, x: number, v: number, lift: number): V3 {
  const c = Math.cos(face.f), s = Math.sin(face.f), d = face.rad + lift;
  return [x, y0 + d * c - v * s, z0 + d * s + v * c];
}

/**
 * A blast crater: a charred hole punched through the plate, torn shards of
 * it curled outward round the rim. Returns the hit for the scorch.
 */
function crater(k: Kit, rnd: Rnd, face: Face, y0: number, z0: number, x: number, v: number, r: number): Hit {
  const lift = PLATE + 0.004;
  for (const spin of [0, Math.PI / 4]) k.add('rubber', bevelGeo(r * 0.9, 0.03, r * 0.9, 0.01), onFace(face, y0, z0, x, v, lift - 0.005), [face.f, spin, 0]);
  k.add('dark', bevelGeo(r * 0.5, 0.03, r * 0.42, 0.01), onFace(face, y0, z0, x + (rnd() - 0.5) * r * 0.3, v, lift - 0.01), [face.f, rnd(), 0]);
  const n = 7 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.4, rr = r * (0.5 + rnd() * 0.12), tilt = 0.4 + rnd() * 0.7;
    const len = r * (0.25 + rnd() * 0.25), wid = r * (0.2 + rnd() * 0.25);
    const p = onFace(face, y0, z0, x + Math.cos(a) * rr, v - Math.sin(a) * rr, lift + Math.sin(tilt) * len * 0.4);
    k.add(rnd() < 0.7 ? 'paint2' : 'dark', bevelGeo(len, 0.012, wid, 0.004), p, [face.f, a, tilt]);
  }
  const [hx, hy, hz] = onFace(face, y0, z0, x, v, lift);
  return [hx, hy, hz, r * 2.6];
}

/** A field repair: a plate of primer slapped over damage, a little askew, bolted all round. */
function patch(k: Kit, rnd: Rnd, face: Face, y0: number, z0: number, x: number, v: number): void {
  const len = 0.14 + rnd() * 0.16, wid = Math.min(face.wid * 0.7, 0.1 + rnd() * 0.14), lift = PLATE, spin = (rnd() - 0.5) * 0.3;
  k.add('primer', bevelGeo(len, 0.018, wid, 0.006), onFace(face, y0, z0, x, v, lift + 0.009), [face.f, spin, 0]);
  const n = Math.max(3, Math.round((len + wid) / 0.05));
  for (let i = 0; i < n * 2; i++) {
    const t = (i / (n * 2)) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
    const lx = Math.sign(c) * Math.min(1, Math.abs(c) * 1.6) * (len / 2 - 0.015), lz = Math.sign(sn) * Math.min(1, Math.abs(sn) * 1.6) * (wid / 2 - 0.015);
    const px = lx * Math.cos(spin) + lz * Math.sin(spin), pz = -lx * Math.sin(spin) + lz * Math.cos(spin);
    k.add('hull', bevelGeo(0.014, 0.01, 0.014, 0.003), onFace(face, y0, z0, x + px, v - pz, lift + 0.02), [face.f, 0, 0]);
  }
}

// ── the central hull ──────────────────────────────────────────────────────
// One long rounded body, eased from a full stern to a blunt bullet nose
// (render/smooth.ts), with plates pressed onto its curve: amber over the back
// and upper flanks, dark machinery and a few lit slits low on the sides.

/** The hull's sections, stern to bow: [x, half width, half height, centre y, centre z, roundness]. */
const HULL: Station[] = [
  [-2.5, 0.42, 0.34, 0.1, 0, 3.2], [-1.8, 0.46, 0.37, 0.1, 0, 3.2], [-0.6, 0.47, 0.37, 0.1, 0, 3.1], [0.5, 0.45, 0.36, 0.1, 0, 3.0],
  [1.3, 0.38, 0.32, 0.09, 0, 2.7], [1.9, 0.28, 0.25, 0.07, 0, 2.4], [2.3, 0.17, 0.16, 0.05, 0, 2.2], [2.5, 0.07, 0.07, 0.04, 0, 2.0],
  [2.55, 0.012, 0.012, 0.04, 0, 2.0],
];
const KEEL: Station[] = [[-2.4, 0.2, 0.1, -0.3, 0, 2.6], [-1.5, 0.24, 0.14, -0.31, 0, 2.6], [0.4, 0.24, 0.14, -0.31, 0, 2.6], [1.3, 0.14, 0.09, -0.26, 0, 2.4], [1.8, 0.04, 0.03, -0.2, 0, 2.2]];
const HY = 0.1, HW = 0.92, HH = 0.72;
/** How far a plate's crown stands off the body it is pressed on. */
const PLATE = 0.035;

/** A point on a body at `x`, angle `th` (0 the top, +PI/2 starboard), `lift` off it, and the angle of its normal round X. */
function onBody(st: Station[], x: number, th: number, lift = 0): { p: V3; f: number } {
  const s = at(st, x), [y, z] = point(s, th, lift), [ny, nz] = normal(s, th);
  return { p: [x, y, z], f: Math.atan2(nz, ny) };
}
/** The same place as a face and an offset across it, for the parts laid on faces (craters, patches). */
function faceOn(st: Station[], x: number, th: number): { face: Face; y0: number; z0: number; v: number } {
  const s = at(st, x), [y, z] = point(s, th), [ny, nz] = normal(s, th), f = Math.atan2(nz, ny), py = y - s[3], pz = z - s[4];
  return { face: { f, rad: py * ny + pz * nz, wid: 0.3 }, y0: s[3], z0: s[4], v: -py * Math.sin(f) + pz * Math.cos(f) };
}
/** The hull's crown at x (the top of its section). */
const crownY = (x: number): number => { const s = at(HULL, x); return s[3] + s[2]; };

/**
 * The container deck: a low rounded bed down the back with two columns of
 * boxes on it, some stacked, rails along its edges and a small white light
 * at each corner.
 */
/** The boxes of the deck in three runs, stern, middle, bow, each its own kit so the hold can fill them in that order (setCargo). */
let deckKits: Kit[] = [];
const DECK_BASE = 0.52;
function deck(k: Kit, rnd: Rnd): void {
  deckKits = [new Kit(), new Kit(), new Kit()];
  const x0 = -2.25, x1 = 0.75, rows = 6, len = (x1 - x0) / rows, cw = 0.32, base = DECK_BASE;
  // the bed: a flat rounded saddle sunk into the hull's back, so the deck grows out of it with no gap under its edges
  k.add('dark', body([[x0 - 0.12, 0.3, 0.06, 0.46, 0, 3], [x0, 0.4, 0.1, 0.45, 0, 4], [x1, 0.4, 0.1, 0.45, 0, 4], [x1 + 0.2, 0.3, 0.06, 0.45, 0, 3]], 12, 28));
  for (const sd of [-1, 1]) k.cyl('hull', 0.016, 0.016, x1 - x0 + 0.1, [(x0 + x1) / 2, base + 0.05, sd * 0.37], 'x', 8);
  for (let r = 0; r < rows; r++) {
    const x = x0 + (r + 0.5) * len;
    const bk = k;
    k = deckKits[Math.floor(r / 2)]!;
    for (const sd of [-1, 1]) {
      const z = sd * (cw / 2 + 0.03), tall = rnd() < 0.3, h = 0.17 + (tall ? 0.13 : 0);
      const key = rnd() < 0.22 ? 'dark' : pickAmber(rnd), y = base + 0.03 + h / 2;
      // a container with its long corners rounded: pressed, not cut
      k.add(key, roundBlock(len - 0.05, h, cw - 0.04, 0.07, 0.02), [x, y, z]);
      const top2 = y + h / 2 + 0.002, ang = Math.atan2(cw - 0.12, len - 0.14), d = Math.hypot(len - 0.14, cw - 0.12);
      // a plain lid; a strap across the odd one only (its own stream, so the layout stays put)
      if (braces() < 0.3) k.box('dark', [d, 0.011, 0.03], [x, top2, z], [0, (braces() < 0.5 ? -1 : 1) * ang, 0]);
      rnd();
      if (rnd() < 0.18) k.box('orange', [0.02, 0.02, 0.02], [x + len * 0.3, y, z + sd * (cw / 2 - 0.01)]);
    }
    k = bk;
    // an empty slot reads as lashings on the bed, never a hole
    for (const sd of [-1, 1]) {
      const z = sd * (cw / 2 + 0.03), ang = Math.atan2(cw - 0.12, len - 0.14), d = Math.hypot(len - 0.14, cw - 0.12);
      for (const e of [-1, 1]) k.box('dark', [d, 0.012, 0.022], [x, base + 0.035, z], [0, e * ang, 0]);
    }
  }
  for (const x of [x0, x1]) for (const sd of [-1, 1]) lamp(k, 'nav', [x, base + 0.08, sd * 0.37], 0.02);
  lamp(k, 'nav', [-0.6, base + 0.42, 0], 0.02);
}

function hull(k: Kit, rnd: Rnd): void {
  k.add('dark', body(HULL, 56, 40));
  k.add('dark', body(KEEL, 24, 24));
  // the plates: rings of them stern to bow, each ring split round the body into the back, the upper flank, the flank and the lower
  // flank; the back and upper flanks amber, the stripe ring astern, the lower flanks dark machinery
  const XS = [-2.47, -1.8, -1.1, -0.4, 0.3, 0.95, 1.55, 2.08, 2.46];
  const BANDS: Array<[number, number, 'top' | 'upper' | 'flank' | 'lower']> = [[-0.41, 0.41, 'top'], [0.43, 1.05, 'upper'], [1.07, 1.61, 'flank'], [1.63, 2.25, 'lower']];
  for (let i = 0; i + 1 < XS.length; i++) {
    const a = XS[i]! + 0.009, b = XS[i + 1]! - 0.009;
    for (const [t0, t1, band] of BANDS) for (const sd of band === 'top' ? [1] : [-1, 1]) {
      // the name plate carries its own ring on the upper flanks
      if (band === 'upper' && i >= 3 && i <= 4) continue;
      if (b > 2.1 && band === 'lower') continue;
      const forward = a > 1.5;
      let key: string = band === 'lower' ? (rnd() < 0.7 ? 'dark' : 'hull') : band === 'flank' ? (a < -1.0 ? 'dark' : pickAmber(rnd)) : pickAmber(rnd);
      if (i === 0 && band !== 'lower') key = 'paint2';
      if (forward && band !== 'lower') key = i === XS.length - 2 && band === 'top' ? 'paint2' : 'paint';
      if (knock() < 0.06) key = 'primer';
      const lo = band === 'top' ? t0 : sd > 0 ? t0 : -t1, hi = band === 'top' ? t1 : sd > 0 ? t1 : -t0;
      k.add(key, plate(HULL, a, b, lo, hi, 0.004, PLATE - 0.004));
    }
  }
  // the name plate: one long plate high on each flank, the name and registry on it
  for (const sd of [-1, 1]) {
    k.add('paint3', plate(HULL, -0.39, 0.94, sd > 0 ? 0.43 : -1.05, sd > 0 ? 1.05 : -0.43, 0.004, PLATE - 0.004));
    const { p, f } = onBody(HULL, 0.27, sd * 0.74, PLATE + 0.004), n: V3 = [0, Math.cos(f), Math.sin(f)], up: V3 = [0, Math.abs(n[2]), -Math.sign(n[2]) * Math.abs(n[1])];
    k.decal('decal', DECAL.name, 1.2, 0.17, p, n, up);
    const r = onBody(HULL, 0.42, sd * 0.97, PLATE + 0.004), rn: V3 = [0, Math.cos(r.f), Math.sin(r.f)];
    k.decal('decal', DECAL.reg, 0.5, 0.06, r.p, rn, [0, Math.abs(rn[2]), -Math.sign(rn[2]) * Math.abs(rn[1])]);
    // machinery along the lower flank: a pair of conduits clamped to the plates, and two housings between them
    for (const th of [1.98, 2.1]) { const o = onBody(HULL, 0.2, sd * th, PLATE + 0.012); k.cyl('pipe', 0.014, 0.014, 1.9, [0.15, o.p[1], o.p[2]], 'x', 8); }
    for (let x = -0.7; x < 1.0; x += 0.42) { const o = onBody(HULL, x, sd * 2.04, PLATE + 0.012); k.add('dark', roundBlock(0.03, 0.05, 0.07, 0.012, 0.006), o.p, [o.f, 0, 0]); }
    for (const x of [-0.25, 0.75]) { const o = onBody(HULL, x, sd * 1.86, PLATE + 0.02); k.add('hull', roundBlock(0.2, 0.04, 0.09, 0.02, 0.008), o.p, [o.f, 0, 0]); }
    // a few lit slits low on the flank, cabin light behind the machinery, under the bloom line
    for (const [x, th] of [[0.05, 1.9], [0.62, 1.84], [1.2, 1.78]] as const) {
      const o = onBody(HULL, x, sd * th, PLATE * 0.6);
      k.add('orange', bevelGeo(0.22, 0.012, 0.022, 0.004), o.p, [o.f, 0, 0]);
    }
  }
  // the nose: a sensor cap on the tip, two headlamps under the chin, the hull number on the crown
  k.cyl('pipe', 0.03, 0.05, 0.06, [2.56, 0.04, 0], 'x', 12);
  k.cyl('hull', 0.012, 0.012, 0.12, [2.63, 0.04, 0], 'x', 6);
  for (const sd of [-1, 1]) { const o = onBody(HULL, 2.2, sd * 2.0, 0.01); lamp(k, 'lamp', o.p, 0.026); }
  const slope = (crownY(2.02) - crownY(1.92)) / 0.1;
  k.decal('decal', DECAL.n03, 0.2, 0.2, [1.97, crownY(1.97) + PLATE + 0.006, 0], [-slope, 1, 0], FWD);

  deck(k, rnd);
  // small orange maintenance lights on the deck bed, in pairs, never in a straight line
  for (const sd of [-1, 1]) for (const x of [-2.0, -1.05, 0.0, 0.6]) lamp(k, 'orange', [x, DECK_BASE + 0.03, sd * 0.36], 0.024);
  // masts and a sensor dish
  k.cyl('pipe', 0.012, 0.018, 0.36, [-1.5, DECK_BASE + 0.3, 0.1], 'y', 6);
  k.cyl('pipe', 0.01, 0.014, 0.28, [0.4, DECK_BASE + 0.26, -0.1], 'y', 6);
  k.cyl('hull', 0.11, 0.05, 0.05, [-0.5, DECK_BASE + 0.3, 0], 'y', 12);
  k.cyl('dark', 0.03, 0.03, 0.08, [-0.5, DECK_BASE + 0.25, 0], 'y', 6);

  // the bridge: a rounded cabin rising from the head of the deck, sloping down into the nose, its sides and front swept;
  // plated on the roof, two warm visor slits across its raked front and one down each flank
  const tops: Array<[number, number, number]> = [[0.7, 0.53, 0.14], [0.98, 0.66, 0.27], [1.3, 0.72, 0.29], [1.58, 0.63, 0.23], [1.82, 0.47, 0.13], [2.02, crownY(2.02) + 0.005, 0.05]];
  const BRIDGE: Station[] = tops.map(([x, t, w]) => { const h = (t - (crownY(x) - 0.12)) / 2; return [x, w, h, t - h, 0, 2.7]; });
  k.add('dark', body(BRIDGE, 30, 32));
  k.add(pickAmber(rnd), plate(BRIDGE, 0.98, 1.44, -0.85, 0.85, 0.003, 0.02));
  k.add('rubber', plate(BRIDGE, 1.52, 1.66, -0.95, 0.95, 0.0, 0.006, 0.01));
  for (const [x0, x1] of [[1.545, 1.565], [1.6, 1.618]] as const) k.add('visor', plate(BRIDGE, x0, x1, -0.85, 0.85, 0.006, 0.005, 0.006));
  for (const sd of [-1, 1]) {
    k.add('rubber', plate(BRIDGE, 1.04, 1.4, sd > 0 ? 1.2 : -1.38, sd > 0 ? 1.38 : -1.2, 0.0, 0.006, 0.01));
    k.add('visor', plate(BRIDGE, 1.08, 1.36, sd > 0 ? 1.26 : -1.32, sd > 0 ? 1.32 : -1.26, 0.006, 0.005, 0.006));
  }
  k.cyl('pipe', 0.007, 0.012, 0.3, [1.25, 0.86, 0.1], 'y', 6);
  k.cyl('hull', 0.05, 0.035, 0.04, [1.33, 0.73, -0.1], 'y', 10);

  // the stern: the "03" bulkhead between the drums, painted in the stripe's ochre, the bold block the chase camera looks at all game.
  // A pressed slab with rounded corners and edges in a dark frame; the number over a hazard band, and under them a radiator grille of
  // horizontal slits, its slats canted down, grimed by its own heat (wear shader)
  const SX = -2.62;
  k.add('dark', roundSlab(0.2, 1.12, 0.96, 0.22, 0.04), [-2.44, HY + 0.01, 0]);
  k.add('paint2', roundSlab(0.2, 1.04, 0.88, 0.18, 0.05), [SX + 0.1, HY + 0.01, 0]);
  k.decal('decal', DECAL.n03, 0.34, 0.34, [SX - 0.004, HY + 0.19, 0], [-1, 0, 0], UP);
  for (const z of [-0.26, 0, 0.26]) k.decal('decal', DECAL.hazard, 0.26, 0.1, [SX - 0.004, HY - 0.01, z], [-1, 0, 0], UP);
  k.add('rubber', roundSlab(0.04, 0.7, 0.28, 0.06, 0.012), [SX + 0.005, HY - 0.23, 0]);
  for (let i = 0; i < 6; i++) k.box('pipe', [0.045, 0.018, 0.66], [SX - 0.008, HY - 0.335 + i * 0.042, 0], [0, 0, -0.55]);
  for (const sd of [-1, 1]) {
    lamp(k, 'orange', [SX - 0.02, HY - 0.23, sd * 0.42], 0.03);
    lamp(k, 'red', [SX - 0.02, HY + 0.36, sd * 0.38]);
  }
  for (const [x, z] of [[0.6, 0.25], [-0.4, -0.25], [-1.9, 0.25]] as const) lamp(k, 'red', [x, DECK_BASE + 0.36, z], 0.03);
}

// ── the engine drums ──────────────────────────────────────────────────────
// Two short drives at the stern, outboard and a little low: each a round
// nacelle in pillowed plate bands with a dark ribbed collar, a rounded dark
// nose, and its drive deep in a flared bell; a swept mount carries each into
// the hull.

const DZ = 1.04, DY = -0.04, DR = 0.42;
/** The nacelle's radius along it, in DR: full astern, rounding over into the nose. */
const DRUM: Station[] = ([[-2.34, 1.13], [-1.9, 1.15], [-1.5, 1.13], [-1.22, 1.07], [-1.04, 0.92], [-0.93, 0.66], [-0.87, 0.33], [-0.85, 0.02]] as const)
  .map(([x, r]) => [x, r, 0, 0, 0, 0] as Station);
const dr = (x: number): number => at(DRUM, x)[1] * DR;
const SEG = 40;

function drum(k: Kit, rnd: Rnd, z: number): Nozzle {
  const sd = Math.sign(z), R = DR, y = DY, P: V3 = [0, y, z];
  // the body under the plate, its nose rounded over
  const core: Array<[number, number]> = [];
  for (let x = -2.36; x < -0.85; x += 0.04) core.push([x, dr(x) * 0.985]);
  core.push([-0.85, 0.0]);
  k.add('dark', turned(core, SEG), P);
  // plate bands: the stripe astern, a ribbed dark band, two amber bands, the rounded dark nose
  k.add('paint2', band(dr, -2.3, -1.98, 0.003, 0.024, SEG), P);
  k.add('dark', band(dr, -1.95, -1.79, 0.003, 0.012, SEG), P);
  for (const x of [-1.91, -1.87, -1.83]) k.ring('hull', dr(x) + 0.016, 0.009, [x, y, z], 'x', SEG);
  k.add(pickAmber(rnd), band(dr, -1.76, -1.44, 0.003, 0.024, SEG), P);
  k.add(pickAmber(rnd), band(dr, -1.41, -1.16, 0.003, 0.022, SEG), P);
  k.add('hull', band(dr, -1.13, -0.98, 0.003, 0.012, SEG), P);
  k.ring('dark', dr(-1.14) + 0.006, 0.012, [-1.145, y, z], 'x', SEG);
  // the rounded nose in dark ribs, a sensor eye on its tip
  for (const x of [-1.04, -0.97, -0.92]) k.ring('hull', dr(x) + 0.002, 0.008, [x, y, z], 'x', SEG);
  lamp(k, 'nav', [-0.83, y, z], 0.018);
  // the heat collar ahead of the bell: bare gunmetal in soft ribs, the drive's heat soaked into it
  const collar: Array<[number, number]> = [];
  for (let i = 0; i <= 24; i++) { const x = -2.54 + (0.2 * i) / 24; collar.push([x, R * (1.15 + 0.03 * Math.sin((i / 24) * Math.PI * 6) ** 2)]); }
  k.add('hull', turned(collar, SEG), P);
  // the flared exhaust bell: it opens wider than the cowl, its lip rolled over, a pale blue ring round the throat
  k.add('dark', turned(([[-2.62, 1.04], [-2.86, 1.18], [-2.93, 1.26], [-2.92, 1.32], [-2.85, 1.34], [-2.68, 1.25], [-2.52, 1.16]] as const).map(([x, r]) => [x, r * R] as [number, number]), SEG, [2, 3, 4]), P);
  k.ring('blue', R * 0.9, 0.016, [-2.84, y, z], 'x', 28);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    k.box('dark', [0.04, R * 0.6, 0.035], [-2.62, y + Math.cos(a) * R * 0.62, z + Math.sin(a) * R * 0.62], [a, 0, 0]);
  }
  // the throat, stepped inward: three dark rings at falling radii in front of the glow, so the light sits deep in a mechanical bell;
  // ten armoured petals on the lip, two pale ticks on the first step
  for (const [x, r, tube] of [[-2.8, 0.88, 0.034], [-2.74, 0.74, 0.03], [-2.68, 0.6, 0.026]] as const) k.ring('pipe', R * r, tube, [x, y, z], 'x', 28);
  k.ring('hull', R * 0.86, 0.012, [-2.77, y, z], 'x', 28);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    k.box('dark', [0.13, R * 0.22, 0.06], [-2.82, y + Math.cos(a) * R * 0.97, z + Math.sin(a) * R * 0.97], [a, 0, 0]);
    if (i % 5 === 0) k.box('blue', [0.01, R * 0.1, 0.03], [-2.86, y + Math.cos(a + 0.31) * R * 0.88, z + Math.sin(a + 0.31) * R * 0.88], [a + 0.31, 0, 0]);
  }
  // stencils, lamps, and a lit seam along the outboard flank
  k.decal('decal', DECAL.hazard, 0.26, 0.07, [-1.6, y - 0.08, z + sd * (dr(-1.6) + 0.03)], [0, 0, sd], UP);
  k.decal('decal', DECAL.n9f, 0.18, 0.18, [-1.3, y + dr(-1.3) + 0.03, z + sd * 0.1], UP, FWD);
  lamp(k, 'red', [-2.44, y + R * 1.2, z + sd * 0.1]);
  k.box('blue', [0.24, 0.016, 0.016], [-1.6, y + 0.06, z + sd * (dr(-1.6) + 0.028)]);
  return { p: [-2.66, y, z], r: R * 0.98 };
}

/** The mount sweeping each drum into the hull: one smooth fairing from the flank into the nacelle, plated on its crown. */
function mounting(k: Kit, rnd: Rnd, z: number): void {
  const sd = Math.sign(z);
  // deep and broad astern where the drive's thrust comes in, thinning forward until it melts into the hull's flank
  const MOUNT: Station[] = [
    [-2.5, 0.27, 0.3, 0.02, sd * 0.75, 2.6], [-1.9, 0.28, 0.31, 0.03, sd * 0.75, 2.6], [-1.4, 0.25, 0.25, 0.03, sd * 0.72, 2.5],
    [-0.95, 0.13, 0.13, 0.05, sd * 0.6, 2.3], [-0.6, 0.03, 0.03, 0.07, sd * 0.5, 2.0],
  ];
  k.add('dark', body(MOUNT, 28, 32));
  // the saddle on its crown in two plates, a conduit channel between them, two pipes clamped down in it
  k.add(pickAmber(rnd), plate(MOUNT, -2.46, -1.98, -0.8, 0.8, 0.003, 0.026));
  k.add(pickAmber(rnd), plate(MOUNT, -1.94, -1.3, -0.75, 0.75, 0.003, 0.024));
  k.add('hull', plate(MOUNT, -2.46, -1.3, sd > 0 ? 0.86 : -1.5, sd > 0 ? 1.5 : -0.86, 0.003, 0.014));
  for (const dz of [-0.03, 0.03]) k.cyl('pipe', 0.016, 0.016, 1.1, [-1.85, 0.36, sd * 0.75 + dz], 'x', 8);
  k.box('lamp', [0.03, 0.03, 0.03], [-2.0, 0.37, sd * 0.56]);
}

/** The model's own scale: built in kit units, brought to play scale where it is shown (the hitbox is 0.9). */
export const MODEL_SCALE = 0.56;

export function buildWayward(): BuiltHull {
  setBevelScale(2.2);
  try { return build(); } finally { setBevelScale(1); }
}

function build(): BuiltHull {
  const k = new Kit(), rnd = seeded(7731);
  knock = seeded(4471);
  braces = seeded(5521);
  hull(k, rnd);
  const nozzles = [drum(k, rnd, -DZ), drum(k, rnd, DZ)];
  mounting(k, rnd, -DZ);
  mounting(k, rnd, DZ);
  // years of it: old hits on the hull, and the patches over older ones
  const hf = octFaces(HW, HH);
  const hitAt = (x: number, th: number, r: number): Hit => { const o = faceOn(HULL, x, th); return crater(k, rnd, o.face, o.y0, o.z0, x, o.v, r); };
  const hits: Hit[] = [hitAt(-0.95, 0.74, 0.15), hitAt(0.75, -1.35, 0.14), hitAt(-1.55, 0.2, 0.12), hitAt(1.25, -0.74, 0.11)];
  for (let i = 0; i < 12; i++) {
    const th = [0.2, 0.74, -0.74, 1.35, -1.35][Math.floor(rnd() * 5)]!, x = -2.0 + rnd() * 3.0, o = faceOn(HULL, x, th);
    patch(k, rnd, o.face, o.y0, o.z0, x, o.v);
  }
  const m = materials(hits);
  const root = k.build(m, 0.07);
  // the two wounds kept for lost plates: each its own small kit, shown only when its plate is gone
  const wounds: Group[] = [];
  for (const [i, [th, x, r]] of ([[1.35, 0.9, 0.2], [-1.35, 0.2, 0.18]] as const).entries()) {
    const wk = new Kit(), o = faceOn(HULL, x, th);
    WOUNDS[i]!.at = crater(wk, rnd, o.face, o.y0, o.z0, x, o.v, r);
    const g = wk.build(m);
    g.visible = false;
    root.add(g);
    wounds.push(g);
  }
  woundGroups.push(wounds);
  // the fittings: rebuilt into this group when an upgrade lands (setFit)
  fitGroup = new Group();
  fitMats = m;
  root.add(fitGroup);
  // where a run burns its own scorch marks in, in the order they come
  const hit4 = (face: number, x: number, v: number, r: number): Hit => { const [px, py, pz] = onFace(hf[face]!, HY, 0, x, v, 0.03); return [px, py, pz, r]; };
  SCARS.splice(0, SCARS.length, hit4(2, 0.3, 0.0, 0.5), hit4(6, -1.4, 0.0, 0.55), hit4(3, 0.9, 0.0, 0.42), hit4(2, -1.5, 0.05, 0.5));
  const cargo = deckKits.map((dk) => { const g = dk.build(m, 0.07); root.add(g); return g; });
  cargoGroups.push(cargo);
  return { root, wounds, cargo, nozzles, wings: [[-1.3, DY + DR * 0.85, -(DZ + DR * 0.85)], [-1.3, DY + DR * 0.85, DZ + DR * 0.85]], shield: [3.1, 1.05, 1.75] };
}
