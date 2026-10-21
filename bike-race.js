// Four lanes, three friendly encounters and separate times for each difficulty.
export const BIKE_WIDTH = 1100, BIKE_HEIGHT = 650, BIKE_FINISH = 25500;
export const BIKE_LANES = [333, 396, 459, 522];
export const BIKE_DOOR = { x: 924, y: 493 };
export const BIKE_RETURN = { x: 924, y: 550 };
export const BIKE_LEVELS = {
  leicht: { speed: 320, factor: 1, kmh: 15, extraStones: 0 },
  mittel: { speed: 432, factor: 1.35, kmh: 22, extraStones: 27 },
  schwer: { speed: 544, factor: 1.7, kmh: 30, extraStones: 63 },
};
export const BIKE_RECOVERY_SECONDS = 3, BIKE_CRASH_DRIFT = 60;
export const BIKE_ENCOUNTERS = [1200, BIKE_FINISH / 3, BIKE_FINISH * 2 / 3];
const DEFAULT_RACERS = ['cat', 'dog', 'horse', 'monkey'].map(id => ({ id }));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const isBikeTrack = track => !!track && /fah?rr?ad|fahrradfahrn|radfahr/i.test(String(track.id || '') + ' ' + String(track.title || ''));
export const touchingBikeDoor = position => Math.abs(position.x - BIKE_DOOR.x) < 36 && position.y < 516 && position.y > 465;
export const bikeTime = seconds => (Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 10) / 10).toFixed(1).replace('.', ',') + ' s';
const BASE_RAMPS = [{x:920,lane:2},{x:2000,lane:0},{x:3100,lane:3},{x:4200,lane:1},{x:5350,lane:2},{x:6500,lane:0},{x:7600,lane:3}];
const BASE_STONES = [{x:780,lane:0},{x:1070,lane:2},{x:1390,lane:1},{x:1740,lane:3},{x:2150,lane:0},{x:2530,lane:2},{x:2840,lane:0},{x:3250,lane:3},{x:3610,lane:1},{x:3900,lane:2},{x:4350,lane:1},{x:4740,lane:0},{x:5010,lane:3},{x:5500,lane:2},{x:5830,lane:1},{x:6170,lane:3},{x:6650,lane:0},{x:7030,lane:2},{x:7380,lane:1},{x:7750,lane:3},{x:8110,lane:0}];
const extendCourse = objects => Array.from({length:3},(_,part)=>objects.map(item=>({...item,x:item.x+part*8500,lane:(item.lane+part)%4}))).flat();
function courseStones(level) {
  const stones = extendCourse(BASE_STONES);
  for (let i=0;i<BIKE_LEVELS[level].extraStones;i++) {
    const x = Math.round(1250 + i * (BIKE_FINISH - 1900) / BIKE_LEVELS[level].extraStones);
    const lanes = Array.from({length:4},(_,j)=>(i*3+j)%4);
    // Never stack nearby rocks in one lane or block more than two lanes at once.
    const lane = lanes.find(l=>!stones.some(s=>s.lane===l && Math.abs(s.x-x)<140));
    if (lane !== undefined && stones.filter(s=>Math.abs(s.x-x)<145).length<2) stones.push({x,lane});
  }
  return stones.sort((a,b)=>a.x-b.x);
}
class Race {
  constructor(animal, animals, difficulty) {
    this.difficulty=difficulty; this.phase='ready'; this.elapsed=0; this.camera=0; this.jumps=0; this.falls=0;
    const make=(id,x,lane,ai=false)=>({id,x,prevX:x,lane,y:BIKE_LANES[lane],speed:0,z:0,vy:0,fall:0,crash:null,crank:0,ai,active:!ai,departed:false,started:!ai,met:false,finished:false,finishTime:null,seen:new Set(),safe:0,flash:0});
    this.player=make(animal,180,2);
    this.riders=[this.player,...animals.filter(a=>a.id!==animal).slice(0,3).map((a,i)=>({...make(a.id,BIKE_ENCOUNTERS[i],[2,1,3][i],true),encounterAt:BIKE_ENCOUNTERS[i]}))];
    this.ramps=extendCourse(BASE_RAMPS); this.stones=courseStones(difficulty);
  }
  start() { if (this.phase==='ready') this.phase='racing'; }
  changeLane(delta) { if (this.phase==='racing' && !this.player.fall) this.player.lane=clamp(this.player.lane+delta,0,3); }
  step(elapsed,keys={}) {
    if (this.phase!=='racing') return;
    const settings=BIKE_LEVELS[this.difficulty];
    let remaining=Math.min(Math.max(elapsed,0),.25);
    while (remaining>1e-7 && this.phase==='racing') {
      const dt=Math.min(remaining,1/120); remaining-=dt; this.elapsed+=dt;
      for (const rider of this.riders) {
        if (rider.ai) {
          if (rider.departed) continue;
          if (!rider.active && this.player.x>=rider.encounterAt-750) {
            rider.active=true; rider.started=true; rider.speed=settings.speed*.8; rider.met=true;
          }
          if (!rider.active) continue;
          if (this.player.x-rider.x>450 || rider.met && rider.x-this.player.x>1000) { rider.departed=true; rider.active=false; continue; }
        }
        if (rider.finished) continue;
        rider.prevX=rider.x; rider.safe=Math.max(0,rider.safe-dt); rider.flash=Math.max(0,rider.flash-dt);
        if (rider.fall>0) {
          rider.fall=Math.max(0,rider.fall-dt);
          if (!rider.fall) {
            rider.x+=rider.crash?.offset || 0; rider.prevX=rider.x; rider.crash=null; rider.safe=1.1;
          }
          continue;
        }
        if (rider.ai) {
          rider.speed=settings.speed*.8;
          const danger=this.stones.find(s=>s.lane===rider.lane && s.x-rider.x>35 && s.x-rider.x<rider.speed*.72+40);
          const ramp=this.ramps.some(r=>r.lane===rider.lane && r.x+40>rider.x && (!danger || r.x<danger.x) && r.x-rider.x<190);
          if (danger && !ramp && rider.z<4) {
            const safe=[rider.lane-1,rider.lane+1].find(l=>l>=0 && l<4 && !this.stones.some(s=>s.lane===l && Math.abs(s.x-rider.x)<190) && !this.riders.some(r=>r!==rider && r.active && r.lane===l && Math.abs(r.x-rider.x)<90));
            if (safe!==undefined) rider.lane=safe;
          }
        } else rider.speed=clamp(rider.speed+(keys.left?-215:keys.right?88:0)*settings.factor*dt,0,settings.speed);
        rider.x+=rider.speed*dt; rider.y+=(BIKE_LANES[rider.lane]-rider.y)*Math.min(1,dt*13); rider.crank+=rider.speed*dt/23;
        if (rider.z>0 || rider.vy>0) { rider.z+=rider.vy*dt; rider.vy-=880*dt; if (rider.z<=0) { rider.z=0; rider.vy=0; rider.flash=.15; } }
        for (const ramp of this.ramps) {
          if (rider.seen.has(ramp.x) || Math.abs(rider.y-BIKE_LANES[ramp.lane])>23) continue;
          if (rider.prevX<ramp.x+32 && rider.x>=ramp.x+32 && rider.z===0) {
            rider.seen.add(ramp.x);
            if (rider.speed>60) { rider.z=27; rider.vy=285+rider.speed*.45; if (!rider.ai) this.jumps++; }
          }
        }
        if (!rider.safe && rider.z<28 && this.stones.some(s=>Math.abs(s.x-rider.x)<28 && Math.abs(BIKE_LANES[s.lane]-rider.y)<24)) {
          rider.speed=0; rider.fall=BIKE_RECOVERY_SECONDS; rider.crash={offset:Math.max(0,Math.min(BIKE_CRASH_DRIFT,BIKE_FINISH-1-rider.x))};
          rider.z=0; rider.vy=0; if (!rider.ai) this.falls++;
        }
        if (!rider.ai && rider.x>=BIKE_FINISH) { rider.finished=true; rider.finishTime=this.elapsed; this.phase='finished'; }
      }
      const p=this.player;
      if (!p.fall && !p.finished) for (const other of this.riders) {
        if (other!==p && other.active && !other.fall && other.x>p.x && other.x-p.x<60 && Math.abs(other.y-p.y)<23 && Math.abs(other.z-p.z)<28) {
          p.x=other.x-60; p.speed=Math.min(p.speed,other.speed);
        }
      }
      this.camera+=(Math.max(0,p.x-275)-this.camera)*Math.min(1,dt*8);
    }
  }
}
export function createBikeRace(animal='cat',animals=DEFAULT_RACERS,difficulty='leicht') {
  const cast=DEFAULT_RACERS.map(base=>animals.find(item=>item.id===base.id)||base);
  return new Race(cast.some(item=>item.id===animal)?animal:'cat',cast,Object.hasOwn(BIKE_LEVELS,difficulty)?difficulty:'leicht');
}
export function startBikeRace(race) { if (!race || race.phase!=='ready') return false; race.start(); return true; }
export function changeBikeLane(race,delta) { if (race && Number.isFinite(delta)) race.changeLane(Math.sign(delta)); }
export function tickBikeRace(race,elapsed,input={}) {
  if (!race || race.phase!=='racing' || !Number.isFinite(elapsed) || elapsed<=0) return null;
  const falls=race.falls; race.step(elapsed,input);
  return race.phase==='finished'?'finish':race.falls>falls?'fall':null;
}
export const bikeEncounterCount = race => race.riders.filter(r=>r.ai && r.met).length;
export const bikeKmh = race => Math.round(clamp(race.player.speed/BIKE_LEVELS[race.difficulty].speed,0,1)*BIKE_LEVELS[race.difficulty].kmh);
const cleanTimes = saved => (Array.isArray(saved)?saved:[])
  .filter(item=>typeof item?.name==='string' && Number.isFinite(item.time) && item.time>0 && item.time<864000)
  .map(item=>({name:item.name.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,18)||'Gast',time:Math.max(1,Math.round(item.time))}))
  .sort((a,b)=>a.time-b.time).slice(0,10);
export function cleanBikeScores(saved) { return Object.fromEntries(Object.keys(BIKE_LEVELS).map(level=>[level,cleanTimes(saved?.[level])])); }
export function addBikeScore(scores,level,name,seconds) {
  const clean=cleanBikeScores(scores);
  if (!Object.hasOwn(BIKE_LEVELS,level) || !Number.isFinite(seconds) || seconds<=0) return clean;
  clean[level]=cleanTimes([...clean[level],{name:typeof name==='string'?name:'Gast',time:Math.max(1,Math.round(seconds*10))}]);
  return clean;
}
