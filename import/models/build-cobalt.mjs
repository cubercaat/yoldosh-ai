import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {flatten,simplify,weld,prune,dedup,quantize} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {mat4,vec3,quat} from 'gl-matrix';
const [,, inp, outp, ratioS, errS]=process.argv;
const ratio=+ratioS, S=0.85, YMIN=-0.875, ZMID=-0.02;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const d=await io.read(inp);
await d.transform(flatten());
const root=d.getRoot(), scene=root.getDefaultScene();
// 1) keraksiz tugunlar: to'qnashuv meshi va g'ildirak variantlari (har g'ildirak 4 nusxada keladi — faqat bittasi qoladi)
const KEEP=new Set(['roda.002','roda.004','roda.008','roda.012']);
let removed=0;
for(const n of root.listNodes()){const nm=n.getName();
  if(!n.getMesh())continue;
  if(/ColMesh/.test(nm)){n.dispose();removed++;continue;}
  const m=/^(roda(?:\.\d+)?)_/.exec(nm); if(m&&!KEEP.has(m[1])){n.dispose();removed++;}
}
// 2) koordinata: old -Z -> +Z (180° yaw), masshtab, yer y=0, o'qlar o'rtasi z=0
const R=quat.fromEuler(quat.create(),0,180,0);
const pre=mat4.fromRotationTranslationScale(mat4.create(),R,[0,-YMIN*S,ZMID*S],[S,S,S]);
for(const n of scene.listChildren()){const M=n.getWorldMatrix();const N=mat4.multiply(mat4.create(),pre,M);n.setMatrix(N);}
// 3) bbox (yangi koordinatada)
const bbox=(n)=>{const m=n.getMesh();const M=n.getWorldMatrix();let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
 for(const p of m.listPrimitives()){const pos=p.getAttribute('POSITION');const v=[0,0,0];for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);const o=vec3.transformMat4([0,0,0],v,M);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],o[k]);mx[k]=Math.max(mx[k],o[k]);}}}
 return {mn,mx,c:mn.map((x,i)=>(x+mx[i])/2)};};
const mk=(name,pos=[0,0,0])=>{const g=d.createNode(name).setTranslation(pos);scene.addChild(g);return g;};
const nodes=scene.listChildren().filter(n=>n.getMesh());
const bb=new Map(nodes.map(n=>[n,bbox(n)]));
// g'ildirak markazi: shina meshi (roda.026) bbox markazi
const wheelC={};const groupOf=(n)=>/^(roda\.\d+)_/.exec(n.getName())?.[1];
const map={'roda.002':'FR','roda.004':'FR','roda.008':'RR','roda.012':'FR'}; // vaqtincha, quyida x,z bo'yicha aniqlanadi
const tyres=nodes.filter(n=>groupOf(n)&&root.listMaterials&&n.getMesh().listPrimitives()[0].getMaterial().getName()==='roda.026');
const wn={};const name4=(c)=>(c[2]>0?'F':'R')+(c[0]>0?'L':'R');
const info={};
for(const t of tyres){const c=bb.get(t).c;const key=name4(c);wheelC[key]=c;info[key]={group:groupOf(t),c:c.map(v=>+v.toFixed(3)),size:bb.get(t).mx.map((v,i)=>+(v-bb.get(t).mn[i]).toFixed(3))};}
console.log('wheels',JSON.stringify(info));
const names={FL:'Wheel_FL',FR:'Wheel_FR',RL:'Wheel_RL',RR:'Wheel_RR'};
for(const k of ['FL','FR','RL','RR'])wn[k]=mk(names[k],wheelC[k]);
const body=mk('Body'),heads=mk('Headlights'),tails=mk('Taillights'),brakes=mk('BrakeLights');
// rul: steering_ok_* mesh markazida
const steerNodes=nodes.filter(n=>/^steering_ok/.test(n.getName()));
const sb=bbox(steerNodes.find(n=>/steering_ok\.0/.test(n.getName()))||steerNodes[0]);
const steer=mk('SteeringWheel',sb.c);
const counts={};const tag=(k)=>counts[k]=(counts[k]||0)+1;
const move=(n,parent)=>{const wm=n.getWorldMatrix();const pw=parent.getWorldMatrix();const t=n.getTranslation();scene.removeChild(n);parent.addChild(n);n.setTranslation([t[0]-pw[12],t[1]-pw[13],t[2]-pw[14]]);};
for(const n of nodes){const nm=n.getName();const mat=n.getMesh().listPrimitives()[0].getMaterial().getName();
  const g=groupOf(n);
  if(g){const k=name4(bb.get(n).c);move(n,wn[k]);tag(k);continue;}
  if(/^steering_ok/.test(nm)){move(n,steer);tag('steer');continue;}
  if(/^(luzdefreio|freio)/.test(nm)){move(n,brakes);tag('brake');continue;}
  if(/left_front_light|right_front_light/.test(mat)){move(n,heads);tag('head');continue;}
  if(/left_rear_light|right_rear_light/.test(mat)){move(n,tails);tag('tail');continue;}
  move(n,body);tag('body');
}
// 4) shaffoflik: shisha va chiroq materiallari (transmission bo'lsa o'chirib alpha)
for(const m of root.listMaterials()){for(const e of m.listExtensions()){if(e.extensionName==='KHR_materials_transmission'){m.setExtension('KHR_materials_transmission',null);m.setAlphaMode('BLEND');const f=m.getBaseColorFactor();m.setBaseColorFactor([f[0],f[1],f[2],0.35]);}}}
console.log('counts',JSON.stringify(counts),'removed',removed);
await MeshoptSimplifier.ready;
await d.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio,error:+errS}),dedup(),prune());
await d.transform(quantize({quantizePosition:14,quantizeNormal:10,quantizeTexcoord:12}));
await io.write(outp,d);
let tris=0;for(const m of root.listMeshes())for(const p of m.listPrimitives()){const ix=p.getIndices();tris+=(ix?ix.getCount():p.getAttribute('POSITION').getCount())/3;}
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const n of root.listNodes()){if(!n.getMesh())continue;const b=bbox(n);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],b.mn[k]);mx[k]=Math.max(mx[k],b.mx[k]);}}
console.log('tris',Math.round(tris),'bbox',mn.map(v=>v.toFixed(2)),mx.map(v=>v.toFixed(2)));
