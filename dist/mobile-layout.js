const query='(max-width:799px), (max-width:1100px) and (pointer:coarse)';
export const isMobileLayout=()=>window.matchMedia(query).matches;

// Fractions of the workspace, not the screen: browser bars and safe areas are already excluded.
export function sheetStops(height){
 const full=Math.max(84,Math.min(height-12,Math.max(280,height*.87)));
 return {peek:84,half:Math.min(full,Math.max(310,height*.53)),full};
}
export function sheetDestination(height,velocity,stops){
 const entries=Object.entries(stops).filter(([,value],n,a)=>!n||value!==a[n-1][1]);
 if(Math.abs(velocity)>.45){
  const ahead=entries.filter(([,value])=>velocity>0?value>height+8:value<height-8);
  if(ahead.length)return (velocity>0?ahead[0]:ahead.at(-1))[0];
 }
 return entries.reduce((best,current)=>Math.abs(current[1]-height)<Math.abs(best[1]-height)?current:best)[0];
}

export function initMobileLayout({onLayoutChange=()=>{}}={}){
 const $=id=>document.getElementById(id),sheet=$('sidebar'),handle=$('mobileSheetToggle');
 const media=window.matchMedia(query),workspace=sheet.closest('.workspace');
 let stop='peek',gesture=null,tab='catalog',selectionCount=0,suppressClick=false;
 const stops=()=>sheetStops(workspace.clientHeight);
 const contents=()=>[...sheet.children].filter(el=>el!==handle);
 function accessibility(){
  const collapsed=media.matches&&stop==='peek';
  for(const element of contents())element.inert=collapsed;
  handle.setAttribute('aria-expanded',String(!collapsed));
  handle.setAttribute('aria-label',collapsed?'가구 패널 펼치기':'가구 패널 접기');
  $('mobileSheetHint').textContent=collapsed?'위로 올려 가구 고르기 · 탭해서 추가':stop==='full'?'목록은 스크롤 · 손잡이를 내리면 접기':'위로 더 올리면 전체 목록 · 아래로 내리면 접기';
 }
 function snap(next){
  if(!media.matches)return;
  stop=next;sheet.dataset.sheetStop=stop;
  sheet.style.setProperty('--mobile-sheet-height',`${stops()[stop]}px`);
  sheet.classList.remove('sheet-dragging');accessibility();
 }
 function setTab(next,{expand=false}={}){
  if(next==='properties'&&!selectionCount)return;
  tab=next;sheet.dataset.mobileTab=next;
  if(media.matches){
   sheet.querySelectorAll('[data-side-tab]').forEach(b=>b.classList.toggle('active',b.dataset.sideTab===next));
   $('mobilePropertiesTab').classList.toggle('active',next==='properties');
   if(expand)snap(next==='properties'?'full':stop==='peek'?'half':stop);
  }
 }
 function showProperties(){setTab('properties',{expand:true});}
 function resetGesture(){gesture=null;sheet.classList.remove('sheet-dragging');}
 function applyMode(){
  resetGesture();
  if(media.matches){snap(stop);setTab(tab);}
  else{
   sheet.style.removeProperty('--mobile-sheet-height');
   for(const el of contents())el.inert=false;
   $('mobilePropertiesTab').classList.remove('active');
   // Return to the actual desktop tab, including after using mobile selection settings.
   sheet.querySelectorAll('[data-side-tab]').forEach(b=>b.classList.toggle('active',!$(b.dataset.sideTab==='catalog'?'catalogPane':'itemsPane').hidden));
  }
  onLayoutChange();
 }
 handle.addEventListener('click',e=>{
  if(suppressClick&&e.detail!==0){suppressClick=false;return;}
  suppressClick=false;
  snap(stop==='peek'?'half':'peek');
 });
 handle.addEventListener('keydown',e=>{
  if(!media.matches)return;
  if(e.key==='ArrowUp'){e.preventDefault();snap(stop==='peek'?'half':'full');}
  if(e.key==='ArrowDown'||e.key==='Escape'){e.preventDefault();snap(stop==='full'?'half':'peek');}
 });
 handle.addEventListener('pointerdown',e=>{
  if(!media.matches||e.button!==0)return;
  if(gesture)return;
  suppressClick=false;
  gesture={id:e.pointerId,startY:e.clientY,startHeight:sheet.getBoundingClientRect().height,lastY:e.clientY,lastTime:e.timeStamp,velocity:0,moved:false};
  handle.setPointerCapture(e.pointerId);
 });
 handle.addEventListener('pointermove',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  const dy=gesture.startY-e.clientY;
  if(Math.abs(dy)>5)gesture.moved=true;
  if(!gesture.moved)return;
  const dt=e.timeStamp-gesture.lastTime;
  if(dt>0)gesture.velocity=(gesture.lastY-e.clientY)/dt;
  gesture.lastY=e.clientY;gesture.lastTime=e.timeStamp;
  sheet.classList.add('sheet-dragging');
  const height=Math.min(stops().full,Math.max(stops().peek,gesture.startHeight+dy));
  sheet.style.setProperty('--mobile-sheet-height',`${height}px`);
  // Make the contents visible while opening, without changing the canvas dimensions.
  if(height>100){sheet.dataset.sheetStop='dragging';for(const el of contents())el.inert=false;}
 });
 handle.addEventListener('pointerup',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  const moved=gesture.moved,height=sheet.getBoundingClientRect().height;
  const velocity=e.timeStamp-gesture.lastTime>120?0:gesture.velocity;
  resetGesture();
  if(moved){suppressClick=true;snap(sheetDestination(height,velocity,stops()));}
 });
 handle.addEventListener('pointercancel',()=>{resetGesture();snap(stop);});
 handle.addEventListener('lostpointercapture',()=>{if(gesture){resetGesture();snap(stop);}});
 sheet.querySelectorAll('[data-side-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.sideTab,{expand:true})));
 $('mobilePropertiesTab').addEventListener('click',showProperties);
 $('mobileEditSelection').addEventListener('click',showProperties);
 $('catalogSearch').addEventListener('focus',()=>{if(media.matches)snap('full');});
 // Resetting a category starts its vertical list at the top; horizontal chips keep their own scroll.
 sheet.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{$('catalogPane').scrollTop=0;}));
 media.addEventListener('change',applyMode);
 new ResizeObserver(()=>{if(media.matches&&!gesture)snap(stop);}).observe(workspace);
 document.addEventListener('keydown',e=>{if(media.matches&&e.key==='Escape'&&!$('dialog').open)snap('peek');});
 applyMode();
 return {
  afterAdd(){if(media.matches){document.activeElement?.blur();snap('peek');}},
  selectionChanged(count){
   selectionCount=count;$('mobileSelectionCount').textContent=count;$('mobilePropertiesTab').disabled=!count;
   if(!count&&tab==='properties'){
    tab='catalog';sheet.dataset.mobileTab=tab;
    if(media.matches)$('sidebar').querySelector('[data-side-tab="catalog"]').click();
   }
  },
  setCatalogCount(count){$('mobileCatalogCount').textContent=count;},
  showProperties
 };
}
