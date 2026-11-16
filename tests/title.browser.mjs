import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const out='test-results/title';await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);await page.waitForFunction(()=>window.__campus);
 await page.waitForTimeout(1800);await page.screenshot({path:`${out}/desktop.png`});
 await page.evaluate(()=>{window.originalCanvas=document.querySelector('canvas');window.titleSamples=[];window.titleSampling=true;const w=window.__campus;function sample(){if(!window.titleSampling)return;window.titleSamples.push({p:w.camera.position.toArray(),q:w.camera.quaternion.toArray(),t:performance.now()});requestAnimationFrame(sample);}sample();});
 await page.locator('[data-action=start]').click();
 assert.equal(await page.locator('.title-departure').count(),1);
 await page.locator('body[data-view=discover]').waitFor({timeout:20000});await page.waitForTimeout(1000);
 const result=await page.evaluate(async()=>{window.titleSampling=false;const T=await import('/vendor/three.module.js');let maxStep=0,maxTurn=0;const samples=window.titleSamples;for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dt=(b.t-a.t)/1000;maxStep=Math.max(maxStep,new T.Vector3(...a.p).distanceTo(new T.Vector3(...b.p)));maxTurn=Math.max(maxTurn,new T.Quaternion(...a.q).angleTo(new T.Quaternion(...b.q))/dt);}return{sameCanvas:window.originalCanvas===document.querySelector('canvas'),maxStep,maxTurn,frames:samples.length};});
 assert.equal(result.sameCanvas,true);assert.ok(result.maxStep<.8,JSON.stringify(result));assert.ok(result.maxTurn<1.36,JSON.stringify(result));assert.equal(await page.locator('.title-departure').count(),0);
 await page.screenshot({path:`${out}/first-note.png`});await page.locator('#discovery-pin').click();await page.locator('body[data-view=clue]').waitFor();
 await page.locator('#home-button').click();
 for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  await page.setViewportSize(size);await page.waitForTimeout(900);
  const box=await page.locator('[data-action=start]').boundingBox();assert.ok(box&&box.y>0&&box.y+box.height<size.height&&box.x>=0&&box.x+box.width<=size.width);
  await page.screenshot({path:`${out}/${size.width}.png`});
 }
 assert.deepEqual(errors,[]);await writeFile(`${out}/metrics.json`,JSON.stringify(result,null,2));console.log('Title entrance, responsive framing, same-world start and continuous camera passed:',JSON.stringify(result));
}finally{await browser.close();}
