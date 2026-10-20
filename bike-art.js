import { defs } from './art.js';
import { text, PALETTE } from './content.js';
import { escapeXML as escape } from './utils.js';
import { animalHref } from './hat-quest.js';
import { BIKE_LEVELS, BIKE_FINISH, BIKE_RIDER_Y, bikeRoadCenter, bikeTime } from './bike-race.js';

export function bicycleMarkup(level = 'mittel', moving = false) {
  const color = BIKE_LEVELS[level]?.color || BIKE_LEVELS.mittel.color, mountain = level === 'schwer', trike = level === 'leicht';
  return '<g class="bicycle' + (moving ? ' is-pedaling' : '') + '" stroke="#101014" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">'
    + (trike ? '<ellipse cx="-25" cy="0" rx="7" ry="18" fill="#101014"/><ellipse cx="25" cy="0" rx="7" ry="18" fill="#101014"/><path d="M-25-4h50M-24-10 0-31 24-10" stroke="' + color + '" stroke-width="7"/>' : '<ellipse cy="-27" rx="7" ry="20" fill="#101014"/>')
    + '<path d="M0-42V1m-17-30L0-9l17-20" stroke="' + color + '" stroke-width="' + (mountain ? 9 : 7) + '"/>'
    + '<ellipse cy="3" rx="' + (mountain ? 12 : 8) + '" ry="25" fill="#101014"/><path d="M0-16v37" stroke="#bfc6cc" stroke-width="3"/>'
    + (mountain ? '<path d="m-10-11 20 6m-21 5 22 6m-21 5 20 6M-13-37v17m26-17v17" stroke="#f2f2ee" stroke-width="3"/><path d="M-13-26v10m26-10v10" stroke="#fff20b" stroke-width="6"/>' : '')
    + '<path d="M-26-44h13l13 9 13-9h13" fill="none"/><path d="M-28-44h11m34 0h11" stroke-width="7"/>'
    + '<path d="M-10-50h20" stroke-width="6"/><g class="bike-pedals"><path d="M-15-8h8m14 0h8" stroke-width="5"/></g></g>';
}
export function parkedBicyclesMarkup(garage) {
  return garage.unlocked.filter(level => level !== garage.riding).map(level => {
    const p = garage.positions[level];
    return '<g data-bicycle="' + level + '" class="world-station" tabindex="0" role="button" aria-label="' + escape(text('bike_mount', { rad: text('bike_reward_' + level) })) + '" transform="translate(' + p.x + ' ' + p.y + ')"><ellipse cy="10" rx="32" ry="10" fill="#101014" opacity=".14"/>' + bicycleMarkup(level) + '</g>';
  }).join('');
}
export function bikeDoorMarkup(open) {
  return open ? '<g data-room-target="bike-door" role="button" tabindex="0" aria-label="' + escape(text('bike_enter')) + '"><path d="M595 480V383a39 39 0 0 1 78 0v97Z" fill="#1238a8"/><path d="M602 480V383a32 32 0 0 1 64 0v97" fill="none" stroke="#fff20b" stroke-width="6"/><path d="M598 480h72v26h-72" fill="#fff6a3" stroke-width="3"/><rect x="562" y="309" width="144" height="32" rx="10" fill="#fffcee" stroke-width="3"/><text x="634" y="331" text-anchor="middle" stroke="none" font-size="20" font-weight="900">' + escape(text('bike_title')) + '</text><path d="m612 414 10-13 12 13 12-13 10 13" fill="none" stroke="#fff20b" stroke-width="4"/></g>' : '<circle cx="634" cy="394" r="47" fill="url(#speaker)"/>';
}
export function bikeTerrainMarkup(race, paint = {}) {
  const half = BIKE_LEVELS[race.difficulty].halfWidth, points = [];
  for (let y = -80; y <= 780; y += 20) points.push({ y, x: bikeRoadCenter(race.progress + y - BIKE_RIDER_Y) });
  const road = 'M' + points.map(p => (p.x - half).toFixed(1) + ' ' + p.y).join('L') + 'L'
    + [...points].reverse().map(p => (p.x + half).toFixed(1) + ' ' + p.y).join('L') + 'Z';
  const palette = id => PALETTE.find(color => color.id === id)?.color;
  const grass = paint.grass || palette('green-light') || '#b5ed9b', path = paint.path || palette('yellow-light') || '#fff6a3';
  let scenery = '<rect x="-5" y="-5" width="1010" height="710" fill="' + escape(grass) + '"/><path d="' + road + '" fill="' + escape(path) + '" stroke="#101014" stroke-width="5"/>';
  const first = Math.max(-3, Math.floor((race.progress - BIKE_RIDER_Y - 100) / 130));
  for (let i = first; i < first + 9; i++) {
    const distance = i * 130, y = BIKE_RIDER_Y + distance - race.progress, center = bikeRoadCenter(distance);
    scenery += '<path d="M' + center.toFixed(1) + ' ' + (y - 12).toFixed(1) + 'v24" stroke="#fffcee" stroke-width="7" stroke-linecap="round"/>';
    for (const side of [-1, 1]) {
      const x = center + side * (half + 55 + (Math.abs(i) % 3) * 24);
      scenery += Math.abs(i) % 3 === 0
        ? '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" stroke="#101014" stroke-width="3"><path d="M0 0v-38" stroke="#985d31" stroke-width="10"/><path d="M-26-32q-22-22 0-40 2-28 25-22 27-10 30 19 22 23-3 38Z" fill="' + escape(palette('green') || '#4acb59') + '"/></g>'
        : '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')" stroke="#101014" stroke-width="2.5"><path d="M0 0v-23" stroke="#178346"/><path d="M0-23q-17-20-18-4-16 8 1 14 8 14 17-1 17 10 17-5 1-17-17-4Z" fill="' + (Math.abs(i) % 2 ? '#ff87ce' : '#fff20b') + '"/></g>';
    }
  }
  for (const rock of race.rocks) {
    const y = BIKE_RIDER_Y + rock.distance - race.progress;
    if (y < -60 || y > 760) continue;
    scenery += '<g transform="translate(' + rock.x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (rock.radius / 22).toFixed(3) + ')"><path d="m-22 8 4-23 20-10 21 16 4 20-27 7Z" fill="#969ba5" stroke="#101014" stroke-width="3"/><path d="m-12-8 13-8 9 8" fill="none" stroke="#dce0e3" stroke-width="4"/></g>';
  }
  const finishY = BIKE_RIDER_Y + BIKE_FINISH - race.progress;
  if (finishY < 800) {
    const center = bikeRoadCenter(BIKE_FINISH);
    scenery += '<g transform="translate(' + center.toFixed(1) + ' ' + finishY.toFixed(1) + ')"><rect x="' + -half + '" y="-14" width="' + half * 2 + '" height="28" fill="#fffcee" stroke="#101014" stroke-width="3"/>'
      + Array.from({length:14},(_,i)=>'<rect x="' + (-half + i * half / 7) + '" y="' + (i % 2 ? 0 : -14) + '" width="' + half / 7 + '" height="14" fill="#101014"/>').join('')
      + '<text y="57" text-anchor="middle" font-size="28" font-weight="900" fill="#101014">' + escape(text('bike_finish')) + '</text></g>';
  }
  return scenery;
}
export function bikeRiderTransform(race, reduced = false) {
  const fallen = race.fall > 0, recovery = fallen ? Math.min(1, race.fall / .65) : 0;
  return 'translate(' + race.x.toFixed(2) + ' ' + BIKE_RIDER_Y + ') rotate(' + (reduced ? 0 : -62 * recovery).toFixed(2) + ') scale(1.3)';
}
export function bikeRaceMarkup(race, animal, paint, hat = false) {
  return '<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" font-family="Trebuchet MS,Arial,sans-serif" aria-label="' + escape(text('bike_title')) + '">' + defs()
    + '<g id="bike-terrain">' + bikeTerrainMarkup(race, paint) + '</g>'
    + '<g id="bike-rider" transform="' + bikeRiderTransform(race) + '"><ellipse cy="10" rx="30" ry="10" fill="#101014" opacity=".15"/><use href="' + animalHref(animal, hat) + '" x="-34" y="-98" width="68" height="82"/>' + bicycleMarkup(race.difficulty, true) + '</g>'
    + '<g id="bike-hud" pointer-events="none"><rect x="22" y="20" width="285" height="94" rx="18" fill="#fffcee" stroke="#101014" stroke-width="4"/><text x="42" y="50" font-size="19" font-weight="900">' + escape(text('bike_title')) + ' · ' + escape(text('bike_level_' + race.difficulty)) + '</text><text id="bike-clock" x="42" y="91" font-size="34" font-weight="900">' + bikeTime(race.elapsed) + '</text><text id="bike-falls" x="288" y="90" text-anchor="end" font-size="17">' + escape(text('bike_falls', { anzahl: race.falls })) + '</text><rect x="341" y="36" width="340" height="16" rx="8" fill="#fffcee" stroke="#101014" stroke-width="3"/><rect id="bike-progress" x="343" y="38" width="' + (336 * race.progress / BIKE_FINISH).toFixed(1) + '" height="12" rx="6" fill="#ff87ce"/>'
    + '<g id="bike-recovery"' + (race.fall ? '' : ' hidden=""') + '><rect x="325" y="310" width="350" height="72" rx="18" fill="#fffcee" stroke="#101014" stroke-width="4"/><text id="bike-recovery-text" x="500" y="355" text-anchor="middle" font-size="25" font-weight="900">' + escape(text('bike_recover', { sekunden: '3,0' })) + '</text></g></g>'
    + '<g id="player" hidden=""><use id="player-use"/></g><g id="destination-marker" hidden=""></g></svg>';
}
