import {EXTRA_CATALOG} from './extra-furniture.mjs';
export const CATALOG=[
 {type:'computerDesk',name:'컴퓨터책상',dims:[1.5,.6,.72],count:18,category:'desk',photo:9,note:'실측 · 18개'},
 {type:'desk',name:'일반책상',dims:[1.4,.8,.7],count:2,category:'desk',photo:7,note:'실측 · 2개'},
 {type:'miniDesk',name:'미니책상',dims:[.9,.7,.72],count:1,category:'desk',photo:0,note:'실측 · 1개'},
 {type:'cabinet',name:'캐비닛',dims:[1,.52,2],count:1,category:'equipment',photo:8,note:'실측 · 1개'},
 {type:'partition140',name:'파티션 140',dims:[1.4,.045,1.2],count:2,category:'partition',photo:11,note:'폭·높이 실측'},
 {type:'partition80',name:'파티션 80',dims:[.8,.045,1.2],count:2,category:'partition',photo:10,note:'폭·높이 실측'},
 {type:'screen',name:'프로젝터 스크린',dims:[2.45,.1,1.8],count:1,category:'equipment',photo:1,note:'245 × 180cm'},
 {type:'miniRack',name:'스위치 미니랙',dims:[.6,.6,.9],count:1,category:'equipment',photo:1,note:'사진 참고 · 추정 치수'},
 {type:'miniFridge',name:'미니냉장고',dims:[.48,.5,.83],count:1,category:'equipment',photo:null,note:'추정 치수 · 수정 가능'},
 {type:'chair',name:'사무용 의자',dims:[.56,.58,.94],count:Infinity,category:'seating',photo:12,note:'추정 치수'},
 {type:'computer',name:'PC·모니터 세트',dims:[.82,.42,.5],count:Infinity,category:'equipment',photo:12,note:'시각화용 · 추정'},
 {type:'customObject',name:'새 물건 만들기',dims:[.6,.6,.8],count:Infinity,category:'equipment',photo:null,note:'이름·치수 직접 입력'},
 ...EXTRA_CATALOG
];
export const isDesk=type=>['computerDesk','desk','miniDesk'].includes(type);
// Slots are fixed: hiding one monitor never moves the remaining monitor.
// Keep the original small-desk single-monitor position as well.
export const monitorSlots=type=>type==='miniDesk'?[{key:'center',label:'모니터',x:0}]:isDesk(type)?[{key:'left',label:'왼쪽 모니터',x:-.36},{key:'right',label:'오른쪽 모니터',x:.36}]:[];
export function monitorsFor(item){return monitorSlots(item.type).map((_,n)=>item.monitors?.[n]!==false);}
export function validateMonitors(type,value){const slots=monitorSlots(type);if(value===undefined)return slots.map(()=>true);if(!Array.isArray(value)||value.length!==slots.length||value.some(v=>typeof v!=='boolean'))throw new Error('책상별 모니터 설정이 올바르지 않습니다.');return [...value];}

export const isWallBoard=type=>CATALOG.find(c=>c.type===type)?.wallMounted===true;
