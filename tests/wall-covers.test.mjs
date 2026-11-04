import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {CATALOG} from '../dist/furniture.mjs';
import {WALL_COVERS,coverColor,fitCoverToWall,validateCoverAppearance,validItemDimensions,coverCutouts,solidRegions,coverRollCount,coverIsAttached,releaseMovedCover} from '../dist/wall-covers.mjs';
import {buildExtraModel} from '../dist/extra-models.js';
import {bounds} from '../dist/geometry.mjs';
const room={w:9,d:12,h:2.7},close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const material=color=>new THREE.MeshStandardMaterial({color});
const box=(g,w,h,d,x,y,z,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
const cylinder=(g,a,b,h,x,y,z,m,n)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,n),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
const kit={material,box,cylinder,mats:{}};

test('wall products retain sourced module sizes, unique palettes and thin-panel validation',()=>{
 assert.equal(WALL_COVERS.length,7);assert.equal(WALL_COVERS.reduce((n,c)=>n+c.palette.length,0),44);
 for(const c of WALL_COVERS){assert.equal(c.category,'wallcover');assert.ok(c.sourceUrl.startsWith('https://'));assert.ok(validItemDimensions(c.type,c.dims));assert.equal(new Set(c.palette.map(p=>p.color)).size,c.palette.length);}
 assert.deepEqual(WALL_COVERS.find(c=>c.type==='coverBasicStone').dims,[1.2,.006,2.4]);
 assert.equal(validItemDimensions('desk',[9,.006,2.7]),false);assert.equal(validItemDimensions('coverBasicStone',[30,.006,6]),true);
});
test('full-wall fitting honors all four orientations and follows resized room height and width',()=>{
 for(const wall of ['front','back','left','right']){
  const fitted=fitCoverToWall({id:'cover',type:'coverBasicStone',x:4,z:5,color:'#667788'},wall,room,{full:true}),b=bounds(fitted,CATALOG);
  assert.ok(b.minX>=-1e-9&&b.maxX<=room.w+.0001&&b.minZ>=-1e-9&&b.maxZ<=room.d+.0001);assert.equal(fitted.dims[0],['left','right'].includes(wall)?12:9);assert.equal(fitted.dims[2],2.7);assert.ok(coverIsAttached(fitted,room));
  const resized=fitCoverToWall(fitted,wall,{w:30,d:20,h:3.2},{full:true});assert.equal(resized.dims[2],3.2);assert.equal(coverColor(resized),'#667788');assert.ok(validItemDimensions(resized.type,resized.dims));
 }
});
test('colors and whole-wall placement survive JSON import while invalid appearance is rejected',()=>{
 const raw=JSON.parse(JSON.stringify({...fitCoverToWall({type:'rollTc',x:2,z:2,color:'#6c8498'},'front',room,{full:true}),coverOpen:true}));
 const restored=validateCoverAppearance(raw,{type:raw.type,dims:[...raw.dims]},room);
 assert.equal(restored.color,'#6c8498');assert.equal(restored.coverOpen,true);assert.equal(restored.coverFit,true);assert.equal(coverRollCount(restored,room),4);
 assert.throws(()=>validateCoverAppearance({...raw,color:'url(javascript:bad)'},{type:raw.type},room),/색상/);
 assert.throws(()=>validateCoverAppearance({...raw,coverFit:'yes'},{type:raw.type},room),/설정/);
 assert.throws(()=>validateCoverAppearance({...raw,coverWall:'bad'},{type:raw.type},room),/벽 위치/);
});
test('moving or rotating fitted finishes releases the fit so saved copies do not snap back',()=>{
 const attached=fitCoverToWall({type:'coverBasicStone',x:4,z:0},'front',room,{full:true});
 assert.equal(releaseMovedCover({...attached,color:'#ffffff'},room).coverFit,true);
 for(const change of [{rot:90},{z:1},{x:3},{dims:[4,.006,2.7]}]){const moved=releaseMovedCover({...attached,...change},room);assert.equal(moved.coverFit,false);assert.equal(moved.coverWall,undefined);const restored=validateCoverAppearance(JSON.parse(JSON.stringify(moved)),{...moved},room);assert.equal(restored.rot,moved.rot);assert.equal(restored.x,moved.x);assert.equal(restored.z,moved.z);}
});
test('access openings are transformed correctly on opposing walls and preserve mounted boards',()=>{
 const fixtures=[{id:'panel',kind:'panel',wall:'back',offset:1,w:1,bottom:.5,h:1}],item=fitCoverToWall({type:'coverBasicStone',x:4,z:5},'back',room,{full:true});
 const holes=coverCutouts(item,room,fixtures);assert.equal(holes.length,1);close((holes[0].x1+holes[0].x2)/2,3);
 const board={id:'board',type:'whiteboardWall120x90',x:3,y:1,z:.018,rot:0};
 const front=fitCoverToWall({...item},'front',room,{full:true}),withBoard=coverCutouts(front,room,[],[board],CATALOG);assert.equal(withBoard.length,1);assert.ok(withBoard[0].y1<1&&withBoard[0].y2>1.9);
 const moved={...front,z:2};assert.deepEqual(coverCutouts(moved,room,fixtures),[]);
});
test('overlapping access openings are cut once without removing material outside them',()=>{
 const holes=[{x1:-1,x2:1,y1:0,y2:2},{x1:0,x2:2,y1:1,y2:3}],regions=solidRegions(6,4,holes);
 close(regions.reduce((a,r)=>a+(r.x2-r.x1)*(r.y2-r.y1),0),17);
 for(const r of regions){const x=(r.x1+r.x2)/2,y=(r.y1+r.y2)/2;assert.ok(!holes.some(h=>x>h.x1&&x<h.x2&&y>h.y1&&y<h.y2));}
});
test('selected colors reach actual 3D materials and opening curtains or rollers reveals the wall',()=>{
 for(const type of ['curtainFr223','rollTc']){
  const c=WALL_COVERS.find(c=>c.type===type),paint='#547ba3',closed=buildExtraModel(c,c.dims,kit,{color:paint}),opened=buildExtraModel(c,c.dims,kit,{color:paint,coverOpen:true});
  const visibleArea=g=>g.children.filter(m=>m.geometry.type==='BoxGeometry'&&m.geometry.parameters.height>.1).reduce((a,m)=>a+m.geometry.parameters.width*m.geometry.parameters.height,0);
  assert.ok(closed.children.some(m=>m.material.color.getHexString()==='547ba3'));assert.ok(visibleArea(opened)<visibleArea(closed)*.6);
 }
});
