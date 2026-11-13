import {classroomFloorBoxes,isClassroomRoom,floorboxEdges,FLOORBOX_MEASUREMENTS} from './floor-boxes.mjs';

export const cm=v=>Math.round(v*10000)/100;
export const formatCm=v=>cm(v).toLocaleString('ko-KR',{maximumFractionDigits:2});
export function floorboxRecords(state,{includeHidden=true}={}){
 const fixtures=state.fixtures.filter(f=>f.kind==='floorbox');
 const fixedNumber=f=>f.id==='front-center-port'?13:/^port(?:[0-9]|1[01])$/.test(f.id)?Number(f.id.slice(4))+1:null;
 const used=new Set(fixtures.map(fixedNumber).filter(n=>n!==null));let next=1;
 return fixtures.map(f=>{const edges=floorboxEdges(f);let number=fixedNumber(f);
  if(number===null){while(used.has(next))next++;number=next;used.add(number);}
  return{
  id:f.id,code:String(number).padStart(2,'0'),name:f.name||'바닥 단자함',
  x:f.x,z:f.z,w:f.w,depth:f.depth,hidden:!!f.hidden,edges,
  left:cm(edges.minX),front:cm(edges.minZ),right:cm(state.room.w-edges.maxX),back:cm(state.room.d-edges.maxZ)
 };}).sort((a,b)=>Number(a.code)-Number(b.code)).filter(f=>includeHidden||!f.hidden);
}
export function constructionNote(state){
 const boxes=state.fixtures.filter(f=>f.kind==='floorbox');let preset=[];
 try{if(boxes.length)preset=classroomFloorBoxes([],state.room,boxes[0]);}catch{}
 const presetApplied=isClassroomRoom(state.room)&&boxes.length===13&&boxes.every(f=>preset.some(p=>p.id===f.id&&Math.abs(p.x-f.x)<.000001&&Math.abs(p.z-f.z)<.000001&&Math.abs(p.w-f.w)<.000001&&Math.abs(p.depth-f.depth)<.000001));
 if(!presetApplied)return'벽에서 단자함의 가까운 모서리까지의 거리 / cm. 크기는 공간 설정에 입력된 가로·깊이를 사용합니다. 공사 전 현장 실측과 대조하세요.';
 const first=floorboxEdges(preset[0]),last=floorboxEdges(preset[3]),size=boxes[0],right=state.room.w-last.maxX;
 const widthNote=Math.abs(size.w-FLOORBOX_MEASUREMENTS.boxWidth)<.000001&&boxes.some(f=>f.estimated!==false)
  ?`가로 25.25cm는 9m 폭·양쪽 벽 거리·가로 간격으로 계산한 값이며 깊이 ${formatCm(size.depth)}cm는 추정값입니다.`
  :`단자함 ${formatCm(size.w)}×${formatCm(size.depth)}cm${boxes.some(f=>f.estimated!==false)?' (추정값)':''}.`;
 const rightNote=Math.abs(right-.85)<.000001?'':' 입력한 크기에서는 오른쪽 실측 85cm와 차이가 있으므로 현장 치수를 확인하세요.';
 return`모서리 기준 / cm. 4열 × 3줄 12개 + 단독 1개. 왼쪽벽→모서리 ${formatCm(first.minX)}cm·오른쪽벽→모서리 ${formatCm(right)}cm. 가로 빈 간격 211cm·세로 228cm. 문벽→가까운 모서리 360cm, 단독은 맞은편 벽→모서리 130cm입니다. ${widthNote}${rightNote} 12m 깊이에서 첫 줄의 정면벽 거리는 ${formatCm(first.minZ)}cm로 계산됩니다.`;
}

