import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,syncFullHeightWall} from '../dist/furniture.mjs';
test('ceiling-height walls keep custom width and thickness while following resized or imported rooms',()=>{
 const wall=syncFullHeightWall({type:'fullHeightWall',dims:[2.4,.12,2.7],y:.5},{h:3.2});
 assert.deepEqual(wall.dims,[2.4,.12,3.2]);assert.equal(wall.y,0);
 const restored=syncFullHeightWall(JSON.parse(JSON.stringify(wall)),{h:2.4});assert.deepEqual(restored.dims,[2.4,.12,2.4]);
 assert.equal(CATALOG.find(c=>c.type==='fullHeightWall').category,'partition');
 const chair={type:'chair',dims:[.5,.5,.8],y:0};assert.equal(syncFullHeightWall(chair,{h:3}),chair);assert.equal(chair.dims[2],.8);
});
