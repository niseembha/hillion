// Read-only WebGL geometry checks on the actual smoothed journeys.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);
 await page.waitForFunction(()=>window.__campus);
 const result=await page.evaluate(async()=>{
   const T=await import('/vendor/three.module.js'),{route,introShot}=await import('/src/route.js'),{mapPoint:p}=await import('/src/campus-layout.js');
   const w=window.__campus;w.calm=true;w.scene.updateMatrixWorld(true);
   const cast=(a,b)=>{const direction=new T.Vector3().subVectors(b,a),distance=direction.length();return new T.Raycaster(a,direction.normalize(),.001,distance).intersectObjects(w.scene.children,true).filter(h=>h.object.isMesh&&h.object!==w.sky&&!h.object.material.transparent);};
   const collisions=[];let previous=introShot.position;
   for(const [index,stop]of route.entries()){
     const curve=new T.CatmullRomCurve3([previous,...stop.via,stop.position].map(a=>new T.Vector3(...a)),false,'centripetal');
     for(let i=0;i<300;i++){
       const a=curve.getPointAt(i/300),b=curve.getPointAt((i+1)/300);
       for(const offset of [-.65,0,.65])for(const height of [.4,1.72]){
         const tangent=b.clone().sub(a).normalize(),side=new T.Vector3(-tangent.z,0,tangent.x).multiplyScalar(offset);
         const start=a.clone().add(side),end=b.clone().add(side);start.y=end.y=height;
         const hits=cast(start,end);
         if(hits.length)collisions.push({segment:index+1,sample:i,offset,height,point:hits[0].point.toArray(),material:hits[0].object.material.color?.getHexString()});
       }
     }
     previous=stop.position;
   }
   const walkwayClear=cast(new T.Vector3(...p(783,737)),new T.Vector3(...p(783,641))).length===0;
   const vsiPassageClear=cast(new T.Vector3(...p(789,553)),new T.Vector3(...p(840,553))).length===0;
   const lobbyClear=cast(new T.Vector3(...p(1492,606)),new T.Vector3(...p(1506,606))).length===0;
   // The default front-face raycast also proves the pavement points upward.
   const quad=route[4],quadPath=new T.CatmullRomCurve3([route[3].position,...quad.via,quad.position].map(a=>new T.Vector3(...a)),false,'centripetal');
   const footing=quadPath.getPointAt(.6);footing.y=2;
   const down=new T.Raycaster(footing,new T.Vector3(0,-1,0),0,3);
   const pavement=down.intersectObjects(w.scene.children,true).some(h=>[w.m.path,w.m.stone,w.m.stoneLight,w.m.soil].includes(h.object.material)&&h.point.y>.02);
   const surfaces=(from,to)=>{
     const direction=to.clone().sub(from),distance=direction.length();
     return new T.Raycaster(from,direction.normalize(),.01,distance).intersectObjects(w.scene.children,true).filter(h=>h.object.isMesh&&h.object!==w.sky);
   };
   const across=(point,axis)=>{
     const origin=new T.Vector3(...p(...point,1.2));
     const lengths=[-1,1].map(sign=>surfaces(origin,origin.clone().add(new T.Vector3(...axis).multiplyScalar(20*sign)))[0]?.distance||20);
     return lengths.reduce((a,b)=>a+b,0);
   };
   const gymClearWidth=across([783,746.4],[1,0,0]),vsiFacadeGap=across([895,553],[0,0,1]);
   const entryOrigin=new T.Vector3(...p(1492,607));
   const roof=surfaces(entryOrigin,entryOrigin.clone().add(new T.Vector3(0,15,0)))[0];
   const mpacSoffitHeight=roof?.point.y;
   return {collisions,walkwayClear,vsiPassageClear,lobbyClear,pavement,gymClearWidth,vsiFacadeGap,mpacSoffitHeight};
 });
 console.log(JSON.stringify(result,null,2));
 assert.deepEqual(result.collisions,[],'Walking paths clear feet and eye height at centre and ±65cm, including pedestals and furniture');
 for(const key of ['walkwayClear','vsiPassageClear','lobbyClear','pavement'])assert.equal(result[key],true,key);
 assert.ok(result.gymClearWidth>=3.4,'At least 3.4 units of clear passing room between gym piers');
 assert.ok(result.vsiFacadeGap>=6.8,'VSI court has at least 6.8 units between visible facades');
 assert.ok(result.mpacSoffitHeight>=4,'MPAC entry has at least 4 units of vertical clearance');
 console.log('Video geography WebGL checks passed.');
}finally{await browser.close();}
