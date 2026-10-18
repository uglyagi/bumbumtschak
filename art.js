import { brandSymbols, socialPadsMarkup } from './social.js';
import { bandSymbols, animalSymbols } from './cover-art.js';
import { ANIMALS, BAND, text } from './content.js';
import { escapeXML as escape } from './utils.js';
import { WORLD, WORLD_SPAWN } from './game-core.js';
import { FLOWERS, TREES, CLOUDS, WORLD_PATH, PAINT_SURFACES, paintAttributes, readableInk } from './painting.js';
import { SKY, GROUND_ROCKET } from './sky-world.js';
import { spaceMarkup } from './space-art.js';
export const icon = (name, cls = '') => {
  const paths = {
    music: '<path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    play: '<path d="m8 4 13 8-13 8Z" fill="currentColor"/>',
    pause: '<path d="M7 4v16M17 4v16" stroke-width="5"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15M15 6v15"/>',
    sound: '<path d="m11 4-6 5H2v6h3l6 5ZM15 8q6 4 0 8M18 4q10 8 0 16"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5M12 17h.01"/>',
    external: '<path d="M14 3h7v7M21 3 10 14M10 5H4v15h15v-6"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/>',
    cassette: '<rect x="2" y="4" width="20" height="16" rx="3"/><rect x="5" y="7" width="14" height="6" rx="3"/><circle cx="8" cy="10" r="1"/><circle cx="16" cy="10" r="1"/><path d="m6 20 2-4h8l2 4"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.music}</svg>`;
};
export const avatar = (id, cls = '') => `<svg class="animal-art ${cls}" viewBox="0 0 100 120" aria-hidden="true"><use href="#animal-${id}"/></svg>`;
export const memberArt = id => `<svg class="member-art" viewBox="0 0 170 190" aria-hidden="true"><use href="#band-${id}"/></svg>`;

export const defs = () => `<defs>${brandSymbols}
  <pattern id="speaker" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#111"/></pattern>
  ${animalSymbols()}
  ${bandSymbols()}
  <symbol id="flower" viewBox="0 0 60 70"><g stroke="#101014" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M31 36v29m0-10q-20 4-20-12 18-2 20 12" fill="#40cea1"/><path d="M29 14Q13-4 11 16-6 19 9 30 8 47 26 38 43 50 45 32 65 28 47 16 48-3 29 14Z" fill="currentColor"/><circle cx="29" cy="25" r="8" fill="#fff20b"/></g></symbol>
  <symbol id="cloud" viewBox="0 0 150 60" overflow="visible"><path d="M14 53Q-9 35 12 19 21 11 36 18 43-5 66 7 81-5 99 13 119 6 126 24 151 21 147 44 142 66 120 52 109 67 88 53 71 65 55 52 33 67 14 53Z" fill="currentColor" stroke="#101014" stroke-width="5" stroke-linejoin="round"/></symbol>
  <symbol id="note" viewBox="0 0 40 50"><g stroke="#101014" stroke-width="4" stroke-linecap="round"><path d="M17 39V8l17-4v31" fill="none"/><ellipse cx="10" cy="40" rx="8" ry="6" fill="#1d55ff"/><ellipse cx="27" cy="36" rx="8" ry="6" fill="#1d55ff"/></g></symbol>
  <symbol id="tree" viewBox="0 0 150 210" overflow="visible"><g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="m64 117-9 80 24 7 13-93" fill="#fff20b"/><path d="M31 133Q-3 129 6 94-7 67 24 51 16 20 54 21 69-4 91 15 127 8 131 43 163 61 141 88 160 120 128 134 113 161 87 141 55 162 31 133Z" fill="currentColor"/><path d="M72 93 75 139M48 91l25 22 34-31" fill="none"/></g></symbol>
</defs>`;

const stationMarkup = (id, label, content, active = true) => `<g class="world-station" ${active ? `data-station="${id}" role="button" tabindex="0" aria-label="${escape(label)}"` : ''}>${content}</g>`;
function rocketMarkup(rocket, animal) {
  const position = rocket.position || GROUND_ROCKET;
  return `<g id="rocket" transform="translate(${position.x} ${position.y})" ${rocket.riding ? '' : `class="world-station" data-station="rocket" role="button" tabindex="0" aria-label="${escape(text('rocket_board'))}"`}>
    <g stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <ellipse cy="3" rx="36" ry="9" fill="#101014" stroke="none" opacity=".15"/>
      <path class="rocket-flame" d="M-12-30Q-16-8 0 0 17-10 12-30Z" fill="#fff20b" ${rocket.airborne ? '' : 'hidden=""'}/>
      <path d="M-17-63q-23 8-25 40l26-15M17-63q23 8 25 40l-26-15" fill="#ff87ce"/>
      <path d="M-19-111Q-29-78-17-33h34q12-45 2-78Z" fill="#ffffff"/>
      <path d="M-19-111Q-12-135 0-143q13 9 19 32Z" fill="#1d55ff"/>
      <path d="M-17-34h34v9h-34Z" fill="#fff20b"/>
      <path d="m-21-25-9 23h12m39-23 9 23H18" fill="none"/>
      <circle cy="-86" r="20" fill="${SKY.color}"/>
      ${rocket.riding ? `<clipPath id="rocket-window-clip"><circle cy="-86" r="17"/></clipPath><g clip-path="url(#rocket-window-clip)"><use id="rocket-pilot" href="#animal-${animal}" x="-23" y="-111" width="46" height="55"/></g>` : '<path d="m-9-94-3 7" stroke="#ffffff" stroke-width="5"/>'}
      <circle cy="-86" r="20" fill="none"/>
      <path d="M-8-54H8" stroke="#1d55ff" stroke-width="5"/>
    </g>
    <g id="rocket-paint" transform="translate(22 -82) scale(.28)" hidden=""></g>
  </g>`;
}
export const mapLabel = (x, y, text, width = 180, color = '#fffcee') => `<g class="map-label" transform="translate(${x} ${y})"><rect x="${-width / 2}" y="-23" width="${width}" height="38" rx="9" fill="${color}" stroke="#101014" stroke-width="3"/><text y="3" text-anchor="middle" font-size="${Math.min(17, (width - 18) / (text.length * .6 || 1))}" font-weight="900" fill="#101014">${escape(text)}</text></g>`;
export function bandLabel(member, x, y, width, detail) {
  const short = (text, max) => text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return `<g class="map-label" transform="translate(${x} ${y})"><title>${escape(`${member.name}${detail ? ` · ${detail}` : ''}`)}</title><rect x="${-width / 2}" y="-25" width="${width}" height="44" rx="9" fill="#fffcee" stroke="#101014" stroke-width="3"/><text y="-7" text-anchor="middle" font-size="${Math.min(15, (width - 18) / (Math.min(member.name.length, 25) * .66 || 1))}" font-weight="900">${escape(short(member.name, 25))}</text><text y="10" text-anchor="middle" font-size="${Math.min(11, (width - 18) / (Math.min(detail.length, 36) * .64 || 1))}" font-weight="700">${escape(short(detail, 36))}</text></g>`;
}

export function worldMarkup(paint = {}, painting = false, scene = 'world', rocket = {}, animal = ANIMALS[0].id) {
  const P = (id, original, property = 'fill') => {
    const surface = PAINT_SURFACES.find(surface => surface.id === id);
    return paintAttributes(id, original, paint, painting && (!rocket.riding || scene === 'sky') && !!surface?.sky === (scene === 'sky'), property, text(surface?.key || ''));
  };
  const activeGround = scene === 'world' && !rocket.riding;
  const station = (id, label, content) => stationMarkup(id, label, content, activeGround);
  const flowers = FLOWERS;
  const grass = [[175, 690], [480, 700], [1420, 520], [380, 230], [1170, 975], [650, 780], [890, 985], [1100, 265], [210, 1010]];
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="60 120 1480 850" font-family="Trebuchet MS, Arial, sans-serif" aria-hidden="false" aria-label="${escape(text('world_title'))}" preserveAspectRatio="xMidYMid meet">
    ${defs()}
    <rect x="0" y="${SKY.top}" width="1600" height="${WORLD.height - SKY.top}" ${P('sky', SKY.color)}/>
    ${spaceMarkup(paint)}
    <path d="M0 12Q160-9 320 9T640 9 960 9 1280 9 1600 8V${WORLD.height}H0Z" ${P('grass', '#40cea1')}/>
    <path d="M0 12Q160-9 320 9T640 9 960 9 1280 9 1600 8" fill="none" stroke="#101014" stroke-width="4"/>
    <g fill="none" stroke="#101014" stroke-linecap="round" stroke-linejoin="round">
      <path d="${WORLD_PATH}" stroke-width="115"/>
      <path d="${WORLD_PATH}" ${P('path', '#fff20b', 'stroke')} stroke-width="106"/>
    </g>
    <g fill="none" stroke="#101014" stroke-width="3" stroke-linecap="round" opacity=".7">${grass.map(([x, y]) => `<path d="m${x} ${y} -7-14 13 9 3-18 6 15 8-7"/>`).join('')}</g>
    <g transform="translate(195 -295)"><g stroke="#101014" stroke-width="4" ${P('sun', '#fff20b')}><path d="m20 53-26-11 24-10-3-27 22 15 23-22 7 27 28 1-16 21 18 22-29 2-2 28-24-18-25 11Z"/><circle cx="46" cy="49" r="33"/></g><path d="M38 41v10m21-10v10M35 60q12 13 26-1" fill="none" stroke="#101014" stroke-width="4" stroke-linecap="round"/></g>
    ${CLOUDS.map(([x, y, w, h], i) => `<use href="#cloud" x="${x}" y="${y}" width="${w}" height="${h}" overflow="visible" ${P(`cloud-${i}`, '#ffffff', 'color')}/>`).join('')}
    ${TREES.map(([x, y, w, h, color], i) => `<use href="#tree" x="${x}" y="${y}" width="${w}" height="${h}" overflow="visible" ${P(`tree-${i}`, color, 'color')}/>`).join('')}
    <g stroke="#101014" stroke-linejoin="round" stroke-linecap="round">
      <path d="M533 320V150q270-100 552 0v170Z" ${P('stage-wall', '#ffffff')} stroke-width="5"/>
      <path d="M531 153 570 96h474l42 57Z" ${P('stage-roof', '#ff87ce')} stroke-width="5"/>
      <path d="M530 305h556v38H530Z" fill="#fffcee" stroke-width="5"/>
      <path d="M560 307h497" fill="none" stroke-width="4"/>
    </g>
    ${BAND.map((member, i) => {
      const [x, y, width, height, labelX, labelWidth] = [[576, 171, 133, 150, 640, 155], [745, 170, 145, 161, 815, 185], [927, 164, 147, 164, 1002, 188]][i];
      return station(member.id, text('action_member', { name: member.name }), `<use href="#band-${member.id}" x="${x}" y="${y}" width="${width}" height="${height}"/>${bandLabel(member, labelX, 365, labelWidth, member.sound)}`);
    }).join('')}
    ${station('radio', text('sign_radio'), `<g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="m212 473-15 35m200-35 15 35"/><rect x="169" y="467" width="272" height="21" rx="7" fill="#1d55ff"/><path d="M254 352v-26h105v26" fill="none"/><path d="M388 351 413 290" fill="none"/><circle cx="414" cy="286" r="5" fill="#fff20b"/><rect x="182" y="351" width="247" height="119" rx="19" ${P('radio-wall', '#ff87ce')}/><rect x="188" y="345" width="235" height="18" rx="7" ${P('radio-roof', '#1d55ff')}/><circle cx="225" cy="418" r="31" fill="url(#speaker)"/><circle cx="389" cy="418" r="31" fill="url(#speaker)"/><path d="M279 489v-70q29-37 58 0v70Z" fill="#1d55ff"/><path d="M289 428h38" stroke="#fffcee" stroke-width="3"/><circle cx="325" cy="450" r="4" fill="#fff20b"/><text data-paint-ink="radio-wall" x="305" y="385" text-anchor="middle" stroke="none" fill="${readableInk(paint['radio-wall'] || '#ff87ce')}" font-size="${Math.min(18, 210 / (text('sign_radio').length * .61 || 1))}" font-weight="900">${escape(text('sign_radio'))}</text></g><use href="#note" class="floating-note" x="448" y="340" width="33" height="44"/>`)}
    ${station('concerts', text('sign_concerts'), `<g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M1175 460v56m211-56v56" stroke-width="12"/><path d="m1144 329 28-25h220l29 25" ${P('concert-roof', '#ff87ce')}/><rect x="1151" y="328" width="263" height="150" rx="8" ${P('concert-wall', '#fff20b')}/><rect x="1163" y="340" width="240" height="126" rx="3" ${P('concert-wall', '#1d55ff')}/><path d="m1193 399-7 43 51 8 7-45Z" fill="#ff87ce" stroke-width="3"/><path d="M1258 474v-50q24-30 48 0v50Z" fill="#fffcee" stroke-width="3"/><circle cx="1295" cy="448" r="4" fill="#fff20b" stroke-width="2"/><path d="m1330 401-6 40 51 4 5-42Z" fill="#40cea1" stroke-width="3"/><path d="M1201 414h24m-25 9h20M1338 414l21 3m-21 6 21 3" stroke-width="3"/></g><text data-paint-ink="concert-wall" x="1281" y="379" text-anchor="middle" fill="${readableInk(paint['concert-wall'] || '#1d55ff')}" font-size="25" font-weight="900" transform="rotate(-2 1281 379)">${escape(text('concert_board'))}</text>`)}
    ${station('social', text('sign_social'), `<g transform="translate(110 0)"><g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M1264 784v58m-20 0h41" stroke-width="9"/><path d="M1264 784v58m-20 0h41" stroke="#c9ced4" stroke-width="4"/><path d="M1234 683v27m62-27v27" stroke-width="4"/><path d="M1214 786v-48q0-34 51-34t52 34v48Z" fill="#c9ced4"/><path d="M1244 707q29 10 27 39v40" fill="none"/><path d="M1221 734q1-16 21-20" fill="none" stroke="#f9fafb" stroke-width="4"/><path d="M1222 750h38v27h-38Z" fill="#ffffff" stroke-width="3"/><path d="m1223 751 19 14 17-14" fill="none" stroke-width="2"/><path d="M1315 733v-30h19v13h-18" fill="#c9ced4"/></g>${mapLabel(1265, 668, text('sign_social'), 120, '#ffffff')}</g>`)}
    ${station('grownups', text('sign_grownups'), `<g stroke="#101014" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="300" cy="807" rx="115" ry="12" fill="#101014" stroke="none" opacity=".14"/><rect x="196" y="690" width="208" height="112" rx="4" ${P('office-wall', '#fffcee')}/><path d="M183 690 210 650h180l27 40Z" ${P('office-roof', '#1d55ff')}/><path d="M191 802h218" fill="none"/><rect x="229" y="702" width="142" height="30" rx="5" fill="#ffffff" stroke-width="2"/><text x="300" y="723" text-anchor="middle" font-size="${Math.min(20, 130 / (text('sign_grownups').length * .6 || 1))}" stroke="none" font-weight="900">${escape(text('sign_grownups'))}</text><path d="M280 802v-43q20-20 40 0v43Z" fill="#ff87ce"/><circle cx="310" cy="778" r="3" fill="#fff20b" stroke-width="2"/><rect x="213" y="747" width="39" height="32" rx="3" fill="#40cea1" stroke-width="3"/><rect x="348" y="747" width="39" height="32" rx="3" fill="#40cea1" stroke-width="3"/><path d="M232 749v28m-17-14h35M368 749v28m-18-14h35" stroke="#fffcee" stroke-width="2"/></g>`)}
    ${station('wardrobe', text('sign_wardrobe'), `<g transform="translate(800 718)" stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><ellipse cy="2" rx="88" ry="12" fill="#101014" opacity=".14" stroke="none"/><g ${P('home-wall', '#fffcee')}><rect x="38" y="-150" width="15" height="30" rx="2"/><rect x="-78" y="-108" width="156" height="108" rx="4"/></g><path d="M-88-108-65-140H65l23 32Z" ${P('home-roof', '#ff3935')}/><path d="M-86-106H86" fill="none"/><path d="M-19 0v-38q19-24 38 0V0Z" fill="#1d55ff"/><circle cx="10" cy="-17" r="3" fill="#fff20b" stroke-width="2"/><rect x="-62" y="-64" width="28" height="30" rx="3" fill="#40cea1" stroke-width="3"/><rect x="34" y="-64" width="28" height="30" rx="3" fill="#40cea1" stroke-width="3"/><path d="M-48-62v26m-12-13h24M48-62v26M36-49h24" stroke="#fffcee" stroke-width="2"/><path d="M-69-64v30m42-30v30M27-64v30m42-30v30" stroke="#1d55ff" stroke-width="5"/><rect x="-58" y="-100" width="116" height="20" rx="4" fill="#fffcee" stroke-width="2"/><text x="0" y="-86" text-anchor="middle" stroke="none" font-size="${Math.min(9, 106 / (text('sign_wardrobe').length * .57 || 1))}" font-weight="900">${escape(text('sign_wardrobe'))}</text></g>`)}
    ${station('help', text('help_open'), `<g transform="translate(200 0)" stroke="#101014" stroke-linecap="round" stroke-linejoin="round"><path d="M800 718v37" stroke-width="10"/><path d="M800 718v37" stroke="#fffcee" stroke-width="4"/><rect x="755" y="671" width="90" height="56" rx="10" fill="#fff20b" stroke-width="4"/><path d="M785 688h29m-29 10h20" stroke-width="3"/><circle cx="826" cy="698" r="8" fill="#ff87ce" stroke-width="2"/><text x="826" y="702" text-anchor="middle" font-size="13" font-weight="900" stroke="none">?</text><text x="800" y="716" text-anchor="middle" font-size="9" font-weight="900" stroke="none">${escape(text('help_board_label'))}</text></g>`)}
    ${flowers.map(([x, y, color, size], i) => `<use href="#flower" x="${x}" y="${y}" width="${size}" height="${size * 1.2}" ${P(`flower-${i}`, color, 'color')}/>`).join('')}
    <g fill="#1d55ff" stroke="#101014" stroke-width="4"><path d="M0 1040q170-40 350-3t350-4 400 7 500-1v61H0Z" ${P('water', '#1d55ff')}/></g>
    ${socialPadsMarkup('world', activeGround)}
    ${rocketMarkup(rocket, animal)}
    <g id="destination-marker" hidden=""><ellipse rx="17" ry="8" fill="none" stroke="#101014" stroke-width="3" stroke-dasharray="4 4"/></g>
    <g id="player" transform="translate(${WORLD_SPAWN.x} ${WORLD_SPAWN.y})"><ellipse cx="0" cy="0" rx="25" ry="9" fill="#101014" opacity=".18"/><g id="player-body"><use id="player-use" href="#animal-cat" x="-34" y="-77" width="68" height="82"/><g id="carried-tape" transform="translate(-29 -39) scale(.44)" hidden=""></g><g id="carried-paint" transform="translate(12 -44) scale(.38)" hidden=""></g></g><path d="m-5-91 5 6 5-6" fill="none" stroke="#101014" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
  </svg>`;
}
