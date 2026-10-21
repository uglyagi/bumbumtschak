import test from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_DOOR, BIKE_FINISH, BIKE_LANES, BIKE_LEVELS, BIKE_ENCOUNTERS, BIKE_RECOVERY_SECONDS, createBikeRace, startBikeRace, changeBikeLane, tickBikeRace, bikeKmh, bikeEncounterCount, bikeTime, isBikeTrack, touchingBikeDoor, cleanBikeScores, addBikeScore } from '../bike-race.js';
import { bikeRaceMarkup, bikeTerrainMarkup, bikeRiderPose, bikeCrashPose } from '../bike-art.js';
const tick=(race,time,keys)=>{for(let t=0;t<time-1e-8;t+=1/120)tickBikeRace(race,Math.min(1/120,time-t),keys);};
const alone=race=>{for(const r of race.riders)if(r!==race.player){r.departed=true;r.active=false;}return race;};

test('every selected animal keeps four lanes and meets each of the other animals once',()=>{
 for(const id of ['cat','dog','horse','monkey']){
  const r=createBikeRace(id);assert.equal(r.player.id,id);assert.equal(new Set(r.riders.map(r=>r.id)).size,4);assert.equal(r.riders.length,4);
  assert(r.riders.slice(1).every(r=>!r.active));assert.equal(bikeEncounterCount(r),0);
  startBikeRace(r);changeBikeLane(r,1);changeBikeLane(r,1);assert.equal(r.player.lane,3);for(let i=0;i<6;i++)changeBikeLane(r,-1);assert.equal(r.player.lane,0);
 }
});
test('easy keeps the previous physical pace, has a three-times-longer course and never displays more than 15 km/h',()=>{
 const r=alone(createBikeRace());r.stones=[];r.ramps=[];startBikeRace(r);
 tick(r,2,{right:true});assert(r.player.speed>170 && r.player.speed<180);
 tick(r,3,{right:true});assert.equal(r.player.speed,320);assert.equal(bikeKmh(r),15);
 assert.equal(BIKE_FINISH,8500*3);assert.equal(r.ramps.length,0);
 while(r.phase==='racing')tickBikeRace(r,.1,{right:true});
 const oldUnobstructedTime=(8500-180)/320+320/(2*88);
 assert(r.elapsed/oldUnobstructedTime>2.85 && r.elapsed/oldUnobstructedTime<3.1);
 r.player.speed=99999;assert.equal(bikeKmh(r),15);
});
test('the two higher levels are faster, show 22 and 30 km/h and add rocks without sealing the road',()=>{
 const levels=Object.keys(BIKE_LEVELS),speeds=[],stoneCounts=[];
 for(const level of levels){
  const r=createBikeRace('cat',undefined,level);stoneCounts.push(r.stones.length);assert.equal(r.ramps.length,21);
  assert(r.stones.every(s=>s.x>300 && s.x<BIKE_FINISH-200 && s.lane>=0 && s.lane<4));
  for(const stone of r.stones){const blocked=new Set(r.stones.filter(s=>Math.abs(s.x-stone.x)<145).map(s=>s.lane));assert(blocked.size<4);}
  alone(r);r.stones=[];r.ramps=[];startBikeRace(r);tick(r,4,{right:true});speeds.push(r.player.speed);
  assert.equal(bikeKmh(r),{leicht:15,mittel:22,schwer:30}[level]);
 }
 assert(speeds[1]>speeds[0] && speeds[2]>speeds[1]);assert.deepEqual(stoneCounts,[63,90,126]);
 assert.equal(createBikeRace('cat',undefined,'invalid').difficulty,'leicht');
});
test('right accelerates, release keeps the exact speed, left brakes and holding left never reverses',()=>{
 for(const level of Object.keys(BIKE_LEVELS)){
  const r=alone(createBikeRace('dog',undefined,level));r.stones=[];r.ramps=[];startBikeRace(r);tick(r,2,{right:true});const fast=r.player.speed;
  const before=r.player.x;tick(r,2,{});assert.equal(r.player.speed,fast);assert(Math.abs(r.player.x-before-fast*2)<1e-6);tick(r,2,{left:true});assert.equal(r.player.speed,0);const x=r.player.x;tick(r,2,{left:true});assert.equal(r.player.x,x);
 }
});
test('friends wait offscreen for their sections and appear already riding at 80 percent of each level maximum',()=>{
 for(const level of Object.keys(BIKE_LEVELS)){
  const r=createBikeRace('cat',undefined,level);r.stones=[];r.ramps=[];startBikeRace(r);tick(r,60,{});
  assert(r.riders.slice(1).every(friend=>friend.x===friend.encounterAt && !friend.active));
  assert(BIKE_ENCOUNTERS[0]<BIKE_FINISH*.07);assert.equal(BIKE_ENCOUNTERS[1],BIKE_FINISH/3);assert.equal(BIKE_ENCOUNTERS[2],BIKE_FINISH*2/3);
  for(const friend of r.riders.slice(1)){
   r.player.speed=0;r.player.x=friend.encounterAt-700;const before=friend.x;tick(r,.1,{});
   assert(friend.active && friend.started && friend.met);assert.equal(friend.speed,BIKE_LEVELS[level].speed*.8);assert(friend.x>before);
   const count=bikeEncounterCount(r);tick(r,.1,{});assert.equal(bikeEncounterCount(r),count,'a visible encounter counts once');
   r.player.x=friend.x+500;tick(r,.02,{});assert(friend.departed && !friend.active);
  }
  assert.equal(bikeEncounterCount(r),3);assert.equal(r.phase,'racing');assert(r.riders.slice(1).every(friend=>friend.finishTime===null));
 }
});
test('a friend can hold the player up in the same lane; a lane change or a jump allows passing',()=>{
 const r=createBikeRace();r.stones=[];r.ramps=[];startBikeRace(r);const friend=r.riders[1];
 r.player.x=friend.x-55;r.player.lane=friend.lane;r.player.y=friend.y;r.player.speed=320;tickBikeRace(r,.01,{right:true});
 assert(friend.active);assert(friend.x-r.player.x>=59);assert.equal(r.player.speed,BIKE_LEVELS.leicht.speed*.8);
 changeBikeLane(r,-1);tick(r,.35,{right:true});assert.notEqual(r.player.lane,friend.lane);
 r.player.x=friend.x-10;r.player.speed=320;r.player.z=100;r.player.vy=20;r.player.y=friend.y;
 tickBikeRace(r,.2,{right:true});assert(r.player.x>friend.x);assert.equal(r.falls,0);
});
test('hitting a rock costs three seconds while the stopwatch and a nearby friend keep moving',()=>{
 const r=createBikeRace();startBikeRace(r);const friend=r.riders[1];friend.active=true;friend.started=true;friend.x=1000;friend.speed=100;
 r.player.x=760;r.player.lane=0;r.player.y=333;r.player.speed=180;assert.equal(tickBikeRace(r,.02,{right:true}),'fall');
 const x=r.player.x,time=r.elapsed,friendX=friend.x;tick(r,2.9,{right:true});assert.equal(r.player.x,x);assert(r.player.fall>0);assert(friend.x>friendX);
 tick(r,.15,{right:true});assert.equal(r.player.fall,0);assert(r.elapsed-time>=3);assert(r.player.speed>0);
});
test('ramps launch automatically and a faster approach jumps farther',()=>{
 const lengths=[];
 for(const speed of [100,300]){const r=alone(createBikeRace());r.stones=[];startBikeRace(r);r.player.x=940;r.player.speed=speed;let launch=null,max=0,land=null;
  for(let i=0;i<500;i++){tickBikeRace(r,1/120,{});max=Math.max(max,r.player.z);if(r.player.z>0 && launch===null)launch=r.player.x;if(launch!==null && r.player.z===0){land=r.player.x;break;}}
  assert.equal(r.jumps,1);assert(max>50);assert(land>launch);lengths.push(land-launch);
 }
 assert(lengths[1]>lengths[0]*2);
});
test('pause freezes the clock; reaching the new finish wins regardless of any friend position',()=>{
 const r=createBikeRace();startBikeRace(r);r.phase='paused';tick(r,3,{right:true});assert.equal(r.elapsed,0);
 r.phase='racing';r.player.x=BIKE_FINISH-2;r.player.speed=320;r.stones=[];r.riders.slice(1).forEach(friend=>friend.x=BIKE_FINISH+1000);
 assert.equal(tickBikeRace(r,.02,{right:true}),'finish');assert.equal(r.phase,'finished');const time=r.elapsed;tick(r,3,{right:true});assert.equal(r.elapsed,time);
});
test('every animal can complete all three full courses, jump and encounter all three friends',()=>{
 for(const level of Object.keys(BIKE_LEVELS))for(const id of ['cat','dog','horse','monkey']){
  const r=createBikeRace(id,undefined,level);startBikeRace(r);
  for(let i=0;i<15000 && r.phase==='racing';i++){
   const p=r.player,nextRamp=r.ramps.find(s=>s.x>p.x-30 && s.x<p.x+420),stone=r.stones.find(s=>s.lane===p.lane && s.x>p.x && s.x<p.x+260);
   let target=nextRamp?nextRamp.lane:p.lane;
   if(stone && !nextRamp && p.z<20)target=[0,1,2,3].find(l=>!r.stones.some(s=>s.lane===l && Math.abs(s.x-p.x)<280) && !r.riders.some(q=>q.ai && q.active && q.lane===l && q.x>p.x && q.x-p.x<180))??p.lane;
   if(!nextRamp && r.riders.some(q=>q.ai && q.active && q.x>p.x && q.x-p.x<220 && q.lane===p.lane))target=(p.lane+1)%4;
   if(target!==p.lane)changeBikeLane(r,Math.sign(target-p.lane));tickBikeRace(r,1/60,{right:true});
  }
  assert.equal(r.phase,'finished',id+' / '+level);assert(r.jumps>0);assert.equal(bikeEncounterCount(r),3);assert(r.elapsed<250);
 }
});
test('the right speaker entrance, invalid time steps and invalid lane input stay safe',()=>{
 for(const track of [{id:'fahrradfahren'},{title:'Fahrradfahrn'},{title:'Fahradfahren'}])assert(isBikeTrack(track));
 for(const track of [null,{id:'hut'},{title:'Beste Freunde'},{title:'Schokolade'}])assert(!isBikeTrack(track));
 assert(touchingBikeDoor(BIKE_DOOR));assert(!touchingBikeDoor({x:679,y:493}));
 const r=createBikeRace('invalid');assert.equal(r.player.id,'cat');assert.equal(tickBikeRace(r,1),null);assert(startBikeRace(r));assert(!startBikeRace(r));
 for(const dt of [NaN,Infinity,-1,0])assert.equal(tickBikeRace(r,dt,{right:true}),null);
 assert.equal(r.elapsed,0);changeBikeLane(r,NaN);assert.equal(r.player.lane,2);
});
test('the small full-body riders, hats, scrolling landscape and HUD show encounters instead of a competition rank',()=>{
 const r=createBikeRace('monkey'),before=bikeTerrainMarkup(r);r.camera=700;assert.notEqual(before,bikeTerrainMarkup(r));
 const svg=bikeRaceMarkup(r,'monkey',{},true);
 assert(svg.includes('href="#dressed-monkey-right"'));for(const animal of ['cat','dog','horse'])assert(svg.includes('href="#animal-'+animal+'-right"'));
 assert(!svg.includes('bike-leg-'));assert(!svg.includes('bike-paw-'));assert(svg.includes('width="68" height="82"'));
 assert(svg.includes('id="bike-friends"'));assert(!svg.includes('id="bike-place"'));assert(svg.includes('0 / 3'));
 assert(!svg.includes('data-character'));assert(!svg.includes('data-bicycle'));assert.equal(BIKE_LANES.length,4);assert(!bikeRiderPose(r,r.player).lift.includes('rotate(180'));
});
test('each difficulty keeps a separate local top ten with tenths, clean names and no opponent placement',()=>{
 assert.equal(bikeTime(19.65),'19,7 s');assert.equal(bikeTime(63.24),'63,2 s');
 let scores=addBikeScore(null,'leicht','Katze',100.14);scores=addBikeScore(scores,'leicht','Hund',95.42);scores=addBikeScore(scores,'mittel','Pferd',72.54);
 assert.deepEqual(scores.leicht.map(s=>s.name),['Hund','Katze']);assert.equal(scores.leicht[0].time,954);assert.equal(scores.mittel[0].time,725);assert.equal(scores.schwer.length,0);assert(!Object.hasOwn(scores.leicht[0],'place'));
 for(let i=0;i<15;i++)scores=addBikeScore(scores,'schwer','Radler '+i,80+i);assert.equal(scores.schwer.length,10);
 assert.deepEqual(cleanBikeScores([{name:'Old course',time:590}]),{leicht:[],mittel:[],schwer:[]});
 assert.deepEqual(cleanBikeScores({leicht:[{name:'Bad',time:NaN},{name:'Bad',time:-1}]}).leicht,[]);
 assert.equal(addBikeScore([], 'leicht','a'.repeat(100),40).leicht[0].name.length,18);
 assert.equal(addBikeScore([], 'leicht','\u0000',40).leicht[0].name,'Gast');assert.deepEqual(addBikeScore(null,'invalid','Name',40),{leicht:[],mittel:[],schwer:[]});
});

