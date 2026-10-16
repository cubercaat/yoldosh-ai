import {NodeIO} from '@gltf-transform/core';
import {flatten} from '@gltf-transform/functions';
import {vec3} from 'gl-matrix';
const io=new NodeIO();const d=await io.read('raw/cobalt.glb');
await d.transform(flatten());
let tot=0;const res=[];
for(const n of d.getRoot().listNodes()){const m=n.getMesh();if(!m)continue;const M=n.getWorldMatrix();let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9],tr=0;
 for(const p of m.listPrimitives()){const pos=p.getAttribute('POSITION');const ix=p.getIndices();tr+=(ix?ix.getCount():pos.getCount())/3;const v=[0,0,0];for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);const o=vec3.transformMat4([0,0,0],v,M);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],o[k]);mx[k]=Math.max(mx[k],o[k]);}}}
 tot+=tr;res.push({name:n.getName(),mat:m.listPrimitives().map(p=>p.getMaterial()&&p.getMaterial().getName()).join('+'),c:mn.map((x,i)=>(x+mx[i])/2),s:mn.map((x,i)=>mx[i]-x),tr});}
console.log('tris',tot,'meshnodes',res.length);
res.sort((a,b)=>a.c[2]-b.c[2]);
for(const r of res)console.log(r.name.slice(0,44).padEnd(44),r.c.map(x=>x.toFixed(2)).join(',').padEnd(18),r.s.map(x=>x.toFixed(2)).join(',').padEnd(16),String(r.tr).padStart(6),r.mat);
const root=d.getRoot();console.log('materials',root.listMaterials().map(m=>m.getName()).join(' | '));
