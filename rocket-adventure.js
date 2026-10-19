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
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const random = game => { game.seed = (Math.imul(game.seed, 1664525) + 1013904223) >>> 0; return game.seed / 4294967296; };
export function createAdventure(width, height, seed = 1) {
  return { phase: 'intro', width, height, seed: seed >>> 0, ship: { x: width * .25, y: height * .5 }, introTime: 0, time: 0, progress: 0, nextMeteor: 4, meteors: [], meteorId: 0, angle: 0 };
}
export function startAdventure(game) {
  game.phase = 'playing'; game.time = 0; game.progress = 0; game.meteors = []; game.nextMeteor = 4; game.angle = 0;
  game.ship = { x: game.width * .25, y: game.height * .5 };
}
export function resizeAdventure(game, width, height) {
  game.ship.x *= width / game.width; game.ship.y *= height / game.height;
  for (const meteor of game.meteors) { meteor.x *= width / game.width; meteor.y *= height / game.height; }
  game.width = width; game.height = height;
}
export function meteorHits(from, to, radius) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const t = clamp(-(from.x * dx + from.y * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(from.x + t * dx, from.y + t * dy) <= radius;
}
export function tickAdventure(game, seconds, dx = 0, dy = 0) {
  const dt = clamp(seconds, 0, .05);
  if (game.phase === 'intro') {
    game.introTime += dt;
    if (game.introTime >= 1) { game.phase = 'ready'; return 'ready'; }
    return null;
  }
  if (game.phase !== 'playing') return null;
  const oldShip = { ...game.ship }, length = Math.hypot(dx, dy) || 1;
  game.ship.x = clamp(game.ship.x + dx / length * 300 * dt, Math.min(65, game.width * .2), Math.max(game.width - 65, game.width * .8));
  game.ship.y = clamp(game.ship.y + dy / length * 300 * dt, Math.min(105, game.height * .3), Math.max(game.height - 55, game.height * .7));
  const speed = game.width < 650 ? 115 : 155;
  game.time += dt; game.progress += speed * dt; game.angle = Math.min(90, game.time / .75 * 90);
  if (game.time >= game.nextMeteor) {
    const radius = 10 + random(game) * 25;
    game.meteors.push({ id: ++game.meteorId, x: game.width + radius + 25, y: 90 + random(game) * Math.max(20, game.height - 145), radius, speed: speed + 55 + random(game) * 85, drift: (random(game) - .5) * 55, angle: random(game) * 360, spin: (random(game) - .5) * 60 });
    game.nextMeteor = game.time + 1.35 + random(game) * 1.05;
  }
  for (const meteor of game.meteors) {
    const before = { x: meteor.x - oldShip.x, y: meteor.y - oldShip.y };
    meteor.x -= meteor.speed * dt; meteor.y += meteor.drift * dt; meteor.angle += meteor.spin * dt;
    if (meteorHits(before, { x: meteor.x - game.ship.x, y: meteor.y - game.ship.y }, meteor.radius + 20)) { game.phase = 'crashed'; return 'crash'; }
  }
  game.meteors = game.meteors.filter(m => m.x > -m.radius - 30 && m.y > -60 && m.y < game.height + 60);
  if (game.progress + game.ship.x - game.width * .25 + 42 >= FINISH_DISTANCE) { game.phase = 'won'; return 'win'; }
  return null;
}
export function landingPose(from, seconds) {
  const t = clamp(seconds / 4.5, 0, 1), ease = t * t * (3 - 2 * t);
  return { x: from.x + (GROUND_ROCKET.x - from.x) * ease + Math.sin(t * Math.PI * 2) * 35 * (1 - t), y: from.y + (GROUND_ROCKET.y - from.y) * ease, done: t === 1 };
}
