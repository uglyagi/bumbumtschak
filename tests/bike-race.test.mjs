import test from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_LEVELS, BIKE_FINISH, BIKE_RIDER_Y, BIKE_DOOR, BIKE_PARKING, createBikeRace, startBikeRace, tickBikeRace, bikeRoadCenter, bikeTime, isBikeTrack, touchingBikeDoor, createBikeGarage, savedBikeGarage, unlockBicycle, nearbyBicycle, moveWorldBicycle, cleanBikeScores, addBikeScore } from '../bike-race.js';
import { bikeRaceMarkup, bikeTerrainMarkup, bikeRiderTransform, bicycleMarkup, parkedBicyclesMarkup } from '../bike-art.js';

test('cycling recordings open only the right speaker entrance', () => {
  for (const track of [{id:'fahrradfahren'}, {title:'Fahrradfahrn'}, {title:'Fahradfahren'}]) assert(isBikeTrack(track));
  for (const track of [null,{id:'hut'},{title:'Beste Freunde'},{title:'Schokolade'}]) assert(!isBikeTrack(track));
  assert(touchingBikeDoor(BIKE_DOOR)); assert(!touchingBikeDoor({x:679,y:493}));
});

test('difficulty increases speed and stone count and every course keeps an open way around stones', () => {
  const levels = Object.keys(BIKE_LEVELS);
  for (let i=0;i<levels.length;i++) {
    const level=levels[i],race=createBikeRace(level,42),settings=BIKE_LEVELS[level];
    assert.equal(race.rocks.length,settings.rocks);
    assert.deepEqual(race.rocks,createBikeRace(level,42).rocks);
    for(const rock of race.rocks) {
      assert(rock.distance>300 && rock.distance<BIKE_FINISH-100);
      assert(Math.abs(rock.x-bikeRoadCenter(rock.distance))+rock.radius<settings.halfWidth);
    }
    if(i){assert(settings.speed>BIKE_LEVELS[levels[i-1]].speed);assert(settings.rocks>BIKE_LEVELS[levels[i-1]].rocks);}
  }
});

test('the front-facing race scrolls upcoming stones from the bottom toward the top', () => {
  const race=createBikeRace();race.rocks=[{id:0,distance:400,x:500,radius:22}];
  const first=bikeTerrainMarkup(race),startY=BIKE_RIDER_Y+400;
  assert(first.includes('translate(500.0 '+startY.toFixed(1)+')'));
  race.progress=120;
  assert(bikeTerrainMarkup(race).includes('translate(500.0 '+(startY-120).toFixed(1)+')'));
  const svg=bikeRaceMarkup(race,'monkey',{},true);
  assert(svg.includes('href="#dressed-monkey"'));assert(!bikeRiderTransform(race).includes('rotate(180'));
});

test('hitting a stone or leaving the road costs three seconds with no forward movement', () => {
  for(const type of ['rock','edge']) {
    const race=createBikeRace();race.rocks=type==='rock'?[{id:0,distance:3,x:500,radius:22}]:[];
    startBikeRace(race);if(type==='edge')race.x=900;
    assert.equal(tickBikeRace(race,.01),'fall');assert.equal(race.falls,1);assert.equal(race.fall,3);
    const progress=race.progress,clock=race.elapsed;
    for(let i=0;i<30;i++)tickBikeRace(race,.1);
    assert(Math.abs(race.progress-progress)<1e-6);assert(Math.abs(race.elapsed-clock-3)<1e-6);
    assert.equal(race.fall,0);assert.equal(race.x,bikeRoadCenter(progress));
    tickBikeRace(race,.1);assert(race.progress>progress);
  }
});

test('every difficulty can be completed by steering only left and right', () => {
  for(const level of Object.keys(BIKE_LEVELS)){
    const race=createBikeRace(level);startBikeRace(race);let frames=0,event=null;
    while(race.phase==='racing'&&frames++<15000){
      const rock=race.rocks.find(r=>r.distance>=race.progress-30&&r.distance<race.progress+140&&!race.hit.includes(r.id));
      const target=rock?bikeRoadCenter(rock.distance)+(rock.x>bikeRoadCenter(rock.distance)?-1:1)*70:bikeRoadCenter(race.progress+40);
      const direction=Math.abs(target-race.x)<3?0:Math.sign(target-race.x);
      event=tickBikeRace(race,1/60,direction);
    }
    assert.equal(race.phase,'finished');assert.equal(event,'finish');
    assert.equal(tickBikeRace(race,.1,1),null);assert(race.elapsed>0);
  }
});

test('a finished stopwatch keeps tenths, ranks by difficulty and sanitizes local names', () => {
  assert.equal(bikeTime(19.65),'19,7 s');assert.equal(bikeTime(63.24),'63,2 s');
  let scores=addBikeScore(null,'leicht','Katze',60.14);
  scores=addBikeScore(scores,'leicht','Hund',55.42);scores=addBikeScore(scores,'schwer','Affe',37.93);
  assert.deepEqual(scores.leicht.map(s=>s.name),['Hund','Katze']);assert.equal(scores.schwer[0].time,379);
  for(let i=0;i<15;i++)scores=addBikeScore(scores,'mittel','Radler '+i,80+i);
  assert.equal(scores.mittel.length,10);
  assert.deepEqual(cleanBikeScores({leicht:[{name:'Bad',time:NaN},{name:'Bad',time:-1}]}).leicht,[]);
  assert.equal(addBikeScore(scores,'schwer','a'.repeat(100),40).schwer[1].name.length,18);
});

test('each level unlocks its own bicycle, persists it, and parks it outside Home sweet Home', () => {
  const garage=createBikeGarage({unlocked:9});assert.deepEqual(garage.unlocked,[]);
  for(const level of Object.keys(BIKE_LEVELS))unlockBicycle(garage,level);
  unlockBicycle(garage,'leicht');assert.equal(garage.unlocked.length,3);
  const restored=createBikeGarage(savedBikeGarage(garage));
  for(const level of restored.unlocked){
    assert.equal(nearbyBicycle(restored,BIKE_PARKING[level]).level,level);
    assert(parkedBicyclesMarkup(restored).includes('data-bicycle="'+level+'"'));
  }
  assert.notEqual(bicycleMarkup('leicht'),bicycleMarkup('mittel'));assert.notEqual(bicycleMarkup('mittel'),bicycleMarkup('schwer'));
});

test('world cycling stops on contact, dismounts the rider and requires mounting again', () => {
  const garage=createBikeGarage({unlocked:['schwer']});garage.riding='schwer';
  const moved=moveWorldBicycle(garage,{x:0,y:0},1,0,.05,p=>p.x<12);
  assert(moved.crashed);assert(moved.position.x<12);assert.equal(garage.riding,null);
  assert(garage.fall>0);assert.equal(nearbyBicycle(garage,moved.position),null);
  garage.fall=0;assert.equal(nearbyBicycle(garage,moved.position).level,'schwer');
});
