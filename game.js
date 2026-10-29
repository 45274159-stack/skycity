import * as THREE from './lib/three.module.js';
const $=id=>document.getElementById(id);
// ---------- renderer / scene ----------
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0xd9eef8,30,60);
const cam=new THREE.OrthographicCamera(-1,1,1,-1,0.1,200);
const CAMOFF=new THREE.Vector3(14,16,14);
let zoom=7;
function resize(){const w=innerWidth,h=innerHeight,a=w/h;renderer.setSize(w,h,false);zoom=a<0.8?Math.max(8.5,7.4/a):7;cam.left=-zoom*a;cam.right=zoom*a;cam.top=zoom;cam.bottom=-zoom;cam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();
scene.add(new THREE.HemisphereLight(0xfff4e0,0x9fc7a0,1.1));
const sun=new THREE.DirectionalLight(0xffe2b8,1.6);sun.position.set(-8,18,6);sun.castShadow=true;
const mob=matchMedia('(pointer:coarse),(max-width:700px)').matches;sun.shadow.mapSize.set(mob?1024:2048,mob?1024:2048);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:60});sun.shadow.bias=-0.0008;sun.shadow.normalBias=0.02;sun.shadow.radius=4;
scene.add(sun,sun.target);
const M=(c,o={})=>new THREE.MeshLambertMaterial({color:c,flatShading:true,...o});
// ---------- textures ----------
function dirtTex(){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
 g.fillStyle='#a4704a';g.fillRect(0,0,64,64);g.strokeStyle='#8a5a38';g.lineWidth=2;
 for(let r=0;r<4;r++){const y=r*16+16;g.beginPath();g.moveTo(0,y);g.lineTo(64,y);g.stroke();for(let k=0;k<3;k++){const x=(k*24+(r%2)*12)%64;g.beginPath();g.moveTo(x,y-16);g.lineTo(x,y);g.stroke()}}
 g.fillStyle='#6fbf55';g.fillRect(0,0,64,6);g.fillStyle='#8fd16a';for(let x=0;x<64;x+=6)g.fillRect(x,6,3,3+(x%4));
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;return t}
const sideMat=new THREE.MeshLambertMaterial({map:dirtTex()});
const grassMat=M(0x8fd16a),grassMat2=M(0x9bd873),soilMat=M(0x9a6a45),wetMat=M(0x6f4a30);
// ---------- world layout (试点 10×10 小浮岛) ----------
const MAP=['..######..','.########.','##########','##########','##########',
           '##########','##########','.########.','..######..','...####...'];
const W=10,H=MAP.length,OX=-W/2+0.5,OZ=-H/2+0.5;
const land=new Set();const key=(x,z)=>x+','+z;
MAP.forEach((r,z)=>[...r].forEach((ch,x)=>{if(ch=='#')land.add(key(x,z))}));
const isLand=(x,z)=>land.has(key(x,z));
const wx=x=>x+OX,wz=z=>z+OZ;
const DEPTH=2.2;
const floaters=[];
{const geo=new THREE.BoxGeometry(1,DEPTH,1);
 const list=[...land];
 const im=new THREE.InstancedMesh(geo,[sideMat,sideMat,grassMat,sideMat,sideMat,sideMat],list.length);
 const m4=new THREE.Matrix4();list.forEach((k,i)=>{const [x,z]=k.split(',').map(Number);m4.makeTranslation(wx(x),-DEPTH/2,wz(z));im.setMatrixAt(i,m4)});
 im.receiveShadow=true;scene.add(im);
 const g2=new THREE.PlaneGeometry(1,1);g2.rotateX(-Math.PI/2);
 list.forEach(k=>{const [x,z]=k.split(',').map(Number);if((x+z)%2)return;const p=new THREE.Mesh(g2,grassMat2);p.position.set(wx(x),0.002,wz(z));p.receiveShadow=true;scene.add(p)});
 // 草皮包边 + 草沿垂坠（仅边缘格）
 const rimM=M(0x6fbf55),rimM2=M(0x7fcf62),rimG=new THREE.BoxGeometry(1.04,0.18,1.04),dripG=new THREE.ConeGeometry(0.12,0.22,4);dripG.rotateX(Math.PI);
 const N4=[[1,0],[-1,0],[0,1],[0,-1]];
 list.forEach(k=>{const [x,z]=k.split(',').map(Number);const open=N4.filter(([dx,dz])=>!isLand(x+dx,z+dz));if(!open.length)return;
  const r=new THREE.Mesh(rimG,rimM);r.position.set(wx(x),-0.1,wz(z));scene.add(r);
  open.forEach(([dx,dz],j)=>{for(let i=0;i<2;i++){const d=new THREE.Mesh(dripG,(i+j+x)%2?rimM:rimM2);const off=(i-0.5)*0.5;d.position.set(wx(x)+dx*0.53+(dz?off:0),-0.28+((x*7+z*3+i)%3-1)*0.05,wz(z)+dz*0.53+(dx?off:0));scene.add(d)}})});
 // 岛底三层岩层
 const L1=new THREE.Mesh(new THREE.CylinderGeometry(5.2,4.2,1.2,8),M(0xa4704a));L1.position.y=-2.8;
 const L2=new THREE.Mesh(new THREE.CylinderGeometry(4.0,2.6,1.4,7),M(0x9b6b47));L2.position.y=-4.1;L2.rotation.y=0.3;
 const L3=new THREE.Mesh(new THREE.ConeGeometry(2.4,2.2,6),M(0x8a5a38));L3.rotation.x=Math.PI;L3.position.y=-5.9;
 const line=M(0x8a5a38);const s1=new THREE.Mesh(new THREE.CylinderGeometry(4.25,4.25,0.06,8),line);s1.position.y=-3.4;const s2=new THREE.Mesh(new THREE.CylinderGeometry(2.65,2.65,0.06,7),line);s2.position.y=-4.8;s2.rotation.y=0.3;
 const tip=new THREE.Mesh(new THREE.DodecahedronGeometry(0.3,0),M(0x9b6b47));tip.position.y=-7.2;
 scene.add(L1,L2,L3,s1,s2,tip);
 const rg=new THREE.DodecahedronGeometry(1,0),rm=M(0x9b6b47);
 [[-5.6,-3.2,2.5,0.5],[4.8,-4.2,-3.6,0.4],[3.5,-5.2,4.6,0.6]].forEach(([x,y,z,s],i)=>{const r=new THREE.Mesh(rg,rm);r.position.set(x,y,z);r.scale.setScalar(s);r.userData={y0:y,ph:i*2};scene.add(r);floaters.push(r)});
}
// ---------- builders ----------
const leafCols=[0x6cc35a,0x7fcf62,0x5fb655];
function makeTree(s=1){const g=new THREE.Group();
 const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.14,0.6,6),M(0x9a6a45));tr.position.y=0.3;g.add(tr);
 const crown=new THREE.Group();crown.position.y=0.6;g.add(crown);
 [[0,0.35,0,0.48],[0.25,0.2,0.1,0.32],[-0.22,0.25,-0.1,0.34],[0,0.68,0,0.32]].forEach(([x,y,z,r],i)=>{const b=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),M(leafCols[i%3]));b.position.set(x,y,z);b.castShadow=true;crown.add(b)});
 g.userData.crown=crown;g.scale.setScalar(s);tr.castShadow=true;return g}
