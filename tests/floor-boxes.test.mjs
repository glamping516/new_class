import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classroomFloorBoxes,migrateLegacyFloorBoxes} from '../dist/floor-boxes.mjs';
import {validateFixtures} from '../dist/room-structure.mjs';

const room={w:9,d:12,h:2.7};
const walls=[
 {id:'sink',kind:'sink',wall:'front',offset:7.2,w:1.45,h:.85,depth:.58,bottom:0},
 {id:'door',kind:'door',wall:'back',offset:.45,w:1.4,h:2.1,depth:.1,bottom:0}
];
const legacy=()=>[...structuredClone(walls),...Array.from({length:9},(_,n)=>({
 id:`port${n}`,kind:'floorbox',name:`기존 단자 ${n+1}`,estimated:true,
 x:[1.8,4.5,7.2][n%3],z:[3.15,6.3,9.45][Math.floor(n/3)],w:.18,h:.015,depth:.18
}))];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} should equal ${b}`);

test('classroom boxes use 228 cm columns, 211 cm rows and a 360 cm rear setback',()=>{
 const boxes=classroomFloorBoxes(walls),grid=boxes.slice(0,9);
 assert.equal(boxes.length,10);
 assert.deepEqual([...new Set(grid.map(f=>f.x))],[.85,3.13,5.41]);
 assert.deepEqual([...new Set(grid.map(f=>f.z))],[4.18,6.29,8.4]);
 for(let row=0;row<3;row++)for(let col=1;col<3;col++)near(grid[row*3+col].x-grid[row*3+col-1].x,2.28);
 for(let row=1;row<3;row++)for(let col=0;col<3;col++)near(grid[row*3+col].z-grid[(row-1)*3+col].z,2.11);
 for(const f of grid.slice(6))near(room.d-f.z,3.6);
 assert.equal(boxes.at(-1).z,1.3);assert.equal(boxes.at(-1).x,7.925);
 assert.doesNotThrow(()=>validateFixtures([...walls,...boxes],room));
});

test('old saved classroom grid is migrated without changing names, visibility or wall facilities',()=>{
 const fixtures=legacy();fixtures[2].hidden=true;
 const before=structuredClone(fixtures),updated=migrateLegacyFloorBoxes(fixtures,room);
 assert.deepEqual(fixtures,before);assert.equal(updated.length,12);
 assert.equal(updated[0],fixtures[0]);assert.equal(updated[1],fixtures[1]);
 assert.equal(updated[2].name,'기존 단자 1');assert.equal(updated[2].hidden,true);
 assert.deepEqual(updated.filter(f=>f.kind==='floorbox').map(f=>[f.x,f.z]),classroomFloorBoxes().map(f=>[f.x,f.z]));
 assert.equal(migrateLegacyFloorBoxes(updated,room),updated);
 assert.deepEqual(JSON.parse(JSON.stringify(updated)),updated);
});

test('custom rooms, edits and removed boxes are never automatically replaced',()=>{
 const fixtures=legacy();assert.equal(migrateLegacyFloorBoxes(fixtures,{...room,d:10}),fixtures);
 for(const change of [f=>f[2].x+=.01,f=>f[2].w=.2,f=>f[2].estimated=false,f=>f.pop(),f=>f[0].wall='right']){
  const custom=legacy();change(custom);assert.equal(migrateLegacyFloorBoxes(custom,room),custom);
 }
 const hidden=legacy();hidden.filter(f=>f.kind==='floorbox').forEach(f=>f.hidden=true);
 assert.ok(migrateLegacyFloorBoxes(hidden,room).filter(f=>f.kind==='floorbox').every(f=>f.hidden));
 const collision=[...walls,{...walls[1],id:'sink-port',offset:3}];
 assert.equal(classroomFloorBoxes(collision).at(-1).id,'sink-port-1');
});
