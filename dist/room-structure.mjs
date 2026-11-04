import {clamp,round} from './geometry.mjs';

export const WALLS=[['front','정면'],['back','후면'],['left','왼쪽'],['right','오른쪽']];
export const FIXTURE_TYPES={
 door:{name:'출입문',w:.9,h:2.1,depth:.1,bottom:0},
 window:{name:'창문',w:1.2,h:1.2,depth:.12,bottom:.9},
 panel:{name:'전기 단자함',w:.6,h:.9,depth:.08,bottom:.6},
 idf:{name:'통신 단자함',w:.45,h:.4,depth:.1,bottom:.3},
 sink:{name:'싱크대',w:1.2,h:.85,depth:.6,bottom:0},
 floorbox:{name:'바닥 단자함',w:.18,h:.015,depth:.18,bottom:0}
};
export const wallLength=(wall,room)=>['front','back'].includes(wall)?room.w:room.d;
export function validateRoom(room){
 if(![room.w,room.d].every(v=>Number.isFinite(v)&&v>=3&&v<=30)||!Number.isFinite(room.h)||room.h<2||room.h>6)throw new Error('공간 가로·세로는 3~30m, 천장 높이는 2~6m로 입력하세요.');
}
export function validateFixtures(fixtures,room){
 if(fixtures.length>80)throw new Error('고정 시설은 최대 80개까지 추가할 수 있습니다.');
 const ids=new Set();
 for(const f of fixtures){
  if(!FIXTURE_TYPES[f.kind]||typeof f.id!=='string'||!/^[\w-]{1,100}$/.test(f.id)||ids.has(f.id))throw new Error('고정 시설 종류 또는 식별자가 올바르지 않습니다.');
  ids.add(f.id);
  if(![f.w,f.h,f.depth].every(Number.isFinite)||f.w<.02||f.w>30||f.h<.005||f.h>room.h||f.depth<.01||f.depth>3)throw new Error(`${f.name}의 가로·높이·깊이를 확인하세요.`);
  if(f.kind==='floorbox'){
   if(![f.x,f.z].every(Number.isFinite)||f.x<0||f.x>room.w||f.z<0||f.z>room.d)throw new Error(`${f.name}의 좌표가 공간 범위를 벗어납니다.`);
  }else{
   if(!WALLS.some(([key])=>key===f.wall)||![f.offset,f.bottom].every(Number.isFinite)||f.offset<0||f.bottom<0||f.offset+f.w>wallLength(f.wall,room)+.001||f.bottom+f.h>room.h+.001)throw new Error(`${f.name}의 위치 또는 크기가 벽 범위를 벗어납니다.`);
  }
 }
 for(const [wall] of WALLS){
  const holes=fixtures.filter(f=>!f.hidden&&f.wall===wall&&['door','window'].includes(f.kind)).sort((a,b)=>a.offset-b.offset);
  for(let n=1;n<holes.length;n++)if(holes[n].offset<holes[n-1].offset+holes[n-1].w-.001)throw new Error(`${holes[n-1].name}과 ${holes[n].name}이 겹칩니다. 시작점이나 벽 위치를 바꾸세요.`);
 }
 return fixtures;
}
// Keep real fixture sizes when the room changes; move only those outside the
// new boundaries. Openings are still validated rather than silently overlapping.
export function fitFixturesToRoom(fixtures,room){
 return fixtures.map(f=>{
  const next={...f};
  if(f.kind==='floorbox'){next.x=round(clamp(f.x,0,room.w));next.z=round(clamp(f.z,0,room.d));}
  else{next.offset=round(clamp(f.offset,0,Math.max(0,wallLength(f.wall,room)-f.w)));next.bottom=round(clamp(f.bottom,0,Math.max(0,room.h-f.h)));}
  return next;
 });
}
export function newFixture(kind,wall,room,fixtures,id){
 const preset=FIXTURE_TYPES[kind];if(!preset)throw new Error('추가할 시설을 선택하세요.');
 const count=fixtures.filter(f=>f.kind===kind).length+1;
 const f={...preset,id,kind,name:preset.name+' '+count,estimated:false};
 f.h=Math.min(f.h,room.h);f.bottom=Math.min(f.bottom,room.h-f.h);
 if(kind==='floorbox')return{...f,x:round(room.w/2),z:round(room.d/2)};
 f.wall=wall;const len=wallLength(wall,room);f.offset=.2;
 if(['door','window'].includes(kind)){
  const holes=fixtures.filter(x=>!x.hidden&&x.wall===wall&&['door','window'].includes(x.kind)).sort((a,b)=>a.offset-b.offset);
  for(const hole of holes){if(f.offset+f.w<=hole.offset-.1)break;f.offset=Math.max(f.offset,hole.offset+hole.w+.15);}
  if(f.offset+f.w>len)throw new Error('선택한 벽에 문·창문이 들어갈 여유가 없습니다. 다른 벽을 선택하거나 기존 시설을 옮기세요.');
 }
 f.offset=round(clamp(f.offset,0,len-f.w));return f;
}
