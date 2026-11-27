import { ShaderChunk } from 'three';

// ── point lights that are off cost nothing ─────────────────────────────────
// The scene keeps its point lights (the blast pool, Ned's yard, the ship's lamps) in place at intensity 0 when they are
// not lit: a light that came and went would change the light count and relink every lit shader (docs/PERF.md, pass 11).
// But each one still ran its whole lighting sum on every lit pixel, about ten of them, mostly dark. This wraps the
// point-light loop's body in a test on the light's colour (three.js passes colour times intensity): a dark light is
// skipped, with the same result to the bit, since it would have added zero. The test is on a uniform, so every pixel
// takes the same branch. Patched once, before any material reads the chunk (rocks.ts copies it when it loads).

const START = 'pointLight = pointLights[ i ];';
const END = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';

const chunk = ShaderChunk.lights_fragment_begin;
const a = chunk.indexOf(START), b = chunk.indexOf(END, a);
if (a >= 0 && b > a && !chunk.includes('pointLight.color != vec3( 0.0 )')) {
  ShaderChunk.lights_fragment_begin = chunk.slice(0, a + START.length)
    + '\n\t\tif ( pointLight.color != vec3( 0.0 ) ) {'
    + chunk.slice(a + START.length, b + END.length)
    + '\n\t\t}'
    + chunk.slice(b + END.length);
} else if (a < 0 || b < 0) {
  // three.js changed its light loop: lights still work, only the skip is lost (tests/shader-patches.test.ts fails first)
  console.warn('lightskip: point-light loop not found; dark lights are no longer skipped.');
}
