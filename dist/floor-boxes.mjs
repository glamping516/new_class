// Distances use the centre of each box, in metres from left/front walls.
// The user confirmed the screen-wall origin and total count on 2026-11-06.
export const FLOORBOX_MEASUREMENTS=Object.freeze({
 screenWall:.85,columnGap:2.28,rowGap:2.11,rows:4,columns:3,
 oppositeWall:1.3,reportedDoorWall:3.6
});
const close=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<.000001;
const rounded=v=>Math.round(v*1000)/1000;
export const isClassroomRoom=room=>close(room?.w,9)&&close(room?.d,12);

export function classroomFloorBoxes(fixtures=[],room={w:9,d:12}){
 const m=FLOORBOX_MEASUREMENTS,occupied=new Set(fixtures.filter(f=>f.kind!=='floorbox').map(f=>f.id));
 const idFor=base=>{let id=base;while(occupied.has(id))id+='-1';occupied.add(id);return id;};
 // No lateral wall offset was measured. Centre the three columns provisionally.
 const left=(room.w-(m.columns-1)*m.columnGap)/2;
 const boxes=Array.from({length:m.rows*m.columns},(_,n)=>({
  id:idFor(`port${n}`),kind:'floorbox',name:`바닥 단자 ${n+1}`,
  x:rounded(left+(n%m.columns)*m.columnGap),
  z:rounded(m.screenWall+Math.floor(n/m.columns)*m.rowGap),
  w:.18,h:.015,depth:.18,estimated:true
 }));
 boxes.push({id:idFor('front-center-port'),kind:'floorbox',name:'맞은편 벽 중앙 단자',
  x:rounded(room.w/2),z:m.oppositeWall,w:.18,h:.015,depth:.18,estimated:true});
 return boxes;
}

// Update only the two shipped, untouched 9/10-box presets. User edits, removals,
// custom rooms and corrected 13-box layouts are preserved.
export function migrateLegacyFloorBoxes(fixtures,room){
 if(!isClassroomRoom(room))return fixtures;
 const ports=fixtures.filter(f=>f.kind==='floorbox');
 if(![9,10].includes(ports.length))return fixtures;
 const sink=fixtures.find(f=>f.id==='sink'&&f.kind==='sink');
 const door=fixtures.find(f=>f.id==='door'&&f.kind==='door');
 if(!sink||sink.wall!=='front'||!close(sink.offset,7.2)||!close(sink.w,1.45)||
    !door||door.wall!=='back'||!close(door.offset,.45)||!close(door.w,1.4))return fixtures;
 const xs=ports.length===9?[1.8,4.5,7.2]:[.85,3.13,5.41];
 const zs=ports.length===9?[3.15,6.3,9.45]:[4.18,6.29,8.4];
 for(let n=0;n<9;n++){
  const f=ports.find(f=>f.id===`port${n}`);
  if(!f||f.estimated===false||!close(f.x,xs[n%3])||!close(f.z,zs[Math.floor(n/3)])||
     !close(f.w,.18)||!close(f.h,.015)||!close(f.depth,.18))return fixtures;
 }
 const single=ports.find(f=>!/^port[0-8]$/.test(f.id));
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
