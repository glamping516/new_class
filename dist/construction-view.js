import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {SoftwareRenderer} from './software-renderer.js';
import {buildConstructionScene,constructionCamera} from './construction-scene.js';
import {floorboxRecords,constructionNote,layerSettings,dimensionLabel,terminalLabelPositions,floorboxDimensionSegments,floorboxNeighborSegments} from './construction-data.mjs';
import {pdfFromJpeg} from './pdf-export.mjs';
import {projectFileStem} from './project-info.mjs';
import {isMobileLayout} from './mobile-layout.js';
import {constructionPlan,planAppearance} from './construction-plan.mjs';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layerIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 9-5 9 5-9 5Zm0 5 9 5 9-5M3 17l9 5 9-5"/></svg>';

export function openConstructionView(current,sourceRoom,sourceItems,{toast=()=>{},onClose=()=>{}}={}){
 if(document.getElementById('constructionDialog'))return;
 const state=structuredClone(current),all=floorboxRecords(state),note=constructionNote(state);
 const root=document.createElement('dialog');root.id='constructionDialog';root.className='construction-dialog';root.setAttribute('aria-label','통신 공사 보기');
 root.innerHTML=`<header class="construction-header"><div class="construction-brand">${layerIcon}<span>배치 스튜디오<small>NETWORK · SITE REVIEW</small></span></div><div class="construction-title"><h1>단자함 · 바닥층 분리 보기</h1><span>${esc(state.title)} · ${state.room.w} × ${state.room.d}m</span></div><div class="construction-exports"><span id="constructionExportStatus" class="construction-export-status" role="status"></span><select id="constructionPaper" aria-label="통신 도면 PDF 용지"><option value="a3">A3</option><option value="a4">A4</option></select><button id="constructionPng">PNG 저장</button><button id="constructionPdf">PDF 저장</button><button id="constructionClose" class="construction-close" aria-label="통신 공사 보기 닫기">배치로 돌아가기 <span>×</span></button></div></header><div class="construction-workspace"><section class="construction-stage" aria-label="분리된 바닥층 3D 화면"><div class="construction-toolbar"><div class="construction-view-switch"><button id="constructionSplit" class="active">${layerIcon}층 분리</button><button id="constructionFloor">바닥만</button></div><button id="constructionTop" class="construction-top-lock" aria-pressed="false" aria-label="공간 정중앙 위에서 고정 보기">⊙ 정중앙 위에서 · 고정</button><button id="constructionFit" aria-label="분리 화면 전체 보기">화면 맞춤 ⤢</button></div><div id="constructionViewport" tabindex="0" aria-label="드래그로 회전하는 단자함 분리 보기"></div><svg id="constructionOverlay" aria-hidden="true"></svg><div id="constructionLabels"></div><div class="construction-layer-legend"><span><i></i>01 <b>가구 · 벽 · 고정 시설</b> <small>반투명 배치층</small></span><span><i></i>00 <b>바닥 · 단자함</b> <small>모서리 기준 거리</small></span><span class="construction-plan-key"><i></i><b id="constructionPlanLegend">평면 겹침 0개</b><small>상판 투영</small></span></div><div class="construction-hint" id="constructionHint">드래그 회전 · 휠 확대 · 번호 선택으로 위치 확인</div><div id="constructionEmpty" class="construction-empty" ${all.length?'hidden':''}><strong>등록된 바닥 단자함이 없습니다.</strong><p>배치로 돌아가 ‘공간’에서 바닥 단자함을 추가하세요.</p></div></section><aside class="construction-panel"><button id="constructionPanelToggle" class="mobile-only" aria-expanded="false" aria-controls="constructionPanelContent">단자함 ${all.length}개 · 위치표 / 층 설정 <small>펼치기</small><span aria-hidden="true">⌃</span></button><div id="constructionPanelContent" class="construction-panel-content"><div class="construction-panel-heading"><span class="construction-eyebrow">FLOOR TERMINALS</span><h2>현재 단자함 <b id="constructionCount">${all.length}</b></h2><p>번호를 선택하면 사방 벽과 인근 단자함까지 모서리 기준 거리를 표시합니다.</p></div><div class="construction-layer-controls"><label for="constructionLift">층 분리 높이 <output id="constructionLiftValue">340cm</output></label><input id="constructionLift" type="range" min="200" max="600" step="10" value="340"><label for="constructionOpacity">가구 · 상부 표시 농도 <output id="constructionOpacityValue">22%</output></label><input id="constructionOpacity" type="range" min="5" max="45" step="1" value="22"><div class="construction-checks"><label><input id="constructionDimensions" type="checkbox" checked>벽 거리</label><label><input id="constructionNeighborDimensions" type="checkbox" checked>단자 사이</label><label><input id="constructionHidden" type="checkbox" checked>숨긴 단자 포함</label></div><small>층 분리 높이는 화면에서만 적용됩니다.</small></div><section id="constructionPlanPanel" class="construction-plan-panel" hidden><h3>책상 · 단자함 겹침 확인</h3><div class="construction-checks"><label><input id="constructionFurniture" type="checkbox" checked>가구 외곽</label><label><input id="constructionFurnitureLabels" type="checkbox" ${isMobileLayout()?'':'checked'}>가구 번호</label></div><p id="constructionPlanSummary" aria-live="polite"></p><div id="constructionPlanOverlaps"></div><small>바닥에 놓인 가구 외곽 · 책상은 상판 투영 기준<br>붉은색은 단자함과 평면에서 겹치는 부분입니다.</small></section><section class="construction-selected" id="constructionSelected" aria-live="polite"></section><div class="construction-list-head"><span>단자함</span><span>왼쪽벽</span><span>정면벽</span></div><div id="constructionList" class="construction-terminal-list"></div><div class="construction-coordinate-key">거리 기준 · 가까운 모서리 / cm<br>X = 왼쪽벽 → 왼쪽 모서리 · Z = 정면벽 → 정면 모서리</div><p class="construction-note">${esc(note)}</p><div class="construction-credit">made by 강민준</div></div></aside></div>`;
 document.body.appendChild(root);root.showModal();
 const $=id=>root.querySelector('#'+id),stage=$('constructionViewport');
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch{renderer=new SoftwareRenderer();}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));stage.appendChild(renderer.domElement);
 const model=buildConstructionScene(state,sourceRoom,sourceItems);
 let records=all,selectedId=all[0]?.id,settings=layerSettings(),camera,controls,mode='split',dirty=true,closed=false,raf=0;
 let plan=constructionPlan(state,records);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
 let animating=!reduced;
 const point=(x,y,z)=>{const p=new THREE.Vector3(x,y,z).project(camera);return{x:(p.x+1)*stage.clientWidth/2,y:(1-p.y)*stage.clientHeight/2,visible:p.z>-1&&p.z<1};};
 const p2=(x,z)=>point(x,.08,z);
 function fit(){
  const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
  controls?.dispose();const fitted=constructionCamera(state.room,w,h,{mode,lift:settings.lift});camera=fitted.camera;
  // No orbit/pan/zoom handlers are attached in the fixed overhead view.
  controls=fitted.locked?null:new OrbitControls(camera,renderer.domElement);
  if(controls){controls.target.copy(fitted.target);controls.enableDamping=false;controls.minDistance=3;controls.maxDistance=150;controls.minZoom=.35;controls.maxZoom=6;controls.maxPolarAngle=Math.PI/2-.07;controls.screenSpacePanning=true;controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;controls.addEventListener('change',()=>dirty=true);controls.update();}
  renderer.setSize(w,h,false);dirty=true;
 }
 function refresh(){
  records=floorboxRecords(state,{includeHidden:$('constructionHidden').checked});
  if(!records.some(f=>f.id===selectedId))selectedId=records[0]?.id;
  $('constructionCount').textContent=records.length;
  plan=constructionPlan(state,records);
  $('constructionPlanLegend').textContent='평면 겹침 '+plan.covered.length+'개';
  $('constructionPlanPanel').hidden=mode!=='top';
  $('constructionPlanSummary').textContent=plan.footprints.length?`가구 ${plan.footprints.length}개 · 겹친 단자함 ${plan.covered.length}개`:'배치된 가구가 없습니다. 배치 화면에서 책상을 놓으면 함께 표시됩니다.';
  $('constructionPlanOverlaps').innerHTML=plan.covered.map(c=>`<button data-plan-terminal="${esc(c.id)}" aria-label="${esc(c.code+' 평면 겹침 확인')}"><b>${c.code}</b><span>${esc(c.items.map(i=>i.code+' '+i.name).join(' · '))}</span></button>`).join('');
  for(const b of root.querySelectorAll('[data-plan-terminal]'))b.onclick=()=>choose(b.dataset.planTerminal);
  $('constructionList').innerHTML=records.map(f=>`<button class="construction-terminal ${f.id===selectedId?'selected':''}" data-terminal="${esc(f.id)}" aria-label="${esc(f.code+' '+f.name+' 선택')}" aria-pressed="${f.id===selectedId}"><span><b>${f.code}</b><small>${esc(f.name)}${f.hidden?' · 숨김':''}</small></span><strong>${f.left}</strong><strong>${f.front}</strong></button>`).join('')||'<p class="construction-no-terminals">표시할 단자함이 없습니다.</p>';
  for(const b of root.querySelectorAll('[data-terminal]'))b.onclick=()=>choose(b.dataset.terminal);
  const f=records.find(f=>f.id===selectedId);
  const covered=plan.coverage.find(c=>c.id===selectedId)?.items||[];
  $('constructionSelected').innerHTML=f?`<div><b>${f.code}</b><strong>${esc(f.name)}</strong></div><dl><div><dt>왼쪽벽 → 모서리</dt><dd>${f.left}<small>cm</small></dd></div><div><dt>정면벽 → 모서리</dt><dd>${f.front}<small>cm</small></dd></div><div><dt>오른쪽벽 → 모서리</dt><dd>${f.right}<small>cm</small></dd></div><div><dt>후면벽 → 모서리</dt><dd>${f.back}<small>cm</small></dd></div></dl>${mode==='top'?`<p class="construction-coverage ${covered.length?'has-overlap':''}">${covered.length?'평면 겹침 · '+covered.map(i=>esc(i.code+' '+i.name)).join(' · '):'가구와 겹치지 않는 단자함입니다.'}</p>`:''}<section class="construction-neighbors" aria-label="인근 단자함 모서리 기준 거리"><h3>인근 단자함 · 모서리 사이</h3>${floorboxNeighborSegments(f,records).map(n=>`<button data-neighbor="${esc(n.targetId)}" aria-label="${esc(n.code+' 단자함으로 이동')}"><span>${n.code}<small>${({left:'왼쪽',right:'오른쪽',front:'앞쪽',back:'뒤쪽'})[n.direction]||'대각선'}</small></span><strong>${n.distance}<small>cm</small></strong></button>`).join('')||'<p>비교할 인근 단자함이 없습니다.</p>'}<p>빈 간격 기준 · 대각선은 가까운 모서리 사이 최단거리입니다.</p></section>`:'<p>단자함을 선택하세요.</p>';
  for(const b of root.querySelectorAll('[data-neighbor]'))b.onclick=()=>choose(b.dataset.neighbor);
  model.update({...settings,floorOnly:mode!=='split',includeHidden:$('constructionHidden').checked,selectedId});dirty=true;
 }
 function choose(id){selectedId=id;refresh();const mobile=isMobileLayout();if(mobile){
  root.classList.add('construction-panel-open');$('constructionPanelToggle').setAttribute('aria-expanded','true');$('constructionPanelToggle').querySelector('small').textContent='접기';
 }
  const pane=mobile?$('constructionPanelContent'):root.querySelector('.construction-panel'),details=$('constructionSelected');
  pane.scrollTop+=details.getBoundingClientRect().top-pane.getBoundingClientRect().top-12;
 }
 function markerPositions(){return terminalLabelPositions(records.map(f=>({record:f,...point(f.x,.35,f.z)})).filter(p=>p.visible),isMobileLayout()?{width:36,height:25,viewport:{width:stage.clientWidth,height:stage.clientHeight}}:undefined);}
 function planVisible(){return mode==='top'&&$('constructionFurniture').checked;}
 function planLabels(){
  if(!planVisible()||!$('constructionFurnitureLabels').checked)return[];
  const occupied=markerPositions().map(p=>({x:p.x-24,y:p.y-28,w:48,h:30})),labels=[];
  for(const item of plan.footprints.filter(f=>f.desk||f.overlaps.length)){
   const anchor=p2(item.x,item.z),points=item.polygon.map(p=>p2(p.x,p.z));
   const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
   const candidates=[[anchor.x,minY+12],[anchor.x,maxY-3],[anchor.x-31,anchor.y+4],[anchor.x+31,anchor.y+4],[anchor.x,anchor.y+4]];
   for(const [x,y]of candidates){const box={x:x-17,y:y-12,w:34,h:15};
    if(box.x<3||box.y<3||box.x+box.w>stage.clientWidth-3||box.y+box.h>stage.clientHeight-3)continue;
    if(occupied.some(r=>box.x<r.x+r.w+3&&box.x+box.w>r.x-3&&box.y<r.y+r.h+3&&box.y+box.h>r.y-3))continue;
    occupied.push(box);labels.push({item,x,y,anchor});break;
   }
  }
  return labels;
 }
 function planSvg(){
  if(!planVisible())return'';
  const points=polygon=>polygon.map(p=>{const q=p2(p.x,p.z);return`${q.x},${q.y}`;}).join(' ');
  let svg='<g class="construction-plan-footprints">';
  for(const item of plan.footprints){const style=planAppearance(item);
   svg+=`<polygon class="construction-plan-item ${item.overlaps.length?'has-overlap':''}" points="${points(item.polygon)}" style="stroke:${style.stroke};fill:${style.fill};fill-opacity:${Math.min(.55,style.alpha*settings.opacity/.22)}"><title>${esc(item.code+' '+item.name)}</title></polygon>`;
   for(const hit of item.overlaps)svg+=`<polygon class="construction-plan-intersection" points="${points(hit.polygon)}"/>`;
  }
  for(const f of records){const e=f.edges,covered=plan.covered.some(c=>c.id===f.id);svg+=`<polygon class="construction-plan-plate ${covered?'has-overlap':''}" points="${points([{x:e.minX,z:e.minZ},{x:e.maxX,z:e.minZ},{x:e.maxX,z:e.maxZ},{x:e.minX,z:e.maxZ}])}"/>`;}
  return svg+'</g>';
 }
 function dimensions(){
  const f=records.find(f=>f.id===selectedId);if(!f)return[];
  const lines=[...($('constructionNeighborDimensions').checked?floorboxNeighborSegments(f,records):[]),...($('constructionDimensions').checked?floorboxDimensionSegments(f,state.room):[])];
  const occupied=[];return lines.map(line=>{const m={...line,a:p2(line.a.x,line.a.z),b:p2(line.b.x,line.b.z)};const label=dimensionLabel(m.a,m.b,m.text,[...markerPositions(),...planLabels()],occupied);occupied.push(label.box);return{...m,label};});
 }
 function overlay(){
  let svg=planSvg();for(const {a,b,text,label,kind}of dimensions()){
   const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,tx=-dy/l*4,ty=dx/l*4;
   svg+=`<path class="${kind==='neighbor'?'construction-neighbor-line':''}" d="M${a.x} ${a.y}L${b.x} ${b.y}M${a.x-tx} ${a.y-ty}L${a.x+tx} ${a.y+ty}M${b.x-tx} ${b.y-ty}L${b.x+tx} ${b.y+ty}"/><text class="${kind==='neighbor'?'construction-neighbor-text':''}" x="${label.x}" y="${label.y}" text-anchor="middle">${text}</text>`;
  }
  for(const p of planLabels())svg+=`<text class="construction-plan-label" x="${p.x}" y="${p.y}" text-anchor="middle">${p.item.code}</text>`;
  let html='';for(const p of markerPositions()){const f=p.record;if(p.dx||p.dy)svg+=`<path class="construction-marker-leader" d="M${p.anchor.x} ${p.anchor.y}L${p.x} ${p.y-5}"/>`;html+=`<button class="construction-marker ${f.id===selectedId?'selected':''} ${mode==='top'&&plan.covered.some(c=>c.id===f.id)?'has-overlap':''}" data-marker="${esc(f.id)}" aria-label="${esc(f.code+' 단자함 위치 선택')}" style="left:${p.x}px;top:${p.y}px">${f.code}</button>`;}
  $('constructionOverlay').innerHTML=svg;
  const cues=[{text:'정면벽 · Z=0',x:state.room.w/2,z:-.48},{text:'후면벽',x:state.room.w/2,z:state.room.d+.48},{text:'왼쪽벽 · X=0',x:-.48,z:state.room.d/2}];
  for(const f of state.fixtures.filter(f=>!f.hidden&&['door','sink'].includes(f.kind))){const offset=f.offset+f.w/2;cues.push({text:f.name,x:f.wall==='left'?0:f.wall==='right'?state.room.w:offset,z:f.wall==='front'?0:f.wall==='back'?state.room.d:offset});}
  for(const f of cues){const p=p2(f.x,f.z);if(records.some(b=>{const q=point(b.x,.35,b.z);return Math.abs(p.x-q.x)<65&&Math.abs(p.y-q.y)<27;}))p.y+=28;if(p.visible)html+=`<span class="construction-wall-label" style="left:${p.x}px;top:${p.y}px">${esc(f.text)}</span>`;}
  $('constructionLabels').innerHTML=html;
  for(const b of root.querySelectorAll('[data-marker]'))b.onclick=()=>choose(b.dataset.marker);
 }
 function setMode(next){mode=next;animating=false;for(const [id,key]of[['constructionSplit','split'],['constructionFloor','floor'],['constructionTop','top']])$(id).classList.toggle('active',next===key);$('constructionLift').disabled=next!=='split';$('constructionOpacity').disabled=next==='floor';root.classList.toggle('construction-floor-only',next!=='split');root.classList.toggle('construction-top-locked',next==='top');root.classList.toggle('construction-plan-view',next==='top');const legend=root.querySelector('.construction-layer-legend>span:first-child');legend.querySelector('b').textContent=next==='top'?'책상 · 가구 외곽':'가구 · 벽 · 고정 시설';legend.querySelector('small').textContent=next==='top'?'현재 배치 위치':'반투명 배치층';$('constructionTop').setAttribute('aria-pressed',String(next==='top'));$('constructionHint').textContent=next==='top'?'책상·가구와 단자함 위치 비교 · 붉은색: 평면 겹침 · 회전·이동·확대 잠금':'드래그 회전 · 휠 확대 · 번호 선택으로 위치 확인';stage.setAttribute('aria-label',next==='top'?'책상과 단자함을 함께 확인하는 고정 평면도':'드래그로 회전하는 단자함 분리 보기');refresh();fit();}
 function tick(now){if(closed)return;raf=requestAnimationFrame(tick);if(animating){const t=Math.min(1,(now-start)/850),ease=1-Math.pow(1-t,3);model.upper.position.y=settings.lift*ease;dirty=true;if(t===1){animating=false;refresh();}}if(!dirty)return;dirty=false;renderer.render(model.scene,camera);overlay();}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 function wrap(c,text,x,y,width,lineHeight){let line='';for(const ch of text){if(c.measureText(line+ch).width>width){c.fillText(line,x,y);line='';y+=lineHeight;}line+=ch;}if(line)c.fillText(line,x,y);return y+lineHeight;}
 function snapshotCanvas(){
  animating=false;model.update({...settings,floorOnly:mode!=='split',selectedId,includeHidden:$('constructionHidden').checked});renderer.render(model.scene,camera);overlay();
  const selected=records.find(f=>f.id===selectedId),neighbors=selected?floorboxNeighborSegments(selected,records):[];
  const cv=document.createElement('canvas'),W=2600,H=Math.max(1700,1170+records.length*47+neighbors.length*32);cv.width=W;cv.height=H;const c=cv.getContext('2d');
  c.fillStyle='#081521';c.fillRect(0,0,W,H);c.fillStyle='#81d9e9';c.font='600 20px sans-serif';c.fillText('배치 스튜디오  /  NETWORK · SITE REVIEW',70,65);c.fillStyle='#effbff';c.font='600 43px sans-serif';c.fillText('단자함 · 바닥층 '+(mode==='split'?'분리 보기':mode==='top'?'평면 고정 보기':'단독 보기'),70,129);c.fillStyle='#91b3c5';c.font='24px sans-serif';c.fillText(`${state.title}  ·  ${state.room.w} × ${state.room.d}m  ·  벽 → 가까운 모서리 기준 / cm`,70,180);
  const area={x:35,y:215,w:1790,h:H-415},scale=Math.min(area.w/stage.clientWidth,area.h/stage.clientHeight),ox=area.x+(area.w-stage.clientWidth*scale)/2,oy=area.y+(area.h-stage.clientHeight*scale)/2;
  c.drawImage(renderer.domElement,ox,oy,stage.clientWidth*scale,stage.clientHeight*scale);c.save();c.translate(ox,oy);c.scale(scale,scale);
  if(planVisible()){
   const path=polygon=>{c.beginPath();polygon.forEach((p,n)=>{const q=p2(p.x,p.z);n?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);});c.closePath();};
   for(const item of plan.footprints){const style=planAppearance(item);path(item.polygon);c.globalAlpha=Math.min(.55,style.alpha*settings.opacity/.22);c.fillStyle=style.fill;c.fill();c.globalAlpha=1;c.strokeStyle=style.stroke;c.lineWidth=1.3;c.stroke();for(const hit of item.overlaps){path(hit.polygon);c.fillStyle='#ff6f58';c.globalAlpha=.55;c.fill();c.globalAlpha=1;}}
   for(const f of records){const e=f.edges,covered=plan.covered.some(c=>c.id===f.id);path([{x:e.minX,z:e.minZ},{x:e.maxX,z:e.minZ},{x:e.maxX,z:e.maxZ},{x:e.minX,z:e.maxZ}]);c.fillStyle=covered?'#ff7b61':'#ffc96f';c.globalAlpha=.65;c.fill();c.globalAlpha=1;c.strokeStyle=covered?'#ff9d8b':'#ffda9b';c.lineWidth=1.5;c.stroke();}
  }
  c.lineWidth=1;for(const {a,b,text,label,kind}of dimensions()){const color=kind==='neighbor'?'#ffcf89':'#81dbe9';c.strokeStyle=color;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.font='600 12px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#081521';c.strokeText(text,label.x,label.y);c.fillStyle=color;c.fillText(text,label.x,label.y);c.strokeStyle=color;c.lineWidth=1;}
  for(const p of planLabels()){c.font='600 9px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#081521';c.strokeText(p.item.code,p.x,p.y);c.fillStyle=p.item.overlaps.length?'#ffb19e':'#b2edf0';c.fillText(p.item.code,p.x,p.y);}
  for(const p of markerPositions()){const f=p.record;if(p.dx||p.dy){c.strokeStyle='#c0a26d';c.lineWidth=.8;c.beginPath();c.moveTo(p.anchor.x,p.anchor.y);c.lineTo(p.x,p.y-5);c.stroke();}c.fillStyle=f.id===selectedId?'#ffd58b':mode==='top'&&plan.covered.some(c=>c.id===f.id)?'#7f3b34':'#192b35';c.fillRect(p.x-18,p.y-20,36,19);c.fillStyle=f.id===selectedId?'#142733':'#ffd58b';c.font='600 11px sans-serif';c.textAlign='center';c.fillText(f.code,p.x,p.y-6);}
  for(const [text,x,z]of[['정면벽 · Z=0',state.room.w/2,-.48],['후면벽',state.room.w/2,state.room.d+.48],['왼쪽벽 · X=0',-.48,state.room.d/2]]){const p=p2(x,z);c.fillStyle='#a1ccdd';c.font='12px sans-serif';c.textAlign='center';c.fillText(text,p.x,p.y);}
  c.restore();c.textAlign='left';const tx=1880,tw=650;c.fillStyle='#172f41';c.fillRect(tx-22,231,tw,58);c.fillStyle='#9ec7d8';c.font='22px sans-serif';c.fillText('단자함',tx,269);c.fillText('왼쪽벽 X',tx+345,269);c.fillText('정면벽 Z',tx+490,269);
  records.forEach((f,n)=>{const y=329+n*47;c.fillStyle=f.id===selectedId?'#ffd28b':'#d4e7ef';c.font='600 22px sans-serif';c.fillText(f.code,tx,y);c.font='20px sans-serif';let name=f.name;while(c.measureText(name).width>230)name=name.slice(0,-2)+'…';c.fillText(name,tx+75,y);c.fillText(String(f.left),tx+360,y);c.fillText(String(f.front),tx+505,y);c.strokeStyle='#1c3848';c.beginPath();c.moveTo(tx,y+15);c.lineTo(tx+600,y+15);c.stroke();});
  const f=records.find(f=>f.id===selectedId),sy=360+records.length*47;
  if(f){
   c.fillStyle='#ffd28b';c.font='600 22px sans-serif';c.fillText(f.code+' 선택 단자함 · 모서리 기준',tx,sy);
   c.fillStyle='#a7c8d7';c.font='20px sans-serif';c.fillText(`왼쪽벽 ${f.left}cm  ·  정면벽 ${f.front}cm`,tx,sy+34);c.fillText(`오른쪽벽 ${f.right}cm  ·  후면벽 ${f.back}cm`,tx,sy+66);
   c.fillStyle='#ffd28b';c.font='600 21px sans-serif';c.fillText('인근 단자함 · 모서리 사이',tx,sy+110);
   c.font='20px sans-serif';neighbors.forEach((n,i)=>c.fillText(`${f.code} ↔ ${n.code}    ${n.distance}cm${n.direction?'':'  (대각선)'}`,tx,sy+145+i*32));
   if(mode==='top'){const covered=plan.coverage.find(g=>g.id===f.id)?.items||[];c.fillStyle=covered.length?'#ffb19e':'#93d9c8';c.font='20px sans-serif';wrap(c,covered.length?'평면'+' 겹침 · '+covered.map(i=>i.code+' '+i.name).join(' · '):'가구와 겹치지 않는 단자함',tx,sy+180+neighbors.length*32,600,28);}
  }
  c.fillStyle='#a0b8c7';c.font='22px sans-serif';wrap(c,note,70,H-140,W-140,32);c.fillStyle='#7196aa';c.font='20px sans-serif';c.fillText(mode==='top'?`가구 ${plan.footprints.length}개 · 평면 겹침 단자함 ${plan.covered.length}개 · 책상 상판·가구 외곽의 바닥 투영 기준`:'45 × 45cm 바닥 타일 · 층 분리 높이는 표시 효과이며 실제 배치 좌표는 유지됩니다.',70,H-55);c.textAlign='right';c.fillText('made by 강민준',W-70,H-55);return cv;
 }
 async function save(kind){
  const buttons=[$('constructionPng'),$('constructionPdf')];buttons.forEach(b=>b.disabled=true);$('constructionExportStatus').textContent=kind.toUpperCase()+' 파일을 만드는 중…';
  try{const cv=snapshotCanvas(),stem=projectFileStem(state)+'_단자함_'+(mode==='split'?'층분리':'바닥층');
   if(kind==='png'){const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));if(!blob)throw new Error('이미지를 만들 수 없습니다.');download(blob,stem+'.png');}
   else{const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/jpeg',.94));if(!blob)throw new Error('이미지를 만들 수 없습니다.');const bytes=new Uint8Array(await blob.arrayBuffer());download(new Blob([pdfFromJpeg(bytes,cv.width,cv.height,$('constructionPaper').value)],{type:'application/pdf'}),stem+'.pdf');}
   $('constructionExportStatus').textContent=kind.toUpperCase()+' 저장 완료 · 단자함 위치표 포함';toast('단자함 위치표를 포함한 '+kind.toUpperCase()+' 파일을 저장했습니다.');
  }catch(e){$('constructionExportStatus').textContent=e.message;toast(e.message);}finally{buttons.forEach(b=>b.disabled=false);dirty=true;}
 }
 const observer=new ResizeObserver(()=>fit());observer.observe(stage);
 const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);observer.disconnect();controls?.dispose();model.dispose();renderer.dispose?.();root.close();root.remove();onClose();document.getElementById('constructionBtn')?.focus();};
 root.addEventListener('cancel',e=>{e.preventDefault();close();});root.addEventListener('keydown',e=>{if(e.key==='Escape')close();e.stopPropagation();});
 $('constructionPanelToggle').onclick=()=>{const open=root.classList.toggle('construction-panel-open');$('constructionPanelToggle').setAttribute('aria-expanded',String(open));$('constructionPanelToggle').querySelector('small').textContent=open?'접기':'펼치기';};
 $('constructionClose').onclick=close;$('constructionSplit').onclick=()=>setMode('split');$('constructionFloor').onclick=()=>setMode('floor');$('constructionTop').onclick=()=>setMode('top');$('constructionFit').onclick=fit;
 $('constructionLift').oninput=()=>{settings=layerSettings({...settings,lift:Number($('constructionLift').value)/100});$('constructionLiftValue').textContent=$('constructionLift').value+'cm';animating=false;refresh();};
 $('constructionOpacity').oninput=()=>{settings=layerSettings({...settings,opacity:Number($('constructionOpacity').value)/100});$('constructionOpacityValue').textContent=$('constructionOpacity').value+'%';animating=false;refresh();};
 $('constructionFurniture').onchange=()=>dirty=true;$('constructionFurnitureLabels').onchange=()=>dirty=true;$('constructionDimensions').onchange=()=>dirty=true;$('constructionNeighborDimensions').onchange=()=>dirty=true;$('constructionHidden').onchange=refresh;$('constructionPng').onclick=()=>save('png');$('constructionPdf').onclick=()=>save('pdf');
 renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const r=stage.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=ray.intersectObjects([...model.markers.values()].filter(m=>m.group.visible).map(m=>m.group),true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.floorboxId)o=o.parent;if(o)choose(o.userData.floorboxId);}});
 fit();refresh();raf=requestAnimationFrame(tick);$('constructionClose').focus();return{close};
}
