import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {CATALOG,isDesk,isWallBoard} from '../dist/furniture.mjs';
import {SoftwareRenderer} from '../dist/software-renderer.js';
import {buildExtraModel} from '../dist/extra-models.js';
import {buildScreenModel,applyScreenProgress,screenVisibleHeight,screenTween,screenVerticalRange,readScreenRaised} from '../dist/screen-model.mjs';
import {mountBoardBehindScreen} from '../dist/wall-placement.mjs';
import {placePrinterOnDesk} from '../dist/tabletop-placement.mjs';
import {bounds} from '../dist/geometry.mjs';
const material=color=>new THREE.MeshStandardMaterial({color});
const mats=Object.fromEntries(['white','dark','screen','woodSide','frame','metal','panel'].map(k=>[k,material('#aabbcc')]));
const box=(g,w,h,d,x,y,z,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
const cylinder=(g,rt,rb,h,x,y,z,m,segments=12)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;};
const kit={material,mats,box,cylinder};
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('CPU export hides selection lines when any parent group is hidden',()=>{
 const previous=globalThis.document;let strokes=0;
 const ctx={setTransform(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){strokes++;}};
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 try{
  const renderer=new SoftwareRenderer(),scene=new THREE.Scene(),parent=new THREE.Group(),nested=new THREE.Group();
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1,0,-2),new THREE.Vector3(1,0,-2)]),new THREE.LineBasicMaterial({color:'#339966'}));
  nested.add(line);parent.add(nested);scene.add(parent);parent.visible=false;
  const camera=new THREE.PerspectiveCamera();renderer.render(scene,camera);assert.equal(strokes,0);
  parent.visible=true;renderer.render(scene,camera);assert.equal(strokes,1);
 }finally{globalThis.document=previous;}
});

test('expanded library has unique items, product board dimensions and non-PC counseling furniture',()=>{
 assert.equal(CATALOG.length,58);assert.equal(new Set(CATALOG.map(c=>c.type)).size,CATALOG.length);
 for(const c of CATALOG)assert(c.dims.length===3&&c.dims.every(v=>Number.isFinite(v)&&v>0));
 assert.deepEqual(CATALOG.filter(c=>isWallBoard(c.type)).map(c=>c.boardFace),[[.9,.6],[1.2,.9],[1.5,.9],[1.8,.9],[1.8,1.2],[2.4,1.2]]);
 for(const c of CATALOG.filter(c=>c.category==='whiteboard'))assert(c.sourceUrl.startsWith('https://'));
 for(const c of CATALOG.filter(c=>c.category==='consult'))assert.equal(isDesk(c.type),false);
});

test('every new item builds finite 3D geometry within its planning footprint',()=>{
 for(const c of CATALOG.filter(c=>c.model)){
  const model=buildExtraModel(c,c.dims,kit);assert(model.children.length>0,c.type);
  const b=new THREE.Box3().setFromObject(model),[w,d,h]=c.dims;
  assert([b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].every(Number.isFinite),c.type);
  assert(b.min.x>=-w/2-.03&&b.max.x<=w/2+.03,`${c.type}: width`);
  assert(b.min.z>=-d/2-.03&&b.max.z<=d/2+.03,`${c.type}: depth`);
  assert(b.min.y>=-.01&&b.max.y<=h+.03,`${c.type}: height`);
 }
});

test('whiteboard attaches behind a rotated screen without leaving the room',()=>{
 const room={w:9,d:12,h:2.7},board={type:'whiteboardWall180x120',x:1,z:1,y:.95,rot:0};
 for(const [x,z,rot] of [[4.5,.12,0],[8.88,6,270],[4.5,11.88,180],[.12,6,90]]){
  const screen={type:'screen',x,z,rot},placed=mountBoardBehindScreen(board,screen,room,CATALOG),b=bounds(placed,CATALOG),r=rot*Math.PI/180;
  assert((screen.x-placed.x)*Math.sin(r)+(screen.z-placed.z)*Math.cos(r)>0,'behind screen');
  assert(b.minX>=-.001&&b.minZ>=-.001&&b.maxX<=9.001&&b.maxZ<=12.001);
  assert.equal(placed.rot,rot);close(placed.y,.95);
 }
 assert.deepEqual(board,{type:'whiteboardWall180x120',x:1,z:1,y:.95,rot:0});
 const front=mountBoardBehindScreen({...board,y:10},null,room,CATALOG);close(front.y,1.5);close(front.x,4.5);assert(front.z<.03);
});

