import {NodeIO} from '@gltf-transform/core';
const io=new NodeIO();const d=await io.read('raw/cobalt.glb');
const root=d.getRoot();
function walk(n,dep){const t=n.getTranslation().map(x=>+x.toFixed(2)),m=n.getMesh();
 if(dep<4||/wheel|tire|tyre|rim|steer|light|lamp|disc|brake|mirror/i.test(n.getName()))console.log(' '.repeat(dep*2)+n.getName()+' '+JSON.stringify(t)+(m?' [mesh '+m.listPrimitives().length+']':''));
 n.listChildren().forEach(c=>walk(c,dep+1));}
root.getDefaultScene().listChildren().forEach(c=>walk(c,0));
console.log('nodes',root.listNodes().length,'materials',root.listMaterials().length,'textures',root.listTextures().length);
