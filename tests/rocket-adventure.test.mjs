import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSE, ADVENTURE_PLANETS, SUN_DIAMETER, FINISH_DISTANCE, createAdventure, startAdventure, resizeAdventure, tickAdventure, meteorHits, landingPose } from '../rocket-adventure.js';
import { CSS_PIXELS_PER_CM } from '../solar-system.js';
import { GROUND_ROCKET } from '../sky-world.js';
import { adventureMarkup } from '../adventure-art.js';

test('the journey visits every planet from Neptune to Mercury at an Earth 1 cm body scale', () => {
  assert.deepEqual(ADVENTURE_PLANETS.map(p => p.id), ['neptune', 'uranus', 'saturn', 'jupiter', 'mars', 'earth', 'venus', 'mercury']);
  const earth = ADVENTURE_PLANETS.find(p => p.id === 'earth'); assert.equal(earth.diameter, CSS_PIXELS_PER_CM);
  for (const planet of ADVENTURE_PLANETS) assert(Math.abs(planet.diameter / earth.diameter - planet.radiusKm / earth.radiusKm) < 1e-10);
  for (let i = 1; i < COURSE.length; i++) assert(COURSE[i].x - COURSE[i].diameter / 2 > COURSE[i - 1].x + COURSE[i - 1].diameter / 2);
  assert(SUN_DIAMETER / earth.diameter > 109 && SUN_DIAMETER / earth.diameter < 110);
});

test('the intro zoom waits for a choice; playing scrolls automatically and arrows move at a normalized speed', () => {
  const game = createAdventure(1200, 700, 13);
  for (let i = 0; i < 20; i++) tickAdventure(game, .05, 1, 1);
  assert.equal(game.phase, 'ready'); assert.equal(game.progress, 0); assert.equal(game.angle, 0);
  tickAdventure(game, .05); assert.equal(game.progress, 0);
  startAdventure(game); const ship = { ...game.ship };
  tickAdventure(game, .05); assert(game.progress > 0); assert.deepEqual(game.ship, ship);
  tickAdventure(game, .05, 1, 1); assert(Math.abs(Math.hypot(game.ship.x - ship.x, game.ship.y - ship.y) - 15) < 1e-10);
  for (let i = 0; i < 20; i++) tickAdventure(game, .05);
  assert.equal(game.angle, 90);
  const pos = { ...game.ship }; resizeAdventure(game, 600, 350);
  assert.equal(game.ship.x, pos.x / 2); assert.equal(game.ship.y, pos.y / 2);
  assert.equal(ADVENTURE_PLANETS.find(p => p.id === 'earth').diameter, CSS_PIXELS_PER_CM, 'resizing the scene preserves physical planet diameters');
});

test('meteors vary in size, collide along their swept path and freeze a completed run', () => {
  const game = createAdventure(1200, 700, 7); startAdventure(game);
  const radii = [];
  for (let i = 0; i < 700; i++) {
    tickAdventure(game, .05);
    for (const meteor of game.meteors) radii.push(meteor.radius);
    game.meteors = [];
  }
  assert(Math.min(...radii) < 16 && Math.max(...radii) > 28);
  assert(meteorHits({ x: 80, y: 0 }, { x: -80, y: 0 }, 10), 'fast crossings cannot pass through the ship');
  assert(!meteorHits({ x: 80, y: 30 }, { x: -80, y: 30 }, 10));
  game.meteors = [{ id: 1, x: game.ship.x + 45, y: game.ship.y, radius: 10, speed: 1500, drift: 0, angle: 0, spin: 0 }];
  assert.equal(tickAdventure(game, .05), 'crash'); assert.equal(game.phase, 'crashed');
  const progress = game.progress; tickAdventure(game, .05, 1, 1); assert.equal(game.progress, progress);
  startAdventure(game); assert.equal(game.meteors.length, 0); assert.equal(game.progress, 0);
  game.progress = FINISH_DISTANCE; assert.equal(tickAdventure(game, .05), 'win'); assert.equal(game.phase, 'won');
});

test('the full course is survivable by steering and ends on the Sun, with a safe gradual descent', () => {
  const game = createAdventure(1200, 700, 42); startAdventure(game);
  const passed = new Set();
  for (let i = 0; i < 12000 && game.phase === 'playing'; i++) {
    const closest = game.meteors.filter(m => m.x > game.ship.x - m.radius - 25 && m.x < game.ship.x + 220).sort((a, b) => a.x - b.x)[0];
    const dy = closest && Math.abs(closest.y - game.ship.y) < closest.radius + 60 ? (closest.y > game.height / 2 ? -1 : 1) : 0;
    tickAdventure(game, .016, 0, dy);
    for (const planet of COURSE) if (game.progress > planet.x) passed.add(planet.id);
  }
  assert.equal(game.phase, 'won'); assert.equal(passed.size, 8);
  const from = { x: 900, y: -1600 }, first = landingPose(from, 0), halfway = landingPose(from, 2.25), end = landingPose(from, 4.5);
  assert.deepEqual(first, { ...from, done: false }); assert(halfway.y > from.y && halfway.y < GROUND_ROCKET.y);
  assert.deepEqual(end, { ...GROUND_ROCKET, done: true });
});

test('the rendered adventure contains all bodies, an upright pilot and isolated landscape references', () => {
  const game = createAdventure(1200, 700); startAdventure(game); game.angle = 90;
  const svg = adventureMarkup(game, 'monkey', { path: '#ff3935' });
  for (const planet of COURSE) assert(svg.includes(`data-planet="${planet.id}"`));
  assert(svg.includes('data-planet="sun"')); assert(svg.includes('id="rocket-hull" transform="rotate(90 0 -86)"'));
  assert(svg.includes('id="rocket-pilot-upright" transform="rotate(-90 0 -86)"'));
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); assert.equal(ids.length, new Set(ids).size);
  for (const id of [...svg.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)].map(m => m[1])) assert(ids.includes(id), `missing ${id}`);
});