// Show all four perpendicular wall distances, ending at the selected footprint's corners.
// The 3D marker itself continues to use the saved centre coordinate.
export function floorboxDimensionSegments(f,room){
 const e=f.edges||floorboxEdges(f);
 return[
  {kind:'wall',wall:'left',a:{x:0,z:e.minZ},b:{x:e.minX,z:e.minZ},text:`왼쪽벽 · ${f.left}cm`},
  {kind:'wall',wall:'right',a:{x:room.w,z:e.maxZ},b:{x:e.maxX,z:e.maxZ},text:`오른쪽벽 · ${f.right}cm`},
  {kind:'wall',wall:'front',a:{x:e.minX,z:0},b:{x:e.minX,z:e.minZ},text:`정면벽 · ${f.front}cm`},
  {kind:'wall',wall:'back',a:{x:e.maxX,z:room.d},b:{x:e.maxX,z:e.maxZ},text:`후면벽 · ${f.back}cm`}
 ];
}

// Closest points on the actual footprints, never centre-to-centre distances.
// Aligned boxes use the clear facing-edge gap; diagonal boxes use the nearest corners.
export function floorboxGap(from,to){
 const a=from.edges||floorboxEdges(from),b=to.edges||floorboxEdges(to);
 const axis=(lo,hi,otherLo,otherHi)=>hi<otherLo?[hi,otherLo]:otherHi<lo?[lo,otherHi]:[Math.max(lo,otherLo),Math.max(lo,otherLo)];
 const [ax,bx]=axis(a.minX,a.maxX,b.minX,b.maxX),[az,bz]=axis(a.minZ,a.maxZ,b.minZ,b.maxZ);
 return{a:{x:ax,z:az},b:{x:bx,z:bz},distance:Math.hypot(bx-ax,bz-az)};
}

export function floorboxNeighborSegments(selected,records){
 const e=selected.edges||floorboxEdges(selected),others=records.filter(f=>f.id!==selected.id);
 const candidates=others.map(other=>{
  const b=other.edges||floorboxEdges(other),gap=floorboxGap(selected,other);
  const overlapsX=Math.min(e.maxX,b.maxX)>=Math.max(e.minX,b.minX)-1e-6;
  const overlapsZ=Math.min(e.maxZ,b.maxZ)>=Math.max(e.minZ,b.minZ)-1e-6;
  const direction=overlapsZ?(other.x<selected.x?'left':'right'):overlapsX?(other.z<selected.z?'front':'back'):null;
  return{other,...gap,direction};
 });
 const ids=new Set();
 // Always include the closest visible box directly to each side.
 for(const direction of ['left','right','front','back']){
  const first=candidates.filter(c=>c.direction===direction).sort((a,b)=>a.distance-b.distance||a.other.id.localeCompare(b.other.id))[0];
  if(first)ids.add(first.other.id);
 }
 // Add nearby diagonal links only if no third box is closer to both endpoints.
 // This links the lone front box to its neighbours without drawing through rows.
 const centreDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 for(const c of candidates){
  const distance=centreDistance(selected,c.other);
  if(!others.some(third=>third.id!==c.other.id&&centreDistance(selected,third)<distance-1e-6&&centreDistance(c.other,third)<distance-1e-6))ids.add(c.other.id);
 }
 return candidates.filter(c=>ids.has(c.other.id)).sort((a,b)=>Math.abs(a.distance-b.distance)<1e-6?a.other.code.localeCompare(b.other.code):a.distance-b.distance).map(c=>({
  kind:'neighbor',targetId:c.other.id,code:c.other.code,direction:c.direction,distance:cm(c.distance),a:c.a,b:c.b,
  text:`${selected.code} ↔ ${c.other.code} · ${cm(c.distance)}cm`
 }));
}