test('a crash separates the original figure from its bicycle, then walks and mounts within three seconds without snapping back',()=>{
 const r=alone(createBikeRace());r.ramps=[];startBikeRace(r);r.player.x=760;r.player.lane=0;r.player.y=333;r.player.speed=180;
 assert.equal(tickBikeRace(r,.01,{right:true}),'fall');const origin=r.player.x;assert.equal(r.falls,1);assert.equal(r.player.speed,0);
 const initial=bikeCrashPose(r.player);assert(initial);assert.equal(initial.phase,'rolling');
 tick(r,.35,{right:true});const rolling=bikeCrashPose(r.player);
 const tx=transform=>Number(transform.match(/^translate\(([-\d.]+)/)[1]);
 assert(tx(rolling.body)<0 && tx(rolling.bicycle)>0,'the figure and bicycle roll in opposite directions');
 assert.notEqual(rolling.body,rolling.bicycle);assert.equal(r.player.x,origin);assert.equal(r.player.speed,0);
 const paused=bikeRiderPose(r,r.player);r.phase='paused';tick(r,1,{right:true});assert.deepEqual(bikeRiderPose(r,r.player),paused);r.phase='racing';
 tick(r,1.55,{});assert.equal(bikeCrashPose(r.player).phase,'walking');const walkingX=tx(bikeCrashPose(r.player).body);
 tick(r,.6,{});assert(tx(bikeCrashPose(r.player).body)>walkingX);
 tick(r,.35,{});assert.equal(bikeCrashPose(r.player).phase,'mounting');
 const end=bikeCrashPose(r.player),drift=r.player.crash.offset;assert(Math.abs(tx(end.body)-drift)<.1);assert(Math.abs(tx(end.bicycle)-drift)<.1);
 tick(r,.2,{});assert.equal(r.player.fall,0);assert.equal(r.player.crash,null);assert.equal(bikeCrashPose(r.player),null);
 assert(Math.abs(r.player.x-origin-drift)<.001,'the recovered rider stays at the rolled bicycle location');assert.equal(r.player.speed,0);assert.equal(BIKE_RECOVERY_SECONDS,3);
 tick(r,.1,{right:true});assert(r.player.speed>0 && r.player.x>origin+drift);
});

test('reduced motion keeps the same recovery period without rolling rotations',()=>{
 const r=createBikeRace();r.player.fall=2.5;r.player.crash={offset:60};
 const pose=bikeCrashPose(r.player,true);assert(pose.body.includes('rotate(0.00'));assert(pose.bicycle.includes('rotate(0.00'));
 assert.notEqual(pose.body,pose.bicycle);assert(!pose.body.includes('NaN'));assert(!pose.bicycle.includes('NaN'));
});

test('flowers keep their world position, height and color when the scrolling segment wraps',()=>{
 const flowers=cam=>{
  const r=createBikeRace();r.camera=cam;const result=new Map();
  for(const match of bikeTerrainMarkup(r).matchAll(/<use data-bike-flower="(-?\d+)" href="#flower" x="([\d.-]+)" y="([\d.-]+)"[^>]*style="color:([^"]+)"/g))result.set(Number(match[1]),{x:Number(match[2]),y:Number(match[3]),color:match[4]});
  return result;
 };
 for(const boundary of [120,240,360,1200,8500,17000]){
  const before=flowers(boundary-.2),after=flowers(boundary+.2);assert(before.size>=11 && after.size>=11);let shared=0;
  for(const [id,first]of before){const next=after.get(id);if(!next)continue;shared++;assert(Math.abs(next.x-first.x+.4)<.011);assert.equal(next.y,first.y);assert.equal(next.color,first.color);}
  assert(shared>=10,'only flowers outside the viewport are recycled');
 }
});
