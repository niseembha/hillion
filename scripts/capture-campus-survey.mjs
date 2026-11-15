// Capture identical evidence cameras before and after a geography edit.
// HILLION_URL=http://localhost:5182 PLAYWRIGHT_MODULE_PATH=/path/to/playwright/index.mjs node scripts/capture-campus-survey.mjs before
import { mkdir, writeFile } from 'node:fs/promises';
import { surveyViews } from '../src/campus-survey.js';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const phase=process.argv[2]||'after';
const directory=`references/processed/comparison/${phase}`;
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:720,height:1280}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);
  await page.waitForFunction(()=>window.__campus?.canvas.dataset.ready==='true');
  await page.addStyleTag({content:'body > :not(canvas) { visibility:hidden !important; }'});
  // Use this checkout's definitions for BOTH servers, including an old baseline.
  const views=surveyViews;
  for(const view of views){
    await page.evaluate(view=>{
      const w=window.__campus;w.cancelTravel();w.calm=true;w.mode='survey';
      w.basePosition.set(...view.position);w.target.set(...view.look);
      // Portrait phone footage is much wider vertically than the game camera.
      // Lens metadata is unavailable; 82 degrees is an approximate QA framing.
      w.camera.fov=82;w.camera.updateProjectionMatrix();
    },view);
    await page.waitForTimeout(120);
    await page.screenshot({path:`${directory}/${view.id}.png`});
  }
  await writeFile(`${directory}/cameras.json`,JSON.stringify(views,null,2)+'\n');
  if(errors.length) throw new Error(errors.join('\n'));
  console.log(`Captured ${views.length} ${phase} evidence cameras; no page errors.`);
} finally {await browser.close();}
