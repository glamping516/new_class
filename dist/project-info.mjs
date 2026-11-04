export const MAKER_CREDIT='made by 강민준';
export const DEFAULT_PROJECT_INFO=Object.freeze({projectLabel:MAKER_CREDIT,title:'새 정보화교육장',planLabel:'배치 계획'});

// Missing fields in older v2 layouts retain their familiar defaults. Optional
// labels can be empty; titles always remain useful in tabs and exported files.
export function readProjectInfo(raw={}){
 const text=(key,max,required=false)=>{const value=typeof raw?.[key]==='string'?raw[key].replace(/\s+/gu,' ').trim().slice(0,max):DEFAULT_PROJECT_INFO[key];return required&&!value?DEFAULT_PROJECT_INFO[key]:value;};
 return{projectLabel:MAKER_CREDIT,title:text('title',80,true),planLabel:text('planLabel',30)};
}
export function projectFileStem(raw){return readProjectInfo(raw).title.replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,60).replace(/[. ]+$/g,'')||'배치안';}
