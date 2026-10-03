import {
  Color, IcosahedronGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3, type BufferGeometry, type Scene,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ── the test course ───────────────────────────────────────────────────────
// Drifting rock for M1, so there is something to fly past while the flight
// model and the camera are judged. Scenery only: nothing collides until M2,
// which replaces this with the real field.
//
// The look is the art direction's: faceted basalt with a thin dilithium rim
// light on the silhouette, so a rock reads against deep space at a glance.

const BASALT = new Color('#1A1622');
const DILITHIUM = new Color('#C77DFF');
const VARIANTS = 4;
const PER = 10;
const BAND = 170; // the field tiles in a square this wide around the camera

function rockGeometry(seed: number): BufferGeometry {
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const g = mergeVertices(new IcosahedronGeometry(1, 0).deleteAttribute('normal').deleteAttribute('uv'));
  const p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const k = 0.72 + rnd() * 0.5;
    p.setXYZ(i, p.getX(i) * k * 1.15, p.getY(i) * k * 0.8, p.getZ(i) * k);
  }
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

function rimMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: BASALT, roughness: 0.92, metalness: 0.08, flatShading: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: DILITHIUM };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.6);
        totalEmissiveRadiance += uRim * rimF * 0.9;`);
  };
  return m;
}

interface Rock { x: number; z: number; y: number; vx: number; vz: number; s: number; axis: Vector3; spin: number; angle: number; }

export class Scenery {
  private readonly meshes: InstancedMesh[] = [];
  private readonly rocks: Rock[][] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly sc = new Vector3();

  constructor(scene: Scene) {
    const mat = rimMaterial();
    for (let k = 0; k < VARIANTS; k++) {
      const mesh = new InstancedMesh(rockGeometry(k + 1), mat, PER);
      mesh.frustumCulled = false;
      const list: Rock[] = [];
      for (let i = 0; i < PER; i++) {
        const ang = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5;
        list.push({
          x: (Math.random() - 0.5) * BAND, z: (Math.random() - 0.5) * BAND, y: -0.4 - Math.random() * 1.2,
          vx: Math.cos(ang) * sp, vz: Math.sin(ang) * sp,
          s: 0.9 + Math.pow(Math.random(), 2) * 3.2,
          axis: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
          spin: (Math.random() - 0.5) * 1.2, angle: Math.random() * 6,
        });
      }
      this.meshes.push(mesh);
      this.rocks.push(list);
      scene.add(mesh);
    }
  }

  /** Drift, spin and keep the field tiled around (cx, cz). */
  update(dt: number, cx: number, cz: number): void {
    const half = BAND / 2;
    this.meshes.forEach((mesh, k) => {
      this.rocks[k]!.forEach((r, i) => {
        r.x += r.vx * dt; r.z += r.vz * dt; r.angle += r.spin * dt;
        if (r.x - cx > half) r.x -= BAND; else if (r.x - cx < -half) r.x += BAND;
        if (r.z - cz > half) r.z -= BAND; else if (r.z - cz < -half) r.z += BAND;
        this.q.setFromAxisAngle(r.axis, r.angle);
        this.m.compose(this.v.set(r.x, r.y, r.z), this.q, this.sc.set(r.s, r.s, r.s));
        mesh.setMatrixAt(i, this.m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }
}