function makeRock(gold){const g=new THREE.Group();
 [[0,0.22,0,0.34],[0.28,0.14,0.12,0.22],[-0.22,0.12,-0.15,0.2]].forEach(([x,y,z,r])=>{const b=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),M(0xa9adb3));b.position.set(x,y,z);b.rotation.set(Math.random(),Math.random(),0);b.castShadow=true;g.add(b)});
 if(gold)for(let i=0;i<5;i++){const n=new THREE.Mesh(new THREE.OctahedronGeometry(0.08),M(0xf5c542,{emissive:0x553300}));n.position.set(Math.sin(i*2)*0.25,0.3+Math.cos(i)*0.12,Math.cos(i*2)*0.22);g.add(n)}
 return g}
function makeStump(){const m=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.2,0.18,7),M(0x9a6a45));m.position.y=0.09;const g=new THREE.Group();g.add(m);return g}
function makeFlower(c){const g=new THREE.Group();const s=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.2,4),M(0x5fa64a));s.position.y=0.1;g.add(s);const h=new THREE.Mesh(new THREE.IcosahedronGeometry(0.06,0),M(c));h.position.y=0.22;g.add(h);return g}
function makeCrop(kind,stage){const g=new THREE.Group();
 if(stage==0){const m=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,4,0,Math.PI*2,0,Math.PI/2),M(0x7d5235));g.add(m);return g}
 if(stage==1){for(let i=0;i<2;i++){const l=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.25,4),M(0x8fd16a));l.position.set(i?0.05:-0.05,0.12,0);l.rotation.z=i?-0.5:0.5;g.add(l)}return g}
 if(kind=='tree'){if(stage==2){const t=makeTree(0.45);return t}return makeTree(0.9+Math.random()*0.2)}
 if(kind=='grass'){const n=stage==2?4:8;for(let i=0;i<n;i++){const b=new THREE.Mesh(new THREE.ConeGeometry(0.05,stage==2?0.25:0.45,4),M(i%2?0x7fcf62:0xa5dc72));const a=i/n*6.28;b.position.set(Math.cos(a)*0.18,stage==2?0.12:0.22,Math.sin(a)*0.18);b.rotation.set(Math.sin(a)*0.3,0,Math.cos(a)*0.3);b.castShadow=true;g.add(b)}
   if(stage==3){[0xffb3c7,0xfff1a0,0xc7b3ff].forEach((c,i)=>{const f=makeFlower(c);f.position.set(Math.cos(i*2)*0.12,0.15,Math.sin(i*2)*0.12);g.add(f)})}return g}
 // veg: carrot / tomato
 const n=stage==2?3:5;for(let i=0;i<n;i++){const l=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.3,4),M(0x6cc35a));const a=i/n*6.28;l.position.set(Math.cos(a)*0.06,0.2,Math.sin(a)*0.06);l.rotation.set(Math.sin(a)*0.4,0,Math.cos(a)*0.4);g.add(l)}
 if(stage==3){const c=new THREE.Mesh(new THREE.ConeGeometry(0.12,0.32,6),M(0xf29a4a));c.rotation.x=Math.PI;c.position.y=0.05;c.castShadow=true;g.add(c)}
 return g}
const box=(w,h,d,c,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof c=='number'?M(c):c);m.position.set(x,y,z);return m};
// 小木屋（美术 2×2 造型，按策划占 1 格 → 整体缩放 0.62）
function makeHouse(){const g=new THREE.Group();
 g.add(box(1.7,0.15,1.5,0xc9c2b8,0,0.075,0),box(1.5,0.9,1.3,0xfff3de,0,0.6,0));
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>g.add(box(0.12,0.95,0.12,0xc08a55,a*0.72,0.6,b*0.62)));
 const roof=new THREE.Mesh(new THREE.ConeGeometry(1.25,0.8,4),M(0xe88a7a));roof.rotation.y=Math.PI/4;roof.scale.set(1,1,0.9);roof.position.y=1.45;g.add(roof);
 g.add(box(0.18,0.35,0.18,0xc9c2b8,0.35,1.6,-0.2),box(0.4,0.6,0.04,0x9a6a45,0,0.45,0.66));
 const kn=new THREE.Mesh(new THREE.SphereGeometry(0.03,6,4),M(0xf5c542));kn.position.set(0.12,0.45,0.69);g.add(kn);
 [-0.45,0.45].forEach(x=>{g.add(box(0.3,0.3,0.04,M(0xffe7a8,{emissive:0xffe7a8,emissiveIntensity:0.3}),x,0.7,0.66),box(0.34,0.08,0.1,0xc08a55,x,0.5,0.7));
  [0xffb3c7,0xfff1a0,0xffb3c7].forEach((c,i)=>{const f=makeFlower(c);f.scale.setScalar(0.5);f.position.set(x+(i-1)*0.1,0.53,0.7);g.add(f)})});
 g.scale.setScalar(0.62);return g}
// 小摊位（正面 +z）
function makeShop(){const g=new THREE.Group();
 g.add(box(1.6,0.55,0.6,0xd9a46b,0,0.275,0.2),box(1.7,0.06,0.7,0xc08a55,0,0.58,0.2),box(1.62,0.08,0.02,0xffb3c7,0,0.4,0.51));
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1.3,6),M(0xc08a55));p.position.set(a*0.75,0.65,b*0.35);g.add(p)});
 const aw=new THREE.Group();aw.position.set(0,1.35,0);aw.rotation.x=-0.35;g.add(aw);
 for(let i=0;i<6;i++){const c=i%2?0xe88a7a:0xfff7e6;aw.add(box(0.28,0.04,0.9,c,-0.7+i*0.28,0,0));const w=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,0.04,8,1,false,0,Math.PI),M(c));w.rotation.set(Math.PI/2,0,Math.PI/2);w.position.set(-0.7+i*0.28,-0.02,0.45);aw.add(w)}
 const sign=new THREE.Group();sign.position.set(0,1.65,0.45);g.add(sign);
 sign.add(box(0.96,0.34,0.04,0xc79a66,0,0,-0.005),box(0.9,0.28,0.05,0xfff7e6));
 const coin=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.02,12),M(0xf5c542,{emissive:0x553300}));coin.rotation.x=Math.PI/2;coin.position.z=0.035;sign.add(coin);
 [-0.3,0.3].forEach(x=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.3,4),M(0xc08a55));r.position.set(x,0.25,0);sign.add(r)});
 g.add(box(1.4,0.9,0.25,0xc08a55,0,0.45,-0.35),box(1.4,0.04,0.3,0xd9a46b,0,0.55,-0.3),box(1.4,0.04,0.3,0xd9a46b,0,0.85,-0.3));
 [[0xf29a4a,-0.5],[0xf3d27a,-0.15],[0xe88a7a,0.2],[0xffa6a6,0.5]].forEach(([c,x],i)=>{const m=i%2?box(0.16,0.16,0.16,c,x,0.65+(i>1?0.3:0),-0.3):new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),M(c));if(!(i%2))m.position.set(x,0.65+(i>1?0.3:0),-0.3);g.add(m)});
 const car=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.18,6),M(0xf29a4a));car.rotation.z=Math.PI/2;car.position.set(-0.4,0.64,0.25);g.add(car);
 g.add(box(0.14,0.12,0.1,0xf3d27a,0.35,0.67,0.2));
 g.scale.setScalar(0.62);g.userData.sign=sign;return g}
