import {CATALOG,isDesk} from './furniture.mjs';
import {bounds,corners,dimsOf} from './geometry.mjs';
import {deskCornerMeasurements,hasDeskCorners} from './desk-corners.mjs';
import {wallCornerMeasurements,fixedWallMeasurementItems} from './wall-corners.mjs';
import {tapePlan,tapeLabelLayout,uniqueMeasurements,dimensionKey,objectPairMeasurement,nearestWallReferences} from './tape-plan.mjs';
import {floorboxRecords} from './construction-data.mjs';

export const cadNumber=value=>Number((value*100).toFixed(2)).toLocaleString('ko-KR',{maximumFractionDigits:2});
export const cadEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xy=p=>({x:p.x*100,y:p.z*100});
export function fixturePlan(f,room){
 if(f.kind==='floorbox')return{x:f.x,z:f.z,angle:0};
 const center=f.offset+f.w/2;
 return f.wall==='front'?{x:center,z:0,angle:0}:f.wall==='back'?{x:center,z:room.d,angle:Math.PI}:f.wall==='left'?{x:0,z:center,angle:Math.PI/2}:{x:room.w,z:center,angle:-Math.PI/2};
}
export function cadPlanData(state,catalog=CATALOG){
 const items=[];
 for(const [index,item]of state.items.entries()){
  const spec=catalog.find(c=>c.type===item.type);if(!spec||item.hidden)continue;
  const dims=dimsOf(item,catalog),polygon=corners(item,catalog),box=bounds(item,catalog),round=['roundTable','stool'].includes(spec.model)||(spec.model==='bin'&&spec.style==='pedal');
  items.push({...item,code:(isDesk(item.type)?'D':hasDeskCorners(item,catalog)?'T':'G')+String(index+1).padStart(2,'0'),name:item.name||spec.name,dims,polygon,box,round,wallMounted:!!spec.wallMounted||spec.category==='wallcover',raised:(item.y||0)>.05,desk:hasDeskCorners(item,catalog)});
 }
 const wallItems=[...items.filter(i=>catalog.find(c=>c.type===i.type)?.category!=='wallcover'),...fixedWallMeasurementItems(state.fixtures,state.room)],records=floorboxRecords(state,{includeHidden:false}),fixtures=state.fixtures.filter(f=>!f.hidden&&f.kind!=='floorbox').map(f=>({...f,...fixturePlan(f,state.room)}));
 return{room:{...state.room},items,records,fixtures,tape:tapePlan(state,catalog),corners:deskCornerMeasurements(state.items,catalog),walls:wallCornerMeasurements(wallItems,state.room,catalog)};
}

