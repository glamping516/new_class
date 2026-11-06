import * as THREE from './vendor/three.module.min.js';
import {floorboxRecords,layerSettings} from './construction-data.mjs';

export function constructionCamera(room,width,height,{mode='split',lift=3.4}={}){
 const aspect=Math.max(1,width)/Math.max(1,height),{w,d,h}=room;
 const target=new THREE.Vector3(w/2,mode==='split'?(h+lift)/2:0,d/2);
 let camera;
 if(mode==='top'){
  const span=Math.max(d+2.8,(w+2.8)/aspect);
  camera=new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,300);
  camera.position.set(target.x,60,target.z);camera.up.set(0,0,-1);
 }else{
  camera=new THREE.PerspectiveCamera(38,aspect,.1,300);
  const radius=Math.hypot(w,d,mode==='split'?h+lift:.5)/2,halfAngle=Math.min(19*Math.PI/180,Math.atan(Math.tan(19*Math.PI/180)*aspect));
  camera.position.copy(target).add(new THREE.Vector3(1,.92,1.25).normalize().multiplyScalar(radius/Math.sin(halfAngle)*1.08));
 }
 camera.lookAt(target);camera.updateMatrixWorld(true);
 return{camera,target,locked:mode==='top'};
}

export function buildConstructionScene(state,sourceRoom,sourceItems){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#081521');
 const floor=new THREE.Group(),upper=new THREE.Group(),markers=new Map(),materials=new Set(),geometries=new Set(),surfaces=[];
 scene.add(floor,upper);
 const mat=(color,opacity=1)=>{const m=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide});materials.add(m);return m;};
 const mesh=(parent,geometry,material,x=0,y=0,z=0)=>{geometries.add(geometry);const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;};
 const line=(parent,points,color,opacity=1,loop=false)=>{const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));geometries.add(geo);const m=new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity});materials.add(m);const l=loop?new THREE.LineLoop(geo,m):new THREE.Line(geo,m);parent.add(l);return l;};
 const {w,d}=state.room;
 mesh(floor,new THREE.BoxGeometry(w+.16,.15,d+.16),mat('#102e40'),w/2,-.14,d/2);
 const base=mesh(floor,new THREE.PlaneGeometry(w,d),mat('#102c3a'),w/2,-.045,d/2);base.rotation.x=-Math.PI/2;
 base.userData.floor=true;base.userData.room={w,d,grid:true,fill:'#102c3a',gridColor:'#295365'};
 const perimeter=[[0,.002,0],[w,.002,0],[w,.002,d],[0,.002,d]];
 line(floor,perimeter,'#54dce9',.9,true);line(floor,perimeter.map(([x,y,z])=>[x,y-.18,z]),'#21637c',.65,true);
 // Real 45 cm tile intervals, including the partial tile at the room edge.
 for(let x=.45;x<w;x+=.45)line(floor,[[x,-.035,0],[x,-.035,d]],'#275064',.35);
 for(let z=.45;z<d;z+=.45)line(floor,[[0,-.035,z],[w,-.035,z]],'#275064',.35);
 const floorIds=new Set(state.fixtures.filter(f=>f.kind==='floorbox').map(f=>f.id));
 const cloneUpper=source=>{
  // Copy geometry and transforms without serializing animation references in
  // userData (the screen stores live meshes there).
  const clone=o=>{const c=o.isMesh?new THREE.Mesh(o.geometry,o.material):new THREE.Group();c.position.copy(o.position);c.quaternion.copy(o.quaternion);c.scale.copy(o.scale);c.visible=o.visible;c.userData={wallPanel:o.userData.wallPanel,panelNormal:o.userData.panelNormal};for(const child of o.children)c.add(clone(child));return c;};
  const copy=clone(source),outlines=[];
  copy.traverse(o=>{
   if(!o.isMesh)return;
   const m=mat('#5baecc',.16);o.material=m;o.castShadow=false;o.receiveShadow=false;surfaces.push(m);
   const p=o.geometry?.parameters;
   if(o.geometry?.type==='BoxGeometry'&&p&&((p.width*p.depth>.15&&p.height>.02)||(p.height>.7&&Math.max(p.width,p.depth)>.3)||(p.width>.35&&p.height>.25&&p.depth<.12))){
    const geo=new THREE.EdgesGeometry(o.geometry);geometries.add(geo);
    const lm=new THREE.LineBasicMaterial({color:'#64d5f2',transparent:true,opacity:.45});materials.add(lm);
    const edges=new THREE.LineSegments(geo,lm);outlines.push([o,edges]);
   }
  });
  for(const [parent,edges]of outlines)parent.add(edges);
  upper.add(copy);
 };
 for(const child of sourceRoom.children){if(child.userData.floor||child.userData.platform||floorIds.has(child.userData.fixture))continue;cloneUpper(child);}
 for(const child of sourceItems.children)cloneUpper(child);
 line(upper,perimeter,'#55bbdc',.7,true);
 // Corner ties connect the same X/Z on both layers.
 const ties=new THREE.Group();scene.add(ties);
 const tieLines=perimeter.map(([x,,z])=>line(ties,[[x,.03,z],[x,3.4,z]],'#3a839e',.35));
 const records=floorboxRecords(state);
 for(const f of records){
  const group=new THREE.Group();group.position.set(f.x,0,f.z);group.userData.floorboxId=f.id;
  const plate=mesh(group,new THREE.BoxGeometry(f.w,.035,f.depth),mat('#ffc46f'),0,.025,0);
  const ring=mesh(group,new THREE.RingGeometry(Math.max(f.w,f.depth)*.78,Math.max(f.w,f.depth)*.98,24),mat('#ffc46f',.65),0,.05,0);ring.rotation.x=-Math.PI/2;
  mesh(group,new THREE.CylinderGeometry(.018,.018,.22,8),mat('#ffe3a4'),0,.14,0);
  const beam=mesh(group,new THREE.ConeGeometry(.065,.11,12),mat('#ffda86'),0,.29,0);beam.rotation.z=Math.PI;
  floor.add(group);markers.set(f.id,{group,plate,ring});
 }
 const helper=new THREE.HemisphereLight('#c3f2ff','#154561',2);scene.add(helper);
 function update(options={}){
  const settings=layerSettings(options);upper.position.y=settings.lift;upper.visible=!settings.floorOnly;ties.visible=!settings.floorOnly;
  for(const m of surfaces)m.opacity=settings.opacity;
  for(const l of tieLines){l.geometry.attributes.position.setY(1,settings.lift);l.geometry.attributes.position.needsUpdate=true;l.geometry.computeBoundingSphere();}
  const visible=new Set(floorboxRecords(state,{includeHidden:options.includeHidden!==false}).map(f=>f.id));
  for(const [id,m]of markers){m.group.visible=visible.has(id);m.ring.scale.setScalar(id===options.selectedId?1.5:1);m.plate.material.color.set(id===options.selectedId?'#fff2bd':'#ffc46f');}
 }
 update();
 return{scene,floor,upper,markers,update,dispose(){for(const m of materials)m.dispose();for(const g of geometries)g.dispose();}};
}
