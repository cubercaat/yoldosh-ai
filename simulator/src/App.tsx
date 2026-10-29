import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSimStore } from './store/simulatorStore'
import { attachInput } from './systems/InputSystem'
import { VehicleSelector } from './components/simulator/VehicleSelector'
import { Simulator } from './components/simulator/Simulator'
import { getAccess } from './utils/access'
import { OrientationGate, goLandscape } from './components/simulator/OrientationGate'
import { aw } from './world/activeWorld'
import { useWallet } from './systems/WalletSystem'
import { loadTashkent } from './world/tashkent/tk'
import { handles } from './components/simulator/handles'
import { input } from './systems/InputSystem'
import { live } from './store/simulatorStore'
import { tune } from './vehicles/VehicleController'
;(window as unknown as { __drive?: unknown }).__drive = { useSimStore, handles, input, live, tune }   // sinov/debug uchun

export default function App() {
  const screen = useSimStore((s) => s.screen)
  const [tick, setTick] = useState(0)
  const [block, setBlock] = useState('')
  const access = useMemo(() => getAccess(), [tick, screen]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => attachInput(), [])

  const drive = useCallback(async () => {
    const st = useSimStore.getState()
    const v = st.vehicleId
    const a = getAccess()
    const g = await useWallet.getState().gate()
    if (!g.ok) { setBlock(g.reason); return }
    setBlock('')
    if (!useWallet.getState().connected && a.left(v) <= 0) return
    const tk = st.worldKind === 'tashkent'
    if (tk) { try { await loadTashkent() } catch { setBlock("Toshkent xaritasi yuklanmadi. Internetni tekshirib qayta urining."); return } }
    goLandscape()
    aw.kind = tk ? 'city' : st.worldKind
    aw.tashkent = tk
    st.patch({ screen: 'playing', loadStatus: 'loading', distance: 0, score: 100, toasts: [] })
  }, [])
  const exit = useCallback(() => { useSimStore.getState().patch({ screen: 'select' }); setTick((t) => t + 1) }, [])

  return (<>
    {screen === 'select' ? <VehicleSelector access={access} onDrive={() => void drive()} /> : <Simulator access={access} onExit={exit} />}
    {block && screen === 'select' && <div className="wal-block glass">{block}<a href="../#/app">Saytga qaytish</a></div>}
    <OrientationGate />
  </>)
}
