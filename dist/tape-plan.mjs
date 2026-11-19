import {CATALOG,isDesk} from './furniture.mjs';
import {bounds,corners,dimsOf,wallGaps} from './geometry.mjs';
import {wallCornerMeasurements,fixedWallMeasurementItems} from './wall-corners.mjs';
import {floorboxRecords} from './construction-data.mjs';
import {hasDeskCorners} from './desk-corners.mjs';
import {deskCornerMeasurements,deskPairCorners} from './desk-corners.mjs';

export const tapeCm=v=>Number((v*100).toFixed(2)).toLocaleString('ko-KR',{maximumFractionDigits:2});
const roundSpec=c=>['roundTable','stool'].includes(c?.model)||(c?.model==='bin'&&c.style==='pedal');
export function measurementObjects(state,catalog=CATALOG){
 const items=state.items.flatMap((i,n)=>{const c=catalog.find(c=>c.type===i.type);if(!c||i.hidden)return[];return[{...i,dims:dimsOf(i,catalog),code:(isDesk(i.type)?'D':hasDeskCorners(i,catalog)?'T':'G')+String(n+1).padStart(2,'0'),name:i.name||c.name,panel:c.category==='partition'||c.category==='wallcover'||c.wallMounted===true,round:roundSpec(c)}];});
 const fixed=fixedWallMeasurementItems(state.fixtures,state.room).map((i,n)=>({...i,code:'P'+(n+1),panel:true}));
 const terminals=floorboxRecords(state,{includeHidden:false}).map(f=>({id:'terminal-'+f.id,fixtureId:f.id,type:'fixed',code:f.code,name:'단자함 '+f.code,x:f.x,z:f.z,rot:0,dims:[f.w,f.depth,.015],panel:true,terminal:true}));
 return[...items,...fixed,...terminals];
}
export function nearestWallReferences(item,room,catalog=CATALOG){
 const all=wallGaps(item,room,catalog),x=all[0].distance<=all[1].distance?all[0]:all[1],z=all[2].distance<=all[3].distance?all[2]:all[3];
 return[x,z].map(g=>{
  const probe=catalog.find(c=>c.type===item.type)?.category==='wallcover'?{...item,type:'fixed',dims:dimsOf(item,catalog)}:item,candidates=wallCornerMeasurements([probe],room,catalog,{walls:[g.wall]}),minimum=Math.min(...candidates.map(m=>m.distance)),other=g===x?z:x,axis=g===x?'z':'x',target=other.wall==='right'?room.w:other.wall==='back'?room.d:0;
  return candidates.filter(m=>Math.abs(m.distance-minimum)<1e-7).sort((a,b)=>Math.abs(a.a[axis]-target)-Math.abs(b.a[axis]-target))[0];
 }).filter(Boolean);
}

