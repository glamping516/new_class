import test from 'node:test';
import assert from 'node:assert/strict';
import {wallCornerMeasurements,fixedWallMeasurementItems} from '../dist/wall-corners.mjs';
import {corners} from '../dist/geometry.mjs';
import {CATALOG} from '../dist/furniture.mjs';
const room={w:9,d:12,h:2.7},item={id:'a',type:'computerDesk',x:2,z:3,rot:0};
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('both wall-facing ends are measured for all four walls, rather than their midpoint',()=>{
 const lines=wallCornerMeasurements([item],room,CATALOG);assert.equal(lines.length,8);
 for(const [wall,distance]of [['front',2.7],['back',8.7],['left',1.25],['right',6.25]]){const pair=lines.filter(m=>m.wall===wall);assert.equal(pair.length,2);for(const m of pair)close(m.distance,distance);assert.notDeepEqual(pair[0].a,pair[1].a);}
 assert.deepEqual(lines.filter(m=>m.wall==='front').map(m=>m.corner),[1,2]);
});
test('a nearer object never suppresses wall positioning dimensions for another object',()=>{
 const items=[item,{...item,id:'b',z:4.27},{...item,id:'c',z:5.54}],before=JSON.stringify(items),lines=wallCornerMeasurements(items,room,CATALOG);
 assert.equal(lines.length,24);assert.equal(new Set(lines.map(m=>m.key)).size,24);
 for(const i of items)assert.equal(lines.filter(m=>m.from===i.id&&m.wall==='front').length,2);
 assert.equal(JSON.stringify(items),before);
});
test('rotated rectangles include every front-facing edge vertex, with perpendicular wall projections',()=>{
 const i={...item,rot:35,dims:[1.8,.8,.72]},vertices=corners(i,CATALOG),lines=wallCornerMeasurements([i],room,CATALOG);assert.equal(lines.length,12);
 for(const m of lines){assert(vertices.some(p=>Math.hypot(p.x-m.a.x,p.z-m.a.z)<1e-9));if(['front','back'].includes(m.wall)){close(m.a.x,m.b.x);close(m.b.z,m.wall==='front'?0:12);}else{close(m.a.z,m.b.z);close(m.b.x,m.wall==='left'?0:9);}close(m.distance,Math.hypot(m.b.x-m.a.x,m.b.z-m.a.z));}
 assert.equal(wallCornerMeasurements([{...i,rot:90}],room,CATALOG).length,8);
});
test('round furniture uses actual ellipse tangents rather than imaginary rectangular corners',()=>{
 const round={id:'round',type:'consultRound80',x:4,z:5,rot:40,dims:[1.2,.6,.73]},lines=wallCornerMeasurements([round],room,CATALOG);assert.equal(lines.length,4);
 const r=40*Math.PI/180;for(const m of lines){const dx=m.a.x-round.x,dz=m.a.z-round.z,u=dx*Math.cos(r)-dz*Math.sin(r),v=dx*Math.sin(r)+dz*Math.cos(r);close(u*u/.36+v*v/.09,1);assert.equal(m.corner,null);}
});
test('explicit selection, direction and visibility filters preserve source identities and dimensions',()=>{
 const items=[item,{...item,id:'b',hidden:true},{...item,id:'c',z:6,y:1}];
 const lines=wallCornerMeasurements(items,room,CATALOG,{selectedIds:['c'],walls:['front']});assert.equal(lines.length,2);assert(lines.every(m=>m.from==='c'&&m.wall==='front'));close(lines[0].distance,5.7);
 assert.equal(wallCornerMeasurements([],room,CATALOG).length,0);
});
test('fixed sinks and panels use the actual inner wall plane and keep zero-length corner references',()=>{
 for(const wall of ['front','back','left','right']){const fixtures=[{id:'sink',kind:'sink',name:'싱크대',wall,offset:1,w:1.2,depth:.6,h:.85}],fixed=fixedWallMeasurementItems(fixtures,room),lines=wallCornerMeasurements(fixed,room,CATALOG,{walls:[wall]});assert.equal(lines.length,2);for(const m of lines)close(m.distance,0);}
 const hidden=fixedWallMeasurementItems([{id:'p',kind:'panel',hidden:true}],room);assert.equal(hidden.length,0);
});
