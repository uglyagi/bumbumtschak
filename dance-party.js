import { escapeXML } from './utils.js';

export const isDanceTrack = track => !!track && (track.id === 'tanzen' || track.title?.trim().toLocaleLowerCase('de') === 'tanzen');
export const danceGuests = (animals, selected) => animals.filter(animal => animal.id !== selected);
const spots = [{ x: 700, y: 620 }, { x: 880, y: 690 }, { x: 700, y: 785 }];
export function guestPose(index, seconds, reduced = false) {
  const end = spots[index], delay = index * .65;
  if (reduced) return { ...end, visible: true, arrived: true };
  let distance = Math.max(0, seconds - delay) * 145;
  const route = [{ x: 800, y: 1040 }, { x: 800, y: 965 }, { x: end.x, y: 910 }, { x: end.x, y: 820 }, end];
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance < length) return { x: a.x + (b.x - a.x) * distance / length, y: a.y + (b.y - a.y) * distance / length, visible: seconds >= delay, arrived: false };
    distance -= length;
  }
  return { ...end, visible: true, arrived: true };
}
export function dancePartyMarkup(animals, selected) {
  const mirrors = [];
  for (let x = -40; x < 40; x += 10) for (let y = -40; y < 40; y += 10) mirrors.push(`<rect x="${x}" y="${y}" width="10" height="10" fill="${(x + y) % 20 ? '#d7e1e8' : '#fffcee'}" stroke="#7c8795" stroke-width=".8"/>`);
  return `<defs><clipPath id="party-floor-clip"><path d="M160 245h1280v755H860v65H740v-65H160Z"/></clipPath><clipPath id="disco-mirror-clip"><circle r="36"/></clipPath></defs>
    <g clip-path="url(#party-floor-clip)" class="party-lights" aria-hidden="true"><rect x="160" y="245" width="1280" height="820" fill="#a496e4" class="party-wash"/>
      <path d="M585 260 210 970H730Z" fill="#ff87ce" class="party-beam"/><path d="M585 260 790 980H1410Z" fill="#8bd9ed" class="party-beam party-beam-alt"/>
      <ellipse cx="520" cy="870" rx="175" ry="55" fill="#fff20b" class="party-pool"/><ellipse cx="1060" cy="900" rx="200" ry="60" fill="#ff87ce" class="party-pool party-beam-alt"/></g>
    <g id="disco-ball" transform="translate(575 275)" aria-hidden="true"><path d="M0-55v16" stroke="#101014" stroke-width="4"/><circle r="39" fill="#101014"/><circle r="36" fill="#edf0f4"/>
      <g clip-path="url(#disco-mirror-clip)">${mirrors.join('')}</g><path d="M-24-12q3-16 20-18" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <g class="party-sparkle" fill="#ffffff" stroke="#101014" stroke-width="1.5"><path d="m51-21 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/><path d="m-49 9 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g></g>
    ${danceGuests(animals, selected).map((animal, i) => `<g id="party-dancer-${animal.id}" data-party-guest="${animal.id}" class="party-guest" hidden="" role="img" aria-label="${escapeXML(animal.name)}" style="--party-delay:${i * -.27}s"><ellipse rx="27" ry="9" fill="#101014" opacity=".16"/><g class="party-body"><use href="#animal-${animal.id}" x="-37" y="-87" width="74" height="89"/></g></g>`).join('')}`;
}
