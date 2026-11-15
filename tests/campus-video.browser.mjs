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
       for(const offset of [-.16,0,.16]){
         const tangent=b.clone().sub(a).normalize(),side=new T.Vector3(-tangent.z,0,tangent.x).multiplyScalar(offset);
         const hits=cast(a.clone().add(side),b.clone().add(side));
         if(hits.length)collisions.push({segment:index+1,sample:i,offset,point:hits[0].point.toArray(),material:hits[0].object.material.color?.getHexString()});
       }
     }
     previous=stop.position;
   }
   const walkwayClear=cast(new T.Vector3(...p(790,737)),new T.Vector3(...p(790,641))).length===0;
   const vsiPassageClear=cast(new T.Vector3(...p(789,553)),new T.Vector3(...p(840,553))).length===0;
   const lobbyClear=cast(new T.Vector3(...p(1492,606)),new T.Vector3(...p(1506,606))).length===0;
   // The default front-face raycast also proves the pavement points upward.
   const down=new T.Raycaster(new T.Vector3(...p(1053,631,2)),new T.Vector3(0,-1,0),0,3);
   const pavement=down.intersectObjects(w.scene.children,true).some(h=>[w.m.path,w.m.stone,w.m.stoneLight,w.m.soil].includes(h.object.material)&&h.point.y>.02);
   return {collisions,walkwayClear,vsiPassageClear,lobbyClear,pavement};
 });
 console.log(JSON.stringify(result,null,2));
 assert.deepEqual(result.collisions,[],'Eye-height walking paths clear walls, columns, trees and furniture with a 16cm lateral margin');
 for(const key of ['walkwayClear','vsiPassageClear','lobbyClear','pavement'])assert.equal(result[key],true,key);
 console.log('Video geography WebGL checks passed.');
}finally{await browser.close();}
