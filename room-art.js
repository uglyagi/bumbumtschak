import { socialPadsMarkup } from './social.js';
import { defs, mapLabel } from './art.js';
import { TRACKS, text } from './content.js';
import { escapeXML as escape } from './utils.js';
import { ROOMS, ROOM_PROPS, slotsOnPage, tapePages, createCassetteState } from './rooms.js';

export function cassetteMarkup(track) {
  return `<g stroke="#101014" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round">
    <rect x="1.5" y="1.5" width="129" height="81" rx="8" fill="${track.color}"/>
    <rect x="7" y="7" width="61" height="57" rx="3" fill="#fffcee" stroke-width="1.5"/>
    ${track.image ? `<image href="${escape(track.image)}" x="9" y="8" width="57" height="55" preserveAspectRatio="xMidYMid meet"/>` : `<text x="37" y="39" text-anchor="middle" stroke="none" font-size="10" font-weight="900">${escape(track.title.slice(0, 9))}</text>`}
    <rect x="72" y="9" width="51" height="25" rx="2" fill="#fffcee" stroke-width="1.3"/>
    <text x="97" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-size="${Math.min(7, 62 / Math.min(22, track.title.length || 1))}" font-weight="900" stroke="none">${escape(track.title.length > 22 ? `${track.title.slice(0, 21)}…` : track.title)}</text>
    <text x="97" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-size="3.4" font-weight="700" stroke="none">${escape(text('cassette_stamp'))}</text>
    <rect x="72" y="39" width="51" height="21" rx="9" fill="#babdb7" stroke-width="1.5"/>
    <path d="M83 46h30v7H83Z" fill="#555953" stroke="none"/>
    ${[83, 112].map(x => `<g class="spool" style="transform-origin:${x}px 49.5px"><circle cx="${x}" cy="49.5" r="8" fill="white" stroke-width="1.5"/><circle cx="${x}" cy="49.5" r="2.5" fill="#101014" stroke="none"/><path d="M${x - 6.5} 49.5h13m-6.5-6.5v13m-4.5-11 9 9m-9 0 9-9" stroke-width="1"/></g>`).join('')}
    <path d="m39 67 54 0 9 14H30Z" fill="#fffcee" stroke-width="1.7"/>
    <path d="m42 70-3 6m51-6 3 6" stroke-width="2"/>
    <circle cx="52" cy="74" r="2.6" fill="#101014" stroke="none"/><circle cx="81" cy="74" r="2.6" fill="#101014" stroke="none"/>
    <path d="M64 70h5v7h-5Z" fill="#babdb7" stroke-width="1"/>
    ${[[7, 7], [125, 7], [7, 76], [125, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#101014" stroke="none"/>`).join('')}
  </g>`;
}
export const cassetteSVG = (track, cls = '') => `<svg class="cassette-art ${cls}" viewBox="0 0 132 84" aria-hidden="true">${cassetteMarkup(track)}</svg>`;
export const playerMarkup = `<g id="player" transform="translate(800 870)"><ellipse cx="0" cy="0" rx="25" ry="9" fill="#101014" opacity=".18"/><g id="player-body"><use id="player-use" href="#animal-cat" x="-34" y="-77" width="68" height="82"/><g id="carried-tape" transform="translate(-29 -39) scale(.44)" hidden=""></g></g><path d="m-5-91 5 6 5-6" fill="none" stroke="#101014" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const target = (id, name, markup) => `<g class="world-station" data-room-target="${id}" tabindex="0" role="button" aria-label="${escape(name)}">${markup}</g>`;

