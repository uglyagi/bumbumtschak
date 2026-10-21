// One horizontal race, four lanes, three opponents and no outdoor rewards.
export const BIKE_WIDTH = 1100, BIKE_HEIGHT = 650, BIKE_FINISH = 8500;
export const BIKE_LANES = [333, 396, 459, 522];
export const BIKE_DOOR = { x: 924, y: 493 };
export const BIKE_RETURN = { x: 924, y: 550 };
const LANES = BIKE_LANES, FINISH = BIKE_FINISH;
const DEFAULT_RACERS = ['cat', 'dog', 'horse', 'monkey'].map(id => ({ id }));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const isBikeTrack = track => !!track && /fah?rr?ad|fahrradfahrn|radfahr/i.test(String(track.id || '') + ' ' + String(track.title || ''));
export const touchingBikeDoor = position => Math.abs(position.x - BIKE_DOOR.x) < 36 && position.y < 516 && position.y > 465;
export const bikeTime = seconds => (Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 10) / 10).toFixed(1).replace('.', ',') + ' s';
class Race{
 constructor(animal='cat', animals=DEFAULT_RACERS){
  this.phase='ready';this.elapsed=0;this.camera=0;this.jumps=0;this.falls=0;this.particles=[];
  const make=(id,x,lane,ai=false)=>({id,x,prevX:x,lane,y:LANES[lane],speed:0,z:0,vy:0,fall:0,crank:0,ai,finished:false,finishTime:null,seen:new Set(),safe:0,flash:0});
  this.player=make(animal,180,2);
  this.riders=[this.player,...animals.filter(a=>a.id!==animal).slice(0,3).map((a,i)=>make(a.id,350+i*145,[1,3,0][i],true))];
  this.ramps=[{x:920,lane:2},{x:2000,lane:0},{x:3100,lane:3},{x:4200,lane:1},{x:5350,lane:2},{x:6500,lane:0},{x:7600,lane:3}];
  this.stones=[{x:780,lane:0},{x:1070,lane:2},{x:1390,lane:1},{x:1740,lane:3},{x:2150,lane:0},{x:2530,lane:2},{x:2840,lane:0},{x:3250,lane:3},{x:3610,lane:1},{x:3900,lane:2},{x:4350,lane:1},{x:4740,lane:0},{x:5010,lane:3},{x:5500,lane:2},{x:5830,lane:1},{x:6170,lane:3},{x:6650,lane:0},{x:7030,lane:2},{x:7380,lane:1},{x:7750,lane:3},{x:8110,lane:0}];
 }
 start(){if(this.phase==='ready')this.phase='racing';}
 changeLane(delta){if(this.phase!=='racing'||this.player.fall>0)return;this.player.lane=clamp(this.player.lane+delta,0,3);}
 step(elapsed,keys={}){
  if(this.phase!=='racing')return;
  let remaining=Math.min(Math.max(elapsed,0),.25);
  while(remaining>1e-7&&this.phase==='racing'){
   const dt=Math.min(remaining,1/120);remaining-=dt;this.elapsed+=dt;
   for(const rider of this.riders){
    if(rider.finished){rider.x+=rider.speed*dt;continue;}
    rider.prevX=rider.x;rider.safe=Math.max(0,rider.safe-dt);rider.flash=Math.max(0,rider.flash-dt);
    if(rider.fall>0){rider.fall=Math.max(0,rider.fall-dt);if(!rider.fall)rider.safe=1.1;continue;}
    if(rider.ai){
     const index=this.riders.indexOf(rider),target=244+index*9+Math.sin(this.elapsed*.7+index)*12;
     rider.speed+=clamp(target-rider.speed,-180*dt,64*dt);
     const danger=this.stones.find(s=>s.lane===rider.lane&&s.x-rider.x>35&&s.x-rider.x<rider.speed*.72+40);
     const traffic=this.riders.find(r=>r!==rider&&r.x>rider.x&&r.x-rider.x<160&&Math.abs(r.y-rider.y)<24);
     const ramp=this.ramps.some(r=>r.lane===rider.lane&&r.x+40>rider.x&&(!danger||r.x<danger.x)&&r.x-rider.x<190);
     if((danger||traffic)&&!ramp&&rider.z<4){
      const lanes=[rider.lane-1,rider.lane+1].filter(l=>l>=0&&l<4);
      const safe=lanes.find(l=>!this.stones.some(s=>s.lane===l&&Math.abs(s.x-rider.x)<190)&&!this.riders.some(r=>r!==rider&&r.lane===l&&Math.abs(r.x-rider.x)<90));
      if(safe!==undefined)rider.lane=safe;
     }
    }else rider.speed=clamp(rider.speed+(keys.left?-215:keys.right?88:-10)*dt,0,320);
    rider.x+=rider.speed*dt;rider.y+=(LANES[rider.lane]-rider.y)*Math.min(1,dt*13);rider.crank+=rider.speed*dt/23;
    if(rider.z>0||rider.vy>0){rider.z+=rider.vy*dt;rider.vy-=880*dt;if(rider.z<=0){rider.z=0;rider.vy=0;rider.flash=.15;}}
    for(const ramp of this.ramps){
     if(rider.seen.has(ramp.x)||Math.abs(rider.y-LANES[ramp.lane])>23)continue;
     if(rider.prevX<ramp.x+32&&rider.x>=ramp.x+32&&rider.z===0){
      rider.seen.add(ramp.x);
      if(rider.speed>60){rider.z=27;rider.vy=285+rider.speed*.45;if(!rider.ai)this.jumps++;}
     }
    }
    if(!rider.safe&&rider.z<28&&this.stones.some(s=>Math.abs(s.x-rider.x)<28&&Math.abs(LANES[s.lane]-rider.y)<24)){
     rider.speed=0;rider.fall=3;rider.z=0;rider.vy=0;if(!rider.ai)this.falls++;
    }
    if(rider.x>=FINISH){rider.finished=true;rider.finishTime=this.elapsed;if(!rider.ai)this.phase='finished';}
   }
   const p=this.player;
   if(!p.fall&&!p.finished)for(const other of this.riders){if(other!==p&&!other.fall&&!other.finished&&other.x>p.x&&other.x-p.x<85&&Math.abs(other.y-p.y)<23&&Math.abs(other.z-p.z)<28){p.x=other.x-85;p.speed=Math.min(p.speed,other.speed*.82);}}
   this.camera+=(Math.max(0,this.player.x-275)-this.camera)*Math.min(1,dt*8);
  }
 }
 rank(){const p=this.player;return 1+this.riders.filter(r=>r!==p&&(p.finished?r.finished&&r.finishTime!==null&&r.finishTime<p.finishTime:r.finished||r.x>p.x)).length;}
}

