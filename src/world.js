import * as THREE from '/vendor/three.module.js';
import { route, introShot, revealShot } from './route.js';
import { footprints, mapPoint, landmarks, MAP_SCALE } from './campus-layout.js';

import { departureWaypoints, notePose, walkingProgress, walkingTarget, walkDuration, TURN_RATE, smooth } from './camera-motion.js';
import { campusDetail } from './campus-detail.js';
import { campusArchitecture } from './campus-architecture.js';

const v = values => new THREE.Vector3(...values);
const ease = t => t * t * (3 - 2 * t);

export class CampusWorld {
  constructor(canvas, { onMarker, onProgress, onError }) {
    this.canvas = canvas;
    this.onMarker = onMarker;
    this.onProgress = onProgress;
    this.onError = onError;
    this.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.target = v(introShot.look);
    this.basePosition = v(introShot.position);
    this.mode = 'intro';
    this.stop = -1;
    this.travel = null;
    this.frame = 0;
    this.lastFrame = 0;
    this.clock = 0;
    this.bookGeneration = 0;
    this.batches = new Map();
    this.markers = [];
    this.animated = [];
    this.seed = 2857;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.65));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#cfddc7', 96, 280);
    this.camera = new THREE.PerspectiveCamera(53, innerWidth / innerHeight, 0.1, 460);
    this.camera.position.copy(this.basePosition);
    this.makeMaterials();
    this.makeSky();
    this.makeLighting();
    this.makeCampus();
    this.makeEnvironment();
    this.flushBatches();
    this.makeMarkers();
    if(new URLSearchParams(location.search).has('overhead')) {
      this.scene.fog=null;
      const points=[introShot.position,...route.flatMap(stop=>[...stop.via,stop.position])].map(point=>new THREE.Vector3(point[0],.3,point[2]));
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x202020})));
      route.forEach(stop=>{const dot=new THREE.Mesh(new THREE.SphereGeometry(.65),new THREE.MeshBasicMaterial({color:0xff2929}));dot.position.set(stop.marker[0],1,stop.marker[2]);this.scene.add(dot);});
    }
    this.makeYearbook();
    this.makeMotes();
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    window.addEventListener('resize', this.resize);
    this.visibilityHandler = () => { this.lastFrame = performance.now(); };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.cancelTravel();
      cancelAnimationFrame(this.frame);
      onError(new Error('The 3D connection was interrupted. Reload to return to campus.'));
    });
    this.resize();
    this.camera.lookAt(this.target);
    this.animate(performance.now());
    canvas.dataset.ready = 'true';
  }

  random() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  material(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.88, ...extra }); }

  makeMaterials() {
    const texture = (kind, base) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const context = canvas.getContext('2d'); context.fillStyle = base; context.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9500; i++) {
        const n = this.random(); context.fillStyle = n > 0.5 ? `rgba(255,255,225,${n * 0.12})` : `rgba(42,54,30,${n * 0.13})`;
        context.fillRect(this.random() * 256, this.random() * 256, kind === 'grass' ? 2 : 1, kind === 'grass' ? 4 : 2);
      }
      if (kind === 'brick') {
        context.strokeStyle = '#a3947650'; context.lineWidth = 2;
        for (let y = 0; y <= 256; y += 24) {
          context.beginPath(); context.moveTo(0, y); context.lineTo(256, y); context.stroke();
          for (let x = (y / 24) % 2 ? 24 : 0; x <= 256; x += 48) { context.beginPath(); context.moveTo(x, y); context.lineTo(x, y + 24); context.stroke(); }
        }
      }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(kind === 'grass' ? 36 : 3, kind === 'grass' ? 36 : 2);
      map.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      return map;
    };
    this.m = {
      grass: this.material('#a8bb73', { map: texture('grass', '#c0c99b') }),
      lawn: this.material('#8fa66c'),
      stone: this.material('#d9c9a6', { map: texture('stone', '#ece3ce'), bumpScale: 0.03 }),
      stoneLight: this.material('#ece3cc'),
      path: this.material('#d9d5bc'),
      pathAlt: this.material('#cfcbb2'),
      brick: this.material('#c1a37e', { map: texture('brick', '#dfc4a0') }),
      plaster: this.material('#e8e4ce'),
      frame: this.material('#586e62', { metalness: 0.35, roughness: 0.52 }),
      roof: this.material('#8a9b8b', { metalness: 0.35, roughness: 0.58 }),
      metal: this.material('#9cae99', { metalness: 0.48, roughness: 0.45 }),
      glass: this.material('#9ac1b3', { roughness: 0.22, metalness: 0.2, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }),
      glassDark: this.material('#6a9989', { roughness: 0.32, metalness: 0.3 }),
      wood: this.material('#b28a56'),
      woodLight: this.material('#c7aa77'),
      trunk: this.material('#7a7352', { flatShading: true }),
      leaf: this.material('#779952', { flatShading: true }),
      leafLight: this.material('#9bb169', { flatShading: true }),
      leafDark: this.material('#496f43', { flatShading: true }),
      soil: this.material('#858269'),
      mulch: this.material('#796c52'),
      green: this.material('#28563e'),
      gold: this.material('#dbb55e', { metalness: 0.55, roughness: 0.32 }),
      paper: this.material('#fff3d4'),
      white: this.material('#f5ead1'),
      flower: this.material('#e7d28c'),
      glow: new THREE.MeshBasicMaterial({ color: '#f7d88a', transparent: true, opacity: 0.78 }),
      shadow: new THREE.MeshBasicMaterial({ color: '#405d32', transparent: true, opacity: 0.11, depthWrite: false })
    };
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.leafGeometry = new THREE.IcosahedronGeometry(1, 1);
    this.rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    this.cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 9);
  }

  instance(geometry, material, position, scale, rotation = [0, 0, 0]) {
    const key = `${geometry.uuid}:${material.uuid}`;
    if (!this.batches.has(key)) this.batches.set(key, { geometry, material, matrices: [] });
    const dummy = new THREE.Object3D(); dummy.position.set(...position); dummy.scale.set(...scale); dummy.rotation.set(...rotation); dummy.updateMatrix();
    this.batches.get(key).matrices.push(dummy.matrix.clone());
  }
  box(x, y, z, w, h, d, material, rotation = 0) { this.instance(this.boxGeometry, material, [x, y, z], [w, h, d], [0, rotation, 0]); }
  column(x, y, z, radius, height, material) { this.instance(this.cylinderGeometry, material, [x, y, z], [radius, height, radius]); }
  beam(a, b, radius, material) {
    const start = v(a), end = v(b), delta = end.clone().sub(start);
    const mesh = new THREE.Mesh(this.cylinderGeometry, material); mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.scale.set(radius, delta.length(), radius); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); mesh.updateMatrix();
    const key = `${this.cylinderGeometry.uuid}:${material.uuid}`;
    if (!this.batches.has(key)) this.batches.set(key, { geometry: this.cylinderGeometry, material, matrices: [] });
    this.batches.get(key).matrices.push(mesh.matrix.clone());
  }
  flushBatches() {
    for (const { geometry, material, matrices } of this.batches.values()) {
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = !material.transparent && material !== this.m.grass && material !== this.m.path && material !== this.m.pathAlt;
      mesh.receiveShadow = ![this.m.windowBack,this.m.glass,this.m.glassDark].includes(material);
      if(geometry.type==='PlaneGeometry'||material===this.m.windowBack)mesh.castShadow=false;
      mesh.computeBoundingSphere(); this.scene.add(mesh);
      if ([this.m.leaf, this.m.leafLight, this.m.leafDark].includes(material)) this.animated.push(mesh);
    }
    this.batches.clear();
  }

  makeSky() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 24, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec3 direction;void main(){vec3 d=normalize(direction);float h=pow(max(d.y,0.0),0.55);vec3 sky=mix(vec3(0.92,0.91,0.79),vec3(0.43,0.70,0.79),h);float sun=pow(max(dot(d,normalize(vec3(-0.5,0.8,0.5))),0.0),180.0);float halo=pow(max(dot(d,normalize(vec3(-0.5,0.8,0.5))),0.0),12.0);gl_FragColor=vec4(sky+sun*vec3(0.6,0.45,0.22)+halo*vec3(0.12,0.09,0.01),1.0);}'
    }));
    sky.frustumCulled = false; this.sky = sky; this.scene.add(sky);
    this.clouds = new THREE.Group();
    const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#fff9df', transparent: true, opacity: 0.48, depthWrite: false });
    for (const [x, y, z, scale] of [[-40, 32, -70, 6], [22, 38, -85, 8], [68, 30, -45, 5]]) {
      for (let i = 0; i < 4; i++) { const cloud = new THREE.Mesh(this.leafGeometry, cloudMaterial); cloud.position.set(x + i * 4, y + Math.sin(i * 2) * 1.2, z); cloud.scale.set(scale, 1.2 + i * 0.2, 3); this.clouds.add(cloud); }
    }
    this.scene.add(this.clouds);
  }

  makeLighting() {
    this.scene.add(new THREE.HemisphereLight('#e0f0e5', '#a0a56e', 2.1));
    const sun = new THREE.DirectionalLight('#fff0ce', 3.1); sun.position.set(-64, 94, 60); sun.castShadow = true;
    sun.shadow.mapSize.set(innerWidth < 700 ? 2048 : 4096, innerWidth < 700 ? 2048 : 4096);
    Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 260 });
    sun.shadow.normalBias = 0.08; sun.shadow.bias = 0.00015; sun.shadow.radius = 3;
    this.shadowAnchor=new THREE.Vector3(this.basePosition.x,0,this.basePosition.z);
    sun.position.copy(this.shadowAnchor).add(new THREE.Vector3(-64,94,60));
    sun.target.position.copy(this.shadowAnchor);
    this.sun = sun; this.scene.add(sun,sun.target);
  }

  path(x, z, width, depth) {
    this.box(x, -0.015, z, width, 0.08, depth, this.m.path);
    const nx = Math.max(1, Math.floor(width / 1.4)), nz = Math.max(1, Math.floor(depth / 1.7));
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      this.box(x - width / 2 + (ix + 0.5) * width / nx, 0.034, z - depth / 2 + (iz + 0.5) * depth / nz,
        width / nx - 0.035, 0.025, depth / nz - 0.035, this.random() > 0.8 ? this.m.pathAlt : this.m.path);
    }
  }

  bench(x, z, rotation = 0, length = 2.6) {
    const place = (lx, y, lz, w, h, d, material) => this.box(x + lx * Math.cos(rotation) + lz * Math.sin(rotation), y, z - lx * Math.sin(rotation) + lz * Math.cos(rotation), w, h, d, material, rotation);
    for (let i = 0; i < 4; i++) place(0, 0.55, i * 0.12 - 0.18, length, 0.09, 0.1, this.m.wood);
    for (let i = 0; i < 3; i++) place(0, 0.92 + i * 0.15, -0.32, length, 0.11, 0.075, this.m.woodLight);
    for (const side of [-1, 1]) { place(side * (length / 2 - 0.3), 0.28, 0, 0.09, 0.55, 0.53, this.m.frame); place(side * (length / 2 - 0.3), 0.89, -0.35, 0.065, 0.9, 0.065, this.m.frame); }
  }

  clockTower(x, z) {
    for(const dx of [-.95,.95])for(const dz of [-.75,.75]){
      this.box(x+dx,1.6,z+dz,.42,3.2,.42,this.m.stone);
      this.box(x+dx,7.3,z+dz,.11,8.2,.11,this.m.frame);
    }
    this.box(x,3.25,z,2.6,.18,2.2,this.m.roof);
    for(let y=3.4;y<10;y+=2.5)for(const side of [-1,1]){
      this.beam([x-.95,y,z+side*.75],[x+.95,y+2.5,z+side*.75],.035,this.m.frame);
      this.beam([x+.95,y,z+side*.75],[x-.95,y+2.5,z+side*.75],.035,this.m.frame);
    }
    this.box(x,11.9,z,3,.16,2.7,this.m.roof);
    // Four clock faces remain visible from every approach to the tower.
    for(let face=0;face<4;face++){
      const group=new THREE.Group(),angle=face*Math.PI/2;
      group.position.set(x+Math.sin(angle)*.91,10.7,z+Math.cos(angle)*.91);group.rotation.y=angle;
      group.add(new THREE.Mesh(new THREE.CircleGeometry(.69,32),this.m.white));
      for(let i=0;i<12;i++){
        const tick=new THREE.Mesh(new THREE.BoxGeometry(.025,.06,.025),this.m.frame);
        const a=i/12*Math.PI*2;tick.position.set(Math.sin(a)*.58,Math.cos(a)*.58,.025);group.add(tick);
      }
      const hour=new THREE.Mesh(new THREE.BoxGeometry(.035,.35,.035),this.m.frame);hour.position.set(0,.15,.03);group.add(hour);
      const minute=new THREE.Mesh(new THREE.BoxGeometry(.45,.035,.035),this.m.frame);minute.position.set(.19,0,.03);group.add(minute);this.scene.add(group);
    }
  }

  // All footprint dimensions come from the supplied map. Heights and facade
  // subdivisions are visual estimates from the footage, not measurements.
  mapBox(rect, y, h, material) {
    const [a,b,c,d]=rect,point=mapPoint((a+c)/2,(b+d)/2,0);
    this.box(point[0],y,point[2],(c-a)*MAP_SCALE,h,(d-b)*MAP_SCALE,material);
  }

  picnicTable(mx,my,umbrella=false) {
    const [x,,z]=mapPoint(mx,my,0),m=this.m;
    this.column(x,.78,z,.5,.09,m.green);this.column(x,.4,z,.055,.8,m.frame);
    for(const [dx,dz]of [[-.75,0],[.75,0],[0,-.75],[0,.75]]){
      this.box(x+dx,.43,z+dz,.45,.09,.45,m.green);
      this.beam([x,.2,z],[x+dx,.4,z+dz],.035,m.frame);
    }
    if(umbrella){
      this.column(x,1.6,z,.025,3.2,m.frame);
      const canopy=new THREE.Mesh(new THREE.ConeGeometry(1.7,.5,8),m.green);canopy.position.set(x,2.9,z);this.scene.add(canopy);
    }
  }

  makeAthleticApproach() {
    const m=this.m,field=footprints.find(item=>item.field);
    const cx=(field.minX+field.maxX)/2,cz=(field.minZ+field.maxZ)/2;
    const w=field.maxX-field.minX,d=field.maxZ-field.minZ;
    this.box(cx,0,cz,w,.04,d,m.lawn);
    for(let i=0;i<10;i++)this.box(cx,.025,field.minZ+(i+.5)*d/10,w-.15,.012,d/10,i%2?m.lawn:m.grass);
    for(const x of [field.minX+.25,field.maxX-.25])this.box(x,.05,cz,.045,.018,d-.5,m.white);
    for(let i=0;i<=10;i++){
      const z=field.minZ+1+i*(d-2)/10;this.box(cx,.05,z,w-.5,.018,.045,m.white);
      for(const x of [cx-2.3,cx+2.3])for(let j=1;j<5&&i<10;j++)this.box(x,.05,z+j*(d-2)/50,.2,.018,.035,m.white);
    }
    for(const z of [field.minZ+.5,field.maxZ-.5]){
      this.column(cx,1.25,z,.07,2.5,m.gold);this.box(cx,2.5,z,3.1,.08,.08,m.gold);
      for(const x of [cx-1.55,cx+1.55])this.column(x,3.5,z,.05,2,m.gold);
    }
    for(const mx of [655,810])for(let row=0;row<3;row++){
      const [x,,z]=mapPoint(mx+row*4,1100,0);
      this.box(x,.24+row*.2,z,.45,.1,8.2,m.metal);
      for(const dz of [-3.7,0,3.7])this.box(x,(.24+row*.2)/2,z+dz,.06,.24+row*.2,.06,m.frame);
    }
    this.makePhillipsGym();
    const court=landmarks.basketball;
    this.placeModel(()=>this.makeBasketballCourt(),[-13.75,0,22],mapPoint((court[0]+court[2])/2,(court[1]+court[3])/2,0),0,[(court[2]-court[0])*MAP_SCALE/16.5,1,(court[3]-court[1])*MAP_SCALE/14]);
    this.mapBox([803,840,805,899],.33,.66,m.stone);
    for(const y of [888,895,902])this.mapBox([803,y,815,y+2],.08,.16,m.stoneLight);
    for(const y of [822,853,882]){const pt=mapPoint(778,y,0);this.tree(pt[0],pt[2],.6);}
    this.mapBox([788,790,792,936],-.01,.06,m.path);
  }

  walkCurve(points,width=2.1,flagstone=false) {
    const curve=new THREE.CatmullRomCurve3(points.map(v),false,'centripetal');
    const steps=Math.ceil(curve.getLength()*4),positions=[],indices=[];
    for(let i=0;i<=steps;i++){
      const point=curve.getPointAt(i/steps),tangent=curve.getTangentAt(i/steps);
      const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize().multiplyScalar(width/2);
      for(const sign of [-1,1])positions.push(point.x+side.x*sign,.028,point.z+side.z*sign);
      if(i<steps){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,flagstone?this.m.soil:this.m.path);mesh.receiveShadow=true;this.scene.add(mesh);
    if(flagstone){
      // Interlocking inset polygons, rather than overlapping pentagons that
      // looked like loose shards of paper on the walk.
      const rows=Math.ceil(curve.getLength()/.78),columns=3,nodes=[];
      for(let row=0;row<=rows;row++){
        const q=curve.getPointAt(row/rows),t=curve.getTangentAt(row/rows),side=new THREE.Vector3(-t.z,0,t.x).normalize(),line=[];
        for(let col=0;col<=columns;col++){
          const offset=(col/columns-.5)*width+(col>0&&col<columns?(this.random()-.5)*.22:0);
          const along=row>0&&row<rows?(this.random()-.5)*.22:0;
          line.push(new THREE.Vector3(q.x+side.x*offset+t.x*along,.045,q.z+side.z*offset+t.z*along));
        }
        nodes.push(line);
      }
      const vertices=[],colors=[];
      for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
        const corners=[nodes[row][col],nodes[row][col+1],nodes[row+1][col+1],nodes[row+1][col]];
        const center=corners.reduce((sum,q)=>sum.add(q),new THREE.Vector3()).multiplyScalar(.25),poly=[];
        for(let i=0;i<4;i++){
          const q=corners[i].clone().lerp(center,.04),next=corners[(i+1)%4].clone().lerp(center,.04);
          poly.push(q.clone().lerp(next,.10),q.clone().lerp(next,.90));
        }
        const color=(this.random()>.4?this.m.stoneLight.color:this.m.stone.color).clone().multiplyScalar(.94+this.random()*.09);
        for(let i=0;i<poly.length;i++)for(const q of [center,poly[i],poly[(i+1)%poly.length]]){vertices.push(q.x,q.y,q.z);colors.push(color.r,color.g,color.b);}
      }
      const stones=new THREE.BufferGeometry();stones.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));stones.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));stones.computeVertexNormals();
      this.m.pathStone=this.material('#ffffff',{vertexColors:true});
      const paving=new THREE.Mesh(stones,this.m.pathStone);paving.receiveShadow=true;this.scene.add(paving);
    }
  }

  makeBasketballCourt() {
    const m=this.m,cx=-13.75,north=15,south=29;
    const court=this.material('#aaa58d'),line=new THREE.MeshBasicMaterial({color:'#f5edd6'});
    this.box(cx,.025,22,16.5,.08,14,court);
    const mark=(points)=>{const vectors=points.map(p=>new THREE.Vector3(p[0],.078,p[1]));
      const curve=points.length>5?new THREE.CatmullRomCurve3(vectors,false,'centripetal'):new THREE.CurvePath();
      if(points.length<=5)for(let i=1;i<vectors.length;i++)curve.add(new THREE.LineCurve3(vectors[i-1],vectors[i]));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(2,points.length*3),.025,4,false),line);this.scene.add(mesh);};
    const arc=(x,z,r,a,b)=>Array.from({length:41},(_,i)=>[x+Math.cos(a+(b-a)*i/40)*r,z+Math.sin(a+(b-a)*i/40)*r]);
    mark([[-21.2,15.7],[-6.3,15.7],[-6.3,28.3],[-21.2,28.3],[-21.2,15.7]]);
    mark([[-21.2,22],[-6.3,22]]);mark(arc(cx,22,1.7,0,Math.PI*2));
    for(const [z,sign]of [[north+.8,1],[south-.8,-1]]){
      mark([[cx-2,z],[cx-2,z+sign*3.5],[cx+2,z+sign*3.5],[cx+2,z]]);
      mark(arc(cx,z+sign*.9,5,sign===1?0:Math.PI,sign===1?Math.PI:Math.PI*2));
      this.column(cx,1.6,z-sign*.35,.065,3.2,m.frame);
      this.box(cx,3.1,z,2,.95,.09,m.white);this.box(cx,3.08,z+sign*.055,.65,.43,.025,m.frame);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(.24,.025,6,20),m.gold);rim.rotation.x=Math.PI/2;rim.position.set(cx,2.85,z+sign*.4);this.scene.add(rim);
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;this.beam([cx+Math.cos(a)*.23,2.83,z+sign*.4+Math.sin(a)*.23],[cx+Math.cos(a)*.14,2.48,z+sign*.4+Math.sin(a)*.14],.008,m.white);}
    }
  }

  // Reuse complete architectural models, including their detail and materials.
  placeModel(build, source, destination, rotation = 0, scale = [1,1,1]) {
    const counts = new Map([...this.batches].map(([key,batch]) => [key,batch.matrices.length]));
    const previous = new Set(this.scene.children);
    const transform = new THREE.Matrix4().makeTranslation(...destination)
      .multiply(new THREE.Matrix4().makeRotationY(rotation))
      .multiply(new THREE.Matrix4().makeScale(...scale))
      .multiply(new THREE.Matrix4().makeTranslation(-source[0],-source[1],-source[2]));
    build();
    for (const [key,batch] of this.batches) for(let i=counts.get(key)||0;i<batch.matrices.length;i++) batch.matrices[i].premultiply(transform);
    for (const child of this.scene.children) if(!previous.has(child)) child.applyMatrix4(transform);
  }

  makeMarkers() {
    route.forEach((stop, index) => {
      const group = new THREE.Group(); group.position.set(...stop.marker);
      const note = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.42), this.m.paper); note.castShadow=true; group.add(note);
      const flap = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.02, 3), this.m.white); flap.rotation.y=Math.PI/2; flap.position.y=0.025; flap.scale.z=0.7; group.add(flap);
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.015,16), this.m.gold); seal.position.set(.19,.055,.11); group.add(seal);
      const paper=document.createElement('canvas');paper.width=512;paper.height=320;const ink=paper.getContext('2d');
      ink.fillStyle='#f5ead1';ink.fillRect(0,0,512,320);ink.strokeStyle='#b3a584';ink.lineWidth=3;ink.strokeRect(18,18,476,284);
      ink.fillStyle='#28563e';ink.textAlign='center';ink.font='24px Georgia';ink.fillText('H I L L I O N',256,80);ink.font='bold 54px Georgia';ink.fillText(`CLUE 0${index+1}`,256,151);ink.font='italic 22px Georgia';ink.fillText('Follow the story.',256,224);
      const texture=new THREE.CanvasTexture(paper);texture.colorSpace=THREE.SRGBColorSpace;
      const label=new THREE.Mesh(new THREE.PlaneGeometry(.55,.35),new THREE.MeshStandardMaterial({map:texture,roughness:1}));label.rotation.x=-Math.PI/2;label.position.y=.04;group.add(label);
      const arrival=notePose(stop).position;group.rotation.y=Math.atan2(arrival[0]-stop.marker[0],arrival[2]-stop.marker[2]); this.scene.add(group);
      const beacon = new THREE.Group(); beacon.position.set(stop.marker[0],stop.marker[1]+0.6,stop.marker[2]);
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.105),this.m.glow); beacon.add(diamond);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23,0.008,5,36),this.m.glow); ring.rotation.x=-Math.PI/2; ring.position.y=-0.37; beacon.add(ring);
      this.scene.add(beacon); beacon.visible=false; this.markers.push({group,beacon,diamond,base:stop.marker[1],index});
    });
  }

  makeYearbook() {
    this.book = new THREE.Group(); this.book.visible=false; this.book.position.copy(v(route[6].marker)); this.book.position.y=.905;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0,1.35,0.1),this.m.paper); back.position.set(0,0.67,0); back.castShadow=true; this.book.add(back);
    this.cover = new THREE.Group(); this.cover.position.set(-0.51,0,0.08);
    const coverMesh = new THREE.Mesh(new THREE.BoxGeometry(1.04,1.41,0.065),this.m.green); coverMesh.position.set(0.52,0.67,0); coverMesh.castShadow=true; this.cover.add(coverMesh);
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.87,1.22,0.07)),new THREE.LineBasicMaterial({color:'#d9b75e'}));border.position.set(0.52,0.67,0.005);this.cover.add(border);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13),this.m.gold);star.position.set(0.52,0.82,0.05);star.scale.z=0.25;this.cover.add(star);
    this.cover.children.forEach(child=>child.userData.closedX=child.position.x);
    this.bookOpeningSign=-1;
    this.book.add(this.cover);
    this.book.rotation.y=-Math.PI/2; // The standing cover faces the approach from the north.
    this.scene.add(this.book);
    this.portrait = null; this.bookOpening = -1;
  }

  async openYearbook(portraitPath) {
    // Do not even request the portrait until the game has ended.
    const generation = this.bookGeneration;
    const image = new Image();
    image.src = portraitPath;
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 720;
    canvas.getContext('2d').drawImage(image, 0, 0, 600, 720);
    const texture = new THREE.CanvasTexture(canvas);
    if (generation !== this.bookGeneration) { texture.dispose(); return; }
    texture.colorSpace=THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
    this.portrait = new THREE.Mesh(new THREE.PlaneGeometry(0.81,1.02),material);
    this.portrait.position.set(0,0.72,0.061);this.book.add(this.portrait);
    this.bookOpening=this.clock;
  }

  makeMotes() {
    const positions=new Float32Array(90*3);
    for(let i=0;i<90;i++){positions[i*3]=(this.random()-.5)*80;positions[i*3+1]=.5+this.random()*7;positions[i*3+2]=(this.random()-.5)*80;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.motes=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#ffedb9',size:0.045,transparent:true,opacity:.52,depthWrite:false}));this.scene.add(this.motes);
  }

  resize() {
    this.renderer.setSize(innerWidth,innerHeight,false);
    this.camera.aspect=innerWidth/innerHeight;this.camera.fov=innerWidth<650?66:53;this.camera.updateProjectionMatrix();
  }
  setCalm(value) { this.calm=value; if(value&&this.travel)this.finishTravel(); }
  cancelTravel() { if(this.travel){this.travel.resolve(false);this.travel=null;} }
  moveTo(index) {
    this.stop=index;this.mode='travel';this.markers.forEach(marker=>marker.beacon.visible=false);
    const stop=route[index],arrival=notePose(stop);
    const blocked=q=>footprints.some(b=>!b.field&&q[0]>b.minX-.35&&q[0]<b.maxX+.35&&q[2]>b.minZ-.35&&q[2]<b.maxZ+.35);
    const departure=departureWaypoints(index>0?route[index-1]:null,this.basePosition.toArray(),stop.via[0]||stop.position,blocked);
    const via=[...departure,...stop.via,stop.position];
    const journey=this.move(arrival.position,arrival.look,via,stop.duration);
    this.travel.kind='walk';this.travel.marker=stop.marker;
    this.travel.duration=this.calm?250:walkDuration(this.travel.curve.getLength());
    return journey;
  }
  move(position,look,via,duration) {
    this.cancelTravel();
    this.lastFrame=performance.now();
    return new Promise(resolve=>{
      const points=[this.basePosition.clone(),...via.map(v),v(position)];
      // Height changes are a gentle lean, not a bouncing walking spline.
      this.travel={curve:new THREE.CatmullRomCurve3(points,false,'centripetal'),fromLook:this.target.clone(),toLook:v(look),position:v(position),fromHeight:this.basePosition.y,elapsed:0,duration:this.calm?250:duration,resolve,kind:'focus'};
      this.travel.length=this.travel.curve.getLength();
    });
  }
  finishTravel(instant=true) {
    if(!this.travel)return;
    const travel=this.travel;this.basePosition.copy(travel.position);this.target.copy(travel.toLook);this.camera.position.copy(this.basePosition);
    if(instant)this.camera.lookAt(this.target);
    this.travel=null;this.onProgress(1);travel.resolve(true);
  }
  discover(index) { this.mode='discover';this.stop=index;this.markers[index].beacon.visible=true; }
  inspect(index) {
    this.mode='clue';this.markers[index].beacon.visible=false;
    const pose=notePose(route[index],true,innerWidth<650);
    this.move(pose.position,pose.look,[],1000);
  }
  async toReveal() {
    this.mode='reveal';this.book.visible=true;this.markers.forEach(marker=>marker.beacon.visible=false);
    const marker=route[Math.max(0,this.stop)].marker;
    this.markers[Math.max(0,this.stop)].group.visible=false;
    this.book.position.set(marker[0],.905,marker[2]);
    const direction=new THREE.Vector3(marker[0]-this.basePosition.x,0,marker[2]-this.basePosition.z).normalize();
    this.book.rotation.y=Math.atan2(-direction.x,-direction.z);
    const blocked=side=>{
      const q=new THREE.Vector3(side*1.3,0,.25).applyAxisAngle(new THREE.Vector3(0,1,0),this.book.rotation.y).add(this.book.position);
      return footprints.some(b=>!b.field&&q.x>b.minX-.05&&q.x<b.maxX+.05&&q.z>b.minZ-.05&&q.z<b.maxZ+.05);
    };
    const hingeRight=blocked(-1)&&!blocked(1),side=hingeRight?-1:1;
    this.cover.position.x=-.51*side;this.cover.children.forEach(child=>child.position.x=child.userData.closedX*side);
    this.bookOpeningSign=hingeRight?1:-1;
    const destination=[marker[0]-direction.x*2.6,1.65,marker[2]-direction.z*2.6];
    return this.move(destination,[marker[0],1.62,marker[2]],[],1800);
  }
  spotlight() { this.mode='spotlight'; }
  reset() {
    this.bookGeneration++;this.book.visible=false;
    this.cancelTravel();this.mode='intro';this.stop=-1;this.basePosition.copy(v(introShot.position));this.target.copy(v(introShot.look));this.camera.position.copy(this.basePosition);this.camera.lookAt(this.target);
    this.markers.forEach(marker=>{marker.beacon.visible=false;marker.group.visible=true;});this.cover.rotation.y=0;this.bookOpening=-1;
    if(this.portrait){this.book.remove(this.portrait);this.portrait.material.map.dispose();this.portrait.material.dispose();this.portrait.geometry.dispose();this.portrait=null;}
  }

  animate(now) {
    this.frame=requestAnimationFrame(this.animate);
    if(document.hidden){this.lastFrame=now;return;}
    const delta=Math.max(0,Math.min((now-this.lastFrame)/1000,0.05));this.lastFrame=now;this.clock+=delta;
    if(this.travel) {
      const travel=this.travel;travel.elapsed+=delta*1000;
      const t=Math.min(1,travel.elapsed/travel.duration),u=travel.kind==='walk'?walkingProgress(t):smooth(t);
      if(!this.calm){
        this.basePosition.copy(travel.curve.getPointAt(u));
        if(travel.kind==='walk'){
          this.basePosition.y=THREE.MathUtils.lerp(travel.fromHeight,1.72,smooth(t/.15));
          this.target.set(...walkingTarget(travel.curve,u,travel.length,travel.marker));
        }else this.target.lerpVectors(travel.fromLook,travel.toLook,smooth(t));
      }
      this.onProgress(t);if(t>=1)this.finishTravel(this.calm);
    }
    this.camera.position.copy(this.basePosition);
    const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(this.camera.position,this.target,this.camera.up));
    const angle=this.camera.quaternion.angleTo(orientation);
    if(this.calm||this.mode==='survey')this.camera.quaternion.copy(orientation);
    else this.camera.quaternion.slerp(orientation,angle<.00001?1:Math.min(1-Math.exp(-9*delta),TURN_RATE*delta/angle));
    if(new URLSearchParams(location.search).has('overhead')) {
      this.camera.position.set(20,300,30);this.camera.up.set(0,0,-1);this.camera.lookAt(20,0,30);
    }
    if(!this.calm){this.animateCampusLife(delta);this.animated.forEach((mesh,i)=>{mesh.position.x=Math.sin(this.clock*.65+i*.7)*.045;mesh.position.z=Math.cos(this.clock*.42+i)*.025;});this.clouds.position.x=Math.sin(this.clock*.015)*6;this.motes.position.y=Math.sin(this.clock*.2)*.18;}
    this.markers.forEach(({beacon,diamond,index})=>{if(beacon.visible){beacon.position.y=route[index].marker[1]+.62+(this.calm?0:Math.sin(this.clock*1.7)*.045);diamond.rotation.y=this.calm?0:this.clock*.6;}});
    if(this.bookOpening>=0){const t=this.calm?1:Math.min(1,(this.clock-this.bookOpening)/1.2);this.cover.rotation.y=this.bookOpeningSign*ease(t)*Math.PI*.82;}
    if(this.mode==='discover'&&this.stop>=0){const marker=route[this.stop].marker;const point=new THREE.Vector3(marker[0],marker[1]+.18,marker[2]).project(this.camera);this.onMarker({x:(point.x*.5+.5)*innerWidth,y:(-.5*point.y+.5)*innerHeight,visible:point.z<1});}
    // Keep the sky inside the camera far plane throughout the campus journey.
    // A world-origin dome leaves a clipped black hole when viewed from the field.
    this.sky.position.copy(this.camera.position);
    // Keep shadow texels fine around the active route as the campus opens out.
    const sx=this.camera.position.x-this.shadowAnchor.x,sz=this.camera.position.z-this.shadowAnchor.z;
    if(sx*sx+sz*sz>324){
      this.shadowAnchor.set(this.camera.position.x,0,this.camera.position.z);
      this.sun.position.copy(this.shadowAnchor).add(new THREE.Vector3(-64,94,60));
      this.sun.target.position.copy(this.shadowAnchor);this.sun.target.updateMatrixWorld();
      this.renderer.shadowMap.needsUpdate=true;
    }
    this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.frames=String(Number(this.canvas.dataset.frames||0)+1);
    if(this.travel)this.canvas.dataset.traveling='true';else this.canvas.dataset.traveling='false';
  }
}

Object.assign(CampusWorld.prototype, campusArchitecture, campusDetail);
