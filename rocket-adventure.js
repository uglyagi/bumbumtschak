import { PLANETS, CSS_PIXELS_PER_CM } from './solar-system.js';
import { GROUND_ROCKET } from './sky-world.js';

// NASA mean radii. One Earth diameter is one CSS centimetre.
// Sun: https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html
export const SUN_RADIUS_KM = 695700;
export const EARTH_RADIUS_KM = 6371;
export const ADVENTURE_PLANETS = [...PLANETS].reverse().map(planet => ({ ...planet, diameter: CSS_PIXELS_PER_CM * planet.radiusKm / EARTH_RADIUS_KM }));
let edge = 1050;
export const COURSE = ADVENTURE_PLANETS.map((planet, i) => {
  const x = edge + planet.diameter / 2; edge = x + planet.diameter / 2 + 620;
  return { ...planet, x, height: [.32, .67, .36, .64, .33, .62, .35, .65][i] };
});
export const SUN_DIAMETER = CSS_PIXELS_PER_CM * SUN_RADIUS_KM / EARTH_RADIUS_KM;
export const FINISH_DISTANCE = edge + 180;
export const INTRO_ZOOM_IN = 1.5;
export const INTRO_HOLD_END = 1.85;
export const INTRO_ZOOM_OUT_END = 3.55;
export const INTRO_DURATION = 4.2;
export const SUN_ZOOM_IN = 1.5;
export const SUN_BACKGROUND_SWAP = 1.7;
export const SUN_ZOOM_OUT_START = 1.9;
export const SUN_TRANSITION_DURATION = 3.6;
export const SUN_STORY_DURATION = 10.2;
export const SUN_HOLIDAY_DURATION = SUN_TRANSITION_DURATION + SUN_STORY_DURATION;
export const sunTransitionDuration = game => game.reduced ? .35 : SUN_TRANSITION_DURATION;
export const sunHolidayDuration = game => sunTransitionDuration(game) + SUN_STORY_DURATION;
const METEOR_DIRECTIONS = [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, -1], [1, 1], [-1, -1]];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const random = game => { game.seed = (Math.imul(game.seed, 1664525) + 1013904223) >>> 0; return game.seed / 4294967296; };
export function createAdventure(width, height, seed = 1, entry = null) {
  return { phase: 'intro', width, height, seed: seed >>> 0, entry: entry || { x: width * .5, y: height * .5, scale: .8 }, ship: { x: width * .25, y: height * .5 }, introTime: 0, time: 0, progress: 0, nextMeteor: 2, meteors: [], meteorId: 0, angle: 0, sunTime: null, sunFrom: null, sunMeteors: [] };
}
export function startAdventure(game) {
  game.phase = 'playing'; game.time = 0; game.progress = 0; game.meteors = []; game.nextMeteor = 2; game.meteorId = 0; game.angle = 90;
  game.ship = { x: game.width * .25, y: game.height * .5 };
  game.sunTime = null; game.sunFrom = null; game.sunMeteors = [];
}
export function resizeAdventure(game, width, height) {
  game.ship.x *= width / game.width; game.ship.y *= height / game.height;
  game.entry.x *= width / game.width; game.entry.y *= height / game.height;
  for (const meteor of [...game.meteors, ...(game.sunMeteors || [])]) { meteor.x *= width / game.width; meteor.y *= height / game.height; }
  game.width = width; game.height = height;
}
export function meteorHits(from, to, radius) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = clamp(-(from.x * dx + from.y * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(from.x + t * dx, from.y + t * dy) <= radius;
}
function spawnMeteor(game, scrollSpeed) {
  const radius = 20 + random(game) * 50;
  const [dx, dy] = METEOR_DIRECTIONS[game.meteorId % METEOR_DIRECTIONS.length], length = Math.hypot(dx, dy);
  const velocity = scrollSpeed + 55 + random(game) * 85, vx = dx / length * velocity, vy = dy / length * velocity;
  // Trace backwards from an interior point to an incoming screen edge.
  // Every horizontal, vertical and diagonal trajectory crosses visible space.
  const target = { x: game.width * (.2 + random(game) * .6), y: game.height * (.2 + random(game) * .6) }, margin = radius + 25;
  const backX = vx > 0 ? (target.x + margin) / vx : vx < 0 ? (game.width + margin - target.x) / -vx : Infinity;
  const backY = vy > 0 ? (target.y + margin) / vy : vy < 0 ? (game.height + margin - target.y) / -vy : Infinity;
  const back = Math.min(backX, backY);
  return { id: ++game.meteorId, x: target.x - vx * back, y: target.y - vy * back, radius, vx, vy, angle: random(game) * 360, spin: (random(game) - .5) * 60 };
}
export function tickAdventure(game, seconds, dx = 0, dy = 0) {
  const dt = clamp(seconds, 0, .05);
  if (game.phase === 'intro') {
    game.introTime = game.reduced ? INTRO_DURATION : game.introTime + dt;
    game.angle = 90 * clamp((game.introTime - INTRO_ZOOM_OUT_END) / (INTRO_DURATION - INTRO_ZOOM_OUT_END), 0, 1);
    if (game.introTime >= INTRO_DURATION) { game.phase = 'ready'; game.angle = 90; return 'ready'; }
    return null;
  }
  if (game.phase === 'sun-finale') {
    const duration = sunHolidayDuration(game);
    game.sunTime = Math.min(duration, game.sunTime + dt);
    if (game.sunTime >= duration) { game.phase = 'won'; return 'win'; }
    return null;
  }
  if (game.phase !== 'playing') return null;
  const oldShip = { ...game.ship }, length = Math.hypot(dx, dy) || 1;
  game.ship.x = clamp(game.ship.x + dx / length * 300 * dt, Math.min(65, game.width * .2), Math.max(game.width - 65, game.width * .8));
  game.ship.y = clamp(game.ship.y + dy / length * 300 * dt, Math.min(105, game.height * .3), Math.max(game.height - 55, game.height * .7));
  const speed = game.width < 650 ? 115 : 155;
  game.time += dt; game.progress += speed * dt; game.angle = 90;
  if (game.time >= game.nextMeteor) {
    game.meteors.push(spawnMeteor(game, speed));
    game.nextMeteor = game.time + .675 + random(game) * .525;
  }
  for (const meteor of game.meteors) {
    const before = { x: meteor.x - oldShip.x, y: meteor.y - oldShip.y };
    meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt; meteor.angle += meteor.spin * dt;
    if (meteorHits(before, { x: meteor.x - game.ship.x, y: meteor.y - game.ship.y }, meteor.radius + 20)) { game.phase = 'crashed'; return 'crash'; }
  }
  game.meteors = game.meteors.filter(m => m.x > -m.radius - 30 && m.x < game.width + m.radius + 30 && m.y > -m.radius - 30 && m.y < game.height + m.radius + 30);
  if (game.progress + game.ship.x - game.width * .25 + 42 >= FINISH_DISTANCE) {
    game.phase = 'sun-finale'; game.sunTime = 0; game.sunFrom = { x: game.ship.x / game.width, y: game.ship.y / game.height };
    game.sunMeteors = game.meteors.map(meteor => ({ ...meteor })); game.meteors = [];
    return 'sun-arrived';
  }
  return null;
}
export function landingPose(from, seconds) {
  const t = clamp(seconds / 4.5, 0, 1), ease = t * t * (3 - 2 * t);
  return { x: from.x + (GROUND_ROCKET.x - from.x) * ease + Math.sin(t * Math.PI * 2) * 35 * (1 - t), y: from.y + (GROUND_ROCKET.y - from.y) * ease, done: t === 1 };
}
export function crashVibration(seconds, reduced = false) {
  if (reduced) return 'translate(0 0) rotate(0 0 -86)';
  return `translate(${(Math.sin(seconds * 80) * 3.5).toFixed(2)} ${(Math.sin(seconds * 97) * 2.5).toFixed(2)}) rotate(${(Math.sin(seconds * 61) * 2).toFixed(2)} 0 -86)`;
}
