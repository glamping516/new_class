import {isDesk} from './furniture.mjs';
import {dimsOf,clamp,round} from './geometry.mjs';

// Only a supporting surface sets the printer's base height; no saved-layout
// links or parent relationships are introduced.
export function placePrinterOnDesk(item,items,room,catalog,{nearest=false,preferredId=null}={}){
 const [pw,pd,ph]=dimsOf(item,catalog),candidates=[];
 for(const desk of items){
  if(desk.id===item.id||(!isDesk(desk.type)&&!['printerStand','pantryCounter'].includes(desk.type)))continue;
  const [w,d,h]=dimsOf(desk,catalog),top=(desk.y||0)+h;
  if(pw+.02>w||pd+.02>d||top+ph>room.h+.001)continue;
  const r=(desk.rot||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),dx=item.x-desk.x,dz=item.z-desk.z,lx=dx*c-dz*s,lz=dx*s+dz*c;
  if(!nearest&&(Math.abs(lx)>w/2||Math.abs(lz)>d/2))continue;
  candidates.push({desk,w,d,top,c,s,lx,lz,distance:Math.hypot(dx,dz)});
 }
 candidates.sort((a,b)=>(a.desk.id===preferredId?-1:b.desk.id===preferredId?1:0)||a.distance-b.distance);
 if(!candidates.length)return null;
 const {desk,w,d,top,c,s,lx,lz}=candidates[0],x=nearest?0:clamp(lx,-w/2+pw/2+.01,w/2-pw/2-.01),z=nearest?0:clamp(lz,-d/2+pd/2+.01,d/2-pd/2-.01);
 return{...item,x:round(desk.x+x*c+z*s),z:round(desk.z-x*s+z*c),y:round(top),rot:desk.rot||0};
}
