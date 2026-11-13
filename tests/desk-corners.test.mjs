import test from 'node:test';
import assert from 'node:assert/strict';
import {deskPairCorners,deskCornerMeasurements} from '../dist/desk-corners.mjs';
import {corners} from '../dist/geometry.mjs';
import {CATALOG} from '../dist/furniture.mjs';
const desk=(id,x,z,extra={})=>({id,type:'computerDesk',x,z,rot:0,...extra});
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('front/back and side-by-side distances connect both real end corners',()=>{
 const a=desk('a',2,3),b=desk('b',2,4.27),c=desk('c',4.85,3);
 const depth=deskPairCorners(a,b),side=deskPairCorners(a,c);
 for(const m of depth){close(m.distance,.67);close(m.a.z,3.3);close(m.b.z,3.97);}
 assert.deepEqual(depth.map(m=>m.a.x).sort(),[1.25,2.75]);
 for(const m of side){close(m.distance,1.35);close(m.a.x,2.75);close(m.b.x,4.1);}
 assert.deepEqual(side.map(m=>m.a.z).sort(),[2.7,3.3]);
});
test('a turned desk has different end lengths and endpoints remain actual rotated vertices',()=>{
 const a=desk('a',2,3),b=desk('b',2.2,4.27,{rot:4,dims:[1.6,.7,.72]}),snapshot=JSON.stringify([a,b]),lines=deskPairCorners(a,b);
 assert(Math.abs(lines[0].distance-lines[1].distance)>.05);
 for(const m of lines){assert(corners(a,CATALOG).some(p=>Math.hypot(p.x-m.a.x,p.z-m.a.z)<1e-9));assert(corners(b,CATALOG).some(p=>Math.hypot(p.x-m.b.x,p.z-m.b.z)<1e-9));close(m.distance,Math.hypot(m.b.x-m.a.x,m.b.z-m.a.z));}
 assert.equal(JSON.stringify([a,b]),snapshot);
});
test('a three-by-six layout has two endpoints per adjacent pair with no duplicate or through-desk pair',()=>{
 const items=Array.from({length:18},(_,n)=>desk('d'+String(n).padStart(2,'0'),1.55+n%3*2.85,3.15+Math.floor(n/3)*1.27)),lines=deskCornerMeasurements(items);
 assert.equal(lines.length,(15+12)*2);assert.equal(new Set(lines.map(m=>m.key)).size,lines.length);
 assert.equal(new Set(lines.map(m=>m.pairKey)).size,27);
 for(const m of lines)close(m.distance,m.axis==='z'?.67:1.35);
 assert(!lines.some(m=>m.from==='d00'&&m.to==='d06'));
 assert(deskCornerMeasurements(items,CATALOG,{selectedIds:['d04']}).every(m=>m.from==='d04'||m.to==='d04'));
});
test('touching corners report zero and overlapping desktops are explicitly marked',()=>{
 const a=desk('a',2,3);
 for(const m of deskPairCorners(a,desk('b',3.5,3))){close(m.distance,0);assert.equal(m.overlapping,false);}
 assert(deskPairCorners(a,desk('b',2,3.4)).every(m=>m.overlapping));
});
test('hidden and raised objects are excluded; rectangular consultation tables are supported',()=>{
 const items=[desk('a',2,3),desk('b',2,4.5,{type:'consultRect140'}),desk('c',5,3,{hidden:true}),desk('d',5,3,{y:.8})];
 const lines=deskCornerMeasurements(items);assert.equal(lines.length,2);assert(lines.every(m=>[m.from,m.to].includes('b')));
});
test('front/back-only measurements follow the screen when it faces a side wall',()=>{
 const items=[desk('a',2,3,{rot:90}),desk('b',3.4,3,{rot:90}),desk('c',2,5,{rot:90}),{id:'screen',type:'screen',rot:90,x:0,z:0}];
 const lines=deskCornerMeasurements(items,CATALOG,{frontBackOnly:true});assert.equal(lines.length,2);assert(lines.every(m=>m.from==='a'&&m.to==='b'));for(const m of lines)close(m.distance,.8);
});
