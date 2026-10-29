import { useEffect, useState } from 'react'
import { fmtSom, useWallet } from '../../systems/WalletSystem'
import { aw } from '../../world/activeWorld'
import { live } from '../../store/simulatorStore'
import { nearestWay } from '../../world/tashkent/tk'

/** Balans, radar ogohlantirishi va jarima kartasi. Hamyon ulanmagan bo'lsa hech narsa ko'rsatmaydi. */
export function WalletHUD({ onBroke }: { onBroke: () => void }) {
  const w = useWallet()
  const card = w.fineCard
  const [street, setStreet] = useState('')
  useEffect(() => { if (!aw.tashkent) return; const t = setInterval(() => { const h = nearestWay(live.position[0], live.position[2], 25); setStreet(h && h.dist < h.way.w / 2 + 6 ? `${h.way.name || 'Nomsiz ko\'cha'} · ${h.way.limit} km/h` : '') }, 600); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!card) return
    const t = setTimeout(() => useWallet.getState().clearFine(), 6500)
    return () => clearTimeout(t)
  }, [card])
  useEffect(() => { if (card && card.balance <= 0) { const t = setTimeout(onBroke, 3500); return () => clearTimeout(t) } }, [card, onBroke])
  if (!w.connected) return null
  const m = Math.floor(w.playSec / 60), s = w.playSec % 60
  return (
    <>
      <div className="wal-hud glass">
        <b>💰 {fmtSom(w.balance)} so'm</b>
        {!w.unlimited && <span>⏱ {m}:{String(s).padStart(2, '0')}</span>}
      </div>
      {street && <div className="wal-street">📍 {street}</div>}
      {w.radarAhead > 0 && !card && <div className="wal-ahead">📷 Radar {w.radarAhead} m</div>}
      {card && (
        <div className="wal-fine glass">
          <h3>🚨 {card.kind === 'radar' ? 'Radar jarimasi' : card.kind === 'redlight' ? 'Svetofor kamerasi' : "Qarama-qarshi yo'l"}</h3>
          {card.kind === 'radar' && <p>{card.speed} km/h · chegara {card.limit} km/h</p>}
          {card.kind === 'redlight' && <p>Qizil chiroqda o'tdingiz</p>}
          {card.kind === 'wrongway' && <p>Qarama-qarshi yo'nalishda harakatlandingiz</p>}
          <p>{card.where}</p>
          <p>{card.brv} BRV{card.repeat > 0 ? ` · takroriy (${card.repeat + 1}-marta)` : ''}</p>
          <strong>−{fmtSom(card.fine)} so'm</strong>
          <small>Qoldi: {fmtSom(card.balance)} so'm</small>
        </div>
      )}
    </>
  )
}
