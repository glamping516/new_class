import {WALL_COVERS,coverSpec,coverColor,coverColorName,fitCoverToWall,nearestWall,WALL_NAMES,coverRollCount} from './wall-covers.mjs';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dimensions=d=>d.map(v=>Number((v*100).toFixed(1))).join(' × ');
const swatches=(spec,color,attribute,disabled=false)=>spec.palette.map(p=>`<button class="cover-swatch ${p.color.toLowerCase()===color.toLowerCase()?'active':''}" ${attribute}="${p.color}" style="--swatch:${p.color}" title="${escape(p.name)}" aria-label="${escape(p.name)}" aria-pressed="${p.color.toLowerCase()===color.toLowerCase()}" ${disabled?'disabled':''}><span></span></button>`).join('');

export function coverProperties(item,room){
 const c=coverSpec(item.type),d=item.dims||c.dims,wall=item.coverWall||nearestWall(item,room),movable=['curtain','roller'].includes(c.style);
 return `<div class="cover-settings"><div class="cover-settings-head"><strong>색상 · 벽면 가림</strong><span>${c.brand}</span></div><div class="cover-color-label">${escape(coverColorName(item))}</div><div class="cover-swatches" role="group" aria-label="벽마감 색상">${swatches(c,coverColor(item),'data-cover-color',item.locked)}</div><label class="cover-custom">직접 색상 선택<input type="color" id="coverCustomColor" value="${coverColor(item)}" aria-label="벽마감 직접 색상" ${item.locked?'disabled':''}></label><div class="cover-wall-controls"><select id="coverWallSelect" aria-label="벽마감을 맞출 벽" ${item.locked?'disabled':''}>${Object.entries(WALL_NAMES).map(([k,label])=>`<option value="${k}" ${wall===k?'selected':''}>${label} · ${['front','back'].includes(k)?room.w:room.d}m 벽</option>`).join('')}</select><button id="coverFillWall" ${item.locked?'disabled':''}>벽 전체에 맞춤</button><button id="coverUnitWall" ${item.locked?'disabled':''}>단위 크기로 붙이기</button></div>${movable?`<button id="coverToggleOpen" class="cover-open-button" aria-pressed="${item.coverOpen===true}" ${item.locked?'disabled':''}>${item.coverOpen?'닫아서 가리기':'열어서 벽 보기'}</button>`:''}<p>${c.unit?`제품 한 장 ${dimensions(c.unit)}cm · `:'맞춤 배치 예시 · '}덮는 면적 ${(d[0]*d[2]).toFixed(2)}㎡${c.maxUnitWidth?` · 최대 ${c.maxUnitWidth*100}cm 기준 ${coverRollCount(item,room)}폭`:''}<br>${movable?'닫으면 뒤의 설비도 가려집니다. 접근이 필요하면 열림 상태로 비교하세요.':'벽에 붙이면 문·창문·단자함과 기존 벽걸이 보드 부분을 비워 둡니다.'}<br>직접 이동·회전하면 전체 벽 맞춤이 해제됩니다.<br>화면 색상·무늬는 비교용 근사 표현입니다.</p></div>`;
}

export function bindCoverProperties(item,{room,onChange}){
 const $=id=>document.getElementById(id),c=coverSpec(item.type);
 document.querySelectorAll('[data-cover-color]').forEach(button=>button.onclick=()=>{if(!item.locked)onChange({...item,color:button.dataset.coverColor});});
 $('coverCustomColor').onchange=()=>{if(!item.locked)onChange({...item,color:$('coverCustomColor').value});};
 $('coverFillWall').onclick=()=>{if(!item.locked)onChange(fitCoverToWall(item,$('coverWallSelect').value,room,{full:true}));};
 $('coverUnitWall').onclick=()=>{if(!item.locked)onChange(fitCoverToWall({...item,dims:[...c.dims],y:0},$('coverWallSelect').value,room));};
 if($('coverToggleOpen'))$('coverToggleOpen').onclick=()=>{if(!item.locked)onChange({...item,coverOpen:!item.coverOpen});};
}

export function openCoverProducts({openDialog,thumbnails,onAdd}){
 const choices=new Map(WALL_COVERS.map(c=>[c.type,c.color]));
 openDialog('벽마감 · 가림 제품 고르기','WALL FINISH COLLECTION',`<p class="wall-product-intro">스크린 뒤 전체 벽을 가리는 재료를 비교하세요. 제품의 기본 규격으로 추가한 뒤 ‘벽 전체에 맞춤’을 누르면 선택한 벽에 맞춰집니다.</p><div class="wall-product-grid">${WALL_COVERS.map(c=>`<article class="wall-product-card" data-wall-product="${c.type}"><div class="wall-product-image"><img src="${thumbnails[c.type]}" alt="${escape(c.name)} 배치용 3D 모형">${c.recommended?'<span>전체 마감 추천</span>':''}</div><small>${c.brand}</small><h3>${c.name}</h3><p>${c.description}</p><div class="cover-swatches" role="group" aria-label="${escape(c.name)} 색상">${swatches(c,c.color,'data-product-color')}</div><span class="wall-product-color-name">${c.palette[0].name}</span><div class="wall-product-actions"><a href="${escape(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">제품 보기 ↗</a><button class="button small primary" data-add-cover="${c.type}">이 색상으로 추가</button></div></article>`).join('')}</div><p class="modal-note">단위 규격은 제품·판매처 표기를 참고했습니다. 전체 벽 맞춤은 여러 장·여러 폭을 연결하는 배치 표현이며 시공 부자재·원단 주름 배수는 포함하지 않습니다. 화면의 색상·무늬는 근사 표현으로 실제 샘플과 다를 수 있습니다.</p>`,940);
 document.querySelectorAll('[data-product-color]').forEach(button=>button.onclick=()=>{
  const card=button.closest('[data-wall-product]'),type=card.dataset.wallProduct;choices.set(type,button.dataset.productColor);
  card.querySelectorAll('[data-product-color]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  card.querySelector('.wall-product-color-name').textContent=coverSpec(type).palette.find(p=>p.color===button.dataset.productColor).name;
 });
 document.querySelectorAll('[data-add-cover]').forEach(button=>button.onclick=()=>{document.getElementById('dialog').close();onAdd(button.dataset.addCover,choices.get(button.dataset.addCover));});
}
