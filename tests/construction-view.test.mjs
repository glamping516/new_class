import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {floorboxRecords,constructionNote,layerSettings,dimensionLabel,terminalLabelPositions} from '../dist/construction-data.mjs';
import {buildConstructionScene,constructionCamera} from '../dist/construction-scene.js';
import {SoftwareRenderer} from '../dist/software-renderer.js';
import {classroomFloorBoxes} from '../dist/floor-boxes.mjs';
const state={room:{w:9,d:12,h:2.7},items:[],fixtures:[
 {id:'port0',kind:'floorbox',name:'바닥 단자 1',x:.85,z:4.18,w:.18,depth:.18},
 {id:'port1',kind:'floorbox',name:'숨긴 단자',x:3.13,z:6.29,w:.18,depth:.18,hidden:true}
]};

test('inspection numbers and four wall distances use current saved centres and preserve hidden numbering',()=>{
 const before=structuredClone(state),all=floorboxRecords(state);
 assert.deepEqual(all.map(f=>[f.code,f.left,f.front,f.right,f.back]),[['F01',85,418,815,782],['F02',313,629,587,571]]);
 assert.deepEqual(floorboxRecords(state,{includeHidden:false}).map(f=>f.code),['F01']);
 const other={...state,room:{w:10,d:15,h:3},fixtures:[{...state.fixtures[0],x:1.234,z:5.678}]};
 assert.deepEqual(floorboxRecords(other).map(f=>[f.left,f.front,f.right,f.back]),[[123.4,567.8,876.6,932.2]]);
 assert.deepEqual(state,before);assert.match(constructionNote({...state,fixtures:classroomFloorBoxes()}),/스크린벽에서 첫 줄 85cm/);assert.match(constructionNote({...state,fixtures:classroomFloorBoxes()}),/482cm/);assert.doesNotMatch(constructionNote(other),/85cm/);
});

test('layer separation copies source transforms without moving saved furniture, floors or materials',()=>{
 const room=new THREE.Group(),items=new THREE.Group(),geometry=new THREE.BoxGeometry(1.5,.72,.6),material=new THREE.MeshBasicMaterial({color:'#ff0000'});
 const table=new THREE.Mesh(geometry,material);table.position.set(2,.36,4);items.add(table);table.userData.liveReference=table;
 const base=new THREE.Mesh(new THREE.PlaneGeometry(9,12),material);base.userData.floor=true;room.add(base);
 const floorbox=new THREE.Group();floorbox.userData.fixture='port0';room.add(floorbox);
 const model=buildConstructionScene(state,room,items),snapshot=table.position.clone();let sourceDisposed=false;geometry.addEventListener('dispose',()=>sourceDisposed=true);
 model.update({lift:4.8,opacity:.1,selectedId:'port0'});model.scene.updateMatrixWorld(true);
 const copy=model.upper.children.at(-2),world=copy.getWorldPosition(new THREE.Vector3());
 assert.equal(world.x,2);assert.equal(world.z,4);assert.ok(Math.abs(world.y-(.36+4.8))<1e-9);
 assert.ok(table.position.equals(snapshot));assert.equal(table.material,material);assert.equal(material.opacity,1);
 assert.equal(model.markers.get('port0').group.position.y,0);assert.equal(model.markers.get('port0').group.position.x,.85);
 model.dispose();assert.equal(sourceDisposed,false);assert.ok(table.parent===items);
});

test('floor-only and hidden terminal controls change the presentation alone',()=>{
 const before=structuredClone(state),model=buildConstructionScene(state,new THREE.Group(),new THREE.Group());
 model.update({floorOnly:true,includeHidden:false});assert.equal(model.upper.visible,false);assert.equal(model.markers.get('port1').group.visible,false);
 model.update({floorOnly:false,includeHidden:true,lift:3.4});assert.equal(model.upper.visible,true);assert.equal(model.markers.get('port1').group.visible,true);
 assert.deepEqual(state,before);model.dispose();
});

test('presentation lift and opacity remain within usable bounds',()=>{
 assert.deepEqual(layerSettings(),{lift:3.4,opacity:.22,floorOnly:false});
 assert.deepEqual(layerSettings({lift:100,opacity:4,floorOnly:true}),{lift:6,opacity:.45,floorOnly:true});
 assert.deepEqual(layerSettings({lift:-1,opacity:-1}),{lift:2,opacity:.05,floorOnly:false});
});

