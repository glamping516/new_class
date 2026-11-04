import * as THREE from './vendor/three.module.min.js';
import {solidRegions} from './wall-covers.mjs';

export function buildWallCoverModel(spec,[w,d,h],{box,cylinder,material,mats},options={}){
 const g=new THREE.Group();g.userData.wallPanel=true;
 const paint=material(options.color||spec.color,{roughness:.98}),foldShade=material(new THREE.Color(options.color||spec.color).multiplyScalar(.88),{roughness:1}),shade=material('#444a45'),frame=material('#d6dcd5',{metalness:.2}),grain=material('#94764f'),open=options.coverOpen===true;
 const regions=solidRegions(w,h,options.cutouts||[]);
 const paintRect=(x1,x2,y1,y2,mat=paint,depth=d,z=0)=>{if(x2-x1>.001&&y2-y1>.001)box(g,x2-x1,y2-y1,depth,(x1+x2)/2,(y1+y2)/2,z,mat);};
 if(spec.style==='roller'){
  const count=Math.ceil(w/(spec.maxUnitWidth||2.4)),unit=w/count,railH=Math.min(.065,h*.12),fabricD=Math.min(.007,d*.15);
  for(let k=0;k<count;k++){const left=-w/2+k*unit,right=left+unit,visible=open?.035:h-railH;
   paintRect(left+.002,right-.002,h-railH,h,frame,d,0);paintRect(left+.006,right-.006,h-railH-visible,h-railH,paint,fabricD,0);
   paintRect(left+.004,right-.004,h-railH-visible,h-railH-visible+.018,frame,Math.min(d,.025),0);
   const chain=cylinder(g,.003,.003,Math.min(h*.75,1.5),right-.018,h*.55,d*.3,shade,6);chain.userData.decorative=true;
  }
 }else if(spec.style==='curtain'){
  const railH=Math.min(.03,h*.1),railD=Math.min(.03,d),panels=open?[[-w/2,-w*.33],[w*.33,w/2]]:[[-w/2,w/2]];
  paintRect(-w/2,w/2,h-railH,h,frame,railD,0);
  for(const [left,right] of panels){const folds=Math.min(180,Math.max(6,Math.ceil((right-left)/.06))),step=(right-left)/folds;
   for(let n=0;n<folds;n++){const z=Math.sin(n*Math.PI/2)*d*.28,foldD=d*.34;paintRect(left+n*step,left+(n+1)*step,0,h-railH,n%2?paint:foldShade,foldD,z);}
  }
 }else if(spec.style==='slat'){
  for(const r of regions)paintRect(r.x1,r.x2,r.y1,r.y2,shade,d*.4,-d*.3);
  const pitch=.04,slatW=.027,count=Math.min(760,Math.ceil(w/pitch));
  for(let k=0;k<count;k++){const x1=-w/2+k*pitch,x2=Math.min(w/2,x1+slatW);for(const r of regions){const a=Math.max(x1,r.x1),b=Math.min(x2,r.x2);if(b>a)paintRect(a,b,r.y1,r.y2,paint,d*.59,d*.2);}}
 }else{
  const border=spec.style==='acoustic'?.008:.002;
  for(const r of regions)paintRect(r.x1,r.x2,r.y1,r.y2);
  // Modular joints and fine wood grain make the products distinct in 3D.
  const moduleW=spec.unit?.[0]||1.2,moduleH=spec.unit?.[2]||2.4,joint=material(spec.style==='acoustic'?'#7e8a80':'#a0a394');
  for(let x=-w/2+moduleW;x<w/2-.001;x+=moduleW)for(const r of regions)if(x>r.x1&&x<r.x2)paintRect(x-border/2,x+border/2,r.y1,r.y2,joint,.001,d/2-.0005);
  for(let y=moduleH;y<h-.001;y+=moduleH)for(const r of regions)if(y>r.y1&&y<r.y2)paintRect(r.x1,r.x2,y-border/2,y+border/2,joint,.001,d/2-.0005);
  if(spec.style==='woodPanel')for(let x=-w/2+.045;x<w/2;x+=.065)for(const r of regions)if(x>r.x1&&x<r.x2)paintRect(x,x+.001,r.y1,r.y2,grain,.001,d/2-.0005);
 }
 g.traverse(o=>{if(o.isMesh)o.userData.ownMaterial=true;});
 return g;
}
