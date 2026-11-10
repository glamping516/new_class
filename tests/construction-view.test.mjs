import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {floorboxRecords,constructionNote,layerSettings,dimensionLabel,terminalLabelPositions,floorboxDimensionSegments,floorboxGap,floorboxNeighborSegments} from '../dist/construction-data.mjs';
import {buildConstructionScene,constructionCamera} from '../dist/construction-scene.js';
import {SoftwareRenderer} from '../dist/software-renderer.js';
import {classroomFloorBoxes} from '../dist/floor-boxes.mjs';
const state={room:{w:9,d:12,h:2.7},items:[],fixtures:[
 {id:'port0',kind:'floorbox',name:'바닥 단자 1',x:.85,z:4.18,w:.18,depth:.18},
 {id:'port1',kind:'floorbox',name:'숨긴 단자',x:3.13,z:6.29,w:.18,depth:.18,hidden:true}
]};

test('inspection numbers and four wall distances use actual box edges without changing saved centres and preserve hidden numbering',()=>{
 const before=structuredClone(state),all=floorboxRecords(state);
 assert.deepEqual(all.map(f=>[f.code,f.left,f.front,f.right,f.back]),[['F01',76,409,806,773],['F02',304,620,578,562]]);
 assert.deepEqual(floorboxRecords(state,{includeHidden:false}).map(f=>f.code),['F01']);
 const other={...state,room:{w:10,d:15,h:3},fixtures:[{...state.fixtures[0],x:1.234,z:5.678}]};
 assert.deepEqual(floorboxRecords(other).map(f=>[f.left,f.front,f.right,f.back]),[[114.4,558.8,867.6,923.2]]);
 assert.deepEqual(state,before);assert.match(constructionNote({...state,fixtures:classroomFloorBoxes()}),/4열 × 3줄/);assert.match(constructionNote({...state,fixtures:classroomFloorBoxes()}),/문벽→가까운 모서리 360cm/);assert.match(constructionNote({...state,fixtures:classroomFloorBoxes()}),/330cm/);assert.doesNotMatch(constructionNote(other),/360cm/);
});

