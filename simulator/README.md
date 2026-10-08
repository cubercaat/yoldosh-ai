# Yo'ldosh Simulyator (React + TypeScript + Vite + R3F + Rapier)

Haqiqiy o'ynaladigan haydash simulyatori. Fizika: Rapier `DynamicRayCastVehicleController`, qat'iy 1/60 s qadam.

## Ishga tushirish

```bash
cd simulator
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build -> ../yoldosh/sim/
```

Build natijasi `yoldosh/sim/` ga yoziladi va asosiy ilovadan `sim/index.html` orqali ochiladi.

## Boshqaruv
W/S yoki ↑/↓ — gaz/tormoz (R rejimida S — orqaga gaz) · A/D yoki ←/→ — rul · Space — qo'l tormozi · R — xavfsiz nuqtaga qaytarish · C — kamera (chase/close/driver/hood/free) · L — faralar · F3 — debug · M — ovoz · T — vaqt +3 soat. Sensorli qurilmada ekran tugmalari avtomatik chiqadi.

## GLB modellarni qayerga qo'yish
```
public/models/vehicles/<id>/<id>.glb
```
`<id>`: `cobalt`, `malibu`, `sedan`, `cybertruck`, `isuzu`, `gclass`. Fayl bo'lmasa — aniq belgilangan **PLACEHOLDER** (protsedurali geometriya, haqiqiy model emas) ishlatiladi; HUD'da "PLACEHOLDER MODEL" yozuvi chiqadi.

GLB tugun nomlari (`VehicleConfig.nodes` orqali o'zgartiriladi): `Body`/`Chassis`, `Interior`, `SteeringWheel`, `Wheel_FL/FR/RL/RR` (g'ildirak markazida pivot, o'q — X), `Headlights`, `Taillights`, `BrakeLights`, `Windows`, `Mirrors`. Masshtab/siljish/burilish: `modelScale`, `modelOffset`, `modelYaw`. Draco (`public/draco`) va KTX2 (`public/basis`) qo'llab-quvvatlanadi.

## Yangi transport qo'shish
1. `src/vehicles/<id>.ts` — `defineVehicle({...})` bilan spetsifikatsiya (massa, quvvat, o'lchamlar, uzatmalar, g'ildirak radiusi, drivetrain, ranglar).
2. `src/vehicles/vehicleRegistry.ts` ga import qiling va ro'yxatga qo'shing.
3. GLB ni `public/models/vehicles/<id>/<id>.glb` ga tashlang. Tamom.

## Tuzilma
`physics/` (Rapier o'rami, g'ildirak, to'qnashuv) · `vehicles/` (config, registry, gearbox/dvigatel kontrolleri, placeholder) · `world/` (yo'l, binolar, chiroqlar, svetoforlar, belgilar, parkovka, checkpoint) · `systems/` (kirish, audio, kun/tun, kamera, checkpoint) · `modes/` (rejimlar) · `store/` (Zustand) · `components/simulator/` (Canvas, HUD, tanlash ekrani, sensorli boshqaruv).

## Yetishmayotgan resurslar
- Haqiqiy `.glb` avtomobil modellari (hozir hammasi placeholder).
- Haqiqiy dvigatel/to'qnashuv ovoz fayllari (hozir WebAudio sintezator; `cfg.sound.file` orqali almashtiriladi).

## Cheklovlar
- Faqat FREE DRIVE rejimi ishlaydi; DRIVING_TEST / PARKING_TEST / TRAFFIC_RULES / RACE / TIME_TRIAL faqat arxitektura darajasida e'lon qilingan (checkpoint tizimi tayyor).
- Raycast-vehicle fizikasi: haqiqiy shina modeli, differensial, ABS/ESP yo'q.
- Trafik (AI mashinalar) va piyodalar yo'q; svetofor faqat vizual + HUD ko'rsatkich.
- Sinov faqat desktop brauzerda o'tkazilgan; mobil sensorli boshqaruv qo'lda sinalmagan.
- Birinchi yuklash sekin (~3 MB JS, Rapier WASM).
