import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classroomFloorBoxes,migrateLegacyFloorBoxes} from '../dist/floor-boxes.mjs';
import {validateFixtures} from '../dist/room-structure.mjs';
const room={w:9,d:12,h:2.7};
const walls=[
 {id:'sink',kind:'sink',wall:'front',offset:7.2,w:1.45,h:.85,depth:.58,bottom:0},
 {id:'door',kind:'door',wall:'back',offset:.45,w:1.4,h:2.1,depth:.1,bottom:0}
];
const legacy=(count=9)=>[...structuredClone(walls),...Array.from({length:9},(_,n)=>({
 id:`port${n}`,kind:'floorbox',name:`기존 단자 ${n+1}`,estimated:true,
 x:(count===9?[1.8,4.5,7.2]:[.85,3.13,5.41])[n%3],
 z:(count===9?[3.15,6.3,9.45]:[4.18,6.29,8.4])[Math.floor(n/3)],w:.18,h:.015,depth:.18
})),...(count===10?[{id:'sink-port',kind:'floorbox',name:'싱크대 옆 바닥 단자',x:7.925,z:1.3,w:.18,h:.015,depth:.18,estimated:true}]:[])];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} should equal ${b}`);

test('13 floor boxes start 85 cm from the screen wall with four 211 cm rows and three 228 cm columns',()=>{
 const boxes=classroomFloorBoxes(walls),grid=boxes.slice(0,12);
 assert.equal(boxes.length,13);
 assert.deepEqual([...new Set(grid.map(f=>f.x))],[2.22,4.5,6.78]);
 assert.deepEqual([...new Set(grid.map(f=>f.z))],[.85,2.96,5.07,7.18]);
 for(let row=0;row<4;row++)for(let col=1;col<3;col++)near(grid[row*3+col].x-grid[row*3+col-1].x,2.28);
 for(let row=1;row<4;row++)for(let col=0;col<3;col++)near(grid[row*3+col].z-grid[(row-1)*3+col].z,2.11);
 assert.equal(boxes.at(-1).z,1.3);assert.equal(boxes.at(-1).x,4.5);assert.equal(boxes.at(-1).name,'맞은편 벽 중앙 단자');
 near(room.d-grid.at(-1).z,4.82);
 assert.doesNotThrow(()=>validateFixtures([...walls,...boxes],room));
});

test('both shipped 9- and 10-box layouts migrate once while preserving wall facilities, custom names and visibility',()=>{
 for(const count of [9,10]){
  const fixtures=legacy(count);fixtures[2].hidden=true;const before=structuredClone(fixtures);
  const updated=migrateLegacyFloorBoxes(fixtures,room),ports=updated.filter(f=>f.kind==='floorbox');
  assert.deepEqual(fixtures,before);assert.equal(ports.length,13);
  assert.equal(updated[0],fixtures[0]);assert.equal(updated[1],fixtures[1]);
  assert.equal(ports[0].name,'기존 단자 1');assert.equal(ports[0].hidden,true);
  assert.deepEqual(ports.map(f=>[f.x,f.z]),classroomFloorBoxes().map(f=>[f.x,f.z]));
  assert.equal(ports.at(-1).name,'맞은편 벽 중앙 단자');
  assert.equal(migrateLegacyFloorBoxes(updated,room),updated);
  assert.deepEqual(JSON.parse(JSON.stringify(updated)),updated);
 }
});

test('custom room or fixture edits are preserved and all-hidden layouts keep all new boxes hidden',()=>{
 for(const count of [9,10]){
  const fixtures=legacy(count);assert.equal(migrateLegacyFloorBoxes(fixtures,{...room,d:10}),fixtures);
  for(const change of [f=>f[2].x+=.01,f=>f[2].w=.2,f=>f[2].estimated=false,f=>f.pop(),f=>f[0].wall='right']){
   const custom=legacy(count);change(custom);assert.equal(migrateLegacyFloorBoxes(custom,room),custom);
  }
  const hidden=legacy(count);hidden.filter(f=>f.kind==='floorbox').forEach(f=>f.hidden=true);
  assert.ok(migrateLegacyFloorBoxes(hidden,room).filter(f=>f.kind==='floorbox').every(f=>f.hidden));
 }
 const collision=[...walls,{...walls[1],id:'front-center-port',offset:3}];
 assert.equal(classroomFloorBoxes(collision).at(-1).id,'front-center-port-1');
});
