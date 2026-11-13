import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {floorboxRecords,constructionNote,layerSettings,dimensionLabel,terminalLabelPositions,floorboxDimensionSegments,floorboxGap,floorboxNeighborSegments,floorboxOverviewSegments,drawingExportFrame} from '../dist/construction-data.mjs';
import {buildConstructionScene,constructionCamera} from '../dist/construction-scene.js';
import {SoftwareRenderer} from '../dist/software-renderer.js';
import {classroomFloorBoxes} from '../dist/floor-boxes.mjs';
const state={room:{w:9,d:12,h:2.7},items:[],fixtures:[
 {id:'port0',kind:'floorbox',name:'바닥 단자 1',x:.85,z:4.18,w:.18,depth:.18},
 {id:'port1',kind:'floorbox',name:'숨긴 단자',x:3.13,z:6.29,w:.18,depth:.18,hidden:true}
]};

test('inspection numbers and four wall distances use actual box edges without changing saved centres and preserve hidden numbering',()=>{
 const before=structuredClone(state),all=floorboxRecords(state);
 assert.deepEqual(all.map(f=>[f.code,f.left,f.front,f.right,f.back]),[['01',76,409,806,773],['02',304,620,578,562]]);
 assert.deepEqual(floorboxRecords(state,{includeHidden:false}).map(f=>f.code),['01']);
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
 assert.deepEqual(neighbors.map(n=>[n.code,n.distance]),[['05',211],['07',211],['02',228],['10',228]]);
 for(const n of neighbors){
  assert.ok(Math.abs(Math.hypot(n.a.x-n.b.x,n.a.z-n.b.z)*100-n.distance)<1e-8);
  assert.equal(n.kind,'neighbor');assert.ok(n.text.startsWith('06 ↔ '));
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
 assert.deepEqual(near.map(n=>[n.code,n.distance]),[['03',203.43],['02',205.24]]);
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
 const neighbors=floorboxNeighborSegments(records.find(f=>f.code==='05'),records);
 const right=neighbors.find(n=>n.direction==='right');
 assert.equal(right.code,'07');assert.equal(right.distance,447.25);
 const selected=records[0];assert.deepEqual(floorboxNeighborSegments(selected,[selected]),[]);
 fixtures[0].w+=.1;
 records=floorboxRecords(custom);
 assert.equal(floorboxNeighborSegments(records[0],records).find(n=>n.code==='02').distance,206);
 assert.deepEqual(floorboxNeighborSegments(records[0],records),floorboxNeighborSegments(floorboxRecords(JSON.parse(JSON.stringify(custom)))[0],floorboxRecords(JSON.parse(JSON.stringify(custom)))));
});


test('numeric codes preserve teacher-side sequence and the lone 13 across import order and visibility',()=>{
 const fixtures=classroomFloorBoxes();fixtures[0].name='교사 자리';fixtures[1].name='스크린 앞';fixtures[2].name='스크린 오른쪽 앞';fixtures[1].hidden=true;
 const before=structuredClone(fixtures),full=floorboxRecords({...state,fixtures});
 assert.deepEqual(floorboxRecords({...state,fixtures:[...fixtures].reverse()}),full);
 assert.deepEqual(full.slice(0,3).map(f=>[f.id,f.code,f.name]),[['port0','01','교사 자리'],['port1','02','스크린 앞'],['port2','03','스크린 오른쪽 앞']]);
 assert.equal(full.at(-1).id,'front-center-port');assert.equal(full.at(-1).code,'13');
 assert.ok(full.every(f=>/^\d{2}$/.test(f.code)));
 assert.equal(floorboxRecords({...state,fixtures},{includeHidden:false})[1].code,'03');
 assert.deepEqual(fixtures,before);
});

test('overview shows each nearby pair once and outer wall references while preserving full wall readings',()=>{
 const records=floorboxRecords({...state,fixtures:classroomFloorBoxes()}),before=structuredClone(records);
 const lines=floorboxOverviewSegments(records,state.room),pairs=lines.filter(l=>l.kind==='neighbor'),walls=lines.filter(l=>l.kind==='wall');
 assert.equal(pairs.length,19);assert.equal(new Set(pairs.map(p=>p.key)).size,19);assert.equal(walls.length,11);
 for(const f of records)for(const near of floorboxNeighborSegments(f,records)){
  const pair=pairs.find(p=>p.key===[f.id,near.targetId].sort().join('|'));assert.ok(pair);assert.equal(pair.distance,near.distance);
 }
 assert.ok(lines.every(l=>/^\d+(?:\.\d+)?cm$/.test(l.text)));
 assert.deepEqual([records[0].left,records[0].right,records[0].front,records[0].back],[81,793.75,330,852]);
 assert.deepEqual(floorboxOverviewSegments(records,state.room,{walls:false}),pairs);
 assert.deepEqual(floorboxOverviewSegments(records,state.room,{neighbors:false}),walls);
 assert.deepEqual(floorboxOverviewSegments([],state.room),[]);assert.deepEqual(records,before);
});

test('number badges stay above every real terminal plate and inside desktop and phone views',()=>{
 const records=floorboxRecords({...state,fixtures:classroomFloorBoxes()});
 for(const [width,height]of [[1023,850],[390,277],[360,230],[768,400]]){
  const camera=constructionCamera(state.room,width,height,{mode:'top'}).camera;
  const project=(x,z)=>{const p=new THREE.Vector3(x,.04,z).project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2};};
  const points=records.map(f=>{const e=f.edges,p=project(f.x,f.z),corners=[[e.minX,e.minZ],[e.maxX,e.minZ],[e.maxX,e.maxZ],[e.minX,e.maxZ]].map(([x,z])=>project(x,z));
   const plate={minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minY:Math.min(...corners.map(p=>p.y)),maxY:Math.max(...corners.map(p=>p.y))};
   return{...p,id:f.id,plate,lift:Math.max(10,p.y-plate.minY+8)};
  });
  const before=structuredClone(points),labels=terminalLabelPositions(points,{width:32,height:25,viewport:{width,height}});
  assert.equal(labels.length,13);assert.deepEqual(points,before);
  for(const [n,p]of labels.entries()){
   assert.deepEqual(p.anchor,{x:points[n].x,y:points[n].y});
   assert.ok(p.y<=points[n].plate.minY-6,`${width}×${height}: ${p.id} clears its plate`);
   assert.ok(p.x-16>=2&&p.x+16<=width-2&&p.y-25>=2&&p.y<=height-2,`${width}×${height}: ${p.id} is inside`);
   for(const q of points)assert.ok(!(p.x-16<q.plate.maxX+5&&p.x+16>q.plate.minX-5&&p.y-25<q.plate.maxY+5&&p.y>q.plate.minY-5),`${width}×${height}: ${p.id} avoids every plate`);
  }
 }
});

