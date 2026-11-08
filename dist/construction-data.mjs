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
 const presetApplied=isClassroomRoom(state.room)&&boxes.length===13&&boxes.every(f=>preset.some(p=>p.id===f.id&&Math.abs(p.x-f.x)<.001&&Math.abs(p.z-f.z)<.001));
 return presetApplied?'교육장 단자함 13개: 스크린벽에서 첫 줄 85cm · 단독 1개는 출입문 맞은편 벽 중앙에서 130cm. 가로 세 열은 좌우 중앙 임시 배치입니다. 세로 12m·앞뒤 211cm 기준 문벽 거리는 482cm로, 이전 360cm와 차이가 있어 공간 깊이 확인이 필요합니다. 중심 기준 / cm.':'현재 저장된 도면의 단자함 중심 좌표입니다. 공사 전 현장 실측과 대조하세요.';
}
// Displacement is a presentation transform only; no source coordinates change.
export function layerSettings({lift=3.4,opacity=.22,floorOnly=false}={}){
 return{lift:Math.min(6,Math.max(2,Number(lift)||3.4)),opacity:Math.min(.45,Math.max(.05,Number(opacity)||.22)),floorOnly:!!floorOnly};
}

// Keep dimension text clear of every terminal code, including another terminal
// halfway along a long X/Z line. The same position is used on screen and export.
export function dimensionLabel(a,b,text,markers=[],occupied=[]){
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,sign=dx>0?-1:1;
 const nx=-dy/len*sign,ny=dx/len*sign,width=text.length*7+12;
 let fallback;
 for(const along of [0,-36,36,-64,64])for(const offset of [len<80?32:15,48,64,80]){
  const x=(a.x+b.x)/2+nx*offset+dx/len*along,y=(a.y+b.y)/2+ny*offset+dy/len*along;
  const box={x:x-width/2,y:y-15,w:width,h:18};fallback={x,y,box};
  if(!markers.some(p=>box.x<p.x+24&&box.x+box.w>p.x-24&&box.y<p.y+2&&box.y+box.h>p.y-28)&&!occupied.some(r=>box.x<r.x+r.w+5&&box.x+box.w>r.x-5&&box.y<r.y+r.h+5&&box.y+box.h>r.y-5))return fallback;
 }
 return fallback;
}

// Keep nearby codes (notably the front centre box and the first-row middle box)
// readable, without moving the physical terminal positions.
export function terminalLabelPositions(points,{width=44,height=27,gap=3,viewport}={}){
 const placed=[];
 return points.map(p=>{
  let chosen={...p,anchor:{x:p.x,y:p.y},dx:0,dy:0};
  const step=width+gap,shifts=viewport?[[0,0],[-step,0],[step,0],[-step*2,0],[step*2,0],[-step*3,0],[step*3,0],[0,-height-gap],[0,height+gap],[0,-2*(height+gap)],[0,2*(height+gap)]]:[[0,0],[0,-28],[0,28],[-44,0],[44,0],[0,-56],[0,56],[-44,28],[44,28]];
  for(const [dx,dy]of shifts){
   const x=p.x+dx,y=p.y+dy,box={x:x-width/2,y:y-height,w:width,h:height};
   chosen={...p,x,y,anchor:{x:p.x,y:p.y},dx,dy};
   if(viewport&&(box.x<2||box.y<2||box.x+box.w>viewport.width-2||box.y+box.h>viewport.height-2))continue;
   if(!placed.some(r=>box.x<r.x+r.w+gap&&box.x+box.w>r.x-gap&&box.y<r.y+r.h+gap&&box.y+box.h>r.y-gap)){placed.push(box);return chosen;}
  }
  placed.push({x:chosen.x-width/2,y:chosen.y-height,w:width,h:height});return chosen;
 });
}
