import test from 'node:test';
import assert from 'node:assert/strict';
import {tapePlan,tapeDeskGrid,nearestWallReferences,objectPairMeasurement,tapeLabelLayout} from '../dist/tape-plan.mjs';
import {cadDrawing} from '../dist/cad-plan.mjs';
import {classroomFloorBoxes} from '../dist/floor-boxes.mjs';
const room={w:9,d:12,h:2.7};
const desk=(id,x,z,extra={})=>({id,type:'computerDesk',x,z,rot:0,...extra});
const desks=Array.from({length:18},(_,n)=>desk('desk'+n,1.55+n%3*2.85,3.15+Math.floor(n/3)*1.27));
const state={room,items:[...desks,{id:'partition',type:'partition140',x:3.3,z:1.95,rot:0}],fixtures:classroomFloorBoxes([],room)};
const close=(a,b,t=1e-8)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
test('a repeated classroom uses six row and three column tape offsets with seven gap lines',()=>{
 const before=JSON.stringify(state),data=tapePlan(state);assert.equal(data.grid.rows.length,6);assert.equal(data.grid.columns.length,3);assert.equal(data.grid.ids.length,18);assert.equal(data.measurements.length,7);assert.equal(data.cues.length,9);
 close(data.grid.rows[0].front,2.85);close(data.grid.rows[5].front,9.2);assert.deepEqual(data.grid.columns.map(c=>Number(c.minX.toFixed(2))),[.8,3.65,6.5]);
 for(const m of data.measurements)close(m.distance,m.kind==='row'?.67:1.35);
 assert.equal(JSON.stringify(state),before);
});
test('incomplete, misaligned and rotated grids keep individual references instead of assuming repeated positions',()=>{
 assert.equal(tapeDeskGrid(desks.slice(1),room),null);assert.equal(tapeDeskGrid(desks.map((i,n)=>n===7?{...i,x:i.x+.05}:i),room),null);assert.equal(tapeDeskGrid(desks.map((i,n)=>n===0?{...i,rot:5}:i),room),null);
 const data=tapePlan({...state,items:desks.slice(1)});assert.equal(data.references.filter(r=>r.type==='computerDesk').length,17);
});
test('every floor panel and partition retains two nearest-wall edge offsets',()=>{
 const data=tapePlan(state),terminals=data.references.filter(r=>r.terminal);assert.equal(terminals.length,13);assert(terminals.every(r=>r.refs.length===2));
 const first=terminals.find(r=>r.code==='01'),last=terminals.find(r=>r.code==='12');close(first.refs[0].distance,.81);close(first.refs[1].distance,3.3);close(last.refs[0].distance,.85);close(last.refs[1].distance,3.6);
 assert.equal(data.references.find(r=>r.id==='partition').refs.length,2);
 const labels=tapeLabelLayout(data,(x,z)=>({x:x*100,y:z*100}),{ordinary:false,selectedIds:['desk0']});assert.equal(labels.length,14);assert(labels.every(r=>r.item.panel));assert.equal(new Set(labels.map(r=>r.item.id)).size,labels.length);
});
test('rotated-panel references use real wall-facing corners and are bounded by exactly two walls',()=>{
 const p={id:'partition',type:'partition140',x:4,z:6,rot:33},refs=nearestWallReferences(p,room);assert.equal(refs.length,2);assert(new Set(refs.map(r=>r.wall)).size===2);for(const r of refs)close(r.distance,Math.hypot(r.a.x-r.b.x,r.a.z-r.b.z));
});
test('arbitrary object pairs support near, distant, touching and overlapping footprints',()=>{
 const a=desk('a',2,3),b=desk('b',2,4.27);close(objectPairMeasurement(a,b).distance,.67);close(objectPairMeasurement(a,b).vertical,.67);close(objectPairMeasurement(a,b).horizontal,0);
 const far=objectPairMeasurement(a,desk('far',7,10));assert(far.distance>7);close(far.horizontal,3.5);close(far.vertical,6.4);
 close(objectPairMeasurement(a,desk('touch',3.5,3)).distance,0);assert(objectPairMeasurement(a,desk('overlap',2.1,3)).overlapping);assert.equal(objectPairMeasurement(a,a),null);
});
test('round-table pair distances use circular edges and preserve distances under rotation',()=>{
 const a={id:'a',type:'consultRound100',x:2,z:3,rot:0},b={id:'b',type:'consultRound100',x:5,z:3,rot:0};close(objectPairMeasurement(a,b).distance,2);assert.equal(objectPairMeasurement(a,b).ends.length,0);
 const rotate=(i,r)=>({...i,x:i.x*Math.cos(r)+i.z*Math.sin(r),z:-i.x*Math.sin(r)+i.z*Math.cos(r),rot:r*180/Math.PI});close(objectPairMeasurement(rotate(a,.47),rotate(b,.47)).distance,2,1e-7);
 const turned=objectPairMeasurement({...a,rot:45},{...b,rot:45});close(turned.horizontal,2);close(turned.vertical,0);
});
test('CAD defaults to practical dimensions and keeps essential panel offsets when optional layers are off',()=>{
 const normal=cadDrawing(state);assert.equal(normal.visibleWalls.length,0);assert.equal((normal.svg.match(/class="cad-reference-dimension"/g)||[]).length,normal.references.length*2);assert.equal(normal.visibleCorners.length,7);assert.equal(normal.references.filter(r=>r.item.panel).length,14);
 const reduced=cadDrawing(state,{walls:false,dimensions:false,labels:false,terminals:false});assert.equal(reduced.references.length,14);assert.equal(reduced.visibleCorners.length,0);assert(reduced.svg.includes('판넬')||reduced.svg.includes('좌'));
 const pair=cadDrawing(state,{pairFrom:'desk0',pairTo:'desk17'});assert(pair.pair.distance>0);assert(pair.svg.includes('class="cad-pair-distance"'));
});
