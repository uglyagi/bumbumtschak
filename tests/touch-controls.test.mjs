import test from 'node:test';
import assert from 'node:assert/strict';
import { thumbDirection, thumbOffset, THUMB_TRAVEL, THUMB_DEAD_ZONE, landscapeSize, screenPointInGame } from '../touch-controls.js';

test('the larger thumb dead zone ignores jitter and deliberately moving past it steers', () => {
 const origin={x:160,y:220};assert.equal(THUMB_DEAD_ZONE,8);
 for(const [dx,dy]of [[0,0],[4,0],[0,-7],[4,4]])assert.deepEqual(thumbDirection({clientX:160+dx,clientY:220+dy},origin),{x:0,y:0});
 assert.deepEqual(thumbDirection({clientX:172,clientY:220},origin),{x:1,y:0});
 assert.deepEqual(thumbDirection({clientX:163,clientY:208},origin),{x:0,y:-1},'a slight horizontal wobble keeps a vertical walk vertical');
 const diagonal=thumbDirection({clientX:172,clientY:232},origin);assert(Math.abs(diagonal.x-Math.SQRT1_2)<1e-10);assert.equal(diagonal.x,diagonal.y);
 assert.deepEqual(thumbDirection(null,origin),{x:0,y:0});assert.deepEqual(thumbDirection({clientX:NaN,clientY:220},origin),{x:0,y:0});
});

test('thumb directions do not depend on the camera or speed up diagonals',()=>{
 const finger={clientX:280,clientY:170};
 for(const origin of [{x:40,y:170},{x:400,y:170},{x:280,y:350}]){
  const direction=thumbDirection(finger,origin);assert.equal(Math.hypot(direction.x,direction.y),1);
  assert.equal(Math.sign(direction.x),Math.sign(finger.clientX-origin.x));assert.equal(Math.sign(direction.y),Math.sign(finger.clientY-origin.y));
 }
});

test('the thumb knob remains on its platform when a held finger moves beyond it',()=>{
 const origin={x:55,y:330};assert.deepEqual(thumbOffset({clientX:55,clientY:330},origin),{x:0,y:0});
 assert.deepEqual(thumbOffset({clientX:61,clientY:330},origin),{x:6,y:0});
 for(const [dx,dy]of [[100,0],[-100,100],[0,-900]]){
  const offset=thumbOffset({clientX:55+dx,clientY:330+dy},origin);assert(Math.abs(Math.hypot(offset.x,offset.y)-THUMB_TRAVEL)<1e-10);
 }
});

test('a rotated portrait screen maps thumb directions and its knob into the landscape game',()=>{
 const origin={x:55,y:330};
 assert.deepEqual(thumbDirection({clientX:55,clientY:342},origin,true),{x:1,y:0});
 assert.deepEqual(thumbDirection({clientX:67,clientY:330},origin,true),{x:0,y:-1});
 assert.deepEqual(thumbOffset({clientX:55,clientY:342},origin,true),{x:12,y:0});
});

test('logical game sizes and pixel coordinates stay correct in portrait fullscreen',()=>{
 const rect={left:8,top:20,width:390,height:844};
 assert.deepEqual(landscapeSize(rect,true),{width:844,height:390});assert.deepEqual(landscapeSize(rect,false),{width:390,height:844});
 for(const [logical,screen]of [[{x:0,y:0},{x:398,y:20}],[{x:844,y:390},{x:8,y:864}],[{x:300,y:140},{x:258,y:320}]])assert.deepEqual(screenPointInGame(screen,rect,true),logical);
 assert.deepEqual(screenPointInGame({x:200,y:100},rect),{x:192,y:80});
});
