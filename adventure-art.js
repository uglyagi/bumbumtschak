import { defs, rocketMarkup, landscapeMarkup } from './art.js';
import { planetMarkup } from './space-art.js';
import { COURSE, FINISH_DISTANCE, SUN_DIAMETER, INTRO_ZOOM_IN, INTRO_HOLD_END, INTRO_ZOOM_OUT_END } from './rocket-adventure.js';
import { text } from './content.js';
import { sunHolidayMarkup } from './sun-holiday.js';
import { escapeXML as esc } from './utils.js';

const planetY = (planet, height) => height < planet.diameter + 110 ? height / 2 : Math.max(planet.diameter / 2 + 55, Math.min(height - planet.diameter / 2 - 55, height * planet.height));
export function meteorMarkup(meteor) {
  return `<g transform="translate(${meteor.x.toFixed(1)} ${meteor.y.toFixed(1)})"><g transform="rotate(${meteor.angle.toFixed(1)}) scale(${meteor.radius})" fill="#a68d83" stroke="#101014" stroke-width=".1" stroke-linejoin="round"><path d="M-.95-.2-.65-.82.05-1 .65-.7 1-.12.75.6.12 1-.6.74-1 .2Z"/><ellipse cx="-.3" cy="-.25" rx=".27" ry=".2" fill="#7b6869" stroke-width=".05"/><circle cx=".35" cy=".3" r=".18" fill="#c4afa0" stroke-width=".05"/></g></g>`;
}
export function adventureShipPose(game) {
  const flight = { ...game.ship, scale: .72 };
  if (game.phase !== 'intro' || game.reduced) return flight;
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const blend = (from, to, amount) => from + (to - from) * amount;
  const zoom = (from, to, amount) => Math.exp(blend(Math.log(from), Math.log(to), amount));
  // At the close-up, the cockpit window fills the whole viewport.
  const close = { x: game.width / 2, y: game.height / 2, scale: Math.hypot(game.width, game.height) / 30 * 1.1 };
  const t = game.introTime;
  if (t <= INTRO_ZOOM_IN) {
    const amount = smooth(t / INTRO_ZOOM_IN);
    return { x: blend(game.entry.x, close.x, amount), y: blend(game.entry.y, close.y, amount), scale: zoom(game.entry.scale, close.scale, amount) };
  }
  if (t <= INTRO_HOLD_END) return close;
  const amount = smooth((t - INTRO_HOLD_END) / (INTRO_ZOOM_OUT_END - INTRO_HOLD_END));
  return { x: blend(close.x, flight.x, amount), y: blend(close.y, flight.y, amount), scale: zoom(close.scale, flight.scale, amount) };
}
function adventureBackdropMarkup(game, paint = {}) {
  const w = game.width, h = game.height;
  let seed = 553311; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const stars = Array.from({ length: 200 }, (_, i) => `<circle cx="${(random() * w * 2).toFixed(1)}" cy="${(random() * h).toFixed(1)}" r="${(1 + random() * 1.7).toFixed(1)}" fill="${['#fffcee','#fff20b','#aee5ff','#ffb5df'][i % 4]}" opacity="${i % 3 ? '.7' : '1'}"/>`).join('');
  const sunRadius = SUN_DIAMETER / 2;
  return `<rect width="${w}" height="${h}" fill="#10152d"/><ellipse cx="${w * .75}" cy="${h * .48}" rx="${w * .55}" ry="${h * .3}" fill="#9563db" opacity=".12"/>
    <g id="adventure-stars" aria-hidden="true" transform="translate(${-game.progress * .18 % w} 0)">${stars}</g>
    <g id="adventure-course" ${['playing', 'sun-finale', 'won'].includes(game.phase) ? '' : 'hidden=""'} transform="translate(${w * .25 - game.progress} 0)">
      <g transform="translate(-160 ${h * .57})"><circle r="124" fill="#1d55ff" stroke="#101014" stroke-width="5"/><defs><clipPath id="bum-planet-clip"><circle r="120"/></clipPath></defs><g clip-path="url(#bum-planet-clip)">${landscapeMarkup(paint,'bum-planet',-124,-124,248)}</g><circle r="124" fill="none" stroke="#101014" stroke-width="5"/><text y="156" text-anchor="middle" fill="#fffcee" font-weight="900" font-size="22">${esc(text('adventure_home_planet'))}</text></g>
      ${COURSE.map(planet => planetMarkup({ ...planet, y: planetY(planet, h) })).join('')}
      <g data-planet="sun" transform="translate(${FINISH_DISTANCE + sunRadius} ${h * .5})"><circle r="${sunRadius}" fill="#fff20b" stroke="#101014" stroke-width="6"/><circle r="${sunRadius - 35}" fill="#ffc647"/><path d="M${-sunRadius + 36} -100q-32 100 0 200" fill="none" stroke="#fff7a8" stroke-width="15"/><text x="${-sunRadius + 70}" y="0" fill="#101014" font-size="28" font-weight="900">${esc(text('adventure_sun'))}</text></g>
    </g>
    <g id="adventure-meteors">${(game.sunTime != null ? game.sunMeteors || [] : game.meteors).map(meteorMarkup).join('')}</g>
    <g id="adventure-hud" class="adventure-hud" ${['playing', 'sun-finale', 'won'].includes(game.phase) ? '' : 'hidden=""'}><rect x="20" y="17" width="${Math.max(170, Math.min(w - 40, 470))}" height="58" rx="14" fill="#fffcee" stroke="#101014" stroke-width="3"/><text x="36" y="42" font-size="17" font-weight="900">${esc(text('adventure_title'))}</text><rect x="36" y="53" width="${Math.max(110, Math.min(w - 75, 430))}" height="9" rx="4" fill="#d7d3df"/><rect id="adventure-progress" x="36" y="53" width="${Math.max(110, Math.min(w - 75, 430)) * Math.min(1, game.progress / FINISH_DISTANCE)}" height="9" rx="4" fill="#ff87ce"/></g>
`;
}

export function adventureMarkup(game, animal, paint = {}, hat = false) {
  const backdrop = adventureBackdropMarkup(game, paint);
  if (game.sunTime != null) return sunHolidayMarkup(game, animal, backdrop, hat);
  const w = game.width, h = game.height, pose = adventureShipPose(game);
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="Trebuchet MS,Arial,sans-serif" aria-label="${esc(text('adventure_title'))}">
    ${defs()}${backdrop}
    <g id="adventure-ship" transform="translate(${pose.x} ${pose.y}) scale(${pose.scale})">${rocketMarkup({ position: { x: 0, y: 86 }, riding: true, airborne: game.phase === 'playing', angle: game.angle, hat }, animal)}</g>
    <g id="player" hidden=""><use id="player-use"/></g><g id="destination-marker" hidden=""></g>
  </svg>`;
}
