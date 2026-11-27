// ── fresh storage for a buffer rewritten whole ─────────────────────────────
// Every frame the game rewrites about sixty vertex buffers in full (instance matrices and colours, sparks, dust,
// streaks: about 340 KB a frame), and three.js does it with bufferSubData into the storage the buffer was made with,
// which for most of them was made "static". Where the GPU may still be reading last frame's copy, a driver has to wait
// for it or copy around it before it can write. Some do that cheaply; Chrome on a Mac (ANGLE over Metal) is where a
// laptop drew 10 to 20 frames a second on every tier, Low included (docs/PERF.md pass 20).
//
// So a rewrite of the whole buffer asks for new storage instead (bufferData, marked dynamic): the classic "orphaning"
// of a buffer. The old storage is released when the GPU is done with it, and nothing waits. The bytes are the same, so
// the picture is the same. Partial updates (three's update ranges) and index buffers go through as before.

const ARRAY = 0x8892; // ARRAY_BUFFER
const DYNAMIC = 0x88e8; // DYNAMIC_DRAW

/** Wrap this one context's buffer calls. Safe to call twice. */
export function installOrphan(gl: WebGL2RenderingContext): void {
  const g = gl as WebGL2RenderingContext & { __orphan?: true };
  if (g.__orphan) return;
  g.__orphan = true;
  const size = new WeakMap<WebGLBuffer, number>();
  let bound: WebGLBuffer | null = null;
  const bind = gl.bindBuffer.bind(gl);
  const data = gl.bufferData.bind(gl) as (t: number, d: AllowSharedBufferSource | number | null, u: number) => void;
  const sub = gl.bufferSubData.bind(gl) as (...a: unknown[]) => void;
  gl.bindBuffer = (target: number, buffer: WebGLBuffer | null) => {
    if (target === ARRAY) bound = buffer;
    bind(target, buffer);
  };
  gl.bufferData = ((target: number, src: AllowSharedBufferSource | number | null, usage: number, ...rest: number[]) => {
    if (target === ARRAY && bound) size.set(bound, typeof src === 'number' ? src : src ? (rest.length ? -1 : src.byteLength) : 0);
    (data as (...a: unknown[]) => void)(target, src, usage, ...rest);
  }) as typeof gl.bufferData;
  gl.bufferSubData = ((target: number, offset: number, src: AllowSharedBufferSource, ...rest: number[]) => {
    // the whole buffer, from the start, from the whole array: new storage, nothing waits
    if (target === ARRAY && bound && offset === 0 && rest.length === 0 && size.get(bound) === src.byteLength) {
      data(target, src, DYNAMIC);
      return;
    }
    sub(target, offset, src, ...rest);
  }) as typeof gl.bufferSubData;
}
