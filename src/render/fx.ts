import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, DoubleSide, InstancedMesh, Matrix4, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, NormalBlending, PointLight, Points, Quaternion, RingGeometry, ShaderMaterial,
  Sprite, SpriteMaterial, TetrahedronGeometry, Vector3, type Material, type Scene, type Texture,
} from 'three';
import { metal } from './kit';
import { fireTexture, smokeTexture } from './textures';

// ── effects ───────────────────────────────────────────────────────────────
// The language of impact. A small hit is a flash and a spray of sparks. A
// kill is layered, so it reads as heavy: a white-hot flash, real light thrown
// onto everything near it, a fireball that swells and cools from yellow to
// a dull red, smoke that lingers after the fire is gone, a shockwave ring,
// sparks, and tumbling debris (rock or torn plating). Pools throughout, so
// nothing is allocated mid-fight. Colours are HDR (components above 1) so
// they bloom.

export type RGB = [number, number, number];

const MAX_SPARKS = 1800;

/** Sparks and embers: one Points draw, additive, sized in world units. */
class Sparks {
  readonly points: Points;
  private readonly pos = new Float32Array(MAX_SPARKS * 3);
  private readonly col = new Float32Array(MAX_SPARKS * 3);
  private readonly size = new Float32Array(MAX_SPARKS);
  private readonly vel = new Float32Array(MAX_SPARKS * 3);
  private readonly life = new Float32Array(MAX_SPARKS);
  private readonly decay = new Float32Array(MAX_SPARKS);
  private readonly base = new Float32Array(MAX_SPARKS * 4); // r g b size at birth
  private readonly drag = new Float32Array(MAX_SPARKS);
  private next = 0;

