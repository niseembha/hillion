import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const out='references/processed/accuracy/walk';await mkdir(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?survey`);await page.waitForFunction(()=>window.__campus);
 const audit=await page.evaluate(async()=>{
  const {mapPoint:p}=await import('/src/campus-layout.js'),w=window.__campus,roofTrunks=[],hardPairs=[];
  for(const t of w.treeRecords)for(const r of w.roofZones){const a=p(r.rect[0],r.rect[1],0),b=p(r.rect[2],r.rect[3],0);if(t.x>a[0]-.18&&t.x<b[0]+.18&&t.z>a[2]-.18&&t.z<b[2]+.18)roofTrunks.push({tree:t,roof:r});}
  const hard=w.detailRecords.filter(r=>!['shrub','grasses'].includes(r.kind));
  for(let i=0;i<hard.length;i++)for(let j=i+1;j<hard.length;j++)if(Math.hypot(hard[i].x-hard[j].x,hard[i].z-hard[j].z)<hard[i].radius+hard[j].radius)hardPairs.push([hard[i],hard[j]]);
  return{roofTrunks,hardPairs,trees:w.treeRecords.length,hardObjects:hard.length};
 });
 assert.deepEqual(audit.roofTrunks,[]);assert.deepEqual(audit.hardPairs,[]);
 await page.evaluate(()=>{window.motion=[];const w=window.__campus;function sample(t){window.motion.push({t,p:w.camera.position.toArray(),q:w.camera.quaternion.toArray()});requestAnimationFrame(sample);}requestAnimationFrame(sample);});
 await page.locator('[data-action=start]').click();
 for(let i=0;i<7;i++){
  await page.locator('body[data-view=discover]').waitFor({timeout:35000});await page.waitForTimeout(400);await page.screenshot({path:`${out}/${i+1}-arrival.png`});
  await page.locator('#discovery-pin').click();await page.waitForTimeout(1100);await page.screenshot({path:`${out}/${i+1}-read.png`});
  if(i<6)await page.locator('[data-action=next]').click();
 }
 const motion=await page.evaluate(async()=>{const T=await import('/vendor/three.module.js');let maxStep=0,maxTurn=0;for(let i=1;i<window.motion.length;i++){const a=window.motion[i-1],b=window.motion[i],dt=(b.t-a.t)/1000;if(dt<=0)continue;maxStep=Math.max(maxStep,new T.Vector3(...a.p).distanceTo(new T.Vector3(...b.p)));maxTurn=Math.max(maxTurn,new T.Quaternion(...a.q).angleTo(new T.Quaternion(...b.q))/dt);}return{maxStep,maxTurn,frames:window.motion.length};});
 assert.ok(motion.maxStep<.85,JSON.stringify(motion));assert.ok(motion.maxTurn<1.36,JSON.stringify(motion));assert.deepEqual(errors,[]);
 await writeFile(`${out}/audit.json`,JSON.stringify({audit,motion},null,2));console.log(JSON.stringify({audit,motion}));
}finally{await browser.close();}
