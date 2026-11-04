import {bounds} from './geometry.mjs';
import {isDesk} from './furniture.mjs';

// Rows run from the front wall (Z=0) toward the entrance wall. Small placement
// differences stay in one row; use the full footprint for safe aisle clearances.
export function deskRowMeasurements(items,room,catalog,{includeAll=false,tolerance=.18}={}){
 const computers=items.filter(i=>i.type==='computerDesk'),desks=includeAll||!computers.length?items.filter(i=>isDesk(i.type)):computers;
 const source=includeAll||!computers.length?'기존 책상 전체':'컴퓨터책상',rows=[];
 for(const item of [...desks].sort((a,b)=>a.z-b.z||a.x-b.x)){
  const b=bounds(item,catalog);let row=rows.at(-1);
  if(!row||item.z-row.firstCenter>tolerance+1e-8){row={number:rows.length+1,firstCenter:item.z,ids:[],minX:Infinity,maxX:-Infinity,front:Infinity,back:-Infinity,frontMax:-Infinity};rows.push(row);}
  row.ids.push(item.id);row.minX=Math.min(row.minX,b.minX);row.maxX=Math.max(row.maxX,b.maxX);row.front=Math.min(row.front,b.minZ);row.frontMax=Math.max(row.frontMax,b.minZ);row.back=Math.max(row.back,b.maxZ);
 }
 const laneX=rows.length?Math.max(...rows.map(r=>r.maxX))+.42:room.w,measurements=[];
 if(rows.length){const first=rows[0];measurements.push({key:'row-wall-1',kind:'row',label:'정면벽 → 1행',rowKind:'wall',distance:Math.max(0,first.front),overlap:Math.max(0,-first.front),a:{x:laneX,z:0},b:{x:laneX,z:Math.max(0,first.front)}});}
 for(let n=0;n<rows.length;n++){
  const row=rows[n],next=rows[n+1];row.misaligned=row.frontMax-row.front>.015;
  row.gapToNext=next?next.front-row.back:null;
  if(next){const gap=next.front-row.back;measurements.push({key:`row-gap-${row.number}-${next.number}`,kind:'row',rowKind:'gap',label:`${row.number}행 ↔ ${next.number}행`,fromRow:row.number,toRow:next.number,distance:Math.max(0,gap),overlap:Math.max(0,-gap),a:{x:laneX,z:row.back},b:{x:laneX,z:next.front}});}
 }
 return{rows,measurements,laneX,source};
}