// 装饰
function makeDeco(k){const g=new THREE.Group();
 if(k=='pot'){const p=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.17,0.3,8),M(0xe88a7a));p.position.y=0.15;g.add(p);
  const r=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.03,5,10),M(0xc79a66));r.rotation.x=Math.PI/2;r.position.y=0.3;g.add(r);
  [0xffb3c7,0xfff1a0,0xc7b3ff,0xffffff,0xffb3c7].forEach((c,i)=>{const f=makeFlower(c);const a=i/5*6.28;f.position.set(Math.cos(a)*0.1*(i?1:0),0.26,Math.sin(a)*0.1*(i?1:0));g.add(f)})}
 else if(k=='bench'){g.add(box(0.9,0.06,0.3,0xc08a55,0,0.25,0),box(0.9,0.22,0.05,0xc08a55,0,0.42,-0.13));
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>g.add(box(0.06,0.22,0.06,0x9a6a45,a*0.38,0.11,b*0.1)))}
 else if(k=='chime'){const post=box(0.05,0.9,0.05,0xc08a55,0,0.45,0);g.add(post,box(0.36,0.04,0.04,0xc08a55,0.15,0.9,0));
  const sw=new THREE.Group();sw.position.set(0.3,0.88,0);g.add(sw);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(0.1,0.08,6),M(0x8fd3c1));cap.position.y=-0.05;sw.add(cap);
  const tails=[];[-0.05,0,0.05].forEach((x,i)=>{const t=new THREE.Group();t.position.set(x,-0.09,0);const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.2,4),M(0xfff7e6));rod.position.y=-0.1;
   const pl=new THREE.Mesh(new THREE.PlaneGeometry(0.06,0.1),new THREE.MeshLambertMaterial({color:0xffb3c7,side:THREE.DoubleSide}));pl.position.y=-0.24;t.add(rod,pl);sw.add(t);tails.push(t)});
  g.userData.sway=sw;g.userData.tails=tails}
 return g}
// ---------- state ----------
const SAVE='skycity-save-v3',OLD='skycity-save-v2';
const DECO={pot:{name:'花缸',icon:'🪴',coins:30,wood:0,stone:2,desc:'飘着小花瓣'},bench:{name:'木长椅',icon:'🪑',coins:60,wood:6,stone:0,desc:'坐一会儿，听听风'},chime:{name:'风铃',icon:'🎐',coins:90,wood:2,stone:2,desc:'随风叮铃作响'}};
const newState=()=>({coins:20,wood:0,stone:0,seeds:8,day:1,time:0.25,px:wx(4),pz:wz(5),tool:0,q:0,qb:0,st:{till:0,plant:0,water:0,harvest:0,stone:0,wood:0,sell:0,deco:0},objs:{},decoInv:{pot:0,bench:0,chime:0},recent:[]});
let S=newState();
const TOOLS=[
 {id:'hoe',icon:'⛏️',name:'锄头',desc:'翻开草地，准备播种'},
 {id:'tree',icon:'🌳',name:'树苗',desc:'在耕地上种一棵小树'},
 {id:'grass',icon:'🌿',name:'草籽',desc:'种下会开小花的草'},
 {id:'veg',icon:'🥕',name:'菜种',desc:'种胡萝卜，收获换金币'},
 {id:'water',icon:'💧',name:'水壶',desc:'浇水让作物长得更快'},
 {id:'axe',icon:'🪓',name:'斧镐',desc:'收获作物、砍树、采石'}];
// [文案, 进度函数→[当前,目标]]
const QUESTS=[
 ['收获 2 颗成熟的胡萝卜',()=>[S.st.harvest,2]],
 ['用锄头翻开 2 块土地',()=>[S.st.till,2]],
 ['种下 3 颗种子',()=>[S.st.plant,3]],
 ['给作物浇水 3 次',()=>[S.st.water,3]],
 ['砍一棵树、采一块石头',()=>[(S.st.wood>=3)+(S.st.stone>=3),2]],
 ['去小商店卖掉 3 块木头',()=>[S.st.sell,3]],
 ['买一个花缸，摆在岛上',()=>[S.st.deco,1]],
 ['收获你亲手种的 3 颗胡萝卜',()=>[S.st.harvest-S.qb,3]]];
const QN=QUESTS.length;
function defaultObjs(){const o={};const put=(x,z,v)=>{if(isLand(x,z))o[key(x,z)]=v};
 put(2,1,{t:'house'});put(7,1,{t:'shop'});
 [[4,1],[1,3],[1,6]].forEach(([x,z])=>put(x,z,{t:'tree'}));
 [[8,3],[8,5],[4,8]].forEach(([x,z])=>put(x,z,{t:'rock'}));
 put(8,7,{t:'gold'});
 put(3,3,{t:'crop',k:'veg',s:3,w:false,g:0});put(4,3,{t:'crop',k:'veg',s:3,w:false,g:0});
 put(5,3,{t:'soil',w:false});put(6,3,{t:'soil',w:false});
 return o}
let welcome='欢迎来到空中之城 ☁️ 慢慢来，一切都刚刚好';
try{const d=JSON.parse(localStorage.getItem(SAVE));
 if(d&&d.objs){S=Object.assign(newState(),d);S.st=Object.assign(newState().st,d.st);S.decoInv=Object.assign({pot:0,bench:0,chime:0},d.decoInv);welcome='欢迎回到空中之城 ☁️'}
 else{S.objs=defaultObjs();
  const o=JSON.parse(localStorage.getItem(OLD)||'null');
  if(o&&typeof o=='object')welcome='小岛焕新啦，从新小岛开始吧 ☁️'}}// 已定：v3 全新开始，不迁移 v2 数值（旧存档保留不删）
catch(e){S=newState();S.objs=defaultObjs()}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(S))}catch(e){}}
setInterval(save,4000);addEventListener('beforeunload',save);
// ---------- object meshes ----------
const meshes={},soils={};
const soilGeo=new THREE.BoxGeometry(0.86,0.06,0.86);
let shopMesh=null;
function refresh(k){const o=S.objs[k];const [x,z]=k.split(',').map(Number);
 if(meshes[k]){scene.remove(meshes[k]);delete meshes[k]}
 if(soils[k]){scene.remove(soils[k]);delete soils[k]}
 if(!o)return;
 if(o.t=='soil'||o.t=='crop'){const s=new THREE.Mesh(soilGeo,o.w?wetMat:soilMat);s.position.set(wx(x),0.03,wz(z));s.receiveShadow=true;scene.add(s);soils[k]=s}
 let m=null,rot=(x*13+z*7)%6;
 if(o.t=='tree')m=makeTree(1+((x*7+z*3)%4)*0.08);
 else if(o.t=='rock')m=makeRock(false);else if(o.t=='gold')m=makeRock(true);
 else if(o.t=='stump'||o.t=='rubble')m=o.t=='stump'?makeStump():new THREE.Group();
 else if(o.t=='crop')m=makeCrop(o.k,o.s);
 else if(o.t=='house'){m=makeHouse();rot=0}
 else if(o.t=='shop'){m=makeShop();rot=0;shopMesh=m}
 else if(o.t=='deco'){m=makeDeco(o.k);rot=0}
 if(m){m.position.set(wx(x),o.t=='crop'?0.06:0,wz(z));m.rotation.y=rot;m.traverse(c=>{if(c.isMesh)c.castShadow=true});scene.add(m);meshes[k]=m}}
