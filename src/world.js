import * as THREE from '/vendor/three.module.js';
import { route, introShot, revealShot } from './route.js';
import { footprints, mapPoint, landmarks } from './campus-layout.js';

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
    this.scene.fog = new THREE.Fog('#cfddc7', 48, 140);
    this.camera = new THREE.PerspectiveCamera(53, innerWidth / innerHeight, 0.1, 230);
    this.camera.position.copy(this.basePosition);
    this.makeMaterials();
    this.makeSky();
    this.makeLighting();
    this.makeCampus();
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
      mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.scene.add(mesh);
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
    const sun = new THREE.DirectionalLight('#fff0ce', 3.1); sun.position.set(-32, 47, 30); sun.castShadow = true;
    sun.shadow.mapSize.set(innerWidth < 700 ? 2048 : 4096, innerWidth < 700 ? 2048 : 4096);
    Object.assign(sun.shadow.camera, { left: -58, right: 58, top: 58, bottom: -58, near: 1, far: 130 });
    sun.shadow.normalBias = 0.08; sun.shadow.bias = 0.00015; sun.shadow.radius = 3;
    this.sun = sun; this.scene.add(sun);
  }

  path(x, z, width, depth) {
    this.box(x, -0.015, z, width, 0.08, depth, this.m.path);
    const nx = Math.max(1, Math.floor(width / 1.4)), nz = Math.max(1, Math.floor(depth / 1.7));
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      this.box(x - width / 2 + (ix + 0.5) * width / nx, 0.034, z - depth / 2 + (iz + 0.5) * depth / nz,
        width / nx - 0.035, 0.025, depth / nz - 0.035, this.random() > 0.8 ? this.m.pathAlt : this.m.path);
    }
  }

  tree(x, z, size = 1) {
    const trunkHeight = 4.2 * size;
    this.column(x, trunkHeight / 2, z, 0.27 * size, trunkHeight, this.m.trunk);
    for (let b = 0; b < 4; b++) {
      const angle = b * 1.65 + this.random() * 0.4;
      const end = [x + Math.cos(angle) * 2 * size, (5.6 + this.random()) * size, z + Math.sin(angle) * 2 * size];
      this.beam([x, 2.7 * size, z], end, 0.13 * size, this.m.trunk);
    }
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.399, spread = Math.sqrt(i / 11) * 3.5 * size;
      const height = (6.8 + (1 - i / 11) * 2 + this.random() * 0.7) * size;
      this.instance(this.leafGeometry, [this.m.leaf, this.m.leafLight, this.m.leafDark][i % 3], [x + Math.cos(angle) * spread, height, z + Math.sin(angle) * spread], [2.1 * size, (1.4 + this.random() * 0.5) * size, 2.2 * size], [this.random(), this.random(), this.random()]);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(4.5 * size, 24), this.m.shadow); shadow.rotation.x = -Math.PI / 2; shadow.position.set(x, 0.045, z); this.scene.add(shadow);
    this.column(x, 0.01, z, 1.1 * size, 0.06, this.m.soil);
  }

  planter(x, z, w = 3, d = 2, flowers = false) {
    this.box(x, 0.23, z, w, 0.46, d, this.m.stone);
    this.box(x, 0.47, z, w - 0.16, 0.04, d - 0.16, this.m.soil);
    for (let i = 0; i < 13; i++) {
      const px = x + (this.random() - 0.5) * (w - 0.3), pz = z + (this.random() - 0.5) * (d - 0.3);
      this.instance(this.leafGeometry, i % 2 ? this.m.leaf : this.m.leafDark, [px, 0.68 + this.random() * 0.15, pz], [0.28, 0.34, 0.28]);
      if (flowers && i % 2) this.instance(this.leafGeometry, this.m.flower, [px, 1.04, pz], [0.095, 0.07, 0.095]);
    }
  }

  bench(x, z, rotation = 0, length = 2.6) {
    const place = (lx, y, lz, w, h, d, material) => this.box(x + lx * Math.cos(rotation) + lz * Math.sin(rotation), y, z - lx * Math.sin(rotation) + lz * Math.cos(rotation), w, h, d, material, rotation);
    for (let i = 0; i < 4; i++) place(0, 0.55, i * 0.12 - 0.18, length, 0.09, 0.1, this.m.wood);
    for (let i = 0; i < 3; i++) place(0, 0.92 + i * 0.15, -0.32, length, 0.11, 0.075, this.m.woodLight);
    for (const side of [-1, 1]) { place(side * (length / 2 - 0.3), 0.28, 0, 0.09, 0.55, 0.53, this.m.frame); place(side * (length / 2 - 0.3), 0.89, -0.35, 0.065, 0.9, 0.065, this.m.frame); }
  }

  building(x, z, width, depth, height = 4.2) {
    this.box(x, height / 2, z, width, height, depth, this.m.brick);
    this.box(x, height + 0.06, z, width + 0.5, 0.18, depth + 0.6, this.m.roof);
    this.box(x, height - 0.22, z + depth / 2 + 0.7, width + 0.8, 0.18, 1.8, this.m.roof);
    for (let dx = -width / 2 + 1; dx < width / 2; dx += 2.3) {
      this.box(x + dx, 2, z + depth / 2 + 0.035, 1.6, 2.35, 0.12, this.m.frame);
      this.box(x + dx, 2, z + depth / 2 + 0.105, 1.4, 2.15, 0.035, this.m.glassDark);
      this.box(x + dx, 2.0, z + depth / 2 + 0.14, 0.06, 2.2, 0.05, this.m.metal);
      this.box(x + dx, 1.55, z + depth / 2 + 0.14, 1.4, 0.06, 0.05, this.m.metal);
    }
    for (let dx = -width / 2; dx <= width / 2; dx += 3.2) this.box(x + dx, 1.9, z + depth / 2 + 1.3, 0.2, 3.8, 0.2, this.m.stone);
    for (let dz = -depth / 2; dz <= depth / 2; dz += 0.7) this.box(x, height + 0.16, z + dz, width + 0.4, 0.045, 0.035, this.m.metal);
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
    this.box(point[0],y,point[2],(c-a)*.12,h,(d-b)*.12,material);
  }

  coveredWalk(rect, height=3.4, axis='z', timber=false) {
    const [a,b,c,d]=rect,m=this.m;
    this.mapBox(rect,0,.065,m.path);
    this.mapBox(rect,height,.18,m.roof);
    this.mapBox(rect,height-.14,.12,timber?m.woodLight:m.plaster);
    if(axis==='z') {
      for(let y=b+5;y<d;y+=28)for(const x of [a+2,c-2]){
        // The athletic entrance opens between the canopy piers (02:04).
        if(a===777&&y>766&&y<788)continue;
        const point=mapPoint(x,y,0);this.box(point[0],height/2,point[2],.28,height,.3,m.brick);
        this.mapBox([a,y-1,c,y+1],height-.22,.13,m.wood);
      }
    } else {
      for(let x=a+7;x<c;x+=28)for(const y of [b+2,d-2]){
        const point=mapPoint(x,y,0);this.box(point[0],height/2,point[2],.28,height,.3,m.brick);
        this.mapBox([x-1,b,x+1,d],height-.22,.13,m.wood);
      }
    }
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
    this.placeModel(()=>this.makeBasketballCourt(),[-13.75,0,22],mapPoint((court[0]+court[2])/2,(court[1]+court[3])/2,0),0,[(court[2]-court[0])*.12/16.5,1,(court[3]-court[1])*.12/14]);
    this.mapBox([803,840,805,899],.33,.66,m.stone);
    for(const y of [888,895,902])this.mapBox([803,y,815,y+2],.08,.16,m.stoneLight);
    for(const y of [822,853,882]){const pt=mapPoint(781,y,0);this.tree(pt[0],pt[2],.6);}
    this.mapBox([788,790,792,936],-.01,.06,m.path);
  }

  makePhillipsGym() {
    const m=this.m,gym=footprints.find(item=>item.name==='Phillips Family Gymnasium');
    const x=(gym.minX+gym.maxX)/2,z=(gym.minZ+gym.maxZ)/2,w=gym.maxX-gym.minX,d=gym.maxZ-gym.minZ,east=gym.maxX;
    this.box(x,3.9,z,w,7.8,d,m.brick);
    const roof=new THREE.Shape();roof.moveTo(-w/2-.2,-.12);
    for(let i=0;i<=32;i++){const t=i/32;roof.lineTo((t-.5)*(w+.4),1.25*Math.sin(t*Math.PI));}
    roof.lineTo(w/2+.2,-.12);roof.closePath();
    const barrel=new THREE.Mesh(new THREE.ExtrudeGeometry(roof,{depth:d+.4,bevelEnabled:false}),m.metal);
    barrel.position.set(x,7.8,gym.minZ-.2);barrel.castShadow=true;this.scene.add(barrel);
    const entry=mapPoint(775,777,0);
    this.box(east+.035,1.55,entry[2],.08,3,3.3,m.glassDark);
    for(let dz=-1.5;dz<=1.5;dz+=.5)this.box(east+.09,1.55,entry[2]+dz,.07,3,.045,m.metal);
    this.box(east+.1,2.65,entry[2],.07,.08,3.3,m.white);
    this.mapBox([775,763,816,790],4.1,.2,m.roof);
    for(const mx of [778,812])for(const my of [766,787]){
      const p=mapPoint(mx,my,0);this.box(p[0],2,p[2],.35,4,.35,m.stoneLight);
      this.beam([p[0],3.7,p[2]],[p[0]+.45,4.1,p[2]],.04,m.metal);
    }
    // Clips 01:54–03:08 show posts, exposed rafters, and a straight opening.
    // There are no cross-wall arches or masonry dead end on this route.
    this.coveredWalk([777,633,804,822],3.35,'z',true);
    this.coveredWalk([777,585,804,633],3.35,'z',true);
    const pt=mapPoint(778,777,0);
    const sign=document.createElement('canvas');sign.width=512;sign.height=192;
    const ctx=sign.getContext('2d');ctx.fillStyle='#28563e';ctx.fillRect(0,0,512,192);ctx.fillStyle='#f5ead1';ctx.font='bold 30px Georgia';ctx.textAlign='center';ctx.fillText('GREENHILL HORNETS',256,50);ctx.font='bold 112px Georgia';ctx.fillText('G',256,160);
    const texture=new THREE.CanvasTexture(sign);texture.colorSpace=THREE.SRGBColorSpace;
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.94),new THREE.MeshStandardMaterial({map:texture}));panel.rotation.y=Math.PI/2;panel.position.set(east+.12,2,pt[2]);this.scene.add(panel);
  }

  makeVSI() {
    const m=this.m,b=footprints.find(item=>item.name==='STEM + Innovation Center');
    this.mapBox(b.rect,6.05,4.3,m.plaster);
    this.mapBox([794,422,960,533],1.9,3.8,m.plaster);
    this.mapBox([794,570,819,632],4.1,8.2,m.plaster);
    // The southwest leg has an open east/west passage below its upper floor.
    this.mapBox([794,545,832,570],5.9,4.6,m.plaster);
    this.mapBox([789,545,835,570],3.53,.22,m.woodLight);
    for(let x=790;x<=834;x+=3)this.mapBox([x,545,x+.65,570],3.38,.08,m.wood);
    // South facade: ground-floor glass, upper clerestory and horizontal fins.
    const z=mapPoint(0,545,0)[2];
    for(let x=833;x<960;x+=16){
      const [wx]=mapPoint(x+8,0,0);
      this.box(wx,1.8,z+.025,1.83,3.5,.06,m.glass);
      this.box(wx,1.8,z+.08,.075,3.6,.08,m.frame);
      this.box(wx,6.9,z+.04,1.7,2.2,.08,m.glassDark);
    }
    for(let y=3.9;y<6.1;y+=.25)this.mapBox([832,545,962,548],y,.11,m.metal);
    for(let my=580;my<625;my+=19){
      const [wx,,wz]=mapPoint(793.8,my,0);
      this.box(wx,2,wz,.08,2.6,1.45,m.glassDark);
      this.box(wx-.13,2,wz,.18,2.7,.08,m.metal);
    }
    // Paved court with low stone seat walls; Rotunda stays to the south/right.
    this.mapBox([831,547,943,571],-.015,.07,m.path);
    for(const [mx,my]of [[854,568],[891,568],[923,569]])this.picnicTable(mx,my);
    for(const mx of [839,919]){const [x,,tz]=mapPoint(mx,572,0);this.tree(x,tz,.43);}
    for(const rect of [[797,545,824,547],[797,566,824,568]])this.mapBox(rect,.26,.52,m.stoneLight);
    // Parking northwest is visible before the east turn (04:08–24).
    this.mapBox([654,480,780,582],-.04,.04,m.pathAlt);
    for(let my=486;my<580;my+=12)this.mapBox([744,my,778,my+.5],.005,.015,m.white);
  }

  makeMPAC() {
    const m=this.m;
    // Clip 09: solid limestone cantilever above recessed glazing, not a timber atrium.
    this.mapBox([1478,580,1630,700],7.1,6.2,m.stone);
    this.mapBox([1477,578,1632,702],10.25,.16,m.stoneLight);
    this.mapBox([1533,582,1630,700],2,4,m.plaster);
    this.mapBox([1508,582,1533,700],.02,.08,m.stoneLight);
    this.mapBox([1508,582,1508.4,700],2,4,m.glass);
    this.mapBox([1508,582,1533,582.4],2,4,m.glass);
    const west=mapPoint(1507.8,0,0)[0];
    for(let my=586;my<=700;my+=8){
      const z=mapPoint(0,my,0)[2];this.box(west,2,z,.1,4,.07,m.metal);
    }
    for(const my of [605,647,688]){
      const [x,,z]=mapPoint(1499,my,0);this.column(x,2,z,.07,4,m.frame);
    }
    for(let my=596;my<=628;my+=7){
      const [x,,z]=mapPoint(1477.8,my,0);this.box(x,7.1,z,.08,3.2,.65,m.glassDark);
      this.box(x-.035,7.1,z+.36,.1,3.35,.06,m.metal);
    }
    this.mapBox([1475,588,1507,700],-.01,.07,m.path);
    // Lawn and chairs on the south side of the diagonal approach.
    for(const [mx,my]of [[1450,626],[1461,643],[1470,666],[1454,672]]){
      const [x,,z]=mapPoint(mx,my,0);this.bench(x,z,Math.PI/2,1.0);
    }
    this.mapBox([1497,624,1505,644],.25,.5,m.stoneLight);
    this.mapBox([1498,625,1504,643],.52,.04,m.pathAlt);
    this.mapBox([1350,478,1465,550],-.06,.035,m.pathAlt);
    for(let x=1357;x<1465;x+=12)this.mapBox([x,480,x+.5,512],-.025,.012,m.white);
  }

  makeAcademicCourts() {
    const m=this.m;
    // Low classroom colonnades frame the quadrangle and the north Fulton court.
    this.coveredWalk([1148,573,1177,650],3.35,'z');
    this.coveredWalk([1180,558,1244,575],3.35,'x');
    this.coveredWalk([1238,476,1345,488],3.35,'x',true);
    this.coveredWalk([1327,486,1344,518],3.35,'z',true);
    this.mapBox(landmarks.upperCourt,-.015,.08,m.brick);
    for(let x=1240;x<1338;x+=7)this.mapBox([x,478,x+.35,512],.031,.008,m.pathAlt);
    for(const [mx,my]of [[1254,486],[1308,488]]){const [x,,z]=mapPoint(mx,my,0);this.tree(x,z,.58);}
    for(const [mx,my]of [[1255,507],[1311,505]])this.picnicTable(mx,my);
    for(const [mx,my]of [[953,568],[983,580],[1023,594],[1087,593],[1195,541],[1218,530],[1372,559],[1417,542]]){
      const [x,,z]=mapPoint(mx,my,0);this.tree(x,z,.7);
    }
    this.picnicTable(955,574,true);this.picnicTable(1037,600);
    for(const [mx,my]of [[1033,646],[1068,615],[1114,644]]){
      const [x,,z]=mapPoint(mx,my,0);this.box(x,.2,z,.8,.4,.6,m.stoneLight);
    }
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
    if(flagstone)for(let i=0;i<steps;i++){
      const point=curve.getPointAt((i+.5)/steps),tangent=curve.getTangentAt((i+.5)/steps);
      const side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
      for(const offset of [-.65,0,.65]){
        const shape=new THREE.CircleGeometry(.39+this.random()*.04,5);shape.rotateX(-Math.PI/2);
        this.instance(shape,i%3?this.m.stoneLight:this.m.stone,[point.x+side.x*offset,.04,point.z+side.z*offset],[1,1,.9],[0,this.random()*3,0]);
      }
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

  makeCampus() {
    this.box(12,-.18,14,220,.25,220,this.m.grass);
    for(const building of footprints) {
      if(building.field||building.custom)continue;
      const x=(building.minX+building.maxX)/2,z=(building.minZ+building.maxZ)/2;
      const w=building.maxX-building.minX,d=building.maxZ-building.minZ;
      this.placeModel(()=>this.building(0,0,w,d,building.height||4.3),[0,0,0],[x,0,z],Math.PI);
      // West-facing classroom windows seen while crossing east through the quad.
      for(let wz=building.minZ+.7;wz<building.maxZ-.4;wz+=1.5){
        this.box(building.minX-.035,1.9,wz,.08,2.4,.9,this.m.frame);
        this.box(building.minX-.085,1.9,wz,.035,2.2,.78,this.m.glassDark);
      }
    }
    this.makeAthleticApproach();this.makeVSI();this.makeMPAC();this.makeAcademicCourts();
    this.placeModel(()=>this.clockTower(0,0),[0,0,0],landmarks.clocktower,0,[1,.7,1]);
    let previous=introShot.position;
    for(const [index,stop]of route.entries()){
      if(index>0)this.walkCurve([previous,...stop.via,stop.position],index===1?1.75:1.9,stop.surface==='flagstone');
      previous=stop.position;
    }
    for(const stop of route){const [x,,z]=stop.marker;this.box(x,.4,z,1.05,.8,.7,this.m.stone);this.box(x,.83,z,1.15,.08,.8,this.m.stoneLight);}
    // Background greenery retains the original palette and atmospheric silhouette.
    for(let i=0;i<35;i++){
      const a=i/35*Math.PI*2,x=12+Math.cos(a)*92,z=12+Math.sin(a)*92;
      const field=footprints.find(item=>item.field);
      if(x>field.minX-10&&x<field.maxX+10&&z>field.minZ-10&&z<field.maxZ+10)continue;
      this.instance(this.leafGeometry,i%2?this.m.leafDark:this.m.leaf,[x,5,z],[6,5,6]);
    }
  }

  makeMarkers() {
    route.forEach((stop, index) => {
      const group = new THREE.Group(); group.position.set(...stop.marker);
      const note = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.42), this.m.paper); note.castShadow=true; group.add(note);
      const flap = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.02, 3), this.m.white); flap.rotation.y=Math.PI/2; flap.position.y=0.025; flap.scale.z=0.7; group.add(flap);
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.058,0.058,0.015,16), this.m.gold); seal.position.set(0,0.045,0); group.add(seal);
      group.rotation.y=0.35+index*0.2; this.scene.add(group);
      const beacon = new THREE.Group(); beacon.position.set(stop.marker[0],stop.marker[1]+0.6,stop.marker[2]);
      const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.105),this.m.glow); beacon.add(diamond);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23,0.008,5,36),this.m.glow); ring.rotation.x=-Math.PI/2; ring.position.y=-0.37; beacon.add(ring);
      this.scene.add(beacon); beacon.visible=false; this.markers.push({group,beacon,diamond,base:stop.marker[1],index});
    });
  }

  makeYearbook() {
    this.book = new THREE.Group(); this.book.position.copy(v(route[6].marker)); this.book.position.y=1.16;
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0,1.35,0.1),this.m.paper); back.position.set(0,0.67,0); back.castShadow=true; this.book.add(back);
    this.cover = new THREE.Group(); this.cover.position.set(-0.51,0,0.08);
    const coverMesh = new THREE.Mesh(new THREE.BoxGeometry(1.04,1.41,0.065),this.m.green); coverMesh.position.set(0.52,0.67,0); coverMesh.castShadow=true; this.cover.add(coverMesh);
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.87,1.22,0.07)),new THREE.LineBasicMaterial({color:'#d9b75e'}));border.position.set(0.52,0.67,0.005);this.cover.add(border);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.13),this.m.gold);star.position.set(0.52,0.82,0.05);star.scale.z=0.25;this.cover.add(star);
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
    const stop=route[index];const journey=this.move(stop.position,stop.look,stop.via,stop.duration);
    this.travel.glance=stop.glance;this.travel.followPath=stop.followPath;return journey;
  }
  move(position,look,via,duration) {
    this.cancelTravel();
    return new Promise(resolve=>{
      const points=[this.basePosition.clone(),...via.map(v),v(position)];
      this.travel={curve:new THREE.CatmullRomCurve3(points,false,'centripetal'),fromLook:this.target.clone(),toLook:v(look),position:v(position),started:performance.now(),duration:this.calm?250:duration,resolve};
    });
  }
  finishTravel() {
    if(!this.travel)return;
    const travel=this.travel;this.basePosition.copy(travel.position);this.target.copy(travel.toLook);this.camera.position.copy(this.basePosition);this.camera.lookAt(this.target);this.travel=null;
    this.onProgress(1);travel.resolve(true);
  }
  discover(index) { this.mode='discover';this.stop=index;this.markers[index].beacon.visible=true; }
  inspect(index) { this.mode='clue';this.markers[index].beacon.visible=false; }
  async toReveal() {
    this.mode='reveal';this.markers.forEach(marker=>marker.beacon.visible=false);
    const marker=route[Math.max(0,this.stop)].marker;
    this.book.position.set(marker[0],1.16,marker[2]);
    const direction=new THREE.Vector3(marker[0]-this.basePosition.x,0,marker[2]-this.basePosition.z).normalize();
    this.book.rotation.y=Math.atan2(-direction.x,-direction.z);
    const destination=[marker[0]-direction.x*4,1.75,marker[2]-direction.z*4];
    return this.move(destination,[marker[0],1.75,marker[2]],[],1800);
  }
  spotlight() { this.mode='spotlight'; }
  reset() {
    this.bookGeneration++;
    this.cancelTravel();this.mode='intro';this.stop=-1;this.basePosition.copy(v(introShot.position));this.target.copy(v(introShot.look));
    this.markers.forEach(marker=>marker.beacon.visible=false);this.cover.rotation.y=0;this.bookOpening=-1;
    if(this.portrait){this.book.remove(this.portrait);this.portrait.material.map.dispose();this.portrait.material.dispose();this.portrait.geometry.dispose();this.portrait=null;}
  }

  animate(now) {
    this.frame=requestAnimationFrame(this.animate);
    if(document.hidden){this.lastFrame=now;return;}
    const delta=Math.min((now-this.lastFrame)/1000,0.05);this.lastFrame=now;this.clock+=delta;
    let bob=0;
    if(this.travel) {
      const travel=this.travel,t=Math.min(1,(now-travel.started)/travel.duration),s=ease(t);
      if(!this.calm){this.basePosition.copy(travel.curve.getPointAt(s));this.target.lerpVectors(travel.fromLook,travel.toLook,ease(Math.min(1,t*1.5)));bob=Math.sin(t*Math.PI*12)*0.018*Math.sin(t*Math.PI);}
      if(!this.calm && travel.followPath){
        const ahead=travel.curve.getPointAt(Math.min(1,s+.045));
        const forward=ahead.sub(this.basePosition);forward.y=0;
        if(forward.lengthSq()>.0001){
          const heading=this.basePosition.clone().add(forward.normalize().multiplyScalar(7));heading.y=1.85;
          this.target.lerpVectors(travel.fromLook,heading,ease(Math.min(1,t*7)));
          this.target.lerp(travel.toLook,ease(Math.max(0,(t-.84)/.16)));
        }
      }
      if(!this.calm && travel.glance){const g=travel.glance,u=(t-g.start)/(g.end-g.start);if(u>0&&u<1)this.target.lerp(v(g.target),Math.sin(Math.PI*u)**2*g.strength);}
      this.onProgress(t);if(t>=1)this.finishTravel();
    }
    this.camera.position.copy(this.basePosition);this.camera.position.y+=bob;
    const target=this.target.clone();
    if(!this.calm&&this.mode!=='discover'){target.x+=Math.sin(this.clock*.24)*.035;target.y+=Math.sin(this.clock*.31)*.018;}
    this.camera.lookAt(target);
    if(new URLSearchParams(location.search).has('overhead')) {
      this.camera.position.set(10,145,15);this.camera.up.set(0,0,-1);this.camera.lookAt(10,0,15);
    }
    if(!this.calm){this.animated.forEach((mesh,i)=>{mesh.position.x=Math.sin(this.clock*.65+i*.7)*.045;mesh.position.z=Math.cos(this.clock*.42+i)*.025;});this.clouds.position.x=Math.sin(this.clock*.015)*6;this.motes.position.y=Math.sin(this.clock*.2)*.18;}
    this.markers.forEach(({beacon,diamond,index})=>{if(beacon.visible){beacon.position.y=route[index].marker[1]+.62+(this.calm?0:Math.sin(this.clock*1.7)*.045);diamond.rotation.y=this.calm?0:this.clock*.6;}});
    if(this.bookOpening>=0){const t=this.calm?1:Math.min(1,(this.clock-this.bookOpening)/1.2);this.cover.rotation.y=-ease(t)*Math.PI*.82;}
    if(this.mode==='discover'&&this.stop>=0){const marker=route[this.stop].marker;const point=new THREE.Vector3(marker[0],marker[1]+1.05,marker[2]).project(this.camera);this.onMarker({x:(point.x*.5+.5)*innerWidth,y:(-.5*point.y+.5)*innerHeight,visible:point.z<1});}
    // Keep the sky inside the camera far plane throughout the campus journey.
    // A world-origin dome leaves a clipped black hole when viewed from the field.
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.frames=String(Number(this.canvas.dataset.frames||0)+1);
    if(this.travel)this.canvas.dataset.traveling='true';else this.canvas.dataset.traveling='false';
  }
}
