import { landmarkDetails, countryScenery } from './earth-details.js';
import { defs, rocketMarkup } from './art.js';
import { animalHref } from './hat-quest.js';
import { text } from './content.js';
import { escapeXML as esc } from './utils.js';
import { EARTH_SCREEN, EARTH_LENGTH, earthStroller } from './earth-quest.js';
export const EARTH_LANDMARKS = ['eiffel','liberty','bigben','brandenburg','colosseum','taj','pyramids','opera','burj','pisa'];
const windows = (cols, rows, x, y, dx=22, dy=25) => Array.from({length:cols*rows},(_,i)=>`<rect x="${x+i%cols*dx}" y="${y+Math.floor(i/cols)*dy}" width="9" height="15" fill="#737d81" stroke="none"/>`).join('');
export function earthLandmark(index) {
  const bodies = [
    '<path d="M-99 0-42-110-15-227 0-314 15-227 42-110 99 0H59Q0-95-59 0Z" fill="#929393"/><path d="M-47-110h94M-24-200h48M-11-265h22M-74-45h148M-20-200 35-130-40-110 66-45-59 0M20-200-35-130 40-110-66-45 59 0M0-314v-30" fill="none"/>',
    '<path d="M-55 0v-53h110V0M-43-53l14-48h58l14 48" fill="#a7aba5"/><path d="M-31-101-15-225 13-228 29-101Z" fill="#95a8a4"/><circle cy="-244" r="15" fill="#95a8a4"/><path d="m-12-258-12-17 17 7 7-21 6 21 17-7-11 18M13-222l24-69 12 4-14 84M38-290v-24h16v24M45-314l-5-20 12 7-7 13M-15-218-28-191l-15-3-4-39 20-5" fill="#95a8a4"/><path d="M-16-120-6-210M11-117 4-203" fill="none"/>',
    '<path d="M-47 0v-245h94V0M-57-245h114l-17-28H-40ZM-28-273v-28h56v28L0-341Z" fill="#b9b4a5"/>'+windows(3,6,-28,-170,23,27)+'<circle cy="-213" r="27" fill="#ecebe5"/><path d="M0-235v23l15 8" fill="none"/>',
    '<path d="M-160 0h320v-18H-160ZM-165-145h330v-27H-165ZM-140-172v-21h280v21" fill="#bdbbb1"/>'+Array.from({length:6},(_,i)=>`<path d="M${-140+i*51} -18v-125h24v125Z" fill="#bdbbb1"/>`).join('')+'<path d="M-25-193v-20h50v20M-18-213l-15-18 15-12 18 15 18-15 15 12-15 18M0-228v-23" fill="#7d8886"/>',
    '<path d="M-169 0v-115q160-100 338-12V0Z" fill="#b8afa0"/><path d="M-169-42h338M-169-85h338" fill="none"/>'+Array.from({length:18},(_,i)=>`<path d="M${-153+i%9*36} ${-12-Math.floor(i/9)*46}v-20q9-16 18 0v20Z" fill="#747776" stroke="none"/>`).join(''),
    '<path d="M-110 0v-92h220V0M-118-92h236M-59-92q-32-44 24-80L0-205l35 33q56 36 24 80Z" fill="#dddcd4"/><path d="M-28 0v-55q28-41 56 0V0M-79-10v-31q12-24 24 0v31M55-10v-31q12-24 24 0v31" fill="#969b98"/><path d="M-162 0v-143h22V0M140 0v-143h22V0M-168-143l17-27 17 27ZM134-143l17-27 17 27Z" fill="#d4d2c7"/>',
    '<path d="M-190 0-49-223 106 0ZM-49-223 3 0M35 0 135-155 241 0ZM135-155 155 0M-270 0-199-105-125 0Z" fill="#beb7a3"/><path d="M-49-223 3 0H106ZM135-155 155 0h86Z" fill="#a6a18f"/>',
    '<path d="M-185 0h370v-14H-185ZM-162-14q17-80 115-147-19 100 33 147ZM-55-14q0-131 104-192-11 140 43 192ZM42-14q30-81 128-119-33 76 4 119Z" fill="#dadcd7"/><path d="m-47-161-51 147M49-206 8-14M170-133 89-14" fill="none"/>',
    '<path d="M-59 0v-105h15v-82h13v-67h12v-58h12v-63h14v63h12v58h12v67h13v82h15V0Z" fill="#a4afb2"/><path d="M0-375v-43M-8-300V0M8-300V0M-28-183V0M28-183V0M-42-80h84M-31-150h62M-19-220h38" fill="none" stroke="#6c777d"/>',
    '<g transform="rotate(6 0 0)"><path d="M-53 0v-212q53-20 106 0V0Z" fill="#d2d2c9"/>'+Array.from({length:6},(_,i)=>`<path d="M-58 ${-12-i*33}h116v-9H-58Z" fill="#b0b4af"/>`+windows(5,1,-43,-34-i*33,19)).join('')+'<path d="M-40-221v-25h80v25Z" fill="#d2d2c9"/></g>'
  ];
  return `<g transform="translate(530 425)" stroke="#687174" stroke-width="1.1" stroke-linejoin="miter">${bodies[index]}${landmarkDetails(index)}</g><text x="530" y="450" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#515c60" letter-spacing="1.5">${esc(text('earth_'+EARTH_LANDMARKS[index]))}</text>`;
}
// Keep one complete neighbour on either side of the camera's current block.
// A recycled slot is therefore fully offscreen when its contents change.
export function earthChunkRange(earth) { const center=Math.floor(earth.position.x/EARTH_SCREEN);return [center-1,center+1]; }
export const earthChunkSlot = chunk => (chunk%3+3)%3;
export function earthStreetChunkMarkup(earth,chunk) {
  const index=(chunk%10+10)%10;
  return `<g transform="translate(${chunk*1000} 0)"><rect x="0" y="0" width="1000" height="660" fill="#e1e3df"/><rect x="0" y="355" width="1000" height="115" fill="#c9ceca"/>${countryScenery(index)}${earthLandmark(index)}<path d="M0 466h1000v135H0Z" fill="#999fa0"/><path d="M0 466h1000M0 601h1000" stroke="#c3c8c5" stroke-width="6"/><path d="M0 560h1000" stroke="#dadbd3" stroke-width="3" stroke-dasharray="42 42" stroke-dashoffset="${chunk*EARTH_SCREEN%84}"/><rect y="604" width="1000" height="56" fill="#d1d5d0"/><path d="M100 465V339h70M780 465V339h70" fill="none" stroke="#6b7578" stroke-width="5"/><path d="M150 342h32M830 342h32" stroke="#eef0dc" stroke-width="6"/>${index===0?'<g id="earth-parked-rocket" transform="translate(180 500)">'+rocketMarkup({position:{x:0,y:0},riding:true,airborne:true,pilotHidden:earth.phase==='walking',hat:earth.hat,angle:0},earth.pilot||'cat')+'</g>':''}</g>`;
}
export function earthStreetMarkup(earth) {
  const [first,last]=earthChunkRange(earth);let out='';
  for(let chunk=first;chunk<=last;chunk++)out+=`<g id="earth-street-slot-${earthChunkSlot(chunk)}" data-earth-chunk="${chunk}">${earthStreetChunkMarkup(earth,chunk)}</g>`;
  return out;
}
export function earthPedestrians(earth,chunk) {
  // The family has this whole block to itself. Adjacent walkers turn around
  // before reaching it, so nobody pops away or walks across the stroller.
  if((chunk%10+10)%10===4)return [];
  const span=820,period=span*2;
  return Array.from({length:4},(_,i)=>{
    const travel=((90+i*217+earth.time*(i%2?-19:23))%period+period)%period;
    return {id:`earth-person-${chunk}-${i}`,x:chunk*EARTH_SCREEN+90+(travel<=span?travel:period-travel),y:483+i%2*41,phase:earth.time*4+i,coat:i%2?'#95958b':'#77858b',skirt:i===2,scale:.85};
  });
}
export const earthLegPath = phase => { const leg=Math.sin(phase)*7;return `M-5-18 ${-5-leg} 0M5-18 ${5+leg} 0`; };
function person(x,y,phase=0,coat='#707e83',skirt=false,scale=1,id='') {
  return `<g ${id?`id="${id}"`:''} transform="translate(${x.toFixed(2)} ${y}) scale(${scale})" fill="${coat}" stroke="#606b6d" stroke-width="2"><ellipse cy="-58" rx="9" ry="11" fill="#b8aca0"/><path d="M-9-45h18l${skirt?'9 29h-36':'3 27h-24'}Z"/><path class="earth-legs" d="${earthLegPath(phase)}" fill="none" stroke-width="4"/><path d="M-10-40l-4 22M10-40l5 22" fill="none" stroke-width="4"/></g>`;
}
export function earthPeopleChunkMarkup(earth,chunk) {
  let out=earthPedestrians(earth,chunk).map(p=>person(p.x,p.y,p.phase,p.coat,p.skirt,p.scale,p.id)).join('');
  if((chunk%10+10)%10===4) {
    const p=earthStroller(earth,Math.floor(chunk/10));
    out+=`<g id="earth-family-${chunk}" transform="translate(${p.x.toFixed(2)} ${p.y})">`
      +person(-51,0,earth.time*3,'#687984',false,1,`earth-parent-${chunk}-0`)+person(-88,8,earth.time*3+1,'#a09990',true,1,`earth-parent-${chunk}-1`)
      +'<g stroke="#616c70" stroke-width="3"><path d="m-42-37 16 4 8 26h40" fill="none"/><path d="M-24-26h48q-3 20-21 20t-27-20Z" fill="#929e9e"/><path d="M0-26v-27q25 0 26 27Z" fill="#c1c8c3"/><circle cx="-14" cy="-3" r="7" fill="#657074"/><circle cx="20" cy="-3" r="7" fill="#657074"/></g></g>';
  }
  return out;
}
export function earthPeopleMarkup(earth) {
  const [first,last]=earthChunkRange(earth);let out='';
  for(let chunk=first;chunk<=last;chunk++)out+=`<g id="earth-people-slot-${earthChunkSlot(chunk)}" data-earth-chunk="${chunk}">${earthPeopleChunkMarkup(earth,chunk)}</g>`;
  return out;
}
export function toiletPaperMarkup() { return '<g stroke="#101014" stroke-width="2"><path d="M-12-12h22v24H-12Z" fill="#fff"/><ellipse cx="10" rx="7" ry="12" fill="#f8f8f1"/><ellipse cx="10" rx="2.5" ry="5" fill="#aaa99d"/><path d="M-12 10v17l8-3 8 3V10" fill="#fff"/></g>'; }
export function earthPaperMarkup(earth) { const p=earth.paper;return p?`<g transform="translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.phase==='flying'?p.elapsed*300:12})">${toiletPaperMarkup()}</g>`:''; }
export function earthMarkup(earth, animal, hat=false) {
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${earth.position.x-500} 0 1000 660" font-family="Arial,sans-serif">${defs()}<g id="earth-street">${earthStreetMarkup(earth)}</g><g id="earth-people">${earthPeopleMarkup(earth)}</g><g id="earth-paper">${earthPaperMarkup(earth)}</g><g id="player" transform="translate(${earth.position.x} ${earth.position.y})"><ellipse rx="25" ry="8" fill="#42494b" opacity=".13"/><g id="player-body"><use id="player-use" href="${animalHref(animal,hat,earth.facing)}" x="-34" y="-77" width="68" height="82"/></g></g><g id="destination-marker" hidden=""/></svg>`;
}
