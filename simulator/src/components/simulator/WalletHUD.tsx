import { useEffect } from 'react'
import { fmtSom, useWallet } from '../../systems/WalletSystem'

/** Balans, radar ogohlantirishi va jarima kartasi. Hamyon ulanmagan bo'lsa hech narsa ko'rsatmaydi. */
export function WalletHUD({ onBroke }: { onBroke: () => void }) {
  const w = useWallet()
  const card = w.fineCard
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
      {w.radarAhead > 0 && !card && <div className="wal-ahead">📷 Radar {w.radarAhead} m</div>}
      {card && (
        <div className="wal-fine glass">
          <h3>🚨 {card.kind === 'radar' ? 'Radar jarimasi' : 'Svetofor kamerasi'}</h3>
          {card.kind === 'radar' && <p>{card.speed} km/h · chegara {card.limit} km/h</p>}
          {card.kind === 'redlight' && <p>Qizil chiroqda o'tdingiz</p>}
          <p>{card.where}</p>
          <strong>−{fmtSom(card.fine)} so'm</strong>
          <small>Qoldi: {fmtSom(card.balance)} so'm</small>
        </div>
      )}
    </>
  )
}
