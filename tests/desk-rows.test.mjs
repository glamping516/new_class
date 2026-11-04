import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deskRowMeasurements} from '../dist/desk-rows.mjs';
import {CATALOG} from '../dist/furniture.mjs';
const room={w:9,d:12},close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const desk=(id,x,z,extra={})=>({id,type:'computerDesk',x,z,rot:0,...extra});

test('six classroom rows show all five edge-to-edge aisles and front-wall tape offsets',()=>{
 const items=Array.from({length:18},(_,n)=>desk(String(n),1.55+n%3*2.85,3.15+Math.floor(n/3)*1.27));
 const data=deskRowMeasurements(items,room,CATALOG);assert.equal(data.rows.length,6);assert.deepEqual(data.rows.map(r=>r.ids.length),[3,3,3,3,3,3]);
 close(data.rows[0].front,2.85);close(data.rows[1].front,4.12);assert.equal(data.measurements.length,6);close(data.measurements[0].distance,2.85);
 for(const m of data.measurements.slice(1))close(m.distance,.67);
 assert.equal(data.measurements[3].label,'3행 ↔ 4행');assert.equal(data.rows[5].gapToNext,null);
});
test('small row misalignments use the narrowest aisle and disclose the front-edge range',()=>{
 const data=deskRowMeasurements([desk('a',1.5,3.15),desk('b',4.4,3.25),desk('c',1.5,4.42),desk('d',4.4,4.42)],room,CATALOG);
 assert.equal(data.rows.length,2);assert.equal(data.rows[0].misaligned,true);close(data.rows[0].front,2.85);close(data.rows[0].frontMax,2.95);close(data.measurements[1].distance,.57);
});
test('row clearances honor rotated and resized desk footprints',()=>{
 const data=deskRowMeasurements([desk('a',2,3,{rot:90}),desk('b',2,5,{dims:[1.5,.8,.72]})],room,CATALOG);
 close(data.rows[0].front,2.25);close(data.rows[0].back,3.75);close(data.measurements[1].distance,.85);
});
test('overlapping row footprints report overlap rather than a positive aisle',()=>{
 const data=deskRowMeasurements([desk('a',2,3),desk('b',2,3.4)],room,CATALOG);close(data.measurements[1].distance,0);close(data.measurements[1].overlap,.2);
});
test('teacher desks can be included explicitly and all desks work without computer desks',()=>{
 const computers=[desk('a',2,3),desk('b',2,4.27)],teacher=desk('t',2,1.3,{type:'desk'});
 assert.equal(deskRowMeasurements([...computers,teacher],room,CATALOG).rows.length,2);
 assert.equal(deskRowMeasurements([...computers,teacher],room,CATALOG,{includeAll:true}).rows.length,3);
 assert.equal(deskRowMeasurements([teacher],room,CATALOG).rows.length,1);
 assert.equal(deskRowMeasurements([],room,CATALOG).measurements.length,0);
});