Object.keys(S.objs).forEach(refresh);
// 环境点缀：小花草、农田栅栏（纯装饰，不占格）
const decor=new THREE.Group();scene.add(decor);
{let n=0;for(const k of land){const [x,z]=k.split(',').map(Number);n++;if(S.objs[k]||n%4||(x>=3&&x<=6&&z>=3&&z<=4))continue;
 const h=(x*31+z*17)%7;const f=h<3?makeFlower([0xffb3c7,0xfff1a0,0xffffff][h]):(()=>{const g=new THREE.Group();for(let i=0;i<3;i++){const b=new THREE.Mesh(new THREE.ConeGeometry(0.04,0.18,3),M(0x6cbf52));b.position.set(i*0.06-0.06,0.09,0);b.rotation.z=(i-1)*0.4;g.add(b)}return g})();
 f.position.set(wx(x)+((h%3)-1)*0.38,0,wz(z)+((h%2)-0.5)*0.7);decor.add(f)}
 const wood=M(0xc08a55);const x0=wx(3)-0.5,x1=wx(6)+0.5,z0=wz(3)-0.5,z1=wz(4)+0.5;
 const post=(x,z)=>{const p=box(0.1,0.45,0.1,wood,x,0.22,z);p.castShadow=true;decor.add(p)};
 const rail=(ax,az,bx,bz)=>{const L=Math.hypot(bx-ax,bz-az);[0.32,0.16].forEach(y=>{const r=box(ax==bx?0.06:L,0.07,ax==bx?L:0.06,wood,(ax+bx)/2,y,(az+bz)/2);decor.add(r)})};
 for(let x=x0;x<=x1+0.01;x+=1){post(x,z0)}rail(x0,z0,x1,z0);
 [x0,x1].forEach(x=>{post(x,z0+1);post(x,z1);rail(x,z0,x,z1)});
 post(x0+1,z1);post(x1-1,z1);rail(x0,z1,x0+1,z1);rail(x1-1,z1,x1,z1);// 南侧留出入口
}
const blocked=k=>{const o=S.objs[k];return !!o&&(o.t=='tree'||o.t=='rock'||o.t=='gold'||o.t=='house'||o.t=='shop'||o.t=='deco'||(o.t=='crop'&&o.k=='tree'&&o.s>=2))};
// ---------- player ----------
const player=new THREE.Group();scene.add(player);
{const body=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.22,0.38,10),M(0x7fb8e0));body.position.y=0.3;
 const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,14,10),M(0xffd9b8,{flatShading:false}));head.position.y=0.66;
 const hat=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.3,0.12,12),M(0xf3d27a));hat.position.y=0.84;
 const top=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.14,0.1,10),M(0xe7b85a));top.position.y=0.92;
 const eyeM=M(0x3b2a20);[-0.07,0.07].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.025,6,4),eyeM);e.position.set(x,0.68,0.18);player.add(e)});
 const blush=M(0xffa6a6);[-0.12,0.12].forEach(x=>{const e=new THREE.Mesh(new THREE.SphereGeometry(0.03,6,4),blush);e.scale.z=0.3;e.position.set(x,0.62,0.17);player.add(e)});
 const legM=M(0x8a6a4a);[-0.08,0.08].forEach((x,i)=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.14,6),legM);l.position.set(x,0.07,0);player.add(l);player.userData['leg'+i]=l});
 [body,head,hat,top].forEach(m=>{m.castShadow=true;player.add(m)});}
player.position.set(S.px,0,S.pz);
let facing=new THREE.Vector3(-1,0,-1).normalize();// 面朝北（农田）
player.rotation.y=Math.atan2(facing.x,facing.z);
const hl=new THREE.Mesh(new THREE.RingGeometry(0.38,0.46,4,1),new THREE.MeshBasicMaterial({color:0xfff7c2,transparent:true,opacity:0.8}));hl.rotation.set(-Math.PI/2,0,Math.PI/4);scene.add(hl);
// ---------- clouds, butterflies, petals ----------
const clouds=[];const cm=new THREE.MeshLambertMaterial({color:0xffffff,emissive:0xbbbbbb,transparent:true,opacity:0.9});
for(let i=0;i<8;i++){const g=new THREE.Group();for(let j=0;j<5;j++){const b=new THREE.Mesh(new THREE.IcosahedronGeometry(0.8+Math.random()*0.8,1),cm);b.position.set(j*1.1-2.2,Math.random()*0.5,Math.random()*1.2);g.add(b)}
 const a=i/8*6.28+Math.random()*0.4,r=9+Math.random()*5;g.position.set(Math.cos(a)*r,-3-Math.random()*3,Math.sin(a)*r);g.scale.setScalar(0.5+Math.random()*0.5);g.userData={a,r,v:0.1/r};scene.add(g);clouds.push(g)}
const flies=[];for(let i=0;i<3;i++){const g=new THREE.Group();const wm=new THREE.MeshBasicMaterial({color:[0xffb3c7,0xfff1a0,0xc7e3ff][i],side:THREE.DoubleSide});
 const w1=new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.12),wm);w1.position.x=0.08;const w2=w1.clone();w2.position.x=-0.08;const p1=new THREE.Group(),p2=new THREE.Group();p1.add(w1);p2.add(w2);g.add(p1,p2);g.userData={p1,p2,ph:i*1.7,cx:wx(2+i*3),cz:wz(2+i*2)};scene.add(g);flies.push(g)}
const petals=[];const pm=new THREE.MeshBasicMaterial({color:0xffc9d6,side:THREE.DoubleSide});
for(let i=0;i<14;i++){const p=new THREE.Mesh(new THREE.PlaneGeometry(0.07,0.05),pm);p.position.set((Math.random()-0.5)*10,Math.random()*6,(Math.random()-0.5)*10);p.userData.s=Math.random()*6;scene.add(p);petals.push(p)}
// 花缸专属小花瓣
const potPetals=[];
// 购买粒子（摊位处 Points）
const bursts=[];
function burst(pos){const n=24,g=new THREE.BufferGeometry(),p=new Float32Array(n*3),v=[];for(let i=0;i<n;i++){p[i*3]=pos.x;p[i*3+1]=pos.y;p[i*3+2]=pos.z;v.push(new THREE.Vector3((Math.random()-0.5)*1.2,1.2+Math.random()*0.6,(Math.random()-0.5)*1.2))}
 g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({size:0.08,color:0xf5c542,transparent:true});const pts=new THREE.Points(g,m);scene.add(pts);bursts.push({pts,v,t:0})}
