import * as THREE from '/vendor/three.module.js';
import { footprints, mapPoint as p, MAP_SCALE } from './campus-layout.js';
import { route, introShot } from './route.js';
import { departureWaypoints, notePose } from './camera-motion.js';
const distanceToRect=(x,z,b)=>Math.hypot(Math.max(b.minX-x,0,x-b.maxX),Math.max(b.minZ-z,0,z-b.maxZ));

// Small props and planting are a mix of observed vocabulary and inferred infill.
// They never move the campus footprint layout or occupy a reserved walking lane.
export const campusDetail = {
  prepareDetailSafety(){
    if(this.walkSamples)return;
    this.walkSamples=[];this.treeRecords=[];this.detailRecords=[];this.lifeActors=[];
    const line=(points)=>{
      const curve=new THREE.CatmullRomCurve3(points.map(a=>new THREE.Vector3(...a)),false,'centripetal');
      const steps=Math.ceil(curve.getLength()/.4);
      for(let i=0;i<=steps;i++){const q=curve.getPointAt(i/Math.max(1,steps));this.walkSamples.push([q.x,q.z]);}
    };
    let previous=introShot.position;
    for(const stop of route){
      const arrival=notePose(stop),reading=notePose(stop,true);
      const blocked=q=>footprints.some(b=>!b.field&&q[0]>b.minX-.35&&q[0]<b.maxX+.35&&q[2]>b.minZ-.35&&q[2]<b.maxZ+.35);
      const index=route.indexOf(stop),departure=departureWaypoints(index>0?route[index-1]:null,previous,stop.via[0]||stop.position,blocked);
      line([previous,...departure,...stop.via,stop.position,arrival.position]);
      line([arrival.position,reading.position]);
      // Also reserve the authored centreline for overview / existing QA views.
      line([previous,...stop.via,stop.position]);
      previous=reading.position;
    }
  },
  detailClear(x,z,radius=.3,margin=.9){
    this.prepareDetailSafety();
    if(footprints.some(b=>!b.field&&distanceToRect(x,z,b)<radius+.12))return false;
    if(this.walkSamples.some(q=>Math.hypot(q[0]-x,q[1]-z)<radius+margin))return false;
    if(route.some(s=>Math.hypot(x-s.marker[0],z-s.marker[2])<radius+.9))return false;
    const hard=this.detailRecords.filter(r=>!['shrub','grasses'].includes(r.kind));
    if(hard.some(r=>Math.hypot(r.x-x,r.z-z)<r.radius+radius+.12))return false;
    if(this.treeRecords.some(r=>Math.hypot(r.x-x,r.z-z)<.22*r.size+radius+.12))return false;
    return true;
  },
  registerDetail(kind,x,z,radius,source='inferred'){
    this.detailRecords.push({kind,x,z,radius,source});
  },

  // Replace floating canopy balls with a rooted, branched tree. Narrow street
  // trees are pruned to fit their facade setback; large crowns need real room.
  tree(x,z,size=1){
    this.prepareDetailSafety();
    let closest=Math.min(...footprints.filter(b=>!b.field).map(b=>distanceToRect(x,z,b)));
    if(closest<.4||!this.detailClear(x,z,.18*size,.7))return;
    if((this.roofZones||[]).some(({rect})=>{const a=p(rect[0],rect[1],0),b=p(rect[2],rect[3],0);return x>a[0]-.3&&x<b[0]+.3&&z>a[2]-.3&&z<b[2]+.3;}))return;
    const radius=Math.min(3.05*size,closest-.16);
    if(radius<.38)return;
    const m=this.m,height=(4.4+this.random()*.4)*size,base=-.055;
    this.column(x,base+height/2,z,.19*size,height,m.trunk);
    const lean=Math.min(radius*.5,.75*size);
    for(let i=0;i<4;i++){
      const a=i*Math.PI*.5+.3;
      this.beam([x,base+height*.7,z],[x+Math.cos(a)*lean,height+.65*size,z+Math.sin(a)*lean],.055*size,m.trunk);
    }
    for(let i=0;i<7;i++){
      const a=i*2.399+size,spread=i===0?0:radius*(.29+this.random()*.16);
      const h=height+(i===0?1.1:.65)*size;
      this.instance(this.leafGeometry,[m.leaf,m.leafLight,m.leafDark][i%3],[x+Math.cos(a)*spread,h,z+Math.sin(a)*spread],[radius*.55,1.3*size,radius*.55],[0,a,0]);
    }
    const bed=new THREE.Mesh(new THREE.CircleGeometry(Math.max(.45,.65*size),20),m.mulch);bed.rotation.x=-Math.PI/2;bed.position.set(x,.052,z);bed.receiveShadow=true;this.scene.add(bed);
    for(let i=0;i<7;i++){const a=i*2.399;this.instance(this.rockGeometry,m.soil,[x+Math.cos(a)*.35*size,.018,z+Math.sin(a)*.35*size],[.09,.025,.07]);}
    for(let i=0;i<7;i++){const a=this.random()*Math.PI*2,r=this.random()*.45;this.box(x+Math.cos(a)*r,.055,z+Math.sin(a)*r,.045,.003,.025,m.woodLight,a);}
    this.treeRecords.push({x,z,radius,height,size,wallGap:closest});
  },

  shrub(x,z,size=.55){
    if(!this.detailClear(x,z,size*.65,.8))return false;
    const m=this.m;
    for(let i=0;i<5;i++){
      const a=i*2.399,spread=size*.3;
      this.column(x+Math.cos(a)*spread,.15,z+Math.sin(a)*spread,.018,.3,m.trunk);
      this.instance(this.leafGeometry,i%2?m.leafDark:m.leaf,[x+Math.cos(a)*spread,.24+this.random()*.08,z+Math.sin(a)*spread],[size*.53,.30+this.random()*.1,size*.48],[0,a,0]);
    }
    this.registerDetail('shrub',x,z,size*.8);return true;
  },
  grasses(x,z,size=.5){
    if(!this.detailClear(x,z,size*.5,.8))return;
    for(let i=0;i<7;i++){
      const a=i*2.4,h=(.27+this.random()*.25)*size;
      this.instance(this.boxGeometry,i%3?this.m.leafLight:this.m.leafDark,[x+Math.cos(a)*.07,h/2+.02,z+Math.sin(a)*.07],[.025,h,.035],[Math.cos(a)*.28,a,Math.sin(a)*.28]);
    }
    this.registerDetail('grasses',x,z,size*.3);
  },
  plantingBed(rect,spacing=6,flowers=false){
    const [a,b,c,d]=rect,m=this.m;
    // Cut the bed around pedestrian lanes rather than painting mulch over a walk.
    const step=3;
    for(let mx=a;mx<c;mx+=step)for(let my=b;my<d;my+=step){
      const right=Math.min(c,mx+step),bottom=Math.min(d,my+step),q=p((mx+right)/2,(my+bottom)/2,0);
      const radius=Math.hypot(right-mx,bottom-my)*MAP_SCALE/2;
      if(!this.detailClear(q[0],q[2],radius,.85))continue;
      this.mapBox([mx,my,right,bottom],.027,.045,m.mulch);
      if(mx===a)this.mapBox([mx-.08,my,mx+.08,bottom],.04,.045,m.stoneLight);
      if(my===b)this.mapBox([mx,my-.08,right,my+.08],.04,.045,m.stoneLight);
      if(right===c)this.mapBox([right-.08,my,right+.08,bottom],.04,.045,m.stoneLight);
      if(bottom===d)this.mapBox([mx,bottom-.08,right,bottom+.08],.04,.045,m.stoneLight);
    }
    for(let mx=a+2;mx<c;mx+=spacing)for(let my=b+2;my<d;my+=spacing){
      const q=p(mx+(this.random()-.5)*2,my+(this.random()-.5)*2,0);
      if(this.shrub(q[0],q[2],.4+this.random()*.22)&&flowers&&this.random()>.55){
        this.column(q[0],.40,q[2],.012,.36,m.leafDark);
        this.instance(this.leafGeometry,m.flower,[q[0],.59,q[2]],[.045,.045,.045]);
      }
    }
    for(let mx=a+3;mx<c;mx+=spacing*1.8){const q=p(mx,d-1.2,0);this.grasses(q[0],q[2],1);}
  },
  streetLight(mx,my,height=3.6){
    const [x,,z]=p(mx,my,0);if(!this.detailClear(x,z,.22))return;
    const m=this.m;this.column(x,height/2,z,.045,height,m.darkSteel);
    this.column(x,.10,z,.13,.2,m.darkSteel);
    this.column(x,height,z,.28,.07,m.roof);
    this.column(x,height-.10,z,.16,.14,m.white);
    this.registerDetail('light',x,z,.22,'footage vocabulary');
  },
  wasteBin(mx,my){
    const [x,,z]=p(mx,my,0);if(!this.detailClear(x,z,.35))return;
    const m=this.m;this.column(x,.42,z,.25,.84,m.green);
    this.column(x,.85,z,.29,.065,m.frame);this.column(x,.87,z,.12,.025,m.soil);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;this.box(x+Math.cos(a)*.255,.42,z+Math.sin(a)*.255,.018,.7,.018,m.frame);}
    this.registerDetail('bin',x,z,.3,'footage vocabulary');
  },
  hydrant(mx,my){
    const q=p(mx,my,0);if(!this.detailClear(q[0],q[2],.3))return;
    const blue=this.material('#6f9da8');
    this.column(q[0],.31,q[2],.105,.62,blue);this.column(q[0],.045,q[2],.17,.09,blue);
    this.instance(this.leafGeometry,blue,[q[0],.66,q[2]],[.13,.08,.13]);
    this.box(q[0],.49,q[2],.43,.12,.12,blue);
    for(const side of [-1,1])this.instance(this.cylinderGeometry,blue,[q[0]+side*.22,.49,q[2]],[.09,.05,.09],[0,0,Math.PI/2]);
    this.registerDetail('hydrant',q[0],q[2],.3,'clip 01');
  },
  drain(mx,my){
    const q=p(mx,my,0);this.box(q[0],.038,q[2],.42,.025,.52,this.m.stone);
    this.box(q[0],.052,q[2],.34,.008,.44,this.m.darkSteel);
    for(let i=-2;i<=2;i++)this.box(q[0]+i*.06,.058,q[2],.018,.006,.40,this.m.metal);
  },
  detailBench(mx,my,angle=0){
    const [x,,z]=p(mx,my,0);if(!this.detailClear(x,z,1.3,.85))return;
    this.bench(x,z,angle,2.3);this.registerDetail('bench',x,z,1.3,'footage vocabulary');
  },
  campusDirectory(mx,my,angle=0,label='GREENHILL'){
    const [x,,z]=p(mx,my,0);if(!this.detailClear(x,z,.65))return;
    this.placeModel(()=>{
      for(const dx of [-.43,.43])this.box(dx,.66,0,.055,1.32,.07,this.m.frame);
      this.box(0,1.12,0,1.12,.84,.06,this.m.green);
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#e9e6cf';ctx.fillRect(0,0,512,384);ctx.fillStyle='#28563e';ctx.fillRect(0,0,512,80);ctx.fillStyle='#fff4da';ctx.font='bold 30px Georgia';ctx.textAlign='center';ctx.fillText(label,256,52);
      // Schematic map made from the actual footprints; decorative, not a new route.
      for(const b of footprints.filter(b=>!b.field)){
        const [a,y,c,d]=b.rect;ctx.fillStyle='#8ba48d';ctx.fillRect(30+(a-600)*.43,110+(y-390)*.32,(c-a)*.43,(d-y)*.32);
      }
      ctx.strokeStyle='#c1ae7f';ctx.lineWidth=3;ctx.strokeRect(12,92,488,277);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.04,.77),new THREE.MeshStandardMaterial({map:texture,roughness:.85}));panel.position.set(0,1.12,.037);this.scene.add(panel);
    },[0,0,0],[x,0,z],angle);
    this.registerDetail('directory',x,z,.65);
  },
  handrail(a,b){
    const m=this.m;
    this.beam([a[0],.94,a[2]],[b[0],.94,b[2]],.035,m.silver);
    for(const t of [0,.5,1]){const x=THREE.MathUtils.lerp(a[0],b[0],t),z=THREE.MathUtils.lerp(a[2],b[2],t);this.column(x,.46,z,.026,.92,m.silver);}
  },
  lawnChair(mx,my,angle=0){
    const q=p(mx,my,0);if(!this.detailClear(q[0],q[2],.7))return;
    this.placeModel(()=>{
      for(const x of [-.27,.27])for(const z of [-.24,.26])this.box(x,.22,z,.055,.44,.055,this.m.frame);
      for(let x=-.28;x<=.29;x+=.14)this.box(x,.45,0,.11,.075,.64,this.m.leafLight);
      for(let x=-.28;x<=.29;x+=.14)this.instance(this.boxGeometry,this.m.leafLight,[x,.78,-.32],[.11,.66,.06],[-.17,0,0]);
      for(const x of [-.38,.38])this.box(x,.65,-.02,.12,.065,.70,this.m.stoneLight);
    },[0,0,0],q,angle);
    this.registerDetail('lawn chair',q[0],q[2],.7,'MPAC footage vocabulary');
  },
  parkedCar(mx,my,color,angle=0){
    const q=p(mx,my,0),paint=this.material(color),rubber=this.material('#4c514c');
    this.placeModel(()=>{
      this.box(0,.44,0,1.72,.48,3.9,paint);this.box(0,.91,-.15,1.48,.5,1.85,this.m.windowBack);
      this.box(0,1.18,-.15,1.42,.06,1.75,paint);
      for(const x of [-.72,.72])this.box(x,.91,-.15,.035,.51,.065,paint);
      for(const z of [-1.97,1.97]){this.box(0,.37,z,1.5,.12,.045,this.m.silver);for(const x of [-.6,.6])this.box(x,.5,z,.24,.1,.05,this.m.white);}
      for(const x of [-.84,.84])for(const z of [-1.25,1.25])this.instance(this.cylinderGeometry,rubber,[x,.27,z],[.26,.15,.26],[0,0,Math.PI/2]);
    },[0,0,0],q,angle);
    this.registerDetail('parked car',q[0],q[2],2.2,'parking visible in clips 04 and 09');
  },

  actorContactShadow(group,x,z){
    // Cached sun shadows suit static campus geometry. Keep moving contact
    // shadows attached to the feet instead of leaving stale silhouettes.
    group.traverse(object=>{object.castShadow=false;});
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,24),this.m.shadow);
    shadow.rotation.x=-Math.PI/2;shadow.scale.set(x,z,1);shadow.position.y=.012;
    group.add(shadow);
  },
  makeStudent(start,end,color,phase=0,ground=-.055){
    const m=this.m,body=this.material(color),skin=this.material('#c6a27e'),pack=this.material('#566477');
    const group=new THREE.Group(),limbs=[];
    const box=(w,h,d,mat,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
    box(.34,.54,.2,body,0,.99,0);box(.27,.34,.12,pack,0,1.02,-.16);
    box(.09,.13,.09,skin,0,1.31,0);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.125,9,7),skin);head.position.y=1.47;head.castShadow=true;group.add(head);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.13,9,7,0,Math.PI*2,0,Math.PI*.55),m.trunk);hair.position.y=1.51;group.add(hair);
    for(const side of [-1,1]){
      const leg=new THREE.Group();leg.position.set(side*.10,.735,0);group.add(leg);
      const lower=new THREE.Mesh(new THREE.BoxGeometry(.115,.65,.12),m.frame);lower.position.y=-.32;leg.add(lower);
      const shoe=new THREE.Mesh(new THREE.BoxGeometry(.14,.09,.23),m.stoneLight);shoe.position.set(0,-.69,.035);leg.add(shoe);limbs.push(leg);
      const arm=new THREE.Group();arm.position.set(side*.23,1.25,0);group.add(arm);
      const sleeve=new THREE.Mesh(new THREE.BoxGeometry(.095,.52,.1),body);sleeve.position.y=-.23;arm.add(sleeve);limbs.push(arm);
    }
    this.actorContactShadow(group,.27,.20);
    this.scene.add(group);this.lifeActors.push({kind:'student',group,start:new THREE.Vector3(...p(...start,ground)),end:new THREE.Vector3(...p(...end,ground)),phase,limbs,speed:.48});
  },
  makePeacock(start,end,phase=0){
    const group=new THREE.Group(),blue=this.material('#387b83'),tail=this.material('#4b7860'),gold=this.m.gold,legs=[];
    const mesh=(geometry,material,x,y,z,scale)=>{const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);object.scale.set(...scale);object.castShadow=true;group.add(object);return object;};
    mesh(this.leafGeometry,tail,0,.40,0,[.19,.16,.32]);
    mesh(this.cylinderGeometry,blue,0,.59,.22,[.065,.36,.065]);mesh(this.leafGeometry,blue,0,.81,.24,[.09,.085,.095]);
    mesh(this.leafGeometry,gold,0,.79,.34,[.04,.025,.06]);
    for(let i=0;i<5;i++){const x=(i-2)*.06;const feather=mesh(this.leafGeometry,tail,x,.3,-.38,[.06,.04,.53]);feather.rotation.x=-.1;mesh(this.leafGeometry,gold,x,.34,-.68,[.018,.01,.025]);}
    for(const x of [-.075,.075]){const leg=mesh(this.cylinderGeometry,this.m.frame,x,.15,.02,[.014,.3,.014]);legs.push(leg);}
    for(const x of [-.025,0,.025])mesh(this.cylinderGeometry,blue,x,.94,.23,[.007,.12,.007]);
    this.actorContactShadow(group,.25,.6);
    this.scene.add(group);this.lifeActors.push({kind:'peacock',group,start:new THREE.Vector3(...p(...start,-.055)),end:new THREE.Vector3(...p(...end,-.055)),phase,limbs:legs,speed:.22});
  },
  animateCampusLife(delta){
    for(const actor of this.lifeActors||[]){
      // Walk out, pause, turn in place, walk back. Feet stay on the ground.
      const length=actor.start.distanceTo(actor.end),duration=length/actor.speed,cycle=duration*2+7;
      const t=(this.clock+actor.phase)%cycle;let u=0,walking=false,heading=0;
      if(t<duration){u=t/duration;walking=true;}
      else if(t<duration+3.5){u=1;heading=Math.PI*((t-duration)/3.5);}
      else if(t<duration*2+3.5){u=1-(t-duration-3.5)/duration;walking=true;heading=Math.PI;}
      else{heading=Math.PI+Math.PI*((t-duration*2-3.5)/3.5);}
      actor.group.position.lerpVectors(actor.start,actor.end,u);
      actor.group.rotation.y=Math.atan2(actor.end.x-actor.start.x,actor.end.z-actor.start.z)+heading;
      actor.limbs.forEach((limb,i)=>{limb.rotation.x=walking?Math.sin(this.clock*4+actor.phase)*(i%2?-.22:.22):0;});
    }
  },

  makeEnvironment(){
    this.prepareDetailSafety();
    // Source vocabulary: 01 planting and light poles; 04 VSI beds/seat walls;
    // 05 quad rock edges and furniture; 08 paving/tree wells; 09 MPAC landscape.
    const beds=[
      [776,826,781,916],[808,785,832,792],[806,922,836,928],
      [776,579,783,628],[783,575,790,583],[834,545.6,940,548.2],
      [841,571,864,574],[914,570,939,574],[972,571,988,579],
      [1010,565,1117,572],[1010,662,1050,669],[1071,666,1128,673],
      [1184,526,1191,549],[1203,483,1228,490],[1240,475,1268,478],
      [1322,519,1351,526],[1352,556,1383,563],[1400,575,1435,582],
      [1431,637,1441,671],[1510,703,1597,710],[1172,800,1283,808],[1087,609,1098,621],[1100,643,1113,650],[1014,601,1027,611]
    ];
    for(const [i,rect]of beds.entries())this.plantingBed(rect,i<9?5:7,i%4===0);
    for(const pt of [[806,941],[808,899],[805,814],[776,571],[939,579],[980,665],[1129,651],[1208,515],[1331,524],[1449,610],[1486,682]])this.streetLight(...pt);
    for(const pt of [[807,789],[809,911],[827,571],[946,572],[1118,652],[1241,509],[1334,520],[1482,645]])this.wasteBin(...pt);
    for(const [x,y,a]of [[813,928,0],[842,792,0],[944,566,Math.PI/2],[1030,655,0],[1099,661,0],[1205,530,.15],[1325,520,Math.PI/2],[1436,630,-.4],[1457,682,0]])this.detailBench(x,y,a);
    for(const [x,y,a]of [[808,930,-.4],[776,571,Math.PI/2],[1133,655,Math.PI],[1330,523,0],[1468,619,-Math.PI/2]])this.campusDirectory(x,y,a);
    this.hydrant(807,917);for(const q of [[790,850],[785,572],[1458,623]])this.drain(...q);
    for(const b of footprints.filter(b=>!b.field&&!b.custom)){
      const x=b.minX-.075,z=b.minZ+.3,h=b.height||3.55;
      this.column(x,h/2,z,.035,h,this.m.silver);
      this.beam([x,.12,z],[x-.14,.07,z],.035,this.m.silver);
    }
    // Grounded, varied perimeter trees replace the floating ring of foliage.
    for(let i=0;i<48;i++){
      const a=i/48*Math.PI*2,r=174+this.random()*13,x=25+Math.cos(a)*r,z=20+Math.sin(a)*r;
      this.tree(x,z,1.05+this.random()*.45);
    }
    // Deliberate tree groups frame otherwise unfinished background lawns.
    for(const [mx,my,s]of [[851,939,.9],[869,948,1],[851,1005,.95],[870,1045,1.05],[913,1076,1], [1003,693,.85],[1048,671,.75],[1154,503,.9],[1415,643,.65],[1442,698,.9],[1572,729,1.1],[1092,615,.95],[1105,647,.9],[1020,607,.9]]){const q=p(mx,my,0);this.tree(q[0],q[2],s);}
    // Pavement joints and flush brick borders follow the existing walk, not new routes.
    let previous=introShot.position;
    for(const [index,stop]of route.entries()){
      if(index>0){
        const curve=new THREE.CatmullRomCurve3([previous,...stop.via,stop.position].map(a=>new THREE.Vector3(...a)),false,'centripetal'),length=curve.getLength();
        if(stop.surface!=='flagstone')for(let d=1.8;d<length;d+=1.8){const q=curve.getPointAt(d/length),t=curve.getTangentAt(d/length);this.box(q.x,.045,q.z,index===1?2.5:3,.008,.015,this.m.pathAlt,Math.atan2(t.x,t.z));}
        if([1,4,6].includes(index))for(let d=.6;d<length;d+=1.2){
          const q=curve.getPointAt(d/length),t=curve.getTangentAt(d/length),width=index===1?1.36:index===4?1.2:1.6;
          for(const side of [-1,1]){const x=q.x-t.z*side*width,z=q.z+t.x*side*width;if(!footprints.some(b=>!b.field&&distanceToRect(x,z,b)<.15))this.box(x,.04,z,.15,.05,1.16,this.m.pavingBrick,Math.atan2(t.x,t.z));}
        }
      }
      previous=stop.position;
    }
    // Root pads, seating and detail surround intentional clue landings; no shrub
    // or prop is allowed to obscure the approach or the close reading pose.
    for(const stop of route){const [x,,z]=stop.marker;this.box(x,.035,z,1.5,.065,1.3,this.m.path);}
    for(const [mx,my,angle]of [[1450,626,.3],[1458,627,-.3],[1464,640,.2],[1455,645,-.5],[1470,658,.4],[1460,665,-.4],[1451,669,.1],[1472,679,-.5],[1460,686,.3]])this.lawnChair(mx,my,angle);
    for(const [mx,color]of [[1359,'#c4c2b7'],[1378,'#7b8d8e'],[1397,'#b6ad94'],[1416,'#909793'],[1437,'#d4d4c8']])this.parkedCar(mx,491,color);
    for(const [my,color]of [[495,'#b6bdb8'],[522,'#8d9fa0'],[549,'#c4bba7']])this.parkedCar(755,my,color,Math.PI/2);
    this.detailBench(1092,625,.1);this.detailBench(1115,649,-.35);
    this.makeStudent([824,814],[847,814],'#a98f7c',2);
    this.makeStudent([866,562],[881,562],'#7e8c99',8,.02);
    this.makeStudent([1048,589],[1074,589],'#b3a17b',4);
    this.makeStudent([1264,492],[1285,492],'#88957b',12,.043);
    this.makeStudent([1490,654],[1490,678],'#ac8f8b',9,.026);
    this.makePeacock([1040,654],[1053,650],5);
    this.makePeacock([1388,594],[1402,603],13);
    // Gateway infill is outside the playing field and existing basketball slab.
    for(const [mx,my,size]of [[771,925,1.65],[826,928,1.6],[841,991,1.2]]){const q=p(mx,my,0);this.tree(q[0],q[2],size);}
    this.plantingBed([807,950,824,958]);
    this.makePeacock([815,935],[828,935],3);
    this.animateCampusLife(0);
    // Reuse the observed low rail vocabulary at the VSI glazing / MPAC planter.
    this.handrail(p(835,548.3,0),p(857,548.3,0));
    this.handrail(p(905,548.3,0),p(931,548.3,0));
    this.environmentStats={trees:this.treeRecords.length,details:this.detailRecords.length,students:5,peacocks:3};
  }
};
