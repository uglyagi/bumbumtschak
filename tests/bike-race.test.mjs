import test from 'node:test';
import assert from 'node:assert/strict';
import { BIKE_DOOR, BIKE_FINISH, BIKE_LANES, createBikeRace, startBikeRace, changeBikeLane, tickBikeRace, bikeRank, bikeTime, isBikeTrack, touchingBikeDoor, cleanBikeScores, addBikeScore } from '../bike-race.js';
import { bikeRaceMarkup, bikeTerrainMarkup, bikeRiderPose } from '../bike-art.js';
const tick=(race,time,keys)=>{for(let t=0;t<time-1e-8;t+=1/120)tickBikeRace(race,Math.min(1/120,time-t),keys);};
const alone=race=>{for(const r of race.riders)if(r!==race.player){r.finished=true;r.finishTime=99999;r.x=-1000;}return race;};
test('four lanes; selected character races the other three animals',()=>{
 for(const id of ['cat','dog','horse','monkey']){const r=createBikeRace(id);assert.equal(r.player.id,id);assert.equal(new Set(r.riders.map(r=>r.id)).size,4);assert.equal(r.riders.length,4);r.start();r.changeLane(1);r.changeLane(1);assert.equal(r.player.lane,3);for(let i=0;i<6;i++)r.changeLane(-1);assert.equal(r.player.lane,0);}
});
test('right accelerates; release coasts; left brakes; no reversing',()=>{
 const r=alone(createBikeRace());r.stones=[];r.ramps=[];r.start();tick(r,2,{right:true});assert(r.player.speed>170);const fast=r.player.speed;tick(r,.5,{});assert(r.player.speed<fast&&r.player.speed>fast-10);tick(r,2,{left:true});assert.equal(r.player.speed,0);const x=r.player.x;tick(r,2,{left:true});assert.equal(r.player.x,x);
});
test('stones cause a three-second fall while clock and opponents continue',()=>{
 const r=createBikeRace();r.start();r.player.x=760;r.player.lane=0;r.player.y=333;r.player.speed=180;r.step(.02,{right:true});assert(r.player.fall>0);assert.equal(r.falls,1);const x=r.player.x,t=r.elapsed,n=r.riders[1].x;tick(r,2.9,{right:true});assert.equal(r.player.x,x);assert(r.riders[1].x>n);assert(r.player.fall>0);tick(r,.15,{right:true});assert.equal(r.player.fall,0);assert(r.elapsed-t>=3);assert(r.player.speed>0);
});
test('ramps launch automatically; faster approach jumps farther',()=>{
 const lengths=[];
 for(const speed of [100,300]){const r=alone(createBikeRace());r.stones=[];r.start();r.player.x=940;r.player.speed=speed;let launch=null,max=0,land=null;for(let i=0;i<500;i++){r.step(1/120,{});max=Math.max(max,r.player.z);if(r.player.z>0&&launch===null)launch=r.player.x;if(launch!==null&&r.player.z===0){land=r.player.x;break;}}assert.equal(r.jumps,1);assert(max>50);assert(land>launch);lengths.push(land-launch);}assert(lengths[1]>lengths[0]*2);
});
test('airborne riders clear a stone; overtaking ground riders needs a different lane',()=>{
 const r=createBikeRace();r.start();r.ramps=[];r.player.x=760;r.player.speed=250;r.player.lane=0;r.player.y=333;r.player.z=100;r.player.vy=20;r.step(.1,{right:true});assert.equal(r.falls,0);
 const s=createBikeRace();s.start();s.stones=[];s.ramps=[];const other=s.riders[1];s.player.lane=other.lane;s.player.y=other.y;s.player.x=other.x-80;s.player.speed=320;s.step(.01,{right:true});assert(other.x-s.player.x>=84);s.changeLane(1);assert.notEqual(s.player.lane,other.lane);
});
test('pause freezes the race and stopwatch; finish produces a result',()=>{
 const r=alone(createBikeRace());r.start();r.phase='paused';tick(r,3,{right:true});assert.equal(r.elapsed,0);assert.equal(r.player.x,180);r.phase='racing';r.player.x=8498;r.player.speed=320;r.step(.02,{right:true});assert.equal(r.phase,'finished');assert.equal(r.rank(),1);const t=r.elapsed;tick(r,3,{right:true});assert.equal(r.elapsed,t);
});
test('all four animals can finish the full course with acceleration and lane changes',()=>{
 for(const id of ['cat','dog','horse','monkey']){const r=createBikeRace(id);r.start();for(let i=0;i<24000&&r.phase==='racing';i++){
  const p=r.player,nextRamp=r.ramps.find(s=>s.x>p.x-30&&s.x<p.x+420),stone=r.stones.find(s=>s.lane===p.lane&&s.x>p.x&&s.x<p.x+190);
  let target=nextRamp?nextRamp.lane:p.lane;
  if(stone&&!nextRamp&&p.z<20){target=[0,1,2,3].find(l=>!r.stones.some(s=>s.lane===l&&Math.abs(s.x-p.x)<250)&&!r.riders.some(q=>q!==p&&q.lane===l&&q.x>p.x&&q.x-p.x<150))??p.lane;}
  if(!nextRamp){const traffic=r.riders.find(q=>q!==p&&q.x>p.x&&q.x-p.x<220&&q.lane===p.lane);if(traffic)target=(p.lane+1)%4;}
  if(target!==p.lane)r.changeLane(Math.sign(target-p.lane));r.step(1/120,{right:true});
 }assert.equal(r.phase,'finished',id);assert(r.jumps>0);assert(r.elapsed<120);}
});
test('finish order uses finish times, not overshoot distance',()=>{const r=createBikeRace();r.player.finished=true;r.player.finishTime=60;r.player.x=8502;for(let i=1;i<4;i++){r.riders[i].finished=true;r.riders[i].finishTime=45+i;r.riders[i].x=8500;}assert.equal(r.rank(),4);});