// Each adjacent pair is drawn once; the sidebar retains every four-wall value.
export function floorboxOverviewSegments(records,room,{walls=true,neighbors=true}={}){
 const result=[],seen=new Set();
 if(neighbors)for(const f of records)for(const line of floorboxNeighborSegments(f,records)){
  const key=[f.id,line.targetId].sort().join('|');if(seen.has(key))continue;seen.add(key);
  result.push({...line,key,fromId:f.id,fromCode:f.code,toCode:line.code,text:`${line.distance}cm`,detail:line.text});
 }
 if(walls&&records.length){
  const outer={left:Math.min(...records.map(f=>f.edges.minX)),right:Math.max(...records.map(f=>f.edges.maxX)),front:Math.min(...records.map(f=>f.edges.minZ)),back:Math.max(...records.map(f=>f.edges.maxZ))};
  for(const f of records)for(const line of floorboxDimensionSegments(f,room)){
   const value=f.edges[({left:'minX',right:'maxX',front:'minZ',back:'maxZ'})[line.wall]];
   if(Math.abs(value-outer[line.wall])>1e-6)continue;
   result.push({...line,fromId:f.id,text:`${f[line.wall]}cm`,detail:`${f.code} · ${line.text}`});
  }
 }
 return result;
}

// Fit only the actual drawing and its annotations, with a small uniform margin.
export function drawingExportFrame(points,rectangles=[],{resolution=2600,padding=18}={}){
 const all=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
 for(const r of rectangles)if([r.x,r.y,r.w,r.h].every(Number.isFinite))all.push({x:r.x,y:r.y},{x:r.x+r.w,y:r.y+r.h});
 if(!all.length)all.push({x:0,y:0},{x:1,y:1});
 const x=Math.floor(Math.min(...all.map(p=>p.x))-padding),y=Math.floor(Math.min(...all.map(p=>p.y))-padding);
 const w=Math.max(1,Math.ceil(Math.max(...all.map(p=>p.x))+padding)-x),h=Math.max(1,Math.ceil(Math.max(...all.map(p=>p.y))+padding)-y);
 const scale=resolution/Math.max(w,h);
 return{x,y,w,h,scale,width:Math.max(1,Math.round(w*scale)),height:Math.max(1,Math.round(h*scale))};
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
export function terminalLabelPositions(points,{width=44,height=27,gap=3,viewport,lift=0}={}){
 const placed=[];
 return points.map(p=>{
  let chosen={...p,anchor:{x:p.x,y:p.y},dx:0,dy:0};
  const step=width+gap,shifts=p.plate?Array.from({length:7},(_,row)=>[0,-1,1,-2,2,-3,3,-4,4,-5,5].map(col=>[col*step,-row*(height+gap)])).flat():viewport?[[0,0],[-step,0],[step,0],[-step*2,0],[step*2,0],[-step*3,0],[step*3,0],[0,-height-gap],[0,height+gap],[0,-2*(height+gap)],[0,2*(height+gap)]]:[[0,0],[0,-28],[0,28],[-44,0],[44,0],[0,-56],[0,56],[-44,28],[44,28]];
  for(const [dx,dy]of shifts){
   const x=p.x+dx,y=p.y-(p.lift??lift)+dy,box={x:x-width/2,y:y-height,w:width,h:height};
   chosen={...p,x,y,anchor:{x:p.x,y:p.y},dx,dy:y-p.y};
   if(viewport&&(box.x<2||box.y<2||box.x+box.w>viewport.width-2||box.y+box.h>viewport.height-2))continue;
   if(p.plate&&box.y+box.h>p.plate.minY-6)continue;
   if(points.some(q=>q.plate&&box.x<q.plate.maxX+5&&box.x+box.w>q.plate.minX-5&&box.y<q.plate.maxY+5&&box.y+box.h>q.plate.minY-5))continue;
   if(!placed.some(r=>box.x<r.x+r.w+gap&&box.x+box.w>r.x-gap&&box.y<r.y+r.h+gap&&box.y+box.h>r.y-gap)){placed.push(box);return chosen;}
  }
  placed.push({x:chosen.x-width/2,y:chosen.y-height,w:width,h:height});return chosen;
 });
}
