import {bounds,corners,objectGap,overlaps} from './geometry.mjs';
import {CATALOG,isDesk} from './furniture.mjs';

export function hasDeskCorners(item,catalog=CATALOG){
 const spec=catalog.find(c=>c.type===item.type);
 return !!spec&&!item.hidden&&(item.y||0)<.06&&(isDesk(item.type)||spec.model==='squareTable');
}
const dot=(a,b)=>a.x*b.x+a.z*b.z;
function facingEdge(item,direction,catalog){
 const polygon=corners(item,catalog);
 return polygon.map((a,n)=>{const b=polygon[(n+1)%4],length=Math.hypot(b.x-a.x,b.z-a.z);return{a,b,score:dot({x:(b.z-a.z)/length,z:-(b.x-a.x)/length},direction)};}).sort((a,b)=>b.score-a.score)[0];
}
// Both witnesses are actual vertices of the rotated/resized desktops. This is
// deliberately different from a shortest edge distance or a centre-line aisle.
export function deskPairCorners(first,second,catalog=CATALOG){
 const direction={x:second.x-first.x,z:second.z-first.z};
 const a=facingEdge(first,direction,catalog),b=facingEdge(second,{x:-direction.x,z:-direction.z},catalog);
 const length=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);
 const straight=length(a.a,b.a)+length(a.b,b.b),crossed=length(a.a,b.b)+length(a.b,b.a);
 const pairs=straight<=crossed?[[a.a,b.a],[a.b,b.b]]:[[a.a,b.b],[a.b,b.a]];
 return pairs.map(([p,q])=>({a:{...p},b:{...q},distance:length(p,q),overlapping:overlaps(first,second,catalog,0)}));
}

// Only the nearest desk in each cardinal direction is a neighbour. A third
// desktop between the pair therefore prevents misleading through-desk lines.
export function deskCornerMeasurements(items,catalog=CATALOG,{selectedIds=[],frontBackOnly=false}={}){
 const desks=items.filter(i=>hasDeskCorners(i,catalog)),boxes=new Map(desks.map(i=>[i.id,bounds(i,catalog)])),selected=new Set(selectedIds),pairs=new Map();
 for(const item of desks){
  const b=boxes.get(item.id);
  for(const side of ['left','right','front','back']){
   const near=desks.filter(o=>{if(o.id===item.id)return false;const q=boxes.get(o.id),x=Math.min(b.maxX,q.maxX)-Math.max(b.minX,q.minX),z=Math.min(b.maxZ,q.maxZ)-Math.max(b.minZ,q.minZ);return side==='left'?z>1e-6&&o.x<item.x:side==='right'?z>1e-6&&o.x>item.x:side==='front'?x>1e-6&&o.z<item.z:x>1e-6&&o.z>item.z;}).map(o=>({item:o,gap:objectGap(item,o,catalog).distance})).sort((a,b)=>a.gap-b.gap||a.item.id.localeCompare(b.item.id))[0];
   if(!near||selected.size&&!selected.has(item.id)&&!selected.has(near.item.id))continue;
   const ordered=[item,near.item].sort((a,b)=>a.id.localeCompare(b.id)),key=ordered.map(i=>i.id).join(':');
   pairs.set(key,ordered);
  }
 }
 const result=[],screen=items.find(i=>i.type==='screen'),angle=(screen?.rot||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 for(const [key,[first,second]]of pairs){
  const dx=second.x-first.x,dz=second.z-first.z;
  if(frontBackOnly&&Math.abs(dx*s+dz*c)<Math.abs(dx*c-dz*s))continue;
  const horizontal=Math.abs(second.x-first.x)>Math.abs(second.z-first.z),ends=deskPairCorners(first,second,catalog).sort((a,b)=>horizontal?(a.a.z+a.b.z)-(b.a.z+b.b.z):(a.a.x+a.b.x)-(b.a.x+b.b.x));
  ends.forEach((line,n)=>result.push({...line,key:`desk-corner:${key}:${n}`,pairKey:key,kind:'desk-corner',from:first.id,to:second.id,end:n,axis:horizontal?'x':'z',endLabel:horizontal?(n?'뒤끝':'앞끝'):(n?'오른쪽 끝':'왼쪽 끝'),label:`${first.name||catalog.find(c=>c.type===first.type)?.name||first.id} ↔ ${second.name||catalog.find(c=>c.type===second.type)?.name||second.id} · ${horizontal?(n?'뒤끝':'앞끝'):(n?'오른쪽 끝':'왼쪽 끝')}`}));
 }
 return result;
}
