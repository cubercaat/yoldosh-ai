/* Bosh sahifa 3D qismi: tungi studiyadagi Malibu (qahramon) va avtodrom mashqlari.
   Model: "2021 Chevrolet Malibu 2LZ Premier" — twr422, Sketchfab, CC BY 4.0.
   start() to'xtatish funksiyasini qaytaradi: sahifadan chiqilganda hamma narsa tozalanadi. */
import * as THREE from '../avtodrom3d/three.module.min.js';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from '../vendor/three/addons/libs/meshopt_decoder.module.js';
import { Reflector } from '../vendor/three/addons/objects/Reflector.js';

const CAR_URL = new URL('../sim/models/vehicles/malibu/malibu.glb', import.meta.url).href;
let carP = null;
const loadCar = () => carP || (carP = new Promise((res, rej) => { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); l.load(CAR_URL, (g) => res(g.scene), undefined, rej); }).catch((e) => { carP = null; throw e; }));

function prep(src, paint) {
  const car = src.clone(true), box = new THREE.Box3().setFromObject(car), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group(); car.position.sub(c); car.position.y += size.y / 2; wrap.add(car);
  wrap.scale.setScalar(4.4 / Math.max(size.x, size.z)); if (size.z > size.x) wrap.rotation.y = Math.PI / 2;
  const outer = new THREE.Group(); outer.add(wrap);
  car.traverse((o) => {
    if (!o.isMesh) return; o.castShadow = true; const m0 = o.material; if (!m0) return;
    const m = m0.clone(); o.material = m;   // asl modelning materiallari tegmasin
    if (m.name === 'primary' || /realistic_car_paint/i.test(m.name)) { m.color = new THREE.Color(paint); m.metalness = 0.45; m.roughness = 0.22; if ('clearcoat' in m) { m.clearcoat = 1; m.clearcoatRoughness = 0.04; } }
    if (/front_light|lightwarm|lightcold/i.test(m.name)) { m.emissive = new THREE.Color('#FFE7B8'); m.emissiveIntensity = 6; }
    if (/rear_light|lightred/i.test(m.name)) { m.emissive = new THREE.Color('#FF2A1A'); m.emissiveIntensity = 2.5; }
  });
  return outer;
}

