import {test} from 'node:test';
import assert from 'node:assert/strict';
import {objectGap,wallGaps,clearanceMeasurements,overlaps} from '../dist/geometry.mjs';
const catalog=[{type:'desk',name:'책상',dims:[1.5,.6,.72]}],room={w:9,d:12};
const a={id:'a',type:'desk',x:2,z:3,rot:0};
test('wall distances use furniture edges instead of centers',()=>{const g=wallGaps(a,room,catalog);assert.deepEqual(g.map(x=>Number(x.distance.toFixed(3))),[1.25,6.25,2.7,8.7]);});
test('aisle widths are measured edge to edge and duplicate pairs are suppressed',()=>{const b={...a,id:'b',z:4.27};assert(Math.abs(objectGap(a,b,catalog).distance-.67)<1e-9);const all=clearanceMeasurements([a,b],room,catalog);assert.equal(all.filter(m=>m.kind==='object').length,1);const focused=clearanceMeasurements([a,b],room,catalog,['a']);assert.equal(focused.filter(m=>m.kind==='wall').length,4);});
test('arbitrary rotations use polygon distances rather than axis-aligned bounding-box gaps',()=>{const b={...a,id:'b',x:4.5,z:3,rot:45},distance=objectGap(a,b,catalog).distance;assert(distance>1&&distance<1.3);assert.equal(overlaps(a,b,catalog),false);});
test('touching and overlapping furniture show zero clearance',()=>{assert.equal(objectGap(a,{...a,id:'b',x:3.5},catalog).distance,0);assert.equal(objectGap(a,{...a,id:'b',x:2.1},catalog).distance,0);});
