import { ACESFilmicToneMapping, Color, DirectionalLight, Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildCar, type CarLOD } from '../vehicles/car/carBuilder'
import { getVehicle } from '../vehicles/vehicleRegistry'

/** Dasturchi vositasi: window.__sim.showCar('cobalt', '#15171c', azimutGradus, balandlikGradus, lod) — modelni rasm sifatida ekranga chiqaradi. */
let renderer: WebGLRenderer | null = null
export function showCar(id: string, color = '#15171c', az = 35, el = 14, lod: CarLOD = 0, w = 800, h = 450) {
  const cfg = getVehicle(id)
  if (!renderer) {
    renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.toneMapping = ACESFilmicToneMapping; renderer.outputColorSpace = SRGBColorSpace; renderer.shadowMap.enabled = true
  }
  renderer.setSize(w, h, false)
  const scene = new Scene(); scene.background = new Color('#8fa4b8')
  const pm = new PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
  const sun = new DirectionalLight('#fff4e0', 2.2); sun.position.set(-6, 9, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -5; sun.shadow.camera.right = 5; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5; scene.add(sun)
  const floor = new Mesh(new PlaneGeometry(40, 40), new MeshStandardMaterial({ color: '#4a4f57', roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)
  const car = buildCar(cfg, color, '01 A 777 AA', lod); scene.add(car)
  const L = cfg.dimensions.length, d = Math.max(L * 1.55, 6.5)
  const cam = new PerspectiveCamera(32, w / h, 0.1, 100)
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180
  cam.position.set(Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d + 0.6, Math.cos(a) * Math.cos(e) * d)
  cam.lookAt(0, cfg.dimensions.height * 0.42, 0)
  renderer.render(scene, cam)
  const url = renderer.domElement.toDataURL('image/png')
  let img = document.getElementById('__carview') as HTMLImageElement | null
  if (!img) { img = document.createElement('img'); img.id = '__carview'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:99999;background:#000'; document.body.appendChild(img) }
  img.src = url
  pm.dispose()
  return url.length
}

/** 4 ta rakurs bitta rasmda (old 3/4, yon, orqa 3/4, old) */
export function showSheet(id: string, color = '#15171c', lod: CarLOD = 0, views: Array<[number, number]> = [[35, 12], [90, 2], [145, 12], [0, 3]]) {
  const tw = 640, th = 360
  const sheet = document.createElement('canvas'); sheet.width = tw * 2; sheet.height = th * 2
  const g = sheet.getContext('2d')!
  views.forEach(([az, el], i) => {
    showCar(id, color, az, el, lod, tw, th)
    g.drawImage(renderer!.domElement, (i % 2) * tw, Math.floor(i / 2) * th, tw, th)
  })
  const url = sheet.toDataURL('image/png')
  let img = document.getElementById('__carview') as HTMLImageElement | null
  if (!img) { img = document.createElement('img'); img.id = '__carview'; img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;z-index:99999;background:#000'; document.body.appendChild(img) }
  img.src = url
  return url.length
}