test('the cassette opens only the right speaker and malformed time steps leave the race unchanged',()=>{
 for(const track of [{id:'fahrradfahren'},{title:'Fahrradfahrn'},{title:'Fahradfahren'}]) assert(isBikeTrack(track));
 for(const track of [null,{id:'hut'},{title:'Beste Freunde'},{title:'Schokolade'}]) assert(!isBikeTrack(track));
 assert(touchingBikeDoor(BIKE_DOOR));assert(!touchingBikeDoor({x:679,y:493}));
 const r=createBikeRace('invalid');assert.equal(r.player.id,'cat');assert.equal(tickBikeRace(r,1),null);assert(startBikeRace(r));assert(!startBikeRace(r));
 for(const dt of [NaN,Infinity,-1,0])assert.equal(tickBikeRace(r,dt,{right:true}),null);
 assert.equal(r.elapsed,0);changeBikeLane(r,1);assert.equal(r.player.lane,3);
});
test('the landscape scrolls horizontally and the same animal body sits on a small bicycle with a hat',()=>{
 const r=createBikeRace('monkey'),before=bikeTerrainMarkup(r);r.camera=700;
 const after=bikeTerrainMarkup(r);assert.notEqual(before,after);assert(after.includes('Home sweet Home'));
 const svg=bikeRaceMarkup(r,'monkey',{},true);
 assert(svg.includes('href="#dressed-monkey-seated"'));assert(!svg.includes('href="#animal-monkey" x="-60"'));
 for(const animal of ['cat','dog','horse'])assert(svg.includes('href="#animal-'+animal+'-seated"'));
 assert(svg.includes('bike-leg-front-monkey'));assert(svg.includes('bike-wheel-front-monkey'));
 assert(!svg.includes('data-character'));assert(!svg.includes('data-bike-level'));assert(!svg.includes('data-bicycle'));
 assert.equal(BIKE_LANES.length,4);assert(!bikeRiderPose(r,r.player).lift.includes('rotate(180'));
});
test('one local top ten stores tenths and safely cleans names and previous-course scores',()=>{
 assert.equal(bikeTime(19.65),'19,7 s');assert.equal(bikeTime(63.24),'63,2 s');
 let scores=addBikeScore(null,'Katze',60.14,4);scores=addBikeScore(scores,'Hund',55.42,1);
 assert.deepEqual(scores.map(s=>s.name),['Hund','Katze']);assert.equal(scores[0].time,554);assert.equal(scores[1].place,4);
 for(let i=0;i<15;i++)scores=addBikeScore(scores,'Radler '+i,80+i,2);assert.equal(scores.length,10);
 assert.deepEqual(cleanBikeScores({leicht:[{name:'Old',time:590}]}),[]);
 assert.deepEqual(cleanBikeScores([{name:'Bad',time:NaN},{name:'Bad',time:-1}]),[]);
 assert.equal(addBikeScore([], 'a'.repeat(100),40)[0].name.length,18);
 assert.equal(addBikeScore([], '\u0000',40,99)[0].name,'Gast');
 const r=createBikeRace();r.player.finished=true;r.player.finishTime=10;assert.equal(bikeRank(r),1);assert.equal(BIKE_FINISH,8500);
});
