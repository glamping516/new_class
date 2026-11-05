import {classroomFloorBoxes,isClassroomRoom} from './floor-boxes.mjs';

export const cm=v=>Math.round(v*1000)/10;
export const formatCm=v=>cm(v).toLocaleString('ko-KR',{maximumFractionDigits:1});
export function floorboxRecords(state,{includeHidden=true}={}){
 return state.fixtures.filter(f=>f.kind==='floorbox').map((f,n)=>({
  id:f.id,code:'F'+String(n+1).padStart(2,'0'),name:f.name||'바닥 단자함',
  x:f.x,z:f.z,w:f.w,depth:f.depth,hidden:!!f.hidden,
  left:cm(f.x),front:cm(f.z),right:cm(state.room.w-f.x),back:cm(state.room.d-f.z)
 })).filter(f=>includeHidden||!f.hidden);
}
export function constructionNote(state){
 const boxes=state.fixtures.filter(f=>f.kind==='floorbox'),preset=classroomFloorBoxes();
 const provisional=isClassroomRoom(state.room)&&boxes.some(f=>preset.some(p=>p.id===f.id&&Math.abs(p.x-f.x)<.001&&Math.abs(p.z-f.z)<.001));
 return provisional?'기본 교육장 좌표에는 85cm=왼쪽 옆벽, 130cm=싱크대 뒤벽으로 해석한 잠정 위치가 포함됩니다. 기준 벽과 중심·테두리 기준을 현장 실측과 대조하세요.':'현재 저장된 도면의 단자함 중심 좌표입니다. 공사 전 현장 실측과 대조하세요.';
}
// Displacement is a presentation transform only; no source coordinates change.
export function layerSettings({lift=3.4,opacity=.22,floorOnly=false}={}){
 return{lift:Math.min(6,Math.max(2,Number(lift)||3.4)),opacity:Math.min(.45,Math.max(.05,Number(opacity)||.22)),floorOnly:!!floorOnly};
}

// Keep dimension text clear of every terminal code, including another terminal
// halfway along a long X/Z line. The same position is used on screen and export.
export function dimensionLabel(a,b,text,markers=[]){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,sign=dx>0?-1:1;
 const nx=-dy/len*sign,ny=dx/len*sign,width=text.length*7+12;
 let fallback;
 for(const along of [0,-36,36,-64,64])for(const offset of [len<80?32:15,48,64,80]){
  const x=(a.x+b.x)/2+nx*offset+dx/len*along,y=(a.y+b.y)/2+ny*offset+dy/len*along;
  const box={x:x-width/2,y:y-15,w:width,h:18};fallback={x,y,box};
  if(!markers.some(p=>box.x<p.x+24&&box.x+box.w>p.x-24&&box.y<p.y+2&&box.y+box.h>p.y-28))return fallback;
 }
 return fallback;
}