// A self-contained vector drawing. UI controls and the inventory are never
// placed inside this SVG, so all export formats contain the plan only.
export function cadDrawing(state,options={},catalog=CATALOG){
 const o={labels:true,dimensions:true,walls:true,terminals:true,grid:false,sizes:false,theme:'paper',selectedId:null,scope:'all',wallDirection:'all',detail:false,pairFrom:null,pairTo:null,...options},data=cadPlanData(state,catalog),selected=data.tape.objects.find(i=>i.id===o.selectedId),w=state.room.w*100,d=state.room.d*100;
 const ink=o.theme==='blueprint'?{bg:'#10283d',wall:'#d3edf9',item:'#b7d9e9',desk:'#f0f9ff',fill:'#17374e',dim:'#70d1df',wallDim:'#9eb9ce',muted:'#92adbf',grid:'#1d3d53',select:'#ffd08a',port:'#e5bd77'}:{bg:'#fff',wall:'#27333e',item:'#6d7e8b',desk:'#293b48',fill:'#f6f8f9',dim:'#266d87',wallDim:'#73838d',muted:'#77838e',grid:'#edf0f3',select:'#bd6538',port:'#956a38'};
 const output=[],occupied=[],extents=[{x:-130,y:-140},{x:w+145,y:d+150}];
 const path=(a,b)=>`M${a.x} ${a.y}L${b.x} ${b.y}`;
 const line=(a,b,color=ink.dim,extra='')=>`<path d="${path(a,b)}" stroke="${color}" ${extra}/>`;
 const text=(p,value,{color=ink.muted,size=12,anchor='middle',weight=500,extra=''}={})=>`<text x="${p.x}" y="${p.y}" fill="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" ${extra}>${cadEscape(value)}</text>`;
 const halo=`stroke="${ink.bg}" stroke-width="5" paint-order="stroke" stroke-linejoin="round"`;
 const addRect=(x,y,width,height)=>occupied.push({x,y,w:width,h:height});
 const intersects=(a,b)=>a.x<b.x+b.w+3&&a.x+a.w>b.x-3&&a.y<b.y+b.h+3&&a.y+a.h>b.y-3;
 const label=(a,b,value,color,{at,normal,size=12.5}={})=>{
  const cx=at?.x??(a.x+b.x)/2,cy=at?.y??(a.y+b.y)/2,len=Math.hypot(b.x-a.x,b.y-a.y)||1,n=normal??{x:-(b.y-a.y)/len,y:(b.x-a.x)/len},tw=String(value).length*size*.58+6;let p={x:cx+n.x*11,y:cy+n.y*11},box;
  for(const shift of [11,-11,25,-25,40,-40,55,-55]){const q={x:cx+n.x*shift,y:cy+n.y*shift},r={x:q.x-tw/2,y:q.y-12,w:tw,h:17};p=q;box=r;if(!occupied.some(b=>intersects(r,b)))break;}
  occupied.push(box);extents.push({x:box.x,y:box.y},{x:box.x+box.w,y:box.y+box.h});
  if(Math.hypot(p.x-cx,p.y-cy)>18)output.push(line({x:cx,y:cy},{x:p.x,y:p.y-3},color,'stroke-width=".65" opacity=".5"'));
  output.push(text(p,value,{color,size,weight:600,extra:halo}));
 };
 const dimension=(a,b,value,color=ink.dim,{witnesses=false,wallCorner=null}={})=>{
  const length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/(length||1),dy=(b.y-a.y)/(length||1),tx=-dy*3.2,ty=dx*3.2;
  extents.push(a,b);output.push(line(a,b,color,wallCorner?'stroke-width=".6" stroke-dasharray="3 3" opacity=".45"':'stroke-width=".85"'));
  for(const p of [a,b])output.push(line({x:p.x-tx-dx*2,y:p.y-ty-dy*2},{x:p.x+tx+dx*2,y:p.y+ty+dy*2},color,'stroke-width="1.1"'));
  if(witnesses)for(const p of [a,b])output.push(`<circle cx="${p.x}" cy="${p.y}" r="1.9" fill="${color}" stroke="none"/>`);
  if(value===null)return;
  if(wallCorner){const dir=({front:{x:0,y:-1},back:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}})[wallCorner.wall],step=Math.min(18,length/2);label(a,b,value,color,{at:{x:a.x+dir.x*step,y:a.y+dir.y*step},normal:{x:-dir.y,y:dir.x},size:10.5});}else label(a,b,value,color);
 };
 const offsetDimension=(a,b,offset,value,color=ink.wallDim)=>{
  const horizontal=Math.abs(a.y-b.y)<1e-6,p=horizontal?{x:a.x,y:a.y+offset}:{x:a.x+offset,y:a.y},q=horizontal?{x:b.x,y:b.y+offset}:{x:b.x+offset,y:b.y};
  output.push(line(a,p,color,'stroke-width=".55"'),line(b,q,color,'stroke-width=".55"'));dimension(p,q,value,color,{witnesses:true});
 };
 // Reserve the code labels before placing any dimensions.
 for(const i of data.items)if(o.labels){const p=xy(i);addRect(p.x-26,p.y-12,52,i.dims[1]<.18?17:30);}
 if(o.terminals)for(const f of data.records){const p=xy(f);addRect(p.x-13,p.y-29,26,18);}
 if(o.grid){output.push('<g stroke-width=".5">');for(let x=45;x<w;x+=45)output.push(line({x,y:0},{x,y:d},ink.grid));for(let y=45;y<d;y+=45)output.push(line({x:0,y},{x:w,y},ink.grid));output.push('</g>');}
 output.push(`<rect x="-5" y="-5" width="${w+10}" height="${d+10}" fill="none" stroke="${ink.wall}" stroke-width="9"/><rect x="0" y="0" width="${w}" height="${d}" fill="none" stroke="${ink.wall}" stroke-width=".8"/>`);
 for(const f of data.fixtures){
  const p=xy(f),width=f.w*100,depth=f.depth*100,rotation=-f.angle*180/Math.PI;
  output.push(`<g transform="translate(${p.x} ${p.y}) rotate(${rotation})" fill="none" stroke="${ink.item}" stroke-width="1.1"><title>${cadEscape(f.name+(f.estimated?' · 추정':''))}</title>`);
  if(f.kind==='door')output.push(`<path d="M${-width/2} 0H${width/2}" stroke="${ink.bg}" stroke-width="14"/><path d="M${-width/2} 0V${width}" stroke="${ink.wall}" stroke-width="1.8"/><path d="M${width/2} 0A${width} ${width} 0 0 1 ${-width/2} ${width}" stroke-dasharray="4 3"/>`);
  else if(f.kind==='window')output.push(`<rect x="${-width/2}" y="-6" width="${width}" height="12" fill="${ink.bg}" stroke="${ink.wall}"/><path d="M${-width/2} 0H${width/2}M0 -6V6"/>`);
  else {output.push(`<rect x="${-width/2}" y="0" width="${width}" height="${depth}" fill="${ink.fill}" stroke="${ink.wall}"/>`);if(f.kind==='sink')output.push(`<rect x="${-width*.36}" y="${depth*.2}" width="${width*.34}" height="${depth*.6}" rx="3"/><circle cx="${-width*.19}" cy="${depth*.5}" r="3"/>`);}
  output.push('</g>');
  const inward={x:Math.sin(f.angle),y:Math.cos(f.angle)},labelPoint={x:p.x+inward.x*(f.kind==='door'?24:depth+14),y:p.y+inward.y*(f.kind==='door'?24:depth+14)};
  output.push(text(labelPoint,f.name,{size:10,extra:halo}));
 }
 for(const i of data.items){
  const p=xy(i),iw=i.dims[0]*100,id=i.dims[1]*100,chosen=i.id===o.selectedId||i.id===o.pairFrom||i.id===o.pairTo,color=chosen?ink.select:i.desk?ink.desk:ink.item;
  output.push(`<g data-cad-item="${cadEscape(i.id)}" tabindex="0" role="button" aria-label="${cadEscape(i.code+' '+i.name+' 도면 선택')}" style="cursor:pointer"><title>${cadEscape(i.code+' '+i.name+' · '+i.dims.map(cadNumber).join(' × ')+'cm')}</title><g transform="translate(${p.x} ${p.y}) rotate(${-(i.rot||0)})" stroke="${color}" fill="${ink.fill}" stroke-width="${chosen?2.4:i.desk?1.6:1}" ${i.raised||i.wallMounted?'stroke-dasharray="5 3"':''}>`);
  output.push(i.round?`<ellipse cx="0" cy="0" rx="${iw/2}" ry="${id/2}"/>`:`<rect x="${-iw/2}" y="${-id/2}" width="${iw}" height="${Math.max(.8,id)}"/>`);
  if(i.desk&&iw>40&&id>25)output.push(`<path d="M${-iw/2+5} ${-id/2+5}H${iw/2-5}" fill="none" opacity=".55"/>`);
  output.push('</g>');
  if(o.labels&&(!data.tape.references.some(r=>r.id===i.id&&(r.panel||o.walls))||o.detail)){const narrow=id<18,q={x:p.x,y:p.y+(narrow?-12:0)};output.push(text(q,i.code,{size:13.5,color,weight:700,extra:halo}));if(!narrow&&iw>65)output.push(text({x:p.x,y:p.y+14},i.name.length>12?i.name.slice(0,11)+'…':i.name,{size:9.5,color,extra:halo}));}
  if(o.sizes){const a=xy(i.polygon[0]),b=xy(i.polygon[1]),c=xy(i.polygon[2]);label(a,b,cadNumber(i.dims[0]),ink.muted);label(b,c,cadNumber(i.dims[1]),ink.muted);}
  if(chosen)i.polygon.forEach((corner,n)=>{const q=xy(corner),dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,t={x:q.x+dx/length*12,y:q.y+dy/length*12};output.push(line(q,t,ink.select,'stroke-width=".7"'),`<circle cx="${t.x}" cy="${t.y-3}" r="7" fill="${ink.bg}" stroke="${ink.select}" stroke-width=".8"/>`,text({x:t.x,y:t.y},String(n+1),{size:9,color:ink.select,weight:600}));});
  output.push('</g>');
 }
 if(o.terminals||!o.detail)for(const f of data.records){const p=xy(f),iw=f.w*100,id=f.depth*100;output.push(`<g data-cad-item="terminal-${cadEscape(f.id)}" tabindex="0" role="button" aria-label="단자함 ${f.code} 도면 선택" fill="none" stroke="${ink.port}" stroke-width="1"><rect x="${p.x-iw/2}" y="${p.y-id/2}" width="${iw}" height="${id}"/><path d="M${p.x-4} ${p.y}H${p.x+4}M${p.x} ${p.y-4}V${p.y+4}"/><path d="M${p.x} ${p.y-id/2}V${p.y-19}" stroke-width=".6"/></g>`,'');}
 const pair=objectPairMeasurement(data.tape.objects.find(i=>i.id===o.pairFrom),data.tape.objects.find(i=>i.id===o.pairTo),catalog);
 const visibleCorners=o.dimensions?(o.detail&&selected?data.corners.filter(m=>m.from===selected.id||m.to===selected.id):data.tape.measurements):[];
 for(const m of uniqueMeasurements(visibleCorners).filter(m=>!pair||dimensionKey(m)!==dimensionKey(pair)))dimension(xy(m.a),xy(m.b),m.hideLabel?null:(m.overlapping?'겹침 · ':m.label&&m.kind!=='desk-corner'?m.label+' ':'')+cadNumber(m.distance),m.overlapping?'#b35d42':ink.dim,{witnesses:true});
 const visibleWalls=o.detail&&selected&&o.walls?data.walls.filter(m=>m.from===selected.id&&(o.wallDirection==='all'||m.wall===o.wallDirection)):[];
 for(const m of visibleWalls){if(selected&&nearestWallReferences(selected,state.room,catalog).some(r=>dimensionKey(r)===dimensionKey(m)))continue;output.push(`<g class="cad-wall-corner" data-from="${cadEscape(m.from)}" data-wall="${m.wall}" data-corner="${m.corner??'edge'}"><title>${cadEscape(m.objectName+' · '+m.label+' · '+cadNumber(m.distance)+'cm')}</title>`);dimension(xy(m.a),xy(m.b),m.wallCode+' '+cadNumber(m.distance),ink.wallDim,{witnesses:true,wallCorner:m});output.push('</g>');}
 const refsPlan=selected&&!data.tape.references.some(i=>i.id===selected.id)?{...data.tape,references:[...data.tape.references,{...selected,refs:nearestWallReferences(selected,state.room,catalog)}]}:data.tape;
 const references=tapeLabelLayout(refsPlan,(x,z)=>xy({x,z}),{selectedIds:o.scope==='selected'&&selected?[selected.id]:[],ordinary:o.walls,fontSize:10.5,occupied});
 const referenceLanes=new Map(),referenceDimensions=uniqueMeasurements(references.flatMap(r=>r.item.refs.map(m=>({...m,referenceCode:r.item.code}))));
 for(const r of references){const {item}=r,color=item.panel?ink.port:ink.wallDim;output.push(`<g class="cad-tape-reference" data-reference="${cadEscape(item.id)}" data-panel="${!!item.panel}"><title>${cadEscape(item.name)}</title>`);for(const m of referenceDimensions.filter(m=>m.from===item.id)){output.push(`<g class="cad-reference-dimension" data-wall="${m.wall}">`);const horizontal=['left','right'].includes(m.wall),key=m.wall+':'+(horizontal?m.a.z:m.a.x).toFixed(4),lane=referenceLanes.get(key)||0;referenceLanes.set(key,lane+1);offsetDimension(xy(m.a),xy(m.b),[8,-8,22,-22,36,-36][lane%6],m.referenceCode+' · '+m.wallCode+' '+cadNumber(m.distance)+'cm',color);output.push('</g>');}output.push('</g>');}
 if(o.dimensions)for(const cue of data.tape.cues){output.push(`<g class="cad-tape-cue" data-cue="${cue.key}">`);const row=cue.kind==='row',n=Number(cue.key.split('-')[1])-1;offsetDimension(xy(cue.a),xy(cue.b),-((row?cue.a.x:cue.a.z)*100+22+n*14),cue.text+'cm',ink.dim);output.push('</g>');}
 if(pair){output.push(`<g class="cad-pair-distance" data-from="${cadEscape(pair.from)}" data-to="${cadEscape(pair.to)}">`);dimension(xy(pair.a),xy(pair.b),(pair.overlapping?'겹침 · ':'A↔B ')+cadNumber(pair.distance)+'cm',ink.select,{witnesses:true});output.push('</g>');}
 // Opening positions and widths form a CAD-style chain along each wall.
 if(o.detail)for(const wall of ['front','back','left','right']){
  const holes=data.fixtures.filter(f=>f.wall===wall&&['door','window'].includes(f.kind));if(!holes.length)continue;
  const horizontal=['front','back'].includes(wall),length=horizontal?w:d,stops=[...new Set([0,length,...holes.flatMap(f=>[f.offset*100,(f.offset+f.w)*100])])].sort((a,b)=>a-b);
  for(let n=1;n<stops.length;n++){const a=horizontal?{x:stops[n-1],y:wall==='front'?0:d}:{x:wall==='left'?0:w,y:stops[n-1]},b=horizontal?{x:stops[n],y:a.y}:{x:a.x,y:stops[n]};offsetDimension(a,b,wall==='front'||wall==='left'?-44:44,Number((stops[n]-stops[n-1]).toFixed(2)));}
 }
 offsetDimension({x:0,y:0},{x:w,y:0},-92,cadNumber(state.room.w));
 offsetDimension({x:w,y:0},{x:w,y:d},96,cadNumber(state.room.d));
 output.push(text({x:w/2,y:d+142},'정/후/좌/우 = 정면/후면/왼쪽/오른쪽 벽',{size:9}));
 output.push(text({x:w/2,y:-120},'정면벽 · Z=0',{size:12,color:ink.wall}),text({x:w/2,y:d+85},'후면벽',{size:11}),text({x:-35,y:d/2},'왼쪽벽 · X=0',{size:10,extra:`transform="rotate(-90 -35 ${d/2})"`}));
 // A scale bar is useful after a PDF is resized; printed dimensions remain
 // authoritative, so the drawing never claims a fixed paper scale.
 const bar={x:0,y:d+120};output.push(`<g stroke="${ink.wall}" stroke-width="1.2"><path d="M0 ${bar.y-4}V${bar.y+4}M0 ${bar.y}H100M100 ${bar.y-4}V${bar.y+4}M50 ${bar.y-3}V${bar.y+3}"/></g>`,text({x:50,y:bar.y-8},'1m',{size:10,color:ink.wall}),text({x:w,y:bar.y},'단위 cm · 모서리 기준',{anchor:'end',size:11,color:ink.wall}));
 const minX=Math.min(...extents.map(p=>p.x)),minY=Math.min(...extents.map(p=>p.y)),maxX=Math.max(...extents.map(p=>p.x)),maxY=Math.max(...extents.map(p=>p.y)),viewBox={x:minX,y:minY,w:maxX-minX,h:maxY-minY};
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}" width="${viewBox.w}" height="${viewBox.h}" role="img" aria-label="가구 끝모서리 치수를 표시한 CAD 배치도" style="font-family:Arial,'Malgun Gothic','Noto Sans KR',sans-serif"><rect x="${minX}" y="${minY}" width="${viewBox.w}" height="${viewBox.h}" fill="${ink.bg}"/><g fill="none" stroke-linecap="square" stroke-linejoin="miter">${output.join('')}</g></svg>`;
 return{svg,viewBox,data,visibleCorners,visibleWalls,references,pair,background:ink.bg};
}
