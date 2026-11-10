import {test} from 'node:test';
import assert from 'node:assert/strict';
import {constructionPlan,footprintIntersection} from '../dist/construction-plan.mjs';
import {floorboxRecords} from '../dist/construction-data.mjs';
import {corners} from '../dist/geometry.mjs';
import {CATALOG} from '../dist/furniture.mjs';
const room={w:9,d:12,h:2.7};
const box=(id,x,z,w=.2,depth=.2)=>({id,kind:'floorbox',x,z,w,depth,h:.015});
const desk=(id,x,z,extra={})=>({id,type:'computerDesk',x,z,rot:0,...extra});
const review=state=>constructionPlan(state,floorboxRecords(state));

test('top-down plan uses current desk coordinates and detects complete, partial and separate terminal footprints',()=>{
 const state={room,items:[desk('a',2,3,{name:'첫 번째 책상'}),desk('b',5,6)],fixtures:[box('full',2,3),box('partial',2.78,3),box('clear',4,3)]},before=structuredClone(state);
 const plan=review(state);
 assert.deepEqual(plan.footprints[0].polygon,corners(state.items[0],CATALOG));
 assert.deepEqual(plan.covered.map(c=>c.id),['full','partial']);
 assert.equal(plan.covered[0].items[0].name,'첫 번째 책상');
 assert.ok(plan.footprints[0].overlaps[1].polygon.every(p=>p.x<=2.75+1e-8));
 assert.deepEqual(state,before);
 assert.deepEqual(review(JSON.parse(JSON.stringify(state))),plan);
});

test('rotated and resized desks use their actual polygons rather than a larger bounding box',()=>{
 const state={room,items:[desk('rotated',3,3,{rot:45,dims:[2,.4,.72]})],fixtures:[box('inside',3,3),box('corner-outside',3.7,3.7,.1,.1)]};
 const plan=review(state);assert.deepEqual(plan.covered.map(c=>c.id),['inside']);
 assert.equal(plan.footprints[0].polygon.length,4);
 const resized={...state,items:[{...state.items[0],dims:[2,2,.72]}]};
 assert.deepEqual(review(resized).covered.map(c=>c.id),['inside','corner-outside']);
});

test('a touching edge is not an overlap and moving a desk updates the floor-access check',()=>{
 const state={room,items:[desk('a',2,3)],fixtures:[box('edge',2.85,3)]};
 assert.equal(review(state).covered.length,0);
 state.items[0].x+=.02;assert.equal(review(state).covered.length,1);
 state.items[0].x=5;assert.equal(review(state).covered.length,0);
 assert.deepEqual(footprintIntersection([],{x:0,z:0,w:.2,depth:.2}),[]);
});

test('floor review excludes hidden, raised and wall items and round tables do not cover their bounding corners',()=>{
 const state={room,items:[desk('hidden',2,3,{hidden:true}),desk('raised',2,3,{y:.7}),{id:'board',type:'whiteboardWall90x60',x:2,z:3},
  {id:'round',type:'consultRound100',x:5,z:5,rot:30}],fixtures:[box('clear',2,3),box('centre',5,5),box('outside',5.44,5.44,.04,.04)]};
 const plan=review(state);assert.deepEqual(plan.footprints.map(f=>f.id),['round']);
 assert.deepEqual(plan.covered.map(c=>c.id),['centre']);
 const onlyVisible=floorboxRecords({...state,fixtures:[{...state.fixtures[1],hidden:true},state.fixtures[0]]},{includeHidden:false});
 assert.equal(constructionPlan(state,onlyVisible).covered.length,0);
});
