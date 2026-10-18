import { brandSymbols, socialPadsMarkup } from './social.js';
import { bandSymbols } from './cover-art.js';
import { BAND, text } from './content.js';
import { escapeXML as escape } from './utils.js';
import { WORLD_SPAWN } from './game-core.js';
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

const eyes = `<ellipse cx="37" cy="43" rx="9" ry="12" fill="white"/><path d="M37 31v24" stroke="#1d55ff" stroke-width="6"/><ellipse cx="65" cy="43" rx="9" ry="12" fill="white"/><path d="M65 31v24" stroke="#1d55ff" stroke-width="6"/>`;
const legs = color => `<g class="animal-feet" fill="${color}"><path d="m30 91-4 19q5 7 15 0l3-15M58 96l3 15q11 6 16-1l-6-20"/></g>`;
export const defs = () => `<defs>${brandSymbols}
  <pattern id="speaker" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="#111"/></pattern>
  <symbol id="animal-cat" viewBox="0 0 100 120"><g stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${legs('#ff87ce')}<path d="M73 90q28 1 20-26" fill="none" stroke-width="7"/><ellipse cx="50" cy="81" rx="25" ry="24" fill="#ff87ce"/><path d="M19 46 17 8l24 16q11-6 23-1L84 7l-3 41q1 24-29 25Q19 73 19 46Z" fill="#ff87ce"/><path d="m24 17 3 16 9-7M77 17l-12 10 11 6" fill="#1d55ff" stroke-width="2"/>${eyes}<path d="m47 54 6 0-3 5Z" fill="#111"/><path d="M50 59q-8 9-13 1M50 59q8 9 13 1M20 51 4 46M20 58 3 60M80 51l15-5M80 58l15 3" fill="none" stroke-width="3"/></g></symbol>
  <symbol id="animal-dog" viewBox="0 0 100 120"><g stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${legs('#fff20b')}<path d="M74 90q19 5 19-18" fill="none" stroke-width="7"/><ellipse cx="51" cy="82" rx="25" ry="25" fill="#fff20b"/><path d="M23 28q-25-9-20 25 6 16 19-1M78 28q22-10 19 24-5 20-19 0" fill="#1d55ff"/><path d="M20 40q-2-28 29-28t32 29v9q0 23-30 25T20 50Z" fill="#fff20b"/><path d="M25 24q12-10 23 1v32H27Z" fill="#40cea1" stroke="none"/>${eyes}<ellipse cx="51" cy="57" rx="10" ry="7" fill="#111"/><path d="M44 66q8 19 15 0" fill="#ff87ce"/></g></symbol>
  <symbol id="animal-horse" viewBox="0 0 100 120"><g stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${legs('#1d55ff')}<path d="M76 89q20 11 15-14" fill="none" stroke="#fff20b" stroke-width="9"/><ellipse cx="50" cy="83" rx="25" ry="24" fill="#1d55ff"/><path d="m25 29-1-24q15 0 18 22M62 26Q71-3 80 7l-2 25" fill="#1d55ff"/><path d="M22 46q-2-22 28-24t30 25l6 19q0 20-33 19T15 66Z" fill="#1d55ff"/><path d="m34 26 3-17 10 8 9-15 5 20 12-5-3 15Z" fill="#fff20b"/>${eyes}<ellipse cx="50" cy="69" rx="32" ry="17" fill="#40cea1"/><path d="M31 66h1M68 66h1M39 77q14 6 24-2" fill="none" stroke-width="4"/></g></symbol>
  <symbol id="animal-monkey" viewBox="0 0 100 120"><g stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${legs('#40cea1')}<path d="M73 92q27-5 16-29-11-13-14 0 0 7 8 5" fill="none" stroke="#101014" stroke-width="10"/><path d="M73 92q27-5 16-29-11-13-14 0 0 7 8 5" fill="none" stroke="#40cea1" stroke-width="5"/><ellipse cx="50" cy="82" rx="24" ry="25" fill="#40cea1"/><circle cx="15" cy="38" r="13" fill="#40cea1"/><circle cx="85" cy="38" r="13" fill="#40cea1"/><circle cx="15" cy="38" r="5" fill="#ff87ce" stroke="none"/><circle cx="85" cy="38" r="5" fill="#ff87ce" stroke="none"/><path d="M21 41q-5-30 29-31 32 1 29 31l4 13q0 21-33 21T17 54Z" fill="#40cea1"/><path d="M27 35q9-20 23-4 17-16 25 5l-5 28q-21 12-40-2Z" fill="#fff20b"/>${eyes}<path d="M46 55h7M36 61q15 13 30-1" fill="none" stroke-width="3"/></g></symbol>
  ${bandSymbols()}
  <symbol id="flower" viewBox="0 0 60 70"><g stroke="#101014" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M31 36v29m0-10q-20 4-20-12 18-2 20 12" fill="#40cea1"/><path d="M29 14Q13-4 11 16-6 19 9 30 8 47 26 38 43 50 45 32 65 28 47 16 48-3 29 14Z" fill="currentColor"/><circle cx="29" cy="25" r="8" fill="#fff20b"/></g></symbol>
  <symbol id="cloud" viewBox="0 0 150 60"><path d="M14 53Q-9 35 12 19 21 11 36 18 43-5 66 7 81-5 99 13 119 6 126 24 151 21 147 44 142 66 120 52 109 67 88 53 71 65 55 52 33 67 14 53Z" fill="white" stroke="#101014" stroke-width="5" stroke-linejoin="round"/></symbol>
  <symbol id="note" viewBox="0 0 40 50"><g stroke="#101014" stroke-width="4" stroke-linecap="round"><path d="M17 39V8l17-4v31" fill="none"/><ellipse cx="10" cy="40" rx="8" ry="6" fill="#1d55ff"/><ellipse cx="27" cy="36" rx="8" ry="6" fill="#1d55ff"/></g></symbol>
  <symbol id="tree" viewBox="0 0 150 210"><g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="m64 117-9 80 24 7 13-93" fill="#fff20b"/><path d="M31 133Q-3 129 6 94-7 67 24 51 16 20 54 21 69-4 91 15 127 8 131 43 163 61 141 88 160 120 128 134 113 161 87 141 55 162 31 133Z" fill="currentColor"/><path d="M72 93 75 139M48 91l25 22 34-31" fill="none"/></g></symbol>
</defs>`;

