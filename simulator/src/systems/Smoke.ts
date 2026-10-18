import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, ShaderMaterial } from 'three'

/**
 * Drift/burnout tutuni: yumshoq dumaloq zarralar (dunyo koordinatasida). Zarra yuqoriga ko'tarilib, kengayib, so'nadi.
 * Bitta Points obyekti = bitta chizish chaqiruvi (arzon).
 */
const MAX = 360
export class SmokeSystem {
  readonly points: Points
  private pos = new Float32Array(MAX * 3)
  private vel = new Float32Array(MAX * 3)
  private age = new Float32Array(MAX).fill(99)
  private life = new Float32Array(MAX).fill(1)
  private size = new Float32Array(MAX)
  private alpha = new Float32Array(MAX)
  private base = new Float32Array(MAX)
  private head = 0
  private geo = new BufferGeometry()

  constructor() {
    this.geo.setAttribute('position', new BufferAttribute(this.pos, 3))
    this.geo.setAttribute('aSize', new BufferAttribute(this.size, 1))
    this.geo.setAttribute('aAlpha', new BufferAttribute(this.alpha, 1))
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: NormalBlending,
      vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA;
        void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * (420.0 / max(1.0, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard; float a = smoothstep(1.0, 0.0, r); gl_FragColor = vec4(0.86, 0.87, 0.9, a * a * vA); }`,
    })
    void AdditiveBlending
    this.points = new Points(this.geo, mat)
    this.points.frustumCulled = false
    this.points.renderOrder = 5
  }

  /** x,y,z — dunyo; (vx,vz) — boshlang'ich siljish; k — zichlik 0..1 */
  emit(x: number, y: number, z: number, vx: number, vz: number, k: number) {
    const i = this.head; this.head = (this.head + 1) % MAX
    const r = Math.random
    this.pos[i * 3] = x + (r() - 0.5) * 0.35; this.pos[i * 3 + 1] = y + 0.12; this.pos[i * 3 + 2] = z + (r() - 0.5) * 0.35
    this.vel[i * 3] = vx * 0.35 + (r() - 0.5) * 1.1; this.vel[i * 3 + 1] = 0.5 + r() * 0.9; this.vel[i * 3 + 2] = vz * 0.35 + (r() - 0.5) * 1.1
    this.age[i] = 0; this.life[i] = 0.9 + r() * 0.9; this.base[i] = 0.35 + 0.65 * k
    this.size[i] = 1.2
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      const a = this.age[i]
      if (a >= this.life[i]) { this.alpha[i] = 0; this.size[i] = 0; continue }
      this.age[i] = a + dt
      const t = this.age[i] / this.life[i]
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt
      this.vel[i * 3] *= 1 - 1.4 * dt; this.vel[i * 3 + 2] *= 1 - 1.4 * dt; this.vel[i * 3 + 1] *= 1 - 0.6 * dt
      this.size[i] = 1.4 + t * 5.5
      this.alpha[i] = this.base[i] * 0.55 * (1 - t) * Math.min(1, t * 8)
    }
    ;(this.geo.attributes.position as BufferAttribute).needsUpdate = true
    ;(this.geo.attributes.aSize as BufferAttribute).needsUpdate = true
    ;(this.geo.attributes.aAlpha as BufferAttribute).needsUpdate = true
  }

  dispose() { this.geo.dispose(); (this.points.material as ShaderMaterial).dispose() }
}
