import {
  Color, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3,
  type BufferGeometry, type Scene,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { STEP } from '../core/loop';
import { fbm } from '../core/noise';
import { ROCK_VARIANTS, type Rock } from '../sim/field';
import { rockTexture, veinTexture } from './textures';

// ── rock ──────────────────────────────────────────────────────────────────
// Dark basalt split by dilithium veins that glow (and bloom), on a craggy,
// faceted body: an icosahedron, subdivided and pushed out by fractal noise,
// shaded flat so it reads as cut stone. Four shapes, drawn as one instanced
// mesh each; a rock's size is its scale. A hit flashes it.

const PER_VARIANT = 48;

function rockGeometry(seed: number): BufferGeometry {
  const g = mergeVertices(new IcosahedronGeometry(1, 3).deleteAttribute('normal'), 1e-4);
  const p = g.attributes.position!;
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const big = fbm(v.x * 1.3 + seed, v.y * 1.3, v.z * 1.3, 3, seed);
    const fine = fbm(v.x * 4 + seed, v.y * 4, v.z * 4, 2, seed + 9);
    const k = 1 + big * 0.42 + fine * 0.1;
    v.multiplyScalar(k);
    v.y *= 0.82; // a little flattened, so they lie on the plane
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

export class RockView {
  private readonly meshes: InstancedMesh[] = [];
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly pos = new Vector3();
  private readonly sc = new Vector3();
  private readonly axis = new Vector3();
  private readonly col = new Color();

  constructor(scene: Scene) {
    const mats = [0, 1].map((k) => {
      const m = new MeshStandardMaterial({
        map: rockTexture(11 + k), emissiveMap: veinTexture(23 + k), emissive: new Color(2.6, 2.6, 2.6),
        roughness: 0.9, metalness: 0.05, flatShading: true,
      });
      // a thin dilithium rim on the silhouette, so rock reads against deep space
      m.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float rimF = pow(clamp(1.0 - abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += vec3(0.62, 0.32, 1.0) * rimF * 0.5;`);
      };
      return m;
    });
    for (let k = 0; k < ROCK_VARIANTS; k++) {
      const mesh = new InstancedMesh(rockGeometry(k * 3.7 + 1), mats[k % 2]!, PER_VARIANT);
      mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(PER_VARIANT * 3).fill(1), 3);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.meshes.push(mesh);
      scene.add(mesh);
    }
  }

  /** Draw the field, `alpha` of a step past the simulated positions' previous step. */
  update(rocks: readonly Rock[], alpha: number): void {
    const counts = new Array<number>(this.meshes.length).fill(0);
    const back = (1 - alpha) * STEP;
    for (const r of rocks) {
      const mesh = this.meshes[r.variant]!;
      const i = counts[r.variant]!;
      if (i >= PER_VARIANT) continue;
      counts[r.variant] = i + 1;
      const grow = Math.min(1, r.age / 0.6);
      const s = r.r * (grow * grow * (3 - 2 * grow));
      this.q.setFromAxisAngle(this.axis.set(r.ax, r.ay, r.az), r.spin * r.age + r.id);
      this.m.compose(this.pos.set(r.x - r.vx * back, -0.3, r.z - r.vz * back), this.q, this.sc.set(s, s, s));
      mesh.setMatrixAt(i, this.m);
      const flash = 1 + (r.hitT / 0.12) * 3;
      mesh.setColorAt(i, this.col.setRGB(flash, flash, flash));
    }
    this.meshes.forEach((mesh, k) => {
      mesh.count = counts[k]!;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }
}
