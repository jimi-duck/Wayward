import {
  AdditiveBlending,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  GridHelper,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  type Material,
} from 'three';
import { lerp } from '../core/math';
import type { World } from '../sim/world';

// ── M0 sector ──────────────────────────────────────────────────────────────
// Placeholder scenery: a starfield, a reference grid on the play plane, a sun
// and a stand-in ship built from primitives. The starfield and sun stay; the
// grid goes when the field has rocks to read motion against (M2); the ship is
// replaced by real models (M1/M3).
//
// Scale: one world unit is ten pixels of the original, so its numbers port
// with a single conversion. The ship's 9px radius is 0.9 units here.

const SPACE = new Color('#04060b');
const CYAN = new Color('#00f0ff');
const AMBER = new Color('#ff9f43');

// Fixed for M0. M1 replaces this with a smoothed chase rig.
const CAM_OFFSET = { x: 0, y: 14, z: 9 };
const BASE_VFOV = 50;
const MIN_HFOV = 60;
const MAX_VFOV = 75;

export class Sector {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(BASE_VFOV, 1, 0.1, 2000);
  private readonly ship = buildShip();
  private readonly stars = new Group();
  private readonly starMats: Array<{ mat: PointsMaterial; px: number }> = [];

  constructor() {
    this.scene.background = SPACE;

    const sun = new DirectionalLight(0xfff1dc, 2.6);
    sun.position.set(-40, 60, 25);
    this.scene.add(sun, new HemisphereLight(0x5f7fbf, 0x0a0c14, 0.5));

    const grid = new GridHelper(400, 80, 0x1f8aa3, 0x124858);
    const gridMat = grid.material as Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.6;
    gridMat.depthWrite = false;
    this.scene.add(grid);

    this.addStars(2200, 1.1, 0.55);
    this.addStars(350, 2.0, 1);
    this.scene.add(this.stars, this.ship);
  }

  /** Match the canvas: aspect, field of view, and star size in device pixels. */
  resize(width: number, height: number, dpr: number): void {
    const aspect = width / Math.max(1, height);
    // Portrait phones would otherwise see a sliver of the play plane, so the
    // vertical field widens until the horizontal one reaches a floor.
    const needed = (2 * Math.atan(Math.tan((MIN_HFOV * Math.PI) / 360) / aspect) * 180) / Math.PI;
    this.camera.fov = Math.min(MAX_VFOV, Math.max(BASE_VFOV, needed));
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    for (const s of this.starMats) s.mat.size = s.px * dpr;
  }

  /** Place everything for this frame, `alpha` of the way from prev to current. */
  sync(world: World, alpha: number): void {
    const { ship, prev } = world;
    const x = lerp(prev.x, ship.x, alpha);
    const z = lerp(prev.z, ship.z, alpha);
    this.ship.position.set(x, 0, z);
    this.ship.rotation.y = lerp(prev.heading, ship.heading, alpha);

    this.camera.position.set(x + CAM_OFFSET.x, CAM_OFFSET.y, z + CAM_OFFSET.z);
    this.camera.lookAt(x, 0, z);
    // Stars sit at infinity: they travel with the camera and only turn with it.
    this.stars.position.copy(this.camera.position);
  }

  private addStars(count: number, px: number, brightness: number): void {
    const pos: number[] = [];
    const col: number[] = [];
    const c = new Color();
    for (let i = 0; i < count; i++) {
      // uniform on a sphere
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos.push(Math.cos(t) * r * 900, u * 900, Math.sin(t) * r * 900);
      // mostly white, a few warm and a few cool
      const tint = Math.random();
      c.setHSL(tint < 0.15 ? 0.08 : tint > 0.85 ? 0.58 : 0, tint < 0.15 || tint > 0.85 ? 0.6 : 0, 1);
      const b = brightness * (0.35 + Math.random() * 0.65);
      col.push(c.r * b, c.g * b, c.b * b);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new Float32BufferAttribute(col, 3));
    const mat = new PointsMaterial({
      size: px,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -1;
    this.starMats.push({ mat, px });
    this.stars.add(pts);
  }
}

/** A stand-in Starfleet silhouette, nose along +X, about 2.6 units long. */
function buildShip(): Group {
  const hull = new MeshStandardMaterial({ color: 0xc9d2de, metalness: 0.45, roughness: 0.42 });
  const glow = new MeshStandardMaterial({ color: 0x0a1a1f, emissive: CYAN, emissiveIntensity: 1.6 });
  const dish = new MeshStandardMaterial({ color: 0x1a0f05, emissive: AMBER, emissiveIntensity: 1.4 });

  const g = new Group();
  const saucer = new Mesh(new CylinderGeometry(0.95, 1.0, 0.16, 36), hull);
  saucer.position.set(0.55, 0.2, 0);
  const body = new Mesh(new CapsuleGeometry(0.22, 0.9, 4, 12), hull);
  body.rotation.z = Math.PI / 2;
  body.position.set(-0.45, -0.05, 0);
  const deflector = new Mesh(new CylinderGeometry(0.12, 0.12, 0.04, 16), dish);
  deflector.rotation.z = Math.PI / 2;
  deflector.position.set(0.12, -0.05, 0);
  g.add(saucer, body, deflector);

  for (const side of [-1, 1]) {
    const nacelle = new Mesh(new CapsuleGeometry(0.1, 1.1, 4, 10), hull);
    nacelle.rotation.z = Math.PI / 2;
    nacelle.position.set(-0.85, 0.32, side * 0.55);
    const strip = new Mesh(new CapsuleGeometry(0.05, 0.95, 2, 8), glow);
    strip.rotation.z = Math.PI / 2;
    strip.position.set(-0.85, 0.32, side * (0.55 + 0.07));
    const pylon = new Mesh(new CylinderGeometry(0.035, 0.035, 0.6, 6), hull);
    pylon.position.set(-0.7, 0.12, side * 0.3);
    pylon.rotation.x = side * 0.95;
    g.add(nacelle, strip, pylon);
  }
  return g;
}
