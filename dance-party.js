import { escapeXML } from './utils.js';

export const isDanceTrack = track => !!track && (track.id === 'tanzen' || track.title?.trim().toLocaleLowerCase('de') === 'tanzen');
export const danceGuests = (animals, selected) => animals.filter(animal => animal.id !== selected);
const spots = [{ x: 700, y: 620 }, { x: 880, y: 690 }, { x: 700, y: 785 }];
function along(route, distance) {
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance < length) return { x: a.x + (b.x - a.x) * distance / length, y: a.y + (b.y - a.y) * distance / length, done: false };
    distance -= length;
  }
  return { ...route.at(-1), done: true };
}
export function guestPose(index, seconds, reduced = false) {
  const end = spots[index], delay = index * .65;
  if (reduced) return { ...end, visible: true, arrived: true };
  let distance = Math.max(0, seconds - delay) * 145;
  const route = [{ x: 800, y: 1040 }, { x: 800, y: 965 }, { x: end.x, y: 910 }, { x: end.x, y: 820 }, end];
  const { done, ...position } = along(route, distance);
  return { ...position, visible: seconds >= delay, arrived: done };
}
export function guestExitPose(start, index, seconds, reduced = false) {
  if (!start?.visible || reduced) return { x: 800, y: 1040, visible: false, arrived: false };
  const route = [start, ...(start.y < 910 ? [{ x: start.x, y: 910 }] : []), { x: 800, y: 965 }, { x: 800, y: 1040 }];
  const { done, ...position } = along(route, Math.max(0, seconds - index * .2) * 190);
  return { ...position, visible: !done, arrived: false };
}
export const createParty = () => ({ active: false, departing: false, elapsed: 0, exitElapsed: 0, castKey: '', cast: [], exits: [] });
export function syncParty(party, track, playing, ended, animals, selected, reduced = false) {
  const dance = isDanceTrack(track) && !ended;
  if (dance && playing && !party.active) Object.assign(party, createParty(), { active: true });
  if (party.active && dance) {
    party.cast = danceGuests(animals, selected).map(animal => animal.id);
    party.castKey = party.cast.join(',');
  } else if (party.active) {
    party.exits = party.cast.map((id, i) => guestPose(i, party.elapsed, reduced));
    party.active = false; party.departing = !reduced; party.exitElapsed = 0;
  }
  return party;
}
export function tickParty(party, seconds, playing, reduced = false) {
  if (party.active && playing) party.elapsed += seconds;
  if (party.departing) {
    party.exitElapsed += seconds;
    if (party.exits.every((start, i) => !guestExitPose(start, i, party.exitElapsed, reduced).visible)) party.departing = false;
  }
}
export function dancePartyMarkup(animals, selected, cast = danceGuests(animals, selected).map(animal => animal.id)) {
  const mirrors = [];
  for (let x = -40; x < 40; x += 10) for (let y = -40; y < 40; y += 10) mirrors.push(`<rect x="${x}" y="${y}" width="10" height="10" fill="${(x + y) % 20 ? '#d7e1e8' : '#fffcee'}" stroke="#7c8795" stroke-width=".8"/>`);
  return `<defs><clipPath id="party-floor-clip"><path d="M160 245h1280v755H860v65H740v-65H160Z"/></clipPath><clipPath id="disco-mirror-clip"><circle r="36"/></clipPath></defs>
    <g id="party-effects" aria-hidden="true"><g clip-path="url(#party-floor-clip)" class="party-lights"><rect x="160" y="245" width="1280" height="820" fill="#20133f" class="party-wash"/>
      <path d="M585 260 210 970H730Z" fill="#ff87ce" class="party-beam"/><path d="M585 260 790 980H1410Z" fill="#8bd9ed" class="party-beam party-beam-alt"/>
      <path d="M1380 260 390 980H1010Z" fill="#a1ff86" class="party-beam party-beam-green"/><path d="M220 260 660 1000H1300Z" fill="#b99aff" class="party-beam party-beam-violet"/>
      ${[[410,720,'#ff87ce'],[700,900,'#fff20b'],[1070,800,'#70e7ff'],[950,590,'#ba91ff'],[540,530,'#9cff8d'],[1240,955,'#ffad7b']].map(([x,y,color],i)=>`<ellipse cx="${x}" cy="${y}" rx="115" ry="43" fill="${color}" class="party-pool" style="animation-delay:${i * -.7}s"/>`).join('')}</g>
    <g class="party-lamps">${[260,450,640,830,1020,1210,1370].map((x,i)=>`<g transform="translate(${x} 235)"><path d="M0-12v10" stroke="#101014" stroke-width="4"/><circle r="10" fill="${['#ff87ce','#7de6ff','#fff20b','#a5ff82','#b99aff'][i%5]}" stroke="#101014" stroke-width="3" class="party-lamp" style="animation-delay:${i * -.6}s"/></g>`).join('')}</g>
    <g id="disco-ball" transform="translate(575 275)" aria-hidden="true"><path d="M0-55v16" stroke="#101014" stroke-width="4"/><circle r="39" fill="#101014"/><circle r="36" fill="#edf0f4"/>
      <g clip-path="url(#disco-mirror-clip)">${mirrors.join('')}</g><path d="M-24-12q3-16 20-18" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <g class="party-sparkle" fill="#ffffff" stroke="#101014" stroke-width="1.5"><path d="m51-21 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/><path d="m-49 9 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g></g></g>
    ${cast.map(id => animals.find(animal => animal.id === id)).filter(Boolean).map((animal, i) => `<g id="party-dancer-${animal.id}" data-party-guest="${animal.id}" class="party-guest" hidden="" role="img" aria-label="${escapeXML(animal.name)}" style="--party-delay:${i * -.27}s"><ellipse rx="27" ry="9" fill="#101014" opacity=".16"/><g class="party-body"><use href="#animal-${animal.id}" x="-37" y="-87" width="74" height="89"/></g></g>`).join('')}`;
}
