// A representative real-time guided walk and close-note inspection for review.
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const directory='references/processed/polish/walk';await mkdir(directory,{recursive:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:directory,size:{width:960,height:600}}});
 const page=await context.newPage();await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);
 await page.locator('[data-action=start]').click();await page.locator('[data-action=arrive]').click();await page.locator('#discovery-pin').click();
 await page.waitForTimeout(1100);await page.locator('[data-action=next]').click();await page.locator('[data-action=arrive]').click();await page.locator('#discovery-pin').click();
 await page.waitForTimeout(1400);await page.screenshot({path:`${directory}/gym-note.png`});await page.locator('[data-action=next]').click();
 for(const [i,delay]of [0,2500,3000,3000,2500].entries()){
  if(delay)await page.waitForTimeout(delay);
  await page.screenshot({path:`${directory}/journey-${i}.png`});
 }
 await page.locator('body[data-view=discover]').waitFor({timeout:30000});await page.waitForTimeout(1000);await page.screenshot({path:`${directory}/vsi-arrival.png`});
 await page.locator('#discovery-pin').click();await page.waitForTimeout(1500);await page.screenshot({path:`${directory}/vsi-note.png`});
 const info=await page.evaluate(()=>({stats:window.__campus.environmentStats,render:window.__campus.renderer.info.render}));await writeFile(`${directory}/stats.json`,JSON.stringify(info,null,2)+'\n');
 const video=page.video();await context.close();await video.saveAs(`${directory}/guided-walk.webm`);
 console.log('Captured representative real-time walk, turn and note inspection.');
}finally{await browser.close();}
