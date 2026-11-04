const encode=text=>new TextEncoder().encode(text);
export function pdfPageLayout(width,height,paper='a4'){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('도면 크기가 올바르지 않습니다.');
 const size=paper==='a3'?[841.89,1190.55]:[595.28,841.89],landscape=width>height;
 const [pageW,pageH]=landscape?[size[1],size[0]]:size,margin=22.68;
 const scale=Math.min((pageW-margin*2)/width,(pageH-margin*2)/height),w=width*scale,h=height*scale;
 return{pageW,pageH,w,h,x:(pageW-w)/2,y:(pageH-h)/2};
}
// A single-page PDF embeds the rendered drawing as a high-resolution JPEG.
// Baking Korean labels into the image avoids missing fonts on other computers.
export function pdfFromJpeg(jpeg,width,height,paper='a4'){
 if(!(jpeg instanceof Uint8Array)||jpeg.length<4||jpeg[0]!==255||jpeg[1]!==216)throw new Error('PDF에 넣을 도면 이미지를 만들 수 없습니다.');
 const p=pdfPageLayout(width,height,paper),chunks=[],offsets=[0];let length=0;
 const add=data=>{const bytes=typeof data==='string'?encode(data):data;chunks.push(bytes);length+=bytes.length;};
 const object=(n,body)=>{offsets[n]=length;add(`${n} 0 obj\n${body}\nendobj\n`);};
 add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.pageW} ${p.pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
 offsets[4]=length;add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add('\nendstream\nendobj\n');
 const commands=`q\n${p.w.toFixed(4)} 0 0 ${p.h.toFixed(4)} ${p.x.toFixed(4)} ${p.y.toFixed(4)} cm\n/Im0 Do\nQ\n`;
 object(5,`<< /Length ${encode(commands).length} >>\nstream\n${commands}endstream`);
 const xref=length;add('xref\n0 6\n0000000000 65535 f \n');
 for(let n=1;n<=5;n++)add(String(offsets[n]).padStart(10,'0')+' 00000 n \n');
 add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
 const bytes=new Uint8Array(length);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return bytes;
}
