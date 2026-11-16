// Focused early-reveal grounding and wall-clearance regression.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);await page.waitForFunction(()=>window.__campus);
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js'),{route}=await import('/src/route.js'),{notePose}=await import('/src/camera-motion.js'),{footprints}=await import('/src/campus-layout.js');
  const w=window.__campus;w.calm=true;w.stop=2;w.mode='clue';const pose=notePose(route[2],true);w.basePosition.set(...pose.position);w.target.set(...pose.look);
  await w.toReveal();await w.openYearbook('/assets/maya.svg');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));w.scene.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(w.book),stem=footprints.find(b=>b.name==='STEM + Innovation Center');
  return{bottom:box.min.y,wallGap:box.min.z-stem.maxZ,openingSign:w.bookOpeningSign,hiddenNote:!w.markers[2].group.visible};
 });
 assert.ok(Math.abs(result.bottom-.87)<.015);assert.ok(result.wallGap>0);assert.equal(result.hiddenNote,true);assert.equal(result.openingSign,1);
 console.log('Yearbook rests on its plinth and opens clear of the VSI facade:',JSON.stringify(result));
}finally{await browser.close();}
