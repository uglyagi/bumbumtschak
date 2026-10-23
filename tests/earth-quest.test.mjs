import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSE,createAdventure,startAdventure,tickAdventure,resumeFromEarth,adventurePlanetPosition,FINISH_DISTANCE } from '../rocket-adventure.js';
import { createEarthVisit,tickEarth,earthStroller,earthInteraction,releaseEarthPaper,takeEarthPaper,EARTH_LENGTH,earthModulo,nearOuthouse,OUTHOUSE } from '../earth-quest.js';
import { earthMarkup,earthStreetMarkup,earthPeopleMarkup,earthPeopleChunkMarkup,earthChunkRange,earthChunkSlot,earthPedestrians,EARTH_LANDMARKS } from '../earth-art.js';
import { WORLD_SPAWN,planPath,canStand } from '../game-core.js';
import { worldMarkup } from '../art.js';

test('the secret landing requires a precise complete passage with no steering input',()=>{
 for(const [width,height] of [[1200,700],[844,390],[390,844]]) {
  const earth=COURSE.find(p=>p.id==='earth');
  const setup=(offset=0)=>{const g=createAdventure(width,height);startAdventure(g,'leicht');g.nextMeteor=Infinity;g.progress=earth.x-80;g.ship={x:width*.25,y:adventurePlanetPosition(g,earth).y+offset};return g;};
  const g=setup();const progress=g.progress;let event;
  for(let i=0;i<40&&g.phase==='playing';i++)event=tickAdventure(g,.05);
  assert.equal(event,'earth-land');assert(g.progress>progress);resumeFromEarth(g);assert(g.earthVisited);assert.equal(g.phase,'playing');
  for(const offset of [8,-8,25]){const miss=setup(offset);for(let i=0;i<40;i++)tickAdventure(miss,.05);assert.equal(miss.phase,'playing');}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[.01,0]]) {
   const moved=setup();while(!moved.earthPass)tickAdventure(moved,.01);
   tickAdventure(moved,.01,dx,dy);for(let i=0;i<80;i++)tickAdventure(moved,.05);
   assert.equal(moved.phase,'playing','any steering during passage cancels landing');
  }
  const collision=setup();collision.meteors=[{id:2,...collision.ship,radius:20,vx:0,vy:0,angle:0,spin:0}];assert.equal(tickAdventure(collision,.05),'crash');
 }
});

test('the street repeats after ten screens, has ten distinct landmarks and people, and keeps the player on the road',()=>{
 const e=createEarthVisit({x:800,y:-6000});for(let i=0;i<33;i++)tickEarth(e,.05);assert.equal(e.phase,'walking');
 assert.equal(new Set(EARTH_LANDMARKS).size,10);const start=e.position.x;
 for(let i=0;i<900;i++)tickEarth(e,.05,1,0);assert(e.position.x>start+EARTH_LENGTH);
 for(let i=0;i<40;i++)tickEarth(e,.05,0,-1);assert.equal(e.position.y,455);
 for(let i=0;i<40;i++)tickEarth(e,.05,0,1);assert.equal(e.position.y,575);
 e.position={x:530,y:505};assert(earthStreetMarkup(e).includes('Eiffelturm'));e.position.x+=EARTH_LENGTH;assert(earthStreetMarkup(e).includes('Eiffelturm'));assert.equal(earthModulo(e.position.x),530);
 e.position.x=4450;assert(earthStreetMarkup(e).includes('Kolosseum'));assert((earthPeopleMarkup(e)+earthPeopleMarkup(e,true)).includes('q25 0 26 27'));
 assert(earthMarkup(e,'cat').includes('href="#animal-cat'));assert(!earthStreetMarkup(e).includes('#ff87ce'),'the Earth street has its own restrained palette');
});

