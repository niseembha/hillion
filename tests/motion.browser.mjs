// Exercise the actual animation loop at fixed frame intervals for every leg.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);
 await page.waitForSelector('[data-action=start]');
 const results=await page.evaluate(async()=>{
  const {route}=await import('/src/route.js'),{notePose}=await import('/src/camera-motion.js');
  const w=window.__campus,render=w.renderer.render;
  cancelAnimationFrame(w.frame);
  // Rendering/geometry are covered separately; advance the real camera clock
  // deterministically so every turn and acceleration is sampled at 120 Hz.
  w.renderer.render=()=>{};
  const results=[];
  for(let index=0;index<route.length;index++){
   w.reset();
   if(index){const pose=notePose(route[index-1],true);w.basePosition.set(...pose.position);w.target.set(...pose.look);w.camera.position.copy(w.basePosition);w.camera.lookAt(w.target);}
   w.moveTo(index);
   const departure=w.camera.position.clone(),turnDuration=w.travel.turnDuration,duration=w.travel.duration;
   let now=w.lastFrame,elapsed=0,maxTurn=0,maxSpeed=0,turnMovement=0,departureRate=0;
   while(w.travel){
    const p=w.camera.position.clone(),q=w.camera.quaternion.clone();
    now+=1000/120;elapsed+=1000/120;w.animate(now);cancelAnimationFrame(w.frame);
    const turn=q.angleTo(w.camera.quaternion)*120,speed=p.distanceTo(w.camera.position)*120;
    maxTurn=Math.max(maxTurn,turn);maxSpeed=Math.max(maxSpeed,speed);
    if(elapsed<turnDuration){turnMovement=Math.max(turnMovement,departure.distanceTo(w.camera.position));departureRate=Math.max(departureRate,turn);}
    if(elapsed>60000)throw new Error(`Leg ${index+1} did not finish`);
   }
   results.push({note:index+1,turnDuration,duration,maxTurn,maxSpeed,turnMovement,departureRate});
  }
  w.renderer.render=render;w.reset();w.animate(performance.now());
  return results;
 });
 for(const r of results){
  assert.ok(r.turnMovement<1e-8,`Departure ${r.note} completes before walking`);
  assert.ok(r.departureRate<=(r.note===2?1.36:.79),`Departure ${r.note} stays slow`);
  assert.ok(r.maxTurn<1.36&&r.maxSpeed<9,`Leg ${r.note} has no camera or position snaps`);
 }
 assert.ok(results[1].maxSpeed>7.8&&results[2].maxSpeed>7.8,'Both long northbound straights gain speed');
 console.log('All seven camera legs passed:',JSON.stringify(results));
 // Use current case data, so roster changes cannot stale these flow checks.
 const answer=await page.evaluate(async()=>(await import('/src/data.js')).mystery.name);
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  await page.locator('[data-action=start]').click();
  for(let note=1;note<=7;note++){
   await page.locator('[data-action=arrive]').click();
   await page.locator('body[data-view=discover]').waitFor();
   await page.locator('#discovery-pin').click();
   await page.locator('body[data-view=clue]').waitFor();
   assert.ok(await page.locator('#clue-title').innerText().then(text=>text.includes(String(note))));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(note<7)await page.locator('[data-action=next]').click();
  }
  await page.locator('[data-action=guess-toggle]').click();
  await page.locator('#senior-search').fill(answer);
  await page.locator('[role=option]').filter({hasText:answer}).click();
  await page.locator('[type=submit]').click();
  await page.locator('body[data-view=spotlight]').waitFor();
  await page.locator('#home-button').click();
  await page.locator('body[data-view=intro]').waitFor();
 }
 console.log('Current-roster seven-note flow, solving, reset, and desktop/mobile layouts passed.');
}finally{await browser.close();}
