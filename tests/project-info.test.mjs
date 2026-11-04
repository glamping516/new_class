import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PROJECT_INFO,MAKER_CREDIT,readProjectInfo,projectFileStem} from '../dist/project-info.mjs';

test('older layouts retain their saved title and receive defaults for new header fields',()=>{
 assert.deepEqual(readProjectInfo({version:2,title:'상담실 배치안'}),{...DEFAULT_PROJECT_INFO,title:'상담실 배치안'});
 assert.deepEqual(readProjectInfo(),DEFAULT_PROJECT_INFO);
});
test('project names and optional status survive round trips while maker credit stays fixed',()=>{
 const info={projectLabel:MAKER_CREDIT,title:'이전 <배치안> & B',planLabel:'검토 중'};
 const stored=JSON.parse(JSON.stringify({version:2,...info,items:[]}));assert.deepEqual(readProjectInfo(stored),info);
 assert.deepEqual(readProjectInfo({...stored,projectLabel:'임의 변경',planLabel:''}),{...info,planLabel:''});
});
test('header lengths and filenames are safe without changing the project name',()=>{
 const info=readProjectInfo({title:'김천/교육장:A',projectLabel:'가'.repeat(100),planLabel:'나'.repeat(100)});
 assert.equal(info.projectLabel,MAKER_CREDIT);assert.equal(info.planLabel.length,30);assert.equal(info.title,'김천/교육장:A');assert.equal(projectFileStem(info),'김천_교육장_A');
 assert.equal(readProjectInfo({title:'  \n '}).title,DEFAULT_PROJECT_INFO.title);
});
