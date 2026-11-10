import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classroomFloorBoxes,migrateLegacyFloorBoxes,floorboxEdges,floorboxFromEdges} from '../dist/floor-boxes.mjs';
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

test('13 floor boxes use wall-to-edge and facing-edge gaps, including a 360cm door-wall clearance',()=>{
 const boxes=classroomFloorBoxes(walls),grid=boxes.slice(0,12);
 assert.equal(boxes.length,13);
 assert.deepEqual([...new Set(grid.map(f=>f.x))],[.93625,3.29875,5.66125,8.02375]);
 assert.deepEqual([...new Set(grid.map(f=>f.z))],[3.39,5.85,8.31]);
 for(let row=0;row<3;row++){
  near(floorboxEdges(grid[row*4]).minX,.81);
  near(room.w-floorboxEdges(grid[row*4+3]).maxX,.85);
  for(let col=1;col<4;col++)near(floorboxEdges(grid[row*4+col]).minX-floorboxEdges(grid[row*4+col-1]).maxX,2.11);
 }
 for(let row=1;row<3;row++)for(let col=0;col<4;col++)near(floorboxEdges(grid[row*4+col]).minZ-floorboxEdges(grid[(row-1)*4+col]).maxZ,2.28);
 near(.81+.85+4*grid[0].w+3*2.11,room.w);
 assert.ok(boxes.every(f=>f.estimated&&f.w===.2525&&f.depth===.18));
 near(floorboxEdges(boxes.at(-1)).minZ,1.3);assert.equal(boxes.at(-1).x,4.5);assert.equal(boxes.at(-1).name,'맞은편 벽 중앙 단자');
 for(const f of grid.slice(-4))near(room.d-floorboxEdges(f).maxZ,3.6);
 assert.ok(boxes.at(-1).z<grid[0].z,'single box is above all three rows when the door is below');
 assert.doesNotThrow(()=>validateFixtures([...walls,...boxes],room));
});

const previousThirteen=(layout=3)=>[...structuredClone(walls),...Array.from({length:12},(_,n)=>({
 id:`port${n}`,kind:'floorbox',name:`바닥 단자 ${n+1}`,estimated:true,
 x:(layout===3?[2.22,4.5,6.78]:layout===4?[1.08,3.36,5.64,7.92]:[.81,3.27,5.73,8.19])[n%(layout===3?3:4)],
 z:(layout===3?[.85,2.96,5.07,7.18]:layout===4?[4.18,6.29,8.4]:[3.73,6.02,8.31])[Math.floor(n/(layout===3?3:4))],w:.18,h:.015,depth:.18
})),{id:'front-center-port',kind:'floorbox',name:'맞은편 벽 중앙 단자',x:4.5,z:layout==='edges'?1.39:1.3,w:.18,h:.015,depth:.18,estimated:true}];

test('all three previous 13-box layouts update once and preserve facility edits, names and hidden boxes',()=>{
 for(const layout of [3,4,'edges']){
 const fixtures=previousThirteen(layout);
 fixtures[0].offset=6.9;fixtures[2].name='통신팀 확인';fixtures[3].hidden=true;
 const before=structuredClone(fixtures),updated=migrateLegacyFloorBoxes(fixtures,room),ports=updated.filter(f=>f.kind==='floorbox');
 assert.deepEqual(fixtures,before);assert.equal(ports.length,13);
 assert.equal(updated[0],fixtures[0]);assert.equal(updated[1],fixtures[1]);
 assert.equal(ports[0].name,'통신팀 확인');assert.equal(ports[1].hidden,true);
 assert.deepEqual(ports.map(f=>[f.id,f.x,f.z]),classroomFloorBoxes().map(f=>[f.id,f.x,f.z]));
 assert.ok(ports.every(f=>f.w===.2525&&f.depth===.18));
 assert.equal(migrateLegacyFloorBoxes(updated,room),updated);
 assert.doesNotThrow(()=>validateFixtures(updated,room));
 }
});

test('manual edits or deletions in any saved 13-box layout and other rooms are preserved',()=>{
 for(const layout of [3,4,'edges']){
 for(const edit of [f=>f[2].x+=.01,f=>f[2].depth=.2,f=>f[2].estimated=false,f=>f.at(-1).z=1.4,f=>f.pop(),f=>f.push({...f[2],id:'manual-port'}),f=>f[1].wall='front',f=>f.splice(1,1)]){
  const fixtures=previousThirteen(layout);edit(fixtures);assert.equal(migrateLegacyFloorBoxes(fixtures,room),fixtures);
 }
 }
 const fixtures=previousThirteen();assert.equal(migrateLegacyFloorBoxes(fixtures,{...room,w:12}),fixtures);
 const hidden=previousThirteen();hidden.filter(f=>f.kind==='floorbox').forEach(f=>f.hidden=true);
 assert.ok(migrateLegacyFloorBoxes(hidden,room).filter(f=>f.kind==='floorbox').every(f=>f.hidden));
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


test('real box sizes change the stored centres while preserving all measured edge gaps',()=>{
 for(const [w,depth]of [[.2,.3],[.185,.245],[.4,.4]]){
  const boxes=classroomFloorBoxes(walls,room,{w,depth,estimated:false}),grid=boxes.slice(0,12);
  assert.ok(boxes.every(f=>f.w===w&&f.depth===depth&&!f.estimated));
  for(const f of grid.slice(-4))near(room.d-floorboxEdges(f).maxZ,3.6);
  for(let r=0;r<3;r++)for(let c=1;c<4;c++)near(floorboxEdges(grid[r*4+c]).minX-floorboxEdges(grid[r*4+c-1]).maxX,2.11);
  for(let r=1;r<3;r++)for(let c=0;c<4;c++)near(floorboxEdges(grid[r*4+c]).minZ-floorboxEdges(grid[(r-1)*4+c]).maxZ,2.28);
  near(floorboxEdges(boxes.at(-1)).minZ,1.3);
  near(floorboxEdges(grid[0]).minX,.81);
  near(room.w-floorboxEdges(grid[3]).maxX,room.w-.81-4*w-3*2.11);
  assert.doesNotThrow(()=>validateFixtures([...walls,...boxes],room));
 }
 for(const size of [{w:NaN},{depth:0},{w:1},{depth:3}])assert.throws(()=>classroomFloorBoxes(walls,room,size));
});

test('corner editing converts to centres once and resizing preserves the entered near corner',()=>{
 const original={x:2,z:3,w:.18,depth:.18},before=structuredClone(original);
 const placed=floorboxFromEdges({...original,w:.28,depth:.34},.72,3.64);
 near(placed.x,.86);near(placed.z,3.81);
 near(floorboxEdges(placed).minX,.72);near(floorboxEdges(placed).minZ,3.64);
 assert.deepEqual(original,before);
});
