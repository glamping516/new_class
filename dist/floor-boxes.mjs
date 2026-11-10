// Distances use the centre of each box, in metres from left/front walls.
// Latest correction (2026-11-10): four columns, three rows, 3.6m from the door wall.
export const FLOORBOX_MEASUREMENTS=Object.freeze({
 doorWall:3.6,columnGap:2.28,rowGap:2.11,rows:3,columns:4,
 oppositeWall:1.3
});
const close=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<.000001;
const rounded=v=>Math.round(v*1000)/1000;
export const isClassroomRoom=room=>close(room?.w,9)&&close(room?.d,12);

export function classroomFloorBoxes(fixtures=[],room={w:9,d:12}){
 const m=FLOORBOX_MEASUREMENTS,occupied=new Set(fixtures.filter(f=>f.kind!=='floorbox').map(f=>f.id));
 const idFor=base=>{let id=base;while(occupied.has(id))id+='-1';occupied.add(id);return id;};
 // No lateral wall offset was measured. Centre the four columns provisionally.
 const left=(room.w-(m.columns-1)*m.columnGap)/2;
 const front=room.d-m.doorWall-(m.rows-1)*m.rowGap;
 const boxes=Array.from({length:m.rows*m.columns},(_,n)=>({
  id:idFor(`port${n}`),kind:'floorbox',name:`바닥 단자 ${n+1}`,
  x:rounded(left+(n%m.columns)*m.columnGap),
  z:rounded(front+Math.floor(n/m.columns)*m.rowGap),
  w:.18,h:.015,depth:.18,estimated:true
 }));
 boxes.push({id:idFor('front-center-port'),kind:'floorbox',name:'맞은편 벽 중앙 단자',
  x:rounded(room.w/2),z:m.oppositeWall,w:.18,h:.015,depth:.18,estimated:true});
 return boxes;
}

// Update only known, untouched shipped presets, including the previous 3×4 layout.
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
 const xs=previousThirteen?[2.22,4.5,6.78]:ports.length===9?[1.8,4.5,7.2]:[.85,3.13,5.41];
 const zs=previousThirteen?[.85,2.96,5.07,7.18]:ports.length===9?[3.15,6.3,9.45]:[4.18,6.29,8.4];
 for(let n=0;n<(previousThirteen?12:9);n++){
  const f=ports.find(f=>f.id===`port${n}`);
  if(!f||f.estimated===false||!close(f.x,xs[n%3])||!close(f.z,zs[Math.floor(n/3)])||
     !close(f.w,.18)||!close(f.h,.015)||!close(f.depth,.18))return fixtures;
 }
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
