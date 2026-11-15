// Focused regression for the black sky artifact. Requires preview + Playwright/Chrome.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const base=process.env.HILLION_URL||'http://localhost:5173';
 await page.goto(`${base}/?overhead`);
 await page.waitForFunction(()=>window.__campus);
 const failures=await page.evaluate(async()=>{
  const {Vector2,Vector3,Raycaster}=await import('/vendor/three.module.js');
  const {introShot,route}=await import('/src/route.js');
  const world=window.__campus;
  history.replaceState(null,'','/');world.camera.up.set(0,1,0);world.setCalm(true);
  const failures=[];
  for(const [i,stop]of [introShot,...route].entries()){
   world.basePosition.set(...stop.position);world.target.set(...stop.look);
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   world.scene.updateMatrixWorld(true);
   for(const x of [-.8,0,.8]) for(const y of [.2,.6,.95]){
    const ray=new Raycaster();ray.setFromCamera(new Vector2(x,y),world.camera);
    let hit=ray.intersectObject(world.sky)[0];
    // An exactly axis-aligned ray can land on the dome's shared triangle seam.
    // Retry less than 0.01 screen pixels away; the far-plane check still applies.
    if(!hit){ray.setFromCamera(new Vector2(x+0.00001,y),world.camera);hit=ray.intersectObject(world.sky)[0];}
    if(!hit||hit.distance>=world.camera.far)failures.push({stop:i,x,y,distance:hit?.distance});
   }
  }
  return failures;
 });
 assert.deepEqual(failures,[],'The sky must fill the view inside the far plane at every stop');
 await page.goto(base);await page.locator('[data-action=start]').waitFor();await page.waitForTimeout(1000);
 await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/sky-fixed-intro.png'});
 await page.locator('[data-action=start]').click();await page.locator('[data-action=arrive]').click();await page.locator('#discovery-pin').waitFor();await page.waitForTimeout(700);
 await page.screenshot({path:'test-results/sky-fixed-field.png'});
 console.log('Sky regression passed: 72 viewing rays across intro and seven clue stops stay inside the far plane.');
} finally {await browser.close();}