test('drawing-only export tightly fits geometry and raised annotations without sidebar or viewport margins',()=>{
 const points=[{x:250,y:120},{x:750,y:820}],rectangles=[{x:228,y:78,w:36,h:25},{x:200,y:400,w:45,h:18}],before=structuredClone([points,rectangles]);
 const f=drawingExportFrame(points,rectangles,{padding:18});
 assert.equal(f.x,182);assert.equal(f.y,60);assert.equal(f.w,586);assert.equal(f.h,778);assert.equal(f.height,2600);
 assert.ok(f.width<2000);assert.deepEqual([points,rectangles],before);
 assert.equal(Math.max(drawingExportFrame([{x:0,y:0},{x:1000,y:400}]).width,drawingExportFrame([{x:0,y:0},{x:1000,y:400}]).height),2600);
});

test('export frame contains the complete split, floor and fixed-top scenes at large resolution',()=>{
 for(const mode of ['split','floor','top']){
  const camera=constructionCamera(state.room,1023,850,{mode,lift:3.4}).camera,position=camera.position.clone();
  const points=[];
  for(const x of [-.12,9.12])for(const z of [-.12,12.12])for(const y of [-.25,mode==='split'?6.1:.4]){
   const p=new THREE.Vector3(x,y,z).project(camera);points.push({x:(p.x+1)*1023/2,y:(1-p.y)*850/2});
  }
  const f=drawingExportFrame(points);
  assert.equal(Math.max(f.width,f.height),2600);
  for(const p of points)assert.ok(p.x>=f.x&&p.x<=f.x+f.w&&p.y>=f.y&&p.y<=f.y+f.h);
  assert.ok(camera.position.equals(position));
 }
});
