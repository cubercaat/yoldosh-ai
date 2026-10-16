import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {flatten} from '@gltf-transform/functions';
import {vec3} from 'gl-matrix';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);const d=await io.read('raw/gentra.glb');await d.transform(flatten());
const pts=[];
for(const n of d.getRoot().listNodes()){const m=n.getMesh();if(!m)continue;const M=n.getWorldMatrix();for(const p of m.listPrimitives()){const pos=p.getAttribute('POSITION');const v=[0,0,0];for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);pts.push(vec3.transformMat4([0,0,0],v,M));}}}
console.log('verts',pts.length);
const low=pts.filter(p=>p[1]<-0.285);
const hx={};for(const p of low){const k=Math.round(p[0]*20)/20;hx[k]=(hx[k]||0)+1;}
console.log('low y histogram by x',JSON.stringify(Object.entries(hx).sort((a,b)=>a[0]-b[0])));
const hz={};for(const p of low){const k=Math.round(p[2]*20)/20;hz[k]=(hz[k]||0)+1;}
console.log('low by z',JSON.stringify(Object.entries(hz).sort((a,b)=>a[0]-b[0])));
// front/rear: x min/max uzunlik; balandlik
let mn=[9,9,9],mx=[-9,-9,-9];for(const p of pts)for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],p[k]);mx[k]=Math.max(mx[k],p[k]);}
console.log('bbox',mn.map(v=>v.toFixed(3)),mx.map(v=>v.toFixed(3)));
