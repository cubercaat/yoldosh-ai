import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {flatten,simplify,weld,prune,dedup,quantize,textureCompress} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {mat4,vec3} from 'gl-matrix';
import sharp from 'sharp';
const [,, inp, outp, ratioS, errS, texS]=process.argv;
const ratio=+ratioS, S=0.0958, YMIN=0.04;
// modelda: old = -X (modelning o'ng tomoni -Z); g'ildirak markazi (xom koordinatada) va radiusi
const RAW_WHEELS={FL:[8.15,12.57,3.85,3.8],FR:[-8.15,12.57,3.85,3.8],RL:[8.15,-14.95,4.04,4.0],RR:[-8.15,-14.95,4.04,4.0]};   // [x, z, markaz y, radius]
const HALFW_RAW=2.4;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const d=await io.read(inp);
await d.transform(flatten());
const root=d.getRoot(), scene=root.getDefaultScene();
// xom -> yangi: yaw +90° (old -X -> +Z), masshtab, yer y=0
const cy=1, sy=0;
const tp=(p)=>[ (p[0]*cy+p[2]*sy)*S, (p[1]-YMIN)*S, (-p[0]*sy+p[2]*cy)*S+0.114 ];
const tn=(n)=>[ n[0]*cy+n[2]*sy, n[1], -n[0]*sy+n[2]*cy ];
const centerNew={},radNew={};for(const k of Object.keys(RAW_WHEELS)){const [x,z,y,r]=RAW_WHEELS[k];centerNew[k]=tp([x,y,z]);radNew[k]=r*S*1.02;}
console.log('wheel centers (yangi)',JSON.stringify(centerNew));

const prims=[];
for(const n of root.listNodes()){const m=n.getMesh();if(!m)continue;const M=n.getWorldMatrix();
  for(const p of m.listPrimitives()){prims.push({p,M});}}
console.log('primitives',prims.length,'attrs',prims.map(x=>x.p.listSemantics().join('/')).join(' ; '));
const mat0=prims[0].p.getMaterial();
const regionTris={body:[],FL:[],FR:[],RL:[],RR:[]};
const datas=prims.map(({p,M})=>{
  const pos=p.getAttribute('POSITION'),count=pos.getCount();
  const sem=p.listSemantics();const arrs={};for(const s of sem){const a=p.getAttribute(s);arrs[s]={type:a.getType(),n:a.getElementSize(),norm:a.getNormalized(),data:a.getArray()};}
  const ix=p.getIndices();const idx=ix?ix.getArray():Uint32Array.from({length:count},(_,i)=>i);
  // dunyo (flatten dan keyin M = ota matritsa) -> yangi koordinata
  const P=new Float32Array(count*3);const v=[0,0,0];
  for(let i=0;i<count;i++){pos.getElement(i,v);const w=vec3.transformMat4([0,0,0],v,M);const t=tp(w);P[i*3]=t[0];P[i*3+1]=t[1];P[i*3+2]=t[2];}
  return {p,arrs,idx,P,count,M};
});
const HW=HALFW_RAW*S;
const wheelKeys=Object.keys(centerNew);
datas.forEach((D,di)=>{
  for(let t=0;t<D.idx.length;t+=3){const a=D.idx[t],b=D.idx[t+1],c=D.idx[t+2];
    const cx=(D.P[a*3]+D.P[b*3]+D.P[c*3])/3, cyy=(D.P[a*3+1]+D.P[b*3+1]+D.P[c*3+1])/3, cz=(D.P[a*3+2]+D.P[b*3+2]+D.P[c*3+2])/3;
    let r='body';
    for(const k of wheelKeys){const w=centerNew[k];if(Math.hypot(cyy-w[1],cz-w[2])<radNew[k] && Math.abs(cx-w[0])<HW){r=k;break;}}
    regionTris[r].push([di,a,b,c]);}
});
console.log('triangles',Object.fromEntries(Object.entries(regionTris).map(([k,v])=>[k,v.length])));
// yangi mesh yasash
const emit=(name,list,offset)=>{
  const mesh=d.createMesh(name);const byPrim=new Map();
  for(const [di,a,b,c] of list){if(!byPrim.has(di))byPrim.set(di,[]);byPrim.get(di).push(a,b,c);}
  for(const [di,ids] of byPrim){const D=datas[di];const remap=new Map();const order=[];
    const newIdx=new Uint32Array(ids.length);
    ids.forEach((o,i)=>{let n=remap.get(o);if(n===undefined){n=order.length;remap.set(o,n);order.push(o);}newIdx[i]=n;});
    const prim=d.createPrimitive().setMaterial(D.p.getMaterial()||mat0);
    for(const s of Object.keys(D.arrs)){const A=D.arrs[s];const out=new (A.data.constructor)(order.length*A.n);
      order.forEach((o,i)=>{for(let k=0;k<A.n;k++)out[i*A.n+k]=A.data[o*A.n+k];});
      let arr=out;
      if(s==='POSITION'){arr=new Float32Array(order.length*3);order.forEach((o,i)=>{arr[i*3]=D.P[o*3]-offset[0];arr[i*3+1]=D.P[o*3+1]-offset[1];arr[i*3+2]=D.P[o*3+2]-offset[2];});}
      else if(s==='NORMAL'){arr=new Float32Array(order.length*3);order.forEach((o,i)=>{const nn=tn([D.arrs.NORMAL.data[o*3],D.arrs.NORMAL.data[o*3+1],D.arrs.NORMAL.data[o*3+2]]);const M=D.M;const w=[nn[0],nn[1],nn[2]];arr[i*3]=w[0];arr[i*3+1]=w[1];arr[i*3+2]=w[2];});}
      else if(s==='TANGENT'){arr=new Float32Array(order.length*4);order.forEach((o,i)=>{const t3=tn([D.arrs.TANGENT.data[o*4],D.arrs.TANGENT.data[o*4+1],D.arrs.TANGENT.data[o*4+2]]);arr[i*4]=t3[0];arr[i*4+1]=t3[1];arr[i*4+2]=t3[2];arr[i*4+3]=D.arrs.TANGENT.data[o*4+3];});}
      prim.setAttribute(s,d.createAccessor().setType(A.type).setArray(arr).setNormalized(false));}
    prim.setIndices(d.createAccessor().setType('SCALAR').setArray(newIdx));
    mesh.addPrimitive(prim);}
  return mesh;};
// eski mesh tugunlarini olib tashlash, yangilarini qo'shish
for(const n of root.listNodes()){if(n.getMesh())n.dispose();}
const bodyMesh=emit('Body',regionTris.body,[0,0,0]);
scene.addChild(d.createNode('Body').setMesh(bodyMesh));
const names={FL:'Wheel_FL',FR:'Wheel_FR',RL:'Wheel_RL',RR:'Wheel_RR'};
for(const k of wheelKeys){const c=centerNew[k];const mesh=emit(names[k],regionTris[k],c);scene.addChild(d.createNode(names[k]).setTranslation(c).setMesh(mesh));}
await d.transform(prune());
await MeshoptSimplifier.ready;
await d.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio,error:+errS}),dedup(),prune());
await d.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:[+texS,+texS],quality:82}),quantize({quantizePosition:14,quantizeNormal:10,quantizeTexcoord:12}));
await io.write(outp,d);
let tris=0;for(const m of root.listMeshes())for(const p of m.listPrimitives()){const ix=p.getIndices();tris+=(ix?ix.getCount():p.getAttribute('POSITION').getCount())/3;}
console.log('tris',Math.round(tris));