export function start(o) {
  const RM = !!o.reduce, MOB = matchMedia('(max-width: 700px)').matches;
  const stops = [];
  let dead = false;
  const mk = (canvas) => {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, MOB ? 1.5 : 2)); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; return r;
  };
  const fit = (r, cam, el) => { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const freeScene = (scene) => scene.traverse((x) => { if (x.geometry) x.geometry.dispose(); const ms = Array.isArray(x.material) ? x.material : x.material ? [x.material] : []; ms.forEach((m) => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); if (x.getRenderTarget) { try { x.getRenderTarget().dispose(); } catch (e) { } } });

  /* ---------- qahramon: tungi studiya, yaltiroq pol, kamera scroll bilan aylanadi ---------- */
  (async function () {
    const hero = o.hero, canvas = o.heroCanvas, pin = canvas.parentElement;
    let r; try { r = mk(canvas); } catch (e) { return; }
    let raf = 0; const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; }); let vis = true;
    const scene = new THREE.Scene();
    const onR = () => fit(r, cam, pin);
    stops.push(() => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('resize', onR); freeScene(scene); if (scene.environment) scene.environment.dispose(); r.dispose(); });
    r.toneMappingExposure = 1.0; r.setClearColor('#06080C', 1);
    scene.fog = new THREE.Fog('#06080C', 14, 30);
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture; scene.environmentIntensity = 0.55; pm.dispose();
    const cam = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
    const top = new THREE.SpotLight('#ffffff', 220, 30, 0.55, 0.9, 1.6); top.position.set(0, 9, 1.5); top.castShadow = true; top.shadow.mapSize.set(1024, 1024); top.shadow.radius = 6; scene.add(top, top.target);
    const rimL = new THREE.SpotLight('#5B8CFF', 160, 30, 0.6, 1, 1.4); rimL.position.set(-7, 3.5, -4); scene.add(rimL, rimL.target);
    const rimR = new THREE.SpotLight('#5B8CFF', 110, 30, 0.6, 1, 1.4); rimR.position.set(7, 3, -5); scene.add(rimR, rimR.target);
    const warm = new THREE.PointLight('#FFB547', 18, 12, 1.6); warm.position.set(0, 1.2, -5.5); scene.add(warm);
    if (!MOB) { const mirror = new Reflector(new THREE.CircleGeometry(16, 64), { textureWidth: 1024, textureHeight: 1024, color: 0x6b7280 }); mirror.rotation.x = -Math.PI / 2; scene.add(mirror); }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ color: '#07090D', roughness: 0.55, metalness: 0.2, transparent: true, opacity: MOB ? 1 : 0.86 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.003; floor.receiveShadow = true; scene.add(floor);
    const halo = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.36, 128), new THREE.MeshBasicMaterial({ color: '#5B8CFF', transparent: true, opacity: 0.35 })); halo.rotation.x = -Math.PI / 2; halo.position.y = 0.006; scene.add(halo);
    let car; try { car = prep(await loadCar(), '#F2F4F7'); } catch (e) { console.warn('landing car', e); return; }
    if (dead) return;
    scene.add(car);
    addEventListener('resize', onR); onR();
    io.observe(hero);
    hero.classList.add('live');
    const t0 = performance.now(), tgt = new THREE.Vector3();
    const loop = (t) => {
      raf = requestAnimationFrame(loop); if (!vis) return;
      const p = o.heroP(), intro = Math.min(1, (t - t0) / 2600), ei = 1 - Math.pow(1 - intro, 3);
      const ang = RM ? 0.55 : 0.55 + p * 1.25 + (1 - ei) * 0.5 + Math.sin(t * 0.00012) * 0.04, dist = (MOB ? 19.5 : 11.2) - p * 1.6 + (1 - ei) * 3, h = 1.9 + (1 - ei) * 0.9 - p * 0.5;
      cam.position.set(Math.sin(ang) * dist, h, Math.cos(ang) * dist);
      tgt.set(MOB ? 0.0 : -2.5 + p * 1.6, MOB ? -1.0 : 0.75, 0); cam.lookAt(tgt);
      halo.material.opacity = 0.2 + 0.15 * ei;
      r.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);
  })();

  /* ---------- avtodrom: mashina mashqlar yo'lidan scroll bilan yuradi ---------- */
  (function () {
    const sec = o.drome, canvas = o.dromeCanvas; let started = false;
    const io0 = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; io0.disconnect(); build(); } }, { rootMargin: '400px' });
    io0.observe(sec); stops.push(() => io0.disconnect());
    async function build() {
      let r; try { r = mk(canvas); } catch (e) { return; }
      let raf = 0, vis = true; const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; });
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(30, 2, 0.1, 200);
      const onR = () => { fit(r, cam, canvas.parentElement); cam.fov = canvas.clientWidth < 700 ? 46 : 30; cam.updateProjectionMatrix(); };
      stops.push(() => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('resize', onR); freeScene(scene); if (scene.environment) scene.environment.dispose(); r.dispose(); });
      r.setClearColor('#06080C', 1); r.toneMappingExposure = 0.9;
      scene.fog = new THREE.Fog('#06080C', 30, 70);
      const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture; scene.environmentIntensity = 0.5; pm.dispose();
      const sun = new THREE.DirectionalLight('#DCE6FF', 2.2); sun.position.set(-10, 22, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, far: 70 }); scene.add(sun);
      scene.add(new THREE.HemisphereLight('#7FA0FF', '#06080C', 0.45));
      const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(90, 50), new THREE.MeshStandardMaterial({ color: '#171B22', roughness: 0.95 })); asphalt.rotation.x = -Math.PI / 2; asphalt.receiveShadow = true; scene.add(asphalt);
      const paint = new THREE.MeshBasicMaterial({ color: '#C9CED8' });
      const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), paint); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); scene.add(m); };
      line(0, -9, 64, 0.14); line(0, 9, 64, 0.14);
      const coneM = new THREE.MeshStandardMaterial({ color: '#FF7A1A', roughness: 0.55, emissive: '#3A1400' }), stripe = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), baseM = new THREE.MeshStandardMaterial({ color: '#8A3A0C' });
      [-16, -10, -4, 2].forEach((x) => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.85, 24), coneM); c.position.y = 0.43; c.castShadow = true; const s = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.11, 24), stripe); s.position.y = 0.52; const b = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.44), baseM); b.position.y = 0.02; g.add(c, s, b); g.position.set(x, 0, 0); scene.add(g); });
      line(11, 5.2, 6, 0.12); line(11, 2.8, 6, 0.12); line(8, 4, 0.12, 2.5); line(14, 4, 0.12, 2.5);
      line(21, -4.6, 0.12, 5.5); line(24.4, -4.6, 0.12, 5.5); line(22.7, -7.3, 3.5, 0.12);
      let car; try { car = prep(await loadCar(), '#F2F4F7'); } catch (e) { return; }
      if (dead) return;
      car.scale.multiplyScalar(0.92); scene.add(car);
      const P = (x, z) => new THREE.Vector3(x, 0, z);
      const path = new THREE.CatmullRomCurve3([P(-26, 0), P(-19, 0), P(-16, 2.4), P(-13, 0), P(-10, -2.4), P(-7, 0), P(-4, 2.4), P(-1, 0), P(2, -2.4), P(5, 0), P(9, 1.2), P(11, 4), P(14, 1.2), P(18, -1), P(22.7, -0.4), P(22.7, -4.8), P(22.7, -0.6), P(25, 3), P(21, 6.5), P(15, 6.5)], false, 'catmullrom', 0.35);
      const pts = path.getPoints(500).map((p) => p.clone().setY(0.02));
      const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#FFB547', transparent: true, opacity: 0.85 })); scene.add(trail);
      const ghost = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#5B8CFF', dashSize: 0.3, gapSize: 0.35, transparent: true, opacity: 0.35 })); ghost.computeLineDistances(); scene.add(ghost);
      addEventListener('resize', onR); onR(); io.observe(sec);
      const ex = o.ex, tm = o.tm, ranges = [[0.04, 0.42], [0.42, 0.62], [0.62, 0.82], [0.82, 1]];
      let sm = 0; const look = new THREE.Vector3(), cp = new THREE.Vector3(), narrow = () => canvas.clientWidth < 700;
      const loop = () => {
        raf = requestAnimationFrame(loop); if (!vis) return;
        const rc = sec.getBoundingClientRect(), p = Math.min(1, Math.max(0, -rc.top / (rc.height - innerHeight)));
        sm += (p - sm) * (RM ? 1 : 0.1);
        const u = Math.min(0.999, sm), pt = path.getPointAt(u), ah = path.getPointAt(Math.min(1, u + 0.004)), rev = u > 0.72 && u < 0.79;
        car.position.copy(pt); car.rotation.y = Math.atan2(-(ah.z - pt.z), ah.x - pt.x) + (rev ? Math.PI : 0);
        trail.geometry.setDrawRange(0, Math.floor(u * pts.length));
        cp.set(pt.x * 0.7, narrow() ? 34 : 26, pt.z * 0.35 + (narrow() ? 20 : 21)); cam.position.lerp(cp, 0.08); look.set(pt.x * 0.7, 0, pt.z * 0.5); cam.lookAt(look);
        ex.forEach((e, i) => { e.classList.toggle('on', u >= ranges[i][0] && u < ranges[i][1]); e.classList.toggle('done', u >= ranges[i][1]); });
        const s = Math.round(u * 168); tm.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
        r.render(scene, cam);
      };
      raf = requestAnimationFrame(loop);
    }
  })();

  return { stop() { dead = true; stops.forEach((f) => { try { f(); } catch (e) { } }); stops.length = 0; } };
}