// ---------- labels ----------
const labelsEl=$('labels');const fixed=[];
function addLabel(text,x,z,y=1.2){const d=document.createElement('div');d.className='lbl';d.textContent=text;labelsEl.appendChild(d);fixed.push({d,v:new THREE.Vector3(wx(x),y,wz(z))})}
addLabel('🏪 小铺',7,1,1.45);addLabel('金矿 · 25 金币',8,7,0.9);addLabel('🏡 小木屋',2,1,1.45);
const pops=[];
function pop(text,pos){const d=document.createElement('div');d.className='pop';d.textContent=text;labelsEl.appendChild(d);pops.push({d,v:pos.clone().setY(1.3),t:0})}
const tmp=new THREE.Vector3();
function toScreen(v){tmp.copy(v).project(cam);return[(tmp.x+1)/2*innerWidth,(1-tmp.y)/2*innerHeight]}
// ---------- audio ----------
let actx=null,muted=localStorage.getItem('skycity-mute')=='1',master;
function initAudio(){if(actx)return;actx=new(window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.gain.value=muted?0:0.5;master.connect(actx.destination);
 const notes=[523.25,587.33,659.25,783.99,880,1046.5];
 setInterval(()=>{if(muted)return;if(Math.random()<0.55)tone(notes[Math.random()*6|0]/(Math.random()<.5?2:1),2.5,0.05,'sine')},900)}
function tone(f,d=0.3,v=0.08,type='triangle'){if(!actx||muted)return;const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,actx.currentTime);g.gain.linearRampToValueAtTime(v,actx.currentTime+0.03);g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+d);o.connect(g).connect(master);o.start();o.stop(actx.currentTime+d)}
const sfx=(a)=>{tone(a,0.25,0.09);setTimeout(()=>tone(a*1.5,0.3,0.06),80)};
const ding=()=>{tone(1046.5,0.25,0.07,'sine');setTimeout(()=>tone(1318.5,0.3,0.06,'sine'),90);setTimeout(()=>tone(1568,0.15,0.03),160)};
const dong=()=>tone(196,0.25,0.05,'sine');
$('mute').textContent=muted?'🔇':'🔈';
$('mute').onclick=e=>{e.stopPropagation();initAudio();muted=!muted;localStorage.setItem('skycity-mute',muted?'1':'0');if(master)master.gain.value=muted?0:0.5;$('mute').textContent=muted?'🔇':'🔈';toast(muted?'音乐已关闭':'轻柔的音乐响起 🎵')};
$('reset').onclick=e=>{e.stopPropagation();ask('重新开始新的空中小岛吗？',()=>{resetting=true;localStorage.removeItem(SAVE);location.reload()})};
let resetting=false;addEventListener('beforeunload',e=>{if(resetting)localStorage.removeItem(SAVE)});
['pointerdown','keydown'].forEach(ev=>addEventListener(ev,initAudio,{once:true}));
// ---------- HUD ----------
const hot=$('hotbar');TOOLS.forEach((t,i)=>{const b=document.createElement('button');b.className='slot';b.innerHTML=`<sup>${i+1}</sup>${t.icon}<small>${t.name}</small>`;b.onclick=e=>{e.stopPropagation();setTool(i)};hot.appendChild(b)});
function setTool(i){S.tool=i;[...hot.children].forEach((c,j)=>c.classList.toggle('on',j==i));const t=TOOLS[i];$('tIcon').textContent=t.icon;$('tName').textContent=t.name;$('tDesc').textContent=t.desc}
setTool(S.tool);
let tt;function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>e.classList.remove('show'),2200)}
const placedCount=()=>Object.values(S.objs).filter(o=>o.t=='deco').length;
const moodVal=()=>Math.min(100,70+S.st.harvest*3+placedCount()*3);
function hud(){$('coins').textContent=S.coins;$('wood').textContent=S.wood;$('stone').textContent=S.stone;$('seeds').textContent=S.seeds;
 $('day').textContent='第'+S.day+'天';$('dayb').style.width=(S.time*100)+'%';$('mood').style.width=moodVal()+'%';
 const q=QUESTS[S.q];$('qn').textContent=Math.min(S.q+1,QN)+'/'+QN;
 if(q){const [c,t]=q[1]();$('qtext').textContent=`${q[0]}（${Math.max(0,Math.min(c,t))}/${t}）`}else $('qtext').textContent='小岛是你的啦，慢慢来就好 ☁️';
 if(shopOpen)renderShop()}
function checkQuest(){let n=0;while(S.q<QN){const [c,t]=QUESTS[S.q][1]();if(c<t)break;S.q++;S.coins+=15;n++;if(S.q==QN-1)S.qb=S.st.harvest}
 if(n){toast(S.q>=QN?'🎉 全部完成！小岛是你的啦，慢慢来就好 ☁️':'🎉 任务完成！获得 15 金币');setTimeout(()=>{sfx(659);setTimeout(()=>sfx(880),150)},50)}}
function stat(k,n=1){S.st[k]+=n;checkQuest()}
// ---------- 温柔确认框 ----------
function ask(text,yes,no){$('askT').textContent=text;$('ask').classList.add('show');$('askY').onclick=e=>{e.stopPropagation();$('ask').classList.remove('show');yes&&yes();hud()};$('askN').onclick=e=>{e.stopPropagation();$('ask').classList.remove('show');no&&no()}}
const askOpen=()=>$('ask').classList.contains('show');
// ---------- 商店 ----------
let shopOpen=false,shopTab='seed',placing=null,placeAt=null;
const SEEDS=[{id:'s1',name:'种子 ×1',icon:'🌱',coins:3,n:1},{id:'s5',name:'种子袋 ×5',icon:'🎒',coins:12,n:5}];
const SELL=[{k:'wood',name:'木头',icon:'🪵',p:2},{k:'stone',name:'石头',icon:'🪨',p:2},{k:'seeds',name:'种子',icon:'🌱',p:1}];
function lack(c){const L=[];if(S.coins<c.coins)L.push(`${c.coins-S.coins} 金币`);if(S.wood<(c.wood||0))L.push(`${c.wood-S.wood} 木头`);if(S.stone<(c.stone||0))L.push(`${c.stone-S.stone} 石头`);return L}
const price=c=>`🪙 ${c.coins}`+(c.wood?` 🪵${c.wood}`:'')+(c.stone?` 🪨${c.stone}`:'');
function card(id,icon,name,btn,poor,extra=''){return `<div class="card${poor?' poor':''}" data-id="${id}"><div class="ic">${icon}</div><div class="nm">${name}</div>${extra}<button class="btn" data-buy="${id}"><span class="p">${btn}</span></button></div>`}
function renderShop(){$('shopCoin').textContent='🪙 '+S.coins;$('shopRes').textContent=`🪵 ${S.wood} · 🪨 ${S.stone} · 🌱 ${S.seeds}`;
 document.querySelectorAll('#shop .tab').forEach(t=>t.classList.toggle('on',t.dataset.tab==shopTab));
 let h='';
 if(shopTab=='seed'){h+='<div class="grid">'+SEEDS.map(c=>card(c.id,c.icon,c.name,price(c),lack(c).length)).join('')+'</div>';
  h+='<div class="sec">💰 出售换金币</div><div class="grid">'+SELL.map(s=>`<div class="card sell" data-id="sell-${s.k}"><div class="ic sm">${s.icon}</div><div class="nm">${s.name} <small>持有 ${S[s.k]} · ${s.p} 金/个</small></div><div class="sbtns">${[['1','卖 1'],['10','卖 10'],['all','全部']].map(([n,l])=>`<button class="btn mini" data-sell="${s.k}:${n}" ${S[s.k]<=0?'disabled':''}>${l}</button>`).join('')}</div></div>`).join('')+'</div>'}
 else{h+='<div class="grid">'+Object.entries(DECO).map(([k,c])=>card(k,c.icon,c.name,price(c),lack(c).length,`<div class="ds">${c.desc}</div>`)).join('')+'</div>';
  const inv=Object.entries(S.decoInv).filter(([k,n])=>n>0),now=Date.now(),rec=S.recent.filter(r=>r.cell&&now-r.at<60000&&S.objs[r.cell]?.t=='deco');
  h+='<div class="sec">🎒 我的装饰</div><div class="inv">'+(inv.length||rec.length?'':'<span class="empty">还没有装饰，买一个摆在岛上吧～</span>')
   +inv.map(([k,n])=>`<div class="it">${DECO[k].icon} ${DECO[k].name} ×${n}<button class="btn mini" data-place="${k}">摆放</button><button class="btn mini ghost" data-refund="${k}">退货</button></div>`).join('')
   +rec.map(r=>`<div class="it">${DECO[r.k].icon} 刚摆的${DECO[r.k].name}<button class="btn mini ghost" data-refundp="${r.cell}">退货（${Math.ceil((60000-(now-r.at))/1000)}s）</button></div>`).join('')+'</div>'}
 $('shopBody').innerHTML=h}
