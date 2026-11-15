// Focused geometry regression: STEM is hidden at the gym, then revealed after the right turn.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.goto(`${process.env.HILLION_URL||'http://localhost:5173'}/?overhead`);
 await page.waitForFunction(()=>window.__campus);
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js');const {route}=await import('/src/route.js');const world=window.__campus;
  world.scene.updateMatrixWorld(true);
  const cast=(from,to)=>{const direction=new T.Vector3().subVectors(to,from);const distance=direction.length();const ray=new T.Raycaster(from,direction.normalize(),.01,distance-.15);return ray.intersectObjects(world.scene.children,true).filter(hit=>hit.object!==world.sky&&!hit.object.material.transparent);};
  const from=new T.Vector3(...route[1].position),visible=[];
  for(const x of [-20,-14,-7])for(const y of [2,5,8.5])if(!cast(from,new T.Vector3(x,y,-20.1)).length)visible.push({x,y});
  const after=new T.Vector3(...route[2].position);
  const blockedAfter=cast(after,new T.Vector3(-10.8,2.2,-20.1)).length>0;
  const curve=new T.CatmullRomCurve3([route[1].position,...route[2].via,route[2].position].map(p=>new T.Vector3(...p)),false,'centripetal');
  const collisions=[];
  for(let i=0;i<150;i++){const a=curve.getPointAt(i/150),b=curve.getPointAt((i+1)/150);if(cast(a,b).length)collisions.push(i);}
  return {visible,blockedAfter,collisions};
 });
 assert.deepEqual(result.visible,[],'The innovation facade must be occluded from the gym stop');
 assert.equal(result.blockedAfter,false,'The innovation facade must become visible after the right turn');
 assert.deepEqual(result.collisions,[],'The camera must clear the physical arches, furniture and walls');
 console.log('Gym geometry regression passed: nine STEM sightlines blocked at gym, clear view after right turn, and sampled camera path clears physical geometry.');
} finally {await browser.close();}
