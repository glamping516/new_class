import {clamp,round,dimsOf} from './geometry.mjs';

const swatch=(name,color)=>({name,color});
const basicSource='https://www.hansolhomedeco.com/extension/deco/product/index.do?depth2MenuId=MENU0000000000010248&depth3MenuId=MENU0000000000010250&proMode=productList';
const neutral=[swatch('화이트 프로스트','#eeeee5'),swatch('실버 섀도','#a4aaa9'),swatch('소프트 슬레이트','#535b60'),swatch('페일 가든','#c4cebc'),swatch('사일런트 샌드','#d5c9af'),swatch('미스티 로즈','#d2b8b4')];
const fabric=[swatch('화이트','#f0efe8'),swatch('아이보리','#e9e2ce'),swatch('연베이지','#d9cbb5'),swatch('그레이','#aaaead'),swatch('차콜','#50565b')];
const product=(type,name,dims,style,palette,options)=>({type,name,dims,style,palette,color:palette[0].color,model:'wallCover',category:'wallcover',count:Infinity,photo:null,wallCover:true,note:'제품 참고 · 색상·치수 수정',...options});

// Product names and module sizes follow the linked manufacturer/vendor pages.
// Display colors and textures are illustrative approximations, not color samples.
export const WALL_COVERS=[
 product('coverBasicStone','커버베이직 · 스톤 평판',[1.2,.006,2.4],'panel',[
  swatch('CB 클레이크림','#e6dfcf'),swatch('CB 클레이포그','#c8c9c3'),swatch('CB 클레이샌드','#c3af93'),swatch('칸테라웜그레이','#b4afa5'),swatch('칸테라그레이','#9b9e9b')
 ],{brand:'한솔홈데코',unit:[1.2,.006,2.4],sourceUrl:basicSource,sourceName:'한솔홈데코 · 커버베이직',dimensionSource:'https://m4sys.com/wall_material.html',description:'전체 벽을 차분하게 정리하는 평판형 마감. 단위 규격은 120 × 240cm, 두께 6mm입니다.',recommended:true}),
 product('coverBasicWood','커버베이직 · 우드 평판',[1.2,.006,2.4],'woodPanel',[
  swatch('메종오크','#c6aa7f'),swatch('메종월넛','#795b43')
 ],{brand:'한솔홈데코',unit:[1.2,.006,2.4],sourceUrl:basicSource,sourceName:'한솔홈데코 · 커버베이직',dimensionSource:'https://m4sys.com/wall_material.html',description:'세로 홈 없이 나무색으로 전체 벽을 정리하는 우드 패턴 평판입니다.'}),
 product('akustoWallA','Akusto Wall A · 흡음패널',[1.2,.04,2.7],'acoustic',neutral,
 {brand:'Ecophon',unit:[1.2,.04,2.7],sourceUrl:'https://www.ecophon.com/en/products/wall-applications/akusto/akusto-wall-a2/',sourceName:'Ecophon · Akusto Wall A',description:'울림 개선을 함께 검토할 수 있는 벽면용 흡음패널. 단위 규격 120 × 270 × 4cm입니다.'}),
 product('akupanel240','Akupanel 240 · 우드 슬랫',[.6,.022,2.4],'slat',[
  swatch('클래식 오크','#c8a574'),swatch('월넛','#78543b'),swatch('블랙 애시','#333936'),swatch('러스틱 그레이 오크','#9b9b8f')
 ],{brand:'WoodUpp',unit:[.6,.022,2.4],sourceUrl:'https://woodupp.com/products/akupanel-acoustic-panel-natural-wood-classic-oak-black-felt-240-x-60-cm',sourceName:'WoodUpp · Akupanel',description:'세로 슬랫과 어두운 바탕이 있는 우드 패널. 단위 규격 60 × 240 × 2.2cm이며 국내 공급·시공은 별도 확인이 필요합니다.'}),
 product('rollTc','TC무지 · 방염 롤스크린',[1.5,.055,2.7],'roller',[
  ...fabric.slice(0,3),swatch('그레이','#aaaead'),swatch('쿨그레이','#b7c0c5'),swatch('애쉬그레이','#777c7b'),swatch('그린','#788b77'),swatch('블루','#6c8498')
 ],{brand:'아라크네',maxUnitWidth:2.4,sourceUrl:'https://m.aracne.kr/product/list_thumb.html?cate_no=104',sourceName:'아라크네 · 방염 TC무지',description:'천장·벽 상단에 달아 내리는 가림 방식. 배치 기본값은 맞춤 예시이며 상단 케이스 깊이는 추정값입니다.'}),
 product('rollBlackout','암막방염 · 양면 롤스크린',[1.5,.06,2.7],'roller',fabric,
 {brand:'아라크네',maxUnitWidth:2.4,sourceUrl:'https://m.aracne.kr/product/list_thumb.html?cate_no=104',sourceName:'아라크네 · 암막방염 롤스크린',description:'비침을 줄이는 암막형 롤스크린. 색상과 배치 크기는 비교용 예시이며 제품 옵션은 판매처에서 확인하세요.'}),
 product('curtainFr223','FR223 · 방염 암막커튼',[2,.12,2.7],'curtain',[
  ...fabric.slice(0,3),swatch('베이지','#c0a98c'),swatch('인디언핑크','#b88b8d'),swatch('민트','#b0c7bb'),swatch('올리브','#858870'),swatch('그린','#536f60'),fabric[3],swatch('딥그레이','#727778'),fabric[4],swatch('네이비','#344b63'),swatch('버건디','#743f4c'),swatch('블랙','#292e31')
 ],{brand:'다하임',sourceUrl:'https://daheim.co.kr/product/fr223-안타론-3중지-방염-암막커튼-14color-색상선택/827/',sourceName:'다하임 · FR223 14color',description:'레일을 따라 좌우로 여닫는 맞춤 커튼. 14색으로 비교하며 배치 치수는 덮는 폭, 실제 원단 주문 폭·주름 배수는 별도입니다.'})
];
const byType=new Map(WALL_COVERS.map(c=>[c.type,c]));
export const coverSpec=type=>byType.get(type);
export const isWallCover=type=>byType.has(type);
export const coverColor=item=>/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:coverSpec(item.type)?.color;
export const coverColorName=item=>coverSpec(item.type)?.palette.find(p=>p.color.toLowerCase()===coverColor(item)?.toLowerCase())?.name||'직접 선택한 색';
export const WALL_NAMES={front:'정면',back:'후면',left:'왼쪽',right:'오른쪽'};
export const wallSpan=(wall,room)=>['front','back'].includes(wall)?room.w:room.d;
export function nearestWall(item,room){return Object.entries({front:item.z,back:room.d-item.z,left:item.x,right:room.w-item.x}).sort((a,b)=>a[1]-b[1])[0][0];}
export function fitCoverToWall(item,wall,room,{full=false}={}){
 if(!isWallCover(item.type)||!WALL_NAMES[wall])throw new Error('벽마감 종류와 벽 위치를 확인하세요.');
 const c=coverSpec(item.type),d=[...(item.dims||c.dims)],len=wallSpan(wall,room);
 d[0]=full?len:Math.min(d[0],len);d[2]=full?room.h:Math.min(d[2],room.h);
 const p={...item,dims:d,y:full?0:clamp(item.y||0,0,room.h-d[2]),rot:{front:0,back:180,left:90,right:270}[wall],coverWall:wall,coverFit:full,color:coverColor(item),coverOpen:item.coverOpen===true};
 if(['front','back'].includes(wall)){p.x=full?room.w/2:clamp(item.x,d[0]/2,room.w-d[0]/2);p.z=wall==='front'?d[1]/2+.002:room.d-d[1]/2-.002;}
 else{p.z=full?room.d/2:clamp(item.z,d[0]/2,room.d-d[0]/2);p.x=wall==='left'?d[1]/2+.002:room.w-d[1]/2-.002;}
 p.x=round(p.x);p.z=round(p.z);return p;
}
export function validateCoverAppearance(raw,item,room){
 if(!isWallCover(item.type))return item;
 if(raw.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(raw.color))throw new Error('벽마감 색상이 올바르지 않습니다.');
 for(const key of ['coverOpen','coverFit'])if(raw[key]!==undefined&&typeof raw[key]!=='boolean')throw new Error('벽마감 설정이 올바르지 않습니다.');
 if(raw.coverWall!==undefined&&!WALL_NAMES[raw.coverWall])throw new Error('벽마감 벽 위치가 올바르지 않습니다.');
 item.color=raw.color||coverSpec(item.type).color;item.coverOpen=raw.coverOpen===true;
 if(raw.coverWall)item.coverWall=raw.coverWall;
 item.coverFit=raw.coverFit===true&&!!raw.coverWall;
 return item.coverFit?fitCoverToWall(item,item.coverWall,room,{full:true}):item;
}
export function validItemDimensions(type,dims){
 return Array.isArray(dims)&&dims.length===3&&dims.every((v,n)=>Number.isFinite(v)&&v>=(isWallCover(type)&&n===1?.003:.015)&&v<=(isWallCover(type)?[30,.5,6][n]:8));
}
export function coverIsAttached(item,room){
 const wall=item.coverWall,d=item.dims||coverSpec(item.type)?.dims;if(!d||!WALL_NAMES[wall])return false;
 const rotation={front:0,back:180,left:90,right:270}[wall];if(Math.abs((((item.rot||0)-rotation)%360+540)%360-180)>.01)return false;
 const gap=wall==='front'?item.z:wall==='back'?room.d-item.z:wall==='left'?item.x:room.w-item.x;
 return Math.abs(gap-d[1]/2)<.02;
}
export function releaseMovedCover(item,room){
 if(!isWallCover(item.type)||!item.coverFit)return item;
 const d=item.dims||coverSpec(item.type).dims,along=['front','back'].includes(item.coverWall)?item.x:item.z;
 if(!coverIsAttached(item,room)||Math.abs(d[0]-wallSpan(item.coverWall,room))>.005||Math.abs(d[2]-room.h)>.005||Math.abs(along-wallSpan(item.coverWall,room)/2)>.005||Math.abs(item.y||0)>.005){item.coverFit=false;delete item.coverWall;}
 return item;
}
export function coverCutouts(item,room,fixtures,items=[],catalog=[]){
 if(!coverIsAttached(item,room)||['roller','curtain'].includes(coverSpec(item.type).style))return[];
 const [w,,h]=item.dims||coverSpec(item.type).dims,holes=[],r=(item.rot||0)*Math.PI/180;
 const add=(center,width,bottom,height)=>{const x1=clamp(center-width/2-.012,-w/2,w/2),x2=clamp(center+width/2+.012,-w/2,w/2),y1=clamp(bottom-(item.y||0)-.012,0,h),y2=clamp(bottom+height-(item.y||0)+.012,0,h);if(x2>x1&&y2>y1)holes.push({x1,x2,y1,y2});};
 for(const f of fixtures.filter(f=>!f.hidden&&f.wall===item.coverWall&&['door','window','panel','idf'].includes(f.kind))){
  const position=f.offset+f.w/2,center=item.coverWall==='front'?position-item.x:item.coverWall==='back'?item.x-position:item.coverWall==='left'?item.z-position:position-item.z;
  add(center,f.w,f.bottom||0,f.h);
 }
 // Existing wall-mounted whiteboards remain usable in front of the cladding.
 for(const other of items){const c=catalog.find(c=>c.type===other.type);if(!c?.wallMounted)continue;const deltaX=other.x-item.x,deltaZ=other.z-item.z,normal=deltaX*Math.sin(r)+deltaZ*Math.cos(r);if(Math.abs(normal)>.15)continue;const d=dimsOf(other,catalog);add(deltaX*Math.cos(r)-deltaZ*Math.sin(r),d[0],other.y||0,d[2]);}
 return holes;
}
export function solidRegions(width,height,holes=[]){
 const xs=[-width/2,width/2,...holes.flatMap(h=>[clamp(h.x1,-width/2,width/2),clamp(h.x2,-width/2,width/2)])].sort((a,b)=>a-b),ys=[0,height,...holes.flatMap(h=>[clamp(h.y1,0,height),clamp(h.y2,0,height)])].sort((a,b)=>a-b),result=[];
 for(let x=1;x<xs.length;x++)for(let y=1;y<ys.length;y++){const x1=xs[x-1],x2=xs[x],y1=ys[y-1],y2=ys[y];if(x2-x1<.0001||y2-y1<.0001)continue;const mx=(x1+x2)/2,my=(y1+y2)/2;if(!holes.some(h=>mx>h.x1&&mx<h.x2&&my>h.y1&&my<h.y2))result.push({x1,x2,y1,y2});}
 return result;
}
export const coverRollCount=(item,room)=>Math.ceil((item.dims||coverSpec(item.type).dims)[0]/(coverSpec(item.type).maxUnitWidth||30));
