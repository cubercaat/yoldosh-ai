/* Bosh sahifa (landing) — kinematografik tungi sahna: 3D Malibu, telefon hikoyasi, avtodrom.
   Ilovaning umumiy CSS'i aralashmasligi uchun sahifa Shadow DOM ichida chiziladi.
   3D qism (js/landing-3d.js) alohida modul bo'lib, faqat bosh sahifa ochilganda yuklanadi. */
(function () {
  'use strict';
  const V = (window.V = window.V || {});
  const CSS = `
/* Kinematografik tungi sahna. Rang: ko'k-qora fon + sovuq ko'k yorug'lik + bitta iliq aksent (fara ambari).
   Harakat: bitta easing (--ease), bitta tezlik shkalasi; sarlavhalar qatorma-qator niqobdan chiqadi. Ataylab bitta (tungi) tema. */
:host{
  display:block;
  --ink:#06080C; --ink-2:#0B0F16; --panel:#111722; --panel-2:#161D2A;
  --text:#EDF1F7; --mute:#8D97AA; --mute-2:#5E687B; --line:rgba(237,241,247,.08); --line-2:rgba(237,241,247,.14);
  --cool:#5B8CFF; --amber:#FFB547; --amber-ink:#1A1206; --pass:#3ACB84; --stop:#FF5A52;
  --ease:cubic-bezier(.22,1,.36,1); --t1:.5s; --t2:.9s; --t3:1.4s;
  --font:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  color-scheme:dark;
}
*{box-sizing:border-box}
.root{background:var(--ink);color:var(--text);font-family:var(--font);font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:clip}
a{color:inherit}
::selection{background:var(--amber);color:var(--amber-ink)}
:focus-visible{outline:2px solid var(--amber);outline-offset:3px;border-radius:8px}
.w{max-width:1240px;margin:0 auto;padding-left:max(22px,env(safe-area-inset-left,0px));padding-right:max(22px,env(safe-area-inset-right,0px))}

/* tipografiya */
.eyebrow{font-size:14px;color:var(--amber);font-weight:500;margin:0 0 18px}
.h1{font-size:clamp(46px,7.6vw,118px);line-height:.94;letter-spacing:-.055em;font-weight:600;margin:0}
.h2{font-size:clamp(36px,5vw,72px);line-height:1;letter-spacing:-.048em;font-weight:600;margin:0;text-wrap:balance}
.lead{font-size:clamp(17px,1.45vw,20px);color:var(--mute);max-width:32em;margin:22px 0 0;font-weight:400}
.dim{color:var(--mute-2)}

/* qator-niqob animatsiyasi: tinch holatda ham o'qiladi */
.ln{display:block;overflow:hidden;padding-bottom:.08em;margin-bottom:-.08em}
.ln > span{display:block;transition:transform var(--t3) var(--ease),opacity var(--t2) var(--ease)}
.rv .ln > span{transform:translateY(105%);opacity:0}
.rv.in .ln > span{transform:none;opacity:1}
.rv.in .ln:nth-child(2) > span{transition-delay:.08s}.rv.in .ln:nth-child(3) > span{transition-delay:.16s}.rv.in .ln:nth-child(4) > span{transition-delay:.24s}
.fd{transition:opacity var(--t2) var(--ease),transform var(--t2) var(--ease)}
.rv .fd{opacity:0;transform:translateY(18px)}
.rv.in .fd{opacity:1;transform:none;transition-delay:.3s}
.rv.in .fd.d2{transition-delay:.42s}

/* tugmalar */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 26px;border-radius:999px;font:500 16px/1 var(--font);text-decoration:none;border:0;cursor:pointer;transition:background var(--t1) var(--ease),box-shadow var(--t1) var(--ease),transform var(--t1) var(--ease)}
.btn.a{background:var(--amber);color:var(--amber-ink);box-shadow:0 0 0 0 rgba(255,181,71,.0),0 10px 30px -10px rgba(255,181,71,.55)}
.btn.a:hover{box-shadow:0 0 0 6px rgba(255,181,71,.14),0 14px 36px -10px rgba(255,181,71,.7)}
.btn.g{background:rgba(237,241,247,.06);color:var(--text);box-shadow:inset 0 0 0 1px var(--line-2);backdrop-filter:blur(10px)}
.btn.g:hover{background:rgba(237,241,247,.1)}
.btn:active{transform:scale(.98)}
.btn svg{width:16px;height:16px;transition:transform var(--t1) var(--ease)}
.btn:hover svg{transform:translateX(3px)}

/* navigatsiya */
.nav{position:fixed;top:env(safe-area-inset-top,0px);left:0;right:0;z-index:30;transition:background var(--t1) var(--ease),border-color var(--t1) var(--ease);border-bottom:1px solid transparent}
.nav.s{background:rgba(6,8,12,.72);backdrop-filter:saturate(1.5) blur(18px);-webkit-backdrop-filter:saturate(1.5) blur(18px);border-bottom-color:var(--line)}
.nav .w{display:flex;align-items:center;gap:34px;height:68px}
.brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:17px;letter-spacing:-.02em;text-decoration:none;margin-right:auto}
.brand i{width:22px;height:22px;border-radius:6px;transform:rotate(45deg);box-shadow:inset 0 0 0 2px var(--text);display:grid;place-items:center}
.brand i b{width:7px;height:7px;border-radius:2px;background:var(--amber)}
.nav nav{display:flex;gap:28px;font-size:14px;color:var(--mute)}
.nav nav a{text-decoration:none;transition:color var(--t1) var(--ease)}.nav nav a:hover{color:var(--text)}
.nav .btn{min-height:38px;padding:0 18px;font-size:14px}

/* ---------- qahramon: yopishqoq sahna ---------- */
.hero{height:230vh;position:relative}
.hero .pin{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden}
.hero canvas,.hero .poster{position:absolute;inset:0;width:100%;height:100%;display:block}
.hero .poster{object-fit:cover;object-position:62% 60%;transition:opacity 1.2s var(--ease)}
.hero.live .poster{opacity:0}
.hero .shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(6,8,12,.86) 0%,rgba(6,8,12,.35) 46%,rgba(6,8,12,0) 70%),linear-gradient(0deg,var(--ink) 0%,rgba(6,8,12,0) 28%)}
.hero .copy{position:absolute;inset:0;display:flex;align-items:center;pointer-events:none}
.hero .copy .w{width:100%;padding:0}
.slide .lead{max-width:23em}
.slide{position:absolute;left:max(22px,env(safe-area-inset-left,0px));right:max(22px,env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);transition:opacity var(--t2) var(--ease),transform var(--t2) var(--ease)}
.slide.off{opacity:0;transform:translateY(calc(-50% + 30px));pointer-events:none}
.slide a{pointer-events:auto}
.slide .cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:34px}
.slide .h1{max-width:9.5ch}
.specs{display:flex;gap:clamp(24px,4vw,56px);margin-top:36px;flex-wrap:wrap}
.specs div{font-size:14px;color:var(--mute)}
.specs b{display:block;font-size:clamp(28px,3vw,40px);font-weight:500;letter-spacing:-.03em;color:var(--text);font-variant-numeric:tabular-nums;line-height:1.1}
.scrollhint{position:absolute;left:50%;bottom:calc(26px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:24px;height:38px;border-radius:12px;box-shadow:inset 0 0 0 1.5px var(--line-2);transition:opacity var(--t1)}
.scrollhint::after{content:"";position:absolute;left:50%;top:8px;width:3px;height:8px;border-radius:2px;background:var(--text);transform:translateX(-50%);animation:sh 1.8s var(--ease) infinite}
@keyframes sh{0%{opacity:0;transform:translate(-50%,0)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,12px)}}

/* ---------- ikki qism ---------- */
.parts{padding-block:clamp(110px,16vh,180px) clamp(60px,10vh,110px)}
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:clamp(40px,7vh,70px)}
.part{position:relative;border-radius:28px;padding:clamp(26px,3vw,40px);background:linear-gradient(160deg,var(--panel-2),var(--panel));box-shadow:inset 0 0 0 1px var(--line);overflow:hidden;min-height:420px;display:flex;flex-direction:column}
.part::before{content:"";position:absolute;width:420px;height:420px;right:-160px;top:-180px;border-radius:50%;background:radial-gradient(closest-side,rgba(91,140,255,.22),transparent);pointer-events:none}
.part.b::before{background:radial-gradient(closest-side,rgba(255,181,71,.18),transparent)}
.part h3{font-size:clamp(28px,2.8vw,40px);letter-spacing:-.04em;font-weight:600;margin:0 0 12px;line-height:1.05}
.part p{color:var(--mute);margin:0;max-width:26em}
.part .nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:auto;padding-top:36px}
.part .nums div{border-top:1px solid var(--line-2);padding-top:14px;font-size:13.5px;color:var(--mute)}
.part .nums b{display:block;font-size:clamp(30px,3.2vw,46px);font-weight:500;letter-spacing:-.04em;color:var(--text);font-variant-numeric:tabular-nums;line-height:1.05}
.part.b .nums b em{font-style:normal;color:var(--amber)}

/* ---------- telefon hikoyasi ---------- */
.story{padding-block:clamp(60px,10vh,110px) 40px}
.story .grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:clamp(40px,7vw,120px);margin-top:10px}
.steps{list-style:none;margin:0;padding:0}
.steps li{min-height:76vh;display:flex;flex-direction:column;justify-content:center;opacity:.22;transition:opacity var(--t2) var(--ease)}
.steps li.on{opacity:1}
.steps .k{font-size:14px;color:var(--amber);font-variant-numeric:tabular-nums;margin-bottom:14px}
.steps h3{font-size:clamp(28px,3vw,42px);line-height:1.06;letter-spacing:-.04em;font-weight:600;margin:0 0 14px;text-wrap:balance}
.steps p{color:var(--mute);margin:0;max-width:28em}
.steps .phone{display:none}
.dock{position:sticky;top:max(80px,calc(50vh - 370px));height:740px;align-self:start;display:grid;place-items:center}
.dock::before{content:"";position:absolute;inset:8% -20%;background:radial-gradient(closest-side,rgba(91,140,255,.18),transparent 70%);pointer-events:none}
.phone{position:relative;width:350px;height:720px;border-radius:54px;background:#000;padding:11px;box-shadow:0 0 0 1px #262C38,inset 0 0 0 1.5px #303746,0 70px 120px -50px rgba(0,0,0,.9),0 0 80px -30px rgba(91,140,255,.35)}
.phone::before{content:"";position:absolute;top:21px;left:50%;width:104px;height:30px;border-radius:20px;background:#000;transform:translateX(-50%);z-index:5}
.scr{position:absolute;inset:11px;border-radius:43px;overflow:hidden;background:#0C1018;opacity:0;transform:scale(.985);transition:opacity var(--t2) var(--ease),transform var(--t2) var(--ease)}
.scr.on{opacity:1;transform:none}
.sb{display:flex;justify-content:space-between;padding:17px 28px 0;font-size:13px;font-weight:600;height:50px;color:var(--text)}
.ap{padding:12px 18px 20px;height:calc(100% - 50px);display:flex;flex-direction:column;gap:12px}
.ap-h{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--mute)}
.ap-t{font-size:19px;font-weight:600;letter-spacing:-.02em;line-height:1.25}
.bar{height:3px;border-radius:2px;background:var(--line-2);overflow:hidden}.bar i{display:block;height:100%;width:30%;background:var(--amber)}
.sign{aspect-ratio:16/10;border-radius:18px;background:#151B27;display:grid;place-items:center}
.sign svg{width:42%}
.op{display:flex;gap:12px;align-items:center;padding:13px 14px;border-radius:14px;background:#141A26;font-size:14px;line-height:1.3;color:#D7DDE8;transition:all var(--t1) var(--ease)}
.op i{flex:none;width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1.5px #39414F;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:600;color:var(--mute)}
.scr.on .op.ok{animation:pk .6s 1s var(--ease) forwards}
@keyframes pk{to{background:rgba(58,203,132,.14);box-shadow:inset 0 0 0 1.5px var(--pass);color:#fff}}
.scr.on .op.ok i{animation:pki .6s 1s var(--ease) forwards}
@keyframes pki{to{background:var(--pass);color:#06150D;box-shadow:none}}
.voice{background:#151B27;border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:12px}
.voice .row{display:flex;align-items:center;gap:12px;font-size:12.5px;color:var(--mute)}
.play{width:38px;height:38px;border-radius:50%;background:var(--amber);display:grid;place-items:center;flex:none}
.wv{display:flex;align-items:center;gap:3px;height:32px;flex:1}
.wv span{flex:1;border-radius:2px;height:25%;background:#3B4456}
.scr.on .wv span{animation:wv 1.2s var(--ease) infinite}
.wv span:nth-child(3n){animation-delay:-.35s!important}.wv span:nth-child(3n+1){animation-delay:-.7s!important}.wv span:nth-child(4n){animation-delay:-.18s!important}
@keyframes wv{0%,100%{height:22%;background:#3B4456}50%{height:100%;background:var(--amber)}}
.voice p{margin:0;font-size:14.5px;line-height:1.5;color:#D7DDE8}
.lst{display:flex;flex-direction:column;border-radius:16px;background:#141A26;overflow:hidden}
.lst div{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;font-size:14px;color:#D7DDE8}
.lst div+div{border-top:1px solid var(--line)}
.lst b{font-size:12px;font-weight:500;padding:4px 9px;border-radius:999px;background:rgba(255,90,82,.14);color:#FF8A84}
.lst b.g{background:rgba(58,203,132,.14);color:#6EE2A8}
.duel{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;text-align:center;padding:16px 0}
.av{width:60px;height:60px;border-radius:50%;margin:0 auto 8px;display:grid;place-items:center;font-weight:600;font-size:22px}
.duel small{font-size:12.5px;color:var(--mute)}
.sc{font-size:46px;font-weight:500;letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.ring{width:176px;height:176px;margin:6px auto 0;position:relative}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:10}
.ring .bg{stroke:#1D2433}.ring .fg{stroke:var(--amber);stroke-linecap:round;stroke-dasharray:502;stroke-dashoffset:502;transition:stroke-dashoffset 1.8s var(--ease)}
.scr.on .ring .fg{stroke-dashoffset:70}
.ring div{position:absolute;inset:0;display:grid;place-items:center;text-align:center}
.ring b{font-size:42px;font-weight:500;letter-spacing:-.04em;display:block;line-height:1}
.ring small{font-size:12px;color:var(--mute)}
.plan{display:flex;flex-direction:column;gap:8px}
.plan div{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:#141A26;font-size:14px;color:#D7DDE8}
.plan i{width:18px;height:18px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1.5px #4A5366}
.plan i.d{background:var(--pass);box-shadow:none}

/* ---------- avtodrom ---------- */
.drome{height:320vh;position:relative}
.drome .pin{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden}
.drome canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.drome .shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,var(--ink) 0%,rgba(6,8,12,0) 32%,rgba(6,8,12,0) 70%,var(--ink) 100%)}
.drome .over{position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding-block:calc(68px + clamp(24px,5vh,56px)) calc(clamp(24px,5vh,48px) + env(safe-area-inset-bottom,0px))}
.drome .over .w{width:100%}
.drome .h2{max-width:11ch}
.hud{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between}
.ex{display:flex;gap:8px;flex-wrap:wrap}
.ex span{padding:9px 15px;border-radius:999px;background:rgba(237,241,247,.06);box-shadow:inset 0 0 0 1px var(--line);font-size:14px;color:var(--mute);transition:all var(--t1) var(--ease)}
.ex span.on{background:var(--amber);color:var(--amber-ink);box-shadow:none}
.ex span.done{color:var(--text);box-shadow:inset 0 0 0 1px rgba(58,203,132,.5)}
.meter{display:flex;gap:30px;font-size:13px;color:var(--mute)}
.meter b{display:block;font-size:34px;color:var(--text);font-weight:500;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1.1}

/* ---------- narx ---------- */
.cost{padding-block:clamp(110px,16vh,180px) 0}
.cost .grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(30px,6vw,100px);align-items:end}
.big{display:grid;gap:14px}
.bg1,.bg2{border-radius:26px;padding:28px 30px;box-shadow:inset 0 0 0 1px var(--line);background:var(--panel)}
.bg1 span,.bg2 span{display:block;font-size:14px;color:var(--mute);margin-bottom:6px}
.bg1 b,.bg2 b{display:block;font-size:clamp(46px,6vw,84px);line-height:1;letter-spacing:-.055em;font-weight:500;font-variant-numeric:tabular-nums;white-space:nowrap}
.bg1 b{color:var(--stop)}
.bg2{background:linear-gradient(135deg,rgba(255,181,71,.16),rgba(255,181,71,.04));box-shadow:inset 0 0 0 1px rgba(255,181,71,.3)}
.bg2 b{color:var(--amber)}
.bg1 small,.bg2 small{display:block;font-size:14px;color:var(--mute);margin-top:8px}
.src{font-size:13px;color:var(--mute-2);margin:20px 0 0}
.news{margin-top:clamp(40px,7vh,64px);display:flex;gap:16px;align-items:flex-start;padding:22px 26px;border-radius:20px;background:rgba(91,140,255,.08);box-shadow:inset 0 0 0 1px rgba(91,140,255,.22);max-width:900px;color:#C9D6F5}
.news b{color:#fff;font-weight:600}
.news i{flex:none;width:10px;height:10px;margin-top:8px;border-radius:50%;background:var(--cool);box-shadow:0 0 14px var(--cool)}

/* ---------- solishtirish ---------- */
.vs{padding-block:clamp(110px,16vh,180px) 0}
.tbl{margin-top:44px;border-radius:24px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden}
table{width:100%;border-collapse:collapse}
th,td{padding:18px 24px;text-align:left;border-bottom:1px solid var(--line);font-size:16px}
tr:last-child td{border-bottom:0}
th{font-size:13.5px;color:var(--mute);font-weight:500}
td:not(:first-child),th:not(:first-child){text-align:center;width:20%}
.me{background:rgba(255,181,71,.06);color:var(--amber)}
th.me{font-weight:600}
.y,.n,.h{display:inline-block;width:20px;height:20px;border-radius:50%;vertical-align:-4px}
.y{background:var(--pass) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M6 10.5l2.6 2.5L14 7.5' fill='none' stroke='%2306150D' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/100%}
.n{box-shadow:inset 0 0 0 1.5px var(--line-2)}
.h{background:linear-gradient(90deg,var(--mute) 50%,transparent 50%);box-shadow:inset 0 0 0 1.5px var(--mute)}
.sm{display:none}

/* ---------- avtomaktab ---------- */
.school{padding-block:clamp(110px,16vh,180px) 0}
.school .grid{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(30px,6vw,100px);align-items:center}
.bul{list-style:none;padding:0;margin:28px 0 0;display:grid;gap:14px;color:var(--mute)}
.bul li{display:grid;grid-template-columns:18px 1fr;gap:12px}
.bul li::before{content:"";width:6px;height:6px;margin-top:10px;border-radius:50%;background:var(--amber)}
.bul b{color:var(--text);font-weight:500}
.panel{border-radius:24px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line),0 40px 90px -50px rgba(0,0,0,.9);overflow:hidden}
.panel-h{display:flex;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--line);font-weight:500}
.panel-h span{color:var(--mute);font-size:13px}
.panel .x{overflow-x:auto}
.panel table{min-width:460px}
.panel th,.panel td{font-size:14.5px;padding:14px 22px}
.panel td:not(:first-child),.panel th:not(:first-child){text-align:left;width:auto}
.rd{display:flex;align-items:center;gap:10px;font-variant-numeric:tabular-nums}
.rd span{flex:1;height:5px;border-radius:3px;background:#1D2433;min-width:60px;overflow:hidden}
.rd span i{display:block;height:100%;border-radius:3px;transform-origin:left;transform:scaleX(0);transition:transform 1.4s var(--ease)}
.panel.in .rd span i{transform:scaleX(1)}
.st{font-size:12px;padding:4px 10px;border-radius:999px}
.st.g{background:rgba(58,203,132,.14);color:#6EE2A8}.st.y{background:rgba(255,181,71,.14);color:var(--amber)}.st.r{background:rgba(255,90,82,.14);color:#FF8A84}

/* ---------- narxlar ---------- */
.price{padding-block:clamp(110px,16vh,180px) 0}
.tiers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:48px}
.tier{border-radius:26px;padding:30px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;gap:18px;transition:transform var(--t1) var(--ease),box-shadow var(--t1) var(--ease)}
.tier:hover{transform:translateY(-4px);box-shadow:inset 0 0 0 1px var(--line-2)}
.tier.hi{background:linear-gradient(160deg,#1C2232,#121722);box-shadow:inset 0 0 0 1px rgba(255,181,71,.45),0 30px 80px -40px rgba(255,181,71,.35)}
.tier h3{margin:0;font-size:19px;font-weight:500;display:flex;justify-content:space-between;align-items:center}
.tier h3 span{font-size:12px;color:var(--amber-ink);background:var(--amber);padding:4px 10px;border-radius:999px;font-weight:600}
.tier .pr{font-size:44px;font-weight:500;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}
.tier .pr small{display:block;font-size:14px;letter-spacing:0;color:var(--mute);margin-top:8px}
.tier ul{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:15px;color:var(--mute)}
.tier li{display:grid;grid-template-columns:18px 1fr;gap:10px}
.tier li::before{content:"";width:11px;height:6px;margin-top:7px;border-left:1.5px solid var(--amber);border-bottom:1.5px solid var(--amber);transform:rotate(-45deg)}
.tier .btn{margin-top:auto}
.pay{font-size:14px;color:var(--mute-2);margin-top:20px}

/* ---------- savollar ---------- */
.faq{padding-block:clamp(110px,16vh,180px);display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(30px,6vw,100px)}
details{border-bottom:1px solid var(--line)}
details:first-child{border-top:1px solid var(--line)}
summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px 0;font-size:18px;font-weight:500;letter-spacing:-.01em}
summary::-webkit-details-marker{display:none}
summary::after{content:"";flex:none;width:14px;height:14px;background:linear-gradient(var(--mute),var(--mute)) center/14px 1.5px no-repeat,linear-gradient(var(--mute),var(--mute)) center/1.5px 14px no-repeat;transition:transform var(--t1) var(--ease)}
details[open] summary::after{transform:rotate(45deg)}
details p{margin:0 0 24px;color:var(--mute);max-width:36em}

/* ---------- yakun ---------- */
.end{position:relative;overflow:hidden;border-top:1px solid var(--line)}
.end::before{content:"";position:absolute;left:50%;bottom:-60%;width:1100px;height:700px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(255,181,71,.22),transparent 70%);pointer-events:none}
.end .w{position:relative;padding-block:clamp(120px,18vh,200px);text-align:center}
.end .h1{font-size:clamp(44px,7vw,104px);margin:0 auto;max-width:12ch}
.end .lead{margin-left:auto;margin-right:auto}
.end .cta{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:36px}
footer{border-top:1px solid var(--line);color:var(--mute-2);font-size:13.5px}
footer a{text-decoration:none}footer a:hover{color:var(--text)}
footer .w{display:flex;flex-wrap:wrap;gap:12px 32px;padding-block:28px calc(40px + env(safe-area-inset-bottom,0px))}

@media (max-width:980px){
  .nav nav{display:none}
  .hero .shade{background:linear-gradient(180deg,rgba(6,8,12,.55) 0%,rgba(6,8,12,0) 22%,rgba(6,8,12,0) 38%,rgba(6,8,12,.85) 58%,var(--ink) 100%)}
  .slide .h1{font-size:clamp(40px,12vw,56px)}
  .drome .shade{background:linear-gradient(180deg,var(--ink) 0%,rgba(6,8,12,.75) 30%,rgba(6,8,12,0) 50%,rgba(6,8,12,0) 70%,var(--ink) 100%)}
  .slide{top:auto;bottom:calc(70px + env(safe-area-inset-bottom,0px));transform:none}
  .slide.off{transform:translateY(30px)}
  .hero .copy{align-items:flex-end}
  .cards,.cost .grid,.school .grid,.faq{grid-template-columns:1fr}
  .story .grid{grid-template-columns:1fr}
  .dock{display:none}
  .steps li{min-height:0;opacity:1;padding-block:40px}
  .steps .phone{display:block;margin:30px auto 0;zoom:.78}
  .steps .phone .scr{opacity:1;transform:none}
  .tiers{grid-template-columns:1fr}
  .scrollhint{display:none}
}
@media (max-width:600px){
  .root{font-size:16px}
  .slide .cta .btn{flex:1 1 100%}
  .steps .phone{zoom:.7}
  .part .nums{grid-template-columns:repeat(3,minmax(0,1fr))}
  th,td{padding:14px 12px;font-size:14.5px}
  td:not(:first-child),th:not(:first-child){width:64px}
  .lg{display:none}.sm{display:inline}
  .meter{gap:18px}.meter b{font-size:26px}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.rv .ln>span,.rv .fd{transform:none!important;opacity:1!important}}
`;
  const HTML = `

<header class="nav" id="nav"><div class="w">
  <a class="brand" href="#top"><i><b></b></i>Chorraha</a>
  <nav aria-label="Bo'limlar"><a href="#imtihon">Imtihon</a><a href="#ilova">Ilova</a><a href="#avtodrom">Avtodrom</a><a href="#narx">Narxlar</a></nav>
  <a class="btn g" href="#/login">Kirish</a><a class="btn a" href="#/register">Boshlash</a>
</div></header>

<main id="top">
<section class="hero" id="hero"><div class="pin">
  <img class="poster" src="img/landing-poster.webp" alt="Tungi studiyada farasi yoniq oq Chevrolet Malibu" width="1600" height="900">
  <canvas id="car" aria-hidden="true"></canvas>
  <div class="shade"></div>
  <div class="copy"><div class="w" style="position:relative;height:100%">
    <div class="slide rv" data-s="0">
      <h1 class="h1"><span class="ln"><span>Pravani</span></span><span class="ln"><span>birinchi</span></span><span class="ln"><span>urinishda.</span></span></h1>
      <p class="lead fd">Nazariy imtihon va avtodromga bitta ilovada tayyorlaning. Rasmiy savollar, ovozli tushuntirish va imtihondagidek baholanadigan 3D avtodrom.</p>
      <div class="cta fd d2"><a class="btn a" href="#/guest">20 ta savolni bepul yechish<svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a><a class="btn g" href="#imtihon">Imtihon qanday o'tadi</a></div>
    </div>
    <div class="slide rv off" data-s="1">
      <h2 class="h1" style="font-size:clamp(40px,6vw,92px)"><span class="ln"><span>Imtihon kuni</span></span><span class="ln"><span>hech narsa</span></span><span class="ln"><span>yangi bo'lmaydi.</span></span></h2>
      <div class="specs fd"><div><b>1276</b>rasmiy savol</div><div><b>64</b>bilet</div><div><b>12</b>avtodrom mashqi</div></div>
    </div>
  </div></div>
  <div class="scrollhint" id="hint" aria-hidden="true"></div>
</div></section>

<section class="parts w" id="imtihon">
  <div class="rv"><p class="eyebrow fd" style="transition-delay:0s">Imtihon ikki qismdan iborat</p><h2 class="h2"><span class="ln"><span>Ikkalasiga ham</span></span><span class="ln"><span>bir joyda tayyorlaning</span></span></h2></div>
  <div class="cards">
    <article class="part rv"><h3 class="fd">Nazariy imtihon</h3><p class="fd">Kompyuterda, kuzatuv ostida. Biletlar rasmiy bazadan tasodifiy tanlanadi.</p>
      <div class="nums fd d2"><div><b data-n="20">20</b>savol</div><div><b data-n="25">25</b>daqiqa</div><div><b data-n="18">18</b>to'g'ri javob kerak</div></div></article>
    <article class="part b rv"><h3 class="fd">Amaliy imtihon — avtodrom</h3><p class="fd">Datchik va kameralar baholaydi. Har bir xato uchun jarima balli yoziladi.</p>
      <div class="nums fd d2"><div><b><em data-n="99">99</em></b>jarima balli chegarasi</div><div><b data-n="7">7</b>kun — qayta urinishgacha</div><div><b data-n="2">2</b>oy — nazariya natijasi amal qiladi</div></div></article>
  </div>
</section>

<section class="story" id="ilova"><div class="w">
  <div class="rv"><p class="eyebrow fd" style="transition-delay:0s">Ilova</p><h2 class="h2"><span class="ln"><span>Har kuni 20 daqiqa.</span></span><span class="ln"><span class="dim">Imtihon kunigacha.</span></span></h2></div>
  <div class="grid">
    <ol class="steps" id="steps">
      <li data-i="0"><div class="k">01 — Savol</div><h3>Imtihondagidek yechasiz</h3><p>20 tadan savol, 25 daqiqa. Har javobdan keyin to'g'ri yoki xato ekanini darhol ko'rasiz.</p></li>
      <li data-i="1"><div class="k">02 — Tushuntirish</div><h3>Xatoni darhol tushunasiz</h3><p>Qoida o'zbek tilida, ovoz bilan tushuntiriladi — ustoz yoningizda turgandek.</p></li>
      <li data-i="2"><div class="k">03 — Takrorlash</div><h3>Zaif mavzular o'zi to'planadi</h3><p>Xato daftari qaysi mavzuda qiynalayotganingizni ko'rsatadi va o'xshash savollar beradi.</p></li>
      <li data-i="3"><div class="k">04 — Bellashuv</div><h3>Do'stingiz bilan duel</h3><p>Bir xil savollar, jonli hisob va haftalik reyting. Takrorlash zerikarli bo'lmaydi.</p></li>
      <li data-i="4"><div class="k">05 — Tayyorlik</div><h3>Qachon tayyor ekaningizni bilasiz</h3><p>Imtihon sanangizni kiriting — ilova kunlik reja tuzadi va tayyorlik foizini ko'rsatadi.</p></li>
    </ol>
    <div class="dock"><div class="phone" id="phone">
      <div class="scr" data-s="0"><div class="sb"><span>9:41</span><span>Bilet 17</span></div><div class="ap">
        <div class="ap-h"><span>Savol 6 / 20</span><span>18:42</span></div><div class="bar"><i></i></div>
        <div class="sign"><svg viewBox="0 0 100 90"><path d="M50 5 95 84H5Z" fill="#fff" stroke="#E5383B" stroke-width="8" stroke-linejoin="round"/><path d="M27 70h46c-6 0-10-11-23-11S33 70 27 70Z" fill="#111"/></svg></div>
        <div class="ap-t">Ushbu belgi qanday maqsadda qo'llaniladi?</div>
        <div class="op ok"><i>A</i>Majburiy tarzda tezlikni kamaytirish uchun</div><div class="op"><i>B</i>Ehtiyot choralarini ko'rish uchun</div><div class="op"><i>C</i>Keskin tormoz berish uchun</div>
      </div></div>
      <div class="scr" data-s="1"><div class="sb"><span>9:43</span><span>Tushuntirish</span></div><div class="ap">
        <div class="ap-h"><span>Savol 7 / 20</span><span class="st r">Xato</span></div>
        <div class="ap-t">Tartibga soluvchi qo'llarini yonga cho'zgan. Kim harakatlanishi mumkin?</div>
        <div class="voice"><div class="row"><div class="play"><svg width="13" height="13" viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z" fill="#1A1206"/></svg></div><div class="wv"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><span>0:14</span></div>
        <p>Qo'llar yonga cho'zilgan bo'lsa, chap va o'ng tomondagilar to'g'riga va o'ngga yura oladi. Old va orqadagilar kutadi.</p></div>
        <div class="op ok" style="margin-top:auto"><i>B</i>Chap va o'ng tomondagi transport</div>
      </div></div>
      <div class="scr" data-s="2"><div class="sb"><span>9:50</span><span>Xato daftari</span></div><div class="ap">
        <div class="ap-t">Qaysi mavzuni takrorlash kerak</div>
        <div class="lst"><div>Chorrahadan o'tish<b>7 ta xato</b></div><div>Tartibga soluvchi ishoralari<b>4 ta xato</b></div><div>To'xtash va turish<b>3 ta xato</b></div><div>Ogohlantiruvchi belgilar<b class="g">o'zlashtirildi</b></div><div>Tezlik rejimi<b class="g">o'zlashtirildi</b></div></div>
        <span class="btn a" style="margin-top:auto;min-height:48px">14 ta o'xshash savol</span>
      </div></div>
      <div class="scr" data-s="3"><div class="sb"><span>18:20</span><span>Duel</span></div><div class="ap">
        <div class="ap-h"><span>Savol 9 / 10</span><span style="color:var(--pass)">● Jonli</span></div>
        <div class="duel"><div><div class="av" style="background:var(--amber);color:#1A1206">A</div><small>Aziza</small><div class="sc" id="sA">7</div></div><div class="ap-h">vs</div><div><div class="av" style="background:#2A3346">J</div><small>Jasur</small><div class="sc" id="sB">5</div></div></div>
        <div class="lst"><div>Tezroq javob<b class="g">+2 ball</b></div><div>Ketma-ket to'g'ri<b class="g">×4</b></div></div>
        <div class="ap-h" style="margin-top:auto"><span>Haftalik reyting</span><span style="color:var(--text)">3-o'rin</span></div>
      </div></div>
      <div class="scr" data-s="4"><div class="sb"><span>21:05</span><span>Tayyorlik</span></div><div class="ap">
        <div class="ring"><svg viewBox="0 0 180 180"><circle class="bg" cx="90" cy="90" r="80"/><circle class="fg" cx="90" cy="90" r="80"/></svg><div><span><b>86%</b><small>tayyor</small></span></div></div>
        <div class="ap-h"><span>Imtihon: 14 dekabr</span><span style="color:var(--text)">32 kun qoldi</span></div>
        <div class="plan"><div><i class="d"></i>Bilet 17 — 19/20</div><div><i class="d"></i>Xato daftari — 14 savol</div><div><i></i>Sinov imtihoni</div></div>
      </div></div>
    </div></div>
  </div>
</div></section>

<section class="drome" id="avtodrom"><div class="pin">
  <canvas id="drome" aria-hidden="true"></canvas>
  <div class="shade"></div>
  <div class="over">
    <div class="w"><p class="eyebrow">Avtodrom</p><h2 class="h2">Maydonni imtihondan oldin o'ting</h2><p class="lead" style="max-width:24em">Zmeyka, parkovka, boks va razvorot — imtihondagi tartibda, vaqt va jarima ballari bilan.</p></div>
    <div class="w hud">
      <div class="ex" id="ex"><span>Zmeyka</span><span>Yonlama parkovka</span><span>Bokschaga kirish</span><span>Razvorot</span></div>
      <div class="meter"><div><b id="tm">0:00</b>vaqt</div><div><b id="pn">0 / 99</b>jarima balli</div></div>
    </div>
  </div>
</div></section>

<section class="cost w">
  <div class="grid">
    <div class="rv"><p class="eyebrow fd" style="transition-delay:0s">Narx</p><h2 class="h2"><span class="ln"><span>Yiqilish</span></span><span class="ln"><span>tayyorlanishdan</span></span><span class="ln"><span>qimmat</span></span></h2>
      <p class="lead fd">2026-yildan har bir urinish to'lovli. Bitta qayta topshirish Chorrahaning bir yillik obunasidan qimmat.</p>
      <p class="src fd d2">Manba: Spot.uz, 10-noyabr 2026. To'lovlar yanvar 2026 dan.</p></div>
    <div class="big rv">
      <div class="bg1 fd"><span>Har bir qayta topshirish</span><b data-n="1600000">1 600 000</b><small>so'm — nazariy yoki amaliy imtihon</small></div>
      <div class="bg2 fd d2"><span>Chorraha Pro, bir oy</span><b data-n="99000">99 000</b><small>so'm — barcha savollar va sinov imtihoni</small></div>
    </div>
  </div>
  <div class="news rv"><i></i><div class="fd" style="transition-delay:0s"><b>2026 yangiligi.</b> 1-fevraldan A va B toifa nazariyasini avtomaktabsiz, mustaqil o'qish mumkin. Amaliy mashg'ulot avtomaktabda qoladi — Chorraha ikkalasiga tayyorlaydi.</div></div>
</section>

<section class="vs w">
  <div class="rv"><h2 class="h2"><span class="ln"><span>Oddiy test ilovasi —</span></span><span class="ln"><span class="dim">faqat yarim yo'l</span></span></h2>
  <p class="lead fd">Ko'p ilovalar nazariy savollarni beradi. Avtodrom esa ko'pincha birinchi marta imtihon kuni ko'riladi.</p></div>
  <div class="tbl"><table>
    <thead><tr><th></th><th><span class="lg">Oddiy test ilovasi</span><span class="sm">Oddiy</span></th><th class="me">Chorraha</th></tr></thead>
    <tbody>
      <tr><td>Rasmiy savollar va biletlar</td><td><i class="y"></i></td><td class="me"><i class="y"></i></td></tr>
      <tr><td>Xatolar ustida ishlash</td><td><i class="y"></i></td><td class="me"><i class="y"></i></td></tr>
      <tr><td>Har bir savolning ovozli tushuntirishi</td><td><i class="h"></i></td><td class="me"><i class="y"></i></td></tr>
      <tr><td>Avtodrom mashqi, jarima ballari bilan</td><td><i class="n"></i></td><td class="me"><i class="y"></i></td></tr>
      <tr><td>Toshkent ko'chalarida 3D haydash</td><td><i class="n"></i></td><td class="me"><i class="y"></i></td></tr>
      <tr><td>Avtomaktab ustozi uchun panel</td><td><i class="n"></i></td><td class="me"><i class="y"></i></td></tr>
    </tbody>
  </table></div>
</section>

<section class="school w" id="maktab"><div class="grid">
  <div class="rv"><p class="eyebrow fd" style="transition-delay:0s">Avtomaktablar uchun</p><h2 class="h2"><span class="ln"><span>Guruhingiz</span></span><span class="ln"><span>bir qarashda</span></span></h2>
    <p class="lead fd">Har bir o'quvchining tayyorligi bitta jadvalda. Kimga qo'shimcha dars kerakligini imtihondan oldin bilasiz.</p>
    <ul class="bul fd d2"><li><span><b>Tayyorlik foizi</b> — savollar, xatolar va sinov natijalari bo'yicha.</span></li><li><span><b>Kim kirmay qo'ygani</b> o'zi ko'rinadi.</span></li><li><span><b>Guruhga topshiriq</b> berasiz va natijani kuzatasiz.</span></li></ul></div>
  <div class="panel" id="panel"><div class="panel-h">B toifa, kechki guruh<span>12 o'quvchi</span></div><div class="x"><table>
    <thead><tr><th>O'quvchi</th><th>Tayyorlik</th><th>Sinov</th><th>Holat</th></tr></thead>
    <tbody>
      <tr><td>Madina R.</td><td><div class="rd"><span><i style="width:91%;background:var(--pass)"></i></span>91%</div></td><td>19/20</td><td><span class="st g">Tayyor</span></td></tr>
      <tr><td>Jasur T.</td><td><div class="rd"><span><i style="width:74%;background:var(--amber)"></i></span>74%</div></td><td>17/20</td><td><span class="st y">Mashq kerak</span></td></tr>
      <tr><td>Bekzod A.</td><td><div class="rd"><span><i style="width:38%;background:var(--stop)"></i></span>38%</div></td><td>12/20</td><td><span class="st r">5 kun kirmadi</span></td></tr>
      <tr><td>Nilufar S.</td><td><div class="rd"><span><i style="width:83%;background:var(--pass)"></i></span>83%</div></td><td>18/20</td><td><span class="st g">Tayyor</span></td></tr>
    </tbody></table></div></div>
</div></section>

<section class="price w" id="narx">
  <div class="rv"><p class="eyebrow fd" style="transition-delay:0s">Tariflar</p><h2 class="h2"><span class="ln"><span>Bepul boshlang.</span></span><span class="ln"><span class="dim">Kerak bo'lsa oshiring.</span></span></h2></div>
  <div class="tiers">
    <div class="tier"><h3>Pro</h3><div class="pr">99 000<small>so'm / oy</small></div><ul><li>Barcha 1276 savol, 64 bilet</li><li>Xato daftari</li><li>Sinov imtihoni</li></ul><a class="btn g" href="#/register">Pro'ni tanlash</a></div>
    <div class="tier hi"><h3>Premium<span>Ko'p tanlanadi</span></h3><div class="pr">139 000<small>so'm / oy</small></div><ul><li>Pro'dagi hammasi</li><li>Ovozli tushuntirish</li><li>Duel va reyting</li></ul><a class="btn a" href="#/register">Premium'ni tanlash</a></div>
    <div class="tier"><h3>Max</h3><div class="pr">149 000<small>so'm / oy</small></div><ul><li>Premium'dagi hammasi</li><li>3D avtodrom va simulyator</li><li>Ustoz bilan onlayn darslar</li></ul><a class="btn g" href="#/register">Max'ni tanlash</a></div>
  </div>
  <p class="pay">To'lov kartadan. Admin 5 daqiqadan 1 soatgacha tasdiqlaydi.</p>
</section>

<section class="faq w">
  <div class="rv"><h2 class="h2"><span class="ln"><span>Savollar</span></span></h2></div>
  <div>
    <details><summary>Savollar rasmiy imtihondagidek bo'ladimi?</summary><p>Ha. 1276 savolning hammasi amaldagi rasmiy bazadan olingan va 64 ta biletga joylangan.</p></details>
    <details><summary>Ro'yxatdan o'tmasdan sinab ko'rsam bo'ladimi?</summary><p>Bo'ladi. 20 ta savolni hech qanday ro'yxatsiz yechasiz.</p></details>
    <details><summary>Imtihondan yiqilsam qachon qayta topshiraman?</summary><p>2026-yil 1-apreldan nazariy imtihonni keyingi ish kuni, amaliy imtihonni kamida 7 kundan keyin qayta topshirish mumkin. Nazariy natija 2 oy amal qiladi.</p></details>
    <details><summary>Internet bo'lmasa ishlaydimi?</summary><p>Savollar telefoningizga yuklab olinadi, keyin testlar internetsiz ishlaydi.</p></details>
    <details><summary>Avtomaktab sifatida qanday ulanamiz?</summary><p>Telegram orqali yozing — guruhingiz uchun ustoz panelini ochib beramiz.</p></details>
  </div>
</section>

<section class="end" id="boshlash"><div class="w rv">
  <h2 class="h1"><span class="ln"><span>Birinchi biletni</span></span><span class="ln"><span>bugun yeching</span></span></h2>
  <p class="lead fd">20 ta savol, 25 daqiqa. Natijangizni darhol ko'rasiz.</p>
  <div class="cta fd d2"><a class="btn a" href="#/guest">Bepul boshlash<svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a><a class="btn g" href="#narx">Tariflar</a></div>
</div></section>
<footer><div class="w"><span>© 2026 Chorraha</span><span>chorrahaa.uz</span><span>Telegram: @chorahabot</span><a href="#/privacy">Maxfiylik siyosati</a><a href="#/terms">Foydalanish shartlari</a><span>3D model: «2021 Chevrolet Malibu 2LZ Premier» — twr422, Sketchfab, CC BY 4.0</span></div></footer>
</main>

`;

  let cleanup = null;

  function mount() {
    const host = document.getElementById('cl-host'); if (!host) return;
    const R = host.attachShadow({ mode: 'open' });
    R.innerHTML = `<style>${CSS}</style><div class="root">${HTML}</div>`;
    const $ = (s) => R.querySelector(s), $$ = (s) => [...R.querySelectorAll(s)];
    const RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const offs = [], ios = [];
    const on = (t, e, f, o) => { t.addEventListener(e, f, o); offs.push(() => t.removeEventListener(e, f, o)); };
    const observe = (cb, opt) => { const io = new IntersectionObserver(cb, opt); ios.push(io); return io; };

    /* butun sahifa foni: overscroll paytida ham tungi rang */
    const prevBg = document.documentElement.style.background;
    document.documentElement.style.background = '#06080C';
    document.body.classList.add('cl-on');

    /* bo'lim havolalari (#narx, #imtihon …) — ilova yo'naltirgichiga tegmasdan, sahifa ichida aylantirish */
    on(R, 'click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
      const h = a.getAttribute('href'); if (h.startsWith('#/')) return;      // ilova sahifalari (#/guest, #/login …)
      e.preventDefault();
      const el = h === '#top' ? null : R.getElementById(h.slice(1));
      const y = el ? el.getBoundingClientRect().top + scrollY - 60 : 0;
      window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
    });

    /* navigatsiya foni va pastga aylantirish belgisi */
    const nav = $('#nav'), hint = $('#hint');
    const onS = () => { nav.classList.toggle('s', scrollY > 30); if (hint) hint.style.opacity = scrollY > 40 ? 0 : 1; };
    on(window, 'scroll', onS, { passive: true }); onS();

    /* raqamlar sanab chiqadi */
    const count = (root) => root.querySelectorAll('[data-n]').forEach((el) => {
      const to = +el.dataset.n, t0 = performance.now(), D = 1400, fmt = (v) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const tick = (t) => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    /* sarlavhalar qatorma-qator ochiladi (birinchi kadr ham to'liq ko'rinadi) */
    const rvs = $$('.rv:not(.slide)');
    if (RM) rvs.forEach((e) => e.classList.add('in'));
    else {
      const io = observe((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); count(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
      rvs.forEach((e) => { if (e.getBoundingClientRect().top < innerHeight) e.classList.add('in'); else io.observe(e); });
    }

    /* qahramon matnlari scroll bo'yicha almashadi */
    const hero = $('#hero'), slides = $$('.slide');
    const heroP = () => { const r = hero.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))); };
    let cur = -1;
    const updHero = () => { const i = heroP() < 0.45 ? 0 : 1; if (i === cur) return; cur = i; slides.forEach((s, k) => { s.classList.toggle('off', k !== i); s.classList.toggle('in', k === i); }); };
    on(window, 'scroll', updHero, { passive: true }); requestAnimationFrame(() => requestAnimationFrame(updHero));

    /* telefon hikoyasi: har qadam o'z ekranini ko'rsatadi; mobil uchun ekranlar qadamlarga nusxalanadi */
    const steps = $$('#steps li'), scr = $$('#phone .scr');
    steps.forEach((li, i) => { const ph = document.createElement('div'); ph.className = 'phone'; ph.setAttribute('aria-hidden', 'true'); const c = scr[i].cloneNode(true); c.classList.add('on'); c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id')); ph.appendChild(c); li.appendChild(ph); });
    let sc = -1, duelT = null;
    const duel = () => { clearInterval(duelT); let a = 5, b = 4; const A = $('#sA'), B = $('#sB'); A.textContent = a; B.textContent = b; duelT = setInterval(() => { if (a < 7) A.textContent = ++a; else if (b < 5) B.textContent = ++b; else clearInterval(duelT); }, 560); };
    const show = (i) => { if (i === sc) return; sc = i; steps.forEach((s, k) => s.classList.toggle('on', k === i)); scr.forEach((s, k) => s.classList.toggle('on', k === i)); if (i === 3) duel(); };
    const io2 = observe((es) => es.forEach((e) => { if (e.isIntersecting) show(+e.target.dataset.i); }), { rootMargin: '-48% 0px -48% 0px' });
    steps.forEach((s) => io2.observe(s)); show(0);

    /* ustoz paneli chiziqlari */
    const pan = $('#panel');
    const io3 = observe(([e]) => { if (e.isIntersecting) { pan.classList.add('in'); io3.disconnect(); } }, { rootMargin: '0px 0px -15% 0px' }); io3.observe(pan);

    /* 3D: modul faqat shu yerda yuklanadi; WebGL bo'lmasa rasm (poster) qoladi */
    let gl = null, alive = true;
    import('./landing-3d.js').then((m) => { if (!alive) return; gl = m.start({ hero, heroCanvas: $('#car'), heroP, drome: $('#avtodrom'), dromeCanvas: $('#drome'), ex: $$('#ex span'), tm: $('#tm'), reduce: RM }); })
      .catch((e) => console.warn('landing 3D', e));

    cleanup = () => {
      alive = false;
      offs.forEach((f) => f()); ios.forEach((io) => io.disconnect()); clearInterval(duelT);
      if (gl) try { gl.stop(); } catch (e) { }
      document.documentElement.style.background = prevBg; document.body.classList.remove('cl-on');
    };
  }

  V.landing = () => ({
    html: '<div id="cl-host"></div>',
    mount,
    unmount() { if (cleanup) { cleanup(); cleanup = null; } },
  });
})();