test('construction plan reports measured wall clearances, corrected gaps and inferred size honestly',()=>{
 const fixtures=classroomFloorBoxes(),records=floorboxRecords({...state,fixtures}),note=constructionNote({...state,fixtures});
 assert.equal(records[0].left,81);assert.equal(records[3].right,85);
 assert.deepEqual(records.slice(0,4).map(f=>f.left),[81,317.25,553.5,789.75]);
 assert.match(note,/가로 빈 간격 211cm·세로 228cm/);
 assert.match(note,/가로 25.25cm.*계산한 값.*깊이 18cm는 추정값/);
 assert.doesNotMatch(note,/임시 배치|좌우 빈 간격 228cm/);
 const custom=constructionNote({...state,fixtures:classroomFloorBoxes([],state.room,{w:.2,depth:.3,estimated:false})});
 assert.match(custom,/오른쪽벽→모서리 106cm/);assert.match(custom,/실측 85cm와 차이/);
 assert.doesNotMatch(custom,/깊이 18cm|추정값/);
 const right=floorboxDimensionSegments(records[3],state.room).find(f=>f.wall==='right');
 assert.equal(right.text,'오른쪽벽 · 85cm');assert.ok(Math.abs(right.a.x-right.b.x-.85)<1e-9);
 const before=structuredClone(fixtures);
 const saved=JSON.parse(JSON.stringify(fixtures));
 assert.deepEqual(floorboxRecords({...state,fixtures:saved}),records);assert.deepEqual(fixtures,before);
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

test('all 13 number labels remain separate and nearby custom boxes move only their labels',()=>{
 const camera=constructionCamera(state.room,1023,850,{mode:'top'}).camera;
 const boxes=classroomFloorBoxes(),before=structuredClone(boxes);
 const points=boxes.map(f=>{const p=new THREE.Vector3(f.x,.35,f.z).project(camera);return{id:f.id,x:(p.x+1)*1023/2,y:(1-p.y)*850/2};});
 const labels=terminalLabelPositions(points);assert.equal(labels.length,13);
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  const a=labels[i],b=labels[j];assert.ok(Math.abs(a.x-b.x)>=47||Math.abs(a.y-b.y)>=30);
 }
 assert.deepEqual(boxes,before);
 assert.deepEqual(labels.at(-1).anchor,{x:points.at(-1).x,y:points.at(-1).y});
 const nearby=terminalLabelPositions([{x:300,y:200},{x:300,y:208}]);
 assert.ok(nearby[1].dx||nearby[1].dy);
 assert.ok(Math.abs(nearby[0].x-nearby[1].x)>=47||Math.abs(nearby[0].y-nearby[1].y)>=30);
 assert.deepEqual(nearby[1].anchor,{x:300,y:208});
});

test('phone terminal labels stay inside the drawing and clear each other without changing outlet anchors',()=>{
 for(const [width,height]of [[390,277],[360,230],[768,400]]){
  const camera=constructionCamera(state.room,width,height,{mode:'top'}).camera;
  const points=classroomFloorBoxes().map(f=>{const p=new THREE.Vector3(f.x,.35,f.z).project(camera);return{id:f.id,x:(p.x+1)*width/2,y:(1-p.y)*height/2};});
  const labels=terminalLabelPositions(points,{width:36,height:25,viewport:{width,height}});
  assert.equal(labels.length,13);
  for(const [n,p]of labels.entries()){
   assert.deepEqual(p.anchor,{x:points[n].x,y:points[n].y});
   assert.ok(p.x-18>=2&&p.x+18<=width-2&&p.y-25>=2&&p.y<=height-2,`${width}×${height}: ${p.id} is inside`);
  }
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(Math.abs(labels[i].x-labels[j].x)>=39||Math.abs(labels[i].y-labels[j].y)>=28,`${width}×${height}: ${i}/${j} do not overlap`);
 }
});


test('all four inspection lines end at actual corners and show 360cm to the back wall',()=>{
 const record=floorboxRecords({room:state.room,fixtures:classroomFloorBoxes()})[8];
 assert.equal(record.back,360);assert.equal(record.front,822);
 const lines=floorboxDimensionSegments(record,state.room),back=lines.find(l=>l.wall==='back');
 assert.deepEqual(lines.map(l=>l.wall),['left','right','front','back']);
 assert.ok(back);assert.match(back.text,/360cm/);
 assert.ok(Math.abs(back.a.z-back.b.z-3.6)<1e-9);
 assert.equal(back.b.z,record.edges.maxZ);assert.equal(back.b.x,record.edges.maxX);
 assert.ok(lines.some(l=>l.wall==='left'));
 const right=floorboxRecords({room:state.room,fixtures:classroomFloorBoxes()})[11];
 assert.ok(floorboxDimensionSegments(right,state.room).some(l=>l.wall==='right'));
});

test('selecting a middle box gives the four adjacent clear gaps and avoids distant boxes in the same row',()=>{
 const fixtures=classroomFloorBoxes(),records=floorboxRecords({...state,fixtures}),before=structuredClone(records);
 const neighbors=floorboxNeighborSegments(records[5],records);
 assert.deepEqual(neighbors.map(n=>[n.code,n.distance]),[['F05',211],['F07',211],['F02',228],['F10',228]]);
 for(const n of neighbors){
  assert.ok(Math.abs(Math.hypot(n.a.x-n.b.x,n.a.z-n.b.z)*100-n.distance)<1e-8);
  assert.equal(n.kind,'neighbor');assert.ok(n.text.startsWith('F06 ↔ '));
 }
 assert.deepEqual(records,before);
 for(const selected of records){
  const near=floorboxNeighborSegments(selected,records);
  assert.ok(near.length>=2&&near.length<=4);assert.ok(!near.some(n=>n.targetId===selected.id));
 }
});

test('the lone front box links to its two nearby corners and diagonal distance uses real box footprints',()=>{
 const records=floorboxRecords({...state,fixtures:classroomFloorBoxes()});
 const near=floorboxNeighborSegments(records.at(-1),records);
 assert.deepEqual(near.map(n=>[n.code,n.distance]),[['F03',203.43],['F02',205.24]]);
 assert.ok(near.every(n=>!n.direction));
 const a={x:1,z:1,w:.2,depth:.4},b={x:2,z:2,w:.6,depth:.2},before=structuredClone([a,b]);
 const gap=floorboxGap(a,b);assert.deepEqual(gap.a,{x:1.1,z:1.2});assert.deepEqual(gap.b,{x:1.7,z:1.9});
 assert.ok(Math.abs(gap.distance-Math.hypot(.6,.7))<1e-10);
 assert.equal(floorboxGap(a,{...a,x:1.2}).distance,0);
 assert.equal(floorboxGap(a,{...a,x:1.01,z:1.01}).distance,0);
 assert.deepEqual([a,b],before);
});

test('neighbor distances follow edited sizes and visibility, preserve numbering, and survive JSON',()=>{
 const fixtures=classroomFloorBoxes();fixtures[5].hidden=true;
 const custom={...state,fixtures};let records=floorboxRecords(custom,{includeHidden:false});
 const neighbors=floorboxNeighborSegments(records.find(f=>f.code==='F05'),records);
 const right=neighbors.find(n=>n.direction==='right');
 assert.equal(right.code,'F07');assert.equal(right.distance,447.25);
 const selected=records[0];assert.deepEqual(floorboxNeighborSegments(selected,[selected]),[]);
 fixtures[0].w+=.1;
 records=floorboxRecords(custom);
 assert.equal(floorboxNeighborSegments(records[0],records).find(n=>n.code==='F02').distance,206);
 assert.deepEqual(floorboxNeighborSegments(records[0],records),floorboxNeighborSegments(floorboxRecords(JSON.parse(JSON.stringify(custom)))[0],floorboxRecords(JSON.parse(JSON.stringify(custom)))));
});