const fitted = (x, y, value, width, size = 17, color = '#101014') => `<text x="${x}" y="${y}" text-anchor="middle" stroke="none" fill="${color}" font-size="${size}" font-weight="900" ${value.length * size * .6 > width ? `textLength="${width}" lengthAdjust="spacingAndGlyphs"` : ''}>${escape(value)}</text>`;
export function slotDescription(tapes, index) {
  const track = TRACKS.find(t => t.id === tapes.slots[index]);
  return track ? text('walk_tape', { lied: track.title }) : text('radio_empty_slot');
}
export function slotContents(tapes, index) {
  const track = TRACKS.find(t => t.id === tapes.slots[index]);
  return `<rect x="-92" y="-59" width="184" height="118" rx="12" fill="#fffcee" fill-opacity=".38" stroke="#101014" stroke-width="2" stroke-dasharray="6 5" opacity=".6"/>${track ? `<g transform="translate(-90 -57) scale(1.36)">${cassetteMarkup(track)}</g>` : ''}`;
}
function radioArt(shelfPage, tapes) {
  return `${target('radio', text('radio_walk'), `<g transform="translate(290 -15)" stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M418 309v-40h180v40" fill="none"/><path d="M642 300 680 275"/><circle cx="681" cy="271" r="7" fill="#fff20b"/>
    <rect x="325" y="300" width="370" height="180" rx="25" fill="#ff87ce"/>
    <circle cx="389" cy="394" r="47" fill="url(#speaker)"/><circle cx="634" cy="394" r="47" fill="url(#speaker)"/>
    <rect x="452" y="350" width="118" height="77" rx="8" fill="#fffcee"/>
    ${fitted(510, 389, text('radio_empty_display'), 100, 16)}
    <path d="M463 445h20m13 0h20m13 0h20" stroke-width="11"/><path d="M440 326h139" stroke-width="10"/><path d="M443 326h85" stroke="#1d55ff" stroke-width="4"/>
    </g><g id="radio-tape" transform="translate(742 336) scale(.9)" hidden=""></g>${mapLabel(800, 510, text('radio_board'), 290)}`)}
    <rect x="980" y="275" width="420" height="60" rx="12" fill="#1d55ff" stroke="#101014" stroke-width="5"/>
    ${fitted(1190, 312, tapePages(tapes) > 1 ? text('radio_shelf_page', { seite: shelfPage + 1, anzahl: tapePages(tapes) }) : text('radio_shelf'), 385, 23, 'white')}
    <rect x="985" y="365" width="420" height="510" rx="20" fill="#fff20b" stroke="#101014" stroke-width="4"/>
    <rect x="205" y="550" width="420" height="325" rx="20" fill="#fff20b" stroke="#101014" stroke-width="4"/>
    ${slotsOnPage(shelfPage).map(slot => `<g transform="translate(${slot.x} ${slot.y})" data-room-target="slot:${slot.slot}" id="tape-slot-${slot.slot}" data-tape-slot="${slot.slot}" class="world-station" tabindex="0" role="button" aria-label="${escape(slotDescription(tapes, slot.slot))}">${slotContents(tapes, slot.slot)}</g>`).join('')}
    <g transform="translate(215 300) rotate(-2)"><rect width="355" height="195" rx="14" fill="#fffcee" stroke="#101014" stroke-width="4"/>
      ${fitted(177, 53, text('radio_sign_1'), 323, 17)}${fitted(177, 104, text('radio_sign_2'), 323, 17)}${fitted(177, 155, text('radio_sign_3'), 323, 16)}
    </g>
    ${tapePages(tapes) > 1 ? target('shelf', text('action_shelf'), `<g transform="translate(800 740)"><rect x="-135" y="-37" width="270" height="74" rx="14" fill="#40cea1" stroke="#101014" stroke-width="4"/>${fitted(0, -7, text('radio_shelf_page', { seite: shelfPage + 1, anzahl: tapePages(tapes) }), 240, 17)}${fitted(0, 18, text('radio_next_shelf'), 240, 14)}</g>`) : ''}`;
}
function socialArt() {
  return `<rect x="500" y="280" width="600" height="200" rx="16" fill="#ff87ce" stroke="#101014" stroke-width="5"/>${fitted(800, 353, text('social_board'), 558, 35)}${fitted(800, 402, text('social_board_sub'), 558, 21)}${fitted(800, 437, text('social_board_note'), 558, 15)}${socialPadsMarkup('social')}`;
}
function infoArt(scene) {
  const prefix = scene === 'concerts' ? 'concert' : 'grown';
  return target(scene, ROOM_PROPS[scene][0].label, `<g stroke="#101014" stroke-width="5" stroke-linejoin="round"><path d="M530 463v38m540-38v38" stroke-width="12"/><rect x="500" y="280" width="600" height="200" rx="16" fill="${ROOMS[scene].color}"/><rect x="514" y="294" width="572" height="172" rx="7" fill="#1d55ff"/></g>${fitted(800, 355, text(prefix + '_board'), 535, 38, 'white')}${fitted(800, 405, text(prefix + '_board_sub'), 535, 23, '#fff20b')}${mapLabel(800, 530, text('read_hint'), 420)}`);
}

export function roomMarkup(scene, shelfPage = 0, tapes = createCassetteState()) {
  const room = ROOMS[scene];
  const tiles = [];
  for (let x = 190; x <= 1400; x += 110) for (let y = 290; y < 1000; y += 110) tiles.push(`<path d="M${x} ${y}h35m-17-17v35" stroke="#101014" stroke-width="1.5" opacity=".1"/>`);
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="60 120 1480 850" font-family="Trebuchet MS, Arial, sans-serif" aria-label="${escape(room.title)}" preserveAspectRatio="xMidYMid meet">
    ${defs()}<rect width="1600" height="1100" fill="${room.color}"/>
    <rect x="125" y="100" width="1350" height="970" rx="24" fill="#101014"/>
    <path d="M160 245h1280v755H860v65H740v-65H160Z" fill="#fff6da" stroke="#101014" stroke-width="6"/>
    <path d="M148 123h1304v120H148Z" fill="${room.color}" stroke="#101014" stroke-width="5"/>
    <path d="M155 225h1290" stroke="#101014" stroke-width="4"/>
    <text x="800" y="195" text-anchor="middle" font-size="${Math.min(40, 1100 / (room.title.length * .65 || 1))}" font-weight="900">${escape(room.title.toUpperCase())}</text>
    ${tiles.join('')}
    <path d="M800 955V830q0-72-62-94" fill="none" stroke="#fff20b" stroke-width="75" stroke-linecap="round"/>
    ${scene === 'radio' ? radioArt(shelfPage, tapes) : scene === 'social' ? socialArt() : infoArt(scene)}
    <g data-room-target="exit" class="world-station" tabindex="0" role="button" aria-label="${escape(text('back_world'))}">
      <path d="M740 1000v-42q60-38 120 0v108H740Z" fill="#40cea1" stroke="#101014" stroke-width="5"/>
      <path d="M800 975v60m-17-18 17 18 17-18" stroke="#101014" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${mapLabel(800, 934, text('exit_sign'), 420, '#fff20b')}
    </g>
    <g id="destination-marker" hidden=""><ellipse rx="17" ry="8" fill="none" stroke="#101014" stroke-width="3" stroke-dasharray="4 4"/></g>
    ${playerMarkup}
  </svg>`;
}