test('long wall dimensions avoid terminal codes at their midpoint in plan and perspective',()=>{
 const markers=[{x:300,y:200},{x:500,y:200},{x:500,y:400},{x:400,y:400}];
 for(const [a,b,text]of [[{x:500,y:0},{x:500,y:400},'Z · 840cm'],[{x:200,y:400},{x:500,y:400},'X · 541cm'],[{x:260,y:180},{x:340,y:220},'X · 85cm']]){
  const label=dimensionLabel(a,b,text,markers),r=label.box;
  assert.ok(Number.isFinite(label.x)&&Number.isFinite(label.y));
  assert.ok(markers.every(p=>!(r.x<p.x+24&&r.x+r.w>p.x-24&&r.y<p.y+2&&r.y+r.h>p.y-28)));
  const second=dimensionLabel(a,b,text,markers,[r]).box;
  assert.ok(!(second.x<r.x+r.w+5&&second.x+second.w>r.x-5&&second.y<r.y+r.h+5&&second.y+second.h>r.y-5));
 }
});

test('CPU hologram uses scene background, independent line segments and material opacity',()=>{
 const previous=globalThis.document,actions=[];
 const ctx={setTransform(){},fillRect(){actions.push(['background',this.fillStyle]);},beginPath(){},moveTo(){actions.push(['move']);},lineTo(){actions.push(['line']);},stroke(){actions.push(['alpha',this.globalAlpha]);}};
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  const renderer=new SoftwareRenderer(),scene=new THREE.Scene();scene.background=new THREE.Color('#081521');
  const geo=new THREE.BufferGeometry().setFromPoints([[-1,0,-2],[1,0,-2],[-1,1,-2],[1,1,-2]].map(p=>new THREE.Vector3(...p)));
  scene.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#64d5f2',transparent:true,opacity:.35})));
  renderer.render(scene,new THREE.PerspectiveCamera());
  assert.deepEqual(actions.filter(a=>a[0]==='background'),[['background','#081521']]);
  assert.equal(actions.filter(a=>a[0]==='move').length,2);assert.equal(actions.filter(a=>a[0]==='line').length,2);assert.deepEqual(actions.at(-1),['alpha',.35]);
 }finally{globalThis.document=previous;}
});

test('fixed overhead camera is exactly above the room centre and keeps north at the top for all viewport sizes',()=>{
 for(const [width,height]of [[1023,850],[600,900],[1800,700]]){
  const {camera,target,locked}=constructionCamera(state.room,width,height,{mode:'top'});
  assert.equal(locked,true);assert.equal(camera.isOrthographicCamera,true);
  assert.deepEqual(camera.position.toArray(),[4.5,60,6]);
  const centre=target.clone().project(camera);assert.ok(Math.abs(centre.x)<1e-10&&Math.abs(centre.y)<1e-10);
  const front=new THREE.Vector3(4.5,0,0).project(camera),back=new THREE.Vector3(4.5,0,12).project(camera);
  assert.ok(front.y>0&&back.y<0);assert.ok(Math.abs(front.x)<1e-10&&Math.abs(back.x)<1e-10);
  assert.equal(camera.zoom,1);
 }
});

test('all 13 number labels remain separate, including the two close front-centre boxes',()=>{
 const camera=constructionCamera(state.room,1023,850,{mode:'top'}).camera;
 const boxes=classroomFloorBoxes(),before=structuredClone(boxes);
 const points=boxes.map(f=>{const p=new THREE.Vector3(f.x,.35,f.z).project(camera);return{id:f.id,x:(p.x+1)*1023/2,y:(1-p.y)*850/2};});
 const labels=terminalLabelPositions(points);assert.equal(labels.length,13);
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  const a=labels[i],b=labels[j];assert.ok(Math.abs(a.x-b.x)>=47||Math.abs(a.y-b.y)>=30);
 }
 assert.deepEqual(boxes,before);
 assert.ok(labels.at(-1).dx||labels.at(-1).dy);
 assert.deepEqual(labels.at(-1).anchor,{x:points.at(-1).x,y:points.at(-1).y});
});
