import test from 'node:test';
import assert from 'node:assert/strict';
import { CatmullRomCurve3, Vector3 } from 'three';
import { approachWaypoints, departureWaypoints, notePose, walkingPlan, walkingProgress, walkingTarget, walkDuration } from '../src/camera-motion.js';
import { route, introShot } from '../src/route.js';
import { footprints } from '../src/campus-layout.js';

test('walking pace accelerates and decelerates continuously without a middle surge',()=>{
 let previous=0;const speeds=[];
 for(let i=1;i<=1000;i++){const u=walkingProgress(i/1000);assert.ok(u>=previous&&u<=1);speeds.push((u-previous)*1000);previous=u;}
 assert.equal(walkingProgress(0),0);assert.equal(walkingProgress(1),1);
 assert.ok(speeds[0]<.001&&speeds.at(-1)<.001);
 assert.ok(Math.max(...speeds.slice(200,800))-Math.min(...speeds.slice(200,800))<.00001);
 assert.ok(walkDuration(75)>walkDuration(35));
});
test('every note has a close approach and a downward reading pose',()=>{
 for(const stop of route){
  const arrive=notePose(stop),read=notePose(stop,true);
  assert.ok(Math.abs(Math.hypot(arrive.position[0]-stop.marker[0],arrive.position[2]-stop.marker[2])-2.05)<.001);
  assert.ok(Math.abs(Math.hypot(read.position[0]-stop.marker[0],read.position[2]-stop.marker[2])-1.05)<.001);
  assert.ok(read.look[1]<read.position[1]&&read.position[1]>=1.55);
  assert.ok(notePose(stop,true,true).look[1]<read.look[1]);
 }
});
test('the walking aim stays near the horizon until the deliberate note focus',()=>{
 let previous=introShot.position;
 for(const stop of route){
  const arrival=notePose(stop),curve=new CatmullRomCurve3([previous,...stop.via,stop.position,arrival.position].map(p=>new Vector3(...p)),false,'centripetal'),length=curve.getLength();
  for(let u=.05;u<.95;u+=.01){
   if((1-u)*length<7)continue;
   const position=curve.getPointAt(u),aim=walkingTarget(curve,u,length,stop.marker);
   const pitch=Math.atan2(aim[1]-position.y,Math.hypot(aim[0]-position.x,aim[2]-position.z));
   assert.ok(pitch<.035&&pitch>-.06,'Walking never aims at the sky or down at the feet');
  }
  previous=notePose(stop,true).position;
 }
});

test('straight travel gains speed while bends and the final approach brake smoothly',()=>{
 const curve=new CatmullRomCurve3([[0,1.72,0],[0,1.72,35],[0,1.72,55],[12,1.72,64],[30,1.72,64]].map(p=>new Vector3(...p)),false,'centripetal');
 curve.arcLengthDivisions=1200;curve.updateArcLengths();
 const plan=walkingPlan(curve,[32,.91,64]);
 let previous=0,previousSpeed=0,maxSpeed=0,bendSpeed=0;
 for(let ms=10;ms<plan.duration;ms+=10){
  const u=plan.progress(ms),speed=(u-previous)*curve.getLength()*100;
  assert.ok(u>=previous&&u<=1);
  assert.ok(Math.abs(speed-previousSpeed)<.018,'Acceleration and braking stay bounded');
  if(u>.55&&u<.65)bendSpeed=Math.max(bendSpeed,speed);
  maxSpeed=Math.max(maxSpeed,speed);previous=u;previousSpeed=speed;
 }
 assert.ok(maxSpeed>7.8&&maxSpeed<8.2);
 assert.ok(bendSpeed<maxSpeed-1,'Turns are slower than the straight');
 assert.ok(previousSpeed<.03,'Arrival stops gently');
 assert.equal(plan.progress(0),0);assert.ok(Math.abs(plan.progress(plan.duration)-1)<1e-10);
});

test('actual approaches clear buildings and avoid the old overshooting staging points',()=>{
 let previous=introShot.position;
 for(const [index,stop] of route.entries()){
  const approach=approachWaypoints(stop,index);
  if([0,1,3].includes(index))assert.ok(!approach.includes(stop.position));
  if(index===4)assert.deepEqual(approach,[...stop.via,stop.position]);
  const departure=departureWaypoints(index?route[index-1]:null,previous,stop.via[0]);
  const curve=new CatmullRomCurve3([previous,...departure,...approach,notePose(stop).position].map(p=>new Vector3(...p)),false,'centripetal');
  const plan=walkingPlan(curve,stop.marker);
  assert.ok(Number.isFinite(plan.duration)&&plan.duration<30000);
  for(let i=0;i<=400;i++){
   const p=curve.getPointAt(i/400);
   for(const b of footprints.filter(b=>!b.field))assert.ok(!(p.x>b.minX-.25&&p.x<b.maxX+.25&&p.z>b.minZ-.25&&p.z<b.maxZ+.25),`Approach ${index+1} crosses ${b.name}`);
  }
  previous=notePose(stop,true).position;
 }
});