test('screen rolls upward at a fixed top edge while housing stays fixed',()=>{
 const screen=buildScreenModel([2.45,.1,1.8],kit),{housing,back,bar}=screen.userData.screenParts,top=1.8;
 const housingAt=housing.position.clone();let previousBar=-Infinity;
 for(const t of [0,.1,.25,.5,.75,.9,1]){
  applyScreenProgress(screen,screenTween(0,1,t));
  const visible=screenVisibleHeight(top,t);
  assert(visible>0&&visible<=top);assert(bar.position.y>=previousBar);previousBar=bar.position.y;
  close(back.position.y+top*back.scale.y/2,top);assert(housing.position.equals(housingAt));
 }
 close(screen.userData.screenProgress,1);assert.equal(screen.userData.screenParts.front.visible,false);
 const [low,high]=screenVerticalRange(.55,top,1);assert(low>2.3&&high>low);
 applyScreenProgress(screen,0);close(bar.position.y,.007);assert.equal(screen.userData.screenParts.front.visible,true);
 close(screenTween(.65,0,0),.65);close(screenTween(.65,0,1),0);
});

test('screen state remains backward compatible and survives JSON round trips',()=>{
 assert.equal(readScreenRaised(undefined),false);
 for(const screenRaised of [true,false])assert.equal(readScreenRaised(JSON.parse(JSON.stringify({screenRaised})).screenRaised),screenRaised);
 for(const bad of ['true',1,null])assert.throws(()=>readScreenRaised(bad));
});


test('CPU fallback hides the complete board behind a lowered screen and reveals it when raised',()=>{
 const oldDocument=globalThis.document,paints=[];let points=[];
 const context={beginPath(){points=[];},moveTo(x,y){points.push({x,y});},lineTo(x,y){points.push({x,y});},closePath(){},fill(){paints.push({color:this.fillStyle,points:[...points]});},stroke(){},setTransform(){},fillRect(){}};
 globalThis.document={createElement:()=>({getContext:()=>context,style:{}})};
 try{
  const renderer=new SoftwareRenderer();renderer.setSize(924,821);const scene=new THREE.Scene(),screen=buildScreenModel([2.45,.1,1.8],kit);screen.position.set(4.5,.55,.08);scene.add(screen);
  const camera=new THREE.PerspectiveCamera(38,924/821,.1,150);camera.position.set(16.5,15,22);camera.lookAt(4.5,0,6);
  const contains=(poly,p)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;};
  const colorAt=p=>paints.filter(f=>contains(f.points,p)).at(-1)?.color;
  renderer.render(scene,camera);const probes=[3.61,4.5,5.4].map(x=>renderer.project(new THREE.Vector3(x,1.55,.02))),before=probes.map(colorAt);assert(before.every(Boolean));
  const c=CATALOG.find(c=>c.type==='whiteboardWall180x120'),board=buildExtraModel(c,c.dims,{...kit,material:()=>material('#ff0000'),mats:Object.fromEntries(Object.keys(mats).map(k=>[k,material('#ff0000')]))});board.position.set(4.5,.95,.018);scene.add(board);
  paints.length=0;renderer.render(scene,camera);assert.deepEqual(probes.map(colorAt),before,'opaque screen covers board face and edge');
  applyScreenProgress(screen,1);paints.length=0;renderer.render(scene,camera);assert(probes.some((p,n)=>colorAt(p)!==before[n]),'raised screen exposes the board');
 }finally{globalThis.document=oldDocument;}
});


test('desktop printer fits rotated tabletops at their actual height and refuses unsuitable surfaces',()=>{
 const room={w:9,d:12,h:2.7},desk={id:'desk-1',type:'computerDesk',x:4,z:4,y:.1,rot:90},printer={id:'printer',type:'desktopPrinter',x:4.25,z:3.4,y:0,rot:0};
 const mounted=placePrinterOnDesk(printer,[desk],room,CATALOG),p=bounds(mounted,CATALOG),d=bounds(desk,CATALOG);
 close(mounted.y,.82);assert.equal(mounted.rot,90);assert(p.minX>=d.minX&&p.maxX<=d.maxX&&p.minZ>=d.minZ&&p.maxZ<=d.maxZ);assert.equal(printer.y,0);
 const farDesk={id:'desk-2',type:'desk',x:8,z:10,y:0,rot:0};const selected=placePrinterOnDesk(printer,[desk,farDesk],room,CATALOG,{nearest:true,preferredId:farDesk.id});close(selected.x,8);close(selected.z,10);close(selected.y,.7);
 assert.equal(placePrinterOnDesk({...printer,x:1,z:1},[desk],room,CATALOG),null);
 assert.equal(placePrinterOnDesk(printer,[{...desk,dims:[.3,.3,.72]}],room,CATALOG,{nearest:true}),null);
 assert.equal(placePrinterOnDesk(printer,[desk],{...room,h:.9},CATALOG,{nearest:true}),null);
 assert.equal(placePrinterOnDesk(printer,[{...desk,type:'sofaCompact'}],room,CATALOG,{nearest:true}),null);
});
