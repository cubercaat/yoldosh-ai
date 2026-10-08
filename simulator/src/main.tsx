import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { useSimStore, live } from './store/simulatorStore'
import { handles } from './components/simulator/handles'
import { input } from './systems/InputSystem'
import { buildCar } from './vehicles/car/carBuilder'
import { getVehicle } from './vehicles/vehicleRegistry'
import { showCar, showSheet } from './debug/carViewer'
import { buildChunk } from './world/procedural/chunkBuild'
import * as plan from './world/procedural/cityPlan'
import { perf } from './systems/PerformanceManager'

// sinov/debug uchun: brauzer konsolidan window.__sim orqali ko'rish mumkin
;(window as unknown as { __sim: unknown }).__sim = { useSimStore, live, handles, input, buildCar, getVehicle, showCar, showSheet, buildChunk, plan, perf }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)





