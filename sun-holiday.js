import { defs, rocketMarkup } from './art.js';
import { text } from './content.js';
import { escapeXML as esc } from './utils.js';

const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
const blend = (a, b, t) => a + (b - a) * t;
export const holidayTransform = pose => `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${(pose.angle || 0).toFixed(2)}) scale(${pose.scale.toFixed(3)})`;
export function sunHolidayPose(game) {
  const t = game.sunTime ?? 0, w = game.width, h = game.height, scale = clamp(w / 800, .8, 1.25), ground = h * .72;
  const landed = smooth(t / 2.2), walking = smooth((t - 2.7) / 2.2), reclining = smooth((t - 6.4) / .8);
  const shipX = w * .21, chairX = w * .68;
  const stage = t < 2.2 ? 'landing' : t < 4.9 ? 'chair' : t < 5.7 ? 'unfolding' : t < 6.4 ? 'glasses' : 'relaxing';
  return {
    stage, caption: `sun_story_${stage}`, ground, scale,
    shuttle: { x: blend((game.sunFrom?.x ?? .25) * w, shipX, landed), y: blend((game.sunFrom?.y ?? .5) * h, ground - 86 * scale, landed), scale: blend(.72, scale, landed), angle: blend(90, 0, landed) },
    airborne: t < 2.2, pilot: t < 2.35, hatch: t >= 2.25 && t < 3.2,
    actor: { x: blend(shipX + 27 * scale, chairX + 23 * scale, walking) + 11 * scale * reclining, y: ground - 17 * scale * reclining + (!game.reduced && t >= 7.2 ? Math.sin((t - 7.2) * 2) * .8 : 0), scale, angle: -62 * reclining },
    actorVisible: t >= 2.35, walking: t >= 2.7 && t < 4.9,
    foldedChair: t >= 2.7 && t < 4.9,
    chair: { x: chairX, y: ground, scale, angle: 0 }, chairVisible: t >= 4.9, chairOpen: blend(.13, 1, smooth((t - 4.9) / .8)),
    glasses: t >= 5.7, glassesY: blend(-25, -48, smooth((t - 5.7) / .7)),
  };
}
const sunglassesMarkup = '<g fill="#101014" stroke="#101014" stroke-width="3" stroke-linejoin="round"><path d="M-20-8h17l-2 17h-13ZM3-8h17l-2 17H5Z"/><path d="M-3-3h6m-23-2-6-3m46 3 6-3" fill="none"/><path d="m-15-3 5 1M8-3l5 1" stroke="#ffffff" stroke-width="2.5"/></g>';
const foldedChairMarkup = '<g stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M-12-30 12 31M12-30-12 31" fill="none"/><path d="M-12-30H12L7 16H-7Z" fill="#ff87ce"/><path d="M-4-28h8L2 15H-2Z" fill="#fffcee" stroke="none"/></g>';
const loungerMarkup = '<g stroke="#101014" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M-68-51-38 19M-28-6-49 19M40-6 63 19M-52 19h25M51 19h24" fill="none"/><path d="m-68-55 53 39H65V-3H-19l-57-43Z" fill="#ff87ce"/><path d="m-62-49 9 6 47 35h13l-51-39ZM22-14h14v9H22Zm28 0h12v9H50Z" fill="#fffcee" stroke="none"/></g>';
export function sunHolidayMarkup(game, animal) {
  const p = sunHolidayPose(game), w = game.width, h = game.height;
  let seed = 7331; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const stars = Array.from({ length: 100 }, (_, i) => `<circle cx="${(random() * w).toFixed(1)}" cy="${(random() * h * .58).toFixed(1)}" r="${i % 4 ? 1.4 : 2.4}" fill="${i % 3 ? '#fffcee' : '#ffb5df'}" opacity=".8"/>`).join('');
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="Trebuchet MS,Arial,sans-serif" aria-label="${esc(text('sun_holiday_title'))}">${defs()}
    <rect width="${w}" height="${h}" fill="#10152d"/>${stars}
    <g id="sun-holiday"><path d="M-50 ${p.ground - 25}Q${w / 2} ${p.ground - 130} ${w + 50} ${p.ground - 25}V${h + 50}H-50Z" fill="#fff20b" stroke="#101014" stroke-width="5"/>
      <path d="M0 ${h - 26}Q${w * .3} ${h - 72} ${w * .54} ${h - 25}T${w} ${h - 32}" fill="none" stroke="#ffc647" stroke-width="26" stroke-linecap="round"/>
      <ellipse cx="${w * .43}" cy="${h * .88}" rx="${45 * p.scale}" ry="${12 * p.scale}" fill="#ffc647"/><ellipse cx="${w * .85}" cy="${h * .92}" rx="${33 * p.scale}" ry="${8 * p.scale}" fill="#ffc647"/>
      <text id="sun-story" x="${w / 2}" y="${Math.min(92, h * .14)}" text-anchor="middle" fill="#fffcee" font-size="${w < 500 ? 19 : 27}" font-weight="900">${esc(text(p.caption))}</text>
      <g id="sun-shuttle" transform="${holidayTransform({ ...p.shuttle, angle: 0 })}">${rocketMarkup({ position: { x: 0, y: 86 }, riding: true, airborne: p.airborne, angle: p.shuttle.angle, pilotHidden: !p.pilot }, animal)}<g id="sun-hatch" ${p.hatch ? '' : 'hidden=""'}><path d="M14 17h20v35H14Z" fill="#1d55ff" stroke="#101014" stroke-width="3"/><path d="m34 17 14 7v35l-14-7Z" fill="#ff87ce" stroke="#101014" stroke-width="3"/></g></g>
      <g id="sun-lounger" transform="${holidayTransform(p.chair)}" ${p.chairVisible ? '' : 'hidden=""'}><g id="sun-lounger-open" transform="scale(${p.chairOpen} 1)">${loungerMarkup}</g></g>
      <g id="sun-actor" transform="${holidayTransform(p.actor)}" ${p.actorVisible ? '' : 'hidden=""'}><g id="sun-actor-body"><use href="#animal-${animal}" x="-34" y="-77" width="68" height="82"/><g id="sun-sunglasses" transform="translate(0 ${p.glassesY})" ${p.glasses ? '' : 'hidden=""'}>${sunglassesMarkup}</g><g id="sun-folded-chair" transform="translate(30 -26) rotate(-12) scale(.72)" ${p.foldedChair ? '' : 'hidden=""'}>${foldedChairMarkup}</g></g></g>
    </g><g id="player" hidden=""><use id="player-use"/></g><g id="destination-marker" hidden=""></g></svg>`;
}