  constructor() {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    g.setAttribute('color', new BufferAttribute(this.col, 3));
    g.setAttribute('size', new BufferAttribute(this.size, 1));
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute vec3 color; varying vec3 vCol; uniform float uScale;
        void main() {
          vCol = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vCol * a, a);
        }`,
    });
    this.points = new Points(g, mat);
    this.points.frustumCulled = false;
  }

  setScale(px: number): void {
    (this.points.material as ShaderMaterial).uniforms.uScale!.value = px;
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, c: Color, size: number, life: number, drag = 0.9): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX_SPARKS;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.base.set([c.r, c.g, c.b, size], i * 4);
    this.life[i] = 1;
    this.decay[i] = 1 / life;
    this.drag[i] = drag;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (this.life[i]! <= 0) { this.size[i] = 0; continue; }
      const l = (this.life[i] = this.life[i]! - this.decay[i]! * dt);
      const d = Math.pow(this.drag[i]!, dt * 60);
      this.vel[i * 3]! *= d; this.vel[i * 3 + 1]! *= d; this.vel[i * 3 + 2]! *= d;
      this.pos[i * 3] = this.pos[i * 3]! + this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1] = this.pos[i * 3 + 1]! + this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2] = this.pos[i * 3 + 2]! + this.vel[i * 3 + 2]! * dt;
      const k = Math.max(0, l);
      // embers cool as they die: the blue and green go first
      this.col[i * 3] = this.base[i * 4]! * k;
      this.col[i * 3 + 1] = this.base[i * 4 + 1]! * k * k;
      this.col[i * 3 + 2] = this.base[i * 4 + 2]! * k * k * k;
      this.size[i] = this.base[i * 4 + 3]! * (0.4 + 0.6 * k);
    }
    const g = this.points.geometry;
    g.attributes.position!.needsUpdate = true;
    g.attributes.color!.needsUpdate = true;
    g.attributes.size!.needsUpdate = true;
  }
}

const MAX_DEBRIS = 140;

/** Fragments: tumbling chunks that fall away and shrink. One pool for rock, one for plating. */
class Debris {
  readonly mesh: InstancedMesh;
  private readonly p = new Float32Array(MAX_DEBRIS * 3);
  private readonly v = new Float32Array(MAX_DEBRIS * 3);
  private readonly a = new Float32Array(MAX_DEBRIS * 4); // axis + angle
  private readonly s = new Float32Array(MAX_DEBRIS * 2); // size, spin
  private readonly life = new Float32Array(MAX_DEBRIS);
  private next = 0;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly ax = new Vector3();
  private readonly pv = new Vector3();
  private readonly sv = new Vector3();

  constructor(geo: BufferGeometry, mat: Material) {
    this.mesh = new InstancedMesh(geo, mat, MAX_DEBRIS);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX_DEBRIS; i++) this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX_DEBRIS;
    this.p.set([x, y, z], i * 3);
    this.v.set([vx, vy, vz], i * 3);
    const ax = Math.random() - 0.5, ay = Math.random() - 0.5, az = Math.random() - 0.5, n = Math.hypot(ax, ay, az) || 1;
    this.a.set([ax / n, ay / n, az / n, Math.random() * 6], i * 4);
    this.s.set([size, (Math.random() - 0.5) * 10], i * 2);
    this.life[i] = 1;
  }

  update(dt: number): void {
    for (let i = 0; i < MAX_DEBRIS; i++) {
      if (this.life[i]! <= 0) continue;
      const l = (this.life[i] = this.life[i]! - dt * 0.45);
      if (l <= 0) { this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0)); continue; }
      const d = Math.pow(0.985, dt * 60);
      for (let k = 0; k < 3; k++) { this.v[i * 3 + k]! *= d; this.p[i * 3 + k] = this.p[i * 3 + k]! + this.v[i * 3 + k]! * dt; }
      this.a[i * 4 + 3] = this.a[i * 4 + 3]! + this.s[i * 2 + 1]! * dt;
      this.q.setFromAxisAngle(this.ax.set(this.a[i * 4]!, this.a[i * 4 + 1]!, this.a[i * 4 + 2]!), this.a[i * 4 + 3]!);
      const sz = this.s[i * 2]! * Math.min(1, l * 3);
      this.m.compose(this.pv.set(this.p[i * 3]!, this.p[i * 3 + 1]!, this.p[i * 3 + 2]!), this.q, this.sv.set(sz, sz, sz));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

interface Puff { sprite: Sprite; life: number; decay: number; size: number; grow: number; vx: number; vy: number; vz: number; hot: boolean; }
interface Flash { sprite: Sprite; life: number; decay: number; max: number; }
interface Ring { mesh: Mesh; life: number; decay: number; max: number; }
interface Glow { light: PointLight; life: number; decay: number; peak: number; }

const FIRE_HOT = new Color(4, 2.6, 1.1);
const FIRE_COOL = new Color(0.9, 0.16, 0.04);

export class Effects {
  private readonly sparks = new Sparks();
  private readonly rock: Debris;
  private readonly plating: Debris;
  private readonly flashes: Flash[] = [];
  private readonly rings: Ring[] = [];
  private readonly fires: Puff[] = [];
  private readonly smokes: Puff[] = [];
  private readonly glows: Glow[] = [];
  private readonly c = new Color();

  constructor(private readonly scene: Scene, glow: Texture) {
    this.rock = new Debris(new TetrahedronGeometry(1, 0),
      new MeshStandardMaterial({ color: 0x2c2724, roughness: 0.9, flatShading: true, emissive: new Color(0.5, 0.08, 0.01) }));
    this.plating = new Debris(new BoxGeometry(1, 0.18, 0.7), metal({ tint: 0x6b6560, roughness: 0.55, metalness: 0.7, scale: 2 }));
    scene.add(this.sparks.points, this.rock.mesh, this.plating.mesh);
    for (let i = 0; i < 28; i++) {
      const sprite = new Sprite(new SpriteMaterial({ map: glow, blending: AdditiveBlending, depthWrite: false, transparent: true }));
      sprite.visible = false;
      scene.add(sprite);
      this.flashes.push({ sprite, life: 0, decay: 1, max: 1 });
    }
    const ringGeo = new RingGeometry(0.88, 1, 64).rotateX(-Math.PI / 2);
    for (let i = 0; i < 14; i++) {
      const mesh = new Mesh(ringGeo, new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, life: 0, decay: 1, max: 1 });
    }
    const puff = (tex: Texture, additive: boolean, list: Puff[], n: number) => {
      for (let i = 0; i < n; i++) {
        const sprite = new Sprite(new SpriteMaterial({
          map: tex, transparent: true, depthWrite: false, blending: additive ? AdditiveBlending : NormalBlending,
        }));
        sprite.visible = false;
        scene.add(sprite);
        list.push({ sprite, life: 0, decay: 1, size: 1, grow: 1, vx: 0, vy: 0, vz: 0, hot: additive });
      }
    };
    puff(fireTexture(), true, this.fires, 64);
    puff(smokeTexture(), false, this.smokes, 64);
    for (let i = 0; i < 4; i++) {
      const light = new PointLight(0xffa060, 0, 46, 2);
      scene.add(light);
      this.glows.push({ light, life: 0, decay: 1, peak: 0 });
    }
  }

  /**
   * The thrown lights on or off. Every lit surface pays for each point light
   * in the scene on every pixel, lit or not, so the low tier goes without.
   * Changing the count recompiles the lit shaders once.
   */
  setLights(on: boolean): void {
    for (const g of this.glows) {
      if (on && !g.light.parent) this.scene.add(g.light);
      if (!on) { g.light.removeFromParent(); g.life = 0; g.light.intensity = 0; }
    }
  }

  /** Point sizes are in world units at a reference viewport height. */
  setViewportHeight(px: number): void {
    this.sparks.setScale(px * 0.28);
  }

  flash(x: number, y: number, z: number, size: number, rgb: RGB, life = 0.18): void {
    const f = this.flashes.find((q) => q.life <= 0) ?? this.flashes[0]!;
    f.sprite.position.set(x, y, z);
    (f.sprite.material as SpriteMaterial).color.setRGB(...rgb);
    f.life = 1; f.decay = 1 / life; f.max = size;
    f.sprite.visible = true;
  }

  /** A shockwave across the plane at the given height. */
  ring(x: number, y: number, z: number, radius: number, rgb: RGB, life = 0.45): void {
    const r = this.rings.find((q) => q.life <= 0) ?? this.rings[0]!;
    r.mesh.position.set(x, y, z);
    (r.mesh.material as MeshBasicMaterial).color.setRGB(...rgb);
    r.life = 1; r.decay = 1 / life; r.max = radius;
    r.mesh.visible = true;
  }

  /** Light thrown onto everything nearby: hulls, rock, the ship. */
  light(x: number, y: number, z: number, rgb: RGB, peak: number, life = 0.25): void {
    const g = this.glows.reduce((a, b) => (b.life * b.peak < a.life * a.peak ? b : a));
    g.light.position.set(x, y + 1, z);
    g.light.color.setRGB(...rgb);
    g.life = 1; g.decay = 1 / life; g.peak = peak;
  }

  /** Sparks thrown out in every direction. */
  burst(x: number, y: number, z: number, n: number, rgb: RGB, speed: number, size = 0.35, life = 0.6): void {
    this.c.setRGB(...rgb);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const sp = speed * (0.3 + Math.random() * 0.9);
      this.sparks.emit(x, y, z, Math.cos(a) * r * sp, u * sp * 0.7, Math.sin(a) * r * sp, this.c, size * (0.5 + Math.random()), life * (0.6 + Math.random() * 0.8));
    }
  }

  /** One spark with a given velocity: trails, exhaust. */
  mote(x: number, y: number, z: number, vx: number, vy: number, vz: number, rgb: RGB, size: number, life: number): void {
    this.c.setRGB(...rgb);
    this.sparks.emit(x, y, z, vx, vy, vz, this.c, size, life, 0.94);
  }

  rubble(kind: 'rock' | 'metal', x: number, y: number, z: number, n: number, size: number, speed: number): void {
    const pool = kind === 'rock' ? this.rock : this.plating;
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = speed * (0.3 + Math.random());
      pool.emit(x, y, z, Math.cos(a) * r * sp, u * sp * 0.6, Math.sin(a) * r * sp, size * (0.4 + Math.random() * 0.8));
    }
  }

  /** A fireball: puffs of flame that swell and cool, then smoke that hangs on after them. */
  fireball(x: number, y: number, z: number, size: number, smoke = 1): void {
    const n = Math.round(4 + size * 1.5);
    for (let i = 0; i < n; i++) {
      const p = this.fires.find((q) => q.life <= 0) ?? this.fires[0]!;
      const o = size * 0.35;
      this.place(p, x + (Math.random() - 0.5) * o, y + (Math.random() - 0.5) * o, z + (Math.random() - 0.5) * o,
        size * (0.5 + Math.random() * 0.5), 1.6 + Math.random() * 0.8, 0.45 + Math.random() * 0.35, size * 0.9);
    }
    for (let i = 0; i < Math.round(n * 0.8 * smoke); i++) {
      const p = this.smokes.find((q) => q.life <= 0) ?? this.smokes[0]!;
      const o = size * 0.5;
      this.place(p, x + (Math.random() - 0.5) * o, y + (Math.random() - 0.5) * o, z + (Math.random() - 0.5) * o,
        size * (0.6 + Math.random() * 0.5), 2.2, 1.6 + Math.random() * 1.2, size * 0.5);
      (p.sprite.material as SpriteMaterial).color.setRGB(0.09, 0.08, 0.075);
    }
  }

  /**
   * A kill: everything at once. `size` is roughly the radius of what died.
   * `tint` is its colour (a faction's, or lava for rock).
   */
  explode(x: number, y: number, z: number, size: number, tint: RGB, kind: 'rock' | 'metal'): void {
    this.flash(x, y, z, size * 4.5, [4, 3.6, 3.2], 0.12);
    this.flash(x, y, z, size * 7, tint, 0.4);
    this.light(x, y, z, [1, 0.62, 0.32], 260 * size, 0.45);
    this.fireball(x, y, z, size * 1.6, kind === 'metal' ? 1 : 0.7);
    this.ring(x, y, z, size * 4.5, [2.6, 1.3, 0.5], 0.55);
    this.burst(x, y, z, Math.round(30 + size * 16), [3.6, 1.9, 0.7], 10 + size * 6, 0.32, 0.9);
    this.burst(x, y, z, Math.round(12 + size * 6), tint, 8 + size * 4, 0.4, 0.7);
    this.rubble(kind, x, y, z, Math.round(5 + size * 5), 0.22 + size * 0.14, 6 + size * 3);
  }

  update(dt: number): void {
    this.sparks.update(dt);
    this.rock.update(dt);
    this.plating.update(dt);
    for (const f of this.flashes) {
      if (f.life <= 0) continue;
      f.life -= f.decay * dt;
      if (f.life <= 0) { f.sprite.visible = false; continue; }
      const k = f.life;
      f.sprite.scale.setScalar(f.max * (1.4 - 0.4 * k));
      (f.sprite.material as SpriteMaterial).opacity = k;
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= r.decay * dt;
      if (r.life <= 0) { r.mesh.visible = false; continue; }
      const t = 1 - r.life;
      r.mesh.scale.setScalar(r.max * (0.15 + 0.85 * (1 - (1 - t) * (1 - t))));
      (r.mesh.material as MeshBasicMaterial).opacity = r.life * 0.9;
    }
    for (const p of this.fires) this.stepPuff(p, dt);
    for (const p of this.smokes) this.stepPuff(p, dt);
    for (const g of this.glows) {
      if (g.life <= 0) { g.light.intensity = 0; continue; }
      g.life = Math.max(0, g.life - g.decay * dt);
      g.light.intensity = g.peak * g.life * g.life;
    }
  }

  private place(p: Puff, x: number, y: number, z: number, size: number, grow: number, life: number, speed: number): void {
    p.sprite.position.set(x, y, z);
    p.size = size; p.grow = grow; p.life = 1; p.decay = 1 / life;
    const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.vx = Math.cos(a) * r * speed; p.vy = u * speed * 0.6 + speed * 0.15; p.vz = Math.sin(a) * r * speed;
    (p.sprite.material as SpriteMaterial).rotation = Math.random() * Math.PI * 2;
    p.sprite.visible = true;
  }

  private stepPuff(p: Puff, dt: number): void {
    if (p.life <= 0) return;
    p.life -= p.decay * dt;
    if (p.life <= 0) { p.sprite.visible = false; return; }
    const t = 1 - p.life, d = Math.pow(0.95, dt * 60);
    p.vx *= d; p.vy *= d; p.vz *= d;
    p.sprite.position.x += p.vx * dt; p.sprite.position.y += p.vy * dt; p.sprite.position.z += p.vz * dt;
    p.sprite.scale.setScalar(p.size * (0.4 + p.grow * (1 - (1 - t) * (1 - t))));
    const mat = p.sprite.material as SpriteMaterial;
    mat.rotation += dt * 0.4;
    if (p.hot) {
      // yellow-white to dull red, then out
      mat.color.copy(FIRE_HOT).lerp(FIRE_COOL, Math.min(1, t * 1.6));
      mat.opacity = p.life * p.life;
    } else {
      mat.opacity = Math.min(1, t * 6) * p.life * 0.85;
    }
  }
}
