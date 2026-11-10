import {CATALOG,isDesk} from './furniture.mjs';
import {corners,dimsOf} from './geometry.mjs';
import {floorboxEdges} from './floor-boxes.mjs';

const area=polygon=>Math.abs(polygon.reduce((sum,p,n)=>{const next=polygon[(n+1)%polygon.length];return sum+p.x*next.z-next.x*p.z;},0))/2;

// Clip the actual rotated footprint to the rectangular terminal plate.
// An edge touch has no area and is not counted as a planar overlap.
export function footprintIntersection(polygon,box){
 const e=box.edges||floorboxEdges(box);let result=polygon.map(p=>({...p}));
 for(const [axis,limit,sign]of [['x',e.minX,1],['x',e.maxX,-1],['z',e.minZ,1],['z',e.maxZ,-1]]){
  const input=result;result=[];if(!input.length)break;
  for(let n=0;n<input.length;n++){
   const a=input[n],b=input[(n+1)%input.length],insideA=sign*(a[axis]-limit)>=-1e-10,insideB=sign*(b[axis]-limit)>=-1e-10;
   if(insideA)result.push(a);
   if(insideA!==insideB){const t=(limit-a[axis])/(b[axis]-a[axis]);result.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
  }
 }
 return result.length>=3&&area(result)>1e-9?result:[];
}

export function constructionPlan(state,records,catalog=CATALOG){
 const footprints=[];
 for(const [index,item]of state.items.entries()){
  if(item.hidden)continue;
  const spec=catalog.find(c=>c.type===item.type);if(!spec)continue;
  // Wall-mounted and raised tabletop items do not cover the floor-access area.
  if(spec.wallMounted||spec.category==='wallcover'||(item.y||0)>.05)continue;
  const [w,d]=dimsOf(item,catalog);if(![w,d,item.x,item.z].every(Number.isFinite)||w<=0||d<=0)continue;
  const round=spec.model==='roundTable'||spec.model==='stool'||(spec.model==='bin'&&spec.style==='pedal');
  let polygon=corners(item,catalog);
  if(round){const r=(item.rot||0)*Math.PI/180;polygon=Array.from({length:64},(_,n)=>{const a=n/64*Math.PI*2,x=Math.cos(a)*w/2,z=Math.sin(a)*d/2;return{x:item.x+x*Math.cos(r)+z*Math.sin(r),z:item.z-x*Math.sin(r)+z*Math.cos(r)};});}
  const code=(isDesk(item.type)?'D':'G')+String(index+1).padStart(2,'0');
  footprints.push({id:item.id,code,name:item.name||spec.name,desk:isDesk(item.type),x:item.x,z:item.z,polygon,overlaps:[]});
 }
 const coverage=records.map(box=>({id:box.id,code:box.code,items:[]}));
 for(const item of footprints)for(const [index,box]of records.entries()){
  const polygon=footprintIntersection(item.polygon,box);if(!polygon.length)continue;
  item.overlaps.push({id:box.id,code:box.code,polygon});
  coverage[index].items.push({id:item.id,code:item.code,name:item.name,desk:item.desk});
 }
 return{footprints,coverage,covered:coverage.filter(c=>c.items.length)};
}

// Keep the geometry and colors identical in the SVG overlay and PNG/PDF output.
export function planAppearance(item){
 return item.overlaps.length?{stroke:'#ff967f',fill:'#ff896a',alpha:.18}:{stroke:item.desk?'#83dae5':'#6b9eaf',fill:'#70c5db',alpha:item.desk?.14:.07};
}
