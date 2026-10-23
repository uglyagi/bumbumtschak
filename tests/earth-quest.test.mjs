import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSE,createAdventure,startAdventure,tickAdventure,resumeFromEarth,adventurePlanetPosition,FINISH_DISTANCE } from '../rocket-adventure.js';
import { createEarthVisit,tickEarth,earthStroller,earthInteraction,releaseEarthPaper,takeEarthPaper,EARTH_LENGTH,earthModulo,nearOuthouse,OUTHOUSE } from '../earth-quest.js';
import { earthMarkup,earthStreetMarkup,earthPeopleMarkup,EARTH_LANDMARKS } from '../earth-art.js';
import { WORLD_SPAWN,planPath,canStand } from '../game-core.js';
import { worldMarkup } from '../art.js';

test('Earth landing needs uninterrupted contact for more than three seconds at every screen size',()=>{
 for(const [width,height] of [[1200,700],[844,390],[390,844]]) {
  const g=createAdventure(width,height);startAdventure(g,'leicht');const earth=COURSE.find(p=>p.id==='earth');g.progress=earth.x;g.ship=adventurePlanetPosition(g,earth);g.nextMeteor=Infinity;
  for(let i=0;i<40;i++)assert.equal(tickAdventure(g,.05),null);
  assert.equal(g.progress,earth.x);assert(g.earthTouch>1.9);
  tickAdventure(g,.05,0,1);for(let i=0;i<10;i++)tickAdventure(g,.05,0,1);assert.equal(g.earthTouch,0,'leaving the contact circle resets the timer');
  g.progress=earth.x;g.ship=adventurePlanetPosition(g,earth);
  for(let i=0;i<60;i++)tickAdventure(g,.05);
  assert.equal(g.phase,'playing');assert.equal(tickAdventure(g,.05),'earth-land');assert.equal(g.phase,'earth');
  const oldTime=g.time;resumeFromEarth(g);assert.equal(g.phase,'playing');assert(g.progress>earth.x);assert(g.progress<FINISH_DISTANCE);assert.equal(g.time,oldTime);assert(g.earthVisited);assert(g.nextMeteor>g.time);
  g.progress=earth.x;g.ship=adventurePlanetPosition(g,earth);tickAdventure(g,.05);assert.equal(g.earthTouch,0,'taking off cannot trigger another immediate landing');
 }
});

test('the street repeats after ten screens, has ten distinct landmarks and people, and keeps the player on the road',()=>{
 const e=createEarthVisit({x:800,y:-6000});for(let i=0;i<33;i++)tickEarth(e,.05);assert.equal(e.phase,'walking');
 assert.equal(new Set(EARTH_LANDMARKS).size,10);const start=e.position.x;
 for(let i=0;i<900;i++)tickEarth(e,.05,1,0);assert(e.position.x>start+EARTH_LENGTH);
 for(let i=0;i<40;i++)tickEarth(e,.05,0,-1);assert.equal(e.position.y,455);
 for(let i=0;i<40;i++)tickEarth(e,.05,0,1);assert.equal(e.position.y,575);
 e.position={x:530,y:505};assert(earthStreetMarkup(e).includes('Eiffelturm'));e.position.x+=EARTH_LENGTH;assert(earthStreetMarkup(e).includes('Eiffelturm'));assert.equal(earthModulo(e.position.x),530);
 e.position.x=4450;assert(earthStreetMarkup(e).includes('Kolosseum'));assert(earthPeopleMarkup(e).includes('q25 0 26 27'));
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
