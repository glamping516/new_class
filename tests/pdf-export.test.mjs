import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pdfPageLayout,pdfFromJpeg} from '../dist/pdf-export.mjs';
test('PDF fits portrait and landscape drawings on A4 or A3 without distortion',()=>{
 for(const [w,h] of [[900,1200],[2400,1740]])for(const paper of ['a4','a3']){
  const p=pdfPageLayout(w,h,paper);assert.ok(Math.abs(p.w/p.h-w/h)<1e-9);assert.ok(p.x>=22.67&&p.y>=22.67);assert.equal(p.pageW>p.pageH,w>h);
 }
 assert.throws(()=>pdfPageLayout(0,100));
});
test('PDF byte offsets address the correct objects even with binary image data',()=>{
 const jpeg=new Uint8Array([255,216,128,240,0,255,217]),bytes=pdfFromJpeg(jpeg,2400,1740),text=new TextDecoder('latin1').decode(bytes);
 const xref=Number(text.match(/startxref\n(\d+)/)[1]);assert.equal(new TextDecoder().decode(bytes.slice(xref,xref+4)),'xref');
 const entries=text.slice(text.indexOf('xref\n')).split('\n').slice(3,8);
 entries.forEach((line,n)=>{const offset=Number(line.slice(0,10));assert.equal(new TextDecoder().decode(bytes.slice(offset,offset+7)),`${n+1} 0 obj`);});
 assert.match(text,/\/Length 7/);assert.match(text,/\/Count 1/);assert.throws(()=>pdfFromJpeg(new Uint8Array([0,1,2]),1,1));
});
