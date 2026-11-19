import test from 'node:test';
import assert from 'node:assert/strict';
import {cadDrawing,cadPlanData,fixturePlan} from '../dist/cad-plan.mjs';
import {classroomFloorBoxes} from '../dist/floor-boxes.mjs';
const room={w:9,d:12,h:2.7,tile:.45};
const state={room,title:'테스트',items:[{id:'a',type:'computerDesk',name:'책상 A',x:2,z:3,rot:0},{id:'b',type:'computerDesk',name:'책상 B',x:2,z:4.27,rot:0},{id:'c',type:'computerDesk',name:'책상 C',x:4.85,z:3,rot:0}],fixtures:[...classroomFloorBoxes([],room),{id:'door',kind:'door',name:'출입문',wall:'back',offset:.45,w:1.4,depth:.1,h:2.1}]};
test('CAD data shares rotated desktop sizes and terminal identities without changing the layout',()=>{
 const snapshot=JSON.stringify(state),data=cadPlanData(state);assert.equal(data.records.length,13);assert.equal(data.records.at(-1).code,'13');assert.equal(data.items[0].code,'D01');assert.deepEqual(data.items[0].dims,[1.5,.6,.72]);assert.equal(JSON.stringify(state),snapshot);
});
test('a vector drawing contains the two end measurements, overall dimensions and physical openings',()=>{
 const result=cadDrawing(state);assert(result.svg.startsWith('<svg xmlns='));assert(result.svg.includes('900'));assert(result.svg.includes('1,200'));assert(result.svg.includes('출입문'));assert(result.svg.includes('단위 cm'));assert(result.visibleCorners.some(m=>Math.abs(m.distance-.67)<1e-9));assert(result.viewBox.x<0&&result.viewBox.y<0&&result.viewBox.h>1200);
});
test('layer switches and selected scope change annotations without losing other furniture',()=>{
 const selected=cadDrawing(state,{selectedId:'b',scope:'selected',terminals:false});assert(selected.visibleCorners.every(m=>m.from==='b'||m.to==='b'));assert.equal(selected.data.items.length,3);assert.equal(cadDrawing(state,{dimensions:false}).visibleCorners.length,0);assert.equal(cadDrawing(state,{theme:'blueprint'}).background,'#10283d');
});
test('SVG safely escapes user names and supports custom room sizes and empty layouts',()=>{
 const custom={...state,items:[{...state.items[0],name:'<script>bad & "quoted"</script>'}]};const svg=cadDrawing(custom).svg;assert(!svg.includes('<script>'));assert(svg.includes('&lt;script&gt;'));assert(svg.includes('&amp;'));
 const empty=cadDrawing({room:{w:3,d:30,h:3},items:[],fixtures:[]});assert.equal(empty.data.items.length,0);assert(empty.viewBox.h>3000);assert(empty.svg.includes('3,000'));
});
test('fixed equipment footprints point inward from every wall',()=>{
 const fixture={offset:1,w:2};assert.deepEqual(fixturePlan({...fixture,wall:'front'},room),{x:2,z:0,angle:0});assert.deepEqual(fixturePlan({...fixture,wall:'back'},room),{x:2,z:12,angle:Math.PI});assert.deepEqual(fixturePlan({...fixture,wall:'left'},room),{x:0,z:2,angle:Math.PI/2});assert.deepEqual(fixturePlan({...fixture,wall:'right'},room),{x:9,z:2,angle:-Math.PI/2});
});
