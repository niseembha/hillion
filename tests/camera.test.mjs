import test from 'node:test';
import assert from 'node:assert/strict';
import { CatmullRomCurve3, Vector3 } from 'three';
import { notePose, walkingProgress, walkingTarget, walkDuration } from '../src/camera-motion.js';
import { route, introShot } from '../src/route.js';

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