// Only a truly repeated rectangular desk grid can share tape references.
// Uneven or rotated desks keep their own two wall references instead.
export function tapeDeskGrid(items,room,catalog=CATALOG){
 const desks=items.filter(i=>i.type==='computerDesk'&&!i.hidden&&(i.y||0)<.05);
 if(desks.length<4||desks.some(i=>Math.abs(Math.sin((i.rot||0)*Math.PI/180))>1e-7))return null;
 const rows=[];
 for(const i of [...desks].sort((a,b)=>a.z-b.z||a.x-b.x)){
  let row=rows.at(-1);if(!row||Math.abs(row.z-i.z)>1e-7){row={z:i.z,items:[]};rows.push(row);}row.items.push(i);
 }
 if(rows.length<2||rows[0].items.length<2)return null;
 const signature=row=>row.items.map(i=>{const b=bounds(i,catalog);return[b.minX,b.maxX,b.maxZ-b.minZ].map(v=>v.toFixed(6)).join('/');}).join('|');
 if(rows.some(r=>r.items.length!==rows[0].items.length||signature(r)!==signature(rows[0])))return null;
 const columns=rows[0].items.map((i,n)=>({number:n+1,...bounds(i,catalog)}));
 const result=rows.map((r,n)=>{const b=r.items.map(i=>bounds(i,catalog));return{number:n+1,front:Math.min(...b.map(i=>i.minZ)),back:Math.max(...b.map(i=>i.maxZ)),ids:r.items.map(i=>i.id)};});
 const maxX=columns.at(-1).maxX,lane=Math.min(room.w-.12,maxX+.28),measurements=[];
 for(let n=1;n<result.length;n++){const a=result[n-1],b=result[n],gap=b.front-a.back;measurements.push({key:`tape-row-${n}`,kind:'row',rowKind:'gap',label:`${n}–${n+1}행`,a:{x:lane,z:a.back},b:{x:lane,z:b.front},distance:Math.max(0,gap),overlap:Math.max(0,-gap)});}
 for(let n=1;n<columns.length;n++){const a=columns[n-1],b=columns[n],z=result[0].front-.25;measurements.push({key:`tape-column-${n}`,kind:'object',label:`${n}–${n+1}열`,a:{x:a.maxX,z},b:{x:b.minX,z},distance:Math.max(0,b.minX-a.maxX)});}
 return{rows:result,columns,ids:desks.map(i=>i.id),measurements};
}
// Physical endpoints define duplication; equal numbers at different positions do not.
export function dimensionKey(m){const point=p=>[p.x,p.z].map(v=>Math.round(v*1e6)).join(',');return[m.wall||'gap',... [point(m.witnessA||m.a),point(m.witnessB||m.b)].sort(),Math.round(m.distance*1e6)].join('|');}
export function uniqueMeasurements(measurements){
 const seen=new Map();for(const m of [...measurements].sort((a,b)=>(b.kind==='pair')-(a.kind==='pair'))){const key=dimensionKey(m),existing=seen.get(key);if(existing){if(m.referenceCode)existing.referenceCode=[...new Set((existing.referenceCode||'').split('/').filter(Boolean).concat(m.referenceCode.split('/')))].join('/');continue;}seen.set(key,{...m});}return[...seen.values()];
}
export function practicalDeskGaps(items,catalog=CATALOG){
 const pairs=new Map();for(const m of deskCornerMeasurements(items,catalog)){if(!pairs.has(m.pairKey))pairs.set(m.pairKey,[]);pairs.get(m.pairKey).push(m);}
 const measurements=[];for(const ends of pairs.values()){const same=ends.length===2&&Math.abs(ends[0].distance-ends[1].distance)<1e-6;for(const m of same?ends.slice(0,1):ends)measurements.push({...m,kind:'desk-gap',label:(m.axis==='x'?'가로':'세로')+(same?'':' · '+m.endLabel)});}
 const groups=new Map();for(const m of measurements){const lane=m.axis==='x'?m.a.z:m.a.x,key=[m.axis,Math.round(lane*1e6),Math.round(m.distance*1e6),m.overlapping].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}
 for(const group of groups.values())if(group.length>1){group[0].label+=' · '+group.length+'곳 동일';for(const m of group.slice(1))m.hideLabel=true;}
 return measurements;
}
export function tapePlan(state,catalog=CATALOG){
 const objects=measurementObjects(state,catalog),grid=tapeDeskGrid(state.items,state.room,catalog),grouped=new Set(grid?.ids||[]);
 const references=objects.filter(i=>!grouped.has(i.id)).map(i=>({...i,refs:nearestWallReferences(i,state.room,catalog)}));
 const cues=[];
 if(grid){for(const r of grid.rows.slice(0,1))cues.push({key:'row-'+r.number,x:grid.columns[0].minX-.25,z:r.front,text:`${r.number}행 · 정 ${tapeCm(r.front)}`,kind:'row',align:'end'});for(const c of grid.columns.slice(0,1))cues.push({key:'col-'+c.number,x:c.minX,z:grid.rows[0].front-.48,text:`${c.number}열 · 좌 ${tapeCm(c.minX)}`,kind:'column',align:'start'});}
 for(const cue of cues){const row=cue.kind==='row',n=Number(cue.key.split('-')[1])-1;cue.a=row?{x:grid.columns[0].minX,z:0}:{x:0,z:grid.rows[0].front};cue.b=row?{x:grid.columns[0].minX,z:grid.rows[n].front}:{x:grid.columns[n].minX,z:grid.rows[0].front};cue.distance=row?cue.b.z:cue.b.x;}
 return{objects,grid,references,cues,measurements:practicalDeskGaps(state.items,catalog)};
}