function openShop(){if(placing)return;shopOpen=true;goal=null;$('shop').classList.add('show');renderShop();sfx(784)}
function closeShop(){shopOpen=false;$('shop').classList.remove('show')}
function bounce(el){if(!el)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
function shake(el){if(!el)return;el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}
function coinFly(el){if(!el)return;const a=$('shopCoin').getBoundingClientRect(),b=el.getBoundingClientRect();for(let i=0;i<4;i++){const c=document.createElement('div');c.className='fly';c.textContent='🪙';c.style.left=a.left+a.width/2+'px';c.style.top=a.top+'px';document.body.appendChild(c);
 setTimeout(()=>{c.style.transform=`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+40-a.top}px) scale(.6)`;c.style.opacity='0'},60*i+20);setTimeout(()=>c.remove(),800+60*i)}
 for(let i=0;i<10;i++){const s=document.createElement('div');s.className='spark';s.textContent=i%2?'✦':'❀';s.style.color=i%2?'#f5c542':'#ffc9d6';s.style.left=b.left+b.width/2+'px';s.style.top=b.top+60+'px';document.body.appendChild(s);const a2=i/10*6.28,d=40+Math.random()*40;
 requestAnimationFrame(()=>{s.style.transform=`translate(${Math.cos(a2)*d}px,${Math.sin(a2)*d}px)`;s.style.opacity='0'});setTimeout(()=>s.remove(),950)}}
let signT=-1;
function buyFx(el){bounce(el);coinFly(el);ding();signT=0;const k=Object.keys(S.objs).find(k=>S.objs[k].t=='shop');if(k){const [x,z]=k.split(',').map(Number);burst(new THREE.Vector3(wx(x),1.1,wz(z)))}}
function pay(c){if(lack(c).length)return false;S.coins-=c.coins;S.wood-=c.wood||0;S.stone-=c.stone||0;return true}
function buy(id,el){const c=SEEDS.find(s=>s.id==id)||DECO[id];if(!c)return;const L=lack(c);
 if(L.length){shake(el);dong();toast(`还差 ${L.join('、')}，不着急～`);return}
 pay(c);if(c.n){S.seeds+=c.n;toast(`买到 ${c.n} 颗种子 🌱`)}else{S.decoInv[id]++;S.recent.push({k:id,at:Date.now(),cell:null});toast(`买到${c.name}！选个地方摆上吧`);buyFx(el);hud();save();setTimeout(()=>startPlace(id),350);return}
 buyFx(el);hud();save()}
function sell(k,n){const s=SELL.find(s=>s.k==k);const have=S[k];if(have<=0)return;const doIt=q=>{q=Math.min(q,S[k]);if(q<=0)return;S[k]-=q;S.coins+=q*s.p;if(k=='wood')stat('sell',q);ding();toast(`卖出 ${q} 个${s.name}，+${q*s.p} 金币`);hud();save()};
 if(n=='all')ask(`把 ${have} 个${s.name}全部卖掉吗？（+${have*s.p} 金币）`,()=>doIt(S[k]));else doIt(+n)}
function refund(k){if(S.decoInv[k]<=0)return;const c=DECO[k];S.decoInv[k]--;S.coins+=c.coins;S.wood+=c.wood;S.stone+=c.stone;const i=S.recent.findIndex(r=>r.k==k&&!r.cell);if(i>=0)S.recent.splice(i,1);toast(`已退货，${price(c)} 原样还给你`);hud();save()}
function refundPlaced(cell){const r=S.recent.find(r=>r.cell==cell);const o=S.objs[cell];if(!r||!o||o.t!='deco'||Date.now()-r.at>=60000)return toast('已经超过 60 秒啦，可以收起放回背包哦');
 const c=DECO[o.k];delete S.objs[cell];refresh(cell);S.coins+=c.coins;S.wood+=c.wood;S.stone+=c.stone;S.recent.splice(S.recent.indexOf(r),1);toast(`已退货，${price(c)} 原样还给你`);hud();save()}
$('shopBody').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.stopPropagation();const cardEl=b.closest('.card');
 if(b.dataset.buy)buy(b.dataset.buy,cardEl);else if(b.dataset.sell){const [k,n]=b.dataset.sell.split(':');sell(k,n)}
 else if(b.dataset.place){closeShop();startPlace(b.dataset.place)}else if(b.dataset.refund)refund(b.dataset.refund);else if(b.dataset.refundp)refundPlaced(b.dataset.refundp)});
document.querySelectorAll('#shop .tab').forEach(t=>t.onclick=e=>{e.stopPropagation();shopTab=t.dataset.tab;renderShop()});
$('shopX').onclick=e=>{e.stopPropagation();closeShop()};
$('shopBtn').onclick=e=>{e.stopPropagation();shopOpen?closeShop():openShop()};
$('shop').addEventListener('pointerdown',e=>{e.stopPropagation();if(e.target.id=='shop')closeShop()});
// ---------- 装饰摆放 ----------
const ghostOk=new THREE.MeshBasicMaterial({color:0x8fe07a,transparent:true,opacity:0.45}),ghostNo=new THREE.MeshBasicMaterial({color:0xffb0a8,transparent:true,opacity:0.45});
const ghostTile=new THREE.Mesh(new THREE.PlaneGeometry(0.92,0.92).rotateX(-Math.PI/2),ghostOk);ghostTile.position.y=0.03;ghostTile.visible=false;scene.add(ghostTile);
let ghost=null;
function startPlace(k){if(S.decoInv[k]<=0)return;closeShop();placing=k;placeAt=null;if(ghost)scene.remove(ghost);ghost=makeDeco(k);ghost.traverse(c=>{if(c.isMesh){c.material=c.material.clone();c.material.transparent=true;c.material.opacity=0.55}});scene.add(ghost);$('placeBar').classList.add('show');$('placeName').textContent=`${DECO[k].icon} 摆放${DECO[k].name}`}
function endPlace(){placing=null;placeAt=null;if(ghost){scene.remove(ghost);ghost=null}ghostTile.visible=false;$('placeBar').classList.remove('show')}
function playerTile(){return[Math.round(player.position.x-OX),Math.round(player.position.z-OZ)]}
function canPlace(x,z){const k=key(x,z);if(!isLand(x,z))return'那边是云海哦';if(S.objs[k])return'这里已经有东西啦';const [px,pz]=playerTile();if(px==x&&pz==z)return'不能放在自己脚下哦';
 S.objs[k]={t:'deco'};const trapped=[[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dz])=>!isLand(px+dx,pz+dz)||blocked(key(px+dx,pz+dz)));delete S.objs[k];
 return trapped?'放这里会把自己围住哦':''}
function placeTarget(){return placeAt||targetTile()}
function confirmPlace(){const [x,z]=placeTarget();const why=canPlace(x,z);if(why){dong();return toast(why)}
 const k=key(x,z);S.objs[k]={t:'deco',k:placing};S.decoInv[placing]--;const r=S.recent.find(r=>r.k==placing&&!r.cell);if(r)r.cell=k;refresh(k);
 stat('deco');sfx(880);pop(`${DECO[placing].icon} 摆好啦 心情+3`,new THREE.Vector3(wx(x),0,wz(z)));endPlace();hud();save()}
