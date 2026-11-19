import * as THREE from './vendor/three.module.min.js';
import {buildWallCoverModel} from './wall-cover-models.js';

// These furniture models use their actual footprint and total height for drag,
// snapping and clearance checks. Colors and designs are planning illustrations.
export function buildExtraModel(spec,dims,kit,options={}){
 if(spec.wallCover)return buildWallCoverModel(spec,dims,kit,options);
 const {box,cylinder,material,mats}=kit,[w,d,h]=dims,g=new THREE.Group();
 const surface=material(spec.color||'#d8ded3',{roughness:spec.model==='sofa'?.96:.7}),timber=mats.woodSide,frame=material('#5f6d65',{metalness:.25,roughness:.5});
 const roundBox=(width,height,depth,x,y,z,mat,radius=.025)=>{
  const r=Math.min(radius,width/3,depth/3),x0=-width/2,z0=-depth/2,shape=new THREE.Shape();
  shape.moveTo(x0+r,z0);shape.lineTo(x0+width-r,z0);shape.quadraticCurveTo(x0+width,z0,x0+width,z0+r);shape.lineTo(x0+width,z0+depth-r);shape.quadraticCurveTo(x0+width,z0+depth,x0+width-r,z0+depth);shape.lineTo(x0+r,z0+depth);shape.quadraticCurveTo(x0,z0+depth,x0,z0+depth-r);shape.lineTo(x0,z0+r);shape.quadraticCurveTo(x0,z0,x0+r,z0);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1,curveSegments:3});geo.rotateX(-Math.PI/2);geo.translate(0,-height/2,0);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;
 };
 const feet=(height=.35,mat=frame,inset=.075)=>{for(const x of [-w/2+inset,w/2-inset])for(const z of [-d/2+inset,d/2-inset])cylinder(g,.014,.019,height,x,height/2,z,mat,8);};
 if(spec.model==='sofa'){
  const arm=Math.min(.11,w*.12),seatY=h*.46,baseY=h*.25;
  feet(h*.19,timber,.10);roundBox(w-.05,h*.16,d-.05,0,baseY,0,surface,.045);
  roundBox(w,h*.43,.12,0,h*.785,-d/2+.06,surface,.04);
  for(const x of [-w/2+arm/2,w/2-arm/2])roundBox(arm,h*.43,d,x,h*.515,0,surface,.035);
  const seatW=(w-2*arm-.025)/(spec.seats||1);for(let k=0;k<(spec.seats||1);k++){const x=-(w-2*arm-.025)/2+seatW*(k+.5);roundBox(seatW-.014,h*.14,d-.15,x,seatY,.04,surface,.045);roundBox(seatW-.025,h*.30,.11,x,h*.70,-d/2+.14,material(spec.color||'#b4c1b0'),.025);}
 }else if(spec.model==='roundTable'||spec.model==='squareTable'){
  const topY=h-.025,topH=.04;if(spec.model==='roundTable'){const top=cylinder(g,w/2,w/2,topH,0,topY,0,surface,32);top.scale.z=d/w;}else roundBox(w,topH,d,0,topY,0,surface,.04);
  if(spec.pedestal){cylinder(g,Math.min(w,d)*.06,Math.min(w,d)*.07,h-.055,0,(h-.055)/2,0,frame,16);const base=cylinder(g,w*.29,w*.30,.026,0,.013,0,frame,24);base.scale.z=d/w;}
  else if(spec.legs===3){for(let k=0;k<3;k++){const a=k*Math.PI*2/3;cylinder(g,.018,.025,h-.05,Math.cos(a)*w*.29,(h-.05)/2,Math.sin(a)*d*.29,timber,10);}}
  else feet(h-.05,timber,Math.min(w,d)*.14);
 }else if(spec.model==='cleanChair'){
  const seatY=h*.54,seatW=spec.style==='arm'?w-.13:w-.025,seatD=d*.76,legMat=spec.style==='wood'?timber:frame;
  roundBox(seatW,.065,seatD,0,seatY,.025,surface,.065);roundBox(w-.035,h*.37,.065,0,h*.815,-d*.35,surface,.06);
  if(spec.style==='sled')for(const x of [-w*.39,w*.39]){box(g,.021,seatY-.025,.021,x,(seatY-.025)/2,-d*.3,legMat);box(g,.021,seatY-.025,.021,x,(seatY-.025)/2,d*.29,legMat);box(g,.025,.025,d*.66,x,.013,0,legMat);}
  else feet(seatY-.04,legMat,Math.min(w,d)*.16);
  if(spec.style==='arm')for(const x of [-w/2+.03,w/2-.03]){box(g,.025,h*.24,.025,x,h*.60,.02,frame);roundBox(.06,.045,d*.59,x,h*.72,.02,surface,.02);}
  if(spec.style==='fabric'||spec.style==='arm')roundBox(seatW-.035,.026,seatD-.025,0,seatY+.041,.025,material(spec.color,{roughness:.98}),.06);
 }else if(spec.model==='stool'){
  cylinder(g,w/2,w/2,.075,0,h-.0375,0,surface,28);feet(h-.075,timber,.07);
 }else if(spec.model==='bin'){
  if(spec.style==='pedal'){cylinder(g,w*.46,w*.42,h-.035,0,(h-.035)/2,0,surface,28);cylinder(g,w*.5,w*.5,.028,0,h-.014,0,mats.dark,28);box(g,w*.29,.016,d*.15,0,.015,d*.36,mats.metal);}
  else if(spec.style==='recycle'){roundBox(w,h-.035,d,0,(h-.035)/2,0,surface,.035);for(let k=0;k<3;k++){const x=(k-1)*w/3;roundBox(w/3-.014,.03,d-.014,x,h-.015,0,material(['#a2b9c3','#a7baa4','#c4baa5'][k]),.02);box(g,w/3-.085,.004,d*.32,x,h+.002,0,mats.dark);box(g,w*.17,.038,.004,x,h*.65,d/2+.003,material(['#a2b9c3','#a7baa4','#c4baa5'][k]));}}
  else{roundBox(w,h-.035,d,0,(h-.035)/2,0,surface,.04);roundBox(w,.035,d,0,h-.0175,0,mats.dark,.04);box(g,w*.4,.012,d*.31,0,h+.002,0,mats.panel);}
 }else if(spec.model==='storage'){
  const t=.025;box(g,w,.035,d,0,h-.0175,0,timber);box(g,t,h-.055,d,-w/2+t/2,(h-.055)/2,0,surface);box(g,t,h-.055,d,w/2-t/2,(h-.055)/2,0,surface);box(g,w-.03,.035,d,0,.045,0,surface);box(g,w,h-.04,.02,0,(h-.04)/2,-d/2+.01,surface);
  if(spec.style==='open'||spec.style==='printer'){const shelves=spec.style==='open'?3:1;for(let n=1;n<=shelves;n++)box(g,w-.04,.025,d-.025,0,n*(h-.06)/(shelves+1),.005,surface);if(spec.style==='open')for(const [k,width]of[.055,.045,.06,.04,.05].entries()){const x=-w*.31+k*.068;box(g,width,.20,d*.55,x,h*.34+.12,0,material(['#9eafa1','#bbc9cb','#cebd9d','#d0cdc0','#a4b3ba'][k]));}}
  else{for(const x of [-w*.25,w*.25]){box(g,w/2-.016,h-.095,.021,x,h/2,d/2-.01,surface);box(g,.012,.10,.013,x<0?-.035:.035,h*.58,d/2+.008,frame);}}
 }else if(spec.model==='printer'){
  const trim=material('#3c474a'),paper=material('#fafbf6'),display=material('#86afa8',{roughness:.3});
  for(const x of [-w*.36,w*.36])for(const z of [-d*.32,d*.32])box(g,w*.10,h*.06,d*.11,x,h*.03,z,trim);
  roundBox(w,h*.71,d*.90,0,h*.415,-d*.035,surface,Math.min(w,d)*.055);
  roundBox(w*.97,h*.07,d*.86,0,h*.80,-d*.045,trim,.016);
  roundBox(w*.97,h*.12,d*.85,0,h*.895,-d*.045,surface,.016);
  box(g,w*.72,h*.012,d*.57,-w*.045,h*.962,-d*.085,paper);
  box(g,w*.77,h*.09,d*.035,0,h*.54,d*.43,trim);
  roundBox(w*.79,h*.035,d*.33,0,h*.30,d*.335,trim,.012);
  box(g,w*.58,h*.018,d*.30,-w*.045,h*.328,d*.335,paper);
  box(g,w*.75,h*.018,d*.014,0,h*.14,d*.421,trim);
  box(g,w*.19,h*.035,d*.16,w*.30,h*.85,d*.29,trim);
  box(g,w*.12,h*.008,d*.09,w*.30,h*.873,d*.29,display);
  for(let k=0;k<2;k++)cylinder(g,w*.018,w*.018,h*.012,w*(.14+k*.065),h*.87,d*.29,k?mats.dark:display,10);
 }else if(spec.model==='water'){
  roundBox(w,h,d,0,h/2,0,surface,.025);box(g,w*.72,h*.33,.013,0,h*.62,d/2+.003,mats.dark);for(const x of [-w*.15,w*.15]){box(g,.025,.035,.035,x,h*.68,d/2+.01,material(x<0?'#b78078':'#7b9da8'));}box(g,w*.65,.025,d*.22,0,h*.38,d*.36,mats.metal);box(g,w*.70,.025,d*.71,0,h-.0125,0,mats.panel);
 }else if(spec.model==='coat'){
  cylinder(g,.018,.024,h*.96,0,h*.48,0,frame,12);for(let k=0;k<4;k++){const a=k*Math.PI/2;const base=box(g,w*.85,.026,.03,0,.013,0,frame);base.rotation.y=a;const branch=box(g,w*.43,.018,.02,Math.cos(a)*w*.20,h*(.78+k*.045),Math.sin(a)*d*.20,frame);branch.rotation.y=-a;cylinder(g,.009,.009,.06,Math.cos(a)*w*.40,h*(.78+k*.045)+.025,Math.sin(a)*d*.40,frame,8);}
 }else if(spec.model==='privacy'){
  roundBox(w,h-.07,.038,0,h/2+.025,0,surface,.018);for(const x of [-w*.4,w*.4]){box(g,.07,.03,d,x,.04,0,frame);for(const z of [-d*.36,d*.36])cylinder(g,.025,.025,.025,x,.0125,z,mats.dark,10);}
 }else if(spec.model==='fullHeightWall'){
  box(g,w,h,d,0,h/2,0,surface);
  box(g,w,.07,d+.002,0,.035,0,material('#bdc6bc'));
  for(const x of [-w/2+.008,w/2-.008])box(g,.016,h,d+.002,x,h/2,0,material('#d2d9ce'));
 }else if(spec.model==='whiteboard'||spec.model==='mobileBoard'){
  g.userData.wallPanel=true;
  const mobile=spec.model==='mobileBoard',bw=mobile?w*spec.boardFace[0]/spec.dims[0]:w,bh=mobile?h*spec.boardFace[1]/spec.dims[2]:h,base=mobile?h*.4:0,boardD=mobile?.035:d;
  box(g,bw,bh,boardD,0,base+bh/2,0,mats.frame);box(g,bw-.045,bh-.045,boardD*.28,0,base+bh/2,boardD*.34,material('#fbfcf7',{roughness:.27}));
  for(const [x,y,color]of [[-bw*.40,base+bh*.85,'#8baba0'],[-bw*.35,base+bh*.85,'#a8b4c6']])cylinder(g,.014,.014,.006,x,y,boardD*.55,material(color),12).rotation.x=Math.PI/2;
  box(g,.09,.023,.008,bw*.30,base+.06,boardD*.57,frame);
  if(mobile){for(const x of [-w*.45,w*.45]){box(g,.028,h-.05,.028,x,(h-.05)/2,0,frame);box(g,.065,.03,d,x,.04,0,frame);for(const z of [-d*.37,d*.37]){const wheel=cylinder(g,.032,.032,.025,x,.032,z,mats.dark,12);wheel.rotation.z=Math.PI/2;}}box(g,w*.9,.025,.04,0,h*.36,0,frame);}
 }
 return g;
}