function footprint(i,catalog){
 if(!i.round&&!roundSpec(catalog.find(c=>c.type===i.type)))return corners(i,catalog);
 const [w,d]=dimsOf(i,catalog),r=(i.rot||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 return Array.from({length:128},(_,n)=>{const t=n/128*Math.PI*2,x=Math.cos(t)*w/2,z=Math.sin(t)*d/2;return{x:i.x+x*c+z*s,z:i.z-x*s+z*c};});
}
const onSegment=(p,a,b)=>{const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z||1)));return{x:a.x+t*x,z:a.z+t*z};};
function polygonGap(a,b){
 let best={distance:Infinity};
 const axes=[...a,...b].map((_,n)=>{const p=n<a.length?a:b,k=n<a.length?n:n-a.length,u=p[k],v=p[(k+1)%p.length],l=Math.hypot(v.x-u.x,v.z-u.z);return{x:-(v.z-u.z)/l,z:(v.x-u.x)/l};});
 const overlapping=axes.every(axis=>{const ap=a.map(p=>p.x*axis.x+p.z*axis.z),bp=b.map(p=>p.x*axis.x+p.z*axis.z);return Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp))>1e-8;});
 for(let n=0;n<a.length;n++)for(let k=0;k<b.length;k++){
  const p=a[n],q=a[(n+1)%a.length],u=b[k],v=b[(k+1)%b.length],rx=q.x-p.x,rz=q.z-p.z,sx=v.x-u.x,sz=v.z-u.z,den=rx*sz-rz*sx;
  if(Math.abs(den)>1e-10){const t=((u.x-p.x)*sz-(u.z-p.z)*sx)/den,s=((u.x-p.x)*rz-(u.z-p.z)*rx)/den;if(t>=0&&t<=1&&s>=0&&s<=1){const hit={x:p.x+t*rx,z:p.z+t*rz};return{distance:0,a:hit,b:hit,overlapping};}}
  for(const [a0,b0]of [[p,onSegment(p,u,v)],[q,onSegment(q,u,v)],[onSegment(u,p,q),u],[onSegment(v,p,q),v]]){const distance=Math.hypot(a0.x-b0.x,a0.z-b0.z);if(distance<best.distance)best={distance,a:a0,b:b0};}
 }
 if(overlapping){const inside=(p,poly)=>{const cross=poly.map((u,n)=>{const v=poly[(n+1)%poly.length];return(v.x-u.x)*(p.z-u.z)-(v.z-u.z)*(p.x-u.x);});return cross.every(v=>v>=-1e-8)||cross.every(v=>v<=1e-8);},p=a.find(p=>inside(p,b))||b.find(p=>inside(p,a))||a[0];return{distance:0,a:p,b:p,overlapping:true};}
 return{...best,overlapping:false};
}
export function objectPairMeasurement(first,second,catalog=CATALOG){
 if(!first||!second||first.id===second.id)return null;
 const gap=polygonGap(footprint(first,catalog),footprint(second,catalog)),a=footprintBounds(first,catalog),b=footprintBounds(second,catalog);
 return{...gap,key:'pair:'+first.id+':'+second.id,kind:'pair',from:first.id,to:second.id,label:'최단 간격',horizontal:Math.max(0,a.minX-b.maxX,b.minX-a.maxX),vertical:Math.max(0,a.minZ-b.maxZ,b.minZ-a.maxZ),ends:first.round||second.round||roundSpec(catalog.find(c=>c.type===first.type))||roundSpec(catalog.find(c=>c.type===second.type))?[]:deskPairCorners(first,second,catalog)};
}

function footprintBounds(item,catalog){
 if(!item.round&&!roundSpec(catalog.find(c=>c.type===item.type)))return bounds(item,catalog);
 const [w,d]=dimsOf(item,catalog),r=(item.rot||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),x=Math.hypot(w/2*c,d/2*s),z=Math.hypot(w/2*s,d/2*c);
 return{minX:item.x-x,maxX:item.x+x,minZ:item.z-z,maxZ:item.z+z};
}

// Small labels with short leaders replace long wall rays. All panel references
// are retained; ordinary references can be limited by an explicit selection.
export function tapeLabelLayout(plan,project,{selectedIds=[],ordinary=true,fontSize=10.5,occupied=[]}={}){
 const selected=new Set(selectedIds),placed=occupied.map(b=>({...b})),result=[];
 for(const item of plan.references.filter(i=>i.panel||ordinary&&selected.has(i.id))){
  const anchor=project(item.refs[0]?.a.x??item.x,item.refs[0]?.a.z??item.z),text=item.refs.map(m=>m.wallCode+' '+tapeCm(m.distance)).join(' · '),width=Math.max(44,text.length*fontSize*.58+10),height=fontSize*2.5;
  let box;
  search:for(const dy of [-height-13,13,-height-30,30,-height-48,48,-height-68,68])for(const dx of [0,-width*.65,width*.65,-width,width]){const next={x:anchor.x-width/2+dx,y:anchor.y+dy,w:width,h:height};box=next;if(!placed.some(r=>next.x<r.x+r.w+3&&next.x+next.w>r.x-3&&next.y<r.y+r.h+3&&next.y+next.h>r.y-3))break search;}
  placed.push(box);result.push({item,anchor,text,box});
 }
 return result;
}
