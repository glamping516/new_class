import {cadDrawing,cadEscape as esc,cadNumber} from './cad-plan.mjs';
import {wallGaps} from './geometry.mjs';
import {CATALOG} from './furniture.mjs';
import {pdfFromJpeg} from './pdf-export.mjs';
import {projectFileStem} from './project-info.mjs';

export function openCadView(current,{toast=()=>{},onClose=()=>{}}={}){
 if(document.getElementById('cadDialog'))return;
 const state=structuredClone(current),root=document.createElement('dialog');root.id='cadDialog';root.className='cad-dialog';root.setAttribute('aria-label','CAD 도면 보기');
 root.innerHTML=`<header class="cad-header"><div class="cad-brand"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v18H3ZM3 9h8V3m0 6v12m0-6h10"/></svg><div>배치 스튜디오<small>DRAWING / MOVE PLAN</small></div></div><div class="cad-title"><h1>이사 배치도 <span>CAD</span></h1><p>${esc(state.title)} · ${state.room.w} × ${state.room.d}m</p></div><div class="cad-exports"><span id="cadExportStatus" role="status"></span><select id="cadPaper" aria-label="CAD 도면 PDF 용지"><option value="a3">A3</option><option value="a4">A4</option></select><button id="cadPng">PNG 저장</button><button id="cadPdf">PDF 저장</button><button id="cadSvg" title="확대해도 선명한 벡터 도면">SVG 저장</button><button id="cadClose" aria-label="CAD 도면 보기 닫기">배치로 돌아가기 <b>×</b></button></div></header><div class="cad-workspace"><section class="cad-stage" aria-label="이사업체용 CAD 평면도"><div class="cad-stage-bar"><span><i></i>평면 정투영 <small>· 단위 cm</small></span><div><button id="cadPaperTheme" aria-pressed="true">흰 도면</button><button id="cadBlueTheme" aria-pressed="false">청사진</button></div></div><div id="cadViewport" tabindex="0" aria-label="드래그로 이동하고 확대하는 CAD 도면"></div><div class="cad-camera"><button id="cadZoomOut" aria-label="CAD 도면 축소">−</button><output id="cadZoomValue">100%</output><button id="cadZoomIn" aria-label="CAD 도면 확대">+</button><span></span><button id="cadFit">도면 맞춤 ⤢</button></div><p class="cad-hint">모서리 끝점 ↔ 끝점 · 가구를 누르면 상세 치수 · 드래그로 이동</p></section><aside class="cad-panel"><button id="cadPanelToggle" aria-expanded="false">도면 설정 · 가구 목록 <span>⌃</span></button><div class="cad-panel-content"><section class="cad-layers"><span class="cad-eyebrow">DRAWING LAYERS</span><h2>도면에 표시할 내용</h2><div class="cad-layer-grid">${[['cadDimensions','책상 양끝 간격',true],['cadWalls','벽까지 거리',true],['cadLabels','가구 번호·이름',true],['cadTerminals','바닥 단자함',true],['cadSizes','가구 가로·깊이',false],['cadGrid','45cm 격자',false]].map(([id,label,checked])=>`<label><input id="${id}" type="checkbox" ${checked?'checked':''}>${label}</label>`).join('')}</div><select id="cadScope" aria-label="CAD 치수 표시 범위"><option value="all">전체 가구 치수</option><option value="selected">선택 가구 치수만</option></select><p>치수는 실제 끝모서리 사이의 직선거리입니다. 어긋난 책상은 대각선으로 연결됩니다. 번호는 배치 목록과 연결됩니다.</p><div class="cad-key"><span><i></i>책상 간격</span><span><i></i>벽 거리</span><span><i></i>단자함</span></div></section><section id="cadDetail" class="cad-detail" aria-live="polite"></section><section class="cad-inventory"><div class="cad-inventory-heading"><h2>가구 목록</h2><span id="cadInventoryCount"></span></div><p>가로 × 깊이 × 높이 · cm</p><div id="cadItems"></div></section><p class="cad-export-note">저장은 현재 확대와 관계없이 도면 전체를 담습니다. PNG·PDF에는 메뉴와 목록이 들어가지 않습니다.</p></div></aside></div>`;
 document.body.append(root);root.showModal();
 const $=id=>root.querySelector('#'+id),viewport=$('cadViewport');
 let selectedId=null,theme='paper',drawing,base,camera,closed=false,zoom=1,exporting=false;
 const options=()=>({selectedId,theme,scope:$('cadScope').value,dimensions:$('cadDimensions').checked,walls:$('cadWalls').checked,labels:$('cadLabels').checked,terminals:$('cadTerminals').checked,sizes:$('cadSizes').checked,grid:$('cadGrid').checked});
 function updateCamera(){viewport.querySelector('svg')?.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);$('cadZoomValue').textContent=Math.round(zoom*100)+'%';}
 function fit(){if(!base)return;camera={...base};zoom=1;updateCamera();}
 function setZoom(factor,focus){
  const next=Math.min(8,Math.max(.55,zoom*factor)),ratio=zoom/next,cx=focus?.x??camera.x+camera.w/2,cy=focus?.y??camera.y+camera.h/2;
  camera={x:cx+(camera.x-cx)*ratio,y:cy+(camera.y-cy)*ratio,w:camera.w*ratio,h:camera.h*ratio};zoom=next;updateCamera();
 }
 function render(){
  const previous=base;drawing=cadDrawing(state,options());base={...drawing.viewBox};viewport.innerHTML=drawing.svg;viewport.style.background=theme==='paper'?'#e9edf0':'#091e30';root.classList.toggle('cad-blueprint',theme==='blueprint');
  if(!camera||previous.w!==base.w||previous.h!==base.h)fit();else updateCamera();
  $('cadPaperTheme').setAttribute('aria-pressed',String(theme==='paper'));$('cadBlueTheme').setAttribute('aria-pressed',String(theme==='blueprint'));
  const {items}=drawing.data;$('cadInventoryCount').textContent=items.length+'개';
  $('cadItems').innerHTML=items.map(i=>`<button data-cad-list="${esc(i.id)}" class="${i.id===selectedId?'selected':''}" aria-label="${esc(i.code+' '+i.name+' 상세 치수')}" aria-pressed="${i.id===selectedId}"><b>${i.code}</b><span>${esc(i.name)}<small>${i.dims.map(cadNumber).join(' × ')}${i.raised?' · 상부':''}</small></span><i>↗</i></button>`).join('')||'<div class="cad-empty">배치된 가구가 없습니다.<br>배치 화면에서 가구를 추가하세요.</div>';
  for(const b of root.querySelectorAll('[data-cad-list]'))b.onclick=()=>choose(b.dataset.cadList);
  renderDetail();
 }
 function renderDetail(){
  const item=drawing.data.items.find(i=>i.id===selectedId);
  if(!item){$('cadDetail').innerHTML='<span class="cad-eyebrow">CORNER TO CORNER</span><strong>설치할 위치를 정확하게</strong><p>가구를 선택하면 사방 벽 거리와 상판 네 모서리의 위치를 확인할 수 있습니다.</p>';return;}
  const neighbors=drawing.data.corners.filter(m=>m.from===item.id||m.to===item.id),byId=new Map(drawing.data.items.map(i=>[i.id,i]));
  $('cadDetail').innerHTML=`<div class="cad-detail-title"><b>${item.code}</b><strong>${esc(item.name)}</strong><button id="cadClearSelection" aria-label="CAD 가구 선택 해제">×</button></div><dl>${wallGaps(item,state.room,CATALOG).map(m=>`<div><dt>${m.label}</dt><dd>${cadNumber(m.distance)}<small>cm</small></dd></div>`).join('')}</dl><h3>인근 책상 · 양끝 모서리</h3>${neighbors.map(m=>{const other=byId.get(m.from===item.id?m.to:m.from);return`<div class="cad-neighbor"><span>${other?.code||''} · ${m.endLabel}${m.overlapping?' · 겹침':''}</span><b>${cadNumber(m.distance)}<small>cm</small></b></div>`;}).join('')||'<p>연결할 인근 책상이 없습니다.</p>'}<h3>네 모서리 위치 <small>cm</small></h3><div class="cad-corner-table"><span>모서리</span><span>왼쪽벽 X</span><span>정면벽 Z</span>${item.polygon.map((p,n)=>`<b>${n+1}</b><span>${cadNumber(p.x)}</span><span>${cadNumber(p.z)}</span>`).join('')}</div><p>1→2→3→4는 가구의 정면 왼쪽부터 시계방향입니다. 회전된 실제 모서리 좌표입니다.</p>`;
  $('cadClearSelection').onclick=()=>choose(null);
 }
 function choose(id){selectedId=id;render();}
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
 async function save(kind){
  if(exporting)return;exporting=true;const buttons=[$('cadPng'),$('cadPdf'),$('cadSvg')];buttons.forEach(b=>b.disabled=true);$('cadExportStatus').textContent=kind.toUpperCase()+' 만드는 중…';
  try{
   const full=cadDrawing(state,options()),stem=projectFileStem(state)+'_CAD배치도';
   if(kind==='svg')download(new Blob([full.svg],{type:'image/svg+xml;charset=utf-8'}),stem+'.svg');
   else{
    const scale=3200/Math.max(full.viewBox.w,full.viewBox.h),canvas=document.createElement('canvas');canvas.width=Math.round(full.viewBox.w*scale);canvas.height=Math.round(full.viewBox.h*scale);
    const url=URL.createObjectURL(new Blob([full.svg],{type:'image/svg+xml;charset=utf-8'}));
    try{const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('도면 이미지 변환 실패'));image.src=url;});const c=canvas.getContext('2d');c.fillStyle=full.background;c.fillRect(0,0,canvas.width,canvas.height);c.drawImage(image,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,kind==='png'?'image/png':'image/jpeg',.97));if(!blob)throw new Error('도면을 만들 수 없습니다.');
    download(kind==='png'?blob:new Blob([pdfFromJpeg(new Uint8Array(await blob.arrayBuffer()),canvas.width,canvas.height,$('cadPaper').value)],{type:'application/pdf'}),stem+'.'+kind);
   }
   $('cadExportStatus').textContent=kind.toUpperCase()+' 저장 완료 · 도면만 저장';toast('CAD 배치도를 '+kind.toUpperCase()+' 파일로 저장했습니다.');
  }catch(e){$('cadExportStatus').textContent=e.message;toast(e.message);}finally{exporting=false;buttons.forEach(b=>b.disabled=false);}
 }
 const pointers=new Map();let start=null,pinch=null;
 function localPoint(event){const r=viewport.getBoundingClientRect(),scale=Math.min(r.width/camera.w,r.height/camera.h),ox=(r.width-camera.w*scale)/2,oy=(r.height-camera.h*scale)/2;return{x:camera.x+(event.clientX-r.left-ox)/scale,y:camera.y+(event.clientY-r.top-oy)/scale,scale};}
 viewport.onwheel=e=>{e.preventDefault();setZoom(e.deltaY<0?1.12:1/1.12,localPoint(e));};
 viewport.onpointerdown=e=>{if(e.button!==0)return;viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});start={x:e.clientX,y:e.clientY,camera:{...camera},target:e.target.closest('[data-cad-item]')?.dataset.cadItem,moved:false};if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};}};
 viewport.onpointermove=e=>{
  if(!pointers.has(e.pointerId)||!start)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>1){setZoom(pinch.zoom*distance/pinch.distance/zoom);start.moved=true;}return;}
  const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>5)start.moved=true;const scale=localPoint(e).scale;camera={...camera,x:start.camera.x-dx/scale,y:start.camera.y-dy/scale};updateCamera();
 };
 const finish=e=>{const click=start&&!start.moved&&pointers.size===1,id=start?.target;pointers.delete(e.pointerId);if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(pointers.size){const p=[...pointers.values()][0];start={x:p.x,y:p.y,camera:{...camera},moved:true};}else start=null;pinch=null;if(click&&e.type==='pointerup')choose(id||null);};
 viewport.onpointerup=finish;viewport.onpointercancel=finish;
 viewport.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const id=e.target.closest('[data-cad-item]')?.dataset.cadItem;if(id){e.preventDefault();choose(id);}}if(e.key==='+'||e.key==='=')setZoom(1.25);if(e.key==='-')setZoom(.8);if(e.key==='0')fit();};
 const close=()=>{if(closed)return;closed=true;root.close();root.remove();onClose();document.getElementById('cadBtn')?.focus();};
 root.addEventListener('cancel',e=>{e.preventDefault();close();});$('cadClose').onclick=close;
 for(const id of ['cadDimensions','cadWalls','cadLabels','cadTerminals','cadSizes','cadGrid','cadScope'])$(id).onchange=render;
 $('cadPaperTheme').onclick=()=>{theme='paper';render();};$('cadBlueTheme').onclick=()=>{theme='blueprint';render();};
 $('cadZoomIn').onclick=()=>setZoom(1.25);$('cadZoomOut').onclick=()=>setZoom(.8);$('cadFit').onclick=fit;
 $('cadPanelToggle').onclick=()=>{const open=root.classList.toggle('cad-panel-open');$('cadPanelToggle').setAttribute('aria-expanded',String(open));};
 $('cadPng').onclick=()=>save('png');$('cadPdf').onclick=()=>save('pdf');$('cadSvg').onclick=()=>save('svg');
 render();$('cadClose').focus();return{close};
}
