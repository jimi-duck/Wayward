import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { Material, ShaderChunk, ShaderLib } from 'three';
import '../src/render/lightskip';

// The game changes three.js's shaders by finding a piece of their text and replacing it (`onBeforeCompile`, and a few
// chunks patched once at load). If a three.js upgrade renames or rewrites that text, the replace finds nothing, nothing
// errors, and the effect is simply gone: rock lighting, hull wear, the fog's sun. These tests read every such search
// text in src/render and check that three.js still has it, so an upgrade that breaks one fails here instead.

const FILES = readdirSync('src/render').filter((f) => f.endsWith('.ts'));
const SOURCES = FILES.map((f) => ({ f, text: readFileSync(`src/render/${f}`, 'utf8') }));

/** Every program three.js ships, vertex and fragment, with its #includes left in (what onBeforeCompile sees). */
const PROGRAMS = Object.values(ShaderLib).flatMap((p) => [p.vertexShader, p.fragmentShader]).join('\n');
/** Every chunk's own text: where a replace aimed inside a chunk finds its words. */
const CHUNKS = Object.values(ShaderChunk).join('\n');

/** The single-quoted search text of each `.replace('…', …)` in a source file. */
function searches(text: string): string[] {
  return [...text.matchAll(/\.replace\(\s*'((?:[^'\\]|\\.)*)'\s*,/g)].map((m) => m[1]!.replace(/\\n/g, '\n'));
}

/** Whether `s` stands in the game's own shader text as code: not quoted as a replace's search, nor opening a replacement. */
function ownCode(own: string, s: string): boolean {
  for (let i = own.indexOf(s); i >= 0; i = own.indexOf(s, i + 1)) {
    const before = own[i - 1];
    if (before !== "'" && before !== '`') return true;
  }
  return false;
}

describe('shader patches', () => {
  it('only splice in at #includes three.js still has', () => {
    const missing: string[] = [];
    for (const { f, text } of SOURCES) {
      for (const s of searches(text)) {
        const inc = /^#include <(\w+)>$/.exec(s);
        if (!inc) continue;
        if (!(inc[1]! in ShaderChunk) || !PROGRAMS.includes(s)) missing.push(`${f}: ${s}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('find the GLSL text they replace inside three.js (or inside the game’s own shader text)', () => {
    const own = SOURCES.map((s) => s.text).join('\n');
    const missing: string[] = [];
    for (const { f, text } of SOURCES) {
      for (const s of searches(text)) {
        // GLSL only: a statement, a call or a marker comment, not a word swapped in some label or path
        if (s.startsWith('#include') || (!s.startsWith('// ') && (!/[;(]/.test(s) || !/\s/.test(s)))) continue;
        const inThree = PROGRAMS.includes(s) || CHUNKS.includes(s);
        // the game's own shader text: the same words written as shader code, not as the search or the start of a replacement
        const inOwn = ownCode(own, s);
        if (!inThree && !inOwn) missing.push(`${f}: ${s}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('skip dark point lights (lightskip.ts found its anchors)', () => {
    expect(ShaderChunk.lights_fragment_begin).toContain('if ( pointLight.color != vec3( 0.0 ) ) {');
  });

  it('tint the rock sun per light (rocks.ts finds its anchor in the light loop)', () => {
    expect(ShaderChunk.lights_fragment_begin).toContain('getDirectionalLightInfo( directionalLight, directLight );');
    expect(ShaderChunk.lights_fragment_begin).toContain('UNROLLED_LOOP_INDEX');
  });

  it('keep the fog chunks the aerial haze replaces, at the places it expects', () => {
    for (const c of ['fog_pars_vertex', 'fog_vertex', 'fog_pars_fragment', 'fog_fragment']) {
      expect(ShaderChunk).toHaveProperty(c);
      expect(PROGRAMS).toContain(`#include <${c}>`);
    }
    // aerial.ts's fog_vertex reads the view-space position three.js computes just before it
    expect(ShaderChunk.project_vertex).toContain('vec4 mvPosition');
  });

  it('still let a material draw in one pass, and name facing the way singlepass.ts looks for it', () => {
    expect('forceSinglePass' in new Material()).toBe(true);
    for (const c of ['normal_fragment_begin', 'normal_fragment_maps', 'defaultnormal_vertex', 'normal_pars_fragment']) expect(ShaderChunk).toHaveProperty(c);
    expect(ShaderChunk.normal_fragment_begin).toContain('gl_FrontFacing');
  });
});
