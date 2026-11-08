import test from 'node:test';
import assert from 'node:assert/strict';
import {sheetStops,sheetDestination} from '../dist/mobile-layout.js';

test('phone sheet keeps a stable grip and fits inside the usable workspace',()=>{
 for(const height of [250,390,649,749,929]){
  const {peek,half,full}=sheetStops(height);
  assert.equal(peek,84);
  assert.ok(half>=peek&&full>=half&&full<height,`${height}: ordered, bounded stops`);
 }
});
test('slow sheet gestures settle at the closest resting height',()=>{
 const stops=sheetStops(749);
 assert.equal(sheetDestination(110,0,stops),'peek');
 assert.equal(sheetDestination(370,.1,stops),'half');
 assert.equal(sheetDestination(630,0,stops),'full');
});
test('a deliberate upward or downward flick continues in its direction',()=>{
 const stops=sheetStops(749);
 assert.equal(sheetDestination(120,.8,stops),'half');
 assert.equal(sheetDestination(420,.8,stops),'full');
 assert.equal(sheetDestination(620,-.8,stops),'half');
 assert.equal(sheetDestination(320,-.8,stops),'peek');
});
test('short landscape sheets remain at their limit instead of flipping on a duplicate stop',()=>{
 const stops=sheetStops(250);
 assert.equal(stops.full,stops.half);
 assert.equal(sheetDestination(stops.full,1,stops),'half');
 assert.equal(sheetDestination(90,-1,stops),'peek');
});
