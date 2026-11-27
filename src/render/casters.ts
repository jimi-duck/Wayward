import { MeshDepthMaterial, type InstancedMesh } from 'three';

// The sun's shadow pass draws every caster with one shared depth material unless an object brings its own. Instanced
// and plain casters need different programs, so as the pass went from a rock pool to the ship and back, three.js
// changed the shared material's program and rebuilt its parameters each time (docs/PERF.md, pass 17). The instanced
// pools bring their own copies instead: the same material, so the same shadow, with no switching.
const tinted = new MeshDepthMaterial(), plain = new MeshDepthMaterial();

/** Cast the sun's shadow from an instanced pool, with a depth material of its own kind. Call after any instance colour is set. */
export function instancedCaster(m: InstancedMesh): void {
  m.castShadow = true;
  m.customDepthMaterial = m.instanceColor ? tinted : plain;
}
