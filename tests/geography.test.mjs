import test from 'node:test';
import assert from 'node:assert/strict';
import { CatmullRomCurve3, Vector3 } from 'three';
import { footprints } from '../src/campus-layout.js';
import { route, introShot } from '../src/route.js';
test('the marked route runs north from Brinkmann, then east through the academic campus',()=>{
 assert.equal(route.length,7);
 assert.ok(route[0].position[2]>route[1].position[2]&&route[1].position[2]>route[2].position[2]);
 assert.ok(route[2].marker[0]<route[3].marker[0]&&route[2].marker[2]<route[3].marker[2]);
 assert.ok(route[4].marker[0]<route[5].marker[0]&&route[5].marker[0]<route[6].marker[0]);
 const find=n=>footprints.find(b=>b.name===n);
 assert.ok(find('Korenvaes Upper School').maxZ<find('Fulton Upper School').minZ);
 assert.ok(find('Crossman Dining Hall').minX>find('STEM + Innovation Center').maxX);
});
test('sampled walking curves clear mapped building footprints with a pedestrian margin',()=>{
 let previous=introShot.position;
 for(const [i,stop]of route.entries()){
 const curve=new CatmullRomCurve3([previous,...stop.via,stop.position].map(p=>new Vector3(...p)),false,'centripetal');
 for(let j=0;j<=400;j++){const p=curve.getPointAt(j/400);assert.ok(Math.abs(p.y-1.72)<.2);for(const b of footprints.filter(b=>!b.field))assert.ok(!(p.x>b.minX-.25&&p.x<b.maxX+.25&&p.z>b.minZ-.25&&p.z<b.maxZ+.25),`Segment ${i+1} crosses ${b.name}`);}
 previous=stop.position;
 }
});
test('field, gym and basketball slab keep the map relationships visible in clip 01',()=>{
 const find=n=>footprints.find(b=>b.name===n),field=find('Brinkmann Field'),gym=find('Phillips Family Gymnasium');
 assert.ok(field.maxZ>gym.maxZ&&field.minZ>gym.maxZ,'Field is south of the gym');
 assert.ok(field.maxX>gym.maxX,'Field eastern sideline extends beyond the gym east facade');
 assert.ok(introShot.position[0]>=field.maxX&&introShot.position[2]>field.minZ,'Opening is at the eastern sideline');
 assert.ok(introShot.look[0]<introShot.position[0],'Footage opens looking west across the field');
 assert.ok(route[1].position[0]>gym.maxX,'Northbound gym approach is east of the gym');
 assert.ok(route[1].glance.target[0]>route[1].position[0],'Basketball slab is right/east of the northbound path');
});
test('VSI route approaches on the west then passes east under its southwest leg',()=>{
 const vsi=footprints.find(b=>b.name==='STEM + Innovation Center');
 const points=route[2].via;
 assert.ok(points.slice(0,6).every(p=>p[0]<vsi.minX));
 assert.ok(points.at(-1)[0]>vsi.minX&&route[2].position[2]>vsi.maxZ);
 assert.ok(route[2].position[0]<route[3].position[0]);
});
