import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS } from '../content.js';
import { createReception, landReception, tickReception, receptionAway, receptionMarkup, swapReceptionPilot } from '../reception.js';
import { GROUND_ROCKET } from '../sky-world.js';
import { canStand } from '../game-core.js';
import { roomMarkup } from '../room-art.js';
import { nearbyInteraction } from '../rooms.js';
import { createAdventure, startAdventure, tickAdventure, DIFFICULTIES, FINISH_DISTANCE, sunHolidayDuration } from '../rocket-adventure.js';

test('easy and medium keep the same journey with fewer, smaller, slower meteors; pro retains the previous settings', () => {
  const samples = [];
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const game = createAdventure(1200,700,123); startAdventure(game,difficulty); const first=game.nextMeteor;
    game.nextMeteor=0; tickAdventure(game,.016); const m=game.meteors[0];
    samples.push({first,size:m.radius,speed:Math.hypot(m.vx,m.vy),wait:game.nextMeteor-game.time});
    assert.equal(game.difficulty,difficulty);game.progress=FINISH_DISTANCE;game.meteors=[];game.nextMeteor=Infinity;
    assert.equal(tickAdventure(game,.016),'sun-arrived');game.sunTime=sunHolidayDuration(game)-.01;assert.equal(tickAdventure(game,.02),'win');
    assert.equal(game.completedDifficulty,difficulty);
    game.nextDifficulty='profi';assert.equal(game.completedDifficulty,difficulty,'choosing a new level cannot change the completed result');
  }
  for(const key of ['size','speed'])assert(samples[0][key]<samples[1][key]&&samples[1][key]<samples[2][key]);
  for(const key of ['first','wait'])assert(samples[0][key]>samples[1][key]&&samples[1][key]>samples[2][key]);
  assert.equal(samples[2].first,2);assert(samples[2].size>=20&&samples[2].size<=70);assert(samples[2].wait>=.675&&samples[2].wait<=1.2);
});

test('changing the controlled animal keeps exactly the three other animals in the reception', () => {
  const r=createReception(ANIMALS,'cat',GROUND_ROCKET);landReception(r);
  swapReceptionPilot(r,'cat','dog',{x:413,y:70},'world');
  assert.deepEqual(r.guests.map(g=>g.id).sort(),['cat','horse','monkey']);
  assert.equal(new Set(r.guests.map(g=>g.id)).size,3);assert(!receptionMarkup(r,'world').includes('id="reception-dog"'));
  swapReceptionPilot(r,'dog','cat',{x:300,y:430},'wardrobe');
  assert.deepEqual(r.guests.map(g=>g.id).sort(),['dog','horse','monkey']);assert(!receptionAway(r).includes('dog'));
});

test('all three other animals walk to the rocket, cheer with fireworks after landing and return through the home door', () => {
  for (const pilot of ANIMALS) {
    const r=createReception(ANIMALS,pilot.id,GROUND_ROCKET);
    assert.equal(r.guests.length,3);assert(r.guests.every(g=>g.id!==pilot.id&&g.path.length));
    assert(!receptionMarkup(r,'world').includes('reception-fireworks'),'no fireworks before landing');
    for(let i=0;i<400;i++){tickReception(r,.016,'sky',{x:365,y:-500},true,true);for(const g of r.guests)assert(canStand(g.position.x,g.position.y,undefined,'world'),g.id);}
    landReception(r);tickReception(r,.016,'world',GROUND_ROCKET,true,false);
    assert(receptionMarkup(r,'world').includes('reception-fireworks'));assert(receptionMarkup(r,'world').includes('is-cheering'));
    const away=receptionAway(r);const room=roomMarkup('wardrobe',0,undefined,pilot.id,{away});
    assert.equal((room.match(/id="home-animal-/g)||[]).length,0,'the celebrating animals are not duplicated inside');
    assert.equal((room.match(/data-home-slot=/g)||[]).length,4,'the four fixed labels remain');
    assert.equal(nearbyInteraction('wardrobe',{x:300,y:430},{},0,{animal:pilot.id,away})?.kind,undefined);
    for(let i=0;i<400;i++)tickReception(r,.016,'world',GROUND_ROCKET,false,false);
    assert.equal(r.phase,'celebrating');assert(!receptionMarkup(r,'world').includes('is-cheering'),'the dance is brief');
    tickReception(r,.016,'world',{x:900,y:800});assert.equal(r.phase,'leaving');
    for(let i=0;i<1000&&r.phase!=='done';i++)tickReception(r,.016,'wardrobe',{x:800,y:740});
    assert.equal(r.phase,'done');assert.deepEqual(receptionAway(r),[]);
    const returned=roomMarkup('wardrobe',0,undefined,pilot.id,{away:receptionAway(r)});
    assert.equal((returned.match(/id="home-animal-/g)||[]).length,3);
  }
});
