import {bounds,corners} from './geometry.mjs';
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

// Put each front/back dimension inside its own desk line. Project onto the
// screen's facing direction so rotating the screen changes what "behind" means.
export function deskFrontBackMeasurements(items,catalog,{includeAll=false}={}){
 const computers=items.filter(i=>i.type==='computerDesk'),desks=includeAll||!computers.length?items.filter(i=>isDesk(i.type)):computers;
 const screen=items.find(i=>i.type==='screen'),angle=(screen?.rot||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const projected=desks.map(item=>{const polygon=corners(item,catalog).map(p=>({u:p.x*c-p.z*s,v:p.x*s+p.z*c}));return{item,polygon,u:item.x*c-item.z*s,v:item.x*s+item.z*c,minU:Math.min(...polygon.map(p=>p.u)),maxU:Math.max(...polygon.map(p=>p.u))};});
 const section=(polygon,u)=>{const values=[];for(let n=0;n<polygon.length;n++){const a=polygon[n],b=polygon[(n+1)%polygon.length],du=b.u-a.u;if(Math.abs(du)<1e-9){if(Math.abs(u-a.u)<1e-8)values.push(a.v,b.v);continue;}const t=(u-a.u)/du;if(t>=-1e-8&&t<=1+1e-8)values.push(a.v+(b.v-a.v)*t);}return{front:Math.min(...values),back:Math.max(...values)};};
 const world=(u,v)=>({x:u*c+v*s,z:-u*s+v*c}),measurements=[];
 for(const front of projected){
  const candidates=projected.filter(back=>back.item.id!==front.item.id&&back.v-front.v>.18&&Math.min(front.maxU,back.maxU)-Math.max(front.minU,back.minU)>.025).sort((a,b)=>a.v-b.v||Math.abs(a.u-front.u)-Math.abs(b.u-front.u));
  const back=candidates[0];if(!back)continue;
  const u=(Math.max(front.minU,back.minU)+Math.min(front.maxU,back.maxU))/2,a=section(front.polygon,u),b=section(back.polygon,u),gap=b.front-a.back;
  measurements.push({key:`desk-depth-${front.item.id}-${back.item.id}`,kind:'desk-depth',from:front.item.id,to:back.item.id,label:`${front.item.name||front.item.id} 뒤끝 → ${back.item.name||back.item.id} 앞끝`,distance:Math.max(0,gap),overlap:Math.max(0,-gap),a:world(u,a.back),b:world(u,b.front)});
 }
 return measurements;
}
