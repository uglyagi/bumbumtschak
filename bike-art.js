import { defs } from './art.js';
import { text, PALETTE, ANIMALS } from './content.js';
import { escapeXML as escape } from './utils.js';
import { animalHref } from './hat-quest.js';
import { BIKE_WIDTH, BIKE_HEIGHT, BIKE_FINISH, BIKE_LANES, bikeTime, bikeRank } from './bike-race.js';

const n = value => Number(value).toFixed(2);
const palette = (id, fallback) => PALETTE.find(color => color.id === id)?.color || fallback;
const ink = '#101014';
const path = (d, fill = 'none', width = 3) => `<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
export function bikeDoorMarkup(open) {
  return open ? '<g data-room-target="bike-door" role="button" tabindex="0" aria-label="' + escape(text('bike_enter')) + '"><path d="M595 480V383a39 39 0 0 1 78 0v97Z" fill="#1238a8"/><path d="M602 480V383a32 32 0 0 1 64 0v97" fill="none" stroke="#fff20b" stroke-width="6"/><path d="M598 480h72v26h-72" fill="#fff6a3" stroke-width="3"/><rect x="562" y="309" width="144" height="32" rx="10" fill="#fffcee" stroke-width="3"/><text x="634" y="331" text-anchor="middle" stroke="none" font-size="20" font-weight="900">' + escape(text('bike_title')) + '</text><path d="m612 414 10-13 12 13 12-13 10 13" fill="none" stroke="#fff20b" stroke-width="4"/></g>' : '<circle cx="634" cy="394" r="47" fill="url(#speaker)"/>';
}
function house(x) {
  return `<g transform="translate(${n(x)} 280) scale(.62)" stroke="${ink}" stroke-width="4" stroke-linejoin="round"><rect x="-70" y="-87" width="140" height="87" rx="3" fill="#fff6a3"/><path d="M-82-87 0-145 83-87Z" fill="#ff3935"/><rect x="-15" y="-48" width="30" height="48" rx="3" fill="#1d55ff"/>${[-47,47].map(d => `<rect x="${d-12}" y="-61" width="24" height="25" rx="2" fill="#bde7ff"/><path d="M${d}-61v25m-12-13h24" fill="none"/>`).join('')}<text y="-69" text-anchor="middle" fill="${ink}" stroke="none" font-size="9" font-weight="900">Home sweet Home</text></g>`;
}
export function bikeTerrainMarkup(race, paint = {}) {
  const cam = race.camera, sky = escape(paint.sky || palette('blue-light','#bde7ff')), grass = escape(paint.grass || palette('green-light','#b5ed9b'));
  let result = `<rect width="1100" height="650" fill="${sky}"/><g transform="translate(975 145)">${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return path(`M${n(Math.cos(a)*41)} ${n(Math.sin(a)*41)} ${n(Math.cos(a)*53)} ${n(Math.sin(a)*53)}`);}).join('')}<circle r="31" fill="#fff20b" stroke="${ink}" stroke-width="4"/><ellipse cx="-10" cy="-4" rx="2.5" ry="4" fill="${ink}"/><ellipse cx="10" cy="-4" rx="2.5" ry="4" fill="${ink}"/>${path('M-8 9q8 8 16 0','none',2.5)}</g>`;
  for (let i=-1;i<4;i++) result += `<use href="#cloud" x="${n(((i*385-cam*.11)%1540+1540)%1540-120)}" y="${135+(i%2)*27}" width="100" height="40" style="color:#fffcef"/>`;
  result += path('M-1100 275Q-800 120-500 275Q-200 100 100 260Q400 110 700 260Q1000 90 1300 265L1300 650H-1100Z','#9ce29b');
  result += `<g transform="translate(${n(-cam*.17%1000)} 0)">${path('M-300 277Q-40 174 180 259Q400 162 640 266Q880 169 1110 262Q1390 180 1500 268V650H-300Z','#76ce88')}</g><rect y="265" width="1100" height="385" fill="${grass}"/>`;
  for (let i=-1;i<6;i++) { const x=i*315-cam*.32%315; result += i%3===1 ? house(x) : `<use href="#tree" x="${n(x-40)}" y="179" width="80" height="110" style="color:${palette('green','#4acb59')}"/>`; }
  result += `<path d="M0 276h1100" stroke="#fffcef" stroke-width="9"/><path d="M0 285h1100" stroke="${ink}" stroke-width="3"/>`;
  for (let i=-1;i<16;i++) result += `<rect x="${n(i*85-cam%85)}" y="262" width="8" height="37" rx="2" fill="#fffcef" stroke="${ink}" stroke-width="2"/>`;
  for (let i=0;i<4;i++) result += `<rect y="${294+i*66}" width="1100" height="66" fill="${i%2?'#ffefac':'#fff6c8'}"/>`;
  result += `<path d="M0 294h1100M0 558h1100" stroke="${ink}" stroke-width="5"/><path d="M0 360h1100M0 426h1100M0 492h1100" fill="none" stroke="#fffcef" stroke-width="4" stroke-dasharray="27 22" stroke-dashoffset="${n(cam%49)}"/>`;
  for (const mark of [{x:180,label:'START'},{x:BIKE_FINISH,label:text('bike_finish')}]) {
    const x=mark.x-cam; if(x < -70 || x > 1180) continue;
    result += `<g transform="translate(${n(x)} 0)"><rect x="-13" y="294" width="26" height="264" fill="#fffcef"/>${Array.from({length:20},(_,i)=>`<rect x="${-13+i%2*13}" y="${294+i*13}" width="13" height="13" fill="${ink}"/>`).join('')}<rect x="-42" y="253" width="84" height="29" rx="7" fill="${mark.x===180?'#fffcef':'#fff20b'}" stroke="${ink}" stroke-width="3"/><text y="274" text-anchor="middle" fill="${ink}" font-size="18" font-weight="900">${escape(mark.label)}</text></g>`;
  }
  result += `<rect y="561" width="1100" height="89" fill="${grass}"/>`;
  for(let i=-1;i<12;i++)result += `<use href="#flower" x="${n(i*120-(cam*.94)%120-15)}" y="${574+(i%3)*14}" width="30" height="35" style="color:${i%2?'#ff87ce':'#fff20b'}"/>`;
  return result;
}
export function bikeRiderPose(race, rider, reduced = false) {
  const ramp = race.ramps.find(p => Math.abs(BIKE_LANES[p.lane]-rider.y)<24 && rider.x>p.x-60 && rider.x<p.x+32);
  const lift = rider.z>0 ? rider.z : ramp ? Math.max(0,(rider.x-ramp.x+60)/92*27) : 0;
  const angle = reduced ? 0 : (rider.fall ? Math.min(1,rider.fall/.65)*-.47 : rider.z ? Math.max(-.3,Math.min(.25,-rider.vy/1600)) : ramp ? -.2 : 0)*180/Math.PI;
  return { transform: `translate(${n(rider.x-race.camera)} ${n(rider.y)}) scale(${n(.81+rider.y/2300)})`, lift: `translate(0 ${n(-lift)}) rotate(${n(angle)})`, angle: n(rider.crank*180/Math.PI), front: {x:5+Math.cos(rider.crank)*11,y:-9+Math.sin(rider.crank)*8}, rear:{x:5-Math.cos(rider.crank)*11,y:-9-Math.sin(rider.crank)*8} };
}
export const bikeFrontLeg = p => `M-8-48Q16-29 ${n(p.x)} ${n(p.y)}`;
export const bikeRearLeg = p => `M-24-49Q-35-30 ${n(p.x)} ${n(p.y)}`;
function wheel(id, x, rotation) {
  return `<g transform="translate(${x} 0)"><circle r="23" fill="${ink}"/><circle r="18" fill="#fffcef" stroke="${ink}" stroke-width="2"/><g id="${id}" transform="rotate(${rotation})" stroke="#8995ad" stroke-width="1.6">${Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return `<path d="M0 0 ${n(Math.cos(a)*18)} ${n(Math.sin(a)*18)}"/>`;}).join('')}</g><circle r="4" fill="${ink}"/></g>`;
}
function bicycleRiderMarkup(race, rider, selected, hat, reduced) {
  const p = bikeRiderPose(race,rider,reduced), a = ANIMALS.find(a=>a.id===rider.id), id = rider.id;
  const color = escape(a.color), bike = ['#1d55ff','#ff3935','#fff20b','#ff87ce'][ANIMALS.indexOf(a)];
  return `<g id="bike-rider-${id}" transform="${p.transform}" aria-label="${escape(a.name)}"><ellipse cy="4" rx="54" ry="10" fill="${ink}" opacity=".14"/>${id===selected?'<ellipse cy="6" rx="59" ry="13" fill="#fff20b" fill-opacity=".2" stroke="#1d55ff" stroke-width="2" stroke-dasharray="5 5"/>':''}<g id="bike-fly-${id}" transform="${p.lift}" stroke-linecap="round" stroke-linejoin="round">${wheel('bike-wheel-back-'+id,-42,p.angle)}${wheel('bike-wheel-front-'+id,42,p.angle)}<path id="bike-leg-back-${id}" d="${bikeRearLeg(p.rear)}" stroke="${ink}" stroke-width="13" fill="none"/><path id="bike-leg-back-color-${id}" d="${bikeRearLeg(p.rear)}" stroke="${color}" stroke-width="8" fill="none"/>${path('M-42 0-16-38 5-4-42 0M-16-38 28-38 5-4M28-38 42 0','none',8)}<path d="M-42 0-16-38 5-4-42 0M-16-38 28-38 5-4M28-38 42 0" fill="none" stroke="${bike}" stroke-width="4.5"/>${path('M-16-38-20-49m-12-2h27M28-38 27-56 43-60','none',5)}<use href="${animalHref(id,hat&&id===selected,'seated')}" x="-60" y="-140" width="94" height="113"/><path id="bike-leg-front-${id}" d="${bikeFrontLeg(p.front)}" stroke="${ink}" stroke-width="13" fill="none"/><path id="bike-leg-front-color-${id}" d="${bikeFrontLeg(p.front)}" stroke="${color}" stroke-width="8" fill="none"/><ellipse id="bike-paw-front-${id}" cx="${n(p.front.x)}" cy="${n(p.front.y)}" rx="8" ry="5" fill="${color}" stroke="${ink}" stroke-width="3"/>${path('M6-68Q22-56 40-58','none',12)}<path d="M6-68Q22-56 40-58" fill="none" stroke="${color}" stroke-width="7"/><circle cx="40" cy="-58" r="4" fill="${color}" stroke="${ink}" stroke-width="2"/></g></g>`;
}
export function bikeObstaclesMarkup(race) {
  return [...race.ramps.map(o=>({...o,type:'ramp'})),...race.stones.map(o=>({...o,type:'stone'}))].sort((a,b)=>a.lane-b.lane).map(o=>{
    const x=o.x-race.camera;if(x < -110 || x > 1230)return '';
    return `<g data-bike-object="${o.type}" transform="translate(${n(x)} ${BIKE_LANES[o.lane]}) scale(${n(.81+BIKE_LANES[o.lane]/2300)})">${o.type==='ramp'?path('M-65 2 32-27 51-5 51 7H-65Z','#ff87ce',4)+path('M-65 2 32-27 32 6Z','#fff20b')+path('m-35-2 11 2-4-9m14 4 10 2-3-9'):path('m-21 2 5-24 19-8 18 15 3 18-23 5Z','#969ba5',3.5)+'<path d="m-10-14 11-7 8 9" fill="none" stroke="#e1e3e5" stroke-width="3"/>'}</g>`;
  }).join('');
}
export function bikeRaceMarkup(race, animal, paint = {}, hat = false, reduced = false) {
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BIKE_WIDTH} ${BIKE_HEIGHT}" font-family="Trebuchet MS,Arial,sans-serif" aria-label="${escape(text('bike_title'))}">${defs()}<g id="bike-terrain">${bikeTerrainMarkup(race,paint)}</g><g id="bike-obstacles">${bikeObstaclesMarkup(race)}</g><g id="bike-cast">${[...race.riders].sort((a,b)=>a.y-b.y).map(r=>bicycleRiderMarkup(race,r,animal,hat,reduced)).join('')}</g><g id="bike-hud" pointer-events="none">${[['bike-clock',25,160,'bike_time',bikeTime(race.elapsed)],['bike-speed',210,160,'bike_speed','0 km/h'],['bike-place',395,140,'bike_place',bikeRank(race)+' / 4'],['bike-jumps',560,150,'bike_jumps','0']].map(([id,x,w,key,value])=>`<rect x="${x}" y="18" width="${w}" height="67" rx="12" fill="#fffcef" stroke="${ink}" stroke-width="3"/><text x="${x+13}" y="39" font-size="12" font-weight="900">${escape(text(key))}</text><text id="${id}" x="${x+13}" y="69" font-size="25" font-weight="900">${escape(value)}</text>`).join('')}<rect x="27" y="99" width="680" height="9" rx="4" fill="#fffcef" stroke="${ink}" stroke-width="2"/><rect id="bike-progress" x="29" y="101" width="0" height="5" rx="2" fill="#ff87ce"/><g id="bike-recovery" hidden=""><rect x="390" y="180" width="320" height="45" rx="14" fill="#fffcef" stroke="${ink}" stroke-width="3"/><text id="bike-recovery-text" x="550" y="209" text-anchor="middle" font-size="20" font-weight="900"></text></g><text x="550" y="638" text-anchor="middle" font-size="15" font-weight="800" fill="${ink}">${escape(text('bike_controls'))}</text></g><g id="player" hidden=""><use id="player-use"/></g><g id="destination-marker" hidden=""></g></svg>`;
}
