import { text } from './content.js';
import { escapeXML } from './utils.js';
import { SPACE, SKY } from './sky-world.js';
import { PLANETS } from './solar-system.js';
import { paintAttributes } from './painting.js';

let seed = 24681357;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
export const STARS = Array.from({ length: 840 }, (_, i) => ({
  x: 24 + random() * 1552, y: SPACE.top + 30 + random() * (SPACE.bottom - SPACE.top - 60),
  radius: 1 + random() * 1.8, glint: i % 13 === 0, color: ['#fffcee', '#fff20b', '#ffb3d8', '#b2d8ff'][i % 4],
}));
const starField = STARS.map(star => star.glint
  ? `<path d="M0-7 2-2 7 0 2 2 0 7-2 2-7 0-2-2Z" transform="translate(${star.x.toFixed(1)} ${star.y.toFixed(1)})" fill="${star.color}" stroke="#080b18" stroke-width="1"/>`
  : `<circle cx="${star.x.toFixed(1)}" cy="${star.y.toFixed(1)}" r="${star.radius.toFixed(1)}" fill="${star.color}" opacity=".8"/>`).join('');
const details = {
  mercury: `<g fill="#8e8985" stroke="#101014" stroke-width=".025"><circle cx="-.36" cy="-.25" r=".22"/><circle cx=".4" cy=".3" r=".17"/><circle cx=".28" cy="-.48" r=".12"/><circle cx="-.2" cy=".58" r=".1"/></g>`,
  venus: `<g fill="none" stroke="#fff0b8" stroke-width=".17" stroke-linecap="round"><path d="M-1-.45Q-.2-.8.8-.3M-.9.2Q.15-.2 1 .25M-.65.65Q.05.35.65.65"/></g>`,
  earth: `<g fill="#40cea1" stroke="#101014" stroke-width=".035" stroke-linejoin="round"><path d="M-.8-.6-.4-.8-.15-.6-.28-.32-.12-.12-.35.08-.23.32-.4.71-.55.42-.52.04-.81-.13Z"/><path d="M.1-.65.38-.8.87-.52.7-.25.36-.2.52.08.35.55.1.3.04-.04.22-.28Z"/><path d="m.58.48.28-.03.1.17-.3.1Z"/></g><path d="M-.6-.85Q0-1 .58-.85M-.55.86Q0 1 .55.86" fill="none" stroke="#ffffff" stroke-width=".15"/>`,
  mars: `<path d="M-1-.3Q-.4-.7-.15-.2T.8.1L1 .5Q.3.6-.1.25T-1 .2Z" fill="#c85d3c"/><g fill="#da6742" stroke="#101014" stroke-width=".025"><circle cx=".37" cy="-.4" r=".16"/><circle cx="-.3" cy=".5" r=".12"/></g><path d="M-.37-.86Q0-1 .37-.86" stroke="#fffcee" stroke-width=".14" fill="none"/>`,
  jupiter: `<path d="M-1-.7Q0-.5 1-.65V-.42Q0-.25-1-.46Z" fill="#fff4d5"/><path d="M-1-.25Q0-.1 1-.2V-.02Q0 .12-1-.02Z" fill="#c7895e"/><path d="M-1 .18Q0 .35 1 .12V.36Q0 .55-1 .4Z" fill="#fff4d5"/><path d="M-1 .53Q0 .7 1 .5V.7Q0 .9-1 .73Z" fill="#ce9062"/><ellipse cx=".34" cy=".29" rx=".23" ry=".11" fill="#ed8066" stroke="#101014" stroke-width=".02"/>`,
  saturn: `<g fill="none" stroke="#e7be78" stroke-width=".11"><path d="M-1-.55Q0-.4 1-.55M-1-.2Q0-.05 1-.2M-1 .2Q0 .38 1 .2M-.8.58Q0 .75.8.58"/></g>`,
  uranus: `<g fill="none" stroke="#c1f5ec" stroke-width=".13"><path d="M-1-.4Q0-.58 1-.4M-1 .12Q0-.03 1 .12M-.8.6Q0 .46.8.6"/></g>`,
  neptune: `<g fill="none" stroke="#83a8ff" stroke-width=".12"><path d="M-1-.55Q0-.7 1-.55M-1 .05Q0-.1 1 .05M-.8.58Q0 .4.8.58"/></g><ellipse cx=".32" cy=".3" rx=".25" ry=".1" fill="#3151ba"/><path d="m-.45-.2.4-.03" fill="none" stroke="#fffcee" stroke-width=".06" stroke-linecap="round"/>`,
};
function planetMarkup(planet) {
  const r = planet.diameter / 2, name = escapeXML(text(planet.key));
  const ring = front => `<g transform="rotate(-15)" fill="none" stroke-linecap="round">${front
    ? '<path d="M-1.6 0A1.6 .3 0 0 0 1.6 0" stroke="#101014" stroke-width=".15"/><path d="M-1.6 0A1.6 .3 0 0 0 1.6 0" stroke="#ffb5d6" stroke-width=".09"/>'
    : '<ellipse rx="1.6" ry=".3" stroke="#101014" stroke-width=".15"/><ellipse rx="1.6" ry=".3" stroke="#ffb5d6" stroke-width=".09"/>'}</g>`;
  return `<g data-planet="${planet.id}" role="img" aria-label="${name}" transform="translate(${planet.x} ${planet.y})"><title>${name}</title>
    <g transform="scale(${r})">${planet.id === 'saturn' ? ring(false) : ''}<circle r="1" fill="#101014"/><circle r=".96" fill="${planet.color}"/>
      <clipPath id="planet-clip-${planet.id}"><circle r=".96"/></clipPath><g clip-path="url(#planet-clip-${planet.id})">${details[planet.id]}</g>${planet.id === 'saturn' ? ring(true) : ''}
    </g><text y="${r + 35}" text-anchor="middle" font-size="23" font-weight="900" fill="#fffcee" stroke="#10152d" stroke-width="5" paint-order="stroke" stroke-linejoin="round">${name}</text></g>`;
}
export function spaceMarkup(paint = {}) {
  return `<g id="space-world"><defs><linearGradient id="space-atmosphere" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${SPACE.color}"/><stop offset="1" ${paintAttributes('sky', SKY.color, paint, false, 'stop-color')}/></linearGradient></defs>
    <rect x="0" y="${SPACE.top}" width="1600" height="${SKY.top - SPACE.top}" fill="${SPACE.color}"/>
    <ellipse cx="870" cy="${SPACE.bottom - 2800}" rx="420" ry="2200" fill="#a47bf4" opacity=".08" transform="rotate(8 870 ${SPACE.bottom - 2800})"/>
    <g aria-hidden="true">${starField}</g>
    <rect x="0" y="${SPACE.bottom}" width="1600" height="${SKY.top - SPACE.bottom}" fill="url(#space-atmosphere)"/>
    ${PLANETS.map(planetMarkup).join('')}</g>`;
}