export function createBikeRace(animal = 'cat', animals = DEFAULT_RACERS) {
  const cast = DEFAULT_RACERS.map(base => animals.find(item => item.id === base.id) || base);
  return new Race(cast.some(item => item.id === animal) ? animal : 'cat', cast);
}
export function startBikeRace(race) { if (!race || race.phase !== 'ready') return false; race.start(); return true; }
export function changeBikeLane(race, delta) { if (race) race.changeLane(Math.sign(delta)); }
export function tickBikeRace(race, elapsed, input = {}) {
  if (!race || race.phase !== 'racing' || !Number.isFinite(elapsed) || elapsed <= 0) return null;
  const falls = race.falls;
  race.step(elapsed, input);
  return race.phase === 'finished' ? 'finish' : race.falls > falls ? 'fall' : null;
}
export const bikeRank = race => race.rank();
export function cleanBikeScores(saved) {
  return (Array.isArray(saved) ? saved : []).filter(item => typeof item?.name === 'string' && Number.isFinite(item.time) && item.time > 0 && item.time < 864000)
    .map(item => ({ name: item.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 18) || 'Gast', time: Math.max(1, Math.round(item.time)), place: clamp(Math.round(Number(item.place) || 1), 1, 4) }))
    .sort((a, b) => a.time - b.time).slice(0, 10);
}
export function addBikeScore(scores, name, seconds, place = 1) {
  const clean = cleanBikeScores(scores);
  if (!Number.isFinite(seconds) || seconds <= 0) return clean;
  return cleanBikeScores([...clean, { name: typeof name === 'string' ? name : 'Gast', time: Math.max(1, Math.round(seconds * 10)), place }]);
}