const station = (id, label, content) => `<g class="world-station" data-station="${id}" role="button" tabindex="0" aria-label="${escape(label)}">${content}</g>`;
export const mapLabel = (x, y, text, width = 180, color = '#fffcee') => `<g class="map-label" transform="translate(${x} ${y})"><rect x="${-width / 2}" y="-23" width="${width}" height="38" rx="9" fill="${color}" stroke="#101014" stroke-width="3"/><text y="3" text-anchor="middle" font-size="${Math.min(17, (width - 18) / (text.length * .6 || 1))}" font-weight="900" fill="#101014">${escape(text)}</text></g>`;
export function bandLabel(member, x, y, width, detail) {
  const short = (text, max) => text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return `<g class="map-label" transform="translate(${x} ${y})"><title>${escape(`${member.name}${detail ? ` · ${detail}` : ''}`)}</title><rect x="${-width / 2}" y="-25" width="${width}" height="44" rx="9" fill="#fffcee" stroke="#101014" stroke-width="3"/><text y="-7" text-anchor="middle" font-size="${Math.min(15, (width - 18) / (Math.min(member.name.length, 25) * .66 || 1))}" font-weight="900">${escape(short(member.name, 25))}</text><text y="10" text-anchor="middle" font-size="${Math.min(11, (width - 18) / (Math.min(detail.length, 36) * .64 || 1))}" font-weight="700">${escape(short(detail, 36))}</text></g>`;
}