function cancelPlace(){if(!placing)return;toast(`${DECO[placing].name}放进了背包，可在商店【我的装饰】再摆`);endPlace();hud()}
$('placeOk').onclick=e=>{e.stopPropagation();confirmPlace()};$('placeX').onclick=e=>{e.stopPropagation();cancelPlace()};
// ---------- actions ----------
function targetTile(){const p=player.position;const x=Math.round(p.x+facing.x*0.75-OX),z=Math.round(p.z+facing.z*0.75-OZ);return[x,z]}
function act(tx,tz){if(shopOpen||askOpen())return;if(placing)return confirmPlace();
 const k=key(tx,tz);if(!isLand(tx,tz))return toast('那边是云海，小心哦 ☁️');
 const o=S.objs[k],t=TOOLS[S.tool].id,pos=new THREE.Vector3(wx(tx),0,wz(tz));
 if(o&&o.t=='shop')return openShop();
 if(o&&o.t=='house'){sfx(523);return toast('回家喝杯茶，休息一下 ☕')}
 if(o&&o.t=='deco'){if(t=='axe')return ask(`收起这个${DECO[o.k].name}吗？`,()=>{delete S.objs[k];S.decoInv[o.k]++;S.recent=S.recent.filter(r=>r.cell!=k);refresh(k);toast(`${DECO[o.k].name}收进背包啦`);save()});
   if(o.k=='bench'){tone(523,0.6,0.05,'sine');setTimeout(()=>tone(659,0.6,0.05,'sine'),250);setTimeout(()=>tone(784,0.9,0.05,'sine'),500);return toast('坐一会儿，听听风 🍃')}
   return toast(o.k=='pot'?'小花开得正好 🌸':'叮铃～ 风在唱歌 🎐')}
 if(t=='hoe'){if(!o){S.objs[k]={t:'soil',w:false};stat('till');sfx(330);pop('翻土 ✨',pos)}else toast(o.t=='soil'?'这块地已经翻好啦':'这里有东西，换个地方试试吧')}
 else if(t=='tree'||t=='grass'||t=='veg'){if(!o)return toast('先用锄头翻地吧 ⛏️');if(o.t!='soil')return toast('这里已经有作物啦');if(S.seeds<=0)return toast('种子用完了，去小铺买一点或收获作物吧');
   S.seeds--;S.objs[k]={t:'crop',k:t,s:0,w:o.w,g:0};stat('plant');sfx(523);pop('-1 种子',pos)}
 else if(t=='water'){if(!o||(o.t!='crop'&&o.t!='soil'))return toast('水壶适合浇在耕地上 💧');if(o.t=='crop'&&o.s>=3)return toast('已经成熟啦，用斧镐收获吧');o.w=true;stat('water');sfx(784);pop('💧 滋润',pos)}
 else if(t=='axe'){
   if(!o)return toast('这里什么也没有～');
   if(o.t=='tree'||(o.t=='crop'&&o.k=='tree'&&o.s>=3)){S.objs[k]={t:'stump',r:0};S.wood+=3;S.seeds+=1;stat('wood',3);sfx(262);pop('+3 木头 +1 种子',pos)}
   else if(o.t=='rock'){S.objs[k]={t:'rubble',r:0,was:'rock'};S.stone+=3;stat('stone',3);sfx(294);pop('+3 石头',pos)}
   else if(o.t=='gold'){if(o.cd>0)return toast(`矿山在休息，还有 ${Math.ceil(o.cd)} 秒`);o.cd=40;S.coins+=25;S.stone+=1;sfx(988);pop('+25 金币',pos)}
   else if(o.t=='crop'){if(o.s<3)return toast('还没成熟哦，再等等～ 🌱');const g=o.k=='veg'?12:6;S.coins+=g;S.seeds+=2;S.objs[k]={t:'soil',w:false};stat('harvest');sfx(659);pop(`+${g} 金币 +2 种子`,pos)}
   else if(o.t=='soil'){delete S.objs[k];pop('恢复草地',pos)}
   else toast('它正在慢慢恢复中～')}
 refresh(k);hud()}
// ---------- input ----------
const keys={};addEventListener('keydown',e=>{if(e.code=='Escape'){if(askOpen())$('askN').click();else if(placing)cancelPlace();else if(shopOpen)closeShop();return}
 if(shopOpen||askOpen()){if(e.code=='Space')e.preventDefault();return}
 keys[e.code]=true;if(e.code=='Space'||e.code=='KeyE'){e.preventDefault();act(...targetTile())}const n=+e.key;if(n>=1&&n<=6)setTool(n-1)});
addEventListener('keyup',e=>keys[e.code]=false);
$('actBtn').addEventListener('pointerdown',e=>{e.stopPropagation();act(...targetTile())});
let joy=null;const jb=$('joy'),kn=$('knob');
jb.addEventListener('pointerdown',e=>{e.stopPropagation();jb.setPointerCapture(e.pointerId);joy={x:0,y:0};jm(e)});
jb.addEventListener('pointermove',e=>{if(joy)jm(e)});
['pointerup','pointercancel'].forEach(ev=>jb.addEventListener(ev,()=>{joy=null;kn.style.transform=''}));
function jm(e){const r=jb.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/45,y=(e.clientY-r.top-r.height/2)/45;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}joy.x=x;joy.y=y;kn.style.transform=`translate(${x*35}px,${y*35}px)`}
let goal=null;const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
canvas.addEventListener('pointerdown',e=>{if(shopOpen||askOpen())return;const v=new THREE.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(v,cam);const hit=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,hit))return;
 const tx=Math.round(hit.x-OX),tz=Math.round(hit.z-OZ);if(placing){placeAt=[tx,tz];return}if(!isLand(tx,tz))return;goal={tx,tz}});
