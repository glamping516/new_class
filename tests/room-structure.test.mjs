import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newFixture,validateRoom,validateFixtures,fitFixturesToRoom} from '../dist/room-structure.mjs';
const room={w:9,d:12,h:2.7};
test('added openings find free wall space and reject a full wall',()=>{
 const a=newFixture('window','left',room,[],'one'),b=newFixture('door','left',room,[a],'two');
 assert.ok(b.offset>=a.offset+a.w+.1);assert.doesNotThrow(()=>validateFixtures([a,b],room));
 assert.throws(()=>newFixture('door','front',{w:3,d:3,h:2.7},[{...a,wall:'front',offset:0,w:2.9}],'three'),/여유/);
});
test('sink width and depth round trip and are checked against room boundaries',()=>{
 const sink={...newFixture('sink','right',room,[],'sink'),w:1.8,depth:.7};
 assert.deepEqual(validateFixtures(JSON.parse(JSON.stringify([sink])),room),[sink]);
 assert.throws(()=>validateFixtures([{...sink,depth:NaN}],room),/깊이/);
 assert.throws(()=>validateFixtures([{...sink,offset:11}],room),/벽 범위/);
});
test('room shrinking keeps fixture sizes and moves positions inside new walls',()=>{
 const small={w:5,d:6,h:2.4},sink={...newFixture('sink','back',room,[],'sink'),offset:7.2};
 const port={...newFixture('floorbox','front',room,[],'port'),x:8,z:11};
 const fitted=fitFixturesToRoom([sink,port],small);
 assert.equal(fitted[0].w,sink.w);assert.equal(fitted[0].offset,3.8);assert.equal(fitted[1].x,5);assert.equal(fitted[1].z,6);
 assert.doesNotThrow(()=>validateFixtures(fitted,small));assert.throws(()=>validateRoom({...small,w:NaN}));
});
test('overlapping openings and duplicate IDs cannot become saved layouts',()=>{
 const a=newFixture('door','back',room,[],'one'),b={...newFixture('window','back',room,[a],'two'),offset:a.offset+.1};
 assert.throws(()=>validateFixtures([a,b],room),/겹칩니다/);
 assert.throws(()=>validateFixtures([a,{...b,id:a.id}],room),/식별자/);
});