export function worldMarkup() {
  const flowers = [[445, 560, '#ff87ce', 35], [105, 610, '#fff20b', 43], [1090, 595, '#ff87ce', 40], [1385, 600, '#fff20b', 33], [1030, 920, '#fff20b', 44], [710, 915, '#ff87ce', 36], [400, 940, '#ff87ce', 36], [1410, 960, '#ff87ce', 50], [450, 255, '#fff20b', 38], [1130, 150, '#ff87ce', 40], [120, 350, '#ff87ce', 32]];
  const grass = [[175, 690], [480, 700], [1040, 710], [1420, 520], [380, 230], [1170, 975], [650, 780], [890, 985], [1100, 265], [210, 1010]];
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="60 120 1480 850" font-family="Trebuchet MS, Arial, sans-serif" aria-hidden="false" aria-label="${escape(text('world_title'))}" preserveAspectRatio="xMidYMid meet">
    ${defs()}
    <rect width="1600" height="1100" fill="#40cea1"/>
    <g fill="none" stroke="#101014" stroke-linecap="round" stroke-linejoin="round">
      <path d="M300 1020Q255 900 300 750T315 560Q280 466 440 475L1110 475Q1320 440 1280 610L1265 850Q1150 945 910 810T670 670Q560 610 570 500M815 500V320M800 665Q840 660 895 695" stroke-width="115"/>
      <path d="M300 1020Q255 900 300 750T315 560Q280 466 440 475L1110 475Q1320 440 1280 610L1265 850Q1150 945 910 810T670 670Q560 610 570 500M815 500V320M800 665Q840 660 895 695" stroke="#fff20b" stroke-width="106"/>
      <path d="M800 755v65q45-5 95-10" stroke-width="76"/>
      <path d="M800 755v65q45-5 95-10" stroke="#fff20b" stroke-width="67"/>
    </g>
    <g fill="none" stroke="#101014" stroke-width="3" stroke-linecap="round" opacity=".7">${grass.map(([x, y]) => `<path d="m${x} ${y} -7-14 13 9 3-18 6 15 8-7"/>`).join('')}</g>
    <g transform="translate(195 105)"><g stroke="#101014" stroke-width="4" fill="#fff20b"><path d="m20 53-26-11 24-10-3-27 22 15 23-22 7 27 28 1-16 21 18 22-29 2-2 28-24-18-25 11Z"/><circle cx="46" cy="49" r="33"/></g><path d="M38 41v10m21-10v10M35 60q12 13 26-1" fill="none" stroke="#101014" stroke-width="4" stroke-linecap="round"/></g>
    <use href="#cloud" x="356" y="100" width="140" height="60"/>
    <use href="#cloud" x="1155" y="110" width="145" height="60"/>
    <use href="#tree" x="35" y="85" width="150" height="210" style="color:#ff87ce"/>
    <use href="#tree" x="1390" y="105" width="170" height="225" style="color:#fff20b"/>
    <use href="#tree" x="1440" y="700" width="130" height="210" style="color:#ff87ce"/>
    <use href="#tree" x="30" y="850" width="145" height="210" style="color:#1d55ff"/>
    <use href="#tree" x="500" y="805" width="110" height="155" style="color:#ff87ce"/>
    <g stroke="#101014" stroke-linejoin="round" stroke-linecap="round">
      <path d="M533 320V150q270-100 552 0v170Z" fill="#ffffff" stroke-width="5"/>
      <path d="M531 153 570 96h474l42 57Z" fill="#ff87ce" stroke-width="5"/>
      <path d="M530 305h556v38H530Z" fill="#fffcee" stroke-width="5"/>
      <path d="M560 307h497" fill="none" stroke-width="4"/>
    </g>
    ${BAND.map((member, i) => {
      const [x, y, width, height, labelX, labelWidth] = [[576, 171, 133, 150, 640, 155], [745, 170, 145, 161, 815, 185], [927, 164, 147, 164, 1002, 188]][i];
      return station(member.id, text('action_member', { name: member.name }), `<use href="#band-${member.id}" x="${x}" y="${y}" width="${width}" height="${height}"/>${bandLabel(member, labelX, 365, labelWidth, member.sound)}`);
    }).join('')}
    ${station('radio', text('sign_radio'), `<g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="m212 473-15 35m200-35 15 35"/><rect x="169" y="467" width="272" height="21" rx="7" fill="#1d55ff"/><path d="M254 352v-26h105v26" fill="none"/><path d="M388 351 413 290" fill="none"/><circle cx="414" cy="286" r="5" fill="#fff20b"/><rect x="182" y="351" width="247" height="119" rx="19" fill="#ff87ce"/><circle cx="225" cy="413" r="31" fill="url(#speaker)"/><circle cx="389" cy="413" r="31" fill="url(#speaker)"/><path d="M279 489v-75q29-37 58 0v75Z" fill="#1d55ff"/><path d="M289 424h38" stroke="#fffcee" stroke-width="3"/><circle cx="325" cy="450" r="4" fill="#fff20b"/><path d="M276 371h67" stroke-width="10"/><path d="M278 371h35" stroke="#1d55ff" stroke-width="4"/></g>${mapLabel(305, 526, text('sign_radio').toUpperCase(), 225, '#ff87ce')}<use href="#note" class="floating-note" x="448" y="340" width="33" height="44"/>`)}
    ${station('concerts', text('sign_concerts'), `<g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M1175 460v56m211-56v56" stroke-width="12"/><path d="m1144 329 28-25h220l29 25" fill="#ff87ce"/><rect x="1151" y="328" width="263" height="150" rx="8" fill="#fff20b"/><rect x="1163" y="340" width="240" height="126" rx="3" fill="#1d55ff"/><path d="m1193 399-7 43 51 8 7-45Z" fill="#ff87ce" stroke-width="3"/><path d="M1258 474v-50q24-30 48 0v50Z" fill="#fffcee" stroke-width="3"/><circle cx="1295" cy="448" r="4" fill="#fff20b" stroke-width="2"/><path d="m1330 401-6 40 51 4 5-42Z" fill="#40cea1" stroke-width="3"/><path d="M1201 414h24m-25 9h20M1338 414l21 3m-21 6 21 3" stroke-width="3"/></g><text x="1281" y="379" text-anchor="middle" fill="white" font-size="25" font-weight="900" transform="rotate(-2 1281 379)">${escape(text('concert_board'))}</text>${mapLabel(1280, 527, text('sign_concerts').toUpperCase(), 225)}`)}
    ${station('social', text('sign_social'), `<g stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M1264 784v58m-20 0h41"/><path d="M1214 786v-48q0-34 51-34t52 34v48Z" fill="#ff87ce"/><path d="M1244 707q29 10 27 39v40" fill="none"/><path d="M1280 739h25"/><path d="M1222 750h38v27h-38Z" fill="#fffcee" stroke-width="3"/><path d="m1223 751 19 14 17-14" fill="none" stroke-width="2"/><path d="M1315 733v-30h19v13h-18" fill="#fff20b"/></g>${mapLabel(1265, 875, text('sign_social').toUpperCase(), 225, '#ff87ce')}`)}
    ${station('grownups', text('sign_grownups'), `<g stroke="#101014" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="m195 799-10 42m218-42 12 42"/><path d="m173 768 30-24h183l39 24v30H173Z" fill="#1d55ff"/><path d="m229 751 8-38 84 11-5 40Z" fill="#fffcee" stroke-width="3"/><path d="m249 727 57 8m-58 4 46 7m-49 5 49 7" stroke-width="3"/><path d="M353 736v23q18 13 31 0v-23Z" fill="#ff87ce" stroke-width="3"/><path d="M384 740q20-3 11 13l-11 1" fill="none" stroke-width="3"/></g>${mapLabel(300, 864, text('sign_grownups').toUpperCase(), 195)}`)}
    ${station('wardrobe', text('sign_wardrobe'), `<g transform="translate(800 740)" stroke="#101014" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><ellipse cy="1" rx="111" ry="17" fill="#101014" opacity=".14" stroke="none"/><rect x="-90" y="-140" width="180" height="140" rx="10" fill="#fffcee"/><path d="m-110-140 110-75 110 75Z" fill="#ff87ce"/><path d="M-98-136H98" stroke="#1d55ff" stroke-width="8"/><rect x="-70" y="-104" width="39" height="38" rx="6" fill="#40cea1"/><rect x="31" y="-104" width="39" height="38" rx="6" fill="#fff20b"/><path d="M-51-103v36m-18-18h36M51-103v36M33-85h35" stroke-width="3"/><path d="M-26 0v-64q26-28 52 0V0Z" fill="#1d55ff"/><circle cx="15" cy="-27" r="4" fill="#fff20b" stroke-width="2"/><ellipse cx="0" cy="-166" rx="12" ry="10" fill="#fff20b" stroke-width="3"/><circle cx="-17" cy="-179" r="5" fill="#fff20b" stroke-width="2"/><circle cx="0" cy="-185" r="5" fill="#fff20b" stroke-width="2"/><circle cx="17" cy="-179" r="5" fill="#fff20b" stroke-width="2"/></g>${mapLabel(800, 779, text('sign_wardrobe').toUpperCase(), 186, '#ff87ce')}`)}
    ${station('help', text('help_open'), `<g transform="translate(200 0)" stroke="#101014" stroke-linecap="round" stroke-linejoin="round"><path d="M800 718v37" stroke-width="10"/><path d="M800 718v37" stroke="#fffcee" stroke-width="4"/><rect x="755" y="671" width="90" height="56" rx="10" fill="#fff20b" stroke-width="4"/><path d="M785 688h29m-29 10h20" stroke-width="3"/><circle cx="826" cy="698" r="8" fill="#ff87ce" stroke-width="2"/><text x="826" y="702" text-anchor="middle" font-size="13" font-weight="900" stroke="none">?</text><text x="800" y="716" text-anchor="middle" font-size="9" font-weight="900" stroke="none">${escape(text('help_board_label'))}</text></g>`)}
    ${flowers.map(([x, y, color, size]) => `<use href="#flower" x="${x}" y="${y}" width="${size}" height="${size * 1.2}" style="color:${color}"/>`).join('')}
    <g transform="translate(1115 670) rotate(15)" stroke="#101014" stroke-width="3" stroke-linejoin="round"><path d="M14 21q-30-35-28-7 0 15 26 14-27 16-11 23 15 5 19-19 14 29 25 13 7-12-20-20 31-5 18-22-14-11-25 21" fill="#ff87ce"/><path d="M16 21v14m-2-12-5-10m11 9 7-12" fill="none"/></g>
    <g fill="#1d55ff" stroke="#101014" stroke-width="4"><path d="M0 1040q170-40 350-3t350-4 400 7 500-1v61H0Z"/></g>
    ${socialPadsMarkup('world')}
    <g id="destination-marker" hidden=""><ellipse rx="17" ry="8" fill="none" stroke="#101014" stroke-width="3" stroke-dasharray="4 4"/></g>
    <g id="player" transform="translate(${WORLD_SPAWN.x} ${WORLD_SPAWN.y})"><ellipse cx="0" cy="0" rx="25" ry="9" fill="#101014" opacity=".18"/><g id="player-body"><use id="player-use" href="#animal-cat" x="-34" y="-77" width="68" height="82"/><g id="carried-tape" transform="translate(-29 -39) scale(.44)" hidden=""></g></g><path d="m-5-91 5 6 5-6" fill="none" stroke="#101014" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>
  </svg>`;
}