// ---------- loop ----------
const clock=new THREE.Clock();const UP=new THREE.Vector3(-1,0,-1).normalize(),RIGHT=new THREE.Vector3(1,0,-1).normalize();let el=0,dirty=0,chimeT=12,shopT=0;
function canStand(x,z){const tx=Math.round(x-OX),tz=Math.round(z-OZ);return isLand(tx,tz)&&!blocked(key(tx,tz))}
function loop(){const dt=Math.min(clock.getDelta(),0.05);el+=dt;
 let mx=0,mz=0;if(!shopOpen&&!askOpen()){if(keys.KeyW||keys.ArrowUp)mz-=1;if(keys.KeyS||keys.ArrowDown)mz+=1;if(keys.KeyA||keys.ArrowLeft)mx-=1;if(keys.KeyD||keys.ArrowRight)mx+=1;
 if(joy){mx+=joy.x;mz+=joy.y}}
 const mv=new THREE.Vector3().addScaledVector(RIGHT,mx).addScaledVector(UP,-mz);
 if(mv.lengthSq()>0.01){goal=null;placeAt=null}
 if(goal&&!shopOpen){const gx=wx(goal.tx),gz=wz(goal.tz);const d=new THREE.Vector3(gx-player.position.x,0,gz-player.position.z);
   if(d.length()<1.05){facing.copy(d.normalize());player.rotation.y=Math.atan2(facing.x,facing.z);const g=goal;goal=null;act(g.tx,g.tz)}else mv.copy(d.normalize())}
 const moving=mv.lengthSq()>0.01;
 if(moving){if(mv.length()>1)mv.normalize();const sp=3.2*dt;facing.copy(mv).normalize();
   const nx=player.position.x+mv.x*sp,nz=player.position.z+mv.z*sp;
   if(canStand(nx,player.position.z))player.position.x=nx;if(canStand(player.position.x,nz))player.position.z=nz;
   if(goal&&!canStand(nx,nz)&&!canStand(nx,player.position.z)&&!canStand(player.position.x,nz))goal=null;
   player.rotation.y=Math.atan2(facing.x,facing.z);S.px=player.position.x;S.pz=player.position.z}
 player.position.y=moving?Math.abs(Math.sin(el*12))*0.06:Math.sin(el*2)*0.01;
 player.userData.leg0.position.z=moving?Math.sin(el*12)*0.06:0;player.userData.leg1.position.z=moving?-Math.sin(el*12)*0.06:0;
 const [tx,tz]=targetTile();hl.visible=isLand(tx,tz)&&!placing;hl.position.set(wx(tx),0.08,wz(tz));hl.material.opacity=0.55+Math.sin(el*3)*0.25;
 if(placing&&ghost){const [px,pz]=placeTarget();const ok=!canPlace(px,pz);ghostTile.visible=true;ghostTile.material=ok?ghostOk:ghostNo;ghostTile.position.set(wx(px),0.03,wz(pz));ghost.position.set(wx(px),0.02+Math.sin(el*4)*0.03,wz(pz));$('placeOk').disabled=!ok}
 cam.position.set(CAMOFF.x,CAMOFF.y,CAMOFF.z);cam.lookAt(0,0,0);// 小岛固定居中，整岛一屏可见
 // world sim
 S.time+=dt/240;if(S.time>=1){S.time=0;S.day++}
 for(const k in S.objs){const o=S.objs[k];
   if(o.t=='crop'&&o.s<3){o.g+=dt*(o.w?1:0.3);if(o.g>=7){o.g=0;o.s++;o.w=false;dirty=1;refresh(k);if(o.s==3)pop('✨ 成熟啦',meshes[k].position)}}
   else if(o.t=='stump'||o.t=='rubble'){o.r+=dt;if(o.r>45){S.objs[k]={t:o.t=='stump'?'tree':'rock'};refresh(k)}}
   else if(o.t=='gold'&&o.cd>0)o.cd-=dt}
 shopT+=dt;if(shopT>1){shopT=0;if(shopOpen&&shopTab=='deco'&&S.recent.some(r=>r.cell))renderShop();S.recent=S.recent.filter(r=>!r.cell||Date.now()-r.at<60000)}
 if(dirty){hud();dirty=0}
 for(const k in meshes){const m=meshes[k],c=m.userData.crown;if(c){c.rotation.z=Math.sin(el*0.9+k.length+m.position.x)*0.04;c.rotation.x=Math.cos(el*0.7+m.position.z)*0.03;c.scale.y=1+Math.sin(el*2.1+m.position.x)*0.02}
   const sw=m.userData.sway;if(sw){sw.rotation.z=0.12*Math.sin(el*1.6);m.userData.tails.forEach((t,i)=>t.rotation.z=0.15*Math.sin(el*1.6-0.4*(i+1)))}
   if(S.objs[k]?.t=='deco'&&S.objs[k].k=='pot'&&Math.random()<dt*1.2&&potPetals.length<30){const p=new THREE.Mesh(new THREE.PlaneGeometry(0.06,0.045),pm);p.position.set(m.position.x+(Math.random()-0.5)*0.3,0.45,m.position.z+(Math.random()-0.5)*0.3);p.userData={t:0,s:Math.random()*6};scene.add(p);potPetals.push(p)}}
 for(let i=potPetals.length-1;i>=0;i--){const p=potPetals[i];p.userData.t+=dt;p.position.y+=dt*0.25;p.position.x+=Math.sin(el*2+p.userData.s)*dt*0.2;p.rotation.x+=dt*2;p.rotation.z+=dt;if(p.userData.t>2.2){scene.remove(p);potPetals.splice(i,1)}}
 chimeT-=dt;if(chimeT<=0){chimeT=10+Math.random()*10;if(Object.values(S.objs).some(o=>o.t=='deco'&&o.k=='chime'))tone([1046.5,1174.7,1318.5,1568,1760][Math.random()*5|0],1.6,0.04,'sine')}
 if(signT>=0&&shopMesh){signT+=dt;const s=shopMesh.userData.sign;s.rotation.z=signT<0.5?0.15*Math.sin(signT/0.5*Math.PI*3)*(1-signT/0.5):0;if(signT>0.5)signT=-1}
 for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.t+=dt;const a=b.pts.geometry.attributes.position;b.v.forEach((v,j)=>{v.y-=2*dt;a.array[j*3]+=v.x*dt;a.array[j*3+1]+=v.y*dt;a.array[j*3+2]+=v.z*dt});a.needsUpdate=true;b.pts.material.opacity=1-b.t;if(b.t>1){scene.remove(b.pts);b.pts.geometry.dispose();bursts.splice(i,1)}}
 floaters.forEach(r=>{r.position.y=r.userData.y0+Math.sin(el*Math.PI/2+r.userData.ph)*0.15});
 clouds.forEach(c=>{c.userData.a+=c.userData.v*dt;c.position.x=Math.cos(c.userData.a)*c.userData.r;c.position.z=Math.sin(c.userData.a)*c.userData.r});
 flies.forEach(f=>{const u=f.userData;const t=el*0.4+u.ph;f.position.set(u.cx+Math.sin(t)*1.5,0.8+Math.sin(t*3)*0.2,u.cz+Math.cos(t*1.3)*1.2);f.rotation.y=-t;const a=Math.sin(el*14+u.ph)*0.9;u.p1.rotation.y=a;u.p2.rotation.y=-a});
 petals.forEach(p=>{p.position.y-=dt*0.3;p.position.x+=Math.sin(el+p.userData.s)*dt*0.3;p.rotation.x+=dt;p.rotation.z+=dt*0.7;if(p.position.y<-1){p.position.y=6}});
 renderer.render(scene,cam);
 fixed.forEach(l=>{const [x,y]=toScreen(l.v);l.d.style.left=x+'px';l.d.style.top=y+'px'});
 for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=dt;const [x,y]=toScreen(p.v);p.d.style.left=x+'px';p.d.style.top=(y-p.t*30)+'px';p.d.style.opacity=1-Math.max(0,p.t-1)/0.8;if(p.t>1.8){p.d.remove();pops.splice(i,1)}}
 requestAnimationFrame(loop)}
checkQuest();hud();loop();save();
setTimeout(()=>toast(welcome),400);
window.__game={get S(){return S},act,setTool,player,facing,openShop,closeShop,buy,sell,startPlace,confirmPlace,cancelPlace,canPlace,refund,refundPlaced,blocked,isLand,key,targetTile,
 face(tx,tz){const [px,pz]=playerTile();facing.set(wx(tx)-wx(px),0,wz(tz)-wz(pz)).normalize();player.rotation.y=Math.atan2(facing.x,facing.z)},
 tp(x,z){player.position.set(wx(x),0,wz(z));S.px=wx(x);S.pz=wz(z);goal=null},hud,get shopOpen(){return shopOpen},get placing(){return placing},setPlaceAt(x,z){placeAt=[x,z]}};
