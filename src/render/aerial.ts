import { ShaderChunk } from 'three';
import { dirOf, SUN_AZ, SUN_EL } from './sky';

// ── aerial perspective ────────────────────────────────────────────────────
// three's fog mixes a far thing all the way to one flat colour, so distant rock
// and hulls turned into grey cut-outs. This replaces the fog chunks for every
// material, once, before anything compiles:
//
//   - in-scatter: looking toward the star the haze glows warm and brighter,
//     away from it it keeps the sky's cool colour (the dome's sun, SUN_AZ/EL);
//   - the haze takes contrast first and never quite all of a thing: a lit face
//     keeps more of itself than a shadowed one, so far rock reads as lit stone
//     in a coloured haze, not as a hole;
//   - the near bubble stays as clear as before (the exp2 curve is unchanged);
//   - held back (owner 2026-11-21): a rock between the ship and the star took nearly all the bright haze and read as a
//     flat pale lilac cut-out, so the haze takes at most 60% and brightens only a little toward the star.
//
// The sun's direction is fixed in the world, so it is baked into the chunk; the
// view direction comes from mvPosition, which every shader with fog has.

/** How much of a far thing the haze may take at most: the unlit side. */
const AERIAL_MAX = 0.6;
/** How much more a lit face keeps of itself through the haze. */
const AERIAL_LIT = 0.2;

let done = false;

/** Swap the fog chunks (idempotent; call before the first material compiles). */
export function installAerial(): void {
  if (done) return;
  done = true;
  const s = dirOf(SUN_AZ, SUN_EL);
  const sun = `vec3(${s.x.toFixed(4)}, ${s.y.toFixed(4)}, ${s.z.toFixed(4)})`;
  ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogView;
#endif
`;
  ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogView = mvPosition.xyz;
#endif
`;
  ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogView;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif
`;
  ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  vec3 fogSunV = normalize( ( viewMatrix * vec4( ${sun}, 0.0 ) ).xyz );
  float fogSun = max( dot( normalize( vFogView ), fogSunV ), 0.0 );
  float fogLum = dot( fogColor, vec3( 0.3, 0.5, 0.2 ) );
  // toward the star the haze is lit from behind: brighter and warm; away from it, the sky's own colour
  vec3 fogTint = fogColor * ( 1.0 + 0.5 * pow( fogSun, 5.0 ) ) + vec3( 1.0, 0.8, 0.58 ) * ( fogLum * 1.0 + 0.006 ) * pow( fogSun, 14.0 );
  // the haze takes contrast first: a lit face keeps more of itself than a shadowed one
  float fogKeep = smoothstep( 0.02, 0.3, dot( gl_FragColor.rgb, vec3( 0.3, 0.5, 0.2 ) ) );
  fogFactor *= ${AERIAL_MAX.toFixed(2)} - ${AERIAL_LIT.toFixed(2)} * fogKeep;
  // and its colour: what the haze does not take is cooled a little toward it
  vec3 fogHue = fogColor / max( max( fogColor.r, max( fogColor.g, fogColor.b ) ), 0.001 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * fogHue, fogFactor * 0.3 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogTint, fogFactor );
#endif
`;
}
