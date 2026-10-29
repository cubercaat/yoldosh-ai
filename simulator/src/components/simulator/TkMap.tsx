import { useEffect, useRef } from 'react'
import { live } from '../../store/simulatorStore'
import { radarsInRectTk, waysInRect } from '../../world/tashkent/tk'

const COL = ['#e8b64a', '#d9dde6', '#a9b2c2', '#7f8899', '#5f6878']
/** Toshkent mini-xaritasi: haqiqiy yo'llar (heading-up), radarlar sariq nuqta */
export function TkMap() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const g = cv.getContext('2d')!, S = cv.width, R = 260, k = S / (2 * R)
    const draw = () => {
      const [px, , pz] = live.position, fx = Math.sin(live.yaw), fz = Math.cos(live.yaw), rx = -fz, rz = fx
      const sx = (x: number, z: number) => S / 2 + ((x - px) * rx + (z - pz) * rz) * k
      const sy = (x: number, z: number) => S / 2 - ((x - px) * fx + (z - pz) * fz) * k
      g.clearRect(0, 0, S, S); g.fillStyle = 'rgba(10,15,24,.86)'; g.fillRect(0, 0, S, S)
      g.lineCap = 'round'; g.lineJoin = 'round'
      const ws = waysInRect(px - R, pz - R, px + R, pz + R).sort((a, b) => b.cls - a.cls)
      for (const w of ws) {
        g.beginPath(); for (let i = 0; i < w.pts.length / 2; i++) { const X = sx(w.pts[i * 2], w.pts[i * 2 + 1]), Y = sy(w.pts[i * 2], w.pts[i * 2 + 1]); i ? g.lineTo(X, Y) : g.moveTo(X, Y) }
        g.strokeStyle = COL[w.cls]; g.lineWidth = Math.max(1.4, w.w * k * 0.8); g.stroke()
      }
      g.fillStyle = '#ffd24d'
      for (const r of radarsInRectTk(px - R, pz - R, px + R, pz + R)) { g.beginPath(); g.arc(sx(r.cx, r.cz), sy(r.cx, r.cz), 3.2, 0, 7); g.fill() }
      g.save(); g.translate(S / 2, S / 2); g.fillStyle = '#4D8DFF'; g.strokeStyle = '#fff'; g.lineWidth = 1.5
      g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke(); g.restore()
    }
    draw(); const id = setInterval(draw, 125); return () => clearInterval(id)
  }, [])
  return <canvas ref={ref} className="minimap glass" width={170} height={170} style={{ width: 170, height: 170 }} aria-label="Toshkent xaritasi" />
}
