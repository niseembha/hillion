// Actual rendered geometry, close-note composition and real-time camera motion.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);
 await page.waitForFunction(()=>window.__campus);
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{route,introShot}=await import('/src/route.js'),{approachWaypoints,departureWaypoints,notePose}=await import('/src/camera-motion.js');
  const w=window.__campus;w.calm=true;w.scene.updateMatrixWorld(true);
  const cast=(a,b)=>{const direction=b.clone().sub(a),length=direction.length();return new T.Raycaster(a,direction.normalize(),.001,length).intersectObjects(w.scene.children,true).filter(h=>h.object.isMesh&&h.object!==w.sky&&!h.object.material.transparent);};
  let previous=introShot.position;const collisions=[];
  for(const [index,stop]of route.entries()){
   const arrival=notePose(stop),reading=notePose(stop,true),departure=departureWaypoints(index>0?route[index-1]:null,previous,stop.via[0]||stop.position);
   for(const [kind,points]of [['walk',[previous,...departure,...approachWaypoints(stop,index),arrival.position]],['read',[arrival.position,reading.position]]]){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
    const steps=Math.ceil(curve.getLength()/.35);
    for(let i=0;i<steps;i++)for(const height of [.4,1.6])for(const offset of [-.27,0,.27]){
     const a=curve.getPointAt(i/steps),b=curve.getPointAt((i+1)/steps),t=b.clone().sub(a).normalize(),side=new T.Vector3(-t.z,0,t.x).multiplyScalar(offset);
     a.add(side);b.add(side);a.y=b.y=height;
     const hits=cast(a,b);if(hits.length)collisions.push({stop:index+1,kind,sample:i,point:hits[0].point.toArray(),material:hits[0].object.material.color?.getHexString()});
    }
   }
   previous=reading.position;
  }
  const badTrees=w.treeRecords.filter(t=>t.wallGap<t.radius+.1);
  const lifeCollisions=[];
  for(const actor of w.lifeActors){
   const skip=new Set();actor.group.traverse(o=>skip.add(o));
   for(const h of actor.kind==='student'?[.4,1.35]:[.2,.6]){
    const a=actor.start.clone(),b=actor.end.clone();a.y=b.y=h;
    const hits=cast(a,b).filter(h=>!skip.has(h.object));
    if(hits.length)lifeCollisions.push({kind:actor.kind,point:hits[0].point.toArray(),material:hits[0].object.material.color?.getHexString()});
   }
  }
  const frames=[];
  for(const [index,stop]of route.entries()){
   const pose=notePose(stop,true,innerWidth<650);w.basePosition.set(...pose.position);w.target.set(...pose.look);w.camera.position.copy(w.basePosition);w.camera.lookAt(w.target);w.camera.updateMatrixWorld();
   const point=new T.Vector3(...stop.marker).project(w.camera);
   frames.push({stop:index+1,x:point.x*.5+.5,y:-point.y*.5+.5,distance:Math.hypot(pose.position[0]-stop.marker[0],pose.position[2]-stop.marker[2])});
  }
  return {collisions,badTrees,lifeCollisions,frames,stats:w.environmentStats,render:w.renderer.info.render};
 });
 console.log(JSON.stringify(result,null,2));
 assert.deepEqual(result.collisions,[],'New approaches and reading positions clear real geometry at feet and upper body');
 assert.deepEqual(result.badTrees,[],'Every crown fits its facade setback');
 assert.deepEqual(result.lifeCollisions,[],'Background walks do not pass through furniture or walls');
 assert.ok(result.stats.trees>=45&&result.stats.details>=100,'Environment has substantial grounded detail');
 for(const f of result.frames){assert.ok(f.x>.25&&f.x<.65&&f.y>.2&&f.y<.65,'Reading note is framed clear of the desktop UI');assert.ok(f.distance<1.1);}
 // Follow the actual gym-to-VSI turn, not just ideal target math.
 const motion=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{route}=await import('/src/route.js'),{notePose}=await import('/src/camera-motion.js');
  const w=window.__campus,pose=notePose(route[1],true);w.cancelTravel();w.calm=false;w.mode='clue';
  w.basePosition.set(...pose.position);w.target.set(...pose.look);w.camera.position.copy(w.basePosition);w.camera.lookAt(w.target);
  w.moveTo(2);const samples=[];let old=w.camera.quaternion.clone(),oldPosition=w.camera.position.clone(),oldTime=null;
  return await new Promise(resolve=>{const tick=now=>{
   if(oldTime===null){oldTime=now;old.copy(w.camera.quaternion);oldPosition.copy(w.camera.position);requestAnimationFrame(tick);return;}
   const dt=(now-oldTime)/1000;
   if(dt>.002){const direction=w.camera.getWorldDirection(new T.Vector3());samples.push({turn:old.angleTo(w.camera.quaternion)/dt,speed:oldPosition.distanceTo(w.camera.position)/dt,pitch:Math.asin(direction.y)});old.copy(w.camera.quaternion);oldPosition.copy(w.camera.position);oldTime=now;}
   if(w.travel)requestAnimationFrame(tick);else resolve({maxTurn:Math.max(...samples.map(s=>s.turn)),maxSpeed:Math.max(...samples.map(s=>s.speed)),maxUpPitch:Math.max(...samples.map(s=>s.pitch)),frames:samples.length});
  };requestAnimationFrame(tick);});
 });
 console.log('Actual camera motion',JSON.stringify(motion));
 assert.ok(motion.maxTurn<1.65&&motion.maxSpeed<9,'No whip turns or positional snaps');
 assert.ok(motion.maxUpPitch<.08,'No sky-looking aim');
 await mkdir('references/processed/polish',{recursive:true});await writeFile('references/processed/polish/qa.json',JSON.stringify({geometry:result,motion},null,2)+'\n');
 console.log('Detail, grounding, note-framing and camera-motion QA passed.');
}finally{await browser.close();}
