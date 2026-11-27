import { AdditiveBlending, DoubleSide, Material, type ShaderMaterial } from 'three';

// ── glow that faces both ways, drawn once ──────────────────────────────────
// three.js draws a transparent, double-sided material twice (back faces, then front), switching the material's side
// in between, which costs a program change and a parameter rebuild each time (docs/PERF.md, pass 17: about ten a
// frame, most of the garbage three makes). That order only matters for blending that depends on it. Added light
// doesn't: with depth writes off, back plus front is front plus back, so one draw gives the same picture.
//
// So, for each draw, a material that is transparent, double-sided, additive, writes no depth and doesn't care which
// way its faces point (a basic material with no environment map, or a shader that never reads its normals or facing)
// draws in one pass. Checked on every draw, so a material that changes (the hulls fade, for one) is never caught out;
// a material the game marks single-pass itself is left alone.

const ours = new WeakSet<Material>();
const facing = new WeakMap<Material, boolean>();
const FACING = /gl_FrontFacing|FLIP_SIDED|DOUBLE_SIDED|normal_fragment|defaultnormal_vertex|normal_pars/;

/** Whether the material's look depends on which way a face points. */
function sided(m: Material): boolean {
  let s = facing.get(m);
  if (s === undefined) {
    const sh = m as ShaderMaterial, b = m as Material & { isMeshBasicMaterial?: boolean; envMap?: unknown };
    s = sh.isShaderMaterial ? FACING.test(sh.vertexShader + sh.fragmentShader) : b.isMeshBasicMaterial ? !!b.envMap : true;
    facing.set(m, s);
  }
  return s;
}

Material.prototype.onBeforeRender = function (this: Material) {
  if (this.side !== DoubleSide || !this.transparent) return;
  if (this.forceSinglePass && !ours.has(this)) return;
  const one = this.blending === AdditiveBlending && !this.depthWrite && !sided(this);
  if (one) ours.add(this); else ours.delete(this);
  this.forceSinglePass = one;
};
