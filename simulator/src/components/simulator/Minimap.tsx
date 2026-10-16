import { useEffect, useRef } from 'react'
import { live } from '../../store/simulatorStore'
import { RB_R_OUT, crossingsInRect, segPoint, segmentsInRect, type RoadClass } from '../../world/procedural/cityPlan'
import { blocksInRect, getBlock } from '../../world/procedural/blocks'
import { handles } from './handles'
import { MAP_H, MAP_W, drawAutodrom, x2px, z2px } from '../../world/autodrom/layout'

const W: Record<RoadClass, number> = { highway: 24, main: 17, secondary: 11, residential: 8.5 }
const COL: Record<RoadClass, string> = { highway: '#e8b64a', main: '#c9ced8', secondary: '#9aa3b2', residential: '#6f7888' }

/**
 * Yengil mini-xarita: butun 3D dunyo chizilmaydi. Faqat yo'l o'qlari (chiziqlar), aylanalar, parklar, belgili joylar,
 * oyinchi va maqsad. Yo'nalish: mashina oldinga qaraydi (heading-up). Atrofdagi ~240 m radius, 8 Hz.
 */
export function MiniMap() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const g = cv.getContext('2d')!, S = cv.width, R = 230, k = S / (2 * R)
    const draw = () => {
      const [px, , pz] = live.position, fx = Math.sin(live.yaw), fz = Math.cos(live.yaw), rx = -fz, rz = fx
      const sx = (x: number, z: number) => S / 2 + ((x - px) * rx + (z - pz) * rz) * k
      const sy = (x: number, z: number) => S / 2 - ((x - px) * fx + (z - pz) * fz) * k
      g.clearRect(0, 0, S, S); g.fillStyle = 'rgba(10,15,24,.86)'; g.fillRect(0, 0, S, S)
      // parklar va belgili joylar
      for (const [bi, bj] of blocksInRect(px - R, pz - R, px + R, pz + R)) {
        for (const l of getBlock(bi, bj).lots) {
          if (l.kind === 'park' && l.poly) {
            g.fillStyle = 'rgba(70,150,80,.55)'; g.beginPath()
            l.poly.forEach(([x, z], i) => { const X = sx(x, z), Y = sy(x, z); if (i) g.lineTo(X, Y); else g.moveTo(X, Y) }); g.closePath(); g.fill()
          } else if (l.landmark || l.kind === 'fuel' || l.kind === 'supermarket') {
            g.fillStyle = l.landmark ? '#ffcf5a' : '#6fb7ff'; const X = sx(l.x, l.z), Y = sy(l.x, l.z)
            g.fillRect(X - 3, Y - 3, 6, 6)
          }
        }
      }
      // yo'llar: avval qora kontur, keyin rangli o'q
      const segs = segmentsInRect(px - R, pz - R, px + R, pz + R, 10)
      for (const pass of [0, 1]) {
        for (const s of segs) {
          g.strokeStyle = pass ? COL[s.cls] : '#05080d'; g.lineWidth = Math.max(1.5, W[s.cls] * k * (pass ? 0.8 : 1.35)); g.lineCap = 'round'
          g.beginPath()
          const a = s.p0, b = s.p1, n = s.bendKind ? Math.max(2, Math.ceil((b - a) / 14)) : 1
          for (let i = 0; i <= n; i++) { const p = segPoint(s, a + ((b - a) * i) / n), X = sx(p.x, p.z), Y = sy(p.x, p.z); if (i) g.lineTo(X, Y); else g.moveTo(X, Y) }
          g.stroke()
        }
      }
      // aylanalar
      for (const c of crossingsInRect(px - R, pz - R, px + R, pz + R)) {
        if (!c.roundabout) continue
        const X = sx(c.x, c.z), Y = sy(c.x, c.z)
        g.strokeStyle = '#d9dee8'; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, RB_R_OUT * k * 0.8, 0, 7); g.stroke()
        g.fillStyle = '#3d8b4a'; g.beginPath(); g.arc(X, Y, RB_R_OUT * k * 0.35, 0, 7); g.fill()
      }
      // maqsad
      const d = handles.checkpoints?.current
      if (d) {
        let X = sx(d.x, d.z), Y = sy(d.x, d.z)
        const dx = X - S / 2, dy = Y - S / 2, r = Math.hypot(dx, dy), lim = S / 2 - 8
        if (r > lim) { X = S / 2 + (dx / r) * lim; Y = S / 2 + (dy / r) * lim }
        g.fillStyle = '#B8F53B'; g.beginPath(); g.arc(X, Y, 5, 0, 7); g.fill(); g.strokeStyle = '#0b1400'; g.lineWidth = 1.5; g.stroke()
      }
      // oyinchi
      g.save(); g.translate(S / 2, S / 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.restore()
    }
    draw(); const id = setInterval(draw, 125); return () => clearInterval(id)
  }, [])
  return <canvas ref={ref} className="minimap glass" width={170} height={170} aria-label="Xarita" />
}

/** Joriy yo'l tezlik chegarasi belgisi */
export function LimitSign() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const id = setInterval(() => { const el = ref.current; if (!el) return; const l = live.limit; el.style.display = l > 0 ? 'grid' : 'none'; el.textContent = String(l) }, 250)
    return () => clearInterval(id)
  }, [])
  return <div ref={ref} className="limit" title="Tezlik chegarasi (km/soat)" />
}

/** Avtodrom xaritasi: butun maydon (shimol tepada) + mashina nuqtasi va yo'nalishi */
export function AutodromMap() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const base = document.createElement('canvas'); drawAutodrom(base, 0.62)
    const g = cv.getContext('2d')!, w = cv.width, h = cv.height
    const draw = () => {
      g.clearRect(0, 0, w, h); g.drawImage(base, 0, 0, w, h)
      const px = (x2px(live.position[0]) / MAP_W) * w, py = (z2px(live.position[2]) / MAP_H) * h
      g.save(); g.translate(px, py); g.rotate(Math.PI - live.yaw)
      g.fillStyle = '#B8F53B'; g.strokeStyle = '#0b1400'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(0, 3); g.lineTo(-5, 6); g.closePath(); g.fill(); g.stroke(); g.restore()
    }
    draw(); const id = setInterval(draw, 100); return () => clearInterval(id)
  }, [])
  return <canvas ref={ref} className="minimap glass" width={200} height={150} style={{ width: 200, height: 150 }} aria-label="Avtodrom xaritasi" />
}
