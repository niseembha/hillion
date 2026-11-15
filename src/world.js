import * as THREE from '/vendor/three.module.js';
import { route, introShot, revealShot } from './route.js';
import { footprints, mapPoint } from './campus-layout.js';

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

  makeAmphitheater() {
    // Open, curved limestone tiers, with lawn between each band.
    for (let tier = 0; tier < 4; tier++) {
      const radius = 7.6 + tier * 2.0, height = 0.23 + tier * 0.19;
      const segment = (width, depth) => {
        const shape = new THREE.Shape(), gap = 0.003, end = Math.PI / 26 - gap;
        shape.absarc(0, 0, radius + width / 2, -end, -gap, false);
        shape.absarc(0, 0, radius - width / 2, -gap, -end, true);
        shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 3 });
        geometry.rotateX(Math.PI / 2); geometry.translate(0, depth, 0);
        return geometry;
      };
      const base = segment(0.67, height), cap = segment(0.81, 0.09);
      for (let i = 0; i < 26; i++) {
        const angle = i / 26 * Math.PI;
        this.instance(base, this.m.stone, [0, 0, 6.2], [1, 1, 1], [0, angle, 0]);
        this.instance(cap, this.m.stoneLight, [0, height - 0.01, 6.2], [1, 1, 1], [0, angle, 0]);
      }
    }
    this.box(-1.3, 0.33, 7.2, 2.8, 0.66, 0.8, this.m.stone);
    this.box(-1.3, 0.7, 7.2, 2.9, 0.1, 0.93, this.m.stoneLight);

  }

  clockTower(x, z) {
    for (const dx of [-0.95, 0.95]) for (const dz of [-0.75, 0.75]) {
      this.box(x + dx, 0.6, z + dz, 0.6, 1.2, 0.6, this.m.brick);
      this.box(x + dx, 6.4, z + dz, 0.13, 11.5, 0.13, this.m.frame);
    }
    for (let y = 1.5; y < 11; y += 2.6) {
      this.beam([x - 0.95, y, z + 0.75], [x + 0.95, y + 2.6, z + 0.75], 0.045, this.m.frame);
      this.beam([x + 0.95, y, z + 0.75], [x - 0.95, y + 2.6, z + 0.75], 0.045, this.m.frame);
      this.box(x, y, z + 0.75, 1.9, 0.07, 0.1, this.m.metal);
    }
    this.box(x, 12.25, z, 3.6, 0.19, 2.9, this.m.roof);
    const clock = new THREE.Mesh(new THREE.CircleGeometry(0.82, 40), this.m.white); clock.position.set(x, 10.7, z + 0.85); this.scene.add(clock);
    this.box(x, 10.9, z + 0.89, 0.045, 0.46, 0.05, this.m.frame, -0.2);
    this.box(x + 0.21, 10.72, z + 0.9, 0.45, 0.045, 0.05, this.m.frame, -0.25);
    for (let i = 0; i < 12; i++) { const angle = i / 12 * Math.PI * 2; this.box(x + Math.sin(angle) * 0.69, 10.7 + Math.cos(angle) * 0.69, z + 0.89, 0.03, 0.07, 0.025, this.m.frame); }
  }

  makeGlassCourt() {
    // A transparent ground floor and horizontal metal fins from the STEM photos.
    this.path(24, -13, 16, 21);
    this.box(32.5, 0.05, -14, 11, 0.2, 24, this.m.pathAlt);
    this.box(37.5, 4.8, -14, 0.4, 9.6, 24, this.m.plaster);
    this.box(32.5, 4.8, -25.8, 10, 9.6, 0.4, this.m.plaster);
    this.box(32.5, 9.65, -14, 11, 0.25, 24, this.m.plaster);
    this.box(32.5, 4.7, -14, 10.7, 0.2, 24, this.m.path);
    this.box(27.05, 4.8, -14, 0.09, 9.5, 23.6, this.m.glass);
    for (let z = -25.5; z <= -2; z += 2.35) {
      this.box(26.95, 4.8, z, 0.16, 9.5, 0.12, this.m.frame);
      this.box(30.6, 2, z, 0.25, 4, 0.25, this.m.plaster);
    }
    for (const y of [0.2, 2.5, 4.7, 7, 9.5]) this.box(26.9, y, -14, 0.14, 0.12, 24, this.m.frame);
    for (let y = 4.9; y < 9.7; y += 0.36) this.box(26.55, y, -14, 0.48, 0.12, 24.4, this.m.metal);
    this.box(32.5, 2.3, -1.8, 10.5, 4.6, 0.06, this.m.glass);
    for (let x = 27; x < 38; x += 2) this.box(x, 2.4, -1.65, 0.12, 4.8, 0.12, this.m.frame);
    for (let y = 5; y < 9.7; y += 0.36) this.box(32.5, y, -1.6, 11.3, 0.12, 0.45, this.m.metal);
    for (const z of [-8, -17]) {
      this.box(32, 0.85, z, 2.6, 0.15, 1, this.m.woodLight);
      this.box(32, 0.42, z, 0.13, 0.84, 0.6, this.m.frame);
      for (const x of [30.8, 33.2]) { this.box(x, 0.5, z + 0.8, 0.6, 0.1, 0.6, this.m.green); this.box(x, 0.8, z + 1.07, 0.6, 0.6, 0.06, this.m.green); }
    }
    this.planter(20.8, -16, 2.4, 4.5, true); this.planter(24, -4.5, 3.8, 1.4);
    this.box(23.8, 0.4, -13, 2.5, 0.8, 0.9, this.m.stone);
    this.box(23.8, 0.84, -13, 2.6, 0.12, 1.1, this.m.woodLight);
    this.tree(22, -21, 0.72); this.tree(21.5, 1, 0.82);

  }

  makeBreezeway() {
    this.path(1, -28.8, 34, 4.3);
    this.box(1, 5.1, -30.4, 33, 0.4, 4.2, this.m.plaster);
    this.box(1, 7.85, -30.4, 34, 0.24, 4.5, this.m.roof);
    for (let x = -15; x <= 17; x += 8) {
      this.box(x, 2.5, -31.8, 0.4, 5, 0.4, this.m.frame);
      this.box(x, 6.5, -31.8, 0.14, 2.8, 0.14, this.m.frame);
      this.box(x, 6.5, -28.8, 0.14, 2.8, 0.14, this.m.frame);
    }
    this.box(1, 6.45, -28.65, 32.8, 2.5, 0.06, this.m.glass);
    for (let x = -15; x <= 17; x += 1.3) { this.box(x, 6.2, -28.6, 0.06, 2.1, 0.06, this.m.metal); this.box(x, 4.65, -30.4, 0.12, 0.3, 4, this.m.wood); }
    this.box(1, 7.5, -28.6, 33, 0.1, 0.12, this.m.frame);
    this.box(-1.5, 0.37, -29.5, 3.2, 0.74, 1.2, this.m.stone);
    this.planter(10.5, -31.8, 3.8, 1.3); this.planter(-10, -31.8, 4.5, 1.3);
  }

  makeGrove() {
    this.path(-17, -23.8, 12, 3.5);
    this.tree(-22, -17, 1.3); this.tree(-29, -24, 1.0); this.tree(-10, -19, 0.88);
    this.bench(-20.3, -22, 0, 3.5);
    this.building(-25, -37.5, 25, 9, 4.7);
    // Brick arch, kept open through its center.
    const arch = new THREE.Shape(); arch.moveTo(-2, 0); arch.lineTo(-2, 3); arch.absarc(0, 3, 2, Math.PI, 0, true); arch.lineTo(2, 0); arch.lineTo(1.55, 0); arch.lineTo(1.55, 3); arch.absarc(0, 3, 1.55, 0, Math.PI, false); arch.lineTo(-1.55, 0); arch.closePath();
    const archMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(arch, { depth: 0.55, bevelEnabled: false, curveSegments: 12 }), this.m.brick);
    archMesh.position.set(-31, 0, -14); archMesh.castShadow = true; archMesh.receiveShadow = true; this.scene.add(archMesh);
    this.box(-31, 5, -13.7, 5.7, 0.22, 2.5, this.m.roof);
    for (const z of [-17, -23]) this.planter(-33, z, 2.2, 2.2, true);
  }

  makeGatheringStones() {
    this.path(-23.5, 1, 5.6, 24);
    this.path(-28, -1, 10, 8);
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2, x = -28 + Math.cos(angle) * 4.5, z = 1 + Math.sin(angle) * 4;
      this.box(x, 0.27 + (i % 3) * 0.08, z, 1.65, 0.54 + (i % 3) * 0.16, 1.1, this.m.stone, angle * 0.23);
    }
    this.box(-25.1, 0.32, -1.5, 1.9, 0.64, 1.2, this.m.stoneLight);
    this.tree(-34, 6, 1.05); this.tree(-20, 5, 0.85); this.tree(-35, -8, 0.9);
    this.bench(-32, 9, 0.2); this.planter(-18.5, -2, 1.8, 3.5, true);
    this.building(-43, -5, 12, 22, 4.3);
  }

  makeAtrium() {
    this.path(-22.3, 22.8, 17, 23);
    this.box(-22.3, 0.1, 23.5, 17, 0.16, 23, this.m.stoneLight);
    this.box(-30.8, 4.6, 23.5, 0.08, 9.2, 23, this.m.glass);
    this.box(-13.8, 4.6, 25, 0.08, 9.2, 20, this.m.glass);
    this.box(-22.3, 4.6, 35, 17, 9.2, 0.1, this.m.glass);
    for (let z = 12; z <= 35; z += 2.3) {
      this.box(-30.6, 4.5, z, 0.28, 9, 0.28, this.m.woodLight);
      this.box(-14, 4.5, z, 0.28, 9, 0.28, this.m.woodLight);
      this.box(-22.3, 9.1, z, 17, 0.42, 0.25, this.m.wood);
      this.box(-22.3, 9.45, z, 17, 0.08, 2.1, this.m.glass);
    }
    this.box(-30.6, 0.6, 23.5, 0.3, 1.2, 23, this.m.plaster);
    this.box(-14, 0.6, 26, 0.3, 1.2, 18, this.m.plaster);
    for (let x = -30; x <= -14; x += 2.5) this.box(x, 4.6, 34.8, 0.15, 9.2, 0.15, this.m.woodLight);
    // Broad timber stairs and an upper gallery, all visible through the glazing.
    for (let i = 0; i < 12; i++) this.box(-26, (i + 1) * 0.135, 25 + i * 0.48, 5.6, (i + 1) * 0.27, 0.49, this.m.woodLight);
    this.box(-22.3, 3.25, 32.5, 16.4, 0.24, 4.8, this.m.wood);
    this.box(-18, 3.25, 25.5, 7.5, 0.24, 10, this.m.woodLight);
    this.box(-18, 3.9, 20.6, 7.6, 1.2, 0.06, this.m.glass);
    this.box(-18, 4.5, 20.5, 7.6, 0.08, 0.08, this.m.frame);
    for (let i = 0; i < 9; i++) this.box(-21.7 + i * 0.9, 3.85, 20.5, 0.045, 1.3, 0.045, this.m.frame);
    this.box(-23.5, 0.4, 22, 2.5, 0.8, 1.1, this.m.woodLight);
    for (const z of [17, 22, 27]) {
      this.column(-16.3, 0.8, z, 0.7, 0.1, this.m.white); this.column(-16.3, 0.4, z, 0.06, 0.8, this.m.frame);
      for (const x of [-17.2, -15.3]) this.box(x, 0.5, z, 0.5, 0.1, 0.5, this.m.green);
      this.column(-22, 8.1, z, 0.045, 1.5, this.m.frame); this.column(-22, 7.3, z, 0.28, 0.25, this.m.frame);
    }
    this.planter(-28.8, 16, 2.1, 2.1); this.planter(-28.8, 32.3, 2.1, 2.1);
  }

  makeFinalCourt() {
    this.path(2, 30.5, 17, 13);
    this.path(-10.5, 20.5, 4.5, 11);
    for (const x of [-5.5, 9.5]) this.planter(x, 34.5, 2.5, 6, true);
    for (const z of [27.2, 35.5]) { this.tree(-8, z, 0.7); this.tree(12, z, 0.75); }
    this.bench(-1, 35.3, 0, 2.7);
    this.box(2, 0.5, 34, 1.5, 1, 1, this.m.stone);
    this.box(2, 1.05, 34, 1.7, 0.12, 1.2, this.m.stoneLight);
    // Slim pergola, open to the light and aligned behind the yearbook.
    for (const x of [-4, 8]) for (const z of [33.5, 38.5]) this.box(x, 2.65, z, 0.18, 5.3, 0.18, this.m.wood);
    for (let x = -4.5; x <= 8.5; x += 0.65) this.box(x, 5.35, 36, 0.12, 0.25, 6.2, this.m.woodLight);
    this.box(2, 5.13, 33.5, 13, 0.3, 0.18, this.m.wood);
    this.box(2, 5.13, 38.5, 13, 0.3, 0.18, this.m.wood);
    this.box(0.1, 0.35, 33, 1.2, 0.7, 0.8, this.m.stone);
    this.building(4, 47, 32, 9, 4.5);
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
    for (const building of footprints) {
      if (building.field || ['STEM + Innovation Center','MPAC'].includes(building.name)) continue;
      const x=(building.minX+building.maxX)/2,z=(building.minZ+building.maxZ)/2;
      const w=building.maxX-building.minX,d=building.maxZ-building.minZ;
      this.placeModel(()=>this.building(0,0,w,d,building.name.includes('Athletic')?7:4.7),[0,0,0],[x,0,z],Math.PI);
      if(building.name.includes('Upper School')) for(let wz=building.minZ+1;wz<building.maxZ-.5;wz+=1.8){
        this.box(building.minX-.04,2,wz,.1,2.5,1.3,this.m.frame);
        this.box(building.minX-.1,2,wz,.035,2.25,1.12,this.m.glassDark);
        this.box(building.minX-.13,2,wz,.04,.055,1.12,this.m.metal);
      }
    }
    this.placeModel(()=>this.makeGlassCourt(),[32.5,0,-14],[-14,0,-25],Math.PI/2,[.9,1,.85]);
    this.placeModel(()=>this.makeAtrium(),[-22.3,0,23.5],[67,0,-7],Math.PI/2,[.65,1,.8]);
    this.placeModel(()=>this.makeAmphitheater(),[0,0,6.2],[7,0,-8.1],Math.PI,[.44,.7,.44]);
    this.clockTower(-3.6,-8.4);
    // The field remains west of its east-edge path, south of the gyms.
    const field=footprints.find(item=>item.field);
    const cx=(field.minX+field.maxX)/2,cz=(field.minZ+field.maxZ)/2;
    this.box(cx,0,cz,field.maxX-field.minX,.04,field.maxZ-field.minZ,this.m.lawn);
    for(let z=field.minZ+1;z<field.maxZ;z+=3.5)this.box(cx,.03,z,field.maxX-field.minX-.6,.025,.06,this.m.white);
    for(const z of [field.minZ+1,field.maxZ-1]) {this.column(cx-2,2,z,.055,4,this.m.white);this.column(cx+2,2,z,.055,4,this.m.white);this.box(cx,4,z,4.1,.09,.09,this.m.white);}
    // Continuous paths follow the black annotation; no parking arrows are used.
    let previous=introShot.position;
    for(const stop of route) for(const point of [...stop.via,stop.position]) {
      const dx=point[0]-previous[0],dz=point[2]-previous[2],length=Math.hypot(dx,dz);
      this.box((point[0]+previous[0])/2,.025,(point[2]+previous[2])/2,2.7,.07,length+.2,this.m.path,Math.atan2(dx,dz));
      previous=point;
    }
    for(const stop of route){const [x,,z]=stop.marker;this.box(x,.4,z,1.5,.8,.95,this.m.stone);this.box(x,.83,z,1.65,.08,1.08,this.m.stoneLight);}
    for(const [x,z,size] of [[-18,33,.8],[-30,24,.9],[-18,14,.8],[-32,-14,.85],[-9,-38,.8],[1,-2,.9],[12,-2,.9],[19,-19,.8],[22,-26,.8],[47,-22,.85],[49,-2,.9],[62,6,.85],[80,-13,1],[-39,39,.9]])this.tree(x,z,size);
    for(const [x,z] of [[-18,26],[10,-3],[46,-23],[51,-5]])this.planter(x,z,2.3,1.5,true);
    this.bench(11,-4);this.bench(45,-24);
    // Curated reveal still uses the same yearbook; it can now happen at any stop.
    for(let i=0;i<35;i++){const a=i/35*Math.PI*2;this.instance(this.leafGeometry,i%2?this.m.leafDark:this.m.leaf,[12+Math.cos(a)*92,5,12+Math.sin(a)*92],[6,5,6]);}
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
    const stop=route[index];return this.move(stop.position,stop.look,stop.via,stop.duration);
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
