// Coordinates are metres from the left/front walls to each box centre.
// The 85 cm side-wall reference and centre-to-centre interpretation are
// provisional; keep them visible in the room editor, rather than claiming a
// fully surveyed position. Box sizes remain estimates from the photographs.
export const FLOORBOX_MEASUREMENTS=Object.freeze({
 side:.85,columnGap:2.28,rowGap:2.11,doorWall:3.6,sinkWall:1.3
});
const close=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<.000001;
const rounded=v=>Math.round(v*1000)/1000;
export const isClassroomRoom=room=>close(room?.w,9)&&close(room?.d,12);

export function classroomFloorBoxes(fixtures=[]){
 const m=FLOORBOX_MEASUREMENTS;
 const boxes=Array.from({length:9},(_,n)=>({
  id:`port${n}`,kind:'floorbox',name:`바닥 단자 ${n+1}`,
  x:rounded(m.side+(n%3)*m.columnGap),
  z:rounded(12-m.doorWall-(2-Math.floor(n/3))*m.rowGap),
  w:.18,h:.015,depth:.18,estimated:true
 }));
 const sink=fixtures.find(f=>f.kind==='sink'&&f.wall==='front');
 const occupied=new Set(fixtures.filter(f=>f.kind!=='floorbox').map(f=>f.id));
 let sinkId='sink-port';while(occupied.has(sinkId))sinkId+='-1';
 boxes.push({id:sinkId,kind:'floorbox',name:'싱크대 옆 바닥 단자',
  x:rounded(sink?sink.offset+sink.w/2:7.925),z:m.sinkWall,
  w:.18,h:.015,depth:.18,estimated:true});
 return boxes;
}

// Refresh only the original, untouched classroom grid. Changed rooms, hand-
// positioned boxes, custom sizes, and deliberately removed boxes stay intact.
export function migrateLegacyFloorBoxes(fixtures,room){
 if(!isClassroomRoom(room))return fixtures;
 const ports=fixtures.filter(f=>f.kind==='floorbox');
 if(ports.length!==9)return fixtures;
 const sink=fixtures.find(f=>f.id==='sink'&&f.kind==='sink');
 const door=fixtures.find(f=>f.id==='door'&&f.kind==='door');
 if(!sink||sink.wall!=='front'||!close(sink.offset,7.2)||!close(sink.w,1.45)||
    !door||door.wall!=='back'||!close(door.offset,.45)||!close(door.w,1.4))return fixtures;
 for(let n=0;n<9;n++){
  const f=ports.find(f=>f.id===`port${n}`);
  if(!f||f.estimated===false||!close(f.x,[1.8,4.5,7.2][n%3])||
     !close(f.z,[3.15,6.3,9.45][Math.floor(n/3)])||
     !close(f.w,.18)||!close(f.h,.015)||!close(f.depth,.18))return fixtures;
 }
 const updated=classroomFloorBoxes(fixtures),byId=new Map(updated.map(f=>[f.id,f]));
 const next=fixtures.map(f=>f.kind==='floorbox'?{...f,x:byId.get(f.id).x,z:byId.get(f.id).z}:f);
 next.push({...updated.at(-1),hidden:ports.every(f=>f.hidden)});
 return next;
}
