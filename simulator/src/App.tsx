import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSimStore } from './store/simulatorStore'
import { attachInput } from './systems/InputSystem'
import { VehicleSelector } from './components/simulator/VehicleSelector'
import { Simulator } from './components/simulator/Simulator'
import { getAccess } from './utils/access'
import { OrientationGate, goLandscape } from './components/simulator/OrientationGate'
import { aw } from './world/activeWorld'
import { handles } from './components/simulator/handles'
import { input } from './systems/InputSystem'
import { live } from './store/simulatorStore'
;(window as unknown as { __sim?: unknown }).__sim = { useSimStore, handles, input, live }   // sinov/debug uchun

export default function App() {
  const screen = useSimStore((s) => s.screen)
  const [tick, setTick] = useState(0)
  const access = useMemo(() => getAccess(), [tick, screen]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => attachInput(), [])

  const drive = useCallback(() => {
    const st = useSimStore.getState()
    const v = st.vehicleId
    const a = getAccess()
    if (a.left(v) <= 0) return
    goLandscape()
    aw.kind = st.worldKind
    st.patch({ screen: 'playing', loadStatus: 'loading', distance: 0, score: 100, toasts: [] })
  }, [])
  const exit = useCallback(() => { useSimStore.getState().patch({ screen: 'select' }); setTick((t) => t + 1) }, [])

  return (<>
    {screen === 'select' ? <VehicleSelector access={access} onDrive={drive} /> : <Simulator access={access} onExit={exit} />}
    <OrientationGate />
  </>)
}
