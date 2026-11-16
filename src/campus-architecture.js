import * as THREE from '/vendor/three.module.js';
import { route, introShot } from './route.js';
import { footprints, mapPoint as p, MAP_SCALE, landmarks } from './campus-layout.js';

// Source-specific architecture, reviewed against clips 01–09. All dimensions
// are visual estimates; map rectangles and route topology remain authoritative.
export const campusSpaces = {
  athleticWalk: { rect:[775,633,793,822], clearWidth:3.5, ceiling:3.15 },
  vsiCourt: { facadeSeparation:30*MAP_SCALE, clearWalkingWidth:3.0 },
  upperCourt: { depth:36*MAP_SCALE },
  mpacForecourt: { overhangDepth:30*MAP_SCALE, soffit:4.2 }
};

export const campusArchitecture = {
  makeArchitectureMaterials() {
    const masonry=(base,mortar,rows,columns,offset=true)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
      const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,512,512);
      for(let row=0;row<rows;row++){
        const y=row*512/rows;ctx.fillStyle=mortar;ctx.fillRect(0,y,512,1.8);
        for(let col=-1;col<=columns;col++){
          const x=(col+(offset&&row%2?.5:0))*512/columns;
          ctx.fillRect(x,y,1.4,512/rows);
          ctx.fillStyle=`rgba(255,255,235,${this.random()*.045})`;
          ctx.fillRect(x+2,y+2,512/columns-4,512/rows-4);ctx.fillStyle=mortar;
        }
      }
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
      texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return texture;
    };
    Object.assign(this.m,{
      campusBrick:this.material('#d9cfb8',{map:masonry('#ded6bf','#a99e8950',20,7)}),
      schoolBrick:this.material('#b9a187',{map:masonry('#c8ae93','#82796a65',20,7)}),
      limestone:this.material('#e3d8bb',{map:masonry('#e9dfc4','#b1a68e45',5,4,false)}),
      pavilionStone:this.material('#e1dac3',{map:masonry('#e8e2ce','#b8af9838',5,3,false)}),
      silver:this.material('#bac1b9',{metalness:.48,roughness:.44}),
      darkSteel:this.material('#53605a',{metalness:.38,roughness:.48}),
      windowBack:this.material('#526c65',{roughness:.42,metalness:.16}),
      soffit:this.material('#ded0ae'),
      pavingBrick:this.material('#ad8773',{map:masonry('#bd9981','#75695375',16,18)}),
      pierBrick:this.material('#b69a7f',{map:masonry('#c3a88b','#84756560',20,7)}),
      pebbles:this.material('#e8e5d7')
    });
    this.facadeGeometries=new Map();
  },

  // A facade plane has masonry courses in world proportions instead of stretching
  // a fixed repeat count across every differently sized building.
  facade(width,height,x,y,z,material,heading=0) {
    const key=`${width.toFixed(3)}:${height.toFixed(3)}`;
    if(!this.facadeGeometries.has(key)){
      const geometry=new THREE.PlaneGeometry(width,height),uv=geometry.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*width/4,uv.getY(i)*height/2);
      this.facadeGeometries.set(key,geometry);
    }
    this.instance(this.facadeGeometries.get(key),material,[x,y,z],[1,1,1],[0,heading,0]);
  },

  masonryBlock(rect,bottom,height,material) {
    const [a,b,c,d]=rect,[x,,z]=p((a+c)/2,(b+d)/2,0),w=(c-a)*MAP_SCALE,depth=(d-b)*MAP_SCALE;
    this.box(x,bottom+height/2,z,w,height,depth,material);
    for(const [fx,fz,span,angle]of [[x,z+depth/2+.008,w,0],[x,z-depth/2-.008,w,Math.PI],[x+w/2+.008,z,depth,Math.PI/2],[x-w/2-.008,z,depth,-Math.PI/2]])
      this.facade(span,height,fx,bottom+height/2,fz,material,angle);
  },

  // Local +Z faces out. A backing and a separate glass layer preserve the
  // dark recess, thin silver frames, transoms, sills and door-scale proportions.
  windowBay(x,z,width,height,heading=0,sill=.36,doors=false) {
    const m=this.m;
    this.placeModel(()=>{
      this.box(0,sill+height/2,-.04,width,height,.07,m.windowBack);
      this.box(0,sill+height/2,.01,width-.07,height-.07,.025,m.glass);
      for(const dx of [-width/2,width/2])this.box(dx,sill+height/2,.045,.055,height+.08,.075,m.silver);
      for(const y of [sill,sill+height])this.box(0,y,.045,width+.08,.055,.075,m.silver);
      const panes=Math.max(2,Math.round(width/.85));
      for(let i=1;i<panes;i++)this.box(-width/2+i*width/panes,sill+height/2,.06,.04,height,.07,m.silver);
      const transom=sill+height-.48;
      this.box(0,transom,.06,width,.045,.07,m.silver);
      if(doors)for(const dx of [-.13,.13])this.box(dx,1.05,.14,.025,.36,.035,m.silver);
      else this.box(0,sill-.05,.06,width+.13,.09,.19,m.stoneLight);
      // Restrained reflections; no flat green stripe standing in for a window.
      this.box(-width*.24,sill+height*.54,.037,width*.035,height*.76,.006,m.glass);
    },[0,0,0],[x,0,z],heading);
  },

  pitchedRoof(x,z,width,depth,eave,rise=.65) {
    const w=width/2,shape=new THREE.Shape();shape.moveTo(-w,0);shape.lineTo(0,rise);shape.lineTo(w,0);shape.closePath();
    const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),this.m.roof);
    roof.position.set(x,eave,z-depth/2);roof.castShadow=true;roof.receiveShadow=true;this.scene.add(roof);
    for(const side of [-1,1])this.box(x+side*w,eave-.04,z,.12,.16,depth+.12,this.m.silver);
    for(const dz of [-depth/2,depth/2])for(const side of [-1,1])
      this.beam([x+side*w,eave,z+dz],[x,eave+rise,z+dz],.055,this.m.silver);
    for(let dz=-depth/2;dz<=depth/2;dz+=.8)for(const side of [-1,1])
      this.beam([x+side*w,eave+.02,z+dz],[x,eave+rise+.02,z+dz],.012,this.m.metal);
  },

  building(x,z,width,depth,height=3.55,profile='school') {
    const m=this.m,wall=profile==='pavilion'?m.pavilionStone:m.schoolBrick;
    const rect=[(x-width/2)/MAP_SCALE+1000,(z-depth/2)/MAP_SCALE+700,(x+width/2)/MAP_SCALE+1000,(z+depth/2)/MAP_SCALE+700];
    this.masonryBlock(rect,0,height,wall);
    this.box(x,.14,z,width+.08,.28,depth+.08,m.stoneLight);
    // Low pavilions have actual gable ends and wide eaves in 01:34 / 04:32.
    this.pitchedRoof(x,z,width+.9,depth+1.0,height+.08,profile==='pavilion'?.8:.42);
    for(const side of [-1,1]){
      for(let dx=-width/2+1.85;dx<width/2-1.1;dx+=3.2)
        this.windowBay(x+dx,z+side*(depth/2+.035),2.65,2.12,side===1?0:Math.PI,.45);
      for(let dz=-depth/2+2;dz<depth/2-1.3;dz+=3.5)
        this.windowBay(x+side*(width/2+.035),z+dz,2.75,2.1,side===1?Math.PI/2:-Math.PI/2,.45);
    }
  },

  schoolPavilion(rect,height=3.3,variant=0) {
    const m=this.m,[a,b,c,d]=rect,x=p((a+c)/2,0,0)[0],z=p(0,(b+d)/2,0)[2],w=(c-a)*MAP_SCALE,depth=(d-b)*MAP_SCALE;
    this.masonryBlock(rect,0,height,m.schoolBrick);
    this.box(x,.1,z,w+.08,.2,depth+.08,m.stoneLight);
    // Broad, shallow roof planes and predominantly masonry elevations (06–08).
    this.pitchedRoof(x,z,w+1.45,depth+1.5,height+.12,.24);
    for(const side of [-1,1]){
      const face=z+side*(depth/2+.04),heading=side===1?0:Math.PI;
      let bay=0;
      for(let dx=-w/2+2;dx<w/2-1.3;dx+=4.8,bay++){
        const entry=(bay+variant)%4===1;
        this.windowBay(x+dx,face,entry?1.65:2.7,entry?2.65:.62,heading,entry?.04:1.7,entry);
        if(entry){
          this.box(x+dx,height-.12,face+side*.5,3.4,.18,1.2,m.roof);
          for(const sign of [-1,1]){
            // Masonry shoulders taper inward above the recessed entry.
            this.beam([x+dx+sign*1.55,0,face+side*.52],[x+dx+sign*1.24,height-.2,face+side*.52],.13,m.schoolBrick);
          }
        }
      }
      for(let dz=-depth/2+2;dz<depth/2-1;dz+=4.6)
        this.windowBay(x+side*(w/2+.04),z+dz,1.7,1.35,side===1?Math.PI/2:-Math.PI/2,.85);
    }
  },

  coveredWalk(rect,height=3.15,axis='z',timber=true,pitched=false) {
    const [a,b,c,d]=rect,m=this.m,[x,,z]=p((a+c)/2,(b+d)/2,0),w=(c-a)*MAP_SCALE,depth=(d-b)*MAP_SCALE;
    const athletic=a===775,rafter=athletic?m.wood:m.darkSteel;
    (this.roofZones??=[]).push({rect,height});
    this.mapBox(rect,0,.08,m.path);
    if(pitched)this.pitchedRoof(x,z,w+.35,depth+.3,height,.6);
    else{
      this.mapBox([a-1,b-1,c+1,d+1],height+.06,.13,m.roof);
      this.mapBox(rect,height-.035,.06,timber?m.soffit:m.plaster);
      this.box(x,height+.06,z-depth/2-.12,w+.35,.16,.12,m.silver);
      this.box(x,height+.06,z+depth/2+.12,w+.35,.16,.12,m.silver);
    }
    const length=axis==='z'?depth:w,count=Math.max(1,Math.round(length/4.5)),spacing=length/count;
    for(let i=0;i<=count;i++){
      const along=-length/2+i*spacing;
      for(const side of [-1,1]){
        const px=axis==='z'?x+side*(w/2-.22):x+along;
        const pz=axis==='z'?z+along:z+side*(depth/2-.22);
        // Open the athletic doorway instead of placing a post in its sightline.
        const my=pz/MAP_SCALE+700;
        if(a===775&&my>766&&my<790)continue;
        // Clip 08's covered court exit is an open bay, not a central pier.
        if(a===1327&&my>498&&my<509)continue;
        if(a===1148&&my>605&&my<620)continue;
        this.box(px,height/2,pz,.38,height,.42,athletic?m.pierBrick:m.schoolBrick);
        // Distinctly fine masonry on the outward post face.
        this.facade(.38,height,px,height/2,pz+.216,athletic?m.pierBrick:m.schoolBrick);
        if(athletic){
          this.box(px,1.48,pz+.235,.15,.24,.065,m.darkSteel);
          this.box(px,1.48,pz+.272,.11,.17,.018,m.white);
        }
        if(axis==='z')this.beam([px,height-.12,pz],[px-side*.45,height-.4,pz],.035,m.darkSteel);
      }
      if(axis==='z'){
        this.box(x,height-.16,z+along,w,.22,.18,rafter);
        this.box(x,.048,z+along,w,.012,.28,m.pavingBrick);
        this.column(x,height-.12,z+along-.35,.075,.08,m.white);
      }else this.box(x+along,height-.16,z,.12,.16,depth,rafter);
    }
    // Longitudinal rafters under white roof infill, seen clearly in clips 01–03.
    if(axis==='z')for(let dx=-w/2+.35;dx<w/2;dx+=.65)this.box(x+dx,height-.13,z,.065,.12,depth,rafter);
    else for(let dz=-depth/2+.35;dz<depth/2;dz+=.65)this.box(x,height-.13,z+dz,w,.12,.065,rafter);
  },

  sign(text,x,y,z,width,height,heading=0,bg=null,font='32px Georgia') {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
    const ctx=canvas.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,1024,128);}
    ctx.fillStyle='#f5f0dc';ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,64,990);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map,transparent:true,roughness:.85});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.position.set(x,y,z);mesh.rotation.y=heading;this.scene.add(mesh);
  },

  makePhillipsGym() {
    const m=this.m,gym=footprints.find(item=>item.name==='Phillips Family Gymnasium'),[a,b,c,d]=gym.rect;
    this.masonryBlock(gym.rect,0,7.4,m.campusBrick);
    const x=(gym.minX+gym.maxX)/2,z=(gym.minZ+gym.maxZ)/2,w=gym.maxX-gym.minX,depth=gym.maxZ-gym.minZ,east=gym.maxX;
    // Shallow curved metal roof and the taller athletic facade beyond it.
    const shape=new THREE.Shape();shape.moveTo(-w/2-.2,0);
    for(let i=0;i<=48;i++){const t=i/48;shape.lineTo((t-.5)*(w+.4),1.25*Math.sin(t*Math.PI));}
    shape.lineTo(w/2+.2,0);shape.closePath();
    const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:depth+.5,bevelEnabled:false}),m.metal);roof.position.set(x,7.42,gym.minZ-.25);roof.castShadow=true;this.scene.add(roof);
    // East-side pale base, metal louvres and high strip glazing (01:20–44).
    this.mapBox([774.5,b,775.1,d],.58,1.16,m.stoneLight);
    for(let my=b+9;my<d-4;my+=18){
      const wz=p(0,my,0)[2];this.windowBay(east+.025,wz,3.5,1.55,Math.PI/2,4.65);
      for(let y=.4;y<1.05;y+=.13)this.box(east+.09,y,wz,.08,.045,3.5,m.silver);
    }
    const entry=p(775,777,0);
    this.windowBay(east+.11,entry[2],5.0,2.8,Math.PI/2,.03,true);
    this.sign('GREENHILL HORNETS',east+.23,2.57,entry[2],4.85,.33,Math.PI/2,'#28563e','bold 57px Georgia');
    this.sign('G',east+.18,1.35,entry[2]+3.1,1.1,1.6,Math.PI/2,'#28563e','bold 118px Georgia');
    this.mapBox([775,763,803,790],4.0,.11,m.glass);
    for(const mx of [778,801])for(const my of [765,788]){
      const pt=p(mx,my,0);this.box(pt[0],1.95,pt[2],.4,3.9,.4,m.stoneLight);
      this.beam([pt[0],3.85,pt[2]],[pt[0]-.75,4.45,pt[2]],.045,m.silver);
      this.beam([pt[0],3.85,pt[2]],[pt[0]+.6,4.25,pt[2]],.045,m.silver);
    }
    for(let my=764;my<791;my+=7)this.mapBox([775,my,804,my+.35],4.07,.09,m.silver);
    this.coveredWalk(campusSpaces.athleticWalk.rect,3.15,'z',true);
    this.coveredWalk([775,585,793,633],3.15,'z',true,true);
    // Low planting border outside the arcade; keep its centre free for people.
    this.mapBox([794,645,802,754],-.01,.035,m.soil);
  },

  makeVSI() {
    const m=this.m,main=[794,422,960,545];
    this.masonryBlock(main,4.05,4.25,m.plaster);
    this.masonryBlock([794,422,960,532],0,4.0,m.plaster);
    this.masonryBlock([794,570,819,632],0,8.3,m.plaster);
    this.masonryBlock([794,545,832,570],4.05,4.25,m.plaster);
    // Smooth, continuous timber soffit with fine planks and inset linear lights.
    this.mapBox([789,545,835,570],.015,.07,m.path);
    this.mapBox([789,545,835,570],3.86,.12,m.soffit);
    const support=p(833,568,0);this.box(support[0],1.91,support[2],.24,3.82,.24,m.plaster);
    for(let my=546;my<570;my+=.8)this.mapBox([789,my,835,my+.055],3.793,.006,m.woodLight);
    for(const mx of [800,818])this.mapBox([mx,550,mx+.28,563],3.788,.008,m.white);
    const z=p(0,545,0)[2],start=p(833,0,0)[0],end=p(960,0,0)[0];
    for(let wx=start;wx<end-.3;wx+=1.7){
      const width=Math.min(1.67,end-wx);
      this.box(wx+width/2,1.9,z+.025,width,3.8,.025,m.glass);
      this.box(wx,1.9,z+.08,.065,3.8,.14,m.darkSteel);
      this.box(wx+width/2,1.2,z+.09,width,.045,.12,m.silver);
      this.box(wx+width/2,2.8,z+.07,width,.045,.08,m.silver);
    }
    this.box((start+end)/2,.12,z+.05,end-start,.18,.12,m.silver);
    // Close the curtain-wall room at its return and rear wall. Separate exposed
    // backing panels used to look like freestanding green cards from the passage.
    this.box((start+end)/2,1.9,z-3.10,end-start,3.8,.05,m.windowBack);
    this.box((start+end)/2,.04,z-1.55,end-start,.08,3.15,m.stoneLight);
    this.box(start,1.9,z-1.55,.025,3.8,3.15,m.glass);
    for(const dz of [0,-1.55,-3.1])this.box(start-.04,1.9,z+dz,.07,3.8,.06,m.silver);
    for(const mx of [854,891,927]){const q=p(mx,541,0);this.box(q[0],.76,q[2],1.5,.10,.7,m.woodLight);for(const dx of [-.55,.55])this.box(q[0]+dx,.37,q[2],.06,.74,.5,m.frame);}

    // Upper horizontal brise-soleil is a fine, shallow silver band, not a giant grille.
    for(let y=3.98;y<5.5;y+=.17)this.mapBox([831,545,962,548.4],y,.065,m.silver);
    for(let mx=839;mx<958;mx+=17){
      const wx=p(mx,0,0)[0];this.windowBay(wx,p(0,545.2,0)[2],1.6,2.15,0,5.65);
      this.box(wx+.94,6.8,z+.25,.14,2.55,.55,m.plaster);
    }
    for(let mx=835;mx<960;mx+=17){const q=p(mx,548,0);this.beam([q[0],3.78,z+.08],[q[0],4.35,q[2]],.035,m.darkSteel);}
    // West return: projecting vertical screens around stacked punched windows.
    for(let my=580;my<625;my+=19)for(const sill of [.75,4.9]){
      const pt=p(793.8,my,0);this.windowBay(pt[0],pt[2],1.6,2.2,-Math.PI/2,sill);
      for(let dz=-.75;dz<=-.2;dz+=.12)this.box(pt[0]-.24,sill+1.1,pt[2]+dz,.48,2.3,.035,m.silver);
    }
    // Upper west fins project from the wall at the long passage approach (04:25).
    const west=p(793.8,0,0)[0];
    for(let my=434;my<541;my+=16){const wz=p(0,my,0)[2];this.box(west-.3,6.65,wz,.6,2.8,.17,m.plaster);}
    for(let my=493;my<545;my+=7){const pt=p(793.8,my,0);this.windowBay(pt[0],pt[2],1.62,3.7,-Math.PI/2,.1);}
    // The filmed paved court continues to the dining-side entrance; it does not
    // stop at the end of the VSI facade and become an intervening grass strip.
    this.mapBox([831,547,999,575],-.015,.07,m.path);
    this.mapBox([834,545.6,940,548.2],.015,.04,m.soil);
    for(const [mx,my]of [[857,570],[889,570],[924,570]])this.picnicTable(mx,my);
    for(const mx of [847,919]){const pt=p(mx,572,0);this.tree(pt[0],pt[2],.52);}
    for(const rect of [[797,545,824,547],[797,566,824,568]])this.masonryBlock(rect,0,.48,m.limestone);
    this.mapBox([654,480,780,582],-.04,.04,m.pathAlt);
    for(let my=486;my<580;my+=12)this.mapBox([744,my,778,my+.3],.005,.015,m.white);
  },

  makeMPAC() {
    const m=this.m,west=p(1478,0,0)[0],north=p(0,580,0)[2],south=p(0,700,0)[2],width=(1630-1478)*MAP_SCALE;
    // The leading stone edge ramps up to the cantilever. A solid rectangular
    // upper box missed this defining silhouette in 09:18–38.
    const profile=new THREE.Shape();
    profile.moveTo(0,.35);profile.lineTo((600-580)*MAP_SCALE,4.2);profile.lineTo(south-north,4.2);
    profile.lineTo(south-north,10.5);profile.lineTo(0,10.5);profile.closePath();
    const geometry=new THREE.ExtrudeGeometry(profile,{depth:width,bevelEnabled:false});
    // Local shape X runs south; extrusion runs east.
    const position=geometry.attributes.position;
    for(let i=0;i<position.count;i++){const sx=position.getX(i),sy=position.getY(i),sz=position.getZ(i);position.setXYZ(i,west+sz,sy,north+sx);}
    for(let i=0;i<position.count;i+=3){
      const a=new THREE.Vector3().fromBufferAttribute(position,i+1),b=new THREE.Vector3().fromBufferAttribute(position,i+2);
      position.setXYZ(i+1,b.x,b.y,b.z);position.setXYZ(i+2,a.x,a.y,a.z);
    }
    geometry.computeVertexNormals();
    const volume=new THREE.Mesh(geometry,m.limestone);volume.castShadow=true;volume.receiveShadow=true;this.scene.add(volume);
    // Horizontal limestone courses and staggered panel seams on the western face.
    for(let y=4.3;y<10.5;y+=.48)this.box(west-.012,y,(north+south)/2,.014,.012,south-north,m.stone);
    for(let my=584;my<700;my+=13)for(let y=4.55;y<10.4;y+=.96){
      const wz=p(0,my+(Math.round(y*10)%2?6:0),0)[2];this.box(west-.02,y,wz,.014,.44,.012,m.stone);
    }
    this.mapBox([1477,579,1631,701],10.54,.12,m.stoneLight);
    this.masonryBlock([1533,582,1630,700],0,4.2,m.plaster);
    this.mapBox([1475,588,1533,700],-.015,.08,m.path);
    // Recessed glass lobby wraps the northwest corner and has real door bays.
    const glassX=p(1508,0,0)[0];
    for(let my=591;my<700;my+=7){
      const pt=p(1508,my,0);this.windowBay(pt[0],pt[2],1.62,4.06,-Math.PI/2,.035,my===619||my===626);
    }
    for(let mx=1511;mx<1533;mx+=7){const pt=p(mx,590,0);this.windowBay(pt[0],pt[2],1.62,4.06,Math.PI,.035);}
    for(const my of [605,647,688]){const pt=p(1499,my,0);this.column(pt[0],2.1,pt[2],.115,4.2,m.darkSteel);}
    for(let my=596;my<=628;my+=6){const pt=p(1477.8,my,0);this.windowBay(pt[0],pt[2],1.32,2.6,-Math.PI/2,6.5);}
    // Deep reveals flank the upper window group, rather than green windows glued on stone.
    for(const my of [593,633])this.mapBox([1476.3,my,1478,my+1],7.8,3.0,m.limestone);
    this.sign('MARSHALL FAMILY PERFORMING ARTS CENTER',west-.03,4.43,p(0,645,0)[2],14,.32,-Math.PI/2,null,'36px sans-serif');
    for(const mx of [1487,1496])for(let my=612;my<697;my+=17){const pt=p(mx,my,0);this.box(pt[0],4.185,pt[2],.065,.012,.065,m.white);}

    this.masonryBlock([1497,624,1505,644],0,.38,m.limestone);
    for(let i=0;i<34;i++){
      const pt=p(1498+this.random()*6,625+this.random()*18,0);
      this.instance(this.rockGeometry,m.pebbles,[pt[0],.43,pt[2]],[.10+this.random()*.07,.06,.12],[0,this.random()*3,0]);
    }
    this.mapBox([1350,478,1465,550],-.06,.035,m.pathAlt);
    for(let x=1357;x<1465;x+=12)this.mapBox([x,480,x+.3,512],-.025,.012,m.white);
  },

  makeAcademicCourts() {
    const m=this.m;
    this.coveredWalk([1148,573,1177,650],3.2,'z');
    this.coveredWalk([1180,558,1244,575],3.2,'x');
    this.coveredWalk([1238,476,1345,488],3.2,'x',true);
    this.coveredWalk([1327,486,1344,518],3.2,'z',true);
    // Brick court has real openings for the shade trees, not trunks through pavers.
    const wells=[[1255,504]],vertices=[],uvs=[];
    const [ca,cb,cc,cd]=landmarks.upperCourt;
    for(let mx=ca;mx<cc;mx+=3)for(let my=cb;my<cd;my+=3){
      if(wells.some(([x,y])=>Math.abs(mx+1.5-x)<5&&Math.abs(my+1.5-y)<5))continue;
      const a=p(mx,my,.043),b=p(Math.min(cc,mx+3),Math.min(cd,my+3),.043);
      for(const [x,z]of [[a[0],a[2]],[a[0],b[2]],[b[0],a[2]],[b[0],a[2]],[a[0],b[2]],[b[0],b[2]]]){vertices.push(x,.043,z);uvs.push(x/4,z/2);}
    }
    const paving=new THREE.BufferGeometry();paving.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));paving.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));paving.computeVertexNormals();
    const court=new THREE.Mesh(paving,m.pavingBrick);court.receiveShadow=true;this.scene.add(court);
    for(const [mx,my]of wells){
      this.mapBox([mx-4,my-4,mx+4,my+4],.022,.03,m.mulch);
      const pt=p(mx,my,0);this.tree(pt[0],pt[2],1.1);
    }
    for(const [mx,my]of [[1266,508],[1311,508]])this.picnicTable(mx,my);
    for(const [mx,my]of [[953,568],[983,580],[1023,594],[1087,593],[1195,541],[1218,530],[1372,559],[1417,542]]){const pt=p(mx,my,0);this.tree(pt[0],pt[2],.8);}
    this.picnicTable(955,574,true);this.picnicTable(1037,600);
    for(const [mx,my]of [[1033,646],[1068,615],[1114,644]]){const pt=p(mx,my,0);this.box(pt[0],.2,pt[2],.8,.4,.6,m.stoneLight);}
  },

  makeCampus() {
    this.makeArchitectureMaterials();
    this.box(25,-.18,20,440,.25,440,this.m.grass);
    for(const building of footprints){
      if(building.field||building.custom)continue;
      const x=(building.minX+building.maxX)/2,z=(building.minZ+building.maxZ)/2,w=building.maxX-building.minX,depth=building.maxZ-building.minZ;
      if(building.name==='Phillips Family Athletic Center'){
        this.masonryBlock(building.rect,0,7.4,this.m.campusBrick);
        this.mapBox([774.5,638,775.1,762],.58,1.16,this.m.stoneLight);
        const east=building.maxX;
        for(let my=645;my<757;my+=14){const wz=p(0,my,0)[2];this.windowBay(east+.025,wz,2.85,2.65,Math.PI/2,4.45);}
        this.windowBay(east+.025,p(0,754,0)[2],2.2,2.6,Math.PI/2,.03,true);
        this.box(x,7.48,z,w+.4,.16,depth+.4,this.m.metal);
      }else if(building.name==='Crossman Dining Hall'){
        this.masonryBlock(building.rect,0,6.1,this.m.campusBrick);
        this.box(x,6.15,z,w+.3,.15,depth+.3,this.m.roof);
        this.windowBay(building.minX-.03,building.maxZ-1.9,2.65,2.4,-Math.PI/2,.05,true);
      }else if(/Fulton|Korenvaes/.test(building.name)){
        this.schoolPavilion(building.rect,3.3,building.name==='Korenvaes Upper School'?1:0);
      }else{
        const pavilion=building.name.startsWith('Rotunda');
        this.building(x,z,w,depth,pavilion?3.15:building.height||3.55,pavilion?'pavilion':'school');
      }
    }
    this.makeAthleticApproach();this.makeVSI();this.makeMPAC();this.makeAcademicCourts();
    this.placeModel(()=>this.clockTower(0,0),[0,0,0],landmarks.clocktower,0,[1,.85,1]);
    let previous=introShot.position;
    for(const [index,stop]of route.entries()){
      if(index>0)this.walkCurve([previous,...stop.via,stop.position],index===1?2.5:stop.surface==='flagstone'?2.2:3.0,stop.surface==='flagstone');
      previous=stop.position;
    }
    for(const stop of route){const [x,,z]=stop.marker;this.box(x,.4,z,1.05,.8,.7,this.m.stone);this.box(x,.83,z,1.15,.08,.8,this.m.stoneLight);}

  }
};