test('the fifth-screen stroller throws one physical roll which must land and be picked up before return flight',()=>{
 const e=createEarthVisit({x:800,y:-6000});e.phase='walking';e.position=earthStroller(e);
 assert.equal(earthInteraction(e,false),'earth-stroller');assert(releaseEarthPaper(e));assert(!releaseEarthPaper(e));assert(!takeEarthPaper(e));
 tickEarth(e,.05);assert(e.paper.y<500);for(let i=0;i<20;i++)tickEarth(e,.05);
 e.position={x:e.paper.x,y:e.paper.y};assert.equal(earthInteraction(e,false),'earth-paper');assert(takeEarthPaper(e));assert(!e.paper);assert(e.paperTaken);
 e.position=earthStroller(e);assert.equal(earthInteraction(e,true),null);e.position={x:EARTH_LENGTH+215,y:505};assert.equal(earthInteraction(e,true),'earth-launch');
 e.phase='launching';e.elapsed=0;let event;for(let i=0;i<33;i++)event=tickEarth(e,.05)||event;assert.equal(event,'launched');
});

test('the wooden outhouse has a heart door and an accessible automatic entrance left of the music house',()=>{
 assert(OUTHOUSE.x<0);assert(planPath(WORLD_SPAWN,OUTHOUSE.outside).length);assert(canStand(OUTHOUSE.x,520));assert(nearOuthouse({x:OUTHOUSE.x,y:520}));assert(!nearOuthouse(OUTHOUSE.outside));
 assert(!canStand(OUTHOUSE.x,450));const art=worldMarkup();assert(art.includes('id="outhouse-door"'));assert(art.includes('c-25-15-7-30 0-17'));
});


test('street buffers cover both directions and only recycle offscreen sections at boundaries',()=>{
 const e=createEarthVisit({});
 for(const x of [-10000,-1000,0,1000,5000,10000,20000])for(const direction of [-1,1]){
  e.position.x=x-direction*.1;const [a,b]=earthChunkRange(e);const old=Array.from({length:b-a+1},(_,i)=>a+i);
  e.position.x=x+direction*.1;const [c,d]=earthChunkRange(e);const next=Array.from({length:d-c+1},(_,i)=>c+i);
  assert.equal(next.length,3);assert.equal(new Set(next.map(earthChunkSlot)).size,3);
  assert(c*1000<e.position.x-500);assert((d+1)*1000>e.position.x+500);
  for(const chunk of old.filter(k=>!next.includes(k)))assert((chunk+1)*1000<e.position.x-500||chunk*1000>e.position.x+500);
  assert.equal(old.filter(k=>next.includes(k)).length,2);
 }
});

test('pedestrians turn without teleporting and never obscure the family, in any repeated cycle',()=>{
 const e=createEarthVisit({});
 for(const cycle of [-1,0,1])for(let time=0;time<200;time+=.2){
  const chunk=cycle*10+4;e.time=time;const family=earthStroller(e,cycle);assert.deepEqual(earthPedestrians(e,chunk),[]);
  for(const other of [chunk-1,chunk+1])for(const p of earthPedestrians(e,other))assert(Math.abs(p.x-family.x)>220);
 }
 for(const chunk of [-2,0,3,5,10])for(let time=0;time<200;time+=.1){
  e.time=time;const before=earthPedestrians(e,chunk);e.time+=.016;const after=earthPedestrians(e,chunk);
  before.forEach((p,i)=>assert(Math.abs(p.x-after[i].x)<=23*.016+.00001));
 }
});

test('Earth pedestrians and the stroller draw in front only when their feet are below the player',()=>{
 const e=createEarthVisit({x:0,y:0});
 for(const y of [460,500,530]){
  e.position.y=y;
  const back=earthPeopleChunkMarkup(e,0),front=earthPeopleChunkMarkup(e,0,true);
  for(const p of earthPedestrians(e,0)){
   const id=`id="${p.id}"`;assert.equal(front.includes(id),p.y>y);assert.equal(back.includes(id),p.y<=y);
  }
  assert.equal(earthPeopleChunkMarkup(e,4,true).includes('id="earth-family-4"'),508>y);
 }
 const art=earthMarkup(e,'cat');assert(art.indexOf('id="player"')<art.indexOf('id="earth-people-front"'));assert(art.indexOf('id="quest-paper"')<art.indexOf('id="earth-people-front"'));
});
