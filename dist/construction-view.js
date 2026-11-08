import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {SoftwareRenderer} from './software-renderer.js';
import {buildConstructionScene,constructionCamera} from './construction-scene.js';
import {floorboxRecords,constructionNote,layerSettings,dimensionLabel,terminalLabelPositions} from './construction-data.mjs';
import {pdfFromJpeg} from './pdf-export.mjs';
import {projectFileStem} from './project-info.mjs';
import {isMobileLayout} from './mobile-layout.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const layerIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 9-5 9 5-9 5Zm0 5 9 5 9-5M3 17l9 5 9-5"/></svg>';

export function openConstructionView(current,sourceRoom,sourceItems,{toast=()=>{},onClose=()=>{}}={}){
 if(document.getElementById('constructionDialog'))return;
 const state=structuredClone(current),all=floorboxRecords(state),note=constructionNote(state);
 const root=document.createElement('dialog');root.id='constructionDialog';root.className='construction-dialog';root.setAttribute('aria-label','통신 공사 보기');
 root.innerHTML=`<header class="construction-header"><div class="construction-brand">${layerIcon}<span>배치 스튜디오<small>NETWORK · SITE REVIEW</small></span></div><div class="construction-title"><h1>단자함 · 바닥층 분리 보기</h1><span>${esc(state.title)} · ${state.room.w} × ${state.room.d}m</span></div><div class="construction-exports"><span id="constructionExportStatus" class="construction-export-status" role="status"></span><select id="constructionPaper" aria-label="통신 도면 PDF 용지"><option value="a3">A3</option><option value="a4">A4</option></select><button id="constructionPng">PNG 저장</button><button id="constructionPdf">PDF 저장</button><button id="constructionClose" class="construction-close" aria-label="통신 공사 보기 닫기">배치로 돌아가기 <span>×</span></button></div></header><div class="construction-workspace"><section class="construction-stage" aria-label="분리된 바닥층 3D 화면"><div class="construction-toolbar"><div class="construction-view-switch"><button id="constructionSplit" class="active">${layerIcon}층 분리</button><button id="constructionFloor">바닥만</button></div><button id="constructionTop" class="construction-top-lock" aria-pressed="false" aria-label="공간 정중앙 위에서 고정 보기">⊙ 정중앙 위에서 · 고정</button><button id="constructionFit" aria-label="분리 화면 전체 보기">화면 맞춤 ⤢</button></div><div id="constructionViewport" tabindex="0" aria-label="드래그로 회전하는 단자함 분리 보기"></div><svg id="constructionOverlay" aria-hidden="true"></svg><div id="constructionLabels"></div><div class="construction-layer-legend"><span><i></i>01 <b>가구 · 벽 · 고정 시설</b> <small>반투명 배치층</small></span><span><i></i>00 <b>바닥 · 단자함</b> <small>실제 X / Z 위치</small></span></div><div class="construction-hint" id="constructionHint">드래그 회전 · 휠 확대 · 번호 선택으로 위치 확인</div><div id="constructionEmpty" class="construction-empty" ${all.length?'hidden':''}><strong>등록된 바닥 단자함이 없습니다.</strong><p>배치로 돌아가 ‘공간’에서 바닥 단자함을 추가하세요.</p></div></section><aside class="construction-panel"><button id="constructionPanelToggle" class="mobile-only" aria-expanded="false" aria-controls="constructionPanelContent">단자함 ${all.length}개 · 위치표 / 층 설정 <small>펼치기</small><span aria-hidden="true">⌃</span></button><div id="constructionPanelContent" class="construction-panel-content"><div class="construction-panel-heading"><span class="construction-eyebrow">FLOOR TERMINALS</span><h2>현재 단자함 <b id="constructionCount">${all.length}</b></h2><p>번호를 선택하면 벽에서의 거리를 표시합니다.</p></div><div class="construction-layer-controls"><label for="constructionLift">층 분리 높이 <output id="constructionLiftValue">340cm</output></label><input id="constructionLift" type="range" min="200" max="600" step="10" value="340"><label for="constructionOpacity">상부 표시 농도 <output id="constructionOpacityValue">22%</output></label><input id="constructionOpacity" type="range" min="5" max="45" step="1" value="22"><div class="construction-checks"><label><input id="constructionDimensions" type="checkbox" checked>벽 거리</label><label><input id="constructionHidden" type="checkbox" checked>숨긴 단자 포함</label></div><small>층 분리 높이는 화면에서만 적용됩니다.</small></div><section class="construction-selected" id="constructionSelected" aria-live="polite"></section><div class="construction-list-head"><span>단자함</span><span>왼쪽벽</span><span>정면벽</span></div><div id="constructionList" class="construction-terminal-list"></div><div class="construction-coordinate-key">좌표 기준 · 단자함 중심 / cm<br>X = 왼쪽벽에서 · Z = 정면벽에서</div><p class="construction-note">${esc(note)}</p><div class="construction-credit">made by 강민준</div></div></aside></div>`;
 document.body.appendChild(root);root.showModal();
 const $=id=>root.querySelector('#'+id),stage=$('constructionViewport');
 let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch{renderer=new SoftwareRenderer();}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));stage.appendChild(renderer.domElement);
 const model=buildConstructionScene(state,sourceRoom,sourceItems);
 let records=all,selectedId=all[0]?.id,settings=layerSettings(),camera,controls,mode='split',dirty=true,closed=false,raf=0;
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
  $('constructionList').innerHTML=records.map(f=>`<button class="construction-terminal ${f.id===selectedId?'selected':''}" data-terminal="${esc(f.id)}" aria-label="${esc(f.code+' '+f.name+' 선택')}" aria-pressed="${f.id===selectedId}"><span><b>${f.code}</b><small>${esc(f.name)}${f.hidden?' · 숨김':''}</small></span><strong>${f.left}</strong><strong>${f.front}</strong></button>`).join('')||'<p class="construction-no-terminals">표시할 단자함이 없습니다.</p>';
  for(const b of root.querySelectorAll('[data-terminal]'))b.onclick=()=>choose(b.dataset.terminal);
  const f=records.find(f=>f.id===selectedId);
  $('constructionSelected').innerHTML=f?`<div><b>${f.code}</b><strong>${esc(f.name)}</strong></div><dl><div><dt>왼쪽벽 → 중심</dt><dd>${f.left}<small>cm</small></dd></div><div><dt>정면벽 → 중심</dt><dd>${f.front}<small>cm</small></dd></div><div><dt>오른쪽벽 → 중심</dt><dd>${f.right}<small>cm</small></dd></div><div><dt>후면벽 → 중심</dt><dd>${f.back}<small>cm</small></dd></div></dl>`:'<p>단자함을 선택하세요.</p>';
  model.update({...settings,floorOnly:mode!=='split',includeHidden:$('constructionHidden').checked,selectedId});dirty=true;
 }
 function choose(id){selectedId=id;refresh();if(isMobileLayout()){
  root.classList.add('construction-panel-open');$('constructionPanelToggle').setAttribute('aria-expanded','true');$('constructionPanelToggle').querySelector('small').textContent='접기';
  const pane=$('constructionPanelContent'),details=$('constructionSelected');
  pane.scrollTop+=details.getBoundingClientRect().top-pane.getBoundingClientRect().top-12;
 }}
 function markerPositions(){return terminalLabelPositions(records.map(f=>({record:f,...point(f.x,.35,f.z)})).filter(p=>p.visible),isMobileLayout()?{width:36,height:25,viewport:{width:stage.clientWidth,height:stage.clientHeight}}:undefined);}
 function dimensions(){
  const f=records.find(f=>f.id===selectedId);if(!f||!$('constructionDimensions').checked)return[];
  const occupied=[];return[{a:p2(0,f.z),b:p2(f.x,f.z),text:'X · '+f.left+'cm'},{a:p2(f.x,0),b:p2(f.x,f.z),text:'Z · '+f.front+'cm'}].map(m=>{const label=dimensionLabel(m.a,m.b,m.text,markerPositions(),occupied);occupied.push(label.box);return{...m,label};});
 }
 function overlay(){
  let svg='';for(const {a,b,text,label}of dimensions()){
   const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,tx=-dy/l*4,ty=dx/l*4;
   svg+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}M${a.x-tx} ${a.y-ty}L${a.x+tx} ${a.y+ty}M${b.x-tx} ${b.y-ty}L${b.x+tx} ${b.y+ty}"/><text x="${label.x}" y="${label.y}" text-anchor="middle">${text}</text>`;
  }
  let html='';for(const p of markerPositions()){const f=p.record;if(p.dx||p.dy)svg+=`<path class="construction-marker-leader" d="M${p.anchor.x} ${p.anchor.y}L${p.x} ${p.y-5}"/>`;html+=`<button class="construction-marker ${f.id===selectedId?'selected':''}" data-marker="${esc(f.id)}" aria-label="${esc(f.code+' 단자함 위치 선택')}" style="left:${p.x}px;top:${p.y}px">${f.code}</button>`;}
  $('constructionOverlay').innerHTML=svg;
  const cues=[{text:'정면벽 · Z=0',x:state.room.w/2,z:-.48},{text:'후면벽',x:state.room.w/2,z:state.room.d+.48},{text:'왼쪽벽 · X=0',x:-.48,z:state.room.d/2}];
  for(const f of state.fixtures.filter(f=>!f.hidden&&['door','sink'].includes(f.kind))){const offset=f.offset+f.w/2;cues.push({text:f.name,x:f.wall==='left'?0:f.wall==='right'?state.room.w:offset,z:f.wall==='front'?0:f.wall==='back'?state.room.d:offset});}
  for(const f of cues){const p=p2(f.x,f.z);if(records.some(b=>{const q=point(b.x,.35,b.z);return Math.abs(p.x-q.x)<65&&Math.abs(p.y-q.y)<27;}))p.y+=28;if(p.visible)html+=`<span class="construction-wall-label" style="left:${p.x}px;top:${p.y}px">${esc(f.text)}</span>`;}
  $('constructionLabels').innerHTML=html;
  for(const b of root.querySelectorAll('[data-marker]'))b.onclick=()=>choose(b.dataset.marker);
 }
 function setMode(next){mode=next;animating=false;for(const [id,key]of[['constructionSplit','split'],['constructionFloor','floor'],['constructionTop','top']])$(id).classList.toggle('active',next===key);$('constructionLift').disabled=next!=='split';$('constructionOpacity').disabled=next!=='split';root.classList.toggle('construction-floor-only',next!=='split');root.classList.toggle('construction-top-locked',next==='top');$('constructionTop').setAttribute('aria-pressed',String(next==='top'));$('constructionHint').textContent=next==='top'?'정중앙 위에서 고정 · 회전·이동·확대 잠금 · 번호를 선택해 거리 확인':'드래그 회전 · 휠 확대 · 번호 선택으로 위치 확인';stage.setAttribute('aria-label',next==='top'?'공간 중앙 위에서 고정된 단자함 평면도':'드래그로 회전하는 단자함 분리 보기');refresh();fit();}
 function tick(now){if(closed)return;raf=requestAnimationFrame(tick);if(animating){const t=Math.min(1,(now-start)/850),ease=1-Math.pow(1-t,3);model.upper.position.y=settings.lift*ease;dirty=true;if(t===1){animating=false;refresh();}}if(!dirty)return;dirty=false;renderer.render(model.scene,camera);overlay();}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 function wrap(c,text,x,y,width,lineHeight){let line='';for(const ch of text){if(c.measureText(line+ch).width>width){c.fillText(line,x,y);line='';y+=lineHeight;}line+=ch;}if(line)c.fillText(line,x,y);return y+lineHeight;}
 function snapshotCanvas(){
  animating=false;model.update({...settings,floorOnly:mode!=='split',selectedId,includeHidden:$('constructionHidden').checked});renderer.render(model.scene,camera);overlay();
  const cv=document.createElement('canvas'),W=2600,H=Math.max(1700,800+records.length*47);cv.width=W;cv.height=H;const c=cv.getContext('2d');
  c.fillStyle='#081521';c.fillRect(0,0,W,H);c.fillStyle='#81d9e9';c.font='600 20px sans-serif';c.fillText('배치 스튜디오  /  NETWORK · SITE REVIEW',70,65);c.fillStyle='#effbff';c.font='600 43px sans-serif';c.fillText('단자함 · 바닥층 '+(mode==='split'?'분리 보기':mode==='top'?'평면 고정 보기':'단독 보기'),70,129);c.fillStyle='#91b3c5';c.font='24px sans-serif';c.fillText(`${state.title}  ·  ${state.room.w} × ${state.room.d}m  ·  단자함 중심 기준 / cm`,70,180);
  const area={x:35,y:215,w:1790,h:H-415},scale=Math.min(area.w/stage.clientWidth,area.h/stage.clientHeight),ox=area.x+(area.w-stage.clientWidth*scale)/2,oy=area.y+(area.h-stage.clientHeight*scale)/2;
  c.drawImage(renderer.domElement,ox,oy,stage.clientWidth*scale,stage.clientHeight*scale);c.save();c.translate(ox,oy);c.scale(scale,scale);
  c.strokeStyle='#81dbe9';c.lineWidth=1;for(const {a,b,text,label}of dimensions()){c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();c.font='600 12px sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#081521';c.strokeText(text,label.x,label.y);c.fillStyle='#a4eff7';c.fillText(text,label.x,label.y);c.strokeStyle='#81dbe9';c.lineWidth=1;}
  for(const p of markerPositions()){const f=p.record;if(p.dx||p.dy){c.strokeStyle='#c0a26d';c.lineWidth=.8;c.beginPath();c.moveTo(p.anchor.x,p.anchor.y);c.lineTo(p.x,p.y-5);c.stroke();}c.fillStyle=f.id===selectedId?'#ffd58b':'#192b35';c.fillRect(p.x-18,p.y-20,36,19);c.fillStyle=f.id===selectedId?'#142733':'#ffd58b';c.font='600 11px sans-serif';c.textAlign='center';c.fillText(f.code,p.x,p.y-6);}
  for(const [text,x,z]of[['정면벽 · Z=0',state.room.w/2,-.48],['후면벽',state.room.w/2,state.room.d+.48],['왼쪽벽 · X=0',-.48,state.room.d/2]]){const p=p2(x,z);c.fillStyle='#a1ccdd';c.font='12px sans-serif';c.textAlign='center';c.fillText(text,p.x,p.y);}
  c.restore();c.textAlign='left';const tx=1880,tw=650;c.fillStyle='#172f41';c.fillRect(tx-22,231,tw,58);c.fillStyle='#9ec7d8';c.font='22px sans-serif';c.fillText('단자함',tx,269);c.fillText('왼쪽벽 X',tx+345,269);c.fillText('정면벽 Z',tx+490,269);
  records.forEach((f,n)=>{const y=329+n*47;c.fillStyle=f.id===selectedId?'#ffd28b':'#d4e7ef';c.font='600 22px sans-serif';c.fillText(f.code,tx,y);c.font='20px sans-serif';let name=f.name;while(c.measureText(name).width>230)name=name.slice(0,-2)+'…';c.fillText(name,tx+75,y);c.fillText(String(f.left),tx+360,y);c.fillText(String(f.front),tx+505,y);c.strokeStyle='#1c3848';c.beginPath();c.moveTo(tx,y+15);c.lineTo(tx+600,y+15);c.stroke();});
  const f=records.find(f=>f.id===selectedId),sy=360+records.length*47;
  if(f&&sy+125<H-190){c.fillStyle='#ffd28b';c.font='600 22px sans-serif';c.fillText(f.code+' 선택 단자함',tx,sy);c.fillStyle='#a7c8d7';c.font='20px sans-serif';c.fillText(`오른쪽벽 ${f.right}cm  ·  후면벽 ${f.back}cm`,tx,sy+38);}
  c.fillStyle='#a0b8c7';c.font='22px sans-serif';wrap(c,note,70,H-140,W-140,32);c.fillStyle='#7196aa';c.font='20px sans-serif';c.fillText('45 × 45cm 바닥 타일 · 층 분리 높이는 표시 효과이며 실제 배치 좌표는 유지됩니다.',70,H-55);c.textAlign='right';c.fillText('made by 강민준',W-70,H-55);return cv;
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
 $('constructionDimensions').onchange=()=>dirty=true;$('constructionHidden').onchange=refresh;$('constructionPng').onclick=()=>save('png');$('constructionPdf').onclick=()=>save('pdf');
 renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
 let down=null;renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
 renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)return;const r=stage.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=ray.intersectObjects([...model.markers.values()].filter(m=>m.group.visible).map(m=>m.group),true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.floorboxId)o=o.parent;if(o)choose(o.userData.floorboxId);}});
 fit();refresh();raf=requestAnimationFrame(tick);$('constructionClose').focus();return{close};
}
