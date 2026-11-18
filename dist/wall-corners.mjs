import {corners,dimsOf} from './geometry.mjs';

export const MEASUREMENT_WALLS=[
 {key:'front',name:'정면 벽',code:'정',axis:'z',direction:{x:0,z:-1}},
 {key:'back',name:'후면 벽',code:'후',axis:'z',direction:{x:0,z:1}},
 {key:'left',name:'왼쪽 벽',code:'좌',axis:'x',direction:{x:-1,z:0}},
 {key:'right',name:'오른쪽 벽',code:'우',axis:'x',direction:{x:1,z:0}}
];
const roundFootprint=spec=>['roundTable','stool'].includes(spec?.model)||(spec?.model==='bin'&&spec.style==='pedal');

// All vertices of edges facing the wall participate, including the shared
// vertex of two facing edges on a rotated rectangle. Never use a midpoint.
export function facingWallCorners(item,catalog,wall){
 const polygon=corners(item,catalog),indices=new Set();
 for(let n=0;n<4;n++){
  const a=polygon[n],b=polygon[(n+1)%4],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  if((dz*wall.direction.x-dx*wall.direction.z)/len>1e-7){indices.add(n);indices.add((n+1)%4);}
 }
 return [...indices].sort((a,b)=>a-b).map(n=>({point:{...polygon[n]},corner:n+1}));
}
function roundWallTangent(item,catalog,direction){
 const [w,d]=dimsOf(item,catalog),angle=(item.rot||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),rx=w*w/4,rz=d*d/4;
 const xx=rx*c*c+rz*s*s,zz=rx*s*s+rz*c*c,xz=(rz-rx)*s*c;
 const x=xx*direction.x+xz*direction.z,z=xz*direction.x+zz*direction.z,length=Math.sqrt(direction.x*x+direction.z*z);
 return{x:item.x+x/length,z:item.z+z/length};
}

// Every item contributes its own wall-facing corners. Another item between it
// and the wall does not suppress a positioning dimension. Distances are always
// perpendicular to the actual room wall, even for rotated furniture.
export function wallCornerMeasurements(items,room,catalog,{selectedIds=[],walls=MEASUREMENT_WALLS.map(w=>w.key)}={}){
 const selected=new Set(selectedIds),result=[];
 for(const item of items){
  if(item.hidden||selected.size&&!selected.has(item.id))continue;
  const spec=catalog.find(c=>c.type===item.type);if(!spec&&!item.dims||spec?.category==='wallcover')continue;
  for(const wall of MEASUREMENT_WALLS){
   if(!walls.includes(wall.key))continue;
   const points=roundFootprint(spec)?[{point:roundWallTangent(item,catalog,wall.direction),corner:null}]:facingWallCorners(item,catalog,wall);
   const target=wall.key==='right'?room.w:wall.key==='back'?room.d:0;
   for(const {point:a,corner}of points){const b={...a,[wall.axis]:target};result.push({key:`wall-corner:${item.id}:${wall.key}:${corner??'edge'}`,kind:'wall',cornerBased:true,from:item.id,objectName:item.name||spec?.name||'고정 시설',wall:wall.key,wallCode:wall.code,corner,a,b,distance:Math.abs(a[wall.axis]-target),label:`${wall.name} → ${corner===null?'외곽':'모서리 '+corner}`});}
  }
 }
 return result;
}

// Wall-mounted fixtures use the inner wall plane as their positioning origin.
export function fixedWallMeasurementItems(fixtures,room){
 return fixtures.filter(f=>!f.hidden&&['sink','panel','idf'].includes(f.kind)).map(f=>{
  const center=f.offset+f.w/2,angle=f.wall==='front'?0:f.wall==='back'?180:f.wall==='left'?90:270,r=angle*Math.PI/180;
  const anchor=f.wall==='front'?{x:center,z:0}:f.wall==='back'?{x:center,z:room.d}:f.wall==='left'?{x:0,z:center}:{x:room.w,z:center};
  return{id:'fixed-'+f.id,type:'fixed',name:f.name+' (고정)',x:anchor.x+Math.sin(r)*f.depth/2,z:anchor.z+Math.cos(r)*f.depth/2,rot:angle,dims:[f.w,f.depth,f.h]};
 });
}
