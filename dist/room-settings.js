import {WALLS,FIXTURE_TYPES,wallLength,validateRoom,validateFixtures,fitFixturesToRoom,newFixture} from './room-structure.mjs';
import {classroomFloorBoxes,isClassroomRoom} from './floor-boxes.mjs';

export function openRoomEditor(current,{openDialog,toast,onApply}){
 const $=id=>document.getElementById(id),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const draft=structuredClone(current);let serial=0;
 const cm=v=>Math.round(v*1000)/10;
 const wallOptions=value=>WALLS.map(([k,label])=>`<option value="${k}" ${value===k?'selected':''}>${label} · ${wallLength(k,draft.room)}m</option>`).join('');
 const input=(f,key,label)=>`<label>${label}<input type="number" data-fkey="${key}" aria-label="${escape(f.name)} ${label}" value="${cm(f[key]||0)}" step="1" min="0"></label>`;
 const card=f=>`<section class="facility-card" data-fixture="${f.id}"><div class="facility-head"><span>${FIXTURE_TYPES[f.kind].name}</span><input class="facility-name" data-fkey="name" value="${escape(f.name)}" maxlength="50" aria-label="${escape(f.name)} 이름"><button class="facility-delete" data-remove-fixture="${f.id}" aria-label="${escape(f.name)} 삭제">삭제</button></div><div class="facility-fields">${f.kind==='floorbox'?input(f,'x','왼쪽 벽 → 중심 cm')+input(f,'z','정면 벽 → 중심 cm'):`<label>벽 위치<select data-fkey="wall" aria-label="${escape(f.name)} 벽 위치">${wallOptions(f.wall)}</select></label>${input(f,'offset','시작점 cm')}`}${input(f,'w','가로 cm')}${input(f,'depth','깊이 cm')}${input(f,'h','높이 cm')}${f.kind==='floorbox'?'':input(f,'bottom','바닥에서 cm')}</div></section>`;
 function read(){
  draft.room={w:Number($('prop-roomW').value)/100,d:Number($('prop-roomD').value)/100,h:Number($('prop-roomH').value)/100,tile:.45};
  for(const row of document.querySelectorAll('[data-fixture]')){
   const f=draft.fixtures.find(f=>f.id===row.dataset.fixture);
   for(const el of row.querySelectorAll('[data-fkey]')){const key=el.dataset.fkey;f[key]=['wall','name'].includes(key)?el.value:Number(el.value)/100;}
   f.name=f.name.trim()||FIXTURE_TYPES[f.kind].name;
  }
  draft.settings.computers=$('deskComputers').checked;
 }
 function render(){
  openDialog('공간 크기와 시설','ROOM & ARCHITECTURE',`<p class="room-intro">새 장소의 크기를 입력하고 문·창문·설비를 자유롭게 구성하세요. 변경한 크기와 시설도 배치 파일에 함께 저장됩니다.</p><div class="room-grid">${[['roomW','공간 가로',draft.room.w],['roomD','공간 세로',draft.room.d],['roomH','천장 높이',draft.room.h]].map(([id,label,v])=>`<label class="room-size-field" for="prop-${id}">${label}<div><input id="prop-${id}" type="number" value="${cm(v)}" min="${id==='roomH'?200:300}" max="${id==='roomH'?600:3000}" step="1"><span>cm</span></div></label>`).join('')}</div><p id="roomSizeSummary" class="modal-note"></p><div class="facility-section-head"><div><h3>문 · 창문 · 고정 시설 <span>${draft.fixtures.length}/80</span></h3><p>시작점: 정면·후면은 왼쪽 모서리, 좌·우 벽은 정면 모서리 기준</p></div><button id="clearFixtures" class="button quiet">시설 비우기</button></div><div class="facility-add"><select id="addFixtureKind" aria-label="추가할 시설 종류">${Object.entries(FIXTURE_TYPES).map(([kind,p])=>`<option value="${kind}" ${kind==='window'?'selected':''}>${p.name}</option>`).join('')}</select><select id="addFixtureWall" aria-label="추가할 시설 벽 위치">${wallOptions('left')}</select><button id="addFixtureBtn" class="button primary" data-icon="plus">시설 추가</button></div><div id="facilityList">${draft.fixtures.filter(f=>f.kind!=='floorbox').map(card).join('')||'<div class="facility-empty">벽면 시설이 없습니다. 위에서 필요한 시설을 추가하세요.</div>'}</div><details class="floorbox-details" ${draft.fixtures.every(f=>f.kind==='floorbox')?'open':''}><summary>바닥 단자함 · ${draft.fixtures.filter(f=>f.kind==='floorbox').length}개</summary><aside class="floorbox-preset" aria-label="교육장 단자함 배치 기준"><div class="floorbox-preset-head"><div><strong>교육장 단자함 배치</strong><span>9 × 12m · 3열 × 4줄 12개 + 맞은편 벽 중앙 1개</span></div><button id="applyFloorboxPreset" class="button quiet" ${isClassroomRoom(draft.room)?'':'disabled'}>단자함 위치 적용</button></div><div class="floorbox-metrics"><div><span>좌우 중심 간격</span><strong>228<small> cm</small></strong></div><div><span>앞뒤 중심 간격</span><strong>211<small> cm</small></strong></div><div><span>스크린벽 → 첫 줄</span><strong>85<small> cm</small></strong></div></div><p class="floorbox-reference"><strong>현재 적용 기준</strong> · 첫 줄은 스크린벽에서 85cm, 앞뒤 간격은 211cm입니다. 단독 1개는 출입문 맞은편 벽 전체 길이의 중앙에서 실내 쪽으로 130cm에 놓았습니다. 세 열의 가로 간격은 228cm이며 좌우 중앙에 임시 배치했습니다. 12m 공간에서 마지막 줄과 문벽 사이는 482cm로, 이전의 360cm와 차이가 있어 공간 깊이 확인이 필요합니다. 모든 값은 단자함 중심 기준입니다.</p><div class="floorbox-coordinates"><span>왼쪽 벽 기준 X <b>222 · 450 · 678cm</b></span><span>정면 벽 기준 Z <b>85 · 296 · 507 · 718cm</b></span></div><p id="floorboxPresetNote" class="modal-note">바닥 단자함만 이 배치로 바꿉니다. 가구와 벽면 시설은 유지되며, 아래에서 좌표를 직접 수정할 수 있습니다.</p></aside><label class="checkbox-row"><input type="checkbox" id="showFloorboxes" ${draft.fixtures.some(f=>f.kind==='floorbox'&&!f.hidden)?'checked':''}>바닥 단자함 표시</label>${draft.fixtures.filter(f=>f.kind==='floorbox').map(card).join('')}</details><label class="checkbox-row"><input type="checkbox" id="deskComputers" ${draft.settings.computers?'checked':''}>책상에 모니터·본체 세트 표시</label><p class="modal-note">바닥 타일은 45 × 45cm입니다. 공간을 줄이면 범위 밖 시설·가구를 안쪽으로 옮깁니다. 문·창문이 겹치면 위치를 조정해 주세요.</p><div class="dialog-actions room-apply-actions"><button class="button quiet" id="cancelRoom">취소</button><button class="button primary" id="applyRoom" data-icon="check">공간에 적용</button></div>`,930);
  function updateDimensions(){
   const r={w:Number($('prop-roomW').value)/100,d:Number($('prop-roomD').value)/100};
   $('applyFloorboxPreset').disabled=!isClassroomRoom(r);
   $('floorboxPresetNote').textContent=isClassroomRoom(r)?'바닥 단자함만 이 배치로 바꿉니다. 가구와 벽면 시설은 유지되며, 아래에서 좌표를 직접 수정할 수 있습니다.':'이 배치는 9 × 12m 정보화교육장 기준입니다. 다른 크기의 공간은 아래 단자함 좌표를 직접 입력하세요.';
   $('roomSizeSummary').textContent=`${Number.isFinite(r.w*r.d)?Math.round(r.w*r.d*100)/100:0}㎡ · 바닥 45 × 45cm · 가로·세로 3~30m / 높이 2~6m`;
   for(const select of document.querySelectorAll('[data-fkey="wall"],#addFixtureWall'))for(const option of select.options){const label=WALLS.find(([key])=>key===option.value)[1];option.textContent=`${label} · ${wallLength(option.value,r)}m`;}
  }
  updateDimensions();for(const id of ['prop-roomW','prop-roomD','prop-roomH'])$(id).oninput=updateDimensions;
  $('addFixtureKind').onchange=()=>{$('addFixtureWall').disabled=$('addFixtureKind').value==='floorbox';};
  $('addFixtureBtn').onclick=()=>{try{read();validateRoom(draft.room);if(draft.fixtures.length>=80)throw new Error('시설은 최대 80개까지 추가할 수 있습니다.');const kind=$('addFixtureKind').value,wall=$('addFixtureWall').value;draft.fixtures.push(newFixture(kind,wall,draft.room,draft.fixtures,`fx-${Date.now()}-${++serial}`));render();toast(FIXTURE_TYPES[kind].name+'을 추가했습니다. 위치와 크기를 확인한 뒤 적용하세요.');}catch(e){toast(e.message);}};
  document.querySelectorAll('[data-remove-fixture]').forEach(button=>button.onclick=()=>{read();draft.fixtures=draft.fixtures.filter(f=>f.id!==button.dataset.removeFixture);render();});
  $('clearFixtures').onclick=()=>{read();draft.fixtures=[];render();toast('시설 목록을 비웠습니다. 공간에 적용하거나 취소할 수 있습니다.');};
  $('applyFloorboxPreset').onclick=()=>{try{
   read();validateRoom(draft.room);if(!isClassroomRoom(draft.room))throw new Error('9 × 12m 교육장에서 적용할 수 있습니다.');
   const visible=$('showFloorboxes').checked,boxes=classroomFloorBoxes(draft.fixtures,draft.room).map(f=>({...f,hidden:!visible}));
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
