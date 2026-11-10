import {classroomFloorBoxes,isClassroomRoom,floorboxEdges} from './floor-boxes.mjs';

export const cm=v=>Math.round(v*1000)/10;
export const formatCm=v=>cm(v).toLocaleString('ko-KR',{maximumFractionDigits:1});
export function floorboxRecords(state,{includeHidden=true}={}){
 return state.fixtures.filter(f=>f.kind==='floorbox').map((f,n)=>{const edges=floorboxEdges(f);return{
  id:f.id,code:'F'+String(n+1).padStart(2,'0'),name:f.name||'바닥 단자함',
  x:f.x,z:f.z,w:f.w,depth:f.depth,hidden:!!f.hidden,edges,
  left:cm(edges.minX),front:cm(edges.minZ),right:cm(state.room.w-edges.maxX),back:cm(state.room.d-edges.maxZ)
 };}).filter(f=>includeHidden||!f.hidden);
}
export function constructionNote(state){
 const boxes=state.fixtures.filter(f=>f.kind==='floorbox');let preset=[];
 try{if(boxes.length)preset=classroomFloorBoxes([],state.room,boxes[0]);}catch{}
 const presetApplied=isClassroomRoom(state.room)&&boxes.length===13&&boxes.every(f=>preset.some(p=>p.id===f.id&&Math.abs(p.x-f.x)<.000001&&Math.abs(p.z-f.z)<.000001&&Math.abs(p.w-f.w)<.000001&&Math.abs(p.depth-f.depth)<.000001));
 if(!presetApplied)return'벽에서 단자함의 가까운 모서리까지의 거리 / cm. 크기는 공간 설정에 입력된 가로·깊이를 사용합니다. 공사 전 현장 실측과 대조하세요.';
 const first=floorboxEdges(preset[0]),size=boxes[0];
 return`모서리 기준 / cm. 4열 × 3줄 12개 + 단독 1개. 문벽→가까운 모서리 360cm, 좌우 빈 간격 228cm·앞뒤 211cm. 단독은 맞은편 벽→모서리 130cm입니다. 단자함 ${formatCm(size.w)}×${formatCm(size.depth)}cm${boxes.some(f=>f.estimated!==false)?' (추정값, 실측치로 수정 가능)':''}. 좌우 중앙 임시 배치이며 12m 깊이에서 첫 줄의 스크린벽 거리는 ${formatCm(first.minZ)}cm로 계산됩니다.`;
}

// Show a perpendicular distance to the nearest wall, ending at an actual corner.
// The 3D marker itself continues to use the saved centre coordinate.
export function floorboxDimensionSegments(f,room){
 const e=f.edges||floorboxEdges(f),right=f.right<f.left,back=f.back<f.front;
 return[
  {wall:right?'right':'left',a:{x:right?room.w:0,z:e.minZ},b:{x:right?e.maxX:e.minX,z:e.minZ},text:`${right?'오른쪽벽':'왼쪽벽'} · ${right?f.right:f.left}cm`},
  {wall:back?'back':'front',a:{x:e.minX,z:back?room.d:0},b:{x:e.minX,z:back?e.maxZ:e.minZ},text:`${back?'후면벽':'정면벽'} · ${back?f.back:f.front}cm`}
 ];
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
