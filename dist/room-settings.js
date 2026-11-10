import {WALLS,FIXTURE_TYPES,wallLength,validateRoom,validateFixtures,fitFixturesToRoom,newFixture} from './room-structure.mjs';
import {classroomFloorBoxes,isClassroomRoom,floorboxEdges,floorboxFromEdges,FLOORBOX_MEASUREMENTS} from './floor-boxes.mjs';

export function openRoomEditor(current,{openDialog,toast,onApply}){
 const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const draft=structuredClone(current);let serial=0;
 const firstBox=draft.fixtures.find(f=>f.kind==='floorbox');
 let presetSize={w:firstBox?.w??FLOORBOX_MEASUREMENTS.boxWidth,depth:firstBox?.depth??FLOORBOX_MEASUREMENTS.boxDepth,estimated:firstBox?.estimated!==false};
 const cm=v=>Math.round(v*100000)/1000;
 const wallOptions=value=>WALLS.map(([k,label])=>`<option value="${k}" ${value===k?'selected':''}>${label} · ${wallLength(k,draft.room)}m</option>`).join('');
 const input=(f,key,label,value=f[key]||0)=>`<label>${label}<input type="number" data-fkey="${key}" aria-label="${escape(f.name)} ${label}" value="${cm(value)}" step="${f.kind==='floorbox'?'0.001':'1'}" min="0"></label>`;
 const card=f=>`<section class="facility-card" data-fixture="${f.id}"><div class="facility-head"><span>${FIXTURE_TYPES[f.kind].name}</span><input class="facility-name" data-fkey="name" value="${escape(f.name)}" maxlength="50" aria-label="${escape(f.name)} 이름"><button class="facility-delete" data-remove-fixture="${f.id}" aria-label="${escape(f.name)} 삭제">삭제</button></div><div class="facility-fields">${f.kind==='floorbox'?input(f,'x','왼쪽 벽 → 모서리 cm',floorboxEdges(f).minX)+input(f,'z','정면 벽 → 모서리 cm',floorboxEdges(f).minZ):`<label>벽 위치<select data-fkey="wall" aria-label="${escape(f.name)} 벽 위치">${wallOptions(f.wall)}</select></label>${input(f,'offset','시작점 cm')}`}${input(f,'w','가로 cm')}${input(f,'depth','깊이 cm')}${input(f,'h','높이 cm')}${f.kind==='floorbox'?'':input(f,'bottom','바닥에서 cm')}</div></section>`;
 function read(){
  draft.room={w:Number($('prop-roomW').value)/100,d:Number($('prop-roomD').value)/100,h:Number($('prop-roomH').value)/100,tile:.45};
  for(const row of document.querySelectorAll('[data-fixture]')){
   const f=draft.fixtures.find(f=>f.id===row.dataset.fixture);
   const before={x:f.x,z:f.z,w:f.w,depth:f.depth};
   for(const el of row.querySelectorAll('[data-fkey]')){const key=el.dataset.fkey;if(f.kind==='floorbox'&&(['x','z'].includes(key)||el.value===el.defaultValue))continue;f[key]=['wall','name'].includes(key)?el.value:Number(el.value)/100;}
   if(f.kind==='floorbox'){
    const xInput=row.querySelector('[data-fkey="x"]'),zInput=row.querySelector('[data-fkey="z"]');
    if(xInput.value!==xInput.defaultValue||zInput.value!==zInput.defaultValue||f.w!==before.w||f.depth!==before.depth){
     const edges=floorboxEdges(before);
     Object.assign(f,floorboxFromEdges(f,xInput.value===xInput.defaultValue?edges.minX:Number(xInput.value)/100,zInput.value===zInput.defaultValue?edges.minZ:Number(zInput.value)/100));
    }
    if(['x','z','w','depth'].some(k=>Math.abs(f[k]-before[k])>1e-6))f.estimated=false;
   }
   f.name=f.name.trim()||FIXTURE_TYPES[f.kind].name;
  }
  draft.settings.computers=$('deskComputers').checked;
 }
 function render(){
  openDialog('공간 크기와 시설','ROOM & ARCHITECTURE',`<p class="room-intro">새 장소의 크기를 입력하고 문·창문·설비를 자유롭게 구성하세요. 변경한 크기와 시설도 배치 파일에 함께 저장됩니다.</p><div class="room-grid">${[['roomW','공간 가로',draft.room.w],['roomD','공간 세로',draft.room.d],['roomH','천장 높이',draft.room.h]].map(([id,label,v])=>`<label class="room-size-field" for="prop-${id}">${label}<div><input id="prop-${id}" type="number" value="${cm(v)}" min="${id==='roomH'?200:300}" max="${id==='roomH'?600:3000}" step="1"><span>cm</span></div></label>`).join('')}</div><p id="roomSizeSummary" class="modal-note"></p><div class="facility-section-head"><div><h3>문 · 창문 · 고정 시설 <span>${draft.fixtures.length}/80</span></h3><p>시작점: 정면·후면은 왼쪽 모서리, 좌·우 벽은 정면 모서리 기준</p></div><button id="clearFixtures" class="button quiet">시설 비우기</button></div><div class="facility-add"><select id="addFixtureKind" aria-label="추가할 시설 종류">${Object.entries(FIXTURE_TYPES).map(([kind,p])=>`<option value="${kind}" ${kind==='window'?'selected':''}>${p.name}</option>`).join('')}</select><select id="addFixtureWall" aria-label="추가할 시설 벽 위치">${wallOptions('left')}</select><button id="addFixtureBtn" class="button primary" data-icon="plus">시설 추가</button></div><div id="facilityList">${draft.fixtures.filter(f=>f.kind!=='floorbox').map(card).join('')||'<div class="facility-empty">벽면 시설이 없습니다. 위에서 필요한 시설을 추가하세요.</div>'}</div><details class="floorbox-details" ${draft.fixtures.every(f=>f.kind==='floorbox')?'open':''}><summary>바닥 단자함 · ${draft.fixtures.filter(f=>f.kind==='floorbox').length}개</summary><aside class="floorbox-preset" aria-label="교육장 단자함 배치 기준"><div class="floorbox-preset-head"><div><strong>교육장 단자함 배치</strong><span>9 × 12m · 4열 × 3줄 12개 + 맞은편 벽 중앙 1개</span></div><button id="applyFloorboxPreset" class="button quiet" ${isClassroomRoom(draft.room)?'':'disabled'}>단자함 위치 적용</button></div><div class="floorbox-metrics"><div><span>좌우 모서리 사이</span><strong>211<small> cm</small></strong></div><div><span>앞뒤 모서리 사이</span><strong>228<small> cm</small></strong></div><div><span>문벽 → 가까운 모서리</span><strong>360<small> cm</small></strong></div></div><p class="floorbox-reference"><strong>모서리 기준</strong> · 문벽에서 가장 가까운 모서리까지 360cm입니다. 가로 211cm·세로 228cm는 서로 마주 보는 모서리 사이의 빈 간격입니다. 단독 1개는 맞은편 벽에서 가까운 모서리까지 130cm입니다. 왼쪽 벽→가까운 모서리 81cm, 오른쪽 벽→가까운 모서리 85cm입니다. 9m 폭에서 네 열과 가로 간격을 모두 맞춘 단자함 가로 계산값은 25.25cm이며, 깊이 18cm는 추정값입니다.</p><div class="floorbox-size"><label>단자함 가로 cm<input id="floorboxPresetWidth" aria-label="교육장 단자함 가로 cm" type="number" min="2" max="100" step="0.01" value="${cm(presetSize.w)}"></label><label>단자함 깊이 cm<input id="floorboxPresetDepth" aria-label="교육장 단자함 깊이 cm" type="number" min="2" max="100" step="0.01" value="${cm(presetSize.depth)}"></label><button id="floorboxMeasuredWidth" class="button quiet">벽 거리 기준 가로 계산</button><p id="floorboxSizeNote">전체 13개에 같은 크기를 적용합니다. 실측치를 입력한 뒤 ‘단자함 위치 적용’을 누르세요.</p></div><div class="floorbox-coordinates"><span>왼쪽 벽 → 왼쪽 모서리 X <b id="floorboxPresetX"></b></span><span>정면 벽 → 정면 모서리 Z <b id="floorboxPresetZ"></b></span></div><p id="floorboxPresetNote" class="modal-note">바닥 단자함만 이 배치로 바꿉니다. 가구와 벽면 시설은 유지되며, 아래에서 좌표를 직접 수정할 수 있습니다.</p></aside><label class="checkbox-row"><input type="checkbox" id="showFloorboxes" ${draft.fixtures.some(f=>f.kind==='floorbox'&&!f.hidden)?'checked':''}>바닥 단자함 표시</label>${draft.fixtures.filter(f=>f.kind==='floorbox').map(card).join('')}</details><label class="checkbox-row"><input type="checkbox" id="deskComputers" ${draft.settings.computers?'checked':''}>책상에 모니터·본체 세트 표시</label><p class="modal-note">바닥 타일은 45 × 45cm입니다. 공간을 줄이면 범위 밖 시설·가구를 안쪽으로 옮깁니다. 문·창문이 겹치면 위치를 조정해 주세요.</p><div class="dialog-actions room-apply-actions"><button class="button quiet" id="cancelRoom">취소</button><button class="button primary" id="applyRoom" data-icon="check">공간에 적용</button></div>`,930);
  function updateDimensions(){
   const r={w:Number($('prop-roomW').value)/100,d:Number($('prop-roomD').value)/100};
   let sizeValid=true;
   try{
    const boxes=classroomFloorBoxes([],{w:9,d:12},presetSize),grid=boxes.slice(0,12);
    $('floorboxPresetX').textContent=[...new Set(grid.map(f=>cm(floorboxEdges(f).minX)))].join(' · ')+'cm';
    $('floorboxPresetZ').textContent=[...new Set(grid.map(f=>cm(floorboxEdges(f).minZ)))].join(' · ')+'cm';
    const right=cm(9-floorboxEdges(grid[3]).maxX),matches=Math.abs(right-85)<.001;
    const source=presetSize.estimated?'가로는 벽 거리로 계산한 값, 깊이는 추정값입니다. 실측 크기로 수정할 수 있습니다.':'입력한 실측 크기를 사용합니다.';
    $('floorboxSizeNote').textContent=`단자함 ${cm(presetSize.w)} × ${cm(presetSize.depth)}cm. ${source} 왼쪽 81cm·가로 간격 211cm를 유지하면 오른쪽 벽 거리는 ${right}cm입니다.${matches?'':' 실측 85cm와 차이가 있습니다. 양쪽 벽 거리를 모두 맞추려면 가로 25.25cm가 필요합니다.'} ‘단자함 위치 적용’을 누르면 13개를 재배치합니다.`;
   }catch(e){sizeValid=false;$('floorboxPresetX').textContent='크기 확인';$('floorboxPresetZ').textContent='크기 확인';$('floorboxSizeNote').textContent=e.message;}
   $('applyFloorboxPreset').disabled=!isClassroomRoom(r)||!sizeValid;
   $('floorboxPresetNote').textContent=isClassroomRoom(r)?'바닥 단자함만 이 배치로 바꿉니다. 가구와 벽면 시설은 유지되며, 아래에서 좌표를 직접 수정할 수 있습니다.':'이 배치는 9 × 12m 정보화교육장 기준입니다. 다른 크기의 공간은 아래 단자함 좌표를 직접 입력하세요.';
   $('roomSizeSummary').textContent=`${Number.isFinite(r.w*r.d)?Math.round(r.w*r.d*100)/100:0}㎡ · 바닥 45 × 45cm · 가로·세로 3~30m / 높이 2~6m`;
   for(const select of document.querySelectorAll('[data-fkey="wall"],#addFixtureWall'))for(const option of select.options){const label=WALLS.find(([key])=>key===option.value)[1];option.textContent=`${label} · ${wallLength(option.value,r)}m`;}
  }
  updateDimensions();for(const id of ['prop-roomW','prop-roomD','prop-roomH'])$(id).oninput=updateDimensions;
  for(const id of ['floorboxPresetWidth','floorboxPresetDepth'])$(id).oninput=()=>{presetSize={w:Number($('floorboxPresetWidth').value)/100,depth:Number($('floorboxPresetDepth').value)/100,estimated:false};updateDimensions();};
  $('floorboxMeasuredWidth').onclick=()=>{presetSize={...presetSize,w:FLOORBOX_MEASUREMENTS.boxWidth,estimated:true};$('floorboxPresetWidth').value=cm(presetSize.w);updateDimensions();};
  $('addFixtureKind').onchange=()=>{$('addFixtureWall').disabled=$('addFixtureKind').value==='floorbox';};
  $('addFixtureBtn').onclick=()=>{try{read();validateRoom(draft.room);if(draft.fixtures.length>=80)throw new Error('시설은 최대 80개까지 추가할 수 있습니다.');const kind=$('addFixtureKind').value,wall=$('addFixtureWall').value;draft.fixtures.push(newFixture(kind,wall,draft.room,draft.fixtures,`fx-${Date.now()}-${++serial}`));render();toast(FIXTURE_TYPES[kind].name+'을 추가했습니다. 위치와 크기를 확인한 뒤 적용하세요.');}catch(e){toast(e.message);}};
  document.querySelectorAll('[data-remove-fixture]').forEach(button=>button.onclick=()=>{read();draft.fixtures=draft.fixtures.filter(f=>f.id!==button.dataset.removeFixture);render();});
  $('clearFixtures').onclick=()=>{read();draft.fixtures=[];render();toast('시설 목록을 비웠습니다. 공간에 적용하거나 취소할 수 있습니다.');};
  $('applyFloorboxPreset').onclick=()=>{try{
   read();validateRoom(draft.room);if(!isClassroomRoom(draft.room))throw new Error('9 × 12m 교육장에서 적용할 수 있습니다.');
   const visible=$('showFloorboxes').checked,boxes=classroomFloorBoxes(draft.fixtures,draft.room,presetSize).map(f=>({...f,hidden:!visible}));
   const next=[...draft.fixtures.filter(f=>f.kind!=='floorbox'),...boxes];validateFixtures(next,draft.room);draft.fixtures=next;
   render();document.querySelector('.floorbox-details').open=true;
   toast('단자함 13개를 배치했습니다. 기준을 확인한 뒤 공간에 적용하세요.');
  }catch(e){toast(e.message);}};
  $('showFloorboxes').onchange=()=>{for(const f of draft.fixtures.filter(f=>f.kind==='floorbox'))f.hidden=!$('showFloorboxes').checked;};
  $('cancelRoom').onclick=()=>$('dialog').close();
  $('applyRoom').onclick=()=>{try{
   read();validateRoom(draft.room);
   if(['w','d','h'].some(k=>draft.room[k]!==current.room[k]))draft.fixtures=fitFixturesToRoom(draft.fixtures,draft.room);
   validateFixtures(draft.fixtures,draft.room);onApply(draft);$('dialog').close();toast('공간 크기와 시설을 적용했습니다.');
  }catch(e){toast(e.message);}};
 }
 render();
}
