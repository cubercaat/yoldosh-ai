import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {flatten} from '@gltf-transform/functions';
import {vec3} from 'gl-matrix';
import fs from 'fs';
const f=process.argv[2];
const b=fs.readFileSync(f);const len=b.readUInt32LE(12);const j=JSON.parse(b.slice(20,20+len).toString());
console.log('ASSET',JSON.stringify(j.asset&&j.asset.extras||j.asset),'ext',(j.extensionsUsed||[]).join(','),'tex',(j.textures||[]).length,'mats',(j.materials||[]).length);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const d=await io.read(f);
await d.transform(flatten());
let tot=0;const res=[];
for(const n of d.getRoot().listNodes()){const m=n.getMesh();if(!m)continue;const M=n.getWorldMatrix();let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],tr=0;
 for(const p of m.listPrimitives()){const pos=p.getAttribute('POSITION');const ix=p.getIndices();tr+=(ix?ix.getCount():pos.getCount())/3;const v=[0,0,0];for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);const o=vec3.transformMat4([0,0,0],v,M);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],o[k]);mx[k]=Math.max(mx[k],o[k]);}}}
 tot+=tr;res.push({name:n.getName(),mat:m.listPrimitives().map(p=>p.getMaterial()&&p.getMaterial().getName()).join('+'),c:mn.map((x,i)=>(x+mx[i])/2),s:mn.map((x,i)=>mx[i]-x),tr,mn,mx});}
let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const r of res)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],r.mn[k]);mx[k]=Math.max(mx[k],r.mx[k]);}
console.log('tris',tot,'meshnodes',res.length,'bbox',mn.map(v=>v.toFixed(2)).join(','),'|',mx.map(v=>v.toFixed(2)).join(','));
const axis=mx.map((v,i)=>v-mn[i]);console.log('size',axis.map(v=>v.toFixed(2)).join(' x '));
res.sort((a,b)=>b.tr-a.tr);
for(const r of res.slice(0,70))console.log(r.name.slice(0,46).padEnd(46),r.c.map(x=>x.toFixed(2)).join(',').padEnd(20),r.s.map(x=>x.toFixed(2)).join(',').padEnd(18),String(r.tr).padStart(6),r.mat.slice(0,30));
console.log('materials',d.getRoot().listMaterials().map(m=>m.getName()).join(' | ').slice(0,600));
