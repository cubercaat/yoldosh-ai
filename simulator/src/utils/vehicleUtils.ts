import { Color, Material, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three'
import type { VehicleConfig } from '../vehicles/VehicleConfig'
import type { WheelState } from '../physics/WheelPhysics'

const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)

interface WheelNode { node: Object3D | null; baseQuat: Quaternion; basePos: Vector3 }

const cloneEmissive = (root: Object3D | null): MeshStandardMaterial[] => {
  const out: MeshStandardMaterial[] = []
  root?.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const arr = Array.isArray(m.material) ? m.material : [m.material]
    const cloned = arr.map((mt: Material) => {
      const c = mt.clone() as MeshStandardMaterial
      if (c.isMeshStandardMaterial) out.push(c)
      return c
    })
    m.material = Array.isArray(m.material) ? cloned : cloned[0]
  })
  return out
}

/**
 * VehicleVisual — vizual modelni (GLB yoki placeholder) fizika holatiga bog'laydi.
 * Tugunlar NodeMapping bo'yicha topiladi; topilmasa shu qism e'tiborsiz qoldiriladi (xato bermaydi).
 *
 * Qoida: g'ildirak tugunining koordinata boshi = g'ildirak markazi, o'qi = X. Rul tugunining aylanish o'qi = local Z (rul ustuni).
 */
export class VehicleVisual {
  readonly wheels: WheelNode[]
  readonly steering: Object3D | null
  private steerBase = new Quaternion()
  private head: MeshStandardMaterial[]
  private tail: MeshStandardMaterial[]
  private brake: MeshStandardMaterial[]
  readonly found: { wheels: number; steering: boolean; lights: boolean }
  private tmp = new Quaternion()
  private tmp2 = new Quaternion()

  constructor(readonly root: Object3D, readonly cfg: VehicleConfig) {
    const n = cfg.nodes
    const names = [n.wheels.frontLeft, n.wheels.frontRight, n.wheels.rearLeft, n.wheels.rearRight]
    this.wheels = names.map((nm) => { const node = root.getObjectByName(nm) ?? null; return { node, baseQuat: node ? node.quaternion.clone() : new Quaternion(), basePos: node ? node.position.clone() : new Vector3() } })
    this.steering = root.getObjectByName(n.steeringWheel) ?? null
    if (this.steering) this.steerBase.copy(this.steering.quaternion)
    this.head = cloneEmissive(root.getObjectByName(n.headlights) ?? null)
    this.tail = cloneEmissive(root.getObjectByName(n.taillights) ?? null)
    this.brake = cloneEmissive(root.getObjectByName(n.brakeLights) ?? null)
    this.found = { wheels: this.wheels.filter((w) => w.node).length, steering: !!this.steering, lights: this.head.length + this.tail.length + this.brake.length > 0 }
  }

  /** Har kadrda chaqiriladi. wheels — fizika holati. */
  apply(wheels: WheelState[], steerNorm: number, braking: boolean, lightsOn: boolean, night: number) {
    const rest = this.cfg.suspension.restLength
    for (let i = 0; i < 4; i++) {
      const w = this.wheels[i]
      if (!w.node) continue
      const s = wheels[i]
      // pozitsiya: osma uzunligi o'zgarishiga qarab g'ildirak yuqoriga/pastga siljiydi
      w.node.position.set(w.basePos.x, w.basePos.y - (s.suspensionLength - rest), w.basePos.z)
      // aylanish: burilish (Y) * dumalash (X)
      this.tmp.setFromAxisAngle(AXIS_Y, s.steer)
      this.tmp2.setFromAxisAngle(AXIS_X, s.spin)
      w.node.quaternion.copy(w.baseQuat).multiply(this.tmp).multiply(this.tmp2)
    }
    if (this.steering) {
      this.tmp.setFromAxisAngle(new Vector3(0, 0, 1), -steerNorm * 2.4) // rul g'ildiragi ~ 137° gacha buriladi
      this.steering.quaternion.copy(this.steerBase).multiply(this.tmp)
    }
    const headI = lightsOn ? 2.6 : 0.12, tailI = lightsOn || night > 0.5 ? 0.9 : 0.1, brakeI = braking ? 3.0 : lightsOn ? 0.5 : 0.05
    this.set(this.head, '#fff1c4', headI); this.set(this.tail, '#ff2030', tailI); this.set(this.brake, '#ff1020', brakeI)
  }

  private set(mats: MeshStandardMaterial[], color: string, intensity: number) {
    for (const m of mats) { if (m.emissiveIntensity === intensity) continue; if (m.emissive.getHex() === 0) m.emissive = new Color(color); m.emissiveIntensity = intensity }
  }
}

/** GLB faylining mavjudligini tekshirish (404 yoki HTML qaytsa — yo'q hisoblanadi). Natija keshlanadi. */
const probeCache = new Map<string, Promise<boolean>>()
export function probeGLB(url: string): Promise<boolean> {
  let p = probeCache.get(url)
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(url, { headers: { Range: 'bytes=0-3' } })
        if (!res.ok) return false
        const reader = res.body?.getReader()
        if (!reader) return false
        const { value } = await reader.read()
        reader.cancel().catch(() => { })
        if (!value || value.length < 4) return false
        return String.fromCharCode(value[0], value[1], value[2], value[3]) === 'glTF' // GLB sehrli bayti
      } catch { return false }
    })()
    probeCache.set(url, p)
  }
  return p
}
