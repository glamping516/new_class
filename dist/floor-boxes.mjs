// Measurements are clear distances between walls / facing box edges, in metres.
// Scene coordinates remain box centres; convert only at the measurement boundary.
export const FLOORBOX_MEASUREMENTS=Object.freeze({
 doorWall:3.6,columnGap:2.28,rowGap:2.11,rows:3,columns:4,
 oppositeWall:1.3,boxWidth:.18,boxDepth:.18
});
const close=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<.000001;
const rounded=v=>Math.round(v*1e6)/1e6;
export const isClassroomRoom=room=>close(room?.w,9)&&close(room?.d,12);

export function floorboxEdges(box){
 return{minX:box.x-box.w/2,maxX:box.x+box.w/2,minZ:box.z-box.depth/2,maxZ:box.z+box.depth/2};
}
export function floorboxFromEdges(box,left,front){
 return{...box,x:rounded(left+box.w/2),z:rounded(front+box.depth/2)};
}

export function classroomFloorBoxes(fixtures=[],room={w:9,d:12},size={}){
 const m=FLOORBOX_MEASUREMENTS,occupied=new Set(fixtures.filter(f=>f.kind!=='floorbox').map(f=>f.id));
 const w=size.w??m.boxWidth,depth=size.depth??m.boxDepth,estimated=size.estimated??true;
 if(!Number.isFinite(w)||!Number.isFinite(depth)||w<.02||depth<.02)throw new Error('단자함 가로·깊이는 2cm 이상으로 입력하세요.');
 const span=m.columns*w+(m.columns-1)*m.columnGap;
 const front=room.d-m.doorWall-m.rows*depth-(m.rows-1)*m.rowGap;
 if(span>room.w||front<0||m.oppositeWall+depth>room.d)throw new Error('단자함 크기와 모서리 간격이 공간 범위를 벗어납니다.');
 const idFor=base=>{let id=base;while(occupied.has(id))id+='-1';occupied.add(id);return id;};
 // No lateral wall offset was measured. Centre the four columns provisionally.
 const left=(room.w-span)/2;
 const boxes=Array.from({length:m.rows*m.columns},(_,n)=>floorboxFromEdges({
  id:idFor(`port${n}`),kind:'floorbox',name:`바닥 단자 ${n+1}`,
  w,h:.015,depth,estimated
 },left+(n%m.columns)*(w+m.columnGap),front+Math.floor(n/m.columns)*(depth+m.rowGap)));
 boxes.push({id:idFor('front-center-port'),kind:'floorbox',name:'맞은편 벽 중앙 단자',
  x:rounded(room.w/2),z:rounded(m.oppositeWall+depth/2),w,h:.015,depth,estimated});
 return boxes;
}

// Update only known, untouched centre-based presets, including both 13-box grids.
// Keep manual coordinate/size edits, removals and other rooms unchanged.
export function migrateLegacyFloorBoxes(fixtures,room){
 if(!isClassroomRoom(room))return fixtures;
 const ports=fixtures.filter(f=>f.kind==='floorbox');
 if(![9,10,13].includes(ports.length))return fixtures;
 const previousThirteen=ports.length===13;
 const sink=fixtures.find(f=>f.id==='sink'&&f.kind==='sink');
 const door=fixtures.find(f=>f.id==='door'&&f.kind==='door');
 if(previousThirteen&&(!door||door.wall!=='back'))return fixtures;
 if(!previousThirteen&&(!sink||sink.wall!=='front'||!close(sink.offset,7.2)||!close(sink.w,1.45)||
    !door||door.wall!=='back'||!close(door.offset,.45)||!close(door.w,1.4)))return fixtures;
 const patterns=previousThirteen?[
  {cols:3,xs:[2.22,4.5,6.78],zs:[.85,2.96,5.07,7.18]},
  {cols:4,xs:[1.08,3.36,5.64,7.92],zs:[4.18,6.29,8.4]}
 ]:[{cols:3,xs:ports.length===9?[1.8,4.5,7.2]:[.85,3.13,5.41],zs:ports.length===9?[3.15,6.3,9.45]:[4.18,6.29,8.4]}];
 if(!patterns.some(p=>Array.from({length:previousThirteen?12:9},(_,n)=>n).every(n=>{
  const f=ports.find(f=>f.id===`port${n}`);
  return f&&f.estimated!==false&&close(f.x,p.xs[n%p.cols])&&close(f.z,p.zs[Math.floor(n/p.cols)])&&close(f.w,.18)&&close(f.h,.015)&&close(f.depth,.18);
 })))return fixtures;
 const single=ports.find(f=>previousThirteen?f.id==='front-center-port':!/^port[0-8]$/.test(f.id));
 if(previousThirteen&&(!single||single.estimated===false||!close(single.x,4.5)||!close(single.z,1.3)||
   !close(single.w,.18)||!close(single.h,.015)||!close(single.depth,.18)))return fixtures;
 if(ports.length===10&&(!single||!/^sink-port(?:-1)*$/.test(single.id)||single.estimated===false||
   !close(single.x,7.925)||!close(single.z,1.3)||!close(single.w,.18)||!close(single.h,.015)||!close(single.depth,.18)))return fixtures;
 const hideNew=ports.every(f=>f.hidden),oldById=new Map(ports.map(f=>[f.id,f]));
 const updated=classroomFloorBoxes(fixtures,room).map(f=>{
  const old=oldById.get(f.id);if(old)return{...old,x:f.x,z:f.z};
  if(f.id==='front-center-port'&&single)return{...single,...f,name:single.name==='싱크대 옆 바닥 단자'?f.name:single.name||f.name,hidden:!!single.hidden};
  return{...f,hidden:hideNew};
 });
 return[...fixtures.filter(f=>f.kind!=='floorbox'),...updated];
}
