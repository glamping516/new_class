import * as THREE from './vendor/three.module.min.js';
export const screenTarget=item=>item.screenRaised?1:0;
export function readScreenRaised(value){if(value===undefined)return false;if(typeof value!=='boolean')throw new Error('스크린 올림 상태가 올바르지 않습니다.');return value;}
export const screenVisibleHeight=(height,progress)=>.025+(height-.025)*(1-Math.min(1,Math.max(0,progress)));
export function screenTween(from,to,t){const u=Math.min(1,Math.max(0,t)),ease=u*u*(3-2*u);return from+(to-from)*ease;}
export function buildScreenModel([w,d,h],{box,mats}){
 const g=new THREE.Group();g.userData.wallPanel=true;const housing=box(g,w+.05,.075,d,0,h+.04,0,mats.white);
 const back=box(g,w,h,.018,0,h/2,0,mats.dark),front=box(g,w-.055,h-.055,.022,0,h/2,.013,mats.screen),bar=box(g,w+.025,.026,.03,0,.007,.007,mats.dark);
 g.userData.screenParts={housing,back,front,bar,height:h};g.userData.screenProgress=0;return g;
}
export function applyScreenProgress(group,progress){const parts=group?.userData.screenParts;if(!parts)return;progress=Math.min(1,Math.max(0,progress));const h=parts.height,visible=screenVisibleHeight(h,progress);parts.back.scale.y=visible/h;parts.back.position.y=h-visible/2;parts.front.visible=visible>.06;parts.front.scale.y=Math.max(.001,(visible-.055)/(h-.055));parts.front.position.y=h-visible/2;parts.bar.position.y=h-visible+.007;group.userData.screenProgress=progress;}
export function screenVerticalRange(base,height,progress){return[base+height-screenVisibleHeight(height,progress),base+height+.08];}
