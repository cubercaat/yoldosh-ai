const fs = require('fs');
const B = 'C:/Users/zafarx/yoldosh-ai/simulator/src/';
const edit = (file, fn) => { const p = B + file; let s = fs.readFileSync(p, 'utf8'); s = fn(s); fs.writeFileSync(p, s); };
const rep = (s, a, b) => { if (!s.includes(a)) throw new Error('yoq: ' + a.slice(0, 70)); return s.replace(a, () => b); };

// ---- store: worldKind
edit('store/simulatorStore.ts', (s) => {
  s = rep(s, "  mode: SimMode\n", "  mode: SimMode\n  worldKind: 'city' | 'autodrom'\n");
  s = rep(s, "  setScreen: (s: Screen) => void\n", "  setScreen: (s: Screen) => void\n  setWorld: (w: 'city' | 'autodrom') => void\n");
  s = rep(s, "  mode: 'FREE_DRIVE',\n", "  mode: 'FREE_DRIVE',\n  worldKind: 'city',\n");
  s = rep(s, "  setScreen: (screen) => set({ screen }),\n", "  setScreen: (screen) => set({ screen }),\n  setWorld: (worldKind) => set({ worldKind }),\n");
  return s;
});

// ---- World.tsx
edit('components/simulator/World.tsx', (s) => {
  s = rep(s, "import { DestinationBeacon } from '../../world/DestinationBeacon'", "import { DestinationBeacon } from '../../world/DestinationBeacon'\nimport { Autodrom } from '../../world/autodrom/Autodrom'\nimport { aw } from '../../world/activeWorld'");
  s = rep(s, "export function World() {\n  return (", "export function World() {\n  if (aw.kind === 'autodrom') return (<><Environment /><Autodrom /></>)\n  return (");
  return s;
});

// ---- Vehicle.tsx
edit('components/simulator/Vehicle.tsx', (s) => {
  s = rep(s, "import { RulesMonitor } from '../../systems/RulesMonitor'", "import { RulesMonitor } from '../../systems/RulesMonitor'\nimport { AutodromRules, resetCones } from '../../systems/AutodromRules'\nimport { aw } from '../../world/activeWorld'");
  s = rep(s, "  const rules = useMemo(() => new RulesMonitor(), [])", "  const rules = useMemo(() => (aw.kind === 'autodrom' ? new AutodromRules() : new RulesMonitor()), [])");
  s = rep(s, "      cps.update(pos.x, pos.z, Math.abs(s.speed))", "      if (aw.kind !== 'autodrom') cps.update(pos.x, pos.z, Math.abs(s.speed))");
  s = rep(s, "handles.checkpoints = cps; cps.start(startPos[0], startPos[2]);", "handles.checkpoints = cps; if (aw.kind !== 'autodrom') cps.start(startPos[0], startPos[2]); else useSimStore.getState().patch({ objective: \"Avtodrom: mashqlardan o'ting, konusga tegmang, maysaga chiqmang\", checkpointTotal: 0, checkpointIndex: 0 });");
  s = rep(s, "    ctrl.current?.reset(true)\n", "    ctrl.current?.reset(true)\n    if (hard) resetCones()\n");
  return s;
});

// ---- HUD: xarita
edit('components/simulator/VehicleHUD.tsx', (s) => {
  s = rep(s, "import { MiniMap, LimitSign } from './Minimap'", "import { MiniMap, LimitSign, AutodromMap } from './Minimap'\nimport { aw } from '../../world/activeWorld'");
  s = rep(s, "        <MiniMap />", "        {aw.kind === 'autodrom' ? <AutodromMap /> : <MiniMap />}");
  s = rep(s, '<div className="obj-k">MAQSAD · {cpI}</div>', '<div className="obj-k">{aw.kind === \'autodrom\' ? \'AVTODROM\' : `MAQSAD · ${cpI}`}</div>');
  return s;
});

// ---- Minimap: AutodromMap
edit('components/simulator/Minimap.tsx', (s) => {
  s = rep(s, "import { handles } from './handles'", "import { handles } from './handles'\nimport { MAP_H, MAP_W, drawAutodrom, x2px, z2px } from '../../world/autodrom/layout'");
  s += `
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
`;
  return s;
});

// ---- Selector: dunyo tanlash
edit('components/simulator/VehicleSelector.tsx', (s) => {
  s = rep(s, "  const src = useSimStore((s) => s.modelSource)", "  const src = useSimStore((s) => s.modelSource)\n  const worldKind = useSimStore((s) => s.worldKind)");
  s = rep(s, '        <div className="mode">', '        <div className="gq"><small>Dunyo</small><div className="gq-b"><button className={worldKind === \'city\' ? \'on\' : \'\'} onClick={() => useSimStore.getState().setWorld(\'city\')}>Shahar (erkin haydash)</button><button className={worldKind === \'autodrom\' ? \'on\' : \'\'} onClick={() => useSimStore.getState().setWorld(\'autodrom\')}>Avtodrom (imtihon maydoni)</button></div></div>\n        <div className="mode">');
  return s;
});

// ---- App: DRIVE da dunyoni o'rnatish
edit('App.tsx', (s) => {
  s = rep(s, "import { OrientationGate, goLandscape } from './components/simulator/OrientationGate'", "import { OrientationGate, goLandscape } from './components/simulator/OrientationGate'\nimport { aw } from './world/activeWorld'");
  s = rep(s, "    goLandscape()\n", "    goLandscape()\n    aw.kind = st.worldKind\n");
  return s;
});
console.log('ok');
